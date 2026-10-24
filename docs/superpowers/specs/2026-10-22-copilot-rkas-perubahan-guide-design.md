# Design Spec: Panduan Lengkap RKAS Perubahan & Rekapan Cetak pada SIKAS AI Copilot

- **Tanggal**: 2026-10-22
- **Topik**: Standarisasi Panduan RKAS Perubahan (Menu Utama, Alur 4 Langkah Input, Rekaman Perubahan, dan 11 Fitur Cetak) pada AI Copilot
- **Status**: Disetujui Pengguna (User Approved)

---

## 1. Latar Belakang & Kebutuhan
Setelah semester 1 berjalan dan Buku Kas Umum (BKU) bulan Juni ditutup, sekolah dapat melakukan pergeseran atau penyesuaian anggaran melalui modul **RKAS Perubahan**. 

Pengguna menghendaki panduan RKAS Perubahan pada AI Copilot distandarisasi dengan struktur 3 pilar yang rapi, profesional, dan mudah dipahami:
1. **Pilar 1: Penjelasan Halaman & Menu/Tombol Utama RKAS Perubahan** (termasuk syarat Buat Perubahan, Rekaman Perubahan, dan integrasi Tarik ARKAS).
2. **Pilar 2: Alur 4 Langkah Input & Pengelolaan Belanja RKAS Perubahan** (termasuk form belanja, pengelolaan alokasi bulan, tombol titik tiga, dan proteksi BKU).
3. **Pilar 3: Panduan Lengkap Halaman Rekapan & Cetak RKAS Perubahan (11 Fitur Cetak Dokumen)** (termasuk Rka Tahapan V.2 dan format komparasi bertambah/berkurang).

Seluruh panduan tetap mematuhi prinsip keamanan: **Strict Zero Internal URL Path Rule** (tidak memunculkan tautan teknis `/rkas-perubahan/...` atau URL sistem apa pun).

---

## 2. Struktur Teks Panduan Resmi

### Bagian 1: Pengenalan Halaman & Menu/Tombol Utama RKAS Perubahan
- **Fungsi Utama**: Fitur RKAS Perubahan berfungsi untuk membuat perencanaan pergeseran atau revisi anggaran belanja BOSP.
- **Cara Membuat & Mengakses**:
  - Pengguna mengklik tombol **"Buat Perubahan"** pada halaman RKAS Awal/Murni (syarat: Buku Kas Umum/BKU bulan Juni sudah ditutup). Seluruh data RKAS Awal/Murni otomatis disalin ke lembar kerja RKAS Perubahan.
  - Setelah dibuat, pengguna juga dapat mengaksesnya langsung dari menu Penganggaran dengan mengklik tombol **"Detail RKAS"** pada kartu anggaran bertanda badge *"Perubahan"*, atau tombol *"Lihat Perubahan"* di halaman RKAS Murni.
- **Informasi Kartu (Card)**:
  - *Card Pagu Dana BOSP*: Total pagu anggaran tahunan BOSP.
  - *Card Anggaran Tahap 1 & Tahap 2*: Menampilkan alokasi 50% Tahap 1 dan 50% Tahap 2 serta sisa anggaran yang belum dialokasikan.
  - *Tab Tabel Bulan*: Navigasi belanja dari Januari sampai Desember.
- **Penjelasan Tombol / Menu Utama di Header**:
  - **Tambah (Tombol Hijau)**: Menambah perencanaan belanja kegiatan baru pada RKAS Perubahan.
  - **Tarik dari ARKAS Online**: Menarik data RKAS Perubahan yang telah disahkan langsung dari database ARKAS Online dan menyalinnya ke sistem SIKAS.
  - **Perubahan (Aktif)**: Indikator visual bahwa lembar kerja yang dibuka adalah versi RKAS Perubahan.
  - **Rekaman Perubahan**: Berfungsi untuk melihat riwayat/log lengkap seluruh perubahan yang telah dilakukan (setiap aktivitas menghapus data, menambahkan belanja baru, dan melakukan update data belanja seluruhnya tercatat di sini).
  - **Cetak**: Masuk ke halaman Rekapan & Cetak RKAS Perubahan untuk melihat komparasi perubahan dan mencetak dokumen verifikasi resmi.

---

### Bagian 2: Alur 4 Langkah Input & Pengelolaan Belanja RKAS Perubahan
- **Langkah ke 1 : Masuk ke Halaman RKAS Perubahan**
  - Klik tombol **"Detail RKAS"** pada kartu anggaran Perubahan di menu Penganggaran (atau klik tombol **"Buat Perubahan"** / **"Lihat Perubahan"** di RKAS Murni).
- **Langkah ke 2 : Tambah Kegiatan Perencanaan Perubahan**
  - Klik tombol **"Tambah"** (berwarna hijau) di bagian atas kanan.
  - Lengkapi formulir perencanaan:
    * *Kegiatan*: Pilih kode kegiatan yang menjadi dasar perencanaan belanja.
    * *Rekening*: Pilih kode rekening belanja yang dituju.
    * *Uraian*: Masukkan uraian barang/jasa yang direncanakan (misal: *Kertas HVS*).
    * *Harga Satuan*: Masukkan harga satuan belanja (misal: *80.000*).
    * *Tambah Bulan*: Tentukan bulan pelaksanaan belanja, masukkan volume (misal: *10*), dan satuan belanja (misal: *Rim*).
  - Pastikan semua bulan yang dianggarkan sudah benar lalu klik **"Simpan"** agar belanja tersimpan di tabel bulan.
- **Langkah ke 3 : Verifikasi pada Tabel Bulan**
  - Klik tab tabel bulan di bagian bawah (Januari s.d. Desember) untuk memeriksa rincian belanja yang telah dialokasikan pada masing-masing bulan.
- **Langkah ke 4 : Pengelolaan Menu Aksi (Titik Tiga `...`)**
  - Pada setiap baris belanja di tabel bulan, terdapat tombol titik tiga di kolom aksi:
    * **Menu Edit**: Berfungsi mengedit kegiatan, rekening, harga satuan, volume, satuan, serta mengelola alokasi bulan:
      - *Hapus per bulan*: Klik ikon tempat sampah / silang merah pada kartu bulan tertentu jika ingin menghapus belanja pada bulan tersebut saja (misal: hapus alokasi di bulan Desember).
      - *Hapus Semua*: Klik tombol **"Hapus Semua"** (berwarna merah di bagian atas form) untuk menghapus belanja tersebut secara keseluruhan dari Januari s.d. Desember.
      - *Proteksi BKU*: Data belanja yang sudah direalisasikan pada Buku Kas Umum (BKU) tidak dapat diedit atau dihapus.
    * **Menu Detail**: Menampilkan rincian data perencanaan belanja yang sudah tersimpan.
    * **Menu Sisipkan Uraian**: Menyisipkan uraian belanja baru pada kegiatan dan rekening belanja yang sama tanpa perlu memilih ulang kode kegiatan dan rekening.

---

### Bagian 3: Panduan Lengkap Halaman Cetak RKAS Perubahan (11 Fitur Cetak)
Saat tombol **Cetak** diklik, pengguna diarahkan ke halaman Rekapan RKAS Perubahan. Halaman ini memuat:
- **Menu Tanggal Cetak**: Tombol hijau di sudut kanan atas untuk mengisi tanggal cetak atau tanggal pengesahan RKAS Perubahan (berlaku seragam untuk seluruh tab dokumen cetak).
- **11 Format Dokumen & Fitur Cetak**:
  1. **Rka Tahapan**: Format standar komparasi perubahan per tahapan. Menampilkan rincian kegiatan *Sebelum Perubahan*, *Sesudah Perubahan*, serta kolom *Bertambah / (Berkurang)*. Nilai bertambah dan berkurang akan tampil seimbang sehingga pergeseran anggaran terlihat jelas. Klik "Pengaturan Cetak" untuk memilih ukuran kertas, orientasi, dan font sebelum mencetak.
  2. **Rka Tahapan V.1**: Format standar RKAS dengan rincian volume yang dipecah secara eksplisit ke dalam kolom Tahap 1 dan Tahap 2.
  3. **Rka Tahapan V.2**: Format standar alternatif RKAS tahapan dengan rincian komparasi belanja per tahapan.
  4. **Rka Rekap**: Rekapitulasi anggaran per rekening belanja (Barang, Jasa, Perjalanan Dinas, Pemeliharaan, Modal) sebagai lampiran utama pengesahan perubahan.
  5. **Lembar Kerja 221**: Rincian anggaran belanja langsung menurut program dan kegiatan unit kerja (Formulir Resmi 2.2.1).
  6. **Rka Bulanan**: Format RKAS Perubahan yang menampilkan rincian belanja per bulan.
  7. **Rincian Perubahan**: Rincian belanja yang dipisahkan berdasarkan uraian kode kegiatan, dilengkapi opsi filter cetak dan ekspor Excel.
  8. **Grafik**: Analisis proporsi per kegiatan sesuai Permendikdasmen Nomor 8 Tahun 2026 (Buku min. 10%, Honor maks. 20% Negeri / 40% Swasta, Pemeliharaan Sarpras maks. 20%, dan proporsi antar jenis belanja).
  9. **RP (Rincian Pencairan / Payroll)**: Rincian belanja non-tunai transfer bank dengan potongan pajak otomatis. Memiliki menu: *Gabung Kegiatan*, *Edit* (nama penerima, jabatan, rekening, bank, status ASN/Non ASN, status NPWP, hitung pajak PPh 21, PPh 23, PPN otomatis), *Detail*, *Batal Gabung*, dan *Tambah Nomor Kwitansi*.
  10. **Alur Kas**: Digunakan sebagai dasar realisasi belanja berdasarkan kegiatan yang sudah diinput pada RKAS Perubahan.
  11. **Ekspor Excel & PDF**: Seluruh format dokumen di atas dapat dicetak langsung ke PDF atau diekspor ke file Excel.

---

## 3. Komponen Perubahan

1. **System Prompt (`app/Services/Ai/CopilotService.php`)**:
   - Menambahkan sub-bab khusus: `f. PANDUAN KHUSUS RKAS PERUBAHAN & REKAPAN CETAK (LENGKAP 3 PILAR):` di dalam method `buildSystemPrompt()`.
   - Menyesuaikan penomoran sub-bab berikutnya:
     - `g. PANDUAN TROUBLESHOOTING UMUM`
     - `h. ATURAN KERAHASIAAN SISTEM & STRICT ZERO INTERNAL URL PATH RULE`
   - Memastikan tidak ada URL path internal sistem yang bocor.

2. **Unit Test (`tests/Unit/CopilotSpjTandaTerimaTest.php`)**:
   - Menambahkan test case `test_system_prompt_includes_detailed_rkas_perubahan_guide()` yang memverifikasi:
     - Istilah Rkas Perubahan, tombol Buat Perubahan (syarat BKU Juni ditutup), Rekaman perubahan.
     - Tarik dari arkas online (database ARKAS).
     - Alur 4 langkah input belanja perubahan.
     - Menu titik tiga (edit, detail, sisip uraian, hapus semua tombol merah, proteksi BKU).
     - 11 format cetak (Tanggal cetak, Rka tahapan sebelum & sesudah perubahan seimbang bertambah berkurang, Rka tahapan v.1, Rka tahapan v.2, Rka rekap, Lembar kerja 221, Rka bulanan, Rincian perubahan, Grafik Permendikdasmen 8/2026, RP/Payroll dengan Gabung Kegiatan & Pajak, Alur kas).
