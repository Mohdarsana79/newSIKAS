# Design Spec: Telaah Cerdas AI Eksekutif dengan Rich Interactive HTML & Tailwind CSS

- **Tanggal**: 10 November 2026
- **Status**: Menunggu Review & Persetujuan Pengguna
- **Target Komponen**:
  - `app/Http/Controllers/RkasAiReviewController.php`
  - `resources/js/Components/Rkas/RkasAiReviewModal.tsx`
  - `resources/js/Components/Rkas/ai-review-templates.ts` (Safelist & Prompt Guidelines)

---

## 1. Latar Belakang & Masalah
Fitur *Telaah Cerdas AI Eksekutif* sebelumnya menghasilkan output dalam teks Markdown standar sederhana (heading, bullet point, teks tebal) dan dirender dalam modal sempit (`maxWidth="2xl"`). Format ini terlihat monoton, kurang mencerminkan laporan eksekutif resmi, serta tidak memanfaatkan potensi visual seperti kartu metrik (KPI Cards), tabel perbandingan dengan persentase serapan, kotak peringatan anomali (Alert Callout), dan checklist tindakan rekomendasi Kepala Sekolah.

## 2. Tujuan & Sasaran
1. **Rich HTML & Tailwind Generation**: Menginstruksikan DeepSeek AI untuk menghasilkan semantic HTML berbalut kelas-kelas utilitas Tailwind CSS yang modern, elegan, dan adaptif terhadap mode gelap (*Dark Mode*).
2. **Kaya Data & Analisis Mendalam**: Memberikan konteks data tambahan ke AI, mencakup:
   - Status Keseimbangan (Surplus / Defisit / Seimbang 100%).
   - Rasio Belanja Operasional (`5.1.02`) vs Belanja Modal (`5.2`).
   - Distribusi alokasi semester / triwulan.
   - 5 Alokasi belanja terbesar dan 5 kelompok rekening belanja dominan.
   - Status telaah saat ini (disetujui, perlu revisi, belum ditelaah).
3. **Komponen Visual Berstandar Tinggi**:
   - **Executive KPI Cards**: 4 kartu metrik utama di bagian atas dengan badge warna kontekstual (Hijau = Aman, Kuning = Perhatian, Merah = Bahaya).
   - **Modern Data Table**: Tabel 5 Belanja Terbesar dengan bar persentase serapan anggaran.
   - **Alert Callout Card**: Kotak evaluasi risiko dan deteksi anomali harga/volume.
   - **Checklist Rekomendasi**: Daftar aksi terstruktur bagi Kepala Sekolah sebelum pengesahan.
4. **Pengalaman Pengguna Interaktif (UX)**:
   - Modal berukuran lapang (`maxWidth="5xl"`).
   - Indikator pemuatan beranimasi *Shimmer Skeleton*.
   - Fitur **"Salin Ringkasan"** (copy to clipboard dengan toast feedback).
   - Fitur **"Cetak / Ekspor PDF"** (print format ramah kertas).
   - Fitur **"Analisis Ulang"** (*Regenerate*).

---

## 3. Arsitektur & Desain Rinci

### A. Backend - Pengayaan Data & System Prompt (`RkasAiReviewController.php`)
1. **Kalkulasi Data Lanjutan**:
   - Menghitung total belanja operasional (rekening yang diawali `5.1`) dan belanja modal (rekening `5.2`).
   - Menghitung persentase belanja per semester (Semester 1: Jan-Jun, Semester 2: Jul-Des).
   - Menghitung rasio serapan terhadap pagu (apakah tepat 100%, defisit, atau terdapat sisa dana).
2. **System Prompt & Strict HTML Output Rules**:
   - Menginstruksikan model untuk **hanya mengeluarkan blok HTML** (tanpa pembungkus markdown ```html ... ```).
   - Memberikan struktur layout baku yang harus diikuti AI:
     - `<div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">...</div>` (KPI Cards)
     - `<div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 mb-6">...</div>` (Tabel 5 Belanja Terbesar)
     - `<div class="p-4 rounded-xl border mb-6 ...">...</div>` (Alert Risiko & Anomali)
     - `<div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">...</div>` (Checklist Rekomendasi)
   - Aturan warna adaptif: Gunakan kelas `dark:bg-...`, `dark:text-...`, `dark:border-...` agar sempurna baik di tema terang maupun gelap.

### B. Frontend - Komponen Modal & Render Engine (`RkasAiReviewModal.tsx`)
1. **Layout Modal 5XL**:
   - Memperbesar ukuran dari `maxWidth="2xl"` menjadi `maxWidth="5xl"`.
   - Header dilengkapi ikon DeepSeek Brain, badge status anggaran, dan tombol aksi (*Copy*, *Print*, *Regenerate*, *Close*).
2. **Penyaring & Pembersih HTML**:
   - Menghapus tag pembungkus markdown jika model AI secara tidak sengaja mengembalikannya (`replace(/^```html\s*/i, '').replace(/```\s*$/i, '')`).
   - Merender HTML secara aman dengan `dangerouslySetInnerHTML`.
3. **Animasi Skeleton Loading**:
   - Saat `loading === true`, tampilkan skeleton placeholder berupa 4 kartu metrik berdenyut (*animate-pulse*), skeleton tabel, dan skeleton alert card.
4. **Fitur Print & Copy**:
   - `handleCopy()`: Menyalin teks ringkasan telaah ke clipboard dengan notifikasi "Berhasil disalin!".
   - `handlePrint()`: Membuka dialog cetak browser khusus area telaah AI.

### C. Jaminan Tailwind CSS Safelist (`ai-review-templates.ts`)
1. Untuk mencegah Tailwind CSS compiler menghapus (*purge*) kelas-kelas dinamis yang digunakan oleh AI, seluruh set kelas utilitas yang diinstruksikan dalam prompt didaftarkan dalam file `resources/js/Components/Rkas/ai-review-templates.ts`.
2. File ini otomatis dipindai oleh Vite saat kompilasi produksi (`npm run build`).

---

## 4. Rencana Verifikasi & Pengujian
1. **Pengujian Fungsional**:
   - Buka modal Telaah AI pada RKAS Reguler dan RKAS Perubahan.
   - Periksa apakah hasil generate berupa kartu interaktif, tabel belanja modern, alert box anomali, dan checklist rekomendasi.
   - Uji tombol Salin Ringkasan dan Cetak.
   - Uji tampilan pada Mode Terang dan Mode Gelap (*Dark Mode*).
2. **Static Analysis & Build**:
   - Jalankan `npx tsc --noEmit` untuk memastikan tidak ada error TypeScript.
   - Jalankan `vendor/bin/pint` untuk menjaga kerapihan PHP.
   - Jalankan `php artisan test --filter=RoleKepalaSekolahTest` dan `Unit` tests.
   - Jalankan `npm run build` untuk memverifikasi kompilasi aset frontend.

