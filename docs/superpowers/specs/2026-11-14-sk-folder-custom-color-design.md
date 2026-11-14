# Desain Warna Folder Custom / Bebas pada Modul SK & Dokumen Surat

**Tanggal:** 2026-11-14
**Status:** Disetujui untuk peninjauan spec
**Ruang Lingkup:**
- `resources/js/Pages/SkSurat/Partials/folderColors.ts` (baru)
- `resources/js/Pages/SkSurat/Partials/FolderModal.tsx`
- `resources/js/Pages/SkSurat/Index.tsx`
- `resources/js/Pages/SkSurat/Show.tsx`
- `app/Http/Controllers/SkSuratController.php`
- `tests/Feature/SkSuratFolderColorTest.php` (baru)

---

## 1. Latar Belakang & Tujuan

Saat ini `FolderModal.tsx` dan `SkSurat/Index.tsx` hanya mendukung 6 nama preset warna statis (`indigo`, `emerald`, `amber`, `rose`, `sky`, `purple`), di mana swatch `Sky` (`bg-sky-500`) tidak muncul karena token Tailwind proyek menimpa skala `sky`. Pengguna ingin agar warna folder pada modul **SK & Dokumen Surat** bisa dipilih secara bebas (custom color), sekaligus menjaga tampilan folder preset yang sudah ada tetap Neo-Bento lembut di mode terang maupun gelap.

---

## 2. Arsitektur & Komponen Frontend

### 2.1 Shared Color Helper (`resources/js/Pages/SkSurat/Partials/folderColors.ts`)
Menyatukan definisi preset dan resolusi warna custom agar tidak terduplikasi di `FolderModal`, `Index`, dan `Show`:
- **`PRESET_FOLDER_COLORS`**: daftar 6 preset (`indigo`, `emerald`, `amber`, `rose`, `sky`, `purple`) lengkap dengan properti `name`, `value`, `hex`, `bg`, `text`, `border`, dan `glow`. Swatch tombol preset di modal menggunakan `style={{ backgroundColor: preset.hex }}` sehingga selalu tampil konsisten.
- **`normalizeHexColor(input: string): string | null`**: memvalidasi `#RGB` atau `#RRGGBB` (case-insensitive) dan menormalkan menjadi format 6-digit huruf kecil `#rrggbb`.
- **`resolveFolderTheme(warna?: string | null)`**:
  - Jika `warna` adalah salah satu key preset (atau kosong → default `indigo`), mengembalikan class Neo-Bento preset (`bg`, `text`, `border`, `glow`) serta `hex` representatifnya.
  - Jika `warna` berupa kode Hex valid (`#rrggbb`), menghasilkan `hex` ter-normalisasi plus inline style Neo-Bento lembut:
    - `tileStyle`: `{ backgroundColor: hexToRgba(hex, 0.15), color: hex, borderColor: hexToRgba(hex, 0.32) }`
    - `cardStyle`: `{ '--folder-border': hexToRgba(hex, 0.28), '--folder-glow': hexToRgba(hex, 0.55) }` bersama class hover berbasis CSS custom property `[border-color:var(--folder-border)] hover:[border-color:var(--folder-glow)]` sehingga border kartu tetap serasi saat idle maupun hover di mode terang & gelap.

### 2.2 Pemilih Warna Bebas (`FolderModal.tsx`)
Pada bagian **Pilihan Warna Folder**:
1. Tampilkan 6 swatch preset cepat dengan `style={{ backgroundColor: c.hex }}`.
2. Tambahkan pemilih warna bebas:
   - Tombol swatch **Custom** yang membungkus `<input type="color">` browser dengan warna aktif saat ini.
   - Input teks kode Hex (`#RRGGBB`, misal `#7c5cff`) di sebelah color picker yang tersinkronisasi dua arah dengan color picker dan swatch preview. Jika user mengetik kode Hex valid (dengan atau tanpa awalan `#`), state `warna` diperbarui menjadi `#rrggbb`; saat blur, nilai teks kembali disesuaikan dengan warna valid aktif.
3. Tampilkan **Pratinjau Ikon Folder** menggunakan `resolveFolderTheme(warna)` agar pengguna langsung melihat hasil warna tile folder sebelum menyimpan.
4. Validasi sebelum submit: pastikan nilai `warna` adalah preset yang dikenal atau kode `#rrggbb` valid.

### 2.3 Halaman Daftar & Detail Folder (`Index.tsx` & `Show.tsx`)
- **`Index.tsx`**: Hapus `COLOR_MAP` lokal, gunakan `resolveFolderTheme(folder.warna)` untuk styling kartu folder dan tile ikon `<Folder />`.
- **`Show.tsx`**: Gunakan `resolveFolderTheme(folder.warna)` untuk ikon folder pada `PageHeader`.

---

## 3. Desain Backend (`SkSuratController.php`)

- Pada `storeFolder()` dan `updateFolder()`:
  - Validasi `warna`: `'nullable'`, `'string'`, `'max:50'`, ditambah rule custom yang hanya menerima salah satu preset (`indigo`, `emerald`, `amber`, `rose`, `sky`, `purple`) atau format hex `/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/`.
  - Normalisasi kode hex menjadi format 6-digit huruf kecil `#rrggbb` (mengubah `#abc` menjadi `#aabbcc`) sebelum disimpan ke `sk_folders.warna`.
  - Default `storeFolder()` dan `updateFolder()` bila `warna` kosong/null adalah `'indigo'`.
- Kolom `sk_folders.warna` (`string`, default `'indigo'`) sudah mendukung string warna hingga 255 karakter sehingga tidak diperlukan migrasi database.

---

## 4. Rencana Verifikasi

1. Buat test terisolasi `tests/Feature/SkSuratFolderColorTest.php` untuk menguji:
   - Bendahara dapat membuat dan memperbarui folder dengan kode hex custom (termasuk normalisasi `#abc` / `#A1B2C3` → huruf kecil 6-digit).
   - Bendahara tetap dapat membuat folder dengan preset warna lama (`sky`, `indigo`, dll.).
   - Nilai `warna` tidak valid (mis. string sembarang / CSS injection) ditolak dengan validation error.
2. Jalankan `php artisan test --filter=SkSuratFolderColorTest`, `vendor/bin/pint --test`, dan `npm run build`.
