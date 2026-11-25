import IconTile from '@/Components/ui/IconTile';
import StatusBadge from '@/Components/ui/StatusBadge';
import Surface from '@/Components/ui/Surface';
import {
    ArrowDown,
    ArrowUp,
    ChevronDown,
    ChevronsDownUp,
    ChevronsUpDown,
    ExternalLink,
    Eye,
    FileText,
    Paperclip,
    Search,
    Settings,
    X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { applyItemPrintSettingsToUrl } from '../services/spjPdfAssembler';
import type {
    SpjBundleConfig,
    SpjChapterManifest,
    SpjDocumentItemManifest,
    SpjItemPrintSettings,
    SpjSp2bMode,
} from '../types';

interface BundleChecklistProps {
    orderedChapters: SpjChapterManifest[];
    bundleConfig: SpjBundleConfig;
    libreOfficeAvailable: boolean;
    isFetchingManifest?: boolean;
    onToggleItem: (itemKey: string, enabled: boolean) => void;
    onToggleChapterAll: (chapter: SpjChapterManifest, enabled: boolean) => void;
    onSelectTemplate: (itemKey: string, templateId: string) => void;
    onChangeSp2bMode: (mode: SpjSp2bMode) => void;
    onOpenItemSettings: (chapter: SpjChapterManifest, item: SpjDocumentItemManifest) => void;
    onMoveChapter: (chapterKey: string, direction: 'up' | 'down') => void;
    onMoveItem: (chapterKey: string, itemKey: string, direction: 'up' | 'down') => void;
}

type ChecklistStatusFilter = 'all' | 'ready' | 'selected' | 'empty';

function buildInitialExpanded(chapters: SpjChapterManifest[]): Record<string, boolean> {
    const expanded: Record<string, boolean> = {};
    let opened = 0;
    for (const ch of chapters) {
        const hasReady = ch.items.some((it) => it.chunks.length > 0);
        if (hasReady && opened < 2) {
            expanded[ch.key] = true;
            opened++;
        } else {
            expanded[ch.key] = false;
        }
    }
    if (opened === 0 && chapters.length > 0) {
        expanded[chapters[0].key] = true;
    }
    return expanded;
}

export default function BundleChecklist({
    orderedChapters,
    bundleConfig,
    libreOfficeAvailable,
    isFetchingManifest = false,
    onToggleItem,
    onToggleChapterAll,
    onSelectTemplate,
    onChangeSp2bMode,
    onOpenItemSettings,
    onMoveChapter,
    onMoveItem,
}: BundleChecklistProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<ChecklistStatusFilter>('all');
    const [expandedChapters, setExpandedChapters] = useState<Record<string, boolean>>(() =>
        buildInitialExpanded(orderedChapters),
    );

    // Ensure any newly introduced chapter keys have a defined accordion state
    useEffect(() => {
        setExpandedChapters((prev) => {
            let changed = false;
            const next = { ...prev };
            for (const ch of orderedChapters) {
                if (!(ch.key in next)) {
                    next[ch.key] = ch.items.some((it) => it.chunks.length > 0);
                    changed = true;
                }
            }
            return changed ? next : prev;
        });
    }, [orderedChapters]);

    const getOrderedItems = (chapter: SpjChapterManifest): SpjDocumentItemManifest[] => {
        const order = bundleConfig.item_order_by_chapter[chapter.key];
        if (!order || order.length === 0) return chapter.items;
        const map = new Map(chapter.items.map((it) => [it.key, it]));
        const result: SpjDocumentItemManifest[] = [];
        for (const k of order) {
            const found = map.get(k);
            if (found) {
                result.push(found);
                map.delete(k);
            }
        }
        for (const rest of map.values()) {
            result.push(rest);
        }
        return result;
    };

    const getEffectiveSettings = (item: SpjDocumentItemManifest): SpjItemPrintSettings => {
        const override = bundleConfig.item_print_settings[item.key];
        return {
            paper_size: override?.paper_size ?? item.default_paper_size,
            orientation: override?.orientation ?? item.default_orientation,
            font_size: override?.font_size ?? item.default_font_size,
        };
    };

    const isCustomPrintSetting = (item: SpjDocumentItemManifest): boolean => {
        const override = bundleConfig.item_print_settings[item.key];
        if (!override) return false;
        return (
            override.paper_size !== item.default_paper_size ||
            override.orientation !== item.default_orientation ||
            override.font_size !== item.default_font_size
        );
    };

    const resolvePreviewUrl = (
        item: SpjDocumentItemManifest,
        isCustomDocx: boolean,
    ): string | null => {
        const firstChunk = item.chunks[0];
        if (!firstChunk) return null;
        const selectedTpl = bundleConfig.selected_templates[item.key] || item.default_template;
        const rawUrl = firstChunk.urls_by_template[selectedTpl] || firstChunk.url;
        const override = bundleConfig.item_print_settings[item.key];
        if (!override) {
            return rawUrl;
        }
        return applyItemPrintSettingsToUrl(
            rawUrl,
            item.print_param_schema,
            override,
            isCustomDocx,
        );
    };

    const filterCounts = useMemo(() => {
        let all = 0;
        let ready = 0;
        let selected = 0;
        let empty = 0;
        for (const ch of orderedChapters) {
            for (const it of ch.items) {
                all++;
                if (it.chunks.length > 0) ready++;
                if (bundleConfig.enabled_items[it.key] && it.chunks.length > 0) selected++;
                if (it.status === 'empty') empty++;
            }
        }
        return { all, ready, selected, empty };
    }, [orderedChapters, bundleConfig.enabled_items]);

    const normalizedQuery = searchQuery.trim().toLowerCase();
    const isFiltering = normalizedQuery.length > 0 || statusFilter !== 'all';

    const allExpanded =
        orderedChapters.length > 0 && orderedChapters.every((ch) => Boolean(expandedChapters[ch.key]));

    const handleToggleAllChapters = () => {
        const target = !allExpanded;
        const next: Record<string, boolean> = {};
        for (const ch of orderedChapters) {
            next[ch.key] = target;
        }
        setExpandedChapters(next);
    };

    const toggleChapterOpen = (chapterKey: string) => {
        setExpandedChapters((prev) => ({ ...prev, [chapterKey]: !prev[chapterKey] }));
    };

    const matchesFilter = (chapter: SpjChapterManifest, item: SpjDocumentItemManifest): boolean => {
        if (statusFilter === 'ready' && item.chunks.length === 0) return false;
        if (statusFilter === 'selected' && !(bundleConfig.enabled_items[item.key] && item.chunks.length > 0)) {
            return false;
        }
        if (statusFilter === 'empty' && item.status !== 'empty') return false;

        if (normalizedQuery) {
            const haystack = `${chapter.title} ${chapter.roman} ${item.label} ${item.summary_text}`.toLowerCase();
            if (!haystack.includes(normalizedQuery)) return false;
        }
        return true;
    };

    const visibleChapters = orderedChapters
        .map((chapter, chapterIdx) => {
            const allItems = getOrderedItems(chapter);
            const filteredItems = isFiltering
                ? allItems.filter((it) => matchesFilter(chapter, it))
                : allItems;
            return { chapter, chapterIdx, allItems, filteredItems };
        })
        .filter((entry) => !isFiltering || entry.filteredItems.length > 0);

    const FILTER_PILLS: Array<{ key: ChecklistStatusFilter; label: string; count: number }> = [
        { key: 'all', label: 'Semua', count: filterCounts.all },
        { key: 'ready', label: 'Siap Cetak', count: filterCounts.ready },
        { key: 'selected', label: 'Terpilih', count: filterCounts.selected },
        { key: 'empty', label: 'Kosong', count: filterCounts.empty },
    ];

    return (
        <div className="space-y-3.5">
            {/* Quick Search, Filter & Accordion Toolbar */}
            <Surface padding="sm">
                <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="relative flex-1 sm:max-w-xs">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Cari dokumen SPJ (mis. BKU, Kwitansi, RKAS)..."
                            className="w-full rounded-xl border border-slate-200/90 bg-slate-50/90 py-2 pl-9 pr-8 text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:border-brand-500 focus:ring-brand-500/30 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-lime-400/60 dark:focus:ring-lime-400/20"
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={() => setSearchQuery('')}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-0.5 text-slate-400 transition hover:bg-slate-200/70 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-white"
                                aria-label="Bersihkan pencarian"
                            >
                                <X className="h-3.5 w-3.5" />
                            </button>
                        )}
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 sm:justify-end">
                        <div className="flex flex-wrap items-center gap-1 rounded-xl bg-slate-100/90 p-1 dark:bg-white/[0.04]">
                            {FILTER_PILLS.map((pill) => {
                                const active = statusFilter === pill.key;
                                return (
                                    <button
                                        key={pill.key}
                                        type="button"
                                        onClick={() => setStatusFilter(pill.key)}
                                        className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-bold transition ${
                                            active
                                                ? 'bg-slate-900 text-lime-300 shadow-sm dark:bg-lime-400 dark:text-slate-950'
                                                : 'text-slate-600 hover:bg-white/80 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/[0.06] dark:hover:text-white'
                                        }`}
                                    >
                                        <span>{pill.label}</span>
                                        <span
                                            className={`rounded-full px-1.5 py-0.5 text-[10px] font-extrabold leading-none ${
                                                active
                                                    ? 'bg-white/15 text-lime-200 dark:bg-slate-950/15 dark:text-slate-950'
                                                    : 'bg-slate-200/80 text-slate-500 dark:bg-white/10 dark:text-slate-300'
                                            }`}
                                        >
                                            {pill.count}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>

                        {!isFiltering && (
                            <button
                                type="button"
                                onClick={handleToggleAllChapters}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200/90 bg-white px-2.5 py-1.5 text-[11px] font-bold text-slate-700 transition hover:bg-slate-50 hover:text-slate-900 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200 dark:hover:bg-white/[0.08] dark:hover:text-white"
                                title={allExpanded ? 'Lipat semua bab' : 'Buka semua bab'}
                            >
                                {allExpanded ? (
                                    <>
                                        <ChevronsDownUp className="h-3.5 w-3.5 text-brand-600 dark:text-lime-300" />
                                        <span>Lipat Semua</span>
                                    </>
                                ) : (
                                    <>
                                        <ChevronsUpDown className="h-3.5 w-3.5 text-brand-600 dark:text-lime-300" />
                                        <span>Buka Semua</span>
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                </div>
            </Surface>

            {/* Empty Search/Filter Result */}
            {visibleChapters.length === 0 ? (
                <Surface padding="lg" className="text-center">
                    <div className="mx-auto flex max-w-sm flex-col items-center gap-2 py-4">
                        <IconTile tone="slate" size="md">
                            <Search />
                        </IconTile>
                        <div className="text-sm font-extrabold text-slate-800 dark:text-white">
                            Tidak ada dokumen yang cocok
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            Coba ubah kata kunci pencarian atau pilih filter status lainnya.
                        </p>
                        <button
                            type="button"
                            onClick={() => {
                                setSearchQuery('');
                                setStatusFilter('all');
                            }}
                            className="mt-1 inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-extrabold text-lime-300 transition hover:bg-slate-800 dark:bg-lime-400 dark:text-slate-950 dark:hover:bg-lime-300"
                        >
                            Reset Filter
                        </button>
                    </div>
                </Surface>
            ) : (
                visibleChapters.map(({ chapter, chapterIdx, allItems, filteredItems }) => {
                    const readyItems = allItems.filter((it) => it.chunks.length > 0);
                    const selectedCount = allItems.filter(
                        (it) => bundleConfig.enabled_items[it.key] && it.chunks.length > 0,
                    ).length;
                    const allReadyChecked = readyItems.length > 0 && selectedCount === readyItems.length;
                    const progressPct =
                        readyItems.length > 0 ? Math.round((selectedCount / readyItems.length) * 100) : 0;
                    const isOpen = isFiltering ? true : Boolean(expandedChapters[chapter.key]);

                    return (
                        <Surface key={chapter.key} padding="none" className="transition-colors">
                            {/* Chapter Collapsible Header */}
                            <div
                                className={`flex flex-wrap items-center justify-between gap-3 px-4 py-3.5 transition ${
                                    isOpen
                                        ? 'border-b border-slate-100 bg-slate-50/70 dark:border-white/[0.07] dark:bg-white/[0.025]'
                                        : 'bg-transparent'
                                }`}
                            >
                                <button
                                    type="button"
                                    disabled={isFiltering}
                                    aria-expanded={isOpen}
                                    onClick={() => toggleChapterOpen(chapter.key)}
                                    className="flex min-w-0 flex-1 items-center gap-3 rounded-xl text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50 disabled:cursor-default dark:focus-visible:ring-lime-400/50"
                                >
                                    <IconTile
                                        tone={selectedCount > 0 ? 'ink' : 'slate'}
                                        size="sm"
                                        className="font-black text-xs"
                                    >
                                        <span>{chapter.roman}</span>
                                    </IconTile>

                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h3 className="truncate text-[13.5px] font-extrabold tracking-tight text-slate-900 dark:text-white">
                                                BAB {chapter.roman} — {chapter.title}
                                            </h3>
                                            <StatusBadge
                                                tone={
                                                    selectedCount === 0
                                                        ? 'neutral'
                                                        : allReadyChecked
                                                          ? 'success'
                                                          : 'violet'
                                                }
                                                dot={false}
                                            >
                                                {selectedCount}/{readyItems.length} dipilih
                                            </StatusBadge>
                                        </div>

                                        <div className="mt-1 flex flex-wrap items-center gap-3">
                                            <p className="truncate text-[11px] font-medium text-slate-500 dark:text-slate-400">
                                                {chapter.subtitle}
                                            </p>
                                            {readyItems.length > 0 && (
                                                <div className="hidden items-center gap-1.5 sm:flex">
                                                    <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-200/80 dark:bg-white/10">
                                                        <div
                                                            className={`h-full rounded-full transition-all duration-300 ${
                                                                allReadyChecked
                                                                    ? 'bg-emerald-500 dark:bg-lime-400'
                                                                    : 'bg-brand-500 dark:bg-brand-400'
                                                            }`}
                                                            style={{ width: `${progressPct}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-[10px] font-bold tabular-nums text-slate-400 dark:text-slate-500">
                                                        {progressPct}%
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </button>

                                <div className="flex items-center gap-1.5">
                                    {readyItems.length > 0 && (
                                        <button
                                            type="button"
                                            onClick={() => onToggleChapterAll(chapter, !allReadyChecked)}
                                            className="rounded-xl border border-slate-200/90 bg-white px-2.5 py-1.5 text-[11px] font-bold text-slate-700 transition hover:bg-slate-100 hover:text-slate-900 dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-200 dark:hover:bg-white/[0.1] dark:hover:text-white"
                                        >
                                            {allReadyChecked ? 'Batal Semua' : 'Pilih Semua'}
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        disabled={chapterIdx === 0 || isFiltering}
                                        onClick={() => onMoveChapter(chapter.key, 'up')}
                                        className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200/90 bg-white text-slate-600 transition hover:bg-slate-100 disabled:opacity-30 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300 dark:hover:bg-white/[0.09]"
                                        title="Geser Bab ke atas"
                                        aria-label={`Geser BAB ${chapter.roman} ke atas`}
                                    >
                                        <ArrowUp className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                        type="button"
                                        disabled={chapterIdx === orderedChapters.length - 1 || isFiltering}
                                        onClick={() => onMoveChapter(chapter.key, 'down')}
                                        className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200/90 bg-white text-slate-600 transition hover:bg-slate-100 disabled:opacity-30 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300 dark:hover:bg-white/[0.09]"
                                        title="Geser Bab ke bawah"
                                        aria-label={`Geser BAB ${chapter.roman} ke bawah`}
                                    >
                                        <ArrowDown className="h-3.5 w-3.5" />
                                    </button>
                                    {!isFiltering && (
                                        <button
                                            type="button"
                                            onClick={() => toggleChapterOpen(chapter.key)}
                                            className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200/90 bg-white text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300 dark:hover:bg-white/[0.09] dark:hover:text-white"
                                            title={isOpen ? 'Lipat bab' : 'Buka bab'}
                                            aria-label={
                                                isOpen ? `Lipat BAB ${chapter.roman}` : `Buka BAB ${chapter.roman}`
                                            }
                                        >
                                            <ChevronDown
                                                className={`h-4 w-4 transition-transform duration-200 ${
                                                    isOpen ? 'rotate-180' : ''
                                                }`}
                                            />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Collapsible Items List */}
                            {isOpen &&
                                (filteredItems.length === 0 ? (
                                    <div className="px-4 py-5 text-center text-xs text-slate-400 dark:text-slate-500">
                                        {chapter.key === 'lampiran_eksternal'
                                            ? 'Belum ada lampiran PDF eksternal untuk periode ini. Gunakan panel unggah di sisi kanan untuk menambahkan.'
                                            : 'Belum ada item dokumen pada bab ini.'}
                                    </div>
                                ) : (
                                    <div className="divide-y divide-slate-100 dark:divide-white/[0.06]">
                                        {filteredItems.map((item, itemIdx) => {
                                            const hasChunks = item.chunks.length > 0;
                                            const checked =
                                                Boolean(bundleConfig.enabled_items[item.key]) && hasChunks;
                                            const selectedTpl =
                                                bundleConfig.selected_templates[item.key] ||
                                                item.default_template;
                                            const selectedTplMeta = item.available_templates.find(
                                                (t) => t.id === selectedTpl,
                                            );
                                            const isCustomDocx = Boolean(selectedTplMeta?.is_custom);
                                            const previewUrl = resolvePreviewUrl(item, isCustomDocx);
                                            const effectiveSettings = getEffectiveSettings(item);
                                            const hasCustomSettings =
                                                !isCustomDocx && !item.is_external && isCustomPrintSetting(item);
                                            const showLibreWarning = isCustomDocx && !libreOfficeAvailable;

                                            return (
                                                <div
                                                    key={item.key}
                                                    className={`flex flex-col gap-2.5 px-4 py-3 transition sm:flex-row sm:items-center sm:justify-between ${
                                                        checked
                                                            ? 'bg-white hover:bg-slate-50/70 dark:bg-transparent dark:hover:bg-white/[0.025]'
                                                            : 'bg-slate-50/50 hover:bg-slate-50 dark:bg-white/[0.015] dark:hover:bg-white/[0.03]'
                                                    }`}
                                                >
                                                    <div className="flex min-w-0 flex-1 items-start gap-3">
                                                        <input
                                                            type="checkbox"
                                                            checked={checked}
                                                            disabled={!hasChunks}
                                                            aria-label={`Sertakan ${item.label}`}
                                                            onChange={(e) =>
                                                                onToggleItem(item.key, e.target.checked)
                                                            }
                                                            className="mt-0.5 h-4 w-4 cursor-pointer rounded border-slate-300 bg-white text-brand-600 focus:ring-brand-500/40 focus:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-35 dark:border-white/20 dark:bg-white/[0.06] dark:text-brand-500 dark:focus:ring-brand-400/50"
                                                        />
                                                        <div className="min-w-0 flex-1">
                                                            <div className="flex flex-wrap items-center gap-1.5">
                                                                <span
                                                                    className={`inline-flex items-center gap-1.5 text-xs font-extrabold ${
                                                                        hasChunks
                                                                            ? 'text-slate-800 dark:text-slate-100'
                                                                            : 'text-slate-500 dark:text-slate-400'
                                                                    }`}
                                                                >
                                                                    {item.is_external ? (
                                                                        <Paperclip className="h-3.5 w-3.5 text-amber-500 dark:text-amber-400" />
                                                                    ) : (
                                                                        <FileText className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                                                                    )}
                                                                    <span>{item.label}</span>
                                                                </span>

                                                                {item.status === 'ready' && (
                                                                    <StatusBadge tone="success">Siap</StatusBadge>
                                                                )}
                                                                {item.status === 'partial' && (
                                                                    <StatusBadge tone="warning">Sebagian</StatusBadge>
                                                                )}
                                                                {item.status === 'empty' && (
                                                                    <StatusBadge tone="neutral">Kosong</StatusBadge>
                                                                )}

                                                                {!item.is_external &&
                                                                item.print_param_schema !== 'none' &&
                                                                !isCustomDocx ? (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() =>
                                                                            onOpenItemSettings(chapter, item)
                                                                        }
                                                                        className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wide transition ${
                                                                            hasCustomSettings
                                                                                ? 'bg-brand-100 text-brand-700 ring-1 ring-brand-300/80 hover:bg-brand-200/70 dark:bg-lime-400/15 dark:text-lime-300 dark:ring-lime-400/30 dark:hover:bg-lime-400/25'
                                                                                : 'bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-800 dark:bg-white/[0.06] dark:text-slate-400 dark:hover:bg-white/[0.12] dark:hover:text-slate-200'
                                                                        }`}
                                                                        title="Klik untuk ubah ukuran kertas, orientasi, dan font item ini"
                                                                    >
                                                                        <span>
                                                                            {effectiveSettings.paper_size} ·{' '}
                                                                            {effectiveSettings.orientation} ·{' '}
                                                                            {effectiveSettings.font_size}
                                                                        </span>
                                                                    </button>
                                                                ) : (
                                                                    <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wide text-slate-500 dark:bg-white/[0.06] dark:text-slate-400">
                                                                        {isCustomDocx ? 'LAYOUT DOCX' : 'PDF ASLI'}
                                                                    </span>
                                                                )}
                                                            </div>

                                                            <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                                                                <span>{item.summary_text}</span>
                                                                {item.status === 'empty' && item.shortcut_url && (
                                                                    <a
                                                                        href={item.shortcut_url}
                                                                        className="inline-flex items-center gap-1 font-bold text-brand-600 hover:underline dark:text-lime-300"
                                                                    >
                                                                        <span>Buat di Modul</span>
                                                                        <ExternalLink className="h-3 w-3" />
                                                                    </a>
                                                                )}
                                                                {showLibreWarning && (
                                                                    <span className="font-semibold text-amber-600 dark:text-amber-300">
                                                                        · LibreOffice tidak terdeteksi (otomatis fallback jika gagal)
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Right Controls: SP2B mode + Template picker + settings + preview + reorder */}
                                                    <div className="flex flex-wrap items-center gap-1.5 pl-7 sm:pl-0">
                                                        {item.sp2b_mode_options &&
                                                            item.sp2b_mode_options.length > 0 && (
                                                                <select
                                                                    value={item.sp2b_active_mode ?? 'tahap'}
                                                                    disabled={isFetchingManifest}
                                                                    aria-label="Mode periode SP2B"
                                                                    onChange={(e) =>
                                                                        onChangeSp2bMode(
                                                                            e.target.value as SpjSp2bMode,
                                                                        )
                                                                    }
                                                                    className="max-w-[195px] rounded-xl border border-brand-200/90 bg-brand-50/70 py-1.5 pl-2.5 pr-8 text-[11px] font-bold text-brand-700 focus:border-brand-500 focus:ring-brand-500/30 disabled:opacity-50 dark:border-lime-400/30 dark:bg-lime-400/10 dark:text-lime-300 dark:focus:border-lime-400/60 dark:focus:ring-lime-400/20"
                                                                >
                                                                    {item.sp2b_mode_options.map((opt) => (
                                                                        <option key={opt.id} value={opt.id}>
                                                                            {opt.label} ({opt.count} dok)
                                                                        </option>
                                                                    ))}
                                                                </select>
                                                            )}

                                                        {(item.available_templates.length > 1 ||
                                                            (item.chapter_key === 'penganggaran' &&
                                                                item.available_templates.length > 0)) && (
                                                            <select
                                                                value={selectedTpl}
                                                                disabled={!hasChunks}
                                                                aria-label={`Versi dokumen ${item.label}`}
                                                                onChange={(e) =>
                                                                    onSelectTemplate(item.key, e.target.value)
                                                                }
                                                                className="max-w-[250px] rounded-xl border border-slate-200/90 bg-slate-50/90 py-1.5 pl-2.5 pr-8 text-[11px] font-semibold text-slate-700 focus:border-brand-500 focus:ring-brand-500/30 disabled:opacity-45 dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-200 dark:focus:border-lime-400/60 dark:focus:ring-lime-400/20"
                                                            >
                                                                {item.available_templates.map((tpl) => (
                                                                    <option key={tpl.id} value={tpl.id}>
                                                                        {tpl.label}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        )}

                                                        <button
                                                            type="button"
                                                            onClick={() => onOpenItemSettings(chapter, item)}
                                                            className={`inline-flex items-center gap-1 rounded-xl border px-2.5 py-1.5 text-[11px] font-bold transition ${
                                                                hasCustomSettings
                                                                    ? 'border-brand-300 bg-brand-50 text-brand-700 hover:bg-brand-100 dark:border-lime-400/35 dark:bg-lime-400/15 dark:text-lime-300 dark:hover:bg-lime-400/25'
                                                                    : 'border-slate-200/90 bg-white text-slate-700 hover:border-brand-300 hover:text-brand-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200 dark:hover:border-lime-400/40 dark:hover:bg-white/[0.08] dark:hover:text-lime-300'
                                                            }`}
                                                            title="Pengaturan Kertas, Orientasi & Ukuran Font"
                                                        >
                                                            <Settings className="h-3.5 w-3.5" />
                                                            <span className="hidden xl:inline">Pengaturan</span>
                                                        </button>

                                                        {previewUrl && (
                                                            <a
                                                                href={previewUrl}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="inline-flex items-center gap-1 rounded-xl border border-slate-200/90 bg-white px-2.5 py-1.5 text-[11px] font-bold text-slate-700 transition hover:border-brand-300 hover:text-brand-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200 dark:hover:border-white/25 dark:hover:bg-white/[0.08] dark:hover:text-white"
                                                                title="Preview / Cetak dokumen ini secara satuan"
                                                            >
                                                                <Eye className="h-3.5 w-3.5" />
                                                                <span>Satuan</span>
                                                            </a>
                                                        )}

                                                        <button
                                                            type="button"
                                                            disabled={itemIdx === 0 || isFiltering}
                                                            onClick={() => onMoveItem(chapter.key, item.key, 'up')}
                                                            className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200/90 bg-white text-slate-500 transition hover:bg-slate-100 disabled:opacity-30 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-400 dark:hover:bg-white/[0.08] dark:hover:text-white"
                                                            title="Naikkan urutan"
                                                            aria-label={`Naikkan urutan ${item.label}`}
                                                        >
                                                            <ArrowUp className="h-3 w-3" />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            disabled={
                                                                itemIdx === filteredItems.length - 1 || isFiltering
                                                            }
                                                            onClick={() =>
                                                                onMoveItem(chapter.key, item.key, 'down')
                                                            }
                                                            className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200/90 bg-white text-slate-500 transition hover:bg-slate-100 disabled:opacity-30 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-400 dark:hover:bg-white/[0.08] dark:hover:text-white"
                                                            title="Turunkan urutan"
                                                            aria-label={`Turunkan urutan ${item.label}`}
                                                        >
                                                            <ArrowDown className="h-3 w-3" />
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ))}
                        </Surface>
                    );
                })
            )}
        </div>
    );
}
