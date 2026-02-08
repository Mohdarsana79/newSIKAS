<?php

namespace App\Http\Controllers;

use App\Models\Lph;
use App\Models\Penganggaran;
use App\Models\Rkas;
use App\Models\RkasPerubahan;
use App\Models\BukuKasUmum;
use App\Models\PenerimaanDana;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\Carbon;

class LphController extends Controller
{
    public function index(Request $request)
    {
        $sekolahId = auth()->user()->sekolah_id ?? 1;
        $query = Lph::with(['penganggaran', 'sekolah'])
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

            $penganggaran = Penganggaran::where('sekolah_id', $sekolahId)
                ->where('tahun_anggaran', $tahun)
                ->first();

            if (!$penganggaran) {
                return response()->json(['error' => "Data Penganggaran tidak ditemukan untuk tahun $tahun"], 404);
            }

            $data = $this->calculateValues($penganggaran, $semester);
            
            return response()->json(array_merge(['penganggaran_id' => $penganggaran->id], $data));

        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    private function calculateValues($penganggaran, $semester)
    {
        $tahun = $penganggaran->tahun_anggaran;

        // 1. Penerimaan
        $penerimaanAnggaran = $penganggaran->pagu_anggaran;

        $penerimaanRealisasiQuery = PenerimaanDana::where('penganggaran_id', $penganggaran->id);

        if ($semester == '1') {
             $penerimaanRealisasiQuery->where(function($q) {
                $q->where('sumber_dana', 'like', "%Tahap 1%")
                  ->orWhere('sumber_dana', 'like', "%Tahap I%"); // Cover explicit Tahap I case if distinct from 1
            });
        }
        // If semester 2, we want cumulative (Tahap 1 + Tahap 2), so we take all receipts for this budget.

        $penerimaanRealisasi = $penerimaanRealisasiQuery->sum('jumlah_dana');

        // 2. Pengeluaran Anggaran
        // Check if RkasPerubahan exists
        $hasPerubahan = RkasPerubahan::where('penganggaran_id', $penganggaran->id)->exists();

        if ($hasPerubahan) {
            $rkasItems = RkasPerubahan::where('penganggaran_id', $penganggaran->id)
                ->with('rekeningBelanja')
                ->get();
        } else {
            $rkasItems = Rkas::where('penganggaran_id', $penganggaran->id)
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
        // Cumulative Calculation:
        // Semester 1: Jan 1 - Jun 30
        // Semester 2: Jan 1 - Dec 31 (Accumulated)
        $startDate = "$tahun-01-01"; 
        $endDate = $semester == '1' ? "$tahun-06-30" : "$tahun-12-31";

        $bkuEntries = BukuKasUmum::where('penganggaran_id', $penganggaran->id)
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

        return [
            'penerimaan_anggaran' => $penerimaanAnggaran,
            'penerimaan_realisasi' => $penerimaanRealisasi,
            
            'belanja_operasi_anggaran' => $belanjaOperasiAnggaran,
            'belanja_operasi_realisasi' => $belanjaOperasiRealisasi,
            
            'belanja_modal_peralatan_anggaran' => $belanjaModalPeralatanAnggaran,
            'belanja_modal_peralatan_realisasi' => $belanjaModalPeralatanRealisasi,
            
            'belanja_modal_aset_anggaran' => $belanjaModalAsetAnggaran,
            'belanja_modal_aset_realisasi' => $belanjaModalAsetRealisasi,
        ];
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'semester' => 'required|in:1,2',
            'penganggaran_id' => 'required|exists:penganggarans,id',
            'tanggal_lph' => 'nullable|date',
            
            'penerimaan_anggaran' => 'required|numeric',
            'penerimaan_realisasi' => 'required|numeric',
            'belanja_operasi_anggaran' => 'required|numeric',
            'belanja_operasi_realisasi' => 'required|numeric',
            'belanja_modal_peralatan_anggaran' => 'required|numeric',
            'belanja_modal_peralatan_realisasi' => 'required|numeric',
            'belanja_modal_aset_anggaran' => 'required|numeric',
            'belanja_modal_aset_realisasi' => 'required|numeric',
        ]);

        $validated['sekolah_id'] = auth()->user()->sekolah_id ?? 1;

        // Calculate selisih
        $validated['penerimaan_selisih'] = $validated['penerimaan_anggaran'] - $validated['penerimaan_realisasi'];
        $validated['belanja_operasi_selisih'] = $validated['belanja_operasi_anggaran'] - $validated['belanja_operasi_realisasi'];
        $validated['belanja_modal_peralatan_selisih'] = $validated['belanja_modal_peralatan_anggaran'] - $validated['belanja_modal_peralatan_realisasi'];
        $validated['belanja_modal_aset_selisih'] = $validated['belanja_modal_aset_anggaran'] - $validated['belanja_modal_aset_realisasi'];

        Lph::create($validated);

        return response()->json(['success' => true]);
    }

    public function update(Request $request, $id)
    {
        $lph = Lph::findOrFail($id);
        $validated = $request->validate([
            'semester' => 'required|in:1,2',
            'penganggaran_id' => 'required|exists:penganggarans,id',
            'tanggal_lph' => 'nullable|date',
            
            'penerimaan_anggaran' => 'required|numeric',
            'penerimaan_realisasi' => 'required|numeric',
            'belanja_operasi_anggaran' => 'required|numeric',
            'belanja_operasi_realisasi' => 'required|numeric',
            'belanja_modal_peralatan_anggaran' => 'required|numeric',
            'belanja_modal_peralatan_realisasi' => 'required|numeric',
            'belanja_modal_aset_anggaran' => 'required|numeric',
            'belanja_modal_aset_realisasi' => 'required|numeric',
        ]);

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
        Lph::findOrFail($id)->delete();
        return response()->json(['success' => true]);
    }
    
    public function getTahunAnggaran()
    {
        $sekolahId = auth()->user()->sekolah_id ?? 1;
        $tahuns = Penganggaran::where('sekolah_id', $sekolahId)
            ->select('id', 'tahun_anggaran')
            ->orderBy('tahun_anggaran', 'desc')
            ->get();

        return response()->json($tahuns);
    }

    public function generatePdf($id)
    {
        $lph = Lph::with(['sekolah', 'penganggaran'])->findOrFail($id);
        
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
            'lph' => $lph,
            'sekolah' => $lph->sekolah,
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
}
