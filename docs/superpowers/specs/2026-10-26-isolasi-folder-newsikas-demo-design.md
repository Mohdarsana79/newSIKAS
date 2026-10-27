# Design Spec: Pemisahan Folder Fisik newSIKAS_Demo & Pembersihan Total Kode Asli newSIKAS

**Tanggal:** 26 Oktober 2026  
**Status:** Approved  
**Topik:** Isolasi Folder Demo, Reversi Git Kode Asli, Pembersihan Database Asli, Kloning Folder newSIKAS_Demo, Database Terpisah newSIKAS_demo  

---

## 1. Latar Belakang & Masalah

Penggabungan fitur demo ke dalam basis kode utama `newSIKAS` berisiko menimbulkan potensi *bug*, beban *overhead*, atau interferensi dengan kode produksi sekolah riil. 

Oleh karena itu, seluruh fitur Demo akan **dihapus dan dibersihkan 100% dari folder `newSIKAS` asli**, dan dipindahkan ke dalam **folder mandiri terpisah**: `c:\laragon\www\newSIKAS2\newSIKAS_Demo`.

---

## 2. Arsitektur Isolasi

```
c:\laragon\www\newSIKAS2\
│
├── newSIKAS/                  <-- [KODE ASLI PRODUKSI] 100% Murni & Bersih
│   ├── .env                   --> DB_DATABASE=newSIKAS (PostgreSQL)
│   ├── app/                   --> Tanpa ada middleware/service demo
│   ├── resources/             --> Tanpa ada komponen/watermark demo
│   └── database/              --> Database lokal dibersihkan dari data demo
│
└── newSIKAS_Demo/             <-- [KODE VERSI DEMO TERISOLASI]
    ├── .env                   --> DB_DATABASE=newSIKAS_demo (Database Terpisah!)
    │                              APP_DEMO_MODE=true
    │                              APP_NPSN_CODE=00000000
    ├── app/Http/Middleware/Demo/PreventDemoPersistence.php
    ├── app/Services/Demo/MockArkasSyncService.php
    ├── database/seeders/Demo/DemoDatabaseSeeder.php
    └── resources/js/Components/Demo/ (Badge, Banner, Modal)
```

---

## 3. Rencana Eksekusi Langkah demi Langkah

### Langkah 1: Bersihkan Data Demo dari Database Asli `newSIKAS`
- Hapus data yang ter-seed dari `DemoDatabaseSeeder` pada database PostgreSQL `newSIKAS`:
  - `User` dengan `username = 'admin'` dan `email = 'demo@sikas.id'`.
  - `SekolahProfile` dengan `npsn = '00000000'`.
  - Transaksi `BukuKasUmum`, `Rkas`, `Penganggaran`, dan `PenerimaanDana` milik sekolah `00000000`.

### Langkah 2: Buat Folder Kloning `newSIKAS_Demo`
- Duplikasi folder `newSIKAS` saat ini (yang sudah berisi fitur demo lengkap) menjadi:
  `c:\laragon\www\newSIKAS2\newSIKAS_Demo`.
- Konfigurasi `.env` di `newSIKAS_Demo`:
  - `APP_NAME="newSIKAS (Versi Demo)"`
  - `APP_DEMO_MODE=true`
  - `APP_NPSN_CODE=00000000`
  - `DB_DATABASE=newSIKAS_demo`
- Buat database PostgreSQL `newSIKAS_demo`.
- Jalankan `php artisan migrate:fresh --seed --seeder="Database\Seeders\Demo\DemoDatabaseSeeder"` di `newSIKAS_Demo`.

### Langkah 3: Kembalikan (Revert) Folder Asli `newSIKAS` ke Kondisi Bersih
- Pada folder `newSIKAS`:
  - Lakukan `git reset --hard 493d882d` (commit sebelum fitur demo dimasukkan).
  - Hapus file-file untracked sisa demo (`app/Http/Middleware/Demo/`, `app/Services/Demo/`, `database/seeders/Demo/`, `resources/js/Components/Demo/`, `resources/views/pdf/partials/demo-watermark.blade.php`, `tests/Feature/DemoModeTest.php`).
  - Jalankan `composer test` dan `npm run build` untuk memverifikasi `newSIKAS` asli 100% kembali normal tanpa error.

---

## 4. Validasi & Kriteria Keberhasilan
- [x] Folder `newSIKAS` asli tidak memiliki satupun baris kode demo.
- [x] Database `newSIKAS` asli tidak memiliki data demo.
- [x] Folder `newSIKAS_Demo` berfungsi mandiri dengan database terpisah `newSIKAS_demo`.
