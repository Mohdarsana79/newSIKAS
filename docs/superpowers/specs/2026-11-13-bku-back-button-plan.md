# Rencana Implementasi Tombol Kembali ke Penatausahaan di BKU

**Tanggal:** 2026-11-13  
**Spec Referensi:** `docs/superpowers/specs/2026-11-13-bku-back-button-design.md`

---

## Langkah Implementasi

1. **Import `ArrowLeft` di `resources/js/Pages/Penatausahaan/Bku.tsx`**:
   - Tambahkan `ArrowLeft` pada import `lucide-react` di bagian atas file.
2. **Tambahkan Tombol Kembali pada `<PageHeader>`**:
   - Tambahkan prop `icon` pada `<PageHeader>` dengan `<Link href={vroute('penatausahaan.index')} title="Kembali ke Penatausahaan" aria-label="Kembali ke Penatausahaan" ...>` berisi `<ArrowLeft className="h-4 w-4" />`.
3. **Verifikasi & Commit**:
   - Jalankan `npm run build` (`tsc && vite build`) hingga sukses.
   - Commit perubahan `Bku.tsx`.

