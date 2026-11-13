# Desain Revamp Modal Tambah/Update Pembelanjaan BKU (Neo-Bento)

**Tanggal:** 2026-11-13
**Target File:** `resources/js/Pages/Penatausahaan/Bku.tsx`

## 1. Latar Belakang & Masalah yang Diselesaikan
Modal **Isi Detail Pembelanjaan** / **UPDATE Detail Pembelanjaan** (3 step) pada `resources/js/Pages/Penatausahaan/Bku.tsx` masih menggunakan gaya antarmuka lama yang belum serasi dengan desain Neo-Bento SIKAS:
1. Header modal masih memakai gradient gelap (`from-[#2B2940] via-[#232135] to-[#191826]`) tanpa tombol tutup `X`, badge status, maupun `IconTile` Neo-Bento, serta container luar memakai `rounded-lg`.
2. Stepper horizontal masih memakai `text-sky-600` yang tidak terkompilasi di Tailwind CSS (karena token `sky` di `tailwind.config.js` di-override menjadi satu warna `#3B82F6`), sehingga teks step aktif tampil hitam biasa.
3. Input `DatePicker` pada Step 1 (`Tanggal Transaksi`) dan Step 2 (`Tanggal Belanja/Nota`) diberi class `block`, yang menimpa `flex` bawaan `DatePicker` sehingga ikon kalender dan teks placeholder menumpuk dua baris.
4. Kartu di Step 2 (`bg-cyan-400 rounded-t-lg`) dan Step 3 (`bg-cyan-100`, `border-l-4`, `rounded-lg`) masih bergaya lama, dan beberapa label di Step 1 memiliki margin `ms-2 me-2` yang membuat perataan tidak sejajar.

## 2. Solusi Desain (Pendekatan A — Pembaruan Terfokus di `Bku.tsx`)
Memperbarui tampilan shell modal, stepper pill-bar, dan kartu/input di dalam `renderStep1`, `renderStep2`, dan `renderStep3` tanpa mengubah urutan 3 step, state, validasi, AI generator, atau payload ke backend.

### 2.1 Shell & Header Modal (`maxWidth="4xl"`, `closeable={false}`)
- Wrapper utama: `relative overflow-visible rounded-[26px] bg-white dark:bg-[#15131F]`.
- Glow blob `bg-brand-500/10` diisolasi di `<div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[26px]">`.
- Header Neo-Bento terang (`relative flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5 dark:border-white/5`):
  - `IconTile` (`tone="violet"`, `size="lg"`) dengan ikon tas belanja.
  - Judul `Isi Detail Pembelanjaan` / `UPDATE Detail Pembelanjaan` + `<StatusBadge tone="violet" dot={false}>Step {currentStep} / 3</StatusBadge>`.
  - Subjudul `text-[11px] font-medium leading-relaxed text-slate-400 dark:text-slate-500`.
  - Tombol tutup `X` di pojok kanan atas memanggil `closeModal` (klik di luar backdrop tetap nonaktif via `closeable={false}`).

### 2.2 Stepper Pill-Bar Neo-Bento (Tetap 3 Step)
Urutan step (`1 Detail Transaksi`, `2 Detail Barang/Jasa`, `3 Perhitungan Pajak`) tidak berubah:
- Wadah: `rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3 dark:border-white/5 dark:bg-white/[0.03]`.
- Garis penghubung horizontal halus di antara node step (`bg-slate-200/80 dark:bg-white/10`).
- **Step Selesai (`currentStep > step.number`)**: lingkaran `bg-pastel-mint text-mint ring-1 ring-mint/20` berisi ikon centang + label `text-emerald-700 dark:text-emerald-300 font-bold`.
- **Step Aktif (`currentStep === step.number`)**: lingkaran `bg-lime-400 text-slate-950 shadow-lime` + label `text-slate-900 dark:text-white font-extrabold`.
- **Step Belum Aktif (`currentStep < step.number`)**: lingkaran `bg-white border border-slate-200/90 text-slate-400 dark:bg-white/5 dark:border-white/10` + label `text-slate-400 dark:text-slate-500 font-semibold`.

### 2.3 Step 1 — `Detail Transaksi`
- **Panel Bento 1 (Waktu & Metode Transaksi)**: `rounded-2xl border border-slate-100 bg-slate-50/60 p-4 dark:border-white/5 dark:bg-white/[0.02]` berisi `Tanggal Transaksi` (`DatePicker` tanpa class `block`) dan `Jenis Transaksi` (select `rounded-xl`).
- **Panel Bento 2 (Informasi Toko / Penerima Pembayaran)**: checkbox `no_entity`, input pencarian `Nama Toko/Badan Usaha` atau `Nama Penerima Pembayaran` dengan dropdown `rounded-2xl border border-slate-100 bg-white shadow-float`, `Alamat Toko/Badan Usaha`, serta `NPWP` dan checkbox `Tidak punya NPWP`.
- Menghapus `ms-2 me-2` yang sebelumnya membuat label dan input tidak sejajar.

### 2.4 Step 2 — `Detail Barang/Jasa`
- **Panel Bento Nota & Tanggal**: `Nomor Nota (Opsional)` dan `Tanggal Belanja/Nota` (`DatePicker` tanpa class `block`) dalam kartu `rounded-2xl border border-slate-100 bg-slate-50/60 p-4 dark:border-white/5 dark:bg-white/[0.02]`.
- **Kartu Utama `Kegiatan 1`**: `rounded-2xl border border-slate-200/80 bg-white dark:border-white/10 dark:bg-white/[0.02]`, mengganti header `bg-cyan-400` dengan header Neo-Bento `bg-pastel-lavender/65 border-b border-brand-500/10 px-5 py-3.5 dark:bg-brand-500/10` + badge nomor `1`.
- Dropdown `SearchableSelect`, tombol `Asisten AI` & `Variasi`, `textarea` (`rounded-xl`), serta daftar item RKAS (`rounded-2xl border border-slate-100 p-4`, badge `Maks`, harga satuan `text-sikas-num`) diseragamkan ke palet Neo-Bento.

### 2.5 Step 3 — `Perhitungan Pajak`
- **Kartu Ringkasan Kegiatan**: `rounded-2xl border border-slate-200/80 bg-white dark:border-white/10 dark:bg-white/[0.02]` dengan header `bg-pastel-lavender/65 border-b border-brand-500/10 px-5 py-3 dark:bg-brand-500/10`, daftar item dalam kartu `rounded-xl border border-slate-100 bg-slate-50/70 p-3 dark:border-white/5 dark:bg-white/[0.02]`, serta total kotor `text-sikas-num text-[14px] font-extrabold text-brand-600 dark:text-brand-300`.
- **Panel Pajak & Pajak Daerah**: `rounded-2xl border border-slate-100 bg-slate-50/60 p-4 dark:border-white/5 dark:bg-white/[0.02]`, select `rounded-xl`, info Non-ASN bernuansa `bg-pastel-amber/60`, dan info Golongan PNS bernuansa `bg-pastel-sky/60` dengan `text-blue-700 dark:text-blue-300`.

### 2.6 Footer Modal
- Tombol `Batal` / `Kembali` (`SecondaryButton`) dan `Lanjut` / `Simpan` (`PrimaryButton`) pada footer ber-border atas `border-t border-slate-100 pt-4 dark:border-white/5`.

## 3. Verifikasi
- Menjalankan `npm run build` (`tsc && vite build`) untuk memastikan tidak ada error kompilasi TypeScript maupun build Vite.
