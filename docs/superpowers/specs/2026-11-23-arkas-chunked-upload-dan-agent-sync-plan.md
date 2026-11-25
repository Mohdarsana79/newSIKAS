# Rencana Implementasi: Upload Chunked `arkas.db`, Mode 2 Tab & Agent Sync Laptop ARKAS

**Tanggal:** 2026-11-23  
**Spec Acuan:** [2026-11-23-arkas-chunked-upload-dan-agent-sync-design.md](file:///c:/laragon/www/newSIKAS2/newSIKAS/docs/superpowers/specs/2026-11-23-arkas-chunked-upload-dan-agent-sync-design.md)  
**Status:** Siap Eksekusi Setelah Persetujuan Pengguna

---

## Ringkasan Urutan Eksekusi (6 Tahap)

### Tahap 1 — Konfigurasi, State Store & Resolusi Mode Tegas
1. **Perbarui `config/arkas.php`:**
   - Tambahkan `state_path`, `chunk_temp_dir`, `chunk_size_mb` (`2`), `chunk_ttl_seconds` (`7200`), dan naikkan default `max_upload_mb` menjadi `500`.
2. **Buat `app/Services/ArkasStateStore.php`:**
   - Read/write atomik `storage/app/arkas_uploads/state.json` (tulis ke `.tmp` lalu `rename`).
   - Metode: `read()`, `getActiveMode()`, `setActiveMode('local'|'online')`, `setAgentPin(string $pin)`, `rotateAgentToken(): string`, `revokeAgentToken()`, `verifyAgentCredentials(string $token, string $pin): bool`, `hasAgentToken(): bool`, `hasAgentPin(): bool`, `recordUpload(array $meta)`, `clearLastUpload()`.
   - Default backward-compatible saat `state.json` belum ada: `'online'` bila `db_path` kosong dan file upload ada; selain itu `'local'`.
3. **Perbarui `app/Services/ArkasEngineService.php`:**
   - Suntikkan `ArkasStateStore`.
   - Pisahkan resolusi tegas berdasarkan `active_mode`:
     - `'local'` → hanya `manual` / `manual_missing` / `auto` / `none` (tidak pernah jatuh ke upload).
     - `'online'` → hanya `uploaded` / `uploaded_missing` (tidak pernah jatuh ke manual/auto-detect).
   - Tambahkan helper ringan `getSharedStatusSummary(): array` (tanpa spawn Python) untuk `HandleInertiaRequests`.
   - Perbarui `verifyDatabaseFile()`: jalankan `query.py` dengan keyword `__VERIFY__`, timeout `60` detik, dan env `ARKAS_STRICT_PATH=1`.

### Tahap 2 — Perbaikan `query.py` (Strict Path & Verifikasi Cepat)
1. **Perbarui `storage/app/arkas_engine/query.py`:**
   - Baca `os.environ.get('ARKAS_STRICT_PATH') == '1'`: bila aktif dan `manual_path` tidak ada, langsung return `None` (hapus fallback diam-diam ke `AppData` server).
   - Tambahkan keyword `__VERIFY__`: uji dekripsi SQLCipher (`SELECT count(*) FROM sqlite_master`), cek keberadaan tabel inti (`anggaran` / `ref_acuan_barang`), dan ambil daftar tahun secara aman tanpa gagal bila tabel referensi kosong.

### Tahap 3 — Protokol Unified Chunked Upload & Generator Agent `.bat`
1. **Buat `app/Services/ArkasChunkUploadService.php`:**
   - `initUpload(array $payload)` — validasi ekstensi, ukuran, jumlah chunk, cleanup temp kadaluarsa, cek deduplikasi SHA-256 (`already_up_to_date`).
   - `storeChunk(string $uploadId, int $chunkIndex, UploadedFile $file)` — simpan idempoten `chunk_000000.part`.
   - `finalizeUpload(string $uploadId, array $context)` — gabungkan secara *streaming*, verifikasi ukuran & SHA-256, jalankan `verifyDatabaseFile()`, ganti `arkas_uploads/arkas.db` secara aman, perbarui `state.json`, dan hapus folder sesi chunk.
2. **Buat `app/Services/ArkasAgentScriptGenerator.php`:**
   - Render 1-file hybrid `.bat` + PowerShell (`SIKAS-Arkas-Sync.bat`) berisi:
     - URL server aktif & Sync Token 64-karakter.
     - Prompt PIN tersembunyi + `POST /arkas-agent/ping`.
     - Auto-detect `%APPDATA%\Arkas\arkas.db` (fallback `%LOCALAPPDATA%` / input manual).
     - Mode `[1]` Sync Sekarang (cek proses ARKAS & `arkas.db-wal`, cek SHA-256, chunked upload 2 MB + retry 3x + progress bar).
     - Mode `[2]` Pantau Otomatis (deteksi transisi proses ARKAS tertutup + jeda 3 detik checkpoint WAL + cek SHA-256 + auto-upload).

### Tahap 4 — Controller, Middleware Keamanan Agent, Routing & Izin
1. **Buat `app/Http/Middleware/VerifyArkasAgentCredentials.php`:**
   - Cek header `X-Arkas-Sync-Token` & `X-Arkas-Sync-Pin`.
   - `RateLimiter` per IP (maks 5 gagal / 5 menit → `429`).
   - Validasi konstan via `ArkasStateStore::verifyAgentCredentials()` (`401` bila tidak valid/dicabut).
2. **Buat `app/Http/Controllers/ArkasAgentController.php`:**
   - `ping()`, `uploadInit()`, `uploadChunk()`, `uploadFinalize()` memakai `ArkasChunkUploadService` + pencatatan `ActivityLogger`.
3. **Perbarui `app/Http/Controllers/ArkasSettingController.php`:**
   - Perluas `getPath()` agar mengembalikan `active_mode`, `source`, `exists`, `last_upload`, `agent` (`has_pin`, `has_token`, `token_created_at`, `pin_updated_at`), `max_upload_mb`, `chunk_size_mb`.
   - `savePath()` menerima opsi pengaktifan mode `'local'`.
   - Tambahkan `setMode()`, `uploadInit()`, `uploadChunk()`, `uploadFinalize()`, `saveAgentPin()`, `downloadAgentScript()`, `revokeAgentToken()`.
   - Pertahankan `uploadDb()` legacy agar tetap kompatibel dengan test lama.
4. **Perbarui Routing & Izin:**
   - `routes/variant.php`: hapus wrapper `middleware(['role:bendahara'])` pada grup `arkas-tools/path` & `arkas-tools/upload-*`, daftarkan seluruh route baru.
   - `routes/web.php`: daftarkan grup `/arkas-agent/*` dengan `withoutMiddleware(...)` (mengikuti pola `backup.restore-progress` / `system-update.progress`) + middleware `VerifyArkasAgentCredentials`.
   - `app/Config/PermissionCatalog.php`: petakan seluruh route baru `arkas-tools.*` ke `['module' => 'path_arkas', 'level' => self::LEVEL_WRITE]`.
   - `app/Services/ActivityLogger.php`: tambahkan deskripsi ramah untuk aksi ubah mode, chunked upload, atur PIN, download agent, dan cabut token.
   - `app/Http/Middleware/HandleInertiaRequests.php`: bagikan ringkasan ringan `arkasStatus` dari `ArkasEngineService::getSharedStatusSummary()`.

### Tahap 5 — Refactor UI Frontend (Modal 2 Tab + Chunked Uploader)
1. **Buat `resources/js/Components/Arkas/ArkasConfigModal.tsx`:**
   - Banner Status Aktif (Mode PC Lokal vs Mode Online/VPS, status koneksi, metadata terakhir).
   - **Tab 1: Mode PC Lokal** (input path + tombol *Aktifkan Mode PC Lokal & Simpan Path*).
   - **Tab 2: Mode Online / VPS**:
     - Banner & tombol *Aktifkan Mode Online / VPS* bila mode aktif masih Lokal.
     - **Panel Unggah Manual**: chunked uploader 2 MB dengan `AbortController`, auto-retry 3x per chunk, progress bar real-time, tahap verifikasi, SHA-256 opsional (hanya jika `window.crypto?.subtle` tersedia), tanpa header manual `multipart/form-data`, dan dekoder error HTTP (`413`, `419`, `403`, `422`, `429`, `5xx`, `Network Error`).
     - **Panel Agent Sync**: atur/ubah PIN 4–6 digit, tombol *Generate Token & Download `SIKAS-Arkas-Sync.bat`*, tombol *Cabut Akses Agent*, dan info sync terakhir.
   - Gunakan `canWrite('path_arkas')` untuk kontrol edit.
2. **Perbarui `resources/js/Components/Sidebar.tsx`:**
   - Gantikan modal inline dengan `<ArkasConfigModal />`.
   - Tampilkan status kartu ARKAS di sidebar secara jujur dari shared prop `arkasStatus` (dan perbarui lokal saat modal melakukan perubahan).

### Tahap 6 — Pengujian & Verifikasi Penuh
1. **Buat `tests/Feature/ArkasChunkUploadAndAgentTest.php`:**
   - Uji isolasi tegas mode `local` vs `online`.
   - Uji chunked upload browser penuh (`init` → `chunk` + retry → `finalize` + dedup `already_up_to_date` + validasi error).
   - Uji otorisasi: role kustom `path_arkas = write` (`200`), role `path_arkas = read` & `kepala_sekolah` (`403`).
   - Uji keamanan Agent: `ping`, chunked upload, salah token/PIN (`401`), rate limit 6x gagal (`429`), cabut token (`401`), dan validasi isi file `SIKAS-Arkas-Sync.bat`.
2. **Jalankan Verifikasi:**
   - `composer test`
   - `npm run build` (`tsc && vite build`)
   - `vendor/bin/pint --test` pada berkas PHP yang diubah.
