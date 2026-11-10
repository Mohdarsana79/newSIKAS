<?php

use App\Config\VariantConfig;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\SkSuratController;
use App\Http\Controllers\UserManagementController;
use App\Models\User;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

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
        'hasUsers' => User::count() > 0,
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
    Route::post('/profile/deepseek-settings', [ProfileController::class, 'updateDeepSeekSettings'])->name('profile.deepseek-settings');
    Route::post('/profile/deepseek-test', [ProfileController::class, 'testDeepSeekConnection'])->name('profile.deepseek-test');

    Route::middleware(['role:bendahara'])->group(function () {
        Route::get('/user-management', [UserManagementController::class, 'index'])->name('user-management.index');
        Route::post('/user-management', [UserManagementController::class, 'store'])->name('user-management.store');
        Route::put('/user-management/{id}', [UserManagementController::class, 'update'])->name('user-management.update');
        Route::delete('/user-management/{id}', [UserManagementController::class, 'destroy'])->name('user-management.destroy');
    });

    Route::prefix('sk-surat')->name('sk-surat.')->group(function () {
        Route::get('/', [SkSuratController::class, 'index'])->name('index');
        Route::post('/folder', [SkSuratController::class, 'storeFolder'])->name('folder.store');
        Route::put('/folder/{folder}', [SkSuratController::class, 'updateFolder'])->name('folder.update');
        Route::delete('/folder/{folder}', [SkSuratController::class, 'destroyFolder'])->name('folder.destroy');
        Route::get('/folder/{folder}', [SkSuratController::class, 'show'])->name('show');
        Route::post('/folder/{folder}/template', [SkSuratController::class, 'storeTemplate'])->name('template.store');
        Route::delete('/template/{template}', [SkSuratController::class, 'destroyTemplate'])->name('template.destroy');
        Route::post('/folder/{folder}/dokumen', [SkSuratController::class, 'storeDokumen'])->name('dokumen.store');
        Route::put('/dokumen/{dokumen}', [SkSuratController::class, 'updateDokumen'])->name('dokumen.update');
        Route::post('/folder/{folder}/upload-arsip', [SkSuratController::class, 'uploadArsip'])->name('dokumen.upload-arsip');
        Route::delete('/dokumen/{dokumen}', [SkSuratController::class, 'destroyDokumen'])->name('dokumen.destroy');
        Route::get('/dokumen/{dokumen}/download-docx', [SkSuratController::class, 'downloadDocx'])->name('dokumen.download-docx');
        Route::get('/dokumen/{dokumen}/export-pdf', [SkSuratController::class, 'exportPdf'])->name('dokumen.export-pdf');
        Route::get('/dokumen/{dokumen}/download-archive', [SkSuratController::class, 'downloadArchive'])->name('dokumen.download-archive');
    });

    foreach (VariantConfig::VARIANTS as $variant) {
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
