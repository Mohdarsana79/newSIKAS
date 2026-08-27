import re

file_path = r'c:\laragon\www\newSIKAS\app\Http\Controllers\BukuKasUmumController.php'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Update __get method
get_method_old = """    public function __get(string $name)
    {
        if ($name === 'variant') {
            return app()->bound('variant') ? app('variant') : request()->get('_variant', 'reguler');
        }

        if ($name === 'Penganggaran') {
            return VariantConfig::getModelClass('penganggaran', $this->variant);
        }

        throw new \Exception("Undefined property: " . static::class . "::\${$name}");
    }"""

get_method_new = """    public function __get(string $name)
    {
        if ($name === 'variant') {
            return app()->bound('variant') ? app('variant') : request()->get('_variant', 'reguler');
        }

        $modelMapping = [
            'Penganggaran' => 'penganggaran',
            'BukuKasUmum' => 'bku',
            'BukuKasUmumUraianDetail' => 'bku_uraian_detail',
            'PenerimaanDana' => 'penerimaan_dana',
            'PenarikanTunai' => 'penarikan_tunai',
            'SetorTunai' => 'setor_tunai',
            'Sts' => 'sts',
            'Rkas' => 'rkas',
            'RkasPerubahan' => 'rkas_perubahan',
        ];

        if (array_key_exists($name, $modelMapping)) {
            return VariantConfig::getModelClass($modelMapping[$name], $this->variant);
        }

        throw new \Exception("Undefined property: " . static::class . "::\${$name}");
    }"""

if get_method_old in content:
    content = content.replace(get_method_old, get_method_new)
else:
    print("WARNING: get method not found!")

models = [
    'BukuKasUmumUraianDetail',
    'BukuKasUmum',
    'PenerimaanDana',
    'PenarikanTunai',
    'SetorTunai',
    'Sts',
    'RkasPerubahan',
    'Rkas',
]

for model in models:
    content = re.sub(rf'\b{model}::class\b', rf'$this->{model}', content)
    content = re.sub(rf'\b{model}::', rf'($this->{model})::', content)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Replacement complete.")
