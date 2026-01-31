<?php

namespace App\Http\Controllers;

use App\Models\BukuKasUmum;
use App\Models\PenerimaanDana;
use App\Models\Penganggaran;
use App\Models\SekolahProfile; // CHANGED
use App\Models\TandaTerima;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;

class TandaTerimaController extends Controller
{
    // Method untuk mendapatkan tahun anggaran (internal)
    private function getTahunAnggaranData()
    {
        try {
            $tahunAnggaran = Penganggaran::select('id', 'tahun_anggaran')
                ->orderBy('tahun_anggaran', 'desc')
                ->get()
                ->map(function ($penganggaran) {
                    return [
                        'id' => $penganggaran->id,
                        'tahun' => $penganggaran->tahun_anggaran,
                    ];
                });

            return $tahunAnggaran;
        } catch (\Exception $e) {
            Log::error('Error fetching tahun anggaran: ' . $e->getMessage());
            return collect();
        }
    }

    // Method untuk API
    public function getTahunAnggaran()
    {
        try {
            $tahunAnggaran = $this->getTahunAnggaranData();

            return response()->json([
                'success' => true,
                'data' => $tahunAnggaran,
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching tahun anggaran: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Gagal mengambil tahun anggaran.',
            ], 500);
        }
    }

    public function index(Request $request)
    {
        return Inertia::render('FiturPelengkap/TandaTerima/Index');
    }

    public function search(Request $request)
    {
        try {
            $search = $request->input('search', '');
            $tahun = $request->input('tahun', '');
            $startDate = $request->input('start_date', '');
            $endDate = $request->input('end_date', '');

            // Query dengan filter tahun
            $query = TandaTerima::with([
                'penganggaran',
                'kodeKegiatan',
                'rekeningBelanja',
                'bukuKasUmum',
            ]);

            // Filter berdasarkan tahun jika dipilih
            if ($tahun) {
                $query->where('penganggaran_id', $tahun);
            }

            // Filter berdasarkan tanggal
            if ($startDate) {
                $query->whereHas('bukuKasUmum', function ($q) use ($startDate) {
                    $q->whereDate('tanggal_transaksi', '>=', $startDate);
                });
            }

            if ($endDate) {
                $query->whereHas('bukuKasUmum', function ($q) use ($endDate) {
                    $q->whereDate('tanggal_transaksi', '<=', $endDate);
                });
            }

            // Filter pencarian
            if ($search) {
                $query->where(function ($query) use ($search) {
                    $query->whereHas('bukuKasUmum', function ($q) use ($search) {
                        $q->where('uraian', 'ILIKE', "%{$search}%")
                            ->orWhere('uraian_opsional', 'ILIKE', "%{$search}%");
                    })
                        ->orWhereHas('rekeningBelanja', function ($q) use ($search) {
                            $q->where('kode_rekening', 'ILIKE', "%{$search}%");
                        });
                });
            }

            $tandaTerimas = $query->latest()->paginate(10);

            // Format data untuk response JSON
            $formattedTandaTerimas = $tandaTerimas->map(function ($tandaTerima, $index) use ($tandaTerimas) {
                $number = ($tandaTerimas->currentPage() - 1) * $tandaTerimas->perPage() + $index + 1;

                return [
                    'id' => $tandaTerima->id,
                    'number' => $number,
                    'kode_rekening' => $tandaTerima->rekeningBelanja->kode_rekening ?? '-',
                    'uraian' => $tandaTerima->bukuKasUmum->uraian_opsional ?? $tandaTerima->bukuKasUmum->uraian,
                    'tanggal' => \Carbon\Carbon::parse($tandaTerima->bukuKasUmum->tanggal_transaksi)->format('d/m/Y'),
                    'jumlah' => 'Rp ' . number_format($tandaTerima->bukuKasUmum->total_transaksi_kotor, 0, ',', '.'),
                    'preview_url' => route('tanda-terima.preview', $tandaTerima->id),
                    'pdf_url' => route('tanda-terima.pdf', $tandaTerima->id),
                    // 'delete_url' => route('tanda-terima.destroy', $tandaTerima->id),
                    'delete_data' => [
                        'id' => $tandaTerima->id,
                        'uraian' => $tandaTerima->bukuKasUmum->uraian_opsional ?? $tandaTerima->bukuKasUmum->uraian,
                    ],
                ];
            });

            // Prepare filter info for display
            $filterInfo = [
                'search' => $search,
                'tahun' => $tahun,
                'start_date' => $startDate,
                'end_date' => $endDate,
                'has_filters' => $search || $tahun || $startDate || $endDate,
            ];

            return response()->json([
                'success' => true,
                'data' => $formattedTandaTerimas,
                'total' => $tandaTerimas->total(),
                'search_term' => $search,
                'selected_tahun' => $tahun,
                'filter_info' => $filterInfo,
                'pagination' => [
                    'current_page' => $tandaTerimas->currentPage(),
                    'last_page' => $tandaTerimas->lastPage(),
                    'per_page' => $tandaTerimas->perPage(),
                    'total' => $tandaTerimas->total(),
                    'has_more' => $tandaTerimas->hasMorePages(),
                ],
            ]);
        } catch (\Exception $e) {
            Log::error('Error searching tanda terima: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan saat mencari data',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    public function checkAvailableData(Request $request)
    {
        try {
            $year = $request->input('year');
            
            // Only count records that have REQUIRED fields for TandaTerima
            $query = BukuKasUmum::whereDoesntHave('tandaTerima')
                ->where('is_bunga_record', false)
                ->whereNotNull('nama_penerima_pembayaran')
                ->where('nama_penerima_pembayaran', '!=', '')
                ->whereNotNull('kode_kegiatan_id')
                ->whereNotNull('rekening_belanja_id');
            
            if ($year) {
                // Assuming year is penganggaran_id based on frontend
                $query->where('penganggaran_id', $year);
            }

            $availableCount = $query->count();

            Log::info('Available data count for Tanda Terima: ' . $availableCount . ' Year: ' . $year);

            return response()->json([
                'success' => true,
                'data' => [
                    'availableCount' => $availableCount,
                    'pending_count' => 0,
                    'failed_count' => 0,
                ],
            ]);
        } catch (\Exception $e) {
            Log::error('Error checking available data for Tanda Terima: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Gagal memeriksa data yang tersedia.',
            ], 500);
        }
    }

    public function generateBatch(Request $request)
    {
        try {
            $offset = $request->input('offset', 0);
            $year = $request->input('tahun'); // Get year filter

            $baseQuery = BukuKasUmum::whereDoesntHave('tandaTerima')
                ->where('is_bunga_record', false)
                ->whereNotNull('nama_penerima_pembayaran')
                ->where('nama_penerima_pembayaran', '!=', '')
                ->whereNotNull('kode_kegiatan_id')
                ->whereNotNull('rekening_belanja_id');
                
            if ($year) {
                $baseQuery->where('penganggaran_id', $year);
            }

            $totalWithoutTandaTerima = $baseQuery->count();

            Log::info("Generate Batch Tanda Terima - Total: {$totalWithoutTandaTerima}, Offset: {$offset}, Year: {$year}");

            if ($totalWithoutTandaTerima === 0) {
                return response()->json([
                    'success' => true,
                    'data' => [
                        'processed' => 0,
                        'success' => 0,
                        'failed' => 0,
                        'remaining' => 0,
                        'progress' => 100,
                        'has_more' => false,
                        'total' => 0,
                        'total_processed' => 0,
                        'message' => 'Tidak ada data yang perlu diproses',
                    ],
                ]);
            }

            // Re-apply filters for fetching batch
            $query = BukuKasUmum::with([
                'penganggaran',
                'kodeKegiatan',
                'rekeningBelanja',
            ])
                ->whereDoesntHave('tandaTerima')
                ->where('is_bunga_record', false)
                ->whereNotNull('nama_penerima_pembayaran')
                ->where('nama_penerima_pembayaran', '!=', '')
                ->whereNotNull('kode_kegiatan_id')
                ->whereNotNull('rekening_belanja_id')
                ->orderBy('id');
            
            if ($year) {
                $query->where('penganggaran_id', $year);
            }
            
            $bukuKasUmums = $query->skip($offset)->limit(50)->get();

            Log::info("Found {$bukuKasUmums->count()} BukuKasUmum to process");
            
            $processed = 0;
            $success = 0;
            $failed = 0;

            if ($bukuKasUmums->isEmpty()) {
                 return response()->json([
                    'success' => true,
                    'data' => [
                        'processed' => 0,
                        'success' => 0,
                        'failed' => 0,
                        'remaining' => 0,
                        'progress' => 100,
                        'has_more' => false,
                        'total' => $totalWithoutTandaTerima,
                        'total_processed' => $offset,
                    ],
                ]);
            }

            DB::beginTransaction();

            try {
                foreach ($bukuKasUmums as $bukuKasUmum) {
                    try {
                        $existing = TandaTerima::where('buku_kas_umum_id', $bukuKasUmum->id)->first();
                        if (!$existing) {
                            if (empty($bukuKasUmum->nama_penerima_pembayaran)) {
                                Log::warning("Skipping BKU ID {$bukuKasUmum->id}: No receiver name");
                                $failed++; $processed++; continue;
                            }
                            
                            $sekolahId = $bukuKasUmum->penganggaran->sekolah_id ?? SekolahProfile::first()?->id;

                            if (!$sekolahId) {
                                Log::warning("Skipping BKU ID {$bukuKasUmum->id}: No Sekolah ID found");
                                $failed++; $processed++; continue;
                            }

                            $penerimaanDana = PenerimaanDana::where('penganggaran_id', $bukuKasUmum->penganggaran_id)->first();
                            if (!$penerimaanDana) {
                                // Fallback logic from user code
                                $penerimaanDana = PenerimaanDana::create([
                                    'penganggaran_id' => $bukuKasUmum->penganggaran_id,
                                    'sumber_dana' => 'BOSP Reguler',
                                    'jumlah_dana' => 0,
                                    'tanggal_terima' => now(),
                                ]);
                            }

                             if (!$bukuKasUmum->kode_kegiatan_id || !$bukuKasUmum->rekening_belanja_id) {
                                Log::warning("Skipping BKU ID {$bukuKasUmum->id}: Missing Kode Kegiatan or Rekening Belanja");
                                $failed++; $processed++; continue;
                            }

                            TandaTerima::create([
                                'sekolah_id' => $sekolahId,
                                'penganggaran_id' => $bukuKasUmum->penganggaran_id,
                                'kode_kegiatan_id' => $bukuKasUmum->kode_kegiatan_id,
                                'kode_rekening_id' => $bukuKasUmum->rekening_belanja_id,
                                'penerimaan_dana_id' => $penerimaanDana->id,
                                'buku_kas_umum_id' => $bukuKasUmum->id,
                            ]);
                            $success++;
                        }
                        $processed++;
                    } catch (\Exception $e) {
                         Log::error('Error processing item ' . $bukuKasUmum->id . ': ' . $e->getMessage());
                         $failed++;
                         $processed++;
                    }
                }
                DB::commit();
            } catch (\Exception $e) {
                DB::rollBack();
                throw $e;
            }

            // Calculation Logic
            $totalProcessedSoFar = $offset + $processed;
            $progress = 0;
            if ($totalWithoutTandaTerima > 0) {
                 $progress = min(100, (int) round(($totalProcessedSoFar / $totalWithoutTandaTerima) * 100));
            }

            $remainingQuery = BukuKasUmum::whereDoesntHave('tandaTerima')
                ->where('is_bunga_record', false)
                ->whereNotNull('nama_penerima_pembayaran')
                ->where('nama_penerima_pembayaran', '!=', '')
                ->whereNotNull('kode_kegiatan_id')
                ->whereNotNull('rekening_belanja_id');
            
            if ($year) {
                $remainingQuery->where('penganggaran_id', $year);
            }
            $remainingAfterProcess = $remainingQuery->count();

            $hasMore = $remainingAfterProcess > 0;
            
            return response()->json([
                'success' => true,
                'data' => [
                    'processed' => $processed,
                    'success' => $success,
                    'failed' => $failed,
                    'remaining' => $remainingAfterProcess,
                    'progress' => $progress,
                    'has_more' => $hasMore,
                    'total' => $totalWithoutTandaTerima,
                    'total_processed' => $totalProcessedSoFar,
                ],
            ]);

        } catch (\Exception $e) {
            Log::error('Error in generateBatch: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    public function destroy($id)
    {
        try {
            $tandaTerima = TandaTerima::with(['bukuKasUmum'])->find($id);

            if (! $tandaTerima) {
                return response()->json(['success' => false, 'message' => 'Data tidak ditemukan'], 404);
            }

            $uraian = $tandaTerima->bukuKasUmum->uraian_opsional ?? $tandaTerima->bukuKasUmum->uraian;
            $tandaTerima->delete();

            return response()->json([
                'success' => true,
                'message' => "Tanda terima untuk '{$uraian}' berhasil dihapus!",
            ]);
        } catch (\Exception $e) {
            Log::error('Error deleting tanda terima: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    public function deleteAll(Request $request)
    {
         try {
             $deletedCount = TandaTerima::query()->delete();
             return response()->json([
                'success' => true,
                'message' => "Berhasil menghapus {$deletedCount} data tanda terima",
             ]);
         } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
         }
    }

    public function generatePdf(Request $request, $id)
    {
        try {
            $tandaTerima = TandaTerima::with([
                'sekolah',
                'penganggaran',
                'kodeKegiatan',
                'rekeningBelanja',
                'penerimaanDana',
                'bukuKasUmum.uraianDetails',
            ])->findOrFail($id);

            $kodeKegiatan = $tandaTerima->kodeKegiatan;
            $rekeningBelanja = $tandaTerima->rekeningBelanja;
            $bukuKasUmum = $tandaTerima->bukuKasUmum;
            $totalAmount = $bukuKasUmum->total_transaksi_kotor ?? 0;
            $pajakPusat = $bukuKasUmum->total_pajak ?? 0;
            $jumlahTerima = $totalAmount - $pajakPusat;
            $jumlahUang = $this->formatJumlahUang($jumlahTerima);

            // Get Settings
            $paperSize = $request->input('paper_size', 'Folio');
            $fontSize = $request->input('font_size', '10pt');
            $orientation = $request->input('orientation', 'landscape');

            $data = [
                'tandaTerima' => $tandaTerima,
                'kodeKegiatan' => $kodeKegiatan,
                'rekeningBelanja' => $rekeningBelanja,
                'bukuKasUmum' => $bukuKasUmum,
                'jumlahUangText' => $jumlahUang,
                'totalAmount' => $totalAmount,
                'pajakPusat' => $pajakPusat,
                'jumlahTerima' => $jumlahTerima,
                'tanggalLunas' => $this->formatTanggalLunas($bukuKasUmum->tanggal_transaksi ?? now()),
                'sekolah' => SekolahProfile::first(),
                'fontSize' => $fontSize,
            ];

            $pdf = PDF::loadView('pelengkap.tanda_terima_pdf', $data);

            // Handle Paper Size
            if ($paperSize === 'Folio') {
                // F4 / Folio size in points (approx 21.5cm x 33cm)
                // 33cm = ~935.43 pt, 21.6cm = ~612.28 pt
                $pdf->setPaper([0, 0, 612.28, 935.43], $orientation);
            } else {
                $pdf->setPaper($paperSize, $orientation);
            }

            return $pdf->stream('Tanda_Terima_Honor_'.$tandaTerima->id.'.pdf');

        } catch (\Exception $e) {
            Log::error('Error generate PDF: ' . $e->getMessage());
            return redirect()->back()->with('error', $e->getMessage());
        }
    }
    
    // Preview URL logic
    public function previewPdf($id, Request $request) {
        return $this->generatePdf($request, $id); // Reuse Logic
    }

    public function downloadAll(Request $request)
    {
        try {
            $search = $request->input('search', '');
            $tahun = $request->input('tahun', '');
            $startDate = $request->input('start_date', '');
            $endDate = $request->input('end_date', '');
            
            // Get Settings
            $paperSize = $request->input('paper_size', 'Folio');
            $fontSize = $request->input('font_size', '10pt');
            $orientation = $request->input('orientation', 'landscape');

             $query = TandaTerima::with([
                'sekolah',
                'penganggaran',
                'kodeKegiatan',
                'rekeningBelanja',
                'penerimaanDana',
                'bukuKasUmum.uraianDetails',
            ]);

            if ($tahun) $query->where('penganggaran_id', $tahun);
             if ($startDate) {
                $query->whereHas('bukuKasUmum', function ($q) use ($startDate) {
                    $q->whereDate('tanggal_transaksi', '>=', $startDate);
                });
            }
            if ($endDate) {
                $query->whereHas('bukuKasUmum', function ($q) use ($endDate) {
                    $q->whereDate('tanggal_transaksi', '<=', $endDate);
                });
            }
             if ($search) {
                $query->where(function ($query) use ($search) {
                    $query->whereHas('bukuKasUmum', function ($q) use ($search) {
                        $q->where('uraian', 'ILIKE', "%{$search}%")
                            ->orWhere('uraian_opsional', 'ILIKE', "%{$search}%");
                    })
                        ->orWhereHas('rekeningBelanja', function ($q) use ($search) {
                            $q->where('kode_rekening', 'ILIKE', "%{$search}%");
                        });
                });
            }

            $tandaTerimas = $query->latest()->get();

             if ($tandaTerimas->isEmpty()) {
                 return redirect()->back()->with('error', 'Tidak ada data.');
             }

             $tandaTerimaData = [];
             foreach ($tandaTerimas as $tandaTerima) {
                 $bukuKasUmum = $tandaTerima->bukuKasUmum;
                 $totalAmount = $bukuKasUmum->total_transaksi_kotor ?? 0;
                 $pajakPusat = $bukuKasUmum->total_pajak ?? 0;
                 $jumlahTerima = $totalAmount - $pajakPusat;
                 $jumlahUang = $this->formatJumlahUang($jumlahTerima);

                 $tandaTerimaData[] = [
                    'tandaTerima' => $tandaTerima,
                    'penganggaran' => $tandaTerima->penganggaran,
                    'kodeKegiatan' => $tandaTerima->kodeKegiatan,
                    'rekeningBelanja' => $tandaTerima->rekeningBelanja,
                    'bukuKasUmum' => $bukuKasUmum,
                    'jumlahUangText' => $jumlahUang,
                    'totalAmount' => $totalAmount,
                    'pajakPusat' => $pajakPusat,
                    'jumlahTerima' => $jumlahTerima,
                    'tanggalLunas' => $this->formatTanggalLunas($bukuKasUmum->tanggal_transaksi ?? now()),
                 ];
             }

             $data = [
                 'tandaTerimas' => $tandaTerimaData,
                 'totalTandaTerima' => count($tandaTerimaData),
                 'tanggalDownload' => now()->format('d/m/Y H:i'),
                 'sekolah' => SekolahProfile::first(),
                 'fontSize' => $fontSize,
             ];

             $pdf = PDF::loadView('pelengkap.download_all_tanda_terima_pdf', $data);
             
            // Handle Paper Size
            if ($paperSize === 'Folio') {
                $pdf->setPaper([0, 0, 612.28, 935.43], $orientation);
            } else {
                $pdf->setPaper($paperSize, $orientation);
            }
             
             return $pdf->stream('Tanda_Terima_All.pdf');

        } catch (\Exception $e) {
            Log::error('Error download all: ' . $e->getMessage());
            return redirect()->back()->with('error', $e->getMessage());
        }
    }

    private function formatJumlahUang($amount)
    {
        $formatter = new \NumberFormatter('id_ID', \NumberFormatter::SPELLOUT);
        $words = $formatter->format($amount);
        return ucfirst($words).' Rupiah';
    }

    private function formatTanggalLunas($tanggal)
    {
        $bulanIndonesia = [
            'January' => 'Januari', 'February' => 'Februari', 'March' => 'Maret',
            'April' => 'April', 'May' => 'Mei', 'June' => 'Juni',
            'July' => 'Juli', 'August' => 'Agustus', 'September' => 'September',
            'October' => 'Oktober', 'November' => 'November', 'December' => 'Desember',
        ];

        $tanggalObj = \Carbon\Carbon::parse($tanggal);
        return "Lunas Bayar, {$tanggalObj->format('d')} " . ($bulanIndonesia[$tanggalObj->format('F')] ?? '') . " {$tanggalObj->format('Y')}";
    }
}
