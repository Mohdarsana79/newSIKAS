import { useEffect, useRef, useState } from 'react';

import DarkModeSwitcher from '@/Components/DarkModeSwitcher';
import FullscreenSwitcher from '@/Components/FullscreenSwitcher';
import { AccountActions, PanduanLink } from '@/Components/Landing/ui/AccountActions';
import { useReducedMotion } from '@/Hooks/useReducedMotion';
import { animate, stagger } from '@/lib/anime';
import { cn } from '@/lib/utils';

export type NavbarProps = {
    /** Boolean dari `auth.user` (logika halaman lama dipertahankan). */
    authenticated: boolean;
    /** Boolean `hasUsers` dari props Inertia. */
    hasUsers: boolean;
    /** Callback opsional untuk membuka modal panduan/pencarian cepat. */
    onOpenGuide?: () => void;
};

const NAV_LINKS = [
    { label: 'Beranda', href: '#top', id: 'top' },
    { label: 'Layanan', href: '#modul', id: 'modul' },
    { label: 'Tentang', href: '#fitur', id: 'fitur' },
    { label: 'Statistik', href: '#statistik', id: 'statistik' },
    { label: 'Kontak', href: '#kontak', id: 'kontak' },
] as const;

const MOBILE_PANEL_ID = 'landing-mobile-panel';

/**
 * Navbar bergaya Novara: menyatu di atas Hero dark-teal, berubah menjadi
 * frosted glass dark-teal saat di-scroll melewati hero, dengan garis aktif
 * mint-aqua dan animasi masuk dari Anime.js.
 */
export default function Navbar({ authenticated, hasUsers, onOpenGuide }: NavbarProps) {
    const [scrolled, setScrolled] = useState(false);
    const [progress, setProgress] = useState(0);
    const [activeSection, setActiveSection] = useState('top');
    const [menuOpen, setMenuOpen] = useState(false);

    const navRef = useRef<HTMLElement | null>(null);
    const panelRef = useRef<HTMLDivElement | null>(null);
    const toggleRef = useRef<HTMLButtonElement | null>(null);
    const visibleSections = useRef<Set<string>>(new Set());
    const reducedMotion = useReducedMotion();

    // Animasi entrance navbar menggunakan Anime.js
    useEffect(() => {
        const nav = navRef.current;
        if (!nav || reducedMotion) return;

        const items = nav.querySelectorAll('[data-nav-item]');
        if (items.length === 0) return;

        const anim = animate(items, {
            opacity: [0, 1],
            translateY: [-14, 0],
            delay: stagger(65),
            duration: 720,
            ease: 'outExpo',
        });

        return () => {
            anim.pause();
        };
    }, [reducedMotion]);

    // Scroll: state frosted pill + progress bar
    useEffect(() => {
        let frame = 0;

        const update = () => {
            frame = 0;
            const scrollTop = window.scrollY;
            const doc = document.documentElement;
            const max = doc.scrollHeight - window.innerHeight;

            setScrolled(scrollTop > 20);
            setProgress(max > 0 ? Math.min(1, Math.max(0, scrollTop / max)) : 0);
            if (scrollTop < 180) {
                setActiveSection('top');
            }
        };

        const handleScroll = () => {
            if (frame !== 0) return;
            frame = window.requestAnimationFrame(update);
        };

        update();
        window.addEventListener('scroll', handleScroll, { passive: true });
        window.addEventListener('resize', handleScroll, { passive: true });

        return () => {
            if (frame !== 0) window.cancelAnimationFrame(frame);
            window.removeEventListener('scroll', handleScroll);
            window.removeEventListener('resize', handleScroll);
        };
    }, []);

    // Anchor aktif mengikuti section yang melintasi bagian tengah viewport
    useEffect(() => {
        if (typeof IntersectionObserver === 'undefined') return;

        const sections = NAV_LINKS.map((link) => document.getElementById(link.id)).filter(
            (element): element is HTMLElement => element !== null,
        );
        if (sections.length === 0) return;

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        visibleSections.current.add(entry.target.id);
                    } else {
                        visibleSections.current.delete(entry.target.id);
                    }
                });

                const next = NAV_LINKS.find((link) => visibleSections.current.has(link.id));
                if (next) {
                    setActiveSection(next.id);
                }
            },
            { rootMargin: '-38% 0px -45% 0px', threshold: 0 },
        );

        sections.forEach((section) => observer.observe(section));
        return () => {
            visibleSections.current.clear();
            observer.disconnect();
        };
    }, []);

    // Panel mobile: tutup saat Escape atau klik di luar
    useEffect(() => {
        if (!menuOpen) return;

        const handlePointerDown = (event: Event) => {
            const target = event.target;
            if (!(target instanceof Node)) return;
            if (panelRef.current?.contains(target)) return;
            if (toggleRef.current?.contains(target)) return;
            setMenuOpen(false);
        };

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key !== 'Escape') return;
            setMenuOpen(false);
            toggleRef.current?.focus();
        };

        document.addEventListener('pointerdown', handlePointerDown);
        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('pointerdown', handlePointerDown);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [menuOpen]);

    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth >= 1024) setMenuOpen(false);
        };

        window.addEventListener('resize', handleResize, { passive: true });
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const closeMenu = () => setMenuOpen(false);

    return (
        <header className="fixed inset-x-0 top-0 z-50">
            {/* Progress bar scroll tipis bernuansa Mint Aqua */}
            <div aria-hidden className="h-[2px] w-full overflow-hidden bg-white/[0.06]">
                <div
                    className="h-full w-full origin-left bg-gradient-to-r from-[#5CCAC0] via-[#8BE6DC] to-[#C2FAF3]"
                    style={{ transform: `scaleX(${progress})` }}
                />
            </div>

            <div className="relative mx-auto max-w-7xl px-4 pt-3 sm:px-6 lg:px-8">
                <nav
                    ref={navRef}
                    aria-label="Navigasi utama"
                    className={cn(
                        'relative flex items-center justify-between gap-3 rounded-full px-4 transition-all duration-500 ease-luxe sm:px-6',
                        scrolled
                            ? 'border border-[#8BE6DC]/20 bg-[#061C24]/95 py-2.5 shadow-[0_22px_50px_-18px_rgba(3,16,22,0.55)] backdrop-blur-2xl'
                            : 'border border-transparent bg-transparent py-3.5',
                    )}
                >
                    {/* Kiri: Logo resmi SIKAS + Wordmark */}
                    <a
                        href="#top"
                        data-nav-item
                        aria-label="SIKAS — kembali ke atas halaman"
                        className="landing-focus group flex min-w-0 items-center gap-3 rounded-full"
                    >
                        <SikasLogo compact={scrolled} />
                        <span className="flex min-w-0 flex-col">
                            <span className="text-[20px] font-bold leading-none tracking-[-0.02em] text-white">
                                SIKAS
                            </span>
                            <span className="mt-1 truncate text-[8.5px] font-semibold uppercase leading-none tracking-[0.22em] text-[#8BE6DC]/80">
                                Sistem Anggaran Sekolah
                            </span>
                        </span>
                    </a>

                    {/* Tengah: Link Navigasi Desktop dengan garis bawah Mint Aqua */}
                    <div className="hidden items-center gap-1 lg:flex">
                        {NAV_LINKS.map((link) => {
                            const active = activeSection === link.id;

                            return (
                                <a
                                    key={link.id}
                                    href={link.href}
                                    data-nav-item
                                    aria-current={active ? 'true' : undefined}
                                    className={cn(
                                        'landing-focus relative px-4 py-2 text-[13.5px] font-medium transition-colors duration-300',
                                        active
                                            ? 'text-white'
                                            : 'text-white/70 hover:text-white',
                                    )}
                                >
                                    {link.label}
                                    <span
                                        aria-hidden
                                        className={cn(
                                            'absolute inset-x-4 bottom-0.5 h-[2px] origin-center rounded-full bg-[#8BE6DC] shadow-[0_0_12px_rgba(139,230,220,0.85)] transition-transform duration-300 ease-luxe',
                                            active ? 'scale-x-100' : 'scale-x-0',
                                        )}
                                    />
                                </a>
                            );
                        })}
                    </div>

                    {/* Kanan: Ikon Pencarian/Panduan + Tema + Tombol Pill Mint */}
                    <div data-nav-item className="hidden items-center gap-2.5 lg:flex">
                        <button
                            type="button"
                            onClick={() => {
                                if (onOpenGuide) {
                                    onOpenGuide();
                                } else {
                                    document.getElementById('modul')?.scrollIntoView({ behavior: 'smooth' });
                                }
                            }}
                            aria-label="Jelajahi modul & panduan cepat"
                            title="Panduan & Pencarian Modul"
                            className="landing-focus flex h-9 w-9 items-center justify-center rounded-full text-white/75 transition-colors duration-200 hover:bg-white/10 hover:text-[#8BE6DC]"
                        >
                            <SearchIcon />
                        </button>

                        <div className="flex shrink-0 items-center gap-0.5 rounded-full border border-white/15 bg-white/[0.06] p-1 text-white backdrop-blur-md [&_button]:h-8 [&_button]:w-8 [&_button]:rounded-full [&_button]:border-transparent [&_button]:bg-transparent [&_button]:text-white/80 [&_button]:shadow-none [&_button:hover]:translate-y-0 [&_button:hover]:bg-white/15 [&_button:hover]:text-[#8BE6DC]">
                            <FullscreenSwitcher />
                            <DarkModeSwitcher />
                        </div>

                        <AccountActions
                            authenticated={authenticated}
                            hasUsers={hasUsers}
                            context="navbar"
                        />
                    </div>

                    {/* Hamburger (Mobile) */}
                    <button
                        ref={toggleRef}
                        type="button"
                        onClick={() => setMenuOpen((open) => !open)}
                        aria-expanded={menuOpen}
                        aria-controls={menuOpen ? MOBILE_PANEL_ID : undefined}
                        aria-label={menuOpen ? 'Tutup menu navigasi' : 'Buka menu navigasi'}
                        className="landing-focus relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/[0.08] text-white transition-colors duration-300 hover:border-[#8BE6DC]/50 lg:hidden"
                    >
                        <span aria-hidden className="relative block h-3.5 w-5">
                            <span
                                className={cn(
                                    'absolute left-0 top-0 h-px w-5 bg-current transition-transform duration-300 ease-luxe',
                                    menuOpen && 'translate-y-[6px] rotate-45',
                                )}
                            />
                            <span
                                className={cn(
                                    'absolute left-0 top-[6px] h-px w-5 bg-current transition-opacity duration-200',
                                    menuOpen && 'opacity-0',
                                )}
                            />
                            <span
                                className={cn(
                                    'absolute left-0 top-[12px] h-px w-5 bg-current transition-transform duration-300 ease-luxe',
                                    menuOpen && '-translate-y-[6px] -rotate-45',
                                )}
                            />
                        </span>
                    </button>
                </nav>

                {/* Panel Kaca Mobile */}
                {menuOpen ? (
                    <div
                        id={MOBILE_PANEL_ID}
                        ref={panelRef}
                        className="absolute inset-x-4 top-[calc(100%_+_0.5rem)] z-50 animate-rise rounded-3xl border border-white/15 bg-[#071E27]/95 p-4 text-white shadow-2xl backdrop-blur-2xl motion-reduce:animate-none sm:inset-x-6 lg:hidden"
                    >
                        <div className="flex flex-col gap-0.5">
                            {NAV_LINKS.map((link) => (
                                <a
                                    key={link.id}
                                    href={link.href}
                                    onClick={closeMenu}
                                    className="landing-focus flex items-center justify-between rounded-2xl px-3.5 py-2.5 text-sm font-medium text-white/80 transition-colors duration-200 hover:bg-white/[0.08] hover:text-[#8BE6DC]"
                                >
                                    {link.label}
                                    <ArrowRightIcon />
                                </a>
                            ))}
                        </div>

                        <div className="my-3 h-px bg-gradient-to-r from-transparent via-[#8BE6DC]/30 to-transparent" aria-hidden />

                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center gap-2 [&_button]:border-white/15 [&_button]:bg-white/10 [&_button]:text-white [&_button]:shadow-none [&_button:hover]:bg-white/20 [&_button:hover]:text-[#8BE6DC]">
                                <FullscreenSwitcher />
                                <DarkModeSwitcher />
                            </div>
                            <PanduanLink className="landing-focus rounded-full px-3 py-1.5 text-[13px] font-medium text-[#8BE6DC] transition-colors duration-200 hover:text-white" />
                        </div>

                        <div className="mt-3 border-t border-white/10 pt-3">
                            <div className="flex flex-wrap items-center gap-2">
                                <AccountActions
                                    authenticated={authenticated}
                                    hasUsers={hasUsers}
                                    context="navbar"
                                    className="w-full justify-center"
                                />
                            </div>
                        </div>
                    </div>
                ) : null}
            </div>
        </header>
    );
}

/**
 * Logo resmi SIKAS menggunakan aset `public/images/landing/large.ico`
 * dengan efek drop-shadow halus & animasi hover.
 */
export function SikasLogo({ compact = false }: { compact?: boolean }) {
    return (
        <span
            aria-hidden
            className={cn(
                'relative flex shrink-0 items-center justify-center transition-all duration-300 ease-luxe group-hover:scale-105',
                compact ? 'h-9 w-9' : 'h-10 w-10',
            )}
        >
            <img
                src="/images/landing/large.ico"
                alt=""
                className="h-full w-full object-contain drop-shadow-[0_4px_12px_rgba(139,230,220,0.35)]"
            />
        </span>
    );
}

function SearchIcon() {
    return (
        <svg
            aria-hidden
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.9}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-[18px] w-[18px]"
        >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
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
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4 text-[#8BE6DC]"
        >
            <path d="M5 12h14" />
            <path d="m13 6 6 6-6 6" />
        </svg>
    );
}
