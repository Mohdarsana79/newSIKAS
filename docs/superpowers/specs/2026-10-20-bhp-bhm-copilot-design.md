# Design Spec: Integrasi Laporan BHP dan BHM ke SIKAS AI Copilot

## 1. Konteks & Tujuan
Sebagai bagian dari pertanggungjawaban dana BOSP, sekolah diwajibkan untuk mengelola dan melaporkan rincian barang yang dibeli dengan dana BOSP melalui dua buku pembantu:
1. **Buku Pembantu Barang Habis Pakai (BHP)**:
   - Mencatat seluruh pengadaan barang yang habis dipakai dalam operasional sekolah (ATK, kertas, materai, bahan kebersihan, bahan praktik, konsumsi rapat/MKKS, dsb) dengan kode rekening `5.1.02.01.01%`.
   - Mengontrol kuantitas, harga satuan, dan total realisasi belanja barang habis pakai untuk keperluan buku persediaan barang.
2. **Buku Pembantu Barang Modal / Aset (BHM)**:
   - Mencatat seluruh pengadaan barang modal atau aset tetap sekolah (peralatan, mesin, komputer, tangki semprot, printer, serta buku teks perpustakaan) dengan kode rekening `5.2%` (`5.2.02` untuk peralatan & mesin, `5.2.05` untuk aset tetap lainnya).
   - Menjadi dasar pencatatan aset daerah/sekolah ke dalam Kartu Inventaris Barang (KIB) dan Berita Acara Serah Terima (BAST).

Tujuan dari fitur ini adalah memungkinkan Kepala Sekolah, Bendahara, pengurus barang, auditor, maupun dinas pendidikan menanyakan data realisasi belanja BHP dan BHM secara cepat, detail hingga level volume dan harga satuan, serta akurat melalui SIKAS AI Copilot.

---

## 2. Arsitektur Solusi

### 2.1 Tool AI Copilot
Menambahkan dua deklarasi fungsi tool baru pada `CopilotService::getAvailableTools()`:

#### A. `get_buku_pembantu_bhp`
- **Deskripsi:** Mengambil data resmi Buku Pembantu Barang Habis Pakai (BHP) pada tahun anggaran aktif berdasarkan periode tertentu (Tahunan, Tahap 1, Tahap 2, atau nama bulan Januari s/d Desember). Menyajikan rincian barang habis pakai (ATK, materai, bahan cetak/penggandaan, kebersihan, konsumsi) lengkap dengan tanggal, nomor bukti, volume, satuan, harga satuan, dan total realisasi. Panggil tool ini saat pengguna bertanya tentang laporan BHP, belanja barang habis pakai, daftar pembelian ATK/kertas/materai, atau buku pembantu persediaan barang habis pakai.
- **Parameters:**
  - `periode` (string, default "Tahunan", opsional: "Tahunan", "Tahap 1", "Tahap 2", atau nama bulan "Januari", "Maret", dst).
  - `tahun` (integer, opsional, default: tahun aktif).

#### B. `get_buku_pembantu_bhm`
- **Deskripsi:** Mengambil data resmi Buku Pembantu Barang Modal / Aset (BHM) pada tahun anggaran aktif berdasarkan periode tertentu (Tahunan, Tahap 1, Tahap 2, atau nama bulan tertentu). Menyajikan rincian barang modal atau aset tetap sekolah (peralatan, mesin, buku teks aset perpustakaan) lengkap dengan tanggal, nomor bukti, volume, satuan, harga satuan, total belanja modal, serta kategori rekening belanja (5.2.02 peralatan & mesin vs 5.2.05 aset tetap lainnya). Panggil tool ini saat pengguna bertanya tentang laporan BHM, belanja modal aset, pengadaan peralatan/mesin, buku pembantu barang modal, atau inventaris aset BOSP.
- **Parameters:**
  - `periode` (string, default "Tahunan", opsional: "Tahunan", "Tahap 1", "Tahap 2", atau nama bulan spesifik).
  - `tahun` (integer, opsional, default: tahun aktif).

---

### 2.2 Backend Logic (`CopilotService.php`)

#### A. Method `getBukuPembantuBhp(int $tahun, string $periode, string $variant): array`
1. **Resolusi Periode & Bulan Target:**
   - Tahunan: Bulan 1 s/d 12.
   - Tahap 1: Bulan 1 s/d 6.
   - Tahap 2: Bulan 7 s/d 12.
   - Bulanan: Bulan spesifik (1 s/d 12).
2. **Pengambilan Transaksi BKU BHP:**
   - Query transaksi BKU non-bunga pada tahun dan bulan target yang memiliki relasi `rekeningBelanja` dengan `kode_rekening LIKE '5.1.02.01.01%'`.
   - Mengambil relasi `kodeKegiatan`, `rekeningBelanja`, dan `uraianDetails`.
3. **Penyusunan Rincian Barang:**
   - Melakukan flattening per detail barang (`uraianDetails`):
     - `tanggal`: Tanggal transaksi BKU (`d-m-Y`).
     - `kode_kegiatan`: Kode program kegiatan BKU/detail.
     - `kode_rekening`: Kode rekening belanja BHP.
     - `no_bukti`: Nomor transaksi BKU (`id_transaksi`).
     - `uraian`: Uraian nama barang belanja.
     - `volume`: Kuantitas barang (float/int).
     - `satuan`: Satuan barang (rim, dus, botol, lembar, ok, dll).
     - `harga_satuan`: Harga per unit barang (float).
     - `realisasi`: Subtotal nilai belanja barang (`volume * harga_satuan`).
4. **Ringkasan & Metrik:**
   - `total_realisasi`: Akumulasi nilai belanja BHP.
   - `total_item`: Jumlah baris rincian barang.
   - `identitas`: Sekolah, NPSN, Kecamatan, Kepala Sekolah, dan Bendahara.

#### B. Method `getBukuPembantuBhm(int $tahun, string $periode, string $variant): array`
1. **Resolusi Periode & Bulan Target:** Sama dengan BHP.
2. **Pengambilan Transaksi BKU BHM:**
   - Query transaksi BKU non-bunga pada tahun dan bulan target yang memiliki relasi `rekeningBelanja` dengan `kode_rekening LIKE '5.2%'`.
   - Mengambil relasi `kodeKegiatan`, `rekeningBelanja`, dan `uraianDetails`.
3. **Penyusunan Rincian Barang Modal:**
   - Melakukan flattening per detail barang modal (`uraianDetails`):
     - `tanggal`, `kode_kegiatan`, `kode_rekening`, `no_bukti`, `uraian`, `volume`, `satuan`, `harga_satuan`, `realisasi`.
4. **Klasifikasi Kategori Belanja Modal:**
   - Belanja Modal Peralatan dan Mesin (`5.2.02`).
   - Belanja Modal Aset Tetap Lainnya / Buku Teks Perpustakaan (`5.2.05`).
5. **Ringkasan & Metrik:**
   - `total_realisasi`, `total_item`, `subtotal_peralatan_mesin`, `subtotal_aset_lain`, dan data identitas sekolah.

---

## 3. Format Penyajian di Copilot System Prompt

### 3.1 Penyajian Laporan BHP (Barang Habis Pakai)
- Header: `### BUKU PEMBANTU BARANG HABIS PAKAI (BHP)` [Badge: `BHP`] [Periode: {periode}]
- Metrik Ringkas: Total Realisasi BHP, Jumlah Item Barang.
- Tabel Rincian Belanja Barang (HTML):
  `<th>No</th><th>Tanggal</th><th>Kode Rekening</th><th>No. Bukti</th><th>Uraian Barang</th><th>Kuantitas</th><th style="text-align: right;">Harga Satuan (Rp)</th><th style="text-align: right;">Realisasi (Rp)</th>`
  Lengkap dengan baris **TOTAL REALISASI BHP**.
- Catatan & Rekomendasi:
  - Anjuran pencatatan ke buku persediaan barang sekolah.
  - Saran mencetak dokumen PDF lembar BHP resmi untuk arsip SPJ.

### 3.2 Penyajian Laporan BHM (Barang Modal / Aset)
- Header: `### BUKU PEMBANTU BARANG MODAL / ASET (BHM)` [Badge: `BHM`] [Periode: {periode}]
- Metrik Ringkas: Total Realisasi BHM, Komposisi Peralatan/Mesin vs Aset Lainnya (Buku).
- Tabel Rincian Belanja Modal (HTML):
  `<th>No</th><th>Tanggal</th><th>Kode Rekening</th><th>No. Bukti</th><th>Uraian Barang / Aset</th><th>Kuantitas</th><th style="text-align: right;">Harga Satuan (Rp)</th><th style="text-align: right;">Realisasi (Rp)</th>`
  Lengkap dengan baris **TOTAL REALISASI BHM**.
- Smart Compliance Audit Aset Tetap:
  - Pengingat audit: Seluruh barang modal wajib dicatat ke dalam **KIB (Kartu Inventaris Barang)** dan dibuatkan **BAST (Berita Acara Serah Terima)** agar tertib administrasi aset dan tidak menjadi temuan pengawas/auditor.
  - Saran mencetak dokumen PDF lembar BHM resmi untuk pelaporan inventaris dinas.

### 3.3 Penanganan Kasus Nihil (Rp 0)
- Jika tidak ada transaksi BHP atau BHM pada periode yang diminta, AI mengabarkan secara santai dan jelas bahwa pada periode tersebut belum ada pembelian BHP/BHM, serta menyarankan mengecek periode lain yang memiliki realisasi.

---

## 4. Rencana Verifikasi & Testing
1. **Unit / Direct Method Test:** Menguji langsung `getBukuPembantuBhp` dan `getBukuPembantuBhm` pada tahun 2025 (Tahunan, Tahap 1, dan bulan spesifik).
2. **Chat Simulation Test:** Menguji skenario:
   - *"Tampilkan laporan buku pembantu BHP bulan Maret 2025"*
   - *"Berapa daftar belanja barang modal BHM tahun 2025?"*
   - Kasus nihil: *"Tampilkan laporan BHM bulan Januari 2025"*
3. **Linter & Pint:** Memastikan tidak ada lint error dan format lulus `vendor/bin/pint`.
