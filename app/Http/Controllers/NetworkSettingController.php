<?php

namespace App\Http\Controllers;

use App\Services\NetworkAccessService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;

class NetworkSettingController extends Controller
{
    /**
     * Menampilkan halaman pengaturan akses jaringan sekolah, firewall, dan domain publik.
     */
    public function index(Request $request, NetworkAccessService $networkAccess): InertiaResponse
    {
        return Inertia::render('NetworkSettings/Index', [
            'networkAccess' => $networkAccess->getNetworkSummary($request),
        ]);
    }

    /**
     * Memperbarui pengaturan akses jaringan & domain publik ke file .env aktif (termasuk C:\ProgramData\SIKAS\.env).
     */
    public function update(Request $request, NetworkAccessService $networkAccess): JsonResponse
    {
        $validated = $request->validate([
            'app_url' => ['nullable', 'url:http,https', 'max:255'],
            'force_https' => ['required', 'boolean'],
        ], [
            'app_url.url' => 'Format URL publik tidak valid. Gunakan awalan http:// atau https:// (contoh: https://sikas.sekolah.sch.id).',
        ]);

        $appUrl = trim((string) ($validated['app_url'] ?? ''));
        if ($appUrl === '') {
            $port = $networkAccess->detectActivePort($request);
            $appUrl = ($port === 80 || $port === 443) ? 'http://localhost' : "http://localhost:{$port}";
        } else {
            $appUrl = rtrim($appUrl, '/');
        }

        $envUpdates = [
            'APP_URL' => $appUrl,
            'FORCE_HTTPS' => $validated['force_https'] ? 'true' : 'false',
        ];

        $existingTrustedProxies = $networkAccess->getEnvValue('TRUSTED_PROXIES');
        if ($existingTrustedProxies === null || $existingTrustedProxies === '') {
            $envUpdates['TRUSTED_PROXIES'] = '*';
        }

        try {
            $networkAccess->updateEnvKeys($envUpdates);
        } catch (\RuntimeException $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage(),
            ], 422);
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Pengaturan akses jaringan & domain berhasil disimpan.',
            'networkAccess' => $networkAccess->getNetworkSummary($request),
        ]);
    }

    /**
     * Membuka port server aktif pada Windows Firewall agar dapat diakses lewat jaringan sekolah.
     */
    public function openFirewall(Request $request, NetworkAccessService $networkAccess): JsonResponse
    {
        $port = $networkAccess->detectActivePort($request);
        $result = $networkAccess->openFirewallPort($port);

        return response()->json([
            'status' => $result['success'] ? 'success' : 'error',
            'message' => $result['message'],
            'manual_command' => $result['manual_command'] ?? null,
            'firewall' => $networkAccess->getFirewallStatus($port),
        ], $result['success'] ? 200 : 422);
    }
}
