<?php

namespace App\Http\Controllers;

use App\Services\BukuKasService;
use App\Models\Penganggaran;
use App\Models\BukuKasUmum;
use App\Models\SekolahProfile; // CHANGED FROM Sekolah
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class BukuRobController extends Controller
{
    protected $bukuKasService;

    public function __construct(BukuKasService $bukuKasService)
    {
        $this->bukuKasService = $bukuKasService;
    }

    /**
     * Get data ROB (Rincian Objek Belanja)
     */
    public function getBkpRobData(Request $request)
    {
        $tahun = $request->input('tahun');
        $bulan = $request->input('bulan');
        try {
            $penganggaran = Penganggaran::where('tahun_anggaran', $tahun)
                ->with('sekolah')
                ->first();

            if (!$penganggaran) {
                return response()->json([
                    'success' => false,
                    'message' => 'Data penganggaran tidak ditemukan',
                ], 404);
            }

            // Fix case sensitivity for month
            $bulan = ucfirst(strtolower($bulan));
            $bulanAngka = $this->convertBulanToNumber($bulan);
            $saldoAwal = $this->hitungSaldoAwalRob($penganggaran->id, $tahun, $bulan);

            // Fetch BKU Records - FIXED Logic for is_bunga_record
            $bkuData = BukuKasUmum::where('penganggaran_id', $penganggaran->id)
                ->whereMonth('tanggal_transaksi', $bulanAngka)
                ->whereYear('tanggal_transaksi', $tahun)
                ->where(function ($query) {
                    $query->where('is_bunga_record', false)->orWhereNull('is_bunga_record');
                })
                ->with(['rekeningBelanja', 'kodeKegiatan'])
                ->orderBy('rekening_belanja_id') // Corrected Column
                ->orderBy('tanggal_transaksi')
                ->get();
            
            Log::info("BKU Data Count for ROB: " . $bkuData->count());

            $robData = [];
            $totalRealisasi = 0;
            $runningTotal = 0;

            foreach ($bkuData as $transaksi) {
                // Safe navigation for relationships
                $kodeRekening = $transaksi->rekeningBelanja?->kode_rekening ?? 'N/A';
                $namaRekening = $transaksi->rekeningBelanja?->rincian_objek ?? 'N/A';

                // Skip items without valid account code if they shouldn't be here (optional)
                if ($kodeRekening === 'N/A') {
                     Log::warning("Skipping transaction ID {$transaksi->id} due to missing Rekening Belanja");
                     continue; 
                }

                if (!isset($robData[$kodeRekening])) {
                    $robData[$kodeRekening] = [
                        'kode' => $kodeRekening,
                        'nama_rekening' => $namaRekening,
                        'transaksi' => [],
                        'total_realisasi' => 0
                    ];
                }

                $realisasi = $transaksi->total_transaksi_kotor;
                $runningTotal += $realisasi;
                $totalRealisasi += $realisasi;
                $robData[$kodeRekening]['total_realisasi'] += $realisasi;

                $robData[$kodeRekening]['transaksi'][] = [
                    'tanggal' => $transaksi->tanggal_transaksi->format('d-m-Y'),
                    'no_bukti' => $transaksi->id_transaksi ?? $transaksi->id, // Fallback ID
                    'uraian' => $transaksi->uraian_opsional ?? $transaksi->uraian,
                    'realisasi' => $realisasi,
                    'jumlah' => $runningTotal,
                    'sisa_anggaran' => $saldoAwal - $runningTotal
                ];
            }

            // HTML return is kept empty if view doesn't exist, to prevent error.
            // If user has the view, they can uncomment or I can wrap in try-catch
            $html = ''; 
            try {
                 // $html = view('laporan.partials.bkp-rob-table', ...)->render();
            } catch (\Exception $e) {}

            // Ambil tanggal tutup BKU jika ada
            $bungaRecord = BukuKasUmum::where('penganggaran_id', $penganggaran->id)
                ->whereMonth('tanggal_transaksi', $bulanAngka)
                ->whereYear('tanggal_transaksi', $tahun)
                ->where('is_bunga_record', true)
                ->first();

            $tanggalTutup = ($bungaRecord && $bungaRecord->tanggal_tutup) 
                ? Carbon::parse($bungaRecord->tanggal_tutup) 
                : Carbon::create($tahun, $bulanAngka, 1)->endOfMonth();

            return response()->json([
                'success' => true,
                'html' => $html,
                'rob_data' => $robData,
                'data' => [
                    'saldo_awal' => $saldoAwal,
                    'total_realisasi' => $totalRealisasi,
                    'sisa_anggaran' => $saldoAwal - $totalRealisasi,
                    'sekolah' => $penganggaran->sekolah,
                    'kepala_sekolah' => $penganggaran->kepala_sekolah,
                    'nip_kepala_sekolah' => $penganggaran->nip_kepala_sekolah,
                    'bendahara' => $penganggaran->bendahara,
                    'nip_bendahara' => $penganggaran->nip_bendahara,
                    'tanggal_penutupan' => $tanggalTutup->locale('id')->translatedFormat('d F Y'),
                ],
            ]);
        } catch (\Exception $e) {
            Log::error('Error get BKP ROB data: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    public function generateBkpRobPdf(Request $request)
    {
        try {
            $tahun = $request->query('tahun');
            $bulanInput = $request->query('bulan');

            $penganggaran = Penganggaran::where('tahun_anggaran', $tahun)->first();
            if (!$penganggaran) return response()->json(['error' => 'Data penganggaran tidak ditemukan'], 404);

            $sekolah = SekolahProfile::first();

            $monthsToProcess = [];
            // Determine months based on input
            if ($bulanInput === 'Tahap 1') {
                $monthsToProcess = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni'];
            } elseif ($bulanInput === 'Tahap 2') {
                $monthsToProcess = ['Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
            } elseif ($bulanInput === 'Tahunan') {
                $monthsToProcess = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
            } else {
                // Single month
                $monthsToProcess = [ucfirst(strtolower($bulanInput))];
            }

            $reports = [];

            foreach ($monthsToProcess as $bulan) {
                $bulanAngka = $this->convertBulanToNumber($bulan);
                $saldoAwal = $this->hitungSaldoAwalRob($penganggaran->id, $tahun, $bulan);

                $bkuData = BukuKasUmum::where('penganggaran_id', $penganggaran->id)
                    ->whereMonth('tanggal_transaksi', $bulanAngka)
                    ->whereYear('tanggal_transaksi', $tahun)
                    ->where(function ($query) {
                        $query->where('is_bunga_record', false)->orWhereNull('is_bunga_record');
                    })
                    ->with(['rekeningBelanja', 'kodeKegiatan'])
                    ->orderBy('rekening_belanja_id')
                    ->orderBy('tanggal_transaksi')
                    ->get();

                $robData = [];
                $totalRealisasi = 0;
                $runningTotal = 0;

                foreach ($bkuData as $transaksi) {
                    $kodeRekening = $transaksi->rekeningBelanja?->kode_rekening ?? 'N/A';
                    $namaRekening = $transaksi->rekeningBelanja?->rincian_objek ?? 'N/A';

                    if ($kodeRekening === 'N/A') continue;

                    if (!isset($robData[$kodeRekening])) {
                        $robData[$kodeRekening] = [
                            'kode' => $kodeRekening,
                            'nama_rekening' => $namaRekening,
                            'transaksi' => [],
                            'total_realisasi' => 0
                        ];
                    }

                    $realisasi = $transaksi->total_transaksi_kotor;
                    $runningTotal += $realisasi;
                    $totalRealisasi += $realisasi;
                    $robData[$kodeRekening]['total_realisasi'] += $realisasi;

                    $robData[$kodeRekening]['transaksi'][] = [
                        'tanggal' => $transaksi->tanggal_transaksi->format('d-m-Y'),
                        'no_bukti' => $transaksi->id_transaksi ?? $transaksi->id,
                        'uraian' => $transaksi->uraian_opsional ?? $transaksi->uraian,
                        'realisasi' => $realisasi,
                        'jumlah' => $runningTotal,
                        'sisa_anggaran' => $saldoAwal - $runningTotal
                    ];
                }

                // Ambil tanggal tutup BKU jika ada
                $bungaRecord = BukuKasUmum::where('penganggaran_id', $penganggaran->id)
                    ->whereMonth('tanggal_transaksi', $bulanAngka)
                    ->whereYear('tanggal_transaksi', $tahun)
                    ->where('is_bunga_record', true)
                    ->first();

                $tanggalTutup = ($bungaRecord && $bungaRecord->tanggal_tutup) 
                    ? Carbon::parse($bungaRecord->tanggal_tutup) 
                    : Carbon::create($tahun, $bulanAngka, 1)->endOfMonth();

                $reports[] = [
                    'tahun' => $tahun,
                    'bulan' => $bulan,
                    'bulanAngka' => $bulanAngka,
                    'penganggaran' => $penganggaran,
                    'sekolah' => $sekolah,
                    'saldoAwal' => $saldoAwal,
                    'robData' => $robData,
                    'totalRealisasi' => $totalRealisasi,
                    'sisaAnggaran' => $saldoAwal - $totalRealisasi,
                    'tanggal_penutupan' => $tanggalTutup->locale('id')->translatedFormat('d F Y'),
                ];
            }

            $printSettings = [
                'ukuran_kertas' => request()->input('paperSize', 'A4'),
                'orientasi' => request()->input('orientation', 'landscape'),
                'font_size' => request()->input('fontSize', '10pt')
            ];

            $data = [
                'reports' => $reports,
                'printSettings' => $printSettings,
                 // Pass these for fallback or if needed by view global logic, though reports loop handles it
                'convertNumberToBulan' => function ($angka) { return $this->convertNumberToBulan($angka); },
            ];

            $pdf = Pdf::loadView('laporan.rob_pdf', $data);
            $pdf->setPaper($printSettings['ukuran_kertas'], $printSettings['orientasi']);
            $pdf->setOptions([
                'defaultFont' => 'Arial',
                'isHtml5ParserEnabled' => true,
                'isRemoteEnabled' => true,
                'isPhpEnabled' => true,
                'chroot' => realpath(base_path()),
            ]);
            $filename = "BKP_ROB_{$bulanInput}_{$tahun}.pdf";
            return $pdf->stream($filename);

        } catch (\Exception $e) {
            Log::error('Error generating BKP ROB PDF: ' . $e->getMessage());
            return response()->json(['error' => 'Gagal generate PDF: ' . $e->getMessage()], 500);
        }
    }

    public function generateRobHtml($penganggaran, $tahun, $bulan, $bulanAngka)
    {
         // Placeholder implementation if needed, aligning with above fixes
          return '';
    }

    /**
     * Hitung saldo awal ROB untuk bulan tertentu (sisa dari bulan sebelumnya)
     */
    private function hitungSaldoAwalRob($penganggaran_id, $tahun, $bulan)
    {
        try {
            $bulanAngka = $this->convertBulanToNumber($bulan);

            // Jika bulan Januari, saldo awal adalah total penerimaan dana
            if ($bulanAngka == 1) {
                return $this->bukuKasService->hitungTotalDanaTersedia($penganggaran_id);
            }

            // Hitung total penerimaan dana sampai saat ini
            $totalPenerimaan = $this->bukuKasService->hitungTotalDanaTersedia($penganggaran_id);

            // Hitung total realisasi sampai bulan sebelumnya
            $totalRealisasiSampaiBulanSebelumnya = BukuKasUmum::where('penganggaran_id', $penganggaran_id)
                ->where(function ($query) {
                    $query->where('is_bunga_record', false)->orWhereNull('is_bunga_record');
                })
                ->where(function ($query) use ($tahun, $bulanAngka) {
                    // Transaksi dari Januari sampai bulan sebelumnya
                    $query->whereYear('tanggal_transaksi', $tahun)
                        ->whereMonth('tanggal_transaksi', '<', $bulanAngka);
                })
                ->sum('total_transaksi_kotor');

            // Saldo awal = Total Penerimaan - Total Realisasi sampai bulan sebelumnya
            $saldoAwal = $totalPenerimaan - $totalRealisasiSampaiBulanSebelumnya;

            return max(0, $saldoAwal);
        } catch (\Exception $e) {
            Log::error('Error hitungSaldoAwalRob: ' . $e->getMessage());
            return 0;
        }
    }

    // Helper methods (proxies to service)
    private function convertBulanToNumber($bulan)
    {
        return $this->bukuKasService->convertBulanToNumber($bulan);
    }

    private function convertNumberToBulan($angka)
    {
        return $this->bukuKasService->convertNumberToBulan($angka);
    }
}
