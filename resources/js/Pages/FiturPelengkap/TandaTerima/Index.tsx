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
import { format } from 'date-fns';

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

export default function TandaTerimaIndex({ auth }: { auth: any }) {
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
            const response = await axios.get(route('api.tanda-terima.check-available'), {
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
            const response = await axios.get(route('api.tanda-terima.tahun'));
            if (response.data.success) {
                setAvailableYears(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching years:', error);
        }
    };

    const fetchStats = async () => {
        try {
            const responseAvail = await axios.get(route('api.tanda-terima.check-available'));
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
            const response = await axios.get(route('api.tanda-terima.search'), {
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
            const initialCheck = await axios.get(route('api.tanda-terima.check-available'), {
                params: { tahun: generateYear }
            });
            const totalToProcess = initialCheck.data.data.availableCount;

            if (totalToProcess === 0) {
                setConfirmingBatchGenerate(false);
                return;
            }

            let hasMore = true;

            while (hasMore) {
                const response = await axios.post(route('tanda-terima.generate-batch'), {
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
            const response = await axios.delete(route('tanda-terima.delete-all'));
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

        window.open(`${route('tanda-terima.download-all')}?${params.toString()}`, '_blank');
        setConfirmingDownload(false);
    };

    const handlePrintClick = (id: number) => {
        setSelectedTandaTerimaId(id);
        setShowPrintSettings(true);
    };

    const processPrint = (settings: PrintSettings) => {
        if (selectedTandaTerimaId) {
            const url = route('tanda-terima.pdf', selectedTandaTerimaId);
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
        <AuthenticatedLayout
            header={
                <div className="flex justify-between items-center">
                    <h2 className="font-semibold text-xl text-gray-800 dark:text-gray-200 leading-tight">Manajemen Tanda Terima</h2>
                    <div className="flex gap-2">
                        <button
                            onClick={startGenerateBatch}
                            disabled={stats.available === 0}
                            className={`px-4 py-2 rounded-md text-sm flex items-center gap-2 text-white ${stats.available === 0 ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-500 hover:bg-green-600'}`}
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path></svg>
                            Generate Otomatis
                        </button>
                        <button
                            onClick={startDownloadAll}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm flex items-center gap-2"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                            Download All
                        </button>
                        <button
                            onClick={startDeleteAll}
                            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md text-sm flex items-center gap-2"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                            Hapus Semua
                        </button>
                    </div>
                </div>
            }
        >
            <Head title="Manajemen Tanda Terima" />

            <div className="py-8">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">

                    {/* Header Text */}
                    <div className="mb-4">
                        <p className="text-gray-500 dark:text-gray-400">Kelola dan pantau semua dokumen tanda terima dalam satu tempat yang terintegrasi</p>
                    </div>

                    {/* Filter Section */}
                    <div className="bg-gradient-to-br from-indigo-500 to-purple-600 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4 rounded-lg shadow flex flex-col md:flex-row gap-4 items-end md:items-center">
                        <div className="flex-1 w-full md:w-auto grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-white dark:text-white mb-1">Mulai</label>
                                <DatePicker
                                    value={filters.start_date}
                                    onChange={(date) => handleFilterChange('start_date', date ? format(date, 'yyyy-MM-dd') : '')}
                                    placeholder="Pilih Tanggal"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-white dark:text-white mb-1">Akhir</label>
                                <DatePicker
                                    value={filters.end_date}
                                    onChange={(date) => handleFilterChange('end_date', date ? format(date, 'yyyy-MM-dd') : '')}
                                    placeholder="Pilih Tanggal"
                                />
                            </div>
                        </div>

                        <div className="flex-1 w-full">
                            <label className="block text-sm font-medium text-white dark:text-white mb-1">Pencarian</label>
                            <input
                                type="text"
                                placeholder="Cari uraian, kode rekening, tanggal..."
                                value={filters.search}
                                onChange={(e) => handleFilterChange('search', e.target.value)}
                                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            />
                        </div>

                        <button
                            onClick={handleReset}
                            className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-md text-sm md:mt-6"
                        >
                            Reset
                        </button>
                    </div>

                    {/* Table Section */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                            <h3 className="font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h7"></path></svg>
                                Daftar Tanda Terima
                                <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded dark:bg-blue-900 dark:text-blue-300">
                                    {stats.total}
                                </span>
                            </h3>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                <thead className="bg-gray-50 dark:bg-gray-700">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">No</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Kode Rekening</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Uraian</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Tanggal</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Jumlah</th>
                                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
                                    {loading ? (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-10 text-center text-gray-500">
                                                Memuat data...
                                            </td>
                                        </tr>
                                    ) : tandaTerimas.length > 0 ? (
                                        tandaTerimas.map((item, index) => (
                                            <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition duration-150">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                    {(pagination.current_page ? (pagination.current_page - 1) * (pagination.per_page || 10) : 0) + index + 1}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                                                    {item.kode_rekening}
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 max-w-md truncate">
                                                    {item.uraian}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                    {item.tanggal}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 dark:text-white">
                                                    {item.jumlah}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                    <div className="flex justify-center items-center gap-2">
                                                        <button
                                                            onClick={() => handlePrintClick(item.id)}
                                                            className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                                                            title="Cetak PDF"
                                                        >
                                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>
                                                        </button>
                                                        <button
                                                            onClick={(e) => { e.preventDefault(); handlePreviewClick(item.preview_url); }}
                                                            className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                                                            title="Preview"
                                                        >
                                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-20 text-center">
                                                <div className="flex flex-col items-center justify-center text-gray-400">
                                                    <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                                                    <p className="text-lg font-medium">Tidak ada data yang ditemukan</p>
                                                    <p className="text-sm">Coba ubah kata kunci pencarian atau filter yang digunakan.</p>
                                                    <button
                                                        onClick={handleReset}
                                                        className="mt-4 px-4 py-2 bg-indigo-500 text-white rounded-md hover:bg-indigo-600 transition"
                                                    >
                                                        Hapus Semua Filter
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex flex-col md:flex-row justify-between items-center gap-4">
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                                Menampilkan {tandaTerimas.length} dari {pagination.total || 0} data
                            </div>
                            <div className="flex items-center gap-1">
                                <button
                                    disabled={pagination.current_page === 1}
                                    onClick={() => fetchData((pagination.current_page || 1) - 1)}
                                    className={`px-3 py-1 border rounded-md text-sm font-medium ${pagination.current_page === 1 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 hover:bg-gray-50 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600'}`}
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
                                            className={`min-w-[32px] px-2 py-1 border rounded-md text-sm font-medium ${p === current
                                                ? 'bg-indigo-600 text-white border-indigo-600'
                                                : p === '...'
                                                    ? 'bg-transparent text-gray-700 cursor-default border-none dark:text-gray-400'
                                                    : 'bg-white text-gray-700 hover:bg-gray-50 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600'
                                                }`}
                                        >
                                            {p}
                                        </button>
                                    ));
                                })()}

                                <button
                                    disabled={pagination.current_page === pagination.last_page}
                                    onClick={() => fetchData((pagination.current_page || 1) + 1)}
                                    className={`px-3 py-1 border rounded-md text-sm font-medium ${pagination.current_page === pagination.last_page ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 hover:bg-gray-50 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600'}`}
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal Generate Batch */}
            <Modal show={confirmingBatchGenerate} onClose={closeModal}>
                <div className="p-6">
                    <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                        Generate Tanda Terima Otomatis
                    </h2>

                    <div className="mt-4 mb-4">
                        <InputLabel htmlFor="generate_year" value="Tahun Anggaran" />
                        <select
                            id="generate_year"
                            value={generateYear}
                            onChange={(e) => setGenerateYear(e.target.value)}
                            className="mt-1 block w-full border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 focus:border-indigo-500 dark:focus:border-indigo-600 focus:ring-indigo-500 dark:focus:ring-indigo-600 rounded-md shadow-sm"
                            disabled={processing}
                        >
                            {availableYears.map((year) => (
                                <option key={year.id} value={year.id}>
                                    {year.tahun}
                                </option>
                            ))}
                        </select>
                    </div>

                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                        Anda akan memproses <strong>{generateCount}</strong> data transaksi BKU menjadi tanda terima secara otomatis untuk tahun anggaran yang dipilih.
                        <br />
                        Pastikan data BKU sudah benar sebelum melanjutkan.
                    </p>

                    {processing && (
                        <div className="mt-4">
                            <div className="flex justify-between mb-1">
                                <span className="text-sm font-medium text-indigo-700 dark:text-white">{progressStatus}</span>
                                <span className="text-sm font-medium text-indigo-700 dark:text-white">{progress}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                                <div
                                    className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300"
                                    style={{ width: `${progress}%` }}
                                ></div>
                            </div>
                        </div>
                    )}

                    <div className="mt-6 flex justify-end">
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
            <Modal show={confirmingDownload} onClose={closeModal}>
                <div className="p-6">
                    <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                        Download Semua Tanda Terima
                    </h2>

                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                        Anda akan mengunduh semua data tanda terima berdasarkan filter yang aktif saat ini.
                        <br />
                        Total Data: <strong>{pagination.total || stats.total}</strong>
                    </p>

                    <div className="mt-6 flex flex-col gap-3">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <InputLabel htmlFor="paper_size" value="Ukuran Kertas" />
                                <select
                                    id="paper_size"
                                    value={downloadSettings.paperSize}
                                    onChange={(e) => setDownloadSettings({ ...downloadSettings, paperSize: e.target.value })}
                                    className="mt-1 block w-full border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 focus:border-indigo-500 dark:focus:border-indigo-600 focus:ring-indigo-500 dark:focus:ring-indigo-600 rounded-md shadow-sm text-sm"
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
                                    className="mt-1 block w-full border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 focus:border-indigo-500 dark:focus:border-indigo-600 focus:ring-indigo-500 dark:focus:ring-indigo-600 rounded-md shadow-sm text-sm"
                                >
                                    <option value="8pt">8pt</option>
                                    <option value="9pt">9pt</option>
                                    <option value="10pt">10pt</option>
                                    <option value="11pt">11pt</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-2">
                            <SecondaryButton onClick={closeModal}>
                                Batal
                            </SecondaryButton>
                        </div>

                        <div className="grid grid-cols-1 gap-4 mt-2">
                            <button
                                onClick={() => processDownloadAll('current')}
                                className="flex flex-col items-center justify-center p-4 border-2 border-indigo-100 dark:border-indigo-900 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors group"
                            >
                                <span className="font-semibold text-indigo-600 dark:text-indigo-400 mb-1 group-hover:underline">Filter Saat Ini</span>
                                <span className="text-xs text-center text-gray-500 dark:text-gray-400">
                                    Download data sesuai pencarian & filter bulan/tahun yang aktif
                                </span>
                            </button>
                        </div>
                    </div>
                </div>
            </Modal>

            {/* Modal Delete All */}
            <Modal show={confirmingDeleteAll} onClose={closeModal}>
                <form onSubmit={processDeleteAll} className="p-6">
                    <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                        Hapus SEMUA Tanda Terima
                    </h2>

                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                        <strong>PERINGATAN:</strong> Tindakan ini tidak dapat dibatalkan! Semua data tanda terima yang telah digenerate akan dihapus.
                        Data BKU tidak akan terhapus, hanya tanda terimanya saja.
                    </p>

                    <div className="mt-6 flex justify-end">
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
                title="Pengaturan Cetak Tanda Terima"
            />

            {/* PDF Preview Modal */}
            <PdfPreviewModal
                show={showPreviewModal}
                onClose={() => setShowPreviewModal(false)}
                pdfUrl={previewUrl}
                title="Preview Tanda Terima"
            />
        </AuthenticatedLayout>
    );
}
