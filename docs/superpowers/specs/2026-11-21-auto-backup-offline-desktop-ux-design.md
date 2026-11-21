# Spesifikasi Desain: Auto-Backup Offline-First & Desktop UX (Inno Setup)

- **Tanggal:** 2026-11-21
- **Status:** Disetujui Pengguna
- **Lanjutan dari:** [2026-11-21-auto-backup-retention-gdrive-design.md](file:///c:/laragon/www/newSIKAS2/newSIKAS/docs/superpowers/specs/2026-11-21-auto-backup-retention-gdrive-design.md)
- **Lingkup:** Penyempurnaan pengalaman pengguna lokal Windows (Inno Setup dinamis, online & offline) — In-App Zero-Setup Auto-Trigger, 1-Klik Windows Task Scheduler senyap (VBS tanpa jendela CMD berkedip), 2 mode penyimpanan yang jelas + Modal Folder Picker, serta antrean Auto-Retry Cloud saat koneksi internet kembali tersambung.

---

## 1. Masalah Pengguna yang Diselesaikan

1. **Offline / Jaringan Tidak Stabil:** Aplikasi lokal di laptop sekolah sering berjalan offline. Auto-backup lokal (`.rsv` PostgreSQL + storage) tetap berjalan 100% offline, namun bila mode Google Drive Cloud API gagal mengunggah karena offline, berkas `.rsv` terbaru perlu otomatis diunggah ulang saat internet kembali tersambung.
2. **Setup Scheduler Manual Terlalu Rumit & Path Inno Setup Dinamis:** Pengguna awam tidak seharusnya diminta menyalin perintah `schtasks` / `cron` ke CMD Administrator. Aplikasi harus berjalan otomatis (*Zero-Setup*) saat dibuka, plus menyediakan aktivasi 1-klik Windows Task Scheduler dinamis (menggunakan `PHP_BINARY` & `base_path()` saat runtime) yang berjalan senyap tanpa jendela CMD berkedip.
3. **Pemilihan Folder Lokal Ramah Pengguna Awam:** Pengguna tidak mengetahui lokasi folder instalasi internal (`storage/app/backups`). Mode penyimpanan disederhanakan menjadi 2 pilihan jelas dengan **Modal Folder Picker** (daftar Drive `C:/D:/E:`, `Documents`, `Desktop`, `Google Drive`, navigasi folder, dan tombol *Buat Folder Baru*).

---

## 2. Perubahan Skema Database

Migrasi: `database/migrations/2026_11_21_120000_add_pending_cloud_sync_to_backup_settings.php`

Penambahan 4 kolom pada tabel `backup_settings`:

| Kolom | Tipe | Keterangan |
|---|---|---|
| `pending_cloud_file` | `string('pending_cloud_file', 255)->nullable()` | Nama berkas `.rsv` terbaru yang gagal diunggah ke Google Drive |
| `pending_cloud_path` | `string('pending_cloud_path', 500)->nullable()` | Path lokal berkas `.rsv` tertunda (tidak dikirim ke frontend) |
| `pending_cloud_run_id` | `unsignedBigInteger('pending_cloud_run_id')->nullable()` | Referensi `backup_runs.id` agar status dapat diperbarui `partial` → `success` |
| `pending_cloud_retry_at` | `timestamp('pending_cloud_retry_at')->nullable()` | Waktu minimum percobaan ulang berikutnya (backoff 5 menit) |

---

## 3. Arsitektur Layanan Backend

### 3.1 `AutoBackupService` (Offline-First, Dual Local+Cloud, Heartbeat & Auto-Retry)
- **Simpan salinan lokal opsional di mode Cloud:** Bila `sync_mode === 'google_drive_api'` dan `local_sync_path` terisi, auto-backup menyalin berkas `.rsv` ke folder lokal pilihan **dan** mengunggahnya ke Google Drive.
- **Perlindungan Retensi untuk Berkas Tertunda:** `applyRetention()` menerima daftar berkas yang dilindungi (`array<int, string>`), mencakup berkas baru sekaligus `pending_cloud_file` agar berkas tertunda tidak pernah terhapus sebelum berhasil diunggah atau tergantikan backup baru.
- **Antrean Pending Cloud Sync:**
  - Bila upload Google Drive gagal di `execute()`, simpan `pending_cloud_file`, `pending_cloud_path`, `pending_cloud_run_id`, dan `pending_cloud_retry_at = now()->addMinutes(5)`.
  - Bila upload berhasil, kosongkan seluruh kolom `pending_cloud_*`.
- **`retryPendingCloudSync(bool $force = false, ?User $actor = null, ?Request $request = null): array`:**
  - Dilindungi `Cache::lock` yang sama (`sikas:auto-backup:running`).
  - Memeriksa keberadaan berkas; bila berkas sudah tidak ada di disk, membersihkan state tertunda dengan aman.
  - Menghormati cooldown `pending_cloud_retry_at` kecuali `$force === true`.
  - Bila berhasil mengunggah ulang: memperbarui `BackupRun` terkait (`status => 'success'`, `sync_status => 'success'`, memperbarui `message`), memperbarui `backup_settings.last_run_status` (jika `last_backup_file === pending_cloud_file`), membersihkan `pending_cloud_*`, dan mencatat audit log.
- **`handleHeartbeat(bool $clientOnline = true, ?User $actor = null, ?Request $request = null): array`:**
  - Dipanggil secara ringan dari frontend; langsung `idle` dalam <5ms bila tidak ada jadwal jatuh tempo dan tidak ada pending retry yang siap.
  - Jika `isDue()` → jalankan `execute('scheduled', false, null, $actor, $request)`.
  - Jika tidak jatuh tempo tetapi `$clientOnline` dan ada `pending_cloud_file` yang melewati `pending_cloud_retry_at` → jalankan `retryPendingCloudSync(false, $actor, $request)`.
- **`RunAutoBackupCommand` (`backup:auto-run`):** Bila belum jatuh tempo tetapi ada pending cloud sync yang siap, ikut menjalankan `retryPendingCloudSync(false)`.

### 3.2 `WindowsTaskSchedulerService`
- **`getStatus(): array`:** Mengecek `PHP_OS_FAMILY === 'Windows'`, memeriksa status task `newSIKAS-AutoBackup` via `schtasks /Query`, dan mendeteksi apakah path runner VBS masih cocok dengan `base_path()` saat ini (`path_matches_current`).
- **`install(): array`:** Menghasilkan file pembungkus senyap `storage/app/auto-backup-runner.vbs` (`WScript.Shell.Run`, window style `0` = tersembunyi tanpa jendela CMD berkedip) menggunakan `PHP_BINARY` & `base_path('artisan')` dinamis, lalu mendaftarkan task `newSIKAS-AutoBackup` per menit via `schtasks /Create` untuk user aktif.
- **`remove(): array`:** Menghapus task `newSIKAS-AutoBackup` dan file VBS pembungkus.

### 3.3 `LocalFolderBrowserService`
- **`getQuickShortcuts(): array`:** Mendeteksi otomatis Drive Windows (`C:\`–`Z:\`), folder `Documents`, `Desktop`, dan folder `Google Drive` / `My Drive` yang ada di komputer pengguna.
- **`browse(?string $path = null): array`:** Mengembalikan pintasan cepat, daftar sub-direktori langsung (melewati folder sistem tersembunyi seperti `$RECYCLE.BIN`, `System Volume Information`), parent path, dan flag `selectable` (memastikan folder di dalam `base_path()`, `public_path()`, `storage_path()`, atau UNC tidak dapat dipilih).
- **`createFolder(string $parentPath, string $folderName): array`:** Memvalidasi parent path via `AutoBackupService::validateLocalSyncFolder()` dan memvalidasi nama folder (`^[a-zA-Z0-9 _.-]{1,100}$`, tanpa `..`), lalu membuat folder baru dengan aman.

---

## 4. Endpoints, RBAC & Integrasi UI

### 4.1 Routes (`routes/variant.php`, grup `backup.` berizin `backup: write`)
- `POST /backup/auto-heartbeat` (`backup.auto-heartbeat`) — dikecualikan dari `RecordUserActivity` (non-noise).
- `POST /backup/auto-retry-cloud` (`backup.auto-retry-cloud`) — dikecualikan dari `RecordUserActivity` (dicatat langsung oleh `AutoBackupService`).
- `GET /backup/browse-folders` (`backup.browse-folders`)
- `POST /backup/create-folder` (`backup.create-folder`)
- `POST /backup/auto-scheduler/install` (`backup.auto-scheduler.install`) — diaudit severity `warning`.
- `POST /backup/auto-scheduler/remove` (`backup.auto-scheduler.remove`) — diaudit severity `warning`.

### 4.2 Frontend (`AuthenticatedLayout.tsx`, `AutoBackupPanel.tsx`, `FolderPickerModal.tsx`)
- **`AuthenticatedLayout.tsx`:** Heartbeat non-blocking untuk pengguna dengan izin `backup: write` (jalan 3 detik setelah mount dengan throttle `sessionStorage` 60 detik, interval 5 menit, dan otomatis saat browser menembakkan event `online`).
- **`AutoBackupPanel.tsx`:**
  - Hero Status Strip: badge status koneksi (`Online` / `Offline`), banner **Menunggu Unggah ke Google Drive** + tombol **"Coba Unggah ke Cloud Sekarang"** saat `has_pending_cloud_sync === true`.
  - **2 Mode Penyimpanan Utama:**
    1. *Folder Lokal / Google Drive Desktop* — tombol **"Pilih Folder..."** (`FolderPickerModal`) + opsi reset ke folder bawaan + *Uji Folder*.
    2. *Lokal + Google Drive Cloud API* — input opsional *Folder Salinan Lokal* (dengan tombol **"Pilih Folder..."**) + konfigurasi OAuth2 Google Drive & *Uji Koneksi*.
  - **Kartu Pemicu Otomatis (Zero-Setup):** menampilkan status aktif *In-App Auto-Trigger* (online & offline + catch-up), tombol **1-Klik Aktivasi / Nonaktifkan Windows Background Task**, dan menyembunyikan perintah CMD/Cron manual dalam `<details>` *Pengaturan Lanjutan (Admin Server / VPS Linux)*.

---

## 5. Rencana Pengujian & Verifikasi
- Pengujian fitur baru di `tests/Feature/AutoBackupTest.php`:
  1. Offline failure → menyimpan `pending_cloud_file`, melindunginya dari retensi, dan `retryPendingCloudSync()` memperbarui `BackupRun` dari `partial` → `success` & membersihkan pending state.
  2. `POST /backup/auto-heartbeat` menjalankan backup jatuh tempo / retry cloud / idle, serta memblokir non-write (`403`).
  3. `GET /backup/browse-folders` & `POST /backup/create-folder` bekerja pada direktori luar valid, menolak folder terlarang (`base_path`/`public`/`storage`/UNC) dan nama tidak valid (`../evil`).
  4. Mode `google_drive_api` dengan `local_sync_path` sekaligus menyalin ke folder lokal dan mengunggah ke Google Drive.
  5. `WindowsTaskSchedulerService::buildSilentVbsContent()` menghasilkan script VBS senyap dinamis tanpa window CMD.
- Quality gates: `vendor/bin/pint`, `php artisan migrate --force`, PHPUnit gabungan 4 subsistem, `npm run build`, dan `/code-review` dua sumbu.
