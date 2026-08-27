<?php

$files = [
    'app/Http/Controllers/SptjController.php',
    'app/Http/Controllers/SpmthController.php',
    'app/Http/Controllers/Sp2bController.php',
    'app/Http/Controllers/LphController.php',
    'app/Http/Controllers/StsController.php',
    'app/Http/Controllers/DokumenController.php',
    'app/Http/Controllers/BukuKasUmumController.php',
    'app/Http/Controllers/PenarikanTunaiController.php',
    'app/Http/Controllers/SetorTunaiController.php',
];

foreach ($files as $file) {
    if (!file_exists($file)) continue;
    $content = file_get_contents($file);
    
    // Check if $this->variant is used in the controller, otherwise it doesn't make sense
    if (str_contains($content, '$this->variant')) {
        $content = preg_replace('/(\$data\s*=\s*\[)(?!.*\s*\'sumberDana\'\s*=>)/', "$1\n                'sumberDana' => \App\Config\VariantConfig::title(\$this->variant),", $content);
        file_put_contents($file, $content);
        echo "Updated $file\n";
    }
}
