# Desain Skala Tampilan 80% Otomatis untuk Desktop, Laptop, & Notebook

**Tanggal:** 2026-11-18
**Status:** Disetujui pengguna

## Latar Belakang & Masalah

Pada peninjauan kode sebelumnya, penyesuaian `html { font-size: 14px }` pada rentang `1024px–1440px` hanya mengecilkan utilitas Tailwind berbasis `rem` menjadi `87.5%` dan kembali ke `16px` (`100%`) di `1441px+` (termasuk laptop `1920×1080` dengan Windows *Display Scaling* `125%` yang terbaca `1536px`). Sementara itu, sebagian besar komponen SIKAS menggunakan nilai `px` tetap (`text-[24px]`, `rounded-[26px]`, `w-[260px]`, grafik `ApexCharts`) yang tidak terpengaruh `rem`. Pengguna menginginkan tampilan otomatis setara **zoom browser 80%** pada PC, laptop, dan notebook, sementara layar HP/Android & tablet tetap `100%` responsif.

## Keputusan Desain (Hasil Wawancara)

1. **Perangkat Target:** Hanya layar Desktop, Laptop, & Notebook (`>= 1024px`) menggunakan skala `80%`; HP/Android & tablet (`< 1024px`) tetap pada skala `100%` responsif.
2. **Cakupan Halaman:** Berlaku seragam untuk seluruh halaman aplikasi (`AuthenticatedLayout`), halaman Landing (`Welcome`), dan halaman Auth/Login (`GuestLayout`).
3. **Default Sidebar (`>= 1024px`):** Terbuka penuh secara default saat halaman pertama dimuat (hanya auto-collapse di `< 1024px`), dan tetap dapat diciutkan manual lewat tombol panah sidebar.
4. **Kontrol UI:** Otomatis diterapkan melalui CSS tanpa tombol pengaturan skala tambahan agar antarmuka tetap bersih.

## Arsitektur Teknis

### 1. Skala Root CSS `zoom: 0.8` & Kompensasi Viewport (`resources/css/app.css`)
- Baseline `< 1024px` dipertahankan `html { font-size: 15px; }` (tanpa `zoom`).
- Pada `@media (min-width: 1024px)`:
  - `html { font-size: 16px; zoom: 0.8; }` agar seluruh elemen berbasis `px`, `rem`, ikon SVG, `ApexCharts`, modal, dan portal (`react-select`, `SweetAlert2`, Headless UI) mengecil seragam `0.8x` persis seperti *browser zoom* `80%`.
  - Kompensasi utilitas tinggi penuh layar: `.min-h-screen { min-height: 125vh; }`, `.h-screen { height: 125vh; }` pada `>= 1024px` agar halaman pendek (seperti Login dan latar belakang kanvas) menutup `100%` tinggi jendela (`125vh × 0.8 = 100vh` visual).
- Pada `@media print`:
  - `html { font-size: 16px !important; zoom: 1 !important; }` serta `.min-h-screen { min-height: auto !important; }` / `.h-screen { height: auto !important; }` agar hasil cetak tidak ikut mengecil.

### 2. App Shell Desktop/Laptop (`AuthenticatedLayout.tsx`, `Sidebar.tsx`, `Navbar.tsx`)
- **`AuthenticatedLayout.tsx`:**
  - Ubah ambang auto-collapse saat mount dari `window.innerWidth < 1280` menjadi `window.innerWidth < 1024`.
  - Gunakan padding konten `lg:pl-[276px]` saat terbuka (`lg:pl-[98px]` saat diciutkan) agar selaras dengan lebar sidebar `260px` (yang tampil `208px` visual pada zoom `80%`).
- **`Sidebar.tsx`:**
  - Gunakan lebar penuh `w-[260px]` secara konsisten di `>= 1024px` saat terbuka (`lg:w-[82px]` saat diciutkan) dan radius `rounded-[26px] lg:rounded-[30px]` sehingga teks menu dan kartu koneksi ARKAS tidak terpotong di laptop.
- **`Navbar.tsx`:**
  - Tampilkan nama dan peran pengguna di kanan avatar mulai breakpoint `lg:block` (sebelumnya `xl:block`) sehingga konsisten dengan tampilan laptop zoom `80%`.

### 3. Halaman Fitur (`Dashboard.tsx` & lainnya)
- Grid `lg:grid-cols-4` dan `lg:grid-cols-12` pada `Dashboard.tsx` tetap dipertahankan karena Tailwind `@media` mengevaluasi lebar layar sebelum skala `zoom`, sehingga 4 kartu KPI, grafik `Realisasi Bulanan`, dan `Kalender Keuangan` tampil sejajar sejak `1024px+`.
- Tinggi grafik `ApexCharts` pada `Dashboard.tsx` disetel ke `290` (bulanan) dan `250` (tahunan) yang pada skala `0.8x` setara tinggi visual `232px` dan `200px`.

## Verifikasi
- Jalankan `npm run build` (`tsc && vite build`) untuk memastikan tidak ada error TypeScript maupun Vite build.
- Pastikan `public/hot` tidak ada agar aset terkompilasi dimuat saat diakses via LAN/`ngrok`/`.exe`.
- Uji visual di browser (viewport laptop `1366×768` / `1280×720`, mobile `390×844`, serta halaman Login/Landing) jika memungkinkan.
