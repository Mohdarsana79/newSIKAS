<?php

use App\Models\SyncLog;
use Illuminate\Contracts\Console\Kernel;

require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Kernel::class);
$kernel->bootstrap();

$log = SyncLog::latest()->first();
if ($log) {
    file_put_contents('scratch/log_message.txt', 'STATUS: '.$log->status."\nMESSAGE: ".$log->message);
} else {
    file_put_contents('scratch/log_message.txt', 'No logs found.');
}
