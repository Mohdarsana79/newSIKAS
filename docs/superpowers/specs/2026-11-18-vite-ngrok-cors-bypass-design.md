# Desain Pencegahan Blank Putih & Error CORS Vite pada Akses Ngrok / LAN

**Tanggal:** 2026-11-18
**Status:** Disetujui pengguna

## Akar Masalah
Saat `npm run dev` / `composer dev` berjalan di mesin pengembang, Vite membuat file `public/hot` (berisi `http://[::1]:5173`). Laravel `@vite` membaca `public/hot` secara global untuk semua request sehingga halaman yang dibuka melalui `https://...ngrok-free.app` atau perangkat lain di LAN tetap memuat skrip dari `http://[::1]:5173`, yang langsung diblokir browser karena CORS dan Mixed Content dan menyebabkan layar blank putih.

## Solusi Desain (Backend-Only)
1. **Middleware `App\Http\Middleware\ResolveViteHotAssetMode`:**
   - Didaftarkan pada awal grup `web` di `bootstrap/app.php` (setelah `TrustProxies` memproses `X-Forwarded-*`).
   - Memeriksa tiap HTTP request: apabila `public/build/manifest.json` tersedia dan `public/hot` ada, maka:
     - Jika `! app()->environment('local')`, atau `$request->isSecure()`, atau host bukan loopback (`localhost`, `127.0.0.1`, `::1`): alihkan `Vite::useHotFile(storage_path('framework/vite.hot.disabled'))` agar Laravel menyajikan aset hasil build (`public/build/*`) dari origin yang sama (`ngrok`/LAN).
     - Jika request lokal HTTP loopback (`http://localhost` / `http://127.0.0.1`), tetap gunakan `public/hot` agar HMR berjalan normal.
2. **Konfigurasi CORS Vite (`vite.config.js`):**
   - Menambahkan `server: { cors: true }` agar akses lokal antara `http://127.0.0.1:8000` dan `http://[::1]:5173` saat pengembangan bebas error CORS.
3. **Verifikasi Otomatis (`tests/Feature/OnlineOfflineReadinessTest.php`):**
   - Menambahkan feature test untuk memverifikasi `ResolveViteHotAssetMode` mem-bypass `public/hot` untuk request `ngrok`/LAN dan mempertahankannya untuk request HTTP `localhost`.
