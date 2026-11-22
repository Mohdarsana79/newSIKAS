<?php

namespace App\Services;

use App\Config\VariantConfig;
use App\Models\SekolahProfile;
use Carbon\Carbon;
use Illuminate\Support\Facades\Schema;
use Throwable;

class WelcomeSummaryService
{
    private const SHORT_LABELS = [
        VariantConfig::REGULER => 'BOSP Reguler',
        VariantConfig::KINERJA => 'BOSP Kinerja',
        VariantConfig::SILPA => 'SiLPA Reguler',
        VariantConfig::KINERJA_SILPA => 'SiLPA Kinerja',
    ];

    /**
     * Merakit ringkasan data real aplikasi untuk halaman Welcome (publik, tanpa data sensitif).
     *
     * @return array<string, mixed>
     */
    public function buildSummary(): array
    {
        $tahun = $this->resolveLatestYear();
        $school = $this->resolvePublicSchoolIdentity();

        $variants = [];
        $totalTransaksiBku = 0;
        $totalPagu = 0.0;
        $totalRealisasi = 0.0;
        $anyHasData = false;

        foreach (VariantConfig::VARIANTS as $variant) {
            $summary = $this->buildVariantSummary($variant, $tahun);
            $variants[] = $summary;

            if ($summary['has_data']) {
                $anyHasData = true;
                $totalTransaksiBku += $summary['jumlah_transaksi'];
                $totalPagu += $summary['pagu_anggaran'];
                $totalRealisasi += $summary['total_realisasi'];
            }
        }

        $persentaseSerapan = $totalPagu > 0
            ? round(($totalRealisasi / $totalPagu) * 100, 1)
            : 0.0;

        return [
            'tahun' => $tahun,
            'school' => $school,
            'variants' => $variants,
            'stats' => [
                'tahun' => $tahun,
                'has_data' => $anyHasData,
                'total_transaksi_bku' => $totalTransaksiBku,
                'total_pagu' => round($totalPagu, 2),
                'total_realisasi' => round($totalRealisasi, 2),
                'persentase_serapan' => $persentaseSerapan,
            ],
        ];
    }

    private function resolveLatestYear(): int
    {
        $latestYear = null;

        foreach (VariantConfig::VARIANTS as $variant) {
            try {
                $modelClass = VariantConfig::getModelClass('penganggaran', $variant);
                if (! $modelClass || ! class_exists($modelClass)) {
                    continue;
                }

                $table = (new $modelClass)->getTable();
                if (! Schema::hasTable($table)) {
                    continue;
                }

                $maxYear = $modelClass::query()->max('tahun_anggaran');
                if ($maxYear !== null && is_numeric($maxYear)) {
                    $yearInt = (int) $maxYear;
                    if ($latestYear === null || $yearInt > $latestYear) {
                        $latestYear = $yearInt;
                    }
                }
            } catch (Throwable) {
                continue;
            }
        }

        return $latestYear ?? (int) now()->year;
    }

    /**
     * @return array<string, string>|null
     */
    private function resolvePublicSchoolIdentity(): ?array
    {
        try {
            $table = (new SekolahProfile)->getTable();
            if (! Schema::hasTable($table)) {
                return null;
            }

            $sekolah = SekolahProfile::query()->first([
                'nama_sekolah',
                'npsn',
                'jenjang_sekolah',
                'kabupaten_kota',
            ]);

            if (! $sekolah) {
                return null;
            }

            $namaSekolah = trim((string) ($sekolah->nama_sekolah ?? ''));
            if ($namaSekolah === '') {
                return null;
            }

            return [
                'nama_sekolah' => $namaSekolah,
                'npsn' => trim((string) ($sekolah->npsn ?? '')),
                'jenjang_sekolah' => trim((string) ($sekolah->jenjang_sekolah ?? '')),
                'kabupaten_kota' => trim((string) ($sekolah->kabupaten_kota ?? '')),
            ];
        } catch (Throwable) {
            return null;
        }
    }

    /**
     * @return array<string, mixed>
     */
    private function buildVariantSummary(string $variant, int $tahun): array
    {
        $emptyMonthly = array_fill(0, 12, 0.0);
        $title = VariantConfig::title($variant);
        $shortLabel = self::SHORT_LABELS[$variant] ?? $title;

        $base = [
            'key' => $variant,
            'label' => $title,
            'short_label' => $shortLabel,
            'has_data' => false,
            'tahun' => $tahun,
            'pagu_anggaran' => 0.0,
            'total_realisasi' => 0.0,
            'sisa_dana' => 0.0,
            'persentase_serapan' => 0.0,
            'jumlah_transaksi' => 0,
            'status_persetujuan' => 'kosong',
            'monthly_realisasi' => $emptyMonthly,
            'monthly_cumulative' => $emptyMonthly,
            'last_active_month_index' => 11,
        ];

        try {
            $penganggaranClass = VariantConfig::getModelClass('penganggaran', $variant);
            $bkuClass = VariantConfig::getModelClass('bku', $variant);
            $penganggaranFk = VariantConfig::penganggaranFk($variant);

            if (! $penganggaranClass || ! class_exists($penganggaranClass)) {
                return $base;
            }

            $penganggaranTable = (new $penganggaranClass)->getTable();
            if (! Schema::hasTable($penganggaranTable)) {
                return $base;
            }

            $penganggaran = $penganggaranClass::query()
                ->where('tahun_anggaran', $tahun)
                ->first(['id', 'pagu_anggaran', 'tahun_anggaran', 'status_persetujuan']);

            if (! $penganggaran) {
                return $base;
            }

            $pagu = (float) ($penganggaran->pagu_anggaran ?? 0);
            $monthlyRealisasi = array_fill(0, 12, 0.0);
            $totalRealisasi = 0.0;
            $jumlahTransaksi = 0;

            if ($bkuClass && class_exists($bkuClass)) {
                $bkuTable = (new $bkuClass)->getTable();
                if (Schema::hasTable($bkuTable)) {
                    $startDate = Carbon::create($tahun, 1, 1)->toDateString();
                    $exclusiveEndDate = Carbon::create($tahun + 1, 1, 1)->toDateString();

                    $rows = $bkuClass::query()
                        ->where($penganggaranFk, $penganggaran->id)
                        ->where('is_bunga_record', false)
                        ->where('tanggal_transaksi', '>=', $startDate)
                        ->where('tanggal_transaksi', '<', $exclusiveEndDate)
                        ->get(['tanggal_transaksi', 'total_transaksi_kotor']);

                    foreach ($rows as $row) {
                        $nominal = (float) ($row->total_transaksi_kotor ?? 0);
                        $totalRealisasi += $nominal;
                        $jumlahTransaksi++;

                        if ($row->tanggal_transaksi) {
                            $monthIdx = Carbon::parse($row->tanggal_transaksi)->month - 1;
                            if ($monthIdx >= 0 && $monthIdx < 12) {
                                $monthlyRealisasi[$monthIdx] += $nominal;
                            }
                        }
                    }
                }
            }

            $monthlyCumulative = [];
            $running = 0.0;
            $lastActiveMonthIndex = 11;
            $foundActiveMonth = false;

            for ($i = 0; $i < 12; $i++) {
                $monthlyRealisasi[$i] = round($monthlyRealisasi[$i], 2);
                $running += $monthlyRealisasi[$i];
                $monthlyCumulative[$i] = round($running, 2);

                if ($monthlyRealisasi[$i] > 0) {
                    $lastActiveMonthIndex = $i;
                    $foundActiveMonth = true;
                }
            }

            if (! $foundActiveMonth) {
                $lastActiveMonthIndex = 11;
            }

            $persentaseSerapan = $pagu > 0
                ? round(($totalRealisasi / $pagu) * 100, 1)
                : 0.0;

            $statusRaw = strtolower(trim((string) ($penganggaran->status_persetujuan ?? 'draft')));
            $status = $statusRaw === 'disetujui' ? 'disetujui' : 'draft';

            return [
                'key' => $variant,
                'label' => $title,
                'short_label' => $shortLabel,
                'has_data' => true,
                'tahun' => $tahun,
                'pagu_anggaran' => round($pagu, 2),
                'total_realisasi' => round($totalRealisasi, 2),
                'sisa_dana' => round(max(0.0, $pagu - $totalRealisasi), 2),
                'persentase_serapan' => $persentaseSerapan,
                'jumlah_transaksi' => $jumlahTransaksi,
                'status_persetujuan' => $status,
                'monthly_realisasi' => $monthlyRealisasi,
                'monthly_cumulative' => $monthlyCumulative,
                'last_active_month_index' => $lastActiveMonthIndex,
            ];
        } catch (Throwable) {
            return $base;
        }
    }
}
