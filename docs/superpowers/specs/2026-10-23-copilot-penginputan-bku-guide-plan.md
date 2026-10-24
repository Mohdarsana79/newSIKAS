# Implementation Plan: Standarisasi Panduan Penginputan BKU & Cetak LPJ pada AI Copilot

**Tanggal**: 2026-10-23  
**Design Spec**: [2026-10-23-copilot-penginputan-bku-guide-design.md](file:///c:/laragon/www/newSIKAS2/newSIKAS/docs/superpowers/specs/2026-10-23-copilot-penginputan-bku-guide-design.md)

---

### Langkah 1: Tambahkan Sub-Bab Panduan Penginputan BKU pada System Prompt AI
- **File**: [`app/Services/Ai/CopilotService.php`](file:///c:/laragon/www/newSIKAS2/newSIKAS/app/Services/Ai/CopilotService.php)
- **Lokasi**: Method `buildSystemPrompt()` setelah bagian `g. PANDUAN KHUSUS FITUR PENATAUSAHAAN (AKTIVASI BKU, PENERIMAAN DANA, & KARTU BULAN)`.
- **Tambahkan**: Sub-bab `h. PANDUAN KHUSUS PENGINPUTAN BKU & HALAMAN CETAK LPJ (LENGKAP 3 PILAR):`
  - Pilar 1: Header Saldo Finansial & Menu Operasional Halaman BKU (Tarik/Setor Tunai, Hapus BKU + trik tahap 2, Tarik ARKAS + Analisis Selisih AI, Cari, Tutup BKU).
  - Pilar 2: Alur Form 3-Langkah Tambah Pembelanjaan & Kolom Aksi Tabel Belanja (Identitas rekanan/toko, Uraian RKAS + Asisten AI Uraian, Kalkulasi Pajak Otomatis, serta Aksi Edit, Lapor Pajak NTPN, Detail, Hapus).
  - Pilar 3: Panduan Lengkap 11 Tab Halaman Cetak & Pelaporan LPJ Kas (Buku Bank, Buku Kas Tunai, BKU, Buku Pajak, ROB, Reg Penutupan Kas, BA Penutupan Kas, Realisasi, Rek. Realisasi, BHP, BHM, serta fitur Pra-Audit AI, Check Saldo Awal, Check STS, dan Ekspor PDF/Excel).
- **Sesuaikan**: Penomoran sub-bab berikutnya:
  - `i. PANDUAN TROUBLESHOOTING UMUM`
  - `j. ATURAN KERAHASIAAN SISTEM & STRICT ZERO INTERNAL URL PATH RULE`

### Langkah 2: Sanitasi URL Internal pada `sanitizeResponseText`
- **File**: [`app/Services/Ai/CopilotService.php`](file:///c:/laragon/www/newSIKAS2/newSIKAS/app/Services/Ai/CopilotService.php)
- Pastikan mapping pembersihan URL mencakup rute terkait BKU:
  - `/penatausahaan/bku(?:\/[^\s\),.`]+)?` -> `menu Buku Kas Umum (BKU)`
  - `/penatausahaan/rekapitulasi` -> `menu Rekapitulasi Kas & Cetak Penatausahaan`
  - `/penatausahaan` -> `menu Penatausahaan`

### Langkah 3: Tambahkan Unit Test di `tests/Unit/CopilotSpjTandaTerimaTest.php`
- **File**: [`tests/Unit/CopilotSpjTandaTerimaTest.php`](file:///c:/laragon/www/newSIKAS2/newSIKAS/tests/Unit/CopilotSpjTandaTerimaTest.php)
- **Tambahkan Test Case**:
  - `test_system_prompt_includes_detailed_penginputan_bku_guide()`:
    - Mengetes keberadaan seluruh kata kunci dan komponen 3 pilar:
      - `PANDUAN KHUSUS PENGINPUTAN BKU & HALAMAN CETAK LPJ (LENGKAP 3 PILAR)`
      - `Penginputan BKU`
      - `Total dana tersedia`, `bisa di belanjakan`, `sudah di belanjakan`, `bisa di anggarkan ulang`
      - `Hapus BKU`, `Tarik dari arkas`, `Analisis selisih AI`
      - `Tambah Pembelanjaan` (3-step flow: rekanan/toko, uraian belanja, Asisten AI, volume, pajak otomatis)
      - `Tutup BKU`, `Tarik tunai`, `Setor tunai`
      - `Lapor pajak`, `NTPN`
      - 11 Tab cetak: `Buku Kas Bank`, `Buku Kas Pembantu Tunai`, `Buku Kas Umum`, `Buku Kas Pajak`, `ROB`, `Registrasi Penutupan Kas`, `Berita Acara Penutupan Kas`, `Realisasi`, `Rek. Realisasi`, `BHP`, `BHM`
      - `Pra audit`, `Check Saldo Awal`, `Check STS`
- **Jalankan**: `php artisan test --filter=Copilot` untuk memastikan seluruh test suite lolos 100%.

### Langkah 4: Format Kode dengan Pint & Live Query Verification via DeepSeek API
- **Pint**: `vendor/bin/pint`
- **Scratch Script**: `scratch/test_penginputan_bku_guide_live.php`
- **Prompt Query**: "bagaimana cara mengisi transaksi di BKU dan mencetak laporan kas LPJ?"
- **Validasi Output**:
  - Terstruktur 3 pilar lengkap dan mudah dipahami.
  - Bersih dari internal URL `/...`.
  - Bersih dari nama pribadi pengguna.
