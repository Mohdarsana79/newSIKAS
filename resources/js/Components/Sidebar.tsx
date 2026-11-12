import { Link, usePage } from '@inertiajs/react';
import { ReactNode, useState, useEffect } from 'react';
import Modal from '@/Components/Modal';
import TextInput from '@/Components/TextInput';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import axios from 'axios';

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
        className={`relative flex items-center gap-3.5 px-4 py-3 rounded-2xl transition-all duration-300 group overflow-hidden ${active
            ? 'bg-gradient-to-r from-brand-500 to-brand-600 text-white shadow-glow-violet font-semibold'
            : 'text-slate-400 hover:text-white hover:bg-white/[0.06] font-medium'
            } ${!isSidebarOpen ? 'justify-center px-0 mx-auto w-11 h-11' : ''}`}
        title={!isSidebarOpen ? (typeof children === 'string' ? children : undefined) : undefined}
    >
        <div className={`shrink-0 z-10 transition-transform duration-300 ${active ? 'scale-110 text-white' : 'text-slate-400 group-hover:text-white group-hover:scale-105'}`}>
            {icon}
        </div>
        <span className={`z-10 text-sm whitespace-nowrap transition-all duration-300 origin-left ${!isSidebarOpen ? 'opacity-0 w-0 scale-0 pointer-events-none' : 'opacity-100 w-auto scale-100'}`}>
            {children}
        </span>
        {active && (
            <span className="absolute right-3.5 h-1.5 w-1.5 rounded-full bg-gold-400 animate-glow-pulse" />
        )}
    </Link>
);

export default function Sidebar({ className = '', isOpen = true, setIsOpen }: { className?: string; isOpen?: boolean; setIsOpen?: (open: boolean) => void }) {
    const { url, props } = usePage();
    const user = (props as any)?.auth?.user;
    const isKepalaSekolah = user?.is_kepala_sekolah ?? false;
    const [isDataMasterOpen, setIsDataMasterOpen] = useState(true);
    const [isFiturPelengkapOpen, setIsFiturPelengkapOpen] = useState(true);
    const [isIntegrasiOpen, setIsIntegrasiOpen] = useState(true);
    
    // Path Arkas Modal State
    const [showPathModal, setShowPathModal] = useState(false);
    const [arkasPath, setArkasPath] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [loadError, setLoadError] = useState('');

    const openPathModal = async () => {
        setShowPathModal(true);
        setLoadError('');
        try {
            const res = await axios.get(route('arkas-tools.get-path'));
            setArkasPath(res.data.path || '');
        } catch (err) {
            setLoadError('Gagal mengambil data path.');
        }
    };

    const handleSavePath = async () => {
        setIsSaving(true);
        try {
            const res = await axios.post(route('arkas-tools.save-path'), { path: arkasPath });
            if (res.data.status === 'success') {
                alert('Path Arkas berhasil disimpan!');
                setShowPathModal(false);
            } else {
                alert('Gagal: ' + res.data.message);
            }
        } catch (err) {
            alert('Terjadi kesalahan saat menyimpan.');
        } finally {
            setIsSaving(false);
        }
    };

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
                className={`flex flex-col h-screen bg-[#0D0F17] text-white fixed left-0 top-0 transition-all duration-300 ease-in-out z-50 border-r border-white/5 shadow-2xl
                ${isOpen ? 'translate-x-0 w-64' : '-translate-x-full md:translate-x-0 md:w-20'} 
                ${className}`}
            >
                {/* Visual Accent - Top Glow */}
                <div className="absolute top-0 left-0 w-full h-40 bg-gradient-to-b from-brand-500/15 via-brand-500/5 to-transparent pointer-events-none"></div>

                {/* Branding Section */}
                <div className={`relative z-10 flex items-center justify-between px-6 h-24 shrink-0 border-b border-white/5 ${!isOpen ? 'px-0 justify-center' : ''}`}>
                    <div className="flex items-center gap-3">
                        <div className="relative flex-shrink-0 group">
                            <div className="absolute -inset-1 bg-gradient-to-r from-brand-500 to-gold-400 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
                            <div className="relative p-2.5 bg-slate-900/90 border border-white/10 rounded-2xl">
                                <svg className="w-6 h-6 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                </svg>
                            </div>
                        </div>
                        <div className={`flex flex-col transition-all duration-300 ${!isOpen ? 'hidden scale-0 opacity-0' : 'block scale-100 opacity-100'}`}>
                            <span className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-br from-white to-slate-300">SIKAS</span>
                            <span className="text-[9px] font-bold text-gold-400 uppercase tracking-[0.22em] leading-none">Management</span>
                        </div>
                    </div>

                    {/* Integrated Toggle Button (Visible in Sidebar when open or on desktop) */}
                    <button
                        onClick={() => setIsOpen?.(!isOpen)}
                        className={`p-1.5 rounded-xl border border-white/10 bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-all focus:outline-none md:flex hidden ${!isOpen ? 'absolute -right-4 top-9 translate-x-0' : ''}`}
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

                {/* Role Badge if Kepala Sekolah */}
                {isOpen && isKepalaSekolah && (
                    <div className="mx-4 mt-3 px-3 py-2 bg-emerald-500/10 border border-emerald-500/25 rounded-xl flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>
                        <div className="flex flex-col">
                            <span className="text-[11px] font-bold text-emerald-300 leading-tight">Kepala Sekolah</span>
                            <span className="text-[9px] text-emerald-400/80">Hak Akses: Read-Only & Telaah</span>
                        </div>
                    </div>
                )}

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

                        <NavLink href={route('arkas-tools.index')} active={route().current('arkas-tools.*')} isSidebarOpen={isOpen} icon={<IconArkas />}>
                            Arkas Tools
                        </NavLink>

                        <NavLink href={route('referensi-kode.index')} active={route().current('referensi-kode.*')} isSidebarOpen={isOpen} icon={<IconRefKode />}>
                            Referensi Kode
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
                                <NavLink href={route('bast.index')} active={route().current('bast.*') || route().current('*-bast.*')} isSidebarOpen={isOpen} icon={<IconBast />}>
                                    BAST
                                </NavLink>
                                <NavLink href={route('surat-pesanan.index')} active={route().current('surat-pesanan.*') || route().current('*-surat-pesanan.*')} isSidebarOpen={isOpen} icon={<IconSuratPesanan />}>
                                    Surat Pesanan
                                </NavLink>
                                <NavLink href={route('dokumen.index')} active={route().current('dokumen.*')} isSidebarOpen={isOpen} icon={<IconDokumen />}>
                                    Dokumen
                                </NavLink>
                                <NavLink href={route('sk-surat.index')} active={route().current('sk-surat.*')} isSidebarOpen={isOpen} icon={<IconSkSurat />}>
                                    SK & Surat
                                </NavLink>
                                <NavLink href={route('laporan.index')} active={route().current('laporan.*')} isSidebarOpen={isOpen} icon={<IconLaporan />}>
                                    Laporan
                                </NavLink>
                            </div>
                        </div>

                        {/* Integrasi Group - Khusus Bendahara */}
                        {!isKepalaSekolah && (
                            <div className="pt-4">
                                <GroupHeader
                                    label="Integrasi"
                                    isOpen={isIntegrasiOpen}
                                    isSidebarOpen={isOpen}
                                    onClick={() => setIsIntegrasiOpen(!isIntegrasiOpen)}
                                />

                                <div className={`space-y-1 overflow-hidden transition-all duration-300 ${isIntegrasiOpen || !isOpen ? 'max-h-[500px] opacity-100 mt-1' : 'max-h-0 opacity-0'}`}>
                                    {/* Path Arkas Trigger */}
                                    <button
                                        onClick={openPathModal}
                                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group overflow-hidden text-slate-400 hover:text-white hover:bg-white/5 ${!isOpen ? 'justify-center px-0 mx-auto w-12' : ''}`}
                                        title={!isOpen ? "Path Arkas" : undefined}
                                    >
                                        <div className="shrink-0 z-10 transition-transform duration-300 group-hover:scale-110">
                                            <IconPath />
                                        </div>
                                        <span className={`z-10 font-medium whitespace-nowrap transition-all duration-300 origin-left ${!isOpen ? 'opacity-0 w-0 scale-0' : 'opacity-100 w-auto scale-100'}`}>
                                            Path Arkas
                                        </span>
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Systems - Khusus Bendahara */}
                        {!isKepalaSekolah && (
                            <div className="pt-6">
                                <SectionTitle isVisible={isOpen}>Systems</SectionTitle>
                                <NavLink href={route('backup.index')} active={route().current('backup.*')} isSidebarOpen={isOpen} icon={<IconBackup />}>
                                    Backup Database
                                </NavLink>
                            </div>
                        )}
                    </nav>
                </div>

                {/* Bottom Mini Card - Eduplex style */}
                <div className="p-3 shrink-0 border-t border-white/5">
                    {isOpen ? (
                        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/[0.07] to-white/[0.02] border border-white/10 p-3.5 shadow-sm">
                            <div className="flex items-center gap-2.5">
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-500/20 text-brand-300 border border-brand-500/30">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                                    </svg>
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-xs font-semibold text-white truncate">ARKAS 4 Desktop</p>
                                    <p className="text-[10px] text-slate-400 truncate">SQLite Sync Ready</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={openPathModal}
                                className="mt-3 w-full rounded-xl bg-white/10 hover:bg-white/20 text-[11px] font-semibold text-white py-1.5 transition-colors text-center"
                            >
                                Kelola Jalur Database
                            </button>
                        </div>
                    ) : (
                        <button
                            type="button"
                            onClick={openPathModal}
                            title="Kelola Path Database ARKAS"
                            className="flex h-11 w-11 mx-auto items-center justify-center rounded-2xl bg-white/[0.06] hover:bg-brand-500/30 text-slate-300 hover:text-white transition-colors"
                        >
                            <IconPath />
                        </button>
                    )}
                </div>

                {/* Sidebar Footer */}
                <div className="p-3 border-t border-white/5 bg-[#0D0F17]/90 backdrop-blur-md sticky bottom-0 z-20">
                    <Link
                        href={route('logout')}
                        method="post"
                        as="button"
                        className={`flex items-center gap-3 w-full px-4 py-2.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-2xl transition-all duration-300 group ${!isOpen ? 'justify-center px-0' : ''}`}
                    >
                        <svg className="w-5 h-5 shrink-0 transition-transform group-hover:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        {isOpen && <span className="text-sm font-medium">Keluar Sistem</span>}
                    </Link>
                </div>
            </aside>

            {/* Modal Pengaturan Path Arkas */}
            <Modal show={showPathModal} onClose={() => !isSaving && setShowPathModal(false)} maxWidth="lg">
                <div className="p-8 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden relative">
                    {/* Visual Decor */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-3xl rounded-full -mr-16 -mt-16"></div>
                    
                    <div className="relative z-10">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="p-3 bg-indigo-500/10 rounded-2xl border border-indigo-500/20">
                                <IconPath />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-white">Konfigurasi Database ARKAS</h2>
                                <p className="text-sm text-slate-400 mt-1">Tentukan lokasi file <code className="text-indigo-400">arkas.db</code> secara manual.</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">Jalur File Database (Full Path)</label>
                                <TextInput
                                    className="w-full bg-slate-950 border-slate-800 text-slate-200 focus:border-indigo-500 focus:ring-indigo-500/20 transition-all placeholder:text-slate-700"
                                    placeholder="C:\Users\ASUS\AppData\Roaming\Arkas\arkas.db"
                                    value={arkasPath}
                                    onChange={(e) => setArkasPath(e.target.value)}
                                    disabled={isSaving}
                                />
                                <p className="mt-2 text-[11px] text-slate-500 leading-relaxed italic">
                                    * Contoh lokasi umum: <span className="text-slate-400 select-all">C:\Users\NAMA_USER\AppData\Roaming\Arkas\arkas.db</span>
                                </p>
                            </div>

                            {loadError && (
                                <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs">
                                    {loadError}
                                </div>
                            )}

                            <div className="pt-4 flex justify-end gap-3">
                                <SecondaryButton 
                                    onClick={() => setShowPathModal(false)} 
                                    disabled={isSaving}
                                    className="border-slate-800 text-slate-400 hover:bg-slate-800"
                                >
                                    Batal
                                </SecondaryButton>
                                <PrimaryButton 
                                    onClick={handleSavePath} 
                                    disabled={isSaving}
                                    className="bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-500/20"
                                >
                                    {isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}
                                </PrimaryButton>
                            </div>
                        </div>
                    </div>
                </div>
            </Modal>
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

const IconArkas = () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
);

const IconRefKode = () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
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

const IconApi = () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.826a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
    </svg>
);

const IconSync = () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
);

const IconBackup = () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
    </svg>
);

const IconPath = () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
    </svg>
);

const IconBast = () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
);
const IconSuratPesanan = () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
);

const IconSkSurat = () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h2m-2 4h2" />
    </svg>
);
