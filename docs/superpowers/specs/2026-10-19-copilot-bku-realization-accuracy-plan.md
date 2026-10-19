# Implementation Plan: Akurasi Data Realisasi BKU & Realisasi RKAS Awal pada Copilot AI

**Tanggal:** 19 Oktober 2026  
**Dokumen Desain Terkait:** [2026-10-19-copilot-bku-realization-accuracy-design.md](file:///c:/laragon/www/newSIKAS2/newSIKAS/docs/superpowers/specs/2026-10-19-copilot-bku-realization-accuracy-design.md)  
**Status:** Siap Dieksekusi  

---

## 1. Rencana Eksekusi

### Tahap 1: Backend - Definisi Tool Baru di `getAvailableTools()`
- Di `CopilotService.php`:
  - Tambahkan function definition `get_bku_monthly_realization`:
    ```php
    [
        'type' => 'function',
        'function' => [
            'name' => 'get_bku_monthly_realization',
            'description' => 'Mengambil data resmi pembukuan kas BKU (Buku Kas Umum) pada bulan tertentu (total pengeluaran belanja riil, belanja kumulatif s.d. bulan tersebut, dan rincian kuitansi belanja BKU lengkap dengan tanggal, nomor nota, toko penyedia, dan rekening belanja). Panggil tool ini saat pengguna bertanya tentang realisasi belanja BKU, pembukuan kas bulanan, atau daftar kuitansi yang dibayarkan di bulan tertentu.',
            'parameters' => [
                'type' => 'object',
                'properties' => [
                    'bulan' => [
                        'type' => 'string',
                        'enum' => [
                            'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
                            'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
                        ],
                        'description' => 'Nama bulan pembukuan BKU yang diminta (Januari sampai Desember).',
                    ],
                ],
                'required' => ['bulan'],
            ],
        ],
    ]
    ```

### Tahap 2: Backend - Dispatcher & Method `getBkuMonthlyRealization()`
- Di `executeTool()`:
  - Hubungkan `'get_bku_monthly_realization'` ke method `$this->getBkuMonthlyRealization($tahun, $args['bulan'] ?? 'Januari', $variant)`.
- Implementasi method `getBkuMonthlyRealization(int $tahun, string $bulan, string $variant): array`:
  - Validasi bulan dan dapatkan `$bulanAngka` (1-12).
  - Ambil `penganggaran` aktif untuk `$tahun` dan `$variant`.
  - Hitung:
    - Total Belanja BKU Bulan Ini: `buku_kas_umums` `whereMonth('tanggal_transaksi', $bulanAngka)` `whereYear('tanggal_transaksi', $tahun)` `where('is_bunga_record', false)` `sum('total_transaksi_kotor')`.
    - Total Belanja Kumulatif s.d. Bulan Ini: `whereMonth('tanggal_transaksi', '<=', $bulanAngka)`.
  - Ambil transaksi BKU bulan tersebut beserta relasi:
    - `with(['kodeKegiatan', 'rekeningBelanja', 'uraianDetails.rkas'])`.
  - Susun array `transaksi` dengan informasi:
    - `no`, `tanggal` (d/m/Y), `no_bukti` (`nomor_nota` ?? `id_transaksi`), `uraian`, `rekanan` (`nama_toko` ?? '-'), `kode_rekening`, `nama_rekening`, `nominal` (`total_transaksi_kotor` ?? `dibelanjakan`), dan rincian belanja.
  - Kembalikan array payload data resmi.

### Tahap 3: Backend - Penyesuaian System Prompt
- Di `$systemPrompt` `CopilotService.php`:
  - Berikan instruksi pemisahan eksplisit:
    - Jika pengguna menanyakan *"realisasi BKU"*, *"belanja kas di BKU"*, atau *"transaksi BKU bulan X"*:
      WAJIB memanggil `get_bku_monthly_realization`.
      Tampilkan ringkasan: Total Belanja Bulan Ini (Rp) dan Total Belanja Kumulatif (Rp).
      Sajikan tabel HTML dengan kolom: `No`, `Tanggal Transaksi`, `No. Bukti / Nota`, `Uraian Belanja BKU`, `Rekanan / Toko`, `Rekening Belanja`, `Nominal Belanja (Rp)` rata kanan.
    - Jika pengguna menanyakan *"rencana anggaran RKAS"*, *"pagu kegiatan RKAS"*:
      Panggil `search_rkas_activity`.

### Tahap 4: Pengujian & Validasi
- Jalankan scratch test lokal untuk memverifikasi `getBkuMonthlyRealization(2026, 'Maret', 'reguler')` menghasilkan total belanja Rp 8.348.000 dengan daftar kuitansi yang presisi.
- Jalankan `npm run build` dan pastikan build berhasil 100%.
- Komit perubahan ke Git.
