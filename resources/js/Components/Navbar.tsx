import Dropdown from '@/Components/Dropdown';
import DarkModeSwitcher from '@/Components/DarkModeSwitcher';
import FeatureSearchModal from '@/Components/FeatureSearchModal';
import FullscreenSwitcher from '@/Components/FullscreenSwitcher';
import NotificationDropdown from '@/Components/NotificationDropdown';
import StatusBadge from '@/Components/ui/StatusBadge';
import { usePage } from '@inertiajs/react';
import { MessageSquare, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { CopilotWindowState } from '@/Layouts/AuthenticatedLayout';

interface NavbarProps {
    header?: React.ReactNode;
    sidebarOpen: boolean;
    setSidebarOpen: (open: boolean) => void;
    copilotState?: CopilotWindowState;
    setCopilotState?: (state: CopilotWindowState) => void;
}

/**
 * Navbar Neo-Bento melayang: sapaan personal, pencarian pil, dan klaster aksi
 * (Copilot, notifikasi, fullscreen, tema, profil). Sticky dengan efek kaca.
 */
export default function Navbar({
    header,
    sidebarOpen,
    setSidebarOpen,
    copilotState = 'closed',
    setCopilotState,
}: NavbarProps) {
    const user = usePage().props.auth.user;
    const isKepalaSekolah = Boolean(user?.is_kepala_sekolah || user?.role === 'kepala_sekolah');
    const roleLabel = user?.role_name || (isKepalaSekolah ? 'Kepala Sekolah' : 'Bendahara Sekolah');
    const fullName = user?.name || roleLabel;
    const copilotActive = copilotState !== 'closed';
    const [searchOpen, setSearchOpen] = useState(false);
    const [shortcutHint, setShortcutHint] = useState('Ctrl K');

    useEffect(() => {
        if (typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/i.test(navigator.platform || navigator.userAgent)) {
            setShortcutHint('⌘K');
        }
    }, []);

    useEffect(() => {
        const handleGlobalSearchShortcut = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                setSearchOpen((prev) => !prev);
            }
        };

        window.addEventListener('keydown', handleGlobalSearchShortcut);
        return () => window.removeEventListener('keydown', handleGlobalSearchShortcut);
    }, []);

    return (
        <>
            <div className="sticky top-2 z-30 px-3 pt-2 sm:top-3 sm:px-4 sm:pt-3 lg:px-5">
                <header className="sikas-glass relative z-20 flex items-center gap-2 sm:gap-3 rounded-[20px] sm:rounded-[22px] border border-white/70 px-3 py-2 shadow-nav ring-1 ring-slate-900/[0.03] dark:border-white/10 dark:ring-white/5">
                    {/* Toggle sidebar (mobile) */}
                    <button
                        type="button"
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-100 bg-white text-slate-500 shadow-sm transition hover:text-slate-900 lg:hidden dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:text-white"
                        aria-label="Buka menu navigasi"
                    >
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                            <path d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </button>

                    {/* Sapaan */}
                    <div className="min-w-0 flex-1 md:flex-initial">
                        <p className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-400 dark:text-slate-500">
                            <span className="h-1.5 w-1.5 rounded-full bg-mint animate-pulse-soft" />
                            Selamat datang,
                        </p>
                        <p className="truncate text-[13.5px] sm:text-[15px] font-extrabold tracking-tight text-slate-900 dark:text-white">
                            {fullName} 👋
                        </p>
                    </div>

                    {/* Pencarian pil */}
                    <div className="ml-auto hidden md:block md:w-[210px] lg:w-[250px] xl:w-[300px]">
                        <button
                            type="button"
                            onClick={() => setSearchOpen(true)}
                            className="group flex w-full items-center gap-2 rounded-full border border-slate-100 bg-white/80 px-3 py-1.5 text-left shadow-sm transition hover:border-lime-300/80 hover:bg-white focus:outline-none focus-visible:ring-4 focus-visible:ring-lime-200/60 dark:border-white/10 dark:bg-white/5 dark:hover:border-lime-400/30 dark:hover:bg-white/10"
                            aria-label="Cari fitur newSIKAS"
                        >
                            <Search className="h-3.5 w-3.5 shrink-0 text-slate-400 transition group-hover:text-brand-500 dark:text-slate-500 dark:group-hover:text-lime-300" />
                            <span className="flex-1 truncate text-[11px] font-medium text-slate-400 group-hover:text-slate-600 dark:text-slate-500 dark:group-hover:text-slate-300">
                                Cari fitur, RKAS, BKU, Kwitansi…
                            </span>
                            <kbd className="hidden lg:inline-block rounded-md border border-slate-100 bg-slate-50 px-1.5 py-0.5 text-[9px] font-bold text-slate-400 dark:border-white/10 dark:bg-white/5 dark:text-slate-500">
                                {shortcutHint}
                            </kbd>
                        </button>
                    </div>

                {/* Aksi */}
                <div className="flex items-center gap-1.5 sm:gap-2">
                    <button
                        type="button"
                        onClick={() => setSearchOpen(true)}
                        className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-100 bg-white text-slate-500 shadow-sm transition hover:-translate-y-0.5 hover:text-slate-900 focus:outline-none focus-visible:ring-4 focus-visible:ring-lime-200/60 md:hidden dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:text-white"
                        title="Cari fitur newSIKAS"
                        aria-label="Cari fitur newSIKAS"
                    >
                        <Search className="h-4 w-4" />
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            if (!setCopilotState) return;
                            if (copilotState === 'closed' || copilotState === 'minimized') {
                                setCopilotState('normal');
                            } else {
                                setCopilotState('closed');
                            }
                        }}
                        className={`relative flex h-9 w-9 items-center justify-center rounded-xl transition-all duration-300 focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-200/60 ${
                            copilotActive
                                ? 'bg-gradient-to-br from-brand-500 to-brand-600 text-white shadow-lg shadow-brand-500/30 ring-2 ring-brand-400/40'
                                : 'border border-slate-100 bg-white text-slate-500 shadow-sm hover:-translate-y-0.5 hover:text-slate-900 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:text-white'
                        }`}
                        title={copilotActive ? 'Tutup SIKAS AI Copilot' : 'Buka SIKAS AI Copilot'}
                        aria-label={copilotActive ? 'Tutup SIKAS AI Copilot' : 'Buka SIKAS AI Copilot'}
                    >
                        <MessageSquare className="h-4 w-4" />
                        {copilotActive ? (
                            <span className="absolute -right-0.5 -top-0.5 flex h-2.5 w-2.5">
                                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-lime-300 opacity-75" />
                                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-lime-300" />
                            </span>
                        ) : (
                            <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-lime-400" />
                        )}
                    </button>

                    <NotificationDropdown />
                    <FullscreenSwitcher />
                    <DarkModeSwitcher />

                    <div className="mx-1 hidden h-7 w-px bg-slate-100 sm:block dark:bg-white/10" />

                    <Dropdown>
                        <Dropdown.Trigger>
                            <span className="inline-flex rounded-2xl">
                                <button
                                    type="button"
                                    className="flex items-center gap-2.5 rounded-xl p-0.5 pr-1 text-sm font-medium transition duration-150 ease-in-out focus:outline-none focus-visible:ring-4 focus-visible:ring-lime-200/60 sm:pr-2"
                                >
                                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-brand-400 via-brand-500 to-peach text-[12px] font-extrabold text-white ring-2 ring-lime-300 ring-offset-2 ring-offset-white/70 dark:ring-offset-[#0D0F17]">
                                        {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                                    </span>
                                    <span className="hidden text-left lg:block">
                                        <span className="block text-[11px] font-extrabold leading-tight text-slate-900 dark:text-white">
                                            {user.name}
                                        </span>
                                        <span className="block text-[9.5px] font-semibold text-slate-400 dark:text-slate-500">
                                            {roleLabel}
                                        </span>
                                    </span>
                                    <svg className="hidden h-3 w-3 text-slate-400 lg:block dark:text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
                                        <path d="m6 9 6 6 6-6" />
                                    </svg>
                                </button>
                            </span>
                        </Dropdown.Trigger>

                        <Dropdown.Content>
                            <div className="border-b border-slate-100 px-3.5 py-2.5 dark:border-white/5">
                                <p className="truncate text-[11.5px] font-extrabold text-slate-900 dark:text-white">
                                    {user.name}
                                </p>
                                <div className="mt-1">
                                    <StatusBadge tone={isKepalaSekolah ? 'violet' : 'success'} dot>
                                        {roleLabel}
                                    </StatusBadge>
                                </div>
                            </div>
                            <Dropdown.Link href={route('profile.edit')}>
                                Profil Saya
                            </Dropdown.Link>
                            <Dropdown.Link href={route('logout')} method="post" as="button">
                                Keluar Sistem
                            </Dropdown.Link>
                        </Dropdown.Content>
                    </Dropdown>
                </div>
            </header>
            </div>

            {/* Header tambahan dari halaman (opsional, tidak ikut sticky agar ruang layar laptop tetap lega) */}
            {header && (
                <div className="px-3 pt-5 sm:px-4 sm:pt-6 lg:px-5">
                    <div className="relative z-10 rounded-[20px] sm:rounded-[22px] border border-white/70 bg-white/70 px-3.5 py-3 shadow-nav backdrop-blur-xl sm:px-5 sm:py-3.5 dark:border-white/10 dark:bg-[#0D0F17]/70 [&>*]:!mt-0">
                        {header}
                    </div>
                </div>
            )}
            <FeatureSearchModal
                open={searchOpen}
                onClose={() => setSearchOpen(false)}
                setCopilotState={setCopilotState}
            />
        </>
    );
}
