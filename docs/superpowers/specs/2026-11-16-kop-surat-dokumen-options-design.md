# Design Spec: Pilihan Penggunaan Kop Surat pada Dokumen RKAS & Penatausahaan BKU

- **Author:** Antigravity Agent & User
- **Date:** 2026-11-16
- **Status:** Proposed (Ready for Review & Approval)
- **Domain:** Data Master (Profil Sekolah) / Penganggaran (RKAS Murni & Perubahan) / Penatausahaan (BKU Rekapitulasi)

---

## 1. Latar Belakang & Tujuan
Saat ini, kop surat sekolah yang dibuat atau diunggah di `KopSuratBuilder.tsx` (`Profil Sekolah`) otomatis diterapkan secara global ke dokumen PDF tertentu, namun belum dapat dipilih secara granular oleh sekolah per jenis dokumen. Sekolah membutuhkan fleksibilitas untuk menentukan dokumen mana saja yang wajib menggunakan kop surat resmi dan dokumen mana yang menggunakan format standar tanpa kop surat.

Pilihan ini mencakup:
1. **RKAS Awal (8 Dokumen)**: Alur Kas, Lembar Kerja 2.2.1, Rincian Belanja, Rincian Pencairan, RKA Bulanan, RKA Rekap, RKA Tahapan, RKA Tahapan V1.
2. **RKAS Perubahan (8 Dokumen)**: Alur Kas Perubahan, Lembar Kerja 2.2.1 Perubahan, Rincian Belanja Perubahan, RKA Bulanan Perubahan, RKA Rekap Perubahan, RKA Tahapan Perubahan, RKA Tahapan V1 Perubahan, RKA Tahapan V2 Perubahan.
3. **Dokumen BKU Penatausahaan (11 Sub-Dokumen di `Rekapitulasi.tsx`)**: BKP Bank, BKP Tunai/Pembantu, BKU Umum, BKP Pajak, Rincian Objek Belanja (ROB), BKP Reguler, Berita Acara Rekonsiliasi (BA), Laporan Realisasi Anggaran, Rekap Realisasi Belanja, Buku Persediaan (BHP), Buku Barang Milik Daerah (BHM).

Penerapan ini berlaku secara konsisten pada:
- **Tampilan Pratinjau Layar** (lembar kertas dokumen pada tab React).
- **Hasil Cetak / Unduhan File PDF** (template Blade DomPDF).

---

## 2. Arsitektur & Skema Basis Data

### 2.1 Migrasi Tabel `sekolahs`
Menambahkan kolom `kop_dokumen` berformat `jsonb` (nullable) pada tabel `sekolahs`:
```php
Schema::table('sekolahs', function (Blueprint $table) {
    $table->jsonb('kop_dokumen')->nullable()->after('kop_border');
});
```

Format isi JSON `kop_dokumen`:
```json
{
  "rkas_alur_kas": true,
  "rkas_lembar_kerja_221": false,
  "rkas_rincian": true,
  ...
  "bku_bkp_bank": true,
  "bku_bkp_umum": false
}
```
*Aturan status bawaan (default):* Bila kunci dokumen bernilai `false` atau tidak ditemukan dalam JSON, dokumen dianggap **tidak menggunakan kop surat**.

### 2.2 Model `SekolahProfile`
- Menambahkan `'kop_dokumen'` ke dalam properti `$fillable`.
- Menambahkan casting `'kop_dokumen' => 'array'` pada `$casts`.
- Menambahkan helper method pemeriksaan status:
```php
public function hasKopForDoc(string $docKey): bool
{
    if (empty($this->kop_surat)) {
        return false;
    }
    $docs = $this->kop_dokumen;
    return is_array($docs) && !empty($docs[$docKey]);
}
```

---

## 3. Kamus Kunci Dokumen (27 Dokumen)

### A. RKAS Awal / Murni (8 Dokumen)
| No | Doc Key | Nama Dokumen | File React Tab | Template Blade PDF Terkait |
|:---|:---|:---|:---|:---|
| 1 | `rkas_alur_kas` | Alur Kas | `Rkas/Partials/TabAlurKas.tsx` | `laporan/alur_kas.blade.php` |
| 2 | `rkas_lembar_kerja_221` | Lembar Kerja 2.2.1 | `Rkas/Partials/TabLembarKerja221.tsx` | `rka_lembar_kerja_pdf.blade.php` |
| 3 | `rkas_rincian` | Rincian Belanja | `Rkas/Partials/TabRincian.tsx` | `laporan/rincian_pdf.blade.php` |
| 4 | `rkas_rincian_pencairan` | Rincian Pencairan | `Rkas/Partials/TabRincianPencairan.tsx` | `laporan/rp_pdf.blade.php` |
| 5 | `rkas_rka_bulanan` | RKA Bulanan | `Rkas/Partials/TabRkaBulanan.tsx` | `laporan/bulanan_pdf.blade.php` |
| 6 | `rkas_rka_rekap` | RKA Rekapitulasi | `Rkas/Partials/TabRkaRekap.tsx` | `laporan/rekap_pdf.blade.php` |
| 7 | `rkas_rka_tahapan` | RKA Tahapan | `Rkas/Partials/TabRkaTahapan.tsx` | `laporan/tahapan_pdf.blade.php` |
| 8 | `rkas_rka_tahapan_v1` | RKA Tahapan V1 | `Rkas/Partials/TabRkaTahapanV1.tsx` | `laporan/tahapan_v1_pdf.blade.php` |

### B. RKAS Perubahan (8 Dokumen)
| No | Doc Key | Nama Dokumen | File React Tab | Template Blade PDF Terkait |
|:---|:---|:---|:---|:---|
| 9 | `rkas_perubahan_alur_kas` | Alur Kas Perubahan | `RkasPerubahan/Partials/TabAlurKas.tsx` | `alur-kas-perubahan.blade.php` |
| 10 | `rkas_perubahan_lembar_kerja_221` | Lembar Kerja 2.2.1 Perubahan | `RkasPerubahan/Partials/TabLembarKerja221.tsx` | `rka_lembar_kerja_pdf.blade.php` |
| 11 | `rkas_perubahan_rincian` | Rincian Belanja Perubahan | `RkasPerubahan/Partials/TabRincianPerubahan.tsx` | `laporan/rincian_perubahan_pdf.blade.php` |
| 12 | `rkas_perubahan_rka_bulanan` | RKA Bulanan Perubahan | `RkasPerubahan/Partials/TabRkaBulanan.tsx` | `laporan/bulanan_pdf.blade.php` |
| 13 | `rkas_perubahan_rka_rekap` | RKA Rekapitulasi Perubahan | `RkasPerubahan/Partials/TabRkaRekap.tsx` | `laporan/rekap_pdf.blade.php` |
| 14 | `rkas_perubahan_rka_tahapan` | RKA Tahapan Perubahan | `RkasPerubahan/Partials/TabRkaTahapan.tsx` | `laporan/tahapan_pdf.blade.php` |
| 15 | `rkas_perubahan_rka_tahapan_v1` | RKA Tahapan V1 Perubahan | `RkasPerubahan/Partials/TabRkaTahapanV1.tsx` | `laporan/tahapan_v1_pdf.blade.php` |
| 16 | `rkas_perubahan_rka_tahapan_v2` | RKA Tahapan V2 Perubahan | `RkasPerubahan/Partials/TabRkaTahapanV2.tsx` | `laporan/tahapan_v2_pdf.blade.php` |

### C. Penatausahaan BKU (`Rekapitulasi.tsx`) (11 Dokumen)
| No | Doc Key | Nama Dokumen | Sub-Tab di Rekapitulasi | Template Blade PDF Terkait |
|:---|:---|:---|:---|:---|
| 17 | `bku_bkp_bank` | Buku Kas Pembantu Bank | `bkp_bank` | `laporan/bkp_bank_pdf.blade.php` |
| 18 | `bku_bkp_pembantu` | Buku Kas Pembantu (Tunai) | `bkp_pembantu` | `laporan/bkp_pembantu_pdf.blade.php` |
| 19 | `bku_bkp_umum` | Buku Kas Umum (BKU) | `bkp_umum` | `laporan/bkp_umum_pdf.blade.php` |
| 20 | `bku_bkp_pajak` | Buku Pembantu Pajak | `bkp_pajak` | `laporan/bkp_pajak_pdf.blade.php` |
| 21 | `bku_rob` | Rincian Objek Belanja (ROB) | `rob` | `laporan/rob_pdf.blade.php` |
| 22 | `bku_reg` | Buku Pembantu Kas Reguler | `reg` | `laporan/reg_pdf.blade.php` |
| 23 | `bku_ba` | Berita Acara Rekonsiliasi Kas | `ba` | `laporan/ba_pdf.blade.php` |
| 24 | `bku_realisasi` | Laporan Realisasi Anggaran | `realisasi` | `laporan/realisasi_pdf.blade.php` |
| 25 | `bku_rek_realisasi` | Rekap Realisasi Belanja | `rek_realisasi` | `laporan/rek_realisasi_pdf.blade.php` |
| 26 | `bku_bhp` | Buku Pembantu Persediaan (BHP) | `bhp` | `laporan/bhp_pdf.blade.php` |
| 27 | `bku_bhm` | Buku Pembantu Barang Milik Daerah (BHM) | `bhm` | `laporan/bhm_pdf.blade.php` |

---

## 4. Alur Integrasi & Komponen Frontend

### 4.1 Shared Data via `HandleInertiaRequests`
Menambahkan key `'sekolah'` pada `HandleInertiaRequests::share()`:
```php
'sekolah' => fn () => ($s = SekolahProfile::first()) ? [
    'id' => $s->id,
    'nama_sekolah' => $s->nama_sekolah,
    'npsn' => $s->npsn,
    'kop_surat' => $s->kop_surat,
    'kop_border' => $s->kop_border,
    'kop_dokumen' => $s->kop_dokumen ?? [],
] : null,
```
Hal ini memungkinkan seluruh halaman React Inertia mengakses status kop surat secara reaktif tanpa perlu inject manual di setiap controller.

### 4.2 Komponen Reusable `<DocKopSuratHeader />`
Dibuat di `resources/js/Components/DocKopSuratHeader.tsx`:
- Menerima prop `docKey: string` dan opsi override `sekolah?: any`.
- Membaca `sekolah` dari `usePage().props.sekolah`.
- Memvalidasi: Jika `sekolah?.kop_surat` terisi DAN `sekolah?.kop_dokumen?.[docKey] === true`:
  - Merender gambar Kop Surat (`/storage/${sekolah.kop_surat}`).
  - Merender garis pembatas kop sesuai `sekolah.kop_border` (`double`, `single`, atau `none`).
  - Berikan styling print-ready yang rapi dan serasi dengan tampilan kertas laporan.
- Jika tidak aktif, komponen merender `null` (tidak menampilkan apa pun, lembar tetap rapi dengan header teks standar).

### 4.3 Bento Card Pengaturan di `KopSuratBuilder.tsx`
Menambahkan seksi **"BAGIAN 5: PENERAPAN KOP SURAT PADA DOKUMEN"** di bawah Editor TipTap:
- 3 kartu bento:
  1. **RKAS Awal (8 Dokumen)**
  2. **RKAS Perubahan (8 Dokumen)**
  3. **Penatausahaan BKU (11 Dokumen)**
- Setiap kartu memiliki:
  - Header dengan icon kategori dan badge counter dokumen aktif (misal `3 / 8 Aktif`).
  - Tombol aksi cepat: *"Pilih Semua"* dan *"Batal Semua"*.
  - Daftar checkbox kustom bergaya Neo-Bento dengan feedback visual instan saat di-klik.
- Tombol Simpan Terpadu:
  - *"Simpan Pengaturan Dokumen"*: Mengirim request `POST /sekolah-profile/{id}/kop-dokumen` untuk update instan tanpa harus render ulang canvas resolusi tinggi.
  - Form builder utama *"Simpan Kop Surat"*: Otomatis menyertakan `kop_dokumen` ke dalam `FormData` builder kop surat.

---

## 5. Rencana Pengujian & Verifikasi
1. **Migrasi Database**: `php artisan migrate` berjalan tanpa error dan menambahkan kolom `kop_dokumen` ke tabel `sekolahs`.
2. **Pengujian Penyimpanan**:
   - Simpan pilihan centang melalui tombol mandiri *"Simpan Pengaturan Dokumen"*.
   - Simpan pilihan centang bersamaan dengan tombol utama *"Simpan Kop Surat"*.
3. **Pengujian Tampilan di Layar (React Tabs)**:
   - Centang salah satu dokumen (misal `TabAlurKas`). Buka tab Alur Kas di RKAS Awal -> Kop surat tampil di atas judul tabel.
   - Hapus centang pada dokumen tersebut -> Kop surat hilang dari tampilan tab Alur Kas dan hanya judul teks standar yang tampil.
   - Buka tab di `Rekapitulasi.tsx` (misal BKP Bank) -> Kop surat tampil sesuai pengaturan centang.
4. **Pengujian Hasil Cetak PDF (DomPDF)**:
   - Export PDF untuk dokumen yang dicentang -> Kop surat tercetak di halaman pertama.
   - Export PDF untuk dokumen yang tidak dicentang -> Tidak ada kop surat tercetak di halaman pertama.
5. **Code Review & Standards**:
   - `composer test` & `php artisan test` sukses tanpa regresi.
   - `./vendor/bin/pint` format rapi.
   - `npm run build` sukses tanpa error tipe TypeScript.
   - Eksekusi review 2-axis: Standards & Spec.

---

Dokumen spesifikasi ini siap untuk disetujui. Apakah spesifikasi teknis di atas sudah sesuai dan dapat kita lanjutkan ke tahap pembuatan implementasi?
