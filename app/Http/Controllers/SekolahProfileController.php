<?php

namespace App\Http\Controllers;

use App\Models\Penganggaran;
use App\Models\SekolahProfile;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class SekolahProfileController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        // Get the single profile
        $sekolah = SekolahProfile::first();
        $licensedNpsn = (string) env('APP_NPSN_CODE');

        return Inertia::render('DataMaster/SekolahProfile/Index', [
            'sekolah' => $sekolah,
            'licensedNpsn' => $licensedNpsn,
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $licensedNpsn = (string) env('APP_NPSN_CODE');

        // Validate
        $request->validate([
            'nama_sekolah' => 'required|string|max:255',
            'npsn' => ['required', 'string', 'max:20', Rule::in([$licensedNpsn])],
            'status_sekolah' => 'required|string',
            'jenjang_sekolah' => 'required|string',
            'kelurahan_desa' => 'required|string',
            'kecamatan' => 'required|string',
            'kabupaten_kota' => 'required|string',
            'provinsi' => 'required|string',
            'alamat' => 'required|string',
        ], [
            'npsn.in' => 'NPSN harus sesuai dengan lisensi resmi aplikasi yang terdaftar.',
        ]);

        // Create
        $sekolah = SekolahProfile::create($request->all());

        // Fill missing foreign keys for penganggarans
        Penganggaran::whereNull('sekolah_id')->update(['sekolah_id' => $sekolah->id]);

        return redirect()->back()->with('success', 'Data Sekolah berhasil disimpan.');
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id)
    {
        $sekolah = SekolahProfile::findOrFail($id);
        $licensedNpsn = (string) env('APP_NPSN_CODE');

        $request->validate([
            'nama_sekolah' => 'required|string|max:255',
            'npsn' => ['required', 'string', 'max:20', Rule::in([$licensedNpsn]), 'unique:sekolahs,npsn,'.$id],
            'status_sekolah' => 'required|string',
            'jenjang_sekolah' => 'required|string',
            'kelurahan_desa' => 'required|string',
            'kecamatan' => 'required|string',
            'kabupaten_kota' => 'required|string',
            'provinsi' => 'required|string',
            'alamat' => 'required|string',
        ], [
            'npsn.in' => 'NPSN harus sesuai dengan lisensi resmi aplikasi yang terdaftar.',
        ]);

        $sekolah->update($request->all());

        // Also fix any penganggarans that might have null sekola_id
        Penganggaran::whereNull('sekolah_id')->update(['sekolah_id' => $sekolah->id]);

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
