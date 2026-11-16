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
            $sekolah->update([
                'kop_surat' => $path,
                'kop_jenis' => 'upload',
            ]);
        }

        return redirect()->back()->with('success', 'Kop Surat berhasil diupload.');
    }

    /**
     * Save Kop Surat from Builder (Tiptap + Logos + Generated Image)
     */
    public function saveBuilderKop(Request $request, string $id)
    {
        $request->validate([
            'generated_kop' => 'required|file|mimes:png,jpg,jpeg|max:10240',
            'logo_daerah' => 'nullable|file|mimes:png,jpg,jpeg,svg|max:4096',
            'logo_sekolah' => 'nullable|file|mimes:png,jpg,jpeg,svg|max:4096',
            'kop_mode' => 'required|in:1_logo,2_logo',
            'kop_border' => 'required|in:double,single,none',
            'kop_teks_html' => 'required|string',
        ]);

        $sekolah = SekolahProfile::findOrFail($id);

        $updateData = [
            'kop_mode' => $request->kop_mode,
            'kop_border' => $request->kop_border,
            'kop_teks_html' => $request->kop_teks_html,
            'kop_jenis' => 'builder',
        ];

        // 1. Handle Logo Daerah
        if ($request->hasFile('logo_daerah')) {
            if ($sekolah->logo_daerah && Storage::disk('public')->exists($sekolah->logo_daerah)) {
                Storage::disk('public')->delete($sekolah->logo_daerah);
            }
            $updateData['logo_daerah'] = $request->file('logo_daerah')->store('kop_surat', 'public');
        } elseif ($request->boolean('remove_logo_daerah')) {
            if ($sekolah->logo_daerah && Storage::disk('public')->exists($sekolah->logo_daerah)) {
                Storage::disk('public')->delete($sekolah->logo_daerah);
            }
            $updateData['logo_daerah'] = null;
        }

        // 2. Handle Logo Sekolah
        if ($request->hasFile('logo_sekolah')) {
            if ($sekolah->logo_sekolah && Storage::disk('public')->exists($sekolah->logo_sekolah)) {
                Storage::disk('public')->delete($sekolah->logo_sekolah);
            }
            $updateData['logo_sekolah'] = $request->file('logo_sekolah')->store('kop_surat', 'public');
        } elseif ($request->boolean('remove_logo_sekolah')) {
            if ($sekolah->logo_sekolah && Storage::disk('public')->exists($sekolah->logo_sekolah)) {
                Storage::disk('public')->delete($sekolah->logo_sekolah);
            }
            $updateData['logo_sekolah'] = null;
        }

        // 3. Handle Generated Kop (High-Res Merged PNG)
        if ($request->hasFile('generated_kop')) {
            if ($sekolah->kop_surat) {
                if (Storage::disk('public')->exists($sekolah->kop_surat)) {
                    Storage::disk('public')->delete($sekolah->kop_surat);
                }
                if (Storage::disk('local')->exists($sekolah->kop_surat)) {
                    Storage::disk('local')->delete($sekolah->kop_surat);
                }
            }
            $updateData['kop_surat'] = $request->file('generated_kop')->store('kop_surat', 'public');
        }

        // 4. Handle Kop Dokumen settings if provided
        if ($request->has('kop_dokumen')) {
            $kopDokumen = $request->input('kop_dokumen');
            if (is_string($kopDokumen)) {
                $kopDokumen = json_decode($kopDokumen, true);
            }
            if (is_array($kopDokumen)) {
                $updateData['kop_dokumen'] = $kopDokumen;
            }
        }

        $sekolah->update($updateData);

        return redirect()->back()->with('success', 'Kop Surat berhasil digenerate dan disimpan.');
    }

    /**
     * Update Kop Surat Document Selection Options
     */
    public function updateKopDokumen(Request $request, string $id)
    {
        $request->validate([
            'kop_dokumen' => 'nullable',
        ]);

        $sekolah = SekolahProfile::findOrFail($id);
        $kopDokumen = $request->input('kop_dokumen');
        if (is_string($kopDokumen)) {
            $kopDokumen = json_decode($kopDokumen, true);
        }

        $sekolah->update([
            'kop_dokumen' => is_array($kopDokumen) ? $kopDokumen : [],
        ]);

        if ($request->wantsJson() && ! $request->header('X-Inertia')) {
            return response()->json([
                'success' => true,
                'message' => 'Pengaturan penggunaan kop surat pada dokumen berhasil disimpan.',
                'kop_dokumen' => $sekolah->kop_dokumen,
            ]);
        }

        return redirect()->back()->with('success', 'Pengaturan penggunaan kop surat pada dokumen berhasil disimpan.');
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
