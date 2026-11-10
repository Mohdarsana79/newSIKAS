# Implementation Plan: Fitur SK & Surat (Manajemen Folder, Generator PHPWord, dan Pengarsipan Sekolah)

- **Tanggal**: 10 November 2026
- **Dokumen Desain**: [2026-11-10-sk-dan-surat-phpword-generator-design.md](file:///c:/laragon/www/newSIKAS2/newSIKAS/docs/superpowers/specs/2026-11-10-sk-dan-surat-phpword-generator-design.md)
- **Status**: Ready to Implement

---

## 1. Rincian Langkah Implementasi

### Fase 1: Pustaka Dependensi, Migrasi Database, & Model

1. **Instalasi Paket PHPWord:**
   - Jalankan `composer require phpoffice/phpword` untuk memasang dependensi engine Microsoft Word.
2. **Migrasi Database (`create_sk_folders_templates_and_dokumens_tables`):**
   - Buat migrasi tunggal terstruktur untuk 3 tabel:
     - `sk_folders`: `id`, `nama_folder`, `deskripsi`, `warna`, `created_by`, `timestamps`.
     - `sk_templates`: `id`, `folder_id`, `judul`, `file_path`, `file_name_original`, `detected_variables` (JSON), `created_by`, `timestamps`.
     - `sk_dokumens`: `id`, `folder_id`, `template_id` (nullable), `tipe` (`'generated'`, `'uploaded'`), `nomor_surat` (nullable), `perihal`, `tanggal_surat` (nullable), `data_isian` (JSON, nullable), `file_path` (nullable), `file_name_original` (nullable), `keterangan` (nullable), `created_by`, `timestamps`.
3. **Model Eloquent:**
   - `app/Models/SkFolder.php`: Relasi `templates()`, `dokumens()`, dan `user()`.
   - `app/Models/SkTemplate.php`: Relasi `folder()`, casts `detected_variables => array`.
   - `app/Models/SkDokumen.php`: Relasi `folder()`, `template()`, casts `data_isian => array`, `tanggal_surat => date`.

---

### Fase 2: Service Engine PHPWord & Pemetaan Variabel Profil Sekolah

1. **Service `app/Services/SkSuratService.php`:**
   - `extractVariables(string $fullPath): array`: Membaca file `.docx` dengan `TemplateProcessor` dan memanggil `getVariables()` untuk mendapatkan daftar tag `${variabel}` unik.
   - `getSchoolAutoFillData(): array`: Mengambil data instansi sekolah dari tabel `sekolahs` dan memetakan ke nama tag standar:
     - `nama_sekolah`, `npsn`, `alamat_sekolah`, `desa_kelurahan`, `kecamatan`, `kabupaten_kota`, `provinsi`, `nama_kepala_sekolah`, `nip_kepala_sekolah`, `nama_bendahara`, `nip_bendahara`.
   - `generateDocx(SkDokumen $dokumen): string`: Menyalin master template, menginjeksi seluruh pasangan key-value `data_isian` dengan `$template->setValue()`, lalu menyimpan ke file `.docx` temporer di `storage/app/temp/`.
   - `convertDocxToPdf(string $docxPath): string`: Mengonfigurasi `DomPDF` writer pada PHPWord dan mengonversi berkas menjadi `.pdf` temporer siap unduh.

---

### Fase 3: Controller, Otorisasi RBAC, & Rute Laravel

1. **Controller `app/Http/Controllers/SkSuratController.php`:**
   - `index()`: Mengambil daftar folder dengan hitungan dokumen & pencarian.
   - `storeFolder(Request $request)`, `updateFolder(Request $request, $id)`, `destroyFolder($id)`: CRUD folder (diproteksi guard: role `kepala_sekolah` diblokir 403).
   - `show($id)`: Menampilkan rincian folder, daftar dokumen surat, daftar template master, serta mengoper payload data profil sekolah untuk auto-fill.
   - `storeTemplate(Request $request, $folderId)`: Menyimpan berkas template `.docx` ke `storage/app/sk_surat/templates/` dan mengekstrak variabelnya.
   - `destroyTemplate($id)`: Menghapus template beserta berkas fisiknya.
   - `storeDokumen(Request $request, $folderId)`: Menyimpan formulir isian surat dinamis (`tipe='generated'`).
   - `updateDokumen(Request $request, $id)`: Memperbarui isian variabel surat dinamis.
   - `uploadArsip(Request $request, $folderId)`: Mengunggah berkas scan/arsip fisik (`tipe='uploaded'`).
   - `destroyDokumen($id)`: Menghapus dokumen beserta berkas arsipnya.
   - `downloadDocx($id)`: Stream download file Word hasil generate.
   - `exportPdf($id)`: Stream download file PDF hasil konversi.
   - `downloadArchive($id)`: Stream download file arsip fisik yang diunggah.
2. **Pendaftaran Rute di `routes/web.php`:**
   - Daftarkan grup rute `/sk-surat` dengan nama alias `sk-surat.*`.

---

### Fase 4: Frontend Interface (React + Tailwind + Inertia)

1. **Sidebar Navigation (`resources/js/Components/Sidebar.tsx`):**
   - Tambahkan menu "SK & Surat" di bawah grup "Fitur Pelengkap" dengan rute `sk-surat.index`.
2. **Halaman Index Folder (`resources/js/Pages/SkSurat/Index.tsx`):**
   - Visual kartu grid folder modern dengan badge jumlah dokumen dan tanggal update.
   - Modal Tambah/Edit Folder dengan pilihan palet warna aksen.
   - Filter pencarian nama folder.
3. **Halaman Detail Folder (`resources/js/Pages/SkSurat/Show.tsx`):**
   - Breadcrumb navigasi dan tombol aksi cepat (`+ Buat Surat Word`, `+ Upload Arsip`, `Kelola Template`).
   - Tabel dokumen responsif dengan badge tipe dokumen, tanggal, nomor surat, dan tombol aksi (Unduh DOCX, Ekspor PDF, Edit Form, Hapus).
4. **Modal Komponen Pendukung:**
   - `FolderModal.tsx`: Form input nama folder & deskripsi.
   - `ManageTemplatesModal.tsx`: Upload & daftar master template `.docx`.
   - `GenerateDokumenModal.tsx`: Form input dinamis berdasarkan tag template dengan preview auto-fill profil sekolah.
   - `UploadArsipModal.tsx`: File uploader untuk PDF/DOCX/Scan surat bertanda tangan.

---

### Fase 5: Pengujian (Automated Testing & QA)

1. **Buat Feature Test `tests/Feature/SkSuratTest.php`:**
   - Uji pembuatan folder oleh bendahara.
   - Uji pembatasan akses Kepala Sekolah (bisa melihat & download, ditolak 403 saat mutasi data).
   - Uji penyimpanan dokumen dinamis dan upload arsip fisik.
   - Uji pengunduhan file biner DOCX.
2. **Jalankan Verifikasi Suite:**
   - Eksekusi `composer test` untuk memastikan tidak ada regresi pada modul SIKAS lainnya.
   - Eksekusi formatting kode via `vendor/bin/pint`.
