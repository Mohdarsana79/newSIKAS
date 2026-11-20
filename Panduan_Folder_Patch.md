# Panduan Struktur & Alur Pembuatan Patch Installer newSIKAS

Dokumen ini merangkum arsitektur, struktur folder, aturan penanganan perubahan kode/database/server/PHP, serta SOP langkah demi langkah untuk merilis **Patch Installer ringan (`newSIKAS_Patch_*.exe`)** pada fitur Pembaharuan Sistem newSIKAS.

---

## 1. Prinsip Dasar & Struktur Folder Patch

Anda **tidak perlu membuat folder baru** untuk merilis Patch. Struktur direktori Patch **menggunakan folder kerja dan alur `./protect.ps1` yang sama** dengan Full Installer:

```text
c:\laragon\www\newSIKAS2\
├── newSIKAS\                <-- Source code Laravel + React (tempat Anda coding)
├── wwwroot\                 <-- Hasil obfuscate otomatis dari ./protect.ps1
├── php\                     <-- Runtime PHP & file php\php.ini
├── serverapp\               <-- Runtime Apache & file serverapp\conf\httpd.conf
├── pgsql\                   <-- Engine PostgreSQL (diabaikan saat Patch)
├── dbapp\                   <-- Database awal kosong (DILARANG masuk Patch)
├── ico\                     <-- Ikon installer
├── Output\                  <-- Hasil compile .exe dari Inno Setup
├── protect.ps1              <-- Script obfuscate PHP, JS, Blade, & Python
├── install_beta.iss         <-- Script untuk FULL INSTALLER (instalasi komputer baru)
└── install_patch.iss        <-- Script untuk PATCH INSTALLER (ringan ~18 MB)
```

### Perbedaan Full Installer (`install_beta.iss`) vs Patch Installer (`install_patch.iss`)

| Komponen | `install_beta.iss` (Full) | `install_patch.iss` (Patch) |
|---|---|---|
| Nama output default | `newSIKAS_Installer_2026_xx.exe` | `newSIKAS_Patch_2026_xx.exe` |
| Folder kode `wwwroot\` | ✅ Ya | ✅ Ya (tanpa `libreoffice`, runtime `arkas_engine`, cache, temp, logs, `.env`, backup) |
| Script Python `arkas_engine\*.py` | ✅ Ya | ✅ Ya |
| `libreoffice\` (682 MB) & `pgsql\` (140 MB) | ✅ Ya | ❌ Dilewati (sudah ada di laptop sekolah) |
| `dbapp\` & `VC_redist.x64.exe` | ✅ Ya (saat install baru) | ❌ Tidak pernah disertakan |
| `php\php.ini` & `serverapp\conf\httpd.conf` | ✅ Ya | ✅ Otomatis ikut diperbarui |
| Folder binary `php\*` & `serverapp\*` | ✅ Ya | ⚙️ Opsional (via saklar di `install_patch.iss`) |
| Uninstaller (`Uninstallable`) | `yes` | `no` (tidak menimpa uninstaller utama) |

> **Prioritas di GitHub Releases:** Apabila Anda mengunggah `newSIKAS_Patch_*.exe` sekaligus `newSIKAS_Installer_*.exe` pada rilis GitHub yang sama, aplikasi newSIKAS di laptop sekolah **otomatis memprioritaskan mengunduh file `newSIKAS_Patch_*.exe`**.

---

## 2. Skenario Perubahan & Cara Menanganinya di Patch

### A. Perbaikan / Penambahan Fitur Aplikasi (Penganggaran, RKAS, BKU, PDF, UI)
Mencakup perubahan pada:
- Controller, Model, Service, Request, Routes (`app/`, `routes/`, `config/`)
- Halaman Frontend React TypeScript (`resources/js/`)
- Template cetakan PDF Blade (`resources/views/`)

**Alur kerja:**
1. Jalankan `npm run build` di folder `newSIKAS\`.
2. Jalankan `php artisan optimize:clear`.
3. Jalankan `./protect.ps1` di folder root (`c:\laragon\www\newSIKAS2`) untuk menghasilkan folder `wwwroot\` terproteksi.
4. Compile `install_patch.iss` — seluruh perubahan di `wwwroot\*` otomatis masuk ke Patch (kecuali file runtime/data user seperti `storage\app\backups`, `storage\app\public`, `storage\logs`, `temp`, cache, dan `.env`).

---

### B. Perubahan Struktur Database (Tabel Baru, Kolom Baru, atau Data Referensi)
> **PENTING:** Folder `dbapp\*` tidak boleh pernah ditimpa saat update agar database asli sekolah (RKAS, BKU, Pajak, Sekolah Profile) tetap aman.

**Aturan wajib untuk perubahan database:**
1. **Selalu buat Laravel Migration** di `newSIKAS/database/migrations/` (contoh: `php artisan make:migration add_kolom_baru_to_penganggarans_table`).
2. Jika ada penambahan data referensi/master default baru, masukkan menggunakan query idempoten di dalam metode `up()` migration tersebut (misalnya `DB::table(...)->updateOrInsert(...)`), bukan hanya di Seeder — karena `database/seeders` sengaja dibersihkan oleh `protect.ps1`.
3. Pastikan migration **aman dijalankan berulang/idempoten** (`if (! Schema::hasColumn(...))` atau `if (! Schema::hasTable(...))`).
4. Saat `newSIKAS_Patch_*.exe` dipasang di laptop klien:
   - Service PostgreSQL (`newsikas_DB`) tetap dipastikan aktif (`net start newsikas_DB`).
   - Installer otomatis menjalankan `php.exe artisan migrate --force` dan `php.exe artisan optimize:clear`.

---

### C. Perubahan pada Folder `serverapp\` (Apache)

1. **Hanya mengubah `serverapp\conf\httpd.conf`** (misalnya menambah `TimeOut 1800`, header, modul, atau directive):
   - Tidak perlu mengubah apa pun! `install_patch.iss` **sudah menyertakan `serverapp\conf\httpd.conf` secara otomatis**, lalu `UpdateServerConfig` akan menyesuaikan `Define APPPATH` agar tetap cocok dengan folder instalasi di laptop klien.
2. **Mengubah file program/binary Apache (`serverapp\bin\`, `serverapp\modules\`, dsb.):**
   - Buka `install_patch.iss` dan ubah baris paling atas menjadi:
     ```iss
     #define IncludeServerAppFolder 1
     ```
   - Sebelum menyalin file, `PrepareToInstall` sudah menghentikan Apache (`net stop newsikas_server` + `taskkill /F /IM httpd.exe`), sehingga file `httpd.exe` maupun `.so`/`.dll` aman ditimpa.
   - Setelah rilis tersebut selesai, kembalikan nilainya menjadi `0` untuk patch kode biasa berikutnya.

---

### D. Perubahan pada Folder `php\` (PHP Runtime & Konfigurasi)

1. **Hanya mengubah `php\php.ini`** (misalnya `memory_limit`, `max_execution_time`, `upload_max_filesize`, atau mengaktifkan `extension=` yang `.dll`-nya sudah tersedia):
   - Tidak perlu mengubah apa pun! `install_patch.iss` **sudah menyertakan `php\php.ini` secara otomatis** (~70 KB).
   - Prosedur `UpdateServerConfig` otomatis memperbarui `extension_dir` dan `cacert.pem` agar sesuai lokasi instalasi di laptop klien.
2. **Menambah file `.dll` baru di `php\ext\` atau meng-upgrade versi PHP:**
   - Buka `install_patch.iss` dan ubah baris paling atas menjadi:
     ```iss
     #define IncludePhpFolder 1
     ```
   - Kembalikan ke `0` pada rilis patch berikutnya jika folder `php\` tidak berubah lagi.

---

## 3. SOP Langkah Demi Langkah Merilis Patch Baru

Misalnya Anda akan merilis patch versi **`2026.32`**:

1. **Samakan Nomor Versi di 3 File Utama:**
   - `newSIKAS\config\updater.php` -> `'version' => '2026.32',`
   - `install_patch.iss` -> `#define MyAppVersion "2026.32"`
   - `install_beta.iss` -> `#define MyAppVersion "2026.32"`
2. **Aktifkan Saklar Opsional di `install_patch.iss` (Hanya Jika Perlu):**
   - Biarkan `0` jika hanya ada ubahan kode aplikasi/migration/`php.ini`/`httpd.conf`.
   - Set ke `1` pada `IncludePhpFolder` atau `IncludeServerAppFolder` hanya jika mengubah `.dll`/`.exe` PHP atau Apache.
3. **Verifikasi & Build di Folder `newSIKAS\`:**
   ```powershell
   composer test
   npm run build
   php artisan optimize:clear
   ```
4. **Pastikan Database Lokal Mati, Lalu Proteksi Kode di Root (`c:\laragon\www\newSIKAS2\`):**
   ```powershell
   ./pgsql/bin/pg_ctl.exe -D ./dbapp stop
   ./protect.ps1
   ```
5. **Compile Installer di Inno Setup Compiler:**
   - Buka `c:\laragon\www\newSIKAS2\install_patch.iss` -> klik **Compile**.
   - Hasil file siap rilis tersimpan di `c:\laragon\www\newSIKAS2\Output\newSIKAS_Patch_2026_32.exe`.
6. **Publikasikan ke GitHub Releases (`Mohdarsana79/newSIKAS-releases`):**
   - Buat Release baru dengan Tag **`v2026.32`**.
   - Isi ringkasan perbaikan (Changelog) agar muncul di halaman Pembaharuan Aplikasi.
   - Upload **`newSIKAS_Patch_2026_32.exe`** (dan opsional `newSIKAS_Installer_2026_32.exe` untuk pengguna instalasi baru).
   - Klik **Publish release**.

---

## 4. Checklist Verifikasi Cepat Sebelum Publish

- [ ] Nomor versi di `config/updater.php`, `install_patch.iss`, dan GitHub Tag (`v2026.xx`) identik.
- [ ] Perubahan skema DB sudah ditulis dalam `database/migrations/` dan bersifat aman dijalankan di database klien.
- [ ] Kredensial rahasia (DB, SMTP, API Key) tetap berada di file `config/*.php` agar ikut ter-obfuscate oleh `protect.ps1`, **bukan** di `.env`.
- [ ] `npm run build` dan `./protect.ps1` sudah dijalankan setelah edit terakhir sebelum compile `install_patch.iss`.
- [ ] Nama file hasil build mengikuti pola yang dikenali updater (`newSIKAS_Patch_*.exe` atau `newSIKAS_Installer_*.exe`).
