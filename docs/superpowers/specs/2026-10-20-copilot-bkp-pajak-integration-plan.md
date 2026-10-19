# Rencana Implementasi: Integrasi Buku Kas Pembantu Pajak (BKP Pajak) pada SIKAS AI Copilot

Dokumen ini adalah rencana implementasi langkah demi langkah untuk mengintegrasikan fitur Buku Kas Pembantu Pajak (BKP Pajak) ke dalam SIKAS AI Copilot sesuai spesifikasi pada [2026-10-20-copilot-bkp-pajak-integration-design.md](file:///c:/laragon/www/newSIKAS2/newSIKAS/docs/superpowers/specs/2026-10-20-copilot-bkp-pajak-integration-design.md).

---

## Task 1: Definisi Tool `get_bkp_pajak_monthly` pada `CopilotService`
- **File:** `app/Services/Ai/CopilotService.php`
- **Tindakan:**
  Tambahkan deklarasi fungsi OpenAI-compatible ke dalam array `getAvailableTools()`:
  - `name`: `get_bkp_pajak_monthly`
  - `description`: Mengambil data resmi pembukuan Buku Kas Pembantu Pajak (BKP Pajak) pada bulan tertentu (saldo awal kas pajak yang belum disetor, pemotongan/penerimaan pajak belanja kuitansi BKU, penyetoran pajak ke kas negara/daerah dengan NTPN, saldo akhir kas pajak belum disetor, breakdown per jenis pajak PPN/PPh21/PPh22/PPh23/PB1, serta daftar transaksi belanja yang pajaknya belum disetorkan). Panggil tool ini saat pengguna bertanya tentang Buku Kas Pajak, BKP Pajak, setoran pajak, NTPN, pemotongan pajak belanja, atau saldo kas pajak.
  - `parameters`:
    - `bulan` (enum: Januari s/d Desember, required).
    - `tahun` (integer, opsional, default: tahun aktif).
- **Verifikasi:** Sintaks PHP valid (`php -l`).

---

## Task 2: Dispatcher `executeTool`
- **File:** `app/Services/Ai/CopilotService.php`
- **Tindakan:**
  Tambahkan case baru pada `match ($name)` di `executeTool()`:
  ```php
  'get_bkp_pajak_monthly' => $this->getBkpPajakMonthly($targetTahun, $args['bulan'] ?? 'Maret', $variant),
  ```
- **Verifikasi:** Pastikan dispatcher memanggil method `getBkpPajakMonthly` dengan `$targetTahun` yang dinamis.

---

## Task 3: Implementasi Backend `getBkpPajakMonthly`
- **File:** `app/Services/Ai/CopilotService.php`
- **Tindakan:**
  Implementasikan method `protected function getBkpPajakMonthly(int $tahun, string $bulan, string $variant): array`:
  1. Validasi varian dan resolusi model dinamis (`Penganggaran`, `BukuKasUmum`, dan foreign key `penganggaranFk`).
  2. Cari entitas `Penganggaran` berdasarkan `$tahun`. Jika tidak ditemukan, kembalikan pesan error yang jelas.
  3. Konversi nama bulan ke angka (1 s/d 12).
  4. Hitung `saldo_awal` kas pajak sebelum bulan target menggunakan `app(BukuKasService::class)->hitungSaldoPajakSebelumBulan($penganggaran->id, $bulanAngka, $tahun)`.
  5. Ambil data transaksi:
     - **Penerimaan Pajak (Pungutan Belanja):** Transaksi BKU belanja di bulan target dengan `tanggal_transaksi` pada bulan tersebut yang memiliki `total_pajak > 0` atau `total_pajak_daerah > 0`. Pisahkan dan klasifikasikan ke PPN, PPh 21, PPh 22, PPh 23, dan PB 1.
     - **Pengeluaran Pajak (Setor Kas Negara/Daerah):** Transaksi BKU yang disetorkan di bulan target (`tanggal_lapor` pada bulan tersebut) dan memiliki nomor `ntpn`.
     - **Daftar Belum Disetor:** Transaksi pemotongan pajak hingga bulan target yang belum memiliki `ntpn` atau yang tanggal lapornya setelah bulan target.
  6. Urutkan mutasi berdasarkan tanggal (`usort`), lalu hitung running balance:
     `$saldo = $saldo + $penerimaan - $pengeluaran`.
  7. Susun array ringkasan:
     - `bulan`, `tahun`
     - `saldo_awal`
     - `total_penerimaan` (Total pemotongan pajak di bulan ini)
     - `total_pengeluaran` (Total penyetoran pajak ke negara/daerah)
     - `saldo_akhir` (Sisa pajak di bendahara yang belum disetor)
     - `rincian_jenis_pajak` (Breakdown nominal per PPN, PPh 21, PPh 22, PPh 23, PB 1)
     - `belum_disetor_count` & `belum_disetor` (Daftar transaksi yang pajaknya belum ada bukti NTPN)
     - `items` (Daftar mutasi kronologis ber-running balance)
- **Verifikasi:** Uji coba kalkulasi dengan data database nyata tahun 2026 dan 2025.

---

## Task 4: Pembaruan System Prompt AI
- **File:** `app/Services/Ai/CopilotService.php`
- **Tindakan:**
  Tambahkan aturan eksplisit penanganan **Buku Kas Pembantu Pajak (BKP Pajak)** pada `$systemPrompt`:
  1. Jika pengguna menanyakan Buku Kas Pajak, BKP Pajak, setoran pajak, bukti NTPN, potongan pajak kuitansi, atau saldo pajak:
     - WAJIB memanggil `get_bkp_pajak_monthly` dengan parameter `bulan` (dan `tahun` jika ditentukan).
     - DILARANG memanggil `get_bkp_bank_monthly` atau `get_bkp_tunai_monthly` atau `get_bku_monthly_realization`.
  2. Format Penyajian Respons:
     - Ringkasan posisi kas pajak di atas tabel (Saldo Awal, Total Pungut/Terima, Total Setor NTPN, Saldo Akhir / Pajak Belum Disetor).
     - Rincian per jenis pajak (Tabel atau daftar PPN, PPh 21, PPh 22, PPh 23, PB 1).
     - Tabel HTML mutasi transaksi kronologis dengan format Rupiah rata kanan:
       `No` | `Tanggal` | `Kode Rekening` | `No. Bukti / NTPN` | `Uraian Transaksi Pajak` | `Pemotongan (Rp)` | `Penyetoran (Rp)` | `Saldo Pajak (Rp)`.
     - Peringatan proaktif jika terdapat transaksi pajak yang belum memiliki NTPN (belum disetorkan).
- **Verifikasi:** Validasi teks prompt dan aturan sanitasi respons.

---

## Task 5: Validasi, Format Pint, dan Commit
- **Tindakan:**
  1. Buat skrip scratch `scratch/test_copilot_bkp_pajak.php` untuk menguji output tool pada bulan Maret 2026, April 2026, dan tahun 2025.
  2. Jalankan `vendor/bin/pint --test app/Services/Ai/CopilotService.php`.
  3. Jalankan `php -l app/Services/Ai/CopilotService.php`.
  4. Lakukan git commit: `feat(ai-copilot): add BKP Pajak tool and integrate tax ledger queries`.
