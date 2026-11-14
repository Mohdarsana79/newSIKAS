# Desain DatePicker BAST & Neo-Bento Polish — ModalFormBast & ModalPrintSettings

**Tanggal:** 2026-11-14  
**Target files:**
- `resources/js/Pages/FiturPelengkap/Bast/ModalFormBast.tsx`
- `resources/js/Pages/FiturPelengkap/Bast/ModalPrintSettings.tsx`

---

## 1. Latar Belakang & Masalah

1. Pada `ModalFormBast.tsx` (`L273–280`), field **Tanggal BAST** masih menggunakan `<TextInput type="date" />` bawaan browser, bukan komponen kalender `<DatePicker />` sebagaimana fitur lain di aplikasi.
2. Pada `ModalFormBast.tsx` dan `ModalPrintSettings.tsx`, beberapa elemen modal belum seragam dengan standar **Neo-Bento Full-Color**:
   - Kontainer utama di dalam `<Modal>` memakai `relative overflow-hidden` tanpa `rounded-[26px]` dan tanpa layer ambient glow terisolasi (`pointer-events-none absolute inset-0 overflow-hidden rounded-[26px]`).
   - Header `ModalFormBast.tsx` belum memiliki `StatusBadge` dan tombol tutup `X`; header `ModalPrintSettings.tsx` belum memiliki `StatusBadge`.
   - Dropdown `Tahun Anggaran`, `Tahap` (`ModalFormBast.tsx`), serta `Ukuran Kertas` dan `Ukuran Font` (`ModalPrintSettings.tsx`) masih memakai `<select>` native yang rentan kontras buruk pada dark mode.
   - Footer belum dibungkus surface `rounded-b-[26px] border-t bg-slate-50/70 dark:bg-white/[0.02]`.

---

## 2. Tujuan Desain

- Mengganti input **Tanggal BAST** di `ModalFormBast.tsx` menjadi komponen `<DatePicker />` (`@/Components/DatePicker`) agar menggunakan kalender interaktif dengan output string `yyyy-MM-dd` via `date-fns`.
- Menyelaraskan visual kedua modal (`ModalFormBast.tsx` & `ModalPrintSettings.tsx`) ke gaya **Neo-Bento** (`rounded-[26px]`, ambient glow terisolasi, `StatusBadge`, kartu Bento `rounded-[20px]`, dropdown `react-select` Neo-Bento, dan footer `rounded-b-[26px]`).
- Menjaga seluruh API props, validasi, endpoint Axios (`bast.store`, `bast.update`, `api.bast.bku-available`), serta URL query parameter PDF (`paperSize`, `fontSize`) tetap kompatibel 100%.

---

## 3. Rancangan Detail

### 3.1 `ModalFormBast.tsx`
1. **Tanggal BAST menggunakan `<DatePicker />`**:
   - Mengimpor `DatePicker` dari `@/Components/DatePicker` dan `format` dari `date-fns`.
   - Mengganti `<TextInput type="date" ... />` pada **Tanggal BAST** dengan:
     ```tsx
     <DatePicker
         id="bast-tanggal"
         value={data.tanggal_bast}
         onChange={(date) =>
             setData((prev) => ({
                 ...prev,
                 tanggal_bast: date ? format(date, 'yyyy-MM-dd') : '',
             }))
         }
         placeholder="Pilih tanggal BAST"
     />
     ```
   - Karena `DatePicker.tsx` sudah menggunakan Headless UI `portal` + Floating UI `anchor`, popup kalender tidak terpotong oleh body scrollable `max-h-[64vh] overflow-y-auto` maupun terblokir focus trap `<Modal>`.
2. **Neo-Bento Shell & Header**:
   - Container utama: `relative rounded-[26px] bg-white shadow-card-light dark:bg-[#15131F] dark:shadow-card-dark` (tanpa `overflow-hidden`).
   - Ambient glow terisolasi di `pointer-events-none absolute inset-0 overflow-hidden rounded-[26px]`.
   - Header `rounded-t-[26px]`: `IconTile` (`violet` untuk Tambah / `amber` untuk Edit) + `StatusBadge` (`lime`: `Tambah Data` / `warning`: `Edit Data`) + tombol tutup `X` Lucide (`disabled={processing}`).
3. **Dropdown `react-select` di dalam Body Scrollable**:
   - Mengganti `<select>` **Tahun Anggaran** dan **Tahap** menjadi `Select<SelectOption, false>` bertema Neo-Bento (`unstyled`, `menuPosition="fixed"`, `menuPlacement="auto"`) agar menu melayang di atas container `overflow-y-auto` sambil tetap berada dalam subtree `<Dialog>` (aman dari `inert` / outside-click lock).
4. **Kartu Bento & Footer**:
   - Memperhalus kartu bagian form ke `rounded-[20px]` (`Transaksi BKU`, `Identitas BAST`, `Pihak Pertama`, `Pihak Kedua`), `textarea` ke `rounded-2xl`, serta footer menjadi `rounded-b-[26px] border-t border-slate-100 bg-slate-50/70 px-6 py-4 dark:border-white/5 dark:bg-white/[0.02]`.

### 3.2 `ModalPrintSettings.tsx`
1. **Neo-Bento Shell & Header**:
   - Container utama `rounded-[26px]` tanpa `overflow-hidden`, ambient glow terisolasi di `pointer-events-none absolute inset-0 overflow-hidden rounded-[26px]`.
   - Header `rounded-t-[26px]`: `IconTile tone="ink"` (`Printer` Lucide), judul `Pengaturan Cetak PDF`, `StatusBadge tone="violet"` (`Cetak PDF`), subjudul `text-[11px]`, dan tombol tutup `X` Lucide.
2. **Kartu Bento Pengaturan PDF**:
   - Mengelompokkan field **Ukuran Kertas** (`A4`, `F4`, `Letter`, `Legal`) dan **Ukuran Font** (`8pt`, `9pt`, `10pt`, `11pt`) dalam kartu Bento `rounded-[20px]`.
   - Mengganti kedua `<select>` native dengan `Select<SelectOption, false>` bertema Neo-Bento (`unstyled`, `isSearchable={false}`, `menuPlacement="auto"`).
3. **Footer**:
   - `rounded-b-[26px] border-t border-slate-100 bg-slate-50/70 px-6 py-4 dark:border-white/5 dark:bg-white/[0.02]` berisi `SecondaryButton` (`Batal`) dan `PrimaryButton` (`Cetak PDF` dengan ikon `Printer` Lucide).

---

## 4. Verifikasi

- Menjalankan `npm run build` (`tsc && vite build`) untuk memastikan zero TypeScript & Vite build error.
- Memastikan seluruh token Tailwind sesuai `tailwind.config.js` dan perilaku cetak PDF + simpan BAST tidak berubah.
