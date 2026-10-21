# Rencana Implementasi: Integrasi Data Laporan SPTJ, SPMTH, SP2B, dan LPH pada SIKAS AI Copilot

- **Tanggal**: 21 Oktober 2026
- **Status**: Ready for Implementation
- **Dokumen Desain Referensi**: `docs/superpowers/specs/2026-10-21-integrasi-laporan-sptj-spmth-sp2b-lph-copilot-design.md`

---

## 1. Ikhtisar & Sasaran

Mengintegrasikan data laporan pertanggungjawaban hibah BOSP resmi (**SPTJ**, **SPMTH**, **SP2B**, dan **LPH**) ke dalam SIKAS AI Copilot. Fitur ini memungkinkan bendahara sekolah untuk:
1. Memeriksa arsip resmi yang sudah dibuat dan disimpan di sistem (nomor surat dinas, tanggal cetak, rincian angka, dan pengesahan Kepala Sekolah).
2. Memperoleh kalkulasi simulasi otomatis (live) secara real-time dari BKU dan Penerimaan Dana jika laporan belum disimpan (misal untuk Tahap 2).
3. Memeriksa SP2B baik berbasis Tahapan (Tahap 1, Tahap 2) maupun Bulanan (Januari s.d. Desember).
4. Melihat dashboard matriks kelengkapan ke-4 laporan pertanggungjawaban tahunan.

---

## 2. Tahapan Eksekusi

### Langkah 1: Registrasi Tool pada `CopilotService.php`
- **File**: `app/Services/Ai/CopilotService.php`
- Daftarkan tool `get_official_laporan_data` di `getAvailableTools()` dengan parameter:
  * `jenis_laporan` (enum: `['sptj', 'spmth', 'sp2b', 'lph', 'semua']`, wajib).
  * `tahap` (integer: `1` atau `2`, opsional).
  * `bulan` (string/int: nama bulan atau angka 1–12, opsional).
  * `tahun` (integer, opsional).

### Langkah 2: Pemetaan Dispatcher `executeTool()`
- **File**: `app/Services/Ai/CopilotService.php`
- Petakan fungsi `'get_official_laporan_data'` ke method:
  ```php
  'get_official_laporan_data' => $this->getOfficialLaporanData(
      $args['jenis_laporan'] ?? 'semua',
      isset($args['tahap']) ? (int) $args['tahap'] : null,
      $args['bulan'] ?? null,
      $targetTahun,
      $variant
  ),
  ```

### Langkah 3: Implementasi Backend Engine pada `CopilotService.php`
- **File**: `app/Services/Ai/CopilotService.php`
- Implementasikan method utama:
  `public function getOfficialLaporanData(string $jenisLaporan, ?int $tahap = null, ?string $bulan = null, int $tahun = 2026, string $variant = 'reguler'): array`
- Implementasikan sub-helper:
  1. `getSptjReportData(int $tahun, string $variant, ?int $tahap = 1): array`
  2. `getSpmthReportData(int $tahun, string $variant, ?int $tahap = 1): array`
  3. `getSp2bReportData(int $tahun, string $variant, ?int $tahap = null, ?string $bulan = null): array`
  4. `getLphReportData(int $tahun, string $variant, ?int $semester = 1): array`
  5. `getSummaryAllLaporan(int $tahun, string $variant): array`

### Langkah 4: Pembaruan System Prompt pada `CopilotService.php`
- **File**: `app/Services/Ai/CopilotService.php`
- Tambahkan Bagian 11 pada `buildSystemPrompt()`:
  * Panduan penyajian laporan SPTJ, SPMTH, SP2B, LPH, dan status gabungan ("semua").
  * Format tabel HTML resmi dengan angka format Rupiah rata kanan.
  * Tanda tangan pengesahan Kepala Sekolah dan Bendahara.
  * Badge pembeda status `[STATUS: DOKUMEN RESMI TERSIMPAN]` vs `[STATUS: SIMULASI LIVE BKU]`.

### Langkah 5: Pengujian & Validasi
- **File**: `tests/Unit/CopilotOfficialLaporanTest.php`
- Buat unit test yang memvalidasi:
  * Registrasi tool `get_official_laporan_data`.
  * Pembacaan data tersimpan SPTJ Tahap 1 2026.
  * Pembacaan data tersimpan SPMTH Tahap 1 2026.
  * Pembacaan data tersimpan SP2B Tahap 1 dan SP2B Bulanan.
  * Pembacaan data tersimpan LPH Semester 1 2026.
  * Kalkulasi live untuk Tahap 2 yang belum disimpan.
  * Format prompt bagian 11.
- Jalankan test via `php artisan test --filter=CopilotOfficialLaporanTest`.
- Jalankan `vendor/bin/pint` pada file-file yang diubah.
- Commit ke Git.
