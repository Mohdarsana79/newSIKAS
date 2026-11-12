import type { ReactElement } from 'react';
import { random, useCurrentFrame } from 'remotion';

import {
    BRAND,
    FONT_BODY,
    FONT_DISPLAY,
    GOLD,
    INK,
    INK_DEEP,
    INK_SOFT,
    RADIUS,
    TEXT,
} from './theme';

/* ============================================================== config === */

export const CTA_ID = 'sikas-cta';

export const CTA_CONFIG = {
    durationInFrames: 240,
    fps: 30,
    width: 800,
    height: 600,
} as const;

const DURATION = CTA_CONFIG.durationInFrames;
const WIDTH = CTA_CONFIG.width;
const HEIGHT = CTA_CONFIG.height;
const CENTER_X = WIDTH / 2;
const CENTER_Y = HEIGHT / 2;

/* ================================================================ data === */

type ChipTone = 'gold' | 'violet';

type Chip = {
    label: string;
    angle: number;
    phase: number;
    tone: ChipTone;
};

/**
 * 4 chip teknis di lintasan orbit (elips a=250, b=195).
 * Sudut dipilih agar chip duduk di 4 kuadran dan tidak menabrak orb pusat.
 */
const CHIPS: readonly Chip[] = [
    { label: 'Excel', angle: 210, phase: 0.6, tone: 'violet' },
    { label: 'PDF', angle: 330, phase: 1.9, tone: 'gold' },
    { label: 'BKU', angle: 150, phase: 3.2, tone: 'violet' },
    { label: 'ARKAS', angle: 30, phase: 4.6, tone: 'gold' },
];

const ORBIT_A = 250;
const ORBIT_B = 195;

type Sparkle = { x: number; y: number; size: number; phase: number };

const SPARKLES: readonly Sparkle[] = Array.from({ length: 8 }, (_unused, index) => {
    const seed = `sikas-cta-sparkle-${index}`;
    return {
        x: 60 + random(`${seed}-x`) * (WIDTH - 120),
        y: 52 + random(`${seed}-y`) * (HEIGHT - 104),
        size: 2 + random(`${seed}-size`) * 2,
        phase: random(`${seed}-phase`) * Math.PI * 2,
    };
});

/* ============================================================= helpers === */

const chipPosition = (angle: number): { left: number; top: number } => {
    const radians = (angle * Math.PI) / 180;
    return {
        left: CENTER_X + ORBIT_A * Math.cos(radians),
        top: CENTER_Y + ORBIT_B * Math.sin(radians),
    };
};

const toneColor = (tone: ChipTone): string => (tone === 'gold' ? GOLD : BRAND);

const toneBorder = (tone: ChipTone): string =>
    tone === 'gold' ? 'rgba(232,200,125,0.62)' : 'rgba(140,110,255,0.68)';

/* ========================================================= composition === */

export function CtaComposition(): ReactElement {
    const frame = useCurrentFrame();

    // Satu putaran penuh per loop → frame 0 ≡ frame 240.
    const theta = (frame / DURATION) * Math.PI * 2;
    const angleDeg = (frame / DURATION) * 360;

    const breath = 0.5 - 0.5 * Math.cos(theta * 2);
    const orbScale = 1 + 0.022 * Math.sin(theta * 2 + 0.6);
    const haloOpacity = 0.6 + 0.3 * breath;

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
            {/* Latar: ink dengan pendar violet/emas yang kuat. */}
            <div
                style={{
                    position: 'absolute',
                    inset: 0,
                    background: `radial-gradient(560px 480px at 50% 48%, rgba(124,92,255,0.34) 0%, rgba(124,92,255,0) 66%), radial-gradient(460px 380px at 86% 10%, rgba(232,200,125,0.16) 0%, rgba(232,200,125,0) 62%), radial-gradient(420px 340px at 8% 92%, rgba(124,92,255,0.20) 0%, rgba(124,92,255,0) 64%), linear-gradient(158deg, ${INK_DEEP} 0%, ${INK} 46%, ${INK_SOFT} 100%)`,
                }}
            />

            {/* Grain halus. */}
            <div
                style={{
                    position: 'absolute',
                    inset: 0,
                    opacity: 0.35,
                    backgroundImage: 'radial-gradient(rgba(255,255,255,0.05) 0.6px, transparent 0.7px)',
                    backgroundSize: '3px 3px',
                }}
            />

            {/* Halo cahaya di belakang orb. */}
            <div
                style={{
                    position: 'absolute',
                    left: CENTER_X,
                    top: CENTER_Y,
                    width: 700,
                    height: 700,
                    marginLeft: -350,
                    marginTop: -350,
                    borderRadius: '50%',
                    background:
                        'radial-gradient(closest-side, rgba(124,92,255,0.4) 0%, rgba(124,92,255,0.12) 52%, rgba(124,92,255,0) 74%)',
                    opacity: haloOpacity,
                }}
            />

            {/* Ring orbit 1 — emas, berputar searah jarum jam. */}
            <OrbitRing
                width={560}
                height={420}
                rotation={angleDeg}
                color="rgba(232,200,125,0.92)"
                glow="rgba(232,200,125,0.55)"
                dotColor={GOLD}
            />

            {/* Ring orbit 2 — violet, berputar berlawanan arah. */}
            <OrbitRing
                width={380}
                height={330}
                rotation={-angleDeg}
                color="rgba(163,138,255,0.95)"
                glow="rgba(124,92,255,0.6)"
                dotColor={BRAND}
            />

            {/* Chip teknis mengambang di lintasan orbit. */}
            {CHIPS.map((chip) => {
                const { left, top } = chipPosition(chip.angle);
                const bob = 6 * Math.sin(theta * 2 + chip.phase);
                const parallaxX = 7 * Math.cos(theta + chip.phase);
                const parallaxY = 5 * Math.sin(theta + chip.phase);
                const accent = toneColor(chip.tone);
                const border = toneBorder(chip.tone);

                return (
                    <div
                        key={chip.label}
                        style={{
                            position: 'absolute',
                            left,
                            top,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 12,
                            padding: '12px 20px',
                            borderRadius: RADIUS.pill,
                            border: `2px solid ${border}`,
                            background: 'rgba(15,13,24,0.88)',
                            boxShadow: `0 26px 54px -26px rgba(0,0,0,0.95), 0 0 30px ${accent}44`,
                            transform: `translate(-50%,-50%) translate(${parallaxX}px, ${parallaxY + bob}px)`,
                            willChange: 'transform',
                        }}
                    >
                        <span
                            style={{
                                display: 'grid',
                                placeItems: 'center',
                                width: 36,
                                height: 36,
                                borderRadius: 10,
                                border: `1px solid ${border}`,
                                background: `${accent}26`,
                                color: accent,
                                flex: '0 0 auto',
                            }}
                        >
                            <ChipIcon label={chip.label} accent={accent} />
                        </span>

                        <span
                            style={{
                                fontSize: 26,
                                fontWeight: 700,
                                letterSpacing: '0.16em',
                                textTransform: 'uppercase',
                                color: TEXT,
                                whiteSpace: 'nowrap',
                            }}
                        >
                            {chip.label}
                        </span>
                    </div>
                );
            })}

            {/* Orb pusat dengan gradient terang. */}
            <div
                style={{
                    position: 'absolute',
                    left: CENTER_X,
                    top: CENTER_Y,
                    width: 244,
                    height: 244,
                    marginLeft: -122,
                    marginTop: -122,
                    borderRadius: '50%',
                    border: '1px solid rgba(245,243,255,0.4)',
                    background:
                        'radial-gradient(circle at 36% 28%, #F7F2FF 0%, #D9CDFF 16%, #A48CFF 36%, #6E4FF2 58%, #3E2899 78%, #1D1342 100%)',
                    boxShadow:
                        '0 0 90px rgba(124,92,255,0.8), 0 0 170px rgba(124,92,255,0.38), inset 0 -20px 44px rgba(11,10,18,0.4), inset 0 16px 32px rgba(255,255,255,0.3)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 10,
                    transform: `scale(${orbScale})`,
                    willChange: 'transform',
                }}
            >
                <span
                    style={{
                        fontFamily: FONT_DISPLAY,
                        fontSize: 46,
                        fontWeight: 600,
                        lineHeight: 1,
                        letterSpacing: '0.06em',
                        color: '#0B0A12',
                    }}
                >
                    SIKAS
                </span>
                <span style={{ width: 46, height: 2, borderRadius: 2, background: 'rgba(11,10,18,0.4)' }} />
                <span
                    style={{
                        fontSize: 14,
                        fontWeight: 700,
                        letterSpacing: '0.3em',
                        textTransform: 'uppercase',
                        color: 'rgba(11,10,18,0.76)',
                        whiteSpace: 'nowrap',
                    }}
                >
                    Ekspor · Sinkron
                </span>
            </div>

            {/* Sparkle kecil — berkelip pelan, periodik penuh. */}
            {SPARKLES.map((sparkle, index) => {
                const twinkle = 0.18 + 0.32 * (0.5 + 0.5 * Math.sin(theta * 2 + sparkle.phase));
                return (
                    <span
                        key={index}
                        style={{
                            position: 'absolute',
                            left: sparkle.x,
                            top: sparkle.y,
                            width: sparkle.size,
                            height: sparkle.size,
                            borderRadius: '50%',
                            background: GOLD,
                            opacity: twinkle,
                            boxShadow: '0 0 8px rgba(232,200,125,0.7)',
                        }}
                    />
                );
            })}

            {/* Vignette tipis agar tepi tetap elegan. */}
            <div
                style={{
                    position: 'absolute',
                    inset: 0,
                    pointerEvents: 'none',
                    background:
                        'radial-gradient(118% 102% at 50% 48%, rgba(7,6,12,0) 46%, rgba(7,6,12,0.5) 100%)',
                }}
            />
        </div>
    );
}

export default CtaComposition;

/* =============================================================== parts === */

function OrbitRing({
    width,
    height,
    rotation,
    color,
    glow,
    dotColor,
}: {
    width: number;
    height: number;
    rotation: number;
    color: string;
    glow: string;
    dotColor: string;
}): ReactElement {
    return (
        <div
            style={{
                position: 'absolute',
                left: CENTER_X,
                top: CENTER_Y,
                width,
                height,
                marginLeft: -width / 2,
                marginTop: -height / 2,
                borderRadius: '50%',
                border: `3px solid ${color}`,
                boxShadow: `0 0 34px ${glow}, inset 0 0 26px ${glow}`,
                transform: `rotate(${rotation}deg)`,
                willChange: 'transform',
            }}
        >
            <span
                style={{
                    position: 'absolute',
                    left: 0,
                    top: '50%',
                    width: 11,
                    height: 11,
                    marginLeft: -5.5,
                    marginTop: -5.5,
                    borderRadius: '50%',
                    background: dotColor,
                    boxShadow: `0 0 20px ${dotColor}, 0 0 8px ${dotColor}`,
                }}
            />
        </div>
    );
}

function ChipIcon({ label, accent }: { label: string; accent: string }): ReactElement {
    if (label === 'PDF') {
        return (
            <span
                style={{
                    position: 'relative',
                    display: 'block',
                    width: 15,
                    height: 19,
                    borderRadius: 3,
                    border: `2px solid ${accent}`,
                }}
            >
                <span
                    style={{
                        position: 'absolute',
                        left: 2,
                        right: 2,
                        top: 5,
                        height: 2,
                        borderRadius: 2,
                        background: accent,
                    }}
                />
                <span
                    style={{
                        position: 'absolute',
                        left: 2,
                        right: 4,
                        top: 10,
                        height: 2,
                        borderRadius: 2,
                        background: accent,
                        opacity: 0.75,
                    }}
                />
            </span>
        );
    }

    if (label === 'Excel') {
        return (
            <span style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3 }}>
                {[0, 1, 2, 3].map((cell) => (
                    <span key={cell} style={{ width: 7, height: 7, borderRadius: 2, background: accent }} />
                ))}
            </span>
        );
    }

    if (label === 'BKU') {
        return (
            <span style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 18 }}>
                {[9, 13, 18].map((barHeight) => (
                    <span key={barHeight} style={{ width: 4, height: barHeight, borderRadius: 2, background: accent }} />
                ))}
            </span>
        );
    }

    // ARKAS — ikon sinkron: cincin dengan celah + titik.
    return (
        <span style={{ position: 'relative', display: 'block', width: 18, height: 18 }}>
            <span
                style={{
                    position: 'absolute',
                    inset: 0,
                    borderRadius: '50%',
                    border: `2px solid ${accent}`,
                    borderTopColor: 'transparent',
                    transform: 'rotate(35deg)',
                }}
            />
            <span
                style={{
                    position: 'absolute',
                    right: 0,
                    top: 0,
                    width: 5,
                    height: 5,
                    borderRadius: '50%',
                    background: accent,
                }}
            />
        </span>
    );
}
