<?php

namespace App\Http\Controllers;

use App\Models\BukuKasUmum;
use App\Models\BukuKasUmumUraianDetail;
use App\Models\Kwitansi;
use App\Models\PenerimaanDana;
use App\Models\Penganggaran;
use App\Models\SekolahProfile;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;

class KwitansiController extends Controller
{
    public function getTahunAnggaran()
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

            return response()->json([
                'success' => true,
                'data' => $tahunAnggaran,
            ]);
        } catch (\Exception $e) {
            Log::error('Error getting tahun anggaran: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Gagal mengambil data tahun anggaran',
            ], 500);
        }
    }

    public function index(Request $request)
    {
        return Inertia::render('FiturPelengkap/Kwitansi/Index');
    }

    public function search(Request $request)
    {
        try {
            $search = $request->input('search', '');
            $tahun = $request->input('tahun', '');
            $startDate = $request->input('start_date', '');
            $endDate = $request->input('end_date', '');

            // Query dengan filter tahun
            $query = Kwitansi::with([
                'penganggaran',
                'kodeKegiatan',
                'rekeningBelanja',
                'bukuKasUmum',
            ]);

            if ($tahun && is_numeric($tahun)) {
                $query->where('penganggaran_id', $tahun);
            } elseif ($tahun && strlen($tahun) == 4) {
                 $p = Penganggaran::where('tahun_anggaran', $tahun)->first();
                 if ($p) $query->where('penganggaran_id', $p->id);
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

            $kwitansis = $query->latest()->paginate(10);

            // Format data untuk response JSON
            $formattedKwitansis = $kwitansis->map(function ($kwitansi, $index) use ($kwitansis) {
                $number = ($kwitansis->currentPage() - 1) * $kwitansis->perPage() + $index + 1;

                return [
                    'id' => $kwitansi->id,
                    'number' => $number,
                    'kode_rekening' => $kwitansi->rekeningBelanja->kode_rekening ?? '-',
                    'uraian' => $kwitansi->bukuKasUmum->uraian_opsional ?? $kwitansi->bukuKasUmum->uraian,
                    'tanggal' => \Carbon\Carbon::parse($kwitansi->bukuKasUmum->tanggal_transaksi)->format('d/m/Y'),
                    'jumlah' => 'Rp ' . number_format($kwitansi->bukuKasUmum->total_transaksi_kotor, 0, ',', '.'),
                    'preview_url' => route('kwitansi.preview', $kwitansi->id),
                    'pdf_url' => route('kwitansi.pdf', $kwitansi->id),
                    'delete_data' => [
                        'id' => $kwitansi->id,
                        'uraian' => $kwitansi->bukuKasUmum->uraian_opsional ?? $kwitansi->bukuKasUmum->uraian
                    ]
                ];
            });

            $filterInfo = [
                'search' => $search,
                'tahun' => $tahun,
                'start_date' => $startDate,
                'end_date' => $endDate,
                'has_filters' => $search || $tahun || $startDate || $endDate,
            ];

            return response()->json([
                'success' => true,
                'data' => $formattedKwitansis,
                'total' => $kwitansis->total(),
                'search_term' => $search,
                'selected_tahun' => $tahun,
                'filter_info' => $filterInfo,
                'pagination' => [
                    'current_page' => $kwitansis->currentPage(),
                    'last_page' => $kwitansis->lastPage(),
                    'per_page' => $kwitansis->perPage(),
                    'total' => $kwitansis->total(),
                    'has_more' => $kwitansis->hasMorePages(),
                ],
            ]);
        } catch (\Exception $e) {
            Log::error('Error searching kwitansi: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan saat mencari data',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function create()
    {
        return redirect()->route('kwitansi.index');
    }

    public function store(Request $request)
    {
        try {
            $validated = $request->validate([
                'buku_kas_umum_id' => 'required|exists:buku_kas_umums,id',
                'bku_uraian_detail_id' => 'required|exists:buku_kas_umum_uraian_details,id',
            ]);

            $bukuKasUmum = BukuKasUmum::with(['penganggaran.sekolah', 'kodeKegiatan', 'rekeningBelanja'])->find($validated['buku_kas_umum_id']);
            $bkuUraianDetail = BukuKasUmumUraianDetail::find($validated['bku_uraian_detail_id']);

            $existingKwitansi = Kwitansi::where('bku_uraian_detail_id', $validated['bku_uraian_detail_id'])->first();

            if ($existingKwitansi) {
                return response()->json([
                    'success' => false,
                    'message' => 'Kwitansi untuk detail uraian ini sudah ada',
                ], 422);
            }

            $penerimaanDana = PenerimaanDana::where('penganggaran_id', $bukuKasUmum->penganggaran_id)->first();

            if (! $penerimaanDana) {
                return response()->json([
                    'success' => false,
                    'message' => 'Data penerimaan dana tidak ditemukan untuk penganggaran ini',
                ], 404);
            }

            $sekolahId = $bukuKasUmum->penganggaran->sekolah_id;

            if (! $sekolahId) {
                $sekolah = SekolahProfile::first();
                if ($sekolah) {
                    $sekolahId = $sekolah->id;
                } else {
                    return response()->json([
                        'success' => false,
                        'message' => 'Data sekolah tidak ditemukan',
                    ], 404);
                }
            }

            $kwitansi = Kwitansi::create([
                'sekolah_id' => $sekolahId,
                'penganggaran_id' => $bukuKasUmum->penganggaran_id,
                'kode_kegiatan_id' => $bukuKasUmum->kode_kegiatan_id,
                'kode_rekening_id' => $bukuKasUmum->rekening_belanja_id,
                'penerimaan_dana_id' => $penerimaanDana->id,
                'buku_kas_umum_id' => $bukuKasUmum->id,
                'bku_uraian_detail_id' => $bkuUraianDetail->id,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Kwitansi berhasil dibuat!',
                'data' => $kwitansi,
            ]);
        } catch (\Exception $e) {
            Log::error('Error creating kwitansi: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Gagal membuat kwitansi: ' . $e->getMessage(),
            ], 500);
        }
    }

    public function show(Kwitansi $kwitansi)
    {
         // unused
    }

    private function calculateTotalFromUraianDetails($bukuKasUmum)
    {
        $total = 0;
        if ($bukuKasUmum->uraianDetails && $bukuKasUmum->uraianDetails->count() > 0) {
            $total = $bukuKasUmum->uraianDetails->sum('jumlah');
        }

        return $total > 0 ? $total : ($bukuKasUmum->total_transaksi_kotor ?? 0);
    }

    private function parseKodeKegiatan($kodeKegiatan)
    {
        $defaultProgram = '-';
        $defaultSubProgram = '-';
        $defaultUraian = '-';

        if (! $kodeKegiatan) {
             return [
                'kode_full' => '06.05.01',
                'kode_program' => '06',
                'kode_sub_program' => '06.05',
                'kode_uraian' => '06.05.01',
                'program' => $defaultProgram,
                'sub_program' => $defaultSubProgram,
                'uraian' => $defaultUraian,
            ];
        }

        $kode = $kodeKegiatan->kode ?? '-';
        $kodeParts = explode('.', $kode);
        $kodeProgram = $kodeParts[0] ?? '-';
        $kodeSubProgram = ($kodeParts[0] ?? '-') . '.' . ($kodeParts[1] ?? '-');
        $kodeUraian = $kode;

        return [
            'kode_full' => $kode,
            'kode_program' => $kodeProgram,
            'kode_sub_program' => $kodeSubProgram,
            'kode_uraian' => $kodeUraian,
            'program' => $kodeKegiatan->program ?? $defaultProgram,
            'sub_program' => $kodeKegiatan->sub_program ?? $defaultSubProgram,
            'uraian' => $kodeKegiatan->uraian ?? $defaultUraian,
        ];
    }

    public function generatePdf($id)
    {
        try {
            $kwitansi = Kwitansi::with([
                'sekolah',
                'penganggaran',
                'kodeKegiatan',
                'rekeningBelanja',
                'penerimaanDana',
                'bukuKasUmum' => function ($query) {
                    $query->with(['uraianDetails']);
                },
                'bkuUraianDetail',
            ])->findOrFail($id);

            $parsedKode = $this->parseKodeKegiatan($kwitansi->kodeKegiatan);

            $totalAmount = $this->calculateTotalFromUraianDetails($kwitansi->bukuKasUmum);
            $jumlahUang = $this->convertToText($totalAmount);

            $pajakData = $this->klasifikasiPajak($kwitansi->bukuKasUmum);

            // Calculate Tahap Roman
            $bulan = \Carbon\Carbon::parse($kwitansi->bukuKasUmum->tanggal_transaksi)->month;
            $tahapRoman = $bulan <= 6 ? 'THP-I' : 'THP-II';

            // Get Request Parameters (Need to use global request() helper or inject Request)
            $paperSize = request()->input('paper_size', 'Folio');
            $fontSize = request()->input('font_size', '11pt');
            $orientation = request()->input('orientation', 'portrait');

            $data = [
                'kwitansi' => $kwitansi,
                'parsedKode' => $parsedKode,
                'jumlahUangText' => $jumlahUang,
                'totalAmount' => $totalAmount, 
                'tanggalLunas' => $this->formatTanggalLunas($kwitansi->bukuKasUmum->tanggal_transaksi),
                'pajakData' => $pajakData,
                'tahapRoman' => $tahapRoman,
                'fontSize' => $fontSize,
            ];

            $pdf = PDF::loadView('pelengkap.kwitansi_pdf', $data);
            $pdf->setPaper($paperSize, $orientation);

            $filename = "Kwitansi_{$kwitansi->bukuKasUmum->uraian_opsional}.pdf";

            return $pdf->stream($filename);
        } catch (\Exception $e) {
            Log::error('Error generating kwitansi PDF: ' . $e->getMessage());

            return redirect()->route('kwitansi.index')->with('error', 'Gagal generate PDF: ' . $e->getMessage());
        }
    }

    public function downloadAll(Request $request)
    {
        try {
            $search = $request->input('search', '');
            $tahun = $request->input('tahun', '');
            $startDate = $request->input('start_date', '');
            $endDate = $request->input('end_date', '');

            $query = Kwitansi::with([
                'sekolah',
                'penganggaran',
                'kodeKegiatan',
                'rekeningBelanja',
                'penerimaanDana',
                'bukuKasUmum' => function ($query) {
                    $query->with(['uraianDetails']);
                },
                'bkuUraianDetail',
            ]);

            if ($tahun) {
                $query->where('penganggaran_id', $tahun);
            }

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

            $kwitansis = $query->latest()->get();

            if ($kwitansis->isEmpty()) {
                return redirect()->route('kwitansi.index')
                    ->with('error', 'Tidak ada data kwitansi untuk diunduh dengan filter yang dipilih');
            }

            $kwitansiData = [];
            foreach ($kwitansis as $kwitansi) {
                $parsedKode = $this->parseKodeKegiatan($kwitansi->kodeKegiatan);
                $totalAmount = $this->calculateTotalFromUraianDetails($kwitansi->bukuKasUmum);
                $jumlahUang = $this->convertToText($totalAmount);
                $pajakData = $this->klasifikasiPajak($kwitansi->bukuKasUmum);

                // Calculate Tahap Roman for each
                $bulan = \Carbon\Carbon::parse($kwitansi->bukuKasUmum->tanggal_transaksi)->month;
                $tahap = $bulan <= 6 ? 'THP-I' : 'THP-II';

                $kwitansiData[] = [
                    'kwitansi' => $kwitansi,
                    'parsedKode' => $parsedKode,
                    'jumlahUangText' => $jumlahUang,
                    'totalAmount' => $totalAmount,
                    'tanggalLunas' => $this->formatTanggalLunas($kwitansi->bukuKasUmum->tanggal_transaksi),
                    'pajakData' => $pajakData,
                    'tahapRoman' => $tahap,
                ];
            }

            $paperSize = request()->input('paper_size', 'Folio');
            $fontSize = request()->input('font_size', '11pt');
            $orientation = request()->input('orientation', 'portrait');

            $data = [
                'kwitansis' => $kwitansiData,
                'totalKwitansi' => $kwitansis->count(),
                'tanggalDownload' => now()->format('d/m/Y H:i'),
                'fontSize' => $fontSize,
                'filterInfo' => [
                    'search' => $search,
                    'tahun' => $tahun,
                    'start_date' => $startDate,
                    'end_date' => $endDate,
                    'has_filter' => $search || $tahun || $startDate || $endDate
                ]
            ];

            $pdf = PDF::loadView('pelengkap.download_all_pdf', $data);
            $pdf->setPaper($paperSize, $orientation);

            $filename = $this->generateDownloadFilename($search, $tahun, $startDate, $endDate, $kwitansis->count());

            return $pdf->stream($filename);
        } catch (\Exception $e) {
            Log::error('Error downloading all kwitansi: ' . $e->getMessage());
            return redirect()->route('kwitansi.index')
                ->with('error', 'Gagal mengunduh semua kwitansi: ' . $e->getMessage());
        }
    }

    private function generateDownloadFilename($search, $tahun, $startDate, $endDate, $count)
    {
        $baseName = 'Kwitansi';
        $parts = [];
        $parts[] = $count . 'data';

        if ($tahun) {
            $tahunSelect = \App\Models\Penganggaran::find($tahun);
            if ($tahunSelect) {
                $parts[] = 'Tahun_' . $tahunSelect->tahun_anggaran;
            }
        }

        if ($startDate && $endDate) {
            $start = \Carbon\Carbon::parse($startDate)->format('d-m-Y');
            $end = \Carbon\Carbon::parse($endDate)->format('d-m-Y');
            $parts[] = $start . '_sd_' . $end;
        } elseif ($startDate) {
            $parts[] = 'dari_' . \Carbon\Carbon::parse($startDate)->format('d-m-Y');
        } elseif ($endDate) {
            $parts[] = 'sampai_' . \Carbon\Carbon::parse($endDate)->format('d-m-Y');
        }

        $parts[] = now()->format('Y-m-d_H-i-s');
        $filename = $baseName . '_' . implode('_', $parts) . '.pdf';
        return preg_replace('/[^a-zA-Z0-9._-]/', '_', $filename);
    }

    private function klasifikasiPajak($bukuKasUmum)
    {
        $pajakName = strtolower($bukuKasUmum->pajak ?? '');
        $pajakDaerahName = strtolower($bukuKasUmum->pajak_daerah ?? '');

        $pajakData = [
            'ppn' => 0,
            'pph' => 0,
            'pb1' => 0,
        ];

        if ($bukuKasUmum->total_pajak > 0) {
            if (strpos($pajakName, 'pph') !== false) {
                $pajakData['pph'] = $bukuKasUmum->total_pajak;
            } elseif (strpos($pajakName, 'ppn') !== false) {
                $pajakData['ppn'] = $bukuKasUmum->total_pajak;
            } else {
                $pajakData['ppn'] = $bukuKasUmum->total_pajak;
            }
        }

        if ($bukuKasUmum->total_pajak_daerah > 0) {
            $pajakData['pb1'] = $bukuKasUmum->total_pajak_daerah;
        }

        if ($bukuKasUmum->total_pajak == 0 && $bukuKasUmum->pajak) {
            $pajakValue = $this->extractPajakValueFromName($bukuKasUmum->pajak);
            if ($pajakValue > 0) {
                if (strpos($pajakName, 'pph') !== false) {
                    $pajakData['pph'] = $pajakValue;
                } else {
                    $pajakData['ppn'] = $pajakValue;
                }
            }
        }
        return $pajakData;
    }

    private function extractPajakValueFromName($pajakName)
    {
        preg_match('/\d+/', $pajakName, $matches);
        if (! empty($matches)) {
            return (float) $matches[0];
        }
        return 0;
    }

    public function previewPdf($id)
    {
        try {
            $kwitansi = Kwitansi::with([
                'sekolah',
                'penganggaran',
                'kodeKegiatan',
                'rekeningBelanja',
                'penerimaanDana',
                'bukuKasUmum' => function ($query) {
                    $query->with(['uraianDetails']);
                },
                'bkuUraianDetail',
            ])->findOrFail($id);

            $parsedKode = $this->parseKodeKegiatan($kwitansi->kodeKegiatan);
            $totalAmount = $this->calculateTotalFromUraianDetails($kwitansi->bukuKasUmum);
            $jumlahUang = $this->convertToText($totalAmount);
            $pajakData = $this->klasifikasiPajak($kwitansi->bukuKasUmum);

            // Calculate Tahap Roman
            $bulan = \Carbon\Carbon::parse($kwitansi->bukuKasUmum->tanggal_transaksi)->month;
            $tahapRoman = $bulan <= 6 ? 'THP-I' : 'THP-II';

            // Get Request Parameters
            $paperSize = request()->input('paper_size', 'Folio');
            $fontSize = request()->input('font_size', '11pt');
            $orientation = request()->input('orientation', 'portrait');

            $data = [
                'kwitansi' => $kwitansi,
                'parsedKode' => $parsedKode,
                'jumlahUangText' => $jumlahUang,
                'totalAmount' => $totalAmount,
                'tanggalLunas' => $this->formatTanggalLunas($kwitansi->bukuKasUmum->tanggal_transaksi),
                'pajakData' => $pajakData,
                'sekolah' => $kwitansi->sekolah,
                'tahapRoman' => $tahapRoman,
                'fontSize' => $fontSize,
            ];

            $pdf = PDF::loadView('pelengkap.kwitansi_pdf', $data);
            $pdf->setPaper($paperSize, $orientation);

            return $pdf->stream('Kwitansi_Preview_' . $kwitansi->id . '.pdf', [
                'Content-Type' => 'application/pdf',
            ]);
        } catch (\Exception $e) {
            Log::error('Error generating preview PDF for ID ' . $id . ': ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Gagal generate preview PDF: ' . $e->getMessage(),
            ], 500);
        }
    }

    public function destroy($id)
    {
        try {
            $kwitansi = Kwitansi::with(['bukuKasUmum'])->find($id);

            if (! $kwitansi) {
                return response()->json([
                    'success' => false,
                    'message' => 'Data kwitansi tidak ditemukan',
                ], 404);
            }

            $uraian = $kwitansi->bukuKasUmum->uraian_opsional ?? $kwitansi->bukuKasUmum->uraian;
            $kwitansi->delete();

            return response()->json([
                'success' => true,
                'message' => "Kwitansi untuk '{$uraian}' berhasil dihapus!",
            ]);
        } catch (\Exception $e) {
            Log::error('Error deleting kwitansi: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Gagal menghapus kwitansi: ' . $e->getMessage(),
            ], 500);
        }
    }

    public function checkAvailableData(Request $request)
    {
        try {
            $tahun = $request->input('tahun');
            
            $query = BukuKasUmum::whereDoesntHave('kwitansi')
                ->where('is_bunga_record', false);

            if ($tahun) {
                $query->where('penganggaran_id', $tahun);
            }

            $availableCount = $query->count();

            return response()->json([
                'success' => true,
                'data' => [
                    'available_count' => $availableCount,
                    'pending_count' => 0,
                    'failed_count' => 0,
                ],
            ]);
        } catch (\Exception $e) {
            Log::error('Error checking available data: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    public function generateBatch(Request $request)
    {
        try {
            $limit = $request->input('limit', 20);
            $offset = $request->input('offset', 0); // Add offset support
            $tahun = $request->input('tahun');
            
            if ($limit > 100) $limit = 100;
            
            Log::info("Starting batch generation chunk with limit {$limit} offset {$offset}");

            $query = BukuKasUmum::with([
                'penganggaran.sekolah',
                'kodeKegiatan',
                'rekeningBelanja',
                'uraianDetails',
            ])
                ->whereDoesntHave('kwitansi')
                ->where('is_bunga_record', false)
                ->orderBy('id');
            
            if ($tahun) {
                $query->where('penganggaran_id', $tahun);
            }
            
            $totalWithoutKwitansi = $query->count(); // Count total matching query

            // Get only the chunk with offset
            $bukuKasUmums = $query
                ->offset($offset)
                ->limit($limit)
                ->get();

            $success = 0;
            $failed = 0;

            // Removed global transaction to allow partial success
            foreach ($bukuKasUmums as $bukuKasUmum) {
                $result = $this->processSingleItem($bukuKasUmum);

                if ($result['status'] === 'success') {
                    $success++;
                } else {
                    $failed++;
                    // Log failure reason
                    Log::warning("Failed to generate kwitansi for BKU ID {$bukuKasUmum->id}: {$result['message']}");
                }
            }

            return response()->json([
                'success' => true,
                'message' => "Proses chunk selesai. Berhasil: {$success}, Gagal: {$failed}",
                'data' => [
                    'processed' => $bukuKasUmums->count(),
                    'success' => $success,
                    'failed' => $failed,
                    'remaining' => $totalWithoutKwitansi, // Just for info
                ],
            ]);
        } catch (\Exception $e) {
            Log::error('Error in generateBatch: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan saat proses generate: ' . $e->getMessage(),
            ], 500);
        }
    }

    private function processSingleItem($bukuKasUmum)
    {
        $itemResult = [
            'buku_kas_umum_id' => $bukuKasUmum->id,
            'kode_rekening' => $bukuKasUmum->rekeningBelanja->kode_rekening ?? '-',
            'uraian' => $bukuKasUmum->uraian_opsional ?? $bukuKasUmum->uraian,
            'status' => 'pending',
            'message' => ''
        ];

        try {
            $existingKwitansi = Kwitansi::where('buku_kas_umum_id', $bukuKasUmum->id)->first();

            if (!$existingKwitansi) {
                $penerimaanDana = PenerimaanDana::where('penganggaran_id', $bukuKasUmum->penganggaran_id)->first();

                if ($penerimaanDana) {
                    $sekolahId = $bukuKasUmum->penganggaran->sekolah_id;
                    if (!$sekolahId) {
                        $sekolah = SekolahProfile::first();
                        $sekolahId = $sekolah->id ?? null;
                    }

                    // Validation for kode_rekening_id (using rekening_belanja_id from BKU)
                    if (is_null($bukuKasUmum->rekening_belanja_id)) {
                        $itemResult['status'] = 'failed';
                        $itemResult['message'] = 'Kode Rekening ID tidak ditemukan (null), pastikan BKU memiliki rekening belanja.';
                        return $itemResult;
                    }

                    if ($sekolahId) {
                        $bkuUraianDetail = $bukuKasUmum->uraianDetails->first();

                        if ($bkuUraianDetail) {
                            Kwitansi::create([
                                'sekolah_id' => $sekolahId,
                                'penganggaran_id' => $bukuKasUmum->penganggaran_id,
                                'kode_kegiatan_id' => $bukuKasUmum->kode_kegiatan_id,
                                'kode_rekening_id' => $bukuKasUmum->rekening_belanja_id, // Map from BKU's rekening_belanja_id
                                'penerimaan_dana_id' => $penerimaanDana->id,
                                'buku_kas_umum_id' => $bukuKasUmum->id,
                                // Make sure 'bku_uraian_detail_id' matches migration
                                'bku_uraian_detail_id' => $bkuUraianDetail->id,
                            ]);
                            $itemResult['status'] = 'success';
                            $itemResult['message'] = 'Kwitansi berhasil dibuat';
                        } else {
                            $itemResult['status'] = 'failed';
                            $itemResult['message'] = 'Tidak ada detail uraian';
                        }
                    } else {
                        $itemResult['status'] = 'failed';
                        $itemResult['message'] = 'ID Sekolah tidak ditemukan';
                    }
                } else {
                    $itemResult['status'] = 'failed';
                    $itemResult['message'] = 'Data penerimaan dana tidak ditemukan';
                }
            } else {
                $itemResult['status'] = 'skipped';
                $itemResult['message'] = 'Kwitansi sudah ada';
            }
        } catch (\Exception $e) {
            $itemResult['status'] = 'error';
            $itemResult['message'] = 'Error: ' . $e->getMessage();
        }

        return $itemResult;
    }

    public function deleteAll(Request $request)
    {
        try {

            $totalKwitansi = Kwitansi::count();

            if ($totalKwitansi === 0) {
                return response()->json([
                    'success' => false,
                    'message' => 'Tidak ada data kwitansi yang dapat dihapus',
                ], 404);
            }

            $deletedCount = Kwitansi::query()->delete();

            return response()->json([
                'success' => true,
                'message' => "Berhasil menghapus {$deletedCount} data kwitansi",
                'data' => [
                    'deleted_count' => $deletedCount,
                ],
            ]);
        } catch (\Exception $e) {
            Log::error('Error deleting all kwitansi: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Gagal menghapus semua data kwitansi: ' . $e->getMessage(),
            ], 500);
        }
    }

    public function debugDataCount()
    {
        try {
            $totalBukuKasUmum = BukuKasUmum::where('is_bunga_record', false)->count();
            $totalWithoutKwitansi = BukuKasUmum::whereDoesntHave('kwitansi')
                ->where('is_bunga_record', false)
                ->count();
            $totalWithKwitansi = BukuKasUmum::whereHas('kwitansi')
                ->where('is_bunga_record', false)
                ->count();

            return response()->json([
                'success' => true,
                'data' => [
                    'total_buku_kas_umum' => $totalBukuKasUmum,
                    'without_kwitansi' => $totalWithoutKwitansi,
                    'with_kwitansi' => $totalWithKwitansi,
                ],
            ]);
        } catch (\Exception $e) {
            Log::error('Error in debugDataCount: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    private function convertToText($number)
    {
        $number = (int) $number;
        $units = ['', 'ribu', 'juta', 'miliar', 'triliun'];
        $words = [];

        if ($number == 0) {
            return 'nol Rupiah';
        }

        $unitIndex = 0;
        while ($number > 0) {
            $chunk = $number % 1000;
            if ($chunk != 0) {
                $chunkWords = $this->convertChunk($chunk);
                if ($unitIndex > 0) {
                    $chunkWords .= ' ' . $units[$unitIndex];
                }
                array_unshift($words, $chunkWords);
            }
            $number = floor($number / 1000);
            $unitIndex++;
        }

        $result = implode(' ', $words) . ' Rupiah';
        return ucfirst(strtolower($result));
    }

    private function convertChunk($number)
    {
        $ones = ['', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan'];
        $tens = ['', '', 'dua puluh', 'tiga puluh', 'empat puluh', 'lima puluh', 'enam puluh', 'tujuh puluh', 'delapan puluh', 'sembilan puluh'];
        $teens = ['sepuluh', 'sebelas', 'dua belas', 'tiga belas', 'empat belas', 'lima belas', 'enam belas', 'tujuh belas', 'delapan belas', 'sembilan belas'];

        $words = [];
        $hundreds = floor($number / 100);
        if ($hundreds > 0) {
            if ($hundreds == 1) {
                $words[] = 'seratus';
            } else {
                $words[] = $ones[$hundreds] . ' ratus';
            }
            $number %= 100;
        }

        if ($number >= 10 && $number <= 19) {
            $words[] = $teens[$number - 10];
        } else {
            $tensDigit = floor($number / 10);
            $onesDigit = $number % 10;
            if ($tensDigit > 0) {
                $words[] = $tens[$tensDigit];
            }
            if ($onesDigit > 0) {
                $words[] = $ones[$onesDigit];
            }
        }
        return implode(' ', $words);
    }

    private function formatTanggalLunas($tanggal)
    {
        $bulanIndonesia = [
            'January' => 'Januari',
            'February' => 'Februari',
            'March' => 'Maret',
            'April' => 'April',
            'May' => 'Mei',
            'June' => 'Juni',
            'July' => 'Juli',
            'August' => 'Agustus',
            'September' => 'September',
            'October' => 'Oktober',
            'November' => 'November',
            'December' => 'Desember',
        ];

        $tanggalObj = \Carbon\Carbon::parse($tanggal);
        $bulan = $bulanIndonesia[$tanggalObj->format('F')] ?? $tanggalObj->format('F');

        return "Lunas Bayar, {$tanggalObj->format('d')} {$bulan} {$tanggalObj->format('Y')}";
    }
}
