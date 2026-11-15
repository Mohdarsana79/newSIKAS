# Rencana Implementasi Neo-Bento Modal Tutup BKU

**Tanggal:** 2026-11-13  
**Spec Referensi:** `docs/superpowers/specs/2026-11-13-bku-tutup-bku-modal-design.md`

---

## Langkah Implementasi

### Task 1: Buat Komponen `TutupBkuModal.tsx`
- **File:** `resources/js/Pages/Penatausahaan/Partials/TutupBkuModal.tsx`
- **Detail:**
  - Definisikan interface `TutupBkuModalProps` (`show`, `onClose`, `onSubmit`, `processing`, `bulan`, `tahun`, `saldoTunai`, `saldoNonTunai`, `tanggalTutup`, `bungaBank`, `pajakBunga`, `errors`, `onDateChange`, `onBungaChange`, `onPajakBungaChange`, `startOfActiveMonth`, `endOfActiveMonth`, `formatCurrency`).
  - Helper `parseNominalDigits(val: string)`: mengambil angka digit murni untuk menghitung `parsedBunga`, `parsedPajak`, dan `netBunga = parsedBunga - parsedPajak` secara live.
  - Terapkan struktur Neo-Bento:
    1. `<Modal show={show} onClose={onClose} maxWidth="xl">` dengan wrapper `relative overflow-visible rounded-[26px] bg-white dark:bg-[#15131F]` + dekorasi glow terisolasi di dalam `overflow-hidden rounded-[26px]`.
    2. Header aksen Amber: `IconTile` `amber` (`Lock`), judul **"Konfirmasi Tutup BKU"**, `StatusBadge` `{bulan} {tahun}` (`warning`), subjudul singkat, dan tombol `X`.
    3. Banner Peringatan Neo-Bento (`bg-pastel-amber/75`, `AlertTriangle`).
    4. Bento Summary Strip 3 kolom: **Saldo Tunai**, **Saldo Non-Tunai**, dan **Estimasi Bunga Bersih (Live)** (`bg-pastel-mint/55` bila `>= 0` atau `bg-pastel-rose/65` bila pajak melebihi bunga).
    5. Kartu Form Input: `DatePicker` (rentang `startOfActiveMonth`–`endOfActiveMonth`, `overflow-visible` agar popover tidak terpotong) + grid 2 kolom untuk `Jasa Giro / Bunga Bank` dan `Pajak Bunga Bank`.
    6. Footer: `<SecondaryButton>` (`Batal`) + `<DangerButton>` (`Tutup BKU` / `Memproses...`) untuk kontras teks putih di atas tombol rose.

### Task 2: Integrasikan ke `Bku.tsx`
- **File:** `resources/js/Pages/Penatausahaan/Bku.tsx`
- **Detail:**
  - Import `TutupBkuModal` dari `./Partials/TutupBkuModal`.
  - Ganti blok JSX `{/* Modal Tutup BKU */}` (sekitar L3129–L3221) dengan `<TutupBkuModal ... />` yang terhubung ke `isTutupBkuOpen`, `tutupForm`, `submitTutupBku`, `saldoTunai`, `saldoNonTunai`, `startOfActiveMonth`, `endOfActiveMonth`, dan `formatCurrency`.

### Task 3: Verifikasi & Commit
- Jalankan `npm run build` (`tsc && vite build`) hingga exit code 0.
- Commit file perubahan (`TutupBkuModal.tsx` dan `Bku.tsx`) ke `main`.

