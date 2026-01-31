<?php

namespace App\Http\Controllers;

use App\Models\SetorTunai;
use App\Models\Penganggaran;
use App\Models\PenarikanTunai;
use App\Models\BukuKasUmum;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;

class SetorTunaiController extends Controller
{
    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        Log::info('=== SETOR TUNAI REQUEST ===', $request->all());
        
        // Sanitize input before validation
        if ($request->has('jumlah_setor')) {
            $cleanedamount = (float) str_replace(['Rp', '.', ',', ' '], '', $request->jumlah_setor);
            $request->merge(['jumlah_setor' => $cleanedamount]);
        }
        
        // Validasi sederhana
        $request->validate([
            'penganggaran_id' => 'required|exists:penganggarans,id',
            'tanggal_setor' => 'required|date',
            'jumlah_setor' => 'required|numeric|min:1'
        ]);

        try {
            // Hitung saldo tunai
            
            // Hitung saldo tunai
            $saldoTunai = $this->hitungSaldoTunai($request->penganggaran_id);
            
            // Validasi saldo
            if ($request->jumlah_setor > $saldoTunai) {
                return redirect()->back()->withErrors(['jumlah_setor' => 'Jumlah melebihi saldo tunai yang tersedia (Rp ' . number_format($saldoTunai, 0, ',', '.') . ')']);
            }

            // Simpan data
            $setorTunai = SetorTunai::create([
                'penganggaran_id' => $request->penganggaran_id,
                'tanggal_setor' => $request->tanggal_setor,
                'jumlah_setor' => $request->jumlah_setor,
            ]);

            return redirect()->back()->with('success', 'Setor tunai berhasil disimpan');
            
        } catch (\Exception $e) {
            Log::error('Error store setor tunai: ' . $e->getMessage());
            Log::error('Stack trace: ' . $e->getTraceAsString());
            
            return redirect()->back()->with('error', 'Gagal menyimpan setor tunai: ' . $e->getMessage());
        }
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy($id)
    {
        try {
            $setorTunai = SetorTunai::findOrFail($id);
            $setorTunai->delete();

            // Redirect untuk request biasa
            return redirect()->back()->with('success', 'Setor berhasil dihapus');
            
        } catch (\Exception $e) {
            Log::error('Error delete setor tunai: ' . $e->getMessage());

            return redirect()->back()->with('error', 'Gagal menghapus setor: ' . $e->getMessage());
        }
    }

    /**
     * API untuk mendapatkan saldo tunai
     */
    public function getSaldoTunai($penganggaran_id)
    {
        try {
            Log::info('Get saldo tunai for penganggaran: ' . $penganggaran_id);
            
            $saldoTunai = $this->hitungSaldoTunai($penganggaran_id);
            
            return response()->json([
                'success' => true,
                'saldo_tunai' => $saldoTunai,
                'formatted_saldo' => 'Rp ' . number_format($saldoTunai, 0, ',', '.')
            ]);
            
        } catch (\Exception $e) {
            Log::error('Error get saldo tunai: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Error: ' . $e->getMessage(),
                'saldo_tunai' => 0
            ], 500);
        }
    }

    /**
     * Hitung saldo tunai
     */
    private function hitungSaldoTunai($penganggaran_id)
    {
        try {
            // Query langsung tanpa model untuk debugging
            $totalPenarikan = DB::table('penarikan_tunais')
                ->where('penganggaran_id', $penganggaran_id)
                ->sum('jumlah_penarikan');
            
            $totalSetor = DB::table('setor_tunais')
                ->where('penganggaran_id', $penganggaran_id)
                ->sum('jumlah_setor');
            
            $totalBelanjaTunai = DB::table('buku_kas_umums')
                ->where('penganggaran_id', $penganggaran_id)
                ->where('jenis_transaksi', 'tunai')
                ->where('is_bunga_record', false)
                ->sum('total_transaksi_kotor');
            
            $saldoTunai = $totalPenarikan - $totalSetor - $totalBelanjaTunai;
            
            Log::info('Perhitungan saldo tunai:', [
                'penganggaran_id' => $penganggaran_id,
                'total_penarikan' => $totalPenarikan,
                'total_setor' => $totalSetor,
                'total_belanja_tunai' => $totalBelanjaTunai,
                'saldo_tunai' => $saldoTunai
            ]);
            
            return max(0, $saldoTunai);
            
        } catch (\Exception $e) {
            Log::error('Error hitung saldo tunai: ' . $e->getMessage());
            return 0;
        }
    }
}
