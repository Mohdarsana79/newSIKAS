# Rencana Implementasi Perbaikan Tinggi & Viewport Overflow Modal BKU

**Tanggal:** 2026-11-13
**Spec:** `docs/superpowers/specs/2026-11-13-bku-modal-viewport-height-design.md`

## Langkah-langkah Implementasi

### Tahap 1: Amankan Scroll Centering di `Modal.tsx`
Pada `resources/js/Components/Modal.tsx` (baris 54–93):
1. Ubah class `<Dialog>` dari `fixed inset-0 z-50 flex transform items-center justify-center overflow-y-auto px-4 py-6 transition-all sm:px-0` menjadi `fixed inset-0 z-50 overflow-y-auto transition-all`.
2. Ubah backdrop overlay menjadi `fixed inset-0 backdrop-blur-sm` agar latar menutupi penuh saat dialog di-scroll.
3. Bungkus `<TransitionChild>` milik `DialogPanel` dengan `<div className="flex min-h-full items-center justify-center p-4 sm:p-6">` dan beri `as="div" className="w-full"` pada `TransitionChild` agar prop `maxWidthClass` pada `DialogPanel` tetap bekerja penuh, serta hapus `mb-6` pada `DialogPanel`.

### Tahap 2: Batasi Tinggi Modal Tambah Pembelanjaan di `Bku.tsx`
Pada `resources/js/Pages/Penatausahaan/Bku.tsx` (sekitar baris 2828–2940):
1. Ubah wrapper modal Tambah Pembelanjaan menjadi `relative flex max-h-[88vh] flex-col overflow-visible rounded-[26px] bg-white dark:bg-[#15131F]`.
2. Tambahkan `shrink-0` dan padding `px-6 py-4` pada header modal.
3. Jadikan body modal sebagai flex column (`flex min-h-0 flex-1 flex-col px-6 py-4`), beri `shrink-0` dan `py-2.5` pada stepper pill-bar.
4. Ubah container isi step menjadi `sikas-scroll mt-3.5 min-h-0 flex-1 overflow-y-auto pb-2 pr-1` untuk seluruh step (termasuk Step 1 dengan susunan 1 kolom Alamat & NPWP tetap utuh).
5. Tambahkan `shrink-0` dan padding ringkas (`mt-4 pt-3.5`) pada footer aksi.

### Tahap 3: Verifikasi Build & Commit
1. Jalankan `npm run build` (`tsc && vite build`) untuk memastikan TypeScript dan Vite CSS bundle lulus tanpa error.
2. Commit perubahan ke Git.
