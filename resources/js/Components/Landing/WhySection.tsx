import { useCallback, useEffect, useRef, useState } from 'react';

import { AccountActions } from '@/Components/Landing/ui/AccountActions';
import { useReducedMotion } from '@/Hooks/useReducedMotion';
import { animate, stagger, useAnimeInView } from '@/lib/anime';
import { cn } from '@/lib/utils';

export type WhySectionProps = {
    authenticated?: boolean;
    hasUsers?: boolean;
};

type Testimonial = {
    quote: string;
    author: string;
    role: string;
};

const TESTIMONIALS: readonly Testimonial[] = [
    {
        quote: '“SIKAS memberi kami kejelasan, rasa percaya diri, dan alur penatausahaan yang benar-benar masuk akal. Kami akhirnya merasa memegang kendali penuh atas pelaporan BOSP.”',
        author: 'Budi Santoso, S.Pd.',
        role: 'Bendahara BOSP',
    },
    {
        quote: '“Sinkronisasi dengan ARKAS dan ekspor laporan PDF/Excel menghemat waktu berhari-hari setiap triwulan. Pemeriksaan kas dan pajak kini selalu tuntas tanpa selisih.”',
        author: 'Hj. Ratna Dewi, M.Pd.',
        role: 'Kepala Sekolah',
    },
    {
        quote: '“Empat varian anggaran mulai dari Reguler hingga SiLPA Kinerja tersusun rapi dalam satu tempat. Tampilannya tenang dan sangat ramah bagi operator sekolah.”',
        author: 'I Made Wirawan, S.Kom.',
        role: 'Operator & Tim BOS',
    },
];

/**
 * Section 3: Split Bento Partner Banner + Testimonial Carousel bergaya Novara:
 * - Kiri: Kartu sinematik lebar berlatar danau & pegunungan (`/images/landing/partner-lake.jpg`)
 * - Kanan: Kartu kutipan testimoni dengan navigasi interaktif (`<-`, dots, `->`) beranimasi Anime.js
 */
export default function WhySection({ authenticated = false, hasUsers = true }: WhySectionProps) {
    const [activeSlide, setActiveSlide] = useState(0);
    const quoteContainerRef = useRef<HTMLDivElement | null>(null);
    const bannerImgRef = useRef<HTMLImageElement | null>(null);
    const reducedMotion = useReducedMotion();

    const { ref: sectionRef } = useAnimeInView<HTMLElement>(
        (container, isReduced) => {
            if (isReduced) return;

            const cards = container.querySelectorAll('[data-bento-card]');
            const mottoWords = container.querySelectorAll('[data-bento-motto]');

            const anim1 = animate(cards, {
                opacity: [0, 1],
                translateY: [34, 0],
                scale: [0.97, 1],
                duration: 920,
                delay: stagger(140),
                ease: 'outExpo',
            });

            const anim2 = animate(mottoWords, {
                opacity: [0, 1],
                translateX: [16, 0],
                duration: 760,
                delay: stagger(110, { start: 320 }),
                ease: 'outCubic',
            });

            return () => {
                anim1.pause();
                anim2.pause();
            };
        },
        {
            threshold: 0.14,
            initialHideSelector: '[data-bento-card], [data-bento-motto]',
        },
    );

    // Animasi pergantian slide testimoni menggunakan Anime.js
    useEffect(() => {
        const node = quoteContainerRef.current;
        if (!node || reducedMotion) return;

        const anim = animate(node, {
            opacity: [0, 1],
            translateY: [14, 0],
            duration: 520,
            ease: 'outExpo',
        });

        return () => {
            anim.pause();
        };
    }, [activeSlide, reducedMotion]);

    const handlePrev = useCallback(() => {
        setActiveSlide((prev) => (prev - 1 + TESTIMONIALS.length) % TESTIMONIALS.length);
    }, []);

    const handleNext = useCallback(() => {
        setActiveSlide((prev) => (prev + 1) % TESTIMONIALS.length);
    }, []);

    const handleBannerPointerMove = useCallback(
        (event: React.PointerEvent<HTMLElement>) => {
            if (reducedMotion || event.pointerType === 'touch' || !bannerImgRef.current) return;
            const rect = event.currentTarget.getBoundingClientRect();
            const relX = (event.clientX - rect.left) / rect.width - 0.5;
            const relY = (event.clientY - rect.top) / rect.height - 0.5;

            animate(bannerImgRef.current, {
                translateX: relX * -14,
                translateY: relY * -10,
                scale: 1.04,
                duration: 700,
                ease: 'outQuad',
            });
        },
        [reducedMotion],
    );

    const handleBannerPointerLeave = useCallback(() => {
        if (reducedMotion || !bannerImgRef.current) return;
        animate(bannerImgRef.current, {
            translateX: 0,
            translateY: 0,
            scale: 1,
            duration: 900,
            ease: 'outExpo',
        });
    }, [reducedMotion]);

    const currentTestimonial = TESTIMONIALS[activeSlide];

    return (
        <section
            id="fitur"
            ref={sectionRef}
            aria-label="Mengapa memilih SIKAS dan testimoni pengguna"
            className="relative isolate scroll-mt-24 bg-[#F8FBFB] pb-16 pt-2 dark:bg-[#051319] sm:pb-20 lg:pb-24"
        >
            <div className="mx-auto max-w-7xl px-6 lg:px-8">
                <div className="grid items-stretch gap-5 lg:grid-cols-[2.15fr_1fr]">
                    {/* Kartu Kiri: Scenic Partner Banner ("Mitra Andal di Setiap Langkah.") */}
                    <div
                        data-bento-card
                        onPointerMove={handleBannerPointerMove}
                        onPointerLeave={handleBannerPointerLeave}
                        className="relative isolate flex min-h-[340px] flex-col justify-between overflow-hidden rounded-[1.6rem] bg-[#07222D] p-7 text-white shadow-[0_24px_60px_-22px_rgba(6,28,38,0.45)] sm:min-h-[370px] sm:p-10"
                    >
                        {/* Gambar Latar Danau & Pegunungan */}
                        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
                            <img
                                ref={bannerImgRef}
                                src="/images/landing/partner-lake.jpg"
                                alt=""
                                className="h-full w-full object-cover object-[70%_center] will-change-transform"
                                loading="lazy"
                            />
                            {/* Gradasi gelap di sisi kiri agar teks sangat tajam & terbaca */}
                            <div
                                className="absolute inset-0"
                                style={{
                                    background:
                                        'linear-gradient(96deg, rgba(6,28,37,0.95) 0%, rgba(7,35,46,0.88) 42%, rgba(9,42,54,0.28) 76%, rgba(9,42,54,0.12) 100%)',
                                }}
                            />
                        </div>

                        {/* Baris Atas: Eyebrow di kiri + Motto bertumpuk di kanan atas seperti referensi Novara */}
                        <div className="flex items-start justify-between gap-4">
                            <p className="text-[10.5px] font-semibold uppercase tracking-[0.22em] text-[#8BE6DC] sm:text-[11px]">
                                Lebih dari Sekadar Aplikasi Anggaran
                            </p>

                            <div
                                aria-hidden
                                className="hidden text-right text-[13px] font-semibold leading-[1.28] tracking-tight text-[#082631] drop-shadow-[0_1px_8px_rgba(255,255,255,0.65)] sm:block"
                            >
                                <span data-bento-motto className="block">
                                    Rapi
                                </span>
                                <span data-bento-motto className="block">
                                    Lebih Cepat
                                </span>
                                <span data-bento-motto className="block">
                                    Lebih Akurat
                                </span>
                            </div>
                        </div>

                        {/* Konten Utama Kiri */}
                        <div className="mt-4 max-w-md">
                            <h2 className="text-balance font-sans text-[clamp(1.85rem,3.3vw,2.65rem)] font-bold leading-[1.1] tracking-[-0.03em] text-white">
                                <span className="block">Mitra Andal di</span>
                                <span className="block">Langkah Berikutnya.</span>
                            </h2>

                            <p className="mt-4 text-pretty text-[14px] leading-[1.7] text-white/80 sm:text-[14.5px]">
                                Kami meluangkan perhatian penuh untuk memahami ritme kerja sekolah Anda dan merancang
                                alur pengelolaan RKAS serta BKU yang jernih agar setiap target tercapai.
                            </p>

                            <div className="mt-7">
                                <AccountActions
                                    authenticated={authenticated}
                                    hasUsers={hasUsers}
                                    context="cta"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Kartu Kanan: Kutipan Testimoni Interaktif ("Novara gave us clarity...") */}
                    <div
                        data-bento-card
                        className="flex flex-col justify-between rounded-[1.6rem] border border-[#D5EAEA]/90 bg-[#EAF4F4] p-7 dark:border-white/10 dark:bg-[#0B222C] sm:p-8"
                    >
                        <div>
                            {/* Simbol Kutip Besar Teal */}
                            <QuoteMarkIcon />

                            <div ref={quoteContainerRef} className="mt-4 min-h-[156px]">
                                <blockquote className="text-pretty text-[14.5px] font-medium leading-[1.68] text-[#09242E] dark:text-white/90 sm:text-[15px]">
                                    {currentTestimonial.quote}
                                </blockquote>

                                <div className="mt-4">
                                    <p className="text-[13px] font-semibold text-[#1E4E58] dark:text-[#8BE6DC]">
                                        — {currentTestimonial.author}
                                    </p>
                                    <p className="text-[11.5px] text-[#52727C] dark:text-white/55">
                                        {currentTestimonial.role}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Baris Kontrol Navigasi Carousel Bawah (<-  • · ·  ->) */}
                        <div className="mt-6 flex items-center justify-between pt-2">
                            <button
                                type="button"
                                onClick={handlePrev}
                                aria-label="Testimoni sebelumnya"
                                className="landing-focus flex h-9 w-9 items-center justify-center rounded-full bg-[#CBE6E4] text-[#08222B] transition-all duration-200 hover:scale-105 hover:bg-[#8BE6DC] dark:bg-white/10 dark:text-white dark:hover:bg-[#8BE6DC] dark:hover:text-[#06222B]"
                            >
                                <ArrowLeftIcon />
                            </button>

                            <div className="flex items-center gap-2" role="tablist" aria-label="Pilih slide testimoni">
                                {TESTIMONIALS.map((item, idx) => {
                                    const active = idx === activeSlide;
                                    return (
                                        <button
                                            key={item.author}
                                            type="button"
                                            role="tab"
                                            aria-selected={active}
                                            aria-label={`Testimoni ${idx + 1}`}
                                            onClick={() => setActiveSlide(idx)}
                                            className={cn(
                                                'h-2 rounded-full transition-all duration-300',
                                                active
                                                    ? 'w-4 bg-[#0D3944] dark:bg-[#8BE6DC]'
                                                    : 'w-2 bg-[#0D3944]/25 hover:bg-[#0D3944]/50 dark:bg-white/25 dark:hover:bg-white/50',
                                            )}
                                        />
                                    );
                                })}
                            </div>

                            <button
                                type="button"
                                onClick={handleNext}
                                aria-label="Testimoni berikutnya"
                                className="landing-focus flex h-9 w-9 items-center justify-center rounded-full bg-[#CBE6E4] text-[#08222B] transition-all duration-200 hover:scale-105 hover:bg-[#8BE6DC] dark:bg-white/10 dark:text-white dark:hover:bg-[#8BE6DC] dark:hover:text-[#06222B]"
                            >
                                <ArrowRightIcon />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}

function QuoteMarkIcon() {
    return (
        <svg
            aria-hidden
            viewBox="0 0 36 28"
            fill="none"
            className="h-7 w-9 text-[#124E59] dark:text-[#8BE6DC]"
        >
            <path
                d="M14.2 2.4C8.4 5.2 4.8 10.2 4.8 16.6C4.8 21.4 8 24.8 12.2 24.8C15.8 24.8 18.4 22.3 18.4 18.8C18.4 15.4 15.9 13.1 12.8 13.1C11.9 13.1 10.9 13.4 10.5 13.6C11.1 9.9 13.6 6.8 16.8 5.1L14.2 2.4ZM31.4 2.4C25.6 5.2 22 10.2 22 16.6C22 21.4 25.2 24.8 29.4 24.8C33 24.8 35.6 22.3 35.6 18.8C35.6 15.4 33.1 13.1 30 13.1C29.1 13.1 28.1 13.4 27.7 13.6C28.3 9.9 30.8 6.8 34 5.1L31.4 2.4Z"
                fill="currentColor"
            />
        </svg>
    );
}

function ArrowLeftIcon() {
    return (
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
            <path d="M15 10H5" />
            <path d="m9.5 5.5-4.5 4.5 4.5 4.5" />
        </svg>
    );
}

function ArrowRightIcon() {
    return (
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
            <path d="M5 10h10" />
            <path d="m10.5 5.5 4.5 4.5-4.5 4.5" />
        </svg>
    );
}
