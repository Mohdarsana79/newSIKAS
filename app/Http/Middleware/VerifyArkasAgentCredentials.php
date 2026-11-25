<?php

namespace App\Http\Middleware;

use App\Services\ArkasStateStore;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Symfony\Component\HttpFoundation\Response;

class VerifyArkasAgentCredentials
{
    public const MAX_FAILED_ATTEMPTS = 5;

    public const DECAY_SECONDS = 300;

    public function __construct(
        protected ArkasStateStore $stateStore
    ) {}

    /**
     * Validate X-Arkas-Sync-Token + X-Arkas-Sync-Pin with per-IP brute-force rate limiting.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $rateKey = 'arkas-agent-auth:'.($request->ip() ?: 'unknown');

        if (RateLimiter::tooManyAttempts($rateKey, self::MAX_FAILED_ATTEMPTS)) {
            $seconds = RateLimiter::availableIn($rateKey);

            return response()->json([
                'status' => 'error',
                'message' => "Terlalu banyak percobaan PIN/Token gagal. Coba lagi dalam {$seconds} detik.",
                'retry_after' => $seconds,
            ], 429);
        }

        if (! $this->stateStore->hasAgentToken() || ! $this->stateStore->hasAgentPin()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Akses Agent Sync belum diaktifkan atau token telah dicabut di server SIKAS.',
            ], 401);
        }

        $token = trim((string) $request->header('X-Arkas-Sync-Token', ''));
        $pin = trim((string) $request->header('X-Arkas-Sync-Pin', ''));

        if (! $this->stateStore->verifyAgentCredentials($token, $pin)) {
            RateLimiter::hit($rateKey, self::DECAY_SECONDS);
            $remaining = max(0, self::MAX_FAILED_ATTEMPTS - RateLimiter::attempts($rateKey));

            return response()->json([
                'status' => 'error',
                'message' => $remaining > 0
                    ? "Token atau PIN Sinkronisasi tidak valid. Sisa percobaan: {$remaining}."
                    : 'Token atau PIN Sinkronisasi tidak valid. Akses dikunci sementara selama 5 menit.',
            ], 401);
        }

        RateLimiter::clear($rateKey);

        return $next($request);
    }
}
