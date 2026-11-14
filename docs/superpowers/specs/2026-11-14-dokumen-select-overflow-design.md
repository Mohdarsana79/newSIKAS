# Desain Perbaikan Dropdown SearchableSelect Tertutup Card pada Dokumen BKU

**Tanggal:** 2026-11-14
**Status:** Disetujui untuk peninjauan spec
**Ruang Lingkup:**
- `resources/js/Pages/Penatausahaan/Dokumen/components/TabReguler.tsx`
- `resources/js/Pages/Penatausahaan/Dokumen/components/TabSilpa.tsx`
- `resources/js/Pages/Penatausahaan/Dokumen/components/TabKinerja.tsx`
- `resources/js/Pages/Penatausahaan/Dokumen/components/TabKinerjaSilpa.tsx`

---

## 1. Latar Belakang & Akar Masalah

Pada halaman **Dokumen BKU**, dropdown **Pilih Tahun Anggaran** menggunakan `@/Components/SearchableSelect` yang dirender di dalam `<Surface padding="sm">` pada bagian filter di masing-masing komponen tab (`TabReguler`, `TabSilpa`, `TabKinerja`, `TabKinerjaSilpa`).

Ada dua penyebab panel dropdown terpotong/tertutup:
1. `<Surface padding="sm">` memakai nilai default `overflowVisible = false` (`Surface.tsx`), sehingga kelas `overflow-hidden` diterapkan pada `<section className="sikas-card ...">` dan memotong panel dropdown (`absolute z-50`) tepat di batas bawah kartu filter.
2. Wrapper filter (`animate-rise`) berada sebelum wrapper `<DataTable>` (`animate-rise`) di urutan DOM tanpa `z-index` eksplisit, sehingga perlu ditingkatkan dengan `relative z-20` agar dropdown selalu melayang di depan kartu tabel di bawahnya.

---

## 2. Desain Perubahan

Pada keempat file tab (`TabReguler.tsx`, `TabSilpa.tsx`, `TabKinerja.tsx`, `TabKinerjaSilpa.tsx`):
1. Ubah wrapper blok filter:
   - Dari: `<div className="animate-rise" style={{ animationDelay: '60ms' }}>`
   - Menjadi: `<div className="relative z-20 animate-rise" style={{ animationDelay: '60ms' }}>`
2. Ubah prop `<Surface>` pada blok filter:
   - Dari: `<Surface padding="sm">`
   - Menjadi: `<Surface padding="sm" overflowVisible>`
3. Tidak mengubah `SearchableSelect.tsx`, `Surface.tsx`, maupun `Dokumen/Index.tsx` (seluruh perubahan mengikuti pola `Kwitansi/Tab*.tsx`).

---

## 3. Rencana Verifikasi

1. Pastikan keempat tab (`TabReguler`, `TabSilpa`, `TabKinerja`, `TabKinerjaSilpa`) sudah menggunakan `relative z-20 animate-rise` dan `<Surface padding="sm" overflowVisible>`.
2. Jalankan `npm run build` (`tsc && vite build`) dan pastikan lulus tanpa error (exit code `0`).
