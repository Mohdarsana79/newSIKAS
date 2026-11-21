<?php

namespace App\Services;

class LocalFolderBrowserService
{
    /**
     * Folder sistem yang dilewati agar daftar folder tetap bersih bagi pengguna awam.
     *
     * @var list<string>
     */
    private const IGNORED_ENTRIES = [
        '$recycle.bin',
        '$windows.~bt',
        'system volume information',
        'recovery',
        'config.msi',
        'msocache',
        'perflogs',
        'windows',
        'programdata',
        'program files',
        'program files (x86)',
    ];

    /**
     * Nama perangkat terlarang bawaan Windows NTFS (CON, PRN, AUX, NUL, COM1..9, LPT1..9).
     */
    private const WINDOWS_RESERVED_REGEX = '/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\..*)?$/i';

    public function __construct(private readonly AutoBackupService $autoBackup) {}

    /**
     * Mendeteksi pintasan cepat (Drive lokal, Documents, Desktop, dan Google Drive Desktop bila terpasang).
     *
     * @return list<array{label: string, path: string, kind: string}>
     */
    public function getQuickShortcuts(): array
    {
        $shortcuts = [];
        $seen = [];

        $addShortcut = static function (string $label, string $path, string $kind) use (&$shortcuts, &$seen): void {
            $real = @realpath($path);
            if ($real === false || ! is_dir($real)) {
                return;
            }
            $key = DIRECTORY_SEPARATOR === '\\' ? strtolower($real) : $real;
            if (isset($seen[$key])) {
                return;
            }
            $seen[$key] = true;
            $shortcuts[] = [
                'label' => $label,
                'path' => $real,
                'kind' => $kind,
            ];
        };

        if (PHP_OS_FAMILY === 'Windows') {
            $userProfile = (string) (getenv('USERPROFILE') ?: '');
            if ($userProfile !== '' && is_dir($userProfile)) {
                $addShortcut('Documents', $userProfile.'\\Documents', 'documents');
                $addShortcut('Desktop', $userProfile.'\\Desktop', 'desktop');
                $addShortcut('OneDrive', $userProfile.'\\OneDrive', 'cloud');
                $addShortcut('Google Drive', $userProfile.'\\Google Drive', 'cloud');
            }

            foreach (range('C', 'Z') as $letter) {
                $root = $letter.':\\';
                if (! @is_dir($root)) {
                    continue;
                }

                if (@is_dir($root.'My Drive')) {
                    $addShortcut("Google Drive ({$letter}:)", $root.'My Drive', 'cloud');
                }

                $addShortcut("Local Disk ({$letter}:)", $root, 'drive');
            }
        } else {
            $home = (string) (getenv('HOME') ?: '');
            if ($home !== '' && is_dir($home)) {
                $addShortcut('Home', $home, 'documents');
                $addShortcut('Documents', $home.'/Documents', 'documents');
            }
            $addShortcut('Root (/)', '/', 'drive');
        }

        return $shortcuts;
    }

    /**
     * Menjelajah isi direktori lokal secara aman (read-only) untuk Modal Folder Picker.
     *
     * @return array{
     *   success: bool,
     *   current_path: string|null,
     *   parent_path: string|null,
     *   selectable: bool,
     *   can_create_subfolder: bool,
     *   select_reason: string|null,
     *   shortcuts: list<array{label: string, path: string, kind: string}>,
     *   folders: list<array{name: string, path: string, selectable: bool}>,
     *   message?: string
     * }
     */
    public function browse(?string $requestedPath = null): array
    {
        $shortcuts = $this->getQuickShortcuts();

        $trimmed = is_string($requestedPath) ? trim($requestedPath) : '';
        if ($trimmed === '') {
            $defaultPath = $this->pickDefaultStartPath($shortcuts);
            if ($defaultPath === null) {
                return [
                    'success' => true,
                    'current_path' => null,
                    'parent_path' => null,
                    'selectable' => false,
                    'can_create_subfolder' => false,
                    'select_reason' => 'Pilih salah satu drive atau folder di sebelah kiri.',
                    'shortcuts' => $shortcuts,
                    'folders' => [],
                ];
            }
            $trimmed = $defaultPath;
        }

        if (
            str_contains($trimmed, "\0")
            || str_contains($trimmed, '..')
            || str_starts_with($trimmed, '\\\\')
            || str_starts_with($trimmed, '//')
            || preg_match('/^([a-zA-Z]:[\\\\\/]|\/)/', $trimmed) !== 1
        ) {
            return [
                'success' => false,
                'current_path' => null,
                'parent_path' => null,
                'selectable' => false,
                'can_create_subfolder' => false,
                'select_reason' => 'Jalur folder harus berupa path absolut yang valid dan bukan jalur jaringan UNC.',
                'shortcuts' => $shortcuts,
                'folders' => [],
                'message' => 'Jalur folder harus berupa path absolut yang valid dan bukan jalur jaringan UNC.',
            ];
        }

        $realCurrent = @realpath($trimmed);
        if ($realCurrent === false || ! is_dir($realCurrent)) {
            return [
                'success' => false,
                'current_path' => null,
                'parent_path' => null,
                'selectable' => false,
                'can_create_subfolder' => false,
                'select_reason' => 'Folder tidak ditemukan.',
                'shortcuts' => $shortcuts,
                'folders' => [],
                'message' => "Folder tidak ditemukan: {$trimmed}",
            ];
        }

        $parentPath = $this->resolveParentPath($realCurrent);

        // Jangan tampilkan isi direktori aplikasi, webroot, storage internal, atau direktori sistem OS
        if ($this->autoBackup->isInsideOrEqualForbiddenRoot($realCurrent)) {
            return [
                'success' => true,
                'current_path' => $realCurrent,
                'parent_path' => $parentPath,
                'selectable' => false,
                'can_create_subfolder' => false,
                'select_reason' => 'Folder aplikasi/sistem tidak dapat dipilih atau dijelajahi sebagai tujuan backup.',
                'shortcuts' => $shortcuts,
                'folders' => [],
            ];
        }

        $validation = $this->autoBackup->validateLocalSyncFolder($realCurrent);
        // Izinkan membuat sub-folder baru (mis. C:\Backup-SIKAS pada laptop 1 drive) selama bukan di dalam root terlarang & writable
        $canCreateSubfolder = @is_writable($realCurrent);

        $folders = [];
        $entries = @scandir($realCurrent);
        if (is_array($entries)) {
            foreach ($entries as $entry) {
                if ($entry === '.' || $entry === '..') {
                    continue;
                }
                if (str_starts_with($entry, '.')) {
                    continue;
                }
                if (in_array(strtolower($entry), self::IGNORED_ENTRIES, true)) {
                    continue;
                }

                $childPath = rtrim($realCurrent, '\\/').DIRECTORY_SEPARATOR.$entry;
                if (@is_link($childPath) || ! @is_dir($childPath)) {
                    continue;
                }

                $childReal = @realpath($childPath);
                if ($childReal === false) {
                    continue;
                }

                $childCheck = $this->autoBackup->validateLocalSyncPathFormat($childReal);

                $folders[] = [
                    'name' => $entry,
                    'path' => $childReal,
                    'selectable' => $childCheck['success'],
                ];

                if (count($folders) >= 200) {
                    break;
                }
            }
        }

        usort($folders, static fn (array $a, array $b): int => strnatcasecmp($a['name'], $b['name']));

        return [
            'success' => true,
            'current_path' => $realCurrent,
            'parent_path' => $parentPath,
            'selectable' => $validation['success'],
            'can_create_subfolder' => $canCreateSubfolder,
            'select_reason' => $validation['success']
                ? null
                : ($canCreateSubfolder
                    ? 'Folder root ini tidak boleh dipilih langsung. Buat atau pilih sub-folder di dalamnya (mis. klik + Folder Baru).'
                    : $validation['message']),
            'shortcuts' => $shortcuts,
            'folders' => $folders,
        ];
    }

    /**
     * Membuat sub-folder baru di dalam direktori induk yang valid & aman.
     *
     * @return array{success: bool, path?: string, message: string}
     */
    public function createFolder(string $parentPath, string $folderName): array
    {
        $cleanName = trim($folderName);
        if (
            $cleanName === ''
            || $cleanName === '.'
            || str_contains($cleanName, '..')
            || str_starts_with($cleanName, '.')
            || str_ends_with($cleanName, '.')
            || preg_match('/^[a-zA-Z0-9 _.-]{1,100}$/', $cleanName) !== 1
            || preg_match(self::WINDOWS_RESERVED_REGEX, $cleanName) === 1
        ) {
            return [
                'success' => false,
                'message' => 'Nama folder tidak valid. Gunakan huruf, angka, spasi, strip (-), atau garis bawah (_) tanpa diawali/diakhiri titik atau nama perangkat sistem.',
            ];
        }

        $trimmedParent = trim($parentPath);
        if (
            $trimmedParent === ''
            || str_contains($trimmedParent, "\0")
            || str_contains($trimmedParent, '..')
            || str_starts_with($trimmedParent, '\\\\')
            || str_starts_with($trimmedParent, '//')
            || preg_match('/^([a-zA-Z]:[\\\\\/]|\/)/', $trimmedParent) !== 1
        ) {
            return [
                'success' => false,
                'message' => 'Jalur folder induk tidak valid.',
            ];
        }

        $resolvedParent = @realpath($trimmedParent);
        if ($resolvedParent === false || ! is_dir($resolvedParent) || ! @is_writable($resolvedParent)) {
            return [
                'success' => false,
                'message' => 'Folder induk tidak ditemukan atau tidak memiliki izin tulis.',
            ];
        }

        if ($this->autoBackup->isInsideOrEqualForbiddenRoot($resolvedParent)) {
            return [
                'success' => false,
                'message' => 'Tidak diizinkan membuat folder backup di dalam direktori aplikasi atau sistem.',
            ];
        }

        $targetPath = rtrim($resolvedParent, '\\/').DIRECTORY_SEPARATOR.$cleanName;

        if (@is_link($targetPath)) {
            return [
                'success' => false,
                'message' => 'Folder tujuan berupa symlink tidak diizinkan demi keamanan.',
            ];
        }

        $targetFormatCheck = $this->autoBackup->validateLocalSyncPathFormat($targetPath);
        if (! $targetFormatCheck['success']) {
            return [
                'success' => false,
                'message' => $targetFormatCheck['message'],
            ];
        }

        if (is_dir($targetPath)) {
            $existingReal = @realpath($targetPath);
            if ($existingReal === false || ! $this->autoBackup->validateLocalSyncFolder($existingReal)['success']) {
                return [
                    'success' => false,
                    'message' => 'Folder yang ada tidak valid atau mengarah ke lokasi terlarang.',
                ];
            }

            return [
                'success' => true,
                'path' => $existingReal,
                'message' => "Folder \"{$cleanName}\" sudah tersedia dan siap dipilih.",
            ];
        }

        if (! @mkdir($targetPath, 0755, false)) {
            return [
                'success' => false,
                'message' => "Gagal membuat folder \"{$cleanName}\" di {$resolvedParent}. Pastikan folder induk memiliki izin tulis.",
            ];
        }

        $createdReal = @realpath($targetPath);
        if ($createdReal === false || ! $this->autoBackup->validateLocalSyncFolder($createdReal)['success']) {
            @rmdir($targetPath);

            return [
                'success' => false,
                'message' => 'Folder baru gagal divalidasi sebagai lokasi backup yang aman.',
            ];
        }

        return [
            'success' => true,
            'path' => $createdReal,
            'message' => "Folder \"{$cleanName}\" berhasil dibuat.",
        ];
    }

    /**
     * @param  list<array{label: string, path: string, kind: string}>  $shortcuts
     */
    protected function pickDefaultStartPath(array $shortcuts): ?string
    {
        foreach ($shortcuts as $shortcut) {
            if ($shortcut['kind'] === 'documents') {
                return $shortcut['path'];
            }
        }

        return $shortcuts[0]['path'] ?? null;
    }

    protected function resolveParentPath(string $realPath): ?string
    {
        $trimmed = rtrim($realPath, '\\/');
        if ($trimmed === '' || preg_match('/^[a-zA-Z]:$/', $trimmed) === 1) {
            return null;
        }

        $parent = dirname($realPath);
        if ($parent === $realPath || $parent === '.' || $parent === '') {
            return null;
        }

        return $parent;
    }
}
