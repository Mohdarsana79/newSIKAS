<?php

namespace App\Http\Controllers\FiturPelengkap;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;

class LaporanController extends Controller
{
    public function index()
    {
        return Inertia::render('FiturPelengkap/Laporan/Index');
    }
}
