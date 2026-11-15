# Implementation Plan: Telaah Cerdas AI Eksekutif dengan Rich Interactive HTML & Tailwind CSS

- **Tanggal**: 10 November 2026
- **Dokumen Desain**: [2026-11-10-telaah-cerdas-ai-interactive-html-design.md](file:///c:/laragon/www/newSIKAS2\newSIKAS\docs\superpowers\specs\2026-11-10-telaah-cerdas-ai-interactive-html-design.md)
- **Status**: Selesai Diimplementasikan (Completed & Verified)

---

## 1. Rincian Langkah Implementasi

### Langkah 1: Buat Helper Safelist & Template Panduan (`ai-review-templates.ts`)
- Buat file `resources/js/Components/Rkas/ai-review-templates.ts`.
- Daftarkan contoh struktur HTML + kelas-kelas Tailwind yang akan di-scan oleh Vite/Tailwind:
  - Grid: `grid grid-cols-1 md:grid-cols-4 gap-4`, `grid-cols-1 md:grid-cols-2 gap-6`.
  - Cards: `bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm`.
  - Warna & Badge: `bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200`, `bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200`, `bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 border-red-200`, `bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border-indigo-200`.
  - Tabel: `min-w-full divide-y divide-gray-200 dark:divide-gray-700`, `overflow-hidden rounded-lg border`.
  - Progress bar: `w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2`, `bg-indigo-600 h-2 rounded-full`.

### Langkah 2: Pengayaan Data & System Prompt (`RkasAiReviewController.php`)
- Tambahkan kalkulasi:
  - Belanja Operasional (`5.1`) vs Belanja Modal (`5.2`).
  - Alokasi Semester 1 (Jan-Jun) vs Semester 2 (Jul-Des).
  - Status Keseimbangan (Surplus / Defisit / Seimbang 100%).
- Perbarui System Prompt DeepSeek:
  - Wajib menghasilkan **Semantic HTML murni** tanpa tag code block ````html ... ````.
  - Struktur baku:
    1. Grid 4 KPI Cards di bagian atas.
    2. Tabel 5 Belanja Terbesar dengan progress bar persentase serapan.
    3. Alert Box Analisis Risiko & Deteksi Anomali.
    4. Checklist Rekomendasi Aksi Kepala Sekolah.
  - Menggunakan kelas-kelas Tailwind yang didukung Dark Mode (`dark:...`).

### Langkah 3: Antarmuka Modal Interaktif (`RkasAiReviewModal.tsx`)
- Ubah modal menjadi `maxWidth="5xl"`.
- Implementasikan Skeleton Shimmer Loading saat `loading === true`.
- Bersihkan output dari AI jika terdapat pembungkus markdown (strip ```html dan ```).
- Render HTML dengan aman menggunakan styling container yang rapi.
- Tambahkan tombol aksi di header:
  - **Salin Ringkasan** (dengan feedback pesan berhasil disalin).
  - **Cetak / Ekspor PDF** (memicu browser print dialog).
  - **Analisis Ulang** (panggil ulang API).
  - **Tutup**.
- Dukungan print styling (`@media print` agar hanya area telaah yang dicetak).

### Langkah 4: Pengujian & Verifikasi
- Jalankan `npx tsc --noEmit` (0 error).
- Jalankan `vendor/bin/pint`.
- Jalankan `php artisan test --filter=RoleKepalaSekolahTest`.
- Jalankan `php artisan test --testsuite=Unit`.
- Jalankan `npm run build`.
