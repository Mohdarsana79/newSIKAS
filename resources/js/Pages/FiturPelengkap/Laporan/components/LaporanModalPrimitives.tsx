import React from 'react';
import Select, { ClassNamesConfig } from 'react-select';
import {
    AlertTriangle,
    ArrowRight,
    Calculator,
    Check,
    Download,
    FileText,
    Loader2,
    Maximize2,
    Printer,
    Trash2,
    X,
} from 'lucide-react';
import Modal from '@/Components/Modal';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import DangerButton from '@/Components/DangerButton';
import IconTile, { IconTileTone } from '@/Components/ui/IconTile';
import { cn } from '@/lib/utils';

export interface LaporanSelectOption {
    value: string;
    label: string;
}

export const LAPORAN_SELECT_CLASS_NAMES: ClassNamesConfig<LaporanSelectOption, false> = {
    container: () => 'relative w-full',
    control: ({ isFocused, isDisabled }) =>
        cn(
            'min-h-[41px] rounded-xl border px-3.5 py-1.5 text-[12px] font-semibold shadow-sm transition',
            isDisabled
                ? 'cursor-not-allowed border-slate-200/90 bg-slate-100 text-slate-400 dark:border-white/10 dark:bg-white/5 dark:text-slate-500'
                : 'cursor-pointer bg-white text-slate-800 dark:bg-white/5 dark:text-white',
            !isDisabled && isFocused
                ? 'border-lime-400 ring-4 ring-lime-200/60 dark:border-lime-400/70 dark:ring-lime-400/10'
                : !isDisabled && 'border-slate-200/90 hover:border-slate-300 dark:border-white/10 dark:hover:border-white/20',
        ),
    valueContainer: () => 'min-w-0 flex-1 overflow-hidden py-0.5 pr-1',
    placeholder: () => 'truncate text-[12px] font-medium text-slate-400 dark:text-slate-500',
    singleValue: () => 'min-w-0 max-w-full truncate text-[12px] font-semibold text-slate-800 dark:text-white',
    input: () =>
        'text-[12px] font-semibold text-slate-800 dark:text-white [&_input]:!border-0 [&_input]:!outline-none [&_input]:!ring-0 [&_input]:!shadow-none',
    indicatorsContainer: () => 'shrink-0 gap-1.5 pl-2',
    indicatorSeparator: () => 'my-1.5 w-px bg-slate-200 dark:bg-white/10',
    dropdownIndicator: ({ isFocused }) =>
        cn(
            'rounded-lg p-0.5 transition',
            isFocused
                ? 'text-brand-600 dark:text-lime-300'
                : 'text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-white',
        ),
    menu: () =>
        'z-[80] mt-1.5 overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-1.5 shadow-float dark:border-white/10 dark:bg-[#1A1728]',
    menuList: () => 'sikas-scroll max-h-56 space-y-0.5 overflow-y-auto',
    option: ({ isSelected, isFocused }) =>
        cn(
            'cursor-pointer rounded-xl px-3 py-2 text-left text-[12px] font-semibold transition',
            isSelected
                ? 'bg-pastel-lavender/90 text-brand-800 dark:bg-brand-500/25 dark:text-brand-200'
                : isFocused
                  ? 'bg-slate-100 text-slate-900 dark:bg-white/10 dark:text-white'
                  : 'text-slate-700 dark:text-slate-200',
        ),
    noOptionsMessage: () => 'px-3 py-3 text-center text-[11px] font-medium text-slate-400 dark:text-slate-500',
};

export const PAPER_SIZE_OPTIONS: LaporanSelectOption[] = [
    { value: 'A4', label: 'A4' },
    { value: 'Letter', label: 'Letter' },
    { value: 'Folio', label: 'Folio (F4)' },
    { value: 'Legal', label: 'Legal' },
];

export const FONT_SIZE_OPTIONS: LaporanSelectOption[] = [
    { value: '8pt', label: '8 pt' },
    { value: '9pt', label: '9 pt' },
    { value: '10pt', label: '10 pt' },
    { value: '11pt', label: '11 pt' },
    { value: '12pt', label: '12 pt' },
];

/**
 * Neo-Bento wrapper around unstyled react-select matching SIKAS dark/light modal controls.
 */
export function LaporanSelect({
    inputId,
    options,
    value,
    onChange,
    placeholder = 'Pilih...',
    isSearchable = false,
    isDisabled = false,
    noOptionsMessage = 'Data tidak ditemukan',
}: {
    inputId?: string;
    options: LaporanSelectOption[];
    value: string | number | null | undefined;
    onChange: (nextValue: string) => void;
    placeholder?: string;
    isSearchable?: boolean;
    isDisabled?: boolean;
    noOptionsMessage?: string;
}) {
    const stringValue = value !== null && value !== undefined ? String(value) : '';
    const selectedOption = options.find((opt) => opt.value === stringValue) ?? null;

    return (
        <Select<LaporanSelectOption, false>
            inputId={inputId}
            unstyled
            isClearable={false}
            isSearchable={isSearchable}
            isDisabled={isDisabled}
            menuPlacement="auto"
            menuShouldScrollIntoView={false}
            options={options}
            value={selectedOption}
            onChange={(opt) => onChange(opt ? opt.value : '')}
            placeholder={placeholder}
            noOptionsMessage={() => noOptionsMessage}
            classNames={LAPORAN_SELECT_CLASS_NAMES}
        />
    );
}

/**
 * Isolated Neo-Bento ambient glow layer placed inside overflow-visible modal containers.
 */
function ModalAmbientGlow({ tone = 'violet' }: { tone?: 'violet' | 'rose' }) {
    return (
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[26px]">
            <div
                className={cn(
                    'absolute -right-12 -top-20 h-48 w-48 rounded-full blur-3xl',
                    tone === 'rose'
                        ? 'bg-rose-500/15 dark:bg-rose-500/[0.10]'
                        : 'bg-brand-500/10 dark:bg-brand-500/[0.08]',
                )}
            />
        </div>
    );
}

function ModalCloseButton({ onClick, label = 'Tutup' }: { onClick: () => void; label?: string }) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-label={label}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-500 dark:hover:bg-white/10 dark:hover:text-white"
        >
            <X className="h-4 w-4" />
        </button>
    );
}

/**
 * Unified Neo-Bento Add/Edit form modal shell for Laporan tabs.
 */
export function LaporanFormModal({
    show,
    onClose,
    maxWidth = '7xl',
    title,
    subtitle,
    submitLabel = 'Simpan',
    savingLabel = 'Menyimpan...',
    isSaving = false,
    submitDisabled = false,
    tall = false,
    onSubmit,
    children,
}: {
    show: boolean;
    onClose: () => void;
    maxWidth?: 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | '7xl';
    title: string;
    subtitle: string;
    submitLabel?: string;
    savingLabel?: string;
    isSaving?: boolean;
    submitDisabled?: boolean;
    tall?: boolean;
    onSubmit: (e: React.FormEvent) => void;
    children: React.ReactNode;
}) {
    return (
        <Modal show={show} onClose={onClose} maxWidth={maxWidth}>
            <div
                className={cn(
                    'relative flex flex-col overflow-visible rounded-[26px] bg-white dark:bg-[#15131F]',
                    tall ? 'h-[86vh]' : 'max-h-[90vh]',
                )}
            >
                <ModalAmbientGlow tone="violet" />

                <div className="relative flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 px-6 py-4 dark:border-white/5">
                    <div className="flex min-w-0 items-center gap-3">
                        <IconTile tone="violet" size="lg">
                            <FileText className="h-4 w-4" />
                        </IconTile>
                        <div className="min-w-0">
                            <h2 className="truncate text-[15px] font-extrabold tracking-tight text-slate-900 dark:text-white">
                                {title}
                            </h2>
                            <p className="mt-0.5 truncate text-[10.5px] font-medium text-slate-400 dark:text-slate-500">
                                {subtitle}
                            </p>
                        </div>
                    </div>
                    <ModalCloseButton onClick={onClose} />
                </div>

                <form onSubmit={onSubmit} className="relative flex min-h-0 flex-1 flex-col overflow-visible">
                    <div
                        className={cn(
                            'sikas-scroll flex-1 space-y-5 px-6 py-5',
                            tall ? 'overflow-y-auto' : 'overflow-visible',
                        )}
                    >
                        {children}
                    </div>

                    <div className="relative flex shrink-0 items-center justify-end gap-2 rounded-b-[26px] border-t border-slate-100 bg-white/90 px-6 py-4 dark:border-white/5 dark:bg-[#15131F]/95">
                        <SecondaryButton onClick={onClose} disabled={isSaving}>
                            Batal
                        </SecondaryButton>
                        <PrimaryButton type="submit" disabled={isSaving || submitDisabled}>
                            {isSaving ? (
                                <span className="inline-flex items-center gap-2">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    {savingLabel}
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-2">
                                    <Check className="h-4 w-4" />
                                    {submitLabel}
                                </span>
                            )}
                        </PrimaryButton>
                    </div>
                </form>
            </div>
        </Modal>
    );
}

/**
 * Shared Neo-Bento action button for auto-calculating report values from BKU/RKAS.
 */
export function LaporanCalculateButton({
    onClick,
    isCalculating,
    label,
    className,
}: {
    onClick: () => void;
    isCalculating: boolean;
    label: string;
    className?: string;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={isCalculating}
            className={cn(
                'inline-flex h-[41px] items-center justify-center gap-2 rounded-xl border border-brand-500/20 bg-pastel-lavender px-4 text-[11px] font-extrabold text-brand-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-brand-200/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 dark:border-brand-400/25 dark:bg-brand-500/15 dark:text-brand-200 dark:hover:bg-brand-500/25',
                className,
            )}
        >
            {isCalculating ? (
                <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Menghitung...</span>
                </>
            ) : (
                <>
                    <Calculator className="h-4 w-4" />
                    <span>{label}</span>
                </>
            )}
        </button>
    );
}

type SectionTone = 'neutral' | 'mint' | 'sky' | 'rose' | 'violet' | 'amber';

const SECTION_TONE_CLASSES: Record<SectionTone, string> = {
    neutral: 'border-slate-200/70 bg-slate-50/75 dark:border-white/10 dark:bg-white/[0.03]',
    mint: 'border-mint/20 bg-pastel-mint/45 dark:border-mint/20 dark:bg-mint/[0.06]',
    sky: 'border-sky/20 bg-pastel-sky/45 dark:border-sky/20 dark:bg-sky/[0.06]',
    rose: 'border-rose-500/15 bg-pastel-rose/40 dark:border-rose-400/20 dark:bg-rose-500/[0.06]',
    violet: 'border-brand-500/15 bg-pastel-lavender/45 dark:border-brand-400/20 dark:bg-brand-500/[0.07]',
    amber: 'border-amber-500/15 bg-pastel-amber/50 dark:border-amber-400/20 dark:bg-amber-400/[0.06]',
};

const SECTION_TITLE_CLASSES: Record<SectionTone, string> = {
    neutral: 'text-slate-500 dark:text-slate-400',
    mint: 'text-emerald-700 dark:text-mint',
    sky: 'text-sky-700 dark:text-sky',
    rose: 'text-rose-600 dark:text-rose-300',
    violet: 'text-brand-700 dark:text-brand-300',
    amber: 'text-amber-700 dark:text-amber-300',
};

/**
 * Bento section wrapper with optional icon tile and header action slot.
 */
export function LaporanSectionCard({
    title,
    tone = 'neutral',
    icon,
    iconTone,
    headerAction,
    children,
    className,
}: {
    title: string;
    tone?: SectionTone;
    icon?: React.ReactNode;
    iconTone?: IconTileTone;
    headerAction?: React.ReactNode;
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <div className={cn('rounded-2xl border p-4 sm:p-5', SECTION_TONE_CLASSES[tone], className)}>
            <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                    {icon && (
                        <IconTile tone={iconTone ?? (tone === 'neutral' ? 'violet' : tone)} size="sm">
                            {icon}
                        </IconTile>
                    )}
                    <h3
                        className={cn(
                            'text-[10px] font-extrabold uppercase tracking-[0.14em]',
                            SECTION_TITLE_CLASSES[tone],
                        )}
                    >
                        {title}
                    </h3>
                </div>
                {headerAction}
            </div>
            {children}
        </div>
    );
}

const METRIC_TONE_CLASSES: Record<SectionTone, string> = {
    neutral: 'border-slate-200/80 bg-white dark:border-white/10 dark:bg-white/[0.04]',
    violet: 'border-brand-500/20 bg-pastel-lavender/60 dark:border-brand-400/25 dark:bg-brand-500/10',
    mint: 'border-mint/25 bg-pastel-mint/60 dark:border-mint/25 dark:bg-mint/10',
    sky: 'border-sky/25 bg-pastel-sky/60 dark:border-sky/25 dark:bg-sky/10',
    amber: 'border-amber-500/20 bg-pastel-amber/60 dark:border-amber-400/20 dark:bg-amber-400/10',
    rose: 'border-rose-500/20 bg-pastel-rose/60 dark:border-rose-400/25 dark:bg-rose-500/10',
};

const METRIC_VALUE_CLASSES: Record<SectionTone, string> = {
    neutral: 'text-slate-900 dark:text-white',
    violet: 'text-brand-700 dark:text-brand-300',
    mint: 'text-emerald-700 dark:text-mint',
    sky: 'text-sky-700 dark:text-sky',
    amber: 'text-amber-700 dark:text-amber-300',
    rose: 'text-rose-600 dark:text-rose-400',
};

/**
 * Compact Neo-Bento KPI display card for read-only calculated monetary values.
 */
export function LaporanMetricCard({
    label,
    value,
    tone = 'neutral',
    sublabel,
    className,
}: {
    label: string;
    value: string;
    tone?: SectionTone;
    sublabel?: string;
    className?: string;
}) {
    return (
        <div className={cn('rounded-2xl border p-3.5 shadow-sm transition', METRIC_TONE_CLASSES[tone], className)}>
            <span className="block text-[9.5px] font-extrabold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                {label}
            </span>
            <div className={cn('text-sikas-num mt-1.5 text-[16px] font-extrabold leading-tight', METRIC_VALUE_CLASSES[tone])}>
                {value}
            </div>
            {sublabel && (
                <span className="mt-1 block text-[10px] font-medium text-slate-400 dark:text-slate-500">
                    {sublabel}
                </span>
            )}
        </div>
    );
}

/**
 * Unified Neo-Bento Delete confirmation modal.
 */
export function LaporanDeleteModal({
    show,
    onClose,
    onConfirm,
    title,
    message,
}: {
    show: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
}) {
    return (
        <Modal show={show} onClose={onClose} maxWidth="sm">
            <div className="relative overflow-hidden rounded-[26px] bg-white dark:bg-[#15131F]">
                <ModalAmbientGlow tone="rose" />

                <div className="relative flex items-start justify-between gap-3 border-b border-slate-100 px-6 py-4 dark:border-white/5">
                    <div className="flex items-center gap-3">
                        <IconTile tone="rose" size="lg">
                            <Trash2 className="h-5 w-5" />
                        </IconTile>
                        <div className="min-w-0">
                            <h2 className="text-[14px] font-extrabold tracking-tight text-slate-900 dark:text-white">
                                {title}
                            </h2>
                            <p className="mt-0.5 text-[10px] font-medium text-slate-400 dark:text-slate-500">
                                Konfirmasi penghapusan data
                            </p>
                        </div>
                    </div>
                    <ModalCloseButton onClick={onClose} />
                </div>

                <div className="relative px-6 py-5">
                    <p className="text-[12px] font-medium leading-relaxed text-slate-600 dark:text-slate-300">
                        {message}
                    </p>
                </div>

                <div className="relative flex justify-end gap-2 border-t border-slate-100 px-6 py-4 dark:border-white/5">
                    <SecondaryButton onClick={onClose}>Batal</SecondaryButton>
                    <DangerButton onClick={onConfirm}>Hapus</DangerButton>
                </div>
            </div>
        </Modal>
    );
}

/**
 * Unified Neo-Bento Print Settings modal using LaporanSelect (never clips dropdowns).
 */
export function LaporanPrintSettingsModal({
    show,
    onClose,
    paperSize,
    fontSize,
    onPaperSizeChange,
    onFontSizeChange,
    onPrint,
}: {
    show: boolean;
    onClose: () => void;
    paperSize: string;
    fontSize: string;
    onPaperSizeChange: (paperSize: string) => void;
    onFontSizeChange: (fontSize: string) => void;
    onPrint: () => void;
}) {
    return (
        <Modal show={show} onClose={onClose} maxWidth="sm">
            <div className="relative overflow-visible rounded-[26px] bg-white dark:bg-[#15131F]">
                <ModalAmbientGlow tone="violet" />

                <div className="relative flex items-center justify-between gap-3 border-b border-slate-100 px-6 py-4 dark:border-white/5">
                    <div className="flex min-w-0 items-center gap-3">
                        <IconTile tone="ink" size="md">
                            <Printer className="h-4 w-4" />
                        </IconTile>
                        <div className="min-w-0">
                            <h2 className="truncate text-[14px] font-extrabold tracking-tight text-slate-900 dark:text-white">
                                Pengaturan Cetak
                            </h2>
                            <p className="truncate text-[10px] font-medium text-slate-400 dark:text-slate-500">
                                Atur ukuran kertas &amp; font PDF.
                            </p>
                        </div>
                    </div>
                    <ModalCloseButton onClick={onClose} />
                </div>

                <div className="relative space-y-4 px-6 py-5">
                    <div>
                        <InputLabel htmlFor="laporan_paper_size" value="Ukuran Kertas" />
                        <LaporanSelect
                            inputId="laporan_paper_size"
                            options={PAPER_SIZE_OPTIONS}
                            value={paperSize}
                            onChange={onPaperSizeChange}
                            isSearchable={false}
                        />
                    </div>
                    <div>
                        <InputLabel htmlFor="laporan_font_size" value="Ukuran Font" />
                        <LaporanSelect
                            inputId="laporan_font_size"
                            options={FONT_SIZE_OPTIONS}
                            value={fontSize}
                            onChange={onFontSizeChange}
                            isSearchable={false}
                        />
                    </div>
                </div>

                <div className="relative flex justify-end gap-2 rounded-b-[26px] border-t border-slate-100 px-6 py-4 dark:border-white/5">
                    <SecondaryButton onClick={onClose}>Batal</SecondaryButton>
                    <PrimaryButton onClick={onPrint}>
                        <Printer className="h-4 w-4" />
                        Cetak PDF
                    </PrimaryButton>
                </div>
            </div>
        </Modal>
    );
}

/**
 * Unified Neo-Bento duplicate / validation warning modal.
 */
export function LaporanValidationModal({
    show,
    onClose,
    title = 'Data Duplikat Terdeteksi',
    message,
    hint,
}: {
    show: boolean;
    onClose: () => void;
    title?: string;
    message: string;
    hint: string;
}) {
    return (
        <Modal show={show} onClose={onClose} maxWidth="md">
            <div className="relative overflow-hidden rounded-[26px] bg-white dark:bg-[#15131F]">
                <ModalAmbientGlow tone="rose" />

                <div className="relative flex items-start justify-between gap-3 border-b border-slate-100 px-6 py-4 dark:border-white/5">
                    <div className="flex items-center gap-3">
                        <IconTile tone="rose" size="lg">
                            <AlertTriangle className="h-5 w-5" />
                        </IconTile>
                        <div className="min-w-0">
                            <h2 className="text-[14px] font-extrabold tracking-tight text-slate-900 dark:text-white">
                                {title}
                            </h2>
                            <p className="mt-0.5 text-[10px] font-medium text-slate-400 dark:text-slate-500">
                                Periksa kembali data yang akan disimpan.
                            </p>
                        </div>
                    </div>
                    <ModalCloseButton onClick={onClose} />
                </div>

                <div className="relative space-y-4 px-6 py-5">
                    <div className="rounded-2xl border-l-4 border-rose-500 bg-pastel-rose/80 p-4 dark:bg-rose-500/10">
                        <p className="text-[12px] font-bold leading-relaxed text-rose-700 dark:text-rose-300">
                            {message}
                        </p>
                    </div>
                    <p className="text-[11.5px] font-medium leading-relaxed text-slate-500 dark:text-slate-400">
                        {hint}
                    </p>
                </div>

                <div className="relative border-t border-slate-100 px-6 py-4 dark:border-white/5">
                    <button
                        type="button"
                        onClick={onClose}
                        className="group flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-[11.5px] font-extrabold text-white shadow-pill transition hover:-translate-y-0.5 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
                    >
                        <span>Saya Mengerti</span>
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </button>
                </div>
            </div>
        </Modal>
    );
}

/**
 * Unified Neo-Bento PDF preview modal across Laporan tabs.
 */
export function LaporanPdfPreviewModal({
    show,
    onClose,
    previewId,
    title,
    pdfUrl,
    onOpenPrintSettings,
    customDownloadUrl = null,
    customDocxUrl = null,
}: {
    show: boolean;
    onClose: () => void;
    previewId: string;
    title: string;
    pdfUrl: string;
    onOpenPrintSettings: () => void;
    customDownloadUrl?: string | null;
    customDocxUrl?: string | null;
}) {
    const toggleFullscreen = () => {
        const elem = document.getElementById(previewId);
        if (!elem) return;
        if (!document.fullscreenElement) {
            elem.requestFullscreen().catch((err) => console.error(err));
        } else {
            document.exitFullscreen();
        }
    };

    return (
        <Modal show={show} onClose={onClose} maxWidth="5xl">
            <div id={previewId} className="relative flex h-[86vh] flex-col overflow-hidden rounded-[26px] bg-slate-950">
                <div className="z-10 flex shrink-0 items-center justify-between gap-3 border-b border-white/10 bg-gradient-to-br from-[#2B2940] via-[#232135] to-[#191826] px-5 py-3.5">
                    <div className="flex min-w-0 items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-lime-400/15 text-lime-300 ring-1 ring-lime-400/30">
                            <FileText className="h-4 w-4" />
                        </span>
                        <h3 className="truncate text-[13.5px] font-extrabold tracking-tight text-white">
                            {title}
                        </h3>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <button
                            type="button"
                            onClick={toggleFullscreen}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-xl text-white/60 transition hover:bg-white/10 hover:text-white"
                            title="Fullscreen"
                            aria-label="Fullscreen"
                        >
                            <Maximize2 className="h-4 w-4" />
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-xl text-white/60 transition hover:bg-white/10 hover:text-white"
                            title="Tutup"
                            aria-label="Tutup"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                <div className="relative flex flex-1 items-center justify-center overflow-hidden bg-slate-900 p-4">
                    <div className="h-full w-full overflow-hidden rounded-2xl border border-white/10 bg-white shadow-2xl">
                        <iframe src={pdfUrl} className="h-full w-full border-0 bg-white" title={title} />
                    </div>
                </div>

                <div className="flex shrink-0 items-center justify-end gap-2 border-t border-white/10 bg-[#191826] px-5 py-3.5">
                    <button
                        type="button"
                        onClick={onClose}
                        className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-[11.5px] font-bold text-slate-200 transition hover:-translate-y-0.5 hover:bg-white/10"
                    >
                        Tutup
                    </button>
                    {customDocxUrl && (
                        <button
                            type="button"
                            onClick={() => window.open(customDocxUrl, '_blank', 'noopener,noreferrer')}
                            className="inline-flex items-center gap-2 rounded-2xl border border-brand-400/30 bg-brand-500/15 px-4 py-2.5 text-[11.5px] font-extrabold text-brand-200 transition hover:-translate-y-0.5 hover:bg-brand-500/25"
                        >
                            <Download className="h-4 w-4" />
                            Unduh Word (.docx)
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={() => {
                            if (customDownloadUrl) {
                                window.open(customDownloadUrl, '_blank', 'noopener,noreferrer');
                                return;
                            }
                            onOpenPrintSettings();
                        }}
                        className="inline-flex items-center gap-2 rounded-2xl bg-lime-400 px-5 py-2.5 text-[11.5px] font-extrabold text-slate-950 shadow-lime transition hover:-translate-y-0.5 hover:bg-lime-300"
                    >
                        <Download className="h-4 w-4" />
                        Download / Cetak PDF
                    </button>
                </div>
            </div>
        </Modal>
    );
}
