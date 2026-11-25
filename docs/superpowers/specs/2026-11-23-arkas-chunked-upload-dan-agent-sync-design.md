# Desain Upload Chunked `arkas.db`, Mode 2 Tab & Agent Sync Laptop ARKAS

**Tanggal:** 2026-11-23  
**Status:** Draft untuk Review Pengguna (Belum Dieksekusi)  
**Target Deployment:** Server Windows sekolah atau Windows VPS (online via Cloudflare Tunnel / ngrok / Nginx), dengan aplikasi ARKAS Desktop berjalan di laptop terpisah milik Bendahara/Operator ARKAS.

---

## 1. Latar Belakang & Masalah yang Diselesaikan

Hasil *code review* pada alur integrasi `arkas.db` saat ini mengungkap 6 masalah nyata yang menyebabkan upload dari laptop lain saat mode online gagal atau tidak berefek:

1. **Error asli disembunyikan di frontend (`Sidebar.tsx`):** `extractAxiosErrorMessage()` hanya membaca `err.response.data.message`, sehingga error `HTTP 413` (batas Nginx/PHP/Cloudflare), `HTTP 419` (CSRF/sesi), `HTTP 403` (role), `HTTP 422` (`errors.arkas_db[0]`), dan `Network Error` tampil sebagai pesan generik *"Gagal mengunggah file arkas.db."*.
2. **Single-request upload rentan ditolak proxy/PHP:** File `arkas.db` multi-tahun dapat berukuran puluhan hingga >100 MB, melampaui default Nginx (`1 MB`), PHP (`2–8 MB`), atau batas request Cloudflare Free Tunnel (`100 MB`).
3. **Prioritas sumber aktif ambigu (`ArkasEngineService.php`):** Selama `ARKAS_DB_PATH` masih terisi dan file lokalnya ada di server, `Path Manual Server` selalu menang atas file unggahan. Tidak ada pemisahan tegas antara *Mode PC Lokal* dan *Mode Online / VPS*.
4. **Timeout verifikasi terlalu sempit & fallback diam-diam (`ArkasEngineService.php` & `query.py`):** Verifikasi upload menjalankan `query.py __YEARS__ ALL` dengan timeout `20` detik. Selain rentan timeout pada `ref_acuan_barang` besar, fungsi `find_arkas_db()` di `query.py` diam-diam fallback ke `AppData\Roaming\Arkas\arkas.db` milik server jika path temp gagal terbaca.
5. **Ketidaksinkronan otorisasi UI vs Backend (`Sidebar.tsx` vs `routes/variant.php` vs `PermissionCatalog.php`):** `PermissionCatalog` sudah memetakan izin modul `path_arkas`, tetapi `routes/variant.php` masih mengunci endpoint dengan `middleware(['role:bendahara'])`, sehingga role kustom *Operator ARKAS* yang diberi izin `path_arkas = Kelola` tetap ditolak `403`.
6. **Header `multipart/form-data` manual di Axios (`Sidebar.tsx`):** Penetapan header secara manual dapat mengganggu `boundary` multipart pada sebagian klien/proxy.

---

## 2. Tujuan & Cakupan Desain

1. **Pemisahan tegas 2 mode sumber database (`Mode PC Lokal` vs `Mode Online / VPS`)** yang dipilih dan diaktifkan secara eksplisit oleh pengguna melalui 2 tab di modal Konfigurasi Database ARKAS.
2. **Protokol Unified Chunked Upload (potongan 2 MB)** untuk Browser UI maupun Agent Tool agar upload anti-gagal di balik Cloudflare Tunnel / Nginx / PHP limit, lengkap dengan progress bar, auto-retry 3x per potongan, dan deduplikasi SHA-256.
3. **1-File Agent Sync Tool (`SIKAS-Arkas-Sync.bat` dengan PowerShell bawaan Windows)** untuk laptop operator pemegang ARKAS:
   - *Zero-install* di Windows 10/11 (tanpa perlu Python/Node dan tanpa blokir unsigned `.exe`).
   - Keamanan 2 faktor ringan: **Sync Token 64-karakter** (tertanam saat download `.bat`) + **PIN 4–6 digit** (diketik operator saat membuka Agent Tool) + *rate-limit* anti brute-force + tombol cabut/reset token dari web.
   - Mendukung **2 mode kerja**: **[1] Sync Sekarang (1x klik)** dan **[2] Mode Pantau Otomatis** (auto-sync setelah aplikasi ARKAS ditutup dan `arkas.db-wal` selesai *checkpoint*).
4. **Keselarasan penuh dengan `PermissionCatalog` (`path_arkas`)** agar Bendahara maupun role kustom *Operator ARKAS* (izin `Kelola`) dapat mengoperasikan fitur ini, sementara akun baca-saja / Kepala Sekolah tetap ditolak (`403`).

---

## 3. Arsitektur Solusi (5 Unit Terisolasi)

### Unit 1: Konfigurasi & Penyimpanan State (`config/arkas.php` + `ArkasStateStore`)

#### Konfigurasi `config/arkas.php`
Tambahkan pengaturan terpusat (aman untuk `config:cache`):
- `db_path`: `env('ARKAS_DB_PATH', '')`
- `upload_path`: `storage_path('app/arkas_uploads/arkas.db')`
- `state_path`: `storage_path('app/arkas_uploads/state.json')`
- `chunk_temp_dir`: `storage_path('app/temp/arkas_chunks')`
- `engine_dir`: `storage_path('app/arkas_engine')`
- `max_upload_mb`: `(int) env('ARKAS_MAX_UPLOAD_MB', 500)` *(dinaikkan dari 100 MB karena sudah memakai chunked upload)*
- `chunk_size_mb`: `2`
- `chunk_ttl_seconds`: `7200` *(pembersihan otomatis sesi chunk yatim > 2 jam)*

#### `App\Services\ArkasStateStore`
Bertanggung jawab penuh membaca & menulis `state.json` secara atomik (tulis ke `.tmp` lalu `rename`, tanpa mengubah `.env` maupun memicu reset `config:cache`):

```json
{
  "active_mode": "local",
  "agent": {
    "token_hash": "<sha256-hex-or-null>",
    "pin_hash": "<laravel-bcrypt-hash-or-null>",
    "token_created_at": "2026-11-23T10:45:00+08:00",
    "pin_updated_at": "2026-11-23T10:45:00+08:00"
  },
  "last_upload": {
    "uploaded_at": "2026-11-23T10:50:00+08:00",
    "size_bytes": 41943040,
    "sha256": "<sha256-hex>",
    "via": "agent",
    "device_name": "LAPTOP-BENDAHARA",
    "uploaded_by": "Agent Sync (LAPTOP-BENDAHARA)",
    "years": ["2025", "2026"]
  }
}
```

- **Default backward-compatible saat `state.json` belum ada:**
  - Jika `ARKAS_DB_PATH` kosong **dan** file `arkas_uploads/arkas.db` sudah ada → default `active_mode = 'online'`.
  - Selain itu → default `active_mode = 'local'`.

#### Aturan Resolusi Tegas di `ArkasEngineService::resolveDatabaseSource()`
- Bila `overridePath` diberikan (mis. saat verifikasi file temp): gunakan `overridePath` saja.
- Bila `active_mode === 'local'`:
  1. Jika `ARKAS_DB_PATH` terisi dan `is_file(...)` → `source: 'manual'`, `exists: true`.
  2. Jika `ARKAS_DB_PATH` terisi tapi tidak ditemukan → `source: 'manual_missing'`, `exists: false`.
  3. Jika `ARKAS_DB_PATH` kosong → coba auto-detect Windows lokal (`source: 'auto'`, `exists: true` atau `source: 'none'`, `exists: false`).
  - **Tidak pernah** fallback ke file unggahan saat `active_mode === 'local'`.
- Bila `active_mode === 'online'`:
  1. Jika `arkas_uploads/arkas.db` ada → `source: 'uploaded'`, `exists: true`.
  2. Jika belum ada → `source: 'uploaded_missing'`, `exists: false`.
  - **Tidak pernah** fallback ke `ARKAS_DB_PATH` atau auto-detect Windows saat `active_mode === 'online'`.

---

### Unit 2: Verifikasi SQLCipher Strict & Cepat (`query.py` + `ArkasEngineService`)

1. **Flag Strict Path di `storage/app/arkas_engine/query.py`:**
   - Tambahkan dukungan environment variable `ARKAS_STRICT_PATH=1` (atau argumen opsional) yang mematikan fallback ke `%APPDATA%` / `USERPROFILE` / `glob` saat `manual_db_path` diberikan. Jika file target tidak ada, langsung kembalikan JSON error jujur.
2. **Mode Verifikasi Cepat `__VERIFY__` di `query.py`:**
   - Buka koneksi SQLCipher → jalankan `PRAGMA cipher_compatibility = 4;` dan `PRAGMA key = ...;` → uji dekripsi `SELECT count(*) FROM sqlite_master;` → pastikan tabel inti ARKAS (`anggaran` atau `ref_acuan_barang`) ada di `sqlite_master` → ambil daftar tahun secara aman (dengan fallback `[]` jika tabel belum berisi tahun).
   - Timeout di `ArkasEngineService::verifyDatabaseFile()` dinaikkan dari `20` detik menjadi `60` detik dan selalu menyetel `ARKAS_STRICT_PATH=1`.

---

### Unit 3: Unified Chunked Upload (`ArkasChunkUploadService`)

Satu service yang dipakai bersama oleh **Browser Controller (`ArkasSettingController`)** dan **Agent Controller (`ArkasAgentController`)**:

1. **`initUpload(array $payload)`**:
   - Validasi ekstensi (`.db`, `.sqlite`, `.sqlite3`), `total_size > 0` dan `<= max_upload_mb * 1024 * 1024`, `chunk_size` (maks 4 MB, default 2 MB), `total_chunks === (int) ceil(total_size / chunk_size)`.
   - `sha256` bersifat **wajib untuk Agent** (PowerShell selalu memiliki `Get-FileHash`) dan **opsional untuk Browser** (dihitung via `crypto.subtle.digest` saat berada di HTTPS/`localhost`, dan dilewati dengan aman saat dibuka lewat IP LAN HTTP non-HTTPS; server tetap menghitung `hash_file('sha256', ...)` setelah penggabungan).
   - Jika `sha256` dikirim dan sama dengan `state.last_upload.sha256` serta file `arkas_uploads/arkas.db` masih ada di disk → langsung kembalikan `['status' => 'up_to_date', 'already_up_to_date' => true]`.
   - Bersihkan folder chunk yatim di `chunk_temp_dir` yang berumur > `chunk_ttl_seconds`.
   - Buat folder sesi `storage/app/temp/arkas_chunks/<uuid>/` berisi `meta.json` dan kembalikan `upload_id`, `chunk_size`, `total_chunks`.
2. **`storeChunk(string $uploadId, int $chunkIndex, UploadedFile $chunkFile)`**:
   - Validasi `upload_id` (UUID valid, sesi ada) dan `0 <= $chunkIndex < total_chunks`.
   - Simpan ke `chunk_<6-digit-index>.part` (menimpa bila retry — idempoten).
   - Kembalikan jumlah potongan diterima & persentase progres.
3. **`finalizeUpload(string $uploadId, array $context)`**:
   - Pastikan seluruh potongan `0 .. total_chunks - 1` lengkap.
   - Gabungkan secara *streaming* (`fopen` + `stream_copy_to_stream` per potongan, hemat memori PHP) ke file sementara `assembled.db`.
   - Verifikasi `filesize === total_size` dan `hash_file('sha256', $assembledPath) === $expectedSha256` (jika dikirim).
   - Jalankan `ArkasEngineService::verifyDatabaseFile($assembledPath)` (strict SQLCipher check). Jika tidak valid → hapus folder sesi, kembalikan `422` dengan pesan error asli.
   - Pindahkan `assembled.db` ke `storage/app/arkas_uploads/arkas.db` secara aman (hapus target lama / fallback copy+unlink), hapus folder sesi chunk, perbarui `last_upload` di `state.json`.
   - **Catatan mode aktif:** Karena pengguna memilih pemisahan tegas 2 tab, `finalizeUpload()` **tidak** memaksa pindah mode jika `active_mode` masih `'local'`; ia tetap mengembalikan `active_mode` terbaru agar UI dapat menampilkan notifikasi pengingat *"File berhasil diunggah. Klik 'Aktifkan Mode Online / VPS' jika ingin mulai memakainya."* (sementara jika user sudah di mode `'online'`, file langsung aktif dipakai).
   - Pertahankan endpoint legacy `POST /arkas-tools/upload-db` tetap bekerja untuk backward-compatibility test/klien lama (memakai verifikasi strict yang baru), sementara UI browser menggunakan protokol chunked.

---

### Unit 4: Endpoint Browser, Endpoint Agent & Keamanan

#### A. Endpoint Browser (di `routes/variant.php`)
- **Hapus** `Route::middleware(['role:bendahara'])` di sekitar grup `arkas-tools/path` & `arkas-tools/upload-db`.
- Otorisasi sepenuhnya ditegakkan oleh middleware global `EnforceModulePermissions` via `PermissionCatalog::resolveRouteRequirement()`:
  - `arkas-tools.get-path` → `path_arkas:read`
  - `arkas-tools.save-path`, `arkas-tools.set-mode`, `arkas-tools.upload-db`, `arkas-tools.remove-uploaded-db`, `arkas-tools.upload-init`, `arkas-tools.upload-chunk`, `arkas-tools.upload-finalize`, `arkas-tools.agent-pin`, `arkas-tools.agent-download`, `arkas-tools.agent-revoke` → `path_arkas:write`.
- Pemetaan aksi ditambahkan ke `ActivityLogger` untuk jejak audit.

#### B. Endpoint Agent (di `routes/web.php` tanpa session/CSRF, prefix `/arkas-agent`)
Didaftarkan 1 kali di root `routes/web.php` (bukan per-varian, karena `arkas.db` dipakai bersama keempat varian BOSP) dengan `withoutMiddleware` untuk CSRF/Session/Permission browser dan dilindungi middleware khusus `VerifyArkasAgentCredentials`:
- `POST /arkas-agent/ping` — memverifikasi `X-Arkas-Sync-Token` + `X-Arkas-Sync-Pin`, mengembalikan status server, `active_mode`, `last_upload.sha256`, `max_upload_mb`, `chunk_size_mb`.
- `POST /arkas-agent/upload/init`
- `POST /arkas-agent/upload/chunk`
- `POST /arkas-agent/upload/finalize`

**Aturan Keamanan `VerifyArkasAgentCredentials`:**
1. Wajib menyertakan header `X-Arkas-Sync-Token` dan `X-Arkas-Sync-Pin`.
2. Cek `RateLimiter` per IP (kunci `arkas-agent-auth:<ip>`): maksimal **5 kali gagal per 5 menit**; jika terlampaui balas `429 Too Many Requests` + durasi tunggu.
3. Validasi token terhadap `state.agent.token_hash` menggunakan `hash_equals(hash('sha256', $token), $storedTokenHash)` dan validasi PIN terhadap `state.agent.pin_hash` menggunakan `Hash::check($pin, $storedPinHash)`.
4. Jika valid, bersihkan counter kegagalan IP; jika gagal, naikkan hit counter dan balas `401 Unauthorized` dengan pesan jelas tanpa membocorkan mana yang salah (token atau PIN).
5. Jika `token_hash` kosong (sudah dicabut) → balas `401` (*"Akses Agent telah dicabut atau belum diaktifkan di server."*).

#### C. Generator 1-File `SIKAS-Arkas-Sync.bat` (`ArkasAgentScriptGenerator`)
- Endpoint `POST /arkas-tools/agent/download` (wajib PIN sudah diset di server):
  1. Generate token baru acak 64-karakter (`bin2hex(random_bytes(32))`), simpan `hash('sha256', $token)` ke `state.json` (otomatis menonaktifkan `.bat` lama).
  2. Tentukan URL server dasar secara otomatis dari request aktif (`$request->getSchemeAndHttpHost()` dengan dukungan `TrustProxies` sehingga HTTPS Cloudflare Tunnel/ngrok otomatis terdeteksi).
  3. Render 1 file `SIKAS-Arkas-Sync.bat` yang membungkus skrip PowerShell mandiri (*hybrid batch + PowerShell*, `UTF-8`), lalu kirim sebagai file download (`Content-Disposition: attachment; filename="SIKAS-Arkas-Sync.bat"`).
- **Perilaku `SIKAS-Arkas-Sync.bat` di laptop operator Windows:**
  1. Meminta input **PIN 4–6 digit** dengan input tersembunyi (`Read-Host -AsSecureString`), lalu memverifikasi ke `POST /arkas-agent/ping`.
  2. Mendeteksi otomatis `%APPDATA%\Arkas\arkas.db` (fallback `%LOCALAPPDATA%\Arkas\arkas.db`, atau prompt input manual jika lokasi khusus).
  3. Menampilkan menu pilihan:
     - **`[1]` Sync Sekarang (1x Klik):**
       - Deteksi apakah proses `ARKAS` (`Get-Process` nama mengandung `arkas`) sedang berjalan atau file `arkas.db-wal` berukuran `> 0`. Jika ya, minta operator menutup ARKAS dulu dan tunggu hingga bersih sebelum lanjut.
       - Hitung SHA-256 lokal (`Get-FileHash -Algorithm SHA256`) → panggil `init` → jika `already_up_to_date`, tampilkan status *"Sudah paling baru"* tanpa upload ulang.
       - Jika berbeda, baca file per potongan **2 MB** (`FileStream.Read`), unggah ke `/arkas-agent/upload/chunk` dengan progress bar persentase + auto-retry 3x per chunk, lalu panggil `/arkas-agent/upload/finalize` dan tampilkan ringkasan sukses (ukuran, waktu, tahun terdeteksi).
     - **`[2]` Mode Pantau Otomatis (Auto-Sync):**
       - Memakai PIN sesi yang sudah diverifikasi di awal (operator cukup minimize jendela).
       - Polling ringan tiap 5 detik: melacak transisi status proses ARKAS (`berjalan` → `tertutup`) serta perubahan timestamp/hash `arkas.db`.
       - Saat ARKAS baru tertutup, tunggu **3 detik** agar checkpoint WAL selesai penuh, pastikan `arkas.db-wal` sudah tidak aktif, cek SHA-256 terhadap hash terakhir, lalu otomatis jalankan upload chunked!

---

### Unit 5: Refactor UI Modal 2 Tab (`ArkasConfigModal.tsx` & `Sidebar.tsx`)

- Ekstrak modal konfigurasi dari `resources/js/Components/Sidebar.tsx` ke komponen terpisah `resources/js/Components/Arkas/ArkasConfigModal.tsx`.
- Ganti pengecekan `!isKepalaSekolah` menjadi `canWrite('path_arkas')` (dari props izin Inertia) agar selaras dengan backend.
- Struktur modal:
  1. **Status Banner Atas:** Menampilkan `Mode Aktif` (`Mode PC Lokal` / `Mode Online / VPS`), status koneksi (`Terhubung` / `Belum Terhubung`), dan metadata ringkas sumber aktif.
  2. **Tab 1 — Mode PC Lokal:**
     - Input jalur file lokal server (`ARKAS_DB_PATH`) + contoh lokasi umum.
     - Tombol utama: **"Aktifkan Mode PC Lokal & Simpan Path"**.
  3. **Tab 2 — Mode Online / VPS:**
     - Indikator status mode + tombol **"Aktifkan Mode Online / VPS"** jika saat ini masih aktif di Mode PC Lokal.
     - **Panel A — Unggah Manual `arkas.db` (Chunked Upload):**
       - Peringatan tutup ARKAS sebelum memilih file.
       - Input file + tombol **Unggah .db** dengan progress bar real-time (`0–100%`), label tahap (*Menyiapkan...* → *Mengunggah bagian X/Y...* → *Memverifikasi SQLCipher...*), tombol **Batalkan**, dan auto-retry 3x per potongan.
       - Hapus header manual `'Content-Type': 'multipart/form-data'`.
       - Metadata file unggahan terakhir (ukuran, tanggal, sumber `Browser`/`Agent`, nama perangkat, daftar tahun) + tombol **Hapus File**.
     - **Panel B — Agent Sync Laptop ARKAS:**
       - Pengaturan **PIN Sinkronisasi (4–6 digit)** (input angka masked + tombol **Simpan PIN**).
       - Tombol **"Generate Token & Download `SIKAS-Arkas-Sync.bat`"** (aktif setelah PIN diset; memperingatkan bahwa file `.bat` lama akan otomatis nonaktif).
       - Tombol **"Cabut Akses Agent"** bila token sedang aktif.
- **Dekoder Error Diagnostik di Frontend:**
  - Tangani status HTTP secara eksplisit: `413` (batas upload proxy/PHP), `419` (sesi/CSRF kedaluwarsa), `403` (tidak punya izin `path_arkas:write`), `422` (validasi/dekripsi SQLCipher dengan pesan rinci dari `errors` atau `message`), `429` (rate limit), `500/502/504` (error/timeout server), dan `Network Error` (putus koneksi / Mixed Content HTTPS).
- **Kartu ARKAS di `Sidebar.tsx`:** Menampilkan label status yang jujur sesuai mode aktif (bukan teks statis `"Terhubung · arkas.db"`), menggunakan ringkasan ringan `arkas_status` (`active_mode`, `source`, `exists`) yang dibagikan lewat `HandleInertiaRequests` (hanya cek `is_file` & `state.json`, tanpa menjalankan Python) dan diperbarui langsung saat modal menyimpan perubahan.

---

## 4. Non-Scope (Tidak Dikerjakan di Tahap Ini)

- Tidak mengubah skema tabel PostgreSQL maupun tabel 4 varian BOSP (`reguler`, `kinerja`, `silpa`, `kinerja_silpa`).
- Tidak menambahkan dukungan engine SQLCipher Linux (target server adalah Windows PC/VPS).
- Tidak membangun aplikasi desktop `.exe` terpisah (Agent menggunakan 1-file `.bat` PowerShell bawaan Windows).

---

## 5. Rencana Verifikasi & Pengujian (Saat Implementasi Nanti)

1. **PHPUnit Tests (`tests/Feature/ArkasChunkUploadAndAgentTest.php` + update `OnlineOfflineReadinessTest`):**
   - Isolasi tegas `active_mode`: saat `'local'` tidak memakai file unggahan; saat `'online'` tidak memakai `ARKAS_DB_PATH` / auto-detect.
   - Alur penuh chunked upload browser: `init` → beberapa `chunk` (termasuk retry chunk yang sama) → `finalize` → file terverifikasi & metadata tercatat.
   - Deduplikasi SHA-256: `init` dengan hash identik mengembalikan `already_up_to_date: true`.
   - Validasi kegagalan: ekstensi salah (`422`), ukuran melebihi batas (`422`), chunk belum lengkap (`422`), file bukan SQLite/SQLCipher valid (`422`).
   - Otorisasi `PermissionCatalog`: role kustom dengan `path_arkas = write` **diizinkan** (`200`), sedangkan `kepala_sekolah` dan role `path_arkas = read` ditolak (`403`).
   - Keamanan Agent: tanpa header (`401`), token salah (`401`), PIN salah (`401`), 6x percobaan gagal terkena rate-limit (`429`), token dicabut (`401`), token+PIN benar berhasil `ping` + chunked upload penuh, dan endpoint download menghasilkan script `.bat` valid berisi URL & token baru.
2. **Validasi Kualitas Kode & Build:**
   - `composer test` (seluruh suite PHPUnit hijau).
   - `npm run build` (`tsc && vite build` 0 error).
   - `vendor/bin/pint --test` pada file PHP yang disentuh.
