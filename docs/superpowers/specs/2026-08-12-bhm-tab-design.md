# Design Spec: Penambahan Tab BHM (Barang Modal / Aset)

## 1. Ringkasan
Aplikasi memerlukan tab baru bernama "BHM" (Barang Modal / Aset) pada halaman Rekapan BKU. Fitur ini secara fungsional identik dengan tab "BHP", namun menampilkan transaksi pengeluaran yang berstatus sebagai belanja modal/aset (kode rekening awalan `5.2`). PDF hasil cetaknya akan menghilangkan kolom "ID Barang" sehingga persis sesuai standar layout yang baru.

## 2. Pendekatan Arsitektur
Menggunakan pendekatan "Pemisahan Total":
- Membuat `BhmController` khusus untuk BHM.
- Rute-rute baru khusus BHM.
- Membuat view `bhm_pdf.blade.php`.
- Menambahkan tab "BHM" di dalam `Rekapitulasi.tsx`.

## 3. Detail Implementasi
### a. Backend (Controller & Route)
- **File**: `app/Http/Controllers/BhmController.php` (Duplikasi logika dari `BhpController`).
- **Query Filter**: `kode_rekening` diawali dengan `5.2%`.
- **Rute Baru**: 
  - `GET /api/bhm/data`
  - `GET /bhm/cetak`

### b. Frontend (Rekapitulasi.tsx)
- Menambahkan state baru: `bhpData`, `periodeBhm`, `jenisLaporanBhm`, `showPrintBhmModal` (atau *reuse* state yang ada bila memungkinkan, namun lebih aman membuat state terpisah untuk tab BHM agar filter tidak bentrok dengan BHP).
- Menambahkan tab navigasi "BHM".
- Menambahkan tabel BHM dengan 8 kolom (Sama seperti BHP: Tanggal, Kode Kegiatan, Kode Rekening, No. Bukti, Uraian, Jml Barang, Harga Satuan, Realisasi).

### c. Laporan PDF (bhm_pdf.blade.php)
- Layout *landscape*.
- Judul: "REKAPITULASI REALISASI BELANJA DANA BOSP ( BARANG MODAL / ASET )"
- Menambahkan kotak bergaris dengan teks "BHM" di sudut kanan atas (seperti referensi gambar).
- Parameter ukuran font, orientasi, dan ukuran kertas dinamis dari modal pengaturan cetak.

## 4. Pengujian (Verifikasi)
- Pastikan tab BHM dapat memuat data.
- Pastikan perubahan filter "Bulanan", "Tahap", "Tahunan" berfungsi dengan tepat.
- Pastikan cetak PDF memunculkan gaya kotak "BHM" di kanan atas tanpa adanya kolom ID Barang.
