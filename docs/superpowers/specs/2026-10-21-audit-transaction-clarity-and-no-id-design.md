# Dokumen Desain: Peningkatan Kejelasan Audit BKP Bank & Penghapusan ID Database pada Seluruh 11 Tab Pembukuan

**Tanggal:** 21 Oktober 2026  
**Topik:** Peningkatan Kejelasan Audit BKP Bank, Penanganan Mutasi Lengkap, & Eliminasi ID Database  
**Status:** Approved by User  

---

## 1. Latar Belakang & Masalah

Pada pengujian Pra-Audit Forensik AI untuk Buku Kas Pembantu Bank (BKP Bank), ditemukan hasil audit yang membingungkan bagi bendahara/auditor:
1. **Penyebutan ID Internal Database**: AI menulis *"seluruh enam sampel transaksi pembukuan (ID 108, 109, 166, 177, 191, dan 238) tercatat sebagai transaksi non-tunai dengan nominal Rp0, uraian kosong, rekening kosong..."*. Pengguna tidak mengetahui apa makna ID tersebut di lapangan.
2. **Kekeliruan Pemetaan Record Bunga Bank**: Baris transaksi ID 108 dsb sebenarnya adalah catatan penutupan kas bulanan untuk pendapatan bunga bank (jasa giro) dan pajak bunga bank PPh 4 ayat 2 (`is_bunga_record = true`). Pada tabel `buku_kas_umums`, baris tersebut memiliki `uraian = null` dan `dibelanjakan = 0`, tetapi memiliki nilai di kolom `bunga_bank` dan `pajak_bunga_bank`. Karena belum dipetakan secara khusus, AI mengira transaksi tersebut adalah transaksi belanja fiktif/bodong Rp0 dan keliru menyimpulkan bahwa bunga bank belum dibukukan.
3. **Sampel BKP Bank Tidak Mencakup Mutasi Inti**: Scanner BKP Bank sebelumnya hanya mengambil transaksi belanja non-tunai ke dalam sampel AI. Penerimaan transfer dana APBN (Rp14.500.000) dan penarikan tunai kas (Rp14.500.000) tidak disertakan dalam detail mutasi yang dibaca AI, sehingga AI melihat ketidaksesuaian antara total ringkasan dan rincian transaksi.

---

## 2. Sasaran Perbaikan

1. **Eliminasi Total ID Database**: Melarang AI menyebut angka ID database internal di seluruh 11 tab pembukuan. Menggantinya dengan identitas audit nyata: **Tanggal Transaksi, Nomor Bukti (BPU/Nota), Uraian Transaksi, Kode & Nama Rekening Belanja, Kode/Nama Kegiatan, dan Nama Toko/Rekanan**.
2. **Rekonstruksi Mutasi Lengkap BKP Bank**: Mengirimkan seluruh mutasi riil kas bank kepada AI:
   - Penerimaan Transfer Dana (Sumber Dana, Tanggal, Nominal Masuk)
   - Penarikan Tunai Kas (Tanggal, Keperluan, Nominal Keluar)
   - Setor Tunai Kas (Tanggal, Nominal Masuk)
   - Jasa Giro / Bunga Bank (Tanggal, Keterangan Pendapatan Giro, Nominal Masuk)
   - Pajak Bunga Bank PPh 4(2) (Tanggal, Keterangan Pajak Bunga, Nominal Keluar)
   - Belanja Transfer Non-Tunai (Tanggal, No Bukti, Uraian, Rekening Belanja, Rekanan, Nominal Belanja Keluar)
3. **Format Representasi Transaksi Kaya di `BaseTabAuditScanner`**: Memperbarui helper `compactTransactions()` agar memuat relasi rekening belanja (`kode_rekening`, `nama_rekening`), relasi kode kegiatan (`kode_kegiatan`, `nama_kegiatan`), nomor bukti, serta penanganan cerdas untuk `is_bunga_record`.
4. **Pembaruan System Prompt 11 Sub-Scanner**: Menambahkan instruksi baku anti-ID dan pedoman perujukan transaksi yang jelas dan solutif.
5. **Peningkatan Tampilan Modal UI & PDF**: Menampilkan informasi transaksi spesifik (Tanggal, No Bukti, Uraian, Kode Rekening) pada kartu temuan di antarmuka modal dan lembar kerja audit PDF resmi.

---

## 3. Rincian Teknis & Arsitektur

### 3.1. Pembaruan `BaseTabAuditScanner::compactTransactions()`
Sebelumnya:
```php
return [
    'id' => $t->id, // Memicu AI menyebut ID angka
    'tgl' => ...,
    'jenis' => ...,
    'uraian' => $t->uraian, // Null pada bunga_bank
    'nominal' => $t->dibelanjakan, // 0 pada bunga_bank
    ...
];
```
Menjadi:
```php
if ($t->is_bunga_record) {
    $bunga = (float) ($t->bunga_bank ?? 0);
    $pajak = (float) ($t->pajak_bunga_bank ?? 0);
    return [
        'tanggal' => $tgl,
        'nomor_bukti' => $t->nomor_nota ?: 'TUTUP-KAS',
        'jenis' => 'Bunga & Pajak Bank',
        'uraian' => "Pendapatan Bunga Bank (Giro Rp " . number_format($bunga, 0, ',', '.') . ") & Pajak Bunga PPh 4(2) (Rp " . number_format($pajak, 0, ',', '.') . ")",
        'nominal' => $bunga,
        'rekening' => 'Pendapatan Bunga Bank (Non-Operasional)',
        'kegiatan' => 'Pengelolaan Rekening Bank Persepsi',
        'rekanan' => 'Bank Operasional Sekolah',
        'pajak' => $pajak,
        'ntpn' => $t->ntpn ?: 'PPh 4(2) Otomatis Bank',
    ];
}
```
Dan untuk transaksi umum:
```php
return [
    'tanggal' => $tgl,
    'nomor_bukti' => $t->nomor_nota ?: ($t->id_transaksi ? 'TRX-' . $t->id_transaksi : '-'),
    'jenis' => $t->jenis_transaksi,
    'uraian' => $t->uraian ?: 'Transaksi Belanja',
    'nominal' => (float) ($t->dibelanjakan ?? $t->nominal_transaksi ?? 0),
    'rekening' => $t->rekeningBelanja ? ($t->rekeningBelanja->kode_rekening . ' - ' . $t->rekeningBelanja->nama_rekening) : '-',
    'kegiatan' => $t->kodeKegiatan ? ($t->kodeKegiatan->kode_kegiatan . ' - ' . $t->kodeKegiatan->nama_kegiatan) : '-',
    'rekanan' => $t->nama_toko ?: ($t->nama_penerima_pembayaran ?: '-'),
    'pajak' => (float) $t->total_pajak + (float) $t->total_pajak_daerah,
    'ntpn' => $t->ntpn ?: '-',
];
```

### 3.2. Rekonstruksi Mutasi Bank di `BkpBankAuditScanner`
Mengumpulkan seluruh aliran dana kas bank dalam satu koleksi terurut kronologis tanggal (`$bankMutations`):
1. **Penerimaan Transfer Dana**: Ditandai `Penerimaan Kas Masuk (Kredit Bank)`.
2. **Penarikan Tunai Kas**: Ditandai `Penarikan Tunai (Debet Bank)`.
3. **Setor Tunai ke Bank**: Ditandai `Setor Tunai (Kredit Bank)`.
4. **Pendapatan Bunga Bank (Giro)**: Ditandai `Jasa Giro (Kredit Bank)`.
5. **Pajak Bunga Bank PPh 4(2)**: Ditandai `Pajak Bunga (Debet Bank)`.
6. **Belanja Transfer Non-Tunai**: Ditandai `Belanja Transfer (Debet Bank)`.

Semua mutasi di atas dikompilasikan ke dalam array `transactions` yang dikirim ke AI, sehingga AI memiliki visibilitas 100% terhadap seluruh aktivitas buku bank.

### 3.3. Standardisasi Larangan ID pada System Prompt (11 Scanners)
Semua sub-scanner (`BkpBankAuditScanner`, `BkpPembantuAuditScanner`, `BkpUmumAuditScanner`, `BkpPajakAuditScanner`, `BkpRobAuditScanner`, `BkpRegAuditScanner`, `BkpBaAuditScanner`, `RealisasiAuditScanner`, `RekRealisasiAuditScanner`, `BhpAuditScanner`, `BhmAuditScanner`) diperbarui dengan aturan wajib:
> "ATURAN RUJUKAN TRANSAKSI: DILARANG KERAS MENYEBUT ATAU MENAMPILKAN ID DATABASE INTERNAL (seperti 'ID 108', 'ID 238', dsb). Ketika menjelaskan temuan, Anda WAJIB merujuk transaksi menggunakan: Tanggal Transaksi, Nomor Bukti, Uraian Transaksi, dan Kode/Nama Rekening Belanja agar bendahara sekolah dan auditor langsung dapat mengidentifikasi transaksinya di pembukuan."

### 3.4. Skema Temuan Baru (UI & PDF Friendly)
Setiap temuan yang dihasilkan AI menyertakan referensi transaksi manusiawi:
```json
{
  "id": "BANK-RECON-OK",
  "category": "keseimbangan_bank",
  "severity": "info",
  "title": "Judul Temuan Jelas",
  "description": "Deskripsi fakta menyebut tanggal, no bukti, uraian, dan rekening belanja...",
  "recommendation": "Rekomendasi konkrit...",
  "transaction_ref": "Tgl: 2026-03-15 | Bukti: BPU-012 | Pembelian ATK HVS",
  "amount": 0
}
```

---

## 4. Rencana Verifikasi
1. Eksekusi scan BKP Bank pada periode Tahap 1 yang sebelumnya menghasilkan ID 108 dsb.
2. Pastikan hasil ringkasan eksekutif tidak lagi menyebut ID internal dan tidak lagi mengklaim nominal Rp0/uraian kosong.
3. Pastikan AI mengakui adanya pencatatan bunga bank dan pajak bunga bank.
4. Validasi tampilan di modal UI [BkuAuditModal.tsx](file:///c:/laragon/www/newSIKAS2/newSIKAS/resources/js/Components/Ai/BkuAuditModal.tsx) dan unduhan PDF [bku-audit-report.blade.php](file:///c:/laragon/www/newSIKAS2/newSIKAS/resources/views/pdf/bku-audit-report.blade.php).
5. Format dengan `Pint` dan jalankan unit test.
