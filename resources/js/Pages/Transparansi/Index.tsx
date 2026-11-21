import { Head } from '@inertiajs/react';
import axios from 'axios';
import { useCallback, useEffect, useRef, useState } from 'react';

import type { PosterPeriode } from '@/Pages/FiturPelengkap/PosterTransparansi/types';
import type { PageProps } from '@/types';
import PublicPosterSection from './Partials/PublicPosterSection';
import RealisasiOverviewSection from './Partials/RealisasiOverviewSection';
import RkaTahapanExplorer from './Partials/RkaTahapanExplorer';
import TransparansiHero from './Partials/TransparansiHero';
import TransparansiNavbar from './Partials/TransparansiNavbar';
import type {
    BudgetVariantKey,
    PublicRkaTahapanData,
    PublicTransparansiOverview,
    RkaJenis,
    RkaViewMode,
} from './types';

interface TransparansiPageProps extends PageProps {
    initialData: PublicTransparansiOverview;
    hasUsers: boolean;
}

export default function Index({ auth, hasUsers, initialData }: TransparansiPageProps) {
    const authenticated = Boolean(auth?.user);

    const [overview, setOverview] = useState<PublicTransparansiOverview>(initialData);
    const [selectedVariant, setSelectedVariant] = useState<BudgetVariantKey>(initialData.meta.variant);
    const [selectedTahun, setSelectedTahun] = useState<number>(initialData.meta.tahun);
    const [selectedPeriode, setSelectedPeriode] = useState<PosterPeriode>(initialData.meta.periode);
    const [isLoadingOverview, setIsLoadingOverview] = useState(false);

    const [rkaJenis, setRkaJenis] = useState<RkaJenis>('awal');
    const [rkaViewMode, setRkaViewMode] = useState<RkaViewMode>('friendly');
    const [rkaData, setRkaData] = useState<PublicRkaTahapanData | null>(null);
    const [isLoadingRka, setIsLoadingRka] = useState(false);
    const [rkaError, setRkaError] = useState<string | null>(null);
    const [rkaSectionActivated, setRkaSectionActivated] = useState(false);

    const overviewAbortRef = useRef<AbortController | null>(null);
    const rkaAbortRef = useRef<AbortController | null>(null);
    const rkaCacheRef = useRef<Map<string, PublicRkaTahapanData>>(new Map());
    const rkaObserverSentinelRef = useRef<HTMLDivElement | null>(null);

    // Smooth scroll behavior matching Welcome.tsx
    useEffect(() => {
        const root = document.documentElement;
        root.classList.add('landing-active');
        return () => root.classList.remove('landing-active');
    }, []);

    // Shallow URL query sync agar tautan varian/tahun bisa langsung dibagikan
    const syncUrlParams = useCallback(
        (variant: BudgetVariantKey, tahun: number, periode: PosterPeriode) => {
            if (typeof window === 'undefined') return;
            const url = new URL(window.location.href);
            url.searchParams.set('variant', variant);
            url.searchParams.set('tahun', String(tahun));
            url.searchParams.set('periode', periode);
            window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
        },
        [],
    );

    const fetchOverview = useCallback(
        async (variant: BudgetVariantKey, tahun: number, periode: PosterPeriode) => {
            overviewAbortRef.current?.abort();
            const controller = new AbortController();
            overviewAbortRef.current = controller;

            setIsLoadingOverview(true);
            syncUrlParams(variant, tahun, periode);

            try {
                const res = await axios.get<{ success: boolean; data: PublicTransparansiOverview }>(
                    route('api.public.transparansi.data'),
                    {
                        params: { variant, tahun, periode },
                        signal: controller.signal,
                    },
                );
                if (!controller.signal.aborted && res.data?.success && res.data.data) {
                    setOverview(res.data.data);
                }
            } catch (err) {
                if (!axios.isCancel(err)) {
                    console.error('Gagal memuat data overview transparansi:', err);
                }
            } finally {
                if (!controller.signal.aborted) {
                    setIsLoadingOverview(false);
                }
            }
        },
        [syncUrlParams],
    );

    const fetchRkaTahapan = useCallback(
        async (variant: BudgetVariantKey, tahun: number, jenis: RkaJenis, forceRefresh = false) => {
            const cacheKey = `${variant}-${tahun}-${jenis}`;
            if (!forceRefresh && rkaCacheRef.current.has(cacheKey)) {
                rkaAbortRef.current?.abort();
                setIsLoadingRka(false);
                setRkaError(null);
                setRkaData(rkaCacheRef.current.get(cacheKey) ?? null);
                return;
            }

            rkaAbortRef.current?.abort();
            const controller = new AbortController();
            rkaAbortRef.current = controller;

            setIsLoadingRka(true);
            setRkaError(null);

            try {
                const res = await axios.get<{ success: boolean; data: PublicRkaTahapanData }>(
                    route('api.public.transparansi.rka-tahapan'),
                    {
                        params: { variant, tahun, jenis },
                        signal: controller.signal,
                    },
                );
                if (!controller.signal.aborted && res.data?.success && res.data.data) {
                    rkaCacheRef.current.set(cacheKey, res.data.data);
                    setRkaData(res.data.data);
                }
            } catch (err) {
                if (!axios.isCancel(err)) {
                    setRkaError('Gagal memuat rincian RKA Tahapan. Silakan coba lagi.');
                }
            } finally {
                if (!controller.signal.aborted) {
                    setIsLoadingRka(false);
                }
            }
        },
        [],
    );

    // Lazy-load RKA Tahapan saat pengunjung mendekati section RKA Tahapan
    useEffect(() => {
        const sentinel = rkaObserverSentinelRef.current;
        if (!sentinel || rkaSectionActivated) return;

        if (typeof IntersectionObserver === 'undefined') {
            setRkaSectionActivated(true);
            return;
        }

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries.some((entry) => entry.isIntersecting)) {
                    setRkaSectionActivated(true);
                    observer.disconnect();
                }
            },
            { rootMargin: '250px 0px' },
        );

        observer.observe(sentinel);
        return () => observer.disconnect();
    }, [rkaSectionActivated]);

    // Muat ulang RKA Tahapan ketika sudah aktif atau filter berubah
    useEffect(() => {
        if (!rkaSectionActivated) return;
        void fetchRkaTahapan(selectedVariant, selectedTahun, rkaJenis);
    }, [rkaSectionActivated, selectedVariant, selectedTahun, rkaJenis, fetchRkaTahapan]);

    useEffect(() => {
        return () => {
            overviewAbortRef.current?.abort();
            rkaAbortRef.current?.abort();
        };
    }, []);

    const handleVariantChange = (nextVariant: BudgetVariantKey) => {
        if (nextVariant === selectedVariant) return;
        setSelectedVariant(nextVariant);
        const targetMeta = overview.variants_summary.find((item) => item.variant === nextVariant);
        if (targetMeta && !targetMeta.supports_perubahan && rkaJenis === 'perubahan') {
            setRkaJenis('awal');
        }
        void fetchOverview(nextVariant, selectedTahun, selectedPeriode);
    };

    const handleTahunChange = (nextTahun: number) => {
        if (nextTahun === selectedTahun) return;
        setSelectedTahun(nextTahun);
        void fetchOverview(selectedVariant, nextTahun, selectedPeriode);
    };

    const handlePeriodeChange = (nextPeriode: PosterPeriode) => {
        if (nextPeriode === selectedPeriode) return;
        setSelectedPeriode(nextPeriode);
        void fetchOverview(selectedVariant, selectedTahun, nextPeriode);
    };

    const handleRkaJenisChange = (nextJenis: RkaJenis) => {
        setRkaSectionActivated(true);
        setRkaJenis(nextJenis);
    };

    return (
        <div className="min-h-screen overflow-x-clip bg-[#F8FBFB] text-[#08222B] selection:bg-[#8BE6DC]/35 selection:text-[#06222B] dark:bg-[#051319] dark:text-white print:bg-white">
            <Head title={`Transparansi BOSP — ${overview.sekolah.nama_sekolah}`}>
                <meta
                    name="description"
                    content={`Portal keterbukaan informasi pengelolaan Dana BOSP ${overview.sekolah.nama_sekolah} (${overview.meta.tahun}). Lihat realisasi anggaran, RKA Tahapan RKAS Awal & Perubahan, serta poster transparansi resmi.`}
                />
            </Head>

            <TransparansiNavbar
                authenticated={authenticated}
                hasUsers={hasUsers}
                namaSekolah={overview.sekolah.nama_sekolah}
            />

            <main>
                <TransparansiHero
                    overview={overview}
                    selectedVariant={selectedVariant}
                    selectedTahun={selectedTahun}
                    selectedPeriode={selectedPeriode}
                    isLoading={isLoadingOverview}
                    onVariantChange={handleVariantChange}
                    onTahunChange={handleTahunChange}
                    onPeriodeChange={handlePeriodeChange}
                />

                <RealisasiOverviewSection
                    activeData={overview.active}
                    isLoading={isLoadingOverview}
                />

                <div ref={rkaObserverSentinelRef}>
                    <RkaTahapanExplorer
                        rkaJenis={rkaJenis}
                        rkaViewMode={rkaViewMode}
                        rkaData={rkaData}
                        isLoading={isLoadingRka}
                        error={rkaError}
                        hasRkasAwal={overview.active.meta.has_rkas_awal}
                        hasRkasPerubahan={overview.active.meta.has_rkas_perubahan}
                        supportsPerubahan={overview.active.meta.supports_perubahan}
                        sekolah={overview.sekolah}
                        penanggungJawab={overview.active.penanggung_jawab}
                        onChangeJenis={handleRkaJenisChange}
                        onChangeViewMode={setRkaViewMode}
                        onRetry={() => void fetchRkaTahapan(selectedVariant, selectedTahun, rkaJenis, true)}
                    />
                </div>

                <PublicPosterSection activeData={overview.active} />
            </main>
        </div>
    );
}
