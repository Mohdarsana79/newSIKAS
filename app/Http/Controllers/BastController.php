<?php

namespace App\Http\Controllers;

use App\Models\SekolahProfile;
use App\Config\VariantConfig;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class BastController extends Controller
{
    protected string $variant;
    protected string $Penganggaran;
    protected string $BukuKasUmum;
    protected string $Bast;

    public function __construct()
    {
        $this->middleware(function ($request, $next) {
            $this->variant = app()->bound('variant') ? app('variant') : 'reguler';
            $this->Penganggaran = VariantConfig::getModelClass('penganggaran', $this->variant);
            $this->BukuKasUmum = VariantConfig::getModelClass('bku', $this->variant);
            $this->Bast = VariantConfig::getModelClass('bast', $this->variant);

            return $next($request);
        });
    }

    public function index()
    {
        return $this->renderVariant('FiturPelengkap/Bast/Index');
    }

    public function search(Request $request)
    {
        try {
            $search = $request->input('search', '');
            $tahun = $request->input('tahun', '');
            $startDate = $request->input('start_date', '');
            $endDate = $request->input('end_date', '');

            // The data source is primarily BukuKasUmum that don't have Bast yet, or all BKU and we indicate if BAST exists.
            // But wait, the user's workflow is likely: see list of all generated BAST, or see list of BKU to generate BAST?
            // Usually in SIKAS (like Kwitansi), the main view is list of already generated Kwitansi.
            // Wait, for Kwitansi, they can see BKU items that don't have Kwitansi? No, Kwitansi search returns Kwitansis.
            // So we return BASTs.
            $query = ($this->Bast)::with(['penganggaran', 'bukuKasUmum.uraianDetails']);

            if ($tahun && is_numeric($tahun)) {
                $query->where(VariantConfig::penganggaranFk($this->variant), $tahun);
            } elseif ($tahun && strlen($tahun) == 4) {
                 $p = ($this->Penganggaran)::where('tahun_anggaran', $tahun)->first();
                 if ($p) $query->where(VariantConfig::penganggaranFk($this->variant), $p->id);
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
                $query->where(function ($q) use ($search) {
                    $q->where('nomor_bast', 'ILIKE', "%{$search}%")
                      ->orWhere('pihak_pertama_nama', 'ILIKE', "%{$search}%")
                      ->orWhereHas('bukuKasUmum', function ($q2) use ($search) {
                          $q2->where('uraian', 'ILIKE', "%{$search}%")
                             ->orWhere('uraian_opsional', 'ILIKE', "%{$search}%");
                      });
                });
            }

            $basts = $query->latest()->paginate(10);

            $formattedBasts = $basts->map(function ($bast, $index) use ($basts) {
                $number = ($basts->currentPage() - 1) * $basts->perPage() + $index + 1;

                return [
                    'id' => $bast->id,
                    'number' => $number,
                    'nomor_bast' => $bast->nomor_bast,
                    'uraian' => $bast->bukuKasUmum->uraian_opsional ?? $bast->bukuKasUmum->uraian,
                    'tanggal' => $bast->tanggal_bast ? \Carbon\Carbon::parse($bast->tanggal_bast)->format('d/m/Y') : \Carbon\Carbon::parse($bast->bukuKasUmum->tanggal_transaksi)->format('d/m/Y'),
                    'tanggal_bast_raw' => $bast->tanggal_bast ? \Carbon\Carbon::parse($bast->tanggal_bast)->format('Y-m-d') : \Carbon\Carbon::parse($bast->bukuKasUmum->tanggal_transaksi)->format('Y-m-d'),
                    'pihak_pertama_nama' => $bast->pihak_pertama_nama,
                    'pihak_pertama_jabatan' => $bast->pihak_pertama_jabatan,
                    'pihak_pertama_instansi' => $bast->pihak_pertama_instansi,
                    'pihak_pertama_alamat' => $bast->pihak_pertama_alamat,
                    'pihak_kedua_nama' => $bast->pihak_kedua_nama,
                    'pihak_kedua_jabatan' => $bast->pihak_kedua_jabatan,
                    'pihak_kedua_instansi' => $bast->pihak_kedua_instansi,
                    'pihak_kedua_alamat' => $bast->pihak_kedua_alamat,
                    'buku_kas_umum_id' => $bast->buku_kas_umum_id,
                    'kinerja_buku_kas_umum_id' => $bast->kinerja_buku_kas_umum_id ?? null,
                    'silpa_buku_kas_umum_id' => $bast->silpa_buku_kas_umum_id ?? null,
                    'kinerja_silpa_buku_kas_umum_id' => $bast->kinerja_silpa_buku_kas_umum_id ?? null,
                    'preview_url' => route(VariantConfig::routeName($this->variant, 'bast.preview'), $bast->id),
                    'pdf_url' => route(VariantConfig::routeName($this->variant, 'bast.pdf'), $bast->id),
                    'uraian_details' => $bast->bukuKasUmum->uraianDetails ?? collect([]),
                    'delete_data' => [
                        'id' => $bast->id,
                        'uraian' => 'BAST ' . ($bast->nomor_bast ?? 'Tanpa Nomor')
                    ]
                ];
            });

            return response()->json([
                'success' => true,
                'data' => $formattedBasts,
                'total' => $basts->total(),
                'pagination' => [
                    'current_page' => $basts->currentPage(),
                    'last_page' => $basts->lastPage(),
                    'per_page' => $basts->perPage(),
                    'total' => $basts->total(),
                ],
            ]);
        } catch (\Exception $e) {
            Log::error('Error searching bast: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan saat mencari data',
            ], 500);
        }
    }

    public function store(Request $request)
    {
        try {
            $bkuFk = VariantConfig::bkuFk($this->variant);
            $validated = $request->validate([
                $bkuFk => 'required|exists:' . (new $this->BukuKasUmum)->getTable() . ',id',
                'nomor_bast' => 'nullable|string',
                'tanggal_bast' => 'nullable|date',
                'pihak_pertama_nama' => 'nullable|string',
                'pihak_pertama_jabatan' => 'nullable|string',
                'pihak_pertama_instansi' => 'nullable|string',
                'pihak_pertama_alamat' => 'nullable|string',
                'pihak_kedua_nama' => 'nullable|string',
                'pihak_kedua_jabatan' => 'nullable|string',
                'pihak_kedua_instansi' => 'nullable|string',
                'pihak_kedua_alamat' => 'nullable|string',
            ]);

            $bukuKasUmum = ($this->BukuKasUmum)::with('penganggaran.sekolah')->find($validated[$bkuFk]);

            if (!$bukuKasUmum) {
                return response()->json(['success' => false, 'message' => 'BKU tidak ditemukan'], 404);
            }

            $existingBast = ($this->Bast)::where($bkuFk, $validated[$bkuFk])->first();
            if ($existingBast) {
                return response()->json(['success' => false, 'message' => 'BAST untuk transaksi ini sudah ada'], 422);
            }

            $sekolahId = $bukuKasUmum->penganggaran->sekolah_id;
            if (!$sekolahId) {
                $sekolahId = SekolahProfile::first()->id ?? null;
            }

            $penganggaranFk = VariantConfig::penganggaranFk($this->variant);
            
            $bast = new ($this->Bast);
            $bast->sekolah_id = $sekolahId;
            $bast->$penganggaranFk = $bukuKasUmum->$penganggaranFk;
            $bast->$bkuFk = $bukuKasUmum->id;
            $bast->nomor_bast = array_key_exists('nomor_bast', $validated) ? $validated['nomor_bast'] : null;
            $bast->tanggal_bast = array_key_exists('tanggal_bast', $validated) ? $validated['tanggal_bast'] : null;

            $bast->pihak_pertama_nama = array_key_exists('pihak_pertama_nama', $validated) ? $validated['pihak_pertama_nama'] : ($bukuKasUmum->nama_toko ?? $bukuKasUmum->nama_penerima_pembayaran);
            $bast->pihak_pertama_jabatan = array_key_exists('pihak_pertama_jabatan', $validated) ? $validated['pihak_pertama_jabatan'] : 'Pimpinan';
            $bast->pihak_pertama_instansi = array_key_exists('pihak_pertama_instansi', $validated) ? $validated['pihak_pertama_instansi'] : ($bukuKasUmum->nama_toko ?? null);
            $bast->pihak_pertama_alamat = array_key_exists('pihak_pertama_alamat', $validated) ? $validated['pihak_pertama_alamat'] : ($bukuKasUmum->alamat_toko ?? null);
            
            $bast->pihak_kedua_nama = array_key_exists('pihak_kedua_nama', $validated) ? $validated['pihak_kedua_nama'] : ($bukuKasUmum->penganggaran->kepala_sekolah ?? null);
            $bast->pihak_kedua_jabatan = array_key_exists('pihak_kedua_jabatan', $validated) ? $validated['pihak_kedua_jabatan'] : 'Kepala Sekolah';
            $bast->pihak_kedua_instansi = array_key_exists('pihak_kedua_instansi', $validated) ? $validated['pihak_kedua_instansi'] : ($bukuKasUmum->penganggaran->sekolah->nama_sekolah ?? 'Sekolah');
            $bast->pihak_kedua_alamat = array_key_exists('pihak_kedua_alamat', $validated) ? $validated['pihak_kedua_alamat'] : ($bukuKasUmum->penganggaran->sekolah->alamat ?? '-');

            $bast->save();

            return response()->json(['success' => true, 'message' => 'BAST berhasil dibuat!', 'data' => $bast]);
        } catch (\Exception $e) {
            Log::error('Error creating bast: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => 'Gagal membuat BAST'], 500);
        }
    }
    
    public function update(Request $request, $id)
    {
        try {
            $bast = ($this->Bast)::findOrFail($id);
            $validated = $request->validate([
                'nomor_bast' => 'nullable|string',
                'tanggal_bast' => 'nullable|date',
                'pihak_pertama_nama' => 'nullable|string',
                'pihak_pertama_jabatan' => 'nullable|string',
                'pihak_pertama_instansi' => 'nullable|string',
                'pihak_pertama_alamat' => 'nullable|string',
                'pihak_kedua_nama' => 'nullable|string',
                'pihak_kedua_jabatan' => 'nullable|string',
                'pihak_kedua_instansi' => 'nullable|string',
                'pihak_kedua_alamat' => 'nullable|string',
            ]);
            
            $bast->update($validated);
            
            return response()->json(['success' => true, 'message' => 'BAST berhasil diubah!']);
        } catch (\Exception $e) {
            Log::error('Error updating bast: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => 'Gagal mengubah BAST'], 500);
        }
    }

    public function updateKondisi(Request $request, $id)
    {
        try {
            $validated = $request->validate([
                'kondisi' => 'required|string|max:255',
            ]);

            $modelClass = VariantConfig::getModelClass('bku_uraian_detail', $this->variant);
            if (!$modelClass) {
                // If variant is reguler, the model is BukuKasUmumUraianDetail
                $modelClass = \App\Models\BukuKasUmumUraianDetail::class;
            }

            $detail = $modelClass::findOrFail($id);
            $detail->kondisi = $validated['kondisi'];
            $detail->save();

            return response()->json(['success' => true, 'message' => 'Kondisi barang berhasil disimpan']);
        } catch (\Exception $e) {
            Log::error('Error updating kondisi barang: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => 'Gagal mengubah kondisi barang'], 500);
        }
    }

    public function getTahunAnggaran()
    {
        try {
            $tahunAnggaran = ($this->Penganggaran)::select('id', 'tahun_anggaran')
                ->orderBy('tahun_anggaran', 'desc')
                ->get()
                ->map(function ($penganggaran) {
                    return [
                        'id' => $penganggaran->id,
                        'tahun_anggaran' => $penganggaran->tahun_anggaran,
                    ];
                });

            return response()->json([
                'success' => true,
                'data' => $tahunAnggaran,
            ]);
        } catch (\Exception $e) {
            Log::error('Error getting tahun anggaran BAST: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Gagal mengambil data tahun anggaran.',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    public function getAvailableBku(Request $request)
    {
        try {
            $tahun = $request->input('tahun');
            $bkuFk = VariantConfig::bkuFk($this->variant);
            $penganggaranFk = VariantConfig::penganggaranFk($this->variant);

            $query = ($this->BukuKasUmum)::with('penganggaran.sekolah')
                ->whereDoesntHave('bast');

            if ($tahun) {
                if (is_numeric($tahun) && strlen($tahun) < 4) {
                    $query->where($penganggaranFk, $tahun);
                } else {
                    $p = ($this->Penganggaran)::where('tahun_anggaran', $tahun)->first();
                    if ($p) $query->where($penganggaranFk, $p->id);
                }
            }

            $tahap = $request->input('tahap');
            if ($tahap === 'Tahap 1') {
                $query->whereMonth('tanggal_transaksi', '>=', 1)->whereMonth('tanggal_transaksi', '<=', 6);
            } elseif ($tahap === 'Tahap 2') {
                $query->whereMonth('tanggal_transaksi', '>=', 7)->whereMonth('tanggal_transaksi', '<=', 12);
            }

            $bkuItems = $query->orderBy('tanggal_transaksi', 'desc')->get();

            $formatted = $bkuItems->map(function ($bku) {
                return [
                    'id' => $bku->id,
                    'uraian' => $bku->uraian_opsional ?? $bku->uraian,
                    'tanggal' => \Carbon\Carbon::parse($bku->tanggal_transaksi)->format('Y-m-d'),
                    'nominal' => $bku->total_transaksi_kotor ?? $bku->dibelanjakan ?? 0,
                    'pihak_pertama_nama' => $bku->nama_toko ?? $bku->nama_penerima_pembayaran ?? '',
                    'pihak_pertama_alamat' => $bku->alamat_toko ?? '',
                    'pihak_pertama_instansi' => $bku->nama_toko ?? '',
                    'pihak_kedua_nama' => $bku->penganggaran->kepala_sekolah ?? '',
                    'pihak_kedua_instansi' => $bku->penganggaran->sekolah->nama_sekolah ?? 'Sekolah',
                    'pihak_kedua_alamat' => $bku->penganggaran->sekolah->alamat ?? '',
                ];
            });

            return response()->json([
                'success' => true,
                'data' => $formatted
            ]);
        } catch (\Exception $e) {
            Log::error('Error getting available BKU: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => 'Gagal mengambil data BKU yang tersedia']);
        }
    }

    public function destroy($id)
    {
        try {
            $bast = ($this->Bast)::findOrFail($id);
            $bast->delete();
            return response()->json(['success' => true, 'message' => 'BAST berhasil dihapus!']);
        } catch (\Exception $e) {
            Log::error('Error deleting bast: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => 'Gagal menghapus BAST'], 500);
        }
    }

    public function generatePdf(Request $request, $id)
    {
        return $this->renderPdf($request, $id, false);
    }
    
    public function previewPdf(Request $request, $id)
    {
        return $this->renderPdf($request, $id, true);
    }

    private function renderPdf(Request $request, $id, $isPreview = false)
    {
        try {
            $bast = ($this->Bast)::with([
                'bukuKasUmum.uraianDetails',
                'penganggaran',
                'sekolah'
            ])->findOrFail($id);

            $uraianDetails = $bast->bukuKasUmum->uraianDetails ?? collect([]);
            if ($uraianDetails->isEmpty()) {
                $totalKeseluruhan = $bast->bukuKasUmum->total_transaksi_kotor ?? 0;
            } else {
                $totalKeseluruhan = 0;
                foreach ($uraianDetails as $detail) {
                    $totalKeseluruhan += ($detail->volume * $detail->harga_satuan);
                }
            }
            
            $terbilangText = ucwords($this->convertToText($totalKeseluruhan) . ' Rupiah');

            $fontSize = $request->query('fontSize', '11pt');
            $paperSize = $request->query('paperSize', 'A4');
            $paperConfig = match ($paperSize) {
                'F4' => [0, 0, 612.00, 936.00],
                'Letter' => 'letter',
                'Legal' => 'legal',
                default => 'a4',
            };

            $data = [
                'bast' => $bast,
                'bku' => $bast->bukuKasUmum,
                'uraianDetails' => $uraianDetails,
                'tanggalBku' => \Carbon\Carbon::parse($bast->bukuKasUmum->tanggal_transaksi)->locale('id'),
                'tanggalBast' => $bast->tanggal_bast ? \Carbon\Carbon::parse($bast->tanggal_bast)->locale('id') : \Carbon\Carbon::parse($bast->bukuKasUmum->tanggal_transaksi)->locale('id'),
                'totalKeseluruhan' => $totalKeseluruhan,
                'terbilangText' => $terbilangText,
                'fontSize' => $fontSize,
            ];

            $pdf = Pdf::loadView('pelengkap.bast_pdf', $data);
            $pdf->setPaper($paperConfig, 'portrait');

            if ($isPreview) {
                return response($pdf->output(), 200)
                    ->header('Content-Type', 'application/pdf');
            }
            return $pdf->stream('BAST_' . ($bast->nomor_bast ?? $bast->id) . '.pdf');
        } catch (\Exception $e) {
            Log::error('Error rendering BAST PDF: ' . $e->getMessage());
            return redirect()->back()->with('error', 'Gagal memuat PDF BAST');
        }
    }

    private function convertToText($number)
    {
        $number = (int) $number;
        $units = ['', 'ribu', 'juta', 'miliar', 'triliun'];
        $words = [];

        if ($number == 0) {
            return 'nol';
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

        $result = implode(' ', $words);
        $result = str_replace('satu ratus', 'seratus', $result);
        $result = str_replace('satu ribu', 'seribu', $result);

        return trim($result);
    }

    private function convertChunk($number)
    {
        $ones = ['', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan', 'sepuluh', 'sebelas'];

        if ($number < 12) {
            return $ones[$number];
        } elseif ($number < 20) {
            return $ones[$number - 10] . ' belas';
        } elseif ($number < 100) {
            return $ones[floor($number / 10)] . ' puluh ' . $ones[$number % 10];
        } else {
            return $ones[floor($number / 100)] . ' ratus ' . $this->convertChunk($number % 100);
        }
    }

    protected function renderVariant($component, $props = [])
    {
        $var = $this->variant ?? (request()->route() ? (request()->route()->parameter('variant') ?? request()->get('_variant', 'reguler')) : 'reguler');
        if (app()->bound('variant')) {
            $var = app('variant');
        }
        return \Inertia\Inertia::render(VariantConfig::pagePrefix($var) . $component, array_merge($props, [
            'variant' => $var,
            'routePrefix' => VariantConfig::routePrefix($var)
        ]));
    }
}
