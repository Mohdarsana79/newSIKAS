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
        <AuthenticatedLayout
            header={<h2 className="font-semibold text-xl text-gray-800 dark:text-gray-200 leading-tight">Backup & Restore Database</h2>}
        >
            <Head title="Backup & Restore" />

            <div className="py-12">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8 space-y-6">

                    {/* Flash Messages */}
                    {flash.success && (
                        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative dark:bg-green-900/50 dark:border-green-600 dark:text-green-300" role="alert">
                            <span className="block sm:inline">{flash.success}</span>
                        </div>
                    )}
                    {flash.error && (
                        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative dark:bg-red-900/50 dark:border-red-600 dark:text-red-300" role="alert">
                            <span className="block sm:inline">{flash.error}</span>
                        </div>
                    )}

                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow-sm sm:rounded-lg p-6 border-l-4 border-indigo-500">
                            <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Ukuran Database</div>
                            <div className="mt-2 text-2xl font-semibold text-gray-900 dark:text-gray-100">{stats.dbSize}</div>
                        </div>
                        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow-sm sm:rounded-lg p-6 border-l-4 border-green-500">
                            <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Total File Backup</div>
                            <div className="mt-2 text-2xl font-semibold text-gray-900 dark:text-gray-100">{backupFiles.length} File</div>
                            <div className="text-xs text-gray-400 mt-1">{stats.totalBackupSize}</div>
                        </div>
                        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow-sm sm:rounded-lg p-6 border-l-4 border-yellow-500">
                            <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Record</div>
                            <div className="mt-2 text-2xl font-semibold text-gray-900 dark:text-gray-100">{stats.totalRecords.toLocaleString()}</div>
                        </div>
                        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow-sm sm:rounded-lg p-6 border-l-4 border-purple-500">
                            <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Backup Terakhir</div>
                            <div className="mt-2 text-lg font-semibold text-gray-900 dark:text-gray-100 break-words">
                                {stats.lastBackupDate !== '-' ? stats.lastBackupDate : 'Belum ada'}
                            </div>
                        </div>
                    </div>

                    {/* Actions Area */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Create Backup */}
                        <div className="md:col-span-2 bg-white dark:bg-gray-800 overflow-hidden shadow-sm sm:rounded-lg p-6">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Buat Backup Baru</h3>
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-300">
                                    <svg className="w-3.5 h-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    Paket All-in-One
                                </span>
                            </div>

                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                                Mencakup seluruh data tabel database serta file fisik unggahan (gambar kop surat, logo daerah/sekolah, template Word, dan arsip dokumen).
                            </p>

                            <form onSubmit={handleCreateBackup} className="flex gap-4 items-end">
                                <div className="flex-1">
                                    <InputLabel htmlFor="backup_name" value="Nama Backup (Opsional)" />
                                    <TextInput
                                        id="backup_name"
                                        type="text"
                                        className="mt-1 block w-full text-gray-900"
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
                            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                                File backup akan disimpan dengan ekstensi <strong>.rsv</strong>. Anda dapat mengunduhnya kapan saja.
                            </p>
                        </div>

                        {/* Restore / Reset Actions */}
                        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow-sm sm:rounded-lg p-6 space-y-4">
                            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Tindakan Lain</h3>

                            {/* Restore Button (Trigger Input) */}
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
                                <p className="text-xs text-center text-gray-500 mt-1">Upload file .rsv (Maks. 2 GB)</p>
                            </div>
                        </div>
                    </div>

                    {/* Backup List */}
                    <div className="bg-white dark:bg-gray-800 overflow-hidden shadow-sm sm:rounded-lg">
                        <div className="p-6">
                            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Riwayat Backup</h3>
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                    <thead className="bg-gray-50 dark:bg-gray-700">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Nama File</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Ukuran</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Tanggal Dibuat</th>
                                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                        {backupFiles.length > 0 ? (
                                            backupFiles.map((file, idx) => (
                                                <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100 flex items-center">
                                                        <svg className="w-5 h-5 mr-2 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                        </svg>
                                                        {file.name}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                        {file.size}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                        {file.created_at}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                        <button
                                                            onClick={() => handleDownload(file.name)}
                                                            className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 mr-4"
                                                            title="Download"
                                                        >
                                                            Download
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(file.name)}
                                                            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                                                            title="Hapus"
                                                        >
                                                            Hapus
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                                                    Belum ada file backup.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Reset Confirmation Modal */}
            <Modal show={confirmingReset} onClose={closeResetModal}>
                <div className="p-6">
                    <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                        Apakah Anda yakin ingin mereset database?
                    </h2>

                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                        PERINGATAN: Tindakan ini akan <strong>MENGHAPUS SEMUA DATA</strong> transaksi, pengaturan, dan master data (kecuali Tabel Users).
                        Data yang dihapus tidak dapat dipulihkan kembali kecuali Anda memiliki backup.
                        Silakan masukkan password Anda untuk konfirmasi.
                    </p>

                    <div className="mt-6">
                        <InputLabel htmlFor="password" value="Password" className="sr-only" />

                        <TextInput
                            id="password"
                            type="password"
                            name="password"
                            isFocused={true}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="mt-1 block w-3/4 text-gray-900"
                            placeholder="Password"
                        />

                        <InputError message={passwordError} className="mt-2" />
                    </div>

                    <div className="mt-6 flex justify-end">
                        <SecondaryButton onClick={closeResetModal}>
                            Batal
                        </SecondaryButton>

                        <DangerButton className="ml-3" disabled={processingReset} onClick={handleResetDatabase}>
                            {processingReset ? 'Mereset...' : 'Reset Database'}
                        </DangerButton>
                    </div>
                </div>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal show={confirmingDeletion} onClose={closeDeleteModal}>
                <div className="p-6">
                    <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                        Konfirmasi Hapus Backup
                    </h2>

                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                        Apakah Anda yakin ingin menghapus file backup <strong>{fileToDelete}</strong>?
                        Tindakan ini tidak dapat dibatalkan.
                    </p>

                    <div className="mt-6 flex justify-end">
                        <SecondaryButton onClick={closeDeleteModal} disabled={processingDelete}>
                            Batal
                        </SecondaryButton>

                        <DangerButton className="ml-3" onClick={executeDelete} disabled={processingDelete}>
                            {processingDelete ? 'Menghapus...' : 'Hapus'}
                        </DangerButton>
                    </div>
                </div>
            </Modal>

            {/* Restore Confirmation Modal */}
            <Modal show={showRestoreModal} onClose={closeRestoreModal}>
                <div className="p-6">
                    <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                        Konfirmasi Restore Database &amp; Berkas
                    </h2>

                    <div className="mt-4">
                        <div className="bg-yellow-50 dark:bg-yellow-950/40 border-l-4 border-yellow-400 dark:border-yellow-600 p-4 mb-4">
                            <div className="flex">
                                <div className="flex-shrink-0">
                                    <svg className="h-5 w-5 text-yellow-500" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                    </svg>
                                </div>
                                <div className="ml-3">
                                    <p className="text-sm text-yellow-800 dark:text-yellow-200">
                                        PERINGATAN: Proses ini akan <strong>MENIMPA</strong> skema database saat ini serta memulihkan file fisik unggahan (kop surat, logo, dan dokumen) dari file backup.
                                        Pastikan Anda telah membuat backup data saat ini sebelum melanjutkan.
                                    </p>
                                    <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                                        *File backup format lama (.sql polos) tetap didukung secara otomatis.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {restoreFile && (
                            <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                <p className="text-sm text-gray-600 dark:text-gray-300 font-semibold">File yang dipilih:</p>
                                <p className="text-md text-gray-900 dark:text-gray-100">{restoreFile.name}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Ukuran: {(restoreFile.size / 1024).toFixed(2)} KB</p>
                            </div>
                        )}

                        {/* Progress Bar & Status */}
                        {restoreStatus !== 'idle' && (
                            <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-700/60 rounded-lg border border-gray-200 dark:border-gray-600 space-y-3">
                                <div className="flex items-center justify-between text-sm">
                                    <div className="flex items-center font-medium">
                                        {restoreStatus === 'processing' || restoreStatus === 'uploading' ? (
                                            <svg className="animate-spin -ml-0.5 mr-2.5 h-4 w-4 text-indigo-600 dark:text-indigo-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                                            </svg>
                                        ) : restoreStatus === 'completed' ? (
                                            <svg className="w-5 h-5 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        ) : (
                                            <svg className="w-5 h-5 text-red-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        )}
                                        <span className={
                                            restoreStatus === 'error'
                                                ? 'text-red-700 dark:text-red-400 font-semibold'
                                                : restoreStatus === 'completed'
                                                    ? 'text-green-700 dark:text-green-400 font-semibold'
                                                    : 'text-indigo-700 dark:text-indigo-300 font-medium'
                                        }>
                                            {restoreMessage || (restoreStatus === 'uploading' ? 'Mengunggah berkas...' : 'Memproses di server...')}
                                        </span>
                                    </div>
                                    <span className="font-bold text-sm text-gray-700 dark:text-gray-300 ml-2 tabular-nums">
                                        {restoreProgress}%
                                    </span>
                                </div>

                                <div className="w-full bg-gray-200 rounded-full h-3 dark:bg-gray-600 overflow-hidden">
                                    <div
                                        className={`h-3 rounded-full transition-all duration-200 ease-out ${
                                            restoreStatus === 'error'
                                                ? 'bg-red-600'
                                                : restoreStatus === 'completed'
                                                    ? 'bg-green-600'
                                                    : 'bg-indigo-600'
                                        }`}
                                        style={{ width: `${restoreProgress}%` }}
                                    ></div>
                                </div>

                                {restoreError && (
                                    <div className="p-3 bg-red-100 border border-red-300 rounded text-red-700 text-xs dark:bg-red-900/40 dark:border-red-700 dark:text-red-300">
                                        <strong>Kendala:</strong> {restoreError}
                                    </div>
                                )}

                                {restoreStatus === 'completed' && (
                                    <p className="text-xs text-center text-green-600 dark:text-green-400 font-medium">
                                        Sistem sedang memuat ulang halaman secara otomatis...
                                    </p>
                                )}

                                {(restoreStatus === 'uploading' || restoreStatus === 'processing') && (
                                    <p className="text-xs text-center text-gray-500 dark:text-gray-400">
                                        Proses restore sedang berjalan, mohon jangan menutup jendela ini...
                                    </p>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="mt-6 flex justify-end">
                        {restoreStatus === 'error' ? (
                            <SecondaryButton onClick={closeRestoreModal}>
                                Tutup
                            </SecondaryButton>
                        ) : (
                            <>
                                <SecondaryButton onClick={closeRestoreModal} disabled={restoreStatus === 'uploading' || restoreStatus === 'processing'}>
                                    Batal
                                </SecondaryButton>

                                <PrimaryButton className="ml-3" disabled={restoreStatus !== 'idle'} onClick={executeRestore}>
                                    {restoreStatus === 'idle' ? 'Mulai Restore' : 'Sedang Memproses...'}
                                </PrimaryButton>
                            </>
                        )}
                    </div>
                </div>
            </Modal>

            {/* NPSN Modal */}
            <Modal show={showNpsnModal} onClose={closeNpsnModal}>
                <div className="p-6">
                    <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                        Edit APP_NPSN_CODE & Reset Database
                    </h2>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                        Anda harus melakukan Reset Database terlebih dahulu sebelum dapat mengubah NPSN.
                    </p>

                    <div className="mt-6 border-b pb-6 border-gray-200 dark:border-gray-700">
                        <div className="flex justify-between items-center">
                            <div>
                                <h3 className="text-md font-medium text-gray-900 dark:text-gray-100">Reset Database</h3>
                                <p className="text-xs text-red-500 mt-1">Hapus semua data (Kecuali User)</p>
                            </div>
                            <DangerButton onClick={confirmReset} disabled={isDatabaseReset}>
                                {isDatabaseReset ? 'Database Telah Direset' : 'Reset Database'}
                            </DangerButton>
                        </div>
                    </div>

                    <form onSubmit={submitNpsn} className="mt-6">
                        <InputLabel htmlFor="npsn_code" value="NPSN Code" />
                        <TextInput
                            id="npsn_code"
                            type="text"
                            name="npsn_code"
                            value={npsnData.npsn_code}
                            onChange={(e) => setNpsnData('npsn_code', e.target.value)}
                            className="mt-1 block w-full dark:text-gray-950"
                            disabled={!isDatabaseReset}
                            isFocused={isDatabaseReset}
                        />
                        <InputError message={npsnErrors.npsn_code} className="mt-2" />
                        
                        <div className="mt-6 flex justify-end">
                            <SecondaryButton onClick={closeNpsnModal} type="button">Batal</SecondaryButton>
                            <PrimaryButton className="ml-3" disabled={processingNpsn || !isDatabaseReset}>
                                {processingNpsn ? 'Menyimpan...' : 'Simpan NPSN'}
                            </PrimaryButton>
                        </div>
                    </form>
                </div>
            </Modal>
        </AuthenticatedLayout>
    );
}
