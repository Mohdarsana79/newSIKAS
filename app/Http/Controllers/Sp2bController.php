<?php

namespace App\Http\Controllers;

use App\Models\Sp2b;
use App\Models\Penganggaran;
use App\Models\BukuKasUmum;
use App\Models\PenerimaanDana;
use Illuminate\Http\Request;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class Sp2bController extends Controller
{
    public function index(Request $request)
    {
        $query = Sp2b::with(['penganggaran']);

        if ($request->has('search')) {
            $search = $request->search;
            $query->where('nomor_sp2b', 'like', "%{$search}%");
        }

        $perPage = $request->input('per_page', 10);
        return response()->json($query->latest()->paginate($perPage));
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'penganggaran_id' => 'required|exists:penganggarans,id',
            'nomor_sp2b' => 'required|string|unique:sp2bs,nomor_sp2b',
            'tanggal_sp2b' => 'required|date',
            'tahap' => 'required|in:1,2',
            'saldo_awal' => 'required|numeric',
            'pendapatan' => 'required|numeric',
            'belanja' => 'required|numeric',
            'belanja_pegawai' => 'required|numeric',
            'belanja_barang_jasa' => 'required|numeric',
            'belanja_modal' => 'required|numeric',
            'belanja_modal_peralatan_mesin' => 'required|numeric',
            'belanja_modal_aset_tetap_lainnya' => 'required|numeric',
            'belanja_modal_tanah_bangunan' => 'required|numeric',
            'saldo_akhir' => 'required|numeric',
        ]);

        Sp2b::create($validated);

        return response()->json(['success' => true]);
    }

    public function update(Request $request, $id)
    {
        $sp2b = Sp2b::findOrFail($id);
        
        $validated = $request->validate([
            'penganggaran_id' => 'required|exists:penganggarans,id',
            'nomor_sp2b' => 'required|string|unique:sp2bs,nomor_sp2b,' . $id,
            'tanggal_sp2b' => 'required|date',
            'tahap' => 'required|in:1,2',
            'saldo_awal' => 'required|numeric',
            'pendapatan' => 'required|numeric',
            'belanja' => 'required|numeric',
            'belanja_pegawai' => 'required|numeric',
            'belanja_barang_jasa' => 'required|numeric',
            'belanja_modal' => 'required|numeric',
            'belanja_modal_peralatan_mesin' => 'required|numeric',
            'belanja_modal_aset_tetap_lainnya' => 'required|numeric',
            'belanja_modal_tanah_bangunan' => 'required|numeric',
            'saldo_akhir' => 'required|numeric',
        ]);

        $sp2b->update($validated);

        return response()->json(['success' => true]);
    }

    public function destroy($id)
    {
        Sp2b::findOrFail($id)->delete();
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
            $tahap = $request->tahap;
            $sekolahId = auth()->user()->sekolah_id ?? 1;

            $penganggaran = Penganggaran::where('sekolah_id', $sekolahId)
                ->where('tahun_anggaran', $tahun)
                ->first();

            if (!$penganggaran) {
                return response()->json(['error' => "Data Penganggaran tidak ditemukan untuk tahun $tahun"], 404);
            }

            // Define dates based on Tahap
            $startDate = $tahap == '1' ? "$tahun-01-01" : "$tahun-07-01";
            $endDate = $tahap == '1' ? "$tahun-06-30" : "$tahun-12-31";

            // Saldo Awal logic
            $bukuKasService = app(\App\Services\BukuKasService::class);
            $startMonth = $tahap == '1' ? 1 : 7;
            
            // Getting previous balance
            $sisaTunaiSebelum = $bukuKasService->hitungSaldoTunaiSebelumBulan($penganggaran->id, $startMonth);
            $sisaBankSebelum = $bukuKasService->hitungSaldoBankSebelumBulan($penganggaran->id, $startMonth);
            $saldoAwal = $sisaTunaiSebelum + $sisaBankSebelum;

            // Tambahkan Saldo Awal (Luncuran) jika Tahap 1
            if ($tahap == '1') {
                $penerimaanAwal = PenerimaanDana::where('penganggaran_id', $penganggaran->id)
                    ->where('sumber_dana', 'Bosp Reguler Tahap 1')
                    ->first();
                if ($penerimaanAwal && $penerimaanAwal->saldo_awal) {
                    $saldoAwal += $penerimaanAwal->saldo_awal;
                }
            }

            // Pendapatan during this Tahap
            // To be safe, we use PenerimaanDana matching the tahap.
            $pendapatan = PenerimaanDana::where('penganggaran_id', $penganggaran->id)
                ->where(function($q) use ($tahap) {
                    if ($tahap == '1') {
                        $q->where('sumber_dana', 'like', '%Tahap 1%')->orWhere('sumber_dana', 'like', '%Tahap I%');
                    } else {
                        $q->where('sumber_dana', 'like', '%Tahap 2%')->orWhere('sumber_dana', 'like', '%Tahap II%');
                    }
                })->sum('jumlah_dana');

            // Pengeluaran
            $bkuExpenses = BukuKasUmum::where('penganggaran_id', $penganggaran->id)
                ->whereDate('tanggal_transaksi', '>=', $startDate)
                ->whereDate('tanggal_transaksi', '<=', $endDate)
                ->whereNotNull('rekening_belanja_id')
                ->with(['rekeningBelanja', 'kodeKegiatan'])
                ->get();

            $b_pegawai = 0;
            $b_barang = 0;
            $b_modal = 0;
            $bm_peralatan = 0;
            $bm_aset = 0;
            $bm_tanah = 0;

            foreach ($bkuExpenses as $bku) {
                $amount = $bku->pengeluaran ?? $bku->total_transaksi_kotor;
                $kode = $bku->rekeningBelanja->kode_rekening ?? '';
                $kodeKeg = $bku->kodeKegiatan->kode ?? '';

                if (str_starts_with(trim($kodeKeg), '07.12')) {
                    $b_pegawai += $amount;
                } elseif (str_starts_with($kode, '5.1.02.')) {
                    $b_barang += $amount;
                } elseif (str_starts_with($kode, '5.2')) {
                    $b_modal += $amount;
                    if (str_starts_with($kode, '5.2.02')) {
                        $bm_peralatan += $amount;
                    } elseif (str_starts_with($kode, '5.2.04')) {
                        $bm_aset += $amount;
                    } elseif (str_starts_with($kode, '5.2.05')) {
                        $bm_tanah += $amount;
                    }
                }
            }

            $totalBelanja = $b_pegawai + $b_barang + $b_modal;
            $saldoAkhir = $saldoAwal + $pendapatan - $totalBelanja;

            return response()->json([
                'saldo_awal' => $saldoAwal,
                'pendapatan' => $pendapatan,
                'belanja' => $totalBelanja,
                'belanja_pegawai' => $b_pegawai,
                'belanja_barang_jasa' => $b_barang,
                'belanja_modal' => $b_modal,
                'belanja_modal_peralatan_mesin' => $bm_peralatan,
                'belanja_modal_aset_tetap_lainnya' => $bm_aset,
                'belanja_modal_tanah_bangunan' => $bm_tanah,
                'saldo_akhir' => $saldoAkhir,
                'penganggaran_id' => $penganggaran->id
            ]);

        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage() . ' Line: ' . $e->getLine()], 500);
        }
    }

    public function generatePdf($id)
    {
        $sp2b = Sp2b::with(['penganggaran'])->findOrFail($id);
        $penganggaran = $sp2b->penganggaran;
        $sekolah = \App\Models\SekolahProfile::find($penganggaran->sekolah_id);

        $paperSize = request()->input('paper_size', 'A4');
        $fontSize = request()->input('font_size', '12pt');
        
        // Ensure month translation works
        $semester_text = $sp2b->tahap == '1' ? 'Januari s.d Juni' : 'Juli s.d Desember';

        $data = [
            'sp2b' => $sp2b,
            'sekolah' => $sekolah,
            'penganggaran' => $penganggaran,
            'kepala_sekolah' => (object) [
                'nama' => $penganggaran->kepala_sekolah,
                'nip' => $penganggaran->nip_kepala_sekolah
            ],
            'tanggal_cetak' => Carbon::parse($sp2b->tanggal_sp2b)->locale('id')->isoFormat('D MMMM Y'),
            'periode_text' => $semester_text . ' Tahun Anggaran ' . $penganggaran->tahun_anggaran,
            'fontSize' => $fontSize,
        ];

        $pdf = Pdf::loadView('laporan.sp2b_pdf', $data);

        if (strtolower($paperSize) === 'folio') {
            $pdf->setPaper([0, 0, 595.28, 935.43], 'portrait');
        } else {
            $pdf->setPaper($paperSize, 'portrait');
        }

        return $pdf->stream('sp2b.pdf');
    }
}
