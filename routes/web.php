<?php

use App\Http\Controllers\ProfileController;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\PenganggaranController;
use App\Http\Controllers\PenatausahaanController;
use App\Http\Controllers\StsController;
use App\Http\Controllers\SekolahProfileController;
use App\Http\Controllers\KodeKegiatanController;
use App\Http\Controllers\RekeningBelanjaController;
use App\Http\Controllers\KwitansiController;
use App\Http\Controllers\TandaTerimaController;
use App\Http\Controllers\DatabaseController;
use App\Http\Controllers\SpmthController;
use App\Http\Controllers\SptjController;
use App\Http\Controllers\Sp2bController;
use App\Http\Controllers\BukuKasUmumController;
use App\Http\Controllers\RekapitulasiController;
use App\Http\Controllers\RekapitulasiRealisasiController;
use App\Http\Controllers\RegistrasiPenutupanKasController;
use App\Http\Controllers\PenerimaanDanaController;
use App\Http\Controllers\RkasController;
use App\Http\Controllers\RkasPerubahanController;
use App\Http\Controllers\RkasSummaryController;
use App\Http\Controllers\BukuBankController;
use App\Http\Controllers\BukuKasPembantuTunaiController;
use App\Http\Controllers\BukuPajakController;
use App\Http\Controllers\BukuRobController;
use App\Http\Controllers\BeritaAcaraPenutupanController;
use App\Http\Controllers\LphController;
use App\Http\Controllers\ArkasToolController;
use App\Http\Controllers\ReferensiKodeController;
use App\Http\Controllers\ArkasSettingController;
use App\Http\Controllers\NotificationController;

/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
|
| Here is where you can register web routes for your application. These
| routes are loaded by the RouteServiceProvider within a group which
| contains the "web" middleware group. Now create something great!
|
*/

Route::get('/', function () {
    return Inertia::render('Welcome', [
        'canLogin' => Route::has('login'),
        'canRegister' => Route::has('register'),
        'hasUsers' => \App\Models\User::count() > 0,
        'laravelVersion' => Application::VERSION,
        'phpVersion' => PHP_VERSION,
    ]);
});

Route::view('/license-invalid', 'errors.license')->name('license.invalid');

Route::get('/dashboard', [DashboardController::class, 'index'])->middleware(['auth', 'verified'])->name('dashboard');
Route::get('/dashboard/data', [DashboardController::class, 'getDashboardNewData'])->middleware(['auth', 'verified'])->name('dashboard.data');

Route::middleware('auth')->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    // Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy'); // Replaced by Security
    Route::post('/profile/toggle-security', [ProfileController::class, 'toggleSecurity'])->name('profile.toggle-security');
    Route::post('/profile/generate-security-code', [ProfileController::class, 'generateSecurityCode'])->name('profile.generate-security-code');

    foreach (\App\Config\VariantConfig::VARIANTS as $variant) {
        if ($variant === 'reguler') {
            Route::middleware(["variant:$variant"])
                 ->group(base_path('routes/variant.php'));
        } else {
            $prefix = str_replace('_', '-', $variant);
            Route::middleware(["variant:$variant"])
                 ->prefix($prefix)
                 ->name("$prefix-")
                 ->group(base_path('routes/variant.php'));
        }
    }
});

require __DIR__.'/auth.php';
