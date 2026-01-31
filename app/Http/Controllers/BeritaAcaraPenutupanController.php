<?php

namespace App\Http\Controllers;

use App\Models\Penganggaran;
use App\Models\Sekolah;
use App\Models\SekolahProfile;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\Carbon;
use App\Models\PenerimaanDana;
use App\Models\PenarikanTunai;
use App\Models\SetorTunai;
use App\Models\BukuKasUmum;
use Illuminate\Http\Request;
use App\Services\BukuKasService;
use Illuminate\Support\Facades\Log;

class BeritaAcaraPenutupanController extends Controller
{
    protected $bukuKasService;

    public function __construct(BukuKasService $bukuKasService)
    {
        $this->bukuKasService = $bukuKasService;
    }

    // Ganti semua pemanggilan method dengan service
    private function getDenominasiUangKertas($saldoKas)
    {
        return $this->bukuKasService->getDenominasiUangKertas($saldoKas);
    }

    private function getDenominasiUangLogam($sisaUntukLogam = 0)
    {
        return $this->bukuKasService->getDenominasiUangLogam($sisaUntukLogam);
    }

    private function hitungTotalUangKertas($uangKertas)
    {
        return $this->bukuKasService->hitungTotalUangKertas($uangKertas);
    }

    private function hitungTotalUangLogam($uangLogam)
    {
        return $this->bukuKasService->hitungTotalUangLogam($uangLogam);
    }

    private function hitungSaldoAkhirBkpBank($penganggaran_id, $tahun, $bulan)
    {
        return $this->bukuKasService->hitungSaldoAkhirBkpBank($penganggaran_id, $tahun, $bulan);
    }

    private function hitungSaldoBankSebelumBulan($penganggaran_id, $bulanTarget)
    {
        return $this->bukuKasService->hitungSaldoBankSebelumBulan($penganggaran_id, $bulanTarget);
    }

    private function hitungSaldoAwalBkpUmum($penganggaran_id, $tahun, $bulan)
    {
        return $this->bukuKasService->hitungSaldoAwalBkpUmum($penganggaran_id, $tahun, $bulan);
    }

    private function getSaldoKasFromPembantu($penganggaran_id, $tahun, $bulan, $bulanAngka)
    {
        return $this->bukuKasService->getSaldoKasFromPembantu($penganggaran_id, $tahun, $bulan, $bulanAngka);
    }

    private function getDataFromBkpUmumCalculation($penganggaran_id, $tahun, $bulan, $bulanAngka)
    {
        return $this->bukuKasService->getDataFromBkpUmumCalculation($penganggaran_id, $tahun, $bulan, $bulanAngka);
    }

    /**
     * Generate HTML untuk Berita Acara - VERSI DIPERBAIKI
     */
    public function generateBeritaAcaraHtml($penganggaran, $tahun, $bulan, $bulanAngka)
    {
        try {
            Log::info('=== GENERATE BERITA ACARA HTML ===', [
                'penganggaran_id' => $penganggaran->id,
                'tahun' => $tahun,
                'bulan' => $bulan,
                'bulan_angka' => $bulanAngka
            ]);

            // Ambil data untuk Berita Acara
            $data = $this->getDataForBeritaAcara($penganggaran->id, $tahun, $bulan, $bulanAngka);

            // Log data untuk debugging
            Log::info('Data Berita Acara yang akan ditampilkan:', [
                'totalUangKertasLogam' => $data['totalUangKertasLogam'],
                'saldoBank' => $data['saldoBank'],
                'totalKas' => $data['totalKas'],
                'saldoBuku' => $data['saldoBuku'],
                'perbedaan' => $data['perbedaan']
            ]);

            $html = view('laporan.partials.ba-pemeriksaan-kas-table', $data)->render();

            Log::info('=== BERITA ACARA HTML BERHASIL DIBUAT ===');

            return $html;
        } catch (\Exception $e) {
            Log::error('Error generate Berita Acara HTML: ' . $e->getMessage());
            Log::error('Stack trace: ' . $e->getTraceAsString());

            return '<div class="alert alert-danger">Error: ' . $e->getMessage() . '</div>';
        }
    }

    /**
     * Get data untuk Berita Acara Pemeriksaan Kas - VERSI DIPERBAIKI LENGKAP
     */
    public function getDataForBeritaAcara($penganggaran_id, $tahun, $bulan, $bulanAngka)
    {
        try {
            $penganggaran = Penganggaran::find($penganggaran_id);
            $sekolah = SekolahProfile::first();

            if (!$penganggaran || !$sekolah) {
                dd('Data penganggaran atau sekolah tidak ditemukan', $penganggaran_id);
                // throw new \Exception('Data penganggaran atau sekolah tidak ditemukan');
            }

            // Hitung tanggal akhir bulan
            $tanggalAkhirBulan = Carbon::create($tahun, $bulanAngka, 1)->endOfMonth();
            
            // Check for BKU closing date
            $bungaRecord = BukuKasUmum::where('penganggaran_id', $penganggaran_id)
                ->whereMonth('tanggal_transaksi', $bulanAngka)
                ->whereYear('tanggal_transaksi', $tahun)
                ->where('is_bunga_record', true)
                ->first();

            $actualDate = ($bungaRecord && $bungaRecord->tanggal_tutup) 
                ? Carbon::parse($bungaRecord->tanggal_tutup) 
                : $tanggalAkhirBulan;

            $namaHariAkhirBulan = $this->getNamaHariIndonesia($actualDate->dayOfWeek);

            Log::info('=== MEMULAI PERHITUNGAN BERITA ACARA ===', [
                'penganggaran_id' => $penganggaran_id,
                'tahun' => $tahun,
                'bulan' => $bulan,
                'bulan_angka' => $bulanAngka,
                'used_date' => $actualDate->format('Y-m-d')
            ]);
            
            // 1. Saldo Bank - ambil dari hitungSaldoAkhirBkpBank
            $saldoBank = $this->bukuKasService->hitungSaldoAkhirBkpBank($penganggaran_id, $tahun, $bulan);

            Log::info('Saldo Bank dari BKP Bank:', ['saldoBank' => $saldoBank]);

            // 2. Saldo Kas - ambil dari BKP Pembantu
            $saldoKas = $this->bukuKasService->getSaldoKasFromPembantu($penganggaran_id, $tahun, $bulan, $bulanAngka);

            Log::info('Saldo Kas dari BKP Pembantu:', ['saldoKas' => $saldoKas]);

            // 3. Saldo Buku - ambil currentSaldo dari BKP Umum
            // 3. Saldo Buku - ambil currentSaldo dari BKP Umum (via Service Calculation)
            $bkpCalc = $this->getDataFromBkpUmumCalculation($penganggaran_id, $tahun, $bulan, $bulanAngka);
            $saldoBuku = $bkpCalc['totalPenerimaan'] - $bkpCalc['totalPengeluaran'];
            Log::info('Saldo Buku dari BKP Umum (Service):', ['saldoBuku' => $saldoBuku]);

            // Data uang kertas dan logam
            $uangKertas = $this->getDenominasiUangKertas($saldoKas);
            $totalUangKertas = $this->hitungTotalUangKertas($uangKertas);

            $sisaUntukLogam = $saldoKas - $totalUangKertas;
            $uangLogam = $this->getDenominasiUangLogam($sisaUntukLogam);
            $totalUangLogam = $this->hitungTotalUangLogam($uangLogam);

            $totalUangKertasLogam = $totalUangKertas + $totalUangLogam;
            $totalKas = $totalUangKertasLogam + $saldoBank;

            $perbedaan = $saldoBuku - $saldoKas; // Corrected: Match Registrasi Logic (Buku - Tunai)

            // Format tanggal using Indonesian locale explicitly
            $formatTanggalAkhirBulan = $actualDate->locale('id')->translatedFormat('d F Y');

            // DEBUG: Log semua data secara detail
            Log::info('=== DETAIL PERHITUNGAN BERITA ACARA ===', [
                'saldoBank' => $saldoBank,
                'saldoKas' => $saldoKas,
                'saldoBuku' => $saldoBuku,
                'totalUangKertas' => $totalUangKertas,
                'totalUangLogam' => $totalUangLogam,
                'totalUangKertasLogam' => $totalUangKertasLogam,
                'totalKas' => $totalKas,
                'perbedaan' => $perbedaan,
                'denominasi_uang_kertas' => $uangKertas,
                'denominasi_uang_logam' => $uangLogam
            ]);

            // Validasi data
            if ($saldoBank < 0 || $saldoKas < 0 || $saldoBuku < 0) {
                Log::warning('Ada nilai negatif dalam perhitungan saldo', [
                    'saldoBank' => $saldoBank,
                    'saldoKas' => $saldoKas,
                    'saldoBuku' => $saldoBuku
                ]);
            }

            return [
                'tahun' => $tahun,
                'bulan' => $bulan,
                'penganggaran' => $penganggaran,
                'sekolah' => $sekolah,
                'uangKertas' => $uangKertas,
                'uangLogam' => $uangLogam,
                'totalUangKertas' => $totalUangKertas,
                'totalUangLogam' => $totalUangLogam,
                'totalUangKertasLogam' => $totalUangKertasLogam,
                'saldoBank' => $saldoBank,
                'totalKas' => $totalKas,
                'saldoBuku' => $saldoBuku,
                'perbedaan' => $perbedaan,
                'penjelasanPerbedaan' => $this->getPenjelasanPerbedaan($perbedaan),
                'formatTanggalAkhirBulan' => $formatTanggalAkhirBulan,
                'tanggalPenutupan' => $formatTanggalAkhirBulan,
                'namaHariAkhirBulan' => $namaHariAkhirBulan,
                'tanggalPemeriksaan' => $actualDate->locale('id')->translatedFormat('d F Y'),
                // Dates for SK, etc.
                'tanggalMulai' => Carbon::parse($tahun.'-01-01')->locale('id')->translatedFormat('d F Y'), // Placeholder if needed
                
                'namaBendahara' => $penganggaran->bendahara ?? '-',
                'namaKepalaSekolah' => $penganggaran->kepala_sekolah ?? '-',
                'nipBendahara' => $penganggaran->nip_bendahara ?? '-',
                'nipKepalaSekolah' => $penganggaran->nip_kepala_sekolah ?? '-',
                // Ensure Penganggaran model has these fields or accessors if they are dates
                'skKepsek' => $penganggaran->sk_kepala_sekolah ?? '-', // Example field name
                'tanggalSkKepsek' => $penganggaran->tanggal_sk_kepala_sekolah ? Carbon::parse($penganggaran->tanggal_sk_kepala_sekolah)->locale('id')->translatedFormat('d F Y') : '-',
                'skBendahara' => $penganggaran->sk_bendahara ?? '-', // Adjust field name if needed
                'tanggalSkBendahara' => $penganggaran->tanggal_sk_bendahara ? Carbon::parse($penganggaran->tanggal_sk_bendahara)->locale('id')->translatedFormat('d F Y') : '-',
                
                'namaKecamatan' => $sekolah->kecamatan ?? '.....................'
            ];
        } catch (\Exception $e) {
            Log::error('Error getDataForBeritaAcara: ' . $e->getMessage());
            Log::error('Stack trace: ' . $e->getTraceAsString());
            throw $e;
        }
    }

    /**
     * Ambil currentSaldo dari BKP Umum - VERSI DIPERBAIKI
     */
    private function getCurrentSaldoFromBkpUmum($penganggaran_id, $tahun, $bulan, $bulanAngka)
    {
        try {
            Log::info('=== MULAI PERHITUNGAN SALDO BUKU DARI BKP UMUM ===', [
                'penganggaran_id' => $penganggaran_id,
                'tahun' => $tahun,
                'bulan' => $bulan,
                'bulan_angka' => $bulanAngka
            ]);

            // Ambil semua data yang diperlukan untuk BKP Umum
            $penerimaanDanas = PenerimaanDana::where('penganggaran_id', $penganggaran_id)
                ->orderBy('tanggal_terima', 'asc')
                ->get();

            $penarikanTunais = PenarikanTunai::where('penganggaran_id', $penganggaran_id)
                ->whereMonth('tanggal_penarikan', $bulanAngka)
                ->whereYear('tanggal_penarikan', $tahun)
                ->orderBy('tanggal_penarikan', 'asc')
                ->get();

            $setorTunais = SetorTunai::where('penganggaran_id', $penganggaran_id)
                ->whereMonth('tanggal_setor', $bulanAngka)
                ->whereYear('tanggal_setor', $tahun)
                ->orderBy('tanggal_setor', 'asc')
                ->get();

            $bkuData = BukuKasUmum::where('penganggaran_id', $penganggaran_id)
                ->whereMonth('tanggal_transaksi', $bulanAngka)
                ->whereYear('tanggal_transaksi', $tahun)
                ->where('is_bunga_record', false)
                ->with(['kodeKegiatan', 'rekeningBelanja'])
                ->orderBy('tanggal_transaksi', 'asc')
                ->get();

            $bungaRecord = BukuKasUmum::where('penganggaran_id', $penganggaran_id)
                ->whereMonth('tanggal_transaksi', $bulanAngka)
                ->whereYear('tanggal_transaksi', $tahun)
                ->where('is_bunga_record', true)
                ->first();

            // PERBAIKAN: Gunakan method dari BukuKasService untuk hitung saldo awal
            $saldoAwal = $this->bukuKasService->hitungSaldoAwalBkpUmum($penganggaran_id, $tahun, $bulan);
            $saldoAwalTunai = $this->bukuKasService->hitungSaldoTunaiSebelumBulan($penganggaran_id, $bulanAngka);

            Log::info('Saldo Awal dari Service:', [
                'saldoAwal' => $saldoAwal,
                'saldoAwalTunai' => $saldoAwalTunai
            ]);

            // Hitung total penerimaan dasar
            $totalPenerimaan = $saldoAwal; // + $saldoAwalTunai; // Correct logic might be just saldoAwal if it includes physics.
             // Wait, hitungSaldoAwalBkpUmum usually returns the ending balance of previous month (Tunai + Bank).
             // Let's assume saldoAwal is correct.
             
             // Recalculating logic based on user code provided in prompt:
             // $totalPenerimaan = $saldoAwal + $saldoAwalTunai; 
             // This looks like double counting if saldoAwal implies total balance.
             // But the user PROMPTED this logic. I must follow the user's logic unless it's clearly broken.
             // "Gunakan method dari BukuKasService untuk hitung saldo awal... $saldoAwal = ... $saldoAwalTunai = ... $totalPenerimaan = $saldoAwal + $saldoAwalTunai;"
             // Code provided by user says:
             // $saldoAwal = $this->bukuKasService->hitungSaldoAwalBkpUmum($penganggaran_id, $tahun, $bulan);
             // $saldoAwalTunai = $this->bukuKasService->hitungSaldoTunaiSebelumBulan($penganggaran_id, $bulanAngka);
             // $totalPenerimaan = $saldoAwal + $saldoAwalTunai;
             
             // I will use strict provided logic.

            $totalPenerimaan = $saldoAwal + $saldoAwalTunai;

            // Tambahkan penerimaan dana di bulan ini
            $penerimaanBulanIni = $penerimaanDanas->filter(function ($penerimaan) use ($bulanAngka) {
                return \Carbon\Carbon::parse($penerimaan->tanggal_terima)->month == $bulanAngka;
            });
            $totalPenerimaanDanaBulanIni = $penerimaanBulanIni->sum('jumlah_dana');
            $totalPenerimaan += $totalPenerimaanDanaBulanIni;

            // Tambahkan penarikan tunai
            $totalPenarikanTunai = $penarikanTunais->sum('jumlah_penarikan');
            $totalPenerimaan += $totalPenarikanTunai;

            // PERBAIKAN: Hitung bunga bank yang EFEKTIF (hanya yang belum ada NTPN)
            $bungaEfektif = 0;
            $bungaRecordInfo = [
                'ada_bunga_record' => !is_null($bungaRecord),
                'bunga_bank' => $bungaRecord ? $bungaRecord->bunga_bank : 0,
                'pajak_bunga_bank' => $bungaRecord ? $bungaRecord->pajak_bunga_bank : 0,
                'ntpn' => $bungaRecord ? $bungaRecord->ntpn : null,
                'bunga_efektif' => 0
            ];

            if ($bungaRecord) {
                // Jika bunga sudah ada NTPN, maka bunga - pajak = 0 (tidak mempengaruhi saldo)
                if (empty($bungaRecord->ntpn)) {
                    $bungaEfektif = $bungaRecord->bunga_bank - $bungaRecord->pajak_bunga_bank;
                    $bungaRecordInfo['bunga_efektif'] = $bungaEfektif;
                    $bungaRecordInfo['keterangan'] = 'Bunga efektif (belum ada NTPN)';
                } else {
                    $bungaRecordInfo['keterangan'] = 'Bunga tidak efektif (sudah ada NTPN)';
                }
            }
            $totalPenerimaan += $bungaEfektif;

            Log::info('Komponen Penerimaan:', [
                'totalPenerimaanDanaBulanIni' => $totalPenerimaanDanaBulanIni,
                'totalPenarikanTunai' => $totalPenarikanTunai,
                'bungaRecord' => $bungaRecordInfo,
                'totalPenerimaan_sebelum_pajak' => $totalPenerimaan
            ]);

            // Hitung pajak untuk BKP Umum
            $pajakPenerimaan = 0;
            $pajakPengeluaran = 0;
            $pajakDaerahPenerimaan = 0;
            $pajakDaerahPengeluaran = 0;

            foreach ($bkuData as $transaksi) {
                // Pajak Pusat
                if ($transaksi->total_pajak > 0) {
                    $pajakPenerimaan += $transaksi->total_pajak;
                    if (!empty($transaksi->ntpn)) {
                        $pajakPengeluaran += $transaksi->total_pajak;
                    }
                }

                // Pajak Daerah
                if ($transaksi->total_pajak_daerah > 0) {
                    $pajakDaerahPenerimaan += $transaksi->total_pajak_daerah;
                    if (!empty($transaksi->ntpn)) {
                        $pajakDaerahPengeluaran += $transaksi->total_pajak_daerah;
                    }
                }
            }

            // Tambahkan SEMUA pajak ke total
            $totalPenerimaan += $pajakPenerimaan + $pajakDaerahPenerimaan;

            // Hitung total pengeluaran
            $totalSetorTunai = $setorTunais->sum('jumlah_setor');
            $totalBelanja = $bkuData->sum('total_transaksi_kotor');
            $totalPengeluaran = $totalSetorTunai + $totalBelanja + $pajakPengeluaran + $pajakDaerahPengeluaran;

            $currentSaldo = $totalPenerimaan - $totalPengeluaran;

            Log::info('Komponen Pengeluaran:', [
                'totalSetorTunai' => $totalSetorTunai,
                'totalBelanja' => $totalBelanja,
                'pajakPengeluaran' => $pajakPengeluaran,
                'pajakDaerahPengeluaran' => $pajakDaerahPengeluaran,
                'totalPengeluaran' => $totalPengeluaran
            ]);

            Log::info('Hasil Akhir Perhitungan Saldo Buku:', [
                'totalPenerimaan' => $totalPenerimaan,
                'totalPengeluaran' => $totalPengeluaran,
                'currentSaldo' => $currentSaldo
            ]);

            return $currentSaldo;
        } catch (\Exception $e) {
            Log::error('Error getCurrentSaldoFromBkpUmum: ' . $e->getMessage());
            Log::error('Stack trace: ' . $e->getTraceAsString());
            return 0;
        }
    }

    /**
     * Helper method untuk mendapatkan nama hari dalam Bahasa Indonesia
     */
    private function getNamaHariIndonesia($dayOfWeek)
    {
        $hari = [
            0 => 'Minggu',
            1 => 'Senin',
            2 => 'Selasa',
            3 => 'Rabu',
            4 => 'Kamis',
            5 => 'Jumat',
            6 => 'Sabtu',
        ];

        return $hari[$dayOfWeek] ?? 'Senin';
    }

    /**
     * Helper method untuk penjelasan perbedaan
     */
    private function getPenjelasanPerbedaan($perbedaan)
    {
        if (abs($perbedaan) < 1000) {
            return 'Tidak ada perbedaan yang signifikan antara saldo buku dan kas fisik.';
        } elseif ($perbedaan > 0) {
            return 'Saldo buku lebih besar dari kas fisik. Kemungkinan ada transaksi yang belum dicatat atau dana yang belum ditarik dari bank.';
        } else {
            return 'Kas fisik lebih besar dari saldo buku. Kemungkinan ada penerimaan yang belum dicatat atau kesalahan dalam pencatatan.';
        }
    }

    /**
     * Generate PDF Berita Acara - DIPERBAIKI
     */
    public function generateBeritaAcaraPdf(Request $request)
    {
        try {
            $tahun = $request->query('tahun');
            $bulanInput = $request->query('bulan');

            $penganggaran = Penganggaran::where('tahun_anggaran', $tahun)->with('sekolah')->first();

            if (!$penganggaran) {
                return response()->json(['error' => 'Data penganggaran tidak ditemukan'], 404);
            }

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
                 $bulan = ucfirst(strtolower($bulan));
                 $bulanAngka = $this->convertBulanToNumber($bulan);
                 
                 // Get data using existing method logic BUT need to ensure it returns array.
                 // getDataForBeritaAcara returns an array directly. perfect.
                 $reportData = $this->getDataForBeritaAcara($penganggaran->id, $tahun, $bulan, $bulanAngka);
                 $reports[] = $reportData;
            }

            $printSettings = [
                'ukuran_kertas' => request()->input('paperSize', 'A4'),
                'orientasi' => request()->input('orientation', 'portrait'),
                'font_size' => request()->input('fontSize', '11pt')
            ];
            
            $data = [
                'reports' => $reports,
                'printSettings' => $printSettings,
                'tanggal_cetak' => now()->format('d/m/Y'),
            ];

            $pdf = PDF::loadView('laporan.berita_acara_pemeriksaan_kas_pdf', $data);

            $pdf->setPaper($printSettings['ukuran_kertas'], $printSettings['orientasi']);

            $pdf->setOptions([
                'defaultFont' => 'Arial',
                'isHtml5ParserEnabled' => true,
                'isRemoteEnabled' => true,
                'isPhpEnabled' => true,
                'chroot' => realpath(base_path()),
            ]);

            $filename = "Berita_Acara_Pemeriksaan_Kas_{$bulanInput}_{$tahun}.pdf";

            return $pdf->stream($filename);
        } catch (\Exception $e) {
            Log::error('Error generating Berita Acara PDF: ' . $e->getMessage());
            return response()->json(['error' => 'Gagal generate PDF: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Get data Berita Acara untuk AJAX - DIPERBAIKI
     */
    public function getBeritaAcaraData(Request $request)
    {
        try {
            $tahun = $request->input('tahun');
            $bulan = $request->input('bulan');
            $penganggaran = Penganggaran::where('tahun_anggaran', $tahun)->with('sekolah')->first();

            if (!$penganggaran) {
                return response()->json([
                    'success' => false,
                    'message' => 'Data penganggaran tidak ditemukan',
                ], 404);
            }

            $bulanAngka = $this->convertBulanToNumber($bulan);
            $data = $this->getDataForBeritaAcara($penganggaran->id, $tahun, $bulan, $bulanAngka);

            // $html = view('laporan.partials.ba-pemeriksaan-kas-table', $data)->render();

            return response()->json([
                'success' => true,
                // 'html' => $html,
                'data' => $data,
            ]);
        } catch (\Exception $e) {
            Log::error('Error get Berita Acara data: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Gagal memuat data Berita Acara: ' . $e->getMessage(),
            ], 500);
        }
    }

    // Helper methods yang sama dengan controller lain
    private function convertBulanToNumber($bulan)
    {
        $bulanList = [
            'Januari' => 1,
            'januari' => 1,
            'Februari' => 2,
            'februari' => 2,
            'Maret' => 3,
            'maret' => 3,
            'April' => 4,
            'april' => 4,
            'Mei' => 5,
            'mei' => 5,
            'Juni' => 6,
            'juni' => 6,
            'Juli' => 7,
            'juli' => 7,
            'Agustus' => 8,
            'agustus' => 8,
            'September' => 9,
            'september' => 9,
            'Oktober' => 10,
            'oktober' => 10,
            'November' => 11,
            'november' => 11,
            'Desember' => 12,
            'desember' => 12,
        ];

        return $bulanList[$bulan] ?? 1;
    }
}
