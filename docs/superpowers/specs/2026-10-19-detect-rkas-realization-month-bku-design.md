# Spesifikasi Desain: Deteksi Bulan Realisasi Riil BKU pada RKAS AI Copilot

**Tanggal:** 19 Oktober 2026  
**Status:** Approved (Disepakati melalui sesi Grilling & Brainstorming)  
**Dokumen Terkait:** [CopilotService.php](file:///c:/laragon/www/newSIKAS2/newSIKAS/app/Services/Ai/CopilotService.php)

---

## 1. Latar Belakang & Kebutuhan Pengguna

Pengguna menyampaikan:
> *"seharusnya AI bisa mendeteksi realisasi nya pada bulan apa. misal realisasi bulan januari 0 tapi sistem dapat mendeteksi bahwa realisasi bulan januari di realisasikan pada bulan september."*

### Kondisi Riil Penatausahaan Sekolah:
Dalam praktik penatausahaan dana BOSP:
- Anggaran kegiatan dialokasikan pada bulan tertentu (misal: bulan Januari).
- Namun karena dana tahap 1 sering kali baru cair di bulan Februari atau Maret, atau SPJ baru dibayarkan di bulan berikutnya, kuitansi pembelanjaan baru dibukukan pada BKU bulan Maret (atau September untuk semester 2).
- Ketika Bendahara/Kepala Sekolah meminta data RKAS bulan Januari, sistem harus cerdas:
  1. Menampilkan realisasi pada bulan Januari = **Rp 0** (karena pada bulan Januari belum ada kas yang keluar).
  2. Mampu mendeteksi dan menginformasikan bahwa anggaran bulan Januari tersebut **telah direalisasikan pada bulan apa di BKU** (contoh: *"Direalisasikan pd Maret 2026 (Rp 100.000)"*), atau *"Belum Direalisasikan"*.

---

## 2. Arsitektur & Logika Backend (`CopilotService.php`)

### A. Pre-fetching Detail BKU Teroptimasi (Single Batch Query)
Untuk mencegah N+1 query problem ketika menampilkan hingga puluhan atau ratusan kegiatan RKAS, backend melakukan pre-fetching seluruh detail kuitansi BKU tahun aktif dalam 1 query:
```php
$itemIds = $items->pluck('id')->all();

$allBkuDetails = $bkuDetailClass::whereIn($bkuDetailFk, $itemIds)
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

### B. Perhitungan Dua Dimensi Realisasi
Untuk setiap baris `$item`:
1. **Realisasi Periode yang Diminta (`$spent`):**
   - Transaksi BKU dengan `tanggal_transaksi <= akhir bulan target`.
   - Menghasilkan Rp 0 untuk Januari jika BKU Januari kosong belanja.
   - `$remaining = max(0, $budget - $spent)`.
2. **Deteksi Realisasi Riil Sepanjang Tahun (`$statusRealisasi`):**
   - Memeriksa seluruh kuitansi BKU tahun aktif pada `$details`.
   - Mengambil bulan kuitansi pertama kali dibukukan (`$firstRealizationMonth`).
   - Logika status:
     - Jika tidak ada kuitansi / total 0:
       `status_realisasi` = `"Belum Direalisasikan"`
     - Jika kuitansi dibukukan di bulan yang sama dengan rencana alokasi:
       `status_realisasi` = `"Sesuai Jadwal ({$item->bulan} {$tahun})"`
     - Jika kuitansi dibukukan di bulan berbeda:
       `status_realisasi` = `"Direalisasikan pd {$firstRealizationMonth} {$tahun} (Rp " . number_format($totalRealizedAllYear, 0, ',', '.') . ")"`

---

## 3. Format Antarmuka & Prompt AI Copilot

### A. Format Tabel HTML
AI Copilot diinstruksikan menyajikan tabel RKAS dengan kolom:
```html
<table>
  <thead>
    <tr>
      <th>No</th>
      <th>Uraian Kegiatan / Barang</th>
      <th>Kode Rekening</th>
      <th>Nama Rekening Belanja</th>
      <th>Anggaran (Rp)</th>
      <th>Realisasi Bulan Ini (Rp)</th>
      <th>Sisa Anggaran (Rp)</th>
      <th>Status Realisasi BKU</th>
    </tr>
  </thead>
  <tbody>
    <!-- Baris data -->
  </tbody>
</table>
```

### B. Catatan Naratif Analisis
AI Copilot menambahkan ringkasan naratif ramah di bawah tabel:
- Menjelaskan bahwa pada bulan yang diminta belum ada pengeluaran kas (Rp 0), namun kegiatan tersebut telah dibayarkan di bulan berikutnya (misal Maret 2026).
- Menyebutkan item apa saja yang sudah direalisasikan dan item apa saja yang masih berstatus *"Belum Direalisasikan"*.

---

## 4. Rencana Pengujian & Verifikasi

1. **Uji Pengambilan Data RKAS Januari 2026:**
   - 7 kegiatan Januari memiliki `terealisasi = 0` dan `sisa_pagu = 100%`.
   - Item Honorarium pengajar, Makan Minum Rapat, Sabun Pembersih Lantai, Transpor, dan Internet mendeteksi status *"Direalisasikan pd Maret 2026"*.
   - Item Sabun Cuci Piring mendeteksi status *"Belum Direalisasikan"*.
2. **Uji Pengambilan Data RKAS Maret 2026:**
   - Item belanja Kipas Angin dan Kertas HVS mendeteksi status *"Sesuai Jadwal (Maret 2026)"*.
3. **Uji Tampilan Chat AI Copilot:**
   - AI menyajikan tabel dengan kolom *Status Realisasi BKU* serta catatan naratif pergeseran bulan tanpa menampilkan ID kegiatan internal atau nama variabel.
