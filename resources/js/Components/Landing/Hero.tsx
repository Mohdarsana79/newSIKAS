import { MagneticButton } from '@/Components/Landing/ui/MagneticButton';
import { AccountActions } from '@/Components/Landing/ui/AccountActions';
import { AuroraBackground } from '@/Components/Landing/ui/AuroraBackground';
import { GradientText } from '@/Components/Landing/ui/GradientText';
import { Reveal } from '@/Components/Landing/ui/Reveal';
import { PlayerStage } from '@/Remotion/PlayerStage';

export type HeroProps = {
    /** Boolean dari `auth.user` (logika halaman lama dipertahankan). */
    authenticated: boolean;
    /** Boolean `hasUsers` dari props Inertia. */
    hasUsers: boolean;
};

const TRUST_LINE = ['RKAS', 'BKU', 'Laporan PDF/Excel', 'Sinkron ARKAS'];

const QUICK_ITEMS = [
    {
        key: 'rkas',
        number: '01',
        title: 'Perencanaan RKAS',
        subtitle: 'Pagu & kode rekening',
        icon: PlanIcon,
    },
    {
        key: 'bku',
        number: '02',
        title: 'Penatausahaan BKU',
        subtitle: 'Buku kas & pajak',
        icon: LedgerIcon,
    },
    {
        key: 'laporan',
        number: '03',
        title: 'Pelaporan & Ekspor',
        subtitle: 'PDF & Excel siap cetak',
        icon: ExportIcon,
    },
];

/**
 * Hero landing page: kartu besar berlapis aurora, headline serif, CTA sesuai
 * state akun, bingkai Remotion Player di kanan, dan quick-bar navigasi modul.
 */
export default function Hero({ authenticated, hasUsers }: HeroProps) {
    return (
        <section
            id="top"
            aria-labelledby="hero-heading"
            className="relative isolate scroll-mt-28 overflow-hidden pb-14 pt-28 sm:pb-16 sm:pt-32 lg:pt-36"
        >
            <div className="mx-auto max-w-7xl px-6 lg:px-8">
                <Reveal>
                    <div className="relative isolate overflow-hidden rounded-[2.5rem] border border-gold-600/20 bg-gradient-to-b from-white via-white to-gold-200/25 shadow-card-light dark:border-gold-400/20 dark:from-ink-850 dark:via-ink-900 dark:to-ink-950 dark:shadow-card-dark">
                        <AuroraBackground variant="hero" />

                        <div className="relative px-5 py-10 sm:px-8 sm:py-12 lg:px-12 lg:py-14 xl:px-14">
                            <div className="grid items-center gap-10 lg:grid-cols-[1fr_1.08fr] lg:gap-10 xl:gap-12">
                                {/* Kolom kiri */}
                                <div>
                                    <Reveal>
                                        <span className="inline-flex items-center gap-2 rounded-full border border-gold-600/25 bg-white/70 px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.13em] text-ink-900/70 backdrop-blur dark:border-gold-400/25 dark:bg-white/[0.06] dark:text-white/70 sm:px-3.5 sm:text-[10.5px] sm:tracking-[0.18em]">
                                            <span aria-hidden className="relative flex h-2 w-2">
                                                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-gold-400/70 motion-reduce:animate-none" />
                                                <span className="relative inline-flex h-2 w-2 rounded-full bg-gold-500 dark:bg-gold-400" />
                                            </span>
                                            Terintegrasi ARKAS · Standar BOSP
                                        </span>
                                    </Reveal>

                                    <Reveal delay={80} className="mt-6">
                                        <h1
                                            id="hero-heading"
                                            className="text-balance font-display text-[clamp(2.35rem,5.4vw,4.4rem)] font-semibold leading-[1.06] tracking-[-0.03em] text-ink-900 dark:text-white sm:leading-[1.02]"
                                        >
                                            <span className="block">Kelola Anggaran Sekolah</span>
                                            <span className="block">
                                                dengan <GradientText>Percaya Diri</GradientText>
                                            </span>
                                        </h1>
                                    </Reveal>

                                    <Reveal delay={160} className="mt-6">
                                        <p className="max-w-xl text-pretty text-[15.5px] leading-[1.8] text-ink-900/65 dark:text-white/60">
                                            SIKAS menyatukan perencanaan RKAS, penatausahaan BKU, pelaporan PDF &amp; Excel,
                                            serta sinkronisasi ARKAS dalam satu alur yang transparan dan akuntabel.
                                        </p>
                                    </Reveal>

                                    <Reveal delay={220} className="mt-8">
                                        <div className="flex flex-wrap items-center gap-x-3 gap-y-3">
                                            <AccountActions
                                                authenticated={authenticated}
                                                hasUsers={hasUsers}
                                                context="hero"
                                            />
                                            <a
                                                href="#fitur"
                                                className="landing-focus group inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold text-ink-900/70 transition-colors duration-300 hover:text-ink-900 dark:text-white/70 dark:hover:text-gold-200"
                                            >
                                                <span className="relative">
                                                    Jelajahi Fitur
                                                    <span
                                                        aria-hidden
                                                        className="absolute -bottom-0.5 left-0 h-px w-full origin-left scale-x-0 bg-gradient-to-r from-gold-500/80 to-transparent transition-transform duration-300 ease-luxe group-hover:scale-x-100"
                                                    />
                                                </span>
                                                <ArrowDownIcon />
                                            </a>
                                        </div>
                                    </Reveal>

                                    <Reveal delay={280} className="mt-9">
                                        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-900/60 dark:text-white/50 sm:text-[11px] sm:tracking-[0.2em]">
                                            {TRUST_LINE.map((item, index) => (
                                                <span key={item} className="inline-flex items-center gap-2.5">
                                                    {index > 0 ? (
                                                        <span
                                                            aria-hidden
                                                            className="h-1 w-1 rounded-full bg-gold-500/70 dark:bg-gold-400/60"
                                                        />
                                                    ) : null}
                                                    {item}
                                                </span>
                                            ))}
                                        </div>
                                    </Reveal>
                                </div>

                                {/* Kolom kanan: visual Player */}
                                <Reveal delay={120} direction="left">
                                    <div className="relative">
                                        <div className="landing-hairline relative overflow-hidden rounded-3xl bg-ink-950/60 p-1 shadow-card-dark lg:-my-2">
                                            <div
                                                aria-hidden
                                                className="pointer-events-none absolute inset-0 bg-gradient-to-br from-brand-500/15 via-transparent to-gold-400/10"
                                            />
                                            <div className="relative overflow-hidden rounded-[1.2rem] bg-ink-950">
                                                <PlayerStage composition="hero" className="w-full" />
                                            </div>
                                        </div>

                                        {/* Label di luar bingkai: memberi konteks tanpa menutupi isi animasi. */}
                                        <div className="relative z-10 mt-6 flex items-center justify-between gap-3 px-1">
                                            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-900/55 dark:text-white/45">
                                                Pratinjau modul · RKAS 2025
                                            </span>
                                            <span className="inline-flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.14em] text-ink-900/45 dark:text-white/35">
                                                <span
                                                    aria-hidden
                                                    className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500/80 motion-reduce:animate-none"
                                                />
                                                Data ilustrasi
                                            </span>
                                        </div>
                                    </div>
                                </Reveal>
                            </div>

                            {/* Quick-bar modul */}
                            <Reveal delay={320}>
                                <div className="mt-10 flex flex-col gap-4 rounded-3xl border border-gold-600/15 bg-white/60 p-4 backdrop-blur-xl dark:border-gold-400/15 dark:bg-white/[0.04] md:mt-12 md:flex-row md:items-center md:justify-between md:rounded-full md:px-5 md:py-3.5">
                                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center md:gap-5">
                                        {QUICK_ITEMS.map((item, index) => (
                                            <div key={item.key} className="flex items-center gap-3">
                                                {index > 0 ? (
                                                    <span
                                                        aria-hidden
                                                        className="hidden h-9 w-px bg-gradient-to-b from-transparent via-gold-500/25 to-transparent md:block dark:via-gold-400/20"
                                                    />
                                                ) : null}
                                                <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-gold-600/25 bg-gradient-to-br from-gold-300/25 to-brand-500/10 text-gold-600 dark:border-gold-400/25 dark:text-gold-300">
                                                    <item.icon />
                                                    <span className="absolute -right-1 -top-1 rounded-full border border-gold-500/40 bg-white px-1 py-px text-[8px] font-bold leading-none text-gold-600 dark:border-gold-400/40 dark:bg-ink-850 dark:text-gold-300">
                                                        {item.number}
                                                    </span>
                                                </span>
                                                <span className="flex flex-col">
                                                    <span className="text-[13.5px] font-semibold text-ink-900 dark:text-white">
                                                        {item.title}
                                                    </span>
                                                    <span className="text-[11.5px] text-ink-900/60 dark:text-white/50">
                                                        {item.subtitle}
                                                    </span>
                                                </span>
                                            </div>
                                        ))}
                                    </div>

                                    <MagneticButton
                                        as="a"
                                        href="#modul"
                                        variant="primary"
                                        className="shrink-0 self-start px-5 py-2.5 text-[13px] md:self-auto"
                                    >
                                        Lihat Modul
                                        <ArrowRightIcon />
                                    </MagneticButton>
                                </div>
                            </Reveal>
                        </div>
                    </div>
                </Reveal>
            </div>
        </section>
    );
}

function ArrowDownIcon() {
    return (
        <svg
            aria-hidden
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4 transition-transform duration-300 ease-luxe group-hover:translate-y-0.5"
        >
            <path d="M12 5v14" />
            <path d="m6 13 6 6 6-6" />
        </svg>
    );
}

function ArrowRightIcon() {
    return (
        <svg
            aria-hidden
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.9}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4 transition-transform duration-300 ease-luxe group-hover:translate-x-0.5"
        >
            <path d="M5 12h14" />
            <path d="m13 6 6 6-6 6" />
        </svg>
    );
}

function PlanIcon() {
    return (
        <svg
            aria-hidden
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-5 w-5"
        >
            <path d="M6.75 3.75h8.5l3.5 3.5v13a1 1 0 0 1-1 1H6.75a1 1 0 0 1-1-1V4.75a1 1 0 0 1 1-1Z" />
            <path d="M15 3.9V7.5h3.6" />
            <path d="M9 12.5h6" />
            <path d="M9 16h4" />
        </svg>
    );
}

function LedgerIcon() {
    return (
        <svg
            aria-hidden
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-5 w-5"
        >
            <path d="M4.5 5.5A1.75 1.75 0 0 1 6.25 3.75h11.5A1.75 1.75 0 0 1 19.5 5.5v13a1.75 1.75 0 0 1-1.75 1.75H6.25A1.75 1.75 0 0 1 4.5 18.5v-13Z" />
            <path d="M8 3.75v16.5" />
            <path d="M11.5 8.25h4.5" />
            <path d="M11.5 12h4.5" />
            <path d="M11.5 15.75h2.5" />
        </svg>
    );
}

function ExportIcon() {
    return (
        <svg
            aria-hidden
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-5 w-5"
        >
            <path d="M12 3.75v10.5" />
            <path d="m8 10.5 4 4 4-4" />
            <path d="M4.75 16.5v2.25a1.5 1.5 0 0 0 1.5 1.5h11.5a1.5 1.5 0 0 0 1.5-1.5V16.5" />
        </svg>
    );
}
