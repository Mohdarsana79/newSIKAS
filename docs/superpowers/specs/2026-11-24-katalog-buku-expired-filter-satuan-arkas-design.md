# Desain: Katalog Buku RBM + Filter `expired_date` + Satuan Baku ARKAS

Tanggal: 2026-11-24

## 1. Masalah yang Ditemukan dari Audit `arkas.db` vs `newSIKAS`
1. **Katalog Buku (`RBM` / `blok_id = 5.2.3`) tidak terhubung ke rekening modal buku (`5.2.05.01.01.0001`–`0009`):**
   - Di `arkas.db`, 5.461 judul buku Kemendikbud (2026: 1.843 aktif; 2025: 2.429 aktif) disimpan di `ref_acuan_barang` dengan `kode_rekening = NULL`, `blok_id = '5.2.3'`, `kode_belanja = 'RBM'`.
   - `newSIKAS` hanya query `WHERE kode_rekening = ?`, sehingga rekening buku selalu menampilkan 0 item.
2. **Data `expired_date` ikut masuk & tampil:**
   - `ref_acuan_barang` tahun 2026 memiliki 3.738 baris expired (termasuk 100 pada rekening BOSP aktif).
   - `ref_kode` & `ref_rekening` memiliki baris expired (`5.1.02.02.04.0049` expired `2021-04-14`, kode kegiatan expired 2025/2026).
3. **Referensi Satuan Baku (`ref_satuan`):**
   - `arkas.db` menyediakan 43 satuan baku (`buah`, `eksemplar`, `rim`, `pak`, `Jam pelajaran`, dll.), sedangkan form RKAS belum memiliki saran/autocomplete satuan baku.

## 2. Solusi
1. **Migrasi `ref_barangs` + `ref_satuans`:**
   - Tambah `blok_id`, `kode_belanja`, `is_expired` + index komposit pada `ref_barangs`.
   - Buat tabel `ref_satuans` (`ref_satuan_id`, `satuan`, `unit`, `is_active`).
2. **Engine Python (`query.py` & `dump_reference.py`):**
   - `query.py`: ikut menarik `blok_id`, `kode_belanja`, `is_expired` dari `ref_acuan_barang`.
   - `dump_reference.py`:
     - Mode `kegiatan` dan `rekening`: filter `expired_date IS NULL OR TRIM(expired_date) = ''`.
     - Mode baru `satuan`: tarik 43 satuan aktif dari `ref_satuan`.
3. **Katalog Buku & Filter Aktif pada Form RKAS:**
   - Helper terpusat di `RefBarang::scopeForRekeningCatalog($query, $year, $kodeRekening)` + `RefBarang::isBukuRekening($kodeRekening)`:
     - Otomatis filter `is_expired = false`.
     - Untuk rekening `5.2.05.01.01.0001`–`5.2.05.01.01.0009`, menggabungkan `kode_rekening = $kode` ATAU (`kode_rekening IS NULL AND kode_belanja = 'RBM' AND blok_id LIKE '5.2.3%'`).
   - Dipakai konsisten oleh `ArkasToolController::byRekening()`, `RkasController::resolveArkasBatasAtas()`, dan `RkasPerubahanController::resolveArkasBatasAtas()`.
4. **Arkas Tools & Form RKAS:**
   - `ArkasToolController::index/search` menyertakan `is_expired`, `blok_id`, `kode_belanja`; `ArkasTools/Index.tsx` menampilkan badge `Kedaluwarsa` bila expired.
   - `ArkasUraianSelect.tsx` menampilkan badge/keterangan Katalog Buku ARKAS saat `is_buku_catalog = true`.
   - `Rkas/Index.tsx` & `RkasPerubahan/Index.tsx` menerima `satuanOptions` dari `RefSatuan` (fallback 43 satuan baku ARKAS) untuk `<datalist>` autocomplete pada field Satuan.
