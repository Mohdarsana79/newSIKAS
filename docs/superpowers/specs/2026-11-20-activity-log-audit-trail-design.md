# Spesifikasi Desain: Audit Trail / Log Aktivitas Pengguna

- **Tanggal:** 2026-11-20
- **Status:** Draft untuk Review Pengguna
- **Subsistem:** #1 dari 4 (Fondasi Jejak Aktivitas Lintas Modul & 4 Varian BOSP)
- **Lingkup:** Backend (Migration, Model, Service, Middleware, Auth Hooks, Controller, RBAC, Tests) + Frontend (Halaman Neo-Bento `ActivityLogs`, Sidebar, Pencarian Fitur `Ctrl+K`)

---

## 1. Tujuan & Masalah yang Diselesaikan

Aplikasi `newSIKAS` digunakan bersama oleh Bendahara, Kepala Sekolah, dan role custom untuk mengelola anggaran dan penatausahaan dana BOSP pada 4 varian (`reguler`, `kinerja`, `silpa`, `kinerja_silpa`). Saat ini belum tersedia catatan audit terpusat untuk menjawab *"siapa melakukan apa, kapan, pada modul/varian apa, dan dari perangkat mana"*.

Fitur **Audit Trail / Log Aktivitas Pengguna** menyediakan pencatatan aktivitas otomatis, aman, immutable (tidak dapat diedit/dihapus satuan), mudah ditelusuri dengan filter multi-dimensi, dapat diekspor ke CSV siap buka di Excel, serta mendukung retensi pembersihan log lama yang terkontrol oleh RBAC.

---

## 2. Arsitektur Data & Skema Database

### 2.1 Tabel `activity_logs`

Migrasi: `database/migrations/2026_11_20_100000_create_activity_logs_table.php` (kompatibel penuh dengan **PostgreSQL** maupun **SQLite `:memory:`** untuk `composer test`).

| Kolom | Tipe (Laravel Schema) | Keterangan |
|---|---|---|
| `id` | `id()` (`bigIncrements`) | Primary key |
| `user_id` | `foreignId('user_id')->nullable()->constrained('users')->nullOnDelete()` | Relasi ke `users`; `null` jika gagal login atau akun sudah dihapus |
| `actor_name` | `string('actor_name', 150)` | Snapshot nama aktor saat kejadian (tetap terbaca meski akun dihapus) |
| `actor_username` | `string('actor_username', 150)->nullable()` | Snapshot username/identifier (termasuk percobaan gagal login) |
| `actor_role` | `string('actor_role', 64)->nullable()` | Snapshot slug/nama role saat kejadian (`bendahara`, `kepala_sekolah`, dll.) |
| `module` | `string('module', 64)` | Kunci modul (`auth`, `penganggaran`, `penatausahaan`, `kwitansi`, `backup`, `user_management`, `activity_logs`, `profile`, dll.) |
| `variant` | `string('variant', 32)->nullable()` | Varian BOSP aktif (`reguler`, `kinerja`, `silpa`, `kinerja_silpa`, atau `null` untuk aksi global/sistem) |
| `action` | `string('action', 64)` | Kategori aksi standar (`login`, `logout`, `login_failed`, `password_reset`, `create`, `update`, `delete`, `approve`, `unapprove`, `review`, `import`, `backup`, `restore`, `reset`, `prune`, `access_denied`, `action`) |
| `severity` | `string('severity', 16)->default('info')` | Tingkat keparahan: `info`, `warning`, `critical` |
| `description` | `text('description')` | Ringkasan Bahasa Indonesia yang jelas bagi auditor |
| `route_name` | `string('route_name', 150)->nullable()` | Nama route Laravel (mis. `kinerja-bku.store`) |
| `http_method` | `string('http_method', 12)->nullable()` | Metode HTTP (`POST`, `PUT`, `PATCH`, `DELETE`, `GET`) |
| `url_path` | `string('url_path', 255)->nullable()` | Path relatif URL tanpa query sensitif |
| `status_code` | `unsignedSmallInteger('status_code')->nullable()` | Kode status HTTP respons |
| `ip_address` | `string('ip_address', 45)->nullable()` | IPv4 / IPv6 klien |
| `user_agent` | `string('user_agent', 512)->nullable()` | Header `User-Agent` terpotong aman maks 512 karakter |
| `metadata` | `jsonb('metadata')->nullable()` | Payload ter-sanitasi, parameter route, info berkas upload, atau ringkasan tambahan |
| `created_at` | `timestamp('created_at')->useCurrent()` | Waktu kejadian (konsisten dengan seluruh migrasi `newSIKAS`, tanpa `updated_at`) |

### 2.2 Indeks Komposit (Mengikuti PostgreSQL Best Practices)

Kolom equality ditempatkan di kiri, kolom range/urutan (`created_at`) di kanan:
1. `activity_logs_created_at_idx`: `['created_at']` — feed kronologis default & query retensi `prune`.
2. `activity_logs_module_created_idx`: `['module', 'created_at']` — filter modul + urutan terbaru.
3. `activity_logs_user_created_idx`: `['user_id', 'created_at']` — filter pengguna + urutan terbaru.
4. `activity_logs_action_created_idx`: `['action', 'created_at']` — filter jenis aksi + urutan terbaru.
5. `activity_logs_variant_created_idx`: `['variant', 'created_at']` — filter varian BOSP + urutan terbaru.
6. `activity_logs_severity_created_idx`: `['severity', 'created_at']` — filter tingkat keparahan + KPI kritis.

### 2.3 Backfill Izin Role Sistem pada Migrasi

Di akhir method `up()` migrasi yang sama, bila tabel `roles` sudah ada:
- Untuk role sistem `bendahara`: bila `permissions.modules` belum memiliki kunci `activity_logs`, set ke `write`.
- Untuk role sistem `kepala_sekolah`: bila `permissions.modules` belum memiliki kunci `activity_logs`, set ke `read`.
- Tidak menimpa jika kunci `activity_logs` sudah pernah diset secara eksplisit.

### 2.4 Model `App\Models\ActivityLog`

- `public const UPDATED_AT = null;` (immutable — tidak menggunakan `updated_at`).
- Konstanta severity: `SEVERITY_INFO = 'info'`, `SEVERITY_WARNING = 'warning'`, `SEVERITY_CRITICAL = 'critical'`.
- Relasi `user(): BelongsTo` ke `User::class`.
- Casts: `metadata => 'array'`, `status_code => 'integer'`, `created_at => 'datetime'`.
- Query scope `scopeFilter(Builder $query, array $filters)` terpusat agar halaman `index` dan ekspor CSV menggunakan logika filter yang 100% identik.

---

## 3. Mekanisme Pencatatan Aktivitas

### 3.1 Service `App\Services\ActivityLogger`

Service terpusat dengan kontrak utama:
- `log(array $attributes): ?ActivityLog` — menulis satu entri secara **fail-safe** (`try/catch Throwable` agar error DB/saat restore tidak pernah memutus transaksi pengguna).
- `logHttpMutation(Request $request, Response $response, ?User $actor = null): ?ActivityLog` — dipakai middleware global untuk memetakan route, modul, varian, aksi, severity, deskripsi Bahasa Indonesia, dan metadata ter-sanitasi secara otomatis.
- `logAuthEvent(Request $request, string $action, string $description, ?User $user = null, string $severity = 'info', array $extraMetadata = []): ?ActivityLog` — dipakai auth hooks.
- `sanitizePayload(array $input, array $files = []): array` — membersihkan data sensitif dan membatasi kedalaman/ukuran payload.

#### Aturan Sanitasi Sensitif
Setiap kunci (case-insensitive / substring match) yang mengandung salah satu token berikut wajib diganti menjadi `'[DISENSOR]'`:
- `password`, `password_confirmation`, `current_password`, `new_password`
- `security_code`, `deepseek_api_key`, `api_key`, `token`, `_token`, `secret`, `otp`, `npsn`, `authorization`, `cookie`

Aturan tambahan payload:
- Field `_method` dibuang dari payload tampilan.
- Input upload file (`UploadedFile`) diubah menjadi ringkasan aman: `['file' => nama_asli, 'size_kb' => ukuran_kb, 'mime' => mime]`.
- String panjang dipotong aman maks `500` karakter; array dibatasi maks `40` item & kedalaman `4` level agar ukuran baris `jsonb` tetap ringan.

#### Aturan Pemetaan Aksi, Severity & Deskripsi Otomatis
- **Resolusi Modul:** memakai `PermissionCatalog::resolveRouteRequirement($routeName, $method)` sebagai sumber kebenaran utama, ditambah pemetaan eksplisit untuk `profile.*` → `profile`, `password.*` → `auth`, `activity-logs.*` → `activity_logs`.
- **Resolusi Varian:** jika route termasuk route varian (`VariantConfig::VARIANTS`) atau memiliki prefix varian (`kinerja-`, `silpa-`, `kinerja-silpa-`), simpan kode varian (`reguler`, `kinerja`, `silpa`, `kinerja_silpa`). Untuk route global (`backup`, `management-role`, `profile`, `auth`, `network-settings`, `system-update`, `sk-surat`, `activity-logs`), `variant = null`.
- **Klasifikasi Aksi:**
  - `approve` / `unapprove` (`penganggaran.approve`, `penganggaran.unapprove`)
  - `review` (`rkas-review.*`)
  - `backup` / `restore` / `reset` (`backup.create`, `backup.restore`, `backup.reset`, `backup.upload-restore`)
  - `import` (route mengandung `import` atau `sync`)
  - `prune` (`activity-logs.prune`)
  - `access_denied` (status HTTP `403`)
  - Default dari HTTP method / nama aksi route: `DELETE` / `.destroy` / `.delete` → `delete`; `PUT`/`PATCH`/`.update` → `update`; `POST`/`.store`/`.create` → `create`; lainnya → `action`.
- **Klasifikasi Severity:**
  - `critical`: `restore`, `reset`, `prune`, `unapprove`, penghapusan user/role (`user-management.destroy`, `management-role.roles.destroy`), perubahan permission (`user-management.permissions`, `management-role.roles.update`), reset password OTP, update NPSN, lockout rate-limit login.
  - `warning`: `access_denied` (`403`), `login_failed`, semua aksi `delete`, `password.update`, `profile.toggle-security`, `profile.generate-security-code`, aksi `system-update.start-online`/`upload-manual`, respons error `>= 400`.
  - `info`: semua mutasi normal berhasil (`create`, `update`, `approve`, `review`, `login`, `logout`, `backup`, dll.).

### 3.2 Middleware Global `App\Http\Middleware\RecordUserActivity`

Didaftarkan di `bootstrap/app.php` pada grup middleware `web` **tepat sebelum** `EnforceModulePermissions` (membungkusnya). Dengan urutan ini, saat `EnforceModulePermissions` melempar `HttpException(403)`, `RecordUserActivity` dapat menangkap `HttpExceptionInterface` berstatus `403`, mencatat `access_denied`, lalu melempar kembali exception tersebut agar respons HTTP tetap `403`.

Aturan eksekusi `RecordUserActivity`:
1. Hanya mencatat metode mutasi (`POST`, `PUT`, `PATCH`, `DELETE`), atau `GET` khusus bila terjadi `403 Forbidden`.
2. Hanya mencatat bila ada user login saat request masuk (menangkap snapshot `$actor = $request->user()` sebelum `$next($request)`).
3. Mengecualikan route non-mutasi / noise / yang sudah ditangani auth hooks atau controller khusus:
   - `login`, `logout`, `register`, `password.otp.send`, `password.otp.verify`, `password.otp.reset`
   - `api.ai.copilot.chat`, `api.bku.ai-generate-uraian`, `arkas-tools.ai-diagnose*`, `rkas.ai-executive-review`, `backup.validate-password` *(catatan: `api.ai.copilot.commit` **tetap dicatat** karena melakukan mutasi transaksi BKU)*
   - `api.notifications.*`
   - `activity-logs.prune` (mencatat log terstruktur sendiri dengan jumlah baris yang dibersihkan)
   - `backup.restore-progress`, `system-update.progress`
4. Setelah `$response = $next($request)`, hanya melewati pencatatan jika respons `422 Unprocessable Entity` (kesalahan validasi form biasa tidak mengotori audit trail). Untuk status `2xx`, `3xx`, `403`, atau `5xx`, tetap dicatat.

### 3.3 Auth Hooks Presisi (Bebas Log Palsu 2FA)

1. **`App\Http\Requests\Auth\LoginRequest::authenticate()`** & **`ensureIsNotRateLimited()`**:
   - Username tidak terdaftar → `login_failed` (`warning`, metadata `reason: 'username_not_found'`).
   - Password salah → `login_failed` (`warning`, dengan `user_id` target & metadata `reason: 'invalid_password'`).
   - Terkena rate limit (`Lockout`) → `login_failed` (`critical`, metadata `reason: 'rate_limited'`).
2. **`App\Http\Controllers\Auth\AuthenticatedSessionController`**:
   - Dalam `store()`:
     - Jika 2FA aktif dan `security_code` belum diisi (langkah challenge) → **TIDAK** mencatat login/logout.
     - Jika 2FA aktif dan `security_code` salah → catat `login_failed` (`warning`, metadata `reason: 'invalid_security_code'`).
     - Setelah autentikasi + 2FA lolos dan session diregenerasi → catat `login` (`info`, *"Masuk ke aplikasi SIKAS"*).
   - Dalam `destroy()`: ambil `$user = $request->user()` sebelum logout, lalu catat `logout` (`info`, *"Keluar dari aplikasi SIKAS"*).
3. **`App\Http\Controllers\Auth\OtpPasswordResetController::resetPassword()`**:
   - Setelah password berhasil direset → catat `password_reset` (`critical`, *"Mereset kata sandi akun melalui OTP email"*).

---

## 4. RBAC, Routes, Controller & Kebijakan Integritas

### 4.1 Registrasi RBAC (`app/Config/PermissionCatalog.php`)

- Tambah modul baru pada `modules()` di grup `'Integrasi & Sistem'`:
  ```php
  [
      'key' => 'activity_logs',
      'label' => 'Log Aktivitas (Audit Trail)',
      'group' => 'Integrasi & Sistem',
      'description' => 'Memantau riwayat aktivitas pengguna, ekspor CSV audit, dan pembersihan log lama.',
      'supports_write' => true,
  ]
  ```
- Preset default `defaultPermissionsForRole()`:
  - `bendahara`: `write` (otomatis karena `supports_write: true`).
  - `kepala_sekolah`: `read` (tidak dimasukkan ke `$systemHidden` sehingga Kepala Sekolah mendapat akses baca default).
  - Role custom lain: `none`.
- Pemetaan route di `resolveRouteRequirement()`:
  - `'activity-logs' => 'activity_logs'` (`GET` memerlukan `read`, `POST /log-aktivitas/prune` memerlukan `write`).

### 4.2 Routes (`routes/web.php`)

Di dalam grup `Route::middleware('auth')` (tanpa middleware `role:bendahara`, melainkan mengandalkan `EnforceModulePermissions` sehingga Kepala Sekolah & role custom yang diberi izin tetap bisa mengakses sesuai RBAC):

```php
Route::prefix('log-aktivitas')->name('activity-logs.')->group(function () {
    Route::get('/', [ActivityLogController::class, 'index'])->name('index');
    Route::get('/export', [ActivityLogController::class, 'export'])->name('export');
    Route::post('/prune', [ActivityLogController::class, 'prune'])->name('prune');
});
```

### 4.3 Controller `App\Http\Controllers\ActivityLogController`

1. **`index(Request $request)`** (`GET /log-aktivitas`):
   - Validasi ringan parameter filter: `search`, `user_id`, `module`, `variant`, `action`, `severity`, `date_from`, `date_to`, `per_page` (`15`, `25`, `50`, default `25`).
   - Query terpaginasi `ActivityLog::query()->filter($filters)->orderByDesc('created_at')->orderByDesc('id')->paginate($perPage)->withQueryString()`.
   - Ringkasan KPI (`stats`):
     - `total`: total entri log keseluruhan
     - `today`: jumlah aktivitas hari ini (berdasarkan `now()->startOfDay()`)
     - `critical_or_security`: jumlah log ber-severity `critical` atau aksi keamanan (`login_failed`, `access_denied`, `password_reset`, `reset`, `restore`) dalam 30 hari terakhir
     - `active_users_7d`: jumlah pengguna unik (`distinct user_id`) yang aktif dalam 7 hari terakhir
   - Opsi dropdown filter (`filterOptions`): daftar pengguna (`users` + aktor distinct), daftar modul berlabel Bahasa Indonesia, daftar varian BOSP, daftar aksi, daftar severity.
   - Prop `canPrune`: `$request->user()->canAccessModule('activity_logs', PermissionCatalog::LEVEL_WRITE)`.
2. **`export(Request $request)`** (`GET /log-aktivitas/export`):
   - Streamed CSV (`Symfony\Component\HttpFoundation\StreamedResponse`) dengan **UTF-8 BOM** (`"\xEF\xBB\xBF"`) agar karakter Indonesia & format kolom langsung rapi dibuka di Microsoft Excel.
   - Mengikuti filter aktif yang sama persis (`ActivityLog::query()->filter($filters)`), dibatasi secara aman dengan `cursor()` (hemat memori) maks `10.000` baris terbaru per unduhan.
   - Kolom CSV: `Waktu`, `Pengguna`, `Username`, `Role`, `Modul`, `Varian BOSP`, `Aksi`, `Tingkat`, `Deskripsi`, `Metode`, `Route`, `Status HTTP`, `IP Address`.
   - Nama file: `audit-trail-sikas-YYYYMMDD-HHmmss.csv`.
3. **`prune(Request $request)`** (`POST /log-aktivitas/prune`):
   - Otorisasi `write` sudah ditegakkan `EnforceModulePermissions`, plus double-check eksplisit `canAccessModule('activity_logs', LEVEL_WRITE)`.
   - Validasi: `retention_days` wajib salah satu dari `[90, 180, 365]`.
   - Menghapus entri dengan `created_at < now()->subDays($retentionDays)`.
   - Langsung mencatat 1 entri audit baru ber-severity `critical` (`module: 'activity_logs'`, `action: 'prune'`, deskripsi menyebutkan jumlah baris yang dibersihkan & batas retensi hari).
   - Redirect back dengan flash message `success` berisi jumlah log yang dibersihkan.

---

## 5. Desain UI Neo-Bento & Integrasi Frontend

### 5.1 Struktur File Frontend

- `resources/js/Pages/ActivityLogs/types.ts` — tipe TypeScript strict (`ActivityLogItem`, `ActivityLogFilters`, `ActivityLogStats`, `ActivityLogFilterOptions`, `PaginatedActivityLogs`).
- `resources/js/Pages/ActivityLogs/utils.ts` — helper presentasi bersama (tone badge, format role, inisial avatar, parser ramah baca Browser & OS dari User-Agent, serta label status hasil).
- `resources/js/Pages/ActivityLogs/Index.tsx` — halaman utama Neo-Bento.
- `resources/js/Pages/ActivityLogs/Partials/ActivityLogDetailModal.tsx` — modal detail Neo-Bento ramah non-teknis: header hero gelap (`#15131F`) dengan ambient glow, badge tingkat & status hasil (*Berhasil* / *Ditolak* / *Gagal*), kartu ringkasan deskripsi aktivitas, dan grid 4 kartu bento (Pelaku, Waktu, Modul & Varian BOSP, Perangkat ramah baca + Alamat IP). Tanpa blok JSON payload, tanpa Route Laravel, dan tanpa string mentah User-Agent *(data payload ter-sanitasi tetap disimpan di database untuk arsip internal)*.
- `resources/js/Pages/ActivityLogs/Partials/ActivityLogPruneModal.tsx` — modal konfirmasi Neo-Bento pembersihan log lama (pilihan `> 90 hari`, `> 180 hari`, `> 365 hari`, info jelas bahwa aksi pembersihan akan ikut dicatat).

### 5.2 Elemen Visual Neo-Bento (`ActivityLogs/Index.tsx`)

1. **`PageHeader`:**
   - Breadcrumb: `Sistem` → `Log Aktivitas`
   - `IconTile` tone `violet` (`History` / `ShieldCheck` dari `lucide-react`)
   - Judul: *"Log Aktivitas Pengguna"*
   - Subjudul: *"Rekam jejak audit aktivitas pengguna lintas modul dan varian BOSP secara kronologis."*
   - Badge `StatusBadge` tone `lime`: `Audit Trail`
   - Aksi header: tombol **Ekspor CSV** (sekunder) & tombol **Bersihkan Log Lama** (muncul hanya jika `canPrune === true`).
2. **4 Kartu KPI (`StatCard`):**
   - Total Log Tercatat (`violet`)
   - Aktivitas Hari Ini (`mint`)
   - Event Kritis & Keamanan 30 Hari (`rose` / `amber`)
   - Pengguna Aktif 7 Hari (`sky`)
3. **Floating Glass Filter Dock:**
   - Input pencarian teks bebas (deskripsi, nama aktor, username, route, IP) dengan debounce ringan / submit Enter.
   - Filter dropdown: Pengguna, Modul, Varian BOSP, Aksi, Tingkat (`Info` / `Peringatan` / `Kritis`), serta input tanggal `Dari` dan `Sampai`.
   - Indikator filter aktif + tombol `Reset Filter`.
4. **Tabel Audit Trail Terpaginasi (`Surface`):**
   - Kolom: **Waktu** (tanggal/jam presisi `text-sikas-num` + label relatif), **Pengguna** (avatar inisial + nama + role badge), **Modul & Varian** (label modul + chip varian BOSP jika ada), **Aktivitas** (badge aksi + severity dot + deskripsi Bahasa Indonesia), **IP / Status** (IP address + status HTTP badge), **Aksi** (tombol `Detail`).
   - Empty state ramah bila belum ada log atau filter tidak menemukan hasil.
   - Navigasi pagination Inertia (`preserveState`, `preserveScroll`) + pemilih jumlah baris (`15` / `25` / `50`).
   - Tidak menggunakan `window.confirm` atau `window.alert`; semua feedback tampil sebagai banner/toast inline Neo-Bento dan `Modal` dengan `ariaLabelledBy`.

### 5.3 Integrasi Navigasi & Pencarian Fitur

1. **`resources/js/Components/Sidebar.tsx`:**
   - Tambah `canModule('activity_logs')` pada `showSistem`.
   - Tambah item `NavLink` **Log Aktivitas** di grup *Sistem* (di bawah *Management & Role*), mengarah ke `route('activity-logs.index')`, active `route().current('activity-logs.*')`.
2. **`resources/js/Utils/featureSearchCatalog.ts` & `resources/js/Components/FeatureSearchModal.tsx`:**
   - Pastikan `activity_logs` **tidak** dimasukkan ke `SYSTEM_ONLY_MODULES` (karena Kepala Sekolah boleh akses baca secara default).
   - Tambah entri `activity-logs` pada kategori `Sistem & Integrasi` dengan kata kunci `['audit trail', 'log aktivitas', 'riwayat', 'jejak', 'keamanan', 'aktivitas pengguna']` dan ikon `History`.
   - Tetap **tidak** mencantumkan referensi NPSN/`Alt+9` apa pun di katalog pencarian.

---

## 6. Rencana Pengujian & Verifikasi

### 6.1 PHPUnit Feature Tests (`tests/Feature/ActivityLogTest.php`)
1. Mutasi modul (mis. simpan/ubah/hapus pada controller atau endpoint mutasi) otomatis tercatat di `activity_logs` dengan modul, varian, aksi, deskripsi, dan metadata yang benar.
2. Field sensitif (`password`, `security_code`, `deepseek_api_key`, `npsn`, `_token`) tersensor menjadi `'[DISENSOR]'` di `metadata`.
3. Auth logging: login sukses tercatat `login`; password salah / username salah tercatat `login_failed`; alur challenge 2FA tanpa kode tidak menghasilkan log palsu; salah kode keamanan tercatat `login_failed`; logout tercatat `logout`.
4. RBAC: Bendahara dapat membuka `/log-aktivitas`, mengekspor CSV, dan menjalankan `/log-aktivitas/prune`; Kepala Sekolah dapat membuka `/log-aktivitas` dan mengekspor CSV tetapi mendapat `403` saat mencoba `POST /log-aktivitas/prune` (dan percobaan `403` tersebut tercatat sebagai `access_denied`).
5. Ekspor CSV menghasilkan header UTF-8 BOM, status 200, dan isi sesuai filter yang diterapkan.
6. Pembersihan retensi (`prune`) hanya menghapus log lebih tua dari jumlah hari yang dipilih (`90`/`180`/`365`), mempertahankan log baru, dan otomatis membuat 1 entri log baru ber-severity `critical` untuk aksi `prune` itu sendiri.

### 6.2 Quality Gates
- `vendor/bin/pint` (format PHP sesuai standar Laravel).
- `composer test` (seluruh suite PHPUnit termasuk `ActivityLogTest` lulus pada sqlite `:memory:`).
- `npm run build` (`tsc && vite build` lulus dengan exit code 0 tanpa error TypeScript).
- `/code-review` dua sumbu paralel (**Standards** & **Spec**).
