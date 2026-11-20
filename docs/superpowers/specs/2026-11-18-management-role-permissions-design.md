# Desain Fitur Management & Role (Pengguna, Role Custom, & Hak Akses Fitur)

**Tanggal:** 2026-11-18
**Status:** Disetujui pengguna

## Tujuan
Memindahkan manajemen akun pengguna dari halaman Profil (`/profile`) menjadi fitur mandiri di **Sidebar** bagian **Sistem** bernama **Management & Role**, sekaligus menyediakan pengelolaan role custom dan matriks izin fitur per modul (*Lihat* vs *Kelola*, plus izin khusus *Telaah* & *Pengesahan RKAS*) serta override izin khusus per pengguna.

## Arsitektur Sistem

### 1. Basis Data & Model
- **Tabel `roles` (`App\Models\Role`):** `id`, `slug` (unik), `name`, `description` (nullable), `is_system` (boolean), `permissions` (json), `timestamps`.
- **Tabel `users` (`App\Models\User`):** menambah kolom `custom_permissions` (json, nullable) untuk menimpa izin modul tertentu pada individu user tanpa memutus relasi `role` (`slug`).
- **Role bawaan (`is_system = true`):**
  - `bendahara`: `write` pada seluruh modul operasional & sistem (dengan `user_management = write` dikunci agar Admin tidak mengunci diri sendiri), serta `rkas_review = false` dan `rkas_approve = false` menjaga pemisahan kewenangan pengesahan.
  - `kepala_sekolah`: `read` pada Dashboard, Penganggaran, Penatausahaan, Status STS, Arkas Tools, Referensi Kode, Data Master, dan Fitur Pelengkap; `rkas_review = true`, `rkas_approve = true`; `none` pada `path_arkas`, `backup`, `network_settings`, `system_update`, dan `user_management`.

### 2. Katalog Modul & Penegakan Izin (`App\Config\PermissionCatalog`, `App\Services\PermissionService`)
- Modul dikelompokkan mengikuti Sidebar: Menu Utama (`dashboard`, `penganggaran`, `penatausahaan`, `sts`, `arkas_tools`, `referensi_kode`), Data Master (`sekolah_profile`, `kode_kegiatan`, `rekening_belanja`), Fitur Pelengkap (`kwitansi`, `tanda_terima`, `bast`, `surat_pesanan`, `dokumen`, `sk_surat`, `laporan`), serta Integrasi & Sistem (`path_arkas`, `backup`, `network_settings`, `system_update`, `user_management`).
- Level izin modul: `none` | `read` | `write`. Kemampuan khusus RKAS: `rkas_review` & `rkas_approve` (`boolean`).
- Middleware `EnforceModulePermissions` mengevaluasi izin efektif setiap HTTP request (mendukung keempat varian BOSP), menolak modul `none` dengan `403`, menolak mutasi bila hanya `read`, dan menegakkan izin `rkas_review` / `rkas_approve`.
- `EnsureRole` serta controller terkait (`PenganggaranApprovalController`, `RkasReviewController`, `SkSuratController`, `SystemUpdateController`) disesuaikan agar memeriksa izin efektif pengguna.

### 3. Antarmuka Frontend (`Sidebar.tsx`, `Profile/Edit.tsx`, `Pages/ManagementRole/Index.tsx`)
- `HandleInertiaRequests` menyertakan `auth.permissions` dan `auth.user.role_name`.
- `Sidebar.tsx` menampilkan menu secara dinamis sesuai modul yang berizin (`!== 'none'`) serta menampilkan menu **Management & Role** di bagian **Sistem**.
- `Profile/Edit.tsx` dibersihkan dari `UserManagementForm`.
- `Pages/ManagementRole/Index.tsx` menampilkan 2 tab:
  1. **Pengguna:** daftar user, tambah user (pilih role), edit/reset password/ganti role, atur **Akses Khusus Pengguna** (override modal), dan hapus user.
  2. **Role & Akses Pengguna:** daftar role, buat/edit/hapus role custom, serta editor matriks **Hak Akses Fitur per Modul** dengan preset cepat.
