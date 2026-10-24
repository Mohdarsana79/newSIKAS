# Implementation Plan: Pengamanan & Relokasi File .env ke Common AppData (ProgramData) dengan Integrasi Inno Setup

- **Tanggal**: 24 Oktober 2026
- **Dokumen Desain**: [2026-10-24-secure-env-inno-setup-design.md](file:///c:/laragon/www/newSIKAS2/newSIKAS/docs/superpowers/specs/2026-10-24-secure-env-inno-setup-design.md)
- **Target File**:
  - `bootstrap/app.php`
  - `app/Console/Commands/SecureEnvCommand.php` *(File Baru)*
  - `app/Http/Controllers/ArkasSettingController.php`
  - `app/Http/Controllers/DatabaseController.php`
  - `tests/Unit/SecureEnvCommandTest.php` *(File Baru)*
  - `../install_beta.iss` (`c:\laragon\www\newSIKAS2\install_beta.iss`)
- **Status**: Siap Dieksekusi

---

## 1. Rencana Perubahan Detail

### Task 1: Deteksi Environment di [bootstrap/app.php](file:///c:/laragon/www/newSIKAS2/newSIKAS/bootstrap/app.php)
- Sebelum mengembalikan `$app`, tambahkan logika:
  ```php
  if (! $app->runningUnitTests()) {
      $programData = getenv('ProgramData') ?: (isset($_SERVER['ProgramData']) ? $_SERVER['ProgramData'] : 'C:\ProgramData');
      $secureDir = rtrim($programData, '\\/') . DIRECTORY_SEPARATOR . 'SIKAS';

      if (file_exists($secureDir . DIRECTORY_SEPARATOR . '.env')) {
          $app->useEnvironmentPath($secureDir);
      }
  }
  ```
- Memastikan isolasi testing: saat `APP_ENV=testing` atau `runningUnitTests()`, aplikasi tetap menggunakan konfigurasi sqlite di memori.

---

### Task 2: Refactoring Controller Pengubah Konfigurasi
1. **[app/Http/Controllers/ArkasSettingController.php](file:///c:/laragon/www/newSIKAS2/newSIKAS/app/Http/Controllers/ArkasSettingController.php#L59)**:
   - Ganti `$envPath = base_path('.env');` dengan `$envPath = app()->environmentFilePath();`.
2. **[app/Http/Controllers/DatabaseController.php](file:///c:/laragon/www/newSIKAS2/newSIKAS/app/Http/Controllers/DatabaseController.php#L551)**:
   - Ganti `$path = base_path('.env');` dengan `$path = app()->environmentFilePath();`.

---

### Task 3: Pembuatan Artisan Command `sikas:secure-env`
- File: `app/Console/Commands/SecureEnvCommand.php`
- Signature: `sikas:secure-env {--restore : Kembalikan file .env ke root project} {--status : Cek lokasi file .env aktif}`
- Implementasi:
  - `--status`: Menampilkan path file `.env` aktif (`app()->environmentFilePath()`) dan menginformasikan status pengamanan.
  - `--restore`: Memindahkan file dari `C:\ProgramData\SIKAS\.env` kembali ke `base_path('.env')`, lalu menghapus file di `ProgramData`.
  - Default:
    - Cek keberadaan `base_path('.env')`.
    - Pastikan direktori `C:\ProgramData\SIKAS` ada (`File::ensureDirectoryExists`).
    - Salin `base_path('.env')` ke `C:\ProgramData\SIKAS\.env`.
    - Hapus file `base_path('.env')`.
    - Tampilkan notifikasi keberhasilan.

---

### Task 4: Pembuatan Unit Test
- File: `tests/Unit/SecureEnvCommandTest.php`
- Menguji fitur:
  - Command status berjalan lancar.
  - Pemindahan dan restore berfungsi sesuai ekspektasi pada direktori uji isolasi.

---

### Task 5: Pembaruan Skrip Inno Setup (`c:\laragon\www\newSIKAS2\install_beta.iss`)
1. Di bagian `[Run]`:
   - Tambahkan perintah `icacls` untuk memberikan izin ke `{commonappdata}\SIKAS`:
     ```ini
     Filename: "icacls.exe"; Parameters: """{commonappdata}\SIKAS"" /grant ""Users"":(OI)(CI)F /T"; Flags: runhidden; StatusMsg: "Mengatur hak akses konfigurasi...";
     ```
2. Di bagian `[Code]` pada prosedur `CurStepChanged(CurStep: TSetupStep)` saat `CurStep = ssPostInstall`:
   - Tambahkan eksekusi artisan `sikas:secure-env` setelah `artisan optimize:clear`:
     ```pascal
     Exec(ExpandConstant('{app}\php\php.exe'), 'artisan sikas:secure-env', 
          ExpandConstant('{app}\wwwroot'), SW_HIDE, ewWaitUntilTerminated, ResultCode);
     ```
3. Di bagian `[UninstallDelete]`:
   - Tambahkan entri pembersihan:
     ```ini
     Type: filesandordirs; Name: "{commonappdata}\SIKAS"
     ```

---

## 2. Rencana Verifikasi & Validasi
1. Jalankan `php artisan sikas:secure-env --status`.
2. Jalankan `composer test` untuk memastikan semua unit & feature test lulus 100%.
3. Jalankan `vendor/bin/pint` untuk memastikan formatting kode PHP bersih dan rapi sesuai standar repositori.
