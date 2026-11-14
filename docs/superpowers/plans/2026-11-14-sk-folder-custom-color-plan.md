# Rencana Implementasi Warna Folder Custom / Bebas (SK & Dokumen Surat)

> **For agentic workers:** Gunakan rencana bertahap berikut untuk membuat helper warna folder bersama, menambahkan color picker + input Hex bebas di `FolderModal`, memperbarui `Index.tsx` & `Show.tsx`, memperketat validasi + normalisasi di `SkSuratController`, dan memverifikasi via PHPUnit, Pint, dan Vite build.

**Tujuan:** Memungkinkan pengguna memilih warna folder bebas (kode Hex `#RRGGBB` melalui color picker atau input teks) selain 6 preset warna bawaan, serta memperbaiki swatch `Sky` yang sebelumnya tersembunyi.

**Arsitektur:** Modul `folderColors.ts` menjadi single source of truth untuk preset warna dan konversi Hex → inline Neo-Bento theme (`tileStyle` + CSS variables `--folder-border` / `--folder-glow`). `SkSuratController` memvalidasi dan menormalkan `#RGB`/`#RRGGBB` ke huruf kecil 6-digit.

**Tech Stack:** Laravel 13, PHP 8.3, React 18, TypeScript (strict), Tailwind 3, Vite 7.

---

### Task 1: Buat shared module `resources/js/Pages/SkSurat/Partials/folderColors.ts`

- [ ] **Step 1:** Definisikan `PRESET_FOLDER_COLORS` dengan nilai `hex` representatif dan kelas Neo-Bento (`bg`, `text`, `border`, `glow`) untuk `indigo`, `emerald`, `amber`, `rose`, `sky`, dan `purple`.
- [ ] **Step 2:** Tambahkan helper `normalizeHexColor(value)` (`#RGB`/`#RRGGBB` → `#rrggbb`), `hexToRgba(hex, alpha)`, dan `resolveFolderTheme(warna)`.

### Task 2: Tambahkan pemilih warna bebas + pratinjau di `FolderModal.tsx`

- [ ] **Step 1:** Gunakan `PRESET_FOLDER_COLORS` dan render dot swatch preset memakai `style={{ backgroundColor: c.hex }}` (mengatasi `bg-sky-500` yang hilang di Tailwind).
- [ ] **Step 2:** Tambahkan swatch + `<input type="color">` bebas dan input kode Hex `#RRGGBB` tersinkronisasi dua arah, serta pratinjau langsung tile `<Folder />` memakai `resolveFolderTheme(warna)`.

### Task 3: Terapkan `resolveFolderTheme` di `Index.tsx` dan `Show.tsx`

- [ ] **Step 1:** Di `Index.tsx`, hapus `COLOR_MAP` lokal dan pakai `resolveFolderTheme(folder.warna)` pada kartu folder (`style={theme.cardStyle}` + hover border CSS var) dan tile ikon folder (`style={theme.tileStyle}`).
- [ ] **Step 2:** Di `Show.tsx`, pakai `resolveFolderTheme(folder.warna)` pada tile ikon folder di `PageHeader`.

### Task 4: Perketat validasi & normalisasi di `SkSuratController.php`

- [ ] **Step 1:** Tambahkan helper statis `folderValidationRules()` dan `normalizeFolderColor(?string $warna)` pada `SkSuratController` untuk memvalidasi preset dikenal atau format Hex `#RGB`/`#RRGGBB`, serta menormalkan Hex ke `#rrggbb`.
- [ ] **Step 2:** Gunakan helper tersebut pada `storeFolder()` dan `updateFolder()`.

### Task 5: Tambah Test & Verifikasi

- [ ] **Step 1:** Buat `tests/Feature/SkSuratFolderColorTest.php` yang menguji validasi preset + custom Hex, normalisasi `#abc` / `#A1B2C3`, penolakan string tidak valid, dan penyimpanan pada `SkFolder`.
- [ ] **Step 2:** Jalankan `php artisan test --filter=SkSuratFolderColorTest`, `vendor/bin/pint --test`, dan `npm run build`.
- [ ] **Step 3:** Commit seluruh perubahan ke `main`.
