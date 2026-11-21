# Spesifikasi Desain: Portal Website Transparansi BOSP Publik (`/transparansi`)

- **Tanggal:** 2026-11-21
- **Status:** Draft untuk Review Pengguna
- **Lingkup:** Backend (`PublicTransparansiService`, `PublicTransparansiController`, Routes publik & API ter-throttle di `routes/web.php`, PHPUnit Feature Tests) + Frontend (Halaman publik `Transparansi/Index.tsx` & 6 sub-komponen modular bergaya Novara, Penjelajah RKA Tahapan Dual-Mode untuk RKAS Awal & RKAS Perubahan, Integrasi `PosterCanvas` dengan opsi `hideNip`, serta integrasi navigasi pada `Welcome.tsx` / `Navbar.tsx` / `Hero.tsx`).

---

## 1. Tujuan & Strategi Keterbukaan Informasi

Sekolah penerima dana BOSP (Reguler, Kinerja, SiLPA Reguler, dan SiLPA Kinerja) memerlukan kanal publik seperti website resmi yang dapat diakses masyarakat (orang tua siswa, komite sekolah, dan warga) **tanpa perlu login** agar pengelolaan dana BOSP transparan, mudah dipahami, dan akuntabel.

Portal ini melengkapi halaman landing [Welcome.tsx](../../../resources/js/Pages/Welcome.tsx) dan fitur internal [Poster Infografis Transparansi BOSP](./2026-11-20-poster-transparansi-bosp-design.md) dengan menyajikan:
1. **Ringkasan Makro Lintas 4 Varian BOSP & Lintas Tahun Anggaran** (Pagu, Dana Diterima, Total Realisasi, Sisa Dana, % Serapan, dan Status Persetujuan).
2. **Analisis Pengelolaan Visual** (Komposisi Jenis Belanja, Realisasi Program / Standar Nasional Pendidikan, dan Tren Belanja Bulanan).
3. **Penjelajah RKA Tahapan Dual-Mode** untuk **RKAS Awal** dan **RKAS Perubahan** (mode *Ringkas & Ramah Masyarakat* serta mode *Kertas Kerja Resmi*).
4. **Pratinjau & Unduh Poster Infografis Transparansi Publik** (PNG HD 3× dan Cetak / Simpan PDF) beserta informasi Penanggung Jawab tanpa mengekspos data sensitif.

### 1.1 Piramida Informasi (*Makro → Meso → Mikro*)
Alur halaman dirancang bertahap agar masyarakat awam tidak langsung dibebani tabel akuntansi 16 kolom:
1. **Zona Hero (Makro):** Identitas & logo sekolah, ringkasan gabungan seluruh varian tahun berjalan, pemilih **Tahun Anggaran**, **4 Varian BOSP**, dan **Periode** (`Tahunan`, `Tahap 1`, `Tahap 2`).
2. **Zona Realisasi & Grafik (Meso):** 4 KPI keuangan varian aktif + badge status (`Disetujui` / `Dalam Penyusunan`) + 3 visualisasi interaktif (Jenis Belanja, Program SNP, Tren Bulanan).
3. **Zona RKA Tahapan (Mikro):** Penjelajah interaktif **RKAS Awal** & **RKAS Perubahan** (lazy-loaded) dengan pencarian, filter Tahap 1/2, highlight selisih `+Bertambah`/`-Berkurang`, serta tombol switch ke *Kertas Kerja Resmi*.
4. **Zona Publikasi & Penanggung Jawab (Penutup):** Pratinjau Poster Infografis (3 pilihan tema, Unduh PNG HD 3×, Cetak) + kartu Penanggung Jawab (*Kepala Sekolah, Bendahara, Ketua Komite*).

---

## 2. Arsitektur Routing & Keamanan Privasi

### 2.1 Routes Publik (`routes/web.php`)
Dipasang di luar grup `middleware('auth')` (sejajar dengan route `/` `Welcome`), tanpa membuat tabel atau migrasi database baru (100% *read-only*):

```php
Route::get('/transparansi', [PublicTransparansiController::class, 'index'])
    ->name('transparansi.index');

Route::middleware('throttle:60,1')->prefix('api/public/transparansi')->name('api.public.transparansi.')->group(function () {
    Route::get('/data', [PublicTransparansiController::class, 'data'])->name('data');
    Route::get('/rka-tahapan', [PublicTransparansiController::class, 'rkaTahapan'])->name('rka-tahapan');
});
```

- **Sinkronisasi URL:** Pergantian filter di frontend menyinkronkan query string (`/transparansi?variant=reguler&tahun=2026&periode=tahunan`) via `window.history.replaceState` sehingga tautan spesifik varian/tahun dapat dibagikan langsung ke orang tua/komite.
- **Autentikasi & Pengelola:** Jika pengunjung sudah login, `TransparansiNavbar` tetap menampilkan tombol menuju Dashboard (`AccountActions`); jika belum login, menampilkan tombol `Masuk Pengelola` tanpa mengganggu akses baca publik.

### 2.2 Kebijakan Publikasi & Whitelist Sanitasi Data Sensitif
- **Publikasi Real-Time dengan Transparansi Status:** Seluruh data yang tersedia di SIKAS langsung dapat dilihat secara real-time, disertai badge status yang jujur:
  - `disetujui` → badge hijau **`Disetujui`** (+ tanggal persetujuan jika tersedia).
  - selain `disetujui` → badge amber **`Dalam Penyusunan`** (bukan `Draft` mentah agar lebih informatif bagi masyarakat).
- **Larangan Eksposur Data Sensitif (Whitelist Ketat):**
  Backend publik **WAJIB** menggunakan serializer whitelist eksplisit di `PublicTransparansiService` dan **tidak boleh** mengirim field berikut ke respons HTML/Inertia maupun JSON API:
  - `nip_kepala_sekolah`, `nip_bendahara`
  - `nama_penerima`, `jabatan`, `nomor_rekening`, `bank`, `ada_npwp`, `status_penerima`, `golongan`
  - `pot_ppn*`, `pot_pph*`, `is_ppn`, `is_pph*`
  - `rkas_ids*`, `murni_rkas_ids*`, daftar transaksi BKU mentah, nomor bukti, akun user, atau token sinkronisasi (`website_sync_token`).

---

## 3. Arsitektur Backend (`App\Services\PublicTransparansiService`)

Service terpusat ini mengorkestrasi seluruh agregasi publik secara 100% kompatibel dengan PostgreSQL dan SQLite `:memory:`.

### 3.1 `buildOverview(string $variant, ?int $tahun = null, string $periode = 'tahunan'): array`
1. **Validasi & Fallback Aman:**
   - `$variant`: divalidasi dengan `VariantConfig::isValid($variant)`, fallback ke `VariantConfig::REGULER`.
   - `$periode`: salah satu `['tahunan', 'tahap_1', 'tahap_2']`, fallback ke `'tahunan'`.
   - **`available_years` Global:** Menghimpun gabungan unik seluruh `tahun_anggaran` dari ke-4 tabel penganggaran (`penganggarans`, `kinerja_penganggarans`, `silpa_penganggarans`, `kinerja_silpa_penganggarans`), diurutkan menurun (terbaru di indeks 0). Jika `$tahun` kosong atau di luar rentang `[2000, 2100]`, otomatis memilih tahun terbaru pada `available_years` (atau tahun kalender berjalan bila DB kosong).
2. **Ringkasan 4 Varian (`variants_summary`):**
   Untuk setiap varian dalam `VariantConfig::VARIANTS` pada `$resolvedTahun`:
   - Memanggil `TransparansiPosterService::buildPosterData($v, $resolvedTahun, $resolvedPeriode)` untuk memperoleh angka konsisten (`pagu_anggaran`, `dana_diterima`, `total_realisasi`, `sisa_dana`, `persentase_serapan`, `status_persetujuan`, `has_data`).
   - Mengecek ketersediaan RKA Tahapan:
     - `has_rkas_awal`: `true` bila ada baris di model `rkas` varian terkait untuk `penganggaran_id` tahun tersebut.
     - `supports_perubahan`: `VariantConfig::getModelClass('rkas_perubahan', $v) !== null` (`true` untuk `reguler` & `kinerja`, `false` untuk `silpa` & `kinerja_silpa`).
     - `has_rkas_perubahan`: `true` bila `supports_perubahan` dan ada baris di model `rkas_perubahan` varian terkait untuk `penganggaran_id` tahun tersebut.
3. **Agregat Gabungan Tahun Terpilih (`aggregate`):**
   - `total_pagu`, `total_dana_diterima`, `total_realisasi`, `total_sisa_dana`, `persentase_serapan`, `active_variants_count` (jumlah varian yang memiliki data pada tahun tersebut).
4. **Payload Detail Varian Aktif (`active`):**
   - Menggunakan hasil `TransparansiPosterService::buildPosterData($resolvedVariant, $resolvedTahun, $resolvedPeriode)` yang **disanitasi**: menghapus kunci `nip_kepala_sekolah` dan `nip_bendahara` dari `penanggung_jawab` (hanya mengirim `kepala_sekolah`, `bendahara`, `komite`).
   - Menyertakan flag `has_rkas_awal`, `has_rkas_perubahan`, `supports_perubahan`, dan `tanggal_perubahan_formatted` (jika ada).

### 3.2 `buildRkaTahapan(string $variant, int $tahun, string $jenis = 'awal'): array`
1. **Validasi Input:**
   - `$variant`: fallback ke `'reguler'`.
   - `$jenis`: `'awal'` atau `'perubahan'`, fallback ke `'awal'`.
2. **Resolusi Model Varian via `VariantConfig`:**
   - Cari `$penganggaran` dari `VariantConfig::getModelClass('penganggaran', $variant)` untuk `tahun_anggaran = $tahun`.
   - Jika `$penganggaran` tidak ditemukan → kembalikan `has_data: false`, `reason: 'not_found'`, `message: 'Data penganggaran belum tersedia untuk varian dan tahun ini.'`, `programs: []`, `totals: {...}`.
   - Jika `$jenis === 'perubahan'`:
     - Cek `$rkasPerubahanClass = VariantConfig::getModelClass('rkas_perubahan', $variant)`.
     - Jika `$rkasPerubahanClass === null` → kembalikan `has_data: false`, `supports_perubahan: false`, `reason: 'unsupported_variant'`, `message: 'Varian SiLPA tidak memiliki tahapan RKAS Perubahan.'`.
     - Query item `rkas_perubahan` (with `kodeKegiatan`, `rekeningBelanja`) dan item `rkas` murni (with `kodeKegiatan`, `rekeningBelanja`) berdasarkan `VariantConfig::penganggaranFk($variant)`.
     - Jika baris `rkas_perubahan` kosong → kembalikan `has_data: false`, `supports_perubahan: true`, `reason: 'no_perubahan'`, `message: 'RKAS Perubahan belum tersedia untuk tahun anggaran ini.'`.
   - Jika `$jenis === 'awal'`:
     - Query item dari `VariantConfig::getModelClass('rkas', $variant)` (with `kodeKegiatan`, `rekeningBelanja`).
     - Jika kosong → kembalikan `has_data: false`, `reason: 'empty_rkas'`, `message: 'Rincian RKAS Awal belum tersedia untuk tahun anggaran ini.'`.
3. **Pembentukan Hierarki & Perhitungan Tahap 1 / Tahap 2:**
   - Tahap 1 = bulan dalam `['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni']`; Tahap 2 = bulan lainnya (`Juli`–`Desember`).
   - Untuk **`awal`**: pengelompokan item per `kode_kegiatan` memakai kunci `kode_rekening + '-' + uraian + '-' + (float) harga_satuan` (konsisten dengan perhitungan total volume, jumlah, tahap1, tahap2).
   - Untuk **`perubahan`**: mencocokkan item Murni (`rkas`) vs Perubahan (`rkas_perubahan`) dengan kunci `kode_rekening + '-' + uraian + '-' + (float) harga_satuan` (selaras dengan `RkasPerubahanController::kelolaDataRkas`), menghitung:
     - `volume_murni`, `jumlah_murni`
     - `volume`, `jumlah`, `tahap1`, `tahap2`
     - `bertambah = max(0, jumlah - jumlah_murni)`
     - `berkurang = max(0, jumlah_murni - jumlah)`
     - `status_perubahan`: `'baru'` (`jumlah_murni == 0 && jumlah > 0`), `'dihapus'` (`jumlah_murni > 0 && jumlah == 0`), `'naik'` (`jumlah > jumlah_murni`), `'turun'` (`jumlah < jumlah_murni`), atau `'tetap'`.
   - Mengembalikan struktur hierarki bersih (array terurut berdasarkan kode program/sub-program/kegiatan — bukan map objek tak terurut):
     ```json
     {
       "meta": {
         "variant": "reguler",
         "variant_label": "BOSP Reguler",
         "tahun": 2026,
         "jenis": "perubahan",
         "has_data": true,
         "supports_perubahan": true,
         "reason": null,
         "message": null,
         "sumber_dana": "BOSP Reguler",
         "pagu_anggaran": 482230000,
         "status_persetujuan": "disetujui",
         "tanggal_dokumen_formatted": "15 Oktober 2026"
       },
       "totals": {
         "jumlah_murni": 482230000,
         "jumlah": 482230000,
         "bertambah": 18500000,
         "berkurang": 18500000,
         "tahap1": 241115000,
         "tahap2": 241115000,
         "total_items": 84,
         "changed_items": 19
       },
       "programs": [
         {
           "kode": "03",
           "uraian": "Pengembangan Standar Proses",
           "jumlah_murni": 0,
           "jumlah": 0,
           "bertambah": 0,
           "berkurang": 0,
           "tahap1": 0,
           "tahap2": 0,
           "sub_programs": [
             {
               "kode": "03.03",
               "uraian": "...",
               "jumlah_murni": 0,
               "jumlah": 0,
               "bertambah": 0,
               "berkurang": 0,
               "tahap1": 0,
               "tahap2": 0,
               "uraian_programs": [
                 {
                   "kode": "03.03.06",
                   "uraian": "...",
                   "jumlah_murni": 0,
                   "jumlah": 0,
                   "bertambah": 0,
                   "berkurang": 0,
                   "tahap1": 0,
                   "tahap2": 0,
                   "items": [
                     {
                       "kode_rekening": "5.1.02.01.01.0024",
                       "kode_kegiatan": "03.03.06",
                       "uraian": "Kertas HVS A4 70gr",
                       "satuan": "Rim",
                       "tarif": 55000,
                       "volume_murni": 20,
                       "jumlah_murni": 1100000,
                       "volume": 25,
                       "jumlah": 1375000,
                       "bertambah": 275000,
                       "berkurang": 0,
                       "tahap1": 550000,
                       "tahap2": 825000,
                       "status_perubahan": "naik"
                     }
                   ]
                 }
               ]
             }
           ]
         }
       ]
     }
     ```
   - **Tampilan Uraian:** Mengutamakan `uraian` (uraian SIKAS) yang sudah di-trim; jika `uraian` SIKAS kosong atau hanya berisi spasi, otomatis fallback ke `uraian_arkas` yang sudah di-trim (dan fallback akhir `'-'`), berlaku konsisten di mode Ringkas maupun Kertas Kerja Resmi.

### 3.3 Controller: `App\Http\Controllers\PublicTransparansiController`
- `index(Request $request)`: membaca query opsional `variant`, `tahun`, `periode`, memanggil `PublicTransparansiService::buildOverview(...)`, lalu merender `Inertia::render('Transparansi/Index', ['initialData' => ..., 'hasUsers' => ...])`.
- `data(Request $request)`: mengembalikan `response()->json($service->buildOverview(...))`.
- `rkaTahapan(Request $request)`: mengembalikan `response()->json($service->buildRkaTahapan(...))`.

---

## 4. Arsitektur Frontend & Desain UI/UX

### 4.1 Bahasa Visual (Selaras Tema Novara `Welcome.tsx`)
- **Zona Gelap Sinematik (Navbar & Hero):** Gradien *Deep Midnight Teal* (`#051821` → `#0A2633` → `#0F3544`), aksen *Mint Aqua* (`#8BE6DC`), kartu *glassmorphism* (`bg-white/[0.08] border-white/15 backdrop-blur-xl`), tipografi `Plus Jakarta Sans` + `tabular-nums` pada seluruh nominal.
- **Zona Konten Data (Realisasi, RKA Tahapan, Poster):**
  - *Light Mode:* latar `#F8FBFB`, kartu `#FFFFFF` / `#EAF4F4` border `#D4E7E7`, teks utama `#08222B`, aksen `#14535E` & `#8BE6DC`.
  - *Dark Mode:* latar `#051319`, kartu `#0B222C` border `rgba(139,230,220,0.14)`, teks utama `#F0FAFA`.
- **Responsif & Aksesibilitas:** Mendukung tampilan mobile hingga desktop, fokus keyboard jelas, dan menghormati `prefers-reduced-motion`.

### 4.2 Struktur File Modular (`resources/js/Pages/Transparansi/`)
1. `resources/js/Pages/Transparansi/types.ts` — definisi tipe TypeScript strict untuk payload overview, varian, RKA Tahapan Awal/Perubahan, dan state filter.
2. `resources/js/Pages/Transparansi/Index.tsx` — komponen halaman utama:
   - Mengelola state `variant`, `tahun`, `periode`, `rkaJenis` (`'awal' | 'perubahan'`), `rkaViewMode` (`'friendly' | 'official'`).
   - Menyinkronkan query URL saat filter berubah.
   - Menggunakan cache in-memory sederhana (`Map<string, PublicRkaTahapanResponse>`) berdasarkan kunci `${variant}-${tahun}-${rkaJenis}` agar perpindahan tab RKAS Awal ↔ RKAS Perubahan dan antar varian terasa instan tanpa fetch ulang.
   - Memicu *lazy-fetch* ke `/api/public/transparansi/rka-tahapan` saat section RKA Tahapan memasuki viewport (via `IntersectionObserver`) atau saat pengunjung berinteraksi dengan tab/filter RKA.
   - Menggunakan `AbortController` agar permintaan cepat yang bertumpuk tidak menimbulkan *race condition*.
3. `resources/js/Pages/Transparansi/Partials/TransparansiNavbar.tsx`:
   - Logo SIKAS + tautan kembali ke `Beranda (/)`, anchor section (`Ringkasan`, `Realisasi`, `RKA Tahapan`, `Poster`), `DarkModeSwitcher`, `FullscreenSwitcher`, dan `AccountActions` (`Masuk Pengelola` / `Ke Dashboard`).
4. `resources/js/Pages/Transparansi/Partials/TransparansiHero.tsx`:
   - Menampilkan logo daerah & logo sekolah, nama sekolah, NPSN, jenjang/status, alamat lengkap, dan badge **`Portal Keterbukaan Informasi Publik BOSP`**.
   - Kartu ringkasan gabungan tahun terpilih (Total Pagu & Total Realisasi lintas seluruh varian aktif).
   - **Kontrol Utama:** Dropdown **Tahun Anggaran**, **4 Tab Varian BOSP** (masing-masing menampilkan label varian, nominal pagu singkat, dan indikator titik hijau bila memiliki data), serta pill pemilih **Periode** (`Tahunan`, `Tahap 1`, `Tahap 2`).
5. `resources/js/Pages/Transparansi/Partials/RealisasiOverviewSection.tsx`:
   - 4 kartu KPI varian aktif (`Pagu Anggaran`, `Dana Diterima`, `Total Realisasi` + progress bar `% Serapan`, `Sisa Dana`) + badge status (`Disetujui` / `Dalam Penyusunan`).
   - 3 visualisasi SVG tajam & responsif:
     - **Komposisi Jenis Belanja** (Donut SVG + legenda persentase & nominal).
     - **Realisasi per Program / Standar SNP** (Horizontal progress bar terurut).
     - **Tren Belanja Bulanan** (Grafik batang SVG interaktif dengan tooltip hover).
   - Empty state bersih apabila varian/tahun terpilih belum memiliki data.
6. `resources/js/Pages/Transparansi/Partials/RkaTahapanExplorer.tsx`:
   - **Tab Dokumen:** **`RKA Tahapan — RKAS Awal`** | **`RKA Tahapan — RKAS Perubahan`** (dilengkapi badge jumlah item berubah; untuk varian `silpa` / `kinerja_silpa`, tab Perubahan menampilkan badge `Tidak Berlaku` dan pesan penjelasan singkat saat diklik).
   - **Toggle Mode Tampilan:** **`Ringkas (Ramah Masyarakat)`** (default) ↔ **`Kertas Kerja Resmi`**.
   - **Toolbar Filter (Client-side instan):**
     - Input pencarian (*cari nama kegiatan, uraian barang/jasa, atau kode rekening*).
     - Filter Tahap (`Semua Tahap`, `Tahap 1 (Jan–Jun)`, `Tahap 2 (Jul–Des)`).
     - Khusus RKAS Perubahan: chip toggle **`Hanya yang Berubah`** + 4 kartu ringkas (`Total RKAS Awal`, `Total RKAS Perubahan`, `Total Bertambah (+)`, `Total Berkurang (-)`).
   - **Mode 1 — Ringkas (Ramah Masyarakat):**
     - Accordion 3 tingkat: **Program SNP** → **Sub-Program** → **Uraian Kegiatan** → daftar baris item belanja bersih (Uraian, Kode Rekening, Volume × Satuan × Harga Satuan, Total, Pembagian Tahap 1 & Tahap 2, serta badge `+Rp ...` hijau / `-Rp ...` merah / `Baru` / `Dihapus` pada RKAS Perubahan).
     - Tombol `Buka Semua` / `Tutup Semua` & penghitung hasil filter.
7. `resources/js/Pages/Transparansi/Partials/RkaTahapanOfficialTable.tsx`:
   - Merender format **Kertas Kerja Resmi** *read-only*:
     - Kop identitas sekolah (NPSN, Nama Sekolah, Alamat, Kabupaten, Provinsi, Tahap I dan II).
     - Bagian **A. Penerimaan** (No Kode `4.3.1.01.`, Sumber Dana, Total Penerimaan).
     - Bagian **B. Belanja**:
       - Untuk **RKAS Awal**: tabel 10 kolom resmi (No, Kode Rekening, Kode Program, Uraian, Volume, Satuan, Tarif Harga, Jumlah, Tahap 1, Tahap 2).
       - Untuk **RKAS Perubahan**: tabel 16 kolom resmi (No, Kode Rekening, Kode Program, Uraian, Sebelum Perubahan [Vol/Sat/Tarif/Jumlah], Sesudah Perubahan [Vol/Sat/Tarif/Jumlah], Perubahan [Bertambah/Berkurang], Tahap [Tahap 1/Tahap 2]).
     - Blok Penanggung Jawab publik (*Komite Sekolah, Kepala Sekolah, Bendahara*) **tanpa baris NIP**.
8. `resources/js/Pages/Transparansi/Partials/PublicPosterSection.tsx`:
   - Me-reuse [PosterCanvas.tsx](../../../resources/js/Pages/FiturPelengkap/PosterTransparansi/Partials/PosterCanvas.tsx) dengan properti baru opsional `hideNip?: boolean` (default `false` agar fitur internal bendahara tetap menampilkan NIP, sedangkan portal publik mengirim `hideNip={true}`) serta menjadikan `nip_kepala_sekolah?: string` dan `nip_bendahara?: string` opsional pada `PosterData` di `PosterTransparansi/types.ts`.
   - Menyediakan 3 tombol pilihan tema (`Neo-Bento SIKAS`, `Resmi Biru-Emas`, `Hijau Zamrud`), pratinjau skala responsif otomatis, tombol **Unduh PNG HD (3×)** (memakai `html-to-image` dengan kompensasi zoom desktop yang sama seperti studio poster), dan tombol **Cetak / Simpan PDF**.
   - Menyertakan kartu Penanggung Jawab & footer resmi portal transparansi.

### 4.3 Integrasi dengan `Welcome.tsx`
- [Navbar.tsx](../../../resources/js/Components/Landing/Navbar.tsx): menambahkan item navigasi **`Transparansi`** (`href="/transparansi"`, menggunakan Inertia `<Link>`) pada menu desktop dan panel mobile.
- [Hero.tsx](../../../resources/js/Components/Landing/Hero.tsx): menambahkan tombol pintasan elegan **`Portal Transparansi`** di baris CTA hero agar pengunjung langsung dapat mengakses data BOSP sekolah dari halaman utama.

---

## 5. Rencana Pengujian & Quality Gates

### 5.1 PHPUnit Feature Tests (`tests/Feature/PublicTransparansiTest.php`)
1. **Akses Publik Tanpa Login:** `GET /transparansi`, `GET /api/public/transparansi/data`, dan `GET /api/public/transparansi/rka-tahapan` mengembalikan `200 OK` untuk tamu (unauthenticated) tanpa redirect ke `/login`.
2. **Audit Sanitasi & Zero Data Leak:** Memastikan payload Inertia dan JSON publik **tidak mengandung** `nip_kepala_sekolah`, `nip_bendahara`, `nomor_rekening`, `bank`, `nama_penerima`, `ada_npwp`, `pot_ppn`, `pot_pph21`, `pot_pph23`, maupun `website_sync_token` meski seluruh kolom tersebut terisi di database.
3. **Akurasi Agregasi 4 Varian & Tahun:** Memverifikasi `variants_summary` dan `aggregate` menghitung pagu, penerimaan, dan realisasi lintas `reguler`, `kinerja`, `silpa`, `kinerja_silpa`, termasuk mengecualikan `is_bunga_record = true`.
4. **Akurasi RKA Tahapan Awal & Perubahan:**
   - Memverifikasi pembagian Tahap 1 (Jan–Jun) vs Tahap 2 (Jul–Des) pada RKAS Awal (`reguler`, `kinerja`, `silpa`, `kinerja_silpa`).
   - Memverifikasi perbandingan Murni vs Perubahan pada RKAS Perubahan (`reguler` & `kinerja`): item naik (`bertambah`), item turun (`berkurang`), item baru (`status_perubahan = 'baru'`), dan item dihapus (`status_perubahan = 'dihapus'`).
   - Memverifikasi varian `silpa` & `kinerja_silpa` saat diminta `jenis=perubahan` mengembalikan `200 OK` dengan `has_data: false`, `supports_perubahan: false`, dan `reason: 'unsupported_variant'`.
5. **Kondisi Data Kosong & Fallback Query Invalid:** Saat database belum memiliki penganggaran atau query `variant`/`periode`/`jenis` tidak valid, seluruh endpoint tetap mengembalikan `200 OK` dengan fallback aman tanpa error 500.

### 5.2 Quality Gates Sebelum Selesai
- `vendor/bin/pint` — format PHP sesuai standar Laravel.
- `composer test` — seluruh suite PHPUnit (termasuk `PublicTransparansiTest` & `PosterTransparansiTest`) lulus 100%.
- `npm run build` — lulus kompilasi TypeScript strict (`tsc`) dan bundling Vite 7 tanpa warning/error.
- `/code-review` dua sumbu paralel (**Standards** & **Spec**) untuk memastikan nol pelanggaran standar dan 100% kesesuaian terhadap dokumen spesifikasi ini.
