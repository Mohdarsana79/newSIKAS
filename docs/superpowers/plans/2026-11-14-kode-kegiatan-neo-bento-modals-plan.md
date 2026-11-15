# Rencana Implementasi: Neo-Bento Modals untuk Kode Kegiatan

**Spec:** `docs/superpowers/specs/2026-11-14-kode-kegiatan-neo-bento-modals-design.md`  
**Target files:**
- Create: `resources/js/Pages/DataMaster/KodeKegiatan/Partials/KodeKegiatanModals.tsx`
- Modify: `resources/js/Pages/DataMaster/KodeKegiatan/Index.tsx`

---

## Task 1: Buat `resources/js/Pages/DataMaster/KodeKegiatan/Partials/KodeKegiatanModals.tsx`

1. Definisikan tipe exported:
   - `KodeKegiatanItem` (`id`, `kode`, `program`, `sub_program`, `uraian`)
   - `KodeKegiatanFormData` (`kode`, `program`, `sub_program`, `uraian`)
   - `KodeKegiatanModalsProps` untuk mengorkestrasi:
     - Form Tambah (`isAddOpen`, `onCloseAdd`, `onSubmitAdd`) & Form Edit (`isEditOpen`, `onCloseEdit`, `onSubmitEdit`) beserta state bersama (`data`, `setData`, `errors`, `processing`)
     - Modal Import (`isImportOpen`, `onCloseImport`, `importFile`, `onChangeImportFile`, `importProgress`, `importErrors`, `importProcessing`, `onSubmitImport`, `downloadTemplateUrl`)
     - Modal Hapus (`isDeleteOpen`, `deleteTarget`, `deleteProcessing`, `onCloseDelete`, `onConfirmDelete`)
2. Buat helper internal bersih tanpa duplikasi:
   - `GLOW_TONES` (`lime`, `amber`, `sky`, `rose`) memakai token Tailwind valid (`lime-300`, `pastel-mint`, `pastel-amber`, `pastel-lavender`, `pastel-sky`, `pastel-rose`, `mint`, `sky`, `amber-500`, `rose-500`).
   - `NeoModalShell`: container `rounded-[26px]` + isolated glow layer `pointer-events-none absolute inset-0 overflow-hidden rounded-[26px]`.
   - `KodeKegiatanModalHeader`: header `rounded-t-[26px]` dengan `IconTile` `md`, `h2`, `StatusBadge`, subjudul `text-[11px]`, tombol `X`.
   - `formatBytes(bytes: number)` untuk ukuran berkas Excel.
3. Implementasikan subkomponen modal:
   - `KodeKegiatanFormModal` bermode `'add' | 'edit'` dengan 2 kartu Bento `rounded-[20px]` (*Identitas Kode Kegiatan* & *Uraian Kegiatan* dengan `textarea` `rounded-2xl`) dan footer `rounded-b-[26px]`. ID input diberi prefix mode (`${mode}-kode`, dst.) agar unik di DOM.
   - `KodeKegiatanImportModal` dengan kartu panduan **Panduan Import** (`bg-pastel-sky/70 border-sky/20`), tombol **Download Template Excel**, area dropzone `.xlsx`/`.xls` interaktif (`useRef<HTMLInputElement>` + label drag/click) yang menampilkan kartu preview file terpilih (nama file, ukuran, format ekstensi, tombol ganti/hapus), progress bar `importProgress`, dan tombol `Batal` yang memanggil `onCloseImport`.
   - `KodeKegiatanDeleteModal` (`maxWidth="sm"`) dengan kartu peringatan `bg-pastel-rose/70 border-rose-200/80 rounded-[20px]` yang menampilkan chip monospace `deleteTarget.kode` serta `deleteTarget.uraian` (disertai fallback aman).

## Task 2: Refactor `resources/js/Pages/DataMaster/KodeKegiatan/Index.tsx`

1. Import `KodeKegiatanModals` dari `./Partials/KodeKegiatanModals` dan hapus import `Modal`, `InputLabel`, `TextInput`, `InputError`, `DangerButton`, `Fragment`, `Link` (hanya pertahankan yang dipakai di halaman utama).
2. Ambil `clearErrors` dari `useForm` form utama, panggil `clearErrors()` di `resetForm()`.
3. Ubah `deleteId: number | null` menjadi `deleteTarget: KodeKegiatan | null`:
   - `handleDelete = (item: KodeKegiatan) => { setDeleteTarget(item); setIsDeleteModalOpen(true); }`
   - Perbarui pemanggilan di kolom aksi tabel (`onClick={() => handleDelete(item)}`)
   - `confirmDelete` menggunakan `deleteTarget.id` dan mereset `setDeleteTarget(null)` di `onSuccess`.
4. Ganti blok JSX modal inline (`L358–745`) dengan `<KodeKegiatanModals ... />`, pastikan `onCloseImport` menjalankan `setIsImportModalOpen(false)`, `resetImport()`, dan `clearImportErrors()`.

## Task 3: Verifikasi & Commit

1. Jalankan `npm run build` (`tsc && vite build`) dan pastikan exit code 0 tanpa warning/error TypeScript.
2. Commit implementasi ke branch `main`.

