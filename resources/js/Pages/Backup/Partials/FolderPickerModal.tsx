import { FormEvent, useEffect, useRef, useState } from 'react';
import Modal from '@/Components/Modal';
import IconTile from '@/Components/ui/IconTile';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import TextInput from '@/Components/TextInput';
import useVariantRoute from '@/Hooks/useVariantRoute';
import { extractAxiosErrorData, extractAxiosErrorMessage } from '@/lib/axiosError';

interface QuickShortcut {
    label: string;
    path: string;
    kind: string;
}

interface FolderEntry {
    name: string;
    path: string;
    selectable: boolean;
}

interface BrowseResponse {
    success: boolean;
    current_path: string | null;
    parent_path: string | null;
    selectable: boolean;
    can_create_subfolder: boolean;
    select_reason: string | null;
    shortcuts: QuickShortcut[];
    folders: FolderEntry[];
    message?: string;
}

interface FolderPickerModalProps {
    show: boolean;
    initialPath?: string;
    onClose: () => void;
    onSelect: (path: string) => void;
}

export default function FolderPickerModal({
    show,
    initialPath = '',
    onClose,
    onSelect,
}: FolderPickerModalProps) {
    const vRoute = useVariantRoute();
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [currentPath, setCurrentPath] = useState<string | null>(null);
    const [parentPath, setParentPath] = useState<string | null>(null);
    const [selectable, setSelectable] = useState(false);
    const [canCreateSubfolder, setCanCreateSubfolder] = useState(false);
    const [selectReason, setSelectReason] = useState<string | null>(null);
    const [shortcuts, setShortcuts] = useState<QuickShortcut[]>([]);
    const [folders, setFolders] = useState<FolderEntry[]>([]);

    const [showNewFolderForm, setShowNewFolderForm] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [creatingFolder, setCreatingFolder] = useState(false);
    const [createMessage, setCreateMessage] = useState<{ ok: boolean; text: string } | null>(null);

    const requestIdRef = useRef(0);
    const abortRef = useRef<AbortController | null>(null);

    const loadDirectory = async (targetPath?: string, preserveCreateMsg = false) => {
        if (abortRef.current) {
            abortRef.current.abort();
        }
        const controller = new AbortController();
        abortRef.current = controller;
        const reqId = ++requestIdRef.current;

        setLoading(true);
        setErrorMsg(null);
        if (!preserveCreateMsg) {
            setCreateMessage(null);
        }

        try {
            const res = await window.axios.get<BrowseResponse>(vRoute('backup.browse-folders'), {
                params: targetPath ? { path: targetPath } : {},
                signal: controller.signal,
            });
            if (reqId !== requestIdRef.current) return;

            const payload = res.data;
            setCurrentPath(payload.current_path);
            setParentPath(payload.parent_path);
            setSelectable(Boolean(payload.selectable));
            setCanCreateSubfolder(Boolean(payload.can_create_subfolder));
            setSelectReason(payload.select_reason);
            setShortcuts(payload.shortcuts || []);
            setFolders(payload.folders || []);
        } catch (err: unknown) {
            if (controller.signal.aborted || reqId !== requestIdRef.current) return;

            const errPayload = extractAxiosErrorData<Partial<BrowseResponse>>(err);
            if (Array.isArray(errPayload?.shortcuts) && errPayload.shortcuts.length > 0) {
                setShortcuts(errPayload.shortcuts);
            }
            setCurrentPath(null);
            setParentPath(null);
            setSelectable(false);
            setCanCreateSubfolder(false);
            setFolders([]);
            setErrorMsg(extractAxiosErrorMessage(err, 'Gagal membaca daftar folder di komputer ini.'));
        } finally {
            if (reqId === requestIdRef.current) {
                setLoading(false);
            }
        }
    };

    useEffect(() => {
        if (show) {
            setShowNewFolderForm(false);
            setNewFolderName('');
            setCreateMessage(null);
            loadDirectory(initialPath.trim() || undefined);
        } else if (abortRef.current) {
            abortRef.current.abort();
            abortRef.current = null;
        }
        return () => {
            if (abortRef.current) {
                abortRef.current.abort();
                abortRef.current = null;
            }
        };
    }, [show]);

    const handleCreateFolder = async (e: FormEvent) => {
        e.preventDefault();
        if (!currentPath || !newFolderName.trim() || creatingFolder) return;
        setCreatingFolder(true);
        setCreateMessage(null);
        try {
            const res = await window.axios.post<{ success: boolean; path?: string; message: string }>(
                vRoute('backup.create-folder'),
                {
                    parent_path: currentPath,
                    folder_name: newFolderName.trim(),
                },
            );
            setNewFolderName('');
            setShowNewFolderForm(false);
            await loadDirectory(res.data.path || currentPath, true);
            setCreateMessage({ ok: true, text: res.data.message });
        } catch (err: unknown) {
            setCreateMessage({
                ok: false,
                text: extractAxiosErrorMessage(err, 'Gagal membuat folder baru.'),
            });
        } finally {
            setCreatingFolder(false);
        }
    };

    const handleConfirmSelect = () => {
        if (!currentPath || !selectable) return;
        onSelect(currentPath);
        onClose();
    };

    return (
        <Modal
            show={show}
            onClose={onClose}
            closeable={!creatingFolder}
            maxWidth="2xl"
            ariaLabelledBy="folder-picker-modal-title"
        >
            <div className="relative overflow-hidden rounded-[26px] bg-white dark:bg-[#15131F]">
                {/* Header */}
                <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-6 py-4 dark:border-white/5">
                    <div className="flex items-center gap-3">
                        <IconTile tone="sky" size="md">
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
                            </svg>
                        </IconTile>
                        <div>
                            <h2
                                id="folder-picker-modal-title"
                                className="text-[14px] font-extrabold tracking-tight text-slate-900 dark:text-white"
                            >
                                Pilih Folder Tujuan Auto-Backup
                            </h2>
                            <p className="text-[10.5px] font-medium text-slate-500 dark:text-slate-400">
                                Pilih drive atau folder di komputer Anda (mis. Drive D, Documents, atau Google Drive Desktop).
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={creatingFolder}
                        aria-label="Tutup dialog"
                        className="rounded-xl p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 disabled:opacity-40 dark:hover:bg-white/10 dark:hover:text-white"
                    >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Body */}
                <div className="grid grid-cols-1 divide-y divide-slate-100 sm:grid-cols-12 sm:divide-x sm:divide-y-0 dark:divide-white/5">
                    {/* Left: Quick Shortcuts */}
                    <div className="bg-slate-50/60 p-4 sm:col-span-4 dark:bg-white/[0.02]">
                        <p className="mb-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                            Pintasan Cepat
                        </p>
                        <div className="space-y-1">
                            {shortcuts.length > 0 ? (
                                shortcuts.map((item) => {
                                    const isCurrent =
                                        currentPath !== null &&
                                        currentPath.toLowerCase() === item.path.toLowerCase();
                                    return (
                                        <button
                                            key={item.path}
                                            type="button"
                                            onClick={() => loadDirectory(item.path)}
                                            className={`flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-[11px] font-bold transition ${
                                                isCurrent
                                                    ? 'bg-brand-600 text-white shadow-sm'
                                                    : 'text-slate-700 hover:bg-white dark:text-slate-200 dark:hover:bg-white/10'
                                            }`}
                                        >
                                            <span className="shrink-0 text-[12px]" aria-hidden="true">
                                                {item.kind === 'cloud'
                                                    ? '☁️'
                                                    : item.kind === 'drive'
                                                      ? '💾'
                                                      : '📁'}
                                            </span>
                                            <span className="truncate">{item.label}</span>
                                        </button>
                                    );
                                })
                            ) : (
                                <p className="text-[11px] text-slate-400">Memuat daftar drive...</p>
                            )}
                        </div>
                    </div>

                    {/* Right: Directory Explorer */}
                    <div className="flex flex-col p-4 sm:col-span-8">
                        {/* Path & Toolbar */}
                        <div className="flex flex-wrap items-center gap-2">
                            <button
                                type="button"
                                onClick={() => parentPath && loadDirectory(parentPath)}
                                disabled={!parentPath || loading}
                                className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-[10.5px] font-extrabold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
                            >
                                ↑ Naik
                            </button>
                            <div className="min-w-0 flex-1 truncate rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 font-mono text-[11px] font-semibold text-slate-700 dark:border-white/10 dark:bg-slate-900 dark:text-slate-200">
                                {currentPath || 'Pilih lokasi di Pintasan Cepat...'}
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    setShowNewFolderForm((v) => !v);
                                    setCreateMessage(null);
                                }}
                                disabled={!currentPath || !canCreateSubfolder || loading}
                                className="inline-flex items-center gap-1 rounded-xl border border-brand-200 bg-brand-50 px-2.5 py-1.5 text-[10.5px] font-extrabold text-brand-700 transition hover:bg-brand-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-brand-400/20 dark:bg-brand-500/15 dark:text-brand-200"
                            >
                                + Folder Baru
                            </button>
                        </div>

                        {/* Inline New Folder Form */}
                        {showNewFolderForm && (
                            <form
                                onSubmit={handleCreateFolder}
                                className="mt-2.5 flex items-center gap-2 rounded-xl border border-brand-200 bg-brand-50/50 p-2 dark:border-brand-400/20 dark:bg-brand-500/10"
                            >
                                <TextInput
                                    type="text"
                                    value={newFolderName}
                                    onChange={(e) => setNewFolderName(e.target.value)}
                                    placeholder="Nama folder (mis. Backup-SIKAS)"
                                    className="block flex-1 text-[11.5px]"
                                    autoFocus
                                />
                                <PrimaryButton disabled={creatingFolder || !newFolderName.trim()}>
                                    {creatingFolder ? 'Membuat...' : 'Buat'}
                                </PrimaryButton>
                            </form>
                        )}

                        {createMessage && (
                            <div
                                role={createMessage.ok ? 'status' : 'alert'}
                                className={`mt-2 rounded-xl px-3 py-2 text-[10.5px] font-semibold ${
                                    createMessage.ok
                                        ? 'bg-pastel-mint/60 text-emerald-800 dark:bg-mint/10 dark:text-emerald-200'
                                        : 'bg-pastel-rose/70 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300'
                                }`}
                            >
                                {createMessage.text}
                            </div>
                        )}

                        {errorMsg && (
                            <div
                                role="alert"
                                className="mt-2 rounded-xl bg-pastel-rose/70 px-3 py-2 text-[10.5px] font-semibold text-rose-700 dark:bg-rose-500/10 dark:text-rose-300"
                            >
                                {errorMsg}
                            </div>
                        )}

                        {/* Subfolder List */}
                        <div className="mt-3 h-64 overflow-y-auto rounded-2xl border border-slate-100 bg-slate-50/40 p-2 dark:border-white/5 dark:bg-white/[0.02]">
                            {loading ? (
                                <div className="flex h-full items-center justify-center text-[11.5px] font-semibold text-slate-400">
                                    Memuat isi folder...
                                </div>
                            ) : folders.length > 0 ? (
                                <div className="grid grid-cols-1 gap-1">
                                    {folders.map((folder) => (
                                        <button
                                            key={folder.path}
                                            type="button"
                                            onClick={() => loadDirectory(folder.path)}
                                            className="flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-[11.5px] font-semibold text-slate-700 transition hover:bg-white hover:shadow-xs dark:text-slate-200 dark:hover:bg-white/10"
                                        >
                                            <span className="flex min-w-0 items-center gap-2">
                                                <svg className="h-4 w-4 shrink-0 text-amber-500" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                                                    <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                                                </svg>
                                                <span className="truncate">{folder.name}</span>
                                            </span>
                                            {!folder.selectable && (
                                                <span className="shrink-0 rounded-full bg-slate-200 px-2 py-0.5 text-[9px] font-bold text-slate-600 dark:bg-white/10 dark:text-slate-300">
                                                    Folder Sistem
                                                </span>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex h-full flex-col items-center justify-center text-center text-[11px] text-slate-400">
                                    <p className="font-semibold">
                                        {currentPath
                                            ? 'Tidak ada sub-folder yang dapat ditampilkan di sini.'
                                            : 'Pilih salah satu drive di sebelah kiri untuk mulai.'}
                                    </p>
                                    {currentPath && canCreateSubfolder && (
                                        <p className="mt-0.5 text-[10px]">
                                            Anda dapat langsung memilih folder ini atau klik <strong>+ Folder Baru</strong>.
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Status Selection Banner */}
                        {currentPath && (
                            <div
                                role="status"
                                className={`mt-3 rounded-xl px-3 py-2 text-[10.5px] font-semibold ${
                                    selectable
                                        ? 'border border-mint/25 bg-pastel-mint/50 text-emerald-800 dark:border-mint/20 dark:bg-mint/10 dark:text-emerald-200'
                                        : 'border border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-400/20 dark:bg-amber-500/10 dark:text-amber-200'
                                }`}
                            >
                                {selectable
                                    ? `Siap dipilih: ${currentPath}`
                                    : selectReason || 'Folder ini tidak dapat dipilih sebagai tujuan backup.'}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-6 py-3.5 dark:border-white/5">
                    <SecondaryButton type="button" onClick={onClose} disabled={creatingFolder}>
                        Batal
                    </SecondaryButton>
                    <PrimaryButton
                        type="button"
                        onClick={handleConfirmSelect}
                        disabled={!currentPath || !selectable || loading}
                    >
                        Pilih Folder Ini
                    </PrimaryButton>
                </div>
            </div>
        </Modal>
    );
}
