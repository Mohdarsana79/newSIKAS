# Implementation Plan: Backup & Restore Terpadu (Database & File Unggahan Storage)

**Tanggal Rencana:** 11 November 2026  
**Status:** Siap Dieksekusi  
**Dokumen Desain Referensi:** [`docs/superpowers/specs/2026-11-11-backup-restore-storage-files-design.md`](file:///c:/laragon/www/newSIKAS2/newSIKAS/docs/superpowers/specs/2026-11-11-backup-restore-storage-files-design.md)

---

## 1. Ringkasan Tugas & Tujuan

Memperbaiki fitur Backup & Restore pada modul basis data agar:
1. **Mengikutsertakan File Unggahan Pengguna:**
   - Folder `storage/app/public/` (gambar kop surat, logo pemda, logo sekolah, dll).
   - Folder `storage/app/private/sk_surat/` (template docx SK/surat dan arsip dokumen fisik).
   - Mengabaikan folder sistem: `libreoffice/`, `arkas_engine/`, `temp/`, `backups/`.
2. **Kemas dalam 1 Berkas `.rsv` (All-in-One):** Menggunakan `ZipArchive` terkompresi berisi `database.sql`, `manifest.json`, serta struktur folder `storage/public/` dan `storage/private/`.
3. **Kompatibilitas Penuh (Backward Compatibility):** Mendeteksi format file secara cerdas saat restore. Jika file backup berupa file SQL mentah versi lama, proses restore database tetap berjalan normal.
4. **Strategi Pemulihan Merge & Overwrite:** Menimpa file dengan path/nama yang sama saat restore tanpa merusak file sistem lainnya.
5. **Kapasitas Upload Hingga 2 GB:** Menaikkan batas ukuran upload restore menjadi 2 GB (2097152 KB).
6. **Penyempurnaan UI/UX:** Menampilkan panduan dan notifikasi yang jelas pada `Backup/Index.tsx`.

---

## 2. Rincian Perubahan File & Tahapan Eksekusi

### Tahap 1: Backend Controller (`app/Http/Controllers/DatabaseController.php`)

#### A. Tambahkan Helper Rekursif ZIP & Direktori:
- `addFolderToZip(\ZipArchive $zip, string $sourcePath, string $zipPrefix, array $excludeDirs = []): int`
  - Menelusuri seluruh file dalam `$sourcePath` secara rekursif.
  - Memasukkan file ke dalam arsip ZIP dengan path `$zipPrefix/...`.
  - Mengabaikan folder/file tersembunyi (`.gitignore`, `.DS_Store`) dan direktori yang ada dalam daftar `$excludeDirs`.
  - Mengembalikan jumlah file yang berhasil dikemas.
- `extractZipSubdir(\ZipArchive $zip, string $zipPrefix, string $destPath): int`
  - Mengekstrak berkas di dalam prefix tertentu (misal `storage/public/`) ke folder tujuan (`storage/app/public/`).
  - Menjamin folder tujuan otomatis dibuat jika belum ada.
  - Mengembalikan jumlah file yang berhasil diekstrak.

#### B. Refaktor Method `backup(Request $request)`:
1. Pastikan batas waktu eksekusi cukup longgar:
   ```php
   @ini_set('max_execution_time', '600');
   @ini_set('memory_limit', '1024M');
   ```
2. Buat direktori temporer unik di `storage/app/temp/backup_{timestamp}/`.
3. Jalankan `pg_dump` ke file sementara `database.sql` di dalam folder temporer tersebut.
4. Inisialisasi `ZipArchive` baru untuk file tujuan di `storage/app/backups/{fileName}.rsv`.
5. Tambahkan `database.sql` ke dalam arsip ZIP.
6. Kemas file-file storage pengguna:
   - Sumber 1: `storage_path('app/public')` -> dimasukkan ke prefix `storage/public/`.
   - Sumber 2: `storage_path('app/private/sk_surat')` -> dimasukkan ke prefix `storage/private/sk_surat/`.
   - Pastikan direktori sistem (`libreoffice`, `arkas_engine`, `temp`, `backups`) dikecualikan.
7. Buat file `manifest.json` berisi metadata (versi, npsn, created_at, total file, dll) dan tambahkan ke arsip ZIP.
8. Tutup objek `ZipArchive`.
9. Hapus file temporer `database.sql` dan folder kerja sementaranya.
10. Kembalikan response redirect back dengan pesan sukses informatif:
    `"Backup berhasil dibuat: {fileName} (Database + {count} berkas unggahan)"`.

#### C. Refaktor Method `restore(Request $request)`:
1. Perbarui validasi:
   ```php
   $request->validate([
       'backup_file' => 'required|file|extensions:rsv,btb,sql|max:2097152',
   ]);
   ```
2. Pastikan batas waktu eksekusi:
   ```php
   @ini_set('max_execution_time', '600');
   @ini_set('memory_limit', '1024M');
   ```
3. Deteksi tipe file menggunakan `ZipArchive::open()`:
   - **Kondisi A: File adalah ZIP Archive**:
     1. Siapkan folder temporer `storage/app/temp/restore_{timestamp}/`.
     2. Ekstrak `database.sql` dari ZIP ke folder temporer.
     3. Jalankan restore skema & data PostgreSQL dari file `database.sql` yang diekstrak:
        - `DROP SCHEMA public CASCADE`
        - `CREATE SCHEMA public`
        - `GRANT ALL ON SCHEMA public TO public`
        - Jalankan `psql` dengan file `database.sql`
        - Panggil `$this->resetSequences()`
        - Panggil `Artisan::call('migrate', ['--force' => true])`
     4. Ekstrak file storage:
        - Ekstrak berkas dari `storage/public/` dalam ZIP ke `storage_path('app/public')`.
        - Ekstrak berkas dari `storage/private/` dalam ZIP ke `storage_path('app/private')`.
     5. Bersihkan file temporer di `storage/app/temp/restore_{timestamp}/`.
     6. Kembalikan pesan sukses:
        `"Database dan {count} file berkas berhasil dipulihkan (restore)"`.
   - **Kondisi B: File adalah Raw SQL Polos (Legacy)**:
     1. Jalankan proses pemulihan database `psql` langsung seperti sebelumnya.
     2. Jalankan `$this->resetSequences()` dan `Artisan::call('migrate', ['--force' => true])`.
     3. Kembalikan pesan sukses:
        `"Database versi legacy berhasil dipulihkan (tanpa berkas)"`.

---

### Tahap 2: Frontend UI (`resources/js/Pages/Backup/Index.tsx`)

1. **Card / Form Buat Backup**:
   - Tambahkan badge keterangan:
     `"Mencakup Database & Seluruh Berkas Unggahan (Kop Surat, Logo Daerah/Sekolah, Template & Arsip Dokumen)"`
   - Berikan teks bantuan kecil yang ramah.
2. **Modal Konfirmasi Restore**:
   - Berikan informasi bahwa file cadangan terpadu (.rsv) akan memulihkan data database sekaligus file media/kop surat dan dokumen.
   - Tambahkan keterangan: *"Format backup lama (SQL murni) tetap didukung."*
3. **Statistik / Info Batas Ukuran**:
   - Tampilkan informasi bahwa batas maksimal file restore adalah 2 GB.

---

### Tahap 3: Pengujian & Validasi

1. **Syntax Check & Build Verification**:
   - `php -l app/Http/Controllers/DatabaseController.php`
   - `npm run build` (tsc & vite build tanpa error).
2. **Uji Fungsional Backup**:
   - Eksekusi pembuatan backup baru.
   - Verifikasi integritas file `.rsv` yang dihasilkan: buka sebagai ZIP dan pastikan `database.sql`, `manifest.json`, serta file di `storage/public/kop_surat` dan `storage/private/sk_surat` tersimpan.
3. **Uji Fungsional Restore All-in-One**:
   - Lakukan tes simulasi: hapus sementara file kop surat dari `storage/app/public/kop_surat/`.
   - Lakukan restore menggunakan file `.rsv` yang baru dibuat.
   - Verifikasi bahwa file kop surat kembali ada di disk dan database tetap konsisten.
4. **Uji Kompatibilitas Mundur (Legacy)**:
   - Pastikan restore file `.sql` atau `.rsv` lama yang tidak berformat ZIP tetap sukses merestore database.

---

## 3. Rencana Commit Git
- `feat(backup): include public and private storage files in rsv zip archive`
- `feat(restore): support extracting storage files with legacy sql fallback`
- `feat(ui): update backup and restore ui with storage inclusion badges`
