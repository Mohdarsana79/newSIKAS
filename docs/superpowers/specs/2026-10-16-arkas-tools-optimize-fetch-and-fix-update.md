# Implementation Plan: Optimasi Performa Tarik Data & Perbaikan Bug "Perlu Update 2" pada Arkas Tools

**Tanggal:** 16 Oktober 2026  
**Status:** Menunggu Review & Persetujuan Pengguna  
**Modul:** Arkas Tools (Pencarian, Tarik Data ARKAS, dan Sinkronisasi)  

---

## 1. Masalah & Analisis Akar Masalah (Root Cause)

### 1.1 Masalah 1: Selalu Tampil "Perlu Update: 2"
- **Temuan Hasil Investigasi**:
  Setelah diinspeksi secara langsung membandingkan 76.168 data ARKAS dengan database lokal PostgreSQL, ditemukan 2 data spesifik:
  1. `id_barang`: **`1.1.7.04.01.004.322`** (Tahun **2024**)
  2. `id_barang`: **`1.1.7.04.01.004.322`** (Tahun **2025**)
- **Penyebab Bug**:
  Pada data ARKAS tersebut, kolom `satuan` bernilai string angka `"0"`.  
  Di PHP, kondisi ternary berikut digunakan saat menyimpan ke database:
  ```php
  'satuan' => $item['satuan'] ? (string)$item['satuan'] : null
  ```
  Di PHP, nilai `"0"` dianggap bernilai **FALSE** (*falsy*). Akibatnya, `"0"` diubah menjadi `null` saat disimpan ke PostgreSQL.  
  Saat pengecekan status, nilai `null` di database lokal dibandingkan dengan `"0"` dari ARKAS:
  ```php
  $ex['satuan'] !== $item['satuan'] // ('' !== '0' -> TRUE)
  ```
  Hal ini menyebabkan kedua data tersebut **selamanya terdeteksi "Perlu Update"** meskipun tombol Sync telah ditekan berkali-kali.

### 1.2 Masalah 2: Terlalu Berat Menarik Data 75 Ribu Sekaligus
- **Penyebab**:
  1. Saat tombol "Tarik Data" diklik, sistem mengirim seluruh 76.168 objek data dalam satu payload JSON (~25 MB) dari server ke browser.
  2. Browser harus mem-parse string 25 MB tersebut dan menyimpannya ke dalam React state (`results`).
  3. Menyimpan puluhan ribu objek di memori browser menyebabkan browser mengalami *freeze* / *lag* dan proses terasa sangat berat.

---

## 2. Solusi yang Dirancang

### 2.1 Solusi Masalah 1: Memperbaiki Penanganan Kolom `satuan` dan Tipe Data
1. Ubah logika penyimpanan di `sync()`:
   Gunakan pengecekan eksplisit `!== null && !== ''`:
   ```php
   'satuan'        => ($item['satuan'] !== null && $item['satuan'] !== '') ? (string)$item['satuan'] : null,
   'kode_rekening' => ($item['kode_rekening'] !== null && $item['kode_rekening'] !== '') ? (string)$item['kode_rekening'] : null,
   'rekening'      => ($item['rekening'] !== null && $item['rekening'] !== '') ? (string)$item['rekening'] : null,
   ```
2. Ubah logika perbandingan di `fetchArkas()`:
   Lakukan `trim()` dan normalisasi string agar nilai `"0"` terbaca identik dengan `"0"` di database lokal:
   ```php
   $arkasSat = trim((string)($item['satuan'] ?? ''));
   $lokalSat = trim((string)($ex['satuan'] ?? ''));
   ...
   $isChanged = ($lokalNama !== $arkasNama || $lokalKode !== $arkasKode || $lokalRek !== $arkasRek || $lokalSat !== $arkasSat || abs($lokalBatas - $arkasBatas) > 0.01);
   ```
3. Lakukan sinkronisasi pembaruan untuk kedua baris tersebut sehingga statusnya langsung menjadi `Sudah Ada` (Perlu Update: 0).

### 2.2 Solusi Masalah 2: Optimasi Performa Penarikan Data (Super Ringan)
1. **Penarikan Sesuai Tahun Terpilih**:
   - Jika pengguna memilih "Tahun 2026", tombol "Tarik Data" hanya memproses Tahun 2026 (~23.000 baris, hanya 1/3 beban).
   - Jika memilih tahun tertentu lainnya (2025 atau 2024), proses hanya berjalan untuk tahun tersebut.
2. **Optimasi Payload Browser (Tidak Lagi Mengirim 25 MB ke Browser)**:
   - Di `fetchArkas()`, backend tetap memproses dan membandingkan seluruh data di memori server secara cepat (hanya butuh 1–2 detik di backend).
   - Namun ke browser, backend **hanya mengirimkan**:
     * Ringkasan status lengkap: `{ total, data_baru, perlu_update, sudah_ada }`.
     * Data yang ditampilkan di tabel: jika ada data berstatus `Data Baru` atau `Perlu Update`, tampilkan baris-baris tersebut sebagai prioritas, ditambah sampel 100 data pertama.
     * Ukuran payload ke browser turun dari **25 MB menjadi < 100 KB** (lebih dari **99% lebih ringan**)!
   - Browser tidak akan lag/freeze sama sekali.
3. **Eksekusi Sync yang Efisien**:
   - Tombol "Sync Database" tetap menjalankan batch upsert per chunk 2.000 baris di backend.
   - Setelah sync selesai, browser cukup memanggil `loadPage(1)` untuk menampilkan data dari database lokal dengan paginasi 50 baris per halaman.

---

## 3. Rencana Perubahan Kode

### 3.1 `app/Http/Controllers/ArkasToolController.php`
- Memperbaiki ternary boolean pada `satuan`, `kode_rekening`, dan `rekening` di method `sync()` dan `fetchArkas()`.
- Membatasi payload data yang dikirim ke browser saat penarikan data massal:
  * Kirim semua item yang berstatus `Data Baru` dan `Perlu Update`.
  * Untuk item yang `Sudah Ada`, batasi maksimal 100 sampel pertama agar browser ringan.
  * Ringkasan angka (`summary`) tetap mencerminkan total keseluruhan secara 100% akurat.

### 3.2 `resources/js/Pages/ArkasTools/Index.tsx`
- Menyesuaikan label dan notifikasi di modal penarikan data:
  * Menampilkan informasi tahun yang sedang ditarik (misal: "Tahun 2026: ~23.000 data").
- Memastikan info bar dan summary card menampilkan angka ringkasan dengan jelas dan responsif.

---

## 4. Rencana Pengujian

1. **Uji Kasus "Perlu Update 2"**:
   - Menguji data `1.1.7.04.01.004.322` di tahun 2024 dan 2025.
   - Memastikan setelah perbaikan, `Perlu Update` menjadi **0** dan tombol Sync menjadi **non-aktif (disabled)**.
2. **Uji Beban Tarik Data**:
   - Menguji klik "Tarik Data" untuk Tahun 2026 dan Semua Tahun.
   - Mengukur waktu respons dan memastikan browser tidak mengalami lag atau freeze.
3. **Uji Keselarasan Paginasi & Search**:
   - Memastikan auto-load data database lokal tetap berjalan mulus dengan paginasi 50 per halaman.

---

## 5. Pertanyaan & Konfirmasi Sebelum Eksekusi

Dokumen implementation plan ini telah disusun dengan cermat.  
Sesuai **Aturan No. 1** Anda (*"Tidak boleh eksekusi kode tanpa instruksi dari saya"*), belum ada kode yang dimodifikasi.

Silakan review rencana di atas. Jika Anda menyetujui, berikan instruksi agar saya dapat langsung mengeksekusi solusinya.
