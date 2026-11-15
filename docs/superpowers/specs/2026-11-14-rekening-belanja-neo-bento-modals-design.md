# Desain Neo-Bento Modals — Rekening Belanja

**Tanggal:** 2026-11-14  
**Halaman terkait:** `resources/js/Pages/DataMaster/RekeningBelanja/Index.tsx`  
**Komponen baru:** `resources/js/Pages/DataMaster/RekeningBelanja/Partials/RekeningBelanjaModals.tsx`

---

## 1. Latar Belakang & Masalah

Halaman `Data Master → Rekening Belanja` memiliki 4 modal inline (`L379–797` di `RekeningBelanja/Index.tsx`) dengan sejumlah kekurangan Neo-Bento dan UX:

1. **Sudut luar & struktur visual modal tidak seragam**: keempat kontainer utama di dalam `<Modal>` memakai `relative overflow-hidden bg-white dark:bg-[#15131F]` tanpa `rounded-[26px]`, tanpa layer ambient glow terisolasi (`pointer-events-none absolute inset-0 overflow-hidden rounded-[26px]`), tanpa `StatusBadge`, dan tanpa footer `rounded-b-[26px]`.
2. **Duplikasi form Tambah & Edit**: seluruh field (`kode_rekening`, `rincian_objek`, `kategori`, serta 5 flag pajak) ditulis dua kali dengan `id` DOM yang sama.
3. **Dropdown `Kategori` & Pengaturan Pajak kurang modern**:
   - `<select>` native untuk `kategori` rentan masalah kontras opsi dan ketidakkonsistenan tema pada dark mode.
   - 5 flag pajak (`is_ppn`, `is_pph21`, `is_pph22`, `is_pph23`, `is_pph4`) hanya berupa checkbox kecil polos tanpa kartu toggle interaktif.
4. **Kekurangan pada modal Import Excel**:
   - Menggunakan kelas Tailwind tidak valid di tema ini (`border-sky-200/70`, `text-sky-500`, `dark:text-sky-400`).
   - Belum ada area dropzone drag-and-drop maupun kartu preview file terpilih (nama file, ekstensi, ukuran, tombol *Ganti* & *Hapus*).
   - Tombol `Batal` hanya menjalankan `resetImport()` tanpa `clearImportErrors()`.
5. **Kekurangan pada modal Konfirmasi Hapus**:
   - Memakai `PrimaryButton` yang di-override class rose alih-alih `DangerButton`.
   - Menampilkan teks generik tanpa kartu peringatan `pastel-rose` dan tanpa detail `kode_rekening`, `rincian_objek`, atau `kategori` item target.

---

## 2. Tujuan Desain

- Menyelaraskan keempat modal Rekening Belanja ke sistem visual **Neo-Bento Full-Color** mengikuti pola `SekolahModals.tsx` dan `KodeKegiatanModals.tsx`.
- Mengekstrak modal ke `resources/js/Pages/DataMaster/RekeningBelanja/Partials/RekeningBelanjaModals.tsx` dan menyatukan form Tambah & Edit menjadi satu komponen `RekeningBelanjaFormModal`.
- Mengganti `<select>` `Kategori` dengan `react-select` bertema Neo-Bento yang menempel rapi di bawah kontrol tanpa terpotong container modal, serta mengubah 5 checkbox pajak menjadi kartu toggle interaktif Bento.
- Meningkatkan UX modal Import (kartu preview file, perbaikan token `sky`, cleanup error) dan modal Hapus (`DangerButton` + kartu ringkasan item `pastel-rose`).

---

## 3. Arsitektur Komponen

### 3.1 Struktur File
- **Baru:** `resources/js/Pages/DataMaster/RekeningBelanja/Partials/RekeningBelanjaModals.tsx`
- **Diubah:** `resources/js/Pages/DataMaster/RekeningBelanja/Index.tsx`

### 3.2 Interface Utama
- `RekeningBelanjaItem`:
  - `id: number`
  - `kode_rekening: string`
  - `rincian_objek: string`
  - `kategori: string`
  - `is_ppn: boolean`
  - `is_pph21: boolean`
  - `is_pph22: boolean`
  - `is_pph23: boolean`
  - `is_pph4: boolean`
- `RekeningBelanjaFormData` (`kode_rekening`, `rincian_objek`, `kategori`, `is_ppn`, `is_pph21`, `is_pph22`, `is_pph23`, `is_pph4`)
- `RekeningBelanjaModalsProps`: props terkelompok untuk Modal Form (`isAddOpen`, `onCloseAdd`, `onSubmitAdd`, `isEditOpen`, `onCloseEdit`, `onSubmitEdit`, `data`, `setData`, `errors`, `processing`), Modal Import (`isImportOpen`, `onCloseImport`, `importFile`, `onChangeImportFile`, `importProgress`, `importErrors`, `importProcessing`, `onSubmitImport`, `downloadTemplateUrl`), dan Modal Hapus (`isDeleteOpen`, `deleteTarget`, `deleteProcessing`, `onCloseDelete`, `onConfirmDelete`).

### 3.3 Helper Internal
- `GLOW_TONES` (`lime`, `amber`, `sky`, `rose`) memakai token valid `tailwind.config.js`.
- `NeoModalShell`: `rounded-[26px]` tanpa `overflow-hidden` di container utama (agar menu `react-select` tidak terpotong); ambient glow ditempatkan pada layer `pointer-events-none absolute inset-0 overflow-hidden rounded-[26px]`.
- `RekeningBelanjaModalHeader`: header `rounded-t-[26px]` berisi `IconTile` `md`, `h2`, `StatusBadge` (`dot={false}`), subjudul `text-[11px]`, dan tombol tutup `X`.
- `buildKategoriSelectClassNames(hasError)`: gaya Neo-Bento `react-select` (`unstyled`, fokus ring `lime-400`, dark `#1A1728` menu, highlight terpilih `bg-pastel-lavender/85` / `dark:bg-brand-500/25`).
- `KATEGORI_OPTIONS`: `Operasi`, `Modal Peralatan dan Mesin`, `Modal Jalan, Jaringan, dan Irigasi`, `Modal Aset Tetap Lainnya`. Bila `data.kategori` eksisting berisi nilai lain dari DB, opsi tersebut tetap disuntikkan secara dinamis ke daftar opsi saat edit agar tidak hilang.
- `TAX_FIELDS`: daftar konfigurasi data-driven untuk 5 flag pajak (`is_ppn` → `PPN`, `is_pph21` → `PPh 21`, `is_pph22` → `PPh 22`, `is_pph23` → `PPh 23`, `is_pph4` → `PPh 4(2)`) sehingga seluruh kartu toggle dirender lewat satu `.map()` tanpa duplikasi.
- `formatBytes(bytes)`: format ukuran berkas untuk kartu preview Import.

---

## 4. Rancangan Visual Per Modal

### 4.1 `RekeningBelanjaFormModal` (Input & Edit Rekening Belanja)
- **Mode `'add'`**: `IconTile tone="lime"` (`Plus`), `StatusBadge tone="lime"` (`Tambah Data`), judul `Input Rekening Belanja`, submit `Simpan Data`.
- **Mode `'edit'`**: `IconTile tone="amber"` (`Pencil`), `StatusBadge tone="warning"` (`Edit Data`), judul `Edit Rekening Belanja`, submit `Update Data`.
- **Kartu Bento 1 — Identitas Rekening Belanja**:
  - `kode_rekening` (`id={`${mode}-kode_rekening`}`, `font-mono`, `required`)
  - `rincian_objek` (`id={`${mode}-rincian_objek`}`, `required`)
  - `kategori` (`Select<SelectOption, false>` Neo-Bento dengan `inputId={`${mode}-kategori`}`, `menuPlacement="auto"`, `required` divalidasi di UI dengan pesan ramah atau HTML/controller validation — tetap menandai field wajib dengan `*` dan menjaga feedback error `errors.kategori`; bila `kategori` kosong saat submit pada client, tampilkan pesan error lokal singkat agar tidak tersubmit kosong).
- **Kartu Bento 2 — Pengaturan Pajak**:
  - Header kartu mini dengan ikon `ReceiptPercent` / `Percent` Lucide + label `PENGATURAN PAJAK`.
  - Grid `grid-cols-2 sm:grid-cols-3 gap-2.5` berisi 5 tombol toggle/label (`<input type="checkbox" className="sr-only" />` di dalam `<label>`) untuk `PPN`, `PPh 21`, `PPh 22`, `PPh 23`, `PPh 4(2)`:
    - Aktif: `border-mint/60 bg-pastel-mint/70 text-emerald-800 dark:border-mint/40 dark:bg-mint/15 dark:text-emerald-200` + ikon `Check` kecil dalam pil `bg-mint text-white`.
    - Nonaktif: `border-slate-200/80 bg-white text-slate-600 hover:border-slate-300 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300`.
- **Footer**: `rounded-b-[26px] border-t border-slate-100 bg-slate-50/70 px-6 py-4 dark:border-white/5 dark:bg-white/[0.02]` berisi `Batal` (`SecondaryButton`) dan `Simpan Data` / `Update Data` (`PrimaryButton`).

### 4.2 `RekeningBelanjaImportModal` (Import Data Excel)
- `IconTile tone="sky"` (`FileSpreadsheet`), `StatusBadge tone="info"` (`Import Excel`).
- Kartu panduan **Petunjuk Import** (`rounded-[20px] border border-sky/20 bg-pastel-sky/75 p-4 dark:border-sky/25 dark:bg-sky/10`) + tombol `Download Template Excel` (`window.open(downloadTemplateUrl, '_blank')` sesuai perilaku awal).
- Area upload drag-and-drop & klik saat kosong; berganti menjadi **Kartu Preview File Terpilih** (`nama`, `ekstensi`, `ukuran`, tombol `Ganti` & tombol `Hapus`) setelah file dipilih, beserta progress bar `from-sky to-mint` dan footer `rounded-b-[26px]` yang memanggil `onCloseImport` (`resetImport()` + `clearImportErrors()`).

### 4.3 `RekeningBelanjaDeleteModal` (Konfirmasi Hapus Data)
- `maxWidth="sm"`, `IconTile tone="rose"` (`AlertTriangle`), `StatusBadge tone="danger"` (`Konfirmasi Hapus`).
- Kartu peringatan `rounded-[20px] border border-rose-200/80 bg-pastel-rose/70 p-4 dark:border-rose-500/20 dark:bg-rose-500/10` berisi pesan konfirmasi dan kotak detail `deleteTarget` (`kode_rekening` dalam chip monospace, `rincian_objek`, dan label `kategori`).
- Footer `rounded-b-[26px]` berisi `SecondaryButton` (`Batal`) + `DangerButton` (`Ya, Hapus`, disabled saat `processing`).

---

## 5. Perubahan State di `RekeningBelanja/Index.tsx`

- Menghapus import tidak terpakai (`router`, `Link`) serta import modal yang pindah (`Modal`, `InputLabel`, `InputError`). Mempertahankan `TextInput` dan `Fragment` karena dipakai oleh toolbar pencarian dan paginasi tabel.
- Mengubah `deleteId: number | null` menjadi `deleteTarget: RekeningBelanjaItem | null`.
- Menambahkan helper `resetForm`, `closeAddModal`, `closeEditModal`, `closeImportModal`, `closeDeleteModal`, dan `submitImport`, serta memanggil `clearErrors()` saat membuka/menutup form Tambah dan Edit.

---

## 6. Verifikasi

- Menjalankan `npm run build` (`tsc && vite build`) dan memastikan kompilasi TypeScript strict & Vite build berhasil dengan 0 error.
- Memastikan seluruh route Laravel (`rekening-belanja.store`, `rekening-belanja.update`, `rekening-belanja.destroy`, `rekening-belanja.import`, `rekening-belanja.download-template`) tetap identik.

