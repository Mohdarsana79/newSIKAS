# Implementation Plan: Panduan Profil Sekolah pada SIKAS AI Copilot & UI Hint Kop Surat

- **Spec Reference**: `docs/superpowers/specs/2026-10-22-copilot-profile-sekolah-guide-design.md`
- **Target Files**:
  - `app/Services/Ai/CopilotService.php`
  - `resources/js/Pages/DataMaster/SekolahProfile/Index.tsx`
  - `tests/Unit/CopilotSpjTandaTerimaTest.php`

---

## Task 1: Update System Prompt di CopilotService.php
- **Lokasi**: Method `buildSystemPrompt()` pada bagian panduan aplikasi (nomor 14).
- **Perubahan**:
  - Perluas panduan Profil Sekolah dengan teks detail:
    - Penegasan bahwa Profile Sekolah adalah **langkah pertama wajib yang perlu dilakukan sebelum mengisi data lain**.
    - **Langkah ke 1**: Klik Fitur Profile sekolah di sidebar sebelah kiri (pada kelompok Data Master).
    - **Langkah ke 2**: Input semua form yang diminta yaitu: Nama sekolah, NPSN, Status sekolah (Negeri atau swasta), Jenjang (SD, SMP, SMA, SMK), Provinsi, Kabupaten Kota, Kecamatan, Kelurahan/Desa, Alamat sekolah, Upload kop sekolah.
      - Ketentuan Kop Sekolah: Menggunakan file gambar berekstensi `.jpg`, `.jpeg`, atau `.png` dan disarankan untuk kop sekolah lebarnya 2480 px dan tingginya 588 px.
      - Ingatkan pengguna untuk mengisi semua data sekolah dengan lengkap karena data ini digunakan di berbagai fitur lainnya di seluruh aplikasi SIKAS.
    - **Langkah ke 3**: Klik Simpan maka data akan tersimpan.
  - Pastikan tidak ada URL internal seperti `/sekolah-profile`.

## Task 2: Perbarui Hint Visual di Halaman Profil Sekolah
- **Lokasi**: `resources/js/Pages/DataMaster/SekolahProfile/Index.tsx`.
- **Perubahan**:
  - Pada kartu Kop Sekolah (saat kop belum ada): perbarui teks petunjuk menjadi mencantumkan resolusi disarankan `2480 × 588 px`.
  - Pada Modal Upload Kop Surat (`Modal show={isUploadOpen}`): tambahkan informasi rekomendasi resolusi `Lebar 2480 px × Tinggi 588 px (.jpg, .jpeg, .png, Maks 2MB)`.

## Task 3: Tambahkan Unit Test di CopilotSpjTandaTerimaTest.php
- **Lokasi**: `tests/Unit/CopilotSpjTandaTerimaTest.php`.
- **Perubahan**:
  - Tambahkan unit test `test_system_prompt_includes_detailed_school_profile_guide()` yang memastikan prompt memiliki semua poin di atas dan tidak memiliki URL rahasia.

## Task 4: Validasi & Testing
- Jalankan test PHPUnit: `php artisan test --filter=CopilotSpjTandaTerimaTest`.
- Jalankan build Vite/TypeScript: `npm run build`.
- Jalankan live prompt test via scratch script untuk memastikan model merespons pertanyaan panduan Profil Sekolah dengan tepat.
