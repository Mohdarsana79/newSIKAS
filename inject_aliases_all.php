<?php

$dir = __DIR__ . '/app/Models';
$files = glob($dir . '/*.php');

$mappings = [
    'Penganggaran' => ['kinerjaPenganggaran', 'silpaPenganggaran', 'kinerjaSilpaPenganggaran'],
    'PenerimaanDana' => ['kinerjaPenerimaanDana', 'silpaPenerimaanDana', 'kinerjaSilpaPenerimaanDana'],
    'BukuKasUmum' => ['kinerjaBukuKasUmum', 'silpaBukuKasUmum', 'kinerjaSilpaBukuKasUmum'],
    'UraianDetail' => ['kinerjaUraianDetail', 'silpaUraianDetail', 'kinerjaSilpaUraianDetail'],
];

foreach ($files as $file) {
    $content = file_get_contents($file);
    $modified = false;

    foreach ($mappings as $aliasTarget => $variants) {
        $aliasName = lcfirst($aliasTarget);
        
        // If the model already has the alias, skip
        if (preg_match("/function\s+$aliasName\s*\(/", $content)) {
            continue;
        }

        foreach ($variants as $variantMethod) {
            // If the model has the variant method
            if (preg_match("/function\s+$variantMethod\s*\(/", $content)) {
                // Add the alias before the closing brace of the class
                $aliasCode = "\n    public function $aliasName() { return \$this->$variantMethod(); }\n";
                $content = preg_replace("/\}(?=\s*$)/", $aliasCode . "}", $content);
                $modified = true;
                echo "Added $aliasName to " . basename($file) . " (mapped to $variantMethod)\n";
                break; // Stop checking other variants for this alias target
            }
        }
    }

    if ($modified) {
        file_put_contents($file, $content);
    }
}

echo "Done injecting aliases.\n";
