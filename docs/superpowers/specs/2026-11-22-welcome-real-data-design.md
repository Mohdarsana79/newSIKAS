# Spesifikasi Desain: Data Real Aplikasi pada Halaman Welcome

- **Tanggal:** 2026-11-22
- **Status:** Draft untuk Review Pengguna
- **Lingkup:**
  - Backend: `app/Services/WelcomeSummaryService.php` *(baru)*, [routes/web.php](file:///c:/laragon/www/newSIKAS2/newSIKAS/routes/web.php)
  - Frontend: `resources/js/Components/Landing/types.ts` *(baru)*, [Welcome.tsx](file:///c:/laragon/www/newSIKAS2/newSIKAS/resources/js/Pages/Welcome.tsx), [Hero.tsx](file:///c:/laragon/www/newSIKAS2/newSIKAS/resources/js/Components/Landing/Hero.tsx), [StatsSection.tsx](file:///c:/laragon/www/newSIKAS2/newSIKAS/resources/js/Components/Landing/StatsSection.tsx)
  - Pengujian: `tests/Feature/WelcomeRealDataTest.php` *(baru)*
  - Tanpa perubahan skema database maupun migrasi. Bagian fitur (`ModulesSection`), `WhySection`, `Navbar`, dan `Footer` tetap dipertahankan.

---

## 1. Tujuan & Prinsip Keamanan Publik

Mengganti seluruh angka dan grafik simulasi (dummy) pada halaman beranda (`/`) — khususnya kartu grafik kaca 4 varian pada **Hero** serta 4 kolom angka pada **StatsSection** — agar menampilkan **data real dari database aplikasi** untuk **Tahun Anggaran terbaru yang aktif**.

Prinsip wajib untuk route publik `/` (dapat diakses sebelum login):
1. **Whitelist ketat tanpa data sensitif:** hanya mengekspos ringkasan agregat keuangan (pagu, realisasi, sisa dana, persentase serapan, jumlah transaksi, tren bulanan) dan identitas publik sekolah (`nama_sekolah`, `npsn`, `jenjang_sekolah`, `kabupaten_kota`). **Tidak pernah** mengekspos NIP, email, nomor telepon, nama akun/pengguna, atau rincian transaksi per kuitansi.
2. **Fail-safe untuk database kosong/fresh install:** setiap query tabel dibungkus pengecekan `Schema::hasTable(...)` dan `try/catch (Throwable)` sehingga halaman `/` tetap merespons HTTP `200` dengan nilai nol yang jujur dan rapi (tanpa angka dummy palsu) saat aplikasi baru dipasang.
3. **Lintas database (PostgreSQL & SQLite `:memory:`):** filter tanggal memakai rentang sargable `>= YYYY-01-01` dan `< (YYYY+1)-01-01` serta pemetaan bulan di PHP (bukan fungsi tanggal khusus PostgreSQL seperti `EXTRACT(...)`).

---

## 2. Desain Backend (`App\Services\WelcomeSummaryService` & `routes/web.php`)

### 2.1 `WelcomeSummaryService::buildSummary(): array`
1. **Resolusi Tahun Aktif (`tahun`):**
   - Kumpulkan `MAX(tahun_anggaran)` dari keempat model penganggaran (`VariantConfig::VARIANTS`: `reguler`, `kinerja`, `silpa`, `kinerja_silpa`) bila tabelnya tersedia.
   - Ambil nilai maksimum lintas varian sebagai `$tahun`. Jika belum ada penganggaran sama sekali, fallback ke `(int) now()->year`.
2. **Identitas Publik Sekolah (`school`):**
   - Bila tabel `sekolahs` tersedia dan ada record `SekolahProfile`, kembalikan:
     ```php
     [
         'nama_sekolah' => trim((string) $sekolah->nama_sekolah),
         'npsn' => trim((string) $sekolah->npsn),
         'jenjang_sekolah' => trim((string) ($sekolah->jenjang_sekolah ?? '')),
         'kabupaten_kota' => trim((string) ($sekolah->kabupaten_kota ?? '')),
     ]
     ```
   - Jika belum ada, kembalikan `null`.
3. **Ringkasan per Varian (`variants`, 4 entri urut `VariantConfig::VARIANTS`):**
   - Untuk setiap `$variant`:
     - Ambil record penganggaran tahun `$tahun` (bila tabel ada).
     - Bila penganggaran ada, query transaksi `BukuKasUmum` milik penganggaran tersebut dengan `is_bunga_record = false` dan `tanggal_transaksi >= "{$tahun}-01-01"` serta `tanggal_transaksi < ($tahun + 1)."-01-01"`.
     - Hitung:
       - `pagu_anggaran` (`float`)
       - `total_realisasi` (`float`, penjumlahan `total_transaksi_kotor`)
       - `sisa_dana` (`float`, `max(0.0, $pagu - $totalRealisasi)`)
       - `persentase_serapan` (`float`, 1 desimal: `$pagu > 0 ? round(($totalRealisasi / $pagu) * 100, 1) : 0.0`)
       - `jumlah_transaksi` (`int`)
       - `status_persetujuan`: `'disetujui'` | `'draft'` | `'kosong'` (saat `$hasData === false`)
       - `monthly_realisasi`: array 12 angka (`float`, index 0 = Jan ... 11 = Des)
       - `monthly_cumulative`: array 12 angka kumulatif (`float`, index `i` = jumlah realisasi bulan `0..i`)
       - `last_active_month_index`: indeks bulan terakhir (`0..11`) yang memiliki realisasi `> 0`, atau `11` (`Des`) bila belum ada realisasi.
4. **Agregat 4 Metrik Statistik (`stats`):**
   - Dihitung lintas 4 varian pada tahun `$tahun`:
     - `tahun`: `int`
     - `has_data`: `bool` (minimal 1 varian memiliki penganggaran pada tahun `$tahun`)
     - `total_transaksi_bku`: `int` (total `jumlah_transaksi` lintas 4 varian)
     - `total_pagu`: `float` (total `pagu_anggaran` lintas 4 varian)
     - `total_realisasi`: `float` (total `total_realisasi` lintas 4 varian)
     - `persentase_serapan`: `float` (`$totalPagu > 0 ? round(($totalRealisasi / $totalPagu) * 100, 1) : 0.0`)

### 2.2 Integrasi di `routes/web.php`
Route `GET /` menyuntikkan `WelcomeSummaryService` dan meneruskan prop `'welcomeData' => $welcomeSummary->buildSummary()` ke `Inertia::render('Welcome', ...)`.

---

## 3. Desain Frontend

### 3.1 `resources/js/Components/Landing/types.ts` *(baru)*
- Mendefinisikan tipe strict:
  - `BudgetVariantKey = 'reguler' | 'kinerja' | 'silpa' | 'kinerja_silpa'`
  - `WelcomeSchoolIdentity`
  - `WelcomeVariantSummary`
  - `WelcomeStatsSummary`
  - `WelcomeSummaryData`
- Menyediakan helper murni:
  - `formatCompactRupiahParts(nominal: number)`: mengembalikan `{ value: number; decimals: number; prefix: string; suffix: string; formatted: string }` untuk tampilan angka kompak & animasi `animateNumber` (mis. `29_000_000` → `Rp 29,0 Jt`, `1_250_000_000` → `Rp 1,3 M`, `850_000` → `Rp 850 Rb`, `0` → `Rp 0`).
  - `buildCumulativeChartGeometry(cumulativeValues: readonly number[], pagu: number)`: mengubah 12 nilai kumulatif nyata menjadi 12 titik koordinat `(x: 18..402, y: 18..136)` dengan skala vertikal terhadap `max(pagu, maxCumulative, 1)` (bila seluruh nilai `0`, menghasilkan garis datar rapi di `y = 136`), serta menghasilkan `linePath` (kurva cubic Bezier mulus yang tidak melampaui batas `[16, 138]`) dan `areaPath` (tertutup ke baseline `y = 140`).

### 3.2 `resources/js/Pages/Welcome.tsx`
- Menerima `welcomeData` pada `PageProps` dan meneruskannya ke `<Hero welcomeData={welcomeData} ... />` dan `<StatsSection stats={welcomeData.stats} />`.

### 3.3 `resources/js/Components/Landing/Hero.tsx`
- Menghapus array dummy `BUDGET_DATASETS`.
- **Kolom Kiri:** bila `welcomeData.school?.nama_sekolah` tersedia, tampilkan identitas sekolah ringkas pada eyebrow atas (`{nama_sekolah} · TA {tahun}`), fallback ke `"Transparan Hari Ini. Akuntabel Setiap Saat."` bila profil sekolah belum diisi.
- **Kolom Kanan (Kartu Kaca Interaktif):**
  - Default `selectedVariantIndex`: indeks varian pertama yang `has_data === true` (fallback ke `0` / BOSP Reguler).
  - Default `activeMonthIndex`: mengikuti `dataset.last_active_month_index` (dan diperbarui saat pengguna mengganti varian di dropdown).
  - Nominal besar: menampilkan `dataset.pagu_anggaran` dalam format `Rp ...` (beranimasi halus dengan `animateNumber` saat berpindah varian).
  - Baris sub-indikator: bila `dataset.has_data`, tampilkan `{persentase_serapan}% terserap dari pagu · TA {tahun}`; bila belum ada data, tampilkan `Belum dianggarkan · TA {tahun}`.
  - Grafik SVG 12 bulan: merender `linePath`, `areaPath`, dan 12 titik interaktif dari `buildCumulativeChartGeometry(dataset.monthly_cumulative, dataset.pagu_anggaran)`. Hover/klik bulan menampilkan nominal kumulatif nyata (`Rp ...`).
  - 3 Mini-Card bawah:
    1. **Serapan Pagu**: `{persentase_serapan}%` (format koma Indonesia, mis. `50,0%`)
    2. **Transaksi BKU**: `{jumlah_transaksi}` (mis. `54` atau `0`, dengan label `Transaksi BKU`)
    3. **Status RKAS**: `Disahkan` (jika `disetujui`), `Berjalan` (jika `draft`), atau `Belum Ada` (jika `kosong`).

### 3.4 `resources/js/Components/Landing/StatsSection.tsx`
- Menghapus konstanta dummy `STATS` (`1.200+`, `4,9/5`, `Rp 750Jt+`, `100%`).
- Menerima prop `stats: WelcomeStatsSummary` dan menampilkan 4 metrik real tahun aktif (`TA {stats.tahun}`) dengan animasi `animateNumber`:
  1. **Transaksi BKU (TA {tahun})**: angka bulat `stats.total_transaksi_bku`
  2. **Serapan Anggaran**: `stats.persentase_serapan` (1 desimal + `%`)
  3. **Total Pagu (TA {tahun})**: `formatCompactRupiahParts(stats.total_pagu)`
  4. **Total Realisasi Belanja**: `formatCompactRupiahParts(stats.total_realisasi)`

---

## 4. Rencana Pengujian & Verifikasi

1. **PHPUnit Feature Tests (`tests/Feature/WelcomeRealDataTest.php`):**
   - Database kosong → `GET /` HTTP `200`, `welcomeData.stats.has_data === false`, seluruh nominal & transaksi `0`, `school === null`, tanpa error.
   - Multi-varian & multi-tahun + record bunga bank (`is_bunga_record = true`) → memilih tahun terbaru, mengecualikan bunga bank, memverifikasi `monthly_cumulative` 12 bulan per varian, agregat 4 metrik `stats` lintas varian, serta memastikan payload publik **tidak mengandung** NIP (`nip_kepala_sekolah` / `nip_bendahara`).
2. **Quality Gates:**
   - `php vendor/bin/pint`
   - `php artisan test --filter=WelcomeRealDataTest`
   - `npm run build` (`tsc && vite build`)
   - `/code-review` dua sumbu paralel (**Standards** & **Spec**).
