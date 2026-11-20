import { useState } from 'react';

import { animate, animateNumber, stagger, useAnimeInView } from '@/lib/anime';
import { cn } from '@/lib/utils';

type StatItem = {
    id: string;
    target: number;
    decimals?: number;
    prefix?: string;
    suffix: string;
    label: string;
    icon: () => JSX.Element;
};

const STATS: readonly StatItem[] = [
    {
        id: 'clients',
        target: 1200,
        suffix: '+',
        label: 'Transaksi BKU Rapi',
        icon: UsersGroupStatIcon,
    },
    {
        id: 'rating',
        target: 4.9,
        decimals: 1,
        suffix: '/5',
        label: 'Kepuasan Bendahara',
        icon: StarStatIcon,
    },
    {
        id: 'assets',
        target: 750,
        prefix: 'Rp ',
        suffix: 'Jt+',
        label: 'Kapasitas Pagu Tahunan',
        icon: BarChartStatIcon,
    },
    {
        id: 'experience',
        target: 100,
        suffix: '%',
        label: 'Kepatuhan Format BOSP',
        icon: ShieldCheckStatIcon,
    },
];

/**
 * Section 4: 4-Column Stats Bar dengan pemisah garis vertikal & ikon duo-tone
 * persis seperti referensi Novara Wealth Advisory, dianimasikan dengan Anime.js.
 */
export function StatsSection() {
    const [values, setValues] = useState<Record<string, string>>(() => ({
        clients: '1.200+',
        rating: '4,9/5',
        assets: 'Rp 750Jt+',
        experience: '100%',
    }));

    const { ref: sectionRef } = useAnimeInView<HTMLElement>(
        (container, reducedMotion) => {
            const items = container.querySelectorAll('[data-stat-item]');
            const anims: { pause: () => void }[] = [];

            if (!reducedMotion && items.length > 0) {
                anims.push(
                    animate(items, {
                        opacity: [0, 1],
                        translateY: [22, 0],
                        duration: 780,
                        delay: stagger(95),
                        ease: 'outExpo',
                    }),
                );
            }

            STATS.forEach((stat) => {
                const numAnim = animateNumber({
                    from: 0,
                    to: stat.target,
                    decimals: stat.decimals ?? 0,
                    duration: 1450,
                    reducedMotion,
                    onUpdate: (formatted) => {
                        setValues((prev) => ({
                            ...prev,
                            [stat.id]: `${stat.prefix ?? ''}${formatted}${stat.suffix}`,
                        }));
                    },
                });
                if (numAnim) anims.push(numAnim);
            });

            return () => {
                anims.forEach((a) => a.pause());
            };
        },
        {
            threshold: 0.2,
            initialHideSelector: '[data-stat-item]',
        },
    );

    return (
        <section
            id="statistik"
            ref={sectionRef}
            aria-label="Statistik pencapaian SIKAS"
            className="relative isolate scroll-mt-24 bg-[#F8FBFB] pb-16 pt-2 dark:bg-[#051319] sm:pb-20"
        >
            <div className="mx-auto max-w-7xl px-6 lg:px-8">
                <div className="grid grid-cols-2 gap-y-8 border-y border-[#09242E]/10 py-8 dark:border-white/10 lg:grid-cols-4 lg:gap-y-0 lg:py-10">
                    {STATS.map((stat, index) => (
                        <div
                            key={stat.id}
                            data-stat-item
                            className={cn(
                                'flex items-center justify-center gap-3.5 px-4 sm:gap-4 sm:px-6',
                                index % 2 === 1 && 'border-l border-[#09242E]/[0.12] dark:border-white/10',
                                index === 2 && 'lg:border-l lg:border-[#09242E]/[0.12] dark:lg:border-white/10',
                            )}
                        >
                            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-[#0D3944] dark:text-[#8BE6DC]">
                                <stat.icon />
                            </span>

                            <div>
                                <p className="font-sans text-2xl font-bold leading-none tracking-[-0.03em] text-[#08222B] tabular-nums dark:text-white sm:text-[1.75rem]">
                                    {values[stat.id]}
                                </p>
                                <p className="mt-1.5 text-[12px] font-medium text-[#4A6872] dark:text-white/65 sm:text-[13px]">
                                    {stat.label}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

function UsersGroupStatIcon() {
    return (
        <svg viewBox="0 0 40 40" fill="none" className="h-10 w-10">
            <circle cx="20" cy="14" r="4.5" fill="#8BE6DC" fillOpacity="0.55" stroke="currentColor" strokeWidth="2" />
            <circle cx="11.5" cy="17" r="3.2" stroke="currentColor" strokeWidth="1.9" />
            <circle cx="28.5" cy="17" r="3.2" stroke="currentColor" strokeWidth="1.9" />
            <path
                d="M12.5 30V27.5C12.5 24.2 15.2 21.5 18.5 21.5H21.5C24.8 21.5 27.5 24.2 27.5 27.5V30"
                fill="#8BE6DC"
                fillOpacity="0.4"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
            />
            <path
                d="M6.5 30V28.2C6.5 25.8 8.2 23.8 10.5 23.3M33.5 30V28.2C33.5 25.8 31.8 23.8 29.5 23.3"
                stroke="currentColor"
                strokeWidth="1.9"
                strokeLinecap="round"
            />
        </svg>
    );
}

function StarStatIcon() {
    return (
        <svg viewBox="0 0 40 40" fill="none" className="h-10 w-10">
            <path
                d="M20 7.5L23.7 15L32 16.2L26 22L27.4 30.2L20 26.3L12.6 30.2L14 22L8 16.2L16.3 15L20 7.5Z"
                fill="#8BE6DC"
                fillOpacity="0.45"
                stroke="currentColor"
                strokeWidth="2.1"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

function BarChartStatIcon() {
    return (
        <svg viewBox="0 0 40 40" fill="none" className="h-10 w-10">
            <rect x="9" y="22" width="5" height="9" rx="1.2" fill="#8BE6DC" fillOpacity="0.4" stroke="currentColor" strokeWidth="2" />
            <rect x="17.5" y="16" width="5" height="15" rx="1.2" fill="#8BE6DC" fillOpacity="0.55" stroke="currentColor" strokeWidth="2" />
            <rect x="26" y="10" width="5" height="21" rx="1.2" fill="#8BE6DC" fillOpacity="0.75" stroke="currentColor" strokeWidth="2" />
        </svg>
    );
}

function ShieldCheckStatIcon() {
    return (
        <svg viewBox="0 0 40 40" fill="none" className="h-10 w-10">
            <path
                d="M20 7.5L9.5 11.8V20C9.5 26.8 14 32.5 20 34.5C26 32.5 30.5 26.8 30.5 20V11.8L20 7.5Z"
                fill="#8BE6DC"
                fillOpacity="0.45"
                stroke="currentColor"
                strokeWidth="2.1"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <path
                d="M15.5 20.2L18.6 23.3L24.8 17"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

export default StatsSection;
