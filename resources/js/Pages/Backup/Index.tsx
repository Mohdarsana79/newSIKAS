import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, router } from '@inertiajs/react'; // Import router correctly
import { useState, useRef, useEffect } from 'react';
import Modal from '@/Components/Modal'; // Assuming Modal exists, if not I'll use a simple absolute div or check
import SecondaryButton from '@/Components/SecondaryButton'; // Assuming existing
import PrimaryButton from '@/Components/PrimaryButton'; // Assuming existing
import DangerButton from '@/Components/DangerButton'; // Assuming existing
import InputError from '@/Components/InputError'; // Assuming existing
import InputLabel from '@/Components/InputLabel'; // Assuming existing
import TextInput from '@/Components/TextInput'; // Assuming existing
import { format } from 'date-fns';
import PageHeader from '@/Components/ui/PageHeader';
import Surface from '@/Components/ui/Surface';
import DataTable from '@/Components/ui/DataTable';
import EmptyState from '@/Components/ui/EmptyState';
import IconTile from '@/Components/ui/IconTile';
import StatusBadge from '@/Components/ui/StatusBadge';

interface BackupFile {
    name: string;
    size: string;
    created_at: string;
    path: string;
}

interface PageProps {
    auth: any;
    backupFiles: BackupFile[];
    stats: {
        totalRecords: number;
        dbSize: string;
        totalBackupSize: string;
        storagePercentage: number;
        lastBackupDate: string;
    };
    flash: {
        success?: string;
        error?: string;
    };
    currentNpsn?: string;
}

export default function BackupIndex({ auth, backupFiles, stats, flash, currentNpsn }: PageProps) {
    const [confirmingReset, setConfirmingReset] = useState(false);
    const [password, setPassword] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [processingReset, setProcessingReset] = useState(false);
    const [isDatabaseReset, setIsDatabaseReset] = useState(false);

    // NPSN Edit State (Secret Ctrl+8)
    const [showNpsnModal, setShowNpsnModal] = useState(false);
    const { data: npsnData, setData: setNpsnData, post: postNpsn, processing: processingNpsn, errors: npsnErrors } = useForm({
        npsn_code: currentNpsn || ''
    });

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.ctrlKey && e.key === '8') {
                e.preventDefault();
                setShowNpsnModal(true);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const closeNpsnModal = () => setShowNpsnModal(false);
    const submitNpsn = (e: React.FormEvent) => {
        e.preventDefault();
        postNpsn(route('backup.update-npsn'), {
            onSuccess: () => {
                closeNpsnModal();
                if (isDatabaseReset) {
                    window.location.reload();
                }
            }
        });
    };

    // Backup Form
    const { data: backupData, setData: setBackupData, post: postBackup, processing: processingBackup, reset: resetBackupForm, errors: backupErrors } = useForm({
        backup_name: ''
    });

    // Restore Form
    const { data: restoreData, setData: setRestoreData, post: postRestore, processing: processingRestore, errors: restoreErrors, reset: resetRestoreForm } = useForm<{
        backup_file: File | null;
    }>({
        backup_file: null
    });
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleCreateBackup = (e: React.FormEvent) => {
        e.preventDefault();
        postBackup(route('backup.create'), {
            onSuccess: () => {
                resetBackupForm();
                // Optional: Show success toast
            }
        });
    };

    // Restore State
    const [restoreFile, setRestoreFile] = useState<File | null>(null);
    const [showRestoreModal, setShowRestoreModal] = useState(false);
    const [restoreProgress, setRestoreProgress] = useState(0);
    const [restoreStatus, setRestoreStatus] = useState<'idle' | 'uploading' | 'processing' | 'completed' | 'error'>('idle');
    const [restoreMessage, setRestoreMessage] = useState('');
    const [restoreError, setRestoreError] = useState('');

    const pollingIntervalRef = useRef<any>(null);
    const animationIntervalRef = useRef<any>(null);
    const displayedProgressRef = useRef<number>(0);
    const targetProgressRef = useRef<number>(0);
    const isCompletedRef = useRef<boolean>(false);

    const clearTimers = () => {
        if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
        }
        if (animationIntervalRef.current) {
            clearInterval(animationIntervalRef.current);
            animationIntervalRef.current = null;
        }
    };

    useEffect(() => {
        return () => clearTimers();
    }, []);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setRestoreFile(file);
            setShowRestoreModal(true);
            setRestoreProgress(0);
            displayedProgressRef.current = 0;
            targetProgressRef.current = 0;
            isCompletedRef.current = false;
            setRestoreStatus('idle');
            setRestoreMessage('');
            setRestoreError('');
            // Reset input value to allow selecting same file again if passed
            e.target.value = '';
        }
    };

    const closeRestoreModal = () => {
        if (restoreStatus === 'uploading' || restoreStatus === 'processing') return; // Prevent closing while processing
        clearTimers();
        setShowRestoreModal(false);
        setRestoreFile(null);
        setRestoreProgress(0);
        displayedProgressRef.current = 0;
        targetProgressRef.current = 0;
        isCompletedRef.current = false;
        setRestoreStatus('idle');
        setRestoreMessage('');
        setRestoreError('');
        resetRestoreForm();
    };

    const executeRestore = () => {
        if (!restoreFile) return;

        clearTimers();
        isCompletedRef.current = false;
        setRestoreError('');
        setRestoreStatus('uploading');
        setRestoreMessage('Mengunggah berkas cadangan ke server...');

        // Inisialisasi awal animasi smooth: mulai dari 1%
        displayedProgressRef.current = 1;
        targetProgressRef.current = 3;
        setRestoreProgress(1);

        const restoreId = 'rst_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);

        // Mesin animasi smooth progress (1, 2, 3, ... 100%)
        let lastCreepTime = Date.now();
        animationIntervalRef.current = setInterval(() => {
            const current = displayedProgressRef.current;
            const target = targetProgressRef.current;

            if (current < target) {
                // Kecepatan langkah disesuaikan dengan selisih jarak
                const diff = target - current;
                const step = diff > 25 ? 2 : 1;
                const next = Math.min(target, current + step);
                displayedProgressRef.current = next;
                setRestoreProgress(next);

                if (next >= 100 && isCompletedRef.current) {
                    clearTimers();
                    setRestoreStatus('completed');
                    setRestoreProgress(100);
                    setTimeout(() => {
                        window.location.reload();
                    }, 1500);
                }
            } else if (current >= target && target < 95 && !isCompletedRef.current) {
                // Ketika target server belum berganti (misal saat proses psql impor data transaksi):
                // Lakukan creep halus bertahap (1% setiap 400ms) agar indikator tidak freeze
                const now = Date.now();
                if (now - lastCreepTime >= 400) {
                    lastCreepTime = now;
                    const maxCreep = Math.min(94, target + 15);
                    if (current < maxCreep) {
                        const next = current + 1;
                        displayedProgressRef.current = next;
                        setRestoreProgress(next);
                    }
                }
            }
        }, 40);

        // Polling ke server (bebas middleware database/session)
        const startPolling = () => {
            if (pollingIntervalRef.current) return;

            pollingIntervalRef.current = setInterval(async () => {
                try {
                    const res = await window.axios.get(route('backup.restore-progress', { restoreId }));
                    if (res && res.data) {
                        const { percent, message, status } = res.data;

                        if (status === 'error') {
                            clearTimers();
                            setRestoreStatus('error');
                            setRestoreError(message || 'Terjadi kesalahan saat memulihkan database.');
                            setRestoreMessage('Proses pemulihan gagal.');
                            setRestoreProgress(100);
                            return;
                        }

                        if (status === 'completed' || percent === 100) {
                            isCompletedRef.current = true;
                            targetProgressRef.current = 100;
                            if (message) {
                                setRestoreMessage(message);
                            }
                            return;
                        }

                        if (typeof percent === 'number') {
                            targetProgressRef.current = Math.max(targetProgressRef.current, percent);
                        }
                        if (message) {
                            setRestoreMessage(message);
                        }
                        setRestoreStatus('processing');
                    }
                } catch (e) {
                    // Abaikan kesalahan jaringan sesaat saat polling
                }
            }, 500);
        };

        // Kirim request restore ke backend
        router.post(route('backup.restore'), {
            backup_file: restoreFile,
            restore_id: restoreId,
        }, {
            forceFormData: true,
            onProgress: (progress) => {
                if (progress && progress.total) {
                    // Fase upload: mengalir mulus hingga 18%
                    const uploadPct = Math.max(1, Math.min(18, Math.round((progress.loaded * 18) / progress.total)));
                    targetProgressRef.current = Math.max(targetProgressRef.current, uploadPct);
                    if (uploadPct >= 18) {
                        setRestoreStatus('processing');
                        setRestoreMessage('Berkas terunggah, memulai pemrosesan di server...');
                    }
                }
            },
            onStart: () => {
                startPolling();
            },
            onSuccess: () => {
                // Backend telah selesai merestore dan redirect
                isCompletedRef.current = true;
                targetProgressRef.current = 100;
                setRestoreMessage('Pemulihan basis data & berkas berhasil! Memuat ulang...');
            },
            onError: (errors) => {
                clearTimers();
                setRestoreStatus('error');
                const errKey = Object.keys(errors)[0];
                const msg = errKey ? errors[errKey] : 'Gagal memulihkan database.';
                setRestoreError(msg);
                setRestoreMessage('Proses pemulihan gagal.');
            },
            preserveScroll: true
        });
    };

    const confirmReset = () => {
        setConfirmingReset(true);
    };

    const closeResetModal = () => {
        setConfirmingReset(false);
        setPassword('');
        setPasswordError('');
    };

    const handleResetDatabase = async () => {
        setProcessingReset(true);
        setPasswordError('');

        try {
            // 1. Validate Password first
            const validateRes = await window.axios.post(route('backup.validate-password'), { password });

            if (validateRes.data.success) {
                // 2. Perform Reset
                const resetRes = await window.axios.post(route('backup.reset'));
                if (resetRes.data.success) {
                    setIsDatabaseReset(true);
                    closeResetModal();
                }
            }
        } catch (error: any) {
            if (error.response && error.response.status === 422) {
                setPasswordError(error.response.data.message);
            } else {
                setPasswordError('Terjadi kesalahan saat mereset database.');
            }
            setProcessingReset(false);
        }
    };

    // Delete Confirmation State
    const [confirmingDeletion, setConfirmingDeletion] = useState(false);
    const [fileToDelete, setFileToDelete] = useState<string | null>(null);
    const [processingDelete, setProcessingDelete] = useState(false);

    const handleDelete = (fileName: string) => {
        setFileToDelete(fileName);
        setConfirmingDeletion(true);
    };

    const closeDeleteModal = () => {
        if (processingDelete) return;
        setConfirmingDeletion(false);
        setFileToDelete(null);
    };

    const executeDelete = () => {
        if (fileToDelete) {
            setProcessingDelete(true);
            router.delete(route('backup.delete'), {
                data: { file: fileToDelete },
                onFinish: () => {
                    setProcessingDelete(false);
                    closeDeleteModal();
                }
            });
        }
    };

    const handleDownload = (fileName: string) => {
        window.location.href = route('backup.download', { file: fileName });
    };

    return (
        <AuthenticatedLayout>
            <Head title="Backup & Restore" />

            <div className="space-y-4">
                <PageHeader
                    className="animate-rise"
                    breadcrumb={[
                        { label: 'Dashboard' },
                        { label: 'Backup & Restore' },
                    ]}
                    title="Backup & Restore Database"
                    badge={<StatusBadge tone="success" dot={false}>Keamanan Data</StatusBadge>}
                    subtitle="Buat cadangan, unduh, dan pulihkan database beserta berkas unggahan."
                />

                {/* Flash Messages */}
                {flash.success && (
                    <div className="flex items-start gap-3 rounded-[22px] border border-mint/20 bg-pastel-mint/60 px-4 py-3 dark:border-mint/20 dark:bg-mint/10" role="alert">
                        <svg className="mt-0.5 h-5 w-5 shrink-0 text-mint" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="block text-[11.5px] font-semibold text-mint">{flash.success}</span>
                    </div>
                )}
                {flash.error && (
                    <div className="flex items-start gap-3 rounded-[22px] border border-rose-200 bg-pastel-rose/70 px-4 py-3 dark:border-rose-400/20 dark:bg-rose-500/10" role="alert">
                        <svg className="mt-0.5 h-5 w-5 shrink-0 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="block text-[11.5px] font-semibold text-rose-600 dark:text-rose-300">{flash.error}</span>
                    </div>
                )}

                {/* Stats Cards */}
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
                    <div className="sikas-card sikas-card-hover animate-rise p-4" style={{ animationDelay: '60ms' }}>
                        <div className="flex items-center gap-2.5">
                            <IconTile tone="violet" size="md">
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                                    <ellipse cx="12" cy="5" rx="9" ry="3" />
                                    <path d="M3 5v14a9 3 0 0018 0V5" />
                                    <path d="M3 12a9 3 0 0018 0" />
                                </svg>
                            </IconTile>
                            <div className="min-w-0">
                                <p className="text-[11.5px] font-extrabold tracking-tight text-slate-900 dark:text-white">Total Ukuran Database</p>
                                <p className="text-[9.5px] font-medium text-slate-400 dark:text-slate-500">Penyimpanan PostgreSQL</p>
                            </div>
                        </div>
                        <p className="mt-3 text-sikas-num text-[19px] font-extrabold tracking-tight text-slate-900 dark:text-white">{stats.dbSize}</p>
                    </div>
                    <div className="sikas-card sikas-card-hover animate-rise p-4" style={{ animationDelay: '100ms' }}>
                        <div className="flex items-center gap-2.5">
                            <IconTile tone="mint" size="md">
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3-7 3V5z" />
                                </svg>
                            </IconTile>
                            <div className="min-w-0">
                                <p className="text-[11.5px] font-extrabold tracking-tight text-slate-900 dark:text-white">Total File Backup</p>
                                <p className="text-[9.5px] font-medium text-slate-400 dark:text-slate-500">Berkas cadangan</p>
                            </div>
                        </div>
                        <p className="mt-3 text-sikas-num text-[19px] font-extrabold tracking-tight text-slate-900 dark:text-white">{backupFiles.length} File</p>
                        <div className="mt-1 text-[10px] font-semibold text-slate-400 dark:text-slate-500">{stats.totalBackupSize}</div>
                    </div>
                    <div className="sikas-card sikas-card-hover animate-rise p-4" style={{ animationDelay: '140ms' }}>
                        <div className="flex items-center gap-2.5">
                            <IconTile tone="amber" size="md">
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M4 7h16M4 12h16M4 17h10" />
                                </svg>
                            </IconTile>
                            <div className="min-w-0">
                                <p className="text-[11.5px] font-extrabold tracking-tight text-slate-900 dark:text-white">Total Record</p>
                                <p className="text-[9.5px] font-medium text-slate-400 dark:text-slate-500">Baris data tersimpan</p>
                            </div>
                        </div>
                        <p className="mt-3 text-sikas-num text-[19px] font-extrabold tracking-tight text-slate-900 dark:text-white">{stats.totalRecords.toLocaleString()}</p>
                    </div>
                    <div className="sikas-card sikas-card-hover animate-rise p-4" style={{ animationDelay: '180ms' }}>
                        <div className="flex items-center gap-2.5">
                            <IconTile tone="sky" size="md">
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </IconTile>
                            <div className="min-w-0">
                                <p className="text-[11.5px] font-extrabold tracking-tight text-slate-900 dark:text-white">Backup Terakhir</p>
                                <p className="text-[9.5px] font-medium text-slate-400 dark:text-slate-500">Cadangan terbaru</p>
                            </div>
                        </div>
                        <p className="mt-3 break-words text-[13px] font-extrabold tracking-tight text-slate-900 dark:text-white">
                            {stats.lastBackupDate !== '-' ? stats.lastBackupDate : 'Belum ada'}
                        </p>
                    </div>
                </div>

                {/* Actions Area */}
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                    {/* Create Backup */}
                    <div className="md:col-span-2">
                        <Surface
                            className="animate-rise"
                            title="Buat Backup Baru"
                            subtitle="Mencakup seluruh data tabel database serta file fisik unggahan (gambar kop surat, logo daerah/sekolah, template Word, dan arsip dokumen)."
                            icon={
                                <IconTile tone="violet" size="md">
                                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3-7 3V5z" />
                                    </svg>
                                </IconTile>
                            }
                            actions={<StatusBadge tone="violet" dot={false}>Paket All-in-One</StatusBadge>}
                        >
                            <form onSubmit={handleCreateBackup} className="flex flex-col items-end gap-3 sm:flex-row">
                                <div className="w-full flex-1">
                                    <InputLabel htmlFor="backup_name" value="Nama Backup (Opsional)" />
                                    <TextInput
                                        id="backup_name"
                                        type="text"
                                        className="mt-1 block w-full"
                                        placeholder="backup_harian"
                                        value={backupData.backup_name}
                                        onChange={(e) => setBackupData('backup_name', e.target.value)}
                                    />
                                    <InputError message={backupErrors.backup_name} className="mt-2" />
                                </div>
                                <PrimaryButton disabled={processingBackup} className="mb-[2px] h-[42px]">
                                    {processingBackup ? 'Memproses...' : 'Buat Backup'}
                                </PrimaryButton>
                            </form>
                            <p className="mt-2 text-[10.5px] font-medium text-slate-400 dark:text-slate-500">
                                File backup akan disimpan dengan ekstensi <strong className="text-slate-600 dark:text-slate-300">.rsv</strong>. Anda dapat mengunduhnya kapan saja.
                            </p>
                        </Surface>
                    </div>

                    {/* Restore / Reset Actions */}
                    <Surface
                        className="animate-rise"
                        title="Tindakan Lain"
                        subtitle="Pulihkan database dari berkas cadangan."
                        icon={
                            <IconTile tone="amber" size="md">
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                </svg>
                            </IconTile>
                        }
                    >
                        <div>
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileSelect}
                                className="hidden"
                                accept=".rsv,.btb,.sql"
                            />
                            <SecondaryButton
                                onClick={() => fileInputRef.current?.click()}
                                className="w-full justify-center"
                            >
                                <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                </svg>
                                Restore Database
                            </SecondaryButton>
                            <p className="mt-1 text-center text-[10px] font-medium text-slate-400 dark:text-slate-500">Upload file .rsv (Maks. 2 GB)</p>
                        </div>
                    </Surface>
                </div>

                {/* Backup List */}
                <div className="animate-rise">
                    <DataTable
                        title="Riwayat Backup"
                        subtitle="Daftar berkas cadangan yang tersimpan di server."
                        icon={
                            <IconTile tone="sky" size="sm">
                                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M4 6h16M4 12h16M4 18h10" />
                                </svg>
                            </IconTile>
                        }
                        actions={<StatusBadge tone="info" dot={false} className="text-sikas-num">{backupFiles.length}</StatusBadge>}
                        contentClassName="bento-table-wrapper mx-4 mb-4"
                    >
                        <table className="min-w-full">
                            <thead>
                                <tr>
                                    <th className="text-left">Nama File</th>
                                    <th className="text-left">Ukuran</th>
                                    <th className="text-left">Tanggal Dibuat</th>
                                    <th className="text-right">Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {backupFiles.length > 0 ? (
                                    backupFiles.map((file, idx) => (
                                        <tr key={idx}>
                                            <td className="whitespace-nowrap">
                                                <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
                                                    <svg className="h-5 w-5 shrink-0 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                    </svg>
                                                    {file.name}
                                                </div>
                                            </td>
                                            <td className="whitespace-nowrap text-sikas-num font-semibold text-slate-500 dark:text-slate-400">
                                                {file.size}
                                            </td>
                                            <td className="whitespace-nowrap text-slate-500 dark:text-slate-400">
                                                {file.created_at}
                                            </td>
                                            <td className="whitespace-nowrap text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <button
                                                        onClick={() => handleDownload(file.name)}
                                                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-100 bg-white px-2.5 py-1.5 text-[10px] font-extrabold text-brand-600 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50 hover:text-brand-700 dark:border-white/10 dark:bg-white/5 dark:text-brand-300 dark:hover:bg-white/10"
                                                        title="Download"
                                                    >
                                                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                                        </svg>
                                                        Download
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(file.name)}
                                                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-100 bg-white px-2.5 py-1.5 text-[10px] font-extrabold text-rose-600 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50 hover:text-rose-700 dark:border-white/10 dark:bg-white/5 dark:text-rose-400 dark:hover:bg-white/10"
                                                        title="Hapus"
                                                    >
                                                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                        </svg>
                                                        Hapus
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={4} className="p-0">
                                            <EmptyState
                                                className="border-0 bg-transparent py-9 dark:bg-transparent"
                                                icon={
                                                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3-7 3V5z" />
                                                    </svg>
                                                }
                                                title="Belum ada file backup."
                                            />
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </DataTable>
                </div>
            </div>

            {/* Reset Confirmation Modal */}
            <Modal show={confirmingReset} onClose={closeResetModal}>
                <div className="relative overflow-hidden bg-white dark:bg-[#15131F]">
                    <div className="pointer-events-none absolute -right-10 -top-16 h-44 w-44 rounded-full bg-rose-500/15 blur-3xl" />
                    <div className="relative flex items-start justify-between gap-3 border-b border-slate-100 px-6 py-4 dark:border-white/5">
                        <div className="flex items-center gap-3">
                            <IconTile tone="rose" size="lg">
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </IconTile>
                            <div className="min-w-0">
                                <h2 className="text-[14px] font-extrabold tracking-tight text-slate-900 dark:text-white">
                                    Apakah Anda yakin ingin mereset database?
                                </h2>
                                <p className="mt-0.5 text-[10px] font-medium text-slate-400 dark:text-slate-500">Konfirmasi dengan password.</p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={closeResetModal}
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
                            PERINGATAN: Tindakan ini akan <strong className="text-rose-600 dark:text-rose-300">MENGHAPUS SEMUA DATA</strong> transaksi, pengaturan, dan master data (kecuali Tabel Users).
                            Data yang dihapus tidak dapat dipulihkan kembali kecuali Anda memiliki backup.
                            Silakan masukkan password Anda untuk konfirmasi.
                        </p>

                        <div className="mt-5">
                            <InputLabel htmlFor="password" value="Password" className="sr-only" />

                            <TextInput
                                id="password"
                                type="password"
                                name="password"
                                isFocused={true}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="mt-1 block w-3/4"
                                placeholder="Password"
                            />

                            <InputError message={passwordError} className="mt-2" />
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4 dark:border-white/5">
                        <SecondaryButton onClick={closeResetModal}>
                            Batal
                        </SecondaryButton>

                        <DangerButton disabled={processingReset} onClick={handleResetDatabase}>
                            {processingReset ? 'Mereset...' : 'Reset Database'}
                        </DangerButton>
                    </div>
                </div>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal show={confirmingDeletion} onClose={closeDeleteModal}>
                <div className="relative overflow-hidden bg-white dark:bg-[#15131F]">
                    <div className="pointer-events-none absolute -right-10 -top-16 h-40 w-40 rounded-full bg-rose-500/10 blur-3xl" />
                    <div className="relative flex items-start justify-between gap-3 border-b border-slate-100 px-6 py-4 dark:border-white/5">
                        <div className="flex items-center gap-3">
                            <IconTile tone="rose" size="lg">
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            </IconTile>
                            <div className="min-w-0">
                                <h2 className="text-[14px] font-extrabold tracking-tight text-slate-900 dark:text-white">
                                    Konfirmasi Hapus Backup
                                </h2>
                                <p className="mt-0.5 text-[10px] font-medium text-slate-400 dark:text-slate-500">Konfirmasi tindakan</p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={closeDeleteModal}
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
                            Apakah Anda yakin ingin menghapus file backup <strong className="text-slate-800 dark:text-slate-200">{fileToDelete}</strong>?
                            Tindakan ini tidak dapat dibatalkan.
                        </p>
                    </div>
                    <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4 dark:border-white/5">
                        <SecondaryButton onClick={closeDeleteModal} disabled={processingDelete}>
                            Batal
                        </SecondaryButton>

                        <DangerButton onClick={executeDelete} disabled={processingDelete}>
                            {processingDelete ? 'Menghapus...' : 'Hapus'}
                        </DangerButton>
                    </div>
                </div>
            </Modal>

            {/* Restore Confirmation Modal */}
            <Modal show={showRestoreModal} onClose={closeRestoreModal}>
                <div className="relative overflow-hidden bg-white dark:bg-[#15131F]">
                    <div className="pointer-events-none absolute -right-10 -top-16 h-40 w-40 rounded-full bg-amber-400/10 blur-3xl" />
                    <div className="relative flex items-start justify-between gap-3 border-b border-slate-100 px-6 py-4 dark:border-white/5">
                        <div className="flex items-center gap-3">
                            <IconTile tone="amber" size="lg">
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                </svg>
                            </IconTile>
                            <div className="min-w-0">
                                <h2 className="text-[14px] font-extrabold tracking-tight text-slate-900 dark:text-white">
                                    Konfirmasi Restore Database &amp; Berkas
                                </h2>
                                <p className="mt-0.5 text-[10px] font-medium text-slate-400 dark:text-slate-500">Pulihkan skema database dan berkas unggahan.</p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={closeRestoreModal}
                            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-500 dark:hover:bg-white/5 dark:hover:text-white"
                            aria-label="Tutup"
                        >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    <div className="px-6 py-5">
                        <div className="mb-4 rounded-2xl border-l-4 border-amber-400 bg-pastel-amber/70 p-4 dark:bg-amber-400/10">
                            <div className="flex items-start gap-3">
                                <div className="shrink-0 text-amber-500">
                                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                </div>
                                <div>
                                    <p className="text-[11px] font-medium leading-relaxed text-amber-800 dark:text-amber-200">
                                        PERINGATAN: Proses ini akan <strong>MENIMPA</strong> skema database saat ini serta memulihkan file fisik unggahan (kop surat, logo, dan dokumen) dari file backup.
                                        Pastikan Anda telah membuat backup data saat ini sebelum melanjutkan.
                                    </p>
                                    <p className="mt-1 text-[10px] font-medium text-amber-700 dark:text-amber-300">
                                        *File backup format lama (.sql polos) tetap didukung secara otomatis.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {restoreFile && (
                            <div className="mb-4 rounded-2xl border border-slate-100 bg-slate-50/60 p-4 dark:border-white/5 dark:bg-white/[0.02]">
                                <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">File yang dipilih:</p>
                                <p className="text-[12px] font-extrabold text-slate-900 dark:text-white">{restoreFile.name}</p>
                                <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500">Ukuran: {(restoreFile.size / 1024).toFixed(2)} KB</p>
                            </div>
                        )}

                        {/* Progress Bar & Status */}
                        {restoreStatus !== 'idle' && (
                            <div className="mb-4 space-y-3 rounded-2xl border border-slate-100 bg-slate-50/60 p-4 dark:border-white/5 dark:bg-white/[0.02]">
                                <div className="flex items-center justify-between text-[11px]">
                                    <div className="flex items-center font-medium">
                                        {restoreStatus === 'processing' || restoreStatus === 'uploading' ? (
                                            <svg className="animate-spin -ml-0.5 mr-2.5 h-4 w-4 text-brand-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                                            </svg>
                                        ) : restoreStatus === 'completed' ? (
                                            <svg className="w-5 h-5 text-mint mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        ) : (
                                            <svg className="w-5 h-5 text-rose-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        )}
                                        <span className={
                                            restoreStatus === 'error'
                                                ? 'text-rose-600 dark:text-rose-300 font-extrabold'
                                                : restoreStatus === 'completed'
                                                    ? 'text-mint font-extrabold'
                                                    : 'text-brand-600 dark:text-brand-300 font-bold'
                                        }>
                                            {restoreMessage || (restoreStatus === 'uploading' ? 'Mengunggah berkas...' : 'Memproses di server...')}
                                        </span>
                                    </div>
                                    <span className="ml-2 text-sikas-num font-extrabold text-slate-700 dark:text-slate-300">
                                        {restoreProgress}%
                                    </span>
                                </div>

                                <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
                                    <div
                                        className={`h-3 rounded-full transition-all duration-200 ease-out ${
                                            restoreStatus === 'error'
                                                ? 'bg-rose-500'
                                                : restoreStatus === 'completed'
                                                    ? 'bg-mint'
                                                    : 'bg-brand-500'
                                        }`}
                                        style={{ width: `${restoreProgress}%` }}
                                    ></div>
                                </div>

                                {restoreError && (
                                    <div className="rounded-xl border border-rose-200 bg-pastel-rose/70 p-3 text-[10.5px] font-medium text-rose-600 dark:border-rose-400/20 dark:bg-rose-500/10 dark:text-rose-300">
                                        <strong>Kendala:</strong> {restoreError}
                                    </div>
                                )}

                                {restoreStatus === 'completed' && (
                                    <p className="text-center text-[10px] font-semibold text-mint">
                                        Sistem sedang memuat ulang halaman secara otomatis...
                                    </p>
                                )}

                                {(restoreStatus === 'uploading' || restoreStatus === 'processing') && (
                                    <p className="text-center text-[10px] font-medium text-slate-400 dark:text-slate-500">
                                        Proses restore sedang berjalan, mohon jangan menutup jendela ini...
                                    </p>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4 dark:border-white/5">
                        {restoreStatus === 'error' ? (
                            <SecondaryButton onClick={closeRestoreModal}>
                                Tutup
                            </SecondaryButton>
                        ) : (
                            <>
                                <SecondaryButton onClick={closeRestoreModal} disabled={restoreStatus === 'uploading' || restoreStatus === 'processing'}>
                                    Batal
                                </SecondaryButton>

                                <PrimaryButton disabled={restoreStatus !== 'idle'} onClick={executeRestore}>
                                    {restoreStatus === 'idle' ? 'Mulai Restore' : 'Sedang Memproses...'}
                                </PrimaryButton>
                            </>
                        )}
                    </div>
                </div>
            </Modal>

            {/* NPSN Modal */}
            <Modal show={showNpsnModal} onClose={closeNpsnModal}>
                <div className="relative overflow-hidden bg-white dark:bg-[#15131F]">
                    <div className="pointer-events-none absolute -right-10 -top-16 h-40 w-40 rounded-full bg-brand-500/10 blur-3xl" />
                    <div className="relative flex items-start justify-between gap-3 border-b border-slate-100 px-6 py-4 dark:border-white/5">
                        <div className="flex items-center gap-3">
                            <IconTile tone="violet" size="lg">
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                            </IconTile>
                            <div className="min-w-0">
                                <h2 className="text-[14px] font-extrabold tracking-tight text-slate-900 dark:text-white">
                                    Edit APP_NPSN_CODE & Reset Database
                                </h2>
                                <p className="mt-0.5 text-[10px] font-medium text-slate-400 dark:text-slate-500">
                                    Anda harus melakukan Reset Database terlebih dahulu sebelum dapat mengubah NPSN.
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={closeNpsnModal}
                            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-500 dark:hover:bg-white/5 dark:hover:text-white"
                            aria-label="Tutup"
                        >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    <div className="px-6 py-5">
                        <div className="border-b border-slate-100 pb-5 dark:border-white/5">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <h3 className="text-[12px] font-extrabold text-slate-900 dark:text-white">Reset Database</h3>
                                    <p className="mt-1 text-[10px] font-semibold text-rose-500">Hapus semua data (Kecuali User)</p>
                                </div>
                                <DangerButton onClick={confirmReset} disabled={isDatabaseReset}>
                                    {isDatabaseReset ? 'Database Telah Direset' : 'Reset Database'}
                                </DangerButton>
                            </div>
                        </div>

                        <form onSubmit={submitNpsn} className="mt-5">
                            <InputLabel htmlFor="npsn_code" value="NPSN Code" />
                            <TextInput
                                id="npsn_code"
                                type="text"
                                name="npsn_code"
                                value={npsnData.npsn_code}
                                onChange={(e) => setNpsnData('npsn_code', e.target.value)}
                                className="mt-1 block w-full"
                                disabled={!isDatabaseReset}
                                isFocused={isDatabaseReset}
                            />
                            <InputError message={npsnErrors.npsn_code} className="mt-2" />

                            <div className="mt-5 flex justify-end gap-2 border-t border-slate-100 pt-4 dark:border-white/5">
                                <SecondaryButton onClick={closeNpsnModal} type="button">Batal</SecondaryButton>
                                <PrimaryButton disabled={processingNpsn || !isDatabaseReset}>
                                    {processingNpsn ? 'Menyimpan...' : 'Simpan NPSN'}
                                </PrimaryButton>
                            </div>
                        </form>
                    </div>
                </div>
            </Modal>
        </AuthenticatedLayout>
    );
}
