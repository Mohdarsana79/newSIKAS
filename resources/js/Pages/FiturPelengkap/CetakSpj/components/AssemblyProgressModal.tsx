import IconTile from '@/Components/ui/IconTile';
import {
    AlertTriangle,
    CheckCircle2,
    Download,
    FileStack,
    FileText,
    Loader2,
    Printer,
    RefreshCw,
    RotateCcw,
    X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import {
    extractSubsetPdfBytes,
    openPdfInNewTab,
    triggerBytesDownload,
} from '../services/spjPdfAssembler';
import type { AssembledBundleResult, AssemblyFailure, AssemblyProgress } from '../types';

interface AssemblyProgressModalProps {
    isOpen: boolean;
    progress: AssemblyProgress;
    failures: AssemblyFailure[];
    result: AssembledBundleResult | null;
    errorMessage: string | null;
    onCancel: () => void;
    onClose: () => void;
    onRetryFailed: (useFallbackDefault: boolean) => void;
    onContinueWithoutFailed: () => void;
}

export default function AssemblyProgressModal({
    isOpen,
    progress,
    failures,
    result,
    errorMessage,
    onCancel,
    onClose,
    onRetryFailed,
    onContinueWithoutFailed,
}: AssemblyProgressModalProps) {
    const [busyExport, setBusyExport] = useState<string | null>(null);

    const isWorking =
        progress.stage === 'fetching_chunks' ||
        progress.stage === 'capturing_cover' ||
        progress.stage === 'building_toc' ||
        progress.stage === 'finalizing';

    useEffect(() => {
        if (!isOpen || isWorking) return;
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [isOpen, isWorking, onClose]);

    if (!isOpen) return null;

    const pct =
        progress.totalCount > 0
            ? Math.min(100, Math.round((progress.completedCount / progress.totalCount) * 100))
            : 0;

    const hasFallbackCandidates = failures.some((f) => f.canFallbackToDefault);

    const handleDownloadSubset = async (
        key: string,
        indices: number[],
        suffix: string,
        openPreview = false,
    ) => {
        if (!result || indices.length === 0) return;
        setBusyExport(key);
        try {
            const bytes = await extractSubsetPdfBytes(result.fullPdfBytes, indices);
            if (openPreview) {
                openPdfInNewTab(bytes);
            } else {
                triggerBytesDownload(bytes, 'application/pdf', `${result.fileBaseName}-${suffix}.pdf`);
            }
        } finally {
            setBusyExport(null);
        }
    };

    return (
        <div
            className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm"
            onClick={() => {
                if (!isWorking) onClose();
            }}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="assembly-progress-title"
                className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-[#15131f]"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-6 py-4 dark:border-white/[0.08] dark:bg-white/[0.025]">
                    <div className="flex items-center gap-3">
                        <IconTile tone={result ? 'mint' : 'ink'} size="md">
                            {isWorking ? (
                                <Loader2 className="animate-spin" />
                            ) : result ? (
                                <CheckCircle2 />
                            ) : (
                                <FileStack />
                            )}
                        </IconTile>
                        <div>
                            <h3
                                id="assembly-progress-title"
                                className="text-base font-extrabold text-slate-900 dark:text-white"
                            >
                                {isWorking && 'Merakit Bendel SPJ Terpadu...'}
                                {progress.stage === 'needs_resolution' && 'Sebagian Dokumen Gagal Diambil'}
                                {progress.stage === 'completed' && 'Bendel SPJ Siap Cetak & Unduh'}
                                {progress.stage === 'cancelled' && 'Proses Perakitan Dibatalkan'}
                                {progress.stage === 'error' && 'Gagal Merakit Bendel SPJ'}
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                {isWorking
                                    ? `${progress.currentLabel} (${progress.completedCount}/${progress.totalCount})`
                                    : result
                                      ? `${result.totalPages} halaman total · ${result.portraitPageCount} Portrait · ${result.landscapePageCount} Landscape`
                                      : 'Penggabungan PDF lokal berbasis pdf-lib'}
                            </p>
                        </div>
                    </div>

                    {!isWorking && (
                        <button
                            type="button"
                            onClick={onClose}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-300 dark:hover:bg-white/[0.1] dark:hover:text-white"
                            aria-label="Tutup modal perakitan"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    )}
                </div>

                {/* Body */}
                <div className="sikas-scroll flex-1 overflow-y-auto p-6">
                    {/* State 1: Working */}
                    {isWorking && (
                        <div className="space-y-5 py-6">
                            <div>
                                <div className="mb-2 flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-200">
                                    <span className="truncate pr-4">{progress.currentLabel}</span>
                                    <span className="sikas-num">{pct}%</span>
                                </div>
                                <div className="h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-white/[0.08]">
                                    <div
                                        className="h-full rounded-full bg-gradient-to-r from-brand-600 to-lime-400 transition-all duration-300"
                                        style={{ width: `${Math.max(5, pct)}%` }}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-3 text-center">
                                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3 dark:border-white/[0.07] dark:bg-white/[0.03]">
                                    <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                                        Berkas Diproses
                                    </div>
                                    <div className="sikas-num mt-1 text-lg font-black text-slate-900 dark:text-white">
                                        {progress.completedCount} / {progress.totalCount}
                                    </div>
                                </div>
                                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3 dark:border-white/[0.07] dark:bg-white/[0.03]">
                                    <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                                        Halaman Terkumpul
                                    </div>
                                    <div className="sikas-num mt-1 text-lg font-black text-brand-700 dark:text-lime-300">
                                        {progress.pagesCollected} hal
                                    </div>
                                </div>
                                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3 dark:border-white/[0.07] dark:bg-white/[0.03]">
                                    <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                                        Tahap Mesin
                                    </div>
                                    <div className="mt-1 text-xs font-extrabold uppercase text-slate-700 dark:text-slate-200">
                                        {progress.stage.replace('_', ' ')}
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-center pt-2">
                                <button
                                    type="button"
                                    onClick={onCancel}
                                    className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-bold text-rose-700 transition hover:bg-rose-100 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300 dark:hover:bg-rose-500/20"
                                >
                                    <X className="h-3.5 w-3.5" />
                                    <span>Batalkan Proses</span>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* State 2: Needs resolution (Resilient Error Handling) */}
                    {progress.stage === 'needs_resolution' && (
                        <div className="space-y-4">
                            <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900 dark:border-amber-400/25 dark:bg-amber-400/10 dark:text-amber-200">
                                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-300" />
                                <div>
                                    <div className="font-extrabold">
                                        {failures.length} dokumen gagal diproses, tetapi dokumen lainnya sudah berhasil diamankan di memori.
                                    </div>
                                    <p className="mt-1 text-amber-800 dark:text-amber-200/80">
                                        Anda dapat mencoba ulang item yang gagal, beralih otomatis ke Format Standar SIKAS (jika gagal karena Template Word/LibreOffice), atau melanjutkan merakit dokumen yang berhasil saja.
                                    </p>
                                </div>
                            </div>

                            <div className="sikas-scroll max-h-56 divide-y divide-slate-100 overflow-y-auto rounded-2xl border border-slate-200 dark:divide-white/[0.06] dark:border-white/10 dark:bg-white/[0.02]">
                                {failures.map((f) => (
                                    <div key={f.task.chunkId} className="px-4 py-3 text-xs">
                                        <div className="font-bold text-slate-900 dark:text-slate-100">
                                            {f.task.chunkLabel}
                                        </div>
                                        <div className="mt-0.5 text-rose-600 dark:text-rose-300">
                                            {f.reason}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => onRetryFailed(false)}
                                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-200 dark:hover:bg-white/[0.1]"
                                >
                                    <RefreshCw className="h-3.5 w-3.5" />
                                    <span>Coba Lagi Item Gagal</span>
                                </button>
                                {hasFallbackCandidates && (
                                    <button
                                        type="button"
                                        onClick={() => onRetryFailed(true)}
                                        className="inline-flex items-center gap-1.5 rounded-xl border border-brand-200 bg-brand-50 px-4 py-2 text-xs font-extrabold text-brand-700 transition hover:bg-brand-100 dark:border-brand-400/30 dark:bg-brand-500/15 dark:text-brand-200 dark:hover:bg-brand-500/25"
                                    >
                                        <RotateCcw className="h-3.5 w-3.5" />
                                        <span>Gunakan Format Bawaan SIKAS</span>
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={onContinueWithoutFailed}
                                    className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-extrabold text-lime-300 transition hover:bg-slate-800 dark:bg-lime-400 dark:text-slate-950 dark:hover:bg-lime-300"
                                >
                                    <span>Lanjut Rakit Tanpa Item Gagal</span>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* State 3: Fatal Error / Cancelled */}
                    {(progress.stage === 'error' || progress.stage === 'cancelled') && (
                        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-center dark:border-rose-500/30 dark:bg-rose-500/10">
                            <AlertTriangle className="mx-auto h-8 w-8 text-rose-500 dark:text-rose-400" />
                            <div className="mt-2 text-sm font-extrabold text-rose-900 dark:text-rose-200">
                                {progress.stage === 'cancelled'
                                    ? 'Perakitan SPJ dibatalkan oleh pengguna.'
                                    : errorMessage || 'Terjadi kesalahan saat merakit PDF.'}
                            </div>
                        </div>
                    )}

                    {/* State 4: Completed Hybrid Output */}
                    {progress.stage === 'completed' && result && (
                        <div className="space-y-5">
                            {/* Hybrid Action Cards */}
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                {/* 1. Full PDF */}
                                <div className="rounded-2xl border border-slate-900 bg-gradient-to-br from-[#232236] via-[#1C1B2B] to-[#13121C] p-4 text-white dark:border-lime-400/30">
                                    <div className="text-[10.5px] font-bold uppercase tracking-wider text-lime-300">
                                        1. Arsip Digital Lengkap
                                    </div>
                                    <div className="sikas-num mt-1 text-lg font-black">
                                        {result.totalPages} Halaman Utuh
                                    </div>
                                    <p className="mt-1 text-[11px] text-white/70">
                                        Cover, Daftar Isi, Pembatas Bab &amp; seluruh SPJ dalam 1 file PDF.
                                    </p>
                                    <div className="mt-3 flex gap-2">
                                        <button
                                            type="button"
                                            onClick={() => openPdfInNewTab(result.fullPdfBytes)}
                                            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-lime-400 px-3 py-2 text-xs font-extrabold text-slate-950 transition hover:bg-lime-300"
                                        >
                                            <Printer className="h-3.5 w-3.5" />
                                            <span>Preview / Cetak</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                triggerBytesDownload(
                                                    result.fullPdfBytes,
                                                    'application/pdf',
                                                    `${result.fileBaseName}-Lengkap.pdf`,
                                                )
                                            }
                                            className="inline-flex items-center justify-center rounded-xl bg-white/15 px-3 py-2 text-xs font-bold text-white transition hover:bg-white/25"
                                            title="Unduh PDF Lengkap"
                                            aria-label="Unduh PDF Lengkap"
                                        >
                                            <Download className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                </div>

                                {/* 2. Portrait Only */}
                                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                                    <div className="text-[10.5px] font-bold uppercase tracking-wider text-brand-700 dark:text-brand-300">
                                        2. Cetak Fisik Portrait
                                    </div>
                                    <div className="sikas-num mt-1 text-lg font-black text-slate-900 dark:text-white">
                                        {result.portraitPageCount} Halaman
                                    </div>
                                    <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                                        Khusus halaman tegak (Cover, Daftar Isi, SP2B, Kwitansi, BAST, SP).
                                    </p>
                                    <div className="mt-3 flex gap-2">
                                        <button
                                            type="button"
                                            disabled={result.portraitPageCount === 0 || busyExport !== null}
                                            onClick={() =>
                                                handleDownloadSubset(
                                                    'portrait_open',
                                                    result.portraitPageIndices,
                                                    'Portrait',
                                                    true,
                                                )
                                            }
                                            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-white px-3 py-2 text-xs font-extrabold text-slate-800 ring-1 ring-slate-200 transition hover:bg-slate-100 disabled:opacity-45 dark:bg-white/[0.06] dark:text-slate-100 dark:ring-white/10 dark:hover:bg-white/[0.12]"
                                        >
                                            <Printer className="h-3.5 w-3.5" />
                                            <span>{busyExport === 'portrait_open' ? '...' : 'Cetak'}</span>
                                        </button>
                                        <button
                                            type="button"
                                            disabled={result.portraitPageCount === 0 || busyExport !== null}
                                            onClick={() =>
                                                handleDownloadSubset(
                                                    'portrait_dl',
                                                    result.portraitPageIndices,
                                                    'Portrait',
                                                    false,
                                                )
                                            }
                                            className="inline-flex items-center justify-center rounded-xl bg-white px-3 py-2 text-xs font-bold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-100 disabled:opacity-45 dark:bg-white/[0.06] dark:text-slate-200 dark:ring-white/10 dark:hover:bg-white/[0.12]"
                                            title="Unduh Paket Portrait"
                                            aria-label="Unduh Paket Portrait"
                                        >
                                            <Download className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                </div>

                                {/* 3. Landscape Only */}
                                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                                    <div className="text-[10.5px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                                        3. Cetak Fisik Landscape
                                    </div>
                                    <div className="sikas-num mt-1 text-lg font-black text-slate-900 dark:text-white">
                                        {result.landscapePageCount} Halaman
                                    </div>
                                    <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                                        Khusus halaman mendatar (RKAS, BKU, Buku Pajak, Realisasi, Tanda Terima).
                                    </p>
                                    <div className="mt-3 flex gap-2">
                                        <button
                                            type="button"
                                            disabled={result.landscapePageCount === 0 || busyExport !== null}
                                            onClick={() =>
                                                handleDownloadSubset(
                                                    'landscape_open',
                                                    result.landscapePageIndices,
                                                    'Landscape',
                                                    true,
                                                )
                                            }
                                            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-white px-3 py-2 text-xs font-extrabold text-slate-800 ring-1 ring-slate-200 transition hover:bg-slate-100 disabled:opacity-45 dark:bg-white/[0.06] dark:text-slate-100 dark:ring-white/10 dark:hover:bg-white/[0.12]"
                                        >
                                            <Printer className="h-3.5 w-3.5" />
                                            <span>{busyExport === 'landscape_open' ? '...' : 'Cetak'}</span>
                                        </button>
                                        <button
                                            type="button"
                                            disabled={result.landscapePageCount === 0 || busyExport !== null}
                                            onClick={() =>
                                                handleDownloadSubset(
                                                    'landscape_dl',
                                                    result.landscapePageIndices,
                                                    'Landscape',
                                                    false,
                                                )
                                            }
                                            className="inline-flex items-center justify-center rounded-xl bg-white px-3 py-2 text-xs font-bold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-100 disabled:opacity-45 dark:bg-white/[0.06] dark:text-slate-200 dark:ring-white/10 dark:hover:bg-white/[0.12]"
                                            title="Unduh Paket Landscape"
                                            aria-label="Unduh Paket Landscape"
                                        >
                                            <Download className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Unduh per Bab */}
                            {result.chapters.length > 0 && (
                                <div className="rounded-2xl border border-slate-200 p-4 dark:border-white/10 dark:bg-white/[0.02]">
                                    <div className="mb-2.5 text-xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                                        4. Unduh / Cetak per Bab (Instan)
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {result.chapters.map((ch) => (
                                            <button
                                                key={ch.chapterKey}
                                                type="button"
                                                disabled={busyExport !== null}
                                                onClick={() =>
                                                    handleDownloadSubset(
                                                        `ch_${ch.chapterKey}`,
                                                        ch.pageIndices,
                                                        `BAB-${ch.roman}`,
                                                        false,
                                                    )
                                                }
                                                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200 dark:hover:border-lime-400/40 dark:hover:bg-lime-400/10 dark:hover:text-lime-300"
                                            >
                                                <Download className="h-3 w-3" />
                                                <span>
                                                    BAB {ch.roman} ({ch.pageCount} hal)
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Ringkasan Daftar Isi Aktual */}
                            {result.tocEntries.length > 0 && (
                                <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10">
                                    <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-4 py-2.5 dark:border-white/[0.07] dark:bg-white/[0.03]">
                                        <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-slate-700 dark:text-slate-200">
                                            <FileText className="h-3.5 w-3.5 text-brand-600 dark:text-lime-300" />
                                            <span>Daftar Isi Aktual (Hasil Hitungan Halaman)</span>
                                        </span>
                                        <span className="sikas-num text-[11px] font-bold text-slate-500 dark:text-slate-400">
                                            Hal. 1 – {result.totalPages}
                                        </span>
                                    </div>
                                    <div className="sikas-scroll max-h-52 divide-y divide-slate-100 overflow-y-auto px-4 py-2 text-xs dark:divide-white/[0.06]">
                                        {result.tocEntries.map((entry, i) => (
                                            <div
                                                key={`${entry.chapterKey}-${entry.title}-${i}`}
                                                className={`flex items-center justify-between py-1.5 ${
                                                    entry.kind === 'chapter'
                                                        ? 'font-extrabold text-slate-900 dark:text-white'
                                                        : 'pl-4 text-slate-600 dark:text-slate-300'
                                                }`}
                                            >
                                                <span className="truncate pr-3">{entry.title}</span>
                                                <span className="sikas-num shrink-0 font-mono text-[11px] font-bold text-brand-700 dark:text-lime-300">
                                                    Hal. {entry.pageNumber}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
