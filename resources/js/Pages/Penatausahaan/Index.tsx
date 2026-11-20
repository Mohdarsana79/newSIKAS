import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, useForm, router, usePage } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import useVariantRoute from '@/Hooks/useVariantRoute';

import Modal from '@/Components/Modal';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import InputError from '@/Components/InputError';
import DatePicker from '@/Components/DatePicker';
import { format } from 'date-fns';
import axios from 'axios';
import ArkasDiagnosticModal from '@/Components/Ai/ArkasDiagnosticModal';
import { Brain } from 'lucide-react';
import PillTabs from '@/Components/ui/PillTabs';
import PageHeader from '@/Components/ui/PageHeader';
import Surface from '@/Components/ui/Surface';
import IconTile from '@/Components/ui/IconTile';
import StatusBadge from '@/Components/ui/StatusBadge';
import EmptyState from '@/Components/ui/EmptyState';

export default function Index({ tahunList, penganggaranList, statusPerTahun, tahun }: any) {
    const vroute = useVariantRoute();
    const pageProps = usePage<any>().props;
    const routePrefix = pageProps.routePrefix || '';
    const sumberDanaOptions: string[] = pageProps.sumberDanaOptions || [];
    const sumberDanaTahap1: string | null = pageProps.sumberDanaTahap1 || null;
    
    let activeTab = 'BOSP Reguler';
    if (routePrefix === 'silpa-') activeTab = 'SiLPA BOSP Reguler';
    else if (routePrefix === 'kinerja-') activeTab = 'BOSP Kinerja';
    else if (routePrefix === 'kinerja-silpa-') activeTab = 'SiLPA BOSP Kinerja';
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [penerimaanData, setPenerimaanData] = useState([]);
    const [currentPenganggaranId, setCurrentPenganggaranId] = useState(null);
    const [loading, setLoading] = useState(false);
    const [isValidationOpen, setIsValidationOpen] = useState(false); // Validation modal state

    // ARKAS BKU Pull States
    const [isArkasBkuModalOpen, setIsArkasBkuModalOpen] = useState(false);
    const [arkasBkuLoading, setArkasBkuLoading] = useState(false);
    const [arkasBkuData, setArkasBkuData] = useState<any>(null);
    const [arkasBkuYear, setArkasBkuYear] = useState<any>(null);
    const [arkasBkuPenganggaranId, setArkasBkuPenganggaranId] = useState<any>(null);
    const [isOverwriteChecked, setIsOverwriteChecked] = useState(false);
    const [pullingBku, setPullingBku] = useState(false);
    const [isArkasAiModalOpen, setIsArkasAiModalOpen] = useState(false);

    const handleOpenArkasBkuModal = async (penganggaranId: any, tahunAnggaran: any) => {
        setArkasBkuPenganggaranId(penganggaranId);
        setArkasBkuYear(tahunAnggaran);
        setIsArkasBkuModalOpen(true);
        setArkasBkuLoading(true);
        setArkasBkuData(null);
        setIsOverwriteChecked(false);

        try {
            const response = await axios.get(vroute('penatausahaan.check-arkas-bku', penganggaranId));
            setArkasBkuData(response.data);
        } catch (error: any) {
            console.error("Error checking ARKAS BKU:", error);
            setArkasBkuData({
                status: 'error',
                message: error.response?.data?.message || 'Gagal memeriksa database ARKAS.'
            });
        } finally {
            setArkasBkuLoading(false);
        }
    };

    const handleExecutePullArkasBku = () => {
        if (!arkasBkuPenganggaranId) return;
        setPullingBku(true);
        router.post(vroute('penatausahaan.pull-arkas-bku', arkasBkuPenganggaranId), {
            overwrite: isOverwriteChecked
        }, {
            onSuccess: () => {
                setIsArkasBkuModalOpen(false);
                setPullingBku(false);
            },
            onError: (err) => {
                console.error("Error pulling BKU:", err);
                setPullingBku(false);
            }
        });
    };

    // Form handling
    const { data, setData, post, processing, errors, reset, clearErrors } = useForm({
        penganggaran_id: '',
        sumber_dana: '',
        tanggal_terima: '',
        jumlah_dana: '',
        saldo_awal: '',
        tanggal_saldo_awal: ''
    });

    useEffect(() => {
        // Fetch Penganggaran ID for current year when page loads or year changes
        if (tahun) {
            fetchPenganggaranId(tahun);
        }
    }, [tahun]);

    const fetchPenganggaranId = async (selectedTahun: any) => {
        try {
            const response = await axios.get(vroute('penatausahaan.get-id'), {
                params: { tahun: selectedTahun }
            });
            if (response.data.penganggaran_id) {
                setCurrentPenganggaranId(response.data.penganggaran_id);
                fetchPenerimaanData(response.data.penganggaran_id);
            }
        } catch (error) {
            console.error("Error fetching penganggaran ID:", error);
        }
    };

    const fetchPenerimaanData = async (penganggaranId: any) => {
        if (!penganggaranId) return;
        setLoading(true);
        try {
            const response = await axios.get(vroute('penatausahaan.get-data', penganggaranId));
            setPenerimaanData(response.data);
        } catch (error) {
            console.error("Error fetching penerimaan data:", error);
        } finally {
            setLoading(false);
        }
    };

    const openModal = () => {
        setIsModalOpen(true);
        setShowCreateForm(false);
        reset();
        clearErrors();
        if (currentPenganggaranId) {
            // We need to set it AFTER reset
            setData((data) => ({ ...data, penganggaran_id: currentPenganggaranId }));
            fetchPenerimaanData(currentPenganggaranId);
        }
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setShowCreateForm(false);
        reset();
    };

    const handleCreateClick = () => {
        setShowCreateForm(true);
        // Ensure penganggaran_id is set and clear others
        setData((data) => ({
            ...data,
            penganggaran_id: currentPenganggaranId || '',
            sumber_dana: '',
            tanggal_terima: '',
            jumlah_dana: '',
            saldo_awal: '',
            tanggal_saldo_awal: ''
        }));
        clearErrors();
    };

    const handleBackToList = () => {
        setShowCreateForm(false);
        reset();
        clearErrors();
        // Re-inject penganggaran_id because reset cleared it
        setData('penganggaran_id', currentPenganggaranId || '');
    };

    const submitPenerimaan = (e: any) => {
        e.preventDefault();
        post(vroute('penerimaan-dana.store'), {
            onSuccess: () => {
                setShowCreateForm(false);
                fetchPenerimaanData(currentPenganggaranId);
                reset();
                setData('penganggaran_id', currentPenganggaranId || ''); // Keep ID
            },
        });
    };

    // Format currency helper
    const formatCurrency = (amount: any) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    };

    // Format date helper
    const formatDate = (dateString: any) => {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        }).format(date);
    };

    const handleCurrencyChange = (e: any, field: 'jumlah_dana' | 'saldo_awal') => {
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
            setData(field, 'Rp ' + rupiah);
        } else {
            setData(field, '');
        }
    };


    const tabs = [
        'BOSP Reguler',
        'BOSP Kinerja',
        'SiLPA BOSP Reguler',
        'SiLPA BOSP Kinerja',
        'Lainnya',
    ];

    const months = [
        'Januari', 'Februari', 'Maret', 'April',
        'Mei', 'Juni', 'Juli', 'Agustus',
        'September', 'Oktober', 'November', 'Desember'
    ];

    return (
        <AuthenticatedLayout>
            <Head title="Penatausahaan" />

            <div className="space-y-4">
                <PageHeader
                    className="animate-rise"
                    breadcrumb={[
                        { label: 'Dashboard' },
                        { label: 'Penatausahaan' },
                    ]}
                    title="Penatausahaan"
                    badge={<StatusBadge tone="violet" dot={false}>{activeTab}</StatusBadge>}
                    subtitle="Buku Kas Umum (BKU) dan penerimaan dana per tahun anggaran."
                />

                {/* Tab varian BOSP */}
                <div className="animate-rise" style={{ animationDelay: '60ms' }}>
                    <Surface padding="sm">
                        <PillTabs
                            ariaLabel="Varian BOSP Penatausahaan"
                            variant="solid"
                            value={activeTab}
                            items={tabs.map((tab: any) => ({ key: tab, label: tab }))}
                            onChange={(tab) => {
                                if (tab === 'BOSP Reguler') {
                                    router.visit(route('penatausahaan.index'));
                                } else if (tab === 'BOSP Kinerja') {
                                    router.visit(route('kinerja-penatausahaan.index'));
                                } else if (tab === 'SiLPA BOSP Reguler') {
                                    router.visit(route('silpa-penatausahaan.index'));
                                } else if (tab === 'SiLPA BOSP Kinerja') {
                                    router.visit(route('kinerja-silpa-penatausahaan.index'));
                                }
                            }}
                        />
                    </Surface>
                </div>

                {/* Kartu ringkas */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <div className="sikas-card sikas-card-hover animate-rise p-4" style={{ animationDelay: '110ms' }}>
                        <div className="flex items-center gap-2.5">
                            <IconTile tone="mint" size="md">
                                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                            </IconTile>
                            <div className="min-w-0">
                                <p className="text-[11.5px] font-extrabold tracking-tight text-slate-900 dark:text-white">Tahun Anggaran</p>
                                <p className="text-[9.5px] font-medium text-slate-400 dark:text-slate-500">Tahun tersedia</p>
                            </div>
                        </div>
                        <p className="mt-3 text-sikas-num text-[19px] font-extrabold tracking-tight text-slate-900 dark:text-white">
                            {penganggaranList?.length ?? 0}
                        </p>
                    </div>

                    <div className="sikas-card sikas-card-hover animate-rise p-4" style={{ animationDelay: '150ms' }}>
                        <div className="flex items-center gap-2.5">
                            <IconTile tone="sky" size="md">
                                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </IconTile>
                            <div className="min-w-0">
                                <p className="text-[11.5px] font-extrabold tracking-tight text-slate-900 dark:text-white">Tahun Aktif</p>
                                <p className="text-[9.5px] font-medium text-slate-400 dark:text-slate-500">Periode berjalan</p>
                            </div>
                        </div>
                        <p className="mt-3 text-sikas-num text-[19px] font-extrabold tracking-tight text-slate-900 dark:text-white">
                            {tahun}
                        </p>
                    </div>

                    <div className="sikas-card sikas-card-hover animate-rise p-4" style={{ animationDelay: '190ms' }}>
                        <div className="flex items-center gap-2.5">
                            <IconTile tone="violet" size="md">
                                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M4 6h16M4 12h16M4 18h10" />
                                </svg>
                            </IconTile>
                            <div className="min-w-0">
                                <p className="text-[11.5px] font-extrabold tracking-tight text-slate-900 dark:text-white">Varian BOSP</p>
                                <p className="text-[9.5px] font-medium text-slate-400 dark:text-slate-500">Varian aktif</p>
                            </div>
                        </div>
                        <p className="mt-3 truncate text-[15px] font-extrabold tracking-tight text-slate-900 dark:text-white">
                            {activeTab}
                        </p>
                    </div>

                    <div className="sikas-card sikas-card-hover animate-rise p-4" style={{ animationDelay: '230ms' }}>
                        <div className="flex items-center gap-2.5">
                            <IconTile tone="peach" size="md">
                                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8V6m0 12v-2" />
                                    <circle cx="12" cy="12" r="9" />
                                </svg>
                            </IconTile>
                            <div className="min-w-0">
                                <p className="text-[11.5px] font-extrabold tracking-tight text-slate-900 dark:text-white">Penerimaan Dana</p>
                                <p className="text-[9.5px] font-medium text-slate-400 dark:text-slate-500">Tercatat tahun aktif</p>
                            </div>
                        </div>
                        <p className="mt-3 text-sikas-num text-[19px] font-extrabold tracking-tight text-slate-900 dark:text-white">
                            {penerimaanData.length}
                        </p>
                    </div>
                </div>

                {/* Info alert */}
                <div className="animate-rise" style={{ animationDelay: '270ms' }}>
                    <div className="flex items-start gap-3 rounded-[22px] border border-sky-200/70 bg-pastel-sky/70 p-4 dark:border-sky-400/20 dark:bg-sky/10">
                        <IconTile tone="sky" size="sm">
                            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                                <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </IconTile>
                        <p className="text-[11.5px] font-semibold leading-relaxed text-slate-700 dark:text-slate-200">
                            Laporkan minimal 50% belanja dana tahap 1 paling lambat 31 Agustus setiap tahun
                        </p>
                    </div>
                </div>

                {/* Daftar BKU per tahun (accordion) */}
                <div className="animate-rise" style={{ animationDelay: '310ms' }}>
                    <Surface
                        title={`BKU ${activeTab}`}
                        subtitle="Buka tahun anggaran untuk melihat Buku Kas Umum per bulan."
                        icon={
                            <IconTile tone="ink" size="sm">
                                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
                                    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
                                </svg>
                            </IconTile>
                        }
                        actions={<StatusBadge tone="info" dot={false} className="text-sikas-num">{penganggaranList?.length ?? 0}</StatusBadge>}
                    >
                        <div className="space-y-3">
                            {penganggaranList && penganggaranList.length > 0 ? (
                                penganggaranList.map((item: any) => (
                                    <YearAccordionItem
                                        key={item.id}
                                        item={item}
                                        months={months}
                                        statusPerTahun={statusPerTahun}
                                        activeTab={activeTab}
                                        onValidation={() => setIsValidationOpen(true)}
                                        onOpenArkasBkuModal={handleOpenArkasBkuModal}
                                        onOpenModal={(id: any) => {
                                            setCurrentPenganggaranId(id);
                                            setIsModalOpen(true);
                                            setShowCreateForm(false);
                                            reset();
                                            clearErrors();
                                            setData((data) => ({ ...data, penganggaran_id: id }));
                                            fetchPenerimaanData(id);
                                        }}
                                    />
                                ))
                            ) : (
                                <EmptyState
                                    className="border-0 bg-transparent py-10 dark:bg-transparent"
                                    icon={
                                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                        </svg>
                                    }
                                    title="Belum ada data penganggaran."
                                    description="Tambahkan data penganggaran terlebih dahulu untuk mulai mencatat BKU."
                                />
                            )}
                        </div>
                    </Surface>
                </div>
            </div>

            {/* Modal Penerimaan Dana */}
            <Modal show={isModalOpen} onClose={closeModal} maxWidth="2xl">
                <div className="relative overflow-visible rounded-[26px] bg-white dark:bg-[#15131F]">
                    {/* Layer efek blur dekoratif yang di-clip terpisah */}
                    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[26px]">
                        <div className="absolute -right-10 -top-16 h-40 w-40 rounded-full bg-brand-500/10 blur-3xl" />
                    </div>

                    <div className="relative flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5 dark:border-white/5">
                        <div className="flex items-center gap-3.5">
                            <IconTile tone="violet" size="lg">
                                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                                </svg>
                            </IconTile>
                            <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2.5">
                                    <h2 className="text-[15px] font-extrabold tracking-tight text-slate-900 dark:text-white">
                                        {showCreateForm ? 'Catat Penerimaan Dana' : 'Daftar Penerimaan Dana'}
                                    </h2>
                                    <StatusBadge tone="violet" dot={false}>Buku Kas Umum</StatusBadge>
                                </div>
                                <p className="mt-1 text-[11px] font-medium leading-relaxed text-slate-400 dark:text-slate-500">
                                    {showCreateForm
                                        ? 'Silakan lengkapi formulir di bawah ini untuk mencatat penerimaan dana BOSP.'
                                        : 'Histori dan pencatatan penerimaan dana BOSP pada tahun anggaran aktif.'}
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={closeModal}
                            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-500 dark:hover:bg-white/5 dark:hover:text-white"
                            aria-label="Tutup"
                        >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    <div className="px-6 py-5">
                        {!showCreateForm ? (
                            <>
                                {/* History List */}
                                <div className="mb-5 space-y-3">
                                    {penerimaanData.length > 0 ? (
                                        penerimaanData.map((item: any) => (
                                            <div key={item.id} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 transition hover:border-slate-200 dark:border-white/5 dark:bg-white/[0.02] dark:hover:border-white/10">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <h4 className="text-[13px] font-extrabold text-slate-900 dark:text-white">
                                                                {item.sumber_dana} {new Date(item.tanggal_terima).getFullYear()}
                                                            </h4>
                                                            <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[9px] font-extrabold text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20">
                                                                Tercatat
                                                            </span>
                                                        </div>
                                                        <p className="mt-1 flex items-center gap-1.5 text-[11px] font-medium text-slate-400 dark:text-slate-500">
                                                            <span>Diterima: {formatDate(item.tanggal_terima)}</span>
                                                        </p>
                                                    </div>
                                                    <div className="flex flex-col items-end">
                                                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Jumlah Diterima</span>
                                                        <span className="text-sikas-num text-[14px] font-extrabold text-slate-900 dark:text-white">
                                                            {formatCurrency(item.jumlah_dana)}
                                                        </span>
                                                    </div>
                                                </div>
                                                {item.saldo_awal && (
                                                    <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5 text-[11px] dark:border-white/5">
                                                        <span className="font-semibold text-slate-500 dark:text-slate-400">
                                                            Saldo Awal ({formatDate(item.tanggal_saldo_awal)})
                                                        </span>
                                                        <span className="text-sikas-num font-bold text-slate-700 dark:text-slate-200">
                                                            {formatCurrency(item.saldo_awal)}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        ))
                                    ) : (
                                        <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center dark:border-white/10">
                                            <p className="text-[12px] font-semibold text-slate-400 dark:text-slate-500">
                                                Belum ada data penerimaan dana yang tercatat.
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* Add Button Box */}
                                <button
                                    type="button"
                                    onClick={handleCreateClick}
                                    className="group flex w-full items-center gap-3.5 rounded-2xl border-2 border-dashed border-slate-200 p-4 text-left transition-all hover:border-brand-400 hover:bg-brand-50/40 dark:border-white/10 dark:hover:border-brand-500/30 dark:hover:bg-brand-500/5"
                                >
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 transition group-hover:bg-brand-500 group-hover:text-white dark:bg-white/5 dark:text-slate-300 dark:group-hover:bg-brand-500 dark:group-hover:text-white">
                                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                                        </svg>
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <h4 className="text-[12.5px] font-extrabold text-slate-900 transition group-hover:text-brand-600 dark:text-white dark:group-hover:text-brand-300">
                                            Tambah Penerimaan Tahap Berikutnya
                                        </h4>
                                        <p className="mt-0.5 text-[10.5px] font-medium text-slate-400 dark:text-slate-500">
                                            Klik untuk membuka formulir pencatatan dana masuk BKU.
                                        </p>
                                    </div>
                                </button>

                                <div className="mt-6 flex justify-end gap-2 border-t border-slate-100 pt-4 dark:border-white/5">
                                    <SecondaryButton onClick={closeModal}>Tutup</SecondaryButton>
                                </div>
                            </>
                        ) : (
                            /* Form View - Grouped Neo-Bento Panels */
                            <form onSubmit={submitPenerimaan} className="space-y-4">
                                {/* Panel 1: Sumber & Waktu Penerimaan */}
                                <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4 dark:border-white/5 dark:bg-white/[0.02]">
                                    <div className="mb-3.5 flex items-center gap-2">
                                        <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-pastel-lavender text-[10.5px] font-extrabold text-brand-600 dark:bg-brand-500/20 dark:text-brand-300">
                                            1
                                        </span>
                                        <h3 className="text-[12px] font-extrabold text-slate-900 dark:text-white">
                                            Sumber & Waktu Penerimaan
                                        </h3>
                                    </div>

                                    <div className="space-y-3.5">
                                        <div>
                                            <InputLabel htmlFor="sumber_dana" value="Sumber Dana" />
                                            <select
                                                id="sumber_dana"
                                                className="mt-1 block w-full rounded-xl border border-slate-200/90 bg-white px-3.5 py-2.5 text-[12px] font-semibold text-slate-800 shadow-sm transition focus:border-lime-400 focus:outline-none focus:ring-4 focus:ring-lime-200/60 dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:border-lime-400/70 dark:focus:ring-lime-400/10"
                                                value={data.sumber_dana}
                                                onChange={(e: any) => setData('sumber_dana', e.target.value)}
                                                required
                                            >
                                                <option value="">Pilih Sumber Dana</option>
                                                {sumberDanaOptions.map((opt: string) => (
                                                    <option key={opt} value={opt}>{opt}</option>
                                                ))}
                                            </select>
                                            <InputError message={errors.sumber_dana} className="mt-1.5" />
                                        </div>

                                        {data.sumber_dana && (
                                            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                                                <div>
                                                    <InputLabel htmlFor="tanggal_terima" value="Tanggal Terima" />
                                                    <DatePicker
                                                        value={data.tanggal_terima}
                                                        onChange={(date) => setData('tanggal_terima', date ? format(date, 'yyyy-MM-dd') : '')}
                                                        className="mt-1"
                                                        placeholder="Pilih Tanggal Terima"
                                                        minDate={penganggaranList?.find((p: any) => p.id === currentPenganggaranId)?.tahun_anggaran ? new Date(parseInt(penganggaranList.find((p: any) => p.id === currentPenganggaranId).tahun_anggaran), 0, 1) : undefined}
                                                        maxDate={penganggaranList?.find((p: any) => p.id === currentPenganggaranId)?.tahun_anggaran ? new Date(parseInt(penganggaranList.find((p: any) => p.id === currentPenganggaranId).tahun_anggaran), 11, 31) : undefined}
                                                        startMonth={penganggaranList?.find((p: any) => p.id === currentPenganggaranId)?.tahun_anggaran ? new Date(parseInt(penganggaranList.find((p: any) => p.id === currentPenganggaranId).tahun_anggaran), 0) : undefined}
                                                        endMonth={penganggaranList?.find((p: any) => p.id === currentPenganggaranId)?.tahun_anggaran ? new Date(parseInt(penganggaranList.find((p: any) => p.id === currentPenganggaranId).tahun_anggaran), 11) : undefined}
                                                    />
                                                    <InputError message={errors.tanggal_terima} className="mt-1.5" />
                                                </div>

                                                <div>
                                                    <InputLabel htmlFor="jumlah_dana" value="Jumlah Dana Diterima" />
                                                    <TextInput
                                                        id="jumlah_dana"
                                                        type="text"
                                                        className="mt-1 block w-full text-sikas-num text-[13px] font-bold"
                                                        value={data.jumlah_dana}
                                                        onChange={(e: any) => handleCurrencyChange(e, 'jumlah_dana')}
                                                        placeholder="Rp 0"
                                                        required
                                                    />
                                                    <InputError message={errors.jumlah_dana} className="mt-1.5" />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Panel 2: Saldo Awal / SiLPA (Khusus jika Tahap 1) */}
                                {data.sumber_dana && sumberDanaTahap1 && data.sumber_dana === sumberDanaTahap1 && (
                                    <div className="rounded-2xl border border-amber-200/70 bg-amber-50/50 p-4 dark:border-amber-500/20 dark:bg-amber-500/5">
                                        <div className="mb-3 flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-100 text-[10.5px] font-extrabold text-amber-700 dark:bg-amber-400/20 dark:text-amber-300">
                                                    2
                                                </span>
                                                <div>
                                                    <h3 className="text-[12px] font-extrabold text-slate-900 dark:text-white">
                                                        Saldo Awal / SiLPA (Khusus Tahap 1)
                                                    </h3>
                                                    <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
                                                        Pencatatan sisa saldo kas dari tahun anggaran sebelumnya jika ada.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                                            <div>
                                                <InputLabel htmlFor="tanggal_saldo_awal" value="Tanggal Saldo Awal" />
                                                <DatePicker
                                                    value={data.tanggal_saldo_awal}
                                                    onChange={(date) => setData('tanggal_saldo_awal', date ? format(date, 'yyyy-MM-dd') : '')}
                                                    className="mt-1"
                                                    placeholder="Pilih Tanggal Saldo Awal"
                                                    minDate={penganggaranList?.find((p: any) => p.id === currentPenganggaranId)?.tahun_anggaran ? new Date(parseInt(penganggaranList.find((p: any) => p.id === currentPenganggaranId).tahun_anggaran), 0, 1) : undefined}
                                                    maxDate={penganggaranList?.find((p: any) => p.id === currentPenganggaranId)?.tahun_anggaran ? new Date(parseInt(penganggaranList.find((p: any) => p.id === currentPenganggaranId).tahun_anggaran), 11, 31) : undefined}
                                                    startMonth={penganggaranList?.find((p: any) => p.id === currentPenganggaranId)?.tahun_anggaran ? new Date(parseInt(penganggaranList.find((p: any) => p.id === currentPenganggaranId).tahun_anggaran), 0) : undefined}
                                                    endMonth={penganggaranList?.find((p: any) => p.id === currentPenganggaranId)?.tahun_anggaran ? new Date(parseInt(penganggaranList.find((p: any) => p.id === currentPenganggaranId).tahun_anggaran), 11) : undefined}
                                                />
                                                <InputError message={errors.tanggal_saldo_awal} className="mt-1.5" />
                                            </div>

                                            <div>
                                                <InputLabel htmlFor="saldo_awal" value="Jumlah Saldo Awal" />
                                                <TextInput
                                                    id="saldo_awal"
                                                    type="text"
                                                    className="mt-1 block w-full text-sikas-num text-[13px] font-bold"
                                                    value={data.saldo_awal}
                                                    onChange={(e: any) => handleCurrencyChange(e, 'saldo_awal')}
                                                    placeholder="Rp 0"
                                                />
                                                <InputError message={errors.saldo_awal} className="mt-1.5" />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Footer Form */}
                                <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4 dark:border-white/5">
                                    <SecondaryButton type="button" onClick={handleBackToList} disabled={processing}>
                                        Kembali
                                    </SecondaryButton>
                                    <PrimaryButton type="submit" disabled={processing} className={processing ? 'opacity-25' : ''}>
                                        {processing ? 'Menyimpan...' : 'Simpan Penerimaan'}
                                    </PrimaryButton>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            </Modal>

            {/* Modal Validasi Tahap 2 */}
            <Modal show={isValidationOpen} onClose={() => setIsValidationOpen(false)} maxWidth="md">
                <div className="relative overflow-hidden bg-white dark:bg-[#15131F]">
                    <div className="pointer-events-none absolute -right-10 -top-16 h-44 w-44 rounded-full bg-rose-500/15 blur-3xl" />
                    <div className="relative flex items-start justify-between gap-3 border-b border-slate-100 px-6 py-4 dark:border-white/5">
                        <div className="flex items-center gap-3">
                            <IconTile tone="rose" size="lg">
                                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </IconTile>
                            <div className="min-w-0">
                                <h2 className="text-[14px] font-extrabold tracking-tight text-slate-900 dark:text-white">Penerimaan Dana Tahap 2 Belum Ada</h2>
                                <p className="mt-0.5 text-[10px] font-medium text-slate-400 dark:text-slate-500">Validasi BKU bulan Juli</p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => setIsValidationOpen(false)}
                            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-500 dark:hover:bg-white/5 dark:hover:text-white"
                            aria-label="Tutup"
                        >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                    <div className="space-y-4 px-6 py-5">
                        <p className="text-[11.5px] font-medium leading-relaxed text-slate-500 dark:text-slate-400">
                            Silahkan Isi Penerimaan Dana Tahap 2 Terlebih Dahulu Untuk Masuk Pada Bku Bulan Juli
                        </p>
                    </div>
                    <div className="flex justify-end border-t border-slate-100 px-6 py-4 dark:border-white/5">
                        <PrimaryButton onClick={() => setIsValidationOpen(false)}>
                            Mengerti
                        </PrimaryButton>
                    </div>
                </div>
            </Modal>

            {/* Modal Tarik BKU dari ARKAS (Tahunan) */}
            <Modal show={isArkasBkuModalOpen} onClose={() => !pullingBku && setIsArkasBkuModalOpen(false)} maxWidth="2xl">
                <div className="relative overflow-hidden bg-white dark:bg-[#15131F]">
                    <div className="pointer-events-none absolute -right-10 -top-16 h-40 w-40 rounded-full bg-mint/10 blur-3xl" />
                    <div className="relative flex items-start justify-between gap-3 border-b border-slate-100 px-6 py-4 dark:border-white/5">
                        <div className="flex items-center gap-3">
                            <IconTile tone="mint" size="lg">
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                            </IconTile>
                            <div className="min-w-0">
                                <h2 className="text-[14px] font-extrabold tracking-tight text-slate-900 dark:text-white">
                                    Tarik Buku Kas Umum (BKU) dari ARKAS
                                </h2>
                                <p className="mt-0.5 text-[10px] font-medium text-slate-400 dark:text-slate-500">
                                    Tahun Anggaran {arkasBkuYear} • {activeTab}
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => !pullingBku && setIsArkasBkuModalOpen(false)}
                            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-500 dark:hover:bg-white/5 dark:hover:text-white"
                            aria-label="Tutup"
                        >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    <div className="px-6 py-5">
                        {arkasBkuLoading ? (
                            <div className="flex flex-col items-center justify-center gap-3 py-12">
                                <div className="h-9 w-9 animate-spin rounded-full border-4 border-mint border-t-transparent"></div>
                                <p className="text-[11.5px] font-medium text-slate-500 dark:text-slate-400">
                                    Memeriksa data BKU di database ARKAS...
                                </p>
                            </div>
                        ) : arkasBkuData?.status === 'error' || !arkasBkuData?.exists ? (
                            <div className="py-8 text-center">
                                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-pastel-amber text-amber-600 dark:bg-amber-400/10 dark:text-amber-300">
                                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                </div>
                                <h4 className="mb-1 text-[13px] font-extrabold text-slate-900 dark:text-white">
                                    Data BKU ARKAS Tidak Ditemukan
                                </h4>
                                <p className="mx-auto max-w-md text-[11px] font-medium text-slate-500 dark:text-slate-400">
                                    {arkasBkuData?.message || `Tidak ditemukan catatan transaksi BKU untuk Tahun ${arkasBkuYear} pada database ARKAS.`}
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {/* Ringkasan Data ARKAS */}
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                    <div className="rounded-2xl border border-mint/20 bg-pastel-mint/60 p-3.5 dark:border-mint/20 dark:bg-mint/10">
                                        <span className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-mint">Penerimaan Dana</span>
                                        <div className="mt-1 text-sikas-num text-[13px] font-extrabold text-slate-900 dark:text-white">
                                            {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(arkasBkuData.arkas_data.nominal_penerimaan || 0)}
                                        </div>
                                        <div className="mt-0.5 text-[9.5px] font-semibold text-mint dark:text-mint">
                                            {arkasBkuData.arkas_data.total_penerimaan || 0} kali penerimaan
                                        </div>
                                    </div>
                                    <div className="rounded-2xl border border-sky/20 bg-pastel-sky/60 p-3.5 dark:border-sky/20 dark:bg-sky/10">
                                        <span className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-sky">Tarik Tunai</span>
                                        <div className="mt-1 text-sikas-num text-[13px] font-extrabold text-slate-900 dark:text-white">
                                            {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(arkasBkuData.arkas_data.nominal_penarikan || 0)}
                                        </div>
                                        <div className="mt-0.5 text-[9.5px] font-semibold text-sky dark:text-sky">
                                            {arkasBkuData.arkas_data.total_penarikan || 0} transaksi tarik
                                        </div>
                                    </div>
                                    <div className="rounded-2xl border border-brand-500/20 bg-pastel-lavender/60 p-3.5 dark:border-brand-400/20 dark:bg-brand-500/10">
                                        <span className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-brand-600 dark:text-brand-300">Belanja Kas</span>
                                        <div className="mt-1 text-sikas-num text-[13px] font-extrabold text-slate-900 dark:text-white">
                                            {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(arkasBkuData.arkas_data.nominal_belanja || 0)}
                                        </div>
                                        <div className="mt-0.5 text-[9.5px] font-semibold text-brand-600 dark:text-brand-300">
                                            {arkasBkuData.arkas_data.total_nota_belanja || 0} nota ({arkasBkuData.arkas_data.total_item_belanja || 0} item)
                                        </div>
                                    </div>
                                </div>

                                {/* Status Tutup Buku Bulan */}
                                {arkasBkuData.arkas_data.closed_months && arkasBkuData.arkas_data.closed_months.length > 0 && (
                                    <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-3.5 dark:border-white/5 dark:bg-white/[0.02]">
                                        <span className="mb-2 block text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                                            Status Tutup Buku di ARKAS:
                                        </span>
                                        <div className="flex flex-wrap gap-1.5">
                                            {arkasBkuData.arkas_data.closed_months.map((m: string) => (
                                                <span key={m} className="inline-flex items-center rounded-full bg-pastel-mint px-2.5 py-1 text-[9.5px] font-extrabold text-mint dark:bg-mint/10 dark:text-mint">
                                                    ✓ {m} Ditutup
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Warning jika RKAS belum ada */}
                                {!arkasBkuData.has_rkas && (
                                    <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-pastel-rose/70 p-4 dark:border-rose-400/20 dark:bg-rose-500/10">
                                        <div className="mt-0.5 shrink-0 text-rose-600 dark:text-rose-400">
                                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                            </svg>
                                        </div>
                                        <div className="text-[11px] font-medium text-rose-700 dark:text-rose-300">
                                            <span className="mb-0.5 block font-extrabold">Data RKAS Belum Tersedia di newSIKAS</span>
                                            Penarikan BKU mewajibkan RKAS di newSIKAS sudah terisi untuk mencocokkan rincian belanja. Silakan lakukan penarikan RKAS terlebih dahulu pada menu Penganggaran.
                                        </div>
                                    </div>
                                )}

                                {/* Info Mode Sinkronisasi Aman jika sudah ada data BKU */}
                                {arkasBkuData.has_existing_data && (
                                    <div className="space-y-2 rounded-2xl border border-mint/30 bg-pastel-mint/70 p-4 dark:border-mint/20 dark:bg-mint/10">
                                        <div className="flex items-start gap-3">
                                            <div className="mt-0.5 shrink-0 text-mint">
                                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                            </div>
                                            <div className="text-[11px] font-medium text-slate-700 dark:text-slate-200">
                                                <span className="mb-0.5 block font-extrabold text-emerald-800 dark:text-mint">Mode Sinkronisasi Aman (Data SIKAS Terlindungi)</span>
                                                Di newSIKAS saat ini sudah tercatat <strong>{arkasBkuData.existing_counts.total} transaksi BKU</strong> pada tahun {arkasBkuYear} (termasuk {arkasBkuData.existing_counts.belanja} belanja, {arkasBkuData.existing_counts.penerimaan} penerimaan). Bulan yang sudah terisi <strong>TIDAK akan dihapus atau ditimpa</strong> ID Transaksi maupun Uraian SIKAS-nya (hanya disandingkan dengan ID/Nota/Uraian ARKAS), sedangkan bulan yang masih kosong akan diimpor secara otomatis.
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-100 px-6 py-4 sm:flex-row dark:border-white/5">
                        <button
                            type="button"
                            onClick={() => {
                                setIsArkasBkuModalOpen(false);
                                setIsArkasAiModalOpen(true);
                            }}
                            className="inline-flex w-full items-center justify-center gap-1.5 rounded-2xl border border-brand-500/20 bg-pastel-lavender px-3.5 py-2.5 text-[10.5px] font-extrabold text-brand-600 transition hover:bg-brand-200/60 sm:w-auto dark:border-brand-400/20 dark:bg-brand-500/10 dark:text-brand-300 dark:hover:bg-brand-500/15"
                        >
                            <Brain className="h-4 w-4 text-brand-600 dark:text-brand-300" />
                            Analisis Selisih AI (DeepSeek)
                        </button>
                        <div className="flex w-full items-center justify-end gap-2 sm:w-auto">
                            <SecondaryButton onClick={() => setIsArkasBkuModalOpen(false)} disabled={pullingBku}>
                                Batal
                            </SecondaryButton>
                            {arkasBkuData?.exists && arkasBkuData?.has_rkas && (
                                <button
                                    onClick={handleExecutePullArkasBku}
                                    disabled={pullingBku}
                                    className={`inline-flex items-center justify-center rounded-2xl px-5 py-2.5 text-[11px] font-extrabold uppercase tracking-wider shadow-sm transition-all duration-150 ${
                                        pullingBku
                                            ? 'cursor-not-allowed bg-slate-100 text-slate-400 opacity-70 dark:bg-white/5 dark:text-slate-500'
                                            : 'bg-lime-400 text-slate-950 shadow-lime hover:-translate-y-0.5 hover:bg-lime-300 focus:outline-none focus:ring-2 focus:ring-lime-500 focus:ring-offset-2'
                                    }`}
                                >
                                    {pullingBku ? (
                                        <>
                                            <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                                            Menarik BKU...
                                        </>
                                    ) : (
                                        <>
                                            <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                            </svg>
                                            {arkasBkuData.has_existing_data ? 'Tarik & Sandingkan BKU' : 'Tarik BKU Sekarang'}
                                        </>
                                    )}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </Modal>

            {/* Modal Diagnosa & Rekonsiliasi AI ARKAS (Tahunan) */}
            <ArkasDiagnosticModal
                isOpen={isArkasAiModalOpen}
                onClose={() => {
                    setIsArkasAiModalOpen(false);
                    setIsArkasBkuModalOpen(true);
                }}
                onProceedWithAction={() => {
                    setIsArkasAiModalOpen(false);
                    setIsArkasBkuModalOpen(true);
                }}
                actionButtonLabel="Lanjutkan ke Tarik BKU"
                tahun={arkasBkuYear || tahun || 2026}
                scope="comprehensive"
            />
        </AuthenticatedLayout>
    );
}


const YearAccordionItem = ({ item, months, statusPerTahun, activeTab, onOpenModal, onValidation, onOpenArkasBkuModal }: any) => {
    const vroute = useVariantRoute();
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        const currentYear = new Date().getFullYear();
        if (parseInt(item.tahun_anggaran) === currentYear) {
            setIsOpen(true);
        }
    }, [item.tahun_anggaran]);

    const tahap2Months = ['Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

    return (
        <div className="sikas-card overflow-hidden">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition-colors hover:bg-slate-50/70 dark:hover:bg-white/[0.03]"
                aria-expanded={isOpen}
            >
                <div className="flex items-center gap-3">
                    <IconTile tone="sky" size="sm">
                        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                            <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                    </IconTile>
                    <span className="text-[12.5px] font-extrabold tracking-tight text-slate-800 dark:text-slate-100">
                        BKU Tahun Anggaran {item.tahun_anggaran}
                    </span>
                </div>
                <div className={`text-slate-400 transition-transform duration-200 dark:text-slate-500 ${isOpen ? 'rotate-180' : ''}`}>
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </div>
            </button>

            <div className={`transition-all duration-300 ease-in-out ${isOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 overflow-hidden opacity-0'}`}>
                <div className="border-t border-slate-100 p-4 dark:border-white/5">

                    {/* Header with Buttons INSIDE Accordion */}
                    <div className="mb-4 flex flex-col items-start justify-between gap-3 md:flex-row md:items-center">
                        <h4 className="hidden text-lg font-bold text-slate-800 dark:text-slate-100 md:block">
                        </h4>
                        <div className="flex w-full flex-wrap items-center gap-2 md:w-auto">
                            <button
                                onClick={() => onOpenArkasBkuModal(item.id, item.tahun_anggaran)}
                                className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-pastel-mint px-4 py-2.5 text-[11px] font-extrabold text-emerald-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-emerald-100 md:flex-none dark:border-emerald-400/20 dark:bg-mint/10 dark:text-emerald-300 dark:hover:bg-mint/15"
                            >
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                                Tarik BKU dari ARKAS
                            </button>
                            <Link
                                href={vroute('penatausahaan.rekapitulasi', { tahun: item.tahun_anggaran, bulan: 'januari' })}
                                className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-[11px] font-extrabold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50 md:flex-none dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
                            >
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                </svg>
                                Cetak
                            </Link>
                            <button
                                onClick={() => onOpenModal(item.id)}
                                className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-lime-400 px-4 py-2.5 text-[11px] font-extrabold text-slate-950 shadow-lime transition hover:-translate-y-0.5 hover:bg-lime-300 md:flex-none"
                            >
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                Tambah Penerimaan Dana
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        {months.map((month: any, monthIndex: number) => {
                            const status = statusPerTahun?.[item.tahun_anggaran]?.[month] || 'disabled'; // Default to disabled if unknown
                            const isDisabled = status === 'disabled';

                            const isTahap2 = tahap2Months.includes(month);

                            const handleClick = (e: any) => {
                                if (isDisabled) {
                                    e.preventDefault();
                                    return;
                                }
                                if (isTahap2 && !item.has_tahap_2) {
                                    e.preventDefault();
                                    onValidation();
                                }
                            };

                            return (
                                <Link
                                    key={month}
                                    href={isDisabled ? '#' : vroute('penatausahaan.bku', { tahun: item.tahun_anggaran, bulan: month })}
                                    className={`group relative flex flex-col items-center justify-center rounded-2xl border p-4 transition-all duration-200 ${
                                        isDisabled
                                            ? 'cursor-not-allowed border-slate-100 bg-slate-50/60 opacity-60 grayscale dark:border-white/5 dark:bg-white/[0.02]'
                                            : 'border-slate-100 bg-white shadow-sm hover:-translate-y-0.5 hover:border-lime-300 hover:shadow-card-hover dark:border-white/10 dark:bg-white/5 dark:hover:border-lime-400/30'
                                    }`}
                                    onClick={handleClick}
                                >
                                    <div className="mb-2 flex items-center gap-2">
                                        <div className={`rounded-xl p-1.5 transition-colors ${
                                            isDisabled
                                                ? 'bg-slate-100 text-slate-400 dark:bg-white/5 dark:text-slate-500'
                                                : 'bg-slate-50 text-slate-500 group-hover:text-lime-600 dark:bg-white/5 dark:text-slate-400 dark:group-hover:text-lime-300'
                                        }`}>
                                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                        </div>
                                        <span className={`text-[11.5px] font-bold transition-colors ${
                                            isDisabled
                                                ? 'text-slate-400 dark:text-slate-500'
                                                : 'text-slate-700 group-hover:text-slate-900 dark:text-slate-200 dark:group-hover:text-white'
                                        }`}>
                                            {month}
                                        </span>
                                    </div>

                                    {status === 'closed' && (
                                        <StatusBadge tone="success" dot={false}>Selesai</StatusBadge>
                                    )}
                                    {status === 'lapor_pajak' && (
                                        <StatusBadge tone="danger" dot={false}>Belum Lapor Pajak</StatusBadge>
                                    )}
                                    {status === 'draft' && (
                                        <StatusBadge tone="warning" dot={false}>Draft</StatusBadge>
                                    )}
                                    {status === 'empty' && (
                                        <StatusBadge tone="info" dot={false}>Belum di isi</StatusBadge>
                                    )}
                                    {status === 'disabled' && (
                                        <StatusBadge tone="neutral" dot={false}>Terkunci</StatusBadge>
                                    )}
                                </Link>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};

