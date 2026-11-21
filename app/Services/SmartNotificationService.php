<?php

namespace App\Services;

use App\Config\PermissionCatalog;
use App\Config\VariantConfig;
use App\Models\NotificationDismissal;
use App\Models\RkasItemReview;
use App\Models\User;
use App\Models\UserNotification;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Throwable;

class SmartNotificationService
{
    public const DISMISS_KEY_REGEX = '/^setor_pajak:(reguler|kinerja|silpa|kinerja_silpa):(20\d{2}):(1[0-2]|[1-9])$/';

    private const BULAN_NAMES = [
        1 => 'Januari',
        2 => 'Februari',
        3 => 'Maret',
        4 => 'April',
        5 => 'Mei',
        6 => 'Juni',
        7 => 'Juli',
        8 => 'Agustus',
        9 => 'September',
        10 => 'Oktober',
        11 => 'November',
        12 => 'Desember',
    ];

    public function __construct(private readonly PermissionService $permissionService) {}

    public static function variantLabel(string $variant): string
    {
        if (VariantConfig::isValid($variant)) {
            return VariantConfig::title($variant);
        }

        return ucfirst(str_replace('_', ' ', $variant));
    }

    public static function bulanName(int $month): string
    {
        return self::BULAN_NAMES[$month] ?? 'Januari';
    }

    /**
     * Kirim notifikasi saat Kepala Sekolah menelaah item RKAS (perlu_revisi / disetujui).
     */
    public function notifyRkasItemReviewed(User $actor, RkasItemReview $review, ?Model $reviewable): void
    {
        try {
            $context = $this->resolveReviewableContext($review->reviewable_type, $reviewable);
            $variant = $context['variant'];
            $uraian = $context['uraian'] !== '' ? Str::limit($context['uraian'], 80) : 'Item belanja RKAS';
            $tahunLabel = $context['tahun'] ? " (TA {$context['tahun']})" : '';
            $catatan = trim((string) ($review->catatan ?? ''));
            $catatanSuffix = $catatan !== '' ? ': '.Str::limit($catatan, 140) : '.';

            if ($review->status === 'perlu_revisi') {
                $type = 'rkas_revision_requested';
                $title = 'Item RKAS Perlu Revisi';
                $message = "{$actor->name} meminta revisi pada \"{$uraian}\"{$tahunLabel}{$catatanSuffix}";
            } else {
                $type = 'rkas_item_approved';
                $title = 'Item RKAS Disetujui';
                $message = "{$actor->name} menyetujui telaah item \"{$uraian}\"{$tahunLabel}{$catatanSuffix}";
            }

            $recipients = $this->resolveRecipients(
                $actor->id,
                fn (User $candidate) => $this->permissionService->canAccessModule($candidate, 'penganggaran', PermissionCatalog::LEVEL_WRITE),
            );

            // Kunci dedup seragam per review ID agar transisi perlu_revisi -> disetujui menggantikan notif lama secara bersih
            $dedupKey = "rkas_review:{$review->id}";

            foreach ($recipients as $recipient) {
                $this->upsertWorkflowNotification($recipient, $actor, [
                    'type' => $type,
                    'variant' => $variant,
                    'title' => $title,
                    'message' => $message,
                    'action_url' => $context['action_url'],
                    'dedup_key' => $dedupKey,
                ]);
            }
        } catch (Throwable $e) {
            Log::warning('SmartNotificationService gagal mengirim notifikasi telaah RKAS.', [
                'review_id' => $review->id,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Bersihkan notifikasi unread yang merujuk pada telaah RKAS yang telah dihapus.
     */
    public function clearNotificationsForReview(int $reviewId): void
    {
        try {
            UserNotification::query()
                ->whereIn('dedup_key', [
                    "rkas_review:{$reviewId}",
                    "rkas_review:{$reviewId}:resubmitted",
                ])
                ->whereNull('read_at')
                ->update(['read_at' => now()]);
        } catch (Throwable $e) {
            Log::warning('SmartNotificationService gagal membersihkan notifikasi telaah terhapus.', [
                'review_id' => $reviewId,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Kirim notifikasi saat Bendahara mengajukan ulang perbaikan item RKAS kepada Kepala Sekolah.
     */
    public function notifyRkasItemResubmitted(User $actor, RkasItemReview $review, ?Model $reviewable): void
    {
        try {
            $context = $this->resolveReviewableContext($review->reviewable_type, $reviewable);
            $variant = $context['variant'];
            $uraian = $context['uraian'] !== '' ? Str::limit($context['uraian'], 80) : 'Item belanja RKAS';
            $tahunLabel = $context['tahun'] ? " (TA {$context['tahun']})" : '';
            $tanggapan = trim((string) ($review->tanggapan_bendahara ?? ''));
            $tanggapanSuffix = $tanggapan !== '' ? ': '.Str::limit($tanggapan, 140) : '.';

            $recipients = $this->resolveRecipients(
                $actor->id,
                fn (User $candidate) => $this->permissionService->hasAbility($candidate, 'rkas_review'),
            );

            $dedupKey = "rkas_review:{$review->id}:resubmitted";

            foreach ($recipients as $recipient) {
                $this->upsertWorkflowNotification($recipient, $actor, [
                    'type' => 'rkas_revision_resubmitted',
                    'variant' => $variant,
                    'title' => 'Perbaikan RKAS Diajukan Ulang',
                    'message' => "{$actor->name} mengajukan ulang perbaikan \"{$uraian}\"{$tahunLabel}{$tanggapanSuffix}",
                    'action_url' => $context['action_url'],
                    'dedup_key' => $dedupKey,
                ]);
            }
        } catch (Throwable $e) {
            Log::warning('SmartNotificationService gagal mengirim notifikasi resubmit RKAS.', [
                'review_id' => $review->id,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Kirim notifikasi saat Kepala Sekolah mengesahkan atau membatalkan pengesahan RKAS.
     */
    public function notifyPenganggaranApprovalChanged(
        User $actor,
        Model $penganggaran,
        string $variant,
        bool $approved,
        ?string $catatan = null,
    ): void {
        try {
            $tahun = $penganggaran->getAttribute('tahun_anggaran');
            $tahunText = $tahun ? "Tahun Anggaran {$tahun}" : 'penganggaran';
            $variantName = self::variantLabel($variant);
            $cleanCatatan = trim((string) ($catatan ?? ''));
            $catatanSuffix = $cleanCatatan !== '' ? ' Catatan: '.Str::limit($cleanCatatan, 140) : '';

            $type = $approved ? 'rkas_approved' : 'rkas_unapproved';
            $title = $approved ? 'Penganggaran RKAS Disahkan' : 'Pengesahan RKAS Dibatalkan';
            $message = $approved
                ? "{$actor->name} telah mengesahkan RKAS {$variantName} {$tahunText}.{$catatanSuffix}"
                : "{$actor->name} membatalkan status pengesahan RKAS {$variantName} {$tahunText}.";

            $actionUrl = route(VariantConfig::routeName($variant, 'penganggaran.index'), [], false);
            $dedupKey = "penganggaran_approval:{$variant}:{$penganggaran->getKey()}";

            $recipients = $this->resolveRecipients(
                $actor->id,
                fn (User $candidate) => $this->permissionService->canAccessModule($candidate, 'penganggaran', PermissionCatalog::LEVEL_WRITE),
            );

            foreach ($recipients as $recipient) {
                $this->upsertWorkflowNotification($recipient, $actor, [
                    'type' => $type,
                    'variant' => $variant,
                    'title' => $title,
                    'message' => $message,
                    'action_url' => $actionUrl,
                    'dedup_key' => $dedupKey,
                ]);
            }
        } catch (Throwable $e) {
            Log::warning('SmartNotificationService gagal mengirim notifikasi pengesahan RKAS.', [
                'penganggaran_id' => $penganggaran->getKey(),
                'variant' => $variant,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Merakit feed notifikasi terpadu (Workflow RKAS + Pajak 4 Varian BOSP) yang role-aware.
     *
     * @return array<string, mixed>
     */
    public function getUnifiedFeed(User $user): array
    {
        $canViewPajak = $this->permissionService->canAccessModule($user, 'penatausahaan', PermissionCatalog::LEVEL_READ);
        $canWritePajak = $this->permissionService->canAccessModule($user, 'penatausahaan', PermissionCatalog::LEVEL_WRITE);

        $workflowItems = array_merge(
            $this->buildDbWorkflowItems($user),
            $this->buildLiveWorkflowItems($user),
        );

        $pajakItems = [];
        $hasUnpaidPajak = false;

        if ($canViewPajak) {
            $dismissedKeys = NotificationDismissal::query()
                ->where('user_id', $user->id)
                ->pluck('notification_key')
                ->flip()
                ->all();

            foreach (VariantConfig::VARIANTS as $variant) {
                $summary = $this->getPajakSummaryForVariant($variant);
                foreach ($summary as $entry) {
                    $isTerima = $entry['type'] === 'terima_pajak';
                    $key = "{$entry['type']}:{$variant}:{$entry['year']}:{$entry['month']}";

                    if (! $isTerima && isset($dismissedKeys[$key])) {
                        continue;
                    }

                    if ($isTerima) {
                        $hasUnpaidPajak = true;
                    }

                    $bkuUrl = route(
                        VariantConfig::routeName($variant, 'penatausahaan.bku'),
                        ['tahun' => $entry['year'], 'bulan' => $entry['month']],
                        false,
                    );

                    $pajakItems[] = [
                        'id' => "pajak:{$key}",
                        'source' => 'pajak',
                        'db_id' => null,
                        'notification_key' => $isTerima ? null : $key,
                        'category' => 'pajak',
                        'type' => $entry['type'],
                        'tone' => $isTerima ? 'warning' : 'success',
                        'variant' => $variant,
                        'variant_label' => self::variantLabel($variant),
                        'title' => $isTerima ? 'Terima Pajak (Belum Disetor)' : 'Pajak Sudah Disetor',
                        'message' => $isTerima
                            ? "Terdapat {$entry['count']} transaksi pungut pajak periode {$entry['month_name']} {$entry['year']} yang belum memiliki NTPN."
                            : "Pajak periode {$entry['month_name']} {$entry['year']} ({$entry['count']} transaksi) telah disetor dan tersimpan.",
                        'action_url' => $bkuUrl,
                        'action_label' => 'Lihat rincian',
                        'is_read' => false,
                        'dismissible' => ! $isTerima,
                        'priority' => $isTerima ? 3 : 1,
                        'sort_ts' => Carbon::create($entry['year'], $entry['month'], 1)->timestamp,
                        'created_at_human' => "{$entry['month_name']} {$entry['year']}",
                        'meta' => [
                            'type' => $entry['type'],
                            'month' => $entry['month'],
                            'year' => $entry['year'],
                            'month_name' => $entry['month_name'],
                            'count' => $entry['count'],
                            'variant' => $variant,
                            'variant_label' => self::variantLabel($variant),
                            'bku_url' => $bkuUrl,
                        ],
                    ];
                }
            }
        }

        $allItems = array_merge($workflowItems, $pajakItems);

        // Urutkan gabungan: prioritas tinggi di atas, lalu waktu terbaru
        usort($allItems, static function (array $a, array $b): int {
            if ($a['priority'] !== $b['priority']) {
                return $b['priority'] <=> $a['priority'];
            }

            return $b['sort_ts'] <=> $a['sort_ts'];
        });

        // Buang field internal sort_ts / priority sebelum kirim ke frontend
        $cleanItems = array_map(static function (array $item): array {
            unset($item['priority'], $item['sort_ts']);

            return $item;
        }, $allItems);

        $dismissibleUnread = count(array_filter(
            $cleanItems,
            static fn (array $item): bool => (bool) $item['dismissible'] && ! $item['is_read'],
        ));

        return [
            'items' => array_values($cleanItems),
            'counts' => [
                'all' => count($cleanItems),
                'workflow' => count($workflowItems),
                'pajak' => count($pajakItems),
                'unread' => count($cleanItems),
                'dismissible_unread' => $dismissibleUnread,
            ],
            'can_view_pajak' => $canViewPajak,
            'show_pajak_reminder' => $canWritePajak && $hasUnpaidPajak,
        ];
    }

    /**
     * Tandai satu notifikasi (DB workflow atau setor_pajak) sebagai dibaca untuk user login.
     */
    public function markAsRead(User $user, ?int $dbId, ?string $notificationKey): bool
    {
        $updated = false;

        if ($dbId !== null && $dbId > 0) {
            $affected = UserNotification::query()
                ->where('id', $dbId)
                ->where('user_id', $user->id)
                ->whereNull('read_at')
                ->update(['read_at' => now()]);
            $updated = $affected > 0 || $updated;
        }

        if ($notificationKey !== null && preg_match(self::DISMISS_KEY_REGEX, $notificationKey) === 1) {
            NotificationDismissal::query()->firstOrCreate(
                [
                    'user_id' => $user->id,
                    'notification_key' => $notificationKey,
                ],
                [
                    'dismissed_at' => now(),
                ],
            );
            $updated = true;
        }

        return $updated;
    }

    /**
     * Tandai seluruh notifikasi dismissible milik user sebagai dibaca.
     */
    public function markAllAsRead(User $user, string $category = 'all'): int
    {
        $count = 0;

        if (in_array($category, ['all', 'workflow'], true)) {
            $count += UserNotification::query()
                ->where('user_id', $user->id)
                ->whereNull('read_at')
                ->update(['read_at' => now()]);
        }

        if (
            in_array($category, ['all', 'pajak'], true)
            && $this->permissionService->canAccessModule($user, 'penatausahaan', PermissionCatalog::LEVEL_READ)
        ) {
            $existing = NotificationDismissal::query()
                ->where('user_id', $user->id)
                ->pluck('notification_key')
                ->flip()
                ->all();

            $rowsToInsert = [];
            $now = now();

            foreach (VariantConfig::VARIANTS as $variant) {
                foreach ($this->getPajakSummaryForVariant($variant) as $entry) {
                    if ($entry['type'] !== 'setor_pajak') {
                        continue;
                    }
                    $key = "setor_pajak:{$variant}:{$entry['year']}:{$entry['month']}";
                    if (isset($existing[$key])) {
                        continue;
                    }

                    $existing[$key] = true;
                    $rowsToInsert[] = [
                        'user_id' => $user->id,
                        'notification_key' => $key,
                        'dismissed_at' => $now,
                    ];
                }
            }

            if ($rowsToInsert !== []) {
                NotificationDismissal::query()->insertOrIgnore($rowsToInsert);
                $count += count($rowsToInsert);
            }
        }

        return $count;
    }

    /**
     * Ringkasan pajak per bulan untuk satu varian BOSP (dipakai endpoint unified & endpoint pajak lama).
     *
     * @return list<array{type: string, month: int, year: int, count: int, month_name: string, variant: string, variant_label: string}>
     */
    public function getPajakSummaryForVariant(string $variant): array
    {
        $bkuClass = VariantConfig::getModelClass('bku', $variant);
        if (! $bkuClass) {
            return [];
        }

        $pajakTransactions = $bkuClass::query()
            ->where(function ($q) {
                $q->where('total_pajak', '>', 0)
                    ->orWhere('total_pajak_daerah', '>', 0);
            })
            ->toBase()
            ->get(['tanggal_transaksi', 'ntpn']);

        $terimaPajakMap = [];
        $setorPajakMap = [];
        $variantLabel = self::variantLabel($variant);

        foreach ($pajakTransactions as $trx) {
            if (empty($trx->tanggal_transaksi)) {
                continue;
            }

            $date = Carbon::parse((string) $trx->tanggal_transaksi);
            $month = (int) $date->month;
            $year = (int) $date->year;
            $key = "{$year}-{$month}";

            if (trim((string) ($trx->ntpn ?? '')) === '') {
                if (! isset($terimaPajakMap[$key])) {
                    $terimaPajakMap[$key] = [
                        'type' => 'terima_pajak',
                        'month' => $month,
                        'year' => $year,
                        'count' => 0,
                        'month_name' => self::bulanName($month),
                        'variant' => $variant,
                        'variant_label' => $variantLabel,
                    ];
                }
                $terimaPajakMap[$key]['count']++;
            } else {
                if (! isset($setorPajakMap[$key])) {
                    $setorPajakMap[$key] = [
                        'type' => 'setor_pajak',
                        'month' => $month,
                        'year' => $year,
                        'count' => 0,
                        'month_name' => self::bulanName($month),
                        'variant' => $variant,
                        'variant_label' => $variantLabel,
                    ];
                }
                $setorPajakMap[$key]['count']++;
            }
        }

        $results = array_merge(array_values($terimaPajakMap), array_values($setorPajakMap));

        usort($results, static function (array $a, array $b): int {
            if ($a['year'] === $b['year']) {
                return $b['month'] <=> $a['month'];
            }

            return $b['year'] <=> $a['year'];
        });

        return $results;
    }

    /**
     * Detail transaksi pajak per bulan & varian BOSP.
     *
     * @return list<array{id: string, uraian: string, nominal: mixed, ntpn: mixed, tanggal_transaksi: mixed}>
     */
    public function getPajakDetailsForVariant(string $variant, string $type, int $month, int $year): array
    {
        $bkuClass = VariantConfig::getModelClass('bku', $variant);
        if (! $bkuClass) {
            return [];
        }

        $startOfMonth = Carbon::create($year, $month, 1)->startOfMonth()->toDateString();
        $endOfMonth = Carbon::create($year, $month, 1)->endOfMonth()->toDateString();

        $query = $bkuClass::query()
            ->whereBetween('tanggal_transaksi', [$startOfMonth, $endOfMonth])
            ->where(function ($q) {
                $q->where('total_pajak', '>', 0)
                    ->orWhere('total_pajak_daerah', '>', 0);
            });

        if ($type === 'terima_pajak') {
            $query->whereRaw("TRIM(COALESCE(ntpn, '')) = ''");
        } else {
            $query->whereRaw("TRIM(COALESCE(ntpn, '')) != ''");
        }

        $transactions = $query
            ->orderBy('tanggal_transaksi')
            ->orderBy('id')
            ->get([
                'id',
                'tanggal_transaksi',
                'uraian',
                'uraian_opsional',
                'pajak',
                'persen_pajak',
                'total_pajak',
                'persen_pajak_daerah',
                'total_pajak_daerah',
                'ntpn',
            ]);
        $details = [];

        foreach ($transactions as $trx) {
            $baseUraian = $trx->uraian_opsional ?? $trx->uraian ?? '';
            $pajakName = strtolower((string) ($trx->pajak ?? ''));

            if ((float) $trx->total_pajak > 0) {
                if (str_contains($pajakName, 'pph21') || str_contains($pajakName, 'pph 21')) {
                    $namaPajakPusat = 'PPh 21';
                } elseif (str_contains($pajakName, 'pph22') || str_contains($pajakName, 'pph 22')) {
                    $namaPajakPusat = 'PPh 22';
                } elseif (str_contains($pajakName, 'pph23') || str_contains($pajakName, 'pph 23')) {
                    $namaPajakPusat = 'PPh 23';
                } else {
                    $namaPajakPusat = $trx->pajak ?: 'PPN';
                }

                $prefix = $type === 'terima_pajak' ? 'Terima pajak' : 'Setor pajak';
                $persen = $trx->persen_pajak ? ((float) $trx->persen_pajak).'%' : '';
                $nominal = number_format((float) $trx->total_pajak, 0, ',', '.');

                $details[] = [
                    'id' => $trx->id.'_pusat',
                    'uraian' => trim("{$prefix} {$namaPajakPusat} {$persen} {$baseUraian} sebesar Rp. {$nominal}"),
                    'nominal' => $trx->total_pajak,
                    'ntpn' => $trx->ntpn,
                    'tanggal_transaksi' => $trx->tanggal_transaksi,
                ];
            }

            if ((float) $trx->total_pajak_daerah > 0) {
                $prefix = $type === 'terima_pajak' ? 'Terima pajak' : 'Setor pajak';
                $persen = $trx->persen_pajak_daerah ? ((float) $trx->persen_pajak_daerah).'%' : '';
                $nominal = number_format((float) $trx->total_pajak_daerah, 0, ',', '.');

                $details[] = [
                    'id' => $trx->id.'_daerah',
                    'uraian' => trim("{$prefix} PB 1 {$persen} {$baseUraian} sebesar Rp. {$nominal}"),
                    'nominal' => $trx->total_pajak_daerah,
                    'ntpn' => $trx->ntpn,
                    'tanggal_transaksi' => $trx->tanggal_transaksi,
                ];
            }
        }

        return $details;
    }

    /**
     * @return list<array<string, mixed>>
     */
    protected function buildDbWorkflowItems(User $user): array
    {
        $rows = UserNotification::query()
            ->where('user_id', $user->id)
            ->unread()
            ->orderByDesc('updated_at')
            ->limit(25)
            ->get();

        $items = [];
        foreach ($rows as $row) {
            $tone = match ($row->type) {
                'rkas_revision_requested' => 'warning',
                'rkas_revision_resubmitted' => 'violet',
                'rkas_approved', 'rkas_item_approved' => 'success',
                'rkas_unapproved' => 'danger',
                default => 'info',
            };

            $priority = match ($row->type) {
                'rkas_revision_requested', 'rkas_revision_resubmitted', 'rkas_unapproved' => 4,
                default => 2,
            };

            $timestamp = $row->updated_at ?? $row->created_at;

            $items[] = [
                'id' => "db:{$row->id}",
                'source' => 'db',
                'db_id' => $row->id,
                'notification_key' => null,
                'category' => 'workflow',
                'type' => $row->type,
                'tone' => $tone,
                'variant' => $row->variant,
                'variant_label' => self::variantLabel($row->variant),
                'title' => $row->title,
                'message' => $row->message,
                'action_url' => $row->action_url,
                'action_label' => $row->type === 'rkas_approved' || $row->type === 'rkas_unapproved'
                    ? 'Buka Penganggaran'
                    : 'Buka RKAS',
                'is_read' => false,
                'dismissible' => true,
                'priority' => $priority,
                'sort_ts' => $timestamp?->timestamp ?? time(),
                'created_at_human' => $timestamp?->copy()->locale('id')->diffForHumans() ?? 'Baru saja',
                'meta' => null,
            ];
        }

        return $items;
    }

    /**
     * Membangun ringkasan antrean workflow aktif (live, otomatis hilang saat diselesaikan).
     *
     * @return list<array<string, mixed>>
     */
    protected function buildLiveWorkflowItems(User $user): array
    {
        $items = [];
        $canApprove = $this->permissionService->hasAbility($user, 'rkas_approve');
        $canReview = $this->permissionService->hasAbility($user, 'rkas_review');
        $canWritePenganggaran = $this->permissionService->canAccessModule($user, 'penganggaran', PermissionCatalog::LEVEL_WRITE);

        // 1. Kepala Sekolah: Penganggaran RKAS berstatus draft (menunggu pengesahan) yang sudah memiliki item RKAS
        if ($canApprove) {
            foreach (VariantConfig::VARIANTS as $variant) {
                $penganggaranClass = VariantConfig::getModelClass('penganggaran', $variant);
                if (! $penganggaranClass) {
                    continue;
                }

                $drafts = $penganggaranClass::query()
                    ->where(function ($q) {
                        $q->whereNull('status_persetujuan')
                            ->orWhere('status_persetujuan', '!=', 'disetujui');
                    })
                    ->whereHas('rkas')
                    ->orderByDesc('tahun_anggaran')
                    ->limit(3)
                    ->toBase()
                    ->get(['id', 'tahun_anggaran', 'updated_at']);

                foreach ($drafts as $draft) {
                    $url = route(VariantConfig::routeName($variant, 'rkas.index'), ['id' => $draft->id], false);
                    $updatedTs = $draft->updated_at ? Carbon::parse((string) $draft->updated_at)->timestamp : time();
                    $items[] = [
                        'id' => "live:approval:{$variant}:{$draft->id}",
                        'source' => 'live',
                        'db_id' => null,
                        'notification_key' => null,
                        'category' => 'workflow',
                        'type' => 'live_rkas_pending_approval',
                        'tone' => 'violet',
                        'variant' => $variant,
                        'variant_label' => self::variantLabel($variant),
                        'title' => "RKAS TA {$draft->tahun_anggaran} Menunggu Pengesahan",
                        'message' => 'Penganggaran '.self::variantLabel($variant)." Tahun {$draft->tahun_anggaran} belum disahkan oleh Kepala Sekolah.",
                        'action_url' => $url,
                        'action_label' => 'Tinjau & Sahkan',
                        'is_read' => false,
                        'dismissible' => false,
                        'priority' => 3,
                        'sort_ts' => $updatedTs,
                        'created_at_human' => 'Menunggu pengesahan',
                        'meta' => null,
                    ];
                }
            }
        }

        // 2. Hitung antrean status review item (sekali kueri gabungan untuk efisiensi)
        $neededStatuses = [];
        if ($canReview) {
            $neededStatuses[] = 'sudah_diperbaiki';
        }
        if ($canWritePenganggaran) {
            $neededStatuses[] = 'perlu_revisi';
        }

        if ($neededStatuses !== []) {
            $classToVariant = $this->reviewableClassMap();
            $groupedAll = $this->countReviewsByStatusAndVariant($neededStatuses, $classToVariant);

            if ($canReview) {
                foreach ($groupedAll['sudah_diperbaiki'] ?? [] as $variant => $data) {
                    $items[] = [
                        'id' => "live:rereview:{$variant}",
                        'source' => 'live',
                        'db_id' => null,
                        'notification_key' => null,
                        'category' => 'workflow',
                        'type' => 'live_rkas_pending_rereview',
                        'tone' => 'violet',
                        'variant' => $variant,
                        'variant_label' => self::variantLabel($variant),
                        'title' => "{$data['count']} Perbaikan RKAS Menunggu Telaah Ulang",
                        'message' => 'Bendahara telah mengajukan ulang perbaikan pada '.self::variantLabel($variant).'.',
                        'action_url' => $data['action_url'],
                        'action_label' => 'Telaah Ulang',
                        'is_read' => false,
                        'dismissible' => false,
                        'priority' => 4,
                        'sort_ts' => $data['latest_ts'],
                        'created_at_human' => 'Antrean aktif',
                        'meta' => null,
                    ];
                }
            }

            if ($canWritePenganggaran) {
                foreach ($groupedAll['perlu_revisi'] ?? [] as $variant => $data) {
                    $items[] = [
                        'id' => "live:revision:{$variant}",
                        'source' => 'live',
                        'db_id' => null,
                        'notification_key' => null,
                        'category' => 'workflow',
                        'type' => 'live_rkas_needs_revision',
                        'tone' => 'warning',
                        'variant' => $variant,
                        'variant_label' => self::variantLabel($variant),
                        'title' => "{$data['count']} Item RKAS Perlu Diperbaiki",
                        'message' => 'Terdapat catatan revisi Kepala Sekolah pada '.self::variantLabel($variant).' yang belum diajukan ulang.',
                        'action_url' => $data['action_url'],
                        'action_label' => 'Perbaiki Sekarang',
                        'is_read' => false,
                        'dismissible' => false,
                        'priority' => 4,
                        'sort_ts' => $data['latest_ts'],
                        'created_at_human' => 'Perlu tindakan',
                        'meta' => null,
                    ];
                }
            }
        }

        return $items;
    }

    /**
     * @param  list<string>  $statuses
     * @param  array<string, array{variant: string, is_perubahan: bool}>  $classMap
     * @return array<string, array<string, array{count: int, latest_ts: int, action_url: string}>>
     */
    protected function countReviewsByStatusAndVariant(array $statuses, array $classMap): array
    {
        $rows = RkasItemReview::query()
            ->whereIn('status', $statuses)
            ->orderByDesc('updated_at')
            ->toBase()
            ->get(['status', 'reviewable_type', 'reviewable_id', 'updated_at']);

        $grouped = [];
        foreach ($rows as $row) {
            $meta = $classMap[$row->reviewable_type] ?? null;
            if (! $meta) {
                continue;
            }
            $status = (string) $row->status;
            $variant = $meta['variant'];
            if (! isset($grouped[$status][$variant])) {
                $grouped[$status][$variant] = [
                    'count' => 0,
                    'latest_ts' => $row->updated_at ? Carbon::parse((string) $row->updated_at)->timestamp : time(),
                    'action_url' => route(VariantConfig::routeName($variant, 'penganggaran.index'), [], false),
                    'sample_type' => $row->reviewable_type,
                    'sample_id' => $row->reviewable_id,
                ];
            }
            $grouped[$status][$variant]['count']++;
        }

        // Arahkan langsung ke halaman RKAS / RKAS Perubahan item terbaru tanpa kueri tambahan tahun_anggaran
        foreach ($grouped as $status => $byVariant) {
            foreach ($byVariant as $variant => $data) {
                $sampleClass = $data['sample_type'];
                if (class_exists($sampleClass)) {
                    $meta = $classMap[$sampleClass] ?? null;
                    if ($meta) {
                        $fk = VariantConfig::penganggaranFk($variant);
                        $penganggaranId = $sampleClass::query()->whereKey($data['sample_id'])->value($fk);
                        if ($penganggaranId) {
                            $baseRoute = $meta['is_perubahan'] ? 'rkas-perubahan.index' : 'rkas.index';
                            $grouped[$status][$variant]['action_url'] = route(
                                VariantConfig::routeName($variant, $baseRoute),
                                ['id' => (int) $penganggaranId],
                                false,
                            );
                        }
                    }
                }
                unset($grouped[$status][$variant]['sample_type'], $grouped[$status][$variant]['sample_id']);
            }
        }

        return $grouped;
    }

    /**
     * @return array<string, array{variant: string, is_perubahan: bool}>
     */
    protected function reviewableClassMap(): array
    {
        $map = [];
        foreach (VariantConfig::VARIANTS as $variant) {
            $rkasClass = VariantConfig::getModelClass('rkas', $variant);
            if ($rkasClass) {
                $map[$rkasClass] = ['variant' => $variant, 'is_perubahan' => false];
            }

            $perubahanClass = VariantConfig::getModelClass('rkas_perubahan', $variant);
            if ($perubahanClass) {
                $map[$perubahanClass] = ['variant' => $variant, 'is_perubahan' => true];
            }
        }

        return $map;
    }

    /**
     * @return array{variant: string, is_perubahan: bool, penganggaran_id: int|null, tahun: int|null, uraian: string, action_url: string}
     */
    protected function resolveReviewableContext(string $reviewableType, ?Model $reviewable): array
    {
        $classMap = $this->reviewableClassMap();
        $meta = $classMap[$reviewableType] ?? ['variant' => VariantConfig::REGULER, 'is_perubahan' => false];
        $variant = $meta['variant'];
        $isPerubahan = $meta['is_perubahan'];

        $penganggaranFk = VariantConfig::penganggaranFk($variant);
        $penganggaranId = $reviewable ? ($reviewable->getAttribute($penganggaranFk) ? (int) $reviewable->getAttribute($penganggaranFk) : null) : null;
        $uraian = $reviewable ? trim((string) ($reviewable->getAttribute('uraian') ?? '')) : '';

        $tahun = null;
        if ($penganggaranId) {
            $penganggaranClass = VariantConfig::getModelClass('penganggaran', $variant);
            if ($penganggaranClass) {
                $tahunVal = $penganggaranClass::query()->whereKey($penganggaranId)->value('tahun_anggaran');
                $tahun = $tahunVal !== null ? (int) $tahunVal : null;
            }
        }

        if ($penganggaranId) {
            $baseRoute = $isPerubahan ? 'rkas-perubahan.index' : 'rkas.index';
            $actionUrl = route(VariantConfig::routeName($variant, $baseRoute), ['id' => $penganggaranId], false);
        } else {
            $actionUrl = route(VariantConfig::routeName($variant, 'penganggaran.index'), [], false);
        }

        return [
            'variant' => $variant,
            'is_perubahan' => $isPerubahan,
            'penganggaran_id' => $penganggaranId,
            'tahun' => $tahun,
            'uraian' => $uraian,
            'action_url' => $actionUrl,
        ];
    }

    /**
     * @param  callable(User): bool  $predicate
     * @return list<User>
     */
    protected function resolveRecipients(int $excludeUserId, callable $predicate): array
    {
        $recipients = [];
        $candidates = User::query()
            ->where('id', '!=', $excludeUserId)
            ->get(['id', 'name', 'role', 'custom_permissions']);

        foreach ($candidates as $candidate) {
            if ($predicate($candidate)) {
                $recipients[] = $candidate;
            }
        }

        return $recipients;
    }

    /**
     * @param  array{type: string, variant: string, title: string, message: string, action_url: string|null, dedup_key: string|null}  $payload
     */
    protected function upsertWorkflowNotification(User $recipient, User $actor, array $payload): void
    {
        $attributes = [
            'actor_id' => $actor->id,
            'actor_name' => Str::limit($actor->name, 150, ''),
            'category' => 'workflow',
            'type' => $payload['type'],
            'variant' => $payload['variant'],
            'title' => Str::limit($payload['title'], 180, ''),
            'message' => $payload['message'],
            'action_url' => $payload['action_url'] ? Str::limit($payload['action_url'], 255, '') : null,
            'read_at' => null,
        ];

        if (! empty($payload['dedup_key'])) {
            UserNotification::query()->updateOrCreate(
                [
                    'user_id' => $recipient->id,
                    'dedup_key' => Str::limit($payload['dedup_key'], 160, ''),
                ],
                $attributes,
            );

            return;
        }

        UserNotification::query()->create([
            'user_id' => $recipient->id,
            'dedup_key' => null,
            ...$attributes,
        ]);
    }
}
