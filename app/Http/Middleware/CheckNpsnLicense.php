<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;

class CheckNpsnLicense
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        // Pengecualian rute agar tidak loop terus-menerus di halaman error
        if ($request->is('license-invalid') || $request->is('api/*')) {
            return $next($request);
        }

        // Pengecualian saat menjalankan unit test umum (kecuali saat pengujian lisensi spesifik)
        if (app()->runningUnitTests() && ! $request->attributes->get('test_license_middleware')) {
            return $next($request);
        }

        $envNpsn = trim((string) env('APP_NPSN_CODE'));
        $allowedNpsns = (array) config('license.allowed_npsn', []);

        // 1. Wajib ada APP_NPSN_CODE
        if (empty($envNpsn)) {
            return redirect()->route('license.invalid');
        }

        // 2. Wajib terdaftar di whitelist resmi
        if (! in_array($envNpsn, $allowedNpsns, true)) {
            return redirect()->route('license.invalid');
        }

        // 3. Wajib cocok dengan profil sekolah di database jika sudah terisi
        try {
            $sekolah = DB::table('sekolahs')->first();

            if ($sekolah) {
                $dbNpsn = (string) $sekolah->npsn;

                if ($dbNpsn !== $envNpsn || ! in_array($dbNpsn, $allowedNpsns, true)) {
                    return redirect()->route('license.invalid');
                }
            }
        } catch (\Exception $e) {
            // Jika tabel sekolahs belum ada (misal sedang migrate), biarkan lewat
        }

        return $next($request);
    }
}
