# Implementation Plan: Standarisasi Panduan Penatausahaan pada AI Copilot

**Tanggal**: 2026-10-23  
**Design Spec**: [2026-10-23-copilot-penatausahaan-guide-design.md](file:///c:/laragon/www/newSIKAS2/newSIKAS/docs/superpowers/specs/2026-10-23-copilot-penatausahaan-guide-design.md)

---

### Langkah 1: Tambahkan Sub-Bab Panduan Penatausahaan pada System Prompt AI
- **File**: [`app/Services/Ai/CopilotService.php`](file:///c:/laragon/www/newSIKAS2/newSIKAS/app/Services/Ai/CopilotService.php)
- **Lokasi**: Method `buildSystemPrompt()` setelah bagian `f. PANDUAN KHUSUS RKAS PERUBAHAN & REKAPAN CETAK`.
- **Tambahkan**: Sub-bab `g. PANDUAN KHUSUS FITUR PENATAUSAHAAN (AKTIVASI BKU, PENERIMAAN DANA, & KARTU BULAN):`
  - Bagian 1: Konsep Aktivasi BKU & Tab Varian BOSP.
  - Bagian 2: Penjelasan 3 Menu Utama (Tarik ARKAS, Tambah Penerimaan Dana, Cetak).
  - Bagian 3: Mekanisme Rantai Buka-Kunci 12 Kartu Bulan & 5 Status Indikator.
- **Sesuaikan**: Penomoran sub-bab berikutnya:
  - `h. PANDUAN TROUBLESHOOTING UMUM`
  - `i. ATURAN KERAHASIAAN SISTEM & STRICT ZERO INTERNAL URL PATH RULE`

### Langkah 2: Sanitasi URL Internal pada `sanitizeResponseText`
- **File**: [`app/Services/Ai/CopilotService.php`](file:///c:/laragon/www/newSIKAS2/newSIKAS/app/Services/Ai/CopilotService.php)
- **Pastikan**: Pembersihan URL mencakup:
  - `/penatausahaan/bku` -> `menu Buku Kas Umum (BKU)`
  - `/penatausahaan/rekapitulasi` -> `menu Rekapitulasi Kas`
  - `/penatausahaan` -> `menu Penatausahaan`
  - `/rkas-perubahan` -> `menu RKAS Perubahan`
  - `/rkas` -> `menu RKAS`
  - `/penganggaran` -> `menu Penganggaran (RKAS)`

### Langkah 3: Tambahkan Unit Test di `tests/Unit/CopilotSpjTandaTerimaTest.php`
- **File**: [`tests/Unit/CopilotSpjTandaTerimaTest.php`](file:///c:/laragon/www/newSIKAS2/newSIKAS/tests/Unit/CopilotSpjTandaTerimaTest.php)
- **Tambahkan Test Case**:
  - `test_system_prompt_includes_detailed_penatausahaan_guide()`:
    - Mengetes keberadaan teks panduan penatausahaan (3 bagian komprehensif: aktivasi BKU & tab varian BOSP, 3 menu utama, mekanisme rantai kartu bulan dan 5 status kartu).
- **Jalankan**: `php artisan test --filter=Copilot` untuk memastikan seluruh test suite lolos 100%.

### Langkah 4: Live Verification Query via DeepSeek API
- **Scratch Script**: `scratch/test_penatausahaan_guide_live.php`
- **Prompt Query**: "bagaimana cara aktivasi dan alur kerja di fitur penatausahaan?"
- **Validasi Output**:
  - Terstruktur 3 bagian.
  - Bebas dari URL teknis internal.
  - Bebas dari nama pribadi pengguna.
  - Gaya bahasa ramah, santai, dan jelas bagi bendahara.
