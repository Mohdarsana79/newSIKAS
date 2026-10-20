# Rencana Implementasi: Integrasi Data RKAS Perubahan pada SIKAS AI Copilot

Dokumen ini adalah rencana implementasi langkah demi langkah untuk mengintegrasikan data perencanaan **RKAS Perubahan** ke dalam SIKAS AI Copilot sesuai spesifikasi desain pada [2026-10-20-rkas-perubahan-copilot-design.md](file:///c:/laragon/www/newSIKAS2/newSIKAS/docs/superpowers/specs/2026-10-20-rkas-perubahan-copilot-design.md).

---

## Task 1: Definisi Tool `get_rkas_perubahan_summary` dan `get_rkas_perubahan_activities`
- **File:** `app/Services/Ai/CopilotService.php`
- **Tindakan:**
  Tambahkan dua deklarasi tool baru ke dalam array `getAvailableTools()`:
  1. `get_rkas_perubahan_summary`:
     - `description`: Mengambil ringkasan eksekutif dokumen perencanaan RKAS Perubahan pada tahun anggaran aktif. Menyajikan status ketersediaan dokumen perubahan, perbandingan alokasi pagu total & tahapan (Tahap 1 vs Tahap 2: Murni vs Perubahan vs Selisih), pergeseran belanja operasi vs belanja modal, indikator kepatuhan regulasi BOSP (belanja buku min 10%, honor max 20%/40%, pemeliharaan sarpras max 20%), statistik jumlah item yang bergeser, serta histori log rekaman perubahan terbaru. Panggil tool ini saat pengguna bertanya tentang ringkasan RKAS Perubahan, pergeseran anggaran tahun ini, evaluasi pagu perubahan, atau perbandingan umum RKAS Murni vs Perubahan.
     - `parameters`:
       - `tahun` (integer, opsional, default: tahun aktif).
  2. `get_rkas_perubahan_activities`:
     - `description`: Mengambil rincian komparasi kegiatan antar dokumen RKAS Murni dan RKAS Perubahan pada tahun anggaran aktif. Menyajikan perbandingan volume, satuan, harga satuan, total alokasi murni vs perubahan, selisih anggaran, dan status pergeseran per kegiatan. Mendukung filter bulan, tahap, filter jenis perubahan (hanya item yang berubah, bertambah, berkurang, item baru, atau dihapus), serta pencarian kata kunci kegiatan. Panggil tool ini saat pengguna bertanya tentang kegiatan yang berubah di RKAS Perubahan, item belanja apa saja yang ditambah/dikurangi, atau rincian kegiatan RKAS Perubahan pada bulan tertentu.
     - `parameters`:
       - `tahun` (integer, opsional, default: tahun aktif).
       - `bulan` (string, opsional: "Januari" s/d "Desember").
       - `tahap` (string, opsional: "Tahap 1", "Tahap 2").
       - `filter_perubahan` (string, enum: ["berubah", "semua", "bertambah", "berkurang", "baru", "dihapus"], default: "berubah").
       - `query` (string, opsional: kata kunci kegiatan/belanja/uraian).
- **Verifikasi:** Sintaks PHP valid (`php -l`).

---

## Task 2: Dispatcher `executeTool`
- **File:** `app/Services/Ai/CopilotService.php`
- **Tindakan:**
  Tambahkan dua case baru pada `match ($name)` di `executeTool()`:
  ```php
  'get_rkas_perubahan_summary' => $this->getRkasPerubahanSummary($targetTahun, $variant),
  'get_rkas_perubahan_activities' => $this->getRkasPerubahanActivities(
      $targetTahun,
      $variant,
      $args['bulan'] ?? null,
      $args['tahap'] ?? null,
      $args['filter_perubahan'] ?? 'berubah',
      $args['query'] ?? null
  ),
  ```
- **Verifikasi:** Dispatcher meneruskan argumen secara presisi ke masing-masing method handler.

---

## Task 3: Implementasi Backend `getRkasPerubahanSummary`
- **File:** `app/Services/Ai/CopilotService.php`
- **Tindakan:**
  Implementasikan method `protected function getRkasPerubahanSummary(int $tahun, string $variant): array`:
  1. Validasi varian dan resolusi model dinamis (`Penganggaran`, `Rkas`, `RkasPerubahan`, `RekamanPerubahan`, `penganggaranFk`).
  2. Ambil data `Penganggaran` sesuai `$tahun` beserta relasi `sekolah`. Jika tidak ditemukan, return error.
  3. Periksa ketersediaan data di `rkas_perubahans`:
     - Jika kosong (`count === 0`), return `status_perubahan => false` dengan pesan ramah bahwa sekolah masih menjalankan RKAS Murni awal tahun.
  4. Hitung komparasi alokasi Tahap 1 (Jan–Jun) dan Tahap 2 (Jul–Des) antara `Rkas` dan `RkasPerubahan`.
  5. Hitung komparasi belanja operasi (`5.1%`) vs belanja modal (`5.2%`).
  6. Hitung evaluasi kepatuhan batas regulasi BOSP:
     - Belanja Buku Perpustakaan (`05.02.%`, `02.02.%`, `03.02.%`): min. 10% pagu.
     - Pembayaran Honorarium (`07.12.%`): maks. 20% negeri / 40% swasta.
     - Pemeliharaan Sarpras (`05.08.%`): maks. 20% pagu.
  7. Hitung statistik pergeseran item menggunakan algoritma composite signature:
     - Total item murni, total item perubahan, item tetap, bertambah, berkurang, baru, dihapus.
  8. Ambil 5 data log rekaman perubahan terbaru dari `rekaman_perubahans`.
  9. Kembalikan array payload data terstruktur.
- **Verifikasi:** Uji output data tahun 2025 (Pagu Rp 31.320.000, 137 item perubahan).

---

## Task 4: Implementasi Backend `getRkasPerubahanActivities`
- **File:** `app/Services/Ai/CopilotService.php`
- **Tindakan:**
  Implementasikan method `protected function getRkasPerubahanActivities(int $tahun, string $variant, ?string $bulan, ?string $tahap, string $filterPerubahan, ?string $query): array`:
  1. Validasi varian dan resolusi model dinamis.
  2. Ambil seluruh data `Rkas` dan `RkasPerubahan` tahun tersebut dengan eager load `kodeKegiatan` dan `rekeningBelanja`.
  3. Lakukan matching signature `{kode_id}|{kode_rekening_id}|{uraian_clean}|{bulan}`.
  4. Klasifikasikan status setiap item (`Bertambah`, `Berkurang`, `Baru (Ditambahkan)`, `Dihapus dari Perubahan`, `Tetap`).
  5. Terapkan filter:
     - Filter `tahap` (Tahap 1: Jan–Jun, Tahap 2: Jul–Des).
     - Filter `bulan` (sesuai nama bulan yang diminta).
     - Filter `query` (pencarian kata kunci pada uraian, nama rekening, atau kegiatan).
     - Filter `filter_perubahan`:
       * Jika `'berubah'` (default): kecualikan item berstatus `'Tetap'`.
       * Jika `'bertambah'`: hanya item bertambah.
       * Jika `'berkurang'`: hanya item berkurang.
       * Jika `'baru'`: hanya item baru.
       * Jika `'dihapus'`: hanya item dihapus.
       * Jika `'semua'`: sertakan seluruh item.
  6. Format data per item: No, Bulan, Kode Kegiatan, Nama Kegiatan, Kode Rekening, Nama Rekening, Uraian, Murni (vol, satuan, tarif, total), Perubahan (vol, satuan, tarif, total), Selisih (Rp), dan Status.
  7. Kembalikan array payload data terstruktur.
- **Verifikasi:** Uji filter bulan September 2025 dan kata kunci buku.

---

## Task 5: Pembaruan System Prompt AI
- **File:** `app/Services/Ai/CopilotService.php`
- **Tindakan:**
  Perbarui instruksi `$systemPrompt`:
  1. Jika pengguna menanyakan ringkasan status RKAS Perubahan, pergeseran anggaran umum, atau kepatuhan batas regulasi BOSP:
     - Panggil `get_rkas_perubahan_summary`.
     - Tampilkan Header: `### EXECUTIVE SUMMARY: RKAS PERUBAHAN TAHUN {tahun}` `[BADGE: RESMI DITETAPKAN]`.
     - Sajikan tabel HTML ringkasan pagu & tahapan (Murni vs Perubahan vs Selisih).
     - Sajikan tabel HTML evaluasi kepatuhan regulasi BOSP (Buku min 10%, Honor max 20%/40%, Pemeliharaan max 20%).
     - Tampilkan ringkasan statistik pergeseran item dan 3–5 log rekaman perubahan terakhir.
  2. Jika pengguna menanyakan kegiatan apa saja yang berubah, item yang bertambah/berkurang, atau rincian kegiatan RKAS Perubahan pada bulan tertentu:
     - Panggil `get_rkas_perubahan_activities` dengan parameter filter terkait.
     - Tampilkan Header: `### KOMPARASI PERGESERAN KEGIATAN RKAS PERUBAHAN` `[FILTER: ...]`.
     - Sajikan tabel HTML rincian komparasi kegiatan.
     - Berikan ulasan santai mengenai pergeseran pos anggaran yang mencolok.
  3. Penanganan kondisi belum ada RKAS Perubahan:
     - Jika `status_perubahan == false`, jelaskan secara santai bahwa sekolah masih menggunakan dokumen RKAS Murni awal tahun dan belum ada pergeseran anggaran yang disahkan.
- **Verifikasi:** Evaluasi ketepatan pemanggilan tool dan gaya bahasa assistant.

---

## Task 6: Pengujian, Validasi Pint, dan Commit
- **Tindakan:**
  1. Buat skrip scratch `scratch/test_copilot_rkas_perubahan.php` untuk menguji langsung kedua method backend.
  2. Buat skrip scratch `scratch/test_copilot_chat_rkas_perubahan.php` untuk menguji percakapan nyata via DeepSeek-V3.
  3. Jalankan `php -l app/Services/Ai/CopilotService.php`.
  4. Jalankan `vendor/bin/pint app/Services/Ai/CopilotService.php`.
  5. Lakukan git commit: `feat(ai-copilot): integrate RKAS Perubahan summary and activity shifts into Copilot`.
