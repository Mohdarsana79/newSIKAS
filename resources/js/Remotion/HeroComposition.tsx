import type { ReactElement } from 'react';
import { Easing, Sequence, interpolate, random, useCurrentFrame } from 'remotion';

import {
    BRAND,
    BRAND_DARKER,
    BRAND_DEEP,
    FONT_BODY,
    FONT_DISPLAY,
    GLASS,
    GOLD,
    GOLD_SOFT,
    HAIRLINE,
    INK,
    INK_DEEP,
    INK_SOFT,
    LABEL_STYLE,
    RADIUS,
    TEXT,
    TEXT_FAINT,
    TEXT_MUTED,
    glassSurface,
} from './theme';

/* ============================================================== config === */

export const HERO_ID = 'sikas-hero';

export const HERO_CONFIG = {
    durationInFrames: 300,
    fps: 30,
    width: 1200,
    height: 900,
} as const;

const DURATION = HERO_CONFIG.durationInFrames;

/** Kartu dashboard: 1000×780 di tengah kanvas 1200×900. */
const DASHBOARD_WIDTH = 1000;
const DASHBOARD_HEIGHT = 780;
const DASHBOARD_PADDING = 38;

/* ============================================================= helpers === */

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));

/** Sudut loop: 0 di frame 0 dan 2π lagi di frame 300 (loop mulus). */
const loopAngle = (frame: number): number => (frame / DURATION) * Math.PI * 2;

/* ================================================================ data === */

const KPI_TILES = [
    {
        label: 'Total Anggaran',
        value: 'Rp 1.248.500.000',
        caption: 'Pagu BOSP 2025',
        accent: BRAND,
        iconBars: [0.42, 0.68, 1],
    },
    {
        label: 'Realisasi',
        value: 'Rp 974.230.000',
        caption: '78% dari pagu',
        accent: GOLD,
        iconBars: [0.52, 0.78, 1],
    },
] as const;

const BARS = [
    { label: 'Jan', value: 0.42 },
    { label: 'Feb', value: 0.62 },
    { label: 'Mar', value: 0.36 },
    { label: 'Apr', value: 0.74 },
    { label: 'Mei', value: 0.52 },
    { label: 'Jun', value: 0.88 },
    { label: 'Jul', value: 0.66 },
    { label: 'Ags', value: 0.81 },
] as const;

const HIGHLIGHT_BAR = 5;

const LEDGER_ROWS = [
    { date: '12 Nov', code: 'BKU-0421', description: 'Honor guru honorer · tahap 2', amount: 'Rp 18.500.000' },
    { date: '11 Nov', code: 'BKU-0419', description: 'Belanja ATK & bahan habis pakai', amount: 'Rp 4.250.000' },
    { date: '10 Nov', code: 'BKU-0417', description: 'Pemeliharaan ringan ruang kelas', amount: 'Rp 7.900.000' },
] as const;

/* Donut: 281° dari 360° = 78% realisasi. */
const DONUT_RADIUS = 70;
const DONUT_STROKE = 13;
const DONUT_CIRCUMFERENCE = 2 * Math.PI * DONUT_RADIUS;
const DONUT_FRACTION = 281 / 360;

type Particle = {
    left: number;
    size: number;
    offset: number;
    rise: number;
    drift: number;
    color: string;
    alpha: number;
};

/** Partikel "Rp" deterministik — periodik penuh agar loop mulus. */
const PARTICLES: Particle[] = Array.from({ length: 14 }, (_unused, index) => {
    const seed = `sikas-hero-rupiah-${index}`;
    return {
        left: 4 + random(`${seed}-x`) * 92,
        size: 14 + random(`${seed}-size`) * 10,
        offset: random(`${seed}-offset`),
        rise: 34 + random(`${seed}-rise`) * 40,
        drift: (random(`${seed}-drift`) - 0.5) * 14,
        color: random(`${seed}-color`) > 0.5 ? GOLD : BRAND,
        alpha: 0.08 + random(`${seed}-alpha`) * 0.14,
    };
});

/* ========================================================= composition === */

export function HeroComposition(): ReactElement {
    const frame = useCurrentFrame();
    const theta = loopAngle(frame);

    // Napas & drift periodik penuh: frame 0 ≡ frame 300.
    const breath = 0.5 + 0.5 * Math.cos(theta);
    const drift = Math.sin(theta) * 5;

    const sweepProgress = interpolate(frame, [118, 202], [0, 1], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
        easing: Easing.inOut(Easing.cubic),
    });
    const sweepOpacity = interpolate(frame, [116, 130, 188, 204], [0, 0.8, 0.8, 0], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
    });

    return (
        <div
            style={{
                position: 'absolute',
                inset: 0,
                overflow: 'hidden',
                backgroundColor: INK_DEEP,
                color: TEXT,
                fontFamily: FONT_BODY,
                WebkitFontSmoothing: 'antialiased',
            }}
        >
            <AmbientBackdrop theta={theta} breath={breath} />

            <div
                style={{
                    position: 'absolute',
                    inset: 0,
                    perspective: '1600px',
                    perspectiveOrigin: '50% 45%',
                }}
            >
                <div
                    style={{
                        position: 'absolute',
                        left: '50%',
                        top: '50%',
                        width: DASHBOARD_WIDTH,
                        height: DASHBOARD_HEIGHT,
                        marginLeft: -DASHBOARD_WIDTH / 2,
                        marginTop: -DASHBOARD_HEIGHT / 2,
                        // Kartu selalu terpasang penuh — tidak ada fase kosong.
                        transform: `translateY(${drift}px) rotateX(10deg) rotateY(-12deg)`,
                        willChange: 'transform',
                    }}
                >
                    <DashboardFrame theta={theta} sweepProgress={sweepProgress} sweepOpacity={sweepOpacity} />
                    <ArkasChip theta={theta} />
                </div>
            </div>

            <Vignette />
        </div>
    );
}

export default HeroComposition;

/* ============================================================ backdrop === */

function AmbientBackdrop({ theta, breath }: { theta: number; breath: number }): ReactElement {
    return (
        <div style={{ position: 'absolute', inset: 0, backgroundColor: INK_DEEP }}>
            <div
                style={{
                    position: 'absolute',
                    inset: 0,
                    background: `radial-gradient(900px 700px at 20% 8%, rgba(124,92,255,0.34) 0%, rgba(124,92,255,0) 62%), radial-gradient(760px 600px at 84% 92%, rgba(232,200,125,0.16) 0%, rgba(232,200,125,0) 64%), radial-gradient(700px 520px at 50% 50%, rgba(91,61,245,0.20) 0%, rgba(91,61,245,0) 66%), linear-gradient(156deg, ${INK_DEEP} 0%, ${INK} 46%, ${INK_SOFT} 100%)`,
                }}
            />

            <div
                style={{
                    position: 'absolute',
                    width: 760,
                    height: 760,
                    left: -120 + Math.cos(theta) * 42,
                    top: -180 + Math.sin(theta) * 30,
                    borderRadius: '50%',
                    background: 'radial-gradient(closest-side, rgba(124,92,255,0.38), rgba(124,92,255,0) 72%)',
                    opacity: 0.55 + 0.25 * breath,
                }}
            />

            <div
                style={{
                    position: 'absolute',
                    width: 600,
                    height: 600,
                    right: -140 - Math.cos(theta) * 34,
                    bottom: -180 + Math.sin(theta) * 28,
                    borderRadius: '50%',
                    background: 'radial-gradient(closest-side, rgba(232,200,125,0.24), rgba(232,200,125,0) 72%)',
                    opacity: 0.36 + 0.2 * (1 - breath),
                }}
            />

            {/* Grid tipis. */}
            <div
                style={{
                    position: 'absolute',
                    inset: 0,
                    opacity: 0.6,
                    backgroundImage:
                        'linear-gradient(rgba(245,243,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(245,243,255,0.05) 1px, transparent 1px)',
                    backgroundSize: '64px 64px',
                    WebkitMaskImage:
                        'radial-gradient(circle at 50% 44%, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.3) 58%, rgba(0,0,0,0) 80%)',
                    maskImage:
                        'radial-gradient(circle at 50% 44%, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.3) 58%, rgba(0,0,0,0) 80%)',
                }}
            />

            {/* Grain halus. */}
            <div
                style={{
                    position: 'absolute',
                    inset: 0,
                    opacity: 0.4,
                    backgroundImage: 'radial-gradient(rgba(255,255,255,0.05) 0.6px, transparent 0.7px)',
                    backgroundSize: '3px 3px',
                }}
            />

            {/* Halo violet di belakang kartu. */}
            <div
                style={{
                    position: 'absolute',
                    left: '50%',
                    top: '50%',
                    width: 1080,
                    height: 700,
                    transform: 'translate(-50%,-50%)',
                    borderRadius: '50%',
                    background: 'radial-gradient(closest-side, rgba(124,92,255,0.26), rgba(124,92,255,0) 72%)',
                    opacity: 0.55 + 0.25 * breath,
                }}
            />
        </div>
    );
}

function Vignette(): ReactElement {
    return (
        <div
            style={{
                position: 'absolute',
                inset: 0,
                pointerEvents: 'none',
                background:
                    'radial-gradient(120% 100% at 50% 45%, rgba(7,6,12,0) 40%, rgba(7,6,12,0.55) 100%)',
            }}
        />
    );
}

/* =========================================================== dashboard === */

function DashboardFrame({
    theta,
    sweepProgress,
    sweepOpacity,
}: {
    theta: number;
    sweepProgress: number;
    sweepOpacity: number;
}): ReactElement {
    return (
        <div
            style={{
                position: 'relative',
                boxSizing: 'border-box',
                width: '100%',
                height: '100%',
                borderRadius: 32,
                border: `1px solid ${HAIRLINE}`,
                background:
                    'linear-gradient(150deg, rgba(42,36,64,0.96) 0%, rgba(24,20,38,0.97) 52%, rgba(15,13,24,0.98) 100%)',
                boxShadow:
                    '0 70px 150px -40px rgba(7,6,12,0.95), 0 0 120px -40px rgba(124,92,255,0.6), inset 0 1px 0 rgba(255,255,255,0.12)',
                overflow: 'hidden',
            }}
        >
            {/* Sheen atas. */}
            <div
                style={{
                    position: 'absolute',
                    inset: 0,
                    borderRadius: 'inherit',
                    background: 'linear-gradient(180deg, rgba(255,255,255,0.07), rgba(255,255,255,0) 22%)',
                    pointerEvents: 'none',
                }}
            />

            <RupiahParticles theta={theta} />

            <div
                style={{
                    position: 'relative',
                    zIndex: 1,
                    boxSizing: 'border-box',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 18,
                    height: '100%',
                    padding: DASHBOARD_PADDING,
                }}
            >
                <DashboardHeader theta={theta} />
                <KpiRow />
                <div style={{ display: 'flex', gap: 20, height: 256, flex: '0 0 auto' }}>
                    <BarChartPanel theta={theta} />
                    <DonutPanel theta={theta} />
                </div>
                <LedgerPanel theta={theta} />
            </div>

            {/* Light sweep diagonal, sekali per loop (frame 120–200). */}
            <Sequence from={112} durationInFrames={96} layout="none">
                <div
                    style={{
                        position: 'absolute',
                        zIndex: 2,
                        top: '-35%',
                        left: 0,
                        width: 300,
                        height: '170%',
                        transform: `translateX(${interpolate(sweepProgress, [0, 1], [-300, DASHBOARD_WIDTH + 100])}px) rotate(16deg)`,
                        background:
                            'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.2) 50%, rgba(255,255,255,0) 100%)',
                        opacity: sweepOpacity,
                        mixBlendMode: 'screen',
                        pointerEvents: 'none',
                    }}
                />
            </Sequence>
        </div>
    );
}

function DashboardHeader({ theta }: { theta: number }): ReactElement {
    // 5 siklus per loop → tetap sinkron di frame 0/300.
    const pulse = 0.5 + 0.5 * Math.sin(theta * 5);

    return (
        <div
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: 18,
                height: 54,
                flex: '0 0 auto',
            }}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                {['#F17A8B', GOLD, BRAND].map((color) => (
                    <span
                        key={color}
                        style={{
                            width: 12,
                            height: 12,
                            borderRadius: '50%',
                            background: color,
                            boxShadow: `0 0 14px ${color}66`,
                        }}
                    />
                ))}
            </div>

            <span style={{ width: 1, height: 24, background: 'rgba(245,243,255,0.16)' }} />

            <span
                style={{
                    fontSize: 24,
                    fontWeight: 700,
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    color: GOLD,
                    whiteSpace: 'nowrap',
                }}
            >
                RKAS 2025 · Reguler
            </span>

            {/* Chip SIKAS duduk dekat label agar sudut kanan-atas bebas untuk
                chip ARKAS Sinkron yang melayang di luar kartu. */}
            <span
                style={{
                    marginLeft: 6,
                    padding: '8px 18px',
                    borderRadius: RADIUS.pill,
                    border: '1px solid rgba(124,92,255,0.55)',
                    background: 'rgba(124,92,255,0.22)',
                    fontSize: 20,
                    fontWeight: 700,
                    letterSpacing: '0.18em',
                    color: '#E4DCFF',
                    textTransform: 'uppercase',
                    whiteSpace: 'nowrap',
                }}
            >
                SIKAS
            </span>

            <span
                style={{
                    marginLeft: 'auto',
                    width: 9,
                    height: 9,
                    borderRadius: '50%',
                    background: GOLD,
                    opacity: 0.4 + 0.6 * pulse,
                    boxShadow: `0 0 14px ${GOLD}`,
                }}
            />
        </div>
    );
}

function KpiRow(): ReactElement {
    return (
        <div style={{ display: 'flex', gap: 20, height: 148, flex: '0 0 auto' }}>
            {KPI_TILES.map((tile) => (
                <div
                    key={tile.label}
                    style={{
                        ...glassSurface(22, GLASS),
                        flex: 1,
                        minWidth: 0,
                        padding: '18px 22px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.07)',
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                        <span style={{ ...LABEL_STYLE, fontSize: 20, letterSpacing: '0.14em' }}>{tile.label}</span>
                        <KpiIcon accent={tile.accent} bars={tile.iconBars} />
                    </div>

                    <span
                        style={{
                            fontSize: 42,
                            fontWeight: 700,
                            letterSpacing: '-0.02em',
                            fontVariantNumeric: 'tabular-nums',
                            color: TEXT,
                            whiteSpace: 'nowrap',
                        }}
                    >
                        {tile.value}
                    </span>

                    <span style={{ fontSize: 18, letterSpacing: '0.01em', color: TEXT_MUTED }}>{tile.caption}</span>
                </div>
            ))}
        </div>
    );
}

function KpiIcon({ accent, bars }: { accent: string; bars: readonly number[] }): ReactElement {
    return (
        <span
            style={{
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'center',
                gap: 4,
                width: 48,
                height: 48,
                boxSizing: 'border-box',
                paddingBottom: 11,
                borderRadius: 14,
                border: `1px solid ${accent}55`,
                background: `${accent}1F`,
                flex: '0 0 auto',
            }}
        >
            {bars.map((height, index) => (
                <span
                    key={index}
                    style={{
                        width: 6,
                        height: 26 * height,
                        borderRadius: 3,
                        background: accent,
                        boxShadow: `0 0 10px ${accent}66`,
                    }}
                />
            ))}
        </span>
    );
}

function BarChartPanel({ theta }: { theta: number }): ReactElement {
    return (
        <div
            style={{
                ...glassSurface(22, GLASS),
                flex: '1.55 1 0',
                minWidth: 0,
                padding: '16px 20px 14px',
                display: 'flex',
                flexDirection: 'column',
            }}
        >
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ fontSize: 26, fontWeight: 600, letterSpacing: '-0.01em', color: TEXT }}>
                    Realisasi Anggaran
                </span>
                <span style={{ fontSize: 18, color: TEXT_MUTED, whiteSpace: 'nowrap' }}>8 kategori</span>
            </div>

            <div style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'stretch', gap: 18, minHeight: 0 }}>
                <div
                    style={{
                        position: 'absolute',
                        inset: 0,
                        backgroundImage: 'linear-gradient(to top, rgba(245,243,255,0.09) 1px, transparent 1px)',
                        backgroundSize: '100% 25%',
                    }}
                />

                {BARS.map((bar, index) => {
                    // Gelombang periodik penuh → chart selalu terisi & loop mulus.
                    const wave = 0.5 + 0.5 * Math.sin(theta * 2 - index * 0.55);
                    const highlight = index === HIGHLIGHT_BAR;

                    return (
                        <div
                            key={bar.label}
                            style={{
                                position: 'relative',
                                flex: 1,
                                minWidth: 46,
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'flex-end',
                                alignItems: 'center',
                                gap: 10,
                            }}
                        >
                            <div
                                style={{
                                    flex: 1,
                                    width: '100%',
                                    minHeight: 0,
                                    display: 'flex',
                                    alignItems: 'flex-end',
                                    justifyContent: 'center',
                                }}
                            >
                                <div
                                    style={{
                                        width: '100%',
                                        height: `${bar.value * 100}%`,
                                        transformOrigin: 'bottom center',
                                        transform: `scaleY(${0.92 + 0.08 * wave})`,
                                        borderRadius: '10px 10px 6px 6px',
                                        background: highlight
                                            ? `linear-gradient(180deg, ${GOLD_SOFT} 0%, ${GOLD} 55%, rgba(232,200,125,0.6) 100%)`
                                            : `linear-gradient(180deg, rgba(124,92,255,0.95) 0%, rgba(91,61,245,0.7) 55%, rgba(69,39,201,0.45) 100%)`,
                                        boxShadow: highlight
                                            ? '0 0 34px rgba(232,200,125,0.5)'
                                            : '0 10px 30px -14px rgba(124,92,255,0.95)',
                                    }}
                                />
                            </div>

                            <span
                                style={{
                                    fontSize: 18,
                                    letterSpacing: '0.02em',
                                    color: highlight ? GOLD : TEXT_MUTED,
                                    fontWeight: highlight ? 700 : 500,
                                    whiteSpace: 'nowrap',
                                }}
                            >
                                {bar.label}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function DonutPanel({ theta }: { theta: number }): ReactElement {
    // Arc bernapas tipis di sekitar 281° — tidak pernah kosong.
    const arcDegrees = 281 + 3 * Math.sin(theta * 2);
    const fraction = clamp01(arcDegrees / 360);
    const glow = 0.5 + 0.25 * (0.5 + 0.5 * Math.sin(theta * 2));

    return (
        <div
            style={{
                ...glassSurface(22, GLASS),
                flex: '1 1 0',
                minWidth: 0,
                padding: '16px 20px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
            }}
        >
            <div style={{ width: '100%', display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 26, fontWeight: 600, letterSpacing: '-0.01em', color: TEXT }}>Realisasi</span>
                <span style={{ fontSize: 18, color: TEXT_MUTED, whiteSpace: 'nowrap' }}>RKAS</span>
            </div>

            <div
                style={{
                    position: 'relative',
                    flex: 1,
                    width: '100%',
                    minHeight: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                <div
                    style={{
                        position: 'absolute',
                        width: 230,
                        height: 230,
                        borderRadius: '50%',
                        background: 'radial-gradient(closest-side, rgba(124,92,255,0.3), rgba(124,92,255,0) 72%)',
                        opacity: glow,
                    }}
                />

                <svg width={186} height={186} viewBox="0 0 176 176" style={{ transform: 'rotate(-90deg)' }} aria-hidden>
                    <defs>
                        <linearGradient id="sikas-hero-donut" x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stopColor={BRAND} />
                            <stop offset="52%" stopColor={BRAND_DARKER} />
                            <stop offset="100%" stopColor={GOLD} />
                        </linearGradient>
                    </defs>
                    <circle
                        cx={88}
                        cy={88}
                        r={DONUT_RADIUS}
                        fill="none"
                        stroke="rgba(245,243,255,0.12)"
                        strokeWidth={DONUT_STROKE}
                    />
                    <circle
                        cx={88}
                        cy={88}
                        r={DONUT_RADIUS}
                        fill="none"
                        stroke="url(#sikas-hero-donut)"
                        strokeWidth={DONUT_STROKE}
                        strokeLinecap="round"
                        strokeDasharray={DONUT_CIRCUMFERENCE}
                        strokeDashoffset={DONUT_CIRCUMFERENCE * (1 - fraction)}
                    />
                </svg>

                <div
                    style={{
                        position: 'absolute',
                        inset: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 4,
                    }}
                >
                    <span
                        style={{
                            fontFamily: FONT_DISPLAY,
                            fontSize: 52,
                            lineHeight: 1,
                            letterSpacing: '-0.02em',
                            fontVariantNumeric: 'tabular-nums',
                            color: TEXT,
                        }}
                    >
                        78%
                    </span>
                    <span
                        style={{
                            fontSize: 16,
                            letterSpacing: '0.22em',
                            textTransform: 'uppercase',
                            color: TEXT_MUTED,
                        }}
                    >
                        dari pagu
                    </span>
                </div>
            </div>
        </div>
    );
}

function LedgerPanel({ theta }: { theta: number }): ReactElement {
    return (
        <div
            style={{
                ...glassSurface(22, GLASS),
                flex: '1 1 0',
                minHeight: 0,
                padding: '13px 20px',
                display: 'flex',
                flexDirection: 'column',
            }}
        >
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 26, fontWeight: 600, letterSpacing: '-0.01em', color: TEXT }}>BKU Terbaru</span>
                <span style={{ fontSize: 18, color: TEXT_MUTED, whiteSpace: 'nowrap' }}>3 transaksi</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, marginTop: 10 }}>
                {LEDGER_ROWS.map((row, index) => (
                    <div
                        key={row.code}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 18,
                            flex: 1,
                            minHeight: 0,
                            padding: '0 2px',
                            borderTop: index === 0 ? 'none' : '1px solid rgba(245,243,255,0.09)',
                            transform: `translateX(${Math.sin(theta * 2 + index) * 2}px)`,
                        }}
                    >
                        <span
                            style={{
                                width: 64,
                                fontSize: 18,
                                letterSpacing: '0.01em',
                                color: TEXT_MUTED,
                                fontVariantNumeric: 'tabular-nums',
                                whiteSpace: 'nowrap',
                            }}
                        >
                            {row.date}
                        </span>
                        <span
                            style={{
                                width: 84,
                                fontSize: 18,
                                letterSpacing: '0.06em',
                                color: 'rgba(232,200,125,0.88)',
                                fontVariantNumeric: 'tabular-nums',
                                whiteSpace: 'nowrap',
                            }}
                        >
                            {row.code}
                        </span>
                        <span
                            style={{
                                flex: 1,
                                minWidth: 0,
                                fontSize: 20,
                                letterSpacing: '0.01em',
                                color: TEXT,
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                            }}
                        >
                            {row.description}
                        </span>
                        <span
                            style={{
                                fontSize: 26,
                                fontWeight: 700,
                                lineHeight: 1.1,
                                letterSpacing: '-0.01em',
                                color: TEXT,
                                fontVariantNumeric: 'tabular-nums',
                                whiteSpace: 'nowrap',
                            }}
                        >
                            {row.amount}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}

/* ================================================================ chip === */

function ArkasChip({ theta }: { theta: number }): ReactElement {
    // 5 siklus per loop → tetap sinkron di ujung loop.
    const pulse = 0.5 + 0.5 * Math.sin(theta * 5);

    return (
        <div
            style={{
                position: 'absolute',
                zIndex: 3,
                top: -22,
                right: -28,
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '11px 18px 11px 12px',
                borderRadius: RADIUS.pill,
                border: `1px solid rgba(232,200,125,${0.3 + 0.22 * pulse})`,
                background: 'linear-gradient(135deg, rgba(32,27,48,0.98), rgba(18,15,29,0.96))',
                boxShadow: `0 26px 54px -26px rgba(0,0,0,0.95), 0 0 ${22 + 32 * pulse}px rgba(232,200,125,${0.14 + 0.2 * pulse})`,
            }}
        >
            <span
                style={{
                    display: 'grid',
                    placeItems: 'center',
                    width: 26,
                    height: 26,
                    borderRadius: '50%',
                    border: '1px solid rgba(232,200,125,0.5)',
                    background: 'rgba(232,200,125,0.2)',
                    color: GOLD,
                    fontSize: 13,
                    fontWeight: 700,
                    lineHeight: 1,
                }}
            >
                ✓
            </span>

            <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ fontSize: 20, fontWeight: 700, letterSpacing: '0.01em', color: TEXT, whiteSpace: 'nowrap' }}>
                    ARKAS Sinkron
                </span>
                <span
                    style={{
                        fontSize: 14,
                        letterSpacing: '0.2em',
                        textTransform: 'uppercase',
                        color: TEXT_MUTED,
                        whiteSpace: 'nowrap',
                    }}
                >
                    Data terbaru
                </span>
            </span>

            <span
                style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: GOLD,
                    opacity: 0.5 + 0.5 * pulse,
                    boxShadow: `0 0 14px ${GOLD}`,
                }}
            />
        </div>
    );
}

/* =========================================================== particles === */

function RupiahParticles({ theta }: { theta: number }): ReactElement {
    const cycle = theta / (Math.PI * 2);

    return (
        <div style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none' }} aria-hidden>
            {PARTICLES.map((particle, index) => {
                // Progres periodik penuh: (cycle + offset) mod 1.
                const local = (cycle + particle.offset) % 1;
                const opacity = Math.sin(Math.PI * local) * particle.alpha;
                const top = 92 - local * particle.rise;
                const left = particle.left + particle.drift * Math.sin(Math.PI * local);

                return (
                    <span
                        key={index}
                        style={{
                            position: 'absolute',
                            top: `${top}%`,
                            left: `${left}%`,
                            fontSize: particle.size,
                            fontWeight: 600,
                            letterSpacing: '-0.02em',
                            color: particle.color,
                            opacity,
                            fontVariantNumeric: 'tabular-nums',
                        }}
                    >
                        Rp
                    </span>
                );
            })}
        </div>
    );
}
