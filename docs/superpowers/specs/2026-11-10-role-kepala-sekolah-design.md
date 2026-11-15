# Design Spec: Implementasi Role Kepala Sekolah (Read-Only, Review Belanja RKAS, Soft Approval, & DeepSeek AI Executive Review)

**Tanggal:** 10 November 2026  
**Status:** In Review / Ready for Plan  
**Topik:** Autentikasi Multi-User, RBAC Sederhana, Penganggaran RKAS & RKAS Perubahan, Review Belanja, Soft Approval, DeepSeek AI  

---

## 1. Latar Belakang & Masalah

Saat ini aplikasi SIKAS dirancang dengan asumsi pengguna tunggal (*single-user*):
1. Pada `RegisteredUserController`, terdapat pengunci `User::query()->exists()` yang membatasi registrasi hanya untuk 1 pengguna (Bendahara/Operator BOS).
2. Tabel `users` belum memiliki atribut `role` untuk membedakan hak akses dan wewenang.
3. Seluruh rute dan aksi di sistem terbuka penuh untuk pengguna yang telah terautentikasi tanpa pemisahan tanggung jawab (*separation of duties*).

Dalam tata kelola keuangan sekolah (BOSP - Permendikbudristek & integrasi ARKAS), **Kepala Sekolah** memiliki peran penting sebagai Kuasa Pengguna Anggaran (KPA) dan penanggung jawab mutlak:
- Kepala Sekolah tidak melakukan entri data transaksi harian (pekerjaan ini dilakukan oleh Bendahara/Operator BOS).
- Kepala Sekolah bertugas melakukan pengawasan (*supervisory/read-only*), menelaah rencana belanja, memberikan catatan perbaikan pada item belanja tertentu sebelum disahkan, dan memberikan stempel persetujuan (*approval*).
- Kepala Sekolah memerlukan ringkasan cepat dan wawasan eksekutif terhadap postur anggaran tanpa harus menyisir ratusan baris data satu per satu.

---

## 2. Tujuan & Ruang Lingkup

1. **Multi-User RBAC Sederhana:**
   - Menambahkan pemisahan peran (*role*): `'bendahara'` (default/akses penuh) dan `'kepala_sekolah'` (read-only dengan hak review dan approval).
   - Menyediakan tab antarmuka **"Manajemen Pengguna"** di halaman Profil/Pengaturan agar Bendahara dapat membuat dan mengelola akun Kepala Sekolah dengan aman.

2. **Perlindungan Akses Read-Only (Read-Only Guard):**
   - **Backend Guard:** Middleware/Gate untuk membatasi Kepala Sekolah dari melakukan mutasi data operasional (POST, PUT, PATCH, DELETE) pada penganggaran, penatausahaan BKU, kwitansi, SPJ, BAST, data master, dan sinkronisasi Arkas.
   - **Frontend Guard:** Tombol aksi manipulasi data (*Tambah Belanja*, *Ubah*, *Hapus*, *Tarik dari Arkas*, *Tutup BKU*, dll.) disembunyikan jika role adalah `kepala_sekolah`.
   - **Penyembunyian Menu Teknis:** Menu teknis seperti *Backup Database*, *Path Arkas*, dan *Integrasi API* disembunyikan dari Sidebar untuk Kepala Sekolah.

3. **Fitur Telaah & Komentar Belanja (RKAS & RKAS Perubahan):**
   - Menelaah belanja secara granular **per-baris item belanja** (*line item*).
   - Kepala Sekolah dapat memberi status telaah (`disetujui` / `perlu_revisi`) disertai catatan arahan.
   - Bendahara dapat melihat badge status telaah dan memanfaatkan tab filter di atas tabel belanja (*Semua*, *Perlu Revisi*, *Disetujui*) untuk mempermudah perbaikan.

4. **Alur Persetujuan (Soft Approval / Stempel Pengesahan):**
   - Menambahkan stempel pengesahan resmi di header penganggaran yang mencatat nama Kepala Sekolah, waktu persetujuan, dan catatan umum pengesahan.
   - Bersifat *soft approval* (tidak mengunci kaku tombol edit di sisi Bendahara) untuk menjaga fleksibilitas operasional sekolah dan sinkronisasi ARKAS.

5. **Fitur Eksekutif AI (DeepSeek Executive Review):**
   - Memanfaatkan integrasi DeepSeek AI yang telah ada di SIKAS untuk memberikan ringkasan telaah eksekutif bagi Kepala Sekolah dalam 1 klik (komposisi belanja modal vs operasional, perbandingan pagu, item anggaran terbesar, dan deteksi anomali).

6. **Dukungan Penuh Multi-Varian:**
   - Selaras dengan arsitektur 4 varian anggaran SIKAS (`reguler`, `kinerja`, `silpa`, `kinerja_silpa`).

---

## 3. Rancangan Database & Model

### 3.1 Penambahan Kolom pada Tabel `users`
File migrasi baru: `database/migrations/YYYY_MM_DD_add_role_to_users_table.php`
- `role`: string (default: `'bendahara'`). Opsi nilai: `'bendahara'`, `'kepala_sekolah'`.
- Index pada kolom `role`.

### 3.2 Tabel Telaah Belanja: `rkas_item_reviews`
Menyimpan riwayat komentar dan status telaah per item belanja secara fleksibel untuk mendukung seluruh varian model RKAS dan RKAS Perubahan:
```php
Schema::create('rkas_item_reviews', function (Blueprint $table) {
    $table->id();
    $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
    $table->string('reviewable_type'); // misal: App\Models\Rkas, App\Models\RkasPerubahan, KinerjaRkas, dll.
    $table->unsignedBigInteger('reviewable_id');
    $table->enum('status', ['disetujui', 'perlu_revisi'])->default('disetujui');
    $table->text('catatan')->nullable();
    $table->timestamps();

    $table->index(['reviewable_type', 'reviewable_id']);
});
```

Model: `app/Models/RkasItemReview.php`
- Relasi `belongsTo(User::class)`
- Relasi `morphTo('reviewable')`

Pada trait `HasRkasBehavior` dan model `RkasPerubahan` (serta varian-variannya):
```php
public function reviews()
{
    return $this->morphMany(RkasItemReview::class, 'reviewable');
}

public function latestReview()
{
    return $this->morphOne(RkasItemReview::class, 'reviewable')->latestOfMany();
}
```

### 3.3 Penambahan Kolom Persetujuan pada Penganggaran
File migrasi baru yang menambahkan kolom persetujuan ke seluruh 4 tabel penganggaran (`penganggarans`, `kinerja_penganggarans`, `silpa_penganggarans`, `kinerja_silpa_penganggarans`):
- `status_persetujuan`: string, default: `'draft'` (nilai: `'draft'`, `'disetujui'`)
- `persetujuan_oleh`: foreignId ke `users`, nullable, onDelete('set null')
- `tanggal_persetujuan`: timestamp, nullable
- `catatan_persetujuan`: text, nullable

Pada trait `HasPenganggaranBehavior`:
- Menambahkan field di atas ke `$fillable`.
- Relasi: `belongsTo(User::class, 'persetujuan_oleh')`.

---

## 4. Rancangan Backend & Otorisasi

### 4.1 Middleware & Helper Role
1. **Middleware `EnsureRole` (`app/Http/Middleware/EnsureRole.php`):**
   - Menerima parameter role, e.g. `role:bendahara` atau `role:kepala_sekolah,bendahara`.
   - Mengembalikan respon HTTP 403 Forbidden atau redirect back dengan flash error jika role pengguna tidak memenuhi kriteria.
2. **Inertia Shared Data (`HandleInertiaRequests.php`):**
   ```php
   'auth' => [
       'user' => $request->user() ? [
           'id' => $request->user()->id,
           'name' => $request->user()->name,
           'username' => $request->user()->username,
           'email' => $request->user()->email,
           'role' => $request->user()->role ?? 'bendahara',
           'is_kepala_sekolah' => ($request->user()->role === 'kepala_sekolah'),
           'is_bendahara' => ($request->user()->role === 'bendahara' || empty($request->user()->role)),
       ] : null,
   ],
   ```
3. **Model Helper di `app/Models/User.php`:**
   ```php
   public function isKepalaSekolah(): bool
   {
       return $this->role === 'kepala_sekolah';
   }

   public function isBendahara(): bool
   {
       return $this->role === 'bendahara' || empty($this->role);
   }
   ```

### 4.2 Controller Manajemen Pengguna (`app/Http/Controllers/UserManagementController.php`)
Diakses oleh Bendahara:
- `GET /user-management`: Mengambil daftar pengguna (Bendahara & Kepala Sekolah).
- `POST /user-management`: Membuat akun baru (khusus akun Kepala Sekolah).
- `PUT /user-management/{id}`: Mengubah nama, username, atau mereset password akun Kepala Sekolah.
- `DELETE /user-management/{id}`: Menghapus akun Kepala Sekolah (tidak bisa menghapus akun sendiri).

### 4.3 Controller Review & Persetujuan RKAS
1. **Item Review Controller (`app/Http/Controllers/RkasReviewController.php`):**
   - `POST /rkas-review/item`:
     - Payload: `reviewable_type`, `reviewable_id`, `status` (`disetujui` / `perlu_revisi`), `catatan`.
     - Menyimpan atau memperbarui review item belanja oleh Kepala Sekolah.
   - `DELETE /rkas-review/item/{id}`:
     - Menghapus review/catatan jika sudah selesai ditindaklanjuti atau dibatalkan.
2. **Pengesahan Penganggaran Controller (`app/Http/Controllers/PenganggaranApprovalController.php`):**
   - `POST /penganggaran/{id}/approve`:
     - Memverifikasi variant aktif via `app('variant')`.
     - Mengisi `status_persetujuan = 'disetujui'`, `persetujuan_oleh = auth()->id()`, `tanggal_persetujuan = now()`, `catatan_persetujuan`.
   - `POST /penganggaran/{id}/unapprove`:
     - Membatalkan status persetujuan jika diperlukan penelaahan ulang.

### 4.4 Controller DeepSeek AI Executive Review (`app/Http/Controllers/RkasAiReviewController.php`)
- Route: `POST /rkas/{id}/ai-executive-review`
- Mengambil ringkasan data RKAS (Total belanja, breakdown per kode kegiatan/SNP, perbandingan pagu, rasio belanja barang-jasa vs modal, dan 5 alokasi belanja terbesar).
- Menggunakan `DeepSeekService` yang sudah terpasang di SIKAS dengan prompt persona "Auditor Keuangan & Penasihat Eksekutif Kepala Sekolah".
- Menghasilkan ringkasan berformat Markdown dengan 3 poin kunci:
  1. Proporsi dan Kelayakan Alokasi Dana
  2. Peringatan Dini / Deteksi Anomali Anggaran
  3. Rekomendasi Keputusan untuk Kepala Sekolah

---

## 5. Rancangan Antarmuka & Frontend (Inertia + React + Tailwind)

### 5.1 Navigasi & Sidebar (`resources/js/Components/Sidebar.tsx`)
- Jika `auth.user.is_kepala_sekolah === true`:
  - Menyembunyikan menu **Backup Database**, **Path Arkas**, dan **Integrasi**.
  - Menampilkan badge visual di bagian atas sidebar:
    `[Role: Kepala Sekolah - Pengawas & Penelaah]` dengan warna gradien biru/indigo yang elegan.

### 5.2 Antarmuka Telaah Belanja pada Tabel RKAS & RKAS Perubahan
Pada komponen `resources/js/Pages/Penganggaran/Rkas/Index.tsx` dan `RkasPerubahan/Index.tsx`:
1. **Kolom Baru "Status Telaah":**
   - Menampilkan chip/badge:
     - Hijau: `Disetujui`
     - Kuning: `Perlu Penyesuaian` (bisa di-hover untuk menampilkan catatan kepsek)
     - Abu-abu: `Belum Ditelaah`
2. **Interaksi Kepala Sekolah:**
   - Ikon tombol "Catatan / Telaah" di setiap baris item belanja.
   - Mengklik tombol membuka Modal Review:
     - Toggle status: `Disetujui` vs `Perlu Revisi`.
     - Input teks catatan arahan (misal: *"Spesifikasi disesuaikan katalog SIPlah"*).
     - Tombol Simpan Telaah.
3. **Tab Filter Belanja (Sisi Bendahara & Kepala Sekolah):**
   - Di atas tabel terdapat pill filter:
     - `Semua Belanja (Total N)`
     - `Perlu Penyesuaian (N)` -> langsung memfilter hanya item belanja yang membutuhkan perbaikan.
     - `Telah Disetujui (N)`

### 5.3 Kartu Pengesahan & Tombol DeepSeek AI di Header RKAS
Di bagian atas tampilan RKAS:
1. **Banner Stempel Persetujuan:**
   - Jika belum disetujui:
     - Tampilan untuk Kepsek: Tombol **"Beri Persetujuan RKAS"** (warna hijau/emerald) membuka modal input catatan pengesahan.
     - Tampilan untuk Bendahara: Status *"Menunggu Penelaahan Kepala Sekolah"*.
   - Jika sudah disetujui:
     - Kartu Stempel Hijau: *"Telah Ditelaah & Disetujui Kepala Sekolah pada [Tanggal] oleh [Nama]"*.
     - Menampilkan catatan pengesahan resmi dari Kepala Sekolah.
     - Tombol *"Cetak Dokumen Resmi"* (Lembar Kerja RKAS, RKA Tahapan, SPTJ).
2. **Tombol "Telaah Cerdas AI (DeepSeek)":**
   - Membuka modal ringkasan eksekutif bertenaga AI dengan loading indicator interaktif.
   - Menampilkan analisis komposisi belanja, deteksi anomali, dan kesimpulan kelayakan anggaran.

### 5.4 Tab Manajemen Pengguna di Halaman Profil
Pada `resources/js/Pages/Profile/Edit.tsx`:
- Ditambahkan tab **"Manajemen Pengguna"** (khusus tampil untuk role `bendahara`).
- Menampilkan daftar akun terdaftar beserta role-nya.
- Formulir modal:
  - Tambah Akun Kepala Sekolah: Nama Lengkap, Username, Email, Password, Konfirmasi Password.
  - Reset Password Akun Kepala Sekolah jika lupa password.

---

## 6. Pertimbangan Multi-Varian (BOSP Architecture)

Sesuai aturan `AGENTS.md` dan `VariantConfig.php`:
1. Kolom persetujuan ditambahkan ke keempat tabel penganggaran:
   - `penganggarans` (Reguler)
   - `kinerja_penganggarans` (Kinerja)
   - `silpa_penganggarans` (SiLPA)
   - `kinerja_silpa_penganggarans` (Kinerja SiLPA)
2. `rkas_item_reviews` menggunakan relasi polimorfik (`reviewable_type` dan `reviewable_id`), sehingga secara otomatis mendukung:
   - `Rkas` & `RkasPerubahan` (Reguler)
   - `KinerjaRkas` & `KinerjaRkasPerubahan` (Kinerja)
   - `SilpaRkas` (SiLPA)
   - `KinerjaSilpaRkas` (Kinerja SiLPA)
3. Resolusi model tetap menggunakan `VariantConfig::getModelClass()` dan helper `app('variant')`.

---

## 7. Rencana Pengujian (Testing Strategy)

1. **Unit & Feature Test:**
   - `tests/Feature/RoleAuthenticationTest.php`: Memverifikasi pembagian hak akses (Bendahara vs Kepala Sekolah).
   - `tests/Feature/RkasReviewTest.php`: Memverifikasi penambahan status telaah & catatan per item belanja.
   - `tests/Feature/PenganggaranApprovalTest.php`: Memverifikasi pemberian dan pencabutan stempel persetujuan RKAS.
   - `tests/Feature/ReadOnlyGuardTest.php`: Memastikan Kepala Sekolah mendapatkan respon 403 saat mencoba menghapus/mengubah transaksi atau data master.
2. **Manual Regression Test:**
   - Memastikan akun tunggal yang sudah ada sebelumnya otomatis menjadi role `bendahara` tanpa merusak fungsionalitas yang berjalan.
   - Menguji alur: Bendahara membuat akun Kepsek -> Kepsek login -> Kepsek memberi catatan pada 2 baris belanja RKAS -> Bendahara filter belanja "Perlu Revisi" -> Bendahara memperbaiki -> Kepsek memberi status Disetujui -> Kepsek mengesahkan RKAS.

