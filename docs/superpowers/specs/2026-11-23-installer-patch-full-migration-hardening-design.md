# Desain Hardening Patch (`install_patch.iss`), Full Installer (`install_beta.iss`) & Pipeline Proteksi Rilis `2026.31`

**Tanggal:** 2026-11-23  
**Status:** Disetujui Pengguna — Dieksekusi  
**Cakupan:** `install_patch.iss`, `install_beta.iss`, `protect.ps1`, `yakpro-po.cnf`, `Panduan_Folder_Patch.md`, `newSIKAS/config/updater.php`, dan 5 migrasi terbaru (21–22 Nov 2026).

---

## 1. Keputusan Arsitektur Utama

1. **Folder `dbapp\` tidak pernah dimasukkan ke `install_patch.iss`** (agar data asli sekolah tidak ter-reset) dan **tidak perlu dimodifikasi manual setiap ada migrasi baru** untuk `install_beta.iss` — cukup menjaga `dbapp\` sebagai cluster PostgreSQL kosong `newSIKAS` yang valid lalu mengandalkan `artisan migrate --force` yang di-hardening pada kedua installer.
2. **Menunggu PostgreSQL benar-benar siap sebelum migrasi:** Kedua installer menjalankan polling `pgsql\bin\pg_isready.exe -h 127.0.0.1 -p 5438 -U postgres` (maks 15 detik) setelah `net start newsikas_DB`.
3. **Logging & deteksi gagal migrasi:** Output `artisan migrate --force` dicatat ke `{app}\wwwroot\storage\logs\install_migrate.log` dengan 1x retry otomatis; bila tetap gagal (`ResultCode <> 0`), installer menampilkan peringatan informatif (pada mode non-silent) sambil tetap menyalakan Apache.
4. **Proteksi data user & pembaruan script Python:**
   - Tambahkan `\storage\app\arkas_uploads\*` ke `Excludes` dan `[Dirs]` pada kedua installer agar file upload `arkas.db` & `state.json` (PIN/Token Agent Sync) sekolah tidak pernah tertimpa.
   - Perbaiki `install_beta.iss` agar **Mode Upgrade** juga menyalin `arkas_engine\*.py` + `pyarmor_runtime_000000\*` tanpa menimpa data `public\`/`private\` sekolah.
5. **Proteksi aman untuk Migrasi PHP 8 & 2 Script Python baru:**
   - Kecualikan `database/migrations` dari YAK Pro (`yakpro-po.cnf` + safety-restore di `protect.ps1`).
   - Tambahkan `check_anggaran.py` dan `check_penerimaan.py` ke daftar PyArmor di `protect.ps1`, dan bersihkan folder data dev dari `wwwroot\`.
6. **Idempotensi 5 Migrasi Terbaru (21–22 Nov):** Tambahkan guard `Schema::hasTable` / `Schema::hasColumn` dan samakan versi ke **`2026.31`**.
