<?php

namespace App\Services;

use App\Config\VariantConfig;
use App\Models\SekolahProfile;
use Carbon\Carbon;
use Illuminate\Support\Facades\Storage;

class TransparansiPosterService
{
    public const ALLOWED_PERIODES = ['tahunan', 'tahap_1', 'tahap_2'];

    private const MAX_LOGO_BYTES = 4 * 1024 * 1024; // 4 MB (selaras dengan batas unggah SekolahProfileController)

    private const ALLOWED_LOGO_MIMES = [
        'image/png',
        'image/jpeg',
        'image/webp',
    ];

    private const BULAN_SHORT = [
        1 => 'Jan',
        2 => 'Feb',
        3 => 'Mar',
        4 => 'Apr',
        5 => 'Mei',
        6 => 'Jun',
        7 => 'Jul',
        8 => 'Agu',
        9 => 'Sep',
        10 => 'Okt',
        11 => 'Nov',
        12 => 'Des',
    ];

    /**
     * Merakit payload lengkap Poster Infografis Transparansi BOSP untuk varian, tahun, dan periode tertentu.
     *
     * @return array<string, mixed>
     */
    public function buildPosterData(string $variant, ?int $tahun = null, string $periode = 'tahunan'): array
    {
        $resolvedVariant = VariantConfig::isValid($variant) ? $variant : VariantConfig::REGULER;
        $resolvedPeriode = in_array($periode, self::ALLOWED_PERIODES, true) ? $periode : 'tahunan';

        $penganggaranClass = VariantConfig::getModelClass('penganggaran', $resolvedVariant);
        $penerimaanClass = VariantConfig::getModelClass('penerimaan_dana', $resolvedVariant);
        $bkuClass = VariantConfig::getModelClass('bku', $resolvedVariant);
        $penganggaranFk = VariantConfig::penganggaranFk($resolvedVariant);

        $availableYears = $penganggaranClass::query()
            ->orderByDesc('tahun_anggaran')
            ->toBase()
            ->pluck('tahun_anggaran')
            ->map(static fn ($y) => (int) $y)
            ->unique()
            ->values()
            ->all();

        $resolvedTahun = $tahun && $tahun >= 2000 && $tahun <= 2100
            ? $tahun
            : ($availableYears[0] ?? (int) now()->year);

        $penganggaran = $penganggaranClass::query()
            ->where('tahun_anggaran', $resolvedTahun)
            ->first();

        $sekolah = $penganggaran?->sekolah ?? SekolahProfile::query()->first();

        [$startMonth, $endMonth] = match ($resolvedPeriode) {
            'tahap_1' => [1, 6],
            'tahap_2' => [7, 12],
            default => [1, 12],
        };

        $startDate = Carbon::create($resolvedTahun, $startMonth, 1)->startOfMonth()->toDateString();
        $exclusiveEndDate = Carbon::create($resolvedTahun, $endMonth, 1)->addMonth()->startOfMonth()->toDateString();

        $periodeLabel = match ($resolvedPeriode) {
            'tahap_1' => "Tahap 1 (Januari – Juni {$resolvedTahun})",
            'tahap_2' => "Tahap 2 (Juli – Desember {$resolvedTahun})",
            default => "Tahun Anggaran {$resolvedTahun}",
        };

        $paguAnggaran = (float) ($penganggaran?->pagu_anggaran ?? 0);
        $danaDiterima = 0.0;
        $totalRealisasi = 0.0;
        $jumlahTransaksi = 0;

        $jenisTotals = [
            'pakai_habis' => 0.0,
            'barang_jasa' => 0.0,
            'modal_peralatan' => 0.0,
            'modal_aset_lain' => 0.0,
            'lainnya' => 0.0,
        ];

        $programTotals = [];
        $monthlyTotals = [];
        for ($m = $startMonth; $m <= $endMonth; $m++) {
            $monthlyTotals[$m] = 0.0;
        }

        if ($penganggaran) {
            // 1. Agregasi Penerimaan Dana sesuai periode
            $penerimaanRows = $penerimaanClass::query()
                ->where($penganggaranFk, $penganggaran->id)
                ->toBase()
                ->get(['sumber_dana', 'tanggal_terima', 'jumlah_dana', 'saldo_awal']);

            foreach ($penerimaanRows as $row) {
                $nominal = (float) ($row->jumlah_dana ?? 0) + (float) ($row->saldo_awal ?? 0);
                if ($nominal <= 0) {
                    continue;
                }

                if ($this->matchesPenerimaanPeriode($row, $resolvedPeriode, $startMonth, $endMonth)) {
                    $danaDiterima += $nominal;
                }
            }

            // 2. Agregasi Realisasi Belanja BKU (half-open bounds lintas PostgreSQL DATE & SQLite TEXT)
            $transaksiRows = $bkuClass::query()
                ->where($penganggaranFk, $penganggaran->id)
                ->where('tanggal_transaksi', '>=', $startDate)
                ->where('tanggal_transaksi', '<', $exclusiveEndDate)
                ->where(function ($q) {
                    $q->where('is_bunga_record', false)->orWhereNull('is_bunga_record');
                })
                ->with([
                    'rekeningBelanja:id,kode_rekening,rincian_objek',
                    'kodeKegiatan:id,kode,program,sub_program',
                ])
                ->get([
                    'id',
                    'tanggal_transaksi',
                    'total_transaksi_kotor',
                    'rekening_belanja_id',
                    'kode_kegiatan_id',
                ]);

            foreach ($transaksiRows as $trx) {
                $nominal = (float) ($trx->total_transaksi_kotor ?? 0);
                if ($nominal <= 0) {
                    continue;
                }

                $totalRealisasi += $nominal;
                $jumlahTransaksi++;

                // Tren bulanan
                if ($trx->tanggal_transaksi) {
                    $bulan = (int) Carbon::parse($trx->tanggal_transaksi)->month;
                    if (array_key_exists($bulan, $monthlyTotals)) {
                        $monthlyTotals[$bulan] += $nominal;
                    }
                }

                // Klasifikasi Jenis Belanja berdasar kode rekening BOSP
                $kodeRekening = trim((string) ($trx->rekeningBelanja?->kode_rekening ?? ''));
                $bucket = $this->classifyJenisBelanja($kodeRekening);
                $jenisTotals[$bucket] += $nominal;

                // Agregasi Program / Standar SNP
                $programName = trim((string) ($trx->kodeKegiatan?->program ?? ''));
                if ($programName === '') {
                    $programName = 'Program Kegiatan Lainnya';
                }
                if (! isset($programTotals[$programName])) {
                    $programTotals[$programName] = [
                        'program' => $programName,
                        'nominal' => 0.0,
                        'jumlah_transaksi' => 0,
                    ];
                }
                $programTotals[$programName]['nominal'] += $nominal;
                $programTotals[$programName]['jumlah_transaksi']++;
            }
        }

        $baseDana = $danaDiterima > 0 ? $danaDiterima : $paguAnggaran;
        $sisaDana = max(0.0, $baseDana - $totalRealisasi);
        $sisaPagu = max(0.0, $paguAnggaran - $totalRealisasi);

        $denominatorSerapan = $paguAnggaran > 0 ? $paguAnggaran : $danaDiterima;
        $persentaseAktual = $denominatorSerapan > 0
            ? round(($totalRealisasi / $denominatorSerapan) * 100, 1)
            : 0.0;
        $persentaseBar = min(100.0, max(0.0, $persentaseAktual));

        $jenisDefinitions = [
            'pakai_habis' => ['label' => 'Bahan Pakai Habis', 'color_key' => 'violet'],
            'barang_jasa' => ['label' => 'Barang & Jasa', 'color_key' => 'sky'],
            'modal_peralatan' => ['label' => 'Modal Peralatan & Mesin', 'color_key' => 'amber'],
            'modal_aset_lain' => ['label' => 'Modal Aset Tetap Lainnya', 'color_key' => 'mint'],
            'lainnya' => ['label' => 'Belanja Lainnya', 'color_key' => 'slate'],
        ];

        $jenisBelanja = [];
        foreach ($jenisDefinitions as $key => $meta) {
            $nom = $jenisTotals[$key];
            if ($key === 'lainnya' && $nom <= 0) {
                continue;
            }
            $jenisBelanja[] = [
                'key' => $key,
                'label' => $meta['label'],
                'nominal' => round($nom, 2),
                'persentase' => $totalRealisasi > 0 ? round(($nom / $totalRealisasi) * 100, 1) : 0.0,
                'color_key' => $meta['color_key'],
            ];
        }

        // Urutkan Program SNP dari nominal terbesar; maks 7 teratas + 1 agregat Lainnya
        usort($programTotals, static fn (array $a, array $b): int => $b['nominal'] <=> $a['nominal']);

        $displayPrograms = $programTotals;
        if (count($programTotals) > 8) {
            $rest = array_slice($programTotals, 7);
            $displayPrograms = array_merge(
                array_slice($programTotals, 0, 7),
                [[
                    'program' => 'Program Lainnya ('.count($rest).' program)',
                    'nominal' => (float) array_sum(array_column($rest, 'nominal')),
                    'jumlah_transaksi' => (int) array_sum(array_column($rest, 'jumlah_transaksi')),
                ]],
            );
        }

        $programSnp = array_map(static fn (array $item): array => [
            'program' => $item['program'],
            'nominal' => round($item['nominal'], 2),
            'persentase' => $totalRealisasi > 0 ? round(($item['nominal'] / $totalRealisasi) * 100, 1) : 0.0,
            'jumlah_transaksi' => $item['jumlah_transaksi'],
        ], $displayPrograms);

        $trenBulanan = [];
        foreach ($monthlyTotals as $bulan => $nominal) {
            $trenBulanan[] = [
                'bulan' => $bulan,
                'label' => self::BULAN_SHORT[$bulan] ?? (string) $bulan,
                'nominal' => round($nominal, 2),
            ];
        }

        $alamatParts = array_values(array_filter([
            $sekolah?->alamat,
            $sekolah?->kelurahan_desa ? 'Desa/Kel. '.$sekolah->kelurahan_desa : null,
            $sekolah?->kecamatan ? 'Kec. '.$sekolah->kecamatan : null,
            $sekolah?->kabupaten_kota,
            $sekolah?->provinsi,
        ], static fn ($part) => is_string($part) && trim($part) !== ''));

        $statusPersetujuan = $penganggaran?->status_persetujuan === 'disetujui' ? 'disetujui' : 'draft';
        $tanggalPersetujuan = $penganggaran?->tanggal_persetujuan
            ? Carbon::parse($penganggaran->tanggal_persetujuan)->locale('id')->translatedFormat('d F Y')
            : null;

        return [
            'meta' => [
                'variant' => $resolvedVariant,
                'variant_label' => VariantConfig::title($resolvedVariant),
                'tahun' => $resolvedTahun,
                'periode' => $resolvedPeriode,
                'periode_label' => $periodeLabel,
                'available_years' => $availableYears,
                'has_data' => $penganggaran !== null,
                'generated_at_formatted' => now()->locale('id')->translatedFormat('d F Y'),
            ],
            'sekolah' => [
                'nama_sekolah' => $sekolah?->nama_sekolah ?: 'Nama Sekolah Belum Diatur',
                'npsn' => $sekolah?->npsn ?: '-',
                'status_sekolah' => $sekolah?->status_sekolah ?: '',
                'jenjang_sekolah' => $sekolah?->jenjang_sekolah ?: '',
                'alamat_lengkap' => implode(', ', $alamatParts),
                'kabupaten_kota' => $sekolah?->kabupaten_kota ?: '',
                'logo_daerah_data_uri' => $this->toSafeImageDataUri($sekolah?->logo_daerah),
                'logo_sekolah_data_uri' => $this->toSafeImageDataUri($sekolah?->logo_sekolah),
            ],
            'ringkasan' => [
                'pagu_anggaran' => round($paguAnggaran, 2),
                'dana_diterima' => round($danaDiterima, 2),
                'total_realisasi' => round($totalRealisasi, 2),
                'sisa_dana' => round($sisaDana, 2),
                'sisa_pagu' => round($sisaPagu, 2),
                'persentase_serapan' => $persentaseBar,
                'persentase_serapan_aktual' => $persentaseAktual,
                'jumlah_transaksi' => $jumlahTransaksi,
                'status_persetujuan' => $statusPersetujuan,
                'tanggal_persetujuan_formatted' => $tanggalPersetujuan,
            ],
            'jenis_belanja' => $jenisBelanja,
            'program_snp' => $programSnp,
            'tren_bulanan' => $trenBulanan,
            'penanggung_jawab' => [
                'kepala_sekolah' => $penganggaran?->kepala_sekolah ?: 'Belum diisi',
                'nip_kepala_sekolah' => $penganggaran?->nip_kepala_sekolah ?: '-',
                'bendahara' => $penganggaran?->bendahara ?: 'Belum diisi',
                'nip_bendahara' => $penganggaran?->nip_bendahara ?: '-',
                'komite' => $penganggaran?->komite ?: 'Ketua Komite Sekolah',
            ],
        ];
    }

    protected function classifyJenisBelanja(string $kodeRekening): string
    {
        if (str_starts_with($kodeRekening, '5.1.02.01')) {
            return 'pakai_habis';
        }
        if (
            str_starts_with($kodeRekening, '5.1.02.02')
            || str_starts_with($kodeRekening, '5.1.02.03')
            || str_starts_with($kodeRekening, '5.1.02.04')
        ) {
            return 'barang_jasa';
        }
        if (str_starts_with($kodeRekening, '5.2.02')) {
            return 'modal_peralatan';
        }
        if (str_starts_with($kodeRekening, '5.2.05')) {
            return 'modal_aset_lain';
        }

        return 'lainnya';
    }

    protected function matchesPenerimaanPeriode(object $row, string $periode, int $startMonth, int $endMonth): bool
    {
        if ($periode === 'tahunan') {
            return true;
        }

        $sumber = strtolower((string) ($row->sumber_dana ?? ''));
        if ($periode === 'tahap_1' && str_contains($sumber, 'tahap 1')) {
            return true;
        }
        if ($periode === 'tahap_2' && str_contains($sumber, 'tahap 2')) {
            return true;
        }
        if (
            ($periode === 'tahap_1' && str_contains($sumber, 'tahap 2'))
            || ($periode === 'tahap_2' && str_contains($sumber, 'tahap 1'))
        ) {
            return false;
        }

        if (! empty($row->tanggal_terima)) {
            $bulan = (int) Carbon::parse((string) $row->tanggal_terima)->month;

            return $bulan >= $startMonth && $bulan <= $endMonth;
        }

        return true;
    }

    /**
     * Konversi berkas logo di disk public menjadi data URI base64 agar aman dari CORS saat ekspor PNG HD.
     */
    protected function toSafeImageDataUri(?string $relativePath): ?string
    {
        if (! is_string($relativePath) || trim($relativePath) === '' || str_contains($relativePath, "\0")) {
            return null;
        }

        $cleanPath = ltrim(str_replace('\\', '/', trim($relativePath)), '/');
        if (str_contains($cleanPath, '..')) {
            return null;
        }

        $disk = Storage::disk('public');
        if (! $disk->exists($cleanPath)) {
            return null;
        }

        $rootReal = realpath($disk->path(''));
        $fullReal = realpath($disk->path($cleanPath));
        if ($rootReal === false || $fullReal === false) {
            return null;
        }

        $normalizedRoot = rtrim($rootReal, DIRECTORY_SEPARATOR).DIRECTORY_SEPARATOR;
        if (! str_starts_with($fullReal, $normalizedRoot) || ! is_file($fullReal)) {
            return null;
        }

        $size = filesize($fullReal);
        if ($size === false || $size <= 0 || $size > self::MAX_LOGO_BYTES) {
            return null;
        }

        $mime = mime_content_type($fullReal);
        if (! is_string($mime) || ! in_array($mime, self::ALLOWED_LOGO_MIMES, true)) {
            return null;
        }

        $contents = file_get_contents($fullReal);
        if (! is_string($contents) || $contents === '') {
            return null;
        }

        return 'data:'.$mime.';base64,'.base64_encode($contents);
    }
}
