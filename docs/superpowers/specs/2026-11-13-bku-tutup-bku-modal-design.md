# Desain Neo-Bento Modal Tutup BKU

**Tanggal:** 2026-11-13  
**Komponen Target:** `resources/js/Pages/Penatausahaan/Partials/TutupBkuModal.tsx` (komponen baru) & `resources/js/Pages/Penatausahaan/Bku.tsx`  
**Tujuan:** Memperbarui tampilan **Modal Konfirmasi Tutup BKU** agar selaras dengan sistem desain **Neo-Bento** SIKAS, menampilkan ringkasan saldo & estimasi bunga bank secara langsung, menjaga popup `DatePicker` tidak terpotong, serta memperbaiki kontras tombol aksi destruktif.

---

## 1. Keputusan Arsitektur & Komponen

- **Ekstraksi Partial (`TutupBkuModal.tsx`)**:
  Memisahkan modal Tutup BKU dari [Bku.tsx](file:///c:/laragon/www/newSIKAS2/newSIKAS/resources/js/Pages/Penatausahaan/Bku.tsx) ke `resources/js/Pages/Penatausahaan/Partials/TutupBkuModal.tsx`.
- **Props Komponen (`TutupBkuModalProps`)**:
  - `show: boolean`
  - `onClose: () => void`
  - `onSubmit: (e: React.FormEvent) => void`
  - `processing: boolean`
  - `bulan: string`
  - `tahun: string`
  - `saldoTunai: number`
  - `saldoNonTunai: number`
  - `tanggalTutup: string`
  - `bungaBank: string`
  - `pajakBunga: string`
  - `errors: { tanggal_tutup?: string; bunga_bank?: string; pajak_bunga?: string }`
  - `onDateChange: (dateStr: string) => void`
  - `onBungaChange: (e: React.ChangeEvent<HTMLInputElement>) => void`
  - `onPajakBungaChange: (e: React.ChangeEvent<HTMLInputElement>) => void`
  - `startOfActiveMonth: Date`
  - `endOfActiveMonth: Date`
  - `formatCurrency: (val: number | string | undefined | null) => string`
- **Logika Bisnis Tidak Berubah**:
  - Validasi rentang tanggal (`startOfActiveMonth` s.d. `endOfActiveMonth`), sanitasi angka saat input (`handleCurrencyChange`), serta handler `submitTutupBku` tetap dikelola oleh `tutupForm` di `Bku.tsx`.

---

## 2. Tata Letak & Struktur Visual Neo-Bento

### 2.1 Shell Modal & Keamanan Popover `DatePicker`
- Menggunakan `<Modal show={show} onClose={onClose} maxWidth="xl">`.
- Panel root menggunakan `relative overflow-visible rounded-[26px] bg-white dark:bg-[#15131F]` agar popup kalender `DatePicker` tampil bebas tanpa terpotong container modal.
- Dekorasi glow lembut berada di dalam layer terisolasi `<div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[26px]">` (`bg-pastel-amber/80` di kanan atas + `bg-pastel-rose/55` di kiri bawah, dengan versi transparan lembut di dark mode).

### 2.2 Header Neo-Bento (Aksen Amber)
- Kiri: `IconTile` `tone="amber"` `size="md"` dengan ikon `Lock` (`lucide-react`).
- Baris judul: **"Konfirmasi Tutup BKU"** + `StatusBadge` `tone="warning"` `dot` menampilkan `{bulan} {tahun}`.
- Subjudul: `"Kunci transaksi bulanan dan catat jasa giro serta pajak bunga bank."`
- Kanan: Tombol tutup `X` bersih (`rounded-xl hover:bg-slate-100 dark:hover:bg-white/10`).

### 2.3 Banner Peringatan Neo-Bento (`pastel-amber`)
- Kartu peringatan dengan sudut `rounded-[20px]`, border lembut `border-amber-200/80 dark:border-amber-500/25`, latar `bg-pastel-amber/75 dark:bg-amber-500/[0.08]`, dan ikon `AlertTriangle`.
- Pesan jelas: menutup BKU mengunci penambahan maupun perubahan transaksi pada bulan `{bulan}` hingga BKU dibuka kembali.

### 2.4 Bento Summary Strip (3 Kartu Mini)
Grid 3 kolom (`grid-cols-1 sm:grid-cols-3 gap-3`):
1. **Saldo Tunai**: Menampilkan `formatCurrency(saldoTunai)` (`text-sikas-num`) dengan sublabel `"Kas di tangan"`.
2. **Saldo Non-Tunai**: Menampilkan `formatCurrency(saldoNonTunai)` (`text-sikas-num`) dengan sublabel `"Saldo bank"`.
3. **Estimasi Bunga Bersih (Live)**:
   - Menghitung nominal angka murni dari `bungaBank` (`parsedBunga`) dan `pajakBunga` (`parsedPajak`) menggunakan `.replace(/[^0-9]/g, '')`.
   - Selisih bersih `netBunga = parsedBunga - parsedPajak`.
   - Jika `netBunga >= 0`: latar aksen `border-mint/25 bg-pastel-mint/55 dark:border-mint/25 dark:bg-mint/[0.08]`, menampilkan `+ {formatCurrency(netBunga)}`.
   - Jika `parsedPajak > parsedBunga` (pajak melebihi bunga): latar `border-rose-200 bg-pastel-rose/65 dark:border-rose-500/25 dark:bg-rose-500/[0.08]` dengan label peringatan bahwa pajak melebihi bunga.

### 2.5 Kartu Form Input
Terbungkus dalam kartu bento (`rounded-[20px] border border-slate-200/80 bg-slate-50/70 p-4 dark:border-white/10 dark:bg-white/[0.03]`):
- **Baris 1 (Lebar penuh)**: `Tanggal Tutup BKU` menggunakan `<DatePicker>` dengan `startMonth={startOfActiveMonth}`, `endMonth={endOfActiveMonth}`, dan `disabled={[{ before: startOfActiveMonth }, { after: endOfActiveMonth }]}` + `<InputError>`.
- **Baris 2 (Grid 2 Kolom `grid-cols-1 sm:grid-cols-2 gap-3.5`)**:
  - Kolom 1: `Jasa Giro / Bunga Bank` — prefix `Rp` dengan `pl-10` agar spasi nyaman & `text-sikas-num`.
  - Kolom 2: `Pajak Bunga Bank` — prefix `Rp` dengan `pl-10` & `text-sikas-num`.

### 2.6 Footer & Perbaikan Kontras Tombol
- Border atas halus `border-t border-slate-100 dark:border-white/10`.
- Kiri (opsional informasi singkat di `sm+`): teks pendek `"Pastikan seluruh transaksi & nota sudah sesuai."`
- Kanan:
  - `<SecondaryButton type="button" onClick={onClose}>Batal</SecondaryButton>`
  - `<DangerButton type="submit" disabled={processing}>...</DangerButton>` (menggantikan `PrimaryButton className="bg-red-600 ..."` agar teks putih di atas tombol rose kontras dan konsisten Neo-Bento).

---

## 3. Keamanan Token Tailwind & Verifikasi

- Seluruh kelas warna menggunakan token valid di `tailwind.config.js` (`pastel-amber`, `pastel-mint`, `pastel-rose`, `mint`, `rose-500`, `amber-200`, `slate-*`, `white/*`, `dark:` mode). Tidak ada `brand-50`, `text-sky-*`, atau `py-4.5`.
- Verifikasi dilakukan dengan `npm run build` (`tsc && vite build`) dan memastikan build selesai tanpa error TypeScript maupun Vite.

