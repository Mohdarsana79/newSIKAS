<?php

namespace App\Config;

use Illuminate\Support\Str;

class PermissionCatalog
{
    public const LEVEL_NONE = 'none';

    public const LEVEL_READ = 'read';

    public const LEVEL_WRITE = 'write';

    /**
     * Daftar modul aplikasi yang dapat diatur hak aksesnya oleh Bendahara.
     *
     * @return array<int, array{key: string, label: string, group: string, description: string, supports_write: bool}>
     */
    public static function modules(): array
    {
        return [
            // Menu Utama
            [
                'key' => 'dashboard',
                'label' => 'Dashboard',
                'group' => 'Menu Utama',
                'description' => 'Ringkasan pagu, realisasi bulanan, tren tahunan, dan kalender keuangan.',
                'supports_write' => false,
            ],
            [
                'key' => 'penganggaran',
                'label' => 'Penganggaran & RKAS',
                'group' => 'Menu Utama',
                'description' => 'Data penganggaran tahunan, RKAS awal, dan RKAS perubahan.',
                'supports_write' => true,
            ],
            [
                'key' => 'penatausahaan',
                'label' => 'Penatausahaan & BKU',
                'group' => 'Menu Utama',
                'description' => 'Penerimaan dana, Buku Kas Umum (BKU), pajak, audit BKU, dan rekapitulasi.',
                'supports_write' => true,
            ],
            [
                'key' => 'sts',
                'label' => 'Status STS',
                'group' => 'Menu Utama',
                'description' => 'Pencatatan dan pelaporan Surat Tanda Setoran.',
                'supports_write' => true,
            ],
            [
                'key' => 'arkas_tools',
                'label' => 'Arkas Tools',
                'group' => 'Menu Utama',
                'description' => 'Pencarian barang/rekening ARKAS, sinkronisasi referensi, dan diagnostik.',
                'supports_write' => true,
            ],
            [
                'key' => 'referensi_kode',
                'label' => 'Referensi Kode',
                'group' => 'Menu Utama',
                'description' => 'Daftar referensi kode kegiatan dan rekening belanja.',
                'supports_write' => true,
            ],

            // Data Master
            [
                'key' => 'sekolah_profile',
                'label' => 'Profil Sekolah & Kop Surat',
                'group' => 'Data Master',
                'description' => 'Identitas sekolah, kepala sekolah, bendahara, dan builder kop surat.',
                'supports_write' => true,
            ],
            [
                'key' => 'kode_kegiatan',
                'label' => 'Kode Kegiatan',
                'group' => 'Data Master',
                'description' => 'Master data kode kegiatan beserta impor/ekspor Excel.',
                'supports_write' => true,
            ],
            [
                'key' => 'rekening_belanja',
                'label' => 'Rekening Belanja',
                'group' => 'Data Master',
                'description' => 'Master data rekening belanja beserta impor/ekspor Excel.',
                'supports_write' => true,
            ],

            // Fitur Pelengkap
            [
                'key' => 'kwitansi',
                'label' => 'Kwitansi',
                'group' => 'Fitur Pelengkap',
                'description' => 'Pembuatan, preview, dan cetak kwitansi belanja.',
                'supports_write' => true,
            ],
            [
                'key' => 'tanda_terima',
                'label' => 'Tanda Terima',
                'group' => 'Fitur Pelengkap',
                'description' => 'Pembuatan dan cetak bukti tanda terima.',
                'supports_write' => true,
            ],
            [
                'key' => 'bast',
                'label' => 'BAST',
                'group' => 'Fitur Pelengkap',
                'description' => 'Berita Acara Serah Terima barang dan jasa.',
                'supports_write' => true,
            ],
            [
                'key' => 'surat_pesanan',
                'label' => 'Surat Pesanan',
                'group' => 'Fitur Pelengkap',
                'description' => 'Pembuatan dan cetak surat pesanan barang/jasa.',
                'supports_write' => true,
            ],
            [
                'key' => 'dokumen',
                'label' => 'Dokumen',
                'group' => 'Fitur Pelengkap',
                'description' => 'Arsip dokumen pendukung keuangan sekolah.',
                'supports_write' => true,
            ],
            [
                'key' => 'sk_surat',
                'label' => 'SK & Surat',
                'group' => 'Fitur Pelengkap',
                'description' => 'Folder, template Word/PDF, dan generator SK & surat sekolah.',
                'supports_write' => true,
            ],
            [
                'key' => 'laporan',
                'label' => 'Laporan (SPTJ, SP2B, SPMTH, LPH)',
                'group' => 'Fitur Pelengkap',
                'description' => 'Pembuatan dan cetak laporan pertanggungjawaban.',
                'supports_write' => true,
            ],

            // Integrasi & Sistem
            [
                'key' => 'path_arkas',
                'label' => 'Koneksi & Upload DB ARKAS',
                'group' => 'Integrasi & Sistem',
                'description' => 'Mengatur path lokal atau mengunggah file arkas.db.',
                'supports_write' => true,
            ],
            [
                'key' => 'backup',
                'label' => 'Backup & Restore Database',
                'group' => 'Integrasi & Sistem',
                'description' => 'Backup, restore, reset database, dan manajemen NPSN.',
                'supports_write' => true,
            ],
            [
                'key' => 'network_settings',
                'label' => 'Pengaturan Jaringan',
                'group' => 'Integrasi & Sistem',
                'description' => 'Link LAN sekolah, izin Windows Firewall, dan domain publik.',
                'supports_write' => true,
            ],
            [
                'key' => 'system_update',
                'label' => 'Pembaharuan Aplikasi',
                'group' => 'Integrasi & Sistem',
                'description' => 'Cek rilis terbaru dan jalankan update aplikasi.',
                'supports_write' => true,
            ],
            [
                'key' => 'user_management',
                'label' => 'Management & Role',
                'group' => 'Integrasi & Sistem',
                'description' => 'Kelola akun pengguna, role custom, dan matriks hak akses.',
                'supports_write' => true,
            ],
        ];
    }

    /**
     * Kemampuan khusus di luar level baca/tulis modul standar.
     *
     * @return array<int, array{key: string, label: string, description: string}>
     */
    public static function abilities(): array
    {
        return [
            [
                'key' => 'rkas_review',
                'label' => 'Telaah Item Belanja RKAS',
                'description' => 'Memberikan catatan telaah/revisi atau menyetujui item belanja RKAS.',
            ],
            [
                'key' => 'rkas_approve',
                'label' => 'Pengesahan / Persetujuan RKAS',
                'description' => 'Mengesahkan atau membatalkan status persetujuan penganggaran RKAS.',
            ],
        ];
    }

    /**
     * Preset izin bawaan untuk role sistem.
     *
     * @return array{modules: array<string, string>, abilities: array<string, bool>}
     */
    public static function defaultPermissionsForRole(string $slug): array
    {
        $modules = [];

        if ($slug === 'kepala_sekolah') {
            $systemHidden = ['path_arkas', 'backup', 'network_settings', 'system_update', 'user_management'];
            foreach (self::modules() as $mod) {
                $modules[$mod['key']] = in_array($mod['key'], $systemHidden, true)
                    ? self::LEVEL_NONE
                    : self::LEVEL_READ;
            }

            return [
                'modules' => $modules,
                'abilities' => [
                    'rkas_review' => true,
                    'rkas_approve' => true,
                ],
            ];
        }

        if ($slug === 'bendahara') {
            foreach (self::modules() as $mod) {
                $modules[$mod['key']] = $mod['supports_write'] ? self::LEVEL_WRITE : self::LEVEL_READ;
            }

            return [
                'modules' => $modules,
                'abilities' => [
                    'rkas_review' => false,
                    'rkas_approve' => false,
                ],
            ];
        }

        // Default aman untuk role baru: hanya Dashboard & Laporan (read)
        foreach (self::modules() as $mod) {
            $modules[$mod['key']] = $mod['key'] === 'dashboard' ? self::LEVEL_READ : self::LEVEL_NONE;
        }

        return [
            'modules' => $modules,
            'abilities' => [
                'rkas_review' => false,
                'rkas_approve' => false,
            ],
        ];
    }

    /**
     * Normalisasi struktur permissions agar selalu konsisten dan aman.
     *
     * @param  array<string, mixed>  $raw
     * @return array{modules: array<string, string>, abilities: array<string, bool>}
     */
    public static function normalizePermissions(array $raw, bool $protectBendaharaAdmin = false): array
    {
        $rawModules = is_array($raw['modules'] ?? null) ? $raw['modules'] : [];
        $rawAbilities = is_array($raw['abilities'] ?? null) ? $raw['abilities'] : [];

        $modules = [];
        foreach (self::modules() as $mod) {
            $key = $mod['key'];
            $val = $rawModules[$key] ?? self::LEVEL_NONE;
            if (! in_array($val, [self::LEVEL_NONE, self::LEVEL_READ, self::LEVEL_WRITE], true)) {
                $val = self::LEVEL_NONE;
            }
            if (! $mod['supports_write'] && $val === self::LEVEL_WRITE) {
                $val = self::LEVEL_READ;
            }
            $modules[$key] = $val;
        }

        if ($protectBendaharaAdmin) {
            $modules['user_management'] = self::LEVEL_WRITE;
        }

        $abilities = [];
        foreach (self::abilities() as $ability) {
            $abilities[$ability['key']] = (bool) ($rawAbilities[$ability['key']] ?? false);
        }

        return [
            'modules' => $modules,
            'abilities' => $abilities,
        ];
    }

    /**
     * Memetakan nama route & HTTP method ke modul + level akses yang diperlukan.
     *
     * @return array{module?: string, level?: string, ability?: string}|null
     */
    public static function resolveRouteRequirement(?string $routeName, string $method): ?array
    {
        if (! is_string($routeName) || $routeName === '') {
            return null;
        }

        $normalizedName = self::stripVariantPrefix($routeName);
        $isMutation = in_array(strtoupper($method), ['POST', 'PUT', 'PATCH', 'DELETE'], true);

        // Route akun pribadi & autentikasi selalu diizinkan untuk semua user yang login.
        foreach ([
            'logout',
            'login',
            'password.',
            'profile.',
            'verification.',
            'license.',
            'api.notifications.',
            'api.ai.copilot.',
        ] as $publicPrefix) {
            if ($normalizedName === rtrim($publicPrefix, '.') || str_starts_with($normalizedName, $publicPrefix)) {
                return null;
            }
        }

        // Route kewenangan khusus RKAS
        if (in_array($normalizedName, ['rkas-review.store', 'rkas-review.destroy'], true)) {
            return ['ability' => 'rkas_review'];
        }
        if ($normalizedName === 'rkas-review.resubmit') {
            return ['module' => 'penganggaran', 'level' => self::LEVEL_WRITE];
        }
        if (in_array($normalizedName, ['penganggaran.approve', 'penganggaran.unapprove'], true)) {
            return ['ability' => 'rkas_approve'];
        }
        if ($normalizedName === 'rkas.ai-executive-review') {
            return ['ability' => 'rkas_review_or_penganggaran_write'];
        }

        // Route Path ARKAS khusus (dibedakan dari menu Arkas Tools biasa)
        if (in_array($normalizedName, ['arkas-tools.save-path', 'arkas-tools.upload-db', 'arkas-tools.remove-uploaded-db'], true)) {
            return ['module' => 'path_arkas', 'level' => self::LEVEL_WRITE];
        }
        if ($normalizedName === 'arkas-tools.get-path') {
            return ['module' => 'path_arkas', 'level' => self::LEVEL_READ];
        }

        // Diagnostic & AI helper pada Arkas Tools / BKU
        if (in_array($normalizedName, ['arkas-tools.ai-diagnose', 'arkas-tools.ai-diagnose-context'], true)) {
            return ['module' => 'arkas_tools', 'level' => self::LEVEL_READ];
        }

        $prefixMap = [
            'dashboard' => 'dashboard',
            'penganggaran' => 'penganggaran',
            'rkas-perubahan' => 'penganggaran',
            'rkas' => 'penganggaran',
            'penatausahaan' => 'penatausahaan',
            'bku-audit' => 'penatausahaan',
            'api.bku-audit' => 'penatausahaan',
            'bku' => 'penatausahaan',
            'api.bku' => 'penatausahaan',
            'penerimaan-dana' => 'penatausahaan',
            'penarikan-tunai' => 'penatausahaan',
            'setor-tunai' => 'penatausahaan',
            'bkp-bank' => 'penatausahaan',
            'bkp-pembantu' => 'penatausahaan',
            'bkp-umum' => 'penatausahaan',
            'bkp-pajak' => 'penatausahaan',
            'bkp-rob' => 'penatausahaan',
            'bkp-reg' => 'penatausahaan',
            'ba.' => 'penatausahaan',
            'realisasi.' => 'penatausahaan',
            'rek-realisasi.' => 'penatausahaan',
            'bhp.' => 'penatausahaan',
            'bhm.' => 'penatausahaan',
            'api.bkp-' => 'penatausahaan',
            'api.ba.' => 'penatausahaan',
            'api.realisasi.' => 'penatausahaan',
            'api.bhp.' => 'penatausahaan',
            'api.bhm.' => 'penatausahaan',
            'sts' => 'sts',
            'api.sts' => 'sts',
            'arkas-tools' => 'arkas_tools',
            'referensi-kode' => 'referensi_kode',
            'sekolah-profile' => 'sekolah_profile',
            'kode-kegiatan' => 'kode_kegiatan',
            'rekening-belanja' => 'rekening_belanja',
            'kwitansi' => 'kwitansi',
            'api.kwitansi' => 'kwitansi',
            'tanda-terima' => 'tanda_terima',
            'api.tanda-terima' => 'tanda_terima',
            'bast' => 'bast',
            'api.bast' => 'bast',
            'surat-pesanan' => 'surat_pesanan',
            'api.surat-pesanan' => 'surat_pesanan',
            'dokumen' => 'dokumen',
            'api.dokumen' => 'dokumen',
            'sk-surat' => 'sk_surat',
            'laporan' => 'laporan',
            'api.spmth' => 'laporan',
            'api.sptj' => 'laporan',
            'api.sp2b' => 'laporan',
            'api.lph' => 'laporan',
            'integrasi' => 'path_arkas',
            'backup' => 'backup',
            'network-settings' => 'network_settings',
            'system-update' => 'system_update',
            'user-management' => 'user_management',
            'management-role' => 'user_management',
        ];

        foreach ($prefixMap as $prefix => $module) {
            if ($normalizedName === rtrim($prefix, '.') || str_starts_with($normalizedName, rtrim($prefix, '.').'.') || str_starts_with($normalizedName, $prefix)) {
                return [
                    'module' => $module,
                    'level' => $isMutation ? self::LEVEL_WRITE : self::LEVEL_READ,
                ];
            }
        }

        return null;
    }

    public static function stripVariantPrefix(string $routeName): string
    {
        foreach (['kinerja-silpa-', 'kinerja-', 'silpa-'] as $prefix) {
            if (Str::startsWith($routeName, $prefix)) {
                return substr($routeName, strlen($prefix));
            }
        }

        return $routeName;
    }
}
