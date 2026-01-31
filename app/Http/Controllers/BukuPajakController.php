<?php

namespace App\Http\Controllers;

use App\Models\BukuKasUmum;
use App\Models\Penganggaran;
use App\Models\Sekolah; 
use App\Models\SekolahProfile; // Assuming SekolahProfile is the correct model from previous context
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class BukuPajakController extends Controller
{
    /**
     * Get data pajak untuk transaksi tertentu
     */
    public function getDataPajak($id)
    {
        try {
            $bku = BukuKasUmum::findOrFail($id);

            return response()->json([
                'success' => true,
                'data' => [
                    'tanggal_lapor' => $bku->tanggal_lapor ? $bku->tanggal_lapor->format('Y-m-d') : null,
                    'ntpn' => $bku->ntpn,
                    'kode_masa_pajak' => $bku->kode_masa_pajak,
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Gagal mengambil data pajak: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Simpan laporan pajak
     */
    public function laporPajak(Request $request, $id)
    {
        try {
            DB::beginTransaction();

            $validated = $request->validate([
                'tanggal_lapor' => 'required|date',
                'kode_masa_pajak' => 'required|string',
                'ntpn' => 'required|string|max:16|min:16',
            ], [
                'ntpn.required' => 'NTPN wajib diisi',
                'ntpn.max' => 'NTPN harus 16 digit',
                'ntpn.min' => 'NTPN harus 16 digit',
                'kode_masa_pajak.required' => 'Kode masa pajak wajib diisi',
                'tanggal_lapor.required' => 'Tanggal lapor wajib diisi',
                'tanggal_lapor.date' => 'Format tanggal tidak valid',
            ]);

            $bku = BukuKasUmum::findOrFail($id);

            // Update data pajak
            $bku->update([
                'tanggal_lapor' => $validated['tanggal_lapor'],
                'kode_masa_pajak' => $validated['kode_masa_pajak'],
                'ntpn' => $validated['ntpn'],
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Data pajak berhasil disimpan',
                'data' => $bku,
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            DB::rollBack();

            return response()->json([
                'success' => false,
                'message' => 'Validasi gagal',
                'errors' => $e->errors(),
            ], 422);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error menyimpan lapor pajak: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Gagal menyimpan data pajak: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get data BKP Pajak
     */
    public function getBkpPajakData(Request $request)
    {
        $tahun = $request->input('tahun');
        $bulan = $request->input('bulan');
        try {
            $penganggaran = Penganggaran::where('tahun_anggaran', $tahun)
                ->with('sekolah') // Eager load sekolah
                ->first();

            if (!$penganggaran) {
                return response()->json([
                    'success' => false,
                    'message' => 'Data penganggaran tidak ditemukan',
                ], 404);
            }

            $bulanAngka = $this->convertBulanToNumber($bulan);

            // Ambil data transaksi BKU yang memiliki pajak
            $bkuData = BukuKasUmum::where('penganggaran_id', $penganggaran->id)
                ->whereMonth('tanggal_transaksi', $bulanAngka)
                ->whereYear('tanggal_transaksi', $tahun)
                ->where(function ($query) {
                    $query->where('total_pajak', '>', 0)
                        ->orWhere('total_pajak_daerah', '>', 0);
                })
                ->with(['kodeKegiatan', 'rekeningBelanja'])
                ->orderBy('tanggal_transaksi', 'asc')
                ->get();

            // Siapkan data untuk tampilan (bisa multiple rows per transaksi)
            $pajakRows = [];
            $runningPenerimaan = 0;
            $runningPengeluaran = 0;
            $currentSaldo = 0;

            // Variabel untuk total
            $totalPpn = 0;
            $totalPph21 = 0;
            $totalPph22 = 0;
            $totalPph23 = 0;
            $totalPb1 = 0;
            $totalPenerimaan = 0;
            $totalPengeluaran = 0;

            foreach ($bkuData as $transaksi) {
                $pajakName = strtolower($transaksi->pajak ?? '');
                $pajakDaerahName = strtolower($transaksi->pajak_daerah ?? '');

                $baseUraian = $transaksi->uraian_opsional ?? $transaksi->uraian ?? '';
                $hasPajakPusat = $transaksi->total_pajak > 0;
                $hasPajakDaerah = $transaksi->total_pajak_daerah > 0;

                // Jika ada pajak pusat, buat baris terpisah
                if ($hasPajakPusat) {
                    $ppn = 0;
                    $pph21 = 0;
                    $pph22 = 0;
                    $pph23 = 0;

                    // Klasifikasi Pajak Pusat
                    if (strpos($pajakName, 'pph21') !== false || strpos($pajakName, 'pph 21') !== false) {
                        $pph21 = $transaksi->total_pajak;
                        $totalPph21 += $pph21;
                    } elseif (strpos($pajakName, 'pph22') !== false || strpos($pajakName, 'pph 22') !== false) {
                        $pph22 = $transaksi->total_pajak;
                        $totalPph22 += $pph22;
                    } elseif (strpos($pajakName, 'pph23') !== false || strpos($pajakName, 'pph 23') !== false) {
                        $pph23 = $transaksi->total_pajak;
                        $totalPph23 += $pph23;
                    } else {
                        $ppn = $transaksi->total_pajak;
                        $totalPpn += $ppn;
                    }

                    $jumlah = $ppn + $pph21 + $pph22 + $pph23;
                    $pengeluaran = (!empty($transaksi->ntpn)) ? $jumlah : 0;
                    $totalPengeluaran += $pengeluaran;

                    // Tentukan uraian untuk pajak pusat
                    $uraianPusat = '';
                    if (!empty($transaksi->ntpn)) {
                        if ($pph21 > 0) {
                            $uraianPusat = 'Setor Pajak PPh 21 ' . ($transaksi->persen_pajak ?? '') . '% ' . $baseUraian;
                        } elseif ($pph22 > 0) {
                            $uraianPusat = 'Setor Pajak PPh 22 ' . ($transaksi->persen_pajak ?? '') . '% ' . $baseUraian;
                        } elseif ($pph23 > 0) {
                            $uraianPusat = 'Setor Pajak PPh 23 ' . ($transaksi->persen_pajak ?? '') . '% ' . $baseUraian;
                        } else {
                            $uraianPusat = 'Setor Pajak ' . ($transaksi->pajak ?? '') . ' ' . ($transaksi->persen_pajak ?? '') . '% ' . $baseUraian;
                        }
                    } else {
                        if ($pph21 > 0) {
                            $uraianPusat = 'Terima Pajak PPh 21 ' . ($transaksi->persen_pajak ?? '') . '% ' . $baseUraian;
                        } elseif ($pph22 > 0) {
                            $uraianPusat = 'Terima Pajak PPh 22 ' . ($transaksi->persen_pajak ?? '') . '% ' . $baseUraian;
                        } elseif ($pph23 > 0) {
                            $uraianPusat = 'Terima Pajak PPh 23 ' . ($transaksi->persen_pajak ?? '') . '% ' . $baseUraian;
                        } else {
                            $uraianPusat = 'Terima Pajak ' . ($transaksi->pajak ?? '') . ' ' . ($transaksi->persen_pajak ?? '') . '% ' . $baseUraian;
                        }
                    }

                    // Update running total
                    if ($jumlah != 0 || $pengeluaran != 0) {
                        $runningPenerimaan += $jumlah;
                        $runningPengeluaran += $pengeluaran;
                        $currentSaldo = $runningPenerimaan - $runningPengeluaran;
                    }

                    $pajakRows[] = [
                        'transaksi' => $transaksi,
                        'uraian' => $uraianPusat,
                        'ppn' => $ppn,
                        'pph21' => $pph21,
                        'pph22' => $pph22,
                        'pph23' => $pph23,
                        'pb1' => 0,
                        'jumlah' => $jumlah,
                        'pengeluaran' => $pengeluaran,
                        'saldo' => $currentSaldo
                    ];
                }

                // Jika ada pajak daerah (PB 1), buat baris terpisah
                if ($hasPajakDaerah) {
                    $pb1 = $transaksi->total_pajak_daerah;
                    $totalPb1 += $pb1;

                    $jumlah = $pb1;
                    $pengeluaran = (!empty($transaksi->ntpn)) ? $jumlah : 0;
                    $totalPengeluaran += $pengeluaran;

                    // Tentukan uraian untuk pajak daerah
                    $uraianDaerah = '';
                    if (!empty($transaksi->ntpn)) {
                        $uraianDaerah = 'Setor Pajak PB 1 ' . ($transaksi->persen_pajak_daerah ?? '') . '% ' . $baseUraian;
                    } else {
                        $uraianDaerah = 'Terima Pajak PB 1 ' . ($transaksi->persen_pajak_daerah ?? '') . '% ' . $baseUraian;
                    }

                    // Update running total
                    if ($jumlah != 0 || $pengeluaran != 0) {
                        $runningPenerimaan += $jumlah;
                        $runningPengeluaran += $pengeluaran;
                        $currentSaldo = $runningPenerimaan - $runningPengeluaran;
                    }

                    $pajakRows[] = [
                        'transaksi' => $transaksi,
                        'uraian' => $uraianDaerah,
                        'ppn' => 0,
                        'pph21' => 0,
                        'pph22' => 0,
                        'pph23' => 0,
                        'pb1' => $pb1,
                        'jumlah' => $jumlah,
                        'pengeluaran' => $pengeluaran,
                        'saldo' => $currentSaldo
                    ];
                }
            }

            $totalPenerimaan = $totalPpn + $totalPph21 + $totalPph22 + $totalPph23 + $totalPb1;

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
                'items' => $pajakRows, // Return as items for React
                'data' => [
                    'total_penerimaan' => $totalPenerimaan,
                    'total_pengeluaran' => $totalPengeluaran,
                    'saldo_akhir' => $currentSaldo,
                    'total_pajak' => [
                        'ppn' => $totalPpn,
                        'pph21' => $totalPph21,
                        'pph22' => $totalPph22,
                        'pph23' => $totalPph23,
                        'pb1' => $totalPb1
                    ],
                    'sekolah' => $penganggaran->sekolah,
                    'kepala_sekolah' => $penganggaran->kepala_sekolah,
                    'nip_kepala_sekolah' => $penganggaran->nip_kepala_sekolah,
                    'bendahara' => $penganggaran->bendahara,
                    'nip_bendahara' => $penganggaran->nip_bendahara,
                    'tanggal_penutupan' => $tanggalTutup->locale('id')->translatedFormat('d F Y'),
                ],
            ]);
        } catch (\Exception $e) {
            Log::error('Error get BKP Pajak data: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Gagal memuat data BKP Pajak: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Generate PDF BKP Pajak
     */
    /**
     * Generate PDF BKP Pajak
     */
    public function generateBkpPajakPdf(Request $request)
    {
        try {
            // Get Parameters from Request
            $tahun = $request->query('tahun');
            $bulan = $request->query('bulan');

            // Get Settings
            $paperSize = $request->input('paperSize', 'F4');
            $orientation = $request->input('orientation', 'landscape');
            $fontSize = $request->input('fontSize', '10pt');

            Carbon::setLocale('id');

            // Handle multi-month logic if needed, but for now assuming single month from user request context (dropdown selection)
            // But let's support array logic if similar to BKP Umum
            $monthsToProcess = [$bulan];
            if ($bulan === 'Tahap 1') {
                $monthsToProcess = ['januari', 'februari', 'maret', 'april', 'mei', 'juni'];
            } elseif ($bulan === 'Tahap 2') {
                $monthsToProcess = ['juli', 'agustus', 'september', 'oktober', 'november', 'desember'];
            } elseif ($bulan === 'Tahunan') {
                $monthsToProcess = [
                    'januari', 'februari', 'maret', 'april', 'mei', 'juni',
                    'juli', 'agustus', 'september', 'oktober', 'november', 'desember'
                ];
            }

            $reportData = [];

            $penganggaran = Penganggaran::where('tahun_anggaran', $tahun)->with('sekolah')->first();
            if (!$penganggaran) {
                return response('Data penganggaran tidak ditemukan', 404);
            }
            
            // Ambil data sekolah (Global Profile) logic fallback
            $sekolahProfile = SekolahProfile::first(); 
            // Prefer penganggaran->sekolah which is related to the budget year context usually

             foreach ($monthsToProcess as $m) {
                $bulanAngka = $this->convertBulanToNumber($m);
                
                // --- CORE LOGIC START (Derived from getBkpPajakData) ---
                $bkuData = BukuKasUmum::where('penganggaran_id', $penganggaran->id)
                    ->whereMonth('tanggal_transaksi', $bulanAngka)
                    ->whereYear('tanggal_transaksi', $tahun)
                    ->where(function ($query) {
                        $query->where('total_pajak', '>', 0)
                            ->orWhere('total_pajak_daerah', '>', 0);
                    })
                    ->with(['kodeKegiatan', 'rekeningBelanja'])
                    ->orderBy('tanggal_transaksi', 'asc')
                    ->get();

                $pajakRows = [];
                // Add Saldo Awal Row if needed? Usually BKP Pajak starts fresh or carries over?
                // Request image shows "Saldo awal bulan ... 0". Implies we might need to calculate prev month saldo.
                // Assuming 0 for now based on typical tax book behavior unless specific logic requested.
                // But wait, the image shows "Saldo awal bulan | ... | Saldo 0".
                
                $runningPenerimaan = 0;
                $runningPengeluaran = 0;
                $currentSaldo = 0;

                // Saldo Awal Logic (Simplified: Tax is usually settled monthly, but let's assume 0 carried over)
                $saldoAwal = 0;
                
                // Add Saldo Awal Row to list
                $pajakRows[] = [
                    'is_saldo_awal' => true,
                    'tanggal' => Carbon::create($tahun, $bulanAngka, 1)->format('Y-m-d'),
                    'uraian' => 'Saldo awal bulan',
                    'saldo' => 0
                ];

                $totalPpn = 0; $totalPph21 = 0; $totalPph22 = 0; $totalPph23 = 0; $totalPb1 = 0;
                $totalPenerimaan = 0; $totalPengeluaran = 0;

                foreach ($bkuData as $transaksi) {
                    $pajakName = strtolower($transaksi->pajak ?? '');
                    $baseUraian = $transaksi->uraian_opsional ?? $transaksi->uraian ?? '';
                    $hasPajakPusat = $transaksi->total_pajak > 0;
                    $hasPajakDaerah = $transaksi->total_pajak_daerah > 0;

                    if ($hasPajakPusat) {
                        $ppn=0; $pph21=0; $pph22=0; $pph23=0;
                        if (strpos($pajakName, 'pph21') !== false || strpos($pajakName, 'pph 21') !== false) $pph21 = $transaksi->total_pajak;
                        elseif (strpos($pajakName, 'pph22') !== false || strpos($pajakName, 'pph 22') !== false) $pph22 = $transaksi->total_pajak;
                        elseif (strpos($pajakName, 'pph23') !== false || strpos($pajakName, 'pph 23') !== false) $pph23 = $transaksi->total_pajak;
                        else $ppn = $transaksi->total_pajak;

                        $totalPpn += $ppn; $totalPph21 += $pph21; $totalPph22 += $pph22; $totalPph23 += $pph23;

                        $jumlah = $ppn + $pph21 + $pph22 + $pph23;
                        $keluar = (!empty($transaksi->ntpn)) ? $jumlah : 0;
                        
                        $totalPenerimaan += $jumlah;
                        $totalPengeluaran += $keluar;

                        $uraianPusat = '';
                         if (!empty($transaksi->ntpn)) {
                            if ($pph21 > 0) $uraianPusat = 'Setor Pajak PPh 21 ' . ($transaksi->persen_pajak ?? '') . '% ' . $baseUraian;
                            elseif ($pph22 > 0) $uraianPusat = 'Setor Pajak PPh 22 ' . ($transaksi->persen_pajak ?? '') . '% ' . $baseUraian;
                            elseif ($pph23 > 0) $uraianPusat = 'Setor Pajak PPh 23 ' . ($transaksi->persen_pajak ?? '') . '% ' . $baseUraian;
                            else $uraianPusat = 'Setor Pajak ' . ($transaksi->pajak ?? '') . ' ' . ($transaksi->persen_pajak ?? '') . '% ' . $baseUraian;
                        } else {
                            if ($pph21 > 0) $uraianPusat = 'Terima Pajak PPh 21 ' . ($transaksi->persen_pajak ?? '') . '% ' . $baseUraian;
                            elseif ($pph22 > 0) $uraianPusat = 'Terima Pajak PPh 22 ' . ($transaksi->persen_pajak ?? '') . '% ' . $baseUraian;
                            elseif ($pph23 > 0) $uraianPusat = 'Terima Pajak PPh 23 ' . ($transaksi->persen_pajak ?? '') . '% ' . $baseUraian;
                            else $uraianPusat = 'Terima Pajak ' . ($transaksi->pajak ?? '') . ' ' . ($transaksi->persen_pajak ?? '') . '% ' . $baseUraian;
                        }

                        if ($jumlah != 0 || $keluar != 0) {
                            $runningPenerimaan += $jumlah;
                            $runningPengeluaran += $keluar;
                            $currentSaldo = $runningPenerimaan - $runningPengeluaran;
                        }

                        $pajakRows[] = [
                            'tanggal' => $transaksi->tanggal_transaksi,
                            'no_kode' => $transaksi->rekeningBelanja->kode_rekening ?? '-',
                            'no_buku' => $transaksi->kode_masa_pajak ?? $transaksi->id_transaksi, // Using ID or Tax Code as book number equivalent
                            'uraian' => $uraianPusat,
                            'ppn' => $ppn,
                            'pph21' => $pph21,
                            'pph22' => $pph22,
                            'pph23' => $pph23,
                            'pb1' => 0,
                            'jumlah' => $jumlah,
                            'pengeluaran' => $keluar,
                            'saldo' => $currentSaldo
                        ];
                    }

                    if ($hasPajakDaerah) {
                        $pb1 = $transaksi->total_pajak_daerah;
                        $totalPb1 += $pb1;

                        $jumlah = $pb1;
                        $keluar = (!empty($transaksi->ntpn)) ? $jumlah : 0;
                        
                        $totalPenerimaan += $jumlah;
                        $totalPengeluaran += $keluar;

                        $uraianDaerah = !empty($transaksi->ntpn) 
                            ? 'Setor Pajak PB 1 ' . ($transaksi->persen_pajak_daerah ?? '') . '% ' . $baseUraian
                            : 'Terima Pajak PB 1 ' . ($transaksi->persen_pajak_daerah ?? '') . '% ' . $baseUraian;

                         if ($jumlah != 0 || $keluar != 0) {
                            $runningPenerimaan += $jumlah;
                            $runningPengeluaran += $keluar;
                            $currentSaldo = $runningPenerimaan - $runningPengeluaran;
                        }

                        $pajakRows[] = [
                            'tanggal' => $transaksi->tanggal_transaksi,
                            'no_kode' => $transaksi->rekeningBelanja->kode_rekening ?? '-',
                            'no_buku' => '-',
                            'uraian' => $uraianDaerah,
                            'ppn' => 0,
                            'pph21' => 0,
                            'pph22' => 0,
                            'pph23' => 0,
                            'pb1' => $pb1,
                            'jumlah' => $jumlah,
                            'pengeluaran' => $keluar,
                            'saldo' => $currentSaldo
                        ];
                    }
                }
                // --- CORE LOGIC END ---

                // Ambil tanggal tutup BKU jika ada
                $bungaRecord = BukuKasUmum::where('penganggaran_id', $penganggaran->id)
                    ->whereMonth('tanggal_transaksi', $bulanAngka)
                    ->whereYear('tanggal_transaksi', $tahun)
                    ->where('is_bunga_record', true)
                    ->first();

                $tanggalTutup = ($bungaRecord && $bungaRecord->tanggal_tutup) 
                    ? Carbon::parse($bungaRecord->tanggal_tutup) 
                    : Carbon::create($tahun, $bulanAngka, 1)->endOfMonth();

                $reportData[] = [
                    'tahun' => $tahun,
                    'bulan' => $m,
                    'items' => $pajakRows,
                    'sekolah' => $penganggaran->sekolah,
                    'data' => [
                        'total_penerimaan' => $totalPenerimaan,
                        'total_pengeluaran' => $totalPengeluaran,
                        'saldo_akhir' => $currentSaldo,
                        'total_pajak' => [
                            'ppn' => $totalPpn,
                            'pph21' => $totalPph21,
                            'pph22' => $totalPph22,
                            'pph23' => $totalPph23,
                            'pb1' => $totalPb1
                        ]
                    ],
                    'kepala_sekolah' => [
                        'nama' => $penganggaran->kepala_sekolah ?? $penganggaran->sekolah->nama_kepala_sekolah,
                        'nip' => $penganggaran->nip_kepala_sekolah ?? $penganggaran->sekolah->nip_kepala_sekolah,
                    ],
                    'bendahara' => [
                        'nama' => $penganggaran->bendahara ?? $penganggaran->sekolah->nama_bendahara,
                        'nip' => $penganggaran->nip_bendahara ?? $penganggaran->sekolah->nip_bendahara,
                    ],
                    'formatAkhirBulanLengkapHari' => $tanggalTutup->locale('id')->translatedFormat('d F Y'),
                ];
             }

            $pdf = Pdf::loadView('laporan.bkp_pajak_pdf', [
                'reportData' => $reportData,
                'paperSize' => $paperSize,
                'orientation' => $orientation,
                'fontSize' => $fontSize
            ]);
            $pdf->setPaper($paperSize, $orientation);

            return $pdf->stream("BKP_Pajak_{$bulan}_{$tahun}.pdf");

        } catch (\Exception $e) {
             return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    // Helper methods
    private function convertBulanToNumber($bulan)
    {
        $bulanList = [
            'Januari' => 1,
            'Februari' => 2,
            'Maret' => 3,
            'April' => 4,
            'Mei' => 5,
            'Juni' => 6,
            'Juli' => 7,
            'Agustus' => 8,
            'September' => 9,
            'Oktober' => 10,
            'November' => 11,
            'Desember' => 12,
        ];

        return $bulanList[ucfirst(strtolower($bulan))] ?? 1;
    }

    private function convertNumberToBulan($angka)
    {
        $bulanList = [
            1 => 'Januari',
            2 => 'Februari',
            3 => 'Maret',
            4 => 'April',
            5 => 'Mei',
            6 => 'Juni',
            7 => 'Juli',
            8 => 'Agustus',
            9 => 'September',
            10 => 'Oktober',
            11 => 'November',
            12 => 'Desember',
        ];

        return $bulanList[$angka] ?? 'Januari';
    }

    private function getTanggalAkhirBulan($tahun, $bulan)
    {
        $bulanAngka = $this->convertBulanToNumber($bulan);
        return Carbon::create($tahun, $bulanAngka, 1)->endOfMonth();
    }
}
