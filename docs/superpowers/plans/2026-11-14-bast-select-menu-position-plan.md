# Rencana Implementasi: Perbaikan Posisi Dropdown Select Modal BAST

**Spec:** `docs/superpowers/specs/2026-11-14-bast-select-menu-position-design.md`  
**Target:** `resources/js/Pages/FiturPelengkap/Bast/ModalFormBast.tsx`

---

## Task 1: Perbaiki posisi `Select` pada `ModalFormBast.tsx`

1. Hapus `menuPosition="fixed"` dan ubah `menuPlacement="auto"` menjadi `menuPlacement="bottom"` pada `<Select>` `bast-tahun` dan `bast-tahap` (`L272–300`).
2. Pastikan `ModalPrintSettings.tsx` tidak memakai `menuPosition="fixed"`.

## Task 2: Verifikasi & Commit

1. Commit dokumen spec & plan.
2. Jalankan `npm run build` (`tsc && vite build`) dan commit perubahan `ModalFormBast.tsx`.
