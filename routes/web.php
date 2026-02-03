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

Route::get('/dashboard', [DashboardController::class, 'index'])->middleware(['auth', 'verified'])->name('dashboard');

Route::middleware('auth')->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    // Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy'); // Replaced by Security
    Route::post('/profile/toggle-security', [ProfileController::class, 'toggleSecurity'])->name('profile.toggle-security');
    Route::post('/profile/generate-security-code', [ProfileController::class, 'generateSecurityCode'])->name('profile.generate-security-code');

    // Penganggaran
    Route::resource('penganggaran', PenganggaranController::class);
    Route::patch('/penganggaran/{id}/update-tanggal-perubahan', [PenganggaranController::class, 'updateTanggalPerubahan'])->name('penganggaran.update-tanggal-perubahan');

    // RKAS
    Route::get('/rkas/{id}', [RkasController::class, 'index'])->name('rkas.index');
    Route::post('/rkas/{id}', [RkasController::class, 'store'])->name('rkas.store');
    Route::post('/rkas/update-group', [RkasController::class, 'updateGroup'])->name('rkas.updateGroup');
    Route::get('/rkas/{id}/edit-data', [RkasController::class, 'getEditData'])->name('rkas.getEditData');
    Route::put('/rkas/{id}', [RkasController::class, 'update'])->name('rkas.update');
    Route::delete('/rkas/delete-group', [RkasController::class, 'destroyGroup'])->name('rkas.destroyGroup');
    Route::delete('/rkas/{id}', [RkasController::class, 'destroy'])->name('rkas.destroy');
    Route::get('/rkas/{id}/summary', [RkasController::class, 'summary'])->name('rkas.summary');
    Route::get('/rkas/{id}/export-pdf', [RkasController::class, 'exportPdf'])->name('rkas.export-pdf');
    Route::get('/rkas/{id}/export-tahapan-v1-pdf', [RkasController::class, 'exportTahapanV1Pdf'])->name('rkas.export-tahapan-v1-pdf');
    Route::get('/rkas/{id}/export-rekap-pdf', [RkasController::class, 'exportRekapPdf'])->name('rkas.export-rekap-pdf');
    Route::get('/rkas/{id}/export-lembar-kerja-pdf', [RkasController::class, 'exportLembarKerjaPdf'])->name('rkas.export-lembar-kerja-pdf');
    Route::get('/rkas/{id}/export-bulanan-pdf', [RkasController::class, 'exportBulananPdf'])->name('rkas.export-bulanan-pdf');
    Route::post('/rkas/check-previous-perubahan', [RkasController::class, 'checkPreviousYearPerubahan'])->name('rkas.check-previous-perubahan');
    Route::post('/rkas/copy-previous-perubahan', [RkasController::class, 'copyPreviousYearPerubahan'])->name('rkas.copy-previous-perubahan');

    // RKAS Perubahan
    Route::get('/rkas-perubahan/{id}', [RkasPerubahanController::class, 'index'])->name('rkas-perubahan.index');
    Route::post('/rkas-perubahan/salin', [RkasPerubahanController::class, 'salinDariRkas'])->name('rkas-perubahan.salin');
    Route::post('/rkas-perubahan', [RkasPerubahanController::class, 'store'])->name('rkas-perubahan.store');
    Route::get('/rkas-perubahan/{id}/edit', [RkasPerubahanController::class, 'edit'])->name('rkas-perubahan.edit');
    Route::get('/rkas-perubahan/{id}/detail', [RkasPerubahanController::class, 'show'])->name('rkas-perubahan.show');
    Route::put('/rkas-perubahan/{id}', [RkasPerubahanController::class, 'update'])->name('rkas-perubahan.update');
    Route::delete('/rkas-perubahan/{id}', [RkasPerubahanController::class, 'destroy'])->name('rkas-perubahan.destroy');
    Route::delete('/rkas-perubahan/{id}/delete-all', [RkasPerubahanController::class, 'deleteAll'])->name('rkas-perubahan.destroy-all');
    Route::delete('/rkas-perubahan/{id}/penganggaran', [RkasPerubahanController::class, 'destroyPenganggaran'])->name('rkas-perubahan.destroy-penganggaran');
    Route::get('/rkas-perubahan/{id}/summary', [RkasPerubahanController::class, 'summary'])->name('rkas-perubahan.summary');
    Route::get('/rkas-perubahan/{id}/logs', [RkasPerubahanController::class, 'getLogs'])->name('rkas-perubahan.logs');
    Route::get('/rkas-perubahan/{id}/export-pdf', [RkasPerubahanController::class, 'generateTahapanPdf'])->name('rkas-perubahan.export-pdf');
    Route::get('/rkas-perubahan/{id}/export-tahapan-v1-pdf', [RkasPerubahanController::class, 'exportTahapanV1Pdf'])->name('rkas-perubahan.export-tahapan-v1-pdf');
    Route::get('/rkas-perubahan/{id}/export-rekap-pdf', [RkasPerubahanController::class, 'generatePdfRkaRekap'])->name('rkas-perubahan.export-rekap-pdf');
    Route::get('/rkas-perubahan/{id}/export-lembar-kerja-pdf', [RkasPerubahanController::class, 'generateRkaDuaSatuPdf'])->name('rkas-perubahan.export-lembar-kerja-pdf');
    Route::get('/rkas-perubahan/{id}/export-bulanan-pdf', [RkasPerubahanController::class, 'generatePdfBulanan'])->name('rkas-perubahan.export-bulanan-pdf');


    // Penatausahaan
    Route::prefix('penatausahaan')->name('penatausahaan.')->group(function () {
        Route::get('/', [PenatausahaanController::class, 'index'])->name('index'); // Matches penatausahaan.index
        Route::get('/rekapitulasi', [RekapitulasiController::class, 'index'])->name('rekapitulasi');
        Route::get('/bku/{tahun}/{bulan}', [BukuKasUmumController::class, 'index'])->name('bku');
        Route::get('/get-id', [PenatausahaanController::class, 'getPenganggaranId'])->name('get-id');
        Route::get('/get-data/{penganggaranId}', [PenerimaanDanaController::class, 'getByPenganggaran'])->name('get-data');
    });

    // BKU Rekap
    Route::get('/penatausahaan/bku/rekap', [BukuKasUmumController::class, 'rekap'])->name('bku.rekap');

    // Penerimaan Dana
    Route::post('/penerimaan-dana', [PenerimaanDanaController::class, 'store'])->name('penerimaan-dana.store');

    // STS
    Route::post('sts/{id}/bayar', [StsController::class, 'bayar'])->name('sts.bayar');
    Route::put('sts/{id}/bayar', [StsController::class, 'updateBayar'])->name('sts.update-bayar');
    Route::get('/api/sts/by-tahun/{tahun}', [StsController::class, 'getByTahun'])->name('api.sts.by-tahun');
    Route::get('/api/sts/years', [StsController::class, 'getAvailableYears'])->name('api.sts.years');
    Route::post('/api/sts/add-to-bkp', [StsController::class, 'addToBukuBank'])->name('api.sts.add-to-bkp');
    Route::resource('sts', StsController::class);

    // Data Master
    Route::post('sekolah-profile/{id}/upload-kop', [SekolahProfileController::class, 'uploadKop'])->name('sekolah-profile.upload-kop');
    Route::delete('sekolah-profile/{id}/delete-kop', [SekolahProfileController::class, 'destroyKop'])->name('sekolah-profile.delete-kop');
    Route::resource('sekolah-profile', SekolahProfileController::class);
    Route::get('kode-kegiatan/download-template', [KodeKegiatanController::class, 'downloadTemplate'])->name('kode-kegiatan.download-template');
    Route::post('kode-kegiatan/import', [KodeKegiatanController::class, 'import'])->name('kode-kegiatan.import');
    Route::resource('kode-kegiatan', KodeKegiatanController::class);
    Route::get('rekening-belanja/download-template', [RekeningBelanjaController::class, 'downloadTemplate'])->name('rekening-belanja.download-template');
    Route::post('rekening-belanja/import', [RekeningBelanjaController::class, 'import'])->name('rekening-belanja.import');
    Route::resource('rekening-belanja', RekeningBelanjaController::class);

    // Fitur Pelengkap (Root level resources for Kwitansi/TandaTerima to match Sidebar names)
    // Route::resource('kwitansi', KwitansiController::class); // Moved below to avoid conflict
    // Route::resource('tanda-terima', TandaTerimaController::class); // Moved below to avoid conflict

    // Laporan (Root level to match Sidebar 'laporan.index')
    Route::get('/laporan', function () {
        return Inertia::render('FiturPelengkap/Laporan/Index');
    })->name('laporan.index');

    // Backup
    Route::prefix('backup')->name('backup.')->group(function () {
        Route::get('/', [DatabaseController::class, 'index'])->name('index');
        Route::post('/create', [DatabaseController::class, 'backup'])->name('create');
        Route::post('/restore', [DatabaseController::class, 'restore'])->name('restore');
        Route::get('/download', [DatabaseController::class, 'download'])->name('download');
        Route::delete('/delete', [DatabaseController::class, 'delete'])->name('delete');
        Route::post('/validate-password', [DatabaseController::class, 'validatePassword'])->name('validate-password');
        Route::post('/reset', [DatabaseController::class, 'reset'])->name('reset');
    });

    // Penbarikan / Setor Routes
    Route::post('/penarikan-tunai', [BukuKasUmumController::class, 'storePenarikan'])->name('penarikan-tunai.store');
    Route::delete('/penarikan-tunai/{id}', [BukuKasUmumController::class, 'destroyPenarikan'])->name('penarikan-tunai.destroy');

    Route::post('/setor-tunai', [BukuKasUmumController::class, 'storeSetor'])->name('setor-tunai.store');
    Route::delete('/setor-tunai/{id}', [BukuKasUmumController::class, 'destroySetor'])->name('setor-tunai.destroy');

    // BKU Actions
    Route::post('/bku/store', [BukuKasUmumController::class, 'store'])->name('bku.store');
    Route::delete('/bku/{id}', [BukuKasUmumController::class, 'destroy'])->name('bku.destroy');
    Route::post('/bku/tutup', [BukuKasUmumController::class, 'storePenutupan'])->name('bku.tutup');
    Route::post('/bku/reopen', [BukuKasUmumController::class, 'reopen'])->name('bku.reopen');
    Route::post('/bku/lapor-pajak/{id}', [BukuKasUmumController::class, 'laporPajak'])->name('bku.lapor-pajak');
    Route::post('/bku/destroy-period', [BukuKasUmumController::class, 'destroyPeriod'])->name('bku.destroy-period');
    Route::get('/api/bku/uraian', [BukuKasUmumController::class, 'getUraianItems'])->name('api.bku.uraian'); // Add API route as well since it was seen in frontend code
    Route::get('/api/bku/trk-saldo-awal/{tahun}', [BukuKasUmumController::class, 'getTrkSaldoAwal'])->name('api.bku.trk-saldo-awal.get');
    Route::post('/api/bku/trk-saldo-awal/save', [BukuKasUmumController::class, 'storeTrkSaldoAwal'])->name('api.bku.trk-saldo-awal.save');
    Route::get('/api/bku/kegiatan-rekening', [BukuKasUmumController::class, 'getKegiatanRekening'])->name('api.bku.kegiatan-rekening');

    // API Routes for Penatausahaan (Inferred from context)
    // Route::get('/api/realisasi/data', [RekapitulasiRealisasiController::class, 'getRealisasiData'])->name('api.realisasi.data');
    // Route::get('/api/bkp-umum/data', [BukuKasUmumController::class, 'getRekapanBkuAjax'])->name('api.bkp-umum.data');

    // Fitur Pelengkap Group for Laporan APIs
    Route::prefix('fitur-pelengkap')->name('fitur-pelengkap.')->group(function () {
        // SPMTH API
        Route::get('/api/spmth', [SpmthController::class, 'index'])->name('api.spmth.index');
        Route::post('/api/spmth', [SpmthController::class, 'store'])->name('api.spmth.store');
        Route::get('/api/spmth/calculate', [SpmthController::class, 'calculate'])->name('api.spmth.calculate');
        Route::get('/api/spmth/tahun', [SpmthController::class, 'getTahunAnggaran'])->name('api.spmth.tahun');
        Route::put('/api/spmth/{id}', [SpmthController::class, 'update'])->name('api.spmth.update');
        Route::delete('/api/spmth/{id}', [SpmthController::class, 'destroy'])->name('api.spmth.destroy');

        // SPTJ API
        Route::get('/api/sptj', [SptjController::class, 'index'])->name('api.sptj.index');
        Route::post('/api/sptj', [SptjController::class, 'store'])->name('api.sptj.store');
        Route::put('/api/sptj/{id}', [SptjController::class, 'update'])->name('api.sptj.update');
        Route::delete('/api/sptj/{id}', [SptjController::class, 'destroy'])->name('api.sptj.destroy');
        Route::get('/api/sptj/calculate', [SptjController::class, 'calculate'])->name('api.sptj.calculate');
        Route::get('/api/sptj/tahun', [SptjController::class, 'getTahunAnggaran'])->name('api.sptj.tahun');
    });

    // Kwitansi API & Routes
    Route::get('/api/kwitansi/tahun', [KwitansiController::class, 'getTahunAnggaran'])->name('api.kwitansi.tahun');
    Route::get('/api/kwitansi/check-available', [KwitansiController::class, 'checkAvailableData'])->name('api.kwitansi.check-available');
    Route::get('/api/kwitansi/debug-count', [KwitansiController::class, 'debugDataCount'])->name('api.kwitansi.debug-count');
    Route::get('/api/kwitansi/search', [KwitansiController::class, 'search'])->name('api.kwitansi.search'); // Main data fetch

    // Kwitansi Actions
    Route::post('/api/kwitansi/generate-batch', [KwitansiController::class, 'generateBatch'])->name('kwitansi.generate-batch');
    Route::delete('/api/kwitansi/delete-all', [KwitansiController::class, 'deleteAll'])->name('kwitansi.delete-all');
    
    Route::get('/kwitansi/{id}/preview', [KwitansiController::class, 'previewPdf'])->name('kwitansi.preview');
    Route::get('/kwitansi/{id}/pdf', [KwitansiController::class, 'generatePdf'])->name('kwitansi.pdf');
    Route::get('/kwitansi/download-all', [KwitansiController::class, 'downloadAll'])->name('kwitansi.download-all');
    
    // Resource route MUST come after specific routes to avoid 'download-all' being treated as an ID
    Route::resource('kwitansi', KwitansiController::class);

    // Tanda Terima API & Routes
    Route::get('/api/tanda-terima/tahun', [TandaTerimaController::class, 'getTahunAnggaran'])->name('api.tanda-terima.tahun');
    Route::get('/api/tanda-terima/check-available', [TandaTerimaController::class, 'checkAvailableData'])->name('api.tanda-terima.check-available');
    Route::get('/api/tanda-terima/search', [TandaTerimaController::class, 'search'])->name('api.tanda-terima.search');
    
    Route::post('/api/tanda-terima/generate-batch', [TandaTerimaController::class, 'generateBatch'])->name('tanda-terima.generate-batch');
    Route::delete('/api/tanda-terima/delete-all', [TandaTerimaController::class, 'deleteAll'])->name('tanda-terima.delete-all');

    Route::get('/tanda-terima/{id}/preview', [TandaTerimaController::class, 'previewPdf'])->name('tanda-terima.preview');
    Route::get('/tanda-terima/{id}/pdf', [TandaTerimaController::class, 'generatePdf'])->name('tanda-terima.pdf'); // Matches name used in controller/view
    // Correcting name for route consistency if accessed directly
    Route::get('/tanda-terima/download-all', [TandaTerimaController::class, 'downloadAll'])->name('tanda-terima.download-all');

    // Resource route MUST come after specific routes
    Route::resource('tanda-terima', TandaTerimaController::class);

    // Dokumen
    Route::get('/dokumen', [\App\Http\Controllers\DokumenController::class, 'index'])->name('dokumen.index');
    Route::get('/api/dokumen/data', [\App\Http\Controllers\DokumenController::class, 'getData'])->name('api.dokumen.data');
    Route::post('/dokumen', [\App\Http\Controllers\DokumenController::class, 'store'])->name('dokumen.store');
    Route::delete('/dokumen/{id}', [\App\Http\Controllers\DokumenController::class, 'destroy'])->name('dokumen.destroy');

    // Laporan PDF Routes
    Route::get('/laporan/spmth/{id}/pdf', [SpmthController::class, 'generatePdf'])->name('laporan.spmth.pdf');
    Route::get('/laporan/sptj/{id}/pdf', [SptjController::class, 'generatePdf'])->name('laporan.sptj.pdf');
    
    // Tanda Terima PDF (Previously defined, now consolidated above. Removing duplicate)
    // Route::get('/tanda-terima/pdf', [TandaTerimaController::class, 'generatePdf'])->name('tanda_terima.pdf'); // Replaced by {id}/pdf above to be more standard
    
    // API Routes for Rekapitulasi
    Route::get('/api/bkp-bank/data', [BukuBankController::class, 'getBkpBankData'])->name('api.bkp-bank.data');
    Route::get('/api/bkp-pembantu/data', [BukuKasPembantuTunaiController::class, 'getBkpPembantuData'])->name('api.bkp-pembantu.data');
    Route::get('/api/bkp-umum/data', [BukuKasUmumController::class, 'getRekapanBkuAjax'])->name('api.bkp-umum.data');
    Route::get('/api/bkp-pajak/data', [BukuPajakController::class, 'getBkpPajakData'])->name('api.bkp-pajak.data');
    Route::get('/api/bkp-rob/data', [BukuRobController::class, 'getBkpRobData'])->name('api.bkp-rob.data');
    Route::get('/api/bkp-reg/data', [RegistrasiPenutupanKasController::class, 'getBkpRegData'])->name('api.bkp-reg.data');
    Route::get('/api/ba/data', [BeritaAcaraPenutupanController::class, 'getBeritaAcaraData'])->name('api.ba.data');
    Route::get('/api/realisasi/data', [RekapitulasiRealisasiController::class, 'getRealisasiData'])->name('api.realisasi.data');

    // Printing Routes
    Route::get('/bkp-bank/cetak', [BukuBankController::class, 'generateBkpBankPdf'])->name('bkp-bank.cetak');
    Route::get('/bkp-pembantu/cetak', [BukuKasPembantuTunaiController::class, 'generateBkuPembantuTunaiPdf'])->name('bkp-pembantu.cetak');
    Route::get('/bkp-umum/cetak/{tahun}/{bulan}', [BukuKasUmumController::class, 'generateBkpUmumPdfAction'])->name('bkp-umum.cetak');
    Route::get('/bkp-pajak/cetak', [BukuPajakController::class, 'generateBkpPajakPdf'])->name('bkp-pajak.cetak');
    Route::get('/bkp-rob/cetak', [BukuRobController::class, 'generateBkpRobPdf'])->name('bkp-rob.cetak');
    Route::get('/bkp-reg/cetak', [RegistrasiPenutupanKasController::class, 'generateBkpRegPdf'])->name('bkp-reg.cetak');
    Route::get('/ba/cetak', [BeritaAcaraPenutupanController::class, 'generateBeritaAcaraPdf'])->name('ba.cetak');
    Route::get('/realisasi/cetak', [RekapitulasiRealisasiController::class, 'generatePdf'])->name('realisasi.cetak');
});

require __DIR__.'/auth.php';
