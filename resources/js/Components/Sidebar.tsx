import { Link, usePage } from '@inertiajs/react';
import { ReactNode, useEffect, useState } from 'react';
import ArkasConfigModal from '@/Components/Arkas/ArkasConfigModal';
import { SharedArkasStatus } from '@/types';
import {
    canAccessFeatureModule,
    OPEN_ARKAS_PATH_MODAL_EVENT,
} from '@/Utils/featureSearchCatalog';

interface NavLinkProps {
    href: string;
    active: boolean;
    children: ReactNode;
    icon?: ReactNode;
    isSidebarOpen?: boolean;
    badge?: string;
}

const IconCetakSpj = () => (
    <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 9V2h12v7" />
        <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
        <rect x="6" y="14" width="12" height="8" rx="1" />
    </svg>
);

const NavLink = ({ href, active, children, icon, isSidebarOpen = true, badge }: NavLinkProps) => (
    <Link
        href={href}
        aria-current={active ? 'page' : undefined}
        className={`group relative flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-[12.5px] transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-lime-300/70 ${
            active
                ? 'nav-active font-bold'
                : 'font-semibold text-white/55 hover:bg-white/[0.06] hover:text-white'
        } ${!isSidebarOpen ? 'justify-center px-0 mx-auto h-10 w-10' : ''}`}
        title={!isSidebarOpen ? (typeof children === 'string' ? children : undefined) : undefined}
    >
        <span className={`shrink-0 transition-transform duration-300 ${active ? 'scale-105' : 'group-hover:scale-110'}`}>
            {icon}
        </span>
        <span
            className={`flex-1 whitespace-nowrap text-left transition-all duration-300 ${
                !isSidebarOpen ? 'pointer-events-none w-0 scale-0 opacity-0' : 'w-auto scale-100 opacity-100'
            }`}
        >
            {children}
        </span>
        {badge && isSidebarOpen && (
            <span
                className={`shrink-0 rounded-full px-1.5 py-0.5 text-[8.5px] font-extrabold uppercase tracking-wider ${
                    active ? 'bg-slate-950 text-lime-300' : 'bg-lime-400 text-slate-950 shadow-sm'
                }`}
            >
                {badge}
            </span>
        )}
        {badge && !isSidebarOpen && (
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-lime-400 ring-2 ring-[#1E1D2E]" />
        )}
        {active && isSidebarOpen && !badge && (
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-slate-900/60" />
        )}
    </Link>
);

/**
 * Sidebar Neo-Bento mengambang: kartu gelap dengan margin 12px dari tepi
 * browser, sudut 30px, navigasi pil lime, kartu ARKAS, dan mode rail mini.
 */
export default function Sidebar({
    className = '',
    isOpen = true,
    setIsOpen,
}: {
    className?: string;
    isOpen?: boolean;
    setIsOpen?: (open: boolean) => void;
}) {
    const { props } = usePage();
    const user = (props as any)?.auth?.user;
    const authPermissions = (props as any)?.auth?.permissions as
        | { modules?: Record<string, 'none' | 'read' | 'write'>; abilities?: Record<string, boolean> }
        | undefined;
    const isKepalaSekolah = user?.is_kepala_sekolah ?? false;
    const roleName = user?.role_name || (isKepalaSekolah ? 'Kepala Sekolah' : 'Bendahara / Admin');
    const canModule = (modKey: string, minLevel: 'read' | 'write' = 'read'): boolean =>
        canAccessFeatureModule(user, authPermissions, modKey, minLevel);
    const showDataMaster =
        canModule('sekolah_profile') ||
        canModule('kode_kegiatan') ||
        canModule('rekening_belanja') ||
        canModule('data_ptk');
    const showFiturPelengkap =
        canModule('kwitansi') ||
        canModule('tanda_terima') ||
        canModule('bast') ||
        canModule('surat_pesanan') ||
        canModule('dokumen') ||
        canModule('sk_surat') ||
        canModule('laporan') ||
        canModule('poster_transparansi') ||
        canModule('cetak_spj');
    const showIntegrasi = canModule('path_arkas', 'write');
    const showSistem =
        canModule('backup') ||
        canModule('network_settings') ||
        canModule('user_management') ||
        canModule('activity_logs') ||
        canModule('system_update');
    const showMainMenu =
        canModule('dashboard') ||
        canModule('penganggaran') ||
        canModule('penatausahaan') ||
        canModule('sts') ||
        canModule('arkas_tools') ||
        canModule('referensi_kode');
    const hasSystemUpdate = Boolean((props as any)?.systemUpdate?.hasUpdate);
    const sharedArkasStatus = (props as any)?.arkasStatus as SharedArkasStatus | undefined;
    const [arkasStatus, setArkasStatus] = useState<SharedArkasStatus>(
        sharedArkasStatus ?? {
            active_mode: 'local',
            source: 'none',
            exists: false,
        },
    );
    const [isDataMasterOpen, setIsDataMasterOpen] = useState(true);
    const [isFiturPelengkapOpen, setIsFiturPelengkapOpen] = useState(true);
    const [isIntegrasiOpen, setIsIntegrasiOpen] = useState(true);

    const [showPathModal, setShowPathModal] = useState(false);

    useEffect(() => {
        if (sharedArkasStatus) {
            setArkasStatus(sharedArkasStatus);
        }
    }, [sharedArkasStatus?.active_mode, sharedArkasStatus?.source, sharedArkasStatus?.exists]);

    const openPathModal = () => {
        setShowPathModal(true);
    };

    useEffect(() => {
        if (!showIntegrasi) return;

        const handleOpenFromSearch = () => {
            openPathModal();
        };

        window.addEventListener(OPEN_ARKAS_PATH_MODAL_EVENT, handleOpenFromSearch);
        return () => window.removeEventListener(OPEN_ARKAS_PATH_MODAL_EVENT, handleOpenFromSearch);
    }, [showIntegrasi]);

    return (
        <>
            {/* Overlay mobile */}
            <div
                className={`fixed inset-0 z-[45] bg-slate-950/40 backdrop-blur-sm transition-opacity duration-300 lg:hidden ${
                    isOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
                }`}
                onClick={() => setIsOpen?.(false)}
            />

            <aside
                className={`fixed inset-y-3 left-3 z-50 flex flex-col overflow-hidden rounded-[26px] lg:rounded-[30px] bg-gradient-to-b from-[#252438] via-[#1E1D2E] to-[#15141E] text-white shadow-float ring-1 ring-white/10 transition-all duration-300 ease-out ${
                    isOpen
                        ? 'w-[260px] translate-x-0'
                        : 'w-[260px] -translate-x-[110%] lg:w-[82px] lg:translate-x-0'
                } ${className}`}
            >
                {/* Dekorasi aurora */}
                <div className="pointer-events-none absolute -left-16 -top-24 h-64 w-64 rounded-full bg-brand-500/30 blur-2xl" />
                <div className="pointer-events-none absolute -bottom-24 -right-20 h-64 w-64 rounded-full bg-lime-400/15 blur-3xl" />

                {/* Brand */}
                <div className={`relative z-10 flex items-center pt-5 ${isOpen ? 'justify-between px-4 pb-2' : 'flex-col gap-3 px-3 pb-2'}`}>
                    <div className={`flex items-center ${isOpen ? 'gap-3' : 'justify-center'}`}>
                        <div
                            aria-hidden="true"
                            className="relative flex h-11 w-11 shrink-0 items-center justify-center"
                        >
                            <img
                                src="/images/landing/large.ico"
                                alt=""
                                className="h-full w-full object-contain drop-shadow-[0_4px_12px_rgba(197,232,78,0.28)] transition-transform duration-300 hover:scale-105"
                            />
                        </div>
                        {isOpen && (
                            <div className="flex flex-col">
                                <span className="text-[17px] font-extrabold leading-none tracking-tight text-white">SIKAS</span>
                                <span className="mt-1 text-[8.5px] font-bold uppercase leading-none tracking-[0.24em] text-lime-300">
                                    Keuangan Sekolah
                                </span>
                            </div>
                        )}
                    </div>

                    <button
                        type="button"
                        onClick={() => setIsOpen?.(!isOpen)}
                        className="hidden h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/50 transition hover:bg-white/10 hover:text-white lg:flex"
                        aria-label={isOpen ? 'Ciutkan sidebar' : 'Bentangkan sidebar'}
                    >
                        <svg className={`h-3.5 w-3.5 transition-transform duration-300 ${isOpen ? '' : 'rotate-180'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                            <path d="m15 18-6-6 6-6" />
                        </svg>
                    </button>

                    <button
                        type="button"
                        onClick={() => setIsOpen?.(false)}
                        className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/60 transition hover:bg-white/10 hover:text-white lg:hidden"
                        aria-label="Tutup menu navigasi"
                    >
                        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
                            <path d="M18 6 6 18M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Badge role aktif (non-bendahara atau kustom) */}
                {isOpen && (isKepalaSekolah || (user?.role && user.role !== 'bendahara')) && (
                    <div className="relative z-10 mx-3 mt-2 flex items-center gap-2 rounded-xl border border-mint/25 bg-mint/10 px-3 py-2">
                        <span className="h-2 w-2 shrink-0 rounded-full bg-mint animate-pulse-soft" />
                        <div className="flex flex-col">
                            <span className="text-[10.5px] font-bold leading-tight text-mint">{roleName}</span>
                            <span className="text-[8.5px] text-mint/70">
                                {isKepalaSekolah ? 'Hak akses: telaah & baca' : 'Akses sesuai pengaturan role'}
                            </span>
                        </div>
                    </div>
                )}

                {/* Navigasi */}
                <div className="sikas-scroll relative z-10 flex-1 overflow-y-auto overflow-x-hidden px-3 pb-2 pt-1">
                    <nav className="space-y-1">
                        {showMainMenu && <SectionTitle isVisible={isOpen}>Menu Utama</SectionTitle>}

                        {canModule('dashboard') && (
                            <NavLink href={route('dashboard')} active={route().current('dashboard')} isSidebarOpen={isOpen} icon={<IconDashboard />}>
                                Dashboard
                            </NavLink>
                        )}

                        {canModule('penganggaran') && (
                            <NavLink href={route('penganggaran.index')} active={route().current('penganggaran.*')} isSidebarOpen={isOpen} icon={<IconPenganggaran />}>
                                Penganggaran
                            </NavLink>
                        )}

                        {canModule('penatausahaan') && (
                            <NavLink href={route('penatausahaan.index')} active={route().current('penatausahaan.*') && !route().current('sts.*')} isSidebarOpen={isOpen} icon={<IconPenatausahaan />}>
                                Penatausahaan
                            </NavLink>
                        )}

                        {canModule('sts') && (
                            <NavLink href={route('sts.index')} active={route().current('sts.*')} isSidebarOpen={isOpen} icon={<IconSTS />}>
                                Status STS
                            </NavLink>
                        )}

                        {canModule('arkas_tools') && (
                            <NavLink href={route('arkas-tools.index')} active={route().current('arkas-tools.*')} isSidebarOpen={isOpen} icon={<IconArkas />}>
                                Arkas Tools
                            </NavLink>
                        )}

                        {canModule('referensi_kode') && (
                            <NavLink href={route('referensi-kode.index')} active={route().current('referensi-kode.*')} isSidebarOpen={isOpen} icon={<IconRefKode />}>
                                Referensi Kode
                            </NavLink>
                        )}

                        {/* Data Master */}
                        {showDataMaster && (
                            <div className="pt-4">
                                <GroupHeader
                                    label="Data Master"
                                    isOpen={isDataMasterOpen}
                                    isSidebarOpen={isOpen}
                                    onClick={() => setIsDataMasterOpen(!isDataMasterOpen)}
                                />
                                <div className={`space-y-1 overflow-hidden transition-all duration-300 ${isDataMasterOpen || !isOpen ? 'mt-1 max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
                                    {canModule('sekolah_profile') && (
                                        <NavLink href={route('sekolah-profile.index')} active={route().current('sekolah-profile.*')} isSidebarOpen={isOpen} icon={<IconSchool />}>
                                            Profil Sekolah
                                        </NavLink>
                                    )}
                                    {canModule('kode_kegiatan') && (
                                        <NavLink href={route('kode-kegiatan.index')} active={route().current('kode-kegiatan.*')} isSidebarOpen={isOpen} icon={<IconKegiatan />}>
                                            Kode Kegiatan
                                        </NavLink>
                                    )}
                                    {canModule('rekening_belanja') && (
                                        <NavLink href={route('rekening-belanja.index')} active={route().current('rekening-belanja.*')} isSidebarOpen={isOpen} icon={<IconRekening />}>
                                            Rekening Belanja
                                        </NavLink>
                                    )}
                                    {canModule('data_ptk') && (
                                        <NavLink href={route('data-ptk.index')} active={route().current('data-ptk.*')} isSidebarOpen={isOpen} icon={<IconUsersRole />}>
                                            Data PTK
                                        </NavLink>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Fitur Pelengkap */}
                        {showFiturPelengkap && (
                            <div className="pt-2">
                                <GroupHeader
                                    label="Fitur Pelengkap"
                                    isOpen={isFiturPelengkapOpen}
                                    isSidebarOpen={isOpen}
                                    onClick={() => setIsFiturPelengkapOpen(!isFiturPelengkapOpen)}
                                />
                                <div className={`space-y-1 overflow-hidden transition-all duration-300 ${isFiturPelengkapOpen || !isOpen ? 'mt-1 max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
                                    {canModule('kwitansi') && (
                                        <NavLink href={route('kwitansi.index')} active={route().current('kwitansi.*')} isSidebarOpen={isOpen} icon={<IconKwitansi />}>
                                            Kwitansi
                                        </NavLink>
                                    )}
                                    {canModule('tanda_terima') && (
                                        <NavLink href={route('tanda-terima.index')} active={route().current('tanda-terima.*')} isSidebarOpen={isOpen} icon={<IconTandaTerima />}>
                                            Tanda Terima
                                        </NavLink>
                                    )}
                                    {canModule('bast') && (
                                        <NavLink href={route('bast.index')} active={route().current('bast.*') || route().current('*-bast.*')} isSidebarOpen={isOpen} icon={<IconBast />}>
                                            BAST
                                        </NavLink>
                                    )}
                                    {canModule('surat_pesanan') && (
                                        <NavLink href={route('surat-pesanan.index')} active={route().current('surat-pesanan.*') || route().current('*-surat-pesanan.*')} isSidebarOpen={isOpen} icon={<IconSuratPesanan />}>
                                            Surat Pesanan
                                        </NavLink>
                                    )}
                                    {canModule('dokumen') && (
                                        <NavLink href={route('dokumen.index')} active={route().current('dokumen.*')} isSidebarOpen={isOpen} icon={<IconDokumen />}>
                                            Dokumen
                                        </NavLink>
                                    )}
                                    {canModule('sk_surat') && (
                                        <NavLink href={route('sk-surat.index')} active={route().current('sk-surat.*')} isSidebarOpen={isOpen} icon={<IconSkSurat />}>
                                            SK &amp; Surat
                                        </NavLink>
                                    )}
                                    {canModule('laporan') && (
                                        <NavLink href={route('laporan.index')} active={route().current('laporan.*')} isSidebarOpen={isOpen} icon={<IconLaporan />}>
                                            Laporan
                                        </NavLink>
                                    )}
                                    {canModule('poster_transparansi') && (
                                        <NavLink
                                            href={route('poster-transparansi.index')}
                                            active={route().current('poster-transparansi.*') || route().current('*-poster-transparansi.*')}
                                            isSidebarOpen={isOpen}
                                            icon={<IconPosterTransparansi />}
                                        >
                                            Poster Transparansi
                                        </NavLink>
                                    )}
                                    {canModule('cetak_spj') && (
                                        <NavLink
                                            href={route('cetak-spj.index')}
                                            active={route().current('cetak-spj.*') || route().current('*-cetak-spj.*')}
                                            isSidebarOpen={isOpen}
                                            icon={<IconCetakSpj />}
                                        >
                                            Cetak SPJ
                                        </NavLink>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Integrasi */}
                        {showIntegrasi && (
                            <div className="pt-2">
                                <GroupHeader
                                    label="Integrasi"
                                    isOpen={isIntegrasiOpen}
                                    isSidebarOpen={isOpen}
                                    onClick={() => setIsIntegrasiOpen(!isIntegrasiOpen)}
                                />
                                <div className={`space-y-1 overflow-hidden transition-all duration-300 ${isIntegrasiOpen || !isOpen ? 'mt-1 max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
                                    <button
                                        type="button"
                                        onClick={openPathModal}
                                        className={`group flex w-full items-center gap-3 rounded-2xl px-3.5 py-2.5 text-[12.5px] font-semibold text-white/55 transition-all duration-200 hover:bg-white/[0.06] hover:text-white ${!isOpen ? 'mx-auto h-10 w-10 justify-center px-0' : ''}`}
                                        title={!isOpen ? 'Path Arkas' : undefined}
                                    >
                                        <span className="shrink-0 transition-transform duration-300 group-hover:scale-110">
                                            <IconPath />
                                        </span>
                                        <span className={`flex-1 whitespace-nowrap text-left transition-all duration-300 ${!isOpen ? 'pointer-events-none w-0 scale-0 opacity-0' : 'w-auto scale-100 opacity-100'}`}>
                                            Path Arkas
                                        </span>
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Systems */}
                        {showSistem && (
                            <div className="pt-4">
                                <SectionTitle isVisible={isOpen}>Sistem</SectionTitle>
                                <div className="space-y-1">
                                    {canModule('backup') && (
                                        <NavLink href={route('backup.index')} active={route().current('backup.*')} isSidebarOpen={isOpen} icon={<IconBackup />}>
                                            Backup Database
                                        </NavLink>
                                    )}
                                    {canModule('network_settings') && (
                                        <NavLink href={route('network-settings.index')} active={route().current('network-settings.*')} isSidebarOpen={isOpen} icon={<IconNetwork />}>
                                            Pengaturan Jaringan
                                        </NavLink>
                                    )}
                                    {canModule('user_management') && (
                                        <NavLink href={route('management-role.index')} active={route().current('management-role.*')} isSidebarOpen={isOpen} icon={<IconUsersRole />}>
                                            Management &amp; Role
                                        </NavLink>
                                    )}
                                    {canModule('activity_logs') && (
                                        <NavLink href={route('activity-logs.index')} active={route().current('activity-logs.*')} isSidebarOpen={isOpen} icon={<IconActivityLog />}>
                                            Log Aktivitas
                                        </NavLink>
                                    )}
                                    {canModule('system_update') && (
                                        <NavLink
                                            href={route('system-update.index')}
                                            active={route().current('system-update.*')}
                                            isSidebarOpen={isOpen}
                                            icon={<IconUpdate />}
                                            badge={hasSystemUpdate ? 'BARU' : undefined}
                                        >
                                            Pembaharuan
                                        </NavLink>
                                    )}
                                </div>
                            </div>
                        )}
                    </nav>
                </div>

                {/* Kartu ARKAS */}
                <div className={`relative z-10 px-3 pb-1 pt-1 ${!isOpen ? 'flex justify-center' : ''}`}>
                    {isOpen ? (
                        <div className="relative mt-4">
                            <div className="relative rounded-[22px] bg-gradient-to-br from-lime-300 via-lime-400 to-lime-500 p-3.5 pt-4 text-slate-950 shadow-lime">
                                <div className="absolute -right-4 -top-6 h-20 w-20 rounded-full bg-white/25 blur-xl" />
                                <div className="relative flex items-center justify-between">
                                    <div>
                                        <p className="text-[12.5px] font-extrabold leading-tight">ARKAS Desktop</p>
                                        <p className="mt-0.5 text-[9.5px] font-semibold text-slate-950/65">
                                            {arkasStatus.active_mode === 'online' ? 'Mode Online / VPS' : 'Mode PC Lokal'}
                                        </p>
                                    </div>
                                    <span className="flex items-center gap-1 rounded-full bg-slate-950/10 px-1.5 py-0.5">
                                        <span
                                            className={`h-1.5 w-1.5 rounded-full ${
                                                arkasStatus.exists ? 'bg-slate-950 animate-pulse-soft' : 'bg-rose-700'
                                            }`}
                                        />
                                        <span className="text-[8px] font-extrabold">
                                            {arkasStatus.exists ? 'LIVE' : 'OFF'}
                                        </span>
                                    </span>
                                </div>
                                <div className="relative mt-2 flex items-center gap-1.5">
                                    <span className="h-1.5 w-1.5 rounded-full bg-slate-950/70" />
                                    <span className="text-[9.5px] font-bold">
                                        {arkasStatus.exists
                                            ? arkasStatus.active_mode === 'online'
                                                ? 'Terhubung · Unggahan Server'
                                                : 'Terhubung · arkas.db Lokal'
                                            : 'Belum terhubung · atur sumber'}
                                    </span>
                                </div>
                                <button
                                    type="button"
                                    onClick={openPathModal}
                                    className="relative mt-2.5 w-full rounded-xl bg-slate-950 px-3 py-2 text-[10.5px] font-bold text-lime-200 shadow-lg transition hover:-translate-y-0.5 hover:bg-slate-900"
                                >
                                    Kelola Koneksi
                                </button>
                            </div>
                            <button
                                type="button"
                                onClick={openPathModal}
                                aria-label="Kelola jalur database ARKAS"
                                className="absolute -top-3.5 left-1/2 flex h-8 w-8 -translate-x-1/2 items-center justify-center rounded-full border-[3px] border-[#1E1D2E] bg-white shadow-lg transition hover:scale-105"
                            >
                                <svg className="h-3.5 w-3.5 text-slate-950" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M7 17 17 7" />
                                    <path d="M8 7h9v9" />
                                </svg>
                            </button>
                        </div>
                    ) : (
                        <button
                            type="button"
                            onClick={openPathModal}
                            title="Kelola path database ARKAS"
                            className="flex h-10 w-10 items-center justify-center rounded-2xl bg-lime-400/90 text-slate-950 shadow-lime transition hover:bg-lime-300"
                        >
                            <IconPath />
                        </button>
                    )}
                </div>

                {/* Footer logout */}
                <div className="relative z-10 border-t border-white/5 px-3 py-2">
                    <Link
                        href={route('logout')}
                        method="post"
                        as="button"
                        className={`flex w-full items-center gap-3 rounded-2xl px-3.5 py-2 text-[12.5px] font-semibold text-white/45 transition-all duration-200 hover:bg-rose-500/10 hover:text-rose-300 ${!isOpen ? 'mx-auto h-10 w-10 justify-center px-0' : ''}`}
                    >
                        <svg className="h-[18px] w-[18px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                            <polyline points="16 17 21 12 16 7" />
                            <line x1="21" y1="12" x2="9" y2="12" />
                        </svg>
                        {isOpen && <span>Keluar Sistem</span>}
                    </Link>
                </div>
            </aside>

            {/* Modal pengaturan path, chunked upload & Agent Sync ARKAS */}
            <ArkasConfigModal
                show={showPathModal}
                onClose={() => setShowPathModal(false)}
                canWrite={canModule('path_arkas', 'write')}
                onStatusChange={setArkasStatus}
            />
        </>
    );
}

const SectionTitle = ({ children, isVisible }: { children: ReactNode; isVisible: boolean }) => (
    <div className={`px-3 pb-2 pt-3 transition-all duration-300 ${!isVisible ? 'hidden h-0 opacity-0' : 'opacity-100'}`}>
        <span className="text-[9px] font-bold uppercase tracking-[0.22em] text-white/30">{children}</span>
    </div>
);

const GroupHeader = ({
    label,
    isOpen,
    isSidebarOpen,
    onClick,
}: {
    label: string;
    isOpen: boolean;
    isSidebarOpen: boolean;
    onClick: () => void;
}) => {
    if (!isSidebarOpen) {
        return (
            <div className="flex justify-center py-2">
                <div className="h-px w-6 bg-white/10" />
            </div>
        );
    }

    return (
        <button
            type="button"
            onClick={onClick}
            className="group flex w-full items-center justify-between rounded-xl px-3 py-2 text-white/30 transition-colors hover:text-white/60"
        >
            <span className="text-[9px] font-bold uppercase tracking-[0.22em]">{label}</span>
            <svg className={`h-3 w-3 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <path d="m6 9 6 6 6-6" />
            </svg>
        </button>
    );
};

// ==== Ikon (dipertahankan dari versi sebelumnya) ====
const IconDashboard = () => (
    <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1.6" />
        <rect x="14" y="3" width="7" height="7" rx="1.6" />
        <rect x="3" y="14" width="7" height="7" rx="1.6" />
        <rect x="14" y="14" width="7" height="7" rx="1.6" />
    </svg>
);

const IconPenganggaran = () => (
    <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
        <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
        <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
    </svg>
);

const IconPenatausahaan = () => (
    <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
    </svg>
);

const IconSTS = () => (
    <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 3v18h18" />
        <path d="M7 15v2M11 11v6M15 8v9M19 5v12" />
    </svg>
);

const IconArkas = () => (
    <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76Z" />
    </svg>
);

const IconRefKode = () => (
    <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <polyline points="16 18 22 12 16 6" />
        <polyline points="8 6 2 12 8 18" />
    </svg>
);

const IconSchool = () => (
    <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 21V8l10-5 10 5v13" />
        <path d="M6 21v-7h12v7" />
        <path d="M9 21v-4h6v4" />
    </svg>
);

const IconKegiatan = () => (
    <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
        <rect x="9" y="3" width="6" height="4" rx="1" />
        <path d="M9 12h6M9 16h4" />
    </svg>
);

const IconRekening = () => (
    <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="M3 10h18M7 15h3" />
    </svg>
);

const IconKwitansi = () => (
    <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <path d="M14 2v6h6" />
    </svg>
);

const IconTandaTerima = () => (
    <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 12h6M9 16h6M9 8h6" />
        <rect x="3" y="3" width="18" height="18" rx="3" />
    </svg>
);

const IconDokumen = () => (
    <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 7v8a2 2 0 0 0 2 2h6M8 7V5a2 2 0 0 1 2-2h4.586a1 1 0 0 1 .707.293l4.414 4.414a1 1 0 0 1 .293.707V15a2 2 0 0 1-2 2h-2" />
        <path d="M8 7H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-2" />
    </svg>
);

const IconLaporan = () => (
    <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 3v18h18" />
        <path d="M18 17V9M13 17V5M8 17v-3" />
    </svg>
);

const IconBackup = () => (
    <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <ellipse cx="12" cy="5" rx="8" ry="3" />
        <path d="M4 5v14c0 1.66 3.58 3 8 3s8-1.34 8-3V5" />
        <path d="M4 12c0 1.66 3.58 3 8 3s8-1.34 8-3" />
    </svg>
);

const IconPath = () => (
    <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 7v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-6l-2-2H5a2 2 0 0 0-2 2z" />
    </svg>
);

const IconBast = () => (
    <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.586a1 1 0 0 1 .707.293l5.414 5.414a1 1 0 0 1 .293.707V19a2 2 0 0 1-2 2z" />
    </svg>
);

const IconSuratPesanan = () => (
    <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17" />
        <circle cx="9" cy="20" r="1" />
        <circle cx="17" cy="20" r="1" />
    </svg>
);

const IconSkSurat = () => (
    <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.586a1 1 0 0 1 .707.293l5.414 5.414a1 1 0 0 1 .293.707V19a2 2 0 0 1-2 2z" />
        <path d="M5 8h2m-2 4h2" />
    </svg>
);

const IconUpdate = () => (
    <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
        <path d="M3 3v5h5" />
        <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
        <path d="M16 16h5v5" />
    </svg>
);

const IconNetwork = () => (
    <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" />
        <path d="M3.6 9h16.8" />
        <path d="M3.6 15h16.8" />
        <path d="M11.5 3a17 17 0 0 0 0 18" />
        <path d="M12.5 3a17 17 0 0 1 0 18" />
    </svg>
);

const IconUsersRole = () => (
    <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
);

const IconActivityLog = () => (
    <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
        <path d="M3 3v5h5" />
        <path d="M12 7v5l4 2" />
    </svg>
);

const IconPosterTransparansi = () => (
    <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 3h20" />
        <path d="M21 3v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V3" />
        <path d="m7 21 5-5 5 5" />
        <path d="M8 10v2M12 8v4M16 9v3" />
    </svg>
);
