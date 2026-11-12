import { useEffect, useRef, useState } from 'react';

import DarkModeSwitcher from '@/Components/DarkModeSwitcher';
import FullscreenSwitcher from '@/Components/FullscreenSwitcher';
import { AccountActions, PanduanLink } from '@/Components/Landing/ui/AccountActions';
import { cn } from '@/lib/utils';

export type NavbarProps = {
    /** Boolean dari `auth.user` (logika halaman lama dipertahankan). */
    authenticated: boolean;
    /** Boolean `hasUsers` dari props Inertia. */
    hasUsers: boolean;
};

const NAV_LINKS = [
    { label: 'Fitur', href: '#fitur', id: 'fitur' },
    { label: 'Modul', href: '#modul', id: 'modul' },
    { label: 'Cara Kerja', href: '#cara-kerja', id: 'cara-kerja' },
] as const;

const MOBILE_PANEL_ID = 'landing-mobile-panel';

/**
 * Navbar landing page: pill kaca yang mengecil saat scroll, anchor aktif
 * mengikuti section yang terlihat, panel mobile, dan progress bar tipis.
 * Sticky/fixed sehingga tidak menggeser konten di bawahnya.
 */
export default function Navbar({ authenticated, hasUsers }: NavbarProps) {
    const [scrolled, setScrolled] = useState(false);
    const [progress, setProgress] = useState(0);
    const [activeSection, setActiveSection] = useState('');
    const [menuOpen, setMenuOpen] = useState(false);

    const panelRef = useRef<HTMLDivElement | null>(null);
    const toggleRef = useRef<HTMLButtonElement | null>(null);
    const visibleSections = useRef<Set<string>>(new Set());

    // Scroll: state mengecil + progress bar (di-throttle lewat requestAnimationFrame).
    useEffect(() => {
        let frame = 0;

        const update = () => {
            frame = 0;
            const scrollTop = window.scrollY;
            const doc = document.documentElement;
            const max = doc.scrollHeight - window.innerHeight;

            setScrolled(scrollTop > 24);
            setProgress(max > 0 ? Math.min(1, Math.max(0, scrollTop / max)) : 0);
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

    // Anchor aktif mengikuti section yang melintasi bagian tengah viewport.
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

                // Tanpa section di pita tengah (mis. kembali ke hero) → tanpa underline.
                const next = NAV_LINKS.find((link) => visibleSections.current.has(link.id));
                setActiveSection(next?.id ?? '');
            },
            { rootMargin: '-45% 0px -45% 0px', threshold: 0 },
        );

        sections.forEach((section) => observer.observe(section));
        return () => {
            visibleSections.current.clear();
            observer.disconnect();
        };
    }, []);

    // Panel mobile: tutup saat Escape atau klik di luar.
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

    // Panel mobile hanya relevan di bawah breakpoint lg.
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
            {/* Progress bar scroll: brand → gold. */}
            <div aria-hidden className="h-[2px] w-full overflow-hidden bg-ink-900/[0.06] dark:bg-white/[0.06]">
                <div
                    className="h-full w-full origin-left bg-gradient-to-r from-brand-500 via-brand-400 to-gold-400"
                    style={{ transform: `scaleX(${progress})` }}
                />
            </div>

            <div className="relative mx-auto max-w-7xl px-4 pt-3 sm:px-6 lg:px-8">
                <nav
                    aria-label="Navigasi utama"
                    className={cn(
                        'landing-glass relative flex items-center justify-between gap-2 rounded-full px-3 transition-all duration-500 ease-luxe sm:gap-4 sm:px-4',
                        scrolled ? 'py-1.5' : 'py-2.5',
                    )}
                >
                    {/* Kiri: monogram + wordmark */}
                    <a
                        href="#top"
                        aria-label="SIKAS — kembali ke atas halaman"
                        className="landing-focus group flex min-w-0 items-center gap-2.5 rounded-full"
                    >
                        <Monogram compact={scrolled} />
                        <span className="flex min-w-0 flex-col">
                            <span className="font-display text-[19px] font-semibold leading-none tracking-tight text-ink-900 dark:text-white">
                                SIKAS
                            </span>
                            <span className="mt-1 hidden truncate text-[9px] font-semibold uppercase leading-none tracking-[0.16em] text-ink-900/60 dark:text-white/50 md:block">
                                Kelola Anggaran, Raih Prestasi
                            </span>
                        </span>
                    </a>

                    {/* Tengah: anchor desktop */}
                    <div className="hidden items-center gap-0.5 lg:flex">
                        {NAV_LINKS.map((link) => {
                            const active = activeSection === link.id;

                            return (
                                <a
                                    key={link.id}
                                    href={link.href}
                                    aria-current={active ? 'true' : undefined}
                                    className={cn(
                                        'landing-focus relative rounded-full px-3.5 py-2 text-[13.5px] font-medium transition-colors duration-300 ease-luxe',
                                        active
                                            ? 'text-ink-900 dark:text-white'
                                            : 'text-ink-900/65 hover:text-ink-900 dark:text-white/60 dark:hover:text-white',
                                    )}
                                >
                                    {link.label}
                                    <span
                                        aria-hidden
                                        className={cn(
                                            'absolute inset-x-3 bottom-0 h-px origin-center bg-gradient-to-r from-transparent via-gold-400 to-transparent transition-transform duration-500 ease-luxe',
                                            active ? 'scale-x-100' : 'scale-x-0',
                                        )}
                                    />
                                </a>
                            );
                        })}
                    </div>

                    {/* Kanan: switcher + panduan + akun (desktop) */}
                    <div className="hidden items-center gap-2 lg:flex">
                        <div className="flex shrink-0 items-center gap-1 rounded-full border border-ink-900/10 bg-white/60 p-1 dark:border-white/10 dark:bg-white/[0.04]">
                            <FullscreenSwitcher />
                            <DarkModeSwitcher />
                        </div>
                        <PanduanLink className="landing-focus hidden rounded-full px-2.5 py-1.5 text-[13.5px] font-medium text-ink-900/70 transition-colors duration-300 hover:text-ink-900 dark:text-white/65 dark:hover:text-white md:inline" />
                        <AccountActions
                            authenticated={authenticated}
                            hasUsers={hasUsers}
                            context="navbar"
                            className="px-5 py-2.5 text-sm"
                        />
                    </div>

                    {/* Hamburger (mobile) */}
                    <button
                        ref={toggleRef}
                        type="button"
                        onClick={() => setMenuOpen((open) => !open)}
                        aria-expanded={menuOpen}
                        aria-controls={menuOpen ? MOBILE_PANEL_ID : undefined}
                        aria-label={menuOpen ? 'Tutup menu navigasi' : 'Buka menu navigasi'}
                        className="landing-focus relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-ink-900/10 bg-white/70 text-ink-900 transition-colors duration-300 hover:border-gold-500/40 dark:border-white/15 dark:bg-white/[0.06] dark:text-white dark:hover:border-gold-400/45 lg:hidden"
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

                {/* Panel kaca mobile */}
                {menuOpen ? (
                    <div
                        id={MOBILE_PANEL_ID}
                        ref={panelRef}
                        className="landing-glass absolute inset-x-4 top-[calc(100%_+_0.5rem)] z-50 animate-rise rounded-3xl p-4 motion-reduce:animate-none sm:inset-x-6 lg:hidden"
                    >
                        <div className="flex flex-col gap-0.5">
                            {NAV_LINKS.map((link) => (
                                <a
                                    key={link.id}
                                    href={link.href}
                                    onClick={closeMenu}
                                    className="landing-focus flex items-center justify-between rounded-2xl px-3.5 py-2.5 text-sm font-medium text-ink-900/75 transition-colors duration-300 hover:bg-white/50 hover:text-ink-900 dark:text-white/75 dark:hover:bg-white/[0.06] dark:hover:text-white"
                                >
                                    {link.label}
                                    <ArrowRightIcon />
                                </a>
                            ))}
                        </div>

                        <div className="my-3 h-px bg-gradient-to-r from-transparent via-gold-500/30 to-transparent" aria-hidden />

                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                                <FullscreenSwitcher />
                                <DarkModeSwitcher />
                            </div>
                            <PanduanLink className="landing-focus rounded-full px-3 py-1.5 text-[13px] font-medium text-ink-900/60 transition-colors duration-300 hover:text-ink-900 dark:text-white/60 dark:hover:text-white" />
                        </div>

                        <div className="mt-3 border-t border-ink-900/[0.06] pt-3 dark:border-white/10">
                            <div className="flex flex-wrap items-center gap-2">
                                <AccountActions
                                    authenticated={authenticated}
                                    hasUsers={hasUsers}
                                    context="navbar"
                                    className="px-5 py-2.5 text-sm"
                                />
                            </div>
                        </div>
                    </div>
                ) : null}
            </div>
        </header>
    );
}

function Monogram({ compact }: { compact: boolean }) {
    return (
        <span
            aria-hidden
            className={cn(
                'relative flex shrink-0 items-center justify-center overflow-hidden bg-gradient-to-br from-brand-500 via-brand-600 to-brand-700 shadow-glow-violet ring-1 ring-gold-400/40 transition-all duration-500 ease-luxe',
                compact ? 'h-10 w-10 rounded-xl' : 'h-12 w-12 rounded-2xl',
            )}
        >
            <span className="absolute inset-0 bg-gradient-to-br from-white/25 via-transparent to-transparent" />
            <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.6}
                strokeLinecap="round"
                strokeLinejoin="round"
                className={cn('relative text-gold-200 transition-all duration-500 ease-luxe', compact ? 'h-5 w-5' : 'h-6 w-6')}
            >
                <path d="M5 5.25A2.25 2.25 0 0 1 7.25 3h9.5A2.25 2.25 0 0 1 19 5.25v13.5A2.25 2.25 0 0 1 16.75 21h-9.5A2.25 2.25 0 0 1 5 18.75V5.25Z" />
                <path d="M8.25 7.5h7.5" />
                <path d="M8.25 10.75h3.5" />
                <path d="m8.4 16.9 2.5-2.9 2 1.8 2.8-3.4" />
            </svg>
        </span>
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
            className="h-4 w-4 text-gold-500/80 dark:text-gold-400/80"
        >
            <path d="M5 12h14" />
            <path d="m13 6 6 6-6 6" />
        </svg>
    );
}
