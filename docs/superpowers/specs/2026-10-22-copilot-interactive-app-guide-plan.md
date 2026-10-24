# Rencana Implementasi: SIKAS AI Copilot Interactive App Guide & Smart Navigation

**Tanggal:** 2026-10-22  
**Status:** In Progress  
**Spec Referensi:** [`docs/superpowers/specs/2026-10-22-copilot-interactive-app-guide-design.md`](file:///c:/laragon/www/newSIKAS2/newSIKAS/docs/superpowers/specs/2026-10-22-copilot-interactive-app-guide-design.md)  

---

## 1. Langkah-Langkah Pengerjaan

### Tahap 1: Backend - Knowledge Base SOP & Smart Action Buttons Protocol
- [x] Perbarui `buildSystemPrompt(string $variant, int $tahun)` pada [`app/Services/Ai/CopilotService.php`](file:///c:/laragon/www/newSIKAS2/newSIKAS/app/Services/Ai/CopilotService.php):
  - Tambahkan pedoman peran ganda: Analis Keuangan BOSP + Pemandu Pengoperasian Aplikasi SIKAS (In-App Guide & Navigator).
  - Tambahkan Knowledge Base SOP & Peta Modul SIKAS secara menyeluruh:
    1. Penganggaran & RKAS / RKAS Perubahan (alur input, pergeseran belanja, tarik data RKAS dari ARKAS SQLite, ekspor laporan).
    2. Penatausahaan BKU (pencatatan belanja tunai/bank, tarik tunai, setor tunai, pembayaran pajak NTPN, asisten AI uraian, alur Tutup Kas Bulanan BOS-K7B & Berita Acara, alur Reopen/buka kembali kas, tarik data BKU ARKAS).
    3. Rekapitulasi Kas & Audit (BKP Bank, BKP Tunai, BKP Umum, BKP Pajak, BKP ROB, Berita Acara Kas, BHP, BHM, dan AI Pra-Audit).
    4. Fitur Pelengkap SPJ (Kwitansi massal/batch 4 template, BAST barang/jasa, Surat Pesanan, Tanda Terima honor, cetak laporan SPTJ, SPMTH, SP2B, LPH).
    5. Integrasi & Sistem (Path ARKAS `arkas.db`, Backup & Restore PostgreSQL).
    6. Solusi Kendala/Troubleshooting (selisih kas, transaksi over budget, kendala deteksi database ARKAS).
  - Tanamkan protokol Smart Action Button: instruksi bagi model AI untuk membubuhkan tag metadata di akhir pesan jika menyarankan/memandu menu:
    `[ACTION_BUTTON: {"label": "...", "url": "...", "icon": "...", "description": "..."}]`
- [x] Perbarui method `chat()` pada [`app/Services/Ai/CopilotService.php`](file:///c:/laragon/www/newSIKAS2/newSIKAS/app/Services/Ai/CopilotService.php):
  - Ekstrak tag `[ACTION_BUTTON: ...]` dari teks jawaban DeepSeek menggunakan regex.
  - Bersihkan tag metadata tersebut dari teks konten chat pengguna.
  - Normalisasikan URL rute agar menyertakan prefix varian aktif (`VariantConfig::routePrefix($variant)`).
  - Masukkan array `action_buttons` ke dalam array response akhir.

### Tahap 2: Frontend - Quick Prompts Switcher & Action Button Card
- [x] Perbarui tipe data pada [`resources/js/Components/Ai/CopilotDrawer.tsx`](file:///c:/laragon/www/newSIKAS2/newSIKAS/resources/js/Components/Ai/CopilotDrawer.tsx):
  - Tambahkan interface `ActionButton { label: string; url: string; icon?: string; description?: string }`.
  - Tambahkan field `action_buttons?: ActionButton[]` pada interface `Message`.
- [x] Tambahkan tab switcher kategori saran di empty state chat:
  - State `promptCategory: 'guide' | 'finance'`.
  - Tab `[📖 Panduan Aplikasi]` dengan tombol chip panduan (Tutup Kas BKU, Alur Tarik ARKAS, Cetak Kwitansi Massal, Solusi Selisih Kas, Buat BAST).
  - Tab `[💰 Keuangan & Draf]` dengan tombol chip finansial (Pagu Anggaran, Draf Belanja BKU, Serapan Triwulan, Hitung Pajak).
- [x] Buat komponen visual **Smart Action Card** di bawah balon chat asisten:
  - Render kartu dengan ikon sesuai (`BookOpen`, `FileText`, `Sparkles`, `Settings`, `ArrowRight`, dll).
  - Tangani klik menggunakan `router.visit(btn.url, { preserveState: true, preserveScroll: true })`.
  - Drawer Copilot tetap terbuka di samping layar saat pengguna berpindah halaman.

### Tahap 3: Pengujian & Validasi
- [x] Buat Unit Test PHPUnit [`tests/Unit/CopilotAppGuideTest.php`](file:///c:/laragon/www/newSIKAS2/newSIKAS/tests/Unit/CopilotAppGuideTest.php) untuk menguji:
  - Keberadaan instruksi panduan aplikasi dalam `buildSystemPrompt`.
  - Logika ekstraksi tag `[ACTION_BUTTON: ...]` dan penyesuaian prefix URL varian.
- [x] Jalankan test suite via `php artisan test --filter=CopilotAppGuideTest`.
- [x] Uji kompilasi frontend via `npx tsc --noEmit` atau build check.
- [x] Uji fungsionalitas interaktif live dengan scratch script / simulasi chat.

### Tahap 4: Code Style, Formatting, & Review
- [x] Jalankan `vendor/bin/pint` pada file PHP yang dimodifikasi.
- [x] Review kode (Standards & Spec).
- [x] Sampaikan laporan penyelesaian kepada pengguna.
