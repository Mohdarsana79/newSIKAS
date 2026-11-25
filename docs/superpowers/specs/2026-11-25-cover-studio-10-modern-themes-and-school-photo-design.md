# Spesifikasi Desain: Ekspansi 10 Tema Cover LPJ Modern, Gambar Sekolah Lintas Varian & Pembatas Bab Adaptif

- **Tanggal:** 2026-11-25
- **Status:** Disetujui Pengguna
- **Ruang Lingkup:** Pengembangan modul **Studio Cover & Pembatas Bab** pada fitur **Cetak SPJ Terpadu** lintas 4 varian BOSP (`reguler`, `kinerja`, `silpa`, `kinerja_silpa`):
  1. Penambahan **5 tema cover modern baru** sehingga total menjadi **10 pilihan layout sampul** (termasuk adaptasi desain *Gelombang BOSP Resmi*).
  2. Penyimpanan **Gambar Sekolah bersama lintas varian & tahun** (`sekolahs.foto_sekolah`) dengan panel unggah universal, toggle **Gunakan Gambar Sekolah**, kontrol posisi fokus (`Atas`/`Tengah`/`Bawah`), dan mode *blend* (`Jernih`/`Seimbang`/`Lembut`) yang dijamin tidak merusak tata letak di seluruh 10 tema.
  3. Pustaka **aset vektor SVG tajam bawaan (100% offline, 300 DPI)**: Logo Resmi BOSP, Emblem Tut Wuri Handayani, Ilustrasi Gedung Sekolah 2 Lantai, Ornamen Batik/Geometris Nusantara, serta field opsional Email/Kontak Sekolah.
  4. **Antarmuka Studio Cover Interaktif** (galeri kartu ber-siluet visual + filter kategori, *drag-and-drop* foto ber-preview, kontrol Zoom & Pratinjau Layar Penuh) serta **Halaman Pembatas Bab (`SectionDividerCanvas`) adaptif** yang mewarisi gaya visual cover terpilih.

---

## 1. Latar Belakang & Tujuan

Studio Cover pada modul Cetak SPJ sebelumnya menyediakan 5 pilihan layout (`editorial`, `instansi_elegan`, `geometris`, `neo_bento`, `photo_hero`), dengan beberapa keterbatasan:
1. Pilihan gaya visual masih terbatas dan belum mencakup gaya populer instansi pendidikan seperti sampul *Gelombang BOSP Resmi* (kop instansi + logo BOSP + gedung sekolah berpadu kurva gelombang biru-emas), *Split Magazine*, *Aurora Glassmorphism*, *Nusantara Heritage*, maupun *Swiss Diagonal Ribbon*.
2. Panel unggah foto sekolah sebelumnya hanya muncul ketika memilih tema `photo_hero`, belum memiliki sakelar (*toggle*) **Gunakan Gambar Sekolah** untuk mengaktifkan/menonaktifkan foto tanpa menghapus berkas, serta foto disimpan terpisah per varian dan per tahun anggaran.
3. `CoverCanvas.tsx` telah tumbuh menjadi satu berkas monolitik (~1.100 baris), sehingga penambahan 5 tema baru secara langsung akan menurunkan keterbacaan dan kemudahan pemeliharaan.
4. `SectionDividerCanvas.tsx` masih menggunakan satu motif statis (strip vertikal kiri) untuk seluruh tema sampul.

Pengembangan ini menyelesaikan keempat poin tersebut secara modular, aman terhadap mode **Hemat Tinta**, dan tetap kompatibel 100% dengan mesin tangkapan kanvas **300 DPI (`html-to-image` + `pdf-lib`)** secara *offline*.

---

## 2. Arsitektur Modular Frontend (`CoverStudio/`)

Untuk mencegah pembengkakan berkas tunggal (*Large File / Divergent Change*), direktori `resources/js/Pages/FiturPelengkap/CetakSpj/components/CoverStudio/` dipecah menjadi unit-unit terfokus:

1. **`coverThemes.ts`** — Definisi tipe metadata, daftar 10 layout (`COVER_LAYOUT_LIST` dengan atribut `category: 'resmi' | 'eksekutif'` dan penanda `isNew` untuk 5 tema baru), 7 palet warna kurasi (termasuk `royal_bosp` / Biru BOSP Resmi) + kustom, fungsi `resolveCoverPalette()`, dan `createDefaultCoverConfig()`.
2. **`CoverAssets.tsx`** — Komponen SVG vektor murni bebas ketergantungan jaringan eksternal:
   - `BospOfficialLogoSvg`: Logo BOSP ("BOSP — Bantuan Operasional Satuan Pendidikan" dengan siluet pita melengkung, figur merah meraih bintang emas, dan mode adaptif terang/gelap/hemat tinta).
   - `TutWuriEmblemSvg`: Emblem pendidikan Tut Wuri Handayani vektor sebagai pendamping/fallback ketika logo daerah belum diatur.
   - `SchoolArchitectureSvg`: Ilustrasi vektor gedung sekolah modern 2 lantai dengan tiang bendera Merah Putih, pepohonan, dan langit bersih sebagai *fallback* saat foto sekolah belum diunggah.
   - `NusantaraPatternSvg`: Pola geometris Batik Kawung/Parang kontemporer untuk header/footer tema Nusantara & pembatas bab.
   - `CoverLayoutThumbnailSvg`: Miniatur siluet SVG tiap layout untuk galeri interaktif di `CoverControlPanel`.
3. **`SchoolPhotoFrame.tsx`** — Komponen penampil foto sekolah anti-rusak (*non-destructive photo slot*) yang mengatur:
   - Resolusi sumber foto: `manifest.sekolah.foto_sekolah_data_uri` (utama, lintas varian) → fallback `config.photo_data_uri` (kompatibilitas preset lama).
   - Sakelar `config.show_foto_sekolah`: bila `false`, foto disembunyikan bersih (atau menampilkan ilustrasi vektor pada slot hero wajib seperti `photo_hero` dan `bosp_wave`).
   - Fokus pemotongan proporsional (`object-fit: cover` + `object-position` dari `config.photo_focus`: `'top' | 'center' | 'bottom'`).
   - Lapisan pelindung kontras (`config.photo_blend`: `'vivid' | 'balanced' | 'soft'`) dan penyesuaian otomatis ketika `config.ink_saver === true`.
4. **`CoverSharedBlocks.tsx`** — Blok terpakai ulang lintas layout (`CoverLogosRow`, `CoverFinanceStrip`, `CoverSignatureFooter`, `CoverResolvedData` helper) agar tidak ada duplikasi kode antar-layout.
5. **`layouts/ClassicCoverLayouts.tsx`** — Implementasi 5 preset awal (`editorial`, `instansi_elegan`, `geometris`, `neo_bento`, `photo_hero`) yang telah ditingkatkan agar mendukung `SchoolPhotoFrame` secara proporsional tanpa menggeser tanda tangan keluar halaman.
6. **`layouts/ModernCoverLayouts.tsx`** — Implementasi 5 preset modern baru (`bosp_wave`, `split_magazine`, `aurora_glass`, `nusantara_heritage`, `swiss_ribbon`).
7. **`CoverCanvas.tsx`** — Komponen `forwardRef` utama yang menyusun `CoverResolvedData` dan mendelegasikan render ke layout terpilih pada kanvas `spec.designWidth × spec.designHeight`.
8. **`SectionDividerCanvas.tsx`** — Kanvas pembatas bab yang menyesuaikan ornamen header/tepi mengikuti `config.layout` aktif.
9. **`CoverControlPanel.tsx`** — Panel kontrol interaktif Studio Cover.

---

## 3. Spesifikasi 10 Layout Cover & Penempatan Gambar Sekolah

Seluruh 10 layout merender pada ukuran kanvas presisi sesuai `SPJ_PAPER_SPECS` (`F4`, `A4`, `Legal`, `Letter`) dengan `overflow: hidden` dan struktur vertikal fleksibel agar tidak ada elemen yang terpotong pada ukuran kertas terpendek sekalipun (`Letter` tinggi `1028px`).

| # | Key (`SpjCoverLayoutKey`) | Nama Tampil | Kategori | Strategi Penempatan Gambar Sekolah (`show_foto_sekolah = true`) |
|---|---|---|---|---|
| 1 | `editorial` | Editorial Modern | Eksekutif | Kartu banner berbingkai proporsional (`height: 138px`, sudut membulat + *vignette* halus) tepat di atas kartu identitas sekolah; tersembunyi rapi jika foto belum ada atau toggle mati. |
| 2 | `instansi_elegan` | Instansi Elegan | Resmi | Bingkai jendela simetris beraksen garis emas/palet (`height: 132px`) di antara pita periode dan kartu identitas sekolah; tersembunyi rapi jika kosong/mati. |
| 3 | `geometris` | Geometris Dinamis | Eksekutif | Menyatu lembut di dalam bidang poligon atas dengan *overlay* warna utama (`blend` terkendali) sehingga tipografi putih tetap kontras tajam, atau kartu aksen miring bersih saat mode Hemat Tinta. |
| 4 | `neo_bento` | Neo-Bento Eksekutif | Eksekutif | Kartu Bento khusus berasio lebar di samping/atas kartu identitas sekolah dengan sudut `22px` tanpa mengurangi keterbacaan progress bar serapan anggaran. |
| 5 | `photo_hero` | Photo Hero Sekolah | Resmi | Hero utama di 42% bagian atas halaman dengan *gradient overlay*; jika toggle mati atau foto kosong, menampilkan `SchoolArchitectureSvg`. |
| 6 | `bosp_wave` | **Gelombang BOSP Resmi** *(Baru)* | Resmi | Kop atas resmi (Logo Daerah/Tut Wuri + garis vertikal + Instansi, Nama Sekolah, Alamat miring, Email/Kontak + Logo Resmi BOSP di kanan). Judul `LAPORAN PERTANGGUNGJAWABAN` + kapsul besar varian/BOSP + kapsul periode + ikon buku terbuka. Zona tengah menampilkan foto sekolah utuh dengan *top sky-fade gradient* mulus dan potongan bawah kurva gelombang SVG berlapis (fallback `SchoolArchitectureSvg` bila foto kosong/mati). Bagian bawah memuat kartu tabel identitas (`Nama Sekolah`, `NPSN`, `Alamat`, `Kecamatan`, `Kabupaten`, `Provinsi`), blok kompak opsional keuangan/penandatangan, dan footer gelombang biru-emas. |
| 7 | `split_magazine` | **Split Magazine Arsitektural** *(Baru)* | Eksekutif | Tata letak majalah arsitektur modern dua kolom asimetris di area hero: tipografi tegas rata kiri berdampingan dengan jendela vertikal lengkung (`rounded-[28px]`) berisi foto sekolah (fallback ilustrasi arsitektur modern), diikuti kartu metrik anggaran 4 kolom/2×2 dan kaki pengesahan. |
| 8 | `aurora_glass` | **Aurora Glassmorphism** *(Baru)* | Eksekutif | Latar gradasi *mesh aurora* lembut mengikuti palet warna aktif, kartu *frosted-glass* putih berlapis untuk header & judul utama, bingkai panorama foto sekolah mengambang bertepi putih halus (fallback pola cahaya & siluet sekolah), serta kartu statistik modern. |
| 9 | `nusantara_heritage` | **Nusantara Heritage Modern** *(Baru)* | Resmi | Pita atas & bawah bermotif vektor Batik Kawung/Geometris Nusantara tipis, susunan kop simetris berwibawa, medali judul utama beraksen aksen emas/palet, jendela foto sekolah berbentuk *modern arch* di tengah, dan kartu identitas serta penanggung jawab resmi. |
| 10 | `swiss_ribbon` | **Swiss Diagonal Ribbon** *(Baru)* | Eksekutif | Gaya *Swiss International Grid* bersih dengan tipografi angka tahun anggaran besar dekoratif, pita diagonal tajam berlapis warna *primary* & *accent*, bingkai foto sekolah berpotongan tegas di sisi kanan/tengah, serta blok metrik bergaris presisi. |

---

## 4. Skema Database, Backend & Kontrak Data

### 4.1 Migrasi Database (`2026_11_25_000003_add_foto_sekolah_to_sekolahs_table.php`)
- Menambahkan kolom `foto_sekolah` (`string`, `255`, `nullable`) pada tabel `sekolahs` (dengan pengecekan `Schema::hasColumn` yang aman di PostgreSQL dan SQLite `:memory:`).
- Menambahkan `'foto_sekolah'` pada `$fillable` di `App\Models\SekolahProfile`.

### 4.2 Penyimpanan & Resolusi Foto Sekolah Bersama (`CetakSpjController` & `SpjPrintManifestService`)
1. **`SpjPrintManifestService::buildSekolahPayload()`:**
   - Menambahkan field `'foto_sekolah_data_uri' => $this->imageToDataUri($sekolah?->foto_sekolah)`.
2. **`CetakSpjController::uploadCoverPhoto()`:**
   - Validasi tetap ketat: `['required', 'file', 'image', 'mimes:jpg,jpeg,png,webp', 'max:3072']` (maks 3 MB).
   - Menyimpan berkas ke `spj_cover_photos/shared/{uuid}.{ext}` pada disk `public`.
   - Jika baris `SekolahProfile::first()` tersedia: menghapus berkas `foto_sekolah` lama (bila ada dan berbeda) lalu memperbarui `sekolah->update(['foto_sekolah' => $path])`, sehingga foto otomatis tersedia di seluruh 4 varian (`reguler`, `kinerja`, `silpa`, `kinerja_silpa`) dan seluruh tahun anggaran.
   - Memperbarui `cover_config['photo_path']` pada preset varian/tahun aktif jika sudah ada (sehingga tetap berfungsi mulus meskipun profil sekolah belum dibuat).
   - Mengembalikan `{ photo_path, photo_data_uri }`.
3. **`CetakSpjController::deleteCoverPhoto()`:**
   - Menghapus berkas foto dari disk `public` (baik di `spj_cover_photos/shared/` maupun `spj_cover_photos/{variant}/` tanpa mengizinkan `..`).
   - Mengosongkan `sekolah->foto_sekolah = null` jika `SekolahProfile::first()` ada, serta membersihkan `cover_config['photo_path']` pada preset terkait agar foto benar-benar terhapus bersih lintas varian.
4. **Sanitasi `cover_config` pada `savePreset()` & `loadPreset()`:**
   - Menerima `photo_path` yang berawalan `spj_cover_photos/{variant}/` maupun `spj_cover_photos/shared/` (menolak path di luar direktori tersebut seperti `logos/...` atau `..`).
   - Menormalisasi field konfigurasi baru dengan aman:
     - `show_foto_sekolah`: boolean (default `true`)
     - `photo_focus`: `'top' | 'center' | 'bottom'` (default `'center'`)
     - `photo_blend`: `'vivid' | 'balanced' | 'soft'` (default `'balanced'`)
     - `show_logo_bosp`: boolean (default `true`)
     - `kontak_sekolah_override`: string (default `''`, dinormalisasi dari `null` menjadi `''`)

---

## 5. Peningkatan Interaktivitas Studio Cover & Pembatas Bab

1. **Galeri Visual 10 Tema di `CoverControlPanel.tsx`:**
   - Tab filter ringkas dinamis: `Semua (10)`, `Resmi & Instansi (4)`, `Eksekutif & Kreatif (6)`.
   - Setiap kartu tema menampilkan miniatur siluet SVG (`CoverLayoutThumbnailSvg`), badge `Baru` pada 5 tema tambahan, dan indikator aktif yang jelas.
2. **Panel "Gambar Gedung / Lingkungan Sekolah" Universal:**
   - Tampil pada **semua tema cover** (tidak lagi tersembunyi di luar `photo_hero`).
   - Area *drag-and-drop* / tombol unggah dengan thumbnail pratinjau foto sekolah aktif + tombol hapus.
   - Sakelar utama **"Gunakan Gambar Sekolah pada Cover"** (`show_foto_sekolah`).
   - Pemilih cepat **Posisi Fokus Foto** (`Atas`, `Tengah`, `Bawah`) dan **Gaya Integrasi Foto** (`Jernih`, `Seimbang`, `Lembut`).
3. **Tambahan Kontrol Kop & Visual:**
   - Input opsional **Email / Kontak Sekolah di Sampul** (`kontak_sekolah_override`, mis. `smpn1@gmail.com · (0453) 12345`).
   - Toggle **Logo BOSP** (`show_logo_bosp`) berdampingan dengan toggle Logo Daerah & Logo Sekolah.
4. **Toolbar Zoom & Layar Penuh di Panel Pratinjau (`Index.tsx`):**
   - Pilihan skala pratinjau cepat (`Otomatis`, `50%`, `75%`, `100%`) dan tombol **Perbesar Layar Penuh** (*modal preview*) untuk memeriksa detail tipografi sampul maupun pembatas bab sebelum dicetak.
5. **Pembatas Bab Senada (`SectionDividerCanvas.tsx`):**
   - Menyesuaikan dekorasi latar/tepi dengan tema sampul aktif: gelombang kurva bawah untuk `bosp_wave`, motif batik tipis untuk `nusantara_heritage`, bingkai ganda untuk `instansi_elegan`, aksen aurora lembut untuk `aurora_glass`, pita diagonal untuk `swiss_ribbon`/`geometris`, kartu bento untuk `neo_bento`, dan spine vertikal tegas untuk `editorial`/`split_magazine`/`photo_hero`.

---

## 6. Pengujian & Quality Gates

1. **PHPUnit Feature Tests (`tests/Feature/CetakSpjTest.php`):**
   - Memastikan seluruh pengujian eksisting tetap lulus 100%.
   - Menambahkan pengujian penyimpanan foto sekolah lintas varian (`uploadCoverPhoto` pada `reguler` otomatis menyediakan `sekolah.foto_sekolah_data_uri` pada manifest `kinerja` dan `silpa`, serta `deleteCoverPhoto` membersihkannya lintas varian).
   - Menambahkan pengujian penyimpanan & pemuatan field `cover_config` baru (`layout` baru mis. `bosp_wave`, `show_foto_sekolah`, `photo_focus`, `photo_blend`, `show_logo_bosp`, `kontak_sekolah_override`).
2. **Validasi Kualitas Kode:**
   - `vendor/bin/pint` (format PHP bersih).
   - `composer test` (seluruh suite PHPUnit hijau di SQLite `:memory:`).
   - `npm run build` (`tsc && vite build` tanpa error TypeScript ketat).
   - `/code-review` dua sumbu paralel (**Standards** & **Spec**).
