import React, { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import Modal from '@/Components/Modal';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import IconTile from '@/Components/ui/IconTile';
import StatusBadge from '@/Components/ui/StatusBadge';
import {
    SPJ_DOCUMENT_LABELS,
    SpjCustomTemplate,
    SpjDocumentType,
    SpjVariableGroup,
} from './types';

declare const route: (name: string, params?: any, absolute?: boolean) => string;

interface SpjTemplateModalProps {
    show: boolean;
    onClose: () => void;
    docType: SpjDocumentType;
    templates: SpjCustomTemplate[];
    variableCatalog: SpjVariableGroup[];
    libreOfficeAvailable: boolean;
    canManage: boolean;
    onTemplatesChanged: () => Promise<void> | void;
}

function formatBytes(bytes: number): string {
    if (!bytes || bytes <= 0) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

const MAX_TEMPLATE_BYTES = 10 * 1024 * 1024; // 10 MB

function extractAxiosErrorMessage(err: unknown, fallback: string): string {
    if (axios.isAxiosError(err)) {
        const data = err.response?.data as
            | { message?: string; errors?: Record<string, string[] | string> }
            | undefined;
        if (data?.errors && typeof data.errors === 'object') {
            const first = Object.values(data.errors).flat()[0];
            if (typeof first === 'string' && first.trim() !== '') {
                return first;
            }
        }
        if (typeof data?.message === 'string' && data.message.trim() !== '') {
            return data.message;
        }
    }

    return fallback;
}

export default function SpjTemplateModal({
    show,
    onClose,
    docType,
    templates,
    variableCatalog,
    libreOfficeAvailable,
    canManage,
    onTemplatesChanged,
}: SpjTemplateModalProps) {
    const docLabel = SPJ_DOCUMENT_LABELS[docType];

    const [activeTab, setActiveTab] = useState<'templates' | 'variables'>('templates');
    const [editingTemplate, setEditingTemplate] = useState<SpjCustomTemplate | null>(null);
    const [nama, setNama] = useState('');
    const [deskripsi, setDeskripsi] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [varSearch, setVarSearch] = useState('');
    const [copiedTag, setCopiedTag] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const modalContainerRef = useRef<HTMLDivElement>(null);
    const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        return () => {
            if (copyTimeoutRef.current !== null) {
                clearTimeout(copyTimeoutRef.current);
            }
        };
    }, []);

    useEffect(() => {
        if (!show) {
            setActiveTab('templates');
            setEditingTemplate(null);
            setNama('');
            setDeskripsi('');
            setFile(null);
            setErrorMessage('');
            setSuccessMessage('');
            setConfirmDeleteId(null);
            setVarSearch('');
            setCopiedTag(null);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
            if (copyTimeoutRef.current !== null) {
                clearTimeout(copyTimeoutRef.current);
                copyTimeoutRef.current = null;
            }
        }
    }, [show]);

    const resetForm = () => {
        setEditingTemplate(null);
        setNama('');
        setDeskripsi('');
        setFile(null);
        setErrorMessage('');
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const startEdit = (tpl: SpjCustomTemplate) => {
        setEditingTemplate(tpl);
        setNama(tpl.nama);
        setDeskripsi(tpl.deskripsi ?? '');
        setFile(null);
        setErrorMessage('');
        setSuccessMessage('');
        setConfirmDeleteId(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!canManage) return;

        setErrorMessage('');
        setSuccessMessage('');

        if (!nama.trim()) {
            setErrorMessage('Nama template wajib diisi.');
            return;
        }
        if (!editingTemplate && !file) {
            setErrorMessage('Pilih file Microsoft Word (.docx) terlebih dahulu.');
            return;
        }
        if (file && !file.name.toLowerCase().endsWith('.docx')) {
            setErrorMessage('Hanya file berformat .docx yang diizinkan.');
            return;
        }
        if (file && file.size > MAX_TEMPLATE_BYTES) {
            setErrorMessage('Ukuran file template maksimal 10 MB.');
            return;
        }

        const formData = new FormData();
        formData.append('nama', nama.trim());
        formData.append('deskripsi', deskripsi.trim());
        if (file) {
            formData.append('file', file);
        }

        setSubmitting(true);
        try {
            const url = editingTemplate
                ? route('api.spj-templates.update', { type: docType, template: editingTemplate.id })
                : route('api.spj-templates.store', { type: docType });

            const response = await axios.post(url, formData);

            if (response.data?.success) {
                setSuccessMessage(
                    response.data.message ||
                        (editingTemplate
                            ? `Template ${docLabel} berhasil diperbarui.`
                            : `Template ${docLabel} berhasil diunggah.`),
                );
                resetForm();
                await onTemplatesChanged();
            } else {
                setErrorMessage(response.data?.message || 'Gagal menyimpan template.');
            }
        } catch (err: unknown) {
            setErrorMessage(
                extractAxiosErrorMessage(err, 'Terjadi kesalahan saat mengunggah template.'),
            );
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!canManage) return;
        setDeletingId(id);
        setErrorMessage('');
        setSuccessMessage('');

        try {
            const response = await axios.delete(
                route('api.spj-templates.destroy', { type: docType, template: id }),
            );
            if (response.data?.success) {
                setSuccessMessage(`Template ${docLabel} berhasil dihapus.`);
                if (editingTemplate?.id === id) {
                    resetForm();
                }
                setConfirmDeleteId(null);
                await onTemplatesChanged();
            } else {
                setErrorMessage(response.data?.message || 'Gagal menghapus template.');
            }
        } catch (err: unknown) {
            setErrorMessage(
                extractAxiosErrorMessage(err, 'Terjadi kesalahan saat menghapus template.'),
            );
        } finally {
            setDeletingId(null);
        }
    };

    const handleCopyTag = async (tag: string) => {
        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(tag);
            } else {
                const ta = document.createElement('textarea');
                ta.value = tag;
                ta.setAttribute('readonly', '');
                ta.className = 'fixed -left-[9999px] top-0 opacity-0 pointer-events-none';
                const host = modalContainerRef.current ?? document.body;
                host.appendChild(ta);
                ta.select();
                document.execCommand('copy');
                host.removeChild(ta);
            }
            if (copyTimeoutRef.current !== null) {
                clearTimeout(copyTimeoutRef.current);
            }
            setCopiedTag(tag);
            copyTimeoutRef.current = setTimeout(() => {
                setCopiedTag((prev) => (prev === tag ? null : prev));
                copyTimeoutRef.current = null;
            }, 1500);
        } catch {
            // Abaikan bila clipboard diblokir browser
        }
    };

    const filteredCatalog = useMemo(() => {
        const q = varSearch.trim().toLowerCase();
        if (!q) return variableCatalog;

        return variableCatalog
            .map((group) => ({
                ...group,
                items: group.items.filter(
                    (item) =>
                        item.tag.toLowerCase().includes(q) ||
                        item.label.toLowerCase().includes(q) ||
                        item.example.toLowerCase().includes(q) ||
                        group.group.toLowerCase().includes(q),
                ),
            }))
            .filter((group) => group.items.length > 0);
    }, [variableCatalog, varSearch]);

    return (
        <Modal show={show} onClose={onClose} maxWidth="2xl">
            <div ref={modalContainerRef} className="relative overflow-hidden">
                <div className="pointer-events-none absolute -right-10 -top-16 h-40 w-40 rounded-full bg-brand-500/15 blur-3xl dark:bg-brand-500/10" />

                {/* Header */}
                <div className="relative flex items-start justify-between gap-3 border-b border-slate-100 px-6 py-4 dark:border-white/5">
                    <div className="flex items-center gap-3">
                        <IconTile tone="violet" size="lg">
                            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                <polyline points="14 2 14 8 20 8" />
                                <line x1="16" y1="13" x2="8" y2="13" />
                                <line x1="16" y1="17" x2="8" y2="17" />
                            </svg>
                        </IconTile>
                        <div className="min-w-0">
                            <h2 className="text-[14px] font-extrabold tracking-tight text-slate-900 dark:text-white">
                                Template {docLabel} Kustom (Word)
                            </h2>
                            <p className="mt-0.5 text-[10px] font-medium text-slate-400 dark:text-slate-500">
                                Unggah desain {docLabel} .docx buatan sendiri — otomatis berlaku di seluruh 4 varian BOSP.
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-500 dark:hover:bg-white/5 dark:hover:text-white"
                        aria-label="Tutup"
                    >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Tab switcher */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/70 px-6 py-2.5 dark:border-white/5 dark:bg-white/[0.02]">
                    <div className="inline-flex rounded-xl bg-white p-1 shadow-sm ring-1 ring-slate-200/80 dark:bg-white/5 dark:ring-white/10">
                        <button
                            type="button"
                            onClick={() => setActiveTab('templates')}
                            className={`rounded-lg px-3 py-1.5 text-[11px] font-extrabold transition ${
                                activeTab === 'templates'
                                    ? 'bg-slate-900 text-white shadow-sm dark:bg-lime-400 dark:text-slate-950'
                                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                            }`}
                        >
                            Daftar &amp; Upload ({templates.length})
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('variables')}
                            className={`rounded-lg px-3 py-1.5 text-[11px] font-extrabold transition ${
                                activeTab === 'variables'
                                    ? 'bg-slate-900 text-white shadow-sm dark:bg-lime-400 dark:text-slate-950'
                                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                            }`}
                        >
                            Katalog Variabel
                        </button>
                    </div>

                    <a
                        href={route('api.spj-templates.sample', { type: docType })}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200/90 bg-white px-3 py-1.5 text-[10.5px] font-bold text-slate-700 shadow-sm transition hover:border-brand-300 hover:bg-brand-50/60 hover:text-brand-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
                    >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Download Contoh .docx
                    </a>
                </div>

                {/* Body */}
                <div className="sikas-scroll max-h-[68vh] space-y-4 overflow-y-auto px-6 py-4">
                    {!libreOfficeAvailable && (
                        <div className="rounded-2xl border border-amber-200/90 bg-amber-50/80 px-3.5 py-2.5 text-[11px] font-medium text-amber-800 dark:border-amber-400/20 dark:bg-amber-500/10 dark:text-amber-300">
                            <strong className="font-extrabold">Info LibreOffice:</strong> LibreOffice belum terdeteksi di server ini. Anda tetap bisa mengunduh hasil dalam format <strong>Word (.docx)</strong>; untuk Preview/Unduh <strong>PDF</strong>, pastikan LibreOffice tersedia.
                        </div>
                    )}

                    {errorMessage && (
                        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-[11px] font-semibold text-rose-700 dark:border-rose-400/25 dark:bg-rose-500/10 dark:text-rose-300">
                            {errorMessage}
                        </div>
                    )}

                    {successMessage && (
                        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-[11px] font-semibold text-emerald-700 dark:border-emerald-400/25 dark:bg-emerald-500/10 dark:text-emerald-300">
                            {successMessage}
                        </div>
                    )}

                    {activeTab === 'templates' ? (
                        <div className="space-y-4">
                            {canManage && (
                                <form
                                    onSubmit={handleSubmit}
                                    className="space-y-3 rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4 dark:border-white/10 dark:bg-white/[0.02]"
                                >
                                    <div className="flex items-center justify-between gap-2">
                                        <h3 className="text-[12px] font-extrabold text-slate-900 dark:text-white">
                                            {editingTemplate ? `Edit Template: ${editingTemplate.nama}` : `Unggah Template ${docLabel} Baru`}
                                        </h3>
                                        {editingTemplate && (
                                            <button
                                                type="button"
                                                onClick={resetForm}
                                                className="text-[10.5px] font-bold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                                            >
                                                Batal Edit
                                            </button>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                        <div>
                                            <InputLabel value="Nama Template *" />
                                            <TextInput
                                                type="text"
                                                placeholder={`Mis. ${docLabel} Format Dinas`}
                                                value={nama}
                                                onChange={(e) => setNama(e.target.value)}
                                                maxLength={120}
                                            />
                                        </div>
                                        <div>
                                            <InputLabel value="Deskripsi (Opsional)" />
                                            <TextInput
                                                type="text"
                                                placeholder="Catatan singkat ukuran kertas / kegunaan"
                                                value={deskripsi}
                                                onChange={(e) => setDeskripsi(e.target.value)}
                                                maxLength={255}
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <InputLabel
                                            value={
                                                editingTemplate
                                                    ? 'Ganti File Word (.docx) — kosongkan jika hanya ubah nama'
                                                    : 'File Template Word (.docx) *'
                                            }
                                        />
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                                            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                                            className="mt-1 block w-full cursor-pointer rounded-xl border border-dashed border-slate-300 bg-white px-3 py-2 text-[11px] font-semibold text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-900 file:px-3 file:py-1.5 file:text-[10.5px] file:font-bold file:text-white hover:border-brand-400 dark:border-white/15 dark:bg-white/5 dark:text-slate-200 dark:file:bg-lime-400 dark:file:text-slate-950"
                                        />
                                        <p className="mt-1 text-[10px] font-medium text-slate-400 dark:text-slate-500">
                                            Maksimal 10 MB. Gunakan placeholder seperti <code className="rounded bg-slate-200/70 px-1 py-0.5 text-slate-700 dark:bg-white/10 dark:text-slate-200">{'${kop_surat}'}</code> dan cek tab <strong>Katalog Variabel</strong> untuk daftar lengkap.
                                        </p>
                                    </div>

                                    <div className="flex items-center justify-end gap-2 pt-1">
                                        {editingTemplate && (
                                            <SecondaryButton type="button" onClick={resetForm} disabled={submitting}>
                                                Batal
                                            </SecondaryButton>
                                        )}
                                        <PrimaryButton type="submit" disabled={submitting}>
                                            {submitting
                                                ? 'Memproses...'
                                                : editingTemplate
                                                    ? 'Simpan Perubahan'
                                                    : 'Unggah Template'}
                                        </PrimaryButton>
                                    </div>
                                </form>
                            )}

                            {/* Daftar Template */}
                            <div className="space-y-2.5">
                                <h3 className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">
                                    Template Tersimpan ({templates.length})
                                </h3>

                                {templates.length === 0 ? (
                                    <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center dark:border-white/10">
                                        <p className="text-[12px] font-bold text-slate-600 dark:text-slate-300">
                                            Belum ada template kustom {docLabel}.
                                        </p>
                                        <p className="mt-1 text-[10.5px] text-slate-400 dark:text-slate-500">
                                            Unduh contoh .docx di kanan atas, sesuaikan di Microsoft Word, lalu unggah di sini.
                                        </p>
                                    </div>
                                ) : (
                                    templates.map((tpl) => {
                                        const recognizedCount = tpl.detected_variables?.recognized?.length ?? 0;
                                        const unrecognized = tpl.detected_variables?.unrecognized ?? [];
                                        const unclosed = tpl.detected_variables?.unclosed ?? [];

                                        return (
                                            <div
                                                key={tpl.id}
                                                className="rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-sm transition hover:border-slate-300 dark:border-white/10 dark:bg-white/[0.03]"
                                            >
                                                <div className="flex flex-wrap items-start justify-between gap-2">
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <h4 className="text-[12.5px] font-extrabold text-slate-900 dark:text-white">
                                                                {tpl.nama}
                                                            </h4>
                                                            <StatusBadge tone="lime" dot={false}>
                                                                {recognizedCount} tag valid
                                                            </StatusBadge>
                                                            {tpl.has_item_table && (
                                                                <StatusBadge tone="info" dot={false}>
                                                                    Tabel Dinamis
                                                                </StatusBadge>
                                                            )}
                                                            {unrecognized.length > 0 && (
                                                                <StatusBadge tone="warning" dot={false}>
                                                                    {unrecognized.length} tak dikenal
                                                                </StatusBadge>
                                                            )}
                                                            {unclosed.length > 0 && (
                                                                <StatusBadge tone="danger" dot={false}>
                                                                    {unclosed.length} tag belum ditutup
                                                                </StatusBadge>
                                                            )}
                                                        </div>
                                                        {tpl.deskripsi && (
                                                            <p className="mt-0.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                                                                {tpl.deskripsi}
                                                            </p>
                                                        )}
                                                        <p className="mt-1 text-[10px] font-semibold text-slate-400 dark:text-slate-500">
                                                            {tpl.original_filename} · {formatBytes(tpl.file_size)}
                                                            {tpl.creator_name ? ` · oleh ${tpl.creator_name}` : ''}
                                                        </p>
                                                        {unrecognized.length > 0 && (
                                                            <p className="mt-1 text-[10px] font-medium text-amber-600 dark:text-amber-400">
                                                                Tag tidak dikenali: {unrecognized.map((u) => `\${${u}}`).join(', ')}
                                                            </p>
                                                        )}
                                                        {unclosed.length > 0 && (
                                                            <p className="mt-0.5 text-[10px] font-medium text-rose-600 dark:text-rose-400">
                                                                Tag lupa tutup kurung: {unclosed.map((u) => `\${${u}`).join(', ')}
                                                            </p>
                                                        )}
                                                    </div>

                                                    <div className="flex shrink-0 items-center gap-1.5">
                                                        <a
                                                            href={route('api.spj-templates.download', {
                                                                type: docType,
                                                                template: tpl.id,
                                                            })}
                                                            className="inline-flex items-center rounded-xl border border-slate-200 px-2.5 py-1.5 text-[10.5px] font-bold text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/10"
                                                            title="Unduh file .docx sumber"
                                                        >
                                                            Sumber
                                                        </a>
                                                        {canManage && (
                                                            <>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => startEdit(tpl)}
                                                                    className="inline-flex items-center rounded-xl border border-slate-200 px-2.5 py-1.5 text-[10.5px] font-bold text-slate-700 transition hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700 dark:border-white/10 dark:text-slate-200 dark:hover:bg-amber-500/10"
                                                                >
                                                                    Edit
                                                                </button>
                                                                {confirmDeleteId === tpl.id ? (
                                                                    <div className="flex items-center gap-1">
                                                                        <button
                                                                            type="button"
                                                                            disabled={deletingId === tpl.id}
                                                                            onClick={() => handleDelete(tpl.id)}
                                                                            className="rounded-xl bg-rose-600 px-2.5 py-1.5 text-[10.5px] font-extrabold text-white transition hover:bg-rose-700 disabled:opacity-50"
                                                                        >
                                                                            {deletingId === tpl.id ? '...' : 'Ya, Hapus'}
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => setConfirmDeleteId(null)}
                                                                            className="rounded-xl border border-slate-200 px-2 py-1.5 text-[10.5px] font-bold text-slate-500 hover:bg-slate-50 dark:border-white/10"
                                                                        >
                                                                            Batal
                                                                        </button>
                                                                    </div>
                                                                ) : (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setConfirmDeleteId(tpl.id)}
                                                                        className="inline-flex items-center rounded-xl border border-rose-200/80 bg-rose-50/70 px-2.5 py-1.5 text-[10.5px] font-bold text-rose-600 transition hover:bg-rose-100 dark:border-rose-400/20 dark:bg-rose-500/10 dark:text-rose-300"
                                                                    >
                                                                        Hapus
                                                                    </button>
                                                                )}
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <div>
                                <TextInput
                                    type="text"
                                    placeholder={`Cari variabel ${docLabel} (mis. kop_surat, item_, pihak_, tanggal...)`}
                                    value={varSearch}
                                    onChange={(e) => setVarSearch(e.target.value)}
                                />
                                <p className="mt-1 text-[10px] font-medium text-slate-400 dark:text-slate-500">
                                    Klik tag variabel mana saja untuk menyalin otomatis ke clipboard lalu tempel di Microsoft Word.
                                </p>
                            </div>

                            {filteredCatalog.length === 0 ? (
                                <p className="py-6 text-center text-[11.5px] font-semibold text-slate-400">
                                    Tidak ada variabel yang cocok dengan kata kunci &ldquo;{varSearch}&rdquo;.
                                </p>
                            ) : (
                                filteredCatalog.map((group) => (
                                    <div
                                        key={group.group}
                                        className="rounded-2xl border border-slate-200/80 bg-white p-3.5 dark:border-white/10 dark:bg-white/[0.02]"
                                    >
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                            <h4 className="text-[12px] font-extrabold text-slate-900 dark:text-white">
                                                {group.group}
                                            </h4>
                                            <StatusBadge
                                                tone={
                                                    group.type === 'table'
                                                        ? 'info'
                                                        : group.type === 'image'
                                                            ? 'violet'
                                                            : 'neutral'
                                                }
                                                dot={false}
                                            >
                                                {group.type === 'table'
                                                    ? 'Baris Tabel'
                                                    : group.type === 'image'
                                                        ? 'Gambar'
                                                        : 'Teks'}
                                            </StatusBadge>
                                        </div>
                                        <p className="mt-0.5 text-[10.5px] font-medium text-slate-400 dark:text-slate-500">
                                            {group.description}
                                        </p>

                                        <div className="mt-2.5 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                                            {group.items.map((item) => {
                                                const isCopied = copiedTag === item.tag;
                                                return (
                                                    <button
                                                        key={item.key}
                                                        type="button"
                                                        onClick={() => handleCopyTag(item.tag)}
                                                        className="flex flex-col items-start rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2 text-left transition hover:border-brand-300 hover:bg-brand-50/50 dark:border-white/5 dark:bg-white/[0.03] dark:hover:border-brand-400/30"
                                                    >
                                                        <div className="flex w-full items-center justify-between gap-2">
                                                            <code className="text-[11px] font-extrabold text-brand-700 dark:text-brand-300">
                                                                {item.tag}
                                                            </code>
                                                            <span
                                                                className={`text-[9.5px] font-extrabold ${
                                                                    isCopied
                                                                        ? 'text-emerald-600 dark:text-emerald-400'
                                                                        : 'text-slate-400'
                                                                }`}
                                                            >
                                                                {isCopied ? 'Disalin!' : 'Salin'}
                                                            </span>
                                                        </div>
                                                        <span className="mt-0.5 text-[10.5px] font-semibold text-slate-700 dark:text-slate-200">
                                                            {item.label}
                                                        </span>
                                                        <span className="text-[9.5px] text-slate-400 dark:text-slate-500">
                                                            Contoh: {item.example}
                                                        </span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end border-t border-slate-100 bg-slate-50/60 px-6 py-3 dark:border-white/5 dark:bg-white/[0.02]">
                    <SecondaryButton type="button" onClick={onClose}>
                        Tutup
                    </SecondaryButton>
                </div>
            </div>
        </Modal>
    );
}
