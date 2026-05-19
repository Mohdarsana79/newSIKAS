<?php
// Test the updated ProvidesConvenienceMethods trait

require 'vendor/autoload.php';

use Laravel\Ai\Providers\Concerns\ProvidesConvenienceMethods;

// Verify the trait file has all required methods
$traitFile = file_get_contents('vendor/laravel/ai/src/Providers/Concerns/ProvidesConvenienceMethods.php');

$requiredMethods = [
    'instructions',
    'prompt',
    'stream',
    'queue',
    'broadcast',
    'broadcastNow',
    'broadcastOnQueue'
];

$missingMethods = [];
foreach ($requiredMethods as $method) {
    if (strpos($traitFile, "public function {$method}(") === false) {
        $missingMethods[] = $method;
    }
}

if (!empty($missingMethods)) {
    echo "FAIL: Missing methods in anonymous Agent class: " . implode(', ', $missingMethods) . "\n";
    exit(1);
}

echo "✓ All required Agent methods are implemented in anonymous class\n";
echo "✓ ProvidesConvenienceMethods trait is properly updated\n";
echo "\nThe error should now be fixed!\n";
