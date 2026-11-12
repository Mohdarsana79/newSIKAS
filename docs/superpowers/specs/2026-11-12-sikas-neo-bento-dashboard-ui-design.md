# SIKAS UI Redesign — Neo-Bento Executive Dashboard & App Shell

- Tanggal: 2026-11-12
- Status: **Draft Disetujui Pengguna**
- File Utama:
  - `resources/js/Layouts/AuthenticatedLayout.tsx`
  - `resources/js/Components/Sidebar.tsx`
  - `resources/js/Components/Navbar.tsx`
  - `resources/js/Pages/Dashboard.tsx`
  - `resources/js/Components/StatCard.tsx`
  - `resources/js/Components/Bento/BentoCard.tsx` (baru)
  - `resources/js/Components/Bento/CalendarWidget.tsx` (baru)
  - `resources/js/Components/Bento/ArkasQuickSyncCard.tsx` (baru)
- Referensi Visual: `media_1794456044817_de8e76f9.jpg` (Eduplex Dashboard UI)
- Identitas Visual: SIKAS Neo-Bento (Dark Charcoal Sidebar, Royal Violet `#7C5CFF` & Gold `#E8C87D` Accent, Off-White Bento Canvas)

---

## 1. Tujuan

Membangun ulang antarmuka visual (UI) sistem aplikasi SIKAS secara menyeluruh mengadopsi estetika **Neo-Bento** modern berkelas seperti pada referensi Eduplex:
1. **App Shell Terpadu**: Sidebar gelap kontras tinggi dengan navigasi berbentuk pill membulat, header/navbar bersih dengan sapaan hangat, dan kanvas kerja lapang.
2. **Dashboard Bento Grid**: Restrukturisasi metrik keuangan, grafik realisasi bulanan, pemanfaatan SNP, status sinkronisasi ARKAS, dan jadwal transaksi ke dalam susunan bento card membulat (*rounded-3xl* / 28px).
3. **High-Motion & Interaktif**: Menerapkan fisika kursor (3D tilt), animasi angka berjalan (*count-up*), tombol magnetik/ripple, dan *stagger reveal*, dengan kepatuhan penuh terhadap *prefers-reduced-motion*.
4. **Unified Bento Surface System**: Menyediakan pembungkus kontainer dan styling tabel/tab modern untuk seluruh modul internal (RKAS, BKU, Laporan, dll.) agar serasi tanpa mengubah satu pun alur data atau logika bisnis.
5. **Nol Regresi Fungsional**: Menjaga 100% integritas logika controller, route, middleware, model Eloquent, hook `useVariantRoute`, dan kalkulasi angka.

---

## 2. Batasan (Non-Goals)

- **Tidak mengubah** alur backend PHP, controller, route, model, migration, ataupun file blade.
- **Tidak mengubah** hook varian anggaran (`reguler`, `kinerja`, `silpa`, `kinerja_silpa`) dan parameter query API dashboard (`/dashboard/data`).
- **Tidak mengubah** rumus kalkulasi pagu, realisasi, persentase, saldo kas tunai, dan saldo bank.
- **Tidak menambah** dependency NPM pihak ketiga baru yang berat. Memanfaatkan pustaka yang sudah terpasang: Tailwind 3, ApexCharts, Lucide React, Headless UI, dan primitives animasi lokal (`TiltCard`, `MagneticButton`, `useCountUp`, `useReducedMotion`).
- **Tidak merusak** fungsi responsive mobile (sidebar drawer tetap berfungsi normal di layar kecil).

---

## 3. Sistem Visual (SIKAS Neo-Bento)

### 3.1 Palet Warna & Token

Menggabungkan kontras gelap Eduplex dengan identitas warna ungu royal dan emas khas SIKAS:

| Token | Nilai Light Mode | Nilai Dark Mode | Penggunaan |
| :--- | :--- | :--- | :--- |
| **Sidebar Background** | `#0D0F17` | `#07080D` | Latar sidebar tetap gelap di kedua mode untuk kontras tajam |
| **Active Nav Pill** | `#7C5CFF` (Royal Violet) | `#7C5CFF` (Glow ungu lembut) | Latar menu navigasi aktif, teks putih murni |
| **Active Accent Tag** | `#E8C87D` (Gold SIKAS) | `#E8C87D` | Dot penanda, badge status penting, highlight angka |
| **App Canvas** | `#F6F8FC` (Soft Ice / Off-White) | `#0B0A12` (Ink Deep) | Latar belakang area konten utama |
| **Bento Card Surface** | `#FFFFFF` | `#151324` | Permukaan kartu bento dengan border halus |
| **Card Border** | `rgba(226, 232, 240, 0.8)` | `rgba(255, 255, 255, 0.08)` | Garis tepi presisi kartu |
| **Text Primary** | `#0F172A` (Slate 900) | `#F8FAFC` (Slate 50) | Judul kartu, angka metrik utama |
| **Text Secondary** | `#64748B` (Slate 500) | `#94A3B8` (Slate 400) | Label pembantu, subtitle, tanggal |
| **Pastel Emerald** | `#ECFDF5` / Text `#059669` | `rgba(16, 185, 129, 0.15)` | Badge lunas, realisasi positif, kas |
| **Pastel Violet** | `#F5F3FF` / Text `#6D28D9` | `rgba(124, 92, 255, 0.15)` | Badge pagu, program, tahapan |
| **Pastel Rose** | `#FFF1F2` / Text `#E11D48` | `rgba(244, 63, 94, 0.15)` | Badge sisa anggaran, peringatan, pengeluaran |
| **Pastel Amber** | `#FFFBEB` / Text `#D97706` | `rgba(245, 158, 11, 0.15)` | Badge proses, perhatian, jatuh tempo |

### 3.2 Tipografi & Radius

- **Font Family**: `Plus Jakarta Sans` / `Figtree` untuk seluruh hierarki UI teks dashboard.
- **Sudut Lengkung (Border Radius)**:
  - Kartu Bento: `rounded-3xl` (28px - 32px)
  - Nav Pills & Buttons: `rounded-2xl` (16px) atau `rounded-full` (kapsul)
  - Badge Status & Tooltip: `rounded-full` (9999px)
  - Container Input & Dropdown: `rounded-xl` (12px)

---

## 4. Arsitektur Komponen & Layout

### 4.1 App Shell (`AuthenticatedLayout.tsx`)
- Container fleksibel dengan sidebar kiri tetap *docked*.
- Latar belakang kanvas: `bg-[#F6F8FC] dark:bg-[#0B0A12]`.
- Efek transisi mulus saat membuka/menutup sidebar mode mini (`md:ml-64` ke `md:ml-20`).

### 4.2 Sidebar (`Sidebar.tsx`)
1. **Header Sidebar**: Logo SIKAS bercahaya + teks "SIKAS" dengan tipografi modern, serta tombol toggle collapse.
2. **Navigasi Utama (Pill Style)**:
   - Menu utama (Dashboard, RKAS, Penatausahaan, Buku Kas, Laporan, dll.) menggunakan item `NavLink` berbentuk kapsul (`rounded-2xl`).
   - Kondisi aktif: latar gradien Royal Violet `#7C5CFF`, bayangan halus `shadow-glow-violet`, ikon membesar proporsional.
   - Kondisi tidak aktif: warna teks slate, efek hover latar `hover:bg-white/5` dengan transisi 200ms.
3. **Submenu Accordion**: Animasi expand/collapse halus dengan ikon panah berotasi presisi.
4. **Bottom Card (Eduplex Style)**:
   - Kartu info mini di bagian bawah sidebar dengan gradien gelap beraksen emas/ungu (`Download App` diganti menjadi `ARKAS Live Connect` / status versi aplikasi) dengan tombol aksi cepat.

### 4.3 Navbar / Header (`Navbar.tsx`)
1. **Sapaan Personal**: "Selamat Datang, [Nama Pengguna] 👋" dengan nama sekolah di baris kedua.
2. **Pill Search Bar**: Input pencarian berbentuk kapsul (`rounded-full`) dengan ikon kaca pembesar dan shortcut tombol `⌘K` / `Ctrl+K`.
3. **Action Cluster**:
   - Quick Variant Badge (penanda varian aktif: Reguler / Kinerja / SiLPA).
   - Tombol Fullscreen Switcher.
   - Tombol Dark Mode Switcher.
   - Trigger Copilot AI dengan animasi pulse lembut.
   - Dropdown Profil Pengguna dengan avatar inisial membulat dan menu popover rapi.

---

## 5. Rancangan Halaman Dashboard (`Dashboard.tsx`)

Struktur halaman Dashboard ditata menggunakan **Bento Grid 12 Kolom**:

### 5.1 Baris 1: Filter & Kontrol Periode
- Dropdown Varian Anggaran dan Dropdown Tahun Aktif dikemas dalam wadah kapsul kaca modern (`bg-white dark:bg-ink-900 border border-slate-200/80 rounded-2xl p-1.5`).
- Tombol Sinkronisasi Cepat ARKAS dengan efek putaran ikon saat loading.

### 5.2 Baris 2: 4 Kartu Metrik Utama (Eduplex Top Cards)
Menggunakan komponen `StatCard` yang diperbarui:
1. **Pagu Anggaran**: Ikon dompet pastel ungu, angka total pagu (animasi count-up), pill perbandingan tahun lalu.
2. **Total Realisasi**: Ikon grafik naik pastel hijau zamrud, angka realisasi, persentase penyerapan dengan progress bar mini.
3. **Saldo Bank**: Ikon gedung bank pastel biru, saldo rekening bank aktif.
4. **Saldo Kas Tunai**: Ikon kasir pastel amber, sisa kas di brankas bendahara.
- Fitur interaktif: Efek **3D Tilt** halus saat kursor mouse bergerak di atas kartu.

### 5.3 Baris 3: Area Utama (8 Kolom Kiri + 4 Kolom Kanan)

#### Bagian Kiri (8 Kolom):
1. **Realisasi Bulanan (Hours Activity Style)**:
   - Kartu bento besar memuat grafik batang 12 bulan ApexCharts.
   - Batang grafik dengan sudut membulat atas (`borderRadius: 8`), warna ungu royal, dan bulan aktif disorot dengan warna emas/terang serta tooltip pill interaktif ("Rp xx.xxx.xxx · Realisasi Bulan Ini").
2. **Pemanfaatan Anggaran & Program (Course You're Taking Style)**:
   - Daftar 5 program/kegiatan SNP tertinggi dilengkapi dengan indikator cincin melingkar (*donut progress ring*) persentase penyerapan, nominal realisasi, dan badge kategori.

#### Bagian Kanan (4 Kolom):
1. **Kartu Pintas ARKAS Sync (Eduplex Go Premium Style)**:
   - Kartu gradien gelap royal violet dengan ornamen kurva estetis, teks status koneksi database ARKAS desktop, dan tombol aksi "Tarik Data Terbaru".
2. **Widget Kalender Keuangan (Calendar Widget)**:
   - Kalender bulan berjalan dengan navigasi bulan, penanda tanggal hari ini berbentuk lingkaran ungu, dan penanda jadwal transaksi/tahapan pencairan BOSP.
3. **Daftar Transaksi Terakhir (Assignments Style)**:
   - 3-4 transaksi BKU atau agenda pencairan terbaru dengan badge status berwarna pastel (`Lunas`, `Draft`, `Proses`) dan nominal rapi di sisi kanan.

---

## 6. Unified Bento Surface System untuk Halaman Dalam

Untuk memenuhi permintaan styling seluruh sistem aplikasi:
1. **Komponen Pembungkus `BentoCard`**:
   - Komponen reusable `resources/js/Components/Bento/BentoCard.tsx` yang membungkus konten dengan sudut `rounded-3xl`, latar bersih, border presisi, dan padding nyaman.
2. **Global Table Styling**:
   - Penambahan utility class tabel di `resources/css/app.css` agar seluruh tabel (RKAS, BKU, Laporan) otomatis memiliki header melengkung halus, garis pemisah tipis, dan efek baris hover lembut.
3. **Pill Tabs System**:
   - Standarisasi tab navigasi halaman (seperti tab tahapan RKAS dan tab buku pembantu BKU) menjadi barisan tombol pill modern.

---

## 7. Sistem Animasi & Interaktivitas (High-Motion & Playful)

1. **Spring Physics & Magnetic Hover**: Mengadopsi helper `useMagnetic` untuk tombol aksi utama.
2. **3D Cursor Tilt**: Mengintegrasikan transformasi `perspective(1000px) rotateX(...) rotateY(...)` pada kartu metrik bento saat di-hover.
3. **Animated Count-Up**: Hook `useCountUp` untuk menganimasikan angka rupiah dari 0 ke nilai akhir dalam durasi 900ms saat pertama dimuat.
4. **Stagger Entrance**: Elemen kartu dimuat dengan jeda berurutan (`transition-all duration-500 ease-luxe`, delay 50ms per kartu).
5. **Kepatuhan Aksesibilitas**: Pengecekan `window.matchMedia('(prefers-reduced-motion: reduce)')`. Jika aktif, semua transform 3D dan transisi gerak otomatis dinonaktifkan.

---

## 8. Rencana Verifikasi & Uji Kualitas

1. **Pengujian Build & Typecheck**:
   - `npm run build` wajib selesai dengan exit code 0 tanpa error TypeScript (`tsc`) maupun error Rollup/Vite.
2. **Verifikasi Manifes Vite**:
   - Memastikan tidak ada chunk yang hilang dari `public/build/manifest.json`.
3. **Uji Responsivitas & Dark Mode**:
   - Verifikasi tampilan pada resolusi Desktop (1920x1080, 1440x900) dan Tablet/Mobile (768px, 375px).
   - Pengujian peralihan instan antara Dark Mode dan Light Mode.
4. **Uji Integritas Data & Logika**:
   - Verifikasi filter tahun dan varian tetap memperbarui data grafik dan metrik via Axios tanpa reload halaman.
   - Verifikasi link navigasi sidebar menuju halaman RKAS, BKU, Dokumen, dan Pengaturan berfungsi tanpa kendala.
