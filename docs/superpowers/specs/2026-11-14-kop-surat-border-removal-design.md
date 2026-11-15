# Desain Pemisahan Garis Pembatas Kop Surat ke CSS 100%

Tanggal: 2026-11-15 (Pembaruan dari desain 2026-11-14)

## Latar Belakang
Pada `KopSuratBuilder.tsx`, pengguna dapat memilih gaya garis pembatas kop surat (`double`, `single`, atau `none`). Sebelumnya, builder merender garis pembatas tersebut ke dalam gambar `kop_surat.png` yang disimpan ke profil sekolah, sementara garis pembatas statis di 39 template PDF telah dihapus.

Masalah muncul pada dokumen PDF berorientasi **Landscape** seperti **Tanda Terima** (`.letterhead { width: 60%; }`) dan **Alur Kas** (`height: 120px; width: auto;`): gambar `kop_surat.png` dikecilkan di tengah agar ukuran logo dan teks tetap proporsional, sehingga garis pembatas yang tertanam di dalam PNG ikut terpotong hanya ~60% di tengah dan tidak membentang sampai batas margin kiri–kanan halaman/tabel.

## Keputusan Desain
1. **Pisahkan gambar kop dari garis pembatas**:
   - `KopSuratBuilder.tsx` tetap menampilkan garis pembatas pada **Live Preview**, tetapi mengecualikan elemen garis (`data-kop-border="true"`) via opsi `filter` pada `toBlob()` saat ekspor `kop_surat.png`, serta merapatkan padding bawah `previewRef` (`px-5 pt-5 pb-2 sm:px-7 sm:pt-7 sm:pb-3`).
   - File `kop_surat.png` yang sudah tersimpan di disk dengan `kop_jenis = 'builder'` dipangkas garis bawah lamanya via PHP GD agar perubahan langsung terlihat tanpa wajib menyimpan ulang.
2. **Render garis pembatas via CSS `width: 100%` di template Blade PDF**:
   - Dibuat partial bersama `resources/views/partials/kop_border.blade.php` yang merender garis selebar `100%` (mentok ke batas margin kiri–kanan) berdasarkan `$sekolah->kop_border` (`double`, `single`, atau `none`).
   - Ukuran dan proporsi gambar `kop_surat` di tiap template tetap dipertahankan (60% di Tanda Terima Landscape, `height: 120px` di Alur Kas, 100% di dokumen Portrait).
   - Partial `@include('partials.kop_border', ...)` dipasang tepat di bawah `<img ... kop_surat>` pada **39 file Blade PDF**:
     - **SP2B (4 file)**, **SPTJ (4 file)**, **SPMTH (4 file)** (`resources/views/laporan/`).
     - **Tanda Terima & Download All Tanda Terima (8 file)** (`resources/views/pelengkap/`).
     - **Kwitansi Model 3 & Model 4 (single & all, 16 file)** (`resources/views/pelengkap/`).
     - **Surat Pesanan (1 file)** (`resources/views/pelengkap/surat_pesanan_pdf.blade.php`).
     - **Alur Kas & Alur Kas Perubahan (2 file)** (`resources/views/laporan/alur_kas.blade.php` & `resources/views/alur-kas-perubahan.blade.php`).
3. **Pertahankan blok fallback teks (`@else`) dan template non-kop apa adanya**.

## Verifikasi
- Inspeksi programatik seluruh 39 file memastikan masing-masing memuat `@include('partials.kop_border'` tepat 1 kali dan PNG builder yang tersimpan bersih dari baris piksel garis bawah lama.
- Kompilasi seluruh template Blade (`php artisan view:cache; php artisan view:clear`).
- Build frontend & typecheck TypeScript (`npm run build`).
