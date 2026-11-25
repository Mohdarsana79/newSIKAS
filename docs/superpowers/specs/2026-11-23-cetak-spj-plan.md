# Rencana Implementasi: Fitur Cetak SPJ Terpadu & Studio Cover LPJ Modern

**Tanggal:** 2026-11-23  
**Spec Acuan:** [2026-11-23-cetak-spj-design.md](file:///c:/laragon/www/newSIKAS2/newSIKAS/docs/superpowers/specs/2026-11-23-cetak-spj-design.md)  
**Status:** Siap Eksekusi Setelah Instruksi Mulai dari Pengguna

---

## Ringkasan Urutan Eksekusi (7 Tahap)

### Tahap 1 — Migrasi Database, Model & RBAC
1. **Buat migrasi tabel baru:**
   - `database/migrations/2026_11_23_180000_create_spj_print_presets_table.php` (`variant`, `tahun_anggaran`, `nama_preset`, `cover_config` JSON, `bundle_config` JSON, `updated_by`, unique `['variant', 'tahun_anggaran', 'nama_preset']`).
   - `database/migrations/2026_11_23_180100_create_spj_external_attachments_table.php` (`variant`, `tahun_anggaran`, `periode_tag`, `judul`, `kategori`, `file_path`, `original_filename`, `file_size`, `sort_order`, `uploaded_by`).
   - `database/migrations/2026_11_23_180200_backfill_cetak_spj_role_permission.php` (isi `permissions.modules.cetak_spj`: `write` untuk `bendahara`, `read` untuk `kepala_sekolah` hanya bila key belum ada).
2. **Buat Model Eloquent:**
   - `app/Models/SpjPrintPreset.php` (`casts: cover_config => array, bundle_config => array`).
   - `app/Models/SpjExternalAttachment.php` (validasi konstanta kategori `sk_tim|rekening_koran|pajak|lainnya` dan periode `tahap_1|tahap_2|tahunan|umum`).
3. **Perbarui `app/Config/PermissionCatalog.php`:**
   - Daftarkan modul `cetak_spj` pada grup `'Fitur Pelengkap'` dengan `supports_write: true`.
   - Petakan prefix route `cetak-spj` & `api.cetak-spj` pada `resolveRouteRequirement()` (GET/stream = `read`, POST/PATCH/DELETE = `write`).

### Tahap 2 — Layanan Backend `SpjPrintManifestService`
1. **Buat `app/Services/SpjPrintManifestService.php`:**
   - Resolusi model varian melalui `VariantConfig::getModelClass(..., $variant)` dan FK `VariantConfig::penganggaranFk($variant)`.
   - Resolusi rentang tanggal & daftar bulan (`januari`..`desember`) untuk 5 mode periode (`tahap_1`, `tahap_2`, `bulan`, `rentang_bulan`, `tahunan`) dengan penyesuaian otomatis untuk varian `silpa` dan `kinerja_silpa`.
   - Agregasi `sekolah` (termasuk konversi aman base64 data URI ≤ 2 MB untuk `logo_daerah` & `logo_sekolah`), `penanggung_jawab`, dan `ringkasan_keuangan` (Pagu, Dana Diterima, Realisasi, Sisa, % Serapan, Jumlah Transaksi) menggunakan `whereBetween('tanggal_transaksi', [...])`.
   - Pembangunan manifest kesiapan & daftar URL chunk atomik dengan pemetaan parameter aktual tiap controller SIKAS:
     - **RKAS / RKAS Perubahan:** parameter `paper_size` (`F4`/`A4`/`Legal`) + `orientation`.
     - **Penatausahaan (BKU, Buku Bank, Kas Tunai, Pajak, ROB, Register, BA, Realisasi, BHP, BHM):** parameter `tahun` (angka tahun), `bulan` (nama bulan lowercase Bahasa Indonesia), `paperSize` (`F4`/`A4`/`Legal`); mendukung pengurutan `per_jenis` (default) dan `per_bulan`.
     - **Kwitansi & Tanda Terima:** parameter `tahun` **diisi `$penganggaran->id`** (sesuai query aktual `KwitansiController::downloadAll` & `TandaTerimaController::downloadAll`), dipecah per bulan memakai `start_date` & `end_date` agar ringan di DomPDF; parameter kertas Tanda Terima pakai `paper_size=Folio` saat F4 terpilih.
     - **BAST & Surat Pesanan:** daftar chunk per record terfilter rentang tanggal memakai `bast.preview`/`bast.custom.preview` dan `surat-pesanan.preview`/`surat-pesanan.custom.preview` dengan `paperSize` (`F4`/`A4`/`Legal`) serta `fallback_url` ke format bawaan bila template `.docx` aktif.
     - **SP2B, SPTJ, SPMTH, LPH:** cocokkan record berdasarkan `tahap`/`semester`/`bulan`, sertakan opsi format bawaan (`laporan.{type}.pdf`) & seluruh template kustom `.docx` (`spj_templates`) dengan `fallback_url`.
     - **Lampiran Eksternal:** ambil dari `spj_external_attachments` terfilter `variant`, `tahun_anggaran`, dan `periode_tag` yang cocok (`umum` atau periode aktif).

### Tahap 3 — Controller, Keamanan File & Routing Varian
1. **Buat `app/Http/Controllers/CetakSpjController.php`:**
   - `index()` — render Inertia `FiturPelengkap/CetakSpj/Index` via pola `renderVariant()`.
   - `manifest(Request $request)` — validasi query filter dan kembalikan JSON dari `SpjPrintManifestService`.
   - `savePreset(Request $request)` — validasi & upsert `SpjPrintPreset` untuk `variant` + `tahun_anggaran`.
   - `uploadCoverPhoto()` & `deleteCoverPhoto()` — validasi gambar JPG/PNG/WebP ≤ 3 MB, simpan di `Storage::disk('public')`, kembalikan data URI aman & path.
   - `storeAttachment()`, `updateAttachment()`, `destroyAttachment()`, `streamAttachment()` — validasi ketat PDF (`mimes:pdf`, cek magic bytes `%PDF-`, maks 25 MB), simpan pada disk lokal private, stream dengan `Content-Type: application/pdf` dan verifikasi isolasi varian.
   - Catat aksi mutasi ke `ActivityLogger` mengikuti pola modul lain.
2. **Perbarui `routes/variant.php`:**
   - Daftarkan seluruh route `cetak-spj.*` dan `api.cetak-spj.*` sehingga otomatis aktif di 4 varian BOSP.

### Tahap 4 — Instalasi `pdf-lib` & Modul Mesin Perakitan PDF (`spjPdfAssembler.ts`)
1. **Tambahkan dependensi frontend:** `npm install pdf-lib` (pure JS, offline-safe).
2. **Buat `resources/js/Pages/FiturPelengkap/CetakSpj/types.ts`:**
   - Tipe TypeScript strict untuk `SpjManifest`, `CoverConfig`, `BundleConfig`, `ChapterManifest`, `DocumentItemManifest`, `PdfChunk`, `AssemblyProgress`, `AssemblyFailure`, dan `AssemblyResult`.
3. **Buat `resources/js/Pages/FiturPelengkap/CetakSpj/services/spjPdfAssembler.ts`:**
   - Runner chunk dengan concurrency terkendali (`max 2` paralel) & dukungan `AbortController`.
   - Konversi kanvas React Cover & Pembatas Bab ke PNG 300 DPI (`html-to-image` `toPng`, `pixelRatio: 3`, kompensasi `html { zoom: 0.8 }`) lalu tanam *full-bleed* pada dimensi kertas terpilih (`F4: 595.28×935.43 pt`, `A4: 595.28×841.89 pt`, `Legal: 612×1008 pt`).
   - Hitung `pageCount` aktual setiap dokumen & bab → bangun halaman **Daftar Isi Otomatis** bernomor halaman 100% presisi (teks vektor tajam `pdf-lib` / kanvas senada tema).
   - Opsi stempel footer nomor halaman (`Halaman X dari Y`, default `false`).
   - Fungsi ekstraksi instan dari hasil rakitan tanpa generate ulang:
     - `buildFullPdf()` (1 PDF gabungan utuh)
     - `buildOrientationPdf('portrait' | 'landscape')` (memperhitungkan `width`, `height`, dan `page.getRotation().angle`)
     - `buildChapterPdf(chapterKey)` (unduh per bab).
   - *Resilient Error Handling*: kumpulkan item gagal beserta alasan HTTP/LibreOffice/PDF terenkripsi, dukung retry selektif, fallback ke `fallback_url` (Format Bawaan SIKAS), atau lanjut tanpa item gagal.

### Tahap 5 — Studio Cover LPJ Modern, Pembatas Bab & QR Offline
Buat direktori `resources/js/Pages/FiturPelengkap/CetakSpj/components/CoverStudio/`:
1. `coverThemes.ts` — 6 palet warna kurasi + generator palet dari custom hex + helper mode hemat tinta.
2. `QrCodeSvg.tsx` — generator QR Code SVG murni offline (tanpa API eksternal) untuk metadata verifikasi SPJ.
3. `CoverCanvas.tsx` — 5 preset layout modern berbeda struktur (`editorial`, `instansi_elegan`, `geometris`, `neo_bento`, `photo_hero`), rasio kertas dinamis (`F4`/`A4`/`Legal`), auto-filled data profil sekolah + ringkasan keuangan + foto sekolah/ilustrasi vektor fallback.
4. `SectionDividerCanvas.tsx` — pembatas bab modern otomatis mewarisi tema, warna, & mode hemat tinta dari Cover aktif.
5. `CoverControlPanel.tsx` — panel kiri interaktif (pemilih preset, palet/custom color picker, toggle mode hemat tinta, editor teks & penandatangan, upload foto sekolah, toggle logo/statistik/QR, tombol Simpan Preset & Unduh Cover Saja PDF/PNG HD 3×).

### Tahap 6 — Halaman Utama Cetak SPJ & Integrasi Navigasi
1. **Buat komponen utama halaman:**
   - `resources/js/Pages/FiturPelengkap/CetakSpj/components/BundleChecklist.tsx` — KPI kesiapan, daftar Bab & dokumen dengan checkbox, tombol reorder naik/turun, badge status + pintasan modul kosong, dropdown format/template, dan tombol preview/cetak satuan.
   - `resources/js/Pages/FiturPelengkap/CetakSpj/components/ExternalAttachmentManager.tsx` — unggah PDF eksternal (validasi client + server), edit judul/kategori, hapus, dan atur posisi bab/urutan.
   - `resources/js/Pages/FiturPelengkap/CetakSpj/components/AssemblyProgressModal.tsx` — progress bar real-time per chunk, daftar pemulihan item gagal, ringkasan Daftar Isi aktual + hitung halaman Portrait/Landscape, serta 4 aksi cetak/unduh Hybrid.
   - `resources/js/Pages/FiturPelengkap/CetakSpj/Index.tsx` — Filter Bar Global (4 Varian, Tahun, 5 Mode Periode, Paper Size, Mode Susun) + Tab 1 (*Susun Bendel & Kesiapan*) + Tab 2 (*Studio Cover & Pembatas Bab*).
2. **Integrasi Navigasi & Pencarian:**
   - Perbarui `resources/js/Components/Sidebar.tsx` (tambah `canModule('cetak_spj')` & `NavLink` **Cetak SPJ** di grup *Fitur Pelengkap*).
   - Perbarui `resources/js/Utils/featureSearchCatalog.ts` & `resources/js/Components/FeatureSearchModal.tsx` (daftarkan fitur `cetak_spj` pada pencarian `Ctrl+K`).

### Tahap 7 — Pengujian Otomatis, Quality Gates & Code Review
1. **Buat `tests/Feature/CetakSpjTest.php`:**
   - RBAC lintas 4 varian (`bendahara`, `kepala_sekolah` read-only, custom role `403`).
   - Manifest lintas 5 mode periode, 4 varian BOSP, 2 mode susun (`per_jenis` & `per_bulan`), dan kondisi data kosong.
   - CRUD `SpjPrintPreset`, upload/hapus foto cover, serta upload/validasi magic-bytes/stream/hapus `SpjExternalAttachment`.
   - Verifikasi parameter URL chunk Kwitansi/Tanda Terima memakai `penganggaran_id` yang tepat.
2. **Jalankan Quality Gates:**
   - `vendor/bin/pint`
   - `php artisan migrate --force` (PostgreSQL `newSIKAS`)
   - `composer test`
   - `npm run build` (`tsc && vite build`)
   - `/code-review` dua sumbu paralel (**Standards** & **Spec**).
