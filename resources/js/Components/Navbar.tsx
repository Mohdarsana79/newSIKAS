import Dropdown from '@/Components/Dropdown';
import DarkModeSwitcher from '@/Components/DarkModeSwitcher';
import FullscreenSwitcher from '@/Components/FullscreenSwitcher';
import NotificationDropdown from '@/Components/NotificationDropdown';
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
 * Navbar Neo-Bento bergaya Eduplex:
 * Sapaan personal "Selamat Datang, [Nama] 👋", bar pencarian pil kapsul,
 * trigger Copilot, dan user avatar modern dengan efek transisi halus.
 */
export default function Navbar({ 
    header, 
    sidebarOpen, 
    setSidebarOpen,
    copilotState = 'closed',
    setCopilotState
}: NavbarProps) {
    const user = usePage().props.auth.user;
    const firstName = user?.name ? user.name.split(' ')[0] : 'Bendahara';

    return (
        <header className="sticky top-0 z-20 flex w-full flex-col border-b border-slate-200/70 bg-white/80 backdrop-blur-xl transition-all duration-300 dark:border-white/5 dark:bg-[#0D0F17]/80">
            <div className="flex flex-grow items-center justify-between px-4 py-3 md:px-8">

                {/* Left Side: Mobile Toggle & Warm Personal Greeting */}
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 hover:border-brand-500/40 hover:text-brand-600 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-slate-400 dark:hover:text-white lg:hidden"
                        aria-label="Toggle Sidebar"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </button>
                    
                    <div className="flex flex-col">
                        <h1 className="font-display text-lg font-bold tracking-tight text-slate-900 dark:text-white sm:text-xl">
                            Selamat Datang, {firstName} 👋
                        </h1>
                        <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">
                            Sistem Pengelolaan Keuangan & Anggaran Sekolah (SIKAS)
                        </p>
                    </div>
                </div>

                {/* Center / Right: Pill Search Bar */}
                <div className="hidden lg:flex items-center flex-1 max-w-xs mx-8">
                    <div className="relative w-full">
                        <span className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none text-slate-400">
                            <Search className="w-4 h-4" />
                        </span>
                        <input
                            type="text"
                            placeholder="Cari modul atau data..."
                            readOnly
                            onClick={() => {
                                if (setCopilotState) setCopilotState('normal');
                            }}
                            className="w-full pl-10 pr-12 py-2 text-xs rounded-full border border-slate-200/80 bg-slate-50/70 hover:bg-slate-100/80 focus:bg-white text-slate-700 placeholder:text-slate-400 cursor-pointer transition-all dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
                        />
                        <span className="absolute inset-y-0 right-2.5 flex items-center pointer-events-none">
                            <kbd className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold text-slate-400 border border-slate-200 dark:border-white/10 bg-white dark:bg-white/10">
                                ⌘K
                            </kbd>
                        </span>
                    </div>
                </div>

                {/* Right Side Actions */}
                <div className="flex items-center gap-2.5 sm:gap-3">
                    {/* SIKAS AI Copilot Trigger */}
                    <button
                        type="button"
                        onClick={() => {
                            if (setCopilotState) {
                                if (copilotState === 'closed' || copilotState === 'minimized') {
                                    setCopilotState('normal');
                                } else {
                                    setCopilotState('closed');
                                }
                            }
                        }}
                        className={`relative flex h-10 w-10 items-center justify-center rounded-2xl transition-all duration-300 focus:outline-none ${
                            copilotState !== 'closed'
                                ? 'bg-gradient-to-r from-brand-500 to-brand-600 text-white shadow-glow-violet ring-2 ring-brand-400/50 scale-105'
                                : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-brand-50 dark:hover:bg-white/10'
                        }`}
                        title={copilotState !== 'closed' ? 'Tutup SIKAS AI Copilot' : 'Buka SIKAS AI Copilot'}
                    >
                        <MessageSquare className={`w-4 h-4 ${copilotState !== 'closed' ? 'text-white' : 'text-slate-600 dark:text-slate-300'}`} />
                        {copilotState !== 'closed' ? (
                            <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                            </span>
                        ) : (
                            <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-brand-500"></span>
                        )}
                    </button>

                    {/* Notifications */}
                    <NotificationDropdown />

                    {/* Fullscreen Toggler */}
                    <FullscreenSwitcher />

                    {/* Dark Mode Toggler */}
                    <DarkModeSwitcher />

                    {/* User Profile Dropdown */}
                    <Dropdown>
                        <Dropdown.Trigger>
                            <span className="inline-flex rounded-2xl">
                                <button
                                    type="button"
                                    className="flex items-center gap-3 text-sm font-medium transition duration-150 ease-in-out focus:outline-none pl-1"
                                >
                                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 via-brand-600 to-gold-500 font-display font-bold text-white shadow-glow-violet ring-2 ring-white/20">
                                        {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                                    </div>

                                    <div className="hidden text-left xl:block">
                                        <span className="block text-xs font-bold text-slate-900 dark:text-white leading-tight">
                                            {user.name}
                                        </span>
                                        <span className="block text-[10px] text-slate-500 dark:text-slate-400">
                                            Bendahara Sekolah
                                        </span>
                                    </div>
                                </button>
                            </span>
                        </Dropdown.Trigger>

                        <Dropdown.Content>
                            <Dropdown.Link href={route('profile.edit')}>
                                Profil Saya
                            </Dropdown.Link>
                            <Dropdown.Link href={route('logout')} method="post" as="button">
                                Keluar Sistem
                            </Dropdown.Link>
                        </Dropdown.Content>
                    </Dropdown>
                </div>
            </div>

            {/* Page Header (if provided by specific page) */}
            {header && (
                <div className="px-4 py-3 border-t border-slate-100 dark:border-white/5 bg-slate-50/60 dark:bg-white/[0.02] md:px-8">
                    {header}
                </div>
            )}
        </header>
    );
}
