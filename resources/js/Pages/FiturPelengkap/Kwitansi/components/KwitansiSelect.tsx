import { useEffect, useMemo, useRef, useState } from 'react';
import Select, { ClassNamesConfig, StylesConfig } from 'react-select';
import { cn } from '@/lib/utils';

export interface KwitansiSelectOption<T extends string | number = string> {
    value: T;
    label: string;
}

export interface CustomKwitansiTemplate {
    id: number;
    nama: string;
    deskripsi: string | null;
    original_filename: string;
    file_size: number;
    has_item_table: boolean;
    detected_variables: {
        recognized: string[];
        unrecognized: string[];
        unclosed: string[];
        item_table_vars: string[];
        image_vars: string[];
    };
    creator_name: string | null;
    created_at: string | null;
    updated_at: string | null;
}

export interface KwitansiVariableItem {
    key: string;
    tag: string;
    label: string;
    example: string;
}

export interface KwitansiVariableGroup {
    group: string;
    type: 'text' | 'table' | 'image';
    description: string;
    items: KwitansiVariableItem[];
}

export type BuiltInKwitansiFormat = 1 | 2 | 3 | 4;
export type CustomKwitansiFormat = `custom:${number}`;
export type KwitansiFormat = BuiltInKwitansiFormat | CustomKwitansiFormat;

export function parseCustomTemplateId(format: KwitansiFormat): number | null {
    if (typeof format === 'string' && format.startsWith('custom:')) {
        const parsed = Number(format.slice('custom:'.length));
        return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
    }

    return null;
}

export const KWITANSI_FORMAT_OPTIONS: KwitansiSelectOption<KwitansiFormat>[] = [
    { value: 1, label: 'Format 1' },
    { value: 2, label: 'Format 2' },
    { value: 3, label: 'Format 3' },
    { value: 4, label: 'Format 4' },
];

export interface KwitansiRowItem {
    id: number;
    preview_url: string;
    preview_url_2: string;
    preview_url_3: string;
    preview_url_4: string;
}

/**
 * Mengukur faktor zoom CSS efektif (mis. `html { zoom: 0.8 }` pada layar >= 1024px)
 * agar koordinat `getBoundingClientRect()` pada menu portal tidak menyusut ganda.
 */
function getEffectiveZoom(el: HTMLElement | null): number {
    if (typeof window === 'undefined' || !el) {
        return 1;
    }

    const offsetWidth = el.offsetWidth;
    const rectWidth = el.getBoundingClientRect().width;

    if (offsetWidth > 0 && rectWidth > 0) {
        const ratio = rectWidth / offsetWidth;
        if (Number.isFinite(ratio) && Math.abs(ratio - 1) > 0.01) {
            return ratio;
        }
    }

    return 1;
}

interface KwitansiSelectProps<T extends string | number = string> {
    options: KwitansiSelectOption<T>[];
    value: T | '' | null | undefined;
    onChange: (value: T | null) => void;
    size?: 'compact' | 'md';
    usePortal?: boolean;
    isSearchable?: boolean;
    isDisabled?: boolean;
    inputId?: string;
    placeholder?: string;
    noOptionsMessage?: string;
    className?: string;
}

/**
 * Pembungkus `react-select` (unstyled) bergaya Neo-Bento (light & dark mode)
 * dengan dukungan portal berkompensasi `zoom: 0.8` untuk baris tabel Kwitansi.
 */
export function KwitansiSelect<T extends string | number = string>({
    options,
    value,
    onChange,
    size = 'md',
    usePortal = false,
    isSearchable = false,
    isDisabled = false,
    inputId,
    placeholder = 'Pilih...',
    noOptionsMessage = 'Data tidak ditemukan',
    className,
}: KwitansiSelectProps<T>) {
    const wrapperRef = useRef<HTMLDivElement>(null);
    const isCompact = size === 'compact';

    const selectedOption = useMemo(
        () => options.find((opt) => opt.value === value) ?? null,
        [options, value],
    );

    const selectClassNames = useMemo<ClassNamesConfig<KwitansiSelectOption<T>, false>>(
        () => ({
            container: () => 'relative w-full',
            control: ({ isFocused, isDisabled: disabled }) =>
                cn(
                    'rounded-xl border shadow-sm transition',
                    isCompact
                        ? 'min-h-[30px] px-2.5 py-0.5 text-[11px] font-bold'
                        : 'min-h-[41px] px-3.5 py-1.5 text-[12px] font-semibold',
                    disabled
                        ? 'cursor-not-allowed border-slate-200/90 bg-slate-100 text-slate-400 opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-slate-500'
                        : 'cursor-pointer bg-white text-slate-800 dark:bg-white/5 dark:text-white',
                    !disabled && isFocused
                        ? 'border-lime-400 ring-4 ring-lime-200/60 dark:border-lime-400/70 dark:ring-lime-400/10'
                        : !disabled &&
                              'border-slate-200/90 hover:border-slate-300 dark:border-white/10 dark:hover:border-white/20',
                ),
            valueContainer: () => 'min-w-0 flex-1 overflow-hidden py-0.5 pr-1',
            placeholder: () =>
                cn(
                    'truncate font-medium text-slate-400 dark:text-slate-500',
                    isCompact ? 'text-[11px]' : 'text-[12px]',
                ),
            singleValue: () =>
                cn(
                    'min-w-0 max-w-full truncate text-slate-800 dark:text-white',
                    isCompact ? 'text-[11px] font-bold' : 'text-[12px] font-semibold',
                ),
            input: () =>
                cn(
                    'font-semibold text-slate-800 dark:text-white [&_input]:!border-0 [&_input]:!outline-none [&_input]:!ring-0 [&_input]:!shadow-none',
                    isCompact ? 'text-[11px]' : 'text-[12px]',
                ),
            indicatorsContainer: () => 'shrink-0 gap-1 pl-1.5',
            indicatorSeparator: () => 'my-1.5 w-px bg-slate-200 dark:bg-white/10',
            dropdownIndicator: ({ isFocused }) =>
                cn(
                    'rounded-lg p-0.5 transition',
                    isCompact ? '[&_svg]:h-3.5 [&_svg]:w-3.5' : '[&_svg]:h-4 [&_svg]:w-4',
                    isFocused
                        ? 'text-brand-600 dark:text-lime-300'
                        : 'text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-white',
                ),
            menu: () =>
                'z-[80] my-1.5 overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-1.5 shadow-float dark:border-white/10 dark:bg-[#1A1728]',
            menuList: () => 'sikas-scroll max-h-56 space-y-0.5 overflow-y-auto',
            option: ({ isSelected, isFocused }) =>
                cn(
                    'cursor-pointer rounded-xl text-left transition',
                    isCompact ? 'px-2.5 py-1.5 text-[11px] font-bold' : 'px-3 py-2 text-[12px] font-semibold',
                    isSelected
                        ? 'bg-pastel-lavender/90 text-brand-800 dark:bg-brand-500/25 dark:text-brand-200'
                        : isFocused
                          ? 'bg-slate-100 text-slate-900 dark:bg-white/10 dark:text-white'
                          : 'text-slate-700 dark:text-slate-200',
                ),
            noOptionsMessage: () => 'px-3 py-3 text-center text-[11px] font-medium text-slate-400 dark:text-slate-500',
        }),
        [isCompact],
    );

    const selectStyles = useMemo<StylesConfig<KwitansiSelectOption<T>, false>>(() => {
        const styles: StylesConfig<KwitansiSelectOption<T>, false> = {
            control: (base, state) => ({
                ...base,
                minHeight: isCompact ? 30 : 41,
                cursor: state.isDisabled ? 'not-allowed' : 'pointer',
            }),
            menu: (base) => ({
                ...base,
                zIndex: 80,
            }),
        };

        if (usePortal) {
            styles.menuPortal = (base) => {
                const zoom = getEffectiveZoom(wrapperRef.current);
                const scaledWidth = typeof base.width === 'number' ? base.width / zoom : base.width;
                return {
                    ...base,
                    zIndex: 9999,
                    left: typeof base.left === 'number' ? base.left / zoom : base.left,
                    top: typeof base.top === 'number' ? base.top / zoom : base.top,
                    width: typeof scaledWidth === 'number' ? Math.max(190, scaledWidth) : scaledWidth,
                };
            };
        }

        return styles;
    }, [isCompact, usePortal]);

    return (
        <div ref={wrapperRef} className={className}>
            <Select<KwitansiSelectOption<T>, false>
                inputId={inputId}
                unstyled
                isClearable={false}
                isSearchable={isSearchable}
                isDisabled={isDisabled}
                maxMenuHeight={224}
                menuPlacement="auto"
                menuShouldScrollIntoView={false}
                menuPortalTarget={usePortal && typeof document !== 'undefined' ? document.body : undefined}
                menuPosition={usePortal ? 'fixed' : 'absolute'}
                options={options}
                value={selectedOption}
                onChange={(selected) => onChange(selected ? selected.value : null)}
                placeholder={placeholder}
                noOptionsMessage={() => noOptionsMessage}
                classNames={selectClassNames}
                styles={selectStyles}
            />
        </div>
    );
}

export function KwitansiRowActions({
    item,
    customTemplates = [],
    libreOfficeAvailable = true,
    onPrint,
    onPreview,
    onPreviewCustom,
    onDownloadDocx,
}: {
    item: KwitansiRowItem;
    customTemplates?: CustomKwitansiTemplate[];
    libreOfficeAvailable?: boolean;
    onPrint: (id: number, format: KwitansiFormat) => void;
    onPreview: (url: string) => void;
    onPreviewCustom?: (id: number, templateId: number) => void;
    onDownloadDocx?: (id: number, templateId: number) => void;
}) {
    const [format, setFormat] = useState<KwitansiFormat>(3);

    const formatOptions = useMemo<KwitansiSelectOption<KwitansiFormat>[]>(
        () => [
            ...KWITANSI_FORMAT_OPTIONS,
            ...customTemplates.map((tpl) => ({
                value: `custom:${tpl.id}` as CustomKwitansiFormat,
                label: `Kustom: ${tpl.nama}`,
            })),
        ],
        [customTemplates],
    );

    const customTemplateId = parseCustomTemplateId(format);

    // Jika template kustom yang sedang dipilih dihapus oleh pengguna, kembalikan ke Format 3
    useEffect(() => {
        if (customTemplateId !== null && !customTemplates.some((tpl) => tpl.id === customTemplateId)) {
            setFormat(3);
        }
    }, [customTemplateId, customTemplates]);

    const handlePreview = () => {
        if (customTemplateId !== null) {
            if (libreOfficeAvailable && onPreviewCustom) {
                onPreviewCustom(item.id, customTemplateId);
            }
            return;
        }

        if (typeof format !== 'number') {
            return;
        }

        const previewUrls: Record<BuiltInKwitansiFormat, string> = {
            1: item.preview_url,
            2: item.preview_url_2,
            3: item.preview_url_3,
            4: item.preview_url_4,
        };
        onPreview(previewUrls[format]);
    };

    const pdfDisabled = customTemplateId !== null && !libreOfficeAvailable;
    const viewDisabled = customTemplateId !== null && (!libreOfficeAvailable || !onPreviewCustom);

    return (
        <div className="flex items-center justify-end gap-1.5">
            <div className="w-40 text-left">
                <KwitansiSelect<KwitansiFormat>
                    options={formatOptions}
                    value={format}
                    onChange={(nextFormat) => {
                        if (nextFormat) {
                            setFormat(nextFormat);
                        }
                    }}
                    size="compact"
                    usePortal
                    isSearchable={customTemplates.length > 3}
                />
            </div>

            {customTemplateId !== null && onDownloadDocx && (
                <button
                    type="button"
                    onClick={() => onDownloadDocx(item.id, customTemplateId)}
                    className="inline-flex items-center gap-1 rounded-xl border border-brand-500/20 bg-pastel-lavender/80 px-2.5 py-1.5 text-[10px] font-extrabold text-brand-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-pastel-lavender dark:border-brand-400/25 dark:bg-brand-500/15 dark:text-brand-200 dark:hover:bg-brand-500/25"
                    title="Unduh file Word (.docx)"
                >
                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                    </svg>
                    DOCX
                </button>
            )}

            <button
                type="button"
                disabled={pdfDisabled}
                onClick={() => onPrint(item.id, format)}
                className={cn(
                    'inline-flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-[10px] font-extrabold transition',
                    pdfDisabled
                        ? 'cursor-not-allowed bg-slate-100 text-slate-400 dark:bg-white/5 dark:text-slate-600'
                        : 'bg-lime-400 text-slate-950 shadow-lime hover:-translate-y-0.5 hover:bg-lime-300',
                )}
                title={
                    pdfDisabled
                        ? 'LibreOffice belum tersedia — gunakan tombol DOCX'
                        : 'Cetak PDF'
                }
            >
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                    />
                </svg>
                PDF
            </button>

            <button
                type="button"
                disabled={viewDisabled}
                onClick={(e) => {
                    e.preventDefault();
                    handlePreview();
                }}
                className={cn(
                    'inline-flex items-center gap-1 rounded-xl border px-2.5 py-1.5 text-[10px] font-extrabold shadow-sm transition',
                    viewDisabled
                        ? 'cursor-not-allowed border-slate-100 bg-slate-50 text-slate-300 dark:border-white/5 dark:bg-white/5 dark:text-slate-600'
                        : 'border-slate-200 bg-white text-slate-600 hover:-translate-y-0.5 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10',
                )}
                title={
                    viewDisabled
                        ? 'Preview PDF membutuhkan LibreOffice'
                        : 'Preview PDF'
                }
            >
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    />
                </svg>
                View
            </button>
        </div>
    );
}

export default KwitansiSelect;
