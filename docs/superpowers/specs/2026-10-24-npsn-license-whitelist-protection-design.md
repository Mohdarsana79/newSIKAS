# Design Spec: Proteksi Lisensi NPSN Anti-Tamper & Whitelist Ter-Obfuscate

**Tanggal:** 24 Oktober 2026  
**Status:** Approved  
**Topik:** Keamanan Lisensi, Validasi NPSN, Middleware Zero-Trust, Obfuscation Whitelist, Form Profil Sekolah  

---

## 1. Latar Belakang & Celah Keamanan (Vulnerability)
1. **Bypass Ketika `APP_NPSN_CODE` Kosong:**
   - Pada [CheckNpsnLicense.php](file:///c:/laragon/www/newSIKAS2/newSIKAS/app/Http/Middleware/CheckNpsnLicense.php#L29-L33), terdapat logika toleransi:
     ```php
     if (empty($envNpsn)) {
         return $next($request);
     }
     ```
   - Celah ini menyebabkan siapa saja yang menghapus nilai `APP_NPSN_CODE=` di konfigurasi dapat bebas menggunakan aplikasi untuk sekolah lain mana pun tanpa pernah ditolak oleh sistem.
2. **Ketiadaan Whitelist Resmi di Backend:**
   - Whitelist 8 NPSN berlisensi saat ini hanya ada di skrip Inno Setup (`install_beta.iss`).
   - Di sisi backend Laravel, belum ada daftar NPSN yang sah. Jika seseorang mengisi `APP_NPSN_CODE=99999999` dan membuat profil sekolah dengan nomor yang sama, aplikasi akan menganggapnya valid.
3. **Form Profil Sekolah Masih Terbuka Bebas:**
   - Operator sekolah masih bisa mengetik NPSN secara manual pada form Data Master Profil Sekolah, yang berisiko typo atau manipulasi data sekolah.

---

## 2. Tujuan & Arsitektur Solusi
1. **File Whitelist Terproteksi (`config/license.php`):**
   - Mendaftarkan seluruh NPSN sekolah yang resmi memiliki lisensi aplikasi.
   - Mengikuti SOP [PANDUAN_DISTRIBUSI_AMAN.md](file:///c:/laragon/www/newSIKAS2/PANDUAN_DISTRIBUSI_AMAN.md), folder `config/` akan **diobfuscate secara ketat oleh Yakpro-po** saat dibuild dengan `protect.ps1`, sehingga pengguna tidak dapat membaca atau mengubah array whitelist ini.
2. **Prinsip Validasi Zero-Trust di Middleware:**
   - Tidak ada lagi pengecualian jika `APP_NPSN_CODE` kosong. Jika kosong -> **LANGSUNG BLOKIR** ke `/license-invalid`.
   - `APP_NPSN_CODE` wajib ada di dalam whitelist `config('license.allowed_npsn')`. Jika tidak terdaftar -> **LANGSUNG BLOKIR**.
   - Jika tabel `sekolahs` sudah memiliki profil, maka `sekolahs.npsn` harus persis sama dengan `APP_NPSN_CODE` DAN ada di whitelist. Jika beda -> **LANGSUNG BLOKIR**.
3. **Otomatisasi & Penguncian Field NPSN di Form Profil Sekolah:**
   - Di [SekolahProfileController.php](file:///c:/laragon/www/newSIKAS2/newSIKAS/app/Http/Controllers/SekolahProfileController.php), controller meneruskan prop `licensedNpsn` dari konfigurasi server ke frontend.
   - Di tampilan [Index.tsx](file:///c:/laragon/www/newSIKAS2/newSIKAS/resources/js/Pages/DataMaster/SekolahProfile/Index.tsx), untuk pengguna baru, field NPSN **otomatis terisi sendiri (*pre-filled*)** dan berstatus **`readOnly` (terkunci)**.
   - Backend `store()` dan `update()` memvalidasi keras bahwa `npsn` yang dikirim wajib cocok dengan `APP_NPSN_CODE`.
4. **Validasi Whitelist pada Menu Ubah NPSN (Reset Database):**
   - Di [DatabaseController.php](file:///c:/laragon/www/newSIKAS2/newSIKAS/app/Http/Controllers/DatabaseController.php#L545), input `npsn_code` baru wajib divalidasi ada di dalam `config('license.allowed_npsn')`.

---

## 3. Rancangan Teknis Detail

### 3.1 File Konfigurasi Baru: `config/license.php`
```php
<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Whitelist NPSN Berlisensi Resmi
    |--------------------------------------------------------------------------
    | Daftar NPSN resmi yang berhak menjalankan aplikasi SIKAS.
    | File ini berada di folder config/ yang otomatis diobfuscate oleh Yakpro-po.
    */
    'allowed_npsn' => [
        '40202255',
        '60726693',
        '40204209',
        '40202161',
        '40202325',
        '40202282',
        '40204366',
        '40204180',
    ],
];
```

---

### 3.2 Pengetatan [app/Http/Middleware/CheckNpsnLicense.php](file:///c:/laragon/www/newSIKAS2/newSIKAS/app/Http/Middleware/CheckNpsnLicense.php)
```php
public function handle(Request $request, Closure $next): Response
{
    // Rute pengecualian agar tidak redirect loop
    if ($request->is('license-invalid') || $request->is('api/*')) {
        return $next($request);
    }

    // Bypass saat unit test
    if (app()->runningUnitTests()) {
        return $next($request);
    }

    $envNpsn = (string) env('APP_NPSN_CODE');
    $allowedNpsns = (array) config('license.allowed_npsn', []);

    // 1. Wajib ada APP_NPSN_CODE
    if (empty($envNpsn)) {
        return redirect()->route('license.invalid');
    }

    // 2. Wajib terdaftar di whitelist resmi
    if (! in_array($envNpsn, $allowedNpsns, true)) {
        return redirect()->route('license.invalid');
    }

    // 3. Wajib cocok dengan profil sekolah di database jika sudah terisi
    try {
        $sekolah = DB::table('sekolahs')->first();

        if ($sekolah) {
            $dbNpsn = (string) $sekolah->npsn;

            if ($dbNpsn !== $envNpsn || ! in_array($dbNpsn, $allowedNpsns, true)) {
                return redirect()->route('license.invalid');
            }
        }
    } catch (\Exception $e) {
        // Abaikan jika tabel belum termigrasi
    }

    return $next($request);
}
```

---

### 3.3 Penyesuaian Profil Sekolah ([SekolahProfileController.php](file:///c:/laragon/www/newSIKAS2/newSIKAS/app/Http/Controllers/SekolahProfileController.php) & Frontend)

#### A. Controller
- Di method `index()`:
  ```php
  $licensedNpsn = (string) env('APP_NPSN_CODE');
  return Inertia::render('DataMaster/SekolahProfile/Index', [
      'sekolah' => $sekolah,
      'licensedNpsn' => $licensedNpsn,
  ]);
  ```
- Di method `store()` dan `update()`:
  Tambahkan validasi:
  ```php
  $licensedNpsn = (string) env('APP_NPSN_CODE');
  if ($request->npsn !== $licensedNpsn) {
      return back()->withErrors(['npsn' => 'NPSN tidak sesuai dengan lisensi resmi aplikasi.']);
  }
  ```

#### B. Frontend ([Index.tsx](file:///c:/laragon/www/newSIKAS2/newSIKAS/resources/js/Pages/DataMaster/SekolahProfile/Index.tsx))
- Terima prop `licensedNpsn?: string`.
- Pada `useEffect` atau inisialisasi state form:
  - Jika belum ada `sekolah` (instalasi baru), isi `npsn: licensedNpsn || ''`.
- Pada elemen input `TextInput` untuk NPSN:
  - Berikan atribut `readOnly={true}` dan styling `bg-gray-100 dark:bg-gray-800 cursor-not-allowed`.
  - Tambahkan teks penjelasan di bawah input:
    > 🔒 *NPSN terdaftar secara otomatis sesuai lisensi resmi aplikasi.*

---

### 3.4 Proteksi Ubah NPSN di [DatabaseController.php](file:///c:/laragon/www/newSIKAS2/newSIKAS/app/Http/Controllers/DatabaseController.php)
Di method `updateNpsn`:
```php
$allowedNpsns = (array) config('license.allowed_npsn', []);

$request->validate([
    'npsn_code' => ['required', 'string', 'max:255', Rule::in($allowedNpsns)],
], [
    'npsn_code.in' => 'NPSN yang dimasukkan tidak terdaftar dalam lisensi resmi aplikasi.',
]);
```

---

## 4. Rencana Pengujian
1. **Unit Testing:**
   - Buat file `tests/Unit/CheckNpsnLicenseTest.php` untuk menguji:
     - Request ditolak saat `APP_NPSN_CODE` kosong.
     - Request ditolak saat `APP_NPSN_CODE` tidak terdaftar di whitelist.
     - Request ditolak saat `sekolahs.npsn` berbeda dari `APP_NPSN_CODE`.
     - Request lolos saat `APP_NPSN_CODE` terdaftar di whitelist dan cocok dengan database.
2. **Pemulihan `.env` Lokal:**
   - Isi kembali `APP_NPSN_CODE=40202255` di file `.env` root.
3. **Pint:**
   - Jalankan `vendor/bin/pint` untuk memformat seluruh kode PHP yang diubah.
