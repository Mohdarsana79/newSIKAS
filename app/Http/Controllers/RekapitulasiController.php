<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class RekapitulasiController extends Controller
{
    public function index(Request $request)
    {
        $tahun = $request->input('tahun');
        $bulan = $request->input('bulan');

        return \Inertia\Inertia::render('Penatausahaan/Rekapitulasi', [
            'tahun' => $tahun,
            'bulan' => $bulan,
        ]);
    }
}
