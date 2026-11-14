# Desain Perbaikan 4 Modal Profil Sekolah ke Gaya Neo-Bento

Tanggal: 2026-11-14  
Status: Draft untuk Review User  
Ruang Lingkup:
- Komponen Baru: `resources/js/Pages/DataMaster/SekolahProfile/Partials/SekolahModals.tsx`
- [SekolahProfile/Index.tsx](file:///c:/laragon/www/newSIKAS2/newSIKAS/resources/js/Pages/DataMaster/SekolahProfile/Index.tsx)

---

## 1. Masalah yang Diperbaiki

1. **Sudut Modal Kotak Tajam**: Modal `Update Data Sekolah`, `Upload Kop Surat`, dan `Hapus Kop Surat` sebelumnya tidak memiliki `rounded-[26px]` pada permukaan `bg-white dark:bg-[#15131F]`, sehingga memunculkan sudut siku tajam di luar `DialogPanel`.
2. **Input `<select>` Bawaan**: Field `Status Sekolah` dan `Jenjang` memakai `<select>` HTML standar yang kurang selaras dengan dark mode dan gaya Neo-Bento SIKAS.
3. **Kurangnya Hierarki Bento**: Semua field pada form Data Sekolah menumpuk dalam satu grid datar tanpa pengelompokan kartu Bento, modal Upload belum memiliki pratinjau file interaktif, dan modal Preview Kop hanya berupa gambar polos dengan tombol `X` melayang.

---

## 2. Arsitektur Komponen (`Partials/SekolahModals.tsx`)

Keempat modal diekstrak dari [SekolahProfile/Index.tsx](file:///c:/laragon/www/newSIKAS2/newSIKAS/resources/js/Pages/DataMaster/SekolahProfile/Index.tsx) ke komponen `SekolahModals.tsx` (selaras dengan `Partials/KopSuratBuilder.tsx` dan pola `StsModals.tsx`).

### 2.1 Shell & Header Neo-Bento Seragam (`SekolahModalHeader`)
- Setiap modal membungkus konten dengan:
  `<div className="relative overflow-hidden rounded-[26px] bg-white dark:bg-[#15131F]">`
- Layer *ambient radial glow* terisolasi di sudut kanan atas & kiri bawah (`pointer-events-none absolute inset-0 overflow-hidden rounded-[26px]`).
- Header menampilkan `IconTile`, judul, `StatusBadge`, subtitle ringkas, dan tombol tutup `X` konsisten.
- Footer menggunakan latar halus `border-t border-slate-100 bg-slate-50/70 px-6 py-4 dark:border-white/5 dark:bg-white/[0.02]`.

---

## 3. Spesifikasi Detail Tiap Modal

### 3.1 Modal Update / Input Data Sekolah (`maxWidth="2xl"`)
- Header: `IconTile tone="violet"` (`Building2`), judul dinamis (`Update Data Sekolah` / `Input Data Sekolah`), badge `Data Master` / `Identitas Baru`.
- Shell & Body: Outer shell `overflow-visible rounded-[26px]` (glow terisolasi tetap `overflow-hidden rounded-[26px]`, header `rounded-t-[26px]`) dengan body `overflow-visible px-6 py-4 space-y-3.5` (scroll ditangani oleh `<Dialog>` pada `Modal.tsx`):
  1. **Kartu Bento 1 — Identitas Satuan Pendidikan** (`rounded-[20px] border border-slate-200/80 bg-slate-50/70 p-4 dark:border-white/10 dark:bg-white/[0.03]`):
     - `Nama Sekolah` (`md:col-span-2`, `TextInput` full width).
     - `NPSN` (`readOnly`, tampilan monospace/tabular + `StatusBadge tone="success"` *"Lisensi Terverifikasi"* + keterangan lisensi).
     - `Status Sekolah` (`Negeri`, `Swasta`) dan `Jenjang` (`SD`, `SMP`, `SMA`, `SMK`): menggunakan **`react-select`** (`unstyled`, `isSearchable`, default `menuPosition="absolute"` agar menu menempel presisi di bawah input tanpa terdampak `transform` pada `DialogPanel`). Styling `classNames` seragam dengan `StsModals.tsx` (focus ring lime, dark menu `#1A1728`, fix `[&_input]:!ring-0`).
     - Menjaga validasi nilai jika data lama berisi nilai di luar daftar standar dengan fallback opsi bila cocok, atau mapping langsung string value.
  2. **Kartu Bento 2 — Lokasi & Alamat Sekolah** (`rounded-[20px]`):
     - Grid 2 kolom: `Provinsi`, `Kabupaten/Kota`, `Kecamatan`, `Kelurahan/Desa`.
     - `Alamat Lengkap` (`md:col-span-2`, `textarea` `rounded-2xl` dengan styling fokus identik dengan `TextInput`).
- Footer: `SecondaryButton` **Batal** & `PrimaryButton` **Simpan Perubahan** (atau **Simpan Data**).

### 3.2 Modal Upload Kop Surat (`maxWidth="md"`)
- Header: `IconTile tone="mint"`, badge `JPG / PNG`, subtitle *Unggah file gambar kop surat resmi sekolah*.
- Body:
  - Kartu info spesifikasi (`rounded-[20px]`): menampilkan pill syarat format (`JPG / JPEG / PNG`, `Maks. 2MB`) dan resolusi rekomendasi (`2480 × 588 px`) agar cetak SPJ & laporan presisi.
  - Dropzone pilih file interaktif (`rounded-[20px]` border putus-putus):
    - Menampilkan preview gambar sementara (`URL.createObjectURL`) + nama file & ukuran file (`KB/MB`) saat file dipilih, plus tombol ganti file / reset pilihan saat modal ditutup.
    - Menampilkan `InputError` jika upload gagal validasi.
- Footer: `SecondaryButton` **Batal** & `PrimaryButton` **Upload Kop Surat**.

### 3.3 Modal Konfirmasi Hapus Kop Surat (`maxWidth="sm"`)
- Header: `IconTile tone="rose"`, badge `Konfirmasi`.
- Body: Kartu peringatan `pastel-rose` (`rounded-[20px] border border-rose-200/80 bg-pastel-rose/70 p-4 dark:border-rose-400/20 dark:bg-rose-500/10`) menjelaskan bahwa penghapusan kop surat tidak dapat dibatalkan.
- Footer: `SecondaryButton` **Batal** & `DangerButton` **Hapus Kop Surat**.

### 3.4 Modal Pratinjau Kop Surat (`maxWidth="2xl"`)
- Header: `IconTile tone="violet"`, judul **Pratinjau Kop Surat Resmi**, badge `Aktif`, dan tombol tutup `X`.
- Body: Surface panggung pratinjau `rounded-[20px] border border-slate-200/80 bg-slate-50/90 p-4 dark:border-white/10 dark:bg-white/[0.03]` yang membingkai gambar `kop_surat` secara rapi (`rounded-xl border shadow-sm`).
- Footer: `SecondaryButton` **Tutup**.

---

## 4. Aturan Teknis & Verifikasi
- Mematuhi token Tailwind v3 SIKAS (tanpa `brand-50`, `brand-100`, `sky-100..950`, `gray-850/750`, `py-4.5`).
- Tidak mengubah kontrak endpoint controller (`sekolah-profile.store`, `sekolah-profile.update`, `sekolah-profile.upload-kop`, `sekolah-profile.delete-kop`).
- Verifikasi akhir: `npm run build` (`tsc && vite build`) harus lulus tanpa error TypeScript maupun Vite.

