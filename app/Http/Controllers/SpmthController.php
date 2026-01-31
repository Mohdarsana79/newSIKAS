<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class SpmthController extends Controller
{
    public function index(Request $request) {
        $query = \App\Models\Spmth::query()
            ->with(['penganggaran', 'sekolah']);

        if ($request->has('search')) {
            $search = $request->search;
            $query->where('nomor_surat', 'like', "%{$search}%");
        }
        
        // Filter by current school/user if necessary (assuming implementation detail)
        // $query->where('sekolah_id', auth()->user()->sekolah_id);

        $perPage = $request->input('per_page', 10);
        return response()->json($query->latest()->paginate($perPage));
    }

    public function calculate(Request $request) {
        // Inputs: tahun_anggaran, tahap (1 or 2), penganggaran_id (optional if we can derive from session/user)
        try {
            $tahun = $request->tahun_anggaran;
            $tahap = $request->tahap;
            $sekolahId = auth()->user()->sekolah_id ?? 1; 
            
            // 1. Get Penganggaran ID for the year/school
            $penganggaran = \App\Models\Penganggaran::where('sekolah_id', $sekolahId)
                ->where('tahun_anggaran', $tahun)
                ->first();

            if (!$penganggaran) {
                return response()->json(['error' => "Data Penganggaran tidak ditemukan untuk tahun $tahun"], 404);
            }

            // 2. Calculate Pagu (Total Penerimaan)
            // Modified per user request to use pagu_anggaran from Penganggaran model
            $pagu = $penganggaran->pagu_anggaran;
            
            /* Previous Logic:
            $pagu = \App\Models\PenerimaanDana::where('penganggaran_id', $penganggaran->id)
                ->where('sumber_dana', 'like', "%Tahap $tahap%") 
                ->sum('jumlah_dana');
            
            if ($pagu == 0) {
                 $months = $tahap == '1' ? [1,2,3,4,5,6] : [7,8,9,10,11,12];
                 $pagu = \App\Models\PenerimaanDana::where('penganggaran_id', $penganggaran->id)
                    ->whereYear('tanggal_terima', $tahun)
                    ->whereIn(\DB::raw('EXTRACT(MONTH FROM tanggal_terima)'), $months)
                    ->sum('jumlah_dana');
            }
            */

            // 3. Calculate Realisasi (Expenditure)
            // Semester I: Jan - Jun
            // Semester II: Jul - Dec
            
            // Realisasi Lalu (Previous Semester)
            $realisasiLalu = 0;
            if ($tahap == '2') {
                 // Sum of Sem 1
                 $realisasiLalu = \App\Models\BukuKasUmum::where('penganggaran_id', $penganggaran->id)
                    ->where('is_bunga_record', false)
                    ->whereYear('tanggal_transaksi', $tahun)
                    ->whereIn(\DB::raw('EXTRACT(MONTH FROM tanggal_transaksi)'), [1,2,3,4,5,6])
                    ->sum('total_transaksi_kotor'); // Using total_transaksi_kotor as typically used
            }

            // Realisasi Ini (Current Semester)
            $monthsIni = $tahap == '1' ? [1,2,3,4,5,6] : [7,8,9,10,11,12];
            $realisasiIni = \App\Models\BukuKasUmum::where('penganggaran_id', $penganggaran->id)
                    ->where('is_bunga_record', false)
                    ->whereYear('tanggal_transaksi', $tahun)
                    ->whereIn(\DB::raw('EXTRACT(MONTH FROM tanggal_transaksi)'), $monthsIni)
                    ->sum('total_transaksi_kotor');

            $sisa = $pagu - ($realisasiLalu + $realisasiIni); // Usually Sisa is (Pagu - Total Usage)

            // Adjust calculation based on user image: Pagu 32m, Lalu 0, Ini 15m, Sisa 15m.
            // Wait, 32 - 15 = 17. The user image had 15m sisa. 
            // Maybe "Pagu" in the image is cumulative? Or "Sisa" is carried over? 
            // I'll stick to standard math: Sisa = Pagu - Total Realisasi.
            
            return response()->json([
                'penganggaran_id' => $penganggaran->id,
                'pagu' => $pagu,
                'realisasi_lalu' => $realisasiLalu,
                'realisasi_ini' => $realisasiIni,
                'sisa' => $sisa
            ]);

        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    public function store(Request $request) {
        $validated = $request->validate([
            'nomor_surat' => 'required|string',
            'tahap' => 'required|in:1,2',
            'penganggaran_id' => 'required|exists:penganggarans,id',
            'realisasi_lalu' => 'required|numeric',
            'realisasi_ini' => 'required|numeric',
            'sisa' => 'required|numeric',
            'tanggal_spmth' => 'nullable|date',
        ]);

        $validated['sekolah_id'] = auth()->user()->sekolah_id ?? 1;

        \App\Models\Spmth::create($validated);

        return response()->json(['success' => true]);
    }
    
    public function update(Request $request, $id) {
         $spmth = \App\Models\Spmth::findOrFail($id);
         $validated = $request->validate([
            'nomor_surat' => 'required|string',
            'tahap' => 'required|in:1,2',
            'penganggaran_id' => 'required|exists:penganggarans,id',
            'realisasi_lalu' => 'required|numeric',
            'realisasi_ini' => 'required|numeric',
            'sisa' => 'required|numeric',
            'tanggal_spmth' => 'nullable|date',
        ]);
        
        $spmth->update($validated);
        return response()->json(['success' => true]);
    }

    public function destroy($id) {
        \App\Models\Spmth::findOrFail($id)->delete();
        return response()->json(['success' => true]);
    }

    public function generatePdf($id) {
        $spmth = \App\Models\Spmth::with(['sekolah', 'penganggaran'])->findOrFail($id);
        
        $paperSize = request()->input('paper_size', 'A4');
        $fontSize = request()->input('font_size', '12pt');

        $data = [
            'spmth' => $spmth,
            'sekolah' => $spmth->sekolah,
            'kepala_sekolah' => (object) [
                'nama' => $spmth->penganggaran->kepala_sekolah,
                'nip' => $spmth->penganggaran->nip_kepala_sekolah
            ],
            'tanggal_cetak' => $spmth->tanggal_spmth 
                ? \Carbon\Carbon::parse($spmth->tanggal_spmth)->locale('id')->isoFormat('D MMMM Y') 
                : now()->locale('id')->isoFormat('D MMMM Y'),
            'semester_text' => $spmth->tahap == '1' ? 'Semester I' : 'Semester II',
            'pagu' => $this->calculatePagu($spmth->penganggaran_id, $spmth->tahap, $spmth->penganggaran->tahun_anggaran),
            'fontSize' => $fontSize,
        ];

        $pdf = \Barryvdh\DomPDF\Facade\Pdf::loadView('laporan.spmth_pdf', $data);
        
        // Handle custom paper sizes if necessary, or just pass the string
        if (strtolower($paperSize) === 'folio') {
             $pdf->setPaper([0, 0, 595.28, 935.43], 'portrait'); // F4 / Folio approx
        } else {
             $pdf->setPaper($paperSize, 'portrait');
        }

        return $pdf->stream('spmth.pdf');
    }

    public function getTahunAnggaran() {
        $sekolahId = auth()->user()->sekolah_id ?? 1;
        $tahuns = \App\Models\Penganggaran::where('sekolah_id', $sekolahId)
            ->select('id', 'tahun_anggaran')
            ->orderBy('tahun_anggaran', 'desc')
            ->get();

        return response()->json($tahuns);
    }

    private function calculatePagu($penganggaranId, $tahap, $tahun) {
        $penganggaran = \App\Models\Penganggaran::find($penganggaranId);
        return $penganggaran ? $penganggaran->pagu_anggaran : 0;
    }
}
