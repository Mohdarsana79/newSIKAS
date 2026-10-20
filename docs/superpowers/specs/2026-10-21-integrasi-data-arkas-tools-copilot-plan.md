# Rencana Implementasi: Integrasi Data ARKAS Tools ke SIKAS AI Copilot

- **Tanggal**: 2026-10-21
- **Status**: Siap Dijalankan
- **Dokumen Desain**: `docs/superpowers/specs/2026-10-21-integrasi-data-arkas-tools-copilot-design.md`

---

## Tahapan Pekerjaan

### Langkah 1: Sinkronisasi Awal & Indexing Master Acuan Barang (`ref_barangs`)
1. **Tambahkan Index Pencarian Cepat pada `ref_barangs`**:
   - Tambahkan index pada kolom `nama_barang` dan `(tahun, nama_barang)` untuk query secepat kilat di PostgreSQL.
2. **Buat Artisan Command `arkas:sync-catalog`**:
   - Lokasi: `app/Console/Commands/SyncArkasCatalogCommand.php`.
   - Menjalankan Python engine `storage/app/arkas_engine/query.py '__ALL__' 'ALL'` untuk mengambil 76.168 item acuan barang dari `arkas.db`.
   - Melakukan batch `upsert` ke tabel `ref_barangs` per 5.000 baris.
3. **Eksekusi Sinkronisasi**:
   - Jalankan `php artisan arkas:sync-catalog` dan verifikasi bahwa tabel `ref_barangs` terisi 76.168 baris.

---

### Langkah 2: Registrasi 2 Tools Baru & Dispatcher di `CopilotService.php`
1. **Daftarkan tool `search_arkas_reference_item` pada `getAvailableTools()`**:
   - Parameter:
     - `query` (string, required): Kata kunci nama barang / jasa acuan ARKAS.
     - `estimasi_harga` (number, optional): Nominal harga satuan belanja yang ingin dievaluasi terhadap batas atas SSH resmi.
     - `tahun` (integer, optional): Tahun anggaran acuan ARKAS.
     - `kode_rekening` (string, optional): Filter kode rekening tertentu.
     - `limit` (integer, optional, default: 10).
2. **Daftarkan tool `diagnose_arkas_integration` pada `getAvailableTools()`**:
   - Parameter:
     - `scope` (string, enum: ['comprehensive', 'bku_month', 'rkas'], default: 'comprehensive').
     - `bulan` (string, optional): Nama bulan (Januari s.d. Desember).
     - `tahun` (integer, optional): Tahun anggaran diagnosa.
3. **Tambahkan mapping di dispatcher `executeTool()`**:
   - Hubungkan `'search_arkas_reference_item'` ke `$this->searchArkasReferenceItem(...)`.
   - Hubungkan `'diagnose_arkas_integration'` ke `$this->diagnoseArkasIntegration(...)`.

---

### Langkah 3: Implementasi Backend Methods di `CopilotService.php`
1. **Method `searchArkasReferenceItem(...)`**:
   - Query ke model `RefBarang` dengan filter `tahun`, `nama_barang ILIKE %query%`, dan opsional `kode_rekening`.
   - **Fallback Cerdas**: Jika `RefBarang` kosong atau tidak ada hasil di lokal, panggil helper `runPythonQuery()` ke `storage/app/arkas_engine/query.py` langsung ke `arkas.db`.
   - Hitung ringkasan harga acuan (terendah, tertinggi, rata-rata).
   - Jika `estimasi_harga` disertakan: Bandingkan dengan batas atas SSH resmi, tentukan status `'DI_BAWAH_BATAS_SSH_AMAN'` atau `'MELEBIHI_BATAS_SSH'` beserta persentase deviasi.
2. **Method `diagnoseArkasIntegration(...)`**:
   - Resolve `ArkasDiagnosticService` via `app(ArkasDiagnosticService::class)`.
   - Panggil `runComprehensiveDiagnostic($user, $variant, $targetTahun)` jika scope `'comprehensive'`, atau `runContextualDiagnostic(...)` jika scope `'bku_month'` / `'rkas'`.
   - Format ringkasan kesehatan koneksi, selisih pagu RKAS, status BKU 12 bulan (klop/beda), transaksi selisih, dan rekomendasi aksi.

---

### Langkah 4: Tambahkan Aturan Khusus ARKAS pada System Prompt (`CopilotService.php`)
1. **Bagian 8: Katalog Acuan Barang & Standar Satuan Harga (SSH) ARKAS**:
   - Aturan kapan memanggil `search_arkas_reference_item`.
   - Format penyajian tabel HTML: No, Nama Barang Acuan ARKAS, Kode Rekening, Akun Belanja, Satuan, Batas Atas Harga (SSH), Status Evaluasi.
   - Peringatan ramah jika harga belanja melampaui batas atas SSH resmi.
2. **Bagian 9: Diagnosa & Rekonsiliasi Integrasi ARKAS Desktop**:
   - Aturan kapan memanggil `diagnose_arkas_integration`.
   - Format penyajian Dashboard Diagnosa ARKAS:
     - Header & Badge Status Koneksi.
     - Tabel Pagu RKAS (SIKAS vs ARKAS).
     - Tabel Status BKU Bulanan (Januari s.d. Desember).
     - Rincian Transaksi Belum Klop (jika ada).
     - Panduan Solusi Santai bagi Bendahara.

---

### Langkah 5: Pengujian, Validasi, & Finalisasi
1. **Uji Backend via Scratch Script**:
   - Uji `searchArkasReferenceItem("kursi", 750000)` dan `searchArkasReferenceItem("laptop", 12000000)`.
   - Uji `diagnoseArkasIntegration("comprehensive")`.
2. **Live AI Chat Test dengan DeepSeek**:
   - Uji prompt 1: *"berapa batas atas harga laptop di ARKAS? kalau saya beli laptop harga 7 juta apakah aman?"*
   - Uji prompt 2: *"coba cek apakah BKU kita sudah klop sama aplikasi ARKAS desktop"*
3. **Pint Code Formatting & Git Commit**:
   - Jalankan `vendor/bin/pint`.
   - Commit seluruh perubahan ke Git dengan pesan deskriptif.
