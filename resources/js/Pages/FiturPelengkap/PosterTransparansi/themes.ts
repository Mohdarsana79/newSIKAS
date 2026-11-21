import type { PosterThemeKey } from './types';

export interface PosterTheme {
    key: PosterThemeKey;
    name: string;
    subtitle: string;
    previewSwatches: [string, string, string];
    headerBg: string;
    headerAccentGlowA: string;
    headerAccentGlowB: string;
    headerBadgeBg: string;
    headerBadgeText: string;
    accentColor: string;
    secondaryAccent: string;
    pageBg: string;
    cardBorder: string;
    progressTrack: string;
    progressFill: string;
    barColor: string;
    chartPalette: Record<'violet' | 'sky' | 'amber' | 'mint' | 'slate', string>;
    noticeBg: string;
    noticeBorder: string;
    noticeText: string;
}

export const POSTER_THEMES: Record<PosterThemeKey, PosterTheme> = {
    neobento: {
        key: 'neobento',
        name: 'Neo-Bento SIKAS',
        subtitle: 'Modern gelap, lime & violet',
        previewSwatches: ['#15131F', '#A3E635', '#7C3AED'],
        headerBg: '#15131F',
        headerAccentGlowA: 'rgba(124, 58, 237, 0.38)',
        headerAccentGlowB: 'rgba(163, 230, 53, 0.25)',
        headerBadgeBg: '#A3E635',
        headerBadgeText: '#0F172A',
        accentColor: '#6D28D9',
        secondaryAccent: '#84CC16',
        pageBg: '#F6F7FB',
        cardBorder: '#E5E7EB',
        progressTrack: '#E9E7F7',
        progressFill: 'linear-gradient(90deg, #7C3AED 0%, #84CC16 100%)',
        barColor: '#7C3AED',
        chartPalette: {
            violet: '#7C3AED',
            sky: '#0284C7',
            amber: '#D97706',
            mint: '#059669',
            slate: '#64748B',
        },
        noticeBg: '#F3F0FF',
        noticeBorder: '#DDD6FE',
        noticeText: '#4C1D95',
    },
    resmi: {
        key: 'resmi',
        name: 'Resmi Biru-Emas',
        subtitle: 'Formal papan pengumuman dinas',
        previewSwatches: ['#0F2A5F', '#D97706', '#2563EB'],
        headerBg: '#0F2A5F',
        headerAccentGlowA: 'rgba(37, 99, 235, 0.42)',
        headerAccentGlowB: 'rgba(245, 158, 11, 0.28)',
        headerBadgeBg: '#F59E0B',
        headerBadgeText: '#0F172A',
        accentColor: '#1D4ED8',
        secondaryAccent: '#D97706',
        pageBg: '#F4F7FC',
        cardBorder: '#DCE5F2',
        progressTrack: '#DBEAFE',
        progressFill: 'linear-gradient(90deg, #1E40AF 0%, #F59E0B 100%)',
        barColor: '#1D4ED8',
        chartPalette: {
            violet: '#1D4ED8',
            sky: '#0284C7',
            amber: '#D97706',
            mint: '#0D9488',
            slate: '#64748B',
        },
        noticeBg: '#EFF6FF',
        noticeBorder: '#BFDBFE',
        noticeText: '#1E3A8A',
    },
    emerald: {
        key: 'emerald',
        name: 'Hijau Zamrud Sekolah',
        subtitle: 'Segar, bersih & ramah komite',
        previewSwatches: ['#064E3B', '#10B981', '#F59E0B'],
        headerBg: '#064E3B',
        headerAccentGlowA: 'rgba(16, 185, 129, 0.35)',
        headerAccentGlowB: 'rgba(250, 204, 21, 0.24)',
        headerBadgeBg: '#FACC15',
        headerBadgeText: '#064E3B',
        accentColor: '#047857',
        secondaryAccent: '#D97706',
        pageBg: '#F2FAF6',
        cardBorder: '#D1EAD9',
        progressTrack: '#D1FAE5',
        progressFill: 'linear-gradient(90deg, #059669 0%, #F59E0B 100%)',
        barColor: '#059669',
        chartPalette: {
            violet: '#059669',
            sky: '#0284C7',
            amber: '#D97706',
            mint: '#14B8A6',
            slate: '#64748B',
        },
        noticeBg: '#ECFDF5',
        noticeBorder: '#A7F3D0',
        noticeText: '#065F46',
    },
};

export const POSTER_THEME_LIST: PosterTheme[] = [
    POSTER_THEMES.neobento,
    POSTER_THEMES.resmi,
    POSTER_THEMES.emerald,
];
