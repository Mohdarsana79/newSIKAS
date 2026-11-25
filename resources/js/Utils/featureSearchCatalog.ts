import type { IconTileTone } from '@/Components/ui/IconTile';
import type { PermissionMatrixData, User } from '@/types';

export const OPEN_ARKAS_PATH_MODAL_EVENT = 'sikas:open-arkas-path-modal';

export type FeatureSearchCategory =
    | 'Menu Utama'
    | 'Varian BOSP'
    | 'Data Master'
    | 'Fitur Pelengkap'
    | 'Sistem & Integrasi'
    | 'Akun & Aksi Cepat';

export type FeatureIconKey =
    | 'dashboard'
    | 'penganggaran'
    | 'penatausahaan'
    | 'rekapitulasi'
    | 'sts'
    | 'arkas'
    | 'referensi'
    | 'sekolah'
    | 'kegiatan'
    | 'rekening'
    | 'kwitansi'
    | 'tanda_terima'
    | 'bast'
    | 'surat_pesanan'
    | 'dokumen'
    | 'sk_surat'
    | 'laporan'
    | 'poster_transparansi'
    | 'cetak_spj'
    | 'backup'
    | 'network'
    | 'roles'
    | 'activity_logs'
    | 'update'
    | 'path_arkas'
    | 'profile'
    | 'copilot';

export type FeatureSearchAction =
    | { type: 'route'; routeName: string }
    | { type: 'copilot' }
    | { type: 'arkas-path-modal' };

export interface FeatureSearchItem {
    id: string;
    title: string;
    description: string;
    category: FeatureSearchCategory;
    iconKey: FeatureIconKey;
    tone: IconTileTone;
    keywords: string[];
    moduleKey?: string;
    minLevel?: 'read' | 'write';
    variantBadge?: string;
    isVariantEntry?: boolean;
    action: FeatureSearchAction;
}

const SYSTEM_ONLY_MODULES = [
    'path_arkas',
    'backup',
    'network_settings',
    'system_update',
    'user_management',
];

/**
 * Mengecek izin akses modul RBAC secara konsisten dengan Sidebar.tsx.
 */
export function canAccessFeatureModule(
    user: Partial<User> | undefined,
    authPermissions: Partial<PermissionMatrixData> | undefined,
    modKey: string,
    minLevel: 'read' | 'write' = 'read',
): boolean {
    const level = authPermissions?.modules?.[modKey];
    if (level) {
        if (minLevel === 'write') return level === 'write';
        return level === 'read' || level === 'write';
    }

    const isKepalaSekolah = Boolean(user?.is_kepala_sekolah || user?.role === 'kepala_sekolah');
    if (isKepalaSekolah) {
        return !SYSTEM_ONLY_MODULES.includes(modKey) && minLevel === 'read';
    }

    return true;
}

interface VariantDef {
    key: 'kinerja' | 'silpa' | 'kinerja_silpa';
    prefix: 'kinerja-' | 'silpa-' | 'kinerja-silpa-';
    badge: string;
    keywords: string[];
}

const NON_REGULER_VARIANTS: VariantDef[] = [
    {
        key: 'kinerja',
        prefix: 'kinerja-',
        badge: 'BOSP Kinerja',
        keywords: ['kinerja', 'bosp kinerja', 'bos kinerja'],
    },
    {
        key: 'silpa',
        prefix: 'silpa-',
        badge: 'SiLPA BOSP Reguler',
        keywords: ['silpa', 'silpa reguler', 'silpa bosp reguler', 'sisa dana', 'carryover'],
    },
    {
        key: 'kinerja_silpa',
        prefix: 'kinerja-silpa-',
        badge: 'SiLPA BOSP Kinerja',
        keywords: ['silpa kinerja', 'kinerja silpa', 'silpa bosp kinerja', 'silpa', 'kinerja'],
    },
];

interface VariantModuleTemplate {
    idPrefix: string;
    baseTitle: string;
    descriptionPrefix: string;
    routeSuffix: string;
    iconKey: FeatureIconKey;
    tone: IconTileTone;
    moduleKey: string;
    keywords: string[];
}

const VARIANT_MODULE_TEMPLATES: VariantModuleTemplate[] = [
    {
        idPrefix: 'penganggaran',
        baseTitle: 'Penganggaran & RKAS',
        descriptionPrefix: 'Kelola penganggaran tahunan, RKAS awal, dan RKAS perubahan',
        routeSuffix: 'penganggaran.index',
        iconKey: 'penganggaran',
        tone: 'violet',
        moduleKey: 'penganggaran',
        keywords: ['penganggaran', 'rkas', 'rka', 'anggaran', 'perubahan', 'pagu'],
    },
    {
        idPrefix: 'penatausahaan',
        baseTitle: 'Penatausahaan & BKU',
        descriptionPrefix: 'Kelola penerimaan dana, Buku Kas Umum (BKU), pajak, dan pembukuan',
        routeSuffix: 'penatausahaan.index',
        iconKey: 'penatausahaan',
        tone: 'mint',
        moduleKey: 'penatausahaan',
        keywords: ['penatausahaan', 'bku', 'kas umum', 'penerimaan', 'pajak', 'bank', 'tunai'],
    },
    {
        idPrefix: 'kwitansi',
        baseTitle: 'Kwitansi',
        descriptionPrefix: 'Buat, preview, dan cetak dokumen kwitansi belanja',
        routeSuffix: 'kwitansi.index',
        iconKey: 'kwitansi',
        tone: 'lime',
        moduleKey: 'kwitansi',
        keywords: ['kwitansi', 'kuitansi', 'spj', 'bukti bayar', 'pdf'],
    },
    {
        idPrefix: 'tanda-terima',
        baseTitle: 'Tanda Terima',
        descriptionPrefix: 'Kelola dan cetak bukti tanda terima honor atau barang',
        routeSuffix: 'tanda-terima.index',
        iconKey: 'tanda_terima',
        tone: 'sky',
        moduleKey: 'tanda_terima',
        keywords: ['tanda terima', 'spj', 'honor', 'penerima'],
    },
    {
        idPrefix: 'bast',
        baseTitle: 'BAST',
        descriptionPrefix: 'Kelola Berita Acara Serah Terima barang dan jasa',
        routeSuffix: 'bast.index',
        iconKey: 'bast',
        tone: 'peach',
        moduleKey: 'bast',
        keywords: ['bast', 'berita acara', 'serah terima', 'spj'],
    },
    {
        idPrefix: 'surat-pesanan',
        baseTitle: 'Surat Pesanan',
        descriptionPrefix: 'Buat dan cetak dokumen surat pesanan barang/jasa',
        routeSuffix: 'surat-pesanan.index',
        iconKey: 'surat_pesanan',
        tone: 'amber',
        moduleKey: 'surat_pesanan',
        keywords: ['surat pesanan', 'sp', 'pemesanan', 'belanja', 'spj'],
    },
    {
        idPrefix: 'dokumen',
        baseTitle: 'Dokumen BKU',
        descriptionPrefix: 'Arsip dokumen pendukung penatausahaan keuangan sekolah',
        routeSuffix: 'dokumen.index',
        iconKey: 'dokumen',
        tone: 'sky',
        moduleKey: 'dokumen',
        keywords: ['dokumen', 'arsip', 'berkas', 'lampiran', 'spj'],
    },
    {
        idPrefix: 'laporan',
        baseTitle: 'Laporan (SPTJ, SP2B, SPMTH, LPH)',
        descriptionPrefix: 'Buat dan cetak laporan pertanggungjawaban keuangan',
        routeSuffix: 'laporan.index',
        iconKey: 'laporan',
        tone: 'violet',
        moduleKey: 'laporan',
        keywords: ['laporan', 'sptj', 'sp2b', 'spmth', 'lph', 'pertanggungjawaban'],
    },
    {
        idPrefix: 'poster-transparansi',
        baseTitle: 'Poster Transparansi BOSP',
        descriptionPrefix: 'Buat, ekspor PNG HD, dan cetak poster infografis transparansi papan pengumuman',
        routeSuffix: 'poster-transparansi.index',
        iconKey: 'poster_transparansi',
        tone: 'lime',
        moduleKey: 'poster_transparansi',
        keywords: ['poster', 'infografis', 'transparansi', 'papan pengumuman', 'publikasi', 'cetak', 'png'],
    },
    {
        idPrefix: 'cetak-spj',
        baseTitle: 'Cetak SPJ Terpadu',
        descriptionPrefix: 'Susun bendel SPJ per tahap, desain cover LPJ modern, dan cetak/gabung seluruh dokumen',
        routeSuffix: 'cetak-spj.index',
        iconKey: 'cetak_spj',
        tone: 'mint',
        moduleKey: 'cetak_spj',
        keywords: ['cetak spj', 'lpj', 'cover spj', 'cover lpj', 'gabung pdf', 'jilid', 'pertahap', 'bendel'],
    },
];

const VARIANT_ITEMS: FeatureSearchItem[] = VARIANT_MODULE_TEMPLATES.flatMap((tpl) =>
    NON_REGULER_VARIANTS.map((variant) => ({
        id: `${tpl.idPrefix}-${variant.key}`,
        title: `${tpl.baseTitle} (${variant.badge})`,
        description: `${tpl.descriptionPrefix} untuk ${variant.badge}.`,
        category: 'Varian BOSP' as const,
        iconKey: tpl.iconKey,
        tone: tpl.tone,
        keywords: [...tpl.keywords, ...variant.keywords],
        moduleKey: tpl.moduleKey,
        minLevel: 'read' as const,
        variantBadge: variant.badge,
        isVariantEntry: true,
        action: {
            type: 'route' as const,
            routeName: `${variant.prefix}${tpl.routeSuffix}`,
        },
    })),
);

/**
 * Katalog seluruh fitur aplikasi newSIKAS untuk Command Palette Navbar.
 * Catatan: pintasan rahasia lisensi sengaja tidak dimasukkan ke pencarian ini.
 */
export const FEATURE_SEARCH_ITEMS: FeatureSearchItem[] = [
    // Menu Utama
    {
        id: 'dashboard',
        title: 'Dashboard',
        description: 'Ringkasan pagu, realisasi bulanan, tren tahunan, dan kalender keuangan.',
        category: 'Menu Utama',
        iconKey: 'dashboard',
        tone: 'lime',
        keywords: ['beranda', 'home', 'ringkasan', 'kpi', 'grafik', 'pagu', 'realisasi', 'kalender'],
        moduleKey: 'dashboard',
        action: { type: 'route', routeName: 'dashboard' },
    },
    {
        id: 'penganggaran',
        title: 'Penganggaran & RKAS',
        description: 'Kelola data penganggaran tahunan, RKAS awal, dan RKAS perubahan BOSP.',
        category: 'Menu Utama',
        iconKey: 'penganggaran',
        tone: 'violet',
        keywords: ['rkas', 'rka', 'anggaran', 'perubahan', 'pagu', 'bosp reguler', 'telaah', 'pengesahan'],
        moduleKey: 'penganggaran',
        action: { type: 'route', routeName: 'penganggaran.index' },
    },
    {
        id: 'penatausahaan',
        title: 'Penatausahaan & BKU',
        description: 'Penerimaan dana, Buku Kas Umum (BKU), buku bank, tunai, pajak, dan audit BKU.',
        category: 'Menu Utama',
        iconKey: 'penatausahaan',
        tone: 'mint',
        keywords: ['bku', 'kas umum', 'penerimaan dana', 'pajak', 'buku bank', 'tunai', 'rob', 'bhp', 'bhm', 'audit', 'berita acara'],
        moduleKey: 'penatausahaan',
        action: { type: 'route', routeName: 'penatausahaan.index' },
    },
    {
        id: 'rekapitulasi',
        title: 'Rekapitulasi Penatausahaan',
        description: 'Rekapitulasi realisasi belanja, BKP bank, tunai, pajak, ROB, dan register penutupan kas.',
        category: 'Menu Utama',
        iconKey: 'rekapitulasi',
        tone: 'sky',
        keywords: ['rekap', 'rekapitulasi', 'realisasi', 'bkp', 'register penutupan kas', 'cetak bku'],
        moduleKey: 'penatausahaan',
        action: { type: 'route', routeName: 'penatausahaan.rekapitulasi' },
    },
    {
        id: 'sts',
        title: 'Status STS',
        description: 'Pencatatan, pembayaran, dan pelaporan Surat Tanda Setoran (STS).',
        category: 'Menu Utama',
        iconKey: 'sts',
        tone: 'amber',
        keywords: ['sts', 'surat tanda setoran', 'setoran', 'pengembalian dana'],
        moduleKey: 'sts',
        action: { type: 'route', routeName: 'sts.index' },
    },
    {
        id: 'arkas-tools',
        title: 'Arkas Tools',
        description: 'Pencarian katalog barang/rekening ARKAS, sinkronisasi referensi, dan diagnostik.',
        category: 'Menu Utama',
        iconKey: 'arkas',
        tone: 'lime',
        keywords: ['arkas', 'sinkronisasi', 'sync', 'katalog barang', 'diagnostik', 'tarik data'],
        moduleKey: 'arkas_tools',
        action: { type: 'route', routeName: 'arkas-tools.index' },
    },
    {
        id: 'referensi-kode',
        title: 'Referensi Kode',
        description: 'Daftar referensi kode kegiatan dan rekening belanja standar.',
        category: 'Menu Utama',
        iconKey: 'referensi',
        tone: 'sky',
        keywords: ['referensi', 'kode', 'kegiatan', 'rekening', 'katalog'],
        moduleKey: 'referensi_kode',
        action: { type: 'route', routeName: 'referensi-kode.index' },
    },

    // Data Master
    {
        id: 'sekolah-profile',
        title: 'Profil Sekolah & Kop Surat',
        description: 'Identitas sekolah, data kepala sekolah & bendahara, serta builder kop surat.',
        category: 'Data Master',
        iconKey: 'sekolah',
        tone: 'violet',
        keywords: ['sekolah', 'kop surat', 'logo', 'kepala sekolah', 'bendahara', 'identitas', 'builder'],
        moduleKey: 'sekolah_profile',
        action: { type: 'route', routeName: 'sekolah-profile.index' },
    },
    {
        id: 'kode-kegiatan',
        title: 'Kode Kegiatan',
        description: 'Master data program, sub program, dan kode kegiatan beserta impor/ekspor Excel.',
        category: 'Data Master',
        iconKey: 'kegiatan',
        tone: 'mint',
        keywords: ['master', 'kegiatan', 'program', 'snp', 'excel', 'impor'],
        moduleKey: 'kode_kegiatan',
        action: { type: 'route', routeName: 'kode-kegiatan.index' },
    },
    {
        id: 'rekening-belanja',
        title: 'Rekening Belanja',
        description: 'Master data kode rekening belanja barang, jasa, dan modal beserta impor Excel.',
        category: 'Data Master',
        iconKey: 'rekening',
        tone: 'peach',
        keywords: ['master', 'rekening', 'akun belanja', 'kode rekening', 'excel', 'impor'],
        moduleKey: 'rekening_belanja',
        action: { type: 'route', routeName: 'rekening-belanja.index' },
    },
    {
        id: 'data-ptk',
        title: 'Data PTK (Guru & Tendik)',
        description: 'Master data Guru & Tenaga Kependidikan per tahun dari ARKAS maupun input manual untuk honor RKAS.',
        category: 'Data Master',
        iconKey: 'roles',
        tone: 'violet',
        keywords: ['master', 'ptk', 'guru', 'tendik', 'nuptk', 'honor', 'pendidik', 'kependidikan', 'arkas'],
        moduleKey: 'data_ptk',
        action: { type: 'route', routeName: 'data-ptk.index' },
    },

    // Fitur Pelengkap
    {
        id: 'kwitansi',
        title: 'Kwitansi',
        description: 'Generate otomatis, preview, dan cetak PDF kwitansi belanja (Format 1–4).',
        category: 'Fitur Pelengkap',
        iconKey: 'kwitansi',
        tone: 'lime',
        keywords: ['kwitansi', 'kuitansi', 'spj', 'bukti bayar', 'cetak pdf', 'format'],
        moduleKey: 'kwitansi',
        action: { type: 'route', routeName: 'kwitansi.index' },
    },
    {
        id: 'tanda-terima',
        title: 'Tanda Terima',
        description: 'Pembuatan, preview, dan cetak dokumen bukti tanda terima belanja/honor.',
        category: 'Fitur Pelengkap',
        iconKey: 'tanda_terima',
        tone: 'sky',
        keywords: ['tanda terima', 'spj', 'honor', 'bukti penerimaan'],
        moduleKey: 'tanda_terima',
        action: { type: 'route', routeName: 'tanda-terima.index' },
    },
    {
        id: 'bast',
        title: 'BAST',
        description: 'Berita Acara Serah Terima barang dan jasa beserta status kondisi.',
        category: 'Fitur Pelengkap',
        iconKey: 'bast',
        tone: 'peach',
        keywords: ['bast', 'berita acara', 'serah terima', 'spj', 'barang'],
        moduleKey: 'bast',
        action: { type: 'route', routeName: 'bast.index' },
    },
    {
        id: 'surat-pesanan',
        title: 'Surat Pesanan',
        description: 'Pembuatan dan cetak dokumen surat pesanan barang/jasa ke penyedia.',
        category: 'Fitur Pelengkap',
        iconKey: 'surat_pesanan',
        tone: 'amber',
        keywords: ['surat pesanan', 'sp', 'pesanan', 'toko', 'penyedia', 'spj'],
        moduleKey: 'surat_pesanan',
        action: { type: 'route', routeName: 'surat-pesanan.index' },
    },
    {
        id: 'dokumen',
        title: 'Dokumen',
        description: 'Arsip dan kelola dokumen pendukung transaksi keuangan sekolah.',
        category: 'Fitur Pelengkap',
        iconKey: 'dokumen',
        tone: 'sky',
        keywords: ['dokumen', 'arsip', 'berkas', 'lampiran', 'spj'],
        moduleKey: 'dokumen',
        action: { type: 'route', routeName: 'dokumen.index' },
    },
    {
        id: 'sk-surat',
        title: 'SK & Surat',
        description: 'Folder arsip, template Word/PDF, dan generator SK serta surat sekolah otomatis.',
        category: 'Fitur Pelengkap',
        iconKey: 'sk_surat',
        tone: 'violet',
        keywords: ['sk', 'surat', 'word', 'docx', 'template', 'generator', 'arsip surat'],
        moduleKey: 'sk_surat',
        action: { type: 'route', routeName: 'sk-surat.index' },
    },
    {
        id: 'laporan',
        title: 'Laporan (SPTJ, SP2B, SPMTH, LPH)',
        description: 'Buat dan cetak laporan pertanggungjawaban SPTJ, SP2B, SPMTH, dan LPH.',
        category: 'Fitur Pelengkap',
        iconKey: 'laporan',
        tone: 'violet',
        keywords: ['laporan', 'sptj', 'sp2b', 'spmth', 'lph', 'pertanggungjawaban', 'cetak'],
        moduleKey: 'laporan',
        action: { type: 'route', routeName: 'laporan.index' },
    },
    {
        id: 'poster-transparansi',
        title: 'Poster Transparansi BOSP',
        description: 'Studio infografis transparansi BOSP siap cetak A4/A3 & ekspor PNG HD untuk papan pengumuman.',
        category: 'Fitur Pelengkap',
        iconKey: 'poster_transparansi',
        tone: 'lime',
        keywords: ['poster', 'infografis', 'transparansi', 'papan pengumuman', 'publikasi', 'cetak', 'bosp', 'png'],
        moduleKey: 'poster_transparansi',
        action: { type: 'route', routeName: 'poster-transparansi.index' },
    },
    {
        id: 'cetak-spj',
        title: 'Cetak SPJ Terpadu',
        description: 'Rakit & cetak seluruh SPJ (Cover LPJ Modern, Daftar Isi, RKAS, BKU, Kwitansi, BAST, SP2B-LPH) per tahap atau tahunan.',
        category: 'Fitur Pelengkap',
        iconKey: 'cetak_spj',
        tone: 'mint',
        keywords: ['cetak spj', 'lpj', 'cover spj', 'cover lpj', 'gabung pdf', 'jilid', 'pertahap', 'bendel', 'rkas', 'bku'],
        moduleKey: 'cetak_spj',
        action: { type: 'route', routeName: 'cetak-spj.index' },
    },

    // Sistem & Integrasi
    {
        id: 'backup',
        title: 'Backup & Restore Database',
        description: 'Buat cadangan (.rsv), unduh, pulihkan (restore), dan reset database.',
        category: 'Sistem & Integrasi',
        iconKey: 'backup',
        tone: 'mint',
        keywords: ['backup', 'restore', 'reset database', 'cadangan', 'pulihkan', 'rsv', 'database'],
        moduleKey: 'backup',
        action: { type: 'route', routeName: 'backup.index' },
    },
    {
        id: 'network-settings',
        title: 'Pengaturan Jaringan',
        description: 'Akses LAN sekolah, izin Windows Firewall, dan konfigurasi domain publik.',
        category: 'Sistem & Integrasi',
        iconKey: 'network',
        tone: 'sky',
        keywords: ['jaringan', 'network', 'lan', 'ip', 'firewall', 'wifi', 'online', 'ngrok'],
        moduleKey: 'network_settings',
        action: { type: 'route', routeName: 'network-settings.index' },
    },
    {
        id: 'management-role',
        title: 'Management & Role',
        description: 'Kelola akun pengguna, role custom, dan matriks hak akses RBAC per modul.',
        category: 'Sistem & Integrasi',
        iconKey: 'roles',
        tone: 'violet',
        keywords: ['user', 'pengguna', 'role', 'hak akses', 'rbac', 'izin', 'permission', 'manajemen'],
        moduleKey: 'user_management',
        action: { type: 'route', routeName: 'management-role.index' },
    },
    {
        id: 'activity-logs',
        title: 'Log Aktivitas (Audit Trail)',
        description: 'Pantau riwayat aktivitas pengguna lintas modul & varian BOSP, ekspor CSV audit, dan retensi log.',
        category: 'Sistem & Integrasi',
        iconKey: 'activity_logs',
        tone: 'violet',
        keywords: ['audit trail', 'log aktivitas', 'riwayat', 'jejak', 'keamanan', 'aktivitas pengguna', 'history', 'log'],
        moduleKey: 'activity_logs',
        action: { type: 'route', routeName: 'activity-logs.index' },
    },
    {
        id: 'system-update',
        title: 'Pembaharuan Aplikasi',
        description: 'Periksa versi terbaru, lihat changelog, dan jalankan update aplikasi.',
        category: 'Sistem & Integrasi',
        iconKey: 'update',
        tone: 'lime',
        keywords: ['update', 'pembaharuan', 'versi', 'patch', 'upgrade', 'changelog'],
        moduleKey: 'system_update',
        action: { type: 'route', routeName: 'system-update.index' },
    },
    {
        id: 'path-arkas',
        title: 'Koneksi & Path Database ARKAS',
        description: 'Atur lokasi folder lokal arkas.db atau unggah file database ARKAS.',
        category: 'Sistem & Integrasi',
        iconKey: 'path_arkas',
        tone: 'amber',
        keywords: ['path arkas', 'arkas.db', 'upload arkas', 'koneksi arkas', 'integrasi', 'sqlite'],
        moduleKey: 'path_arkas',
        minLevel: 'write',
        action: { type: 'arkas-path-modal' },
    },

    // Akun & Aksi Cepat
    {
        id: 'profile',
        title: 'Pengaturan Profil & Akun',
        description: 'Kelola biodata, ubah kata sandi, kunci API AI DeepSeek, dan kode keamanan 2FA.',
        category: 'Akun & Aksi Cepat',
        iconKey: 'profile',
        tone: 'violet',
        keywords: ['profil', 'akun', 'biodata', 'password', 'kata sandi', 'deepseek', 'api key', 'ai', '2fa', 'kode keamanan', 'keamanan'],
        action: { type: 'route', routeName: 'profile.edit' },
    },
    {
        id: 'ai-copilot',
        title: 'SIKAS AI Copilot',
        description: 'Buka asisten AI untuk analisis RKAS/BKU, tanya regulasi, dan drafting transaksi.',
        category: 'Akun & Aksi Cepat',
        iconKey: 'copilot',
        tone: 'lime',
        keywords: ['ai', 'copilot', 'asisten', 'chat', 'tanya', 'deepseek', 'analisis'],
        action: { type: 'copilot' },
    },

    // Varian BOSP (muncul otomatis saat pencarian diketik)
    ...VARIANT_ITEMS,
];

export const CATEGORY_ORDER: FeatureSearchCategory[] = [
    'Menu Utama',
    'Data Master',
    'Fitur Pelengkap',
    'Varian BOSP',
    'Sistem & Integrasi',
    'Akun & Aksi Cepat',
];

export function getAuthorizedFeatures(
    user: Partial<User> | undefined,
    authPermissions: Partial<PermissionMatrixData> | undefined,
): FeatureSearchItem[] {
    return FEATURE_SEARCH_ITEMS.filter((item) => {
        if (!item.moduleKey) return true;
        return canAccessFeatureModule(user, authPermissions, item.moduleKey, item.minLevel ?? 'read');
    });
}

function scoreItemAgainstTokens(item: FeatureSearchItem, tokens: string[]): number {
    const titleLower = item.title.toLowerCase();
    const descLower = item.description.toLowerCase();
    const catLower = item.category.toLowerCase();
    const variantLower = (item.variantBadge || '').toLowerCase();
    const keywordsLower = item.keywords.map((k) => k.toLowerCase());

    let totalScore = 0;

    for (const token of tokens) {
        let tokenBest = 0;

        if (titleLower === token) {
            tokenBest = Math.max(tokenBest, 120);
        } else if (titleLower.startsWith(token)) {
            tokenBest = Math.max(tokenBest, 95);
        } else if (titleLower.includes(token)) {
            tokenBest = Math.max(tokenBest, 70);
        }

        for (const kw of keywordsLower) {
            if (kw === token) {
                tokenBest = Math.max(tokenBest, 65);
            } else if (kw.startsWith(token)) {
                tokenBest = Math.max(tokenBest, 50);
            } else if (kw.includes(token)) {
                tokenBest = Math.max(tokenBest, 40);
            }
        }

        if (variantLower && variantLower.includes(token)) {
            tokenBest = Math.max(tokenBest, 30);
        }

        if (catLower.includes(token)) {
            tokenBest = Math.max(tokenBest, 25);
        }

        if (descLower.includes(token)) {
            tokenBest = Math.max(tokenBest, 15);
        }

        // Semua token harus cocok agar pencarian multi-kata presisi
        if (tokenBest === 0) {
            return 0;
        }

        totalScore += tokenBest;
    }

    // Beri sedikit prioritas pada item non-varian bila skor setara
    if (!item.isVariantEntry) {
        totalScore += 5;
    }

    return totalScore;
}

export function searchFeatures(items: FeatureSearchItem[], rawQuery: string): FeatureSearchItem[] {
    const tokens = rawQuery
        .trim()
        .toLowerCase()
        .split(/\s+/)
        .filter(Boolean);

    if (tokens.length === 0) {
        return items.filter((item) => !item.isVariantEntry);
    }

    return items
        .map((item) => ({ item, score: scoreItemAgainstTokens(item, tokens) }))
        .filter((entry) => entry.score > 0)
        .sort((a, b) => b.score - a.score)
        .map((entry) => entry.item);
}

const RECENT_STORAGE_PREFIX = 'sikas:recent-feature-search:';
const MAX_RECENT_ITEMS = 5;

function getRecentStorageKey(userId?: number): string {
    return `${RECENT_STORAGE_PREFIX}${userId ?? 'guest'}`;
}

export function loadRecentFeatureIds(userId?: number): string[] {
    if (typeof window === 'undefined') return [];
    try {
        const raw = window.localStorage.getItem(getRecentStorageKey(userId));
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed.filter((v): v is string => typeof v === 'string').slice(0, MAX_RECENT_ITEMS);
    } catch {
        return [];
    }
}

export function recordRecentFeatureId(id: string, userId?: number): string[] {
    const existing = loadRecentFeatureIds(userId);
    const updated = [id, ...existing.filter((item) => item !== id)].slice(0, MAX_RECENT_ITEMS);
    if (typeof window !== 'undefined') {
        try {
            window.localStorage.setItem(getRecentStorageKey(userId), JSON.stringify(updated));
        } catch {
            // Abaikan bila storage diblokir browser
        }
    }
    return updated;
}

export function clearRecentFeatureIds(userId?: number): void {
    if (typeof window === 'undefined') return;
    try {
        window.localStorage.removeItem(getRecentStorageKey(userId));
    } catch {
        // Abaikan bila storage diblokir browser
    }
}
