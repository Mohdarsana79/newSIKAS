# Rencana Implementasi: Integrasi Data Dokumen SPJ (Kwitansi, Tanda Terima, BAST, dan Surat Pesanan) ke SIKAS AI Copilot

**Tanggal:** 2026-10-21  
**Status:** In Progress  
**Dokumen Desain Referensi:** `docs/superpowers/specs/2026-10-21-dokumen-spj-kwitansi-tanda-terima-bast-sp-design.md`

---

## 1. Ikhtisar & Tujuan

Mempersiapkan dan mengintegrasikan data dokumen pertanggungjawaban SPJ (**Kwitansi**, **Tanda Terima**, **BAST** / Berita Acara Serah Terima, dan **Surat Pesanan**) ke dalam SIKAS AI Copilot. Fitur ini memungkinkan bendahara sekolah melakukan:
1. **Audit matriks kelengkapan dokumen SPJ** per transaksi belanja BKU pada bulan/tahap/tahun tertentu dengan logika kepatuhan regulasi (Modal/Barang Fisik vs Honor/Jasa vs Operasional).
2. **Pengecekan lembar rincian resmi dokumen** secara real (identitas para pihak, klausul pemesanan/serah terima, rincian item/volume/harga, nilai bruto, potongan pajak, neto, terbilang rupiah, serta kolom tanda tangan).

---

## 2. Tahapan Eksekusi

### Tahap 1: Registrasi Tools OpenAI-Compatible pada `CopilotService.php`
- Daftarkan `get_spj_documents_status` di `getAvailableTools()` dengan parameter:
  - `bulan`: Nama bulan (Januari s.d. Desember, atau 'Semua').
  - `tahap`: Tahap 1 atau Tahap 2 (opsional).
  - `status_filter`: `semua`, `belum_lengkap`, atau `lengkap`.
  - `tahun`: Tahun anggaran (integer, opsional).
- Daftarkan `get_spj_document_detail` di `getAvailableTools()` dengan parameter:
  - `tipe_dokumen`: `kwitansi`, `tanda_terima`, `bast`, atau `surat_pesanan` (wajib).
  - `query`: Kata kunci pencarian (nomor bukti BKU, nomor surat, nama toko, uraian).
  - `bku_id`: ID BKU spesifik jika diketahui.
  - `bulan`: Nama bulan transaksi (opsional).
  - `tahun`: Tahun anggaran (opsional).

### Tahap 2: Pembaruan System Prompt (Bagian 10) pada `CopilotService.php`
- Tambahkan pedoman perilaku AI untuk:
  - **Audit Kelengkapan SPJ**:
    * Menampilkan Badge Status kepatuhan (`[STATUS: X% LENGKAP]`).
    * Menyajikan Tabel Matriks Kelengkapan HTML dengan indikator centang hijau `✅ Ada` dan silang merah `❌ Belum Ada` (atau `—` jika tidak wajib).
    * Memberikan saran langkah perbaikan yang ramah dan solutif.
  - **Lembar Resmi Dokumen SPJ**:
    * Header jenis dokumen resmi: Kwitansi, Tanda Terima, BAST, Surat Pesanan.
    * Identitas Dokumen & Para Pihak (Rekanan & Sekolah/Kepsek/PPK).
    * Tabel Rincian Item Barang/Jasa (Volume, Satuan, Harga, Total, Kondisi).
    * Tabel Ringkasan Finansial: Bruto, Pajak, Neto, dan Terbilang Rupiah.
    * Lembar Pengesahan / Tanda Tangan.
  - Mempertahankan gaya santai bendahara ("Om", "Bos") dan dilarang membocorkan ID internal database.

### Tahap 3: Pemetaan Dispatcher pada `executeTool()`
- Petakan tool call `get_spj_documents_status` ke method `$this->getSpjDocumentsStatus(...)`.
- Petakan tool call `get_spj_document_detail` ke method `$this->getSpjDocumentDetail(...)`.

### Tahap 4: Implementasi Backend Methods pada `CopilotService.php`
1. Method `getSpjDocumentsStatus(int $tahun, string $variant, ?string $bulan = null, ?int $tahap = null, string $statusFilter = 'semua')`:
   - Ambil model BKU varian via `VariantConfig::getModelClass('buku_kas_umum', $variant)`.
   - Filter transaksi pengeluaran belanja (`total_transaksi_kotor > 0`).
   - Eager-load: `kwitansis`, `tandaTerimas`, `bast`, `suratPesanan`, `uraianDetails`, `kodeRekening`, `kodeKegiatan`.
   - Logika Klasifikasi Kepatuhan:
     * **Modal / Barang Fisik** (Kode rekening berawalan `5.2.` atau belanja perabot/aset): Wajib Kwitansi, Surat Pesanan, dan BAST.
     * **Honor / Jasa Perorangan** (Kode rekening berawalan `5.1.01.` atau uraian mengandung honor/narasumber/transport): Wajib Kwitansi dan Tanda Terima.
     * **Operasional Umum**: Wajib Kwitansi.
   - Hitung ringkasan kepatuhan dan susun daftar `dokumen_kurang`.
2. Method `getSpjDocumentDetail(string $tipeDokumen, ?string $query = null, ?int $bkuId = null, int $tahun = 2026, string $variant = 'reguler', ?string $bulan = null)`:
   - Ambil model varian terkait via `VariantConfig::getModelClass(...)`.
   - Query berkas dokumen berdasarkan ID BKU atau pencarian teks (nomor bukti, nomor dokumen, nama rekanan, atau uraian).
   - Format data lengkap: nomor dokumen, tanggal dokumen, identitas rekanan, identitas sekolah, rincian barang/jasa dari `uraianDetails`, perhitungan bruto/pajak/neto, konversi fungsi terbilang rupiah, klausul pengiriman & pembayaran (khusus SP), dan kolom pengesahan tanda tangan.

### Tahap 5: Pengujian & Validasi
1. **Unit Test Backend**: Uji coba pemanggilan method langsung via skrip PHP terhadap transaksi nyata di DB lokal (misal: BKU September & Maret 2026).
2. **Live AI Chat Test**: Menguji skenario interaksi pengguna nyata dengan DeepSeek API:
   - Pertanyaan 1: *"Coba cek kelengkapan dokumen SPJ bulan September 2026"*
   - Pertanyaan 2: *"Tampilkan rincian isi BAST pengadaan laptop / perabot"*
3. **Pint Formatting & Git Commit**:
   - Jalankan `vendor/bin/pint` pada file yang diubah.
   - Commit perubahan ke Git dengan pesan yang jelas dan informatif.
