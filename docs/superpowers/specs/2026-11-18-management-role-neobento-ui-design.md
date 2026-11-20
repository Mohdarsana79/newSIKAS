# Desain Penyempurnaan UI Neo-Bento Halaman Management & Role

**Tanggal:** 2026-11-18
**Status:** Disetujui pengguna

## Cakupan Perubahan Visual (Tanpa Mengubah Logika/Route)
1. **`resources/js/Pages/ManagementRole/Index.tsx`:**
   - Memperkaya 4 `StatCard` dengan badge `trend`, `progress` bar, dan `progressLabel`.
   - Memperbarui bar navigasi tab menjadi *floating glass pill dock* lengkap dengan penghitung badge dan ringkasan cepat di sisi kanan.
2. **`resources/js/Pages/ManagementRole/Partials/PermissionMatrix.tsx`:**
   - Menambahkan toolbar ringkasan jumlah modul (`Kelola Penuh`, `Lihat Saja`, `Nonaktif`) beserta preset cepat.
   - Setiap kategori Sidebar dilengkapi `IconTile`, counter modul aktif per grup, dan aksi cepat grup.
   - Mengubah daftar modul menjadi **Grid Kartu Bento 2 Kolom (`grid-cols-1 md:grid-cols-2 gap-3`)** dengan warna kartu kontekstual (aksen Lime untuk *Kelola*, Sky untuk *Lihat*, Slate redup untuk *Tidak Ada*) dan kontrol segmen berikon.
   - Mengganti checkbox standar pada *Kewenangan Khusus RKAS* menjadi kartu Bento interaktif dengan *sliding toggle switch*.
3. **`resources/js/Pages/ManagementRole/Partials/UsersTab.tsx`:**
   - Menambahkan pencarian instan (nama/NIP/username/email) dan filter pil per role.
   - Menambahkan avatar inisial bergradien sesuai role, indikator *Akun Anda*, serta bar progres multi-warna cakupan modul (`Kelola` + `Lihat`) di tiap baris pengguna.
   - Melengkapi seluruh modal dengan *aurora glow* khas Neo-Bento.
4. **`resources/js/Pages/ManagementRole/Partials/RolesTab.tsx`:**
   - Mempercantik kartu daftar role di panel kiri dengan `IconTile`, badge rincian akses, dan bar proporsi modul di bawah tiap kartu.
   - Menambahkan **3 kartu mini ringkasan** (`Kelola Penuh`, `Lihat Saja`, `Kewenangan RKAS`) di bagian atas panel konfigurasi role di sebelah kanan.
5. **Perbaikan Palet `tailwind.config.js` & Kontras Tombol `PermissionMatrix.tsx`:**
   - Memperluas token `sky`, `mint`, dan `peach` di `tailwind.config.js` agar memiliki `DEFAULT` sekaligus skala `50..900`, serta menambahkan `50` dan `DEFAULT` pada `lime`.
   - Memberikan latar & border tegas pada tombol segmen aktif (`bg-lime-400 text-slate-950`, `bg-sky-600 text-white`, `bg-slate-800 text-white`) maupun tombol tidak aktif (`bg-white text-slate-700 border-slate-200/90`) serta bingkai pil pada tombol aksi grup (`Kelola Grup`, `Lihat Grup`, `Matikan`).

