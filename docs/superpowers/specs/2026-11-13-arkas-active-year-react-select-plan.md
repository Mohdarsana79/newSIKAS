# Rencana Implementasi: Tahun Anggaran Aktif + React Select (`ArkasTools`)

Acuan Desain: [2026-11-13-arkas-active-year-react-select-design.md](file:///c:/laragon/www/newSIKAS2/newSIKAS/docs/superpowers/specs/2026-11-13-arkas-active-year-react-select-design.md)

## Tugas 1 — Backend: `activeYears` & `defaultYear` dari Penganggaran Varian Aktif
- **File**: `app/Http/Controllers/ArkasToolController.php`
- **Langkah**:
  1. Import `App\Config\VariantConfig`.
  2. Di method `index(Request $request)`:
     - Resolve varian aktif: `$variant = app()->bound('variant') ? app('variant') : 'reguler';`
     - Resolve kelas model Penganggaran: `$penganggaranClass = VariantConfig::getModelClass('penganggaran', $variant);`
     - Query daftar tahun anggaran unik descending:
       `$activeYears = $penganggaranClass::query()->select('tahun_anggaran')->distinct()->orderBy('tahun_anggaran', 'desc')->pluck('tahun_anggaran')->map(fn ($y) => (string) $y)->values()->toArray();`
     - Jika kosong, fallback `[(string) date('Y')]`.
     - Ambil `$year = $request->filled('year') ? (string) $request->input('year') : $activeYears[0];`.
  3. Tambahkan `'activeYears' => $activeYears` ke `Inertia::render('ArkasTools/Index', [...])`.

## Tugas 2 — Frontend: Komponen Bersama `ArkasYearSelect`
- **File Baru**: `resources/js/Components/Arkas/ArkasYearSelect.tsx`
- **Langkah**:
  1. Implementasikan komponen berbasis `Select` dari `react-select` dengan `unstyled` dan `isSearchable`.
  2. Bangun daftar opsi: `activeYears.map(y => ({ value: y, label: `Tahun ${y}`, count: localStatsPerYear?.[y] }))`, ditambah `{ value: 'ALL', label: 'Semua Tahun' }` bila `includeAllOption !== false`.
  3. Terapkan `classNames` Neo-Bento yang konsisten dengan `StsModals.tsx` (`rounded-2xl`, focus ring lime, fix `[&_input]:!ring-0`, menu dark `#1A1728`, `formatOptionLabel` opsional untuk menampilkan badge jumlah item per tahun saat `localStatsPerYear` diberikan).

## Tugas 3 — Integrasi di `ArkasTools/Index.tsx` & `ArkasSyncModal.tsx`
- **`resources/js/Pages/ArkasTools/Index.tsx`**:
  1. Terima props `activeYears?: string[]` dan hitung `resolvedActiveYears` dengan fallback `[defaultYear]`.
  2. Ubah `<Surface padding="sm">` pada blok form pencarian menjadi `<Surface padding="sm" className="overflow-visible relative z-20">`.
  3. Ganti `<select>` HTML bawaan pada `Tahun Anggaran` dengan `<ArkasYearSelect ... />`.
  4. Kirim `activeYears={resolvedActiveYears}` ke `<ArkasSyncModal />` dan gunakan `resolvedActiveYears[0]` untuk fallback `tahun` di `<ArkasDiagnosticModal />`.
- **`resources/js/Components/Arkas/ArkasSyncModal.tsx`**:
  1. Tambah prop `activeYears: string[]`.
  2. Ubah wrapper modal utama menjadi `relative overflow-visible rounded-[26px] bg-white dark:bg-[#15131F]` (layer glow tetap `overflow-hidden rounded-[26px]`, footer `rounded-b-[26px]`).
  3. Ganti grid 4 pill tombol pada fase `confirm` dengan `<ArkasYearSelect ... localStatsPerYear={localStats?.perYear} />`.
  4. Ubah `getYearsQueue('ALL')` agar mengurutkan `activeYears` secara kronologis (ascending) untuk sinkronisasi bertahap.

## Tugas 4 — Test & Verifikasi
1. Perbarui `tests/Unit/ArkasToolTest.php` untuk menguji `activeYears` & `defaultYear` berbasis Penganggaran varian aktif.
2. Jalankan `vendor/bin/pint` pada file PHP yang diubah, `composer test`, dan `npm run build` (`tsc && vite build`).
3. Commit perubahan dengan pesan commit yang bersih.

