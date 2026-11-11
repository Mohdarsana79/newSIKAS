# Implementation Plan: Toolbar Lengkap ala MS Word (Ribbon Bar) pada Editor Tiptap Kop Surat

**Tanggal Rencana:** 11 November 2026  
**Status:** Siap Dieksekusi  
**Dokumen Desain Referensi:** [`docs/superpowers/specs/2026-11-11-kop-surat-ms-word-ribbon-design.md`](file:///c:/laragon/www/newSIKAS2/newSIKAS/docs/superpowers/specs/2026-11-11-kop-surat-ms-word-ribbon-design.md)

---

## 1. Ringkasan Tugas & Tujuan

Meningkatkan kapabilitas formatting teks pada editor Tiptap di komponen [`KopSuratBuilder.tsx`](file:///c:/laragon/www/newSIKAS2/newSIKAS/resources/js/Pages/DataMaster/SekolahProfile/Partials/KopSuratBuilder.tsx) dengan menghadirkan **Ribbon Bar Lengkap ala Microsoft Word**:
1. Dropdown Font Family (10 jenis font kedinasan & umum).
2. Dropdown Font Size (satuan pt) + tombol Grow/Shrink Font.
3. Kontrol gaya font: Bold, Italic, Underline, Strikethrough, Subscript, Superscript.
4. Pewarnaan teks (Font Color) & pewarnaan stabilo (Highlight).
5. Ubah kapitalisasi huruf (Change Case: UPPERCASE, lowercase, Capitalize).
6. Paragraf: Perataan (Kiri, Tengah, Kanan, Justify), Jarak Spasi Baris (Line Spacing 1.0, 1.15, 1.25, 1.5, 2.0), Bullet & Numbered List.
7. Penghapus format (Clear Formatting), Undo & Redo.

---

## 2. Rincian Perubahan File & Tahapan Eksekusi

### Tahap 1: Buat Custom Extensions Tiptap (FontSize & LineHeight)
- **File Target:** `resources/js/Pages/DataMaster/SekolahProfile/Partials/KopTiptapExtensions.ts`
- **Pekerjaan:**
  - Implementasikan ekstensi `FontSize` untuk mark `textStyle`.
  - Implementasikan ekstensi `LineHeight` untuk node `paragraph` dan `heading`.
  - Ekspor fungsi pembantu untuk transformasi kapitalisasi teks (*change case*).

### Tahap 2: Refaktor Komponen Toolbar & Editor di `KopSuratBuilder.tsx`
- **File Target:** `resources/js/Pages/DataMaster/SekolahProfile/Partials/KopSuratBuilder.tsx`
- **Pekerjaan:**
  - Daftarkan ekstensi baru pada konfigurasi `useEditor`:
    - `TextStyle`
    - `FontFamily`
    - `Color`
    - `Highlight`
    - `Subscript`
    - `Superscript`
    - `FontSize`
    - `LineHeight`
    - `TextAlign` (tambahkan `'justify'`)
  - Buat komponen Ribbon Bar 2 Baris yang rapi dan terorganisir per kelompok dengan border pembatas dan tooltip.
  - Sediakan UI dropdown/picker yang responsif dan elegan (dropdown font family, dropdown font size, color palette dropdown, dropdown line spacing).
  - Sesuaikan CSS pratinjau `.kop-live-content` agar tidak meng-override inline styling yang diatur pengguna, sehingga semua format ukuran font, jenis font, spasi baris, dan warna tampil 100% akurat pada preview dan hasil gambar PNG.

### Tahap 3: Verifikasi Build & Pengujian Fungsional
- Jalankan `npm run build` untuk memverifikasi TypeScript type safety dan Vite bundling.
- Verifikasi fitur:
  - Ganti font family & font size.
  - Coba fitur change case ke UPPERCASE.
  - Coba pewarnaan font dan stabilo.
  - Coba subscript & superscript.
  - Coba spasi baris (line spacing).
  - Pastikan Live Preview dan tombol unduh/simpan menghasilkan kop yang presisi.
