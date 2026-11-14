# Plan Implementasi: Tombol Kembali SK & Surat

**Spec:** `docs/superpowers/specs/2026-11-14-sk-surat-back-button-design.md`  
**Tanggal:** 2026-11-14

## Langkah Implementasi

### Task 1 — Tambah tombol "Kembali" di `resources/js/Pages/SkSurat/Show.tsx`
- File: `resources/js/Pages/SkSurat/Show.tsx`
- Gunakan `Link` (`@inertiajs/react`) dan `ArrowLeft` (`lucide-react`) yang sudah diimpor.
- Tambahkan `<Link href={route('sk-surat.index')} ...>` di posisi pertama pada slot `actions` milik `PageHeader` (di luar guard `{!isKepalaSekolah && ...}` agar tampil untuk Bendahara maupun Kepala Sekolah).

### Task 2 — Tambah tombol `X` & "Kembali ke Folder" di `resources/js/Pages/SkSurat/Partials/ManageTemplatesModal.tsx`
- File: `resources/js/Pages/SkSurat/Partials/ManageTemplatesModal.tsx`
- Impor `ArrowLeft` dan `X` dari `lucide-react`.
- Pada header modal: tambahkan tombol ikon tutup `X` di pojok kanan atas (`type="button"`, `onClick={onClose}`, `aria-label="Tutup modal"`, `title="Kembali ke Folder"`).
- Pada footer modal: ubah `SecondaryButton` menjadi `type="button"`, `onClick={onClose}`, `disabled={loading}` dengan isi `<ArrowLeft className="h-4 w-4" /> Kembali ke Folder`.

### Task 3 — Verifikasi & Commit
- Jalankan `npm run build` (`tsc && vite build`).
- Jalankan `php artisan test --filter=SkSuratTest`.
- Commit perubahan `Show.tsx` dan `ManageTemplatesModal.tsx`.
