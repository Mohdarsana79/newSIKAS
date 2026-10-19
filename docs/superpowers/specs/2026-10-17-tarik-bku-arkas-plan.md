# Implementation Plan: Tarik Data BKU dari ARKAS ke newSIKAS

**Tanggal:** 17 Oktober 2026  
**Dokumen Desain Terkait:** [2026-10-17-tarik-bku-arkas-design.md](file:///c:/laragon/www/newSIKAS2/newSIKAS/docs/superpowers/specs/2026-10-17-tarik-bku-arkas-design.md)  
**Status:** Menunggu Persetujuan Pengguna Sebelum Eksekusi  

---

## Tahapan Implementasi

### Fase 1: Pembuatan Python Engine Mandiri (`storage/app/arkas_engine/dump_bku.py`)
- [ ] Buat file `storage/app/arkas_engine/dump_bku.py`.
- [ ] Implementasikan koneksi ke SQLite database terenkripsi SQLCipher (`arkas.db`).
- [ ] Implementasikan query untuk mengambil:
  - Penerimaan Dana (`id_ref_bku = 2`)
  - Penarikan Tunai (`id_ref_bku = 3`)
  - Setor Tunai (`id_ref_bku = 5`)
  - Belanja Kas Tunai (`id_ref_bku = 4`) dan Non-Tunai (`id_ref_bku = 15`) beserta nota toko (`kas_umum_nota`), item barang belanja (`rapbs_periode` & `rapbs`), dan pajak/NTPN (`kas_umum_nota_pajak` & pajak sub-records).
  - Data Penutupan Bulan (`aktivasi_bku`, bunga bank `id_ref_bku = 6`, pajak bunga `id_ref_bku = 7`).
- [ ] Implementasikan mode `--check` untuk preview cepat dan mode `--dump` untuk data lengkap.
- [ ] Uji mandiri via CLI terminal dengan data nyata tahun 2026.

### Fase 2: Pendaftaran Rute (`routes/variant.php`)
- [ ] Daftarkan 4 rute baru pada `routes/variant.php`:
  - `penatausahaan/{penganggaran}/check-arkas-bku` (`penatausahaan.check-arkas-bku`)
  - `penatausahaan/{penganggaran}/pull-arkas-bku` (`penatausahaan.pull-arkas-bku`)
  - `penatausahaan/{penganggaran}/bku/{bulan}/check-arkas-bku` (`bku.check-arkas-bku`)
  - `penatausahaan/{penganggaran}/bku/{bulan}/pull-arkas-bku` (`bku.pull-arkas-bku`)

### Fase 3: Penambahan Logika Backend di Controller (`BukuKasUmumController.php`)
- [ ] Tambahkan helper resolusi `sumber_dana_id` ARKAS per varian (`reguler` -> 1, `kinerja` -> 12, `silpa` -> 33, `kinerja_silpa` -> 35).
- [ ] Implementasikan `checkArkasBkuYearly` & `checkArkasBkuMonthly`:
  - Cek apakah RKAS sudah ada di newSIKAS.
  - Cek jumlah data BKU existing di newSIKAS untuk periode tersebut.
  - Panggil Python `--check`.
  - Kembalikan response JSON berisi informasi preview dan flag `has_existing_data`.
- [ ] Implementasikan `pullArkasBkuYearly` & `pullArkasBkuMonthly`:
  - Validasi keberadaan RKAS.
  - Validasi parameter `overwrite = true` jika terdapat data existing.
  - Panggil Python `--dump`.
  - Eksekusi di dalam `DB::beginTransaction()`:
    * Hapus transaksi existing periode terkait jika overwrite disetujui.
    * Simpan penerimaan dana ke model `PenerimaanDana`.
    * Simpan penarikan tunai ke model `PenarikanTunai`.
    * Simpan setor tunai ke model `SetorTunai`.
    * Simpan transaksi belanja dan rincian item ke model `BukuKasUmum` dan `BukuKasUmumUraianDetail` (mencocokkan `rkas_id` dengan data RKAS newSIKAS).
    * Simpan status penutupan buku dan bunga bank per bulan.
    * `DB::commit()`.
  - Redirect kembali dengan flash session success.

### Fase 4: Antarmuka Pengguna Level Tahunan (`Penatausahaan/Index.tsx`)
- [ ] Tambahkan tombol *"Tarik BKU dari ARKAS"* pada komponen `YearAccordionItem`.
- [ ] Tambahkan state dan modal preview/konfirmasi:
  - Ringkasan data ARKAS (Penerimaan, Penarikan, Total Belanja, Bulan Ditutup).
  - Warning konfirmasi timpa ulang (*overwrite warning*) jika data BKU tahun tersebut di newSIKAS sudah terisi.
  - Checkbox konfirmasi persetujuan overwrite.
  - Indikator proses/spinner saat penarikan berjalan.

### Fase 5: Antarmuka Pengguna Level Bulanan (`Penatausahaan/Bku.tsx`)
- [ ] Tambahkan tombol *"Tarik BKU Bulan Ini"* pada toolbar header atas.
- [ ] Tambahkan modal konfirmasi bulanan dengan deteksi data existing bulan aktif dan opsi overwrite.

### Fase 6: Verifikasi & Uji Coba Akhir
- [ ] Jalankan build frontend (`npm run build`).
- [ ] Uji coba penarikan BKU bulanan untuk satu bulan (misal Maret 2026).
- [ ] Uji coba penarikan BKU tahunan untuk seluruh tahun 2026.
- [ ] Verifikasi saldo kas, saldo bank, dan daftar belanja di newSIKAS.
