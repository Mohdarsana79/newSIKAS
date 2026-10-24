# Design Spec: Panduan Profil Sekolah pada SIKAS AI Copilot & UI Hint Kop Surat

- **Tanggal**: 2026-10-22
- **Topik**: Standarisasi Panduan Profil Sekolah (Langkah 1, 2, 3) di AI Copilot & Penajaman Hint Resolusi Kop Surat di Halaman Profil Sekolah
- **Status**: Disetujui Pengguna (User Approved)

---

## 1. Latar Belakang & Kebutuhan
Profil Sekolah merupakan fondasi utama dan **langkah pertama yang wajib dilakukan** oleh bendahara sebelum dapat mengisi atau memanfaatkan data modul lain di aplikasi SIKAS (seperti RKAS/Penganggaran, Buku Kas Umum, Kwitansi, Tanda Terima, BAST, Surat Pesanan, dan Laporan Resmi).

Pengguna menghendaki panduan profil sekolah distandarisasi secara presisi dengan alur 3 langkah berurutan serta spesifikasi kop surat yang akurat. Selain itu, pengguna menyetujui agar panduan ini diterapkan pada:
1. **Instruksi AI Copilot (`CopilotService.php`)**: Memberikan panduan langkah-demi-langkah resmi saat pengguna menanyakan cara mengisi atau mengatur profil sekolah, tanpa membocorkan URL internal sistem.
2. **UI Hint pada Halaman Profil Sekolah (`SekolahProfile/Index.tsx`)**: Menampilkan rekomendasi resolusi kop surat (2480 px × 588 px) dengan ekstensi `.jpg`, `.jpeg`, `.png` (maksimal 2MB) secara langsung pada kartu pratinjau dan modal upload kop surat.

---

## 2. Rincian Panduan Resmi Profil Sekolah

Panduan resmi yang wajib disampaikan AI Copilot kepada pengguna:

### Status Wajib:
> **PENTING / WAJIB**: Mengisi Profile Sekolah adalah **langkah pertama yang wajib dilakukan** sebelum mengisi data transaksi, penganggaran, atau data lainnya di SIKAS. Tanpa profil sekolah, fitur cetak dokumen dan penganggaran tidak dapat berjalan optimal.

### Alur 3 Langkah Resmi:
- **Langkah ke-1**: Klik Fitur **Profile Sekolah** di sidebar sebelah kiri (pada kelompok Data Master).
- **Langkah ke-2**: Input semua form yang diminta secara lengkap:
  - **Nama Sekolah**
  - **NPSN**
  - **Status Sekolah** (Pilih: *Negeri* atau *Swasta*)
  - **Jenjang Sekolah** (Pilih: *SD*, *SMP*, *SMA*, atau *SMK*)
  - **Provinsi**
  - **Kabupaten/Kota**
  - **Kecamatan**
  - **Kelurahan/Desa**
  - **Alamat Lengkap Sekolah**
  - **Upload Kop Sekolah**: Menggunakan file gambar berekstensi `.jpg`, `.jpeg`, atau `.png`. Disarankan ukuran/resolusi lebar **2480 px** dan tinggi **588 px** agar hasil cetak dokumen SPJ dan laporan tajam dan proporsional.
  - *Catatan Penting*: Isi semua data sekolah dengan lengkap karena data ini digunakan secara otomatis di berbagai fitur lainnya di seluruh aplikasi SIKAS.
- **Langkah ke-3**: Klik tombol **Simpan** (atau **Update Data**) maka data akan tersimpan ke sistem.

---

## 3. Komponen Perubahan

### 3.1 Backend & System Prompt (`app/Services/Ai/CopilotService.php`)
1. **Sub-bab Khusus Panduan Profil Sekolah**:
   - Menambahkan blok panduan SOP terstruktur di dalam method `buildSystemPrompt()` pada sub-kategori *Data Master & Profil Sekolah*.
   - Menyematkan rincian Langkah 1, Langkah 2 (daftar lengkap 9 field + kop sekolah resolusi 2480x588 px), Langkah 3 (Simpan), dan penegasan bahwa ini adalah langkah pertama yang wajib dilakukan.
2. **Pemberlakuan Zero Internal URL Path**:
   - Memastikan tidak ada penyebutan rute `/sekolah-profile` atau tautan berawalan garis miring `/...`.
   - Mengarahkan navigasi semata-mata menggunakan nama menu visual: *"Fitur Profile Sekolah di sidebar sebelah kiri"*.

### 3.2 Frontend UI (`resources/js/Pages/DataMaster/SekolahProfile/Index.tsx`)
1. **Kartu Pratinjau Kop Sekolah**:
   - Mengubah keterangan placeholder dari `Format JPG/PNG, Max 2MB` menjadi:
     `Format JPG/PNG, Max 2MB (Disarankan 2480 × 588 px)`.
2. **Modal Upload Kop Surat**:
   - Menambahkan teks petunjuk yang informatif dan ramah:
     `Gunakan file gambar (.jpg, .jpeg, .png). Disarankan resolusi lebar 2480 px dan tinggi 588 px (Maksimal 2MB) agar tampilan kop pada dokumen cetak proporsional dan tajam.`

---

## 4. Rencana Pengujian (Testing Strategy)
1. **Unit Test Backend (`tests/Unit/CopilotSpjTandaTerimaTest.php`)**:
   - Menambahkan test case `test_system_prompt_includes_detailed_school_profile_guide()` untuk memverifikasi:
     - Teks "Langkah ke 1 : Klik Fitur Profile sekolah di sidebar sebelah kiri".
     - Semua field input form (Nama sekolah, NPSN, Status, Jenjang, Provinsi, Kab/Kota, Kecamatan, Kelurahan/Desa, Alamat).
     - Resolusi kop sekolah 2480 px dan 588 px serta ekstensi .jpg, .jpeg, .png.
     - Penegasan bahwa profil sekolah adalah langkah pertama wajib.
     - Ketiadaan URL rahasia `/sekolah-profile`.
2. **Frontend Compilation**:
   - Menjalankan `npm run build` untuk memverifikasi sintaks TypeScript dan styling Tailwind CSS di `SekolahProfile/Index.tsx`.
3. **Automated Test Suite**:
   - Menjalankan `php artisan test --filter=CopilotSpjTandaTerimaTest`.
4. **Live Query Test**:
   - Menjalankan script simulasi percakapan via API DeepSeek untuk menguji pertanyaan pengguna terkait *"Bagaimana cara mengisi profil sekolah?"* dan memverifikasi output AI menyajikan 3 langkah tersebut secara runut dan santai.
