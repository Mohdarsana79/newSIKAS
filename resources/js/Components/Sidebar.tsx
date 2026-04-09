import { Link, usePage } from '@inertiajs/react';
import { ReactNode, useState, useEffect } from 'react';

interface NavLinkProps {
    href: string;
    active: boolean;
    children: ReactNode;
    icon?: ReactNode;
    isSidebarOpen?: boolean;
}

const NavLink = ({ href, active, children, icon, isSidebarOpen = true }: NavLinkProps) => (
    <Link
        href={href}
        className={`relative flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group overflow-hidden ${active
            ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-lg shadow-indigo-500/20'
            : 'text-slate-400 hover:text-white hover:bg-white/5'
            } ${!isSidebarOpen ? 'justify-center px-0 mx-auto w-12' : ''}`}
        title={!isSidebarOpen ? (children as string) : undefined}
    >
        <div className={`shrink-0 z-10 transition-transform duration-300 ${active ? 'scale-110' : 'group-hover:scale-110'}`}>
            {icon}
        </div>
        <span className={`z-10 font-medium whitespace-nowrap transition-all duration-300 origin-left ${!isSidebarOpen ? 'opacity-0 w-0 scale-0' : 'opacity-100 w-auto scale-100'}`}>
            {children}
        </span>
        {active && (
            <div className="absolute inset-0 bg-white/5 rounded-xl pointer-events-none"></div>
        )}
    </Link>
);

export default function Sidebar({ className = '', isOpen = true, setIsOpen }: { className?: string; isOpen?: boolean; setIsOpen?: (open: boolean) => void }) {
    const { url } = usePage();
    const [isDataMasterOpen, setIsDataMasterOpen] = useState(true);
    const [isFiturPelengkapOpen, setIsFiturPelengkapOpen] = useState(true);

    // Auto-close submenus when sidebar is closed (mini mode)
    useEffect(() => {
        if (!isOpen) {
            // Optional: close submenus if you want them closed when re-opening
            // setIsDataMasterOpen(false);
            // setIsFiturPelengkapOpen(false);
        }
    }, [isOpen]);

    return (
        <>
            {/* Mobile Overlay - Premium Blur */}
            <div
                className={`fixed inset-0 z-[45] bg-slate-900/40 backdrop-blur-sm transition-opacity duration-300 md:hidden ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
                    }`}
                onClick={() => setIsOpen?.(false)}
            />

            {/* Main Sidebar Component */}
            <aside
                className={`flex flex-col h-screen bg-[#020617] text-white fixed left-0 top-0 transition-all duration-300 ease-in-out z-50 border-r border-slate-800 shadow-2xl
                ${isOpen ? 'translate-x-0 w-64' : '-translate-x-full md:translate-x-0 md:w-20'} 
                ${className}`}
            >
                {/* Visual Accent - Top Glow */}
                <div className="absolute top-0 left-0 w-full h-40 bg-gradient-to-b from-indigo-500/10 to-transparent pointer-events-none"></div>

                {/* Branding Section */}
                <div className={`relative z-10 flex items-center justify-between px-6 h-24 shrink-0 border-b border-slate-800/50 ${!isOpen ? 'px-0 justify-center' : ''}`}>
                    <div className="flex items-center gap-3">
                        <div className="relative flex-shrink-0 group">
                            <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
                            <div className="relative p-2.5 bg-slate-900 border border-slate-700/50 rounded-xl">
                                <svg className="w-6 h-6 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                </svg>
                            </div>
                        </div>
                        <div className={`flex flex-col transition-all duration-300 ${!isOpen ? 'hidden scale-0 opacity-0' : 'block scale-100 opacity-100'}`}>
                            <span className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-br from-white to-slate-400">SIKAS</span>
                            <span className="text-[9px] font-bold text-indigo-500 uppercase tracking-[0.2em] leading-none">Management</span>
                        </div>
                    </div>

                    {/* Integrated Toggle Button (Visible in Sidebar when open or on desktop) */}
                    <button
                        onClick={() => setIsOpen?.(!isOpen)}
                        className={`p-1.5 rounded-lg border border-slate-700 bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-all focus:outline-none md:flex hidden ${!isOpen ? 'absolute -right-4 top-9 translate-x-0' : ''}`}
                    >
                        <svg className={`w-4 h-4 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    
                    {/* Mobile Toggle Button (Only when open) */}
                    <button
                        onClick={() => setIsOpen?.(false)}
                        className="p-2 md:hidden text-slate-400 hover:text-white transition-colors"
                    >
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Navigation Menu */}
                <div className="flex-1 overflow-y-auto overflow-x-hidden relative z-10 py-6 custom-scrollbar">
                    <nav className="px-4 space-y-1">
                        <SectionTitle isVisible={isOpen}>Menu Utama</SectionTitle>

                        <NavLink href={route('dashboard')} active={route().current('dashboard')} isSidebarOpen={isOpen} icon={<IconDashboard />}>
                            Dashboard
                        </NavLink>

                        <NavLink href={route('penganggaran.index')} active={route().current('penganggaran.*')} isSidebarOpen={isOpen} icon={<IconPenganggaran />}>
                            Penganggaran
                        </NavLink>

                        <NavLink href={route('penatausahaan.index')} active={route().current('penatausahaan.*') && !route().current('sts.*')} isSidebarOpen={isOpen} icon={<IconPenatausahaan />}>
                            Penatausahaan
                        </NavLink>

                        <NavLink href={route('sts.index')} active={route().current('sts.*')} isSidebarOpen={isOpen} icon={<IconSTS />}>
                            Status STS
                        </NavLink>

                        {/* Data Master Group */}
                        <div className="pt-6">
                            <GroupHeader
                                label="Data Master"
                                isOpen={isDataMasterOpen}
                                isSidebarOpen={isOpen}
                                onClick={() => setIsDataMasterOpen(!isDataMasterOpen)}
                            />

                            <div className={`space-y-1 overflow-hidden transition-all duration-300 ${isDataMasterOpen || !isOpen ? 'max-h-[500px] opacity-100 mt-1' : 'max-h-0 opacity-0'}`}>
                                <NavLink href={route('sekolah-profile.index')} active={route().current('sekolah-profile.*')} isSidebarOpen={isOpen} icon={<IconSchool />}>
                                    Profil Sekolah
                                </NavLink>
                                <NavLink href={route('kode-kegiatan.index')} active={route().current('kode-kegiatan.*')} isSidebarOpen={isOpen} icon={<IconKegiatan />}>
                                    Kode Kegiatan
                                </NavLink>
                                <NavLink href={route('rekening-belanja.index')} active={route().current('rekening-belanja.*')} isSidebarOpen={isOpen} icon={<IconRekening />}>
                                    Rekening Belanja
                                </NavLink>
                            </div>
                        </div>

                        {/* Fitur Pelengkap Group */}
                        <div className="pt-4">
                            <GroupHeader
                                label="Fitur Pelengkap"
                                isOpen={isFiturPelengkapOpen}
                                isSidebarOpen={isOpen}
                                onClick={() => setIsFiturPelengkapOpen(!isFiturPelengkapOpen)}
                            />

                            <div className={`space-y-1 overflow-hidden transition-all duration-300 ${isFiturPelengkapOpen || !isOpen ? 'max-h-[500px] opacity-100 mt-1' : 'max-h-0 opacity-0'}`}>
                                <NavLink href={route('kwitansi.index')} active={route().current('kwitansi.*')} isSidebarOpen={isOpen} icon={<IconKwitansi />}>
                                    Kwitansi
                                </NavLink>
                                <NavLink href={route('tanda-terima.index')} active={route().current('tanda-terima.*')} isSidebarOpen={isOpen} icon={<IconTandaTerima />}>
                                    Tanda Terima
                                </NavLink>
                                <NavLink href={route('dokumen.index')} active={route().current('dokumen.*')} isSidebarOpen={isOpen} icon={<IconDokumen />}>
                                    Dokumen
                                </NavLink>
                                <NavLink href={route('laporan.index')} active={route().current('laporan.*')} isSidebarOpen={isOpen} icon={<IconLaporan />}>
                                    Laporan
                                </NavLink>
                            </div>
                        </div>

                        {/* Systems */}
                        <div className="pt-6">
                            <SectionTitle isVisible={isOpen}>Systems</SectionTitle>
                            <NavLink href={route('backup.index')} active={route().current('backup.*')} isSidebarOpen={isOpen} icon={<IconBackup />}>
                                Backup Database
                            </NavLink>
                        </div>
                    </nav>
                </div>

                {/* Sidebar Footer */}
                <div className="p-4 border-t border-slate-800/50 bg-[#020617]/80 backdrop-blur-md sticky bottom-0 z-20">
                    <Link
                        href={route('logout')}
                        method="post"
                        as="button"
                        className={`flex items-center gap-3 w-full px-4 py-3 text-slate-400 hover:text-rose-400 hover:bg-rose-500/5 rounded-xl transition-all duration-300 group ${!isOpen ? 'justify-center px-0' : ''}`}
                    >
                        <svg className="w-5 h-5 shrink-0 transition-transform group-hover:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        {isOpen && <span className="font-medium">Keluar Sistem</span>}
                    </Link>
                </div>
            </aside>
        </>
    );
}

// Sub-components for better readability
const SectionTitle = ({ children, isVisible }: { children: ReactNode; isVisible: boolean }) => (
    <div className={`px-4 mb-2 mt-4 transition-all duration-300 ${!isVisible ? 'opacity-0 h-0 hidden' : 'opacity-100'}`}>
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">{children}</span>
    </div>
);

const GroupHeader = ({ label, isOpen, isSidebarOpen, onClick }: { label: string; isOpen: boolean; isSidebarOpen: boolean; onClick: () => void }) => {
    if (!isSidebarOpen) return (
        <div className="flex justify-center py-3">
            <div className="w-8 h-px bg-slate-800"></div>
        </div>
    );

    return (
        <button
            onClick={onClick}
            className="group flex items-center justify-between w-full px-4 py-2 text-slate-500 hover:text-slate-300 transition-colors"
        >
            <span className="text-[10px] font-bold uppercase tracking-[0.2em]">{label}</span>
            <svg className={`w-3 h-3 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
        </button>
    );
};

// Simple Icons to keep the main code clean
const IconDashboard = () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
    </svg>
);

const IconPenganggaran = () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const IconPenatausahaan = () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
);

const IconSTS = () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
);

const IconSchool = () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
);

const IconKegiatan = () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
    </svg>
);

const IconRekening = () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m4 0h1m-7 4h12a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
);

const IconKwitansi = () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
);

const IconTandaTerima = () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
);

const IconDokumen = () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
    </svg>
);

const IconLaporan = () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
    </svg>
);

const IconBackup = () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
    </svg>
);
