<?php
$files = glob(__DIR__ . '/app/Models/*.php');

foreach ($files as $file) {
    // We want to skip Kwitansi and TandaTerima because those were edited correctly manually!
    if (preg_match('/(Kwitansi|TandaTerima)\.php$/', $file)) {
        continue;
    }

    $content = file_get_contents($file);
    
    // Check if the file has the injected block
    if (strpos($content, '// Standardized Aliases for Variant Support') !== false) {
        // We injected: "\n    // Standardized Aliases for Variant Support\n" + (dynamic aliases) + "\n"
        // in place of "}"
        // Let's use regex to remove the injected block and restore "}"
        
        $newContent = preg_replace('/\n    \/\/ Standardized Aliases for Variant Support\n(?:    public function [A-Za-z0-9_]+\(\) \{ return \$this->[A-Za-z0-9_]+\(\); \}\n)+/', '}', $content);
        
        if ($newContent !== $content) {
            file_put_contents($file, $newContent);
            echo "Cleaned up " . basename($file) . "\n";
        }
    }
}
