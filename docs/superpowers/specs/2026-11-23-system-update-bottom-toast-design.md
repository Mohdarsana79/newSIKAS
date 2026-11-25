# Desain Toast Notifikasi Versi Terbaru Aplikasi (Bottom Toast + Background Auto-Check 1 Jam)

**Tanggal:** 2026-11-23  
**Status:** Disetujui Pengguna — Dieksekusi  
**Cakupan:** `config/updater.php`, `app/Http/Controllers/SystemUpdateController.php`, `routes/web.php`, `resources/js/types/index.d.ts`, `resources/js/Components/UpdateAvailableToast.tsx`, `resources/js/Layouts/AuthenticatedLayout.tsx`, dan test PHPUnit.

---

## 1. Tujuan & Perilaku Produk

1. Ketika versi baru newSIKAS terdeteksi di GitHub Releases (`latestVersion > currentVersion`), tampilkan **toast melayang di bawah layar** pengguna dengan keterangan:
   - Judul: **"Versi Terbaru tersedia"** (+ badge versi `v2026.xx`)
   - Tombol aksi utama: **"Update sekarang"** → langsung mengarahkan pengguna via Inertia ke halaman `/pembaharuan` (`route('system-update.index')`).
   - Tombol **Close (`×`)**: menutup notifikasi dan menyimpannya di `sessionStorage` untuk nomor versi tersebut selama sesi browser berjalan (tidak muncul lagi saat berpindah halaman, tetapi mengingatkan kembali saat browser dibuka ulang / login baru jika belum di-update).
2. **Deteksi otomatis di latar belakang (non-blocking):**
   - Cache server (`config/updater.php` → `cache_ttl`) diset default **3600 detik (1 jam)**.
   - Endpoint ringan `GET /pembaharuan/background-check` mengecek versi terbaru menggunakan `getUpdateDetails(false)` (hanya menghubungi GitHub bila cache belum ada atau sudah lewat 1 jam; *fail-safe* saat offline).
   - Di frontend, komponen `UpdateAvailableToast` dikoordinasikan lintas tab menggunakan `localStorage` throttle 1 jam, dipicu non-blocking 2,5 detik setelah mount (hanya saat `navigator.onLine`) dan saat event `online` kembali.
3. **Hak akses & UX bersih:**
   - Hanya tampil untuk pengguna dengan izin `system_update === 'write'` (Bendahara atau role kustom dengan izin Kelola Pembaharuan). Akun tanpa izin (mis. Kepala Sekolah) tidak melihat toast sehingga tidak pernah diarahkan ke halaman `403`.
   - Otomatis disembunyikan saat pengguna sudah berada di halaman `/pembaharuan` (`system-update.index`).
   - Ditempatkan di **bawah tengah area konten** (`fixed bottom-4`, menyesuaikan offset sidebar pada desktop) agar tidak bertabrakan dengan `Toast.tsx` (kanan atas) maupun widget `CopilotDrawer` (kanan bawah).
