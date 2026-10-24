# Design Spec: Pengamanan & Relokasi File .env ke Common AppData (ProgramData) dengan Integrasi Inno Setup

**Tanggal:** 24 Oktober 2026  
**Status:** Approved  
**Topik:** Keamanan Konfigurasi, Relokasi .env, Windows Service, Inno Setup Installer, Laravel 13 Bootstrap  

---

## 1. Latar Belakang & Masalah
1. **Model Distribusi Aplikasi:**
   - Aplikasi SIKAS didistribusikan ke komputer klien secara *offline* (on-premise) menggunakan installer Windows berbasis **Inno Setup** (`install_beta.iss`).
   - Web server Apache diinstal sebagai **Windows Service** (`newsikas_server`) dan berjalan di bawah akun sistem **`NT AUTHORITY\SYSTEM` (LocalSystem)**.
2. **Kelemahan Penempatan .env Saat Ini:**
   - File `.env` terletak di root folder aplikasi (`{app}\wwwroot\.env` atau `c:\laragon\www\newSIKAS2\newSIKAS\.env`).
   - Penempatan ini membuat file konfigurasi rentan dilihat atau dimodifikasi oleh pengguna awam melalui File Explorer Windows (misalnya mengubah lisensi `APP_NPSN_CODE` atau kredensial database).
3. **Keterbatasan Akun Windows Service (%APPDATA% vs %ProgramData%):**
   - Windows Service (`LocalSystem`) tidak memiliki akses ke folder `%APPDATA%` profil pengguna (`C:\Users\{Username}\AppData\Roaming`). `%APPDATA%` milik service mengarah ke `C:\Windows\System32\config\systemprofile`.
   - Oleh karena itu, folder standar Windows yang dapat diakses bersama secara aman oleh Windows Service dan aplikasi pengguna adalah **`C:\ProgramData\SIKAS`** (Common AppData).
4. **Hardcoded Path pada Codebase Saat Ini:**
   - [ArkasSettingController.php](file:///c:/laragon/www/newSIKAS2/newSIKAS/app/Http/Controllers/ArkasSettingController.php#L59) menggunakan `$envPath = base_path('.env');`.
   - [DatabaseController.php](file:///c:/laragon/www/newSIKAS2/newSIKAS/app/Http/Controllers/DatabaseController.php#L551) menggunakan `$path = base_path('.env');`.
   - Jika file `.env` dipindahkan tanpa refactoring, kedua fitur ini akan gagal menyimpan atau malah membuat file `.env` baru di folder root.

---

## 2. Tujuan & Ruang Lingkup
1. **Relokasi Konfigurasi ke Folder Sistem Aman:**
   - Memindahkan file `.env` dari root web ke `C:\ProgramData\SIKAS\.env`.
   - Mengatur izin hak akses folder (`icacls`) agar proses Apache dan PHP dapat membaca dan menulis konfigurasi dengan aman.
2. **Deteksi Otomatis & Transparan di Laravel:**
   - Mendeteksi keberadaan `C:\ProgramData\SIKAS\.env` saat inisialisasi di `bootstrap/app.php`.
   - Tetap menyediakan *fallback* otomatis ke `base_path('.env')` agar saat pengembangan lokal (*development*) di Laragon, pengembang tidak perlu repot menyetel folder ProgramData.
   - Mengisolasi mode testing (`$app->runningUnitTests()`) agar `composer test` tetap berjalan di memori sqlite tanpa terpengaruh file produksi.
3. **Refactoring Controller Pengubah Konfigurasi:**
   - Menyelaraskan seluruh pemanggilan penulisan `.env` menggunakan `app()->environmentFilePath()`.
4. **Artisan Command `sikas:secure-env`:**
   - Menyediakan command otomatis untuk memindahkan `.env`, mengembalikan (`--restore`), dan memeriksa status aktif (`--status`).
5. **Integrasi Penuh ke Inno Setup:**
   - Menambahkan langkah otomatisasi pada skrip `install_beta.iss` agar saat proses instalasi selesai (`ssPostInstall`), `.env` otomatis dipindahkan ke `C:\ProgramData\SIKAS\.env` dan dihapus dari root aplikasi.

---

## 3. Rancangan Teknis Detail

### 3.1 Deteksi Environment di Bootstrap ([bootstrap/app.php](file:///c:/laragon/www/newSIKAS2/newSIKAS/bootstrap/app.php))
Pada proses pembuatan instance aplikasi Laravel, sebelum bootstrapper memuat Dotenv:
```php
$app = Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->web(append: [
            HandleInertiaRequests::class,
            AddLinkHeadersForPreloadedAssets::class,
            CheckNpsnLicense::class,
        ]);

        $middleware->alias([
            'variant' => DetectVariant::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        //
    })->create();

// Deteksi folder konfigurasi aman (C:\ProgramData\SIKAS\.env)
if (! $app->runningUnitTests()) {
    $programData = getenv('ProgramData') ?: (isset($_SERVER['ProgramData']) ? $_SERVER['ProgramData'] : 'C:\ProgramData');
    $secureDir = rtrim($programData, '\\/') . DIRECTORY_SEPARATOR . 'SIKAS';

    if (file_exists($secureDir . DIRECTORY_SEPARATOR . '.env')) {
        $app->useEnvironmentPath($secureDir);
    }
}

return $app;
```

---

### 3.2 Refactoring Controller Pengubah Konfigurasi

#### A. [app/Http/Controllers/ArkasSettingController.php](file:///c:/laragon/www/newSIKAS2/newSIKAS/app/Http/Controllers/ArkasSettingController.php)
Ganti baris 59:
```diff
- $envPath = base_path('.env');
+ $envPath = app()->environmentFilePath();
```

#### B. [app/Http/Controllers/DatabaseController.php](file:///c:/laragon/www/newSIKAS2/newSIKAS/app/Http/Controllers/DatabaseController.php)
Ganti baris 551:
```diff
- $path = base_path('.env');
+ $path = app()->environmentFilePath();
```

---

### 3.3 Pembuatan Artisan Command (`app/Console/Commands/SecureEnvCommand.php`)
Command signature: `sikas:secure-env {--restore : Kembalikan file .env ke root project} {--status : Cek lokasi file .env aktif}`

**Alur Kerja Perintah:**
1. **Mode Status (`--status`):**
   - Menampilkan path `$app->environmentFilePath()`.
   - Menginformasikan apakah file berada di `ProgramData` atau di root project.
2. **Mode Restore (`--restore`):**
   - Memeriksa file di `C:\ProgramData\SIKAS\.env`.
   - Jika ditemukan, salin ke `base_path('.env')`.
   - Hapus file di `C:\ProgramData\SIKAS\.env`.
   - Tampilkan pesan sukses.
3. **Mode Secure Default (`php artisan sikas:secure-env`):**
   - Periksa file `.env` di root project (`base_path('.env')`).
   - Buat direktori `C:\ProgramData\SIKAS` jika belum ada (`File::ensureDirectoryExists`).
   - Salin file `.env` dari root ke `C:\ProgramData\SIKAS\.env`.
   - Hapus file `.env` dari root project (`File::delete`).
   - Tampilkan pesan sukses bahwa `.env` telah diamankan.

---

### 3.4 Integrasi Inno Setup Script ([install_beta.iss](file:///c:/laragon/www/newSIKAS2/install_beta.iss))

1. **Pengaturan Izin Hak Akses di Bagian `[Run]`:**
   ```ini
   ; Setting permission for ProgramData SIKAS
   Filename: "icacls.exe"; Parameters: """{commonappdata}\SIKAS"" /grant ""Users"":(OI)(CI)F /T"; Flags: runhidden; StatusMsg: "Mengatur hak akses konfigurasi...";
   ```
2. **Pemindahan Otomatis di Bagian `[Code]` (`ssPostInstall`):**
   Setelah perintah `optimize:clear`:
   ```pascal
   // 2. Jalankan artisan commands
   Exec(ExpandConstant('{app}\php\php.exe'), 'artisan storage:link', 
        ExpandConstant('{app}\wwwroot'), SW_HIDE, ewWaitUntilTerminated, ResultCode);
   Exec(ExpandConstant('{app}\php\php.exe'), 'artisan migrate:fresh', 
        ExpandConstant('{app}\wwwroot'), SW_HIDE, ewWaitUntilTerminated, ResultCode);
   Exec(ExpandConstant('{app}\php\php.exe'), 'artisan optimize:clear', 
        ExpandConstant('{app}\wwwroot'), SW_HIDE, ewWaitUntilTerminated, ResultCode);
   // Amankan .env ke C:\ProgramData\SIKAS
   Exec(ExpandConstant('{app}\php\php.exe'), 'artisan sikas:secure-env', 
        ExpandConstant('{app}\wwwroot'), SW_HIDE, ewWaitUntilTerminated, ResultCode);
   ```
3. **Pembersihan Bersih saat Uninstall di Bagian `[UninstallDelete]`:**
   ```ini
   Type: filesandordirs; Name: "{commonappdata}\SIKAS"
   ```

---

## 4. Rencana Pengujian & Verifikasi

1. **Verifikasi Pengujian Otomatis:**
   - Jalankan `composer test` untuk memastikan seluruh suite test Laravel berjalan 100% tanpa gangguan.
2. **Verifikasi Artisan Command Manual:**
   - Jalankan `php artisan sikas:secure-env --status`.
   - Jalankan `php artisan sikas:secure-env` untuk menguji pemindahan ke `C:\ProgramData\SIKAS`.
   - Periksa file di `C:\ProgramData\SIKAS\.env` dan pastikan `.env` di root terhapus.
   - Jalankan `php artisan sikas:secure-env --status` (harus menunjukkan lokasi di `ProgramData`).
   - Jalankan `php artisan sikas:secure-env --restore` untuk mengembalikan ke root (harus kembali ke root).
3. **Verifikasi Controller:**
   - Uji penyimpanan path Arkas dan update NPSN di controller, pastikan membaca dan memperbarui file di lokasi yang benar.
4. **Verifikasi Sintaks Inno Setup:**
   - Periksa konsistensi baris kode pada `install_beta.iss`.
