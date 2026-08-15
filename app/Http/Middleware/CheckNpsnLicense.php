<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Illuminate\Support\Facades\DB;

class CheckNpsnLicense
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        // Pengecualian rute agar tidak loop terus-menerus di halaman error
        if ($request->is('license-invalid') || $request->is('api/*')) {
            return $next($request);
        }

        $envNpsn = env('APP_NPSN_CODE');

        // Jika tidak ada NPSN di .env (misal belum diinstall via installer yang baru), kita anggap saja lolos
        // atau bisa juga dipaksa gagal. Di sini kita biarkan lolos jika kosong,
        // namun untuk proteksi maksimal, sebaiknya jika kosong diarahkan ke halaman error juga.
        if (empty($envNpsn)) {
            // Uncomment baris di bawah jika ingin memblokir akses saat tidak ada NPSN di .env sama sekali
            // return redirect()->route('license.invalid');
            return $next($request);
        }

        // Ambil NPSN dari database (tabel sekolahs sesuai migration 2026_01_11_000001_create_sekolah_profile_table)
        // Kita menggunakan Query Builder agar tidak perlu pusing dependensi Model jika belum di-import atau namanya berbeda.
        try {
            $sekolah = DB::table('sekolahs')->first();
            
            if ($sekolah) {
                $dbNpsn = $sekolah->npsn;
                
                if ((string)$dbNpsn !== (string)$envNpsn) {
                    return redirect()->route('license.invalid');
                }
            }
        } catch (\Exception $e) {
            // Jika tabel sekolahs belum ada (misal sedang migrate), biarkan lewat
            // return $next($request);
        }

        return $next($request);
    }
}
