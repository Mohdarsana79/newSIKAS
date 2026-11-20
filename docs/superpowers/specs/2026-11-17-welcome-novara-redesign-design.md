# Spesifikasi Desain: Redesign Halaman Welcome SIKAS Bergaya Novara (Teal & Mint Aqua + Anime.js)

**Tanggal:** 2026-11-17  
**Target File Utama:** `resources/js/Pages/Welcome.tsx` & `resources/js/Components/Landing/*`  
**Engine Animasi:** `animejs`  

---

## 1. Tujuan & Konteks

Memperbarui tampilan UI/UX halaman `Welcome.tsx` (Landing Page SIKAS) agar mengadaptasi tata letak, atmosfer visual, dan hierarki tipografi dari referensi desain **Novara Wealth Advisory** (nuansa *Deep Midnight Teal*, *Soft Mint Aqua*, *Frosted Glassmorphism*, pemandangan pegunungan sinematik, dan kontras area bawah *Light Ice/White* dengan dukungan *Dark Mode* adaptif).

Seluruh konten diadaptasi ke dalam domain **SIKAS (Sistem Informasi Kegiatan Anggaran Sekolah — Dana BOSP)** dalam Bahasa Indonesia yang modern, ramah pengguna (*user-friendly*), dan diperkaya dengan koreografi animasi interaktif menggunakan **Anime.js** (`animejs`).

---

## 2. Sistem Desain & Token Visual

### 2.1 Palet Warna
- **Zona Gelap Sinematik (Hero & Kartu Partner Banner):**
  - Latar Utama Hero: `#061820` → `#0A2633` → `#0F3544`
  - Aksen Mint Aqua (Primary Pill CTA, Highlight Teks, Kurva Grafik, Indikator Aktif): `#8CE6DC` (hover: `#A3F2E9`, teks di atas tombol mint: `#062028`)
  - Permukaan Glassmorphism (Kartu Grafik Hero & Mini Cards): `rgba(255, 255, 255, 0.08)` hingga `rgba(255, 255, 255, 0.12)` dengan `backdrop-filter: blur(24px)` dan border `rgba(255, 255, 255, 0.18)`
- **Zona Konten Bawah (Layanan, Testimoni, Statistik, Footer):**
  - **Light Mode (Default):**
    - Latar Halaman: `#F8FBFB` / `#FFFFFF`
    - Permukaan Kartu Layanan & Kartu Testimoni: `#EAF4F4` (hover: `#E0F0F0`)
    - Warna Ikon Duo-Tone: `#14535E` (garis utama) + `#8CE6DC` (isian aksen)
    - Teks Utama: `#09222C`, Teks Sekunder: `#4A6670`
  - **Dark Mode (Adaptif):**
    - Latar Halaman: `#051319`
    - Permukaan Kartu Layanan & Kartu Testimoni: `#0B222C` (border `rgba(140, 230, 220, 0.14)`)
    - Teks Utama: `#F0FAFA`, Teks Sekunder: `#94B8C2`

### 2.2 Tipografi
- **Headline & Angka Metrik:** `Plus Jakarta Sans` (bold/semibold, tracking rapat `-0.03em` untuk kesan finansial modern & bersih seperti referensi Novara).
- **Aksen Kaligrafi Hero (*"Progress with Purpose."*):** Font skrip/serif miring artistik atau SVG kaligrafi custom di bawah kanan kartu Hero.
- **Angka Nominal & Persentase:** `tabular-nums` agar tidak bergeser saat animasi *count-up* Anime.js berjalan.

---

## 3. Aset Visual (`public/images/landing/`)

1. **`hero-mountain.png` / `.webp`**: Ilustrasi sinematik resolusi tinggi berupa puncak pegunungan megah di malam/fajar bernuansa *deep teal* dengan pendar cahaya *aurora mint* di balik puncak gunung.
2. **`partner-lake.png` / `.webp`**: Ilustrasi sinematik siluet penjelajah menghadap danau tenang dan barisan pegunungan saat matahari terbit bernuansa *teal & warm horizon* untuk kartu *"Mitra Andal di Setiap Pelaporan"*.
3. **Ikonografi SVG Custom Duo-Tone**: Ikon vektor khusus dengan kombinasi stroke `#14535E` dan aksen fill `#8CE6DC` untuk ke-5 kartu modul dan 4 metrik statistik.

---

## 4. Arsitektur 5 Section & Komponen

### 4.1 Section 1 — Navbar & Dark Teal Scenic Hero (`Navbar.tsx` & `Hero.tsx`)
- **Navbar (`Navbar.tsx`):**
  - Menyatu secara transparan di bagian atas Hero, dan berubah menjadi *floating frosted glass bar* (`#071E26/85` + `backdrop-blur-xl`) saat halaman di-scroll.
  - **Kiri:** Logo resmi SIKAS (`public/images/landing/large.ico`) + teks **SIKAS** dan sub-label `SISTEM ANGGARAN SEKOLAH`.
  - **Tengah:** Link navigasi `Beranda` (`#top`), `Layanan` (`#layanan`), `Tentang` (`#tentang`), `Statistik` (`#statistik`), `Kontak` (`#kontak`) dengan indikator garis bawah mint pada section aktif.
  - **Kanan:** Tombol pencarian cepat/pintasan modul, `FullscreenSwitcher`, `DarkModeSwitcher`, serta tombol CTA pill mint via `AccountActions` (`Masuk →` / `Ke Dashboard →` / `Mulai Sekarang →`).
- **Hero (`Hero.tsx`):**
  - **Kolom Kiri:**
    - Eyebrow: `TRANSPARAN HARI INI. AKUNTABEL SETIAP SAAT.`
    - Headline 3 baris:
      - `Kelola Anggaran.` (Putih)
      - `Sekolah Lebih` (Mint `#8CE6DC`)
      - `Terarah.` (Mint `#8CE6DC`)
    - Paragraf deskripsi: *"Solusi pengelolaan dana BOSP terpadu untuk membantu sekolah menyusun RKAS, menatausahakan BKU, dan menyajikan laporan yang akurat."*
    - Baris CTA:
      - Primary: Tombol pill mint (`AccountActions` context `hero`).
      - Secondary: Tombol pill kaca gelap dengan ikon Play bulat `▶ Tonton Panduan` yang membuka **Modal Video & Pratinjau Panduan SIKAS**.
    - Baris Trust Badges (3 item dipisahkan garis vertikal tipis):
      1. Ikon Grafik Batang + `Standar Resmi BOSP`
      2. Ikon Perisai Centang + `Pendekatan Akuntabel`
      3. Ikon Kolaborasi Tim + `Kemitraan Jangka Panjang`
  - **Kolom Kanan (Kartu Glassmorphism Grafik Anggaran Interaktif):**
    - Header Kartu:
      - Kiri: Label `Total Pagu Terkelola`, nominal besar beranimasi (mis. `Rp 482.230.000`), indikator hijau mint `↑ 12,4%` `vs. triwulan lalu`.
      - Kanan: Dropdown pill interaktif untuk memilih varian data:
        - `BOSP Reguler (12 Bulan)`
        - `BOSP Kinerja`
        - `SiLPA Reguler`
        - `SiLPA Kinerja`
    - Area Grafik SVG Spline (`Jan` s/d `Des`):
      - Kurva *smooth cubic bezier* dengan area gradasi mint transparan di bawahnya dan titik bercahaya (*glowing node*) di ujung bulan `Des` (serta tooltip saat titik bulan di-hover).
    - 3 Mini Glass Sub-Cards di bagian bawah kartu:
      1. Ikon Tren Naik + `Realisasi Serapan` + nilai dinamis (mis. `+94,2%`)
      2. Ikon Pie Chart + `Alokasi Anggaran` + status dinamis (mis. `Seimbang`)
      3. Ikon Perisai + `Tingkat Risiko Audit` + status dinamis (mis. `Terjaga`)
    - Teks aksen tulisan tangan di bawah kanan kartu: *"Progress with Purpose."*
  - **Transisi Bawah Hero:** Lekukan *wave* SVG halus yang menyambungkan latar gunung gelap ke latar putih/terang di Section 2.

### 4.2 Section 2 — Layanan & Modul ("Panduan Pengelolaan untuk Setiap Tahap Anggaran") (`ModulesSection.tsx`)
- **Header 3 Kolom:**
  - Kiri: Eyebrow `LAYANAN & MODUL` + Judul `Panduan Pengelolaan untuk Setiap Tahap Anggaran.`
  - Tengah: Paragraf penjelasan komprehensif siklus anggaran dari perencanaan pagu hingga pelaporan akhir tahun.
  - Kanan: Tombol pill outline `Lihat Semua Modul →` (membuka ikhtisar seluruh modul / scroll halus).
- **Grid 5 Kartu Modul Vertikal:**
  1. **Perencanaan RKAS**: *Susun dan kembangkan rincian anggaran kegiatan sekolah dengan penuh kepastian.*
  2. **Penatausahaan BKU**: *Rekam transaksi kas tunai dan bank harian untuk masa depan pelaporan yang tertib.*
  3. **Perlindungan Pajak**: *Jaga kepatuhan perhitungan PPN & PPh otomatis tanpa risiko selisih catat.*
  4. **Laporan & Arsip**: *Rencanakan dan cetak laporan PDF & Excel siap tanda tangan untuk setiap periode.*
  5. **Sinkronisasi ARKAS**: *Dukungan integrasi data strategis langsung dengan database aplikasi ARKAS.*
- **Interaktivitas Kartu:** Setiap kartu memiliki tombol bulat `→` di kiri bawah. Saat kartu atau tombol `→` diklik, muncul **Modal Detail Modul** beranimasi Anime.js yang menampilkan daftar fitur utama, manfaat bagi bendahara, dan tombol aksi langsung.

### 4.3 Section 3 — Split Bento Partner Banner & Testimonial Carousel (`WhySection.tsx`)
- **Grid Asimetris (`lg:grid-cols-[1.85fr_1fr]`):**
  - **Kartu Kiri (Scenic Partner Banner):**
    - Berlatar ilustrasi `partner-lake.png` dengan gradasi *deep teal* di sisi kiri agar teks sangat terbaca.
    - Eyebrow: `LEBIH DARI SEKADAR APLIKASI ANGGARAN`
    - Headline: `Mitra Andal di Setiap Langkah.`
    - Deskripsi: *"Kami memahami ritme kerja bendahara sekolah dan menyediakan alur kerja yang jelas, terstruktur, serta mudah digunakan untuk mencapai ketepatan pelaporan."*
    - CTA: Tombol pill mint (`AccountActions` context `cta`).
    - Tipografi puitis di kanan atas gambar: `Rapi` / `Lebih Cepat` / `Lebih Akurat`.
  - **Kartu Kanan (Interactive Testimonial Carousel):**
    - Berlatar `#EAF4F4` (Light) / `#0B222C` (Dark) dengan ikon kutip ganda besar `“`.
    - Menampilkan 3 slide testimoni bendahara & kepala sekolah pengguna SIKAS.
    - Navigasi bawah: Tombol bulat `←`, indikator titik (`• · ·`), dan tombol bulat `→` yang memicu transisi *fade + slide + spring* menggunakan Anime.js.

### 4.4 Section 4 — 4-Column Stats Bar (`StatsSection.tsx`)
- Baris statistik horizontal dengan 4 item yang dipisahkan oleh garis vertikal tipis (`border-l`):
  1. Ikon Pengguna + `1.200+` + `Transaksi BKU Terkelola`
  2. Ikon Bintang + `4.9/5` + `Tingkat Kepuasan Pengguna`
  3. Ikon Grafik Batang + `Rp 750Jt+` + `Kapasitas Pagu per Tahun`
  4. Ikon Perisai Centang + `4 Varian` + `Reguler, Kinerja & SiLPA`

### 4.5 Section 5 — Clean Minimalist Footer (`Footer.tsx`)
- **Baris Utama:**
  - Kiri: Logo resmi SIKAS (`public/images/landing/large.ico`) + **SIKAS** (`SISTEM ANGGARAN SEKOLAH`).
  - Tengah-Kiri: Tautan `Beranda`, `Layanan`, `Tentang`, `Panduan`, `Kontak`.
  - Tengah-Kanan: Tombol ikon sosial persegi membulat (`LinkedIn`, `Instagram`, `YouTube`).
  - Kanan (dengan garis pemisah vertikal): Tagline `TATA KELOLA ANGGARAN LEBIH CERAH BERSAMA.`
- **Baris Hak Cipta:**
  - Kiri: `© 2026 SIKAS. Created by Moh Gian Darsana, S.Pd.,Gr. All rights reserved.`
  - Kanan: Tautan `Privasi`, `Ketentuan`, `Peta Situs`.

---

## 5. Koreografi Animasi Anime.js (`resources/js/lib/anime.ts`)

1. **Hero Entrance Timeline:**
   - Saat halaman dimuat, timeline Anime.js menganimasikan kemunculan *eyebrow*, per-baris judul Hero, deskripsi, tombol CTA, dan 3 *trust badges* dengan efek *spring* lembut (`translateY: [28, 0]`, `opacity: [0, 1]`, `delay: stagger(80)`).
2. **Interactive SVG Chart & Counter Morphing:**
   - Saat pertama kali tampil maupun saat pengguna mengganti varian di dropdown kartu Hero:
     - Angka nominal utama (`Rp ...`) dan persentase di-tween menggunakan Anime.js.
     - Garis kurva SVG (`path`) dianimasikan dengan `strokeDashoffset` + *morphing* atribut `d`, diikuti kemunculan titik bulan (`Jan`–`Des`) secara *stagger*.
3. **Scroll-Triggered Stagger Reveal:**
   - Menggunakan `IntersectionObserver` + Anime.js untuk menganimasikan 5 kartu layanan (`translateY: [36, 0]`, `scale: [0.96, 1]`, `delay: stagger(90)`), kartu Partner + Testimoni, serta angka *count-up* pada 4-Column Stats Bar.
4. **Micro-Interactions & Modal Transitions:**
   - Efek *magnetic/elastic* pada tombol panah `→` dan transisi *backdrop + card spring* pada Modal Video Panduan serta Modal Detail Modul.
5. **Dukungan Penuh `prefers-reduced-motion`:**
   - Bila pengguna mengaktifkan pengaturan *Reduce Motion* pada sistem operasi, seluruh animasi dilewati dan elemen langsung tampil pada kondisi akhir tanpa penundaan.

---

## 6. Pengujian & Kriteria Keberhasilan

1. `npm run build` (`tsc && vite build`) berjalan sukses tanpa *error* TypeScript maupun peringatan *bundle*.
2. `composer test` tetap lulus 100% (memastikan integrasi route & props `Welcome.tsx` yaitu `auth`, `hasUsers`, `laravelVersion`, `phpVersion` tetap kompatibel).
3. Seluruh logika autentikasi di `AccountActions` (`authenticated`, `hasUsers`) berfungsi identik baik untuk tamu baru, pengguna terdaftar, maupun pengguna yang sudah login.
