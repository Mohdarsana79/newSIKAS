import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';
import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import Modal from '@/Components/Modal';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import PageHeader from '@/Components/ui/PageHeader';
import Surface from '@/Components/ui/Surface';
import IconTile from '@/Components/ui/IconTile';
import StatusBadge from '@/Components/ui/StatusBadge';

interface ReleaseAsset {
    name: string;
    size: number;
    size_formatted: string;
    api_url: string;
    download_url: string;
}

interface UpdateInfo {
    status: 'ok' | 'error';
    error_message: string | null;
    current_version: string;
    latest_version: string;
    tag_name: string;
    release_name: string;
    changelog: string;
    published_at: string;
    has_update: boolean;
    asset: ReleaseAsset | null;
    checked_at: string | null;
}

interface BackupSummary {
    count: number;
    latest_name: string | null;
    latest_date: string;
    latest_size: string;
}

interface PageProps {
    updateInfo: UpdateInfo;
    backupSummary: BackupSummary;
}

type UpdatePhase = 'idle' | 'confirm' | 'backing_up' | 'downloading' | 'verifying' | 'installing' | 'completed' | 'error';

export default function SystemUpdateIndex({ updateInfo: initialUpdateInfo, backupSummary }: PageProps) {
    const [info, setInfo] = useState<UpdateInfo>(initialUpdateInfo);
    const [isChecking, setIsChecking] = useState(false);
    const [checkFeedback, setCheckFeedback] = useState<{ type: 'success' | 'info' | 'error'; text: string } | null>(null);

    // Manual file upload state
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [manualFile, setManualFile] = useState<File | null>(null);

    // Update Modal & Progress state
    const [showModal, setShowModal] = useState(false);
    const [updateMode, setUpdateMode] = useState<'online' | 'manual'>('online');
    const [phase, setPhase] = useState<UpdatePhase>('idle');
    const [progress, setProgress] = useState<number>(0);
    const [statusMessage, setStatusMessage] = useState<string>('');
    const [errorMessage, setErrorMessage] = useState<string>('');
    const [createdBackupFile, setCreatedBackupFile] = useState<string | null>(null);
    const [failedStep, setFailedStep] = useState<number>(1);

    const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const installWaitTicksRef = useRef<number>(0);
    const serverRestartSeenRef = useRef<boolean>(false);

    const stopPolling = () => {
        if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
        }
    };

    useEffect(() => {
        return () => stopPolling();
    }, []);

    const handleCheckUpdate = async () => {
        setIsChecking(true);
        setCheckFeedback(null);
        try {
            const res = await axios.post(route('system-update.check'));
            if (res.data?.updateInfo) {
                const updated: UpdateInfo = res.data.updateInfo;
                setInfo(updated);
                if (updated.status === 'error' && updated.error_message) {
                    setCheckFeedback({ type: 'error', text: updated.error_message });
                } else if (updated.has_update) {
                    setCheckFeedback({
                        type: 'success',
                        text: `Pembaharuan versi v${updated.latest_version} tersedia dan siap dipasang!`,
                    });
                } else {
                    setCheckFeedback({
                        type: 'info',
                        text: `Aplikasi Anda sudah menggunakan versi terbaru (v${updated.current_version}).`,
                    });
                }
                router.reload({ only: ['systemUpdate'] });
            }
        } catch (err: any) {
            setCheckFeedback({
                type: 'error',
                text: err?.response?.data?.message || 'Gagal memeriksa pembaharuan ke server GitHub.',
            });
        } finally {
            setIsChecking(false);
        }
    };

    const resetModalState = (mode: 'online' | 'manual') => {
        setUpdateMode(mode);
        setPhase('confirm');
        setProgress(0);
        setStatusMessage('');
        setErrorMessage('');
        setCreatedBackupFile(null);
        setFailedStep(1);
        setShowModal(true);
    };

    const openOnlineUpdateConfirm = () => {
        resetModalState('online');
    };

    const handleManualFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selected = e.target.files?.[0];
        if (!selected) return;
        e.target.value = '';

        if (!selected.name.toLowerCase().endsWith('.exe')) {
            setCheckFeedback({
                type: 'error',
                text: 'Berkas pembaharuan manual harus berformat installer Windows (.exe).',
            });
            return;
        }

        setManualFile(selected);
        resetModalState('manual');
    };

    const startPollingProgress = (updateId: string, initialVersion: string) => {
        stopPolling();
        installWaitTicksRef.current = 0;
        serverRestartSeenRef.current = false;

        pollingRef.current = setInterval(async () => {
            try {
                const res = await axios.get(route('system-update.progress', { updateId }), {
                    timeout: 4000,
                    headers: { 'Cache-Control': 'no-cache' },
                });
                const data = res.data;
                if (!data) return;

                if (data.backup_file) {
                    setCreatedBackupFile(data.backup_file);
                }

                if (typeof data.percent === 'number') {
                    setProgress((prev) => Math.max(prev, data.percent));
                }
                if (data.message) {
                    setStatusMessage(data.message);
                }

                if (data.phase === 'error') {
                    setFailedStep(typeof data.failed_step === 'number' ? data.failed_step : data.backup_file ? 2 : 1);
                    setPhase('error');
                    setErrorMessage(data.message || 'Terjadi kesalahan saat memasang pembaharuan.');
                    stopPolling();
                    return;
                }

                if (data.phase === 'completed') {
                    setPhase('completed');
                    setProgress(100);
                    setStatusMessage(data.message || 'Pembaharuan berhasil dipasang!');
                    stopPolling();
                    return;
                }

                if (data.phase === 'backing_up') {
                    setFailedStep(1);
                    setPhase('backing_up');
                } else if (data.phase === 'downloading' || data.phase === 'verifying') {
                    setFailedStep(2);
                    setPhase(data.phase);
                } else if (data.phase === 'installing') {
                    setFailedStep(3);
                    setPhase('installing');
                    installWaitTicksRef.current += 1;

                    // Selesai apabila server sempat restart (koneksi sempat terputus lalu nyambung lagi) atau versi berubah
                    if (
                        serverRestartSeenRef.current ||
                        (data.current_version && data.current_version !== initialVersion)
                    ) {
                        setPhase('completed');
                        setProgress(100);
                        setStatusMessage(
                            `Pembaharuan selesai dipasang! Layanan server telah aktif kembali (v${data.current_version || info.latest_version}).`
                        );
                        stopPolling();
                    } else {
                        setProgress((prev) => Math.min(96, Math.max(prev, 88 + Math.min(8, installWaitTicksRef.current))));
                    }
                }
            } catch {
                // Saat Inno Setup menghentikan newsikas_server (Apache) untuk mengganti file,
                // request polling akan gagal sementara — ini tanda normal bahwa installer sedang bekerja!
                serverRestartSeenRef.current = true;
                setFailedStep(3);
                setPhase('installing');
                setProgress((prev) => Math.min(97, Math.max(prev, 92)));
                setStatusMessage(
                    'Installer sedang mengekstrak berkas baru & memulai ulang layanan Apache. Mohon tunggu sebentar...'
                );
            }
        }, 2000);
    };

    const handleLaunchResponse = (data: any, fallbackError: string) => {
        if (data?.backup_file) {
            setCreatedBackupFile(data.backup_file);
        }

        if (data?.success) {
            setFailedStep(3);
            setPhase('installing');
            setProgress(88);
            setStatusMessage(
                'Tahap 3/3: Memasang pembaharuan & memulai ulang layanan server. Mohon tunggu 15–30 detik...'
            );
        } else {
            stopPolling();
            setPhase('error');
            setErrorMessage(data?.message || fallbackError);
        }
    };

    const executeUpdate = async () => {
        const updateId = 'upd_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
        const initialVersion = info.current_version;

        setFailedStep(1);
        setPhase('backing_up');
        setProgress(10);
        setErrorMessage('');
        setStatusMessage('Tahap 1/3: Membuat cadangan (auto-backup) database & berkas sebelum pembaharuan...');

        startPollingProgress(updateId, initialVersion);

        try {
            if (updateMode === 'online') {
                const res = await axios.post(route('system-update.start-online'), {
                    update_id: updateId,
                });
                handleLaunchResponse(res.data, 'Gagal memulai proses pembaharuan online.');
            } else {
                if (!manualFile) {
                    stopPolling();
                    setPhase('error');
                    setErrorMessage('Berkas installer (.exe) belum dipilih.');
                    return;
                }

                const formData = new FormData();
                formData.append('update_id', updateId);
                formData.append('installer_file', manualFile);

                const res = await axios.post(route('system-update.upload-manual'), formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                    onUploadProgress: (progressEvent) => {
                        if (progressEvent.total) {
                            const uploadRatio = progressEvent.loaded / progressEvent.total;
                            const mapped = Math.round(15 + uploadRatio * 50);
                            setProgress((prev) => Math.max(prev, Math.min(65, mapped)));
                        }
                    },
                });
                handleLaunchResponse(res.data, 'Gagal memproses berkas installer manual.');
            }
        } catch (err: any) {
            if (!err?.response && phase === 'installing') {
                serverRestartSeenRef.current = true;
                return;
            }
            stopPolling();
            setPhase('error');
            setErrorMessage(
                err?.response?.data?.message ||
                    err?.message ||
                    'Terjadi kesalahan saat menjalankan proses pembaharuan.'
            );
        }
    };

    const isBusy = phase === 'backing_up' || phase === 'downloading' || phase === 'verifying' || phase === 'installing';

    const closeModal = () => {
        if (isBusy) return;
        stopPolling();
        setShowModal(false);
        setPhase('idle');
    };

    const getStepStatus = (stepNumber: 1 | 2 | 3 | 4): 'waiting' | 'active' | 'done' | 'error' => {
        if (phase === 'error') {
            if (stepNumber < failedStep) return 'done';
            if (stepNumber === failedStep) return 'error';
            return 'waiting';
        }
        if (phase === 'completed') return 'done';
        if (phase === 'backing_up') {
            return stepNumber === 1 ? 'active' : 'waiting';
        }
        if (phase === 'downloading' || phase === 'verifying') {
            if (stepNumber === 1) return 'done';
            if (stepNumber === 2) return 'active';
            return 'waiting';
        }
        if (phase === 'installing') {
            if (stepNumber === 1 || stepNumber === 2) return 'done';
            if (stepNumber === 3) return 'active';
            return 'waiting';
        }
        return 'waiting';
    };

    return (
        <AuthenticatedLayout>
            <Head title="Pembaharuan Aplikasi" />

            <div className="space-y-4">
                <PageHeader
                    className="animate-rise"
                    breadcrumb={[
                        { label: 'Dashboard' },
                        { label: 'Sistem' },
                        { label: 'Pembaharuan' },
                    ]}
                    title="Pembaharuan Aplikasi"
                    badge={
                        info.has_update ? (
                            <StatusBadge tone="warning" dot>
                                Tersedia v{info.latest_version}
                            </StatusBadge>
                        ) : (
                            <StatusBadge tone="success" dot={false}>
                                Versi Terbaru v{info.current_version}
                            </StatusBadge>
                        )
                    }
                    subtitle="Periksa ketersediaan rilis terbaru dari server resmi, tinjau catatan perubahan (changelog), dan perbarui aplikasi secara otomatis tanpa kehilangan data sekolah."
                    actions={
                        <PrimaryButton onClick={handleCheckUpdate} disabled={isChecking || isBusy}>
                            <svg
                                className={`mr-2 h-4 w-4 ${isChecking ? 'animate-spin' : ''}`}
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={2.2}
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M21 12a9 9 0 00-9-9 9.75 9.75 0 00-6.74 2.74L3 8m0-5v5h5M3 12a9 9 0 009 9 9.75 9.75 0 006.74-2.74L21 16m-5 0h5v5"
                                />
                            </svg>
                            {isChecking ? 'Memeriksa...' : 'Cek Pembaharuan Sekarang'}
                        </PrimaryButton>
                    }
                />

                {/* Banner Feedback Hasil Pengecekan */}
                {checkFeedback && (
                    <div
                        className={`flex items-start gap-3 rounded-[22px] border px-4 py-3 ${
                            checkFeedback.type === 'success'
                                ? 'border-mint/25 bg-pastel-mint/70 text-mint dark:border-mint/25 dark:bg-mint/10'
                                : checkFeedback.type === 'error'
                                  ? 'border-rose-200 bg-pastel-rose/70 text-rose-600 dark:border-rose-400/20 dark:bg-rose-500/10 dark:text-rose-300'
                                  : 'border-brand-200 bg-pastel-lavender/70 text-brand-700 dark:border-brand-400/20 dark:bg-brand-500/10 dark:text-brand-300'
                        }`}
                        role="alert"
                    >
                        <svg className="mt-0.5 h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            {checkFeedback.type === 'error' ? (
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            ) : (
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            )}
                        </svg>
                        <span className="text-[11.5px] font-semibold">{checkFeedback.text}</span>
                    </div>
                )}

                {/* Baris Statistik 3 Kartu Neo-Bento */}
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                    <div className="sikas-card sikas-card-hover animate-rise p-4" style={{ animationDelay: '60ms' }}>
                        <div className="flex items-center gap-2.5">
                            <IconTile tone="violet" size="md">
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                            </IconTile>
                            <div className="min-w-0">
                                <p className="text-[11.5px] font-extrabold tracking-tight text-slate-900 dark:text-white">Versi Terpasang</p>
                                <p className="text-[9.5px] font-medium text-slate-400 dark:text-slate-500">Instalasi aktif saat ini</p>
                            </div>
                        </div>
                        <p className="mt-3 text-sikas-num text-[19px] font-extrabold tracking-tight text-slate-900 dark:text-white">
                            v{info.current_version}
                        </p>
                        <div className="mt-1 text-[10px] font-semibold text-slate-400 dark:text-slate-500">
                            Engine Inno Setup x64 · Lisensi NPSN Aktif
                        </div>
                    </div>

                    <div className="sikas-card sikas-card-hover animate-rise p-4" style={{ animationDelay: '100ms' }}>
                        <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2.5">
                                <IconTile tone={info.has_update ? 'amber' : 'mint'} size="md">
                                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                    </svg>
                                </IconTile>
                                <div className="min-w-0">
                                    <p className="text-[11.5px] font-extrabold tracking-tight text-slate-900 dark:text-white">Status Pembaharuan</p>
                                    <p className="text-[9.5px] font-medium text-slate-400 dark:text-slate-500">GitHub Releases Resmi</p>
                                </div>
                            </div>
                            {info.has_update ? (
                                <StatusBadge tone="warning" dot>
                                    Tersedia v{info.latest_version}
                                </StatusBadge>
                            ) : (
                                <StatusBadge tone="success" dot={false}>
                                    Sudah Versi Terbaru
                                </StatusBadge>
                            )}
                        </div>
                        <p className="mt-3 text-sikas-num text-[19px] font-extrabold tracking-tight text-slate-900 dark:text-white">
                            v{info.latest_version}
                        </p>
                        <div className="mt-1 text-[10px] font-semibold text-slate-400 dark:text-slate-500">
                            Cek terakhir: {info.checked_at || 'Belum pernah'}
                        </div>
                    </div>

                    <div className="sikas-card sikas-card-hover animate-rise p-4" style={{ animationDelay: '140ms' }}>
                        <div className="flex items-center gap-2.5">
                            <IconTile tone="mint" size="md">
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                </svg>
                            </IconTile>
                            <div className="min-w-0">
                                <p className="text-[11.5px] font-extrabold tracking-tight text-slate-900 dark:text-white">Cadangan Pra-Update</p>
                                <p className="text-[9.5px] font-medium text-slate-400 dark:text-slate-500">Auto-Backup sebelum update</p>
                            </div>
                        </div>
                        <p className="mt-3 text-[13px] font-extrabold tracking-tight text-slate-900 dark:text-white">
                            {backupSummary.latest_date !== '-' ? backupSummary.latest_date : 'Aktif Otomatis'}
                        </p>
                        <div className="mt-1 text-[10px] font-semibold text-slate-400 dark:text-slate-500">
                            {backupSummary.count} arsip cadangan (.rsv)
                        </div>
                    </div>
                </div>

                {/* Area Utama 2 Kolom */}
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
                    {/* Kolom Kiri: Detail Rilis & Changelog */}
                    <div className="lg:col-span-7">
                        <Surface
                            className="animate-rise h-full"
                            title="Detail Rilis & Catatan Pembaharuan"
                            subtitle="Informasi versi terbaru beserta rincian perbaikan bug dan penambahan fitur."
                            icon={
                                <IconTile tone={info.has_update ? 'amber' : 'mint'} size="md">
                                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                                    </svg>
                                </IconTile>
                            }
                            actions={
                                info.has_update ? (
                                    <StatusBadge tone="warning" dot>
                                        Pembaharuan Siap Dipasang
                                    </StatusBadge>
                                ) : (
                                    <StatusBadge tone="success" dot={false}>
                                        Mutakhir
                                    </StatusBadge>
                                )
                            }
                        >
                            {info.has_update ? (
                                <div className="space-y-4">
                                    <div className="relative overflow-hidden rounded-[22px] border border-amber-300/60 bg-pastel-amber/50 p-4 dark:border-amber-400/20 dark:bg-amber-500/10">
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                            <div>
                                                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                                                    Rilis Baru Tersedia
                                                </span>
                                                <h3 className="mt-1.5 text-[16px] font-extrabold text-slate-900 dark:text-white">
                                                    {info.release_name || `newSIKAS v${info.latest_version}`}
                                                </h3>
                                                <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                                                    Diterbitkan: {info.published_at} · Ukuran paket:{' '}
                                                    <strong className="text-slate-700 dark:text-slate-200">
                                                        {info.asset ? info.asset.size_formatted : '-'}
                                                    </strong>
                                                </p>
                                            </div>

                                            <PrimaryButton onClick={openOnlineUpdateConfirm} disabled={!info.asset || isBusy}>
                                                <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                                </svg>
                                                Perbarui Aplikasi Sekarang
                                            </PrimaryButton>
                                        </div>
                                    </div>

                                    <div>
                                        <p className="mb-2 text-[10.5px] font-extrabold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                                            Catatan Perubahan (Changelog v{info.latest_version})
                                        </p>
                                        <div className="sikas-scroll max-h-72 overflow-y-auto rounded-[20px] border border-slate-200/80 bg-slate-50/80 p-4 text-[12px] leading-relaxed text-slate-700 whitespace-pre-line dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-300">
                                            {info.changelog || 'Tidak ada rincian catatan perubahan pada rilis ini.'}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="flex flex-col items-center justify-center rounded-[22px] border border-slate-200/70 bg-slate-50/60 px-6 py-8 text-center dark:border-white/10 dark:bg-white/[0.02]">
                                        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-pastel-mint text-mint dark:bg-mint/15">
                                            <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        </span>
                                        <h3 className="mt-3 text-[15px] font-extrabold text-slate-900 dark:text-white">
                                            Aplikasi Sudah Menggunakan Versi Terbaru (v{info.current_version})
                                        </h3>
                                        <p className="mt-1 max-w-md text-[11.5px] font-medium leading-relaxed text-slate-500 dark:text-slate-400">
                                            Seluruh fitur, skema database, dan modul keamanan pada komputer ini sudah berada pada rilis paling mutakhir.
                                        </p>
                                    </div>

                                    {info.changelog && (
                                        <div>
                                            <p className="mb-2 text-[10.5px] font-extrabold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                                                Catatan Rilis Terakhir (v{info.latest_version})
                                            </p>
                                            <div className="sikas-scroll max-h-56 overflow-y-auto rounded-[20px] border border-slate-200/80 bg-slate-50/80 p-4 text-[12px] leading-relaxed text-slate-700 whitespace-pre-line dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-300">
                                                {info.changelog}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </Surface>
                    </div>

                    {/* Kolom Kanan: Update Manual (.exe) & Jaminan Keamanan */}
                    <div className="space-y-3 lg:col-span-5">
                        <Surface
                            className="animate-rise"
                            title="Pembaharuan Manual (File .exe)"
                            subtitle="Gunakan fitur ini apabila internet sekolah lambat atau terputus, dan Anda sudah mengunduh file installer newSIKAS (.exe) secara terpisah."
                            icon={
                                <IconTile tone="violet" size="md">
                                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                    </svg>
                                </IconTile>
                            }
                            actions={<StatusBadge tone="violet" dot={false}>Mode Offline</StatusBadge>}
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".exe"
                                onChange={handleManualFileSelect}
                                className="hidden"
                            />
                            <div className="rounded-[20px] border-2 border-dashed border-slate-200 bg-slate-50/60 p-5 text-center transition hover:border-brand-400 dark:border-white/10 dark:bg-white/[0.02]">
                                <p className="text-[12px] font-bold text-slate-700 dark:text-slate-200">
                                    Pilih Berkas Installer <code className="rounded bg-slate-200/70 px-1.5 py-0.5 text-[11px] font-extrabold text-brand-600 dark:bg-white/10 dark:text-brand-300">newSIKAS_Installer_*.exe</code>
                                </p>
                                <p className="mt-1 text-[10.5px] font-medium text-slate-400 dark:text-slate-500">
                                    Sistem akan tetap membuat Auto-Backup database otomatis sebelum menjalankan installer.
                                </p>
                                <SecondaryButton
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={isBusy}
                                    className="mt-3 w-full justify-center"
                                >
                                    <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                    </svg>
                                    Pilih &amp; Pasang File Update (.exe)
                                </SecondaryButton>
                            </div>
                        </Surface>

                        <Surface
                            className="animate-rise"
                            title="Standar Keamanan Pembaharuan"
                            subtitle="Bagaimana data anggaran & BKU sekolah Anda dilindungi selama proses update:"
                            icon={
                                <IconTile tone="mint" size="md">
                                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                    </svg>
                                </IconTile>
                            }
                        >
                            <ul className="space-y-2.5 text-[11.5px] font-medium text-slate-600 dark:text-slate-300">
                                <li className="flex items-start gap-2.5">
                                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-pastel-mint text-mint dark:bg-mint/20">
                                        ✓
                                    </span>
                                    <span>
                                        <strong>Database Sekolah 100% Aman:</strong> Folder <code className="text-[10.5px] font-bold">dbapp</code> PostgreSQL dikunci agar tidak pernah tertimpa oleh installer baru.
                                    </span>
                                </li>
                                <li className="flex items-start gap-2.5">
                                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-pastel-mint text-mint dark:bg-mint/20">
                                        ✓
                                    </span>
                                    <span>
                                        <strong>Wajib Auto-Backup (.rsv):</strong> Sistem otomatis menyimpan cadangan penuh ke menu <em>Backup Database</em> tepat sebelum update dimulai.
                                    </span>
                                </li>
                                <li className="flex items-start gap-2.5">
                                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-pastel-mint text-mint dark:bg-mint/20">
                                        ✓
                                    </span>
                                    <span>
                                        <strong>Lisensi NPSN Tetap Tersimpan:</strong> Konfigurasi lisensi sekolah di <code className="text-[10.5px] font-bold">ProgramData\SIKAS</code> tetap dipertahankan tanpa perlu aktivasi ulang.
                                    </span>
                                </li>
                            </ul>
                        </Surface>
                    </div>
                </div>
            </div>

            {/* Modal Konfirmasi & Progres 4 Tahap Neo-Bento */}
            <Modal show={showModal} onClose={closeModal} maxWidth="lg" closeable={!isBusy}>
                <div className="relative overflow-hidden rounded-[26px] bg-white dark:bg-[#15131F]">
                    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[26px]">
                        <div className="absolute -right-12 -top-16 h-44 w-44 rounded-full bg-brand-500/10 blur-3xl" />
                        <div className="absolute -bottom-16 -left-12 h-44 w-44 rounded-full bg-lime-400/10 blur-3xl" />
                    </div>

                    {/* Header Modal */}
                    <div className="relative flex items-start justify-between gap-3 border-b border-slate-100 px-6 py-4 dark:border-white/5">
                        <div className="flex items-center gap-3">
                            <IconTile
                                tone={
                                    phase === 'error'
                                        ? 'rose'
                                        : phase === 'completed'
                                          ? 'mint'
                                          : 'violet'
                                }
                                size="md"
                            >
                                <svg
                                    className={`h-5 w-5 ${isBusy ? 'animate-spin' : ''}`}
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    strokeWidth={2}
                                >
                                    {phase === 'completed' ? (
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    ) : phase === 'error' ? (
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    ) : (
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                    )}
                                </svg>
                            </IconTile>
                            <div>
                                <h2 className="text-[15px] font-extrabold text-slate-900 dark:text-white">
                                    {phase === 'confirm'
                                        ? 'Konfirmasi Pembaharuan Aplikasi'
                                        : phase === 'completed'
                                          ? 'Pembaharuan Selesai Dipasang!'
                                          : phase === 'error'
                                            ? 'Pembaharuan Gagal'
                                            : 'Memproses Pembaharuan Aplikasi...'}
                                </h2>
                                <p className="text-[10.5px] font-medium text-slate-400 dark:text-slate-500">
                                    {updateMode === 'online'
                                        ? `Pembaruan Otomatis ke v${info.latest_version}`
                                        : `Pembaruan Manual dari ${manualFile?.name || 'Installer .exe'}`}
                                </p>
                            </div>
                        </div>

                        {!isBusy && (
                            <button
                                type="button"
                                onClick={closeModal}
                                className="flex h-7 w-7 items-center justify-center rounded-xl bg-slate-50 text-slate-400 transition hover:bg-slate-100 hover:text-slate-800 dark:bg-white/5 dark:hover:bg-white/10 dark:hover:text-white"
                                aria-label="Tutup"
                            >
                                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
                                    <path d="M18 6 6 18M6 6l12 12" />
                                </svg>
                            </button>
                        )}
                    </div>

                    {/* Body Modal */}
                    <div className="relative space-y-4 px-6 py-5">
                        {phase === 'confirm' ? (
                            <>
                                <div className="rounded-[20px] border border-slate-200/80 bg-slate-50/90 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                                    <p className="text-[12px] font-bold text-slate-800 dark:text-slate-100">
                                        Sistem akan menjalankan 3 tahapan otomatis berikut:
                                    </p>
                                    <ol className="mt-2.5 space-y-2 text-[11.5px] font-medium text-slate-600 dark:text-slate-300">
                                        <li>
                                            <strong>1. Auto-Backup Database:</strong> Mencadangkan database &amp; berkas sekolah saat ini ke folder backup (<code className="text-[10.5px] font-bold">.rsv</code>).
                                        </li>
                                        <li>
                                            <strong>2. {updateMode === 'online' ? 'Unduh Paket Rilis Resmi' : 'Verifikasi Paket Installer'}:</strong>{' '}
                                            {updateMode === 'online'
                                                ? `Mengunduh ${info.asset?.name} (${info.asset?.size_formatted}) dari GitHub Releases.`
                                                : `Memvalidasi berkas ${manualFile?.name} yang Anda pilih.`}
                                        </li>
                                        <li>
                                            <strong>3. Silent Update &amp; Restart Layanan:</strong> Memasang pembaruan kode, menjalankan migrasi tabel baru, dan memulai ulang layanan server (~20 detik).
                                        </li>
                                    </ol>
                                </div>

                                <div className="flex justify-end gap-2 border-t border-slate-100 pt-4 dark:border-white/5">
                                    <SecondaryButton onClick={closeModal}>Batal</SecondaryButton>
                                    <PrimaryButton onClick={executeUpdate}>Ya, Mulai Pembaharuan</PrimaryButton>
                                </div>
                            </>
                        ) : (
                            <>
                                {/* Progress Bar */}
                                <div>
                                    <div className="mb-1.5 flex items-center justify-between">
                                        <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200">
                                            {statusMessage || 'Memproses...'}
                                        </span>
                                        <span className="text-sikas-num text-[12px] font-extrabold text-brand-600 dark:text-lime-300">
                                            {progress}%
                                        </span>
                                    </div>
                                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
                                        <div
                                            className={`h-full rounded-full transition-all duration-300 ${
                                                phase === 'error'
                                                    ? 'bg-rose-500'
                                                    : phase === 'completed'
                                                      ? 'bg-mint'
                                                      : 'bg-gradient-to-r from-brand-500 to-lime-400'
                                            }`}
                                            style={{ width: `${Math.min(100, Math.max(5, progress))}%` }}
                                        />
                                    </div>
                                </div>

                                {/* Checklist 4 Tahap */}
                                <div className="space-y-2 rounded-[20px] border border-slate-200/80 bg-slate-50/80 p-3.5 dark:border-white/10 dark:bg-white/[0.03]">
                                    {[
                                        {
                                            step: 1 as const,
                                            label: 'Tahap 1: Auto-Backup Database & Berkas (.rsv)',
                                            sub: createdBackupFile ? `Tersimpan: ${createdBackupFile}` : 'Mengamankan data sekolah sebelum update',
                                        },
                                        {
                                            step: 2 as const,
                                            label:
                                                updateMode === 'online'
                                                    ? 'Tahap 2: Mengunduh Paket Installer (.exe)'
                                                    : 'Tahap 2: Mengunggah & Memverifikasi Installer (.exe)',
                                            sub:
                                                updateMode === 'online'
                                                    ? info.asset?.name || 'GitHub Releases Asset'
                                                    : manualFile?.name || 'Validasi berkas .exe',
                                        },
                                        {
                                            step: 3 as const,
                                            label: 'Tahap 3: Memasang Pembaharuan & Migrasi Skema Database',
                                            sub: 'Menjalankan Inno Setup (/VERYSILENT /UPDATE) & me-restart Apache',
                                        },
                                        {
                                            step: 4 as const,
                                            label: 'Tahap 4: Layanan Server Kembali Online',
                                            sub: 'Aplikasi siap dimuat ulang ke versi terbaru',
                                        },
                                    ].map((item) => {
                                        const st = getStepStatus(item.step);
                                        return (
                                            <div
                                                key={item.step}
                                                className="flex items-center justify-between gap-3 rounded-xl px-2.5 py-2 text-[11.5px]"
                                            >
                                                <div className="min-w-0">
                                                    <p
                                                        className={`font-bold ${
                                                            st === 'done'
                                                                ? 'text-mint'
                                                                : st === 'active'
                                                                  ? 'text-slate-900 dark:text-white'
                                                                  : st === 'error'
                                                                    ? 'text-rose-500'
                                                                    : 'text-slate-400 dark:text-slate-500'
                                                        }`}
                                                    >
                                                        {item.label}
                                                    </p>
                                                    <p className="truncate text-[10px] text-slate-400 dark:text-slate-500">{item.sub}</p>
                                                </div>
                                                <span className="shrink-0 text-[10px] font-extrabold uppercase">
                                                    {st === 'done' && <span className="text-mint">✓ Selesai</span>}
                                                    {st === 'active' && (
                                                        <span className="text-brand-600 dark:text-lime-300 animate-pulse">Memproses...</span>
                                                    )}
                                                    {st === 'error' && <span className="text-rose-500">Gagal</span>}
                                                    {st === 'waiting' && <span className="text-slate-400">Menunggu</span>}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>

                                {phase === 'error' && errorMessage && (
                                    <div className="rounded-[18px] border border-rose-200 bg-pastel-rose/70 px-4 py-3 text-[11.5px] font-semibold text-rose-600 dark:border-rose-400/20 dark:bg-rose-500/10 dark:text-rose-300">
                                        {errorMessage}
                                    </div>
                                )}

                                {phase === 'completed' && (
                                    <div className="rounded-[18px] border border-mint/25 bg-pastel-mint/70 px-4 py-3 text-[11.5px] font-semibold text-mint dark:border-mint/25 dark:bg-mint/10">
                                        Pembaharuan telah selesai dipasang dengan aman! Silakan klik tombol di bawah untuk memuat ulang aplikasi.
                                    </div>
                                )}

                                <div className="flex justify-end gap-2 border-t border-slate-100 pt-4 dark:border-white/5">
                                    {phase === 'completed' && (
                                        <PrimaryButton onClick={() => window.location.reload()}>
                                            Muat Ulang Aplikasi Sekarang
                                        </PrimaryButton>
                                    )}
                                    {phase === 'error' && (
                                        <>
                                            <SecondaryButton onClick={closeModal}>Tutup</SecondaryButton>
                                            <PrimaryButton onClick={executeUpdate}>Coba Lagi</PrimaryButton>
                                        </>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </Modal>
        </AuthenticatedLayout>
    );
}
