# SIKAS Welcome Page — Luxury Modern Landing Redesign

- Tanggal: 2026-11-12
- Status: Disetujui (menunggu review spec)
- File utama: `resources/js/Pages/Welcome.tsx`
- Referensi visual: `Modern Luxury Real Estate Landing Page.jpg` (struktur alur diadaptasi, bukan asetnya)

## 1. Tujuan

Membangun ulang tampilan halaman `/` (Inertia page `Welcome`) menjadi landing page modern, berkelas, penuh animasi, interaktif, dan cantik — tanpa mengubah satu pun logika aplikasi.

Ukuran keberhasilan:

1. Halaman tampil premium di **dark mode (default aplikasi)** dan tetap elegan di light mode.
2. Animasi hidup (Remotion Player live + CSS reveal) namun tidak mengganggu aksesibilitas atau performa.
3. `npm run build` lulus `tsc` strict + `vite build`.
4. Semua perilaku fungsional yang lama identik: conditional `auth.user` / `hasUsers`, route `login`/`register`/`dashboard`, link Panduan, `DarkModeSwitcher`, `FullscreenSwitcher`, `Head` title, dan kredit footer.

## 2. Batasan (non-goals)

- **Tidak** mengubah `routes/web.php`, controller, middleware, props Inertia, atau file PHP apa pun.
- **Tidak** mengubah komponen lain (`Navbar`, `Sidebar`, dsb) atau layout autentikasi.
- **Tidak** mengubah `fontFamily.sans` global — font baru hanya dipakai di dalam landing page.
- **Tidak** menambah request ke domain pihak ketiga saat runtime (font self-host).
- **Tidak** membuat testimoni/nama sekolah fiktif. Section testimoni diganti band angka/kapabilitas.
- **Tidak** menambah dependency animasi lain (framer-motion dsb). Animasi non-Remotion memakai CSS + IntersectionObserver + requestAnimationFrame.

## 3. Konteks teknis yang ditemukan

| Fakta | Implikasi desain |
|---|---|
| `resources/views/app.blade.php` punya `<html class="dark">` | Aplikasi **dark-first**; dark mode adalah tampilan utama yang harus dipoles lebih dulu |
| Link font Figtree di-comment | `font-sans` = fallback sistem; jangan andalkan Figtree |
| Tailwind 3.4.19 (`darkMode: 'class'`), token HSL di `app.css` | Perluasan token/utility harus kompatibel Tailwind 3 |
| React 18.2, Inertia 2, TS strict, Vite 7 | `@remotion/player` peer `react >=16.8` ✔ |
| `public/hot` ada | Vite dev server dipakai saat pengembangan; build produksi harus tetap jalan |
| Belum ada aset foto produk | Visual memakai gradient-art SVG/CSS + komposisi Remotion; tanpa foto stok |

## 4. Sistem visual

### 4.1 Token warna

| Token | Dark (default) | Light |
|---|---|---|
| `ink` (background) | `#0B0A12` → `#12101C` | `#FBF8F3` |
| `ink-soft` (surface) | `#15121F` | `#FFFFFF` |
| `violet` (primary) | `#7C5CFF` | `#5B3DF5` |
| `violet-deep` | `#3D2A82` | `#EDE7FF` |
| `gold` (accent) | `#E8C87D` | `#B98A2E` |
| `gold-soft` | `#F5DCA8` | `#E2C079` |
| teks utama | `#F5F3FF` | `#14121A` |
| teks sekunder | `rgba(245,243,255,0.66)` | `rgba(20,18,26,0.64)` |
| hairline | `rgba(232,200,125,0.22)` | `rgba(185,138,46,0.28)` |
| glass | `rgba(255,255,255,0.06)` | `rgba(255,255,255,0.72)` |

Diterapkan sebagai warna Tailwind tambahan (`ink`, `gold`, `violet` brand) + util `.landing-*` scoped di `app.css`. Tidak menyentuh token HSL `--primary` dkk. milik app.

### 4.2 Tipografi

- **Display**: `Fraunces` (variable, wght 300–700, opsz 9–144) — H1, H2, angka besar.
- **Body/UI**: `Plus Jakarta Sans` (variable, wght 300–800) — paragraf, tombol, label.
- Self-host: `public/fonts/*.woff2` + `@font-face` di `app.css` (`font-display: swap`).
- Kelas Tailwind baru: `font-display` dan `font-landing`; dipakai **hanya** di komponen `Landing/*`.
- Skala: H1 `clamp(2.6rem, 6vw, 4.6rem)`; H2 `clamp(2rem, 3.6vw, 3.2rem)`; body `1.0625rem/1.75`.
- Eyebrow: 11–12px, uppercase, `tracking-[0.28em]`, warna gold.

### 4.3 Bahasa visual

- Sudut super-rounded: section card `2.5rem`, kartu `1.5rem`, tombol pill.
- Glassmorphism + hairline emas + inner highlight tipis.
- Grain halus (SVG noise data-URI, opacity 3–5%) di atas background.
- Gradient signature: `violet → gold` untuk satu kata di H1 dan aksen tombol.
- Aurora blob violet/gold yang bergerak pelan sebagai latar hero & CTA.

## 5. Struktur halaman & copy

Semua copy berbahasa Indonesia. Teks yang sudah ada dipertahankan maknanya.

### 5.1 Navbar (`Landing/Navbar.tsx`)

- Sticky, muncul sebagai pill glass `rounded-full` dengan border hairline; mengecil (padding & tinggi berkurang) setelah scroll > 24px.
- Kiri: monogram SVG baru + wordmark `SIKAS` + sublabel kecil `Kelola Anggaran, Raih Prestasi`.
- Tengah (desktop): anchor `Fitur` → `#fitur`, `Modul` → `#modul`, `Cara Kerja` → `#cara-kerja`. Active link mengikuti section yang terlihat (IntersectionObserver).
- Kanan: `FullscreenSwitcher`, `DarkModeSwitcher`, `Panduan` (link YouTube lama, `target="_blank" rel="noopener noreferrer"`), lalu tombol:
  - `auth.user` → `Dashboard` (`route('dashboard')`)
  - else → `Masuk` (`route('login')`) + `Daftar` (`route('register')`) **hanya jika `!hasUsers`**
- Mobile: tombol hamburger → panel glass dropdown berisi anchor + tombol auth yang sama.
- Progress bar scroll tipis (violet→gold) di paling atas.

### 5.2 Hero (`Landing/Hero.tsx`)

Kartu besar full-bleed `rounded-[2.5rem]`, `min-h-[88vh]`, overflow hidden.

- Badge pill: `Terintegrasi ARKAS · Standar BOSP`
- H1: `Kelola Anggaran Sekolah` / `dengan` **`Percaya Diri`** (kata terakhir gradient violet→gold)
- Subcopy: `SIKAS menyatukan perencanaan RKAS, penatausahaan BKU, pelaporan PDF & Excel, serta sinkronisasi ARKAS dalam satu alur yang transparan dan akuntabel.`
- CTA primer (conditional, sama seperti logika lama):
  - `!auth.user && !hasUsers` → `Mulai Sekarang` → `route('register')`
  - `auth.user` → `Ke Dashboard` → `route('dashboard')`
  - `!auth.user && hasUsers` → `Masuk Sekarang` → `route('login')`
- CTA sekunder: `Jelajahi Fitur` → `#fitur` (smooth scroll).
- Trust line kecil: `RKAS · BKU · Laporan PDF/Excel · Sinkron ARKAS`
- Kanan (desktop) / bawah (mobile): **Remotion Player** komposisi `sikas-hero`.
- Di bawah hero: **glass quick-bar** (meniru search bar referensi, fungsinya jujur sebagai navigasi):
  - 3 item: `Perencanaan RKAS`, `Penatausahaan BKU`, `Pelaporan & Ekspor` (ikon + sublabel)
  - tombol kanan: `Lihat Modul` → `#modul`

### 5.3 Trust strip (`Landing/TrustStrip.tsx`)

4 kartu glass, ikon garis emas:
1. `Transparan` — *Setiap transaksi tercatat dan siap diaudit kapan saja.*
2. `Aman` — *Peran dan hak akses berlapis melindungi data anggaran sekolah.*
3. `Akuntabel` — *Mengikuti kaidah BOSP dan format pelaporan dinas.*
4. `Terintegrasi` — *Sinkron dengan ARKAS Tools tanpa entri ulang.*

### 5.4 Why SIKAS (`Landing/WhySection.tsx`, `id="fitur"`)

Split 2 kolom. Kiri: eyebrow `MENGAPA SIKAS`, H2 `Lebih dari Sekadar Aplikasi Anggaran`, paragraf `SIKAS tidak berhenti di pencatatan angka. Kami merapikan alur kerja bendahara — dari pagu hingga laporan siap tanda tangan.`, checklist 4 item (check bulat gold):
- Empat varian anggaran: Reguler, Kinerja, SiLPA, dan Kinerja–SiLPA
- RKAS bertahap & RKAS perubahan dengan validasi kode rekening
- BKU, buku pembantu, pajak, dan penutupan kas dalam satu alur
- Ekspor PDF & Excel siap cetak sesuai format dinas

CTA: `Pelajari Modul` → `#modul`.

Kanan: visual CSS/SVG animasi alur tiga tahap `RKAS → BKU → Laporan` — kartu kaca bertumpuk dengan garis penghubung yang "mengalir" (dash animation), chip status muncul berurutan saat masuk viewport.

### 5.5 Modul Unggulan (`Landing/ModulesSection.tsx`, `id="modul"`)

Heading: eyebrow `MODUL UNGGULAN`, H2 `Satu Aplikasi untuk Seluruh Siklus Anggaran`, link kanan `Lihat Semua Fitur →` (anchor `#fitur`).
4 kartu (grid 1/2/4 kolom), masing-masing: thumbnail gradient-art SVG unik (tinggi ~160px), badge kiri-atas (`Inti`/`Populer`/`Baru`), ikon hati **tidak dipakai** (diganti ikon bookmark non-fungsional? — tidak: kartu murni informatif, tanpa ikon dekoratif berlebih), judul, subjudul, meta chip:

1. `RKAS & Pagu Anggaran` — *Inti* — `4 varian` · `RKAS perubahan` · `Validasi rekening`
2. `BKU & Penatausahaan` — *Inti* — `BKU` · `Buku pembantu` · `Pajak`
3. `Laporan & Ekspor` — *Populer* — `PDF` · `Excel` · `Rekap realisasi`
4. `Sinkron ARKAS` — *Baru* — `ARKAS Tools` · `Tarik RKAS` · `Tarik BKU`

Interaksi: hover 3D tilt + glare + border glow. Tidak ada navigasi ke route baru (menghindari perubahan logika rute).

### 5.6 Cara Kerja (`Landing/StepsSection.tsx`, `id="cara-kerja"`)

Eyebrow `CARA KERJA`, H2 `Tiga Langkah Menuju Anggaran yang Rapi`. 3 kartu bernomor `01/02/03` dengan konektor putus-putus di desktop.

1. `Siapkan Anggaran` — *Susun RKAS per kode rekening, tetapkan pagu, dan siapkan anggaran kas.*
2. `Catat Penatausahaan` — *Rekam BKU dan buku pembantu; pajak serta penutupan kas terhitung otomatis.*
3. `Laporkan & Evaluasi` — *Ekspor laporan siap cetak dan pantau realisasi per bulan.*

### 5.7 Band angka (`Landing/StatsSection.tsx`)

Hanya angka faktual/kapabilitas, tanpa klaim pengguna fiktif. Counter beranimasi saat masuk viewport:
- `4` — Varian anggaran
- `2` — Format ekspor (PDF & Excel)
- `24/7` — Akses tanpa batas jam kerja (counter khusus tanpa animasi angka)
- `100%` — Transaksi tercatat

Ditambah marquee kapabilitas tipis: `RKAS · BKU · Buku Pembantu · Pajak · Penutupan Kas · Rekap Realisasi · ARKAS · Multi-Tahun`.

### 5.8 CTA banner (`Landing/CtaSection.tsx`)

Kartu gradient violet→gold gelap, radius besar, di dalamnya Remotion Player komposisi `sikas-cta` (orbit ring + chip `PDF`, `Excel`, `BKU`, `ARKAS`).

- H2: `Siap Menata Anggaran Sekolah Anda?`
- Sub: `Mulai dari RKAS pertama hari ini — tanpa instalasi tambahan.`
- Tombol conditional sama seperti hero.

### 5.9 Footer (`Landing/Footer.tsx`)

- Kiri: logo + `Sistem Informasi Kegiatan Anggaran Sekolah` + tagline.
- Tengah: anchor Fitur / Modul / Cara Kerja / Panduan.
- Kanan: `FullscreenSwitcher`? — tidak, cukup dark switcher tidak perlu. Cukup teks kredit.
- Baris bawah: `© 2025 SIKAS Team. Created By` + link YouTube penulis (teks & URL **dipertahankan persis**).

## 6. Spesifikasi animasi & interaksi

Semua animasi non-esensial dimatikan bila `prefers-reduced-motion: reduce` (hook `useReducedMotion`): reveal langsung tampil, Player `autoPlay={false}` dan menampilkan frame awal, parallax/magnetic/tilt nonaktif.

| Kategori | Detail |
|---|---|
| Remotion hero | Komposisi `sikas-hero`: 1200×900, 30fps, 300 frame (10s), loop mulus. Dashboard kaca miring 3D yang merakit diri: header `RKAS 2025 · Reguler`, 3 KPI chip, 8 bar chart spring-stagger, donut realisasi 0→78%, 4 baris ledger masuk, partikel rupiah naik, chip `ARKAS Sinkron ✓` berdenyut di frame 210+, light sweep diagonal. Frame 0 ≡ frame 300. |
| Remotion CTA | Komposisi `sikas-cta`: 800×600, 30fps, 240 frame (8s). Ring orbit berputar pelan, 4 chip teknis mengambang, glow breathing. |
| Player embedding | Lazy mount via `React.lazy` + IntersectionObserver; unmount saat jauh dari viewport; `autoPlay loop controls={false} clickToPlay={false} doubleClickToFullscreen={false} acknowledgeRemotionLicense`. |
| Scroll reveal | `Reveal` — fade + translateY(24px) + blur(6px) → normal, `transition 700ms cubic-bezier(.22,1,.36,1)`, stagger 80–120ms. |
| Hero ambient | Aurora blob (2–3) bergerak 18–26s, grid tipis, grain, parallax halus terhadap kursor (maks 12px). |
| Kursor | `MagneticButton`: tombol bergeser maks 6px mengikuti kursor; `TiltCard`: rotasi maks 7°, glare radial mengikuti posisi pointer. |
| Counter | `useCountUp` dengan easing, mulai saat terlihat, selesai 1.6s. |
| Marquee | translate-x loop CSS 32s, pause saat hover. |
| Nav | shrink on scroll, active anchor, progress bar scroll. |
| Tombol | shimmer sweep saat hover, focus ring emas 2px, `active:scale-[0.98]`. |

## 7. Arsitektur file

```
resources/js/Pages/Welcome.tsx                     # entry tipis: susun section + props (logika tetap)
resources/js/Components/Landing/Navbar.tsx
resources/js/Components/Landing/Hero.tsx
resources/js/Components/Landing/TrustStrip.tsx
resources/js/Components/Landing/WhySection.tsx
resources/js/Components/Landing/ModulesSection.tsx
resources/js/Components/Landing/StepsSection.tsx
resources/js/Components/Landing/StatsSection.tsx
resources/js/Components/Landing/CtaSection.tsx
resources/js/Components/Landing/Footer.tsx
resources/js/Components/Landing/ui/Reveal.tsx
resources/js/Components/Landing/ui/GlassCard.tsx
resources/js/Components/Landing/ui/MagneticButton.tsx
resources/js/Components/Landing/ui/TiltCard.tsx
resources/js/Components/Landing/ui/GradientText.tsx
resources/js/Components/Landing/ui/AuroraBackground.tsx
resources/js/Components/Landing/ui/SectionHeading.tsx
resources/js/Components/Landing/ui/Counter.tsx
resources/js/Hooks/useReveal.ts
resources/js/Hooks/useReducedMotion.ts
resources/js/Hooks/useCountUp.ts
resources/js/Remotion/theme.ts                     # warna/font bersama komposisi
resources/js/Remotion/HeroComposition.tsx
resources/js/Remotion/CtaComposition.tsx
resources/js/Remotion/PlayerStage.tsx              # wrapper lazy + viewport gate
public/fonts/*.woff2
tailwind.config.js                                 # + colors/keyframes/animation/shadow/fontFamily (aditif)
resources/css/app.css                              # + @font-face + util .landing-* (aditif)
package.json                                       # + remotion, @remotion/player (exact 4.0.543)
```

### 7.1 Kontrak komponen UI (wajib dipatuhi antar-modul)

```tsx
// Reveal.tsx
export function Reveal(props: {
  children: React.ReactNode;
  delay?: number;           // ms, default 0
  direction?: 'up' | 'down' | 'left' | 'right' | 'none'; // default 'up'
  className?: string;
  once?: boolean;           // default true
}): JSX.Element;

// GlassCard.tsx
export function GlassCard(props: {
  children: React.ReactNode;
  className?: string;
  glow?: boolean;           // default false
  padding?: 'none' | 'sm' | 'md' | 'lg'; // default 'md'
}): JSX.Element;

// MagneticButton.tsx
export function MagneticButton(props: {
  children: React.ReactNode;
  as?: 'button' | 'a';
  href?: string;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost'; // default 'primary'
  className?: string;
  target?: string;
  rel?: string;
  ariaLabel?: string;
}): JSX.Element;

// TiltCard.tsx
export function TiltCard(props: {
  children: React.ReactNode;
  className?: string;
  maxTilt?: number;         // derajat, default 7
  glare?: boolean;          // default true
}): JSX.Element;

// GradientText.tsx
export function GradientText(props: {
  children: React.ReactNode;
  className?: string;
}): JSX.Element;

// AuroraBackground.tsx
export function AuroraBackground(props: {
  variant?: 'hero' | 'section' | 'cta'; // default 'section'
  className?: string;
}): JSX.Element;

// SectionHeading.tsx
export function SectionHeading(props: {
  eyebrow: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  align?: 'left' | 'center'; // default 'center'
  className?: string;
}): JSX.Element;

// Counter.tsx
export function Counter(props: {
  to: number;
  suffix?: string;
  prefix?: string;
  decimals?: number;
  className?: string;
  raw?: string;             // bila diisi, tampilkan apa adanya tanpa animasi (mis. "24/7")
}): JSX.Element;

// PlayerStage.tsx
export function PlayerStage(props: {
  composition: 'hero' | 'cta';
  className?: string;
  aspectRatio?: number;     // default 4/3
  title?: string;
}): JSX.Element;

// Hooks
useReveal(opts?: { threshold?: number; rootMargin?: string; once?: boolean }): { ref: React.RefObject<HTMLDivElement>; visible: boolean };
useReducedMotion(): boolean;
useCountUp(to: number, opts?: { duration?: number; start?: boolean; decimals?: number }): string;
```

## 8. Remotion: catatan teknis

- Versi paket dipin `4.0.543` (semua paket Remotion harus versi sama).
- `Player` dirender inline (bukan iframe) → font halaman berlaku; tetap set `fontFamily` eksplisit di komposisi.
- Player **tidak** dipasang di SSR/awal muat: `React.lazy` + Suspense fallback placeholder gradient agar tidak ada layout shift.
- `acknowledgeRemotionLicense` dipakai untuk mematuhi kewajiban atribusi Player.
- **Lisensi Remotion**: gratis untuk individu/perusahaan ≤3 karyawan; organisasi lebih besar perlu lisensi komersial. Dicatat sebagai risiko legal bagi pihak yang men-deploy.
- Jika Player gagal dimuat (offline/JS error), `PlayerStage` menampilkan fallback statis bergaya sama (CSS gradient card) sehingga halaman tidak rusak.

## 9. Aksesibilitas & performa

- Target: kontras teks ≥ 4.5:1 di dark & light; focus ring terlihat di semua elemen interaktif.
- Anchor `<a href="#...">` asli untuk navigasi (bukan `onClick` scroll palsu) + `scroll-behavior: smooth` (dimatikan saat reduced motion).
- Section memakai `<section aria-labelledby>`; kartu dekoratif `aria-hidden`.
- Player diberi `aria-label` deskriptif; animasi autoplay tidak memuat suara.
- Tidak ada animasi pada properti layout (hanya `transform`/`opacity`/`filter`).
- Bundle: `remotion` + `@remotion/player` hanya dimuat oleh halaman Welcome (dynamic import) sehingga dashboard tidak terdampak.
- Gambar/ikon memakai SVG inline (tanpa request tambahan).

## 10. Rencana implementasi

1. **Fondasi**: install dependency, self-host font, perluas `tailwind.config.js`, util `.landing-*` di `app.css`.
2. **Hooks + UI primitives** (kontrak §7.1).
3. **Remotion**: `theme.ts`, `HeroComposition`, `CtaComposition`, `PlayerStage` (lazy + fallback).
4. **Sections** (dikerjakan paralel oleh beberapa penulis dengan file terpisah).
5. **Integrasi** `Welcome.tsx` (tipis, props & conditional dipertahankan).
6. **Verifikasi build + visual**, lalu code review dua sumbu (standards & spec).

## 11. Verifikasi

- `npm run build` — wajib 0 error (`tsc` strict + `vite build`).
- `npx tsc --noEmit` setelah perubahan besar.
- Jalankan `php artisan serve` + `npm run dev`, ambil screenshot headless (Edge/Chrome) pada 1440×2400 dan 390×1600: dark & light, desktop & mobile.
- Cek manual: semua tombol conditional masih benar untuk 3 state (`guest+hasUsers`, `guest+!hasUsers`, `auth`), switcher fullscreen/dark berfungsi, anchor scroll, reduced motion, tidak ada console error.

## 12. Risiko

| Risiko | Mitigasi |
|---|---|
| Bundel membengkak karena Remotion | Player hanya di halaman Welcome via dynamic import; verifikasi ukuran chunk build |
| Perf di laptop sekolah lama | Animasi transform/opacity, Player unmount di luar viewport, hormati reduced motion |
| Tailwind 3 tidak punya varian baru | Semua keyframes/animation/color dideklarasikan eksplisit di config |
| Struktur `<html class="dark">` membuat light mode jarang dipakai | Light mode tetap diuji lewat switcher |
| Kebingungan visual antar section karena ditulis paralel | Kontrak primitive §7.1 + token warna/tipografi tunggal |
