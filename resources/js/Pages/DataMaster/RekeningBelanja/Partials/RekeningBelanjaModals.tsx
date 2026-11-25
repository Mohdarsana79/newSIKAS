import React, { FormEventHandler, useEffect, useMemo, useRef, useState } from 'react';
import Select from 'react-select';
import {
    AlertTriangle,
    Check,
    Download,
    FileSpreadsheet,
    Info,
    Layers,
    Pencil,
    Percent,
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

export interface RekeningBelanjaItem {
    id: number;
    tahun?: number;
    kode_rekening: string;
    rincian_objek: string;
    kategori: string;
    is_ppn: boolean;
    is_pph21: boolean;
    is_pph22: boolean;
    is_pph23: boolean;
    is_pph4: boolean;
}

export interface RekeningBelanjaFormData {
    tahun: number;
    kode_rekening: string;
    rincian_objek: string;
    kategori: string;
    is_ppn: boolean;
    is_pph21: boolean;
    is_pph22: boolean;
    is_pph23: boolean;
    is_pph4: boolean;
}

export interface RekeningBelanjaModalsProps {
    selectedYear: number;
    // Modal Tambah & Edit (disatukan melalui RekeningBelanjaFormModal)
    isAddOpen: boolean;
    onCloseAdd: () => void;
    onSubmitAdd: FormEventHandler;
    isEditOpen: boolean;
    onCloseEdit: () => void;
    onSubmitEdit: FormEventHandler;
    data: RekeningBelanjaFormData;
    setData: <K extends keyof RekeningBelanjaFormData>(key: K, value: RekeningBelanjaFormData[K]) => void;
    errors: Partial<Record<keyof RekeningBelanjaFormData, string>>;
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
    deleteTarget: RekeningBelanjaItem | null;
    deleteProcessing: boolean;
    onCloseDelete: () => void;
    onConfirmDelete: () => void;
}

interface SelectOption {
    value: string;
    label: string;
}

type GlowTone = 'lime' | 'amber' | 'sky' | 'rose';
type TaxFieldKey = 'is_ppn' | 'is_pph21' | 'is_pph22' | 'is_pph23' | 'is_pph4';

const KATEGORI_OPTIONS: SelectOption[] = [
    { value: 'Operasi', label: 'Operasi' },
    { value: 'Modal Peralatan dan Mesin', label: 'Modal Peralatan dan Mesin' },
    { value: 'Modal Jalan, Jaringan, dan Irigasi', label: 'Modal Jalan, Jaringan, dan Irigasi' },
    { value: 'Modal Aset Tetap Lainnya', label: 'Modal Aset Tetap Lainnya' },
];

const TAX_FIELDS: ReadonlyArray<{ key: TaxFieldKey; label: string; hint: string }> = [
    { key: 'is_ppn', label: 'PPN', hint: 'Pajak Pertambahan Nilai' },
    { key: 'is_pph21', label: 'PPh 21', hint: 'Honorarium / Jasa OP' },
    { key: 'is_pph22', label: 'PPh 22', hint: 'Belanja Barang' },
    { key: 'is_pph23', label: 'PPh 23', hint: 'Jasa / Sewa Badan' },
    { key: 'is_pph4', label: 'PPh 4(2)', hint: 'Pajak Final' },
];

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

function buildKategoriSelectClassNames(hasError: boolean) {
    return {
        container: () => 'relative',
        control: ({ isFocused }: { isFocused: boolean }) =>
            cn(
                'min-h-[42px] cursor-pointer rounded-2xl border bg-white px-3.5 py-1.5 text-xs font-bold shadow-sm transition dark:bg-white/5',
                hasError
                    ? 'border-rose-400 ring-4 ring-rose-100 dark:border-rose-500/50 dark:ring-rose-500/10'
                    : isFocused
                      ? 'border-lime-400 ring-4 ring-lime-200/60 dark:border-lime-400/70 dark:ring-lime-400/10'
                      : 'border-slate-200/90 hover:border-slate-300 dark:border-white/10 dark:hover:border-white/20',
            ),
        valueContainer: () => 'gap-1 py-0.5',
        placeholder: () => 'text-xs font-medium text-slate-400 dark:text-slate-500',
        singleValue: () => 'text-xs font-bold text-slate-900 dark:text-white',
        input: () =>
            'text-xs font-semibold text-slate-900 dark:text-white [&_input]:!border-0 [&_input]:!outline-none [&_input]:!ring-0 [&_input]:!shadow-none',
        indicatorsContainer: () => 'gap-1.5 pl-2',
        indicatorSeparator: () => 'my-1.5 w-px bg-slate-200 dark:bg-white/10',
        dropdownIndicator: () =>
            'cursor-pointer rounded-lg p-0.5 text-slate-400 transition hover:text-slate-700 dark:text-slate-500 dark:hover:text-white',
        menu: () =>
            'z-50 mt-1.5 overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-1.5 shadow-float dark:border-white/10 dark:bg-[#1A1728]',
        menuList: () => 'sikas-scroll max-h-52 space-y-0.5 overflow-y-auto',
        option: ({ isSelected, isFocused }: { isSelected: boolean; isFocused: boolean }) =>
            cn(
                'cursor-pointer rounded-xl px-3 py-2 text-xs font-bold transition',
                isSelected
                    ? 'bg-pastel-lavender/85 text-brand-800 dark:bg-brand-500/25 dark:text-brand-200'
                    : isFocused
                      ? 'bg-slate-100 text-slate-900 dark:bg-white/10 dark:text-white'
                      : 'text-slate-700 dark:text-slate-300',
            ),
        noOptionsMessage: () => 'px-3 py-3 text-center text-xs text-slate-400 dark:text-slate-500',
    };
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

interface RekeningBelanjaModalHeaderProps {
    tone: IconTileTone;
    icon: React.ReactNode;
    title: string;
    subtitle: string;
    badge?: React.ReactNode;
    onClose: () => void;
    disabledClose?: boolean;
}

function RekeningBelanjaModalHeader({
    tone,
    icon,
    title,
    subtitle,
    badge,
    onClose,
    disabledClose = false,
}: RekeningBelanjaModalHeaderProps) {
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

interface RekeningBelanjaFormModalProps {
    mode: 'add' | 'edit';
    selectedYear: number;
    show: boolean;
    onClose: () => void;
    onSubmit: FormEventHandler;
    data: RekeningBelanjaFormData;
    setData: <K extends keyof RekeningBelanjaFormData>(key: K, value: RekeningBelanjaFormData[K]) => void;
    errors: Partial<Record<keyof RekeningBelanjaFormData, string>>;
    processing: boolean;
}

const FORM_MODE_META = {
    add: {
        tone: 'lime' as const,
        badgeTone: 'lime' as const,
        badgeLabel: 'Tambah Data',
        title: 'Input Rekening Belanja',
        subtitle: 'Tambahkan referensi kode rekening, rincian objek, dan aturan pajak belanja.',
        submitLabel: 'Simpan Data',
        submittingLabel: 'Menyimpan...',
    },
    edit: {
        tone: 'amber' as const,
        badgeTone: 'warning' as const,
        badgeLabel: 'Edit Data',
        title: 'Edit Rekening Belanja',
        subtitle: 'Perbarui rincian rekening belanja dan pengaturan potongan pajak.',
        submitLabel: 'Update Data',
        submittingLabel: 'Memperbarui...',
    },
};

function RekeningBelanjaFormModal({
    mode,
    selectedYear,
    show,
    onClose,
    onSubmit,
    data,
    setData,
    errors,
    processing,
}: RekeningBelanjaFormModalProps) {
    const meta = FORM_MODE_META[mode];
    const [kategoriClientError, setKategoriClientError] = useState<string | undefined>(undefined);

    useEffect(() => {
        if (show) {
            setKategoriClientError(undefined);
        }
    }, [show]);

    const resolvedKategoriOptions = useMemo<SelectOption[]>(() => {
        if (data.kategori && !KATEGORI_OPTIONS.some((opt) => opt.value === data.kategori)) {
            return [{ value: data.kategori, label: data.kategori }, ...KATEGORI_OPTIONS];
        }
        return KATEGORI_OPTIONS;
    }, [data.kategori]);

    const selectedKategoriOption =
        resolvedKategoriOptions.find((opt) => opt.value === data.kategori) ?? null;

    const kategoriErrorMessage = errors.kategori || kategoriClientError;

    const handleFormSubmit: FormEventHandler = (e) => {
        if (!data.kategori) {
            e.preventDefault();
            setKategoriClientError('Kategori rekening wajib dipilih.');
            return;
        }
        setKategoriClientError(undefined);
        onSubmit(e);
    };

    const activeTaxCount = TAX_FIELDS.filter((tax) => data[tax.key]).length;

    return (
        <Modal show={show} onClose={onClose} maxWidth="lg">
            <NeoModalShell tone={meta.tone}>
                <RekeningBelanjaModalHeader
                    tone={meta.tone}
                    icon={mode === 'add' ? <Plus /> : <Pencil />}
                    title={meta.title}
                    subtitle={meta.subtitle}
                    badge={
                        <div className="flex flex-wrap items-center gap-1.5">
                            <StatusBadge tone={meta.badgeTone} dot={false}>
                                {meta.badgeLabel}
                            </StatusBadge>
                            <StatusBadge tone="violet" dot={false}>
                                Tahun {data.tahun || selectedYear}
                            </StatusBadge>
                        </div>
                    }
                    onClose={onClose}
                    disabledClose={processing}
                />

                <form onSubmit={handleFormSubmit}>
                    <div className="space-y-4 px-6 py-5">
                        {/* Bento Card 1: Identitas Rekening Belanja */}
                        <div className="rounded-[20px] border border-slate-200/80 bg-slate-50/75 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                            <div className="mb-3.5 flex items-center gap-2 text-[10.5px] font-extrabold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                                <Layers className="h-3.5 w-3.5 text-lime-600 dark:text-lime-400" />
                                Identitas Rekening Belanja
                            </div>

                            <div className="space-y-3.5">
                                <div>
                                    <InputLabel htmlFor={`${mode}-kode_rekening`} value="Kode Rekening" />
                                    <TextInput
                                        id={`${mode}-kode_rekening`}
                                        type="text"
                                        value={data.kode_rekening}
                                        onChange={(e) => setData('kode_rekening', e.target.value)}
                                        className="mt-1.5 block w-full font-mono"
                                        placeholder="Contoh: 5.1.02.01.01.0024"
                                        required
                                    />
                                    <InputError message={errors.kode_rekening} className="mt-1.5" />
                                </div>

                                <div>
                                    <InputLabel htmlFor={`${mode}-rincian_objek`} value="Rincian Objek" />
                                    <TextInput
                                        id={`${mode}-rincian_objek`}
                                        type="text"
                                        value={data.rincian_objek}
                                        onChange={(e) => setData('rincian_objek', e.target.value)}
                                        className="mt-1.5 block w-full"
                                        placeholder="Contoh: Belanja Alat/Bahan untuk Kegiatan Kantor-Alat Tulis Kantor"
                                        required
                                    />
                                    <InputError message={errors.rincian_objek} className="mt-1.5" />
                                </div>

                                <div>
                                    <InputLabel htmlFor={`${mode}-kategori`} value="Kategori" className="mb-1.5" />
                                    <Select<SelectOption, false>
                                        inputId={`${mode}-kategori`}
                                        unstyled
                                        isSearchable
                                        isClearable={false}
                                        menuPlacement="auto"
                                        placeholder="Pilih kategori rekening..."
                                        noOptionsMessage={() => 'Kategori tidak ditemukan'}
                                        options={resolvedKategoriOptions}
                                        value={selectedKategoriOption}
                                        onChange={(opt) => {
                                            setData('kategori', opt ? opt.value : '');
                                            if (opt) setKategoriClientError(undefined);
                                        }}
                                        classNames={buildKategoriSelectClassNames(Boolean(kategoriErrorMessage))}
                                    />
                                    <InputError message={kategoriErrorMessage} className="mt-1.5" />
                                </div>
                            </div>
                        </div>

                        {/* Bento Card 2: Pengaturan Pajak */}
                        <div className="rounded-[20px] border border-slate-200/80 bg-slate-50/75 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                            <div className="mb-3.5 flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 text-[10.5px] font-extrabold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                                    <Percent className="h-3.5 w-3.5 text-mint" />
                                    Pengaturan Pajak
                                </div>
                                <StatusBadge tone={activeTaxCount > 0 ? 'success' : 'neutral'} dot={false}>
                                    {activeTaxCount > 0 ? `${activeTaxCount} Pajak Aktif` : 'Bebas Pajak'}
                                </StatusBadge>
                            </div>

                            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                                {TAX_FIELDS.map((tax) => {
                                    const checked = data[tax.key];
                                    return (
                                        <label
                                            key={tax.key}
                                            className={cn(
                                                'flex cursor-pointer items-center justify-between gap-2 rounded-2xl border px-3 py-2.5 transition-all select-none',
                                                checked
                                                    ? 'border-mint/60 bg-pastel-mint/75 text-emerald-900 shadow-sm dark:border-mint/40 dark:bg-mint/15 dark:text-emerald-200'
                                                    : 'border-slate-200/90 bg-white text-slate-700 hover:border-slate-300 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300 dark:hover:border-white/20',
                                            )}
                                        >
                                            <input
                                                type="checkbox"
                                                className="sr-only"
                                                checked={checked}
                                                onChange={(e) => setData(tax.key, e.target.checked)}
                                            />
                                            <div className="min-w-0">
                                                <p className="text-[12px] font-extrabold leading-tight">
                                                    {tax.label}
                                                </p>
                                                <p className="mt-0.5 truncate text-[9.5px] font-medium opacity-75">
                                                    {tax.hint}
                                                </p>
                                            </div>
                                            <span
                                                className={cn(
                                                    'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition',
                                                    checked
                                                        ? 'border-mint bg-mint text-white'
                                                        : 'border-slate-300 bg-slate-50 text-transparent dark:border-white/20 dark:bg-white/5',
                                                )}
                                            >
                                                <Check className="h-3 w-3 stroke-[3]" />
                                            </span>
                                        </label>
                                    );
                                })}
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

interface RekeningBelanjaImportModalProps {
    selectedYear: number;
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

function RekeningBelanjaImportModal({
    selectedYear,
    show,
    onClose,
    importFile,
    onChangeImportFile,
    importProgress,
    importErrors,
    importProcessing,
    onSubmit,
    downloadTemplateUrl,
}: RekeningBelanjaImportModalProps) {
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
                <RekeningBelanjaModalHeader
                    tone="sky"
                    icon={<FileSpreadsheet />}
                    title={`Import Data Excel (Tahun ${selectedYear})`}
                    subtitle={`Unggah berkas Excel (.xlsx / .xls) untuk import rekening belanja tahun ${selectedYear}.`}
                    badge={
                        <StatusBadge tone="info" dot={false}>
                            Tahun {selectedYear}
                        </StatusBadge>
                    }
                    onClose={onClose}
                    disabledClose={importProcessing}
                />

                <form onSubmit={onSubmit}>
                    <div className="space-y-4 px-6 py-5">
                        {/* Kartu Petunjuk Bento */}
                        <div className="rounded-[20px] border border-sky/20 bg-pastel-sky/75 p-4 dark:border-sky/25 dark:bg-sky/10">
                            <div className="flex items-start gap-3">
                                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/80 text-sky shadow-sm dark:bg-sky/20">
                                    <Info className="h-4 w-4" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-[12px] font-extrabold tracking-tight text-slate-900 dark:text-white">
                                        Petunjuk Import
                                    </p>
                                    <p className="mt-1 text-[11px] font-medium leading-relaxed text-slate-600 dark:text-slate-300">
                                        Pastikan Anda menggunakan template yang sesuai agar kolom kode rekening,
                                        kategori, dan pengaturan pajak terbaca akurat.
                                    </p>
                                    <div className="mt-3">
                                        <SecondaryButton
                                            type="button"
                                            className="w-full justify-center bg-white/90 dark:bg-white/10 sm:w-auto"
                                            onClick={() => {
                                                window.open(downloadTemplateUrl, '_blank');
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
                            id="rekening-belanja-import-file"
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

interface RekeningBelanjaDeleteModalProps {
    show: boolean;
    target: RekeningBelanjaItem | null;
    processing: boolean;
    onClose: () => void;
    onConfirm: () => void;
}

function RekeningBelanjaDeleteModal({
    show,
    target,
    processing,
    onClose,
    onConfirm,
}: RekeningBelanjaDeleteModalProps) {
    return (
        <Modal show={show} onClose={onClose} maxWidth="sm">
            <NeoModalShell tone="rose">
                <RekeningBelanjaModalHeader
                    tone="rose"
                    icon={<AlertTriangle />}
                    title="Hapus Rekening Belanja?"
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
                            Apakah Anda yakin ingin menghapus data rekening belanja berikut?
                        </p>

                        {target && (
                            <div className="mt-3 space-y-1.5 rounded-2xl border border-rose-200/70 bg-white/85 p-3 dark:border-white/10 dark:bg-black/25">
                                <div className="flex flex-wrap items-center justify-between gap-1.5">
                                    <span className="inline-flex items-center rounded-lg bg-pastel-rose px-2 py-0.5 font-mono text-[11px] font-extrabold text-rose-700 dark:bg-rose-500/20 dark:text-rose-300">
                                        {target.kode_rekening}
                                    </span>
                                    <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 dark:bg-white/10 dark:text-slate-300">
                                        {target.kategori}
                                    </span>
                                </div>
                                <p className="text-[11.5px] font-bold leading-snug text-slate-900 dark:text-white">
                                    {target.rincian_objek}
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

export default function RekeningBelanjaModals({
    selectedYear,
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
}: RekeningBelanjaModalsProps) {
    return (
        <>
            <RekeningBelanjaFormModal
                mode="add"
                selectedYear={selectedYear}
                show={isAddOpen}
                onClose={onCloseAdd}
                onSubmit={onSubmitAdd}
                data={data}
                setData={setData}
                errors={errors}
                processing={processing}
            />

            <RekeningBelanjaFormModal
                mode="edit"
                selectedYear={selectedYear}
                show={isEditOpen}
                onClose={onCloseEdit}
                onSubmit={onSubmitEdit}
                data={data}
                setData={setData}
                errors={errors}
                processing={processing}
            />

            <RekeningBelanjaImportModal
                selectedYear={selectedYear}
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

            <RekeningBelanjaDeleteModal
                show={isDeleteOpen}
                target={deleteTarget}
                processing={deleteProcessing}
                onClose={onCloseDelete}
                onConfirm={onConfirmDelete}
            />
        </>
    );
}

