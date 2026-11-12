import { Counter } from '@/Components/Landing/ui/Counter';
import { cn } from '@/lib/utils';

type Stat = {
    /** Nilai numerik untuk Counter animasi. */
    to: number;
    suffix?: string;
    /** Bila diisi, ditampilkan apa adanya tanpa animasi angka. */
    raw?: string;
    label: string;
};

const STATS: readonly Stat[] = [
    { to: 4, label: 'Varian anggaran' },
    { to: 2, label: 'Format ekspor (PDF & Excel)' },
    { to: 0, raw: '24/7', label: 'Akses tanpa batas jam kerja' },
    { to: 100, suffix: '%', label: 'Transaksi tercatat' },
];

const CAPABILITIES: readonly string[] = [
    'RKAS',
    'BKU',
    'Buku Pembantu',
    'Pajak',
    'Penutupan Kas',
    'Rekap Realisasi',
    'ARKAS',
    'Multi-Tahun',
];

export function StatsSection() {
    return (
        <section aria-label="SIKAS dalam angka" className="relative isolate overflow-hidden">
            <div
                aria-hidden
                className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold-500/25 to-transparent"
            />
            <div
                aria-hidden
                className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/60 to-transparent dark:from-white/[0.025] dark:to-transparent"
            />

            <div className="relative z-10 mx-auto max-w-7xl px-6 lg:px-8">
                {/* Mobile: 2 kolom dengan pemisah rapi; desktop: 4 kolom. */}
                <div className="grid grid-cols-2 py-10 sm:py-12 lg:grid-cols-4 lg:py-14">
                    {STATS.map((stat, index) => (
                        <div
                            key={stat.label}
                            className={cn(
                                'flex flex-col items-center px-3 pb-6 pt-4 text-center sm:px-4 lg:border-l lg:border-ink-900/[0.08] lg:border-t-0 lg:px-6 lg:py-0 dark:lg:border-white/10',
                                index % 2 === 1 && 'border-l border-ink-900/[0.08] dark:border-white/10',
                                index >= 2 && 'border-t border-ink-900/[0.08] dark:border-white/10',
                                index === 0 && 'lg:border-l-0',
                            )}
                        >
                            <Counter
                                to={stat.to}
                                suffix={stat.suffix}
                                raw={stat.raw}
                                className="font-display text-[clamp(2rem,4vw,3rem)] font-semibold leading-none tracking-[-0.02em] text-ink-900 dark:text-white"
                            />
                            <span
                                aria-hidden
                                className="mt-3 block h-px w-6 bg-gradient-to-r from-transparent via-gold-500/60 to-transparent"
                            />
                            <p className="mt-3 flex min-h-[2.75rem] max-w-[10.5rem] items-start justify-center text-center text-[10px] font-semibold uppercase leading-[1.6] tracking-[0.12em] text-ink-900/60 lg:max-w-none dark:text-white/55">
                                {stat.label}
                            </p>
                        </div>
                    ))}
                </div>

                <div
                    aria-hidden
                    className="mx-auto mb-6 h-px w-full max-w-5xl bg-gradient-to-r from-transparent via-gold-500/15 to-transparent"
                />

                {/* Marquee kapabilitas — dekoratif, teks lengkap tersedia untuk pembaca layar. */}
                <p className="sr-only">
                    Kapabilitas SIKAS: RKAS, BKU, Buku Pembantu, Pajak, Penutupan Kas, Rekap Realisasi,
                    ARKAS, Multi-Tahun.
                </p>
                <div className="mask-fade-x relative overflow-hidden pb-12 sm:pb-14">
                    <div
                        aria-hidden
                        className="flex w-max animate-marquee items-center motion-reduce:animate-none hover:[animation-play-state:paused]"
                    >
                        {[...CAPABILITIES, ...CAPABILITIES].map((capability, index) => (
                            <span key={`${capability}-${index}`} className="flex items-center">
                                <span className="whitespace-nowrap text-[12px] font-semibold uppercase tracking-[0.28em] text-ink-900/60 dark:text-white/55">
                                    {capability}
                                </span>
                                <span className="mx-6 h-1 w-1 shrink-0 rounded-full bg-gold-500/50 dark:bg-gold-400/40" />
                            </span>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}

export default StatsSection;
