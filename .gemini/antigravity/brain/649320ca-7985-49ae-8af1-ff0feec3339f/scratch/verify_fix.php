<?php
use App\Models\PenerimaanDana;
use App\Models\Penganggaran;
use App\Http\Controllers\Sp2bController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

// Mock login
Auth::loginUsingId(1);

$request = new Request();
$request->replace(['tahun_anggaran' => 2025, 'tahap' => '1']);

$controller = app(Sp2bController::class);
$result = $controller->calculate($request)->getData();

print_r($result);
