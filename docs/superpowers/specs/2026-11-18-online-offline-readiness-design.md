# Desain Kesiapan Mode Online (Windows VPS / Server Sekolah) & Offline (Lokal)

**Tanggal:** 2026-11-18
**Status:** Draft untuk Review Pengguna
**Target Deployment:** Windows VPS / Server Lokal Sekolah (diakses via Domain + HTTPS Reverse Proxy maupun HTTP IP/localhost) serta instalasi PC Lokal (Inno Setup offline).

---

## 1. Latar Belakang & Masalah yang Ditemukan

Hasil audit kode menunjukkan aplikasi saat ini dibuat dengan asumsi berjalan di `http://localhost` pada satu PC Windows lokal tanpa `config:cache`. Ketika aplikasi dijalankan online di Windows VPS atau server lokal sekolah di balik reverse proxy (Nginx / Cloudflare Tunnel / Caddy / IIS), atau dijalankan dalam kondisi offline penuh, terdapat beberapa titik kegagalan (*crash points*):

1. **Koneksi PostgreSQL mengabaikan `.env` (`config/database.php`)**:
   Konfigurasi `pgsql` meng-hardcode `host => '127.0.0.1'`, `port => '5432'`, `database => 'newSIKAS'`, `username => 'postgres'`, `password => 'sikas'`, dan `url => null`. Server dengan kredensial/host DB berbeda akan langsung gagal terhubung.
2. **Pemakaian `env()` langsung di luar `config/`**:
   13 file di `app/` (`CheckNpsnLicense`, `SekolahProfileController`, `DatabaseController`, `ArkasSettingController`, `ArkasToolController`, `RkasController`, `RkasPerubahanController`, `BukuKasUmumController`, `ReferensiKodeController`, `RekapitulasiRealisasiController`, `RkasAiReviewController`, `ArkasDiagnosticService`, `CopilotService`, `DeepSeekService`, dan `SyncArkasCatalogCommand`) memanggil `env(...)` langsung. Jika `php artisan config:cache` diaktifkan di produksi, `env()` mengembalikan `null` dan mengunci seluruh aplikasi ke `/license-invalid`.
3. **Belum ada `TrustProxies` & dukungan HTTPS Reverse Proxy (`bootstrap/app.php` & `AppServiceProvider`)**:
   Di balik Cloudflare Tunnel / Nginx / IIS / Caddy, Laravel tidak mempercayai header `X-Forwarded-*` dan belum mendukung skema HTTPS otomatis saat diakses via domain publik, sehingga rawan menghasilkan URL aset/redirect `http://` (Mixed Content & kegagalan CSRF/cookie).
4. **Integrasi ARKAS Desktop (`arkas_engine`) terduplikasi di 8 file & rentan crash saat `arkas.db` tidak ada di VPS**:
   - Logika `python.exe`, `shell_exec("powershell ...")`, dan fallback `'C:\Users\Digitalisasi'` disalin di 8 file.
   - Saat PHP berjalan sebagai Windows Service / FastCGI atau di VPS cloud tanpa `arkas.db` lokal, `ArkasToolController::index()` tetap menjalankan proses Python setiap kali halaman dimuat, dan belum ada mekanisme upload `arkas.db` dari browser.
5. **Kontrol Akses Multi-User & Tulis `.env` langsung**:
   - `ArkasSettingController::savePath` dan `DatabaseController::updateNpsn` menulis langsung ke `.env` tanpa menyegarkan cache config jika `configurationIsCached()` bernilai `true`.
   - Rute sensitif (`/backup/*`, `/pembaharuan/*`, `/arkas-tools/path`) perlu dipastikan hanya boleh dijalankan oleh role `bendahara`.
   - Route `/` (`routes/web.php:36`) memanggil `User::count()` tanpa guard sehingga langsung melempar exception 500 jika tabel `users` belum siap (terbukti pada `Tests\Feature\ExampleTest`).
6. **Ketergantungan CDN saat Offline**:
   - `resources/js/Components/Rkas/RkasAiReviewModal.tsx` menyematkan `<script src="https://cdn.tailwindcss.com"></script>` pada jendela cetak laporan AI, yang rusak saat mode offline.
   - Sejumlah Blade PDF (`resources/views/pelengkap/*_pdf*.blade.php`) memuat stylesheet Google Fonts eksternal yang memperlambat atau berisiko timeout pada DomPDF ketika server offline total.

---

## 2. Arsitektur Solusi (Pendekatan A — Hybrid Config + `ArkasEngineService`)

Desain dibagi ke dalam 5 unit terisolasi dengan batas tanggung jawab yang jelas:

### Unit 1: Konfigurasi Aman `config:cache` & Database PostgreSQL
- **`config/database.php`**:
  Ubah blok `pgsql` agar menggunakan `env()`:
  - `url` → `env('DB_URL')`
  - `host` → `env('DB_HOST', '127.0.0.1')`
  - `port` → `env('DB_PORT', '5432')`
  - `database` → `env('DB_DATABASE', 'newSIKAS')`
  - `username` → `env('DB_USERNAME', 'postgres')`
  - `password` → `env('DB_PASSWORD', 'sikas')`
- **`config/license.php`**:
  Tambahkan konfigurasi terpusat:
  - `'enabled' => filter_var(env('LICENSE_ENABLED', true), FILTER_VALIDATE_BOOLEAN)`
  - `'npsn_code' => trim((string) env('APP_NPSN_CODE', ''))`
- **`config/services.php`**:
  Tambahkan blok `'deepseek'` (`'api_key' => env('DEEPSEEK_API_KEY')`, `'base_url' => env('DEEPSEEK_BASE_URL', 'https://api.deepseek.com')`) dan `'arkas'` atau gunakan `config/arkas.php` terpisah.
- **`config/app.php` & `config/trustedproxy.php`**:
  Tambahkan `'force_https' => filter_var(env('FORCE_HTTPS', false), FILTER_VALIDATE_BOOLEAN)` di `config/app.php`, serta `config/trustedproxy.php` (`'proxies' => env('TRUSTED_PROXIES', '*')`) yang otomatis dibaca oleh middleware bawaan `Illuminate\Http\Middleware\TrustProxies` saat runtime (aman dengan `config:cache`).
- **Migrasi seluruh pemanggilan `env()` di `app/`**:
  Ganti `env(...)` menjadi `config(...)` pada semua controller, middleware, service, dan console command yang teridentifikasi.
- **Sinkronisasi saat `.env` diubah lewat UI (`DatabaseController::updateNpsn`, `ArkasSettingController::savePath`)**:
  Setelah menulis `.env`, perbarui runtime `Config::set(...)` untuk request berjalan dan jalankan `Artisan::call('config:clear')` **hanya jika** `app()->configurationIsCached()` bernilai `true` (agar dev/localhost tidak mengalami restart yang tidak perlu, sementara VPS dengan `config:cache` langsung konsisten).

### Unit 2: Lisensi NPSN Hybrid (`CheckNpsnLicense` & `SekolahProfileController`)
- **`CheckNpsnLicense`**:
  - Baca `config('license.enabled', true)`. Jika `false` (misal pada VPS yang diset `LICENSE_ENABLED=false`), middleware langsung meloloskan request (`return $next($request)`).
  - Jika `true`, baca `config('license.npsn_code')` dan `config('license.allowed_npsn', [])` (tidak lagi memanggil `env()`).
- **`SekolahProfileController`**:
  - Saat `config('license.enabled')` bernilai `true` dan `config('license.npsn_code')` terisi, validasi `Rule::in([$licensedNpsn])` tetap berlaku seperti semula.
  - Saat `config('license.enabled')` bernilai `false`, validasi `npsn` hanya mewajibkan string valid (`required|string|max:20`) dan `unique` saat update, sehingga sekolah di VPS bebas tanpa whitelist hardcoded tetap bisa menyimpan profil sekolahnya.

### Unit 3: Reverse Proxy, HTTPS & Offline Asset Readiness
- **`config/trustedproxy.php` + `Illuminate\Http\Middleware\TrustProxies`**:
  Karena middleware `TrustProxies` sudah terdaftar di Laravel dan membaca `config('trustedproxy.proxies')` saat runtime (setelah `.env` & config cache dimuat), penambahan `config/trustedproxy.php` (`'proxies' => env('TRUSTED_PROXIES', '*')`) membuat header `X-Forwarded-Proto`, `X-Forwarded-Host`, dan `X-Forwarded-For` dari Nginx / Cloudflare Tunnel / Caddy / IIS dibaca dengan benar tanpa memanggil `env()` di `bootstrap/app.php`.
- **`AppServiceProvider::boot()`**:
  Jika `config('app.force_https')` bernilai `true` atau `str_starts_with((string) config('app.url'), 'https://')` pada environment `production` (kecuali saat akses `localhost`/`127.0.0.1` langsung di command/test), panggil `URL::forceScheme('https')` agar seluruh URL Ziggy/Vite/pagination konsisten HTTPS saat diakses lewat domain, tanpa mengganggu akses HTTP lokal bila `FORCE_HTTPS=false` dan `APP_URL=http://...`.
- **`resources/js/Components/Rkas/RkasAiReviewModal.tsx`**:
  Hapus `<script src="https://cdn.tailwindcss.com"></script>` pada template HTML `handlePrint()`, ganti dengan blok `<style>` CSS murni yang sudah mencakup styling tabel, badge, tipografi, dan margin cetak agar tampilan cetak 100% identik baik online maupun offline total.
- **Blade PDF (`resources/views/pelengkap/*_pdf*.blade.php`)**:
  Hapus/ganti `@import url('https://fonts.googleapis.com/...')` dan `<link href="https://fonts.googleapis.com/...">` dengan font fallback sistem (`Times New Roman`, `DejaVu Sans`, `sans-serif`) atau font lokal agar DomPDF tidak melakukan request HTTP keluar yang bisa hang/timeout saat offline.

### Unit 4: `ArkasEngineService` Terpusat + Upload `arkas.db` Hybrid
- **File baru `config/arkas.php`**:
  ```php
  return [
      'db_path' => env('ARKAS_DB_PATH', ''),
      'upload_path' => storage_path('app/arkas_uploads/arkas.db'),
      'engine_dir' => storage_path('app/arkas_engine'),
      'max_upload_mb' => (int) env('ARKAS_MAX_UPLOAD_MB', 100),
  ];
  ```
- **File baru `app/Services/ArkasEngineService.php`**:
  Menjadi satu-satunya pintu eksekusi skrip Python (`query.py`, `dump_rkas.py`, `dump_rkas_perubahan.py`, `dump_bku.py`, `dump_reference.py`, `diagnose_arkas.py`).
  - **Urutan resolusi `arkas.db` (`resolveDatabasePath()`)**:
    1. Jika `config('arkas.db_path')` terisi dan `is_file(...)` → gunakan path tersebut (mode desktop lokal / path server manual).
    2. Jika file hasil upload `config('arkas.upload_path')` ada (`storage/app/arkas_uploads/arkas.db`) → gunakan file upload tersebut (mode VPS cloud).
    3. Jika tidak ada keduanya, biarkan skrip Python melakukan auto-detect `%APPDATA%\Arkas\arkas.db` di host Windows (jika berjalan di PC lokal), **tetapi** `ArkasEngineService` membangun environment Windows secara bersih tanpa fallback hardcoded user pribadi dan dengan cek cepat `isAvailable()` sebelum menjalankan proses berat bila tidak perlu.
  - **Graceful Degradation (Tidak Crash 500)**:
    - Jika `python.exe` atau skrip `.py` tidak ditemukan, atau `arkas.db` tidak tersedia di VPS: kembalikan array terstruktur `['status' => 'error', 'error_type' => 'DB_NOT_FOUND', 'message' => '...']`.
    - Di `ArkasToolController::index()`, kegagalan deteksi tahun ARKAS tetap mengembalikan halaman normal memakai daftar tahun lokal PostgreSQL (`$localYears`) tanpa error.
  - **Refactor 8 Pemanggil**:
    Gantikan metode privat duplikat di `ArkasToolController`, `RkasController`, `RkasPerubahanController`, `BukuKasUmumController`, `ReferensiKodeController`, `SyncArkasCatalogCommand`, `ArkasDiagnosticService`, dan `CopilotService` untuk memakai `ArkasEngineService`.
- **Fitur Upload `arkas.db` via Browser**:
  - Tambah endpoint `POST /arkas-tools/upload-db` (di `routes/variant.php`, middleware `role:bendahara` + `PreventKepalaSekolahMutations`) pada `ArkasSettingController::uploadDb` dan `DELETE /arkas-tools/upload-db` (`removeUploadedDb`).
  - Validasi upload: file wajib, ekstensi `.db`/`.sqlite`, ukuran maks `config('arkas.max_upload_mb')` MB, verifikasi header SQLite/SQLCipher atau tes buka cepat via `ArkasEngineService` sebelum memindahkan ke `storage/app/arkas_uploads/arkas.db` (menolak file korup/bukan DB ARKAS).
  - Update `ArkasSettingController::getPath()` agar turut mengembalikan status sumber aktif (`manual` / `uploaded` / `auto` / `none`), nama/timestamp file upload jika ada, serta update modal Konfigurasi Database ARKAS di `Sidebar.tsx` agar bendahara dapat memilih **isi path server** atau **upload file `arkas.db` dari komputer klien**.

### Unit 5: Guard Route, Otorisasi Multi-User Online & Perbaikan Baseline Test
- **Guard Route `/` (`routes/web.php`)**:
  Bungkus `User::count() > 0` dengan helper aman (`Schema::hasTable('users') && User::count() > 0` atau try-catch `Throwable`) sehingga aplikasi tidak pernah melempar 500 `no such table` sebelum migrasi / saat DB baru.
- **Proteksi Role `bendahara` pada Fitur Administrasi Server**:
  Pastikan rute `/backup/*`, `/pembaharuan/*`, dan `/arkas-tools/path` + `/arkas-tools/upload-db` berada di bawah middleware `role:bendahara` (sejalan dengan `user-management`), karena pada mode online aplikasi dapat dibuka oleh `kepala_sekolah` maupun user lain.
- **Kompatibilitas `SystemUpdate` di Windows VPS**:
  Tetap aktif sesuai keputusan pengguna untuk role `bendahara`, dengan memastikan `SystemUpdateController` memiliki pesan error informatif jika izin tulis direktori aplikasi tidak mencukupi.
- **Perbaikan Baseline Tests (`ExampleTest`, `ProfileTest`, `RegistrationTest`)**:
  Catatan: test bawaan Breeze tersebut gagal karena perubahan fitur lokal (`username` wajib & `profile.destroy` dihapus); kita akan memverifikasi test spesifik readiness online/offline baru + mengecek apakah test Breeze perlu disesuaikan atau dilaporkan terpisah agar tidak mencampur scope yang tidak diminta (selain `ExampleTest` yang langsung teratasi oleh guard `/` + `RefreshDatabase`).

---

## 3. Batasan & Non-Scope
- Tidak mengubah skema tabel inti varian (`reguler`, `kinerja`, `silpa`, `kinerja_silpa`).
- Tidak memindahkan engine `arkas_engine` ke Linux (target server adalah Windows VPS / Server lokal sekolah).
- Tidak memodifikasi skrip Inno Setup (`*.iss`) maupun skrip ad-hoc di root repo.

---

## 4. Rencana Verifikasi Setelah Implementasi
1. **PHPUnit Tests Baru**:
   - Uji `config/database.php` `pgsql` membaca `DB_*` dari env/config.
   - Uji `CheckNpsnLicense` saat `LICENSE_ENABLED=true/false` dan saat config di-set via `Config::set` (simulasi `config:cache`).
   - Uji `TrustProxies` & `FORCE_HTTPS` pada request dengan header `X-Forwarded-Proto: https`.
   - Uji `ArkasEngineService` saat `arkas.db` tidak ada (graceful error tanpa exception) dan prioritas path manual vs upload.
   - Uji otorisasi role `kepala_sekolah` ditolak (`403`) pada endpoint `/backup/*`, `/pembaharuan/*`, dan `/arkas-tools/upload-db`.
2. **Simulasi Build & Cache Produksi**:
   - Jalankan `php artisan config:cache`, `php artisan route:cache`, verifikasi artisan/route test berjalan tanpa error, lalu jalankan `php artisan optimize:clear` agar workspace bersih.
   - Jalankan `npm run build` (`tsc && vite build`) dan pastikan 0 error.
   - Jalankan `composer test` dan laporkan hasil lengkapnya.
