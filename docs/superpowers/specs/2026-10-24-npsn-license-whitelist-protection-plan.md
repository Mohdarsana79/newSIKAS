# Implementation Plan: Proteksi Lisensi NPSN Anti-Tamper & Whitelist Ter-Obfuscate

- **Tanggal**: 24 Oktober 2026
- **Dokumen Desain**: [2026-10-24-npsn-license-whitelist-protection-design.md](file:///c:/laragon/www/newSIKAS2/newSIKAS/docs/superpowers/specs/2026-10-24-npsn-license-whitelist-protection-design.md)
- **Target File**:
  - `config/license.php` *(File Baru)*
  - `app/Http/Middleware/CheckNpsnLicense.php`
  - `app/Http/Controllers/SekolahProfileController.php`
  - `resources/js/Pages/DataMaster/SekolahProfile/Index.tsx`
  - `app/Http/Controllers/DatabaseController.php`
  - `tests/Unit/CheckNpsnLicenseTest.php` *(File Baru)*
  - `.env`
- **Status**: Siap Dieksekusi

---

## 1. Rencana Perubahan Detail

### Task 1: Buat File Whitelist `config/license.php`
- Membuat konfigurasi berisi array `allowed_npsn`:
  - `40202255`, `60726693`, `40204209`, `40202161`, `40202325`, `40202282`, `40204366`, `40204180`.

---

### Task 2: Pengetatan Middleware `CheckNpsnLicense.php`
- Hapus toleransi `if (empty($envNpsn)) return $next($request);`.
- Cek `APP_NPSN_CODE`: jika kosong -> `redirect()->route('license.invalid')`.
- Cek `APP_NPSN_CODE`: jika tidak ada di `config('license.allowed_npsn')` -> `redirect()->route('license.invalid')`.
- Cek database `sekolahs`: jika ada baris data sekolah, maka `npsn` harus cocok dengan `APP_NPSN_CODE` dan ada di whitelist. Jika beda -> `redirect()->route('license.invalid')`.
- Pengecualian rute: `license-invalid`, `api/*`, dan saat `app()->runningUnitTests()`.

---

### Task 3: Profil Sekolah (`SekolahProfileController.php` & `Index.tsx`)
1. **Controller:**
   - Di `index()`, kirimkan `licensedNpsn = env('APP_NPSN_CODE')`.
   - Di `store()` dan `update()`, tambahkan validasi: `$request->npsn === (string) env('APP_NPSN_CODE')`.
2. **Frontend `Index.tsx`:**
   - Terima prop `licensedNpsn?: string`.
   - Di inisialisasi form/useEffect: jika data `sekolah` belum ada, set `npsn` otomatis dengan `licensedNpsn`.
   - Tambahkan atribut `readOnly` pada `TextInput` untuk NPSN dengan visual terkunci dan badge bantuan.

---

### Task 4: Proteksi Ubah NPSN di `DatabaseController.php`
- Tambahkan validasi `Rule::in(config('license.allowed_npsn'))` pada input `npsn_code`.

---

### Task 5: Pulihkan `.env` Lokal
- Ubah `APP_NPSN_CODE=` menjadi `APP_NPSN_CODE=40202255` pada `.env` di root project agar aplikasi development tetap bisa dibuka.

---

### Task 6: Unit Test `CheckNpsnLicenseTest.php`
- Menguji skenario:
  1. NPSN kosong ditolak ke `license.invalid`.
  2. NPSN tidak terdaftar di whitelist ditolak ke `license.invalid`.
  3. NPSN berbeda dengan database ditolak ke `license.invalid`.
  4. NPSN sah dan cocok dengan database lolos validasi.

---

### Task 7: Verifikasi & Formatting
- Jalankan `vendor/bin/pint` pada seluruh file yang diubah.
- Jalankan `php artisan test --filter=CheckNpsnLicenseTest`.
- Jalankan `npm run build` / typecheck frontend.
