import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import Modal from '@/Components/Modal';
import TextInput from '@/Components/TextInput';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import { SharedArkasStatus } from '@/types';

type ArkasMode = 'local' | 'online';
type ArkasSource = SharedArkasStatus['source'];

interface LastUploadMeta {
    uploaded_at: string | null;
    size_bytes: number | null;
    sha256: string | null;
    via: string | null;
    device_name: string | null;
    uploaded_by: string | null;
    years: string[];
}

interface AgentMeta {
    has_token: boolean;
    has_pin: boolean;
    token_created_at: string | null;
    pin_updated_at: string | null;
}

interface ArkasMetaState {
    active_mode: ArkasMode;
    active_path: string;
    source: ArkasSource;
    exists: boolean;
    uploaded_exists: boolean;
    uploaded_at: string | null;
    uploaded_size: string | null;
    last_upload: LastUploadMeta | null;
    agent: AgentMeta;
    max_upload_mb: number;
    chunk_size_mb: number;
}

interface ArkasConfigModalProps {
    show: boolean;
    onClose: () => void;
    canWrite: boolean;
    onStatusChange?: (status: SharedArkasStatus) => void;
}

const DEFAULT_META: ArkasMetaState = {
    active_mode: 'local',
    active_path: '',
    source: 'none',
    exists: false,
    uploaded_exists: false,
    uploaded_at: null,
    uploaded_size: null,
    last_upload: null,
    agent: {
        has_token: false,
        has_pin: false,
        token_created_at: null,
        pin_updated_at: null,
    },
    max_upload_mb: 500,
    chunk_size_mb: 2,
};

function decodeAxiosError(err: unknown, fallback: string): string {
    if (axios.isCancel(err)) {
        return 'Proses unggahan dibatalkan.';
    }

    if (!axios.isAxiosError(err)) {
        return err instanceof Error && err.message ? err.message : fallback;
    }

    if (!err.response) {
        return 'Koneksi ke server terputus atau diblokir browser (cek jaringan / HTTPS Mixed Content).';
    }

    const status = err.response.status;
    const data = err.response.data as
        | { message?: string; errors?: Record<string, string[] | string> }
        | string
        | undefined;

    if (data && typeof data === 'object') {
        if (data.errors && typeof data.errors === 'object') {
            const firstErr = Object.values(data.errors).flat().find((v) => typeof v === 'string' && v.trim() !== '');
            if (firstErr) {
                return `HTTP ${status}: ${firstErr}`;
            }
        }
        if (typeof data.message === 'string' && data.message.trim() !== '') {
            return `HTTP ${status}: ${data.message}`;
        }
    }

    if (status === 413) {
        return 'HTTP 413 (Payload Too Large): Potongan unggahan ditolak server/proxy. Periksa batas upload Nginx/PHP.';
    }
    if (status === 419) {
        return 'HTTP 419: Sesi login / CSRF kedaluwarsa. Muat ulang halaman lalu coba lagi.';
    }
    if (status === 403) {
        return 'HTTP 403: Akun Anda tidak memiliki izin Kelola Koneksi Database ARKAS.';
    }
    if (status === 429) {
        return 'HTTP 429: Terlalu banyak percobaan. Tunggu beberapa saat lalu coba lagi.';
    }
    if (status >= 500) {
        return `HTTP ${status}: Terjadi kesalahan atau timeout di server saat memproses arkas.db.`;
    }

    return `${fallback} (HTTP ${status}).`;
}

async function computeSha256Optional(file: File): Promise<string | null> {
    if (typeof window === 'undefined' || !window.crypto?.subtle) {
        return null;
    }

    // Hindari konsumsi RAM berlebih di browser untuk file sangat besar (> 150 MB)
    if (file.size > 150 * 1024 * 1024) {
        return null;
    }

    try {
        const buffer = await file.arrayBuffer();
        const digest = await window.crypto.subtle.digest('SHA-256', buffer);
        return Array.from(new Uint8Array(digest))
            .map((b) => b.toString(16).padStart(2, '0'))
            .join('');
    } catch {
        return null;
    }
}

export default function ArkasConfigModal({
    show,
    onClose,
    canWrite,
    onStatusChange,
}: ArkasConfigModalProps) {
    const [activeTab, setActiveTab] = useState<ArkasMode>('local');
    const [arkasPath, setArkasPath] = useState('');
    const [meta, setMeta] = useState<ArkasMetaState>(DEFAULT_META);
    const [isLoadingMeta, setIsLoadingMeta] = useState(false);

    const [selectedDbFile, setSelectedDbFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadPercent, setUploadPercent] = useState(0);
    const [uploadStage, setUploadStage] = useState('');
    const abortControllerRef = useRef<AbortController | null>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    const [isSaving, setIsSaving] = useState(false);
    const [isSwitchingMode, setIsSwitchingMode] = useState(false);

    const [agentPin, setAgentPin] = useState('');
    const [isSavingPin, setIsSavingPin] = useState(false);
    const [isDownloadingAgent, setIsDownloadingAgent] = useState(false);
    const [isRevokingToken, setIsRevokingToken] = useState(false);

    const [errorMsg, setErrorMsg] = useState('');
    const [feedbackMsg, setFeedbackMsg] = useState('');

    const isBusy = isSaving || isUploading || isSwitchingMode || isSavingPin || isDownloadingAgent || isRevokingToken;

    const fetchInfo = async (syncTab = false) => {
        setIsLoadingMeta(true);
        try {
            const res = await axios.get(route('arkas-tools.get-path'));
            const nextMode: ArkasMode = res.data.active_mode === 'online' ? 'online' : 'local';
            const nextMeta: ArkasMetaState = {
                active_mode: nextMode,
                active_path: res.data.active_path || '',
                source: (res.data.source || 'none') as ArkasSource,
                exists: Boolean(res.data.exists),
                uploaded_exists: Boolean(res.data.uploaded_exists),
                uploaded_at: res.data.uploaded_at || null,
                uploaded_size: res.data.uploaded_size || null,
                last_upload: res.data.last_upload || null,
                agent: {
                    has_token: Boolean(res.data.agent?.has_token),
                    has_pin: Boolean(res.data.agent?.has_pin),
                    token_created_at: res.data.agent?.token_created_at || null,
                    pin_updated_at: res.data.agent?.pin_updated_at || null,
                },
                max_upload_mb: Number(res.data.max_upload_mb || 500),
                chunk_size_mb: Number(res.data.chunk_size_mb || 2),
            };
            setArkasPath(res.data.path || '');
            setMeta(nextMeta);
            if (syncTab) {
                setActiveTab(nextMode);
            }
            onStatusChange?.({
                active_mode: nextMeta.active_mode,
                source: nextMeta.source,
                exists: nextMeta.exists,
            });
        } catch (err) {
            setErrorMsg(decodeAxiosError(err, 'Gagal mengambil status konfigurasi ARKAS.'));
        } finally {
            setIsLoadingMeta(false);
        }
    };

    useEffect(() => {
        if (!show) return;
        setErrorMsg('');
        setFeedbackMsg('');
        setSelectedDbFile(null);
        setAgentPin('');
        setUploadPercent(0);
        setUploadStage('');
        void fetchInfo(true);
    }, [show]);

    const handleSwitchMode = async (mode: ArkasMode) => {
        setIsSwitchingMode(true);
        setErrorMsg('');
        setFeedbackMsg('');
        try {
            const res = await axios.post(route('arkas-tools.set-mode'), { mode });
            await fetchInfo(false);
            setActiveTab(mode);
            setFeedbackMsg(res.data.message || 'Mode sumber database ARKAS berhasil diubah.');
        } catch (err) {
            setErrorMsg(decodeAxiosError(err, 'Gagal mengubah mode sumber ARKAS.'));
        } finally {
            setIsSwitchingMode(false);
        }
    };

    const handleSaveLocalPath = async () => {
        setIsSaving(true);
        setErrorMsg('');
        setFeedbackMsg('');
        try {
            const res = await axios.post(route('arkas-tools.save-path'), {
                path: arkasPath,
                activate_local: true,
            });
            await fetchInfo(false);
            setFeedbackMsg(res.data.message || 'Mode PC Lokal diaktifkan & path berhasil disimpan.');
        } catch (err) {
            setErrorMsg(decodeAxiosError(err, 'Gagal menyimpan path lokal ARKAS.'));
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancelUpload = () => {
        abortControllerRef.current?.abort();
    };

    const handleChunkedUpload = async () => {
        if (!selectedDbFile) return;

        const maxBytes = meta.max_upload_mb * 1024 * 1024;
        if (selectedDbFile.size > maxBytes) {
            setErrorMsg(`Ukuran file melebihi batas maksimal (${meta.max_upload_mb} MB).`);
            return;
        }

        setIsUploading(true);
        setErrorMsg('');
        setFeedbackMsg('');
        setUploadPercent(0);
        setUploadStage('Menyiapkan unggahan...');

        const controller = new AbortController();
        abortControllerRef.current = controller;

        try {
            const chunkSizeBytes = Math.max(1, Math.min(4, meta.chunk_size_mb)) * 1024 * 1024;
            const totalChunks = Math.ceil(selectedDbFile.size / chunkSizeBytes);

            setUploadStage('Menghitung checksum file...');
            const sha256 = await computeSha256Optional(selectedDbFile);

            setUploadStage('Membuat sesi unggahan...');
            const initRes = await axios.post(
                route('arkas-tools.upload-init'),
                {
                    filename: selectedDbFile.name,
                    total_size: selectedDbFile.size,
                    chunk_size: chunkSizeBytes,
                    total_chunks: totalChunks,
                    sha256,
                },
                { signal: controller.signal },
            );

            if (initRes.data.already_up_to_date) {
                setUploadPercent(100);
                setUploadStage('Sudah paling baru');
                setSelectedDbFile(null);
                if (fileInputRef.current) fileInputRef.current.value = '';
                await fetchInfo(false);
                setFeedbackMsg(initRes.data.message || 'Database arkas.db di server sudah identik.');
                return;
            }

            const uploadId: string = initRes.data.upload_id;
            const chunkUrl = route('arkas-tools.upload-chunk');

            for (let idx = 0; idx < totalChunks; idx++) {
                const start = idx * chunkSizeBytes;
                const end = Math.min(selectedDbFile.size, start + chunkSizeBytes);
                const blobSlice = selectedDbFile.slice(start, end);

                let attempt = 0;
                const maxAttempts = 3;
                while (attempt < maxAttempts) {
                    attempt++;
                    setUploadStage(
                        attempt > 1
                            ? `Mengulang bagian ${idx + 1}/${totalChunks} (percobaan ${attempt}/${maxAttempts})...`
                            : `Mengunggah bagian ${idx + 1} dari ${totalChunks}...`,
                    );

                    const formData = new FormData();
                    formData.append('upload_id', uploadId);
                    formData.append('chunk_index', String(idx));
                    formData.append('chunk', blobSlice, `chunk_${idx}.part`);

                    try {
                        await axios.post(chunkUrl, formData, {
                            signal: controller.signal,
                            timeout: 120000,
                        });
                        break;
                    } catch (chunkErr) {
                        if (axios.isCancel(chunkErr)) {
                            throw chunkErr;
                        }
                        const status = axios.isAxiosError(chunkErr) ? chunkErr.response?.status : undefined;
                        if (status && [401, 403, 404, 413, 419, 422, 429].includes(status)) {
                            throw chunkErr;
                        }
                        if (attempt >= maxAttempts) {
                            throw chunkErr;
                        }
                        await new Promise((resolve) => setTimeout(resolve, attempt * 1500));
                    }
                }

                const pct = Math.min(95, Math.round(((idx + 1) / totalChunks) * 95));
                setUploadPercent(pct);
            }

            setUploadStage('Menggabungkan & memverifikasi dekripsi SQLCipher...');
            const finalRes = await axios.post(
                route('arkas-tools.upload-finalize'),
                { upload_id: uploadId },
                { signal: controller.signal, timeout: 120000 },
            );

            setUploadPercent(100);
            setUploadStage('Selesai');
            setSelectedDbFile(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
            await fetchInfo(false);
            setFeedbackMsg(finalRes.data.message || 'Database arkas.db berhasil diunggah dan diverifikasi.');
        } catch (err) {
            setErrorMsg(decodeAxiosError(err, 'Gagal mengunggah file arkas.db.'));
        } finally {
            abortControllerRef.current = null;
            setIsUploading(false);
        }
    };

    const handleRemoveUploadedDb = async () => {
        setIsUploading(true);
        setErrorMsg('');
        setFeedbackMsg('');
        try {
            const res = await axios.delete(route('arkas-tools.remove-uploaded-db'));
            await fetchInfo(false);
            setFeedbackMsg(res.data.message || 'File arkas.db unggahan dihapus.');
        } catch (err) {
            setErrorMsg(decodeAxiosError(err, 'Gagal menghapus file unggahan.'));
        } finally {
            setIsUploading(false);
        }
    };

    const handleSaveAgentPin = async () => {
        setIsSavingPin(true);
        setErrorMsg('');
        setFeedbackMsg('');
        try {
            const res = await axios.post(route('arkas-tools.agent-pin'), { pin: agentPin });
            setAgentPin('');
            await fetchInfo(false);
            setFeedbackMsg(res.data.message || 'PIN Sinkronisasi Agent berhasil disimpan.');
        } catch (err) {
            setErrorMsg(decodeAxiosError(err, 'Gagal menyimpan PIN Sinkronisasi Agent.'));
        } finally {
            setIsSavingPin(false);
        }
    };

    const handleDownloadAgent = async () => {
        setIsDownloadingAgent(true);
        setErrorMsg('');
        setFeedbackMsg('');
        try {
            const res = await axios.post(
                route('arkas-tools.agent-download'),
                {},
                { responseType: 'blob' },
            );
            const blob = new Blob([res.data], { type: 'application/octet-stream' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'SIKAS-Arkas-Sync.bat');
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
            await fetchInfo(false);
            setFeedbackMsg('Token baru dibuat & SIKAS-Arkas-Sync.bat berhasil diunduh. File .bat lama otomatis nonaktif.');
        } catch (err) {
            if (axios.isAxiosError(err) && err.response?.data instanceof Blob) {
                try {
                    const text = await err.response.data.text();
                    const parsed = JSON.parse(text) as { message?: string };
                    if (parsed.message) {
                        setErrorMsg(`HTTP ${err.response.status}: ${parsed.message}`);
                        return;
                    }
                } catch {
                    // fallback to standard decoder
                }
            }
            setErrorMsg(decodeAxiosError(err, 'Gagal mengunduh Agent Sync Tool.'));
        } finally {
            setIsDownloadingAgent(false);
        }
    };

    const handleRevokeToken = async () => {
        setIsRevokingToken(true);
        setErrorMsg('');
        setFeedbackMsg('');
        try {
            const res = await axios.delete(route('arkas-tools.agent-revoke'));
            await fetchInfo(false);
            setFeedbackMsg(res.data.message || 'Token Agent berhasil dicabut.');
        } catch (err) {
            setErrorMsg(decodeAxiosError(err, 'Gagal mencabut token Agent.'));
        } finally {
            setIsRevokingToken(false);
        }
    };

    const sourceLabel: Record<ArkasSource, string> = {
        manual: 'Path Manual Server',
        uploaded: 'File Unggahan Server (VPS)',
        auto: 'Auto-Detect Windows Lokal',
        manual_missing: 'Path Manual Tidak Ditemukan',
        uploaded_missing: 'Belum Ada File Unggahan',
        none: 'Belum Terhubung',
    };

    return (
        <Modal show={show} onClose={() => !isBusy && onClose()} maxWidth="2xl">
            <div className="relative overflow-hidden">
                <div className="pointer-events-none absolute -right-10 -top-16 h-40 w-40 rounded-full bg-brand-500/10 blur-3xl" />

                {/* Header */}
                <div className="relative flex items-start justify-between gap-3 border-b border-slate-100 px-6 py-4 dark:border-white/5">
                    <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-pastel-lavender text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
                            <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                            </svg>
                        </span>
                        <div>
                            <h2 className="text-[14px] font-extrabold text-slate-900 dark:text-white">
                                Konfigurasi Database ARKAS
                            </h2>
                            <p className="text-[10.5px] font-medium text-slate-400 dark:text-slate-500">
                                Pilih mode sumber <code className="rounded bg-slate-100 px-1 py-0.5 text-[9.5px] font-bold text-brand-600 dark:bg-white/10 dark:text-brand-300">arkas.db</code> secara eksplisit: PC Lokal atau Online / VPS.
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => !isBusy && onClose()}
                        className="flex h-7 w-7 items-center justify-center rounded-xl bg-slate-50 text-slate-400 transition hover:bg-slate-100 hover:text-slate-800 dark:bg-white/5 dark:hover:bg-white/10 dark:hover:text-white"
                        aria-label="Tutup"
                    >
                        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
                            <path d="M18 6 6 18M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="max-h-[78vh] space-y-4 overflow-y-auto px-6 py-5">
                    {/* Status Banner */}
                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3 text-[11px] dark:border-white/10 dark:bg-white/[0.03]">
                        <div>
                            <p className="text-[9.5px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                                Mode Sumber Aktif Saat Ini
                            </p>
                            <p className="mt-0.5 text-[12px] font-extrabold text-slate-800 dark:text-white">
                                {meta.active_mode === 'online' ? 'Mode Online / VPS (File Unggahan)' : 'Mode PC Lokal (Jalur Server)'}
                            </p>
                        </div>
                        <span
                            className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
                                isLoadingMeta
                                    ? 'bg-slate-200 text-slate-600 dark:bg-white/10 dark:text-slate-300'
                                    : meta.exists
                                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300'
                                      : 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300'
                            }`}
                        >
                            {isLoadingMeta ? 'Memuat...' : sourceLabel[meta.source]}
                        </span>
                    </div>

                    {/* 2 Tab Switcher */}
                    <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-100/80 p-1.5 dark:bg-white/[0.04]">
                        <button
                            type="button"
                            onClick={() => {
                                setActiveTab('local');
                                setErrorMsg('');
                                setFeedbackMsg('');
                            }}
                            disabled={isBusy}
                            className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-[11.5px] font-bold transition ${
                                activeTab === 'local'
                                    ? 'bg-white text-slate-900 shadow-sm dark:bg-[#252438] dark:text-white'
                                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
                            }`}
                        >
                            <span>1. Mode PC Lokal</span>
                            {meta.active_mode === 'local' && (
                                <span className="rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-extrabold text-emerald-600 dark:text-emerald-300">
                                    AKTIF
                                </span>
                            )}
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setActiveTab('online');
                                setErrorMsg('');
                                setFeedbackMsg('');
                            }}
                            disabled={isBusy}
                            className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-[11.5px] font-bold transition ${
                                activeTab === 'online'
                                    ? 'bg-white text-slate-900 shadow-sm dark:bg-[#252438] dark:text-white'
                                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
                            }`}
                        >
                            <span>2. Mode Online / VPS</span>
                            {meta.active_mode === 'online' && (
                                <span className="rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-extrabold text-emerald-600 dark:text-emerald-300">
                                    AKTIF
                                </span>
                            )}
                        </button>
                    </div>

                    {!canWrite ? (
                        <div className="rounded-2xl border border-amber-200/70 bg-amber-50/70 px-4 py-3 text-[11px] font-medium text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
                            Akun Anda hanya memiliki izin baca. Pengaturan path, unggahan database, dan Agent Sync hanya dapat diubah oleh akun dengan hak <strong>Kelola Koneksi &amp; Upload DB ARKAS</strong>.
                        </div>
                    ) : activeTab === 'local' ? (
                        /* ================= TAB 1: MODE PC LOKAL ================= */
                        <div className="space-y-4 rounded-2xl border border-slate-100 bg-slate-50/40 p-4 dark:border-white/10 dark:bg-white/[0.02]">
                            <div>
                                <p className="text-[11.5px] font-extrabold text-slate-800 dark:text-white">
                                    Jalur File Lokal Server (Satu Perangkat dengan ARKAS)
                                </p>
                                <p className="mt-0.5 text-[10px] font-medium text-slate-400 dark:text-slate-500">
                                    Gunakan mode ini jika newSIKAS terpasang di PC/server Windows yang sama dengan aplikasi ARKAS Desktop.
                                </p>
                            </div>

                            <div>
                                <label className="mb-1.5 block text-[10px] font-extrabold uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">
                                    Path File arkas.db (Kosongkan untuk Auto-Detect Windows)
                                </label>
                                <TextInput
                                    className="w-full"
                                    placeholder="C:\Users\NAMA_USER\AppData\Roaming\Arkas\arkas.db"
                                    value={arkasPath}
                                    onChange={(e) => setArkasPath(e.target.value)}
                                    disabled={isBusy}
                                />
                                <p className="mt-1.5 text-[9.5px] font-medium leading-relaxed text-slate-400 dark:text-slate-500">
                                    Contoh lokasi umum:{' '}
                                    <span className="select-all font-semibold text-slate-500 dark:text-slate-400">
                                        C:\Users\NAMA_USER\AppData\Roaming\Arkas\arkas.db
                                    </span>
                                </p>
                            </div>

                            <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                                <PrimaryButton type="button" onClick={handleSaveLocalPath} disabled={isBusy}>
                                    {isSaving ? 'Menyimpan...' : 'Aktifkan Mode PC Lokal & Simpan Path'}
                                </PrimaryButton>
                            </div>
                        </div>
                    ) : (
                        /* ================= TAB 2: MODE ONLINE / VPS ================= */
                        <div className="space-y-4">
                            {meta.active_mode !== 'online' && (
                                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-3 dark:border-amber-500/25 dark:bg-amber-500/10">
                                    <div className="max-w-md">
                                        <p className="text-[11px] font-extrabold text-amber-800 dark:text-amber-200">
                                            Mode Online / VPS belum aktif
                                        </p>
                                        <p className="mt-0.5 text-[10px] font-medium text-amber-700/80 dark:text-amber-300/80">
                                            Saat ini sistem masih membaca jalur PC Lokal. Aktifkan Mode Online agar file unggahan / Agent Sync mulai dipakai.
                                        </p>
                                    </div>
                                    <PrimaryButton
                                        type="button"
                                        onClick={() => handleSwitchMode('online')}
                                        disabled={isBusy}
                                    >
                                        {isSwitchingMode ? 'Mengaktifkan...' : 'Aktifkan Mode Online / VPS'}
                                    </PrimaryButton>
                                </div>
                            )}

                            {/* Panel A: Browser Chunked Upload */}
                            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-4 dark:border-white/10 dark:bg-white/[0.02]">
                                <div className="flex items-start justify-between gap-2">
                                    <div>
                                        <p className="text-[11.5px] font-extrabold text-slate-800 dark:text-slate-100">
                                            A. Unggah Manual arkas.db (Chunked Upload Anti-Gagal)
                                        </p>
                                        <p className="mt-0.5 text-[10px] font-medium text-slate-400 dark:text-slate-500">
                                            File dipecah otomatis per {meta.chunk_size_mb} MB (maks {meta.max_upload_mb} MB) sehingga aman di balik Cloudflare Tunnel / Nginx.
                                        </p>
                                    </div>
                                    {meta.uploaded_exists && (
                                        <button
                                            type="button"
                                            onClick={handleRemoveUploadedDb}
                                            disabled={isBusy}
                                            className="shrink-0 rounded-lg bg-rose-50 px-2.5 py-1 text-[10px] font-bold text-rose-600 transition hover:bg-rose-100 dark:bg-rose-500/15 dark:text-rose-300"
                                        >
                                            Hapus File
                                        </button>
                                    )}
                                </div>

                                <div className="mt-2.5 rounded-xl border border-sky-200/70 bg-sky-50/60 px-3 py-2 text-[10px] font-medium text-sky-800 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-200">
                                    <strong>Penting:</strong> Tutup aplikasi ARKAS Desktop terlebih dahulu sebelum memilih <code className="font-bold">arkas.db</code> agar transaksi terbaru di file <code className="font-bold">-wal</code> ikut tersimpan.
                                </div>

                                {meta.uploaded_exists && (
                                    <div className="mt-3 rounded-xl border border-emerald-200/70 bg-emerald-50/60 px-3 py-2.5 text-[10.5px] dark:border-emerald-500/20 dark:bg-emerald-500/10">
                                        <p className="font-bold text-emerald-700 dark:text-emerald-300">
                                            File tersimpan di server ({meta.uploaded_size} • {meta.uploaded_at})
                                        </p>
                                        {meta.last_upload && (
                                            <p className="mt-0.5 text-[9.5px] font-medium text-emerald-700/80 dark:text-emerald-300/80">
                                                Sumber: {meta.last_upload.via === 'agent' ? 'Agent Sync' : 'Browser Web'}
                                                {meta.last_upload.device_name ? ` (${meta.last_upload.device_name})` : ''}
                                                {meta.last_upload.years?.length > 0 ? ` • Tahun: ${meta.last_upload.years.join(', ')}` : ''}
                                            </p>
                                        )}
                                    </div>
                                )}

                                <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept=".db,.sqlite,.sqlite3"
                                        onChange={(e) => setSelectedDbFile(e.target.files?.[0] || null)}
                                        disabled={isBusy}
                                        className="block w-full text-[11px] text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-1.5 file:text-[10.5px] file:font-bold file:text-brand-700 hover:file:bg-brand-100 dark:text-slate-400 dark:file:bg-brand-500/20 dark:file:text-brand-300"
                                    />
                                    {isUploading ? (
                                        <SecondaryButton
                                            type="button"
                                            onClick={handleCancelUpload}
                                            className="shrink-0 justify-center !text-rose-600 dark:!text-rose-300"
                                        >
                                            Batalkan
                                        </SecondaryButton>
                                    ) : (
                                        <SecondaryButton
                                            type="button"
                                            onClick={handleChunkedUpload}
                                            disabled={!selectedDbFile || isBusy}
                                            className="shrink-0 justify-center"
                                        >
                                            Unggah .db
                                        </SecondaryButton>
                                    )}
                                </div>

                                {isUploading && (
                                    <div className="mt-3 space-y-1.5">
                                        <div className="flex items-center justify-between text-[10px] font-bold text-slate-600 dark:text-slate-300">
                                            <span>{uploadStage}</span>
                                            <span>{uploadPercent}%</span>
                                        </div>
                                        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
                                            <div
                                                className="h-full rounded-full bg-gradient-to-r from-brand-500 to-lime-400 transition-all duration-200"
                                                style={{ width: `${uploadPercent}%` }}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Panel B: Agent Sync Tool untuk Laptop ARKAS Operator */}
                            <div className="rounded-2xl border border-slate-200/80 bg-white/70 p-4 dark:border-white/10 dark:bg-white/[0.02]">
                                <div className="flex flex-wrap items-start justify-between gap-2">
                                    <div>
                                        <p className="text-[11.5px] font-extrabold text-slate-800 dark:text-slate-100">
                                            B. Agent Sync Laptop ARKAS (Untuk Operator Windows)
                                        </p>
                                        <p className="mt-0.5 text-[10px] font-medium text-slate-400 dark:text-slate-500">
                                            Unduh 1 file <code className="font-bold">SIKAS-Arkas-Sync.bat</code> (tanpa instalasi) untuk sinkronisasi 1-klik atau mode pantau otomatis saat ARKAS ditutup.
                                        </p>
                                    </div>
                                    <span
                                        className={`rounded-full px-2 py-0.5 text-[9.5px] font-bold ${
                                            meta.agent.has_token
                                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300'
                                                : 'bg-slate-200 text-slate-600 dark:bg-white/10 dark:text-slate-400'
                                        }`}
                                    >
                                        {meta.agent.has_token ? 'Token Aktif' : 'Belum Ada Token'}
                                    </span>
                                </div>

                                {/* Step 1: PIN */}
                                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
                                    <div>
                                        <label className="mb-1 block text-[9.5px] font-extrabold uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">
                                            1. PIN Sinkronisasi Agent (4–6 Digit Angka)
                                            {meta.agent.has_pin && (
                                                <span className="ml-2 font-bold normal-case text-emerald-600 dark:text-emerald-400">
                                                    • Sudah diatur ({meta.agent.pin_updated_at})
                                                </span>
                                            )}
                                        </label>
                                        <TextInput
                                            type="password"
                                            inputMode="numeric"
                                            maxLength={6}
                                            className="w-full"
                                            placeholder={meta.agent.has_pin ? 'Isi PIN baru jika ingin mengubah (4-6 digit)' : 'Contoh: 123456'}
                                            value={agentPin}
                                            onChange={(e) => setAgentPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                            disabled={isBusy}
                                        />
                                    </div>
                                    <div className="flex items-end">
                                        <SecondaryButton
                                            type="button"
                                            onClick={handleSaveAgentPin}
                                            disabled={agentPin.length < 4 || isBusy}
                                            className="w-full justify-center sm:w-auto"
                                        >
                                            {isSavingPin ? 'Menyimpan...' : meta.agent.has_pin ? 'Ubah PIN' : 'Simpan PIN'}
                                        </SecondaryButton>
                                    </div>
                                </div>

                                {/* Step 2: Download & Revoke */}
                                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3 dark:border-white/5">
                                    <PrimaryButton
                                        type="button"
                                        onClick={handleDownloadAgent}
                                        disabled={!meta.agent.has_pin || isBusy}
                                    >
                                        {isDownloadingAgent
                                            ? 'Membuat File...'
                                            : meta.agent.has_token
                                              ? 'Reset Token & Download .bat Baru'
                                              : 'Buat Token & Download SIKAS-Arkas-Sync.bat'}
                                    </PrimaryButton>

                                    {meta.agent.has_token && (
                                        <SecondaryButton
                                            type="button"
                                            onClick={handleRevokeToken}
                                            disabled={isBusy}
                                            className="!text-rose-600 dark:!text-rose-300"
                                        >
                                            {isRevokingToken ? 'Mencabut...' : 'Cabut Akses Agent'}
                                        </SecondaryButton>
                                    )}
                                </div>

                                <p className="mt-2 text-[9.5px] font-medium leading-relaxed text-slate-400 dark:text-slate-500">
                                    {!meta.agent.has_pin
                                        ? 'Simpan PIN 4–6 digit terlebih dahulu untuk mengaktifkan tombol unduh Agent Tool.'
                                        : 'Kirim file .bat ke laptop pemegang ARKAS. Saat dijalankan, operator cukup mengetik PIN lalu memilih Sync 1x atau Mode Pantau Otomatis.'}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Feedback & Error */}
                    {feedbackMsg && (
                        <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 px-3.5 py-2.5 text-[10.5px] font-semibold text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">
                            {feedbackMsg}
                        </div>
                    )}

                    {errorMsg && (
                        <div className="rounded-xl border border-rose-200 bg-pastel-rose/60 px-3.5 py-2.5 text-[10.5px] font-semibold text-rose-600 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300">
                            {errorMsg}
                        </div>
                    )}

                    {/* Footer */}
                    <div className="flex justify-end gap-2 border-t border-slate-100 pt-3 dark:border-white/5">
                        <SecondaryButton type="button" onClick={onClose} disabled={isBusy}>
                            Tutup
                        </SecondaryButton>
                    </div>
                </div>
            </div>
        </Modal>
    );
}
