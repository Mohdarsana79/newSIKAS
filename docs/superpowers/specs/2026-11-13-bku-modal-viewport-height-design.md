# Desain Perbaikan Tinggi & Viewport Overflow Modal BKU

**Tanggal:** 2026-11-13
**Target File:**
- `resources/js/Components/Modal.tsx`
- `resources/js/Pages/Penatausahaan/Bku.tsx`

## 1. Latar Belakang & Akar Masalah
Modal **Isi / UPDATE Detail Pembelanjaan** di `resources/js/Pages/Penatausahaan/Bku.tsx` terlihat terlalu tinggi hingga bagian atas dan bawahnya tertutup batas browser pada layar laptop karena dua faktor:
1. Pada komponen global `resources/js/Components/Modal.tsx`, `<Dialog>` menggabungkan `flex items-center overflow-y-auto`. Saat tinggi konten mendekati atau melampaui tinggi viewport, flexbox `items-center` mendorong bagian atas dialog melewati batas `y = 0` sehingga terpotong dan tidak dapat di-scroll ke atas.
2. Pada `Bku.tsx`, modal Tambah Pembelanjaan belum membatasi tinggi total modal (`max-h-[88vh] flex flex-col`) pada Step 1 (`currentStep === 1`), sehingga keseluruhan form Step 1–3 perlu konsisten memakai batas tinggi dengan area konten yang dapat di-scroll tanpa menghilangkan header, stepper, maupun footer.

## 2. Solusi Desain

### 2.1 Amankan Scroll & Centering di `Modal.tsx`
- `<Dialog>` menggunakan `fixed inset-0 z-50 overflow-y-auto transition-all` (tanpa `flex items-center`).
- Backdrop memakai `fixed inset-0 backdrop-blur-sm` agar latar tetap menutupi seluruh viewport saat isi dialog di-scroll.
- Menambahkan container centering di dalam `<Dialog>`: `<div className="flex min-h-full items-center justify-center p-4 sm:p-6">`. Dengan `min-h-full`, modal pendek tetap berada di tengah secara vertikal & horizontal, sementara modal yang lebih tinggi dari layar memulai scroll dari tepi atas tanpa terpotong.
- Membungkus `DialogPanel` dengan `<TransitionChild as="div" className="w-full">` (dan menghapus `mb-6` pada `DialogPanel` yang sebelumnya menggeser modal ke atas).

### 2.2 Batasi Tinggi Modal Tambah Pembelanjaan di `Bku.tsx`
- Wrapper modal memakai `relative flex max-h-[88vh] flex-col overflow-visible rounded-[26px] bg-white dark:bg-[#15131F]`.
- **Header Modal (`shrink-0`, `px-6 py-4`)** dan **Stepper Pill-Bar (`shrink-0`, `px-4 py-2.5`)** tetap terpasang di bagian atas modal.
- **Body Wrapper**: `flex min-h-0 flex-1 flex-col px-6 py-4`.
- **Area Konten Step (`renderStep1` / `renderStep2` / `renderStep3`)**: `sikas-scroll mt-3.5 min-h-0 flex-1 overflow-y-auto pb-2 pr-1`. Susunan 1 kolom Alamat & NPWP di Step 1 tetap dipertahankan sesuai pilihan pengguna, dan konten tetap dapat di-scroll mulus saat tinggi layar terbatas.
- **Footer Aksi (`shrink-0`, `mt-4 border-t border-slate-100 pt-3.5 dark:border-white/5`)**: tombol `Batal`/`Kembali` dan `Lanjut`/`Simpan` selalu tampak di bagian bawah modal.

## 3. Verifikasi
- Menjalankan `npm run build` (`tsc && vite build`) untuk memastikan kompilasi TypeScript dan CSS Vite lolos tanpa error.
- Memastikan seluruh modal di aplikasi tetap berfungsi dengan `maxWidth` (`sm`–`7xl`), `panelClassName`, dan `overlayClassName` yang ada.

