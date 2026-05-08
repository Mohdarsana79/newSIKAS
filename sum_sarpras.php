<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Http\Kernel::class);
$kernel->handle(Illuminate\Http\Request::capture());

use App\Models\BukuKasUmumUraianDetail;

$penganggaranId = 1;
$sum = BukuKasUmumUraianDetail::whereHas('bukuKasUmum', function($q) use ($penganggaranId) {
    $q->where('penganggaran_id', $penganggaranId);
})->whereHas('kodeKegiatan', function($q) {
    $q->where('kode', 'like', '05.08%');
})->sum('jumlah');

echo "Total Sarpras Spending: " . number_format($sum, 2) . "\n";
