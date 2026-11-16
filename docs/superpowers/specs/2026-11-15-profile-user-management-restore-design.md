# Desain Pemulihan Fitur Manajemen Pengguna & Role pada Halaman Pengaturan Profil

Tanggal: 2026-11-15  
Status: Disetujui User  
Ruang Lingkup:
- [Profile/Edit.tsx](file:///c:/laragon/www/newSIKAS2/newSIKAS/resources/js/Pages/Profile/Edit.tsx)
- [UserManagementForm.tsx](file:///c:/laragon/www/newSIKAS2/newSIKAS/resources/js/Pages/Profile/Partials/UserManagementForm.tsx)
- [bootstrap/app.php](file:///c:/laragon/www/newSIKAS2/newSIKAS/bootstrap/app.php)
- [LoginRequest.php](file:///c:/laragon/www/newSIKAS2/newSIKAS/app/Http/Requests/Auth/LoginRequest.php)
- [HasPenganggaranBehavior.php](file:///c:/laragon/www/newSIKAS2/newSIKAS/app/Models/Traits/HasPenganggaranBehavior.php)

---

## 1. Latar Belakang
Fitur **Manajemen Pengguna & Role** (untuk membuat, mengubah, mereset password, dan menghapus akun Kepala Sekolah / Bendahara) telah memiliki controller backend (`UserManagementController.php`), middleware (`EnsureRole.php` & `PreventKepalaSekolahMutations.php`), route (`/user-management` dengan middleware `role:bendahara`), serta komponen frontend (`UserManagementForm.tsx`). Namun:
1. Komponen `<UserManagementForm />` belum di-import dan belum dirender di dalam `resources/js/Pages/Profile/Edit.tsx`.
2. Modal pada `UserManagementForm.tsx` belum menggunakan container `rounded-[26px]` Neo-Bento penuh dan masih menggunakan `confirm()` / `alert()` bawaan browser untuk penghapusan akun.
3. Registrasi alias middleware `'role' => EnsureRole::class` dan append `PreventKepalaSekolahMutations::class` di `bootstrap/app.php`, normalisasi login NIP berspasi / email di `LoginRequest.php`, serta atribut `status_persetujuan` pada `HasPenganggaranBehavior.php` sempat terlepas sehingga perlu dipulihkan agar alur akun Kepala Sekolah berjalan utuh.

## 2. Keputusan Desain
1. **Pemasangan di `Profile/Edit.tsx`:**
   - Mengambil informasi pengguna aktif melalui `usePage().props.auth.user`.
   - Merender `<Surface padding="md"><UserManagementForm /></Surface>` khusus bagi pengguna non-Kepala Sekolah (`!isKepalaSekolah`).
2. **Penyempurnaan Modal Neo-Bento di `UserManagementForm.tsx`:**
   - Membungkus Modal Tambah Pengguna dan Modal Edit Pengguna dengan container `relative overflow-hidden rounded-[26px] bg-white dark:bg-[#15131F]`, dekorasi *ambient blur glow*, `StatusBadge`, dan tombol tutup `X`.
   - Mengganti `confirm()` dan `alert()` pada aksi hapus pengguna dengan **Modal Konfirmasi Hapus Pengguna** bergaya Neo-Bento (`tone="rose"`) menggunakan `router.delete(route('user-management.destroy', userToDelete.id))` agar terintegrasi dengan notifikasi Toast global.
3. **Pemulihan Integrasi Backend Role Kepala Sekolah:**
   - Mendaftarkan alias `'role' => EnsureRole::class` dan `PreventKepalaSekolahMutations::class` di `bootstrap/app.php`.
   - Menambahkan dukungan login menggunakan NIP berspasi atau alamat email di `LoginRequest::authenticate()`.
   - Menambahkan kolom persetujuan (`status_persetujuan`, `persetujuan_oleh`, `tanggal_persetujuan`, `catatan_persetujuan`) serta relasi `persetujuanUser()` di `HasPenganggaranBehavior.php`.

## 3. Verifikasi
- Kompilasi TypeScript dan produksi Vite (`npm run build`), pemformatan Pint, serta seluruh 11 pengujian pada `RoleKepalaSekolahTest` harus lolos tanpa error.
