# Design Spec: Standarisasi Panduan Penginputan BKU & Halaman Cetak pada AI Copilot

**Tanggal**: 2026-10-23  
**Topik**: Peningkatan Kualitas Panduan AI Copilot untuk Penginputan BKU Bulanan & Cetak LPJ  
**Target Modul**: `app/Services/Ai/CopilotService.php`, `tests/Unit/CopilotSpjTandaTerimaTest.php`

---

## 1. Latar Belakang & Masalah
Fitur **Penginputan BKU** (Buku Kas Umum Bulanan) dan **Halaman Cetak Rekapitulasi LPJ** merupakan jantung dari operasional penatausahaan keuangan sekolah di SIKAS. Pengguna meminta panduan yang ada distandarisasi dan disempurnakan agar AI Copilot mampu memandu bendahara secara jelas, runtut, dan profesional.

Sesuai konfirmasi pengguna, panduan disusun dalam **3 Pilar Lengkap**:
1. **Pilar 1: Header Saldo Finansial & Menu Operasional BKU** (Tarik/Setor Tunai, Hapus BKU + trik tahap 2, Tarik ARKAS + Analisis Selisih AI, Cari, Tutup BKU).
2. **Pilar 2: Alur Form 3-Langkah Tambah Pembelanjaan & Kolom Aksi Tabel Belanja** (Identitas rekanan/toko, Uraian RKAS + Asisten AI Uraian, Kalkulasi Pajak Otomatis, serta Aksi Edit, Lapor Pajak NTPN, Detail, Hapus).
3. **Pilar 3: Panduan Lengkap 11 Tab Halaman Cetak & Pelaporan LPJ Kas** (Buku Bank, Buku Kas Tunai, BKU, Buku Pajak, ROB, Reg Penutupan Kas, BA Penutupan Kas, Realisasi, Rek. Realisasi, BHP, BHM, serta fitur Pra-Audit AI, Check Saldo Awal, Check STS, dan Ekspor PDF/Excel).

---

## 2. Struktur Panduan Resmi yang Disempurnakan

### Pilar 1: Header Saldo Finansial & Menu Operasional Halaman BKU
- **Cara Akses**: Klik kartu bulan yang aktif pada menu Penatausahaan (setelah penerimaan dana diinput dan bulan sebelumnya telah ditutup buku).
- **4 Kartu Informasi Saldo Finansial**:
  1. **Total Dana Tersedia**: Akumulasi total dana tunai di kas bendahara dan non-tunai di rekening bank yang siap dibelanjakan.
  2. **Bisa Dibelanjakan**: Pagu anggaran belanja RKAS bulan berjalan yang masih tersedia dan belum direalisasikan.
  3. **Sudah Dibelanjakan**: Total realisasi belanja kas maupun non-tunai yang sudah dibukukan pada bulan berjalan.
  4. **Bisa Dianggarkan Ulang**: Sisa alokasi pagu belanja bulan ini yang belum terpakai ditambah dengan akumulasi sisa belanja bulan-bulan sebelumnya yang belum direalisasikan.
- **Menu & Tombol Operasional di Halaman BKU**:
  - **Tarik Tunai**: Mengambil dana dari rekening bank ke kas tunai bendahara (wajib sesuai tanggal dan nominal penarikan pada rekening koran).
  - **Setor Tunai**: Menyetorkan kembali sisa kas fisik tunai ke rekening bank (wajib sesuai bukti setor rekening koran).
  - **Hapus BKU**: Menghapus seluruh transaksi belanja pada bulan tersebut secara massal (penerimaan dana, tarik tunai, dan setor tunai tidak ikut terhapus karena dikelola via tombol aksi per baris).  
    *Tips Khusus Tahap 2:* Jika penerimaan dana Tahap 2 tercatat di atas bulan Juli (misal Agustus) dan Anda ingin menghapus penganggaran RKAS Perubahan: hapus penerimaan dana di bulan Agustus, input kembali penerimaan dana Tahap 2 di bulan Juli, lalu hapus penerimaan dana di bulan Juli tersebut agar status bulan Juli kembali terbuka untuk menghapus RKAS Perubahan.
  - **Tarik dari ARKAS**: Menarik data transaksi BKU bulan berjalan langsung dari database aplikasi desktop ARKAS. Dilengkapi fitur **Analisis Selisih AI** untuk menganalisis dan mendeteksi selisih transaksi antara SIKAS dan ARKAS sebelum eksekusi tarik data, sehingga terhindar dari salah tarik atau data tertimpa secara keliru.
  - **Cari**: Kotak pencarian transaksi belanja berdasarkan kata kunci uraian belanja dan kode/nama rekening.
  - **Tutup BKU**: Menutup pembukuan kas bulan tersebut secara sah dengan memilih tanggal penutupan kas, menginput pendapatan bunga bank / jasa giro, dan menginput potongan pajak bunga bank sesuai rekening koran.

### Pilar 2: Alur Form 3-Langkah Tambah Pembelanjaan & Kolom Aksi Tabel Belanja
- **Alur 3 Langkah Input Belanja**:
  - **Langkah 1 (Identitas Transaksi & Rekanan / Penerima)**:
    - Masukkan **Tanggal Transaksi** dan pilih **Jenis Transaksi** (*Tunai* atau *Non-Tunai*).
    - Centang opsi *"Bukan Toko / Perusahaan"* jika pembayaran dilakukan kepada perorangan (guru honorer, narasumber, upah tukang, panitia kegiatan): masukkan Nama Penerima, Alamat, Nomor HP (opsional), dan NPWP (opsional, centang tombol *Tidak Punya NPWP* jika tidak ada).
    - Jika pembayaran melalui badan usaha/toko, jangan centang opsi tersebut dan masukkan **Nama Toko** beserta alamatnya.
    - Klik tombol *"Lanjut"*.
  - **Langkah 2 (Rincian Anggaran & Belanja RKAS)**:
    - Masukkan **Nomor Nota** (opsional, jika dikosongkan sistem otomatis membuat format kuitansi *BPU-001* dst).
    - **Tanggal Nota** (otomatis default dan tidak perlu diubah).
    - Pilih **Kode Kegiatan** dan **Kode Rekening Belanja**.
    - Masukkan **Uraian Belanja Opsional** (jika dikosongkan, sistem otomatis mengambil uraian nama rekening belanja. Anda juga dapat menekan tombol **"Asisten AI"** untuk membuat kalimat uraian kuitansi naratif secara otomatis).
    - Centang item belanja RKAS yang ingin direalisasikan (bisa memilih satu atau seluruh item rincian).
    - Masukkan **Volume Belanja** yang direalisasikan (sistem otomatis menghitung sisa volume akumulatif yang belum terpakai dari bulan-bulan sebelumnya dan bulan berjalan).
    - Klik tombol *"Lanjut"*.
  - **Langkah 3 (Kalkulasi Pajak Otomatis & Penyimpanan)**:
    - Sistem menampilkan rincian kalkulasi pajak. Pajak pusat (PPh 21, PPh 23, PPN) atau pajak daerah tercentang otomatis sesuai ketentuan kode rekening belanja yang dipilih.
    - Periksa total belanja kotor, potongan pajak, dan nominal bersih, lalu klik **"Simpan"**.
- **Kolom Aksi pada Tabel Transaksi Belanja**:
  - **Edit**: Mengubah rincian belanja, volume, atau data rekanan jika belum dilakukan tutup buku.
  - **Lapor Pajak**: Tombol khusus yang muncul pada transaksi belanja yang memiliki potongan pajak. Digunakan untuk mencatat bukti setoran pajak ke kas negara (mengisi formulir Tanggal Lapor Pajak, Kode Billing / Masa Pajak, dan NTPN).
  - **Detail**: Menampilkan lembar rincian lengkap kuitansi transaksi beserta daftar rincian barang.
  - **Hapus**: Menghapus baris transaksi belanja yang dipilih.

### Pilar 3: Panduan Lengkap 11 Tab Halaman Cetak & Pelaporan LPJ Kas
Tombol **Cetak** pada halaman BKU mengarahkan bendahara ke halaman Rekapitulasi Kas & Pelaporan LPJ yang memuat 11 tab dokumen resmi:
1. **Buku Kas Bank (BKP Bank)**: Mencatat seluruh mutasi kas di bank, penerimaan transfer dana, pendapatan bunga, pajak bunga, tarik tunai, dan belanja non-tunai sesuai rekening koran bank. Wajib dicetak sebagai lampiran LPJ.
   - *Fitur Cerdas di dalamnya:*
     - **Pra-Audit AI**: Menilai indeks kepatuhan buku kas bank terhadap regulasi untuk mencegah temuan audit inspektorat/BPK.
     - **Check Saldo Awal**: Memastikan saldo awal kas bank sudah tercatat klop dengan rekening koran.
     - **Check STS**: Mengeluarkan dan memverifikasi bunga bank/jasa giro mengendap yang disetorkan ke kas daerah melalui fitur STS.
     - **Ekspor Excel & Cetak PDF**: Cetak PDF fleksibel dengan pilihan periode (bulanan, Tahap 1, Tahap 2, tahunan), ukuran kertas, orientasi, dan ukuran font.
2. **Buku Kas Pembantu Tunai**: Mencatat seluruh aliran kas fisik tunai bendahara (penarikan tunai, belanja tunai, dan setor tunai). Dilengkapi fitur Pra-Audit AI, Ekspor Excel, dan Cetak PDF.
3. **Buku Kas Umum (BKU)**: Buku induk kas yang merangkum gabungan seluruh transaksi kas tunai, bank, belanja, dan mutasi. Dilengkapi fitur Pra-Audit AI, Ekspor Excel, dan Cetak PDF.
4. **Buku Kas Pajak (BKP Pajak)**: Mencatat rincian pemotongan dan penyetoran pajak (PPh 21, PPh 23, PPN, dan Pajak Daerah) per transaksi kuitansi. Dilengkapi fitur Pra-Audit AI, Ekspor Excel, dan Cetak PDF.
5. **ROB (Rincian Objek Belanja)**: Rekapitulasi realisasi belanja yang dikelompokkan berdasarkan kode rekening objek belanja. Dilengkapi fitur Pra-Audit AI, Ekspor Excel, dan Cetak PDF.
6. **Registrasi Penutupan Kas**: Lembar register resmi penutupan kas bulanan.
7. **Berita Acara Penutupan Kas (BA)**: Berita acara rekonsiliasi kas fisik dan kas bank pada akhir bulan yang ditandatangani oleh Kepala Sekolah dan Bendahara.
8. **Realisasi**: Laporan realisasi anggaran belanja per sub-kegiatan program sekolah.
9. **Rek. Realisasi**: Rekapitulasi perbandingan pagu anggaran vs realisasi belanja.
10. **BHP (Barang Habis Pakai)**: Laporan inventarisasi realisasi belanja barang pakai habis.
11. **BHM (Belanja Modal)**: Laporan pengadaan barang modal / aset tetap sekolah.

---

## 3. Strict Rules & Guardrails
- **Strict Zero Internal URL Path Rule**: Dilarang keras memunculkan link teknis internal seperti `/penatausahaan/bku`, `/penatausahaan/rekapitulasi`, `/bku`, dll. Seluruh instruksi merujuk pada nama menu dan tombol visual aplikasi.
- **Kerahasiaan & Personalisasi**: Sapaan ramah dan santai khas bendahara ("Siap Om!", "Om", "Bos"), dilarang menyebut nama asli pengguna ("Moh Gian Darsana").
- **Tabel & Bullet Points Rapi**: Menggunakan formatting markdown elegan dan mudah dibaca.
