<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Trusted Reverse Proxies
    |--------------------------------------------------------------------------
    |
    | Mengatur proxy tepercaya (Nginx, Cloudflare Tunnel, Caddy, IIS) agar
    | header X-Forwarded-Proto / X-Forwarded-Host / X-Forwarded-For dibaca
    | dengan aman saat diakses melalui domain HTTPS maupun localhost.
    |
    */
    'proxies' => env('TRUSTED_PROXIES', '*'),
];
