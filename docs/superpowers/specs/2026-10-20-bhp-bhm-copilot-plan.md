# Rencana Implementasi: Buku Pembantu BHP dan BHM pada SIKAS AI Copilot

Dokumen ini adalah rencana implementasi langkah demi langkah untuk mengintegrasikan fitur **Buku Pembantu Barang Habis Pakai (BHP)** dan **Buku Pembantu Barang Modal / Aset (BHM)** ke dalam SIKAS AI Copilot sesuai spesifikasi pada [2026-10-20-bhp-bhm-copilot-design.md](file:///c:/laragon/www/newSIKAS2/newSIKAS/docs/superpowers/specs/2026-10-20-bhp-bhm-copilot-design.md).

---

## Task 1: Definisi Tool `get_buku_pembantu_bhp` dan `get_buku_pembantu_bhm` pada `CopilotService`
- **File:** `app/Services/Ai/CopilotService.php`
- **Tindakan:**
  Tambahkan dua deklarasi tool baru ke dalam array `getAvailableTools()`:
  1. `get_buku_pembantu_bhp`:
     - `description`: Mengambil data resmi Buku Pembantu Barang Habis Pakai (BHP) pada tahun anggaran aktif berdasarkan periode tertentu (Tahunan, Tahap 1, Tahap 2, atau nama bulan Januari s/d Desember). Menyajikan rincian barang habis pakai (ATK, materai, bahan cetak/penggandaan, kebersihan, konsumsi) lengkap dengan tanggal, nomor bukti, volume, satuan, harga satuan, dan total realisasi. Panggil tool ini saat pengguna bertanya tentang laporan BHP, belanja barang habis pakai, daftar pembelian ATK/kertas/materai, atau buku pembantu persediaan barang habis pakai.
     - `parameters`:
       - `periode` (string, default: "Tahunan", opsional: "Tahunan", "Tahap 1", "Tahap 2", atau nama bulan "Januari" s/d "Desember").
       - `tahun` (integer, opsional, default: tahun aktif).
  2. `get_buku_pembantu_bhm`:
     - `description`: Mengambil data resmi Buku Pembantu Barang Modal / Aset (BHM) pada tahun anggaran aktif berdasarkan periode tertentu (Tahunan, Tahap 1, Tahap 2, atau nama bulan tertentu). Menyajikan rincian barang modal atau aset tetap sekolah (peralatan, mesin, buku teks aset perpustakaan) lengkap dengan tanggal, nomor bukti, volume, satuan, harga satuan, total belanja modal, serta kategori rekening belanja (5.2.02 peralatan & mesin vs 5.2.05 aset tetap lainnya). Panggil tool ini saat pengguna bertanya tentang laporan BHM, belanja modal aset, pengadaan peralatan/mesin, buku pembantu barang modal, atau inventaris aset BOSP.
     - `parameters`:
       - `periode` (string, default: "Tahunan", opsional: "Tahunan", "Tahap 1", "Tahap 2", atau nama bulan spesifik).
       - `tahun` (integer, opsional, default: tahun aktif).
- **Verifikasi:** Sintaks PHP valid (`php -l`).

---

## Task 2: Dispatcher `executeTool`
- **File:** `app/Services/Ai/CopilotService.php`
- **Tindakan:**
  Tambahkan dua case baru pada `match ($name)` di `executeTool()`:
  ```php
  'get_buku_pembantu_bhp' => $this->getBukuPembantuBhp($targetTahun, $args['periode'] ?? 'Tahunan', $variant),
  'get_buku_pembantu_bhm' => $this->getBukuPembantuBhm($targetTahun, $args['periode'] ?? 'Tahunan', $variant),
  ```
- **Verifikasi:** Pastikan dispatcher meneruskan `$targetTahun`, `$args['periode']`, dan `$variant` ke masing-masing method handler.

---

## Task 3: Implementasi Backend `getBukuPembantuBhp` dan `getBukuPembantuBhm`
- **File:** `app/Services/Ai/CopilotService.php`
- **Tindakan:**
  Implementasikan dua method baru:

  1. `protected function getBukuPembantuBhp(int $tahun, string $periode, string $variant): array`:
     - Validasi varian dan resolusi model dinamis (`Penganggaran`, `BukuKasUmum`, `penganggaranFk`).
     - Cari data `Penganggaran` sesuai `$tahun` beserta relasi `sekolah`.
     - Tentukan bulan target (Tahunan: 1..12, Tahap 1: 1..6, Tahap 2: 7..12, atau nama bulan).
     - Query BKU non-bunga pada tahun dan bulan target dengan relasi `rekeningBelanja` di mana `kode_rekening LIKE '5.1.02.01.01%'`, dengan eager load `kodeKegiatan`, `rekeningBelanja`, dan `uraianDetails`.
     - Lakukan flattening per item `uraianDetails`:
       * `tanggal`: Carbon `d-m-Y`
       * `kode_kegiatan`: kode kegiatan BKU / detail
       * `kode_rekening`: kode rekening belanja
       * `no_bukti`: `$bku->id_transaksi`
       * `uraian`: nama/uraian barang
       * `volume`: kuantitas
       * `satuan`: unit/satuan
       * `harga_satuan`: harga satuan Rp
       * `realisasi`: subtotal harga Rp
     - Hitung `total_realisasi` dan `total_item`.
     - Kembalikan array payload terstruktur.

  2. `protected function getBukuPembantuBhm(int $tahun, string $periode, string $variant): array`:
     - Validasi varian dan resolusi model dinamis.
     - Tentukan bulan target.
     - Query BKU non-bunga pada tahun dan bulan target dengan relasi `rekeningBelanja` di mana `kode_rekening LIKE '5.2%'`, dengan eager load `kodeKegiatan`, `rekeningBelanja`, dan `uraianDetails`.
     - Lakukan flattening per item `uraianDetails`.
     - Hitung akumulasi per kategori:
       * `subtotal_peralatan_mesin` (`5.2.02%`)
       * `subtotal_aset_lain` (`5.2.05%`)
     - Hitung `total_realisasi` dan `total_item`.
     - Kembalikan array payload terstruktur.
- **Verifikasi:** Uji coba kalkulasi dengan data database nyata tahun 2025.

---

## Task 4: Pembaruan System Prompt AI
- **File:** `app/Services/Ai/CopilotService.php`
- **Tindakan:**
  Perbarui instruksi `$systemPrompt` untuk kedua laporan buku pembantu:
  1. Laporan Buku Pembantu BHP (Barang Habis Pakai):
     - Panggil `get_buku_pembantu_bhp` dengan parameter `periode` dan `tahun`.
     - Tampilkan Header: `### BUKU PEMBANTU BARANG HABIS PAKAI (BHP)` [Badge: `BHP`] [Periode: {periode}]
     - Tampilkan Metrik Ringkas: Total Belanja BHP, Jumlah Item Barang.
     - Tampilkan Tabel HTML Rincian Barang (No, Tanggal, Kode Rekening, No. Bukti, Uraian Barang, Kuantitas, Harga Satuan, Realisasi) dengan baris TOTAL REALISASI BHP.
     - Catatan persediaan: Anjuran mencatat ke buku persediaan dan saran mencetak PDF lembar BHP.
  2. Laporan Buku Pembantu BHM (Barang Modal / Aset):
     - Panggil `get_buku_pembantu_bhm` dengan parameter `periode` dan `tahun`.
     - Tampilkan Header: `### BUKU PEMBANTU BARANG MODAL / ASET (BHM)` [Badge: `BHM`] [Periode: {periode}]
     - Tampilkan Metrik Ringkas: Total Belanja Modal, Komposisi Alat/Mesin vs Buku Aset Perpustakaan.
     - Tampilkan Tabel HTML Rincian Barang Modal dengan baris TOTAL REALISASI BHM.
     - Smart Compliance Audit: Peringatan wajib mencatat barang modal ke KIB (Kartu Inventaris Barang) dan membuatkan BAST (Berita Acara Serah Terima) agar tertib aset dan bebas temuan auditor.
  3. Penanganan Kasus Nihil (Rp 0):
     - Jika transaksi nihil, jelaskan dengan santai bahwa belum ada belanja BHP/BHM pada periode tersebut.
- **Verifikasi:** Validasi instruksi prompt dan uji respon assistant.

---

## Task 5: Pengujian, Format Pint, dan Commit
- **Tindakan:**
  1. Buat skrip scratch `scratch/test_copilot_bhp_bhm.php` untuk menguji output tool dan simulasi chat:
     - BHP Bulan Maret 2025.
     - BHM Tahunan 2025.
     - BHM Kasus Nihil (Januari 2025).
  2. Jalankan `php -l app/Services/Ai/CopilotService.php`.
  3. Jalankan `vendor\bin\pint app/Services/Ai/CopilotService.php`.
  4. Lakukan git commit: `feat(ai-copilot): integrate Buku Pembantu BHP and BHM into Copilot`.
