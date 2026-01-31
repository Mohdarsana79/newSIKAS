<?php

namespace App\Http\Controllers;

use App\Services\BukuKasService;
use App\Models\Penganggaran;
use App\Models\BukuKasUmum;
use App\Models\SekolahProfile;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class RegistrasiPenutupanKasController extends Controller
{
    protected $bukuKasService;

    public function __construct(BukuKasService $bukuKasService)
    {
        $this->bukuKasService = $bukuKasService;
    }

    private function getDataFromBkpUmumCalculation($penganggaran_id, $tahun, $bulan, $bulanAngka)
    {
        return $this->bukuKasService->getDataFromBkpUmumCalculation($penganggaran_id, $tahun, $bulan, $bulanAngka);
    }

    private function getSaldoKasFromPembantu($penganggaran_id, $tahun, $bulan, $bulanAngka)
    {
        return $this->bukuKasService->getSaldoKasFromPembantu($penganggaran_id, $tahun, $bulan, $bulanAngka);
    }

    private function hitungSaldoBankSebelumBulan($penganggaran_id, $bulanAngka)
    {
        return $this->bukuKasService->hitungSaldoBankSebelumBulan($penganggaran_id, $bulanAngka);
    }

    private function getDenominasiUangKertas($saldoKas)
    {
        return $this->bukuKasService->getDenominasiUangKertas($saldoKas);
    }

    private function hitungTotalUangKertas($uangKertas)
    {
        return $this->bukuKasService->hitungTotalUangKertas($uangKertas);
    }

    private function getDenominasiUangLogam($sisaUntukLogam)
    {
        return $this->bukuKasService->getDenominasiUangLogam($sisaUntukLogam);
    }

    private function hitungTotalUangLogam($uangLogam)
    {
        return $this->bukuKasService->hitungTotalUangLogam($uangLogam);
    }

    /**
     * Get data BKP Registrasi
     */
    public function getBkpRegData(Request $request)
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

            // Fix case sensitivity
            $bulan = ucfirst(strtolower($bulan));
            $bulanAngka = $this->bukuKasService->convertBulanToNumber($bulan);

            // Ambil data sekolah
            $sekolah = SekolahProfile::first();

            // PERBAIKAN: Gunakan data langsung dari perhitungan BKP Umum
            $dataUmum = $this->getDataFromBkpUmumCalculation($penganggaran->id, $tahun, $bulan, $bulanAngka);
            $totalPenerimaan = $dataUmum['totalPenerimaan'];
            $totalPengeluaran = $dataUmum['totalPengeluaran'];
            $saldoBuku = $totalPenerimaan - $totalPengeluaran;

            // Hitung saldo kas B dari currentSaldo di tab Pembantu
            $saldoKas = $this->getSaldoKasFromPembantu($penganggaran->id, $tahun, $bulan, $bulanAngka);

            // Hitung saldo bank
            // Hitung saldo bank
            // Logic: Ambil Saldo Akhir BKP Bank sesuai bulan (supaya match dengan Tab BKP Bank)
            $saldoBank = $this->bukuKasService->hitungSaldoAkhirBkpBank($penganggaran->id, $tahun, $bulan);

            // Data uang kertas berdasarkan saldo kas dari Pembantu
            $uangKertas = $this->getDenominasiUangKertas($saldoKas);
            $totalUangKertas = $this->hitungTotalUangKertas($uangKertas);

            // Hitung sisa untuk uang logam
            $sisaUntukLogam = $saldoKas - $totalUangKertas;
            $uangLogam = $this->getDenominasiUangLogam($sisaUntukLogam);
            $totalUangLogam = $this->hitungTotalUangLogam($uangLogam);

            $saldoAkhirBuku = $totalUangKertas + $totalUangLogam + $saldoBank;

            $saldoAkhirBuku = $totalUangKertas + $totalUangLogam + $saldoBank;

            // Date processing for display
            // Fetch BKU Bunga Record which typically contains closing info
            $bungaRecord = BukuKasUmum::where('penganggaran_id', $penganggaran->id)
                ->whereMonth('tanggal_transaksi', $bulanAngka)
                ->whereYear('tanggal_transaksi', $tahun)
                ->where('is_bunga_record', true)
                ->first();

            $tanggalPenutupan = '-';
            if ($bungaRecord && $bungaRecord->tanggal_tutup) {
                 // Assuming tanggal_tutup is Y-m-d.
                 $tanggalPenutupan = Carbon::parse($bungaRecord->tanggal_tutup)->locale('id')->translatedFormat('d F Y');
            } else {
                 // Fallback to end of month if actual closing date not found
                 $tanggalPenutupan = Carbon::create($tahun, $bulanAngka, 1)->endOfMonth()->locale('id')->translatedFormat('d F Y');
            }
            
            // Fetch Previous Closing Date
            $prevDate = Carbon::create($tahun, $bulanAngka, 1)->subMonth();
            $prevMonth = $prevDate->month;
            $prevYear = $prevDate->year;

            $bungaRecordLalu = null;
            if ($prevYear == $tahun) {
                 // Same year, use same penganggaran
                 $bungaRecordLalu = BukuKasUmum::where('penganggaran_id', $penganggaran->id)
                    ->whereMonth('tanggal_transaksi', $prevMonth)
                    ->whereYear('tanggal_transaksi', $prevYear)
                    ->where('is_bunga_record', true)
                    ->first();
            } else {
                 // Different year, try to find penganggaran for previous year
                 $penganggaranLalu = Penganggaran::where('tahun_anggaran', $prevYear)->first();
                 if ($penganggaranLalu) {
                      $bungaRecordLalu = BukuKasUmum::where('penganggaran_id', $penganggaranLalu->id)
                        ->whereMonth('tanggal_transaksi', $prevMonth)
                        ->whereYear('tanggal_transaksi', $prevYear)
                        ->where('is_bunga_record', true)
                        ->first();
                 }
            }

            if ($bungaRecordLalu && $bungaRecordLalu->tanggal_tutup) {
                $tanggalPenutupanLalu = Carbon::parse($bungaRecordLalu->tanggal_tutup)->locale('id')->translatedFormat('d F Y');
            } else {
                $tanggalPenutupanLalu = $prevDate->endOfMonth()->locale('id')->translatedFormat('d F Y');
            }

            $data = [
                'tahun' => $tahun,
                'bulan' => $bulan,
                'bulanAngka' => $bulanAngka,
                'penganggaran' => $penganggaran, // This contains kepala_sekolah, etc.
                'sekolah' => $penganggaran->sekolah,
                'totalPenerimaan' => $totalPenerimaan,
                'totalPengeluaran' => $totalPengeluaran,
                'saldoBuku' => max(0, $saldoBuku),
                'saldoKas' => max(0, $saldoKas),
                'saldoBank' => max(0, $saldoBank),
                'uangKertas' => $uangKertas,
                'uangLogam' => $uangLogam,
                'totalUangKertas' => $totalUangKertas,
                'totalUangLogam' => $totalUangLogam,
                'saldoAkhirBuku' => $saldoAkhirBuku,
                'perbedaan' => $saldoBuku - $saldoKas, // A - B is usually Saldo Buku - Saldo Kas, but Image says Saldo Kas (B) composed of Cash+Bank. Image shows A = Saldo Buku. B = Saldo Kas (Tunai). Image shows Perbedaan A-B. Wait.
                // Image: Saldo Buku (A) = 24.893.
                // Saldo Kas (B) = 9.233. 
                // Saldo Kas B Terdiri Dari: Uang Kertas + Logam = 9.233.
                // Saldo Bank (3) = 0.
                // Jumlah (1+2+3) = 9.233. Wait, Image says Jumlah (1+2+3) = 24.893.
                // So (1+2) is Tunai. (3) is Bank.
                // Totals = Tunai + Bank.
                // Perbedaan (A-B). Wait. Usually A is Saldo Buku. B is total real cash+bank.
                // If A != B, there is difference.
                // In image: Saldo Kas (B) : 9.233. Sub Jumlah (1) + (2) = 9.233.
                // Saldo Bank (3) = ?? logic is weird in image text but numbers align.
                // Let's stick to standard:
                // Saldo Buku = Penerimaan - Pengeluaran.
                // Saldo Fisik = Uang Kertas + Logam + Saldo Bank.
                // Perbedaan = Saldo Buku - Saldo Fisik.
                
                'penjelasanPerbedaan' => 'Masih ada sebagian dana BOS yang belum diambil di rekening bank. Masih ada sisa tunai yang disimpan bendahara.',
                'tanggalPenutupan' => $tanggalPenutupan,
                'tanggalPenutupanLalu' => $tanggalPenutupanLalu,
                
                // Signature data from Penganggaran
                'namaBendahara' => $penganggaran->bendahara ?? '-',
                'namaKepalaSekolah' => $penganggaran->kepala_sekolah ?? '-',
                'nipBendahara' => $penganggaran->nip_bendahara ?? '-',
                'nipKepalaSekolah' => $penganggaran->nip_kepala_sekolah ?? '-',
                'kecamatan' => $penganggaran->sekolah->kecamatan ?? '-'
            ];

            return response()->json([
                'success' => true,
                'data' => $data,
            ]);
        } catch (\Exception $e) {
            Log::error('Error get BKP Registrasi data: ' . $e->getMessage());
            Log::error($e->getTraceAsString());

            return response()->json([
                'success' => false,
                'message' => 'Gagal memuat data BKP Registrasi: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Generate PDF BKP Registrasi
     */
    public function generateBkpRegPdf(Request $request)
    {
        try {
            $tahun = $request->query('tahun');
            $bulanInput = $request->query('bulan');

            $penganggaran = Penganggaran::where('tahun_anggaran', $tahun)->with('sekolah')->first();
            if (!$penganggaran) return response()->json(['error' => 'Data penganggaran tidak ditemukan'], 404);

            $monthsToProcess = [];
            if ($bulanInput === 'Tahap 1') {
                $monthsToProcess = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni'];
            } elseif ($bulanInput === 'Tahap 2') {
                $monthsToProcess = ['Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
            } elseif ($bulanInput === 'Tahunan') {
                $monthsToProcess = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
            } else {
                $monthsToProcess = [ucfirst(strtolower($bulanInput))];
            }

            $reports = [];

            foreach ($monthsToProcess as $bulan) {
                // Fix case sensitivity
                $bulan = ucfirst(strtolower($bulan));
                $bulanAngka = $this->bukuKasService->convertBulanToNumber($bulan);
                
                $dataUmum = $this->getDataFromBkpUmumCalculation($penganggaran->id, $tahun, $bulan, $bulanAngka);
                $totalPenerimaan = $dataUmum['totalPenerimaan'];
                $totalPengeluaran = $dataUmum['totalPengeluaran'];
                $saldoBuku = $totalPenerimaan - $totalPengeluaran;

                $saldoKas = $this->getSaldoKasFromPembantu($penganggaran->id, $tahun, $bulan, $bulanAngka);
                $saldoBank = $this->bukuKasService->hitungSaldoAkhirBkpBank($penganggaran->id, $tahun, $bulan);

                $uangKertas = $this->getDenominasiUangKertas($saldoKas);
                $totalUangKertas = $this->hitungTotalUangKertas($uangKertas);

                $sisaUntukLogam = $saldoKas - $totalUangKertas;
                $uangLogam = $this->getDenominasiUangLogam($sisaUntukLogam);
                $totalUangLogam = $this->hitungTotalUangLogam($uangLogam);
                
                $saldoAkhirBuku = $totalUangKertas + $totalUangLogam + $saldoBank;

                // Fetch Previous Closing Date
                $prevDate = Carbon::create($tahun, $bulanAngka, 1)->subMonth();
                $prevMonth = $prevDate->month;
                $prevYear = $prevDate->year;

                $bungaRecordLalu = null;
                if ($prevYear == $tahun) {
                     $bungaRecordLalu = BukuKasUmum::where('penganggaran_id', $penganggaran->id)
                        ->whereMonth('tanggal_transaksi', $prevMonth)
                        ->whereYear('tanggal_transaksi', $prevYear)
                        ->where('is_bunga_record', true)
                        ->first();
                } else {
                     $penganggaranLalu = Penganggaran::where('tahun_anggaran', $prevYear)->first();
                     if ($penganggaranLalu) {
                          $bungaRecordLalu = BukuKasUmum::where('penganggaran_id', $penganggaranLalu->id)
                            ->whereMonth('tanggal_transaksi', $prevMonth)
                            ->whereYear('tanggal_transaksi', $prevYear)
                            ->where('is_bunga_record', true)
                            ->first();
                     }
                }

                if ($bungaRecordLalu && $bungaRecordLalu->tanggal_tutup) {
                    $tanggalPenutupanLalu = Carbon::parse($bungaRecordLalu->tanggal_tutup)->locale('id')->translatedFormat('d F Y');
                } else {
                    $tanggalPenutupanLalu = $prevDate->endOfMonth()->locale('id')->translatedFormat('d F Y');
                }

                $bungaRecord = BukuKasUmum::where('penganggaran_id', $penganggaran->id)
                    ->whereMonth('tanggal_transaksi', $bulanAngka)->whereYear('tanggal_transaksi', $tahun)->where('is_bunga_record', true)
                    ->first();
                
                $tanggalPenutupan = ($bungaRecord && $bungaRecord->tanggal_tutup)
                    ? Carbon::parse($bungaRecord->tanggal_tutup)->locale('id')->translatedFormat('d F Y')
                    : Carbon::create($tahun, $bulanAngka, 1)->endOfMonth()->locale('id')->translatedFormat('d F Y');

                $reports[] = [
                    'tahun' => $tahun,
                    'bulan' => $bulan,
                    'bulanAngka' => $bulanAngka,
                    'penganggaran' => $penganggaran,
                    'sekolah' => $penganggaran->sekolah,
                    'totalPenerimaan' => $totalPenerimaan,
                    'totalPengeluaran' => $totalPengeluaran,
                    'saldoBuku' => max(0, $saldoBuku),
                    'saldoKas' => max(0, $saldoKas),
                    'saldoBank' => max(0, $saldoBank),
                    'uangKertas' => $uangKertas,
                    'uangLogam' => $uangLogam,
                    'totalUangKertas' => $totalUangKertas,
                    'totalUangLogam' => $totalUangLogam,
                    'saldoAkhirBuku' => $saldoAkhirBuku,
                    'perbedaan' => $saldoBuku - $saldoKas,
                    'penjelasanPerbedaan' => 'Masih ada sebagian dana BOS yang belum diambil di rekening bank. Masih ada sisa tunai yang disimpan bendahara.',
                    'tanggalPenutupan' => $tanggalPenutupan,
                    'tanggalPenutupanLalu' => $tanggalPenutupanLalu,
                    'namaBendahara' => $penganggaran->bendahara ?? '-',
                    'namaKepalaSekolah' => $penganggaran->kepala_sekolah ?? '-',
                    'nipBendahara' => $penganggaran->nip_bendahara ?? '-',
                    'nipKepalaSekolah' => $penganggaran->nip_kepala_sekolah ?? '-',
                    'tanggal_cetak_format' => $tanggalPenutupan,
                    'kecamatan' => $penganggaran->sekolah->kecamatan ?? '-'
                ];
            }

            $printSettings = [
                'ukuran_kertas' => request()->input('paperSize', 'A4'),
                'orientasi' => request()->input('orientation', 'portrait'),
                'font_size' => request()->input('fontSize', '10pt')
            ];

            $data = [
                'reports' => $reports,
                'printSettings' => $printSettings,
                'tanggal_cetak' => now()->format('d/m/Y'),
            ];

            $pdf = Pdf::loadView('laporan.registrasi_penutupan_kas_pdf', $data);
            $pdf->setPaper($printSettings['ukuran_kertas'], $printSettings['orientasi']);
            $pdf->setOptions([
                'defaultFont' => 'Arial',
                'isHtml5ParserEnabled' => true,
                'isRemoteEnabled' => true,
                'isPhpEnabled' => true,
                'chroot' => realpath(base_path()),
            ]);
            $filename = "BKP_Registrasi_{$bulanInput}_{$tahun}.pdf";
            return $pdf->stream($filename);

        } catch (\Exception $e) {
            Log::error('Error generating BKP Registrasi PDF: ' . $e->getMessage());
            return response()->json(['error' => 'Gagal generate PDF: ' . $e->getMessage()], 500);
        }
    }
}
