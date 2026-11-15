# Desain Pemulihan Helper Role User & Perbaikan Temuan Review SK Folder

**Tanggal:** 2026-11-14
**Status:** Disetujui untuk peninjauan spec
**Ruang Lingkup:**
- `app/Models/User.php`
- `app/Http/Middleware/HandleInertiaRequests.php`
- `app/Http/Controllers/SkSuratController.php`
- `resources/js/Pages/SkSurat/Partials/folderColors.ts`
- `resources/js/Pages/SkSurat/Partials/FolderIconTile.tsx` (baru)
- `resources/js/Pages/SkSurat/Partials/FolderModal.tsx`
- `resources/js/Pages/SkSurat/Index.tsx`
- `resources/js/Pages/SkSurat/Show.tsx`
- `tests/Feature/SkSuratFolderColorTest.php`

---

## 1. Latar Belakang & Masalah

Saat pengguna mengirim form `POST /sk-surat/folder` untuk membuat folder baru, server melempar `BadMethodCallException: Call to undefined method App\Models\User::isKepalaSekolah()` di `SkSuratController::storeFolder()`. Pemeriksaan terhadap codebase menunjukkan:
1. `app/Models/User.php` tidak memiliki method `isKepalaSekolah()`, `isBendahara()`, dan belum memasukkan `'role'` ke `$fillable`. Hal ini juga berdampak pada `PreventKepalaSekolahMutations`, `PenganggaranApprovalController`, `UserManagementController`, serta test `SkSuratTest` dan `RoleKepalaSekolahTest`.
2. `app/Http/Middleware/HandleInertiaRequests.php` membagikan `$request->user()` tanpa `is_kepala_sekolah` dan `is_bendahara`, padahal `Sidebar.tsx`, `SkSurat/Index.tsx`, dan `SkSurat/Show.tsx` membaca `auth.user.is_kepala_sekolah`.
3. Code review pada perubahan warna folder custom (`fd6cffe1`) menemukan:
   - `FolderModal.tsx` belum memvalidasi `hexInput` / `warna` sebelum submit ketika `hexInput` sedang tidak valid.
   - `folderColors.ts` belum menyertakan varian `dark:bg-*` pada tile preset sehingga tetap memakai latar pastel terang di dark mode.
   - Pola regex hex diduplikasi di `SkSuratController`, serta markup tile ikon `<Folder />` diduplikasi di `Index.tsx`, `Show.tsx`, dan `FolderModal.tsx`.
   - `SkSuratFolderColorTest.php` belum menguji endpoint HTTP `POST /sk-surat/folder` dan `PUT /sk-surat/folder/{id}`.

---

## 2. Desain Backend

### 2.1 `app/Models/User.php`
- Tambahkan `'role'` ke `$fillable`.
- Tambahkan method helper role sesuai kontrak multi-user SIKAS:
  ```php
  public function isKepalaSekolah(): bool
  {
      return $this->role === 'kepala_sekolah';
  }

  public function isBendahara(): bool
  {
      return $this->role === 'bendahara' || empty($this->role);
  }
  ```

### 2.2 `app/Http/Middleware/HandleInertiaRequests.php`
- Pada `share()`, tetap pertahankan seluruh atribut `$user->toArray()` yang sudah ada sambil menambahkan status role:
  ```php
  'auth' => [
      'user' => function () use ($request) {
          $user = $request->user();
          if (! $user) {
              return null;
          }

          return array_merge($user->toArray(), [
              'role' => $user->role ?? 'bendahara',
              'is_kepala_sekolah' => $user->isKepalaSekolah(),
              'is_bendahara' => $user->isBendahara(),
          ]);
      },
  ],
  ```

### 2.3 `app/Http/Controllers/SkSuratController.php`
- Satukan pola regex hex dalam satu konstanta `private const HEX_COLOR_PATTERN = '/^#(?:([0-9a-fA-F]{3})|([0-9a-fA-F]{6}))$/';` dan satu helper internal `isValidHexColor()` sehingga `folderValidationRules()` dan `normalizeFolderColor()` berbagi satu definisi pola validasi tanpa duplikasi.

---

## 3. Desain Frontend

### 3.1 `folderColors.ts` & `FolderIconTile.tsx`
- Tambahkan `dark:bg-*` lembut pada `PRESET_FOLDER_COLORS`:
  - `indigo` / `purple`: `dark:bg-brand-500/15`
  - `emerald`: `dark:bg-emerald-500/15`
  - `amber`: `dark:bg-amber-500/15`
  - `rose`: `dark:bg-rose-500/15`
  - `sky`: `dark:bg-sky/15`
- Gunakan `[border-color:var(--folder-border)]` dan `hover:[border-color:var(--folder-glow)]` untuk custom hex.
- Buat komponen kecil `FolderIconTile.tsx` dengan prop `theme: FolderTheme` dan `size?: 'sm' | 'lg'` (`h-10 w-10` vs `h-11 w-11`) untuk dipakai bersama di `FolderModal.tsx`, `Index.tsx`, dan `Show.tsx`.

### 3.2 `FolderModal.tsx`
- Pada `handleSubmit()`:
  - Validasi bahwa `hexInput` (bila teks tidak sama dengan `activeTheme.hex` saat ini) adalah hex valid via `normalizeHexColor(hexInput)`. Jika tidak valid, tampilkan `errorMsg`: `'Kode warna hex tidak valid. Gunakan format #RGB atau #RRGGBB.'` dan batalkan submit.
  - Pastikan `warna` yang dikirim merupakan preset yang dikenal atau kode `#rrggbb` valid (bila bukan keduanya, tampilkan pesan error yang sama dan batalkan submit).

---

## 4. Rencana Verifikasi

1. Perbarui `tests/Feature/SkSuratFolderColorTest.php` agar menguji HTTP endpoint nyata:
   - `POST /sk-surat/folder` sebagai `bendahara` dengan warna custom hex (`#FF6B00` → `#ff6b00`) dan preset (`sky`), memastikan redirect ke `sk-surat.show` dan data tersimpan di `sk_folders`.
   - `PUT /sk-surat/folder/{id}` sebagai `bendahara` memperbarui ke hex pendek (`#09a` → `#0099aa`).
   - `POST /sk-surat/folder` dengan `warna` tidak valid gagal validasi (tidak tersimpan).
   - `POST /sk-surat/folder` sebagai `kepala_sekolah` ditolak dengan `403 Forbidden`.
2. Jalankan:
   - `php artisan test --filter=SkSuratFolderColorTest`
   - `php artisan test --filter=SkSuratTest`
   - `php artisan test --filter=RoleKepalaSekolahTest`
   - `vendor/bin/pint --test` pada file PHP yang diubah
   - `npm run build` (`tsc && vite build`)
# Desain Pemulihan Helper Role User & Perbaikan Temuan Review SK Folder

**Tanggal:** 2026-11-14
**Status:** Disetujui untuk peninjauan spec
**Ruang Lingkup:**
- `app/Models/User.php`
- `app/Http/Middleware/HandleInertiaRequests.php`
- `app/Http/Controllers/SkSuratController.php`
- `resources/js/Pages/SkSurat/Partials/folderColors.ts`
- `resources/js/Pages/SkSurat/Partials/FolderIconTile.tsx` (baru)
- `resources/js/Pages/SkSurat/Partials/FolderModal.tsx`
- `resources/js/Pages/SkSurat/Index.tsx`
- `resources/js/Pages/SkSurat/Show.tsx`
- `tests/Feature/SkSuratFolderColorTest.php`

---

## 1. Latar Belakang & Masalah

Saat pengguna mengirim form `POST /sk-surat/folder` untuk membuat folder baru, server melempar `BadMethodCallException: Call to undefined method App\Models\User::isKepalaSekolah()` di `SkSuratController::storeFolder()`. Pemeriksaan terhadap codebase menunjukkan:
1. `app/Models/User.php` tidak memiliki method `isKepalaSekolah()`, `isBendahara()`, dan belum memasukkan `'role'` ke `$fillable`. Hal ini juga berdampak pada `PreventKepalaSekolahMutations`, `PenganggaranApprovalController`, `UserManagementController`, serta test `SkSuratTest` dan `RoleKepalaSekolahTest`.
2. `app/Http/Middleware/HandleInertiaRequests.php` membagikan `$request->user()` tanpa `is_kepala_sekolah` dan `is_bendahara`, padahal `Sidebar.tsx`, `SkSurat/Index.tsx`, dan `SkSurat/Show.tsx` membaca `auth.user.is_kepala_sekolah`.
3. Code review pada perubahan warna folder custom (`fd6cffe1`) menemukan:
   - `FolderModal.tsx` belum memvalidasi `hexInput` / `warna` sebelum submit ketika `hexInput` sedang tidak valid.
   - `folderColors.ts` belum menyertakan varian `dark:bg-*` pada tile preset sehingga tetap memakai latar pastel terang di dark mode.
   - Pola regex hex diduplikasi di `SkSuratController`, serta markup tile ikon `<Folder />` diduplikasi di `Index.tsx`, `Show.tsx`, dan `FolderModal.tsx`.
   - `SkSuratFolderColorTest.php` belum menguji endpoint HTTP `POST /sk-surat/folder` dan `PUT /sk-surat/folder/{id}`.

---

## 2. Desain Backend

### 2.1 `app/Models/User.php`
- Tambahkan `'role'` ke `$fillable`.
- Tambahkan method helper role sesuai kontrak multi-user SIKAS:
  ```php
  public function isKepalaSekolah(): bool
  {
      return $this->role === 'kepala_sekolah';
  }

  public function isBendahara(): bool
  {
      return $this->role === 'bendahara' || empty($this->role);
  }
  ```

### 2.2 `app/Http/Middleware/HandleInertiaRequests.php`
- Pada `share()`, tetap pertahankan seluruh atribut `$user->toArray()` yang sudah ada sambil menambahkan status role:
  ```php
  'auth' => [
      'user' => function () use ($request) {
          $user = $request->user();
          if (! $user) {
              return null;
          }

          return array_merge($user->toArray(), [
              'role' => $user->role ?? 'bendahara',
              'is_kepala_sekolah' => $user->isKepalaSekolah(),
              'is_bendahara' => $user->isBendahara(),
          ]);
      },
  ],
  ```

### 2.3 `app/Http/Controllers/SkSuratController.php`
- Satukan pola regex hex dalam satu konstanta `private const HEX_COLOR_PATTERN = '/^#(?:([0-9a-fA-F]{3})|([0-9a-fA-F]{6}))$/';` dan satu helper internal `isValidHexColor()` sehingga `folderValidationRules()` dan `normalizeFolderColor()` berbagi satu definisi pola validasi tanpa duplikasi.

---

## 3. Desain Frontend

### 3.1 `folderColors.ts` & `FolderIconTile.tsx`
- Tambahkan `dark:bg-*` lembut pada `PRESET_FOLDER_COLORS`:
  - `indigo` / `purple`: `dark:bg-brand-500/15`
  - `emerald`: `dark:bg-emerald-500/15`
  - `amber`: `dark:bg-amber-500/15`
  - `rose`: `dark:bg-rose-500/15`
  - `sky`: `dark:bg-sky/15`
- Gunakan `[border-color:var(--folder-border)]` dan `hover:[border-color:var(--folder-glow)]` untuk custom hex.
- Buat komponen kecil `FolderIconTile.tsx` dengan prop `theme: FolderTheme` dan `size?: 'sm' | 'lg'` (`h-10 w-10` vs `h-11 w-11`) untuk dipakai bersama di `FolderModal.tsx`, `Index.tsx`, dan `Show.tsx`.

### 3.2 `FolderModal.tsx`
- Pada `handleSubmit()`:
  - Validasi bahwa `hexInput` (bila teks tidak sama dengan `activeTheme.hex` saat ini) adalah hex valid via `normalizeHexColor(hexInput)`. Jika tidak valid, tampilkan `errorMsg`: `'Kode warna hex tidak valid. Gunakan format #RGB atau #RRGGBB.'` dan batalkan submit.
  - Pastikan `warna` yang dikirim merupakan preset yang dikenal atau kode `#rrggbb` valid (bila bukan keduanya, tampilkan pesan error yang sama dan batalkan submit).

---

## 4. Rencana Verifikasi

1. Perbarui `tests/Feature/SkSuratFolderColorTest.php` agar menguji HTTP endpoint nyata:
   - `POST /sk-surat/folder` sebagai `bendahara` dengan warna custom hex (`#FF6B00` → `#ff6b00`) dan preset (`sky`), memastikan redirect ke `sk-surat.show` dan data tersimpan di `sk_folders`.
   - `PUT /sk-surat/folder/{id}` sebagai `bendahara` memperbarui ke hex pendek (`#09a` → `#0099aa`).
   - `POST /sk-surat/folder` dengan `warna` tidak valid gagal validasi (tidak tersimpan).
   - `POST /sk-surat/folder` sebagai `kepala_sekolah` ditolak dengan `403 Forbidden`.
2. Jalankan:
   - `php artisan test --filter=SkSuratFolderColorTest`
   - `php artisan test --filter=SkSuratTest`
   - `php artisan test --filter=RoleKepalaSekolahTest`
   - `vendor/bin/pint --test` pada file PHP yang diubah
   - `npm run build` (`tsc && vite build`)

