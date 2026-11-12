import { AuroraBackground } from '@/Components/Landing/ui/AuroraBackground';
import { GlassCard } from '@/Components/Landing/ui/GlassCard';
import { Reveal } from '@/Components/Landing/ui/Reveal';
import { SectionHeading } from '@/Components/Landing/ui/SectionHeading';
import { TiltCard } from '@/Components/Landing/ui/TiltCard';
import { cn } from '@/lib/utils';

type ModuleKind = 'rkas' | 'bku' | 'laporan' | 'arkas';

type BadgeTone = 'brand' | 'gold';

type ModuleItem = {
    kind: ModuleKind;
    title: string;
    subtitle: string;
    badge: {
        label: string;
        tone: BadgeTone;
    };
    meta: readonly string[];
};

/** Copy §5.5 — kartu murni informatif, tanpa navigasi ke route baru. */
const MODULES: readonly ModuleItem[] = [
    {
        kind: 'rkas',
        title: 'RKAS & Pagu Anggaran',
        subtitle: 'Susun RKAS bertahap hingga perubahan, dengan pagu yang tetap rapi.',
        badge: { label: 'Inti', tone: 'brand' },
        meta: ['4 varian', 'RKAS perubahan', 'Validasi rekening'],
    },
    {
        kind: 'bku',
        title: 'BKU & Penatausahaan',
        subtitle: 'Rekam setiap transaksi harian tanpa kehilangan jejak sekecil apa pun.',
        badge: { label: 'Inti', tone: 'brand' },
        meta: ['BKU', 'Buku pembantu', 'Pajak'],
    },
    {
        kind: 'laporan',
        title: 'Laporan & Ekspor',
        subtitle: 'Hasilkan laporan siap cetak dan rekap realisasi dalam sekali langkah.',
        badge: { label: 'Populer', tone: 'gold' },
        meta: ['PDF', 'Excel', 'Rekap realisasi'],
    },
    {
        kind: 'arkas',
        title: 'Sinkron ARKAS',
        subtitle: 'Tarik data ARKAS Tools dua arah, tanpa entri ulang di dua tempat.',
        badge: { label: 'Baru', tone: 'gold' },
        meta: ['ARKAS Tools', 'Tarik RKAS', 'Tarik BKU'],
    },
];

const BADGE_STYLES: Record<BadgeTone, string> = {
    brand: 'bg-brand-600 text-white ring-1 ring-inset ring-white/20',
    gold: 'bg-gold-400 text-ink-950 ring-1 ring-inset ring-white/40',
};

const ART_BACKDROP: Record<ModuleKind, string> = {
    rkas: 'from-brand-900/45 via-ink-850 to-ink-950',
    bku: 'from-ink-800 via-ink-850 to-ink-950',
    laporan: 'from-ink-850 via-ink-900 to-ink-950',
    arkas: 'from-brand-900/40 via-ink-900 to-ink-950',
};

/**
 * Thumbnail gradient-art per modul. Murni dekoratif (aria-hidden) dan
 * memakai SVG inline supaya tidak ada request tambahan.
 */
function ModuleArt({ kind }: { kind: ModuleKind }) {
    return (
        <div
            aria-hidden
            className={cn(
                'relative h-[165px] w-full overflow-hidden border-b border-white/10 bg-gradient-to-br',
                ART_BACKDROP[kind],
            )}
        >
            <div className="absolute inset-0 bg-grid-faint bg-grid-32 opacity-50" />

            {kind === 'rkas' ? (
                <svg
                    viewBox="0 0 320 180"
                    preserveAspectRatio="xMidYMid slice"
                    className="absolute inset-0 h-full w-full"
                    fill="none"
                >
                    <defs>
                        <linearGradient id="mod-rkas-bar" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#A38CFF" stopOpacity="0.95" />
                            <stop offset="100%" stopColor="#4527C9" stopOpacity="0.6" />
                        </linearGradient>
                        <linearGradient id="mod-rkas-gold" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor="#E8C87D" stopOpacity="0" />
                            <stop offset="55%" stopColor="#F5DCA8" stopOpacity="0.95" />
                            <stop offset="100%" stopColor="#E8C87D" stopOpacity="0" />
                        </linearGradient>
                        <radialGradient id="mod-rkas-glow" cx="50%" cy="50%" r="50%">
                            <stop offset="0%" stopColor="#7C5CFF" stopOpacity="0.32" />
                            <stop offset="100%" stopColor="#7C5CFF" stopOpacity="0" />
                        </radialGradient>
                        <linearGradient id="mod-rkas-floor" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#7C5CFF" stopOpacity="0.16" />
                            <stop offset="100%" stopColor="#7C5CFF" stopOpacity="0" />
                        </linearGradient>
                    </defs>

                    <ellipse cx="176" cy="126" rx="126" ry="64" fill="url(#mod-rkas-glow)" />

                    {[48, 78, 108, 138].map((y) => (
                        <line key={y} x1="34" y1={y} x2="292" y2={y} stroke="#F5F3FF" strokeOpacity="0.06" />
                    ))}
                    <line x1="34" y1="142" x2="292" y2="142" stroke="#E8C87D" strokeOpacity="0.4" />
                    <rect x="34" y="142" width="258" height="20" fill="url(#mod-rkas-floor)" />

                    {[
                        { x: 54, h: 46 },
                        { x: 88, h: 62 },
                        { x: 122, h: 54 },
                        { x: 156, h: 79 },
                        { x: 190, h: 68 },
                    ].map((bar) => (
                        <rect
                            key={bar.x}
                            x={bar.x}
                            y={142 - bar.h}
                            width="20"
                            height={bar.h}
                            rx="6"
                            fill="url(#mod-rkas-bar)"
                        />
                    ))}
                    <rect x="224" y="30" width="20" height="112" rx="6" fill="#E8C87D" fillOpacity="0.85" />
                    <rect x="224" y="30" width="20" height="6" rx="3" fill="#FBF3E0" fillOpacity="0.85" />

                    <polyline
                        points="64,88 98,72 132,82 166,55 200,66 234,24"
                        stroke="url(#mod-rkas-gold)"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeDasharray="3 5"
                    />
                    <circle cx="234" cy="24" r="7" stroke="#E8C87D" strokeOpacity="0.35" />
                    <circle cx="234" cy="24" r="3" fill="#F5DCA8" />
                </svg>
            ) : null}

            {kind === 'bku' ? (
                <svg
                    viewBox="0 0 320 180"
                    preserveAspectRatio="xMidYMid slice"
                    className="absolute inset-0 h-full w-full"
                    fill="none"
                >
                    <defs>
                        <linearGradient id="mod-bku-page" x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stopColor="#F5F3FF" stopOpacity="0.14" />
                            <stop offset="100%" stopColor="#F5F3FF" stopOpacity="0.03" />
                        </linearGradient>
                        <linearGradient id="mod-bku-gold" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor="#B98A2E" stopOpacity="0.15" />
                            <stop offset="50%" stopColor="#E8C87D" stopOpacity="0.8" />
                            <stop offset="100%" stopColor="#B98A2E" stopOpacity="0.15" />
                        </linearGradient>
                        <radialGradient id="mod-bku-glow" cx="50%" cy="50%" r="50%">
                            <stop offset="0%" stopColor="#D4AE55" stopOpacity="0.14" />
                            <stop offset="100%" stopColor="#D4AE55" stopOpacity="0" />
                        </radialGradient>
                    </defs>

                    <ellipse cx="164" cy="120" rx="132" ry="66" fill="url(#mod-bku-glow)" />

                    <rect
                        x="82"
                        y="30"
                        width="120"
                        height="112"
                        rx="12"
                        transform="rotate(-9 142 86)"
                        stroke="#F5F3FF"
                        strokeOpacity="0.09"
                        fill="#F5F3FF"
                        fillOpacity="0.02"
                    />

                    <g transform="rotate(-3 172 92)">
                        <rect
                            x="112"
                            y="26"
                            width="130"
                            height="120"
                            rx="12"
                            fill="#15121F"
                            fillOpacity="0.94"
                            stroke="#F5F3FF"
                            strokeOpacity="0.14"
                        />
                        <rect
                            x="112"
                            y="26"
                            width="130"
                            height="120"
                            rx="12"
                            fill="url(#mod-bku-page)"
                        />
                        <rect x="112" y="26" width="130" height="1.6" fill="url(#mod-bku-gold)" />
                        <line x1="112" y1="54" x2="242" y2="54" stroke="#E8C87D" strokeOpacity="0.35" />
                        <rect x="126" y="38" width="46" height="5" rx="2.5" fill="#F5DCA8" fillOpacity="0.5" />
                        <rect x="204" y="38" width="24" height="5" rx="2.5" fill="#F5F3FF" fillOpacity="0.18" />

                        {[70, 88, 106, 124].map((y, index) => (
                            <g key={y}>
                                <circle cx="128" cy={y} r="2" fill="#A38CFF" fillOpacity="0.75" />
                                <rect
                                    x="138"
                                    y={y - 2}
                                    width={58 - index * 7}
                                    height="4"
                                    rx="2"
                                    fill="#F5F3FF"
                                    fillOpacity="0.16"
                                />
                                <rect
                                    x="206"
                                    y={y - 2}
                                    width={22 + index * 3}
                                    height="4"
                                    rx="2"
                                    fill="#E8C87D"
                                    fillOpacity="0.42"
                                />
                            </g>
                        ))}
                        <rect x="116" y="26" width="3" height="120" rx="1.5" fill="url(#mod-bku-gold)" />
                    </g>

                    <circle cx="252" cy="132" r="13" stroke="#E8C87D" strokeOpacity="0.35" />
                    <path
                        d="M246.5 132.5l3.5 3.5 6.5-7"
                        stroke="#F5DCA8"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </svg>
            ) : null}

            {kind === 'laporan' ? (
                <svg
                    viewBox="0 0 320 180"
                    preserveAspectRatio="xMidYMid slice"
                    className="absolute inset-0 h-full w-full"
                    fill="none"
                >
                    <defs>
                        <linearGradient id="mod-laporan-page" x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stopColor="#F5F3FF" stopOpacity="0.13" />
                            <stop offset="100%" stopColor="#F5F3FF" stopOpacity="0.02" />
                        </linearGradient>
                        <linearGradient id="mod-laporan-gold" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor="#E8C87D" stopOpacity="0.25" />
                            <stop offset="100%" stopColor="#F5DCA8" stopOpacity="0.85" />
                        </linearGradient>
                        <radialGradient id="mod-laporan-glow" cx="50%" cy="50%" r="50%">
                            <stop offset="0%" stopColor="#7C5CFF" stopOpacity="0.28" />
                            <stop offset="100%" stopColor="#7C5CFF" stopOpacity="0" />
                        </radialGradient>
                    </defs>

                    <ellipse cx="150" cy="92" rx="130" ry="80" fill="url(#mod-laporan-glow)" />

                    <g transform="rotate(-6 158 90)">
                        <rect
                            x="92"
                            y="16"
                            width="122"
                            height="146"
                            rx="12"
                            fill="#15121F"
                            fillOpacity="0.95"
                            stroke="#F5F3FF"
                            strokeOpacity="0.14"
                        />
                        <rect
                            x="92"
                            y="16"
                            width="122"
                            height="146"
                            rx="12"
                            fill="url(#mod-laporan-page)"
                        />
                        <rect x="108" y="34" width="54" height="6" rx="3" fill="#F5DCA8" fillOpacity="0.55" />
                        <rect x="108" y="46" width="38" height="4" rx="2" fill="#F5F3FF" fillOpacity="0.18" />
                        <rect x="108" y="62" width="86" height="3" rx="1.5" fill="#F5F3FF" fillOpacity="0.12" />
                        <rect x="108" y="72" width="72" height="3" rx="1.5" fill="#F5F3FF" fillOpacity="0.12" />
                        <rect x="108" y="82" width="80" height="3" rx="1.5" fill="#F5F3FF" fillOpacity="0.12" />
                        <rect x="108" y="98" width="52" height="3" rx="1.5" fill="#F5F3FF" fillOpacity="0.12" />
                        <rect x="108" y="108" width="44" height="3" rx="1.5" fill="#F5F3FF" fillOpacity="0.12" />
                        <rect x="108" y="126" width="60" height="2" rx="1" fill="url(#mod-laporan-gold)" />
                        <rect x="108" y="140" width="30" height="2" rx="1" fill="#F5F3FF" fillOpacity="0.12" />
                        <circle cx="190" cy="140" r="12" stroke="#E8C87D" strokeOpacity="0.4" />
                        <path
                            d="M185 140l3.5 3.5 6.5-7"
                            stroke="#F5DCA8"
                            strokeWidth="1.6"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </g>

                    <g transform="rotate(4 238 128)">
                        <rect x="206" y="116" width="46" height="20" rx="10" fill="#5B3DF5" fillOpacity="0.95" />
                        <text
                            x="229"
                            y="129.5"
                            textAnchor="middle"
                            className="font-landing"
                            fontSize="9"
                            fontWeight="700"
                            letterSpacing="0.6"
                            fill="#FFFFFF"
                        >
                            PDF
                        </text>
                        <rect
                            x="206"
                            y="142"
                            width="46"
                            height="20"
                            rx="10"
                            fill="#E8C87D"
                            fillOpacity="0.95"
                        />
                        <text
                            x="229"
                            y="155.5"
                            textAnchor="middle"
                            className="font-landing"
                            fontSize="9"
                            fontWeight="700"
                            letterSpacing="0.6"
                            fill="#0B0A12"
                        >
                            EXCEL
                        </text>
                    </g>
                </svg>
            ) : null}

            {kind === 'arkas' ? (
                <svg
                    viewBox="0 0 320 180"
                    preserveAspectRatio="xMidYMid slice"
                    className="absolute inset-0 h-full w-full"
                    fill="none"
                >
                    <defs>
                        <linearGradient id="mod-arkas-glass" x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stopColor="#F5F3FF" stopOpacity="0.13" />
                            <stop offset="100%" stopColor="#F5F3FF" stopOpacity="0.02" />
                        </linearGradient>
                        <radialGradient id="mod-arkas-glow" cx="50%" cy="50%" r="50%">
                            <stop offset="0%" stopColor="#7C5CFF" stopOpacity="0.3" />
                            <stop offset="100%" stopColor="#7C5CFF" stopOpacity="0" />
                        </radialGradient>
                        <marker
                            id="mod-arkas-arrow-brand"
                            viewBox="0 0 10 10"
                            refX="8"
                            refY="5"
                            markerWidth="6"
                            markerHeight="6"
                            orient="auto-start-reverse"
                        >
                            <path d="M0 0 10 5 0 10z" fill="#A38CFF" />
                        </marker>
                        <marker
                            id="mod-arkas-arrow-gold"
                            viewBox="0 0 10 10"
                            refX="8"
                            refY="5"
                            markerWidth="6"
                            markerHeight="6"
                            orient="auto-start-reverse"
                        >
                            <path d="M0 0 10 5 0 10z" fill="#E8C87D" />
                        </marker>
                    </defs>

                    <ellipse cx="160" cy="96" rx="140" ry="62" fill="url(#mod-arkas-glow)" />
                    <ellipse
                        cx="160"
                        cy="92"
                        rx="128"
                        ry="62"
                        stroke="#E8C87D"
                        strokeOpacity="0.16"
                        strokeDasharray="3 8"
                    />

                    <g>
                        <rect
                            x="26"
                            y="62"
                            width="90"
                            height="60"
                            rx="16"
                            fill="#15121F"
                            fillOpacity="0.94"
                            stroke="#7C5CFF"
                            strokeOpacity="0.45"
                        />
                        <rect x="26" y="62" width="90" height="60" rx="16" fill="url(#mod-arkas-glass)" />
                        <rect x="38" y="74" width="14" height="14" rx="4" fill="#7C5CFF" fillOpacity="0.9" />
                        <rect x="42" y="78" width="6" height="6" rx="1.5" fill="#F5F3FF" fillOpacity="0.85" />
                        <text
                            x="58"
                            y="84.5"
                            className="font-landing"
                            fontSize="9"
                            fontWeight="700"
                            letterSpacing="0.8"
                            fill="#F5F3FF"
                            fillOpacity="0.9"
                        >
                            SIKAS
                        </text>
                        <rect x="38" y="98" width="66" height="3" rx="1.5" fill="#F5F3FF" fillOpacity="0.14" />
                        <rect x="38" y="106" width="46" height="3" rx="1.5" fill="#F5F3FF" fillOpacity="0.1" />
                    </g>

                    <g>
                        <rect
                            x="204"
                            y="62"
                            width="90"
                            height="60"
                            rx="16"
                            fill="#15121F"
                            fillOpacity="0.94"
                            stroke="#E8C87D"
                            strokeOpacity="0.45"
                        />
                        <rect x="204" y="62" width="90" height="60" rx="16" fill="url(#mod-arkas-glass)" />
                        <rect x="216" y="74" width="14" height="14" rx="4" fill="#E8C87D" fillOpacity="0.9" />
                        <path
                            d="M219 81h8M223 77v8"
                            stroke="#0B0A12"
                            strokeWidth="1.4"
                            strokeLinecap="round"
                        />
                        <text
                            x="236"
                            y="84.5"
                            className="font-landing"
                            fontSize="9"
                            fontWeight="700"
                            letterSpacing="0.8"
                            fill="#F5F3FF"
                            fillOpacity="0.9"
                        >
                            ARKAS
                        </text>
                        <rect x="216" y="98" width="66" height="3" rx="1.5" fill="#F5F3FF" fillOpacity="0.14" />
                        <rect x="216" y="106" width="46" height="3" rx="1.5" fill="#F5F3FF" fillOpacity="0.1" />
                    </g>

                    <path
                        d="M116 82c16-14 30-20 44-20 14 0 26 4 38 12"
                        stroke="#A38CFF"
                        strokeOpacity="0.85"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeDasharray="5 5"
                        markerEnd="url(#mod-arkas-arrow-brand)"
                    />
                    <path
                        d="M204 104c-16 14-30 20-44 20-14 0-26-4-38-12"
                        stroke="#E8C87D"
                        strokeOpacity="0.85"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeDasharray="5 5"
                        markerEnd="url(#mod-arkas-arrow-gold)"
                    />
                    <circle cx="160" cy="92" r="13" stroke="#E8C87D" strokeOpacity="0.3" strokeDasharray="2 4" />
                    <circle cx="160" cy="92" r="5" fill="#0B0A12" stroke="#E8C87D" strokeOpacity="0.6" />
                    <circle cx="160" cy="92" r="2" fill="#F5DCA8" />
                </svg>
            ) : null}

            {/* Shine diagonal + fade bawah agar menyatu dengan badan kartu */}
            <span className="pointer-events-none absolute -left-1/3 top-0 h-full w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-white/[0.05] to-transparent" />
            <span className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-ink-950/80 to-transparent" />
        </div>
    );
}

export function ModulesSection() {
    return (
        <section id="modul" aria-label="Modul unggulan" className="relative isolate overflow-hidden py-20 sm:py-28">
            <AuroraBackground variant="section" />

            <div className="relative z-10 mx-auto max-w-7xl px-6 lg:px-8">
                <div className="relative">
                    <SectionHeading
                        align="center"
                        eyebrow="MODUL UNGGULAN"
                        title="Satu Aplikasi untuk Seluruh Siklus Anggaran"
                        description="Dari pagu sampai laporan siap tanda tangan — semua modul bekerja pada data yang sama."
                    />

                    <a
                        href="#fitur"
                        className="landing-focus group absolute right-0 top-2 hidden items-center gap-1.5 rounded-sm text-[13px] font-semibold text-gold-600 underline decoration-gold-600/40 decoration-1 underline-offset-[6px] transition-colors duration-300 hover:text-gold-500 hover:decoration-gold-500/70 lg:inline-flex dark:text-gold-400 dark:decoration-gold-400/40 dark:hover:text-gold-300 dark:hover:decoration-gold-300/70"
                    >
                        Lihat Semua Fitur
                        <span aria-hidden className="transition-transform duration-300 ease-luxe group-hover:translate-x-0.5">
                            →
                        </span>
                    </a>
                </div>

                <div className="mt-12 grid gap-6 sm:grid-cols-2 sm:mt-14 lg:grid-cols-4">
                    {MODULES.map((module, index) => (
                        <Reveal key={module.kind} delay={index * 90} className="h-full">
                            <TiltCard className="group h-full">
                                <GlassCard
                                    padding="none"
                                    className="flex h-full flex-col hover:border-gold-600/40 hover:shadow-glow-gold dark:hover:border-gold-400/40"
                                >
                                    <div className="relative">
                                        <ModuleArt kind={module.kind} />
                                        <span
                                            className={cn(
                                                'absolute left-3.5 top-3.5 z-10 rounded-full px-2.5 py-[5px] text-[10px] font-semibold uppercase tracking-[0.16em]',
                                                BADGE_STYLES[module.badge.tone],
                                            )}
                                        >
                                            {module.badge.label}
                                        </span>
                                    </div>

                                    <div className="flex flex-1 flex-col p-5">
                                        <h3 className="flex min-h-[3rem] items-center font-display text-lg font-semibold leading-snug tracking-[-0.01em] text-ink-900 dark:text-white">
                                            {module.title}
                                        </h3>
                                        <p className="mt-1 text-[13px] leading-[1.7] text-ink-900/60 dark:text-white/60">
                                            {module.subtitle}
                                        </p>
                                        <div className="mt-auto flex flex-wrap gap-1.5 pt-4">
                                            {module.meta.map((chip) => (
                                                <span
                                                    key={chip}
                                                    className="rounded-full border border-ink-900/10 bg-white/50 px-2.5 py-1 text-[11px] font-medium leading-none text-ink-900/60 dark:border-white/[0.12] dark:bg-white/[0.03] dark:text-white/60"
                                                >
                                                    {chip}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </GlassCard>
                            </TiltCard>
                        </Reveal>
                    ))}
                </div>
            </div>
        </section>
    );
}

export default ModulesSection;
