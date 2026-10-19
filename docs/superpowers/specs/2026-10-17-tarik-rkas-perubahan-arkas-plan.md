# Implementation Plan: Tarik RKAS Perubahan dari ARKAS

**Tanggal:** 17 Oktober 2026  
**Status:** Siap Dieksekusi  
**Tujuan:** Mengintegrasikan penarikan data anggaran perubahan dari database ARKAS 4 (`arkas.db`) ke modul RKAS Perubahan newSIKAS.

---

## 1. Komponen & Alur Kerja

1. **Python Engine (`storage/app/arkas_engine/dump_rkas_perubahan.py`)**
   - Mendukung argumen `<mode: check|dump> <tahun> <sumber_dana_id> [manual_db_path]`.
   - Mengambil anggaran dengan filter `tahun_anggaran = ? AND id_ref_sumber_dana = ? AND is_revisi >= 100 AND soft_delete = 0 AND is_approve = 1 ORDER BY is_revisi DESC, create_date DESC LIMIT 1`.
   - Mode `check`: Return statistik `exists`, `id_anggaran`, `is_revisi`, `pagu`, `total_kegiatan`, `total_alokasi`, `total_alokasi_rp`.
   - Mode `dump`: Return array 152 data alokasi bulanan lengkap dengan join ke `ref_kode`, `ref_rekening`, dan `ref_periode`.

2. **Rute Variant (`routes/variant.php`)**
   - `POST /rkas-perubahan/check-arkas/{id}` -> `RkasPerubahanController@checkArkasRkasPerubahan` (nama: `rkas-perubahan.check-arkas`).
   - `POST /rkas-perubahan/pull-arkas/{id}` -> `RkasPerubahanController@pullArkasRkasPerubahan` (nama: `rkas-perubahan.pull-arkas`).

3. **Backend Controller (`app/Http/Controllers/RkasPerubahanController.php`)**
   - Helper `getArkasSumberDanaId()` dan `runArkasEngine()`.
   - Method `checkArkasRkasPerubahan($id)`: Cek eksistensi di ARKAS, jumlah item `rkas_perubahan` saat ini, dan apakah BKU tahap 2 (Juli–Desember) sudah memiliki transaksi belanja.
   - Method `pullArkasRkasPerubahan($id)`:
     - Proteksi 1: Tolak jika BKU tahap 2 sudah terisi transaksi belanja.
     - Proteksi 2: Tolak jika data RKAS Perubahan sudah terisi dan `overwrite != true`.
     - Validasi pemetaan `KodeKegiatan` dan `RekeningBelanja`.
     - `DB::transaction`: Hapus data lama jika overwrite, update pagu anggaran pada `penganggarans`, insert batch 152 data alokasi ke `rkas_perubahans`, catat ke `rekaman_perubahans` (action: `pull_arkas`).

4. **Frontend UI**
   - `resources/js/Pages/Penganggaran/RkasPerubahan/Index.tsx`:
     - Tambah tombol *"Tarik dari ARKAS"* di toolbar atas.
     - Tambah Modal Preview penarikan ARKAS Perubahan lengkap dengan indikator revisi (misal Revisi 100), total alokasi, checkbox konfirmasi overwrite (jika data sudah ada), dan peringatan proteksi BKU.
   - `resources/js/Pages/Penganggaran/Index.tsx`:
     - Tambah tombol *"Tarik dari ARKAS"* pada kartu RKAS Perubahan jika belum terisi atau jika ingin sinkronisasi.

---

## 2. Tahapan Eksekusi

- [x] **Langkah 1: Buat Python Engine `dump_rkas_perubahan.py`**
  - Uji eksekusi langsung via CLI: mode `check` dan mode `dump` untuk tahun 2026 sumber dana 1.
- [x] **Langkah 2: Tambahkan Rute di `routes/variant.php`**
  - Pasang rute `check-arkas` dan `pull-arkas` di grup rkas-perubahan.
- [x] **Langkah 3: Implementasikan Controller `RkasPerubahanController.php`**
  - Tambahkan method `getArkasSumberDanaId`, `runArkasEngine`, `checkArkasRkasPerubahan`, dan `pullArkasRkasPerubahan`.
- [x] **Langkah 4: Modifikasi Frontend `RkasPerubahan/Index.tsx` & `Penganggaran/Index.tsx`**
  - Pasang tombol trigger, modal pratinjau, checkbox overwrite, dan logic request.
- [x] **Langkah 5: Pengujian End-to-End**
  - Uji simulasi PHP controller dan periksa database (teruji 152 data alokasi masuk dengan presisi).
  - Jalankan `npm run build` untuk memverifikasi TypeScript (build sukses).
  - Jalankan `vendor/bin/pint` untuk standarisasi styling PHP (passed).
