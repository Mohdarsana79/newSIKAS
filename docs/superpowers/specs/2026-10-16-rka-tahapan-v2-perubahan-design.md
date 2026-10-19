# Desain Teknis: Penambahan Tab & Ekspor RKA Tahapan V.2 pada RKAS Perubahan

**Tanggal:** 16 Oktober 2026  
**Status:** Menunggu Review & Persetujuan Pengguna  
**Modul:** Penganggaran > RKAS Perubahan (`newSIKAS`)

---

## 1. Latar Belakang & Kebutuhan Fitur

Pada modul RKAS Perubahan, pengguna saat ini memiliki:
1. **Tab `Rka Tahapan`**: Format komparasi 14 kolom (Sebelum Perubahan vs Sesudah Perubahan, Selisih Bertambah/Berkurang, dan Pembagian Tahap 1 & 2).
2. **Tab `Rka Tahapan V.1`**: Format 10 kolom standar (No, Kode Rekening, Kode Program, Uraian, Volume Total, Satuan, Tarif Harga, Jumlah, Tahap 1, Tahap 2).

Pengguna membutuhkan penambahan **Tab `Rka Tahapan V.2`** dengan tampilan dan rincian tabel yang mengacu pada `resources/js/Pages/Penganggaran/Rkas/Partials/TabRkaTahapanV1.tsx` (modul RKAS Murni) serta template cetak `resources/views/laporan/rka_tahapan_v_1_pdf.blade.php`.

Karakteristik utama format V.2 adalah **pemecahan rincian volume per tahap**:
- **Volume Total** ($volTotal = volT1 + volT2$)
- **Tahap T1** (Volume alokasi bulan Januari - Juni)
- **Tahap T2** (Volume alokasi bulan Juli - Desember)
- **Satuan**
- **Tarif Harga**
- **Jumlah Total** ($Jumlah = Volume \times Tarif$)
- **Tahap 1 (Rp)** (Nominal alokasi Tahap 1)
- **Tahap 2 (Rp)** (Nominal alokasi Tahap 2)

---

## 2. Analisis Masalah, Penyebab, & Solusi

### 2.1. Masalah
1. Tab Rka Tahapan V.2 belum tersedia pada halaman Summary RKAS Perubahan (`Summary.tsx`).
2. Rute cetak PDF dan ekspor Excel untuk Tahapan V.2 Perubahan belum terdaftar di `routes/variant.php`.
3. Template cetak PDF/Excel untuk Tahapan V.2 Perubahan belum tersedia di `resources/views/laporan/`.
4. Perlu mekanisme filter agar item belanja yang sudah dihapus (volume 0 atau jumlah 0) dan sub-program/program kosong tidak muncul di tampilan maupun dokumen cetak V.2 (konsisten dengan V.1).

### 2.2. Penyebab
Modul RKAS Perubahan sebelumnya hanya memprioritaskan format komparasi awal-perubahan. Ketika format tahapan tunggal diadopsi, baru format V.1 yang diimplementasikan. Format V.2 dengan perincian volume per tahap (T1 & T2) belum di-porting ke RKAS Perubahan.

### 2.3. Solusi
1. **Membuat Komponen UI Baru**: `resources/js/Pages/Penganggaran/RkasPerubahan/Partials/TabRkaTahapanV2.tsx` dengan struktur 12 kolom tabel (termasuk Volume, T1, T2, Satuan, Tarif, Jumlah, Tahap 1, Tahap 2), judul header `"KERTAS KERJA RKAS PERUBAHAN PER TAHAP V.2"`, dan tombol "Pengaturan Cetak".
2. **Integrasi ke `Summary.tsx`**:
   - Menambahkan tab `{ name: 'Rka Tahapan V.2', label: 'Rka Tahapan V.2' }` pada urutan ketiga (setelah `Rka Tahapan V.1`).
   - Mendaftarkan target cetak `'tahapan_v2'` pada modal cetak PDF & Excel.
   - Menggunakan data `tahapanV1Data` yang sudah di-pass oleh controller (sudah memuat perincian bulanan untuk perhitungan T1 dan T2).
3. **Membuat Template Cetak Blade**: `resources/views/laporan/rka_tahapan_perubahan_v_2_pdf.blade.php` dengan judul header `"KERTAS KERJA RKAS PERUBAHAN PER TAHAP V.2"`, struktur tabel 12 kolom, serta dukungan cetak PDF (DomPDF) dan Ekspor Excel (`application/vnd.ms-excel`).
4. **Menambahkan Handler di Controller**:
   - `exportTahapanV2Pdf(Request $request, $id)` di `RkasPerubahanController.php`.
   - `exportTahapanV2Excel(Request $request, $id)` di `RkasPerubahanController.php`.
5. **Mendaftarkan Rute di `routes/variant.php`**:
   - `GET /rkas-perubahan/{id}/export-tahapan-v2-pdf` (`rkas-perubahan.export-tahapan-v2-pdf`)
   - `GET /rkas-perubahan/{id}/export-tahapan-v2-excel` (`rkas-perubahan.export-tahapan-v2-excel`)

---

## 3. Rincian Teknis Implementasi

### 3.1. Struktur Kolom Tabel Rka Tahapan V.2

Tabel memiliki struktur header 3 tingkat sebagai berikut:
```text
+-----+---------------+--------------+--------+------------------------------------+--------+-------------+
| No. | Kode Rekening | Kode Program | Uraian |        Rincian Perhitungan         | Jumlah |    Tahap    |
|     |               |              |        +--------+-------------+------+------+        +------+------+
|     |               |              |        | Volume |    Tahap    | Sat. |Tarif |        |  1   |  2   |
|     |               |              |        |        +------+------+      |      |        |      |      |
|     |               |              |        |        |  T1  |  T2  |      |      |        |      |      |
+-----+---------------+--------------+--------+--------+------+------+------+------+--------+------+------+
```

### 3.2. Formula Perhitungan Data Per Item
Untuk setiap item belanja pada `urProgram.items`:
- $monthsT1 = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni']$
- $monthsT2 = ['Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']$
- $volT1 = \sum_{m \in monthsT1} item.bulanan[m].volume$
- $volT2 = \sum_{m \in monthsT2} item.bulanan[m].volume$
- $volTotal = volT1 + volT2$
- $jumlah = item.jumlah$
- $tahap1 = item.tahap1$
- $tahap2 = item.tahap2$

### 3.3. Logika Filter Item Dihapus & Kosong
Item belanja yang tidak memiliki volume ($volume \le 0$) atau tidak memiliki nominal belanja ($jumlah \le 0$) akan difilter keluar. Demikian juga sub-program atau program yang seluruh itemnya 0 atau kosong akan difilter agar tidak meninggalkan baris header kosong:
```typescript
const activeItems = (urProgram.items || []).filter(
    (item: any) => (item.volume ?? 0) > 0 || (item.jumlah ?? 0) > 0
);
```

### 3.4. Footer Tabel & Tanda Tangan
- **Jumlah Total**: Menampilkan total belanja keseluruhan, total nominal Tahap 1, dan total nominal Tahap 2.
- **Tanda Tangan**:
  - Kiri: Komite Sekolah
  - Tengah: Kepala Sekolah (Mengetahui) dengan NIP
  - Kanan: Bendahara dengan NIP, bertanggal sesuai `anggaran.tanggal_perubahan`.

---

## 4. Keamanan & Kompatibilitas Kode

1. **Non-Destructive**: Tidak mengubah kode yang sudah berjalan pada Tab `Rka Tahapan`, `Rka Tahapan V.1`, `Rka Bulanan`, dll.
2. **Multi-Variant Ready**: Controller menggunakan `VariantConfig::getModelClass()` dan `VariantConfig::penganggaranFk()`, serta rute terdaftar di `routes/variant.php` sehingga otomatis mendukung seluruh varian BOSP (`reguler`, `kinerja`, `silpa`, `kinerja_silpa`).
3. **Linter & Type-Safety**: Memenuhi standar TypeScript `tsc` tanpa error dan format PHP `vendor/bin/pint`.
