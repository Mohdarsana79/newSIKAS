# Spesifikasi Teknis: Penyaringan Data yang Dihapus pada RKA Tahapan V.1 RKAS Perubahan

## 1. Konteks & Masalah
Pada modul RKAS Perubahan, pengguna melaporkan bahwa item belanja yang telah dihapus pada RKAS Perubahan masih muncul pada tab **RKA Tahapan V.1**, cetak PDF, dan ekspor Excel dengan nilai Rp 0 / volume 0.

### Analisis Akar Masalah:
1. **Penggabungan Data Murni di Backend**:
   - Pada `RkasPerubahanController.php`, method `summary()`, `exportTahapanV1Pdf()`, dan `exportTahapanV1Excel()` memanggil:
     `$tahapanData = $this->kelolaDataRkas($groupedRkas, $groupedMurni);`
   - Method `kelolaDataRkas` menggabungkan key dari `$rkasMurni` dan me-loop `$itemsMurni`.
   - Jika suatu belanja dihapus di RKAS Perubahan (tidak ada di tabel `rkas_perubahans`), item tersebut tetap masuk ke struktur `$tahapanData` dengan `volume = 0` dan `jumlah = 0` (hanya `volume_murni` dan `jumlah_murni` yang terisi).
   - Struktur ini memang dibutuhkan oleh tab komparasi *"Rka Tahapan"* (Sebelum vs Sesudah), namun pada *"Rka Tahapan V.1"* yang berformat 10 kolom standar, item tersebut tampak sebagai baris kosong/Rp 0.
2. **Tidak Ada Penyaringan di Frontend & Template Blade**:
   - `TabRkaTahapanV1.tsx` dan `rka_tahapan_perubahan_v_1_pdf.blade.php` merender semua item dan header kegiatan di dalam data tanpa menyaring item dengan `jumlah = 0` atau `volume = 0`.

---

## 2. Sasaran Desain
1. **Menghilangkan Item Dihapus**: Belanja yang sudah dihapus di RKAS Perubahan tidak boleh ditampilkan sama sekali pada tab RKA Tahapan V.1, cetak PDF V.1, maupun ekspor Excel V.1.
2. **Menghilangkan Header Kegiatan/Program Kosong**: Jika seluruh rincian belanja dalam suatu sub-kegiatan/kegiatan/program telah dihapus (total Rp 0), header kegiatan/program tersebut otomatis disembunyikan.
3. **Penomoran Urut Dinamis**: Penomoran program (1, 2, ...), sub program (1.1, 1.2, ...), dan uraian program (1.1.1, ...) tetap berurutan rapi tanpa ada indeks yang melompat.
4. **Isolasi Perubahan**: Tab lain yang sudah bekerja dengan baik (seperti tab komparasi *Rka Tahapan*, *Alur Kas*, dan *Rincian Pencairan*) tidak boleh terpengaruh sedikit pun.

---

## 3. Rencana Perubahan Komponen

### A. Backend (`app/Http/Controllers/RkasPerubahanController.php`)
1. **Method `summary()`**:
   - Menghasilkan data khusus V.1 murni dari RKAS Perubahan:
     `$tahapanV1Data = $this->kelolaDataRkas($groupedRkas);` (tanpa menyertakan argumen `$groupedMurni`).
   - Mengirimkan `'tahapanV1Data' => $tahapanV1Data` ke view Inertia.
   - Tetap mempertahankan `$tahapanData` lama dengan `$groupedMurni` untuk tab komparasi dan tab lainnya.
2. **Method `exportTahapanV1Pdf()`**:
   - Mengubah `$tahapanData = $this->kelolaDataRkas($groupedRkas);`
3. **Method `exportTahapanV1Excel()`**:
   - Mengubah `$tahapanData = $this->kelolaDataRkas($groupedRkas);`

### B. Frontend Inertia & React
1. **`resources/js/Pages/Penganggaran/RkasPerubahan/Summary.tsx`**:
   - Menerima prop `tahapanV1Data?: any`.
   - Mengoperkan `tahapanData={tahapanV1Data || tahapanData}` ke `<TabRkaTahapanV1 />`.
2. **`resources/js/Pages/Penganggaran/RkasPerubahan/Partials/TabRkaTahapanV1.tsx`**:
   - Menambahkan filter defensif lapis kedua:
     - Hanya memproses item dengan `item.jumlah > 0 || item.volume > 0`.
     - Hanya menampilkan uraian kegiatan jika memiliki item aktif.
     - Hanya menampilkan sub program jika memiliki uraian aktif.
     - Hanya menampilkan program jika memiliki sub program aktif.
   - Penomoran indeks dinamis (1, 2, 3...) berdasarkan entitas yang benar-benar tampil.

### C. Blade View (`resources/views/laporan/rka_tahapan_perubahan_v_1_pdf.blade.php`)
- Menambahkan penyaringan kondisional:
  - `@if (($program['jumlah'] ?? 0) > 0)`
  - `@if (($subProgram['jumlah'] ?? 0) > 0)`
  - `@if (($uraianProgram['jumlah'] ?? 0) > 0)`
  - `@if (($item['volume'] ?? 0) > 0 || ($item['jumlah'] ?? 0) > 0)`
- Penomoran `$no` bertambah hanya pada baris yang aktif dirender.

---

## 4. Rencana Pengujian
1. Verifikasi PHP syntax dengan `php -l`.
2. Verifikasi code style dengan `vendor/bin/pint`.
3. Verifikasi frontend build dengan `npm run build` (`tsc && vite build`).
4. Verifikasi tab komparasi *Rka Tahapan* tetap menampilkan data murni dan perbandingan sebelum/sesudah tanpa error.
