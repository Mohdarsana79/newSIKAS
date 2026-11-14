# Rencana Implementasi: Perbaikan Popover DatePicker Kwitansi & Global

**Spec:** `docs/superpowers/specs/2026-11-14-kwitansi-datepicker-portal-design.md`  
**Target files:**
- Modify: `resources/js/Components/DatePicker.tsx`
- Modify: `resources/js/Components/ui/Surface.tsx`
- Modify: `resources/js/Pages/FiturPelengkap/Kwitansi/TabReguler.tsx`
- Modify: `resources/js/Pages/FiturPelengkap/Kwitansi/TabKinerja.tsx`
- Modify: `resources/js/Pages/FiturPelengkap/Kwitansi/TabSilpa.tsx`
- Modify: `resources/js/Pages/FiturPelengkap/Kwitansi/TabKinerjaSilpa.tsx`

---

## Task 1: Update `resources/js/Components/DatePicker.tsx`

1. Ubah `<PopoverPanel>` (`L59`) dari `className="absolute z-50 mt-1 w-auto rounded-2xl border border-white ..."` menjadi:
   ```tsx
   <PopoverPanel
       portal
       anchor={{ to: 'bottom start', gap: 6, padding: 12 }}
       className="z-[9999] w-auto rounded-2xl border border-slate-200/90 bg-white p-1.5 shadow-float dark:border-white/10 dark:bg-[#15131F]"
   >
   ```
   agar panel kalender ter-portal keluar dari container `overflow-hidden` / stacking context `animate-rise`, tetap kompatibel di dalam `<Modal>`, dan otomatis flip jika mendekati batas layar.

## Task 2: Update `resources/js/Components/ui/Surface.tsx`

1. Tambahkan prop opsional `overflowVisible?: boolean` (`default = false`) pada props `Surface`.
2. Ubah class container `<section>` agar memakai `overflowVisible ? 'overflow-visible' : 'overflow-hidden'`.

## Task 3: Update Kartu Filter di 4 Tab Kwitansi

1. Pada `TabReguler.tsx`, `TabKinerja.tsx`, `TabSilpa.tsx`, dan `TabKinerjaSilpa.tsx`:
   - Pada blok `{/* Filter */}`, ubah `<div className="animate-rise" style={{ animationDelay: '120ms' }}>` menjadi `<div className="relative z-20 animate-rise" style={{ animationDelay: '120ms' }}>`.
   - Ubah `<Surface padding="sm">` menjadi `<Surface padding="sm" overflowVisible>`.

## Task 4: Verifikasi & Commit

1. Jalankan `npm run build` (`tsc && vite build`) dan pastikan exit code 0 tanpa error.
2. Commit semua perubahan ke branch `main`.
