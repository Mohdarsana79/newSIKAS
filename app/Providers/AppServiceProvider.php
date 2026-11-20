<?php

namespace App\Providers;

use Illuminate\Support\Facades\URL;
use Illuminate\Support\Facades\Vite;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        if ($this->shouldForceHttps()) {
            URL::forceScheme('https');
        }

        Vite::prefetch(concurrency: 3);
    }

    /**
     * Determine whether generated URLs should be forced to HTTPS without breaking local/LAN HTTP access.
     */
    protected function shouldForceHttps(): bool
    {
        if (config('app.force_https')) {
            return true;
        }

        if (app()->runningInConsole() || ! app()->environment('production')) {
            return false;
        }

        if (! str_starts_with((string) config('app.url'), 'https://')) {
            return false;
        }

        $host = request()->getHost();

        return $host !== '' && ! $this->isLocalOrLanHost($host);
    }

    protected function isLocalOrLanHost(string $host): bool
    {
        if (in_array($host, ['localhost', '127.0.0.1', '::1'], true)) {
            return true;
        }

        if (filter_var($host, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4)) {
            return filter_var($host, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4 | FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE) === false;
        }

        return false;
    }
}
