<?php

namespace App\Http\Controllers;

use App\Models\PenarikanTunai;
use App\Models\SetorTunai;
use App\Models\Penganggaran;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class PenarikanTunaiController extends Controller
{
    public function store(Request $request)
    {
        // Sanitize input before validation
        if ($request->has('jumlah_penarikan')) {
            $cleanedamount = (float) str_replace(['Rp', '.', ',', ' '], '', $request->jumlah_penarikan);
            $request->merge(['jumlah_penarikan' => $cleanedamount]);
        }

        $request->validate([
            'penganggaran_id' => 'required|exists:penganggarans,id',
            'tanggal_penarikan' => 'required|date',
            'jumlah_penarikan' => 'required|numeric|min:1'
        ]);

        try {
            // Check funds availability


            // Cek apakah dana tersedia cukup
            $totalDanaTersedia = $this->hitungTotalDanaTersedia($request->penganggaran_id);

            if ($request->jumlah_penarikan > $totalDanaTersedia) {
                return redirect()->back()->withErrors(['jumlah_penarikan' => 'Saldo tidak mencukupi untuk penarikan ini']);
            }

            PenarikanTunai::create([
                'penganggaran_id' => $request->penganggaran_id,
                'tanggal_penarikan' => $request->tanggal_penarikan,
                'jumlah_penarikan' => $request->jumlah_penarikan,
            ]);

            return redirect()->back()->with('success', 'Penarikan tunai berhasil disimpan');
        } catch (\Exception $e) {
            Log::error('Error storing penarikan tunai: ' . $e->getMessage());
            return redirect()->back()->with('error', 'Gagal menyimpan penarikan tunai: ' . $e->getMessage());
        }
    }

    public function destroy($id)
    {
        try {
            $penarikan = PenarikanTunai::findOrFail($id);
            $penarikan->delete();

            return redirect()->back()->with('success', 'Penarikan berhasil dihapus');
        } catch (\Exception $e) {
            Log::error('Error deleting penarikan tunai: ' . $e->getMessage());
            return redirect()->back()->with('error', 'Gagal menghapus penarikan: ' . $e->getMessage());
        }
    }

    private function hitungTotalDanaTersedia($penganggaran_id)
    {
        $penerimaanDanas = \App\Models\PenerimaanDana::where('penganggaran_id', $penganggaran_id)->get();

        $totalDana = 0;
        foreach ($penerimaanDanas as $penerimaan) {
            if ($penerimaan->sumber_dana === 'Bosp Reguler Tahap 1' && $penerimaan->saldo_awal) {
                $totalDana += $penerimaan->saldo_awal;
            }
            $totalDana += $penerimaan->jumlah_dana;
        }

        // Kurangi dengan total penarikan yang sudah dilakukan
        $totalPenarikan = PenarikanTunai::where('penganggaran_id', $penganggaran_id)->sum('jumlah_penarikan');
        $totalSetor = SetorTunai::where('penganggaran_id', $penganggaran_id)->sum('jumlah_setor');

        return $totalDana - $totalPenarikan + $totalSetor;
    }
}
