# Desain Pemulihan Fitur Persetujuan Kepala Sekolah, Komentar Belanja, & Telaah AI pada RKAS

Tanggal: 2026-11-16  
Status: Disetujui User  
Ruang Lingkup:
- [HasRkasBehavior.php](file:///c:/laragon/www/newSIKAS2/newSIKAS/app/Models/Traits/HasRkasBehavior.php)
- [RkasPerubahan.php](file:///c:/laragon/www/newSIKAS2/newSIKAS/app/Models/RkasPerubahan.php)
- [KinerjaRkasPerubahan.php](file:///c:/laragon/www/newSIKAS2/newSIKAS/app/Models/KinerjaRkasPerubahan.php)
- [RkasController.php](file:///c:/laragon/www/newSIKAS2/newSIKAS/app/Http/Controllers/RkasController.php)
- [RkasPerubahanController.php](file:///c:/laragon/www/newSIKAS2/newSIKAS/app/Http/Controllers/RkasPerubahanController.php)
- [PenganggaranController.php](file:///c:/laragon/www/newSIKAS2/newSIKAS/app/Http/Controllers/PenganggaranController.php)
- [RkasApprovalBanner.tsx](file:///c:/laragon/www/newSIKAS2/newSIKAS/resources/js/Components/Rkas/RkasApprovalBanner.tsx)
- [RkasItemReviewModal.tsx](file:///c:/laragon/www/newSIKAS2/newSIKAS/resources/js/Components/Rkas/RkasItemReviewModal.tsx)
- [Rkas/Index.tsx](file:///c:/laragon/www/newSIKAS2/newSIKAS/resources/js/Pages/Penganggaran/Rkas/Index.tsx)
- [RkasPerubahan/Index.tsx](file:///c:/laragon/www/newSIKAS2/newSIKAS/resources/js/Pages/Penganggaran/RkasPerubahan/Index.tsx)
- [Penganggaran/Index.tsx](file:///c:/laragon/www/newSIKAS2/newSIKAS/resources/js/Pages/Penganggaran/Index.tsx)
- [Navbar.tsx](file:///c:/laragon/www/newSIKAS2/newSIKAS/resources/js/Components/Navbar.tsx)

---

## 1. Latar Belakang
Fitur **Persetujuan Anggaran Kepala Sekolah**, **Telaah/Komentar per Item Belanja RKAS**, dan **Telaah Cerdas AI Eksekutif** telah memiliki controller (`PenganggaranApprovalController`, `RkasReviewController`, `RkasAiReviewController`), model (`RkasItemReview`), route di `routes/variant.php`, serta komponen React di `resources/js/Components/Rkas/`. Namun saat halaman RKAS di-refactor ke desain Neo-Bento, relasi `review()` pada model RKAS, prop di `RkasController` / `RkasPerubahanController`, serta pemasangan komponen di halaman `Rkas/Index.tsx` dan `RkasPerubahan/Index.tsx` terlepas.

## 2. Keputusan Desain

### 2.1 Relasi Model & Prop Backend
1. **Model RKAS & RKAS Perubahan:**
   - Menambahkan relasi polimorfik `review()` (`morphOne(RkasItemReview::class, 'reviewable')`) pada `HasRkasBehavior.php` (mencakup `Rkas`, `KinerjaRkas`, `SilpaRkas`, `KinerjaSilpaRkas`), `RkasPerubahan.php`, dan `KinerjaRkasPerubahan.php`.
2. **Prop Inertia di `RkasController::index()` & `RkasPerubahanController::index()`:**
   - Memuat relasi `persetujuanUser:id,name,role` pada `$penganggaran` dan mengirimkan `status_persetujuan`, `persetujuan_user`, `tanggal_persetujuan` (format tanggal Indonesia), serta `catatan_persetujuan` di dalam prop `anggaran`.
   - Memuat relasi `review.user:id,name,role` pada `$itemsRaw` dan mengirimkan objek `review` (`id`, `status`, `catatan`, `user_name`, `created_at`) serta `reviewable_type` (FQCN model varian aktif) di setiap item dalam prop `items`.
3. **Prop Inertia di `PenganggaranController::index()`:**
   - Menyertakan `status_persetujuan` pada setiap kartu anggaran di daftar Penganggaran.

### 2.2 Standarisasi Neo-Bento pada Komponen Review & Approval
1. **`RkasApprovalBanner.tsx`:**
   - Menampilkan status pengesahan RKAS (`Disahkan` atau `Belum Disahkan Kepala Sekolah`) beserta nama Kepala Sekolah, tanggal pengesahan, dan catatan pengesahan.
   - Menggunakan modal Neo-Bento (`rounded-[26px] bg-white dark:bg-[#15131F]`, *ambient blur glow*, `IconTile`, tombol tutup `X`) untuk form **Persetujuan & Pengesahan RKAS** maupun **Konfirmasi Pembatalan Persetujuan** (menggantikan `confirm()` bawaan browser).
2. **`RkasItemReviewModal.tsx`:**
   - Menggunakan modal Neo-Bento (`rounded-[26px] bg-white dark:bg-[#15131F]`, *ambient blur glow*, `IconTile`, tombol tutup `X`) untuk memberikan atau melihat status telaah (`disetujui` / `perlu_revisi`) dan catatan tertulis Kepala Sekolah pada item belanja.
   - Menghilangkan `confirm()` dan `alert()` bawaan browser dengan konfirmasi hapus inline serta pesan error di dalam modal.

### 2.3 Pemasangan UI & Mode Read-Only Kepala Sekolah
1. **`Rkas/Index.tsx` & `RkasPerubahan/Index.tsx`:**
   - Merender `<RkasApprovalBanner />` tepat di bawah `PageHeader`.
   - Menambahkan tombol **Telaah AI** di `PageHeader` yang membuka `<RkasAiReviewModal />`.
   - Menampilkan *badge* status telaah (`Disetujui` / `Perlu Revisi` beserta cuplikan catatan) di kolom **Uraian** tabel RKAS yang dapat diklik untuk membuka `<RkasItemReviewModal />`, serta menambahkan menu/tombol **Telaah Belanja** di kolom **Aksi**.
   - Menyembunyikan tombol mutasi (`Tambah`, `Salin`, `Tarik dari ARKAS`, `Buat Perubahan` jika belum ada perubahan, `Edit`, `Sisip Uraian`) ketika pengguna aktif adalah Kepala Sekolah (`isKepalaSekolah`).
2. **`Penganggaran/Index.tsx`:**
   - Menampilkan *badge* status pengesahan (`Disahkan Kepsek`) pada kartu anggaran jika `status_persetujuan === 'disetujui'`.
   - Menyembunyikan tombol `Tambah Anggaran`, `Tarik dari ARKAS`, `Edit`, dan `Hapus` ketika pengguna aktif adalah Kepala Sekolah (`isKepalaSekolah`).

### 2.4 Proteksi Belanja Terbelanja & Alur Pengajuan Kembali Perbaikan oleh Bendahara
1. **Proteksi Baris yang Sudah Terbelanja Penuh (`dibelanjakan >= dianggaran`):**
   - Jika baris belanja sudah terbelanja penuh (`isBelanja`) dan belum memiliki telaah (`!item.review`), tombol **Telaah / Komentar** disembunyikan di kolom Aksi dan endpoint `RkasReviewController::store` menolak pembuatan telaah baru pada item yang sudah terbelanja penuh.
   - Jika baris belanja sudah pernah ditelaah sebelum terbelanja penuh, *badge* dan modal `RkasItemReviewModal` tetap dapat dibuka dalam mode **Baca Saja (*Read-Only*)** dengan informasi bahwa belanja telah terealisasi penuh di BKU.
2. **Alur Pengajuan Kembali Perbaikan (`perlu_revisi` → `sudah_diperbaiki` → `disetujui`):**
   - Menambahkan migrasi kolom `tanggapan_bendahara` (`text`, *nullable*) dan `revisi_diajukan_at` (`timestamp`, *nullable*) pada tabel `rkas_item_reviews`.
   - Saat Bendahara mengedit item belanja melalui `RkasController::updateGroup` atau `RkasPerubahanController::update`, data `RkasItemReview` yang terhubung pada grup item lama dipindahkan (*re-bind*) ke item baru berdasarkan bulan yang sama (atau item pertama grup) sehingga catatan telaah tidak hilang.
   - Menambahkan endpoint `POST /rkas-review/item/{id}/resubmit` (`rkas-review.resubmit`) bagi Bendahara untuk mengubah status telaah menjadi `sudah_diperbaiki` beserta `tanggapan_bendahara`.
   - Matriks tampilan status antara **Bendahara** dan **Kepala Sekolah**:
     1. **Belum Ditelaah (`null`):** Kolom Uraian bersih; pada Bendahara hanya tampil tombol titik tiga (`Dropdown`), sedangkan pada Kepala Sekolah tampil ikon pesan (`MessageSquare`) jika belum terbelanja penuh.
     2. **Perlu Revisi (`perlu_revisi`):** Kolom Uraian menampilkan badge kuning **`Perlu Revisi`** (ikon `AlertTriangle`) dan kolom Aksi menampilkan tombol ikon pesan kuning baik pada Bendahara maupun Kepala Sekolah.
     3. **Diajukan Perbaikan (`sudah_diperbaiki`):**
        - Pada **Bendahara**: Kolom Uraian menampilkan badge biru **`Sedang Diajukan`** dengan ikon jam (`Clock`) dan kolom Aksi menampilkan ikon jam biru (`Clock`).
        - Pada **Kepala Sekolah**: Kolom Uraian menampilkan badge biru **`Menunggu Verifikasi`** dengan ikon jam (`Clock`), kolom Aksi menampilkan ikon jam biru (`Clock`), dan di dalam `RkasItemReviewModal` status pilihan **tidak** terpilih otomatis menjadi "Disetujui" (Kepala Sekolah harus memilih **Disetujui** atau **Perlu Penyesuaian** terlebih dahulu).
     4. **Disetujui Kepsek (`disetujui`):**
        - Pada **Bendahara**: Badge di bawah kolom Uraian **dihilangkan** dan tombol pada kolom Aksi berubah menjadi **Ikon Centang Hijau (`CheckCircle2` warna hijau/emerald)**.
        - Pada **Kepala Sekolah**: Kolom Uraian menampilkan badge hijau **`Disetujui Kepsek`** dan kolom Aksi menampilkan **Ikon Centang Hijau (`CheckCircle2`)**.
3. **Jabatan Dinamis pada `Navbar.tsx`:**
   - Menampilkan jabatan pengguna aktif secara dinamis (`Kepala Sekolah` atau `Bendahara Sekolah`) berdasarkan `user.is_kepala_sekolah` / `user.role` pada teks samping avatar dan header menu dropdown profil.
4. **Tombol Navigasi "Kembali ke Penganggaran" Bergaya Neo-Bento (`Rkas/Index.tsx` & `RkasPerubahan/Index.tsx`):**
   - Menambahkan tautan aktif pada `breadcrumb` (`Dashboard` & `Penganggaran`), tombol kotak `<ArrowLeft />` di samping kiri judul (`PageHeader.icon`), serta tombol kapsul Neo-Bento `Kembali` di urutan pertama `PageHeader.actions`.

## 3. Verifikasi
- Pengujian `RoleKepalaSekolahTest` (termasuk pengujian prop Inertia halaman RKAS, proteksi item yang sudah terbelanja penuh, preservasi telaah saat edit grup RKAS, dan pengajuan kembali perbaikan oleh Bendahara), pemformatan `vendor/bin/pint`, dan kompilasi `npm run build` harus lolos tanpa error.
