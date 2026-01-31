<?php

namespace App\Http\Controllers;

use App\Models\KodeKegiatan;
use Illuminate\Http\Request;
use Inertia\Inertia;

use Illuminate\Support\Facades\Storage;
use App\Imports\KodeKegiatanImport;
use Maatwebsite\Excel\Facades\Excel;

class KodeKegiatanController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        // Fetch all data for client-side search/pagination
        // This ensures instant feedback as requested by the user ("live search without loading")
        $kode_kegiatan = KodeKegiatan::orderBy('created_at', 'desc')->get();

        return Inertia::render('DataMaster/KodeKegiatan/Index', [
            'kode_kegiatan' => $kode_kegiatan,
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $request->validate([
            'kode' => 'required|string|unique:kode_kegiatans,kode',
            'program' => 'required|string',
            'sub_program' => 'required|string',
            'uraian' => 'required|string',
        ]);

        KodeKegiatan::create($request->all());

        return redirect()->back()->with('success', 'Kode Kegiatan berhasil ditambahkan.');
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id)
    {
        $kodeKegiatan = KodeKegiatan::findOrFail($id);

        $request->validate([
            'kode' => 'required|string|unique:kode_kegiatans,kode,' . $id,
            'program' => 'required|string',
            'sub_program' => 'required|string',
            'uraian' => 'required|string',
        ]);

        $kodeKegiatan->update($request->all());

        return redirect()->back()->with('success', 'Kode Kegiatan berhasil diperbarui.');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        $kodeKegiatan = KodeKegiatan::findOrFail($id);
        $kodeKegiatan->delete();

        return redirect()->back()->with('success', 'Kode Kegiatan berhasil dihapus.');
    }

    /**
     * Download Template
     */
    public function downloadTemplate()
    {
        $path = 'templates/template_kode_kegiatan.xlsx';
        if (Storage::disk('public')->exists($path)) {
            return Storage::disk('public')->download($path);
        }
        return redirect()->back()->with('error', 'File template tidak ditemukan.');
    }

    /**
     * Import Data
     */
    public function import(Request $request)
    {
        $request->validate([
            'file' => 'required|mimes:xlsx,xls'
        ]);

        $import = new KodeKegiatanImport;
        Excel::import($import, $request->file('file'));
        
        $count = $import->getRowCount();
        $duplicates = $import->getDuplicates();
        $failures = $import->failures();

        $message = "Berhasil mengimport {$count} data.";
        
        if (count($duplicates) > 0) {
            $message .= " Ditemukan " . count($duplicates) . " data duplikat (dilewati).";
        }
        
        if ($failures->count() > 0) {
             $message .= " Gagal mengimport " . $failures->count() . " baris karena validasi.";
        }

        return redirect()->back()->with('success', $message);
    }
}
