# Desain Penyeragaman Modal Neo-Bento pada Halaman Laporan (SPMTH, SPTJ, SP2B, LPH)

Tanggal: 2026-11-14  
Ruang lingkup:
- `resources/js/Pages/FiturPelengkap/Laporan/components/LaporanModalPrimitives.tsx` (baru)
- `resources/js/Pages/FiturPelengkap/Laporan/components/SpmthTab.tsx`
- `resources/js/Pages/FiturPelengkap/Laporan/components/SptjTab.tsx`
- `resources/js/Pages/FiturPelengkap/Laporan/components/Sp2bTab.tsx`
- `resources/js/Pages/FiturPelengkap/Laporan/components/LphTab.tsx`

## Latar Belakang & Akar Masalah

1. **Select `Tahun Anggaran` kontras putih di dark mode**: keempat tab memakai `<Select>` dengan inline `styles` statis berwarna terang (`#1e293b` / `#111827` & latar putih default), tampak putih mencolok di modal dark mode.
2. **Input tanggal setengah lebar**: `react-datepicker` memakai wrapper `inline-block` default tanpa `w-full` serta popup kalender terang non-Neo-Bento.
3. **Select native OS**: field `Tahap`, `Jenis Periode`, `Bulan`, `Semester`, `Ukuran Kertas`, dan `Ukuran Font` memakai `<select>` native browser.
4. **Ketidakseragaman & duplikasi modal**: `Sp2bTab` & `LphTab` belum memiliki tombol tutup `X` di header form; `SptjTab` & `Sp2bTab` menampilkan angka kalkulasi read-only sebagai `<input readOnly>`, `SpmthTab` memakai teks polos; modal Hapus, Preview PDF, Pengaturan Cetak, dan Validasi terduplikasi 4× dengan gaya yang berbeda.

## Keputusan Desain

1. **Primitif Modal Bersama (`LaporanModalPrimitives.tsx`)**
   - `LaporanSelect`: `react-select` `unstyled` bertema Neo-Bento (`rounded-xl`, `min-h-[41px]`, fokus `lime-400`, menu `rounded-2xl shadow-float dark:bg-[#1A1728]`), menggantikan inline style putih `Tahun Anggaran` dan seluruh `<select>` native.
   - `LaporanFormModal`: kerangka modal `rounded-[26px]` seragam dengan glow terisolasi (`pointer-events-none absolute inset-0 overflow-hidden rounded-[26px]`) agar dropdown bebas klip, header seragam (`IconTile` + judul + subjudul + tombol `X`), body `sikas-scroll`, serta footer sticky.
   - `LaporanSectionCard`, `LaporanMetricCard`, & `LaporanCalculateButton`: membungkus seksi form dan menampilkan angka read-only sebagai Neo-Bento KPI Metric Cards beraksen warna lembut (`neutral`, `violet`, `mint`, `sky`, `amber`, `rose`) lengkap dengan tipografi `text-sikas-num`.
   - `LaporanDeleteModal`, `LaporanPrintSettingsModal` (`overflow-visible`), `LaporanValidationModal`, & `LaporanPdfPreviewModal`: menyeragamkan 4 modal sekunder di seluruh ke-4 tab tanpa mengubah endpoint API, format parameter cetak, maupun state bisnis masing-masing tab.
2. **DatePicker Neo-Bento (`@/Components/DatePicker`)**
   - Mengganti `react-datepicker` di keempat tab dengan komponen `@/Components/DatePicker` agar lebar otomatis penuh (`w-full`), tinggi/sudut selaras (`rounded-xl`), dan popup kalender mendukung light & dark mode.
