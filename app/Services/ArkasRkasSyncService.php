<?php

namespace App\Services;

use App\Config\VariantConfig;
use App\Models\KodeKegiatan;
use App\Models\RefBarang;
use App\Models\RekeningBelanja;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class ArkasRkasSyncService
{
    private const MONTH_ORDER = [
        'januari' => 1,
        'februari' => 2,
        'maret' => 3,
        'april' => 4,
        'mei' => 5,
        'juni' => 6,
        'juli' => 7,
        'agustus' => 8,
        'september' => 9,
        'oktober' => 10,
        'november' => 11,
        'desember' => 12,
    ];

    private const SATUAN_SYNONYMS = [
        'dus' => 'dos',
        'dos' => 'dos',
        'kotak' => 'box',
        'box' => 'box',
        'lbr' => 'lembar',
        'lembar' => 'lembar',
        'btl' => 'botol',
        'botol' => 'botol',
        'bh' => 'buah',
        'buah' => 'buah',
        'org' => 'orang',
        'orang' => 'orang',
        'bln' => 'bulan',
        'bulan' => 'bulan',
        'keg' => 'kegiatan',
        'kegiatan' => 'kegiatan',
        'pkt' => 'paket',
        'paket' => 'paket',
        'eks' => 'eksemplar',
        'eksemplar' => 'eksemplar',
        'exemplar' => 'eksemplar',
    ];

    /**
     * Memuat peta master KodeKegiatan dan RekeningBelanja secara ringkas (O(1) lookup).
     *
     * @return array{kegiatanMap: array<string, int>, rekenings: Collection<string, RekeningBelanja>}
     */
    public function loadMasterMaps(): array
    {
        $kegiatanMap = [];
        foreach (KodeKegiatan::query()->select(['id', 'kode'])->get() as $k) {
            $kodeNorm = $this->normalizeKodeKegiatan((string) $k->kode);
            if ($kodeNorm === '') {
                continue;
            }
            $kegiatanMap[$kodeNorm.'.'] = (int) $k->id;
            $kegiatanMap[$kodeNorm] = (int) $k->id;
        }

        $rekenings = RekeningBelanja::query()
            ->select(['id', 'kode_rekening'])
            ->get()
            ->keyBy(fn (RekeningBelanja $r) => trim((string) $r->kode_rekening));

        return [
            'kegiatanMap' => $kegiatanMap,
            'rekenings' => $rekenings,
        ];
    }

    /**
     * Menghitung total volume yang sudah dibelanjakan di BKU per baris RKAS / RKAS Perubahan,
     * mencakup relasi FK varian aktif maupun fallback baris BKU detail legacy yang FK-nya NULL.
     *
     * @param  class-string  $rkasModelClass
     * @param  class-string|null  $bkuModelClass
     * @param  class-string|null  $bkuDetailModelClass
     * @return array<int, float>
     */
    public function loadSpentVolumeByRkasId(
        string $variant,
        string $rkasModelClass,
        ?string $bkuModelClass,
        ?string $bkuDetailModelClass,
        string $penganggaranFk,
        int $penganggaranId,
        bool $isPerubahan
    ): array {
        if (! $bkuDetailModelClass || ! class_exists($bkuDetailModelClass)) {
            return [];
        }

        $rkasFk = VariantConfig::uraianDetailRkasFk($variant, $isPerubahan);
        $rkasRows = $rkasModelClass::query()
            ->where($penganggaranFk, $penganggaranId)
            ->get(['id', 'kode_id', 'kode_rekening_id', 'bulan', 'uraian', 'uraian_arkas', 'harga_satuan']);

        // Pada RKAS Perubahan, Tahap 1 (Jan-Jun) dilindungi secara mutlak sebagai Tahap 1,
        // sehingga proteksi BKU Tahap 2 hanya diterapkan pada baris bulan Juli-Desember.
        if ($isPerubahan) {
            $rkasRows = $rkasRows->filter(function ($row) {
                $bulanKey = mb_strtolower(trim((string) $row->bulan), 'UTF-8');

                return (self::MONTH_ORDER[$bulanKey] ?? 0) >= 7;
            })->values();
        }

        if ($rkasRows->isEmpty()) {
            return [];
        }

        $spentById = $bkuDetailModelClass::query()
            ->select($rkasFk, DB::raw('SUM(volume) as total_volume'))
            ->whereIn($rkasFk, $rkasRows->pluck('id'))
            ->groupBy($rkasFk)
            ->pluck('total_volume', $rkasFk)
            ->mapWithKeys(fn ($vol, $id) => [(int) $id => (float) $vol])
            ->all();

        // Fallback proteksi untuk baris BKU detail legacy yang FK RKAS-nya NULL
        if ($bkuModelClass && class_exists($bkuModelClass)) {
            $bkuFk = VariantConfig::bkuFk($variant);
            $bkuTable = (new $bkuModelClass)->getTable();
            $detailTable = (new $bkuDetailModelClass)->getTable();

            $legacyQuery = $bkuDetailModelClass::query()
                ->join($bkuTable, "{$detailTable}.{$bkuFk}", '=', "{$bkuTable}.id")
                ->where("{$bkuTable}.{$penganggaranFk}", $penganggaranId)
                ->where("{$bkuTable}.is_bunga_record", false)
                ->whereNull("{$detailTable}.{$rkasFk}");

            if ($isPerubahan) {
                $legacyQuery->whereMonth("{$bkuTable}.tanggal_transaksi", '>=', 7);
            }

            $legacyDetails = $legacyQuery->get([
                "{$detailTable}.kode_kegiatan_id",
                "{$detailTable}.rekening_belanja_id",
                "{$detailTable}.uraian",
                "{$detailTable}.harga_satuan",
                "{$detailTable}.volume",
                "{$bkuTable}.tanggal_transaksi",
            ]);

            if ($legacyDetails->isNotEmpty()) {
                $monthNames = [
                    1 => 'januari', 2 => 'februari', 3 => 'maret', 4 => 'april',
                    5 => 'mei', 6 => 'juni', 7 => 'juli', 8 => 'agustus',
                    9 => 'september', 10 => 'oktober', 11 => 'november', 12 => 'desember',
                ];
                $rkasBySig = [];
                foreach ($rkasRows as $row) {
                    $bulanKey = mb_strtolower(trim((string) $row->bulan), 'UTF-8');
                    if ($isPerubahan && (self::MONTH_ORDER[$bulanKey] ?? 0) < 7) {
                        continue;
                    }
                    $hargaKey = number_format((float) $row->harga_satuan, 2, '.', '');
                    $baseKey = "{$row->kode_id}|{$row->kode_rekening_id}|{$bulanKey}|{$hargaKey}|";
                    $uSikas = mb_strtolower(trim((string) $row->uraian), 'UTF-8');
                    if ($uSikas !== '' && ! isset($rkasBySig[$baseKey.$uSikas])) {
                        $rkasBySig[$baseKey.$uSikas] = (int) $row->id;
                    }
                    $uArkas = mb_strtolower(trim((string) ($row->uraian_arkas ?? '')), 'UTF-8');
                    if ($uArkas !== '' && ! isset($rkasBySig[$baseKey.$uArkas])) {
                        $rkasBySig[$baseKey.$uArkas] = (int) $row->id;
                    }
                }

                foreach ($legacyDetails as $detail) {
                    $ts = $detail->tanggal_transaksi ? strtotime((string) $detail->tanggal_transaksi) : false;
                    $bulanKey = $ts ? ($monthNames[(int) date('n', $ts)] ?? '') : '';
                    $hargaKey = number_format((float) $detail->harga_satuan, 2, '.', '');
                    $uKey = mb_strtolower(trim((string) $detail->uraian), 'UTF-8');
                    $sig = "{$detail->kode_kegiatan_id}|{$detail->rekening_belanja_id}|{$bulanKey}|{$hargaKey}|{$uKey}";
                    if (isset($rkasBySig[$sig])) {
                        $matchedId = $rkasBySig[$sig];
                        $spentById[$matchedId] = ($spentById[$matchedId] ?? 0.0) + (float) $detail->volume;
                    }
                }
            }
        }

        return $spentById;
    }

    /**
     * Membentuk statistik ringkas & payload `diff_preview` terstandar dari hasil dry-run syncFromArkas.
     *
     * @param  array<string, mixed>  $dryStats
     * @param  array<int, array<string, mixed>>  $arkasItems
     * @return array{total_kegiatan: int, total_alokasi: int, total_alokasi_rp: float, diff_preview: array<string, mixed>}
     */
    public function buildDiffPreview(array $dryStats, array $arkasItems): array
    {
        $uniqueKegiatanKeys = [];
        $totalAlokasiRp = 0.0;
        foreach ($arkasItems as $it) {
            $kKey = (string) ($it['id_rapbs'] ?? (($it['kode_kegiatan'] ?? '').'|'.($it['kode_rekening'] ?? '').'|'.($it['uraian'] ?? '')));
            $uniqueKegiatanKeys[$kKey] = true;
            $totalAlokasiRp += isset($it['jumlah'])
                ? (float) $it['jumlah']
                : ((float) ($it['volume'] ?? 0) * (float) ($it['harga_satuan'] ?? 0));
        }

        $previewChanges = $dryStats['preview_changes'] ?? [
            'will_update' => [],
            'will_insert' => [],
            'will_delete' => [],
            'protected_bku' => [],
            'protected_tahap1' => [],
        ];
        $protectedTahap1 = $previewChanges['protected_tahap1'] ?? [];

        $hasDifferences = count($previewChanges['will_update']) > 0
            || count($previewChanges['will_insert']) > 0
            || count($previewChanges['will_delete']) > 0
            || count($previewChanges['protected_bku']) > 0
            || count($protectedTahap1) > 0
            || count($dryStats['unmatched_arkas']) > 0
            || (bool) $dryStats['is_budget_mismatch'];

        return [
            'total_kegiatan' => count($uniqueKegiatanKeys),
            'total_alokasi' => count($arkasItems),
            'total_alokasi_rp' => round($totalAlokasiRp, 2),
            'diff_preview' => [
                'has_differences' => $hasDifferences,
                'matched_direct' => max(0, (int) $dryStats['matched'] - (int) $dryStats['updated_perubahan']),
                'will_update' => $previewChanges['will_update'],
                'will_insert' => $previewChanges['will_insert'],
                'will_delete' => $previewChanges['will_delete'],
                'protected_bku' => $previewChanges['protected_bku'],
                'protected_tahap1' => $protectedTahap1,
                'unmatched_arkas' => $dryStats['unmatched_arkas'],
                'total_sikas_rp' => (float) ($dryStats['initial_sikas_rp'] ?? $dryStats['total_sikas_rp']),
                'estimated_sikas_rp' => (float) $dryStats['total_sikas_rp'],
                'total_arkas_rp' => (float) $dryStats['total_arkas_rp'],
                'estimated_selisih_rp' => (float) $dryStats['selisih_rp'],
                'is_budget_mismatch' => (bool) $dryStats['is_budget_mismatch'],
            ],
        ];
    }

    /**
     * Validasi keberadaan referensi kode kegiatan & rekening belanja untuk Mode A (initial import).
     * Mengembalikan pesan error jika ada referensi yang belum terdaftar, atau null jika valid.
     *
     * @param  array<int, array<string, mixed>>  $arkasItems
     * @param  array<string, int>  $kegiatanMap
     * @param  Collection<string, RekeningBelanja>  $rekenings
     */
    public function validateMasterReferences(array $arkasItems, array $kegiatanMap, Collection $rekenings): ?string
    {
        $missingKegiatan = [];
        $missingRekening = [];

        foreach ($arkasItems as $item) {
            $rawKodeKeg = trim((string) ($item['kode_kegiatan'] ?? ''));
            $kodeNorm = $this->normalizeKodeKegiatan($rawKodeKeg);
            if ($kodeNorm === '' || (! isset($kegiatanMap[$kodeNorm.'.']) && ! isset($kegiatanMap[$kodeNorm]))) {
                $missingKegiatan[$rawKodeKeg !== '' ? $rawKodeKeg : '(kosong)'] = true;
            }

            $kodeRek = trim((string) ($item['kode_rekening'] ?? ''));
            if ($kodeRek === '' || ! isset($rekenings[$kodeRek])) {
                $missingRekening[$kodeRek !== '' ? $kodeRek : '(kosong)'] = true;
            }
        }

        if (empty($missingKegiatan) && empty($missingRekening)) {
            return null;
        }

        $errMsg = 'Terdapat referensi ARKAS yang belum terdaftar di newSIKAS: ';
        if (! empty($missingKegiatan)) {
            $errMsg .= 'Kode Kegiatan: '.implode(', ', array_keys($missingKegiatan)).'. ';
        }
        if (! empty($missingRekening)) {
            $errMsg .= 'Kode Rekening: '.implode(', ', array_keys($missingRekening)).'. ';
        }

        return $errMsg.'Silakan sinkronkan Referensi Kode terlebih dahulu di menu Referensi.';
    }

    /**
     * Membangun flash type, pesan ringkas, dan payload laporan untuk Inertia.
     *
     * @param  array<string, mixed>  $stats
     * @return array{flash_type: 'success'|'warning', message: string, report: array<string, mixed>}
     */
    public function buildFlashResponse(array $stats, string $sourceLabel, int $tahun, float $paguArkas): array
    {
        $report = array_merge($stats, [
            'source_label' => $sourceLabel,
            'tahun' => $tahun,
        ]);

        if ($stats['mode'] === 'initial_import') {
            $msg = "Berhasil menarik {$stats['inserted']} data alokasi bulanan {$sourceLabel} dari ARKAS.";
            if ($paguArkas > 0) {
                $msg .= ' Pagu anggaran diperbarui menjadi Rp '.number_format($paguArkas, 0, ',', '.').'.';
            }

            return [
                'flash_type' => $stats['has_warnings'] ? 'warning' : 'success',
                'message' => $msg,
                'report' => $report,
            ];
        }

        if (in_array($stats['mode'], ['perubahan_reconcile', 'awal_reconcile'], true)) {
            $updated = (int) ($stats['updated_perubahan'] ?? 0);
            $inserted = (int) ($stats['inserted'] ?? 0);
            $deleted = (int) ($stats['deleted_perubahan'] ?? 0);
            $parts = ["{$stats['matched']} baris disandingkan"];
            if ($updated > 0) {
                $parts[] = "{$updated} baris disesuaikan (bulan/volume/satuan/harga)";
            }
            if ($inserted > 0) {
                $parts[] = "{$inserted} item baru ditambahkan";
            }
            if ($deleted > 0) {
                $deletedLabel = $stats['mode'] === 'perubahan_reconcile'
                    ? "{$deleted} item Tahap 2 dibatalkan/dihapus"
                    : "{$deleted} item tanpa BKU dihapus mengikuti ARKAS";
                $parts[] = $deletedLabel;
            }

            if ($stats['has_warnings']) {
                $msg = "Sinkronisasi {$sourceLabel} selesai dengan catatan: ".implode(', ', $parts)
                    .', '.count($stats['unpaired_sikas']).' SIKAS belum cocok, dan '
                    .count($stats['unmatched_arkas']).' ARKAS tidak cocok.';

                return [
                    'flash_type' => 'warning',
                    'message' => $msg,
                    'report' => $report,
                ];
            }

            $msg = "Sinkronisasi {$sourceLabel} berhasil 100% cocok: ".implode(', ', $parts).' (Uraian SIKAS tetap terjaga).';

            return [
                'flash_type' => 'success',
                'message' => $msg,
                'report' => $report,
            ];
        }

        if ($stats['has_warnings']) {
            $msg = "Penyandingan {$sourceLabel} selesai dengan peringatan: {$stats['matched']} baris SIKAS disandingkan, "
                .count($stats['unpaired_sikas']).' baris SIKAS belum/tidak cocok, dan '
                .count($stats['unmatched_arkas']).' item ARKAS tidak cocok (tidak ada baris baru ditambahkan otomatis).';

            return [
                'flash_type' => 'warning',
                'message' => $msg,
                'report' => $report,
            ];
        }

        $msg = "Penyandingan {$sourceLabel} selesai 100% cocok: {$stats['matched']} baris SIKAS berhasil disandingkan Uraian Arkas-nya (Uraian SIKAS tetap terjaga).";

        return [
            'flash_type' => 'success',
            'message' => $msg,
            'report' => $report,
        ];
    }

    /**
     * Sinkronisasi aman data RKAS Awal / RKAS Perubahan dari ARKAS ke newSIKAS.
     *
     * - Mode A (RKAS SIKAS kosong): tarik penuh seluruh item ARKAS (uraian SIKAS = uraian ARKAS).
     * - Mode B (Strict Match-Only): tidak pernah menghapus baris SIKAS, tidak menimpa uraian SIKAS,
     *   dan tidak pernah auto-insert agar anggaran tidak membengkak.
     * - Mode C (RKAS Perubahan, $reconcilePerubahan = true): ARKAS-AUTHORITATIVE PERUBAHAN khusus Tahap 2 (Jul-Des) —
     *   melindungi Tahap 1 (Jan-Jun) dan baris Tahap 2 yang sudah terpakai di BKU.
     * - Mode D (RKAS Awal, $reconcileAwal = true): ARKAS-AUTHORITATIVE PERGESERAN (Jan-Des) —
     *   menyesuaikan pergeseran bulan/volume/satuan/harga sambil menjaga uraian SIKAS, mewarisi uraian SIKAS
     *   saat pemecahan bulan, dan menerapkan proteksi cerdas berbasis volume terpakai BKU ($spentVolumeByRowId).
     * - Mendukung $dryRun = true untuk deteksi perbedaan tanpa menulis ke database (mengisi `preview_changes`).
     *
     * @param  class-string  $rkasModelClass
     * @param  array<int, array<string, mixed>>  $arkasItems
     * @param  array<string, int>  $kegiatanMap
     * @param  Collection<string, RekeningBelanja>  $rekenings
     * @param  array<int, int>  $protectedRowIds
     * @param  array<int, float>  $spentVolumeByRowId
     * @return array<string, mixed>
     */
    public function syncFromArkas(
        string $rkasModelClass,
        string $penganggaranFk,
        int $penganggaranId,
        int $tahun,
        array $arkasItems,
        array $kegiatanMap,
        Collection $rekenings,
        bool $reconcilePerubahan = false,
        array $protectedRowIds = [],
        bool $reconcileAwal = false,
        array $spentVolumeByRowId = [],
        bool $dryRun = false
    ): array {
        $refBarangMaps = $this->buildRefBarangLookup($tahun, $arkasItems);

        /** @var Collection<int, Model> $existingRows */
        $existingRows = $rkasModelClass::with(['kodeKegiatan', 'rekeningBelanja'])
            ->where($penganggaranFk, $penganggaranId)
            ->orderBy('id')
            ->get();

        $normalizedItems = [];
        $totalArkasRp = 0.0;
        foreach ($arkasItems as $idx => $item) {
            $norm = $this->normalizeArkasItem($item, $kegiatanMap, $rekenings, $refBarangMaps);
            $normalizedItems[$idx] = $norm;
            $totalArkasRp += $norm['total'];
        }
        $totalArkasRp = round($totalArkasRp, 2);

        // Mode A: Data SIKAS masih kosong — tarik penuh & isi uraian SIKAS = uraian ARKAS
        if ($existingRows->isEmpty()) {
            return $this->runInitialImport($rkasModelClass, $penganggaranFk, $penganggaranId, $normalizedItems, $totalArkasRp, $dryRun);
        }

        $isReconcile = $reconcilePerubahan || $reconcileAwal;
        $reconcileMode = $reconcilePerubahan
            ? 'perubahan_reconcile'
            : ($reconcileAwal ? 'awal_reconcile' : 'match_only');
        $minReconcileBulan = $reconcilePerubahan ? 7 : 1;

        $rowMeta = $this->buildRowMetadata($existingRows);
        $rowBuckets = $this->bucketRowsByKey($rowMeta);
        $initialSikasRp = round(array_sum(array_column($rowMeta, 'total')), 2);
        $totalSikasRp = $initialSikasRp;
        $selisihRp = round($totalArkasRp - $totalSikasRp, 2);
        $isBudgetMismatch = abs($selisihRp) >= 1.0;

        $pairedUraianByGroup = $this->seedPairedUraianGroups($rowMeta);
        $claimedRowIds = [];
        $handledItemIndices = [];
        $matchedRowCount = 0;
        $crossMonthMatchedCount = 0;
        $updatedPerubahanCount = 0;

        $protectedIdSet = array_fill_keys($protectedRowIds, true);
        $spentVolumeMap = [];
        foreach ($spentVolumeByRowId as $rowId => $vol) {
            $v = (float) $vol;
            if ($v > 0.0001) {
                $spentVolumeMap[(int) $rowId] = $v;
                $protectedIdSet[(int) $rowId] = true;
            }
        }

        $pairedUraianById = [];
        $sikasUraianByArkasKey = [];
        $simulatedRowTotals = [];
        foreach ($rowMeta as $m) {
            $simulatedRowTotals[$m['id']] = $m['total'];
        }
        $previewChanges = [
            'will_update' => [],
            'will_insert' => [],
            'will_delete' => [],
            'protected_bku' => [],
            'protected_tahap1' => [],
        ];

        $applyRowsToItem = function (array $matchedRows, array $norm, int $idx) use (
            &$claimedRowIds,
            &$handledItemIndices,
            &$pairedUraianByGroup,
            &$matchedRowCount,
            &$crossMonthMatchedCount,
            &$updatedPerubahanCount,
            &$pairedUraianById,
            &$sikasUraianByArkasKey,
            &$simulatedRowTotals,
            &$previewChanges,
            $isReconcile,
            $minReconcileBulan,
            $protectedIdSet,
            $dryRun
        ): void {
            $handledItemIndices[$idx] = true;
            $groupKey = $this->makeGroupKey($norm['kode_kegiatan_norm'], $norm['kode_rekening_norm'], $norm['uraian_clean']);
            $isSingleMatch = count($matchedRows) === 1;

            foreach ($matchedRows as $meta) {
                /** @var Model $row */
                $row = $meta['row'];
                $claimedRowIds[$row->id] = true;
                if ($norm['uraian'] !== '') {
                    $pairedUraianById[$row->id] = $norm['uraian'];
                    $inheritKey = $this->makeArkasInheritKey($norm['kode_kegiatan_norm'], $norm['kode_rekening_norm'], $norm['uraian_clean'], $norm['harga_satuan']);
                    if (! isset($sikasUraianByArkasKey[$inheritKey]) && $meta['uraian'] !== '') {
                        $sikasUraianByArkasKey[$inheritKey] = $meta['uraian'];
                    }
                }

                $extraUpdates = [];
                if ($meta['bulan_clean'] !== $norm['bulan_clean']) {
                    $crossMonthMatchedCount++;

                    // Mode C/D: untuk pasangan 1-ke-1 lintas bulan pada rentang bulan rekonsiliasi yang belum dipakai di BKU,
                    // sesuaikan bulan (dan satuan jika berubah) mengikuti ARKAS sambil menjaga uraian SIKAS.
                    if ($isReconcile
                        && $isSingleMatch
                        && (int) $meta['bulan_num'] >= $minReconcileBulan
                        && (int) $norm['bulan_num'] >= $minReconcileBulan
                        && ! isset($protectedIdSet[$row->id])) {
                        $extraUpdates['bulan'] = $norm['bulan'];
                        if ($norm['satuan'] !== '' && trim((string) $row->satuan) !== $norm['satuan']) {
                            $extraUpdates['satuan'] = $norm['satuan'];
                        }
                        $updatedPerubahanCount++;
                        $simulatedRowTotals[$row->id] = $norm['total'];
                        $previewChanges['will_update'][] = $this->buildPreviewUpdateEntry($meta, $norm);
                    }
                }

                if (! $dryRun) {
                    $this->persistRowPairing($row, $norm['uraian'], $norm['id_barang_arkas'], $extraUpdates);
                }

                $pairedUraianByGroup[$groupKey][$meta['uraian_clean']] = true;
                $matchedRowCount++;
            }
        };

        // Pass 1: 1-ke-1 Exact Bulan Sama + Uraian/Uraian Arkas Sama + Harga + Satuan + Volume
        $this->runPassOneExactSameMonth($normalizedItems, $rowBuckets, $claimedRowIds, $handledItemIndices, $applyRowsToItem);

        // Pass 2: 1-ke-1 Exact Nilai Bulan Sama (Harga + Satuan + Volume; tie-breaker grup & similar_text)
        $this->runPassTwoValueSameMonth($normalizedItems, $rowBuckets, $claimedRowIds, $handledItemIndices, $pairedUraianByGroup, $applyRowsToItem);

        // Pass 3: 1-ke-Banyak Agregasi Bulan Sama (hanya saat total volume bulan seimbang agar tidak mencampur item split-bulan berbeda)
        $this->runPassThreeAggregatedSameMonth($normalizedItems, $rowBuckets, $claimedRowIds, $handledItemIndices, $pairedUraianByGroup, $applyRowsToItem, requireBalancedMonth: true);

        // Pass 4: 1-ke-1 Lintas Bulan (Kegiatan + Rekening + Harga + Satuan + Volume sama, beda bulan)
        // Pada Mode C ($reconcilePerubahan), isolasi lintas bulan dalam Tahap yang sama.
        // Pada Mode C/D ($isReconcile), kecualikan baris ber-BKU ($protectedIdSet) agar pergeseran bulan baris ber-BKU
        // tidak diklaim diam-diam melainkan muncul jelas pada laporan proteksi BKU.
        $this->runPassFourCrossMonthSingle(
            $normalizedItems,
            $rowBuckets,
            $claimedRowIds,
            $handledItemIndices,
            $pairedUraianByGroup,
            $applyRowsToItem,
            sameTahap: $reconcilePerubahan,
            excludeRowIds: $isReconcile ? $protectedIdSet : []
        );

        // Pass 5a: 1-ke-Banyak Split-Bulan pada uraian SIKAS yang sama (misal 1 Mar + 1 Apr = 2 Apr).
        // Pada Mode C/D ($isReconcile), untuk bulan dalam rentang rekonsiliasi (>= $minReconcileBulan),
        // hanya dijalankan jika grup menyentuh baris ber-BKU agar pergeseran bulan bebas direkonsiliasi ke bulan ARKAS.
        $this->runPassFiveSameUraianSplitMonth(
            $normalizedItems,
            $rowBuckets,
            $claimedRowIds,
            $handledItemIndices,
            $pairedUraianByGroup,
            $applyRowsToItem,
            sameTahap: $reconcilePerubahan,
            onlyIfHasProtected: $isReconcile ? $protectedIdSet : null,
            onlyIfHasProtectedMinBulan: $minReconcileBulan
        );

        // Pass 5b: Fallback 1-ke-Banyak Bulan Sama (bulan tidak seimbang) & Lintas Bulan
        $this->runPassThreeAggregatedSameMonth($normalizedItems, $rowBuckets, $claimedRowIds, $handledItemIndices, $pairedUraianByGroup, $applyRowsToItem, requireBalancedMonth: false);
        $this->runPassFiveCrossMonthSubset(
            $normalizedItems,
            $rowBuckets,
            $claimedRowIds,
            $handledItemIndices,
            $pairedUraianByGroup,
            $applyRowsToItem,
            sameTahap: $reconcilePerubahan,
            skipMinBulan: $isReconcile ? $minReconcileBulan : null
        );

        // Pass 6: Banyak-ke-1 Lintas Bulan (beberapa item ARKAS sama uraian+harga+satuan -> 1 baris SIKAS).
        // Pada Mode C/D ($isReconcile), untuk bulan >= $minReconcileBulan hanya dijalankan jika baris SIKAS target
        // terpakai BKU melebihi pecahan item ARKAS (tidak bisa dipecah tanpa melanggar volume BKU),
        // sehingga baris bebas/aman tetap dipecah oleh Pass A + Pass B.
        $this->runPassSixManyToOne(
            $normalizedItems,
            $rowBuckets,
            $claimedRowIds,
            $handledItemIndices,
            $pairedUraianByGroup,
            $matchedRowCount,
            $crossMonthMatchedCount,
            sameTahap: $reconcilePerubahan,
            dryRun: $dryRun,
            pairedUraianById: $pairedUraianById,
            onlyIfCannotSplitSpentMap: $isReconcile ? $spentVolumeMap : null,
            onlyIfCannotSplitMinBulan: $minReconcileBulan
        );

        $insertedCount = 0;
        $deletedPerubahanCount = 0;
        $deletedRowIds = [];
        $bkuConflictItemIndices = [];

        if ($isReconcile) {
            // Mode C (RKAS Perubahan: Jul-Des) atau Mode D (RKAS Awal: Jan-Des)
            $reconcileStats = $this->runReconcilePasses(
                $rkasModelClass,
                $penganggaranFk,
                $penganggaranId,
                $normalizedItems,
                $rowMeta,
                $rowBuckets,
                $claimedRowIds,
                $handledItemIndices,
                $protectedIdSet,
                $spentVolumeMap,
                $deletedRowIds,
                $matchedRowCount,
                $crossMonthMatchedCount,
                $minReconcileBulan,
                $dryRun,
                $pairedUraianById,
                $sikasUraianByArkasKey,
                $simulatedRowTotals,
                $previewChanges,
                $bkuConflictItemIndices
            );
            $updatedPerubahanCount += $reconcileStats['updated_perubahan'];
            $insertedCount = $reconcileStats['inserted'];
            $deletedPerubahanCount = $reconcileStats['deleted_perubahan'];

            if ($dryRun) {
                $totalSikasRows = count($simulatedRowTotals) + $insertedCount;
                $totalSikasRp = round(array_sum($simulatedRowTotals) + $reconcileStats['inserted_rp'], 2);
            } else {
                // Hitung ulang total SIKAS pasca-rekonsiliasi langsung dari database
                $freshRows = $rkasModelClass::query()
                    ->where($penganggaranFk, $penganggaranId)
                    ->get(['jumlah', 'harga_satuan']);
                $totalSikasRows = $freshRows->count();
                $totalSikasRp = round((float) $freshRows->sum(fn ($r) => (float) $r->jumlah * (float) $r->harga_satuan), 2);
            }
            $selisihRp = round($totalArkasRp - $totalSikasRp, 2);
            $isBudgetMismatch = abs($selisihRp) >= 1.0;
        } else {
            $totalSikasRows = count($rowMeta);
        }

        $unmatchedArkas = $this->collectUnmatchedArkas($normalizedItems, $handledItemIndices, $rowBuckets, $claimedRowIds, $bkuConflictItemIndices);
        $unpairedSikas = $this->collectUnpairedSikas($rowMeta, $claimedRowIds, $protectedIdSet, $deletedRowIds, $pairedUraianById, $spentVolumeMap, $reconcileMode);

        // Isi daftar baris dilindungi BKU & Tahap 1 pada preview_changes untuk modal deteksi perbedaan
        foreach ($unpairedSikas as $item) {
            if (! empty($item['is_protected'])) {
                $previewChanges['protected_bku'][] = $item;
            } elseif (! empty($item['is_tahap1_protected'])) {
                $previewChanges['protected_tahap1'][] = $item;
            }
        }

        $hasWarnings = $isBudgetMismatch || count($unmatchedArkas) > 0 || count($unpairedSikas) > 0;

        return [
            'mode' => $reconcileMode,
            'matched' => $matchedRowCount,
            'cross_month_matched' => $crossMonthMatchedCount,
            'updated_perubahan' => $updatedPerubahanCount,
            'inserted' => $insertedCount,
            'deleted_perubahan' => $deletedPerubahanCount,
            'total_arkas' => count($normalizedItems),
            'total_sikas_rows' => $totalSikasRows,
            'initial_sikas_rp' => $initialSikasRp,
            'total_sikas_rp' => $totalSikasRp,
            'total_arkas_rp' => $totalArkasRp,
            'selisih_rp' => $selisihRp,
            'is_budget_mismatch' => $isBudgetMismatch,
            'has_warnings' => $hasWarnings,
            'unmatched_arkas' => $unmatchedArkas,
            'unpaired_sikas' => $unpairedSikas,
            'preview_changes' => $previewChanges,
        ];
    }

    /**
     * Mode A: Import penuh seluruh item ARKAS saat RKAS SIKAS masih kosong.
     *
     * @param  class-string  $rkasModelClass
     * @param  array<int, array<string, mixed>>  $normalizedItems
     * @return array<string, mixed>
     */
    private function runInitialImport(
        string $rkasModelClass,
        string $penganggaranFk,
        int $penganggaranId,
        array $normalizedItems,
        float $totalArkasRp,
        bool $dryRun = false
    ): array {
        $insertedCount = 0;
        $insertedRp = 0.0;
        $skippedItems = [];

        foreach ($normalizedItems as $norm) {
            if ($norm['kegiatan_id'] === null || $norm['rekening_id'] === null) {
                $skippedItems[] = [
                    'kode_kegiatan' => $norm['kode_kegiatan'],
                    'kode_rekening' => $norm['kode_rekening'],
                    'bulan' => $norm['bulan'],
                    'uraian' => $norm['uraian'],
                    'volume' => $norm['volume'],
                    'satuan' => $norm['satuan'],
                    'harga_satuan' => $norm['harga_satuan'],
                    'total' => $norm['total'],
                    'reason' => 'Referensi kode kegiatan atau kode rekening belum terdaftar di SIKAS',
                ];

                continue;
            }

            if (! $dryRun) {
                $this->createRkasRow($rkasModelClass, $penganggaranFk, $penganggaranId, $norm, $norm['uraian'], $norm['id_barang_arkas']);
            }
            $insertedCount++;
            $insertedRp += $norm['total'];
        }

        $insertedRp = round($insertedRp, 2);
        $selisihRp = round($totalArkasRp - $insertedRp, 2);
        $isBudgetMismatch = abs($selisihRp) >= 1.0;

        return [
            'mode' => 'initial_import',
            'matched' => 0,
            'cross_month_matched' => 0,
            'updated_perubahan' => 0,
            'inserted' => $insertedCount,
            'deleted_perubahan' => 0,
            'total_arkas' => count($normalizedItems),
            'total_sikas_rows' => $insertedCount,
            'total_sikas_rp' => $insertedRp,
            'total_arkas_rp' => $totalArkasRp,
            'selisih_rp' => $selisihRp,
            'is_budget_mismatch' => $isBudgetMismatch,
            'has_warnings' => $isBudgetMismatch || count($skippedItems) > 0,
            'unmatched_arkas' => $skippedItems,
            'unpaired_sikas' => [],
        ];
    }

    /**
     * Pass 1: 1-ke-1 pada kegiatan + rekening + bulan + harga + satuan + volume + uraian/uraian_arkas sama.
     *
     * @param  array<int, array<string, mixed>>  $normalizedItems
     * @param  array<string, array<int, array<string, mixed>>>  $rowBuckets
     * @param  array<int, bool>  $claimedRowIds
     * @param  array<int, bool>  $handledItemIndices
     */
    private function runPassOneExactSameMonth(
        array $normalizedItems,
        array $rowBuckets,
        array &$claimedRowIds,
        array &$handledItemIndices,
        callable $applyRowsToItem
    ): void {
        foreach ($normalizedItems as $idx => $norm) {
            if (isset($handledItemIndices[$idx])) {
                continue;
            }

            $candidates = $this->filterCandidates($rowBuckets, $claimedRowIds, $norm, sameMonth: true);
            foreach ($candidates as $meta) {
                if ($this->isSameVolume($meta['volume'], $norm['volume'])
                    && $this->matchesMetaUraian($meta, $norm['uraian_clean'])) {
                    $applyRowsToItem([$meta], $norm, $idx);
                    break;
                }
            }
        }
    }

    /**
     * Pass 2: 1-ke-1 pada kegiatan + rekening + bulan + harga + satuan + volume sama.
     *
     * @param  array<int, array<string, mixed>>  $normalizedItems
     * @param  array<string, array<int, array<string, mixed>>>  $rowBuckets
     * @param  array<int, bool>  $claimedRowIds
     * @param  array<int, bool>  $handledItemIndices
     * @param  array<string, array<string, bool>>  $pairedUraianByGroup
     */
    private function runPassTwoValueSameMonth(
        array $normalizedItems,
        array $rowBuckets,
        array &$claimedRowIds,
        array &$handledItemIndices,
        array &$pairedUraianByGroup,
        callable $applyRowsToItem
    ): void {
        foreach ($normalizedItems as $idx => $norm) {
            if (isset($handledItemIndices[$idx])) {
                continue;
            }

            $candidates = array_values(array_filter(
                $this->filterCandidates($rowBuckets, $claimedRowIds, $norm, sameMonth: true),
                fn (array $meta) => $this->isSameVolume($meta['volume'], $norm['volume'])
            ));

            if (empty($candidates)) {
                continue;
            }

            $best = $this->pickBestSingleCandidate($candidates, $norm, $pairedUraianByGroup);
            if ($best !== null) {
                $applyRowsToItem([$best], $norm, $idx);
            }
        }
    }

    /**
     * Pass 3 / 5b: 1-ke-Banyak pada kegiatan + rekening + bulan + harga + satuan sama dengan SUM(jumlah) == volume ARKAS.
     *
     * @param  array<int, array<string, mixed>>  $normalizedItems
     * @param  array<string, array<int, array<string, mixed>>>  $rowBuckets
     * @param  array<int, bool>  $claimedRowIds
     * @param  array<int, bool>  $handledItemIndices
     * @param  array<string, array<string, bool>>  $pairedUraianByGroup
     */
    private function runPassThreeAggregatedSameMonth(
        array $normalizedItems,
        array $rowBuckets,
        array &$claimedRowIds,
        array &$handledItemIndices,
        array &$pairedUraianByGroup,
        callable $applyRowsToItem,
        bool $requireBalancedMonth = true
    ): void {
        foreach ($normalizedItems as $idx => $norm) {
            if (isset($handledItemIndices[$idx])) {
                continue;
            }

            $candidates = $this->filterCandidates($rowBuckets, $claimedRowIds, $norm, sameMonth: true);
            if (count($candidates) < 2) {
                continue;
            }

            if ($requireBalancedMonth) {
                $sikasMonthVol = array_sum(array_column($candidates, 'volume'));
                $arkasMonthVol = $this->sumUnhandledArkasMonthVolume($normalizedItems, $handledItemIndices, $norm);
                if (! $this->isSameVolume($sikasMonthVol, $arkasMonthVol)) {
                    continue;
                }
            }

            $matchedGroup = $this->findVolumeSumMatch($candidates, $norm, $pairedUraianByGroup);

            if ($matchedGroup !== null) {
                $applyRowsToItem($matchedGroup, $norm, $idx);
            }
        }
    }

    /**
     * @param  array<int, array<string, mixed>>  $normalizedItems
     * @param  array<int, bool>  $handledItemIndices
     * @param  array<string, mixed>  $targetNorm
     */
    private function sumUnhandledArkasMonthVolume(array $normalizedItems, array $handledItemIndices, array $targetNorm): float
    {
        $sum = 0.0;

        foreach ($normalizedItems as $idx => $item) {
            if (isset($handledItemIndices[$idx])) {
                continue;
            }
            if ($item['kode_kegiatan_norm'] === $targetNorm['kode_kegiatan_norm']
                && $item['kode_rekening_norm'] === $targetNorm['kode_rekening_norm']
                && $item['bulan_clean'] === $targetNorm['bulan_clean']
                && $item['satuan_clean'] === $targetNorm['satuan_clean']
                && abs($item['harga_satuan'] - $targetNorm['harga_satuan']) < 0.01) {
                $sum += (float) $item['volume'];
            }
        }

        return $sum;
    }

    /**
     * Pass 4: 1-ke-1 Lintas Bulan pada kegiatan + rekening + harga + satuan + volume sama.
     *
     * @param  array<int, array<string, mixed>>  $normalizedItems
     * @param  array<string, array<int, array<string, mixed>>>  $rowBuckets
     * @param  array<int, bool>  $claimedRowIds
     * @param  array<int, bool>  $handledItemIndices
     * @param  array<string, array<string, bool>>  $pairedUraianByGroup
     */
    private function runPassFourCrossMonthSingle(
        array $normalizedItems,
        array $rowBuckets,
        array &$claimedRowIds,
        array &$handledItemIndices,
        array &$pairedUraianByGroup,
        callable $applyRowsToItem,
        bool $sameTahap = false,
        array $excludeRowIds = []
    ): void {
        foreach ($normalizedItems as $idx => $norm) {
            if (isset($handledItemIndices[$idx])) {
                continue;
            }

            $candidates = array_values(array_filter(
                $this->filterCandidates($rowBuckets, $claimedRowIds, $norm, sameMonth: false, sameTahap: $sameTahap),
                fn (array $meta) => $this->isSameVolume($meta['volume'], $norm['volume'])
                    && ! isset($excludeRowIds[$meta['id']])
            ));

            if (empty($candidates)) {
                continue;
            }

            $best = $this->pickBestSingleCandidate($candidates, $norm, $pairedUraianByGroup);
            if ($best !== null) {
                $applyRowsToItem([$best], $norm, $idx);
            }
        }
    }

    /**
     * Pass 5a: 1-ke-Banyak Split-Bulan pada baris SIKAS dengan uraian SIKAS yang sama (misal 1 Mar + 1 Apr = 2 Apr).
     *
     * @param  array<int, array<string, mixed>>  $normalizedItems
     * @param  array<string, array<int, array<string, mixed>>>  $rowBuckets
     * @param  array<int, bool>  $claimedRowIds
     * @param  array<int, bool>  $handledItemIndices
     * @param  array<string, array<string, bool>>  $pairedUraianByGroup
     */
    private function runPassFiveSameUraianSplitMonth(
        array $normalizedItems,
        array $rowBuckets,
        array &$claimedRowIds,
        array &$handledItemIndices,
        array &$pairedUraianByGroup,
        callable $applyRowsToItem,
        bool $sameTahap = false,
        ?array $onlyIfHasProtected = null,
        int $onlyIfHasProtectedMinBulan = 1
    ): void {
        foreach ($normalizedItems as $idx => $norm) {
            if (isset($handledItemIndices[$idx])) {
                continue;
            }

            $candidates = $this->filterCandidates($rowBuckets, $claimedRowIds, $norm, sameMonth: false, sameTahap: $sameTahap);
            if (count($candidates) < 2) {
                continue;
            }

            $byUraian = [];
            foreach ($candidates as $meta) {
                $byUraian[$meta['uraian_clean']][] = $meta;
            }

            $bestGroup = null;
            $bestScore = -1.0;
            $groupKey = $this->makeGroupKey($norm['kode_kegiatan_norm'], $norm['kode_rekening_norm'], $norm['uraian_clean']);

            foreach ($byUraian as $sikasUraianClean => $groupRows) {
                if (count($groupRows) < 2) {
                    continue;
                }

                if ($onlyIfHasProtected !== null && (int) $norm['bulan_num'] >= $onlyIfHasProtectedMinBulan) {
                    $hasProtectedRow = false;
                    foreach ($groupRows as $rowInGroup) {
                        if (isset($onlyIfHasProtected[$rowInGroup['id']])) {
                            $hasProtectedRow = true;
                            break;
                        }
                    }
                    if (! $hasProtectedRow) {
                        continue;
                    }
                }

                $sumVol = array_sum(array_column($groupRows, 'volume'));
                if (! $this->isSameVolume($sumVol, $norm['volume'])) {
                    continue;
                }

                // Evaluasi skor terbaik dari seluruh baris dalam grup (bukan hanya baris pertama)
                $inPairedGroup = isset($pairedUraianByGroup[$groupKey][$sikasUraianClean]);
                $groupScore = -1.0;
                foreach ($groupRows as $rowInGroup) {
                    $rowScore = $this->scoreTextMatch(
                        $sikasUraianClean,
                        $rowInGroup['uraian_arkas_clean'],
                        $norm['uraian_clean'],
                        $inPairedGroup
                    );
                    if ($rowScore > $groupScore) {
                        $groupScore = $rowScore;
                    }
                }

                if ($groupScore > $bestScore) {
                    $bestScore = $groupScore;
                    $bestGroup = $groupRows;
                }
            }

            if ($bestGroup !== null) {
                $applyRowsToItem($bestGroup, $norm, $idx);
            }
        }
    }

    /**
     * Pass 5b (lintas bulan): Fallback subset-sum lintas bulan pada kegiatan + rekening + harga + satuan sama.
     *
     * @param  array<int, array<string, mixed>>  $normalizedItems
     * @param  array<string, array<int, array<string, mixed>>>  $rowBuckets
     * @param  array<int, bool>  $claimedRowIds
     * @param  array<int, bool>  $handledItemIndices
     * @param  array<string, array<string, bool>>  $pairedUraianByGroup
     */
    private function runPassFiveCrossMonthSubset(
        array $normalizedItems,
        array $rowBuckets,
        array &$claimedRowIds,
        array &$handledItemIndices,
        array &$pairedUraianByGroup,
        callable $applyRowsToItem,
        bool $sameTahap = false,
        ?int $skipMinBulan = null
    ): void {
        foreach ($normalizedItems as $idx => $norm) {
            if (isset($handledItemIndices[$idx])) {
                continue;
            }
            if ($skipMinBulan !== null && (int) $norm['bulan_num'] >= $skipMinBulan) {
                continue;
            }

            $candidates = $this->filterCandidates($rowBuckets, $claimedRowIds, $norm, sameMonth: false, sameTahap: $sameTahap);
            if (count($candidates) < 2) {
                continue;
            }

            $matchedGroup = $this->findVolumeSumMatch($candidates, $norm, $pairedUraianByGroup);
            if ($matchedGroup !== null) {
                $applyRowsToItem($matchedGroup, $norm, $idx);
            }
        }
    }

    /**
     * Pass 6: Banyak-ke-1 Lintas Bulan — beberapa item ARKAS ber-uraian + harga + satuan sama
     * yang total volumenya tepat sama dengan 1 baris SIKAS.
     *
     * @param  array<int, array<string, mixed>>  $normalizedItems
     * @param  array<string, array<int, array<string, mixed>>>  $rowBuckets
     * @param  array<int, bool>  $claimedRowIds
     * @param  array<int, bool>  $handledItemIndices
     * @param  array<string, array<string, bool>>  $pairedUraianByGroup
     */
    private function runPassSixManyToOne(
        array $normalizedItems,
        array $rowBuckets,
        array &$claimedRowIds,
        array &$handledItemIndices,
        array &$pairedUraianByGroup,
        int &$matchedRowCount,
        int &$crossMonthMatchedCount,
        bool $sameTahap = false,
        bool $dryRun = false,
        array &$pairedUraianById = [],
        ?array $onlyIfCannotSplitSpentMap = null,
        int $onlyIfCannotSplitMinBulan = 1
    ): void {
        $arkasGroups = [];
        foreach ($normalizedItems as $idx => $norm) {
            if (isset($handledItemIndices[$idx])) {
                continue;
            }

            $tahapKey = $sameTahap ? '|'.(((int) $norm['bulan_num'] >= 7) ? 't2' : 't1') : '';
            $key = $norm['kode_kegiatan_norm']
                .'|'.$norm['kode_rekening_norm']
                .'|'.$norm['uraian_clean']
                .'|'.$norm['satuan_clean']
                .'|'.number_format($norm['harga_satuan'], 2, '.', '')
                .$tahapKey;

            $arkasGroups[$key][] = $idx;
        }

        foreach ($arkasGroups as $indices) {
            if (count($indices) < 2) {
                continue;
            }

            $firstNorm = $normalizedItems[$indices[0]];
            $sumArkasVol = 0.0;
            foreach ($indices as $i) {
                $sumArkasVol += $normalizedItems[$i]['volume'];
            }

            $probeNorm = $firstNorm;
            $probeNorm['volume'] = $sumArkasVol;

            $candidates = array_values(array_filter(
                $this->filterCandidates($rowBuckets, $claimedRowIds, $probeNorm, sameMonth: false, sameTahap: $sameTahap),
                function (array $meta) use ($sumArkasVol, $onlyIfCannotSplitSpentMap, $onlyIfCannotSplitMinBulan, $normalizedItems, $indices) {
                    if (! $this->isSameVolume($meta['volume'], $sumArkasVol)) {
                        return false;
                    }
                    if ($onlyIfCannotSplitSpentMap !== null && (int) $meta['bulan_num'] >= $onlyIfCannotSplitMinBulan) {
                        $spent = $onlyIfCannotSplitSpentMap[$meta['id']] ?? 0.0;
                        if ($spent <= 0.0001) {
                            return false;
                        }
                        // Hanya izinkan Pass 6 jika tidak ada item ARKAS pada bulan yang sama dengan volume >= spent BKU
                        foreach ($indices as $i) {
                            if ($normalizedItems[$i]['bulan_clean'] === $meta['bulan_clean']
                                && $normalizedItems[$i]['volume'] >= ($spent - 0.001)) {
                                return false;
                            }
                        }
                    }

                    return true;
                }
            ));

            if (empty($candidates)) {
                continue;
            }

            $best = $this->pickBestSingleCandidate($candidates, $probeNorm, $pairedUraianByGroup);
            if ($best === null) {
                continue;
            }

            /** @var Model $row */
            $row = $best['row'];
            $claimedRowIds[$row->id] = true;
            $hasDifferentMonth = false;
            foreach ($indices as $i) {
                $handledItemIndices[$i] = true;
                if ($normalizedItems[$i]['bulan_clean'] !== $best['bulan_clean']) {
                    $hasDifferentMonth = true;
                }
            }

            if ($firstNorm['uraian'] !== '') {
                $pairedUraianById[$row->id] = $firstNorm['uraian'];
            }
            if (! $dryRun) {
                $this->persistRowPairing($row, $firstNorm['uraian'], $firstNorm['id_barang_arkas']);
            }
            $groupKey = $this->makeGroupKey($firstNorm['kode_kegiatan_norm'], $firstNorm['kode_rekening_norm'], $firstNorm['uraian_clean']);
            $pairedUraianByGroup[$groupKey][$best['uraian_clean']] = true;

            $matchedRowCount++;
            if ($hasDifferentMonth) {
                $crossMonthMatchedCount++;
            }
        }
    }

    /**
     * @param  array<int, array<string, mixed>>  $candidates
     * @param  array<string, mixed>  $norm
     * @param  array<string, array<string, bool>>  $pairedUraianByGroup
     * @return array<int, array<string, mixed>>|null
     */
    private function findVolumeSumMatch(array $candidates, array $norm, array $pairedUraianByGroup): ?array
    {
        $targetVolume = (float) $norm['volume'];
        if ($targetVolume <= 0 || count($candidates) < 2) {
            return null;
        }

        $eligible = array_values(array_filter(
            $candidates,
            fn (array $meta) => $meta['volume'] > 0 && $meta['volume'] < $targetVolume - 0.001
        ));

        if (count($eligible) < 2) {
            return null;
        }

        $totalVol = array_sum(array_column($eligible, 'volume'));
        if ($this->isSameVolume($totalVol, $targetVolume)) {
            return $eligible;
        }

        if ($totalVol < $targetVolume - 0.001) {
            return null;
        }

        // Prioritaskan baris yang uraian/uraian_arkas-nya paling cocok sebelum subset-sum berbatas ($maxVisits)
        $groupKey = $this->makeGroupKey($norm['kode_kegiatan_norm'], $norm['kode_rekening_norm'], $norm['uraian_clean']);
        usort($eligible, function (array $a, array $b) use ($norm, $pairedUraianByGroup, $groupKey): int {
            $scoreA = $this->scoreTextMatch($a['uraian_clean'], $a['uraian_arkas_clean'], $norm['uraian_clean'], isset($pairedUraianByGroup[$groupKey][$a['uraian_clean']]));
            $scoreB = $this->scoreTextMatch($b['uraian_clean'], $b['uraian_arkas_clean'], $norm['uraian_clean'], isset($pairedUraianByGroup[$groupKey][$b['uraian_clean']]));
            if (abs($scoreB - $scoreA) > 0.001) {
                return $scoreB <=> $scoreA;
            }

            return $a['id'] <=> $b['id'];
        });

        $n = count($eligible);
        $suffixSum = array_fill(0, $n + 1, 0.0);
        for ($i = $n - 1; $i >= 0; $i--) {
            $suffixSum[$i] = $suffixSum[$i + 1] + $eligible[$i]['volume'];
        }

        $visited = 0;
        $maxVisits = 2000;
        $chosen = [];

        $dfs = function (int $start, float $remaining) use (&$dfs, $eligible, $suffixSum, $n, &$visited, $maxVisits, &$chosen): bool {
            if (abs($remaining) < 0.001 && count($chosen) >= 2) {
                return true;
            }
            if ($remaining < -0.001 || $start >= $n || $visited >= $maxVisits) {
                return false;
            }
            if ($suffixSum[$start] < $remaining - 0.001) {
                return false;
            }

            $visited++;
            for ($i = $start; $i < $n; $i++) {
                $vol = $eligible[$i]['volume'];
                if ($vol > $remaining + 0.001) {
                    continue;
                }

                $chosen[] = $eligible[$i];
                if ($dfs($i + 1, $remaining - $vol)) {
                    return true;
                }
                array_pop($chosen);

                if ($visited >= $maxVisits) {
                    return false;
                }
            }

            return false;
        };

        return $dfs(0, $targetVolume) ? $chosen : null;
    }

    /**
     * @param  array<int, array<string, mixed>>  $candidates
     * @param  array<string, mixed>  $norm
     * @param  array<string, array<string, bool>>  $pairedUraianByGroup
     * @return array<string, mixed>|null
     */
    private function pickBestSingleCandidate(array $candidates, array $norm, array $pairedUraianByGroup): ?array
    {
        $groupKey = $this->makeGroupKey($norm['kode_kegiatan_norm'], $norm['kode_rekening_norm'], $norm['uraian_clean']);
        $best = null;
        $bestTextScore = -1.0;
        $bestMonthDiff = PHP_INT_MAX;

        foreach ($candidates as $meta) {
            $textScore = $this->scoreTextMatch(
                $meta['uraian_clean'],
                $meta['uraian_arkas_clean'],
                $norm['uraian_clean'],
                isset($pairedUraianByGroup[$groupKey][$meta['uraian_clean']])
            );
            $monthDiff = abs($meta['bulan_num'] - $norm['bulan_num']);

            // Lexicographic tie-breaker: exact/paired/similar_text dulu, baru kedekatan bulan
            if ($best === null
                || $textScore > $bestTextScore + 0.001
                || (abs($textScore - $bestTextScore) <= 0.001 && $monthDiff < $bestMonthDiff)) {
                $bestTextScore = $textScore;
                $bestMonthDiff = $monthDiff;
                $best = $meta;
            }
        }

        return $best;
    }

    private function scoreTextMatch(string $sikasClean, string $arkasRowClean, string $targetArkasClean, bool $inPairedGroup): float
    {
        $score = 0.0;

        if ($targetArkasClean !== '' && ($arkasRowClean === $targetArkasClean || $sikasClean === $targetArkasClean)) {
            $score += 1000.0;
        }

        if ($inPairedGroup) {
            $score += 300.0;
        }

        $percent = 0.0;
        if ($sikasClean !== '' && $targetArkasClean !== '') {
            similar_text($sikasClean, $targetArkasClean, $percent);
        }

        return $score + $percent;
    }

    /**
     * @param  array<string, array<int, array<string, mixed>>>  $rowBuckets
     * @param  array<int, bool>  $claimedRowIds
     * @param  array<string, mixed>  $norm
     * @return array<int, array<string, mixed>>
     */
    private function filterCandidates(
        array $rowBuckets,
        array $claimedRowIds,
        array $norm,
        bool $sameMonth,
        bool $sameTahap = false
    ): array {
        $bucketKey = $norm['kode_kegiatan_norm'].'|'.$norm['kode_rekening_norm'];
        $bucket = $rowBuckets[$bucketKey] ?? [];
        if (empty($bucket)) {
            return [];
        }

        $normIsTahap2 = (int) $norm['bulan_num'] >= 7;
        $result = [];
        foreach ($bucket as $meta) {
            if (isset($claimedRowIds[$meta['id']])) {
                continue;
            }
            if ($sameMonth && $meta['bulan_clean'] !== $norm['bulan_clean']) {
                continue;
            }
            if ($sameTahap && (((int) $meta['bulan_num'] >= 7) !== $normIsTahap2)) {
                continue;
            }
            if (abs($meta['harga_satuan'] - $norm['harga_satuan']) >= 0.01) {
                continue;
            }
            if ($meta['satuan_clean'] !== $norm['satuan_clean']) {
                continue;
            }

            $result[] = $meta;
        }

        return $result;
    }

    /**
     * @param  array<int, array<string, mixed>>  $normalizedItems
     * @param  array<int, bool>  $handledItemIndices
     * @param  array<string, array<int, array<string, mixed>>>  $rowBuckets
     * @param  array<int, bool>  $claimedRowIds
     * @param  array<int, bool>  $bkuConflictItemIndices
     * @return array<int, array<string, mixed>>
     */
    private function collectUnmatchedArkas(
        array $normalizedItems,
        array $handledItemIndices,
        array $rowBuckets,
        array $claimedRowIds,
        array $bkuConflictItemIndices = []
    ): array {
        $unmatched = [];

        foreach ($normalizedItems as $idx => $norm) {
            if (isset($handledItemIndices[$idx])) {
                continue;
            }

            $reason = isset($bkuConflictItemIndices[$idx])
                ? 'Konflik dengan baris SIKAS yang sudah terpakai di BKU (volume di bawah BKU, harga satuan berbeda, atau pindah bulan)'
                : $this->explainUnmatchedArkas($norm, $rowBuckets, $claimedRowIds);

            $unmatched[] = [
                'kode_kegiatan' => $norm['kode_kegiatan'],
                'kode_rekening' => $norm['kode_rekening'],
                'bulan' => $norm['bulan'],
                'uraian' => $norm['uraian'],
                'volume' => $norm['volume'],
                'satuan' => $norm['satuan'],
                'harga_satuan' => $norm['harga_satuan'],
                'total' => $norm['total'],
                'reason' => $reason,
            ];
        }

        return $unmatched;
    }

    /**
     * @param  array<string, mixed>  $norm
     * @param  array<string, array<int, array<string, mixed>>>  $rowBuckets
     * @param  array<int, bool>  $claimedRowIds
     */
    private function explainUnmatchedArkas(array $norm, array $rowBuckets, array $claimedRowIds): string
    {
        if ($norm['kegiatan_id'] === null || $norm['rekening_id'] === null) {
            return 'Referensi kode kegiatan atau kode rekening belum terdaftar di SIKAS';
        }

        $bucketKey = $norm['kode_kegiatan_norm'].'|'.$norm['kode_rekening_norm'];
        $sameKeyAll = $rowBuckets[$bucketKey] ?? [];

        if (empty($sameKeyAll)) {
            return 'Kode kegiatan / rekening belanja tidak ditemukan di RKAS SIKAS';
        }

        $unclaimedSameKey = array_filter($sameKeyAll, fn (array $m) => ! isset($claimedRowIds[$m['id']]));
        if (empty($unclaimedSameKey)) {
            return 'Seluruh baris SIKAS pada kegiatan & rekening ini sudah dipasangkan ke item ARKAS lain';
        }

        $sameHarga = array_filter($unclaimedSameKey, fn (array $m) => abs($m['harga_satuan'] - $norm['harga_satuan']) < 0.01);
        if (empty($sameHarga)) {
            return 'Harga satuan tidak cocok dengan baris SIKAS pada kegiatan & rekening ini';
        }

        $sameSatuan = array_filter($sameHarga, fn (array $m) => $m['satuan_clean'] === $norm['satuan_clean']);
        if (empty($sameSatuan)) {
            return 'Satuan tidak cocok dengan baris SIKAS pada kegiatan & rekening ini';
        }

        return 'Jumlah/volume satuan tidak cocok dengan baris SIKAS pada kegiatan & rekening ini';
    }

    /**
     * Mode C (RKAS Perubahan: $minBulan = 7) & Mode D (RKAS Awal: $minBulan = 1):
     * - Pass A: Sesuaikan baris yang pindah bulan / berubah volume / ganti satuan / ganti harga
     *   mengikuti ARKAS sambil TETAP mempertahankan uraian SIKAS asli (dengan proteksi berbasis volume BKU).
     * - Pass B: Tambahkan item baru / pecahan bulan yang ada di ARKAS (mewarisi uraian SIKAS jika cocok;
     *   melewati item yang berkonflik dengan baris SIKAS ber-BKU agar tidak terjadi duplikasi anggaran).
     * - Pass C: Hapus baris SIKAS yang dibatalkan di ARKAS apabila belum dipakai di BKU.
     *
     * @param  class-string  $rkasModelClass
     * @param  array<int, array<string, mixed>>  $normalizedItems
     * @param  array<int, array<string, mixed>>  $rowMeta
     * @param  array<string, array<int, array<string, mixed>>>  $rowBuckets
     * @param  array<int, bool>  $claimedRowIds
     * @param  array<int, bool>  $handledItemIndices
     * @param  array<int, bool>  $protectedIdSet
     * @param  array<int, float>  $spentVolumeMap
     * @param  array<int, bool>  $deletedRowIds
     * @param  array<int, string>  $pairedUraianById
     * @param  array<string, string>  $sikasUraianByArkasKey
     * @param  array<int, float>  $simulatedRowTotals
     * @param  array{will_update: array<int, array<string, mixed>>, will_insert: array<int, array<string, mixed>>, will_delete: array<int, array<string, mixed>>, protected_bku: array<int, array<string, mixed>>, protected_tahap1: array<int, array<string, mixed>>}  $previewChanges
     * @param  array<int, bool>  $bkuConflictItemIndices
     * @return array{updated_perubahan: int, inserted: int, deleted_perubahan: int, inserted_rp: float}
     */
    private function runReconcilePasses(
        string $rkasModelClass,
        string $penganggaranFk,
        int $penganggaranId,
        array $normalizedItems,
        array $rowMeta,
        array $rowBuckets,
        array &$claimedRowIds,
        array &$handledItemIndices,
        array $protectedIdSet,
        array $spentVolumeMap,
        array &$deletedRowIds,
        int &$matchedRowCount,
        int &$crossMonthMatchedCount,
        int $minBulan,
        bool $dryRun,
        array &$pairedUraianById,
        array &$sikasUraianByArkasKey,
        array &$simulatedRowTotals,
        array &$previewChanges,
        array &$bkuConflictItemIndices
    ): array {
        $updatedCount = 0;
        $insertedCount = 0;
        $deletedCount = 0;
        $insertedRp = 0.0;

        $applyReconcileUpdate = function (array $meta, array $norm, int $idx) use (
            &$claimedRowIds,
            &$handledItemIndices,
            &$updatedCount,
            &$matchedRowCount,
            &$crossMonthMatchedCount,
            &$pairedUraianById,
            &$sikasUraianByArkasKey,
            &$simulatedRowTotals,
            &$previewChanges,
            $dryRun
        ): void {
            /** @var Model $row */
            $row = $meta['row'];
            $claimedRowIds[$meta['id']] = true;
            $handledItemIndices[$idx] = true;

            $updates = [
                'bulan' => $norm['bulan'],
                'jumlah' => $norm['volume'],
                'harga_satuan' => $norm['harga_satuan'],
            ];
            if ($norm['satuan'] !== '') {
                $updates['satuan'] = $norm['satuan'];
            }
            if ($norm['uraian'] !== '') {
                $updates['uraian_arkas'] = $norm['uraian'];
                $pairedUraianById[$meta['id']] = $norm['uraian'];
                $inheritKey = $this->makeArkasInheritKey($norm['kode_kegiatan_norm'], $norm['kode_rekening_norm'], $norm['uraian_clean'], $norm['harga_satuan']);
                if (! isset($sikasUraianByArkasKey[$inheritKey]) && $meta['uraian'] !== '') {
                    $sikasUraianByArkasKey[$inheritKey] = $meta['uraian'];
                }
            }
            if ($norm['id_barang_arkas'] !== null) {
                $updates['id_barang_arkas'] = $norm['id_barang_arkas'];
            }

            if (! $dryRun) {
                $row->update($updates);
            }
            $simulatedRowTotals[$meta['id']] = $norm['total'];
            $previewChanges['will_update'][] = $this->buildPreviewUpdateEntry($meta, $norm);
            $updatedCount++;
            $matchedRowCount++;
            if ($meta['bulan_clean'] !== $norm['bulan_clean']) {
                $crossMonthMatchedCount++;
            }
        };

        $findReconcileCandidates = function (array $norm) use ($rowBuckets, &$claimedRowIds, $protectedIdSet, $spentVolumeMap, $minBulan): array {
            $bucketKey = $norm['kode_kegiatan_norm'].'|'.$norm['kode_rekening_norm'];
            $bucket = $rowBuckets[$bucketKey] ?? [];
            if (empty($bucket)) {
                return [];
            }

            $candidates = [];
            foreach ($bucket as $meta) {
                if (isset($claimedRowIds[$meta['id']])) {
                    continue;
                }
                if ((int) $meta['bulan_num'] < $minBulan) {
                    continue;
                }
                // Proteksi cerdas baris yang sudah dipakai di BKU:
                // dilarang geser bulan, dilarang ubah harga satuan, dan volume tidak boleh turun di bawah batas aman BKU
                if (isset($protectedIdSet[$meta['id']])) {
                    $minAllowedVol = isset($spentVolumeMap[$meta['id']])
                        ? $spentVolumeMap[$meta['id']]
                        : $meta['volume'];
                    if ($meta['bulan_clean'] !== $norm['bulan_clean']
                        || $norm['volume'] < ($minAllowedVol - 0.001)
                        || abs($meta['harga_satuan'] - $norm['harga_satuan']) >= 0.01) {
                        continue;
                    }
                }
                $candidates[] = $meta;
            }

            return $candidates;
        };

        // Pass A1: Cocok kegiatan + rekening + uraian (SIKAS/ARKAS) + harga satuan (beda bulan / volume / satuan)
        foreach ($normalizedItems as $idx => $norm) {
            if (isset($handledItemIndices[$idx]) || (int) $norm['bulan_num'] < $minBulan) {
                continue;
            }

            $candidates = array_values(array_filter(
                $findReconcileCandidates($norm),
                fn (array $meta) => $this->matchesMetaUraian($meta, $norm['uraian_clean'])
                    && abs($meta['harga_satuan'] - $norm['harga_satuan']) < 0.01
            ));

            if (empty($candidates)) {
                continue;
            }

            usort($candidates, function (array $a, array $b) use ($norm) {
                $sameMonthA = $a['bulan_clean'] === $norm['bulan_clean'] ? 0 : 1;
                $sameMonthB = $b['bulan_clean'] === $norm['bulan_clean'] ? 0 : 1;
                if ($sameMonthA !== $sameMonthB) {
                    return $sameMonthA <=> $sameMonthB;
                }
                $sameVolA = $this->isSameVolume($a['volume'], $norm['volume']) ? 0 : 1;
                $sameVolB = $this->isSameVolume($b['volume'], $norm['volume']) ? 0 : 1;
                if ($sameVolA !== $sameVolB) {
                    return $sameVolA <=> $sameVolB;
                }

                return abs($a['bulan_num'] - $norm['bulan_num']) <=> abs($b['bulan_num'] - $norm['bulan_num']);
            });

            $applyReconcileUpdate($candidates[0], $norm, $idx);
        }

        // Pass A2: Cocok kegiatan + rekening + harga satuan + volume sama (mis. judul buku sedikit berubah + pindah bulan + ganti satuan)
        foreach ($normalizedItems as $idx => $norm) {
            if (isset($handledItemIndices[$idx]) || (int) $norm['bulan_num'] < $minBulan) {
                continue;
            }

            $candidates = array_values(array_filter(
                $findReconcileCandidates($norm),
                fn (array $meta) => abs($meta['harga_satuan'] - $norm['harga_satuan']) < 0.01
                    && $this->isSameVolume($meta['volume'], $norm['volume'])
            ));

            if (empty($candidates)) {
                continue;
            }

            usort($candidates, function (array $a, array $b) use ($norm) {
                $simA = 0.0;
                $simB = 0.0;
                similar_text($a['uraian_clean'], $norm['uraian_clean'], $simA);
                similar_text($b['uraian_clean'], $norm['uraian_clean'], $simB);
                if (abs($simA - $simB) > 0.01) {
                    return $simB <=> $simA;
                }

                return abs($a['bulan_num'] - $norm['bulan_num']) <=> abs($b['bulan_num'] - $norm['bulan_num']);
            });

            $applyReconcileUpdate($candidates[0], $norm, $idx);
        }

        // Pass A3: Cocok kegiatan + rekening + uraian sama (meski harga satuan & bulan/volume berubah)
        foreach ($normalizedItems as $idx => $norm) {
            if (isset($handledItemIndices[$idx]) || (int) $norm['bulan_num'] < $minBulan) {
                continue;
            }

            $candidates = array_values(array_filter(
                $findReconcileCandidates($norm),
                fn (array $meta) => $this->matchesMetaUraian($meta, $norm['uraian_clean'])
            ));

            if (empty($candidates)) {
                continue;
            }

            usort($candidates, fn (array $a, array $b) => abs($a['bulan_num'] - $norm['bulan_num']) <=> abs($b['bulan_num'] - $norm['bulan_num']));
            $applyReconcileUpdate($candidates[0], $norm, $idx);
        }

        // Pass B: Tambahkan item baru / pecahan bulan yang ada di ARKAS (jika master kegiatan & rekening terdaftar)
        foreach ($normalizedItems as $idx => $norm) {
            if (isset($handledItemIndices[$idx])) {
                continue;
            }
            if ((int) $norm['bulan_num'] < $minBulan) {
                continue;
            }
            if ($norm['kegiatan_id'] === null || $norm['rekening_id'] === null) {
                continue;
            }

            // Cegah duplikasi & pembengkakan anggaran apabila item ARKAS berkonflik dengan baris SIKAS ber-BKU
            // yang belum terpakai (mis. BKU memblokir penurunan volume di bawah BKU, perubahan harga satuan, atau pindah bulan)
            $bucketKey = $norm['kode_kegiatan_norm'].'|'.$norm['kode_rekening_norm'];
            $conflictsWithProtected = false;
            foreach ($rowBuckets[$bucketKey] ?? [] as $meta) {
                if (isset($claimedRowIds[$meta['id']]) || ! isset($protectedIdSet[$meta['id']])) {
                    continue;
                }
                if ((int) $meta['bulan_num'] < $minBulan) {
                    continue;
                }
                $sameUraian = $this->matchesMetaUraian($meta, $norm['uraian_clean']);
                $samePriceAndVol = abs($meta['harga_satuan'] - $norm['harga_satuan']) < 0.01
                    && $this->isSameVolume($meta['volume'], $norm['volume']);
                if ($sameUraian || $samePriceAndVol) {
                    $conflictsWithProtected = true;
                    break;
                }
            }
            if ($conflictsWithProtected) {
                $bkuConflictItemIndices[$idx] = true;

                continue;
            }

            $inheritKey = $this->makeArkasInheritKey($norm['kode_kegiatan_norm'], $norm['kode_rekening_norm'], $norm['uraian_clean'], $norm['harga_satuan']);
            $inheritedSikasUraian = $sikasUraianByArkasKey[$inheritKey] ?? null;
            $sikasUraian = ($inheritedSikasUraian !== null && $inheritedSikasUraian !== '')
                ? $inheritedSikasUraian
                : $norm['uraian'];

            if (! $dryRun) {
                $this->createRkasRow($rkasModelClass, $penganggaranFk, $penganggaranId, $norm, $sikasUraian, $norm['id_barang_arkas']);
            }
            $previewChanges['will_insert'][] = [
                'kode_kegiatan' => $norm['kode_kegiatan'],
                'kode_rekening' => $norm['kode_rekening'],
                'bulan' => $norm['bulan'],
                'uraian' => $sikasUraian,
                'uraian_arkas' => $norm['uraian'],
                'inherited_from_sikas' => $inheritedSikasUraian !== null && $inheritedSikasUraian !== $norm['uraian'],
                'volume' => $norm['volume'],
                'satuan' => $norm['satuan'],
                'harga_satuan' => $norm['harga_satuan'],
                'total' => $norm['total'],
            ];
            $handledItemIndices[$idx] = true;
            $insertedCount++;
            $insertedRp += $norm['total'];
        }

        // Pass C: Hapus baris SIKAS yang dibatalkan di ARKAS apabila belum dipakai di BKU
        foreach ($rowMeta as $meta) {
            if (isset($claimedRowIds[$meta['id']])) {
                continue;
            }
            if ((int) $meta['bulan_num'] < $minBulan) {
                continue;
            }
            if (isset($protectedIdSet[$meta['id']])) {
                continue;
            }

            /** @var Model $row */
            $row = $meta['row'];
            if (! $dryRun) {
                $row->delete();
            }
            unset($simulatedRowTotals[$meta['id']]);
            $previewChanges['will_delete'][] = [
                'id' => $meta['id'],
                'kode_kegiatan' => $meta['kode_kegiatan'],
                'kode_rekening' => $meta['kode_rekening'],
                'bulan' => $meta['bulan'],
                'uraian' => $meta['uraian'],
                'uraian_arkas' => $row->uraian_arkas,
                'volume' => $meta['volume'],
                'satuan' => $meta['satuan'],
                'harga_satuan' => $meta['harga_satuan'],
                'total' => $meta['total'],
            ];
            $deletedRowIds[$meta['id']] = true;
            $claimedRowIds[$meta['id']] = true;
            $deletedCount++;
        }

        return [
            'updated_perubahan' => $updatedCount,
            'inserted' => $insertedCount,
            'deleted_perubahan' => $deletedCount,
            'inserted_rp' => round($insertedRp, 2),
        ];
    }

    /**
     * @param  array<string, mixed>  $meta
     * @param  array<string, mixed>  $norm
     * @return array<string, mixed>
     */
    private function buildPreviewUpdateEntry(array $meta, array $norm): array
    {
        $changes = [];
        if ($meta['bulan_clean'] !== $norm['bulan_clean']) {
            $changes[] = 'Bulan';
        }
        if (! $this->isSameVolume($meta['volume'], $norm['volume'])) {
            $changes[] = 'Volume';
        }
        if ($norm['satuan'] !== '' && mb_strtolower(trim($meta['satuan']), 'UTF-8') !== mb_strtolower($norm['satuan'], 'UTF-8')) {
            $changes[] = 'Satuan';
        }
        if (abs($meta['harga_satuan'] - $norm['harga_satuan']) >= 0.01) {
            $changes[] = 'Harga';
        }

        return [
            'id' => $meta['id'],
            'kode_kegiatan' => $meta['kode_kegiatan'],
            'kode_rekening' => $meta['kode_rekening'],
            'uraian_sikas' => $meta['uraian'],
            'uraian_arkas' => $norm['uraian'],
            'bulan_lama' => $meta['bulan'],
            'bulan_baru' => $norm['bulan'],
            'volume_lama' => $meta['volume'],
            'volume_baru' => $norm['volume'],
            'satuan_lama' => $meta['satuan'],
            'satuan_baru' => $norm['satuan'] !== '' ? $norm['satuan'] : $meta['satuan'],
            'harga_lama' => $meta['harga_satuan'],
            'harga_baru' => $norm['harga_satuan'],
            'total_lama' => $meta['total'],
            'total_baru' => $norm['total'],
            'changes' => $changes,
        ];
    }

    private function makeArkasInheritKey(string $kodeKegNorm, string $kodeRekNorm, string $arkasUraianClean, float $hargaSatuan): string
    {
        return $kodeKegNorm.'|'.$kodeRekNorm.'|'.$arkasUraianClean.'|'.number_format($hargaSatuan, 2, '.', '');
    }

    /**
     * @param  array<int, array<string, mixed>>  $rowMeta
     * @param  array<int, bool>  $claimedRowIds
     * @param  array<int, bool>  $protectedIdSet
     * @param  array<int, bool>  $deletedRowIds
     * @param  array<int, string>  $pairedUraianById
     * @param  array<int, float>  $spentVolumeMap
     * @return array<int, array<string, mixed>>
     */
    private function collectUnpairedSikas(
        array $rowMeta,
        array $claimedRowIds,
        array $protectedIdSet = [],
        array $deletedRowIds = [],
        array $pairedUraianById = [],
        array $spentVolumeMap = [],
        string $reconcileMode = 'match_only'
    ): array {
        $unpaired = [];
        $bkuScopeLabel = $reconcileMode === 'perubahan_reconcile' ? 'BKU Tahap 2' : 'BKU';

        foreach ($rowMeta as $meta) {
            if (isset($deletedRowIds[$meta['id']])) {
                continue;
            }

            /** @var Model $row */
            $row = $meta['row'];
            $effectiveArkasUraian = $pairedUraianById[$meta['id']] ?? trim((string) ($row->uraian_arkas ?? ''));
            $hasArkasUraian = $effectiveArkasUraian !== '';
            $isClaimed = isset($claimedRowIds[$meta['id']]);
            $isProtected = isset($protectedIdSet[$meta['id']]);
            $isTahap1Protected = $reconcileMode === 'perubahan_reconcile' && (int) $meta['bulan_num'] > 0 && (int) $meta['bulan_num'] < 7;
            $spentVolume = $spentVolumeMap[$meta['id']] ?? 0.0;
            $spentNote = $spentVolume > 0.0001
                ? " (terpakai {$spentVolume} {$meta['satuan']} di {$bkuScopeLabel})"
                : " di {$bkuScopeLabel}";

            if (! $hasArkasUraian) {
                $unpaired[] = [
                    'id' => $meta['id'],
                    'kode_kegiatan' => $meta['kode_kegiatan'],
                    'kode_rekening' => $meta['kode_rekening'],
                    'bulan' => $meta['bulan'],
                    'uraian' => $meta['uraian'],
                    'uraian_arkas' => null,
                    'volume' => $meta['volume'],
                    'spent_volume' => $spentVolume,
                    'is_protected' => $isProtected,
                    'is_tahap1_protected' => $isTahap1Protected,
                    'satuan' => $meta['satuan'],
                    'harga_satuan' => $meta['harga_satuan'],
                    'total' => $meta['total'],
                    'status' => 'belum_disandingkan',
                    'keterangan' => $isProtected
                        ? "Sudah digunakan{$spentNote} — dilindungi dari penghapusan/perubahan otomatis"
                        : ($isTahap1Protected
                            ? 'Baris Tahap 1 (Januari–Juni) dilindungi dari perubahan/penghapusan otomatis pada RKAS Perubahan'
                            : 'Belum memiliki Uraian Arkas dan belum cocok dengan data ARKAS'),
                ];
            } elseif (! $isClaimed) {
                $unpaired[] = [
                    'id' => $meta['id'],
                    'kode_kegiatan' => $meta['kode_kegiatan'],
                    'kode_rekening' => $meta['kode_rekening'],
                    'bulan' => $meta['bulan'],
                    'uraian' => $meta['uraian'],
                    'uraian_arkas' => $effectiveArkasUraian,
                    'volume' => $meta['volume'],
                    'spent_volume' => $spentVolume,
                    'is_protected' => $isProtected,
                    'is_tahap1_protected' => $isTahap1Protected,
                    'satuan' => $meta['satuan'],
                    'harga_satuan' => $meta['harga_satuan'],
                    'total' => $meta['total'],
                    'status' => 'tidak_ada_di_arkas',
                    'keterangan' => $isProtected
                        ? "Sudah digunakan{$spentNote} — tidak diubah/dihapus otomatis meskipun berbeda dengan ARKAS"
                        : ($isTahap1Protected
                            ? 'Baris Tahap 1 (Januari–Juni) tidak diubah/dihapus otomatis meskipun berbeda dengan ARKAS Perubahan'
                            : 'Tidak ditemukan pasangan cocok di ARKAS (kemungkinan baris berlebih atau volume/satuan/harga berbeda)'),
                ];
            }
        }

        return $unpaired;
    }

    /**
     * @param  Collection<int, Model>  $existingRows
     * @return array<int, array<string, mixed>>
     */
    private function buildRowMetadata(Collection $existingRows): array
    {
        $list = [];

        foreach ($existingRows as $row) {
            $kodeKeg = trim((string) ($row->kodeKegiatan?->kode ?? ''));
            $kodeKegNorm = $this->normalizeKodeKegiatan($kodeKeg);
            if ($kodeKegNorm === '') {
                $kodeKegNorm = 'id:'.$row->kode_id;
            }

            $kodeRek = trim((string) ($row->rekeningBelanja?->kode_rekening ?? ''));
            $kodeRekNorm = $kodeRek !== '' ? $kodeRek : 'id:'.$row->kode_rekening_id;

            $bulan = trim((string) ($row->bulan ?? ''));
            $bulanClean = mb_strtolower($bulan, 'UTF-8');
            $volume = (float) ($row->jumlah ?? 0);
            $harga = (float) ($row->harga_satuan ?? 0);

            $list[] = [
                'id' => (int) $row->id,
                'row' => $row,
                'kode_kegiatan' => $kodeKeg,
                'kode_kegiatan_norm' => $kodeKegNorm,
                'kode_rekening' => $kodeRek,
                'kode_rekening_norm' => $kodeRekNorm,
                'bulan' => $bulan,
                'bulan_clean' => $bulanClean,
                'bulan_num' => self::MONTH_ORDER[$bulanClean] ?? 0,
                'uraian' => (string) ($row->uraian ?? ''),
                'uraian_clean' => mb_strtolower(trim((string) ($row->uraian ?? '')), 'UTF-8'),
                'uraian_arkas_clean' => mb_strtolower(trim((string) ($row->uraian_arkas ?? '')), 'UTF-8'),
                'volume' => $volume,
                'satuan' => (string) ($row->satuan ?? ''),
                'satuan_clean' => $this->normalizeSatuan((string) ($row->satuan ?? '')),
                'harga_satuan' => $harga,
                'total' => round($volume * $harga, 2),
            ];
        }

        return $list;
    }

    /**
     * Kelompokkan metadata baris SIKAS berdasarkan `kode_kegiatan_norm|kode_rekening_norm` untuk lookup O(1).
     *
     * @param  array<int, array<string, mixed>>  $rowMeta
     * @return array<string, array<int, array<string, mixed>>>
     */
    private function bucketRowsByKey(array $rowMeta): array
    {
        $buckets = [];
        foreach ($rowMeta as $meta) {
            $key = $meta['kode_kegiatan_norm'].'|'.$meta['kode_rekening_norm'];
            $buckets[$key][] = $meta;
        }

        return $buckets;
    }

    /**
     * @param  array<int, array<string, mixed>>  $rowMeta
     * @return array<string, array<string, bool>>
     */
    private function seedPairedUraianGroups(array $rowMeta): array
    {
        $groups = [];

        foreach ($rowMeta as $meta) {
            if ($meta['uraian_arkas_clean'] !== '') {
                $groupKey = $this->makeGroupKey($meta['kode_kegiatan_norm'], $meta['kode_rekening_norm'], $meta['uraian_arkas_clean']);
                $groups[$groupKey][$meta['uraian_clean']] = true;
            }
        }

        return $groups;
    }

    /**
     * @param  array<string, mixed>  $extraUpdates
     */
    private function persistRowPairing(Model $row, string $uraianArkas, ?string $idBarangArkas, array $extraUpdates = []): void
    {
        $updates = $extraUpdates;

        if ($uraianArkas !== '') {
            $uraianArkasChanged = trim((string) ($row->uraian_arkas ?? '')) !== $uraianArkas;
            if ($uraianArkasChanged) {
                $updates['uraian_arkas'] = $uraianArkas;
                $updates['id_barang_arkas'] = $idBarangArkas;
            } elseif (empty($row->id_barang_arkas) && ! empty($idBarangArkas)) {
                $updates['id_barang_arkas'] = $idBarangArkas;
            }
        }

        if (! empty($updates)) {
            $row->update($updates);
        }
    }

    /**
     * @param  class-string  $rkasModelClass
     * @param  array<string, mixed>  $norm
     */
    private function createRkasRow(
        string $rkasModelClass,
        string $penganggaranFk,
        int $penganggaranId,
        array $norm,
        string $sikasUraian,
        ?string $idBarangArkas
    ): void {
        $rkasModelClass::create([
            $penganggaranFk => $penganggaranId,
            'kode_id' => $norm['kegiatan_id'],
            'kode_rekening_id' => $norm['rekening_id'],
            'uraian' => $sikasUraian,
            'uraian_arkas' => $norm['uraian'],
            'id_barang_arkas' => $idBarangArkas,
            'harga_satuan' => $norm['harga_satuan'],
            'bulan' => $norm['bulan'],
            'jumlah' => $norm['volume'],
            'satuan' => $norm['satuan'],
        ]);
    }

    private function normalizeKodeKegiatan(string $kode): string
    {
        return rtrim(trim($kode), '.');
    }

    private function normalizeSatuan(string $satuan): string
    {
        $clean = mb_strtolower(trim($satuan), 'UTF-8');

        return self::SATUAN_SYNONYMS[$clean] ?? $clean;
    }

    private function makeGroupKey(string $kodeKegiatanNorm, string $kodeRekeningNorm, string $arkasUraianClean): string
    {
        return $kodeKegiatanNorm.'|'.$kodeRekeningNorm.'|'.$arkasUraianClean;
    }

    private function isSameVolume(float $a, float $b): bool
    {
        return abs($a - $b) < 0.001;
    }

    /**
     * @param  array<string, mixed>  $meta
     */
    private function matchesMetaUraian(array $meta, string $arkasUraianClean): bool
    {
        if ($arkasUraianClean === '') {
            return false;
        }

        if ($meta['uraian_arkas_clean'] !== '' && $meta['uraian_arkas_clean'] === $arkasUraianClean) {
            return true;
        }

        return $meta['uraian_clean'] !== '' && $meta['uraian_clean'] === $arkasUraianClean;
    }

    /**
     * @param  array<string, mixed>  $item
     * @param  array<string, int>  $kegiatanMap
     * @param  Collection<string, RekeningBelanja>  $rekenings
     * @param  array{with_satuan: array<string, string>, without_satuan: array<string, string>}  $refBarangMaps
     * @return array<string, mixed>
     */
    private function normalizeArkasItem(array $item, array $kegiatanMap, Collection $rekenings, array $refBarangMaps): array
    {
        $rawKodeKeg = trim((string) ($item['kode_kegiatan'] ?? ''));
        $kodeKegNorm = $this->normalizeKodeKegiatan($rawKodeKeg);
        $kodeKegDot = $kodeKegNorm !== '' ? $kodeKegNorm.'.' : '';
        $kegiatanId = $kegiatanMap[$kodeKegDot] ?? $kegiatanMap[$kodeKegNorm] ?? null;

        $kodeRekening = trim((string) ($item['kode_rekening'] ?? ''));
        $rekeningId = isset($rekenings[$kodeRekening]) ? (int) $rekenings[$kodeRekening]->id : null;

        $uraian = trim((string) ($item['uraian'] ?? ''));
        $uraianClean = mb_strtolower($uraian, 'UTF-8');
        $satuan = trim((string) ($item['satuan'] ?? ''));
        $satuanClean = $this->normalizeSatuan($satuan);
        $bulanRaw = trim((string) ($item['bulan'] ?? 'Januari'));
        $bulanClean = mb_strtolower($bulanRaw, 'UTF-8');
        $bulan = isset(self::MONTH_ORDER[$bulanClean]) ? ucfirst($bulanClean) : $bulanRaw;
        $volume = (float) ($item['volume'] ?? 0);
        $hargaSatuan = (float) ($item['harga_satuan'] ?? 0);

        $idBarangArkas = $refBarangMaps['with_satuan'][$kodeRekening.'|'.$uraianClean.'|'.$satuanClean]
            ?? $refBarangMaps['without_satuan'][$kodeRekening.'|'.$uraianClean]
            ?? null;

        return [
            'kode_kegiatan' => $rawKodeKeg,
            'kode_kegiatan_norm' => $kodeKegNorm,
            'kegiatan_id' => $kegiatanId !== null ? (int) $kegiatanId : null,
            'rekening_id' => $rekeningId,
            'kode_rekening' => $kodeRekening,
            'kode_rekening_norm' => $kodeRekening,
            'uraian' => $uraian,
            'uraian_clean' => $uraianClean,
            'harga_satuan' => $hargaSatuan,
            'bulan' => $bulan,
            'bulan_clean' => $bulanClean,
            'bulan_num' => self::MONTH_ORDER[$bulanClean] ?? 0,
            'volume' => $volume,
            'satuan' => $satuan,
            'satuan_clean' => $satuanClean,
            'total' => round($volume * $hargaSatuan, 2),
            'id_barang_arkas' => $idBarangArkas,
        ];
    }

    /**
     * Preload peta ref_barangs untuk tahun & daftar kode rekening pada tarikan ARKAS agar resolve id_barang_arkas O(1).
     *
     * @param  array<int, array<string, mixed>>  $arkasItems
     * @return array{with_satuan: array<string, string>, without_satuan: array<string, string>}
     */
    private function buildRefBarangLookup(int $tahun, array $arkasItems): array
    {
        $kodeRekenings = array_values(array_unique(array_filter(
            array_map(fn ($i) => trim((string) ($i['kode_rekening'] ?? '')), $arkasItems)
        )));

        $withSatuan = [];
        $withoutSatuan = [];

        if (empty($kodeRekenings)) {
            return ['with_satuan' => $withSatuan, 'without_satuan' => $withoutSatuan];
        }

        $rows = RefBarang::where('tahun', $tahun)
            ->whereIn('kode_rekening', $kodeRekenings)
            ->get(['id_barang', 'nama_barang', 'kode_rekening', 'satuan']);

        foreach ($rows as $row) {
            $kodeRek = trim((string) $row->kode_rekening);
            $namaClean = mb_strtolower(trim((string) $row->nama_barang), 'UTF-8');
            $satuanClean = $this->normalizeSatuan((string) ($row->satuan ?? ''));

            if ($namaClean === '') {
                continue;
            }

            $keyWithSatuan = $kodeRek.'|'.$namaClean.'|'.$satuanClean;
            $keyWithoutSatuan = $kodeRek.'|'.$namaClean;

            if (! isset($withSatuan[$keyWithSatuan])) {
                $withSatuan[$keyWithSatuan] = $row->id_barang;
            }
            if (! isset($withoutSatuan[$keyWithoutSatuan])) {
                $withoutSatuan[$keyWithoutSatuan] = $row->id_barang;
            }
        }

        return [
            'with_satuan' => $withSatuan,
            'without_satuan' => $withoutSatuan,
        ];
    }
}
