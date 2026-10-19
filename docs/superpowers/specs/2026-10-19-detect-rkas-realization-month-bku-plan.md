# Rencana Implementasi: Deteksi Bulan Realisasi Riil BKU pada RKAS AI Copilot

**Tanggal:** 19 Oktober 2026  
**Dokumen Terkait:**  
- [Spesifikasi Desain](file:///c:/laragon/www/newSIKAS2/newSIKAS/docs/superpowers/specs/2026-10-19-detect-rkas-realization-month-bku-design.md)  
- [CopilotService.php](file:///c:/laragon/www/newSIKAS2/newSIKAS/app/Services/Ai/CopilotService.php)

---

## 1. Tujuan
Menambahkan kemampuan pada tool `search_rkas_activity` di [CopilotService.php](file:///c:/laragon/www/newSIKAS2/newSIKAS/app/Services/Ai/CopilotService.php) untuk mendeteksi kapan suatu kegiatan anggaran RKAS direalisasikan pada pembukuan BKU sepanjang tahun berjalan, menyajikannya pada kolom tabel HTML, serta memberikan analisis naratif kepada pengguna.

---

## 2. Rincian Perubahan Kode

### A. Pengoptimalan Query Batch & Deteksi Realisasi Riil pada `searchRkasActivity`
Di [CopilotService.php](file:///c:/laragon/www/newSIKAS2/newSIKAS/app/Services/Ai/CopilotService.php):

1. **Pre-fetching BKU Details Secara Kolektif (Single Query):**
   ```php
   $itemIds = $items->pluck('id')->all();
   $allBkuDetails = empty($itemIds) ? collect() : $bkuDetailClass::whereIn($bkuDetailFk, $itemIds)
       ->whereHas('bukuKasUmum', function ($bq) use ($penganggaran, $tahun, $variant) {
           $bq->where(VariantConfig::penganggaranFk($variant), (int) $penganggaran->id)
               ->where('is_bunga_record', false)
               ->whereYear('tanggal_transaksi', $tahun);
       })
       ->with(['bukuKasUmum' => function ($bq) {
           $bq->select('id', 'tanggal_transaksi', 'nomor_nota', 'id_transaksi');
       }])
       ->get()
       ->groupBy($bkuDetailFk);
   ```

2. **Perhitungan Realisasi Periode & Deteksi Realisasi Riil:**
   Di dalam perulangan `foreach ($items as $item)`:
   - Ambil `$details = $allBkuDetails->get($item->id, collect());`
   - Hitung `$spent` s.d. bulan target (tetap Rp 0 untuk Januari jika BKU Januari kosong).
   - Tentukan status realisasi riil BKU:
     - Jika kosong / 0: `"Belum Direalisasikan"`.
     - Jika kuitansi dibukukan di bulan yang sama dengan rencana RKAS: `"Sesuai Jadwal ({$item->bulan} {$tahun})"`.
     - Jika kuitansi dibukukan di bulan berbeda (misal alokasi Januari dibayar di Maret): `"Direalisasikan pd {$firstMonth} {$tahun} (Rp " . number_format($totalRealizedAllYear, 0, ',', '.') . ")"`.
   - Sertakan `'status_realisasi'` dan `'bulan_realisasi_riil'` pada array `$results[]`.

### B. Pembaruan System Prompt AI Copilot
Pada metode `chat()` di [CopilotService.php](file:///c:/laragon/www/newSIKAS2/newSIKAS/app/Services/Ai/CopilotService.php):
- Tambahkan instruksi tabel untuk RKAS agar menyertakan kolom:
  `<th>No</th><th>Uraian Kegiatan / Barang</th><th>Kode Rekening</th><th>Nama Rekening</th><th>Anggaran (Rp)</th><th>Realisasi Bulan Ini (Rp)</th><th>Sisa Anggaran (Rp)</th><th>Status Realisasi BKU</th>`
- Tambahkan instruksi agar AI memberikan penjelasan naratif jika ada kegiatan bulan bersangkutan yang baru direalisasikan pada bulan-bulan berikutnya (contoh: alokasi Januari yang baru dibayar pada bulan Maret).

---

## 3. Rencana Pengujian

1. **Uji Scratch PHP:**
   - Jalankan script uji untuk memverifikasi bahwa `searchRkasActivity` menghasilkan array dengan atribut `status_realisasi` yang tepat untuk Januari (seperti Honorarium terdeteksi di Maret, dan Sabun Cuci Piring terdeteksi Belum Direalisasikan).
2. **Pint Formatting & Lint:**
   - Jalankan `vendor/bin/pint` pada `app/Services/Ai/CopilotService.php`.
   - Pastikan tidak ada syntax error (`php -l`).
3. **Commit Git:**
   - Commit dokumen rencana dan perubahan kode ke Git.
