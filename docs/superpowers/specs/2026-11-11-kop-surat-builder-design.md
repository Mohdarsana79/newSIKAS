# Dokumen Desain: Pembuat Kop Surat Sekolah Interaktif (Tiptap Editor + Multi-Logo + Auto-Generate Gambar Laporan)

**Tanggal:** 11 November 2026  
**Status:** Disetujui Pengguna (Drafting Spec)  
**Modul:** Data Master - Profil Sekolah (`resources/js/Pages/DataMaster/SekolahProfile/Index.tsx`, `app/Http/Controllers/SekolahProfileController.php`)

---

## 1. Latar Belakang & Kebutuhan Fitur

Pada aplikasi SIKAS, kop surat sekolah digunakan di lebih dari 50 template PDF dokumen pertanggungjawaban (SPJ), BKU, SP2B, SPTJ, Kwitansi, dan berbagai laporan keuangan BOSP lainnya. Sebelumnya, pengguna hanya dapat mengunggah file gambar banner kop surat yang sudah jadi (`.jpg` / `.png`).

Banyak bendahara dan operator sekolah mengalami kesulitan membuat banner kop surat berukuran presisi (2480 &times; 588 px) secara mandiri di software pengolah gambar eksternal. Oleh karena itu, dibutuhkan fitur **Pembuat Kop Surat Sekolah (Kop Surat Builder)** terintegrasi di dalam aplikasi SIKAS.

### Kebutuhan Utama Pengguna:
1. **Editor Teks Kustom Tiptap:** Pengguna dapat mengetik teks kop surat secara bebas menggunakan editor WYSIWYG Tiptap (mendukung bold, italic, underline, ukuran teks/heading, font kedinasan seperti Times New Roman / Arial, perataan teks tengah/kiri/kanan).
2. **Upload Logo Daerah & Logo Sekolah:** Tersedia form upload mandiri untuk:
   - **Logo Daerah** (Pemerintah Provinsi / Kabupaten / Kota) yang diposisikan di sebelah **KIRI**.
   - **Logo Sekolah** (Logo Tut Wuri Handayani atau Logo Khusus Sekolah) yang diposisikan di sebelah **KANAN**.
3. **Pilihan Mode Logo (1 Logo vs 2 Logo):**
   - Mode 1 Logo: Hanya menampilkan Logo Daerah di sebelah kiri, dengan teks kop di tengah.
   - Mode 2 Logo: Menampilkan Logo Daerah di sebelah kiri, teks di tengah, dan Logo Sekolah di sebelah kanan.
4. **Garis Pembatas Resmi Kedinasan:** Kop surat dilengkapi garis pembatas resmi dinas (garis ganda tebal-tipis) di bagian bawah kop.
5. **Template Teks Otomatis:** Saat pertama kali digunakan atau ketika ditekan tombol *Reset Template*, teks editor otomatis terisi format baku dinas berdasarkan nama sekolah, dinas, kabupaten, dan alamat yang tersimpan di profil sekolah.
6. **Live Preview Interaktif & Ekspor PNG:**
   - Tampilan live preview langsung mencerminkan perubahan teks, pilihan logo, dan format secara realtime.
   - Saat disimpan, logo daerah, logo sekolah, dan teks kop sekolah **tergabung menjadi satu file gambar PNG beresolusi tinggi (2480 &times; 588 px)** dan disimpan ke field `kop_surat`.
   - **Zero Breaking Change:** Seluruh 50+ template PDF laporan existing tetap mencetak kop dengan sempurna tanpa merombak file blade laporan.
   - Komponen mentah (`kop_teks_html`, `logo_daerah`, `logo_sekolah`, `kop_mode`) disimpan ke database agar pengguna dapat membuka dan menyunting kembali kop surat di kemudian hari.
   - Disediakan tombol **"Unduh Kop (PNG)"** untuk mengunduh gambar hasil gabungan ke komputer pengguna, serta tombol **"Perbesar Preview"**.

---

## 2. Arsitektur & Keputusan Desain

### 2.1 Alur Penggabungan Komponen & Resolusi Gambar
```
[User Form / Tiptap] + [Logo Daerah] + [Logo Sekolah]
                     │
                     ▼
          [Live Preview Komponen]
                     │
         (Klik "Simpan Kop Surat")
                     │
                     ▼
  [Client-side Render via html-to-image]
         (Canvas Resolusi Tinggi 2480 x 588 px)
                     │
                     ▼
     [Export ke PNG Blob / File]
                     │
                     ▼
  [Kirim Multipart Data ke Backend]:
     - generated_kop: File PNG hasil render
     - logo_daerah: File gambar logo daerah
     - logo_sekolah: File gambar logo sekolah
     - kop_mode: '1_logo' | '2_logo'
     - kop_teks_html: String HTML Tiptap
                     │
                     ▼
          [Laravel Backend Controller]
                     │
     ┌───────────────┴───────────────┐
     ▼                               ▼
[Simpan ke Storage]          [Update Database `sekolahs`]
- public/kop_surat/logo_d..   - logo_daerah = 'kop_surat/logo_d..'
- public/kop_surat/logo_s..   - logo_sekolah = 'kop_surat/logo_s..'
- public/kop_surat/kop_...    - kop_surat = 'kop_surat/kop_...png'
                              - kop_mode = '1_logo' | '2_logo'
                              - kop_teks_html = '...'
                              - kop_jenis = 'builder'
                     │
                     ▼
  [Seluruh 50+ Template PDF Laporan SIKAS]
  Menampilkan <img src="{{ public_path('storage/' . $sekolah->kop_surat) }}">
  Hasil: Tajam, presisi, 100% kompatibel!
```

### 2.2 Penataan Antarmuka Pengguna (UI)
Halaman `resources/js/Pages/DataMaster/SekolahProfile/Index.tsx` akan diperbarui dengan navigasi tab:
1. **Tab "Profil & Data Sekolah":**
   - Menampilkan ringkasan identitas satuan pendidikan (Nama Sekolah, NPSN terlisensi, Status, Jenjang, Situasi Wilayah, Alamat).
   - Tombol "Update Data" membuka modal edit data sekolah.
2. **Tab "Pengaturan Kop Surat":**
   - **Header Sub-Menu / Switcher:**
     - Opsi A: **Editor Kop Surat (Tiptap Builder)** — Pembuat kop dinamis dengan logo dan live preview.
     - Opsi B: **Upload Gambar Siap Pakai** — Untuk sekolah yang sudah memiliki file kop jadi dari desainer.
   - **Bagian Editor Kop Surat:**
     - **Kartu Pengaturan Logo & Mode:**
       - Pilihan Radio/Toggle: `1 Logo (Hanya Logo Daerah)` vs `2 Logo (Logo Daerah + Logo Sekolah)`.
       - Form Upload Logo Daerah (dengan tombol preview, ganti, dan hapus).
       - Form Upload Logo Sekolah (otomatis dinonaktifkan/disembunyikan saat mode 1 logo aktif).
     - **Toolbar & Editor Tiptap:**
       - Formatting: Bold, Italic, Underline.
       - Font Family: Times New Roman, Arial, Georgia.
       - Font Size: H1 (Nama Sekolah Besar), H2 (Dinas/Instansi), Normal (Teks Biasa), Small (Alamat, Kode Pos, Telp, Email).
       - Alignment: Rata Tengah (Default), Rata Kiri, Rata Kanan.
       - Tombol Aksi: *Reset ke Template Baku*.
     - **Area Live Preview Responsif:**
       - Memperlihatkan tampilan fisik kop surat secara proporsional.
       - Menampilkan garis pembatas tebal-tipis di bawahnya.
     - **Tombol Aksi Utama:**
       - **Simpan Kop Surat** (Menjalankan render canvas resolusi tinggi dan submit data).
       - **Unduh Kop (PNG)** (Mengunduh file PNG 2480 &times; 588 px ke lokal PC).
       - **Perbesar Preview** (Membuka modal ukuran penuh).

---

## 3. Spesifikasi Teknis & Database

### 3.1 Migrasi Database (`sekolahs` Table)
File migrasi baru: `database/migrations/YYYY_MM_DD_HHMMSS_add_kop_builder_fields_to_sekolahs_table.php`
```php
Schema::table('sekolahs', function (Blueprint $table) {
    $table->string('logo_daerah')->nullable()->after('kop_surat');
    $table->string('logo_sekolah')->nullable()->after('logo_daerah');
    $table->string('kop_mode', 20)->default('2_logo')->after('logo_sekolah'); // '1_logo' | '2_logo'
    $table->longText('kop_teks_html')->nullable()->after('kop_mode');
    $table->string('kop_jenis', 20)->default('builder')->after('kop_teks_html'); // 'builder' | 'upload'
});
```

Rollback:
```php
Schema::table('sekolahs', function (Blueprint $table) {
    $table->dropColumn([
        'logo_daerah',
        'logo_sekolah',
        'kop_mode',
        'kop_teks_html',
        'kop_jenis'
    ]);
});
```

### 3.2 Pembaruan Model `app/Models/SekolahProfile.php`
Tambahkan field baru ke `$fillable`:
```php
protected $fillable = [
    'nama_sekolah',
    'npsn',
    'status_sekolah',
    'jenjang_sekolah',
    'kelurahan_desa',
    'kecamatan',
    'kabupaten_kota',
    'provinsi',
    'alamat',
    'kop_surat',
    'logo_daerah',
    'logo_sekolah',
    'kop_mode',
    'kop_teks_html',
    'kop_jenis',
    'website_sync_url',
    'website_sync_token',
];
```

### 3.3 Endpoint & Controller (`app/Http/Controllers/SekolahProfileController.php`)
1. **Route Baru di `routes/variant.php`:**
   ```php
   Route::post('sekolah-profile/{id}/save-builder-kop', [SekolahProfileController::class, 'saveBuilderKop'])
       ->name('sekolah-profile.save-builder-kop');
   ```
2. **Validasi & Pemrosesan:**
   - Validasi:
     - `generated_kop`: `required|image|mimes:png,jpg,jpeg|max:5120` (maksimal 5MB)
     - `logo_daerah`: `nullable|image|mimes:png,jpg,jpeg,svg|max:2048`
     - `logo_sekolah`: `nullable|image|mimes:png,jpg,jpeg,svg|max:2048`
     - `kop_mode`: `required|in:1_logo,2_logo`
     - `kop_teks_html`: `required|string`
   - Penyimpanan File:
     - Simpan `generated_kop` ke disk `'public'` folder `kop_surat/` dan update atribut `kop_surat`.
     - Simpan `logo_daerah` baru jika diunggah (hapus file lama jika ada).
     - Simpan `logo_sekolah` baru jika diunggah (hapus file lama jika ada).
     - Update atribut `kop_mode`, `kop_teks_html`, dan set `kop_jenis = 'builder'`.

---

## 4. Frontend & Editor Tiptap

### 4.1 Dependensi NPM
Instalasi package yang diperlukan:
```bash
npm install @tiptap/react @tiptap/pm @tiptap/starter-kit @tiptap/extension-text-align @tiptap/extension-underline html-to-image
```

### 4.2 Template Baku Kop Surat (Auto-Generated)
Ketika pertama kali dibuka atau ditekan tombol *Reset Template*, isi HTML Tiptap dibuat dinamis berdasarkan data sekolah:
```html
<p style="text-align: center; font-family: 'Times New Roman', Times, serif; font-size: 14pt; margin: 0; text-transform: uppercase; font-weight: bold;">
  PEMERINTAH DAERAH PROVINSI {provinsi}
</p>
<p style="text-align: center; font-family: 'Times New Roman', Times, serif; font-size: 15pt; margin: 0; text-transform: uppercase; font-weight: bold;">
  DINAS PENDIDIKAN DAN KEBUDAYAAN
</p>
<p style="text-align: center; font-family: 'Times New Roman', Times, serif; font-size: 18pt; margin: 0; text-transform: uppercase; font-weight: bold;">
  {nama_sekolah}
</p>
<p style="text-align: center; font-family: 'Times New Roman', Times, serif; font-size: 10pt; margin: 0; font-style: italic;">
  {alamat}, Kec. {kecamatan}, {kabupaten_kota} - NPSN: {npsn}
</p>
```

### 4.3 Struktur Layout Kop Surat (WYSIWYG & Render Canvas)
Wadah render kop dibuat dengan rasio resmi (2480 &times; 588 px) dalam model kotak fleksibel:
- **Sisi Kiri:** Logo Daerah (Tinggi ~100-115px, aspect-ratio preserved, object-contain).
- **Tengah:** Blok Teks Tiptap (flex-1, text-center, line-height compact khas kop dinas).
- **Sisi Kanan:** 
  - Jika mode `2_logo`: Logo Sekolah (Tinggi ~100-115px, aspect-ratio preserved, object-contain).
  - Jika mode `1_logo`: Spacer kosong selebar logo daerah di kiri (agar teks kop tetap tepat di tengah simetris).
- **Bawah:** Garis Ganda Dinas:
  - Garis 1: border tebal (3px solid #000).
  - Jarak: 2px.
  - Garis 2: border tipis (1px solid #000).

---

## 5. Rencana Pengujian (Testing Strategy)

1. **Unit & Feature Test:**
   - Memastikan endpoint `saveBuilderKop` menyimpan semua data dengan benar.
   - Memastikan file lama dibersihkan dari storage saat logo/kop diganti.
   - Memastikan validasi request menolak format file non-gambar.
2. **Pengujian Frontend & Visual:**
   - Verifikasi toggle 1 logo vs 2 logo secara realtime di preview.
   - Verifikasi hasil render canvas `html-to-image`: ketajaman teks, posisi logo kiri dan kanan, serta garis ganda pembatas.
   - Verifikasi unduh PNG menghasilkan file gambar jernih tanpa artefak visual.
3. **Pengujian Kompatibilitas Dokumen PDF:**
   - Melakukan uji cetak pada minimal 3 jenis laporan: Kwitansi, Tanda Terima, dan SPTJ / SP2B.
   - Memastikan gambar kop surat baru tampil proporsional tanpa menggeser margin tabel laporan.
