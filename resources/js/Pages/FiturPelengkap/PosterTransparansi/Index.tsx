import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import IconTile from '@/Components/ui/IconTile';
import PageHeader from '@/Components/ui/PageHeader';
import PillTabs from '@/Components/ui/PillTabs';
import StatusBadge from '@/Components/ui/StatusBadge';
import Surface from '@/Components/ui/Surface';
import useVariantRoute from '@/Hooks/useVariantRoute';
import { Head, router } from '@inertiajs/react';
import axios from 'axios';
import {
    AlertTriangle,
    Calendar,
    CheckCircle2,
    Download,
    FileImage,
    Palette,
    Presentation,
    SlidersHorizontal,
    Sparkles,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { exportPosterToPng } from './exportPosterPng';
import { POSTER_PAPER_SIZES, POSTER_PAPER_SIZE_LIST } from './paperSizes';
import PosterCanvas from './Partials/PosterCanvas';
import { POSTER_THEMES, POSTER_THEME_LIST } from './themes';
import type { PosterData, PosterPaperSize, PosterPeriode, PosterThemeKey } from './types';

interface PosterTransparansiPageProps {
    variant: string;
    routePrefix: string;
    posterData: PosterData;
}

const DEFAULT_TRANSPARENCY_NOTE =
    'Informasi, pertanyaan, dan masukan terkait pengelolaan Dana BOSP dapat disampaikan langsung kepada Kepala Sekolah, Bendahara, atau Komite Sekolah.';

export default function PosterTransparansiIndex({
    variant,
    posterData: initialPosterData,
}: PosterTransparansiPageProps) {
    const vRoute = useVariantRoute();
    const [posterData, setPosterData] = useState<PosterData>(initialPosterData);
    const [selectedTahun, setSelectedTahun] = useState<number>(initialPosterData.meta.tahun);
    const [selectedPeriode, setSelectedPeriode] = useState<PosterPeriode>(initialPosterData.meta.periode);
    const [themeKey, setThemeKey] = useState<PosterThemeKey>('neobento');
    const [paperSize, setPaperSize] = useState<PosterPaperSize>('a4');
    const [showSignatures, setShowSignatures] = useState<boolean>(true);
    const [showMonthlyTrend, setShowMonthlyTrend] = useState<boolean>(true);
    const [transparencyNote, setTransparencyNote] = useState<string>(DEFAULT_TRANSPARENCY_NOTE);

    const [isFetching, setIsFetching] = useState<boolean>(false);
    const [isExportingPng, setIsExportingPng] = useState<boolean>(false);
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const posterRef = useRef<HTMLDivElement>(null);
    const previewContainerRef = useRef<HTMLDivElement>(null);
    const [previewScale, setPreviewScale] = useState<number>(1);
    const [naturalPosterHeight, setNaturalPosterHeight] = useState<number>(POSTER_PAPER_SIZES.a4.designHeight);
    const fetchAbortRef = useRef<AbortController | null>(null);

    const activeTheme = POSTER_THEMES[themeKey];
    const activePaper = POSTER_PAPER_SIZES[paperSize];

    useEffect(() => {
        setPosterData(initialPosterData);
        setSelectedTahun(initialPosterData.meta.tahun);
        setSelectedPeriode(initialPosterData.meta.periode);
    }, [initialPosterData]);

    // Hitung skala pratinjau responsif agar lembar kertas selalu pas di dalam panel tanpa terpotong
    useEffect(() => {
        const container = previewContainerRef.current;
        if (!container) return;

        const updateScale = () => {
            const availableWidth = container.clientWidth - 24;
            if (availableWidth > 0 && availableWidth < activePaper.designWidth) {
                setPreviewScale(Math.max(0.42, availableWidth / activePaper.designWidth));
            } else {
                setPreviewScale(1);
            }
        };

        updateScale();
        const observer = new ResizeObserver(updateScale);
        observer.observe(container);

        return () => observer.disconnect();
    }, [activePaper.designWidth]);

    useEffect(() => {
        const sheet = posterRef.current;
        if (!sheet) return;

        const updateHeight = () => {
            if (sheet.offsetHeight > 0) {
                setNaturalPosterHeight(sheet.offsetHeight);
            }
        };

        updateHeight();
        const observer = new ResizeObserver(updateHeight);
        observer.observe(sheet);

        return () => observer.disconnect();
    }, [posterData, paperSize, showSignatures, showMonthlyTrend, transparencyNote]);

    useEffect(() => {
        return () => {
            fetchAbortRef.current?.abort();
        };
    }, []);

    const contentFitScale =
        naturalPosterHeight > activePaper.designHeight ? activePaper.designHeight / naturalPosterHeight : 1;

    const fetchPosterData = async (nextTahun: number, nextPeriode: PosterPeriode) => {
        fetchAbortRef.current?.abort();
        const controller = new AbortController();
        fetchAbortRef.current = controller;

        setIsFetching(true);
        setFeedback(null);

        try {
            const res = await axios.get<{ success: boolean; data: PosterData }>(
                vRoute('api.poster-transparansi.data'),
                {
                    params: {
                        tahun: nextTahun,
                        periode: nextPeriode,
                    },
                    signal: controller.signal,
                },
            );

            if (!controller.signal.aborted && res.data?.success && res.data.data) {
                setPosterData(res.data.data);
            }
        } catch (err) {
            if (!axios.isCancel(err)) {
                setSelectedTahun(posterData.meta.tahun);
                setSelectedPeriode(posterData.meta.periode);
                setFeedback({
                    type: 'error',
                    text: 'Gagal memuat data poster untuk periode yang dipilih.',
                });
            }
        } finally {
            if (!controller.signal.aborted) {
                setIsFetching(false);
            }
        }
    };

    const handleYearChange = (nextTahun: number) => {
        setSelectedTahun(nextTahun);
        void fetchPosterData(nextTahun, selectedPeriode);
    };

    const handlePeriodeChange = (nextPeriode: PosterPeriode) => {
        setSelectedPeriode(nextPeriode);
        void fetchPosterData(selectedTahun, nextPeriode);
    };

    const handleVariantSwitch = (targetVariant: string) => {
        if (targetVariant === variant) return;
        const routeMap: Record<string, string> = {
            reguler: 'poster-transparansi.index',
            kinerja: 'kinerja-poster-transparansi.index',
            silpa: 'silpa-poster-transparansi.index',
            kinerja_silpa: 'kinerja-silpa-poster-transparansi.index',
        };
        const targetRoute = routeMap[targetVariant];
        if (targetRoute) {
            router.visit(route(targetRoute));
        }
    };

    const handleDownloadPng = async () => {
        const node = posterRef.current;
        if (!node || isExportingPng) return;

        setIsExportingPng(true);
        setFeedback(null);

        try {
            await exportPosterToPng({
                node,
                paperSize,
                backgroundColor: activeTheme.pageBg,
                fileName: `poster-transparansi-${posterData.meta.variant}-${posterData.meta.tahun}-${posterData.meta.periode}-${paperSize}.png`,
            });

            setFeedback({
                type: 'success',
                text: `Poster PNG 300 DPI (${activePaper.label} · ${activePaper.exportWidth}×${activePaper.exportHeight} px) berhasil diunduh dan siap dicetak atau dibagikan.`,
            });
        } catch (err) {
            console.error('Gagal mengekspor poster PNG:', err);
            setFeedback({
                type: 'error',
                text: 'Gagal membuat gambar PNG. Silakan coba lagi.',
            });
        } finally {
            setIsExportingPng(false);
        }
    };

    const yearOptions =
        posterData.meta.available_years.length > 0
            ? posterData.meta.available_years
            : [posterData.meta.tahun];

    return (
        <AuthenticatedLayout>
            <Head title="Poster Transparansi BOSP" />

            <div className="space-y-4">
                <PageHeader
                    className="animate-rise"
                    breadcrumb={[
                        { label: 'Dashboard' },
                        { label: 'Fitur Pelengkap' },
                        { label: 'Poster Transparansi' },
                    ]}
                    icon={
                        <IconTile tone="violet" size="lg">
                            <Presentation />
                        </IconTile>
                    }
                    title="Poster Infografis Transparansi BOSP"
                    subtitle="Buat dan unduh poster transparansi anggaran & realisasi BOSP dalam format PNG 300 DPI (A4, A3, F4, Legal, Letter) siap cetak papan pengumuman atau bagikan ke WhatsApp Komite."
                    badge={
                        <StatusBadge tone="lime" dot={false}>
                            <Sparkles className="h-3 w-3" />
                            PNG 300 DPI
                        </StatusBadge>
                    }
                    actions={
                        <button
                            type="button"
                            onClick={() => void handleDownloadPng()}
                            disabled={isExportingPng || isFetching}
                            className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2 text-[12px] font-extrabold text-lime-300 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-lime-400 dark:text-slate-950 dark:hover:bg-lime-300"
                        >
                            <Download className="h-3.5 w-3.5" />
                            {isExportingPng ? `Merender PNG ${activePaper.label}...` : `Unduh PNG HD (${activePaper.label})`}
                        </button>
                    }
                />

                {/* Switcher 4 Varian BOSP */}
                <div className="animate-rise" style={{ animationDelay: '60ms' }}>
                    <Surface padding="sm">
                        <PillTabs
                            ariaLabel="Varian BOSP Poster Transparansi"
                            variant="solid"
                            value={variant}
                            items={[
                                { key: 'reguler', label: 'BOSP Reguler' },
                                { key: 'kinerja', label: 'BOSP Kinerja' },
                                { key: 'silpa', label: 'SiLPA BOSP Reguler' },
                                { key: 'kinerja_silpa', label: 'SiLPA BOSP Kinerja' },
                            ]}
                            onChange={handleVariantSwitch}
                        />
                    </Surface>
                </div>

                {/* Inline Feedback */}
                {feedback && (
                    <div
                        role={feedback.type === 'error' ? 'alert' : 'status'}
                        aria-live="polite"
                        className={`animate-rise flex items-center gap-2.5 rounded-2xl border px-4 py-3 text-[12px] font-bold shadow-sm ${
                            feedback.type === 'success'
                                ? 'border-emerald-200/90 bg-emerald-50/90 text-emerald-800 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-200'
                                : 'border-rose-200/90 bg-rose-50/90 text-rose-800 dark:border-rose-500/25 dark:bg-rose-500/10 dark:text-rose-200'
                        }`}
                    >
                        {feedback.type === 'success' ? (
                            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                            <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
                        )}
                        <span>{feedback.text}</span>
                    </div>
                )}

                {!posterData.meta.has_data && (
                    <div className="animate-rise flex items-center gap-2.5 rounded-2xl border border-amber-200/90 bg-amber-50/90 px-4 py-3 text-[12px] font-bold text-amber-800 shadow-sm dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-200">
                        <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                        <span>
                            Belum ada data penganggaran {posterData.meta.variant_label} untuk Tahun Anggaran{' '}
                            {posterData.meta.tahun}. Silakan pilih varian/tahun lain atau tambahkan penganggaran terlebih dahulu.
                        </span>
                    </div>
                )}

                {/* Studio 2 Kolom: Panel Kontrol + Live Preview Poster */}
                <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
                    {/* Panel Kustomisasi */}
                    <div className="space-y-4 xl:col-span-4">
                        <Surface
                            title="Pengaturan Data & Periode"
                            subtitle="Otomatis menyinkronkan angka resmi BKU & RKAS"
                            icon={
                                <IconTile tone="sky" size="md">
                                    <Calendar />
                                </IconTile>
                            }
                            padding="md"
                        >
                            <div className="space-y-3.5">
                                <div>
                                    <label
                                        htmlFor="poster-tahun-select"
                                        className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400"
                                    >
                                        Tahun Anggaran
                                    </label>
                                    <select
                                        id="poster-tahun-select"
                                        value={selectedTahun}
                                        onChange={(e) => handleYearChange(Number(e.target.value))}
                                        className="w-full rounded-xl border border-slate-200/80 bg-white px-3 py-2 text-[12px] font-bold text-slate-800 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/20 dark:border-white/10 dark:bg-[#1E1D2E] dark:text-white"
                                    >
                                        {yearOptions.map((y) => (
                                            <option key={y} value={y}>
                                                Tahun Anggaran {y}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                                        Periode Publikasi
                                    </span>
                                    <div className="grid grid-cols-3 gap-1.5">
                                        {(
                                            [
                                                { key: 'tahunan', label: 'Tahunan' },
                                                { key: 'tahap_1', label: 'Tahap 1' },
                                                { key: 'tahap_2', label: 'Tahap 2' },
                                            ] as const
                                        ).map((opt) => (
                                            <button
                                                key={opt.key}
                                                type="button"
                                                aria-pressed={selectedPeriode === opt.key}
                                                onClick={() => handlePeriodeChange(opt.key)}
                                                className={`rounded-xl border px-2.5 py-2 text-[11.5px] font-extrabold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/60 ${
                                                    selectedPeriode === opt.key
                                                        ? 'border-slate-900 bg-slate-900 text-lime-300 shadow-sm dark:border-lime-400 dark:bg-lime-400 dark:text-slate-950'
                                                        : 'border-slate-200/80 bg-white text-slate-600 hover:border-slate-300 dark:border-white/10 dark:bg-white/5 dark:text-slate-300'
                                                }`}
                                            >
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </Surface>

                        <Surface
                            title="Tema & Tata Letak Cetak"
                            subtitle="Sesuaikan gaya poster dengan papan pengumuman sekolah"
                            icon={
                                <IconTile tone="violet" size="md">
                                    <Palette />
                                </IconTile>
                            }
                            padding="md"
                        >
                            <div className="space-y-4">
                                {/* 3 Tema Warna */}
                                <div className="space-y-2">
                                    <span className="block text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                                        Pilih Tema Warna
                                    </span>
                                    {POSTER_THEME_LIST.map((t) => {
                                        const active = themeKey === t.key;
                                        return (
                                            <button
                                                key={t.key}
                                                type="button"
                                                aria-pressed={active}
                                                onClick={() => setThemeKey(t.key)}
                                                className={`flex w-full items-center justify-between gap-3 rounded-2xl border p-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/60 ${
                                                    active
                                                        ? 'border-brand-400 bg-brand-50/70 ring-2 ring-brand-400/20 dark:border-lime-400/60 dark:bg-lime-400/10'
                                                        : 'border-slate-200/80 bg-white hover:border-slate-300 dark:border-white/10 dark:bg-white/[0.03]'
                                                }`}
                                            >
                                                <div className="min-w-0">
                                                    <p className="text-[12px] font-extrabold text-slate-900 dark:text-white">
                                                        {t.name}
                                                    </p>
                                                    <p className="text-[10.5px] font-medium text-slate-500 dark:text-slate-400">
                                                        {t.subtitle}
                                                    </p>
                                                </div>
                                                <div className="flex shrink-0 items-center gap-1">
                                                    {t.previewSwatches.map((hex) => (
                                                        <span
                                                            key={hex}
                                                            style={{ backgroundColor: hex }}
                                                            className="h-5 w-5 rounded-full border border-white shadow-sm"
                                                        />
                                                    ))}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Ukuran Kertas Ekspor PNG */}
                                <div>
                                    <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                                        Ukuran Kertas Ekspor (PNG 300 DPI)
                                    </span>
                                    <div className="grid grid-cols-2 gap-2">
                                        {POSTER_PAPER_SIZE_LIST.map((opt) => (
                                            <button
                                                key={opt.key}
                                                type="button"
                                                aria-pressed={paperSize === opt.key}
                                                onClick={() => setPaperSize(opt.key)}
                                                className={`rounded-xl border px-3 py-2 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/60 ${
                                                    paperSize === opt.key
                                                        ? 'border-slate-900 bg-slate-900 text-white dark:border-lime-400 dark:bg-lime-400 dark:text-slate-950'
                                                        : 'border-slate-200/80 bg-white text-slate-700 hover:border-slate-300 dark:border-white/10 dark:bg-white/5 dark:text-slate-200'
                                                }`}
                                            >
                                                <div className="flex items-baseline justify-between gap-1">
                                                    <p className="text-[11.5px] font-extrabold">{opt.label}</p>
                                                    <span
                                                        className={`text-[9px] font-bold tabular-nums ${
                                                            paperSize === opt.key
                                                                ? 'text-lime-300 dark:text-slate-900/80'
                                                                : 'text-slate-400'
                                                        }`}
                                                    >
                                                        {opt.dimensionsMm}
                                                    </span>
                                                </div>
                                                <p
                                                    className={`mt-0.5 text-[9.5px] font-medium ${
                                                        paperSize === opt.key
                                                            ? 'text-white/75 dark:text-slate-900/75'
                                                            : 'text-slate-400'
                                                    }`}
                                                >
                                                    {opt.desc}
                                                </p>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Toggles Elemen Poster */}
                                <div className="space-y-2 border-t border-slate-100 pt-3 dark:border-white/10">
                                    <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                                        <SlidersHorizontal className="h-3 w-3" />
                                        <span>Elemen Poster</span>
                                    </div>

                                    <label className="flex cursor-pointer items-center justify-between gap-2 rounded-xl border border-slate-200/70 bg-slate-50/70 px-3 py-2.5 dark:border-white/10 dark:bg-white/[0.03]">
                                        <span className="text-[11.5px] font-bold text-slate-700 dark:text-slate-200">
                                            Tampilkan Blok Tanda Tangan
                                        </span>
                                        <input
                                            type="checkbox"
                                            checked={showSignatures}
                                            onChange={(e) => setShowSignatures(e.target.checked)}
                                            className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                                        />
                                    </label>

                                    <label className="flex cursor-pointer items-center justify-between gap-2 rounded-xl border border-slate-200/70 bg-slate-50/70 px-3 py-2.5 dark:border-white/10 dark:bg-white/[0.03]">
                                        <span className="text-[11.5px] font-bold text-slate-700 dark:text-slate-200">
                                            Tampilkan Grafik Tren Bulanan
                                        </span>
                                        <input
                                            type="checkbox"
                                            checked={showMonthlyTrend}
                                            onChange={(e) => setShowMonthlyTrend(e.target.checked)}
                                            className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                                        />
                                    </label>
                                </div>

                                {/* Catatan Transparansi Opsional */}
                                <div>
                                    <label
                                        htmlFor="poster-note-input"
                                        className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400"
                                    >
                                        Catatan / Kontak Transparansi (Opsional)
                                    </label>
                                    <textarea
                                        id="poster-note-input"
                                        rows={3}
                                        maxLength={280}
                                        value={transparencyNote}
                                        onChange={(e) => setTransparencyNote(e.target.value)}
                                        placeholder="Kosongkan jika tidak ingin menampilkan kotak catatan..."
                                        className="w-full rounded-xl border border-slate-200/80 bg-white px-3 py-2 text-[11.5px] font-medium text-slate-700 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/20 dark:border-white/10 dark:bg-[#1E1D2E] dark:text-slate-200"
                                    />
                                </div>
                            </div>
                        </Surface>
                    </div>

                    {/* Area Live Preview Poster */}
                    <div className="xl:col-span-8">
                        <div id="transparansi-poster-surface">
                            <Surface
                                title="Pratinjau Langsung Poster"
                                subtitle={`${posterData.meta.variant_label} · ${posterData.meta.periode_label} · ${activePaper.label} (${activePaper.exportWidth}×${activePaper.exportHeight} px · 300 DPI)`}
                                icon={
                                    <IconTile tone="mint" size="md">
                                        <FileImage />
                                    </IconTile>
                                }
                                badge={
                                    isFetching ? (
                                        <StatusBadge tone="info">Memuat data…</StatusBadge>
                                    ) : (
                                        <StatusBadge tone="success">Sinkron Real-time</StatusBadge>
                                    )
                                }
                                padding="md"
                            >
                                <div
                                    id="transparansi-poster-preview-stage"
                                    ref={previewContainerRef}
                                    className="flex justify-center overflow-x-auto rounded-2xl border border-slate-200/80 bg-slate-100/80 p-3 sm:p-4 dark:border-white/10 dark:bg-[#0D0C14]"
                                >
                                    <div
                                        id="transparansi-poster-scale-box"
                                        style={{
                                            width: `${Math.round(activePaper.designWidth * previewScale)}px`,
                                            height: `${Math.round(activePaper.designHeight * previewScale)}px`,
                                            backgroundColor: activeTheme.pageBg,
                                        }}
                                        className="overflow-hidden rounded-[22px] ring-1 ring-slate-200/90 shadow-xl"
                                    >
                                        <div
                                            id="transparansi-poster-preview-wrapper"
                                            style={{
                                                transform: previewScale < 1 ? `scale(${previewScale})` : undefined,
                                                transformOrigin: 'top left',
                                                width: `${activePaper.designWidth}px`,
                                                height: `${activePaper.designHeight}px`,
                                                backgroundColor: activeTheme.pageBg,
                                            }}
                                        >
                                            <div
                                                style={{
                                                    width: `${activePaper.designWidth}px`,
                                                    transform:
                                                        contentFitScale < 1 ? `scale(${contentFitScale})` : undefined,
                                                    transformOrigin: 'top center',
                                                }}
                                            >
                                                <PosterCanvas
                                                    ref={posterRef}
                                                    data={posterData}
                                                    theme={activeTheme}
                                                    paperSize={paperSize}
                                                    framed={false}
                                                    showSignatures={showSignatures}
                                                    showMonthlyTrend={showMonthlyTrend}
                                                    transparencyNote={transparencyNote}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </Surface>
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
