# Spesifikasi Desain: Cek Anggaran ARKAS & Salin Penanggung Jawab Tahun Sebelumnya pada Form Penganggaran

- **Tanggal:** 2026-11-22
- **Status:** Draft untuk Review Pengguna
- **Lingkup:**
  - Engine Python ARKAS: `storage/app/arkas_engine/check_anggaran.py` *(baru)*
  - Backend: [VariantConfig.php](file:///c:/laragon/www/newSIKAS2/newSIKAS/app/Config/VariantConfig.php), [routes/variant.php](file:///c:/laragon/www/newSIKAS2/newSIKAS/routes/variant.php), [PenganggaranController.php](file:///c:/laragon/www/newSIKAS2/newSIKAS/app/Http/Controllers/PenganggaranController.php), [RkasController.php](file:///c:/laragon/www/newSIKAS2/newSIKAS/app/Http/Controllers/RkasController.php) *(pakai helper bersama `arkasSumberDanaId`)*
  - Frontend: [Penganggaran/Index.tsx](file:///c:/laragon/www/newSIKAS2/newSIKAS/resources/js/Pages/Penganggaran/Index.tsx)
  - Pengujian: `tests/Feature/PenganggaranArkasCheckTest.php` *(baru)*
  - Tanpa perubahan skema database PostgreSQL maupun migrasi.

---

## 1. Tujuan & Alur Pengguna

Mempercepat pengisian form **Tambah / Edit Anggaran** di semua 4 varian BOSP (`reguler`, `kinerja`, `silpa`, `kinerja_silpa`) melalui dua aksi bantu di dalam modal:

1. **Tombol "Cek Anggaran" (ARKAS):**
   - Mencari anggaran pada `arkas.db` berdasarkan **Tahun Anggaran** yang terisi di form dan **varian BOSP aktif**.
   - Jika ditemukan, otomatis mengisi **Pagu Anggaran** (diformat `Rp ...`) serta **Nama & NIP Kepala Sekolah**, **Nama & NIP Bendahara**, dan **Nama Komite** dari tabel `sekolah_penjab` ARKAS.
   - Jika tahun tersebut belum ada di ARKAS, menampilkan daftar saran **tahun yang tersedia di ARKAS** sebagai tombol 1-klik untuk mengganti tahun dan langsung menarik datanya.
2. **Tombol "Salin dari Tahun Sebelumnya":**
   - Berfungsi apabila data Kepala Sekolah, Bendahara, atau Komite yang ditarik dari ARKAS tidak sesuai (atau untuk melengkapi Nomor SK & Tanggal SK yang tidak disimpan di `arkas.db`).
   - Menyalin lengkap **9 field penanggung jawab** (`komite`, `kepala_sekolah`, `nip_kepala_sekolah`, `sk_kepala_sekolah`, `tanggal_sk_kepala_sekolah`, `bendahara`, `nip_bendahara`, `sk_bendahara`, `tanggal_sk_bendahara`) dari tahun anggaran terdekat sebelumnya di SIKAS — prioritas varian aktif, dengan *fallback* ke **BOSP Reguler** bila varian non-reguler belum memiliki riwayat — tanpa mengubah `pagu_anggaran` maupun `tahun_anggaran`.

---

## 2. Desain Backend & Engine ARKAS

### 2.1 Helper Sumber Dana ARKAS (`app/Config/VariantConfig.php`)
Tambahkan metode statis tunggal sebagai sumber kebenaran peta `variant -> id_ref_sumber_dana` ARKAS:
```php
public static function arkasSumberDanaId(string $variant): int
{
    self::validateVariant($variant);

    return match ($variant) {
        self::KINERJA => 12,
        self::SILPA => 33,
        self::KINERJA_SILPA => 35,
        default => 1,
    };
}
```
`RkasController::getArkasSumberDanaId()` dan `PenganggaranController::checkArkas()` sama-sama memanggil `VariantConfig::arkasSumberDanaId($this->variant)`.

### 2.2 Skrip Python `storage/app/arkas_engine/check_anggaran.py`
Argumen CLI: `python.exe check_anggaran.py <tahun> <sumber_dana_id> [manual_db_path]`
Menggunakan mekanisme penemuan file & dekripsi SQLCipher 4 yang sama seperti `dump_rkas.py` (mode baca saja / `SELECT`).

Langkah query:
1. Ambil daftar tahun tersedia untuk `sumber_dana_id`:
   ```sql
   SELECT DISTINCT tahun_anggaran
   FROM anggaran
   WHERE id_ref_sumber_dana = ? AND soft_delete = 0
   ORDER BY tahun_anggaran DESC
   ```
2. Cari baris `anggaran` untuk `(tahun, sumber_dana_id, soft_delete = 0)` dengan urutan prioritas:
   - Prioritas 1: `COALESCE(is_revisi, 0) < 100 AND is_approve = 1` terbaru (`ORDER BY COALESCE(is_revisi, 0) DESC, create_date DESC LIMIT 1`).
   - Prioritas 2: `COALESCE(is_revisi, 0) < 100` (draf RKAS Awal) terbaru.
   - Prioritas 3: baris anggaran aktif mana pun pada tahun & sumber dana tersebut (`ORDER BY is_approve DESC, COALESCE(is_revisi, 0) DESC, create_date DESC LIMIT 1`).
3. Ambil `nama_sumber_dana` dari `ref_sumber_dana`.
4. Bila `anggaran` tidak ditemukan, kembalikan:
   ```json
   {
     "status": "success",
     "exists": false,
     "tahun": 2028,
     "sumber_dana_id": 1,
     "sumber_dana": "BOS Reguler",
     "available_years": [2027, 2026, 2025, 2024],
     "message": "Tidak ditemukan data anggaran BOS Reguler di ARKAS untuk Tahun 2028."
   }
   ```
5. Bila ditemukan, ambil data penanggung jawab:
   - Prioritas 1: `sekolah_penjab` berdasarkan `id_penjab = anggaran.id_penjab AND soft_delete = 0`.
   - Prioritas 2 (fallback bila `id_penjab` kosong/tidak cocok): `sekolah_penjab WHERE tahun = ? AND soft_delete = 0 ORDER BY last_update DESC, create_date DESC LIMIT 1`.
   - Prioritas 3 (fallback khusus `ks` / `nip_ks` bila masih kosong): `mst_sekolah WHERE soft_delete = 0 ORDER BY last_update DESC LIMIT 1` (`kepsek`, `nip_kepsek`).
   - Bersihkan nilai string (trim; kosongkan bila `None`).
6. Kembalikan payload JSON sukses:
   ```json
   {
     "status": "success",
     "exists": true,
     "id_anggaran": "...",
     "tahun": 2026,
     "sumber_dana_id": 1,
     "sumber_dana": "BOS Reguler",
     "pagu": 29000000,
     "is_approve": 1,
     "is_revisi": 1,
     "penanggung_jawab": {
       "kepala_sekolah": "Dra. Masitah Abdullah",
       "nip_kepala_sekolah": "196909172007012017",
       "bendahara": "Dra. Masitah Abdullah",
       "nip_bendahara": "196909172007012017",
       "komite": "Sapri Hi Sabe"
     },
     "available_years": [2027, 2026, 2025, 2024],
     "db_path": "..."
   }
   ```

### 2.3 Route & Controller (`routes/variant.php`, `PenganggaranController.php`)
- **Route** di `routes/variant.php` — dipasang **sebelum** `Route::resource('penganggaran', PenganggaranController::class)` agar `/penganggaran/check-arkas` tidak tertangkap parameter `{penganggaran}`:
  ```php
  Route::get('/penganggaran/check-arkas', [PenganggaranController::class, 'checkArkas'])
      ->name('penganggaran.check-arkas');
  ```
  Karena prefix nama route-nya `penganggaran.*`, `PermissionCatalog::resolveRouteRequirement()` otomatis memetakannya ke modul RBAC `penganggaran` pada semua 4 varian.
- **`PenganggaranController::checkArkas(Request $request, ArkasEngineService $arkasEngine)`**:
  - Validasi query `tahun`: `'required|digits:4|integer|min:2000|max:'.(date('Y') + 5)`.
  - Panggil `$arkasEngine->runScriptRaw('check_anggaran.py', [(string) $tahun, (string) $sumberDanaId], 30)`.
  - Bila engine mengembalikan error (`status === 'error'` atau `isset($result['error'])`), kembalikan HTTP `422` JSON dengan `{ status: 'error', error_type, message }` agar frontend menampilkan pesan ramah (mis. `arkas.db` belum diatur/diunggah).
  - Bila sukses, kembalikan HTTP `200` JSON terstruktur dengan normalisasi tipe (`exists` boolean, `pagu` float, `available_years` array int, `penanggung_jawab` array string).
- **`PenganggaranController::index()`**:
  - Kirim prop tambahan `official_history` berupa daftar objek riwayat penanggung jawab (masing-masing berisi `tahun_anggaran`, `source_variant`, `source_label`, dan 9 kolom penanggung jawab):
    - Seluruh record dari `$anggarans` varian aktif (`source_variant = $this->variant`, `source_label = VariantConfig::title($this->variant)`).
    - Jika `$this->variant !== VariantConfig::REGULER`, tambahkan juga record dari `Penganggaran::orderBy('tahun_anggaran', 'desc')->get()` (`source_variant = 'reguler'`, `source_label = 'BOSP Reguler'`) sebagai sumber *fallback*.

---

## 3. Desain Frontend Modal Form (`resources/js/Pages/Penganggaran/Index.tsx`)

### 3.1 Tombol "Cek Anggaran" (ARKAS) pada Form Pagu Anggaran
- Diletakkan pada baris input **Pagu Anggaran (Rp)** di seksi *Informasi Dasar* (di sisi kanan input atau sejajar label-input dalam layout flex responsif) agar langsung terlihat saat pengguna mengisi Pagu & Tahun Anggaran.
- Tersedia di **mode Tambah** maupun **mode Edit**.
- Perilaku saat diklik (`handleCheckArkasBudget(targetYear?: string)`):
  - Memvalidasi `tahun` 4 digit terlebih dahulu.
  - Mengirim `axios.get(vroute('penganggaran.check-arkas'), { params: { tahun } })` dengan status loading khusus (`isCheckingArkasBudget`) dan pembatalan aman saat modal ditutup.
  - **Bila `exists: true`:**
    - Isi `pagu_anggaran` dengan format Rupiah (`Rp 29.000.000`) **hanya bila** `!(editMode && isPerubahanLocked)`. Jika terkunci RKAS Perubahan, `pagu_anggaran` dan `tahun_anggaran` tetap dipertahankan.
    - Isi `komite`, `kepala_sekolah`, `nip_kepala_sekolah`, `bendahara`, `nip_bendahara` dari `penanggung_jawab` (menimpa hanya field yang bernilai non-kosong dari ARKAS).
    - Pertahankan nilai `sk_kepala_sekolah`, `tanggal_sk_kepala_sekolah`, `sk_bendahara`, `tanggal_sk_bendahara` yang sudah ada di form (tidak mengosongkan data yang sudah diisi).
    - Tampilkan banner status inline hijau di dalam modal: ringkasan sumber dana, tahun, status ARKAS (*Disahkan* / *Draf*), pagu, serta catatan bahwa Nomor SK & Tanggal SK tidak tersedia di ARKAS sehingga bisa dilengkapi manual atau lewat tombol **Salin dari Tahun Sebelumnya**.
  - **Bila `exists: false`:**
    - Tampilkan banner peringatan inline kuning dengan pesan dari server.
    - Bila `available_years.length > 0` dan `!(editMode && isPerubahanLocked)`, tampilkan chip/tombol 1-klik untuk setiap tahun yang tersedia di ARKAS (mis. `2027`, `2026`, `2025`); mengklik salah satu chip mengubah `tahun_anggaran` ke tahun tersebut lalu otomatis memanggil `handleCheckArkasBudget(year)`.
  - **Bila terjadi error (DB belum ditemukan / engine error / jaringan):**
    - Tampilkan banner error inline merah di dalam modal (tidak memaksa menutup modal).

### 3.2 Tombol "Salin Data Kepala Sekolah, Bendahara & Komite dari Tahun Sebelumnya"
- Diletakkan sebagai bilah aksi ringkas tepat di antara seksi *Informasi Dasar* dan seksi *Data Kepala Sekolah* (atau di bagian atas seksi penanggung jawab) sehingga alurnya alami: pengguna bisa klik **Cek Anggaran** dulu, lalu bila nama KS/Bendahara/Komite tidak sesuai atau butuh Nomor & Tanggal SK tahun lalu, tinggal 1 klik **Salin dari Tahun Sebelumnya**.
- Algoritma pemilihan kandidat sumber (`resolvePreviousOfficialSource(targetYear)`):
  1. Cari di `official_history` yang `source_variant === variant` dan `Number(tahun_anggaran) < targetYear` dengan tahun paling dekat (terbesar).
  2. Jika tidak ada, cari di `official_history` yang `source_variant === 'reguler'` dan `Number(tahun_anggaran) < targetYear` dengan tahun paling dekat.
  3. Jika masih tidak ada dan `variant !== 'reguler'`, cari di `official_history` yang `source_variant === 'reguler'` dan `Number(tahun_anggaran) === targetYear` (memudahkan saat sudah menginput BOSP Reguler tahun berjalan lalu menambah Kinerja/SiLPA tahun yang sama).
- Saat diklik (`handleCopyPreviousOfficials()`):
  - Menyalin seluruh 9 field (`komite`, `kepala_sekolah`, `nip_kepala_sekolah`, `sk_kepala_sekolah`, `tanggal_sk_kepala_sekolah`, `bendahara`, `nip_bendahara`, `sk_bendahara`, `tanggal_sk_bendahara`) ke state form tanpa mengubah `pagu_anggaran` maupun `tahun_anggaran`.
  - Menampilkan banner feedback inline sukses yang menyebut sumber tahun & variannya (mis. *"Data Kepala Sekolah, Bendahara & Komite (termasuk Nomor & Tanggal SK) disalin dari BOSP Reguler 2025."*).
- Jika tidak ada kandidat riwayat yang tersedia, tombol dinonaktifkan (*disabled*) dengan teks bantu singkat (*"Belum ada data tahun sebelumnya untuk disalin"*).
- Semua status feedback & saran tahun direset bersih setiap kali modal dibuka (`handleCreate` / `handleEdit`) atau ditutup (`handleCloseModal`).

---

## 4. Rencana Pengujian & Verifikasi

1. **Verifikasi Skrip Python Read-Only:** Uji `storage/app/arkas_engine/check_anggaran.py` langsung terhadap `arkas.db` lokal untuk tahun yang ada (mis. `2026 1`) dan tahun yang tidak ada (mis. `2030 1`).
2. **PHPUnit Feature Tests (`tests/Feature/PenganggaranArkasCheckTest.php`):**
   - Endpoint `penganggaran.check-arkas` berhasil pada `reguler` & `kinerja` (memastikan `sumber_dana_id` `1` dan `12` diteruskan ke `ArkasEngineService`), mengembalikan pagu, penanggung jawab, dan `available_years`.
   - Mengembalikan `exists: false` beserta `available_years` ketika tahun tidak ada di ARKAS.
   - Mengembalikan HTTP `422` dengan pesan jelas saat engine melaporkan `DB_NOT_FOUND`.
   - Validasi query `tahun` tidak valid mengembalikan `422`.
   - RBAC: role tanpa izin `penganggaran` mendapat `403`.
   - `PenganggaranController::index` mengirim `official_history` mencakup varian aktif dan *fallback* `reguler` pada varian non-reguler.
3. **Quality Gates:**
   - `vendor/bin/pint`
   - `php artisan test --filter=PenganggaranArkasCheckTest`
   - `npm run build` (`tsc && vite build`)
   - `/code-review` dua sumbu paralel (**Standards** & **Spec**).
