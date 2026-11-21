<?php

namespace App\Services;

use App\Config\VariantConfig;
use App\Models\SekolahProfile;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Schema;
use Throwable;

class PublicTransparansiService
{
    public const ALLOWED_JENIS_RKA = ['awal', 'perubahan'];

    private const TAHAP_1_BULAN = [
        'Januari',
        'Februari',
        'Maret',
        'April',
        'Mei',
        'Juni',
    ];

    public function __construct(
        private readonly TransparansiPosterService $posterService,
    ) {}

    /**
     * Merakit data overview portal transparansi publik lintas 4 varian BOSP & tahun anggaran.
     *
     * @return array<string, mixed>
     */
    public function buildOverview(string $variant = VariantConfig::REGULER, ?int $tahun = null, string $periode = 'tahunan'): array
    {
        $resolvedVariant = VariantConfig::isValid($variant) ? $variant : VariantConfig::REGULER;
        $resolvedPeriode = in_array($periode, TransparansiPosterService::ALLOWED_PERIODES, true) ? $periode : 'tahunan';

        $availableYears = $this->collectGlobalAvailableYears();
        $resolvedTahun = $tahun && $tahun >= 2000 && $tahun <= 2100
            ? $tahun
            : ($availableYears[0] ?? (int) now()->year);

        $variantsSummary = [];
        $activePoster = null;
        $totalPagu = 0.0;
        $totalDanaDiterima = 0.0;
        $totalRealisasi = 0.0;
        $totalSisaDana = 0.0;
        $activeVariantsCount = 0;

        $sekolahProfile = $this->resolveSekolahLocation();

        foreach (VariantConfig::VARIANTS as $v) {
            $rawPoster = $this->posterService->buildPosterData($v, $resolvedTahun, $resolvedPeriode);
            $rkaAvailability = $this->resolveRkaAvailability($v, $resolvedTahun);

            $hasData = (bool) ($rawPoster['meta']['has_data'] ?? false);
            $pagu = (float) ($rawPoster['ringkasan']['pagu_anggaran'] ?? 0);
            $diterima = (float) ($rawPoster['ringkasan']['dana_diterima'] ?? 0);
            $realisasi = (float) ($rawPoster['ringkasan']['total_realisasi'] ?? 0);
            $sisa = (float) ($rawPoster['ringkasan']['sisa_dana'] ?? 0);
            $persentase = (float) ($rawPoster['ringkasan']['persentase_serapan'] ?? 0);
            $status = (string) ($rawPoster['ringkasan']['status_persetujuan'] ?? 'draft');

            if ($hasData) {
                $activeVariantsCount++;
                $totalPagu += $pagu;
                $totalDanaDiterima += $diterima;
                $totalRealisasi += $realisasi;
                $totalSisaDana += $sisa;
            }

            $variantsSummary[] = [
                'variant' => $v,
                'label' => VariantConfig::title($v),
                'has_data' => $hasData,
                'pagu_anggaran' => round($pagu, 2),
                'dana_diterima' => round($diterima, 2),
                'total_realisasi' => round($realisasi, 2),
                'sisa_dana' => round($sisa, 2),
                'persentase_serapan' => $persentase,
                'status_persetujuan' => $status,
                'status_label' => $this->formatStatusLabel($status),
                'has_rkas_awal' => $rkaAvailability['has_rkas_awal'],
                'has_rkas_perubahan' => $rkaAvailability['has_rkas_perubahan'],
                'supports_perubahan' => $rkaAvailability['supports_perubahan'],
            ];

            if ($v === $resolvedVariant) {
                $activePoster = $this->sanitizePosterPayload($rawPoster, $rkaAvailability, $sekolahProfile);
            }
        }

        $aggregateDenominator = $totalPagu > 0 ? $totalPagu : $totalDanaDiterima;
        $aggregateSerapanAktual = $aggregateDenominator > 0
            ? round(($totalRealisasi / $aggregateDenominator) * 100, 1)
            : 0.0;

        return [
            'meta' => [
                'variant' => $resolvedVariant,
                'variant_label' => VariantConfig::title($resolvedVariant),
                'tahun' => $resolvedTahun,
                'periode' => $resolvedPeriode,
                'periode_label' => $activePoster['meta']['periode_label'],
                'available_years' => $availableYears,
                'generated_at_formatted' => $activePoster['meta']['generated_at_formatted'],
            ],
            'sekolah' => $activePoster['sekolah'],
            'aggregate' => [
                'total_pagu' => round($totalPagu, 2),
                'total_dana_diterima' => round($totalDanaDiterima, 2),
                'total_realisasi' => round($totalRealisasi, 2),
                'total_sisa_dana' => round($totalSisaDana, 2),
                'persentase_serapan' => min(100.0, max(0.0, $aggregateSerapanAktual)),
                'persentase_serapan_aktual' => $aggregateSerapanAktual,
                'active_variants_count' => $activeVariantsCount,
            ],
            'variants_summary' => $variantsSummary,
            'active' => $activePoster,
        ];
    }

    /**
     * Merakit data RKA Tahapan publik (RKAS Awal atau RKAS Perubahan) dengan whitelist ketat tanpa field sensitif.
     *
     * @return array<string, mixed>
     */
    public function buildRkaTahapan(string $variant = VariantConfig::REGULER, ?int $tahun = null, string $jenis = 'awal'): array
    {
        $resolvedVariant = VariantConfig::isValid($variant) ? $variant : VariantConfig::REGULER;
        $resolvedJenis = in_array($jenis, self::ALLOWED_JENIS_RKA, true) ? $jenis : 'awal';

        $availableYears = $this->collectGlobalAvailableYears();
        $resolvedTahun = $tahun && $tahun >= 2000 && $tahun <= 2100
            ? $tahun
            : ($availableYears[0] ?? (int) now()->year);

        $penganggaranClass = VariantConfig::getModelClass('penganggaran', $resolvedVariant);
        $rkasClass = VariantConfig::getModelClass('rkas', $resolvedVariant);
        $rkasPerubahanClass = VariantConfig::getModelClass('rkas_perubahan', $resolvedVariant);
        $penganggaranFk = VariantConfig::penganggaranFk($resolvedVariant);
        $supportsPerubahan = $rkasPerubahanClass !== null;

        $penganggaran = $penganggaranClass::query()
            ->where('tahun_anggaran', $resolvedTahun)
            ->first();

        if (! $penganggaran) {
            return $this->emptyRkaResponse(
                variant: $resolvedVariant,
                tahun: $resolvedTahun,
                jenis: $resolvedJenis,
                supportsPerubahan: $supportsPerubahan,
                reason: 'not_found',
                message: 'Data penganggaran belum tersedia untuk varian dan tahun anggaran ini.',
            );
        }

        $statusPersetujuan = $penganggaran->status_persetujuan === 'disetujui' ? 'disetujui' : 'draft';
        $sumberDana = trim((string) ($penganggaran->sumber_dana ?? '')) ?: VariantConfig::title($resolvedVariant);
        $paguAnggaran = round((float) ($penganggaran->pagu_anggaran ?? 0), 2);
        $tanggalDokumen = $resolvedJenis === 'perubahan'
            ? ($penganggaran->tanggal_perubahan ?? $penganggaran->tanggal_persetujuan ?? null)
            : ($penganggaran->tanggal_persetujuan ?? $penganggaran->tanggal_cetak ?? null);
        $tanggalFormatted = $tanggalDokumen
            ? Carbon::parse($tanggalDokumen)->locale('id')->translatedFormat('d F Y')
            : null;

        if ($resolvedJenis === 'perubahan' && ! $supportsPerubahan) {
            return $this->emptyRkaResponse(
                variant: $resolvedVariant,
                tahun: $resolvedTahun,
                jenis: $resolvedJenis,
                supportsPerubahan: false,
                reason: 'unsupported_variant',
                message: 'Varian '.VariantConfig::title($resolvedVariant).' tidak memiliki tahapan RKAS Perubahan.',
                sumberDana: $sumberDana,
                paguAnggaran: $paguAnggaran,
                statusPersetujuan: $statusPersetujuan,
                tanggalFormatted: $tanggalFormatted,
            );
        }

        $murniRows = $this->queryPublicRkaRows($rkasClass, $penganggaranFk, $penganggaran->id);

        if ($resolvedJenis === 'awal') {
            if ($murniRows->isEmpty()) {
                return $this->emptyRkaResponse(
                    variant: $resolvedVariant,
                    tahun: $resolvedTahun,
                    jenis: 'awal',
                    supportsPerubahan: $supportsPerubahan,
                    reason: 'empty_rkas',
                    message: 'Rincian RKAS Awal belum tersedia untuk tahun anggaran ini.',
                    sumberDana: $sumberDana,
                    paguAnggaran: $paguAnggaran,
                    statusPersetujuan: $statusPersetujuan,
                    tanggalFormatted: $tanggalFormatted,
                );
            }

            [$programs, $totals] = $this->assembleRkaHierarchy($murniRows, null);

            return [
                'meta' => [
                    'variant' => $resolvedVariant,
                    'variant_label' => VariantConfig::title($resolvedVariant),
                    'tahun' => $resolvedTahun,
                    'jenis' => 'awal',
                    'has_data' => true,
                    'supports_perubahan' => $supportsPerubahan,
                    'reason' => null,
                    'message' => null,
                    'sumber_dana' => $sumberDana,
                    'pagu_anggaran' => $paguAnggaran,
                    'status_persetujuan' => $statusPersetujuan,
                    'status_label' => $this->formatStatusLabel($statusPersetujuan),
                    'tanggal_dokumen_formatted' => $tanggalFormatted,
                ],
                'totals' => $totals,
                'programs' => $programs,
            ];
        }

        // RKAS Perubahan (reguler & kinerja)
        $perubahanRows = $this->queryPublicRkaRows($rkasPerubahanClass, $penganggaranFk, $penganggaran->id);

        if ($perubahanRows->isEmpty()) {
            return $this->emptyRkaResponse(
                variant: $resolvedVariant,
                tahun: $resolvedTahun,
                jenis: 'perubahan',
                supportsPerubahan: true,
                reason: 'no_perubahan',
                message: 'RKAS Perubahan belum tersedia untuk tahun anggaran ini.',
                sumberDana: $sumberDana,
                paguAnggaran: $paguAnggaran,
                statusPersetujuan: $statusPersetujuan,
                tanggalFormatted: $tanggalFormatted,
            );
        }

        [$programs, $totals] = $this->assembleRkaHierarchy($perubahanRows, $murniRows);

        return [
            'meta' => [
                'variant' => $resolvedVariant,
                'variant_label' => VariantConfig::title($resolvedVariant),
                'tahun' => $resolvedTahun,
                'jenis' => 'perubahan',
                'has_data' => true,
                'supports_perubahan' => true,
                'reason' => null,
                'message' => null,
                'sumber_dana' => $sumberDana,
                'pagu_anggaran' => $paguAnggaran,
                'status_persetujuan' => $statusPersetujuan,
                'status_label' => $this->formatStatusLabel($statusPersetujuan),
                'tanggal_dokumen_formatted' => $tanggalFormatted,
            ],
            'totals' => $totals,
            'programs' => $programs,
        ];
    }

    /**
     * Mengumpulkan daftar tahun anggaran unik lintas seluruh 4 varian, urut terbaru.
     *
     * @return list<int>
     */
    protected function collectGlobalAvailableYears(): array
    {
        $years = [];

        foreach (VariantConfig::VARIANTS as $variant) {
            try {
                $modelClass = VariantConfig::getModelClass('penganggaran', $variant);
                $table = (new $modelClass)->getTable();
                if (! Schema::hasTable($table)) {
                    continue;
                }

                $found = $modelClass::query()
                    ->toBase()
                    ->pluck('tahun_anggaran')
                    ->map(static fn ($y) => (int) $y)
                    ->filter(static fn (int $y) => $y >= 2000 && $y <= 2100)
                    ->all();

                foreach ($found as $y) {
                    $years[$y] = $y;
                }
            } catch (Throwable) {
                continue;
            }
        }

        krsort($years);

        return array_values($years);
    }

    /**
     * Mengecek ketersediaan data RKAS Awal & RKAS Perubahan untuk varian dan tahun tertentu.
     *
     * @return array{has_rkas_awal: bool, has_rkas_perubahan: bool, supports_perubahan: bool, tanggal_perubahan_formatted: ?string}
     */
    protected function resolveRkaAvailability(string $variant, int $tahun): array
    {
        $penganggaranClass = VariantConfig::getModelClass('penganggaran', $variant);
        $rkasClass = VariantConfig::getModelClass('rkas', $variant);
        $rkasPerubahanClass = VariantConfig::getModelClass('rkas_perubahan', $variant);
        $penganggaranFk = VariantConfig::penganggaranFk($variant);
        $supportsPerubahan = $rkasPerubahanClass !== null;

        try {
            $penganggaran = $penganggaranClass::query()
                ->where('tahun_anggaran', $tahun)
                ->first();

            if (! $penganggaran) {
                return [
                    'has_rkas_awal' => false,
                    'has_rkas_perubahan' => false,
                    'supports_perubahan' => $supportsPerubahan,
                    'tanggal_perubahan_formatted' => null,
                ];
            }

            $hasAwal = $rkasClass::query()->where($penganggaranFk, $penganggaran->id)->exists();
            $hasPerubahan = $supportsPerubahan
                ? $rkasPerubahanClass::query()->where($penganggaranFk, $penganggaran->id)->exists()
                : false;

            $tanggalPerubahan = ! empty($penganggaran->tanggal_perubahan)
                ? Carbon::parse($penganggaran->tanggal_perubahan)->locale('id')->translatedFormat('d F Y')
                : null;

            return [
                'has_rkas_awal' => $hasAwal,
                'has_rkas_perubahan' => $hasPerubahan,
                'supports_perubahan' => $supportsPerubahan,
                'tanggal_perubahan_formatted' => $tanggalPerubahan,
            ];
        } catch (Throwable) {
            return [
                'has_rkas_awal' => false,
                'has_rkas_perubahan' => false,
                'supports_perubahan' => $supportsPerubahan,
                'tanggal_perubahan_formatted' => null,
            ];
        }
    }

    /**
     * Mengambil baris RKAS publik hanya dengan kolom non-sensitif.
     *
     * @param  class-string  $modelClass
     * @return Collection<int, mixed>
     */
    protected function queryPublicRkaRows(string $modelClass, string $penganggaranFk, int $penganggaranId): Collection
    {
        return $modelClass::query()
            ->where($penganggaranFk, $penganggaranId)
            ->with([
                'kodeKegiatan:id,kode,program,sub_program,uraian',
                'rekeningBelanja:id,kode_rekening,rincian_objek',
            ])
            ->orderBy('id')
            ->get([
                'id',
                $penganggaranFk,
                'kode_id',
                'kode_rekening_id',
                'uraian',
                'uraian_arkas',
                'satuan',
                'jumlah',
                'harga_satuan',
                'bulan',
            ]);
    }

    /**
     * @return array{alamat: string, kabupaten_kota: string, provinsi: string}
     */
    protected function resolveSekolahLocation(): array
    {
        try {
            if (! Schema::hasTable('sekolahs')) {
                return ['alamat' => '', 'kabupaten_kota' => '', 'provinsi' => ''];
            }
            $sekolah = SekolahProfile::query()->first(['alamat', 'kabupaten_kota', 'provinsi']);

            return [
                'alamat' => (string) ($sekolah?->alamat ?? ''),
                'kabupaten_kota' => (string) ($sekolah?->kabupaten_kota ?? ''),
                'provinsi' => (string) ($sekolah?->provinsi ?? ''),
            ];
        } catch (Throwable) {
            return ['alamat' => '', 'kabupaten_kota' => '', 'provinsi' => ''];
        }
    }

    /**
     * Menyusun payload poster publik dengan whitelist eksplisit (menghapus seluruh field sensitif termasuk NIP).
     *
     * @param  array<string, mixed>  $rawPoster
     * @param  array{has_rkas_awal: bool, has_rkas_perubahan: bool, supports_perubahan: bool, tanggal_perubahan_formatted: ?string}  $rkaAvailability
     * @param  array{alamat: string, kabupaten_kota: string, provinsi: string}  $sekolahLocation
     * @return array<string, mixed>
     */
    protected function sanitizePosterPayload(array $rawPoster, array $rkaAvailability, array $sekolahLocation): array
    {
        $status = (string) ($rawPoster['ringkasan']['status_persetujuan'] ?? 'draft');
        $meta = $rawPoster['meta'] ?? [];
        $sekolah = $rawPoster['sekolah'] ?? [];
        $ringkasan = $rawPoster['ringkasan'] ?? [];
        $pj = $rawPoster['penanggung_jawab'] ?? [];

        return [
            'meta' => [
                'variant' => (string) ($meta['variant'] ?? VariantConfig::REGULER),
                'variant_label' => (string) ($meta['variant_label'] ?? VariantConfig::title(VariantConfig::REGULER)),
                'tahun' => (int) ($meta['tahun'] ?? now()->year),
                'periode' => (string) ($meta['periode'] ?? 'tahunan'),
                'periode_label' => (string) ($meta['periode_label'] ?? ''),
                'available_years' => array_values((array) ($meta['available_years'] ?? [])),
                'has_data' => (bool) ($meta['has_data'] ?? false),
                'generated_at_formatted' => (string) ($meta['generated_at_formatted'] ?? ''),
                'has_rkas_awal' => $rkaAvailability['has_rkas_awal'],
                'has_rkas_perubahan' => $rkaAvailability['has_rkas_perubahan'],
                'supports_perubahan' => $rkaAvailability['supports_perubahan'],
                'tanggal_perubahan_formatted' => $rkaAvailability['tanggal_perubahan_formatted'],
            ],
            'sekolah' => [
                'nama_sekolah' => (string) ($sekolah['nama_sekolah'] ?? 'Nama Sekolah Belum Diatur'),
                'npsn' => (string) ($sekolah['npsn'] ?? '-'),
                'status_sekolah' => (string) ($sekolah['status_sekolah'] ?? ''),
                'jenjang_sekolah' => (string) ($sekolah['jenjang_sekolah'] ?? ''),
                'alamat' => $sekolahLocation['alamat'],
                'alamat_lengkap' => (string) ($sekolah['alamat_lengkap'] ?? ''),
                'kabupaten_kota' => (string) ($sekolah['kabupaten_kota'] ?? $sekolahLocation['kabupaten_kota']),
                'provinsi' => $sekolahLocation['provinsi'],
                'logo_daerah_data_uri' => $sekolah['logo_daerah_data_uri'] ?? null,
                'logo_sekolah_data_uri' => $sekolah['logo_sekolah_data_uri'] ?? null,
            ],
            'ringkasan' => [
                'pagu_anggaran' => (float) ($ringkasan['pagu_anggaran'] ?? 0),
                'dana_diterima' => (float) ($ringkasan['dana_diterima'] ?? 0),
                'total_realisasi' => (float) ($ringkasan['total_realisasi'] ?? 0),
                'sisa_dana' => (float) ($ringkasan['sisa_dana'] ?? 0),
                'sisa_pagu' => (float) ($ringkasan['sisa_pagu'] ?? 0),
                'persentase_serapan' => (float) ($ringkasan['persentase_serapan'] ?? 0),
                'persentase_serapan_aktual' => (float) ($ringkasan['persentase_serapan_aktual'] ?? 0),
                'jumlah_transaksi' => (int) ($ringkasan['jumlah_transaksi'] ?? 0),
                'status_persetujuan' => $status === 'disetujui' ? 'disetujui' : 'draft',
                'status_label' => $this->formatStatusLabel($status),
                'tanggal_persetujuan_formatted' => $ringkasan['tanggal_persetujuan_formatted'] ?? null,
            ],
            'jenis_belanja' => array_values((array) ($rawPoster['jenis_belanja'] ?? [])),
            'program_snp' => array_values((array) ($rawPoster['program_snp'] ?? [])),
            'tren_bulanan' => array_values((array) ($rawPoster['tren_bulanan'] ?? [])),
            'penanggung_jawab' => [
                'kepala_sekolah' => (string) ($pj['kepala_sekolah'] ?? 'Belum diisi'),
                'bendahara' => (string) ($pj['bendahara'] ?? 'Belum diisi'),
                'komite' => (string) ($pj['komite'] ?? 'Ketua Komite Sekolah'),
            ],
        ];
    }

    /**
     * Merakit hierarki Program → Sub-Program → Uraian Kegiatan → Items yang terurut dan bersih dari field sensitif.
     *
     * @param  Collection<int, mixed>  $primaryRows  Baris RKAS Awal (mode awal) atau RKAS Perubahan (mode perubahan)
     * @param  Collection<int, mixed>|null  $murniRows  Baris RKAS Murni pembanding (hanya untuk mode perubahan)
     * @return array{0: list<array<string, mixed>>, 1: array<string, mixed>}
     */
    protected function assembleRkaHierarchy(Collection $primaryRows, ?Collection $murniRows): array
    {
        $isComparison = $murniRows !== null;

        $groupedPrimary = $primaryRows->groupBy(
            static fn ($item) => trim((string) ($item->kodeKegiatan?->kode ?? '00.00.00')) ?: '00.00.00'
        );
        $groupedMurni = $isComparison
            ? $murniRows->groupBy(
                static fn ($item) => trim((string) ($item->kodeKegiatan?->kode ?? '00.00.00')) ?: '00.00.00'
            )
            : collect();

        $allKodes = $groupedPrimary->keys()
            ->merge($groupedMurni->keys())
            ->unique()
            ->sort()
            ->values();

        $tree = [];
        $grandJumlahMurni = 0.0;
        $grandJumlah = 0.0;
        $grandBertambah = 0.0;
        $grandBerkurang = 0.0;
        $grandTahap1 = 0.0;
        $grandTahap2 = 0.0;
        $totalItems = 0;
        $changedItems = 0;

        foreach ($allKodes as $kode) {
            /** @var Collection<int, mixed> $itemsPrimary */
            $itemsPrimary = $groupedPrimary->get($kode) ?? collect();
            /** @var Collection<int, mixed> $itemsMurni */
            $itemsMurni = $groupedMurni->get($kode) ?? collect();

            if ($itemsPrimary->isEmpty() && $itemsMurni->isEmpty()) {
                continue;
            }

            $firstItem = $itemsPrimary->first() ?? $itemsMurni->first();
            $parts = explode('.', (string) $kode);
            $progCode = $parts[0] !== '' ? $parts[0] : '00';
            $subCode = count($parts) > 1 ? $parts[0].'.'.$parts[1] : $progCode.'.00';
            $urCode = (string) $kode;

            if (! isset($tree[$progCode])) {
                $tree[$progCode] = [
                    'kode' => $progCode,
                    'uraian' => trim((string) ($firstItem->kodeKegiatan?->program ?? '')) ?: 'Program Kegiatan',
                    'jumlah_murni' => 0.0,
                    'jumlah' => 0.0,
                    'bertambah' => 0.0,
                    'berkurang' => 0.0,
                    'tahap1' => 0.0,
                    'tahap2' => 0.0,
                    'sub_programs' => [],
                ];
            }

            if (! isset($tree[$progCode]['sub_programs'][$subCode])) {
                $tree[$progCode]['sub_programs'][$subCode] = [
                    'kode' => $subCode,
                    'uraian' => trim((string) ($firstItem->kodeKegiatan?->sub_program ?? '')) ?: 'Sub-Program Kegiatan',
                    'jumlah_murni' => 0.0,
                    'jumlah' => 0.0,
                    'bertambah' => 0.0,
                    'berkurang' => 0.0,
                    'tahap1' => 0.0,
                    'tahap2' => 0.0,
                    'uraian_programs' => [],
                ];
            }

            if (! isset($tree[$progCode]['sub_programs'][$subCode]['uraian_programs'][$urCode])) {
                $tree[$progCode]['sub_programs'][$subCode]['uraian_programs'][$urCode] = [
                    'kode' => $urCode,
                    'uraian' => trim((string) ($firstItem->kodeKegiatan?->uraian ?? '')) ?: 'Uraian Kegiatan',
                    'jumlah_murni' => 0.0,
                    'jumlah' => 0.0,
                    'bertambah' => 0.0,
                    'berkurang' => 0.0,
                    'tahap1' => 0.0,
                    'tahap2' => 0.0,
                    'items' => [],
                ];
            }

            $groupedItems = [];

            // 1. Proses Murni (khusus mode RKAS Perubahan)
            if ($isComparison) {
                foreach ($itemsMurni as $item) {
                    $kodeRekening = trim((string) ($item->rekeningBelanja?->kode_rekening ?? '-')) ?: '-';
                    $tarif = (float) ($item->harga_satuan ?? 0);
                    $resolvedUraian = $this->resolvePublicUraian($item);
                    $key = $this->buildItemGroupingKey($kodeRekening, $resolvedUraian, $tarif);

                    if (! isset($groupedItems[$key])) {
                        $groupedItems[$key] = $this->initPublicItem(
                            kodeRekening: $kodeRekening,
                            kodeKegiatan: $urCode,
                            programCode: $subCode,
                            uraian: $resolvedUraian,
                            satuan: trim((string) ($item->satuan ?? '-')) ?: '-',
                            tarif: $tarif,
                        );
                    }

                    $vol = (float) ($item->jumlah ?? 0);
                    $groupedItems[$key]['volume_murni'] += $vol;
                    $groupedItems[$key]['jumlah_murni'] += $vol * $tarif;
                }
            }

            // 2. Proses Primary (RKAS Awal pada mode awal, atau RKAS Perubahan pada mode perubahan)
            foreach ($itemsPrimary as $item) {
                $kodeRekening = trim((string) ($item->rekeningBelanja?->kode_rekening ?? '-')) ?: '-';
                $tarif = (float) ($item->harga_satuan ?? 0);
                $resolvedUraian = $this->resolvePublicUraian($item);
                $key = $this->buildItemGroupingKey($kodeRekening, $resolvedUraian, $tarif);

                if (! isset($groupedItems[$key])) {
                    $groupedItems[$key] = $this->initPublicItem(
                        kodeRekening: $kodeRekening,
                        kodeKegiatan: $urCode,
                        programCode: $subCode,
                        uraian: $resolvedUraian,
                        satuan: trim((string) ($item->satuan ?? '-')) ?: '-',
                        tarif: $tarif,
                    );
                }

                $vol = (float) ($item->jumlah ?? 0);
                $nominal = $vol * $tarif;
                $isTahap1 = in_array(trim((string) ($item->bulan ?? '')), self::TAHAP_1_BULAN, true);

                $groupedItems[$key]['volume'] += $vol;
                $groupedItems[$key]['jumlah'] += $nominal;
                if ($isTahap1) {
                    $groupedItems[$key]['tahap1'] += $nominal;
                } else {
                    $groupedItems[$key]['tahap2'] += $nominal;
                }
            }

            // 3. Finalisasi item (selisih, pembulatan, dan status perubahan)
            $finalItems = [];
            foreach ($groupedItems as $entry) {
                $jumlahMurni = round((float) $entry['jumlah_murni'], 2);
                $jumlah = round((float) $entry['jumlah'], 2);
                $tahap1 = round((float) $entry['tahap1'], 2);
                $tahap2 = round((float) $entry['tahap2'], 2);

                $bertambah = $isComparison ? round(max(0.0, $jumlah - $jumlahMurni), 2) : 0.0;
                $berkurang = $isComparison ? round(max(0.0, $jumlahMurni - $jumlah), 2) : 0.0;
                $statusPerubahan = $isComparison
                    ? $this->classifyChangeStatus($jumlahMurni, $jumlah)
                    : 'tetap';

                $publicItem = [
                    'kode_rekening' => $entry['kode_rekening'],
                    'kode_kegiatan' => $entry['kode_kegiatan'],
                    'program_code' => $entry['program_code'],
                    'uraian' => $entry['uraian'],
                    'satuan' => $entry['satuan'],
                    'tarif' => round((float) $entry['tarif'], 2),
                    'volume_murni' => $isComparison ? round((float) $entry['volume_murni'], 2) : 0.0,
                    'jumlah_murni' => $isComparison ? $jumlahMurni : 0.0,
                    'volume' => round((float) $entry['volume'], 2),
                    'jumlah' => $jumlah,
                    'bertambah' => $bertambah,
                    'berkurang' => $berkurang,
                    'tahap1' => $tahap1,
                    'tahap2' => $tahap2,
                    'status_perubahan' => $statusPerubahan,
                ];

                $finalItems[] = $publicItem;
                $totalItems++;
                if ($statusPerubahan !== 'tetap') {
                    $changedItems++;
                }

                // Akumulasi ke node Uraian, Sub-Program, Program, & Grand Total
                $urNode = &$tree[$progCode]['sub_programs'][$subCode]['uraian_programs'][$urCode];
                $subNode = &$tree[$progCode]['sub_programs'][$subCode];
                $progNode = &$tree[$progCode];

                foreach ([&$urNode, &$subNode, &$progNode] as &$node) {
                    $node['jumlah_murni'] += $publicItem['jumlah_murni'];
                    $node['jumlah'] += $publicItem['jumlah'];
                    $node['bertambah'] += $publicItem['bertambah'];
                    $node['berkurang'] += $publicItem['berkurang'];
                    $node['tahap1'] += $publicItem['tahap1'];
                    $node['tahap2'] += $publicItem['tahap2'];
                }
                unset($node, $urNode, $subNode, $progNode);

                $grandJumlahMurni += $publicItem['jumlah_murni'];
                $grandJumlah += $publicItem['jumlah'];
                $grandBertambah += $publicItem['bertambah'];
                $grandBerkurang += $publicItem['berkurang'];
                $grandTahap1 += $publicItem['tahap1'];
                $grandTahap2 += $publicItem['tahap2'];
            }

            usort(
                $finalItems,
                static fn (array $a, array $b): int => [$a['kode_rekening'], $a['uraian']] <=> [$b['kode_rekening'], $b['uraian']]
            );

            $tree[$progCode]['sub_programs'][$subCode]['uraian_programs'][$urCode]['items'] = $finalItems;
        }

        // Konversi tree asosiatif ke array list terurut dengan angka dibulatkan rapi
        ksort($tree);
        $programs = [];
        foreach ($tree as $prog) {
            ksort($prog['sub_programs']);
            $subList = [];
            foreach ($prog['sub_programs'] as $sub) {
                ksort($sub['uraian_programs']);
                $urList = [];
                foreach ($sub['uraian_programs'] as $ur) {
                    $urList[] = $this->roundNodeTotals($ur);
                }
                $sub['uraian_programs'] = $urList;
                $subList[] = $this->roundNodeTotals($sub);
            }
            $prog['sub_programs'] = $subList;
            $programs[] = $this->roundNodeTotals($prog);
        }

        $totals = [
            'jumlah_murni' => round($grandJumlahMurni, 2),
            'jumlah' => round($grandJumlah, 2),
            'bertambah' => round($grandBertambah, 2),
            'berkurang' => round($grandBerkurang, 2),
            'tahap1' => round($grandTahap1, 2),
            'tahap2' => round($grandTahap2, 2),
            'total_items' => $totalItems,
            'changed_items' => $changedItems,
        ];

        return [$programs, $totals];
    }

    protected function buildItemGroupingKey(string $kodeRekening, string $uraian, float $tarif): string
    {
        return $kodeRekening.'-'.trim($uraian).'-'.number_format($tarif, 2, '.', '');
    }

    protected function resolvePublicUraian(object $item): string
    {
        if (isset($item->uraian) && is_string($item->uraian) && trim($item->uraian) !== '') {
            return trim($item->uraian);
        }

        if (isset($item->uraian_arkas) && is_string($item->uraian_arkas) && trim($item->uraian_arkas) !== '') {
            return trim($item->uraian_arkas);
        }

        return '-';
    }

    /**
     * @return array<string, mixed>
     */
    protected function initPublicItem(
        string $kodeRekening,
        string $kodeKegiatan,
        string $programCode,
        string $uraian,
        string $satuan,
        float $tarif,
    ): array {
        return [
            'kode_rekening' => $kodeRekening,
            'kode_kegiatan' => $kodeKegiatan,
            'program_code' => $programCode,
            'uraian' => $uraian,
            'satuan' => $satuan,
            'tarif' => $tarif,
            'volume_murni' => 0.0,
            'jumlah_murni' => 0.0,
            'volume' => 0.0,
            'jumlah' => 0.0,
            'tahap1' => 0.0,
            'tahap2' => 0.0,
        ];
    }

    protected function classifyChangeStatus(float $jumlahMurni, float $jumlah): string
    {
        if ($jumlahMurni <= 0 && $jumlah > 0) {
            return 'baru';
        }
        if ($jumlahMurni > 0 && $jumlah <= 0) {
            return 'dihapus';
        }
        if ($jumlah > $jumlahMurni) {
            return 'naik';
        }
        if ($jumlah < $jumlahMurni) {
            return 'turun';
        }

        return 'tetap';
    }

    /**
     * @param  array<string, mixed>  $node
     * @return array<string, mixed>
     */
    protected function roundNodeTotals(array $node): array
    {
        foreach (['jumlah_murni', 'jumlah', 'bertambah', 'berkurang', 'tahap1', 'tahap2'] as $field) {
            $node[$field] = round((float) ($node[$field] ?? 0), 2);
        }

        return $node;
    }

    protected function formatStatusLabel(string $status): string
    {
        return $status === 'disetujui' ? 'Disetujui' : 'Dalam Penyusunan';
    }

    /**
     * @return array<string, mixed>
     */
    protected function emptyRkaResponse(
        string $variant,
        int $tahun,
        string $jenis,
        bool $supportsPerubahan,
        string $reason,
        string $message,
        ?string $sumberDana = null,
        float $paguAnggaran = 0.0,
        string $statusPersetujuan = 'draft',
        ?string $tanggalFormatted = null,
    ): array {
        return [
            'meta' => [
                'variant' => $variant,
                'variant_label' => VariantConfig::title($variant),
                'tahun' => $tahun,
                'jenis' => $jenis,
                'has_data' => false,
                'supports_perubahan' => $supportsPerubahan,
                'reason' => $reason,
                'message' => $message,
                'sumber_dana' => $sumberDana ?? VariantConfig::title($variant),
                'pagu_anggaran' => $paguAnggaran,
                'status_persetujuan' => $statusPersetujuan,
                'status_label' => $this->formatStatusLabel($statusPersetujuan),
                'tanggal_dokumen_formatted' => $tanggalFormatted,
            ],
            'totals' => [
                'jumlah_murni' => 0.0,
                'jumlah' => 0.0,
                'bertambah' => 0.0,
                'berkurang' => 0.0,
                'tahap1' => 0.0,
                'tahap2' => 0.0,
                'total_items' => 0,
                'changed_items' => 0,
            ],
            'programs' => [],
        ];
    }
}
