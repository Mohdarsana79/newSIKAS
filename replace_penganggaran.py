import re

file_path = r'c:\laragon\www\newSIKAS\app\Http\Controllers\BukuKasUmumController.php'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

models = [
    'Penganggaran'
]

for model in models:
    content = re.sub(rf'\b{model}::class\b', rf'$this->{model}', content)
    content = re.sub(rf'\b{model}::', rf'($this->{model})::', content)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Replacement complete.")
