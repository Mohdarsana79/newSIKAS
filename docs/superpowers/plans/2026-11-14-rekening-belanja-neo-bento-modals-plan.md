# Rencana Implementasi: Neo-Bento Modals untuk Rekening Belanja

**Spec:** `docs/superpowers/specs/2026-11-14-rekening-belanja-neo-bento-modals-design.md`  
**Target files:**
- Create: `resources/js/Pages/DataMaster/RekeningBelanja/Partials/RekeningBelanjaModals.tsx`
- Modify: `resources/js/Pages/DataMaster/RekeningBelanja/Index.tsx`

---

## Task 1: Buat `resources/js/Pages/DataMaster/RekeningBelanja/Partials/RekeningBelanjaModals.tsx`

1. Definisikan dan export tipe:
   - `RekeningBelanjaItem` (`id`, `kode_rekening`, `rincian_objek`, `kategori`, `is_ppn`, `is_pph21`, `is_pph22`, `is_pph23`, `is_pph4`)
   - `RekeningBelanjaFormData` (`kode_rekening`, `rincian_objek`, `kategori`, `is_ppn`, `is_pph21`, `is_pph22`, `is_pph23`, `is_pph4`)
   - `RekeningBelanjaModalsProps`
2. Buat helper internal bersih:
   - `GLOW_TONES` (`lime`, `amber`, `sky`, `rose`), `NeoModalShell` (`rounded-[26px]`, glow terisolasi), `RekeningBelanjaModalHeader`.
   - `KATEGORI_OPTIONS` + fallback opsi dinamis bila `data.kategori` berisi nilai kustom dari DB; `buildKategoriSelectClassNames(hasError)`.
   - `TAX_FIELDS` data-driven array untuk `PPN`, `PPh 21`, `PPh 22`, `PPh 23`, `PPh 4(2)`.
   - `formatBytes(bytes)`.
3. Implementasikan subkomponen modal:
   - `RekeningBelanjaFormModal` (`mode: 'add' | 'edit'`):
     - Kartu Bento 1: `kode_rekening` (`font-mono`), `rincian_objek`, dan `react-select` Neo-Bento untuk `kategori` (disertai guard client-side bila `kategori` masih kosong saat submit sehingga error langsung terlihat rapi).
     - Kartu Bento 2: Grid 5 kartu toggle interaktif untuk `Pengaturan Pajak`.
     - Footer `rounded-b-[26px]` dengan `SecondaryButton` + `PrimaryButton`.
   - `RekeningBelanjaImportModal`: kartu panduan **Petunjuk Import** (`bg-pastel-sky/75 border-sky/20`), tombol **Download Template Excel**, dropzone drag/click `.xlsx`/`.xls`, kartu preview file terpilih (nama, ekstensi, ukuran, tombol *Ganti* & *Hapus*), progress bar `from-sky to-mint`, dan footer `rounded-b-[26px]`.
   - `RekeningBelanjaDeleteModal` (`maxWidth="sm"`): kartu peringatan `pastel-rose` menampilkan chip monospace `kode_rekening`, `rincian_objek`, dan badge `kategori`, serta footer dengan `SecondaryButton` dan `DangerButton`.

## Task 2: Refactor `resources/js/Pages/DataMaster/RekeningBelanja/Index.tsx`

1. Import `RekeningBelanjaModals` & `RekeningBelanjaItem` dari `./Partials/RekeningBelanjaModals`; hapus import usang (`router`, `Link`, `Modal`, `InputLabel`, `InputError`); pertahankan `TextInput` dan `Fragment`.
2. Ganti `deleteId` menjadi `deleteTarget: RekeningBelanjaItem | null`, ambil `clearErrors` dari `useForm`, tambahkan `resetForm`, `closeAddModal`, `closeEditModal`, `closeImportModal`, `closeDeleteModal`, dan `submitImport`.
3. Perbarui tombol Tambah di `PageHeader` agar memanggil `resetForm()` sebelum `setIsAddModalOpen(true)`, dan tombol Hapus baris tabel memanggil `handleDelete(item)`.
4. Ganti blok modal inline (`L379–797`) dengan `<RekeningBelanjaModals ... />`.

## Task 3: Verifikasi & Commit

1. Jalankan `npm run build` (`tsc && vite build`) dan pastikan exit code 0 tanpa error.
2. Commit implementasi ke branch `main`.
