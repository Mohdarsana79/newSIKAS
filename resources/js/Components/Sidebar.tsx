import { Link, usePage } from '@inertiajs/react';
import { ReactNode, useState } from 'react';
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
        {active && isSidebarOpen && (
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
    const isKepalaSekolah = user?.is_kepala_sekolah ?? false;
    const [isDataMasterOpen, setIsDataMasterOpen] = useState(true);
    const [isFiturPelengkapOpen, setIsFiturPelengkapOpen] = useState(true);
    const [isIntegrasiOpen, setIsIntegrasiOpen] = useState(true);

    // Pengaturan path database ARKAS (logika tidak berubah).
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
                className={`fixed inset-y-3 left-3 z-50 flex flex-col overflow-hidden rounded-[30px] bg-gradient-to-b from-[#252438] via-[#1E1D2E] to-[#15141E] text-white shadow-float ring-1 ring-white/10 transition-all duration-300 ease-out ${
                    isOpen
                        ? 'w-[268px] translate-x-0'
                        : 'w-[268px] -translate-x-[110%] lg:w-[84px] lg:translate-x-0'
                } ${className}`}
            >
                {/* Dekorasi aurora */}
                <div className="pointer-events-none absolute -left-16 -top-24 h-64 w-64 rounded-full bg-brand-500/30 blur-2xl" />
                <div className="pointer-events-none absolute -bottom-24 -right-20 h-64 w-64 rounded-full bg-lime-400/15 blur-3xl" />

                {/* Brand */}
                <div className={`relative z-10 flex items-center pt-5 ${isOpen ? 'justify-between px-4 pb-2' : 'flex-col gap-3 px-3 pb-2'}`}>
                    <div className={`flex items-center ${isOpen ? 'gap-3' : 'justify-center'}`}>
                        <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-lime-300 via-lime-400 to-lime-500 shadow-lime">
                            <svg className="h-5 w-5 text-slate-950" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                            </svg>
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

                {/* Badge role kepala sekolah */}
                {isOpen && isKepalaSekolah && (
                    <div className="relative z-10 mx-3 mt-2 flex items-center gap-2 rounded-xl border border-mint/25 bg-mint/10 px-3 py-2">
                        <span className="h-2 w-2 shrink-0 rounded-full bg-mint animate-pulse-soft" />
                        <div className="flex flex-col">
                            <span className="text-[10.5px] font-bold leading-tight text-mint">Kepala Sekolah</span>
                            <span className="text-[8.5px] text-mint/70">Hak akses: telaah &amp; baca</span>
                        </div>
                    </div>
                )}

                {/* Navigasi */}
                <div className="sikas-scroll relative z-10 flex-1 overflow-y-auto overflow-x-hidden px-3 pb-2 pt-1">
                    <nav className="space-y-1">
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

                        {/* Data Master */}
                        <div className="pt-4">
                            <GroupHeader
                                label="Data Master"
                                isOpen={isDataMasterOpen}
                                isSidebarOpen={isOpen}
                                onClick={() => setIsDataMasterOpen(!isDataMasterOpen)}
                            />
                            <div className={`space-y-1 overflow-hidden transition-all duration-300 ${isDataMasterOpen || !isOpen ? 'mt-1 max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
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

                        {/* Fitur Pelengkap */}
                        <div className="pt-2">
                            <GroupHeader
                                label="Fitur Pelengkap"
                                isOpen={isFiturPelengkapOpen}
                                isSidebarOpen={isOpen}
                                onClick={() => setIsFiturPelengkapOpen(!isFiturPelengkapOpen)}
                            />
                            <div className={`space-y-1 overflow-hidden transition-all duration-300 ${isFiturPelengkapOpen || !isOpen ? 'mt-1 max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
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
                                    SK &amp; Surat
                                </NavLink>
                                <NavLink href={route('laporan.index')} active={route().current('laporan.*')} isSidebarOpen={isOpen} icon={<IconLaporan />}>
                                    Laporan
                                </NavLink>
                            </div>
                        </div>

                        {/* Integrasi */}
                        {!isKepalaSekolah && (
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
                        {!isKepalaSekolah && (
                            <div className="pt-4">
                                <SectionTitle isVisible={isOpen}>Sistem</SectionTitle>
                                <NavLink href={route('backup.index')} active={route().current('backup.*')} isSidebarOpen={isOpen} icon={<IconBackup />}>
                                    Backup Database
                                </NavLink>
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
                                        <p className="mt-0.5 text-[9.5px] font-semibold text-slate-950/65">Sinkronisasi database</p>
                                    </div>
                                    <span className="flex items-center gap-1 rounded-full bg-slate-950/10 px-1.5 py-0.5">
                                        <span className="h-1.5 w-1.5 rounded-full bg-slate-950 animate-pulse-soft" />
                                        <span className="text-[8px] font-extrabold">LIVE</span>
                                    </span>
                                </div>
                                <div className="relative mt-2 flex items-center gap-1.5">
                                    <span className="h-1.5 w-1.5 rounded-full bg-slate-950/70" />
                                    <span className="text-[9.5px] font-bold">Terhubung · arkas.db</span>
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

            {/* Modal pengaturan path ARKAS */}
            <Modal show={showPathModal} onClose={() => !isSaving && setShowPathModal(false)} maxWidth="lg">
                <div className="relative overflow-hidden">
                    <div className="pointer-events-none absolute -right-10 -top-16 h-40 w-40 rounded-full bg-brand-500/10 blur-3xl" />
                    <div className="relative flex items-start justify-between gap-3 border-b border-slate-100 px-6 py-4 dark:border-white/5">
                        <div className="flex items-center gap-3">
                            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-pastel-lavender text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
                                <IconPath />
                            </span>
                            <div>
                                <h2 className="text-[14px] font-extrabold text-slate-900 dark:text-white">Konfigurasi Database ARKAS</h2>
                                <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500">
                                    Tentukan lokasi file <code className="rounded bg-slate-100 px-1 py-0.5 text-[9px] font-bold text-brand-600 dark:bg-white/10 dark:text-brand-300">arkas.db</code> secara manual.
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => !isSaving && setShowPathModal(false)}
                            className="flex h-7 w-7 items-center justify-center rounded-xl bg-slate-50 text-slate-400 transition hover:bg-slate-100 hover:text-slate-800 dark:bg-white/5 dark:hover:bg-white/10 dark:hover:text-white"
                            aria-label="Tutup"
                        >
                            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
                                <path d="M18 6 6 18M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    <div className="space-y-4 px-6 py-5">
                        <div>
                            <label className="mb-1.5 block text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                                Jalur file database (full path)
                            </label>
                            <TextInput
                                className="w-full"
                                placeholder="C:\Users\ASUS\AppData\Roaming\Arkas\arkas.db"
                                value={arkasPath}
                                onChange={(e) => setArkasPath(e.target.value)}
                                disabled={isSaving}
                            />
                            <p className="mt-2 text-[9.5px] font-medium leading-relaxed text-slate-400 dark:text-slate-500">
                                Contoh lokasi umum:{' '}
                                <span className="select-all font-semibold text-slate-500 dark:text-slate-400">
                                    C:\Users\NAMA_USER\AppData\Roaming\Arkas\arkas.db
                                </span>
                            </p>
                        </div>

                        {loadError && (
                            <div className="rounded-xl border border-rose-200 bg-pastel-rose/60 px-3 py-2 text-[10px] font-semibold text-rose-500 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300">
                                {loadError}
                            </div>
                        )}

                        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4 dark:border-white/5">
                            <SecondaryButton onClick={() => setShowPathModal(false)} disabled={isSaving}>
                                Batal
                            </SecondaryButton>
                            <PrimaryButton onClick={handleSavePath} disabled={isSaving}>
                                {isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}
                            </PrimaryButton>
                        </div>
                    </div>
                </div>
            </Modal>
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
