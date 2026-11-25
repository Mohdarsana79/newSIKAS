# Spesifikasi Desain: Versioning Kode Kegiatan & Rekening Belanja Per Tahun Anggaran

- **Tanggal:** 2026-11-24
- **Status:** Draft untuk Review Pengguna
- **Lingkup:**
  - Database & Migrasi: `database/migrations/2026_11_24_000001_add_tahun_to_kode_kegiatans_and_rekening_belanjas_tables.php` *(baru)*
  - Engine Python ARKAS: [dump_reference.py](file:///c:/laragon/www/newSIKAS2/newSIKAS/storage/app/arkas_engine/dump_reference.py)
  - Models: [KodeKegiatan.php](file:///c:/laragon/www/newSIKAS2/newSIKAS/app/Models/KodeKegiatan.php), [RekeningBelanja.php](file:///c:/laragon/www/newSIKAS2/newSIKAS/app/Models/RekeningBelanja.php)
  - Services: `app/Services/ReferensiKodeService.php` *(baru)*, [ArkasRkasSyncService.php](file:///c:/laragon/www/newSIKAS2/newSIKAS/app/Services/ArkasRkasSyncService.php), [ArkasBkuSyncService.php](file:///c:/laragon/www/newSIKAS2/newSIKAS/app/Services/ArkasBkuSyncService.php), [CopilotService.php](file:///c:/laragon/www/newSIKAS2/newSIKAS/app/Services/Ai/CopilotService.php)
  - Controllers & Imports: [ReferensiKodeController.php](file:///c:/laragon/www/newSIKAS2/newSIKAS/app/Http/Controllers/ReferensiKodeController.php), [KodeKegiatanController.php](file:///c:/laragon/www/newSIKAS2/newSIKAS/app/Http/Controllers/KodeKegiatanController.php), [RekeningBelanjaController.php](file:///c:/laragon/www/newSIKAS2/newSIKAS/app/Http/Controllers/RekeningBelanjaController.php), [PenganggaranController.php](file:///c:/laragon/www/newSIKAS2/newSIKAS/app/Http/Controllers/PenganggaranController.php), [RkasController.php](file:///c:/laragon/www/newSIKAS2/newSIKAS/app/Http/Controllers/RkasController.php), [RkasPerubahanController.php](file:///c:/laragon/www/newSIKAS2/newSIKAS/app/Http/Controllers/RkasPerubahanController.php), [KodeKegiatanImport.php](file:///c:/laragon/www/newSIKAS2/newSIKAS/app/Imports/KodeKegiatanImport.php), [RekeningBelanjaImport.php](file:///c:/laragon/www/newSIKAS2/newSIKAS/app/Imports/RekeningBelanjaImport.php)
  - Routes & Seeder: [routes/variant.php](file:///c:/laragon/www/newSIKAS2/newSIKAS/routes/variant.php), [ReferensiKodeSeeder.php](file:///c:/laragon/www/newSIKAS2/newSIKAS/database/seeders/ReferensiKodeSeeder.php)
  - Frontend: [ReferensiKode.tsx](file:///c:/laragon/www/newSIKAS2/newSIKAS/resources/js/Pages/ArkasTools/ReferensiKode.tsx), [DataMaster/KodeKegiatan/Index.tsx](file:///c:/laragon/www/newSIKAS2/newSIKAS/resources/js/Pages/DataMaster/KodeKegiatan/Index.tsx), [DataMaster/RekeningBelanja/Index.tsx](file:///c:/laragon/www/newSIKAS2/newSIKAS/resources/js/Pages/DataMaster/RekeningBelanja/Index.tsx), [Penganggaran/Index.tsx](file:///c:/laragon/www/newSIKAS2/newSIKAS/resources/js/Pages/Penganggaran/Index.tsx), [Penganggaran/Rkas/Index.tsx](file:///c:/laragon/www/newSIKAS2/newSIKAS/resources/js/Pages/Penganggaran/Rkas/Index.tsx)
  - Pengujian: `tests/Feature/ReferensiKodeVersioningTest.php` *(baru)*

---

## 1. Latar Belakang & Permasalahan

Setiap tahun anggaran, Kemendikdasmen/ARKAS memperbarui daftar **Kode Kegiatan** (`ref_kode`) dan berpotensi memperbarui **Rekening Belanja** (`ref_rekening`) — baik berupa penambahan kode baru, penghapusan kode lama, maupun **perubahan makna/uraian pada nomor kode yang sama** (misalnya di `arkas.db` SMP 2025 → 2026: `03.01.01.` berubah dari *PPDB* menjadi *PMB*, `04.06.06.` berubah dari *Workshop pengelolaan kelas bagi guru* menjadi *Peningkatan Kompetensi Kepala Sekolah*, serta 234 kode hilang dan 13 kode baru).

Pada struktur `newSIKAS` saat ini ditemukan empat masalah inti:

1. **Tabel master global tanpa kolom `tahun`:** `kode_kegiatans` (`UNIQUE (kode)`) dan `rekening_belanjas` (`UNIQUE (kode_rekening)`) digunakan bersama oleh seluruh tahun anggaran pada 4 varian (`reguler`, `kinerja`, `silpa`, `kinerja_silpa`) melalui 40 *foreign key* di 20 tabel transaksi. Saat sinkronisasi tahun baru dijalankan, baris lama ditimpa (`UPDATE`), sehingga RKAS, RKAS Perubahan, BKU, Kwitansi, Tanda Terima, dan seluruh laporan PDF/Excel tahun sebelumnya ikut berubah.
2. **Tahun di-hardcode `2026` & bug sync rekening:** [ReferensiKode.tsx](file:///c:/laragon/www/newSIKAS2/newSIKAS/resources/js/Pages/ArkasTools/ReferensiKode.tsx#L64) selalu mengirim `year=2026`, dan [ReferensiKodeController.php](file:///c:/laragon/www/newSIKAS2/newSIKAS/app/Http/Controllers/ReferensiKodeController.php#L255-L268) belum memperbarui `rincian_objek` saat nama rekening berubah.
3. **Bug lintas jenjang & baris kadaluarsa di `dump_reference.py`:** Query `SELECT DISTINCT id_kode, uraian_kode FROM ref_kode WHERE tahun = ?` tidak memfilter `bentuk_pendidikan_id` milik sekolah, tidak memfilter `sumber_dana_id` BOSP, dan tidak memprioritaskan `expired_date IS NULL`. Akibatnya teks jenjang PAUD/PKBM (seperti *"pembelajaran dan bermain"*, *"Forum Tutor/PKBM/SKB"*, *"ujian modul"*) menimpa teks jenjang SMP/SD/SMA/SMK.
4. **Risiko `ON DELETE CASCADE`:** Relasi FK pada `rkas`, `rkas_perubahans`, `kwitansis`, dan `tanda_terimas` (×4 varian) menggunakan `ON DELETE CASCADE`, sehingga menghapus kode di Data Master dapat menghapus transaksi historis secara diam-diam.

---

## 2. Keputusan Arsitektur (Opsi B)

Kita mengadopsi pola **versioning per `tahun`** yang identik dengan `ref_barangs` (Katalog Barang ARKAS) dan skema asli `arkas.db`:

- Kunci unik master menjadi **`(kode, tahun)`** pada `kode_kegiatans` dan **`(kode_rekening, tahun)`** pada `rekening_belanjas`.
- Karena semua tabel transaksi (20 tabel, 40 FK) dan seluruh laporan/Blade PDF membaca melalui `id` integer (`$item->kodeKegiatan`, `$item->rekeningBelanja`), setiap tahun anggaran memiliki baris `id` tersendiri sehingga **seluruh laporan, PDF, Excel, Kwitansi, Tanda Terima, Cetak SPJ, dan Portal Transparansi otomatis menampilkan teks sesuai tahunnya tanpa mengubah template Blade**.
- Kode kegiatan antar sumber dana BOSP (`sumber_dana_id IN (1, 12, 33, 35)`) telah diverifikasi di `arkas.db` **tidak berkonflik** jika difilter per `bentuk_pendidikan_id` dan `expired_date IS NULL`, sehingga 1 tabel `kode_kegiatans` berversi `tahun` cukup melayani semua 4 varian.

---

## 3. Desain Database & Migrasi Aman

### 3.1 Perubahan Skema (`2026_11_24_000001_add_tahun_to_kode_kegiatans_and_rekening_belanjas_tables.php`)

1. Tambah kolom `tahun` (`unsignedSmallInteger`, `nullable` sementara) dan index pada:
   - `kode_kegiatans.tahun`
   - `rekening_belanjas.tahun`
2. Hapus unique constraint lama (`kode_kegiatans_kode_unique`, `rekening_belanjas_kode_rekening_unique`) dan buat composite unique constraint baru:
   - `kode_kegiatans`: `UNIQUE (kode, tahun)` (`kode_kegiatans_kode_tahun_unique`)
   - `rekening_belanjas`: `UNIQUE (kode_rekening, tahun)` (`rekening_belanjas_kode_rekening_tahun_unique`)

### 3.2 Migrasi Data Existing (Offline-Safe, Tanpa Ketergantungan `arkas.db`)

Dijalankan dalam `DB::transaction()` agar atomik dan aman saat update aplikasi/installer di PC lokal maupun VPS:

1. Kumpulkan seluruh `tahun_anggaran` unik (integer, urut menurun) dari 4 tabel penganggaran yang tersedia:
   - `penganggarans`, `kinerja_penganggarans`, `silpa_penganggarans`, `kinerja_silpa_penganggarans`.
2. **Kasus kosong** (belum ada penganggaran):
   - Set `tahun = (int) date('Y')` pada seluruh baris existing `kode_kegiatans` dan `rekening_belanjas`.
3. **Kasus ada 1 tahun** (`[$year]`):
   - Set `tahun = $year` pada seluruh baris existing `kode_kegiatans` dan `rekening_belanjas`. Tidak perlu kloning.
4. **Kasus ada ≥ 2 tahun** (mis. `[2026, 2025]`):
   - Tetapkan `$latestYear = max($years)` (mis. `2026`). Set `tahun = $latestYear` pada seluruh baris existing (ID tetap dipertahankan untuk tahun terbaru).
   - Untuk setiap tahun lebih lama (`$year` di `$years` selain `$latestYear`, mis. `2025`):
     - Kloning seluruh baris `kode_kegiatans` milik `$latestYear` dengan `tahun = $year`, simpan peta `$kegMap[$oldId] = $newId`.
     - Kloning seluruh baris `rekening_belanjas` milik `$latestYear` dengan `tahun = $year`, simpan peta `$rekMap[$oldId] = $newId`.
     - Remap seluruh FK milik penganggaran bertahun `$year` pada 4 varian ke `$newId`:
       - Tabel dengan FK penganggaran langsung:
         - `rkas` / `kinerja_rkas` / `silpa_rkas` / `kinerja_silpa_rkas`: `kode_id`, `kode_rekening_id`
         - `rkas_perubahans` / `kinerja_rkas_perubahans`: `kode_id`, `kode_rekening_id`
         - `buku_kas_umums` / `kinerja_buku_kas_umums` / `silpa_buku_kas_umums` / `kinerja_silpa_buku_kas_umums`: `kode_kegiatan_id`, `rekening_belanja_id`
         - `kwitansis` / `kinerja_kwitansis` / `silpa_kwitansis` / `kinerja_silpa_kwitansis`: `kode_kegiatan_id`, `kode_rekening_id`
         - `tanda_terimas` / `kinerja_tanda_terimas` / `silpa_tanda_terimas` / `kinerja_silpa_tanda_terimas`: `kode_kegiatan_id`, `kode_rekening_id`
       - Tabel anak BKU (difilter via daftar `id` BKU milik penganggaran bertahun `$year`):
         - `buku_kas_umum_uraian_details` / `kinerja_buku_kas_umum_uraian_details` / `silpa_buku_kas_umum_uraian_details` / `kinerja_silpa_buku_kas_umum_uraian_details`: `kode_kegiatan_id`, `rekening_belanja_id`
5. Setelah backfill selesai, ubah kolom `tahun` menjadi `NOT NULL` (pada driver PostgreSQL menggunakan `ALTER TABLE ... ALTER COLUMN tahun SET NOT NULL`; pada SQLite cukup default non-null sejak definisi kolom).

### 3.3 Penguatan Constraint FK (`ON DELETE CASCADE` → `ON DELETE RESTRICT`)

- Khusus pada driver PostgreSQL (`DB::getDriverName() === 'pgsql'`), ubah FK yang menunjuk ke `kode_kegiatans(id)` dan `rekening_belanjas(id)` pada tabel `*_rkas`, `*_rkas_perubahans`, `*_kwitansis`, dan `*_tanda_terimas` dari `ON DELETE CASCADE` menjadi `ON DELETE RESTRICT`.
- Proteksi di level aplikasi (`ReferensiKodeService::countUsage()`) berlaku untuk **semua** driver database (PostgreSQL maupun SQLite pada PHPUnit) dan menampilkan pesan error ramah.

---

## 4. Desain Engine ARKAS (`storage/app/arkas_engine/dump_reference.py`)

### 4.1 Mode Baru: `years`
- Pemanggilan: `python.exe dump_reference.py years ALL [manual_db_path]`
- Query:
  ```sql
  SELECT DISTINCT tahun FROM (
      SELECT tahun FROM ref_kode WHERE tahun IS NOT NULL
      UNION
      SELECT tahun FROM ref_rekening WHERE tahun IS NOT NULL
  ) ORDER BY tahun DESC
  ```
- Output JSON: `{"status": "success", "years": ["2027", "2026", "2025", "2024"], "db_path": "..."}`.

### 4.2 Perbaikan Query `kegiatan`
1. Deteksi jenjang sekolah dari `mst_sekolah`:
   ```sql
   SELECT bentuk_pendidikan_id
   FROM mst_sekolah
   WHERE soft_delete = 0 AND bentuk_pendidikan_id IS NOT NULL
   ORDER BY last_update DESC
   LIMIT 1
   ```
2. Query `ref_kode` pada `tahun = ?` dengan penyaringan bertingkat:
   - Prioritas utama: `WHERE tahun = ? AND bentuk_pendidikan_id = ? AND sumber_dana_id IN (1, 12, 33, 35)`
   - Fallback 1 (jika 0 baris): `WHERE tahun = ? AND bentuk_pendidikan_id = ?`
   - Fallback 2 (jika `bentuk_pendidikan_id` tidak ditemukan / tetap 0 baris): `WHERE tahun = ? AND sumber_dana_id IN (1, 12, 33, 35)` lalu `WHERE tahun = ?`.
3. Urutan prioritas deduplikasi untuk setiap `id_kode`:
   ```sql
   ORDER BY
       id_kode ASC,
       CASE WHEN expired_date IS NULL OR TRIM(expired_date) = '' THEN 0 ELSE 1 END ASC,
       CASE WHEN sumber_dana_id = 1 THEN 0 ELSE 1 END ASC,
       last_update DESC
   ```
   Dengan menyimpan **baris pertama** yang ditemui untuk setiap `id_kode` (bukan menimpa dengan baris terakhir!), maka:
   - Baris aktif (`expired_date IS NULL`) selalu menang atas baris kadaluarsa.
   - Teks BOS Reguler (`sumber_dana_id = 1`) diprioritaskan untuk kode bersama, sementara kode khusus Kinerja/SiLPA (`12, 33, 35`) tetap masuk utuh.
   - `program` (`parts[0] + '.'`) dan `sub_program` (`parts[0] + '.' + parts[1] + '.'`) selalu merujuk pada jenjang sekolah yang tepat (tidak lagi tercampur PAUD/PKBM).
4. Output JSON menyertakan `bentuk_pendidikan_id` untuk informasi transparansi di UI/log.

### 4.3 Query `rekening`
- Tetap query `ref_rekening WHERE tahun = ? ORDER BY kode_rekening` (filter leaf `len(parts) >= 6`), mengembalikan `kode_rekening`, `rekening`, dan 5 flag pajak (`is_ppn`, `is_pph21`, `is_pph22`, `is_pph23`, `is_pph4`).

---

## 5. Desain Layanan & Backend Laravel

### 5.1 Service Terpusat: `App\Services\ReferensiKodeService`

Satu modul terpusat yang dipakai bersama oleh `ReferensiKodeController`, `KodeKegiatanController`, `RekeningBelanjaController`, dan `PenganggaranController`:

| Metode | Tanggung Jawab |
| :--- | :--- |
| `normalizeKodeKegiatan(string $kode): string` | Menghapus spasi & titik di akhir (`rtrim(trim($kode), '.')`) untuk pencocokan konsisten (`08.04.13` vs `08.04.13.`). |
| `resolveActiveYears(bool $includeArkas = false): array` | Menggabungkan tahun dari `kode_kegiatans`, `rekening_belanjas`, 4 tabel penganggaran, `date('Y')`, dan (opsional) `dump_reference.py years`. Urut menurun (`DESC`). |
| `getStatsPerYear(): array` | Mengembalikan peta `tahun => ['kegiatan' => int, 'rekening' => int]` untuk badge UI dan soft-guard modal Penganggaran. |
| `getYearsWithTransactions(): array` | Mengembalikan daftar tahun yang sudah memiliki minimal 1 baris di `rkas`, `rkas_perubahans`, atau `buku_kas_umums` pada salah satu dari 4 varian. |
| `countUsage(string $tipe, int $id): int` | Menghitung total pemakaian ID master pada seluruh 20 tabel transaksi (4 varian). Digunakan sebelum `destroy()`. |
| `fetchArkasComparison(string $tipe, int $year): array` | Menjalankan `dump_reference.py`, membandingkan dengan master `where('tahun', $year)` saja, memberi status `Data Baru` / `Perlu Update` / `Sudah Ada`. Untuk `rekening`, turut membandingkan `rincian_objek`. |
| `syncFromArkas(string $tipe, int $year): array` | Insert & Update ketat hanya pada `where('tahun', $year)`. Normalisasi trailing dot saat pencocokan `kegiatan` agar kode existing tanpa titik (mis. `08.04.13`) di-update daripada dibuat duplikat. Pada `rekening`, turut meng-update `rincian_objek`. Mengembalikan `synced`, `updated`, `message`. |
| `copyFromYear(string $tipe, int $sourceYear, int $targetYear): array` | Menyalin seluruh baris `kode_kegiatans` dan/atau `rekening_belanjas` (mendukung `tipe = 'kegiatan' | 'rekening' | 'both'`) dari `$sourceYear` ke `$targetYear` (melewati kode yang sudah ada di `$targetYear`). |

### 5.2 Model Updates
- **[KodeKegiatan.php](file:///c:/laragon/www/newSIKAS2/newSIKAS/app/Models/KodeKegiatan.php)**: tambah `'tahun'` di `$fillable`, cast `'tahun' => 'integer'`, dan `scopeForYear($query, int $tahun)`.
- **[RekeningBelanja.php](file:///c:/laragon/www/newSIKAS2/newSIKAS/app/Models/RekeningBelanja.php)**: tambah `'tahun'` di `$fillable`, cast `'tahun' => 'integer'`, dan `scopeForYear($query, int $tahun)`.

### 5.3 Routes Baru di [routes/variant.php](file:///c:/laragon/www/newSIKAS2/newSIKAS/routes/variant.php)
Ditambahkan sebelum `Route::resource(...)` terkait agar tidak tertangkap parameter `{id}`:
- `POST /kode-kegiatan/copy-year` → `KodeKegiatanController@copyYear` (`name: kode-kegiatan.copy-year`)
- `POST /rekening-belanja/copy-year` → `RekeningBelanjaController@copyYear` (`name: rekening-belanja.copy-year`)
- `POST /referensi-kode/sync-all` → `ReferensiKodeController@syncAll` (`name: referensi-kode.sync-all`) — sinkronisasi sekaligus `kegiatan` + `rekening` untuk 1 tahun (dipakai aksi cepat 1-klik di modal Penganggaran & banner RKAS).
- `POST /referensi-kode/copy-year` → `ReferensiKodeController@copyYear` (`name: referensi-kode.copy-year`) — salin sekaligus `kegiatan` + `rekening` dari tahun sebelumnya (dipakai aksi cepat offline/manual di modal Penganggaran & banner RKAS).

Semua route memakai prefix nama yang sudah terdaftar di `PermissionCatalog` (`kode-kegiatan.*`, `rekening-belanja.*`, `referensi-kode.*`), sehingga RBAC otomatis konsisten di 4 varian.

### 5.4 Pembaruan Controller & Service Terdampak

1. **[ReferensiKodeController.php](file:///c:/laragon/www/newSIKAS2/newSIKAS/app/Http/Controllers/ReferensiKodeController.php)**:
   - `index()`: kirim `activeYears`, `defaultYear`, `localStats` (`perYear`), dan `yearsWithTransactions`.
   - `fetch()` & `sync()`: validasi `year` (`required|digits:4|integer|min:2000|max:2100`), delegasikan ke `ReferensiKodeService`.
   - `syncAll()` & `copyYear()`: endpoint JSON untuk aksi cepat di Penganggaran & RKAS.
2. **[KodeKegiatanController.php](file:///c:/laragon/www/newSIKAS2/newSIKAS/app/Http/Controllers/KodeKegiatanController.php)** & **[RekeningBelanjaController.php](file:///c:/laragon/www/newSIKAS2/newSIKAS/app/Http/Controllers/RekeningBelanjaController.php)**:
   - `index(Request $request)`: terima query `?year=...` (default tahun terbaru yang tersedia), kembalikan data khusus tahun terpilih + `selectedYear`, `availableYears`, `statsPerYear`.
   - `store()` & `update()`: wajib terima `tahun` (`required|digits:4|integer`), aturan `Rule::unique(...)->where('tahun', $tahun)` (mengecualikan `$id` saat update).
   - `destroy()`: cek `ReferensiKodeService::countUsage()`; jika `> 0`, batalkan penghapusan dan kembalikan `redirect()->back()->with('error', "Tidak dapat dihapus karena masih digunakan oleh {$usageCount} data RKAS/BKU/Kwitansi/Tanda Terima pada tahun {$tahun}.")`.
   - `import()`: terima input `tahun` dari form import dan teruskan ke `KodeKegiatanImport($tahun)` / `RekeningBelanjaImport($tahun)` yang memvalidasi & menyimpan unik per `(kode, tahun)`.
   - `copyYear()`: salin dari `source_year` ke `target_year`.
3. **[PenganggaranController.php](file:///c:/laragon/www/newSIKAS2/newSIKAS/app/Http/Controllers/PenganggaranController.php)**:
   - `index()`:
     - Ubah `$canCreate = SekolahProfile::exists();` (soft-guard: tidak lagi memblokir tombol tambah penganggaran jika master kosong).
     - Kirim prop tambahan `referensi_stats_per_year` (dari `ReferensiKodeService::getStatsPerYear()`).
4. **[RkasController.php](file:///c:/laragon/www/newSIKAS2/newSIKAS/app/Http/Controllers/RkasController.php)** & **[RkasPerubahanController.php](file:///c:/laragon/www/newSIKAS2/newSIKAS/app/Http/Controllers/RkasPerubahanController.php)**:
   - `index()`:
     - `$tahun = (int) $penganggaran->tahun_anggaran;`
     - `$kodeKegiatans = KodeKegiatan::forYear($tahun)->orderBy('kode')->get();`
     - `$rekeningBelanjas = RekeningBelanja::forYear($tahun)->orderBy('kode_rekening')->get();`
     - Kirim flag `has_referensi_kegiatan`, `has_referensi_rekening`, dan `referensi_prev_year` (tahun terdekat sebelumnya yang memiliki referensi) untuk soft-guard banner di halaman RKAS.
   - `store()` / `update()`: validasi `kode_id` dan `kode_rekening_id` dengan `Rule::exists('kode_kegiatans', 'id')->where('tahun', $tahun)` dan `Rule::exists('rekening_belanjas', 'id')->where('tahun', $tahun)`.
   - `checkArkasRkas()` / `pullArkasRkas()` / `checkArkasRkasPerubahan()` / `pullArkasRkasPerubahan()`: panggil `$syncService->loadMasterMaps($tahun)`.
5. **[ArkasRkasSyncService.php](file:///c:/laragon/www/newSIKAS2/newSIKAS/app/Services/ArkasRkasSyncService.php)**:
   - `loadMasterMaps(int $tahun)`: filter `KodeKegiatan::forYear($tahun)` & `RekeningBelanja::forYear($tahun)`.
   - `validateMasterReferences(..., ?int $tahun = null)`: sebutkan tahun spesifik pada pesan error jika referensi belum disinkronkan.
6. **[ArkasBkuSyncService.php](file:///c:/laragon/www/newSIKAS2/newSIKAS/app/Services/ArkasBkuSyncService.php)**:
   - Preload `KodeKegiatan::forYear($tahun)->get()` dan `RekeningBelanja::forYear($tahun)->get()`.
7. **[CopilotService.php](file:///c:/laragon/www/newSIKAS2/newSIKAS/app/Services/Ai/CopilotService.php)**:
   - Pada fungsi rekomendasi kode kegiatan/rekening belanja, filter ke tahun yang diminta (atau `max(tahun)` yang tersedia di tabel) agar rekomendasi tidak menggandakan kode dari berbagai tahun.
8. **[ReferensiKodeSeeder.php](file:///c:/laragon/www/newSIKAS2/newSIKAS/database/seeders/ReferensiKodeSeeder.php)**:
   - Sertakan `'tahun' => 2026` dengan pencocokan `where('kode', $kode)->where('tahun', 2026)` dan `where('kode_rekening', $kode)->where('tahun', 2026)`.

---

## 6. Desain UI / UX

### 6.1 [ArkasTools/ReferensiKode.tsx](file:///c:/laragon/www/newSIKAS2/newSIKAS/resources/js/Pages/ArkasTools/ReferensiKode.tsx)
- Tambahkan pemilih tahun menggunakan komponen `ArkasYearSelect` (konsisten dengan [ArkasTools/Index.tsx](file:///c:/laragon/www/newSIKAS2/newSIKAS/resources/js/Pages/ArkasTools/Index.tsx)) di samping tab `Kode Kegiatan` / `Rekening Belanja`.
- Hapus hardcode `year=2026`; semua panggilan `fetch`, `sync`, dan nama file `Export CSV` menyertakan tahun aktif (`Referensi_Kegiatan_ARKAS_2027.csv`).
- Saat user mengganti tahun, kosongkan state tabel lama (atau tampilkan prompt klik *Tarik Data* untuk tahun baru) agar data antar tahun tidak tertukar.
- Pada **Modal Konfirmasi Sync**:
  - Tampilkan tahun target secara menonjol (mis. *"Sinkronisasi Referensi Kode Kegiatan Tahun **2025**"*).
  - Tampilkan jaminan: *"Data tahun anggaran lain tidak akan berubah."*
  - Jika tahun terpilih ada dalam `yearsWithTransactions`, tampilkan kotak peringatan amber: *"Tahun {year} sudah memiliki data RKAS/BKU. Sinkronisasi ini akan menambahkan kode baru dan memperbarui uraian referensi khusus untuk tahun {year}."*

### 6.2 [DataMaster/KodeKegiatan/Index.tsx](file:///c:/laragon/www/newSIKAS2/newSIKAS/resources/js/Pages/DataMaster/KodeKegiatan/Index.tsx) & [DataMaster/RekeningBelanja/Index.tsx](file:///c:/laragon/www/newSIKAS2/newSIKAS/resources/js/Pages/DataMaster/RekeningBelanja/Index.tsx)
- Tambahkan dropdown **Filter Tahun** di toolbar (navigasi Inertia `?year=...`, mendukung input/pilihan tahun baru juga) serta badge tahun di header.
- Kartu ringkas (Total Kode, Program/Kategori, dll.) otomatis mencerminkan tahun yang dipilih.
- Form Tambah, Edit, dan Import Excel otomatis mengikat ke `selectedYear` (tampilkan badge *"Untuk Tahun {selectedYear}"* di modal).
- Tambahkan tombol **"Salin dari Tahun Lain"** dengan modal pilih `Tahun Sumber` → `Tahun Tujuan` (berguna untuk mode manual/offline).
- Jika penghapusan ditolak karena kode masih digunakan transaksi, tampilkan flash error jelas di halaman.

### 6.3 [Penganggaran/Index.tsx](file:///c:/laragon/www/newSIKAS2/newSIKAS/resources/js/Pages/Penganggaran/Index.tsx) (Soft-Guard di Modal Tambah Penganggaran)
- Saat user mengisi/mengubah field `tahun_anggaran` (4 digit valid) pada modal **Tambah Anggaran**:
  - Cek `referensi_stats_per_year[tahun]`.
  - **Jika sudah lengkap** (`kegiatan > 0 && rekening > 0`): tampilkan pill status hijau ringkas (`Referensi {tahun} siap: {N} kegiatan, {M} rekening`).
  - **Jika belum ada / tidak lengkap**: tampilkan banner peringatan lembut (tidak memblokir tombol Simpan) dengan 2 aksi cepat inline:
    1. **"Tarik Referensi {tahun} dari ARKAS"** (memanggil `POST referensi-kode.sync-all` untuk tahun tsb, lalu memperbarui status secara langsung tanpa menutup modal; tombol dinonaktifkan / diberi keterangan jika `arkasStatus.exists === false`).
    2. **"Salin dari Tahun {prevYear}"** (jika ada tahun sebelumnya yang sudah punya referensi; memanggil `POST referensi-kode.copy-year`).

### 6.4 [Penganggaran/Rkas/Index.tsx](file:///c:/laragon/www/newSIKAS2/newSIKAS/resources/js/Pages/Penganggaran/Rkas/Index.tsx) (Soft-Guard di Halaman RKAS)
- Jika `anggaran.has_referensi_kegiatan === false` atau `anggaran.has_referensi_rekening === false`:
  - Tampilkan banner peringatan di bagian atas halaman RKAS: *"Referensi Kode Kegiatan / Rekening Belanja untuk Tahun {tahun} belum tersedia."*
  - Sediakan tombol cepat **"Tarik Referensi {tahun} dari ARKAS"**, **"Salin dari Tahun {prevYear}"**, dan tautan ke halaman **Referensi Kode**.

---

## 7. Penanganan Error & Edge Cases

1. **Database ARKAS tidak ditemukan / belum diunggah (mode VPS / offline):**
   - `ReferensiKodeService::resolveActiveYears()` tetap bekerja normal memakai tahun lokal + `date('Y')` tanpa error.
   - Tombol *"Tarik dari ARKAS"* menampilkan pesan error ramah, sementara *"Salin dari Tahun Lain"*, *Import Excel*, dan *Tambah Manual* tetap 100% berfungsi.
2. **Kode existing tanpa titik di akhir (`08.04.13` vs `08.04.13.`):**
   - Saat sync ARKAS, pencocokan dilakukan memakai `normalizeKodeKegiatan()` sehingga baris lama (`08.04.13`) diperbarui *in-place* (menjaga ID & FK) daripada menciptakan duplikat baru.
3. **Duplikat saat *Salin dari Tahun Lain*:**
   - Bersifat idempoten: jika tahun tujuan sudah memiliki sebagian kode, hanya kode yang belum ada yang disalin (tidak error, tidak menimpa).
4. **Hapus kode yang sudah dipakai di BKU / RKAS / Kwitansi / Tanda Terima:**
   - Ditolak di controller sebelum query `DELETE` dengan jumlah referensi yang jelas; dilindungi pula oleh `ON DELETE RESTRICT` di PostgreSQL.
5. **Kompatibilitas 4 Varian:**
   - Semua route, migrasi remapping FK, pengecekan `countUsage()`, dan soft-guard Penganggaran/RKAS beroperasi pada `reguler`, `kinerja`, `silpa`, dan `kinerja_silpa`.

---

## 8. Rencana Verifikasi & Pengujian

1. **Automated PHPUnit (`composer test`):** `tests/Feature/ReferensiKodeVersioningTest.php` mencakup:
   - Isolasi antar tahun: sync/update `kode_kegiatans` & `rekening_belanjas` tahun 2026 tidak mengubah relasi `$rkas2025->kodeKegiatan` & `$rkas2025->rekeningBelanja` pada semua varian.
   - Remapping migrasi: skenario 2 tahun (2025 & 2026) menghasilkan baris master terpisah dan FK seluruh tabel (`rkas`, `rkas_perubahans`, `bku`, `bku_uraian_details`, `kwitansis`, `tanda_terimas`) menunjuk ke tahun yang benar.
   - Proteksi hapus: menolak hapus kode yang dipakai di RKAS/BKU/Kwitansi/Tanda Terima dan mengizinkan hapus kode yang tidak terpakai.
   - CRUD Data Master, Import Excel, dan Salin antar tahun (`copyYear`) menghormati unique key `(kode, tahun)` / `(kode_rekening, tahun)`.
   - `ReferensiKodeController` (`fetch`, `sync`, `syncAll`, `copyYear`) terisolasi per tahun dan memperbarui `rincian_objek` rekening.
   - `ArkasRkasSyncService` & `ArkasBkuSyncService` me-resolve master sesuai tahun anggaran target.
   - `RkasController` menolak `kode_id` / `kode_rekening_id` milik tahun yang berbeda dari `penganggaran->tahun_anggaran`.
2. **Verifikasi Engine Python terhadap `arkas.db` lokal:**
   - Uji `dump_reference.py years ALL`, `dump_reference.py kegiatan 2025`, `dump_reference.py kegiatan 2026`, `dump_reference.py kegiatan 2027` — pastikan teks jenjang SMP bersih dari teks PAUD/PKBM dan `03.03.07.` / `03.03.08.` tahun 2025 mengambil baris aktif (`expired_date IS NULL`).
3. **Verifikasi Frontend & TypeScript:**
   - Jalankan `npm run build` (`tsc && vite build`) tanpa error tipe TypeScript.
   - Jalankan `vendor/bin/pint --test` pada file PHP yang berubah.
