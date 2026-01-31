<?php

namespace App\Http\Controllers;

use App\Models\Penganggaran;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use App\Models\Rkas;
use App\Models\RkasPerubahan;

class PenganggaranController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $anggarans = Penganggaran::orderBy('tahun_anggaran', 'desc')->get();
        // $availableYears = Penganggaran::select('tahun_anggaran')->distinct()->orderBy('tahun_anggaran', 'desc')->pluck('tahun_anggaran');

        $items = collect();

        foreach ($anggarans as $anggaran) {
            // Check existence
            $hasPerubahan = RkasPerubahan::where('penganggaran_id', $anggaran->id)->exists();

            // 1. Add Regular Item
            $items->push([
                'id' => $anggaran->id,
                'title' => 'RKAS BOSP Reguler ' . $anggaran->tahun_anggaran,
                'pagu' => 'Rp ' . number_format($anggaran->pagu_anggaran, 0, ',', '.'),
                'status' => 'regular',
                'has_perubahan' => $hasPerubahan, // Flag to disable button / hide edit
                'tahun' => $anggaran->tahun_anggaran,
            ]);

            // 2. Add Perubahan Item if exists
            if ($hasPerubahan) {
                // For Perubahan, we might want to show the same Pagu or calculated one?
                // Usually Perubahan might have same Pagu unless changed.
                // Assuming same ID for routing to Penganggaran resource, but we need to route to Perubahan Index.
                // The frontend uses `route('rkas.index', item.id)`.
                // For Perubahan, likely `route('rkas-perubahan.index', item.id)`?
                // Effectively we pass the same penganggaran ID but distinguish by status type in frontend or routing?
                // The frontend `Index.tsx` links: `href={route('rkas.index', item.id)}`.
                // We'll need to update Frontend to handle different routes based on status.
                
                $items->push([
                    'id' => $anggaran->id, // Same ID, will use status to change route
                    'title' => 'RKAS Perubahan ' . $anggaran->tahun_anggaran,
                    'pagu' => 'Rp ' . number_format($anggaran->pagu_anggaran, 0, ',', '.'),
                    'status' => 'perubahan',
                    'has_perubahan' => true,
                    'tahun' => $anggaran->tahun_anggaran,
                ]);
            }
        }

        return Inertia::render('Penganggaran/Index', [
             'items' => $items,
             'anggarans' => $anggarans // passing raw data too if needed
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $request->validate([
            'pagu_anggaran' => 'required',
            'tahun_anggaran' => 'required|digits:4|integer|min:2000|max:' . (date('Y') + 5),
            'kepala_sekolah' => 'required|string|max:255',
            'sk_kepala_sekolah' => 'required|string|max:255',
            'bendahara' => 'required|string|max:255',
            'sk_bendahara' => 'required|string|max:255',
            'komite' => 'required|string|max:255',
            'nip_kepala_sekolah' => 'required|string|max:255',
            'nip_bendahara' => 'required|string|max:255',
            'tanggal_sk_kepala_sekolah' => 'required|date',
            'tanggal_sk_bendahara' => 'required|date',
        ]);

        // Format angka sebelum disimpan
        $pagu = preg_replace('/[^\d]/', '', $request->pagu_anggaran);

        Penganggaran::create([
            'pagu_anggaran' => $pagu,
            'tahun_anggaran' => $request->tahun_anggaran,
            'kepala_sekolah' => $request->kepala_sekolah,
            'sk_kepala_sekolah' => $request->sk_kepala_sekolah,
            'nip_kepala_sekolah' => $request->nip_kepala_sekolah,
            'bendahara' => $request->bendahara,
            'sk_bendahara' => $request->sk_bendahara,
            'nip_bendahara' => $request->nip_bendahara,
            'komite' => $request->komite,
            'tanggal_sk_kepala_sekolah' => $request->tanggal_sk_kepala_sekolah,
            'tanggal_sk_bendahara' => $request->tanggal_sk_bendahara,
            'sekolah_id' => \App\Models\SekolahProfile::first()->id ?? null,
        ]);

        return redirect()->back()->with('success', 'Data anggaran berhasil ditambahkan');
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, $id)
    {
        $request->validate([
            'pagu_anggaran' => 'required',
            'tahun_anggaran' => 'required|digits:4|integer|min:2000|max:' . (date('Y') + 5),
            'kepala_sekolah' => 'required|string|max:255',
            'sk_kepala_sekolah' => 'required|string|max:255',
            'bendahara' => 'required|string|max:255',
            'sk_bendahara' => 'required|string|max:255',
            'komite' => 'required|string|max:255',
            'nip_kepala_sekolah' => 'required|string|max:255',
            'nip_bendahara' => 'required|string|max:255',
            'tanggal_sk_kepala_sekolah' => 'required|date',
            'tanggal_sk_bendahara' => 'required|date',
        ]);

        $penganggaran = Penganggaran::findOrFail($id);

        // Format angka sebelum disimpan
        $pagu = preg_replace('/[^\d]/', '', $request->pagu_anggaran);

        $penganggaran->update([
            'pagu_anggaran' => $pagu,
            'tahun_anggaran' => $request->tahun_anggaran,
            'kepala_sekolah' => $request->kepala_sekolah,
            'sk_kepala_sekolah' => $request->sk_kepala_sekolah,
            'nip_kepala_sekolah' => $request->nip_kepala_sekolah,
            'bendahara' => $request->bendahara,
            'sk_bendahara' => $request->sk_bendahara,
            'nip_bendahara' => $request->nip_bendahara,
            'komite' => $request->komite,
            'tanggal_sk_kepala_sekolah' => $request->tanggal_sk_kepala_sekolah,
            'tanggal_sk_bendahara' => $request->tanggal_sk_bendahara,
        ]);

        return redirect()->back()->with('success', 'Data anggaran berhasil diperbarui');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy($id)
    {
        $penganggaran = Penganggaran::findOrFail($id);
        $penganggaran->delete();

        return redirect()->back()->with('success', 'Data anggaran berhasil dihapus');
    }

    public function updateTanggalCetak(Request $request, $id)
    {
        $request->validate([
            'tanggal_cetak' => 'required|date',
        ]);

        $penganggaran = Penganggaran::findOrFail($id);
        $penganggaran->update([
            'tanggal_cetak' => $request->tanggal_cetak
        ]);

        return redirect()->back()->with('success', 'Tanggal cetak berhasil diperbarui');
    }

    public function updateTanggalPerubahan(Request $request, $id)
    {
        $request->validate([
            'tanggal_perubahan' => 'required|date',
        ]);

        $penganggaran = Penganggaran::findOrFail($id);
        $penganggaran->update([
            'tanggal_perubahan' => $request->tanggal_perubahan
        ]);

        return redirect()->back()->with('success', 'Tanggal perubahan berhasil diperbarui');
    }
}
