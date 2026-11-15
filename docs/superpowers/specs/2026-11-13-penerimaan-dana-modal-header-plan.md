# Rencana Implementasi Perbaikan Spacing Header Modal Penerimaan Dana

**Tanggal:** 2026-11-13
**Spec:** `docs/superpowers/specs/2026-11-13-penerimaan-dana-modal-header-design.md`
**Target File:** `resources/js/Pages/Penatausahaan/Index.tsx`

## Langkah-langkah Implementasi

### Tahap 1: Perbarui Header Modal Penerimaan Dana
Pada `resources/js/Pages/Penatausahaan/Index.tsx` (baris 431–464):
1. Ubah class container header dari:
   `relative flex items-start justify-between gap-3 border-b border-slate-100 px-6 py-4.5 dark:border-white/5`
   menjadi:
   `relative flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5 dark:border-white/5`
2. Ubah wrapper grup ikon dan judul dari `flex items-center gap-3` menjadi `flex items-center gap-3.5`.
3. Ubah wrapper teks judul menjadi `min-w-0 flex-1` dan baris judul-badge menjadi `flex flex-wrap items-center gap-2.5`.
4. Ganti `<span className="rounded-md bg-brand-50 ...">Buku Kas Umum</span>` dengan `<StatusBadge tone="violet" dot={false}>Buku Kas Umum</StatusBadge>`.
5. Ubah margin atas subjudul `<p>` dari `mt-0.5` menjadi `mt-1`.

### Tahap 2: Verifikasi Build
1. Jalankan `npm run build` (`tsc && vite build`) dan pastikan kompilasi berhasil tanpa error.
2. Pastikan class `py-5` dan styling badge `bg-pastel-lavender` terkompilasi ke output build CSS.

