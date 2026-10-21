# Rencana Implementasi: Koreksi Persona dan Penyajian 27 Dokumen Tanda Terima Tahap 1 pada SIKAS AI Copilot

- **Tanggal**: 21 Oktober 2026
- **Status**: Ready for Implementation
- **Dokumen Desain Referensi**: `docs/superpowers/specs/2026-10-21-copilot-tanda-terima-tahap1-dan-persona-design.md`

---

## 1. Ikhtisar & Sasaran

Mengatasi masalah pada SIKAS AI Copilot yang sebelumnya keliru menyatakan bahwa Tahap 1 tahun 2026 kosong dari tanda terima dan memanggil pengguna dengan sebutan "Tante".
Sasaran implementasi:
1. Menegaskan persona di System Prompt Copilot: Pengguna adalah **Om Moh Gian Darsana** (Bendahara BOSP pria). Sapaan wajib: `"Om"` atau `"Pak Bendahara"`. **DILARANG KERAS** memanggil `"Tante"`.
2. Menghapus kalimat sempit anti-halusinasi yang memicu klaim "Tahap 1 kosong", dan menggantinya dengan aturan klasifikasi:
   - Jika pengguna meminta daftar tanda terima tahap/bulan (contoh: "minta tanda terima tahap 1"), Copilot wajib memanggil `get_spj_documents_status` dengan `tahap: 1` dan menyajikan seluruh 27 dokumen Tanda Terima riil dalam 1 tabel HTML terstruktur tanpa dipotong.
   - Jika pengguna meminta honor guru tahap 1, Copilot menjelaskan secara ramah bahwa pos Belanja Jasa Tenaga Pendidikan dicairkan di Tahap 2 oleh Selpianti, namun di Tahap 1 terdapat 27 dokumen tanda terima kepanitiaan/ekskul/upah/transport, lalu menyajikan daftarnya.
3. Menambahkan parameter `tahap` pada deklarasi tool `get_spj_document_detail` dan method backend `getSpjDocumentDetail()`, serta menyaring transaksi berdasarkan semester/tahap (1 untuk Jan–Jun, 2 untuk Jul–Des).
4. Menambahkan test suite PHPUnit untuk memvalidasi filter tahap pada tanda terima dan menyimulasikan chat Copilot.

---

## 2. Tahapan Eksekusi

### Langkah 1: Penambahan Parameter `tahap` pada Tool `get_spj_document_detail`
- **File**: `app/Services/Ai/CopilotService.php`
- Tambahkan deklarasi parameter `'tahap'` pada array tools `getAvailableTools()`:
  ```php
  'tahap' => [
      'type' => 'integer',
      'enum' => [1, 2],
      'description' => 'Filter tahapan transaksi (1 untuk Jan–Jun, 2 untuk Jul–Des). Opsional.',
  ],
  ```
- Perbarui pemanggilan dispatcher `executeTool()`:
  ```php
  'get_spj_document_detail' => $this->getSpjDocumentDetail(
      $args['tipe_dokumen'] ?? 'kwitansi',
      $args['query'] ?? null,
      isset($args['bku_id']) ? (int) $args['bku_id'] : null,
      $targetTahun,
      $variant,
      $args['bulan'] ?? null,
      isset($args['tahap']) ? (int) $args['tahap'] : null
  ),
  ```
- Tambahkan parameter `?int $tahap = null` pada signature method `getSpjDocumentDetail`:
  ```php
  public function getSpjDocumentDetail(
      string $tipeDokumen,
      ?string $query = null,
      ?int $bkuId = null,
      int $tahun = 2026,
      string $variant = 'reguler',
      ?string $bulan = null,
      ?int $tahap = null
  ): array
  ```
- Tambahkan filter tahap pada `$docQuery` dan `$bkuFindQuery`:
  - Jika `$tahap === 1`: `whereMonth('tanggal_transaksi', '<=', 6)`.
  - Jika `$tahap === 2`: `whereMonth('tanggal_transaksi', '>=', 7)`.

### Langkah 2: Pembaruan System Prompt pada `CopilotService.php`
- **File**: `app/Services/Ai/CopilotService.php`
- **Aturan Persona**:
  - Tegaskan sapaan akrab: Sapa pengguna dengan sebutan `"Om"` atau `"Pak Bendahara"`.
  - Tambahkan larangan tegas: *"DILARANG KERAS memanggil pengguna dengan sebutan 'Tante' atau menebak gender wanita. Pengguna aplikasi ini adalah Om Moh Gian Darsana (Bendahara BOSP)."*
- **Aturan Penyajian Tanda Terima & Anti-Klaim Kosong**:
  - Tambahkan pedoman jelas pada Bagian 10 (Audit SPJ & Dokumen Resmi):
    * Saat pengguna meminta daftar/koleksi tanda terima pada tahap/bulan tertentu (contoh: *"minta tanda terima tahap 1"*, *"tanda terima bulan Maret"*, *"tanda terima 2026"*):
      - WAJIB memanggil `get_spj_documents_status` dengan parameter `tahap` atau `bulan`.
      - WAJIB menyajikan seluruh dokumen Tanda Terima riil yang berstatus `Ada` dalam tabel HTML lengkap (di Tahap 1 ada 27 dokumen tanda terima sah: upah tukang semprot rumput, sewa tenda, insentif 8 orang panitia kegiatan LDK, insentif pendampingan TKA, insentif operator komputer/dapodik, insentif pelatih ekskul pramuka, insentif proktor & teknisi TKA, insentif pengawas ujian, dan transport LPJ).
      - **DILARANG KERAS MENYATAKAN TAHAP 1 KOSONG!** Tanda terima di SIKAS mencakup seluruh belanja jasa, kepanitiaan, ekskul, dan upah tukang yang membutuhkan tanda terima fisik, bukan hanya honor guru.
      - Tampilkan tabel HTML lengkap memuat kolom: No, Tanggal, No. Bukti BKU, Penerima / Rekanan, Uraian Belanja, Nominal Bruto (Rp), Pajak (Rp), Diterima (Rp), No. Tanda Terima.
      - Tawarkan bantuan santai jika Om ingin melihat lembar rincian tanda tangan untuk salah satu nomor bukti tertentu.
    * Saat pengguna meminta *"tanda terima honor guru tahap 1"*:
      - Jelaskan dengan santai dan ramah bahwa akun Belanja Jasa Tenaga Pendidikan (5.1.02.02.01.0013) baru dicairkan pada Tahap 2 (September dan Oktober) oleh Selpianti, namun di Tahap 1 terdapat 27 dokumen tanda terima untuk insentif kepanitiaan/ekskul/upah tukang/transportasi, lalu langsung tampilkan tabel ke-27 dokumen tanda terima tersebut.

### Langkah 3: Pengujian Otomatis (Unit & Integration Test)
- **File**: `tests/Unit/CopilotSpjTandaTerimaTest.php`
- Tambahkan unit test baru:
  1. `test_get_spj_documents_status_tahap_1_returns_27_tanda_terima`: memastikan 27 dokumen tanda terima sah terdeteksi di Tahap 1.
  2. `test_get_spj_document_detail_with_tahap_filter`: memastikan filter tahap 1 tidak melompat ke transaksi tahap 2.
  3. `test_system_prompt_enforces_om_persona_and_forbids_tante`: memvalidasi isi system prompt memuat larangan kata "Tante" dan mewajibkan "Om".
- Jalankan test suite via `php artisan test --filter=CopilotSpjTandaTerimaTest`.

### Langkah 4: Format Kode Pint & Commit
- Jalankan `vendor/bin/pint` pada file-file yang dimodifikasi.
- Commit perubahan ke Git dengan commit message yang rapi dan deskriptif.
