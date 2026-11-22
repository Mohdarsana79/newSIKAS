# Spesifikasi Desain: Template Kwitansi Kustom Berbasis PHPWord

**Tanggal:** 2026-11-22
**Status:** Disetujui untuk review spesifikasi
**Lingkup:** Modul Manajemen Kwitansi (lintas 4 varian BOSP: `reguler`, `kinerja`, `silpa`, `kinerja_silpa`)

---

## 1. Latar Belakang & Tujuan

Saat ini halaman Manajemen Kwitansi hanya menyediakan 4 format tetap berbasis Blade + DomPDF (`Format 1` s.d. `Format 4`). Di lapangan, tiap dinas pendidikan daerah atau sekolah sering memiliki format kwitansi tersendiri (susunan kolom, kop surat, ukuran kertas, penempatan tanda tangan, atau tampilan rincian pajak yang berbeda).

Fitur ini memungkinkan pengguna:
1. Membuat format kwitansi sendiri di Microsoft Word (`.docx`) memakai placeholder `${variabel}`, baris tabel rincian barang dinamis (`cloneRow`), dan placeholder gambar kop/logo (`setImageValue`).
2. Mengunggah dan mengelola template `.docx` langsung dari halaman Manajemen Kwitansi (disimpan global untuk seluruh 4 varian BOSP).
3. Memilih template kustom berdampingan dengan `Format 1`–`4` untuk:
   - **Generate satuan:** Preview PDF di modal (via LibreOffice), Cetak PDF, dan Unduh DOCX mentah.
   - **Download All (cetak massal sesuai filter aktif):** 1 file `.docx` gabungan multi-halaman (otomatis dipisah *page break* tanpa perlu tag pembungkus khusus) dan opsi 1 file `.pdf` gabungan (1× konversi LibreOffice).

---

## 2. Keputusan Arsitektur

1. **Dedicated Service & Controller:** Membuat `KwitansiTemplate` (model), `KwitansiTemplateService`, dan `KwitansiTemplateController` agar tidak mempergemuk `KwitansiController` (1.668 baris) maupun `SkSuratService` (799 baris).
2. **Reuse Infrastruktur Existing:** Memanfaatkan `phpoffice/phpword` yang sudah terpasang di `composer.json` serta method teruji dari `App\Services\SkSuratService`:
   - `extractVariableReport(string $docxPath)` — pemindaian tag `${...}` berbasis `DOMXPath` per paragraf untuk menangani pemecahan run XML `<w:r>` oleh Word sekaligus mendeteksi tag yang belum ditutup.
   - `createNormalizedTemplateIfNeeded(string $docxPath)` — normalisasi sementara tag tak tertutup sebelum diproses `TemplateProcessor`.
   - `resolveLibreOfficePath()` & `convertDocxToPdf(string $docxPath)` — konversi DOCX → PDF headless dengan *warm profile* dan sinkronisasi Windows CloudFonts.
3. **Global Template lintas 4 Varian:** Template disimpan sekali pada tabel global `kwitansi_templates` (bukan ×4 per varian). Nilai variabel seperti `${sumber_dana}` dan `${tahun_anggaran}` diisi dinamis mengikuti varian aktif (`app('variant')`).
4. **Otorisasi Otomatis:** Semua route menggunakan prefix nama `api.kwitansi.templates.*` dan `kwitansi.custom.*` sehingga otomatis tercakup oleh `PermissionCatalog::resolveRouteRequirement()` modul `kwitansi` (GET = `read`, POST/PUT/DELETE = `write`).

---

## 3. Skema Database & Penyimpanan File

### Tabel `kwitansi_templates`
| Kolom | Tipe | Keterangan |
| :--- | :--- | :--- |
| `id` | `bigIncrements` | Primary key |
| `nama` | `string(120)` | Nama tampilan template di dropdown & modal |
| `deskripsi` | `string(255)` nullable | Catatan singkat format (mis. "Format Dinas Kab. X") |
| `file_path` | `string(255)` | Path relatif disk `local` (`kwitansi_templates/{uuid}.docx`) |
| `original_filename` | `string(255)` | Nama file asli saat diunggah |
| `file_size` | `unsignedBigInteger` | Ukuran file dalam byte |
| `detected_variables` | `json` nullable | Laporan tag: `{"recognized": [...], "unrecognized": [...], "unclosed": [...], "item_table_vars": [...], "image_vars": [...]}` |
| `has_item_table` | `boolean` default `false` | `true` jika template memakai minimal 1 variabel tabel rincian `item_*` |
| `created_by` | `foreignId` nullable (`users.id`, `nullOnDelete`) | Pengunggah |
| `timestamps` | `created_at`, `updated_at` | Standar Eloquent |

### Validasi Keamanan Upload `.docx`
- Ekstensi wajib `.docx` (tolak `.doc`, `.docm`, `.dotm`, dll.), ukuran maksimal 10 MB (`max:10240`).
- Verifikasi arsip ZIP valid memakai `ZipArchive` dan wajib memuat entry `word/document.xml`.
- Pemindaian XML memakai `LIBXML_NONET` (proteksi XXE) via `SkSuratService`.
- Nama file di storage selalu menggunakan `Str::uuid().'.docx'` agar bebas *path traversal*.

---

## 4. Katalog Variabel & Aturan Binding (`KwitansiTemplateService`)

### 4.1 Variabel Teks (`TemplateProcessor::setValue`)

| Grup | Placeholder | Sumber Data & Format |
| :--- | :--- | :--- |
| **Sekolah** | `${nama_sekolah}` | `sekolah->nama_sekolah` (fallback `'-'`) |
| | `${npsn}` | `sekolah->npsn` |
| | `${alamat_sekolah}` | `sekolah->alamat` |
| | `${kelurahan_desa}` | `sekolah->kelurahan_desa` |
| | `${kecamatan}` | `sekolah->kecamatan` |
| | `${kabupaten_kota}` | `sekolah->kabupaten_kota` |
| | `${provinsi}` | `sekolah->provinsi` |
| | `${status_sekolah}` | `sekolah->status_sekolah` |
| | `${jenjang_sekolah}` | `sekolah->jenjang_sekolah` |
| **Anggaran & Kode** | `${tahun_anggaran}` | `penganggaran->tahun_anggaran` |
| | `${sumber_dana}` | `VariantConfig::title($variant)` (mis. `BOSP Reguler`) |
| | `${tahap}` | `THP-I` (bulan 1–6) atau `THP-II` (bulan 7–12) |
| | `${kode_kegiatan}` | `kodeKegiatan->kode` (mis. `06.05.01`) |
| | `${kode_program}` | Segmen 1 kode kegiatan (mis. `06`) |
| | `${program}` | `kodeKegiatan->program` |
| | `${kode_sub_program}` | Segmen 1–2 kode kegiatan (mis. `06.05`) |
| | `${sub_program}` | `kodeKegiatan->sub_program` |
| | `${uraian_kegiatan}` | `kodeKegiatan->uraian` |
| | `${kode_rekening}` | `rekeningBelanja->kode_rekening` |
| | `${rincian_objek}` | `rekeningBelanja->rincian_objek` |
| | `${no_bukti}` | `bukuKasUmum->id_transaksi` (fallback `'KW-'.$kwitansi->id`) |
| **Transaksi & Nominal** | `${uraian}` | `bukuKasUmum->uraian_opsional ?: bukuKasUmum->uraian` |
| | `${uraian_bku}` | `bukuKasUmum->uraian` |
| | `${jumlah_angka}` | `number_format($totalAmount, 0, ',', '.')` |
| | `${jumlah_rupiah}` | `'Rp ' . number_format($totalAmount, 0, ',', '.')` |
| | `${terbilang}` | Teks terbilang Indonesia (mis. `Satu juta lima ratus ribu rupiah`) |
| | `${terbilang_title}` | `ucwords(strtolower($terbilang))` |
| | `${tanggal_transaksi}` | Format Indonesia `d F Y` (mis. `15 Maret 2026`) |
| | `${tanggal_lunas}` | `'Lunas Bayar, ' . $tanggalTransaksi` |
| | `${bulan_transaksi}` | Nama bulan Indonesia (mis. `Maret`) |
| **Pajak** | `${ppn}` | `'Rp ' . number_format($ppn, 0, ',', '.')` |
| | `${ppn_angka}` | `number_format($ppn, 0, ',', '.')` |
| | `${pph}` | `'Rp ' . number_format($pph, 0, ',', '.')` |
| | `${pph_angka}` | `number_format($pph, 0, ',', '.')` |
| | `${pb1}` | `'Rp ' . number_format($pb1, 0, ',', '.')` |
| | `${pb1_angka}` | `number_format($pb1, 0, ',', '.')` |
| | `${total_pajak}` | `'Rp ' . number_format($ppn + $pph + $pb1, 0, ',', '.')` |
| | `${total_pajak_angka}` | `number_format($ppn + $pph + $pb1, 0, ',', '.')` |
| | `${jumlah_bersih}` | `number_format(max(0, $totalAmount - $totalPajak), 0, ',', '.')` |
| | `${jumlah_bersih_rupiah}` | `'Rp ' . number_format(max(0, $totalAmount - $totalPajak), 0, ',', '.')` |
| **Penanggung Jawab** | `${kepala_sekolah}` | `penganggaran->kepala_sekolah` |
| | `${nip_kepala_sekolah}` | `penganggaran->nip_kepala_sekolah` |
| | `${bendahara}` | `penganggaran->bendahara` |
| | `${nip_bendahara}` | `penganggaran->nip_bendahara` |
| | `${komite}` | `penganggaran->komite` |
| | `${penerima}` | `bukuKasUmum->penerima` (fallback `'.....................................'`) |

### 4.2 Variabel Tabel Rincian Barang Dinamis (`cloneRow`)
Jika template mengandung minimal 1 variabel berikut di dalam baris tabel Word:
- `${item_no}`, `${item_nama}`, `${item_volume}`, `${item_satuan}`, `${item_harga}`, `${item_harga_rupiah}`, `${item_subtotal}`, `${item_subtotal_rupiah}`

Aturan:
1. Cari variabel `item_*` pertama yang muncul di template sebagai *anchor* untuk `TemplateProcessor::cloneRow($anchor, count($rows))`.
2. Jika `bukuKasUmum->uraianDetails` tidak kosong, petakan tiap item:
   - `item_no` = urutan `1..N`
   - `item_nama` = `$detail->uraian`
   - `item_volume` = format angka bersih (tanpa `.00` bila bulat)
   - `item_satuan` = `$detail->satuan ?? '-'`
   - `item_harga` / `item_harga_rupiah` = `$detail->harga_satuan`
   - `item_subtotal` / `item_subtotal_rupiah` = `$detail->subtotal ?? $detail->jumlah ?? ($detail->volume * $detail->harga_satuan)`
3. Jika `uraianDetails` kosong, buat 1 baris fallback berisi uraian utama kwitansi, volume `1`, satuan `'-'`, harga = `$totalAmount`, subtotal = `$totalAmount`.
4. Jika `cloneRow` melempar exception (mis. pengguna menaruh `${item_nama}` di luar tabel Word), fallback aman mengisi nilai baris pertama via `setValue` agar proses generate tidak gagal.

### 4.3 Placeholder Gambar (`setImageValue`)
- `${kop_surat}` → file dari `sekolah->kop_surat` (`width: 600`, `ratio: true`)
- `${logo_sekolah}` → file dari `sekolah->logo_sekolah` (`width: 68`, `ratio: true`)
- `${logo_daerah}` → file dari `sekolah->logo_daerah` (`width: 68`, `ratio: true`)

Pencarian file mengikuti pola `doc_kop_surat.blade.php` (`storage_path('app/public/'.$clean)` lalu `public_path('storage/'.$clean)`). Jika file tidak ditemukan atau bukan gambar valid, placeholder diisi string kosong `''` lewat `setValue` sehingga tidak menyisakan teks mentah `${...}`.

### 4.4 Penggabungan Massal (Download All Multipage `.docx` & `.pdf`)
Untuk `N` kwitansi terfilter:
1. Kompilasi tiap kwitansi menjadi file `.docx` temporer tersendiri.
2. Jika `N === 1`, langsung gunakan file tersebut.
3. Jika `N > 1`, gabungkan menjadi 1 file `.docx` multipage:
   - Salin file kompilasi kwitansi ke-1 sebagai arsip basis (mempertahankan `styles.xml`, `numbering.xml`, `header*.xml`, `footer*.xml`, `fontTable.xml`, `word/media/*`, dan `<w:sectPr>` ukuran kertas/margin milik pengguna).
   - Untuk kwitansi ke-2 s.d. ke-`N`:
     - Salin file media baru (jika ada) beserta relasi `word/_rels/document.xml.rels` dengan pemetaan ulang `rId` yang unik, serta pastikan `[Content_Types].xml` memuat ekstensi media tersebut.
     - Sisipkan node *page break* (`<w:p><w:r><w:br w:type="page"/></w:r></w:p>`) diikuti seluruh anak elemen `<w:body>` selain `<w:sectPr>` tepat sebelum `<w:sectPr>` pada dokumen basis.
4. Jika parameter `output=pdf`, panggil `SkSuratService::convertDocxToPdf()` **satu kali** atas `.docx` gabungan tersebut.
5. Semua file temporer dibersihkan pada blok `finally` / `deleteFileAfterSend(true)`.

### 4.5 Generator Contoh Template Starter (`.docx`)
`KwitansiTemplateService::generateSampleDocx()` membuat file `.docx` bersih memakai `PhpOffice\PhpWord\PhpWord` berisi:
- Placeholder `${kop_surat}` di bagian atas.
- Tabel metadata anggaran (`${sumber_dana}`, `${tahun_anggaran}`, `${no_bukti}`, `${kode_kegiatan}`, `${kode_rekening}`).
- Blok penerima & nominal (`${nama_sekolah}`, `${terbilang_title}`, `${uraian}`, `${jumlah_rupiah}`).
- Tabel rincian barang dengan baris `cloneRow` (`${item_no}`, `${item_nama}`, `${item_volume}`, `${item_satuan}`, `${item_harga_rupiah}`, `${item_subtotal_rupiah}`).
- Ringkasan pajak (`${ppn}`, `${pph}`, `${pb1}`) dan blok tanda tangan 3 kolom (`${kepala_sekolah}`, `${bendahara}`, `${penerima}`, `${tanggal_lunas}`).

---

## 5. Rancangan Route & API

### Global (`routes/web.php`, dalam middleware `auth`)
| Method | URI | Route Name | Fungsi |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/kwitansi/templates` | `api.kwitansi.templates.index` | Daftar template, katalog variabel, & status `libreoffice_available` |
| `GET` | `/api/kwitansi/templates/sample` | `api.kwitansi.templates.sample` | Unduh contoh `.docx` starter |
| `POST` | `/api/kwitansi/templates` | `api.kwitansi.templates.store` | Upload template `.docx` baru |
| `POST` | `/api/kwitansi/templates/{template}` | `api.kwitansi.templates.update` | Ubah nama/deskripsi/ganti file `.docx` (pakai `POST` multipart agar aman untuk file upload) |
| `DELETE` | `/api/kwitansi/templates/{template}` | `api.kwitansi.templates.destroy` | Hapus template & file fisik |
| `GET` | `/api/kwitansi/templates/{template}/download` | `api.kwitansi.templates.download` | Unduh file `.docx` sumber asli |

### Per-Varian (`routes/variant.php`, ditempatkan sebelum `Route::resource('kwitansi', ...)`)
| Method | URI | Route Name | Fungsi |
| :--- | :--- | :--- | :--- |
| `GET` | `/kwitansi/download-all-custom/{template}` | `kwitansi.custom.download-all` | Cetak massal filter aktif (`?output=docx\|pdf&search=&tahun=&start_date=&end_date=`) |
| `GET` | `/kwitansi/{id}/custom/{template}/preview` | `kwitansi.custom.preview` | Stream PDF inline (via LibreOffice) untuk `PdfPreviewModal` |
| `GET` | `/kwitansi/{id}/custom/{template}/pdf` | `kwitansi.custom.pdf` | Unduh/stream PDF satuan (via LibreOffice) |
| `GET` | `/kwitansi/{id}/custom/{template}/docx` | `kwitansi.custom.docx` | Unduh DOCX satuan langsung |

---

## 6. Rancangan Antarmuka (React + TypeScript)

1. **Komponen Baru: `KwitansiTemplateModal.tsx`** (`resources/js/Pages/FiturPelengkap/Kwitansi/components/KwitansiTemplateModal.tsx`)
   - Dibuka lewat tombol **"Template Kustom"** di toolbar [TabReguler.tsx](file:///c:/laragon/www/newSIKAS2/newSIKAS/resources/js/Pages/FiturPelengkap/Kwitansi/TabReguler.tsx).
   - Memiliki 2 tab internal:
     - **Tab "Daftar & Upload":** form unggah/edit template (nama, deskripsi, input file `.docx` + validasi ukuran/ekstensi), dan daftar template dengan badge status variabel (jumlah tag dikenali, badge tabel `cloneRow`, peringatan jika ada tag tidak dikenal/typo), serta aksi **Unduh Asli**, **Edit**, dan **Hapus**.
     - **Tab "Panduan Variabel":** tombol **Unduh Contoh `.docx`**, daftar variabel dikelompokkan per kategori (Sekolah, Anggaran & Kode, Transaksi & Nominal, Pajak, Penanggung Jawab, Tabel Rincian Barang, Gambar/Logo) dengan tombol **Salin** sekali klik per tag.
   - Menampilkan peringatan halus bila LibreOffice belum terdeteksi (DOCX tetap bisa dipakai, PDF/Preview dinonaktifkan dengan penjelasan).

2. **Pembaruan [KwitansiSelect.tsx](file:///c:/laragon/www/newSIKAS2/newSIKAS/resources/js/Pages/FiturPelengkap/Kwitansi/components/KwitansiSelect.tsx)**
   - Tipe `KwitansiFormat` menjadi `1 | 2 | 3 | 4 | \`custom:${number}\``.
   - `KwitansiRowActions` menerima prop `customTemplates`, `libreOfficeAvailable`, dan `onDownloadDocx`.
   - Dropdown memuat `Format 1`–`4` diikuti template kustom yang tersedia.
   - Saat memilih template kustom:
     - Klik **PDF** → langsung membuka tab endpoint `kwitansi.custom.pdf` (melewati `PrintSettingsModal`, karena ukuran kertas/font mengikuti pengaturan di file Word).
     - Klik **View** → membuka `PdfPreviewModal` ke endpoint `kwitansi.custom.preview`.
     - Muncul tombol tambahan **DOCX** untuk unduh `.docx` satuan secara instan.

3. **Pembaruan Modal "Download All" di [TabReguler.tsx](file:///c:/laragon/www/newSIKAS2/newSIKAS/resources/js/Pages/FiturPelengkap/Kwitansi/TabReguler.tsx)**
   - Di bawah grid 4 kartu Format bawaan, tampilkan bagian **"Format Kustom (Word)"** (jika ada minimal 1 template).
   - Tiap kartu template kustom menampilkan nama, ringkasan, dan 2 tombol aksi: **DOCX Gabungan** dan **PDF Gabungan** (disabled + tooltip bila LibreOffice tidak tersedia).
   - Pengaturan kertas/font di atas modal diberi keterangan bahwa pengaturan tersebut berlaku untuk Format 1–4 bawaan (Format Kustom mengikuti ukuran kertas di file Word).

---

## 7. Penanganan Error & Edge Cases

- **Template `.docx` rusak / terhapus di disk:** kembalikan respons 404/422 JSON atau pesan error jelas agar UI tidak crash.
- **LibreOffice tidak tersedia:** `api.kwitansi.templates.index` mengembalikan `libreoffice_available: boolean`. Di backend, endpoint PDF tetap mengembalikan HTTP 422/503 dengan pesan ramah jika dipanggil langsung.
- **Pencarian/filter Download All kosong:** kembalikan pesan error yang konsisten dengan perilaku `downloadAll` bawaan.
- **Batas keamanan Download All:** atur `memory_limit` (`512M`) dan `max_execution_time` (`300`) konsisten dengan `downloadAll3`/`downloadAll4`.
- **Kompatibilitas 4 varian:** `KwitansiController` selalu menggunakan `$this->Kwitansi` dan `VariantConfig::penganggaranFk($this->variant)` + `VariantConfig::title($this->variant)`.

---

## 8. Rencana Pengujian (PHPUnit + Build)

File test baru: `tests/Feature/KwitansiCustomTemplateTest.php` (dijalankan dengan `composer test`):
1. **CRUD & Validasi Keamanan Upload:**
   - Upload `.docx` valid menyimpan record, file fisik, dan laporan variabel (`recognized`, `unrecognized`, `has_item_table`).
   - Tolak file non-`.docx` (mis. `.txt` / `.docm`) atau ZIP palsu tanpa `word/document.xml`.
   - Update metadata & ganti file `.docx` menghapus file lama.
   - Delete template menghapus record & file fisik.
2. **Download Contoh Starter `.docx`:**
   - Endpoint `api.kwitansi.templates.sample` mengembalikan `.docx` valid berisi `word/document.xml` dengan placeholder standar.
3. **Generate Satuan `.docx` (Teks + `cloneRow` + Gambar):**
   - Verifikasi nilai teks (`nama_sekolah`, `sumber_dana`, `no_bukti`, `jumlah_rupiah`, `terbilang`, `ppn`, `kepala_sekolah`, `bendahara`, `penerima`) benar-benar tergantikan di `word/document.xml` hasil kompilasi.
   - Verifikasi tabel rincian barang (`cloneRow`) menggandakan baris sesuai jumlah `uraianDetails` dan fallback 1 baris bila `uraianDetails` kosong.
   - Verifikasi placeholder gambar (`logo_sekolah`) tergantikan bila file ada, dan bersih (`''`) bila file tidak ada.
4. **Download All Multipage `.docx`:**
   - Verifikasi penggabungan ≥2 kwitansi menghasilkan 1 `.docx` valid yang memuat konten kedua kwitansi beserta `<w:br w:type="page"/>`.
   - Verifikasi filter `search` / `tahun` / rentang tanggal membatasi kwitansi yang masuk ke file gabungan.
5. **Varian & Otorisasi:**
   - Verifikasi generate satuan bekerja pada varian `kinerja` (dengan `${sumber_dana}` = `BOSP Kinerja`).
   - Verifikasi user tanpa izin `write` modul `kwitansi` (mis. `kepala_sekolah`) tidak dapat upload/hapus template (403), tetapi tetap dapat melihat daftar & mengunduh kwitansi (200).
6. **Frontend Typecheck & Build:** `npm run build` (`tsc && vite build`) lulus tanpa error.
