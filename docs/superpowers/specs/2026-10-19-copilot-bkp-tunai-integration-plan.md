# Rencana Implementasi: Integrasi Buku Kas Pembantu Tunai (BKP Tunai) pada SIKAS AI Copilot

Dokumen ini adalah rencana implementasi langkah demi langkah untuk mengintegrasikan fitur Buku Kas Pembantu Tunai (BKP Tunai) ke dalam SIKAS AI Copilot sesuai spesifikasi pada [2026-10-19-copilot-bkp-tunai-integration-design.md](file:///c:/laragon/www/newSIKAS2/newSIKAS/docs/superpowers/specs/2026-10-19-copilot-bkp-tunai-integration-design.md).

---

## Task 1: Definisi Tool `get_bkp_tunai_monthly` pada `CopilotService`
- **File:** `app/Services/Ai/CopilotService.php`
- **Tindakan:**
  Tambahkan deklarasi fungsi OpenAI-compatible ke dalam array `getAvailableTools()`:
  - `name`: `get_bkp_tunai_monthly`
  - `description`: Mengambil data resmi Buku Kas Pembantu Tunai (BKP Tunai) per bulan (saldo awal kas tunai di brankas bendahara, penarikan uang tunai dari bank, potongan pajak belanja tunai, belanja tunai kuitansi BKU, setoran tunai kembali ke bank, penyetoran pajak tunai NTPN, serta saldo akhir uang tunai fisik bendahara, beserta rincian mutasi tunai per tanggal).
  - `parameters`: `bulan` (enum Januari - Desember, required).
- **Verifikasi:** Sintaks PHP valid (`php -l`).

---

## Task 2: Dispatcher `executeTool`
- **File:** `app/Services/Ai/CopilotService.php`
- **Tindakan:**
  Tambahkan case baru pada `match ($name)` di `executeTool()`:
  ```php
  'get_bkp_tunai_monthly' => $this->getBkpTunaiMonthly($tahun, $args['bulan'] ?? 'Maret', $variant),
  ```
- **Verifikasi:** Pastikan dispatcher memanggil method `getBkpTunaiMonthly` dengan aman.

---

## Task 3: Implementasi Backend `getBkpTunaiMonthly`
- **File:** `app/Services/Ai/CopilotService.php`
- **Tindakan:**
  Implementasikan method `protected function getBkpTunaiMonthly(int $tahun, string $bulan, string $variant): array`:
  1. Validasi varian dan temukan model `Penganggaran` untuk tahun aktif.
  2. Dapatkan objek `BukuKasService` melalui `new BukuKasService($variant)`.
  3. Konversi nama bulan ke angka (1 s/d 12).
  4. Hitung `saldo_awal` tunai sebelum bulan target menggunakan `BukuKasService::hitungSaldoTunaiSebelumBulan`.
  5. Ambil mutasi kas tunai bulan berjalan:
     - Record `PenarikanTunai` (kas masuk dari bank ke brankas bendahara).
     - Record `BukuKasUmum` dengan `jenis_transaksi = 'tunai'` dan `is_bunga_record = false` (belanja tunai kuitansi).
     - Record `SetorTunai` (penyetoran kas kembali ke bank jika ada).
     - Potongan pajak belanja tunai (diterima) dan setoran pajak tunai NTPN (pengeluaran).
  6. Urutkan mutasi berdasarkan tanggal (`usort`), lalu hitung running balance:
     `$saldo = $saldo + $penerimaan - $pengeluaran`.
  7. Susun array ringkasan:
     - `saldo_awal`
     - `total_penerimaan`
     - `total_pengeluaran`
     - `saldo_akhir` (sisa uang tunai fisik di brankas)
     - `items` (daftar mutasi tunai per baris)
- **Verifikasi:** Buat skrip scratch untuk menguji kalkulasi dengan data database riil 2026.

---

## Task 4: Pembaruan System Prompt AI
- **File:** `app/Services/Ai/CopilotService.php`
- **Tindakan:**
  1. Tambahkan aturan tegas penanganan **Buku Kas Tunai (BKP Tunai)** pada `$systemPrompt`:
     - Jika pengguna menanyakan Buku Kas Tunai, BKP Tunai, uang tunai di brankas, kas di bendahara, atau belanja tunai bulan X -> WAJIB memanggil `get_bkp_tunai_monthly`.
     - Tampilkan ringkasan posisi kas tunai di atas tabel (Saldo Awal, Total Penerimaan Tunai, Total Pengeluaran Tunai, Saldo Akhir Kas Fisik Brankas).
     - Sajikan mutasi dalam tabel HTML terstruktur rapi:
       `No` | `Tanggal` | `Kode Rekening` | `No. Bukti / Kuitansi` | `Uraian Transaksi Tunai` | `Penerimaan (Rp)` | `Pengeluaran (Rp)` | `Saldo Kas Tunai (Rp)`.
- **Verifikasi:** Validasi teks prompt dan aturan sanitasi respons.

---

## Task 5: Validasi, Format Pint, dan Commit
- **Tindakan:**
  1. Jalankan `vendor/bin/pint` pada `app/Services/Ai/CopilotService.php`.
  2. Jalankan `php -l app/Services/Ai/CopilotService.php`.
  3. Lakukan pengujian langsung fungsi `getBkpTunaiMonthly` melalui scratch script.
  4. Lakukan git commit: `feat(ai-copilot): add BKP Tunai tool and integrate cash book queries`.
