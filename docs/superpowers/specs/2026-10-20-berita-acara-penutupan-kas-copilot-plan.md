# Rencana Implementasi: Berita Acara Pemeriksaan Kas pada SIKAS AI Copilot

Dokumen ini adalah rencana implementasi langkah demi langkah untuk mengintegrasikan fitur **Berita Acara Pemeriksaan Kas (BA Penutupan / Pemeriksaan Kas)** ke dalam SIKAS AI Copilot sesuai spesifikasi pada [2026-10-20-berita-acara-penutupan-kas-copilot-design.md](file:///c:/laragon/www/newSIKAS2/newSIKAS/docs/superpowers/specs/2026-10-20-berita-acara-penutupan-kas-copilot-design.md).

---

## Task 1: Definisi Tool `get_berita_acara_penutupan_kas_monthly` pada `CopilotService`
- **File:** `app/Services/Ai/CopilotService.php`
- **Tindakan:**
  Tambahkan deklarasi tool baru ke dalam array `getAvailableTools()`:
  - `name`: `get_berita_acara_penutupan_kas_monthly`
  - `description`: Mengambil data resmi Berita Acara Pemeriksaan Kas bulanan dalam tahun anggaran aktif. Menyajikan data legalitas SK Kepala Sekolah & SK Bendahara (nomor & tanggal SK), hari & tanggal pemeriksaan kas, rincian fisik uang kertas & logam di hadapan bendahara, saldo rekening bank, total kas dihitung, saldo uang menurut Buku Kas Umum (BKU), serta rekonsiliasi kesesuaian kas. Panggil tool ini saat pengguna bertanya tentang Berita Acara Penutupan Kas, Berita Acara Pemeriksaan Kas, pemeriksaan kas bendahara, atau legalitas penutupan kas bulanan.
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
  'get_berita_acara_penutupan_kas_monthly' => $this->getBeritaAcaraPenutupanKasMonthly($targetTahun, $args['bulan'] ?? 'Maret', $variant),
  ```
- **Verifikasi:** Pastikan dispatcher meneruskan `$targetTahun`, `$bulan`, dan `$variant` ke handler.

---

## Task 3: Implementasi Backend `getBeritaAcaraPenutupanKasMonthly`
- **File:** `app/Services/Ai/CopilotService.php`
- **Tindakan:**
  Implementasikan method:
  `protected function getBeritaAcaraPenutupanKasMonthly(int $tahun, string $bulan, string $variant): array`
  1. Validasi varian dan resolusi model dinamis (`Penganggaran`, `BukuKasUmum`, foreign key `penganggaranFk`).
  2. Cari entitas `Penganggaran` berdasarkan `$tahun` beserta relasi `sekolah`. Jika tidak ditemukan, kembalikan pesan informatif.
  3. Konversi nama bulan ke angka (1 s/d 12).
  4. Inisialisasi `new BukuKasService($variant)`.
  5. Cek status penutupan kas resmi dari BKU:
     - Cari record BKU dengan `is_bunga_record = true` pada bulan & tahun bersangkutan.
     - Jika ditemukan dan memiliki `tanggal_tutup`:
       `$isClosed = true; $tanggalTutupCarbon = Carbon::parse($bungaRecord->tanggal_tutup);`
     - Jika belum ada:
       `$isClosed = false; $tanggalTutupCarbon = Carbon::create($tahun, $bulanAngka, 1)->endOfMonth();`
     - Hitung nama hari dalam Bahasa Indonesia dari `$tanggalTutupCarbon->dayOfWeek` (Minggu s/d Sabtu).
     - Format tanggal pemeriksaan: `$tanggalTutupCarbon->locale('id')->translatedFormat('d F Y')`.
  6. Ekstrak data legalitas SK & Pejabat:
     - Kepala Sekolah: nama, NIP, SK (`sk_kepala_sekolah` ?? '-'), Tanggal SK (format teks Indonesia jika ada).
     - Bendahara: nama, NIP, SK (`sk_bendahara` ?? '-'), Tanggal SK (format teks Indonesia jika ada).
     - Lembaga & Lokasi: `sekolah->nama_sekolah`, `sekolah->kecamatan`.
  7. Hitung posisi uang di hadapan Bendahara:
     - Kas tunai brankas (uang kertas + logam): `$saldoKas = max(0, (float) $bukuKasService->getSaldoKasFromPembantu($penganggaran->id, $tahun, $bulan, $bulanAngka));`
     - Saldo rekening bank: `$saldoBank = max(0, (float) $bukuKasService->hitungSaldoAkhirBkpBank($penganggaran->id, $tahun, $bulan));`
     - Surat berharga dll: `0` (nihil).
     - Total kas hitung: `$totalKasHitung = $saldoKas + $saldoBank;`
  8. Ambil saldo uang menurut Buku Kas Umum:
     - `$dataUmum = $bukuKasService->getDataFromBkpUmumCalculation($penganggaran->id, $tahun, $bulan, $bulanAngka);`
     - `$saldoBuku = max(0, (float) ($dataUmum['totalPenerimaan'] ?? 0) - (float) ($dataUmum['totalPengeluaran'] ?? 0));`
  9. Hitung rekonsiliasi & kepatuhan audit:
     - `$selisihTotal = $totalKasHitung - $saldoBuku;` (ideal: 0).
     - `$selisihBukuTunai = $saldoBuku - $saldoKas;` (merepresentasikan dana yang masih di rekening bank).
     - `$isBalanced = abs($selisihTotal) == 0;`
     - `$isCashLimitExceeded = $saldoKas > 10000000;`
     - `$skKepsekLengkap = !empty($penganggaran->sk_kepala_sekolah) && $penganggaran->sk_kepala_sekolah !== '-';`
     - `$skBendaharaLengkap = !empty($penganggaran->sk_bendahara) && $penganggaran->sk_bendahara !== '-';`
  10. Kembalikan array payload terstruktur.
- **Verifikasi:** Uji coba kalkulasi dengan data database nyata tahun 2025.

---

## Task 4: Pembaruan System Prompt AI
- **File:** `app/Services/Ai/CopilotService.php`
- **Tindakan:**
  Perbarui instruksi `$systemPrompt` untuk membedakan dan menyajikan Berita Acara Pemeriksaan Kas:
  1. Jika pengguna menanyakan "Berita Acara Pemeriksaan Kas", "Berita Acara Penutupan Kas", "Pemeriksaan kas bendahara", atau legalitas penutupan kas:
     - Panggil tool `get_berita_acara_penutupan_kas_monthly` dengan parameter `bulan` dan `tahun`.
  2. Format Penyajian Naratif Resmi:
     - Header: `### BERITA ACARA PEMERIKSAAN KAS` disertai badge status `[STATUS: RESMI DITUTUP]` atau `[STATUS: DRAFT POSISI BERJALAN - BKU BELUM DITUTUP RESMI]`.
     - Klausul Pembuka Legal:
       Menyebutkan hari, tanggal, nama Kepala Sekolah beserta nomor & tanggal SK penunjukan, dan nama Bendahara BOS beserta nomor & tanggal SK penugasan.
     - Tabel Jumlah Uang yang Dihitung di Hadapan Bendahara:
       - a) Uang kertas dan uang logam: Rp [...]
       - b) Saldo Bank: Rp [...]
       - c) Surat Berharga dll: Rp 0
       - **Jumlah Kas Dihitung (a + b + c): Rp [...]**
       - **Saldo Uang Menurut Buku Kas Umum: Rp [...]**
     - Rekonsiliasi & Kesimpulan:
       - Konfirmasi klop penuh (Kas Fisik + Bank = Saldo BKU, Selisih Rp 0).
       - Penjelasan bahwa perbedaan antara Saldo Buku dan Kas Tunai Brankas adalah sisa dana yang tersimpan di rekening bank.
     - Smart Insights & Kepatuhan:
       - Peringatan jika kas tunai brankas melebihi Rp 10.000.000.
       - Peringatan jika data SK pejabat belum lengkap di profil penganggaran.
       - Ajakan memeriksa kas fisik sebelum tutup buku jika statusnya masih draft.
- **Verifikasi:** Validasi instruksi prompt dan uji respon assistant.

---

## Task 5: Pengujian, Format Pint, dan Commit
- **Tindakan:**
  1. Buat skrip scratch `scratch/test_copilot_berita_acara.php` untuk menguji output tool pada bulan Maret 2025 (bulan yang sudah ditutup) dan bulan Januari 2025.
  2. Uji end-to-end chat simulation via `CopilotService::chat()`.
  3. Jalankan `php -l app/Services/Ai/CopilotService.php`.
  4. Jalankan `vendor\bin\pint app/Services/Ai/CopilotService.php`.
  5. Lakukan git commit: `feat(ai-copilot): integrate Berita Acara Pemeriksaan Kas into Copilot`.
