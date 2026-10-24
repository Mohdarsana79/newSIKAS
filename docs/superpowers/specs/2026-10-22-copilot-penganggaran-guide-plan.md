# Implementation Plan: Panduan Fitur Penganggaran pada SIKAS AI Copilot

- **Spec Reference**: `docs/superpowers/specs/2026-10-22-copilot-penganggaran-guide-design.md`
- **Target Files**:
  - `app/Services/Ai/CopilotService.php`
  - `tests/Unit/CopilotSpjTandaTerimaTest.php`

---

## Task 1: Update System Prompt di CopilotService.php
- **Lokasi**: Method `buildSystemPrompt()` setelah bagian `c. PANDUAN KHUSUS PENGISIAN PROFILE SEKOLAH`.
- **Perubahan**:
  - Sisipkan blok `d. PANDUAN KHUSUS FITUR PENGANGGARAN (PEMBUATAN PAGU & PENGELOLAAN CARD RKAS):`
  - Muat seluruh rincian:
    - Fungsi fitur Penganggaran & 4 tab varian.
    - Langkah ke 1 sampai 5.
    - Informasi Card RKAS awal/murni.
    - Penjelasan fungsi Menu edit, Menu detail Rkas, Menu ringkasan & Cetak, dan Menu hapus beserta peringatan kehati-hatian.
  - Perbarui penomoran:
    - `e. PANDUAN TROUBLESHOOTING UMUM`
    - `f. ATURAN KERAHASIAAN SISTEM & STRICT ZERO INTERNAL URL PATH RULE`

## Task 2: Tambahkan Unit Test di CopilotSpjTandaTerimaTest.php
- **Lokasi**: `tests/Unit/CopilotSpjTandaTerimaTest.php`.
- **Perubahan**:
  - Tambahkan unit test `test_system_prompt_includes_detailed_penganggaran_guide()` untuk menguji keberadaan seluruh kata kunci dan langkah dalam prompt.

## Task 3: Eksekusi & Pengujian Live
- Jalankan `php artisan test --filter=CopilotSpjTandaTerimaTest`.
- Jalankan live prompt test via scratch script dengan DeepSeek untuk memvalidasi respons terhadap pertanyaan panduan penganggaran.
