# Design Spec: Fleksibilitas Identitas Login (Username, NIP, atau Email) untuk Kepala Sekolah & Pengguna

- **Tanggal**: 10 November 2026
- **Status**: Menunggu Review & Persetujuan Pengguna

---

## 1. Latar Belakang & Tujuan
Sebelumnya, kolom `username` pada form pembuatan akun Kepala Sekolah di `UserManagementForm.tsx` divalidasi dengan aturan ketat `alpha_dash` (hanya huruf, angka, minus, dan garis bawah) dan label hanya bertuliskan "Username Login". Hal ini membatasi Kepala Sekolah yang ingin menggunakan **NIP** (sering kali diketik dengan spasi) atau **Email institusi/pribadi** (mengandung simbol `@` dan `.`) sebagai kredensial login utama mereka.

Tujuan dari perubahan ini:
1. Memungkinkan Bendahara mendaftarkan akun Kepala Sekolah menggunakan **Username biasa**, **NIP** (18 digit angka, dengan/tanpa spasi), ataupun **Alamat Email**.
2. Memastikan otentikasi login di halaman Login (`/login`) secara cerdas mengenali identifier yang dimasukkan, baik berupa `username`, format NIP bersih tanpa spasi, maupun `email`.
3. Memperbaiki UX pada form `UserManagementForm.tsx` dan halaman `Login.tsx` agar informatif dan jelas bagi pengguna.

---

## 2. Arsitektur & Logika Komponen

### A. Backend - Validasi & Penyimpanan (`UserManagementController.php`)
1. **Normalisasi & Sanitasi Identitas:**
   - Jika nilai input `username` merupakan format NIP numerik dengan spasi (misal: `"19800101 200501 1 001"`), sistem secara otomatis membersihkan spasi menjadi `"198001012005011001"`.
   - String ditrim dari spasi di awal/akhir.
2. **Aturan Validasi Fleksibel:**
   - Melepas batasan kaku `alpha_dash`.
   - Aturan baru untuk `username`:
     - `required|string|max:255`
     - Regex yang mengizinkan karakter alfanumerik, spasi, `@`, `.`, `-`, dan `_`.
     - Validasi keunikan `unique:users,username`.
3. **Penanganan Fallback Email:**
   - Jika field `email` sengaja dikosongkan oleh Bendahara:
     - Apabila `username` yang diinput berformat email valid (`filter_var(..., FILTER_VALIDATE_EMAIL)`), kolom `email` otomatis diisi dengan alamat email tersebut.
     - Jika bukan email (misal username atau NIP), kolom `email` diisi dengan default `username@sikas.local`.
   - Jika field `email` diisi secara eksplisit, tetap gunakan email tersebut setelah divalidasi keunikannya.

### B. Backend - Otentikasi Universal Login (`LoginRequest.php`)
1. **Pencarian Multi-Identifier:**
   - Saat pengguna login melalui form login:
     ```php
     $input = trim($this->username);
     $cleanInput = str_replace(' ', '', $input);

     $user = User::where('username', $input)
         ->orWhere('username', $cleanInput)
         ->orWhere('email', $input)
         ->first();
     ```
   - Dengan begitu:
     - Login dengan username biasa (contoh: `kepsek_ahmad`) -> **Match**
     - Login dengan NIP tanpa spasi (`198001012005011001`) -> **Match**
     - Login dengan NIP dengan spasi (`19800101 200501 1 001`) -> **Match**
     - Login dengan email (`ahmad@sekolah.sch.id`) -> **Match**

### C. Frontend - User Management Form (`UserManagementForm.tsx`)
1. **Label & Placeholder Form Create:**
   - Ubah label `Username Login` -> `Username / NIP / Email Login`.
   - Placeholder -> `Contoh: kepsek_ahmad, 198001012005011001, atau ahmad@sekolah.sch.id`.
   - Tambahkan helper text: `"Dapat berupa username biasa, NIP 18 digit, atau alamat email resmi."`
2. **Label & Placeholder Form Edit:**
   - Terapkan penyesuaian label yang sama pada modal Edit Akun.

### D. Frontend - Halaman Login (`resources/js/Pages/Auth/Login.tsx`)
1. **Label & Placeholder:**
   - Ubah label `Username` -> `Username / NIP / Email`.
   - Ubah placeholder -> `Masukkan username, NIP, atau email Anda`.

---

## 3. Rencana Pengujian (Testing Strategy)
1. **Feature Tests (`RoleKepalaSekolahTest.php`):**
   - Test pembuatan akun Kepala Sekolah menggunakan NIP ber-spasi (memverifikasi tersimpan bersih tanpa spasi).
   - Test pembuatan akun Kepala Sekolah menggunakan Email sebagai username (memverifikasi kolom email otomatis tersinkronisasi jika email kosong).
   - Test otentikasi login dengan username biasa, NIP (baik dengan spasi maupun tanpa spasi), dan email.
2. **Pint & Static Analysis:**
   - Jalankan `npx tsc --noEmit` dan `vendor/bin/pint`.
   - Jalankan `php artisan test --filter=RoleKepalaSekolahTest`.

