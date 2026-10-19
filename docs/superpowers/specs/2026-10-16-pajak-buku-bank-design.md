# Rencana Implementasi: Penambahan Terima Pajak dan Setor Pajak pada Buku Kas Pembantu Bank (BKP Bank)

Dokumen Spesifikasi Desain & Rencana Implementasi Fitur  
Tanggal: 16 Oktober 2026  
Status: Menunggu Persetujuan Pengguna (Review Gate)

---

## 1. Ringkasan Masalah

Pada aplikasi SIKAS (Sistem Informasi Keuangan Sekolah), modul penatausahaan memiliki beberapa Buku Kas Pembantu (BKP), antara lain:
- **Buku Kas Umum (BKU)**: Mencakup seluruh transaksi kas bank dan tunai.
- **Buku Kas Pembantu Tunai (BKP Pembantu)**: Mencatat transaksi tunai, termasuk terima pajak tunai dan setor pajak tunai.
- **Buku Kas Pembantu Bank (BKP Bank)**: Mencatat transaksi bank (penerimaan dana transfer, bunga bank, pajak bunga bank, penarikan tunai, STS, TRK saldo awal, dan belanja non-tunai).

### Masalah yang Ditemukan
Saat ini, pada **Buku Kas Pembantu Bank** (`BKP Bank`), transaksi belanja yang dikenakan pajak (`total_pajak > 0` atau `total_pajak_daerah > 0`):
1. **Hanya menampilkan 1 baris pengeluaran belanja kotor**, dan
2. **Tidak menampilkan baris Terima Pajak (Penerimaan)** maupun **Setor Pajak (Pengeluaran)**.

Hal ini terlihat pada:
- Antarmuka web tab BKP Bank di [Rekapitulasi.tsx](file:///c:/laragon/www/newSIKAS2/newSIKAS/resources/js/Pages/Penatausahaan/Rekapitulasi.tsx)
- Dokumen Cetak PDF di [bkp_bank_pdf.blade.php](file:///c:/laragon/www/newSIKAS2/newSIKAS/resources/views/laporan/bkp_bank_pdf.blade.php)
- Ekspor Excel di [bkp_bank_excel.blade.php](file:///c:/laragon/www/newSIKAS2/newSIKAS/resources/views/laporan/bkp_bank_excel.blade.php)

Dampak dari ketiadaan baris pajak ini:
- Tidak tampak pencatatan pungutan pajak (Terima Pajak) maupun bukti setor pajak (NTPN / Setor Pajak) di Buku Kas Bank.
- Saldo buku kas bank menjadi tidak sesuai dengan keadaan kas riil di bank ketika ada pajak belanja non-tunai yang telah dipungut namun belum disetor ke kas negara pada bulan berjalan.

---

## 2. Analisis Penyebab Masalah (Root Cause)

Berdasarkan penelusuran kode sumber pada [BukuBankController.php](file:///c:/laragon/www/newSIKAS2/newSIKAS/app/Http/Controllers/BukuBankController.php):

### A. Di dalam method `getBkpBankDataInternal`:
1. **Looping belanja non-tunai hanya membuat 1 baris pengeluaran kotor**:
   Pada baris 398–419, controller mengambil `$belanjaNonTunaiList` dan hanya menambahkan 1 baris pengeluaran (`total_transaksi_kotor`). Sama sekali **tidak ada logika pengecekan `$bnt->total_pajak` maupun `$bnt->total_pajak_daerah`**, sehingga baris Terima Pajak tidak pernah dibuat.
2. **Tidak ada query untuk Setor Pajak Non-Tunai**:
   Controller tidak melakukan query terhadap transaksi non-tunai yang disetor pada bulan bersangkutan (`whereNotNull('ntpn')` dan bulan `tanggal_lapor`), sehingga baris Setor Pajak tidak pernah dibuat.
3. **Kalkulasi Total Penerimaan & Pengeluaran Bulan Berjalan Mengabaikan Pajak**:
   Pada baris 377–379:
   ```php
   $totalPenerimaan = $saldoAwal + $totalPenerimaanDana + $totalBunga;
   $totalPengeluaran = $totalPenarikan + $totalPajak + $totalSts + $totalTrk + $totalBelanjaNonTunai;
   $saldoAkhir = $totalPenerimaan - $totalPengeluaran;
   ```
   Penerimaan pajak non-tunai belum ditambahkan ke `$totalPenerimaan`, dan penyetoran pajak non-tunai belum ditambahkan ke `$totalPengeluaran`.

### B. Di dalam method `hitungSaldoBankSebelumBulan`:
Pada baris 573–644, method privat `hitungSaldoBankSebelumBulan` di `BukuBankController` merupakan salinan kode lama yang belum memperhitungkan selisih kumulatif pajak non-tunai (`+ $saldoPajakNonTunai`).
Padahal di [BukuKasService.php](file:///c:/laragon/www/newSIKAS2/newSIKAS/app/Services/BukuKasService.php) (baris 175–201), rumus saldo bank sebelum bulan sudah diperbaiki dengan formula:
```php
$saldoPajakNonTunai = $pajakDiterimaNonTunai - $pajakDisetorNonTunai;
$saldoBank = ... - $totalBelanjaNonTunaiSampaiBulanSebelumnya + $saldoPajakNonTunai;
```
Karena `BukuBankController` tidak menggunakan `BukuKasService`, saldo awal bank di bulan-bulan berikutnya akan melenceng jika terdapat pajak non-tunai yang belum disetorkan di bulan sebelumnya.

### C. Urutan Prioritas Sorting:
Array `$priority` pada baris 503–515 belum mendefinisikan prioritas untuk `terima_pajak` dan `setor_pajak`.

---

## 3. Keputusan Desain yang Telah Disepakati

Berdasarkan klarifikasi langsung:
1. **Cakupan Pajak di Buku Kas Bank**:
   - Dikhususkan untuk **transaksi belanja Non-Tunai** (`jenis_transaksi = 'non-tunai'`).
   - Transaksi belanja Tunai beserta pajaknya tetap dicatat di Buku Kas Pembantu Tunai agar saldo kas tunai dan saldo bank tidak tercatat ganda.
2. **Format Tampilan Uraian & Nomor Bukti**:
   - Disamakan persis dengan standar BKU dan Buku Kas Tunai yang sudah berjalan:
     - **Terima Pajak Pusat**:
       - Uraian: `'Terima Pajak ' . $bnt->pajak . ' ' . ((float)$bnt->persen_pajak) . '% ' . ($bnt->uraian_opsional ?: $bnt->uraian)`
       - No. Bukti: `$bnt->kode_masa_pajak ?? $bnt->id_transaksi ?? '-'`
       - Kode Rekening: `'-'`
       - Nilai: Masuk kolom **Penerimaan**
     - **Terima Pajak Daerah**:
       - Uraian: `'Terima Pajak Daerah ' . $bnt->pajak_daerah . ' ' . ((float)$bnt->persen_pajak_daerah) . '% ' . ($bnt->uraian_opsional ?: $bnt->uraian)`
       - No. Bukti: `'-'`
       - Kode Rekening: `'-'`
       - Nilai: Masuk kolom **Penerimaan**
     - **Setor Pajak Pusat**:
       - Tanggal: `$bku->tanggal_lapor`
       - Uraian: `'Setor Pajak ' . $bku->pajak . ' ' . ((float)$bku->persen_pajak) . '% ' . ($bku->uraian_opsional ?: $bku->uraian)`
       - No. Bukti: `$bku->ntpn ?? '-'`
       - Kode Rekening: `'-'`
       - Nilai: Masuk kolom **Pengeluaran**
     - **Setor Pajak Daerah**:
       - Tanggal: `$bku->tanggal_lapor`
       - Uraian: `'Setor Pajak Daerah ' . $bku->pajak_daerah . ' ' . ((float)$bku->persen_pajak_daerah) . '% ' . ($bku->uraian_opsional ?: $bku->uraian)`
       - No. Bukti: `'-'`
       - Kode Rekening: `'-'`
       - Nilai: Masuk kolom **Pengeluaran**

---

## 4. Rencana Perubahan Kode (Proposed Changes)

Perubahan **hanya** dilakukan pada file:
[app/Http/Controllers/BukuBankController.php](file:///c:/laragon/www/newSIKAS2/newSIKAS/app/Http/Controllers/BukuBankController.php)

File-file berikut **tidak diubah** karena sudah mendukung penampilan array `items` dinamis beserta kalkulasi running balance dan footernya:
- [Rekapitulasi.tsx](file:///c:/laragon/www/newSIKAS2/newSIKAS/resources/js/Pages/Penatausahaan/Rekapitulasi.tsx)
- [bkp_bank_pdf.blade.php](file:///c:/laragon/www/newSIKAS2/newSIKAS/resources/views/laporan/bkp_bank_pdf.blade.php)
- [bkp_bank_excel.blade.php](file:///c:/laragon/www/newSIKAS2/newSIKAS/resources/views/laporan/bkp_bank_excel.blade.php)

### Rincian Kode Diff pada `BukuBankController.php`:

#### 1. Tambahkan `BukuKasService`
```diff
+ use App\Services\BukuKasService;

  class BukuBankController extends Controller
  {
+     protected BukuKasService $bukuKasService;
      protected string $variant;
      protected string $Penganggaran;
      protected string $PenerimaanDana;
      protected string $BukuKasUmum;
      protected string $PenarikanTunai;
      protected string $Sts;

-     public function __construct()
+     public function __construct(?BukuKasService $bukuKasService = null)
      {
+         $this->bukuKasService = $bukuKasService ?? app(BukuKasService::class);
          $this->middleware(function ($request, $next) {
```

#### 2. Delegasikan `hitungSaldoBankSebelumBulan` ke `BukuKasService`
```diff
      private function hitungSaldoBankSebelumBulan($penganggaran_id, $bulanTarget)
      {
          try {
              if ($bulanTarget == 1) return 0;
-             // Salinan kode lama yang tidak ada $saldoPajakNonTunai
+             return $this->bukuKasService->hitungSaldoBankSebelumBulan($penganggaran_id, $bulanTarget);
          } catch (\Exception $e) {
              Log::error('Error hitungSaldoBankSebelumBulan: ' . $e->getMessage());
              return 0;
          }
      }
```

#### 3. Logika Terima Pajak & Setor Pajak pada `getBkpBankDataInternal`
```diff
+         // Query data Pajak Disetor Non-Tunai bulan ini
+         $bkuPajakDisetorNonTunai = ($this->BukuKasUmum)::where(VariantConfig::penganggaranFk($this->variant), $penganggaran->id)
+             ->where('is_bunga_record', false)
+             ->where('jenis_transaksi', 'non-tunai')
+             ->whereMonth('tanggal_lapor', '>=', $bulanAwal)
+             ->whereMonth('tanggal_lapor', '<=', $bulanAkhir)
+             ->whereYear('tanggal_lapor', $tahun)
+             ->whereNotNull('ntpn')
+             ->where(function ($query) {
+                 $query->where('total_pajak', '>', 0)
+                     ->orWhere('total_pajak_daerah', '>', 0);
+             })
+             ->orderBy('tanggal_lapor', 'asc')
+             ->get();

          // Ambil list belanja NON-TUNAI untuk item
          $belanjaNonTunaiList = ($this->BukuKasUmum)::where(VariantConfig::penganggaranFk($this->variant), $penganggaran->id)
              ->with(['kodeKegiatan', 'rekeningBelanja'])
              ->where('is_bunga_record', false)
              ->where('jenis_transaksi', 'non-tunai')
              ->whereMonth('tanggal_transaksi', '>=', $bulanAwal)
              ->whereMonth('tanggal_transaksi', '<=', $bulanAkhir)
              ->whereYear('tanggal_transaksi', $tahun)
+             ->orderBy('tanggal_transaksi', 'asc')
+             ->orderBy('id_transaksi', 'asc')
+             ->orderBy('id', 'asc')
              ->get();

+         $totalPajakDiterimaNonTunai = 0;
+         $blockCounter = 100;
+         $groupMap = [];

          foreach ($belanjaNonTunaiList as $bnt) {
+             $blockCounter++;
+             $groupMap[$bnt->id] = $blockCounter;

               $items[] = [
                  'tanggal' => $bnt->tanggal_transaksi,
                  'uraian' => $bnt->uraian ?? 'Non Tunai',
                  'uraian_opsional' => $bnt->uraian_opsional,
                  'no_bukti' => $bnt->id_transaksi ?? $bnt->nomor_nota ?? '-',
                  'kode_kegiatan' => $bnt->kodeKegiatan->kode ?? '-',
                  'kode_rekening' => $bnt->rekeningBelanja->kode_rekening ?? '-',
                  'penerimaan' => 0,
                  'pengeluaran' => $bnt->total_transaksi_kotor,
-                 'type' => 'belanja_non_tunai'
+                 'type' => 'belanja_non_tunai',
+                 'group_id' => $blockCounter,
+                 'sort_order' => 10,
              ];

+             // Baris Terima Pajak Pusat
+             if ($bnt->total_pajak > 0) {
+                 $totalPajakDiterimaNonTunai += (float) $bnt->total_pajak;
+                 $pct = $bnt->persen_pajak ? (float) $bnt->persen_pajak : '';
+                 $uraianPajak = 'Terima Pajak ' . ($bnt->pajak ?? '') . ' ' . $pct . '% ' . ($bnt->uraian_opsional ?: $bnt->uraian);
+                 $items[] = [
+                     'tanggal' => $bnt->tanggal_transaksi,
+                     'uraian' => $uraianPajak,
+                     'uraian_opsional' => null,
+                     'no_bukti' => $bnt->kode_masa_pajak ?? $bnt->id_transaksi ?? '-',
+                     'kode_kegiatan' => '-',
+                     'kode_rekening' => '-',
+                     'penerimaan' => (float) $bnt->total_pajak,
+                     'pengeluaran' => 0,
+                     'type' => 'terima_pajak',
+                     'group_id' => $blockCounter,
+                     'sort_order' => 11,
+                 ];
+             }

+             // Baris Terima Pajak Daerah
+             if ($bnt->total_pajak_daerah > 0) {
+                 $totalPajakDiterimaNonTunai += (float) $bnt->total_pajak_daerah;
+                 $pct = $bnt->persen_pajak_daerah ? (float) $bnt->persen_pajak_daerah : '';
+                 $uraianPajakDaerah = 'Terima Pajak Daerah ' . ($bnt->pajak_daerah ?? '') . ' ' . $pct . '% ' . ($bnt->uraian_opsional ?: $bnt->uraian);
+                 $items[] = [
+                     'tanggal' => $bnt->tanggal_transaksi,
+                     'uraian' => $uraianPajakDaerah,
+                     'uraian_opsional' => null,
+                     'no_bukti' => '-',
+                     'kode_kegiatan' => '-',
+                     'kode_rekening' => '-',
+                     'penerimaan' => (float) $bnt->total_pajak_daerah,
+                     'pengeluaran' => 0,
+                     'type' => 'terima_pajak_daerah',
+                     'group_id' => $blockCounter,
+                     'sort_order' => 11,
+                 ];
+             }
          }

+         // Loop Tambahkan Baris Setor Pajak Non-Tunai
+         $totalPajakDisetorNonTunai = 0;
+         foreach ($bkuPajakDisetorNonTunai as $bku) {
+             $currentGroupId = $groupMap[$bku->id] ?? null;
+             if (!$currentGroupId) {
+                 $blockCounter++;
+                 $currentGroupId = $blockCounter;
+                 $groupMap[$bku->id] = $currentGroupId;
+             }
+             if ($bku->total_pajak > 0) {
+                 $totalPajakDisetorNonTunai += (float) $bku->total_pajak;
+                 $pct = $bku->persen_pajak ? (float) $bku->persen_pajak : '';
+                 $uraianPajak = 'Setor Pajak ' . ($bku->pajak ?? '') . ' ' . $pct . '% ' . ($bku->uraian_opsional ?: $bku->uraian);
+                 $items[] = [
+                     'tanggal' => $bku->tanggal_lapor,
+                     'uraian' => $uraianPajak,
+                     'uraian_opsional' => null,
+                     'no_bukti' => $bku->ntpn ?? '-',
+                     'kode_kegiatan' => '-',
+                     'kode_rekening' => '-',
+                     'penerimaan' => 0,
+                     'pengeluaran' => (float) $bku->total_pajak,
+                     'type' => 'setor_pajak',
+                     'group_id' => $currentGroupId,
+                     'sort_order' => 12,
+                 ];
+             }
+             if ($bku->total_pajak_daerah > 0) {
+                 $totalPajakDisetorNonTunai += (float) $bku->total_pajak_daerah;
+                 $pct = $bku->persen_pajak_daerah ? (float) $bku->persen_pajak_daerah : '';
+                 $uraianPajakDaerah = 'Setor Pajak Daerah ' . ($bku->pajak_daerah ?? '') . ' ' . $pct . '% ' . ($bku->uraian_opsional ?: $bku->uraian);
+                 $items[] = [
+                     'tanggal' => $bku->tanggal_lapor,
+                     'uraian' => $uraianPajakDaerah,
+                     'uraian_opsional' => null,
+                     'no_bukti' => '-',
+                     'kode_kegiatan' => '-',
+                     'kode_rekening' => '-',
+                     'penerimaan' => 0,
+                     'pengeluaran' => (float) $bku->total_pajak_daerah,
+                     'type' => 'setor_pajak_daerah',
+                     'group_id' => $currentGroupId,
+                     'sort_order' => 12,
+                 ];
+             }
+         }
```

#### 4. Perbarui Total Bulan Berjalan
```diff
-         $totalPenerimaan = $saldoAwal + $totalPenerimaanDana + $totalBunga;
-         $totalPengeluaran = $totalPenarikan + $totalPajak + $totalSts + $totalTrk + $totalBelanjaNonTunai;
+         $totalPenerimaan = $saldoAwal + $totalPenerimaanDana + $totalBunga + $totalPajakDiterimaNonTunai;
+         $totalPengeluaran = $totalPenarikan + $totalPajak + $totalSts + $totalTrk + $totalBelanjaNonTunai + $totalPajakDisetorNonTunai;
          $saldoAkhir = $totalPenerimaan - $totalPengeluaran;
```

#### 5. Perbarui Sorting Items
```diff
          usort($items, function($a, $b) {
              $timeDiff = strtotime($a['tanggal']) - strtotime($b['tanggal']);
              if ($timeDiff !== 0) {
                  return $timeDiff;
              }

+             $gA = $a['group_id'] ?? 0;
+             $gB = $b['group_id'] ?? 0;
+             if ($gA !== 0 && $gB !== 0 && $gA === $gB) {
+                 $sA = $a['sort_order'] ?? 99;
+                 $sB = $b['sort_order'] ?? 99;
+                 return $sA - $sB;
+             }

              $priority = [
                  'penerimaan' => 1,
                  'bunga' => 2,
                  'trk_saldo_awal' => 3,
                  'belanja_non_tunai' => 4,
+                 'terima_pajak' => 5,
+                 'terima_pajak_daerah' => 6,
+                 'setor_pajak' => 7,
+                 'setor_pajak_daerah' => 8,
-                 'penarikan' => 5,
-                 'pajak_bunga' => 6,
-                 'sts' => 7,
+                 'penarikan' => 9,
+                 'pajak_bunga' => 10,
+                 'sts' => 11,
              ];

              $pA = $priority[$a['type']] ?? 99;
              $pB = $priority[$b['type']] ?? 99;

              return $pA - $pB;
          });
```

---

## 5. Rencana Pengujian (Testing Plan)

1. **Uji Tampilan Web Tab BKP Bank**:
   - Akses halaman Rekapitulasi tab **BKP Bank**.
   - Pilih bulan yang memiliki belanja non-tunai berpajak.
   - Verifikasi baris belanja non-tunai muncul dengan nilai kotor di kolom Pengeluaran.
   - Verifikasi baris "Terima Pajak ..." muncul di kolom Penerimaan dengan nomor bukti kode masa pajak.
   - Verifikasi baris "Setor Pajak ..." muncul di kolom Pengeluaran dengan nomor bukti NTPN (jika sudah disetor).
   - Verifikasi kalkulasi running balance dan footer Jumlah seimbang.

2. **Uji Cetak PDF BKP Bank**:
   - Klik tombol **CETAK BKP BANK**.
   - Verifikasi dokumen PDF menampilkan baris Terima Pajak dan Setor Pajak dengan rapi.
   - Verifikasi total Jumlah dan Saldo Bank di penutupan kas sesuai dengan saldo riil bank.

3. **Uji Ekspor Excel BKP Bank**:
   - Klik tombol **Export Excel**.
   - Verifikasi isi file `.xlsx` identik dengan tampilan web dan PDF.

4. **Uji Regresi & Multi-Variant**:
   - Pastikan tab lain (BKP Pembantu Tunai, BKU Umum, BKP Pajak, ROB, REG, Berita Acara, Realisasi) tetap berfungsi normal.
   - Pastikan varian budget lain (`kinerja`, `silpa`, `kinerja_silpa`) berjalan baik melalui `VariantConfig`.
   - Jalankan `composer test` untuk memastikan test suite PHPUnit tetap lolos tanpa error.
