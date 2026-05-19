<?php

namespace App\Http\Controllers;

use App\Models\BukuKasUmum;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class NotificationController extends Controller
{
    /**
     * Mengambil daftar notifikasi pajak yang dikelompokkan berdasarkan bulan dan tahun.
     */
    public function getPajakNotifications(Request $request)
    {
        try {
            // Ambil semua transaksi yang memiliki nilai pajak, baik pusat maupun daerah
            $pajakTransactions = BukuKasUmum::where(function ($q) {
                $q->where('total_pajak', '>', 0)
                  ->orWhere('total_pajak_daerah', '>', 0);
            })->get();

            $notifications = [];
            $terimaPajakMap = [];
            $setorPajakMap = [];

            foreach ($pajakTransactions as $trx) {
                // Pastikan tanggal transaksi ada
                if (!$trx->tanggal_transaksi) continue;
                
                // Parse tanggal, hati-hati jika bentuknya string atau Carbon object
                $date = is_string($trx->tanggal_transaksi) ? Carbon::parse($trx->tanggal_transaksi) : $trx->tanggal_transaksi;
                $month = $date->month;
                $year = $date->year;
                
                $key = "{$year}-{$month}";

                // Jika NTPN kosong/null, berarti belum disetor (Terima Pajak)
                if (empty($trx->ntpn)) {
                    if (!isset($terimaPajakMap[$key])) {
                        $terimaPajakMap[$key] = [
                            'type' => 'terima_pajak',
                            'month' => $month,
                            'year' => $year,
                            'count' => 0,
                            'month_name' => $this->convertNumberToBulan($month)
                        ];
                    }
                    $terimaPajakMap[$key]['count']++;
                } else {
                    // Jika NTPN terisi, berarti sudah disetor (Setor Pajak)
                    if (!isset($setorPajakMap[$key])) {
                        $setorPajakMap[$key] = [
                            'type' => 'setor_pajak',
                            'month' => $month,
                            'year' => $year,
                            'count' => 0,
                            'month_name' => $this->convertNumberToBulan($month)
                        ];
                    }
                    $setorPajakMap[$key]['count']++;
                }
            }

            // Jika dalam satu bulan ada transaksi yang belum disetor (Terima Pajak)
            // maka kita prioritaskan memunculkan notifikasi "Terima Pajak" saja?
            // "selama masih terima pajak tampilkan notifikasinya"
            // "jika pajaknya sudah di setor maka di anggap sudah di baca atau read."
            // Berarti jika bulan tersebut ADA terima pajak (belum disetor), tampilkan Terima Pajak.
            // Tapi jika bulan tersebut ADA setor pajak, apakah Setor Pajak juga tampil bersamaan?
            // Biasanya, bisa tampil bersamaan jika ada transaksi yang sudah lunas dan ada yang belum.
            
            // Gabungkan hasil map ke dalam array
            foreach ($terimaPajakMap as $item) {
                $notifications[] = $item;
            }
            foreach ($setorPajakMap as $item) {
                $notifications[] = $item;
            }

            // Urutkan berdasarkan tahun dan bulan terbaru
            usort($notifications, function ($a, $b) {
                if ($a['year'] == $b['year']) {
                    return $b['month'] <=> $a['month'];
                }
                return $b['year'] <=> $a['year'];
            });

            return response()->json([
                'success' => true,
                'data' => $notifications
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Gagal mengambil notifikasi pajak: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Mengambil detail transaksi pajak berdasarkan tipe, bulan, dan tahun.
     */
    public function getPajakDetails(Request $request)
    {
        $type = $request->input('type'); // 'terima_pajak' atau 'setor_pajak'
        $month = $request->input('month');
        $year = $request->input('year');

        try {
            $query = BukuKasUmum::whereYear('tanggal_transaksi', $year)
                ->whereMonth('tanggal_transaksi', $month)
                ->where(function ($q) {
                    $q->where('total_pajak', '>', 0)
                      ->orWhere('total_pajak_daerah', '>', 0);
                });

            if ($type === 'terima_pajak') {
                $query->where(function($q) {
                    $q->whereNull('ntpn')->orWhere('ntpn', '');
                });
            } else if ($type === 'setor_pajak') {
                $query->whereNotNull('ntpn')->where('ntpn', '!=', '');
            } else {
                return response()->json(['success' => false, 'message' => 'Tipe tidak valid'], 400);
            }

            $transactions = $query->get();
            $details = [];

            foreach ($transactions as $trx) {
                $baseUraian = $trx->uraian_opsional ?? $trx->uraian ?? '';
                $pajakName = strtolower($trx->pajak ?? '');
                
                // Menentukan nama pajak secara manual seperti di BukuPajakController
                $pph21 = 0; $pph22 = 0; $pph23 = 0; $ppn = 0;
                
                if (strpos($pajakName, 'pph21') !== false || strpos($pajakName, 'pph 21') !== false) {
                    $pph21 = $trx->total_pajak;
                } elseif (strpos($pajakName, 'pph22') !== false || strpos($pajakName, 'pph 22') !== false) {
                    $pph22 = $trx->total_pajak;
                } elseif (strpos($pajakName, 'pph23') !== false || strpos($pajakName, 'pph 23') !== false) {
                    $pph23 = $trx->total_pajak;
                } else {
                    $ppn = $trx->total_pajak;
                }

                // Baris Pajak Pusat
                if ($trx->total_pajak > 0) {
                    $namaPajakPusat = '';
                    if ($pph21 > 0) $namaPajakPusat = 'PPh 21';
                    elseif ($pph22 > 0) $namaPajakPusat = 'PPh 22';
                    elseif ($pph23 > 0) $namaPajakPusat = 'PPh 23';
                    else $namaPajakPusat = $trx->pajak ?? 'PPN';

                    $prefix = $type === 'terima_pajak' ? 'Terima pajak' : 'Setor pajak';
                    $persen = $trx->persen_pajak ? $trx->persen_pajak . '%' : '';
                    $nominal = number_format($trx->total_pajak, 0, ',', '.');
                    
                    // Format sesuai contoh: Terima pajak pph 21 5% lunas bayar honorarium sebesar Rp.10.000
                    $uraianFull = "{$prefix} {$namaPajakPusat} {$persen} {$baseUraian} sebesar Rp. {$nominal}";
                    
                    $details[] = [
                        'id' => $trx->id . '_pusat',
                        'uraian' => $uraianFull,
                        'nominal' => $trx->total_pajak,
                        'ntpn' => $trx->ntpn,
                        'tanggal_transaksi' => $trx->tanggal_transaksi
                    ];
                }

                // Baris Pajak Daerah
                if ($trx->total_pajak_daerah > 0) {
                    $prefix = $type === 'terima_pajak' ? 'Terima pajak' : 'Setor pajak';
                    $persen = $trx->persen_pajak_daerah ? $trx->persen_pajak_daerah . '%' : '';
                    $nominal = number_format($trx->total_pajak_daerah, 0, ',', '.');
                    
                    $uraianFull = "{$prefix} PB 1 {$persen} {$baseUraian} sebesar Rp. {$nominal}";

                    $details[] = [
                        'id' => $trx->id . '_daerah',
                        'uraian' => $uraianFull,
                        'nominal' => $trx->total_pajak_daerah,
                        'ntpn' => $trx->ntpn,
                        'tanggal_transaksi' => $trx->tanggal_transaksi
                    ];
                }
            }

            return response()->json([
                'success' => true,
                'data' => $details,
                'month_name' => $this->convertNumberToBulan($month),
                'year' => $year
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Gagal mengambil detail pajak: ' . $e->getMessage()
            ], 500);
        }
    }

    private function convertNumberToBulan($angka)
    {
        $bulanList = [
            1 => 'Januari', 2 => 'Februari', 3 => 'Maret', 4 => 'April',
            5 => 'Mei', 6 => 'Juni', 7 => 'Juli', 8 => 'Agustus',
            9 => 'September', 10 => 'Oktober', 11 => 'November', 12 => 'Desember',
        ];
        return $bulanList[(int)$angka] ?? 'Januari';
    }
}
