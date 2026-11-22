# Spesifikasi Desain: Cek Penerimaan Dana dari ARKAS & Penyembunyian Tombol Tambah Tahap Berikutnya

- **Tanggal:** 2026-11-22
- **Status:** Draft untuk Review Pengguna
- **Lingkup:**
  - Engine Python ARKAS: `storage/app/arkas_engine/check_penerimaan.py` *(baru)*
  - Backend: [routes/variant.php](file:///c:/laragon/www/newSIKAS2/newSIKAS/routes/variant.php), [PenerimaanDanaController.php](file:///c:/laragon/www/newSIKAS2/newSIKAS/app/Http/Controllers/PenerimaanDanaController.php), [PenatausahaanController.php](file:///c:/laragon/www/newSIKAS2/newSIKAS/app/Http/Controllers/PenatausahaanController.php)
  - Frontend: [Penatausahaan/Index.tsx](file:///c:/laragon/www/newSIKAS2/newSIKAS/resources/js/Pages/Penatausahaan/Index.tsx) *(Modal Penerimaan Dana)*
  - Pengujian: `tests/Feature/PenerimaanDanaArkasCheckTest.php` *(baru)*
  - Tanpa perubahan skema database PostgreSQL maupun migrasi.

---

## 1. Tujuan & Perubahan Perilaku

1. **Cek Penerimaan Dana dari ARKAS:**
   - Menambahkan kemampuan pengecekan data penerimaan dana dari database ARKAS (`arkas.db`) langsung di dalam **Modal Penerimaan Dana** untuk seluruh 4 varian BOSP (`reguler`, `kinerja`, `silpa`, `kinerja_silpa`).
   - Membaca gabungan data dari `kas_umum` (`id_ref_bku = 2`, *Terima Dana BOS*) + *fallback* tabel `salur` (`tidak_terima_dana = 0`) + saldo awal Januari (`id_ref_bku IN (8, 9)` atau `IN (28, 29)` untuk SiLPA).
   - Di **List View** modal: menampilkan daftar item penerimaan yang ditemukan di ARKAS (Tanggal Terima, Jumlah Dana, Saldo Awal bila ada, asal data BKU/Salur), dengan tombol **"Isi ke Form"** untuk tahap yang belum tercatat di SIKAS dan badge **"Sudah Tercatat"** untuk tahap yang sudah tercatat (tetap bermanfaat untuk verifikasi angka).
   - Di **Form View** modal: tersedia tombol **"Cek dari ARKAS"** di dalam Panel 1 untuk mengisi otomatis `tanggal_terima`, `jumlah_dana`, serta `saldo_awal` + `tanggal_saldo_awal` (khusus Tahap 1 bila ada) sesuai sumber dana yang dipilih (atau otomatis memilih tahap ARKAS pertama yang belum tercatat jika dropdown belum dipilih).
2. **Sembunyikan Tombol "Tambah Penerimaan Tahap Berikutnya" Saat Lengkap:**
   - Pada varian 2 tahap (`reguler`, `kinerja`): bila penerimaan **Tahap 2** (`VariantConfig::sumberDanaTahap2`) sudah tercatat, **sembunyikan** tombol *"Tambah Penerimaan Tahap Berikutnya"*.
   - Pada seluruh varian (termasuk varian 1 tahap `silpa`, `kinerja_silpa`): bila **seluruh** opsi `sumberDanaOptions` sudah tercatat, **sembunyikan** tombol *"Tambah Penerimaan Tahap Berikutnya"*.
   - Gantikan tombol Tambah tersebut dengan **banner info hijau ringkas** (*"Seluruh penerimaan dana pada tahun ini sudah tercatat."*), sementara tombol **"Cek dari ARKAS"** tetap tersedia untuk verifikasi terhadap ARKAS.
   - Di dropdown `Sumber Dana` pada Form View, nonaktifkan opsi yang sudah tercatat (`disabled`) dengan label tambahan `(Sudah tercatat)` agar bebas input ganda.

---

## 2. Desain Engine ARKAS & Backend

### 2.1 Skrip Python `storage/app/arkas_engine/check_penerimaan.py`
Argumen CLI: `python.exe check_penerimaan.py <tahun> <sumber_dana_id> [manual_db_path]`
Menggunakan dekripsi SQLCipher 4 read-only (`SELECT`) yang sama dengan skrip ARKAS lainnya.

Langkah query:
1. Ambil `nama_sumber_dana` dari `ref_sumber_dana` untuk `sumber_dana_id`.
2. Ambil seluruh `id_anggaran` dari `anggaran` untuk `(tahun_anggaran = tahun, id_ref_sumber_dana = sumber_dana_id, soft_delete = 0)`.
3. **Penerimaan dari BKU (`kas_umum`):**
   - Jika `id_anggaran` ada, query:
     ```sql
     SELECT k.id_kas_umum, k.tanggal_transaksi, k.uraian, k.saldo
     FROM kas_umum k
     WHERE k.id_anggaran IN (...)
       AND k.id_ref_bku = 2
       AND k.soft_delete = 0
       AND k.tanggal_transaksi LIKE '{tahun}-%'
     ORDER BY k.tanggal_transaksi ASC, k.create_date ASC
     ```
   - Deteksi nomor tahap (`1` atau `2`) dari `uraian` (regex `tahap\s*([12])`, fallback berdasarkan bulan: bulan `<= 6` → `1`, bulan `>= 7` → `2` bila sumber dana bertahap `id_ref_sumber_dana IN (1, 12)`).
   - Deduplikasi aman bila beberapa revisi anggaran berbagi baris identik `(tahap, tanggal_transaksi, saldo)`.
4. **Pelengkap dari `salur`:**
   - Query tabel `salur`:
     ```sql
     SELECT tahap, nilai_salur_bersih, tanggal_disetujui, pengurang_silpa
     FROM salur
     WHERE tahun = ?
       AND id_ref_sumber_dana = ?
       AND COALESCE(tidak_terima_dana, 0) = 0
       AND COALESCE(nilai_salur_bersih, 0) > 0
     ORDER BY tahap ASC, gelombang ASC
     ```
   - Untuk setiap `tahap` di `salur` yang **belum** ditemukan pada hasil `kas_umum`, tambahkan sebagai item dengan `source: "salur"`.
5. **Saldo Awal Januari (`kas_umum`):**
   - Untuk `id_ref_sumber_dana IN (33, 35)` (SiLPA) gunakan `id_ref_bku IN (28, 29)`, selainnya `id_ref_bku IN (8, 9)`, pada `tanggal_transaksi LIKE '{tahun}-01-%'` (diprioritaskan `tanggal_transaksi = '{tahun}-01-01'`).
   - Jumlahkan saldo awal Bank + Tunai (dedup per `id_ref_bku` dari `id_anggaran` terbaru agar tidak terhitung ganda antar revisi). Bila total `> 0`, simpan `saldo_awal` dan `tanggal_saldo_awal = '{tahun}-01-01'`.
6. Kembalikan payload JSON:
   ```json
   {
     "status": "success",
     "exists": true,
     "tahun": 2026,
     "sumber_dana_id": 1,
     "sumber_dana": "BOS Reguler",
     "saldo_awal": 0,
     "tanggal_saldo_awal": null,
     "items": [
       {
         "tahap": 1,
         "tanggal_terima": "2026-01-20",
         "jumlah_dana": 14500000.0,
         "uraian": "Terima Dana BOSP Tahap 1 2026",
         "source": "bku"
       }
     ],
     "db_path": "..."
   }
   ```
   Bila `items` kosong (dan `saldo_awal <= 0`), kembalikan `exists: false` dengan `items: []` dan pesan ramah.

### 2.2 Route & Controllers
- **[routes/variant.php](file:///c:/laragon/www/newSIKAS2/newSIKAS/routes/variant.php):**
  ```php
  Route::get('/penerimaan-dana/check-arkas/{penganggaranId}', [PenerimaanDanaController::class, 'checkArkas'])
      ->name('penerimaan-dana.check-arkas');
  ```
  Prefix `penerimaan-dana.*` otomatis dipetakan ke modul RBAC `penatausahaan` pada semua 4 varian di `PermissionCatalog.php`.
- **[PenerimaanDanaController.php](file:///c:/laragon/www/newSIKAS2/newSIKAS/app/Http/Controllers/PenerimaanDanaController.php):**
  - Tambah `checkArkas(int $penganggaranId, ArkasEngineService $arkasEngine): JsonResponse`:
    - Cari penganggaran varian aktif (`findOrFail($penganggaranId)`).
    - Panggil `$arkasEngine->runScriptRaw('check_penerimaan.py', [(string) $penganggaran->tahun_anggaran, (string) VariantConfig::arkasSumberDanaId($this->variant)], 30)`.
    - Bila engine mengembalikan error (`status === 'error'` atau `isset($result['error'])`), kembalikan HTTP `422` JSON `{ status: 'error', error_type, message }`.
    - Petakan setiap item ARKAS ke `sumber_dana` resmi SIKAS berdasarkan `VariantConfig::sumberDanaOptions($this->variant)`:
      - Varian 2 tahap (`sumberDanaTahap2 !== null`): `tahap === 2 ? sumberDanaOptions[1] : sumberDanaOptions[0]`.
      - Varian 1 tahap (`silpa`, `kinerja_silpa`): `sumberDanaOptions[0]`.
    - Sematkan `saldo_awal` & `tanggal_saldo_awal` hanya pada item yang `sumber_dana === VariantConfig::sumberDanaTahap1($this->variant)` (bila `saldo_awal > 0`).
    - Bandingkan dengan daftar `sumber_dana` yang sudah tersimpan di tabel `PenerimaanDana` varian aktif untuk `$penganggaranId`, lalu tandai `already_recorded: bool` pada setiap item.
    - Kembalikan HTTP `200` JSON:
      `{ status: 'success', exists, tahun, sumber_dana_label, items: [...], message }`.
- **[PenatausahaanController.php](file:///c:/laragon/www/newSIKAS2/newSIKAS/app/Http/Controllers/PenatausahaanController.php):**
  - Tambahkan `'sumberDanaTahap2' => VariantConfig::sumberDanaTahap2($var)` di `renderVariant()`.

---

## 3. Desain Frontend Modal Penerimaan Dana (`resources/js/Pages/Penatausahaan/Index.tsx`)

1. **Props & State Baru:**
   - Baca `sumberDanaTahap2: string | null = pageProps.sumberDanaTahap2 || null`.
   - Tambah state pengecekan ARKAS khusus modal penerimaan: `isCheckingArkasPenerimaan`, `arkasPenerimaanResult`, `arkasPenerimaanFeedback`, dan `AbortController` ref (direset & di-abort saat `openModal`, `closeModal`, atau unmount).
2. **Perhitungan Kelengkapan Penerimaan:**
   - `recordedSumberDanaSet = new Set(penerimaanData.map((item) => item.sumber_dana))`
   - `hasTahap2Recorded = Boolean(sumberDanaTahap2 && recordedSumberDanaSet.has(sumberDanaTahap2))`
   - `allStagesRecorded = sumberDanaOptions.length > 0 && sumberDanaOptions.every((opt) => recordedSumberDanaSet.has(opt))`
   - `shouldHideCreateButton = hasTahap2Recorded || allStagesRecorded`
   - Fallback aman saat `sumberDanaTahap2` belum ter-refresh (HMR): bila `sumberDanaOptions.length >= 2`, anggap elemen ke-2 (`sumberDanaOptions[1]`) sebagai tahap 2!
3. **List View (`!showCreateForm`):**
   - Tambahkan tombol **"Cek dari ARKAS"** di bar aksi daftar penerimaan (sejajar judul/ringkasan daftar atau tepat di atas daftar) — tetap aktif meskipun `shouldHideCreateButton === true` untuk verifikasi angka.
   - Panel hasil cek ARKAS:
     - Jika `exists: true` & `items.length > 0`: tampilkan daftar kartu ringkas per tahap ARKAS (`sumber_dana`, `tanggal_terima`, `jumlah_dana`, badge `BKU ARKAS` / `Data Salur`, info `saldo_awal` bila ada):
       - Jika `already_recorded === true`: badge hijau **"Sudah Tercatat"**.
       - Jika `already_recorded === false`: tombol **"Isi ke Form"** yang langsung berpindah ke Form View (`setShowCreateForm(true)`) dan mengisi `sumber_dana`, `tanggal_terima`, `jumlah_dana` (format `Rp ...`), serta `saldo_awal` + `tanggal_saldo_awal` (khusus Tahap 1 bila ada).
     - Jika `exists: false` atau error: tampilkan banner peringatan/error inline di dalam modal.
   - Di bawah daftar histori:
     - Jika `!shouldHideCreateButton`: tampilkan tombol dashed **"Tambah Penerimaan Tahap Berikutnya"**.
     - Jika `shouldHideCreateButton`: **sembunyikan** tombol Tambah, dan tampilkan **banner info hijau ringkas**: *"Seluruh penerimaan dana pada tahun ini sudah tercatat."*
4. **Form View (`showCreateForm`):**
   - Pada dropdown `Sumber Dana`, opsi yang ada di `recordedSumberDanaSet` diberi atribut `disabled` dan label `${opt} (Sudah tercatat)`.
   - Tambahkan tombol **"Cek dari ARKAS"** di header Panel 1 (*Sumber & Waktu Penerimaan*):
     - Mengambil data dari endpoint `penerimaan-dana.check-arkas`.
     - Jika `data.sumber_dana` sudah dipilih, cari item ARKAS yang cocok dengan `data.sumber_dana` dan langsung isi `tanggal_terima`, `jumlah_dana`, serta `saldo_awal`/`tanggal_saldo_awal` (bila Tahap 1).
     - Jika `data.sumber_dana` belum dipilih, pilih otomatis item ARKAS pertama yang `!already_recorded` dan isi seluruh field-nya.
     - Tampilkan banner feedback inline (sukses / tidak ditemukan / error) di dalam form.
   - Pada `submitPenerimaan` `onSuccess`: refresh `penerimaanData`, reset hasil cek ARKAS agar tidak usang, dan panggil `router.reload({ only: ['penganggaranList', 'statusPerTahun'] })` agar status `has_tahap_2` pada kartu bulan di halaman Penatausahaan langsung terbarui.

---

## 4. Rencana Pengujian & Verifikasi

1. **Verifikasi Read-Only `check_penerimaan.py`:** Uji langsung terhadap `arkas.db` lokal (`2026 1` dan `2030 1`).
2. **PHPUnit Feature Tests (`tests/Feature/PenerimaanDanaArkasCheckTest.php`):**
   - Mengembalikan item Tahap 1 & Tahap 2 lengkap dengan pemetaan `sumber_dana` resmi (`Bosp Reguler Tahap 1`, `Bosp Reguler Tahap 2`), `saldo_awal` hanya pada Tahap 1, serta flag `already_recorded` (`true` untuk Tahap 1 yang sudah tersimpan di SIKAS, `false` untuk Tahap 2 yang belum tersimpan).
   - Varian `kinerja` (`sumber_dana_id = 12`) dan `silpa` (`sumber_dana_id = 33`, pemetaan 1 tahap `'SiLPA BOSP Reguler'`).
   - `exists: false` ketika ARKAS tidak memiliki data penerimaan tahun tersebut.
   - Error `DB_NOT_FOUND` dari engine mengembalikan HTTP `422`.
   - RBAC: role tanpa izin `penatausahaan` mendapat HTTP `403`.
   - `GET /penatausahaan` meneruskan prop `sumberDanaTahap2` (`Bosp Reguler Tahap 2` untuk reguler, `null` untuk silpa).
3. **Quality Gates:**
   - `php vendor/bin/pint`
   - `php artisan test --filter=PenerimaanDanaArkasCheckTest`
   - `npm run build` (`tsc && vite build`)
   - `/code-review` dua sumbu paralel (**Standards** & **Spec**).
