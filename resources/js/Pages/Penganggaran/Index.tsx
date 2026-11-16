import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router } from '@inertiajs/react';
import PrimaryButton from '@/Components/PrimaryButton';
import { PageProps } from '@/types';
import { useState } from 'react';
import { usePage } from '@inertiajs/react';
import useVariantRoute from '@/Hooks/useVariantRoute';
import Modal from '@/Components/Modal';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import InputError from '@/Components/InputError';
import SecondaryButton from '@/Components/SecondaryButton';
import DangerButton from '@/Components/DangerButton';
import { useForm } from '@inertiajs/react';
import DatePicker from '@/Components/DatePicker';
import { format } from 'date-fns';
import axios from 'axios';
import PageHeader from '@/Components/ui/PageHeader';
import StatusBadge from '@/Components/ui/StatusBadge';
import IconTile from '@/Components/ui/IconTile';
import PillTabs from '@/Components/ui/PillTabs';
import EmptyState from '@/Components/ui/EmptyState';
import FilterBar from '@/Components/ui/FilterBar';

interface PenganggaranItem {
    id: number;
    title: string;
    pagu: string;
    status: 'regular' | 'perubahan';
    status_persetujuan?: string;
    has_perubahan: boolean;
    has_bku: boolean;
    reports?: string[];
    tahun: string;
}

interface Anggaran {
    id: number;
    pagu_anggaran: number;
    tahun_anggaran: string;
    komite: string;
    kepala_sekolah: string;
    nip_kepala_sekolah: string;
    sk_kepala_sekolah: string;
    tanggal_sk_kepala_sekolah: string;
    bendahara: string;
    nip_bendahara: string;
    sk_bendahara: string;
    tanggal_sk_bendahara: string;
    created_at: string;
    updated_at: string;
}

export default function Index({ 
    auth, 
    items = [], 
    anggarans = [], 
    can_create = false
}: PageProps<{ items: PenganggaranItem[], anggarans: Anggaran[], can_create: boolean }>) {
    const isKepalaSekolah = Boolean(auth?.user?.is_kepala_sekolah || auth?.user?.role === 'kepala_sekolah');
    const vroute = useVariantRoute();
    const routePrefix = usePage<any>().props.routePrefix || '';
    
    let activeTab = 'BOSP Reguler';
    if (routePrefix === 'silpa-') activeTab = 'SiLPA BOSP Reguler';
    else if (routePrefix === 'kinerja-') activeTab = 'BOSP Kinerja';
    else if (routePrefix === 'kinerja-silpa-') activeTab = 'SiLPA BOSP Kinerja';

    const tabs = ['BOSP Reguler', 'SiLPA BOSP Reguler', 'BOSP Kinerja', 'SiLPA BOSP Kinerja', 'Lainnya'];
    
    const [isRestrictionModalOpen, setIsRestrictionModalOpen] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [editId, setEditId] = useState<number | null>(null);
    const [isPerubahanLocked, setIsPerubahanLocked] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const [deleteStatus, setDeleteStatus] = useState<'regular' | 'perubahan' | null>(null);
    const [isAlertModalOpen, setIsAlertModalOpen] = useState(false);
    const [alertMessage, setAlertMessage] = useState('');

    const [isDeleting, setIsDeleting] = useState(false);

    // Pull ARKAS Perubahan State & Handler
    const [isArkasModalOpen, setIsArkasModalOpen] = useState(false);
    const [arkasPreviewData, setArkasPreviewData] = useState<any>(null);
    const [isCheckingArkas, setIsCheckingArkas] = useState(false);
    const [activeCheckingId, setActiveCheckingId] = useState<number | null>(null);
    const [isPullingArkas, setIsPullingArkas] = useState(false);
    const [confirmOverwrite, setConfirmOverwrite] = useState(false);
    const [selectedPenganggaranId, setSelectedPenganggaranId] = useState<number | null>(null);

    const handleCheckArkasPerubahan = async (id: number, tahun: string) => {
        setIsCheckingArkas(true);
        setActiveCheckingId(id);
        setSelectedPenganggaranId(id);
        try {
            const response = await axios.get(vroute('rkas-perubahan.check-arkas', id));
            if (response.data.status === 'success') {
                if (response.data.exists) {
                    if (response.data.has_bku_tahap2) {
                        setAlertMessage('Tidak dapat menarik data ARKAS karena sudah terdapat transaksi belanja pada Buku Kas Umum (BKU) bulan Juli - Desember. Hapus transaksi belanja BKU pada periode tersebut terlebih dahulu.');
                        setIsAlertModalOpen(true);
                        return;
                    }
                    setConfirmOverwrite(false);
                    setArkasPreviewData(response.data);
                    setIsArkasModalOpen(true);
                } else {
                    setAlertMessage(response.data.message || `Tidak ditemukan data RKAS Perubahan yang disetujui di ARKAS untuk tahun ${tahun}.`);
                    setIsAlertModalOpen(true);
                }
            } else {
                setAlertMessage('Gagal mengecek data ARKAS: ' + (response.data.message || 'Terjadi kesalahan'));
                setIsAlertModalOpen(true);
            }
        } catch (error: any) {
            setAlertMessage('Gagal menghubungi engine ARKAS: ' + (error.response?.data?.message || error.message));
            setIsAlertModalOpen(true);
        } finally {
            setIsCheckingArkas(false);
            setActiveCheckingId(null);
        }
    };

    const confirmPullArkas = () => {
        if (!selectedPenganggaranId) return;
        if (arkasPreviewData?.current_rkas_count > 0 && !confirmOverwrite) {
            setAlertMessage('Harap centang persetujuan penimpaan (overwrite) untuk melanjutkan penarikan data.');
            setIsAlertModalOpen(true);
            return;
        }

        setIsPullingArkas(true);
        router.post(vroute('rkas-perubahan.pull-arkas', selectedPenganggaranId), {
            overwrite: confirmOverwrite,
        }, {
            onSuccess: () => {
                setIsArkasModalOpen(false);
            },
            onError: (errors) => {
                if (errors.message) {
                    setAlertMessage(errors.message);
                    setIsAlertModalOpen(true);
                }
            },
            onFinish: () => {
                setIsPullingArkas(false);
            }
        });
    };

    const { data, setData, post, put, processing, errors, reset, clearErrors } = useForm({
        pagu_anggaran: '',
        tahun_anggaran: new Date().getFullYear().toString(),
        komite: '',
        kepala_sekolah: '',
        nip_kepala_sekolah: '',
        sk_kepala_sekolah: '',
        tanggal_sk_kepala_sekolah: '',
        bendahara: '',
        nip_bendahara: '',
        sk_bendahara: '',
        tanggal_sk_bendahara: '',
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();

        if (editMode && editId) {
            put(vroute('penganggaran.update', editId), {
                onSuccess: () => {
                    setIsModalOpen(false);
                    reset();
                    setEditMode(false);
                    setEditId(null);
                    setIsPerubahanLocked(false);
                },
            });
        } else {
            post(vroute('penganggaran.store'), {
                onSuccess: () => {
                    setIsModalOpen(false);
                    reset();
                    setIsPerubahanLocked(false);
                },
            });
        }
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setIsPerubahanLocked(false);
    };

    const handleCreate = () => {
        if (!can_create) {
            setIsRestrictionModalOpen(true);
            return;
        }
        setEditMode(false);
        setEditId(null);
        setIsPerubahanLocked(false);
        reset();
        clearErrors();
        setIsModalOpen(true);
    };

    const handleEdit = (id: number) => {
        const item = anggarans.find(a => a.id === id);
        if (item) {
            const regularItem = items.find(i => i.id === id && i.status === 'regular');
            setIsPerubahanLocked(Boolean(regularItem?.has_perubahan));
            setEditMode(true);
            setEditId(id);
            setData({
                pagu_anggaran: 'Rp ' + new Intl.NumberFormat('id-ID').format(item.pagu_anggaran),
                tahun_anggaran: item.tahun_anggaran,
                komite: item.komite,
                kepala_sekolah: item.kepala_sekolah,
                nip_kepala_sekolah: item.nip_kepala_sekolah,
                sk_kepala_sekolah: item.sk_kepala_sekolah,
                tanggal_sk_kepala_sekolah: item.tanggal_sk_kepala_sekolah,
                bendahara: item.bendahara,
                nip_bendahara: item.nip_bendahara,
                sk_bendahara: item.sk_bendahara,
                tanggal_sk_bendahara: item.tanggal_sk_bendahara,
            });
            clearErrors();
            setIsModalOpen(true);
        }
    };

    const handleDelete = (id: number, status: 'regular' | 'perubahan') => {
        const item = items.find(i => i.id === id && i.status === status);
        if (!item) return;

        // 1. Validasi jika status regular tapi masih ada RKAS Perubahan
        if (status === 'regular' && item.has_perubahan) {
            setAlertMessage("Penganggaran RKAS awal tidak dapat dihapus karena RKAS Perubahan masih ada. Anda perlu menghapus RKAS Perubahan terlebih dahulu.");
            setIsAlertModalOpen(true);
            return;
        }

        // 2. Validasi BKU
        if (item.has_bku) {
            if (status === 'perubahan') {
                setAlertMessage("RKAS Perubahan tidak dapat dihapus karena sudah ada data belanja pada BKU bulan Juli - Desember. Anda perlu menghapus data BKU pada periode tersebut terlebih dahulu.");
            } else {
                setAlertMessage("Penganggaran tidak dapat di hapus karena sudah ada data belanja pada BKU, anda perlu menghapus data bku pada penganggaran ini untuk dapat menghapus penganggaran ini");
            }
            setIsAlertModalOpen(true);
            return;
        }

        // 3. Validasi Dokumen Laporan (SP2B, SPTJ, SPMTH, LPH)
        if (item.reports && item.reports.length > 0) {
            const reportNames = item.reports.join(', ');
            setAlertMessage(`Dokumen ${reportNames} telah dibuat. Tidak bisa menghapus penganggaran ini karena berisiko merusak data. Hapus ${reportNames} terlebih dahulu agar bisa menghapus penganggaran ini.`);
            setIsAlertModalOpen(true);
            return;
        }

        setDeleteId(id);
        setDeleteStatus(status);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = () => {
        if (deleteId) {
            const routeName = deleteStatus === 'perubahan'
                ? 'rkas-perubahan.destroy-penganggaran'
                : 'penganggaran.destroy';

            router.delete(vroute(routeName, deleteId), {
                onStart: () => setIsDeleting(true),
                onFinish: () => setIsDeleting(false),
                onSuccess: () => {
                    setIsDeleteModalOpen(false);
                    setDeleteId(null);
                    setDeleteStatus(null);
                },
            });
        }
    };

    // === Ringkasan presentasional (dihitung dari props existing, bukan state baru) ===
    const totalDokumen = items.length;
    const jumlahAwal = items.filter((item) => item.status === 'regular').length;
    const jumlahPerubahan = items.filter((item) => item.status === 'perubahan').length;
    const persenAwal = totalDokumen > 0 ? Math.round((jumlahAwal / totalDokumen) * 100) : 0;
    const persenPerubahan = totalDokumen > 0 ? Math.round((jumlahPerubahan / totalDokumen) * 100) : 0;
    const totalPagu = anggarans.reduce((total, anggaran) => total + Number(anggaran.pagu_anggaran || 0), 0);
    const tahunAktif = anggarans[0]?.tahun_anggaran || items[0]?.tahun || new Date().getFullYear().toString();

    return (
        <AuthenticatedLayout>
            <Head title="Penganggaran" />

            <div className="space-y-4">
                {/* Header halaman */}
                <PageHeader
                    className="animate-rise"
                    breadcrumb={[
                        { label: 'Dashboard' },
                        { label: 'Penganggaran' },
                    ]}
                    title="Penganggaran"
                    badge={
                        <span className="rounded-full bg-pastel-lavender px-2.5 py-1 text-[10px] font-extrabold text-brand-600 ring-1 ring-brand-500/15 dark:bg-brand-500/15 dark:text-brand-300 dark:ring-brand-400/25">
                            RKAS
                        </span>
                    }
                    subtitle="Kelola Rencana Kegiatan dan Anggaran Sekolah (RKAS) Anda di sini."
                    actions={
                        !isKepalaSekolah ? (
                            <PrimaryButton onClick={handleCreate}>
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                </svg>
                                Buat Anggaran Baru
                            </PrimaryButton>
                        ) : undefined
                    }
                />

                {/* Strip ringkasan */}
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
                    <div
                        className="group sikas-card sikas-card-hover animate-rise relative overflow-hidden p-4"
                        style={{ animationDelay: '60ms' }}
                    >
                        <div className="flex items-center justify-between gap-2">
                            <IconTile tone="violet" size="md" className="transition-transform duration-300 group-hover:scale-110">
                                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                                    <path d="M3 3v18h18" />
                                    <rect x="7" y="10" width="3" height="7" rx="1" />
                                    <rect x="12" y="6" width="3" height="11" rx="1" />
                                    <rect x="17" y="13" width="3" height="4" rx="1" />
                                </svg>
                            </IconTile>
                            <span className="text-[9px] font-extrabold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                                Total Pagu
                            </span>
                        </div>
                        <p className="mt-2 truncate text-sikas-num text-[17px] font-extrabold tracking-tight text-slate-900 dark:text-white">
                            Rp {new Intl.NumberFormat('id-ID').format(totalPagu)}
                        </p>
                        <p className="mt-0.5 text-[10px] font-semibold text-slate-400 dark:text-slate-500">
                            Tahun anggaran {tahunAktif}
                        </p>
                    </div>

                    <div
                        className="group sikas-card sikas-card-hover animate-rise relative overflow-hidden p-4"
                        style={{ animationDelay: '110ms' }}
                    >
                        <div className="flex items-center justify-between gap-2">
                            <IconTile tone="lime" size="md" className="transition-transform duration-300 group-hover:scale-110">
                                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                                    <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </IconTile>
                            <span className="text-[9px] font-extrabold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                                Dokumen RKAS
                            </span>
                        </div>
                        <p className="mt-2 text-sikas-num text-[17px] font-extrabold tracking-tight text-slate-900 dark:text-white">
                            {totalDokumen}
                            <span className="ml-1.5 text-[10.5px] font-bold text-slate-400 dark:text-slate-500">dokumen</span>
                        </p>
                        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
                            <div
                                className="h-full rounded-full bg-gradient-to-r from-lime-400 to-lime-500"
                                style={{ width: `${persenAwal}%` }}
                            />
                        </div>
                        <p className="mt-1.5 text-[10px] font-semibold text-slate-400 dark:text-slate-500">
                            {jumlahAwal} RKAS awal
                        </p>
                    </div>

                    <div
                        className="group sikas-card sikas-card-hover animate-rise relative col-span-2 overflow-hidden p-4 lg:col-span-1"
                        style={{ animationDelay: '160ms' }}
                    >
                        <div className="flex items-center justify-between gap-2">
                            <IconTile tone="amber" size="md" className="transition-transform duration-300 group-hover:scale-110">
                                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                                    <path d="m22 7-8.5 8.5-5-5L2 17" />
                                    <path d="M16 7h6v6" />
                                </svg>
                            </IconTile>
                            <span className="text-[9px] font-extrabold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                                RKAS Perubahan
                            </span>
                        </div>
                        <p className="mt-2 text-sikas-num text-[17px] font-extrabold tracking-tight text-slate-900 dark:text-white">
                            {jumlahPerubahan}
                            <span className="ml-1.5 text-[10.5px] font-bold text-slate-400 dark:text-slate-500">dokumen</span>
                        </p>
                        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
                            <div
                                className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-400"
                                style={{ width: `${persenPerubahan}%` }}
                            />
                        </div>
                        <p className="mt-1.5 text-[10px] font-semibold text-slate-400 dark:text-slate-500">
                            {persenPerubahan}% dari total dokumen
                        </p>
                    </div>
                </div>

                {/* Tab varian BOSP + info tahun */}
                <div
                    className="sikas-card animate-rise relative p-2"
                    style={{ animationDelay: '200ms' }}
                >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <PillTabs
                            value={activeTab}
                            variant="solid"
                            ariaLabel="Varian BOSP"
                            onChange={(key) => {
                                if (key === 'BOSP Reguler') {
                                    router.visit(route('penganggaran.index'));
                                } else if (key === 'SiLPA BOSP Reguler') {
                                    router.visit(route('silpa-penganggaran.index'));
                                } else if (key === 'BOSP Kinerja') {
                                    router.visit(route('kinerja-penganggaran.index'));
                                } else if (key === 'SiLPA BOSP Kinerja') {
                                    router.visit(route('kinerja-silpa-penganggaran.index'));
                                }
                            }}
                            items={tabs.map((tab) => ({ key: tab, label: tab }))}
                        />

                        <div className="flex items-center gap-2 px-1">
                            <span className="inline-flex items-center gap-1.5 rounded-xl border border-slate-100 bg-white px-2.5 py-1.5 text-[10.5px] font-bold text-slate-600 shadow-pill dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                                <svg className="h-3 w-3 text-slate-400 dark:text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                                    <rect x="3" y="4" width="18" height="18" rx="3" />
                                    <path d="M16 2v4M8 2v4M3 10h18" />
                                </svg>
                                Tahun {tahunAktif}
                            </span>
                            <span className="hidden items-center gap-1.5 rounded-xl bg-slate-100 px-2.5 py-1.5 text-[10.5px] font-bold text-slate-500 sm:inline-flex dark:bg-white/5 dark:text-slate-400">
                                {totalDokumen} dokumen
                            </span>
                        </div>
                    </div>
                </div>

                {/* Baris info & filter (tanpa state filter baru) */}
                <div className="animate-rise" style={{ animationDelay: '240ms' }}>
                    <FilterBar
                        className="px-1"
                        end={
                            <div className="flex flex-wrap items-center gap-1.5">
                                <StatusBadge tone="violet" dot={false}>
                                    RKAS Awal {jumlahAwal}
                                </StatusBadge>
                                <StatusBadge tone="warning" dot={false}>
                                    Perubahan {jumlahPerubahan}
                                </StatusBadge>
                            </div>
                        }
                    >
                        <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                            Menampilkan{' '}
                            <span className="text-sikas-num font-extrabold text-slate-700 dark:text-slate-200">{totalDokumen}</span>{' '}
                            dokumen pada varian{' '}
                            <span className="font-extrabold text-slate-700 dark:text-slate-200">{activeTab}</span>.
                        </p>
                    </FilterBar>
                </div>

                {/* Daftar dokumen RKAS */}
                <div>
                    {items.length === 0 ? (
                        <EmptyState
                            title="Tidak ada data anggaran"
                            description="Mulailah dengan membuat anggaran baru."
                            icon={
                                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2h-1" />
                                </svg>
                            }
                            action={
                                !isKepalaSekolah ? (
                                    <PrimaryButton onClick={handleCreate}>
                                        <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                                        </svg>
                                        Buat Anggaran
                                    </PrimaryButton>
                                ) : undefined
                            }
                        />
                    ) : (
                        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                            {items.map((item, index) => (
                                <article
                                    key={`${item.id}-${item.status}`}
                                    className="group sikas-card sikas-card-hover animate-rise relative overflow-hidden p-4"
                                    style={{ animationDelay: `${280 + Math.min(index, 4) * 40}ms` }}
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex min-w-0 items-center gap-3">
                                            <IconTile
                                                size="lg"
                                                tone={item.status === 'perubahan' ? 'amber' : 'violet'}
                                                className="transition-transform duration-300 group-hover:scale-105"
                                            >
                                                {item.status === 'perubahan' ? (
                                                    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                                                        <path d="M3 3v18h18" />
                                                        <path d="m19 9-5 5-4-4-3 3" />
                                                    </svg>
                                                ) : (
                                                    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                                                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                                        <path d="M14 2v6h6" />
                                                        <path d="M9 13h6M9 17h4" />
                                                    </svg>
                                                )}
                                            </IconTile>

                                            <div className="min-w-0">
                                                <h3 className="truncate text-[13px] font-extrabold tracking-tight text-slate-900 dark:text-white">
                                                    {item.title}
                                                </h3>
                                                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                                                    <StatusBadge tone={item.status === 'perubahan' ? 'warning' : 'violet'}>
                                                        {item.status === 'perubahan' ? 'Perubahan' : 'RKAS Awal'}
                                                    </StatusBadge>
                                                    <StatusBadge
                                                        tone={item.status_persetujuan === 'disetujui' ? 'success' : 'warning'}
                                                        dot
                                                    >
                                                        {item.status_persetujuan === 'disetujui' ? 'Disahkan Kepsek' : 'Belum Disahkan'}
                                                    </StatusBadge>
                                                    <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 text-[9px] font-bold text-slate-500 dark:bg-white/5 dark:text-slate-400">
                                                        <svg className="h-2.5 w-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
                                                            <rect x="3" y="4" width="18" height="18" rx="3" />
                                                            <path d="M16 2v4M8 2v4M3 10h18" />
                                                        </svg>
                                                        TA <span className="text-sikas-num">{item.tahun}</span>
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="text-[9px] font-extrabold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                                                Pagu anggaran
                                            </p>
                                            <p className="truncate text-sikas-num text-[17px] font-extrabold tracking-tight text-slate-900 dark:text-white">
                                                {item.pagu}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="mt-3 flex flex-wrap items-center justify-end gap-1.5 border-t border-slate-100 pt-3 dark:border-white/5">
                                        {/* Edit Button - Conditional */}
                                        {!isKepalaSekolah && item.status === 'regular' && (
                                            <button
                                                onClick={() => handleEdit(item.id)}
                                                className="inline-flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-500 dark:hover:bg-white/5 dark:hover:text-white"
                                                title="Edit Data Anggaran"
                                            >
                                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                </svg>
                                            </button>
                                        )}

                                        {/* View / Detail Button */}
                                        <Link
                                            href={item.status === 'perubahan' ? vroute('rkas-perubahan.index', item.id) : vroute('rkas.index', item.id)}
                                            className={`inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-[10px] font-extrabold ring-1 transition ${
                                                item.status === 'perubahan'
                                                    ? 'bg-pastel-amber text-amber-700 ring-amber-500/15 hover:bg-amber-100 dark:bg-amber-400/10 dark:text-amber-300 dark:ring-amber-400/20 dark:hover:bg-amber-400/15'
                                                    : 'bg-lime-200 text-slate-900 ring-lime-300/70 hover:bg-lime-300 dark:bg-lime-400/15 dark:text-lime-300 dark:ring-lime-400/25 dark:hover:bg-lime-400/20'
                                            }`}
                                        >
                                            {isKepalaSekolah ? 'Telaah & Sahkan RKAS' : 'Detail RKAS'}
                                            <svg className="h-2.5 w-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round">
                                                <path d="m9 18 6-6-6-6" />
                                            </svg>
                                        </Link>

                                        {/* Tarik ARKAS Button for Perubahan */}
                                        {!isKepalaSekolah && item.status === 'perubahan' && (
                                            <button
                                                onClick={() => handleCheckArkasPerubahan(item.id, item.tahun)}
                                                disabled={isCheckingArkas && activeCheckingId === item.id}
                                                className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/15 bg-pastel-mint px-3 py-1.5 text-[10px] font-extrabold text-emerald-700 ring-1 ring-emerald-500/15 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-emerald-400/20 dark:bg-mint/10 dark:text-emerald-300 dark:ring-emerald-400/20 dark:hover:bg-mint/15"
                                                title="Tarik RKAS Perubahan dari ARKAS"
                                            >
                                                {isCheckingArkas && activeCheckingId === item.id ? (
                                                    <svg className="h-3.5 w-3.5 animate-spin text-emerald-600 dark:text-emerald-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                    </svg>
                                                ) : (
                                                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                                    </svg>
                                                )}
                                                <span className="hidden sm:inline">Tarik ARKAS</span>
                                            </button>
                                        )}

                                        {/* Summary / Print Button */}
                                        <Link
                                            href={item.status === 'perubahan' ? vroute('rkas-perubahan.summary', item.id) : vroute('rkas.summary', item.id)}
                                            className="inline-flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 transition hover:bg-emerald-50 hover:text-emerald-600 dark:text-slate-500 dark:hover:bg-white/5 dark:hover:text-emerald-300"
                                            title="Ringkasan & Cetak"
                                        >
                                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                            </svg>
                                        </Link>

                                        {/* Delete Button */}
                                        {!isKepalaSekolah && (
                                            <button
                                                onClick={() => handleDelete(item.id, item.status)}
                                                className="inline-flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 dark:text-slate-500 dark:hover:bg-white/5 dark:hover:text-rose-300"
                                                title="Hapus Anggaran"
                                            >
                                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        )}
                                    </div>
                                </article>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Modal Tambah Baru */}
            <Modal show={isModalOpen} onClose={handleCloseModal} maxWidth="2xl">
                <div className="flex max-h-[90vh] flex-col overflow-hidden">
                    {/* Header modal */}
                    <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 px-6 py-5 dark:border-white/5">
                        <div className="flex items-center gap-3">
                            <IconTile tone="violet" size="lg">
                                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                    <path d="M14 2v6h6" />
                                    <path d="M9 13h6M9 17h4" />
                                </svg>
                            </IconTile>
                            <div className="min-w-0">
                                <h2 className="text-[17px] font-extrabold tracking-tight text-slate-900 dark:text-white">
                                    {editMode ? 'Edit Data Anggaran' : 'Tambah Anggaran Baru'}
                                </h2>
                                <p className="mt-0.5 text-[11px] font-medium text-slate-400 dark:text-slate-500">
                                    Lengkapi rincian dokumen RKAS di bawah ini.
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={handleCloseModal}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-500 dark:hover:bg-white/5 dark:hover:text-white"
                            aria-label="Tutup"
                        >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
                        <div className="sikas-scroll flex-1 space-y-4 overflow-y-auto px-6 py-5">
                            {/* Section 1: Informasi Dasar */}
                            <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 dark:border-white/5 dark:bg-white/[0.03]">
                                <h3 className="mb-4 flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                                    <IconTile tone="slate" size="sm">
                                        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                                            <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </IconTile>
                                    Informasi Dasar
                                </h3>
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    <div className="md:col-span-2">
                                        <InputLabel value="Pagu Anggaran (Rp)" />
                                        <div className="relative">
                                            <div className="pointer-events-none absolute inset-y-0 left-0 z-10 flex items-center pl-3">
                                                <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500">Rp</span>
                                            </div>
                                            <TextInput
                                                value={data.pagu_anggaran.replace('Rp ', '')}
                                                disabled={editMode && isPerubahanLocked}
                                                onChange={(e) => {
                                                    let value = e.target.value.replace(/[^,\d]/g, '');
                                                    if (value) {
                                                        const split = value.split(',');
                                                        const sisa = split[0].length % 3;
                                                        let rupiah = split[0].substr(0, sisa);
                                                        const ribuan = split[0].substr(sisa).match(/\d{3}/gi);

                                                        if (ribuan) {
                                                            const separator = sisa ? '.' : '';
                                                            rupiah += separator + ribuan.join('.');
                                                        }

                                                        rupiah = split[1] !== undefined ? rupiah + ',' + split[1] : rupiah;
                                                        setData('pagu_anggaran', 'Rp ' + rupiah);
                                                    } else {
                                                        setData('pagu_anggaran', '');
                                                    }
                                                }}
                                                placeholder="50.000.000"
                                                className="pl-10 text-sikas-num disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 dark:disabled:bg-white/5 dark:disabled:text-slate-400"
                                                required
                                            />
                                        </div>
                                        {editMode && isPerubahanLocked && (
                                            <p className="mt-1 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                                                Pagu anggaran tidak dapat diubah karena sudah memiliki RKAS Perubahan.
                                            </p>
                                        )}
                                        <InputError message={errors.pagu_anggaran} className="mt-2" />
                                    </div>

                                    <div>
                                        <InputLabel value="Tahun Anggaran" />
                                        <TextInput
                                            type="number"
                                            value={data.tahun_anggaran}
                                            disabled={editMode && isPerubahanLocked}
                                            onChange={(e) => setData('tahun_anggaran', e.target.value)}
                                            className="text-sikas-num disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 dark:disabled:bg-white/5 dark:disabled:text-slate-400"
                                            required
                                        />
                                        {editMode && isPerubahanLocked && (
                                            <p className="mt-1 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                                                Tahun anggaran tidak dapat diubah karena sudah memiliki RKAS Perubahan.
                                            </p>
                                        )}
                                        <InputError message={errors.tahun_anggaran} className="mt-2" />
                                    </div>

                                    <div>
                                        <InputLabel value="Nama Komite" />
                                        <TextInput
                                            value={data.komite}
                                            onChange={(e) => setData('komite', e.target.value)}
                                            required
                                        />
                                        <InputError message={errors.komite} className="mt-2" />
                                    </div>
                                </div>
                            </div>

                            {/* Section 2: Kepala Sekolah */}
                            <div className="rounded-2xl border border-brand-500/10 bg-pastel-lavender/50 p-4 dark:border-brand-400/20 dark:bg-brand-500/[0.08]">
                                <h3 className="mb-4 flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.14em] text-brand-600 dark:text-brand-300">
                                    <IconTile tone="violet" size="sm">
                                        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                                            <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                        </svg>
                                    </IconTile>
                                    Data Kepala Sekolah
                                </h3>
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    <div className="md:col-span-2">
                                        <InputLabel value="Nama Lengkap" />
                                        <TextInput
                                            value={data.kepala_sekolah}
                                            onChange={(e) => setData('kepala_sekolah', e.target.value)}
                                            required
                                            placeholder="Nama lengkap beserta gelar"
                                        />
                                        <InputError message={errors.kepala_sekolah} className="mt-2" />
                                    </div>
                                    <div>
                                        <InputLabel value="NIP" />
                                        <TextInput
                                            value={data.nip_kepala_sekolah}
                                            onChange={(e) => setData('nip_kepala_sekolah', e.target.value)}
                                            className="text-sikas-num"
                                            required
                                        />
                                        <InputError message={errors.nip_kepala_sekolah} className="mt-2" />
                                    </div>
                                    <div>
                                        <InputLabel value="Nomor SK" />
                                        <TextInput
                                            value={data.sk_kepala_sekolah}
                                            onChange={(e) => setData('sk_kepala_sekolah', e.target.value)}
                                            required
                                        />
                                        <InputError message={errors.sk_kepala_sekolah} className="mt-2" />
                                    </div>
                                    <div className="md:col-span-2">
                                        <InputLabel value="Tanggal SK" />
                                        <DatePicker
                                            value={data.tanggal_sk_kepala_sekolah}
                                            onChange={(date) => setData('tanggal_sk_kepala_sekolah', date ? format(date, 'yyyy-MM-dd') : '')}
                                            className="mt-1 w-full rounded-xl border-slate-200/90 bg-white py-2.5 text-[12px] font-semibold text-slate-800 shadow-sm focus:border-lime-400 focus:ring-4 focus:ring-lime-200/60 dark:border-white/10 dark:bg-white/5 dark:text-white"
                                            placeholder="Pilih Tanggal SK"
                                        />
                                        <InputError message={errors.tanggal_sk_kepala_sekolah} className="mt-2" />
                                    </div>
                                </div>
                            </div>

                            {/* Section 3: Bendahara */}
                            <div className="rounded-2xl border border-peach/10 bg-pastel-peach/40 p-4 dark:border-peach/20 dark:bg-peach/[0.06]">
                                <h3 className="mb-4 flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.14em] text-orange-700 dark:text-orange-300">
                                    <IconTile tone="peach" size="sm">
                                        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                                            <path d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                                        </svg>
                                    </IconTile>
                                    Data Bendahara
                                </h3>
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    <div className="md:col-span-2">
                                        <InputLabel value="Nama Lengkap" />
                                        <TextInput
                                            value={data.bendahara}
                                            onChange={(e) => setData('bendahara', e.target.value)}
                                            required
                                            placeholder="Nama lengkap beserta gelar"
                                        />
                                        <InputError message={errors.bendahara} className="mt-2" />
                                    </div>
                                    <div>
                                        <InputLabel value="NIP" />
                                        <TextInput
                                            value={data.nip_bendahara}
                                            onChange={(e) => setData('nip_bendahara', e.target.value)}
                                            className="text-sikas-num"
                                            required
                                        />
                                        <InputError message={errors.nip_bendahara} className="mt-2" />
                                    </div>
                                    <div>
                                        <InputLabel value="Nomor SK" />
                                        <TextInput
                                            value={data.sk_bendahara}
                                            onChange={(e) => setData('sk_bendahara', e.target.value)}
                                            required
                                        />
                                        <InputError message={errors.sk_bendahara} className="mt-2" />
                                    </div>
                                    <div className="md:col-span-2">
                                        <InputLabel value="Tanggal SK" />
                                        <DatePicker
                                            value={data.tanggal_sk_bendahara}
                                            onChange={(date) => setData('tanggal_sk_bendahara', date ? format(date, 'yyyy-MM-dd') : '')}
                                            className="mt-1 w-full rounded-xl border-slate-200/90 bg-white py-2.5 text-[12px] font-semibold text-slate-800 shadow-sm focus:border-lime-400 focus:ring-4 focus:ring-lime-200/60 dark:border-white/10 dark:bg-white/5 dark:text-white"
                                            placeholder="Pilih Tanggal SK"
                                        />
                                        <InputError message={errors.tanggal_sk_bendahara} className="mt-2" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer aksi */}
                        <div className="flex shrink-0 flex-wrap justify-end gap-3 border-t border-slate-100 bg-white/90 px-6 py-4 dark:border-white/5 dark:bg-[#15131F]/95">
                            <SecondaryButton onClick={handleCloseModal} disabled={processing}>
                                Batal
                            </SecondaryButton>
                            <PrimaryButton disabled={processing}>
                                {processing ? (
                                    <span className="flex items-center gap-2">
                                        <svg className="h-4 w-4 animate-spin text-slate-950" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Menyimpan...
                                    </span>
                                ) : 'Simpan Anggaran'}
                            </PrimaryButton>
                        </div>
                    </form>
                </div>
            </Modal>

            {/* Modal Konfirmasi Hapus */}
            <Modal show={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} maxWidth="md">
                <div className="p-6">
                    <div className="flex items-start gap-3">
                        <IconTile tone="rose" size="lg">
                            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                                <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </IconTile>
                        <div className="min-w-0">
                            <h2 className="text-[15px] font-extrabold tracking-tight text-slate-900 dark:text-white">
                                Apakah Anda yakin ingin menghapus data ini?
                            </h2>
                            <p className="mt-1 text-[11.5px] font-medium text-slate-500 dark:text-slate-400">
                                Data yang dihapus tidak dapat dikembalikan. Semua data yang terkait dengan anggaran ini juga akan dihapus.
                            </p>
                        </div>
                    </div>

                    <div className="mt-5 flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-4 dark:border-white/5">
                        <SecondaryButton onClick={() => setIsDeleteModalOpen(false)} disabled={isDeleting}>
                            Batal
                        </SecondaryButton>

                        <DangerButton onClick={confirmDelete} disabled={isDeleting}>
                            {isDeleting ? 'Menghapus...' : 'Hapus Anggaran'}
                        </DangerButton>
                    </div>
                </div>
            </Modal>

            {/* Modal Restriksi / Peringatan Prasyarat */}
            <Modal show={isRestrictionModalOpen} onClose={() => setIsRestrictionModalOpen(false)} maxWidth="sm">
                <div className="p-6">
                    <div className="flex justify-center">
                        <IconTile tone="rose" size="lg">
                            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                                <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </IconTile>
                    </div>
                    <h2 className="mt-3 text-center text-[15px] font-extrabold tracking-tight text-slate-900 dark:text-white">
                        Perhatian
                    </h2>
                    <p className="mt-1 text-center text-[11.5px] font-medium text-slate-500 dark:text-slate-400">
                        Mohon Maaf Lengkapi Profile Sekolah, Kode Kegiatan, dan Rekening Belanja Terlebih Dahulu
                    </p>
                    <div className="mt-5 flex w-full flex-col gap-2">
                        <PrimaryButton className="w-full justify-center" onClick={() => setIsRestrictionModalOpen(false)}>
                            Mengerti
                        </PrimaryButton>
                        <SecondaryButton className="w-full justify-center" onClick={() => {
                            setIsRestrictionModalOpen(false);
                            router.visit(route('sekolah-profile.index'));
                        }}>
                            Pergi ke Profil Sekolah
                        </SecondaryButton>
                    </div>
                </div>
            </Modal>

            {/* Modal Validasi BKU */}
            <Modal show={isAlertModalOpen} onClose={() => setIsAlertModalOpen(false)} maxWidth="sm">
                <div className="p-6">
                    <div className="flex justify-center">
                        <IconTile tone="amber" size="lg">
                            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                                <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </IconTile>
                    </div>
                    <h2 className="mt-3 text-center text-[15px] font-extrabold tracking-tight text-slate-900 dark:text-white">
                        Pemberitahuan
                    </h2>
                    <p className="mt-1 text-center text-[11.5px] font-medium text-slate-500 dark:text-slate-400">
                        {alertMessage}
                    </p>
                    <div className="mt-5 flex justify-center">
                        <PrimaryButton className="w-full justify-center" onClick={() => setIsAlertModalOpen(false)}>
                            Mengerti
                        </PrimaryButton>
                    </div>
                </div>
            </Modal>

            {/* Modal Preview Tarik RKAS Perubahan dari ARKAS */}
            <Modal show={isArkasModalOpen} onClose={() => { if (!isPullingArkas) setIsArkasModalOpen(false); }} maxWidth="md">
                <div className="p-6">
                    <div className="flex items-start gap-3">
                        <IconTile tone="mint" size="lg">
                            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                                <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                        </IconTile>
                        <div className="min-w-0">
                            <h2 className="text-[15px] font-extrabold tracking-tight text-slate-900 dark:text-white">
                                Tarik RKAS Perubahan dari ARKAS
                            </h2>
                            <p className="mt-0.5 text-[10.5px] font-medium text-slate-400 dark:text-slate-500">
                                Data Perubahan Anggaran resmi ditemukan di database ARKAS. Periksa rincian di bawah sebelum menyinkronkan.
                            </p>
                        </div>
                    </div>

                    {arkasPreviewData && (
                        <div className="mt-4 space-y-2 rounded-2xl border border-slate-100 bg-slate-50/70 p-4 text-[11.5px] dark:border-white/5 dark:bg-white/[0.03]">
                            <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-2 dark:border-white/5">
                                <span className="font-semibold text-slate-400 dark:text-slate-500">Tahun Anggaran</span>
                                <span className="text-sikas-num font-extrabold text-slate-800 dark:text-white">{arkasPreviewData.tahun}</span>
                            </div>
                            <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-2 dark:border-white/5">
                                <span className="font-semibold text-slate-400 dark:text-slate-500">Sumber Dana</span>
                                <span className="font-extrabold text-slate-800 dark:text-white">{arkasPreviewData.sumber_dana}</span>
                            </div>
                            <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-2 dark:border-white/5">
                                <span className="font-semibold text-slate-400 dark:text-slate-500">Status Revisi ARKAS</span>
                                <StatusBadge tone="warning" dot={false}>Perubahan (Revisi)</StatusBadge>
                            </div>
                            <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-2 dark:border-white/5">
                                <span className="font-semibold text-slate-400 dark:text-slate-500">Pagu Total Perubahan</span>
                                <span className="text-sikas-num font-extrabold text-emerald-600 dark:text-emerald-300">
                                    Rp {new Intl.NumberFormat('id-ID').format(arkasPreviewData.pagu)}
                                </span>
                            </div>
                            <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-2 dark:border-white/5">
                                <span className="font-semibold text-slate-400 dark:text-slate-500">Jumlah Kegiatan</span>
                                <span className="text-sikas-num font-extrabold text-slate-800 dark:text-white">{arkasPreviewData.total_kegiatan} Kegiatan</span>
                            </div>
                            <div className="flex items-center justify-between gap-3">
                                <span className="font-semibold text-slate-400 dark:text-slate-500">Total Alokasi Bulanan</span>
                                <span className="text-sikas-num font-extrabold text-slate-800 dark:text-white">{arkasPreviewData.total_alokasi} Baris Data</span>
                            </div>
                        </div>
                    )}

                    {arkasPreviewData && arkasPreviewData.current_rkas_count > 0 ? (
                        <div className="mt-4 space-y-2 rounded-2xl border border-amber-500/15 bg-pastel-amber p-3.5 dark:border-amber-400/20 dark:bg-amber-400/10">
                            <p className="text-[11px] font-bold leading-relaxed text-amber-800 dark:text-amber-200">
                                Data RKAS Perubahan di newSIKAS saat ini sudah berisi {arkasPreviewData.current_rkas_count} baris alokasi.
                            </p>
                            <label className="mt-2 flex cursor-pointer items-start gap-2 border-t border-amber-500/15 pt-2 dark:border-amber-400/20">
                                <input
                                    type="checkbox"
                                    checked={confirmOverwrite}
                                    onChange={(e) => setConfirmOverwrite(e.target.checked)}
                                    className="mt-0.5 h-3.5 w-3.5 rounded border-amber-400 text-amber-600 shadow-sm focus:ring-amber-500 dark:border-amber-400/40 dark:bg-white/5"
                                />
                                <span className="text-[10.5px] font-semibold text-amber-900 dark:text-amber-100">
                                    Saya setuju untuk menimpa ulang (overwrite) seluruh data RKAS Perubahan saat ini dengan data dari ARKAS.
                                </span>
                            </label>
                        </div>
                    ) : (
                        <div className="mt-4 rounded-2xl border border-sky/15 bg-pastel-sky p-3.5 dark:border-sky/20 dark:bg-sky/10">
                            <p className="text-[10.5px] font-medium leading-relaxed text-sky dark:text-sky">
                                <strong>Informasi:</strong> Seluruh data alokasi bulanan akan disalin ke modul RKAS Perubahan newSIKAS dan nilai Pagu Anggaran akan otomatis disinkronkan.
                            </p>
                        </div>
                    )}

                    <div className="mt-5 flex flex-wrap justify-center gap-3">
                        <SecondaryButton onClick={() => setIsArkasModalOpen(false)} disabled={isPullingArkas}>
                            Batal
                        </SecondaryButton>

                        <PrimaryButton
                            onClick={confirmPullArkas}
                            disabled={isPullingArkas || (arkasPreviewData?.current_rkas_count > 0 && !confirmOverwrite)}
                        >
                            {isPullingArkas ? 'Menarik Data...' : 'Ya, Tarik Sekarang'}
                        </PrimaryButton>
                    </div>
                </div>
            </Modal>
        </AuthenticatedLayout>
    );
}
