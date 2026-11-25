import type {
    SpjCoverConfig,
    SpjCoverLayoutCategory,
    SpjCoverLayoutKey,
    SpjCoverPaletteKey,
    SpjManifest,
} from '../../types';

export interface CoverPaletteSpec {
    key: SpjCoverPaletteKey;
    label: string;
    primary: string;
    secondary: string;
    accent: string;
    surfaceTint: string;
    darkText: string;
    mutedText: string;
    onPrimary: string;
}

export const COVER_PALETTES: Record<Exclude<SpjCoverPaletteKey, 'custom'>, CoverPaletteSpec> = {
    navy_gold: {
        key: 'navy_gold',
        label: 'Navy Emas',
        primary: '#152A4A',
        secondary: '#1F3F6E',
        accent: '#D99B26',
        surfaceTint: '#F5F7FB',
        darkText: '#0F1C33',
        mutedText: '#4F5F78',
        onPrimary: '#FFFFFF',
    },
    royal_bosp: {
        key: 'royal_bosp',
        label: 'Biru BOSP Resmi',
        primary: '#0A3D79',
        secondary: '#1565C0',
        accent: '#F59E0B',
        surfaceTint: '#F2F7FD',
        darkText: '#0A2540',
        mutedText: '#476282',
        onPrimary: '#FFFFFF',
    },
    emerald: {
        key: 'emerald',
        label: 'Emerald Nusantara',
        primary: '#0F4C3A',
        secondary: '#176B52',
        accent: '#34D399',
        surfaceTint: '#F2FAF7',
        darkText: '#0D2920',
        mutedText: '#47655B',
        onPrimary: '#FFFFFF',
    },
    indigo_sikas: {
        key: 'indigo_sikas',
        label: 'Indigo SIKAS',
        primary: '#23203A',
        secondary: '#4338CA',
        accent: '#B7E84A',
        surfaceTint: '#F6F6FC',
        darkText: '#1A182E',
        mutedText: '#5A5875',
        onPrimary: '#FFFFFF',
    },
    teal_modern: {
        key: 'teal_modern',
        label: 'Teal Modern',
        primary: '#0E4D5C',
        secondary: '#0E7490',
        accent: '#38BDF8',
        surfaceTint: '#F0F9FC',
        darkText: '#0B2F3A',
        mutedText: '#4A6873',
        onPrimary: '#FFFFFF',
    },
    burgundy: {
        key: 'burgundy',
        label: 'Burgundy Klasik',
        primary: '#5B1A2B',
        secondary: '#881337',
        accent: '#EAB308',
        surfaceTint: '#FDF5F7',
        darkText: '#33101A',
        mutedText: '#6F4955',
        onPrimary: '#FFFFFF',
    },
    slate_mono: {
        key: 'slate_mono',
        label: 'Slate Hemat Tinta',
        primary: '#1E293B',
        secondary: '#334155',
        accent: '#64748B',
        surfaceTint: '#F8FAFC',
        darkText: '#0F172A',
        mutedText: '#475569',
        onPrimary: '#FFFFFF',
    },
};

export const COVER_PALETTE_LIST: CoverPaletteSpec[] = Object.values(COVER_PALETTES);

export interface CoverLayoutSpec {
    key: SpjCoverLayoutKey;
    label: string;
    description: string;
    category: SpjCoverLayoutCategory;
    isNew?: boolean;
}

export const COVER_LAYOUT_LIST: CoverLayoutSpec[] = [
    {
        key: 'bosp_wave',
        label: 'Gelombang BOSP Resmi',
        description: 'Kop resmi berlogo BOSP, foto sekolah menyatu kurva gelombang berlapis & kartu identitas.',
        category: 'resmi',
        isNew: true,
    },
    {
        key: 'split_magazine',
        label: 'Split Magazine Arsitektural',
        description: 'Gaya majalah modern asimetris dengan jendela foto lengkung & metrik tegas.',
        category: 'eksekutif',
        isNew: true,
    },
    {
        key: 'aurora_glass',
        label: 'Aurora Glassmorphism',
        description: 'Gradasi aurora lembut, kartu frosted-glass berlapis & panorama sekolah mengambang.',
        category: 'eksekutif',
        isNew: true,
    },
    {
        key: 'nusantara_heritage',
        label: 'Nusantara Heritage Modern',
        description: 'Pita ornamen Batik Kawung/Geometris elegan, medali judul & bingkai kubah modern.',
        category: 'resmi',
        isNew: true,
    },
    {
        key: 'swiss_ribbon',
        label: 'Swiss Diagonal Ribbon',
        description: 'Tipografi presisi Swiss Grid dengan tahun artistik & pita diagonal tajam.',
        category: 'eksekutif',
        isNew: true,
    },
    {
        key: 'editorial',
        label: 'Editorial Modern',
        description: 'Strip vertikal tegas ala annual report modern & tipografi asimetris.',
        category: 'eksekutif',
    },
    {
        key: 'instansi_elegan',
        label: 'Instansi Elegan',
        description: 'Bingkai double-hairline formal, logo simetris & pita periode klasik-modern.',
        category: 'resmi',
    },
    {
        key: 'geometris',
        label: 'Geometris Dinamis',
        description: 'Komposisi lapisan poligon SVG tajam & dot-grid bersih.',
        category: 'eksekutif',
    },
    {
        key: 'neo_bento',
        label: 'Neo-Bento Eksekutif',
        description: 'Kartu ringkasan Pagu, Realisasi & % Serapan langsung di sampul.',
        category: 'eksekutif',
    },
    {
        key: 'photo_hero',
        label: 'Photo Hero Sekolah',
        description: 'Banner foto sekolah penuh di atas dengan gradient overlay modern & panel bawah.',
        category: 'resmi',
    },
];

export function resolveCoverPalette(config: SpjCoverConfig): CoverPaletteSpec {
    if (config.palette === 'custom') {
        const primary = isValidHex(config.custom_primary) ? config.custom_primary : '#152A4A';
        const accent = isValidHex(config.custom_accent) ? config.custom_accent : '#D99B26';

        return {
            key: 'custom',
            label: 'Warna Kustom',
            primary,
            secondary: primary,
            accent,
            surfaceTint: '#F8FAFC',
            darkText: '#0F172A',
            mutedText: '#475569',
            onPrimary: '#FFFFFF',
        };
    }

    return COVER_PALETTES[config.palette] ?? COVER_PALETTES.navy_gold;
}

export function resolveSchoolPhotoUri(manifest: SpjManifest, config: SpjCoverConfig): string | null {
    return manifest.sekolah.foto_sekolah_data_uri || config.photo_data_uri || null;
}

function isValidHex(val: string): boolean {
    return /^#[0-9a-fA-F]{6}$/.test((val || '').trim());
}

export function createDefaultCoverConfig(manifest: SpjManifest): SpjCoverConfig {
    const kab = manifest.sekolah.kabupaten_kota?.trim();
    const instansiAtas = kab
        ? `PEMERINTAH ${kab.toUpperCase()}\nDINAS PENDIDIKAN DAN KEBUDAYAAN`
        : 'DINAS PENDIDIKAN DAN KEBUDAYAAN';

    return {
        layout: 'editorial',
        palette: 'navy_gold',
        custom_primary: '#152A4A',
        custom_accent: '#D99B26',
        ink_saver: false,
        instansi_atas: instansiAtas,
        badge_dokumen: 'LAPORAN PERTANGGUNGJAWABAN (LPJ / SPJ)',
        judul_utama: `DANA ${manifest.meta.variant_label.toUpperCase()}`,
        subjudul_override: '',
        label_jilid: '',
        nama_sekolah_override: '',
        alamat_override: '',
        kontak_sekolah_override: '',
        show_logo_daerah: Boolean(manifest.sekolah.logo_daerah_data_uri),
        show_logo_sekolah: Boolean(manifest.sekolah.logo_sekolah_data_uri),
        show_logo_bosp: true,
        show_foto_sekolah: true,
        photo_focus: 'center',
        photo_blend: 'balanced',
        show_ringkasan_keuangan: true,
        show_qr_code: true,
        show_penanggung_jawab: true,
        show_geometric_pattern: true,
        photo_path: null,
        photo_data_uri: null,
        kepala_sekolah_override: '',
        nip_kepala_sekolah_override: '',
        bendahara_override: '',
        nip_bendahara_override: '',
    };
}

export function formatRupiah(amount: number): string {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0,
    }).format(Math.round(amount || 0));
}
