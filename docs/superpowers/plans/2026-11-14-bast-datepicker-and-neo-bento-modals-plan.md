# Rencana Implementasi: DatePicker BAST & Neo-Bento Polish (`ModalFormBast` + `ModalPrintSettings`)

**Spec:** `docs/superpowers/specs/2026-11-14-bast-datepicker-and-neo-bento-modals-design.md`  
**Target files:**
- Create: `resources/js/Pages/FiturPelengkap/Bast/bastModalTheme.ts`
- Modify: `resources/js/Pages/FiturPelengkap/Bast/ModalFormBast.tsx`
- Modify: `resources/js/Pages/FiturPelengkap/Bast/ModalPrintSettings.tsx`

---

## Task 1: Buat helper tema `react-select` untuk modal BAST

1. Buat `resources/js/Pages/FiturPelengkap/Bast/bastModalTheme.ts` yang mengekspor `SelectOption` (`{ value: string; label: string }`) dan `BAST_SELECT_CLASS_NAMES` agar tidak ada duplikasi styling `react-select` antara `ModalFormBast.tsx` dan `ModalPrintSettings.tsx`.

## Task 2: Update `resources/js/Pages/FiturPelengkap/Bast/ModalFormBast.tsx`

1. Impor `DatePicker` (`@/Components/DatePicker`), `format` (`date-fns`), `Select` (`react-select`), `StatusBadge`, serta ikon Lucide (`CalendarDays`, `FileText`, `Layers`, `UserCheck`, `User`, `X`).
2. Perbarui shell & header ke Neo-Bento penuh:
   - Kontainer utama `rounded-[26px]` tanpa `overflow-hidden`; ambient glow (`brand-500/10` / `pastel-amber` + `lime-400/10`) diisolasi dalam `pointer-events-none absolute inset-0 overflow-hidden rounded-[26px]`.
   - Header `rounded-t-[26px]` menampilkan `IconTile` (`violet` untuk Tambah / `amber` untuk Edit), `StatusBadge` (`Tambah Data` / `Edit Data`), serta tombol tutup `X` (`disabled={processing}`).
3. Pada seksi **Transaksi BKU**, ganti `<select>` **Tahun Anggaran** dan **Tahap** menjadi `<Select>` `react-select` dengan `menuPosition="fixed"` dan `menuPlacement="auto"` (tetap menjaga fallback nilai bila perlu).
4. Pada seksi **Identitas BAST**, ganti `<TextInput type="date">` pada **Tanggal BAST** menjadi:
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
5. Selaraskan seluruh section card ke `rounded-[20px]`, `textarea` ke `rounded-2xl`, serta footer menjadi `rounded-b-[26px] border-t border-slate-100 bg-slate-50/70 px-6 py-4 dark:border-white/5 dark:bg-white/[0.02]`.

## Task 3: Update `resources/js/Pages/FiturPelengkap/Bast/ModalPrintSettings.tsx`

1. Perbarui shell (`rounded-[26px]`, glow terisolasi), header `rounded-t-[26px]` (`IconTile tone="ink"`, `StatusBadge tone="violet"` `Cetak PDF`, tombol `X` Lucide).
2. Bungkus pilihan **Ukuran Kertas** (`A4`, `F4`, `Letter`, `Legal`) dan **Ukuran Font** (`8pt`–`11pt`) dalam kartu Bento `rounded-[20px]`, menggunakan `<Select>` `react-select` dengan `BAST_SELECT_CLASS_NAMES` (`unstyled`, `isSearchable={false}`, `menuPlacement="auto"`).
3. Perbarui footer menjadi `rounded-b-[26px] border-t border-slate-100 bg-slate-50/70 px-6 py-4 dark:border-white/5 dark:bg-white/[0.02]`.

## Task 4: Verifikasi & Commit

1. Jalankan `npm run build` (`tsc && vite build`) dan pastikan exit code 0 tanpa error.
2. Commit implementasi ke branch `main`.
