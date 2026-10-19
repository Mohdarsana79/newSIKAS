# Rencana Implementasi: Perbaikan Anomali Realisasi RKAS Bulanan & Integrasi Pembukuan BKU

**Tanggal:** 19 Oktober 2026  
**Dokumen Terkait:**  
- [Spesifikasi Desain](file:///c:/laragon/www/newSIKAS2/newSIKAS/docs/superpowers/specs/2026-10-19-fix-rkas-monthly-realization-anomaly-design.md)  
- [CopilotService.php](file:///c:/laragon/www/newSIKAS2/newSIKAS/app/Services/Ai/CopilotService.php)

---

## 1. Tujuan
Memperbaiki kalkulasi realisasi belanja pada tool `search_rkas_activity` di [CopilotService.php](file:///c:/laragon/www/newSIKAS2/newSIKAS/app/Services/Ai/CopilotService.php) agar:
1. Realisasi belanja dibatasi oleh periode transaksi BKU yang relevan (transaksi s.d. bulan alokasi yang diminta), sehingga bulan-bulan yang belum ada kuitansi BKU (seperti Januari & Februari) menghasilkan Realisasi = Rp 0.
2. Mencegah anomali Realisasi > Anggaran (seperti Honorarium Rp 600.000 vs Anggaran Rp 100.000) dengan audit batas pagu (`capping` matematis `min($budget, $rawSpent)`).
3. Memastikan AI Copilot menyajikan angka realisasi dan sisa pagu RKAS yang 100% akurat dan logis kepada Bendahara dan Kepala Sekolah.

---

## 2. Rincian Perubahan Kode

### Berkas: `app/Services/Ai/CopilotService.php`
Di dalam metode `searchRkasActivity(int $tahun, ?string $query, string $variant, ?string $bulan = null)`:

1. **Mapping Bulan ke Indeks Angka (1-12)**:
   ```php
   $monthNumbers = [
       'Januari' => 1, 'Februari' => 2, 'Maret' => 3, 'April' => 4,
       'Mei' => 5, 'Juni' => 6, 'Juli' => 7, 'Agustus' => 8,
       'September' => 9, 'Oktober' => 10, 'November' => 11, 'Desember' => 12,
   ];
   $targetMonthIndex = $targetMonth ? ($monthNumbers[$targetMonth] ?? null) : null;
   ```

2. **Penyaringan Detail BKU berdasarkan Tahun, Bulan, dan Bukan Rekaman Bunga**:
   Gantikan query tanpa filter:
   ```php
   // Kode lama (tanpa filter tanggal dan pembatas pagu):
   $spent = (float) $bkuDetailClass::where($bkuDetailFk, (int) $item->id)->sum('jumlah');
   $remaining = max(0, $budget - $spent);
   ```
   Menjadi:
   ```php
   // Kode baru (difilter s.d. bulan target dan capped ke batas pagu):
   $bkuQuery = $bkuDetailClass::where($bkuDetailFk, (int) $item->id)
       ->whereHas('bukuKasUmum', function ($bq) use ($penganggaran, $tahun, $targetMonthIndex, $variant) {
           $bq->where(VariantConfig::penganggaranFk($variant), $penganggaran->id)
              ->where('is_bunga_record', false)
              ->whereYear('tanggal_transaksi', $tahun);
           if ($targetMonthIndex) {
               $bq->whereMonth('tanggal_transaksi', '<=', $targetMonthIndex);
           }
       });

   $rawSpent = (float) $bkuQuery->sum('jumlah');
   $spent = min($budget, $rawSpent);
   $remaining = max(0, $budget - $spent);
   ```

---

## 3. Rencana Verifikasi

1. **Uji Realisasi Bulan Januari**:
   - Panggil `searchRkasActivity(2026, '', 'reguler', 'Januari')`.
   - Pastikan seluruh 7 kegiatan bulan Januari menghasilkan Realisasi = Rp 0 dan Sisa = 100%.
2. **Uji Realisasi Bulan Februari**:
   - Panggil `searchRkasActivity(2026, '', 'reguler', 'Februari')`.
   - Pastikan seluruh kegiatan bulan Februari menghasilkan Realisasi = Rp 0.
3. **Uji Realisasi Bulan Maret**:
   - Panggil `searchRkasActivity(2026, '', 'reguler', 'Maret')`.
   - Pastikan kegiatan bulan Maret menampilkan realisasi yang telah dibukukan s.d. Maret tanpa anomali.
4. **Verifikasi Suite Pengujian**:
   - Jalankan `composer test` atau PHPUnit untuk memastikan tidak ada regresi.
