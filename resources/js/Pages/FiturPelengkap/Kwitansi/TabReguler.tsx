import React, { useState, useEffect, FormEventHandler } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import axios from 'axios';
import Modal from '@/Components/Modal';
import SecondaryButton from '@/Components/SecondaryButton';
import DangerButton from '@/Components/DangerButton';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import InputLabel from '@/Components/InputLabel';
import InputError from '@/Components/InputError';
import PrintSettingsModal, { PrintSettings } from '@/Components/PrintSettingsModal';
import PdfPreviewModal from '@/Components/PdfPreviewModal';
import Dropdown from '@/Components/Dropdown';
import DatePicker from '@/Components/DatePicker';
import { format } from 'date-fns';
import {
    BuiltInKwitansiFormat,
    CustomKwitansiTemplate,
    KwitansiFormat,
    KwitansiRowActions,
    KwitansiSelect,
    KwitansiVariableGroup,
    parseCustomTemplateId,
} from './components/KwitansiSelect';
import KwitansiTemplateModal from './components/KwitansiTemplateModal';
import DataTable from '@/Components/ui/DataTable';
import EmptyState from '@/Components/ui/EmptyState';
import FilterBar from '@/Components/ui/FilterBar';
import IconTile from '@/Components/ui/IconTile';
import { SkeletonRows } from '@/Components/ui/Skeleton';
import StatusBadge from '@/Components/ui/StatusBadge';
import Surface from '@/Components/ui/Surface';
import useVariantRoute from '@/Hooks/useVariantRoute';

// Check if route is defined globally (Ziggy)
declare const route: (name: string, params?: any, absolute?: boolean) => string;

interface KwitansiData {
    id: number;
    number: number;
    kode_rekening: string;
    uraian: string;
    tanggal: string;
    jumlah: string;
    preview_url: string;
    preview_url_2: string;
    preview_url_3: string;
    preview_url_4: string;
    pdf_url: string;
    pdf_url_2: string;
    pdf_url_3: string;
    pdf_url_4: string;
    delete_data: {
        id: number;
        uraian: string;
    }
}

interface PaginationData {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    has_more: boolean;
}

interface FilterState {
    search: string;
    tahun: string;
    start_date: string;
    end_date: string;
}

interface YearData {
    id: number;
    tahun: string;
}

export default function TabReguler({ auth }: { auth: any }) {
    const vroute = useVariantRoute();
    const pageAuth = usePage<any>().props?.auth ?? auth;
    const canManageTemplates =
        pageAuth?.permissions?.modules?.kwitansi === 'write' ||
        (pageAuth?.permissions == null && Boolean(pageAuth?.user?.is_bendahara));

    const [kwitansis, setKwitansis] = useState<KwitansiData[]>([]);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState<Partial<PaginationData>>({});
    const [filters, setFilters] = useState<FilterState>({
        search: '',
        tahun: '',
        start_date: '',
        end_date: ''
    });

    // Custom PHPWord Template state
    const [customTemplates, setCustomTemplates] = useState<CustomKwitansiTemplate[]>([]);
    const [variableCatalog, setVariableCatalog] = useState<KwitansiVariableGroup[]>([]);
    const [libreOfficeAvailable, setLibreOfficeAvailable] = useState(true);
    const [showTemplateModal, setShowTemplateModal] = useState(false);

    // Stats state
    const [stats, setStats] = useState({
        total: 0,
        available: 0,
        pending: 0,
        failed: 0
    });

    const [availableYears, setAvailableYears] = useState<YearData[]>([]);

    // Modal States
    const [confirmingBatchGenerate, setConfirmingBatchGenerate] = useState(false);
    const [confirmingDeleteAll, setConfirmingDeleteAll] = useState(false);
    const [confirmingDownload, setConfirmingDownload] = useState(false);
    // Print Settings Modal State
    const [showPrintSettings, setShowPrintSettings] = useState(false);
    const [selectedKwitansiId, setSelectedKwitansiId] = useState<number | null>(null);
    const [selectedKwitansiType, setSelectedKwitansiType] = useState<BuiltInKwitansiFormat>(1);

    // PDF Preview Modal State
    const [showPreviewModal, setShowPreviewModal] = useState(false);
    const [previewUrl, setPreviewUrl] = useState('');

    const [deleteError, setDeleteError] = useState('');
    const [processing, setProcessing] = useState(false);
    const [generateResult, setGenerateResult] = useState<{ success: number, failed: number } | null>(null);

    // Download Settings
    const [downloadSettings, setDownloadSettings] = useState({
        paperSize: 'Folio', // Default
        fontSize: '11pt'    // Default
    });

    // Generate Modal State
    const [generateYear, setGenerateYear] = useState<string>('');
    const [generateCount, setGenerateCount] = useState<number>(0);

    useEffect(() => {
        if (confirmingBatchGenerate && generateYear) {
            fetchGenerateCount(generateYear);
        }
    }, [confirmingBatchGenerate, generateYear]);

    const fetchGenerateCount = async (year: string) => {
        try {
            const response = await axios.get(vroute('api.kwitansi.check-available'), {
                params: { tahun: year }
            });
            if (response.data.success) {
                setGenerateCount(response.data.data.available_count);
            }
        } catch (error) {
            console.error('Error fetching generate count:', error);
        }
    };

    useEffect(() => {
        fetchYears();
        fetchStats();
        fetchCustomTemplates();
    }, []);

    const fetchCustomTemplates = async () => {
        try {
            const response = await axios.get(route('api.kwitansi.templates.index'));
            if (response.data?.success) {
                setCustomTemplates(response.data.data ?? []);
                setVariableCatalog(response.data.variable_catalog ?? []);
                setLibreOfficeAvailable(Boolean(response.data.libreoffice_available));
            }
        } catch (error) {
            console.error('Error fetching custom kwitansi templates:', error);
        }
    };

    // Debounce search
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            fetchData();
        }, 500);
        return () => clearTimeout(timeoutId);
    }, [filters]);

    const fetchYears = async () => {
        try {
            const response = await axios.get(vroute('api.kwitansi.tahun'));
            if (response.data.success) {
                setAvailableYears(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching years:', error);
        }
    };

    const fetchStats = async () => {
        try {
            const responseAvail = await axios.get(vroute('api.kwitansi.check-available'));
            if (responseAvail.data.success) {
                setStats(prev => ({
                    ...prev,
                    available: responseAvail.data.data.available_count
                }));
            }
            const responseDebug = await axios.get(vroute('api.kwitansi.debug-count'));
            if (responseDebug.data.success) {
                setStats(prev => ({
                    ...prev,
                    total: responseDebug.data.data.with_kwitansi
                }));
            }
        } catch (error) {
            console.error('Error fetching stats:', error);
        }
    };

    const fetchData = async (page = 1) => {
        setLoading(true);
        try {
            const response = await axios.get(vroute('api.kwitansi.search'), {
                params: {
                    page: page,
                    ...filters
                }
            });

            if (response.data.success) {
                setKwitansis(response.data.data);
                setPagination(response.data.pagination);
            }
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleFilterChange = (key: keyof FilterState, value: string) => {
        setFilters(prev => ({
            ...prev,
            [key]: value
        }));
    };

    const handleReset = () => {
        setFilters({
            search: '',
            tahun: '',
            start_date: '',
            end_date: ''
        });
    };

    // --- Modal Handlers ---

    const startGenerateBatch = () => {
        const initialYear = filters.tahun || (availableYears.length > 0 ? availableYears[0].id.toString() : '');
        setGenerateYear(initialYear);
        setGenerateResult(null);
        setConfirmingBatchGenerate(true);
    };

    // Progress State
    const [progress, setProgress] = useState(0);
    const [progressStatus, setProgressStatus] = useState('');

    // ...

    const processGenerateBatch = async () => {
        setProcessing(true);
        setProgress(0);
        setProgressStatus('Memulai proses...');

        let processedTotal = 0;
        let successTotal = 0;
        let failedTotal = 0;
        let currentOffset = 0;
        const BATCH_SIZE = 20;

        try {
            // First check total to allow proper progress calculation
            const initialCheck = await axios.get(vroute('api.kwitansi.check-available'), {
                params: { tahun: generateYear }
            });
            const totalToProcess = initialCheck.data.data.available_count;

            if (totalToProcess === 0) {
                setConfirmingBatchGenerate(false);
                return;
            }

            let hasMore = true;

            while (hasMore) {
                const response = await axios.post(vroute('kwitansi.generate-batch'), {
                    limit: BATCH_SIZE,
                    offset: currentOffset,
                    tahun: generateYear
                });

                const data = response.data.data;
                const processedInBatch = data.processed;

                if (processedInBatch === 0) {
                    hasMore = false;
                    break;
                }

                processedTotal += processedInBatch;
                successTotal += data.success;
                const batchFailed = data.failed;
                failedTotal += batchFailed;

                // CRITICAL: Offset by failed count to skip them
                currentOffset += batchFailed;

                const currentProgress = Math.min(Math.round(((processedTotal) / totalToProcess) * 100), 100);
                setProgress(currentProgress);
                setProgressStatus(`Memproses ${processedTotal} dari ${totalToProcess} data... (Gagal: ${failedTotal})`);

                if (processedInBatch < BATCH_SIZE || processedTotal >= totalToProcess + failedTotal) { // Rough check for end
                    if (processedInBatch < BATCH_SIZE) hasMore = false;
                }

                // Secondary safety break
                if (processedTotal > totalToProcess * 2) hasMore = false;

                // Small delay to allow UI update
                await new Promise(r => setTimeout(r, 100));
            }

            setProgressStatus(`Selesai! Berhasil: ${successTotal}, Gagal: ${failedTotal}`);
            setProgress(100);

            await new Promise(r => setTimeout(r, 1500));

            setConfirmingBatchGenerate(false);
            fetchData();
            fetchStats();

        } catch (error) {
            console.error('Error generating batch:', error);
            setProgressStatus('Terjadi kesalahan!');
        } finally {
            setProcessing(false);
            setProgress(0);
        }
    };

    const startDeleteAll = () => {
        setDeleteError('');
        setConfirmingDeleteAll(true);
    };

    const processDeleteAll = async (e: React.FormEvent) => {
        e.preventDefault();

        setProcessing(true);
        try {
            const response = await axios.delete(vroute('kwitansi.delete-all'));
            if (response.data.success) {
                setConfirmingDeleteAll(false);
                fetchData();
                fetchStats();
            }
        } catch (error) {
            setDeleteError('Gagal menghapus data.');
        } finally {
            setProcessing(false);
        }
    };

    const startDownloadAll = () => {
        setConfirmingDownload(true);
    };

    const processDownloadAll = (mode: 'current' | 'year', type: 1 | 2 | 3 | 4) => {
        const params = new URLSearchParams();

        if (mode === 'current') {
            // Use all active filters
            Object.entries(filters).forEach(([key, value]) => {
                if (value) params.append(key, value);
            });
        }

        // Add PDF Settings
        params.append('paper_size', downloadSettings.paperSize);
        params.append('font_size', downloadSettings.fontSize);

        let targetUrl = vroute('kwitansi.download-all');
        if (type === 2) targetUrl = vroute('kwitansi.download-all2');
        if (type === 3) targetUrl = vroute('kwitansi.download-all3');
        if (type === 4) targetUrl = vroute('kwitansi.download-all4');
        window.open(`${targetUrl}?${params.toString()}`, '_blank');
        setConfirmingDownload(false);
    };

    const processDownloadAllCustom = (templateId: number, output: 'docx' | 'pdf') => {
        const params = new URLSearchParams();
        Object.entries(filters).forEach(([key, value]) => {
            if (value) params.append(key, value);
        });
        params.append('output', output);

        const targetUrl = vroute('kwitansi.custom.download-all', templateId);
        window.open(`${targetUrl}?${params.toString()}`, '_blank');
        setConfirmingDownload(false);
    };

    const handlePrintClick = (id: number, type: KwitansiFormat) => {
        const customTemplateId = parseCustomTemplateId(type);
        if (customTemplateId !== null) {
            if (!libreOfficeAvailable) return;
            window.open(vroute('kwitansi.custom.pdf', [id, customTemplateId]), '_blank');
            return;
        }

        if (typeof type !== 'number') return;

        setSelectedKwitansiId(id);
        setSelectedKwitansiType(type);
        setShowPrintSettings(true);
    };

    const handleDownloadCustomDocx = (id: number, templateId: number) => {
        window.open(vroute('kwitansi.custom.docx', [id, templateId]), '_blank');
    };

    const handlePreviewCustom = (id: number, templateId: number) => {
        if (!libreOfficeAvailable) return;
        setPreviewUrl(vroute('kwitansi.custom.preview', [id, templateId]));
        setShowPreviewModal(true);
    };

    const processPrint = (settings: PrintSettings) => {
        if (selectedKwitansiId) {
            let baseUrl = vroute('kwitansi.pdf', selectedKwitansiId);
            if (selectedKwitansiType === 2) baseUrl = vroute('kwitansi.pdf2', selectedKwitansiId);
            if (selectedKwitansiType === 3) baseUrl = vroute('kwitansi.pdf3', selectedKwitansiId);
            if (selectedKwitansiType === 4) baseUrl = vroute('kwitansi.pdf4', selectedKwitansiId);
            
            const params = new URLSearchParams({
                paper_size: settings.paperSize,
                font_size: settings.fontSize,
                orientation: settings.orientation
            });
            window.open(`${baseUrl}?${params.toString()}`, '_blank');
        }
    };

    const handlePreviewClick = (url: string) => {
        setPreviewUrl(url);
        setShowPreviewModal(true);
    };

    const closeModal = () => {
        setConfirmingBatchGenerate(false);
        setConfirmingDeleteAll(false);
        setConfirmingDownload(false);
        setShowPrintSettings(false);
        setShowPreviewModal(false);
        setProcessing(false);
        setDeleteError('');
    };

    return (
        <>
            <div className="space-y-4">
                {/* Toolbar aksi */}
                <div className="animate-rise" style={{ animationDelay: '60ms' }}>
                    <Surface padding="sm">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5">
                                <IconTile tone="lime" size="sm">
                                    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M12 3v2M12 19v2M5 12H3M21 12h-2" />
                                        <circle cx="12" cy="12" r="4" />
                                        <path d="m8.5 4.5 1 1.7M14.5 18l1-1.7M4.5 8.5l1.7 1M18 14.5l-1.7 1" />
                                    </svg>
                                </IconTile>
                                <div>
                                    <p className="text-[11.5px] font-extrabold tracking-tight text-slate-900 dark:text-white">Aksi Kwitansi</p>
                                    <p className="text-[9.5px] font-medium text-slate-400 dark:text-slate-500">Generate, unduh, atau bersihkan data kwitansi.</p>
                                </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                <button onClick={startGenerateBatch} disabled={stats.available === 0} className={`inline-flex items-center gap-1.5 rounded-2xl px-3.5 py-2.5 text-[11px] font-extrabold transition ${stats.available === 0 ? 'cursor-not-allowed bg-slate-100 text-slate-400 dark:bg-white/5 dark:text-slate-600' : 'bg-lime-400 text-slate-950 shadow-lime hover:-translate-y-0.5 hover:bg-lime-300'}`}>
                                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path></svg>
                                    Generate Otomatis
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowTemplateModal(true)}
                                    className="inline-flex items-center gap-1.5 rounded-2xl border border-brand-500/20 bg-pastel-lavender/80 px-3.5 py-2.5 text-[11px] font-extrabold text-brand-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-pastel-lavender dark:border-brand-400/25 dark:bg-brand-500/15 dark:text-brand-200 dark:hover:bg-brand-500/25"
                                >
                                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                                    Template Kustom
                                    {customTemplates.length > 0 && (
                                        <span className="rounded-full bg-brand-600 px-1.5 py-0.5 text-[9.5px] font-black text-white dark:bg-lime-400 dark:text-slate-950">
                                            {customTemplates.length}
                                        </span>
                                    )}
                                </button>
                                <button onClick={startDownloadAll} className="inline-flex items-center gap-1.5 rounded-2xl bg-slate-900 px-3.5 py-2.5 text-[11px] font-extrabold text-white shadow-pill transition hover:-translate-y-0.5 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100">
                                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                                    Download All
                                </button>
                                <button onClick={startDeleteAll} className="inline-flex items-center gap-1.5 rounded-2xl border border-rose-200 bg-pastel-rose px-3.5 py-2.5 text-[11px] font-extrabold text-rose-600 transition hover:-translate-y-0.5 hover:bg-rose-100 dark:border-rose-400/20 dark:bg-rose-500/10 dark:text-rose-300 dark:hover:bg-rose-500/15">
                                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                    Hapus Semua
                                </button>
                            </div>
                        </div>
                    </Surface>
                </div>

                {/* Filter */}
                <div className="relative z-20 animate-rise" style={{ animationDelay: '120ms' }}>
                    <Surface padding="sm" overflowVisible>
                        <FilterBar
                            end={
                                <SecondaryButton type="button" onClick={handleReset}>
                                    Reset
                                </SecondaryButton>
                            }
                        >
                            <div className="grid w-full grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                                <div>
                                    <InputLabel value="Mulai" />
                                    <DatePicker
                                        value={filters.start_date}
                                        onChange={(date) => handleFilterChange('start_date', date ? format(date, 'yyyy-MM-dd') : '')}
                                        placeholder="Pilih Tanggal"
                                    />
                                </div>
                                <div>
                                    <InputLabel value="Akhir" />
                                    <DatePicker
                                        value={filters.end_date}
                                        onChange={(date) => handleFilterChange('end_date', date ? format(date, 'yyyy-MM-dd') : '')}
                                        placeholder="Pilih Tanggal"
                                    />
                                </div>
                                <div className="xl:col-span-2">
                                    <InputLabel value="Pencarian" />
                                    <TextInput
                                        type="text"
                                        placeholder="Cari uraian, kode rekening, tanggal..."
                                        value={filters.search}
                                        onChange={(e) => handleFilterChange('search', e.target.value)}
                                    />
                                </div>
                            </div>
                        </FilterBar>
                    </Surface>
                </div>

                {/* Tabel */}
                <div className="animate-rise" style={{ animationDelay: '180ms' }}>
                    <DataTable
                        title="Daftar Kwitansi"
                        subtitle="Dokumen kwitansi hasil generate dari transaksi BKU."
                        icon={
                            <IconTile tone="sky" size="sm">
                                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M4 6h16M4 12h16M4 18h7" />
                                </svg>
                            </IconTile>
                        }
                        actions={<StatusBadge tone="info" dot={false} className="text-sikas-num">{stats.total}</StatusBadge>}
                        contentClassName="bento-table-wrapper mx-4 mb-4"
                        footer={
                            <>
                                <div className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">
                                    Menampilkan{' '}
                                    <span className="text-sikas-num font-extrabold text-slate-700 dark:text-slate-200">{kwitansis.length}</span>{' '}
                                    dari{' '}
                                    <span className="text-sikas-num font-extrabold text-slate-700 dark:text-slate-200">{pagination.total || 0}</span>{' '}
                                    data
                                </div>
                                <div className="flex items-center gap-1">
                                    <button
                                        disabled={pagination.current_page === 1}
                                        onClick={() => fetchData((pagination.current_page || 1) - 1)}
                                        className={`rounded-xl px-3 py-1 text-[10px] font-extrabold transition ${pagination.current_page === 1 ? 'cursor-not-allowed border border-slate-100 bg-slate-50 text-slate-300 dark:border-white/5 dark:bg-white/5 dark:text-slate-600' : 'border border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10'}`}
                                    >
                                        Previous
                                    </button>

                                    {(() => {
                                        const pages = [];
                                        const current = pagination.current_page || 1;
                                        const last = pagination.last_page || 1;

                                        if (last <= 7) {
                                            for (let i = 1; i <= last; i++) pages.push(i);
                                        } else {
                                            if (current <= 4) {
                                                pages.push(1, 2, 3, 4, 5, '...', last);
                                            } else if (current >= last - 3) {
                                                pages.push(1, '...', last - 4, last - 3, last - 2, last - 1, last);
                                            } else {
                                                pages.push(1, '...', current - 1, current, current + 1, '...', last);
                                            }
                                        }

                                        return pages.map((p, i) => (
                                            <button
                                                key={i}
                                                disabled={p === '...'}
                                                onClick={() => typeof p === 'number' && fetchData(p)}
                                                className={`flex h-7 min-w-7 items-center justify-center rounded-xl px-2 text-[10px] font-extrabold transition text-sikas-num ${p === current
                                                    ? 'bg-lime-400 text-slate-950 shadow-lime'
                                                    : p === '...'
                                                        ? 'cursor-default bg-transparent text-slate-300 dark:text-slate-600'
                                                        : 'text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-white/5'
                                                    }`}
                                            >
                                                {p}
                                            </button>
                                        ));
                                    })()}

                                    <button
                                        disabled={pagination.current_page === pagination.last_page}
                                        onClick={() => fetchData((pagination.current_page || 1) + 1)}
                                        className={`rounded-xl px-3 py-1 text-[10px] font-extrabold transition ${pagination.current_page === pagination.last_page ? 'cursor-not-allowed border border-slate-100 bg-slate-50 text-slate-300 dark:border-white/5 dark:bg-white/5 dark:text-slate-600' : 'border border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10'}`}
                                    >
                                        Next
                                    </button>
                                </div>
                            </>
                        }
                    >
                        <div className="overflow-x-auto">
                            <table className="min-w-full">
                                <thead>
                                    <tr>
                                        <th className="text-left">No</th>
                                        <th className="text-left">Kode Rekening</th>
                                        <th className="text-left">Uraian</th>
                                        <th className="text-left">Tanggal</th>
                                        <th className="text-left">Jumlah</th>
                                        <th className="text-center">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        <tr>
                                            <td colSpan={6} className="p-0">
                                                <SkeletonRows rows={5} columns={5} />
                                            </td>
                                        </tr>
                                    ) : kwitansis.length > 0 ? (
                                        kwitansis.map((item, index) => (
                                            <tr key={item.id}>
                                                <td className="text-sikas-num text-slate-400 dark:text-slate-500">
                                                    {(pagination.current_page ? (pagination.current_page - 1) * (pagination.per_page || 10) : 0) + index + 1}
                                                </td>
                                                <td className="whitespace-nowrap font-extrabold text-slate-900 dark:text-white">
                                                    {item.kode_rekening}
                                                </td>
                                                <td className="max-w-md truncate text-slate-500 dark:text-slate-400">
                                                    {item.uraian}
                                                </td>
                                                <td className="whitespace-nowrap text-slate-500 dark:text-slate-400">
                                                    {item.tanggal}
                                                </td>
                                                <td className="whitespace-nowrap text-sikas-num font-extrabold text-slate-900 dark:text-white">
                                                    {item.jumlah}
                                                </td>
                                                <td className="whitespace-nowrap text-right">
                                                    <KwitansiRowActions
                                                        item={item}
                                                        customTemplates={customTemplates}
                                                        libreOfficeAvailable={libreOfficeAvailable}
                                                        onPrint={handlePrintClick}
                                                        onPreview={handlePreviewClick}
                                                        onPreviewCustom={handlePreviewCustom}
                                                        onDownloadDocx={handleDownloadCustomDocx}
                                                    />
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={6} className="p-0">
                                                <EmptyState
                                                    className="border-0 bg-transparent py-9 dark:bg-transparent"
                                                    icon={
                                                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                                        </svg>
                                                    }
                                                    title="Tidak ada data yang ditemukan"
                                                    description="Coba ubah kata kunci pencarian atau filter yang digunakan."
                                                    action={
                                                        <button
                                                            onClick={handleReset}
                                                            className="inline-flex items-center gap-1.5 rounded-2xl bg-lime-400 px-4 py-2.5 text-[11px] font-extrabold text-slate-950 shadow-lime transition hover:-translate-y-0.5 hover:bg-lime-300"
                                                        >
                                                            Hapus Semua Filter
                                                        </button>
                                                    }
                                                />
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </DataTable>
                </div>
            </div>

            {/* Modal Generate Batch */}
            <Modal show={confirmingBatchGenerate} onClose={closeModal} maxWidth="lg">
                <div className="relative overflow-visible rounded-[26px]">
                    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[26px]">
                        <div className="absolute -right-10 -top-16 h-40 w-40 rounded-full bg-lime-400/20 blur-3xl dark:bg-lime-400/10" />
                    </div>
                    <div className="relative flex items-start justify-between gap-3 border-b border-slate-100 px-6 py-4 dark:border-white/5">
                        <div className="flex items-center gap-3">
                            <IconTile tone="lime" size="lg">
                                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M12 3v2M12 19v2M5 12H3M21 12h-2" />
                                    <circle cx="12" cy="12" r="4" />
                                    <path d="m8.5 4.5 1 1.7M14.5 18l1-1.7M4.5 8.5l1.7 1M18 14.5l-1.7 1" />
                                </svg>
                            </IconTile>
                            <div className="min-w-0">
                                <h2 className="text-[14px] font-extrabold tracking-tight text-slate-900 dark:text-white">
                                    Generate Kwitansi Otomatis
                                </h2>
                                <p className="mt-0.5 text-[10px] font-medium text-slate-400 dark:text-slate-500">
                                    Buat dokumen kwitansi dari transaksi BKU sesuai tahun anggaran.
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

                    <div className="space-y-4 px-6 py-5">
                        <div>
                            <InputLabel htmlFor="generate_year" value="Tahun Anggaran" />
                            <KwitansiSelect
                                inputId="generate_year"
                                className="mt-1"
                                size="md"
                                isSearchable
                                isDisabled={processing}
                                placeholder="Pilih Tahun Anggaran..."
                                noOptionsMessage="Tahun anggaran tidak ditemukan"
                                options={availableYears.map((year) => ({
                                    value: year.id.toString(),
                                    label: year.tahun,
                                }))}
                                value={generateYear}
                                onChange={(val) => setGenerateYear(val ?? '')}
                            />
                        </div>

                        <p className="text-[11.5px] font-medium leading-relaxed text-slate-500 dark:text-slate-400">
                            Anda akan memproses <strong className="text-sikas-num font-extrabold text-slate-700 dark:text-slate-200">{generateCount}</strong> data transaksi BKU menjadi kwitansi secara otomatis untuk tahun anggaran yang dipilih.
                            <br />
                            Pastikan data BKU sudah benar sebelum melanjutkan.
                        </p>

                        {processing && (
                            <div className="rounded-2xl border border-lime-300/60 bg-lime-100/60 p-4 dark:border-lime-400/20 dark:bg-lime-400/10">
                                <div className="mb-1.5 flex items-center justify-between gap-2">
                                    <span className="text-[10.5px] font-bold text-slate-700 dark:text-lime-200">{progressStatus}</span>
                                    <span className="text-sikas-num text-[10.5px] font-extrabold text-lime-700 dark:text-lime-300">{progress}%</span>
                                </div>
                                <div className="h-2 w-full overflow-hidden rounded-full bg-white/80 dark:bg-white/10">
                                    <div
                                        className="h-full rounded-full bg-gradient-to-r from-lime-400 to-lime-500 transition-all duration-300"
                                        style={{ width: `${progress}%` }}
                                    ></div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4 dark:border-white/5">
                        <SecondaryButton onClick={closeModal} disabled={processing}>
                            Batal
                        </SecondaryButton>

                        <PrimaryButton className="ml-3" disabled={processing || generateCount === 0} onClick={processGenerateBatch}>
                            {processing ? 'Memproses...' : 'Ya, Generate'}
                        </PrimaryButton>
                    </div>
                </div>
            </Modal>

            {/* Modal Download All */}
            <Modal show={confirmingDownload} onClose={closeModal} maxWidth="2xl">
                <div className="relative overflow-hidden">
                    <div className="pointer-events-none absolute -right-10 -top-16 h-40 w-40 rounded-full bg-brand-500/10 blur-3xl dark:bg-brand-500/[0.08]" />
                    <div className="relative flex items-start justify-between gap-3 border-b border-slate-100 px-6 py-4 dark:border-white/5">
                        <div className="flex items-center gap-3">
                            <IconTile tone="sky" size="lg">
                                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                            </IconTile>
                            <div className="min-w-0">
                                <h2 className="text-[14px] font-extrabold tracking-tight text-slate-900 dark:text-white">
                                    Download Semua Kwitansi
                                </h2>
                                <p className="mt-0.5 text-[10px] font-medium text-slate-400 dark:text-slate-500">
                                    Unduh seluruh dokumen kwitansi sesuai filter yang aktif.
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

                    <div className="space-y-4 px-6 py-5">
                        <p className="text-[11.5px] font-medium leading-relaxed text-slate-500 dark:text-slate-400">
                            Anda akan mengunduh semua data kwitansi berdasarkan filter yang aktif saat ini.
                            <br />
                            Total Data: <strong className="text-sikas-num font-extrabold text-slate-700 dark:text-slate-200">{pagination.total ?? stats.total}</strong>
                        </p>

                        <div className="space-y-1.5">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <InputLabel htmlFor="paper_size" value="Ukuran Kertas (Format 1-4)" />
                                    <select
                                        id="paper_size"
                                        value={downloadSettings.paperSize}
                                        onChange={(e) => setDownloadSettings({ ...downloadSettings, paperSize: e.target.value })}
                                        className="mt-1 block w-full rounded-xl border border-slate-200/90 bg-white px-3.5 py-2.5 text-[12px] font-semibold text-slate-800 shadow-sm transition focus:border-lime-400 focus:outline-none focus:ring-4 focus:ring-lime-200/60 dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:border-lime-400/70 dark:focus:ring-lime-400/10"
                                    >
                                        <option value="A4">A4</option>
                                        <option value="Letter">Letter</option>
                                        <option value="Folio">Folio (F4)</option>
                                        <option value="Legal">Legal</option>
                                    </select>
                                </div>
                                <div>
                                    <InputLabel htmlFor="font_size" value="Ukuran Font (Format 1-4)" />
                                    <select
                                        id="font_size"
                                        value={downloadSettings.fontSize}
                                        onChange={(e) => setDownloadSettings({ ...downloadSettings, fontSize: e.target.value })}
                                        className="mt-1 block w-full rounded-xl border border-slate-200/90 bg-white px-3.5 py-2.5 text-[12px] font-semibold text-slate-800 shadow-sm transition focus:border-lime-400 focus:outline-none focus:ring-4 focus:ring-lime-200/60 dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:border-lime-400/70 dark:focus:ring-lime-400/10"
                                    >
                                        <option value="8pt">8pt</option>
                                        <option value="9pt">9pt</option>
                                        <option value="10pt">10pt</option>
                                        <option value="11pt">11pt</option>
                                    </select>
                                </div>
                            </div>
                            {customTemplates.length > 0 && (
                                <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500">
                                    Catatan: Template Kustom mengikuti ukuran kertas dan font dari dokumen Word (.docx) yang Anda unggah.
                                </p>
                            )}
                        </div>

                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <button
                                onClick={() => processDownloadAll('current', 1)}
                                className="group flex flex-col items-start gap-1.5 rounded-2xl border border-brand-500/15 bg-pastel-lavender/60 p-4 text-left transition hover:-translate-y-0.5 hover:border-brand-500/30 hover:bg-pastel-lavender dark:border-brand-400/20 dark:bg-brand-500/10 dark:hover:bg-brand-500/15"
                            >
                                <span className="flex items-center gap-2 text-[11.5px] font-extrabold text-brand-600 dark:text-brand-300">
                                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                    Download Format 1
                                </span>
                                <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
                                    Unduh PDF standar
                                </span>
                            </button>

                            <button
                                onClick={() => processDownloadAll('current', 2)}
                                className="group flex flex-col items-start gap-1.5 rounded-2xl border border-mint/20 bg-pastel-mint/60 p-4 text-left transition hover:-translate-y-0.5 hover:border-mint/40 hover:bg-pastel-mint dark:border-mint/20 dark:bg-mint/10 dark:hover:bg-mint/15"
                            >
                                <span className="flex items-center gap-2 text-[11.5px] font-extrabold text-mint dark:text-mint">
                                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                    Download Format 2
                                </span>
                                <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
                                    Unduh PDF alternatif
                                </span>
                            </button>

                            <button
                                onClick={() => processDownloadAll('current', 3)}
                                className="group flex flex-col items-start gap-1.5 rounded-2xl border border-orange-300/40 bg-pastel-peach/60 p-4 text-left transition hover:-translate-y-0.5 hover:border-orange-400/50 hover:bg-pastel-peach dark:border-peach/20 dark:bg-peach/10 dark:hover:bg-peach/15"
                            >
                                <span className="flex items-center gap-2 text-[11.5px] font-extrabold text-orange-600 dark:text-orange-300">
                                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                    Download Format 3
                                </span>
                                <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
                                    Unduh PDF BOSP
                                </span>
                            </button>

                            <button
                                onClick={() => processDownloadAll('current', 4)}
                                className="group flex flex-col items-start gap-1.5 rounded-2xl border border-rose-200 bg-pastel-rose/70 p-4 text-left transition hover:-translate-y-0.5 hover:border-rose-300 hover:bg-pastel-rose dark:border-rose-400/20 dark:bg-rose-500/10 dark:hover:bg-rose-500/15"
                            >
                                <span className="flex items-center gap-2 text-[11.5px] font-extrabold text-rose-600 dark:text-rose-300">
                                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                    Download Format 4
                                </span>
                                <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
                                    Unduh PDF tanpa rincian
                                </span>
                            </button>
                        </div>

                        {customTemplates.length > 0 && (
                            <div className="space-y-2.5 border-t border-slate-100 pt-4 dark:border-white/10">
                                <div className="flex items-center justify-between gap-2">
                                    <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                        Format Kustom (Word)
                                    </p>
                                    <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500">
                                        Otomatis 1 file multi-halaman
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                                    {customTemplates.map((tpl) => {
                                        const noDownloadData = (pagination.total ?? stats.total) === 0;
                                        return (
                                        <div
                                            key={tpl.id}
                                            className="flex flex-col justify-between gap-2.5 rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3.5 dark:border-white/10 dark:bg-white/[0.03]"
                                        >
                                            <div className="min-w-0">
                                                <p className="truncate text-[11.5px] font-extrabold text-slate-900 dark:text-white">
                                                    {tpl.nama}
                                                </p>
                                                <p className="mt-0.5 truncate text-[10px] font-medium text-slate-500 dark:text-slate-400">
                                                    {tpl.deskripsi || tpl.original_filename}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <button
                                                    type="button"
                                                    disabled={noDownloadData}
                                                    onClick={() => processDownloadAllCustom(tpl.id, 'docx')}
                                                    className={`inline-flex flex-1 items-center justify-center gap-1 rounded-xl border px-2.5 py-1.5 text-[10.5px] font-extrabold transition ${
                                                        noDownloadData
                                                            ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400 dark:border-white/5 dark:bg-white/5 dark:text-slate-600'
                                                            : 'border-brand-500/20 bg-pastel-lavender/80 text-brand-700 hover:bg-pastel-lavender dark:border-brand-400/25 dark:bg-brand-500/15 dark:text-brand-200 dark:hover:bg-brand-500/25'
                                                    }`}
                                                >
                                                    DOCX Gabungan
                                                </button>
                                                <button
                                                    type="button"
                                                    disabled={noDownloadData || !libreOfficeAvailable}
                                                    onClick={() => processDownloadAllCustom(tpl.id, 'pdf')}
                                                    title={
                                                        noDownloadData
                                                            ? 'Tidak ada data kwitansi untuk diunduh'
                                                            : libreOfficeAvailable
                                                              ? 'Konversi DOCX gabungan menjadi 1 file PDF'
                                                              : 'Membutuhkan LibreOffice untuk konversi PDF'
                                                    }
                                                    className={`inline-flex flex-1 items-center justify-center gap-1 rounded-xl px-2.5 py-1.5 text-[10.5px] font-extrabold transition ${
                                                        !noDownloadData && libreOfficeAvailable
                                                            ? 'bg-lime-400 text-slate-950 shadow-lime hover:bg-lime-300'
                                                            : 'cursor-not-allowed bg-slate-100 text-slate-400 dark:bg-white/5 dark:text-slate-600'
                                                    }`}
                                                >
                                                    PDF Gabungan
                                                </button>
                                            </div>
                                        </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4 dark:border-white/5">
                        <SecondaryButton onClick={closeModal}>
                            Batal
                        </SecondaryButton>
                    </div>
                </div>
            </Modal>

            {/* Modal Delete All */}
            <Modal show={confirmingDeleteAll} onClose={closeModal} maxWidth="lg">
                <form onSubmit={processDeleteAll} className="relative overflow-hidden">
                    <div className="pointer-events-none absolute -right-10 -top-16 h-40 w-40 rounded-full bg-rose-500/10 blur-3xl dark:bg-rose-500/[0.08]" />
                    <div className="relative flex items-start justify-between gap-3 border-b border-slate-100 px-6 py-4 dark:border-white/5">
                        <div className="flex items-center gap-3">
                            <IconTile tone="rose" size="lg">
                                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            </IconTile>
                            <div className="min-w-0">
                                <h2 className="text-[14px] font-extrabold tracking-tight text-slate-900 dark:text-white">
                                    Hapus SEMUA Kwitansi
                                </h2>
                                <p className="mt-0.5 text-[10px] font-medium text-slate-400 dark:text-slate-500">
                                    Tindakan ini akan menghapus seluruh dokumen kwitansi.
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
                        <p className="text-[11.5px] font-medium leading-relaxed text-slate-500 dark:text-slate-400">
                            <strong className="font-extrabold text-slate-700 dark:text-slate-200">PERINGATAN:</strong> Tindakan ini tidak dapat dibatalkan! Semua data kwitansi yang telah digenerate akan dihapus.
                            Data BKU tidak akan terhapus, hanya kwitansinya saja.
                        </p>
                    </div>

                    <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4 dark:border-white/5">
                        <SecondaryButton onClick={closeModal} disabled={processing}>
                            Batal
                        </SecondaryButton>

                        <DangerButton className="ml-3" disabled={processing}>
                            {processing ? 'Menghapus...' : 'Hapus Semua'}
                        </DangerButton>
                    </div>
                </form>
            </Modal>

            {/* Print Settings Modal */}
            <PrintSettingsModal
                show={showPrintSettings}
                onClose={closeModal}
                onPrint={processPrint}
                title="Pengaturan Cetak Kwitansi"
            />

            {/* PDF Preview Modal */}
            <PdfPreviewModal
                show={showPreviewModal}
                onClose={() => setShowPreviewModal(false)}
                pdfUrl={previewUrl}
                title="Preview Kwitansi"
            />

            {/* Modal Kelola Template Kwitansi Kustom */}
            <KwitansiTemplateModal
                show={showTemplateModal}
                onClose={() => setShowTemplateModal(false)}
                templates={customTemplates}
                variableCatalog={variableCatalog}
                libreOfficeAvailable={libreOfficeAvailable}
                canManage={canManageTemplates}
                onTemplatesChanged={fetchCustomTemplates}
            />
        </>
    );
}
