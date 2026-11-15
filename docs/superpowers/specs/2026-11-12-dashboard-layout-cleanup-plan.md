# Implementation Plan: Penataan Ulang Layout Dashboard & Penghapusan Menu Sinkronisasi SIKAS Neo-Bento

**Tanggal Rencana:** 12 November 2026  
**Status:** Siap Dieksekusi  
**Dokumen Desain Referensi:** [`docs/superpowers/specs/2026-11-12-dashboard-layout-cleanup-design.md`](file:///c:/laragon/www/newSIKAS2/newSIKAS/docs/superpowers/specs/2026-11-12-dashboard-layout-cleanup-design.md)  
**Tujuan:** Menghilangkan tombol sinkronisasi di header dashboard dan kartu integrasi ARKAS, serta menata ulang layout grid dashboard menjadi berimbang, simetris, dan rapi.

---

## 1. Rincian File & Tahapan Eksekusi

### Tahap 1: Pembersihan Komponen & Header Action di `Dashboard.tsx`
**File:** `resources/js/Pages/Dashboard.tsx`
- Hapus import `ArkasQuickSyncCard` yang tidak lagi dipakai.
- Hapus state `isSyncing` dan fungsi `handleSync`.
- Hapus tombol "Sinkronkan" di slot `actions` pada `PageHeader`, sehingga menyisakan kapsul pilihan filter `[ Varian Anggaran | Tahun ]` yang bersih.

### Tahap 2: Restrukturisasi Layout Grid Bento Berimbang di `Dashboard.tsx`
**File:** `resources/js/Pages/Dashboard.tsx`
- Pisahkan wrapper 2 kolom raksasa sebelumnya menjadi 3 baris terstruktur yang proporsional:
  1. **Baris 2**: `Realisasi Bulanan` (8 Kolom) berdampingan dengan `CalendarWidget` (4 Kolom).
  2. **Baris 3**: `Program Terbesar & SNP` (7 Kolom) berdampingan dengan `Agenda Tahapan BOSP` (5 Kolom).
  3. **Baris 4**: `Tren Realisasi 5 Tahun Terakhir` melebar penuh (12 Kolom).

### Tahap 3: Verifikasi Build & Tampilan
- Jalankan `npm run build` (`tsc && vite build`).
- Pastikan tidak ada error kompilasi dan manifes ter-update dengan sempurna.

