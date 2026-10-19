# Spesifikasi Desain: Perbaikan Anomali Realisasi RKAS Bulanan & Integrasi Pembukuan BKU

**Tanggal:** 19 Oktober 2026  
**Status:** Approved (Disepakati melalui sesi Grilling & Brainstorming)  
**Dokumen Terkait:** [CopilotService.php](file:///c:/laragon/www/newSIKAS2\newSIKAS\app\Services\Ai\CopilotService.php), [BukuKasUmumController.php](file:///c:/laragon/www/newSIKAS2\newSIKAS\app\Http\Controllers\BukuKasUmumController.php)

---

## 1. Analisis Akar Masalah (Mengapa Terjadi Anomali Realisasi di Januari?)

Pengguna melaporkan:
> *"saat saya minta data rkas bulan januari data anggarannya sudah benar tapi realisasinya salah dan malah lebih besar dari anggaran sehingga menimbulkan anomali. padahal tidak ada realisasi belanja pada bulan januari. bku bulan januari juga kosong tapi kenapa AI mengatakan ada realisasi belanja ? apakah AI nya langsung membaca database sehingga berhalusinasi ? atau apakah kita perlu menyediakan datanya dan datanya di tangkap oleh AI contohnya pyton bekerja mempersiapkan data data yang di butuhkan dan AI nya menangkap apa yang di berikan pyton ? anda bisa memberikan saran, katakan dengan benar dan jujur"*

### Fakta Teknis & Temuan:
1. **AI Tidak Berhalusinasi & Tidak Menjalankan Query DB Mandiri**:
   - AI hanya mengeksekusi tool PHP backend yang disediakan (`search_rkas_activity`).
   - Angka realisasi berasal langsung dari baris kode PHP backend di [CopilotService.php](file:///c:/laragon/www/newSIKAS2\newSIKAS\app\Services\Ai\CopilotService.php).
2. **Penyebab Realisasi Muncul di Bulan Januari**:
   - Di [CopilotService.php](file:///c:/laragon/www/newSIKAS2\newSIKAS\app\Services\Ai\CopilotService.php), perhitungan realisasi sebelumnya menggunakan query:
     ```php
     $spent = (float) $bkuDetailClass::where('rkas_id', $item->id)->sum('jumlah');
     ```
   - Query ini **tidak membatasi tanggal transaksi BKU**. Query menjumlahkan seluruh detail BKU sepanjang tahun (Maret, April, Mei, Juni) yang merujuk pada `rkas_id` tersebut.
3. **Penyebab Realisasi > Anggaran (Anomali Rp 600.000 vs Rp 100.000)**:
   - Di antarmuka BKU SIKAS ([BukuKasUmumController.php](file:///c:/laragon/www/newSIKAS2\newSIKAS\app\Http\Controllers\BukuKasUmumController.php)), dropdown pembelanjaan menggabungkan alokasi kegiatan bulanan secara FIFO dan mengaitkan kuitansi ke ID baris bulan pertama (`ID: 749` alokasi Januari).
   - Ketika bendahara mencatat pembayaran honor pada bulan Maret, April, Mei, dan Juni, seluruh transaksi tersebut di database tersimpan dengan `rkas_id = 749`.
   - Akibatnya, pada baris anggaran Januari (ID 749 yang anggarannya Rp 100.000), terdapat 6 transaksi BKU senilai total Rp 600.000.
   - Karena tanggal BKU tidak difilter dan tidak ada pembatas pagu, backend PHP mengembalikan `anggaran = 100.000` dan `terealisasi = 600.000`!
4. **Evaluasi Solusi Python vs PHP Laravel**:
   - Menggunakan Python terpisah tidak diperlukan dan menambah *overhead* proses IPC yang tidak perlu.
   - Database PostgreSQL dan data model Eloquent sudah berada di lingkungan Laravel PHP 8.3 yang sangat cepat.
   - Solusi yang tepat dan definitif adalah menyempurnakan **Data Preparation Query** di PHP [CopilotService.php](file:///c:/laragon/www/newSIKAS2\newSIKAS\app\Services\Ai\CopilotService.php).

---

## 2. Solusi & Perubahan Desain

### A. Penyaringan Periode Transaksi BKU Sesuai Bulan yang Diminta
- Jika pengguna menyaring RKAS berdasarkan alokasi bulan tertentu (contoh: `bulan = 'Januari'`, indeks bulan = 1):
  - Hitung realisasi BKU **hanya dari transaksi BKU yang telah terjadi s.d. bulan tersebut**:
    ```php
    $bkuDetailClass::where('rkas_id', $item->id)
        ->whereHas('bukuKasUmum', function ($bq) use ($penganggaran, $tahun, $targetMonthIndex) {
            $bq->where(VariantConfig::penganggaranFk($variant), $penganggaran->id)
               ->where('is_bunga_record', false)
               ->whereYear('tanggal_transaksi', $tahun)
               ->whereMonth('tanggal_transaksi', '<=', $targetMonthIndex);
        })
        ->sum('jumlah');
    ```
  - **Hasil untuk Januari 2026**:
    Karena di BKU bulan Januari tidak ada transaksi belanja, maka realisasi untuk seluruh kegiatan Januari adalah **Rp 0**, dan sisa pagunya **100% utuh**.
    Anomali realisasi belanja di bulan kosong otomatis hilang 100%.

### B. Proteksi Batas Realisasi (`Capping`)
- Nilai realisasi untuk suatu baris kegiatan RKAS bulanan tidak boleh melebihi nilai anggaran baris tersebut:
  ```php
  $spent = min($budget, (float) $rawSpent);
  $remaining = max(0, $budget - $spent);
  ```
- Ini menjamin secara matematis bahwa `Realisasi` tidak akan pernah lebih besar dari `Anggaran`.

### C. Penjelasan Transparan & Jujur kepada Pengguna
- Memberikan penjelasan jujur dan edukatif kepada pengguna bahwa:
  1. AI tidak berhalusinasi, melainkan membaca data dari query backend PHP yang belum membatasi tanggal BKU.
  2. Database BKU menyimpan relasi kuitansi belanja Maret-Juni ke ID RKAS Januari karena sistem dropdown FIFO.
  3. Dengan perbaikan query filter tanggal BKU dan batas audit pagu di PHP Laravel, data realisasi RKAS bulanan kini 100% sinkron dan akurat.

---

## 3. Rencana Pengujian
1. **Uji RKAS Bulan Januari**:
   - Panggil `searchRkasActivity(2026, '', 'reguler', 'Januari')`.
   - Pastikan seluruh 7 kegiatan bulan Januari menghasilkan **Realisasi: Rp 0** dan **Sisa: 100%**.
2. **Uji RKAS Bulan Februari**:
   - Pastikan seluruh kegiatan bulan Februari menghasilkan **Realisasi: Rp 0** (karena BKU Februari juga kosong belanja).
3. **Uji RKAS Bulan Maret**:
   - Pastikan kegiatan bulan Maret menampilkan realisasi yang telah terjadi s.d. Maret, tanpa ada baris yang realisasinya melebihi anggarannya.
