# Rencana Implementasi Neo-Bento `BkuAuditModal`

**Tanggal:** 2026-11-13  
**Spec Referensi:** `docs/superpowers/specs/2026-11-13-bku-audit-modal-design.md`

---

## Langkah Implementasi

### Task 1: Perbarui `resources/js/Components/Ai/BkuAuditModal.tsx`
- Pertahankan seluruh state, `useEffect`, endpoint API (`api.bku-audit.status`, `api.bku-audit.run`, `bku-audit.pdf`), dan interface `Props` agar kompatibel penuh dengan pemanggil (`Rekapitulasi.tsx`).
- Hapus early `if (!isOpen) return null;` dan gunakan `<Modal show={isOpen} onClose={onClose} maxWidth="4xl">` agar animasi dan tombol `Escape` berjalan standar.
- Terapkan shell Neo-Bento: `max-h-[88vh] flex-col overflow-hidden rounded-[26px] bg-white dark:bg-[#15131F]` + glow terisolasi + `sikas-scroll` pada area body.
- Perbaiki header dengan `IconTile` `violet`, judul **"Pra-Audit Forensik AI"**, `StatusBadge` `DEEPSEEK-R1`, subjudul `tabTitle`, serta tombol `X`.
- Perbaiki Bar Cakupan Audit dengan segmented pill switcher dan dropdown bulan tanpa kelas `dark:bg-gray-850`.
- Implementasikan Bento Grid 2-bagian hasil audit:
  - Kartu Skor Kepatuhan (kiri, `lg:col-span-4`): SVG radial progress gauge adaptif (`>=85`, `>=60`, `<60`), `StatusBadge` predikat, dan chip `dangerCount` / `warningCount`.
  - Kartu Ringkasan Eksekutif (kanan, `lg:col-span-8`): teks kontras penuh di mode terang/gelap (`text-slate-700 dark:text-slate-200`) + pill ringkas `rules_checked`.
- Perbaiki filter kategori & accordion temuan tanpa kelas invalid (`sky-100..800`, `dark:hover:bg-gray-750`).
- Perbarui footer aksi dengan `<SecondaryButton>` dan tombol Unduh PDF bergaya Neo-Bento.

### Task 2: Verifikasi & Commit
- Jalankan `npm run build` (`tsc && vite build`) hingga sukses.
- Commit perubahan `BkuAuditModal.tsx` ke branch `main`.
