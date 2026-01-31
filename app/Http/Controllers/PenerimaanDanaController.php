<?php

namespace App\Http\Controllers;

use App\Models\PenerimaanDana;
use App\Models\Penganggaran;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class PenerimaanDanaController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        //
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        //
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        Log::info('Store Request Data:', $request->all());

        $validationRules = [
            'penganggaran_id' => 'required|exists:penganggarans,id',
            'sumber_dana' => 'required|string|in:Bosp Reguler Tahap 1,Bosp Reguler Tahap 2',
            'tanggal_terima' => 'required|date',
            'jumlah_dana' => 'required|numeric'
        ];

        // Hanya validasi saldo_awal jika sumber dana adalah Tahap 1
        if ($request->sumber_dana === 'Bosp Reguler Tahap 1') {
            $validationRules['saldo_awal'] = 'nullable|numeric';
            $validationRules['tanggal_saldo_awal'] = 'nullable|date';
        }

        // Sanitize currency inputs before validation
        $request->merge([
            'jumlah_dana' => $request->jumlah_dana ? (float) str_replace(['Rp', '.', ',', ' '], '', $request->jumlah_dana) : null,
            'saldo_awal' => $request->has('saldo_awal') && $request->saldo_awal ? (float) str_replace(['Rp', '.', ',', ' '], '', $request->saldo_awal) : null,
        ]);

        $request->validate($validationRules);

        try {
            // Validasi tahun anggaran - pastikan sesuai dengan penganggaran_id
            $penganggaran = Penganggaran::find($request->penganggaran_id);
            if (!$penganggaran) {
                return response()->json([
                    'success' => false,
                    'message' => 'Data penganggaran tidak ditemukan'
                ], 422);
            }

            // Cek apakah sudah ada penerimaan dana untuk sumber dana ini
            $existingPenerimaan = PenerimaanDana::where('penganggaran_id', $request->penganggaran_id)
                ->where('sumber_dana', $request->sumber_dana)
                ->first();

            if ($existingPenerimaan) {
                return response()->json([
                    'success' => false,
                    'message' => 'Sumber dana ini sudah pernah ditambahkan'
                ], 422);
            }

            // Konversi format angka
            $data = $request->all();

            // Untuk BOSP Reguler Tahap 2, set saldo_awal menjadi null
            if ($request->sumber_dana === 'Bosp Reguler Tahap 2') {
                $data['saldo_awal'] = null;
            } else {
                // Untuk BOSP Reguler Tahap 1, proses saldo_awal jika diisi
                if ($request->has('saldo_awal') && $request->saldo_awal !== null && $request->saldo_awal !== '') {
                    $data['saldo_awal'] = (float) str_replace(['Rp', '.', ',', ' '], '', $request->saldo_awal);
                } else {
                    $data['saldo_awal'] = null;
                }
            }

            // Konversi jumlah_dana
            $data['jumlah_dana'] = (float) str_replace(['Rp', '.', ',', ' '], '', $request->jumlah_dana);

            PenerimaanDana::create($data);

            return redirect()->back()->with('success', 'Penerimaan dana berhasil disimpan');
        } catch (\Exception $e) {
            Log::error('Error storing penerimaan dana: ' . $e->getMessage());
            return redirect()->back()->with('error', 'Gagal menyimpan penerimaan dana: ' . $e->getMessage());
        }
    }

    /**
     * Display the specified resource.
     */
    public function show(PenerimaanDana $penerimaanDana)
    {
        //
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(PenerimaanDana $penerimaanDana)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, PenerimaanDana $penerimaanDana)
    {
        //
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy($id)
    {
        try {
            $penerimaanDana = PenerimaanDana::findOrFail($id);
            $penerimaanDana->delete();

            // Always redirect back for Inertia requests
            return redirect()->back()->with('success', 'Penerimaan Dana berhasil dihapus');
        } catch (\Exception $e) {
            Log::error('Error deleting penerimaan dana: ' . $e->getMessage());
            
            // Always redirect back with error for Inertia requests
            return redirect()->back()->with('error', 'Gagal menghapus penerimaan dana: ' . $e->getMessage());
        }
    }

    public function destroySaldoAwal($id)
    {
        try {
            $penerimaanDana = PenerimaanDana::findOrFail($id);
            $penerimaanDana->delete();

            // Always redirect back for Inertia requests
            return redirect()->back()->with('success', 'Penerimaan Dana berhasil dihapus');
        } catch (\Exception $e) {
            Log::error('Error deleting penerimaan dana: ' . $e->getMessage());
            
            // Always redirect back with error for Inertia requests
            return redirect()->back()->with('error', 'Gagal menghapus penerimaan dana: ' . $e->getMessage());
        }
    }

    /**
     * Get penerimaan dana by penganggaran ID
     */
    public function getByPenganggaran($penganggaran_id)
    {
        try {
            // Pastikan penganggaran_id adalah angka dan valid
            if (!is_numeric($penganggaran_id) || $penganggaran_id <= 0) {
                return response()->json([
                    'error' => 'Invalid penganggaran ID'
                ], 400);
            }

            $penerimaanDanas = PenerimaanDana::where('penganggaran_id', $penganggaran_id)
                ->orderBy('tanggal_terima', 'asc')
                ->get();

            return response()->json($penerimaanDanas);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to load data: ' . $e->getMessage()
            ], 500);
        }
    }
}
