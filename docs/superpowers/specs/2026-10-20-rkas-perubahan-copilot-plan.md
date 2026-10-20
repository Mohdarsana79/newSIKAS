# Rencana Implementasi: Integrasi RKAS Perubahan pada SIKAS AI Copilot

Dokumen ini adalah rencana implementasi langkah demi langkah untuk mengintegrasikan pembacaan data **RKAS Perubahan** ke dalam SIKAS AI Copilot sesuai spesifikasi pada [2026-10-20-rkas-perubahan-copilot-design.md](file:///c:/laragon/www/newSIKAS2/newSIKAS/docs/superpowers/specs/2026-10-20-rkas-perubahan-copilot-design.md).

---

## Task 1: Tambahkan Helper Resolusi RKAS Aktif (`getRkasContext`)
- **File:** `app/Services/Ai/CopilotService.php`
- **Tindakan:**
  Buat method protected `getRkasContext(int $tahun, string $variant, ?int $bulanAngka = null): array`:
  1. Resolusi model `penganggaran`, `rkas`, `rkas_perubahan`, dan foreign key `penganggaranFk`.
  2. Periksa apakah `$rkasPerubahanClass` ada dan memiliki record untuk `penganggaran_id` tahun berjalan (`$hasPerubahan`).
  3. Hitung apakah bulan yang diminta berada di semester/tahap 2 (`$isTahap2 = $bulanAngka !== null && $bulanAngka >= 7`).
  4. Tentukan:
     - `active_pagu_class`: `$hasPerubahan ? $rkasPerubahanClass : $rkasClass`
     - `target_model_class`: `($isTahap2 && $hasPerubahan) ? $rkasPerubahanClass : $rkasClass`
     - `usage_fk`: `VariantConfig::uraianDetailRkasFk($variant, $isTahap2 && $hasPerubahan)`
  5. Kembalikan array berisi semua entitas di atas agar siap dipakai di seluruh tool Copilot.
- **Verifikasi:** Sintaks PHP valid (`php -l`).

---

## Task 2: Perbarui `getBkpRobMonthly` untuk RKAS Perubahan & Deteksi Pergeseran
- **File:** `app/Services/Ai/CopilotService.php`
- **Tindakan:**
  Di dalam `getBkpRobMonthly()`:
  1. Panggil `getRkasContext($tahun, $variant, $bulanAngka)`.
  2. Hitung Pagu RKAS per Rekening dari `$active_pagu_class` (bukan hardcoded `rkasClass`).
  3. Jika `$hasPerubahan === true`:
     - Hitung juga Pagu Awal per Rekening dari `$rkasClass`.
     - Hitung selisih pergeseran: `$selisih = $paguPerubahan - $paguAwal`.
     - Tambahkan field:
       * `pagu_rkas`: Pagu Perubahan resmi
       * `pagu_awal`: Pagu Murni sebelum perubahan
       * `selisih_perubahan`: `$selisih`
       * `status_pergeseran`: Jika `$selisih > 0` -> "Bertambah Rp X pada RKAS Perubahan (Tahap 2)"; Jika `$selisih < 0` -> "Berkurang Rp X"; Jika 0 -> "Tetap".
  4. Evaluasi `sisa_pagu_rkas = max(0.0, $paguRkas - $totalRealisasiTahunan)`.
  5. Pastikan jika realisasi tahunan (misal Rp 130.000) sama dengan pagu perubahan (Rp 130.000), sisa pagunya Rp 0 dan **tidak dilaporkan over budget / kelebihan**.
- **Verifikasi:** Uji coba dengan data Benda Pos tahun 2025 (Pagu Awal 120.000, Perubahan 130.000, Realisasi 130.000).

---

## Task 3: Perbarui `getBudgetPaguSummary` untuk Status Dokumen Anggaran
- **File:** `app/Services/Ai/CopilotService.php`
- **Tindakan:**
  Di dalam `getBudgetPaguSummary()`:
  1. Panggil `getRkasContext($tahun, $variant)`.
  2. Hitung rencana belanja dari `$active_pagu_class`.
  3. Jika `$hasPerubahan`:
     - Hitung juga total belanja dari `$rkasClass` (Awal).
     - Berikan informasi status:
       * `status_dokumen`: `'RKAS Perubahan'`
       * `total_rencana_rkas_aktif`: total nominal perubahan
       * `total_rencana_rkas_awal`: total nominal awal
       * `selisih_perubahan_tahunan`: selisih total
  4. Jika tidak ada perubahan:
     * `status_dokumen`: `'RKAS Awal (Murni)'`
- **Verifikasi:** Jalankan tool pagu summary untuk tahun 2025 dan 2026.

---

## Task 4: Perbarui `searchRkasActivity` untuk Mendukung Tahap 1 & Tahap 2
- **File:** `app/Services/Ai/CopilotService.php`
- **Tindakan:**
  Di dalam `searchRkasActivity()`:
  1. Konversi `$bulan` menjadi angka bulan jika ada.
  2. Panggil `getRkasContext($tahun, $variant, $targetMonthNumber)`.
  3. Lakukan query pencarian:
     - Jika `$targetMonthNumber <= 6`: Query ke `$rkasClass` (RKAS Awal) dengan foreign key `rkas_id`.
     - Jika `$targetMonthNumber >= 7` dan `$hasPerubahan`: Query ke `$rkasPerubahanClass` dengan foreign key `rkas_perubahan_id`.
     - Jika `$targetMonthNumber === null`: Query ke `$active_pagu_class` (atau gabungan Jan–Jun awal dan Jul–Des perubahan).
  4. Hitung sisa kuota belanja menggunakan foreign key yang tepat (`rkas_id` vs `rkas_perubahan_id`).
- **Verifikasi:** Cari kegiatan di bulan September 2025 (Materai), pastikan kuota dan harga dari RKAS Perubahan tampil.

---

## Task 5: Penyesuaian `prepareBkuDraft` & `commitBkuTransaction`
- **File:** `app/Services/Ai/CopilotService.php`
- **Tindakan:**
  1. Pada `prepareBkuDraft()`:
     - Ekstraksi bulan dari tanggal kuitansi.
     - Panggil `getRkasContext($tahun, $variant, $bulanAngka)`.
     - Cari data RKAS referensi dari model yang tepat (`$target_model_class`).
     - Hitung sisa pagu menggunakan `$usage_fk`.
     - Simpan informasi `rkas_fk_name` (`rkas_id` atau `rkas_perubahan_id`) di staging card.
  2. Pada `commitBkuTransaction()`:
     - Baca `rkas_fk_name` dari payload staging card.
     - Simpan foreign key yang sesuai pada record `bku_uraian_details` (misal `rkas_perubahan_id` jika Tahap 2 RKAS Perubahan, atau `rkas_id` jika Tahap 1).
- **Verifikasi:** Uji coba pembuatan draf transaksi di bulan Tahap 1 dan Tahap 2.

---

## Task 6: Pembaruan System Prompt AI untuk Penjelasan Cerdas
- **File:** `app/Services/Ai/CopilotService.php`
- **Tindakan:**
  Perbarui instruksi di `$systemPrompt`:
  1. Instruksikan AI untuk memperhatikan field `status_pergeseran` dan `status_dokumen`.
  2. Jika suatu rekening belanja mengalami pergeseran di RKAS Perubahan:
     - Tampilkan Pagu Perubahan sebagai pagu utama.
     - Berikan keterangan cerdas bahwa pagu telah disesuaikan melalui RKAS Perubahan (misal: "Pagu Benda Pos telah disesuaikan menjadi Rp 130.000 di RKAS Perubahan karena ada penambahan 1 materai di Tahap 2").
     - JANGAN MENYATAKAN over budget jika realisasi <= Pagu Perubahan.
- **Verifikasi:** Tanya Copilot mengenai ROB dan status Benda Pos.

---

## Task 7: Pengujian Terintegrasi & Commit
1. Jalankan unit/integration scratch test untuk memastikan query berjalan tanpa error dan data akurat.
2. Format kode PHP dengan `vendor/bin/pint`.
3. Commit perubahan ke Git dengan format conventional commit `feat(ai-copilot): support RKAS Perubahan across ROB pagu search and bku draft`.
