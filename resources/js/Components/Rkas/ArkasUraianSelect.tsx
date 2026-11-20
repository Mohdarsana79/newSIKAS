import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import useVariantRoute from '@/Hooks/useVariantRoute';
import { AlertCircle, Check, Edit3, Loader2, Search, X } from 'lucide-react';

export interface ArkasCatalogItem {
    id_barang: string;
    nama_barang: string;
    kode_rekening: string | null;
    rekening: string | null;
    satuan: string | null;
    batas_atas: number;
    tahun: number;
}

interface ArkasUraianSelectProps {
    year: string | number;
    isYearSynced: boolean;
    kodeRekening: string;
    uraianArkas: string;
    idBarangArkas: string;
    batasAtas: number | null;
    routePrefix?: string;
    disabled?: boolean;
    error?: string;
    onSelectCatalogItem: (item: ArkasCatalogItem) => void;
    onManualChange: (value: string) => void;
    onClear: () => void;
    onBatasAtasResolved?: (batasAtas: number | null) => void;
}

export default function ArkasUraianSelect({
    year,
    isYearSynced,
    kodeRekening,
    uraianArkas,
    idBarangArkas,
    batasAtas,
    routePrefix = '',
    disabled = false,
    error,
    onSelectCatalogItem,
    onManualChange,
    onClear,
    onBatasAtasResolved,
}: ArkasUraianSelectProps) {
    const vRoute = useVariantRoute();
    const [isLoading, setIsLoading] = useState(false);
    const [hasCatalog, setHasCatalog] = useState<boolean>(false);
    const [totalItems, setTotalItems] = useState<number>(0);
    const [catalogItems, setCatalogItems] = useState<ArkasCatalogItem[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [searchText, setSearchText] = useState(uraianArkas || '');
    const [isUserTyping, setIsUserTyping] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

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
                // In catalog mode, restore displayed text to selected uraianArkas on blur
                if (hasCatalog) {
                    setSearchText(uraianArkas || '');
                    setIsUserTyping(false);
                }
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [hasCatalog, uraianArkas]);

    // Initial check whenever year or kodeRekening changes
    useEffect(() => {
        if (!isYearSynced || !kodeRekening) {
            setHasCatalog(false);
            setTotalItems(0);
            setCatalogItems([]);
            return;
        }

        let isCancelled = false;
        const fetchInitialCatalog = async () => {
            setIsLoading(true);
            try {
                const response = await axios.get(vRoute('arkas-tools.by-rekening'), {
                    params: {
                        year,
                        kode_rekening: kodeRekening,
                        id_barang: idBarangArkas || undefined,
                        uraian_arkas: uraianArkas || undefined,
                    },
                });

                if (isCancelled) return;

                if (response.data?.status === 'success') {
                    const catalogExists = Boolean(response.data.has_rekening_catalog);
                    setHasCatalog(catalogExists);
                    setTotalItems(Number(response.data.total_rekening_items || 0));
                    setCatalogItems(response.data.data || []);

                    if (onBatasAtasResolved) {
                        if (catalogExists && response.data.selected_item) {
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
    }, [year, isYearSynced, kodeRekening, routePrefix]);

    // Server-side search when catalog has >150 items and user types in dropdown
    useEffect(() => {
        if (!isOpen || !hasCatalog || !isYearSynced || !kodeRekening || totalItems <= 150) {
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
                        kode_rekening: kodeRekening,
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
    }, [searchText, isUserTyping, isOpen, hasCatalog, isYearSynced, kodeRekening, totalItems, year, routePrefix]);

    // Client-side filter over loaded items (only filter when user actively types a filter query)
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

    // Case 1: Tahun anggaran belum disinkronkan di Arkas Tools
    if (!isYearSynced) {
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

    // Case 3A: Rekening Belanja TIDAK ada di katalog Arkas Tools -> Mode Ketik Manual
    if (!isLoading && !hasCatalog) {
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
                        placeholder={`Ketik Uraian Arkas secara manual untuk rekening ${kodeRekening}...`}
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
                <p className="mt-1 text-[10px] font-medium text-slate-400 dark:text-slate-500">
                    Rekening <span className="font-bold text-slate-600 dark:text-slate-300">{kodeRekening}</span> tidak memiliki katalog acuan barang di Arkas Tools ({year}) — silakan ketik uraian secara manual.
                </p>
                {error && <p className="mt-1 text-[10px] font-semibold text-rose-500">{error}</p>}
            </div>
        );
    }

    // Case 3B: Rekening Belanja ADA di katalog Arkas Tools -> Searchable Combobox seperti ARKAS Desktop
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
                    placeholder={`Ketik untuk mencari Uraian Arkas (${totalItems} item pada rekening ${kodeRekening})...`}
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
                <div className="absolute left-0 z-50 mt-1 flex max-h-[340px] w-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-float dark:border-white/10 dark:bg-[#15131F]">
                    {/* Table Header */}
                    <div className="grid grid-cols-12 border-b border-slate-100 bg-slate-50/90 px-3 py-2 text-[10px] font-extrabold uppercase tracking-[0.1em] text-slate-600 dark:border-white/5 dark:bg-white/[0.04] dark:text-slate-400">
                        <div className="col-span-3 px-1.5">Kode</div>
                        <div className="col-span-5 px-1.5">Uraian</div>
                        <div className="col-span-2 px-1.5">Satuan</div>
                        <div className="col-span-2 px-1.5 text-right">Batas Atas</div>
                    </div>

                    {/* Options List */}
                    <div className="sikas-scroll max-h-[280px] overflow-y-auto">
                        {filteredItems.length > 0 ? (
                            filteredItems.map((item) => {
                                const isSelected =
                                    (idBarangArkas && item.id_barang === idBarangArkas) ||
                                    (!idBarangArkas && uraianArkas && item.nama_barang === uraianArkas);

                                return (
                                    <div
                                        key={`${item.id_barang}-${item.tahun}`}
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
