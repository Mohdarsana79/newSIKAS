import Modal from '@/Components/Modal';
import IconTile from '@/Components/ui/IconTile';
import type { CopilotWindowState } from '@/Layouts/AuthenticatedLayout';
import type { PageProps } from '@/types';
import {
    CATEGORY_ORDER,
    clearRecentFeatureIds,
    FeatureIconKey,
    FeatureSearchItem,
    getAuthorizedFeatures,
    loadRecentFeatureIds,
    OPEN_ARKAS_PATH_MODAL_EVENT,
    recordRecentFeatureId,
    searchFeatures,
} from '@/Utils/featureSearchCatalog';
import { router, usePage } from '@inertiajs/react';
import {
    ArrowRight,
    BarChart3,
    BookOpen,
    Building2,
    Clock,
    CornerDownLeft,
    Database,
    FileCheck2,
    FileSpreadsheet,
    FileText,
    FolderArchive,
    FolderKanban,
    HardDrive,
    History,
    LayoutDashboard,
    ListChecks,
    MessageSquare,
    Network,
    Presentation,
    Printer,
    Receipt,
    RefreshCw,
    Search,
    ShoppingBag,
    Tag,
    UserCog,
    Users,
    Wallet,
    Wrench,
    X,
} from 'lucide-react';
import { KeyboardEvent, ReactNode, useEffect, useMemo, useRef, useState } from 'react';

interface FeatureSearchModalProps {
    open: boolean;
    onClose: () => void;
    setCopilotState?: (state: CopilotWindowState) => void;
}

const FEATURE_ICONS: Record<FeatureIconKey, ReactNode> = {
    dashboard: <LayoutDashboard />,
    penganggaran: <FileSpreadsheet />,
    penatausahaan: <Wallet />,
    rekapitulasi: <BarChart3 />,
    sts: <FileCheck2 />,
    arkas: <Wrench />,
    referensi: <BookOpen />,
    sekolah: <Building2 />,
    kegiatan: <ListChecks />,
    rekening: <Tag />,
    kwitansi: <Receipt />,
    tanda_terima: <FileText />,
    bast: <FileCheck2 />,
    surat_pesanan: <ShoppingBag />,
    dokumen: <FolderArchive />,
    sk_surat: <FolderKanban />,
    laporan: <BarChart3 />,
    poster_transparansi: <Presentation />,
    cetak_spj: <Printer />,
    backup: <Database />,
    network: <Network />,
    roles: <Users />,
    activity_logs: <History />,
    update: <RefreshCw />,
    path_arkas: <HardDrive />,
    profile: <UserCog />,
    copilot: <MessageSquare />,
};

interface RenderRow {
    rowKey: string;
    item: FeatureSearchItem;
    flatIndex: number;
}

interface RenderSection {
    id: string;
    label: string;
    isRecent?: boolean;
    rows: RenderRow[];
}

function escapeRegExp(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function HighlightText({ text, query }: { text: string; query: string }) {
    const tokens = query
        .trim()
        .split(/\s+/)
        .filter((t) => t.length > 0)
        .sort((a, b) => b.length - a.length);

    if (tokens.length === 0) {
        return <>{text}</>;
    }

    const pattern = new RegExp(`(${tokens.map(escapeRegExp).join('|')})`, 'gi');
    const parts = text.split(pattern);

    return (
        <>
            {parts.map((part, idx) =>
                idx % 2 === 1 ? (
                    <mark
                        key={idx}
                        className="rounded bg-lime-300/80 px-0.5 text-slate-950 dark:bg-lime-400/30 dark:text-lime-200"
                    >
                        {part}
                    </mark>
                ) : (
                    <span key={idx}>{part}</span>
                ),
            )}
        </>
    );
}

const EXAMPLE_KEYWORDS = ['RKAS', 'BKU', 'Kwitansi', 'SPTJ', 'Backup'];

/**
 * Command Palette Neo-Bento untuk pencarian cepat seluruh fitur newSIKAS
 * (difilter RBAC sesuai role pengguna).
 */
export default function FeatureSearchModal({
    open,
    onClose,
    setCopilotState,
}: FeatureSearchModalProps) {
    const { props } = usePage<PageProps>();
    const user = props.auth?.user;
    const authPermissions = props.auth?.permissions;

    const [query, setQuery] = useState('');
    const [activeIndex, setActiveIndex] = useState(0);
    const [recentIds, setRecentIds] = useState<string[]>([]);

    const inputRef = useRef<HTMLInputElement>(null);
    const rowRefs = useRef<Record<string, HTMLButtonElement | null>>({});

    const authorizedItems = useMemo(
        () => getAuthorizedFeatures(user, authPermissions),
        [user, authPermissions],
    );

    // Reset query, muat riwayat terbaru, dan fokuskan input setiap kali modal dibuka
    useEffect(() => {
        if (!open) return;

        setQuery('');
        setActiveIndex(0);
        setRecentIds(loadRecentFeatureIds(user?.id));

        const timer = window.setTimeout(() => {
            inputRef.current?.focus();
        }, 40);

        return () => window.clearTimeout(timer);
    }, [open, user?.id]);

    const { sections, flatRows } = useMemo(() => {
        const trimmed = query.trim();
        const builtSections: RenderSection[] = [];
        const allRows: RenderRow[] = [];

        if (trimmed === '') {
            // 1. Terakhir Dibuka (hanya item yang masih diizinkan RBAC)
            const recentItems = recentIds
                .map((id) => authorizedItems.find((item) => item.id === id))
                .filter((item): item is FeatureSearchItem => Boolean(item));

            if (recentItems.length > 0) {
                const rows: RenderRow[] = recentItems.map((item) => {
                    const row: RenderRow = {
                        rowKey: `recent-${item.id}`,
                        item,
                        flatIndex: allRows.length,
                    };
                    allRows.push(row);
                    return row;
                });

                builtSections.push({
                    id: 'recent',
                    label: 'Terakhir Dibuka',
                    isRecent: true,
                    rows,
                });
            }

            // 2. Fitur Utama dikelompokkan per kategori (non-varian agar ringkas)
            const baseItems = authorizedItems.filter((item) => !item.isVariantEntry);
            for (const category of CATEGORY_ORDER) {
                const catItems = baseItems.filter((item) => item.category === category);
                if (catItems.length === 0) continue;

                const rows: RenderRow[] = catItems.map((item) => {
                    const row: RenderRow = {
                        rowKey: `cat-${item.id}`,
                        item,
                        flatIndex: allRows.length,
                    };
                    allRows.push(row);
                    return row;
                });

                builtSections.push({
                    id: category,
                    label: category,
                    rows,
                });
            }
        } else {
            const matched = searchFeatures(authorizedItems, trimmed);

            if (matched.length > 0) {
                const rows: RenderRow[] = matched.map((item) => {
                    const row: RenderRow = {
                        rowKey: `res-${item.id}`,
                        item,
                        flatIndex: allRows.length,
                    };
                    allRows.push(row);
                    return row;
                });

                builtSections.push({
                    id: 'results',
                    label: 'Hasil Pencarian (Terurut Relevansi)',
                    rows,
                });
            }
        }

        return { sections: builtSections, flatRows: allRows };
    }, [authorizedItems, query, recentIds]);

    // Pastikan activeIndex selalu dalam rentang valid
    useEffect(() => {
        if (activeIndex >= flatRows.length) {
            setActiveIndex(0);
        }
    }, [activeIndex, flatRows.length]);

    // Auto-scroll item aktif ke viewport saat navigasi keyboard
    useEffect(() => {
        const activeRow = flatRows[activeIndex];
        if (!activeRow) return;
        const el = rowRefs.current[activeRow.rowKey];
        if (el && typeof el.scrollIntoView === 'function') {
            el.scrollIntoView({ block: 'nearest' });
        }
    }, [activeIndex, flatRows]);

    const executeFeature = (item: FeatureSearchItem) => {
        setRecentIds(recordRecentFeatureId(item.id, user?.id));
        onClose();

        if (item.action.type === 'copilot') {
            setCopilotState?.('normal');
            return;
        }

        if (item.action.type === 'arkas-path-modal') {
            window.dispatchEvent(new CustomEvent(OPEN_ARKAS_PATH_MODAL_EVENT));
            return;
        }

        try {
            router.visit(route(item.action.routeName));
        } catch {
            // Abaikan bila route tidak terdaftar di Ziggy
        }
    };

    const handleClearRecent = () => {
        clearRecentFeatureIds(user?.id);
        setRecentIds([]);
        setActiveIndex(0);
        inputRef.current?.focus();
    };

    const handleInputKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (flatRows.length > 0) {
                setActiveIndex((prev) => (prev + 1) % flatRows.length);
            }
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (flatRows.length > 0) {
                setActiveIndex((prev) => (prev - 1 + flatRows.length) % flatRows.length);
            }
        } else if (e.key === 'Enter') {
            e.preventDefault();
            const target = flatRows[activeIndex];
            if (target) {
                executeFeature(target.item);
            }
        } else if (e.key === 'Escape') {
            e.preventDefault();
            onClose();
        }
    };

    const activeRow = flatRows[activeIndex];

    return (
        <Modal
            show={open}
            onClose={onClose}
            maxWidth="2xl"
            ariaLabelledBy="feature-search-modal-title"
        >
            <div className="relative flex max-h-[82vh] flex-col overflow-hidden rounded-[26px]">
                {/* Ambient aurora glow */}
                <div
                    aria-hidden
                    className="pointer-events-none absolute -left-12 -top-16 h-40 w-40 rounded-full bg-pastel-lavender/90 blur-3xl dark:bg-brand-500/15"
                />
                <div
                    aria-hidden
                    className="pointer-events-none absolute -bottom-16 -right-12 h-40 w-40 rounded-full bg-lime-200/70 blur-3xl dark:bg-lime-400/10"
                />

                <h2 id="feature-search-modal-title" className="sr-only">
                    Pencarian Fitur newSIKAS
                </h2>

                {/* Header input pencarian */}
                <div className="relative flex items-center gap-3 border-b border-slate-100 px-5 py-4 dark:border-white/10">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-pastel-lavender text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
                        <Search className="h-4 w-4" />
                    </div>
                    <input
                        ref={inputRef}
                        type="text"
                        role="combobox"
                        aria-expanded={flatRows.length > 0}
                        aria-controls="feature-search-listbox"
                        aria-activedescendant={
                            activeRow ? `feature-search-opt-${activeRow.rowKey}` : undefined
                        }
                        aria-autocomplete="list"
                        value={query}
                        onChange={(e) => {
                            setQuery(e.target.value);
                            setActiveIndex(0);
                        }}
                        onKeyDown={handleInputKeyDown}
                        placeholder="Cari fitur newSIKAS… (contoh: RKAS, BKU, Kwitansi SiLPA, SPTJ, Backup)"
                        className="w-full border-0 bg-transparent p-0 text-[13.5px] font-bold text-slate-900 placeholder:font-medium placeholder:text-slate-400 focus:outline-none focus:ring-0 dark:text-white dark:placeholder:text-slate-500"
                    />
                    {query && (
                        <button
                            type="button"
                            onClick={() => {
                                setQuery('');
                                setActiveIndex(0);
                                inputRef.current?.focus();
                            }}
                            aria-label="Hapus kata kunci"
                            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:text-slate-500 dark:hover:bg-white/10 dark:hover:text-white"
                        >
                            <X className="h-3.5 w-3.5" />
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Tutup pencarian"
                        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-slate-100 bg-slate-50/80 text-slate-400 transition hover:bg-slate-100 hover:text-slate-900 dark:border-white/10 dark:bg-white/5 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {/* Daftar hasil */}
                <div className="sikas-scroll relative max-h-[58vh] flex-1 overflow-y-auto px-3 py-3">
                    {sections.length > 0 ? (
                        <div className="space-y-4">
                            {sections.map((section) => (
                                <div key={section.id}>
                                    <div className="mb-1.5 flex items-center justify-between px-2.5">
                                        <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">
                                            {section.isRecent && <Clock className="h-3 w-3" />}
                                            {section.label}
                                        </span>
                                        {section.isRecent && (
                                            <button
                                                type="button"
                                                onClick={handleClearRecent}
                                                className="text-[10px] font-bold text-slate-400 transition hover:text-rose-500 dark:text-slate-500 dark:hover:text-rose-300"
                                            >
                                                Bersihkan
                                            </button>
                                        )}
                                    </div>

                                    <div
                                        id={section.id === sections[0].id ? 'feature-search-listbox' : undefined}
                                        role="listbox"
                                        aria-label={section.label}
                                        className="space-y-1"
                                    >
                                        {section.rows.map(({ rowKey, item, flatIndex }) => {
                                            const isActive = flatIndex === activeIndex;
                                            return (
                                                <button
                                                    key={rowKey}
                                                    id={`feature-search-opt-${rowKey}`}
                                                    ref={(el) => {
                                                        rowRefs.current[rowKey] = el;
                                                    }}
                                                    type="button"
                                                    role="option"
                                                    tabIndex={-1}
                                                    aria-selected={isActive}
                                                    onMouseEnter={() => setActiveIndex(flatIndex)}
                                                    onClick={() => executeFeature(item)}
                                                    className={`group flex w-full items-center gap-3 rounded-2xl border px-3 py-2.5 text-left transition-all duration-150 ${
                                                        isActive
                                                            ? 'border-lime-400/80 bg-lime-50/80 shadow-sm dark:border-lime-400/40 dark:bg-lime-400/10'
                                                            : 'border-transparent bg-transparent hover:bg-slate-50/90 dark:hover:bg-white/[0.04]'
                                                    }`}
                                                >
                                                    <IconTile tone={item.tone} size="sm">
                                                        {FEATURE_ICONS[item.iconKey]}
                                                    </IconTile>

                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex flex-wrap items-center gap-1.5">
                                                            <span className="truncate text-[12px] font-extrabold text-slate-900 dark:text-white">
                                                                <HighlightText text={item.title} query={query} />
                                                            </span>
                                                            {item.variantBadge ? (
                                                                <span className="rounded-full bg-pastel-lavender px-2 py-0.5 text-[9px] font-extrabold text-brand-600 dark:bg-brand-500/20 dark:text-brand-200">
                                                                    {item.variantBadge}
                                                                </span>
                                                            ) : (
                                                                (query.trim() !== '' || section.isRecent) && (
                                                                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-bold text-slate-500 dark:bg-white/10 dark:text-slate-300">
                                                                        {item.category}
                                                                    </span>
                                                                )
                                                            )}
                                                        </div>
                                                        <p className="mt-0.5 truncate text-[10.5px] font-medium text-slate-500 dark:text-slate-400">
                                                            {item.description}
                                                        </p>
                                                    </div>

                                                    <span
                                                        className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-xl transition ${
                                                            isActive
                                                                ? 'bg-lime-400 text-slate-950 shadow-lime'
                                                                : 'text-slate-300 dark:text-slate-600'
                                                        }`}
                                                    >
                                                        {isActive ? (
                                                            <CornerDownLeft className="h-3.5 w-3.5" />
                                                        ) : (
                                                            <ArrowRight className="h-3.5 w-3.5" />
                                                        )}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center px-6 py-10 text-center">
                            <IconTile tone="slate" size="lg">
                                <Search />
                            </IconTile>
                            <p className="mt-3 text-[13px] font-extrabold text-slate-800 dark:text-white">
                                Fitur tidak ditemukan
                            </p>
                            <p className="mt-1 max-w-sm text-[11px] font-medium text-slate-400 dark:text-slate-500">
                                Tidak ada fitur yang cocok dengan <strong className="text-slate-600 dark:text-slate-300">“{query.trim()}”</strong>. Coba kata kunci populer di bawah ini:
                            </p>
                            <div className="mt-4 flex flex-wrap justify-center gap-1.5">
                                {EXAMPLE_KEYWORDS.map((keyword) => (
                                    <button
                                        key={keyword}
                                        type="button"
                                        onClick={() => {
                                            setQuery(keyword);
                                            setActiveIndex(0);
                                            inputRef.current?.focus();
                                        }}
                                        className="rounded-full border border-slate-200/80 bg-white px-3 py-1 text-[10.5px] font-bold text-slate-600 shadow-sm transition hover:border-lime-400 hover:bg-lime-50 hover:text-slate-900 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:border-lime-400/50 dark:hover:bg-lime-400/10 dark:hover:text-white"
                                    >
                                        {keyword}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer petunjuk keyboard */}
                <div className="relative flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/70 px-5 py-2.5 text-[10px] font-semibold text-slate-400 dark:border-white/5 dark:bg-white/[0.02] dark:text-slate-500">
                    <div className="flex flex-wrap items-center gap-3">
                        <span className="inline-flex items-center gap-1">
                            <kbd className="rounded border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-[9px] font-bold text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                                ↑↓
                            </kbd>
                            Navigasi
                        </span>
                        <span className="inline-flex items-center gap-1">
                            <kbd className="rounded border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-[9px] font-bold text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                                ↵
                            </kbd>
                            Buka
                        </span>
                        <span className="inline-flex items-center gap-1">
                            <kbd className="rounded border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-[9px] font-bold text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                                Esc
                            </kbd>
                            Tutup
                        </span>
                    </div>
                    <span className="text-sikas-num font-bold text-slate-500 dark:text-slate-400">
                        {query.trim()
                            ? `${flatRows.length} hasil ditemukan`
                            : `${authorizedItems.length} fitur tersedia`}
                    </span>
                </div>
            </div>
        </Modal>
    );
}
