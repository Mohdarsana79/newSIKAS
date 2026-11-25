<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Versi Aplikasi Saat Ini
    |--------------------------------------------------------------------------
    |
    | Nilai ini digunakan sebagai versi aplikasi saat ini (dan disinkronkan
    | dengan file ../configapp/install.ini pada instalasi produksi Inno Setup).
    | Pastikan nilai ini sama dengan #define MyAppVersion di install_beta.iss / install_patch.iss.
    |
    */
    'version' => '2026.33',

    /*
    |--------------------------------------------------------------------------
    | Konfigurasi GitHub Releases (Repository Publik Khusus Rilis Installer)
    |--------------------------------------------------------------------------
    |
    | Menggunakan repository publik khusus rilis ("Mohdarsana79/newSIKAS-releases")
    | yang hanya berisi file installer .exe hasil obfuscate tanpa source code.
    | Dengan metode ini, aplikasi tidak memerlukan Personal Access Token
    | ('token' => '') dan bebas dari batas kedaluwarsa token selamanya.
    |
    */
    'github' => [
        'owner' => 'Mohdarsana79',
        'repo' => 'newSIKAS-releases',
        'token' => '',
        'asset_pattern' => '/^newSIKAS_(Installer|Patch|Update)_.*\.exe$/i',
    ],

    /*
    |--------------------------------------------------------------------------
    | Interval Cache Pengecekan Otomatis (Detik)
    |--------------------------------------------------------------------------
    |
    | 3600 detik = 1 jam. Pengecekan otomatis di background hanya menghubungi
    | GitHub Releases maksimal 1x per jam agar rilis patch cepat terdeteksi
    | namun tetap aman dari batas rate-limit GitHub dan tidak memperlambat UI.
    |
    */
    'cache_ttl' => (int) env('UPDATER_CACHE_TTL', 3600),
];
