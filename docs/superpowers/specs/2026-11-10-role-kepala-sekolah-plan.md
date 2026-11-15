# Implementation Plan: Implementasi Role Kepala Sekolah (Read-Only, Review Belanja RKAS, Soft Approval, & DeepSeek AI Executive Review)

- **Tanggal**: 10 November 2026
- **Dokumen Desain**: [2026-11-10-role-kepala-sekolah-design.md](file:///c:/laragon/www/newSIKAS2\newSIKAS\docs\superpowers\specs\2026-11-10-role-kepala-sekolah-design.md)
- **Status**: Selesai Diimplementasikan (Completed & Verified)

---

## 1. Rincian Langkah Implementasi

### Fase 1: Fondasi Database & Model (Migrasi & Traits)

1. **Migrasi `add_role_to_users_table`:**
   - Menambahkan kolom `role` (`string`, default: `'bendahara'`) pada tabel `users`.
   - Menambahkan index pada kolom `role`.
   - Update akun yang sudah ada menjadi `'bendahara'`.

2. **Migrasi `create_rkas_item_reviews_table`:**
   - Membuat tabel `rkas_item_reviews` dengan kolom:
     - `id`, `user_id` (FK `users`), `reviewable_type`, `reviewable_id`, `status` (`disetujui`, `perlu_revisi`), `catatan`, `timestamps`.
     - Index gabungan pada `['reviewable_type', 'reviewable_id']`.

3. **Migrasi `add_approval_fields_to_penganggarans_tables`:**
   - Menambahkan kolom ke 4 tabel penganggaran (`penganggarans`, `kinerja_penganggarans`, `silpa_penganggarans`, `kinerja_silpa_penganggarans`):
     - `status_persetujuan` (`string`, default: `'draft'`)
     - `persetujuan_oleh` (FK `users`, nullable, `onDelete('set null')`)
     - `tanggal_persetujuan` (`timestamp`, nullable)
     - `catatan_persetujuan` (`text`, nullable)

4. **Model & Traits:**
   - Buat model `app/Models/RkasItemReview.php`.
   - Perbarui `app/Models/User.php`: tambahkan fillable `role`, helper `isKepalaSekolah()`, `isBendahara()`.
   - Perbarui `app/Models/Traits/HasRkasBehavior.php` dan model `RkasPerubahan` (serta variannya): tambahkan relasi `reviews()` dan `latestReview()`.
   - Perbarui `app/Models/Traits/HasPenganggaranBehavior.php`: tambahkan field baru ke fillable, casts, dan relasi `persetujuanUser()`.

---

### Fase 2: Backend Otorisasi & Manajemen Pengguna

1. **Middleware `EnsureRole` (`app/Http/Middleware/EnsureRole.php`):**
   - Mendaftarkan alias middleware `'role'` di bootstrap / route provider.
   - Pengecekan parameter role (contoh: `role:bendahara`).

2. **Inertia Shared Props (`app/Http/Middleware/HandleInertiaRequests.php`):**
   - Inject data `role`, `is_kepala_sekolah`, dan `is_bendahara` ke `auth.user`.

3. **Controller Manajemen Pengguna (`app/Http/Controllers/UserManagementController.php`):**
   - `index()`: list pengguna sekolah (id, name, username, email, role, created_at).
   - `store(Request $request)`: validasi dan buat akun Kepala Sekolah baru.
   - `update(Request $request, $id)`: ubah profil atau reset password.
   - `destroy($id)`: proteksi agar tidak bisa menghapus akun bendahara/akun sendiri.
   - Daftarkan routes di `routes/web.php` dalam grup middleware `auth` dan `role:bendahara`.

---

### Fase 3: Backend Review Belanja, Approval, & DeepSeek AI

1. **Review Belanja Controller (`app/Http/Controllers/RkasReviewController.php`):**
   - `POST /rkas-review/item`: simpan atau perbarui review per baris belanja.
   - `DELETE /rkas-review/item/{id}`: batalkan / hapus review.
   - Route diletakkan di `routes/variant.php` agar variant-aware.

2. **Pengesahan Penganggaran Controller (`app/Http/Controllers/PenganggaranApprovalController.php`):**
   - `POST /penganggaran/{id}/approve`: mengisi status persetujuan, persetujuan_oleh, tanggal, catatan.
   - `POST /penganggaran/{id}/unapprove`: mengembalikan status ke draft jika butuh penelaahan ulang.
   - Route diletakkan di `routes/variant.php`.

3. **DeepSeek AI Executive Review Controller (`app/Http/Controllers/RkasAiReviewController.php`):**
   - `POST /rkas/{id}/ai-executive-review`:
     - Mengumpulkan metadata RKAS (pagu total, total belanja, distribusi per sub-program, 5 item belanja terbesar).
     - Menggunakan `DeepSeekService` yang sudah terpasang untuk menganalisis dan mengembalikan format Markdown.

4. **Proteksi Akses Read-Only:**
   - Menambahkan middleware guard pada aksi mutasi (store, update, destroy) di controller transaksi/master data agar role `kepala_sekolah` diblokir (403 Forbidden).

---

### Fase 4: Frontend Navigasi & Manajemen Pengguna di Profil

1. **Sidebar (`resources/js/Components/Sidebar.tsx`):**
   - Ambil `auth.user` via Inertia `usePage().props`.
   - Sembunyikan NavLink / tombol untuk:
     - `Path Arkas` modal button.
     - `Backup Database`.
     - `Integrasi` (jika aktif).
   - Tampilkan badge indikator role: *"Kepala Sekolah"* di bagian header sidebar.

2. **Tab Manajemen Pengguna di Profil (`resources/js/Pages/Profile/Partials/UserManagementTab.tsx`):**
   - Dibuat sebagai tab terpisah di halaman `resources/js/Pages/Profile/Edit.tsx`.
   - Hanya dirender jika `auth.user.is_bendahara === true`.
   - Tabel daftar pengguna dengan modal tambah akun Kepala Sekolah dan modal reset password.

---

### Fase 5: Frontend Review Belanja, Approval, & AI Executive Review

1. **Tabel Belanja RKAS & RKAS Perubahan (`Rkas/Index.tsx` dan `RkasPerubahan/Index.tsx`):**
   - Tambahkan kolom status telaah di tabel belanja.
   - Render badge status:
     - Hijau: `Disetujui`
     - Kuning: `Perlu Revisi` (dengan tooltip catatan dari Kepala Sekolah)
     - Abu-abu / netral: `Belum Ditelaah`
   - Tombol aksi telaah (ikon komentar/checklist) di tiap baris yang membuka modal input catatan & status telaah untuk Kepala Sekolah.
   - Filter bar di atas tabel: `Semua Belanja`, `Perlu Revisi (X)`, `Disetujui (Y)`.

2. **Kartu Stempel Persetujuan di Header RKAS:**
   - Komponen banner status persetujuan:
     - Jika `status_persetujuan === 'draft'`: tombol "Beri Persetujuan RKAS" (khusus Kepsek).
     - Jika `status_persetujuan === 'disetujui'`: kartu stempel resmi dengan nama Kepala Sekolah, tanggal pengesahan, dan catatan umum.

3. **Modal & Tombol DeepSeek AI Executive Review:**
   - Tombol "Telaah AI Eksekutif (DeepSeek)" di header.
   - Modal interaktif yang menampilkan hasil analisis AI dalam format markdown yang rapi.

4. **Penyesuaian Read-Only UI:**
   - Sembunyikan tombol mutasi data (*Tambah Kegiatan/Belanja*, *Import/Tarik Arkas*, *Hapus Belanja*, *Ubah*) jika `auth.user.is_kepala_sekolah === true`.

---

## 2. Rencana Pengujian & Verifikasi

1. **Automated Testing:**
   - Buat test `tests/Feature/RoleKepalaSekolahTest.php` mencakup:
     - Bendahara dapat membuat akun Kepala Sekolah.
     - Kepala Sekolah tidak bisa melakukan aksi mutasi data operasional (HTTP 403).
     - Kepala Sekolah dapat memberi status review dan catatan pada item belanja RKAS.
     - Kepala Sekolah dapat menyetujui penganggaran (stempel persetujuan).
     - Bendahara dapat melihat status review per item belanja.
2. **Type Safety & Linting:**
   - Jalankan `npx tsc --noEmit` untuk memastikan tidak ada error TypeScript pada komponen React baru/yang dimodifikasi.
   - Jalankan `vendor/bin/pint` untuk menjaga konsistensi format kode PHP.
3. **End-to-End Manual Verification:**
   - Login sebagai Bendahara -> Buka Profil -> Manajemen Pengguna -> Buat akun Kepala Sekolah.
   - Logout dan Login sebagai Kepala Sekolah.
   - Periksa Sidebar (menu teknis tersembunyi, badge Kepala Sekolah tampil).
   - Buka RKAS -> Klik Review pada salah satu item belanja -> Beri status "Perlu Revisi" + Catatan.
   - Uji tombol "Telaah AI Eksekutif" -> Periksa hasil analisis DeepSeek.
   - Klik "Beri Persetujuan RKAS" -> Masukkan catatan pengesahan -> Verifikasi kartu stempel hijau muncul.
   - Login kembali sebagai Bendahara -> Buka RKAS -> Gunakan filter tab "Perlu Revisi" -> Pastikan item dengan catatan Kepsek tampil secara presisi.

