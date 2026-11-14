# Rencana Implementasi Pengisian Otomatis NIP Kepala Sekolah Surat Pesanan

> **For agentic workers:** Ikuti langkah-langkah berikut untuk memperbarui endpoint `getAvailableBku` & `store`, komponen `ModalFormSuratPesanan.tsx`, dan menambahkan PHPUnit Feature test.

**Tujuan:** Mengisi otomatis `pihak_kesatu_nip` pada Surat Pesanan dari `penganggaran->nip_kepala_sekolah` saat transaksi BKU dipilih, sambil tetap mengizinkan edit manual (opsional).

**Arsitektur:** Backend `SuratPesananController` menambahkan `pihak_kesatu_nip` ke payload `getAvailableBku()` dan fallback defensif di `store()`. Frontend `ModalFormSuratPesanan.tsx` menyalin `selected.pihak_kesatu_nip` di `handleBkuChange()`. Karena controller memakai `VariantConfig`, keempat varian (`reguler`, `kinerja`, `silpa`, `kinerja_silpa`) otomatis tercakup.

**Tech Stack:** Laravel 13, PHP 8.3, PHPUnit (`:memory:` sqlite), React 18, TypeScript (strict), Vite 7.

---

### Task 1: Tambah `pihak_kesatu_nip` di `SuratPesananController`

**File:**
- Modify: `app/Http/Controllers/SuratPesananController.php:192-197,310-322`

- [ ] **Step 1: Sertakan `pihak_kesatu_nip` pada response `getAvailableBku()`**
  ```php
  'pihak_kesatu_nama' => $bku->penganggaran->kepala_sekolah ?? '',
  'pihak_kesatu_nip' => $bku->penganggaran->nip_kepala_sekolah ?? '',
  'pihak_kesatu_instansi' => $bku->penganggaran->sekolah->nama_sekolah ?? 'Sekolah',
  ```
- [ ] **Step 2: Tambah fallback defensif `pihak_kesatu_nip` pada `store()`**
  ```php
  $sp->pihak_kesatu_nip = array_key_exists('pihak_kesatu_nip', $validated)
      ? $validated['pihak_kesatu_nip']
      : ($bukuKasUmum->penganggaran->nip_kepala_sekolah ?? null);
  ```

### Task 2: Salin `pihak_kesatu_nip` pada `handleBkuChange` di `ModalFormSuratPesanan.tsx`

**File:**
- Modify: `resources/js/Pages/FiturPelengkap/SuratPesanan/ModalFormSuratPesanan.tsx:155-171`

- [ ] **Step 1: Perbarui `handleBkuChange`**
  Tambahkan `pihak_kesatu_nip: selected.pihak_kesatu_nip ?? '',` saat `selected` ditemukan, menggunakan functional state updater.

### Task 3: Tambah Feature Test & Verifikasi Menyeluruh

**File:**
- Create: `tests/Feature/SuratPesananTest.php`

- [ ] **Step 1: Tulis `tests/Feature/SuratPesananTest.php`**
  - Uji `GET /api/surat-pesanan/bku-available` mengembalikan `pihak_kesatu_nip` sesuai `Penganggaran::nip_kepala_sekolah`.
  - Uji `POST /surat-pesanan` mengisi `pihak_kesatu_nip` dari `Penganggaran` bila field tidak dikirim, dan menyimpan `null` bila user mengosongkan `pihak_kesatu_nip` secara eksplisit.
- [ ] **Step 2: Jalankan `php artisan test --filter=SuratPesananTest`, `composer test`, `vendor/bin/pint --test`, dan `npm run build`**
- [ ] **Step 3: Commit semua perubahan ke `main`**
