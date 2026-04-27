import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, router } from '@inertiajs/react';
import { PageProps } from '@/types';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import InputLabel from '@/Components/InputLabel';
import InputError from '@/Components/InputError';
import Modal from '@/Components/Modal';
import { FormEventHandler, useState, useEffect } from 'react';
import axios from 'axios';

interface Sekolah {
    id: number;
    nama_sekolah: string;
    website_sync_url?: string;
}

interface SyncLog {
    id: number;
    tahun: number;
    status: 'success' | 'failed';
    message: string;
    created_at: string;
}

export default function Sync({ auth, sekolah, availableYears, syncLogs }: PageProps<{ sekolah?: Sekolah; availableYears: number[]; syncLogs: SyncLog[] }>) {
    const currentYear = new Date().getFullYear();
    const defaultYear = availableYears.length > 0 ? availableYears[0] : currentYear;
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [progress, setProgress] = useState(0);
    const [logs, setLogs] = useState<string[]>([]);
    const [payloadPreview, setPayloadPreview] = useState<any>(null);
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncFinished, setSyncFinished] = useState(false);
    
    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;
    const totalLogs = syncLogs?.length || 0;
    const totalPages = Math.ceil(totalLogs / itemsPerPage);
    
    const paginatedLogs = (syncLogs || []).slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const { data, setData, post, processing, errors } = useForm({
        tahun: defaultYear,
    });

    const handleSync = async (e: React.FormEvent) => {
        e.preventDefault();
        
        setIsModalOpen(true);
        setIsSyncing(true);
        setSyncFinished(false);
        setProgress(0);
        setLogs(['[1/3] Menyiapkan proses sinkronisasi...']);
        setPayloadPreview(null);

        try {
            // Step 1: Preview Data
            setProgress(15);
            setLogs(prev => [...prev, '[2/3] Mengambil data dari database...']);
            const previewRes = await axios.get(route('integrasi.sync.preview', { tahun: data.tahun }));
            
            if (previewRes.data.success) {
                setPayloadPreview(previewRes.data.payload);
                setLogs(prev => [...prev, 'Data berhasil dikumpulkan.']);
                setProgress(40);

                // Wait a bit so user can see the data
                await new Promise(resolve => setTimeout(resolve, 1000));

                // Step 2: Sending
                setLogs(prev => [...prev, `[3/3] Mengirim data ke ${sekolah?.website_sync_url}...`]);
                
                // Simulated smooth progress for sending phase
                const interval = setInterval(() => {
                    setProgress(p => {
                        if (p >= 95) {
                            clearInterval(interval);
                            return 95;
                        }
                        return p + 1;
                    });
                }, 100);

                const syncRes = await axios.post(route('integrasi.sync.store'), { tahun: data.tahun });
                
                clearInterval(interval);
                
                if (syncRes.data.success) {
                    setProgress(100);
                    setLogs(prev => [...prev, 'Sinkronisasi berhasil diselesaikan.']);
                    setSyncFinished(true);
                } else {
                    setLogs(prev => [...prev, 'ERROR: ' + syncRes.data.message]);
                    setIsSyncing(false);
                }
            } else {
                setLogs(prev => [...prev, 'ERROR: ' + previewRes.data.message]);
                setIsSyncing(false);
            }
        } catch (error: any) {
            setLogs(prev => [...prev, 'Koneksi terputus atau terjadi kesalahan server.']);
            setIsSyncing(false);
        }
    };

    const closeModal = () => {
        if (!isSyncing || syncFinished) {
            setIsModalOpen(false);
            if (syncFinished) {
                router.reload();
            }
        }
    };

    return (
        <AuthenticatedLayout
            header={<h2 className="font-outfit font-black text-xl text-gray-800 dark:text-gray-200 leading-tight">Integrasi & Sinkronisasi</h2>}
        >
            <Head title="Sinkronisasi Data" />

            <div className="py-12 bg-gray-50/50 dark:bg-gray-950 min-h-screen" style={{ fontSize: '10pt' }}>
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8 space-y-8">
                    {/* Main Card */}
                    <div className="bg-white dark:bg-gray-900 overflow-hidden shadow-xl shadow-gray-200/50 dark:shadow-none sm:rounded-[2.5rem] border border-gray-100 dark:border-gray-800">
                        <div className="p-8 md:p-12">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
                                <div className="max-w-2xl">
                                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 font-bold uppercase tracking-wider mb-6" style={{ fontSize: '9pt' }}>
                                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                                        Status Koneksi: Terhubung
                                    </div>
                                    <h3 className="text-2xl font-outfit font-black text-gray-900 dark:text-gray-100">
                                        Kirim Data ke Website
                                    </h3>
                                    <p className="mt-4 text-gray-600 dark:text-gray-400 leading-relaxed">
                                        Singkronisasikan data penganggaran (RKAS) dan realisasi (BKU) ke website publik sekolah untuk menjaga transparansi informasi publik.
                                    </p>

                                    {sekolah?.website_sync_url && (
                                        <div className="mt-6 flex items-center gap-2 text-gray-400 font-mono italic" style={{ fontSize: '9pt' }}>
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                            </svg>
                                            {sekolah.website_sync_url}
                                        </div>
                                    )}
                                </div>

                                <div className="bg-gray-50 dark:bg-gray-800/50 p-8 rounded-[2rem] border border-gray-100 dark:border-gray-700 min-w-[320px]">
                                    <form onSubmit={handleSync} className="space-y-6">
                                        <div>
                                            <label className="font-bold text-gray-500 dark:text-gray-400 mb-2 block">Tahun Anggaran</label>
                                            <select
                                                id="tahun"
                                                value={data.tahun}
                                                onChange={(e) => setData('tahun', parseInt(e.target.value))}
                                                className="w-full bg-white dark:bg-gray-900 border-2 border-gray-100 dark:border-gray-800 rounded-2xl px-4 py-3 font-bold text-gray-700 dark:text-gray-300 focus:border-indigo-500 focus:ring-0 transition-all cursor-pointer"
                                                style={{ fontSize: '10pt' }}
                                                disabled={!sekolah?.website_sync_url || availableYears.length === 0}
                                            >
                                                {availableYears.length > 0 ? (
                                                    availableYears.map(year => (
                                                        <option key={year} value={year}>Tahun Anggaran {year}</option>
                                                    ))
                                                ) : (
                                                    <option value="">Tidak ada data</option>
                                                )}
                                            </select>
                                        </div>

                                        <button 
                                            type="submit"
                                            disabled={isSyncing || !sekolah?.website_sync_url || availableYears.length === 0}
                                            className="w-full py-4 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-200 dark:disabled:bg-gray-800 text-white font-bold transition-all shadow-lg shadow-indigo-200 dark:shadow-none flex items-center justify-center gap-3 active:scale-[0.98]"
                                            style={{ fontSize: '10pt' }}
                                        >
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                            </svg>
                                            Singkronkan Data
                                        </button>
                                    </form>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* History Section */}
                    <div className="bg-white dark:bg-gray-900 shadow-xl shadow-gray-200/50 dark:shadow-none sm:rounded-[2.5rem] border border-gray-100 dark:border-gray-800 overflow-hidden">
                        <div className="p-8 border-b border-gray-50 dark:border-gray-800 flex items-center justify-between">
                            <div>
                                <h4 className="font-outfit font-black text-xl text-gray-900 dark:text-gray-100">Riwayat Sinkronisasi</h4>
                                <p className="text-gray-500 mt-1 font-medium">Log aktivitas pengiriman data ke server luar.</p>
                            </div>
                            <div className="bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 px-4 py-2 rounded-xl font-black uppercase tracking-widest" style={{ fontSize: '9pt' }}>
                                {syncLogs.length} Total Log
                            </div>
                        </div>
                        
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-gray-50/50 dark:bg-gray-800/50 text-gray-400 font-black uppercase tracking-widest" style={{ fontSize: '9pt' }}>
                                        <th className="px-8 py-4">ID</th>
                                        <th className="px-8 py-4">Waktu Eksekusi</th>
                                        <th className="px-8 py-4">Tahun</th>
                                        <th className="px-8 py-4">Status</th>
                                        <th className="px-8 py-4">Respon Server</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                                    {paginatedLogs.length > 0 ? (
                                        paginatedLogs.map((log) => (
                                            <tr key={log.id} className="hover:bg-gray-50/30 dark:hover:bg-gray-800/30 transition-colors">
                                                <td className="px-8 py-5 text-gray-400 font-mono" style={{ fontSize: '9pt' }}>#{log.id}</td>
                                                <td className="px-8 py-5 text-gray-600 dark:text-gray-400 font-medium">
                                                    {new Date(log.created_at).toLocaleString('id-ID', { 
                                                        dateStyle: 'medium', 
                                                        timeStyle: 'short' 
                                                    })}
                                                </td>
                                                <td className="px-8 py-5 font-black text-gray-900 dark:text-gray-100">
                                                    {log.tahun}
                                                </td>
                                                <td className="px-8 py-5">
                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-black uppercase tracking-wider" style={{ fontSize: '8pt', backgroundColor: log.status === 'success' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)', color: log.status === 'success' ? '#15803d' : '#b91c1c' }}>
                                                        <div className={`w-1 h-1 rounded-full ${log.status === 'success' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                                        {log.status === 'success' ? 'Berhasil' : 'Gagal'}
                                                    </span>
                                                </td>
                                                <td className="px-8 py-5 text-gray-500 dark:text-gray-400 italic leading-relaxed max-w-xs truncate">
                                                    {log.message}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={5} className="px-8 py-20 text-center">
                                                <div className="flex flex-col items-center justify-center text-gray-300 dark:text-gray-600">
                                                    <svg className="w-12 h-12 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                    <p className="font-bold uppercase tracking-widest" style={{ fontSize: '9pt' }}>Belum ada riwayat aktivitas</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination Buttons */}
                        {totalLogs >= itemsPerPage && (
                            <div className="p-8 border-t border-gray-50 dark:border-gray-800 flex items-center justify-center gap-2">
                                <button 
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className="p-2 rounded-xl border border-gray-100 dark:border-gray-800 text-gray-500 disabled:opacity-30 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                    </svg>
                                </button>
                                
                                <div className="flex items-center gap-1">
                                    {[...Array(totalPages)].map((_, i) => (
                                        <button
                                            key={i + 1}
                                            onClick={() => setCurrentPage(i + 1)}
                                            className={`w-8 h-8 rounded-xl font-black transition-all ${
                                                currentPage === i + 1 
                                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100 dark:shadow-none' 
                                                : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800'
                                            }`}
                                            style={{ fontSize: '9pt' }}
                                        >
                                            {i + 1}
                                        </button>
                                    ))}
                                </div>

                                <button 
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                    className="p-2 rounded-xl border border-gray-100 dark:border-gray-800 text-gray-500 disabled:opacity-30 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <Modal show={isModalOpen} onClose={closeModal} maxWidth="2xl">
                <div className="p-8" style={{ fontSize: '10pt' }}>
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-xl font-outfit font-black text-gray-900 dark:text-gray-100">
                                Sinkronisasi Aktif
                            </h3>
                            <p className="font-medium text-gray-500">Tahun Anggaran {data.tahun}</p>
                        </div>
                        {!isSyncing || syncFinished ? (
                            <button onClick={closeModal} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                                <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        ) : null}
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-10">
                        <div className="flex justify-between mb-3 font-black uppercase tracking-wider" style={{ fontSize: '9pt' }}>
                            <span className="text-gray-400">{syncFinished ? 'Selesai' : 'Sedang Mengirim...'}</span>
                            <span className="text-indigo-600 dark:text-indigo-400">{progress}%</span>
                        </div>
                        <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-4 overflow-hidden p-1">
                            <div 
                                className="bg-gradient-to-r from-indigo-500 to-indigo-600 h-2 rounded-full transition-all duration-300 ease-out shadow-sm" 
                                style={{ width: `${progress}%` }}
                            ></div>
                        </div>
                    </div>

                    {syncFinished ? (
                        <div className="flex flex-col items-center justify-center py-12 bg-indigo-50/50 dark:bg-indigo-900/10 rounded-[2rem] border border-indigo-100 dark:border-indigo-800/50 mb-8">
                            <div className="w-20 h-20 bg-white dark:bg-indigo-900 rounded-full flex items-center justify-center mb-6 text-indigo-600 dark:text-indigo-400 shadow-xl shadow-indigo-100 dark:shadow-none">
                                <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <h4 className="text-xl font-outfit font-black text-indigo-900 dark:text-indigo-300">Berhasil!</h4>
                            <p className="mt-2 font-medium text-indigo-600 dark:text-indigo-400">Data telah sinkron dengan website sekolah.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 h-[420px] mb-8">
                            {/* Logs */}
                            <div className="bg-gray-50/50 dark:bg-gray-950 p-6 rounded-[2rem] border border-gray-100 dark:border-gray-800 overflow-y-auto custom-scrollbar">
                                <h4 className="font-black text-gray-400 uppercase tracking-widest mb-4" style={{ fontSize: '8pt' }}>System Console</h4>
                                <div className="space-y-3">
                                    {logs.map((log, index) => (
                                        <div key={index} className="font-mono text-gray-600 dark:text-gray-400 flex gap-3" style={{ fontSize: '9pt' }}>
                                            <span className="text-indigo-400 opacity-50 shrink-0">{new Date().toLocaleTimeString([], { hour12: false })}</span>
                                            <span className="break-words leading-relaxed">{log}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Data Preview */}
                            <div className="bg-gray-50/50 dark:bg-gray-950 p-6 rounded-[2rem] border border-gray-100 dark:border-gray-800 flex flex-col overflow-hidden">
                                <h4 className="font-black text-gray-400 uppercase tracking-widest mb-4" style={{ fontSize: '8pt' }}>Payload Preview</h4>
                                {payloadPreview ? (
                                    <div className="overflow-y-auto flex-1 pr-2 custom-scrollbar">
                                        <div className="space-y-6">
                                            <div className="p-5 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
                                                <p className="font-black text-gray-400 uppercase tracking-widest mb-3" style={{ fontSize: '8pt' }}>Snapshot</p>
                                                <div className="space-y-3">
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-gray-500">Pagu:</span>
                                                        <span className="font-black text-gray-900 dark:text-white">Rp {payloadPreview.data.summary.pagu_anggaran.toLocaleString()}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-gray-500">Realisasi:</span>
                                                        <span className="font-black text-indigo-600">Rp {payloadPreview.data.summary.total_realisasi.toLocaleString()}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            <div className="p-5 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
                                                <p className="font-black text-gray-400 uppercase tracking-widest mb-4" style={{ fontSize: '8pt' }}>Program Details ({payloadPreview.data.details.length})</p>
                                                <div className="space-y-4">
                                                    {payloadPreview.data.details.map((item: any, i: number) => (
                                                        <div key={i} className="pb-4 border-b border-gray-50 dark:border-gray-800 last:border-0 last:pb-0">
                                                            <p className="font-bold text-gray-700 dark:text-gray-300 leading-tight mb-2" style={{ fontSize: '9pt' }}>{item.nama_kegiatan}</p>
                                                            <div className="grid grid-cols-2 gap-2" style={{ fontSize: '8pt' }}>
                                                                <div className="text-gray-400 italic">Angg: {item.anggaran.toLocaleString()}</div>
                                                                <div className="text-indigo-400 font-bold text-right">Real: {item.realisasi.toLocaleString()}</div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex-1 flex flex-col items-center justify-center text-gray-300 dark:text-gray-700">
                                        <div className="w-12 h-12 border-4 border-gray-100 dark:border-gray-800 border-t-indigo-500 rounded-full animate-spin mb-4"></div>
                                        <p className="font-black uppercase tracking-widest" style={{ fontSize: '8pt' }}>Processing Data</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="flex justify-end gap-3">
                        <SecondaryButton 
                            onClick={closeModal} 
                            disabled={isSyncing && !syncFinished}
                            className="rounded-xl px-8 border-none bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200"
                            style={{ fontSize: '10pt' }}
                        >
                            {syncFinished ? 'Selesai' : 'Batalkan'}
                        </SecondaryButton>
                    </div>
                </div>
            </Modal>
        </AuthenticatedLayout>
    );
}
