# Implementation Plan: Fitur Tarik Data RKAS dari ARKAS ke RKAS Awal newSIKAS

**Tanggal Rencana:** 16 Oktober 2026  
**Status:** Siap Dieksekusi (Menunggu Persetujuan Pengguna)  
**Dokumen Desain Referensi:** [`docs/superpowers/specs/2026-10-16-tarik-rkas-arkas-design.md`](file:///c:/laragon/www/newSIKAS2/newSIKAS/docs/superpowers/specs/2026-10-16-tarik-rkas-arkas-design.md)  

---

## 1. Ringkasan Tugas & Tujuan
Mengimplementasikan kemampuan menarik data alokasi bulanan RKAS Murni (`is_revisi = 0`, `is_approve = 1`) dari database lokal/online ARKAS (`arkas.db`) langsung ke data RKAS Awal (tabel `rkas`) di aplikasi newSIKAS.

Fitur ini dilengkapi dengan:
- **Proteksi Status:** Tombol hanya aktif dan tampil jika data RKAS di newSIKAS masih kosong (`items.length === 0`).
- **Proteksi BKU:** Backend memblokir penarikan jika sudah ada transaksi belanja BKU pada tahun anggaran terkait.
- **Modal Preview:** Menampilkan ringkasan data ARKAS (Tahun, Sumber Dana, Total Pagu, Jumlah Kegiatan, Alokasi Bulanan) sebelum pengguna mengonfirmasi penarikan.
- **Sinkronisasi Pagu:** Mengupdate kolom `pagu_anggaran` di newSIKAS agar sama persis dengan pagu resmi ARKAS.

---

## 2. Rincian Perubahan File & Tahapan Eksekusi

### Tahap 1: Pembuatan Python Engine `dump_rkas.py`
- **File Target:** `storage/app/arkas_engine/dump_rkas.py`
- **Tanggung Jawab:**
  1. Mencari lokasi `arkas.db` secara dinamis (mendukung parameter `manual_path`, `%APPDATA%`, `%USERPROFILE%`, dan glob).
  2. Membuka database dengan kunci SQLCipher `'K3md1kbudRIS3n4yan'`.
  3. Menyediakan mode `--check`:
     - Memeriksa ada tidaknya RKAS Murni (`is_revisi = 0`, `is_approve = 1`, `soft_delete = 0`) untuk `tahun_anggaran` dan `id_ref_sumber_dana`.
     - Menghitung pagu total, jumlah kegiatan unik, dan total alokasi bulanan.
     - Mengembalikan JSON ringkasan ke PHP.
  4. Menyediakan mode `--dump`:
     - Melakukan query teroptimasi (menghindari duplikasi join `ref_kode` dan `ref_rekening`) untuk mengekstrak seluruh baris alokasi bulanan:
       * `kode_kegiatan` (misal `03.01.03.`)
       * `kode_rekening` (misal `5.1.02.02.01.0003`)
       * `uraian` (nama barang/jasa)
       * `volume` (jumlah alokasi di bulan terkait)
       * `satuan` (satuan belanja)
       * `harga_satuan` (harga satuan barang)
       * `jumlah` (total belanja = volume * harga_satuan)
       * `bulan` ('Januari' s/d 'Desember' via `ref_periode`)
     - Mengembalikan JSON hasil ekstraksi.

### Tahap 2: Penambahan Rute di `routes/variant.php`
- **File Target:** `routes/variant.php`
- **Tanggung Jawab:**
  Menambahkan dua rute baru di bawah group RKAS:
  ```php
  Route::get('/rkas/{id}/check-arkas', [RkasController::class, 'checkArkasRkas'])->name('rkas.check-arkas');
  Route::post('/rkas/{id}/pull-arkas', [RkasController::class, 'pullArkasRkas'])->name('rkas.pull-arkas');
  ```

### Tahap 3: Implementasi Controller di `app/Http/Controllers/RkasController.php`
- **File Target:** `app/Http/Controllers/RkasController.php`
- **Tanggung Jawab:**
  1. Menambahkan helper method `getArkasSumberDanaId()`:
     - `reguler` -> `1`
     - `kinerja` -> `12`
     - `silpa` -> `33`
     - `kinerja_silpa` -> `35`
  2. Menambahkan helper method `executeArkasEngine(array $args)`:
     - Membaca path Python `storage_path('app/arkas_engine/python.exe')` dan script `dump_rkas.py`.
     - Mengatur environment variable Windows (`APPDATA`, `USERPROFILE`, `SystemDrive`).
     - Menggunakan `Symfony\Component\Process\Process` dengan timeout 60 detik.
  3. Menambahkan method `checkArkasRkas(Request $request, $id)`:
     - Menemukan data penganggaran aktif.
     - Menjalankan Python `--check`.
     - Mengembalikan respons JSON berisi ringkasan preview data ARKAS.
  4. Menambahkan method `pullArkasRkas(Request $request, $id)`:
     - **Validasi 1:** Pastikan RKAS saat ini kosong (`($this->Rkas)::where(penganggaranFk, $id)->count() === 0`). Jika tidak, return error.
     - **Validasi 2:** Pastikan BKU belum ada transaksi (`($this->BukuKasUmum)::where(penganggaranFk, $id)->exists()`). Jika ada, return error.
     - Menjalankan Python `--dump`.
     - Melakukan batch pre-load `kode_kegiatans` dan `rekening_belanjas` ke dalam associative memory array.
     - Membuka transaksi database `DB::beginTransaction()`.
     - Mengupdate `pagu_anggaran` pada tabel penganggaran.
     - Menyimpan baris-baris alokasi bulanan ke model RKAS aktif (`$this->Rkas`).
     - `DB::commit()`.
     - Mengembalikan respons JSON sukses.

### Tahap 4: Antarmuka Pengguna di `resources/js/Pages/Penganggaran/Rkas/Index.tsx`
- **File Target:** `resources/js/Pages/Penganggaran/Rkas/Index.tsx`
- **Tanggung Jawab:**
  1. State Management:
     - `isArkasModalOpen` (boolean)
     - `arkasPreviewData` (object informasi preview)
     - `isCheckingArkas` (boolean loading saat cek)
     - `isPullingArkas` (boolean loading saat proses penarikan)
  2. Tombol Aksi:
     - Tombol **"Tarik dari ARKAS"** (warna hijau zamrud / emerald) di samping tombol "Salin".
     - Kondisi tampil: `items.length === 0 && !anggaran.has_perubahan`.
  3. Modal Preview:
     - Menampilkan icon sinkronisasi ARKAS.
     - Menampilkan rincian: Tahun Anggaran, Sumber Dana, Total Pagu ARKAS, Total Kegiatan, dan Total Alokasi Bulanan.
     - Tombol "Batal" dan tombol "Konfirmasi & Tarik Data" dengan spinner saat loading.
  4. Handler Penarikan:
     - Mengirimkan POST ke route `rkas.pull-arkas`.
     - Menampilkan modal alert sukses / gagal.
     - Melakukan `router.reload()` untuk memuat tabel RKAS yang baru saja ditarik.

---

## 3. Rencana Pengujian & Validasi

| No | Skenario Uji | Prosedur | Hasil yang Diharapkan |
|---|---|---|---|
| 1 | Uji CLI Python Engine | Jalankan `storage/app/arkas_engine/python.exe storage/app/arkas_engine/dump_rkas.py --check 2026 1` | Output JSON `exists: true`, `pagu: 29000000`, `total_kegiatan: 80`, `total_alokasi: 167`. |
| 2 | Uji Proteksi RKAS Tidak Kosong | Klik tarik saat `items.length > 0` atau kirim request via Postman/curl | Tombol tidak muncul di UI; jika dipaksa via API, ditolak dengan pesan error. |
| 3 | Uji Proteksi BKU Ada Belanja | Coba tarik saat penganggaran memiliki catatan di BKU | Penarikan ditolak dengan pesan peringatan keamanan BKU. |
| 4 | Uji Eksekusi Penarikan (Happy Path) | Halaman RKAS kosong -> Klik "Tarik dari ARKAS" -> Modal Preview muncul -> Klik "Tarik Data" | Data 167 alokasi bulanan berhasil masuk ke PostgreSQL, pagu sinkron Rp 29.000.000, tabel menampilkan rincian belanja per bulan. |

---

## 4. Checklist Keselamatan Kode
- [x] Kode lama tidak diubah sembarangan (non-breaking changes).
- [x] Menggunakan `DB::beginTransaction()` dan `DB::rollBack()` untuk menjaga keutuhan data.
- [x] Tidak ada perubahan kode dilakukan sebelum persetujuan eksplisit dari pengguna.
