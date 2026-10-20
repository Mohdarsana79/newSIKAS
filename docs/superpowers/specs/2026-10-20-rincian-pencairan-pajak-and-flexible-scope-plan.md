# Rencana Implementasi: Konsistensi Data Pajak Rincian Pencairan & Penyajian Fleksibel

- **Tanggal**: 2026-10-20
- **Spesifikasi**: [2026-10-20-rincian-pencairan-pajak-and-flexible-scope-design.md](file:///c:/laragon/www/newSIKAS2/newSIKAS/docs/superpowers/specs/2026-10-20-rincian-pencairan-pajak-and-flexible-scope-design.md)
- **Status**: Siap Dikerjakan

---

## Task 1: Update Skema Tool `get_rincian_pencairan` di `getAvailableTools()`
1. Tambahkan parameter `filter_pajak`:
   - type: `string`
   - enum: `['semua', 'berpajak', 'tanpa_pajak']`
   - description: `Pilihan filter transaksi: "semua" (default), "berpajak" (hanya transaksi yang dipotong pajak), atau "tanpa_pajak".`

## Task 2: Update Dispatcher di `executeTool()`
1. Tambahkan passing `$args['filter_pajak'] ?? 'semua'` ke pemanggilan method `$this->getRincianPencairan(...)`.

## Task 3: Perbaiki & Optimasi Method `getRincianPencairan()`
1. Ubah signature method untuk menerima:
   ```php
   protected function getRincianPencairan(
       int $tahun,
       string $variant,
       ?int $tahap = null,
       string $bulan = 'Semua',
       string $tipeDokumen = 'aktif',
       string $filterPajak = 'semua'
   ): array
   ```
2. Pada filter tahap dan bulan, tambahkan pengecekan filter pajak:
   - Jika `$filterPajak === 'berpajak'`: hanya ambil item dengan `total_pajak > 0`.
   - Jika `$filterPajak === 'tanpa_pajak'`: hanya ambil item dengan `total_pajak == 0`.
3. Buat koleksi terpisah `$transaksiBerpajak` yang menyaring seluruh item dengan `total_pajak > 0`.
4. Hapus pembatasan `array_slice($mappedItems, 0, 100)` -> kembalikan seluruh `$mappedItems`.
5. Perbaiki pesan teks jika kosong dari `"Data Alur Kas..."` menjadi `"Data Rincian Pencairan..."`.
6. Kembalikan key `transaksi_berpajak` di array hasil respon.

## Task 4: Perkaya System Prompt untuk Rincian Pencairan & Pajak
1. Tambahkan instruksi tegas di system prompt:
   - Saat pengguna menanyakan Rincian Pencairan:
     - Tampilkan Ringkasan Eksekutif (Total Bruto, Pajak, Neto, Jumlah Transaksi).
     - **Tabel 1: Transaksi Berpajak**: Jika `ringkasan.total_pajak > 0`, WAJIB menyajikan Tabel Khusus Transaksi Berpajak (`transaksi_berpajak`) secara utuh tanpa ada transaksi yang terlewat. Total penjumlahan kolom pajak harus bernilai persis sama dengan Total Potongan Pajak (misal Rp 83.600).
     - **Tabel 2: Rincian Pencairan Transaksi**: Tampilkan seluruh transaksi sesuai filter (satu tahun penuh, per tahap, atau per bulan).

## Task 5: Testing & Verifikasi
1. Buat script unit test untuk memeriksa:
   - Pengambilan satu tahun penuh (157 item).
   - Pengambilan per tahap (Tahap 2: 76 item).
   - Key `transaksi_berpajak` (5 item dengan total pajak Rp 83.600).
   - Pengambilan per bulan (September).
   - Pengambilan filter_pajak: 'berpajak' (hanya 5 item).
2. Uji live chat copilot untuk pertanyaan "minta data rincian pencairan tahap 2".
3. Jalankan `vendor/bin/pint` pada `app/Services/Ai/CopilotService.php`.
4. Commit perubahan ke Git.
