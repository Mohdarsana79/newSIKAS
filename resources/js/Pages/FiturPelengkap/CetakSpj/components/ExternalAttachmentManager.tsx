import IconTile from '@/Components/ui/IconTile';
import StatusBadge from '@/Components/ui/StatusBadge';
import Surface from '@/Components/ui/Surface';
import { Check, Eye, FilePlus2, Paperclip, Pencil, Trash2, Upload, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type {
    SpjAttachmentCategory,
    SpjAttachmentPeriodeTag,
    SpjExternalAttachmentItem,
} from '../types';

interface ExternalAttachmentManagerProps {
    attachments: SpjExternalAttachmentItem[];
    canWrite: boolean;
    defaultPeriodeTag: SpjAttachmentPeriodeTag;
    isUploading: boolean;
    onUpload: (payload: {
        file: File;
        judul: string;
        kategori: SpjAttachmentCategory;
        periode_tag: SpjAttachmentPeriodeTag;
    }) => Promise<void>;
    onUpdate: (
        id: number,
        payload: {
            judul: string;
            kategori: SpjAttachmentCategory;
            periode_tag: SpjAttachmentPeriodeTag;
        },
    ) => Promise<void>;
    onDelete: (id: number) => Promise<void>;
}

const CATEGORY_LABELS: Record<SpjAttachmentCategory, string> = {
    sk_tim: 'SK Tim BOSP',
    rekening_koran: 'Rekening Koran Bank',
    pajak: 'Bukti Setor Pajak (NTPN)',
    lainnya: 'Lampiran Pendukung Lain',
};

const PERIODE_TAG_LABELS: Record<SpjAttachmentPeriodeTag, string> = {
    umum: 'Semua Periode (Umum)',
    tahap_1: 'Khusus Tahap 1',
    tahap_2: 'Khusus Tahap 2',
    tahunan: 'Khusus Tahunan',
};

function formatFileSize(bytes: number): string {
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${bytes} B`;
}

export default function ExternalAttachmentManager({
    attachments,
    canWrite,
    defaultPeriodeTag,
    isUploading,
    onUpload,
    onUpdate,
    onDelete,
}: ExternalAttachmentManagerProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [judul, setJudul] = useState('');
    const [kategori, setKategori] = useState<SpjAttachmentCategory>('rekening_koran');
    const [periodeTag, setPeriodeTag] = useState<SpjAttachmentPeriodeTag>(defaultPeriodeTag);
    const [localError, setLocalError] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editJudul, setEditJudul] = useState('');
    const [editKategori, setEditKategori] = useState<SpjAttachmentCategory>('lainnya');
    const [editPeriodeTag, setEditPeriodeTag] = useState<SpjAttachmentPeriodeTag>('umum');
    const [isSavingEdit, setIsSavingEdit] = useState(false);

    useEffect(() => {
        setPeriodeTag(defaultPeriodeTag);
    }, [defaultPeriodeTag]);

    const startEditing = (att: SpjExternalAttachmentItem) => {
        setEditingId(att.id);
        setEditJudul(att.judul);
        setEditKategori(att.kategori);
        setEditPeriodeTag(att.periode_tag);
    };

    const handleSaveEdit = async (id: number) => {
        if (!editJudul.trim()) return;
        setIsSavingEdit(true);
        try {
            await onUpdate(id, {
                judul: editJudul.trim(),
                kategori: editKategori,
                periode_tag: editPeriodeTag,
            });
            setEditingId(null);
        } finally {
            setIsSavingEdit(false);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        setLocalError(null);
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
            setLocalError('Hanya file berformat PDF (.pdf) yang didukung.');
            e.target.value = '';
            return;
        }
        if (file.size > 25 * 1024 * 1024) {
            setLocalError('Ukuran berkas PDF melebihi batas maksimal 25 MB.');
            e.target.value = '';
            return;
        }

        setSelectedFile(file);
        if (!judul.trim()) {
            setJudul(file.name.replace(/\.pdf$/i, '').replace(/[_-]+/g, ' ').trim());
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLocalError(null);
        if (!selectedFile) {
            setLocalError('Pilih berkas PDF terlebih dahulu.');
            return;
        }
        if (!judul.trim()) {
            setLocalError('Masukkan judul lampiran untuk ditampilkan di Daftar Isi.');
            return;
        }

        await onUpload({
            file: selectedFile,
            judul: judul.trim(),
            kategori,
            periode_tag: periodeTag,
        });

        setSelectedFile(null);
        setJudul('');
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleDeleteClick = async (id: number) => {
        setDeletingId(id);
        try {
            await onDelete(id);
        } finally {
            setDeletingId(null);
        }
    };

    const inputClass =
        'w-full rounded-xl border border-slate-200/90 bg-white px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:border-brand-500 focus:ring-brand-500/30 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-lime-400/60 dark:focus:ring-lime-400/20';
    const selectClass =
        'w-full rounded-xl border border-slate-200/90 bg-white px-2.5 py-2 text-xs font-semibold text-slate-700 focus:border-brand-500 focus:ring-brand-500/30 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200 dark:focus:border-lime-400/60 dark:focus:ring-lime-400/20';

    return (
        <Surface
            padding="md"
            title="Lampiran PDF Eksternal"
            subtitle="Rekening Koran, SK Tim BOSP, atau Bukti Pajak ke BAB V"
            icon={
                <IconTile tone="amber" size="sm">
                    <Paperclip />
                </IconTile>
            }
            badge={
                <StatusBadge tone={attachments.length > 0 ? 'warning' : 'neutral'} dot={false}>
                    {attachments.length} file
                </StatusBadge>
            }
        >
            {canWrite && (
                <form
                    onSubmit={handleSubmit}
                    className="mb-3.5 space-y-2.5 rounded-2xl border border-dashed border-slate-200/90 bg-slate-50/70 p-3 dark:border-white/15 dark:bg-white/[0.025]"
                >
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="application/pdf,.pdf"
                        onChange={handleFileSelect}
                        className="hidden"
                    />
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200/90 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:border-brand-400 hover:text-brand-700 dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-200 dark:hover:border-lime-400/50 dark:hover:text-lime-300"
                    >
                        <FilePlus2 className="h-4 w-4 shrink-0 text-brand-600 dark:text-lime-300" />
                        <span className="truncate">
                            {selectedFile
                                ? `${selectedFile.name} (${formatFileSize(selectedFile.size)})`
                                : 'Pilih File PDF (maks 25 MB)...'}
                        </span>
                    </button>

                    <input
                        type="text"
                        placeholder="Judul di Daftar Isi (mis. Rekening Koran Bank)"
                        value={judul}
                        onChange={(e) => setJudul(e.target.value)}
                        className={inputClass}
                    />

                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <select
                            value={kategori}
                            onChange={(e) => setKategori(e.target.value as SpjAttachmentCategory)}
                            className={selectClass}
                        >
                            {Object.entries(CATEGORY_LABELS).map(([k, lbl]) => (
                                <option key={k} value={k}>
                                    {lbl}
                                </option>
                            ))}
                        </select>
                        <select
                            value={periodeTag}
                            onChange={(e) => setPeriodeTag(e.target.value as SpjAttachmentPeriodeTag)}
                            className={selectClass}
                        >
                            {Object.entries(PERIODE_TAG_LABELS).map(([k, lbl]) => (
                                <option key={k} value={k}>
                                    {lbl}
                                </option>
                            ))}
                        </select>
                    </div>

                    {localError && (
                        <div className="rounded-xl border border-rose-200/70 bg-rose-50 px-3 py-2 text-[11px] font-semibold text-rose-700 dark:border-rose-500/25 dark:bg-rose-500/10 dark:text-rose-300">
                            {localError}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isUploading || !selectedFile}
                        className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-slate-900 px-3 py-2 text-xs font-extrabold text-lime-300 transition hover:bg-slate-800 disabled:opacity-40 dark:bg-white/[0.1] dark:text-white dark:hover:bg-white/[0.16]"
                    >
                        <Upload className="h-3.5 w-3.5" />
                        <span>{isUploading ? 'Mengunggah PDF...' : 'Tambahkan ke Bendel SPJ'}</span>
                    </button>
                </form>
            )}

            {/* Daftar lampiran aktif */}
            {attachments.length === 0 ? (
                <div className="rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-3.5 text-center text-[11px] font-medium text-slate-400 dark:border-white/[0.06] dark:bg-white/[0.02] dark:text-slate-500">
                    Belum ada PDF eksternal terlampir untuk periode ini.
                </div>
            ) : (
                <div className="space-y-2">
                    {attachments.map((att) =>
                        editingId === att.id ? (
                            <div
                                key={att.id}
                                className="space-y-2 rounded-xl border border-brand-200 bg-brand-50/40 p-3 dark:border-lime-400/25 dark:bg-lime-400/[0.06]"
                            >
                                <input
                                    type="text"
                                    value={editJudul}
                                    onChange={(e) => setEditJudul(e.target.value)}
                                    className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 dark:border-white/10 dark:bg-[#15131f] dark:text-slate-100"
                                />
                                <div className="grid grid-cols-2 gap-1.5">
                                    <select
                                        value={editKategori}
                                        onChange={(e) =>
                                            setEditKategori(e.target.value as SpjAttachmentCategory)
                                        }
                                        className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 dark:border-white/10 dark:bg-[#15131f] dark:text-slate-200"
                                    >
                                        {Object.entries(CATEGORY_LABELS).map(([k, lbl]) => (
                                            <option key={k} value={k}>
                                                {lbl}
                                            </option>
                                        ))}
                                    </select>
                                    <select
                                        value={editPeriodeTag}
                                        onChange={(e) =>
                                            setEditPeriodeTag(e.target.value as SpjAttachmentPeriodeTag)
                                        }
                                        className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 dark:border-white/10 dark:bg-[#15131f] dark:text-slate-200"
                                    >
                                        {Object.entries(PERIODE_TAG_LABELS).map(([k, lbl]) => (
                                            <option key={k} value={k}>
                                                {lbl}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="flex justify-end gap-1.5">
                                    <button
                                        type="button"
                                        onClick={() => setEditingId(null)}
                                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-300 dark:hover:bg-white/[0.1] dark:hover:text-white"
                                    >
                                        <X className="h-3 w-3" />
                                        Batal
                                    </button>
                                    <button
                                        type="button"
                                        disabled={isSavingEdit || !editJudul.trim()}
                                        onClick={() => void handleSaveEdit(att.id)}
                                        className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-2.5 py-1 text-[11px] font-bold text-lime-300 disabled:opacity-45 dark:bg-lime-400 dark:text-slate-950"
                                    >
                                        <Check className="h-3 w-3" />
                                        Simpan
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div
                                key={att.id}
                                className="flex items-center justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2.5 transition hover:border-slate-200 dark:border-white/[0.07] dark:bg-white/[0.03] dark:hover:border-white/15"
                            >
                                <div className="min-w-0 flex-1">
                                    <div className="truncate text-xs font-extrabold text-slate-800 dark:text-slate-100">
                                        {att.judul}
                                    </div>
                                    <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10.5px] text-slate-500 dark:text-slate-400">
                                        <span className="rounded-md bg-amber-100/80 px-1.5 py-0.5 font-bold text-amber-800 dark:bg-amber-400/15 dark:text-amber-300">
                                            {CATEGORY_LABELS[att.kategori] ?? att.kategori}
                                        </span>
                                        <span>{formatFileSize(att.file_size)}</span>
                                    </div>
                                </div>
                                <div className="flex shrink-0 items-center gap-1">
                                    <a
                                        href={att.stream_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200/90 bg-white text-slate-600 transition hover:text-brand-700 dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-300 dark:hover:text-lime-300"
                                        title="Lihat PDF"
                                        aria-label={`Lihat PDF ${att.judul}`}
                                    >
                                        <Eye className="h-3.5 w-3.5" />
                                    </a>
                                    {canWrite && (
                                        <>
                                            <button
                                                type="button"
                                                onClick={() => startEditing(att)}
                                                className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200/90 bg-white text-slate-600 transition hover:text-brand-700 dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-300 dark:hover:text-lime-300"
                                                title="Edit judul & kategori"
                                                aria-label={`Edit lampiran ${att.judul}`}
                                            >
                                                <Pencil className="h-3.5 w-3.5" />
                                            </button>
                                            <button
                                                type="button"
                                                disabled={deletingId === att.id}
                                                onClick={() => handleDeleteClick(att.id)}
                                                className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-rose-200/80 bg-rose-50 text-rose-600 transition hover:bg-rose-100 disabled:opacity-45 dark:border-rose-500/25 dark:bg-rose-500/10 dark:text-rose-300 dark:hover:bg-rose-500/20"
                                                title="Hapus lampiran"
                                                aria-label={`Hapus lampiran ${att.judul}`}
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        ),
                    )}
                </div>
            )}
        </Surface>
    );
}
