<?php

namespace App\Http\Controllers;

use App\Models\SekolahProfile;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\Storage;

class SekolahProfileController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        // Get the single profile
        $sekolah = SekolahProfile::first();
        return Inertia::render('DataMaster/SekolahProfile/Index', [
            'sekolah' => $sekolah
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        // Validate
        $request->validate([
            'nama_sekolah' => 'required|string|max:255',
            'npsn' => 'required|string|max:20', // Removed unique here if logic is singleton check, but model has unique.
            'status_sekolah' => 'required|string',
            'jenjang_sekolah' => 'required|string',
            'kelurahan_desa' => 'required|string',
            'kecamatan' => 'required|string',
            'kabupaten_kota' => 'required|string',
            'provinsi' => 'required|string',
            'alamat' => 'required|string',
        ]);

        // Create
        SekolahProfile::create($request->all());

        return redirect()->back()->with('success', 'Data Sekolah berhasil disimpan.');
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id)
    {
        $sekolah = SekolahProfile::findOrFail($id);
        
        $request->validate([
            'nama_sekolah' => 'required|string|max:255',
            'npsn' => 'required|string|max:20|unique:sekolahs,npsn,'.$id,
            'status_sekolah' => 'required|string',
            'jenjang_sekolah' => 'required|string',
            'kelurahan_desa' => 'required|string',
            'kecamatan' => 'required|string',
            'kabupaten_kota' => 'required|string',
            'provinsi' => 'required|string',
            'alamat' => 'required|string',
        ]);

        $sekolah->update($request->all());

        return redirect()->back()->with('success', 'Data Sekolah berhasil diperbarui.');
    }

    /**
     * Upload Kop Surat
     */
    public function uploadKop(Request $request, string $id)
    {
        $request->validate([
            'kop_surat' => 'required|image|mimes:jpeg,png,jpg,gif|max:2048',
        ]);

        $sekolah = SekolahProfile::findOrFail($id);

        if ($request->hasFile('kop_surat')) {
            // Delete old if exists
            if ($sekolah->kop_surat) {
                // Try to delete from public disk primarily
                if (Storage::disk('public')->exists($sekolah->kop_surat)) {
                     Storage::disk('public')->delete($sekolah->kop_surat);
                }
                // Fallback cleanup for old incorrect private paths (optional, but good practice)
                if (Storage::disk('local')->exists($sekolah->kop_surat)) {
                    Storage::disk('local')->delete($sekolah->kop_surat);
                }
            }

            // Store in 'public' disk (storage/app/public/kop_surat)
            $path = $request->file('kop_surat')->store('kop_surat', 'public');
            $sekolah->update(['kop_surat' => $path]);
        }

        return redirect()->back()->with('success', 'Kop Surat berhasil diupload.');
    }

      /**
     * Delete Kop Surat
     */
    public function destroyKop(string $id)
    {
        $sekolah = SekolahProfile::findOrFail($id);
        if ($sekolah->kop_surat) {
            if (Storage::disk('public')->exists($sekolah->kop_surat)) {
                 Storage::disk('public')->delete($sekolah->kop_surat);
            }
             // Fallback for old private paths
             if (Storage::disk('local')->exists($sekolah->kop_surat)) {
                 Storage::disk('local')->delete($sekolah->kop_surat);
             }
            $sekolah->update(['kop_surat' => null]);
        }
        return redirect()->back()->with('success', 'Kop Surat berhasil dihapus.');
    }
}
