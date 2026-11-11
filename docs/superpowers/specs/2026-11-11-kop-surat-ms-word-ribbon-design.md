# Dokumen Desain: Toolbar Lengkap ala MS Word (Ribbon Bar) pada Editor Tiptap Kop Surat

**Tanggal:** 11 November 2026  
**Status:** Disetujui Pengguna (Drafting Spec)  
**Modul:** Kop Surat Builder (`resources/js/Pages/DataMaster/SekolahProfile/Partials/KopSuratBuilder.tsx`)

---

## 1. Latar Belakang & Kebutuhan Fitur

Pada rilis awal pembuat kop surat kustom, editor Tiptap hanya menyediakan toolbar dasar kedinasan (H1, H2, H3, Bold, Italic, Underline, dan Perataan Teks). Pengguna membutuhkan fleksibilitas penuh layaknya Microsoft Word untuk mengatur jenis huruf (*font family*), ukuran huruf dalam satuan poin (*font size* pt), perbesaran/perkecilan cepat (*grow/shrink font*), transformasi huruf kapital (*change case*), pewarnaan teks, stabilo (*highlight*), efek coret (*strikethrough*), *subscript*, *superscript*, jarak antar-baris (*line spacing*), dan daftar (*bullet/number list*).

---

## 2. Rincian Fitur Toolbar MS Word Ribbon

Toolbar disusun menjadi **Ribbon Bar 2 Baris yang Terorganisir**:

### Baris 1: Font Utama, Ukuran & Sejarah
1. **Dropdown Jenis Font (Font Family):**
   - Times New Roman (Standar Dinas Utama)
   - Arial (Standar Modern)
   - Calibri
   - Arial Black
   - Georgia
   - Tahoma
   - Trebuchet MS
   - Verdana
   - Courier New
   - Garamond
2. **Dropdown Ukuran Font (Font Size dalam pt):**
   - Pilihan: `8pt`, `9pt`, `10pt`, `11pt`, `12pt`, `14pt`, `16pt`, `18pt`, `20pt`, `22pt`, `24pt`, `26pt`, `28pt`, `32pt`, `36pt`, `48pt`, `72pt`.
3. **Tombol Perbesar & Perkecil Cepat (Grow / Shrink Font):**
   - $A^\wedge$ (+2pt)
   - $A_\vee$ (-2pt)
4. **Ubah Kapitalisasi (Change Case $Aa$):**
   - *UPPERCASE*: Mengubah teks terpilih menjadi huruf besar semua.
   - *lowercase*: Mengubah teks terpilih menjadi huruf kecil semua.
   - *Capitalize*: Mengubah huruf pertama setiap kata menjadi kapital.
5. **Sejarah & Pembersihan:**
   - Undo ($\curvearrowleft$)
   - Redo ($\curvearrowright$)
   - Clear Formatting / Penghapus Format (mengembalikan teks ke format normal).

### Baris 2: Gaya Karakter, Pewarnaan, Paragraf & Jarak Baris
1. **Gaya Karakter (Font Styles):**
   - Bold (**B**)
   - Italic (*I*)
   - Underline (<u>U</u>)
   - Strikethrough (<s>S</s>)
   - Subscript ($X_2$)
   - Superscript ($X^2$)
2. **Pewarnaan:**
   - Warna Teks (*Font Color*): Palet warna dinas (Hitam, Abu-abu gelap, Biru navy, Merah, Emas) + pemilih warna kustom.
   - Warna Stabilo (*Highlight Color*): Kuning, Hijau muda, Cyan, Pink, atau Hapus stabilo.
3. **Perataan & Tata Letak Paragraf:**
   - Rata Kiri ($\equiv$)
   - Rata Tengah ($\equiv$ - default kop)
   - Rata Kanan ($\equiv$)
   - Rata Kiri-Kanan / Justify ($\equiv$)
4. **Spasi Baris (Line Spacing):**
   - Dropdown pilihan spasi: `1.0` (Rapat/Single), `1.15`, `1.25`, `1.5` (1.5 baris), `2.0` (Ganda).
5. **Daftar List:**
   - Bullet List (Daftar berbutir)
   - Ordered List (Daftar bernomor 1, 2, 3)

---

## 3. Spesifikasi Arsitektur Teknis

### 3.1 Ekstensi Tiptap yang Digunakan
1. Paket terpasang:
   - `@tiptap/starter-kit`
   - `@tiptap/extension-underline`
   - `@tiptap/extension-text-align`
   - `@tiptap/extension-text-style`
   - `@tiptap/extension-font-family`
   - `@tiptap/extension-color`
   - `@tiptap/extension-highlight`
   - `@tiptap/extension-subscript`
   - `@tiptap/extension-superscript`
2. Custom Tiptap Extension:
   - **`FontSize`**: Membaca dan merender inline `style="font-size: XXpt;"` pada mark `textStyle`.
   - **`LineHeight`**: Membaca dan merender inline `style="line-height: X.X;"` pada node `paragraph` dan `heading`.

### 3.2 Interoperabilitas Live Preview & Resolusi Tinggi
- Teks di dalam Live Preview akan langsung merender tag HTML dan atribut inline yang dihasilkan oleh Tiptap (`font-size`, `font-family`, `color`, `line-height`, dll.).
- CSS default pada `.kop-live-content` disesuaikan agar tidak lagi menimpa (*override*) atribut inline yang diatur pengguna.
- Fungsi render canvas `html-to-image` menangkap seluruh gaya visual tersebut secara akurat ke file gambar PNG 2480px untuk cetak laporan PDF.
