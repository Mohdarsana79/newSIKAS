# Rencana Implementasi Revamp Modal Tambah Pembelanjaan BKU (Neo-Bento)

**Tanggal:** 2026-11-13
**Spec:** `docs/superpowers/specs/2026-11-13-bku-tambah-pembelanjaan-modal-design.md`
**Target File:** `resources/js/Pages/Penatausahaan/Bku.tsx`

## Langkah-langkah Implementasi

### Tahap 1: Perbarui Shell Modal, Header Neo-Bento, dan Stepper Pill-Bar
Pada `resources/js/Pages/Penatausahaan/Bku.tsx` (sekitar baris 2844–2928):
1. Ubah wrapper modal menjadi `relative overflow-visible rounded-[26px] bg-white dark:bg-[#15131F]` dengan glow blob `bg-brand-500/10` terisolasi dalam `pointer-events-none absolute inset-0 overflow-hidden rounded-[26px]`.
2. Ganti header gelap lama menjadi header Neo-Bento terang (`px-6 py-5`, `IconTile tone="violet" size="lg"`, judul `Isi Detail Pembelanjaan` / `UPDATE Detail Pembelanjaan`, `<StatusBadge tone="violet" dot={false}>Step {currentStep} / 3</StatusBadge>`, subjudul, dan tombol tutup `X` yang memanggil `closeModal`).
3. Perbarui stepper 3 langkah (`1 Detail Transaksi`, `2 Detail Barang/Jasa`, `3 Perhitungan Pajak`) menjadi pill-bar Neo-Bento (`rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3`), dengan token valid untuk state selesai (`bg-pastel-mint text-mint` & `text-emerald-700`), aktif (`bg-lime-400 text-slate-950 shadow-lime` & `text-slate-900`), dan belum aktif (`text-slate-400`).
4. Gunakan `overflow-visible` pada Step 1 agar popover `DatePicker` dan dropdown autocomplete Toko/Penerima tidak terpotong, serta `max-h-[62vh] overflow-y-auto pr-1` pada Step 2 dan Step 3.

### Tahap 2: Rapikan Styling Neo-Bento di `renderStep1`, `renderStep2`, dan `renderStep3`
1. **Step 1 (`renderStep1`)**: Kemas ke dalam 2 kartu bento lembut (`rounded-2xl border border-slate-100 bg-slate-50/60 p-4`), hapus class `block` dari `DatePicker`, hapus `ms-2 me-2`, seragamkan `select`, `TextInput`, spinner (`text-brand-500`), dan dropdown hasil pencarian.
2. **Step 2 (`renderStep2`)**: Kemas baris Nomor Nota & Tanggal Belanja dalam panel bento (hapus `block` pada `DatePicker`), ubah header `Kegiatan 1` dari `bg-cyan-400` ke header pastel lavender (`bg-pastel-lavender/65 border-b border-brand-500/10`), seragamkan tombol Asisten AI, `textarea`, dan kartu item RKAS.
3. **Step 3 (`renderStep3`)**: Ubah kartu ringkasan kegiatan dari `bg-cyan-100` dan `border-l-4` ke kartu bento berheader pastel lavender, kemas panel Pajak & Pajak Daerah dalam `rounded-2xl`, serta ganti `text-sky-700` yang tidak valid dengan `text-blue-700 dark:text-blue-300`.

### Tahap 3: Verifikasi Build & Commit
1. Jalankan `npm run build` (`tsc && vite build`) untuk memastikan kompilasi TypeScript dan CSS Vite bebas error.
2. Commit perubahan ke Git.

