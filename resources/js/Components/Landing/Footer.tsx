import { PanduanLink } from '@/Components/Landing/ui/AccountActions';

const FOOTER_LINKS = [
    { label: 'Fitur', href: '#fitur' },
    { label: 'Modul', href: '#modul' },
    { label: 'Cara Kerja', href: '#cara-kerja' },
] as const;

const AUTHOR_URL = 'https://www.youtube.com/@giandarsana5772';
const AUTHOR_NAME = 'Moh Gian Darsana Darsana, S.Pd.,Gr';

/** Monogram mengikuti gaya navbar (brand gradient + glyph emas). */
function Monogram() {
    return (
        <span
            aria-hidden
            className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-brand-500 via-brand-600 to-brand-800 shadow-glow-violet ring-1 ring-gold-400/40"
        >
            <span className="absolute inset-0 bg-gradient-to-br from-white/25 via-transparent to-transparent" />
            <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.6}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="relative h-6 w-6 text-gold-200"
            >
                <path d="M5 5.25A2.25 2.25 0 0 1 7.25 3h9.5A2.25 2.25 0 0 1 19 5.25v13.5A2.25 2.25 0 0 1 16.75 21h-9.5A2.25 2.25 0 0 1 5 18.75V5.25Z" />
                <path d="M8.25 7.5h7.5" />
                <path d="M8.25 10.75h3.5" />
                <path d="m8.4 16.9 2.5-2.9 2 1.8 2.8-3.4" />
            </svg>
        </span>
    );
}

export function Footer() {
    return (
        <footer className="relative isolate overflow-hidden border-t border-ink-900/[0.08] bg-white/40 dark:border-white/10 dark:bg-ink-950/50">
            <span
                aria-hidden
                className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold-500/25 to-transparent"
            />

            <div className="relative z-10 mx-auto max-w-7xl px-6 lg:px-8">
                <div className="flex flex-col gap-10 py-14 sm:py-16 md:flex-row md:items-start md:justify-between md:gap-16">
                    <div className="max-w-sm">
                        <div className="flex items-center gap-3">
                            <Monogram />
                            <div className="flex min-w-0 flex-col">
                                <span className="font-display text-xl font-semibold leading-none tracking-[-0.01em] text-ink-900 dark:text-white">
                                    SIKAS
                                </span>
                                <span className="mt-1.5 text-[9px] font-semibold uppercase leading-none tracking-[0.16em] text-ink-900/60 dark:text-white/55">
                                    Kelola Anggaran, Raih Prestasi
                                </span>
                            </div>
                        </div>

                        <p className="mt-5 text-[13.5px] font-medium leading-[1.7] text-ink-900/70 dark:text-white/65">
                            Sistem Informasi Kegiatan Anggaran Sekolah
                        </p>
                        <p className="mt-1.5 text-[12.5px] leading-[1.7] text-ink-900/60 dark:text-white/55">
                            Satu alur tenang untuk merencanakan, mencatat, dan melaporkan anggaran BOSP.
                        </p>
                    </div>

                    <nav aria-label="Navigasi footer">
                        <p className="landing-eyebrow">Jelajahi</p>
                        <ul className="mt-4 flex flex-wrap gap-x-8 gap-y-3 sm:flex-col sm:gap-y-3">
                            {FOOTER_LINKS.map((link) => (
                                <li key={link.href}>
                                    <a
                                        href={link.href}
                                        className="landing-focus rounded-sm text-[13.5px] font-medium text-ink-900/60 transition-colors duration-300 ease-luxe hover:text-gold-600 dark:text-white/55 dark:hover:text-gold-300"
                                    >
                                        {link.label}
                                    </a>
                                </li>
                            ))}
                            <li>
                                <PanduanLink className="landing-focus rounded-sm text-[13.5px] font-medium text-ink-900/60 transition-colors duration-300 ease-luxe hover:text-gold-600 dark:text-white/55 dark:hover:text-gold-300" />
                            </li>
                        </ul>
                    </nav>
                </div>

                <div className="border-t border-ink-900/[0.08] py-6 dark:border-white/10">
                    <p className="text-center text-[12px] leading-[1.7] text-ink-900/60 dark:text-white/55">
                        &copy; 2025 SIKAS Team. Created By{' '}
                        <a
                            href={AUTHOR_URL}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="landing-focus rounded-sm font-semibold text-ink-900/65 underline decoration-ink-900/20 underline-offset-4 transition-colors duration-300 ease-luxe hover:text-gold-600 hover:decoration-gold-500/60 dark:text-white/60 dark:decoration-white/20 dark:hover:text-gold-300 dark:hover:decoration-gold-300/60"
                        >
                            {AUTHOR_NAME}
                        </a>
                    </p>
                </div>
            </div>
        </footer>
    );
}

export default Footer;
