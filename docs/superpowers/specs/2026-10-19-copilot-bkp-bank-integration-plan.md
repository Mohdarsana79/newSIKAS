# Rencana Implementasi: Integrasi Buku Kas Pembantu Bank (BKP Bank) pada SIKAS AI Copilot

Dokumen ini adalah rencana langkah demi langkah untuk mengintegrasikan fitur Buku Kas Pembantu Bank (BKP Bank) ke dalam SIKAS AI Copilot sesuai spesifikasi pada [2026-10-19-copilot-bkp-bank-integration-design.md](file:///c:/laragon/www/newSIKAS2/newSIKAS/docs/superpowers/specs/2026-10-19-copilot-bkp-bank-integration-design.md).

---

## Task 1: Definisi Tool `get_bkp_bank_monthly` pada `CopilotService`
- **File:** `app/Services/Ai/CopilotService.php`
- **Tindakan:**
  Tambahkan deklarasi fungsi OpenAI-compatible ke dalam array `getAvailableTools()`:
  - `name`: `get_bkp_bank_monthly`
  - `description`: Mengambil data resmi Buku Kas Pembantu Bank (BKP Bank) per bulan (saldo awal, penerimaan dana BOSP, penarikan tunai, bunga bank, pajak bunga, belanja transfer non-tunai, STS, dan saldo akhir beserta rincian mutasi per tanggal).
  - `parameters`: `bulan` (enum Januari - Desember, required).
- **Verifikasi:** Sintaks PHP valid (`php -l`).

---

## Task 2: Dispatcher `executeTool`
- **File:** `app/Services/Ai/CopilotService.php`
- **Tindakan:**
  Tambahkan case baru pada `match ($name)` di `executeTool()`:
  ```php
  'get_bkp_bank_monthly' => $this->getBkpBankMonthly($tahun, $args['bulan'] ?? 'Maret', $variant),
  ```
- **Verifikasi:** Pastikan dispatcher memanggil method `getBkpBankMonthly` dengan aman.

---

## Task 3: Implementasi Backend `getBkpBankMonthly`
- **File:** `app/Services/Ai/CopilotService.php`
- **Tindakan:**
  Implementasikan method `protected function getBkpBankMonthly(int $tahun, string $bulan, string $variant): array`:
  1. Validasi varian dan temukan model `Penganggaran` untuk tahun aktif.
  2. Dapatkan objek `BukuKasService` melalui `app(BukuKasService::class)`.
  3. Konversi nama bulan ke angka (1 s/d 12).
  4. Hitung `saldo_awal` bank sebelum bulan target:
     - Menggunakan `BukuKasService::hitungSaldoBankSebelumBulan`.
     - Untuk bulan Januari, sertakan `saldo_awal` tahun lalu dari `PenerimaanDana` jika ada.
  5. Ambil data mutasi bulan berjalan:
     - `PenerimaanDana` (transfer dana BOSP masuk).
     - `PenarikanTunai` (pengambilan kas tunai oleh bendahara).
     - `BukuKasUmum` dengan `is_bunga_record = true` (pendapatan bunga bank & pajak bunga bank).
     - `BukuKasUmum` dengan `jenis_transaksi = 'non-tunai'` dan `is_bunga_record = false` (belanja transfer CMS).
     - Potongan pajak non-tunai (diterima) dan penyetoran pajak non-tunai NTPN (pengeluaran).
     - `Sts` dengan `is_bkp = true` (pengembalian ke kas daerah).
  6. Urutkan mutasi berdasarkan tanggal (`usort`), lalu hitung running balance:
     `$saldo = $saldo + $penerimaan - $pengeluaran`.
  7. Susun array ringkasan:
     - `saldo_awal`
     - `total_penerimaan`
     - `total_pengeluaran`
     - `saldo_akhir`
     - `items` (daftar mutasi per baris)
- **Verifikasi:** Buat skrip scratch untuk menguji kalkulasi dengan data database riil 2026.

---

## Task 4: Pembaruan Persona Akrab & System Prompt AI
- **File:** `app/Services/Ai/CopilotService.php`
- **Tindakan:**
  1. Perbarui `$systemPrompt` untuk menggunakan persona santai/teman akrab ("Bro", "Om", "Bos").
  2. Tambahkan aturan eksplisit penanganan **Buku Kas Bank**:
     - Jika pengguna menanyakan Buku Kas Bank, BKP Bank, saldo rekening bank, atau mutasi bank bulan X -> WAJIB memanggil `get_bkp_bank_monthly`.
     - Format ringkasan saldo di atas tabel (Saldo Awal, Total Penerimaan, Total Pengeluaran, Saldo Akhir Bank).
     - Sajikan mutasi dalam tabel HTML terstruktur rapi:
       `No` | `Tanggal` | `Kode Rekening` | `No. Bukti` | `Uraian Transaksi Bank` | `Penerimaan (Rp)` | `Pengeluaran (Rp)` | `Saldo Bank (Rp)`.
- **Verifikasi:** Validasi teks prompt dan format sanitasi respons.

---

## Task 5: Validasi, Format Pint, dan Commit
- **Tindakan:**
  1. Jalankan `vendor/bin/pint` pada `app/Services/Ai/CopilotService.php`.
  2. Jalankan `php -l app/Services/Ai/CopilotService.php`.
  3. Lakukan pengujian langsung fungsi `getBkpBankMonthly` melalui scratch script.
  4. Lakukan git commit: `feat(ai-copilot): add BKP Bank tool and integrate bank cash book queries`.
