# Spesifikasi Desain: Auto-Backup Terjadwal + Retensi Otomatis (+ Opsional Sinkron Google Drive)

- **Tanggal:** 2026-11-21
- **Status:** Draft untuk Review Pengguna
- **Subsistem:** #4 dari 4 (Keandalan Data & Otomatisasi Cadangan)
- **Lingkup:** Backend (Migration `backup_settings` & `backup_runs`, Models, `AutoBackupService`, `GoogleDriveSyncService`, Artisan Command `backup:auto-run`, Scheduler `routes/console.php`, Controller endpoints di `DatabaseController`, Audit Trail integration, PHPUnit Tests) + Frontend (Panel Neo-Bento `AutoBackupPanel.tsx` di `Pages/Backup/Index.tsx`)

---

## 1. Tujuan & Masalah yang Diselesaikan

Saat ini fitur Backup Database di `newSIKAS` ([DatabaseController.php](file:///c:/laragon/www/newSIKAS2/newSIKAS/app/Http/Controllers/DatabaseController.php) & [Backup/Index.tsx](file:///c:/laragon/www/newSIKAS2/newSIKAS/resources/js/Pages/Backup/Index.tsx)) hanya berjalan secara manual. Jika Bendahara lupa melakukan backup rutin, risiko kehilangan data akibat kerusakan perangkat/harddisk cukup tinggi; sebaliknya jika backup sering dilakukan, file `.rsv` lama menumpuk tanpa batas.

Fitur **Auto-Backup Terjadwal + Retensi Otomatis (+ Opsional Sinkron Google Drive)** menambahkan:
1. **Penjadwalan Otomatis:** Harian, Mingguan, atau Bulanan pada jam tertentu menggunakan Laravel Scheduler + Artisan Command (`backup:auto-run`), menghasilkan arsip all-in-one `.rsv` yang 100% kompatibel dengan fitur Restore.
2. **Retensi Otomatis Aman:** membersihkan file lama **khusus hasil auto-backup** (`auto_backup_*.rsv`) berdasarkan batas jumlah simpan dan/atau batas umur hari, dengan jaminan selalu mempertahankan minimal 1 auto-backup terbaru dan **tidak pernah menyentuh backup manual Bendahara**.
3. **Sinkronisasi 3 Mode:** Nonaktif (lokal saja), Salin ke Folder Lokal / Google Drive Desktop (tanpa perlu setup API), atau Upload Langsung ke Google Drive Cloud via **REST API v3** (`Http` bawaan Laravel, kredensial terenkripsi di DB, resumable upload untuk file besar).

---

## 2. Arsitektur Data & Skema Database

Migrasi: `database/migrations/2026_11_21_100000_create_auto_backup_tables.php` (kompatibel penuh dengan **PostgreSQL** & **SQLite `:memory:`**, menggunakan `timestamp` konsisten dengan seluruh migrasi `newSIKAS`).

### 2.1 Tabel `backup_settings` (Konfigurasi Tunggal Aplikasi)

| Kolom | Tipe | Keterangan |
|---|---|---|
| `id` | `id()` | Primary key |
| `is_enabled` | `boolean()->default(false)` | Aktifkan/nonaktifkan auto-backup terjadwal |
| `frequency` | `string('frequency', 20)->default('daily')` | `daily` \| `weekly` \| `monthly` |
| `scheduled_time` | `string('scheduled_time', 5)->default('22:00')` | Format `HH:MM` (zona waktu `config('app.timezone')`) |
| `day_of_week` | `unsignedTinyInteger('day_of_week')->default(0)` | `0` (Minggu) s/d `6` (Sabtu) untuk mode `weekly` |
| `day_of_month` | `unsignedTinyInteger('day_of_month')->default(1)` | `1` s/d `28` untuk mode `monthly` |
| `retention_enabled` | `boolean()->default(true)` | Aktifkan pembersihan otomatis `auto_backup_*.rsv` |
| `retention_max_files` | `unsignedSmallInteger('retention_max_files')->default(14)` | Maksimum jumlah file `auto_backup_*.rsv` yang dipertahankan (`1..365`) |
| `retention_max_days` | `unsignedSmallInteger('retention_max_days')->nullable()->default(30)` | Hapus `auto_backup_*.rsv` lebih tua dari N hari (`7..3650`, opsional/nullable) |
| `sync_mode` | `string('sync_mode', 32)->default('none')` | `none` \| `local_folder` \| `google_drive_api` |
| `local_sync_path` | `string('local_sync_path', 500)->nullable()` | Path folder tujuan lokal / Google Drive Desktop / harddisk eksternal |
| `sync_apply_retention` | `boolean()->default(true)` | Terapkan retensi `auto_backup_*.rsv` juga pada folder sinkron lokal |
| `gdrive_folder_id` | `string('gdrive_folder_id', 255)->nullable()` | ID Folder tujuan di Google Drive |
| `gdrive_client_id` | `string('gdrive_client_id', 255)->nullable()` | OAuth2 Client ID Google Cloud |
| `gdrive_client_secret` | `text('gdrive_client_secret')->nullable()` | OAuth2 Client Secret (cast `encrypted`) |
| `gdrive_refresh_token` | `text('gdrive_refresh_token')->nullable()` | OAuth2 Refresh Token (cast `encrypted`) |
| `last_run_at` | `timestamp('last_run_at')->nullable()` | Waktu eksekusi auto-backup terakhir |
| `last_run_status` | `string('last_run_status', 20)->nullable()` | `success` \| `partial` \| `failed` |
| `last_run_message` | `text('last_run_message')->nullable()` | Ringkasan hasil eksekusi terakhir |
| `last_backup_file` | `string('last_backup_file', 255)->nullable()` | Nama file `.rsv` hasil eksekusi terakhir |
| `created_at` / `updated_at` | `timestamps()` | Timestamps standar |

### 2.2 Tabel `backup_runs` (Riwayat Eksekusi Auto-Backup & Sinkronisasi)

| Kolom | Tipe | Keterangan |
|---|---|---|
| `id` | `id()` | Primary key |
| `trigger` | `string('trigger', 32)->default('scheduled')` | `scheduled` \| `manual_auto` |
| `status` | `string('status', 20)` | `success` \| `partial` \| `failed` |
| `file_name` | `string('file_name', 255)->nullable()` | Nama berkas `.rsv` yang dihasilkan |
| `file_size_bytes` | `unsignedBigInteger('file_size_bytes')->nullable()` | Ukuran berkas dalam byte |
| `pruned_count` | `unsignedInteger('pruned_count')->default(0)` | Jumlah file `auto_backup_*.rsv` lama yang dibersihkan |
| `sync_mode` | `string('sync_mode', 32)->default('none')` | Mode sinkronisasi saat dijalankan |
| `sync_status` | `string('sync_status', 20)->default('skipped')` | `skipped` \| `success` \| `failed` |
| `sync_target` | `string('sync_target', 255)->nullable()` | Nama/path tujuan sinkronisasi |
| `message` | `text('message')` | Pesan ringkasan hasil/error |
| `started_at` | `timestamp('started_at')->nullable()` | Waktu mulai |
| `finished_at` | `timestamp('finished_at')->nullable()` | Waktu selesai |
| `created_at` | `timestamp('created_at')->useCurrent()` | Waktu pencatatan (indeks `['created_at']`) |

### 2.3 Model Eloquent

- **`App\Models\BackupSetting`:**
  - `$hidden = ['gdrive_client_secret', 'gdrive_refresh_token']` — rahasia OAuth tidak pernah ter-serialisasi ke JSON/Inertia.
  - Casts: `'gdrive_client_secret' => 'encrypted'`, `'gdrive_refresh_token' => 'encrypted'`, boolean & integer casts, `'last_run_at' => 'datetime'`.
  - Helper statis `BackupSetting::current(): self` (mengambil baris pertama atau mengembalikan instance default yang belum disimpan agar aman sebelum pertama kali dikonfigurasi).
  - Helper `toSafeFrontendArray(): array` yang mengirim `has_gdrive_client_secret: bool` dan `has_gdrive_refresh_token: bool` (tanpa nilai plaintext!).
- **`App\Models\BackupRun`:**
  - `public const UPDATED_AT = null;`
  - Casts: `file_size_bytes => integer`, `pruned_count => integer`, `started_at => datetime`, `finished_at => datetime`, `created_at => datetime`.

---

## 3. Layanan Backend & Keamanan

### 3.1 `App\Services\GoogleDriveSyncService`

Integrasi Google Drive murni memakai `Illuminate\Support\Facades\Http` bawaan Laravel (tanpa dependency pihak ketiga berat):
1. **`fetchAccessToken(string $clientId, string $clientSecret, string $refreshToken): array`:**
   - Memanggil `POST https://oauth2.googleapis.com/token` (`grant_type=refresh_token`, timeout 20 detik).
   - Mengembalikan `['success' => true, 'access_token' => ...]` atau pesan error ramah Bahasa Indonesia.
2. **`testConnection(string $clientId, string $clientSecret, string $refreshToken, string $folderId): array`:**
   - Memperoleh `access_token`, lalu memanggil `GET https://www.googleapis.com/drive/v3/files/{folderId}?fields=id,name,mimeType,trashed&supportsAllDrives=true`.
   - Memastikan target adalah folder (`application/vnd.google-apps.folder`) dan tidak berada di Trash.
   - Mengembalikan `['success' => true, 'folder_name' => ..., 'message' => ...]`.
3. **`uploadFile(string $fullPath, string $fileName, string $clientId, string $clientSecret, string $refreshToken, string $folderId): array`:**
   - Memulai sesi **Google Drive Resumable Upload**: `POST https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&supportsAllDrives=true` dengan metadata `name`, `parents: [$folderId]`, `X-Upload-Content-Type: application/octet-stream`, `X-Upload-Content-Length: {size}`.
   - Mengunggah konten berkas secara **chunked streaming** (potongan 4 MB agar hemat RAM untuk berkas `.rsv` besar) ke `Location` upload URI dengan header `Content-Range`.
   - Mengembalikan `['success' => true, 'file_id' => ..., 'message' => ...]`.

### 3.2 `App\Services\AutoBackupService`

1. **`isDue(BackupSetting $setting, ?Carbon $now = null): bool`:**
   - Mengembalikan `false` jika `! $setting->is_enabled`.
   - Menghitung slot jadwal terakhir (`scheduledSlot`) berdasarkan `frequency`, `scheduled_time`, `day_of_week`, `day_of_month` dalam timezone `config('app.timezone')`.
   - Jatuh tempo bila `$now >= $scheduledSlot` **dan** (`last_run_at === null` atau `last_run_at < $scheduledSlot`). Dengan demikian tidak akan pernah double-run dalam periode yang sama, dan tetap berjalan meski scheduler baru aktif beberapa menit setelah jam jadwal.
2. **`applyRetention(string $directory, int $maxFiles, ?int $maxDays = null, ?string $protectFileName = null): int`:**
   - **Keamanan mutlak:** hanya memindai berkas langsung di `$directory` yang cocok pola persis `/^auto_backup_[A-Za-z0-9_-]+\.rsv$/`. Backup manual (`backup_*.rsv` atau nama kustom Bendahara) **100% diabaikan**.
   - Mengurutkan dari terbaru → terlama (`filemtime` desc).
   - Selalu mempertahankan minimal **1 file terbaru** (dan `$protectFileName` yang baru saja dibuat).
   - Menghapus file pada indeks `>= max(1, $maxFiles)` **atau** yang umurnya lebih tua dari `$maxDays` hari (bila `$maxDays !== null`).
3. **`syncToLocalFolder(string $sourceFullPath, string $fileName, BackupSetting $setting): array`:**
   - Menolak null-byte dan path tidak absolut/tidak valid; memastikan folder ada & writable (`is_dir` & `is_writable`), menolak jika folder tujuan sama dengan `storage_path('app/backups')` (menghindari self-overwrite).
   - Menyalin file secara atomik (tulis ke `.tmp` lalu `rename`), lalu bila `sync_apply_retention === true`, menjalankan `applyRetention()` pada folder tujuan untuk pola `auto_backup_*.rsv`.
4. **`execute(string $trigger = 'scheduled', bool $force = false, ?callable $archiveFactory = null): array`:**
   - Memakai atomic lock `Cache::lock('sikas:auto-backup:running', 900)` agar eksekusi paralel dicegah.
   - Jika `! $force && ! $this->isDue($setting)`: langsung return `['skipped' => true]`.
   - Membuat arsip via `$archiveFactory` (default `app(DatabaseController::class)->createBackupArchive('auto_backup')` — injectable agar unit/feature test tidak perlu mengeksekusi `pg_dump` sungguhan!).
   - Jika arsip berhasil:
     - Jalankan retensi lokal (jika `retention_enabled`).
     - Jalankan sinkronisasi (`local_folder` atau `google_drive_api`) sesuai `sync_mode`.
     - Jika backup lokal sukses tetapi sinkron gagal → status **`partial`** (file lokal tetap tersimpan aman, pesan error sinkron dicatat jelas).
   - Simpan entri ke `backup_runs`, update `backup_settings.last_run_*`, dan catat ke `ActivityLogger` (`module: 'backup'`, `action: 'backup'`, severity `info`/`warning`).

### 3.3 Artisan Command & Scheduler

- **`App\Console\Commands\RunAutoBackupCommand`** (`php artisan backup:auto-run {--force}`): memanggil `AutoBackupService::execute('scheduled', (bool) $this->option('force'))`.
- **`routes/console.php`:**
  ```php
  Schedule::command('backup:auto-run')->everyMinute()->withoutOverlapping();
  ```

---

## 4. Endpoints, RBAC & Integrasi Halaman Backup

### 4.1 Routes (`routes/variant.php`, di dalam grup `backup.` yang sudah dilindungi `role:bendahara` & RBAC modul `backup`)

```php
Route::post('/auto-settings', [DatabaseController::class, 'updateAutoBackupSettings'])->name('auto-settings.update');
Route::post('/auto-run', [DatabaseController::class, 'runAutoBackupNow'])->name('auto-run');
Route::post('/auto-test-sync', [DatabaseController::class, 'testAutoBackupSync'])->name('auto-test-sync');
```

- Semua aksi mutasi ini otomatis terproteksi oleh middleware `EnforceModulePermissions` (`backup: write`) dan otomatis ter-audit oleh `RecordUserActivity` (dengan redaksi otomatis `gdrive_client_secret` & `gdrive_refresh_token` karena mengandung kata `secret` & `token`!).
- Pada `DatabaseController::index()`: tambahkan prop `autoBackupSetting` (`BackupSetting::current()->toSafeFrontendArray()`), `backupRuns` (10 riwayat terbaru dari `BackupRun`), dan `schedulerCommands` (perintah siap salin untuk Windows Task Scheduler & Linux Cron berdasar `base_path()`).

### 4.2 UI Neo-Bento (`Backup/Index.tsx` + `Backup/Partials/AutoBackupPanel.tsx`)

- Di halaman [Backup/Index.tsx](file:///c:/laragon/www/newSIKAS2/newSIKAS/resources/js/Pages/Backup/Index.tsx):
  - Tambahkan `PillTabs` Neo-Bento bersih di bawah `PageHeader`:
    1. **Backup & Restore Manual** (seluruh UI & fitur yang sudah ada 100% utuh, termasuk Reset Database di atas Restore Database & shortcut `Alt+9` NPSN).
    2. **Auto-Backup, Retensi & Cloud** (`AutoBackupPanel.tsx`).
  - Shortcut `Alt+9` tetap aktif pada seluruh halaman Backup tanpa terpengaruh tab aktif.
- Di **`resources/js/Pages/Backup/Partials/AutoBackupPanel.tsx`**:
  - **Hero Status Strip:** status aktif/nonaktif, ringkasan jadwal (mis. *"Setiap Hari pukul 22:00"*), status eksekusi terakhir (`Berhasil` / `Sebagian` / `Gagal`), dan tombol **"Jalankan Auto-Backup Sekarang"**.
  - **Kartu Pengaturan Jadwal & Retensi:** toggle aktif, frekuensi (`Harian` / `Mingguan` / `Bulanan`), input waktu (`HH:MM`), pilihan hari, toggle retensi, jumlah maksimal auto-backup (`1–365`), batas umur hari (`opsional`), plus banner jaminan *"Backup manual Bendahara tidak pernah dihapus oleh retensi otomatis"*.
  - **Kartu Sinkronisasi Tujuan (3 Mode):**
    1. *Lokal Saja* (`none`)
    2. *Folder Lokal / Google Drive Desktop* (`local_folder`) — input path folder + toggle retensi di folder tujuan + tombol **Uji Folder**.
    3. *Google Drive Cloud API* (`google_drive_api`) — input Folder ID, Client ID, Client Secret (placeholder *"Tersimpan — kosongkan jika tidak diubah"* bila sudah tersimpan), Refresh Token (idem), tombol **Uji Koneksi Google Drive**, dan panduan singkat langkah pengisian.
  - **Panduan Aktivasi Scheduler Otomatis:** perintah siap salin untuk **Windows Task Scheduler (Laragon)** dan **Cron Linux (VPS)** dengan tombol salin 1-klik.
  - **Riwayat 10 Eksekusi Auto-Backup Terakhir:** tabel Neo-Bento menampilkan waktu, pemicu (`Terjadwal` / `Manual`), nama file & ukuran, jumlah file dibersihkan, status sinkronisasi, dan pesan.

---

## 5. Rencana Pengujian & Verifikasi

### 5.1 PHPUnit Feature Tests (`tests/Feature/AutoBackupTest.php`)
1. **Penyimpanan Pengaturan & Enkripsi Rahasia:** Bendahara dapat menyimpan pengaturan jadwal, retensi, dan kredensial Google Drive API; `gdrive_client_secret` & `gdrive_refresh_token` tersimpan terenkripsi di DB, tidak bocor ke prop Inertia (`toSafeFrontendArray()` hanya mengirim flag boolean), dan tidak tertimpa kosong saat form disimpan ulang tanpa mengubah secret.
2. **RBAC:** Kepala Sekolah / role tanpa izin `backup: write` mendapat `403` saat mengakses `auto-settings`, `auto-run`, maupun `auto-test-sync`.
3. **Logika Jadwal (`isDue`):** Menguji `daily`, `weekly`, dan `monthly` — belum waktunya (`false`), sudah melewati jam jadwal (`true`), dan sudah berjalan pada slot yang sama (`false` / anti double-run).
4. **Retensi Aman (`applyRetention`):** Membuat 5 file `auto_backup_*.rsv` dan 2 file manual (`backup_manual_2026.rsv`, `arsip_bendahara.rsv`) di direktori sementara; dengan `max_files = 2` dan `max_days = 30`, tepat 3 auto-backup terlama dihapus, 2 auto-backup terbaru tetap ada, dan **kedua file backup manual 100% utuh**.
5. **Sinkronisasi Folder Lokal & Google Drive API (via `Http::fake`):**
   - Mode `local_folder`: menyalin `.rsv` ke folder tujuan sementara dan menerapkan retensi folder tujuan.
   - Mode `google_drive_api`: `Http::fake()` memverifikasi pertukaran OAuth refresh token, `testConnection` mengembalikan nama folder, dan `execute` mengunggah via resumable upload & mencatat `backup_runs` berstatus `success` (serta status `partial` bila upload cloud gagal sementara backup lokal berhasil).
6. **Sanitasi Audit Trail:** Saat `POST /backup/auto-settings` menyimpan `gdrive_client_secret` & `gdrive_refresh_token`, entri `activity_logs` otomatis menyensor keduanya menjadi `'[DISENSOR]'`.

### 5.2 Quality Gates
- `vendor/bin/pint`
- `php artisan migrate --force` (PostgreSQL `newSIKAS`)
- `php artisan test --filter="AutoBackupTest|PosterTransparansiTest|SmartNotificationTest|ActivityLogTest"`
- `npm run build` (`tsc && vite build`)
- `/code-review` dua sumbu paralel (**Standards** & **Spec**).
