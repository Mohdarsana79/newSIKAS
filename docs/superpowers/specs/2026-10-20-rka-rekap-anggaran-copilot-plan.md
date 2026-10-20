# Implementation Plan: Integrasi RKA Rekapitulasi Anggaran ke AI Copilot

Dokumen ini berisi rencana teknis pelaksanaan integrasi data RKA Rekap (Rekapitulasi Anggaran RKAS Murni & Perubahan) ke AI Copilot berdasarkan spesifikasi desain di `docs/superpowers/specs/2026-10-20-rka-rekap-anggaran-copilot-design.md`.

---

## Task 1: Definisi Tool `get_rka_rekap_anggaran` pada Schema CopilotService

- **File Sasaran:** `app/Services/Ai/CopilotService.php`
- **Aksi:**
  1. Tambahkan skema tool `get_rka_rekap_anggaran` pada method `getToolsSchema()`:
     ```php
     [
         'type' => 'function',
         'function' => [
             'name' => 'get_rka_rekap_anggaran',
             'description' => 'Mendapatkan rekapitulasi anggaran resmi (Formulir RKA Rekap) tahunan untuk RKAS Awal, RKAS Perubahan, atau Komparasi Murni vs Perubahan. Menyajikan Bagian A (Penerimaan), Bagian B (Hierarki Akun Belanja 5/5.1/5.2), dan Bagian C (Rencana Anggaran per Tahap 1 & 2).',
             'parameters' => [
                 'type' => 'object',
                 'properties' => [
                     'tahun' => [
                         'type' => 'integer',
                         'description' => 'Tahun anggaran yang dianalisis (contoh: 2025). Default ke tahun aktif.',
                     ],
                     'tipe_dokumen' => [
                         'type' => 'string',
                         'enum' => ['komparasi', 'murni', 'perubahan'],
                         'description' => 'Pilihan jenis dokumen: "komparasi" (default jika ada perubahan aktif), "murni" (RKAS Awal saja), atau "perubahan" (RKAS Perubahan saja).',
                     ],
                 ],
                 'required' => ['tahun'],
             ],
         ],
     ]
     ```
  2. Daftarkan di dispatcher `executeTool()`:
     ```php
     'get_rka_rekap_anggaran' => $this->getRkaRekapAnggaran(
         $targetTahun,
         $variant,
         $args['tipe_dokumen'] ?? 'komparasi'
     ),
     ```

---

## Task 2: Implementasi Method `getRkaRekapAnggaran()` pada CopilotService

- **File Sasaran:** `app/Services/Ai/CopilotService.php`
- **Aksi:**
  1. Buat method protected:
     `protected function getRkaRekapAnggaran(int $tahun, string $variant, string $tipeDokumen = 'komparasi'): array`
  2. Resolusi model varian via `VariantConfig`.
  3. Ambil data penganggaran, `Rkas` (murni), dan `RkasPerubahan` (perubahan).
  4. Lakukan agregasi perhitungan sesuai logika resmi SIKAS:
     - **Bagian A (Penerimaan):** Akun `4.3.1.01`, uraian nama sumber dana, total pagu.
     - **Bagian B (Rekapitulasi Belanja Hierarki):**
       Daftar hierarki akun:
       * `5`: BELANJA
       * `5.1`: BELANJA OPERASI
       * `5.1.01`: Belanja Pegawai (Rp 0 jika honor di akun jasa)
       * `5.1.02`: Belanja Barang dan Jasa
       * `5.1.02.01`: Belanja Barang
       * `5.1.02.02`: Belanja Jasa
       * `5.1.02.03`: Belanja Pemeliharaan
       * `5.1.02.04`: Belanja Perjalanan Dinas
       * `5.2`: BELANJA MODAL
       * `5.2.02`: Belanja Modal Peralatan dan Mesin
       * `5.2.04`: Belanja Modal Jalan, Jaringan, dan Irigasi
       * `5.2.05`: Belanja Modal Aset Tetap Lainnya
       Hitung `murni`, `perubahan`, dan `selisih`.
       Tambahkan baris:
       * `JUMLAH BELANJA`
       * `DEFISIT / SURPLUS` (Penerimaan - Belanja = Rp 0 seimbang).
     - **Bagian C (Rencana Per Tahap):**
       Bagi semester 1 (Jan–Jun) dan semester 2 (Jul–Des) untuk:
       * `1`: Pendapatan (Tahap 1 = 50%, Tahap 2 = 50%)
       * `2.1`: Belanja Operasi
       * `2.2`: Belanja Modal
       * `Total Belanja`
     - **Ringkasan Analisis:**
       Catatan naratif pergeseran dana (misalnya pergeseran Rp 1.683.000 pada Tahap 2 dari Belanja Operasi ke Belanja Modal Buku).

---

## Task 3: Perkaya System Prompt CopilotService

- **File Sasaran:** `app/Services/Ai/CopilotService.php`
- **Aksi:**
  Tambahkan aturan format penyajian saat pengguna bertanya RKA Rekap:
  1. Trigger: *"RKA Rekap"*, *"Rekapitulasi Anggaran"*, *"Rekap RKAS awal dan perubahan"*, *"Komparasi rekap belanja operasi dan modal"*.
  2. AI memanggil tool `get_rka_rekap_anggaran`.
  3. Format Penyajian:
     - Header: `### REKAPITULASI ANGGARAN (RKA REKAP) TAHUN {tahun}`
     - Badge mode dokumen: `[MODE: KOMPARASI RKAS MURNI VS PERUBAHAN]` atau `[DOKUMEN: RKAS PERUBAHAN]`
     - **Bagian A: Penerimaan** (Tabel ringkas)
     - **Bagian B: Rekapitulasi Anggaran Belanja** (Tabel HTML hierarki akun lengkap, baris total belanja, dan baris defisit seimbang Rp 0)
     - **Bagian C: Rencana Pelaksanaan Anggaran per Tahap** (Tabel HTML rencana per tahap)
     - **Catatan Analisis:** Ulasan singkat mengenai komposisi belanja dan pergeseran anggaran.

---

## Task 4: Unit Test & Live Verification

- **Aksi:**
  1. Buat file uji langsung `scratch/test_copilot_rka_rekap.php`.
  2. Eksekusi `executeTool('get_rka_rekap_anggaran', ['tahun' => 2025], 'reguler', 2025)`.
  3. Validasi angka:
     - Penerimaan: Rp 31.320.000.
     - Belanja Operasi Murni Rp 30.520.000 -> Perubahan Rp 28.837.000 (Selisih -Rp 1.683.000).
     - Belanja Modal Murni Rp 800.000 -> Perubahan Rp 2.483.000 (Selisih +Rp 1.683.000).
     - Tahap 1: Seimbang Rp 15.660.000.
     - Tahap 2: Seimbang Rp 15.660.000.
  4. Buat file uji chat DeepSeek `scratch/test_copilot_chat_rka_rekap.php` dan jalankan verifikasi live.

---

## Task 5: Formatting & Commit

- **Aksi:**
  1. Jalankan `php -l app/Services/Ai/CopilotService.php`.
  2. Jalankan `vendor/bin/pint app/Services/Ai/CopilotService.php`.
  3. Lakukan git commit: `feat(ai-copilot): integrate RKA Rekapitulasi Anggaran tool and prompt`.
