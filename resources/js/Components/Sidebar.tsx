import { Link, usePage } from '@inertiajs/react';
import { ReactNode, useState } from 'react';

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
        className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors duration-200 ${active
            ? 'bg-indigo-600 text-white shadow-md'
            : 'text-gray-400 hover:text-white hover:bg-gray-800'
            } ${!isSidebarOpen ? 'justify-center' : ''}`}
        title={!isSidebarOpen ? (children as string) : undefined}
    >
        <div className="shrink-0">{icon}</div>
        <span className={`font-medium transition-opacity duration-300 ${!isSidebarOpen ? 'hidden opacity-0 w-0' : 'block opacity-100'}`}>
            {children}
        </span>
    </Link>
);

export default function Sidebar({ className = '', isOpen, setIsOpen }: { className?: string; isOpen?: boolean; setIsOpen?: (open: boolean) => void }) {
    const { url } = usePage();
    const [isDataMasterOpen, setIsDataMasterOpen] = useState(true);
    const [isFiturPelengkapOpen, setIsFiturPelengkapOpen] = useState(true);

    return (
        <>
            {/* Mobile Overlay */}
            <div
                className={`fixed inset-0 z-20 bg-gray-900/50 transition-opacity lg:hidden ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
                    }`}
                onClick={() => setIsOpen?.(false)}
            />

            {/* Floating Toggle Button - Fixed Position */}
            <button
                onClick={() => setIsOpen?.(!isOpen)}
                className={`fixed top-9 z-40 flex h-7 w-7 items-center justify-center rounded-full border border-gray-700 bg-gray-800 text-white shadow-md hover:bg-gray-700 focus:outline-none transition-all duration-300
                    ${isOpen
                        ? 'left-[15rem]'
                        : 'left-4 lg:left-[4.5rem]'
                    }`}
                aria-label="Toggle Sidebar"
            >
                <svg
                    className={`w-4 h-4 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
            </button>

            <aside
                className={`flex flex-col h-screen bg-gray-900 text-white fixed left-0 top-0 transition-transform duration-300 z-30 
                ${isOpen ? 'translate-x-0 w-64' : '-translate-x-full lg:translate-x-0 lg:w-20'} 
                ${className}`}
            >

                {/* Internal Scrollable Container */}
                <div className="flex flex-col h-full overflow-y-auto overflow-x-hidden">
                    {/* Branding */}
                    <div className={`flex items-center gap-3 px-6 py-5 border-b border-gray-800 h-20 shrink-0 ${!isOpen ? 'justify-center px-2' : ''}`}>
                        <div className="p-1.5 bg-indigo-600 rounded-lg shrink-0">
                            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                            </svg>
                        </div>
                        <span className={`text-xl font-bold tracking-tight whitespace-nowrap transition-opacity duration-300 ${!isOpen ? 'hidden opacity-0 w-0' : 'block opacity-100'}`}>
                            SIKAS
                        </span>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 px-3 py-6 space-y-2">
                        <div className={`text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 mb-2 whitespace-nowrap overflow-hidden transition-all duration-300 ${!isOpen ? 'opacity-0 h-0 hidden' : 'opacity-100'}`}>
                            Menu Utama
                        </div>

                        <NavLink
                            href={route('dashboard')}
                            active={route().current('dashboard')}
                            isSidebarOpen={isOpen}
                            icon={
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                                </svg>
                            }
                        >
                            Dashboard
                        </NavLink>

                        <NavLink
                            href={route('penganggaran.index')}
                            active={route().current('penganggaran.*')}
                            isSidebarOpen={isOpen}
                            icon={
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                            }
                        >
                            Penganggaran
                        </NavLink>

                        <NavLink
                            href={route('penatausahaan.index')}
                            active={route().current('penatausahaan.*') && !route().current('sts.*')}
                            isSidebarOpen={isOpen}
                            icon={
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                                </svg>
                            }
                        >
                            Penatausahaan
                        </NavLink>

                        <NavLink
                            href={route('sts.index')}
                            active={route().current('sts.*')}
                            isSidebarOpen={isOpen}
                            icon={
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                            }
                        >
                            Status STS
                        </NavLink>

                        {/* Data Master Group */}
                        <div className="pt-4">
                            {isOpen ? (
                                <button
                                    onClick={() => setIsDataMasterOpen(!isDataMasterOpen)}
                                    className="flex items-center justify-between w-full px-4 py-2 text-gray-400 hover:text-white transition-colors"
                                >
                                    <span className="text-xs font-semibold uppercase tracking-wider">Data Master</span>
                                    <svg className={`w-3 h-3 transition-transform ${isDataMasterOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>
                            ) : (
                                <div className="flex justify-center py-2 border-t border-gray-800 mt-2 pt-4">
                                    {/* Divider or mini header for group in forced mini mode */}
                                    <div className="w-8 h-px bg-gray-700"></div>
                                </div>
                            )}

                            {(isDataMasterOpen || !isOpen) && (
                                <div className="mt-1 space-y-1">
                                    <NavLink
                                        href={route('sekolah-profile.index')}
                                        active={route().current('sekolah-profile.*')}
                                        isSidebarOpen={isOpen}
                                        icon={
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                            </svg>
                                        }
                                    >
                                        Profil Sekolah
                                    </NavLink>

                                    <NavLink
                                        href={route('kode-kegiatan.index')}
                                        active={route().current('kode-kegiatan.*')}
                                        isSidebarOpen={isOpen}
                                        icon={
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                                            </svg>
                                        }
                                    >
                                        Kode Kegiatan
                                    </NavLink>

                                    <NavLink
                                        href={route('rekening-belanja.index')}
                                        active={route().current('rekening-belanja.*')}
                                        isSidebarOpen={isOpen}
                                        icon={
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        }
                                    >
                                        Rekening Belanja
                                    </NavLink>
                                </div>
                            )}
                        </div>

                        {/* Fitur Pelengkap Group */}
                        <div className="pt-2">
                            {isOpen ? (
                                <button
                                    onClick={() => setIsFiturPelengkapOpen(!isFiturPelengkapOpen)}
                                    className="flex items-center justify-between w-full px-4 py-2 text-gray-400 hover:text-white transition-colors"
                                >
                                    <span className="text-xs font-semibold uppercase tracking-wider">Fitur Pelengkap</span>
                                    <svg className={`w-3 h-3 transition-transform ${isFiturPelengkapOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>
                            ) : (
                                <div className="flex justify-center py-2 border-t border-gray-800 mt-2 pt-4">
                                    <div className="w-8 h-px bg-gray-700"></div>
                                </div>
                            )}

                            {(isFiturPelengkapOpen || !isOpen) && (
                                <div className="mt-1 space-y-1">
                                    <NavLink
                                        href={route('kwitansi.index')}
                                        active={route().current('kwitansi.*')}
                                        isSidebarOpen={isOpen}
                                        icon={
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                            </svg>
                                        }
                                    >
                                        Kwitansi
                                    </NavLink>

                                    <NavLink
                                        href={route('tanda-terima.index')}
                                        active={route().current('tanda-terima.*')}
                                        isSidebarOpen={isOpen}
                                        icon={
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                                            </svg>
                                        }
                                    >
                                        Tanda Terima
                                    </NavLink>
                                    <NavLink
                                        href={route('dokumen.index')}
                                        active={route().current('dokumen.*')}
                                        isSidebarOpen={isOpen}
                                        icon={
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                            </svg>
                                        }
                                    >
                                        Dokumen
                                    </NavLink>
                                    <NavLink
                                        href={route('laporan.index')}
                                        active={route().current('laporan.*')}
                                        isSidebarOpen={isOpen}
                                        icon={
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                            </svg>
                                        }
                                    >
                                        Laporan
                                    </NavLink>
                                </div>
                            )}
                        </div>


                        {/* Backup Menu */}
                        <div className="pt-2">
                            <NavLink
                                href={route('backup.index')}
                                active={route().current('backup.*')}
                                isSidebarOpen={isOpen}
                                icon={
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                                    </svg>
                                }
                            >
                                Backup Database
                            </NavLink>
                        </div>
                    </nav>

                    {/* Footer / Logout */}
                    <div className={`p-4 border-t border-gray-800 ${!isOpen ? 'flex justify-center' : ''}`}>
                        <Link href={route('logout')} method="post" as="button" className={`flex items-center gap-3 w-full px-4 py-2 text-gray-400 hover:text-white hover:bg-red-600/20 rounded-lg transition-colors ${!isOpen ? 'justify-center px-0' : ''}`} title="Keluar">
                            <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                            <span className={`font-medium transition-opacity duration-300 ${!isOpen ? 'hidden opacity-0 w-0' : 'block opacity-100'}`}>Keluar</span>
                        </Link>
                    </div>
                </div>
            </aside>
        </>
    );
}
