# Implementation Plan: Guard Validasi Hapus Penganggaran (Dokumen Laporan & RKAS Perubahan)

- **Tanggal**: 24 Oktober 2026
- **Dokumen Desain**: [2026-10-24-delete-penganggaran-laporan-guard-design.md](file:///c:/laragon/www/newSIKAS2/newSIKAS/docs/superpowers/specs/2026-10-24-delete-penganggaran-laporan-guard-design.md)
- **Target File**:
  - `app/Http/Controllers/PenganggaranController.php`
  - `resources/js/Pages/Penganggaran/Index.tsx`
- **Status**: Siap Dieksekusi

---

## 1. Rencana Perubahan Detail

### A. Backend: `app/Http/Controllers/PenganggaranController.php`

1. **Tambahkan Properti Model Laporan di Controller:**
   ```php
   protected ?string $Spmth = null;
   protected ?string $Sptj = null;
   protected ?string $Sp2b = null;
   protected ?string $Lph = null;
   ```
2. **Inisialisasi Model pada Konstruktor:**
   ```php
   $this->Spmth = VariantConfig::getModelClass('spmth', $this->variant);
   $this->Sptj = VariantConfig::getModelClass('sptj', $this->variant);
   $this->Sp2b = VariantConfig::getModelClass('sp2b', $this->variant);
   $this->Lph = VariantConfig::getModelClass('lph', $this->variant);
   ```
3. **Pengecekan Dokumen pada `index()`:**
   - Cek keberadaan `Spmth`, `Sptj`, `Sp2b`, `Lph` menggunakan FK penganggaran varian aktif.
   - Masukkan array `reports` ke dalam data item kartu penganggaran reguler (`status === 'regular'`).
4. **Proteksi Validasi pada `destroy($id)`:**
   - Validasi jika RKAS Perubahan masih ada.
   - Validasi jika BKU masih ada.
   - Validasi jika dokumen laporan (`SPMTH`, `SPTJ`, `SP2B`, `LPH`) masih ada.
   - Bungkus eksekusi `$penganggaran->delete()` dengan blok `try...catch (\Illuminate\Database\QueryException $e)`.

---

### B. Frontend: `resources/js/Pages/Penganggaran/Index.tsx`

1. **Perbarui Interface `PenganggaranItem`:**
   ```tsx
   interface PenganggaranItem {
       id: number;
       title: string;
       pagu: string;
       status: 'regular' | 'perubahan';
       has_perubahan: boolean;
       has_bku: boolean;
       reports?: string[];
       tahun: string;
   }
   ```
2. **Perbarui Logika `handleDelete`:**
   - Tambahkan pengecekan RKAS Perubahan untuk item reguler:
     > *"Penganggaran RKAS awal tidak dapat dihapus karena RKAS Perubahan masih ada. Anda perlu menghapus RKAS Perubahan terlebih dahulu."*
   - Pengecekan BKU (dipertahankan).
   - Tambahkan pengecekan `item.reports`:
     > *"Dokumen {daftar_dokumen} telah dibuat. Tidak bisa menghapus penganggaran ini karena berisiko merusak data. Hapus {daftar_dokumen} terlebih dahulu agar bisa menghapus penganggaran ini."*

---

## 2. Rencana Verifikasi
1. Jalankan `npx tsc --noEmit` untuk memastikan tipe data TypeScript valid.
2. Jalankan `vendor/bin/pint` untuk memformat file PHP sesuai standar.
3. Jalankan pengujian `php artisan test` untuk memastikan tidak ada efek samping/regresi.
