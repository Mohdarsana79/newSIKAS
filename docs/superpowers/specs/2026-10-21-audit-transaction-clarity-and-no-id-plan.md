# Rencana Implementasi: Peningkatan Kejelasan Audit BKP Bank & Penghapusan ID Database

**Tanggal:** 21 Oktober 2026  
**Dokumen Desain Terkait:** [2026-10-21-audit-transaction-clarity-and-no-id-design.md](file:///c:/laragon/www/newSIKAS2/newSIKAS/docs/superpowers/specs/2026-10-21-audit-transaction-clarity-and-no-id-design.md)  
**Status:** Siap Dikerjakan  

---

## Tahapan Implementasi

### Langkah 1: Perbarui `BaseTabAuditScanner.php`
- [ ] Ubah method `compactTransactions($transactions, int $limit = 40)`:
  - Hapus field internal `'id'`.
  - Tambahkan field:
    * `'tanggal'`
    * `'nomor_bukti'`
    * `'jenis'`
    * `'uraian'` (tangani kasus `is_bunga_record = true` dengan teks informatif "Jasa Giro Bank (Rp X) & Pajak Bunga PPh 4(2) (Rp Y)")
    * `'nominal'`
    * `'rekening'` (`kode_rekening - nama_rekening`)
    * `'kegiatan'` (`kode_kegiatan - nama_kegiatan`)
    * `'rekanan'`
    * `'pajak'`
    * `'ntpn'`

### Langkah 2: Perbarui `BkpBankAuditScanner.php`
- [ ] Susun koleksi `$bankMutations` komprehensif yang memuat seluruh mutasi bank:
  - Penerimaan Dana Transfer (sumber dana, tanggal, nominal masuk)
  - Penarikan Tunai Kas (tanggal, nominal keluar)
  - Setor Tunai Kas (tanggal, nominal masuk)
  - Jasa Giro Bank (tanggal, nominal bunga masuk)
  - Pajak Bunga Bank PPh 4(2) (tanggal, nominal pajak bunga keluar)
  - Belanja Transfer Non-Tunai (tanggal, no bukti, uraian, rekening, kegiatan, toko, nominal belanja keluar)
- [ ] Kirimkan `$bankMutations` ini ke array `transactions` yang dibaca AI (bukan hanya `$bkuNonTunai`).
- [ ] Perbarui instruksi `getSystemPrompt()` di `BkpBankAuditScanner`:
  - Larangan keras menyebutkan ID database.
  - Kewajiban menyebut Tanggal, No. Bukti, Uraian, dan Rekening.
  - Perjelas logika evaluasi penarikan tunai vs penerimaan dana.

### Langkah 3: Perbarui System Prompt pada 10 Scanner Lainnya
- [ ] Pastikan instruksi Anti-ID database dan kewajiban rujukan Tanggal, No Bukti, Uraian, Rekening, dan Kegiatan diterapkan di:
  1. `BkpPembantuAuditScanner.php`
  2. `BkpUmumAuditScanner.php`
  3. `BkpPajakAuditScanner.php`
  4. `BkpRobAuditScanner.php`
  5. `BkpRegAuditScanner.php`
  6. `BkpBaAuditScanner.php`
  7. `RealisasiAuditScanner.php`
  8. `RekRealisasiAuditScanner.php`
  9. `BhpAuditScanner.php`
  10. `BhmAuditScanner.php`

### Langkah 4: Tampilan UI Modal (`BkuAuditModal.tsx`) & Laporan PDF (`bku-audit-report.blade.php`)
- [ ] Di `BkuAuditModal.tsx`, tambahkan badge/rincian transaksi (`transaction_ref` atau `uraian`/`rekening`) pada setiap kartu temuan.
- [ ] Di `bku-audit-report.blade.php`, tambahkan kolom / baris referensi transaksi spesifik pada tabel matriks temuan BPK.

### Langkah 5: Formatting, Unit Test, & Verifikasi
- [ ] Jalankan `vendor/bin/pint`.
- [ ] Jalankan `npm run build`.
- [ ] Jalankan `php artisan test --filter=BkuMultiTabAuditTest`.
- [ ] Commit perubahan ke Git.
