# Rencana Implementasi: Deteksi & Agregasi Fitur Gabung Uraian pada Rincian Pencairan AI Copilot

- **Tanggal**: 2026-10-20
- **Status**: Siap Dijalankan
- **Dokumen Desain**: `docs/superpowers/specs/2026-10-20-rincian-pencairan-gabung-uraian-design.md`

---

## Tahapan Pekerjaan

### Langkah 1: Agregasi Transaksi Gabungan di `CopilotService::getRincianPencairan()`
1. **Identifikasi Record Gabung Uraian**:
   - Deteksi rincian belanja yang memiliki `uraian_gabungan` aktif (`!empty(trim($item->uraian_gabungan))`).
   - Buat kunci pengelompokan (group key):
     - Item gabungan: `$item->bulan . '|' . ($item->rekeningBelanja?->id ?? $item->kode_rekening_id) . '|' . ($item->kodeKegiatan?->id ?? $item->kode_kegiatan_id) . '|' . trim($item->uraian_gabungan)`
     - Item mandiri: `$item->bulan . '|item|' . $item->id`
2. **Akumulasi Nilai Keuangan**:
   - Akumulasi nominal: `bruto`, `pot_ppn`, `pot_pph21`, `pot_pph23`, `total_pajak`, dan `diterima_neto`.
   - Simpan metadata sub-item:
     - `is_gabungan` (boolean).
     - `sub_uraian_ringkasan` (contoh: `"Cat tembok nippon paint (Rp 330.000), Kuas Roll (Rp 100.000), Kuas Biasa (Rp 60.000)"`).
     - `sub_items` (array berisi rincian item-item asal).
3. **Penyelarasan `rekap_bulanan` dan `transaksi_berpajak`**:
   - `rekap_bulanan` menghitung `jumlah_transaksi` berdasarkan transaksi resmi kuitansi gabungan (September = 7 transaksi, total tahunan = 126 transaksi).
   - `transaksi_berpajak` menyajikan baris gabungan utuh (September = 2 transaksi berpajak: Kwitansi 058 Toko Surya Jaya Rp 490.000 dengan PPh 23 Rp 19.600, dan Kwitansi 059 Toko Surya Jaya Rp 1.450.000 dengan PPh 23 Rp 58.000). Total pajak September tetap Rp 77.600 dan Tahap 2 tetap Rp 83.600.

---

### Langkah 2: Pembaruan System Prompt AI pada `CopilotService::buildSystemPrompt()`
1. **Instruksi Khusus Gabung Uraian**:
   - Jelaskan bahwa pada Rincian Pencairan terdapat fitur Gabung Uraian (`is_gabungan = true`).
   - Instruksikan AI untuk menyajikan nama gabungan dan nominal total gabungan tanpa memecah pajaknya.
   - Format penyajian nama transaksi gabungan pada tabel:
     `{nama_kegiatan}<br><small style="color: #64748b;">(Rincian: {sub_uraian_ringkasan})</small>`
2. **Penguncian Angka September & Transaksi Berpajak**:
   - Perbarui referensi jumlah transaksi resmi September: tepat **7 transaksi** dengan Total Bruto Rp 4.233.000, Total Pajak Rp 77.600, Neto Rp 4.155.400.
   - Tabel transaksi berpajak September: tepat **2 transaksi** (Kwitansi 058 PPh 23 Rp 19.600 dan Kwitansi 059 PPh 23 Rp 58.000).

---

### Langkah 3: Pengujian & Validasi
1. **Unit Test Backend**:
   - Jalankan skrip pengujian untuk memverifikasi struktur output `getRincianPencairan()` untuk September dan 12 bulan:
     - September menghasilkan tepat 7 transaksi.
     - Kwitansi `058/BOSP/THP-II/2026` memiliki Bruto Rp 490.000 dan PPh 23 Rp 19.600 utuh.
     - Kwitansi `057/BOSP/THP-II/2026` memiliki Bruto Rp 1.507.000.
     - Transaksi berpajak September berjumlah tepat 2.
     - Total tahunan 126 transaksi resmi, Bruto Rp 29.000.000, Pajak Rp 83.600.
2. **Live Test DeepSeek API**:
   - Uji respon AI saat pengguna meminta:
     - *"Tampilkan transaksi berpajak di bulan September"*
     - *"Rincian pencairan belanja bulan September"*
   - Verifikasi AI menyajikan Kwitansi 058 dengan nominal Rp 490.000 dan pajak PPh 23 Rp 19.600 utuh tanpa dipecah.
3. **Format Pint & Git Commit**:
   - Format file dengan Pint: `vendor/bin/pint app/Services/Ai/CopilotService.php`.
   - Commit perubahan ke Git.
