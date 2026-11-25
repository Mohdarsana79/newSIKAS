import React, { useEffect, useRef, useState } from 'react';
import Modal from '@/Components/Modal';
import TextInput from '@/Components/TextInput';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import IconTile from '@/Components/ui/IconTile';
import { router } from '@inertiajs/react';
import {
    AlertCircle,
    AlertTriangle,
    ArrowLeft,
    BookOpen,
    CheckCircle2,
    FileText,
    Image as ImageIcon,
    PencilLine,
    RefreshCw,
    Sparkles,
    Table as TableIcon,
    Tag,
    Trash2,
    Upload,
    X,
} from 'lucide-react';
import ConfirmModal from './ConfirmModal';
import TagReferenceCatalog from './TagReferenceCatalog';
import { SkTagGroup, SkTemplate } from './types';

interface Props {
    show: boolean;
    onClose: () => void;
    folderId: number;
    templates: SkTemplate[];
    tagCatalog?: SkTagGroup[];
    canWrite?: boolean;
    isKepalaSekolah?: boolean;
}

const LABEL_CLASS =
    'mb-1.5 block text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500';

export default function ManageTemplatesModal({
    show,
    onClose,
    folderId,
    templates = [],
    tagCatalog = [],
    canWrite,
    isKepalaSekolah = false,
}: Props) {
    const allowWrite = canWrite !== undefined ? canWrite : !isKepalaSekolah;

    const [activeTab, setActiveTab] = useState<'templates' | 'tags'>('templates');
    const [judul, setJudul] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [rescanningId, setRescanningId] = useState<number | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [statusNotice, setStatusNotice] = useState<{
        tone: 'success' | 'warning';
        message: string;
        detail?: string;
        showSyntaxHint?: boolean;
    } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [templateToDelete, setTemplateToDelete] = useState<SkTemplate | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        if (show) {
            setErrorMsg(null);
            setStatusNotice(null);
        } else {
            setActiveTab('templates');
            setJudul('');
            setFile(null);
            setErrorMsg(null);
            setStatusNotice(null);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    }, [show]);

    const applyFlashNotice = (page: any, fallbackMessage: string) => {
        const flashSuccess = page?.props?.flash?.success as string | undefined;
        const flashWarning = page?.props?.flash?.warning as string | undefined;
        const message = flashSuccess || fallbackMessage;
        const hasZeroVars =
            message.includes('belum ada tag') ||
            message.includes('belum ditemukan tag') ||
            message.includes('0 variabel');
        setStatusNotice({
            tone: hasZeroVars || Boolean(flashWarning) ? 'warning' : 'success',
            message,
            detail: flashWarning,
            showSyntaxHint: hasZeroVars,
        });
    };

    const handleUpload = (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg(null);
        setStatusNotice(null);

        if (!judul.trim() || !file) {
            setErrorMsg('Judul dan berkas .docx template wajib diisi.');
            return;
        }

        const formData = new FormData();
        formData.append('judul', judul);
        formData.append('file', file);

        setLoading(true);
        router.post(route('sk-surat.template.store', folderId), formData, {
            forceFormData: true,
            onSuccess: (page) => {
                setJudul('');
                setFile(null);
                if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                }
                applyFlashNotice(page, 'Master template berhasil diunggah.');
            },
            onError: (err) => {
                setErrorMsg(Object.values(err).join(', '));
            },
            onFinish: () => setLoading(false),
        });
    };

    const handleRescan = (tpl: SkTemplate) => {
        setErrorMsg(null);
        setStatusNotice(null);
        setRescanningId(tpl.id);

        router.post(
            route('sk-surat.template.rescan', tpl.id),
            {},
            {
                preserveScroll: true,
                onSuccess: (page) => {
                    applyFlashNotice(page, `Deteksi ulang selesai untuk "${tpl.judul}".`);
                },
                onError: (err) => {
                    setErrorMsg(Object.values(err).join(', '));
                },
                onFinish: () => setRescanningId(null),
            }
        );
    };

    const confirmDelete = () => {
        if (!templateToDelete) return;

        setIsDeleting(true);
        router.delete(route('sk-surat.template.destroy', templateToDelete.id), {
            onSuccess: () => {
                setTemplateToDelete(null);
            },
            onFinish: () => setIsDeleting(false),
        });
    };

    const totalCatalogTags = tagCatalog.reduce((sum, g) => sum + g.items.length, 0);

    return (
        <>
            <Modal show={show} onClose={onClose} maxWidth="full">
                <div className="relative flex h-screen flex-col overflow-hidden">
                    <div className="pointer-events-none absolute -right-10 -top-16 h-40 w-40 rounded-full bg-brand-500/10 blur-3xl dark:bg-brand-500/[0.08]" />

                    {/* Header */}
                    <div className="relative flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 px-6 py-4 dark:border-white/5">
                        <div className="flex min-w-0 items-center gap-3">
                            <IconTile tone="violet" size="lg">
                                <FileText className="h-4 w-4" />
                            </IconTile>
                            <div className="min-w-0">
                                <h3 className="text-[14px] font-extrabold tracking-tight text-slate-900 dark:text-white">
                                    Kelola Master Template Word (.docx)
                                </h3>
                                <p className="mt-0.5 text-[10px] font-medium text-slate-400 dark:text-slate-500">
                                    Gunakan tag referensi SIKAS agar data sekolah, belanja BKU, penganggaran, &amp; PTK terisi otomatis.
                                </p>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={onClose}
                            aria-label="Tutup modal"
                            title="Kembali ke Folder"
                            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:text-slate-500 dark:hover:bg-white/10 dark:hover:text-slate-200"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>

                    {/* Tab Switcher */}
                    <div className="flex shrink-0 items-center gap-2 border-b border-slate-100 bg-slate-50/70 px-6 py-2.5 dark:border-white/5 dark:bg-white/[0.02]">
                        <button
                            type="button"
                            onClick={() => setActiveTab('templates')}
                            className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-[11px] font-extrabold transition ${
                                activeTab === 'templates'
                                    ? 'bg-slate-900 text-white shadow-sm dark:bg-lime-400 dark:text-slate-950'
                                    : 'text-slate-600 hover:bg-white hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/10'
                            }`}
                        >
                            <FileText className="h-3.5 w-3.5" />
                            Daftar &amp; Upload Template ({templates.length})
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('tags')}
                            className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-[11px] font-extrabold transition ${
                                activeTab === 'tags'
                                    ? 'bg-brand-600 text-white shadow-sm dark:bg-brand-400 dark:text-slate-950'
                                    : 'text-slate-600 hover:bg-white hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/10'
                            }`}
                        >
                            <BookOpen className="h-3.5 w-3.5" />
                            Referensi Tag SIKAS ({totalCatalogTags})
                        </button>
                    </div>

                    <div className="relative flex-1 overflow-y-auto px-6 py-5">
                        <div className="mx-auto max-w-7xl space-y-6">
                        {activeTab === 'tags' ? (
                            <TagReferenceCatalog catalog={tagCatalog} compact />
                        ) : (
                            <>
                                {/* Error Message */}
                                {errorMsg && (
                                    <div className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-pastel-rose p-3 text-[11px] font-semibold text-rose-700 dark:border-rose-400/20 dark:bg-rose-500/10 dark:text-rose-300">
                                        <AlertCircle className="h-4 w-4 shrink-0" />
                                        <span>{errorMsg}</span>
                                    </div>
                                )}

                                {/* Status Notice */}
                                {statusNotice && (
                                    <div
                                        className={`flex items-start gap-2 rounded-2xl border p-3 text-[11px] font-semibold ${
                                            statusNotice.tone === 'warning'
                                                ? 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-400/20 dark:bg-amber-500/10 dark:text-amber-300'
                                                : 'border-emerald-200 bg-pastel-mint text-emerald-800 dark:border-emerald-400/20 dark:bg-mint/10 dark:text-emerald-300'
                                        }`}
                                    >
                                        {statusNotice.tone === 'warning' ? (
                                            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                                        ) : (
                                            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                                        )}
                                        <div className="space-y-1">
                                            <p>{statusNotice.message}</p>
                                            {statusNotice.detail && (
                                                <p className="text-[10.5px] font-medium opacity-95">{statusNotice.detail}</p>
                                            )}
                                            {statusNotice.showSyntaxHint && (
                                                <p className="text-[10px] font-medium opacity-90">
                                                    Pastikan penulisan tag di file Word menggunakan format{' '}
                                                    <code className="font-mono font-bold">{'${nama_variabel}'}</code>, lalu klik Deteksi Ulang.
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Form Upload Template */}
                                {allowWrite && (
                                    <form
                                        onSubmit={handleUpload}
                                        className="space-y-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-4 dark:border-white/5 dark:bg-white/[0.03]"
                                    >
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                            <h4 className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                                                <Upload className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                                                Unggah Master Template Baru
                                            </h4>
                                            <button
                                                type="button"
                                                onClick={() => setActiveTab('tags')}
                                                className="inline-flex items-center gap-1 text-[10.5px] font-extrabold text-brand-600 hover:underline dark:text-brand-300"
                                            >
                                                <BookOpen className="h-3.5 w-3.5" />
                                                Lihat Daftar Tag Otomatis &rarr;
                                            </button>
                                        </div>

                                        <div>
                                            <label className={LABEL_CLASS}>Judul / Nama Template</label>
                                            <TextInput
                                                type="text"
                                                placeholder="Contoh: Surat Pesanan / SK Tim Pengelola BOSP"
                                                value={judul}
                                                onChange={(e) => setJudul(e.target.value)}
                                                required
                                            />
                                        </div>

                                        <div>
                                            <label className={LABEL_CLASS}>Berkas Dokumen (.docx)</label>
                                            <input
                                                ref={fileInputRef}
                                                type="file"
                                                accept=".docx"
                                                onChange={(e) => setFile(e.target.files?.[0] || null)}
                                                className="block w-full cursor-pointer rounded-xl border border-slate-200/90 bg-white text-[11px] font-semibold text-slate-500 file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-pastel-lavender file:px-3 file:py-2 file:text-[11px] file:font-extrabold file:text-brand-600 hover:file:bg-brand-500/15 dark:border-white/10 dark:bg-white/5 dark:text-slate-400 dark:file:bg-brand-500/10 dark:file:text-brand-300"
                                                required
                                            />
                                        </div>

                                        <div className="flex justify-end pt-1">
                                            <PrimaryButton type="submit" disabled={loading} className="py-2 text-xs">
                                                {loading ? 'Mengunggah & Mendeteksi...' : 'Upload & Deteksi Tag'}
                                            </PrimaryButton>
                                        </div>
                                    </form>
                                )}

                                {/* Daftar Template Tersimpan */}
                                <div>
                                    <h4 className="mb-3 text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                                        Template Tersedia di Folder Ini ({templates.length})
                                    </h4>

                                    {templates.length === 0 ? (
                                        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-6 text-center dark:border-white/10 dark:bg-white/[0.02]">
                                            <AlertCircle className="mx-auto mb-2 h-8 w-8 text-slate-400 dark:text-slate-600" />
                                            <p className="text-[11.5px] font-semibold text-slate-500 dark:text-slate-400">
                                                Belum ada master template di folder ini.
                                            </p>
                                            <p className="mt-1 text-[10px] font-medium text-slate-400 dark:text-slate-500">
                                                Unggah berkas Word (.docx) di atas untuk mulai membuat surat dinamis.
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {templates.map((tpl) => {
                                                const cls = tpl.variable_classification;
                                                const sysCount = cls?.system_text.length ?? 0;
                                                const manualCount = cls?.manual_vars.length ?? 0;
                                                const tableCount = cls ? Object.keys(cls.table_groups).length : 0;
                                                const imageCount = cls?.image_vars.length ?? 0;

                                                return (
                                                    <div
                                                        key={tpl.id}
                                                        className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition-all hover:border-lime-300 dark:border-white/5 dark:bg-white/5 dark:hover:border-lime-400/40"
                                                    >
                                                        <div className="flex items-start justify-between gap-3">
                                                            <div className="space-y-1">
                                                                <div className="flex items-center gap-2 text-[12px] font-extrabold text-slate-900 dark:text-slate-100">
                                                                    <FileText className="h-4 w-4 shrink-0 text-brand-500" />
                                                                    {tpl.judul}
                                                                </div>
                                                                <div className="text-[10.5px] font-medium text-slate-400 dark:text-slate-500">
                                                                    File asli:{' '}
                                                                    <span className="font-mono font-semibold text-slate-600 dark:text-slate-300">
                                                                        {tpl.file_name_original}
                                                                    </span>
                                                                </div>
                                                            </div>

                                                            {allowWrite && (
                                                                <div className="flex shrink-0 items-center gap-1">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleRescan(tpl)}
                                                                        disabled={rescanningId === tpl.id}
                                                                        className="inline-flex h-7 items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-2 text-[10px] font-bold text-slate-600 transition hover:border-brand-300 hover:bg-pastel-lavender hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-brand-500/15 dark:hover:text-brand-300"
                                                                        title="Deteksi Ulang Tag Variabel"
                                                                    >
                                                                        <RefreshCw
                                                                            className={`h-3 w-3 ${rescanningId === tpl.id ? 'animate-spin' : ''}`}
                                                                        />
                                                                        <span>{rescanningId === tpl.id ? 'Memindai...' : 'Deteksi Ulang'}</span>
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setTemplateToDelete(tpl)}
                                                                        className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 dark:text-slate-500 dark:hover:bg-rose-500/10 dark:hover:text-rose-300"
                                                                        title="Hapus Template"
                                                                    >
                                                                        <Trash2 className="h-4 w-4" />
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Ringkasan Klasifikasi Tag */}
                                                        <div className="mt-3 border-t border-slate-100 pt-3 dark:border-white/5">
                                                            <div className="mb-2 flex flex-wrap items-center gap-1.5">
                                                                <span className="inline-flex items-center gap-1 text-[9.5px] font-extrabold uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">
                                                                    <Tag className="h-3 w-3 text-brand-500" />
                                                                    Total {tpl.detected_variables?.length || 0} tag:
                                                                </span>
                                                                {sysCount > 0 && (
                                                                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[9.5px] font-extrabold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                                                                        <Sparkles className="h-2.5 w-2.5" />
                                                                        {sysCount} Otomatis SIKAS
                                                                    </span>
                                                                )}
                                                                {tableCount > 0 && (
                                                                    <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2 py-0.5 text-[9.5px] font-extrabold text-sky-700 dark:bg-sky-500/15 dark:text-sky-300">
                                                                        <TableIcon className="h-2.5 w-2.5" />
                                                                        {tableCount} Tabel Dinamis
                                                                    </span>
                                                                )}
                                                                {imageCount > 0 && (
                                                                    <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-[9.5px] font-extrabold text-violet-700 dark:bg-violet-500/15 dark:text-violet-300">
                                                                        <ImageIcon className="h-2.5 w-2.5" />
                                                                        {imageCount} Gambar
                                                                    </span>
                                                                )}
                                                                {manualCount > 0 && (
                                                                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[9.5px] font-extrabold text-amber-800 dark:bg-amber-500/15 dark:text-amber-300">
                                                                        <PencilLine className="h-2.5 w-2.5" />
                                                                        {manualCount} Manual
                                                                    </span>
                                                                )}
                                                            </div>

                                                            {tpl.detected_variables && tpl.detected_variables.length > 0 ? (
                                                                <div className="flex max-h-24 flex-wrap gap-1.5 overflow-y-auto">
                                                                    {cls ? (
                                                                        <>
                                                                            {cls.system_text.map((st, idx) => (
                                                                                <span
                                                                                    key={`sys-${idx}`}
                                                                                    title={`Otomatis dari ${st.source_label}`}
                                                                                    className="rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-0.5 font-mono text-[10px] font-semibold text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-500/10 dark:text-emerald-300"
                                                                                >
                                                                                    {`\${${st.raw}}`}
                                                                                </span>
                                                                            ))}
                                                                            {Object.values(cls.table_groups)
                                                                                .flat()
                                                                                .map((tv, idx) => (
                                                                                    <span
                                                                                        key={`tbl-${idx}`}
                                                                                        title="Tag Tabel Baris Dinamis"
                                                                                        className="rounded-lg border border-sky-200 bg-sky-50 px-2 py-0.5 font-mono text-[10px] font-semibold text-sky-700 dark:border-sky-400/20 dark:bg-sky-500/10 dark:text-sky-300"
                                                                                    >
                                                                                        {`\${${tv}}`}
                                                                                    </span>
                                                                                ))}
                                                                            {cls.image_vars.map((iv, idx) => (
                                                                                <span
                                                                                    key={`img-${idx}`}
                                                                                    title="Tag Gambar Profil Sekolah"
                                                                                    className="rounded-lg border border-violet-200 bg-violet-50 px-2 py-0.5 font-mono text-[10px] font-semibold text-violet-700 dark:border-violet-400/20 dark:bg-violet-500/10 dark:text-violet-300"
                                                                                >
                                                                                    {`\${${iv}}`}
                                                                                </span>
                                                                            ))}
                                                                            {cls.manual_vars.map((mv, idx) => (
                                                                                <span
                                                                                    key={`man-${idx}`}
                                                                                    title="Tag Input Manual Pengguna"
                                                                                    className="rounded-lg border border-amber-200 bg-amber-50 px-2 py-0.5 font-mono text-[10px] font-semibold text-amber-800 dark:border-amber-400/20 dark:bg-amber-500/10 dark:text-amber-300"
                                                                                >
                                                                                    {`\${${mv}}`}
                                                                                </span>
                                                                            ))}
                                                                        </>
                                                                    ) : (
                                                                        tpl.detected_variables.map((v, idx) => (
                                                                            <span
                                                                                key={idx}
                                                                                className="rounded-lg border border-brand-500/15 bg-pastel-lavender px-2 py-0.5 font-mono text-[10px] font-semibold text-brand-600 dark:border-brand-400/20 dark:bg-brand-500/10 dark:text-brand-300"
                                                                            >
                                                                                {`\${${v}}`}
                                                                            </span>
                                                                        ))
                                                                    )}
                                                                </div>
                                                            ) : (
                                                                <span className="text-[10.5px] font-medium italic text-amber-600 dark:text-amber-400">
                                                                    Tidak ada tag {'${...}'} yang ditemukan dalam file Word ini.
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="relative mt-auto flex shrink-0 justify-end border-t border-slate-100 px-6 py-4 dark:border-white/5">
                        <SecondaryButton type="button" onClick={onClose} disabled={loading}>
                            <ArrowLeft className="h-4 w-4" />
                            Kembali ke Folder
                        </SecondaryButton>
                    </div>
                </div>
            </Modal>

            <ConfirmModal
                show={Boolean(templateToDelete)}
                onClose={() => setTemplateToDelete(null)}
                onConfirm={confirmDelete}
                title="Hapus Master Template?"
                message={`Apakah Anda yakin ingin menghapus template "${templateToDelete?.judul}"? Tindakan ini tidak dapat dibatalkan.`}
                confirmText="Ya, Hapus Template"
                type="danger"
                loading={isDeleting}
            />
        </>
    );
}
