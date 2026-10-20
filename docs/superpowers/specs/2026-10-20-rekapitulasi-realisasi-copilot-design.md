# Design Spec: Integrasi Rekapitulasi Realisasi ke SIKAS AI Copilot

## 1. Konteks & Tujuan
Setelah SIKAS AI Copilot berhasil dilengkapi dengan penyajian data penutupan kas (Register Penutupan Kas BOS-K7B dan Berita Acara Pemeriksaan Kas), pengguna kini membutuhkan penyajian data **Rekapitulasi Realisasi Penggunaan Dana BOSP**.

Dalam tata kelola keuangan sekolah, terdapat dua bentuk rekapitulasi realisasi belanja:
1. **Rekapitulasi Realisasi Penggunaan Dana BOSP (Formulir BOS K-7A)**:
   - Memetakan seluruh realisasi belanja Buku Kas Umum (BKU) ke dalam **8 Standar Nasional Pendidikan** (Standar Kompetensi Lulusan, Isi, Proses, PTK, Sarpras, Pengelolaan, Pembiayaan, Penilaian).
   - Menghubungkan belanja dengan **11 Komponen Penggunaan Dana BOS** (PPDB, Perpustakaan, Pembelajaran, Asesmen, Administrasi, Profesi PTK, Daya & Jasa, Pemeliharaan Sarpras, Multimedia, Bursa Kerja/Praktik, Honor).
   - Menyajikan **Ringkasan Arus Keuangan**: Saldo periode sebelumnya, total penerimaan periode ini, total penggunaan periode ini, dan sisa saldo akhir periode ini.
   - Fleksibel terhadap periode: **Tahunan** (1 tahun anggaran), **Tahapan** (Tahap 1 / Tahap 2), maupun **Bulanan** (Januari s/d Desember).
2. **Rekapitulasi Realisasi Belanja Per Rekening Belanja (LK 2)**:
   - Mengelompokkan belanja ke dalam pos operasional dan modal:
     - Belanja Operasi: Belanja Barang Pakai Habis (`5.1.02.01`), Belanja Barang & Jasa (`5.1.02.02`, `5.1.02.03`, `5.1.02.04`).
     - Belanja Modal: Belanja Modal Peralatan dan Mesin (`5.2.02`), Belanja Modal Aset Tetap Lainnya (`5.2.05`).
   - Menyajikan total belanja dan rasio perbandingan belanja operasi vs modal.

Tujuan dari fitur ini adalah memungkinkan Kepala Sekolah, Bendahara, auditor, atau dinas untuk menanyakan informasi rekapitulasi realisasi belanja secara cepat, transparan, dan akurat melalui SIKAS AI Copilot.

---

## 2. Arsitektur Solusi

### 2.1 Tool AI Copilot
Menambahkan dua deklarasi tool baru pada `CopilotService::getAvailableTools()`:

#### A. `get_rekapitulasi_realisasi_bosp`
- **Deskripsi:** Mengambil data resmi Rekapitulasi Realisasi Penggunaan Dana BOSP (Formulir BOS K-7A) pada tahun anggaran aktif berdasarkan periode tertentu (Tahunan, Tahap 1, Tahap 2, atau nama bulan Januari s/d Desember). Menyajikan ringkasan arus kas (saldo sebelumnya, penerimaan, penggunaan, sisa saldo), rincian serapan per 8 Standar Nasional Pendidikan, serta serapan per 11 Komponen Penggunaan Dana BOS. Panggil tool ini saat pengguna bertanya tentang rekapitulasi realisasi penggunaan dana BOSP, rekapitulasi 8 standar, evaluasi komponen BOS, serapan anggaran tahap 1/2, atau formulir K-7A.
- **Parameters:**
  - `periode` (string, default "Tahunan", opsional: "Tahunan", "Tahap 1", "Tahap 2", atau nama bulan "Januari", "Februari", dst).
  - `tahun` (integer, opsional, default: tahun aktif).

#### B. `get_rekapitulasi_realisasi_per_rekening`
- **Deskripsi:** Mengambil data resmi Rekapitulasi Realisasi Belanja Per Rekening Belanja (Format LK 2) pada tahun anggaran aktif. Menyajikan perincian realisasi belanja operasi (pakai habis, barang & jasa) dan belanja modal (peralatan & mesin, aset tetap lainnya) beserta rasio persentasenya. Panggil tool ini saat pengguna bertanya tentang rekapitulasi belanja per rekening, rekap belanja modal vs operasi, realisasi belanja barang pakai habis, atau format LK 2.
- **Parameters:**
  - `periode` (string, default "Tahunan", enum: ["Tahunan", "Tahap 1", "Tahap 2"]).
  - `tahun` (integer, opsional, default: tahun aktif).

---

### 2.2 Backend Logic (`CopilotService.php`)

#### A. Method `getRekapitulasiRealisasiBosp(int $tahun, string $periode, string $variant): array`
1. **Resolusi Periode & Bulan Target:**
   - Deteksi jenis laporan (`tahunan`, `tahap`, `bulanan`) dari string `$periode`.
   - Bulan target:
     - Tahunan: `[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]`
     - Tahap 1: `[1, 2, 3, 4, 5, 6]`
     - Tahap 2: `[7, 8, 9, 10, 11, 12]`
     - Bulanan: `[$bulanAngka]`
2. **Pengambilan & Pemetaan Transaksi BKU:**
   - Transaksi BKU non-bunga pada bulan target diambil dengan relasi `kodeKegiatan` dan `rekeningBelanja`.
   - Pemetaan ke **8 Standar Nasional Pendidikan** (prefix kode `01.` s/d `08.`).
   - Pemetaan ke **11 Komponen Penggunaan Dana BOS** (prefix kode kegiatan PPDB, perpustakaan, honor, administrasi, dll).
3. **Perhitungan Ringkasan Arus Keuangan:**
   - `saldo_periode_sebelumnya`: Saldo kumulatif sebelum bulan target pertama.
   - `total_penerimaan_periode_ini`: Jumlah penerimaan dana BOS & transfer pada bulan target.
   - `total_penggunaan_periode_ini`: Total realisasi belanja BKU pada bulan target.
   - `akhir_saldo_periode_ini`: `saldo_periode_sebelumnya + total_penerimaan_periode_ini - total_penggunaan_periode_ini`.
4. **Penyusunan Data Respons:**
   - Ringkasan arus keuangan.
   - Array 8 Standar Nasional dengan nominal realisasi dan porsi persentase.
   - Array Komponen BOS aktif (hanya yang realisasinya > Rp 0).
   - Identitas lembaga & pejabat (Kepala Sekolah & Bendahara).

#### B. Method `getRekapitulasiRealisasiPerRekening(int $tahun, string $periode, string $variant): array`
1. **Bulan Target:**
   - Tahunan: 1 s/d 12.
   - Tahap 1: 1 s/d 6.
   - Tahap 2: 7 s/d 12.
2. **Pengelompokan Rekening Belanja:**
   - Belanja Pakai Habis: `5.1.02.01`
   - Belanja Barang & Jasa: `5.1.02.02`, `5.1.02.03`, `5.1.02.04`
   - Belanja Modal Peralatan dan Mesin: `5.2.02`
   - Belanja Modal Aset Tetap Lainnya: `5.2.05`
3. **Penyusunan Data Respons:**
   - Subtotal Belanja Operasi, Subtotal Belanja Modal, Grand Total.
   - Persentase belanja operasional vs belanja modal.

---

## 3. Format Penyajian di Copilot System Prompt

### 3.1 Penyajian Rekapitulasi Realisasi BOSP (8 Standar & Komponen BOS / K-7A)
- Header: `### REKAPITULASI REALISASI PENGGUNAAN DANA BOSP` [Periode: {periode}]
- **Tabel Ringkasan Arus Keuangan:**
  `<th>Komponen Arus Kas</th><th style="text-align: right;">Jumlah (Rp)</th>`
  - Saldo Periode Sebelumnya
  - Total Penerimaan Dana BOSP Periode Ini
  - Total Penggunaan / Realisasi Dana BOSP Periode Ini
  - Sisa Saldo Akhir Periode Ini
- **Tabel Realisasi Menurut 8 Standar Nasional Pendidikan:**
  `<th>No</th><th>Standar Nasional Pendidikan</th><th style="text-align: right;">Realisasi (Rp)</th><th style="text-align: right;">Porsi (%)</th>`
  - Menampilkan 8 standar lengkap dengan jumlah dan persentase kontribusi.
- **Rincian Realisasi Menurut Komponen BOS yang Aktif:**
  - Menampilkan komponen yang memiliki serapan belanja > Rp 0 (misal: Pembayaran Honor, Administrasi Kegiatan Sekolah, Sarpras, dsb).
- **Catatan Analisis Audit:**
  - Evaluasi tingkat serapan anggaran pada periode tersebut.
  - Penjelasan sisa dana yang belum terealisasi.
  - Ajakan untuk mencetak lembar formulir BOS K-7A resmi jika diperlukan.

### 3.2 Penyajian Rekapitulasi Belanja Per Rekening (LK 2)
- Header: `### REKAPITULASI REALISASI BELANJA PER REKENING (LK 2)` [Periode: {periode}]
- **Tabel Rekapitulasi Belanja Operasi & Modal:**
  `<th>No</th><th>Jenis Belanja</th><th>Kode Rekening</th><th style="text-align: right;">Realisasi (Rp)</th><th style="text-align: right;">Porsi (%)</th>`
  1. Belanja Barang Pakai Habis (5.1.02.01)
  2. Belanja Barang dan Jasa (5.1.02.02 - 5.1.02.04)
     - *Subtotal Belanja Operasi*
  3. Belanja Modal Peralatan dan Mesin (5.2.02)
  4. Belanja Modal Aset Tetap Lainnya (5.2.05)
     - *Subtotal Belanja Modal*
  - **TOTAL REALISASI BELANJA**
- **Catatan Analisis:**
  - Perbandingan rasio belanja operasi (rutin) vs belanja modal aset fisik sekolah.

---

## 4. Rencana Verifikasi & Testing
1. **Unit / Direct Method Test:** Menguji langsung method `getRekapitulasiRealisasiBosp` dan `getRekapitulasiRealisasiPerRekening` untuk Tahap 1 2025, Tahunan 2025, dan Bulan Maret 2025.
2. **Chat Simulation Test:** Menguji interaksi chat dengan prompt:
   - *"Tampilkan rekapitulasi realisasi penggunaan dana BOSP Tahap 1 tahun 2025"*
   - *"Berapa rekapitulasi belanja per rekening (LK 2) tahun 2025?"*
3. **Linter & Pint:** Memastikan tidak ada lint error dan lolos `vendor/bin/pint`.
