# Dokumen Desain: Penggantian SweetAlert dengan Modal Konfirmasi & Notifikasi Tailwind pada Kop Surat Builder

**Tanggal:** 11 November 2026  
**Status:** Disetujui Pengguna (Drafting Spec)  
**Modul:** Kop Surat Builder (`resources/js/Pages/DataMaster/SekolahProfile/Partials/KopSuratBuilder.tsx`)

---

## 1. Latar Belakang & Kebutuhan Fitur

Sebelumnya, interaksi konfirmasi (seperti Reset Template Baku) dan notifikasi (sukses simpan, error simpan, sukses unduh) pada `KopSuratBuilder.tsx` menggunakan library pihak ketiga `sweetalert2` (`Swal.fire`). 

Pengguna menginginkan agar **seluruh SweetAlert dihapus** dan digantikan dengan **Modal Konfirmasi & Notifikasi bawaan Tailwind** (`@/Components/Modal.tsx`) agar gaya tampilan dialog selaras (*consistent*), modern, serta menyatu dengan tema dan komponen UI aplikasi SIKAS.

---

## 2. Rincian Desain Modal Pengganti SweetAlert

Dibuat 3 jenis dialog modal terstruktur:

### 2.1 Modal Konfirmasi Reset Template
- **Pemicu:** Tombol "Reset ke Template Baku" pada toolbar Tiptap.
- **Tampilan:**
  - Ikon: `RotateCcw` / `HelpCircle` dengan lingkaran amber/biru.
  - Judul: **"Kembalikan ke Template Baku?"**
  - Deskripsi: *"Teks kop surat saat ini akan diganti dengan susunan baku dinas berdasarkan data profil sekolah. Format yang telah Anda ketik akan ditimpa."*
  - Tombol Aksi:
    - `Batal` (SecondaryButton)
    - `Ya, Terapkan Template` (PrimaryButton warna indigo).

### 2.2 Modal Konfirmasi Simpan Kop Surat
- **Pemicu:** Tombol "Simpan Kop Sekarang" di bagian atas dan bawah editor.
- **Tampilan:**
  - Ikon: `Save` / `Sparkles` dengan lingkaran indigo.
  - Judul: **"Simpan & Terapkan Kop Surat?"**
  - Deskripsi: *"Sistem akan menggabungkan logo daerah, teks kop surat, dan logo sekolah menjadi satu file gambar berkualitas tinggi (2480 × 588 px) untuk seluruh laporan PDF (SPJ, Kwitansi, SPTJ, SP2B, dll)."*
  - Tombol Aksi:
    - `Batal` (SecondaryButton)
    - `Ya, Simpan Kop` (PrimaryButton warna indigo).
- **Alur:** Setelah pengguna menekan tombol konfirmasi, fungsi `handleSaveKop` mulai mengeksekusi konversi canvas resolusi tinggi dan submit data.

### 2.3 Modal Status / Pemberitahuan (Sukses & Gagal)
- **Pemicu:** Selesainya proses Simpan atau Unduh gambar kop surat.
- **Kondisi Sukses:**
  - Ikon: `CheckCircle2` dalam lingkaran hijau lembut (`bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400`).
  - Judul: **"Berhasil Disimpan"** / **"Berhasil Diunduh"**.
  - Pesan Informatif: Keterangan bahwa kop surat berhasil diperbarui atau file PNG telah diunduh.
  - Tombol: `Selesai` / `Mengerti` (PrimaryButton).
- **Kondisi Gagal / Error:**
  - Ikon: `AlertTriangle` atau `XCircle` dalam lingkaran merah lembut (`bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400`).
  - Judul: **"Terjadi Kendala"**.
  - Pesan Error: Rincian pesan error validasi atau sistem.
  - Tombol: `Tutup` (SecondaryButton).

---

## 3. Pembersihan Kode
- Menghapus baris `import Swal from 'sweetalert2';` dari `KopSuratBuilder.tsx`.
- Mengganti seluruh 5 panggilan `Swal.fire` dengan kontrol state modal lokal (`isResetModalOpen`, `isConfirmSaveModalOpen`, `statusModal`).
