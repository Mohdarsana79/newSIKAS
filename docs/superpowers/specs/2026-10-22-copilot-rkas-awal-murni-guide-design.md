# Design Spec: Panduan Lengkap RKAS Awal / Murni & Rekapan Cetak pada SIKAS AI Copilot

- **Tanggal**: 2026-10-22
- **Topik**: Standarisasi Panduan RKAS Awal / Murni (Menu Utama, Alur 4 Langkah Input, dan 10 Fitur Cetak RKAS) pada AI Copilot
- **Status**: Disetujui Pengguna (User Approved)

---

## 1. Latar Belakang & Kebutuhan
Setelah membuat pagu anggaran pada modul Penganggaran, bendahara melanjutkan proses penyusunan rencana keuangan sekolah pada lembar kerja **RKAS Awal / Murni**. 

Pengguna menghendaki panduan RKAS Awal / Murni pada AI Copilot disempurnakan dengan bahasa yang jelas, mudah dipahami, rapi, dan terstruktur ke dalam 3 pilar utama:
1. **Pilar 1: Pengenalan Halaman & Tombol/Menu Utama RKAS Awal / Murni**.
2. **Pilar 2: Alur 4 Langkah Input & Pengelolaan Belanja RKAS**.
3. **Pilar 3: Panduan Lengkap Halaman Rekapan & Cetak RKAS (10 Fitur Cetak Dokumen)**.

Seluruh panduan tetap mematuhi prinsip keamanan: **Strict Zero Internal URL Path Rule** (tidak memunculkan tautan teknis `/rkas/...` atau URL sistem apa pun).

---

## 2. Struktur Teks Panduan Resmi

### Bagian 1: Pengenalan Halaman & Menu Utama RKAS Awal / Murni
- **Fungsi Utama**: Fitur RKAS Awal / Murni berfungsi untuk merencanakan rincian belanja sekolah dari pagu anggaran yang telah ditetapkan.
- **Informasi Kartu (Card)**:
  - *Card Pagu Dana BOSP*: Menampilkan total pagu anggaran tahunan dan status anggaran.
  - *Card Anggaran Tahap 1 & Tahap 2*: Menampilkan alokasi 50% untuk Tahap 1 (Semester 1) dan 50% untuk Tahap 2 (Semester 2), serta sisa anggaran yang belum dialokasikan.
- **Penjelasan Menu / Tombol Utama di Header**:
  - **Tambah (Tombol Hijau)**: Menambah perencanaan belanja kegiatan baru ke dalam RKAS.
  - **Salin**: Menyalin data RKAS dari tahun sebelumnya ke RKAS awal murni tahun berjalan (data yang disalin adalah data RKAS Perubahan tahun sebelumnya). *Tombol ini tampil jika RKAS awal masih kosong.*
  - **Tarik dari ARKAS**: Menarik data RKAS langsung dari database aplikasi ARKAS desktop dan menyalinnya ke RKAS awal murni SIKAS. *Tombol ini tampil jika RKAS awal masih kosong dan belum ada transaksi BKU.*
  - **Buat Perubahan**: Membuat RKAS Perubahan dengan menyalin seluruh data RKAS awal murni. *Tombol ini dapat digunakan setelah Buku Kas Umum (BKU) bulan Juni (semester 1) ditutup.*
  - **Cetak**: Membuka halaman Rekapan & Cetak RKAS untuk melihat rekapitulasi serta mencetak dokumen pengesahan.

---

### Bagian 2: Alur 4 Langkah Input & Pengelolaan Belanja RKAS
- **Langkah ke 1 : Masuk ke Lembar Kerja RKAS**
  - Dari menu Penganggaran di sidebar kiri, klik tombol **"Detail RKAS"** pada kartu anggaran yang ingin diisi.
- **Langkah ke 2 : Tambah Kegiatan & Rincian Belanja**
  - Klik tombol **"Tambah"** (berwarna hijau) di bagian atas kanan.
  - Lengkapi formulir perencanaan:
    * *Kegiatan*: Pilih kode dan uraian program/kegiatan BOSP.
    * *Rekening*: Pilih kode rekening belanja standar (barang/jasa/modal).
    * *Uraian*: Tuliskan nama barang atau jasa yang direncanakan (misal: *Kertas HVS A4 70gr*).
    * *Harga Satuan*: Masukkan estimasi harga satuan (misal: *80.000*).
    * *Tambah Bulan*: Klik tombol "Tambah Bulan" untuk menentukan bulan belanja, masukkan volume/kuantitas (misal: *10*), dan satuan belanja (misal: *Rim*). Dapat menambahkan beberapa bulan sekaligus.
  - Klik tombol **"Simpan"** agar perencanaan belanja tersimpan pada tabel bulan yang dipilih.
- **Langkah ke 3 : Verifikasi pada Tabel Bulan**
  - Klik tab tabel bulan di bagian bawah (Januari s.d. Desember) untuk melihat daftar belanja yang telah dialokasikan pada masing-masing bulan.
- **Langkah ke 4 : Pengelolaan Menu Aksi (Titik Tiga `...`)**
  - Pada setiap baris belanja, terdapat tombol titik tiga di kolom aksi:
    * **Menu Edit**: Berfungsi mengedit kegiatan, rekening, harga satuan, volume, satuan, serta mengelola alokasi bulan:
      - *Hapus per bulan*: Klik ikon tempat sampah / silang merah pada kartu bulan tertentu jika ingin menghapus belanja pada bulan tersebut saja (misal: hapus di bulan Desember saja).
      - *Hapus Semua*: Klik tombol **"Hapus Semua"** (berwarna merah di bagian atas form) untuk menghapus belanja tersebut dari seluruh bulan (Januari s.d. Desember).
      - *Proteksi BKU*: Data belanja yang sudah direalisasikan pada Buku Kas Umum (BKU) tidak dapat diedit atau dihapus.
    * **Menu Detail**: Menampilkan rincian data perencanaan belanja yang sudah tersimpan.
    * **Menu Sisip Uraian**: Menyisipkan uraian belanja baru pada kegiatan dan rekening belanja yang sama tanpa perlu memilih ulang kode kegiatan dan rekening.

---

### Bagian 3: Panduan Lengkap Halaman Rekapan & Cetak (10 Fitur Cetak)
Saat tombol **Cetak** diklik, pengguna diarahkan ke halaman Rekapan RKAS. Halaman ini memuat:
- **Menu Tanggal Cetak**: Tombol hijau di sudut kanan atas untuk mengisi tanggal cetak atau tanggal pengesahan RKAS. Tanggal ini akan otomatis diterapkan seragam di semua lembar cetak.
- **10 Format Dokumen & Fitur Cetak**:
  1. **Rka Tahapan**: Format standar RKAS per tahapan (Tahunan, Tahap 1, Tahap 2). Klik tombol "Pengaturan Cetak" untuk menentukan ukuran kertas (A4, Letter, Folio F4, Legal), orientasi, dan ukuran font sebelum mencetak PDF.
  2. **Rka Tahapan V.1**: Format standar RKAS dengan kolom rincian volume yang dipecah secara eksplisit menjadi kolom Tahap 1 dan Tahap 2, memudahkan pemeriksaan alokasi belanja per semester.
  3. **Rka Rekap**: Rekapitulasi anggaran RKAS yang dikelompokkan menurut rekening belanja (Belanja Barang, Jasa, Perjalanan Dinas, Pemeliharaan, Modal) sebagai lampiran utama pengesahan.
  4. **Lembar Kerja 221**: Rincian anggaran belanja langsung menurut program dan kegiatan unit kerja (Formulir Resmi 2.2.1).
  5. **Rka Bulanan**: Format RKAS yang menampilkan rincian belanja per bulan (dapat dicetak per bulan atau sekaligus klik *Cetak Semua Bulan*).
  6. **Rincian**: Rincian anggaran belanja yang dipisahkan berdasarkan uraian kode kegiatan, dilengkapi opsi cetak Tahunan, Tahap 1, atau Tahap 2 serta ekspor Excel.
  7. **Grafik**: Analisis proporsi belanja otomatis sesuai Permendikdasmen Nomor 8 Tahun 2026:
     - Belanja Buku: minimal 10%
     - Honor Guru/Tendik: maksimal 20% (Negeri) atau maksimal 40% (Swasta)
     - Pemeliharaan Sarpras: maksimal 20%
     - Grafik proporsi antar jenis belanja.
  8. **RP (Rincian Pencairan / Payroll)**: Rincian belanja non-tunai yang akan ditransfer ke rekening masing-masing penerima dengan potongan pajak otomatis. Dilengkapi fitur:
     - *Gabung Kegiatan*: Menggabungkan uraian belanja dengan kegiatan dan rekening yang sama untuk penerima yang sama.
     - *Edit*: Mengisi data penerima (nama, jabatan, nomor rekening, nama bank, status ASN/Non ASN, status NPWP) dan menghitung otomatis pajak PPh 21, PPh 23, serta PPN.
     - *Detail*: Melihat daftar kegiatan yang telah digabung.
     - *Batal Gabung*: Membatalkan penggabungan kegiatan belanja.
     - *Tambah Nomor Kwitansi*: Memberikan nomor kuitansi pada pencairan.
  9. **Alur Kas**: Rincian alur penerimaan dan pengeluaran kas bulanan sebagai dasar batas realisasi belanja di BKU.
  10. **Ekspor Excel & PDF**: Dokumen dapat dicetak ke format PDF siap tanda tangan atau diunduh dalam file Excel untuk pengarsipan.

---

## 3. Komponen Perubahan

1. **System Prompt (`app/Services/Ai/CopilotService.php`)**:
   - Menambahkan sub-bab khusus: `e. PANDUAN KHUSUS RKAS AWAL / MURNI & REKAPAN CETAK (LENGKAP 3 PILAR):` di dalam method `buildSystemPrompt()`.
   - Menyesuaikan penomoran sub-bab berikutnya:
     - `f. PANDUAN TROUBLESHOOTING UMUM`
     - `g. ATURAN KERAHASIAAN SISTEM & STRICT ZERO INTERNAL URL PATH RULE`
   - Memastikan tidak ada penyebutan URL internal teknis.

2. **Unit Test (`tests/Unit/CopilotSpjTandaTerimaTest.php`)**:
   - Menambahkan test case `test_system_prompt_includes_detailed_rkas_awal_murni_guide()` yang memverifikasi:
     - Istilah Rkas Awal / Murni, pembagian tahap 1 50% dan tahap 2 50%.
     - Tombol Tambah, Salin, Tarik dari ARKAS, Buat Perubahan, Cetak.
     - Alur 4 langkah input belanja (kode kegiatan, kode rekening, uraian, harga satuan, tambah bulan).
     - Menu titik tiga (Edit, Hapus per bulan, Hapus Semua, Detail, Sisip Uraian).
     - Proteksi realisasi BKU.
     - 10 fitur halaman cetak (Tanggal cetak, Rka Tahapan, Rka Tahapan V.1, Rka Rekap, Lembar Kerja 221, Rka Bulanan, Rincian, Grafik Permendikdasmen 8/2026, RP/Payroll dengan Gabung Kegiatan & Pajak, Alur Kas).
