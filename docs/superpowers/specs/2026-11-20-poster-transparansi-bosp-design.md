# Spesifikasi Desain: Poster Infografis Transparansi BOSP (Siap Cetak Papan Pengumuman)

- **Tanggal:** 2026-11-20
- **Status:** Draft untuk Review Pengguna
- **Subsistem:** #3 dari 4 (Presentasi & Ekspor Transparansi Publik Sekolah)
- **Lingkup:** Backend (Migration backfill RBAC, `TransparansiPosterService`, `PosterTransparansiController`, Routes 4 varian, RBAC `PermissionCatalog`, PHPUnit Tests) + Frontend (Studio Poster Neo-Bento, 3 Tema Warna, SVG Charts, Ekspor PNG HD 3× via `html-to-image`, Cetak/PDF A4 & A3 via `@media print`, Sidebar, Pencarian Fitur `Ctrl+K`)

---

## 1. Tujuan & Masalah yang Diselesaikan

Sesuai ketentuan keterbukaan informasi pengelolaan Dana BOSP, sekolah wajib memublikasikan rencana anggaran dan realisasi penggunaan dana BOSP secara berkala pada papan pengumuman sekolah dan/atau kanal komunikasi orang tua/komite. Selama ini bendahara harus membuat desain poster secara manual di aplikasi terpisah (Canva/Word) dan menyalin angka satu per satu dari laporan BKU/RKAS.

Fitur **Poster Infografis Transparansi BOSP** menghasilkan poster infografis siap cetak secara otomatis langsung dari data resmi `newSIKAS` untuk keempat varian BOSP (`reguler`, `kinerja`, `silpa`, `kinerja_silpa`), lengkap dengan pratinjau langsung, 3 pilihan tema warna, grafik SVG tajam, ekspor **PNG HD (300 DPI / 3×)** untuk cetak spanduk atau berbagi WhatsApp, serta **Cetak / Simpan PDF (A4 / A3)** 1 halaman penuh.

---

## 2. RBAC, Migrasi Backfill & Routes

### 2.1 Registrasi RBAC (`app/Config/PermissionCatalog.php`)

- Tambah modul baru pada `modules()` di grup `'Fitur Pelengkap'`:
  ```php
  [
      'key' => 'poster_transparansi',
      'label' => 'Poster Transparansi BOSP',
      'group' => 'Fitur Pelengkap',
      'description' => 'Membuat, menyesuaikan tema, mencetak, dan mengekspor poster infografis transparansi BOSP.',
      'supports_write' => false,
  ]
  ```
- Preset default `defaultPermissionsForRole()`:
  - `bendahara`: `read` (otomatis karena `supports_write: false`).
  - `kepala_sekolah`: `read` (tidak masuk `$systemHidden`).
  - Role custom lain: `none` (dapat diaktifkan di *Management & Role*).
- Pemetaan route pada `resolveRouteRequirement()`:
  - `'poster-transparansi' => 'poster_transparansi'`
  - `'api.poster-transparansi' => 'poster_transparansi'`

### 2.2 Migrasi Backfill Role Sistem

Migrasi: `database/migrations/2026_11_20_120000_backfill_poster_transparansi_role_permission.php`
- Bila tabel `roles` tersedia, isi `permissions.modules.poster_transparansi = 'read'` pada role sistem `bendahara` dan `kepala_sekolah` **hanya** bila kunci `poster_transparansi` belum ada (tidak menimpa kustomisasi admin).
- Tidak membuat tabel data baru.

### 2.3 Routes Varian (`routes/variant.php`)

Dipasang di dalam `routes/variant.php` sehingga otomatis tersedia pada keempat varian (`reguler`, `kinerja-`, `silpa-`, `kinerja-silpa-`):

```php
Route::get('/poster-transparansi', [PosterTransparansiController::class, 'index'])
    ->name('poster-transparansi.index');
Route::get('/api/poster-transparansi/data', [PosterTransparansiController::class, 'data'])
    ->name('api.poster-transparansi.data');
```

---

## 3. Agregasi Data Backend (`App\Services\TransparansiPosterService`)

Service terpusat mengambil data real-time dari model varian melalui `VariantConfig::getModelClass(..., $variant)` — 100% kompatibel dengan PostgreSQL maupun SQLite `:memory:` (memakai `whereBetween('tanggal_transaksi', [$start, $end])` yang sargable & lintas DB, **bukan** `EXTRACT(...)` khusus Postgres).

### 3.1 Parameter Input
- `variant`: salah satu `VariantConfig::VARIANTS` (`reguler`, `kinerja`, `silpa`, `kinerja_silpa`).
- `tahun`: tahun anggaran integer (default: tahun terbaru yang tersedia pada tabel penganggaran varian tersebut, atau tahun berjalan bila belum ada data).
- `periode`: `'tahunan'` | `'tahap_1'` | `'tahap_2'` (default: `'tahunan'`).
  - Rentang tanggal transaksi BKU:
    - `tahunan`: `{$tahun}-01-01` s/d `{$tahun}-12-31` (bulan 1–12)
    - `tahap_1`: `{$tahun}-01-01` s/d `{$tahun}-06-30` (bulan 1–6)
    - `tahap_2`: `{$tahun}-07-01` s/d `{$tahun}-12-31` (bulan 7–12)

### 3.2 Struktur Payload Poster

1. **`meta`**:
   - `variant`, `variant_label` (`VariantConfig::title($variant)`), `tahun`, `periode`, `periode_label` (`Tahun Anggaran 2026` / `Tahap 1 (Jan–Jun 2026)` / `Tahap 2 (Jul–Des 2026)`), `available_years` (daftar tahun anggaran pada varian aktif, urut terbaru), `has_data` (boolean), `generated_at_formatted` (tanggal cetak Bahasa Indonesia).
2. **`sekolah`**:
   - `nama_sekolah`, `npsn`, `status_sekolah`, `jenjang_sekolah`, `alamat_lengkap` (gabungan `alamat`, `kelurahan_desa`, `kecamatan`, `kabupaten_kota`, `provinsi` yang terisi), `kabupaten_kota`, `logo_daerah_data_uri`, `logo_sekolah_data_uri`.
   - **Konversi Logo Aman:** membaca file dari `Storage::disk('public')` dengan pembatasan ukuran aman (≤ 2 MB) & validasi MIME gambar (`image/png`, `image/jpeg`, `image/webp`) lalu mengubah ke `data:{mime};base64,...` agar ekspor `html-to-image` 100% bebas CORS & bekerja offline.
3. **`ringkasan`** (angka keuangan):
   - `pagu_anggaran`: dari `Penganggaran.pagu_anggaran`
   - `dana_diterima`: jumlah `jumlah_dana + saldo_awal` dari `PenerimaanDana` varian terkait sesuai periode:
     - `tahunan`: seluruh penerimaan tahun penganggaran tersebut
     - `tahap_1`: penerimaan dengan `sumber_dana` mengandung `Tahap 1` atau `tanggal_terima` pada Jan–Jun (untuk SiLPA tanpa tahap: tampilkan seluruh penerimaan/saldo SiLPA yang diterima pada rentang tersebut atau total penerimaan tahun terkait bila `tanggal_terima` tidak diisi)
     - `tahap_2`: penerimaan dengan `sumber_dana` mengandung `Tahap 2` atau `tanggal_terima` pada Jul–Des
   - `total_realisasi`: sum `total_transaksi_kotor` pada `BukuKasUmum` varian terkait (`is_bunga_record = false`, rentang tanggal periode)
   - `sisa_dana`: `max(0, ($danaDiterima > 0 ? $danaDiterima : $paguAnggaran) - $totalRealisasi)` dan `sisa_pagu`: `max(0, $paguAnggaran - $totalRealisasi)`
   - `persentase_serapan`: persentase realisasi terhadap `pagu_anggaran` (atau `dana_diterima` bila pagu = 0), dibulatkan 1 desimal, dibatasi `[0, 100]` untuk progres bar visual (nilai aktual tetap disimpan di `persentase_serapan_aktual`).
   - `jumlah_transaksi`: total transaksi belanja non-bunga pada periode tersebut.
   - `status_persetujuan`: `'disetujui'` | `'draft'`, `tanggal_persetujuan_formatted`.
4. **`jenis_belanja`** (4 kategori standar + `Lainnya` bila ada nominal > 0):
   - `pakai_habis`: kode rekening diawali `5.1.02.01` (*Belanja Bahan Pakai Habis*)
   - `barang_jasa`: diawali `5.1.02.02`, `5.1.02.03`, atau `5.1.02.04` (*Belanja Barang & Jasa*)
   - `modal_peralatan`: diawali `5.2.02` (*Belanja Modal Peralatan & Mesin*)
   - `modal_aset_lain`: diawali `5.2.05` (*Belanja Modal Aset Tetap Lainnya*)
   - `lainnya`: transaksi yang tidak cocok 4 prefiks di atas (hanya disertakan jika nominal > 0).
   - Setiap entri berisi `key`, `label`, `nominal`, `persentase`, `color_key`.
5. **`program_snp`** (Realisasi per Program / Standar Nasional Pendidikan dari `KodeKegiatan.program`):
   - Dikelompokkan berdasarkan `KodeKegiatan.program` (fallback `'Program Lainnya'` jika belum terhubung).
   - Diurutkan nominal terbesar; maksimal **7 program teratas** + 1 baris agregat **Program Lainnya** bila total program > 8, agar poster selalu rapi 1 halaman A4/A3 tanpa meluber.
   - Setiap entri berisi `program`, `nominal`, `persentase`, `jumlah_transaksi`.
6. **`tren_bulanan`**:
   - Daftar bulan sesuai periode (`1..6`, `7..12`, atau `1..12`), masing-masing berisi `bulan` (1–12), `label` (`Jan`, `Feb`, ...), `nominal`.
7. **`penanggung_jawab`**:
   - `kepala_sekolah`, `nip_kepala_sekolah`, `bendahara`, `nip_bendahara`, `komite`.

---

## 4. Desain Studio UI & Kanvas Poster (`resources/js/Pages/FiturPelengkap/PosterTransparansi/`)

### 4.1 Struktur File Frontend
- `resources/js/Pages/FiturPelengkap/PosterTransparansi/types.ts` — tipe TypeScript strict untuk payload poster, tema, dan opsi kustomisasi.
- `resources/js/Pages/FiturPelengkap/PosterTransparansi/themes.ts` — definisi 3 tema warna poster (**Neo-Bento SIKAS**, **Resmi Biru-Emas**, **Hijau Zamrud Sekolah**).
- `resources/js/Pages/FiturPelengkap/PosterTransparansi/Partials/PosterCanvas.tsx` — komponen kanvas poster proporsional (`794px` basis lebar A4/A3 portrait) lengkap dengan header sekolah & 2 logo, 4 kartu KPI keuangan, grafik Donut SVG komposisi jenis belanja, daftar horizontal bar Program/Standar SNP, grafik batang SVG tren bulanan, catatan transparansi opsional, dan blok tanda tangan 3 kolom (*Kepala Sekolah · Bendahara · Ketua Komite*).
- `resources/js/Pages/FiturPelengkap/PosterTransparansi/Index.tsx` — halaman studio Neo-Bento (header, switcher 4 varian BOSP, panel kontrol kiri, area preview kanan responsif dengan skala otomatis, tombol **Unduh PNG HD (3×)** & **Cetak / Simpan PDF**).

### 4.2 Ekspor PNG HD & Cetak / PDF Presisi
1. **Unduh PNG HD (3× Resolusi):**
   - Memakai `toPng` dari `html-to-image` pada elemen kanvas poster murni (di luar transform skala preview agar hasil selalu utuh `794 × auto` px dikali `pixelRatio: 3` ≈ `2382 px` lebar — setara 300 DPI cetak A4/A3).
   - Menyertakan kompensasi aman terhadap `html { zoom: 0.8 }` pada desktop agar hasil tidak terpotong atau mengecil.
   - Nama berkas: `poster-transparansi-{variant}-{tahun}-{periode}.png`.
   - Status loading & feedback error inline (tanpa `window.alert`).
2. **Cetak / Simpan PDF (A4 Portrait / A3 Portrait):**
   - Menyuntikkan aturan `@media print` yang menyembunyikan seluruh chrome aplikasi (`Sidebar`, `Navbar`, panel kontrol) dan merender `#transparansi-poster-sheet` penuh 1 halaman dengan `-webkit-print-color-adjust: exact; print-color-adjust: exact;` serta `@page { size: A4 portrait; margin: 6mm; }` (atau `A3 portrait` saat mode A3 dipilih).

### 4.3 Integrasi Navigasi & Pencarian
1. **`resources/js/Components/Sidebar.tsx`:**
   - Tambah `canModule('poster_transparansi')` pada `showFiturPelengkap`.
   - Tambah `NavLink` **Poster Transparansi** di grup *Fitur Pelengkap* tepat di bawah *Laporan* (`route('poster-transparansi.index')`, active pada semua 4 prefix varian `*.poster-transparansi.*`).
2. **`resources/js/Utils/featureSearchCatalog.ts` & `resources/js/Components/FeatureSearchModal.tsx`:**
   - Tambah `poster_transparansi` ke `FeatureIconKey`, `VARIANT_TEMPLATES`, dan `FEATURE_SEARCH_ITEMS` kategori `Fitur Pelengkap` (kata kunci: `poster`, `infografis`, `transparansi`, `papan pengumuman`, `publikasi`, `cetak`, `bosp`).
   - Pastikan **tetap tidak** ada referensi NPSN / `Alt+9` di katalog pencarian.

---

## 5. Rencana Pengujian & Verifikasi

### 5.1 PHPUnit Feature Tests (`tests/Feature/PosterTransparansiTest.php`)
1. **RBAC & 4 Varian:** Bendahara dan Kepala Sekolah dapat mengakses halaman & API `poster-transparansi` pada `reguler` maupun `kinerja`/`silpa`/`kinerja_silpa`; role custom tanpa izin `poster_transparansi` mendapat `403`.
2. **Akurasi Agregasi Periode (`tahunan`, `tahap_1`, `tahap_2`):** Transaksi BKU pada bulan 3 (Tahap 1) dan bulan 9 (Tahap 2) serta bunga bank (`is_bunga_record = true`) terhitung akurat: `tahap_1` hanya menjumlahkan Jan–Jun, `tahap_2` hanya Jul–Des, `tahunan` menjumlahkan keduanya, dan record bunga bank selalu dikecualikan.
3. **Klasifikasi Jenis Belanja & Program SNP:** Rekening `5.1.02.01.*` masuk `pakai_habis`, `5.1.02.02.*` masuk `barang_jasa`, `5.2.02.*` masuk `modal_peralatan`, `5.2.05.*` masuk `modal_aset_lain`; program SNP teragregasi dan terurut dari nominal terbesar.
4. **Kondisi Data Kosong & Validasi Query:** Saat sekolah belum memiliki penganggaran pada varian/tahun tertentu, endpoint tetap mengembalikan status `200` dengan `has_data: false` dan nilai nol aman tanpa error; parameter `periode` tidak valid fallback aman ke `tahunan`.

### 5.2 Quality Gates
- `vendor/bin/pint`
- `php artisan migrate --force` (PostgreSQL `newSIKAS`)
- `php artisan test --filter="PosterTransparansiTest|SmartNotificationTest|ActivityLogTest"`
- `npm run build` (`tsc && vite build`)
- `/code-review` dua sumbu paralel (**Standards** & **Spec**).
