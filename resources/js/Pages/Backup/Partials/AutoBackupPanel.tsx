import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { router, useForm } from '@inertiajs/react';
import Surface from '@/Components/ui/Surface';
import DataTable from '@/Components/ui/DataTable';
import EmptyState from '@/Components/ui/EmptyState';
import IconTile from '@/Components/ui/IconTile';
import StatusBadge from '@/Components/ui/StatusBadge';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import InputError from '@/Components/InputError';
import useVariantRoute from '@/Hooks/useVariantRoute';
import { extractAxiosErrorData, extractAxiosErrorMessage } from '@/lib/axiosError';
import FolderPickerModal from './FolderPickerModal';

export interface AutoBackupSetting {
    is_enabled: boolean;
    frequency: 'daily' | 'weekly' | 'monthly';
    scheduled_time: string;
    day_of_week: number;
    day_of_month: number;
    retention_enabled: boolean;
    retention_max_files: number;
    retention_max_days: number | null;
    sync_mode: 'none' | 'local_folder' | 'google_drive_api';
    local_sync_path: string;
    sync_apply_retention: boolean;
    gdrive_folder_id: string;
    gdrive_client_id: string;
    has_gdrive_client_secret: boolean;
    has_gdrive_refresh_token: boolean;
    gdrive_secrets_corrupted?: boolean;
    last_run_at_formatted: string | null;
    last_run_at_human: string | null;
    last_run_status: 'success' | 'partial' | 'failed' | null;
    last_run_message: string | null;
    last_backup_file: string | null;
    has_pending_cloud_sync?: boolean;
    pending_cloud_file?: string | null;
}

export interface BackupRunItem {
    id: number;
    trigger: 'scheduled' | 'manual_auto';
    status: 'success' | 'partial' | 'failed';
    file_name: string | null;
    file_size_formatted: string;
    pruned_count: number;
    sync_mode: 'none' | 'local_folder' | 'google_drive_api';
    sync_status: 'skipped' | 'success' | 'failed';
    sync_target: string | null;
    message: string;
    created_at_formatted: string;
    created_at_human: string;
}

export interface SchedulerCommands {
    os: 'windows' | 'linux';
    windows: string | null;
    linux: string | null;
}

export interface WindowsSchedulerStatus {
    supported: boolean;
    installed: boolean;
    path_matches_current: boolean;
    task_name: string;
    runner_path: string;
    message: string;
}

interface AutoBackupPanelProps {
    setting: AutoBackupSetting;
    runs: BackupRunItem[];
    schedulerCommands: SchedulerCommands | null;
    windowsSchedulerStatus?: WindowsSchedulerStatus | null;
    defaultBackupDir?: string | null;
    canWriteBackup?: boolean;
    appTimezone?: string;
}

interface AutoBackupFormState {
    is_enabled: boolean;
    frequency: 'daily' | 'weekly' | 'monthly';
    scheduled_time: string;
    day_of_week: number;
    day_of_month: number;
    retention_enabled: boolean;
    retention_max_files: string;
    retention_max_days: string;
    sync_mode: 'none' | 'local_folder' | 'google_drive_api';
    local_sync_path: string;
    sync_apply_retention: boolean;
    gdrive_folder_id: string;
    gdrive_client_id: string;
    gdrive_client_secret: string;
    gdrive_refresh_token: string;
    clear_gdrive_secrets: boolean;
}

const DAY_NAMES = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

function buildFormState(setting: AutoBackupSetting): AutoBackupFormState {
    return {
        is_enabled: setting.is_enabled,
        frequency: setting.frequency,
        scheduled_time: setting.scheduled_time || '22:00',
        day_of_week: setting.day_of_week ?? 0,
        day_of_month: setting.day_of_month ?? 1,
        retention_enabled: setting.retention_enabled,
        retention_max_files: String(setting.retention_max_files ?? 14),
        retention_max_days: setting.retention_max_days !== null ? String(setting.retention_max_days) : '',
        sync_mode: setting.sync_mode || 'none',
        local_sync_path: setting.local_sync_path || '',
        sync_apply_retention: setting.sync_apply_retention,
        gdrive_folder_id: setting.gdrive_folder_id || '',
        gdrive_client_id: setting.gdrive_client_id || '',
        gdrive_client_secret: '',
        gdrive_refresh_token: '',
        clear_gdrive_secrets: false,
    };
}

function formatScheduleSummary(
    frequency: 'daily' | 'weekly' | 'monthly',
    time: string,
    dayOfWeek: number,
    dayOfMonth: number,
): string {
    const safeTime = time || '22:00';
    if (frequency === 'weekly') {
        const day = DAY_NAMES[dayOfWeek] ?? 'Minggu';
        return `Setiap ${day} pukul ${safeTime}`;
    }
    if (frequency === 'monthly') {
        return `Setiap Tanggal ${dayOfMonth || 1} pukul ${safeTime}`;
    }
    return `Setiap Hari pukul ${safeTime}`;
}

function syncModeLabel(mode: string, hasLocalPath: boolean): string {
    if (mode === 'google_drive_api') {
        return hasLocalPath ? 'Folder Pilihan + Google Drive API' : 'Lokal + Google Drive Cloud API';
    }
    if (mode === 'local_folder' && hasLocalPath) {
        return 'Folder Lokal / Drive Desktop';
    }
    return 'Penyimpanan Lokal Bawaan';
}

export default function AutoBackupPanel({
    setting,
    runs,
    schedulerCommands,
    windowsSchedulerStatus: initialWinStatus = null,
    defaultBackupDir = null,
    canWriteBackup = true,
    appTimezone = 'UTC',
}: AutoBackupPanelProps) {
    const vRoute = useVariantRoute();
    const [runningNow, setRunningNow] = useState(false);
    const [retryingCloud, setRetryingCloud] = useState(false);
    const [testingSync, setTestingSync] = useState(false);
    const [testResult, setTestResult] = useState<{
        success: boolean;
        message: string;
    } | null>(null);
    const [copiedKey, setCopiedKey] = useState<'windows' | 'linux' | null>(null);
    const copyTimerRef = useRef<number | null>(null);

    // Online/Offline indicator
    const [isOnline, setIsOnline] = useState<boolean>(() =>
        typeof navigator !== 'undefined' ? navigator.onLine : true,
    );

    // Folder Picker Modal
    const [showFolderPicker, setShowFolderPicker] = useState(false);

    // 1-Click Windows Task Scheduler state
    const [winStatus, setWinStatus] = useState<WindowsSchedulerStatus | null>(initialWinStatus);
    const [winActionBusy, setWinActionBusy] = useState(false);
    const [winFeedback, setWinFeedback] = useState<{ success: boolean; message: string } | null>(null);

    useEffect(() => {
        setWinStatus(initialWinStatus);
    }, [initialWinStatus]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const onOnline = () => setIsOnline(true);
        const onOffline = () => setIsOnline(false);
        window.addEventListener('online', onOnline);
        window.addEventListener('offline', onOffline);
        return () => {
            window.removeEventListener('online', onOnline);
            window.removeEventListener('offline', onOffline);
        };
    }, []);

    const { data, setData, setDefaults, post, processing, errors, isDirty, reset } =
        useForm<AutoBackupFormState>(() => buildFormState(setting));

    const configSignature = useMemo(
        () =>
            JSON.stringify({
                is_enabled: setting.is_enabled,
                frequency: setting.frequency,
                scheduled_time: setting.scheduled_time,
                day_of_week: setting.day_of_week,
                day_of_month: setting.day_of_month,
                retention_enabled: setting.retention_enabled,
                retention_max_files: setting.retention_max_files,
                retention_max_days: setting.retention_max_days,
                sync_mode: setting.sync_mode,
                local_sync_path: setting.local_sync_path,
                sync_apply_retention: setting.sync_apply_retention,
                gdrive_folder_id: setting.gdrive_folder_id,
                gdrive_client_id: setting.gdrive_client_id,
                has_gdrive_client_secret: setting.has_gdrive_client_secret,
                has_gdrive_refresh_token: setting.has_gdrive_refresh_token,
            }),
        [setting],
    );

    const prevSignatureRef = useRef<string>(configSignature);

    useEffect(() => {
        if (prevSignatureRef.current !== configSignature) {
            prevSignatureRef.current = configSignature;
            const nextState = buildFormState(setting);
            setDefaults(nextState);
            setData(nextState);
        }
    }, [configSignature, setting, setData, setDefaults]);

    useEffect(() => {
        return () => {
            if (copyTimerRef.current !== null) {
                window.clearTimeout(copyTimerRef.current);
            }
        };
    }, []);

    // 2 mode UI utama: 'local' (none | local_folder) vs 'cloud' (google_drive_api)
    const isCloudMode = data.sync_mode === 'google_drive_api';

    const handleSelectUiMode = (mode: 'local' | 'cloud') => {
        setTestResult(null);
        if (mode === 'cloud') {
            setData('sync_mode', 'google_drive_api');
        } else {
            setData('sync_mode', data.local_sync_path.trim() !== '' ? 'local_folder' : 'none');
        }
    };

    const handleLocalPathChange = (nextPath: string) => {
        setData((prev) => ({
            ...prev,
            local_sync_path: nextPath,
            sync_mode:
                prev.sync_mode === 'google_drive_api'
                    ? 'google_drive_api'
                    : nextPath.trim() !== ''
                      ? 'local_folder'
                      : 'none',
        }));
    };

    const handleSaveSettings = (e: FormEvent) => {
        e.preventDefault();
        if (!canWriteBackup) return;
        setTestResult(null);
        post(vRoute('backup.auto-settings.update'), {
            preserveScroll: true,
            onSuccess: () => {
                const trimmedLocal = data.local_sync_path.trim();
                const committed: AutoBackupFormState = {
                    ...data,
                    local_sync_path: trimmedLocal,
                    gdrive_folder_id: data.gdrive_folder_id.trim(),
                    gdrive_client_id: data.gdrive_client_id.trim(),
                    sync_mode:
                        data.sync_mode === 'google_drive_api'
                            ? 'google_drive_api'
                            : trimmedLocal !== ''
                              ? 'local_folder'
                              : 'none',
                    gdrive_client_secret: '',
                    gdrive_refresh_token: '',
                    clear_gdrive_secrets: false,
                };
                setDefaults(committed);
                setData(committed);
            },
        });
    };

    const handleRunNow = () => {
        if (!canWriteBackup || runningNow) return;
        setRunningNow(true);
        router.post(
            vRoute('backup.auto-run'),
            {},
            {
                preserveScroll: true,
                onFinish: () => setRunningNow(false),
            },
        );
    };

    const handleRetryCloudNow = () => {
        if (!canWriteBackup || retryingCloud) return;
        setRetryingCloud(true);
        router.post(
            vRoute('backup.auto-retry-cloud'),
            {},
            {
                preserveScroll: true,
                onFinish: () => setRetryingCloud(false),
            },
        );
    };

    const handleTestSync = async (targetMode: 'local_folder' | 'google_drive_api') => {
        if (!canWriteBackup || testingSync) return;
        setTestingSync(true);
        setTestResult(null);
        try {
            const response = await window.axios.post(vRoute('backup.auto-test-sync'), {
                sync_mode: targetMode,
                local_sync_path: data.local_sync_path,
                gdrive_folder_id: data.gdrive_folder_id,
                gdrive_client_id: data.gdrive_client_id,
                gdrive_client_secret: data.gdrive_client_secret,
                gdrive_refresh_token: data.gdrive_refresh_token,
            });
            setTestResult({
                success: Boolean(response.data?.success),
                message: response.data?.message || 'Koneksi berhasil diverifikasi.',
            });
        } catch (err: unknown) {
            setTestResult({
                success: false,
                message: extractAxiosErrorMessage(
                    err,
                    'Gagal menguji koneksi sinkronisasi. Periksa kembali konfigurasi Anda.',
                ),
            });
        } finally {
            setTestingSync(false);
        }
    };

    const handleWindowsSchedulerAction = async (action: 'install' | 'remove') => {
        if (!canWriteBackup || winActionBusy) return;
        setWinActionBusy(true);
        setWinFeedback(null);
        try {
            const routeName =
                action === 'install' ? 'backup.auto-scheduler.install' : 'backup.auto-scheduler.remove';
            const res = await window.axios.post<{
                success: boolean;
                message: string;
                status?: WindowsSchedulerStatus;
            }>(vRoute(routeName));
            if (res.data.status) {
                setWinStatus(res.data.status);
            }
            setWinFeedback({
                success: Boolean(res.data.success),
                message: res.data.message,
            });
        } catch (err: unknown) {
            const errData = extractAxiosErrorData<{ status?: WindowsSchedulerStatus }>(err);
            if (errData?.status) {
                setWinStatus(errData.status);
            }
            setWinFeedback({
                success: false,
                message: extractAxiosErrorMessage(err, 'Gagal memperbarui Windows Task Scheduler.'),
            });
        } finally {
            setWinActionBusy(false);
        }
    };

    const handleCopyCommand = async (key: 'windows' | 'linux', text: string) => {
        let ok = false;
        if (navigator.clipboard && window.isSecureContext) {
            try {
                await navigator.clipboard.writeText(text);
                ok = true;
            } catch {
                ok = false;
            }
        }
        if (!ok) {
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            try {
                document.execCommand('copy');
                ok = true;
            } catch {
                ok = false;
            } finally {
                document.body.removeChild(textarea);
            }
        }
        if (ok) {
            if (copyTimerRef.current !== null) {
                window.clearTimeout(copyTimerRef.current);
            }
            setCopiedKey(key);
            copyTimerRef.current = window.setTimeout(() => {
                setCopiedKey((prev) => (prev === key ? null : prev));
                copyTimerRef.current = null;
            }, 2200);
        }
    };

    const lastStatusTone =
        setting.last_run_status === 'success'
            ? 'success'
            : setting.last_run_status === 'partial'
              ? 'warning'
              : setting.last_run_status === 'failed'
                ? 'danger'
                : 'neutral';

    const lastStatusLabel =
        setting.last_run_status === 'success'
            ? 'Berhasil'
            : setting.last_run_status === 'partial'
              ? 'Sebagian (Lokal OK)'
              : setting.last_run_status === 'failed'
                ? 'Gagal'
                : 'Belum Pernah Berjalan';

    const hasAnyStoredSecrets =
        setting.has_gdrive_client_secret ||
        setting.has_gdrive_refresh_token ||
        Boolean(setting.gdrive_secrets_corrupted);

    return (
        <div className="space-y-4">
            {/* Hero Status Strip */}
            <div className="relative overflow-hidden rounded-[26px] bg-[#15131F] p-5 text-white shadow-sm">
                <div className="pointer-events-none absolute -right-12 -top-16 h-48 w-48 rounded-full bg-brand-500/20 blur-3xl" />
                <div className="pointer-events-none absolute -bottom-16 left-1/3 h-40 w-40 rounded-full bg-mint/15 blur-3xl" />

                <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                            <StatusBadge tone={setting.is_enabled ? 'success' : 'neutral'}>
                                {setting.is_enabled ? 'Auto-Backup Aktif' : 'Auto-Backup Nonaktif'}
                            </StatusBadge>
                            <StatusBadge tone={isOnline ? 'info' : 'warning'}>
                                {isOnline ? 'Online' : 'Mode Offline (Backup Lokal Tetap Jalan)'}
                            </StatusBadge>
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-bold text-slate-200">
                                {formatScheduleSummary(
                                    setting.frequency,
                                    setting.scheduled_time,
                                    setting.day_of_week,
                                    setting.day_of_month,
                                )}{' '}
                                ({appTimezone})
                            </span>
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-bold text-slate-200">
                                {syncModeLabel(setting.sync_mode, Boolean(setting.local_sync_path))}
                            </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px]">
                            <span className="font-semibold text-slate-400">Eksekusi Terakhir:</span>
                            <StatusBadge tone={lastStatusTone} dot={false}>
                                {lastStatusLabel}
                            </StatusBadge>
                            {setting.last_run_at_formatted && (
                                <span className="font-bold text-white">
                                    {setting.last_run_at_formatted}
                                    {setting.last_run_at_human ? ` (${setting.last_run_at_human})` : ''}
                                </span>
                            )}
                        </div>

                        {setting.last_run_message && (
                            <p className="max-w-3xl text-[11px] leading-relaxed text-slate-300">
                                {setting.last_run_message}
                            </p>
                        )}
                    </div>

                    {canWriteBackup && (
                        <div className="flex shrink-0 flex-wrap items-center gap-2">
                            <button
                                type="button"
                                onClick={handleRunNow}
                                disabled={runningNow}
                                aria-busy={runningNow}
                                className="inline-flex items-center gap-2 rounded-2xl bg-lime-300 px-4 py-2.5 text-[11.5px] font-extrabold text-slate-950 shadow-sm transition hover:-translate-y-0.5 hover:bg-lime-200 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {runningNow ? (
                                    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                                    </svg>
                                ) : (
                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2} aria-hidden="true">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                )}
                                {runningNow ? 'Menjalankan Auto-Backup...' : 'Jalankan Auto-Backup Sekarang'}
                            </button>
                        </div>
                    )}
                </div>

                {/* Pending Cloud Sync Banner (Offline-First Auto-Retry) */}
                {setting.has_pending_cloud_sync && setting.pending_cloud_file && (
                    <div className="relative mt-4 flex flex-col items-start justify-between gap-3 rounded-2xl border border-amber-400/30 bg-amber-400/10 p-3.5 sm:flex-row sm:items-center">
                        <div className="min-w-0">
                            <p className="text-[11.5px] font-extrabold text-amber-200">
                                Menunggu Unggah ke Google Drive (Auto-Retry Aktif)
                            </p>
                            <p className="mt-0.5 text-[10.5px] text-amber-100/90">
                                Berkas <code className="font-mono font-bold">{setting.pending_cloud_file}</code> sudah aman di komputer Anda dan akan otomatis diunggah ke Google Drive begitu koneksi internet stabil.
                            </p>
                        </div>
                        {canWriteBackup && (
                            <button
                                type="button"
                                onClick={handleRetryCloudNow}
                                disabled={retryingCloud}
                                aria-busy={retryingCloud}
                                className="shrink-0 rounded-xl bg-amber-300 px-3.5 py-2 text-[11px] font-extrabold text-slate-950 transition hover:bg-amber-200 disabled:opacity-60"
                            >
                                {retryingCloud ? 'Mengunggah...' : 'Coba Unggah ke Cloud Sekarang'}
                            </button>
                        )}
                    </div>
                )}
            </div>

            {!canWriteBackup && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50/70 px-4 py-3 text-[11px] font-semibold text-amber-800 dark:border-amber-400/20 dark:bg-amber-500/10 dark:text-amber-200">
                    Anda hanya memiliki izin baca pada modul Backup. Perubahan jadwal, retensi, dan sinkronisasi dinonaktifkan.
                </div>
            )}

            {/* Settings Form */}
            <form onSubmit={handleSaveSettings} className="space-y-4">
                <fieldset disabled={!canWriteBackup} className="grid grid-cols-1 gap-4 xl:grid-cols-2 disabled:opacity-75">
                    {/* Card 1: Jadwal & Retensi Otomatis */}
                    <Surface
                        title="Jadwal & Retensi Otomatis"
                        subtitle="Atur frekuensi backup otomatis (jalan penuh meski offline) dan pembersihan berkas lama yang aman."
                        icon={
                            <IconTile tone="violet" size="md">
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </IconTile>
                        }
                    >
                        <div className="space-y-4">
                            {/* Master Toggle */}
                            <label className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5 dark:border-white/5 dark:bg-white/[0.03]">
                                <div className="min-w-0">
                                    <span className="block text-[12px] font-extrabold text-slate-900 dark:text-white">
                                        Aktifkan Auto-Backup Terjadwal
                                    </span>
                                    <span className="block text-[10.5px] font-medium text-slate-500 dark:text-slate-400">
                                        Menghasilkan arsip all-in-one <code className="font-mono font-bold">auto_backup_*.rsv</code> secara otomatis (online &amp; offline).
                                    </span>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={data.is_enabled}
                                    onChange={(e) => setData('is_enabled', e.target.checked)}
                                    className="h-5 w-5 rounded-md border-slate-300 text-brand-600 focus:ring-brand-500"
                                />
                            </label>

                            {/* Frequency Selector */}
                            <div>
                                <InputLabel value="Frekuensi Jadwal" />
                                <div role="group" aria-label="Frekuensi Jadwal" className="mt-1.5 grid grid-cols-3 gap-2">
                                    {(
                                        [
                                            { key: 'daily', label: 'Harian' },
                                            { key: 'weekly', label: 'Mingguan' },
                                            { key: 'monthly', label: 'Bulanan' },
                                        ] as const
                                    ).map((opt) => {
                                        const selected = data.frequency === opt.key;
                                        return (
                                            <button
                                                key={opt.key}
                                                type="button"
                                                aria-pressed={selected}
                                                onClick={() => setData('frequency', opt.key)}
                                                className={`rounded-xl border px-3 py-2 text-[11px] font-extrabold transition ${
                                                    selected
                                                        ? 'border-brand-500 bg-brand-50 text-brand-700 dark:border-brand-400 dark:bg-brand-500/15 dark:text-brand-200'
                                                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-300'
                                                }`}
                                            >
                                                {opt.label}
                                            </button>
                                        );
                                    })}
                                </div>
                                <InputError message={errors.frequency} className="mt-1.5" />
                            </div>

                            {/* Time & Conditional Day */}
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <div>
                                    <InputLabel htmlFor="scheduled_time" value={`Jam Eksekusi (HH:MM — ${appTimezone})`} />
                                    <TextInput
                                        id="scheduled_time"
                                        type="time"
                                        className="mt-1 block w-full"
                                        value={data.scheduled_time}
                                        onChange={(e) => setData('scheduled_time', e.target.value)}
                                        required
                                    />
                                    <InputError message={errors.scheduled_time} className="mt-1.5" />
                                </div>

                                {data.frequency === 'weekly' && (
                                    <div>
                                        <InputLabel htmlFor="day_of_week" value="Hari Pelaksanaan" />
                                        <select
                                            id="day_of_week"
                                            value={data.day_of_week}
                                            onChange={(e) => setData('day_of_week', Number(e.target.value))}
                                            className="mt-1 block w-full rounded-xl border-slate-200 bg-white text-[12px] font-semibold text-slate-800 shadow-sm focus:border-brand-500 focus:ring-brand-500 dark:border-white/10 dark:bg-slate-900 dark:text-white"
                                        >
                                            {DAY_NAMES.map((name, idx) => (
                                                <option key={idx} value={idx}>
                                                    {name}
                                                </option>
                                            ))}
                                        </select>
                                        <InputError message={errors.day_of_week} className="mt-1.5" />
                                    </div>
                                )}

                                {data.frequency === 'monthly' && (
                                    <div>
                                        <InputLabel htmlFor="day_of_month" value="Tanggal Pelaksanaan (1–28)" />
                                        <select
                                            id="day_of_month"
                                            value={data.day_of_month}
                                            onChange={(e) => setData('day_of_month', Number(e.target.value))}
                                            className="mt-1 block w-full rounded-xl border-slate-200 bg-white text-[12px] font-semibold text-slate-800 shadow-sm focus:border-brand-500 focus:ring-brand-500 dark:border-white/10 dark:bg-slate-900 dark:text-white"
                                        >
                                            {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                                                <option key={day} value={day}>
                                                    Tanggal {day}
                                                </option>
                                            ))}
                                        </select>
                                        <InputError message={errors.day_of_month} className="mt-1.5" />
                                    </div>
                                )}
                            </div>

                            <div className="border-t border-slate-100 pt-4 dark:border-white/5">
                                <label className="flex cursor-pointer items-center justify-between gap-3">
                                    <div>
                                        <span className="block text-[12px] font-extrabold text-slate-900 dark:text-white">
                                            Retensi Otomatis (Pembersihan Berkas Lama)
                                        </span>
                                        <span className="block text-[10.5px] font-medium text-slate-500 dark:text-slate-400">
                                            Mencegah penyimpanan penuh akibat tumpukan file auto-backup.
                                        </span>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={data.retention_enabled}
                                        onChange={(e) => setData('retention_enabled', e.target.checked)}
                                        className="h-5 w-5 rounded-md border-slate-300 text-brand-600 focus:ring-brand-500"
                                    />
                                </label>

                                {(data.retention_enabled || (data.local_sync_path.trim() !== '' && data.sync_apply_retention)) && (
                                    <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                                        <div>
                                            <InputLabel htmlFor="retention_max_files" value="Maksimal File Disimpan (1–365)" />
                                            <TextInput
                                                id="retention_max_files"
                                                type="number"
                                                min={1}
                                                max={365}
                                                className="mt-1 block w-full"
                                                value={data.retention_max_files}
                                                onChange={(e) => setData('retention_max_files', e.target.value)}
                                                required
                                            />
                                            <InputError message={errors.retention_max_files} className="mt-1.5" />
                                        </div>
                                        <div>
                                            <InputLabel htmlFor="retention_max_days" value="Batas Umur Hari (Opsional)" />
                                            <TextInput
                                                id="retention_max_days"
                                                type="number"
                                                min={7}
                                                max={3650}
                                                placeholder="Kosongkan jika tanpa batas hari"
                                                className="mt-1 block w-full"
                                                value={data.retention_max_days}
                                                onChange={(e) => setData('retention_max_days', e.target.value)}
                                            />
                                            <InputError message={errors.retention_max_days} className="mt-1.5" />
                                        </div>
                                    </div>
                                )}

                                {/* Safety Banner */}
                                <div className="mt-3 flex items-start gap-2.5 rounded-2xl border border-mint/25 bg-pastel-mint/50 p-3 dark:border-mint/20 dark:bg-mint/10">
                                    <svg className="mt-0.5 h-4 w-4 shrink-0 text-mint" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                    </svg>
                                    <p className="text-[10.5px] font-semibold leading-relaxed text-emerald-800 dark:text-emerald-200">
                                        <strong>Jaminan Keamanan:</strong> Retensi otomatis hanya menghapus berkas berpola{' '}
                                        <code className="font-mono">auto_backup_*.rsv</code> dan selalu mempertahankan minimal 1 auto-backup terbaru.{' '}
                                        <strong>Backup manual Bendahara tidak pernah dihapus.</strong>
                                    </p>
                                </div>
                            </div>
                        </div>
                    </Surface>

                    {/* Card 2: Tujuan Penyimpanan (2 Mode Sederhana + Folder Picker) */}
                    <Surface
                        title="Tujuan Penyimpanan Auto-Backup"
                        subtitle="Pilih folder yang mudah Anda temukan di komputer (Drive D, Documents, Google Drive Desktop), atau hubungkan ke Google Drive Cloud API."
                        icon={
                            <IconTile tone="sky" size="md">
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                                </svg>
                            </IconTile>
                        }
                    >
                        <div className="space-y-4">
                            {/* 2 Clear Mode Selector */}
                            <div role="radiogroup" aria-label="Mode Tujuan Penyimpanan" className="grid grid-cols-1 gap-2">
                                <button
                                    type="button"
                                    role="radio"
                                    aria-checked={!isCloudMode}
                                    onClick={() => handleSelectUiMode('local')}
                                    className={`flex items-start gap-3 rounded-2xl border p-3 text-left transition ${
                                        !isCloudMode
                                            ? 'border-brand-500 bg-brand-50/70 dark:border-brand-400 dark:bg-brand-500/15'
                                            : 'border-slate-200 bg-white hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.02] dark:hover:bg-white/5'
                                    }`}
                                >
                                    <span
                                        className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                                            !isCloudMode ? 'border-brand-600 bg-brand-600' : 'border-slate-300 dark:border-slate-600'
                                        }`}
                                    >
                                        {!isCloudMode && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                                    </span>
                                    <span className="min-w-0">
                                        <span className="block text-[11.5px] font-extrabold text-slate-900 dark:text-white">
                                            Folder Lokal / Google Drive Desktop (100% Offline-Friendly)
                                        </span>
                                        <span className="block text-[10px] font-medium text-slate-500 dark:text-slate-400">
                                            Pilih folder tujuan di Drive D, Documents, Flashdisk, atau folder Google Drive Desktop tanpa setup API.
                                        </span>
                                    </span>
                                </button>

                                <button
                                    type="button"
                                    role="radio"
                                    aria-checked={isCloudMode}
                                    onClick={() => handleSelectUiMode('cloud')}
                                    className={`flex items-start gap-3 rounded-2xl border p-3 text-left transition ${
                                        isCloudMode
                                            ? 'border-brand-500 bg-brand-50/70 dark:border-brand-400 dark:bg-brand-500/15'
                                            : 'border-slate-200 bg-white hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.02] dark:hover:bg-white/5'
                                    }`}
                                >
                                    <span
                                        className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                                            isCloudMode ? 'border-brand-600 bg-brand-600' : 'border-slate-300 dark:border-slate-600'
                                        }`}
                                    >
                                        {isCloudMode && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                                    </span>
                                    <span className="min-w-0">
                                        <span className="block text-[11.5px] font-extrabold text-slate-900 dark:text-white">
                                            Lokal + Google Drive Cloud API (Auto-Retry saat Online)
                                        </span>
                                        <span className="block text-[10px] font-medium text-slate-500 dark:text-slate-400">
                                            Tetap simpan salinan lokal saat offline, lalu otomatis unggah ke Google Drive via REST API v3 begitu internet aktif.
                                        </span>
                                    </span>
                                </button>
                            </div>

                            {/* Local Folder Picker Box (tersedia di kedua mode!) */}
                            <div className="space-y-2.5 rounded-2xl border border-slate-100 bg-slate-50/60 p-3.5 dark:border-white/5 dark:bg-white/[0.03]">
                                <div className="flex items-center justify-between gap-2">
                                    <InputLabel
                                        htmlFor="local_sync_path"
                                        value={
                                            isCloudMode
                                                ? 'Folder Salinan Lokal di Komputer Anda (Opsional)'
                                                : 'Folder Penyimpanan Pilihan Anda'
                                        }
                                    />
                                    {data.local_sync_path.trim() !== '' && (
                                        <button
                                            type="button"
                                            onClick={() => handleLocalPathChange('')}
                                            className="text-[10px] font-bold text-slate-400 underline hover:text-slate-600 dark:hover:text-slate-200"
                                        >
                                            Reset ke Bawaan
                                        </button>
                                    )}
                                </div>

                                <div className="flex flex-col gap-2 sm:flex-row">
                                    <TextInput
                                        id="local_sync_path"
                                        type="text"
                                        className="block w-full flex-1 font-mono text-[11.5px]"
                                        placeholder="Klik Pilih Folder... (mis. D:\Backup-SIKAS atau Documents\Backup-SIKAS)"
                                        value={data.local_sync_path}
                                        onChange={(e) => handleLocalPathChange(e.target.value)}
                                    />
                                    <SecondaryButton
                                        type="button"
                                        onClick={() => setShowFolderPicker(true)}
                                        disabled={!canWriteBackup}
                                        className="shrink-0 justify-center"
                                    >
                                        Pilih Folder...
                                    </SecondaryButton>
                                </div>
                                <InputError message={errors.local_sync_path} />

                                <p className="text-[10px] font-medium leading-relaxed text-slate-500 dark:text-slate-400">
                                    {data.local_sync_path.trim() !== '' ? (
                                        <>
                                            Auto-backup akan langsung disalin ke folder pilihan di atas agar mudah Anda temukan (salinan internal aplikasi tetap tersimpan untuk menu Restore).
                                        </>
                                    ) : (
                                        <>
                                            Jika dikosongkan, auto-backup tetap tersimpan aman di folder bawaan aplikasi
                                            {defaultBackupDir ? (
                                                <>
                                                    {' '}
                                                    (<code className="font-mono text-[9.5px]">{defaultBackupDir}</code>)
                                                </>
                                            ) : null}{' '}
                                            dan selalu bisa diunduh dari tab <strong>Backup &amp; Restore Manual</strong>.
                                        </>
                                    )}
                                </p>

                                {data.local_sync_path.trim() !== '' && (
                                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                                        <label className="flex cursor-pointer items-center gap-2 text-[10.5px] font-semibold text-slate-700 dark:text-slate-300">
                                            <input
                                                type="checkbox"
                                                checked={data.sync_apply_retention}
                                                onChange={(e) => setData('sync_apply_retention', e.target.checked)}
                                                className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                                            />
                                            Terapkan retensi <code className="font-mono">auto_backup_*.rsv</code> di folder ini
                                        </label>
                                        <SecondaryButton
                                            type="button"
                                            onClick={() => handleTestSync('local_folder')}
                                            disabled={!canWriteBackup || testingSync}
                                        >
                                            {testingSync ? 'Menguji...' : 'Uji Folder'}
                                        </SecondaryButton>
                                    </div>
                                )}
                            </div>

                            {/* Google Drive API Config */}
                            {isCloudMode && (
                                <div className="space-y-3 rounded-2xl border border-slate-100 bg-slate-50/60 p-3.5 dark:border-white/5 dark:bg-white/[0.03]">
                                    {setting.gdrive_secrets_corrupted && (
                                        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[10.5px] font-semibold text-amber-800 dark:border-amber-400/20 dark:bg-amber-500/10 dark:text-amber-200">
                                            Kredensial Google Drive tersimpan tidak dapat didekripsi. Mohon masukkan ulang Client Secret &amp; Refresh Token.
                                        </div>
                                    )}

                                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                        <div>
                                            <InputLabel htmlFor="gdrive_folder_id" value="Google Drive Folder ID" />
                                            <TextInput
                                                id="gdrive_folder_id"
                                                type="text"
                                                className="mt-1 block w-full font-mono text-[11.5px]"
                                                placeholder="1AbCdEfGhIjKlMnOpQrStUv"
                                                value={data.gdrive_folder_id}
                                                onChange={(e) => setData('gdrive_folder_id', e.target.value)}
                                            />
                                            <InputError message={errors.gdrive_folder_id} className="mt-1.5" />
                                        </div>
                                        <div>
                                            <InputLabel htmlFor="gdrive_client_id" value="OAuth2 Client ID" />
                                            <TextInput
                                                id="gdrive_client_id"
                                                type="text"
                                                className="mt-1 block w-full font-mono text-[11.5px]"
                                                placeholder="xxxx.apps.googleusercontent.com"
                                                value={data.gdrive_client_id}
                                                onChange={(e) => setData('gdrive_client_id', e.target.value)}
                                            />
                                            <InputError message={errors.gdrive_client_id} className="mt-1.5" />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                        <div>
                                            <div className="flex items-center justify-between">
                                                <InputLabel htmlFor="gdrive_client_secret" value="OAuth2 Client Secret" />
                                                {setting.has_gdrive_client_secret && (
                                                    <span className="text-[9.5px] font-extrabold text-mint">Tersimpan</span>
                                                )}
                                            </div>
                                            <TextInput
                                                id="gdrive_client_secret"
                                                type="password"
                                                autoComplete="new-password"
                                                className="mt-1 block w-full font-mono text-[11.5px]"
                                                placeholder={
                                                    setting.has_gdrive_client_secret
                                                        ? 'Tersimpan — kosongkan jika tidak diubah'
                                                        : 'Masukkan Client Secret'
                                                }
                                                value={data.gdrive_client_secret}
                                                onChange={(e) => setData('gdrive_client_secret', e.target.value)}
                                            />
                                            <InputError message={errors.gdrive_client_secret} className="mt-1.5" />
                                        </div>
                                        <div>
                                            <div className="flex items-center justify-between">
                                                <InputLabel htmlFor="gdrive_refresh_token" value="OAuth2 Refresh Token" />
                                                {setting.has_gdrive_refresh_token && (
                                                    <span className="text-[9.5px] font-extrabold text-mint">Tersimpan</span>
                                                )}
                                            </div>
                                            <TextInput
                                                id="gdrive_refresh_token"
                                                type="password"
                                                autoComplete="new-password"
                                                className="mt-1 block w-full font-mono text-[11.5px]"
                                                placeholder={
                                                    setting.has_gdrive_refresh_token
                                                        ? 'Tersimpan — kosongkan jika tidak diubah'
                                                        : 'Masukkan Refresh Token'
                                                }
                                                value={data.gdrive_refresh_token}
                                                onChange={(e) => setData('gdrive_refresh_token', e.target.value)}
                                            />
                                            <InputError message={errors.gdrive_refresh_token} className="mt-1.5" />
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-2 pt-1">
                                        <SecondaryButton
                                            type="button"
                                            onClick={() => handleTestSync('google_drive_api')}
                                            disabled={!canWriteBackup || testingSync}
                                        >
                                            {testingSync ? 'Menguji Koneksi...' : 'Uji Koneksi Google Drive'}
                                        </SecondaryButton>
                                    </div>

                                    <details className="rounded-xl border border-slate-200/70 bg-white/80 px-3 py-2 text-[10.5px] text-slate-600 dark:border-white/10 dark:bg-slate-900/50 dark:text-slate-300">
                                        <summary className="cursor-pointer font-bold text-slate-800 dark:text-white">
                                            Panduan singkat mendapatkan Folder ID &amp; OAuth2 Refresh Token
                                        </summary>
                                        <ol className="mt-2 list-decimal space-y-1 pl-4 leading-relaxed">
                                            <li>
                                                Buka folder tujuan di Google Drive, lalu salin ID di akhir URL{' '}
                                                <code className="font-mono">drive.google.com/drive/folders/<strong>FOLDER_ID</strong></code>.
                                            </li>
                                            <li>
                                                Aktifkan <strong>Google Drive API</strong> di Google Cloud Console dan buat OAuth2 Client ID (Web Application).
                                            </li>
                                            <li>
                                                Gunakan Google OAuth2 Playground dengan scope{' '}
                                                <code className="font-mono">https://www.googleapis.com/auth/drive</code> untuk menghasilkan{' '}
                                                <strong>Refresh Token</strong> permanen.
                                            </li>
                                        </ol>
                                    </details>
                                </div>
                            )}

                            {hasAnyStoredSecrets && (
                                <label className="flex cursor-pointer items-center gap-2.5 rounded-2xl border border-rose-100 bg-rose-50/50 px-3.5 py-2.5 text-[10.5px] font-semibold text-rose-700 dark:border-rose-400/15 dark:bg-rose-500/10 dark:text-rose-300">
                                    <input
                                        type="checkbox"
                                        checked={data.clear_gdrive_secrets}
                                        onChange={(e) => setData('clear_gdrive_secrets', e.target.checked)}
                                        className="h-3.5 w-3.5 rounded border-rose-300 text-rose-600 focus:ring-rose-500"
                                    />
                                    <span>
                                        Hapus rahasia OAuth2 Google Drive tersimpan saat menyimpan pengaturan
                                        {isCloudMode
                                            ? ' (masukkan Client Secret & Refresh Token baru di atas jika tetap menggunakan mode Cloud API)'
                                            : ''}
                                    </span>
                                </label>
                            )}

                            {/* Inline Test Connection Result */}
                            {testResult && (
                                <div
                                    role="status"
                                    className={`flex items-start gap-2.5 rounded-2xl border p-3 text-[11px] font-semibold ${
                                        testResult.success
                                            ? 'border-mint/30 bg-pastel-mint/60 text-emerald-800 dark:border-mint/25 dark:bg-mint/10 dark:text-emerald-200'
                                            : 'border-rose-200 bg-pastel-rose/70 text-rose-700 dark:border-rose-400/20 dark:bg-rose-500/10 dark:text-rose-300'
                                    }`}
                                >
                                    <span className="mt-0.5 shrink-0" aria-hidden="true">
                                        {testResult.success ? '✓' : '✕'}
                                    </span>
                                    <span className="break-words">{testResult.message}</span>
                                </div>
                            )}
                        </div>
                    </Surface>
                </fieldset>

                {/* Save Bar */}
                {canWriteBackup && (
                    <div className="sikas-card flex flex-col items-stretch justify-between gap-3 p-4 sm:flex-row sm:items-center">
                        <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                            {isDirty ? (
                                <span className="font-bold text-amber-600 dark:text-amber-400">
                                    Terdapat perubahan pengaturan yang belum disimpan.
                                </span>
                            ) : (
                                'Pengaturan Auto-Backup, Retensi & Tujuan Penyimpanan sudah tersimpan.'
                            )}
                        </div>
                        <div className="flex items-center justify-end gap-2">
                            {isDirty && (
                                <SecondaryButton
                                    type="button"
                                    onClick={() => {
                                        reset();
                                        setTestResult(null);
                                    }}
                                    disabled={processing}
                                >
                                    Batal
                                </SecondaryButton>
                            )}
                            <PrimaryButton disabled={processing}>
                                {processing ? 'Menyimpan...' : 'Simpan Pengaturan Auto-Backup'}
                            </PrimaryButton>
                        </div>
                    </div>
                )}
            </form>

            {/* Zero-Setup & 1-Click Background Automation Card */}
            {canWriteBackup && (
                <Surface
                    title="Otomatisasi Latar Belakang (Tanpa Setup Rumit)"
                    subtitle="Auto-Backup langsung bekerja otomatis di komputer Anda tanpa perlu mengetik perintah manual."
                    icon={
                        <IconTile tone="mint" size="md">
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                        </IconTile>
                    }
                >
                    <div className="space-y-3">
                        {/* 1. Built-in Zero-Setup In-App Trigger */}
                        <div className="flex flex-col justify-between gap-3 rounded-2xl border border-mint/25 bg-pastel-mint/45 p-4 sm:flex-row sm:items-center dark:border-mint/20 dark:bg-mint/10">
                            <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-[12px] font-extrabold text-emerald-950 dark:text-emerald-100">
                                        1. Pemicu Otomatis Dalam Aplikasi (Zero-Setup)
                                    </span>
                                    <StatusBadge tone="success">Aktif Otomatis</StatusBadge>
                                </div>
                                <p className="mt-1 text-[10.5px] font-medium leading-relaxed text-emerald-800 dark:text-emerald-200">
                                    Berjalan otomatis saat aplikasi dibuka — <strong>100% mendukung mode offline</strong> dan otomatis menyusul (<em>catch-up</em>) bila laptop mati saat jam jadwal. Tidak perlu mengatur Task Scheduler ataupun mengetahui lokasi folder instalasi.
                                </p>
                            </div>
                        </div>

                        {/* 2. Optional 1-Click Silent Windows Background Task */}
                        {winStatus?.supported && (
                            <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 dark:border-white/5 dark:bg-white/[0.02]">
                                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                                    <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="text-[12px] font-extrabold text-slate-900 dark:text-white">
                                                2. Backup Latar Belakang Windows (Opsional — Saat Browser Ditutup)
                                            </span>
                                            <StatusBadge
                                                tone={
                                                    winStatus.installed && winStatus.path_matches_current
                                                        ? 'success'
                                                        : winStatus.installed
                                                          ? 'warning'
                                                          : 'neutral'
                                                }
                                            >
                                                {winStatus.installed && winStatus.path_matches_current
                                                    ? 'Aktif & Sinkron'
                                                    : winStatus.installed
                                                      ? 'Perlu Sinkron Lokasi'
                                                      : 'Opsional (Belum Aktif)'}
                                            </StatusBadge>
                                        </div>
                                        <p className="mt-1 text-[10.5px] font-medium leading-relaxed text-slate-500 dark:text-slate-400">
                                            {winStatus.message}
                                        </p>
                                    </div>

                                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                                        {(!winStatus.installed || !winStatus.path_matches_current) && (
                                            <PrimaryButton
                                                type="button"
                                                onClick={() => handleWindowsSchedulerAction('install')}
                                                disabled={winActionBusy}
                                            >
                                                {winActionBusy
                                                    ? 'Memproses...'
                                                    : winStatus.installed
                                                      ? 'Perbarui Lokasi Task (1-Klik)'
                                                      : 'Aktifkan 1-Klik (Senyap)'}
                                            </PrimaryButton>
                                        )}
                                        {winStatus.installed && (
                                            <SecondaryButton
                                                type="button"
                                                onClick={() => handleWindowsSchedulerAction('remove')}
                                                disabled={winActionBusy}
                                            >
                                                {winActionBusy ? 'Memproses...' : 'Nonaktifkan Task'}
                                            </SecondaryButton>
                                        )}
                                    </div>
                                </div>

                                {winFeedback && (
                                    <div
                                        role="status"
                                        className={`mt-3 rounded-xl border px-3 py-2 text-[10.5px] font-semibold ${
                                            winFeedback.success
                                                ? 'border-mint/30 bg-pastel-mint/60 text-emerald-800 dark:border-mint/20 dark:bg-mint/10 dark:text-emerald-200'
                                                : 'border-rose-200 bg-pastel-rose/70 text-rose-700 dark:border-rose-400/20 dark:bg-rose-500/10 dark:text-rose-300'
                                        }`}
                                    >
                                        {winFeedback.message}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* 3. Advanced Manual Command (OS-Aware, Collapsed for Admins) */}
                        {schedulerCommands && (schedulerCommands.windows || schedulerCommands.linux) && (
                            <details className="rounded-2xl border border-slate-100 bg-white px-4 py-3 dark:border-white/5 dark:bg-white/[0.02]">
                                <summary className="cursor-pointer text-[11px] font-extrabold text-slate-600 dark:text-slate-300">
                                    {schedulerCommands.os === 'windows'
                                        ? 'Pengaturan Lanjutan — Perintah Manual Windows CMD (Opsional)'
                                        : 'Pengaturan Lanjutan — Cron Job Linux / VPS (Opsional)'}
                                </summary>
                                <div className="mt-3">
                                    {schedulerCommands.os === 'windows' && schedulerCommands.windows && (
                                        <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 dark:border-white/5 dark:bg-white/[0.02]">
                                            <div className="mb-1.5 flex items-center justify-between gap-2">
                                                <span className="text-[10.5px] font-extrabold text-slate-800 dark:text-white">
                                                    Windows CMD (Otomatis Mengikuti Folder Instalasi Aktif)
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => handleCopyCommand('windows', schedulerCommands.windows!)}
                                                    className="rounded-lg border border-slate-200 bg-white px-2 py-0.5 text-[9.5px] font-extrabold text-brand-600 dark:border-white/10 dark:bg-white/5 dark:text-brand-300"
                                                >
                                                    {copiedKey === 'windows' ? 'Tersalin!' : 'Salin'}
                                                </button>
                                            </div>
                                            <pre className="overflow-x-auto rounded-lg bg-[#15131F] p-2.5 font-mono text-[10px] leading-relaxed text-lime-200">
                                                <code>{schedulerCommands.windows}</code>
                                            </pre>
                                            <p className="mt-2 text-[10px] font-medium text-slate-500 dark:text-slate-400">
                                                Disarankan memakai tombol <strong>Aktifkan 1-Klik (Senyap)</strong> di atas agar berjalan tanpa jendela CMD berkedip setiap menit.
                                            </p>
                                        </div>
                                    )}
                                    {schedulerCommands.os === 'linux' && schedulerCommands.linux && (
                                        <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 dark:border-white/5 dark:bg-white/[0.02]">
                                            <div className="mb-1.5 flex items-center justify-between gap-2">
                                                <span className="text-[10.5px] font-extrabold text-slate-800 dark:text-white">
                                                    Cron Job Linux / VPS (Otomatis Mengikuti Folder Instalasi Aktif)
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => handleCopyCommand('linux', schedulerCommands.linux!)}
                                                    className="rounded-lg border border-slate-200 bg-white px-2 py-0.5 text-[9.5px] font-extrabold text-brand-600 dark:border-white/10 dark:bg-white/5 dark:text-brand-300"
                                                >
                                                    {copiedKey === 'linux' ? 'Tersalin!' : 'Salin'}
                                                </button>
                                            </div>
                                            <pre className="overflow-x-auto rounded-lg bg-[#15131F] p-2.5 font-mono text-[10px] leading-relaxed text-sky-200">
                                                <code>{schedulerCommands.linux}</code>
                                            </pre>
                                            <p className="mt-2 text-[10px] font-medium text-slate-500 dark:text-slate-400">
                                                Tambahkan baris di atas ke <code className="font-mono">crontab -e</code> pada server Linux.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </details>
                        )}
                    </div>
                </Surface>
            )}

            {/* Recent 10 Auto-Backup Runs */}
            <DataTable
                title="Riwayat Eksekusi Auto-Backup (10 Terakhir)"
                subtitle="Log otomatis proses pembuatan cadangan terjadwal, retensi, dan sinkronisasi."
                icon={
                    <IconTile tone="mint" size="sm">
                        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                    </IconTile>
                }
                actions={
                    <StatusBadge tone="info" dot={false} className="text-sikas-num">
                        {runs.length}
                    </StatusBadge>
                }
                contentClassName="bento-table-wrapper mx-4 mb-4"
            >
                <table className="min-w-full">
                    <thead>
                        <tr>
                            <th className="text-left">Waktu</th>
                            <th className="text-left">Pemicu</th>
                            <th className="text-left">Berkas &amp; Ukuran</th>
                            <th className="text-left">Retensi</th>
                            <th className="text-left">Sinkronisasi</th>
                            <th className="text-left">Status</th>
                            <th className="text-left">Ringkasan</th>
                        </tr>
                    </thead>
                    <tbody>
                        {runs.length > 0 ? (
                            runs.map((run) => {
                                const statusTone =
                                    run.status === 'success'
                                        ? 'success'
                                        : run.status === 'partial'
                                          ? 'warning'
                                          : 'danger';
                                const statusText =
                                    run.status === 'success'
                                        ? 'Berhasil'
                                        : run.status === 'partial'
                                          ? 'Sebagian'
                                          : 'Gagal';
                                const syncTone =
                                    run.sync_status === 'success'
                                        ? 'success'
                                        : run.sync_status === 'failed'
                                          ? 'danger'
                                          : 'neutral';
                                const syncText =
                                    run.sync_status === 'success'
                                        ? 'Tersinkron'
                                        : run.sync_status === 'failed'
                                          ? 'Menunggu / Gagal'
                                          : 'Lokal Saja';

                                return (
                                    <tr key={run.id}>
                                        <td className="whitespace-nowrap">
                                            <div className="font-bold text-slate-900 dark:text-white">
                                                {run.created_at_formatted}
                                            </div>
                                            {run.created_at_human && (
                                                <div className="text-[10px] text-slate-400">{run.created_at_human}</div>
                                            )}
                                        </td>
                                        <td className="whitespace-nowrap">
                                            <StatusBadge tone={run.trigger === 'scheduled' ? 'violet' : 'info'} dot={false}>
                                                {run.trigger === 'scheduled' ? 'Terjadwal' : 'Manual'}
                                            </StatusBadge>
                                        </td>
                                        <td className="whitespace-nowrap">
                                            <div className="font-mono text-[11px] font-bold text-slate-800 dark:text-slate-100">
                                                {run.file_name || '-'}
                                            </div>
                                            <div className="text-sikas-num text-[10px] text-slate-400">
                                                {run.file_size_formatted}
                                            </div>
                                        </td>
                                        <td className="whitespace-nowrap text-sikas-num font-semibold text-slate-600 dark:text-slate-300">
                                            {run.pruned_count > 0 ? `${run.pruned_count} dihapus` : '0 dihapus'}
                                        </td>
                                        <td className="whitespace-nowrap">
                                            <StatusBadge tone={syncTone} dot={false}>
                                                {syncText}
                                            </StatusBadge>
                                        </td>
                                        <td className="whitespace-nowrap">
                                            <StatusBadge tone={statusTone}>{statusText}</StatusBadge>
                                        </td>
                                        <td className="max-w-xs text-[11px] text-slate-600 dark:text-slate-300">
                                            <p className="line-clamp-2" title={run.message}>
                                                {run.message}
                                            </p>
                                        </td>
                                    </tr>
                                );
                            })
                        ) : (
                            <tr>
                                <td colSpan={7} className="p-0">
                                    <EmptyState
                                        className="border-0 bg-transparent py-9 dark:bg-transparent"
                                        icon={
                                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        }
                                        title="Belum ada riwayat eksekusi auto-backup."
                                    />
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </DataTable>

            {/* Folder Picker Modal */}
            <FolderPickerModal
                show={showFolderPicker}
                initialPath={data.local_sync_path}
                onClose={() => setShowFolderPicker(false)}
                onSelect={(selectedPath) => handleLocalPathChange(selectedPath)}
            />
        </div>
    );
}
