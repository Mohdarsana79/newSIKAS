# SIKAS — Redesign UI Menyeluruh "Neo-Bento Full-Color"

- Tanggal: 2026-11-12
- Status: **SELESAI — W0–W8 diimplementasikan** (shell, design system, Dashboard, Penganggaran/RKAS/Perubahan/SiLPA, Dokumen SPJ, Laporan, Penatausahaan/BKU–Rekapitulasi–STS, Data Master, Profil, SK & Surat, Arkas Tools, Integrasi, Backup).
- Verifikasi: `npm run build` (`tsc && vite build`) exit 0 setelah setiap wave (W1–W8). Audit akhir: sisa class legacy hanya di 4 file area dokumen/cetak yang sengaja dibekukan (1.778 token); `print:` 46, `window.open` 47, `window.print()` 1 — tidak berubah dari baseline per wave (`docs/ui-redesign/tools/verify-w2.py` + `.baseline-w*/`).
- Catatan QA: halaman dengan area laporan cetak (Summary RKAS, Summary RKAS Perubahan, Rekapitulasi) & canvas Kop Surat sengaja mempertahankan styling dokumen aslinya agar output cetak/PDF tidak berubah.
- Referensi visual: `download (2).jpg` (dashboard Eduplex) + preview yang dihasilkan di `docs/ui-redesign/preview/`
- Dokumen pendukung: `docs/ui-redesign/00-page-inventory.md` (audit 103 halaman + 63 komponen)
- Spec sebelumnya: `2026-11-12-sikas-neo-bento-dashboard-ui-design.md` (hanya shell + Dashboard; spec ini memperluas ke seluruh aplikasi dan merevisi aksen)

---

## 1. Latar Belakang & Masalah

Audit repo menemukan kontras ekstrem:

- Dari **103 file halaman**, hanya **Dashboard** yang bergaya Neo-Bento. **95 halaman** masih legacy (`bg-white dark:bg-gray-800`, indigo/biru/purple, kartu polos, tanpa motion).
- App shell (sidebar/navbar/layout) sudah gelap + pill, tetapi **menempel ke tepi browser** (fixed `left-0 top-0`, tanpa margin) sehingga terasa belum "modern app".
- Elemen UI berulang masih diduplikasi manual: 60 halaman memakai `<table>` (134 tabel), 68 halaman kartu legacy, 54 halaman modal legacy, 25 halaman paginasi buatan sendiri.
- 12 tab fork (Kwitansi/Tanda Terima/Dokumen) 94–96% identik; 3 pasang file identik (BAST vs Surat Pesanan).
- 28 file punya CSS `print:` + 19 pemanggil PDF (`window.open` dengan parameter `paper_size`, `orientation`, `font_size`, `tahap`, `bulan`).

**Tujuan pengguna:** UI modern, cantik, full-color, full-animation, responsif, interaktif, rapi — seperti gambar referensi — **tanpa mengubah logika apa pun**, plus sidebar diberi jarak dari tepi browser.

---

## 2. Non-Goals (Batasan Keras)

1. **Tidak mengubah logika**: state/hook/handler, axios/route/Inertia props, kalkulasi angka, validasi, urutan & isi kolom data, nama field.
2. **Tidak mengubah**: file PHP, controller, model, migration, route, middleware, Blade PDF/email.
3. **Tidak mengubah output cetak/PDF**: class `print:`, parameter `window.open`, layout Blade. Halaman Summary/Rekapitulasi boleh di-restyle di layar, tetapi hasil cetak harus identik.
4. **Tidak menambah dependency runtime baru** (tanpa framer-motion dll). Animasi memakai Tailwind + hook lokal yang sudah ada (`TiltCard`, `Reveal`, `useCountUp`, `useReducedMotion`).
5. **Tidak mengubah alur navigasi**: item sidebar & route tetap; mobile tetap drawer (bukan bottom-nav baru).
6. **Di luar scope**: Landing page & halaman Auth (sudah didesain terpisah), kecuali token warna/font global yang dipakai bersama.

---

## 3. Bahasa Visual — "SIKAS Neo-Bento"

### 3.1 Palet

| Token | Nilai | Pemakaian |
|---|---|---|
| `lime-400` | `#D8F275` | Aksen utama: item aktif sidebar, CTA primer, highlight chart, penanda "hari ini". **Selalu berpasangan dengan teks `ink-950`.** |
| `lime-300 / lime-500` | `#E5F7A3` / `#C5E84E` | Gradien tombol aktif, hover, glow |
| `ink-900` | `#1E1D2E` | Sidebar, navbar pill aktif, teks judul, tooltip chart |
| `ink-950` | `#14131F` | Teks di atas lime, latar kartu promo |
| `canvas` | `#F4F5FA` | Kanvas aplikasi + aurora radial (violet/lime/peach 14–32% opacity) |
| `surface` | `#FFFFFF` | Kartu bento & tabel |
| `brand-500` | `#7C5CFF` | Warna data-viz (area chart, donut, bar sekunder), avatar, ikon fase |
| Pastel | `lavender #EFEAFF`, `mint #E4F8EE`, `peach #FFE9DC`, `sky #E7F0FF`, `amber #FFF4D6`, `rose #FFE7E9` | Tile ikon, badge status, chip, empty state |
| Emas `#E8C87D` | **Dihapus dari UI aplikasi** (tetap di Landing) agar tidak bentrok dengan lime |

Aturan kontras: lime/amber/peach **tidak pernah** dipakai sebagai warna teks di atas putih; teks selalu `ink-500/700/900`. Target WCAG AA (teks 4.5:1, UI 3:1).

### 3.2 Tipografi

- **Plus Jakarta Sans** (sudah di-bundle di `public/fonts`) untuk seluruh UI aplikasi — termasuk heading & angka. Fraunces hanya Landing.
- Skala: judul halaman 26/800, judul kartu 14–16/800, label 10–11/700 uppercase tracking 0.14–0.18em, isi 11–12/500–600, nominal besar 22–26/800 dengan `tabular-nums`.
- Angka uang wajib `font-variant-numeric: tabular-nums` agar kolom tabel lurus.

### 3.3 Radius, bayangan, border

- Kartu: `rounded-[26px]`; shell/modal: `rounded-[28px]–[30px]`; kontrol: `rounded-2xl`/`rounded-xl`; pill: `rounded-full`.
- Border kartu: `1px` putih di light (`border-white` di atas kanvas) + hairline `ink-900/5`; dark: `white/8`.
- Bayangan: `card` (`0 18px 45px -28px`), `card-hover`, `float` (sidebar/modal), `lime` (glow CTA), `nav`.
- Aurora kanvas: 4 radial gradient lembut (violet kiri-atas, lime kanan-atas, peach kanan-bawah, violet kiri-bawah).

### 3.4 Motion (full-animation, sadar performa)

| Interaksi | Implementasi |
|---|---|
| Entrance kartu/baris | `animate-rise` + stagger 40–60ms per item, maksimum 8 item pertama |
| Angka metrik | `useCountUp` 900ms saat mount |
| Hover kartu stat | lift `-translate-y-1` + shadow naik; tile ikon `scale-110` |
| Tilt 3D | `TiltCard` hanya di kartu statistik dashboard (bukan tabel) |
| Hover baris tabel | tint lime 4–6% + actions muncul |
| Tab | pill aktif dengan latar ink/lime + transisi 200ms |
| Modal | scale 0.96→1 + backdrop blur, 220ms |
| Toast | slide-in kanan + progress auto-dismiss |
| Sidebar collapse | lebar 268→84, label fade+scale, durable di localStorage (perilaku lama) |
| Loading | skeleton shimmer (bukan spinner penuh layar) |
| reduced-motion | semua animasi & transition dimatikan via `useReducedMotion` + media query |

Performa: halaman BKU/Rekapitulasi bisa ribuan baris → tidak ada animasi per-baris untuk seluruh data; stagger hanya untuk 8 baris pertama, baris lain statis. Tidak ada animasi loop di halaman data (hanya indikator status halus).

---

## 4. App Shell Baru

### 4.1 Sidebar mengambang (menjawab permintaan langsung)

- `fixed inset-y-3 left-3 w-[268px] rounded-[30px]` — **margin 12px dari tepi atas/kiri/bawah**, sudut membulat, shadow float, ring `white/10`.
- Gradien gelap `#252438 → #1E1D2E → #15141E` + blob violet/lime dekoratif (blur 2xl).
- Brand: tile lime bergradien + wordmark SIKAS + kicker lime uppercase.
- Nav item: tinggi 40px, `rounded-2xl`, gap 12px; aktif = gradien lime + teks `ink-950` + glow lime + dot penanda; hover = `white/6` + ikon scale.
- Group accordion (Data Master, Fitur Pelengkap, Integrasi) dengan chevron rotasi.
- Kartu bawah lime "ARKAS Desktop" dengan tombol arrow melingkar yang menonjol keluar kartu (bukan terpotong).
- Collapse: rail mini 84px; ikon terpusat + tooltip; tombol toggle di header sidebar.
- Mobile: drawer `inset-y-3 left-3 right-[72px]` (melayang, tidak menempel), backdrop blur + dim, animasi slide-in.

### 4.2 Navbar

- Sticky `top-3`, kartu glass `rounded-[22px]`, `bg-white/72 + backdrop-blur`, shadow nav lembut (tidak full-width menempel).
- Isi: sapaan personal + nama sekolah, search pill `⌘K`, tombol (notifikasi dengan badge peach, fullscreen, dark mode, Copilot violet berpulse), avatar ring lime + nama/peran.
- Header per-halaman (`header` prop) tetap didukung; konten filter halaman boleh dipindah ke area konten tanpa mengubah handler.

### 4.3 Kanvas konten

- `aurora-canvas` (violet/lime/peach lembut), padding 12–16px mengelilingi shell; area konten berjarak dari sidebar.
- Lebar konten mengikuti layar (tanpa max-width kaku) agar tabel lebar tetap nyaman; halaman cetak tetap.

---

## 5. Komponen Sistem (Wave 0)

Komponen presentasional baru di `resources/js/Components/ui/` (semua menerima `className` & meneruskan props):

1. `PageHeader` — breadcrumb, judul, badge, subtitle, slot aksi kanan. Menggantikan 29 header inline.
2. `Surface` / `Panel` — pembungkus kartu standar (varian `flat`, `glass`, `ink`).
3. `StatCard` v2 — tile pastel, label, nilai, delta, progress/sparkline, tilt opsional.
4. `DataTable` — wrapper `table` responsif (header sticky, hover row, sel tabular, kolom aksi, loading skeleton, empty state), tanpa menyentuh isi data.
5. `Pagination` — pill nomor + prev/next + info "x–y dari n" (menggantikan 25 paginasi ad-hoc).
6. `Tabs` — varian `pill-dark` (tab halaman) & `segmented` (filter grafik); aksesibel (role tablist, keyboard).
7. `Badge` / `StatusPill` — pastel + dot, varian status domain (Lunas/Proses/Aktif/Terjadwal/dll).
8. `EmptyState` — tile ikon, judul, deskripsi, CTA lime.
9. `Modal` v2 — header ikon pastel, body scroll, footer sticky, animasi spring, `maxWidth` sama seperti sekarang (API kompatibel).
10. `Toast` v2 — posisi kanan-atas, varian sukses/error/info, auto-dismiss.
11. `Skeleton` — shimmer untuk tabel/kartu.
12. `IconTile` — tile pastel berukuran konsisten (36/40/44px).
13. `FilterBar` — wadah search pill + chip filter + select + sort (komposisi kontrol existing).
14. `ChartTheme` — konfigurasi ApexCharts terpusat (warna lime/violet/peach/sky, grid, tooltip ink, font).

Utilitas CSS baru di `resources/css/app.css`: token `--sikas-*`, `.aurora-canvas`, `.bento-surface`, `.glass-nav`, `.nav-active`, `.tabular`, keyframes rise/shimmer/pulse-soft/float, dan override tabel.

Komponen lama tetap dipakai sebagai API: `PrimaryButton`/`SecondaryButton`/`TextInput`/`InputLabel`/`InputError`/`DatePicker`/`SearchableSelect`/`CurrencyInput` di-restyle di tempat (bukan diganti nama) agar 46/39 halaman pemakai tidak berubah logika.

---

## 6. Pola Halaman

1. **Halaman daftar (index/CRUD)** — PageHeader + strip 2–3 metrik ringkas + tab varian + FilterBar + daftar kartu/daftar baris + paginasi. Contoh pilot: Penganggaran.
2. **Halaman tabel padat (BKU, Rekapitulasi, RKAS rincian)** — chrome baru (header, toolbar, kartu pembungkus, badge status, paginasi), tabel tetap `<table>` dengan data & urutan kolom sama; sticky header; font tabular; tanpa animasi per-baris.
3. **Halaman dokumen SPJ (Kwitansi/Tanda Terima/BAST/SP/Dokumen)** — pola tab fork diseragamkan secara visual (satu komponen tab + kartu daftar), isi & aksi tetap.
4. **Halaman summary/cetak** — restyle layar saja; `print:` dan parameter PDF tidak disentuh.
5. **Form & modal** — input rounded-xl, label kecil uppercase, section card pastel tipis, footer sticky, tombol lime/ink.
6. **Profil/Settings/Backup/Integrasi** — kartu pengaturan bertema sama.
7. **Auth & Landing** — tidak diubah.

---

## 7. Rencana Implementasi (mengacu audit)

| Wave | Isi | File | Catatan risiko |
|---|---|---|---|
| **W0** | Token + utilitas CSS + 14 komponen sistem + restyle komponen shared existing | ±14 file komponen + `app.css` | Tidak menyentuh halaman; build harus hijau |
| **W1** | Shell final (sidebar mengambang + navbar) + Dashboard penyempurnaan + **pilot Penganggaran Index** & tab varian | ±8 file | Titik approval visual sebelum gelombang besar |
| **W2** | Dokumen SPJ (Kwitansi, Tanda Terima, BAST, Surat Pesanan, Dokumen) | 22 file | 12 tab fork; ubah visual saja, fork tetap |
| **W3** | Laporan (SPTJ, SPMTH, SP2B, LPH) | 6 file | — |
| **W4** | RKAS (Rincian, Grafik, Rekap, Tahapan, Lembar Kerja 221, Alur Kas, RKA Bulanan) | 12 file | Tabel lebar & cetak |
| **W5** | RKAS Perubahan | 11 file | Fork 66% dari RKAS |
| **W6** | SilpaRkas | 10 file | — |
| **W7** | Penatausahaan (BKU 3.752 baris, Rekapitulasi 3.057 baris, STS, Dokumen) | 11 file | **Risiko tertinggi**, kerjakan terakhir dengan tes build + cek print |
| **W8** | Profil, SK & Surat, Arkas Tools, Referensi Kode, Integrasi, Backup | 16 file | — |

Setiap wave: hanya mengubah JSX/className + memakai komponen baru; diff logika harus nol.

---

## 8. Verifikasi & Kriteria Terima

1. `npm run build` (tsc + vite) exit 0 tanpa error TypeScript.
2. Grep memastikan tidak ada perubahan pada handler/axios/route (review diff per wave).
3. Checklist visual per halaman: light/dark, 1440px, 1024px, 768px, 390px; sidebar rail mini; drawer mobile; fokus keyboard terlihat.
4. Halaman cetak: bandingkan hasil `print preview` sebelum/sesudah (tidak boleh berubah).
5. `prefers-reduced-motion` aktif → tanpa animasi.
6. Tidak ada dependency baru di `package.json`.
7. Lighthouse/DevTools: tidak ada layout shift besar; animasi memakai transform/opacity.

---

## 9. Keputusan yang Didelegasikan (decision log)

Karena pengguna menyerahkan keputusan desain:

1. Aksen utama **lime**, violet sebagai warna data; emas keluar dari UI aplikasi.
2. **Plus Jakarta Sans** untuk seluruh UI aplikasi.
3. Sidebar **mengambang 12px** dengan sudut 30px (permintaan eksplisit).
4. Motion level **rich-but-clean**, tanpa library baru.
5. Dark mode **dipertahankan** (light sebagai acuan desain).
6. Print/PDF **tidak berubah**.
7. Preview statis dulu → approval → baru implementasi.
