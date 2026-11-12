import type { CSSProperties } from 'react';

/**
 * Token visual bersama untuk semua komposisi Remotion SIKAS.
 *
 * Komposisi dirender di dalam <Player> (inline, bukan iframe), tetapi tetap
 * TIDAK boleh bergantung pada utility/class Tailwind halaman: font & warna
 * ditulis eksplisit lewat token di file ini agar hasil animasi konsisten
 * walau stylesheet landing berubah.
 */

/* ---------------------------------------------------------------- ink --- */
export const INK_DEEP = '#07060C';
export const INK = '#0B0A12';
export const INK_SOFT = '#15121F';

/* -------------------------------------------------------------- brand --- */
export const BRAND = '#7C5CFF';
export const BRAND_DEEP = '#5B3DF5';
export const BRAND_DARKER = '#4527C9';

/* --------------------------------------------------------------- gold --- */
export const GOLD = '#E8C87D';
export const GOLD_SOFT = '#F5DCA8';

/* --------------------------------------------------------------- text --- */
export const TEXT = 'rgba(245,243,255,.92)';
/** Teks sekunder — dinaikkan ke 60% agar tetap terbaca di ukuran render kecil. */
export const TEXT_MUTED = 'rgba(245,243,255,.60)';
export const TEXT_FAINT = 'rgba(245,243,255,.46)';

/* ---------------------------------------------------------- permukaan --- */
/** Hairline emas tipis untuk semua elemen kaca. */
export const HAIRLINE = 'rgba(232,200,125,0.22)';
/** Hairline sekunder untuk pemisah internal. */
export const HAIRLINE_SOFT = 'rgba(232,200,125,0.12)';
/** Latar kaca standar komposisi (dark-first). */
export const GLASS = 'rgba(255,255,255,0.05)';
/** Latar kaca sedikit lebih terang (header/chip). */
export const GLASS_STRONG = 'rgba(255,255,255,0.08)';

/* ---------------------------------------------------------------- font --- */
export const FONT_BODY = '"Plus Jakarta Sans", Figtree, ui-sans-serif, system-ui, sans-serif';
export const FONT_DISPLAY = 'Fraunces, Georgia, serif';

/* -------------------------------------------------------------- radius --- */
export const RADIUS = {
    card: 30,
    tile: 18,
    pill: 999,
} as const;

/* --------------------------------------------------------------- utils --- */
export const GRADIENT_VIOLET_GOLD = `linear-gradient(120deg, ${BRAND} 0%, ${BRAND_DEEP} 52%, ${GOLD} 100%)`;

/** Label kecil (eyebrow) di dalam panel komposisi. */
export const LABEL_STYLE: CSSProperties = {
    fontSize: 9.5,
    fontWeight: 600,
    letterSpacing: '0.2em',
    textTransform: 'uppercase',
    color: TEXT_MUTED,
};

/**
 * Permukaan kaca standar: border 1px hairline emas + background kaca tipis.
 * Tanpa blur (sesuai spec — Player tidak butuh filter mahal).
 */
export function glassSurface(radius: number = RADIUS.tile, background: string = GLASS): CSSProperties {
    return {
        borderRadius: radius,
        border: `1px solid ${HAIRLINE}`,
        background,
    };
}
