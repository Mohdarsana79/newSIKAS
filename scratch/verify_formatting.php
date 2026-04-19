<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Http\Controllers\DashboardController;

$controller = new DashboardController();
$reflection = new ReflectionClass($controller);
$method = $reflection->getMethod('formatMataUangSingkat');
$method->setAccessible(true);

$testData = [
    31320000 => '31,3 JT', // Expecting 31,3 JT or 31,32 JT
    1500000000 => '1,5 M',
    1000000 => '1 JT',
    500000 => '500.000',
    2000000000000 => '2 T',
    1250000000000 => '1,3 T' // approx
];

foreach ($testData as $amount => $expected) {
    $result = $method->invoke($controller, $amount);
    echo "Amount: " . number_format($amount) . " -> Result: $result\n";
}
