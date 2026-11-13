# Desain Pemilih Tahun Anggaran Aktif Berbasis React Select (`ArkasTools`)

Tanggal: 2026-11-13  
Status: Draft untuk Review User  
Ruang Lingkup:
- [ArkasToolController.php](file:///c:/laragon/www/newSIKAS2/newSIKAS/app/Http/Controllers/ArkasToolController.php)
- Komponen Baru: `resources/js/Components/Arkas/ArkasYearSelect.tsx`
- [ArkasTools/Index.tsx](file:///c:/laragon/www/newSIKAS2/newSIKAS/resources/js/Pages/ArkasTools/Index.tsx)
- [ArkasSyncModal.tsx](file:///c:/laragon/www/newSIKAS2/newSIKAS/resources/js/Components/Arkas/ArkasSyncModal.tsx)

---

## 1. Latar Belakang & Tujuan

1. **Tahun Hardcoded vs Tahun Anggaran Aktif**:
   - Daftar tahun pada filter [ArkasTools/Index.tsx](file:///c:/laragon/www/newSIKAS2/newSIKAS/resources/js/Pages/ArkasTools/Index.tsx) dan antrean `SEQUENTIAL_ALL_YEARS` di [ArkasSyncModal.tsx](file:///c:/laragon/www/newSIKAS2/newSIKAS/resources/js/Components/Arkas/ArkasSyncModal.tsx) sebelumnya masih hardcoded (`2026`, `2025`, `2024`), dan [ArkasToolController.php](file:///c:/laragon/www/newSIKAS2/newSIKAS/app/Http/Controllers/ArkasToolController.php) masih menggunakan fallback statis `'2026'`.
   - Pengguna membutuhkan daftar tahun yang **bersumber langsung dari Tahun Anggaran aktif** pada tabel `Penganggaran` milik varian aktif, sehingga tahun aktif terbaru (mis. `2027`) otomatis muncul dan terpilih secara default.
2. **Searchable React Select**:
   - Mengganti elemen `<select>` HTML bawaan pada filter halaman utama dan 4 pill selector di `ArkasSyncModal` menjadi **`react-select` yang bisa diketik (`isSearchable`)** untuk memfilter opsi tahun anggaran aktif + `Semua Tahun`, menggunakan gaya Neo-Bento yang konsisten dengan [StsModals.tsx](file:///c:/laragon/www/newSIKAS2/newSIKAS/resources/js/Pages/Penatausahaan/Sts/Partials/StsModals.tsx).

---

## 2. Desain Backend (`ArkasToolController::index`)

- Mengambil varian aktif menggunakan `app()->bound('variant') ? app('variant') : 'reguler'`.
- Mengambil kelas model Penganggaran varian aktif via `VariantConfig::getModelClass('penganggaran', $variant)`.
- Mengambil daftar `tahun_anggaran` unik terurut descending (`orderBy('tahun_anggaran', 'desc')`) sebagai array string (`$activeYears`).
- Fallback aman: jika tabel penganggaran varian aktif kosong (misal pada environment baru/test kosong), `$activeYears` diisi `[(string) date('Y')]`.
- Menetapkan `$defaultYear`:
  - Jika `$request->filled('year')`, gunakan nilai dari query parameter.
  - Jika tidak ada, gunakan `$activeYears[0]`.
- Mengirim props tambahan `activeYears` bersama `initialData`, `defaultYear`, dan `localStats` ke `Inertia::render('ArkasTools/Index', ...)`.

---

## 3. Desain Frontend

### 3.1 Komponen Reusable `ArkasYearSelect.tsx`
- Menggunakan `Select` dari `react-select` dengan `unstyled` dan `isSearchable`.
- Props:
  - `value: string` (`'2027'`, `'2026'`, `'ALL'`, dll.)
  - `onChange: (value: string) => void`
  - `activeYears: string[]`
  - `includeAllOption?: boolean` (default `true` untuk menyertakan `{ value: 'ALL', label: 'Semua Tahun' }`)
  - `isDisabled?: boolean`
  - `inputId?: string`
  - `placeholder?: string`
  - `localStatsPerYear?: Record<string, number>` (opsional untuk hint jumlah item di menu modal atau tooltip)
- Opsi dibangun dari `activeYears` (`Tahun ${y}`) + `Semua Tahun` (`value: 'ALL'`).
- Tidak mengizinkan pembuatan tahun arbitrer (ketikan berfungsi memfilter opsi tahun anggaran aktif yang tersedia).
- Styling Neo-Bento konsisten dengan [StsModals.tsx](file:///c:/laragon/www/newSIKAS2/newSIKAS/resources/js/Pages/Penatausahaan/Sts/Partials/StsModals.tsx):
  - Kontrol `rounded-2xl`, focus ring `border-lime-400 ring-4 ring-lime-200/60 dark:border-lime-400/70 dark:ring-lime-400/10`.
  - Menghilangkan ring/border native `<input>` di dalam `react-select` (`[&_input]:!border-0 [&_input]:!outline-none [&_input]:!ring-0 [&_input]:!shadow-none`).
  - Menu `z-50 rounded-2xl border border-slate-200/90 bg-white p-1.5 shadow-float dark:border-white/10 dark:bg-[#1A1728]`.

### 3.2 Perubahan pada `ArkasTools/Index.tsx`
- Menerima props `activeYears?: string[]` (fallback ke `[defaultYear]` jika tidak tersedia).
- `<Surface padding="sm" className="overflow-visible relative z-20">` agar dropdown menu `ArkasYearSelect` tidak terpotong oleh `overflow-hidden` bawaan `Surface`.
- Mengganti `<select>` HTML bawaan di blok `Tahun Anggaran` dengan `<ArkasYearSelect ... />` (lebar responsif `w-full lg:w-56`).
- Mengirim `activeYears` ke `<ArkasSyncModal activeYears={resolvedActiveYears} ... />`.

### 3.3 Perubahan pada `ArkasSyncModal.tsx`
- Menerima prop `activeYears: string[]`.
- Mengubah wrapper luar modal dari `overflow-hidden` menjadi `overflow-visible rounded-[26px]` (serta `overflow-visible` di body fase `confirm`) dengan layer glow terisolasi tetap memakai `overflow-hidden rounded-[26px]` dan footer memakai `rounded-b-[26px]`, agar dropdown `react-select` tidak terpotong batas card modal.
- Mengganti 4 pill tombol statis (`2026 / 2025 / 2024 / Semua Tahun`) di fase `confirm` dengan `<ArkasYearSelect ... />`.
- Mengubah fungsi `getYearsQueue('ALL')` agar memproses daftar `activeYears` dari database secara berurutan (kronologis ascending, mis. `['2025', '2026', '2027']`) menggantikan konstanta hardcoded `['2024', '2025', '2026']`.

---

## 4. Verifikasi
- Jalankan `npm run build` (`tsc && vite build`) untuk memastikan tipe TypeScript dan bundle Vite bersih.
- Jalankan `composer test` (plus penambahan/verifikasi test fitur PHPUnit untuk `ArkasToolController::index`) karena ada perubahan pada controller PHP.
