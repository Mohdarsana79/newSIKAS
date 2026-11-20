import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import StatCard from '@/Components/StatCard';
import CalendarWidget from '@/Components/Bento/CalendarWidget';
import PageHeader from '@/Components/ui/PageHeader';
import Surface from '@/Components/ui/Surface';
import IconTile from '@/Components/ui/IconTile';
import StatusBadge from '@/Components/ui/StatusBadge';
import EmptyState from '@/Components/ui/EmptyState';
import { SIKAS_CHART_COLORS, SIKAS_CHART_FONT, sikasChartBase } from '@/lib/chartTheme';
import { Head } from '@inertiajs/react';
import { useState, useEffect, useMemo } from 'react';
import Chart from 'react-apexcharts';
import { ApexOptions } from 'apexcharts';
import axios from 'axios';
import {
    Wallet,
    TrendingUp,
    Coins,
    Building2,
    Layers,
    CheckCircle2,
    Clock,
    Sparkles,
    RefreshCw,
    PieChart,
    BarChart3,
    CalendarDays,
} from 'lucide-react';

interface DashboardProps {
    statistik: any;
    grafikRealisasiTahunan: any;
    chartRealisasiProgram: any;
    pemanfaatanAnggaran: any;
    perbandinganLimaTahun: any;
    penganggaran: any;
    tahunAktif: any;
    availableYears: any;
    activeVariant: string;
    auth: any;
}

const VARIANT_LABELS: Record<string, string> = {
    reguler: 'BOSP Reguler',
    kinerja: 'BOSP Kinerja',
    silpa: 'SiLPA Reguler',
    kinerja_silpa: 'SiLPA Kinerja',
};

/**
 * Dashboard Utama SIKAS — "Neo-Bento Full-Color" (3 Baris Terkunci Rapat):
 * - Baris 1: 4 StatCard utama dengan deskripsi & progress bar.
 * - Baris 2: Realisasi Bulanan (8 kolom) + Kalender & Tahapan BOSP terpadu (4 kolom), tinggi sejajar.
 * - Baris 3: Program Terbesar & 8 SNP (7 kolom) + Tren Realisasi 5 Tahun (5 kolom), tinggi sejajar.
 */
export default function Dashboard({
    statistik: initialStatistik,
    grafikRealisasiTahunan: initialGrafikTahunan,
    chartRealisasiProgram: initialChartProgram,
    pemanfaatanAnggaran: initialPemanfaatan,
    perbandinganLimaTahun: initialPerbandingan,
    tahunAktif,
    availableYears,
    activeVariant,
}: DashboardProps) {
    const [year, setYear] = useState(tahunAktif || new Date().getFullYear().toString());
    const [variant, setVariant] = useState(activeVariant || 'reguler');
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [loading, setLoading] = useState(false);

    // State data dashboard
    const [statistik, setStatistik] = useState(initialStatistik);
    const [grafikTahunan, setGrafikTahunan] = useState(initialGrafikTahunan);
    const [chartProgram, setChartProgram] = useState(initialChartProgram);
    const [pemanfaatan, setPemanfaatan] = useState(initialPemanfaatan);
    const [perbandingan, setPerbandingan] = useState(initialPerbandingan);
    const [availableYearsList, setAvailableYearsList] = useState(availableYears);

    useEffect(() => {
        const checkDarkMode = () => setIsDarkMode(document.documentElement.classList.contains('dark'));
        checkDarkMode();
        const observer = new MutationObserver(checkDarkMode);
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
        return () => observer.disconnect();
    }, []);

    // Ambil data dashboard via AJAX saat tahun / varian berganti
    const fetchDashboardData = async (selectedYear: string, selectedVariant: string) => {
        if (loading) return;

        try {
            setLoading(true);
            const response = await axios.get(route('dashboard.data'), {
                params: { tahun: selectedYear, variant: selectedVariant },
            });
            if (response.data.success) {
                setStatistik(response.data.statistik);
                setGrafikTahunan(response.data.grafik_realisasi_tahunan);
                setChartProgram(response.data.chart_realisasi_program);
                setPemanfaatan(response.data.pemanfaatan_anggaran);
                setPerbandingan(response.data.perbandingan_lima_tahun);
                if (response.data.available_years) {
                    setAvailableYearsList(response.data.available_years);
                }
                if (response.data.tahun) {
                    setYear(response.data.tahun.toString());
                }
            }
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newYear = e.target.value;
        setYear(newYear);
        fetchDashboardData(newYear, variant);
    };

    const handleVariantChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newVariant = e.target.value;
        setVariant(newVariant);
        fetchDashboardData(year, newVariant);
    };

    // Format mata uang singkat (T / M / JT)
    const formatShortCurrency = (value: any) => {
        if (value === undefined || value === null) return 'Rp 0';
        const numValue = Number(value);
        if (isNaN(numValue)) return 'Rp 0';

        if (numValue >= 1000000000000) {
            return 'Rp ' + (numValue / 1000000000000).toLocaleString('id-ID', { maximumFractionDigits: 1 }) + ' T';
        } else if (numValue >= 1000000000) {
            return 'Rp ' + (numValue / 1000000000).toLocaleString('id-ID', { maximumFractionDigits: 1 }) + ' M';
        } else if (numValue >= 1000000) {
            return 'Rp ' + (numValue / 1000000).toLocaleString('id-ID', { maximumFractionDigits: 1 }) + ' JT';
        }
        return 'Rp ' + numValue.toLocaleString('id-ID');
    };

    const formatFullCurrency = (value: any) => {
        const numValue = Number(value) || 0;
        return 'Rp ' + numValue.toLocaleString('id-ID');
    };

    const chartLabelColor = isDarkMode ? '#94A3B8' : '#64748B';

    // Ringkasan metrik bulanan untuk strip KPI Baris 2
    const monthlyMetrics = useMemo(() => {
        const values: number[] = (grafikTahunan?.realisasi_data || []).map((v: any) => Number(v) || 0);
        const categories: string[] = grafikTahunan?.categories || [
            'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des',
        ];
        const activeMonths = values.filter((v) => v > 0);
        const total = values.reduce((acc, cur) => acc + cur, 0);
        const avg = activeMonths.length > 0 ? total / activeMonths.length : 0;
        const maxVal = values.length > 0 ? Math.max(...values) : 0;
        const maxIdx = maxVal > 0 ? values.indexOf(maxVal) : -1;

        return {
            total,
            avg,
            maxVal,
            peakMonth: maxIdx >= 0 ? categories[maxIdx] : '-',
            activeCount: activeMonths.length,
        };
    }, [grafikTahunan]);

    // Ringkasan metrik 5 tahun untuk strip KPI Baris 3
    const fiveYearMetrics = useMemo(() => {
        const items: any[] = Array.isArray(perbandingan) ? perbandingan : [];
        const values = items.map((item) => Number(item.realisasi_rupiah) || 0);
        const activeVals = values.filter((v) => v > 0);
        const avg = activeVals.length > 0 ? activeVals.reduce((a, b) => a + b, 0) / activeVals.length : 0;
        const sorted = [...items].sort(
            (a, b) => (Number(b.realisasi_rupiah) || 0) - (Number(a.realisasi_rupiah) || 0),
        );
        const peakItem = sorted[0];

        return {
            avg,
            peakYear: peakItem && Number(peakItem.realisasi_rupiah) > 0 ? peakItem.tahun : year,
            peakValue: peakItem ? Number(peakItem.realisasi_rupiah) || 0 : 0,
        };
    }, [perbandingan, year]);

    // Top 3 SNP untuk ringkasan kompak di bawah Donut Chart
    const topSnps = useMemo(() => {
        const items: any[] = Array.isArray(pemanfaatan) ? pemanfaatan : [];
        return items
            .map((item, index) => ({
                ...item,
                color: SIKAS_CHART_COLORS[index % SIKAS_CHART_COLORS.length],
            }))
            .sort((a, b) => (Number(b.realisasi) || 0) - (Number(a.realisasi) || 0))
            .slice(0, 3);
    }, [pemanfaatan]);

    // 1. Grafik Realisasi Bulanan (Hours Activity Style)
    const monthlyRealizationSeries = useMemo(
        () => [
            {
                name: 'Realisasi',
                data: grafikTahunan?.realisasi_data || [],
            },
        ],
        [grafikTahunan],
    );

    const monthlyRealizationOptions: ApexOptions = useMemo(() => {
        const base = sikasChartBase(isDarkMode);

        return {
            ...base,
            chart: {
                background: 'transparent',
                fontFamily: SIKAS_CHART_FONT,
                toolbar: { show: false },
                zoom: { enabled: false },
                foreColor: chartLabelColor,
                type: 'bar',
                height: 240,
            },
            colors: ['#D8F275'],
            plotOptions: {
                bar: {
                    borderRadius: 7,
                    borderRadiusApplication: 'end',
                    columnWidth: '42%',
                },
            },
            dataLabels: { enabled: false },
            grid: {
                ...base.grid,
                padding: { top: -6, right: 4, bottom: -6, left: 6 },
            },
            xaxis: {
                categories: grafikTahunan?.categories || [],
                labels: {
                    style: {
                        colors: chartLabelColor,
                        fontSize: '10px',
                        fontWeight: 600,
                        fontFamily: SIKAS_CHART_FONT,
                    },
                },
                axisBorder: { show: false },
                axisTicks: { show: false },
            },
            yaxis: {
                labels: {
                    formatter: (val: number) => formatShortCurrency(val),
                    style: {
                        colors: chartLabelColor,
                        fontSize: '10px',
                        fontWeight: 600,
                        fontFamily: SIKAS_CHART_FONT,
                    },
                },
            },
            tooltip: {
                theme: isDarkMode ? 'dark' : 'light',
                style: { fontFamily: SIKAS_CHART_FONT },
                y: { formatter: (val) => formatFullCurrency(val) },
            },
        };
    }, [isDarkMode, grafikTahunan]);

    // 2. Grafik Perbandingan 5 Tahun (Area Smooth)
    const yearlyRealizationSeries = useMemo(
        () => [
            {
                name: 'Realisasi BOSP',
                data: perbandingan?.map((item: any) => item.realisasi_rupiah) || [],
            },
        ],
        [perbandingan],
    );

    const yearlyRealizationOptions: ApexOptions = useMemo(() => {
        const base = sikasChartBase(isDarkMode);

        return {
            ...base,
            chart: {
                background: 'transparent',
                fontFamily: SIKAS_CHART_FONT,
                toolbar: { show: false },
                zoom: { enabled: false },
                foreColor: chartLabelColor,
                type: 'area',
                height: 215,
            },
            colors: [SIKAS_CHART_COLORS[0]],
            fill: {
                type: 'gradient',
                gradient: {
                    shadeIntensity: 1,
                    opacityFrom: 0.45,
                    opacityTo: 0.04,
                    stops: [0, 95, 100],
                },
            },
            dataLabels: { enabled: false },
            stroke: { curve: 'smooth', width: 3 },
            grid: {
                ...base.grid,
                padding: { top: -4, right: 6, bottom: -6, left: 6 },
            },
            xaxis: {
                categories: perbandingan?.map((item: any) => item.tahun) || [],
                labels: {
                    style: {
                        colors: chartLabelColor,
                        fontSize: '10px',
                        fontWeight: 600,
                        fontFamily: SIKAS_CHART_FONT,
                    },
                },
                axisBorder: { show: false },
                axisTicks: { show: false },
            },
            yaxis: {
                labels: {
                    formatter: (val: number) => formatShortCurrency(val),
                    style: {
                        colors: chartLabelColor,
                        fontSize: '10px',
                        fontWeight: 600,
                        fontFamily: SIKAS_CHART_FONT,
                    },
                },
            },
            tooltip: {
                theme: isDarkMode ? 'dark' : 'light',
                style: { fontFamily: SIKAS_CHART_FONT },
                y: { formatter: (val) => formatFullCurrency(val) },
            },
        };
    }, [isDarkMode, perbandingan]);

    // 3. Pemanfaatan SNP Donut Chart (tanpa legend bawaan yang panjang)
    const budgetPieSeries = useMemo(
        () => pemanfaatan?.map((item: any) => Number(item.realisasi) || 0) || [],
        [pemanfaatan],
    );

    const budgetPieOptions: ApexOptions = useMemo(() => {
        const base = sikasChartBase(isDarkMode);

        return {
            ...base,
            chart: {
                background: 'transparent',
                fontFamily: SIKAS_CHART_FONT,
                toolbar: { show: false },
                foreColor: chartLabelColor,
                type: 'donut',
            },
            labels: pemanfaatan?.map((item: any) => item.program) || [],
            colors: SIKAS_CHART_COLORS,
            stroke: { show: false },
            dataLabels: { enabled: false },
            legend: { show: false },
            plotOptions: {
                pie: {
                    donut: {
                        size: '74%',
                        labels: {
                            show: true,
                            name: {
                                show: true,
                                fontSize: '10px',
                                fontWeight: 700,
                                color: chartLabelColor,
                            },
                            value: {
                                show: true,
                                fontSize: '16px',
                                fontWeight: 800,
                                color: isDarkMode ? '#F8FAFC' : '#0F172A',
                                formatter: (val) => formatShortCurrency(val),
                            },
                            total: {
                                show: true,
                                label: 'Serapan SNP',
                                color: chartLabelColor,
                                formatter: () =>
                                    `${statistik?.persentase_realisasi ? Number(statistik.persentase_realisasi).toFixed(1) : '0.0'}%`,
                            },
                        },
                    },
                },
            },
            tooltip: {
                theme: isDarkMode ? 'dark' : 'light',
                style: { fontFamily: SIKAS_CHART_FONT },
                y: { formatter: (val) => formatFullCurrency(val) },
            },
        };
    }, [isDarkMode, pemanfaatan, statistik]);

    const topPrograms = chartProgram?.slice(0, 4) || [];
    const persentaseRealisasi = Number(statistik?.persentase_realisasi || 0);
    const persentaseSisaKas = Math.max(0, 100 - persentaseRealisasi);
    const persentaseEfisiensi = Number(statistik?.efisiensi_anggaran || 0);
    const variantLabel = VARIANT_LABELS[variant] || variant.toUpperCase();

    return (
        <AuthenticatedLayout
            header={
                <PageHeader
                    title="Dashboard"
                    breadcrumb={[
                        { label: 'Ringkasan keuangan sekolah' },
                        { label: variantLabel },
                        { label: `TA ${year}` },
                    ]}
                    actions={
                        <>
                            {loading && (
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-pastel-lavender px-3 py-1.5 text-[10px] font-extrabold text-brand-600 shadow-sm dark:bg-brand-500/15 dark:text-brand-300">
                                    <RefreshCw className="h-3 w-3 animate-spin" />
                                    <span>Memuat data...</span>
                                </span>
                            )}

                            <div className="flex items-center gap-1 rounded-2xl border border-white bg-white/90 p-1 shadow-pill backdrop-blur-md dark:border-white/10 dark:bg-[#15131F]/90">
                                <div className="flex items-center gap-1.5 rounded-xl bg-pastel-lavender/70 px-2.5 py-1 dark:bg-brand-500/15">
                                    <Layers className="h-3.5 w-3.5 shrink-0 text-brand-600 dark:text-brand-300" />
                                    <select
                                        value={variant}
                                        onChange={handleVariantChange}
                                        aria-label="Pilih Varian Anggaran"
                                        className="h-6 cursor-pointer border-none bg-transparent py-0 pl-0.5 pr-5 text-[11px] font-extrabold text-slate-900 focus:outline-none focus:ring-0 dark:text-white"
                                    >
                                        <option value="reguler" className="bg-white text-slate-900 dark:bg-slate-900 dark:text-white">BOSP Reguler</option>
                                        <option value="kinerja" className="bg-white text-slate-900 dark:bg-slate-900 dark:text-white">BOSP Kinerja</option>
                                        <option value="silpa" className="bg-white text-slate-900 dark:bg-slate-900 dark:text-white">SiLPA Reguler</option>
                                        <option value="kinerja_silpa" className="bg-white text-slate-900 dark:bg-slate-900 dark:text-white">SiLPA Kinerja</option>
                                    </select>
                                </div>

                                <div className="h-4 w-px bg-slate-200/80 dark:bg-white/10" />

                                <div className="flex items-center gap-1.5 rounded-xl bg-lime-100/80 px-2.5 py-1 dark:bg-lime-400/10">
                                    <CalendarDays className="h-3.5 w-3.5 shrink-0 text-lime-700 dark:text-lime-300" />
                                    <select
                                        value={year}
                                        onChange={handleYearChange}
                                        aria-label="Pilih Tahun Anggaran"
                                        className="h-6 cursor-pointer border-none bg-transparent py-0 pl-0.5 pr-5 text-[11px] font-extrabold text-slate-900 focus:outline-none focus:ring-0 dark:text-white"
                                    >
                                        {availableYearsList && availableYearsList.length > 0 ? (
                                            availableYearsList.map((y: any) => (
                                                <option key={y} value={y} className="bg-white text-slate-900 dark:bg-slate-900 dark:text-white">
                                                    Tahun {y}
                                                </option>
                                            ))
                                        ) : (
                                            <option value={year} className="bg-white text-slate-900 dark:bg-slate-900 dark:text-white">
                                                Tahun {year}
                                            </option>
                                        )}
                                    </select>
                                </div>
                            </div>
                        </>
                    }
                />
            }
        >
            <Head title="Dashboard SIKAS" />

            <div className="space-y-3.5">
                {/* 1. Baris 1: 4 StatCard Utama (Tinggi & Jarak Seragam) */}
                <div className="grid grid-cols-1 items-stretch gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="animate-rise h-full" style={{ animationDelay: '60ms' }}>
                        <StatCard
                            title="Pagu Anggaran"
                            value={formatShortCurrency(statistik?.pagu_anggaran)}
                            tooltip={formatFullCurrency(statistik?.pagu_anggaran)}
                            description={`Pagu ${variantLabel}`}
                            trend={{ value: 'Target RKAS', isPositive: true }}
                            tone="violet"
                            progress={persentaseRealisasi}
                            progressLabel={`${persentaseRealisasi.toFixed(1)}%`}
                            icon={<Wallet />}
                        />
                    </div>
                    <div className="animate-rise h-full" style={{ animationDelay: '120ms' }}>
                        <StatCard
                            title="Total Realisasi"
                            value={formatShortCurrency(statistik?.total_realisasi)}
                            tooltip={formatFullCurrency(statistik?.total_realisasi)}
                            description="Penyerapan BKU berjalan"
                            trend={{ value: `${persentaseRealisasi.toFixed(1)}%`, isPositive: persentaseRealisasi >= 50 }}
                            tone="mint"
                            progress={persentaseRealisasi}
                            progressLabel={`${persentaseRealisasi.toFixed(1)}%`}
                            icon={<TrendingUp />}
                        />
                    </div>
                    <div className="animate-rise h-full" style={{ animationDelay: '180ms' }}>
                        <StatCard
                            title="Sisa Saldo Kas"
                            value={formatShortCurrency(statistik?.sisa_anggaran)}
                            tooltip={formatFullCurrency(statistik?.sisa_anggaran)}
                            description="Sisa alokasi anggaran"
                            trend={{ value: 'Kas Tersedia', isPositive: true }}
                            tone="peach"
                            progress={persentaseSisaKas}
                            progressLabel={`${persentaseSisaKas.toFixed(1)}%`}
                            icon={<Coins />}
                        />
                    </div>
                    <div className="animate-rise h-full" style={{ animationDelay: '240ms' }}>
                        <StatCard
                            title="Penerimaan BOSP"
                            value={formatShortCurrency(statistik?.total_penerimaan)}
                            tooltip={formatFullCurrency(statistik?.total_penerimaan)}
                            description="Efisiensi penyerapan dana"
                            trend={{ value: 'Tervalidasi', isPositive: true }}
                            tone="sky"
                            progress={persentaseEfisiensi}
                            progressLabel={`${persentaseEfisiensi.toFixed(1)}%`}
                            icon={<Building2 />}
                        />
                    </div>
                </div>

                {/* 2. Baris 2: Realisasi Bulanan (8 Kolom) + Kalender & Tahapan BOSP Terpadu (4 Kolom) */}
                <div className="grid grid-cols-1 items-stretch gap-3.5 lg:grid-cols-12">
                    {/* Realisasi Bulanan + Strip Ringkasan Bulanan */}
                    <div className="animate-rise flex min-w-0 flex-col lg:col-span-8" style={{ animationDelay: '300ms' }}>
                        <Surface
                            className="h-full"
                            bodyClassName="flex flex-col justify-between gap-3"
                            icon={
                                <IconTile tone="ink" size="md">
                                    <BarChart3 />
                                </IconTile>
                            }
                            title={`Realisasi Bulanan Tahun ${year}`}
                            subtitle="Alur penyerapan kas bendahara sepanjang tahun berjalan"
                            badge={
                                <StatusBadge tone="lime" dot={false}>
                                    <Sparkles className="h-3 w-3" />
                                    {monthlyMetrics.activeCount} Bulan Aktif
                                </StatusBadge>
                            }
                        >
                            {/* Strip Ringkasan 3 Metrik Bulanan */}
                            <div className="grid grid-cols-3 gap-2.5">
                                <div className="rounded-2xl border border-slate-100/90 bg-slate-50/70 px-3 py-2 dark:border-white/5 dark:bg-white/[0.02]">
                                    <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                                        Total Terserap
                                    </p>
                                    <p
                                        className="sikas-num mt-0.5 truncate text-[13px] font-extrabold text-slate-900 dark:text-white"
                                        title={formatFullCurrency(monthlyMetrics.total)}
                                    >
                                        {formatShortCurrency(monthlyMetrics.total)}
                                    </p>
                                </div>
                                <div className="rounded-2xl border border-slate-100/90 bg-slate-50/70 px-3 py-2 dark:border-white/5 dark:bg-white/[0.02]">
                                    <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                                        Rata-rata / Bulan
                                    </p>
                                    <p
                                        className="sikas-num mt-0.5 truncate text-[13px] font-extrabold text-slate-900 dark:text-white"
                                        title={formatFullCurrency(monthlyMetrics.avg)}
                                    >
                                        {formatShortCurrency(monthlyMetrics.avg)}
                                    </p>
                                </div>
                                <div className="rounded-2xl border border-lime-200/80 bg-lime-100/45 px-3 py-2 dark:border-lime-400/20 dark:bg-lime-400/5">
                                    <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500 dark:text-lime-300/80">
                                        Puncak ({monthlyMetrics.peakMonth})
                                    </p>
                                    <p
                                        className="sikas-num mt-0.5 truncate text-[13px] font-extrabold text-slate-900 dark:text-lime-300"
                                        title={formatFullCurrency(monthlyMetrics.maxVal)}
                                    >
                                        {formatShortCurrency(monthlyMetrics.maxVal)}
                                    </p>
                                </div>
                            </div>

                            <div className="-mx-1 mt-auto">
                                <Chart
                                    options={monthlyRealizationOptions}
                                    series={monthlyRealizationSeries}
                                    type="bar"
                                    height={240}
                                />
                            </div>
                        </Surface>
                    </div>

                    {/* Kartu Bento Terpadu: Kalender Keuangan + Agenda Tahapan BOSP */}
                    <div className="animate-rise flex min-w-0 flex-col lg:col-span-4" style={{ animationDelay: '360ms' }}>
                        <CalendarWidget
                            className="h-full"
                            footer={
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[9.5px] font-extrabold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                                            Agenda Tahapan BOSP
                                        </span>
                                        <span className="text-[9.5px] font-bold text-brand-600 dark:text-brand-300">
                                            TA {year}
                                        </span>
                                    </div>

                                    <div className="space-y-1.5">
                                        <div className="flex items-center justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50/70 px-2.5 py-1.5 transition hover:border-lime-300 hover:bg-lime-100/40 dark:border-white/5 dark:bg-white/[0.02] dark:hover:border-lime-400/30 dark:hover:bg-lime-400/5">
                                            <div className="flex min-w-0 items-center gap-2">
                                                <IconTile tone="mint" size="sm" className="h-7 w-7 rounded-lg [&>svg]:h-3.5 [&>svg]:w-3.5">
                                                    <CheckCircle2 />
                                                </IconTile>
                                                <div className="min-w-0">
                                                    <p className="truncate text-[10.5px] font-extrabold text-slate-900 dark:text-white">
                                                        Tahap 1 BOSP
                                                    </p>
                                                    <p className="text-[9px] font-semibold text-slate-400 dark:text-slate-500">
                                                        Januari – Juni
                                                    </p>
                                                </div>
                                            </div>
                                            <StatusBadge tone="success">Tersalur</StatusBadge>
                                        </div>

                                        <div className="flex items-center justify-between gap-2 rounded-xl border border-lime-200/90 bg-lime-100/45 px-2.5 py-1.5 transition hover:border-lime-300 dark:border-lime-400/30 dark:bg-lime-400/5">
                                            <div className="flex min-w-0 items-center gap-2">
                                                <IconTile tone="violet" size="sm" className="h-7 w-7 rounded-lg [&>svg]:h-3.5 [&>svg]:w-3.5">
                                                    <Clock />
                                                </IconTile>
                                                <div className="min-w-0">
                                                    <p className="truncate text-[10.5px] font-extrabold text-slate-900 dark:text-white">
                                                        Tahap 2 BOSP
                                                    </p>
                                                    <p className="text-[9px] font-semibold text-slate-400 dark:text-slate-500">
                                                        Juli – Desember
                                                    </p>
                                                </div>
                                            </div>
                                            <StatusBadge tone="violet">Aktif</StatusBadge>
                                        </div>

                                        <div className="flex items-center justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50/70 px-2.5 py-1.5 transition hover:border-lime-300 hover:bg-lime-100/40 dark:border-white/5 dark:bg-white/[0.02] dark:hover:border-lime-400/30 dark:hover:bg-lime-400/5">
                                            <div className="flex min-w-0 items-center gap-2">
                                                <IconTile tone="amber" size="sm" className="h-7 w-7 rounded-lg [&>svg]:h-3.5 [&>svg]:w-3.5">
                                                    <Sparkles />
                                                </IconTile>
                                                <div className="min-w-0">
                                                    <p className="truncate text-[10.5px] font-extrabold text-slate-900 dark:text-white">
                                                        Laporan SPTJ & SP2B
                                                    </p>
                                                    <p className="text-[9px] font-semibold text-slate-400 dark:text-slate-500">
                                                        Penutupan BKU Bulanan
                                                    </p>
                                                </div>
                                            </div>
                                            <StatusBadge tone="warning">Terjadwal</StatusBadge>
                                        </div>
                                    </div>
                                </div>
                            }
                        />
                    </div>
                </div>

                {/* 3. Baris 3: Program Terbesar & SNP (7 Kolom) + Tren Realisasi 5 Tahun (5 Kolom) */}
                <div className="grid grid-cols-1 items-stretch gap-3.5 lg:grid-cols-12">
                    {/* Program Belanja SNP & Pemanfaatan */}
                    <div className="animate-rise flex min-w-0 flex-col lg:col-span-7" style={{ animationDelay: '420ms' }}>
                        <Surface
                            className="h-full"
                            bodyClassName="flex flex-col justify-between"
                            icon={
                                <IconTile tone="mint" size="md">
                                    <Layers />
                                </IconTile>
                            }
                            title="Program Terbesar & 8 SNP"
                            subtitle="Distribusi realisasi belanja sekolah menurut Standar Nasional Pendidikan"
                            badge={
                                <StatusBadge tone="info" dot={false}>
                                    {topPrograms.length} Program Utama
                                </StatusBadge>
                            }
                        >
                            <div className="grid h-full grid-cols-1 items-stretch gap-3.5 md:grid-cols-12">
                                {/* Kolom Kiri Internal: Donut Chart Bersih + Top 3 SNP */}
                                <div className="flex flex-col justify-between rounded-2xl border border-slate-100/90 bg-slate-50/60 p-3 dark:border-white/5 dark:bg-white/[0.02] md:col-span-5">
                                    <div className="flex items-center justify-center">
                                        <Chart
                                            options={budgetPieOptions}
                                            series={budgetPieSeries}
                                            type="donut"
                                            height={180}
                                            width="100%"
                                        />
                                    </div>

                                    <div className="mt-2 space-y-1.5 border-t border-slate-200/60 pt-2.5 dark:border-white/5">
                                        <p className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                                            3 Standar Tertinggi
                                        </p>
                                        {topSnps.map((snp: any, idx: number) => (
                                            <div key={idx} className="flex items-center justify-between gap-2 text-[10px]">
                                                <div className="flex min-w-0 items-center gap-1.5">
                                                    <span
                                                        className="h-2 w-2 shrink-0 rounded-full"
                                                        style={{ backgroundColor: snp.color }}
                                                    />
                                                    <span className="truncate font-semibold text-slate-600 dark:text-slate-300">
                                                        {snp.program.replace(/^Pengembangan\s+/i, '')}
                                                    </span>
                                                </div>
                                                <span className="sikas-num shrink-0 font-extrabold text-slate-900 dark:text-white">
                                                    {Number(snp.persentase || 0).toFixed(1)}%
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Kolom Kanan Internal: 4 Kartu Program Teratas */}
                                <div className="flex flex-col justify-between gap-2 md:col-span-7">
                                    {topPrograms.length > 0 ? (
                                        topPrograms.map((program: any, idx: number) => {
                                            const totalReal = Number(statistik?.total_realisasi) || 1;
                                            const percent = Math.min(Math.round((Number(program.total) / totalReal) * 100), 100);
                                            return (
                                                <div
                                                    key={idx}
                                                    className="flex flex-1 items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 px-3 py-2.5 transition-colors hover:border-lime-300 hover:bg-lime-100/40 dark:border-white/5 dark:bg-white/[0.02] dark:hover:border-lime-400/30 dark:hover:bg-lime-400/5"
                                                >
                                                    <div className="flex min-w-0 flex-1 items-center gap-2.5">
                                                        <span className="sikas-num flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-white text-[10px] font-extrabold text-slate-700 shadow-sm ring-1 ring-slate-200/70 dark:bg-white/10 dark:text-slate-200 dark:ring-white/10">
                                                            #{idx + 1}
                                                        </span>
                                                        <div className="min-w-0 flex-1 space-y-1">
                                                            <p className="truncate text-[11px] font-bold text-slate-900 dark:text-white">
                                                                {program.nama_program}
                                                            </p>
                                                            <div className="flex items-center gap-2">
                                                                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
                                                                    <div
                                                                        className="h-1.5 rounded-full bg-gradient-to-r from-brand-400 to-lime-400"
                                                                        style={{ width: `${percent}%` }}
                                                                    />
                                                                </div>
                                                                <span className="sikas-num text-[9.5px] font-bold text-slate-500 dark:text-slate-400">
                                                                    {percent}%
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <span
                                                        className="sikas-num whitespace-nowrap text-[11.5px] font-extrabold text-slate-800 dark:text-slate-200"
                                                        title={formatFullCurrency(program.total)}
                                                    >
                                                        {formatShortCurrency(program.total)}
                                                    </span>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-slate-200/80 bg-slate-50/40 p-4 dark:border-white/10 dark:bg-white/[0.01]">
                                            <EmptyState
                                                icon={<PieChart className="h-5 w-5" />}
                                                title="Belum ada realisasi program tercatat"
                                                className="py-6"
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </Surface>
                    </div>

                    {/* Tren Realisasi 5 Tahun Terakhir (5 Kolom Kanan, Sejajar Tinggi) */}
                    <div className="animate-rise flex min-w-0 flex-col lg:col-span-5" style={{ animationDelay: '480ms' }}>
                        <Surface
                            className="h-full"
                            bodyClassName="flex flex-col justify-between gap-3"
                            icon={
                                <IconTile tone="violet" size="md">
                                    <TrendingUp />
                                </IconTile>
                            }
                            title="Tren Realisasi 5 Tahun"
                            subtitle="Komparasi penyerapan dana lintas tahun anggaran"
                            badge={
                                <StatusBadge tone="violet" dot={false}>
                                    5 Tahun
                                </StatusBadge>
                            }
                        >
                            {/* Strip 3 Mini-KPI 5 Tahun */}
                            <div className="grid grid-cols-3 gap-2">
                                <div className="rounded-2xl border border-slate-100/90 bg-slate-50/70 px-2.5 py-2 dark:border-white/5 dark:bg-white/[0.02]">
                                    <p className="truncate text-[8.5px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                                        Rata-rata 5 Thn
                                    </p>
                                    <p
                                        className="sikas-num mt-0.5 truncate text-[12px] font-extrabold text-slate-900 dark:text-white"
                                        title={formatFullCurrency(fiveYearMetrics.avg)}
                                    >
                                        {formatShortCurrency(fiveYearMetrics.avg)}
                                    </p>
                                </div>
                                <div className="rounded-2xl border border-slate-100/90 bg-slate-50/70 px-2.5 py-2 dark:border-white/5 dark:bg-white/[0.02]">
                                    <p className="truncate text-[8.5px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                                        Puncak ({fiveYearMetrics.peakYear})
                                    </p>
                                    <p
                                        className="sikas-num mt-0.5 truncate text-[12px] font-extrabold text-slate-900 dark:text-white"
                                        title={formatFullCurrency(fiveYearMetrics.peakValue)}
                                    >
                                        {formatShortCurrency(fiveYearMetrics.peakValue)}
                                    </p>
                                </div>
                                <div className="rounded-2xl border border-brand-200/70 bg-pastel-lavender/50 px-2.5 py-2 dark:border-brand-400/20 dark:bg-brand-500/10">
                                    <p className="truncate text-[8.5px] font-bold uppercase tracking-wider text-brand-600 dark:text-brand-300">
                                        Serapan TA {year}
                                    </p>
                                    <p className="sikas-num mt-0.5 truncate text-[12px] font-extrabold text-brand-700 dark:text-brand-200">
                                        {persentaseRealisasi.toFixed(1)}%
                                    </p>
                                </div>
                            </div>

                            <div className="-mx-1 mt-auto">
                                <Chart
                                    options={yearlyRealizationOptions}
                                    series={yearlyRealizationSeries}
                                    type="area"
                                    height={215}
                                />
                            </div>
                        </Surface>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
