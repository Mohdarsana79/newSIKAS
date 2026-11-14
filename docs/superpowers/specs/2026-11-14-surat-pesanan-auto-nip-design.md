# Desain Pengisian Otomatis NIP Kepala Sekolah dari Penganggaran pada Surat Pesanan

**Tanggal:** 2026-11-14
**Status:** Disetujui untuk peninjauan spec
**Ruang Lingkup:**
- `app/Http/Controllers/SuratPesananController.php`
- `resources/js/Pages/FiturPelengkap/SuratPesanan/ModalFormSuratPesanan.tsx`
- `tests/Feature/SuratPesananTest.php`

---

## 1. Latar Belakang & Tujuan

Pada form `ModalFormSuratPesanan.tsx`, saat pengguna memilih transaksi BKU di tab **Info Umum**, kolom Pihak Kesatu (`pihak_kesatu_nama`, `pihak_kesatu_instansi`, `pihak_kesatu_alamat`) sudah terisi otomatis dari relasi `penganggaran` dan `penganggaran.sekolah`. Namun kolom `pihak_kesatu_nip` belum terisi otomatis karena `SuratPesananController::getAvailableBku()` belum menyertakan `nip_kepala_sekolah`.

Data `nip_kepala_sekolah` tersimpan pada tabel `penganggarans` (dan tabel varian `silpa_penganggarans`, `kinerja_penganggarans`, `kinerja_silpa_penganggarans` melalui trait `HasPenganggaranBehavior`), sedangkan tabel `sekolahs` (`SekolahProfile`) tidak memiliki kolom `nip_kepala_sekolah`.

Tujuan perubahan ini adalah mengisi otomatis `pihak_kesatu_nip` dari `penganggaran->nip_kepala_sekolah` saat transaksi BKU dipilih, sambil mempertahankan input tetap dapat diedit secara manual dengan label `NIP (Opsional)`.

---

## 2. Desain Backend (`SuratPesananController.php`)

1. **`getAvailableBku(Request $request)`:**
   - Tambahkan `'pihak_kesatu_nip' => $bku->penganggaran->nip_kepala_sekolah ?? ''` pada pemetaan setiap item `$bkuItems` (bersama `pihak_kesatu_nama`, `pihak_kesatu_instansi`, dan `pihak_kesatu_alamat`).
   - Karena `$this->BukuKasUmum` dan `$this->Penganggaran` diselesaikan lewat `VariantConfig` sesuai varian aktif, perubahan ini otomatis berlaku untuk keempat varian (`reguler`, `kinerja`, `silpa`, `kinerja_silpa`).

2. **`store(Request $request)`:**
   - Ubah penugasan `$sp->pihak_kesatu_nip` menjadi fallback defensif:
     ```php
     $sp->pihak_kesatu_nip = array_key_exists('pihak_kesatu_nip', $validated)
         ? $validated['pihak_kesatu_nip']
         : ($bukuKasUmum->penganggaran->nip_kepala_sekolah ?? null);
     ```
   - Jika pengguna sengaja mengosongkan input `NIP (Opsional)` di form, request tetap membawa key `pihak_kesatu_nip` (dikonversi menjadi `null`), sehingga tidak ditimpa kembali. Jika key tidak dikirim sama sekali (misal pemanggil API), sistem mengisi default dari `$bukuKasUmum->penganggaran->nip_kepala_sekolah`.

---

## 3. Desain Frontend (`ModalFormSuratPesanan.tsx`)

1. **`handleBkuChange(id: string | number)`:**
   - Saat transaksi BKU ditemukan (`selected`), ikut perbarui `pihak_kesatu_nip`:
     ```ts
     pihak_kesatu_nip: selected.pihak_kesatu_nip ?? '',
     ```
   - Gunakan functional updater `setData((prev) => ({ ...prev, ... }))` agar pembaruan state aman.
2. **Input UI (tab `kesatu`):**
   - Pertahankan label `NIP (Opsional)` dan `<TextInput>` yang tetap bisa diedit manual oleh pengguna.
3. **Mode Edit (`editData`):**
   - Tidak menimpa `editData.pihak_kesatu_nip` yang sudah tersimpan sebelumnya.

---

## 4. Rencana Verifikasi

1. Tambahkan `tests/Feature/SuratPesananTest.php` untuk menguji:
   - `api.surat-pesanan.bku-available` mengembalikan `pihak_kesatu_nip` dari `Penganggaran::nip_kepala_sekolah`.
   - `surat-pesanan.store` mengisi `pihak_kesatu_nip` dari `Penganggaran` bila key tidak dikirim, serta tetap mengizinkan nilai kosong/`null` bila key `pihak_kesatu_nip` dikirim kosong secara eksplisit.
2. Jalankan `composer test` dan `npm run build`, serta `vendor/bin/pint --test` pada file PHP yang diubah.
