import React, { useState } from 'react';
import Modal from '@/Components/Modal';
import TextInput from '@/Components/TextInput';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import IconTile from '@/Components/ui/IconTile';
import { router } from '@inertiajs/react';
import { FileText, Trash2, Upload, Tag, AlertCircle, ArrowLeft, X } from 'lucide-react';
import ConfirmModal from './ConfirmModal';

interface SkTemplate {
    id: number;
    judul: string;
    file_name_original: string;
    detected_variables: string[] | null;
    created_at: string;
    user?: { id: number; name: string };
}

interface Props {
    show: boolean;
    onClose: () => void;
    folderId: number;
    templates: SkTemplate[];
    isKepalaSekolah?: boolean;
}

const LABEL_CLASS =
    'mb-1.5 block text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500';

export default function ManageTemplatesModal({ show, onClose, folderId, templates = [], isKepalaSekolah = false }: Props) {
    const [judul, setJudul] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // Delete confirmation state
    const [templateToDelete, setTemplateToDelete] = useState<SkTemplate | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const handleUpload = (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg(null);

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
            onSuccess: () => {
                setJudul('');
                setFile(null);
            },
            onError: (err) => {
                setErrorMsg(Object.values(err).join(', '));
            },
            onFinish: () => setLoading(false),
        });
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

    return (
        <>
            <Modal show={show} onClose={onClose} maxWidth="2xl">
                <div className="relative flex max-h-[85vh] flex-col overflow-hidden">
                    <div className="pointer-events-none absolute -right-10 -top-16 h-40 w-40 rounded-full bg-brand-500/10 blur-3xl dark:bg-brand-500/[0.08]" />

                    {/* Header */}
                    <div className="relative flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 px-6 py-4 dark:border-white/5">
                        <div className="flex min-w-0 items-center gap-3">
                            <IconTile tone="violet" size="lg">
                                <FileText className="w-4 h-4" />
                            </IconTile>
                            <div className="min-w-0">
                                <h3 className="text-[14px] font-extrabold tracking-tight text-slate-900 dark:text-white">
                                    Kelola Master Template Word (.docx)
                                </h3>
                                <p className="mt-0.5 text-[10px] font-medium text-slate-400 dark:text-slate-500">
                                    Upload template Word yang berisi tag variabel seperti <code className="font-mono text-brand-600 dark:text-brand-300">{'${nomor_surat}'}</code> atau <code className="font-mono text-brand-600 dark:text-brand-300">{'${nama_kegiatan}'}</code>.
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

                    <div className="relative flex-1 space-y-6 overflow-y-auto px-6 py-5">
                        {/* Error Message */}
                        {errorMsg && (
                            <div className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-pastel-rose p-3 text-[11px] font-semibold text-rose-700 dark:border-rose-400/20 dark:bg-rose-500/10 dark:text-rose-300">
                                <AlertCircle className="w-4 h-4 shrink-0" />
                                <span>{errorMsg}</span>
                            </div>
                        )}

                        {/* Form Upload Template - Khusus Bendahara */}
                        {!isKepalaSekolah && (
                            <form onSubmit={handleUpload} className="space-y-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-4 dark:border-white/5 dark:bg-white/[0.03]">
                                <h4 className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                                    <Upload className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                    Unggah Master Template Baru
                                </h4>

                                <div>
                                    <label className={LABEL_CLASS}>Judul / Nama Template</label>
                                    <TextInput
                                        type="text"
                                        placeholder="Contoh: Format SK Tim Pengelola BOS"
                                        value={judul}
                                        onChange={(e) => setJudul(e.target.value)}
                                        required
                                    />
                                </div>

                                <div>
                                    <label className={LABEL_CLASS}>Berkas Dokumen (.docx)</label>
                                    <input
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
                                    <AlertCircle className="mx-auto mb-2 w-8 h-8 text-slate-400 dark:text-slate-600" />
                                    <p className="text-[11.5px] font-semibold text-slate-500 dark:text-slate-400">Belum ada master template di folder ini.</p>
                                    <p className="mt-1 text-[10px] font-medium text-slate-400 dark:text-slate-500">Unggah berkas Word (.docx) di atas untuk mulai membuat surat dinamis.</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {templates.map((tpl) => (
                                        <div
                                            key={tpl.id}
                                            className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition-all hover:border-lime-300 dark:border-white/5 dark:bg-white/5 dark:hover:border-lime-400/40"
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2 text-[12px] font-extrabold text-slate-900 dark:text-slate-100">
                                                        <FileText className="w-4 h-4 shrink-0 text-brand-500" />
                                                        {tpl.judul}
                                                    </div>
                                                    <div className="text-[10.5px] font-medium text-slate-400 dark:text-slate-500">
                                                        File asli: <span className="font-mono font-semibold text-slate-600 dark:text-slate-300">{tpl.file_name_original}</span>
                                                    </div>
                                                </div>

                                                {!isKepalaSekolah && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setTemplateToDelete(tpl)}
                                                        className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 dark:text-slate-500 dark:hover:bg-rose-500/10 dark:hover:text-rose-300"
                                                        title="Hapus Template"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>

                                            {/* Tag Variabel yang Terdeteksi */}
                                            <div className="mt-3 border-t border-slate-100 pt-3 dark:border-white/5">
                                                <div className="mb-1.5 flex items-center gap-1 text-[9.5px] font-extrabold uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">
                                                    <Tag className="w-3 h-3 text-brand-500" />
                                                    Tag Variabel Terdeteksi ({tpl.detected_variables?.length || 0}):
                                                </div>
                                                {tpl.detected_variables && tpl.detected_variables.length > 0 ? (
                                                    <div className="flex max-h-24 flex-wrap gap-1.5 overflow-y-auto">
                                                        {tpl.detected_variables.map((v, idx) => (
                                                            <span
                                                                key={idx}
                                                                className="rounded-lg border border-brand-500/15 bg-pastel-lavender px-2 py-0.5 font-mono text-[10px] font-semibold text-brand-600 dark:border-brand-400/20 dark:bg-brand-500/10 dark:text-brand-300"
                                                            >
                                                                {`\${${v}}`}
                                                            </span>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <span className="text-[10.5px] font-medium italic text-amber-600 dark:text-amber-400">
                                                        Tidak ada tag ${'{...}'} yang ditemukan dalam file Word ini.
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
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

            {/* Modal Konfirmasi Hapus Template */}
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
