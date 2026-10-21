# Rencana Implementasi: Hybrid Deterministic Engine & AI Narrator

**Tanggal:** 21 Oktober 2026  
**Dokumen Desain:** `docs/superpowers/specs/2026-10-21-deterministic-audit-engine-design.md`

---

## Tahap 1: Pembakuan Skor & Formula Deterministik di `BaseTabAuditScanner.php`
- [ ] Ubah method `calculateComplianceScore(array $findings): int`:
  - Default: `100`
  - Pengurangan: `danger` (-20), `warning` (-10), `info` (-2).
  - Batas: `max(0, min(100, $score))`.
- [ ] Pastikan seluruh `scanDeterministic` di 11 scanner menghitung skor menggunakan `calculateComplianceScore($findings)` dan memasukkannya ke dalam hasil return:
  `'compliance_score' => $this->calculateComplianceScore($findings)`.

## Tahap 2: Standardisasi Prompt Narrator di Seluruh 11 Scanner
- [ ] Perbarui `getSystemPrompt()` di 11 scanner:
  - Instruksikan AI bahwa audit telah selesai dinilai secara deterministik oleh sistem dengan skor kepatuhan dan daftar temuan yang pasti.
  - Peran AI adalah menyusun `executive_summary` dan memperkaya `description` & `recommendation` untuk temuan yang diberikan.
  - Dilarang keras mengubah skor atau mengarang temuan fiktif baru.

## Tahap 3: Implementasi Merge Guard di `BkuAuditOrchestrator.php`
- [ ] Kunci `compliance_score` selalu dari `$preScan['compliance_score']`.
- [ ] Gabungkan temuan sistem dengan narasi AI berdasarkan pencocokan ID temuan (`id`).
- [ ] Jika tidak ada temuan (`$preScan['pre_findings']` kosong), skor otomatis 100 dan AI menyusun narasi apresiasi kepatuhan serta saran pemeliharaan tertib administrasi kas.

## Tahap 4: Unit Testing & Verifikasi
- [ ] Tambahkan unit test di `tests/Unit/BkuMultiTabAuditTest.php` untuk memvalidasi:
  - Perhitungan skor kepatuhan deterministik selalu konsisten (100 jika bersih, berkurang sesuai bobot penalti).
  - Orchestrator selalu mengunci skor dari deterministik engine dan tidak terpengaruh variasi skor dari respon AI.
- [ ] Format kode dengan `vendor/bin/pint`.
- [ ] Jalankan test suite dan verifikasi tidak ada regresi.
