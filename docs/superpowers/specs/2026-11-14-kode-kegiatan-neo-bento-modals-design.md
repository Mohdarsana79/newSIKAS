# Desain Neo-Bento Modals — Kode Kegiatan

**Tanggal:** 2026-11-14  
**Halaman terkait:** `resources/js/Pages/DataMaster/KodeKegiatan/Index.tsx`  
**Komponen baru:** `resources/js/Pages/DataMaster/KodeKegiatan/Partials/KodeKegiatanModals.tsx`

---

## 1. Latar Belakang & Masalah

Halaman `Data Master → Kode Kegiatan` memiliki 4 modal yang saat ini masih inline di `KodeKegiatan/Index.tsx` (`L358–745`) dengan sejumlah kekurangan visual, konsistensi Neo-Bento, dan UX:

1. **Sudut luar modal tajam**: keempat kontainer utama di dalam `<Modal>` hanya memakai `relative overflow-hidden bg-white dark:bg-[#15131F]` tanpa `rounded-[26px]` dan tanpa layer ambient glow terisolasi (`pointer-events-none absolute inset-0 overflow-hidden rounded-[26px]`).
2. **Duplikasi form Tambah & Edit**: markup input (`kode`, `program`, `sub_program`, `uraian`) ditulis dua kali dengan `id` DOM yang bertabrakan (`id="kode"`, dst.).
3. **Hierarki & permukaan Bento belum konsisten**:
   - Header modal memakai subjudul `text-[10px]` dan belum menyertakan `StatusBadge`.
   - Field form tidak dikelompokkan dalam kartu Bento `rounded-[20px]`.
   - `textarea` `uraian` memakai `rounded-xl` alih-alih `rounded-2xl` yang selaras dengan `TextInput`.
   - Footer aksi belum memakai surface bawah `rounded-b-[26px] border-t bg-slate-50/70 dark:bg-white/[0.02]`.
4. **Kekurangan pada modal Import Excel**:
   - Terdapat typo label `"Pentuan Import"` (seharusnya `"Panduan Import"`).
   - Menggunakan kelas Tailwind tidak valid di tema project (`border-sky-200/70`, `text-sky-500`, `dark:text-sky-400` — padahal token `sky` didefinisikan datar `#3B82F6` di `tailwind.config.js`).
   - Tidak ada kartu preview file terpilih (nama file, ukuran file, dan tombol ganti/hapus file) setelah user memilih `.xlsx`/`.xls`.
   - Tombol `Batal` hanya memanggil `resetImport()` tanpa `clearImportErrors()`.
5. **Kekurangan pada modal Hapus Data**:
   - Hanya menampilkan teks polos tanpa kartu peringatan `pastel-rose` `rounded-[20px]`.
   - Tidak menampilkan `kode` dan `uraian` item target yang akan dihapus.

---

## 2. Tujuan Desain

- Menyelaraskan keempat modal Kode Kegiatan ke sistem visual **Neo-Bento Full-Color** seperti pola `Partials/SekolahModals.tsx`.
- Mengekstrak modal ke `resources/js/Pages/DataMaster/KodeKegiatan/Partials/KodeKegiatanModals.tsx` agar `KodeKegiatan/Index.tsx` bersih, fokus pada tabel dan state orkestrasi.
- Menyatukan form **Tambah** & **Edit** menjadi 1 komponen `KodeKegiatanFormModal` bermode `'add' | 'edit'` agar bebas duplikasi.
- Memperbaiki detail UX pada modal **Import Excel** (kartu preview file, perbaikan typo, perbaikan token warna Tailwind) dan modal **Hapus Data** (ringkasan item target di kartu `pastel-rose`).

---

## 3. Arsitektur Komponen

### 3.1 Struktur File
- **Baru:** `resources/js/Pages/DataMaster/KodeKegiatan/Partials/KodeKegiatanModals.tsx`
- **Diubah:** `resources/js/Pages/DataMaster/KodeKegiatan/Index.tsx`

### 3.2 Tipe & Interface Utama
- `KodeKegiatanItem` (`id`, `kode`, `program`, `sub_program`, `uraian`)
- `KodeKegiatanFormData` (`kode`, `program`, `sub_program`, `uraian`)
- `KodeKegiatanModalsProps` mengelompokkan props untuk:
  - Modal Form (`mode: 'add' | 'edit' | null`, `isOpen`, `onClose`, `data`, `setData`, `errors`, `processing`, `onSubmit`) — atau dipisah `isAddModalOpen` & `isEditModalOpen` yang ditangani bersih oleh `KodeKegiatanModals` dengan menyatukan render `KodeKegiatanFormModal` sehingga `Index.tsx` tetap mempertahankan state `isAddModalOpen` / `isEditModalOpen` dan handler `submitAdd` / `submitEdit` secara eksplisit tanpa kebingungan animasi tutup modal.
  - Modal Import (`isImportModalOpen`, `onCloseImport`, `importFile`, `onChangeImportFile`, `importProgress`, `importErrors`, `importProcessing`, `onSubmitImport`, `downloadTemplateUrl`)
  - Modal Hapus (`isDeleteModalOpen`, `deleteTarget: KodeKegiatanItem | null`, `deleteProcessing`, `onCloseDelete`, `onConfirmDelete`)

### 3.3 Helper Internal di `KodeKegiatanModals.tsx`
- `GLOW_TONES`: peta kelas blur latar belakang (`lime`, `amber`, `sky`, `rose`) menggunakan token warna valid `tailwind.config.js` (`lime-300`, `pastel-mint`, `pastel-amber`, `pastel-lavender`, `pastel-sky`, `pastel-rose`, `mint`, `sky`, `amber-500`, `rose-500`).
- `NeoModalShell`: kontainer `relative rounded-[26px] bg-white shadow-card-light dark:bg-[#15131F] dark:shadow-card-dark` dengan layer glow terisolasi `pointer-events-none absolute inset-0 overflow-hidden rounded-[26px]`.
- `KodeKegiatanModalHeader`: header `rounded-t-[26px]` berisi `IconTile` (`size="md"`), judul `text-[15.5px] font-extrabold`, `StatusBadge` (`dot={false}`), subjudul `text-[11px] font-medium`, serta tombol tutup (`X` Lucide).
- `formatBytes(bytes: number)`: memformat ukuran file `.xlsx`/`.xls` (`B`, `KB`, `MB`).

---

## 4. Rancangan Visual Per Modal

### 4.1 `KodeKegiatanFormModal` (Input & Edit Kode Kegiatan)
- **Mode `'add'`**:
  - `IconTile tone="lime"` + ikon `Plus` Lucide
  - `StatusBadge tone="lime"`: `Tambah Data`
  - Judul: `Input Kode Kegiatan`, Subjudul: `Tambahkan referensi kode kegiatan, program, dan uraian anggaran.`
  - Tombol submit: `Simpan Data`
- **Mode `'edit'`**:
  - `IconTile tone="amber"` + ikon `Pencil` Lucide
  - `StatusBadge tone="warning"`: `Edit Data`
  - Judul: `Edit Kode Kegiatan`, Subjudul: `Perbarui detail kode kegiatan dan klasifikasi program.`
  - Tombol submit: `Update Data`
- **Struktur Bento Form (`space-y-4 px-6 py-5`)**:
  1. **Kartu Bento 1 — Identitas Kode Kegiatan** (`rounded-[20px] border border-slate-200/80 bg-slate-50/75 p-4 dark:border-white/10 dark:bg-white/[0.03]`):
     - Header mini kartu dengan ikon `Hash` + label `IDENTITAS KODE KEGIATAN`
     - Input `kode` (`id={`${mode}-kode`}`), bergaya `font-mono`
     - Grid 2 kolom (`sm:grid-cols-2`): `program` (`id={`${mode}-program`}`) dan `sub_program` (`id={`${mode}-sub_program`}`)
  2. **Kartu Bento 2 — Uraian Kegiatan** (`rounded-[20px] border border-slate-200/80 bg-slate-50/75 p-4 dark:border-white/10 dark:bg-white/[0.03]`):
     - Header mini kartu dengan ikon `FileText` + label `URAIAN KEGIATAN`
     - `textarea` `uraian` (`id={`${mode}-uraian`}`, `rows={3}`, `rounded-2xl` dengan ring fokus lime & state error rose)
- **Footer (`rounded-b-[26px] border-t border-slate-100 bg-slate-50/70 px-6 py-4 dark:border-white/5 dark:bg-white/[0.02]`)**:
  - `SecondaryButton` (`Batal`) + `PrimaryButton` (`Simpan Data` / `Update Data`, disabled saat `processing`).

### 4.2 `KodeKegiatanImportModal` (Import Data Excel)
- **Header**: `IconTile tone="sky"` (`FileSpreadsheet`), `StatusBadge tone="info"` (`Import Excel`), judul `Import Data Excel`, subjudul `Unggah berkas Excel (.xlsx / .xls) untuk import data kode kegiatan massal.`
- **Kartu Panduan Bento**:
  - `rounded-[20px] border border-sky/20 bg-pastel-sky/70 p-4 dark:border-sky/25 dark:bg-sky/10` (mengganti token invalid `sky-200`, `sky-400`, `sky-500`).
  - Memperbaiki typo `"Pentuan Import"` → **`"Panduan Import"`**.
  - Menyertakan tombol **`Download Template Excel`** (`SecondaryButton` dengan ikon `Download` Lucide) sejajar rapi di dalam kartu atau tepat di bawah panduan.
- **Area Upload Interaktif**:
  - Ketika `importFile === null`: dropzone `rounded-[20px] border-2 border-dashed` (ikon `UploadCloud` Lucide, instruksi klik/pilih `.xlsx` / `.xls` maks. 5MB, input file terintegrasi dengan label yang ramah aksesibilitas, highlight error jika `importErrors.file`).
  - Ketika `importFile !== null`: tampilkan **Kartu Preview File Terpilih** (`rounded-[20px]` dengan ikon `FileSpreadsheet`, nama file, ukuran hasil `formatBytes(importFile.size)`, badge format ekstensi, serta tombol **Ganti** & **Hapus/Reset** file agar user yakin file benar sebelum klik `Mulai Import`).
  - Progress bar upload halus saat `importProgress` aktif (`from-sky to-mint`).
- **Footer**: `Batal` (memanggil `onCloseImport` yang menjalankan `resetImport()` + `clearImportErrors()`) dan `PrimaryButton` (`Mulai Import` / `Proses Import...`).

### 4.3 `KodeKegiatanDeleteModal` (Konfirmasi Hapus Data)
- `maxWidth="sm"`
- **Header**: `IconTile tone="rose"` (`AlertTriangle`), `StatusBadge tone="danger"` (`Konfirmasi Hapus`), judul `Hapus Kode Kegiatan?`, subjudul `Tindakan ini permanen dan tidak dapat dibatalkan.`
- **Isi Bento**:
  - Kartu peringatan `rounded-[20px] border border-rose-200/80 bg-pastel-rose/70 p-4 dark:border-rose-500/20 dark:bg-rose-500/10` yang menampilkan:
    - Kalimat konfirmasi singkat
    - Ringkasan item target dari `deleteTarget`: chip monospace **`kode`** + teks **`uraian`** (dengan fallback aman jika null saat animasi tutup).
- **Footer**: `SecondaryButton` (`Batal`) + `DangerButton` (`Ya, Hapus`, disabled saat `processing`).

---

## 5. Perubahan State di `KodeKegiatan/Index.tsx`

- Mengubah `deleteId: number | null` menjadi `deleteTarget: KodeKegiatan | null` (tetap menerima objek baris penuh dari tombol Hapus tabel: `handleDelete(item)`) sehingga modal Hapus dapat menampilkan `kode` & `uraian` sekaligus mengirim `deleteTarget.id` ke `route('kode-kegiatan.destroy', deleteTarget.id)`.
- Menghapus import/markup modal inline yang usang serta membersihkan import `Fragment` yang tidak terpakai di `KodeKegiatan/Index.tsx`.
- Memastikan saat membuka modal Tambah (`resetForm()` juga membersihkan error form bila ada dengan `clearErrors()`), dan saat menutup modal Import selalu memanggil `resetImport()` dan `clearImportErrors()`.

---

## 6. Verifikasi

- Jalankan `npm run build` (`tsc && vite build`) dan pastikan TypeScript strict check serta Vite production bundle selesai dengan 0 error.
- Verifikasi tidak ada token warna Tailwind tidak valid (`sky-200`, `sky-400`, `sky-500`, dll.) dan semua modal menjaga payload/route Laravel yang sama (`kode-kegiatan.store`, `kode-kegiatan.update`, `kode-kegiatan.destroy`, `kode-kegiatan.import`, `kode-kegiatan.download-template`).
