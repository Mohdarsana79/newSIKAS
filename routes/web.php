<?php

use App\Config\VariantConfig;
use App\Http\Controllers\ActivityLogController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\DatabaseController;
use App\Http\Controllers\NetworkSettingController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\PublicTransparansiController;
use App\Http\Controllers\RoleManagementController;
use App\Http\Controllers\SkSuratController;
use App\Http\Controllers\SystemUpdateController;
use App\Http\Controllers\UserManagementController;
use App\Http\Middleware\CheckNpsnLicense;
use App\Http\Middleware\EnforceModulePermissions;
use App\Http\Middleware\HandleInertiaRequests;
use App\Http\Middleware\RecordUserActivity;
use App\Models\User;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Http\Middleware\PreventRequestForgery;
use Illuminate\Foundation\Http\Middleware\ValidateCsrfToken;
use Illuminate\Session\Middleware\StartSession;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Schema;
use Illuminate\View\Middleware\ShareErrorsFromSession;
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
    $hasUsers = false;
    try {
        if (Schema::hasTable('users')) {
            $hasUsers = User::count() > 0;
        }
    } catch (Throwable) {
        $hasUsers = false;
    }

    return Inertia::render('Welcome', [
        'canLogin' => Route::has('login'),
        'canRegister' => Route::has('register'),
        'hasUsers' => $hasUsers,
        'laravelVersion' => Application::VERSION,
        'phpVersion' => PHP_VERSION,
    ]);
});

// Portal Transparansi BOSP Publik (dapat diakses masyarakat tanpa login)
Route::get('/transparansi', [PublicTransparansiController::class, 'index'])
    ->name('transparansi.index');

Route::middleware('throttle:60,1')
    ->prefix('api/public/transparansi')
    ->name('api.public.transparansi.')
    ->group(function () {
        Route::get('/data', [PublicTransparansiController::class, 'data'])->name('data');
        Route::get('/rka-tahapan', [PublicTransparansiController::class, 'rkaTahapan'])->name('rka-tahapan');
    });

Route::view('/license-invalid', 'errors.license')->name('license.invalid');

// Endpoint pelacakan progres restore (bebas session/DB middleware agar tetap aktif saat public schema di-drop & dipulihkan)
Route::get('/backup/restore-progress/{restoreId}', [DatabaseController::class, 'restoreProgress'])
    ->withoutMiddleware([
        StartSession::class,
        ShareErrorsFromSession::class,
        ValidateCsrfToken::class,
        PreventRequestForgery::class,
        HandleInertiaRequests::class,
        CheckNpsnLicense::class,
        RecordUserActivity::class,
        EnforceModulePermissions::class,
    ])
    ->name('backup.restore-progress');

// Endpoint pelacakan progres pembaharuan aplikasi (bebas session/DB middleware agar merespons cepat saat server restart)
Route::get('/pembaharuan/progress/{updateId}', [SystemUpdateController::class, 'progress'])
    ->withoutMiddleware([
        StartSession::class,
        ShareErrorsFromSession::class,
        ValidateCsrfToken::class,
        PreventRequestForgery::class,
        HandleInertiaRequests::class,
        CheckNpsnLicense::class,
        RecordUserActivity::class,
        EnforceModulePermissions::class,
    ])
    ->name('system-update.progress');

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

    Route::prefix('api/notifications')->name('api.notifications.')->group(function () {
        Route::get('/unified', [NotificationController::class, 'getUnifiedNotifications'])->name('unified');
        Route::post('/read', [NotificationController::class, 'markAsRead'])->name('read');
        Route::post('/read-all', [NotificationController::class, 'markAllAsRead'])->name('read-all');
    });

    Route::prefix('log-aktivitas')->name('activity-logs.')->group(function () {
        Route::get('/', [ActivityLogController::class, 'index'])->name('index');
        Route::get('/export', [ActivityLogController::class, 'export'])->name('export');
        Route::post('/prune', [ActivityLogController::class, 'prune'])->name('prune');
    });

    Route::middleware(['role:bendahara'])->group(function () {
        Route::get('/management-role', [UserManagementController::class, 'page'])->name('management-role.index');
        Route::post('/management-role/roles', [RoleManagementController::class, 'store'])->name('management-role.roles.store');
        Route::put('/management-role/roles/{role}', [RoleManagementController::class, 'update'])->name('management-role.roles.update');
        Route::delete('/management-role/roles/{role}', [RoleManagementController::class, 'destroy'])->name('management-role.roles.destroy');

        Route::get('/user-management', [UserManagementController::class, 'index'])->name('user-management.index');
        Route::post('/user-management', [UserManagementController::class, 'store'])->name('user-management.store');
        Route::put('/user-management/{id}', [UserManagementController::class, 'update'])->name('user-management.update');
        Route::put('/user-management/{id}/permissions', [UserManagementController::class, 'updatePermissions'])->name('user-management.permissions');
        Route::delete('/user-management/{id}', [UserManagementController::class, 'destroy'])->name('user-management.destroy');
    });

    Route::middleware(['role:bendahara'])->prefix('pembaharuan')->name('system-update.')->group(function () {
        Route::get('/', [SystemUpdateController::class, 'index'])->name('index');
        Route::post('/check', [SystemUpdateController::class, 'check'])->name('check');
        Route::post('/start-online', [SystemUpdateController::class, 'startOnline'])->name('start-online');
        Route::post('/upload-manual', [SystemUpdateController::class, 'uploadManual'])->name('upload-manual');
    });

    Route::middleware(['role:bendahara'])->prefix('pengaturan-jaringan')->name('network-settings.')->group(function () {
        Route::get('/', [NetworkSettingController::class, 'index'])->name('index');
        Route::post('/', [NetworkSettingController::class, 'update'])->name('update');
        Route::post('/firewall-open', [NetworkSettingController::class, 'openFirewall'])->name('firewall-open');
    });

    Route::prefix('sk-surat')->name('sk-surat.')->group(function () {
        Route::get('/', [SkSuratController::class, 'index'])->name('index');
        Route::post('/folder', [SkSuratController::class, 'storeFolder'])->name('folder.store');
        Route::put('/folder/{folder}', [SkSuratController::class, 'updateFolder'])->name('folder.update');
        Route::delete('/folder/{folder}', [SkSuratController::class, 'destroyFolder'])->name('folder.destroy');
        Route::get('/folder/{folder}', [SkSuratController::class, 'show'])->name('show');
        Route::post('/folder/{folder}/template', [SkSuratController::class, 'storeTemplate'])->name('template.store');
        Route::post('/template/{template}/rescan', [SkSuratController::class, 'rescanTemplate'])->name('template.rescan');
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
