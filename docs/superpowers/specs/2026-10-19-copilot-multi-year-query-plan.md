# Rencana Implementasi: Dukungan Kueri Multi-Tahun pada SIKAS AI Copilot

Dokumen ini adalah rencana implementasi langkah demi langkah untuk mendukung kueri multi-tahun (akses data 2025, 2026, dan tahun lain di database) pada SIKAS AI Copilot sesuai spesifikasi pada [2026-10-19-copilot-multi-year-query-design.md](file:///c:/laragon/www/newSIKAS2/newSIKAS/docs/superpowers/specs/2026-10-19-copilot-multi-year-query-design.md).

---

## Task 1: Tambahkan Parameter `tahun` Opsional pada `getAvailableTools()`
- **File:** `app/Services/Ai/CopilotService.php`
- **Tindakan:**
  Tambahkan properti parameter `tahun` (type: `integer`, description: `Tahun anggaran data yang diminta. Opsional, default adalah tahun aktif.`) pada:
  1. `get_budget_pagu_summary`
  2. `get_bku_monthly_realization`
  3. `get_bkp_bank_monthly`
  4. `get_bkp_tunai_monthly`
  5. `search_rkas_activity`
  6. `query_realization_comparison`
- **Verifikasi:** Sintaks PHP valid (`php -l`).

---

## Task 2: Deteksi Tahun di Database & Pembaruan System Prompt
- **File:** `app/Services/Ai/CopilotService.php`
- **Tindakan:**
  1. Pada `CopilotService::chat()`, baca daftar tahun yang tersedia:
     ```php
     $penganggaranClass = VariantConfig::getModelClass('penganggaran', $variant);
     $availableYears = $penganggaranClass::orderBy('tahun_anggaran', 'asc')->pluck('tahun_anggaran')->toArray();
     $daftarTahunStr = ! empty($availableYears) ? implode(', ', $availableYears) : (string) $tahun;
     ```
  2. Perbarui `$systemPrompt` untuk menginformasikan ketersediaan arsip multi-tahun dan memerintahkan AI menggunakan parameter `tahun` jika pengguna bertanya tentang tahun tertentu (seperti 2025).
- **Verifikasi:** Validasi instruksi prompt tidak membocorkan format teknis.

---

## Task 3: Eksekusi Dinamis pada `executeTool()`
- **File:** `app/Services/Ai/CopilotService.php`
- **Tindakan:**
  Pada `executeTool()`, ekstrak tahun yang diminta:
  ```php
  $targetTahun = ! empty($args['tahun']) ? (int) $args['tahun'] : $tahun;
  ```
  dan operkan `$targetTahun` ke seluruh pemanggilan method:
  - `getBudgetPaguSummary($targetTahun, $variant)`
  - `getBkuMonthlyRealization($targetTahun, ...)`
  - `getBkpBankMonthly($targetTahun, ...)`
  - `getBkpTunaiMonthly($targetTahun, ...)`
  - `searchRkasActivity($targetTahun, ...)`
  - `queryRealizationComparison($targetTahun, ...)`
- **Verifikasi:** Uji dispatcher dengan parameter tahun 2025.

---

## Task 4: Pengujian & Validasi Multi-Tahun
- **Tindakan:**
  1. Buat skrip scratch untuk menguji pemanggilan `executeTool` dengan tahun 2025 dan 2026.
  2. Pastikan data pagu 2025 (Rp 31.320.000) dan transaksi BKU 2025 terbaca dengan akurat.
  3. Jalankan `vendor/bin/pint --test` dan `php -l`.

---

## Task 5: Commit Perubahan
- **Tindakan:**
  Lakukan git commit: `feat(ai-copilot): support multi-year queries across all financial tools`.
