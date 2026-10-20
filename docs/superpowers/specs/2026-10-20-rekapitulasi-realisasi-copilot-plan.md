# Rencana Implementasi: Rekapitulasi Realisasi pada SIKAS AI Copilot

Dokumen ini adalah rencana implementasi langkah demi langkah untuk mengintegrasikan fitur **Rekapitulasi Realisasi Penggunaan Dana BOSP (Formulir BOS K-7A)** dan **Rekapitulasi Realisasi Belanja Per Rekening Belanja (LK 2)** ke dalam SIKAS AI Copilot sesuai spesifikasi pada [2026-10-20-rekapitulasi-realisasi-copilot-design.md](file:///c:/laragon/www/newSIKAS2/newSIKAS/docs/superpowers/specs/2026-10-20-rekapitulasi-realisasi-copilot-design.md).

---

## Task 1: Definisi Tool `get_rekapitulasi_realisasi_bosp` dan `get_rekapitulasi_realisasi_per_rekening` pada `CopilotService`
- **File:** `app/Services/Ai/CopilotService.php`
- **Tindakan:**
  Tambahkan dua deklarasi tool baru ke dalam array `getAvailableTools()`:
  1. `get_rekapitulasi_realisasi_bosp`:
     - `description`: Mengambil data resmi Rekapitulasi Realisasi Penggunaan Dana BOSP (Formulir BOS K-7A) pada tahun anggaran aktif berdasarkan periode tertentu (Tahunan, Tahap 1, Tahap 2, atau nama bulan Januari s/d Desember). Menyajikan ringkasan arus kas (saldo sebelumnya, penerimaan, penggunaan, sisa saldo), rincian serapan per 8 Standar Nasional Pendidikan, serta serapan per 11 Komponen Penggunaan Dana BOS. Panggil tool ini saat pengguna bertanya tentang rekapitulasi realisasi penggunaan dana BOSP, rekapitulasi 8 standar, evaluasi komponen BOS, serapan anggaran tahap 1/2, sisa dana periode ini, atau formulir K-7A.
     - `parameters`:
       - `periode` (string, default: "Tahunan", opsional: "Tahunan", "Tahap 1", "Tahap 2", atau nama bulan "Januari" s/d "Desember").
       - `tahun` (integer, opsional, default: tahun aktif).
  2. `get_rekapitulasi_realisasi_per_rekening`:
     - `description`: Mengambil data resmi Rekapitulasi Realisasi Belanja Per Rekening Belanja (Format LK 2) pada tahun anggaran aktif. Menyajikan perincian realisasi belanja operasi (pakai habis, barang & jasa) dan belanja modal (peralatan & mesin, aset tetap lainnya) beserta rasio persentasenya. Panggil tool ini saat pengguna bertanya tentang rekapitulasi belanja per rekening, rekap belanja modal vs operasi, realisasi belanja barang pakai habis, atau format LK 2.
     - `parameters`:
       - `periode` (string, default: "Tahunan", enum: ["Tahunan", "Tahap 1", "Tahap 2"]).
       - `tahun` (integer, opsional, default: tahun aktif).
- **Verifikasi:** Sintaks PHP valid (`php -l`).

---

## Task 2: Dispatcher `executeTool`
- **File:** `app/Services/Ai/CopilotService.php`
- **Tindakan:**
  Tambahkan dua case baru pada `match ($name)` di `executeTool()`:
  ```php
  'get_rekapitulasi_realisasi_bosp' => $this->getRekapitulasiRealisasiBosp($targetTahun, $args['periode'] ?? 'Tahunan', $variant),
  'get_rekapitulasi_realisasi_per_rekening' => $this->getRekapitulasiRealisasiPerRekening($targetTahun, $args['periode'] ?? 'Tahunan', $variant),
  ```
- **Verifikasi:** Pastikan dispatcher meneruskan `$targetTahun`, `$args['periode']`, dan `$variant` ke masing-masing method handler.

---

## Task 3: Implementasi Backend `getRekapitulasiRealisasiBosp` dan `getRekapitulasiRealisasiPerRekening`
- **File:** `app/Services/Ai/CopilotService.php`
- **Tindakan:**
  Implementasikan dua method baru:
  
  1. `protected function getRekapitulasiRealisasiBosp(int $tahun, string $periode, string $variant): array`:
     - Validasi varian dan resolusi model dinamis (`Penganggaran`, `BukuKasUmum`, `PenerimaanDana`, `Sts`, `penganggaranFk`).
     - Cari data `Penganggaran` sesuai `$tahun` beserta relasi `sekolah`.
     - Tentukan bulan target:
       * "tahunan" => `[1..12]`
       * "tahap 1" => `[1..6]`
       * "tahap 2" => `[7..12]`
       * Nama bulan => `[$bulanAngka]`
     - Struktur 8 Standar Nasional (01 s/d 08) & Mapping 11 Komponen BOS.
     - Ambil transaksi BKU non-bunga pada bulan target dengan relasi `kodeKegiatan` dan `rekeningBelanja`.
     - Hitung realisasi per standar dan per komponen.
     - Hitung ringkasan arus kas (saldo periode sebelumnya via BKU kumulatif bulan sebelum target pertama, penerimaan dana periode ini, total penggunaan BKU periode ini, dan akhir saldo).
     - Filter komponen BOS aktif (hanya `realisasi > 0`).
     - Hitung persentase porsi kontribusi tiap standar.
     - Return array terstruktur.

  2. `protected function getRekapitulasiRealisasiPerRekening(int $tahun, string $periode, string $variant): array`:
     - Validasi varian dan resolusi model dinamis.
     - Tentukan bulan target (Tahunan: 1..12, Tahap 1: 1..6, Tahap 2: 7..12).
     - Query transaksi BKU pada bulan target dengan relasi `rekeningBelanja`.
     - Hitung akumulasi:
       * Pakai Habis (`5.1.02.01`)
       * Barang & Jasa (`5.1.02.02`, `5.1.02.03`, `5.1.02.04`)
       * Modal Peralatan & Mesin (`5.2.02`)
       * Modal Aset Tetap Lainnya (`5.2.05`)
     - Hitung subtotal operasi, subtotal modal, grand total, dan rasio persentase.
     - Return array terstruktur.
- **Verifikasi:** Uji coba kalkulasi dengan data database nyata tahun 2025.

---

## Task 4: Pembaruan System Prompt AI
- **File:** `app/Services/Ai/CopilotService.php`
- **Tindakan:**
  Perbarui instruksi `$systemPrompt` untuk kedua jenis rekapitulasi realisasi:
  1. Rekapitulasi Realisasi Penggunaan Dana BOSP (8 Standar & Komponen BOS / K-7A):
     - Panggil `get_rekapitulasi_realisasi_bosp` dengan parameter `periode` dan `tahun`.
     - Tampilkan Header & Badge Periode.
     - Tampilkan Tabel Ringkasan Arus Keuangan (Saldo Sebelumnya, Penerimaan, Penggunaan/Realisasi, Sisa Saldo).
     - Tampilkan Tabel Realisasi Menurut 8 Standar Nasional Pendidikan (No, Standar Pendidikan, Realisasi Rp, Porsi %).
     - Tampilkan Rincian Komponen BOS yang aktif (> Rp 0).
     - Berikan analisis audit santai mengenai persentase serapan anggaran dan sisa saldo.
  2. Rekapitulasi Belanja Per Rekening Belanja (LK 2):
     - Panggil `get_rekapitulasi_realisasi_per_rekening` dengan parameter `periode` dan `tahun`.
     - Tampilkan Header & Periode.
     - Tampilkan Tabel Rekapitulasi Belanja Operasi & Modal (Pakai Habis, Barang & Jasa, Peralatan & Mesin, Aset Lainnya, Total).
     - Berikan ulasan perbandingan porsi belanja operasi (kegiatan rutin) vs belanja modal aset fisik sekolah.
- **Verifikasi:** Validasi instruksi prompt dan uji respon assistant.

---

## Task 5: Pengujian, Format Pint, dan Commit
- **Tindakan:**
  1. Buat skrip scratch `scratch/test_copilot_rekapitulasi.php` untuk menguji output tool dan simulasi chat.
  2. Uji skenario:
     - Realisasi Tahap 1 tahun 2025 (8 Standar & Komponen).
     - Realisasi Belanja Per Rekening (LK 2) Tahap 1 tahun 2025.
     - Realisasi Bulanan (Maret 2025).
  3. Jalankan `php -l app/Services/Ai/CopilotService.php`.
  4. Jalankan `vendor\bin\pint app/Services/Ai/CopilotService.php`.
  5. Lakukan git commit: `feat(ai-copilot): integrate Rekapitulasi Realisasi into Copilot`.
