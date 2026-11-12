import { MagneticButton } from '@/Components/Landing/ui/MagneticButton';
import { AuroraBackground } from '@/Components/Landing/ui/AuroraBackground';
import { Reveal } from '@/Components/Landing/ui/Reveal';
import { SectionHeading } from '@/Components/Landing/ui/SectionHeading';
import { cn } from '@/lib/utils';

const CHECKLIST = [
    'Empat varian anggaran: Reguler, Kinerja, SiLPA, dan Kinerja–SiLPA',
    'RKAS bertahap & RKAS perubahan dengan validasi kode rekening',
    'BKU, buku pembantu, pajak, dan penutupan kas dalam satu alur',
    'Ekspor PDF & Excel siap cetak sesuai format dinas',
];

type FlowStep = {
    key: string;
    number: string;
    title: string;
    subtitle: string;
    status: string;
    chipClass: string;
    icon: () => JSX.Element;
};

const FLOW_STEPS: FlowStep[] = [
    {
        key: 'rkas',
        number: '01',
        title: 'RKAS',
        subtitle: 'Pagu & kode rekening',
        status: 'Tersusun',
        chipClass:
            'border-gold-600/30 bg-gold-300/15 text-gold-600 dark:border-gold-400/30 dark:bg-gold-400/10 dark:text-gold-300',
        icon: PlanDocIcon,
    },
    {
        key: 'bku',
        number: '02',
        title: 'BKU',
        subtitle: 'Buku kas & pajak',
        status: 'Seimbang',
        chipClass:
            'border-brand-600/25 bg-brand-500/10 text-brand-700 dark:border-brand-400/30 dark:bg-brand-500/15 dark:text-brand-300',
        icon: LedgerBookIcon,
    },
    {
        key: 'laporan',
        number: '03',
        title: 'Laporan',
        subtitle: 'PDF & Excel siap cetak',
        status: 'Siap ekspor',
        chipClass:
            'border-ink-900/10 bg-white/70 text-ink-900/70 dark:border-white/15 dark:bg-white/[0.07] dark:text-white/70',
        icon: ReportIcon,
    },
];

/**
 * Why SIKAS (`id="fitur"`): narasi nilai di kiri, diagram alur
 * RKAS → BKU → Laporan di kanan dengan garis penghubung yang mengalir.
 */
export default function WhySection() {
    return (
        <section id="fitur" aria-label="Mengapa SIKAS" className="relative isolate scroll-mt-28 overflow-hidden py-20 sm:py-28">
            <AuroraBackground variant="section" />

            <style>{`
                @keyframes sikas-flow-y {
                    0% { transform: translate3d(0, -130%, 0); opacity: 0; }
                    18% { opacity: 1; }
                    82% { opacity: 1; }
                    100% { transform: translate3d(0, 330%, 0); opacity: 0; }
                }
            `}</style>

            <div className="mx-auto max-w-7xl px-6 lg:px-8">
                <div className="grid items-center gap-14 lg:grid-cols-2 lg:gap-16 xl:gap-20">
                    {/* Kiri: narasi + checklist + CTA */}
                    <div>
                        <Reveal>
                            <SectionHeading
                                align="left"
                                eyebrow="MENGAPA SIKAS"
                                title="Lebih dari Sekadar Aplikasi Anggaran"
                                description="SIKAS tidak berhenti di pencatatan angka. Kami merapikan alur kerja bendahara — dari pagu hingga laporan siap tanda tangan."
                            />
                        </Reveal>

                        <Reveal delay={120} className="mt-8">
                            <ul className="space-y-4">
                                {CHECKLIST.map((item) => (
                                    <li key={item} className="flex items-start gap-3">
                                        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-gold-600/35 bg-gold-300/20 text-gold-600 dark:border-gold-400/30 dark:bg-gold-400/10 dark:text-gold-300">
                                            <CheckIcon />
                                        </span>
                                        <span className="text-[15px] leading-relaxed text-ink-900/70 dark:text-white/60">
                                            {item}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </Reveal>

                        <Reveal delay={200} className="mt-9">
                            <MagneticButton as="a" href="#modul" variant="primary">
                                Pelajari Modul
                                <ArrowRightIcon />
                            </MagneticButton>
                        </Reveal>
                    </div>

                    {/* Kanan: diagram alur */}
                    <Reveal delay={100} direction="left">
                        <div className="relative">
                            {/* Bingkai bertumpuk tipis di belakang panel. */}
                            <div
                                aria-hidden
                                className="absolute inset-x-6 -bottom-3 top-6 rounded-4xl border border-gold-600/10 bg-white/40 dark:border-gold-400/10 dark:bg-white/[0.02]"
                            />

                            <div className="landing-glass relative overflow-hidden rounded-4xl p-5 sm:p-6">
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <p className="landing-eyebrow">Alur Kerja</p>
                                        <p className="mt-2 font-display text-lg font-semibold tracking-[-0.01em] text-ink-900 dark:text-white">
                                            Dari pagu hingga laporan
                                        </p>
                                    </div>
                                    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-gold-600/25 bg-gold-300/15 px-2.5 py-1 text-[9.5px] font-semibold uppercase tracking-[0.16em] text-gold-600 dark:border-gold-400/25 dark:bg-gold-400/10 dark:text-gold-300">
                                        <span aria-hidden className="h-1 w-1 rounded-full bg-gold-500 dark:bg-gold-400" />
                                        Terpadu
                                    </span>
                                </div>

                                <div className="relative mt-6">
                                    {/* Garis putus-putus + segmen bercahaya yang mengalir. */}
                                    <div
                                        aria-hidden
                                        className="pointer-events-none absolute bottom-6 left-[34px] top-6 w-[2px] -translate-x-1/2 overflow-hidden"
                                    >
                                        <div className="absolute inset-0 border-l border-dashed border-gold-600/35 dark:border-gold-400/25" />
                                        <span
                                            className="absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-transparent via-gold-400/90 to-transparent motion-reduce:hidden"
                                            style={{ animation: 'sikas-flow-y 3.6s cubic-bezier(0.22, 1, 0.36, 1) infinite' }}
                                        />
                                    </div>

                                    <div className="relative flex flex-col gap-4">
                                        {FLOW_STEPS.map((step, index) => (
                                            <Reveal key={step.key} delay={140 + index * 130} direction="right">
                                                <div className="flex items-center gap-3 rounded-2xl border border-ink-900/[0.07] bg-white/75 p-3.5 shadow-sm backdrop-blur transition-all duration-500 ease-luxe hover:-translate-y-0.5 hover:border-gold-600/35 motion-reduce:hover:translate-y-0 dark:border-white/10 dark:bg-white/[0.05] dark:shadow-none dark:hover:border-gold-400/30">
                                                    <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gold-600/25 bg-gradient-to-br from-gold-300/25 to-brand-500/10 text-gold-600 dark:border-gold-400/25 dark:text-gold-300">
                                                        <step.icon />
                                                    </span>

                                                    <div className="min-w-0 flex-1">
                                                        <p className="flex items-baseline gap-2 font-display text-[15px] font-semibold tracking-[-0.01em] text-ink-900 dark:text-white">
                                                            {step.title}
                                                            <span className="font-landing text-[9.5px] font-semibold uppercase tracking-[0.18em] text-ink-900/60 dark:text-white/45">
                                                                {step.number}
                                                            </span>
                                                        </p>
                                                        <p className="mt-0.5 truncate text-[11.5px] text-ink-900/60 dark:text-white/50">
                                                            {step.subtitle}
                                                        </p>
                                                    </div>

                                                    <span
                                                        className={cn(
                                                            'inline-flex shrink-0 items-center rounded-full border px-2.5 py-1 text-[9.5px] font-semibold uppercase tracking-[0.12em]',
                                                            step.chipClass,
                                                        )}
                                                    >
                                                        {step.status}
                                                    </span>
                                                </div>
                                            </Reveal>
                                        ))}
                                    </div>
                                </div>

                                <div className="mt-5 flex items-center gap-2.5 rounded-2xl border border-gold-600/15 bg-white/50 px-3.5 py-2.5 dark:border-gold-400/15 dark:bg-white/[0.04]">
                                    <span
                                        aria-hidden
                                        className="h-1.5 w-1.5 shrink-0 animate-glow-pulse rounded-full bg-gold-500 motion-reduce:animate-none dark:bg-gold-400"
                                    />
                                    <p className="text-[11.5px] leading-relaxed text-ink-900/65 dark:text-white/55">
                                        Tanpa entri ulang — data mengalir dari RKAS ke laporan.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </Reveal>
                </div>
            </div>
        </section>
    );
}

function CheckIcon() {
    return (
        <svg
            aria-hidden
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-3.5 w-3.5"
        >
            <path d="m5.5 12.5 4 4 9-9" />
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

function PlanDocIcon() {
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
            <path d="M9 16h3.5" />
        </svg>
    );
}

function LedgerBookIcon() {
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

function ReportIcon() {
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
