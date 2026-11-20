# Desain Pemindahan Fitur Pengaturan Jaringan ke Sidebar

**Tanggal:** 2026-11-18
**Status:** Disetujui pengguna

## Tujuan
Memisahkan pengaturan akses jaringan & mode online dari modul `Backup Database` menjadi menu tersendiri di bagian **Sistem** pada Sidebar, sehingga halaman `Backup Database` kembali fokus penuh pada backup, restore, reset database, dan manajemen NPSN.

## Keputusan Desain
1. **Lokasi Sidebar & Hak Akses:** Item **Pengaturan Jaringan** ditempatkan pada bagian **Sistem** di `Sidebar.tsx` (sejajar dengan `Backup Database` dan `Pembaharuan`) dan khusus peran `bendahara` (`!isKepalaSekolah`).
2. **Pemisahan Backend & Routing:**
   - Controller baru: `app/Http/Controllers/NetworkSettingController.php` (`index`, `update`, `openFirewall`), mengonsumsi `App\Services\NetworkAccessService`.
   - Routes global di `routes/web.php` di bawah middleware `role:bendahara` (`prefix('pengaturan-jaringan')->name('network-settings.')`):
     - `GET /pengaturan-jaringan` (`network-settings.index`)
     - `POST /pengaturan-jaringan` (`network-settings.update`)
     - `POST /pengaturan-jaringan/firewall-open` (`network-settings.firewall-open`)
   - Pembersihan penuh: hapus `NetworkAccessService`, prop `networkAccess`, method `updateNetworkSettings` & `openFirewall` dari `DatabaseController.php`, serta hapus route `backup.network-settings` & `backup.firewall-open` dari `routes/variant.php`.
3. **Antarmuka Halaman (`resources/js/Pages/NetworkSettings/Index.tsx`):**
   - Mengikuti pola SIKAS Neo-Bento (`AuthenticatedLayout`, `PageHeader`, `StatCard`, `Surface`, `IconTile`, `StatusBadge`).
   - Menyajikan 4 kartu status ringkas (`Port Server Aktif`, `IP Jaringan Lokal`, `Windows Firewall`, `Domain & HTTPS`), panel 2 kolom (daftar link LAN siap salin + status & tombol buka Windows Firewall di kiri; form domain publik opsional + `FORCE_HTTPS` di kanan), serta kartu panduan singkat akses via LAN sekolah dan `ngrok` / Cloudflare Tunnel.
   - `resources/js/Pages/Backup/Index.tsx` dibersihkan dari seluruh state, handler, dan panel jaringan.

## Verifikasi
- Jalankan `OnlineOfflineReadinessTest` & test terkait via `composer test`.
- Format PHP dengan `vendor/bin/pint`.
- Jalankan `npm run build` (`tsc && vite build`).
