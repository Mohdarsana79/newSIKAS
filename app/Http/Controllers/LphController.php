<?php

namespace App\Http\Controllers;

use App\Models\Lph;
use App\Models\Penganggaran;
use App\Models\Rkas;
use App\Models\RkasPerubahan;
use App\Models\BukuKasUmum;
use App\Models\PenerimaanDana;
use Illuminate\Http\Request;
use App\Config\VariantConfig;
use Illuminate\Support\Facades\DB;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\Carbon;

use Illuminate\Validation\Rule;

class LphController extends Controller
{
    protected ?string $variant;
    protected ?string $Penganggaran;
    protected ?string $Rkas;
    protected ?string $RkasPerubahan;
    protected ?string $PenerimaanDana;
    protected ?string $BukuKasUmum;
    protected ?string $Lph;

    public function __construct()
    {
        $this->middleware(function ($request, $next) {
            $this->variant = app()->bound('variant') ? app('variant') : 'reguler';
            $this->Penganggaran = VariantConfig::getModelClass('penganggaran', $this->variant);
            $this->Rkas = VariantConfig::getModelClass('rkas', $this->variant);
            $this->RkasPerubahan = VariantConfig::getModelClass('rkas_perubahan', $this->variant);
            $this->PenerimaanDana = VariantConfig::getModelClass('penerimaan_dana', $this->variant);
            $this->BukuKasUmum = VariantConfig::getModelClass('bku', $this->variant);
            $this->Lph = VariantConfig::getModelClass('lph', $this->variant);

            return $next($request);
        });
    }
    public function index(Request $request)
    {
        $sekolahId = auth()->user()->sekolah_id ?? 1;
        $query = ($this->Lph)::with(['penganggaran', 'sekolah'])
            ->where('sekolah_id', $sekolahId);

        if ($request->has('search') && $request->search != '') {
            $search = $request->search;
            $query->whereHas('penganggaran', function($q) use ($search) {
                $q->where('tahun_anggaran', $search);
            });
        }

        $perPage = $request->input('per_page', 10);
        return response()->json($query->latest()->paginate($perPage));
    }

    public function calculate(Request $request)
    {
        try {
            $tahun = $request->tahun_anggaran;
            $semester = $request->semester;
            $sekolahId = auth()->user()->sekolah_id ?? 1;

            $penganggaran = ($this->Penganggaran)::where('sekolah_id', $sekolahId)
                ->where('tahun_anggaran', $tahun)
                ->first();

            if (!$penganggaran) {
                return response()->json(['error' => "Data Penganggaran tidak ditemukan untuk tahun $tahun"], 404);
            }

            $data = $this->calculateValues($penganggaran, $semester);
            
            return response()->json(array_merge([VariantConfig::penganggaranFk($this->variant) => $penganggaran->id], $data));

        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    private function calculateValues($penganggaran, $semester)
    {
        $tahun = $penganggaran->tahun_anggaran;

        // 1. Penerimaan Dana (Anggaran pada row Penerimaan)
        $penerimaanRealisasiQuery = ($this->PenerimaanDana)::where(\App\Config\VariantConfig::penganggaranFk($this->variant), $penganggaran->id);

        if (!in_array($this->variant, ['silpa', 'kinerja_silpa'])) {
            if ($semester == '1') {
                 $penerimaanRealisasiQuery->where(function($q) {
                    $q->where('sumber_dana', 'like', "%Tahap 1%")
                      ->orWhere('sumber_dana', 'like', "%Tahap I%"); 
                });
            } else {
                 $penerimaanRealisasiQuery->where(function($q) {
                    $q->where('sumber_dana', 'like', "%Tahap 2%")
                      ->orWhere('sumber_dana', 'like', "%Tahap II%"); 
                });
            }
        } else {
            // Untuk SiLPA, terima semua jika semester 1. Jika semester 2, filter by month >= 7
            if ($semester == '2') {
                 $penerimaanRealisasiQuery->whereMonth('tanggal_terima', '>=', 7);
            }
        }
        // Total Dana Masuk (Penerimaan Anggaran)
        $totalPenerimaanDana = $penerimaanRealisasiQuery->sum('jumlah_dana');

        // Jika Semester 2, tambahkan Sisa Dana Semester 1 ke Penerimaan Anggaran
        if ($semester == '2') {
            $penerimaanSem1Query = ($this->PenerimaanDana)::where(\App\Config\VariantConfig::penganggaranFk($this->variant), $penganggaran->id);
            
            if (!in_array($this->variant, ['silpa', 'kinerja_silpa'])) {
                $penerimaanSem1Query->where(function($q) {
                    $q->where('sumber_dana', 'like', "%Tahap 1%")
                      ->orWhere('sumber_dana', 'like', "%Tahap I%"); 
                });
            } else {
                $penerimaanSem1Query->whereMonth('tanggal_terima', '<', 7);
            }
            $totalPenerimaanSem1 = $penerimaanSem1Query->sum('jumlah_dana');

            $totalBelanjaSem1 = ($this->BukuKasUmum)::where(\App\Config\VariantConfig::penganggaranFk($this->variant), $penganggaran->id)
                ->whereDate('tanggal_transaksi', '>=', "$tahun-01-01")
                ->whereDate('tanggal_transaksi', '<=', "$tahun-06-30")
                ->whereNotNull('rekening_belanja_id')
                ->sum('total_transaksi_kotor');

            $sisaDanaSem1 = $totalPenerimaanSem1 - $totalBelanjaSem1;
            
            if ($sisaDanaSem1 > 0) {
                $totalPenerimaanDana += $sisaDanaSem1;
            }
        }

        // 2. Pengeluaran Anggaran
        $hasPerubahan = $this->RkasPerubahan ? ($this->RkasPerubahan)::where(VariantConfig::penganggaranFk($this->variant), $penganggaran->id)->exists() : false;

        $months = $semester == '1' 
            ? ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni'] 
            : ['Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

        if ($hasPerubahan) {
            $rkasItems = ($this->RkasPerubahan)::where(VariantConfig::penganggaranFk($this->variant), $penganggaran->id)
                ->whereIn('bulan', $months)
                ->with('rekeningBelanja')
                ->get();
        } else {
            $rkasItems = ($this->Rkas)::where(VariantConfig::penganggaranFk($this->variant), $penganggaran->id)
                ->whereIn('bulan', $months)
                ->with('rekeningBelanja')
                ->get();
        }
        
        $belanjaOperasiAnggaran = $rkasItems->filter(fn($i) => 
            str_starts_with($i->rekeningBelanja->kode_rekening ?? '', '5.1')
        )->sum(fn($i) => $i->jumlah * $i->harga_satuan);

        $belanjaModalPeralatanAnggaran = $rkasItems->filter(fn($i) => 
            str_starts_with($i->rekeningBelanja->kode_rekening ?? '', '5.2.02')
        )->sum(fn($i) => $i->jumlah * $i->harga_satuan);

        $belanjaModalAsetAnggaran = $rkasItems->filter(fn($i) => 
            str_starts_with($i->rekeningBelanja->kode_rekening ?? '', '5.2') &&
            !str_starts_with($i->rekeningBelanja->kode_rekening ?? '', '5.2.02')
        )->sum(fn($i) => $i->jumlah * $i->harga_satuan);

        // 3. Pengeluaran Realisasi (From BKU)
        $startDate = $semester == '1' ? "$tahun-01-01" : "$tahun-07-01"; 
        $endDate = $semester == '1' ? "$tahun-06-30" : "$tahun-12-31";

        $bkuEntries = ($this->BukuKasUmum)::where(VariantConfig::penganggaranFk($this->variant), $penganggaran->id)
            ->whereDate('tanggal_transaksi', '>=', $startDate)
            ->whereDate('tanggal_transaksi', '<=', $endDate)
            ->whereNotNull('rekening_belanja_id')
            ->with('rekeningBelanja')
            ->get();

        $belanjaOperasiRealisasi = $bkuEntries->filter(fn($b) => 
            str_starts_with($b->rekeningBelanja->kode_rekening ?? '', '5.1')
        )->sum('total_transaksi_kotor');

        $belanjaModalPeralatanRealisasi = $bkuEntries->filter(fn($b) => 
            str_starts_with($b->rekeningBelanja->kode_rekening ?? '', '5.2.02')
        )->sum('total_transaksi_kotor');

        $belanjaModalAsetRealisasi = $bkuEntries->filter(fn($b) => 
            str_starts_with($b->rekeningBelanja->kode_rekening ?? '', '5.2') &&
            !str_starts_with($b->rekeningBelanja->kode_rekening ?? '', '5.2.02')
        )->sum('total_transaksi_kotor');

        // NEW LOGIC: Penerimaan row should reflect Dana Diterima vs Total Belanja
        $penerimaanAnggaran = $totalPenerimaanDana;
        $penerimaanRealisasi = $belanjaOperasiRealisasi + $belanjaModalPeralatanRealisasi + $belanjaModalAsetRealisasi;

        // 4. Breakdown per Account (For the detailed table)
        $rekapPerRekening = $bkuEntries->groupBy('rekening_belanja_id')
            ->map(function($items) {
                $first = $items->first();
                return [
                    'kode_rekening' => $first->rekeningBelanja->kode_rekening ?? '',
                    'nama_rekening' => $first->rekeningBelanja->nama_rekening ?? '',
                    'uraian' => $first->uraian ?? $first->rekeningBelanja->nama_rekening ?? '',
                    'total_realisasi' => $items->sum('total_transaksi_kotor')
                ];
            })->values();

        return [
            'penerimaan_anggaran' => $penerimaanAnggaran,
            'penerimaan_realisasi' => $penerimaanRealisasi,
            
            'belanja_operasi_anggaran' => $belanjaOperasiAnggaran,
            'belanja_operasi_realisasi' => $belanjaOperasiRealisasi,
            
            'belanja_modal_peralatan_anggaran' => $belanjaModalPeralatanAnggaran,
            'belanja_modal_peralatan_realisasi' => $belanjaModalPeralatanRealisasi,
            
            'belanja_modal_aset_anggaran' => $belanjaModalAsetAnggaran,
            'belanja_modal_aset_realisasi' => $belanjaModalAsetRealisasi,
            
            'rekap_per_rekening' => $rekapPerRekening,
        ];
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'semester' => [
                'required',
                'in:1,2',
                Rule::unique((new $this->Lph)->getTable())->where(function ($query) use ($request) {
                    return $query->where(VariantConfig::penganggaranFk($this->variant), $request->{VariantConfig::penganggaranFk($this->variant)});
                })
            ],
            VariantConfig::penganggaranFk($this->variant) => 'required|exists:' . (new $this->Penganggaran)->getTable() . ',id',
            'tanggal_lph' => 'nullable|date',
            
            'penerimaan_anggaran' => 'required|numeric',
            'penerimaan_realisasi' => 'required|numeric',
            'belanja_operasi_anggaran' => 'required|numeric',
            'belanja_operasi_realisasi' => 'required|numeric',
            'belanja_modal_peralatan_anggaran' => 'required|numeric',
            'belanja_modal_peralatan_realisasi' => 'required|numeric',
            'belanja_modal_aset_anggaran' => 'required|numeric',
            'belanja_modal_aset_realisasi' => 'required|numeric',
        ], [
            'semester.unique' => 'LPH Semester Tersebut Sudah Ada',
        ]);

        $validated['sekolah_id'] = auth()->user()->sekolah_id ?? 1;

        // Calculate selisih
        $validated['penerimaan_selisih'] = $validated['penerimaan_anggaran'] - $validated['penerimaan_realisasi'];
        $validated['belanja_operasi_selisih'] = $validated['belanja_operasi_anggaran'] - $validated['belanja_operasi_realisasi'];
        $validated['belanja_modal_peralatan_selisih'] = $validated['belanja_modal_peralatan_anggaran'] - $validated['belanja_modal_peralatan_realisasi'];
        $validated['belanja_modal_aset_selisih'] = $validated['belanja_modal_aset_anggaran'] - $validated['belanja_modal_aset_realisasi'];

        ($this->Lph)::create($validated);

        return response()->json(['success' => true]);
    }

    public function update(Request $request, $id)
    {
        $lph = ($this->Lph)::findOrFail($id);
        $validated = $request->validate([
            'semester' => [
                'required',
                'in:1,2',
                Rule::unique((new $this->Lph)->getTable())->ignore($id)->where(function ($query) use ($request) {
                    return $query->where(VariantConfig::penganggaranFk($this->variant), $request->{VariantConfig::penganggaranFk($this->variant)});
                })
            ],
            VariantConfig::penganggaranFk($this->variant) => 'required|exists:' . (new $this->Penganggaran)->getTable() . ',id',
            'tanggal_lph' => 'nullable|date',
            
            'penerimaan_anggaran' => 'required|numeric',
            'penerimaan_realisasi' => 'required|numeric',
            'belanja_operasi_anggaran' => 'required|numeric',
            'belanja_operasi_realisasi' => 'required|numeric',
            'belanja_modal_peralatan_anggaran' => 'required|numeric',
            'belanja_modal_peralatan_realisasi' => 'required|numeric',
            'belanja_modal_aset_anggaran' => 'required|numeric',
            'belanja_modal_aset_realisasi' => 'required|numeric',
        ], [
            'semester.unique' => 'LPH Semester Tersebut Sudah Ada',
        ]);

        $validated['sekolah_id'] = auth()->user()->sekolah_id ?? 1;

        // Calculate selisih
        $validated['penerimaan_selisih'] = $validated['penerimaan_anggaran'] - $validated['penerimaan_realisasi'];
        $validated['belanja_operasi_selisih'] = $validated['belanja_operasi_anggaran'] - $validated['belanja_operasi_realisasi'];
        $validated['belanja_modal_peralatan_selisih'] = $validated['belanja_modal_peralatan_anggaran'] - $validated['belanja_modal_peralatan_realisasi'];
        $validated['belanja_modal_aset_selisih'] = $validated['belanja_modal_aset_anggaran'] - $validated['belanja_modal_aset_realisasi'];

        $lph->update($validated);

        return response()->json(['success' => true]);
    }

    public function destroy($id)
    {
        ($this->Lph)::findOrFail($id)->delete();
        return response()->json(['success' => true]);
    }
    
    public function getTahunAnggaran()
    {
        $sekolahId = auth()->user()->sekolah_id ?? 1;
        $tahuns = ($this->Penganggaran)::where('sekolah_id', $sekolahId)
            ->select('id', 'tahun_anggaran')
            ->orderBy('tahun_anggaran', 'desc')
            ->get();

        return response()->json($tahuns);
    }

    public function generatePdf($id)
    {
        $lph = ($this->Lph)::with(['sekolah', 'penganggaran'])->findOrFail($id);
        
        // Auto-refresh financial data if it seems empty or outdated
        // This ensures the PDF is always accurate even if the user didn't click "Hitung"
        if ($lph->penganggaran) {
            $newData = $this->calculateValues($lph->penganggaran, $lph->semester);
            
            // Update the model instance with new values (and save to DB/update attributes)
            $lph->penerimaan_anggaran = $newData['penerimaan_anggaran'];
            $lph->penerimaan_realisasi = $newData['penerimaan_realisasi'];
            $lph->penerimaan_selisih = $newData['penerimaan_anggaran'] - $newData['penerimaan_realisasi'];
            
            $lph->belanja_operasi_anggaran = $newData['belanja_operasi_anggaran'];
            $lph->belanja_operasi_realisasi = $newData['belanja_operasi_realisasi'];
            $lph->belanja_operasi_selisih = $newData['belanja_operasi_anggaran'] - $newData['belanja_operasi_realisasi'];
            
            $lph->belanja_modal_peralatan_anggaran = $newData['belanja_modal_peralatan_anggaran'];
            $lph->belanja_modal_peralatan_realisasi = $newData['belanja_modal_peralatan_realisasi'];
            $lph->belanja_modal_peralatan_selisih = $newData['belanja_modal_peralatan_anggaran'] - $newData['belanja_modal_peralatan_realisasi'];

            $lph->belanja_modal_aset_anggaran = $newData['belanja_modal_aset_anggaran'];
            $lph->belanja_modal_aset_realisasi = $newData['belanja_modal_aset_realisasi'];
            $lph->belanja_modal_aset_selisih = $newData['belanja_modal_aset_anggaran'] - $newData['belanja_modal_aset_realisasi'];
            
            // Optional: Save these updates to the database so next view is fast
            $lph->save();
        }

        $paperSize = request()->input('paper_size', 'A4');
        $fontSize = request()->input('font_size', '11pt');

        $data = [
                'sumberDana' => \App\Config\VariantConfig::title($this->variant),
            'lph' => $lph,
            'sekolah' => $lph->sekolah,
            'rekap_per_rekening' => $newData['rekap_per_rekening'] ?? [],
            'kepala_sekolah' => (object) [
                'nama' => $lph->penganggaran->kepala_sekolah,
                'nip' => $lph->penganggaran->nip_kepala_sekolah
            ],
            'tanggal_cetak' => $lph->tanggal_lph 
                ? Carbon::parse($lph->tanggal_lph)->locale('id')->isoFormat('D MMMM Y') 
                : now()->locale('id')->isoFormat('D MMMM Y'),
            'fontSize' => $fontSize,
        ];

        $pdf = Pdf::loadView('laporan.lph_pdf', $data);
        
        if (strtolower($paperSize) === 'folio') {
             $pdf->setPaper([0, 0, 595.28, 935.43], 'portrait');
        } else {
             $pdf->setPaper($paperSize, 'portrait');
        }

        return $pdf->stream('lph.pdf');
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
