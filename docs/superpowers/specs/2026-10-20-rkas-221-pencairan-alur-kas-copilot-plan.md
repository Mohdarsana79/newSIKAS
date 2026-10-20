# Rencana Implementasi: Integrasi Lembar Kerja 221, Rincian Pencairan, dan Alur Kas pada AI Copilot

- **Tanggal**: 2026-10-20
- **Spesifikasi**: [2026-10-20-rkas-221-pencairan-alur-kas-copilot-design.md](file:///c:/laragon/www/newSIKAS2/newSIKAS/docs/superpowers/specs/2026-10-20-rkas-221-pencairan-alur-kas-copilot-design.md)
- **Status**: Siap Dikerjakan

---

## Task 1: Daftarkan Skema 3 Tool Baru pada `getToolsSchema()`
Tambahkan 3 definisi schema pada method `getToolsSchema()` di `app/Services/Ai/CopilotService.php`:
1. `get_lembar_kerja_221`:
   - Parameters: `tahun`, `variant`, `tipe_dokumen`, `kode_rekening`, `limit`.
2. `get_rincian_pencairan`:
   - Parameters: `tahun`, `variant`, `tahap`, `bulan`, `tipe_dokumen`.
3. `get_alur_kas`:
   - Parameters: `tahun`, `variant`, `tahap`, `tipe_dokumen`.

## Task 2: Tambahkan Dispatching pada `executeTool()`
Pada switch/case method `executeTool()` di `app/Services/Ai/CopilotService.php`:
- Hubungkan `'get_lembar_kerja_221'` ke method `$this->getLembarKerja221(...)`.
- Hubungkan `'get_rincian_pencairan'` ke method `$this->getRincianPencairan(...)`.
- Hubungkan `'get_alur_kas'` ke method `$this->getAlurKas(...)`.

## Task 3: Implementasikan Method `getLembarKerja221()`
- Resolusi model penganggaran & rkas sesuai varian dan tipe dokumen.
- Bangun hierarki header akun (5, 5.1, 5.1.02, 5.1.02.01, 5.1.02.02, 5.1.02.03, 5.1.02.04, 5.2, 5.2.02, 5.2.04, 5.2.05).
- Ambil seluruh item belanja dengan volume, satuan, harga satuan, dan total jumlah.
- Gabungkan dan urutkan baris header & item secara interleaved.
- Terapkan filter kode rekening dan limit item yang aman.

## Task 4: Implementasikan Method `getRincianPencairan()`
- Jika tipe dokumen `'aktif'` / `'perubahan'` dan terdapat RKAS Perubahan aktif:
  - Gabungkan item Tahap 1 dari RKAS Murni dan Tahap 2 dari RKAS Perubahan.
- Jika tipe dokumen `'murni'`:
  - Ambil dari RKAS Murni.
- Terapkan filter tahap (1 / 2) dan bulan jika diberikan.
- Kelompokkan transaksi, hitung total pagu bruto, potongan PPN, PPh 21, PPh 23, dan neto diterima.
- Sertakan atribut penerima, jabatan, rekening bank, dan nomor kwitansi.

## Task 5: Implementasikan Method `getAlurKas()`
- Hitung total pagu anggaran dan penerimaan tahap 1 (50%) & tahap 2 (50%).
- Hitung akumulasi belanja bulanan untuk 12 bulan (Jan–Des).
- Hitung simulasi saldo kas bulanan (saldo awal, penerimaan, belanja, saldo akhir kumulatif).
- Kelompokkan rincian per program & kode kegiatan.

## Task 6: Perkaya System Prompt pada `CopilotService.php`
- Tambahkan pedoman penyajian dan format tabel HTML untuk:
  - Lembar Kerja 221.
  - Rincian Pencairan.
  - Alur Kas.

## Task 7: Pengujian, Formatting, & Git Commit
- Buat test script `scratch/test_copilot_221_rp_alur.php` untuk menguji eksekusi ketiga tool langsung dari backend.
- Buat test script `scratch/test_copilot_chat_221_rp_alur.php` untuk memvalidasi pemanggilan tool otomatis oleh AI model.
- Jalankan formatting Pint: `vendor/bin/pint app/Services/Ai/CopilotService.php`.
- Lakukan Git commit: `feat(ai-copilot): add Lembar Kerja 221, Rincian Pencairan, and Alur Kas tools`.
