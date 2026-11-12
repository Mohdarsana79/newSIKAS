import { GlassCard } from '@/Components/Landing/ui/GlassCard';
import { Reveal } from '@/Components/Landing/ui/Reveal';

type TrustItem = {
    title: string;
    description: string;
    icon: () => JSX.Element;
};

const TRUST_ITEMS: TrustItem[] = [
    {
        title: 'Transparan',
        description: 'Setiap transaksi tercatat dan siap diaudit kapan saja.',
        icon: EyeIcon,
    },
    {
        title: 'Aman',
        description: 'Peran dan hak akses berlapis melindungi data anggaran sekolah.',
        icon: ShieldIcon,
    },
    {
        title: 'Akuntabel',
        description: 'Mengikuti kaidah BOSP dan format pelaporan dinas.',
        icon: DocumentCheckIcon,
    },
    {
        title: 'Terintegrasi',
        description: 'Sinkron dengan ARKAS Tools tanpa entri ulang.',
        icon: LinkIcon,
    },
];

/**
 * Trust strip: empat nilai utama dalam kartu kaca dengan ikon garis emas.
 * Letaknya langsung di bawah hero, tanpa judul section agar tetap ringkas.
 */
export default function TrustStrip() {
    return (
        <section aria-label="Nilai utama SIKAS" className="relative py-6 sm:py-10">
            <div className="mx-auto max-w-7xl px-6 lg:px-8">
                <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                    {TRUST_ITEMS.map((item, index) => (
                        <Reveal key={item.title} delay={index * 90} className="h-full">
                            <GlassCard
                                padding="none"
                                className="group flex h-full flex-col p-3.5 hover:-translate-y-1 hover:border-gold-600/40 hover:shadow-glow-gold dark:hover:border-gold-400/45 motion-reduce:hover:translate-y-0 sm:p-5 lg:p-6"
                            >
                                <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-gold-600/25 bg-gradient-to-br from-gold-300/25 to-brand-500/10 text-gold-600 transition-transform duration-500 ease-luxe group-hover:scale-105 dark:border-gold-400/25 dark:text-gold-300 sm:h-11 sm:w-11 sm:rounded-2xl">
                                    <item.icon />
                                </span>
                                <h3 className="mt-3 font-display text-[15px] font-semibold tracking-[-0.01em] text-ink-900 dark:text-white sm:mt-4 sm:text-lg">
                                    {item.title}
                                </h3>
                                <p className="mt-1.5 text-pretty text-[12.5px] leading-relaxed text-ink-900/60 dark:text-white/55 sm:mt-2 sm:text-[13.5px]">
                                    {item.description}
                                </p>
                            </GlassCard>
                        </Reveal>
                    ))}
                </div>
            </div>
        </section>
    );
}

function EyeIcon() {
    return (
        <svg
            aria-hidden
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.6}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-6 w-6"
        >
            <path d="M2.75 12S6.2 5.75 12 5.75 21.25 12 21.25 12 17.8 18.25 12 18.25 2.75 12 2.75 12Z" />
            <circle cx="12" cy="12" r="2.6" />
        </svg>
    );
}

function ShieldIcon() {
    return (
        <svg
            aria-hidden
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.6}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-6 w-6"
        >
            <path d="M12 3.25 5.25 5.8v5.35c0 4.2 2.8 7.45 6.75 8.95 3.95-1.5 6.75-4.75 6.75-8.95V5.8L12 3.25Z" />
            <path d="m9.25 11.8 2 2 3.5-3.7" />
        </svg>
    );
}

function DocumentCheckIcon() {
    return (
        <svg
            aria-hidden
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.6}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-6 w-6"
        >
            <path d="M7.5 4.75h-1A1.75 1.75 0 0 0 4.75 6.5v13A1.75 1.75 0 0 0 6.5 21.25h11a1.75 1.75 0 0 0 1.75-1.75v-13a1.75 1.75 0 0 0-1.75-1.75h-1" />
            <rect x="9" y="2.75" width="6" height="3.5" rx="1.25" />
            <path d="m8.75 13.4 2.1 2.1 4.4-4.6" />
        </svg>
    );
}

function LinkIcon() {
    return (
        <svg
            aria-hidden
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.6}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-6 w-6"
        >
            <path d="M9.6 14.4 14.4 9.6" />
            <path d="m7.6 11.3-1.4 1.4a3.4 3.4 0 0 0 4.8 4.8l1.4-1.4" />
            <path d="m16.4 12.7 1.4-1.4a3.4 3.4 0 0 0-4.8-4.8l-1.4 1.4" />
        </svg>
    );
}
