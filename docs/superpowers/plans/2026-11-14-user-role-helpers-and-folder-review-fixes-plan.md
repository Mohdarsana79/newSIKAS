# Rencana Implementasi Pemulihan Helper Role User & Perbaikan Review SK Folder

> **For agentic workers:** Jalankan tugas berikut untuk memulihkan `User::isKepalaSekolah()` / `isBendahara()`, melengkapi `HandleInertiaRequests`, membereskan temuan code review pada modul warna folder SK, dan memverifikasi via HTTP Feature tests + Pint + Vite build.

**Tujuan:** Mengatasi `BadMethodCallException` saat membuat/mengubah folder SK dan menutup seluruh temuan review pada fitur warna folder.

**Arsitektur:** `User.php` menyimpan `'role'` di `$fillable` serta helper `isKepalaSekolah()` / `isBendahara()`. `HandleInertiaRequests` membagikan flag role di `auth.user`. `folderColors.ts` + `FolderIconTile.tsx` menyeragamkan tema terang/gelap dan komponen tile di `FolderModal`, `Index`, dan `Show`. `SkSuratController` menyatukan regex hex ke satu konstanta.

**Tech Stack:** Laravel 13, PHP 8.3, PHPUnit (`:memory:` sqlite), React 18, TypeScript (strict), Tailwind 3, Vite 7.

---

### Task 1: Pulihkan helper role pada `User` & `HandleInertiaRequests`
- **Modify:** `app/Models/User.php` — tambah `'role'` ke `$fillable`, tambah `isKepalaSekolah(): bool` dan `isBendahara(): bool`.
- **Modify:** `app/Http/Middleware/HandleInertiaRequests.php` — tambahkan `role`, `is_kepala_sekolah`, `is_bendahara` pada `auth.user`.

### Task 2: Rapikan duplikasi regex di `SkSuratController.php`
- **Modify:** `app/Http/Controllers/SkSuratController.php` — ekstrak `private const HEX_COLOR_PATTERN` untuk dipakai bersama oleh `folderValidationRules()` dan `normalizeFolderColor()`.

### Task 3: Perbaiki tema dark-mode preset, shared `FolderIconTile`, dan validasi submit `FolderModal`
- **Modify:** `resources/js/Pages/SkSurat/Partials/folderColors.ts` — tambah `dark:bg-*` pada `PRESET_FOLDER_COLORS`, gunakan `[border-color:var(--folder-border)] hover:[border-color:var(--folder-glow)]`, dan ekspor `isValidFolderColor()`.
- **Create:** `resources/js/Pages/SkSurat/Partials/FolderIconTile.tsx` — komponen tile ikon `<Folder />` bersama (`size="sm" | "lg"`).
- **Modify:** `resources/js/Pages/SkSurat/Partials/FolderModal.tsx` — validasi `hexInput` / `warna` pada `handleSubmit()` sebelum mengirim request, pakai `<FolderIconTile />`.
- **Modify:** `resources/js/Pages/SkSurat/Index.tsx` & `Show.tsx` — gunakan `<FolderIconTile />`.

### Task 4: Perbarui HTTP Feature Tests & Verifikasi
- **Modify:** `tests/Feature/SkSuratFolderColorTest.php` — uji endpoint HTTP `POST /sk-surat/folder`, `PUT /sk-surat/folder/{id}` untuk `bendahara` (custom hex, preset, hex tidak valid) dan `403` untuk `kepala_sekolah`.
- **Verify:** Jalankan `SkSuratFolderColorTest`, `SkSuratTest`, `RoleKepalaSekolahTest`, `vendor/bin/pint --test`, dan `npm run build`.
