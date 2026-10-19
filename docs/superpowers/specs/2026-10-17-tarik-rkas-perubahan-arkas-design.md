# Desain Teknis: Tarik RKAS Perubahan dari ARKAS ke newSIKAS

**Tanggal:** 17 Oktober 2026  
**Status:** Disetujui (Draft Final untuk Implementasi)  
**Tujuan:** Mengintegrasikan penarikan data RKAS Perubahan dari database lokal ARKAS 4 (`arkas.db`) ke modul RKAS Perubahan di newSIKAS secara otomatis, presisi, dan aman.

---

## 1. Latar Belakang & Masalah
Sebelumnya di newSIKAS, pembuatan data RKAS Perubahan hanya mengandalkan fitur "Salin dari RKAS Awal" (menduplikasi seluruh data RKAS Murni). Jika sekolah melakukan perubahan anggaran resmi di ARKAS (misalnya penyesuaian belanja barang/jasa, pergeseran volume, atau perubahan rekening di semester 2), operator sekolah harus mengubah data satu per satu secara manual di newSIKAS.

Di database ARKAS 4 (`arkas.db`):
- Perubahan anggaran resmi ditandai dengan kolom `is_revisi >= 100` pada tabel `anggaran`.
- Pada database sekolah saat ini (Tahun 2026), telah terdapat catatan anggaran resmi perubahan (`is_revisi = 100`, `is_approve = 1`) yang dibuat per tanggal 01 September 2026 dengan **76 item kegiatan**, **152 alokasi bulanan**, dan total pagu **Rp 29.000.000**.
- Seluruh rincian alokasi bulan Januari–Desember tersimpan di tabel `rapbs` dan `rapbs_periode`.

---

## 2. Arsitektur Komponen

```
┌───────────────────────────────────────────────┐
│              ARKAS 4 (SQLite DB)             │
│  anggaran (is_revisi >= 100, is_approve = 1)   │
│       ├── rapbs (kegiatan, rekening, uraian) │
│       └── rapbs_periode (bulan, volume, rp)  │
└───────────────────────┬───────────────────────┘
                        │
                        ▼ (Python Engine)
┌───────────────────────────────────────────────┐
│ storage/app/arkas_engine/dump_rkas_perubahan.py│
│ - Mode check: Preview cepat statistik ARKAS  │
│ - Mode dump : Ekstraksi JSON 152 baris alokasi│
└───────────────────────┬───────────────────────┘
                        │
                        ▼ (HTTP Request / JSON)
┌───────────────────────────────────────────────┐
│          RkasPerubahanController.php          │
│ - checkArkasRkasPerubahan()                   │
│ - pullArkasRkasPerubahan()                    │
│   ├── Validasi: BKU Tahap 2 Belum Belanja    │
│   ├── Validasi: Overwrite Checkbox            │
│   ├── Pemetaan: Kode Kegiatan & Rekening      │
│   └── DB::transaction: Simpan Batch & Log     │
└───────────────────────┬───────────────────────┘
                        │
                        ▼ (Inertia Props)
┌───────────────────────────────────────────────┐
│              Frontend React UI                │
│ 1. Penganggaran/Index.tsx (Kartu Perubahan)   │
│ 2. RkasPerubahan/Index.tsx (Toolbar Atas)     │
│ └── Modal Preview + Overwrite Checkbox        │
└───────────────────────────────────────────────┘
```

---

## 3. Spesifikasi Rinci

### A. Python Engine (`storage/app/arkas_engine/dump_rkas_perubahan.py`)
Mesin mandiri untuk mengekstrak anggaran perubahan dari ARKAS:
1. **Identifikasi Anggaran Perubahan**:
   ```sql
   SELECT a.id_anggaran, a.jumlah, a.tahun_anggaran, a.id_ref_sumber_dana, a.is_approve, a.is_revisi
   FROM anggaran a
   WHERE a.tahun_anggaran = ? 
     AND a.id_ref_sumber_dana = ? 
     AND a.is_revisi >= 100 
     AND a.soft_delete = 0
     AND a.is_approve = 1
   ORDER BY a.is_revisi DESC, a.create_date DESC
   LIMIT 1;
   ```
2. **Mode `check`**:
   Mengembalikan ringkasan cepat: `is_revisi`, `is_approve`, `pagu`, `total_kegiatan`, `total_alokasi`, dan `total_alokasi_rp`.
3. **Mode `dump`**:
   Mengambil seluruh data alokasi bulanan:
   - `kode_kegiatan` (`ref_kode.id_kode`)
   - `kode_rekening` (`ref_rekening.kode_rekening`)
   - `uraian` (uraian barang/jasa)
   - `volume` (jumlah alokasi kuantitas)
   - `satuan` (satuan barang)
   - `harga_satuan`
   - `jumlah` (`volume * harga_satuan`)
   - `bulan` (nama bulan alokasi)

### B. Routing Varian (`routes/variant.php`)
Menambahkan dua rute pada grup middleware `variant`:
```php
Route::post('/rkas-perubahan/check-arkas/{id}', [RkasPerubahanController::class, 'checkArkasRkasPerubahan'])->name('rkas-perubahan.check-arkas');
Route::post('/rkas-perubahan/pull-arkas/{id}', [RkasPerubahanController::class, 'pullArkasRkasPerubahan'])->name('rkas-perubahan.pull-arkas');
```
Rute ini otomatis mendukung seluruh varian yang memiliki modul perubahan (`reguler`, `kinerja`).

### C. Backend Controller (`RkasPerubahanController.php`)
1. **`checkArkasRkasPerubahan(Request $request, $id)`**:
   - Memeriksa ketersediaan data di ARKAS.
   - Menghitung jumlah data `rkas_perubahans` saat ini di newSIKAS.
   - Memeriksa apakah ada transaksi belanja BKU pada bulan Juli–Desember:
     ```php
     $hasBkuTahap2 = ($this->BukuKasUmum)::where($penganggaranFk, $id)
         ->whereMonth('tanggal_transaksi', '>=', 7)
         ->exists();
     ```
   - Mengembalikan payload JSON untuk modal preview frontend.

2. **`pullArkasRkasPerubahan(Request $request, $id)`**:
   - **Aturan Proteksi 1 (Integritas BKU Tahap 2)**: Jika `$hasBkuTahap2` bernilai `true`, penarikan ditolak keras:
     *"Penarikan data RKAS Perubahan ditolak: Sudah terdapat transaksi belanja pada BKU bulan Juli - Desember. Harap hapus transaksi belanja BKU pada periode tersebut terlebih dahulu sebelum menarik ulang RKAS Perubahan."*
   - **Aturan Proteksi 2 (Konfirmasi Timpa/Overwrite)**: Jika data RKAS Perubahan di newSIKAS sudah terisi dan checkbox `overwrite` bernilai `false`, penarikan ditolak:
     *"Data RKAS Perubahan sudah ada di newSIKAS. Harap centang konfirmasi penimpaan (overwrite) untuk menimpa data lama."*
   - **Validasi Master Data**: Memastikan seluruh kode kegiatan dan kode rekening ARKAS sudah ada di tabel `kode_kegiatans` dan `rekening_belanjas` newSIKAS.
   - **Eksekusi Penyimpanan (`DB::transaction`)**:
     1. Jika `overwrite = true`, bersihkan data lama di `rkas_perubahans` untuk penganggaran ini.
     2. Update `pagu_anggaran` pada tabel `penganggarans`.
     3. Insert batch seluruh 152 baris alokasi perubahan.
     4. Catat riwayat ke `rekaman_perubahans` (Action: `pull_arkas`).

### D. Antarmuka Pengguna (Frontend React)
1. **Halaman Penganggaran Utama (`resources/js/Pages/Penganggaran/Index.tsx`)**:
   - Pada kartu RKAS Perubahan (di samping tombol "Salin dari RKAS Awal"), ditambahkan tombol *"Tarik dari ARKAS"*.
   - Saat diklik, modal menampilkan status data ARKAS (Nomor Revisi 100, Pagu Rp 29.000.000, 152 Alokasi).
2. **Halaman Detail RKAS Perubahan (`resources/js/Pages/Penganggaran/RkasPerubahan/Index.tsx`)**:
   - Pada toolbar atas (di samping tombol "Tambah", "Rekaman Perubahan", "Cetak"), ditambahkan tombol *"Tarik dari ARKAS"*.
   - Modal dilengkapi indikator data existing dan kotak centang konfirmasi penimpaan (*overwrite*).

---

## 4. Rencana Verifikasi & Pengujian
1. **Pengujian Ekstraksi Python**:
   - Menjalankan `dump_rkas_perubahan.py check 2026 1` dan memastikan mengembalikan status `exists: true`, `is_revisi: 100`, dan total alokasi Rp 29.000.000.
2. **Pengujian Controller & Transaksi DB**:
   - Simulasi penarikan tanpa overwrite (memastikan ditolak jika data sudah ada).
   - Simulasi penarikan dengan overwrite (memastikan data 152 alokasi masuk dengan presisi dan pagu terupdate).
   - Pengujian proteksi BKU Semester 2.
3. **Pengujian Antarmuka & Build**:
   - Kompilasi `npm run build` memastikan tidak ada error TypeScript.
   - Standarisasi kode PHP dengan `vendor/bin/pint`.
