import IconTile from '@/Components/ui/IconTile';
import {
    Check,
    CopyCheck,
    Eye,
    FileText,
    Info,
    RotateCcw,
    SlidersHorizontal,
    X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { applyItemPrintSettingsToUrl } from '../services/spjPdfAssembler';
import type {
    SpjChapterManifest,
    SpjDocumentItemManifest,
    SpjFontSize,
    SpjItemPrintSettings,
    SpjOrientation,
    SpjPaperSize,
} from '../types';

interface ItemPrintSettingsModalProps {
    isOpen: boolean;
    item: SpjDocumentItemManifest | null;
    chapter: SpjChapterManifest | null;
    selectedTemplateId: string;
    currentSettings: SpjItemPrintSettings;
    defaultSettings: SpjItemPrintSettings;
    onClose: () => void;
    onApply: (itemKey: string, settings: SpjItemPrintSettings) => void;
    onApplyToChapter: (chapter: SpjChapterManifest, settings: SpjItemPrintSettings) => void;
    onResetItem: (itemKey: string) => void;
}

const PAPER_OPTIONS: Array<{ value: SpjPaperSize; label: string; dims: string }> = [
    { value: 'A4', label: 'A4', dims: '210 × 297 mm' },
    { value: 'F4', label: 'F4 / Folio', dims: '210 × 330 mm' },
    { value: 'Legal', label: 'Legal', dims: '216 × 356 mm' },
    { value: 'Letter', label: 'Letter', dims: '216 × 279 mm' },
];

const ORIENTATION_OPTIONS: Array<{ value: SpjOrientation; label: string; desc: string }> = [
    { value: 'portrait', label: 'Portrait', desc: 'Tegak (Vertikal)' },
    { value: 'landscape', label: 'Landscape', desc: 'Mendatar (Horizontal)' },
];

const FONT_SIZE_OPTIONS: SpjFontSize[] = ['8pt', '9pt', '10pt', '11pt', '12pt'];

export default function ItemPrintSettingsModal({
    isOpen,
    item,
    chapter,
    selectedTemplateId,
    currentSettings,
    defaultSettings,
    onClose,
    onApply,
    onApplyToChapter,
    onResetItem,
}: ItemPrintSettingsModalProps) {
    const [draft, setDraft] = useState<SpjItemPrintSettings>(currentSettings);

    useEffect(() => {
        if (isOpen) {
            setDraft({
                paper_size: currentSettings.paper_size,
                orientation: currentSettings.orientation,
                font_size: currentSettings.font_size,
            });
        }
    }, [
        isOpen,
        item?.key,
        currentSettings.paper_size,
        currentSettings.orientation,
        currentSettings.font_size,
    ]);

    useEffect(() => {
        if (!isOpen) return;
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen || !item || !chapter) return null;

    const selectedTplMeta = item.available_templates.find((t) => t.id === selectedTemplateId);
    const isCustomDocx = Boolean(selectedTplMeta?.is_custom);
    const isLockedLayout =
        Boolean(item.is_external) || item.print_param_schema === 'none' || isCustomDocx;

    const firstChunk = item.chunks[0];
    const rawPreviewUrl = firstChunk
        ? firstChunk.urls_by_template[selectedTemplateId] || firstChunk.url
        : null;
    const previewUrl = rawPreviewUrl
        ? applyItemPrintSettingsToUrl(rawPreviewUrl, item.print_param_schema, draft, isCustomDocx)
        : null;

    const isDifferentFromDefault =
        draft.paper_size !== defaultSettings.paper_size ||
        draft.orientation !== defaultSettings.orientation ||
        draft.font_size !== defaultSettings.font_size;

    const handleReset = () => {
        setDraft({ ...defaultSettings });
    };

    const handleApply = () => {
        if (!isDifferentFromDefault) {
            onResetItem(item.key);
        } else {
            onApply(item.key, draft);
        }
        onClose();
    };

    const handleApplyChapter = () => {
        onApplyToChapter(chapter, draft);
        onClose();
    };

    return (
        <div
            className="fixed inset-0 z-[85] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="item-print-settings-title"
                className="flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-[#15131f]"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-start justify-between gap-3 border-b border-slate-100 bg-slate-50/90 px-6 py-4 dark:border-white/[0.08] dark:bg-white/[0.025]">
                    <div className="flex items-center gap-3">
                        <IconTile tone="ink" size="md">
                            <SlidersHorizontal />
                        </IconTile>
                        <div>
                            <div className="text-[10.5px] font-extrabold uppercase tracking-wider text-brand-600 dark:text-lime-300">
                                BAB {chapter.roman} · Pengaturan Cetak Item
                            </div>
                            <h3
                                id="item-print-settings-title"
                                className="text-sm font-extrabold text-slate-900 dark:text-white"
                            >
                                {item.label}
                            </h3>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-300 dark:hover:bg-white/[0.1] dark:hover:text-white"
                        aria-label="Tutup pengaturan cetak"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {/* Body */}
                <div className="sikas-scroll flex-1 space-y-5 overflow-y-auto p-6">
                    {isLockedLayout && (
                        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-900 dark:border-amber-400/25 dark:bg-amber-400/10 dark:text-amber-200">
                            <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-300" />
                            <div>
                                <div className="font-extrabold">
                                    {item.is_external
                                        ? 'Tata letak mengikuti berkas PDF eksternal asli'
                                        : 'Tata letak mengikuti Template Word (.docx) kustom'}
                                </div>
                                <p className="mt-0.5 text-amber-800 dark:text-amber-200/80">
                                    {item.is_external
                                        ? 'Ukuran kertas, orientasi, dan font diambil langsung dari file PDF yang diunggah.'
                                        : 'Ubah format ke Format Standar SIKAS jika ingin mengatur ukuran kertas, orientasi, dan ukuran font dari sini.'}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* 1. Ukuran Kertas */}
                    <div>
                        <label className="mb-2 block text-xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                            1. Ukuran Kertas
                        </label>
                        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                            {PAPER_OPTIONS.map((opt) => {
                                const active = draft.paper_size === opt.value;
                                return (
                                    <button
                                        key={opt.value}
                                        type="button"
                                        disabled={isLockedLayout}
                                        onClick={() => setDraft((prev) => ({ ...prev, paper_size: opt.value }))}
                                        className={`rounded-2xl border px-3 py-2.5 text-left transition disabled:cursor-not-allowed disabled:opacity-45 ${
                                            active
                                                ? 'border-brand-500 bg-brand-50/80 ring-2 ring-brand-500/20 dark:border-lime-400/70 dark:bg-lime-400/10 dark:ring-lime-400/20'
                                                : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-white/20 dark:hover:bg-white/[0.06]'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                                                {opt.label}
                                            </span>
                                            {active && (
                                                <Check className="h-3.5 w-3.5 text-brand-600 dark:text-lime-300" />
                                            )}
                                        </div>
                                        <div className="mt-0.5 text-[10.5px] text-slate-500 dark:text-slate-400">
                                            {opt.dims}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* 2. Orientasi */}
                    <div>
                        <label className="mb-2 block text-xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                            2. Orientasi Kertas
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            {ORIENTATION_OPTIONS.map((opt) => {
                                const active = draft.orientation === opt.value;
                                return (
                                    <button
                                        key={opt.value}
                                        type="button"
                                        disabled={isLockedLayout}
                                        onClick={() => setDraft((prev) => ({ ...prev, orientation: opt.value }))}
                                        className={`flex items-center gap-3 rounded-2xl border px-3.5 py-3 text-left transition disabled:cursor-not-allowed disabled:opacity-45 ${
                                            active
                                                ? 'border-brand-500 bg-brand-50/80 ring-2 ring-brand-500/20 dark:border-lime-400/70 dark:bg-lime-400/10 dark:ring-lime-400/20'
                                                : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-white/20 dark:hover:bg-white/[0.06]'
                                        }`}
                                    >
                                        <span
                                            className={`inline-flex items-center justify-center rounded-lg border-2 ${
                                                opt.value === 'portrait' ? 'h-8 w-6' : 'h-6 w-8'
                                            } ${
                                                active
                                                    ? 'border-brand-600 bg-brand-100/70 dark:border-lime-400 dark:bg-lime-400/20'
                                                    : 'border-slate-300 bg-slate-50 dark:border-white/20 dark:bg-white/[0.04]'
                                            }`}
                                        />
                                        <div className="flex-1">
                                            <div className="text-xs font-extrabold text-slate-900 dark:text-white">
                                                {opt.label}
                                            </div>
                                            <div className="text-[11px] text-slate-500 dark:text-slate-400">
                                                {opt.desc}
                                            </div>
                                        </div>
                                        {active && (
                                            <Check className="h-4 w-4 text-brand-600 dark:text-lime-300" />
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* 3. Ukuran Font */}
                    <div>
                        <div className="mb-2 flex items-center justify-between">
                            <label className="text-xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                                3. Ukuran Font
                            </label>
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                                <FileText className="h-3 w-3" />
                                Default item: {defaultSettings.font_size}
                            </span>
                        </div>
                        <div className="grid grid-cols-5 gap-2">
                            {FONT_SIZE_OPTIONS.map((size) => {
                                const active = draft.font_size === size;
                                return (
                                    <button
                                        key={size}
                                        type="button"
                                        disabled={isLockedLayout}
                                        onClick={() => setDraft((prev) => ({ ...prev, font_size: size }))}
                                        className={`flex flex-col items-center justify-center rounded-2xl border py-2.5 transition disabled:cursor-not-allowed disabled:opacity-45 ${
                                            active
                                                ? 'border-slate-900 bg-slate-900 text-lime-300 shadow-sm dark:border-lime-400 dark:bg-lime-400 dark:text-slate-950'
                                                : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-200 dark:hover:border-white/20 dark:hover:bg-white/[0.07]'
                                        }`}
                                    >
                                        <span className="text-xs font-black">{size}</span>
                                        <span
                                            className={`mt-0.5 leading-none ${
                                                active
                                                    ? 'text-white/80 dark:text-slate-900/75'
                                                    : 'text-slate-400 dark:text-slate-500'
                                            }`}
                                            style={{ fontSize: size }}
                                        >
                                            Aa
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/80 px-6 py-4 dark:border-white/[0.08] dark:bg-white/[0.025]">
                    <div className="flex flex-wrap items-center gap-1.5">
                        {!isLockedLayout && (
                            <>
                                <button
                                    type="button"
                                    disabled={!isDifferentFromDefault}
                                    onClick={handleReset}
                                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-100 disabled:opacity-40 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300 dark:hover:bg-white/[0.09]"
                                    title="Kembalikan ke default item ini"
                                >
                                    <RotateCcw className="h-3.5 w-3.5" />
                                    <span>Reset</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={handleApplyChapter}
                                    className="inline-flex items-center gap-1.5 rounded-xl border border-brand-200 bg-brand-50 px-3 py-2 text-xs font-bold text-brand-700 transition hover:bg-brand-100 dark:border-brand-400/30 dark:bg-brand-500/15 dark:text-brand-200 dark:hover:bg-brand-500/25"
                                    title={`Terapkan ${draft.paper_size} · ${draft.orientation} · ${draft.font_size} ke semua item di BAB ${chapter.roman}`}
                                >
                                    <CopyCheck className="h-3.5 w-3.5" />
                                    <span>Terapkan se-Bab</span>
                                </button>
                            </>
                        )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        {previewUrl && (
                            <a
                                href={previewUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-extrabold text-slate-700 transition hover:border-brand-300 hover:text-brand-700 dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-200 dark:hover:border-lime-400/40 dark:hover:text-lime-300"
                            >
                                <Eye className="h-3.5 w-3.5" />
                                <span>Preview PDF</span>
                            </a>
                        )}
                        {!isLockedLayout ? (
                            <button
                                type="button"
                                onClick={handleApply}
                                className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-extrabold text-lime-300 shadow-sm transition hover:bg-slate-800 dark:bg-lime-400 dark:text-slate-950 dark:hover:bg-lime-300"
                            >
                                <Check className="h-3.5 w-3.5" />
                                <span>Terapkan</span>
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={onClose}
                                className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-extrabold text-white transition hover:bg-slate-800 dark:bg-white/15 dark:hover:bg-white/25"
                            >
                                <span>Tutup</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
