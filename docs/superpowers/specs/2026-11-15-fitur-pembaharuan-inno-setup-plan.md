# Rencana Implementasi: Fitur Pembaharuan Aplikasi (Inno Setup & GitHub Releases)

Acuan Desain: [2026-11-15-fitur-pembaharuan-inno-setup-design.md](file:///c:/laragon/www/newSIKAS2/newSIKAS/docs/superpowers/specs/2026-11-15-fitur-pembaharuan-inno-setup-design.md)

---

## Tugas 1 — Pembaruan Pintar Script Inno Setup (`install_beta.iss`)
- **File**: [install_beta.iss](file:///C:/laragon/www/newSIKAS2/install_beta.iss)
- **Perubahan**:
  1. Tambahkan preprocessor `#define MyAppVersion "2026.29"` di baris teratas dan gunakan `{#MyAppVersion}` pada `AppVersion`, `AppVerName`, serta `CreateConfigFile` (`'version={#MyAppVersion}'`).
  2. Buat fungsi `IsUpgradeMode(): Boolean` di bagian `[Code]` yang mengecek:
     - Parameter command-line `/UPDATE` (melalui iterasi `ParamCount` / `ParamStr(I)`), ATAU
     - Keberadaan file `{commonappdata}\SIKAS\.env` dan `{app}\dbapp\PG_VERSION`.
  3. Pada bagian `[Files]`, tambahkan `Check: not IsUpgradeMode` pada baris `Source: "dbapp\*"; DestDir: "{app}\dbapp"` agar database sekolah tidak pernah ditimpa saat update.
  4. Tambahkan `function ShouldSkipPage(PageID: Integer): Boolean;` untuk melewati `NpsnPage.ID` saat `IsUpgradeMode()` bernilai `True`.
  5. Tambahkan `function PrepareToInstall(var NeedsRestart: Boolean): String;` untuk menghentikan service `newsikas_server` dan `newsikas_DB` sebelum proses ekstraksi `[Files]` dimulai agar tidak ada file `.exe` / `.dll` yang terkunci.
  6. Perbarui `CurStepChanged(ssPostInstall)`:
     - Jika `{commonappdata}\SIKAS\.env` sudah ada (Mode Update), hapus `{app}\wwwroot\.env` bawaan installer dan lewati `AppendNpsnToEnv` serta `sikas:secure-env` agar lisensi NPSN sekolah tetap utuh.
     - Pisahkan prosedur start service: nyalakan `newsikas_DB` terlebih dahulu, jalankan `php.exe artisan migrate --force`, `php.exe artisan storage:link`, dan `php.exe artisan optimize:clear`, kemudian nyalakan `newsikas_server`.

---

## Tugas 2 — Konfigurasi & Layanan Backend (`config/updater.php` & `SystemUpdaterService.php`)
- **File Baru**:
  - `config/updater.php`
  - `app/Services/SystemUpdaterService.php`
- **Implementasi `config/updater.php`**:
  - Menyimpan `'version' => '2026.29'`, konfigurasi `'github'` (`owner`, `repo`, `token`, `asset_pattern`), dan `'cache_ttl' => 86400`.
- **Implementasi `SystemUpdaterService.php`**:
  1. `getCurrentVersion(): string` — membaca versi dari `../configapp/install.ini` (jika ada) dan membandingkannya dengan `config('updater.version')`.
  2. `getCachedUpdateStatus(): array` — membaca status update dari file/cache lokal (`storage/app/update_status.json`) agar cepat dibaca oleh `HandleInertiaRequests` tanpa memanggil HTTP eksternal di setiap request.
  3. `checkForUpdates(bool $force = false): array` — memanggil GitHub API (`https://api.github.com/repos/{owner}/{repo}/releases/latest`) menggunakan Bearer token dari `config('updater.github.token')`, mengekstrak `tag_name` (dinormalisasi tanpa awalan `v`), `body` (changelog), `published_at`, serta mencari asset `.exe` (`url`, `name`, `size`), lalu menyimpan hasilnya ke `storage/app/update_status.json`.
  4. `downloadReleaseAsset(string $assetApiUrl, string $targetPath, callable $onProgress): void` — mengunduh asset `.exe` dari GitHub Releases (dengan header `Accept: application/octet-stream` dan `Authorization: Bearer {token}`) menggunakan streaming Guzzle/cURL ke `storage/app/temp/update/` sambil memperbarui persentase progres secara berkala.
  5. `writeProgress(string $updateId, int $percent, string $phase, string $message, ?string $targetVersion = null): void` & `readProgress(string $updateId): array` — menyimpan dan membaca progres update di `storage/app/temp/update_progress_{updateId}.json`.
  6. `triggerSilentInstaller(string $installerPath, string $updateId, string $targetVersion): void` — membuat dan menjalankan `.bat` runner secara *detached* (`start /B "" cmd /c ...`) yang mengeksekusi installer dengan parameter `/VERYSILENT /SUPPRESSMSGBOXES /NORESTART /CLOSEAPPLICATIONS /UPDATE`.

---

## Tugas 3 — Controller, Routing, & Shared Props Inertia
- **File Baru**: `app/Http/Controllers/SystemUpdateController.php`
- **File Diubah**:
  - [routes/web.php](file:///c:/laragon/www/newSIKAS2/newSIKAS/routes/web.php)
  - [DatabaseController.php](file:///c:/laragon/www/newSIKAS2/newSIKAS/app/Http/Controllers/DatabaseController.php) (mengekstrak/membuat method publik `createAutoBackupForUpdate()` agar logika backup `.btb` dapat dipanggil sebelum update)
  - [HandleInertiaRequests.php](file:///c:/laragon/www/newSIKAS2/newSIKAS/app/Http/Middleware/HandleInertiaRequests.php)
- **Implementasi**:
  1. Daftarkan route `/pembaharuan` (`system-update.index`), `/pembaharuan/check` (`system-update.check`), `/pembaharuan/start-online` (`system-update.start-online`), `/pembaharuan/upload-manual` (`system-update.upload-manual`), serta `/pembaharuan/progress/{updateId}` (`system-update.progress` tanpa session/DB middleware).
  2. Batasi akses eksekusi pembaharuan hanya untuk non-Kepala Sekolah (`!Auth::user()->isKepalaSekolah()`).
  3. Tambahkan shared prop `systemUpdate` di `HandleInertiaRequests` yang memuat `{ currentVersion, latestVersion, hasUpdate }` dari cache lokal.

---

## Tugas 4 — Navigasi Sidebar & Halaman UI Neo-Bento (`SystemUpdate/Index.tsx`)
- **File Baru**: `resources/js/Pages/SystemUpdate/Index.tsx`
- **File Diubah**: [Sidebar.tsx](file:///c:/laragon/www/newSIKAS2/newSIKAS/resources/js/Components/Sidebar.tsx)
- **Implementasi**:
  1. Pada `Sidebar.tsx`, tambahkan menu **Pembaharuan** di bawah **Backup Database** pada grup **Sistem** lengkap dengan ikon `IconUpdate` dan badge **`BARU`** (`bg-lime-400 text-slate-950`) ketika `systemUpdate?.hasUpdate` bernilai `true`.
  2. Buat halaman `resources/js/Pages/SystemUpdate/Index.tsx` bergaya Neo-Bento:
     - Kartu ringkasan 3 kolom (Versi Terpasang, Status Rilis Terbaru, Status Cadangan Database).
     - Panel Detail Rilis & Catatan Pembaharuan (*Changelog*) dengan tombol **Perbarui Aplikasi Sekarang**.
     - Panel Upload Installer Manual (`.exe`) untuk mode offline/koneksi lambat.
     - Modal Progres Pembaharuan 4 Tahap (Backup Database -> Download/Upload `.exe` -> Eksekusi Silent Installer & Restart Server dengan *auto-reconnect polling* -> Selesai & Reload).

---

## Tugas 5 — Pengujian & Verifikasi
1. Buat unit/feature test `tests/Feature/SystemUpdateTest.php` untuk memvalidasi:
   - Pembacaan versi dan pembandingan `version_compare`.
   - Simulasi respons GitHub API (`Http::fake`) untuk kondisi *up-to-date* vs *update tersedia*.
   - Proteksi akses halaman/aksi pembaharuan (Bendahara diizinkan, Kepala Sekolah ditolak/403).
   - Endpoint `/pembaharuan/progress/{updateId}` merespons JSON dengan benar.
2. Jalankan `vendor/bin/pint`, `composer test`, dan `npm run build`.
