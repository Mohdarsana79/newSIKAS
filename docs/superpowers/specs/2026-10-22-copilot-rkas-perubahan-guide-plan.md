# Implementation Plan: Panduan Lengkap RKAS Perubahan & Rekapan Cetak pada SIKAS AI Copilot

- **Spec Reference**: `docs/superpowers/specs/2026-10-22-copilot-rkas-perubahan-guide-design.md`
- **Target Files**:
  - `app/Services/Ai/CopilotService.php`
  - `tests/Unit/CopilotSpjTandaTerimaTest.php`

---

## Task 1: Update System Prompt di CopilotService.php
- **Lokasi**: Method `buildSystemPrompt()` setelah bagian `e. PANDUAN KHUSUS RKAS AWAL / MURNI & REKAPAN CETAK`.
- **Perubahan**:
  - Sisipkan sub-bab `f. PANDUAN KHUSUS RKAS PERUBAHAN & REKAPAN CETAK (LENGKAP 3 PILAR):` yang memuat:
    - Bagian 1: Pengenalan Halaman RKAS Perubahan, tombol Buat Perubahan (syarat BKU Juni tutup), tombol Header (Tambah, Tarik dari ARKAS Online, Perubahan Aktif, Rekaman Perubahan, Cetak).
    - Bagian 2: Alur 4 Langkah Input Belanja Perubahan (Langkah 1 s.d. 4) termasuk formulir input, tab bulan, dan menu titik tiga (Edit, Hapus per bulan, Hapus Semua, Detail, Sisip Uraian) beserta proteksi realisasi BKU.
    - Bagian 3: Panduan Lengkap Halaman Cetak RKAS Perubahan (Menu Tanggal Cetak + 11 Fitur Cetak: Rka Tahapan komparasi sebelum/sesudah seimbang bertambah berkurang, Rka Tahapan V.1, Rka Tahapan V.2, Rka Rekap, Lembar Kerja 221, Rka Bulanan, Rincian Perubahan, Grafik Permendikdasmen 8/2026, RP / Payroll dengan Gabung Kegiatan & Hitung Pajak, Alur Kas, Ekspor PDF/Excel).
  - Sesuaikan penomoran sub-bab berikutnya:
    - `g. PANDUAN TROUBLESHOOTING UMUM`
    - `h. ATURAN KERAHASIAAN SISTEM & STRICT ZERO INTERNAL URL PATH RULE`

## Task 2: Tambahkan Unit Test di CopilotSpjTandaTerimaTest.php
- **Lokasi**: `tests/Unit/CopilotSpjTandaTerimaTest.php`.
- **Perubahan**:
  - Tambahkan unit test `test_system_prompt_includes_detailed_rkas_perubahan_guide()` untuk memvalidasi keberadaan seluruh istilah dan struktur 3 pilar panduan RKAS Perubahan.

## Task 3: Eksekusi & Validasi Pengujian
- Jalankan test PHPUnit: `php artisan test --filter=CopilotSpjTandaTerimaTest`.
- Jalankan simulasi live via scratch script dengan DeepSeek API untuk memverifikasi respons asisten Copilot saat ditanya panduan RKAS Perubahan dan menu cetaknya.
