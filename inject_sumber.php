<?php
$files = ['app/Http/Controllers/KwitansiController.php', 'app/Http/Controllers/TandaTerimaController.php'];
foreach ($files as $file) {
    $content = file_get_contents($file);
    $content = preg_replace('/(\$data\s*=\s*\[)(?!.*\s*\'sumberDana\'\s*=>)/', "$1\n                'sumberDana' => \App\Config\VariantConfig::title(\$this->variant),", $content);
    file_put_contents($file, $content);
    echo "Updated $file\n";
}
