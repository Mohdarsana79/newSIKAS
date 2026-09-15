<?php

namespace App\Http\Controllers;

use App\Models\SekolahProfile;
use App\Config\VariantConfig;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class SuratPesananController extends Controller
{
    protected string $variant;
    protected string $Penganggaran;
    protected string $BukuKasUmum;
    protected string $SuratPesanan;

    public function __construct()
    {
        $this->middleware(function ($request, $next) {
            $this->variant = app()->bound('variant') ? app('variant') : 'reguler';
            $this->Penganggaran = VariantConfig::getModelClass('penganggaran', $this->variant);
            $this->BukuKasUmum = VariantConfig::getModelClass('bku', $this->variant);
            $this->SuratPesanan = VariantConfig::getModelClass('surat_pesanan', $this->variant);

            return $next($request);
        });
    }

    public function index()
    {
        return $this->renderVariant('FiturPelengkap/SuratPesanan/Index');
    }

    public function search(Request $request)
    {
        try {
            $search = $request->input('search', '');
            $tahun = $request->input('tahun', '');
            $startDate = $request->input('start_date', '');
            $endDate = $request->input('end_date', '');

            $query = ($this->SuratPesanan)::with(['penganggaran', 'bukuKasUmum.uraianDetails']);

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
                    $q->where('nomor_sp', 'ILIKE', "%{$search}%")
                      ->orWhere('pihak_kedua_nama_perusahaan', 'ILIKE', "%{$search}%")
                      ->orWhereHas('bukuKasUmum', function ($q2) use ($search) {
                          $q2->where('uraian', 'ILIKE', "%{$search}%")
                             ->orWhere('uraian_opsional', 'ILIKE', "%{$search}%");
                      });
                });
            }

            $suratPesanans = $query->latest()->paginate(10);

            $formatted = $suratPesanans->map(function ($sp, $index) use ($suratPesanans) {
                $number = ($suratPesanans->currentPage() - 1) * $suratPesanans->perPage() + $index + 1;

                return [
                    'id' => $sp->id,
                    'number' => $number,
                    'nomor_sp' => $sp->nomor_sp,
                    'uraian' => $sp->bukuKasUmum->uraian_opsional ?? $sp->bukuKasUmum->uraian,
                    'tanggal' => $sp->tanggal_sp ? \Carbon\Carbon::parse($sp->tanggal_sp)->format('d/m/Y') : \Carbon\Carbon::parse($sp->bukuKasUmum->tanggal_transaksi)->format('d/m/Y'),
                    'tanggal_sp_raw' => $sp->tanggal_sp ? \Carbon\Carbon::parse($sp->tanggal_sp)->format('Y-m-d') : \Carbon\Carbon::parse($sp->bukuKasUmum->tanggal_transaksi)->format('Y-m-d'),
                    'pihak_kesatu_nama' => $sp->pihak_kesatu_nama,
                    'pihak_kesatu_nip' => $sp->pihak_kesatu_nip,
                    'pihak_kesatu_jabatan' => $sp->pihak_kesatu_jabatan,
                    'pihak_kesatu_instansi' => $sp->pihak_kesatu_instansi,
                    'pihak_kesatu_alamat' => $sp->pihak_kesatu_alamat,
                    'pihak_kedua_nama_perusahaan' => $sp->pihak_kedua_nama_perusahaan,
                    'pihak_kedua_penanggung_jawab' => $sp->pihak_kedua_penanggung_jawab,
                    'pihak_kedua_alamat' => $sp->pihak_kedua_alamat,
                    'pihak_kedua_npwp' => $sp->pihak_kedua_npwp,
                    'pihak_kedua_platform' => $sp->pihak_kedua_platform,
                    'waktu_pengiriman' => $sp->waktu_pengiriman,
                    'kondisi_barang' => $sp->kondisi_barang,
                    'ketentuan_pembayaran' => $sp->ketentuan_pembayaran,
                    'sumber_dana' => $sp->sumber_dana,
                    'buku_kas_umum_id' => $sp->buku_kas_umum_id,
                    'kinerja_buku_kas_umum_id' => $sp->kinerja_buku_kas_umum_id ?? null,
                    'silpa_buku_kas_umum_id' => $sp->silpa_buku_kas_umum_id ?? null,
                    'kinerja_silpa_buku_kas_umum_id' => $sp->kinerja_silpa_buku_kas_umum_id ?? null,
                    'preview_url' => route(VariantConfig::routeName($this->variant, 'surat-pesanan.preview'), $sp->id),
                    'pdf_url' => route(VariantConfig::routeName($this->variant, 'surat-pesanan.pdf'), $sp->id),
                    'uraian_details' => $sp->bukuKasUmum->uraianDetails ?? collect([]),
                    'delete_data' => [
                        'id' => $sp->id,
                        'uraian' => 'Surat Pesanan ' . ($sp->nomor_sp ?? 'Tanpa Nomor')
                    ]
                ];
            });

            return response()->json([
                'success' => true,
                'data' => $formatted,
                'total' => $suratPesanans->total(),
                'pagination' => [
                    'current_page' => $suratPesanans->currentPage(),
                    'last_page' => $suratPesanans->lastPage(),
                    'per_page' => $suratPesanans->perPage(),
                    'total' => $suratPesanans->total(),
                ],
            ]);
        } catch (\Exception $e) {
            Log::error('Error searching Surat Pesanan: ' . $e->getMessage());
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
                'nomor_sp' => 'nullable|string',
                'tanggal_sp' => 'nullable|date',
                'pihak_kesatu_nama' => 'nullable|string',
                'pihak_kesatu_nip' => 'nullable|string',
                'pihak_kesatu_jabatan' => 'nullable|string',
                'pihak_kesatu_instansi' => 'nullable|string',
                'pihak_kesatu_alamat' => 'nullable|string',
                'pihak_kedua_nama_perusahaan' => 'nullable|string',
                'pihak_kedua_penanggung_jawab' => 'nullable|string',
                'pihak_kedua_alamat' => 'nullable|string',
                'pihak_kedua_npwp' => 'nullable|string',
                'pihak_kedua_platform' => 'nullable|string',
                'waktu_pengiriman' => 'nullable|string',
                'kondisi_barang' => 'nullable|string',
                'ketentuan_pembayaran' => 'nullable|string',
                'sumber_dana' => 'nullable|string',
            ]);

            $bukuKasUmum = ($this->BukuKasUmum)::with('penganggaran.sekolah')->find($validated[$bkuFk]);

            if (!$bukuKasUmum) {
                return response()->json(['success' => false, 'message' => 'BKU tidak ditemukan'], 404);
            }

            $existing = ($this->SuratPesanan)::where($bkuFk, $validated[$bkuFk])->first();
            if ($existing) {
                return response()->json(['success' => false, 'message' => 'Surat Pesanan untuk transaksi ini sudah ada'], 422);
            }

            $sekolahId = $bukuKasUmum->penganggaran->sekolah_id;
            if (!$sekolahId) {
                $sekolahId = SekolahProfile::first()->id ?? null;
            }

            $penganggaranFk = VariantConfig::penganggaranFk($this->variant);
            
            $sp = new ($this->SuratPesanan);
            $sp->sekolah_id = $sekolahId;
            $sp->$penganggaranFk = $bukuKasUmum->$penganggaranFk;
            $sp->$bkuFk = $bukuKasUmum->id;
            $sp->nomor_sp = $validated['nomor_sp'] ?? null;
            $sp->tanggal_sp = $validated['tanggal_sp'] ?? null;

            $sp->pihak_kesatu_nama = $validated['pihak_kesatu_nama'] ?? null;
            $sp->pihak_kesatu_nip = $validated['pihak_kesatu_nip'] ?? null;
            $sp->pihak_kesatu_jabatan = $validated['pihak_kesatu_jabatan'] ?? null;
            $sp->pihak_kesatu_instansi = $validated['pihak_kesatu_instansi'] ?? null;
            $sp->pihak_kesatu_alamat = $validated['pihak_kesatu_alamat'] ?? null;
            
            $sp->pihak_kedua_nama_perusahaan = $validated['pihak_kedua_nama_perusahaan'] ?? null;
            $sp->pihak_kedua_penanggung_jawab = $validated['pihak_kedua_penanggung_jawab'] ?? null;
            $sp->pihak_kedua_alamat = $validated['pihak_kedua_alamat'] ?? null;
            $sp->pihak_kedua_npwp = $validated['pihak_kedua_npwp'] ?? null;
            $sp->pihak_kedua_platform = $validated['pihak_kedua_platform'] ?? null;

            $sp->waktu_pengiriman = $validated['waktu_pengiriman'] ?? 'Barang harus dikirimkan selambat-lambatnya setelah Surat Pesanan ini disetujui.';
            $sp->kondisi_barang = $validated['kondisi_barang'] ?? 'Barang yang dikirim harus dalam keadaan baru, tidak cacat, dan sesuai dengan spesifikasi yang tertera. PIHAK KESATU berhak menolak barang yang tidak sesuai.';
            $sp->ketentuan_pembayaran = $validated['ketentuan_pembayaran'] ?? 'Pembayaran akan ditransfer ke rekening PIHAK KEDUA setelah seluruh barang diterima dengan baik yang dibuktikan dengan penandatanganan Berita Acara Serah Terima (BAST).';
            $sp->sumber_dana = $validated['sumber_dana'] ?? 'Pembiayaan pengadaan barang ini dibebankan pada dana Bantuan Operasional Satuan Pendidikan (BOSP) Tahun Anggaran ' . ($bukuKasUmum->penganggaran->tahun_anggaran ?? date('Y')) . '.';

            $sp->save();

            return response()->json(['success' => true, 'message' => 'Surat Pesanan berhasil dibuat!', 'data' => $sp]);
        } catch (\Exception $e) {
            Log::error('Error creating Surat Pesanan: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => 'Gagal membuat Surat Pesanan'], 500);
        }
    }
    
    public function update(Request $request, $id)
    {
        try {
            $sp = ($this->SuratPesanan)::findOrFail($id);
            $validated = $request->validate([
                'nomor_sp' => 'nullable|string',
                'tanggal_sp' => 'nullable|date',
                'pihak_kesatu_nama' => 'nullable|string',
                'pihak_kesatu_nip' => 'nullable|string',
                'pihak_kesatu_jabatan' => 'nullable|string',
                'pihak_kesatu_instansi' => 'nullable|string',
                'pihak_kesatu_alamat' => 'nullable|string',
                'pihak_kedua_nama_perusahaan' => 'nullable|string',
                'pihak_kedua_penanggung_jawab' => 'nullable|string',
                'pihak_kedua_alamat' => 'nullable|string',
                'pihak_kedua_npwp' => 'nullable|string',
                'pihak_kedua_platform' => 'nullable|string',
                'waktu_pengiriman' => 'nullable|string',
                'kondisi_barang' => 'nullable|string',
                'ketentuan_pembayaran' => 'nullable|string',
                'sumber_dana' => 'nullable|string',
            ]);
            
            $sp->update($validated);
            
            return response()->json(['success' => true, 'message' => 'Surat Pesanan berhasil diubah!']);
        } catch (\Exception $e) {
            Log::error('Error updating Surat Pesanan: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => 'Gagal mengubah Surat Pesanan'], 500);
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
            Log::error('Error getting tahun anggaran Surat Pesanan: ' . $e->getMessage());

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
                ->whereDoesntHave('suratPesanan');

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
                    'pihak_kedua_nama_perusahaan' => $bku->nama_toko ?? $bku->nama_penerima_pembayaran ?? '',
                    'pihak_kedua_alamat' => $bku->alamat_toko ?? '',
                    'pihak_kesatu_nama' => $bku->penganggaran->kepala_sekolah ?? '',
                    'pihak_kesatu_instansi' => $bku->penganggaran->sekolah->nama_sekolah ?? 'Sekolah',
                    'pihak_kesatu_alamat' => $bku->penganggaran->sekolah->alamat ?? '',
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
            $sp = ($this->SuratPesanan)::findOrFail($id);
            $sp->delete();
            return response()->json(['success' => true, 'message' => 'Surat Pesanan berhasil dihapus!']);
        } catch (\Exception $e) {
            Log::error('Error deleting Surat Pesanan: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => 'Gagal menghapus Surat Pesanan'], 500);
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
            $sp = ($this->SuratPesanan)::with([
                'bukuKasUmum.uraianDetails',
                'penganggaran',
                'sekolah'
            ])->findOrFail($id);

            $uraianDetails = $sp->bukuKasUmum->uraianDetails ?? collect([]);
            if ($uraianDetails->isEmpty()) {
                $totalKeseluruhan = $sp->bukuKasUmum->total_transaksi_kotor ?? 0;
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
                'suratPesanan' => $sp,
                'bku' => $sp->bukuKasUmum,
                'uraianDetails' => $uraianDetails,
                'tanggalBku' => \Carbon\Carbon::parse($sp->bukuKasUmum->tanggal_transaksi)->locale('id'),
                'tanggalSp' => $sp->tanggal_sp ? \Carbon\Carbon::parse($sp->tanggal_sp)->locale('id') : \Carbon\Carbon::parse($sp->bukuKasUmum->tanggal_transaksi)->locale('id'),
                'totalKeseluruhan' => $totalKeseluruhan,
                'terbilangText' => $terbilangText,
                'fontSize' => $fontSize,
            ];

            $pdf = Pdf::loadView('pelengkap.surat_pesanan_pdf', $data);
            $pdf->setPaper($paperConfig, 'portrait');

            if ($isPreview) {
                return response($pdf->output(), 200)
                    ->header('Content-Type', 'application/pdf');
            }
            $safeName = str_replace(['/', '\\'], '_', $sp->nomor_sp ?? $sp->id);
            return $pdf->stream('Surat_Pesanan_' . $safeName . '.pdf');
        } catch (\Exception $e) {
            Log::error('Error rendering Surat Pesanan PDF: ' . $e->getMessage());
            return redirect()->back()->with('error', 'Gagal memuat PDF Surat Pesanan');
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
