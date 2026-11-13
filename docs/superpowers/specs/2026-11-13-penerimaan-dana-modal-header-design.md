# Desain Perbaikan Spacing Header Modal Penerimaan Dana

**Tanggal:** 2026-11-13
**Target File:** `resources/js/Pages/Penatausahaan/Index.tsx`

## 1. Latar Belakang & Akar Masalah
Pada modal **Daftar Penerimaan Dana** / **Catat Penerimaan Dana** di `resources/js/Pages/Penatausahaan/Index.tsx`, area judul modal terlihat sempit dan menempel ke tepi atas serta garis pemisah bawah karena dua masalah class Tailwind CSS v3:
1. Container header memakai `py-4.5`, yang tidak termasuk dalam skala spacing Tailwind CSS v3 pada `tailwind.config.js`, sehingga kompilasi CSS menghasilkan `padding-top: 0` dan `padding-bottom: 0`.
2. Badge `Buku Kas Umum` memakai `bg-brand-50 text-brand-700`, padahal skala warna `brand` di `tailwind.config.js` dimulai dari `200` (`brand-200` s.d. `brand-900`), sehingga latar belakang pill badge tidak muncul.

## 2. Solusi Desain
Memperbaiki bagian header modal di `resources/js/Pages/Penatausahaan/Index.tsx` agar proporsional, lega, dan selaras dengan komponen sistem desain Neo-Bento SIKAS:

1. **Container Header Modal**:
   - Mengganti `py-4.5` menjadi `py-5` (`px-6 py-5`) dan `gap-3` menjadi `gap-4` (`relative flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5 dark:border-white/5`), sehingga ruang vertikal atas-bawah menjadi `20px` dan simetris dengan body modal (`px-6 py-5`).
2. **Grup Ikon & Teks Judul**:
   - Mengatur jarak antara `IconTile` dan blok judul menjadi `gap-3.5` (`flex items-center gap-3.5`).
   - Memberi `min-w-0 flex-1` pada wrapper teks judul.
3. **Baris Judul & Badge**:
   - Menggunakan `flex flex-wrap items-center gap-2.5` pada baris `<h2>` dan badge.
   - Mengganti `<span className="... bg-brand-50 ...">Buku Kas Umum</span>` dengan komponen `<StatusBadge tone="violet" dot={false}>Buku Kas Umum</StatusBadge>` yang sudah tersedia dan terimpor di `Penatausahaan/Index.tsx`, sehingga warna `bg-pastel-lavender text-brand-600` tampil konsisten di mode terang maupun gelap.
4. **Subjudul**:
   - Mengubah margin atas subjudul dari `mt-0.5` menjadi `mt-1` agar jarak vertikal antara judul dan deskripsi lebih seimbang.

## 3. Batasan (*Scope*)
- Perubahan hanya berlaku pada blok header modal *Penerimaan Dana* di `resources/js/Pages/Penatausahaan/Index.tsx`.
- Tidak mengubah perilaku `Modal`, state form, `DatePicker`, maupun payload API ke backend.

## 4. Verifikasi
- Menjalankan `npm run build` (`tsc && vite build`) untuk memastikan tidak ada error TypeScript maupun Vite build.
- Memastikan class Tailwind valid dan terkompilasi ke bundle CSS produksi.
