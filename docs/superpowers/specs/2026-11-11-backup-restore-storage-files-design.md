# Design Spec: Backup & Restore Terpadu (Database & File Unggahan Storage)

## 1. Metadata
- **Tanggal**: 2026-11-11
- **Topik**: Pengemasan Berkas Storage (Kop Surat, Logo, Template Word, dan Dokumen Arsip) ke dalam Backup & Restore .rsv
- **Status**: Validated & Approved by User

---

## 2. Latar Belakang & Masalah
Pada implementasi sebelumnya di `DatabaseController`:
- **Proses Backup** hanya mengekspor skema dan data tabel PostgreSQL menggunakan `pg_dump` ke dalam file berformat teks SQL mentah berekstensi `.rsv`.
- File-file fisik yang diunggah oleh pengguna:
  1. `storage/app/public/kop_surat/` (gambar kop surat, logo pemda, logo sekolah dari KopSuratBuilder/Upload Kop).
  2. `storage/app/private/sk_surat/templates/` (file template `.docx` SK/Surat).
  3. `storage/app/private/sk_surat/archives/` (file arsip dokumen fisik `.doc`, `.docx`, `.pdf`, dll.).
  sama sekali tidak ikut dikemas ke dalam file backup `.rsv`.
- Akibatnya, saat pengguna memulihkan data (*restore*) di instalasi baru atau setelah database dibersihkan, data referensi file di tabel database tetap ada namun file fisiknya di disk hilang (menghasilkan status *file not found* / 404).

---

## 3. Sasaran & Kriteria Keberhasilan
1. **Satu File Paket Terpadu (All-in-One)**: Menghasilkan 1 file backup `.rsv` yang mengemas database PostgreSQL sekaligus seluruh berkas unggahan pengguna.
2. **Kompresi Efisien**: Menggunakan format ZIP internal (`ZipArchive`) berekstensi `.rsv` untuk memadatkan ukuran berkas database dan media.
3. **Kompatibilitas Mundur (Backward Compatibility)**: File backup lama yang berformat teks SQL murni (.rsv / .btb / .sql) tetap dapat dipulihkan secara normal tanpa error.
4. **Strategi Pemulihan Aman (Merge & Overwrite)**: Saat restore, file diekstrak ke direktori tujuan dan menimpa file yang memiliki nama/jalur sama tanpa menghapus file tidak terkait lainnya.
5. **Kapasitas Unggah Hingga 2 GB**: Menyesuaikan batas validasi file upload di controller menjadi 2 GB (2097152 KB) agar aman untuk berkas arsip dan database besar.
6. **Antarmuka Jelas & Ramah Pengguna**: Menyajikan indikator informatif di halaman `Backup/Index.tsx` bahwa backup mencakup database dan seluruh file unggahan fisik.

---

## 4. Struktur Isi Paket Backup (.rsv)
File `.rsv` merupakan arsip ZIP dengan struktur internal sebagai berikut:
```text
backup_YYYY-MM-DD_HH-mm-ss.rsv (ZIP container)
├── manifest.json
├── database.sql
└── storage/
    ├── public/
    │   └── kop_surat/
    │       ├── logo_daerah.png
    │       ├── logo_sekolah.png
    │       └── kop_generated.png
    └── private/
        └── sk_surat/
            ├── templates/
            │   └── template_sk.docx
            └── archives/
                └── arsip_dokumen.docx
```

### Format `manifest.json`:
```json
{
  "version": "1.0",
  "app": "newSIKAS",
  "app_npsn": "12345678",
  "created_at": "2026-11-11T18:00:00+08:00",
  "has_database": true,
  "has_storage": true,
  "files_count": 12,
  "storage_paths": [
    "storage/public/kop_surat",
    "storage/private/sk_surat"
  ]
}
```

---

## 5. Rincian Teknis Implementasi

### A. Backend: `app/Http/Controllers/DatabaseController.php`

#### 1. Modifikasi `backup(Request $request)`:
- Buat folder kerja sementara di `storage/app/temp/backup_{timestamp}/`.
- Jalankan `pg_dump` ke file sementara `database.sql`.
- Buat file zip `.rsv` menggunakan `ZipArchive` di folder `storage/app/backups/`.
- Tambahkan `database.sql` ke dalam arsip ZIP.
- Tambahkan seluruh file unggahan pengguna:
  - Direktori `storage/app/public` (folder `kop_surat` dan subfolder/file publik pengguna lainnya, kecuali cache/symlink).
  - Direktori `storage/app/private/sk_surat` (folder `templates` dan `archives`).
  - *Folder yang dikecualikan secara ketat*:
    - `storage/app/arkas_engine/`
    - `storage/app/libreoffice/`
    - `storage/app/temp/`
    - `storage/app/backups/`
    - `.gitignore`
- Masukkan metadata `manifest.json`.
- Tutup arsip ZIP dan hapus file temporer `database.sql` dan folder kerja sementaranya.

#### 2. Modifikasi `restore(Request $request)`:
- Perbarui batas validasi:
  ```php
  $request->validate([
      'backup_file' => 'required|file|extensions:rsv,btb,sql|max:2097152',
  ]);
  ```
- Deteksi tipe berkas:
  - Buka file menggunakan `ZipArchive::open()`.
  - **Jika Berkas berupa ZIP**:
    1. Ekstrak `database.sql` ke folder temporer `storage/app/temp/restore_{timestamp}/`.
    2. Jalankan pemulihan database PostgreSQL dari `database.sql` yang diekstrak:
       - `DROP SCHEMA public CASCADE;`
       - `CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO public;`
       - Eksekusi `psql -f extracted_database.sql`.
       - Eksekusi `resetSequences()`.
       - Eksekusi `Artisan::call('migrate', ['--force' => true])`.
    3. Ekstrak file storage:
       - File dalam folder `storage/public/` diekstrak ke `storage/app/public/`.
       - File dalam folder `storage/private/` diekstrak ke `storage/app/private/`.
       - Gunakan mode *Merge & Overwrite* (timpa file jika sudah ada, buat direktori bila belum ada).
    4. Bersihkan folder kerja temporer `restore_{timestamp}/`.
  - **Jika Berkas berupa SQL Polos (Legacy)**:
    1. Lakukan pemulihan database secara langsung via `psql` seperti mekanisme eksisting.
    2. Tetap jalankan `resetSequences()` dan `Artisan::call('migrate', ['--force' => true])`.

#### 3. Log & Tangani Eksepsi:
- Tambahkan `try-catch-finally` untuk memastikan folder temporer selalu dibersihkan walau terjadi kegagalan proses.
- Tangani batas waktu eksekusi PHP (`set_time_limit(0)` atau disesuaikan) agar backup/restore berukuran besar tidak mengalami timeout.

---

### B. Frontend: `resources/js/Pages/Backup/Index.tsx`

1. **Card & Banner Panduan**:
   - Menambahkan badge atau catatan informatif pada panel "Buat Cadangan Baru":
     `"Mencakup Database & Seluruh File Unggahan (Kop Surat, Logo Daerah/Sekolah, Template & Arsip Dokumen)"`
2. **Modal Konfirmasi Restore**:
   - Menambahkan rincian peringatan dan penjelasan bahwa file backup baru akan memulihkan data transaksi dan tabel sekaligus memulihkan file gambar kop surat dan dokumen secara otomatis.
   - Tetap menyebutkan bahwa file backup lama (.sql) tetap didukung.
3. **Pesan Respons Flash**:
   - Menampilkan notifikasi sukses yang informatif saat proses backup maupun restore selesai.

---

## 6. Rencana Pengujian (Test & Verification)
1. **Verifikasi Pembuatan Backup**:
   - Buat backup baru dari antarmuka Web UI.
   - Periksa file `.rsv` yang dihasilkan di `storage/app/backups/`.
   - Validasi bahwa file `.rsv` dapat dibuka sebagai ZIP dan berisi `manifest.json`, `database.sql`, serta folder `storage/public/kop_surat` dan `storage/private/sk_surat`.
2. **Verifikasi Pemulihan (Restore) All-in-One**:
   - Hapus salah satu file kop surat di `storage/app/public/kop_surat/`.
   - Unggah dan restore file `.rsv` yang baru dibuat.
   - Verifikasi bahwa database terpulihkan dan file kop surat yang sempat dihapus berhasil kembali ada di disk dan dapat dibuka.
3. **Verifikasi Kompatibilitas Mundur (Legacy Restore)**:
   - Unggah file `.rsv` atau `.sql` versi lama (hanya database mentah).
   - Verifikasi bahwa sistem tetap berhasil merestore database tanpa menimbulkan error ekstraksi ZIP.
