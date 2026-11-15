import { Component, Suspense, lazy, useEffect, useRef, useState } from 'react';
import type { ComponentType, CSSProperties, ReactElement, ReactNode, RefObject } from 'react';

import { useReducedMotion } from '@/Hooks/useReducedMotion';

// Token visual lokal untuk placeholder & wrapper.
// Sengaja tidak mengimpor dari ./theme agar Rollup tidak menggabungkan theme ke chunk Welcome
// yang menyebabkan Welcome diperlakukan sebagai shared chunk dan hilang dari manifest Vite.
const INK_DEEP = '#07060C';
const INK = '#0B0A12';
const INK_SOFT = '#15121F';
const BRAND = '#7C5CFF';
const GOLD = '#E8C87D';
const GOLD_SOFT = '#F5DCA8';
const HAIRLINE = 'rgba(232,200,125,0.22)';
const GLASS = 'rgba(255,255,255,0.05)';
const FONT_BODY = '"Plus Jakarta Sans", Figtree, ui-sans-serif, system-ui, sans-serif';

/**
 * Wrapper publik animasi SIKAS.
 *
 * - Runtime Remotion (`@remotion/player`) di-load lewat
 *   `lazy(() => import('./PlayerRuntime'))`; komposisi juga lazy. Jadi chunk
 *   halaman Welcome tidak memuat library Player sama sekali.
 * - Player baru dipasang saat wrapper mendekati viewport (IntersectionObserver,
 *   rootMargin 400px). Setelah itu komponennya tetap terpasang, tetapi playback
 *   di-pause saat jauh dari viewport.
 * - Saat masih memuat / gagal memuat / prefers-reduced-motion, tampilannya
 *   diganti placeholder gradient statis yang setara sehingga tidak ada
 *   layout shift dan halaman tetap utuh.
 *
 * Catatan pemeliharaan: angka di STAGE harus sama dengan HERO_CONFIG /
 * CTA_CONFIG di file komposisi; sengaja tidak diimpor dari sana agar import-nya
 * tetap dinamis (kalau diimpor statis, chunk Remotion ikut ke bundle awal).
 */

/** Di-load terpisah: baru diunduh saat Player dibutuhkan. */
const PlayerRuntime = lazy(() => import('./PlayerRuntime'));

export type PlayerStageComposition = 'hero' | 'cta';

export type PlayerStageProps = {
    composition: PlayerStageComposition;
    className?: string;
    /** Rasio lebar/tinggi wrapper. Default 4/3 (sama dengan kedua komposisi). */
    aspectRatio?: number;
    title?: string;
};

type StageComponent = ComponentType<Record<string, never>>;

type StageMeta = {
    component: StageComponent;
    durationInFrames: number;
    fps: number;
    compositionWidth: number;
    compositionHeight: number;
    /** Frame tenang untuk prefers-reduced-motion (komposisi sudah "jadi"). */
    settledFrame: number;
};

const STAGE: Record<PlayerStageComposition, StageMeta> = {
    hero: {
        component: lazy(() => import('./HeroComposition')),
        durationInFrames: 300,
        fps: 30,
        compositionWidth: 1200,
        compositionHeight: 900,
        // Frame tenang: bar & arc donut sudah penuh (78%), sebelum fase mengecil.
        settledFrame: 100,
    },
    cta: {
        component: lazy(() => import('./CtaComposition')),
        durationInFrames: 240,
        fps: 30,
        compositionWidth: 800,
        compositionHeight: 600,
        settledFrame: 120,
    },
};

const DEFAULT_TITLE = 'Animasi SIKAS';

/* ================================================================ stage === */

export function PlayerStage({
    composition,
    className,
    aspectRatio = 4 / 3,
    title,
}: PlayerStageProps): ReactElement {
    const { ref, near } = useNearViewport();
    const reducedMotion = useReducedMotion();
    const stage = STAGE[composition];

    // Sekali Player pernah dekat viewport, komponennya tetap terpasang:
    // hanya playback yang di-pause saat jauh, supaya screenshot penuh /
    // cetak halaman tetap menampilkan frame animasi (bukan placeholder).
    const [activated, setActivated] = useState(false);

    useEffect(() => {
        if (near) setActivated(true);
    }, [near]);

    const wrapperStyle: CSSProperties = {
        position: 'relative',
        display: 'block',
        width: '100%',
        aspectRatio,
        overflow: 'hidden',
        // Radius sengaja lebih kecil dari bingkai kartu pemanggil agar tidak
        // menabrak sudut overflow-hidden milik section (Hero/CtaSection).
        borderRadius: 16,
        background: `linear-gradient(160deg, ${INK_DEEP} 0%, ${INK} 48%, ${INK_SOFT} 100%)`,
    };

    return (
        <div
            ref={ref}
            role="img"
            aria-label={title ?? DEFAULT_TITLE}
            className={className}
            style={wrapperStyle}
        >
            {activated ? (
                <RemotionErrorBoundary fallback={<StagePlaceholder variant={composition} />}>
                    <Suspense fallback={<StagePlaceholder variant={composition} />}>
                        <div aria-hidden="true" style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
                            <PlayerRuntime
                                component={stage.component}
                                durationInFrames={stage.durationInFrames}
                                fps={stage.fps}
                                compositionWidth={stage.compositionWidth}
                                compositionHeight={stage.compositionHeight}
                                initialFrame={reducedMotion ? stage.settledFrame : 0}
                                paused={reducedMotion || !near}
                                fallback={<StagePlaceholder variant={composition} />}
                            />
                        </div>
                    </Suspense>
                </RemotionErrorBoundary>
            ) : (
                <StagePlaceholder variant={composition} />
            )}
        </div>
    );
}

export default PlayerStage;

/* =============================================================== hooks === */

function useNearViewport(rootMargin: string = '400px 0px'): {
    ref: RefObject<HTMLDivElement>;
    near: boolean;
} {
    const ref = useRef<HTMLDivElement>(null);
    const [near, setNear] = useState(false);

    useEffect(() => {
        const element = ref.current;
        if (!element) return;

        // Lingkungan tanpa IntersectionObserver: langsung tampilkan Player.
        if (typeof IntersectionObserver === 'undefined') {
            setNear(true);
            return;
        }

        const observer = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    setNear(entry.isIntersecting);
                }
            },
            { root: null, rootMargin, threshold: 0 },
        );

        observer.observe(element);

        return () => {
            observer.disconnect();
        };
    }, [rootMargin]);

    return { ref, near };
}

/* ========================================================= error guard === */

type ErrorBoundaryProps = { children: ReactNode; fallback: ReactNode };
type ErrorBoundaryState = { failed: boolean };

/**
 * Error boundary kecil: kalau dynamic import gagal (offline / chunk hilang)
 * atau komposisi melempar error, tampilkan placeholder statis. Halaman tetap
 * hidup — animasi dekoratif tidak boleh merusak landing page.
 */
class RemotionErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    public state: ErrorBoundaryState = { failed: false };

    public static getDerivedStateFromError(): ErrorBoundaryState {
        return { failed: true };
    }

    public componentDidCatch(error: unknown): void {
        // Tidak ada UI error: cukup catat supaya mudah didiagnosis di console.
        console.warn('[SIKAS] Animasi Remotion gagal dimuat. Memakai fallback statis.', error);
    }

    public render(): ReactNode {
        return this.state.failed ? this.props.fallback : this.props.children;
    }
}

/* =========================================================== placeholder === */

function StagePlaceholder({ variant }: { variant: PlayerStageComposition }): ReactElement {
    return (
        <div
            aria-hidden="true"
            style={{
                position: 'absolute',
                inset: 0,
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: FONT_BODY,
                background: `radial-gradient(520px 420px at 22% 14%, rgba(124,92,255,0.30) 0%, rgba(124,92,255,0) 62%), radial-gradient(460px 380px at 80% 86%, rgba(232,200,125,0.13) 0%, rgba(232,200,125,0) 64%), linear-gradient(156deg, ${INK_DEEP} 0%, ${INK} 46%, ${INK_SOFT} 100%)`,
            }}
        >
            {variant === 'hero' ? <HeroSkeleton /> : <CtaSkeleton />}
        </div>
    );
}

function HeroSkeleton(): ReactElement {
    return (
        <div
            style={{
                width: '72%',
                height: '64%',
                boxSizing: 'border-box',
                padding: '16px 18px',
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
                borderRadius: 20,
                border: `1px solid ${HAIRLINE}`,
                background: GLASS,
            }}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ display: 'flex', gap: 4 }}>
                    {[GOLD, BRAND, BRAND].map((color, index) => (
                        <span key={index} style={{ width: 5, height: 5, borderRadius: '50%', background: color }} />
                    ))}
                </span>
                <span style={{ width: 86, height: 6, borderRadius: 999, background: 'rgba(245,243,255,0.16)' }} />
                <span
                    style={{
                        marginLeft: 'auto',
                        width: 42,
                        height: 14,
                        borderRadius: 999,
                        border: '1px solid rgba(124,92,255,0.4)',
                        background: 'rgba(124,92,255,0.18)',
                    }}
                />
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
                {[0, 1, 2].map((index) => (
                    <span
                        key={index}
                        style={{
                            flex: 1,
                            height: 44,
                            borderRadius: 12,
                            border: `1px solid ${HAIRLINE}`,
                            background: 'rgba(255,255,255,0.035)',
                        }}
                    />
                ))}
            </div>

            <div style={{ display: 'flex', gap: 8, flex: 1, minHeight: 0 }}>
                <div
                    style={{
                        flex: 1.5,
                        borderRadius: 12,
                        border: `1px solid ${HAIRLINE}`,
                        background: 'rgba(255,255,255,0.03)',
                        display: 'flex',
                        alignItems: 'flex-end',
                        gap: 6,
                        padding: '10px 12px',
                    }}
                >
                    {[0.42, 0.62, 0.36, 0.74, 0.52, 0.88, 0.66, 0.81].map((height, index) => (
                        <span
                            key={index}
                            style={{
                                flex: 1,
                                height: `${height * 100}%`,
                                borderRadius: '4px 4px 2px 2px',
                                background:
                                    index === 5
                                        ? `linear-gradient(180deg, ${GOLD_SOFT}, ${GOLD})`
                                        : 'rgba(124,92,255,0.42)',
                            }}
                        />
                    ))}
                </div>
                <span
                    style={{
                        flex: 1,
                        borderRadius: 12,
                        border: `1px solid ${HAIRLINE}`,
                        background: 'rgba(255,255,255,0.03)',
                    }}
                />
            </div>
        </div>
    );
}

function CtaSkeleton(): ReactElement {
    return (
        <div style={{ position: 'relative', width: '72%', height: '72%' }}>
            <span
                style={{
                    position: 'absolute',
                    left: '50%',
                    top: '50%',
                    width: '78%',
                    height: '48%',
                    marginLeft: '-39%',
                    marginTop: '-24%',
                    borderRadius: '50%',
                    border: '1px solid rgba(232,200,125,0.22)',
                }}
            />
            <span
                style={{
                    position: 'absolute',
                    left: '50%',
                    top: '50%',
                    width: '44%',
                    height: '68%',
                    marginLeft: '-22%',
                    marginTop: '-34%',
                    borderRadius: '50%',
                    border: '1px solid rgba(124,92,255,0.26)',
                }}
            />
            <span
                style={{
                    position: 'absolute',
                    left: '50%',
                    top: '50%',
                    width: 74,
                    height: 74,
                    marginLeft: -37,
                    marginTop: -37,
                    borderRadius: '50%',
                    border: `1px solid ${HAIRLINE}`,
                    background: 'radial-gradient(circle at 50% 34%, rgba(124,92,255,0.26), rgba(11,10,18,0.7) 74%)',
                }}
            />
            {[
                { left: '18%', top: '30%' },
                { left: '82%', top: '30%' },
                { left: '18%', top: '72%' },
                { left: '82%', top: '72%' },
            ].map((position, index) => (
                <span
                    key={index}
                    style={{
                        position: 'absolute',
                        left: position.left,
                        top: position.top,
                        width: 54,
                        height: 22,
                        transform: 'translate(-50%,-50%)',
                        borderRadius: 999,
                        border: `1px solid ${HAIRLINE}`,
                        background: 'rgba(255,255,255,0.045)',
                    }}
                />
            ))}
        </div>
    );
}
