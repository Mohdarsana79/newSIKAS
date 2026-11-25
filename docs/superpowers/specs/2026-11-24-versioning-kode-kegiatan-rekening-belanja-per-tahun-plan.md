# Rencana Implementasi: Versioning Kode Kegiatan & Rekening Belanja Per Tahun Anggaran

**Tanggal:** 2026-11-24  
**Spec Acuan:** [2026-11-24-versioning-kode-kegiatan-rekening-belanja-per-tahun-design.md](file:///c:/laragon/www/newSIKAS2/newSIKAS/docs/superpowers/specs/2026-11-24-versioning-kode-kegiatan-rekening-belanja-per-tahun-design.md)  
**Status:** Siap Eksekusi Setelah Instruksi Mulai dari Pengguna

---

## Ringkasan Urutan Eksekusi (7 Tahap)

### Tahap 1 — Migrasi Database, Model & Seeder
1. **Buat migrasi `database/migrations/2026_11_24_000001_add_tahun_to_kode_kegiatans_and_rekening_belanjas_tables.php`:**
   - Tambah kolom `tahun` (`unsignedSmallInteger`, `nullable`, indexed) pada `kode_kegiatans` dan `rekening_belanjas`.
   - Hapus unique constraint lama (`kode_kegiatans_kode_unique`, `rekening_belanjas_kode_rekening_unique`) dan buat composite unique constraint baru:
     - `kode_kegiatans`: `UNIQUE (kode, tahun)` (`kode_kegiatans_kode_tahun_unique`)
     - `rekening_belanjas`: `UNIQUE (kode_rekening, tahun)` (`rekening_belanjas_kode_rekening_tahun_unique`)
   - Jalankan backfill & kloning data existing secara atomik di dalam transaksi (`DB::transaction()`):
     - Kumpulkan seluruh `tahun_anggaran` unik dari 4 tabel penganggaran (`penganggarans`, `kinerja_penganggarans`, `silpa_penganggarans`, `kinerja_silpa_penganggarans`), urut menurun.
     - Jika kosong → set `tahun = (int) date('Y')`.
     - Jika ≥ 1 tahun → tahun terbaru (`$latestYear`) mempertahankan baris existing (`id` tetap); untuk setiap tahun lebih lama (`$year < $latestYear`), kloning seluruh baris `kode_kegiatans` & `rekening_belanjas` milik `$latestYear` ke `$year`, lalu remap FK seluruh tabel transaksi milik penganggaran bertahun `$year` pada 4 varian (`*_rkas`, `*_rkas_perubahans`, `*_buku_kas_umums`, `*_buku_kas_umum_uraian_details`, `*_kwitansis`, `*_tanda_terimas`) ke `id` baru tahun `$year`.
   - Ubah `tahun` menjadi `NOT NULL` dengan default `(int) date('Y')` (kompatibel PostgreSQL & SQLite `:memory:`).
   - Khusus driver PostgreSQL (`DB::getDriverName() === 'pgsql'`): ubah constraint FK `ON DELETE CASCADE` pada tabel `*_rkas`, `*_rkas_perubahans`, `*_kwitansis`, `*_tanda_terimas` yang mengarah ke `kode_kegiatans(id)` dan `rekening_belanjas(id)` menjadi `ON DELETE RESTRICT`.
2. **Perbarui Model Eloquent:**
   - [KodeKegiatan.php](file:///c:/laragon/www/newSIKAS2/newSIKAS/app/Models/KodeKegiatan.php): tambahkan `'tahun'` di `$fillable`, cast `'tahun' => 'integer'`, hook `booted()` `creating` default `(int) date('Y')` (menjaga kompatibilitas 11 Feature Test existing), dan `scopeForYear($query, int $tahun)`.
   - [RekeningBelanja.php](file:///c:/laragon/www/newSIKAS2/newSIKAS/app/Models/RekeningBelanja.php): tambahkan `'tahun'` di `$fillable`, cast `'tahun' => 'integer'`, hook `booted()` `creating` default `(int) date('Y')`, dan `scopeForYear($query, int $tahun)`.
3. **Perbarui Seeder:**
   - [ReferensiKodeSeeder.php](file:///c:/laragon/www/newSIKAS2/newSIKAS/database/seeders/ReferensiKodeSeeder.php): sertakan `'tahun' => 2026` dengan pencocokan composite `(kode, tahun)` dan `(kode_rekening, tahun)`.

### Tahap 2 — Perbaikan Engine Python ARKAS (`dump_reference.py`)
1. **Perbarui [dump_reference.py](file:///c:/laragon/www/newSIKAS2/newSIKAS/storage/app/arkas_engine/dump_reference.py):**
   - Tambahkan mode `tipe == 'years'` untuk mengembalikan daftar tahun unik gabungan dari `ref_kode` dan `ref_rekening` (urut `DESC`).
   - Pada `tipe == 'kegiatan'`:
     - Deteksi `bentuk_pendidikan_id` aktif dari `mst_sekolah WHERE soft_delete = 0 ORDER BY last_update DESC LIMIT 1`.
     - Filter `ref_kode` dengan `tahun = ?`, `bentuk_pendidikan_id = ?`, dan `sumber_dana_id IN (1, 12, 33, 35)` (dengan fallback berjenjang jika hasil 0 baris).
     - Urutkan prioritas deduplikasi: `expired_date IS NULL` lebih dulu → `sumber_dana_id = 1` lebih dulu → `last_update DESC`; simpan entri pertama per `id_kode` agar baris kadaluarsa/jenjang lain tidak menimpa baris aktif.
     - Resolusi `program` dan `sub_program` dari peta yang sudah bersih; sertakan `bentuk_pendidikan_id` pada JSON output.
   - Uji langsung via CLI `storage/app/arkas_engine/python.exe` terhadap `arkas.db` lokal (mode `years`, `kegiatan 2025/2026/2027`, `rekening 2025/2026/2027`) untuk memverifikasi teks SMP bersih dari PAUD/PKBM.

### Tahap 3 — Service Terpusat `ReferensiKodeService` & Integrasi Service Sync/AI
1. **Buat `app/Services/ReferensiKodeService.php`:**
   - `normalizeKodeKegiatan(string $kode): string`
   - `detectArkasYears(): array` & `resolveActiveYears(bool $includeArkas = false): array`
   - `getStatsPerYear(): array` (peta `tahun => ['kegiatan' => int, 'rekening' => int]`)
   - `getYearsWithTransactions(): array` (cek 4 varian pada `rkas`, `rkas_perubahans`, `buku_kas_umums`)
   - `countUsage(string $tipe, int $id): int` (cek seluruh 20 tabel transaksi lintas 4 varian)
   - `fetchArkasComparison(string $tipe, int $year): array` (bandingkan ketat dengan `where('tahun', $year)`, normalisasi trailing dot untuk kegiatan, ikut bandingkan `rincian_objek` untuk rekening)
   - `syncFromArkas(string $tipe, int $year): array` (Insert + Update ketat pada `tahun = $year`, perbaiki update `rincian_objek` rekening, jaga baris existing tanpa trailing dot agar tidak duplikat)
   - `copyFromYear(string $tipe, int $sourceYear, int $targetYear): array` (salin idempoten untuk `'kegiatan' | 'rekening' | 'both'`).
2. **Perbarui Service Sinkronisasi & AI:**
   - [ArkasRkasSyncService.php](file:///c:/laragon/www/newSIKAS2/newSIKAS/app/Services/ArkasRkasSyncService.php): ubah `loadMasterMaps(?int $tahun = null)` agar memfilter `forYear($tahun)` bila `$tahun` diberikan, dan perjelas pesan error `validateMasterReferences(..., ?int $tahun = null)` dengan menyebut tahun anggaran.
   - [ArkasBkuSyncService.php](file:///c:/laragon/www/newSIKAS2/newSIKAS/app/Services/ArkasBkuSyncService.php): preload `KodeKegiatan::forYear($tahun)` & `RekeningBelanja::forYear($tahun)`.
   - [CopilotService.php](file:///c:/laragon/www/newSIKAS2/newSIKAS/app/Services/Ai/CopilotService.php): filter query rekomendasi `KodeKegiatan` & `RekeningBelanja` ke tahun yang diminta (atau `max(tahun)` di tabel) agar hasil tidak duplikat antar tahun.

### Tahap 4 — Routing, Controllers & Imports (Scoped Per Tahun)
1. **Perbarui [routes/variant.php](file:///c:/laragon/www/newSIKAS2/newSIKAS/routes/variant.php):**
   - Tambah sebelum `Route::resource`:
     - `POST kode-kegiatan/copy-year` (`kode-kegiatan.copy-year`)
     - `POST rekening-belanja/copy-year` (`rekening-belanja.copy-year`)
     - `POST /referensi-kode/sync-all` (`referensi-kode.sync-all`)
     - `POST /referensi-kode/copy-year` (`referensi-kode.copy-year`)
2. **Perbarui [ReferensiKodeController.php](file:///c:/laragon/www/newSIKAS2/newSIKAS/app/Http/Controllers/ReferensiKodeController.php):**
   - `index()` kirim `activeYears`, `defaultYear`, `localStats`, `yearsWithTransactions`.
   - `fetch()`, `sync()`, `syncAll()`, `copyYear()` delegasikan ke `ReferensiKodeService`.
3. **Perbarui [KodeKegiatanController.php](file:///c:/laragon/www/newSIKAS2/newSIKAS/app/Http/Controllers/KodeKegiatanController.php), [RekeningBelanjaController.php](file:///c:/laragon/www/newSIKAS2/newSIKAS/app/Http/Controllers/RekeningBelanjaController.php), [KodeKegiatanImport.php](file:///c:/laragon/www/newSIKAS2/newSIKAS/app/Imports/KodeKegiatanImport.php), dan [RekeningBelanjaImport.php](file:///c:/laragon/www/newSIKAS2/newSIKAS/app/Imports/RekeningBelanjaImport.php):**
   - `index(Request $request)` filter berdasarkan `?year=` dan kirim `selectedYear`, `availableYears`, `statsPerYear`.
   - `store()` & `update()` wajibkan `tahun` dengan `Rule::unique(...)->where('tahun', $tahun)`.
   - `destroy()` cek `ReferensiKodeService::countUsage()` sebelum hapus; tolak dengan pesan error informatif jika masih dipakai.
   - `import()` teruskan `$tahun` ke constructor import; validasi duplikat scoped ke `$tahun`.
   - `copyYear()` untuk salin antar tahun dari UI Data Master.
4. **Perbarui [PenganggaranController.php](file:///c:/laragon/www/newSIKAS2/newSIKAS/app/Http/Controllers/PenganggaranController.php):**
   - `$canCreate = SekolahProfile::exists();` (soft-guard).
   - Kirim prop `referensi_stats_per_year` dari `ReferensiKodeService::getStatsPerYear()`.
5. **Perbarui [RkasController.php](file:///c:/laragon/www/newSIKAS2/newSIKAS/app/Http/Controllers/RkasController.php) & [RkasPerubahanController.php](file:///c:/laragon/www/newSIKAS2/newSIKAS/app/Http/Controllers/RkasPerubahanController.php):**
   - `index()`: filter `KodeKegiatan::forYear($tahun)` & `RekeningBelanja::forYear($tahun)`; kirim `has_referensi_kegiatan`, `has_referensi_rekening`, dan `referensi_prev_year` pada prop `anggaran`.
   - `store()`, `updateGroup()`, `updateRincianPencairan()`, serta padanan di `RkasPerubahanController`: validasi `kode_id` & `kode_rekening_id` dengan `Rule::exists(...)->where('tahun', $tahun)`.
   - `checkArkasRkas()`, `pullArkasRkas()`, `checkArkasRkasPerubahan()`, `pullArkasRkasPerubahan()`: panggil `$syncService->loadMasterMaps($tahun)` dan `validateMasterReferences($items, $kegiatanMap, $rekenings, $tahun)`.

### Tahap 5 — Frontend: Referensi Kode & Data Master (Filter Tahun & Salin Tahun)
1. **Perbarui [ArkasTools/ReferensiKode.tsx](file:///c:/laragon/www/newSIKAS2/newSIKAS/resources/js/Pages/ArkasTools/ReferensiKode.tsx):**
   - Integrasikan `ArkasYearSelect` (`includeAllOption={false}`) untuk memilih tahun aktif; hapus hardcode `2026`.
   - Reset hasil preview saat tahun diganti; sertakan tahun pada endpoint `fetch`, `sync`, dan nama file ekspor CSV.
   - Tampilkan tahun target + jaminan isolasi tahun lain di modal konfirmasi Sync, serta peringatan amber jika tahun terpilih ada di `yearsWithTransactions`.
2. **Perbarui [DataMaster/KodeKegiatan/Index.tsx](file:///c:/laragon/www/newSIKAS2/newSIKAS/resources/js/Pages/DataMaster/KodeKegiatan/Index.tsx), [KodeKegiatanModals.tsx](file:///c:/laragon/www/newSIKAS2/newSIKAS/resources/js/Pages/DataMaster/KodeKegiatan/Partials/KodeKegiatanModals.tsx), [DataMaster/RekeningBelanja/Index.tsx](file:///c:/laragon/www/newSIKAS2/newSIKAS/resources/js/Pages/DataMaster/RekeningBelanja/Index.tsx), & [RekeningBelanjaModals.tsx](file:///c:/laragon/www/newSIKAS2/newSIKAS/resources/js/Pages/DataMaster/RekeningBelanja/Partials/RekeningBelanjaModals.tsx):**
   - Tambah filter tahun di toolbar (reload Inertia `?year=...`) + opsi pilih/buat tahun baru.
   - Ikat form Tambah, Edit, dan Import Excel ke `selectedYear` (sertakan `tahun` di payload + badge tahun di modal).
   - Tambah tombol & modal **"Salin dari Tahun Lain"** (mode offline/manual).

### Tahap 6 — Frontend: Soft-Guard pada Modal Tambah Penganggaran & Halaman RKAS
1. **Perbarui [Penganggaran/Index.tsx](file:///c:/laragon/www/newSIKAS2/newSIKAS/resources/js/Pages/Penganggaran/Index.tsx):**
   - Terima prop `referensi_stats_per_year` dan kelola state lokalnya agar langsung ter-update setelah aksi cepat.
   - Di modal **Tambah Anggaran**, tampilkan kartu status referensi untuk `data.tahun_anggaran`:
     - Lengkap → pill hijau (`Referensi {tahun} siap: X kegiatan, Y rekening`).
     - Belum ada / belum lengkap → banner amber (soft-guard, tidak memblokir tombol Simpan) dengan tombol **"Tarik Referensi {tahun} dari ARKAS"** (`POST referensi-kode.sync-all`) dan **"Salin dari Tahun {prevYear}"** (`POST referensi-kode.copy-year`).
2. **Perbarui [Penganggaran/Rkas/Index.tsx](file:///c:/laragon/www/newSIKAS2/newSIKAS/resources/js/Pages/Penganggaran/Rkas/Index.tsx) (dan `RkasPerubahan` jika menggunakan halaman/komponen terpisah):**
   - Jika `anggaran.has_referensi_kegiatan === false` atau `anggaran.has_referensi_rekening === false`, tampilkan banner peringatan di bagian atas dengan tombol 1-klik **"Tarik Referensi {tahun} dari ARKAS"**, **"Salin dari Tahun {prevYear}"**, dan tautan ke menu **Referensi Kode**, lalu reload Inertia setelah sukses.

### Tahap 7 — Pengujian Otomatis, Migrasi Lokal & Quality Gates
1. **Buat `tests/Feature/ReferensiKodeVersioningTest.php`:**
   - Isolasi antar tahun pada semua varian (`reguler`, `kinerja`, `silpa`, `kinerja_silpa`): update/sync tahun 2026 tidak mengubah relasi RKAS/BKU tahun 2025.
   - Verifikasi migrasi remapping 2 tahun (2025 & 2026) mencakup seluruh tabel transaksi & anak BKU.
   - Proteksi hapus: tolak hapus kode terpakai, izinkan hapus kode kosong.
   - CRUD, Import Excel, `copyYear`, `ReferensiKodeController` (`fetch`, `sync`, `syncAll`, `copyYear`), dan validasi cross-year di `RkasController`.
   - `ArkasRkasSyncService` & `ArkasBkuSyncService` memakai master sesuai tahun anggaran.
2. **Jalankan Quality Gates:**
   - `vendor/bin/pint`
   - `composer test` (pastikan 100% test lama & baru hijau)
   - `npm run build` (`tsc && vite build`)
   - `php artisan migrate --force` pada PostgreSQL lokal `newSIKAS` + verifikasi data 2025 & 2026 pasca-migrasi (termasuk opsi Sync ulang 2025 & 2026 dari `arkas.db` agar teks PAUD/PKBM langsung bersih menjadi SMP!).
