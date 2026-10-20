# Rencana Implementasi: Registrasi Penutupan Kas (Formulir BOS-K7B) pada SIKAS AI Copilot

Dokumen ini adalah rencana implementasi langkah demi langkah untuk mengintegrasikan fitur **Register Penutupan Kas (Formulir BOS-K7B)** ke dalam SIKAS AI Copilot sesuai spesifikasi pada [2026-10-20-register-penutupan-kas-copilot-design.md](file:///c:/laragon/www/newSIKAS2/newSIKAS/docs/superpowers/specs/2026-10-20-register-penutupan-kas-copilot-design.md).

---

## Task 1: Definisi Tool `get_bkp_registrasi_penutupan_kas_monthly` pada `CopilotService`
- **File:** `app/Services/Ai/CopilotService.php`
- **Tindakan:**
  Tambahkan deklarasi fungsi OpenAI-compatible ke dalam array `getAvailableTools()`:
  - `name`: `get_bkp_registrasi_penutupan_kas_monthly`
  - `description`: Mengambil data resmi Register Penutupan Kas (Formulir BOS-K7B) pada bulan tertentu dalam tahun anggaran aktif. Menyajikan status tutup buku BKU, tanggal penutupan kas, ringkasan penerimaan (D), pengeluaran (K), saldo buku (A = D - K), saldo kas tunai (B), rincian pecahan fisik uang kertas dan uang logam, saldo rekening bank (3), total kas fisik (1+2+3), rekonsiliasi selisih kas, dan data pejabat pemeriksa (Kepala Sekolah & Bendahara). Panggil tool ini saat pengguna bertanya tentang Register Penutupan Kas, K7B, penutupan kas bulanan, posisi kas fisik uang brankas/bank, atau berita acara pemeriksaan kas.
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
  'get_bkp_registrasi_penutupan_kas_monthly' => $this->getRegisterPenutupanKasMonthly($targetTahun, $args['bulan'] ?? 'Maret', $variant),
  ```
- **Verifikasi:** Pastikan dispatcher memanggil method `getRegisterPenutupanKasMonthly` dengan parameter `$targetTahun`, `$bulan`, dan `$variant`.

---

## Task 3: Implementasi Backend `getRegisterPenutupanKasMonthly`
- **File:** `app/Services/Ai/CopilotService.php`
- **Tindakan:**
  Implementasikan method `protected function getRegisterPenutupanKasMonthly(int $tahun, string $bulan, string $variant): array`:
  1. Validasi varian dan resolusi model dinamis (`Penganggaran`, `BukuKasUmum`, foreign key `penganggaranFk`).
  2. Cari entitas `Penganggaran` berdasarkan `$tahun` beserta relasi `sekolah`. Jika tidak ditemukan, kembalikan pesan error.
  3. Konversi nama bulan ke angka (1 s/d 12).
  4. Inisialisasi instance `BukuKasService`: `$bukuKasService = new BukuKasService($variant);`.
  5. Hitung data penerimaan dan pengeluaran umum:
     `$dataUmum = $bukuKasService->getDataFromBkpUmumCalculation($penganggaran->id, $tahun, $bulan, $bulanAngka);`
     - `$totalPenerimaan = (float) ($dataUmum['totalPenerimaan'] ?? 0);`
     - `$totalPengeluaran = (float) ($dataUmum['totalPengeluaran'] ?? 0);`
     - `$saldoBuku = max(0, $totalPenerimaan - $totalPengeluaran);`
  6. Hitung saldo kas tunai dan saldo bank:
     - `$saldoKas = max(0, (float) $bukuKasService->getSaldoKasFromPembantu($penganggaran->id, $tahun, $bulan, $bulanAngka));`
     - `$saldoBank = max(0, (float) $bukuKasService->hitungSaldoAkhirBkpBank($penganggaran->id, $tahun, $bulan));`
  7. Hitung denominasi uang kertas dan logam:
     - Ambil uang kertas via `$bukuKasService->getDenominasiUangKertas($saldoKas)`.
     - Filter hanya pecahan dengan `lembar > 0` untuk rincian bersih.
     - Ambil uang logam via `$bukuKasService->getDenominasiUangLogam($saldoKas - $totalUangKertas)`.
     - Filter hanya pecahan dengan `keping > 0`.
     - `$totalKasFisik = $totalUangKertas + $totalUangLogam + $saldoBank;`
  8. Cek status penutupan kas resmi dari BKU:
     - Cari record BKU dengan `is_bunga_record = true` pada bulan & tahun bersangkutan.
     - Jika ditemukan dan memiliki `tanggal_tutup`:
       `$isClosed = true; $tanggalPenutupan = Carbon::parse($bungaRecord->tanggal_tutup)->locale('id')->translatedFormat('d F Y');`
     - Jika belum ada:
       `$isClosed = false; $tanggalPenutupan = Carbon::create($tahun, $bulanAngka, 1)->endOfMonth()->locale('id')->translatedFormat('d F Y');`
  9. Ambil tanggal penutupan kas bulan lalu (`$tanggalPenutupanLalu`).
  10. Hitung rekonsiliasi dan kepatuhan audit:
      - `$selisih = $saldoBuku - $totalKasFisik;`
      - `$isCashLimitExceeded = $saldoKas > 10000000;`
  11. Susun payload JSON terstruktur sesuai spesifikasi desain.
- **Verifikasi:** Uji coba kalkulasi dengan data database nyata tahun 2025 dan 2026.

---

## Task 4: Pembaruan System Prompt AI
- **File:** `app/Services/Ai/CopilotService.php`
- **Tindakan:**
  Tambahkan aturan eksplisit penanganan **Register Penutupan Kas (Formulir BOS-K7B)** pada `$systemPrompt`:
  1. Jika pengguna menanyakan "Register Penutupan Kas", "Formulir K7B", "Penutupan kas bulanan", "Posisi uang brankas dan bank", atau "Berita acara pemeriksaan kas":
     - WAJIB memanggil `get_bkp_registrasi_penutupan_kas_monthly` dengan parameter `bulan` dan `tahun`.
     - DILARANG memanggil `get_bku_monthly_realization` atau `get_bkp_tunai_monthly` saja karena tidak mencakup rekonsiliasi lengkap K7B.
  2. Format Penyajian Respons:
     - Header status tutup buku: `[Resmi Ditutup pada DD MMMM YYYY]` atau `[Draft Posisi Berjalan - BKU Belum Ditutup Resmi]`.
     - Tabel Ringkasan Posisi Kas BOS-K7B:
       `Jumlah Total Penerimaan (D)` | `Jumlah Total Pengeluaran (K)` | `Saldo Buku (A = D - K)` | `Saldo Kas Tunai di Bendahara (B)` | `Saldo Bank (3)` | `Total Kas Fisik (1+2+3)` | `Perbedaan (A - B)`.
     - Tabel Rincian Denominasi Uang Kertas & Logam:
       Pecahan nominal, lembar/keping, subtotal. Jika kas tunai Rp 0, beri catatan santai bahwa fisik kas brankas nihil dan dana aman di rekening bank.
     - Catatan Analisis Cerdas & Pengingat:
       - Status klop/seimbang (Rp 0 selisih).
       - Peringatan batas kas tunai brankas jika > Rp 10.000.000.
       - Reminder untuk segera menutup BKU jika statusnya masih draft/belum ditutup.
       - Rekomendasi cetak PDF K7B.
- **Verifikasi:** Validasi instruksi prompt dan uji respon assistant.

---

## Task 5: Pengujian, Format Pint, dan Commit
- **Tindakan:**
  1. Buat skrip scratch `scratch/test_copilot_register_penutupan_kas.php` untuk menguji output tool pada bulan Maret 2025 (bulan yang sudah ditutup) dan bulan yang belum ditutup.
  2. Uji end-to-end chat simulation via `CopilotService::chat()`.
  3. Jalankan `php -l app/Services/Ai/CopilotService.php`.
  4. Jalankan `vendor\bin\pint app/Services/Ai/CopilotService.php`.
  5. Lakukan git commit: `feat(ai-copilot): integrate Register Penutupan Kas BOS-K7B into Copilot`.
