import re

file_path = r'c:\laragon\www\newSIKAS\app\Http\Controllers\BukuKasUmumController.php'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace assignments like `$model = $isTahap1 ? $this->Rkas : $this->RkasPerubahan;`
content = content.replace('$isTahap1 ? $this->Rkas : $this->RkasPerubahan', '($isTahap1 || !$this->RkasPerubahan) ? $this->Rkas : $this->RkasPerubahan')
content = content.replace('$isMonthTahap1 ? $this->Rkas : $this->RkasPerubahan', '($isMonthTahap1 || !$this->RkasPerubahan) ? $this->Rkas : $this->RkasPerubahan')
content = content.replace('$isTahap2 ? $this->RkasPerubahan : $this->Rkas', '($isTahap2 && $this->RkasPerubahan) ? $this->RkasPerubahan : $this->Rkas')

# Replace direct calls `($this->RkasPerubahan)::query()`
content = content.replace('($this->RkasPerubahan)::', '($this->RkasPerubahan ?? $this->Rkas)::')

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("RkasPerubahan replacement complete.")
