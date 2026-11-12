import { AccountActions } from '@/Components/Landing/ui/AccountActions';
import { AuroraBackground } from '@/Components/Landing/ui/AuroraBackground';
import { Reveal } from '@/Components/Landing/ui/Reveal';
import { PlayerStage } from '@/Remotion/PlayerStage';

export type CtaSectionProps = {
    /** Boolean dari `auth.user` (logika asli dipertahankan via AccountActions). */
    authenticated: boolean;
    /** Boolean `hasUsers` dari props Inertia. */
    hasUsers: boolean;
};

export function CtaSection({ authenticated, hasUsers }: CtaSectionProps) {
    return (
        <section aria-label="Mulai menggunakan SIKAS" className="relative py-20 sm:py-28">
            <div className="mx-auto max-w-7xl px-6 lg:px-8">
                <Reveal>
                    <div className="relative isolate overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-brand-700 via-brand-600 to-ink-950 px-7 py-12 shadow-card-light ring-1 ring-inset ring-gold-400/25 sm:px-12 sm:py-16 lg:px-16 lg:py-20 dark:shadow-card-dark dark:ring-gold-400/20">
                        <AuroraBackground variant="cta" />

                        {/* Hairline emas di tepi atas/bawah kartu */}
                        <span
                            aria-hidden
                            className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent"
                        />
                        <span
                            aria-hidden
                            className="pointer-events-none absolute inset-x-16 bottom-0 h-px bg-gradient-to-r from-transparent via-gold-300/40 to-transparent"
                        />

                        <div className="relative z-10 grid items-center gap-12 sm:gap-14 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
                            <div className="text-center lg:text-left">
                                <h2 className="text-balance font-display text-[clamp(2rem,3.4vw,2.9rem)] font-semibold leading-[1.1] tracking-[-0.02em] text-white">
                                    Siap Menata Anggaran Sekolah Anda?
                                </h2>
                                <p className="mx-auto mt-5 max-w-md text-pretty text-[15.5px] leading-[1.8] text-white/70 lg:mx-0">
                                    Mulai dari RKAS pertama hari ini — tanpa instalasi tambahan.
                                </p>
                                <div className="mt-9 flex justify-center lg:justify-start">
                                    <AccountActions
                                        authenticated={authenticated}
                                        hasUsers={hasUsers}
                                        context="cta"
                                        className="bg-none bg-white text-ink-950 shadow-card-light hover:bg-gold-200 hover:text-ink-950 hover:shadow-glow-gold"
                                    />
                                </div>
                            </div>

                            <div className="relative mx-auto hidden w-full max-w-[340px] sm:block">
                                <div
                                    aria-hidden
                                    className="pointer-events-none absolute -inset-5 rounded-[2.5rem] bg-gold-300/25 blur-2xl"
                                />
                                <div className="relative overflow-hidden rounded-[1.6rem] border border-gold-300/40 bg-white/[0.16] p-2.5 shadow-glow-gold ring-1 ring-inset ring-white/20 backdrop-blur-xl">
                                    <div className="overflow-hidden rounded-[1.25rem] bg-ink-900/70 ring-1 ring-inset ring-white/10">
                                        <PlayerStage
                                            composition="cta"
                                            aspectRatio={4 / 3}
                                            title="Animasi orbit modul dan ekspor SIKAS"
                                        />
                                    </div>
                                    <span
                                        aria-hidden
                                        className="pointer-events-none absolute inset-0 rounded-[1.6rem] ring-1 ring-inset ring-white/10"
                                    />
                                    <span
                                        aria-hidden
                                        className="pointer-events-none absolute -right-1 -top-1 h-2 w-2 rounded-full bg-gold-300/80 shadow-glow-gold"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </Reveal>
            </div>
        </section>
    );
}

export default CtaSection;
