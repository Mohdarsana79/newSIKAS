# Spesifikasi Desain: Ekspor PNG 300 DPI & Ukuran Kertas Poster Transparansi (Hapus Cetak PDF)

- **Tanggal:** 2026-11-22
- **Status:** Disetujui untuk Implementasi
- **Lingkup:** Frontend Studio Poster ([Index.tsx](file:///c:/laragon/www/newSIKAS2/newSIKAS/resources/js/Pages/FiturPelengkap/PosterTransparansi/Index.tsx), [PosterCanvas.tsx](file:///c:/laragon/www/newSIKAS2/newSIKAS/resources/js/Pages/FiturPelengkap/PosterTransparansi/Partials/PosterCanvas.tsx), [types.ts](file:///c:/laragon/www/newSIKAS2/newSIKAS/resources/js/Pages/FiturPelengkap/PosterTransparansi/types.ts), `paperSizes.ts`, `exportPosterPng.ts`) + Portal Transparansi Publik ([PublicPosterSection.tsx](file:///c:/laragon/www/newSIKAS2/newSIKAS/resources/js/Pages/Transparansi/Partials/PublicPosterSection.tsx)). Tanpa perubahan skema database maupun API backend.

---

## 1. Tujuan & Ringkasan Perubahan

1. **Menghapus opsi Cetak / Simpan PDF** dari:
   - Studio Poster Transparansi (`resources/js/Pages/FiturPelengkap/PosterTransparansi/Index.tsx`)
   - Seksi Poster pada Portal Transparansi Publik (`resources/js/Pages/Transparansi/Partials/PublicPosterSection.tsx`)
   Keduanya difokuskan pada satu alur ekspor gambar berkualitas tinggi (**Unduh PNG HD**), sekaligus membersihkan kode mati (`handlePrintPdf`, `handlePrint`, ikon `Printer`, blok `<style>@media print</style>`, dan utility class `print:*`).
2. **Menambahkan pilihan ukuran kertas `F4`, `Legal`, dan `Letter`** melengkapi `A4` dan `A3` pada Studio Poster Transparansi.
3. **Menyelaraskan ukuran kertas langsung ke pratinjau & output PNG 300 DPI presisi**:
   - Pratinjau di Studio Poster menampilkan lembar poster sesuai rasio aspek kertas yang dipilih.
   - File PNG yang diunduh memiliki dimensi piksel tepat sesuai standar cetak **300 DPI** tanpa selisih pembulatan dan tanpa pemotongan elemen.
   - Menghilangkan duplikasi logika ekspor PNG (`html-to-image` + kompensasi `html { zoom }`) dengan memindahkannya ke utilitas bersama `exportPosterPng.ts`.

---

## 2. Spesifikasi Ukuran Kertas (`paperSizes.ts`)

File baru: `resources/js/Pages/FiturPelengkap/PosterTransparansi/paperSizes.ts`

Tipe `PosterPaperSize` pada `types.ts` diperluas menjadi:
```ts
export type PosterPaperSize = 'a4' | 'a3' | 'f4' | 'legal' | 'letter';
```

Setiap entri `PosterPaperSpec` mendefinisikan:

| Key | Label | Dimensi Fisik | Deskripsi Singkat | Kanvas Desain (Full-Bleed) | Output PNG 300 DPI | Density |
|---|---|---|---|---|---|---|
| `a4` | `A4` | `210 × 297 mm` | `Standar kantor` | `860 × 1216 px` | `2480 × 3508 px` | `normal` |
| `a3` | `A3` | `297 × 420 mm` | `Poster papan besar` | `860 × 1216 px` | `3508 × 4961 px` | `normal` |
| `f4` | `F4` | `215 × 330 mm` | `Folio Indonesia` | `812 × 1246 px` | `2539 × 3898 px` | `spacious` |
| `legal` | `Legal` | `215,9 × 355,6 mm` | `Kertas panjang` | `794 × 1308 px` | `2550 × 4200 px` | `spacious` |
| `letter` | `Letter` | `215,9 × 279,4 mm` | `Standar US` | `920 × 1191 px` | `2550 × 3300 px` | `compact` |

Catatan:
- Standar F4 (`215 × 330 mm`) selaras dengan konvensi F4/Folio yang digunakan di seluruh aplikasi (mis. `BastController.php`).
- Setiap ukuran kertas menggunakan `designWidth × designHeight` yang mencocokkan rasio kertas 300 DPI secara persis dengan tinggi ruang `1191–1308 px`, sehingga seluruh konten (hingga 8 program SNP + grafik bulanan + catatan + tanda tangan) muat 100% *full-bleed* tepi ke tepi tanpa celah kosong kiri–kanan (*pillarbox*).

---

## 3. Desain Komponen & Utilitas

### 3.1 `exportPosterPng.ts` (Utilitas Ekspor PNG 300 DPI Full-Bleed Bersama)
File baru: `resources/js/Pages/FiturPelengkap/PosterTransparansi/exportPosterPng.ts`

Fungsi utama:
```ts
export async function exportPosterToPng(options: {
    node: HTMLElement;
    paperSize: PosterPaperSize;
    backgroundColor: string;
    fileName: string;
}): Promise<void>
```

Alur kerja:
1. Tunggu `document.fonts.ready` bila tersedia agar font `Plus Jakarta Sans` terender penuh.
2. Simpan `document.documentElement.style.getPropertyValue('zoom')`, lalu set sementara `'1'` untuk menetralkan aturan desktop `html { zoom: 0.8 }` dan pastikan selalu dipulihkan pada blok `finally`.
3. Ukur `measuredWidth = node.offsetWidth` dan `measuredHeight = node.offsetHeight`. Validasi keduanya `> 0`.
4. Hitung dimensi render *full-bleed* sesuai rasio persis kertas target (`paperRatio = spec.exportWidth / spec.exportHeight`):
   - Bila `measuredHeight <= spec.designHeight` (kondisi normal): `effectiveWidth = spec.designWidth` dan `effectiveHeight = spec.designHeight`.
   - Bila pada kasus teks sangat panjang `measuredHeight > spec.designHeight`: alih-alih mengecilkan lebar poster dengan celah kiri–kanan (*pillarbox*), perluas secara proporsional `effectiveWidth = Math.ceil(measuredHeight * paperRatio)` dan `effectiveHeight = Math.round(effectiveWidth * (spec.exportHeight / spec.exportWidth))`.
5. Hitung `renderPixelRatio = Math.max(2, Math.min(5, Math.ceil((spec.exportWidth / effectiveWidth) * 10) / 10))`.
6. Panggil `toCanvas(node, { pixelRatio: renderPixelRatio, width: effectiveWidth, height: effectiveHeight, backgroundColor, style: { width: `${effectiveWidth}px`, minHeight: `${effectiveHeight}px`, height: `${effectiveHeight}px`, transform: 'none', zoom: '1', margin: '0', borderRadius: '0', border: 'none', boxShadow: 'none' } })`.
7. Buat `<canvas>` output dengan ukuran tepat `canvas.width = spec.exportWidth` dan `canvas.height = spec.exportHeight`, isi latar penuh dengan `backgroundColor`, lalu gambar `sourceCanvas` **penuh 100% tepi ke tepi** (`ctx.drawImage(sourceCanvas, 0, 0, spec.exportWidth, spec.exportHeight)`) dengan `ctx.imageSmoothingEnabled = true` dan `ctx.imageSmoothingQuality = 'high'`.
8. Ekspor melalui `outputCanvas.toBlob(..., 'image/png')` + `URL.createObjectURL(blob)` (hemat memori untuk PNG A3 300 DPI, dengan fallback `toDataURL('image/png')` melalui helper lokal jika `blob` bernilai `null`), picu unduhan `link.download = fileName`, lalu bebaskan Object URL dengan `URL.revokeObjectURL`.

### 3.2 `PosterCanvas.tsx` (Layout Adaptif Full-Bleed Tanpa Celah Kosong)
- Tambah prop opsional `paperSize?: PosterPaperSize` (default `'a4'`) dan `framed?: boolean` (default `true` agar kompatibel langsung dengan `PublicPosterSection.tsx`; diisi `false` di `Index.tsx` karena bingkai lembar kertas luar sudah memegang `rounded-[22px] ring-1 ring-slate-200/90 shadow-xl`).
- Ambil `spec = POSTER_PAPER_SIZES[paperSize]`.
- Root `#transparansi-poster-sheet` menggunakan `flex flex-col` dengan `style={{ width: `${spec.designWidth}px`, minHeight: `${spec.designHeight}px`, ... }}` dan menghapus seluruh class `print:*`.
- **Jarak antar-kartu tetap & seragam (tanpa `justify-between` pada body):**
  - Body menggunakan `flex flex-1 flex-col` dengan jarak konsisten (`gap-2.5 px-5 py-3.5` untuk `compact`, `gap-3 px-6 py-4` untuk `normal`, `gap-3.5 px-6 py-4` untuk `spacious`).
  - Baris 2 kolom utama (**Komposisi Belanja** & **Realisasi per Standar / Program SNP**) memakai `flex-1` untuk menyerap seluruh sisa ruang vertikal (baik di kertas tinggi F4/Legal maupun saat Grafik Bulanan / Tanda Tangan dimatikan) sehingga tidak pernah muncul celah kosong menganga antar-kartu.
  - Lebar `viewBox` pada `MonthlyBarChartSvg` mengikuti `spec.designWidth - 84` agar batang grafik bulanan terbentang penuh dari kiri ke kanan di dalam kartunya pada seluruh lebar kertas (`794px` s/d `920px`).
  - Blok tanda tangan memakai proporsi ruang vertikal yang lebih ringkas & seimbang (`mt-7 mb-2 h-5`) dengan garis putus-putus yang jelas (`border-slate-400/80`).

### 3.3 `PosterTransparansi/Index.tsx` (Studio Poster)
1. **Header & Tombol Aksi:**
   - Hapus tombol **Cetak / Simpan PDF**, fungsi `handlePrintPdf`, dan import `Printer` dari `lucide-react`.
   - Hapus seluruh tag `<style>{`@media print ...`}</style>` dan semua class `print:hidden`.
   - Ubah tombol tunggal **Unduh PNG HD** menjadi aksi utama (*primary button*) yang menonjol:
     - Label: `Unduh PNG HD ({activePaper.label})` / saat proses: `Merender PNG {activePaper.label}...`
     - Badge header: `PNG 300 DPI`.
     - Subtitle `PageHeader` diperbarui agar menyebut dukungan ukuran kertas (`A4, A3, F4, Legal, Letter`) untuk papan pengumuman & berbagi WhatsApp tanpa menyebut PDF.
   - Nama berkas unduhan: `poster-transparansi-${posterData.meta.variant}-${posterData.meta.tahun}-${posterData.meta.periode}-${paperSize}.png`.
   - Pesan sukses menyertakan info ukuran & resolusi: `Poster PNG 300 DPI (${activePaper.label} · ${activePaper.exportWidth}×${activePaper.exportHeight} px) berhasil diunduh dan siap dicetak atau dibagikan.`
   - Pesan error dihapus referensi ke tombol PDF: `Gagal membuat gambar PNG. Silakan coba lagi.`
2. **Panel Pemilih Ukuran Kertas:**
   - Judul label: `Ukuran Kertas Ekspor (PNG 300 DPI)`.
   - Grid 2 kolom (`grid-cols-2 gap-2`) berisi 5 kartu tombol 1-klik (`A4`, `A3`, `F4`, `Legal`, `Letter`), masing-masing menampilkan nama kertas, dimensi mm (mis. `215 × 330 mm`), dan deskripsi singkat.
3. **Pratinjau Langsung WYSIWYG Full-Bleed:**
   - Subtitle `Surface` menampilkan: `${posterData.meta.variant_label} · ${posterData.meta.periode_label} · ${activePaper.label} (${activePaper.exportWidth}×${activePaper.exportHeight} px · 300 DPI)`.
   - Tidak lagi memakai `contentFitScale` yang mengecilkan lebar poster dengan celah kiri–kanan; bingkai luar `#transparansi-poster-scale-box` memegang `overflow-hidden rounded-[22px] ring-1 ring-slate-200/90 shadow-xl` dan menampilkan `PosterCanvas` **penuh 100% selebar kertas** (`activePaper.designWidth × Math.max(activePaper.designHeight, naturalPosterHeight)`) yang diskalakan responsif (`previewScale`) ke lebar panel.
   - `posterRef` menunjuk langsung ke `#transparansi-poster-sheet` (`PosterCanvas`) sehingga `exportPosterToPng` membaca dimensi mentah tanpa terpengaruh `previewScale`.

### 3.4 `Transparansi/Partials/PublicPosterSection.tsx` (Portal Transparansi Publik)
- Hapus tombol **Cetak / Simpan PDF**, fungsi `handlePrint`, blok `<style>{`@media print ...`}</style>`, dan seluruh class `print:*`.
- Perbarui subtitle deskripsi menjadi: `Unduh versi gambar HD (300 DPI) untuk papan pengumuman sekolah atau grup informasi orang tua.`, tombol menjadi `Unduh Poster PNG HD (300 DPI)`, pesan sukses menjadi `Poster Transparansi PNG HD (300 DPI) berhasil diunduh.`, dan pesan error tanpa referensi PDF.
- Gunakan `POSTER_PAPER_SIZES.a4.designWidth` (`860px`), `POSTER_PAPER_SIZES.a4.designHeight` (`1216px`), serta utilitas bersama `exportPosterToPng` dengan `paperSize: 'a4'` (tanpa menambah kontrol pemilih ukuran kertas di portal publik).

---

## 4. Rencana Verifikasi & Pengujian

1. **Build & Type Check:** `npm run build` (`tsc && vite build`) harus lulus tanpa error atau warning TypeScript strict.
2. **Backend Regression Tests:** `php artisan test --filter="PosterTransparansiTest|PortalTransparansiTest"` (memastikan tidak ada regresi pada fitur terkait).
3. **Code Review Paralel (`/code-review`):**
   - Sumbu **Standards**: verifikasi konvensi repo & smell baseline (Fowler).
   - Sumbu **Spec**: verifikasi kesesuaian implementasi terhadap spesifikasi ini.
