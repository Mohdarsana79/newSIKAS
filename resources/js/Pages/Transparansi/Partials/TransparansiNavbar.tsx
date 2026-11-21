import { Link } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';

import DarkModeSwitcher from '@/Components/DarkModeSwitcher';
import FullscreenSwitcher from '@/Components/FullscreenSwitcher';
import { SikasLogo } from '@/Components/Landing/Navbar';
import { AccountActions } from '@/Components/Landing/ui/AccountActions';
import { cn } from '@/lib/utils';

interface TransparansiNavbarProps {
    authenticated: boolean;
    hasUsers: boolean;
    namaSekolah: string;
}

const SECTION_LINKS = [
    { label: 'Ringkasan', href: '#ringkasan', id: 'ringkasan' },
    { label: 'Realisasi', href: '#realisasi', id: 'realisasi' },
    { label: 'RKA Tahapan', href: '#rka-tahapan', id: 'rka-tahapan' },
    { label: 'Poster', href: '#poster', id: 'poster' },
] as const;

const MOBILE_PANEL_ID = 'transparansi-mobile-panel';

export default function TransparansiNavbar({
    authenticated,
    hasUsers,
    namaSekolah,
}: TransparansiNavbarProps) {
    const [scrolled, setScrolled] = useState(false);
    const [progress, setProgress] = useState(0);
    const [activeSection, setActiveSection] = useState('ringkasan');
    const [menuOpen, setMenuOpen] = useState(false);

    const panelRef = useRef<HTMLDivElement | null>(null);
    const toggleRef = useRef<HTMLButtonElement | null>(null);
    const visibleSections = useRef<Set<string>>(new Set());

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
                setActiveSection('ringkasan');
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

    useEffect(() => {
        if (typeof IntersectionObserver === 'undefined') return;

        const sections = SECTION_LINKS.map((link) => document.getElementById(link.id)).filter(
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

                const next = SECTION_LINKS.find((link) => visibleSections.current.has(link.id));
                if (next) {
                    setActiveSection(next.id);
                }
            },
            { rootMargin: '-32% 0px -48% 0px', threshold: 0 },
        );

        sections.forEach((section) => observer.observe(section));
        return () => {
            visibleSections.current.clear();
            observer.disconnect();
        };
    }, []);

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

    return (
        <header className="fixed inset-x-0 top-0 z-50 print:hidden">
            <div aria-hidden className="h-[2px] w-full overflow-hidden bg-white/[0.06]">
                <div
                    className="h-full w-full origin-left bg-gradient-to-r from-[#5CCAC0] via-[#8BE6DC] to-[#C2FAF3]"
                    style={{ transform: `scaleX(${progress})` }}
                />
            </div>

            <div className="relative mx-auto max-w-7xl px-4 pt-3 sm:px-6 lg:px-8">
                <nav
                    aria-label="Navigasi portal transparansi"
                    className={cn(
                        'relative flex items-center justify-between gap-3 rounded-full px-4 transition-all duration-500 sm:px-6',
                        scrolled
                            ? 'border border-[#8BE6DC]/20 bg-[#061C24]/95 py-2.5 shadow-[0_22px_50px_-18px_rgba(3,16,22,0.55)] backdrop-blur-2xl'
                            : 'border border-white/10 bg-[#061C24]/55 py-3 backdrop-blur-xl',
                    )}
                >
                    {/* Kiri: Brand SIKAS + Portal Transparansi */}
                    <Link
                        href="/"
                        className="landing-focus group flex min-w-0 items-center gap-3 rounded-full"
                    >
                        <SikasLogo compact={scrolled} />
                        <span className="flex min-w-0 flex-col">
                            <span className="flex items-center gap-2 text-[17px] font-bold leading-none tracking-[-0.02em] text-white sm:text-[18px]">
                                <span>SIKAS</span>
                                <span className="hidden rounded-full border border-[#8BE6DC]/35 bg-[#8BE6DC]/15 px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.12em] text-[#8BE6DC] sm:inline-flex">
                                    Transparansi
                                </span>
                            </span>
                            <span className="mt-1 max-w-[180px] truncate text-[9.5px] font-medium leading-none text-white/70 sm:max-w-[230px]">
                                {namaSekolah}
                            </span>
                        </span>
                    </Link>

                    {/* Tengah: Navigasi Desktop */}
                    <div className="hidden items-center gap-1 lg:flex">
                        <Link
                            href="/"
                            className="landing-focus relative px-3.5 py-2 text-[13.5px] font-medium text-white/70 transition-colors duration-200 hover:text-white"
                        >
                            Beranda
                        </Link>
                        {SECTION_LINKS.map((link) => {
                            const active = activeSection === link.id;
                            return (
                                <a
                                    key={link.id}
                                    href={link.href}
                                    aria-current={active ? 'true' : undefined}
                                    className={cn(
                                        'landing-focus relative px-3.5 py-2 text-[13.5px] font-medium transition-colors duration-200',
                                        active ? 'text-white' : 'text-white/70 hover:text-white',
                                    )}
                                >
                                    {link.label}
                                    <span
                                        aria-hidden
                                        className={cn(
                                            'absolute inset-x-3.5 bottom-0.5 h-[2px] origin-center rounded-full bg-[#8BE6DC] shadow-[0_0_12px_rgba(139,230,220,0.85)] transition-transform duration-300',
                                            active ? 'scale-x-100' : 'scale-x-0',
                                        )}
                                    />
                                </a>
                            );
                        })}
                    </div>

                    {/* Kanan: Tema + Akun Pengelola */}
                    <div className="hidden items-center gap-2.5 lg:flex">
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

                    {/* Mobile Toggle */}
                    <button
                        ref={toggleRef}
                        type="button"
                        onClick={() => setMenuOpen((open) => !open)}
                        aria-expanded={menuOpen}
                        aria-controls={menuOpen ? MOBILE_PANEL_ID : undefined}
                        aria-label={menuOpen ? 'Tutup menu navigasi' : 'Buka menu navigasi'}
                        className="landing-focus relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/[0.08] text-white transition-colors hover:border-[#8BE6DC]/50 lg:hidden"
                    >
                        <span aria-hidden className="relative block h-3.5 w-5">
                            <span
                                className={cn(
                                    'absolute left-0 top-0 h-px w-5 bg-current transition-transform duration-300',
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
                                    'absolute left-0 top-[12px] h-px w-5 bg-current transition-transform duration-300',
                                    menuOpen && '-translate-y-[6px] -rotate-45',
                                )}
                            />
                        </span>
                    </button>
                </nav>

                {menuOpen && (
                    <div
                        id={MOBILE_PANEL_ID}
                        ref={panelRef}
                        className="absolute inset-x-4 top-[calc(100%_+_0.5rem)] z-50 rounded-3xl border border-white/15 bg-[#071E27]/95 p-4 text-white shadow-2xl backdrop-blur-2xl sm:inset-x-6 lg:hidden"
                    >
                        <div className="flex flex-col gap-0.5">
                            <Link
                                href="/"
                                onClick={() => setMenuOpen(false)}
                                className="flex items-center justify-between rounded-2xl px-3.5 py-2.5 text-sm font-medium text-white/80 transition-colors hover:bg-white/[0.08] hover:text-[#8BE6DC]"
                            >
                                Beranda SIKAS
                            </Link>
                            {SECTION_LINKS.map((link) => (
                                <a
                                    key={link.id}
                                    href={link.href}
                                    onClick={() => setMenuOpen(false)}
                                    className="flex items-center justify-between rounded-2xl px-3.5 py-2.5 text-sm font-medium text-white/80 transition-colors hover:bg-white/[0.08] hover:text-[#8BE6DC]"
                                >
                                    {link.label}
                                </a>
                            ))}
                        </div>

                        <div className="my-3 h-px bg-gradient-to-r from-transparent via-[#8BE6DC]/30 to-transparent" />

                        <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2 [&_button]:border-white/15 [&_button]:bg-white/10 [&_button]:text-white [&_button]:shadow-none [&_button:hover]:bg-white/20 [&_button:hover]:text-[#8BE6DC]">
                                <FullscreenSwitcher />
                                <DarkModeSwitcher />
                            </div>
                            <AccountActions
                                authenticated={authenticated}
                                hasUsers={hasUsers}
                                context="navbar"
                            />
                        </div>
                    </div>
                )}
            </div>
        </header>
    );
}
