import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import useVariantRoute from '@/Hooks/useVariantRoute';
import { AlertCircle, BookOpen, Check, Edit3, ExternalLink, Loader2, Package, Search, Users, X } from 'lucide-react';

export interface ArkasCatalogItem {
    id_barang: string;
    nama_barang: string;
    kode_rekening: string | null;
    rekening: string | null;
    satuan: string | null;
    blok_id?: string | null;
    kode_belanja?: string | null;
    batas_atas: number;
    tahun: number;
}

export interface ArkasPtkItem {
    id: number;
    ptk_id: string | null;
    nuptk: string | null;
    nama: string;
    jenis_ptk_arkas: number;
    jenis_label: string;
    formatted_uraian: string;
    sumber: string;
}

const HONOR_GURU_KEGIATAN_CODE = '07.12.01.';
const HONOR_MANUAL_KEGIATAN_CODES = new Set([
    '07.12.02.',
    '07.12.03.',
    '07.12.04.',
]);
const HONOR_GURU_REKENING_CODES = new Set([
    '5.1.02.02.01.0013',
]);

const BUKU_REKENING_CODES = new Set([
    '5.2.05.01.01.0001',
    '5.2.05.01.01.0002',
    '5.2.05.01.01.0003',
    '5.2.05.01.01.0004',
    '5.2.05.01.01.0005',
    '5.2.05.01.01.0006',
    '5.2.05.01.01.0007',
    '5.2.05.01.01.0008',
    '5.2.05.01.01.0009',
    '5.2.05.01.01.0010',
]);

function normalizeKegiatanCode(kodeKegiatan: string): string {
    const keg = kodeKegiatan.trim();
    if (!keg) return '';
    return keg.endsWith('.') ? keg : `${keg}.`;
}

function isStrictPtkContext(kodeKegiatan: string, kodeRekening: string): boolean {
    return (
        normalizeKegiatanCode(kodeKegiatan) === HONOR_GURU_KEGIATAN_CODE &&
        HONOR_GURU_REKENING_CODES.has(kodeRekening.trim())
    );
}

function isHonorManualKegiatan(kodeKegiatan: string): boolean {
    return HONOR_MANUAL_KEGIATAN_CODES.has(normalizeKegiatanCode(kodeKegiatan));
}

function isBukuRekeningCode(kodeRekening: string): boolean {
    return BUKU_REKENING_CODES.has(kodeRekening.trim());
}

interface ArkasUraianSelectProps {
    year: string | number;
    isYearSynced: boolean;
    kodeKegiatan?: string;
    kodeRekening: string;
    uraianArkas: string;
    idBarangArkas: string;
    batasAtas: number | null;
    routePrefix?: string;
    disabled?: boolean;
    error?: string;
    onSelectCatalogItem: (item: ArkasCatalogItem) => void;
    onSelectPtkItem?: (item: ArkasPtkItem) => void;
    onManualChange: (value: string) => void;
    onClear: () => void;
    onBatasAtasResolved?: (batasAtas: number | null) => void;
}

export default function ArkasUraianSelect({
    year,
    isYearSynced,
    kodeKegiatan = '',
    kodeRekening,
    uraianArkas,
    idBarangArkas,
    batasAtas,
    routePrefix = '',
    disabled = false,
    error,
    onSelectCatalogItem,
    onSelectPtkItem,
    onManualChange,
    onClear,
    onBatasAtasResolved,
}: ArkasUraianSelectProps) {
    const vRoute = useVariantRoute();
    const ptkEligible = isStrictPtkContext(kodeKegiatan, kodeRekening);
    const honorManualEligible = isHonorManualKegiatan(kodeKegiatan);

    const [isLoading, setIsLoading] = useState(false);
    const [sourcePreference, setSourcePreference] = useState<'auto' | 'ptk' | 'ssh'>('auto');
    const [includeAllPtk, setIncludeAllPtk] = useState(false);

    const [catalogMode, setCatalogMode] = useState<'ssh' | 'ptk' | 'manual'>(
        honorManualEligible ? 'manual' : ptkEligible ? 'ptk' : 'ssh',
    );
    const [isHonorManual, setIsHonorManual] = useState<boolean>(honorManualEligible);
    const [isBukuCatalog, setIsBukuCatalog] = useState<boolean>(isBukuRekeningCode(kodeRekening));
    const [supportsPtk, setSupportsPtk] = useState<boolean>(ptkEligible);
    const [ptkRoleFilter, setPtkRoleFilter] = useState<'guru' | 'tendik' | 'all' | null>(null);
    const [ptkSyncedYear, setPtkSyncedYear] = useState<boolean>(false);
    const [ptkCount, setPtkCount] = useState<number>(0);
    const [ptkTotalHonorer, setPtkTotalHonorer] = useState<number>(0);
    const [sshCount, setSshCount] = useState<number>(0);
    const [hasSshFallback, setHasSshFallback] = useState<boolean>(false);

    const [hasCatalog, setHasCatalog] = useState<boolean>(false);
    const [totalItems, setTotalItems] = useState<number>(0);
    const [catalogItems, setCatalogItems] = useState<ArkasCatalogItem[]>([]);
    const [ptkItems, setPtkItems] = useState<ArkasPtkItem[]>([]);

    const [isOpen, setIsOpen] = useState(false);
    const [searchText, setSearchText] = useState(uraianArkas || '');
    const [isUserTyping, setIsUserTyping] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    // Reset manual source override when kegiatan or rekening changes
    useEffect(() => {
        setSourcePreference('auto');
        setIncludeAllPtk(false);
    }, [kodeKegiatan, kodeRekening]);

    // Sync input text with external uraianArkas prop (e.g. when modal opens for Edit or resets)
    useEffect(() => {
        setSearchText(uraianArkas || '');
        setIsUserTyping(false);
    }, [uraianArkas]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                if (hasCatalog || catalogMode === 'ptk') {
                    setSearchText(uraianArkas || '');
                    setIsUserTyping(false);
                }
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [hasCatalog, catalogMode, uraianArkas]);

    // Initial check whenever year, kodeKegiatan, kodeRekening, or source preference changes
    useEffect(() => {
        if (!kodeRekening || (!isYearSynced && !ptkEligible && !honorManualEligible)) {
            setCatalogMode(honorManualEligible ? 'manual' : ptkEligible ? 'ptk' : 'ssh');
            setIsHonorManual(honorManualEligible);
            setIsBukuCatalog(isBukuRekeningCode(kodeRekening));
            setSupportsPtk(ptkEligible);
            setHasCatalog(false);
            setTotalItems(0);
            setCatalogItems([]);
            setPtkItems([]);
            setPtkCount(0);
            setSshCount(0);
            setHasSshFallback(false);
            return;
        }

        if (honorManualEligible) {
            setCatalogMode('manual');
            setIsHonorManual(true);
            setIsBukuCatalog(false);
            setSupportsPtk(false);
            setHasCatalog(false);
            setTotalItems(0);
            setCatalogItems([]);
            setPtkItems([]);
            setPtkCount(0);
            setSshCount(0);
            setHasSshFallback(false);
            if (onBatasAtasResolved) {
                onBatasAtasResolved(null);
            }
            return;
        }

        let isCancelled = false;
        const fetchInitialCatalog = async () => {
            setIsLoading(true);
            try {
                const response = await axios.get(vRoute('arkas-tools.by-rekening'), {
                    params: {
                        year,
                        kode_kegiatan: kodeKegiatan || undefined,
                        kode_rekening: kodeRekening,
                        id_barang: idBarangArkas || undefined,
                        uraian_arkas: uraianArkas || undefined,
                        source: sourcePreference,
                        include_all_ptk: includeAllPtk ? 1 : 0,
                    },
                });

                if (isCancelled) return;

                if (response.data?.status === 'success') {
                    const rawMode = response.data.catalog_mode;
                    const mode: 'ssh' | 'ptk' | 'manual' =
                        rawMode === 'manual' ? 'manual' : rawMode === 'ptk' ? 'ptk' : 'ssh';
                    const catalogExists = Boolean(response.data.has_rekening_catalog);

                    setCatalogMode(mode);
                    setIsHonorManual(Boolean(response.data.is_honor_manual));
                    setIsBukuCatalog(Boolean(response.data.is_buku_catalog));
                    setSupportsPtk(Boolean(response.data.supports_ptk));
                    setPtkRoleFilter(response.data.ptk_role_filter ?? null);
                    setPtkSyncedYear(Boolean(response.data.ptk_synced_year));
                    setPtkCount(Number(response.data.ptk_count || 0));
                    setPtkTotalHonorer(Number(response.data.ptk_total_honorer || 0));
                    setSshCount(Number(response.data.ssh_count || 0));
                    setHasSshFallback(Boolean(response.data.has_ssh_fallback));
                    setHasCatalog(catalogExists);
                    setTotalItems(Number(response.data.total_rekening_items || 0));
                    setCatalogItems(response.data.data || []);
                    setPtkItems(response.data.ptk_items || []);

                    if (onBatasAtasResolved) {
                        if (mode === 'ptk' || mode === 'manual') {
                            onBatasAtasResolved(null);
                        } else if (catalogExists && response.data.selected_item) {
                            onBatasAtasResolved(Number(response.data.selected_item.batas_atas || 0));
                        } else if (!catalogExists) {
                            onBatasAtasResolved(null);
                        }
                    }
                }
            } catch (err) {
                console.error('Failed to load Arkas catalog by rekening:', err);
            } finally {
                if (!isCancelled) {
                    setIsLoading(false);
                }
            }
        };

        fetchInitialCatalog();

        return () => {
            isCancelled = true;
        };
    }, [year, isYearSynced, kodeKegiatan, kodeRekening, ptkEligible, honorManualEligible, sourcePreference, includeAllPtk, routePrefix]);

    // Server-side search when SSH catalog has >150 items and user types in dropdown
    useEffect(() => {
        if (!isOpen || catalogMode !== 'ssh' || !hasCatalog || !isYearSynced || !kodeRekening || totalItems <= 150) {
            return;
        }

        const activeKeyword = isUserTyping ? searchText.trim() : '';
        let isCancelled = false;
        const timer = setTimeout(async () => {
            setIsLoading(true);
            try {
                const response = await axios.get(vRoute('arkas-tools.by-rekening'), {
                    params: {
                        year,
                        kode_kegiatan: kodeKegiatan || undefined,
                        kode_rekening: kodeRekening,
                        source: 'ssh',
                        keyword: activeKeyword,
                    },
                });
                if (!isCancelled && response.data?.status === 'success') {
                    setCatalogItems(response.data.data || []);
                }
            } catch (err) {
                console.error('Failed to search Arkas catalog:', err);
            } finally {
                if (!isCancelled) {
                    setIsLoading(false);
                }
            }
        }, 220);

        return () => {
            isCancelled = true;
            clearTimeout(timer);
        };
    }, [searchText, isUserTyping, isOpen, catalogMode, hasCatalog, isYearSynced, kodeKegiatan, kodeRekening, totalItems, year, routePrefix]);

    const activeFilterQuery = isUserTyping ? searchText.trim() : '';

    const filteredItems = (() => {
        const term = activeFilterQuery.toLowerCase();
        if (!term) return catalogItems;
        return catalogItems.filter(
            (it) =>
                it.nama_barang.toLowerCase().includes(term) ||
                it.id_barang.toLowerCase().includes(term) ||
                (it.satuan && it.satuan.toLowerCase().includes(term)),
        );
    })();

    const filteredPtkItems = (() => {
        const term = activeFilterQuery.toLowerCase();
        if (!term) return ptkItems;
        return ptkItems.filter(
            (ptk) =>
                ptk.nama.toLowerCase().includes(term) ||
                (ptk.nuptk && ptk.nuptk.toLowerCase().includes(term)) ||
                ptk.formatted_uraian.toLowerCase().includes(term),
        );
    })();

    const formatShortKode = (idBarang: string) => {
        if (!idBarang) return '-';
        return idBarang.length > 12 ? `${idBarang.slice(0, 10)}....` : idBarang;
    };

    const highlightMatch = (text: string, query: string) => {
        const cleanQuery = query.trim();
        if (!cleanQuery) return text;
        const lowerText = text.toLowerCase();
        const lowerQuery = cleanQuery.toLowerCase();
        const matchIdx = lowerText.indexOf(lowerQuery);
        if (matchIdx === -1) return text;

        const before = text.slice(0, matchIdx);
        const match = text.slice(matchIdx, matchIdx + cleanQuery.length);
        const after = text.slice(matchIdx + cleanQuery.length);

        return (
            <>
                {before}
                <strong className="font-extrabold text-slate-950 underline decoration-lime-400 decoration-2 dark:text-white">
                    {match}
                </strong>
                {after}
            </>
        );
    };

    const handleChoosePtk = (ptk: ArkasPtkItem) => {
        if (onSelectPtkItem) {
            onSelectPtkItem(ptk);
        } else {
            onManualChange(ptk.formatted_uraian);
        }
        setSearchText(ptk.formatted_uraian);
        setIsUserTyping(false);
        setIsOpen(false);
    };

    const handleApplyManualInPtkMode = () => {
        const clean = searchText.trim();
        if (!clean) return;
        onManualChange(clean);
        setIsUserTyping(false);
        setIsOpen(false);
    };

    const renderModeSwitchBar = () => {
        if (!supportsPtk) return null;

        return (
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/70 px-3 py-2 dark:border-white/5 dark:bg-white/[0.02]">
                <div className="inline-flex items-center gap-1 rounded-xl bg-slate-200/70 p-0.5 dark:bg-white/10">
                    <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                            setSourcePreference('ptk');
                            setIsUserTyping(false);
                        }}
                        className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[10.5px] font-extrabold transition ${
                            catalogMode === 'ptk'
                                ? 'bg-white text-slate-900 shadow-sm dark:bg-lime-400 dark:text-slate-950'
                                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
                        }`}
                    >
                        <Users className="h-3 w-3" />
                        Daftar PTK ({ptkCount})
                    </button>
                    {(hasSshFallback || sshCount > 0) && (
                        <button
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                                setSourcePreference('ssh');
                                setIsUserTyping(false);
                            }}
                            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[10.5px] font-extrabold transition ${
                                catalogMode === 'ssh'
                                    ? 'bg-white text-slate-900 shadow-sm dark:bg-lime-400 dark:text-slate-950'
                                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
                            }`}
                        >
                            <Package className="h-3 w-3" />
                            Katalog SSH ({sshCount})
                        </button>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    {catalogMode === 'ptk' && ptkRoleFilter === 'tendik' && ptkCount === 0 && ptkTotalHonorer > 0 && (
                        <button
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => setIncludeAllPtk(true)}
                            className="rounded-lg bg-amber-100 px-2 py-1 text-[10px] font-extrabold text-amber-800 transition hover:bg-amber-200 dark:bg-amber-400/15 dark:text-amber-300"
                        >
                            Tampilkan Semua PTK ({ptkTotalHonorer})
                        </button>
                    )}
                    <a
                        href={`${vRoute('data-ptk.index')}?year=${encodeURIComponent(String(year))}`}
                        target="_blank"
                        rel="noreferrer"
                        onMouseDown={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1 text-[10px] font-bold text-brand-600 hover:underline dark:text-brand-300"
                    >
                        Kelola PTK
                        <ExternalLink className="h-3 w-3" />
                    </a>
                </div>
            </div>
        );
    };

    // Case 1: Tahun anggaran belum disinkronkan di Arkas Tools (hanya memblokir non-PTK & non-Honor Manual)
    if (!isYearSynced && !ptkEligible && !honorManualEligible) {
        return (
            <div>
                <div className="flex min-h-[42px] w-full cursor-not-allowed items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-100/80 px-3.5 py-2.5 text-[12px] font-semibold text-slate-400 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-500">
                    <AlertCircle className="h-4 w-4 shrink-0 text-amber-500/80" />
                    <span className="truncate">
                        Form Uraian Arkas nonaktif — Tahun {year} belum disinkronkan di Arkas Tools
                    </span>
                </div>
                <p className="mt-1 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                    Sinkronkan referensi barang tahun {year} pada menu Arkas Tools terlebih dahulu untuk mengaktifkan form ini.
                </p>
            </div>
        );
    }

    // Case 2: Rekening Belanja belum dipilih
    if (!kodeRekening) {
        return (
            <div className="flex min-h-[42px] w-full cursor-not-allowed items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-100/80 px-3.5 py-2.5 text-[12px] font-semibold text-slate-400 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-500">
                <Search className="h-4 w-4 shrink-0 text-slate-400" />
                <span className="truncate">-- Pilih Rekening Belanja terlebih dahulu --</span>
            </div>
        );
    }

    // Case 3A: Mode PTK (Kegiatan 07.12.* + Rekening Honor Guru/Tendik) -> Dropdown NUPTK | Nama persis ARKAS Desktop
    if (catalogMode === 'ptk') {
        const roleText =
            ptkRoleFilter === 'tendik'
                ? 'Tenaga Kependidikan'
                : ptkRoleFilter === 'all'
                    ? 'Guru & Tendik'
                    : 'Guru / Pendidik';

        return (
            <div className="relative" ref={wrapperRef}>
                <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                        {isLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin text-lime-500" />
                        ) : (
                            <Users className="h-4 w-4 text-brand-500 dark:text-brand-300" />
                        )}
                    </div>
                    <input
                        type="text"
                        disabled={disabled}
                        value={searchText}
                        onFocus={() => {
                            if (!disabled) setIsOpen(true);
                        }}
                        onChange={(e) => {
                            setSearchText(e.target.value);
                            setIsUserTyping(true);
                            if (!isOpen) setIsOpen(true);
                        }}
                        placeholder={`Pilih ${roleText} (${ptkItems.length} PTK aktif tahun ${year}) atau ketik Nama / NUPTK...`}
                        className={`min-h-[42px] w-full rounded-xl border bg-white pl-10 pr-9 py-2 text-[12px] font-semibold text-slate-800 shadow-sm transition placeholder:text-slate-400 focus:border-lime-400 focus:outline-none focus:ring-4 focus:ring-lime-200/60 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-lime-400/70 dark:focus:ring-lime-400/10 ${
                            error
                                ? 'border-rose-400 ring-4 ring-rose-100 dark:border-rose-500/50 dark:ring-rose-500/10'
                                : 'border-slate-200/90 hover:border-lime-400 dark:border-white/10 dark:hover:border-lime-400/60'
                        } ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
                    />
                    {(searchText || uraianArkas) && !disabled && (
                        <button
                            type="button"
                            onClick={() => {
                                setSearchText('');
                                setIsUserTyping(true);
                                onClear();
                                setIsOpen(true);
                            }}
                            className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                            title="Hapus pilihan"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    )}
                </div>

                {/* Info Badge ketika PTK sudah dipilih */}
                {uraianArkas && (
                    <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                        <span className="inline-flex items-center gap-1 rounded-lg bg-brand-50 px-2 py-0.5 font-bold text-brand-700 dark:bg-brand-500/15 dark:text-brand-300">
                            <Check className="h-3 w-3" />
                            Mode PTK ARKAS ({year})
                        </span>
                        <span className="rounded-lg bg-emerald-50 px-2 py-0.5 font-bold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                            Tanpa batas atas SSH
                        </span>
                    </div>
                )}

                {!ptkSyncedYear && !isLoading && ptkItems.length === 0 && (
                    <p className="mt-1 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                        Data PTK Tahun {year} belum tersedia. Sinkronkan dari ARKAS atau tambah manual di menu{' '}
                        <a
                            href={`${vRoute('data-ptk.index')}?year=${encodeURIComponent(String(year))}`}
                            target="_blank"
                            rel="noreferrer"
                            className="underline hover:text-amber-700"
                        >
                            Data Master → Data PTK
                        </a>
                        .
                    </p>
                )}

                {/* Dropdown Panel 2 Kolom NUPTK | Nama persis ARKAS Desktop */}
                {isOpen && !disabled && (
                    <div className="absolute left-0 z-50 mt-1 flex max-h-[360px] w-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-float dark:border-white/10 dark:bg-[#15131F]">
                        {renderModeSwitchBar()}

                        {/* Table Header: NUPTK | Nama */}
                        <div className="grid grid-cols-12 border-b border-slate-100 bg-slate-50/90 px-3 py-2 text-[10px] font-extrabold uppercase tracking-[0.1em] text-slate-600 dark:border-white/5 dark:bg-white/[0.04] dark:text-slate-400">
                            <div className="col-span-4 px-1.5">NUPTK</div>
                            <div className="col-span-8 px-1.5">Nama</div>
                        </div>

                        {/* PTK Options List */}
                        <div className="sikas-scroll max-h-[260px] overflow-y-auto">
                            {filteredPtkItems.length > 0 ? (
                                filteredPtkItems.map((ptk) => {
                                    const isSelected =
                                        uraianArkas.trim().toLowerCase() === ptk.formatted_uraian.toLowerCase() ||
                                        uraianArkas.trim().toLowerCase() === ptk.nama.toLowerCase();

                                    return (
                                        <div
                                            key={ptk.id}
                                            onMouseDown={(e) => e.preventDefault()}
                                            onClick={() => handleChoosePtk(ptk)}
                                            className={`grid cursor-pointer grid-cols-12 items-center border-b border-slate-100 px-3 py-2.5 text-[11.5px] transition-colors last:border-0 hover:bg-lime-50/70 dark:border-white/5 dark:hover:bg-white/5 ${
                                                isSelected ? 'bg-lime-100/60 dark:bg-lime-400/10' : ''
                                            }`}
                                        >
                                            <div className="col-span-4 truncate px-1.5 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                                                {ptk.nuptk ? highlightMatch(ptk.nuptk, activeFilterQuery) : '-'}
                                            </div>
                                            <div className="col-span-8 flex items-center justify-between gap-2 px-1.5">
                                                <span className="font-semibold text-slate-800 dark:text-slate-100">
                                                    {highlightMatch(ptk.nama, activeFilterQuery)}
                                                </span>
                                                <span className="flex shrink-0 items-center gap-1">
                                                    {ptkRoleFilter === 'all' && (
                                                        <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[9.5px] font-bold text-slate-600 dark:bg-white/10 dark:text-slate-300">
                                                            {ptk.jenis_ptk_arkas === 10 ? 'Guru' : 'Tendik'}
                                                        </span>
                                                    )}
                                                    {ptk.sumber === 'manual' && (
                                                        <span className="rounded-md bg-brand-50 px-1.5 py-0.5 text-[9.5px] font-bold text-brand-700 dark:bg-brand-500/15 dark:text-brand-300">
                                                            Manual
                                                        </span>
                                                    )}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="px-4 py-5 text-center text-[11px] font-semibold text-slate-400 dark:text-slate-500">
                                    {isLoading
                                        ? 'Memuat daftar PTK...'
                                        : ptkItems.length === 0
                                            ? `Belum ada data ${roleText} aktif untuk Tahun ${year}.`
                                            : 'Tidak ada PTK yang cocok dengan kata kunci tersebut.'}
                                </div>
                            )}

                            {/* Opsi pakai ketikan manual jika nama tidak ada di daftar PTK */}
                            {isUserTyping && searchText.trim() !== '' && (
                                <button
                                    type="button"
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={handleApplyManualInPtkMode}
                                    className="flex w-full items-center gap-2 border-t border-slate-100 bg-slate-50/70 px-4 py-2.5 text-left text-[11px] font-bold text-slate-700 transition hover:bg-lime-50 dark:border-white/5 dark:bg-white/[0.03] dark:text-slate-200 dark:hover:bg-white/10"
                                >
                                    <Edit3 className="h-3.5 w-3.5 text-lime-600 dark:text-lime-400" />
                                    <span>
                                        Gunakan uraian manual: <strong className="text-slate-950 dark:text-white">&ldquo;{searchText.trim()}&rdquo;</strong>
                                    </span>
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {error && <p className="mt-1 text-[10px] font-semibold text-rose-500">{error}</p>}
            </div>
        );
    }

    // Case 3B: Mode Ketik Manual (Honor 07.12.02.-07.12.04. atau rekening tanpa katalog barang)
    if (catalogMode === 'manual' || (!isLoading && !hasCatalog)) {
        return (
            <div>
                <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                        <Edit3 className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                    </div>
                    <input
                        type="text"
                        disabled={disabled}
                        value={uraianArkas}
                        onChange={(e) => onManualChange(e.target.value)}
                        placeholder={
                            isHonorManual
                                ? 'Ketik nama / uraian penerima honor secara manual (sesuai ARKAS)...'
                                : `Ketik Uraian Arkas secara manual untuk rekening ${kodeRekening}...`
                        }
                        className={`min-h-[42px] w-full rounded-xl border bg-white pl-10 pr-9 py-2 text-[12px] font-semibold text-slate-800 shadow-sm transition placeholder:text-slate-400 focus:border-lime-400 focus:outline-none focus:ring-4 focus:ring-lime-200/60 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-lime-400/70 dark:focus:ring-lime-400/10 ${
                            error
                                ? 'border-rose-400 ring-4 ring-rose-100 dark:border-rose-500/50 dark:ring-rose-500/10'
                                : 'border-slate-200/90 dark:border-white/10'
                        } ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
                    />
                    {uraianArkas && !disabled && (
                        <button
                            type="button"
                            onClick={onClear}
                            className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                            title="Bersihkan Uraian Arkas"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    )}
                </div>
                <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500">
                        {isHonorManual ? (
                            <>
                                Kegiatan honor <span className="font-bold text-slate-600 dark:text-slate-300">{normalizeKegiatanCode(kodeKegiatan)}</span> menggunakan input Uraian Arkas manual (sesuai ARKAS Desktop, tanpa batas atas SSH).
                            </>
                        ) : isBukuCatalog ? (
                            <>
                                Katalog buku ARKAS Tahun <span className="font-bold text-slate-600 dark:text-slate-300">{year}</span> belum tersedia untuk rekening{' '}
                                <span className="font-bold text-slate-600 dark:text-slate-300">{kodeRekening}</span> — silakan ketik uraian buku secara manual.
                            </>
                        ) : (
                            <>
                                Rekening <span className="font-bold text-slate-600 dark:text-slate-300">{kodeRekening}</span> tidak memiliki katalog acuan barang di Arkas Tools ({year}) — silakan ketik uraian secara manual.
                            </>
                        )}
                    </p>
                </div>
                {error && <p className="mt-1 text-[10px] font-semibold text-rose-500">{error}</p>}
            </div>
        );
    }

    // Case 3C: Rekening Belanja ADA di katalog Arkas Tools (SSH) -> Searchable Combobox seperti ARKAS Desktop
    return (
        <div className="relative" ref={wrapperRef}>
            <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                    {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin text-lime-500" />
                    ) : (
                        <Search className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                    )}
                </div>
                <input
                    type="text"
                    disabled={disabled}
                    value={searchText}
                    onFocus={() => {
                        if (!disabled) setIsOpen(true);
                    }}
                    onChange={(e) => {
                        setSearchText(e.target.value);
                        setIsUserTyping(true);
                        if (!isOpen) setIsOpen(true);
                    }}
                    placeholder={
                        isBukuCatalog
                            ? `Ketik judul buku untuk mencari (${totalItems.toLocaleString('id-ID')} buku aktif ARKAS)...`
                            : `Ketik untuk mencari Uraian Arkas (${totalItems} item pada rekening ${kodeRekening})...`
                    }
                    className={`min-h-[42px] w-full rounded-xl border bg-white pl-10 pr-9 py-2 text-[12px] font-semibold text-slate-800 shadow-sm transition placeholder:text-slate-400 focus:border-lime-400 focus:outline-none focus:ring-4 focus:ring-lime-200/60 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-lime-400/70 dark:focus:ring-lime-400/10 ${
                        error
                            ? 'border-rose-400 ring-4 ring-rose-100 dark:border-rose-500/50 dark:ring-rose-500/10'
                            : 'border-slate-200/90 hover:border-lime-400 dark:border-white/10 dark:hover:border-lime-400/60'
                    } ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
                />
                {(searchText || uraianArkas) && !disabled && (
                    <button
                        type="button"
                        onClick={() => {
                            setSearchText('');
                            setIsUserTyping(true);
                            onClear();
                            setIsOpen(true);
                        }}
                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                        title="Hapus pilihan"
                    >
                        <X className="h-4 w-4" />
                    </button>
                )}
            </div>

            {/* Info Badge ketika item katalog sudah dipilih */}
            {uraianArkas && (
                <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                    <span className="inline-flex items-center gap-1 rounded-lg bg-lime-50 px-2 py-0.5 font-bold text-lime-700 dark:bg-lime-400/10 dark:text-lime-300">
                        <Check className="h-3 w-3" />
                        Terhubung ke Katalog Arkas ({year})
                    </span>
                    {idBarangArkas && (
                        <span className="rounded-lg bg-slate-100 px-2 py-0.5 font-mono text-[9.5px] text-slate-600 dark:bg-white/5 dark:text-slate-300">
                            Kode: {idBarangArkas}
                        </span>
                    )}
                    {batasAtas !== null && batasAtas > 0 && (
                        <span className="rounded-lg bg-pastel-sky px-2 py-0.5 font-extrabold text-sky text-sikas-num dark:bg-sky/10 dark:text-sky">
                            Batas Atas: Rp {new Intl.NumberFormat('id-ID').format(batasAtas)}
                        </span>
                    )}
                </div>
            )}

            {/* Dropdown Panel ala ARKAS Desktop */}
            {isOpen && !disabled && (
                <div className="absolute left-0 z-50 mt-1 flex max-h-[360px] w-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-float dark:border-white/10 dark:bg-[#15131F]">
                    {renderModeSwitchBar()}

                    {isBukuCatalog && (
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-sky-100 bg-pastel-sky/50 px-3 py-1.5 text-[10px] font-bold text-sky-800 dark:border-sky/20 dark:bg-sky/10 dark:text-sky-200">
                            <span className="inline-flex items-center gap-1.5">
                                <BookOpen className="h-3.5 w-3.5 shrink-0" />
                                Katalog Buku Kemendikbud / ARKAS {year} ({totalItems.toLocaleString('id-ID')} judul aktif)
                            </span>
                            <span className="text-[9.5px] font-semibold opacity-80">Ketik judul untuk filter cepat</span>
                        </div>
                    )}

                    {/* Table Header */}
                    <div className="grid grid-cols-12 border-b border-slate-100 bg-slate-50/90 px-3 py-2 text-[10px] font-extrabold uppercase tracking-[0.1em] text-slate-600 dark:border-white/5 dark:bg-white/[0.04] dark:text-slate-400">
                        <div className="col-span-3 px-1.5">Kode</div>
                        <div className="col-span-5 px-1.5">Uraian</div>
                        <div className="col-span-2 px-1.5">Satuan</div>
                        <div className="col-span-2 px-1.5 text-right">Batas Atas</div>
                    </div>

                    {/* Options List */}
                    <div className="sikas-scroll max-h-[260px] overflow-y-auto">
                        {filteredItems.length > 0 ? (
                            filteredItems.map((item) => {
                                const isSelected =
                                    (idBarangArkas && item.id_barang === idBarangArkas) ||
                                    (!idBarangArkas && uraianArkas && item.nama_barang === uraianArkas);

                                return (
                                    <div
                                        key={`${item.id_barang}-${item.tahun}`}
                                        onMouseDown={(e) => e.preventDefault()}
                                        onClick={() => {
                                            onSelectCatalogItem(item);
                                            setSearchText(item.nama_barang);
                                            setIsUserTyping(false);
                                            setIsOpen(false);
                                        }}
                                        className={`grid cursor-pointer grid-cols-12 items-center border-b border-slate-100 px-3 py-2.5 text-[11.5px] transition-colors last:border-0 hover:bg-lime-50/70 dark:border-white/5 dark:hover:bg-white/5 ${
                                            isSelected ? 'bg-lime-100/60 dark:bg-lime-400/10' : ''
                                        }`}
                                    >
                                        <div
                                            className="col-span-3 truncate px-1.5 font-mono text-[11px] text-slate-600 dark:text-slate-400"
                                            title={item.id_barang}
                                        >
                                            {formatShortKode(item.id_barang)}
                                        </div>
                                        <div className="col-span-5 px-1.5 font-medium text-slate-800 dark:text-slate-200">
                                            {highlightMatch(item.nama_barang, activeFilterQuery)}
                                        </div>
                                        <div className="col-span-2 truncate px-1.5 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                                            {item.satuan || '-'}
                                        </div>
                                        <div className="col-span-2 whitespace-nowrap px-1.5 text-right text-[11px] font-bold text-slate-700 text-sikas-num dark:text-slate-200">
                                            {item.batas_atas > 0
                                                ? `Rp ${new Intl.NumberFormat('id-ID').format(item.batas_atas)}`
                                                : '-'}
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="px-4 py-6 text-center text-[11px] font-semibold text-slate-400 dark:text-slate-500">
                                {isLoading
                                    ? 'Memuat katalog Uraian Arkas...'
                                    : 'Tidak ada Uraian Arkas yang cocok dengan kata kunci tersebut.'}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {error && <p className="mt-1 text-[10px] font-semibold text-rose-500">{error}</p>}
        </div>
    );
}
