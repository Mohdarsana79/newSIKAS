<?php

namespace App\Http\Controllers;

use App\Models\RekeningBelanja;
use Illuminate\Http\Request;
use Inertia\Inertia;

use Illuminate\Support\Facades\Storage;
use App\Imports\RekeningBelanjaImport;
use Maatwebsite\Excel\Facades\Excel;

class RekeningBelanjaController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        // Fetch all data for client-side search/pagination
        $rekening_belanja = RekeningBelanja::orderBy('created_at', 'desc')->get();

        return Inertia::render('DataMaster/RekeningBelanja/Index', [
            'rekening_belanja' => $rekening_belanja,
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $request->validate([
            'kode_rekening' => 'required|string|unique:rekening_belanjas,kode_rekening',
            'rincian_objek' => 'required|string',
            'kategori' => 'required|string',
        ]);

        RekeningBelanja::create($request->all());

        return redirect()->back()->with('success', 'Rekening Belanja berhasil ditambahkan.');
    }
    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id)
    {
        $rekeningBelanja = RekeningBelanja::findOrFail($id);

        $request->validate([
            'kode_rekening' => 'required|string|unique:rekening_belanjas,kode_rekening,' . $id,
            'rincian_objek' => 'required|string',
            'kategori' => 'required|string',
        ]);

        $rekeningBelanja->update($request->all());

        return redirect()->back()->with('success', 'Rekening Belanja berhasil diperbarui.');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        $rekeningBelanja = RekeningBelanja::findOrFail($id);
        $rekeningBelanja->delete();

        return redirect()->back()->with('success', 'Rekening Belanja berhasil dihapus.');
    }

    /**
     * Download Template
     */
    public function downloadTemplate()
    {
        $path = 'templates/template_rekening_belanja.xlsx';
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

        $import = new RekeningBelanjaImport;
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
