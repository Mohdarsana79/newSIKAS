# Rencana Implementasi Neo-Bento Modal STS

**Tanggal:** 2026-11-13  
**Spec Referensi:** `docs/superpowers/specs/2026-11-13-sts-modals-design.md`

---

## Langkah Implementasi

### Task 1: Buat Komponen `StsModals.tsx`
- **File:** `resources/js/Pages/Penatausahaan/Sts/Partials/StsModals.tsx`
- **Detail:**
  - Definisikan komponen shell/header modal bersama `StsModalHeader` dan wrapper panel `relative overflow-visible rounded-[26px] bg-white dark:bg-[#15131F]` dengan dekorasi glow terisolasi di dalam `overflow-hidden rounded-[26px]`.
  - Ganti `YearBudgetPicker` dengan `<Select unstyled isSearchable isClearable />` (`react-select`) menggunakan `classNames` Tailwind Neo-Bento yang adaptif penuh untuk Light Mode & Dark Mode (tanpa inline style putih).
  - Implementasikan keempat modal:
    1. **Create Modal** (`IconTile` `violet`, `StatusBadge` `"STS Baru"`, `YearBudgetPicker`, input `Nomor STS`, input `Jumlah STS`).
    2. **Edit Modal** (`IconTile` `amber`, `StatusBadge` nomor STS, input `Nomor STS`, input `Jumlah STS`).
    3. **Payment Modal** (`IconTile` `mint`, `StatusBadge` nomor STS, Bento Summary Strip 3 kartu: Total STS, Sisa Tagihan, dan Estimasi Sisa live, `DatePicker`, input `Jumlah Bayar`, tanpa kelas invalid `sky-*`).
    4. **Delete Modal** (`IconTile` `rose`, banner konfirmasi `bg-pastel-rose/65` dengan nomor STS yang dihapus, `DangerButton`).

### Task 2: Integrasikan ke `Penatausahaan/Sts/Index.tsx`
- Import `StsModals` dari `./Partials/StsModals`.
- Bersihkan import yang hanya dipakai di modal (`Modal`, `InputLabel`, `TextInput`, `SecondaryButton`, `DangerButton`, `InputError`, `DatePicker`, `format`, `Transition`, `Select`), pertahankan `PrimaryButton` dan `IconTile`.
- Ganti blok JSX keempat modal (L406–L707) dengan `<StsModals ... />` sambil meneruskan `stsToDelete` yang dicari dari `stsList`.

### Task 3: Verifikasi & Commit
- Jalankan `npm run build` (`tsc && vite build`) hingga exit code 0.
- Commit `StsModals.tsx` dan `Sts/Index.tsx` ke `main`.

