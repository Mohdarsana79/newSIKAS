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

        if ($periodeType === 'tahapan') {
            if ($periodeKey === 'tahap_2' || $periodeKey === 'tahap 2') {
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

            $nomorNota = ($t->nomor_nota ?? ($t->no_bukti ?? null)) ?: (! empty($t->id_transaksi) ? 'TRX-'.$t->id_transaksi : '-');
            $rekeningBelanja = isset($t->rekeningBelanja) ? $t->rekeningBelanja : null;
            $kodeKegiatan = isset($t->kodeKegiatan) ? $t->kodeKegiatan : null;

            $kodeRek = $rekeningBelanja?->kode_rekening ?? ($t->kode_rekening ?? '-');
            $namaRek = $rekeningBelanja?->nama_rekening ?? ($t->nama_rekening ?? '-');
            $kodeKeg = $kodeKegiatan?->kode_kegiatan ?? ($t->kode_kegiatan ?? '-');
            $namaKeg = $kodeKegiatan?->nama_kegiatan ?? ($t->nama_kegiatan ?? '-');
            $rekanan = ($t->nama_toko ?? ($t->nama_penerima_pembayaran ?? null)) ?: '-';
            $pajakTotal = (float) ($t->total_pajak ?? 0) + (float) ($t->total_pajak_daerah ?? 0);

            return [
                'tanggal' => $tgl,
                'nomor_bukti' => $nomorNota,
                'jenis' => $t->jenis_transaksi ?? 'transaksi',
                'uraian' => ($t->uraian ?? null) ?: 'Transaksi Pembukuan',
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
