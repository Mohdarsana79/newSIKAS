# Implementation Plan: Panduan Lengkap RKAS Awal / Murni & Rekapan Cetak pada SIKAS AI Copilot

- **Spec Reference**: `docs/superpowers/specs/2026-10-22-copilot-rkas-awal-murni-guide-design.md`
- **Target Files**:
  - `app/Services/Ai/CopilotService.php`
  - `tests/Unit/CopilotSpjTandaTerimaTest.php`

---

## Task 1: Update System Prompt di CopilotService.php
- **Lokasi**: Method `buildSystemPrompt()` setelah bagian `d. PANDUAN KHUSUS FITUR PENGANGGARAN`.
- **Perubahan**:
  - Sisipkan sub-bab `e. PANDUAN KHUSUS RKAS AWAL / MURNI & REKAPAN CETAK (LENGKAP 3 PILAR):` yang memuat:
    - Bagian 1: Pengenalan Halaman, Card Pagu & Pembagian Tahap 1 (50%) & Tahap 2 (50%), serta fungsi tombol Header (Tambah, Salin, Tarik dari ARKAS, Buat Perubahan, Cetak).
    - Bagian 2: Alur 4 Langkah Input Belanja (Langkah 1 s.d. 4) termasuk formulir input, tab bulan, dan menu titik tiga (Edit, Hapus per bulan, Hapus Semua, Detail, Sisip Uraian) beserta proteksi realisasi BKU.
    - Bagian 3: Panduan Lengkap Halaman Rekapan & Cetak (Menu Tanggal Cetak + 10 Fitur Cetak: Rka Tahapan, Rka Tahapan V.1, Rka Rekap, Lembar Kerja 221, Rka Bulanan, Rincian, Grafik Permendikdasmen 8/2026, RP / Payroll dengan Gabung Kegiatan & Hitung Pajak, Alur Kas, Ekspor PDF/Excel).
  - Sesuaikan penomoran sub-bab berikutnya:
    - `f. PANDUAN TROUBLESHOOTING UMUM`
    - `g. ATURAN KERAHASIAAN SISTEM & STRICT ZERO INTERNAL URL PATH RULE`

## Task 2: Tambahkan Unit Test di CopilotSpjTandaTerimaTest.php
- **Lokasi**: `tests/Unit/CopilotSpjTandaTerimaTest.php`.
- **Perubahan**:
  - Tambahkan unit test `test_system_prompt_includes_detailed_rkas_awal_murni_guide()` untuk memvalidasi keberadaan seluruh istilah dan struktur 3 pilar panduan.

## Task 3: Eksekusi & Validasi Pengujian
- Jalankan test PHPUnit: `php artisan test --filter=CopilotSpjTandaTerimaTest`.
- Jalankan simulasi live via scratch script dengan DeepSeek API untuk memverifikasi respons asisten Copilot saat ditanya panduan RKAS Awal / Murni dan menu cetaknya.
