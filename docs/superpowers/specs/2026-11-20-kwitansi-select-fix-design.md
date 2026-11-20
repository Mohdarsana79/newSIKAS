# Desain Perbaikan Select pada Fitur Kwitansi

**Tanggal:** 2026-11-20  
**Status:** Disetujui untuk peninjauan spec  
**Ruang Lingkup:**
- Komponen baru: `resources/js/Pages/FiturPelengkap/Kwitansi/components/KwitansiSelect.tsx`
- Pembaruan 4 tab Kwitansi:
  - `resources/js/Pages/FiturPelengkap/Kwitansi/TabReguler.tsx`
  - `resources/js/Pages/FiturPelengkap/Kwitansi/TabKinerja.tsx`
  - `resources/js/Pages/FiturPelengkap/Kwitansi/TabSilpa.tsx`
  - `resources/js/Pages/FiturPelengkap/Kwitansi/TabKinerjaSilpa.tsx`

---

## 1. Latar Belakang & Akar Masalah

Pada halaman **Manajemen Kwitansi** (`FiturPelengkap/Kwitansi`), terdapat dua komponen dropdown berbasis `react-select` yang bermasalah pada mode gelap (*dark mode*) dan pada layar desktop (`>= 1024px`) dengan skala otomatis `80%` (`html { zoom: 0.8 }` di `resources/css/app.css`):

1. **Select Format (1–4) di baris tabel `Daftar Kwitansi` (`KwitansiRowActions`)**:
   - **Posisi dropdown meleset ke kiri dan atas (~20%):** Menggunakan `menuPortalTarget={document.body}` tanpa `menuPosition="fixed"` dan tanpa kompensasi faktor `zoom`. `react-select` menghitung `left`, `top`, dan `width` dari `getBoundingClientRect()` (piksel visual ter-zoom `0.8x`), lalu menerapkan angka tersebut sebagai gaya CSS pada elemen portal di dalam `document.body` yang kembali terkena `html { zoom: 0.8 }`.
   - **Teks putih di atas latar putih pada dark mode:** Menggunakan style bawaan `react-select` (latar kontrol dan panel putih `#ffffff`) tanpa `unstyled` maupun kelas dark mode, sementara warna teks mewarisi `body` (`--foreground` putih pada `.dark`).
   - **Tidak seragam dengan desain Neo-Bento:** Belum mengikuti token warna, radius, focus ring (`lime-400`), maupun highlight item aktif seperti `ArkasYearSelect` dan `LaporanSelect`.

2. **Select Tahun Anggaran di modal `Generate Kwitansi Otomatis`**:
   - Menggunakan warna hardcoded light mode (`#1e293b`, `#111827`, latar putih default) sehingga tidak serasi di dark mode.
   - Dibungkus `<div className="relative overflow-hidden">` di dalam `<Modal>`, sehingga daftar opsi dapat terpotong batas bawah kartu modal.

3. **Duplikasi kode antar 4 file tab**:
   - `formatOptions`, `KwitansiRowActions`, dan konfigurasi `Select` modal terduplikasi identik di `TabReguler.tsx`, `TabKinerja.tsx`, `TabSilpa.tsx`, dan `TabKinerjaSilpa.tsx`.

---

## 2. Keputusan Desain (Hasil Wawancara)

1. **Cakupan perbaikan:** Memperbaiki **keduanya** — select **Format (1–4)** pada baris tabel Daftar Kwitansi dan select **Tahun Anggaran** pada modal **Generate Kwitansi Otomatis**.
2. **Teknologi komponen:** Tetap memakai `react-select` dengan `unstyled` + styling **Neo-Bento** (mendukung light & dark mode penuh) dan kompensasi `zoom: 0.8` pada mode portal.
3. **Perilaku pencarian (`isSearchable`):**
   - Select **Format (1–4)** pada baris tabel: `isSearchable={false}` (langsung membuka daftar opsi saat diklik tanpa kursor ketik).
   - Select **Tahun Anggaran** pada modal Generate Otomatis: `isSearchable={true}` (dapat diketik untuk memfilter tahun).
4. **Arsitektur & sinkronisasi file:** Mengekstrak komponen bersama (`KwitansiSelect` dan `KwitansiRowActions`) lalu memakainya di `TabReguler.tsx` serta menyinkronkannya ke `TabKinerja.tsx`, `TabSilpa.tsx`, dan `TabKinerjaSilpa.tsx` agar bebas duplikasi dan konsisten dengan pola pembaruan Kwitansi sebelumnya.

---

## 3. Arsitektur & Detail Implementasi

### 3.1 Modul Bersama: `resources/js/Pages/FiturPelengkap/Kwitansi/components/KwitansiSelect.tsx`

Mengekspor tipe dan dua komponen dengan tanggung jawab tunggal:

#### A. Tipe & Konstanta
- `export interface KwitansiSelectOption<T extends string | number = string> { value: T; label: string; }`
- `export type KwitansiFormat = 1 | 2 | 3 | 4;`
- `export const KWITANSI_FORMAT_OPTIONS: KwitansiSelectOption<KwitansiFormat>[]` untuk `Format 1` sampai `Format 4`.
- `export interface KwitansiRowItem` berisi properti minimal yang dibutuhkan `KwitansiRowActions` (`id`, `preview_url`, `preview_url_2`, `preview_url_3`, `preview_url_4`).

#### B. Helper Kompensasi Zoom Efektif (`getEffectiveZoom`)
- Mengukur rasio skala aktual pada elemen pembungkus kontrol menggunakan `el.getBoundingClientRect().width / el.offsetWidth`.
- Jika `offsetWidth > 0`, `rectWidth > 0`, hasil finite, dan `Math.abs(ratio - 1) > 0.01`, kembalikan `ratio` (bernilai `0.8` saat `html { zoom: 0.8 }` aktif di Chrome/Edge/Firefox modern).
- Jika rasio mendekati `1` (layar `< 1024px`, atau browser yang tidak men-scale `getBoundingClientRect()`), kembalikan `1`.
- Pada mode portal (`usePortal = true`), `styles.menuPortal` membagi `base.left`, `base.top`, dan `base.width` (ketika bertipe `number`) dengan `zoom` dan menetapkan `zIndex: 9999`.

#### C. Komponen `KwitansiSelect<T extends string | number = string>`
- **Props:**
  - `options: KwitansiSelectOption<T>[]`
  - `value: T | '' | null | undefined`
  - `onChange: (value: T | null) => void`
  - `size?: 'compact' | 'md'` (default `'md'`)
  - `usePortal?: boolean` (default `false`)
  - `isSearchable?: boolean` (default `false`)
  - `isDisabled?: boolean` (default `false`)
  - `inputId?: string`
  - `placeholder?: string`
  - `noOptionsMessage?: string`
  - `className?: string`
- **Konfigurasi `react-select`:**
  - Selalu memakai `unstyled`, `isClearable={false}`, `menuPlacement="auto"`, `menuShouldScrollIntoView={false}`.
  - Bila `usePortal === true`:
    - `menuPortalTarget={typeof document !== 'undefined' ? document.body : null}`
    - `menuPosition="fixed"` (menghilangkan ketergantungan `window.pageYOffset` sehingga pembagian `left`/`top`/`width` oleh `zoom` presisi baik saat scroll di atas maupun di bawah halaman).
    - `styles.menuPortal` menerapkan kompensasi `zoom` + `zIndex: 9999`.
  - Bila `usePortal === false` (di dalam `<Modal>`):
    - Tidak memakai `menuPortalTarget` maupun `menuPosition="fixed"` (menghindari bug containing block `transform` pada `<DialogPanel>` di `Modal.tsx`), menu dirender lokal dengan `z-[80]`.
- **Styling Neo-Bento Light & Dark (`classNames`):**
  - `control`:
    - `compact`: `min-h-[30px] rounded-xl border px-2.5 py-0.5 text-[11px] font-bold shadow-sm transition`
    - `md`: `min-h-[41px] rounded-xl border px-3.5 py-1.5 text-[12px] font-semibold shadow-sm transition`
    - Light: `bg-white text-slate-800 border-slate-200/90 hover:border-slate-300`
    - Dark: `dark:bg-white/5 dark:text-white dark:border-white/10 dark:hover:border-white/20`
    - Focus: `border-lime-400 ring-4 ring-lime-200/60 dark:border-lime-400/70 dark:ring-lime-400/10`
    - Disabled: `cursor-not-allowed bg-slate-100 text-slate-400 opacity-60 dark:bg-white/5 dark:text-slate-500`
  - `singleValue`: `truncate text-slate-800 dark:text-white`
  - `placeholder`: `truncate font-medium text-slate-400 dark:text-slate-500`
  - `input`: `text-slate-800 dark:text-white [&_input]:!border-0 [&_input]:!outline-none [&_input]:!ring-0 [&_input]:!shadow-none`
  - `indicatorsContainer`: `shrink-0 gap-1 pl-1.5`
  - `indicatorSeparator`: `my-1.5 w-px bg-slate-200 dark:bg-white/10`
  - `dropdownIndicator`: `rounded-lg p-0.5 transition` dengan `text-brand-600 dark:text-lime-300` saat fokus dan `text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-white` saat normal.
  - `menu`: `z-[80] my-1.5 overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-1.5 shadow-float dark:border-white/10 dark:bg-[#1A1728]`
  - `menuList`: `sikas-scroll max-h-56 space-y-0.5 overflow-y-auto`
  - `option`:
    - `compact`: `cursor-pointer rounded-xl px-2.5 py-1.5 text-left text-[11px] font-bold transition`
    - `md`: `cursor-pointer rounded-xl px-3 py-2 text-left text-[12px] font-semibold transition`
    - Selected: `bg-pastel-lavender/90 text-brand-800 dark:bg-brand-500/25 dark:text-brand-200`
    - Focused: `bg-slate-100 text-slate-900 dark:bg-white/10 dark:text-white`
    - Default: `text-slate-700 dark:text-slate-200`
  - `noOptionsMessage`: `px-3 py-3 text-center text-[11px] font-medium text-slate-400 dark:text-slate-500`

#### D. Komponen `KwitansiRowActions`
- Menerima `{ item: KwitansiRowItem; onPrint: (id: number, format: KwitansiFormat) => void; onPreview: (url: string) => void }`.
- Menyimpan state `format` bertipe `KwitansiFormat` dengan nilai awal `3`.
- Merender `<KwitansiSelect<KwitansiFormat> options={KWITANSI_FORMAT_OPTIONS} value={format} onChange={(val) => val && setFormat(val)} size="compact" usePortal isSearchable={false} />` di dalam `<div className="w-36 text-left">` (mempertahankan lebar kolom aksi yang sudah ada).
- Mempertahankan tombol **PDF** dan **View** dengan handler & tampilan Neo-Bento yang sama.

### 3.2 Pembaruan 4 File Tab Kwitansi
Pada `TabReguler.tsx`, `TabKinerja.tsx`, `TabSilpa.tsx`, dan `TabKinerjaSilpa.tsx`:
1. Hapus `import Select from 'react-select'` serta definisi lokal `formatOptions` dan `KwitansiRowActions`.
2. Import `KwitansiSelect`, `KwitansiRowActions`, dan `KwitansiFormat` dari `./components/KwitansiSelect`.
3. Perbarui tipe parameter `handlePrintClick` & state `selectedKwitansiType` agar konsisten dengan `KwitansiFormat` (tetap `1 | 2 | 3 | 4`).
4. Pada **Modal Generate Batch**:
   - Ubah wrapper luar `<div className="relative overflow-hidden">` menjadi `<div className="relative overflow-visible rounded-[26px]">`.
   - Isolasi elemen blur dekoratif ke dalam `<div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[26px]"><div className="absolute -right-10 -top-16 h-40 w-40 rounded-full bg-lime-400/20 blur-3xl dark:bg-lime-400/10" /></div>` sehingga efek glow tetap rapi di sudut modal tanpa memotong dropdown select.
   - Ganti `<Select id="generate_year" ... />` menjadi:
     ```tsx
     <KwitansiSelect
         inputId="generate_year"
         className="mt-1"
         size="md"
         isSearchable
         isDisabled={processing}
         placeholder="Pilih Tahun Anggaran..."
         noOptionsMessage="Tahun anggaran tidak ditemukan"
         options={availableYears.map((year) => ({
             value: year.id.toString(),
             label: year.tahun,
         }))}
         value={generateYear}
         onChange={(val) => setGenerateYear(val ?? '')}
     />
     ```

---

## 4. Cakupan & Keamanan

- Tidak mengubah endpoint API, route Inertia, parameter cetak/preview PDF, maupun logika batch generate/download/delete.
- Tidak mengubah `<select>` native `Ukuran Kertas` dan `Ukuran Font` di modal Download All yang sudah berfungsi baik pada light dan dark mode.
- Tidak mengubah `html { zoom: 0.8 }` pada `app.css` maupun komponen global `Modal.tsx`/`DataTable.tsx`.

---

## 5. Rencana Verifikasi

1. Jalankan `npm run build` (`tsc && vite build`) dan pastikan lulus dengan exit code `0`.
2. Lakukan peninjauan dua sumbu (`/code-review`: **Standards** & **Spec**) terhadap perubahan yang dibuat.
3. Verifikasi manual/visual pada halaman Kwitansi (dark mode & light mode, layar desktop `>= 1024px` dengan `zoom: 0.8` serta mobile `< 1024px`):
   - Dropdown Format (1–4) di baris atas dan baris bawah tabel menempel tepat di kontrol, lebar sama dengan kontrol, kontras teks terbaca jelas, tidak terpotong tabel, dan memilih format memperbarui aksi `PDF` serta `View`.
   - Dropdown Tahun Anggaran di modal Generate Kwitansi Otomatis tampil Neo-Bento di dark & light mode, dapat dicari dengan ketikan, dan tidak terpotong batas bawah modal.
