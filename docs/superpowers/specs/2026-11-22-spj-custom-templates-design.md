# Desain Template Kustom PHPWord (.docx) untuk Tanda Terima, BAST, dan Surat Pesanan

**Tanggal:** 2026-11-22  
**Status:** Disetujui  
**Ruang Lingkup:** Modul SPJ Tanda Terima, BAST, dan Surat Pesanan (lintas 4 varian BOSP: Reguler, Kinerja, SiLPA Reguler, SiLPA Kinerja)

---

## 1. Latar Belakang & Tujuan

Setiap sekolah dan pemerintah daerah sering memiliki format dokumen SPJ (Tanda Terima, Berita Acara Serah Terima Barang / BAST, dan Surat Pesanan) yang berbeda dari format bawaan aplikasi. Fitur ini memperluas mekanisme **Template Kustom PHPWord (`.docx`)** yang sudah berjalan di Kwitansi agar pengguna dapat:
1. Mengunggah format `.docx` buatan sendiri menggunakan Microsoft Word / LibreOffice Writer dengan placeholder `${tag}`.
2. Mengunduh contoh template `.docx` siap edit untuk masing-masing modul.
3. Mencetak / mengunduh dokumen terisi data SIKAS dalam format **Word (`.docx`)** maupun **PDF (`.pdf`)** (via LibreOffice), termasuk **Download All** (gabungan banyak dokumen terfilter dalam 1 file DOCX/PDF) untuk **Tanda Terima**.
4. Menikmati fitur kop surat otomatis (`${kop_surat}` auto-fit margin dalam satuan fisik `pt` + garis pemisah vektor `kop_border`, serta override ukuran opsional seperti `${kop_surat:16cm}`).

---

## 2. Arsitektur Data & Penyimpanan

### 2.1 Tabel `spj_templates`
Satu tabel terpadu untuk tiga modul baru (tabel `kwitansi_templates` tetap utuh agar fitur Kwitansi bebas regresi):

| Kolom | Tipe | Keterangan |
|---|---|---|
| `id` | bigIncrements | Primary key |
| `document_type` | string(32), indexed | `tanda_terima` \| `bast` \| `surat_pesanan` |
| `nama` | string(120) | Nama template |
| `deskripsi` | string(255), nullable | Deskripsi singkat |
| `file_path` | string(255) | Path lokal: `spj_templates/{document_type}/{uuid}.docx` |
| `original_filename` | string(255) | Nama file asli |
| `file_size` | unsignedBigInteger | Ukuran file dalam byte |
| `detected_variables` | json, nullable | `{ recognized, unrecognized, unclosed, item_table_vars, image_vars }` |
| `has_item_table` | boolean | Apakah template memiliki placeholder tabel baris dinamis (`item_*`) |
| `created_by` | foreignId nullable -> `users.id` | Pengguna pengunggah (`nullOnDelete`) |
| `timestamps` | created_at, updated_at | Timestamp standar |

### 2.2 Isolasi & Hak Akses
- Template berlaku **lintas 4 varian BOSP** (unggah 1 kali, bisa dipakai di Reguler, Kinerja, SiLPA Reguler, dan SiLPA Kinerja dengan `${sumber_dana}` dinamis), namun **terisolasi per `document_type`** (template BAST tidak tampil dan mengembalikan 404 bila diakses lewat endpoint Surat Pesanan / Tanda Terima).
- **RBAC:** `bendahara` dan `admin` memiliki akses penuh (unggah, ubah, hapus); `kepala_sekolah` bersifat *read-only* (lihat daftar, lihat katalog variabel, unduh contoh/sumber, serta cetak/unduh dokumen).

---

## 3. Arsitektur Layanan Backend

### 3.1 Mesin OOXML Bersama (`App\Services\SpjDocxTemplateEngine`)
Abstraksi mesin PHPWord & OOXML dari `KwitansiTemplateService` agar Kwitansi, Tanda Terima, BAST, dan Surat Pesanan berbagi 1 kode inti tanpa duplikasi:
- Validasi keamanan arsip `.docx` (tolak `.docm`, tolak `vbaProject.bin`, batas entri ZIP & batas ukuran XML tak terkompresi).
- Pemindaian & klasifikasi tag variabel (`analyzeTemplateVariables`) termasuk dukungan argumen ukuran gambar inline (`${kop_surat:15cm}`, `${logo_sekolah:2.5cm}`, dll.).
- Kompilasi `.docx` generik (`compileDocxFromPayload`): `cloneRow` baris barang dinamis, injeksi gambar satuan fisik `pt` + auto-fit lebar margin/sel tabel/header, penerapan `kop_border` native OOXML (`double` = `thickThinSmallGap`, `single` = `single`, `none`), serta substitusi variabel teks (termasuk normalisasi newline).
- Section-aware bulk `.docx` merge (`mergeCompiledDocxFiles`) untuk Kwitansi & Tanda Terima Download All (menjaga layout kolom TTD, deduplikasi media SHA-1, deduplikasi ID DrawingML/VML/bookmark).
- Konversi `.docx` → `.pdf` via `SkSuratService` (LibreOffice) + helper format Rupiah, angka, volume, terbilang angka/tanggal/tahun Indonesia, hari Indonesia, dan klasifikasi pajak.

### 3.2 `App\Services\KwitansiTemplateService`
Mewarisi `SpjDocxTemplateEngine` dengan mempertahankan 100% API publik, katalog variabel, dan perilaku Kwitansi yang sudah ada.

### 3.3 `App\Services\SpjTemplateService`
Mewarisi `SpjDocxTemplateEngine` dan menangani 3 `document_type`:
1. **`tanda_terima`**:
   - Identitas sekolah, anggaran/kode kegiatan/rekening, uraian, penerima, volume, satuan, harga satuan, jumlah bruto, potongan pajak (`ppn`, `pph`, `pb1`, `potongan_pajak`), jumlah bersih diterima (`jumlah_diterima`, `jumlah_diterima_rupiah`), terbilang bruto & diterima, tanggal transaksi/lunas, Kepala Sekolah, Bendahara, Komite.
   - Tabel baris dinamis: `item_no`, `item_nama`, `item_penerima`, `item_volume`, `item_satuan`, `item_harga`, `item_harga_rupiah`, `item_subtotal`, `item_subtotal_rupiah`, `item_pajak`, `item_pajak_rupiah`, `item_bersih`, `item_bersih_rupiah`.
   - Gambar: `kop_surat`, `logo_sekolah`, `logo_daerah`.
   - Starter `.docx`: orientasi Landscape siap edit dengan kop, metadata, tabel honor/tanda terima, dan blok tanda tangan.
2. **`bast`**:
   - Identitas sekolah, sumber dana, tahun anggaran, nomor bukti BKU, uraian, KS/Bendahara/Komite.
   - Nomor & tanggal BAST: `nomor_bast`, `tanggal_bast`, `hari_bast`, `tanggal_bast_angka`, `tanggal_bast_terbilang`, `bulan_bast`, `tahun_bast`, `tahun_bast_terbilang`, `tanggal_bast_lengkap`.
   - Pihak Pertama (`pihak_pertama_nama`, `pihak_pertama_jabatan`, `pihak_pertama_instansi`, `pihak_pertama_alamat`) & Pihak Kedua (`pihak_kedua_nama`, `pihak_kedua_jabatan`, `pihak_kedua_instansi`, `pihak_kedua_alamat`).
   - Total & terbilang (`jumlah_angka`, `jumlah_rupiah`, `terbilang`, `terbilang_title`).
   - Tabel baris dinamis: `item_no`, `item_nama`, `item_volume`, `item_satuan`, `item_kondisi`, `item_harga`, `item_harga_rupiah`, `item_subtotal`, `item_subtotal_rupiah`.
   - Gambar: `kop_surat`, `logo_sekolah`, `logo_daerah`.
   - Starter `.docx`: format Berita Acara Serah Terima Barang Portrait siap edit.
3. **`surat_pesanan`**:
   - Identitas sekolah, sumber dana, tahun anggaran, nomor bukti BKU, uraian, KS/Bendahara/Komite.
   - Nomor & tanggal SP: `nomor_sp`, `tanggal_sp`, `hari_sp`, `tanggal_sp_terbilang`, `bulan_sp`, `tahun_sp`, `tahun_sp_terbilang`.
   - Pihak Kesatu (`pihak_kesatu_nama`, `pihak_kesatu_nip`, `pihak_kesatu_jabatan`, `pihak_kesatu_instansi`, `pihak_kesatu_alamat`) & Pihak Kedua (`pihak_kedua_nama_perusahaan`, `pihak_kedua_penanggung_jawab`, `pihak_kedua_alamat`, `pihak_kedua_npwp`, `pihak_kedua_platform`).
   - Syarat & ketentuan (`waktu_pengiriman`, `kondisi_barang`, `ketentuan_pembayaran`, `sumber_dana_sp`).
   - Total & terbilang (`jumlah_angka`, `jumlah_rupiah`, `terbilang`, `terbilang_title`).
   - Tabel baris dinamis: `item_no`, `item_nama`, `item_volume`, `item_satuan`, `item_harga`, `item_harga_rupiah`, `item_subtotal`, `item_subtotal_rupiah`.
   - Gambar: `kop_surat`, `logo_sekolah`, `logo_daerah`.
   - Starter `.docx`: format Surat Pesanan Barang/Jasa Portrait siap edit.

---

## 4. Routing & Controller

### 4.1 CRUD Template (`routes/web.php` → `SpjTemplateController`)
- `GET /api/spj-templates/{type}` (`api.spj-templates.index`)
- `GET /api/spj-templates/{type}/sample` (`api.spj-templates.sample`)
- `GET /api/spj-templates/{type}/{template}/download` (`api.spj-templates.download`)
- `POST /api/spj-templates/{type}` (`api.spj-templates.store`) — `role:bendahara,admin`
- `POST /api/spj-templates/{type}/{template}` (`api.spj-templates.update`) — `role:bendahara,admin`
- `DELETE /api/spj-templates/{type}/{template}` (`api.spj-templates.destroy`) — `role:bendahara,admin`

`{type}` dibatasi `whereIn('type', ['tanda_terima', 'bast', 'surat_pesanan'])`.

### 4.2 Ekspor Dokumen Per Varian (`routes/variant.php`)
- **Tanda Terima (`TandaTerimaController`):**
  - `GET /tanda-terima/download-all-custom/{template}` (`tanda-terima.custom.download-all`, query `output=pdf|docx` + filter `tahun`, `start_date`, `end_date`, `search`)
  - `GET /tanda-terima/{id}/custom/{template}/preview` (`tanda-terima.custom.preview`)
  - `GET /tanda-terima/{id}/custom/{template}/pdf` (`tanda-terima.custom.pdf`)
  - `GET /tanda-terima/{id}/custom/{template}/docx` (`tanda-terima.custom.docx`)
- **BAST (`BastController`):**
  - `GET /bast/{id}/custom/{template}/preview` (`bast.custom.preview`)
  - `GET /bast/{id}/custom/{template}/pdf` (`bast.custom.pdf`)
  - `GET /bast/{id}/custom/{template}/docx` (`bast.custom.docx`)
- **Surat Pesanan (`SuratPesananController`):**
  - `GET /surat-pesanan/{id}/custom/{template}/preview` (`surat-pesanan.custom.preview`)
  - `GET /surat-pesanan/{id}/custom/{template}/pdf` (`surat-pesanan.custom.pdf`)
  - `GET /surat-pesanan/{id}/custom/{template}/docx` (`surat-pesanan.custom.docx`)

---

## 5. Antarmuka Pengguna (Frontend)

Komponen reusable di `resources/js/Components/SpjCustomTemplate/`:
- `types.ts`: Tipe bersama `SpjDocumentType`, `SpjCustomTemplate`, `SpjVariableGroup`, `SpjVariableItem`.
- `SpjTemplateSelector.tsx`: Dropdown pilih format (`default` = Format Bawaan SIKAS, atau `custom:{id}` = Template Kustom) + tombol **Kelola Template** + info status LibreOffice.
- `SpjTemplateModal.tsx`: Modal kelola template (Daftar & Unggah/Edit/Hapus khusus Bendahara/Admin, Unduh Contoh `.docx`, tab Katalog Variabel searchable + klik-salin `${tag}`).

Integrasi halaman:
- **Tanda Terima (`TabReguler.tsx`):** Selector + modal di toolbar; saat format kustom aktif, baris tabel menampilkan Preview PDF, Unduh PDF, dan Unduh Word (`.docx`), serta modal **Download All** menampilkan pilihan output PDF / DOCX.
- **BAST (`Bast/Index.tsx`) & Surat Pesanan (`SuratPesanan/Index.tsx`):** Selector + modal di toolbar; saat format kustom aktif, tombol baris memakai Preview PDF, Unduh PDF, dan Unduh Word (`.docx`) dari template terpilih.

---

## 6. Pengujian & Verifikasi

- `tests/Feature/SpjCustomTemplateTest.php`: CRUD & isolasi `document_type`, validasi keamanan `.docx`/macro, RBAC Kepala Sekolah, starter `.docx` untuk 3 modul, kompilasi single Tanda Terima / BAST / Surat Pesanan (termasuk `kop_surat` + `kop_border`, `cloneRow`, tanggal terbilang BAST, syarat ketentuan SP), Download All Tanda Terima + filter, lintas varian Kinerja, dan fallback 422 LibreOffice.
- Regresi penuh `KwitansiCustomTemplateTest`, `KwitansiPdfKopSanitizationTest`, `KopSuratDokumenTest`, `vendor/bin/pint`, dan `npm run build`.

---

## 7. Variabel Input Form Manual (Tag di Luar Katalog Sistem) pada BAST & Surat Pesanan

Apabila pengguna menuliskan tag `${nama_tag}` di dalam template Word (`.docx`) **BAST** atau **Surat Pesanan** yang tidak terdapat pada katalog variabel sistem (`detected_variables.unrecognized`), sistem memperlakukan tag tersebut sebagai **variabel isian form manual**:

1. **Penyimpanan Database (`custom_variables`):**
   - Kolom `custom_variables` (`json`, nullable) ditambahkan ke 8 tabel varian:
     - `basts`, `kinerja_basts`, `silpa_basts`, `kinerja_silpa_basts`
     - `surat_pesanans`, `kinerja_surat_pesanans`, `silpa_surat_pesanans`, `kinerja_silpa_surat_pesanans`
   - Seluruh 8 model Eloquent memiliki cast `'custom_variables' => 'array'`.
2. **Backend (`BastController`, `SuratPesananController`, `SpjTemplateService`):**
   - `store()` dan `update()` pada `BastController` & `SuratPesananController` menerima `custom_variables` (`nullable|array`), menormalisasi setiap nilai menjadi string, dan menyimpannya ke database.
   - `search()` mengembalikan `custom_variables` (`array<string, string>`) pada setiap item BAST dan Surat Pesanan agar form Edit menampilkan nilai yang sudah tersimpan.
   - `SpjTemplateService::buildBastVariables()` dan `buildSuratPesananVariables()` menggabungkan `custom_variables` ke dalam `$payload['text']` (variabel katalog sistem tetap diutamakan untuk key sistem, sedangkan key kustom diisi dari `custom_variables`).
   - Pada `compileSingleDocx()`, setiap tag di `template->detected_variables['unrecognized']` yang belum diisi oleh pengguna pada dokumen tersebut otomatis diberi default string kosong `''` di `$payload['text']` agar tidak ada placeholder mentah `${...}` yang tercetak di hasil Word/PDF.
3. **Frontend (`ModalFormBast.tsx`, `ModalFormSuratPesanan.tsx`, `SpjTemplateModal.tsx`):**
   - `ModalFormBast` dan `ModalFormSuratPesanan` menerima `customTemplates` dan `activeCustomTemplate`:
     - Jika di toolbar sedang memilih template kustom tertentu, form menampilkan input untuk seluruh tag di `activeCustomTemplate.detected_variables.unrecognized`.
     - Jika di toolbar sedang memilih *Format Standar (Bawaan)*, form menggabungkan seluruh tag kustom unik dari semua template kustom BAST / Surat Pesanan yang tersedia (lengkap dengan informasi nama template yang memakai tag tersebut).
   - Pada `ModalFormBast`, ditampilkan seksi **"Variabel Tambahan (Template Kustom)"**.
   - Pada `ModalFormSuratPesanan`, ditampilkan tab/seksi **"Variabel Kustom"** ketika terdapat minimal 1 tag kustom.
   - Pada `SpjTemplateModal` (untuk `bast` dan `surat_pesanan`), tag di luar katalog sistem ditampilkan dengan badge biru **`{N} tag input form`** dan keterangan bahwa tag tersebut dapat diisi melalui form Tambah/Edit dokumen.
