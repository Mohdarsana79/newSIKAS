import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

import { AccountActions } from '@/Components/Landing/ui/AccountActions';
import { useReducedMotion } from '@/Hooks/useReducedMotion';
import { animate, animateNumber, createSpring, createTimeline, stagger, svg } from '@/lib/anime';
import { cn } from '@/lib/utils';

export type HeroProps = {
    /** Boolean dari `auth.user` (logika halaman lama dipertahankan). */
    authenticated: boolean;
    /** Boolean `hasUsers` dari props Inertia. */
    hasUsers: boolean;
    /** Callback saat tombol "Tonton Panduan" diklik. */
    onOpenVideoModal?: () => void;
};

type BudgetVariantKey = 'reguler' | 'kinerja' | 'silpa' | 'kinerja_silpa';

type BudgetDataset = {
    key: BudgetVariantKey;
    label: string;
    periodLabel: string;
    totalNominal: number;
    growthPercent: string;
    growthNote: string;
    linePath: string;
    areaPath: string;
    points: readonly { month: string; x: number; y: number; value: string }[];
    metrics: {
        growth: string;
        diversification: string;
        risk: string;
    };
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'] as const;

const BUDGET_DATASETS: readonly BudgetDataset[] = [
    {
        key: 'reguler',
        label: '12 Bulan · BOSP Reguler',
        periodLabel: '12 Bulan Terakhir',
        totalNominal: 482230000,
        growthPercent: '12,4%',
        growthNote: 'vs. triwulan lalu',
        linePath:
            'M 18 118 C 42 118, 56 104, 78 105 C 102 106, 118 108, 142 96 C 166 84, 182 68, 206 70 C 230 72, 246 84, 270 72 C 294 60, 312 46, 336 48 C 358 50, 378 30, 402 18',
        areaPath:
            'M 18 118 C 42 118, 56 104, 78 105 C 102 106, 118 108, 142 96 C 166 84, 182 68, 206 70 C 230 72, 246 84, 270 72 C 294 60, 312 46, 336 48 C 358 50, 378 30, 402 18 L 402 140 L 18 140 Z',
        points: [
            { month: 'Jan', x: 18, y: 118, value: 'Rp 38,5 Jt' },
            { month: 'Feb', x: 53, y: 110, value: 'Rp 74,2 Jt' },
            { month: 'Mar', x: 88, y: 105, value: 'Rp 118,0 Jt' },
            { month: 'Apr', x: 123, y: 102, value: 'Rp 156,4 Jt' },
            { month: 'Mei', x: 158, y: 86, value: 'Rp 204,8 Jt' },
            { month: 'Jun', x: 193, y: 70, value: 'Rp 248,1 Jt' },
            { month: 'Jul', x: 228, y: 75, value: 'Rp 284,6 Jt' },
            { month: 'Agu', x: 263, y: 74, value: 'Rp 325,0 Jt' },
            { month: 'Sep', x: 298, y: 55, value: 'Rp 372,4 Jt' },
            { month: 'Okt', x: 333, y: 48, value: 'Rp 412,9 Jt' },
            { month: 'Nov', x: 368, y: 34, value: 'Rp 449,5 Jt' },
            { month: 'Des', x: 402, y: 18, value: 'Rp 482,2 Jt' },
        ],
        metrics: {
            growth: '+12,4%',
            diversification: 'Seimbang',
            risk: 'Terkendali',
        },
    },
    {
        key: 'kinerja',
        label: '12 Bulan · BOSP Kinerja',
        periodLabel: 'BOSP Kinerja',
        totalNominal: 215800000,
        growthPercent: '18,7%',
        growthNote: 'capaian mutu sekolah',
        linePath:
            'M 18 124 C 42 120, 58 112, 78 98 C 102 82, 118 90, 142 78 C 166 66, 182 58, 206 62 C 230 66, 246 52, 270 46 C 294 40, 312 36, 336 28 C 358 22, 378 20, 402 14',
        areaPath:
            'M 18 124 C 42 120, 58 112, 78 98 C 102 82, 118 90, 142 78 C 166 66, 182 58, 206 62 C 230 66, 246 52, 270 46 C 294 40, 312 36, 336 28 C 358 22, 378 20, 402 14 L 402 140 L 18 140 Z',
        points: [
            { month: 'Jan', x: 18, y: 124, value: 'Rp 15,0 Jt' },
            { month: 'Feb', x: 53, y: 114, value: 'Rp 32,4 Jt' },
            { month: 'Mar', x: 88, y: 94, value: 'Rp 58,0 Jt' },
            { month: 'Apr', x: 123, y: 86, value: 'Rp 79,5 Jt' },
            { month: 'Mei', x: 158, y: 72, value: 'Rp 104,2 Jt' },
            { month: 'Jun', x: 193, y: 61, value: 'Rp 128,0 Jt' },
            { month: 'Jul', x: 228, y: 64, value: 'Rp 142,5 Jt' },
            { month: 'Agu', x: 263, y: 48, value: 'Rp 164,0 Jt' },
            { month: 'Sep', x: 298, y: 40, value: 'Rp 181,2 Jt' },
            { month: 'Okt', x: 333, y: 29, value: 'Rp 196,4 Jt' },
            { month: 'Nov', x: 368, y: 21, value: 'Rp 207,1 Jt' },
            { month: 'Des', x: 402, y: 14, value: 'Rp 215,8 Jt' },
        ],
        metrics: {
            growth: '+18,7%',
            diversification: 'Optimal',
            risk: 'Rendah',
        },
    },
    {
        key: 'silpa',
        label: 'SiLPA BOSP Reguler',
        periodLabel: 'SiLPA Reguler',
        totalNominal: 94650000,
        growthPercent: '100%',
        growthNote: 'penyerapan sisa lebih',
        linePath:
            'M 18 112 C 42 108, 58 96, 78 92 C 102 88, 118 76, 142 74 C 166 72, 182 64, 206 56 C 230 48, 246 50, 270 42 C 294 34, 312 32, 336 26 C 358 22, 378 24, 402 20',
        areaPath:
            'M 18 112 C 42 108, 58 96, 78 92 C 102 88, 118 76, 142 74 C 166 72, 182 64, 206 56 C 230 48, 246 50, 270 42 C 294 34, 312 32, 336 26 C 358 22, 378 24, 402 20 L 402 140 L 18 140 Z',
        points: [
            { month: 'Jan', x: 18, y: 112, value: 'Rp 12,0 Jt' },
            { month: 'Feb', x: 53, y: 100, value: 'Rp 21,5 Jt' },
            { month: 'Mar', x: 88, y: 90, value: 'Rp 31,2 Jt' },
            { month: 'Apr', x: 123, y: 78, value: 'Rp 42,0 Jt' },
            { month: 'Mei', x: 158, y: 72, value: 'Rp 51,8 Jt' },
            { month: 'Jun', x: 193, y: 59, value: 'Rp 61,4 Jt' },
            { month: 'Jul', x: 228, y: 50, value: 'Rp 69,0 Jt' },
            { month: 'Agu', x: 263, y: 44, value: 'Rp 76,2 Jt' },
            { month: 'Sep', x: 298, y: 34, value: 'Rp 82,5 Jt' },
            { month: 'Okt', x: 333, y: 27, value: 'Rp 87,9 Jt' },
            { month: 'Nov', x: 368, y: 23, value: 'Rp 91,8 Jt' },
            { month: 'Des', x: 402, y: 20, value: 'Rp 94,6 Jt' },
        ],
        metrics: {
            growth: '+100%',
            diversification: 'Terserap',
            risk: 'Nihil',
        },
    },
    {
        key: 'kinerja_silpa',
        label: 'SiLPA BOSP Kinerja',
        periodLabel: 'SiLPA Kinerja',
        totalNominal: 64120000,
        growthPercent: '98,5%',
        growthNote: 'audit BKU terverifikasi',
        linePath:
            'M 18 122 C 42 118, 58 110, 78 102 C 102 94, 118 84, 142 82 C 166 80, 182 72, 206 64 C 230 56, 246 48, 270 44 C 294 40, 312 30, 336 26 C 358 22, 378 18, 402 16',
        areaPath:
            'M 18 122 C 42 118, 58 110, 78 102 C 102 94, 118 84, 142 82 C 166 80, 182 72, 206 64 C 230 56, 246 48, 270 44 C 294 40, 312 30, 336 26 C 358 22, 378 18, 402 16 L 402 140 L 18 140 Z',
        points: [
            { month: 'Jan', x: 18, y: 122, value: 'Rp 6,4 Jt' },
            { month: 'Feb', x: 53, y: 112, value: 'Rp 12,8 Jt' },
            { month: 'Mar', x: 88, y: 100, value: 'Rp 19,5 Jt' },
            { month: 'Apr', x: 123, y: 86, value: 'Rp 26,1 Jt' },
            { month: 'Mei', x: 158, y: 80, value: 'Rp 32,0 Jt' },
            { month: 'Jun', x: 193, y: 68, value: 'Rp 38,4 Jt' },
            { month: 'Jul', x: 228, y: 56, value: 'Rp 44,2 Jt' },
            { month: 'Agu', x: 263, y: 45, value: 'Rp 49,8 Jt' },
            { month: 'Sep', x: 298, y: 38, value: 'Rp 54,6 Jt' },
            { month: 'Okt', x: 333, y: 27, value: 'Rp 58,9 Jt' },
            { month: 'Nov', x: 368, y: 20, value: 'Rp 61,7 Jt' },
            { month: 'Des', x: 402, y: 16, value: 'Rp 64,1 Jt' },
        ],
        metrics: {
            growth: '+98,5%',
            diversification: 'Terstruktur',
            risk: 'Aman',
        },
    },
];

const TRUST_BADGES = [
    {
        title: 'Standar Resmi',
        subtitle: 'BOSP & ARKAS',
        icon: ChartBarsIcon,
    },
    {
        title: 'Pendekatan',
        subtitle: 'Akuntabel',
        icon: ShieldBadgeIcon,
    },
    {
        title: 'Kemitraan',
        subtitle: 'Jangka Panjang',
        icon: UsersPartnershipIcon,
    },
] as const;

function formatRupiah(val: number): string {
    return 'Rp ' + Math.round(val).toLocaleString('id-ID');
}

/**
 * Hero Section bergaya Novara Wealth Advisory:
 * - Latar pegunungan malam/fajar bernuansa Deep Midnight Teal & Mint Aurora
 * - Kolom kiri: Eyebrow, Headline 3 baris, Deskripsi, 2 tombol CTA, 3 Trust Badges
 * - Kolom kanan: Kartu Glassmorphism Grafik Realisasi 12 Bulan interaktif + 3 Mini Cards
 * - Animasi penuh menggunakan Anime.js v4 (Timeline, SVG Drawable, Number Tween, Parallax)
 */
export default function Hero({ authenticated, hasUsers, onOpenVideoModal }: HeroProps) {
    const reducedMotion = useReducedMotion();

    const [selectedVariantIndex, setSelectedVariantIndex] = useState(0);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [activeMonthIndex, setActiveMonthIndex] = useState(11); // Default: Des (titik puncak kanan)
    const [displayNominal, setDisplayNominal] = useState(() =>
        formatRupiah(BUDGET_DATASETS[0].totalNominal),
    );

    const dataset = BUDGET_DATASETS[selectedVariantIndex];
    const activePoint = dataset.points[activeMonthIndex] ?? dataset.points[11];

    const sectionRef = useRef<HTMLElement | null>(null);
    const bgParallaxRef = useRef<HTMLDivElement | null>(null);
    const glassCardRef = useRef<HTMLDivElement | null>(null);
    const linePathRef = useRef<SVGPathElement | null>(null);
    const areaPathRef = useRef<SVGPathElement | null>(null);
    const activeDotRef = useRef<SVGGElement | null>(null);
    const dropdownRef = useRef<HTMLDivElement | null>(null);
    const previousNominalRef = useRef<number>(BUDGET_DATASETS[0].totalNominal);

    // Tutup dropdown varian saat klik di luar
    useEffect(() => {
        if (!dropdownOpen) return;

        const handlePointerDown = (event: Event) => {
            const target = event.target;
            if (!(target instanceof Node)) return;
            if (dropdownRef.current?.contains(target)) return;
            setDropdownOpen(false);
        };

        document.addEventListener('pointerdown', handlePointerDown);
        return () => document.removeEventListener('pointerdown', handlePointerDown);
    }, [dropdownOpen]);

    // Setel opacity: 0 sebelum paint agar animasi Hero bebas flicker saat pertama tampil
    useLayoutEffect(() => {
        const section = sectionRef.current;
        if (!section || reducedMotion) return;

        const targets = section.querySelectorAll<HTMLElement>(
            '[data-hero-reveal], [data-hero-trust], [data-hero-minicard], [data-hero-script]',
        );
        targets.forEach((el) => {
            el.style.opacity = '0';
        });
        if (glassCardRef.current) {
            glassCardRef.current.style.opacity = '0';
        }
    }, [reducedMotion]);

    // Koreografi Entrance Hero dengan Anime.js Timeline
    useEffect(() => {
        const section = sectionRef.current;
        if (!section) return;

        if (reducedMotion) {
            setDisplayNominal(formatRupiah(BUDGET_DATASETS[0].totalNominal));
            return;
        }

        const leftItems = section.querySelectorAll('[data-hero-reveal]');
        const trustItems = section.querySelectorAll('[data-hero-trust]');
        const miniCards = section.querySelectorAll('[data-hero-minicard]');
        const scriptPath = section.querySelectorAll('[data-hero-script]');

        const tl = createTimeline({
            defaults: {
                ease: 'outExpo',
            },
        });

        if (leftItems.length > 0) {
            tl.add(
                leftItems,
                {
                    opacity: [0, 1],
                    translateY: [30, 0],
                    duration: 900,
                    delay: stagger(95),
                },
                0,
            );
        }

        if (glassCardRef.current) {
            tl.add(
                glassCardRef.current,
                {
                    opacity: [0, 1],
                    translateY: [36, 0],
                    scale: [0.96, 1],
                    duration: 1050,
                },
                160,
            );
        }

        if (miniCards.length > 0) {
            tl.add(
                miniCards,
                {
                    opacity: [0, 1],
                    translateY: [22, 0],
                    duration: 780,
                    delay: stagger(90),
                },
                420,
            );
        }

        if (trustItems.length > 0) {
            tl.add(
                trustItems,
                {
                    opacity: [0, 1],
                    translateY: [18, 0],
                    duration: 750,
                    delay: stagger(85),
                },
                480,
            );
        }

        if (scriptPath.length > 0) {
            tl.add(
                scriptPath,
                {
                    opacity: [0, 1],
                    translateY: [12, 0],
                    rotate: [-8, -5],
                    duration: 900,
                },
                680,
            );
        }

        return () => {
            tl.pause();
        };
    }, [reducedMotion]);

    // Animasi Grafik SVG + Angka Nominal saat mount atau saat pengguna mengganti Varian Anggaran
    useEffect(() => {
        const targetNominal = dataset.totalNominal;
        const fromNominal = previousNominalRef.current;
        previousNominalRef.current = targetNominal;

        const numAnim = animateNumber({
            from: fromNominal === targetNominal ? Math.round(targetNominal * 0.72) : fromNominal,
            to: targetNominal,
            duration: 1250,
            reducedMotion,
            formatter: formatRupiah,
            onUpdate: (formatted) => setDisplayNominal(formatted),
        });

        if (reducedMotion) {
            return () => {
                numAnim?.pause();
            };
        }

        const animations: { pause: () => void }[] = [];
        if (numAnim) animations.push(numAnim);

        if (linePathRef.current) {
            const drawable = svg.createDrawable(linePathRef.current);
            const drawAnim = animate(drawable, {
                draw: ['0 0', '0 1'],
                duration: 1350,
                ease: 'outQuart',
            });
            animations.push(drawAnim);
        }

        if (areaPathRef.current) {
            const areaAnim = animate(areaPathRef.current, {
                opacity: [0, 1],
                translateY: [10, 0],
                duration: 1100,
                ease: 'outCubic',
            });
            animations.push(areaAnim);
        }

        const section = sectionRef.current;
        if (section) {
            const metricValues = section.querySelectorAll('[data-metric-value]');
            if (metricValues.length > 0) {
                const metricAnim = animate(metricValues, {
                    opacity: [0.35, 1],
                    translateY: [6, 0],
                    duration: 520,
                    delay: stagger(60),
                    ease: 'outQuad',
                });
                animations.push(metricAnim);
            }

            const chartDots = section.querySelectorAll('[data-chart-dot]');
            if (chartDots.length > 0) {
                const dotsAnim = animate(chartDots, {
                    scale: [0.2, 1],
                    opacity: [0, 1],
                    duration: 520,
                    delay: stagger(45, { start: 180 }),
                    ease: 'outBack',
                });
                animations.push(dotsAnim);
            }
        }

        return () => {
            animations.forEach((a) => a.pause());
        };
    }, [dataset, reducedMotion]);

    // Animasi perpindahan titik bulan aktif dengan Spring Anime.js
    useEffect(() => {
        if (!activeDotRef.current || reducedMotion) return;

        const dotAnim = animate(activeDotRef.current, {
            scale: [0.7, 1],
            ease: createSpring({ stiffness: 220, damping: 14 }),
        });

        return () => {
            dotAnim.pause();
        };
    }, [activeMonthIndex, selectedVariantIndex, reducedMotion]);

    // Parallax halus mengikuti kursor menggunakan Anime.js
    const handlePointerMove = useCallback(
        (event: React.PointerEvent<HTMLElement>) => {
            if (reducedMotion || event.pointerType === 'touch') return;
            const rect = event.currentTarget.getBoundingClientRect();
            const relX = (event.clientX - rect.left) / rect.width - 0.5;
            const relY = (event.clientY - rect.top) / rect.height - 0.5;

            if (bgParallaxRef.current) {
                animate(bgParallaxRef.current, {
                    translateX: relX * -18,
                    translateY: relY * -12,
                    duration: 900,
                    ease: 'outQuad',
                });
            }

            if (glassCardRef.current) {
                animate(glassCardRef.current, {
                    rotateY: relX * 3.2,
                    rotateX: relY * -2.8,
                    duration: 600,
                    ease: 'outQuad',
                });
            }
        },
        [reducedMotion],
    );

    const handlePointerLeave = useCallback(() => {
        if (reducedMotion) return;
        if (bgParallaxRef.current) {
            animate(bgParallaxRef.current, {
                translateX: 0,
                translateY: 0,
                duration: 1100,
                ease: 'outExpo',
            });
        }
        if (glassCardRef.current) {
            animate(glassCardRef.current, {
                rotateY: 0,
                rotateX: 0,
                duration: 900,
                ease: 'outExpo',
            });
        }
    }, [reducedMotion]);

    return (
        <section
            id="top"
            ref={sectionRef}
            aria-labelledby="hero-heading"
            onPointerMove={handlePointerMove}
            onPointerLeave={handlePointerLeave}
            className="relative isolate overflow-hidden bg-[#051821] pb-24 pt-28 text-white sm:pb-28 sm:pt-32 lg:pb-32 lg:pt-36"
        >
            {/* Latar Pegunungan Sinematik + Cahaya Aurora Mint */}
            <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
                <div
                    ref={bgParallaxRef}
                    className="absolute -inset-6 will-change-transform"
                >
                    <img
                        src="/images/landing/hero-mountain.jpg"
                        alt=""
                        className="h-full w-full object-cover object-[62%_center] opacity-90 sm:object-center"
                        loading="eager"
                    />
                </div>

                {/* Gradasi gelap di sisi kiri & atas agar tipografi putih sangat kontras seperti referensi Novara */}
                <div
                    className="absolute inset-0"
                    style={{
                        background:
                            'linear-gradient(98deg, rgba(4,20,28,0.95) 0%, rgba(5,24,33,0.84) 38%, rgba(7,32,43,0.42) 70%, rgba(6,26,35,0.68) 100%)',
                    }}
                />
                <div
                    className="absolute inset-0"
                    style={{
                        background:
                            'radial-gradient(48rem 32rem at 64% 44%, rgba(139,230,220,0.22), transparent 68%), radial-gradient(38rem 26rem at 48% 58%, rgba(92,202,192,0.18), transparent 65%)',
                    }}
                />
                <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-[#04131B]/90 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[#04141C] via-[#04141C]/60 to-transparent" />
            </div>

            <div className="relative z-10 mx-auto max-w-7xl px-6 lg:px-8">
                <div className="grid items-center gap-12 lg:grid-cols-[1.02fr_1.05fr] lg:gap-10 xl:gap-14">
                    {/* Kolom Kiri: Headline, Narasi, 2 CTA, dan 3 Trust Badges */}
                    <div className="max-w-xl">
                        <p
                            data-hero-reveal
                            className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#8BE6DC]/90 sm:text-xs"
                        >
                            Transparan Hari Ini. Akuntabel Setiap Saat.
                        </p>

                        <h1
                            id="hero-heading"
                            data-hero-reveal
                            className="mt-4 text-balance font-sans text-[clamp(2.55rem,5.2vw,4.35rem)] font-bold leading-[1.05] tracking-[-0.035em] text-white"
                        >
                            <span className="block text-white">Kelola Anggaran.</span>
                            <span className="block bg-gradient-to-r from-[#A8F5EC] via-[#8BE6DC] to-[#6CD4C9] bg-clip-text text-transparent">
                                Sekolah Lebih
                            </span>
                            <span className="block bg-gradient-to-r from-[#A8F5EC] via-[#8BE6DC] to-[#6CD4C9] bg-clip-text text-transparent">
                                Terarah.
                            </span>
                        </h1>

                        <p
                            data-hero-reveal
                            className="mt-6 max-w-lg text-pretty text-[15.5px] leading-[1.75] text-white/80 sm:text-[16.5px]"
                        >
                            Solusi tata kelola keuangan BOSP terpadu untuk membantu sekolah menyusun RKAS,
                            menatausahakan BKU, menjaga kepatuhan pajak, dan menyajikan laporan yang siap diaudit.
                        </p>

                        {/* Baris Tombol CTA: Primary Mint Pill + Secondary Watch Video Pill */}
                        <div data-hero-reveal className="mt-8 flex flex-wrap items-center gap-3.5 sm:gap-4">
                            <AccountActions
                                authenticated={authenticated}
                                hasUsers={hasUsers}
                                context="hero"
                            />

                            <button
                                type="button"
                                onClick={onOpenVideoModal}
                                className="landing-focus group inline-flex items-center gap-3 rounded-full border border-white/25 bg-[#08222C]/70 py-2 pl-2 pr-5 text-[14px] font-medium text-white backdrop-blur-md transition-all duration-300 hover:border-[#8BE6DC]/60 hover:bg-[#0C2F3C]/85"
                            >
                                <span className="flex h-9 w-9 items-center justify-center rounded-full border border-[#8BE6DC]/40 bg-[#8BE6DC]/15 text-[#8BE6DC] transition-transform duration-300 group-hover:scale-105 group-hover:bg-[#8BE6DC] group-hover:text-[#06222B]">
                                    <PlayIcon />
                                </span>
                                <span>Tonton Panduan</span>
                            </button>
                        </div>

                        {/* 3 Trust Badges dengan pemisah garis vertikal seperti referensi Novara */}
                        <div className="mt-12 grid grid-cols-3 items-center gap-3 border-t border-white/10 pt-7 sm:gap-5">
                            {TRUST_BADGES.map((badge, index) => (
                                <div
                                    key={badge.title}
                                    data-hero-trust
                                    className={cn(
                                        'flex items-center gap-2.5 sm:gap-3',
                                        index > 0 && 'border-l border-white/15 pl-3 sm:pl-5',
                                    )}
                                >
                                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#8BE6DC]/[0.12] text-[#8BE6DC] ring-1 ring-[#8BE6DC]/25">
                                        <badge.icon />
                                    </span>
                                    <div className="min-w-0">
                                        <p className="truncate text-[11.5px] font-semibold leading-tight text-white/95 sm:text-[12.5px]">
                                            {badge.title}
                                        </p>
                                        <p className="mt-0.5 truncate text-[10.5px] leading-tight text-white/65 sm:text-[11.5px]">
                                            {badge.subtitle}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Kolom Kanan: Kartu Glassmorphism Portfolio/Anggaran Interaktif */}
                    <div className="relative perspective-1000">
                        {/* Pendar cahaya di belakang kartu kaca */}
                        <div
                            aria-hidden
                            className="pointer-events-none absolute -inset-4 -z-10 rounded-[2.5rem] bg-gradient-to-tr from-[#5CCAC0]/20 via-[#8BE6DC]/15 to-transparent blur-2xl"
                        />

                        <div
                            ref={glassCardRef}
                            style={{ transformStyle: 'preserve-3d' }}
                            className="relative rounded-[2rem] border border-white/25 bg-gradient-to-b from-white/[0.13] via-white/[0.08] to-[#08222D]/65 p-5 shadow-[0_32px_80px_-20px_rgba(0,0,0,0.75),inset_0_1px_1px_rgba(255,255,255,0.3)] backdrop-blur-2xl sm:p-7"
                        >
                            {/* Baris Atas Kartu: Total Pagu + Dropdown Varian */}
                            <div className="flex flex-wrap items-start justify-between gap-4">
                                <div>
                                    <p className="text-[12.5px] font-medium tracking-wide text-white/75">
                                        Total Pagu Terkelola
                                    </p>
                                    <p className="mt-1.5 font-sans text-3xl font-bold tracking-[-0.03em] text-white tabular-nums sm:text-[2.35rem]">
                                        {displayNominal}
                                    </p>
                                    <div className="mt-2 flex items-center gap-2 text-xs">
                                        <span className="inline-flex items-center gap-1 font-semibold text-[#8BE6DC]">
                                            <TrendUpArrowIcon />
                                            {dataset.growthPercent}
                                        </span>
                                        <span className="text-white/60">{dataset.growthNote}</span>
                                    </div>
                                </div>

                                {/* Dropdown Pill Varian BOSP */}
                                <div ref={dropdownRef} className="relative">
                                    <button
                                        type="button"
                                        onClick={() => setDropdownOpen((open) => !open)}
                                        aria-expanded={dropdownOpen}
                                        aria-label="Pilih varian anggaran BOSP untuk simulasi grafik"
                                        className="landing-focus inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/[0.09] px-3.5 py-1.5 text-xs font-medium text-white/90 backdrop-blur-md transition-colors hover:border-[#8BE6DC]/60 hover:bg-white/[0.15]"
                                    >
                                        <span>{dataset.periodLabel}</span>
                                        <ChevronDownIcon open={dropdownOpen} />
                                    </button>

                                    {dropdownOpen ? (
                                        <div
                                            role="menu"
                                            className="absolute right-0 top-[calc(100%_+_0.5rem)] z-30 w-52 overflow-hidden rounded-2xl border border-white/20 bg-[#07212B]/95 p-1.5 shadow-2xl backdrop-blur-2xl"
                                        >
                                            {BUDGET_DATASETS.map((item, idx) => {
                                                const selected = idx === selectedVariantIndex;
                                                return (
                                                    <button
                                                        key={item.key}
                                                        type="button"
                                                        role="menuitem"
                                                        onClick={() => {
                                                            setSelectedVariantIndex(idx);
                                                            setActiveMonthIndex(11);
                                                            setDropdownOpen(false);
                                                        }}
                                                        className={cn(
                                                            'flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs font-medium transition-colors',
                                                            selected
                                                                ? 'bg-[#8BE6DC]/20 text-[#8BE6DC]'
                                                                : 'text-white/80 hover:bg-white/[0.08] hover:text-white',
                                                        )}
                                                    >
                                                        <span>{item.label}</span>
                                                        {selected ? (
                                                            <span className="h-1.5 w-1.5 rounded-full bg-[#8BE6DC]" />
                                                        ) : null}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    ) : null}
                                </div>
                            </div>

                            {/* Area Grafik SVG Spline (Jan - Des) */}
                            <div className="relative mt-5 pt-2">
                                {/* Tooltip Bulan Aktif */}
                                <div className="mb-1 flex items-center justify-between text-[11px] text-white/65">
                                    <span>Realisasi Kumulatif ({dataset.label})</span>
                                    <span className="rounded-full border border-[#8BE6DC]/30 bg-[#8BE6DC]/15 px-2.5 py-0.5 font-semibold text-[#9CF4EA] tabular-nums">
                                        {activePoint.month}: {activePoint.value}
                                    </span>
                                </div>

                                <div className="relative h-[148px] w-full sm:h-[164px]">
                                    <svg
                                        viewBox="0 0 420 148"
                                        className="h-full w-full overflow-visible"
                                        aria-label={`Grafik realisasi anggaran ${dataset.label}`}
                                    >
                                        <defs>
                                            <linearGradient id="hero-chart-area" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="#8BE6DC" stopOpacity="0.38" />
                                                <stop offset="65%" stopColor="#58BEB3" stopOpacity="0.1" />
                                                <stop offset="100%" stopColor="#58BEB3" stopOpacity="0.0" />
                                            </linearGradient>
                                            <linearGradient id="hero-chart-stroke" x1="0" y1="0" x2="1" y2="0">
                                                <stop offset="0%" stopColor="#72D7CC" />
                                                <stop offset="60%" stopColor="#9AF2E8" />
                                                <stop offset="100%" stopColor="#FFFFFF" />
                                            </linearGradient>
                                            <filter id="hero-line-glow" x="-15%" y="-25%" width="130%" height="150%">
                                                <feGaussianBlur stdDeviation="3.5" result="blur" />
                                                <feMerge>
                                                    <feMergeNode in="blur" />
                                                    <feMergeNode in="SourceGraphic" />
                                                </feMerge>
                                            </filter>
                                        </defs>

                                        {/* Garis bantu horizontal tipis */}
                                        {[32, 68, 104, 140].map((y) => (
                                            <line
                                                key={y}
                                                x1="12"
                                                y1={y}
                                                x2="408"
                                                y2={y}
                                                stroke="#FFFFFF"
                                                strokeOpacity="0.08"
                                                strokeDasharray={y === 140 ? undefined : '3 5'}
                                            />
                                        ))}

                                        {/* Area di bawah kurva */}
                                        <path
                                            ref={areaPathRef}
                                            d={dataset.areaPath}
                                            fill="url(#hero-chart-area)"
                                        />

                                        {/* Garis kurva utama beranimasi Anime.js */}
                                        <path
                                            ref={linePathRef}
                                            d={dataset.linePath}
                                            fill="none"
                                            stroke="url(#hero-chart-stroke)"
                                            strokeWidth="2.8"
                                            strokeLinecap="round"
                                            filter="url(#hero-line-glow)"
                                        />

                                        {/* Garis vertikal halus pada titik aktif */}
                                        <line
                                            x1={activePoint.x}
                                            y1={activePoint.y}
                                            x2={activePoint.x}
                                            y2={140}
                                            stroke="#9CF4EA"
                                            strokeOpacity="0.35"
                                            strokeDasharray="2 3"
                                        />

                                        {/* Titik interaktif per bulan */}
                                        {dataset.points.map((pt, idx) => {
                                            const isCurrent = idx === activeMonthIndex;
                                            return (
                                                <g
                                                    key={pt.month}
                                                    className="cursor-pointer"
                                                    onMouseEnter={() => setActiveMonthIndex(idx)}
                                                    onClick={() => setActiveMonthIndex(idx)}
                                                >
                                                    <circle
                                                        cx={pt.x}
                                                        cy={pt.y}
                                                        r={12}
                                                        fill="transparent"
                                                    />
                                                    <circle
                                                        data-chart-dot
                                                        cx={pt.x}
                                                        cy={pt.y}
                                                        r={isCurrent ? 4.5 : 2.2}
                                                        fill={isCurrent ? '#FFFFFF' : '#8BE6DC'}
                                                        fillOpacity={isCurrent ? 1 : 0.45}
                                                        style={{ transformOrigin: `${pt.x}px ${pt.y}px` }}
                                                    />
                                                </g>
                                            );
                                        })}

                                        {/* Orb bercahaya pada titik aktif */}
                                        <g
                                            ref={activeDotRef}
                                            style={{
                                                transformOrigin: `${activePoint.x}px ${activePoint.y}px`,
                                            }}
                                        >
                                            <circle
                                                cx={activePoint.x}
                                                cy={activePoint.y}
                                                r="10"
                                                fill="#8BE6DC"
                                                fillOpacity="0.28"
                                            />
                                            <circle
                                                cx={activePoint.x}
                                                cy={activePoint.y}
                                                r="5.2"
                                                fill="#FFFFFF"
                                                stroke="#8BE6DC"
                                                strokeWidth="2"
                                            />
                                        </g>
                                    </svg>
                                </div>

                                {/* Label Bulan Jan - Des */}
                                <div className="mt-1 grid grid-cols-12 text-center text-[10px] font-medium text-white/60 sm:text-[11px]">
                                    {MONTHS.map((m, idx) => (
                                        <button
                                            key={m}
                                            type="button"
                                            onMouseEnter={() => setActiveMonthIndex(idx)}
                                            onClick={() => setActiveMonthIndex(idx)}
                                            className={cn(
                                                'rounded py-0.5 transition-colors',
                                                idx === activeMonthIndex
                                                    ? 'font-bold text-[#8BE6DC]'
                                                    : 'hover:text-white',
                                            )}
                                        >
                                            {m}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* 3 Mini Sub-Cards di bagian bawah Kartu Kaca (persis seperti referensi Novara) */}
                            <div className="mt-5 grid grid-cols-3 gap-2.5 sm:gap-3.5">
                                <div
                                    data-hero-minicard
                                    className="rounded-2xl border border-white/15 bg-white/[0.07] p-3 backdrop-blur-md transition-colors hover:border-[#8BE6DC]/40 hover:bg-white/[0.11] sm:p-4"
                                >
                                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#8BE6DC]/15 text-[#8BE6DC]">
                                        <MiniGrowthIcon />
                                    </span>
                                    <p className="mt-2.5 truncate text-[10.5px] font-medium text-white/65 sm:text-xs">
                                        Serapan Pagu
                                    </p>
                                    <p
                                        data-metric-value
                                        className="mt-0.5 font-sans text-sm font-bold text-white tabular-nums sm:text-lg"
                                    >
                                        {dataset.metrics.growth}
                                    </p>
                                </div>

                                <div
                                    data-hero-minicard
                                    className="rounded-2xl border border-white/15 bg-white/[0.07] p-3 backdrop-blur-md transition-colors hover:border-[#8BE6DC]/40 hover:bg-white/[0.11] sm:p-4"
                                >
                                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#8BE6DC]/15 text-[#8BE6DC]">
                                        <MiniPieIcon />
                                    </span>
                                    <p className="mt-2.5 truncate text-[10.5px] font-medium text-white/65 sm:text-xs">
                                        Alokasi BKU
                                    </p>
                                    <p
                                        data-metric-value
                                        className="mt-0.5 font-sans text-sm font-bold text-white sm:text-lg"
                                    >
                                        {dataset.metrics.diversification}
                                    </p>
                                </div>

                                <div
                                    data-hero-minicard
                                    className="rounded-2xl border border-white/15 bg-white/[0.07] p-3 backdrop-blur-md transition-colors hover:border-[#8BE6DC]/40 hover:bg-white/[0.11] sm:p-4"
                                >
                                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#8BE6DC]/15 text-[#8BE6DC]">
                                        <MiniShieldIcon />
                                    </span>
                                    <p className="mt-2.5 truncate text-[10.5px] font-medium text-white/65 sm:text-xs">
                                        Risiko Audit
                                    </p>
                                    <p
                                        data-metric-value
                                        className="mt-0.5 font-sans text-sm font-bold text-white sm:text-lg"
                                    >
                                        {dataset.metrics.risk}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Teks Aksen Kaligrafi di kanan bawah kartu kaca seperti referensi ("Progress with Purpose.") */}
                        <div
                            data-hero-script
                            aria-hidden
                            className="mt-5 flex justify-end pr-2 sm:pr-4"
                            style={{ transform: 'rotate(-5deg)' }}
                        >
                            <p className="font-display text-lg italic leading-snug tracking-wide text-white/85 drop-shadow-[0_2px_10px_rgba(0,0,0,0.6)] sm:text-xl">
                                <span className="block">Progress</span>
                                <span className="-mt-1 block pl-3 text-[#9CF4EA]">with Purpose.</span>
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Transisi Wave Bawah Hero menuju Section Layanan yang Berlatar Putih/Terang */}
            <div aria-hidden className="pointer-events-none absolute inset-x-0 -bottom-px z-20 overflow-hidden leading-none">
                <svg
                    viewBox="0 0 1440 74"
                    preserveAspectRatio="none"
                    className="h-10 w-full fill-[#F8FBFB] dark:fill-[#051319] sm:h-14 lg:h-16"
                >
                    <path d="M0,18 C240,68 540,74 920,58 C1180,46 1340,26 1440,8 L1440,74 L0,74 Z" />
                </svg>
            </div>
        </section>
    );
}

function PlayIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="currentColor" className="ml-0.5 h-3.5 w-3.5">
            <path d="M8 5.5v13l10.5-6.5L8 5.5Z" />
        </svg>
    );
}

function TrendUpArrowIcon() {
    return (
        <svg
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-3.5 w-3.5"
        >
            <path d="M8 12.5V3.5" />
            <path d="m4.5 7 3.5-3.5L11.5 7" />
        </svg>
    );
}

function ChevronDownIcon({ open }: { open: boolean }) {
    return (
        <svg
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
            className={cn('h-3.5 w-3.5 transition-transform duration-200', open && 'rotate-180')}
        >
            <path d="m4 6 4 4 4-4" />
        </svg>
    );
}

function ChartBarsIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
            <path d="M6 20V14" />
            <path d="M12 20V10" />
            <path d="M18 20V4" />
        </svg>
    );
}

function ShieldBadgeIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
            <path d="M12 3 5 6v6c0 4.5 3 8.2 7 9.8 4-1.6 7-5.3 7-9.8V6l-7-3Z" />
            <path d="m9 12 2 2 4-4" />
        </svg>
    );
}

function UsersPartnershipIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
    );
}

function MiniGrowthIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
            <path d="m3 16 6-6 4 4 8-8" />
            <path d="M15 6h6v6" />
            <path d="M6 20v-3" />
            <path d="M12 20v-5" />
            <path d="M18 20v-7" />
        </svg>
    );
}

function MiniPieIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
            <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
            <path d="M22 12A10 10 0 0 0 12 2v10z" />
        </svg>
    );
}

function MiniShieldIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
            <path d="M12 3 5 6v6c0 4.5 3 8.2 7 9.8 4-1.6 7-5.3 7-9.8V6l-7-3Z" />
            <path d="m9.5 12 1.8 1.8 3.5-3.6" />
        </svg>
    );
}
