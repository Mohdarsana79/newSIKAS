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
     * Menghitung skor kepatuhan secara deterministik berbasis temuan.
     */
    protected function calculateComplianceScore(array $findings): int
    {
        $score = 100;
        foreach ($findings as $f) {
            $severity = $f['severity'] ?? 'warning';
            if ($severity === 'danger') {
                $score -= 15;
            } elseif ($severity === 'warning') {
                $score -= 7;
            } else {
                $score -= 2;
            }
        }

        return max(20, min(100, $score));
    }

    /**
     * Memformat representasi transaksi ringkas agar token AI efisien.
     */
    protected function compactTransactions($transactions, int $limit = 40): array
    {
        return $transactions->take($limit)->map(function ($t) {
            return [
                'id' => $t->id,
                'tgl' => $t->tanggal_transaksi ? Carbon::parse($t->tanggal_transaksi)->format('Y-m-d') : null,
                'jenis' => $t->jenis_transaksi,
                'uraian' => $t->uraian,
                'nominal' => (float) ($t->dibelanjakan ?? $t->nominal_transaksi ?? 0),
                'rek' => $t->rekeningBelanja?->kode_rekening,
                'toko' => $t->nama_toko ?: $t->nama_penerima_pembayaran,
                'pajak' => (float) $t->total_pajak + (float) $t->total_pajak_daerah,
                'ntpn' => $t->ntpn,
            ];
        })->all();
    }
}
