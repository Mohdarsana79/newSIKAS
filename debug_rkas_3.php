<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Http\Kernel::class);
$kernel->handle(Illuminate\Http\Request::capture());

use App\Models\Rkas;

$penganggaranId = 3;
$rkas = Rkas::where('penganggaran_id', $penganggaranId)
    ->whereHas('kodeKegiatan', function($q) {
        $q->where('kode', 'like', '05.08.01%')
          ->orWhere('kode', 'like', '05.08.03%')
          ->orWhere('kode', 'like', '05.08.05%')
          ->orWhere('kode', 'like', '05.08.10%');
    })->get();

$total = $rkas->sum(function($i) { return $i->jumlah * $i->harga_satuan; });
echo "Total Sarpras Budget for ID 3: " . number_format($total, 2) . "\n";
