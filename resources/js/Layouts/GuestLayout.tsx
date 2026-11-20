import { AuthAccent } from '@/Components/Auth/AuthHeading';
import AuthWordmark from '@/Components/Auth/AuthWordmark';
import { useReducedMotion } from '@/Hooks/useReducedMotion';
import { createTimeline, stagger, svg } from '@/lib/anime';
import { Link } from '@inertiajs/react';
import { ArrowLeft, CheckCircle2, FileSpreadsheet, ShieldCheck } from 'lucide-react';
import { PropsWithChildren, useEffect, useRef } from 'react';

const HIGHLIGHT_PILLS = [
    { label: 'RKAS 4 Varian', icon: CheckCircle2 },
    { label: 'BKU & Pajak Otomatis', icon: ShieldCheck },
    { label: 'Ekspor PDF & Excel', icon: FileSpreadsheet },
] as const;

/**
 * Bingkai halaman autentikasi serasi Welcome:
 * - Panel kiri: Scenic Deep Midnight Teal (latar pegunungan & aurora mint + kartu kaca SIKAS)
 * - Panel kanan: Kanvas Ice-White bersih (#F8FBFB) dengan kartu formulir putih & aksen Teal/Mint Aqua
 */
export default function Guest({ children }: PropsWithChildren) {
    const leftPanelRef = useRef<HTMLElement | null>(null);
    const curveRef = useRef<SVGPathElement | null>(null);
    const reducedMotion = useReducedMotion();

    useEffect(() => {
        if (reducedMotion) return;
        const panel = leftPanelRef.current;
        if (!panel) return;

        const revealItems = panel.querySelectorAll('[data-auth-panel-item]');
        const tl = createTimeline({
            defaults: { ease: 'outExpo' },
        });

        if (revealItems.length > 0) {
            tl.add(
                revealItems,
                {
                    opacity: [0, 1],
                    translateY: [20, 0],
                    duration: 820,
                    delay: stagger(85),
                },
                0,
            );
        }

        if (curveRef.current) {
            const drawable = svg.createDrawable(curveRef.current);
            tl.add(
                drawable,
                {
                    draw: ['0 0', '0 1'],
                    duration: 1200,
                    ease: 'outQuart',
                },
                260,
            );
        }

        return () => {
            tl.pause();
        };
    }, [reducedMotion]);

    return (
        <div className="auth-shell relative min-h-screen w-full overflow-x-hidden bg-[#F8FBFB]">
            {/* Lapisan cahaya halus di belakang bingkai */}
            <div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden">
                <div className="absolute -left-40 -top-44 h-[520px] w-[520px] rounded-full bg-[#8BE6DC]/20 blur-[130px]" />
                <div className="absolute -right-36 bottom-[-16%] h-[480px] w-[480px] rounded-full bg-[#D5EAEA] opacity-80 blur-[120px]" />
            </div>

            <div className="relative flex min-h-screen flex-col p-3 sm:p-4 lg:p-6">
                <div className="relative grid w-full min-w-0 flex-1 grid-cols-1 overflow-hidden rounded-[28px] border border-[#D5EAEA] bg-white shadow-[0_32px_80px_-38px_rgba(8,34,43,0.32)] lg:grid-cols-[1.06fr_0.94fr]">
                    {/* Panel Kiri: Scenic Deep Midnight Teal + Kartu Glassmorphism SIKAS */}
                    <aside
                        ref={leftPanelRef}
                        className="relative isolate hidden overflow-hidden bg-[#051821] text-white lg:flex lg:flex-col"
                    >
                        {/* Latar pegunungan sinematik + gradasi gelap + aurora mint */}
                        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
                            <img
                                src="/images/landing/hero-mountain.jpg"
                                alt=""
                                className="h-full w-full object-cover object-center opacity-80"
                            />
                            <div
                                className="absolute inset-0"
                                style={{
                                    background:
                                        'linear-gradient(155deg, rgba(4,20,28,0.92) 0%, rgba(5,25,35,0.78) 48%, rgba(8,36,48,0.88) 100%)',
                                }}
                            />
                            <div
                                className="absolute inset-0"
                                style={{
                                    background:
                                        'radial-gradient(38rem 26rem at 75% 42%, rgba(139,230,220,0.22), transparent 68%)',
                                }}
                            />
                        </div>

                        <div className="relative z-10 flex h-full flex-col justify-between px-10 py-10 xl:px-12 xl:py-11">
                            {/* Baris Atas: Logo SIKAS + Tautan Kembali ke Beranda */}
                            <div data-auth-panel-item className="flex items-center justify-between gap-4">
                                <Link href="/" className="rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8BE6DC]">
                                    <AuthWordmark tone="dark" />
                                </Link>

                                <Link
                                    href="/"
                                    className="group inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/[0.08] px-3.5 py-1.5 text-xs font-medium text-white/85 backdrop-blur-md transition-colors hover:border-[#8BE6DC]/60 hover:bg-white/[0.14] hover:text-white"
                                >
                                    <ArrowLeft className="h-3.5 w-3.5 text-[#8BE6DC] transition-transform duration-200 group-hover:-translate-x-0.5" />
                                    <span>Beranda</span>
                                </Link>
                            </div>

                            {/* Konten Tengah: Headline + Kartu Kaca Pratinjau */}
                            <div className="my-auto py-8">
                                <div data-auth-panel-item className="max-w-[30rem]">
                                    <p className="flex items-center gap-2.5 text-[10.5px] font-semibold uppercase tracking-[0.24em] text-[#8BE6DC]/90">
                                        <span aria-hidden="true" className="h-px w-5 bg-[#8BE6DC]/70" />
                                        Transparan · Akuntabel · Terarah
                                    </p>

                                    <h2 className="mt-4 font-sans text-[clamp(2rem,2.7vw,2.75rem)] font-bold leading-[1.08] tracking-[-0.03em] text-white">
                                        Anggaran sekolah,{' '}
                                        <AuthAccent tone="dark">rapi</AuthAccent> dari hulu ke hilir.
                                    </h2>

                                    <p className="mt-4 text-[14px] leading-relaxed text-white/75">
                                        Satukan penyusunan RKAS, pencatatan BKU, pajak, hingga pelaporan PDF &amp; Excel dalam satu alur yang tenang.
                                    </p>
                                </div>

                                {/* Kartu Frosted Glassmorphism Ringkasan SIKAS */}
                                <div
                                    data-auth-panel-item
                                    className="mt-7 max-w-[30rem] rounded-[22px] border border-white/20 bg-gradient-to-b from-white/[0.13] via-white/[0.08] to-[#061D26]/70 p-5 shadow-[0_26px_60px_-20px_rgba(0,0,0,0.7),inset_0_1px_1px_rgba(255,255,255,0.28)] backdrop-blur-2xl"
                                >
                                    <div className="flex items-center justify-between gap-3">
                                        <div>
                                            <p className="text-[11px] font-medium text-white/70">
                                                Kesiapan Pelaporan BOSP
                                            </p>
                                            <p className="mt-1 text-xl font-bold tracking-tight text-white tabular-nums">
                                                4 Varian · 100% Terpantau
                                            </p>
                                        </div>
                                        <span className="inline-flex items-center gap-1.5 rounded-full border border-[#8BE6DC]/35 bg-[#8BE6DC]/15 px-3 py-1 text-[11px] font-semibold text-[#9CF4EA]">
                                            <span className="h-1.5 w-1.5 rounded-full bg-[#8BE6DC]" />
                                            Sinkron ARKAS
                                        </span>
                                    </div>

                                    <svg viewBox="0 0 360 72" className="mt-4 h-16 w-full overflow-visible" aria-hidden="true">
                                        <defs>
                                            <linearGradient id="auth-card-stroke" x1="0" y1="0" x2="1" y2="0">
                                                <stop offset="0%" stopColor="#6CD4C9" />
                                                <stop offset="100%" stopColor="#FFFFFF" />
                                            </linearGradient>
                                        </defs>
                                        <line x1="8" y1="60" x2="352" y2="60" stroke="#FFFFFF" strokeOpacity="0.1" />
                                        <line x1="8" y1="32" x2="352" y2="32" stroke="#FFFFFF" strokeOpacity="0.08" strokeDasharray="3 5" />
                                        <path
                                            ref={curveRef}
                                            d="M 10 56 C 55 54, 85 40, 128 42 C 170 44, 198 26, 240 28 C 282 30, 312 16, 350 10"
                                            fill="none"
                                            stroke="url(#auth-card-stroke)"
                                            strokeWidth="2.6"
                                            strokeLinecap="round"
                                        />
                                        <circle cx="350" cy="10" r="7" fill="#8BE6DC" fillOpacity="0.28" />
                                        <circle cx="350" cy="10" r="3.8" fill="#FFFFFF" stroke="#8BE6DC" strokeWidth="1.8" />
                                    </svg>

                                    <div className="mt-3 flex flex-wrap gap-2">
                                        {HIGHLIGHT_PILLS.map((item) => (
                                            <span
                                                key={item.label}
                                                className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.07] px-2.5 py-1 text-[11px] font-medium text-white/85"
                                            >
                                                <item.icon className="h-3 w-3 text-[#8BE6DC]" />
                                                {item.label}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Footer Kiri */}
                            <div
                                data-auth-panel-item
                                className="flex items-center justify-between gap-4 border-t border-white/15 pt-4 text-[11px] text-white/65"
                            >
                                <span>© {new Date().getFullYear()} SIKAS Advisory</span>
                                <a
                                    href="https://www.youtube.com/@giandarsana5772"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="auth-link font-medium text-[#8BE6DC] transition-colors hover:text-white"
                                >
                                    Moh Gian Darsana, S.Pd., Gr
                                </a>
                            </div>
                        </div>
                    </aside>

                    {/* Panel Kanan: Kanvas Ice-White Bersih + Kartu Formulir Putih */}
                    <main className="relative flex min-w-0 flex-col items-center justify-center bg-[#F8FBFB] px-4 py-8 sm:px-8 lg:px-10 lg:py-12">
                        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
                            <div className="auth-dots absolute inset-0 opacity-[0.45]" />
                            <div className="absolute -bottom-28 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-[#8BE6DC]/25 blur-[95px]" />
                        </div>

                        <div className="relative z-10 w-full min-w-0 max-w-[456px]">
                            {/* Logo Mobile + Link Kembali */}
                            <div className="auth-rise mb-7 flex items-center justify-between gap-3 lg:hidden">
                                <Link href="/" aria-label="SIKAS — beranda" className="max-w-full">
                                    <AuthWordmark compact tone="light" />
                                </Link>
                                <Link
                                    href="/"
                                    className="inline-flex items-center gap-1.5 rounded-full border border-[#0D3B47]/20 bg-[#EAF4F4] px-3.5 py-1.5 text-xs font-semibold text-[#08222B] transition-colors hover:bg-[#DCF0F0]"
                                >
                                    <ArrowLeft className="h-3.5 w-3.5" />
                                    Beranda
                                </Link>
                            </div>

                            {/* Kartu Formulir Putih Bersih */}
                            <div className="relative">
                                <div
                                    aria-hidden="true"
                                    className="absolute -inset-2 rounded-[30px] bg-gradient-to-br from-[#8BE6DC]/20 via-transparent to-[#146670]/10 blur-xl"
                                />

                                <div className="relative overflow-hidden rounded-[26px] border border-[#D5EAEA] bg-white px-5 py-7 shadow-[0_28px_65px_-32px_rgba(8,34,43,0.18)] sm:px-8 sm:py-9">
                                    <div
                                        aria-hidden="true"
                                        className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#146670] via-[#8BE6DC] to-[#146670]"
                                    />

                                    <div className="relative">{children}</div>
                                </div>
                            </div>

                            <p className="mt-5 text-center text-[10px] uppercase tracking-[0.16em] text-[#5A7882] lg:hidden">
                                © {new Date().getFullYear()} SIKAS · Sistem Anggaran Sekolah
                            </p>
                        </div>
                    </main>
                </div>
            </div>
        </div>
    );
}
