# Design Spec: Penyelarasan Jarak (Spacing) PageHeader dan Kartu Konten SIKAS Neo-Bento

**Tanggal**: 12 November 2026  
**Status**: Disetujui (Approved)  
**Terkait**: `Navbar.tsx`, `AuthenticatedLayout.tsx`, `PageHeader.tsx`, `Dashboard.tsx`

---

## 1. Konteks & Masalah

### 1.1 Masalah Utama
Pada antarmuka SIKAS (khususnya halaman `Dashboard`), kartu `PageHeader` (yang memuat judul "Dashboard", breadcrumb, dan kontrol filter/tombol sinkronisasi) terlihat terlalu berdempetan secara vertikal dengan baris kartu-kartu metrik (`StatCard`) di bawahnya. 

### 1.2 Analisis Penyebab (*Root Cause*)
1. Di dalam `resources/js/Layouts/AuthenticatedLayout.tsx`:
   - Kontainer konten utama `<main>` hanya menerapkan `pt-3` (12px) di atas `{children}` (`<div className="px-3 pb-6 pt-3 lg:pr-4">{children}</div>`).
2. Di dalam `resources/js/Components/Navbar.tsx`:
   - Pembungkus `{header}` memiliki padding internal yang terlalu sempit (`px-3 py-2.5`), sehingga teks judul dan kontrol aksi berada terlalu dekat dengan garis batas (*border*) kaca.
3. Karena kedua kartu sama-sama mengusung gaya mengambang dengan sudut membulat tebal (`rounded-[22px]` dan `rounded-3xl`) serta bayangan melayang (`shadow-nav` dan `shadow-bento`), jarak 12px membuat bayangan dan garis lengkung visual kedua kartu saling berbenturan dan terasa sesak.

---

## 2. Sasaran Desain

1. **Jarak Napas Lega (*Airy Breathing Room*)**:
   Memberikan jarak vertikal yang proporsional (20px – 24px) antara bagian bawah kartu `PageHeader` dan deretan kartu konten di bawahnya.
2. **Padding Internal Seimbang**:
   Memperbesar padding internal pada pembungkus `{header}` agar elemen di dalamnya (judul, breadcrumb, dan tombol aksi) tertata lebih lapang dan elegan.
3. **Hierarki Sticky Konsisten**:
   Mempertahankan jarak 12px (`mt-3`) antara bar sapaan atas dan kartu `PageHeader` sebagai satu kelompok navigasi atas terpadu.

---

## 3. Spesifikasi Perubahan

### 3.1 `AuthenticatedLayout.tsx`
- Mengubah padding atas `<div className="px-3 pb-6 pt-3 lg:pr-4">` menjadi:
  ```tsx
  <div className="px-3 pb-6 pt-5 sm:pt-6 lg:pr-4">{children}</div>
  ```
- **Dampak**: Menambah ruang vertikal dari 12px ke 20px (mobile) hingga 24px (desktop), menghilangkan kesan berdempetan di seluruh halaman sistem yang memuat kartu atau tabel.

### 3.2 `Navbar.tsx`
- Mengubah padding pembungkus `{header}` dari `px-3 py-2.5` menjadi:
  ```tsx
  {header && (
      <div className="relative z-10 mt-3 rounded-[22px] border border-white/70 bg-white/70 px-4.5 py-3.5 shadow-nav backdrop-blur-xl sm:px-5 sm:py-4 dark:border-white/10 dark:bg-[#0D0F17]/70">
          {header}
      </div>
  )}
  ```
- **Dampak**: Judul dan tombol aksi di dalam `PageHeader` tidak lagi menempel ketat pada border kaca kartu header.

---

## 4. Rencana Pengujian (*Verification Plan*)

1. **Pengujian Tampilan Visual**:
   - Memeriksa halaman `Dashboard` dan memastikan jarak vertikal antara `PageHeader` dan `StatCard` lapang dan seimbang.
   - Memastikan tidak ada tabrakan visual saat halaman di-scroll (navbar dan header tetap mengambang halus di atas konten yang bergulir).
2. **Pengujian Build**:
   - Menjalankan `npm run build` (`tsc && vite build`) untuk memastikan integritas kode dan manifes.

