<?php

namespace App\Http\Controllers;

use App\Models\Penganggaran;
use App\Models\PenerimaanDana;
use App\Models\PenarikanTunai;
use App\Models\BukuKasUmum;
use App\Models\Sts; // Added Sts model
use App\Models\SekolahProfile as Sekolah; // Adjusted Model Name
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Maatwebsite\Excel\Facades\Excel;
use App\Exports\BkpBankExport;

class BukuBankController extends Controller
{
    /**
     * Get data BKP Bank (digunakan oleh AJAX)
     */
    public function getBkpBankData(Request $request)
    {
        $tahun = $request->input('tahun');
        $bulan = $request->input('bulan');

        try {
            $data = $this->getBkpBankDataInternal($tahun, $bulan);

            if (!$data) {
                return response()->json([
                    'success' => false,
                    'message' => 'Data penganggaran tidak ditemukan',
                ], 404);
            }

            return response()->json(array_merge(['success' => true], $data));

        } catch (\Exception $e) {
            Log::error('Error get BKP Bank data: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Gagal memuat data BKP Bank: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Generate PDF for BKP Bank
     */
    public function generateBkpBankPdf(Request $request)
    {
        try {
            // Get Parameters from Request
            $tahun = $request->query('tahun');
            $bulan = $request->query('bulan');

            // Get Settings
            $paperSize = $request->input('paperSize', 'F4');
            $orientation = $request->input('orientation', 'portrait');
            $fontSize = $request->input('fontSize', '11pt');
            
            Carbon::setLocale('id');

            // List of months to process
            $monthsToProcess = [];
            
            if ($bulan === 'Tahap 1') {
                $monthsToProcess = ['januari', 'februari', 'maret', 'april', 'mei', 'juni'];
            } elseif ($bulan === 'Tahap 2') {
                $monthsToProcess = ['juli', 'agustus', 'september', 'oktober', 'november', 'desember'];
            } elseif ($bulan === 'Tahunan') {
                $monthsToProcess = [
                    'januari', 'februari', 'maret', 'april', 'mei', 'juni',
                    'juli', 'agustus', 'september', 'oktober', 'november', 'desember'
                ];
            } else {
                $monthsToProcess = [$bulan];
            }

            $reportData = [];

            foreach ($monthsToProcess as $m) {
                // Call Internal with SINGLE month
                $data = $this->getBkpBankDataInternal($tahun, $m);
                
                if ($data) {
                    $bulanAngka = $this->convertBulanToNumber($m);
                    $endOfMonth = Carbon::createFromDate($tahun, $bulanAngka, 1)->endOfMonth();
                    
                    $tanggalCetakDOB = $endOfMonth->isoFormat('D MMMM Y');
                    $tanggalCetakFormatted = $endOfMonth->isoFormat('dddd, D MMMM Y');
                    $bulanAngkaStr = str_pad($bulanAngka, 2, '0', STR_PAD_LEFT);

                    $reportData[] = [
                        'tahun' => $tahun,
                        'bulan' => $m,
                        'bulanAngkaStr' => $bulanAngkaStr,
                        'items' => $data['items'],
                        'data' => $data['data'],
                        'sekolah' => $data['sekolah'],
                        'kepala_sekolah' => $data['kepala_sekolah'],
                        'bendahara' => $data['bendahara'],
                        'tanggalCetakDOB' => $tanggalCetakDOB,
                        'tanggalCetakFormatted' => $tanggalCetakFormatted,
                    ];
                }
            }

            if (empty($reportData)) {
                return response('Data tidak ditemukan', 404);
            }

            $pdf = Pdf::loadView('laporan.bkp_bank_pdf', [
                'reportData' => $reportData, // Array of monthly data
                'paperSize' => $paperSize,
                'orientation' => $orientation,
                'fontSize' => $fontSize,
            ]);
            
            $pdf->setPaper($paperSize, $orientation);

            return $pdf->stream('BKP_Bank_' . $bulan . '_' . $tahun . '.pdf');

        } catch (\Exception $e) {
            Log::error('Error generating PDF BKP Bank: ' . $e->getMessage());
            return response('Error generating PDF: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Generate Excel for BKP Bank
     */
    public function generateBkpBankExcel(Request $request)
    {
        try {
            $tahun = $request->query('tahun');
            $bulan = $request->query('bulan');

            Carbon::setLocale('id');

            // List of months to process
            $monthsToProcess = [];
            
            if ($bulan === 'Tahap 1') {
                $monthsToProcess = ['januari', 'februari', 'maret', 'april', 'mei', 'juni'];
            } elseif ($bulan === 'Tahap 2') {
                $monthsToProcess = ['juli', 'agustus', 'september', 'oktober', 'november', 'desember'];
            } elseif ($bulan === 'Tahunan') {
                $monthsToProcess = [
                    'januari', 'februari', 'maret', 'april', 'mei', 'juni',
                    'juli', 'agustus', 'september', 'oktober', 'november', 'desember'
                ];
            } else {
                $monthsToProcess = [$bulan];
            }

            $reportData = [];

            foreach ($monthsToProcess as $m) {
                // Call Internal with SINGLE month
                $data = $this->getBkpBankDataInternal($tahun, $m);
                
                if ($data) {
                    $bulanAngka = $this->convertBulanToNumber($m);
                    $endOfMonth = Carbon::createFromDate($tahun, $bulanAngka, 1)->endOfMonth();
                    
                    $tanggalCetakDOB = $endOfMonth->locale('id')->isoFormat('D MMMM Y');
                    $tanggalCetakFormatted = $endOfMonth->locale('id')->isoFormat('dddd, D MMMM Y');
                    $bulanAngkaStr = str_pad($bulanAngka, 2, '0', STR_PAD_LEFT);

                    $reportData[] = [
                        'tahun' => $tahun,
                        'bulan' => $m,
                        'bulanAngkaStr' => $bulanAngkaStr,
                        'items' => $data['items'],
                        'data' => $data['data'],
                        'sekolah' => $data['sekolah'],
                        'kepala_sekolah' => $data['kepala_sekolah'],
                        'bendahara' => $data['bendahara'],
                        'tanggalCetakDOB' => $tanggalCetakDOB,
                        'tanggalCetakFormatted' => $tanggalCetakFormatted,
                    ];
                }
            }

            if (empty($reportData)) {
                return response('Data tidak ditemukan', 404);
            }

            return Excel::download(new BkpBankExport($reportData), 'BKP_Bank_' . $bulan . '_' . $tahun . '.xlsx');

        } catch (\Exception $e) {
            Log::error('Error generating Excel BKP Bank: ' . $e->getMessage());
            return response('Error generating Excel: ' . $e->getMessage(), 500);
        }
    }
    
    /**
     * Get TRK Saldo Awal Data
     */
    public function getTrkSaldoAwal($tahun) 
    {
        $penganggaran = Penganggaran::where('tahun_anggaran', $tahun)->first();
        if (!$penganggaran) {
            return response()->json(['success' => false, 'message' => 'Tahun anggaran tidak ditemukan']);
        }

        return response()->json([
            'success' => true,
            'data' => [
                'is_trk_saldo_awal' => (bool)$penganggaran->is_trk_saldo_awal,
                'tanggal_trk_saldo_awal' => $penganggaran->tanggal_trk_saldo_awal,
                'jumlah_trk_saldo_awal' => $penganggaran->jumlah_trk_saldo_awal,
            ]
        ]);
    }

    /**
     * Save TRK Saldo Awal Data
     */
    public function saveTrkSaldoAwal(Request $request)
    {
        $request->validate([
            'tahun' => 'required',
            'is_trk_saldo_awal' => 'required|boolean',
            'tanggal_trk_saldo_awal' => 'nullable|date',
            'jumlah_trk_saldo_awal' => 'nullable|numeric'
        ]);

        try {
            $penganggaran = Penganggaran::where('tahun_anggaran', $request->tahun)->first();
            if (!$penganggaran) return response()->json(['success' => false, 'message' => 'Penganggaran not found'], 404);

            $penganggaran->is_trk_saldo_awal = $request->is_trk_saldo_awal;
            if ($request->is_trk_saldo_awal) {
                $penganggaran->tanggal_trk_saldo_awal = $request->tanggal_trk_saldo_awal;
                $penganggaran->jumlah_trk_saldo_awal = $request->jumlah_trk_saldo_awal;
            } else {
                $penganggaran->tanggal_trk_saldo_awal = null;
                $penganggaran->jumlah_trk_saldo_awal = null;
            }
            $penganggaran->save();

            return response()->json(['success' => true, 'message' => 'Data TRK Saldo Awal berhasil disimpan']);
        } catch (\Exception $e) {
            Log::error('Error saving TRK Saldo Awal: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * Internal helper to fetch data
     */
    private function getBkpBankDataInternal($tahun, $bulan)
    {
        $penganggaran = Penganggaran::where('tahun_anggaran', $tahun)->first();

        if (!$penganggaran) {
            return null;
        }

        // We assume $bulan here is always a SINGLE month string if called from loop,
        // BUT logic for "Tahap 1" inside here is still valid if called via AJAX with range string.
        // However, for PDF generation we are explicitly passing single months in the loop.
        // So we need to handle the case where "penerimaan" logic might expect a range?
        // No, standard logic works for single months too.
        
        $bulanAwal = 1;
        $bulanAkhir = 12;

        if ($bulan === 'Tahap 1') {
            $bulanAwal = 1; $bulanAkhir = 6;
        } elseif ($bulan === 'Tahap 2') {
            $bulanAwal = 7; $bulanAkhir = 12;
        } elseif ($bulan === 'Tahunan') {
            $bulanAwal = 1; $bulanAkhir = 12;
        } else {
            $bulanAngka = $this->convertBulanToNumber($bulan);
            $bulanAwal = $bulanAngka;
            $bulanAkhir = $bulanAngka;
        }

        // Ambil data penerimaan dana
        $penerimaanDanas = PenerimaanDana::where('penganggaran_id', $penganggaran->id)
            ->whereMonth('tanggal_terima', '>=', $bulanAwal)
            ->whereMonth('tanggal_terima', '<=', $bulanAkhir)
            ->whereYear('tanggal_terima', $tahun)
            ->orderBy('tanggal_terima', 'asc')
            ->get();

        // Ambil data penarikan tunai
        $penarikanTunais = PenarikanTunai::where('penganggaran_id', $penganggaran->id)
            ->whereMonth('tanggal_penarikan', '>=', $bulanAwal)
            ->whereMonth('tanggal_penarikan', '<=', $bulanAkhir)
            ->whereYear('tanggal_penarikan', $tahun)
            ->orderBy('tanggal_penarikan', 'asc')
            ->get();

        // Ambil data bunga bank
        $bungaRecords = BukuKasUmum::where('penganggaran_id', $penganggaran->id)
            ->whereMonth('tanggal_transaksi', '>=', $bulanAwal)
            ->whereMonth('tanggal_transaksi', '<=', $bulanAkhir)
            ->whereYear('tanggal_transaksi', $tahun)
            ->where('is_bunga_record', true)
            ->orderBy('tanggal_transaksi', 'asc')
            ->get();

        // Ambil data STS yang masuk Buku Bank
        // Ambil data STS yang masuk Buku Bank
        $stsRecords = Sts::where('penganggaran_id', $penganggaran->id)
            ->where('is_bkp', true)
            ->whereMonth('tanggal_bayar', '>=', $bulanAwal)
            ->whereMonth('tanggal_bayar', '<=', $bulanAkhir)
            ->whereYear('tanggal_bayar', $tahun) 
            ->orderBy('tanggal_bayar', 'asc')
            ->get();

        // Check for TRK Saldo Awal
        $trkSaldoAwal = null;
        if ($penganggaran->is_trk_saldo_awal && $penganggaran->tanggal_trk_saldo_awal && $penganggaran->jumlah_trk_saldo_awal) {
            $tglTrk = Carbon::parse($penganggaran->tanggal_trk_saldo_awal);
            // Check if TRK date falls within range
            if ($tglTrk->year == $tahun && 
                $tglTrk->month >= $bulanAwal && 
                $tglTrk->month <= $bulanAkhir) {
                $trkSaldoAwal = [
                    'tanggal' => $tglTrk->format('Y-m-d'),
                    'jumlah' => $penganggaran->jumlah_trk_saldo_awal
                ];
            }
        }

        // Ambil data belanja NON-TUNAI bulan ini
        $belanjaNonTunai = BukuKasUmum::where('penganggaran_id', $penganggaran->id)
            ->where('is_bunga_record', false)
            ->where('jenis_transaksi', 'non-tunai')
            ->whereMonth('tanggal_transaksi', '>=', $bulanAwal)
            ->whereMonth('tanggal_transaksi', '<=', $bulanAkhir)
            ->whereYear('tanggal_transaksi', $tahun)
            ->sum('total_transaksi_kotor');

        // Saldo Awal is calculated before the Start Month
        $saldoAwal = $this->hitungSaldoBankSebelumBulan($penganggaran->id, $bulanAwal);

        // Calculate Totals within the range
        $totalPenerimaanDana = $penerimaanDanas->sum('jumlah_dana');
        $totalPenarikan = $penarikanTunais->sum('jumlah_penarikan');
        $totalBunga = $bungaRecords->sum('bunga_bank');
        $totalPajak = $bungaRecords->sum('pajak_bunga_bank');
        $totalSts = $stsRecords->sum('jumlah_bayar');
        $totalTrk = $trkSaldoAwal ? $trkSaldoAwal['jumlah'] : 0;
        $totalBelanjaNonTunai = $belanjaNonTunai;

        $totalPenerimaan = $saldoAwal + $totalPenerimaanDana + $totalBunga;
        $totalPengeluaran = $totalPenarikan + $totalPajak + $totalSts + $totalTrk + $totalBelanjaNonTunai; // Include Non-Tunai
        $saldoAkhir = $totalPenerimaan - $totalPengeluaran;
        
        // Construct Unified Items
        $items = [];
        
        if ($trkSaldoAwal) {
            $items[] = [
                'tanggal' => $trkSaldoAwal['tanggal'],
                'uraian' => 'Penarikan Saldo Awal',
                'no_bukti' => '',
                'kode_kegiatan' => '',
                'kode_rekening' => '',
                'penerimaan' => 0,
                'pengeluaran' => $trkSaldoAwal['jumlah'],
                'type' => 'trk_saldo_awal'
            ];
        }

        // Ambil list belanja NON-TUNAI untuk item
        $belanjaNonTunaiList = BukuKasUmum::where('penganggaran_id', $penganggaran->id)
            ->where('is_bunga_record', false)
            ->where('jenis_transaksi', 'non-tunai')
            ->whereMonth('tanggal_transaksi', '>=', $bulanAwal)
            ->whereMonth('tanggal_transaksi', '<=', $bulanAkhir)
            ->whereYear('tanggal_transaksi', $tahun)
            ->get();
        
        foreach ($belanjaNonTunaiList as $bnt) {
             $items[] = [
                'tanggal' => $bnt->tanggal_transaksi,
                'uraian' => 'Pembayaran Belanja ' . ($bnt->uraian ?? 'Non Tunai'),
                'no_bukti' => $bnt->no_bukti,
                'kode_kegiatan' => '',
                'kode_rekening' => '',
                'penerimaan' => 0,
                'pengeluaran' => $bnt->total_transaksi_kotor, // Assuming total_transaksi_kotor is the full amount deduced from bank
                'type' => 'belanja_non_tunai'
            ];
        }
        
        $hasSaldoAwalTahunLalu = false;
        foreach ($penerimaanDanas as $p) {
            // LOGIKA TAMBAHAN: Pisahkan saldo awal jika ada
            if ($p->sumber_dana === 'Bosp Reguler Tahap 1' && $p->saldo_awal > 0) {
                // Merge Saldo Awal Tahun Lalu into Saldo Awal Report
                $saldoAwal += $p->saldo_awal;
                $hasSaldoAwalTahunLalu = true;
            }

            $items[] = [
                'tanggal' => $p->tanggal_terima,
                'uraian' => 'Terima Dana ' . $p->sumber_dana,
                'no_bukti' => '', 
                'kode_kegiatan' => '',
                'kode_rekening' => '',
                'penerimaan' => $p->jumlah_dana,
                'pengeluaran' => 0,
                'type' => 'penerimaan'
            ];
        }

        foreach ($penarikanTunais as $p) {
            $items[] = [
                'tanggal' => $p->tanggal_penarikan,
                'uraian' => 'Penarikan Tunai',
                'no_bukti' => '',
                'kode_kegiatan' => '',
                'kode_rekening' => '',
                'penerimaan' => 0,
                'pengeluaran' => $p->jumlah_penarikan,
                'type' => 'penarikan'
            ];
        }

        foreach ($bungaRecords as $bungaRecord) {
            $items[] = [
                'tanggal' => $bungaRecord->tanggal_transaksi,
                'uraian' => 'Bunga Bank Bulan ' . Carbon::parse($bungaRecord->tanggal_transaksi)->locale('id')->isoFormat('MMMM'),
                'no_bukti' => '',
                'kode_kegiatan' => '',
                'kode_rekening' => '',
                'penerimaan' => $bungaRecord->bunga_bank,
                'pengeluaran' => 0,
                'type' => 'bunga'
            ];
            
            $items[] = [
                'tanggal' => $bungaRecord->tanggal_transaksi,
                'uraian' => 'Pajak Bunga Bulan ' . Carbon::parse($bungaRecord->tanggal_transaksi)->locale('id')->isoFormat('MMMM'),
                'no_bukti' => '',
                'kode_kegiatan' => '',
                'kode_rekening' => '',
                'penerimaan' => 0,
                'pengeluaran' => $bungaRecord->pajak_bunga_bank,
                'type' => 'pajak_bunga'
            ];
        }

        foreach ($stsRecords as $sts) {
            $items[] = [
                'tanggal' => $sts->tanggal_bayar,
                'uraian' => 'Pembayaran STS No. ' . ($sts->no_bukti ?? $sts->nomor_sts ?? '-'),
                'no_bukti' => $sts->no_bukti ?? $sts->nomor_sts ?? '-',
                'kode_kegiatan' => '',
                'kode_rekening' => '',
                'penerimaan' => 0,
                'pengeluaran' => $sts->jumlah_bayar,
                'type' => 'sts'
            ];
        }
        
        // Sort items
        usort($items, function($a, $b) {
            return strtotime($a['tanggal']) - strtotime($b['tanggal']);
        });

        return [
            'items' => $items,
            'data' => [
                'saldo_awal' => $saldoAwal,
                'total_penerimaan_dana' => $totalPenerimaanDana,
                'total_penarikan' => $totalPenarikan,
                'total_bunga' => $totalBunga,
                'total_pajak' => $totalPajak,
                'total_sts' => $totalSts,
                'total_trk' => $totalTrk,
                'total_belanja_non_tunai' => $totalBelanjaNonTunai,
                'saldo_akhir' => $saldoAkhir,
                'total_penerimaan' => $totalPenerimaan,
                'total_pengeluaran' => $totalPengeluaran,
                'has_saldo_awal_tahun_lalu' => $hasSaldoAwalTahunLalu,
                'is_trk_saldo_awal_year' => (bool)$penganggaran->is_trk_saldo_awal,
                'has_sts_year' => Sts::where('penganggaran_id', $penganggaran->id)->exists()
            ],
            'sekolah' => [
                'nama_sekolah' => $penganggaran->sekolah->nama_sekolah,
                'npsn' => $penganggaran->sekolah->npsn,
                'alamat' => $penganggaran->sekolah->alamat_sekolah,
                'kelurahan_desa' => $penganggaran->sekolah->kelurahan_desa,
                'kecamatan' => $penganggaran->sekolah->kecamatan,
                'kabupaten' => $penganggaran->sekolah->kabupaten_kota,
                'provinsi' => $penganggaran->sekolah->provinsi,
            ],
            'kepala_sekolah' => [
                'nama' => $penganggaran->kepala_sekolah ?? $penganggaran->sekolah->nama_kepala_sekolah,
                'nip' => $penganggaran->nip_kepala_sekolah ?? $penganggaran->sekolah->nip_kepala_sekolah,
            ],
            'bendahara' => [
                'nama' => $penganggaran->bendahara ?? $penganggaran->sekolah->nama_bendahara,
                'nip' => $penganggaran->nip_bendahara ?? $penganggaran->sekolah->nip_bendahara,
            ],
        ];
    }

    // ... (Helper Methods Implementation) ...
     private function convertBulanToNumber($bulan)
    {
        $bulanList = [
            'januari' => 1, 'februari' => 2, 'maret' => 3, 'april' => 4,
            'mei' => 5, 'juni' => 6, 'juli' => 7, 'agustus' => 8,
            'september' => 9, 'oktober' => 10, 'november' => 11, 'desember' => 12,
             // Capitalized
            'Januari' => 1, 'Februari' => 2, 'Maret' => 3, 'April' => 4,
            'Mei' => 5, 'Juni' => 6, 'Juli' => 7, 'Agustus' => 8,
            'September' => 9, 'Oktober' => 10, 'November' => 11, 'Desember' => 12,
        ];

        return $bulanList[$bulan] ?? 1;
    }

    private function hitungSaldoBankSebelumBulan($penganggaran_id, $bulanTarget)
    {
        try {
            if ($bulanTarget == 1) return 0;

            // Hitung total penerimaan dana sampai bulan sebelumnya
            $penerimaanDanas = PenerimaanDana::where('penganggaran_id', $penganggaran_id)
                ->whereRaw('EXTRACT(MONTH FROM tanggal_terima) < ?', [$bulanTarget])
                ->get();

            $totalPenerimaan = $penerimaanDanas->sum(function ($penerimaan) {
                $total = $penerimaan->jumlah_dana;
                if ($penerimaan->sumber_dana === 'Bosp Reguler Tahap 1' && $penerimaan->saldo_awal) {
                    $total += $penerimaan->saldo_awal;
                }
                return $total;
            });

            // Hitung total penarikan tunai sampai bulan sebelumnya
            $totalPenarikan = PenarikanTunai::where('penganggaran_id', $penganggaran_id)
                ->whereRaw('EXTRACT(MONTH FROM tanggal_penarikan) < ?', [$bulanTarget])
                ->sum('jumlah_penarikan');

            // Hitung bunga bank sampai bulan sebelumnya
            $totalBunga = BukuKasUmum::where('penganggaran_id', $penganggaran_id)
                ->where('is_bunga_record', true)
                ->whereRaw('EXTRACT(MONTH FROM tanggal_transaksi) < ?', [$bulanTarget])
                ->sum('bunga_bank');

            // Hitung pajak bunga sampai bulan sebelumnya
            $totalPajakBunga = BukuKasUmum::where('penganggaran_id', $penganggaran_id)
                ->where('is_bunga_record', true)
                ->whereRaw('EXTRACT(MONTH FROM tanggal_transaksi) < ?', [$bulanTarget])
                ->sum('pajak_bunga_bank');

            // Hitung total belanja NON-TUNAI sampai bulan sebelumnya
            $totalBelanjaNonTunai = BukuKasUmum::where('penganggaran_id', $penganggaran_id)
                ->where('is_bunga_record', false)
                ->where('jenis_transaksi', 'non-tunai')
                ->whereRaw('EXTRACT(MONTH FROM tanggal_transaksi) < ?', [$bulanTarget])
                ->sum('total_transaksi_kotor');

            // Hitung STS sampai bulan sebelumnya
            $totalStsSebelumnya = Sts::where('penganggaran_id', $penganggaran_id)
                ->where('is_bkp', true)
                ->whereRaw('EXTRACT(MONTH FROM tanggal_bayar) < ?', [$bulanTarget])
                ->sum('jumlah_bayar');

            // Hitung TRK Saldo Awal sampai bulan sebelumnya
            $totalTrkSebelumnya = 0;
            $penganggaran = Penganggaran::find($penganggaran_id);
            if ($penganggaran && $penganggaran->is_trk_saldo_awal && $penganggaran->tanggal_trk_saldo_awal) {
                $tglTrk = Carbon::parse($penganggaran->tanggal_trk_saldo_awal);
                if ($tglTrk->year == $penganggaran->tahun_anggaran && $tglTrk->month < $bulanTarget) {
                    $totalTrkSebelumnya = $penganggaran->jumlah_trk_saldo_awal;
                }
            }

            $saldoBank = $totalPenerimaan
                - $totalPenarikan
                + $totalBunga
                - $totalPajakBunga
                - $totalBelanjaNonTunai
                - $totalStsSebelumnya
                - $totalTrkSebelumnya;

            return max(0, $saldoBank);
        } catch (\Exception $e) {
            Log::error('Error hitungSaldoBankSebelumBulan: ' . $e->getMessage());
            return 0;
        }
    }
}
