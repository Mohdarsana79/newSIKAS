<?php

namespace App\Services;

use App\Config\VariantConfig;
use App\Models\KwitansiTemplate;
use App\Models\SekolahProfile;
use App\Models\SpjExternalAttachment;
use App\Models\SpjPrintPreset;
use App\Models\SpjTemplate;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;

class SpjPrintManifestService
{
    public const ALLOWED_PERIODES = ['tahap_1', 'tahap_2', 'bulan', 'rentang_bulan', 'tahunan'];

    public const ALLOWED_PAPER_SIZES = ['A4', 'F4', 'Legal', 'Letter'];

    public const ALLOWED_GROUPING_MODES = ['per_jenis', 'per_bulan'];

    public const ALLOWED_SP2B_MODES = ['tahap', 'bulan'];

    private const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

    private const ALLOWED_IMAGE_MIMES = [
        'image/png',
        'image/jpeg',
        'image/webp',
    ];

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

    public function __construct(private readonly SpjTemplateService $spjTemplateService) {}

    /**
     * Membangun manifest lengkap Cetak SPJ untuk varian, tahun, periode, ukuran kertas, dan mode susun.
     *
     * @return array<string, mixed>
     */
    public function buildManifest(
        string $variant,
        ?int $tahun = null,
        string $periodeType = 'tahap_1',
        ?int $bulanAwal = null,
        ?int $bulanAkhir = null,
        string $paperSize = 'F4',
        string $groupingMode = 'per_jenis',
        ?string $sp2bMode = null,
    ): array {
        $resolvedVariant = VariantConfig::isValid($variant) ? $variant : VariantConfig::REGULER;
        $isSilpa = in_array($resolvedVariant, [VariantConfig::SILPA, VariantConfig::KINERJA_SILPA], true);

        $resolvedPeriode = in_array($periodeType, self::ALLOWED_PERIODES, true)
            ? $periodeType
            : ($isSilpa ? 'tahunan' : 'tahap_1');

        $resolvedPaper = in_array($paperSize, self::ALLOWED_PAPER_SIZES, true) ? $paperSize : 'F4';
        $resolvedGrouping = in_array($groupingMode, self::ALLOWED_GROUPING_MODES, true) ? $groupingMode : 'per_jenis';

        $penganggaranClass = VariantConfig::getModelClass('penganggaran', $resolvedVariant);

        $availableYears = $penganggaranClass::query()
            ->orderByDesc('tahun_anggaran')
            ->toBase()
            ->pluck('tahun_anggaran')
            ->map(static fn ($y): int => (int) $y)
            ->unique()
            ->values()
            ->all();

        $resolvedTahun = ($tahun && $tahun >= 2000 && $tahun <= 2100)
            ? $tahun
            : ($availableYears[0] ?? (int) now()->year);

        $penganggaran = $penganggaranClass::query()
            ->where('tahun_anggaran', $resolvedTahun)
            ->first();

        $sekolah = $penganggaran?->sekolah ?? SekolahProfile::query()->first();

        [$startMonth, $endMonth] = $this->resolveMonthRange($resolvedPeriode, $bulanAwal, $bulanAkhir);
        $startDate = Carbon::create($resolvedTahun, $startMonth, 1)->startOfMonth()->toDateString();
        $endDate = Carbon::create($resolvedTahun, $endMonth, 1)->endOfMonth()->toDateString();
        $exclusiveEndDate = Carbon::create($resolvedTahun, $endMonth, 1)->addMonth()->startOfMonth()->toDateString();

        $months = [];
        for ($m = $startMonth; $m <= $endMonth; $m++) {
            $months[] = [
                'number' => $m,
                'name' => self::BULAN_NAMES[$m],
                'slug' => strtolower(self::BULAN_NAMES[$m]),
            ];
        }

        $periodeLabel = $this->formatPeriodeLabel($resolvedPeriode, $resolvedTahun, $startMonth, $endMonth);
        $ringkasan = $this->buildRingkasanKeuangan($resolvedVariant, $penganggaran, $resolvedPeriode, $startMonth, $endMonth, $startDate, $exclusiveEndDate);

        $customTemplates = $this->loadCustomTemplates();
        $libreOfficeAvailable = $this->spjTemplateService->isLibreOfficeAvailable();
        $preset = $this->loadPreset($resolvedVariant, $resolvedTahun);

        $requestedSp2bMode = null;
        if (is_string($sp2bMode) && in_array($sp2bMode, self::ALLOWED_SP2B_MODES, true)) {
            $requestedSp2bMode = $sp2bMode;
        } elseif ($sp2bMode === null) {
            $savedSp2bMode = $preset['bundle_config']['sp2b_mode'] ?? null;
            if (is_string($savedSp2bMode) && in_array($savedSp2bMode, self::ALLOWED_SP2B_MODES, true)) {
                $requestedSp2bMode = $savedSp2bMode;
            }
        }

        $laporanChapter = $this->buildLaporanChapter(
            $resolvedVariant,
            $penganggaran,
            $resolvedPeriode,
            $startMonth,
            $endMonth,
            $resolvedPaper,
            $customTemplates,
            $requestedSp2bMode,
        );

        $resolvedSp2bMode = 'tahap';
        foreach ($laporanChapter['items'] as $laporanItem) {
            if (($laporanItem['key'] ?? '') === 'sp2b' && isset($laporanItem['sp2b_active_mode'])) {
                $resolvedSp2bMode = (string) $laporanItem['sp2b_active_mode'];
                break;
            }
        }

        $chapters = [
            $this->buildPenganggaranChapter($resolvedVariant, $penganggaran, $resolvedPeriode, $startMonth, $endMonth, $resolvedPaper),
            $laporanChapter,
            $this->buildPenatausahaanChapter($resolvedVariant, $penganggaran, $resolvedTahun, $resolvedPeriode, $months, $resolvedPaper, $resolvedGrouping),
            $this->buildBuktiTransaksiChapter($resolvedVariant, $penganggaran, $resolvedTahun, $months, $startDate, $endDate, $resolvedPaper, $customTemplates),
        ];

        $externalAttachments = $this->loadExternalAttachments($resolvedVariant, $resolvedTahun, $resolvedPeriode);
        $chapters[] = $this->buildLampiranEksternalChapter($externalAttachments);

        $readinessSummary = $this->computeReadinessSummary($chapters);

        return [
            'meta' => [
                'variant' => $resolvedVariant,
                'variant_label' => VariantConfig::title($resolvedVariant),
                'is_silpa' => $isSilpa,
                'tahun' => $resolvedTahun,
                'penganggaran_id' => $penganggaran?->id,
                'has_penganggaran' => $penganggaran !== null,
                'periode_type' => $resolvedPeriode,
                'periode_label' => $periodeLabel,
                'bulan_awal' => $startMonth,
                'bulan_akhir' => $endMonth,
                'start_date' => $startDate,
                'end_date' => $endDate,
                'months' => $months,
                'available_years' => $availableYears,
                'paper_size' => $resolvedPaper,
                'grouping_mode' => $resolvedGrouping,
                'sp2b_mode' => $resolvedSp2bMode,
                'libreoffice_available' => $libreOfficeAvailable,
                'generated_at_formatted' => Carbon::now()->locale('id')->translatedFormat('d F Y'),
            ],
            'sekolah' => $this->buildSekolahPayload($sekolah),
            'penanggung_jawab' => [
                'kepala_sekolah' => (string) ($penganggaran?->kepala_sekolah ?? $sekolah?->kepala_sekolah ?? ''),
                'nip_kepala_sekolah' => (string) ($penganggaran?->nip_kepala_sekolah ?? $sekolah?->nip_kepala_sekolah ?? ''),
                'bendahara' => (string) ($penganggaran?->bendahara ?? ''),
                'nip_bendahara' => (string) ($penganggaran?->nip_bendahara ?? ''),
                'komite' => (string) ($penganggaran?->komite ?? ''),
            ],
            'ringkasan_keuangan' => $ringkasan,
            'preset' => $preset,
            'chapters' => $chapters,
            'external_attachments' => $externalAttachments,
            'readiness_summary' => $readinessSummary,
        ];
    }

    /**
     * @return array{0: int, 1: int}
     */
    private function resolveMonthRange(string $periodeType, ?int $bulanAwal, ?int $bulanAkhir): array
    {
        return match ($periodeType) {
            'tahap_1' => [1, 6],
            'tahap_2' => [7, 12],
            'bulan' => [
                $m = max(1, min(12, $bulanAwal ?? 1)),
                $m,
            ],
            'rentang_bulan' => [
                $start = max(1, min(12, $bulanAwal ?? 1)),
                max($start, min(12, $bulanAkhir ?? $start)),
            ],
            default => [1, 12],
        };
    }

    private function formatPeriodeLabel(string $periodeType, int $tahun, int $startMonth, int $endMonth): string
    {
        return match ($periodeType) {
            'tahap_1' => "Tahap I (Januari – Juni {$tahun})",
            'tahap_2' => "Tahap II (Juli – Desember {$tahun})",
            'bulan' => sprintf('Bulan %s %d', self::BULAN_NAMES[$startMonth], $tahun),
            'rentang_bulan' => $startMonth === $endMonth
                ? sprintf('Bulan %s %d', self::BULAN_NAMES[$startMonth], $tahun)
                : sprintf('%s – %s %d', self::BULAN_NAMES[$startMonth], self::BULAN_NAMES[$endMonth], $tahun),
            default => "Tahun Anggaran {$tahun}",
        };
    }

    /**
     * @return array<string, mixed>
     */
    private function buildSekolahPayload(?SekolahProfile $sekolah): array
    {
        $alamatParts = array_values(array_filter([
            trim((string) ($sekolah?->alamat ?? '')),
            trim((string) ($sekolah?->kelurahan_desa ?? '')),
            trim((string) ($sekolah?->kecamatan ?? '')),
            trim((string) ($sekolah?->kabupaten_kota ?? '')),
            trim((string) ($sekolah?->provinsi ?? '')),
        ], static fn (string $v): bool => $v !== ''));

        return [
            'nama_sekolah' => (string) ($sekolah?->nama_sekolah ?? 'Nama Sekolah Belum Diatur'),
            'npsn' => (string) ($sekolah?->npsn ?? ''),
            'status_sekolah' => (string) ($sekolah?->status_sekolah ?? ''),
            'jenjang_sekolah' => (string) ($sekolah?->jenjang_sekolah ?? ''),
            'alamat_lengkap' => implode(', ', $alamatParts),
            'kelurahan_desa' => (string) ($sekolah?->kelurahan_desa ?? ''),
            'kecamatan' => (string) ($sekolah?->kecamatan ?? ''),
            'kabupaten_kota' => (string) ($sekolah?->kabupaten_kota ?? ''),
            'provinsi' => (string) ($sekolah?->provinsi ?? ''),
            'logo_daerah_data_uri' => $this->imageToDataUri($sekolah?->logo_daerah),
            'logo_sekolah_data_uri' => $this->imageToDataUri($sekolah?->logo_sekolah),
            'foto_sekolah_data_uri' => $this->imageToDataUri($sekolah?->foto_sekolah),
        ];
    }

    public function imageToDataUri(?string $relativePath): ?string
    {
        if (! is_string($relativePath) || trim($relativePath) === '') {
            return null;
        }

        $normalized = ltrim(str_replace('\\', '/', trim($relativePath)), '/');
        if (str_contains($normalized, '..')) {
            return null;
        }

        $disk = Storage::disk('public');
        if (! $disk->exists($normalized)) {
            return null;
        }

        $size = $disk->size($normalized);
        if ($size <= 0 || $size > self::MAX_IMAGE_BYTES) {
            return null;
        }

        $binary = $disk->get($normalized);
        if (! is_string($binary) || $binary === '') {
            return null;
        }

        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        $mime = $finfo ? (string) finfo_buffer($finfo, $binary) : '';
        if ($finfo) {
            finfo_close($finfo);
        }

        if (! in_array($mime, self::ALLOWED_IMAGE_MIMES, true)) {
            return null;
        }

        return 'data:'.$mime.';base64,'.base64_encode($binary);
    }

    /**
     * @return array<string, float|int>
     */
    private function buildRingkasanKeuangan(
        string $variant,
        mixed $penganggaran,
        string $periodeType,
        int $startMonth,
        int $endMonth,
        string $startDate,
        string $exclusiveEndDate,
    ): array {
        $pagu = (float) ($penganggaran?->pagu_anggaran ?? 0);
        $danaDiterima = 0.0;
        $totalRealisasi = 0.0;
        $jumlahTransaksi = 0;

        if ($penganggaran) {
            $fk = VariantConfig::penganggaranFk($variant);
            $penerimaanClass = VariantConfig::getModelClass('penerimaan_dana', $variant);
            $bkuClass = VariantConfig::getModelClass('bku', $variant);

            $penerimaanRows = $penerimaanClass::query()
                ->where($fk, $penganggaran->id)
                ->toBase()
                ->get(['sumber_dana', 'tanggal_terima', 'jumlah_dana', 'saldo_awal']);

            foreach ($penerimaanRows as $row) {
                $nominal = (float) ($row->jumlah_dana ?? 0) + (float) ($row->saldo_awal ?? 0);
                if ($nominal <= 0) {
                    continue;
                }
                if ($this->matchesPenerimaanPeriode($row, $periodeType, $startMonth, $endMonth)) {
                    $danaDiterima += $nominal;
                }
            }

            $bkuAgg = $bkuClass::query()
                ->where($fk, $penganggaran->id)
                ->where('tanggal_transaksi', '>=', $startDate)
                ->where('tanggal_transaksi', '<', $exclusiveEndDate)
                ->where(function ($q) {
                    $q->where('is_bunga_record', false)->orWhereNull('is_bunga_record');
                })
                ->selectRaw('COALESCE(SUM(total_transaksi_kotor), 0) as total_realisasi, COUNT(*) as jumlah_transaksi')
                ->first();

            $totalRealisasi = (float) ($bkuAgg?->total_realisasi ?? 0);
            $jumlahTransaksi = (int) ($bkuAgg?->jumlah_transaksi ?? 0);
        }

        $baseDana = $danaDiterima > 0 ? $danaDiterima : $pagu;
        $sisaDana = max(0.0, $baseDana - $totalRealisasi);
        $denominator = $pagu > 0 ? $pagu : $danaDiterima;
        $serapan = $denominator > 0 ? round(($totalRealisasi / $denominator) * 100, 1) : 0.0;

        return [
            'pagu_anggaran' => round($pagu, 2),
            'dana_diterima' => round($danaDiterima, 2),
            'total_realisasi' => round($totalRealisasi, 2),
            'sisa_dana' => round($sisaDana, 2),
            'persentase_serapan' => min(100.0, max(0.0, $serapan)),
            'persentase_serapan_aktual' => $serapan,
            'jumlah_transaksi' => $jumlahTransaksi,
        ];
    }

    private function matchesPenerimaanPeriode(object $row, string $periodeType, int $startMonth, int $endMonth): bool
    {
        if ($periodeType === 'tahunan') {
            return true;
        }

        $sumber = strtolower(trim((string) ($row->sumber_dana ?? '')));
        if ($periodeType === 'tahap_1' && str_contains($sumber, 'tahap 1')) {
            return true;
        }
        if ($periodeType === 'tahap_2' && str_contains($sumber, 'tahap 2')) {
            return true;
        }
        if ($periodeType === 'tahap_1' && str_contains($sumber, 'tahap 2')) {
            return false;
        }
        if ($periodeType === 'tahap_2' && str_contains($sumber, 'tahap 1')) {
            return false;
        }

        if (! empty($row->tanggal_terima)) {
            $m = (int) Carbon::parse($row->tanggal_terima)->month;

            return $m >= $startMonth && $m <= $endMonth;
        }

        return true;
    }

    /**
     * @return array<string, array<int, array{id: string, label: string, is_custom: bool, template_id: int|null}>>
     */
    private function loadCustomTemplates(): array
    {
        $result = [
            'kwitansi' => [],
            'tanda_terima' => [],
            'bast' => [],
            'surat_pesanan' => [],
            'sp2b' => [],
            'sptj' => [],
            'spmth' => [],
            'lph' => [],
        ];

        if (Schema::hasTable('kwitansi_templates')) {
            $rows = KwitansiTemplate::query()->orderBy('nama')->get(['id', 'nama']);
            foreach ($rows as $tpl) {
                $result['kwitansi'][] = [
                    'id' => 'custom:'.$tpl->id,
                    'label' => 'Template Word: '.$tpl->nama,
                    'is_custom' => true,
                    'template_id' => (int) $tpl->id,
                ];
            }
        }

        if (Schema::hasTable('spj_templates')) {
            $rows = SpjTemplate::query()->orderBy('nama')->get(['id', 'document_type', 'nama']);
            foreach ($rows as $tpl) {
                if (array_key_exists($tpl->document_type, $result)) {
                    $result[$tpl->document_type][] = [
                        'id' => 'custom:'.$tpl->id,
                        'label' => 'Template Word: '.$tpl->nama,
                        'is_custom' => true,
                        'template_id' => (int) $tpl->id,
                    ];
                }
            }
        }

        return $result;
    }

    /**
     * BAB I — Dokumen Penganggaran (RKAS Murni & RKAS Perubahan)
     *
     * @return array<string, mixed>
     */
    private function buildPenganggaranChapter(
        string $variant,
        mixed $penganggaran,
        string $periodeType,
        int $startMonth,
        int $endMonth,
        string $paperSize,
    ): array {
        $fk = VariantConfig::penganggaranFk($variant);
        $rkasClass = VariantConfig::getModelClass('rkas', $variant);
        $rkasPerubahanClass = VariantConfig::getModelClass('rkas_perubahan', $variant);

        $rkasCount = ($penganggaran && $rkasClass)
            ? $rkasClass::query()->where($fk, $penganggaran->id)->count()
            : 0;
        $perubahanCount = ($penganggaran && $rkasPerubahanClass)
            ? $rkasPerubahanClass::query()->where($fk, $penganggaran->id)->count()
            : 0;

        $tahapQuery = match ($periodeType) {
            'tahap_1' => '1',
            'tahap_2' => '2',
            default => 'tahunan',
        };

        $shortcutRkas = $penganggaran
            ? $this->variantRoute($variant, 'rkas.index', ['id' => $penganggaran->id])
            : $this->variantRoute($variant, 'penganggaran.index');

        $shortcutPerubahan = ($penganggaran && $rkasPerubahanClass)
            ? $this->variantRoute($variant, 'rkas-perubahan.index', ['id' => $penganggaran->id])
            : $shortcutRkas;

        $isTahap1Only = $periodeType === 'tahap_1';
        $isTahap2Only = $periodeType === 'tahap_2';

        // Tahap 1 = hanya opsi RKAS Murni; Tahap 2 = hanya opsi RKAS Perubahan (otomatis fallback ke Murni jika Perubahan belum ada / varian SiLPA);
        // Tahunan / Per Bulan / Rentang Bulan = tampilkan semua yang tersedia.
        $includeMurni = $penganggaran !== null
            && $rkasCount > 0
            && ($isTahap1Only || ! $isTahap2Only || $perubahanCount === 0);
        $includePerubahan = $penganggaran !== null
            && $perubahanCount > 0
            && ! $isTahap1Only;

        $defaultUsePerubahan = $includePerubahan
            && (! $includeMurni
                || in_array($periodeType, ['tahap_2', 'tahunan'], true)
                || ($startMonth >= 7 && in_array($periodeType, ['bulan', 'rentang_bulan'], true)));

        $rkasSpecs = [
            [
                'key' => 'rkas_tahapan',
                'label' => 'RKAS Tahapan',
                'orientation' => 'landscape',
                'font_size' => '10pt',
                'default_enabled' => true,
                'murni_versions' => [
                    ['id' => 'murni_tahapan', 'label' => 'RKAS Murni — RKA Tahapan', 'route' => 'rkas.export-pdf'],
                    ['id' => 'murni', 'label' => 'RKAS Murni — RKA Tahapan V.1', 'route' => 'rkas.export-tahapan-v1-pdf'],
                ],
                'perubahan_versions' => [
                    ['id' => 'perubahan', 'label' => 'RKAS Perubahan — RKA Tahapan', 'route' => 'rkas-perubahan.export-pdf'],
                    ['id' => 'perubahan_v1', 'label' => 'RKAS Perubahan — RKA Tahapan V.1', 'route' => 'rkas-perubahan.export-tahapan-v1-pdf'],
                    ['id' => 'perubahan_v2', 'label' => 'RKAS Perubahan — RKA Tahapan V.2', 'route' => 'rkas-perubahan.export-tahapan-v2-pdf'],
                ],
            ],
            ['key' => 'rkas_rekap', 'label' => 'RKAS Rekapitulasi', 'route' => 'rkas.export-rekap-pdf', 'perubahan_route' => 'rkas-perubahan.export-rekap-pdf', 'orientation' => 'portrait', 'font_size' => '11pt', 'default_enabled' => true],
            ['key' => 'rkas_lembar_kerja', 'label' => 'RKAS Lembar Kerja (2.2.1)', 'route' => 'rkas.export-lembar-kerja-pdf', 'perubahan_route' => 'rkas-perubahan.export-lembar-kerja-pdf', 'orientation' => 'portrait', 'font_size' => '10pt', 'default_enabled' => false],
            ['key' => 'rkas_bulanan', 'label' => 'RKAS Rincian Bulanan', 'route' => 'rkas.export-bulanan-pdf', 'perubahan_route' => 'rkas-perubahan.export-bulanan-pdf', 'orientation' => 'landscape', 'font_size' => '10pt', 'default_enabled' => false],
            ['key' => 'rkas_rincian', 'label' => 'RKAS Rincian Anggaran', 'route' => 'rkas.export-rincian-pdf', 'perubahan_route' => 'rkas-perubahan.export-rincian-pdf', 'orientation' => 'landscape', 'font_size' => '10pt', 'default_enabled' => false],
            ['key' => 'rkas_alur_kas', 'label' => 'Alur Kas Penganggaran', 'route' => 'rkas.export-alur-kas-pdf', 'perubahan_route' => 'rkas-perubahan.export-alur-kas-pdf', 'orientation' => 'landscape', 'font_size' => '10pt', 'default_enabled' => false],
            ['key' => 'rkas_rp', 'label' => 'Rincian Pencairan Dana', 'route' => 'rkas.export-rp-pdf', 'perubahan_route' => 'rkas-perubahan.export-rp-pdf', 'orientation' => 'landscape', 'font_size' => '10pt', 'default_enabled' => false],
        ];

        $items = [];
        foreach ($rkasSpecs as $spec) {
            $murniVersions = $spec['murni_versions'] ?? [
                ['id' => 'murni', 'label' => 'RKAS Murni', 'route' => $spec['route']],
            ];
            $perubahanVersions = $spec['perubahan_versions'] ?? [
                ['id' => 'perubahan', 'label' => 'RKAS Perubahan', 'route' => $spec['perubahan_route']],
            ];

            $templates = [];
            $urlsByTemplate = [];

            if ($includeMurni) {
                foreach ($murniVersions as $ver) {
                    $templates[] = [
                        'id' => $ver['id'],
                        'label' => $ver['label'],
                        'is_custom' => false,
                        'template_id' => null,
                    ];
                    $urlsByTemplate[$ver['id']] = $this->variantRoute($variant, $ver['route'], [
                        'id' => $penganggaran->id,
                        'paper_size' => $paperSize,
                        'orientation' => $spec['orientation'],
                        'font_size' => $spec['font_size'],
                        'tahap' => $tahapQuery,
                    ]);
                }
            }

            if ($includePerubahan) {
                foreach ($perubahanVersions as $ver) {
                    $templates[] = [
                        'id' => $ver['id'],
                        'label' => $ver['label'],
                        'is_custom' => false,
                        'template_id' => null,
                    ];
                    $urlsByTemplate[$ver['id']] = $this->variantRoute($variant, $ver['route'], [
                        'id' => $penganggaran->id,
                        'paper_size' => $paperSize,
                        'orientation' => $spec['orientation'],
                        'font_size' => $spec['font_size'],
                        'tahap' => $tahapQuery,
                    ]);
                }
            }

            if (empty($templates)) {
                $defaultMurniVer = collect($murniVersions)->firstWhere('id', 'murni') ?? $murniVersions[0];
                $templates[] = [
                    'id' => $defaultMurniVer['id'],
                    'label' => $defaultMurniVer['label'],
                    'is_custom' => false,
                    'template_id' => null,
                ];
            }

            $defaultTemplate = ($defaultUsePerubahan && isset($urlsByTemplate['perubahan']))
                ? 'perubahan'
                : (isset($urlsByTemplate['murni']) ? 'murni' : ($templates[0]['id'] ?? 'murni'));
            $hasData = ! empty($urlsByTemplate);

            $chunks = [];
            if ($hasData) {
                $defaultUrl = $urlsByTemplate[$defaultTemplate] ?? reset($urlsByTemplate);
                $chunks[] = [
                    'id' => $spec['key'],
                    'label' => $spec['label'],
                    'url' => $defaultUrl,
                    'fallback_url' => $urlsByTemplate['murni'] ?? $defaultUrl,
                    'urls_by_template' => $urlsByTemplate,
                    'month' => null,
                    'is_custom_template' => false,
                ];
            }

            if (! $penganggaran) {
                $summaryText = 'Data penganggaran tahun ini belum dibuat';
            } elseif (! $hasData) {
                $summaryText = ($isTahap1Only && $perubahanCount > 0)
                    ? "Belum ada rincian RKAS Murni ({$perubahanCount} item Perubahan tersedia di Tahap 2/Tahunan)"
                    : 'Belum ada rincian RKAS';
            } elseif ($includeMurni && $includePerubahan) {
                $summaryText = "Tersedia ({$rkasCount} item Murni · {$perubahanCount} item Perubahan)";
            } elseif ($includePerubahan) {
                $summaryText = "Tersedia ({$perubahanCount} item RKAS Perubahan)";
            } elseif ($isTahap2Only && $rkasPerubahanClass !== null && $perubahanCount === 0) {
                $summaryText = "Tersedia ({$rkasCount} item RKAS Murni · Perubahan belum dibuat)";
            } else {
                $summaryText = "Tersedia ({$rkasCount} item RKAS Murni)";
            }

            $items[] = [
                'key' => $spec['key'],
                'label' => $spec['label'],
                'chapter_key' => 'penganggaran',
                'status' => $hasData ? 'ready' : 'empty',
                'count' => $defaultUsePerubahan ? $perubahanCount : $rkasCount,
                'summary_text' => $summaryText,
                'shortcut_url' => $defaultUsePerubahan ? $shortcutPerubahan : $shortcutRkas,
                'default_enabled' => $spec['default_enabled'] && $hasData,
                'default_template' => $defaultTemplate,
                'available_templates' => $templates,
                'default_paper_size' => $paperSize,
                'default_orientation' => $spec['orientation'],
                'default_font_size' => $spec['font_size'],
                'print_param_schema' => 'snake',
                'chunks' => $chunks,
            ];
        }

        return [
            'key' => 'penganggaran',
            'roman' => 'I',
            'title' => 'Dokumen Penganggaran (RKAS)',
            'subtitle' => 'Rencana Kegiatan dan Anggaran Sekolah',
            'items' => $items,
        ];
    }

    /**
     * BAB II — Laporan Pertanggungjawaban (SP2B, SPTJ, SPMTH, LPH)
     *
     * @param  array<string, array<int, array{id: string, label: string, is_custom: bool, template_id: int|null}>>  $customTemplates
     * @return array<string, mixed>
     */
    private function buildLaporanChapter(
        string $variant,
        mixed $penganggaran,
        string $periodeType,
        int $startMonth,
        int $endMonth,
        string $paperSize,
        array $customTemplates,
        ?string $requestedSp2bMode = null,
    ): array {
        $fk = VariantConfig::penganggaranFk($variant);
        $laporanShortcut = $this->variantRoute($variant, 'laporan.index');

        $specs = [
            ['key' => 'sp2b', 'label' => 'SP2B (Surat Permintaan Pengesahan Belanja)', 'concept' => 'sp2b', 'route_base' => 'laporan.sp2b'],
            ['key' => 'sptj', 'label' => 'SPTJ (Surat Pernyataan Tanggung Jawab Mutlak)', 'concept' => 'sptj', 'route_base' => 'laporan.sptj'],
            ['key' => 'spmth', 'label' => 'SPMTH (Surat Pernyataan Telah Menerima Hibah)', 'concept' => 'spmth', 'route_base' => 'laporan.spmth'],
            ['key' => 'lph', 'label' => 'LPH (Laporan Penggunaan Hibah)', 'concept' => 'lph', 'route_base' => 'laporan.lph'],
        ];

        $items = [];
        foreach ($specs as $spec) {
            $modelClass = VariantConfig::getModelClass($spec['concept'], $variant);
            $allRecords = ($penganggaran && $modelClass)
                ? $modelClass::query()->where($fk, $penganggaran->id)->orderBy('id')->get()
                : collect();

            $sp2bActiveMode = null;
            $sp2bModeOptions = null;

            if ($spec['key'] === 'sp2b') {
                $tahapRecords = $this->filterSp2bRecordsByMode($allRecords, 'tahap', $periodeType, $startMonth, $endMonth);
                $bulanRecords = $this->filterSp2bRecordsByMode($allRecords, 'bulan', $periodeType, $startMonth, $endMonth);

                if (in_array($requestedSp2bMode, self::ALLOWED_SP2B_MODES, true)) {
                    $sp2bActiveMode = $requestedSp2bMode;
                } elseif (in_array($periodeType, ['bulan', 'rentang_bulan'], true)) {
                    $sp2bActiveMode = $bulanRecords->isNotEmpty()
                        ? 'bulan'
                        : ($tahapRecords->isNotEmpty() ? 'tahap' : 'bulan');
                } else {
                    $sp2bActiveMode = $tahapRecords->isNotEmpty()
                        ? 'tahap'
                        : ($bulanRecords->isNotEmpty() ? 'bulan' : 'tahap');
                }

                $records = $sp2bActiveMode === 'bulan' ? $bulanRecords : $tahapRecords;
                $sp2bModeOptions = [
                    ['id' => 'tahap', 'label' => 'Per Tahap', 'count' => $tahapRecords->count()],
                    ['id' => 'bulan', 'label' => 'Per Bulan', 'count' => $bulanRecords->count()],
                ];
            } else {
                $records = $this->filterLaporanRecords(
                    $allRecords,
                    $spec['key'],
                    $periodeType,
                    $startMonth,
                    $endMonth,
                );
            }

            $templates = array_merge(
                [['id' => 'default', 'label' => 'Format Standar SIKAS', 'is_custom' => false, 'template_id' => null]],
                $customTemplates[$spec['key']] ?? [],
            );

            $chunks = [];
            foreach ($records as $index => $record) {
                $defaultUrl = $this->variantRoute($variant, $spec['route_base'].'.pdf', [
                    'id' => $record->id,
                    'paper_size' => $paperSize,
                    'orientation' => 'portrait',
                    'font_size' => $spec['key'] === 'lph' ? '11pt' : '12pt',
                ]);

                $urlsByTemplate = ['default' => $defaultUrl];
                foreach ($customTemplates[$spec['key']] ?? [] as $tpl) {
                    $urlsByTemplate[$tpl['id']] = $this->variantRoute($variant, $spec['route_base'].'.custom.preview', [
                        'id' => $record->id,
                        'template' => $tpl['template_id'],
                    ]);
                }

                $nomor = $record->nomor_sp2b
                    ?? $record->nomor_sptj
                    ?? $record->nomor_surat
                    ?? $record->nomor_lph
                    ?? ('#'.($index + 1));

                $chunkMonth = null;
                if ($spec['key'] === 'sp2b' && $sp2bActiveMode === 'bulan') {
                    $bulanNum = $this->parseBulanNumber($record->bulan ?? null);
                    $chunkMonth = $bulanNum;
                    $bulanLabel = $bulanNum !== null ? self::BULAN_NAMES[$bulanNum] : trim((string) ($record->bulan ?? ''));
                    $chunkLabel = $bulanLabel !== ''
                        ? "SP2B Bulan {$bulanLabel} — {$nomor}"
                        : "SP2B — {$nomor}";
                } elseif ($spec['key'] === 'sp2b' && ! empty($record->tahap)) {
                    $chunkLabel = "SP2B Tahap {$record->tahap} — {$nomor}";
                } else {
                    $chunkLabel = strtoupper($spec['key']).' — '.$nomor;
                }

                $chunks[] = [
                    'id' => $spec['key'].':'.$record->id,
                    'label' => $chunkLabel,
                    'url' => $defaultUrl,
                    'fallback_url' => $defaultUrl,
                    'urls_by_template' => $urlsByTemplate,
                    'month' => $chunkMonth,
                    'is_custom_template' => false,
                ];
            }

            $count = $records->count();
            if ($spec['key'] === 'sp2b') {
                $modeLabel = $sp2bActiveMode === 'bulan' ? 'Per Bulan' : 'Per Tahap';
                $summaryText = $count > 0
                    ? "{$count} dokumen SP2B {$modeLabel} siap cetak"
                    : "Belum ada SP2B {$modeLabel} untuk periode ini";
            } else {
                $summaryText = $count > 0
                    ? "{$count} dokumen siap cetak"
                    : 'Belum dibuat untuk periode ini';
            }

            $itemPayload = [
                'key' => $spec['key'],
                'label' => $spec['label'],
                'chapter_key' => 'laporan',
                'status' => $count > 0 ? 'ready' : 'empty',
                'count' => $count,
                'summary_text' => $summaryText,
                'shortcut_url' => $laporanShortcut,
                'default_enabled' => $count > 0,
                'default_template' => 'default',
                'available_templates' => $templates,
                'default_paper_size' => $paperSize,
                'default_orientation' => 'portrait',
                'default_font_size' => $spec['key'] === 'lph' ? '11pt' : '12pt',
                'print_param_schema' => 'snake',
                'chunks' => $chunks,
            ];

            if ($spec['key'] === 'sp2b') {
                $itemPayload['sp2b_active_mode'] = $sp2bActiveMode;
                $itemPayload['sp2b_mode_options'] = $sp2bModeOptions;
            }

            $items[] = $itemPayload;
        }

        return [
            'key' => 'laporan',
            'roman' => 'II',
            'title' => 'Laporan Pertanggungjawaban',
            'subtitle' => 'SP2B, SPTJ, SPMTH, dan LPH',
            'items' => $items,
        ];
    }

    /**
     * Memisahkan & memfilter record SP2B berdasarkan mode Per Tahap atau Per Bulan.
     *
     * @param  Collection<int, mixed>  $records
     * @return Collection<int, mixed>
     */
    private function filterSp2bRecordsByMode(
        Collection $records,
        string $mode,
        string $periodeType,
        int $startMonth,
        int $endMonth,
    ): Collection {
        if ($records->isEmpty()) {
            return collect();
        }

        if ($mode === 'bulan') {
            return $records
                ->filter(function ($row) use ($periodeType, $startMonth, $endMonth): bool {
                    $jenis = strtolower(trim((string) ($row->jenis_periode ?? '')));
                    if (! in_array($jenis, ['bulan', 'bulanan'], true)) {
                        return false;
                    }
                    if ($periodeType === 'tahunan') {
                        return true;
                    }
                    $bulanNum = $this->parseBulanNumber($row->bulan ?? null);
                    if ($bulanNum === null) {
                        return true;
                    }

                    return $bulanNum >= $startMonth && $bulanNum <= $endMonth;
                })
                ->sortBy(fn ($row): array => [$this->parseBulanNumber($row->bulan ?? null) ?? 99, (int) $row->id])
                ->values();
        }

        // Mode Per Tahap
        $tahapOnly = $records->filter(static function ($row): bool {
            $jenis = strtolower(trim((string) ($row->jenis_periode ?? '')));

            return ! in_array($jenis, ['bulan', 'bulanan'], true);
        });

        if ($periodeType === 'tahunan') {
            return $tahapOnly->values();
        }

        $targetTahap = match ($periodeType) {
            'tahap_1' => '1',
            'tahap_2' => '2',
            default => $endMonth <= 6 ? '1' : ($startMonth >= 7 ? '2' : null),
        };

        if ($targetTahap === null) {
            return $tahapOnly->values();
        }

        return $tahapOnly->filter(static function ($row) use ($targetTahap): bool {
            $tahapStr = strtolower(trim((string) ($row->tahap ?? '')));
            if ($tahapStr === '' || str_contains($tahapStr, 'tahun')) {
                return true;
            }

            return $targetTahap === '1'
                ? (str_contains($tahapStr, '1') || (str_contains($tahapStr, 'i') && ! str_contains($tahapStr, '2') && ! str_contains($tahapStr, 'ii')))
                : (str_contains($tahapStr, '2') || str_contains($tahapStr, 'ii'));
        })->values();
    }

    private function parseBulanNumber(mixed $raw): ?int
    {
        if (is_numeric($raw)) {
            $num = (int) $raw;

            return ($num >= 1 && $num <= 12) ? $num : null;
        }
        if (is_string($raw)) {
            $clean = strtolower(trim($raw));
            foreach (self::BULAN_NAMES as $num => $name) {
                if (strtolower($name) === $clean) {
                    return $num;
                }
            }
        }

        return null;
    }

    /**
     * @param  Collection<int, mixed>  $records
     * @return Collection<int, mixed>
     */
    private function filterLaporanRecords(
        Collection $records,
        string $type,
        string $periodeType,
        int $startMonth,
        int $endMonth,
    ): Collection {
        if ($records->isEmpty() || $periodeType === 'tahunan') {
            return $records;
        }

        $targetTahap = match ($periodeType) {
            'tahap_1' => '1',
            'tahap_2' => '2',
            default => $endMonth <= 6 ? '1' : ($startMonth >= 7 ? '2' : null),
        };

        if ($targetTahap === null) {
            return $records;
        }

        return $records->filter(static function ($row) use ($type, $targetTahap): bool {
            if ($type === 'lph') {
                $sem = strtolower(trim((string) ($row->semester ?? '')));
                if ($sem === '') {
                    return true;
                }

                return $targetTahap === '1'
                    ? (str_contains($sem, '1') || str_contains($sem, 'i') && ! str_contains($sem, '2') && ! str_contains($sem, 'ii'))
                    : (str_contains($sem, '2') || str_contains($sem, 'ii'));
            }

            $tahapStr = strtolower(trim((string) ($row->tahap ?? '')));
            if ($tahapStr === '' || str_contains($tahapStr, 'tahun')) {
                return true;
            }

            return $targetTahap === '1'
                ? (str_contains($tahapStr, '1') || (str_contains($tahapStr, 'i') && ! str_contains($tahapStr, '2') && ! str_contains($tahapStr, 'ii')))
                : (str_contains($tahapStr, '2') || str_contains($tahapStr, 'ii'));
        })->values();
    }

    /**
     * BAB III — Penatausahaan & Buku Pembantu (Multi-Bulan + Rekapitulasi)
     *
     * @param  array<int, array{number: int, name: string, slug: string}>  $months
     * @return array<string, mixed>
     */
    private function buildPenatausahaanChapter(
        string $variant,
        mixed $penganggaran,
        int $tahun,
        string $periodeType,
        array $months,
        string $paperSize,
        string $groupingMode,
    ): array {
        $fk = VariantConfig::penganggaranFk($variant);
        $bkuClass = VariantConfig::getModelClass('bku', $variant);
        $rekapShortcut = $this->variantRoute($variant, 'penatausahaan.rekapitulasi');

        $activeMonths = [];
        if ($penganggaran) {
            foreach ($months as $m) {
                $mStart = Carbon::create($tahun, $m['number'], 1)->startOfMonth()->toDateString();
                $mEnd = Carbon::create($tahun, $m['number'], 1)->addMonth()->startOfMonth()->toDateString();
                $hasBku = $bkuClass::query()
                    ->where($fk, $penganggaran->id)
                    ->where('tanggal_transaksi', '>=', $mStart)
                    ->where('tanggal_transaksi', '<', $mEnd)
                    ->exists();
                if ($hasBku) {
                    $activeMonths[] = $m;
                }
            }
        }

        // Jika periode terpilih punya penganggaran namun transaksi per bulan kosong, tetap izinkan cetak bulan-bulan periode?
        // Tidak — kita tandai status 'empty' bila tidak ada bulan yang punya data BKU agar jujur di pre-flight.
        $monthlyBookSpecs = [
            ['key' => 'bku', 'label' => 'Buku Kas Umum (BKU)', 'route' => 'bkp-umum.cetak', 'path_params' => true, 'orientation' => 'landscape', 'default_enabled' => true],
            ['key' => 'bkp_tunai', 'label' => 'Buku Kas Pembantu Tunai', 'route' => 'bkp-pembantu.cetak', 'path_params' => false, 'orientation' => 'landscape', 'default_enabled' => true],
            ['key' => 'bkp_bank', 'label' => 'Buku Pembantu Bank', 'route' => 'bkp-bank.cetak', 'path_params' => false, 'orientation' => 'portrait', 'default_enabled' => true],
            ['key' => 'bkp_pajak', 'label' => 'Buku Pembantu Pajak', 'route' => 'bkp-pajak.cetak', 'path_params' => false, 'orientation' => 'landscape', 'default_enabled' => true],
            ['key' => 'bkp_rob', 'label' => 'Buku Rincian Objek Belanja (ROB)', 'route' => 'bkp-rob.cetak', 'path_params' => false, 'orientation' => 'landscape', 'default_enabled' => false],
            ['key' => 'bkp_reg', 'label' => 'Register Penutupan Kas', 'route' => 'bkp-reg.cetak', 'path_params' => false, 'orientation' => 'portrait', 'default_enabled' => true],
            ['key' => 'ba_kas', 'label' => 'Berita Acara Pemeriksaan Kas', 'route' => 'ba.cetak', 'path_params' => false, 'orientation' => 'portrait', 'default_enabled' => true],
        ];

        $items = [];
        $activeCount = count($activeMonths);
        $totalPeriodMonths = count($months);

        if ($groupingMode === 'per_bulan') {
            foreach ($months as $m) {
                $monthHasData = in_array($m['number'], array_column($activeMonths, 'number'), true);
                $chunks = [];
                if ($monthHasData) {
                    foreach ($monthlyBookSpecs as $book) {
                        $url = $this->buildMonthlyBookUrl($variant, $book, $tahun, $m['slug'], $paperSize);
                        $chunks[] = [
                            'id' => 'bulan_'.$m['number'].':'.$book['key'],
                            'label' => $book['label'].' — '.$m['name'].' '.$tahun,
                            'url' => $url,
                            'fallback_url' => $url,
                            'urls_by_template' => ['default' => $url],
                            'month' => $m['number'],
                            'is_custom_template' => false,
                        ];
                    }
                }

                $items[] = [
                    'key' => 'penatausahaan_bulan_'.$m['number'],
                    'label' => 'Paket Penatausahaan — '.$m['name'].' '.$tahun,
                    'chapter_key' => 'penatausahaan',
                    'status' => $monthHasData ? 'ready' : 'empty',
                    'count' => $monthHasData ? count($monthlyBookSpecs) : 0,
                    'summary_text' => $monthHasData
                        ? count($monthlyBookSpecs).' buku (BKU, Tunai, Bank, Pajak, ROB, Register, BA)'
                        : 'Belum ada transaksi BKU bulan '.$m['name'],
                    'shortcut_url' => $rekapShortcut,
                    'default_enabled' => $monthHasData,
                    'default_template' => 'default',
                    'available_templates' => [['id' => 'default', 'label' => 'Format Standar SIKAS', 'is_custom' => false, 'template_id' => null]],
                    'default_paper_size' => $paperSize,
                    'default_orientation' => 'landscape',
                    'default_font_size' => '10pt',
                    'print_param_schema' => 'camel',
                    'chunks' => $chunks,
                ];
            }
        } else {
            foreach ($monthlyBookSpecs as $book) {
                $chunks = [];
                foreach ($activeMonths as $m) {
                    $url = $this->buildMonthlyBookUrl($variant, $book, $tahun, $m['slug'], $paperSize);
                    $chunks[] = [
                        'id' => $book['key'].':'.$m['number'],
                        'label' => $book['label'].' — '.$m['name'].' '.$tahun,
                        'url' => $url,
                        'fallback_url' => $url,
                        'urls_by_template' => ['default' => $url],
                        'month' => $m['number'],
                        'is_custom_template' => false,
                    ];
                }

                $status = $activeCount === 0
                    ? 'empty'
                    : ($activeCount < $totalPeriodMonths ? 'partial' : 'ready');

                $items[] = [
                    'key' => $book['key'],
                    'label' => $book['label'],
                    'chapter_key' => 'penatausahaan',
                    'status' => $status,
                    'count' => $activeCount,
                    'summary_text' => $activeCount > 0
                        ? "{$activeCount} dari {$totalPeriodMonths} bulan siap cetak"
                        : 'Belum ada data BKU pada periode ini',
                    'shortcut_url' => $rekapShortcut,
                    'default_enabled' => $book['default_enabled'] && $activeCount > 0,
                    'default_template' => 'default',
                    'available_templates' => [['id' => 'default', 'label' => 'Format Standar SIKAS', 'is_custom' => false, 'template_id' => null]],
                    'default_paper_size' => $paperSize,
                    'default_orientation' => $book['orientation'],
                    'default_font_size' => in_array($book['key'], ['bkp_bank', 'ba_kas'], true) ? '11pt' : '10pt',
                    'print_param_schema' => 'camel',
                    'chunks' => $chunks,
                ];
            }
        }

        // Laporan Rekapitulasi Periode (Realisasi, Rekap per Rekening, BHP, BHM)
        $periodeArg = match ($periodeType) {
            'tahap_1' => 'Tahap 1',
            'tahap_2' => 'Tahap 2',
            'bulan' => $months[0]['name'] ?? 'Januari',
            default => 'Tahunan',
        };
        $jenisLaporanArg = match ($periodeType) {
            'tahap_1', 'tahap_2' => 'tahap',
            'bulan' => 'bulanan',
            default => 'tahunan',
        };

        $rekapSpecs = [
            [
                'key' => 'rekap_realisasi',
                'label' => 'Rekapitulasi Realisasi Penggunaan Dana',
                'url' => $this->variantRoute($variant, 'realisasi.cetak', [
                    'tahun' => $tahun,
                    'periode' => $periodeArg,
                    'jenis_laporan' => $jenisLaporanArg,
                    'ukuran_kertas' => $paperSize,
                    'orientasi' => 'landscape',
                    'font_size' => '9pt',
                ]),
                'orientation' => 'landscape',
                'font_size' => '9pt',
                'schema' => 'realisasi',
                'default_enabled' => true,
            ],
            [
                'key' => 'rekap_realisasi_rekening',
                'label' => 'Rekap Realisasi per Kode Rekening',
                'url' => $this->variantRoute($variant, 'rek-realisasi.cetak', [
                    'tahun' => $tahun,
                    'fase' => in_array($periodeArg, ['Tahap 1', 'Tahap 2', 'Tahunan'], true) ? $periodeArg : 'Tahunan',
                    'ukuran_kertas' => $paperSize,
                    'orientasi' => 'landscape',
                    'font_size' => '9pt',
                ]),
                'orientation' => 'landscape',
                'font_size' => '9pt',
                'schema' => 'realisasi',
                'default_enabled' => true,
            ],
            [
                'key' => 'daftar_bhp',
                'label' => 'Daftar Barang Habis Pakai (BHP)',
                'url' => $this->variantRoute($variant, 'bhp.cetak', [
                    'tahun' => $tahun,
                    'periode' => $periodeArg,
                    'jenis_laporan' => $jenisLaporanArg,
                    'paperSize' => $paperSize,
                    'orientation' => 'landscape',
                    'fontSize' => '10pt',
                ]),
                'orientation' => 'landscape',
                'font_size' => '10pt',
                'schema' => 'camel',
                'default_enabled' => false,
            ],
            [
                'key' => 'daftar_bhm',
                'label' => 'Daftar Belanja Modal / Aset (BHM)',
                'url' => $this->variantRoute($variant, 'bhm.cetak', [
                    'tahun' => $tahun,
                    'periode' => $periodeArg,
                    'jenis_laporan' => $jenisLaporanArg,
                    'paperSize' => $paperSize,
                    'orientation' => 'landscape',
                    'fontSize' => '10pt',
                ]),
                'orientation' => 'landscape',
                'font_size' => '10pt',
                'schema' => 'camel',
                'default_enabled' => false,
            ],
        ];

        foreach ($rekapSpecs as $rekap) {
            $hasData = $penganggaran !== null && $activeCount > 0;
            $items[] = [
                'key' => $rekap['key'],
                'label' => $rekap['label'],
                'chapter_key' => 'penatausahaan',
                'status' => $hasData ? 'ready' : 'empty',
                'count' => $hasData ? 1 : 0,
                'summary_text' => $hasData ? "Siap cetak ({$periodeArg})" : 'Belum ada realisasi pada periode ini',
                'shortcut_url' => $rekapShortcut,
                'default_enabled' => $rekap['default_enabled'] && $hasData,
                'default_template' => 'default',
                'available_templates' => [['id' => 'default', 'label' => 'Format Standar SIKAS', 'is_custom' => false, 'template_id' => null]],
                'default_paper_size' => $paperSize,
                'default_orientation' => $rekap['orientation'],
                'default_font_size' => $rekap['font_size'],
                'print_param_schema' => $rekap['schema'],
                'chunks' => $hasData ? [[
                    'id' => $rekap['key'],
                    'label' => $rekap['label'],
                    'url' => $rekap['url'],
                    'fallback_url' => $rekap['url'],
                    'urls_by_template' => ['default' => $rekap['url']],
                    'month' => null,
                    'is_custom_template' => false,
                ]] : [],
            ];
        }

        return [
            'key' => 'penatausahaan',
            'roman' => 'III',
            'title' => 'Penatausahaan & Buku Pembantu',
            'subtitle' => 'BKU, Buku Bank, Tunai, Pajak, Register, Berita Acara & Realisasi',
            'items' => $items,
        ];
    }

    /**
     * @param  array<string, mixed>  $book
     */
    private function buildMonthlyBookUrl(string $variant, array $book, int $tahun, string $bulanSlug, string $paperSize): string
    {
        return $this->variantRoute($variant, $book['route'], [
            'tahun' => $tahun,
            'bulan' => $bulanSlug,
            'paperSize' => $paperSize,
            'orientation' => $book['orientation'],
        ]);
    }

    /**
     * BAB IV — Bukti Transaksi & Pengadaan (Kwitansi, Tanda Terima, BAST, Surat Pesanan)
     *
     * @param  array<int, array{number: int, name: string, slug: string}>  $months
     * @param  array<string, array<int, array{id: string, label: string, is_custom: bool, template_id: int|null}>>  $customTemplates
     * @return array<string, mixed>
     */
    private function buildBuktiTransaksiChapter(
        string $variant,
        mixed $penganggaran,
        int $tahun,
        array $months,
        string $startDate,
        string $endDate,
        string $paperSize,
        array $customTemplates,
    ): array {
        $fk = VariantConfig::penganggaranFk($variant);
        $items = [];

        // 1. Kwitansi (dipecah per bulan via downloadAll* agar DomPDF ringan)
        $kwitansiClass = VariantConfig::getModelClass('kwitansi', $variant);
        $kwitansiTemplates = array_merge([
            ['id' => 'format_1', 'label' => 'Kwitansi Standar (Format 1)', 'is_custom' => false, 'template_id' => null],
            ['id' => 'format_2', 'label' => 'Kwitansi Model 2', 'is_custom' => false, 'template_id' => null],
            ['id' => 'format_3', 'label' => 'Kwitansi Model 3', 'is_custom' => false, 'template_id' => null],
            ['id' => 'format_4', 'label' => 'Kwitansi Model 4', 'is_custom' => false, 'template_id' => null],
        ], $customTemplates['kwitansi'] ?? []);

        $kwitansiTotal = 0;
        $kwitansiChunks = [];
        if ($penganggaran && $kwitansiClass) {
            foreach ($months as $m) {
                $mStart = Carbon::create($tahun, $m['number'], 1)->startOfMonth()->toDateString();
                $mEnd = Carbon::create($tahun, $m['number'], 1)->endOfMonth()->toDateString();
                $countMonth = $kwitansiClass::query()
                    ->where($fk, $penganggaran->id)
                    ->whereHas('bukuKasUmum', function ($q) use ($mStart, $mEnd) {
                        $q->whereBetween('tanggal_transaksi', [$mStart, $mEnd]);
                    })
                    ->count();

                if ($countMonth > 0) {
                    $kwitansiTotal += $countMonth;
                    $commonParams = [
                        'tahun' => $penganggaran->id,
                        'start_date' => $mStart,
                        'end_date' => $mEnd,
                        'paper_size' => $paperSize,
                    ];

                    $urlsByTemplate = [
                        'format_1' => $this->variantRoute($variant, 'kwitansi.download-all', $commonParams),
                        'format_2' => $this->variantRoute($variant, 'kwitansi.download-all2', $commonParams),
                        'format_3' => $this->variantRoute($variant, 'kwitansi.download-all3', $commonParams),
                        'format_4' => $this->variantRoute($variant, 'kwitansi.download-all4', $commonParams),
                    ];
                    foreach ($customTemplates['kwitansi'] ?? [] as $tpl) {
                        $urlsByTemplate[$tpl['id']] = $this->variantRoute($variant, 'kwitansi.custom.download-all', array_merge($commonParams, [
                            'template' => $tpl['template_id'],
                            'output' => 'pdf',
                        ]));
                    }

                    $kwitansiChunks[] = [
                        'id' => 'kwitansi:'.$m['number'],
                        'label' => "Kwitansi {$m['name']} {$tahun} ({$countMonth} bukti)",
                        'url' => $urlsByTemplate['format_1'],
                        'fallback_url' => $urlsByTemplate['format_1'],
                        'urls_by_template' => $urlsByTemplate,
                        'month' => $m['number'],
                        'is_custom_template' => false,
                    ];
                }
            }
        }

        $items[] = [
            'key' => 'kwitansi',
            'label' => 'Kwitansi Pembayaran',
            'chapter_key' => 'bukti_transaksi',
            'status' => $kwitansiTotal > 0 ? 'ready' : 'empty',
            'count' => $kwitansiTotal,
            'summary_text' => $kwitansiTotal > 0
                ? "{$kwitansiTotal} kwitansi siap cetak (".count($kwitansiChunks).' bulan)'
                : 'Belum ada kwitansi pada periode ini',
            'shortcut_url' => $this->variantRoute($variant, 'kwitansi.index'),
            'default_enabled' => $kwitansiTotal > 0,
            'default_template' => 'format_1',
            'available_templates' => $kwitansiTemplates,
            'default_paper_size' => $paperSize,
            'default_orientation' => 'portrait',
            'default_font_size' => '11pt',
            'print_param_schema' => 'snake',
            'chunks' => $kwitansiChunks,
        ];

        // 2. Tanda Terima (dipecah per bulan via downloadAll)
        $ttClass = VariantConfig::getModelClass('tanda_terima', $variant);
        $ttTemplates = array_merge([
            ['id' => 'default', 'label' => 'Format Standar SIKAS', 'is_custom' => false, 'template_id' => null],
        ], $customTemplates['tanda_terima'] ?? []);

        $ttTotal = 0;
        $ttChunks = [];
        $ttPaper = $paperSize === 'F4' ? 'Folio' : $paperSize;
        if ($penganggaran && $ttClass) {
            foreach ($months as $m) {
                $mStart = Carbon::create($tahun, $m['number'], 1)->startOfMonth()->toDateString();
                $mEnd = Carbon::create($tahun, $m['number'], 1)->endOfMonth()->toDateString();
                $countMonth = $ttClass::query()
                    ->where($fk, $penganggaran->id)
                    ->whereHas('bukuKasUmum', function ($q) use ($mStart, $mEnd) {
                        $q->whereBetween('tanggal_transaksi', [$mStart, $mEnd]);
                    })
                    ->count();

                if ($countMonth > 0) {
                    $ttTotal += $countMonth;
                    $commonParams = [
                        'tahun' => $penganggaran->id,
                        'start_date' => $mStart,
                        'end_date' => $mEnd,
                        'paper_size' => $ttPaper,
                    ];
                    $defaultUrl = $this->variantRoute($variant, 'tanda-terima.download-all', $commonParams);
                    $urlsByTemplate = ['default' => $defaultUrl];
                    foreach ($customTemplates['tanda_terima'] ?? [] as $tpl) {
                        $urlsByTemplate[$tpl['id']] = $this->variantRoute($variant, 'tanda-terima.custom.download-all', array_merge($commonParams, [
                            'template' => $tpl['template_id'],
                            'output' => 'pdf',
                        ]));
                    }

                    $ttChunks[] = [
                        'id' => 'tanda_terima:'.$m['number'],
                        'label' => "Tanda Terima {$m['name']} {$tahun} ({$countMonth} bukti)",
                        'url' => $defaultUrl,
                        'fallback_url' => $defaultUrl,
                        'urls_by_template' => $urlsByTemplate,
                        'month' => $m['number'],
                        'is_custom_template' => false,
                    ];
                }
            }
        }

        $items[] = [
            'key' => 'tanda_terima',
            'label' => 'Tanda Terima Honor / Belanja',
            'chapter_key' => 'bukti_transaksi',
            'status' => $ttTotal > 0 ? 'ready' : 'empty',
            'count' => $ttTotal,
            'summary_text' => $ttTotal > 0
                ? "{$ttTotal} tanda terima siap cetak (".count($ttChunks).' bulan)'
                : 'Belum ada tanda terima pada periode ini',
            'shortcut_url' => $this->variantRoute($variant, 'tanda-terima.index'),
            'default_enabled' => $ttTotal > 0,
            'default_template' => 'default',
            'available_templates' => $ttTemplates,
            'default_paper_size' => $paperSize,
            'default_orientation' => 'landscape',
            'default_font_size' => '10pt',
            'print_param_schema' => 'snake',
            'chunks' => $ttChunks,
        ];

        // 3. BAST (per record terfilter periode)
        $bastClass = VariantConfig::getModelClass('bast', $variant);
        $bastTemplates = array_merge([
            ['id' => 'default', 'label' => 'Format Standar SIKAS', 'is_custom' => false, 'template_id' => null],
        ], $customTemplates['bast'] ?? []);

        $bastChunks = [];
        $bastRecords = ($penganggaran && $bastClass)
            ? $bastClass::query()
                ->where($fk, $penganggaran->id)
                ->whereHas('bukuKasUmum', function ($q) use ($startDate, $endDate) {
                    $q->whereBetween('tanggal_transaksi', [$startDate, $endDate]);
                })
                ->with('bukuKasUmum:id,tanggal_transaksi,uraian')
                ->orderBy('id')
                ->get()
            : collect();

        foreach ($bastRecords as $index => $bast) {
            $defaultUrl = $this->variantRoute($variant, 'bast.preview', [
                'id' => $bast->id,
                'paperSize' => $paperSize,
            ]);
            $urlsByTemplate = ['default' => $defaultUrl];
            foreach ($customTemplates['bast'] ?? [] as $tpl) {
                $urlsByTemplate[$tpl['id']] = $this->variantRoute($variant, 'bast.custom.preview', [
                    'id' => $bast->id,
                    'template' => $tpl['template_id'],
                ]);
            }
            $labelSuffix = trim((string) ($bast->nomor_bast ?? '')) !== ''
                ? $bast->nomor_bast
                : ('#'.($index + 1));

            $bastChunks[] = [
                'id' => 'bast:'.$bast->id,
                'label' => 'BAST — '.$labelSuffix,
                'url' => $defaultUrl,
                'fallback_url' => $defaultUrl,
                'urls_by_template' => $urlsByTemplate,
                'month' => $bast->bukuKasUmum?->tanggal_transaksi
                    ? (int) Carbon::parse($bast->bukuKasUmum->tanggal_transaksi)->month
                    : null,
                'is_custom_template' => false,
            ];
        }

        $items[] = [
            'key' => 'bast',
            'label' => 'Berita Acara Serah Terima (BAST)',
            'chapter_key' => 'bukti_transaksi',
            'status' => count($bastChunks) > 0 ? 'ready' : 'empty',
            'count' => count($bastChunks),
            'summary_text' => count($bastChunks) > 0
                ? count($bastChunks).' dokumen BAST siap cetak'
                : 'Belum ada BAST pada periode ini',
            'shortcut_url' => $this->variantRoute($variant, 'bast.index'),
            'default_enabled' => count($bastChunks) > 0,
            'default_template' => 'default',
            'available_templates' => $bastTemplates,
            'default_paper_size' => $paperSize,
            'default_orientation' => 'portrait',
            'default_font_size' => '11pt',
            'print_param_schema' => 'camel',
            'chunks' => $bastChunks,
        ];

        // 4. Surat Pesanan (per record terfilter periode)
        $spClass = VariantConfig::getModelClass('surat_pesanan', $variant);
        $spTemplates = array_merge([
            ['id' => 'default', 'label' => 'Format Standar SIKAS', 'is_custom' => false, 'template_id' => null],
        ], $customTemplates['surat_pesanan'] ?? []);

        $spChunks = [];
        $spRecords = ($penganggaran && $spClass)
            ? $spClass::query()
                ->where($fk, $penganggaran->id)
                ->whereHas('bukuKasUmum', function ($q) use ($startDate, $endDate) {
                    $q->whereBetween('tanggal_transaksi', [$startDate, $endDate]);
                })
                ->with('bukuKasUmum:id,tanggal_transaksi,uraian')
                ->orderBy('id')
                ->get()
            : collect();

        foreach ($spRecords as $index => $sp) {
            $defaultUrl = $this->variantRoute($variant, 'surat-pesanan.preview', [
                'id' => $sp->id,
                'paperSize' => $paperSize,
            ]);
            $urlsByTemplate = ['default' => $defaultUrl];
            foreach ($customTemplates['surat_pesanan'] ?? [] as $tpl) {
                $urlsByTemplate[$tpl['id']] = $this->variantRoute($variant, 'surat-pesanan.custom.preview', [
                    'id' => $sp->id,
                    'template' => $tpl['template_id'],
                ]);
            }
            $labelSuffix = trim((string) ($sp->nomor_surat ?? '')) !== ''
                ? $sp->nomor_surat
                : ('#'.($index + 1));

            $spChunks[] = [
                'id' => 'surat_pesanan:'.$sp->id,
                'label' => 'Surat Pesanan — '.$labelSuffix,
                'url' => $defaultUrl,
                'fallback_url' => $defaultUrl,
                'urls_by_template' => $urlsByTemplate,
                'month' => $sp->bukuKasUmum?->tanggal_transaksi
                    ? (int) Carbon::parse($sp->bukuKasUmum->tanggal_transaksi)->month
                    : null,
                'is_custom_template' => false,
            ];
        }

        $items[] = [
            'key' => 'surat_pesanan',
            'label' => 'Surat Pesanan Barang / Jasa',
            'chapter_key' => 'bukti_transaksi',
            'status' => count($spChunks) > 0 ? 'ready' : 'empty',
            'count' => count($spChunks),
            'summary_text' => count($spChunks) > 0
                ? count($spChunks).' surat pesanan siap cetak'
                : 'Belum ada surat pesanan pada periode ini',
            'shortcut_url' => $this->variantRoute($variant, 'surat-pesanan.index'),
            'default_enabled' => count($spChunks) > 0,
            'default_template' => 'default',
            'available_templates' => $spTemplates,
            'default_paper_size' => $paperSize,
            'default_orientation' => 'portrait',
            'default_font_size' => '11pt',
            'print_param_schema' => 'camel',
            'chunks' => $spChunks,
        ];

        return [
            'key' => 'bukti_transaksi',
            'roman' => 'IV',
            'title' => 'Bukti Transaksi & Pengadaan',
            'subtitle' => 'Kwitansi, Tanda Terima, BAST, dan Surat Pesanan',
            'items' => $items,
        ];
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function loadExternalAttachments(string $variant, int $tahun, string $periodeType): array
    {
        if (! Schema::hasTable('spj_external_attachments')) {
            return [];
        }

        $allowedTags = match ($periodeType) {
            'tahap_1' => ['umum', 'tahap_1'],
            'tahap_2' => ['umum', 'tahap_2'],
            default => ['umum', 'tahap_1', 'tahap_2', 'tahunan'],
        };

        return SpjExternalAttachment::query()
            ->where('variant', $variant)
            ->where('tahun_anggaran', $tahun)
            ->whereIn('periode_tag', $allowedTags)
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get()
            ->map(fn (SpjExternalAttachment $att): array => [
                'id' => $att->id,
                'judul' => $att->judul,
                'kategori' => $att->kategori,
                'periode_tag' => $att->periode_tag,
                'original_filename' => $att->original_filename,
                'file_size' => (int) $att->file_size,
                'sort_order' => (int) $att->sort_order,
                'stream_url' => $this->variantRoute($variant, 'api.cetak-spj.attachments.stream', ['attachment' => $att->id]),
            ])
            ->all();
    }

    /**
     * BAB V — Lampiran Eksternal (PDF Unggahan Pengguna)
     *
     * @param  array<int, array<string, mixed>>  $attachments
     * @return array<string, mixed>
     */
    private function buildLampiranEksternalChapter(array $attachments): array
    {
        $items = [];
        foreach ($attachments as $att) {
            $items[] = [
                'key' => 'ext_'.$att['id'],
                'label' => $att['judul'],
                'chapter_key' => 'lampiran_eksternal',
                'status' => 'ready',
                'count' => 1,
                'summary_text' => $att['original_filename'].' · '.$this->formatBytes((int) $att['file_size']),
                'shortcut_url' => null,
                'default_enabled' => true,
                'default_template' => 'default',
                'available_templates' => [['id' => 'default', 'label' => 'PDF Asli', 'is_custom' => false, 'template_id' => null]],
                'default_paper_size' => 'A4',
                'default_orientation' => 'portrait',
                'default_font_size' => '10pt',
                'print_param_schema' => 'none',
                'is_external' => true,
                'attachment_id' => $att['id'],
                'chunks' => [[
                    'id' => 'ext:'.$att['id'],
                    'label' => $att['judul'],
                    'url' => $att['stream_url'],
                    'fallback_url' => $att['stream_url'],
                    'urls_by_template' => ['default' => $att['stream_url']],
                    'month' => null,
                    'is_custom_template' => false,
                ]],
            ];
        }

        return [
            'key' => 'lampiran_eksternal',
            'roman' => 'V',
            'title' => 'Lampiran Pendukung Eksternal',
            'subtitle' => 'SK Tim BOSP, Rekening Koran, Bukti Setor Pajak, dll.',
            'items' => $items,
        ];
    }

    /**
     * @return array<string, mixed>|null
     */
    private function loadPreset(string $variant, int $tahun): ?array
    {
        if (! Schema::hasTable('spj_print_presets')) {
            return null;
        }

        $preset = SpjPrintPreset::query()
            ->where('variant', $variant)
            ->where('tahun_anggaran', $tahun)
            ->first()
            ?? SpjPrintPreset::query()
                ->where('variant', $variant)
                ->whereNull('tahun_anggaran')
                ->first();

        if (! $preset) {
            return null;
        }

        $coverConfig = $this->normalizeCoverConfig(
            is_array($preset->cover_config) ? $preset->cover_config : [],
            $variant,
            true,
        );

        return [
            'id' => $preset->id,
            'nama_preset' => $preset->nama_preset,
            'cover_config' => $coverConfig,
            'bundle_config' => is_array($preset->bundle_config) ? $preset->bundle_config : [],
        ];
    }

    /**
     * Normalisasi dan sanitasi terpusat untuk konfigurasi Studio Cover (dipakai saat simpan & muat preset).
     *
     * @param  array<string, mixed>  $rawConfig
     * @return array<string, mixed>
     */
    public function normalizeCoverConfig(array $rawConfig, string $variant, bool $embedDataUri = false): array
    {
        $coverConfig = $rawConfig;
        unset($coverConfig['photo_data_uri']);

        foreach ([
            'instansi_atas',
            'badge_dokumen',
            'judul_utama',
            'subjudul_override',
            'label_jilid',
            'nama_sekolah_override',
            'alamat_override',
            'kontak_sekolah_override',
            'kepala_sekolah_override',
            'nip_kepala_sekolah_override',
            'bendahara_override',
            'nip_bendahara_override',
        ] as $stringKey) {
            if (array_key_exists($stringKey, $coverConfig) && $coverConfig[$stringKey] === null) {
                $coverConfig[$stringKey] = '';
            }
        }

        foreach ([
            'ink_saver',
            'show_logo_daerah',
            'show_logo_sekolah',
            'show_logo_bosp',
            'show_foto_sekolah',
            'show_ringkasan_keuangan',
            'show_qr_code',
            'show_penanggung_jawab',
            'show_geometric_pattern',
        ] as $boolKey) {
            if (array_key_exists($boolKey, $coverConfig)) {
                $coverConfig[$boolKey] = (bool) $coverConfig[$boolKey];
            }
        }

        if (
            array_key_exists('photo_focus', $coverConfig)
            && ! in_array($coverConfig['photo_focus'], ['top', 'center', 'bottom'], true)
        ) {
            unset($coverConfig['photo_focus']);
        }
        if (
            array_key_exists('photo_blend', $coverConfig)
            && ! in_array($coverConfig['photo_blend'], ['vivid', 'balanced', 'soft'], true)
        ) {
            unset($coverConfig['photo_blend']);
        }

        if (array_key_exists('photo_path', $coverConfig)) {
            $sanitizedPhoto = is_string($coverConfig['photo_path'])
                ? $this->sanitizeCoverPhotoPath($coverConfig['photo_path'], $variant)
                : null;
            if ($sanitizedPhoto === null) {
                unset($coverConfig['photo_path']);
            } else {
                $coverConfig['photo_path'] = $sanitizedPhoto;
                if ($embedDataUri) {
                    $coverConfig['photo_data_uri'] = $this->imageToDataUri($sanitizedPhoto);
                }
            }
        }

        return $coverConfig;
    }

    public function sanitizeCoverPhotoPath(string $rawPath, string $variant): ?string
    {
        $normalized = ltrim(str_replace('\\', '/', trim($rawPath)), '/');
        if ($normalized === '' || str_contains($normalized, '..')) {
            return null;
        }
        if (
            ! str_starts_with($normalized, 'spj_cover_photos/'.$variant.'/')
            && ! str_starts_with($normalized, 'spj_cover_photos/shared/')
        ) {
            return null;
        }

        return $normalized;
    }

    public function sanitizeAnyCoverPhotoPath(string $rawPath): ?string
    {
        $normalized = ltrim(str_replace('\\', '/', trim($rawPath)), '/');
        if (
            $normalized === ''
            || str_contains($normalized, '..')
            || ! str_starts_with($normalized, 'spj_cover_photos/')
        ) {
            return null;
        }

        return $normalized;
    }

    /**
     * @param  array<int, array<string, mixed>>  $chapters
     * @return array<string, int>
     */
    private function computeReadinessSummary(array $chapters): array
    {
        $ready = 0;
        $partial = 0;
        $empty = 0;
        $totalChunks = 0;

        foreach ($chapters as $chapter) {
            foreach ($chapter['items'] as $item) {
                if ($item['status'] === 'ready') {
                    $ready++;
                } elseif ($item['status'] === 'partial') {
                    $partial++;
                } else {
                    $empty++;
                }
                $totalChunks += count($item['chunks']);
            }
        }

        return [
            'ready' => $ready,
            'partial' => $partial,
            'empty' => $empty,
            'total_items' => $ready + $partial + $empty,
            'total_chunks' => $totalChunks,
        ];
    }

    /**
     * @param  array<string, mixed>  $params
     */
    private function variantRoute(string $variant, string $baseName, array $params = []): string
    {
        return route(VariantConfig::routeName($variant, $baseName), $params);
    }

    private function formatBytes(int $bytes): string
    {
        if ($bytes >= 1024 * 1024) {
            return round($bytes / (1024 * 1024), 2).' MB';
        }
        if ($bytes >= 1024) {
            return round($bytes / 1024, 1).' KB';
        }

        return $bytes.' B';
    }
}
