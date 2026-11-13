# Desain Neo-Bento Modal STS (`Create`, `Edit`, `Payment`, `Delete`)

**Tanggal:** 2026-11-13  
**Komponen Target:** `resources/js/Pages/Penatausahaan/Sts/Partials/StsModals.tsx` (baru) & `resources/js/Pages/Penatausahaan/Sts/Index.tsx`  
**Tujuan:** Merombak keempat modal di halaman Penatausahaan STS (**Tambah STS Baru**, **Edit STS**, **Proses/Edit Pembayaran**, dan **Hapus Data STS**) agar seragam Neo-Bento, memperbaiki bug visual mode gelap pada pemilih **Tahun Anggaran** (`react-select`), mencegah pemotongan popup kalender `DatePicker` & dropdown oleh `overflow-hidden`, serta menghadirkan ringkasan sisa bayar real-time pada modal Pembayaran.

---

## 1. Arsitektur & Komponen

- **Ekstraksi Partial (`StsModals.tsx`)**:
  Memisahkan seluruh 4 modal STS dari [Index.tsx](file:///c:/laragon/www/newSIKAS2/newSIKAS/resources/js/Pages/Penatausahaan/Sts/Index.tsx) ke `resources/js/Pages/Penatausahaan/Sts/Partials/StsModals.tsx` (sepola dengan partial modal pada modul `Penatausahaan`).
- **Arsitektur Shell Bersama ke-4 Modal**:
  - Setiap panel root menggunakan `relative overflow-visible rounded-[26px] bg-white dark:bg-[#15131F]` (menghilangkan sudut siku yang terlihat di tepi `DialogPanel` serta memastikan popup kalender `DatePicker` maupun dropdown pemilih tahun tampil utuh tanpa terpotong).
  - Dekorasi glow lembut terisolasi di dalam `<div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[26px]">`.
  - Seluruh area field input dibungkus kartu bento `rounded-[20px] border border-slate-200/80 bg-slate-50/70 p-4 dark:border-white/10 dark:bg-white/[0.03]`.

---

## 2. Rincian Desain Tiap Modal

### 2.1 Modal Tambah STS Baru (`Create`)
- **Header (`maxWidth="md"`)**: `IconTile` `tone="violet"` (`Plus`) + judul **"Tambahkan STS Baru"** + `StatusBadge` `tone="violet"` `"STS Baru"` + tombol tutup `X`.
- **Pemilih Tahun Anggaran Select2 Neo-Bento (`react-select` `unstyled`)**:
  - Menggunakan `<Select unstyled isSearchable isClearable ... />` dengan prop `classNames` Tailwind v3 yang adaptif di light & dark mode (menggantikan `YearBudgetPicker` pill maupun `react-select` putih hardcoded):
    - Kotak input `min-h-[42px] rounded-2xl border bg-white text-slate-900 dark:bg-white/5 dark:text-white` dengan ring fokus lime konsisten.
    - Menekan ring bawaan `@tailwindcss/forms` pada `<input>` di dalam `react-select` agar ketikan langsung terasa rapi tanpa kotak ganda.
    - Menu dropdown `rounded-2xl bg-white dark:bg-[#1A1728] border shadow-float z-50` dengan opsi terpilih beraksen `pastel-lavender` / `brand`.
- **Input Nomor STS & Jumlah STS**:
  - `Nomor STS`: placeholder `"Contoh: 001/STS/2026"`.
  - `Jumlah STS`: input moneter `text-sikas-num` dengan handler `handleCurrencyChange` yang sudah ada.
- **Footer**: `<SecondaryButton>` (**Batal**) + `<PrimaryButton>` (**Simpan**).

### 2.2 Modal Edit STS (`Edit`)
- **Header (`maxWidth="md"`)**: `IconTile` `tone="amber"` (`Pencil`) + judul **"Edit STS"** + `StatusBadge` `tone="warning"` menampilkan `selectedSts.nomor_sts` (bila tersedia).
- **Body**: Kartu form bento dengan input `Nomor STS` dan `Jumlah STS` (`text-sikas-num`).
- **Footer**: `<SecondaryButton>` (**Batal**) + `<PrimaryButton>` (**Simpan Perubahan**).

### 2.3 Modal Proses / Edit Pembayaran (`Payment`)
- **Header (`maxWidth="md"`)**: `IconTile` `tone="mint"` (`Wallet`) + judul **"Proses Pembayaran"** / **"Edit Pembayaran"** + `StatusBadge` `tone="success"` menampilkan `selectedSts.nomor_sts`.
- **Bento Summary Strip (3 Kartu Mini)**:
  1. **Total STS**: Menampilkan `selectedSts.jumlah_sts` (`text-sikas-num`).
  2. **Sisa Tagihan**: Menampilkan `selectedSts.sisa` (`text-sikas-num`, warna `rose`).
  3. **Estimasi Sisa (Live)**:
     - Saat tambah pembayaran baru (`!is_edit`): `estimatedSisa = sisa - jumlah_bayar_raw`.
     - Saat edit pembayaran (`is_edit`): `baseRemaining = Math.max(0, Number(selectedSts.jumlah_sts || 0) - Number(jumlah_bayar_raw || 0))`.
     - Latar kartu adaptif: `bg-pastel-mint/60` (`Lunas` saat `0`), `bg-pastel-sky/60` (sisa normal), atau `bg-pastel-rose/65` (jika bayar melebihi nilai total/sisa).
     - Memperbaiki kelas invalid `border-sky-200/70` & `dark:border-sky-400/20` ke token valid `border-sky/25` / `bg-pastel-sky`.
- **Form**: `DatePicker` (`overflow-visible` agar tidak terpotong) + input `Jumlah Bayar` (`text-sikas-num`).
- **Footer**: `<SecondaryButton>` (**Batal**) + `<PrimaryButton>` (**Simpan Pembayaran**).

### 2.4 Modal Hapus Data STS (`Delete`)
- **Header (`maxWidth="sm"`)**: `IconTile` `tone="rose"` (`Trash2`) + judul **"Hapus Data STS"**.
- **Body**: Banner konfirmasi lembut `rounded-[20px] border border-rose-200/80 bg-pastel-rose/65 dark:border-rose-500/25 dark:bg-rose-500/[0.08]` menampilkan nomor STS yang akan dihapus (`stsToDelete?.nomor_sts`) serta pesan peringatan permanen.
- **Footer**: `<SecondaryButton>` (**Batal**) + `<DangerButton>` (**Hapus**).

---

## 3. Keamanan Token Tailwind & Verifikasi

- Menghapus import `Select from 'react-select'` yang tidak terpakai lagi di `Sts/Index.tsx` (bila tidak dipakai di bagian tabel lainnya).
- Seluruh kelas memakai token valid `tailwind.config.js` (`pastel-lavender`, `pastel-mint`, `pastel-sky`, `pastel-rose`, `pastel-amber`, `brand-200..900`, `mint`, `sky`).
- Verifikasi dijalankan dengan `npm run build` (`tsc && vite build`).

