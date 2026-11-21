import { useMemo, useState } from 'react';

import { cn } from '@/lib/utils';
import {
    type ChangeStatus,
    type PublicRkaProgramNode,
    type PublicRkaSubProgramNode,
    type PublicRkaTahapanData,
    type PublicRkaUraianNode,
    type PublicSekolah,
    type RkaJenis,
    type RkaTahapFilter,
    type RkaViewMode,
    formatRupiah,
    formatVolume,
} from '../types';
import RkaTahapanOfficialTable from './RkaTahapanOfficialTable';

interface RkaTahapanExplorerProps {
    rkaJenis: RkaJenis;
    rkaViewMode: RkaViewMode;
    rkaData: PublicRkaTahapanData | null;
    isLoading: boolean;
    error: string | null;
    hasRkasAwal: boolean;
    hasRkasPerubahan: boolean;
    supportsPerubahan: boolean;
    sekolah: PublicSekolah;
    penanggungJawab: {
        kepala_sekolah: string;
        bendahara: string;
        komite: string;
    };
    onChangeJenis: (jenis: RkaJenis) => void;
    onChangeViewMode: (mode: RkaViewMode) => void;
    onRetry: () => void;
}

export default function RkaTahapanExplorer({
    rkaJenis,
    rkaViewMode,
    rkaData,
    isLoading,
    error,
    hasRkasAwal,
    hasRkasPerubahan,
    supportsPerubahan,
    sekolah,
    penanggungJawab,
    onChangeJenis,
    onChangeViewMode,
    onRetry,
}: RkaTahapanExplorerProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [tahapFilter, setTahapFilter] = useState<RkaTahapFilter>('all');
    const [onlyChanged, setOnlyChanged] = useState(false);
    const [expandedPrograms, setExpandedPrograms] = useState<Record<string, boolean>>({});
    const [expandedSubs, setExpandedSubs] = useState<Record<string, boolean>>({});
    const [expandedUraians, setExpandedUraians] = useState<Record<string, boolean>>({});

    const isPerubahan = rkaJenis === 'perubahan';

    // Filter hierarki RKA di sisi klien secara instan tanpa menimpa total asli
    const filteredPrograms = useMemo<PublicRkaProgramNode[]>(() => {
        if (!rkaData?.meta.has_data) {
            return [];
        }

        const q = searchQuery.trim().toLowerCase();

        return (rkaData.programs || [])
            .map((prog) => {
                const progMatches =
                    q !== '' &&
                    (prog.kode.toLowerCase().includes(q) || prog.uraian.toLowerCase().includes(q));

                const nextSubs: PublicRkaSubProgramNode[] = prog.sub_programs
                    .map((sub) => {
                        const subMatches =
                            progMatches ||
                            (q !== '' &&
                                (sub.kode.toLowerCase().includes(q) || sub.uraian.toLowerCase().includes(q)));

                        const nextUrs: PublicRkaUraianNode[] = sub.uraian_programs
                            .map((ur) => {
                                const urMatches =
                                    subMatches ||
                                    (q !== '' &&
                                        (ur.kode.toLowerCase().includes(q) || ur.uraian.toLowerCase().includes(q)));

                                const nextItems = ur.items.filter((item) => {
                                    if (tahapFilter === 'tahap1' && item.tahap1 <= 0) {
                                        return false;
                                    }
                                    if (tahapFilter === 'tahap2' && item.tahap2 <= 0) {
                                        return false;
                                    }
                                    if (isPerubahan && onlyChanged && item.status_perubahan === 'tetap') {
                                        return false;
                                    }
                                    if (q === '' || urMatches) {
                                        return true;
                                    }
                                    return (
                                        item.uraian.toLowerCase().includes(q) ||
                                        item.kode_rekening.toLowerCase().includes(q) ||
                                        item.kode_kegiatan.toLowerCase().includes(q)
                                    );
                                });

                                if (nextItems.length === 0) return null;

                                return {
                                    ...ur,
                                    jumlah_murni: nextItems.reduce((a, b) => a + b.jumlah_murni, 0),
                                    jumlah: nextItems.reduce((a, b) => a + b.jumlah, 0),
                                    bertambah: nextItems.reduce((a, b) => a + b.bertambah, 0),
                                    berkurang: nextItems.reduce((a, b) => a + b.berkurang, 0),
                                    tahap1: nextItems.reduce((a, b) => a + b.tahap1, 0),
                                    tahap2: nextItems.reduce((a, b) => a + b.tahap2, 0),
                                    items: nextItems,
                                };
                            })
                            .filter((x): x is PublicRkaUraianNode => x !== null);

                        if (nextUrs.length === 0) return null;

                        return {
                            ...sub,
                            jumlah_murni: nextUrs.reduce((a, b) => a + b.jumlah_murni, 0),
                            jumlah: nextUrs.reduce((a, b) => a + b.jumlah, 0),
                            bertambah: nextUrs.reduce((a, b) => a + b.bertambah, 0),
                            berkurang: nextUrs.reduce((a, b) => a + b.berkurang, 0),
                            tahap1: nextUrs.reduce((a, b) => a + b.tahap1, 0),
                            tahap2: nextUrs.reduce((a, b) => a + b.tahap2, 0),
                            uraian_programs: nextUrs,
                        };
                    })
                    .filter((x): x is PublicRkaSubProgramNode => x !== null);

                if (nextSubs.length === 0) return null;

                return {
                    ...prog,
                    jumlah_murni: nextSubs.reduce((a, b) => a + b.jumlah_murni, 0),
                    jumlah: nextSubs.reduce((a, b) => a + b.jumlah, 0),
                    bertambah: nextSubs.reduce((a, b) => a + b.bertambah, 0),
                    berkurang: nextSubs.reduce((a, b) => a + b.berkurang, 0),
                    tahap1: nextSubs.reduce((a, b) => a + b.tahap1, 0),
                    tahap2: nextSubs.reduce((a, b) => a + b.tahap2, 0),
                    sub_programs: nextSubs,
                };
            })
            .filter((x): x is PublicRkaProgramNode => x !== null);
    }, [rkaData, searchQuery, tahapFilter, onlyChanged, isPerubahan]);

    const filteredItemCount = useMemo(
        () =>
            filteredPrograms.reduce(
                (acc, prog) =>
                    acc +
                    prog.sub_programs.reduce(
                        (sAcc, sub) =>
                            sAcc + sub.uraian_programs.reduce((uAcc, ur) => uAcc + ur.items.length, 0),
                        0,
                    ),
                0,
            ),
        [filteredPrograms],
    );

    const isFilterAutoExpand = searchQuery.trim() !== '' || (isPerubahan && onlyChanged);

    const isProgramExpanded = (kode: string, index: number): boolean => {
        if (isFilterAutoExpand) return true;
        if (kode in expandedPrograms) return expandedPrograms[kode];
        return index === 0;
    };

    const isSubExpanded = (kode: string): boolean => {
        if (isFilterAutoExpand) return true;
        if (kode in expandedSubs) return expandedSubs[kode];
        return true;
    };

    const isUraianExpanded = (kode: string): boolean => {
        if (isFilterAutoExpand) return true;
        if (kode in expandedUraians) return expandedUraians[kode];
        return true;
    };

    const toggleProgram = (kode: string, currentlyExpanded: boolean) => {
        setExpandedPrograms((prev) => ({ ...prev, [kode]: !currentlyExpanded }));
    };

    const toggleSub = (kode: string, currentlyExpanded: boolean) => {
        setExpandedSubs((prev) => ({ ...prev, [kode]: !currentlyExpanded }));
    };

    const toggleUraian = (kode: string, currentlyExpanded: boolean) => {
        setExpandedUraians((prev) => ({ ...prev, [kode]: !currentlyExpanded }));
    };

    const expandAll = () => {
        const nextProg: Record<string, boolean> = {};
        const nextSub: Record<string, boolean> = {};
        const nextUr: Record<string, boolean> = {};
        filteredPrograms.forEach((p) => {
            nextProg[p.kode] = true;
            p.sub_programs.forEach((s) => {
                nextSub[s.kode] = true;
                s.uraian_programs.forEach((u) => {
                    nextUr[u.kode] = true;
                });
            });
        });
        setExpandedPrograms(nextProg);
        setExpandedSubs(nextSub);
        setExpandedUraians(nextUr);
    };

    const collapseAll = () => {
        const nextProg: Record<string, boolean> = {};
        const nextSub: Record<string, boolean> = {};
        const nextUr: Record<string, boolean> = {};
        filteredPrograms.forEach((p) => {
            nextProg[p.kode] = false;
            p.sub_programs.forEach((s) => {
                nextSub[s.kode] = false;
                s.uraian_programs.forEach((u) => {
                    nextUr[u.kode] = false;
                });
            });
        });
        setExpandedPrograms(nextProg);
        setExpandedSubs(nextSub);
        setExpandedUraians(nextUr);
    };

    const totalBaseForShare = Math.max(rkaData?.totals.jumlah ?? 0, 1);

    return (
        <section id="rka-tahapan" className="relative border-t border-[#DCEBEB] bg-[#F1F8F8]/70 py-16 dark:border-white/10 dark:bg-[#071A22]/80 print:hidden">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                {/* Header Section */}
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#14535E] dark:text-[#8BE6DC]">
                            Rincian Rencana Kegiatan &amp; Anggaran
                        </p>
                        <h2 className="mt-1.5 font-sans text-2xl font-extrabold tracking-[-0.025em] text-[#08222B] dark:text-white sm:text-3xl">
                            Penjelajah RKA Tahapan (RKAS Awal &amp; RKAS Perubahan)
                        </h2>
                        <p className="mt-1.5 max-w-2xl text-sm text-[#4A6670] dark:text-[#94B8C2]">
                            Telusuri rincian alokasi belanja per program sekolah, pembagian Tahap 1 (Jan–Jun) dan Tahap
                            2 (Jul–Des), serta perbandingan perubahan anggaran secara terbuka.
                        </p>
                    </div>

                    {/* Switch Mode Tampilan */}
                    <div className="inline-flex self-start rounded-2xl border border-[#CBE0E0] bg-white p-1 shadow-sm dark:border-[#8BE6DC]/20 dark:bg-[#0B222C]">
                        <button
                            type="button"
                            onClick={() => onChangeViewMode('friendly')}
                            className={cn(
                                'rounded-xl px-3.5 py-2 text-xs font-bold transition-all',
                                rkaViewMode === 'friendly'
                                    ? 'bg-[#08222B] text-[#8BE6DC] shadow-sm dark:bg-[#8BE6DC] dark:text-[#06222B]'
                                    : 'text-[#4A6670] hover:text-[#08222B] dark:text-[#94B8C2] dark:hover:text-white',
                            )}
                        >
                            Ringkas (Ramah Masyarakat)
                        </button>
                        <button
                            type="button"
                            onClick={() => onChangeViewMode('official')}
                            className={cn(
                                'rounded-xl px-3.5 py-2 text-xs font-bold transition-all',
                                rkaViewMode === 'official'
                                    ? 'bg-[#08222B] text-[#8BE6DC] shadow-sm dark:bg-[#8BE6DC] dark:text-[#06222B]'
                                    : 'text-[#4A6670] hover:text-[#08222B] dark:text-[#94B8C2] dark:hover:text-white',
                            )}
                        >
                            Kertas Kerja Resmi
                        </button>
                    </div>
                </div>

                {/* Tab RKAS Awal vs RKAS Perubahan */}
                <div className="mt-8 flex flex-wrap items-center gap-3">
                    <button
                        type="button"
                        onClick={() => onChangeJenis('awal')}
                        className={cn(
                            'inline-flex items-center gap-2.5 rounded-2xl border px-5 py-3 text-sm font-extrabold transition-all',
                            rkaJenis === 'awal'
                                ? 'border-[#14535E] bg-[#14535E] text-white shadow-md dark:border-[#8BE6DC] dark:bg-[#8BE6DC] dark:text-[#06222B]'
                                : 'border-[#CBE0E0] bg-white text-[#08222B] hover:border-[#14535E]/50 dark:border-white/15 dark:bg-[#0B222C] dark:text-white',
                        )}
                    >
                        <span>RKA Tahapan — RKAS Awal</span>
                        <span
                            className={cn(
                                'rounded-full px-2 py-0.5 text-[10px] font-bold',
                                hasRkasAwal
                                    ? rkaJenis === 'awal'
                                        ? 'bg-white/20 text-white dark:bg-[#06222B]/15 dark:text-[#06222B]'
                                        : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200'
                                    : 'bg-slate-200/80 text-slate-500 dark:bg-white/10 dark:text-slate-400',
                            )}
                        >
                            {hasRkasAwal ? 'Tersedia' : 'Kosong'}
                        </span>
                    </button>

                    <button
                        type="button"
                        onClick={() => onChangeJenis('perubahan')}
                        className={cn(
                            'inline-flex items-center gap-2.5 rounded-2xl border px-5 py-3 text-sm font-extrabold transition-all',
                            rkaJenis === 'perubahan'
                                ? 'border-[#14535E] bg-[#14535E] text-white shadow-md dark:border-[#8BE6DC] dark:bg-[#8BE6DC] dark:text-[#06222B]'
                                : 'border-[#CBE0E0] bg-white text-[#08222B] hover:border-[#14535E]/50 dark:border-white/15 dark:bg-[#0B222C] dark:text-white',
                        )}
                    >
                        <span>RKA Tahapan — RKAS Perubahan</span>
                        <span
                            className={cn(
                                'rounded-full px-2 py-0.5 text-[10px] font-bold',
                                !supportsPerubahan
                                    ? 'bg-slate-200/80 text-slate-600 dark:bg-white/10 dark:text-slate-400'
                                    : hasRkasPerubahan
                                      ? rkaJenis === 'perubahan'
                                          ? 'bg-white/20 text-white dark:bg-[#06222B]/15 dark:text-[#06222B]'
                                          : 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200'
                                      : 'bg-slate-200/80 text-slate-500 dark:bg-white/10 dark:text-slate-400',
                            )}
                        >
                            {!supportsPerubahan
                                ? 'Tidak Berlaku'
                                : hasRkasPerubahan
                                  ? isPerubahan && rkaData?.meta.has_data && rkaData.totals.changed_items > 0
                                      ? `${rkaData.totals.changed_items} berubah`
                                      : 'Tersedia'
                                  : 'Belum Ada'}
                        </span>
                    </button>
                </div>

                {/* Loading / Error / Empty / Data */}
                {isLoading ? (
                    <div className="mt-6 space-y-3 rounded-3xl border border-[#DCEBEB] bg-white p-8 dark:border-white/10 dark:bg-[#0B222C]">
                        <div className="flex items-center gap-3 text-sm font-bold text-[#14535E] dark:text-[#8BE6DC]">
                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                            Memuat rincian RKA Tahapan...
                        </div>
                        <div className="h-14 animate-pulse rounded-2xl bg-[#EAF4F4] dark:bg-white/[0.06]" />
                        <div className="h-14 animate-pulse rounded-2xl bg-[#EAF4F4] dark:bg-white/[0.06]" />
                        <div className="h-14 animate-pulse rounded-2xl bg-[#EAF4F4] dark:bg-white/[0.06]" />
                    </div>
                ) : error ? (
                    <div className="mt-6 rounded-3xl border border-rose-200 bg-rose-50 p-8 text-center dark:border-rose-400/30 dark:bg-rose-500/10">
                        <p className="text-sm font-bold text-rose-800 dark:text-rose-200">{error}</p>
                        <button
                            type="button"
                            onClick={onRetry}
                            className="mt-4 rounded-full bg-rose-600 px-5 py-2 text-xs font-bold text-white transition hover:bg-rose-700"
                        >
                            Muat Ulang RKA Tahapan
                        </button>
                    </div>
                ) : !rkaData || !rkaData.meta.has_data ? (
                    <div className="mt-6 rounded-3xl border border-dashed border-[#C7DFDF] bg-white/90 p-10 text-center dark:border-white/15 dark:bg-[#0B222C]">
                        <p className="text-base font-bold text-[#08222B] dark:text-white">
                            {rkaData?.meta.message || 'Rincian RKA Tahapan belum tersedia.'}
                        </p>
                        {isPerubahan && hasRkasAwal && (
                            <button
                                type="button"
                                onClick={() => onChangeJenis('awal')}
                                className="mt-4 rounded-full bg-[#14535E] px-5 py-2.5 text-xs font-bold text-white transition hover:bg-[#0E3F48] dark:bg-[#8BE6DC] dark:text-[#06222B]"
                            >
                                Lihat RKA Tahapan RKAS Awal
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="mt-6 space-y-5">
                        {/* Kartu Ringkasan RKA Tahapan */}
                        {isPerubahan ? (
                            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                                <SummaryMiniCard label="Total RKAS Awal" value={formatRupiah(rkaData.totals.jumlah_murni)} />
                                <SummaryMiniCard label="Total RKAS Perubahan" value={formatRupiah(rkaData.totals.jumlah)} accent="teal" />
                                <SummaryMiniCard
                                    label="Total Bertambah (+)"
                                    value={`+${formatRupiah(rkaData.totals.bertambah)}`}
                                    accent="emerald"
                                />
                                <SummaryMiniCard
                                    label="Total Berkurang (-)"
                                    value={`-${formatRupiah(rkaData.totals.berkurang)}`}
                                    accent="rose"
                                />
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                <SummaryMiniCard label="Total Anggaran RKA Awal" value={formatRupiah(rkaData.totals.jumlah)} accent="teal" />
                                <SummaryMiniCard label="Alokasi Tahap 1 (Jan–Jun)" value={formatRupiah(rkaData.totals.tahap1)} />
                                <SummaryMiniCard label="Alokasi Tahap 2 (Jul–Des)" value={formatRupiah(rkaData.totals.tahap2)} />
                            </div>
                        )}

                        {/* Toolbar Filter */}
                        <div className="flex flex-col gap-3 rounded-2xl border border-[#DCEBEB] bg-white p-4 shadow-sm dark:border-[#8BE6DC]/15 dark:bg-[#0B222C] lg:flex-row lg:items-center lg:justify-between">
                            <div className="flex flex-1 flex-wrap items-center gap-3">
                                <div className="relative min-w-[220px] flex-1">
                                    <input
                                        type="search"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Cari uraian barang/kegiatan atau kode rekening..."
                                        className="w-full rounded-xl border border-[#CBE0E0] bg-[#F8FBFB] py-2 pl-3.5 pr-3 text-xs font-medium text-[#08222B] placeholder:text-[#6B8790] focus:border-[#14535E] focus:ring-[#14535E] dark:border-white/15 dark:bg-white/[0.05] dark:text-white dark:placeholder:text-white/45"
                                    />
                                </div>

                                <div className="inline-flex rounded-xl border border-[#CBE0E0] bg-[#F4FAFA] p-0.5 dark:border-white/15 dark:bg-white/[0.04]">
                                    {(
                                        [
                                            { key: 'all', label: 'Semua Tahap' },
                                            { key: 'tahap1', label: 'Tahap 1' },
                                            { key: 'tahap2', label: 'Tahap 2' },
                                        ] as const
                                    ).map((opt) => (
                                        <button
                                            key={opt.key}
                                            type="button"
                                            onClick={() => setTahapFilter(opt.key)}
                                            className={cn(
                                                'rounded-lg px-3 py-1.5 text-xs font-bold transition',
                                                tahapFilter === opt.key
                                                    ? 'bg-[#14535E] text-white dark:bg-[#8BE6DC] dark:text-[#06222B]'
                                                    : 'text-[#4A6670] hover:text-[#08222B] dark:text-[#94B8C2] dark:hover:text-white',
                                            )}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>

                                {isPerubahan && (
                                    <button
                                        type="button"
                                        onClick={() => setOnlyChanged((prev) => !prev)}
                                        className={cn(
                                            'inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition',
                                            onlyChanged
                                                ? 'border-amber-400 bg-amber-100 text-amber-900 dark:border-amber-400/50 dark:bg-amber-500/20 dark:text-amber-200'
                                                : 'border-[#CBE0E0] bg-white text-[#4A6670] hover:border-amber-400/60 dark:border-white/15 dark:bg-white/[0.04] dark:text-[#94B8C2]',
                                        )}
                                    >
                                        <span>Hanya yang Berubah</span>
                                        <span className="rounded-full bg-black/10 px-1.5 py-0.5 text-[10px] dark:bg-white/15">
                                            {rkaData.totals.changed_items}
                                        </span>
                                    </button>
                                )}
                            </div>

                            <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-[#4A6670] dark:text-[#94B8C2]">
                                <span>
                                    Menampilkan <strong className="text-[#08222B] dark:text-white">{filteredItemCount}</strong> dari{' '}
                                    <strong className="text-[#08222B] dark:text-white">{rkaData.totals.total_items}</strong> rincian
                                </span>
                                {rkaViewMode === 'friendly' && (
                                    <div className="flex items-center gap-1.5">
                                        <button
                                            type="button"
                                            onClick={expandAll}
                                            className="rounded-lg border border-[#CBE0E0] px-2.5 py-1 font-bold text-[#14535E] hover:bg-[#EAF4F4] dark:border-white/15 dark:text-[#8BE6DC] dark:hover:bg-white/10"
                                        >
                                            Buka Semua
                                        </button>
                                        <button
                                            type="button"
                                            onClick={collapseAll}
                                            className="rounded-lg border border-[#CBE0E0] px-2.5 py-1 font-bold text-[#4A6670] hover:bg-[#EAF4F4] dark:border-white/15 dark:text-[#94B8C2] dark:hover:bg-white/10"
                                        >
                                            Tutup Semua
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {filteredPrograms.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-[#CBE0E0] bg-white p-8 text-center text-sm text-[#4A6670] dark:border-white/15 dark:bg-[#0B222C] dark:text-[#94B8C2]">
                                Tidak ada rincian RKA yang cocok dengan pencarian atau filter Anda.
                            </div>
                        ) : rkaViewMode === 'official' ? (
                            <RkaTahapanOfficialTable
                                data={rkaData}
                                programs={filteredPrograms}
                                sekolah={sekolah}
                                penanggungJawab={penanggungJawab}
                            />
                        ) : (
                            /* Mode 1: Accordion Ramah Masyarakat */
                            <div className="space-y-3">
                                {filteredPrograms.map((program, idx) => {
                                    const expanded = isProgramExpanded(program.kode, idx);
                                    const sharePct = Math.min(100, (program.jumlah / totalBaseForShare) * 100);
                                    const diffNet = program.jumlah - program.jumlah_murni;

                                    return (
                                        <div
                                            key={program.kode}
                                            className="overflow-hidden rounded-2xl border border-[#DCEBEB] bg-white shadow-sm dark:border-[#8BE6DC]/15 dark:bg-[#0B222C]"
                                        >
                                            <button
                                                type="button"
                                                onClick={() => toggleProgram(program.kode, expanded)}
                                                aria-expanded={expanded}
                                                className="flex w-full flex-col gap-3 p-4 text-left transition-colors hover:bg-[#F4FAFA] dark:hover:bg-white/[0.03] sm:flex-row sm:items-center sm:justify-between sm:p-5"
                                            >
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <span className="rounded-lg bg-[#14535E]/10 px-2 py-0.5 font-mono text-xs font-extrabold text-[#14535E] dark:bg-[#8BE6DC]/15 dark:text-[#8BE6DC]">
                                                            Program {program.kode}
                                                        </span>
                                                        <span className="text-[11px] font-semibold text-[#4A6670] dark:text-[#94B8C2]">
                                                            {sharePct.toFixed(1).replace('.', ',')}% dari total anggaran
                                                        </span>
                                                    </div>
                                                    <h3 className="mt-1.5 text-sm font-extrabold text-[#08222B] dark:text-white sm:text-base">
                                                        {program.uraian}
                                                    </h3>
                                                </div>

                                                <div className="flex items-center justify-between gap-4 sm:justify-end">
                                                    <div className="text-left sm:text-right">
                                                        <p className="text-sm font-extrabold text-[#08222B] tabular-nums dark:text-white sm:text-base">
                                                            {formatRupiah(program.jumlah)}
                                                        </p>
                                                        <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-[#4A6670] tabular-nums dark:text-[#94B8C2] sm:justify-end">
                                                            <span>T1: {formatRupiah(program.tahap1)}</span>
                                                            <span>·</span>
                                                            <span>T2: {formatRupiah(program.tahap2)}</span>
                                                            {isPerubahan && diffNet !== 0 && (
                                                                <span
                                                                    className={cn(
                                                                        'rounded-full px-2 py-0.5 font-bold',
                                                                        diffNet > 0
                                                                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200'
                                                                            : 'bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-200',
                                                                    )}
                                                                >
                                                                    {diffNet > 0 ? '+' : '-'}
                                                                    {formatRupiah(Math.abs(diffNet))}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <span
                                                        className={cn(
                                                            'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#CBE0E0] text-[#14535E] transition-transform duration-200 dark:border-white/15 dark:text-[#8BE6DC]',
                                                            expanded && 'rotate-180',
                                                        )}
                                                    >
                                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                                        </svg>
                                                    </span>
                                                </div>
                                            </button>

                                            {expanded && (
                                                <div className="space-y-4 border-t border-[#E6F1F1] bg-[#FAFCFC] p-4 dark:border-white/10 dark:bg-[#081A22]/70 sm:p-5">
                                                    {program.sub_programs.map((sub) => {
                                                        const subOpen = isSubExpanded(sub.kode);
                                                        return (
                                                            <div key={sub.kode} className="space-y-2.5">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => toggleSub(sub.kode, subOpen)}
                                                                    aria-expanded={subOpen}
                                                                    className="flex w-full flex-wrap items-center justify-between gap-2 rounded-xl border-l-4 border-[#14535E] bg-white/70 px-3 py-2 text-left transition hover:bg-white dark:border-[#8BE6DC] dark:bg-white/[0.03] dark:hover:bg-white/[0.06]"
                                                                >
                                                                    <p className="text-xs font-extrabold text-[#08222B] dark:text-white sm:text-sm">
                                                                        <span className="mr-1.5 font-mono text-[#14535E] dark:text-[#8BE6DC]">
                                                                            {sub.kode}
                                                                        </span>
                                                                        {sub.uraian}
                                                                    </p>
                                                                    <span className="inline-flex items-center gap-2 text-xs font-bold text-[#14535E] tabular-nums dark:text-[#8BE6DC]">
                                                                        <span>{formatRupiah(sub.jumlah)}</span>
                                                                        <svg
                                                                            className={cn(
                                                                                'h-3.5 w-3.5 transition-transform duration-200',
                                                                                subOpen && 'rotate-180',
                                                                            )}
                                                                            fill="none"
                                                                            viewBox="0 0 24 24"
                                                                            stroke="currentColor"
                                                                            strokeWidth={2.2}
                                                                        >
                                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                                                        </svg>
                                                                    </span>
                                                                </button>

                                                                {subOpen &&
                                                                    sub.uraian_programs.map((ur) => {
                                                                        const urOpen = isUraianExpanded(ur.kode);
                                                                        return (
                                                                            <div
                                                                                key={ur.kode}
                                                                                className="ml-2 overflow-hidden rounded-xl border border-[#E2EFEF] bg-white dark:border-white/10 dark:bg-[#0B222C] sm:ml-4"
                                                                            >
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => toggleUraian(ur.kode, urOpen)}
                                                                                    aria-expanded={urOpen}
                                                                                    className="flex w-full flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 text-left transition hover:bg-[#F4FAFA] dark:hover:bg-white/[0.04]"
                                                                                >
                                                                                    <p className="text-xs font-bold text-[#14535E] dark:text-[#8BE6DC]">
                                                                                        <span className="mr-1.5 font-mono">{ur.kode}</span>
                                                                                        {ur.uraian}
                                                                                    </p>
                                                                                    <span className="inline-flex items-center gap-2 text-xs font-extrabold text-[#08222B] tabular-nums dark:text-white">
                                                                                        <span>{formatRupiah(ur.jumlah)}</span>
                                                                                        <svg
                                                                                            className={cn(
                                                                                                'h-3.5 w-3.5 text-[#4A6670] transition-transform duration-200 dark:text-[#94B8C2]',
                                                                                                urOpen && 'rotate-180',
                                                                                            )}
                                                                                            fill="none"
                                                                                            viewBox="0 0 24 24"
                                                                                            stroke="currentColor"
                                                                                            strokeWidth={2.2}
                                                                                        >
                                                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                                                                        </svg>
                                                                                    </span>
                                                                                </button>

                                                                                {urOpen && (
                                                                                    <div className="divide-y divide-[#F0F7F7] border-t border-[#EEF6F6] px-3.5 py-2 dark:divide-white/[0.07] dark:border-white/10">
                                                                                        {ur.items.map((item, iIdx) => (
                                                                                            <div
                                                                                                key={`${ur.kode}-${item.kode_rekening}-${iIdx}`}
                                                                                                className="flex flex-col gap-2 py-2.5 first:pt-1 last:pb-1 sm:flex-row sm:items-center sm:justify-between"
                                                                                            >
                                                                                                <div className="min-w-0 flex-1">
                                                                                                    <div className="flex flex-wrap items-center gap-2">
                                                                                                        <p className="text-xs font-bold text-[#08222B] dark:text-white sm:text-[13px]">
                                                                                                            {item.uraian}
                                                                                                        </p>
                                                                                                        {isPerubahan && (
                                                                                                            <ChangeBadge
                                                                                                                status={item.status_perubahan}
                                                                                                                bertambah={item.bertambah}
                                                                                                                berkurang={item.berkurang}
                                                                                                            />
                                                                                                        )}
                                                                                                    </div>
                                                                                                    <p className="mt-0.5 text-[11px] text-[#4A6670] dark:text-[#94B8C2]">
                                                                                                        <span className="font-mono">{item.kode_rekening}</span>
                                                                                                        {' · '}
                                                                                                        {item.volume > 0
                                                                                                            ? `${formatVolume(item.volume)} ${item.satuan} × ${formatRupiah(item.tarif)}`
                                                                                                            : 'Dihapus pada perubahan'}
                                                                                                        {isPerubahan && item.jumlah_murni > 0 && item.jumlah_murni !== item.jumlah && (
                                                                                                            <span className="ml-1.5 text-[#6B8790]">
                                                                                                                (Awal: {formatVolume(item.volume_murni)} {item.satuan} · {formatRupiah(item.jumlah_murni)})
                                                                                                            </span>
                                                                                                        )}
                                                                                                    </p>
                                                                                                </div>

                                                                                                <div className="flex shrink-0 flex-wrap items-center gap-3 text-right tabular-nums sm:flex-col sm:items-end sm:gap-0.5">
                                                                                                    <span className="text-xs font-extrabold text-[#08222B] dark:text-white sm:text-sm">
                                                                                                        {formatRupiah(item.jumlah)}
                                                                                                    </span>
                                                                                                    <span className="text-[11px] font-medium text-[#4A6670] dark:text-[#94B8C2]">
                                                                                                        T1: {formatRupiah(item.tahap1)} · T2: {formatRupiah(item.tahap2)}
                                                                                                    </span>
                                                                                                </div>
                                                                                            </div>
                                                                                        ))}
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        );
                                                                    })}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </section>
    );
}

function SummaryMiniCard({
    label,
    value,
    accent = 'default',
}: {
    label: string;
    value: string;
    accent?: 'default' | 'teal' | 'emerald' | 'rose';
}) {
    const valueClass = {
        default: 'text-[#08222B] dark:text-white',
        teal: 'text-[#14535E] dark:text-[#8BE6DC]',
        emerald: 'text-emerald-700 dark:text-emerald-300',
        rose: 'text-rose-700 dark:text-rose-300',
    }[accent];

    return (
        <div className="rounded-2xl border border-[#DCEBEB] bg-white px-4 py-3.5 shadow-sm dark:border-[#8BE6DC]/15 dark:bg-[#0B222C]">
            <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-[#4A6670] dark:text-[#94B8C2]">
                {label}
            </p>
            <p className={cn('mt-1 truncate text-base font-extrabold tabular-nums sm:text-lg', valueClass)} title={value}>
                {value}
            </p>
        </div>
    );
}

function ChangeBadge({
    status,
    bertambah,
    berkurang,
}: {
    status: ChangeStatus;
    bertambah: number;
    berkurang: number;
}) {
    if (status === 'tetap') {
        return null;
    }
    if (status === 'baru') {
        return (
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-extrabold text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200">
                Baru (+{formatRupiah(bertambah)})
            </span>
        );
    }
    if (status === 'dihapus') {
        return (
            <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-extrabold text-rose-800 dark:bg-rose-500/20 dark:text-rose-200">
                Dihapus (-{formatRupiah(berkurang)})
            </span>
        );
    }
    if (status === 'naik') {
        return (
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-extrabold text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200">
                +{formatRupiah(bertambah)}
            </span>
        );
    }
    return (
        <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-extrabold text-rose-800 dark:bg-rose-500/20 dark:text-rose-200">
            -{formatRupiah(berkurang)}
        </span>
    );
}
