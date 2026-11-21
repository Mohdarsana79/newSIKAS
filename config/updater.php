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
    'version' => '2026.30',

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
    | 86400 detik = 24 jam. Pengecekan otomatis di background hanya dilakukan
    | maksimal 1x sehari agar tidak memperlambat navigasi aplikasi.
    |
    */
    'cache_ttl' => 86400,
];
