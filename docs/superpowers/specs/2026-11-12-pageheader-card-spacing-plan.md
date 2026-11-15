# Implementation Plan: Penyelarasan Jarak PageHeader dan Kartu Konten SIKAS Neo-Bento

**Tanggal Rencana:** 12 November 2026  
**Status:** Siap Dieksekusi  
**Dokumen Desain Referensi:** [`docs/superpowers/specs/2026-11-12-pageheader-card-spacing-design.md`](file:///c:/laragon/www/newSIKAS2/newSIKAS/docs/superpowers/specs/2026-11-12-pageheader-card-spacing-design.md)  
**Tujuan:** Memberikan jarak napas (*breathing room*) vertikal yang lega antara kartu `PageHeader` dan baris kartu metrik/konten di bawahnya, serta memperluas padding internal kartu header.

---

## 1. Rincian File & Tahapan Eksekusi

### Tahap 1: Perluas Padding Atas Konten Utama (`AuthenticatedLayout.tsx`)
**File:** `resources/js/Layouts/AuthenticatedLayout.tsx`
- Ubah baris 58:
  ```tsx
  <div className="px-3 pb-6 pt-5 sm:pt-6 lg:pr-4">{children}</div>
  ```
  dari sebelumnya `pt-3`.

### Tahap 2: Perluas Padding Internal Kartu Header (`Navbar.tsx`)
**File:** `resources/js/Components/Navbar.tsx`
- Ubah pembungkus `{header}`:
  ```tsx
  {header && (
      <div className="relative z-10 mt-3 rounded-[22px] border border-white/70 bg-white/70 px-4 py-3.5 shadow-nav backdrop-blur-xl sm:px-5 sm:py-4 dark:border-white/10 dark:bg-[#0D0F17]/70">
          {header}
      </div>
  )}
  ```
  dari sebelumnya `px-3 py-2.5`.

### Tahap 3: Verifikasi Build & Tampilan
- Jalankan `npm run build` (`tsc && vite build`).
- Pastikan tidak ada regresi visual atau error kompilasi.

