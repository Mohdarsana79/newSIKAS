# Spesifikasi Desain: Fitur Cetak SPJ Terpadu & Studio Cover LPJ Modern

- **Tanggal:** 2026-11-23
- **Status:** Disetujui (Rencana Implementasi Tersedia — Belum Dieksekusi)
- **Ruang Lingkup:** Modul baru **Cetak SPJ** lintas 4 varian BOSP (`reguler`, `kinerja`, `silpa`, `kinerja_silpa`) — Backend (Migrasi 2 tabel + Backfill RBAC, `SpjPrintManifestService`, `CetakSpjController`, Model `SpjPrintPreset` & `SpjExternalAttachment`, Routes varian) + Frontend (Halaman Neo-Bento Cetak SPJ, Studio Cover Modern 5 Preset, Pembatas Bab & Daftar Isi Otomatis, Mesin Perakitan PDF `pdf-lib` Hybrid Portrait/Landscape, Sidebar & Pencarian `Ctrl+K`)

---

## 1. Tujuan & Masalah yang Diselesaikan

Selama ini, untuk menyusun satu bendel SPJ/LPJ (baik per tahap, per bulan, maupun tahunan), bendahara sekolah harus membuka banyak menu terpisah (RKAS, BKU, 9 buku pembantu/rekap, Kwitansi, Tanda Terima, BAST, Surat Pesanan, SP2B, SPTJ, SPMTH, LPH), mengunduh puluhan file PDF satu per satu, membuat Cover LPJ dan Daftar Isi secara manual di Word/Canva, lalu menggabungkannya dengan aplikasi pihak ketiga.

Fitur **Cetak SPJ** menyatukan seluruh alur tersebut menjadi satu pusat perakitan & pencetakan bendel SPJ yang:
1. Mendukung **seluruh 4 varian BOSP** (`BOSP Reguler`, `BOSP Kinerja`, `SiLPA BOSP Reguler`, `SiLPA BOSP Kinerja`) dan **5 mode periode** (`Tahap 1`, `Tahap 2`, `Per Bulan`, `Rentang Bulan`, `Tahunan`).
2. Memanfaatkan ulang seluruh generator PDF SIKAS yang sudah ada (termasuk **Template Kustom `.docx`** berbasis LibreOffice) serta mendukung penyisipan **file PDF eksternal** (SK Tim BOSP, Rekening Koran, Bukti Setor Pajak, dll.).
3. Menyediakan **Studio Cover LPJ/SPJ Interaktif & Modern** (5 preset layout, live preview real-time, palet/custom warna, upload foto sekolah, ringkasan keuangan, QR info offline) beserta **Halaman Pembatas Bab** senada dan **Daftar Isi Otomatis bernomor halaman akurat 100%**.
4. Menghasilkan keluaran **Hybrid**: **1 PDF Gabungan Utuh** (arsip digital), **Paket Portrait saja** & **Paket Landscape saja** (siap cetak fisik tanpa orientasi kertas kacau), serta **Cetak/Unduh per Bab & per Dokumen**.

---

## 2. Pendekatan Arsitektur Teknis Terpilih

### Client-Side PDF Assembly (`pdf-lib`) + Generator Atomik Laravel + Cover 300 DPI WYSIWYG

- **Laravel Backend** bertugas menyediakan manifest kesiapan data + endpoint generator PDF atomik (memakai ulang controller DomPDF & LibreOffice `.docx` yang sudah ada, ditambah endpoint upload/stream lampiran PDF eksternal dan penyimpanan preset).
- **Browser Frontend (`pdf-lib`)** menarik setiap chunk PDF secara bertahap dengan progress bar real-time, merender Cover & Pembatas Bab pada resolusi **300 DPI (3×)** via `html-to-image` (sudah terpasang di `package.json`), menghitung jumlah halaman aktual tiap bab, menyusun halaman **Daftar Isi** dengan nomor halaman 100% presisi, dan menyediakan ekspor Hybrid (Utuh / Portrait / Landscape / Per Bab) langsung di browser tanpa generate ulang.
- **Alasan Pemilihan:**
  - **100% WYSIWYG Cover Modern:** Bebas dari keterbatasan CSS 2.1 DomPDF; gradient, grid, kartu Neo-Bento, foto sekolah, dan SVG geometris tercetak tajam 300 DPI persis seperti live preview.
  - **Anti-Timeout & Ramah Desktop Offline (Laragon/EXE):** Tidak bergantung pada Laravel Queue Worker maupun `max_execution_time` PHP untuk bendel 200+ halaman.
  - **Kompatibel PDF Eksternal Modern (v1.5–v1.7):** Tidak terkendala limitasi parser gratis FPDI saat menggabungkan Rekening Koran e-Banking atau hasil scan PDF modern.
  - **Pisah Portrait & Landscape Instan:** Dimensi dan rotasi tiap halaman dibaca langsung di memori oleh `pdf-lib`.

---

## 3. RBAC, Skema Database & Routing

### 3.1 Registrasi RBAC (`app/Config/PermissionCatalog.php`)
- Modul baru pada grup `'Fitur Pelengkap'`:
  ```php
  [
      'key' => 'cetak_spj',
      'label' => 'Cetak SPJ Terpadu',
      'group' => 'Fitur Pelengkap',
      'description' => 'Menyusun bendel SPJ, mendesain cover LPJ modern, melampirkan PDF pendukung, dan mencetak/mengunduh SPJ terpadu.',
      'supports_write' => true,
  ]
  ```
- Preset role sistem:
  - `bendahara` / `admin`: `write` (akses penuh: cetak, simpan preset cover/bendel, unggah/hapus foto cover & PDF eksternal).
  - `kepala_sekolah`: `read` (melihat kesiapan SPJ, preview cover, dan merakit/mencetak/mengunduh bendel SPJ; tidak dapat menyimpan perubahan preset atau menghapus lampiran).
  - Role custom lain: default `none` (dapat diatur via *Management & Role*).
- Pemetaan route pada `resolveRouteRequirement()`:
  - `'cetak-spj' => 'cetak_spj'`
  - `'api.cetak-spj' => 'cetak_spj'`
- Migrasi backfill `2026_11_23_180000_backfill_cetak_spj_role_permission.php`: menambahkan `cetak_spj` ke role sistem yang belum memilikinya tanpa menimpa kustomisasi admin.

### 3.2 Skema Database (2 Tabel Lintas Varian)

#### Tabel `spj_print_presets`
Menyimpan konfigurasi Studio Cover dan susunan bendel per varian & tahun anggaran:

| Kolom | Tipe | Keterangan |
|---|---|---|
| `id` | bigIncrements | Primary key |
| `variant` | string(32), indexed | `reguler` \| `kinerja` \| `silpa` \| `kinerja_silpa` |
| `tahun_anggaran` | unsignedSmallInteger, nullable | Tahun spesifik atau `null` sebagai default varian |
| `nama_preset` | string(100) | Default `'Default'` |
| `cover_config` | json | Layout, palet/custom warna, mode hemat tinta, teks, toggle elemen, path foto sekolah |
| `bundle_config` | json | Urutan Bab & item aktif, format/template per dokumen, paper size, mode susun, opsi TOC/Pembatas/Nomor Halaman |
| `updated_by` | foreignId nullable → `users.id` | `nullOnDelete` |
| `timestamps` | created_at, updated_at | Timestamp standar |

Unique index komposit pada `['variant', 'tahun_anggaran', 'nama_preset']`.

#### Tabel `spj_external_attachments`
Menyimpan file PDF pendukung eksternal yang disisipkan ke bendel SPJ:

| Kolom | Tipe | Keterangan |
|---|---|---|
| `id` | bigIncrements | Primary key |
| `variant` | string(32), indexed | `reguler` \| `kinerja` \| `silpa` \| `kinerja_silpa` |
| `tahun_anggaran` | unsignedSmallInteger, indexed | Tahun anggaran terkait |
| `periode_tag` | string(24) | `tahap_1` \| `tahap_2` \| `tahunan` \| `umum` |
| `judul` | string(180) | Judul tampil pada urutan bendel & Daftar Isi |
| `kategori` | string(32) | `sk_tim` \| `rekening_koran` \| `pajak` \| `lainnya` |
| `file_path` | string(255) | Path lokal private: `spj_attachments/{variant}/{tahun}/{uuid}.pdf` |
| `original_filename` | string(255) | Nama berkas asli |
| `file_size` | unsignedBigInteger | Ukuran berkas dalam byte (maks 25 MB) |
| `sort_order` | unsignedInteger | Urutan default dalam grup lampiran |
| `uploaded_by` | foreignId nullable → `users.id` | `nullOnDelete` |
| `timestamps` | created_at, updated_at | Timestamp standar |

### 3.3 Routing Varian (`routes/variant.php`)
Dipasang di dalam `routes/variant.php` agar otomatis tersedia untuk keempat varian (`reguler`, `kinerja-`, `silpa-`, `kinerja-silpa-`):
- `GET /cetak-spj` → `CetakSpjController@index` (`cetak-spj.index`)
- `GET /api/cetak-spj/manifest` → `CetakSpjController@manifest` (`api.cetak-spj.manifest`)
- `POST /api/cetak-spj/preset` → `CetakSpjController@savePreset` (`api.cetak-spj.preset.save`) — `write`
- `POST /api/cetak-spj/cover-photo` → `CetakSpjController@uploadCoverPhoto` (`api.cetak-spj.cover-photo.upload`) — `write`
- `DELETE /api/cetak-spj/cover-photo` → `CetakSpjController@deleteCoverPhoto` (`api.cetak-spj.cover-photo.delete`) — `write`
- `POST /api/cetak-spj/attachments` → `CetakSpjController@storeAttachment` (`api.cetak-spj.attachments.store`) — `write`
- `PATCH /api/cetak-spj/attachments/{attachment}` → `CetakSpjController@updateAttachment` (`api.cetak-spj.attachments.update`) — `write`
- `DELETE /api/cetak-spj/attachments/{attachment}` → `CetakSpjController@destroyAttachment` (`api.cetak-spj.attachments.destroy`) — `write`
- `GET /api/cetak-spj/attachments/{attachment}/stream` → `CetakSpjController@streamAttachment` (`api.cetak-spj.attachments.stream`) — `read`

---

## 4. Layanan Backend (`SpjPrintManifestService`) & Pemetaan Dokumen

### 4.1 Parameter Filter & Penyesuaian Varian
Input ke `GET /api/cetak-spj/manifest`:
- `tahun`: tahun anggaran integer (default: tahun terbaru pada tabel penganggaran varian aktif).
- `periode_type`: `'tahap_1'` | `'tahap_2'` | `'bulan'` | `'rentang_bulan'` | `'tahunan'`.
  - `tahap_1` → bulan `1..6` (`{$tahun}-01-01` s/d `{$tahun}-06-30`)
  - `tahap_2` → bulan `7..12` (`{$tahun}-07-01` s/d `{$tahun}-12-31`)
  - `bulan` → `bulan_awal` (1..12)
  - `rentang_bulan` → `bulan_awal..bulan_akhir`
  - `tahunan` → bulan `1..12` (`{$tahun}-01-01` s/d `{$tahun}-12-31`)
  - Untuk varian `silpa` dan `kinerja_silpa` (yang tidak mengenal pencairan Tahap 1/2), opsi UI default adalah `tahunan`, `bulan`, dan `rentang_bulan` (jika query tetap mengirim `tahap_1`/`tahap_2`, backend tetap memfilter aman berdasarkan rentang bulan Jan–Jun / Jul–Des).
- `paper_size`: `'F4'` (default) | `'A4'` | `'Legal'`.
- `grouping_mode`: `'per_jenis'` (default) | `'per_bulan'`.
- Seluruh query tanggal memakai `whereBetween('tanggal_transaksi', [$start, $end])` agar sargable & 100% kompatibel dengan PostgreSQL produksi dan SQLite `:memory:`.

### 4.2 Pemetaan 20+ Dokumen SIKAS & Strategi Anti-Timeout

| Bab Default | Item Dokumen | Endpoint PDF Sumber | Format / Template Didukung | Strategi Chunking Anti-Timeout |
|---|---|---|---|---|
| **0. Sampul & Struktur** | Cover LPJ Modern, Daftar Isi Otomatis, Pembatas Bab | Dirakit langsung di browser (`pdf-lib` + 300 DPI) | 5 Preset Cover + Hemat Tinta | Instan di client |
| **I. Penganggaran** | RKAS Murni & RKAS Perubahan: Tahapan, Rekap, Lembar Kerja (2.2.1), Bulanan, Rincian, Alur Kas, Rincian Pencairan | `rkas.export-*` & `rkas-perubahan.export-*` | Format Bawaan SIKAS + pilihan Murni / Perubahan | 1 chunk per sub-laporan aktif; default cerdas Tahap 1 → RKAS Murni, Tahap 2/Tahunan → RKAS Perubahan bila tersedia |
| **II. Laporan Pertanggungjawaban** | SP2B, SPTJ, SPMTH, LPH | `laporan.{type}.pdf` / `laporan.{type}.custom.pdf` | Format Bawaan + Template Kustom `.docx` (`spj_templates`) | 1 chunk per record laporan yang cocok periode/tahap/semester |
| **III. Penatausahaan** | BKU, Buku Kas Pembantu Tunai, Buku Pembantu Bank, Buku Pembantu Pajak, Buku ROB, Register Penutupan Kas, Berita Acara Pemeriksaan Kas, Rekapitulasi Realisasi, Rekap Realisasi per Rekening, Daftar BHP, Daftar BHM | `bkp-umum.cetak`, `bkp-pembantu.cetak`, `bkp-bank.cetak`, `bkp-pajak.cetak`, `bkp-rob.cetak`, `bkp-reg.cetak`, `ba.cetak`, `realisasi.cetak`, `rek-realisasi.cetak`, `bhp.cetak`, `bhm.cetak` | Format Bawaan SIKAS (meneruskan `paper_size` / `ukuran_kertas`) | Dipecah **per bulan aktif** dalam periode terpilih; mendukung urutan **Per Jenis Buku** (BKU Jan–Jun, lalu Bank Jan–Jun, dst.) maupun **Per Bulan** (Jan lengkap, lalu Feb lengkap, dst.) |
| **IV. Bukti Transaksi** | Kwitansi, Tanda Terima, BAST, Surat Pesanan | Kwitansi: `kwitansi.download-all[2\|3\|4]` / `kwitansi.custom.download-all`; Tanda Terima: `tanda-terima.download-all` / `tanda-terima.custom.download-all`; BAST: `bast.pdf` / `bast.custom.pdf`; SP: `surat-pesanan.pdf` / `surat-pesanan.custom.pdf` | Kwitansi (4 format bawaan + `kwitansi_templates`); Tanda Terima, BAST, SP (Bawaan + `spj_templates`) | Kwitansi & Tanda Terima dipecah **per bulan** (`start_date..end_date`) agar tiap render DomPDF ringan (<3 detik); BAST & SP ditarik per-record terfilter periode |
| **V. Lampiran Eksternal** | PDF unggahan pengguna (SK Tim BOS, Rekening Koran, NTPN Pajak, dll.) | `api.cetak-spj.attachments.stream` | PDF Asli (v1.4–v1.7) | 1 chunk per file; posisi bebas dipindah ke bab mana pun |

### 4.3 Struktur Payload Manifest
Endpoint `api.cetak-spj.manifest` mengembalikan:
- `meta`: `variant`, `variant_label`, `tahun`, `periode_type`, `periode_label`, `start_date`, `end_date`, `months[]`, `available_years[]`, `has_penganggaran`, `libreoffice_available`.
- `sekolah`: identitas sekolah lengkap + `logo_daerah_data_uri` & `logo_sekolah_data_uri` (base64 aman ≤ 2 MB agar bebas CORS & offline).
- `penanggung_jawab`: Kepala Sekolah, NIP KS, Bendahara, NIP Bendahara, Komite.
- `ringkasan_keuangan`: `pagu_anggaran`, `dana_diterima`, `total_realisasi`, `sisa_dana`, `persentase_serapan`, `jumlah_transaksi` (dipakai otomatis oleh Cover Neo-Bento & QR Code).
- `preset`: konfigurasi tersimpan dari `spj_print_presets` (atau default cerdas bila belum ada).
- `chapters[]`: daftar bab beserta item dokumen; setiap item memuat `key`, `label`, `status` (`ready` | `partial` | `empty`), `count`, `summary_text`, `shortcut_url`, `available_templates[]`, `default_orientation` (`portrait` | `landscape`), dan `chunks[]` (`id`, `label`, `url`, `fallback_url`, `month`, `is_custom_template`).
- `external_attachments[]`: daftar PDF eksternal terunggah beserta URL stream.

---

## 5. Studio Cover LPJ/SPJ Interaktif & Modern, Pembatas Bab & Daftar Isi

### 5.1 5 Preset Layout Cover Modern
Dirender pada kanvas React + SVG (`794px` basis lebar, rasio proporsional `F4 210×330mm` atau `A4 210×297mm`, dikompensasi aman terhadap `html { zoom: 0.8 }` desktop SIKAS) dan diekspor **300 DPI (`pixelRatio: 3`)** ke halaman 1 PDF:

1. **Editorial Modern (`editorial`)** — Strip aksen vertikal di sisi kiri layaknya *annual report* modern, tipografi asimetris tegas, badge tahun & tahap minimalis, dan grid identitas sekolah di bawah.
2. **Instansi Elegan (`instansi_elegan`)** — Gaya formal-modern pemerintahan: bingkai *double-hairline* dengan ornamen sudut halus, logo Daerah & Sekolah simetris di atas, pita label periode, serta blok penanggung jawab resmi.
3. **Geometris Dinamis (`geometris`)** — Latar grafis vektor SVG berlapis (diagonal/polygon + *dot-grid* halus) yang tajam di semua ukuran cetak.
4. **Neo-Bento Eksekutif (`neo_bento`)** — Identitas Neo-Bento SIKAS dengan kartu ringkasan keuangan otomatis (Pagu, Dana Diterima, Realisasi, % Serapan, Jumlah Transaksi) langsung di sampul.
5. **Photo Hero Sekolah (`photo_hero`)** — Panel foto gedung/halaman sekolah di bagian atas (upload opsional, fallback ilustrasi vektor arsitektur sekolah elegan) dengan *gradient overlay* dan kartu identitas mengambang di bawah.

### 5.2 Kontrol Interaktif Live-Preview
- **6 Palet Kurasi + Custom Color Picker:** *Navy Emas*, *Emerald Nusantara*, *Indigo SIKAS*, *Teal Modern*, *Burgundy Klasik*, *Slate Monokrom*, plus pemilih warna *Primary* & *Accent* bebas.
- **Mode Tinta:** Toggle **Full-Color** (arsip digital / cetak kertas tebal) vs **Hemat Tinta** (latar putih bersih dengan aksen garis & tipografi berwarna).
- **Editor Teks Langsung:** Header Instansi, Badge Dokumen, Judul Utama, Subjudul Periode (sinkron otomatis filter, bisa di-override), Label Jilid/Volume opsional, Identitas Sekolah, serta Penandatangan (Kepala Sekolah & Bendahara + NIP).
- **Toggle Elemen Visual:** Logo Daerah, Logo Sekolah, Foto Sekolah (upload JPG/PNG/WebP ≤ 3 MB), Ringkasan Statistik Anggaran, **QR Code Info/Verifikasi Offline** (SVG murni berisi ringkasan NPSN, Nama Sekolah, Varian, Tahun, Periode, Realisasi, & Tanggal Cetak).
- **Aksi Khusus Cover:** **Simpan Preset Cover**, **Reset ke Bawaan**, dan **Unduh Cover Saja (PDF / PNG HD 3×)** untuk pencetakan sampul terpisah pada kertas *buffalo / art paper*.

### 5.3 Halaman Pembatas Bab (*Section Divider*)
- Opsional (toggle On/Off), otomatis disisipkan sebelum setiap Bab aktif yang berisi minimal 1 halaman.
- Mewarisi palet warna, tipografi, gaya aksen, dan *Mode Hemat Tinta* dari Cover aktif; menampilkan Nomor Bab besar, Judul Bab, label periode, dan daftar isi ringkas bab tersebut.

### 5.4 Daftar Isi Otomatis & Opsi Nomor Halaman
- **Penghitungan Nomor Halaman 100% Akurat:** Mesin `pdf-lib` merakit seluruh isi bab terlebih dahulu dan mencatat `pageCount` aktual tiap sub-dokumen, lalu merender halaman **Daftar Isi** dengan struktur Bab → Sub-dokumen → *dotted leader* (`........`) → nomor halaman mulai yang persis, serta total halaman keseluruhan.
- **Stempel Nomor Halaman Footer (`Halaman X dari Y`):** Toggle On/Off (default **Off** agar dokumen resmi seperti Kwitansi/SP2B tetap bersih sesuai format dinas; bila **On**, dicetak sebagai teks vektor tajam oleh `pdf-lib` mulai setelah Cover).

---

## 6. Antarmuka Pengguna & Mesin Perakitan `pdf-lib`

### 6.1 Tata Letak Halaman (`resources/js/Pages/FiturPelengkap/CetakSpj/`)
- **Filter Bar Global:** Switcher 4 Varian BOSP, Tahun Anggaran, Periode (`Tahap 1`, `Tahap 2`, `Per Bulan`, `Rentang Bulan`, `Tahunan`), Ukuran Kertas Default (`F4`, `A4`, `Legal`), dan Toggle Mode Susun (`Per Jenis Dokumen` / `Per Bulan`).
- **Tab 1 — Susun Bendel & Kesiapan SPJ (Default):**
  - Kartu KPI kesiapan (*Siap Cetak*, *Kosong/Belum Dibuat*, *Lampiran Eksternal*).
  - Daftar Bab & Dokumen Neo-Bento: checkbox aktif/nonaktif, tombol geser urutan (*reorder*), status badge kesiapan + tautan pintasan *"Buat di Modul..."* bila kosong, dropdown pemilih **Format / Template** (Bawaan vs Template Kustom `.docx`), dan tombol **Preview/Cetak Satuan**.
  - Panel **Lampiran PDF Eksternal**: unggah PDF (validasi MIME + `%PDF-` + ≤ 25 MB), edit judul & kategori, hapus, dan atur posisi di bendel.
  - Action Bar: **Simpan Konfigurasi** & tombol utama **Rakit & Cetak SPJ**.
- **Tab 2 — Studio Cover & Pembatas Bab:**
  - Layout 2 kolom: panel kontrol di kiri, Live Preview proporsional di kanan dengan switcher pratinjau (*Cover LPJ* · *Pembatas Bab* · *Contoh Daftar Isi*).
- **Modal Progres & Hasil Rakitan Hybrid:**
  - Progres real-time per chunk (`N / M file`), total halaman terkumpul, dan tombol **Batalkan**.
  - Setelah selesai, tampil ringkasan Daftar Isi aktual + statistik jumlah halaman **Portrait vs Landscape** dengan **4 aksi instan (tanpa generate ulang)**:
    1. **Preview / Cetak / Unduh 1 PDF Gabungan Utuh** (`SPJ-{Varian}-{Tahun}-{Periode}-Lengkap.pdf`)
    2. **Cetak / Unduh Paket Portrait saja** (`...-Portrait.pdf`)
    3. **Cetak / Unduh Paket Landscape saja** (`...-Landscape.pdf`)
    4. **Unduh per Bab tertentu**.

### 6.2 Ketahanan Mesin `spjPdfAssembler.ts`
- **Concurrency Terkendali (`max 2` request paralel)** + `AbortController` agar server PHP/Laragon/LibreOffice lokal tetap responsif dan proses dapat dibatalkan seketika.
- **Klasifikasi Orientasi Akurat:** Menghitung orientasi tiap halaman berdasarkan `width`, `height`, dan `page.getRotation().angle` (`90°`/`270°` membalik dimensi efektif).
- **Manajemen Memori:** ArrayBuffer mentah dilepas segera setelah `copyPages()` ke dokumen target.
- **Resilient Error Handling:** Jika 1 chunk gagal (mis. Template Kustom `.docx` mengembalikan `422` karena LibreOffice tidak terpasang, atau PDF eksternal terproteksi kata sandi):
  - Chunk lain yang sudah berhasil tetap dipertahankan.
  - Pengguna diberikan daftar item gagal + pesan error jelas serta 3 aksi pemulihan: **Coba Lagi**, **Fallback ke Format Bawaan SIKAS** (bila gagal di template kustom `.docx`), atau **Lanjut Rakit Tanpa Item Gagal**.

### 6.3 Integrasi Navigasi & Pencarian
- **`resources/js/Components/Sidebar.tsx`:** Tambah `canModule('cetak_spj')` pada `showFiturPelengkap` dan `NavLink` **Cetak SPJ** di grup *Fitur Pelengkap* tepat di bawah *Laporan* / *Poster Transparansi*.
- **`resources/js/Utils/featureSearchCatalog.ts` & `FeatureSearchModal.tsx`:** Daftarkan item `cetak_spj` kategori `Fitur Pelengkap` (kata kunci: `cetak spj`, `lpj`, `cover spj`, `gabung pdf`, `jilid`, `pertahap`, `bendel`).

---

## 7. Struktur Modular & Rencana Pengujian

### 7.1 Pemisahan Modul
- **Backend:**
  - `app/Services/SpjPrintManifestService.php`
  - `app/Http/Controllers/CetakSpjController.php`
  - `app/Models/SpjPrintPreset.php` & `app/Models/SpjExternalAttachment.php`
- **Frontend (`resources/js/Pages/FiturPelengkap/CetakSpj/`):**
  - `Index.tsx`, `types.ts`
  - `services/spjPdfAssembler.ts`
  - `components/CoverStudio/` (`CoverCanvas.tsx`, `SectionDividerCanvas.tsx`, `CoverControlPanel.tsx`, `QrCodeSvg.tsx`, `coverThemes.ts`)
  - `components/BundleChecklist.tsx`, `components/ExternalAttachmentManager.tsx`, `components/AssemblyProgressModal.tsx`

### 7.2 Pengujian & Quality Gates (Saat Implementasi)
1. **PHPUnit Feature Tests (`tests/Feature/CetakSpjTest.php`):**
   - RBAC lintas 4 varian (`bendahara` write, `kepala_sekolah` read-only, role custom `403`, mutasi preset/lampiran oleh `kepala_sekolah` ditolak `403`).
   - Akurasi `SpjPrintManifestService` untuk 5 mode periode (`tahap_1`, `tahap_2`, `bulan`, `rentang_bulan`, `tahunan`), 4 varian (`reguler`, `kinerja`, `silpa`, `kinerja_silpa`), dan 2 mode susun (`per_jenis` vs `per_bulan`).
   - Validasi penyimpanan & pemuatan `spj_print_presets`, upload/hapus foto cover, serta upload/validasi/stream/hapus `spj_external_attachments` (tolak non-PDF, header tidak valid, atau ukuran > 25 MB).
   - Kondisi data kosong (penganggaran/BKU belum ada tetap mengembalikan status `200` dengan `status: 'empty'` aman tanpa error).
2. **Quality Gates:**
   - `vendor/bin/pint`
   - `composer test` (seluruh suite PHPUnit lulus tanpa regresi)
   - `npm run build` (`tsc && vite build`)
   - `/code-review` dua sumbu paralel (**Standards** & **Spec**).

---

## 8. Pengaturan Cetak Per-Item (Kertas, Orientasi, Ukuran Font)

Setiap baris dokumen pada tab **Susun Bendel & Kesiapan SPJ** dilengkapi **tombol Pengaturan (ikon gerigi)** di samping tombol **Satuan** serta badge ringkas konfigurasi aktif (mis. `F4 · Landscape · 10pt`) yang membuka `ItemPrintSettingsModal`:

1. **Parameter yang Diatur per Item:**
   - **Ukuran Kertas:** `A4` (210 × 297 mm), `F4` (210 × 330 mm / Folio), `Legal` (216 × 356 mm), dan `Letter` (216 × 279 mm). Opsi `Letter` juga ditambahkan pada Filter Kertas Global & `SPJ_PAPER_SPECS`.
   - **Orientasi:** `portrait` (Portrait) dan `landscape` (Landscape).
   - **Ukuran Font:** `8pt`, `9pt`, `10pt`, `11pt`, `12pt`.
2. **Aksi di Dalam Modal:**
   - **Reset Default** (kembalikan ke default cerdas item), **Terapkan ke Semua di Bab Ini** (salin ke seluruh item format bawaan pada bab terkait), **Preview PDF** (buka pratinjau satuan langsung memakai setting yang sedang dipilih di modal), dan **Terapkan** (memperbarui preview satuan dan antrean `pdf-lib` secara instan tanpa reload manifest).
   - Pada item yang memilih **Template Kustom Word (`.docx`)** atau **Lampiran PDF Eksternal**, modal menampilkan keterangan ramah bahwa ukuran kertas, orientasi, dan font mengikuti berkas asli (kontrol dinonaktifkan, tombol Preview tetap tersedia).
3. **Persistensi & Penyelarasan Backend:**
   - Override per-item tersimpan pada `bundle_config.item_print_settings` di tabel `spj_print_presets`.
   - `App\Support\PdfPaperHelper` menormalisasi `A4`, `F4`/`Folio` (`[0, 0, 595.28, 935.43]`), `Legal`, `Letter`, `orientation`, dan `font_size` secara seragam di seluruh 20 controller PDF SIKAS (termasuk `SP2B`, `SPTJ`, `SPMTH`, `LPH`, `BAST`, `Surat Pesanan`, dan `Rekap Realisasi per Rekening`) tanpa mengubah default bawaan modul lain.

