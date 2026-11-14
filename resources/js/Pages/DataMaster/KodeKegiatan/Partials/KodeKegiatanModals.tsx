import React, { FormEventHandler, useRef, useState } from 'react';
import {
    AlertTriangle,
    Download,
    FileSpreadsheet,
    FileText,
    Hash,
    Info,
    Pencil,
    Plus,
    RefreshCw,
    Trash2,
    UploadCloud,
    X,
} from 'lucide-react';
import Modal from '@/Components/Modal';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import InputError from '@/Components/InputError';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import DangerButton from '@/Components/DangerButton';
import IconTile, { IconTileTone } from '@/Components/ui/IconTile';
import StatusBadge from '@/Components/ui/StatusBadge';
import { cn } from '@/lib/utils';

export interface KodeKegiatanItem {
    id: number;
    kode: string;
    program: string;
    sub_program: string;
    uraian: string;
}

export interface KodeKegiatanFormData {
    kode: string;
    program: string;
    sub_program: string;
    uraian: string;
}

export interface KodeKegiatanModalsProps {
    // Modal Tambah & Edit (disatukan melalui KodeKegiatanFormModal)
    isAddOpen: boolean;
    onCloseAdd: () => void;
    onSubmitAdd: FormEventHandler;
    isEditOpen: boolean;
    onCloseEdit: () => void;
    onSubmitEdit: FormEventHandler;
    data: KodeKegiatanFormData;
    setData: <K extends keyof KodeKegiatanFormData>(key: K, value: KodeKegiatanFormData[K]) => void;
    errors: Partial<Record<keyof KodeKegiatanFormData, string>>;
    processing: boolean;

    // Modal Import Excel
    isImportOpen: boolean;
    onCloseImport: () => void;
    importFile: File | null;
    onChangeImportFile: (file: File | null) => void;
    importProgress?: { percentage?: number } | null;
    importErrors: { file?: string };
    importProcessing: boolean;
    onSubmitImport: FormEventHandler;
    downloadTemplateUrl: string;

    // Modal Hapus
    isDeleteOpen: boolean;
    deleteTarget: KodeKegiatanItem | null;
    deleteProcessing: boolean;
    onCloseDelete: () => void;
    onConfirmDelete: () => void;
}

type GlowTone = 'lime' | 'amber' | 'sky' | 'rose';

const GLOW_TONES: Record<GlowTone, { primary: string; secondary: string }> = {
    lime: {
        primary: 'bg-lime-200/80 dark:bg-lime-400/15',
        secondary: 'bg-pastel-mint/65 dark:bg-mint/10',
    },
    amber: {
        primary: 'bg-pastel-amber/80 dark:bg-amber-500/15',
        secondary: 'bg-pastel-peach/60 dark:bg-peach/10',
    },
    sky: {
        primary: 'bg-pastel-sky/80 dark:bg-sky/15',
        secondary: 'bg-pastel-mint/60 dark:bg-mint/10',
    },
    rose: {
        primary: 'bg-pastel-rose/80 dark:bg-rose-500/15',
        secondary: 'bg-pastel-amber/50 dark:bg-amber-500/10',
    },
};

function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

interface NeoModalShellProps {
    tone: GlowTone;
    children: React.ReactNode;
}

function NeoModalShell({ tone, children }: NeoModalShellProps) {
    const glow = GLOW_TONES[tone];

    return (
        <div className="relative rounded-[26px] bg-white shadow-card-light dark:bg-[#15131F] dark:shadow-card-dark">
            <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[26px]">
                <div className={cn('absolute -right-12 -top-16 h-44 w-44 rounded-full blur-3xl', glow.primary)} />
                <div className={cn('absolute -bottom-16 -left-10 h-36 w-36 rounded-full blur-3xl', glow.secondary)} />
            </div>
            <div className="relative">{children}</div>
        </div>
    );
}

interface KodeKegiatanModalHeaderProps {
    tone: IconTileTone;
    icon: React.ReactNode;
    title: string;
    subtitle: string;
    badge?: React.ReactNode;
    onClose: () => void;
    disabledClose?: boolean;
}

function KodeKegiatanModalHeader({
    tone,
    icon,
    title,
    subtitle,
    badge,
    onClose,
    disabledClose = false,
}: KodeKegiatanModalHeaderProps) {
    return (
        <div className="flex items-start justify-between gap-3 rounded-t-[26px] border-b border-slate-100 px-6 py-4 dark:border-white/10">
            <div className="flex min-w-0 items-center gap-3.5">
                <IconTile tone={tone} size="md">
                    {icon}
                </IconTile>
                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-[15.5px] font-extrabold tracking-tight text-slate-900 dark:text-white">
                            {title}
                        </h2>
                        {badge}
                    </div>
                    <p className="mt-0.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                        {subtitle}
                    </p>
                </div>
            </div>
            <button
                type="button"
                onClick={onClose}
                disabled={disabledClose}
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-40 dark:text-slate-500 dark:hover:bg-white/10 dark:hover:text-white"
                aria-label="Tutup"
            >
                <X className="h-4 w-4" />
            </button>
        </div>
    );
}

interface KodeKegiatanFormModalProps {
    mode: 'add' | 'edit';
    show: boolean;
    onClose: () => void;
    onSubmit: FormEventHandler;
    data: KodeKegiatanFormData;
    setData: <K extends keyof KodeKegiatanFormData>(key: K, value: KodeKegiatanFormData[K]) => void;
    errors: Partial<Record<keyof KodeKegiatanFormData, string>>;
    processing: boolean;
}

const FORM_MODE_META = {
    add: {
        tone: 'lime' as const,
        badgeTone: 'lime' as const,
        badgeLabel: 'Tambah Data',
        title: 'Input Kode Kegiatan',
        subtitle: 'Tambahkan referensi kode kegiatan, program, dan uraian anggaran.',
        submitLabel: 'Simpan Data',
        submittingLabel: 'Menyimpan...',
        kodePlaceholder: 'Contoh: 01.01.01',
        programPlaceholder: 'Contoh: Pengembangan Standar Kompetensi Lulusan',
        subProgramPlaceholder: 'Contoh: Pelaksanaan Uji Kompetensi',
        uraianPlaceholder: 'Tuliskan rincian uraian kegiatan secara jelas...',
    },
    edit: {
        tone: 'amber' as const,
        badgeTone: 'warning' as const,
        badgeLabel: 'Edit Data',
        title: 'Edit Kode Kegiatan',
        subtitle: 'Perbarui detail kode kegiatan dan klasifikasi program.',
        submitLabel: 'Update Data',
        submittingLabel: 'Memperbarui...',
        kodePlaceholder: 'Contoh: 01.01.01',
        programPlaceholder: 'Nama program kegiatan',
        subProgramPlaceholder: 'Nama sub program kegiatan',
        uraianPlaceholder: 'Uraian lengkap kegiatan',
    },
};

function KodeKegiatanFormModal({
    mode,
    show,
    onClose,
    onSubmit,
    data,
    setData,
    errors,
    processing,
}: KodeKegiatanFormModalProps) {
    const meta = FORM_MODE_META[mode];

    return (
        <Modal show={show} onClose={onClose} maxWidth="lg">
            <NeoModalShell tone={meta.tone}>
                <KodeKegiatanModalHeader
                    tone={meta.tone}
                    icon={mode === 'add' ? <Plus /> : <Pencil />}
                    title={meta.title}
                    subtitle={meta.subtitle}
                    badge={
                        <StatusBadge tone={meta.badgeTone} dot={false}>
                            {meta.badgeLabel}
                        </StatusBadge>
                    }
                    onClose={onClose}
                    disabledClose={processing}
                />

                <form onSubmit={onSubmit}>
                    <div className="space-y-4 px-6 py-5">
                        {/* Bento Card 1: Identitas Kode & Klasifikasi Program */}
                        <div className="rounded-[20px] border border-slate-200/80 bg-slate-50/75 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                            <div className="mb-3.5 flex items-center gap-2 text-[10.5px] font-extrabold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                                <Hash className="h-3.5 w-3.5 text-lime-600 dark:text-lime-400" />
                                Identitas Kode Kegiatan
                            </div>

                            <div className="space-y-3.5">
                                <div>
                                    <InputLabel htmlFor={`${mode}-kode`} value="Kode Kegiatan" />
                                    <TextInput
                                        id={`${mode}-kode`}
                                        type="text"
                                        value={data.kode}
                                        onChange={(e) => setData('kode', e.target.value)}
                                        className="mt-1.5 block w-full font-mono"
                                        placeholder={meta.kodePlaceholder}
                                        required
                                    />
                                    <InputError message={errors.kode} className="mt-1.5" />
                                </div>

                                <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                                    <div>
                                        <InputLabel htmlFor={`${mode}-program`} value="Program" />
                                        <TextInput
                                            id={`${mode}-program`}
                                            type="text"
                                            value={data.program}
                                            onChange={(e) => setData('program', e.target.value)}
                                            className="mt-1.5 block w-full"
                                            placeholder={meta.programPlaceholder}
                                            required
                                        />
                                        <InputError message={errors.program} className="mt-1.5" />
                                    </div>

                                    <div>
                                        <InputLabel htmlFor={`${mode}-sub_program`} value="Sub Program" />
                                        <TextInput
                                            id={`${mode}-sub_program`}
                                            type="text"
                                            value={data.sub_program}
                                            onChange={(e) => setData('sub_program', e.target.value)}
                                            className="mt-1.5 block w-full"
                                            placeholder={meta.subProgramPlaceholder}
                                            required
                                        />
                                        <InputError message={errors.sub_program} className="mt-1.5" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Bento Card 2: Uraian Kegiatan */}
                        <div className="rounded-[20px] border border-slate-200/80 bg-slate-50/75 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                            <div className="mb-3 flex items-center gap-2 text-[10.5px] font-extrabold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                                <FileText className="h-3.5 w-3.5 text-brand-500 dark:text-brand-300" />
                                Uraian Kegiatan
                            </div>

                            <div>
                                <InputLabel htmlFor={`${mode}-uraian`} value="Uraian Lengkap" />
                                <textarea
                                    id={`${mode}-uraian`}
                                    value={data.uraian}
                                    onChange={(e) => setData('uraian', e.target.value)}
                                    rows={3}
                                    className={cn(
                                        'mt-1.5 block w-full rounded-2xl border bg-white px-3.5 py-2.5 text-xs font-medium text-slate-900 placeholder-slate-400 shadow-sm transition focus:outline-none focus:ring-4 dark:bg-white/5 dark:text-white dark:placeholder-slate-500',
                                        errors.uraian
                                            ? 'border-rose-400 focus:border-rose-400 focus:ring-rose-200/60 dark:border-rose-500/60 dark:focus:ring-rose-500/15'
                                            : 'border-slate-200/90 focus:border-lime-400 focus:ring-lime-200/60 dark:border-white/10 dark:focus:border-lime-400/70 dark:focus:ring-lime-400/10',
                                    )}
                                    placeholder={meta.uraianPlaceholder}
                                    required
                                />
                                <InputError message={errors.uraian} className="mt-1.5" />
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-end gap-2.5 rounded-b-[26px] border-t border-slate-100 bg-slate-50/70 px-6 py-4 dark:border-white/5 dark:bg-white/[0.02]">
                        <SecondaryButton type="button" onClick={onClose} disabled={processing}>
                            Batal
                        </SecondaryButton>
                        <PrimaryButton type="submit" disabled={processing}>
                            {processing ? meta.submittingLabel : meta.submitLabel}
                        </PrimaryButton>
                    </div>
                </form>
            </NeoModalShell>
        </Modal>
    );
}

interface KodeKegiatanImportModalProps {
    show: boolean;
    onClose: () => void;
    importFile: File | null;
    onChangeImportFile: (file: File | null) => void;
    importProgress?: { percentage?: number } | null;
    importErrors: { file?: string };
    importProcessing: boolean;
    onSubmit: FormEventHandler;
    downloadTemplateUrl: string;
}

function KodeKegiatanImportModal({
    show,
    onClose,
    importFile,
    onChangeImportFile,
    importProgress,
    importErrors,
    importProcessing,
    onSubmit,
    downloadTemplateUrl,
}: KodeKegiatanImportModalProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isDragging, setIsDragging] = useState(false);

    const handleFileSelect = (file: File | null) => {
        onChangeImportFile(file);
        if (!file && fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);
        if (importProcessing) return;
        const droppedFile = e.dataTransfer.files?.[0] ?? null;
        if (droppedFile) {
            handleFileSelect(droppedFile);
        }
    };

    const progressPercent = Math.min(100, Math.max(0, importProgress?.percentage ?? 0));
    const fileExtension = importFile?.name.split('.').pop()?.toUpperCase() || 'XLSX';

    return (
        <Modal show={show} onClose={onClose} maxWidth="lg">
            <NeoModalShell tone="sky">
                <KodeKegiatanModalHeader
                    tone="sky"
                    icon={<FileSpreadsheet />}
                    title="Import Data Excel"
                    subtitle="Unggah berkas Excel (.xlsx / .xls) untuk import data kode kegiatan massal."
                    badge={
                        <StatusBadge tone="info" dot={false}>
                            Import Excel
                        </StatusBadge>
                    }
                    onClose={onClose}
                    disabledClose={importProcessing}
                />

                <form onSubmit={onSubmit}>
                    <div className="space-y-4 px-6 py-5">
                        {/* Kartu Panduan Bento */}
                        <div className="rounded-[20px] border border-sky/20 bg-pastel-sky/75 p-4 dark:border-sky/25 dark:bg-sky/10">
                            <div className="flex items-start gap-3">
                                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/80 text-sky shadow-sm dark:bg-sky/20">
                                    <Info className="h-4 w-4" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-[12px] font-extrabold tracking-tight text-slate-900 dark:text-white">
                                        Panduan Import
                                    </p>
                                    <p className="mt-1 text-[11px] font-medium leading-relaxed text-slate-600 dark:text-slate-300">
                                        Pastikan Anda menggunakan template yang sesuai. Kolom wajib:{' '}
                                        <span className="font-bold text-slate-800 dark:text-white">
                                            Kode, Program, Sub Program, Uraian
                                        </span>
                                        .
                                    </p>
                                    <div className="mt-3">
                                        <SecondaryButton
                                            type="button"
                                            className="w-full justify-center bg-white/90 dark:bg-white/10 sm:w-auto"
                                            onClick={() => {
                                                window.location.href = downloadTemplateUrl;
                                            }}
                                        >
                                            <Download className="h-3.5 w-3.5" />
                                            Download Template Excel
                                        </SecondaryButton>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Area Dropzone / Kartu Preview File Terpilih */}
                        <input
                            ref={fileInputRef}
                            id="kode-kegiatan-import-file"
                            type="file"
                            className="sr-only"
                            accept=".xlsx,.xls"
                            onChange={(e) => handleFileSelect(e.target.files?.[0] ?? null)}
                        />

                        {importFile ? (
                            <div
                                className={cn(
                                    'rounded-[20px] border p-4 transition',
                                    importErrors.file
                                        ? 'border-rose-300 bg-pastel-rose/60 dark:border-rose-500/35 dark:bg-rose-500/10'
                                        : 'border-emerald-200/80 bg-pastel-mint/60 dark:border-mint/25 dark:bg-mint/10',
                                )}
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex min-w-0 items-center gap-3">
                                        <IconTile tone="mint" size="md">
                                            <FileSpreadsheet />
                                        </IconTile>
                                        <div className="min-w-0">
                                            <div className="flex flex-wrap items-center gap-1.5">
                                                <span className="truncate text-[12.5px] font-extrabold text-slate-900 dark:text-white">
                                                    {importFile.name}
                                                </span>
                                                <StatusBadge tone="success" dot={false}>
                                                    {fileExtension}
                                                </StatusBadge>
                                            </div>
                                            <p className="mt-0.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                                                Ukuran: {formatBytes(importFile.size)}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex shrink-0 items-center gap-1.5">
                                        <button
                                            type="button"
                                            onClick={() => fileInputRef.current?.click()}
                                            disabled={importProcessing}
                                            className="inline-flex items-center gap-1 rounded-xl border border-slate-200/80 bg-white px-2.5 py-1.5 text-[11px] font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-40 dark:border-white/10 dark:bg-white/10 dark:text-slate-200 dark:hover:bg-white/15"
                                        >
                                            <RefreshCw className="h-3 w-3" />
                                            Ganti
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleFileSelect(null)}
                                            disabled={importProcessing}
                                            className="inline-flex h-7 w-7 items-center justify-center rounded-xl border border-rose-200/80 bg-white text-rose-600 shadow-sm transition hover:bg-rose-50 disabled:opacity-40 dark:border-rose-500/20 dark:bg-white/10 dark:text-rose-400 dark:hover:bg-rose-500/15"
                                            aria-label="Hapus file terpilih"
                                            title="Hapus file terpilih"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div
                                role="button"
                                tabIndex={0}
                                onClick={() => fileInputRef.current?.click()}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        fileInputRef.current?.click();
                                    }
                                }}
                                onDragOver={(e) => {
                                    e.preventDefault();
                                    setIsDragging(true);
                                }}
                                onDragLeave={() => setIsDragging(false)}
                                onDrop={handleDrop}
                                className={cn(
                                    'cursor-pointer rounded-[20px] border-2 border-dashed p-6 text-center transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-lime-200/60 dark:focus:ring-lime-400/10',
                                    importErrors.file
                                        ? 'border-rose-400 bg-pastel-rose/60 dark:border-rose-400/40 dark:bg-rose-500/10'
                                        : isDragging
                                          ? 'border-sky bg-pastel-sky/70 dark:border-sky dark:bg-sky/10'
                                          : 'border-slate-200 bg-slate-50/75 hover:border-lime-400 hover:bg-slate-50 dark:border-white/15 dark:bg-white/[0.02] dark:hover:border-lime-400/40 dark:hover:bg-white/[0.04]',
                                )}
                            >
                                <div className="flex flex-col items-center">
                                    <IconTile tone="mint" size="lg" className="mb-3">
                                        <UploadCloud />
                                    </IconTile>
                                    <p className="text-[12.5px] font-extrabold text-slate-900 dark:text-white">
                                        Klik atau seret berkas Excel ke sini
                                    </p>
                                    <p className="mt-1 text-[11px] font-medium text-slate-400 dark:text-slate-500">
                                        Format didukung: .xlsx, .xls (Maks. 5MB)
                                    </p>
                                    <span className="mt-3 inline-flex items-center rounded-full bg-pastel-mint px-3.5 py-1.5 text-[11px] font-extrabold text-emerald-700 dark:bg-mint/15 dark:text-emerald-300">
                                        Pilih File Excel
                                    </span>
                                </div>
                            </div>
                        )}

                        {importErrors.file && (
                            <p className="text-[11.5px] font-bold text-rose-500 dark:text-rose-400">
                                {importErrors.file}
                            </p>
                        )}

                        {importProgress && (
                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 dark:text-slate-300">
                                    <span>Mengunggah berkas...</span>
                                    <span>{progressPercent}%</span>
                                </div>
                                <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
                                    <div
                                        className="h-full rounded-full bg-gradient-to-r from-sky to-mint transition-all duration-300"
                                        style={{ width: `${progressPercent}%` }}
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex flex-wrap items-center justify-end gap-2.5 rounded-b-[26px] border-t border-slate-100 bg-slate-50/70 px-6 py-4 dark:border-white/5 dark:bg-white/[0.02]">
                        <SecondaryButton type="button" onClick={onClose} disabled={importProcessing}>
                            Batal
                        </SecondaryButton>
                        <PrimaryButton
                            type="submit"
                            disabled={importProcessing || !importFile}
                            className="flex items-center gap-2"
                        >
                            {importProcessing ? (
                                <>
                                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                                    Proses Import...
                                </>
                            ) : (
                                'Mulai Import'
                            )}
                        </PrimaryButton>
                    </div>
                </form>
            </NeoModalShell>
        </Modal>
    );
}

interface KodeKegiatanDeleteModalProps {
    show: boolean;
    target: KodeKegiatanItem | null;
    processing: boolean;
    onClose: () => void;
    onConfirm: () => void;
}

function KodeKegiatanDeleteModal({
    show,
    target,
    processing,
    onClose,
    onConfirm,
}: KodeKegiatanDeleteModalProps) {
    return (
        <Modal show={show} onClose={onClose} maxWidth="sm">
            <NeoModalShell tone="rose">
                <KodeKegiatanModalHeader
                    tone="rose"
                    icon={<AlertTriangle />}
                    title="Hapus Kode Kegiatan?"
                    subtitle="Tindakan ini permanen dan tidak dapat dibatalkan."
                    badge={
                        <StatusBadge tone="danger" dot={false}>
                            Konfirmasi Hapus
                        </StatusBadge>
                    }
                    onClose={onClose}
                    disabledClose={processing}
                />

                <div className="px-6 py-5">
                    <div className="rounded-[20px] border border-rose-200/80 bg-pastel-rose/70 p-4 dark:border-rose-500/20 dark:bg-rose-500/10">
                        <p className="text-[11.5px] font-semibold leading-relaxed text-slate-700 dark:text-slate-200">
                            Anda yakin ingin menghapus data kode kegiatan berikut?
                        </p>

                        {target && (
                            <div className="mt-3 rounded-2xl border border-rose-200/70 bg-white/85 p-3 dark:border-white/10 dark:bg-black/25">
                                <span className="inline-flex items-center rounded-lg bg-pastel-rose px-2 py-0.5 font-mono text-[11px] font-extrabold text-rose-700 dark:bg-rose-500/20 dark:text-rose-300">
                                    {target.kode}
                                </span>
                                <p className="mt-1.5 text-[11.5px] font-bold leading-snug text-slate-900 dark:text-white">
                                    {target.uraian}
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex flex-wrap items-center justify-end gap-2.5 rounded-b-[26px] border-t border-slate-100 bg-slate-50/70 px-6 py-4 dark:border-white/5 dark:bg-white/[0.02]">
                    <SecondaryButton type="button" onClick={onClose} disabled={processing}>
                        Batal
                    </SecondaryButton>
                    <DangerButton type="button" onClick={onConfirm} disabled={processing}>
                        {processing ? 'Menghapus...' : 'Ya, Hapus'}
                    </DangerButton>
                </div>
            </NeoModalShell>
        </Modal>
    );
}

export default function KodeKegiatanModals({
    isAddOpen,
    onCloseAdd,
    onSubmitAdd,
    isEditOpen,
    onCloseEdit,
    onSubmitEdit,
    data,
    setData,
    errors,
    processing,
    isImportOpen,
    onCloseImport,
    importFile,
    onChangeImportFile,
    importProgress,
    importErrors,
    importProcessing,
    onSubmitImport,
    downloadTemplateUrl,
    isDeleteOpen,
    deleteTarget,
    deleteProcessing,
    onCloseDelete,
    onConfirmDelete,
}: KodeKegiatanModalsProps) {
    return (
        <>
            <KodeKegiatanFormModal
                mode="add"
                show={isAddOpen}
                onClose={onCloseAdd}
                onSubmit={onSubmitAdd}
                data={data}
                setData={setData}
                errors={errors}
                processing={processing}
            />

            <KodeKegiatanFormModal
                mode="edit"
                show={isEditOpen}
                onClose={onCloseEdit}
                onSubmit={onSubmitEdit}
                data={data}
                setData={setData}
                errors={errors}
                processing={processing}
            />

            <KodeKegiatanImportModal
                show={isImportOpen}
                onClose={onCloseImport}
                importFile={importFile}
                onChangeImportFile={onChangeImportFile}
                importProgress={importProgress}
                importErrors={importErrors}
                importProcessing={importProcessing}
                onSubmit={onSubmitImport}
                downloadTemplateUrl={downloadTemplateUrl}
            />

            <KodeKegiatanDeleteModal
                show={isDeleteOpen}
                target={deleteTarget}
                processing={deleteProcessing}
                onClose={onCloseDelete}
                onConfirm={onConfirmDelete}
            />
        </>
    );
}

