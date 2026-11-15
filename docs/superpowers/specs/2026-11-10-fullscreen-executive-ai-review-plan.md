# Implementation Plan: Fullscreen Executive AI Review & Comprehensive Narrative Report

- **Tanggal**: 10 November 2026
- **Dokumen Desain**: [2026-11-10-fullscreen-executive-ai-review-design.md](file:///c:/laragon/www/newSIKAS2\newSIKAS\docs\superpowers\specs\2026-11-10-fullscreen-executive-ai-review-design.md)
- **Status**: Selesai Diimplementasikan (Completed & Verified)

---

## 1. Rincian Langkah Implementasi

### Langkah 1: Perbarui Safelist Kelas Kontras Tinggi (`ai-review-templates.ts`)
- Tambahkan kelas-kelas teks berbobot gelap & kontras tinggi:
  - `text-emerald-900`, `text-amber-900`, `text-red-900`, `text-indigo-900`, `text-slate-900`, `text-gray-900`.
  - Border dan latar belakang yang kontras: `bg-emerald-100`, `bg-amber-100`, `bg-red-100`, `bg-indigo-100`, `border-emerald-300`, `border-amber-300`, `border-red-300`.
  - Tipografi narasi: `prose`, `prose-sm`, `prose-indigo`, `leading-relaxed`, `text-justify`.

### Langkah 2: Backend Prompt & Kapasitas Token (`RkasAiReviewController.php`)
- Naikkan `max_tokens` dari 2000 menjadi **5000 tokens**.
- Struktur ulang System Prompt:
  - Instruksi wajib untuk menyertakan **paragraf narasi penjelasan mendalam** di setiap bagian:
    1. Narasi Ringkasan Eksekutif + 4 Kartu KPI.
    2. Narasi Analisis Postur Anggaran & Keseimbangan Serapan.
    3. Tabel Lengkap 5 Belanja Terbesar + Paragraf Ulasan Analitis per Belanja (kewajaran harga, urgensi, volume).
    4. Narasi Evaluasi Risiko Kritis, Kepatuhan Juknis BOSP, & Potensi Temuan Audit.
    5. Narasi Rekomendasi Tindakan & Arahan Konkret Kepala Sekolah kepada Bendahara.
  - Aturan warna kontras tinggi: Wajib menggunakan `text-gray-900 dark:text-white` untuk judul dan `text-gray-800 dark:text-gray-100` untuk teks isi narasi. Dilarang keras menggunakan teks terang/pucat di latar putih.

### Langkah 3: Antarmuka Fullscreen Executive View (`RkasAiReviewModal.tsx`)
- Ganti pembungkus dari modal kotak `Modal` menjadi **Fullscreen Fixed Overlay**:
  - `fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex flex-col`.
  - **Header Bar Sticky**: Tetap diam di bagian atas dengan tombol Salin Ringkasan, Cetak/PDF, Analisis Ulang, dan tombol Tutup (X).
  - **Scrollable Body**: `flex-1 overflow-y-auto bg-slate-50 dark:bg-gray-950 p-6 sm:p-8 custom-scrollbar`.
  - **Kontainer Terpusat**: `max-w-6xl mx-auto w-full`.
  - Listener tombol `Escape` untuk menutup dan penguncian scroll `document.body.style.overflow = 'hidden'`.
- Perbarui Skeleton Shimmer Loading agar merefleksikan layout laporan narasi baru.

### Langkah 4: Pengujian & Verifikasi Akhir
- Jalankan `npx tsc --noEmit`.
- Jalankan `vendor/bin/pint`.
- Jalankan `php artisan test --filter=RoleKepalaSekolahTest`.
- Jalankan `npm run build`.
