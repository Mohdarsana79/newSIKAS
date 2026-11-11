# Implementation Plan: Pembuat Kop Surat Sekolah Interaktif (Tiptap Editor + Multi-Logo + Auto-Generate Gambar Laporan)

**Tanggal Rencana:** 11 November 2026  
**Status:** Siap Dieksekusi  
**Dokumen Desain Referensi:** [`docs/superpowers/specs/2026-11-11-kop-surat-builder-design.md`](file:///c:/laragon/www/newSIKAS2/newSIKAS/docs/superpowers/specs/2026-11-11-kop-surat-builder-design.md)

---

## 1. Ringkasan Tugas & Tujuan

Membangun fitur **Pembuat Kop Surat Sekolah Kustom** pada modul Profil Sekolah (`DataMaster/SekolahProfile`):
1. **Editor Teks Bebas Tiptap:** Memungkinkan pengguna mengetik teks kop surat dinas secara mandiri (mendukung bold, italic, underline, font resmi, ukuran teks kedinasan, dan perataan tengah).
2. **Form Upload Multi-Logo:** Tersedia upload terpisah untuk **Logo Daerah** (kiri) dan **Logo Sekolah** (kanan).
3. **Pilihan 1 Logo vs 2 Logo:** Fleksibilitas memilih 1 logo (hanya logo daerah di kiri dengan teks seimbang di tengah) atau 2 logo (logo daerah di kiri dan logo sekolah di kanan).
4. **Live Preview Responsif & Garis Batas Dinas:** Pratinjau langsung proporsional lengkap dengan garis ganda tebal-tipis standar kedinasan.
5. **Auto-Generate Gambar Laporan (Zero-Breaking Change):** Sistem otomatis merender elemen preview menjadi file gambar PNG resolusi tinggi (2480 &times; 588 px) yang disimpan ke field `kop_surat`. Seluruh 50+ file template cetak PDF laporan di SIKAS langsung kompatibel tanpa perubahan kode pada file blade.
6. **Simpan State Komponen & Unduh PNG:** Menyimpan data mentah ke database agar bisa disunting kembali, serta tombol unduh PNG langsung ke komputer.

---

## 2. Rincian Perubahan File & Tahapan Eksekusi

### Tahap 1: Dependensi NPM
- **Pekerjaan:**
  Instalasi dependensi Tiptap dan library render DOM-to-Image:
  ```bash
  npm install @tiptap/react @tiptap/pm @tiptap/starter-kit @tiptap/extension-text-align @tiptap/extension-underline html-to-image
  ```
- **Verifikasi:** Periksa `package.json` untuk memastikan seluruh package terpasang dengan versi yang tepat.

### Tahap 2: Database Migration & Model Update
- **File Target 1:** `database/migrations/2026_11_11_131000_add_kop_builder_fields_to_sekolahs_table.php`
  - Buat migration untuk menambahkan kolom:
    * `logo_daerah` (string, nullable)
    * `logo_sekolah` (string, nullable)
    * `kop_mode` (string, default: `'2_logo'`)
    * `kop_teks_html` (longText, nullable)
    * `kop_jenis` (string, default: `'builder'`)
- **File Target 2:** `app/Models/SekolahProfile.php`
  - Tambahkan kolom-kolom baru tersebut ke properti `$fillable`.
- **Eksekusi:** Jalankan `php artisan migrate`.

### Tahap 3: Backend Controller & Routing
- **File Target 1:** `routes/variant.php`
  - Daftarkan route baru:
    ```php
    Route::post('sekolah-profile/{id}/save-builder-kop', [SekolahProfileController::class, 'saveBuilderKop'])
        ->name('sekolah-profile.save-builder-kop');
    ```
- **File Target 2:** `app/Http/Controllers/SekolahProfileController.php`
  - Implementasikan method `saveBuilderKop(Request $request, string $id)`:
    * Validasi `generated_kop` (file gambar hasil render), `logo_daerah` (opsional file gambar), `logo_sekolah` (opsional file gambar), `kop_mode` (`1_logo` | `2_logo`), dan `kop_teks_html`.
    * Simpan file gambar `generated_kop` ke disk `'public'` folder `kop_surat/`, gantikan file lama jika ada, dan set ke kolom `kop_surat`.
    * Simpan file `logo_daerah` baru jika diunggah dan bersihkan file lama.
    * Simpan file `logo_sekolah` baru jika diunggah dan bersihkan file lama.
    * Update `kop_mode`, `kop_teks_html`, dan set `kop_jenis = 'builder'`.
    * Kembalikan redirect back dengan pesan sukses.

### Tahap 4: Frontend Components & Halaman Profil Sekolah
- **File Target 1:** `resources/js/Pages/DataMaster/SekolahProfile/Partials/KopSuratBuilder.tsx`
  - Bangun komponen builder terpisah:
    * Editor Tiptap dengan extension StarterKit, TextAlign, dan Underline.
    * Toolbar styling dinas: Bold, Italic, Underline, Font Times New Roman/Arial, Heading/Font Size, Text Align (Center, Left, Right), dan tombol *Reset Template Baku*.
    * Switcher Mode: `1 Logo (Hanya Logo Daerah)` vs `2 Logo (Logo Daerah + Sekolah)`.
    * Upload Card untuk Logo Daerah dan Logo Sekolah (dilengkapi pratinjau thumbnail, tombol ganti, dan tombol hapus).
    * Wadah Live Preview Interaktif:
      - Rasio 2480 &times; 588 px yang responsif di layar.
      - Sisi kiri: Logo Daerah.
      - Sisi tengah: Blok teks kop sekolah Tiptap.
      - Sisi kanan: Logo Sekolah (atau dummy spacer seimbang jika mode 1 logo aktif).
      - Garis pembatas resmi ganda (3px border tebal + 2px gap + 1px border tipis).
    * Fitur Ekspor & Simpan:
      - Menggunakan `html-to-image` (`toBlob` / `toPng`) untuk mengonversi elemen preview menjadi gambar PNG beresolusi tinggi (2480px width).
      - Mengirimkan form data ke route `sekolah-profile.save-builder-kop`.
      - Tombol **"Unduh Kop (PNG)"** untuk mengunduh langsung ke komputer pengguna.
      - Tombol **"Lihat Ukuran Penuh"** (Modal Preview).
- **File Target 2:** `resources/js/Pages/DataMaster/SekolahProfile/Index.tsx`
  - Perbarui interface `Sekolah` dengan atribut baru (`logo_daerah`, `logo_sekolah`, `kop_mode`, `kop_teks_html`, `kop_jenis`).
  - Tambahkan navigasi Tab modern:
    * Tab 1: **Profil & Data Sekolah** (menampilkan informasi sekolah dan form edit sekolah yang sudah ada).
    * Tab 2: **Pengaturan Kop Surat** (menampilkan KopSuratBuilder dengan opsi beralih ke Upload Gambar Jadi).

### Tahap 5: Verifikasi & Pengujian
1. Jalankan `php artisan migrate` dan cek skema tabel `sekolahs`.
2. Jalankan `npm run build` untuk memverifikasi TypeScript type safety dan bundling Vite tanpa error.
3. Uji coba UI:
   - Tes ketik teks dan ubah format pada Tiptap.
   - Tes upload logo daerah dan logo sekolah.
   - Tes ubah mode 1 logo vs 2 logo (pastikan live preview langsung menyesuaikan).
   - Tes tombol "Simpan Kop Surat" (pastikan file gambar tersimpan dan terhubung ke profil sekolah).
   - Tes tombol "Unduh Kop (PNG)" (pastikan file PNG terunduh dengan kualitas tinggi).
   - Buka preview dokumen PDF laporan (misal: Kwitansi / SPTJ) dan pastikan kop surat hasil builder tampil presisi.

---

## 3. Rencana Commit
- `feat(migration): add kop builder fields to sekolahs table`
- `feat(backend): implement saveBuilderKop in SekolahProfileController`
- `feat(frontend): install tiptap and html-to-image dependencies`
- `feat(frontend): create KopSuratBuilder component with live preview`
- `feat(frontend): integrate KopSuratBuilder into SekolahProfile page tabs`
- `test: verify build and pdf kop rendering`
