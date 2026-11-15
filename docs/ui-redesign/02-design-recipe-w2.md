# Resep Desain W2 — Dokumen SPJ (Kwitansi, Tanda Terima, BAST, Surat Pesanan, Dokumen)

Dokumen ini WAJIB dibaca sebelum mengerjakan W2. Tujuannya menyeragamkan hasil visual antar modul
dan memastikan **logika tidak berubah satu baris pun**.

Referensi visual: `docs/ui-redesign/preview/02-penganggaran.html` (pola kartu + tabel + modal) dan
`docs/superpowers/specs/2026-11-12-sikas-neo-bento-full-ui-redesign-design.md`.

---

## 1. Aturan keras

1. **Visual saja.** Yang boleh diubah: JSX/className, susunan wrapper visual, import komponen presentasional.
   Yang TIDAK boleh: state, useEffect, handler, useForm, axios/fetch, route()/router.*, window.open,
   parameter print/PDF, perhitungan angka, kondisi bisnis, teks pesan/validasi, urutan & isi kolom data,
   props interface, nama variabel data.
2. **Jangan menyentuh** file di luar scope tugasmu.
3. **Jangan** menjalankan `npm run build`/`tsc`, jangan commit/git.
4. **Dark mode wajib** berpasangan untuk setiap warna terang.
5. **Jangan pakai** `font-display` (Fraunces) — semua font-sans.
6. **Nominal & angka** di tabel/kartu wajib kelas `text-sikas-num`.
7. `print:` classes, `window.open(...)` dengan parameter `paper_size/orientation/font_size/tahap/bulan`
   **dipertahankan apa adanya**.
8. Jangan menambah fitur baru (search/filter/aksi yang belum ada). Kontrol filter yang sudah ada
   dipertahankan; restyle boleh, menambah state baru tidak.

---

## 2. Kelas & komponen yang dipakai

Token/utilitas (sudah ada di `resources/css/app.css` & `tailwind.config.js`):
- Kanvas & kartu: `sikas-card`, `sikas-card-hover`, `sikas-glass`
- Navigasi aktif: `nav-active`
- Tabel: bungkus dengan `<DataTable>` (otomatis memakai `.bento-table-wrapper`)
- Angka: `text-sikas-num`
- Warna: `lime-300/400/500`, `pastel-lavender/mint/peach/sky/amber/rose`, `brand-500/600`, `canvas`
- Shadow: `card`, `card-hover`, `float`, `lime`, `nav`, `pill`
- Animasi: `animate-rise` (+ `style={{ animationDelay: '60ms' }}`), `animate-pulse-soft`, `animate-spin`
- Dark: kartu `dark:bg-[#15131F]`, border `dark:border-white/10`, teks `dark:text-white` / `dark:text-slate-400`,
  pastel → `dark:bg-<warna>/10` + `dark:text-<warna>300`, lime tetap lime.

Komponen presentasional (`resources/js/Components/ui/`):
- `PageHeader` — `title`, `subtitle`, `breadcrumb=[{label,href?}]`, `badge`, `actions`, `className`
- `Surface` — kartu + header opsional (`title`, `subtitle`, `icon`, `actions`, `badge`, `padding`)
- `DataTable` — chrome tabel: `title`, `subtitle`, `icon`, `actions`, `footer`, `children` (isi `<table>`)
- `PillTabs` — `items=[{key,label,badge?}]`, `value`, `onChange`, `variant="solid"|"soft"`
- `StatusBadge` — `tone`: `success|warning|danger|info|violet|lime|neutral`, `dot`
- `IconTile` — `tone`: `lime|violet|mint|peach|sky|amber|rose|slate|ink`, `size`: `sm|md|lg`
- `EmptyState` — `icon`, `title`, `description`, `action`
- `FilterBar` — `children`, `end`
- `Skeleton` / `SkeletonRows`
- Shared: `Modal`, `Toast`, `PrimaryButton`, `SecondaryButton`, `DangerButton`, `TextInput`,
  `InputLabel`, `InputError`, `DatePicker`, `CurrencyInput`, `PrintSettingsModal`, `PdfPreviewModal`
  (semuanya sudah bergaya baru — pakai apa adanya).

Ikon: pakai `lucide-react` bila file sudah mengimpornya; jika belum, boleh pakai SVG inline
dengan `stroke-width={2}` seperti pola komponen lain. Jangan menambah dependency.

---

## 3. Pola halaman Index (Kwitansi / Tanda Terima / Dokumen)

Struktur target:

```tsx
<AuthenticatedLayout>                        {/* HAPUS prop header bergaya lama */}
  <Head title="..." />
  <div className="space-y-4">
    <PageHeader
      className="animate-rise"
      breadcrumb={[{ label: 'Dashboard' }, { label: 'Dokumen SPJ' }, { label: 'Kwitansi' }]}
      title="Kwitansi"
      badge={<StatusBadge tone="violet">SPJ</StatusBadge>}
      subtitle="..."        {/* teks lama boleh dipertahankan */}
    />

    <div className="animate-rise" style={{ animationDelay: '60ms' }}>
      <Surface padding="sm">
        {/* PillTabs: value & onChange = logika tab LAMA (routePrefix + router.visit), sama persis */}
        <PillTabs items={[...]} value={...} onChange={...} variant="solid" />
      </Surface>
    </div>

    <TabReguler ... />      {/* props & pemilihan tab tetap sama */}
  </div>
</AuthenticatedLayout>
```

- Jangan mengubah cara tab memilih komponen/props (`activeTab` dari `routePrefix`, `router.visit(route(...))`).
- Jika file Index punya `auth`/`penganggarans` prop, tetap diteruskan persis.

## 4. Pola tab besar (file 800–900 baris)

1. **Jangan sentuh apa pun sebelum `return (`** (kecuali baris import). Semua state/handler/effect
   harus tetap byte-identik.
2. Ganti wrapper luar lama (`py-8`/`max-w-*`/`bg-white` besar) menjadi `space-y-4` / `space-y-5`.
3. Baris judul + aksi: pakai `PageHeader` bila ada judul; jika tidak ada judul, langsung filter.
4. **Filter**: bungkus dalam `<Surface padding="sm">` atau `sikas-card p-4`; kontrol (`TextInput`,
   `DatePicker`, `Select`, tombol) tetap kontrol & handler yang sama, hanya styling.
   Label pakai kelas `text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-400`.
5. **Tabel**: bungkus tabel lama dengan `<DataTable title=... subtitle=... icon={<IconTile .../>} actions={...}>`
   lalu pertahankan `<table>`, `<thead>`, `<tbody>`, semua `<td>` dan datanya.
   - Hapus kelas warna lama di `<thead>/<tr>/<td>` yang bertentangan (`bg-gray-*`, `text-gray-*`,
     `divide-gray-*`, `hover:bg-gray-*`). Cukup andalkan `.bento-table-wrapper` (header & border otomatis).
   - Pertahankan kolom, urutan, formatter, dan isi sel apa adanya.
   - Sel nominal: tambahkan `text-sikas-num`.
   - Status: jika ada teks status, bungkus dengan `StatusBadge` tone yang sesuai — **teksnya tetap sama**.
   - Tombol aksi baris: `sikas-icon-btn` (ikon) atau pill kecil; `onClick`/`href`/title sama.
6. **Toolbar bawah tabel/paginasi**: pertahankan tombol & handler lama, restyle menjadi pill
   (`rounded-xl`, aktif `bg-lime-400 text-slate-950 shadow-lime`). Jangan mengubah state halaman.
7. **Empty state**: ganti blok kosong lama dengan `<EmptyState ...>` — teks tetap sama.
8. **Modal**: pakai `<Modal>` (sudah baru). Isi modal: header ikon pastel (`IconTile`) + judul +
   subtitle + tombol close; body `space-y-4`; footer sticky `border-t`. Semua field, urutan,
   name/value/onChange, validasi dan tombol aksi **identik**.
9. **Loading**: jika ada spinner manual, ganti visual dengan `Skeleton`/`SkeletonRows` bila mudah;
   jangan ubah kondisi loading-nya.
10. **Animasi**: `animate-rise` + delay 60/120/180ms pada kartu/filter/tabel (maks 4 pembungkus).

## 5. Pola BAST & Surat Pesanan

- `Index.tsx` (273/274 baris): PageHeader + (opsional) 2–3 kartu ringkas dari data yang SUDAH ada
  di props/state (jangan menambah perhitungan bisnis baru; hitung jumlah dokumen dari array yang ada
  hanya untuk tampilan) + toolbar filter + daftar kartu dokumen / tabel + panggilan modal yang sama.
- `ModalFormBast` / `ModalFormSuratPesanan`: chrome baru (header ikon, section card, footer sticky),
  semua field & handler sama.
- `ModalDetailBast` / `ModalDetailSuratPesanan`: kartu informasi + tabel/daftar isi, tanpa ubah data.
- **Pasangan file identik**: `Bast/ModalPreview.tsx` = `SuratPesanan/ModalPreview.tsx`,
  `Bast/ModalPrintSettings.tsx` = `SuratPesanan/ModalPrintSettings.tsx`,
  `Bast/ModalConfirmDelete.tsx` = `SuratPesanan/ModalConfirmDelete.tsx`.
  Terapkan kelas yang SAMA pada kedua pasangan agar tetap kembar.
- `window.open(...)` untuk cetak/PDF: jangan diubah.

---

## 6. Cara verifikasi sendiri (sebelum lapor)

1. Baca ulang file hasil edit; pastikan semua handler/route/axios/`window.open`/`print:` masih ada
   dengan nama & pemanggilan sama.
2. Grep di file yang kamu ubah: `bg-gray-`, `text-gray-`, `border-gray-`, `indigo-`, `purple-`,
   `font-display` → harus 0 (kecuali `dark:*` yang sudah dimigrasi).
3. Pastikan semua warna terang punya pasangan `dark:`.
4. Jangan jalankan build; laporkan ke Lead agar Lead yang menjalankan `npm run build`.

## 7. Format laporan ke Lead (`send_message` target: `lead`)

- Status & file yang diubah (harus persis scope)
- Ringkasan pola visual yang dipakai per halaman
- Checklist logika yang tidak berubah (state/handler/route/axios/window.open/print)
- Jumlah grep token legacy (harus 0)
- Risiko tersisa / hal yang perlu Lead cek
