# Implementation Plan: Fleksibilitas Identitas Login (Username, NIP, atau Email)

- **Tanggal**: 10 November 2026
- **Dokumen Desain**: [2026-11-10-username-nip-email-kepsek-design.md](file:///c:/laragon/www/newSIKAS2\newSIKAS\docs\superpowers\specs\2026-11-10-username-nip-email-kepsek-design.md)
- **Status**: Selesai Diimplementasikan (Completed & Verified)

---

## 1. Langkah-Langkah Pengerjaan

### Langkah 1: Backend Controller (`UserManagementController.php`)
- **Sanitasi Username / NIP**:
  - Jika format input `username` adalah digit dengan spasi (format penulisan NIP, misal `19800101 200501 1 001`), lakukan pembersihan spasi sebelum validasi dan simpan sebagai `198001012005011001`.
  - Lakukan `trim` spasi terluar.
- **Validasi Fleksibel**:
  - Ganti aturan `alpha_dash` pada field `username` dengan regex `regex:/^[a-zA-Z0-9_\-\.@]+$/`.
  - Pastikan keunikan `unique:users,username`.
- **Penanganan Fallback Email Otomatis**:
  - Jika field `email` kosong:
    - Jika `username` merupakan email valid (`filter_var`), gunakan `username` tersebut sebagai nilai `email`.
    - Jika bukan, buat fallback `$username . '@sikas.local'`.

### Langkah 2: Otentikasi Login (`LoginRequest.php`)
- Di metode `authenticate()`:
  - Tangkap input `$this->username`.
  - Buat variasi tanpa spasi `$cleanDigits = preg_replace('/\s+/', '', $this->username)`.
  - Cari pengguna dengan:
    ```php
    $user = User::where('username', $this->username)
        ->orWhere('username', $cleanDigits)
        ->orWhere('email', $this->username)
        ->first();
    ```
  - Pesan error jika tidak ditemukan: `'username' => 'Username, NIP, atau Email tidak terdaftar.'`

### Langkah 3: Antarmuka Form Profil (`UserManagementForm.tsx`)
- Pada form Tambah Akun (Create Modal):
  - Ubah label `create_username` menjadi `Username / NIP / Email Login`.
  - Ubah placeholder menjadi `Contoh: kepsek_ahmad, 198001012005011001, atau ahmad@sekolah.sch.id`.
  - Tambahkan teks keterangan di bawah input: *"Dapat berupa username biasa, NIP 18 digit, atau alamat email resmi."*
- Pada form Ubah Akun (Edit Modal):
  - Lakukan penyesuaian label dan placeholder yang sama pada field `edit_username`.

### Langkah 4: Antarmuka Halaman Login (`Login.tsx`)
- Ubah label `username` menjadi `Username / NIP / Email`.
- Ubah placeholder input menjadi `Masukkan username, NIP, atau email Anda`.

### Langkah 5: Pengujian Otomatis (`RoleKepalaSekolahTest.php`)
- Tambahkan test cases:
  1. `test_bendahara_can_create_kepala_sekolah_with_nip_with_spaces`:
     - Memastikan input NIP ber-spasi dibersihkan dan tersimpan tanpa spasi.
  2. `test_bendahara_can_create_kepala_sekolah_with_email_as_username`:
     - Memastikan input email pada username tersimpan dan mengisi kolom email jika kosong.
  3. `test_user_can_login_using_nip_with_spaces_or_email`:
     - Memastikan otentikasi login berhasil baik menggunakan NIP dengan spasi, NIP tanpa spasi, username biasa, maupun email.

### Langkah 6: Verifikasi Akhir
- Jalankan `npx tsc --noEmit`.
- Format PHP dengan `vendor/bin/pint`.
- Jalankan `php artisan test --filter=RoleKepalaSekolahTest`.
- Jalankan test suite unit `php artisan test --testsuite=Unit`.
- Build produksi Vite `npm run build`.
