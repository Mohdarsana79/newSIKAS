import Dropdown from '@/Components/Dropdown';
import DarkModeSwitcher from '@/Components/DarkModeSwitcher';
import FullscreenSwitcher from '@/Components/FullscreenSwitcher';
import NotificationDropdown from '@/Components/NotificationDropdown';
import StatusBadge from '@/Components/ui/StatusBadge';
import { usePage } from '@inertiajs/react';
import { MessageSquare, Search } from 'lucide-react';
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
    const roleLabel = isKepalaSekolah ? 'Kepala Sekolah' : 'Bendahara Sekolah';
    const fullName = user?.name || roleLabel;
    const copilotActive = copilotState !== 'closed';

    return (
        <div className="sticky top-3 z-30 px-3 pt-3 lg:pr-4">
            <header className="sikas-glass relative z-20 flex items-center gap-3 rounded-[22px] border border-white/70 px-3 py-2.5 shadow-nav ring-1 ring-slate-900/[0.03] dark:border-white/10 dark:ring-white/5">
                {/* Toggle sidebar (mobile) */}
                <button
                    type="button"
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                    className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-100 bg-white text-slate-500 shadow-sm transition hover:text-slate-900 lg:hidden dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:text-white"
                    aria-label="Buka menu navigasi"
                >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                        <path d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                </button>

                {/* Sapaan */}
                <div className="min-w-0">
                    <p className="flex items-center gap-1.5 text-[10.5px] font-semibold text-slate-400 dark:text-slate-500">
                        <span className="h-1.5 w-1.5 rounded-full bg-mint animate-pulse-soft" />
                        Selamat datang,
                    </p>
                    <p className="truncate text-[15px] font-extrabold tracking-tight text-slate-900 dark:text-white">
                        {fullName} 👋
                    </p>
                </div>

                {/* Pencarian pil */}
                <div className="ml-auto hidden w-[290px] md:block">
                    <button
                        type="button"
                        onClick={() => {
                            if (setCopilotState) setCopilotState('normal');
                        }}
                        className="group flex w-full items-center gap-2 rounded-full border border-slate-100 bg-white/80 px-3.5 py-2 text-left shadow-sm transition focus:outline-none focus-visible:ring-4 focus-visible:ring-lime-200/60 dark:border-white/10 dark:bg-white/5"
                        aria-label="Cari modul atau data"
                    >
                        <Search className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                        <span className="flex-1 text-[11.5px] font-medium text-slate-400 dark:text-slate-500">
                            Cari modul, RKAS, atau BKU…
                        </span>
                        <kbd className="rounded-md border border-slate-100 bg-slate-50 px-1.5 py-0.5 text-[9px] font-bold text-slate-400 dark:border-white/10 dark:bg-white/5 dark:text-slate-500">
                            ⌘K
                        </kbd>
                    </button>
                </div>

                {/* Aksi */}
                <div className="ml-auto flex items-center gap-2 md:ml-0">
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
                                    <span className="hidden text-left xl:block">
                                        <span className="block text-[11px] font-extrabold leading-tight text-slate-900 dark:text-white">
                                            {user.name}
                                        </span>
                                        <span className="block text-[9.5px] font-semibold text-slate-400 dark:text-slate-500">
                                            {roleLabel}
                                        </span>
                                    </span>
                                    <svg className="hidden h-3 w-3 text-slate-400 xl:block dark:text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
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

            {/* Header tambahan dari halaman (opsional) */}
            {header && (
                <div className="relative z-10 mt-3 rounded-[22px] border border-white/70 bg-white/70 px-4 py-3.5 shadow-nav backdrop-blur-xl sm:px-5 sm:py-4 dark:border-white/10 dark:bg-[#0D0F17]/70">
                    {header}
                </div>
            )}
        </div>
    );
}
