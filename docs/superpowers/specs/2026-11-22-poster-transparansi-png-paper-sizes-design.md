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

| Key | Label | Dimensi Fisik | Deskripsi Singkat | Kanvas Desain (`794px` lebar) | Output PNG 300 DPI | Density |
|---|---|---|---|---|---|---|
| `a4` | `A4` | `210 × 297 mm` | `Standar kantor` | `794 × 1123 px` | `2480 × 3508 px` | `normal` |
| `a3` | `A3` | `297 × 420 mm` | `Poster papan besar` | `794 × 1123 px` | `3508 × 4961 px` | `normal` |
| `f4` | `F4` | `215 × 330 mm` | `Folio Indonesia` | `794 × 1219 px` | `2539 × 3898 px` | `spacious` |
| `legal` | `Legal` | `215,9 × 355,6 mm` | `Kertas panjang` | `794 × 1308 px` | `2550 × 4200 px` | `spacious` |
| `letter` | `Letter` | `215,9 × 279,4 mm` | `Standar US` | `794 × 1028 px` | `2550 × 3300 px` | `compact` |

Catatan:
- Standar F4 (`215 × 330 mm`) selaras dengan konvensi F4/Folio yang digunakan di seluruh aplikasi (mis. `BastController.php`).
- Seluruh dimensi kanvas desain mempertahankan basis lebar `794px` agar tipografi, 4 kolom KPI, dan grafik SVG (`MonthlyBarChartSvg`, `DonutChartSvg`) konsisten dan tidak terdistorsi.

---

## 3. Desain Komponen & Utilitas

### 3.1 `exportPosterPng.ts` (Utilitas Ekspor PNG 300 DPI Bersama)
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
3. Ukur `sourceWidth = node.offsetWidth` dan `sourceHeight = node.offsetHeight`. Validasi keduanya `> 0`.
4. Hitung `renderPixelRatio` yang cukup untuk menjaga ketajaman 300 DPI pada dimensi output target (`spec.exportWidth × spec.exportHeight`):
   - `scaleX = spec.exportWidth / sourceWidth`
   - `scaleY = spec.exportHeight / sourceHeight`
   - `fitScale = Math.min(scaleX, scaleY)`
   - `renderPixelRatio = Math.max(2, Math.min(5, Math.ceil(fitScale * 10) / 10))` (menghasilkan `~3.2×` untuk A4/F4/Legal/Letter dan `~4.5×` untuk A3).
5. Panggil `toCanvas(node, { pixelRatio: renderPixelRatio, width: sourceWidth, height: sourceHeight, backgroundColor, style: { transform: 'none', zoom: '1', margin: '0', borderRadius: '0', border: 'none', boxShadow: 'none' } })`.
6. Buat `<canvas>` output dengan ukuran tepat `canvas.width = spec.exportWidth` dan `canvas.height = spec.exportHeight`.
7. Isi latar penuh dengan `backgroundColor` (`theme.pageBg`).
8. Gambar `sourceCanvas` ke tengah kanvas output secara proporsional (`drawWidth = Math.round(sourceWidth * fitScale)`, `drawHeight = Math.round(sourceHeight * fitScale)`, `offsetX = Math.round((spec.exportWidth - drawWidth) / 2)`, `offsetY = Math.round((spec.exportHeight - drawHeight) / 2)`) dengan `ctx.imageSmoothingEnabled = true` dan `ctx.imageSmoothingQuality = 'high'`.
   - Jika konten natural pas dengan tinggi desain (`sourceHeight === spec.designHeight`), maka `drawWidth ≈ spec.exportWidth` dan `drawHeight ≈ spec.exportHeight` (penuh 100% lembar).
   - Jika konten natural melebihi tinggi desain (mis. `Letter` saat seluruh opsi aktif), konten otomatis diskalakan pas ke dalam lembar 300 DPI tanpa ada satu pun elemen yang terpotong.
9. Ekspor melalui `outputCanvas.toBlob(..., 'image/png')` + `URL.createObjectURL(blob)` (hemat memori untuk PNG A3 300 DPI, dengan fallback `toDataURL('image/png')` jika `blob` bernilai `null`), picu unduhan `link.download = fileName`, lalu bebaskan Object URL dengan `URL.revokeObjectURL`.

### 3.2 `PosterCanvas.tsx` (Layout Adaptif per Kertas)
- Tambah prop opsional `paperSize?: PosterPaperSize` (default `'a4'`) dan `framed?: boolean` (default `true` agar kompatibel langsung dengan `PublicPosterSection.tsx`; diisi `false` di `Index.tsx` karena bingkai lembar kertas luar sudah memegang `rounded-[22px] border shadow-xl` sehingga tidak terjadi border ganda saat `contentFitScale < 1`).
- Ambil `spec = POSTER_PAPER_SIZES[paperSize]`.
- Root `#transparansi-poster-sheet` menggunakan `flex flex-col` dengan `style={{ width: `${spec.designWidth}px`, minHeight: `${spec.designHeight}px`, ... }}` dan menghapus seluruh class `print:*`.
- Bagian body infografis menggunakan `flex flex-1 flex-col justify-between` dengan kerapatan (*density*) adaptif:
  - `compact` (`letter`): padding header & body sedikit dirapatkan (`px-6 pb-4 pt-4`, `px-5 py-3.5`, `gap-2.5`, area tanda tangan `my-4 h-7`) agar konten penuh mendekati tinggi alami `1028px` sehingga faktor pengecilan *auto-fit* minimal.
  - `normal` (`a4`, `a3`): mempertahankan tata letak elegan saat ini (`px-7 pb-6 pt-6`, `px-6 py-5`, `gap-4`).
  - `spacious` (`f4`, `legal`): `flex-1 justify-between` mendistribusikan jarak vertikal antarseksi secara seimbang dari header hingga footer sehingga tidak ada ruang kosong menganga di bagian bawah.

### 3.3 `PosterTransparansi/Index.tsx` (Studio Poster)
1. **Header & Tombol Aksi:**
   - Hapus tombol **Cetak / Simpan PDF**, fungsi `handlePrintPdf`, dan import `Printer` dari `lucide-react`.
   - Hapus seluruh tag `<style>{`@media print ...`}</style>` dan semua class `print:hidden`.
   - Ubah tombol tunggal **Unduh PNG HD** menjadi aksi utama (*primary button*) yang menonjol:
     - Label: `Unduh PNG HD ({activePaper.label})` / saat proses: `Merender PNG {activePaper.label}...`
     - Subtitle `PageHeader` diperbarui agar menyebut dukungan ukuran kertas (`A4, A3, F4, Legal, Letter`) untuk papan pengumuman & berbagi WhatsApp tanpa menyebut PDF.
   - Nama berkas unduhan: `poster-transparansi-${posterData.meta.variant}-${posterData.meta.tahun}-${posterData.meta.periode}-${paperSize}.png`.
   - Pesan sukses menyertakan info ukuran & resolusi: `Poster PNG 300 DPI (${activePaper.label} · ${activePaper.exportWidth}×${activePaper.exportHeight} px) berhasil diunduh dan siap dicetak atau dibagikan.`
   - Pesan error dihapus referensi ke tombol PDF: `Gagal membuat gambar PNG. Silakan coba lagi.`
2. **Panel Pemilih Ukuran Kertas:**
   - Judul label: `Ukuran Kertas Ekspor (PNG 300 DPI)`.
   - Grid 2 kolom (`grid-cols-2 gap-2`) berisi 5 kartu tombol 1-klik (`A4`, `A3`, `F4`, `Legal`, `Letter`), masing-masing menampilkan nama kertas, dimensi mm (mis. `215 × 330 mm`), dan deskripsi singkat.
3. **Pratinjau Langsung WYSIWYG:**
   - Subtitle `Surface` menampilkan: `${posterData.meta.variant_label} · ${posterData.meta.periode_label} · ${activePaper.label} (${activePaper.exportWidth}×${activePaper.exportHeight} px · 300 DPI)`.
   - Mengukur tinggi natural `PosterCanvas` melalui `ResizeObserver` (`naturalHeight`) setiap kali data, opsi, atau `paperSize` berubah.
   - Menghitung `contentFitScale = naturalHeight > activePaper.designHeight ? activePaper.designHeight / naturalHeight : 1`.
   - Merender bingkai lembar kertas berdimensi pasti `activePaper.designWidth × activePaper.designHeight` berlatar `activeTheme.pageBg` dengan `PosterCanvas` di dalamnya (menggunakan `contentFitScale` terpusat bila `< 1`), lalu membungkusnya dengan skala responsif kontainer (`previewScale`). Dengan demikian, apa yang terlihat di pratinjau identik 1:1 dengan file PNG 300 DPI yang diunduh.
   - Penting: `posterRef` tetap menunjuk langsung ke `#transparansi-poster-sheet` (`PosterCanvas`) sehingga `exportPosterToPng` membaca dimensi & piksel mentah tanpa terpengaruh `contentFitScale` maupun `previewScale`.

### 3.4 `Transparansi/Partials/PublicPosterSection.tsx` (Portal Transparansi Publik)
- Hapus tombol **Cetak / Simpan PDF**, fungsi `handlePrint`, blok `<style>{`@media print ...`}</style>`, dan seluruh class `print:*`.
- Perbarui subtitle deskripsi menjadi: `Unduh versi gambar HD (300 DPI) untuk papan pengumuman sekolah atau grup informasi orang tua.`
- Gunakan utilitas bersama `exportPosterToPng` dengan `paperSize: 'a4'` (tanpa menambah kontrol pemilih ukuran kertas di portal publik).
- Perbarui pesan error PNG agar tidak menyebut tombol Cetak / Simpan PDF.

---

## 4. Rencana Verifikasi & Pengujian

1. **Build & Type Check:** `npm run build` (`tsc && vite build`) harus lulus tanpa error atau warning TypeScript strict.
2. **Backend Regression Tests:** `php artisan test --filter="PosterTransparansiTest|PortalTransparansiTest"` (memastikan tidak ada regresi pada fitur terkait).
3. **Code Review Paralel (`/code-review`):**
   - Sumbu **Standards**: verifikasi konvensi repo & smell baseline (Fowler).
   - Sumbu **Spec**: verifikasi kesesuaian implementasi terhadap spesifikasi ini.
