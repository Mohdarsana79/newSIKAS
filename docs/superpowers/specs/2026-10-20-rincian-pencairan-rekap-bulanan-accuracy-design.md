# Spesifikasi Desain: Akurasi Rekapitulasi Bulanan Rincian Pencairan / Payroll (Bulan September Rp 4.233.000)

- **Tanggal**: 2026-10-20
- **Status**: Disetujui Pengguna
- **Terkait**: `app/Services/Ai/CopilotService.php`

---

## 1. Masalah & Latar Belakang

Saat pengguna menanyakan rekapitulasi rincian pencairan atau payroll per bulan:
- Data riil pada database untuk bulan September 2026 adalah **15 transaksi** dengan total bruto **Rp 4.233.000** (potongan pajak PPh 23: Rp 77.600, diterima neto: Rp 4.155.400).
- Namun AI Copilot menjawab bruto bulan September sebesar **Rp 3.848.000** (atau angka acak lainnya).

### Akar Masalah
Pada implementasi sebelumnya di `CopilotService::getRincianPencairan()`, ketika pengguna meminta data tahunan atau tahapan (`bulan: 'Semua'`), respon tool hanya mengembalikan:
1. `ringkasan`: Total akumulasi satu tahun (Rp 29.000.000).
2. `transaksi_berpajak`: 5 transaksi yang memiliki potongan pajak.
3. `items`: 157 baris transaksi mentah.

Karena backend **tidak menyediakan rekapitulasi data per bulan yang sudah dihitung sebelumnya (*pre-aggregated*)**, model LLM DeepSeek terpaksa melakukan kalkulasi manual (*mental math*) terhadap 157 baris data untuk dikelompokkan ke dalam 12 bulan. LLM tidak memiliki kalkulator internal dan rentan terhadap halusinasi aritmatika saat menjumlahkan puluhan angka pecahan, sehingga nilai bruto bulan September meleset menjadi Rp 3.848.000.

---

## 2. Sasaran Desain (Goals)

1. **Akurasi 100% Angka Rekapitulasi Bulanan**:
   - Backend `getRincianPencairan()` wajib menghitung dan menyertakan array terstruktur `rekap_bulanan` yang memuat 12 bulan (Januari s.d. Desember) lengkap dengan: `no`, `bulan`, `tahap`, `jumlah_transaksi`, `total_bruto`, `total_pajak`, dan `total_neto`.
   - Nominal bruto bulan September **wajib dan pasti tercatat Rp 4.233.000**.
   - Total penjumlahan 12 bulan wajib klop 100% dengan total ringkasan eksekutif (157 transaksi, Bruto: Rp 29.000.000, Pajak: Rp 83.600, Neto: Rp 28.916.400).
2. **Penyamaan Konsep Payroll & Rincian Pencairan**:
   - Sesuai arahan pengguna, istilah *payroll* dan *rincian pencairan perbulan* diperlakukan sama sebagai pencairan belanja sekolah per bulan.
3. **Aturan Tegas di System Prompt**:
   - Saat pengguna menanyakan rekapitulasi per bulan, sebaran bulanan, rincian pencairan perbulan, atau payroll perbulan:
     - AI **DILARANG** menghitung manual dari daftar transaksi.
     - AI **WAJIB** menyajikan tabel Rekapitulasi Per Bulan menggunakan data dari array `rekap_bulanan` yang disediakan backend.
   - Jika pengguna meminta rincian pencairan bulan September secara spesifik:
     - AI memanggil `get_rincian_pencairan(bulan: 'September')` dan langsung menyajikan 15 transaksi dengan total bruto Rp 4.233.000.

---

## 3. Komponen & Perubahan Teknis

### 3.1. Penambahan `rekap_bulanan` di `getRincianPencairan()` (`CopilotService.php`)
Di method `getRincianPencairan()`, setelah `$mappedItems` selesai dipetakan:
1. Inisialisasi daftar 12 bulan resmi BOSP secara berurutan:
   - Tahap 1: Januari, Februari, Maret, April, Mei, Juni.
   - Tahap 2: Juli, Agustus, September, Oktober, November, Desember.
2. Lakukan grouping dan agregasi dari `$mappedItems`:
   ```php
   $rekapBulanan = [];
   $noBulan = 1;
   foreach ($allMonths as $bln) {
       $blnItems = array_filter($mappedItems, fn ($i) => strcasecmp($i['bulan'], $bln) === 0);
       if (! empty($blnItems) || $bulan === 'Semua') {
           $bBruto = array_sum(array_column($blnItems, 'bruto'));
           $bPajak = array_sum(array_column($blnItems, 'total_pajak'));
           $rekapBulanan[] = [
               'no' => $noBulan++,
               'bulan' => $bln,
               'tahap' => in_array($bln, $sem1) ? 1 : 2,
               'jumlah_transaksi' => count($blnItems),
               'total_bruto' => $bBruto,
               'total_pajak' => $bPajak,
               'total_neto' => $bBruto - $bPajak,
           ];
       }
   }
   ```
3. Masukkan `rekap_bulanan` ke dalam payload return:
   ```php
   return [
       'status' => 'success',
       ...
       'ringkasan' => [...],
       'rekap_bulanan' => $rekapBulanan,
       'transaksi_berpajak' => $transaksiBerpajak,
       'items' => $outputItems,
   ];
   ```

### 3.2. Penyesuaian System Prompt di `CopilotService.php`
Perbarui instruksi untuk Rincian Pencairan dan Payroll:
- Ketika pengguna menanyakan rekapitulasi per bulan, rincian pencairan perbulan, atau payroll perbulan:
  Sajikan tabel HTML **Rekapitulasi Pencairan Per Bulan**:
  `<th>No</th><th>Bulan</th><th>Tahap</th><th style="text-align: right;">Jumlah Transaksi</th><th style="text-align: right;">Bruto (Rp)</th><th style="text-align: right;">Potongan Pajak (Rp)</th><th style="text-align: right;">Diterima Neto (Rp)</th>`
  Ambil angka 100% dari data `rekap_bulanan` tool (khusus September: 15 transaksi, Bruto: Rp 4.233.000, Pajak: Rp 77.600, Neto: Rp 4.155.400).

---

## 4. Kriteria Pengujian & Validasi

1. **Uji Unit Backend**:
   - Panggil `getRincianPencairan(2026, 'reguler', null, 'Semua')`.
   - Pastikan key `rekap_bulanan` tersedia dan berisi 12 baris bulan.
   - Pastikan baris bulan September memiliki `total_bruto === 4233000.0`.
   - Pastikan total penjumlahan `total_bruto` ke-12 bulan persis sama dengan `ringkasan.total_anggaran_bruto` (Rp 29.000.000).
2. **Uji Live Chat DeepSeek**:
   - Simulasi query: *"Tampilkan rekapitulasi rincian pencairan per bulan tahun 2026"* atau *"minta payroll perbulan"*.
   - Verifikasi AI menyajikan tabel rekap per bulan di mana baris September terisi Bruto **Rp 4.233.000** (bukan Rp 3.848.000).
3. **Pint Code Style Check**:
   - Jalankan `vendor/bin/pint app/Services/Ai/CopilotService.php`.
