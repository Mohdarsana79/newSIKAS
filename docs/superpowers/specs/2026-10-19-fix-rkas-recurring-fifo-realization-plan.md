# Rencana Implementasi: Deteksi Realisasi RKAS Berulang Berbasis FIFO

**Tanggal:** 19 Oktober 2026  
**Dokumen Terkait:**  
- [Spesifikasi Desain](file:///c:/laragon/www/newSIKAS2/newSIKAS/docs/superpowers/specs/2026-10-19-fix-rkas-recurring-fifo-realization-design.md)  
- [CopilotService.php](file:///c:/laragon/www/newSIKAS2/newSIKAS/app/Services/Ai/CopilotService.php)

---

## 1. Tujuan
Memperbarui metode `searchRkasActivity` di [CopilotService.php](file:///c:/laragon/www/newSIKAS2/newSIKAS/app/Services/Ai/CopilotService.php) dengan algoritma pengelompokan kegiatan berulang dan alokasi kuitansi BKU berbasis FIFO. Hal ini memastikan bahwa kegiatan berulang yang di BKU tercatat menggunakan ID baris RKAS bulan lain (seperti Sabun Cuci Piring yang tercatat dengan ID Desember) tetap terdeteksi secara tepat dan berurutan pada bulan Januari, Februari, dan seterusnya.

---

## 2. Rincian Perubahan Kode di `CopilotService.php`

1. **Pengelompokan Kegiatan RKAS Sepanjang Tahun:**
   - Ambil seluruh data RKAS tahun aktif untuk penganggaran terkait.
   - Kelompokkan berdasarkan kunci identitas unik:
     `$groupKey = $rkas->kode_id . '|' . $rkas->kode_rekening_id . '|' . strtolower(trim($rkas->uraian)) . '|' . (float)$rkas->harga_satuan;`
   - Buat relasi pemetaan ID RKAS ke kunci kelompoknya.

2. **Pre-fetching Seluruh Detail Kuitansi BKU Tahun Aktif:**
   - Ambil seluruh detail BKU tahun aktif yang terhubung ke penganggaran tersebut dalam satu query teroptimasi.
   - Kelompokkan detail kuitansi BKU ke kunci kelompok yang sesuai.

3. **Alokasi FIFO Transaksi BKU ke Setiap Baris Anggaran:**
   - Untuk setiap kelompok kegiatan, urutkan baris RKAS secara kronologis (Januari s.d. Desember).
   - Urutkan transaksi kuitansi BKU secara kronologis berdasarkan `tanggal_transaksi`.
   - Lakukan alokasi bertahap (FIFO) sehingga kuitansi paling awal mengisi anggaran bulan paling awal:
     - Hitung realisasi periode target (`spent` s.d. bulan yang diminta).
     - Hitung sisa anggaran periode target (`remaining = max(0, budget - spent)`).
     - Tentukan status realisasi riil BKU (`status_realisasi` & `bulan_realisasi_riil`).

4. **Sertakan Hasil FIFO pada `$results[]` Hasil Pencarian:**
   - Ambil nilai hasil kalkulasi FIFO untuk setiap item yang lolos filter pencarian pengguna.

---

## 3. Rencana Verifikasi

1. **Uji Scratch PHP:**
   - Jalankan `test_jan_mar_fifo.php` untuk memverifikasi bahwa seluruh 7 kegiatan Januari mendeteksi status *"Direalisasikan pd Maret 2026"* (termasuk Sabun Cuci Piring).
2. **Pint Code Formatting:**
   - Jalankan `vendor/bin/pint app/Services/Ai/CopilotService.php`.
   - Pastikan `php -l` bebas error sintaks.
3. **Commit Git:**
   - Commit dokumen rencana dan kode perubahan ke Git.
