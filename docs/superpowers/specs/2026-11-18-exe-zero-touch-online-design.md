# Desain Zero-Touch `.exe` Inno Setup Ready Online & Panel Akses Jaringan

**Tanggal:** 2026-11-18
**Status:** Disetujui Pengguna — Siap Implementasi
**Cakupan:** Installer Inno Setup (`../install_beta.iss`, `../install_demo.iss`), skrip build (`../protect.ps1`), serta Panel "Akses Jaringan & Online" di halaman Backup & Database (`Backup/Index.tsx`, `DatabaseController.php` / `NetworkAccessService.php`).

---

## 1. Tujuan

Memastikan pengguna paket `.exe` Inno Setup dapat langsung membuka aplikasi dari jaringan sekolah (IP LAN) maupun meng-onlinekannya melalui reverse proxy (`ngrok` / Cloudflare Tunnel / Nginx) **tanpa harus mengedit kode PHP/JS atau membuka file `.env` secara manual**.

---

## 2. Komponen Desain

### Komponen 1: Sanitasi `.env` Otomatis pada `../protect.ps1`
Pada tahap build rilis (`protect.ps1`), setelah menyalin proyek ke `wwwroot`:
- Pastikan `wwwroot\.env` (bila ada) disterilkan dari nilai development menjadi nilai produksi yang aman:
  - `APP_ENV=production`
  - `APP_DEBUG=false`
  - `ARKAS_DB_PATH=` (kosong agar memakai auto-detect di PC klien atau upload browser)
  - `TRUSTED_PROXIES=*`
  - `FORCE_HTTPS=false` (agar IP LAN tetap berjalan via HTTP, sementara reverse proxy HTTPS seperti ngrok/Cloudflare Tunnel otomatis terdeteksi via `X-Forwarded-Proto`)

### Komponen 2: Aturan Windows Firewall Otomatis di `../install_beta.iss` & `../install_demo.iss`
- Pada `../install_beta.iss`:
  - Saat `ssPostInstall` (sebelum/setelah menjalankan service Apache port `8773`), tambahkan aturan Windows Firewall masuk melalui `netsh advfirewall firewall`:
    - Hapus rule lama bernama `"newSIKAS Server (Port 8773)"` jika ada (idempoten saat upgrade), lalu tambahkan rule `dir=in action=allow protocol=TCP localport=8773`.
  - Pada `[UninstallRun]`: hapus rule `"newSIKAS Server (Port 8773)"`.
- Pada `../install_demo.iss`:
  - Pola identik untuk port `8774` dengan nama rule `"newSIKAS Demo Server (Port 8774)"`.

### Komponen 3: `App\Services\NetworkAccessService` + Endpoint di `DatabaseController`
- **`NetworkAccessService`**:
  - `getLocalLanIps(): array<int, string>`: Mendeteksi daftar IPv4 privat aktif pada host (mengutamakan IP LAN seperti `192.168.*`, `10.*`, `172.16–31.*`, mengecualikan `127.0.0.1` dan `0.0.0.0`) menggunakan fungsi jaringan PHP (`gethostbynamel(gethostname())`) dan fallback `ipconfig` pada Windows bila perlu.
  - `detectActivePort(Request $request): int`: Mengambil port dari `install.ini` (jika instalasi Inno Setup) atau port request berjalan (`$request->getPort()`), fallback `8773` / `8000`.
  - `getFirewallStatus(int $port): array`: Pada `PHP_OS_FAMILY === 'Windows'`, memeriksa status aturan firewall untuk port tersebut secara aman tanpa melempar exception.
  - `openFirewallPort(int $port, string $ruleName): array`: Menjalankan `netsh advfirewall firewall add rule ...` bila Bendahara menekan tombol "Buka Port Firewall" (jika tidak memiliki hak administrator, kembalikan pesan ramah + perintah satu baris yang jelas).
- **Endpoint Baru di `routes/variant.php` (di dalam grup `middleware(['role:bendahara'])` pada prefix `/backup`)**:
  - `POST /backup/network-settings` (`backup.network-settings`): Memvalidasi `public_url` (`nullable|url|max:255`) dan `force_https` (`boolean`), menyimpannya ke file `.env` aktif (`app()->environmentFilePath()`, yang otomatis mengarah ke `C:\ProgramData\SIKAS\.env` pada instalasi `.exe`), memperbarui `Config::set(...)`, dan membersihkan cache config bila `configurationIsCached()` bernilai `true`.
  - `POST /backup/firewall-open` (`backup.firewall-open`): Mencoba membuka port server aktif di Windows Firewall dan mengembalikan status terbaru.

### Komponen 4: Panel UI "Akses Jaringan & Online" di `resources/js/Pages/Backup/Index.tsx`
- Ditampilkan pada halaman **Backup & Database** (hanya dapat diakses oleh role `bendahara`):
  - **Kartu Akses Jaringan Sekolah (LAN):**
    - Menampilkan daftar link siap buka (mis. `http://192.168.1.15:8773`) dengan tombol **Salin Alamat** (dengan indikator *Tersalin*) agar Bendahara tinggal kirim ke Kepala Sekolah / staf lain di jaringan yang sama.
    - Menampilkan status **Windows Firewall** (`Terbuka` / `Perlu Dicek` / `Non-Windows`) beserta tombol cek/buka port bila dibutuhkan.
  - **Pengaturan Opsional Domain Publik (Cloudflare Tunnel / ngrok / VPS):**
    - Input `APP_URL` opsional (contoh `https://sikas.sekolah.sch.id`) dan toggle `FORCE_HTTPS` (dengan keterangan bahwa untuk `ngrok` / LAN campuran sebaiknya dibiarkan nonaktif).
    - Menyimpan langsung ke konfigurasi aktif (termasuk `C:\ProgramData\SIKAS\.env` pada instalasi `.exe`) tanpa user membuka folder sistem.

---

## 3. Verifikasi
1. Uji sintaks PHP + unit/feature test `OnlineOfflineReadinessTest` untuk:
   - Deteksi IP LAN & port `NetworkAccessService`.
   - Simpan pengaturan jaringan (`POST /backup/network-settings`) ke file `.env` custom (termasuk simulasi mode `ProgramData`) + pembersihan cache config.
   - Akses `kepala_sekolah` ditolak (`403`) pada `/backup/network-settings` dan `/backup/firewall-open`.
2. Uji `npm run build` (`tsc && vite build`), `vendor/bin/pint`, serta validasi regex/struktur `../protect.ps1`, `../install_beta.iss`, dan `../install_demo.iss`.
