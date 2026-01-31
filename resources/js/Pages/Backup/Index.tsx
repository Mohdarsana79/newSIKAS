import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, router } from '@inertiajs/react'; // Import router correctly
import { useState, useRef } from 'react';
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
}

export default function BackupIndex({ auth, backupFiles, stats, flash }: PageProps) {
    const [confirmingReset, setConfirmingReset] = useState(false);
    const [password, setPassword] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [processingReset, setProcessingReset] = useState(false);

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

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setRestoreFile(file);
            setShowRestoreModal(true);
            // Reset input value to allow selecting same file again if passed
            e.target.value = '';
        }
    };

    const closeRestoreModal = () => {
        if (processingRestore) return; // Prevent closing while processing
        setShowRestoreModal(false);
        setRestoreFile(null);
        setRestoreProgress(0);
        resetRestoreForm();
    };

    const executeRestore = () => {
        if (!restoreFile) return;

        // Manually set data just before submit or use setData in effect?
        // useForm setData is sync.
        setRestoreData('backup_file', restoreFile);

        // We need to wait for state update? No, setData updates the form data object.
        // However, post reads from current 'data'.
        // Better trigger post directly with data options is not possible in v0.
        // Workaround: We can't easily hook into useForm's 'post' with new data in same tick without effects.
        // So we will use router.post directly to have full control for this specific file upload case, 
        // OR we trust UseForm. Let's use router manually to keep progress simple or stick to useForm but set data first.

        // Actually, let's use router.post directly here for cleaner "event" handling
        router.post(route('backup.restore'), {
            backup_file: restoreFile
        }, {
            forceFormData: true,
            onProgress: (progress) => {
                const percentage = progress && progress.total ? Math.round((progress.loaded * 100) / progress.total) : 0;
                setRestoreProgress(percentage);
            },
            onSuccess: () => {
                closeRestoreModal();
            },
            onError: () => {
                setRestoreProgress(0);
                // Keep modal open to show error
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
                    window.location.href = resetRes.data.redirect_url;
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
                            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Buat Backup Baru</h3>
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
                                File backup akan disimpan dengan ekstensi <strong>.rsv</strong>. Anda dapat mengunduhnya nanti.
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
                                <p className="text-xs text-center text-gray-500 mt-1">Upload file .rsv / .btb</p>
                            </div>

                            <hr className="border-gray-200 dark:border-gray-700" />

                            {/* Reset Button */}
                            <div>
                                <DangerButton onClick={confirmReset} className="w-full justify-center">
                                    <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                    Reset Database
                                </DangerButton>
                                <p className="text-xs text-center text-red-500 mt-1">Hapus semua data (Kecuali User)</p>
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
                        Konfirmasi Restore Database
                    </h2>

                    <div className="mt-4">
                        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
                            <div className="flex">
                                <div className="flex-shrink-0">
                                    <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                    </svg>
                                </div>
                                <div className="ml-3">
                                    <p className="text-sm text-yellow-700">
                                        PERINGATAN: Proses ini akan <strong>MENIMPA</strong> data database saat ini dengan data dari file backup.
                                        Pastikan Anda telah melakukan backup data saat ini sebelum melanjutkkan.
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

                        {/* Progress Bar */}
                        {restoreProgress > 0 && (
                            <div className="mb-4">
                                <div className="flex justify-between mb-1">
                                    <span className="text-sm font-medium text-indigo-700 dark:text-indigo-400">
                                        {restoreProgress < 100 ? 'Mengupload...' : 'Memproses Database...'}
                                    </span>
                                    <span className="text-sm font-medium text-indigo-700 dark:text-indigo-400">{restoreProgress}%</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                                    <div
                                        className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300"
                                        style={{ width: `${restoreProgress}%` }}
                                    ></div>
                                </div>
                                {restoreProgress === 100 && (
                                    <p className="text-xs text-center text-gray-500 mt-2 animate-pulse">Sedang melakukan restore data, mohon tunggu jangan tutup halaman ini...</p>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="mt-6 flex justify-end">
                        <SecondaryButton onClick={closeRestoreModal} disabled={restoreProgress > 0 && restoreProgress < 100}>
                            Batal
                        </SecondaryButton>

                        <PrimaryButton className="ml-3" disabled={restoreProgress > 0} onClick={executeRestore}>
                            {restoreProgress > 0 ? 'Sedang Memproses...' : 'Mulai Restore'}
                        </PrimaryButton>
                    </div>
                </div>
            </Modal>
        </AuthenticatedLayout>
    );
}
