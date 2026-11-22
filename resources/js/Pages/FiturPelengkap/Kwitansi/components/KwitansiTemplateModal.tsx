import React, { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import Modal from '@/Components/Modal';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import IconTile from '@/Components/ui/IconTile';
import StatusBadge from '@/Components/ui/StatusBadge';
import { CustomKwitansiTemplate, KwitansiVariableGroup } from './KwitansiSelect';

declare const route: (name: string, params?: any, absolute?: boolean) => string;

interface KwitansiTemplateModalProps {
    show: boolean;
    onClose: () => void;
    templates: CustomKwitansiTemplate[];
    variableCatalog: KwitansiVariableGroup[];
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

export default function KwitansiTemplateModal({
    show,
    onClose,
    templates,
    variableCatalog,
    libreOfficeAvailable,
    canManage,
    onTemplatesChanged,
}: KwitansiTemplateModalProps) {
    const [activeTab, setActiveTab] = useState<'templates' | 'variables'>('templates');
    const [editingTemplate, setEditingTemplate] = useState<CustomKwitansiTemplate | null>(null);
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

    const startEdit = (tpl: CustomKwitansiTemplate) => {
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
                ? route('api.kwitansi.templates.update', editingTemplate.id)
                : route('api.kwitansi.templates.store');

            const response = await axios.post(url, formData);

            if (response.data?.success) {
                setSuccessMessage(
                    response.data.message ||
                        (editingTemplate ? 'Template berhasil diperbarui.' : 'Template berhasil diunggah.'),
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
            const response = await axios.delete(route('api.kwitansi.templates.destroy', id));
            if (response.data?.success) {
                setSuccessMessage('Template kwitansi berhasil dihapus.');
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
                                Template Kwitansi Kustom (Word)
                            </h2>
                            <p className="mt-0.5 text-[10px] font-medium text-slate-400 dark:text-slate-500">
                                Unggah desain kwitansi .docx buatan sendiri — otomatis berlaku di seluruh 4 varian BOSP.
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
                <div className="flex items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/70 px-6 py-2.5 dark:border-white/5 dark:bg-white/[0.02]">
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
                            Daftar & Upload ({templates.length})
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
                            Panduan Variabel
                        </button>
                    </div>

                    <a
                        href={route('api.kwitansi.templates.sample')}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-xl border border-brand-500/20 bg-pastel-lavender/70 px-3 py-1.5 text-[10.5px] font-extrabold text-brand-700 transition hover:bg-pastel-lavender dark:border-brand-400/25 dark:bg-brand-500/15 dark:text-brand-200 dark:hover:bg-brand-500/25"
                    >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Unduh Contoh .docx
                    </a>
                </div>

                {/* Body */}
                <div className="sikas-scroll max-h-[68vh] space-y-4 overflow-y-auto px-6 py-5">
                    {!libreOfficeAvailable && (
                        <div className="flex items-start gap-2.5 rounded-2xl border border-amber-200 bg-amber-50/90 px-4 py-3 text-[11px] text-amber-800 dark:border-amber-400/25 dark:bg-amber-500/10 dark:text-amber-200">
                            <svg className="mt-0.5 h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86l-7.1 12.3A2 2 0 004.92 19h14.16a2 2 0 001.73-2.84l-7.1-12.3a2 2 0 00-3.42 0z" />
                            </svg>
                            <div>
                                <p className="font-extrabold">LibreOffice belum terdeteksi</p>
                                <p className="mt-0.5 text-[10.5px] opacity-90">
                                    Unduh file <strong>DOCX</strong> (satuan &amp; gabungan) tetap aktif penuh, namun Preview &amp; Cetak PDF membutuhkan LibreOffice portable/sistem.
                                </p>
                            </div>
                        </div>
                    )}

                    {errorMessage && (
                        <div className="rounded-2xl border border-rose-200 bg-pastel-rose/80 px-4 py-2.5 text-[11px] font-bold text-rose-700 dark:border-rose-400/25 dark:bg-rose-500/10 dark:text-rose-300">
                            {errorMessage}
                        </div>
                    )}

                    {successMessage && (
                        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-[11px] font-bold text-emerald-700 dark:border-emerald-400/25 dark:bg-emerald-500/10 dark:text-emerald-300">
                            {successMessage}
                        </div>
                    )}

                    {activeTab === 'templates' ? (
                        <>
                            {/* Form Upload / Edit */}
                            {canManage && (
                                <form
                                    onSubmit={handleSubmit}
                                    className="space-y-3 rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 dark:border-white/10 dark:bg-white/[0.03]"
                                >
                                    <div className="flex items-center justify-between gap-2">
                                        <p className="text-[11.5px] font-extrabold text-slate-800 dark:text-white">
                                            {editingTemplate
                                                ? `Ubah Template: ${editingTemplate.nama}`
                                                : 'Unggah Template Baru (.docx)'}
                                        </p>
                                        {editingTemplate && (
                                            <button
                                                type="button"
                                                onClick={resetForm}
                                                className="text-[10.5px] font-bold text-slate-500 underline hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
                                            >
                                                Batal Edit
                                            </button>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                        <div>
                                            <InputLabel htmlFor="tpl_nama" value="Nama Template *" />
                                            <TextInput
                                                id="tpl_nama"
                                                type="text"
                                                value={nama}
                                                onChange={(e) => setNama(e.target.value)}
                                                placeholder="Contoh: Format Kwitansi Dinas 2026"
                                                className="mt-1"
                                                disabled={submitting}
                                            />
                                        </div>
                                        <div>
                                            <InputLabel htmlFor="tpl_deskripsi" value="Catatan Singkat (Opsional)" />
                                            <TextInput
                                                id="tpl_deskripsi"
                                                type="text"
                                                value={deskripsi}
                                                onChange={(e) => setDeskripsi(e.target.value)}
                                                placeholder="Contoh: Kertas F4, dengan tabel rincian"
                                                className="mt-1"
                                                disabled={submitting}
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <InputLabel
                                            htmlFor="tpl_file"
                                            value={
                                                editingTemplate
                                                    ? 'Ganti File .docx (Kosongkan jika hanya ubah nama/catatan)'
                                                    : 'File Microsoft Word (.docx) *'
                                            }
                                        />
                                        <input
                                            ref={fileInputRef}
                                            id="tpl_file"
                                            type="file"
                                            accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                                            disabled={submitting}
                                            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                                            className="mt-1 block w-full cursor-pointer rounded-xl border border-slate-200/90 bg-white px-3 py-2 text-[11.5px] font-semibold text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-900 file:px-3 file:py-1.5 file:text-[10.5px] file:font-extrabold file:text-white hover:file:bg-slate-800 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:file:bg-lime-400 dark:file:text-slate-950"
                                        />
                                        <p className="mt-1 text-[10px] text-slate-400 dark:text-slate-500">
                                            Maksimal 10 MB. Gunakan placeholder seperti <code className="font-mono text-brand-600 dark:text-lime-300">{'${no_bukti}'}</code>,{' '}
                                            <code className="font-mono text-brand-600 dark:text-lime-300">{'${uraian}'}</code>,{' '}
                                            <code className="font-mono text-brand-600 dark:text-lime-300">{'${jumlah_rupiah}'}</code>.
                                        </p>
                                    </div>

                                    <div className="flex justify-end">
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
                                <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                                    Template Tersimpan ({templates.length})
                                </p>

                                {templates.length === 0 ? (
                                    <div className="rounded-2xl border border-dashed border-slate-200 py-8 text-center dark:border-white/10">
                                        <p className="text-[12px] font-bold text-slate-600 dark:text-slate-300">
                                            Belum ada template kwitansi kustom
                                        </p>
                                        <p className="mt-1 text-[10.5px] text-slate-400 dark:text-slate-500">
                                            Unduh contoh .docx di atas untuk mulai membuat desain Anda di Microsoft Word, lalu unggah di sini.
                                        </p>
                                    </div>
                                ) : (
                                    templates.map((tpl) => {
                                        const recognizedCount = tpl.detected_variables.recognized.length;
                                        const unrecognized = tpl.detected_variables.unrecognized;
                                        const unclosed = tpl.detected_variables.unclosed;
                                        const hasWarnings = unrecognized.length > 0 || unclosed.length > 0;

                                        return (
                                            <div
                                                key={tpl.id}
                                                className="rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-sm transition dark:border-white/10 dark:bg-white/[0.03]"
                                            >
                                                <div className="flex flex-wrap items-start justify-between gap-2">
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <h3 className="text-[12.5px] font-extrabold text-slate-900 dark:text-white">
                                                                {tpl.nama}
                                                            </h3>
                                                            <StatusBadge tone="info" dot={false}>
                                                                {recognizedCount} variabel
                                                            </StatusBadge>
                                                            {tpl.has_item_table && (
                                                                <StatusBadge tone="violet" dot={false}>
                                                                    Tabel Rincian
                                                                </StatusBadge>
                                                            )}
                                                            {hasWarnings && (
                                                                <StatusBadge tone="warning" dot={false}>
                                                                    Periksa Tag
                                                                </StatusBadge>
                                                            )}
                                                        </div>
                                                        {tpl.deskripsi && (
                                                            <p className="mt-0.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                                                                {tpl.deskripsi}
                                                            </p>
                                                        )}
                                                        <p className="mt-1 text-[10px] font-medium text-slate-400 dark:text-slate-500">
                                                            {tpl.original_filename} &bull; {formatBytes(tpl.file_size)}
                                                        </p>
                                                    </div>

                                                    <div className="flex shrink-0 items-center gap-1.5">
                                                        <a
                                                            href={route('api.kwitansi.templates.download', tpl.id)}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] font-extrabold text-slate-600 transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
                                                            title="Unduh file template asli (.docx)"
                                                        >
                                                            Unduh Asli
                                                        </a>
                                                        {canManage && (
                                                            <>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => startEdit(tpl)}
                                                                    className="rounded-xl border border-brand-500/20 bg-pastel-lavender/60 px-2.5 py-1.5 text-[10px] font-extrabold text-brand-700 transition hover:bg-pastel-lavender dark:border-brand-400/20 dark:bg-brand-500/15 dark:text-brand-200"
                                                                >
                                                                    Edit
                                                                </button>
                                                                {confirmDeleteId === tpl.id ? (
                                                                    <div className="flex items-center gap-1">
                                                                        <button
                                                                            type="button"
                                                                            disabled={deletingId === tpl.id}
                                                                            onClick={() => handleDelete(tpl.id)}
                                                                            className="rounded-xl bg-rose-600 px-2.5 py-1.5 text-[10px] font-extrabold text-white transition hover:bg-rose-500 disabled:opacity-60"
                                                                        >
                                                                            {deletingId === tpl.id ? '...' : 'Ya, Hapus'}
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => setConfirmDeleteId(null)}
                                                                            className="rounded-xl border border-slate-200 px-2 py-1.5 text-[10px] font-bold text-slate-500 dark:border-white/10 dark:text-slate-400"
                                                                        >
                                                                            Batal
                                                                        </button>
                                                                    </div>
                                                                ) : (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setConfirmDeleteId(tpl.id)}
                                                                        className="rounded-xl border border-rose-200 bg-pastel-rose/70 px-2.5 py-1.5 text-[10px] font-extrabold text-rose-600 transition hover:bg-rose-100 dark:border-rose-400/20 dark:bg-rose-500/10 dark:text-rose-300"
                                                                    >
                                                                        Hapus
                                                                    </button>
                                                                )}
                                                            </>
                                                        )}
                                                    </div>
                                                </div>

                                                {hasWarnings && (
                                                    <div className="mt-2.5 rounded-xl border border-amber-200/80 bg-amber-50/70 px-3 py-2 text-[10px] text-amber-800 dark:border-amber-400/20 dark:bg-amber-500/10 dark:text-amber-200">
                                                        {unrecognized.length > 0 && (
                                                            <p>
                                                                <strong>Tag belum dikenal sistem:</strong>{' '}
                                                                {unrecognized.map((v) => `\${${v}}`).join(', ')}
                                                            </p>
                                                        )}
                                                        {unclosed.length > 0 && (
                                                            <p className="mt-0.5">
                                                                <strong>Tag lupa ditutup (otomatis dinormalisasi saat cetak):</strong>{' '}
                                                                {unclosed.map((v) => `\${${v}`).join(', ')}
                                                            </p>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </>
                    ) : (
                        /* Tab Panduan Variabel */
                        <div className="space-y-4">
                            <div className="rounded-2xl border border-brand-500/15 bg-pastel-lavender/40 p-3.5 text-[11px] leading-relaxed text-slate-700 dark:border-brand-400/20 dark:bg-brand-500/10 dark:text-slate-200">
                                <p className="font-extrabold text-brand-700 dark:text-brand-200">
                                    Cara Pakai di Microsoft Word
                                </p>
                                <ul className="mt-1 list-disc space-y-0.5 pl-4 text-[10.5px]">
                                    <li>
                                        Klik tombol <strong>Salin</strong> pada variabel di bawah lalu tempel langsung ke dokumen Word Anda.
                                    </li>
                                    <li>
                                        Untuk <strong>Tabel Rincian Barang</strong>, cukup buat <strong>1 baris contoh</strong> di tabel Word memakai variabel <code className="font-mono">{'${item_*}'}</code> — sistem otomatis menggandakan baris sesuai jumlah item BKU.
                                    </li>
                                    <li>
                                        Untuk <strong>Download All</strong>, cukup desain 1 halaman kwitansi saja di isi utama dokumen (hindari menaruh variabel transaksi di Header/Footer Word agar tidak berulang); sistem otomatis menyusun banyak kwitansi per halaman.
                                    </li>
                                </ul>
                            </div>

                            <div>
                                <TextInput
                                    type="text"
                                    value={varSearch}
                                    onChange={(e) => setVarSearch(e.target.value)}
                                    placeholder="Cari variabel (contoh: pajak, terbilang, item, kop)..."
                                />
                            </div>

                            <div className="space-y-3">
                                {filteredCatalog.map((group) => (
                                    <div
                                        key={group.group}
                                        className="rounded-2xl border border-slate-200/80 bg-white p-3.5 dark:border-white/10 dark:bg-white/[0.03]"
                                    >
                                        <div className="mb-2.5 flex items-center justify-between gap-2">
                                            <div>
                                                <h3 className="text-[12px] font-extrabold text-slate-900 dark:text-white">
                                                    {group.group}
                                                </h3>
                                                <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500">
                                                    {group.description}
                                                </p>
                                            </div>
                                            <StatusBadge
                                                tone={
                                                    group.type === 'table'
                                                        ? 'violet'
                                                        : group.type === 'image'
                                                          ? 'info'
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

                                        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                                            {group.items.map((item) => (
                                                <div
                                                    key={item.key}
                                                    className="flex items-center justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50/70 px-2.5 py-2 dark:border-white/5 dark:bg-white/[0.03]"
                                                >
                                                    <div className="min-w-0">
                                                        <code className="block truncate font-mono text-[11px] font-bold text-brand-700 dark:text-lime-300">
                                                            {item.tag}
                                                        </code>
                                                        <p className="truncate text-[10px] font-semibold text-slate-600 dark:text-slate-300">
                                                            {item.label}
                                                        </p>
                                                        <p className="truncate text-[9.5px] text-slate-400 dark:text-slate-500">
                                                            Contoh: {item.example}
                                                        </p>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleCopyTag(item.tag)}
                                                        className={`shrink-0 rounded-lg px-2 py-1 text-[10px] font-extrabold transition ${
                                                            copiedTag === item.tag
                                                                ? 'bg-emerald-500 text-white'
                                                                : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10'
                                                        }`}
                                                    >
                                                        {copiedTag === item.tag ? 'Tersalin' : 'Salin'}
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}

                                {filteredCatalog.length === 0 && (
                                    <p className="py-6 text-center text-[11.5px] font-medium text-slate-400">
                                        Variabel tidak ditemukan.
                                    </p>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4 dark:border-white/5">
                    <SecondaryButton type="button" onClick={onClose}>
                        Tutup
                    </SecondaryButton>
                </div>
            </div>
        </Modal>
    );
}
