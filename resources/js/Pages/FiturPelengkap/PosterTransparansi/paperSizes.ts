import type { PosterPaperSize } from './types';

export type PosterPaperDensity = 'compact' | 'normal' | 'spacious';

export interface PosterPaperSpec {
    key: PosterPaperSize;
    label: string;
    dimensionsMm: string;
    desc: string;
    designWidth: number;
    designHeight: number;
    exportWidth: number;
    exportHeight: number;
    density: PosterPaperDensity;
}

export const POSTER_PAPER_SIZES: Record<PosterPaperSize, PosterPaperSpec> = {
    a4: {
        key: 'a4',
        label: 'A4',
        dimensionsMm: '210 × 297 mm',
        desc: 'Standar kantor',
        designWidth: 860,
        designHeight: 1216,
        exportWidth: 2480,
        exportHeight: 3508,
        density: 'normal',
    },
    a3: {
        key: 'a3',
        label: 'A3',
        dimensionsMm: '297 × 420 mm',
        desc: 'Poster papan besar',
        designWidth: 860,
        designHeight: 1216,
        exportWidth: 3508,
        exportHeight: 4961,
        density: 'normal',
    },
    f4: {
        key: 'f4',
        label: 'F4',
        dimensionsMm: '215 × 330 mm',
        desc: 'Folio Indonesia',
        designWidth: 812,
        designHeight: 1246,
        exportWidth: 2539,
        exportHeight: 3898,
        density: 'spacious',
    },
    legal: {
        key: 'legal',
        label: 'Legal',
        dimensionsMm: '215,9 × 355,6 mm',
        desc: 'Kertas panjang',
        designWidth: 794,
        designHeight: 1308,
        exportWidth: 2550,
        exportHeight: 4200,
        density: 'spacious',
    },
    letter: {
        key: 'letter',
        label: 'Letter',
        dimensionsMm: '215,9 × 279,4 mm',
        desc: 'Standar US',
        designWidth: 920,
        designHeight: 1191,
        exportWidth: 2550,
        exportHeight: 3300,
        density: 'compact',
    },
};

export const POSTER_PAPER_SIZE_LIST: PosterPaperSpec[] = [
    POSTER_PAPER_SIZES.a4,
    POSTER_PAPER_SIZES.a3,
    POSTER_PAPER_SIZES.f4,
    POSTER_PAPER_SIZES.legal,
    POSTER_PAPER_SIZES.letter,
];
