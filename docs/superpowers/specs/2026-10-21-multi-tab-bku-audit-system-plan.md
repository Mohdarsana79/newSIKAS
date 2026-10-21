# Rencana Implementasi: Sistem Pra-Audit Forensik AI Multi-Tab (11 Tabs) & Multi-Periode SIKAS

**Tanggal:** 21 Oktober 2026  
**Dokumen Desain Terkait:** [2026-10-21-multi-tab-bku-audit-system-design.md](file:///c:/laragon/www/newSIKAS2/newSIKAS/docs/superpowers/specs/2026-10-21-multi-tab-bku-audit-system-design.md)  
**Status:** Siap Dieksekusi  

---

## Ringkasan Proyek
Mengimplementasikan sistem **Pra-Audit Forensik AI (DeepSeek-R1) Multi-Tab & Multi-Periode** untuk aplikasi SIKAS. Fitur ini memungkinkan bendahara dan kepala sekolah melakukan audit kepatuhan mandiri berstandar BPK RI dan Inspektorat Daerah pada **11 tab pembukuan** (BKP Bank, BKP Pembantu Tunai, BKP Umum, BKP Pajak, ROB, REG, Berita Acara, Realisasi, Rek. Realisasi, BHP, BHM) dengan fleksibilitas cakupan periode **Bulanan, Tahap 1, Tahap 2, dan Tahunan**, lengkap dengan smart caching, fallback cerdas deterministik, dan lembar kerja audit resmi berformat PDF.

---

## Tahapan Implementasi Detail

### Tahap 1: Migrasi Database & Perluasan Model Eloquent
- [ ] Buat file migrasi `database/migrations/2026_10_21_000001_add_tab_and_period_to_bku_audit_logs_table.php`:
  - Tambah kolom `tab_type` (`string(30)`, default: `'reg'`).
  - Tambah kolom `periode_type` (`string(20)`, default: `'bulanan'`).
  - Tambah kolom `periode_key` (`string(30)`, default: `'januari'`).
  - Ubah kolom `bulan_angka` agar `nullable()` untuk mengakomodasi periode non-bulanan (tahapan/tahunan).
  - Tambahkan indeks majemuk: `['variant', 'tahun', 'tab_type', 'periode_type', 'periode_key', 'penganggaran_id']`.
- [ ] Perbarui model [BkuAuditLog.php](file:///c:/laragon/www/newSIKAS2/newSIKAS/app/Models/BkuAuditLog.php):
  - Tambahkan `tab_type`, `periode_type`, dan `periode_key` ke `$fillable`.
  - Tambahkan casts string untuk kolom-kolom baru tersebut.
- [ ] Jalankan migrasi database via `php artisan migrate`.

---

### Tahap 2: Backend Modular Scanners & Layer Orkestrasi
- [ ] Buat interface `app/Services/Ai/Audit/TabAuditScannerInterface.php`:
  - Method `scanDeterministic(User $user, string $variant, int $tahun, string $periodeType, string $periodeKey, $penganggaran): array`
  - Method `getSystemPrompt(string $variant, int $tahun, string $periodeType, string $periodeKey): string`
  - Method `getTabTitle(): string`
- [ ] Buat abstract base class `app/Services/Ai/Audit/BaseTabAuditScanner.php`:
  - Helper konversi `periodeType` dan `periodeKey` menjadi rentang tanggal / rentang bulan `[startMonth, endMonth]`.
  - Helper pengambilan transaksi BKU, pajak, kuitansi, dan BAST berbasis rentang periode dan varian aktif (`reguler`, `kinerja`, `silpa`, `kinerja_silpa`).
  - Helper penghitungan skor kepatuhan deterministik dan penyusunan struktur temuan baku (id, category, severity, title, description, recommendation, amount).
- [ ] Implementasikan 11 Sub-Scanner spesifik tab di `app/Services/Ai/Audit/Scanners/`:
  - [ ] `BkpBankAuditScanner.php`: Uji rekonsiliasi kas bank, mutasi transfer, pencatatan bunga bank & pajak bunga bank PPh 4 ayat 2, deteksi saldo bank minus, sisa dana mengendap.
  - [ ] `BkpPembantuAuditScanner.php`: Uji saldo kas tunai harian tidak minus, batas simpan brankas tunai (maks Rp 10-20jt), transaksi tunai > Rp 10jt tanpa Berita Acara non-tunai.
  - [ ] `BkpUmumAuditScanner.php`: Uji kronologi tanggal transaksi dan urutan nomor BPU/Nota, deteksi duplikasi transaksi, deteksi pemecahan transaksi (*split-bill*).
  - [ ] `BkpPajakAuditScanner.php`: Uji rekonsiliasi saldo pungut vs setor (saldo akhir masa = 0), kelengkapan kode NTPN, kepatuhan tarif PPh 21/22/23/PPN 11%/pajak daerah, belanja > Rp 2jt tanpa pajak.
  - [ ] `BkpRobAuditScanner.php`: Uji pagu RKAS per rincian objek belanja (anti *over-budget*), deteksi belanja tanpa pos RKAS, salah klasifikasi belanja operasi vs modal.
  - [ ] `BkpRegAuditScanner.php`: Uji selisih kas fisik vs buku (*Zero Discrepancy*), kepatuhan penutupan kas berkala, konsistensi saldo penutupan lalu vs saldo awal.
  - [ ] `BkpBaAuditScanner.php`: Uji konsistensi rincian fisik lembaran uang kertas, logam, saldo bank, kelengkapan identitas TTD Kepala Sekolah & Bendahara.
  - [ ] `RealisasiAuditScanner.php`: Uji persentase serapan belanja (syarat salur Tahap 2 & batas akhir tahun), deviasi belanja per standar SNP, identifikasi kegiatan mangkrak.
  - [ ] `RekRealisasiAuditScanner.php`: Uji proporsi belanja pegawai 5.1.01, barang/jasa 5.1.02, dan belanja modal 5.2, deteksi pergeseran anggaran tanpa RKAS Perubahan.
  - [ ] `BhpAuditScanner.php`: Uji sinkronisasi belanja 5.1.02 dengan mutasi masuk persediaan ATK/bahan ajar, kewajaran sisa persediaan fisik akhir periode, barang aset yang salah masuk akun habis pakai.
  - [ ] `BhmAuditScanner.php`: Uji belanja modal 5.2 wajib BAST, kesesuaian KIB (KIB B/C/E), batas nilai ambang kapitalisasi aset tetap daerah.
- [ ] Buat class orchestrator `app/Services/Ai/Audit/BkuAuditOrchestrator.php`:
  - Registry pemetaan `tab_type` ke instance scanner terkait.
  - Pengecekan caching log berdasarkan `last_bku_updated_at` (opsi `force_refresh`).
  - Pemanggilan `DeepSeekService->callReasoner()` untuk model penalaran DeepSeek-R1.
  - Fallback deterministik cerdas saat offline atau API key belum dipasang.
  - Penyimpanan log audit ke tabel `bku_audit_logs`.
- [ ] Perbarui `app/Http/Controllers/BkuAuditController.php`:
  - Sambungkan controller ke `BkuAuditOrchestrator`.
  - Method `getStatus()`: Mendukung query parameter `tab_type`, `periode_type`, `periode_key` (tetap kompatibel dengan request lama).
  - Method `runAudit()`: Menerima payload `tab_type`, `periode_type`, `periode_key`, `force_refresh`.
  - Method `exportPdf()`: Menyiapkan variabel judul buku dan periode dinamis untuk PDF.

---

### Tahap 3: Template Dokumen PDF Lembar Kerja Pra-Audit Forensik
- [ ] Perbarui template Blade `resources/views/pdf/bku-audit-report.blade.php`:
  - Judul Dokumen dan Subjudul dinamis menyesuaikan objek buku (`$audit->tab_type`).
  - Label periode dinamis (Bulan, Tahap 1, Tahap 2, atau Tahun Anggaran Penuh).
  - Desain resmi berstandar pengawasan internal (Kop Sekolah, Identitas Pengujian, Status Skor, Ringkasan Eksekutif, Tabel Matriks Temuan & Rekomendasi, Checklist Kepatuhan, dan Tanda Tangan KPA/Kepala Sekolah & Bendahara).

---

### Tahap 4: Antarmuka Pengguna Frontend (UI/UX)
- [ ] Perbarui `resources/js/Components/Ai/BkuAuditModal.tsx`:
  - Tambahkan props: `tabType`, `tabTitle`, `initialPeriodeType`, `initialPeriodeKey`.
  - Tambahkan komponen **Period Scope Switcher** di bagian atas modal:
    * Tab `[ Bulanan ]` `[ Tahap 1 ]` `[ Tahap 2 ]` `[ Tahunan ]`
    * Dropdown bulan aktif saat tab `Bulanan` dipilih.
  - Tampilkan judul buku yang sedang diaudit secara kontekstual.
  - Sinkronisasi pengambilan status dan eksekusi audit sesuai scope periode yang dipilih pengguna.
  - Tautan cetak PDF langsung ke ID audit hasil pemindaian.
- [ ] Perbarui `resources/js/Pages/Penatausahaan/Rekapitulasi.tsx`:
  - Tambahkan tombol audit seragam dengan badge skor di header seluruh 11 tab:
    1. Tab `bkp_bank` (BKP Bank)
    2. Tab `bkp_pembantu` (BKP Pembantu Tunai)
    3. Tab `bkp_umum` (BKP Umum)
    4. Tab `bkp_pajak` (BKP Pajak)
    5. Tab `rob` (ROB)
    6. Tab `reg` (REG - Registrasi Penutupan Kas)
    7. Tab `ba` (Berita Acara Pemeriksaan Kas)
    8. Tab `realisasi` (Realisasi)
    9. Tab `rek_realisasi` (Rek. Realisasi)
    10. Tab `bhp` (BHP)
    11. Tab `bhm` (BHM)
  - Simpan state skor per tab sehingga bendahara langsung melihat status kepatuhan dari masing-masing buku di layar utama.

---

### Tahap 5: Verifikasi, Pint Formatting, & Pengujian Kualitas
- [ ] Format kode PHP menggunakan `vendor/bin/pint`.
- [ ] Uji validasi TypeScript dan build frontend dengan `npm run build`.
- [ ] Pengujian fungsional backend:
  - Cek endpoint status & run audit untuk tab bulanan, tahapan, dan tahunan.
  - Uji ekspor PDF untuk memastikan layout rapi dan tidak ada error rendering.
