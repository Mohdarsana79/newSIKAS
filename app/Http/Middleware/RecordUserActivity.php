<?php

namespace App\Http\Middleware;

use App\Config\PermissionCatalog;
use App\Services\ActivityLogger;
use Closure;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;

class RecordUserActivity
{
    /**
     * Route (setelah strip prefix varian) yang dikecualikan dari pencatatan middleware
     * karena bersifat non-mutasi/noise atau sudah dicatat secara spesifik oleh auth hooks/controller.
     *
     * @var list<string>
     */
    private const EXCLUDED_EXACT = [
        'login',
        'logout',
        'register',
        'password.otp.send',
        'password.otp.verify',
        'password.otp.reset',
        'api.ai.copilot.chat',
        'api.bku.ai-generate-uraian',
        'rkas.ai-executive-review',
        'backup.validate-password',
        'backup.auto-run',
        'backup.auto-test-sync',
        'backup.auto-heartbeat',
        'backup.auto-retry-cloud',
        'activity-logs.prune',
        'backup.restore-progress',
        'system-update.progress',
    ];

    /**
     * Prefix route yang dikecualikan dari pencatatan middleware.
     *
     * @var list<string>
     */
    private const EXCLUDED_PREFIXES = [
        'arkas-tools.ai-diagnose',
        'api.notifications.',
    ];

    public function __construct(private readonly ActivityLogger $logger) {}

    /**
     * Mencatat otomatis mutasi HTTP lintas modul & 4 varian BOSP, serta percobaan akses 403.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $actor = $request->user();
        $method = strtoupper($request->method());
        $isMutation = in_array($method, ['POST', 'PUT', 'PATCH', 'DELETE'], true);

        try {
            $response = $next($request);
        } catch (AuthorizationException $exception) {
            if ($actor) {
                $this->logger->logHttpMutation($request, null, $actor, 403);
            }

            throw $exception;
        } catch (HttpExceptionInterface $exception) {
            if ($actor && $exception->getStatusCode() === 403) {
                $this->logger->logHttpMutation($request, null, $actor, 403);
            }

            throw $exception;
        }

        if (! $actor) {
            return $response;
        }

        $statusCode = $response->getStatusCode();

        // Percobaan akses ditolak (403) dicatat baik pada GET maupun mutasi, termasuk route khusus seperti prune.
        if ($statusCode === 403) {
            $this->logger->logHttpMutation($request, $response, $actor, 403);

            return $response;
        }

        if ($this->isExcludedRoute($request)) {
            return $response;
        }

        // Hanya catat metode mutasi; abaikan kesalahan validasi form standar (422).
        if (! $isMutation || $statusCode === 422) {
            return $response;
        }

        $this->logger->logHttpMutation($request, $response, $actor);

        return $response;
    }

    protected function isExcludedRoute(Request $request): bool
    {
        $routeName = $request->route()?->getName();
        if (! is_string($routeName) || $routeName === '') {
            return false;
        }

        $normalized = PermissionCatalog::stripVariantPrefix($routeName);

        if (in_array($normalized, self::EXCLUDED_EXACT, true)) {
            return true;
        }

        foreach (self::EXCLUDED_PREFIXES as $prefix) {
            if (str_starts_with($normalized, $prefix)) {
                return true;
            }
        }

        return false;
    }
}
