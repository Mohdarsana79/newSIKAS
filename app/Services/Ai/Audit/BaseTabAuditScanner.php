<?php

namespace App\Services\Ai\Audit;

use App\Config\VariantConfig;
use App\Services\BukuKasService;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

abstract class BaseTabAuditScanner implements TabAuditScannerInterface
{
    protected BukuKasService $bukuKasService;

    public function __construct(BukuKasService $bukuKasService)
    {
        $this->bukuKasService = $bukuKasService;
    }

    /**
     * Mengurai tipe periode dan kunci periode menjadi rentang bulan angka dan label teks.
     *
     * @return array ['start' => int, 'end' => int, 'label' => string, 'is_single_month' => bool, 'bulan_angka' => ?int]
     */
    protected function resolveMonthRange(string $periodeType, string $periodeKey): array
    {
        $periodeType = strtolower(trim($periodeType));
        $periodeKey = strtolower(trim($periodeKey));

        if ($periodeType === 'tahapan' || $periodeType === 'tahap' || str_contains($periodeKey, 'tahap')) {
            if ($periodeKey === 'tahap_2' || $periodeKey === 'tahap 2' || $periodeKey === '2') {
                return [
                    'start' => 7,
                    'end' => 12,
                    'label' => 'Tahap 2 (Juli - Desember)',
                    'is_single_month' => false,
                    'bulan_angka' => null,
                ];
            }

            return [
                'start' => 1,
                'end' => 6,
                'label' => 'Tahap 1 (Januari - Juni)',
                'is_single_month' => false,
                'bulan_angka' => null,
            ];
        }

        if ($periodeType === 'tahunan' || $periodeKey === 'tahunan') {
            return [
                'start' => 1,
                'end' => 12,
                'label' => 'Tahun Penuh (Januari - Desember)',
                'is_single_month' => false,
                'bulan_angka' => null,
            ];
        }

        // Default: Bulanan
        $monthNumber = $this->bukuKasService->convertBulanToNumber(ucfirst($periodeKey));
        if (! $monthNumber || $monthNumber < 1 || $monthNumber > 12) {
            $monthNumber = 1;
        }

        return [
            'start' => $monthNumber,
            'end' => $monthNumber,
            'label' => 'Bulan '.ucfirst($periodeKey),
            'is_single_month' => true,
            'bulan_angka' => $monthNumber,
        ];
    }

    /**
     * Mengambil koleksi transaksi BKU untuk rentang bulan dan tahun tertentu.
     */
    protected function getPeriodTransactions(string $variant, $penganggaran, int $tahun, int $startMonth, int $endMonth)
    {
        $bkuClass = VariantConfig::getModelClass('bku', $variant);
        $bkuFk = VariantConfig::penganggaranFk($variant);

        return $bkuClass::with(['rekeningBelanja', 'kodeKegiatan', 'uraianDetails'])
            ->where($bkuFk, $penganggaran->id)
            ->whereYear('tanggal_transaksi', $tahun)
            ->whereBetween(DB::raw('EXTRACT(MONTH FROM tanggal_transaksi)'), [$startMonth, $endMonth])
            ->orderBy('tanggal_transaksi', 'asc')
            ->orderBy('id', 'asc')
            ->get();
    }

    /**
     * Menyelesaikan pagu anggaran yang proporsional sesuai dengan periode pelaporan yang diaudit.
     */
    protected function resolvePaguAnggaran(
        string $variant,
        $penganggaran,
        int $startMonth,
        int $endMonth,
        string $periodeType,
        string $periodeKey
    ): float {
        $paguTahunan = (float) ($penganggaran->pagu_anggaran ?? ($penganggaran->total_anggaran ?? ($penganggaran->pendapatan ?? 0.0)));
        $fk = VariantConfig::penganggaranFk($variant);

        $rkasClass = VariantConfig::getModelClass('rkas', $variant);
        $rkasPerubahanClass = VariantConfig::getModelClass('rkas_perubahan', $variant);

        // 1. Jika tahunan penuh (12 bulan)
        if ($periodeType === 'tahunan' || $periodeKey === 'tahunan' || ($startMonth === 1 && $endMonth === 12)) {
            if ($paguTahunan > 0) {
                return $paguTahunan;
            }
            try {
                if ($rkasClass && class_exists($rkasClass)) {
                    $hasPerubahan = $rkasPerubahanClass && class_exists($rkasPerubahanClass) && $rkasPerubahanClass::where($fk, $penganggaran->id)->exists();
                    $targetClass = $hasPerubahan ? $rkasPerubahanClass : $rkasClass;

                    return (float) $targetClass::where($fk, $penganggaran->id)->sum(DB::raw('harga_satuan * jumlah'));
                }
            } catch (\Throwable $e) {
                // Abaikan jika tabel belum ada atau error database
            }

            return 0.0;
        }

        // 2. Tentukan model RKAS yang berlaku (Perubahan untuk semester 2 jika ada)
        $hasPerubahan = false;
        try {
            $hasPerubahan = $rkasPerubahanClass && class_exists($rkasPerubahanClass) && $rkasPerubahanClass::where($fk, $penganggaran->id)->exists();
        } catch (\Throwable $e) {
            $hasPerubahan = false;
        }

        $targetRkasClass = ($hasPerubahan && ($endMonth > 6 || $periodeKey === 'tahap_2'))
            ? $rkasPerubahanClass
            : $rkasClass;

        // Ambil nama-nama bulan yang masuk dalam rentang periode
        $namaBulanList = [];
        for ($m = $startMonth; $m <= $endMonth; $m++) {
            $monthName = Carbon::create(2026, $m, 1)->locale('id')->isoFormat('MMMM');
            $namaBulanList[] = ucfirst(strtolower($monthName));
        }

        // Coba hitung sum belanja dari rincian RKAS sesuai bulan-bulan periode
        try {
            if ($targetRkasClass && class_exists($targetRkasClass)) {
                $paguDariRkas = (float) $targetRkasClass::where($fk, $penganggaran->id)
                    ->whereIn(DB::raw('TRIM(bulan)'), $namaBulanList)
                    ->sum(DB::raw('harga_satuan * jumlah'));

                if ($paguDariRkas > 0) {
                    return $paguDariRkas;
                }
            }
        } catch (\Throwable $e) {
            // Abaikan jika tabel tidak ada
        }

        // 3. Jika RKAS tidak memiliki rincian bulan, gunakan penerimaan dana pada tahap/bulan tersebut jika ada
        try {
            $penerimaanClass = VariantConfig::getModelClass('penerimaan_dana', $variant);
            if ($penerimaanClass && class_exists($penerimaanClass)) {
                $tahun = (int) ($penganggaran->tahun_anggaran ?? date('Y'));
                $penerimaanPeriode = (float) $penerimaanClass::where($fk, $penganggaran->id)
                    ->whereYear('tanggal_terima', $tahun)
                    ->whereBetween(DB::raw('EXTRACT(MONTH FROM tanggal_terima)'), [$startMonth, $endMonth])
                    ->sum('jumlah_dana');

                if ($penerimaanPeriode > 0) {
                    return $penerimaanPeriode;
                }
            }
        } catch (\Throwable $e) {
            // Abaikan jika tabel tidak ada
        }

        // 4. Fallback proporsional berdasarkan jumlah bulan terhadap pagu tahunan
        if ($paguTahunan > 0) {
            $jumlahBulan = max(1, ($endMonth - $startMonth + 1));

            return round(($paguTahunan / 12) * $jumlahBulan, 2);
        }

        return 0.0;
    }

    /**
     * Menghitung skor kepatuhan secara deterministik berbasis temuan sesuai standar audit BPK RI.
     */
    public function calculateComplianceScore(array $findings): int
    {
        $score = 100;
        foreach ($findings as $f) {
            $severity = strtolower($f['severity'] ?? 'warning');
            if ($severity === 'danger') {
                $score -= 20;
            } elseif ($severity === 'warning') {
                $score -= 10;
            } else {
                $score -= 2;
            }
        }

        return max(0, min(100, $score));
    }

    /**
     * Memformat representasi transaksi ringkas yang informatif tanpa mengekspos ID database internal.
     */
    protected function compactTransactions($transactions, int $limit = 50): array
    {
        return $transactions->take($limit)->map(function ($t) {
            $tgl = ! empty($t->tanggal_transaksi) ? Carbon::parse($t->tanggal_transaksi)->format('Y-m-d') : null;

            if (! empty($t->is_bunga_record)) {
                $bunga = (float) ($t->bunga_bank ?? 0);
                $pajak = (float) ($t->pajak_bunga_bank ?? 0);

                return [
                    'tanggal' => $tgl,
                    'nomor_bukti' => ($t->nomor_nota ?? ($t->no_bukti ?? null)) ?: 'TUTUP-KAS-BANK',
                    'jenis' => 'bunga_bank_giro',
                    'uraian' => 'Pendapatan Bunga Bank / Jasa Giro (Rp '.number_format($bunga, 0, ',', '.').') dan Pemotongan Pajak Bunga PPh 4(2) (Rp '.number_format($pajak, 0, ',', '.').')',
                    'nominal' => $bunga,
                    'kode_rekening' => '4.3.1.01.01',
                    'nama_rekening' => 'Pendapatan Jasa Giro Kas Daerah/Bank',
                    'kode_kegiatan' => '00.00.00',
                    'nama_kegiatan' => 'Administrasi Rekening Bank Persepsi',
                    'rekanan' => 'Bank Operasional Sekolah',
                    'pajak' => $pajak,
                    'ntpn' => ($t->ntpn ?? null) ?: 'PPh 4(2) Bank',
                ];
            }

            $nomorNota = ($t->nomor_nota ?? ($t->no_bukti ?? null)) ?: (! empty($t->id_transaksi) ? (string) $t->id_transaksi : '-');
            $rekeningBelanja = isset($t->rekeningBelanja) ? $t->rekeningBelanja : null;
            $kodeKegiatan = isset($t->kodeKegiatan) ? $t->kodeKegiatan : null;

            $kodeRek = $rekeningBelanja?->kode_rekening ?? ($t->kode_rekening ?? '-');
            $namaRek = $rekeningBelanja?->nama_rekening ?? ($t->nama_rekening ?? '-');
            $kodeKeg = $kodeKegiatan?->kode_kegiatan ?? ($t->kode_kegiatan ?? '-');
            $namaKeg = $kodeKegiatan?->nama_kegiatan ?? ($t->nama_kegiatan ?? '-');
            $rekanan = ($t->nama_toko ?? ($t->nama_penerima_pembayaran ?? null)) ?: '-';
            $pajakTotal = (float) ($t->total_pajak ?? 0) + (float) ($t->total_pajak_daerah ?? 0);

            $uraianTeks = ! empty(trim($t->uraian_opsional ?? ''))
                ? trim($t->uraian_opsional)
                : ((! empty(trim($t->uraian ?? ''))) ? trim($t->uraian) : 'Transaksi Pembukuan');

            return [
                'tanggal' => $tgl,
                'nomor_bukti' => $nomorNota,
                'jenis' => $t->jenis_transaksi ?? 'transaksi',
                'uraian' => $uraianTeks,
                'nominal' => (float) ($t->dibelanjakan ?? ($t->nominal_transaksi ?? ($t->pengeluaran ?? 0))),
                'kode_rekening' => $kodeRek,
                'nama_rekening' => $namaRek,
                'kode_kegiatan' => $kodeKeg,
                'nama_kegiatan' => $namaKeg,
                'rekanan' => $rekanan,
                'pajak' => $pajakTotal,
                'ntpn' => ($t->ntpn ?? null) ?: '-',
            ];
        })->all();
    }
}
