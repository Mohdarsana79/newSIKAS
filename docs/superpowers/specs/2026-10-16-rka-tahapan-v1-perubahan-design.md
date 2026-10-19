# Desain Penambahan Tab "Rka Tahapan V.1" pada RKAS Perubahan

## 1. Pendahuluan & Latar Belakang
Pada halaman **Summary RKAS Perubahan** (`resources/js/Pages/Penganggaran/RkasPerubahan/Summary.tsx`), tab `Rka Tahapan` saat ini menampilkan format tabel komparasi 14 kolom (perbandingan rincian sebelum perubahan, sesudah perubahan, selisih bertambah/berkurang, dan pembagian per tahap).

Pengguna membutuhkan tab baru bernama **"Rka Tahapan V.1"** yang menampilkan rincian anggaran RKAS Perubahan dalam format tabel 10 kolom standar seperti pada:
- `resources/views/rka_tahapan_pdf.blade.php`
- `resources/js/Pages/Penganggaran/Rkas/Partials/TabRkaTahapan.tsx`

Tabel 10 kolom ini fokus menyajikan angka hasil RKAS Perubahan secara bersih tanpa kolom perbandingan Sebelum/Perubahan.

---

## 2. Temuan Bug & Masalah pada Sistem Saat Ini
Saat menganalisis alur kode yang ada, ditemukan 2 bug terkait fitur Tahapan V.1 di RKAS Perubahan:

1. **Bug View Not Found pada Cetak PDF**:
   - Di `app/Http/Controllers/RkasPerubahanController.php` baris 1035, method `exportTahapanV1Pdf` memanggil:
     ```php
     $pdf = Pdf::loadView('laporan.rka_tahapan_perubahan_v_1_pdf', [...]);
     ```
   - Namun, file `resources/views/laporan/rka_tahapan_perubahan_v_1_pdf.blade.php` **tidak ada di filesystem**. Hal ini menyebabkan error fatal `View [laporan.rka_tahapan_perubahan_v_1_pdf] not found` jika tombol Cetak PDF dijalankan.
2. **Bug Missing Route & Controller Method untuk Export Excel**:
   - Di `resources/js/Pages/Penganggaran/RkasPerubahan/Summary.tsx` baris 166, frontend memanggil route `rkas-perubahan.export-tahapan-v1-excel`.
   - Namun, route tersebut **belum didaftarkan** di `routes/variant.php` dan controllernya belum memiliki method `exportTahapanV1Excel`.

---

## 3. Keputusan Desain & Spesifikasi Solusi

### 3.1. Struktur Komponen Frontend
- Dibuat partial component baru: `resources/js/Pages/Penganggaran/RkasPerubahan/Partials/TabRkaTahapanV1.tsx`.
- Memisahkan kode tab ke dalam partial file mencegah `Summary.tsx` menjadi terlalu gemuk dan menjaga isolasi komponen.
- **Urutan Tabs**: Tab `Rka Tahapan V.1` diletakkan di urutan kedua, tepat di samping tab `Rka Tahapan`:
  1. `Rka Tahapan`
  2. `Rka Tahapan V.1` *(Baru)*
  3. `Rka Rekap`
  4. `Lembar Kerja 221`
  5. `Rka Bulanan`
  6. `Rincian Perubahan`
  7. `Grafik`
  8. `Rincian Pencairan` (RP)
  9. `Alur Kas`

### 3.2. Struktur Kolom Tabel Tab Rka Tahapan V.1 (10 Kolom)
Tabel Belanja memiliki 10 kolom:
1. `No.` (rowspan 2)
2. `Kode Rekening` (rowspan 2)
3. `Kode Program` (rowspan 2)
4. `Uraian` (rowspan 2)
5. `Rincian Perhitungan` (colspan 3):
   - `Volume`
   - `Satuan`
   - `Tarif Harga`
6. `Jumlah` (rowspan 2)
7. `Tahap` (colspan 2):
   - `1` (Tahap 1)
   - `2` (Tahap 2)

### 3.3. Sumber Data
- Menggunakan data props `anggaran` dan `tahapanData` yang sudah dikirim oleh `RkasPerubahanController::summary()`.
- Hierarki data:
  `Program` (oranye) $\rightarrow$ `Sub Program` (hijau) $\rightarrow$ `Uraian Program` (toska) $\rightarrow$ `Items Belanja` (putih).
- Tanggal penandatanganan di footer menggunakan `anggaran.tanggal_perubahan` (bukan `tanggal_cetak` seperti pada RKAS murni).

### 3.4. Pembuatan File Blade View & Export Excel
- Membuat file view `resources/views/laporan/rka_tahapan_perubahan_v_1_pdf.blade.php` dengan format 10 kolom persis `rka_tahapan_pdf.blade.php` dengan judul judul "KERTAS KERJA RENCANA KEGIATAN DAN ANGGARAN SEKOLAH (RKAS) PER TAHAP V.1", tanggal perubahan, dan kompatibilitas ekspor Excel (`$is_excel`).
- Menambahkan method `exportTahapanV1Excel` di `RkasPerubahanController.php`.
- Menambahkan route `rkas-perubahan.export-tahapan-v1-excel` di `routes/variant.php`.
- Memastikan tombol Cetak PDF dan Export Excel di modal cetak `Summary.tsx` memicu target `tahapan_v1` dengan benar.

---

## 4. Rencana Pengujian
1. Memastikan tidak ada syntax error PHP (`php -l`).
2. Memastikan TypeScript dan Vite bundle lolos build (`npm run build`).
3. Menguji respons data tab di peramban/browser (layout responsif, warna baris program/sub-program/uraian/item, dan format angka rupiah).
4. Menguji Cetak PDF Rka Tahapan V.1.
5. Menguji Export Excel Rka Tahapan V.1.
