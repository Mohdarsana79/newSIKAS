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
import PageHeader from '@/Components/ui/PageHeader';
import Surface from '@/Components/ui/Surface';
import DataTable from '@/Components/ui/DataTable';
import EmptyState from '@/Components/ui/EmptyState';
import IconTile from '@/Components/ui/IconTile';
import StatusBadge from '@/Components/ui/StatusBadge';

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

    const [isOnline, setIsOnline] = useState(typeof window !== 'undefined' ? window.navigator.onLine : true);

    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

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
        <AuthenticatedLayout>
            <Head title="Sinkronisasi Data" />

            <div className="space-y-4">
                <PageHeader
                    className="animate-rise"
                    breadcrumb={[
                        { label: 'Dashboard' },
                        { label: 'Integrasi' },
                        { label: 'Sinkronisasi' },
                    ]}
                    title="Integrasi & Sinkronisasi"
                    badge={<StatusBadge tone={isOnline ? 'success' : 'danger'}>{isOnline ? 'Online' : 'Offline'}</StatusBadge>}
                    subtitle="Singkronisasikan data penganggaran (RKAS) dan realisasi (BKU) ke website publik sekolah."
                />

                {/* Main Card */}
                <Surface className="animate-rise" padding="lg">
                    <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
                        <div className="max-w-2xl">
                            <div className={`mb-4 inline-flex items-center gap-2 rounded-full px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.14em] ${isOnline ? 'bg-pastel-mint text-mint dark:bg-mint/10 dark:text-mint' : 'bg-pastel-rose text-rose-600 dark:bg-rose-500/10 dark:text-rose-300'}`}>
                                <div className={`h-2 w-2 rounded-full ${isOnline ? 'bg-mint animate-pulse-soft' : 'bg-rose-500'}`}></div>
                                Status jaringan: {isOnline ? 'Online' : 'Offline'}
                            </div>
                            <h3 className="text-[18px] font-extrabold tracking-tight text-slate-900 dark:text-white">
                                Kirim Data ke Website
                            </h3>
                            <p className="mt-3 text-[11.5px] font-medium leading-relaxed text-slate-500 dark:text-slate-400">
                                Singkronisasikan data penganggaran (RKAS) dan realisasi (BKU) ke website publik sekolah untuk menjaga transparansi informasi publik.
                            </p>

                            {sekolah?.website_sync_url && (
                                <div className="mt-4 flex items-center gap-2 font-mono text-[10px] italic text-slate-400 dark:text-slate-500">
                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                    </svg>
                                    {sekolah.website_sync_url}
                                </div>
                            )}
                        </div>

                        <div className="min-w-[320px] rounded-[22px] border border-slate-100 bg-slate-50/60 p-6 dark:border-white/5 dark:bg-white/[0.02]">
                            <form onSubmit={handleSync} className="space-y-5">
                                <div>
                                    <label className="mb-2 block text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">Tahun Anggaran</label>
                                    <select
                                        id="tahun"
                                        value={data.tahun}
                                        onChange={(e) => setData('tahun', parseInt(e.target.value))}
                                        className="w-full cursor-pointer rounded-2xl border-2 border-slate-100 bg-white px-4 py-3 text-[11.5px] font-extrabold text-slate-700 transition-all focus:border-lime-400 focus:ring-0 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:focus:border-lime-400/70"
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
                                    className="flex w-full items-center justify-center gap-3 rounded-2xl bg-lime-400 px-6 py-4 text-[11.5px] font-extrabold text-slate-950 shadow-lime transition-all hover:-translate-y-0.5 hover:bg-lime-300 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:hover:translate-y-0 dark:disabled:bg-white/10 dark:disabled:text-slate-500"
                                >
                                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                    </svg>
                                    Singkronkan Data
                                </button>
                            </form>
                        </div>
                    </div>
                </Surface>

                {/* History Section */}
                <div className="animate-rise" style={{ animationDelay: '110ms' }}>
                    <DataTable
                        title="Riwayat Sinkronisasi"
                        subtitle="Log aktivitas pengiriman data ke server luar."
                        icon={
                            <IconTile tone="sky" size="sm">
                                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </IconTile>
                        }
                        actions={<StatusBadge tone="info" dot={false} className="text-sikas-num">{syncLogs.length} Total Log</StatusBadge>}
                        contentClassName="bento-table-wrapper mx-4 mb-4"
                        footer={
                            totalLogs >= itemsPerPage ? (
                                <>
                                    <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">
                                        Halaman <span className="text-sikas-num font-extrabold text-slate-700 dark:text-slate-200">{currentPage}</span> dari <span className="text-sikas-num font-extrabold text-slate-700 dark:text-slate-200">{totalPages}</span>
                                    </span>
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                            disabled={currentPage === 1}
                                            className="flex h-7 w-7 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-400 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/10 dark:bg-white/5 dark:text-slate-500"
                                        >
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                            </svg>
                                        </button>

                                        {[...Array(totalPages)].map((_, i) => (
                                            <button
                                                key={i + 1}
                                                onClick={() => setCurrentPage(i + 1)}
                                                className={`flex h-7 min-w-7 items-center justify-center rounded-xl px-2 text-[10px] font-extrabold transition text-sikas-num ${
                                                    currentPage === i + 1
                                                        ? 'bg-lime-400 text-slate-950 shadow-lime'
                                                        : 'text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-white/5'
                                                }`}
                                            >
                                                {i + 1}
                                            </button>
                                        ))}

                                        <button
                                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                            disabled={currentPage === totalPages}
                                            className="flex h-7 w-7 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-400 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/10 dark:bg-white/5 dark:text-slate-500"
                                        >
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                            </svg>
                                        </button>
                                    </div>
                                </>
                            ) : undefined
                        }
                    >
                        <table className="min-w-full">
                            <thead>
                                <tr>
                                    <th className="text-left">ID</th>
                                    <th className="text-left">Waktu Eksekusi</th>
                                    <th className="text-left">Tahun</th>
                                    <th className="text-left">Status</th>
                                    <th className="text-left">Respon Server</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedLogs.length > 0 ? (
                                    paginatedLogs.map((log) => (
                                        <tr key={log.id}>
                                            <td className="whitespace-nowrap font-mono text-slate-400 dark:text-slate-500">#{log.id}</td>
                                            <td className="whitespace-nowrap font-semibold text-slate-600 dark:text-slate-300">
                                                {new Date(log.created_at).toLocaleString('id-ID', {
                                                    dateStyle: 'medium',
                                                    timeStyle: 'short'
                                                })}
                                            </td>
                                            <td className="whitespace-nowrap text-sikas-num font-extrabold text-slate-900 dark:text-white">
                                                {log.tahun}
                                            </td>
                                            <td className="whitespace-nowrap">
                                                <StatusBadge tone={log.status === 'success' ? 'success' : 'danger'}>
                                                    {log.status === 'success' ? 'Berhasil' : 'Gagal'}
                                                </StatusBadge>
                                            </td>
                                            <td className="max-w-xs truncate font-medium italic text-slate-500 dark:text-slate-400">
                                                {log.message}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={5} className="p-0">
                                            <EmptyState
                                                className="border-0 bg-transparent py-10 dark:bg-transparent"
                                                icon={
                                                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                }
                                                title="Belum ada riwayat aktivitas"
                                            />
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </DataTable>
                </div>
            </div>

            <Modal show={isModalOpen} onClose={closeModal} maxWidth="2xl">
                <div className="relative overflow-hidden bg-white dark:bg-[#15131F]">
                    <div className="pointer-events-none absolute -right-12 -top-20 h-52 w-52 rounded-full bg-brand-500/10 blur-3xl" />
                    <div className="relative flex items-start justify-between gap-3 border-b border-slate-100 px-6 py-4 dark:border-white/5">
                        <div className="flex items-center gap-3">
                            <IconTile tone="violet" size="lg">
                                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                            </IconTile>
                            <div className="min-w-0">
                                <h3 className="text-[14px] font-extrabold tracking-tight text-slate-900 dark:text-white">
                                    Sinkronisasi Aktif
                                </h3>
                                <p className="mt-0.5 text-[10px] font-medium text-slate-400 dark:text-slate-500">Tahun Anggaran {data.tahun}</p>
                            </div>
                        </div>
                        {!isSyncing || syncFinished ? (
                            <button onClick={closeModal} className="inline-flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-slate-100 dark:text-slate-500 dark:hover:bg-white/5">
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        ) : null}
                    </div>

                    <div className="px-6 py-5">
                        {/* Progress Bar */}
                        <div className="mb-8">
                            <div className="mb-3 flex justify-between text-[10px] font-extrabold uppercase tracking-[0.14em]">
                                <span className="text-slate-400 dark:text-slate-500">{syncFinished ? 'Selesai' : 'Sedang Mengirim...'}</span>
                                <span className="text-sikas-num text-brand-600 dark:text-brand-300">{progress}%</span>
                            </div>
                            <div className="h-4 w-full overflow-hidden rounded-full bg-slate-100 p-1 dark:bg-white/10">
                                <div
                                    className="h-2 rounded-full bg-gradient-to-r from-brand-500 to-brand-600 shadow-sm transition-all duration-300 ease-out"
                                    style={{ width: `${progress}%` }}
                                ></div>
                            </div>
                        </div>

                        {syncFinished ? (
                            <div className="mb-8 flex flex-col items-center justify-center rounded-[22px] border border-mint/20 bg-pastel-mint/60 py-12 dark:border-mint/20 dark:bg-mint/10">
                                <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-white text-mint shadow-float dark:bg-[#15131F]">
                                    <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                                <h4 className="text-[18px] font-extrabold text-slate-900 dark:text-white">Berhasil!</h4>
                                <p className="mt-2 text-[11.5px] font-semibold text-mint">Data telah sinkron dengan website sekolah.</p>
                            </div>
                        ) : (
                            <div className="mb-8 grid h-[420px] grid-cols-1 gap-4 md:grid-cols-2">
                                {/* Logs */}
                                <div className="sikas-scroll overflow-y-auto rounded-[22px] border border-slate-100 bg-slate-50/60 p-4 dark:border-white/5 dark:bg-white/[0.02]">
                                    <h4 className="mb-4 text-[9px] font-extrabold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">System Console</h4>
                                    <div className="space-y-2.5">
                                        {logs.map((log, index) => (
                                            <div key={index} className="flex gap-3 font-mono text-[10px] font-medium text-slate-600 dark:text-slate-400">
                                                <span className="shrink-0 text-brand-500 opacity-60">{new Date().toLocaleTimeString([], { hour12: false })}</span>
                                                <span className="break-words leading-relaxed">{log}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Data Preview */}
                                <div className="flex flex-col overflow-hidden rounded-[22px] border border-slate-100 bg-slate-50/60 p-4 dark:border-white/5 dark:bg-white/[0.02]">
                                    <h4 className="mb-4 text-[9px] font-extrabold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">Payload Preview</h4>
                                    {payloadPreview ? (
                                        <div className="sikas-scroll flex-1 overflow-y-auto pr-2">
                                            <div className="space-y-4">
                                                <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm dark:border-white/5 dark:bg-white/5">
                                                    <p className="mb-3 text-[9px] font-extrabold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">Snapshot</p>
                                                    <div className="space-y-3">
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-[10.5px] font-medium text-slate-500 dark:text-slate-400">Pagu:</span>
                                                            <span className="text-sikas-num text-[11px] font-extrabold text-slate-900 dark:text-white">Rp {payloadPreview.data.summary.pagu_anggaran.toLocaleString()}</span>
                                                        </div>
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-[10.5px] font-medium text-slate-500 dark:text-slate-400">Realisasi:</span>
                                                            <span className="text-sikas-num text-[11px] font-extrabold text-brand-600 dark:text-brand-300">Rp {payloadPreview.data.summary.total_realisasi.toLocaleString()}</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm dark:border-white/5 dark:bg-white/5">
                                                    <p className="mb-4 text-[9px] font-extrabold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">Program Details ({payloadPreview.data.details.length})</p>
                                                    <div className="space-y-4">
                                                        {payloadPreview.data.details.map((item: any, i: number) => (
                                                            <div key={i} className="border-b border-slate-100 pb-3 last:border-0 last:pb-0 dark:border-white/5">
                                                                <p className="mb-2 text-[10.5px] font-extrabold leading-tight text-slate-700 dark:text-slate-300">{item.nama_kegiatan}</p>
                                                                <div className="grid grid-cols-2 gap-2 text-[9.5px]">
                                                                    <div className="font-medium italic text-slate-400 dark:text-slate-500">Angg: {item.anggaran.toLocaleString()}</div>
                                                                    <div className="text-sikas-num text-right font-extrabold text-brand-500 dark:text-brand-300">Real: {item.realisasi.toLocaleString()}</div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex flex-1 flex-col items-center justify-center text-slate-300 dark:text-slate-600">
                                            <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-slate-100 border-t-brand-500 dark:border-white/10 dark:border-t-brand-400"></div>
                                            <p className="text-[9px] font-extrabold uppercase tracking-[0.18em]">Processing Data</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4 dark:border-white/5">
                            <SecondaryButton
                                onClick={closeModal}
                                disabled={isSyncing && !syncFinished}
                            >
                                {syncFinished ? 'Selesai' : 'Batalkan'}
                            </SecondaryButton>
                        </div>
                    </div>
                </div>
            </Modal>
        </AuthenticatedLayout>
    );
}
