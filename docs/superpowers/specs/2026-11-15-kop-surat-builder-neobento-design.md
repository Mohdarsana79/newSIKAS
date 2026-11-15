# Desain Redesign UI Neo-Bento Studio pada `KopSuratBuilder.tsx`

Tanggal: 2026-11-15

## Latar Belakang
Halaman Profil Sekolah (`SekolahProfile/Index.tsx` & `SekolahModals.tsx`) telah menggunakan desain Neo-Bento khas SIKAS (`Surface`, `IconTile`, `StatusBadge`, sudut `rounded-[26px]`, aksen `lime-400` dan pastel glow). Namun tab **Pengaturan Kop Surat** (`KopSuratBuilder.tsx`) masih memakai gaya kartu lama, radio input bawaan browser, Ribbon editor dengan aksen datar, dan 4 modal dengan tata letak polos.

## Keputusan Desain
1. **Header Hero Banner Neo-Bento**:
   - Kartu `sikas-card rounded-[26px]` dengan ambient blur glow (`pastel-lavender` & `pastel-mint`), `IconTile` (`tone="violet"`), `StatusBadge` (`MS Word Style`), serta grup tombol aksi cepat (`Perbesar Preview`, `Unduh PNG`, `Simpan Kop Surat`).
2. **Live Preview Studio Canvas (`Surface`)**:
   - Header studio dengan `IconTile` (`tone="mint"`), indikator live dot hijau, dan badge real-time (`2 Logo / 1 Logo`, `Garis Ganda / Tunggal / Tanpa Garis`, `2480 × 588 px`).
   - Latar kanvas bertekstur dot-grid halus (terang & gelap) di sekeliling kertas pratinjau `previewRef` agar terlihat kontras dan bersih. Atribut `data-kop-border="true"` dan filter `toBlob()` tetap dipertahankan.
   - Baris logo kiri/kanan dan teks pada `previewRef` menggunakan perataan atas (`items-start` dan `object-top`) agar bagian atas logo sejajar dengan baris pertama teks (`PEMERINTAH...`).
   - Bingkai studio (`rounded-xl shadow-lg ring-1`) dipisahkan ke pembungkus luar `previewRef`, `minHeight` dihapus, padding bawah dirapatkan (`pt-2 pb-0.5`), dan jarak atas garis pembatas dirapatkan (`mt-1` di `KopSuratBuilder.tsx`, `margin-top: 1px` di `partials/kop_border.blade.php`) agar kop rapat dengan garis pembatas pada hasil PDF maupun pratinjau.
3. **Bento Grid 2-Kolom Terpadu (`lg:grid-cols-12`)**:
   - **Kolom Kiri (`lg:col-span-7`)**: `Surface` terpadu untuk **Susunan & Upload Logo Kop**. Berisi 2 kartu pemilih interaktif (`2 Logo` vs `1 Logo`) tanpa radio bawaan yang kaku (menggunakan indikator ceklis `lime-400`), dilanjutkan 2 slot upload (**Logo Daerah** & **Logo Sekolah**) lengkap dengan bingkai pratinjau transparan dan state nonaktif yang jelas pada mode 1 logo.
   - **Kolom Kanan (`lg:col-span-5`)**: `Surface` khusus **Garis Pembatas Kop** dengan 3 kartu pemilih interaktif (`Garis 2 Ganda`, `Garis 1 Tunggal`, `Tanpa Garis`) lengkap dengan badge dan pratinjau visual mini.
4. **Editor Tiptap & MS Word Ribbon Studio (`Surface overflowVisible`)**:
   - Header dengan `IconTile` (`tone="amber"`) dan tombol `Reset ke Template Baku`.
   - Ribbon Bar 2 baris dikelompokkan dalam kapsul Bento; tombol aktif memakai aksen `lime` Neo-Bento dan popover warna/kapitalisasi bergaya `shadow-float`.
   - **Ribbon Custom Select Dropdowns (`react-select` unstyled)**:
     - Ketiga dropdown Ribbon (**Font**, **Ukuran**, **Spasi**) menggantikan `<select>` bawaan OS dengan `<Select unstyled isSearchable={false} />` di dalam kapsul trigger `rounded-xl border border-slate-200/90 bg-white py-0.5 pl-2.5 pr-1 shadow-sm dark:border-white/10 dark:bg-white/5` berlabel mikro di kiri dan kontrol `!min-h-[26px]`.
     - Floating menu bergaya Neo-Bento (`z-50 mt-2 overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-1.5 shadow-float dark:border-white/10 dark:bg-[#1A1728]`) dengan daftar `sikas-scroll max-h-56 space-y-0.5 overflow-y-auto`, item aktif `bg-lime-300/85 font-extrabold text-slate-900 dark:bg-lime-400/20 dark:text-lime-300` serta ikon `<Check />`.
     - Setiap opsi pada dropdown **Font** dirender memakai jenis huruf aslinya (`style={{ fontFamily: opt.value }}`) via `formatOptionLabel`.
     - Membuka dropdown `react-select` (`onMenuOpen`) atau klik di luar area Ribbon (`ribbonRef`) otomatis menutup popover `Aa` (`isCaseMenuOpen`), warna teks (`isColorPickerOpen`), dan stabilo (`isHighlightPickerOpen`).
5. **4 Modal Bergaya Neo-Bento (`KopModalShell`)**:
   - Mengekstrak helper internal `KopModalShell` dengan sudut `rounded-[26px]`, ambient blur glow sesuai tone (`violet`, `amber`, `mint`, `rose`), `IconTile`, `StatusBadge`, dan tombol tutup `X` untuk Modal Perbesar Preview, Konfirmasi Reset Template, Konfirmasi Simpan Kop, dan Status Notifikasi.

## Verifikasi
- Kompilasi TypeScript dan produksi Vite (`npm run build`) harus berhasil tanpa error atau warning tipe.
