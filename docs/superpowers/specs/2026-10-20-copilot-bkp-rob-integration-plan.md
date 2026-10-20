# Rencana Implementasi: Integrasi Buku Pembantu Rincian Objek Belanja (BKP ROB) pada SIKAS AI Copilot

Dokumen ini adalah rencana implementasi langkah demi langkah untuk mengintegrasikan fitur Buku Pembantu Rincian Objek Belanja (BKP ROB) ke dalam SIKAS AI Copilot sesuai spesifikasi pada [2026-10-20-copilot-bkp-rob-integration-design.md](file:///c:/laragon/www/newSIKAS2/newSIKAS/docs/superpowers/specs/2026-10-20-copilot-bkp-rob-integration-design.md).

---

## Task 1: Definisi Tool `get_bkp_rob_monthly` pada `CopilotService`
- **File:** `app/Services/Ai/CopilotService.php`
- **Tindakan:**
  Tambahkan deklarasi fungsi OpenAI-compatible ke dalam array `getAvailableTools()`:
  - `name`: `get_bkp_rob_monthly`
  - `description`: Mengambil data resmi pembukuan Buku Pembantu Rincian Objek Belanja (BKP ROB) pada bulan tertentu dalam tahun anggaran aktif. Menyajikan saldo anggaran belanja tersedia, rincian serapan belanja yang dikelompokkan per Kode dan Nama Rekening Belanja (seperti ATK, Honorarium, Pemeliharaan, Internet, dll), daftar kuitansi transaksi per objek belanja beserta running total dan sisa anggaran kas, serta perbandingan terhadap Pagu RKAS akun tersebut. Panggil tool ini saat pengguna bertanya tentang Buku ROB, Rincian Objek Belanja, realisasi belanja per rekening, atau serapan akun belanja tertentu.
  - `parameters`:
    - `bulan` (enum: Januari s/d Desember, required).
    - `tahun` (integer, opsional, default: tahun aktif).
    - `rekening` (string, opsional, kata kunci pencarian nama atau kode rekening belanja).
- **Verifikasi:** Sintaks PHP valid (`php -l`).

---

## Task 2: Dispatcher `executeTool`
- **File:** `app/Services/Ai/CopilotService.php`
- **Tindakan:**
  Tambahkan case baru pada `match ($name)` di `executeTool()`:
  ```php
  'get_bkp_rob_monthly' => $this->getBkpRobMonthly($targetTahun, $args['bulan'] ?? 'Maret', $variant, $args['rekening'] ?? null),
  ```
- **Verifikasi:** Pastikan dispatcher memanggil method `getBkpRobMonthly` dengan parameter `$targetTahun`, `$bulan`, `$variant`, dan `$rekening` yang dinamis.

---

## Task 3: Implementasi Backend `getBkpRobMonthly`
- **File:** `app/Services/Ai/CopilotService.php`
- **Tindakan:**
  Implementasikan method `protected function getBkpRobMonthly(int $tahun, string $bulan, string $variant, ?string $rekeningFilter = null): array`:
  1. Validasi varian dan resolusi model dinamis (`Penganggaran`, `BukuKasUmum`, `Rkas`, serta foreign key `penganggaranFk`).
  2. Cari entitas `Penganggaran` berdasarkan `$tahun`. Jika tidak ditemukan, kembalikan pesan error.
  3. Konversi nama bulan ke angka (1 s/d 12).
  4. Hitung `saldoAwal` (Anggaran Belanja Tersedia di awal bulan):
     - Total dana tersedia: `app(BukuKasService::class)->hitungTotalDanaTersedia($penganggaran->id)`.
     - Jika bulan > 1, kurangi dengan total realisasi kotor belanja non-bunga dari awal tahun hingga sebelum bulan target.
  5. Ambil data transaksi BKU belanja non-bunga pada bulan target:
     - Eager-load `rekeningBelanja` dan `kodeKegiatan`.
     - Urutkan berdasarkan `rekening_belanja_id` dan `tanggal_transaksi`.
  6. Kelompokkan per Rekening Belanja (`kode_rekening` & `rincian_objek`):
     - Jika `$rekeningFilter` diisi, lakukan filter substring (case-insensitive) pada kode rekening atau nama rincian objek.
     - Hitung running cumulative belanja per baris transaksi (`jumlah_kumulatif`), serta sisa anggaran kas per baris (`sisa_anggaran_kas = saldoAwal - jumlah_kumulatif`).
  7. Perkaya dengan Pagu RKAS:
     - Ambil pagu anggaran tahunan akun terkait dari tabel RKAS.
     - Hitung realisasi tahun berjalan untuk akun tersebut dan sisa pagu RKAS akun.
  8. Susun payload pengembalian:
     - `bulan`, `tahun`, `saldo_awal_anggaran`, `total_realisasi_bulan_ini`, `sisa_anggaran_kas`, `filter_rekening`.
     - `rekap_objek` (Daftar ringkasan per rekening: kode, nama, pagu RKAS, realisasi bulan ini, total tahunan, sisa pagu RKAS).
     - `kelompok_objek` (Daftar rincian transaksi belanja kuitansi per kelompok rekening).
- **Verifikasi:** Uji coba kalkulasi dengan data database nyata tahun 2026 (Maret) dan 2025.

---

## Task 4: Pembaruan System Prompt AI
- **File:** `app/Services/Ai/CopilotService.php`
- **Tindakan:**
  Tambahkan aturan eksplisit penanganan **Buku Pembantu Rincian Objek Belanja (BKP ROB)** pada `$systemPrompt`:
  1. Jika pengguna menanyakan Buku ROB, BKP ROB, Rincian Objek Belanja, realisasi belanja per rekening, serapan akun belanja, atau rincian objek tertentu (ATK, honor, internet):
     - WAJIB memanggil `get_bkp_rob_monthly` dengan parameter `bulan`, `tahun` (jika ada), dan `rekening` (jika menanyakan akun spesifik).
     - DILARANG memanggil `get_bku_monthly_realization` (yang untuk BKU kronologis umum) atau `search_rkas_activity` (yang untuk pencarian perencanaan).
  2. Format Penyajian Respons:
     - Ringkasan posisi kas anggaran ROB di atas tabel (Anggaran Belanja Tersedia di Awal Bulan, Total Realisasi Belanja Bulan Ini, Sisa Anggaran Kas Belanja Akhir Bulan).
     - Tabel Ringkasan Eksekutif per Objek Belanja:
       `No` | `Kode Rekening` | `Nama Objek Belanja` | `Pagu RKAS (Rp)` | `Realisasi Bulan Ini (Rp)` | `Total Realisasi Tahunan (Rp)` | `Sisa Pagu RKAS (Rp)`.
     - Tabel Rincian Transaksi Belanja per Kelompok Objek Belanja:
       Setiap kelompok rekening memiliki judul kode & nama rekening, diikuti tabel:
       `No` | `Tanggal` | `No. Bukti / Kuitansi` | `Uraian Belanja` | `Realisasi (Rp)` | `Jumlah Kumulatif (Rp)` | `Sisa Anggaran Kas (Rp)`.
- **Verifikasi:** Validasi teks prompt dan aturan sanitasi respons.

---

## Task 5: Validasi, Format Pint, dan Commit
- **Tindakan:**
  1. Buat skrip scratch `scratch/test_copilot_bkp_rob.php` untuk menguji output tool pada bulan Maret 2026 (seluruh akun dan filter spesifik "ATK"), serta multi-tahun 2025.
  2. Jalankan `vendor/bin/pint --test app/Services/Ai/CopilotService.php`.
  3. Jalankan `php -l app/Services/Ai/CopilotService.php`.
  4. Lakukan git commit: `feat(ai-copilot): add BKP ROB tool and integrate object ledger queries`.
