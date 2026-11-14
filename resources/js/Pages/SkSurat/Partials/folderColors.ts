import type { CSSProperties } from 'react';

export interface PresetFolderColor {
    name: string;
    value: string;
    hex: string;
    bg: string;
    text: string;
    border: string;
    glow: string;
}

export interface FolderTheme {
    isCustom: boolean;
    hex: string;
    bg: string;
    text: string;
    border: string;
    glow: string;
    tileStyle?: CSSProperties;
    cardStyle?: CSSProperties;
}

export const PRESET_FOLDER_COLORS: readonly PresetFolderColor[] = [
    {
        name: 'Indigo',
        value: 'indigo',
        hex: '#5B3DF5',
        bg: 'bg-pastel-lavender',
        text: 'text-brand-600 dark:text-brand-300',
        border: 'border-brand-500/15 dark:border-brand-400/20',
        glow: 'hover:border-brand-400/60 dark:hover:border-brand-300/40',
    },
    {
        name: 'Emerald',
        value: 'emerald',
        hex: '#10B981',
        bg: 'bg-pastel-mint',
        text: 'text-emerald-600 dark:text-emerald-300',
        border: 'border-mint/25 dark:border-mint/20',
        glow: 'hover:border-emerald-400/60 dark:hover:border-emerald-300/40',
    },
    {
        name: 'Amber',
        value: 'amber',
        hex: '#D97706',
        bg: 'bg-pastel-amber',
        text: 'text-amber-600 dark:text-amber-300',
        border: 'border-amber-300/50 dark:border-amber-400/20',
        glow: 'hover:border-amber-400/60 dark:hover:border-amber-300/40',
    },
    {
        name: 'Rose',
        value: 'rose',
        hex: '#E11D48',
        bg: 'bg-pastel-rose',
        text: 'text-rose-600 dark:text-rose-300',
        border: 'border-rose-200 dark:border-rose-400/20',
        glow: 'hover:border-rose-400/60 dark:hover:border-rose-300/40',
    },
    {
        name: 'Sky',
        value: 'sky',
        hex: '#0284C7',
        bg: 'bg-pastel-sky',
        text: 'text-sky dark:text-sky',
        border: 'border-sky/20 dark:border-sky/20',
        glow: 'hover:border-sky/50 dark:hover:border-sky/40',
    },
    {
        name: 'Purple',
        value: 'purple',
        hex: '#A38CFF',
        bg: 'bg-pastel-lavender',
        text: 'text-brand-600 dark:text-brand-300',
        border: 'border-brand-500/15 dark:border-brand-400/20',
        glow: 'hover:border-brand-400/60 dark:hover:border-brand-300/40',
    },
];

const PRESET_MAP: Record<string, PresetFolderColor> = Object.fromEntries(
    PRESET_FOLDER_COLORS.map((preset) => [preset.value, preset])
);

/** Normalize 3- or 6-digit hex color input into lowercase #rrggbb, or null when invalid. */
export function normalizeHexColor(value?: string | null): string | null {
    if (!value) return null;
    const trimmed = value.trim();
    const withHash = trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
    const shortMatch = /^#([0-9a-fA-F]{3})$/.exec(withHash);
    if (shortMatch) {
        const [r, g, b] = shortMatch[1].split('');
        return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
    }
    if (/^#[0-9a-fA-F]{6}$/.test(withHash)) {
        return withHash.toLowerCase();
    }
    return null;
}

function hexToRgba(hex: string, alpha: number): string {
    const clean = hex.replace('#', '');
    const r = parseInt(clean.slice(0, 2), 16);
    const g = parseInt(clean.slice(2, 4), 16);
    const b = parseInt(clean.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Resolve preset token or custom hex string into Neo-Bento classes and optional inline styles. */
export function resolveFolderTheme(warna?: string | null): FolderTheme {
    const key = (warna || 'indigo').trim();
    const preset = PRESET_MAP[key];
    if (preset) {
        return {
            isCustom: false,
            hex: preset.hex,
            bg: preset.bg,
            text: preset.text,
            border: preset.border,
            glow: preset.glow,
        };
    }

    const customHex = normalizeHexColor(key);
    if (customHex) {
        return {
            isCustom: true,
            hex: customHex,
            bg: '',
            text: '',
            border: 'border-[color:var(--folder-border)]',
            glow: 'hover:border-[color:var(--folder-glow)]',
            tileStyle: {
                backgroundColor: hexToRgba(customHex, 0.15),
                color: customHex,
                borderColor: hexToRgba(customHex, 0.32),
            },
            cardStyle: {
                '--folder-border': hexToRgba(customHex, 0.28),
                '--folder-glow': hexToRgba(customHex, 0.55),
            } as CSSProperties,
        };
    }

    const fallback = PRESET_MAP.indigo;
    return {
        isCustom: false,
        hex: fallback.hex,
        bg: fallback.bg,
        text: fallback.text,
        border: fallback.border,
        glow: fallback.glow,
    };
}
