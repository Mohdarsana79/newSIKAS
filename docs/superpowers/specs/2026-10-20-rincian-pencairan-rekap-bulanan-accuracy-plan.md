# Rencana Implementasi: Akurasi Rekapitulasi Bulanan Rincian Pencairan / Payroll (Bulan September Rp 4.233.000)

- **Tanggal**: 2026-10-20
- **Status**: Siap Dijalankan
- **Dokumen Desain**: `docs/superpowers/specs/2026-10-20-rincian-pencairan-rekap-bulanan-accuracy-design.md`

---

## Tahapan Pekerjaan

### Langkah 1: Backend `getRincianPencairan()` Pre-Aggregated `rekap_bulanan` (`CopilotService.php`)
1. **Tambahkan Agregasi Bulanan Matematis**:
   - Di `app/Services/Ai/CopilotService.php` pada method `getRincianPencairan()`:
   - Hitung agregasi per bulan untuk 12 bulan berurutan (`Januari` s.d. `Desember`):
     - `no`: urutan 1..12
     - `bulan`: nama bulan resmi
     - `tahap`: 1 (Jan–Jun) atau 2 (Jul–Des)
     - `jumlah_transaksi`: jumlah baris transaksi di bulan tersebut
     - `total_bruto`: akumulasi nominal bruto
     - `total_pajak`: akumulasi potongan pajak (PPN + PPh 21 + PPh 23)
     - `total_neto`: nominal neto diterima (`total_bruto - total_pajak`)
   - Masukkan array `rekap_bulanan` ke dalam payload return tool.

---

### Langkah 2: Backend System Prompt Guidelines di CopilotService (`CopilotService.php`)
1. **Instruksi Khusus Rekapitulasi Per Bulan**:
   - Di `buildSystemPrompt()`, perbarui pedoman Rincian Pencairan dan Payroll:
     - Jika pengguna menanyakan *"rekap per bulan"*, *"sebaran bulanan"*, *"rincian pencairan perbulan"*, atau *"payroll perbulan"*:
       - AI **WAJIB** menyajikan tabel HTML resmi:
         `<th>No</th><th>Bulan</th><th>Tahap</th><th style="text-align: right;">Jumlah Transaksi</th><th style="text-align: right;">Bruto (Rp)</th><th style="text-align: right;">Potongan Pajak (Rp)</th><th style="text-align: right;">Diterima Neto (Rp)</th>`
       - AI **DILARANG KERAS** menghitung manual dari daftar transaksi mentah, dan **WAJIB** menggunakan data dari array `rekap_bulanan` yang dihasilkan backend (khusus bulan September: 15 transaksi, Bruto: Rp 4.233.000, Pajak: Rp 77.600, Neto: Rp 4.155.400).

---

### Langkah 3: Pengujian & Validasi
1. **Unit Test Backend**:
   - Buat skrip `scratch/test_rekap_bulanan_unit.php` untuk memvalidasi:
     - Key `rekap_bulanan` tersedia di hasil `getRincianPencairan()`.
     - Bulan September menghasilkan tepat 15 transaksi dan Bruto Rp 4.233.000.
     - Total ke-12 bulan klop 100% dengan total ringkasan eksekutif (Rp 29.000.000).
2. **Live Test Simulasi Copilot**:
   - Buat skrip `scratch/test_live_chat_monthly_accuracy.php` untuk menguji query pengguna:
     - *"minta rincian pencairan perbulan"*
     - *"minta payroll perbulan"*
     - Pastikan AI menyajikan tabel dengan September = **Rp 4.233.000**.
3. **Format Code & Git Commit**:
   - Jalankan `vendor/bin/pint app/Services/Ai/CopilotService.php`.
   - Lakukan git commit.
