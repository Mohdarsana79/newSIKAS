<?php

namespace App\Http\Controllers;

use App\Models\Sptj;
use App\Models\Penganggaran;
use Illuminate\Http\Request;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\Carbon;

class SptjController extends Controller
{
    public function index(Request $request)
    {
        $query = Sptj::with(['penganggaran']);

        if ($request->has('search')) {
            $search = $request->search;
            $query->where('nomor_sptj', 'like', "%{$search}%");
        }

        $perPage = $request->input('per_page', 10);
        return response()->json($query->latest()->paginate($perPage));
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'penganggaran_id' => 'required|exists:penganggarans,id',
            'penerimaan_dana_id' => 'nullable|exists:penerimaan_danas,id',
            'buku_kas_umum_id' => 'nullable|exists:buku_kas_umums,id',
            'nomor_sptj' => 'required|string|unique:sptjs,nomor_sptj',
            'tanggal_sptj' => 'required|date',
            'tahap' => 'required|in:1,2',
            'tahap_satu' => 'required|numeric',
            'tahap_dua' => 'required|numeric',
            'jenis_belanja_pegawai' => 'required|numeric',
            'jenis_belanja_barang_jasa' => 'required|numeric',
            'jenis_belanja_modal' => 'required|numeric',
            'sisa_kas_tunai' => 'required|numeric',
            'sisa_dana_di_bank' => 'required|numeric',
        ]);

        Sptj::create($validated);

        return response()->json(['success' => true]);
    }

    public function update(Request $request, $id)
    {
        $sptj = Sptj::findOrFail($id);
        
        $validated = $request->validate([
            'penganggaran_id' => 'required|exists:penganggarans,id',
            'penerimaan_dana_id' => 'nullable|exists:penerimaan_danas,id',
            'buku_kas_umum_id' => 'nullable|exists:buku_kas_umums,id',
            'nomor_sptj' => 'required|string|unique:sptjs,nomor_sptj,' . $id,
            'tanggal_sptj' => 'required|date',
            'tahap' => 'required|in:1,2',
            'tahap_satu' => 'required|numeric',
            'tahap_dua' => 'required|numeric',
            'jenis_belanja_pegawai' => 'required|numeric',
            'jenis_belanja_barang_jasa' => 'required|numeric',
            'jenis_belanja_modal' => 'required|numeric',
            'sisa_kas_tunai' => 'required|numeric',
            'sisa_dana_di_bank' => 'required|numeric',
        ]);

        $sptj->update($validated);

        return response()->json(['success' => true]);
    }

    public function destroy($id)
    {
        Sptj::findOrFail($id)->delete();
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

    public function calculate(Request $request)
    {
        try {
            $tahun = $request->tahun_anggaran;
            // $tahap = $request->tahap; // Should be used to filter expenses period
            $sekolahId = auth()->user()->sekolah_id ?? 1;

            $penganggaran = Penganggaran::where('sekolah_id', $sekolahId)
                ->where('tahun_anggaran', $tahun)
                ->first();

            if (!$penganggaran) {
                return response()->json(['error' => "Data Penganggaran tidak ditemukan untuk tahun $tahun"], 404);
            }

            // 1. Penerimaan Dana (Receipts)
            // Use strict text matching for now, adjust if needed
            $tahapSatu = \App\Models\PenerimaanDana::where('penganggaran_id', $penganggaran->id)
                ->where(function($q) {
                    $q->where('sumber_dana', 'like', '%Tahap 1%')
                      ->orWhere('sumber_dana', 'like', '%Tahap I%');
                })->sum('jumlah_dana');

            $tahapDua = \App\Models\PenerimaanDana::where('penganggaran_id', $penganggaran->id)
                ->where(function($q) {
                    $q->where('sumber_dana', 'like', '%Tahap 2%')
                      ->orWhere('sumber_dana', 'like', '%Tahap II%');
                })->sum('jumlah_dana');

            // 2. Pengeluaran (Expenses)
            // Filter by date range based on requested Tahap
            $startDate = $request->tahap == '1' ? "$tahun-01-01" : "$tahun-07-01";
            $endDate = $request->tahap == '1' ? "$tahun-06-30" : "$tahun-12-31";
            
            // Get all BKU expenses for the period
            // Assumption: BKU has `rekening_belanja_id` which links to `RekeningBelanja`
            // and `RekeningBelanja` has `kode_rekening` or similar to identify Pegawai/Barang/Modal
            
            $bkuEntries = \App\Models\BukuKasUmum::where('penganggaran_id', $penganggaran->id)
                ->whereDate('tanggal_transaksi', '>=', $startDate)
                ->whereDate('tanggal_transaksi', '<=', $endDate)
                ->whereNotNull('rekening_belanja_id') // Only expenses have rekening?
                ->with(['rekeningBelanja', 'kodeKegiatan'])
                ->get();
                
            $p_pegawai = 0;
            $p_barang = 0;
            $p_modal = 0;
            
            // Kode Kegiatan prefixes for Belanja Pegawai
            $pegawaiPrefixes = ['07.12.01.', '07.12.02.', '07.12.03.', '07.12.04.'];

            foreach ($bkuEntries as $bku) {
                // Usually expenses are in 'pengeluaran' or 'total_transaksi_kotor'
                // Assuming 'pengeluaran' exists or 'jumlah_keluar'. 
                // Spmth used 'total_transaksi_kotor'. Let's check if it's an expense or revenue.
                // Assuming if rekening_belanja_id is set, it IS an expense.
                
                $amount = $bku->pengeluaran ?? $bku->total_transaksi_kotor; 
                // Note: Check actual column name in BKU table migration if needed. 
                // migration 2026_01_17_000003_create_buku_kas_umums_table.php had 'pengeluaran' probably.
                // Assuming `pengeluaran` column. If null/0 check debit/credit.
                
                $kodeRekening = $bku->rekeningBelanja->kode_rekening ?? ''; 
                $kodeKegiatan = $bku->kodeKegiatan->kode ?? '';
                
                // Logic Classification
                
                // Check Belanja Pegawai based on Activity Code
                $isPegawai = false;
                foreach ($pegawaiPrefixes as $prefix) {
                    if (str_starts_with($kodeKegiatan, $prefix)) {
                        $isPegawai = true;
                        break;
                    }
                }

                if ($isPegawai) {
                    $p_pegawai += $amount;
                }
                // Check Belanja Modal based on Account Code (Strict 5.2)
                elseif (str_starts_with($kodeRekening, '5.2')) {
                    $p_modal += $amount;
                } 
                // Default to Barang Jasa
                else {
                    $p_barang += $amount;
                }
            }

            // 3. Sisa Kas & Bank (Balances)
            // Get the very last BKU record up to the end date of the period
            $lastBku = \App\Models\BukuKasUmum::where('penganggaran_id', $penganggaran->id)
                ->whereDate('tanggal_transaksi', '<=', $endDate)
                ->orderBy('tanggal_transaksi', 'desc')
                ->orderBy('created_at', 'desc')
                ->first();
                
            $sisaTunai = $lastBku ? ($lastBku->saldo_tunai ?? 0) : 0;
            $sisaBank = $lastBku ? ($lastBku->saldo_bank ?? 0) : 0;

            return response()->json([
                'tahap_satu' => $tahapSatu,
                'tahap_dua' => $tahapDua,
                'jenis_belanja_pegawai' => $p_pegawai,
                'jenis_belanja_barang_jasa' => $p_barang,
                'jenis_belanja_modal' => $p_modal,
                'sisa_kas_tunai' => $sisaTunai,
                'sisa_dana_di_bank' => $sisaBank,
                'penganggaran_id' => $penganggaran->id
            ]);

        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage() . ' Line: ' . $e->getLine()], 500);
        }
    }

    public function generatePdf($id)
    {
        $sptj = Sptj::with(['penganggaran'])->findOrFail($id);
        
        // Manual/Implicit relations if explicit ones are missing in model or needed deeper
        // Assuming penganggaran has attributes like kepala_sekolah, nip_kepala_sekolah
        // We need 'sekolah' info. Usually penganggaran belongs to Sekolah.
        // We can load it manually if relations aren't perfect, but let's try strict.
        $penganggaran = $sptj->penganggaran;
        $sekolah = \App\Models\SekolahProfile::find($penganggaran->sekolah_id); // Fallback if no relation on model

        $paperSize = request()->input('paper_size', 'A4');
        $fontSize = request()->input('font_size', '12pt');

        $data = [
            'sptj' => $sptj,
            'sekolah' => $sekolah,
            'kepala_sekolah' => (object) [
                'nama' => $penganggaran->kepala_sekolah,
                'nip' => $penganggaran->nip_kepala_sekolah
            ],
            'tanggal_cetak' => Carbon::parse($sptj->tanggal_sptj)->locale('id')->isoFormat('D MMMM Y'),
            'semester_text' => $sptj->tahap == '1' ? 'Semester I' : 'Semester II',
            'fontSize' => $fontSize,
        ];

        $pdf = Pdf::loadView('laporan.sptj_pdf', $data);

        if (strtolower($paperSize) === 'folio') {
            $pdf->setPaper([0, 0, 595.28, 935.43], 'portrait');
        } else {
            $pdf->setPaper($paperSize, 'portrait');
        }

        return $pdf->stream('sptj.pdf');
    }
}
