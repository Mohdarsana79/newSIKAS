import { GlassCard } from '@/Components/Landing/ui/GlassCard';
import { Reveal } from '@/Components/Landing/ui/Reveal';
import { SectionHeading } from '@/Components/Landing/ui/SectionHeading';

type Step = {
    number: string;
    title: string;
    description: string;
};

/** Copy §5.6. */
const STEPS: readonly Step[] = [
    {
        number: '01',
        title: 'Siapkan Anggaran',
        description: 'Susun RKAS per kode rekening, tetapkan pagu, dan siapkan anggaran kas.',
    },
    {
        number: '02',
        title: 'Catat Penatausahaan',
        description: 'Rekam BKU dan buku pembantu; pajak serta penutupan kas terhitung otomatis.',
    },
    {
        number: '03',
        title: 'Laporkan & Evaluasi',
        description: 'Ekspor laporan siap cetak dan pantau realisasi per bulan.',
    },
];

export function StepsSection() {
    return (
        <section id="cara-kerja" aria-label="Cara kerja SIKAS" className="relative isolate overflow-hidden py-20 sm:py-28">
            {/* Ambien tipis, bukan aurora penuh agar ritme antar section tetap tenang. */}
            <div
                aria-hidden
                className="pointer-events-none absolute left-1/2 top-24 h-72 w-[44rem] -translate-x-1/2 rounded-full bg-brand-500/[0.07] blur-[130px] dark:bg-brand-500/10"
            />

            <div className="relative z-10 mx-auto max-w-7xl px-6 lg:px-8">
                <SectionHeading
                    align="center"
                    eyebrow="CARA KERJA"
                    title="Tiga Langkah Menuju Anggaran yang Rapi"
                    description="Alur yang sama untuk empat varian anggaran, tanpa entri ganda."
                />

                <div className="mt-14 grid gap-6 md:grid-cols-3 lg:gap-8">
                    {STEPS.map((step, index) => (
                        <Reveal key={step.number} delay={index * 110} className="h-full">
                            <div className="relative h-full">
                                <GlassCard
                                    padding="lg"
                                    className="flex h-full flex-col hover:border-gold-600/35 dark:hover:border-gold-400/35"
                                >
                                    <span
                                        aria-hidden
                                        className="bg-gradient-to-br from-gold-300 via-gold-400 to-brand-400 bg-clip-text font-display text-[3.25rem] font-semibold leading-none tracking-[-0.03em] text-transparent"
                                    >
                                        {step.number}
                                    </span>

                                    <h3 className="mt-6 font-display text-xl font-semibold leading-snug tracking-[-0.01em] text-ink-900 sm:text-[1.35rem] dark:text-white">
                                        {step.title}
                                    </h3>
                                    <p className="mt-3 text-[14px] leading-[1.75] text-ink-900/60 dark:text-white/60">
                                        {step.description}
                                    </p>

                                    <span className="mt-auto block pt-6" aria-hidden>
                                        <span className="block h-px w-12 bg-gradient-to-r from-gold-500/70 to-transparent" />
                                    </span>
                                </GlassCard>

                                {index < STEPS.length - 1 ? (
                                    <span
                                        aria-hidden
                                        className="pointer-events-none absolute right-0 top-[3.5rem] hidden w-6 translate-x-full md:block lg:w-8"
                                    >
                                        <span className="block h-px w-full border-t border-dashed border-gold-600/35 dark:border-gold-400/30" />
                                        <span className="absolute right-0 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-gold-600/75 ring-2 ring-gold-600/15 dark:bg-gold-400/80 dark:ring-gold-400/15" />
                                    </span>
                                ) : null}
                            </div>
                        </Reveal>
                    ))}
                </div>
            </div>
        </section>
    );
}

export default StepsSection;
