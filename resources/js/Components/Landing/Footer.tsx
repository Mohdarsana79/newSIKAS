import { SikasLogo } from '@/Components/Landing/Navbar';
import { PanduanLink } from '@/Components/Landing/ui/AccountActions';
import { animate, stagger, useAnimeInView } from '@/lib/anime';

const FOOTER_LINKS = [
    { label: 'Beranda', href: '#top' },
    { label: 'Layanan', href: '#modul' },
    { label: 'Tentang', href: '#fitur' },
    { label: 'Statistik', href: '#statistik' },
] as const;

const AUTHOR_URL = 'https://www.youtube.com/@giandarsana5772';
const AUTHOR_NAME = 'Moh Gian Darsana, S.Pd.,Gr';

/**
 * Section 5: Clean Minimalist Footer bergaya Novara Wealth Advisory:
 * - Baris utama: Logo segitiga gunung SIKAS, tautan navigasi horizontal, ikon sosial,
 *   serta motto vertikal "MASA DEPAN ANGGARAN LEBIH CERAH BERSAMA." di sebelah kanan.
 * - Baris bawah: Hak cipta di kiri & tautan informasi di kanan.
 */
export function Footer() {
    const { ref: footerRef } = useAnimeInView<HTMLElement>(
        (container, reducedMotion) => {
            if (reducedMotion) return;
            const items = container.querySelectorAll('[data-footer-reveal]');
            if (items.length === 0) return;

            return animate(items, {
                opacity: [0, 1],
                translateY: [18, 0],
                duration: 750,
                delay: stagger(80),
                ease: 'outExpo',
            });
        },
        {
            threshold: 0.15,
            initialHideSelector: '[data-footer-reveal]',
        },
    );

    return (
        <footer
            id="kontak"
            ref={footerRef}
            className="relative isolate overflow-hidden bg-[#F8FBFB] pt-4 text-[#08222B] dark:bg-[#051319] dark:text-white"
        >
            <div className="mx-auto max-w-7xl px-6 lg:px-8">
                {/* Baris Utama Footer */}
                <div className="flex flex-col items-start justify-between gap-8 py-10 lg:flex-row lg:items-center lg:gap-10">
                    {/* Kiri: Logo Resmi SIKAS + Wordmark */}
                    <a
                        href="#top"
                        data-footer-reveal
                        className="landing-focus group flex items-center gap-3 rounded-xl"
                    >
                        <SikasLogo />
                        <span className="flex flex-col">
                            <span className="font-sans text-[21px] font-bold leading-none tracking-[-0.025em] text-[#08222B] dark:text-white">
                                SIKAS
                            </span>
                            <span className="mt-1 text-[8.5px] font-semibold uppercase leading-none tracking-[0.22em] text-[#2A6F78] dark:text-[#8BE6DC]">
                                Sistem Anggaran Sekolah
                            </span>
                        </span>
                    </a>

                    {/* Tengah: Navigasi Horizontal */}
                    <nav aria-label="Navigasi footer" data-footer-reveal>
                        <ul className="flex flex-wrap items-center gap-x-7 gap-y-2.5">
                            {FOOTER_LINKS.map((link) => (
                                <li key={link.href}>
                                    <a
                                        href={link.href}
                                        className="landing-focus text-[13px] font-medium text-[#3E5D67] transition-colors duration-200 hover:text-[#08222B] dark:text-white/65 dark:hover:text-[#8BE6DC]"
                                    >
                                        {link.label}
                                    </a>
                                </li>
                            ))}
                            <li>
                                <PanduanLink className="landing-focus text-[13px] font-medium text-[#3E5D67] transition-colors duration-200 hover:text-[#08222B] dark:text-white/65 dark:hover:text-[#8BE6DC]" />
                            </li>
                        </ul>
                    </nav>

                    {/* Kanan: Ikon Sosial + Garis Vertikal + Tagline seperti referensi Novara */}
                    <div data-footer-reveal className="flex flex-wrap items-center gap-6">
                        <div className="flex items-center gap-2.5">
                            <a
                                href={AUTHOR_URL}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label="LinkedIn & Profil Pengembang"
                                className="landing-focus flex h-8 w-8 items-center justify-center rounded-lg bg-[#09242E] text-white transition-transform duration-200 hover:-translate-y-0.5 hover:bg-[#144754] dark:bg-white/10 dark:hover:bg-[#8BE6DC] dark:hover:text-[#06222B]"
                            >
                                <LinkedInIcon />
                            </a>
                            <a
                                href={AUTHOR_URL}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label="Instagram SIKAS"
                                className="landing-focus flex h-8 w-8 items-center justify-center rounded-lg bg-[#09242E] text-white transition-transform duration-200 hover:-translate-y-0.5 hover:bg-[#144754] dark:bg-white/10 dark:hover:bg-[#8BE6DC] dark:hover:text-[#06222B]"
                            >
                                <InstagramIcon />
                            </a>
                            <a
                                href={AUTHOR_URL}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label="Channel YouTube Panduan SIKAS"
                                className="landing-focus flex h-8 w-8 items-center justify-center rounded-lg bg-[#09242E] text-white transition-transform duration-200 hover:-translate-y-0.5 hover:bg-[#144754] dark:bg-white/10 dark:hover:bg-[#8BE6DC] dark:hover:text-[#06222B]"
                            >
                                <YouTubeIcon />
                            </a>
                        </div>

                        <div className="border-l border-[#09242E]/15 pl-5 dark:border-white/15">
                            <p className="text-[10px] font-bold uppercase leading-[1.45] tracking-[0.16em] text-[#08222B] dark:text-white/85">
                                <span className="block">Masa Depan Anggaran</span>
                                <span className="block">Lebih Cerah Bersama.</span>
                            </p>
                        </div>
                    </div>
                </div>

                {/* Baris Bawah Copyright & Tautan */}
                <div
                    data-footer-reveal
                    className="flex flex-col items-center justify-between gap-4 border-t border-[#09242E]/10 py-6 text-[11.5px] text-[#53717B] dark:border-white/10 dark:text-white/55 sm:flex-row"
                >
                    <p>
                        &copy; {new Date().getFullYear()} SIKAS Advisory. Created by{' '}
                        <a
                            href={AUTHOR_URL}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="landing-focus font-semibold text-[#08222B] underline decoration-[#08222B]/25 underline-offset-4 transition-colors hover:text-[#1D6470] dark:text-white/80 dark:decoration-white/25 dark:hover:text-[#8BE6DC]"
                        >
                            {AUTHOR_NAME}
                        </a>
                        . All rights reserved.
                    </p>

                    <div className="flex items-center gap-6">
                        <a
                            href="#top"
                            className="transition-colors hover:text-[#08222B] dark:hover:text-white"
                        >
                            Privasi
                        </a>
                        <a
                            href="#modul"
                            className="transition-colors hover:text-[#08222B] dark:hover:text-white"
                        >
                            Ketentuan
                        </a>
                        <a
                            href="#statistik"
                            className="transition-colors hover:text-[#08222B] dark:hover:text-white"
                        >
                            Peta Situs
                        </a>
                    </div>
                </div>
            </div>
        </footer>
    );
}

function LinkedInIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
            <path d="M6.94 8.5a1.56 1.56 0 1 1 0-3.12 1.56 1.56 0 0 1 0 3.12ZM5.5 9.75h2.88V19H5.5V9.75Zm4.68 0h2.76v1.26h.04c.38-.72 1.32-1.48 2.72-1.48 2.91 0 3.45 1.91 3.45 4.4V19h-2.88v-4.5c0-1.07-.02-2.45-1.5-2.45-1.5 0-1.73 1.17-1.73 2.37V19h-2.86V9.75Z" />
        </svg>
    );
}

function InstagramIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
            <rect x="3.5" y="3.5" width="17" height="17" rx="4.5" />
            <circle cx="12" cy="12" r="3.8" />
            <circle cx="17.2" cy="6.8" r="0.8" fill="currentColor" />
        </svg>
    );
}

function YouTubeIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
            <path d="M21.6 7.2a2.7 2.7 0 0 0-1.9-1.9C18 4.8 12 4.8 12 4.8s-6 0-7.7.5a2.7 2.7 0 0 0-1.9 1.9C2 8.9 2 12 2 12s0 3.1.4 4.8a2.7 2.7 0 0 0 1.9 1.9c1.7.5 7.7.5 7.7.5s6 0 7.7-.5a2.7 2.7 0 0 0 1.9-1.9c.4-1.7.4-4.8.4-4.8s0-3.1-.4-4.8ZM10 15.2V8.8l5.5 3.2-5.5 3.2Z" />
        </svg>
    );
}

export default Footer;
