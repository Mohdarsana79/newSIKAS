# Design Spec: Integrasi Berita Acara Pemeriksaan Kas ke SIKAS AI Copilot

## 1. Konteks & Tujuan
SIKAS AI Copilot sebelumnya telah dilengkapi dengan kemampuan membaca dan menyajikan **Register Penutupan Kas (Formulir BOS-K7B)**. Selain formulir K7B, dokumen krusial lain dalam penutupan buku kas bendahara sekolah adalah **Berita Acara Pemeriksaan Kas (BA Penutupan / Pemeriksaan Kas)**.

Berita Acara Pemeriksaan Kas merupakan dokumen legal formal yang memuat:
1. Hari dan tanggal pemeriksaan kas fisik.
2. Identitas pejabat pemeriksa (Kepala Sekolah) beserta nomor dan tanggal SK penunjukan.
3. Identitas pejabat yang diperiksa (Bendahara BOS) beserta nomor dan tanggal SK penugasan.
4. Rincian hasil penghitungan uang fisik di hadapan Bendahara (uang kertas & logam di brankas, saldo rekening bank, dan surat berharga).
5. Pembandingan dengan saldo uang menurut Buku Kas Umum (BKU).
6. Rekonsiliasi perbedaan saldo kas dan saldo buku serta pernyataan kesimpulan pemeriksaan.

Tujuan dari fitur ini adalah memungkinkan Kepala Sekolah, Bendahara, maupun auditor untuk menanyakan informasi Berita Acara Pemeriksaan Kas bulanan langsung kepada AI Copilot secara interaktif, akurat, dan sesuai dengan dokumen fisik PDF resmi yang dihasilkan oleh `BeritaAcaraPenutupanController`.

---

## 2. Arsitektur Solusi

### 2.1 Tool AI Copilot
Menambahkan fungsi tool baru pada `CopilotService::getAvailableTools()`:
- **Nama Tool:** `get_berita_acara_penutupan_kas_monthly`
- **Deskripsi:** Mengambil data resmi Berita Acara Pemeriksaan Kas bulanan. Menyajikan data legalitas SK Kepala Sekolah & Bendahara, tanggal & hari pemeriksaan, hasil hitung kas tunai brankas, saldo rekening bank, saldo Buku Kas Umum (BKU), serta rekonsiliasi selisih kas. Digunakan saat pengguna menanyakan "Berita acara penutupan kas", "Berita acara pemeriksaan kas", "Pemeriksaan kas bendahara", atau legalitas penutupan kas bulanan.
- **Parameter:**
  - `bulan` (string, enum: Januari, Februari, Maret, April, Mei, Juni, Juli, Agustus, September, Oktober, November, Desember).
  - `tahun` (integer, e.g. 2025).

### 2.2 Backend Logic (`CopilotService::getBeritaAcaraPenutupanKasMonthly`)
Menggunakan instance `new BukuKasService($variant)` dan model dinamis `VariantConfig::getModelClass(..., $variant)`:
1. **Penganggaran & Sekolah:**
   - Mengambil data penganggaran aktif sesuai `tahun_anggaran`.
   - Mengambil identitas pejabat:
     - Kepala Sekolah: `kepala_sekolah`, `nip_kepala_sekolah`, `sk_kepala_sekolah`, `tanggal_sk_kepala_sekolah`.
     - Bendahara: `bendahara`, `nip_bendahara`, `sk_bendahara`, `tanggal_sk_bendahara`.
   - Mengambil lokasi: `kecamatan` dan `nama_sekolah` dari relasi atau `SekolahProfile`.
2. **Status Tutup BKU & Penanggalan:**
   - Cek record bunga (`is_bunga_record = true`) pada bulan & tahun terkait.
   - Jika ada dan memiliki `tanggal_tutup`, status adalah `"Resmi Ditutup"` dengan tanggal tersebut.
   - Jika tidak ada, status adalah `"Draft Posisi Berjalan"` dengan tanggal akhir bulan.
   - Menentukan nama hari dalam Bahasa Indonesia (`Minggu`, `Senin`, `Selasa`, `Rabu`, `Kamis`, `Jumat`, `Sabtu`).
3. **Perhitungan Keuangan:**
   - `uang_kertas_logam`: Kas tunai brankas dari `BukuKasService::getSaldoKasFromPembantu()`.
   - `saldo_bank`: Saldo rekening bank dari `BukuKasService::hitungSaldoAkhirBkpBank()`.
   - `surat_berharga`: 0 (nihil).
   - `total_kas_hitung`: `uang_kertas_logam` + `saldo_bank`.
   - `saldo_buku`: Saldo BKU dari `BukuKasService::getDataFromBkpUmumCalculation()` (`totalPenerimaan - totalPengeluaran`).
4. **Rekonsiliasi & Audit:**
   - `selisih_total`: `total_kas_hitung - saldo_buku` (ideal: Rp 0 / Klop).
   - `selisih_buku_tunai`: `saldo_buku - uang_kertas_logam` (merepresentasikan sisa dana di rekening bank).
   - `is_balanced`: `abs(selisih_total) == 0`.
   - `is_cash_limit_exceeded`: `uang_kertas_logam > 10000000`.
   - `sk_kepsek_lengkap`: bool cek apakah nomor SK & tanggal SK ada.
   - `sk_bendahara_lengkap`: bool cek apakah nomor SK & tanggal SK ada.

---

## 3. Format Penyajian di Copilot System Prompt
AI Copilot diinstruksikan menyajikan format naratif resmi:

1. **Header & Badge:**
   - `### BERITA ACARA PEMERIKSAAN KAS`
   - Badge status: `[STATUS: RESMI DITUTUP]` atau `[STATUS: DRAFT POSISI BERJALAN]`
2. **Klausul Naratif Legalitas:**
   - *"Pada hari ini, **[Nama Hari]** tanggal **[Tanggal Pemeriksaan]**, yang bertanda tangan di bawah ini Kepala Sekolah yang ditunjuk berdasarkan Surat Keputusan No. **[SK Kepsek]** Tanggal **[Tgl SK Kepsek]**:*
     - *Nama: **[Nama Kepala Sekolah]** (NIP. [NIP])*
     - *Jabatan: Kepala Sekolah*
     *Melakukan pemeriksaan kas kepada:*
     - *Nama: **[Nama Bendahara]** (NIP. [NIP])*
     - *Jabatan: Bendahara BOS*
     *Yang berdasarkan Surat Keputusan No. **[SK Bendahara]** Tanggal **[Tgl SK Bendahara]** ditugaskan dengan pengurusan uang Bantuan Operasional Sekolah (BOS)."*
3. **Hasil Pemeriksaan Kas Fisik di Hadapan Bendahara (Tabel):**
   - a) Uang kertas dan uang logam: **Rp [...]**
   - b) Saldo Bank: **Rp [...]**
   - c) Surat Berharga dll: **Rp 0**
   - **Jumlah Kas Dihitung (a + b + c): Rp [...]**
   - **Saldo Uang Menurut Buku Kas Umum: Rp [...]**
4. **Pernyataan Hasil Rekonsiliasi:**
   - Konfirmasi apakah kas fisik seimbang dengan saldo BKU (Klop / Selisih Rp 0).
   - Penjelasan bahwa perbedaan antara saldo buku dan kas tunai fisik adalah saldo yang masih tersimpan di rekening bank.
5. **Smart Insights & Rekomendasi:**
   - Peringatan jika kas tunai > Rp 10.000.000 (aturan limit tunai BOSP).
   - Peringatan jika SK pejabat belum terisi lengkap di master penganggaran.
   - Pengingat pemeriksaan fisik sebelum "Tutup BKU" jika status masih draft.

---

## 4. Rencana Verifikasi & Testing
1. **Unit / Direct Method Test:** Menguji `getBeritaAcaraPenutupanKasMonthly` langsung pada bulan yang sudah ditutup resmi (Maret 2025) dan bulan yang belum ditutup (Januari 2025 / Juli 2025).
2. **Chat Simulation Test:** Menguji interaksi chat dengan pengguna memanggil prompt:
   - *"Tampilkan berita acara penutupan kas bulan Maret 2025"*
   - *"Bagaimana berita acara pemeriksaan kas bulan Januari 2025?"*
3. **Pint / Linter:** Memastikan format kode PHP lulus `vendor/bin/pint` dan `php -l`.
