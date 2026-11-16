# Desain Fitur Pembaharuan Aplikasi (In-App Auto Updater berbasis Inno Setup & GitHub Releases)

Tanggal: 2026-11-15  
Status: Disetujui User (Tahap Perencanaan)  
Ruang Lingkup:
- Installer Inno Setup: [install_beta.iss](file:///C:/laragon/www/newSIKAS2/install_beta.iss) & [install_demo.iss](file:///C:/laragon/www/newSIKAS2/install_demo.iss)
- Konfigurasi Backend: `config/updater.php`
- Layanan & Controller Backend: `app/Services/SystemUpdaterService.php`, `app/Http/Controllers/SystemUpdateController.php`
- Shared Inertia Props: [HandleInertiaRequests.php](file:///c:/laragon/www/newSIKAS2/newSIKAS/app/Http/Middleware/HandleInertiaRequests.php)
- Navigasi & Halaman Frontend: [Sidebar.tsx](file:///c:/laragon/www/newSIKAS2/newSIKAS/resources/js/Components/Sidebar.tsx) & `resources/js/Pages/SystemUpdate/Index.tsx`

---

## 1. Latar Belakang & Permasalahan

Aplikasi **newSIKAS** didistribusikan ke sekolah-sekolah menggunakan installer **Inno Setup** (`install_beta.iss`) yang membungkus:
1. Runtime PHP (`{app}\php`), Apache (`{app}\serverapp` sebagai service `newsikas_server` di port `8773`), dan PostgreSQL (`{app}\pgsql` sebagai service `newsikas_DB`).
2. Folder data PostgreSQL sekolah (`{app}\dbapp`).
3. Kode aplikasi Laravel + React hasil build dan obfuscation Yakpro-po (`{app}\wwwroot`).
4. File konfigurasi instalasi (`{app}\configapp\install.ini`) dan lisensi NPSN (`C:\ProgramData\SIKAS\.env`).

Sebelumnya, setiap kali ada pembaruan aplikasi, pengguna harus mengunduh dan menginstal secara manual di luar aplikasi, serta terdapat 4 risiko fatal pada `install_beta.iss`:
1. **Risiko Database Tertimpa:** Baris `Source: "dbapp\*"; DestDir: "{app}\dbapp"` belum memiliki proteksi mode update, sehingga berisiko menimpa database riil sekolah dengan database kosong bawaan installer.
2. **Risiko Lisensi NPSN Terhapus:** Saat dijalankan dalam mode `/VERYSILENT`, nilai `NpsnPage.Values[0]` kosong dan `php artisan sikas:secure-env` menimpa `C:\ProgramData\SIKAS\.env` milik sekolah.
3. **Risiko File Terkunci (File In-Use):** Service `newsikas_server` (`httpd.exe`) dan `newsikas_DB` (`postgres.exe`) baru dihentikan pada `ssPostInstall` (setelah penyalinan `[Files]`), sehingga saat update berjalan di atas instalasi aktif, file `.exe` dan `.dll` sedang terkunci oleh Windows.
4. **Versi Statis & Belum Auto-Migrate:** `CreateConfigFile` masih menulis `version=2026.0` secara *hardcode* dan belum menjalankan `php artisan migrate --force` pada tahap post-install untuk menyinkronkan skema tabel baru.

---

## 2. Keputusan Arsitektur

1. **Mekanisme Eksekusi Update:**
   Menggunakan **Satu File Full Installer (`install_beta.iss`) Pintar** yang mampu mendeteksi apakah sedang dijalankan sebagai **Instalasi Baru** atau **Mode Pembaharuan (`/VERYSILENT /SUPPRESSMSGBOXES /NORESTART /UPDATE`)**.
2. **Sumber Distribusi Online:**
   Menggunakan **GitHub Releases** pada repository publik khusus rilis (`Mohdarsana79/newSIKAS-releases`) yang hanya berisi paket installer `.exe` hasil obfuscation tanpa source code mentah, sehingga tidak memerlukan Personal Access Token (`'token' => ''`) dan bebas dari batas waktu kedaluwarsa token selamanya.
3. **Penempatan UI & Hak Akses:**
   - Menu **Pembaharuan** ditempatkan di [Sidebar.tsx](file:///c:/laragon/www/newSIKAS2/newSIKAS/resources/js/Components/Sidebar.tsx) di bawah grup **Sistem** (tepat di bawah **Backup Database**), khusus untuk role Bendahara/Operator (`!isKepalaSekolah`).
   - Memiliki halaman khusus (`/pembaharuan`) bergaya **Neo-Bento** lengkap dengan informasi versi, catatan rilis (*Changelog*), progres tahapan update, serta fitur **Upload File Update (`.exe`) Manual** untuk sekolah dengan koneksi internet tidak stabil.
4. **Pengecekan Versi Berkala (Cached Background Check):**
   - Status ketersediaan versi baru disimpan di cache lokal selama 24 jam agar tidak membebani waktu muat halaman.
   - Jika tersedia versi yang lebih baru dari versi terpasang, menu **Pembaharuan** di Sidebar menampilkan badge indikator **`BARU`**.
   - Pengguna juga dapat menekan tombol **Cek Pembaharuan Sekarang** kapan saja untuk memaksa pengecekan langsung ke GitHub API (`force_refresh`).
5. **Pengaman Data (Mandatory Pre-Update Backup):**
   Sebelum installer pembaharuan dieksekusi (baik dari hasil unduhan online maupun unggahan file `.exe` manual), sistem **wajib membuat cadangan (backup) database otomatis** (`pre_update_v{versi}_{timestamp}.rsv`) ke `storage/app/backups`.

---

## 3. Desain Teknis Detail

### 3.1 Modifikasi Pintar pada [install_beta.iss](file:///C:/laragon/www/newSIKAS2/install_beta.iss)

1. **Definisi Versi Terpusat (Preprocessor):**
   ```iss
   #define MyAppVersion "2026.29"
   ```
   Digunakan pada `AppVersion={#MyAppVersion}`, `AppVerName=newSIKAS {#MyAppVersion}`, dan di dalam `CreateConfigFile` (`'version={#MyAppVersion}'`).

2. **Fungsi Deteksi `IsUpgradeMode(): Boolean`:**
   Bernilai `True` apabila salah satu kondisi berikut terpenuhi:
   - Terdapat argumen command-line `/UPDATE` (dikirim oleh fitur Pembaharuan dari dalam aplikasi).
   - File lisensi `{commonappdata}\SIKAS\.env` **dan** file database `{app}\dbapp\PG_VERSION` sudah ada di komputer klien.

3. **Proteksi Direktori Database & File Konfigurasi (`[Files]`):**
   - Baris `Source: "dbapp\*"` ditambahkan klausa `Check: not IsUpgradeMode` agar folder `dbapp` **tidak pernah disentuh** saat proses pembaharuan.
   - File `wwwroot\.env` tidak menimpa konfigurasi lisensi yang sudah diamankan di `C:\ProgramData\SIKAS\.env`.

4. **Melewati Wizard NPSN saat Update (`ShouldSkipPage` & `NextButtonClick`):**
   - Menambahkan fungsi `ShouldSkipPage(PageID: Integer): Boolean` yang mengembalikan `True` untuk `NpsnPage.ID` apabila `IsUpgradeMode()` bernilai `True`.

5. **Penghentian Service Sebelum Penyalinan File (`PrepareToInstall`):**
   - Menambahkan event `function PrepareToInstall(var NeedsRestart: Boolean): String;` yang menjalankan `net stop newsikas_server` dan `net stop newsikas_DB` sebelum Inno Setup mengekstrak `[Files]`, sehingga seluruh file di `wwwroot`, `php`, `serverapp`, dan `pgsql` bebas dari *file lock* Windows.

6. **Urutan `ssPostInstall` untuk Mode Install Baru vs Mode Update:**
   - `CreateConfigFile` (memperbarui `configapp\install.ini` dengan `version={#MyAppVersion}`).
   - `UpdateServerConfig` (memastikan path `httpd.conf` dan `php.ini` sesuai `{app}`).
   - **Kondisional Lisensi NPSN:**
     - Jika **Install Baru** (`not FileExists(ExpandConstant('{commonappdata}\SIKAS\.env'))`): jalankan `AppendNpsnToEnv` lalu `php artisan sikas:secure-env`.
     - Jika **Mode Update** (`FileExists(ExpandConstant('{commonappdata}\SIKAS\.env'))`): hapus `{app}\wwwroot\.env` bawaan paket baru agar aplikasi tetap membaca `C:\ProgramData\SIKAS\.env` milik sekolah.
   - **Registrasi & Start Database Terlebih Dahulu:**
     - Jalankan registrasi/start `newsikas_DB` (PostgreSQL).
   - **Migrasi Skema & Optimasi Laravel:**
     - Jalankan `php.exe artisan migrate --force` (agar tabel/kolom baru pada rilis terbaru otomatis diterapkan ke database sekolah).
     - Jalankan `php.exe artisan storage:link` dan `php.exe artisan optimize:clear`.
   - **Start Web Server:**
     - Jalankan registrasi/start `newsikas_server` (Apache).

---

### 3.2 Konfigurasi Backend (`config/updater.php`)

File konfigurasi baru yang akan ikut di-obfuscate oleh Yakpro-po (karena `config/` tidak masuk dalam `$conf->t_skip` di `yakpro-po.cnf`):
```php
<?php

return [
    // Versi aplikasi saat ini (fallback jika ../configapp/install.ini tidak ditemukan saat dev)
    'version' => '2026.29',

    // Konfigurasi GitHub Releases (Repository Privat)
    'github' => [
        'owner' => 'Mohdarsana79',
        'repo' => 'newSIKAS',
        // Fine-Grained PAT dengan izin Read-Only pada Contents (Releases)
        'token' => '',
        'asset_pattern' => '/^newSIKAS_Installer_.*\.exe$/i',
    ],

    // Durasi cache pengecekan otomatis (dalam detik, default 24 jam)
    'cache_ttl' => 86400,
];
```

**Resolusi Versi Aktif (`SystemUpdaterService::getCurrentVersion()`):**
1. Membaca `dirname(base_path()) . '/configapp/install.ini'` jika ada (lingkungan produksi Inno Setup).
2. Mengambil nilai yang lebih tinggi (`version_compare`) antara `install.ini` dan `config('updater.version')` agar selalu akurat baik di lingkungan development (Laragon) maupun produksi (`C:\Program Files\newSIKAS`).

---

### 3.3 Layanan Backend (`app/Services/SystemUpdaterService.php`) & Endpoint

| Method | URI | Route Name | Middleware | Fungsi |
|---|---|---|---|---|
| `GET` | `/pembaharuan` | `system-update.index` | `auth` | Menampilkan halaman Pembaharuan (`SystemUpdate/Index`) |
| `POST` | `/pembaharuan/check` | `system-update.check` | `auth` | Memeriksa rilis terbaru ke GitHub API (`force_refresh = true`) |
| `POST` | `/pembaharuan/start-online` | `system-update.start-online` | `auth` | Memulai proses update online (Auto-Backup -> Download `.exe` -> Trigger Detached Installer) |
| `POST` | `/pembaharuan/upload-manual` | `system-update.upload-manual` | `auth` | Mengunggah file installer `.exe` manual -> Auto-Backup -> Trigger Detached Installer |
| `GET` | `/pembaharuan/progress/{updateId}` | `system-update.progress` | Tanpa Session/DB | Endpoint ringan untuk *polling* progres download, instalasi, & deteksi server hidup kembali |

> [!IMPORTANT]
> Endpoint `/pembaharuan/progress/{updateId}` didaftarkan menggunakan `->withoutMiddleware([...])` (sama seperti `/backup/restore-progress/{restoreId}` di `routes/web.php`) agar tetap dapat merespons dengan sangat cepat tanpa bergantung pada koneksi database ketika PostgreSQL dan Apache baru saja menyala kembali.

**Mekanisme Peluncuran Detached Installer (`triggerSilentInstaller`):**
Agar proses installer tidak ikut mati saat installer menghentikan service `newsikas_server` (`httpd.exe`), PHP membuat skrip batch sementara di luar folder `wwwroot` (misal di `sys_get_temp_dir() . '\sikas_updater_' . $updateId . '.bat'`) yang berisi:
1. Menunggu 2 detik (`timeout /t 2 /nobreak > NUL`) agar PHP sempat menyelesaikan pengiriman respons HTTP ke browser.
2. Menjalankan installer dengan flag silent penuh:
   `"{path_to_installer.exe}" /VERYSILENT /SUPPRESSMSGBOXES /NORESTART /CLOSEAPPLICATIONS /UPDATE /LOG="{temp}\sikas_update.log"`
3. Memperbarui file status progres menjadi `completed` (atau menghapus file installer sementara setelah selesai).
4. Diluncurkan secara independen menggunakan `pclose(popen('start /B "" cmd /c "' . $batPath . '"', 'r'))`.

---

### 3.4 Desain UI Neo-Bento (`resources/js/Pages/SystemUpdate/Index.tsx` & `Sidebar.tsx`)

1. **Menu Sidebar (`Sidebar.tsx`):**
   - Di bawah seksi **Sistem** (`!isKepalaSekolah`), tepat di bawah `Backup Database`, ditambahkan `NavLink` **Pembaharuan** (`route('system-update.index')`) dengan ikon `RefreshCw` / panah pembaruan.
   - Jika `props.systemUpdate?.hasUpdate === true` (dari shared props `HandleInertiaRequests`), tampilkan badge pil `bg-lime-400 text-slate-950 text-[9px] font-extrabold px-1.5 py-0.5 rounded-full` bertuliskan **`BARU`**.

2. **Halaman `/pembaharuan` (`SystemUpdate/Index.tsx`):**
   - **Header (`PageHeader`)**: Judul *"Pembaharuan Sistem"*, subtitle *"Periksa versi terbaru, tinjau catatan rilis, dan perbarui aplikasi SIKAS secara otomatis"*, dilengkapi tombol **Cek Pembaharuan Sekarang**.
   - **Baris Statistik 3 Kartu (`Surface` Neo-Bento)**:
     1. **Versi Terpasang:** `v2026.29` + status lisensi & lingkungan.
     2. **Status Pembaharuan:** Badge `Sudah Versi Terbaru` (`mint`) atau `Tersedia v2026.xx` (`lime`/`amber`) + waktu pengecekan terakhir.
     3. **Cadangan Pra-Update:** Informasi kapan backup database terakhir dibuat.
   - **Grid Utama 2 Kolom (`lg:grid-cols-12`)**:
     - **Kolom Kiri (`lg:col-span-7`) — Detail Rilis & Catatan Pembaharuan (Changelog):**
       - Jika ada versi baru: Menampilkan judul rilis, tanggal publikasi, ukuran file `.exe`, daftar perubahan (*Changelog*), serta tombol utama **Perbarui Aplikasi Sekarang**.
       - Jika sudah versi terbaru: Menampilkan *EmptyState* / ilustrasi bahwa aplikasi sudah menggunakan rilis paling mutakhir beserta catatan rilis versi saat ini.
     - **Kolom Kanan (`lg:col-span-5`) — Pembaharuan Manual (Mode Offline / Koneksi Lambat):**
       - Kotak unggah file `.exe` (`newSIKAS_Installer_*.exe`) bagi operator sekolah yang mengunduh file installer secara terpisah.
       - Dilengkapi daftar jaminan keamanan (*Database sekolah tidak akan tertimpa*, *Auto-backup otomatis dibuat sebelum update*, *Lisensi NPSN tetap tersimpan*).
   - **Modal Progres Pembaharuan (`Neo-Bento Modal`):**
     - Menampilkan 4 langkah progres nyata:
       1. **Tahap 1:** Membuat cadangan database otomatis (`.btb`)...
       2. **Tahap 2:** Mengunduh / Memverifikasi paket installer `.exe` (0% – 100%)...
       3. **Tahap 3:** Menjalankan Silent Installer & memulai ulang layanan server (ketika Apache mati sementara selama ~15–25 detik, frontend otomatis menangkap error jaringan *connection refused* sebagai status normal *"Sedang memasang file & me-restart Apache, mohon tunggu..."* dan terus melakukan *polling* setiap 2 detik).
       4. **Tahap 4:** Saat server kembali merespons dan melaporkan versi baru telah terpasang, tampilkan layar sukses **`Pembaharuan Berhasil ke v2026.xx!`** dengan tombol **Muat Ulang Aplikasi**.

---

## 4. Kriteria Keberhasilan & Pengujian
1. **Keamanan Data Sekolah:** Eksekusi `install_beta.iss` pada mode `/UPDATE` tidak pernah menimpa folder `dbapp` maupun menghapus `APP_NPSN_CODE` di `C:\ProgramData\SIKAS\.env`.
2. **Keamanan Kredensial:** Token GitHub hanya disimpan di `config/updater.php` (bukan di `.env`) sehingga ikut ter-obfuscate saat menjalankan `./protect.ps1`.
3. **Kualitas Kode & Build:** Lolos `npm run build` (`tsc && vite build`), `vendor/bin/pint`, dan pengujian fitur (`composer test`).
