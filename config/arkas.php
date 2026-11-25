<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Konfigurasi Integrasi Database ARKAS Desktop (arkas.db)
    |--------------------------------------------------------------------------
    |
    | Pada mode offline / server lokal dengan ARKAS desktop terpasang, `db_path`
    | dapat diisi jalur file lokal atau dibiarkan kosong untuk auto-detect.
    | Pada mode online VPS tanpa ARKAS lokal, pengguna dapat mengunggah file
    | arkas.db ke `upload_path` melalui antarmuka web.
    |
    */
    'db_path' => env('ARKAS_DB_PATH', ''),

    'upload_path' => storage_path('app/arkas_uploads/arkas.db'),

    'state_path' => storage_path('app/arkas_uploads/state.json'),

    'chunk_temp_dir' => storage_path('app/temp/arkas_chunks'),

    'engine_dir' => storage_path('app/arkas_engine'),

    'max_upload_mb' => (int) env('ARKAS_MAX_UPLOAD_MB', 500),

    'chunk_size_mb' => (int) env('ARKAS_CHUNK_SIZE_MB', 2),

    'chunk_ttl_seconds' => (int) env('ARKAS_CHUNK_TTL_SECONDS', 7200),
];
