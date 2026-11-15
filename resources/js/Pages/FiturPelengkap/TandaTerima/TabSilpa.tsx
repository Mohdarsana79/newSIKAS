import React, { useState, useEffect, FormEventHandler } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';
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
import DatePicker from '@/Components/DatePicker';
import IconTile from '@/Components/ui/IconTile';
import Surface from '@/Components/ui/Surface';
import DataTable from '@/Components/ui/DataTable';
import StatusBadge from '@/Components/ui/StatusBadge';
import EmptyState from '@/Components/ui/EmptyState';
import { format } from 'date-fns';
import Select from 'react-select';

// Check if route is defined globally (Ziggy)
declare const route: (name: string, params?: any, absolute?: boolean) => string;

interface TandaTerimaData {
    id: number;
    number: number;
    kode_rekening: string;
    uraian: string;
    tanggal: string;
    jumlah: string;
    preview_url: string;
    pdf_url: string;
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

export default function TabSilpa() {
    const [tandaTerimas, setTandaTerimas] = useState<TandaTerimaData[]>([]);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState<Partial<PaginationData>>({});
    const [filters, setFilters] = useState<FilterState>({
        search: '',
        tahun: '',
        start_date: '',
        end_date: ''
    });

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
    const [selectedTandaTerimaId, setSelectedTandaTerimaId] = useState<number | null>(null);

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
            const response = await axios.get(route('api.silpa-tanda-terima.check-available'), {
                params: { tahun: year }
            });
            if (response.data.success) {
                // Controller returns availableCount
                setGenerateCount(response.data.data.availableCount);
            }
        } catch (error) {
            console.error('Error fetching generate count:', error);
        }
    };

    useEffect(() => {
        fetchYears();
        fetchStats();
    }, []);

    // Debounce search
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            fetchData();
        }, 500);
        return () => clearTimeout(timeoutId);
    }, [filters]);

    const fetchYears = async () => {
        try {
            const response = await axios.get(route('api.silpa-tanda-terima.tahun'));
            if (response.data.success) {
                setAvailableYears(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching years:', error);
        }
    };

    const fetchStats = async () => {
        try {
            const responseAvail = await axios.get(route('api.silpa-tanda-terima.check-available'));
            if (responseAvail.data.success) {
                setStats(prev => ({
                    ...prev,
                    available: responseAvail.data.data.availableCount
                }));
            }
            // Stats total update happens in fetchData for now as dev didn't provide specific endpoint for total existing if not searching
        } catch (error) {
            console.error('Error fetching stats:', error);
        }
    };

    const fetchData = async (page = 1) => {
        setLoading(true);
        try {
            const response = await axios.get(route('api.silpa-tanda-terima.search'), {
                params: {
                    page: page,
                    ...filters
                }
            });

            if (response.data.success) {
                setTandaTerimas(response.data.data);
                setPagination(response.data.pagination);
                setStats(prev => ({ ...prev, total: response.data.total }));
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
            const initialCheck = await axios.get(route('api.silpa-tanda-terima.check-available'), {
                params: { tahun: generateYear }
            });
            const totalToProcess = initialCheck.data.data.availableCount;

            if (totalToProcess === 0) {
                setConfirmingBatchGenerate(false);
                return;
            }

            let hasMore = true;

            while (hasMore) {
                const response = await axios.post(route('silpa-tanda-terima.generate-batch'), {
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

                // CRITICAL: Offset by failed count to skip them (as confirmed by Kwitansi Logic)
                currentOffset += batchFailed;

                const currentProgress = Math.min(Math.round(((processedTotal) / totalToProcess) * 100), 100);
                setProgress(currentProgress);
                setProgressStatus(`Memproses ${processedTotal} dari ${totalToProcess} data... (Gagal: ${failedTotal})`);

                if (processedInBatch < BATCH_SIZE || processedTotal >= totalToProcess + failedTotal) {
                    if (processedInBatch < BATCH_SIZE) hasMore = false;
                }

                if (processedTotal > totalToProcess * 2) hasMore = false;

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
            const response = await axios.delete(route('silpa-tanda-terima.delete-all'));
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

    const processDownloadAll = (mode: 'current' | 'year') => {
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

        window.open(`${route('silpa-tanda-terima.download-all')}?${params.toString()}`, '_blank');
        setConfirmingDownload(false);
    };

    const handlePrintClick = (id: number) => {
        setSelectedTandaTerimaId(id);
        setShowPrintSettings(true);
    };

    const processPrint = (settings: PrintSettings) => {
        if (selectedTandaTerimaId) {
            const url = route('silpa-tanda-terima.pdf', selectedTandaTerimaId);
            const params = new URLSearchParams({
                paper_size: settings.paperSize,
                font_size: settings.fontSize,
                orientation: settings.orientation
            });
            window.open(`${url}?${params.toString()}`, '_blank');
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
        <div className="space-y-4">
            {/* Baris judul + aksi */}
            <div className="animate-rise">
                <Surface padding="sm">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                            <IconTile tone="violet" size="lg">
                                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </IconTile>
                            <div className="min-w-0">
                                <h2 className="truncate text-[13.5px] font-extrabold tracking-tight text-slate-900 dark:text-white">
                                    Manajemen Tanda Terima SiLPA
                                </h2>
                                <p className="mt-0.5 text-[10.5px] font-medium text-slate-400 dark:text-slate-500">
                                    Kelola dan pantau semua dokumen tanda terima dalam satu tempat yang terintegrasi
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            <button
                                onClick={startGenerateBatch}
                                disabled={stats.available === 0}
                                className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-[11.5px] font-extrabold transition-all duration-200 ${
                                    stats.available === 0
                                        ? 'cursor-not-allowed bg-slate-100 text-slate-400 dark:bg-white/5 dark:text-slate-500'
                                        : 'bg-lime-400 text-slate-950 shadow-lime hover:-translate-y-0.5 hover:bg-lime-300'
                                }`}
                            >
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path></svg>
                                Generate Otomatis
                            </button>
                            <button
                                onClick={startDownloadAll}
                                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/90 bg-white px-4 py-2.5 text-[11.5px] font-bold text-slate-700 shadow-pill transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
                            >
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                                Download All
                            </button>
                            <button
                                onClick={startDeleteAll}
                                className="inline-flex items-center gap-2 rounded-2xl border border-rose-200/80 bg-rose-50 px-4 py-2.5 text-[11.5px] font-bold text-rose-600 shadow-pill transition-all duration-200 hover:-translate-y-0.5 hover:border-rose-300 hover:bg-rose-100 dark:border-rose-400/20 dark:bg-rose-500/10 dark:text-rose-300 dark:hover:bg-rose-500/15"
                            >
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                Hapus Semua
                            </button>
                        </div>
                    </div>
                </Surface>
            </div>

            {/* Filter Section */}
            <div className="animate-rise" style={{ animationDelay: '60ms' }}>
                <Surface padding="sm">
                    <div className="flex flex-col gap-3 md:flex-row md:items-end">
                        <div className="grid w-full flex-1 grid-cols-1 gap-3 md:grid-cols-2">
                            <div>
                                <label className="mb-1.5 block text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">Mulai</label>
                                <DatePicker
                                    value={filters.start_date}
                                    onChange={(date) => handleFilterChange('start_date', date ? format(date, 'yyyy-MM-dd') : '')}
                                    placeholder="Pilih Tanggal"
                                />
                            </div>
                            <div>
                                <label className="mb-1.5 block text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">Akhir</label>
                                <DatePicker
                                    value={filters.end_date}
                                    onChange={(date) => handleFilterChange('end_date', date ? format(date, 'yyyy-MM-dd') : '')}
                                    placeholder="Pilih Tanggal"
                                />
                            </div>
                        </div>

                        <div className="w-full flex-1">
                            <label className="mb-1.5 block text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">Pencarian</label>
                            <TextInput
                                type="text"
                                placeholder="Cari uraian, kode rekening, tanggal..."
                                value={filters.search}
                                onChange={(e) => handleFilterChange('search', e.target.value)}
                            />
                        </div>

                        <button
                            onClick={handleReset}
                            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200/90 bg-white px-4 py-2.5 text-[11.5px] font-bold text-slate-700 shadow-pill transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
                        >
                            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5" /></svg>
                            Reset
                        </button>
                    </div>
                </Surface>
            </div>

            {/* Table Section */}
            <div className="animate-rise" style={{ animationDelay: '120ms' }}>
                <DataTable
                    title="Daftar Tanda Terima SiLPA"
                    icon={
                        <IconTile tone="sky" size="md">
                            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                                <path d="M4 6h16M4 12h16M4 18h7" />
                            </svg>
                        </IconTile>
                    }
                    actions={
                        <StatusBadge tone="violet" dot={false}>
                            <span className="text-sikas-num">{stats.total}</span>
                        </StatusBadge>
                    }
                    footer={
                        <>
                            <div className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">
                                Menampilkan{' '}
                                <span className="text-sikas-num font-extrabold text-slate-700 dark:text-slate-200">{tandaTerimas.length}</span>{' '}
                                dari{' '}
                                <span className="text-sikas-num font-extrabold text-slate-700 dark:text-slate-200">{pagination.total || 0}</span>{' '}
                                data
                            </div>
                            <div className="flex flex-wrap items-center gap-1">
                                <button
                                    disabled={pagination.current_page === 1}
                                    onClick={() => fetchData((pagination.current_page || 1) - 1)}
                                    className={`rounded-xl px-3 py-1.5 text-[10.5px] font-bold transition ${pagination.current_page === 1
                                        ? 'cursor-not-allowed bg-slate-100 text-slate-400 dark:bg-white/5 dark:text-slate-500'
                                        : 'border border-slate-200/90 bg-white text-slate-600 shadow-pill hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10'
                                        }`}
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
                                            className={`flex h-7 min-w-7 items-center justify-center rounded-xl px-2 text-[10px] transition ${p === current
                                                ? 'bg-lime-400 font-extrabold text-slate-950 shadow-lime'
                                                : p === '...'
                                                    ? 'cursor-default bg-transparent font-bold text-slate-300 dark:text-slate-600'
                                                    : 'font-bold text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-white/5'
                                                }`}
                                        >
                                            {p}
                                        </button>
                                    ));
                                })()}

                                <button
                                    disabled={pagination.current_page === pagination.last_page}
                                    onClick={() => fetchData((pagination.current_page || 1) + 1)}
                                    className={`rounded-xl px-3 py-1.5 text-[10.5px] font-bold transition ${pagination.current_page === pagination.last_page
                                        ? 'cursor-not-allowed bg-slate-100 text-slate-400 dark:bg-white/5 dark:text-slate-500'
                                        : 'border border-slate-200/90 bg-white text-slate-600 shadow-pill hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10'
                                        }`}
                                >
                                    Next
                                </button>
                            </div>
                        </>
                    }
                >
                    <div className="overflow-x-auto">
                        <table className="min-w-[820px]">
                            <thead>
                                <tr>
                                    <th className="text-left">No</th>
                                    <th className="text-left">Kode Rekening</th>
                                    <th className="text-left">Uraian</th>
                                    <th className="text-left">Tanggal</th>
                                    <th className="text-right">Jumlah</th>
                                    <th className="text-center">Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-10 text-center">
                                            <div className="flex flex-col items-center justify-center gap-2">
                                                <svg className="h-5 w-5 animate-spin text-brand-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                                <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500">Memuat data...</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : tandaTerimas.length > 0 ? (
                                    tandaTerimas.map((item, index) => (
                                        <tr key={item.id}>
                                            <td className="whitespace-nowrap">
                                                <span className="text-sikas-num text-slate-400 dark:text-slate-500">
                                                    {(pagination.current_page ? (pagination.current_page - 1) * (pagination.per_page || 10) : 0) + index + 1}
                                                </span>
                                            </td>
                                            <td className="whitespace-nowrap">
                                                <span className="font-extrabold text-slate-900 dark:text-white">
                                                    {item.kode_rekening}
                                                </span>
                                            </td>
                                            <td className="max-w-md truncate">
                                                {item.uraian}
                                            </td>
                                            <td className="whitespace-nowrap">
                                                <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2 py-1 text-[9.5px] font-bold text-slate-600 dark:bg-white/5 dark:text-slate-300">
                                                    <span className="h-1.5 w-1.5 rounded-full bg-lime-400" />
                                                    {item.tanggal}
                                                </span>
                                            </td>
                                            <td className="whitespace-nowrap text-right">
                                                <span className="text-sikas-num font-extrabold text-slate-900 dark:text-white">
                                                    {item.jumlah}
                                                </span>
                                            </td>
                                            <td className="whitespace-nowrap">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button
                                                        onClick={() => handlePrintClick(item.id)}
                                                        className="sikas-icon-btn h-8 w-8"
                                                        title="Cetak PDF"
                                                    >
                                                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>
                                                    </button>
                                                    <button
                                                        onClick={(e) => { e.preventDefault(); handlePreviewClick(item.preview_url); }}
                                                        className="sikas-icon-btn h-8 w-8"
                                                        title="Preview"
                                                    >
                                                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={6} className="px-4 py-6">
                                            <EmptyState
                                                icon={
                                                    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                                                }
                                                title="Tidak ada data yang ditemukan"
                                                description="Coba ubah kata kunci pencarian atau filter yang digunakan."
                                                action={
                                                    <button
                                                        onClick={handleReset}
                                                        className="inline-flex items-center gap-2 rounded-2xl bg-lime-400 px-4 py-2.5 text-[11.5px] font-extrabold text-slate-950 shadow-lime transition-all duration-200 hover:-translate-y-0.5 hover:bg-lime-300"
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

            {/* Modal Generate Batch */}
            <Modal show={confirmingBatchGenerate} onClose={closeModal}>
                <div className="flex max-h-[90vh] flex-col overflow-hidden">
                    <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 px-6 py-5 dark:border-white/5">
                        <div className="flex min-w-0 items-center gap-3">
                            <IconTile tone="lime" size="lg">
                                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                                </svg>
                            </IconTile>
                            <div className="min-w-0">
                                <h2 className="text-[16px] font-extrabold tracking-tight text-slate-900 dark:text-white">
                                    Generate Tanda Terima SiLPA Otomatis
                                </h2>
                                <p className="mt-0.5 text-[10.5px] font-medium text-slate-400 dark:text-slate-500">
                                    Buat dokumen tanda terima dari transaksi BKU terpilih.
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={closeModal}
                            className="sikas-icon-btn h-8 w-8"
                            aria-label="Tutup"
                        >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>

                    <div className="sikas-scroll flex-1 space-y-4 overflow-y-auto px-6 py-5">
                        <div>
                            <InputLabel htmlFor="generate_year" value="Tahun Anggaran" />
                            <Select
                                id="generate_year"
                                className="mt-1"
                                classNamePrefix="react-select"
                                options={availableYears.map((year) => ({ value: year.id.toString(), label: year.tahun }))}
                                value={availableYears
                                    .filter((year) => year.id.toString() === generateYear)
                                    .map((year) => ({ value: year.id.toString(), label: year.tahun }))[0] || null
                                }
                                onChange={(val: any) => setGenerateYear(val ? val.value : '')}
                                placeholder="Pilih Tahun Anggaran..."
                                isDisabled={processing}
                                isSearchable
                                styles={{
                                    control: (baseStyles, state) => ({
                                        ...baseStyles,
                                        borderColor: state.isFocused ? '#A9CE2F' : '#e2e8f0',
                                        boxShadow: state.isFocused ? '0 0 0 1px #A9CE2F' : 'none',
                                        '&:hover': { borderColor: state.isFocused ? '#A9CE2F' : '#cbd5e1' },
                                        borderRadius: '0.75rem',
                                        padding: '0.125rem',
                                    }),
                                    singleValue: (base) => ({
                                        ...base,
                                        color: '#0f172a',
                                    }),
                                    input: (base) => ({
                                        ...base,
                                        color: '#0f172a',
                                        'input': {
                                            boxShadow: 'none !important',
                                            border: 'none !important',
                                            outline: 'none !important',
                                        },
                                        'input:focus': {
                                            boxShadow: 'none !important',
                                            border: 'none !important',
                                        }
                                    }),
                                    option: (base, state) => ({
                                        ...base,
                                        color: '#0f172a',
                                        backgroundColor: state.isSelected ? '#f0fbcc' : state.isFocused ? '#f8fafc' : 'transparent',
                                    }),
                                    menu: (baseStyles) => ({
                                        ...baseStyles,
                                        zIndex: 9999,
                                    })
                                }}
                            />
                        </div>

                        <div className="rounded-2xl border border-slate-100 bg-slate-50/70 px-4 py-3.5 text-[11.5px] font-medium leading-relaxed text-slate-600 dark:border-white/5 dark:bg-white/[0.03] dark:text-slate-300">
                            Anda akan memproses <strong className="text-sikas-num font-extrabold text-slate-900 dark:text-white">{generateCount}</strong> data transaksi BKU menjadi tanda terima secara otomatis untuk tahun anggaran yang dipilih.
                            <br />
                            Pastikan data BKU sudah benar sebelum melanjutkan.
                        </div>

                        {processing && (
                            <div className="space-y-2">
                                <div className="flex items-center justify-between gap-3">
                                    <span className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">{progressStatus}</span>
                                    <span className="text-sikas-num text-[10.5px] font-extrabold text-slate-700 dark:text-slate-200">{progress}%</span>
                                </div>
                                <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
                                    <div
                                        className="h-2.5 rounded-full bg-gradient-to-r from-lime-400 to-lime-500 transition-all duration-300"
                                        style={{ width: `${progress}%` }}
                                    ></div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex shrink-0 items-center justify-end gap-2 border-t border-slate-100 px-6 py-4 dark:border-white/5">
                        <SecondaryButton onClick={closeModal} disabled={processing}>
                            Batal
                        </SecondaryButton>

                        <PrimaryButton disabled={processing || generateCount === 0} onClick={processGenerateBatch}>
                            {processing ? 'Memproses...' : 'Ya, Generate'}
                        </PrimaryButton>
                    </div>
                </div>
            </Modal>

            {/* Modal Download All */}
            <Modal show={confirmingDownload} onClose={closeModal}>
                <div className="flex max-h-[90vh] flex-col overflow-hidden">
                    <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 px-6 py-5 dark:border-white/5">
                        <div className="flex min-w-0 items-center gap-3">
                            <IconTile tone="sky" size="lg">
                                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                            </IconTile>
                            <div className="min-w-0">
                                <h2 className="text-[16px] font-extrabold tracking-tight text-slate-900 dark:text-white">
                                    Download Semua Tanda Terima SiLPA
                                </h2>
                                <p className="mt-0.5 text-[10.5px] font-medium text-slate-400 dark:text-slate-500">
                                    Unduh seluruh dokumen sesuai pengaturan cetak.
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={closeModal}
                            className="sikas-icon-btn h-8 w-8"
                            aria-label="Tutup"
                        >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>

                    <div className="sikas-scroll flex-1 space-y-4 overflow-y-auto px-6 py-5">
                        <div className="rounded-2xl border border-slate-100 bg-slate-50/70 px-4 py-3.5 text-[11.5px] font-medium leading-relaxed text-slate-600 dark:border-white/5 dark:bg-white/[0.03] dark:text-slate-300">
                            Anda akan mengunduh semua data tanda terima berdasarkan filter yang aktif saat ini.
                            <br />
                            Total Data: <strong className="text-sikas-num font-extrabold text-slate-900 dark:text-white">{pagination.total || stats.total}</strong>
                        </div>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div>
                                <InputLabel htmlFor="paper_size" value="Ukuran Kertas" />
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
                                <InputLabel htmlFor="font_size" value="Ukuran Font" />
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

                        <div className="grid grid-cols-1 gap-4">
                            <button
                                onClick={() => processDownloadAll('current')}
                                className="group flex items-start gap-3 rounded-2xl border border-slate-200/90 bg-white p-4 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-lime-300 hover:bg-lime-100/60 dark:border-white/10 dark:bg-white/5 dark:hover:border-lime-400/40 dark:hover:bg-lime-400/10"
                            >
                                <IconTile tone="lime" size="md" className="transition-transform duration-300 group-hover:scale-105">
                                    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                    </svg>
                                </IconTile>
                                <span className="min-w-0">
                                    <span className="block text-[12px] font-extrabold text-slate-900 group-hover:underline dark:text-white">Filter Saat Ini</span>
                                    <span className="mt-0.5 block text-[10.5px] font-medium text-slate-500 dark:text-slate-400">
                                        Download data sesuai pencarian & filter bulan/tahun yang aktif
                                    </span>
                                </span>
                            </button>
                        </div>
                    </div>

                    <div className="flex shrink-0 items-center justify-end gap-2 border-t border-slate-100 px-6 py-4 dark:border-white/5">
                        <SecondaryButton onClick={closeModal}>
                            Batal
                        </SecondaryButton>
                    </div>
                </div>
            </Modal>

            {/* Modal Delete All */}
            <Modal show={confirmingDeleteAll} onClose={closeModal}>
                <form onSubmit={processDeleteAll} className="flex max-h-[90vh] flex-col overflow-hidden">
                    <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 px-6 py-5 dark:border-white/5">
                        <div className="flex min-w-0 items-center gap-3">
                            <IconTile tone="rose" size="lg">
                                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            </IconTile>
                            <div className="min-w-0">
                                <h2 className="text-[16px] font-extrabold tracking-tight text-slate-900 dark:text-white">
                                    Hapus SEMUA Tanda Terima SiLPA
                                </h2>
                                <p className="mt-0.5 text-[10.5px] font-medium text-slate-400 dark:text-slate-500">
                                    Tindakan permanen untuk seluruh dokumen tanda terima.
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={closeModal}
                            className="sikas-icon-btn h-8 w-8"
                            aria-label="Tutup"
                        >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>

                    <div className="sikas-scroll flex-1 space-y-4 overflow-y-auto px-6 py-5">
                        <div className="rounded-2xl border border-rose-200/70 bg-rose-50 px-4 py-3.5 text-[11.5px] font-medium leading-relaxed text-rose-700 dark:border-rose-400/20 dark:bg-rose-500/10 dark:text-rose-300">
                            <strong>PERINGATAN:</strong> Tindakan ini tidak dapat dibatalkan! Semua data tanda terima yang telah digenerate akan dihapus.
                            Data BKU tidak akan terhapus, hanya tanda terimanya saja.
                        </div>
                    </div>

                    <div className="flex shrink-0 items-center justify-end gap-2 border-t border-slate-100 px-6 py-4 dark:border-white/5">
                        <SecondaryButton onClick={closeModal} disabled={processing}>
                            Batal
                        </SecondaryButton>

                        <DangerButton disabled={processing}>
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
                title="Pengaturan Cetak Tanda Terima SiLPA"
            />

            {/* PDF Preview Modal */}
            <PdfPreviewModal
                show={showPreviewModal}
                onClose={() => setShowPreviewModal(false)}
                pdfUrl={previewUrl}
                title="Preview Tanda Terima SiLPA"
            />
        </div>
    );
}
