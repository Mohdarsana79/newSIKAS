<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class DokumenController extends Controller
{
    public function index()
    {
        $penganggarans = \App\Models\Penganggaran::select('id', 'tahun_anggaran')->get();
        return \Inertia\Inertia::render('Penatausahaan/Dokumen/Index', [
            'penganggarans' => $penganggarans
        ]);
    }

    public function getData(Request $request)
    {
        $request->validate([
            'penganggaran_id' => 'required',
            'bulan' => 'required|integer|min:1|max:12',
        ]);

        $query = \App\Models\BukuKasUmum::query()
            ->with(['dokumen'])
            ->where('penganggaran_id', $request->penganggaran_id)
            ->whereMonth('tanggal_transaksi', $request->bulan)
            ->whereNotNull('uraian')
            ->where('uraian', '!=', '');

        if ($request->search) {
            $search = strtolower($request->search);
            $query->where(function($q) use ($search) {
                $q->whereHas('dokumen', function($subQ) use ($search) {
                    $subQ->whereRaw('LOWER(nama_dokumen) LIKE ?', ['%' . $search . '%']);
                })->orWhereRaw('LOWER(uraian) LIKE ?', ['%' . $search . '%']);
            });
        }

        $bkus = $query->latest('tanggal_transaksi')->paginate(10);

        return response()->json($bkus);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'penganggaran_id' => 'required|exists:penganggarans,id',
            'buku_kas_umum_id' => 'required|exists:buku_kas_umums,id',
            'nama_dokumen' => 'required|string|max:255',
            'link_drive' => 'required|url',
        ]);

        \App\Models\Dokumen::create($validated);

        return redirect()->back()->with('success', 'Dokumen berhasil ditambahkan');
    }

    public function destroy($id)
    {
        $dokumen = \App\Models\Dokumen::findOrFail($id);
        $dokumen->delete();

        return redirect()->back()->with('success', 'Dokumen berhasil dihapus');
    }
}
