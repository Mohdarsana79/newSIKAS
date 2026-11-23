# Desain Template Kustom PHPWord (.docx) & Variabel Input Form untuk Laporan (SPMTH, SPTJ, SP2B, LPH)

**Tanggal:** 2026-11-23  
**Status:** Disetujui  
**Ruang Lingkup:** Halaman Laporan & Pertanggungjawaban (`SPMTH`, `SPTJ`, `SP2B`, `LPH`) lintas 4 varian BOSP (`reguler`, `kinerja`, `silpa`, `kinerja_silpa`)

---

## 1. Tujuan

Memperluas sistem template kustom PHPWord (`.docx`) `SpjTemplate` (`spj_templates`) agar pengguna sekolah dan daerah dapat mengunggah format dokumen `.docx` buatan sendiri untuk 4 jenis laporan pertanggungjawaban:
1. **SPMTH** (`spmth`) — Surat Pernyataan Telah Menerima Hibah
2. **SPTJ** (`sptj`) — Surat Pernyataan Tanggung Jawab Mutlak
3. **SP2B** (`sp2b`) — Surat Permintaan Pengesahan Belanja
4. **LPH** (`lph`) — Laporan Penggunaan Hibah

Setiap jenis laporan juga mendukung **tag kustom di luar katalog sistem** (mis. `${kode_sekolah}`, `${nomor_dpa_skpd}`, `${dasar_pengesahan}`, `${nama_ppk}`) yang otomatis muncul sebagai kolom input pada modal Tambah/Edit masing-masing laporan dan tersimpan di kolom JSON `custom_variables`.

---

## 2. Arsitektur Data & Hak Akses

### 2.1 Tipe Dokumen pada `spj_templates`
Menambahkan 4 konstanta baru pada `App\Models\SpjTemplate`:
- `TYPE_SPMTH = 'spmth'`
- `TYPE_SPTJ = 'sptj'`
- `TYPE_SP2B = 'sp2b'`
- `TYPE_LPH = 'lph'`

Template terisolasi per `document_type` dan berlaku lintas 4 varian BOSP.

### 2.2 Kolom `custom_variables` pada 16 Tabel Varian Laporan
Migrasi `2026_11_23_080000_add_custom_variables_to_laporan_tables.php` menambahkan kolom `custom_variables` (`json`, nullable) pada:
- `spmths`, `kinerja_spmths`, `silpa_spmths`, `kinerja_silpa_spmths`
- `sptjs`, `kinerja_sptjs`, `silpa_sptjs`, `kinerja_silpa_sptjs`
- `sp2bs`, `kinerja_sp2bs`, `silpa_sp2bs`, `kinerja_silpa_sp2bs`
- `lphs`, `kinerja_lphs`, `silpa_lphs`, `kinerja_silpa_lphs`

Ke-16 model Eloquent menambahkan cast `'custom_variables' => 'array'` (serta `'custom_variables'` pada `$fillable` untuk model `Sp2b*` dan `Lph*`).

### 2.3 RBAC (`PermissionCatalog`)
Pada `App\Config\PermissionCatalog::resolveRouteRequirement()`:
- `api.spj-templates.*` dengan `type` ∈ `{spmth, sptj, sp2b, lph}` dipetakan ke modul `laporan` (`read` untuk GET/preview/download, `write` untuk POST/DELETE).

---

## 3. Layanan Backend (`SpjTemplateService`) & Routing

### 3.1 Katalog Variabel & Pemetaan Data
- **Umum (semua 4 laporan):** Identitas sekolah (`nama_sekolah`, `npsn`, `alamat_sekolah`, `kelurahan_desa`, `kecamatan`, `kabupaten_kota`, `provinsi`, `status_sekolah`, `jenjang_sekolah`), Penanggung Jawab (`kepala_sekolah`, `nip_kepala_sekolah`, `bendahara`, `nip_bendahara`, `komite`), Anggaran (`tahun_anggaran`, `sumber_dana`, `sumber_dana_upper`), serta Gambar (`kop_surat`, `logo_sekolah`, `logo_daerah`).
- **`spmth`:** `nomor_surat`, `tanggal_spmth`, `tahap`, `tahap_romawi`, `semester_text`, `pagu`, `pagu_rupiah`, `realisasi_lalu`, `realisasi_lalu_rupiah`, `realisasi_ini`, `realisasi_ini_rupiah`, `total_realisasi`, `total_realisasi_rupiah`, `sisa`, `sisa_rupiah`, `terbilang_sisa`.
- **`sptj`:** `nomor_sptj`, `tanggal_sptj`, `tahap`, `tahap_romawi`, `semester_text`, `tahap_satu`, `tahap_satu_rupiah`, `tahap_dua`, `tahap_dua_rupiah`, `jumlah_penerimaan`, `jumlah_penerimaan_rupiah`, `belanja_pegawai`, `belanja_pegawai_rupiah`, `belanja_barang_jasa`, `belanja_barang_jasa_rupiah`, `belanja_operasi`, `belanja_operasi_rupiah`, `belanja_modal`, `belanja_modal_rupiah`, `jumlah_pengeluaran`, `jumlah_pengeluaran_rupiah`, `sisa_kas_tunai`, `sisa_kas_tunai_rupiah`, `sisa_dana_di_bank`, `sisa_dana_di_bank_rupiah`, `total_sisa_dana`, `total_sisa_dana_rupiah`.
- **`sp2b`:** `nomor_sp2b`, `tanggal_sp2b`, `jenis_periode`, `tahap`, `tahap_romawi`, `bulan`, `bulan_nama`, `periode_text`, `saldo_awal`, `saldo_awal_rupiah`, `pendapatan`, `pendapatan_rupiah`, `belanja`, `belanja_rupiah`, `saldo_akhir`, `saldo_akhir_rupiah`, `belanja_pegawai`, `belanja_pegawai_rupiah`, `belanja_barang_jasa`, `belanja_barang_jasa_rupiah`, `belanja_modal`, `belanja_modal_rupiah`, `belanja_modal_peralatan_mesin`, `belanja_modal_peralatan_mesin_rupiah`, `belanja_modal_aset_tetap_lainnya`, `belanja_modal_aset_tetap_lainnya_rupiah`, `belanja_modal_tanah_bangunan`, `belanja_modal_tanah_bangunan_rupiah`.
- **`lph`:** `semester`, `semester_text`, `tanggal_lph`, `penerimaan_anggaran`, `penerimaan_realisasi`, `penerimaan_selisih`, `belanja_operasi_anggaran`, `belanja_operasi_realisasi`, `belanja_operasi_selisih`, `belanja_modal_peralatan_anggaran`, `belanja_modal_peralatan_realisasi`, `belanja_modal_peralatan_selisih`, `belanja_modal_aset_anggaran`, `belanja_modal_aset_realisasi`, `belanja_modal_aset_selisih`, `total_pengeluaran_anggaran`, `total_pengeluaran_realisasi`, `total_pengeluaran_selisih` (masing-masing lengkap dengan varian `_rupiah`), ditambah tabel dinamis opsional rekap per rekening (`item_no`, `item_kode_rekening`, `item_nama_rekening`, `item_uraian`, `item_realisasi`, `item_realisasi_rupiah`).
- **Starter `.docx`:** Tersedia generator contoh `.docx` siap edit untuk `spmth`, `sptj`, `sp2b`, dan `lph`.
- **Variabel Kustom:** Nilai `custom_variables` dari record laporan digabungkan ke `$payload['text']`; tag kustom yang belum diisi otomatis menjadi `''` agar tidak ada teks `${...}` mentah di PDF/Word.

### 3.2 Routing Per Varian (`routes/variant.php`)
- `GET /laporan/{spmth|sptj|sp2b|lph}/{id}/custom/{template}/preview` (`laporan.{type}.custom.preview`)
- `GET /laporan/{spmth|sptj|sp2b|lph}/{id}/custom/{template}/pdf` (`laporan.{type}.custom.pdf`)
- `GET /laporan/{spmth|sptj|sp2b|lph}/{id}/custom/{template}/docx` (`laporan.{type}.custom.docx`)

---

## 4. Antarmuka Pengguna (Frontend)

- Memperluas `SpjDocumentType` di `resources/js/Components/SpjCustomTemplate/types.ts` mencakup `'spmth' | 'sptj' | 'sp2b' | 'lph'` dan memetakan izin pengelolaan ke modul `'laporan'`.
- Membuat komponen reusable `resources/js/Pages/FiturPelengkap/Laporan/components/LaporanCustomVariablesSection.tsx` untuk menampilkan kolom input tag kustom di dalam `LaporanFormModal`.
- Mengintegrasikan `SpjTemplateSelector`, `SpjTemplateModal`, aksi baris kustom (`Preview PDF`, `Unduh PDF`, `DOCX`), dan `LaporanCustomVariablesSection` pada `SpmthTab.tsx`, `SptjTab.tsx`, `Sp2bTab.tsx`, dan `LphTab.tsx`.
- Pada `SpjTemplateModal.tsx`, keempat jenis laporan menampilkan badge biru `{N} tag input form` seperti BAST & Surat Pesanan.
