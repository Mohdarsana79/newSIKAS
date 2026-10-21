# Rencana Implementasi: Penyesuaian Uraian Kwitansi dan Dokumen SPJ Real pada SIKAS AI Copilot

**Tanggal:** 2026-10-21  
**Status:** In Progress  
**Spec Referensi:** [`docs/superpowers/specs/2026-10-21-penyesuaian-uraian-kwitansi-dan-dokumen-spj-design.md`](file:///c:/laragon/www/newSIKAS2/newSIKAS/docs/superpowers/specs/2026-10-21-penyesuaian-uraian-kwitansi-dan-dokumen-spj-design.md)

---

## 1. Langkah-Langkah Pengerjaan

### Tahap 1: Implementasi Helper & Penyesuaian `CopilotService.php`
- [ ] Tambahkan method `formatUraianPembayaranReal($bku): string` di `app/Services/Ai/CopilotService.php`.
- [ ] Perbarui `getSpjDocumentsStatus`:
  - Ubah `'uraian' => $bku->uraian_opsional ?: $bku->uraian` menjadi `'uraian' => $this->formatUraianPembayaranReal($bku)`.
- [ ] Perbarui `getSpjDocumentDetail`:
  - Perbaiki mapping `rekening`: `($bku->rekeningBelanja?->kode_rekening ?? '') . ' - ' . ($bku->rekeningBelanja?->rincian_objek ?? '')`.
  - Perbaiki mapping `kegiatan`: `($bku->kodeKegiatan?->kode ?? '') . ' - ' . ($bku->kodeKegiatan?->uraian ?? '')`.
  - Pada `bast`: Tambahkan field `'uraian_pekerjaan' => $this->formatUraianPembayaranReal($bku)` dan perbaiki relasi rekening/kegiatan.
  - Pada `surat_pesanan`: Tambahkan field `'untuk_keperluan' => $this->formatUraianPembayaranReal($bku)`, perbaiki relasi rekening, dan tambahkan relasi kegiatan.
  - Pada `tanda_terima`: Ubah `'keperluan' => $this->formatUraianPembayaranReal($bku)` dan perbaiki relasi rekening/kegiatan.
  - Pada `kwitansi`: Ubah `'untuk_pembayaran' => $this->formatUraianPembayaranReal($bku)` dan perbaiki relasi rekening/kegiatan.
- [ ] Perbarui instruksi system prompt di bagian SPJ Dokumen:
  - Instruksikan AI untuk menggunakan uraian pembayaran riil barang/jasa dan melarang keras memunculkan kata pembukuan kas formal `"Lunas Bayar..."` pada dokumen resmi SPJ.

### Tahap 2: Pengujian Unit & Logika Backend
- [ ] Jalankan scratch test untuk memverifikasi method `formatUraianPembayaranReal`:
  - Transaksi belanja multi-item (BKU 210: Kuas Biasa, Cat tembok, Kuas Roll).
  - Transaksi belanja single-item (BKU 208: Racun Rumput).
  - Transaksi honorarium guru (BKU 215 / ID 17: Honor Guru).
- [ ] Verifikasi bahwa nama rekening (`rincian_objek`) dan nama kegiatan (`uraian`) tidak lagi `null`.

### Tahap 3: Live Test AI Copilot Chat
- [ ] Uji chat langsung via API DeepSeek dengan query:
  `Om, tolong tampilkan kwitansi untuk transaksi 058/BOSP/THP-II/2026`
- [ ] Pastikan respons AI menyajikan baris "Untuk Pembayaran: Pembayaran Belanja Kuas Biasa, Cat tembok Nippon Paint, Kuas Roll" dan nama rekening serta nama kegiatan muncul lengkap.

### Tahap 4: Code Review, Pint, & Commit
- [ ] Jalankan `vendor/bin/pint` untuk merapikan kode.
- [ ] Lakukan code review menyeluruh.
- [ ] Commit perubahan ke Git.
