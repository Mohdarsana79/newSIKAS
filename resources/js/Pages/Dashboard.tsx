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
    BarChart3
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

/**
 * Dashboard Utama SIKAS — "Neo-Bento Full-Color":
 * header halaman via PageHeader, 4 StatCard tone pastel, kartu grafik Surface
 * dengan IconTile, kartu promo ARKAS ink-gradient, kalender & agenda ringkas.
 * Struktur JSX/className saja — seluruh state, handler, axios, kalkulasi angka,
 * seri/opsi ApexCharts (kecuali warna/grid/font) tetap seperti sebelumnya.
 */
export default function Dashboard({
    statistik: initialStatistik,
    grafikRealisasiTahunan: initialGrafikTahunan,
    chartRealisasiProgram: initialChartProgram,
    pemanfaatanAnggaran: initialPemanfaatan,
    perbandinganLimaTahun: initialPerbandingan,
    tahunAktif,
    availableYears,
    activeVariant
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
                params: { tahun: selectedYear, variant: selectedVariant } 
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

    // 1. Grafik Realisasi Bulanan (Hours Activity Style)
    const monthlyRealizationSeries = useMemo(() => [{
        name: 'Realisasi',
        data: grafikTahunan?.realisasi_data || []
    }], [grafikTahunan]);

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
                height: 320,
            },
            colors: ['#D8F275'],
            plotOptions: { 
                bar: { 
                    borderRadius: 8, 
                    borderRadiusApplication: 'end',
                    columnWidth: '40%',
                } 
            },
            dataLabels: { enabled: false },
            xaxis: { 
                categories: grafikTahunan?.categories || [],
                labels: {
                    style: {
                        colors: chartLabelColor,
                        fontSize: '10px',
                        fontWeight: 600,
                        fontFamily: SIKAS_CHART_FONT,
                    }
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
                    }
                }
            },
            tooltip: {
                theme: isDarkMode ? 'dark' : 'light',
                style: { fontFamily: SIKAS_CHART_FONT },
                y: { formatter: (val) => formatFullCurrency(val) }
            }
        };
    }, [isDarkMode, grafikTahunan]);

    // 2. Grafik Perbandingan 5 Tahun (Area Smooth)
    const yearlyRealizationSeries = useMemo(() => [{
        name: 'Realisasi BOSP',
        data: perbandingan?.map((item: any) => item.realisasi_rupiah) || []
    }], [perbandingan]);

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
                height: 280,
            },
            colors: [SIKAS_CHART_COLORS[0]],
            fill: { 
                type: 'gradient', 
                gradient: { 
                    shadeIntensity: 1, 
                    opacityFrom: 0.45, 
                    opacityTo: 0.05, 
                    stops: [0, 95, 100] 
                } 
            },
            dataLabels: { enabled: false },
            stroke: { curve: 'smooth', width: 3 },
            xaxis: { 
                categories: perbandingan?.map((item: any) => item.tahun) || [],
                labels: {
                    style: {
                        colors: chartLabelColor,
                        fontSize: '10px',
                        fontWeight: 600,
                        fontFamily: SIKAS_CHART_FONT,
                    }
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
                    }
                } 
            },
            tooltip: {
                theme: isDarkMode ? 'dark' : 'light',
                style: { fontFamily: SIKAS_CHART_FONT },
                y: { formatter: (val) => formatFullCurrency(val) }
            }
        };
    }, [isDarkMode, perbandingan]);

    // 3. Pemanfaatan SNP Pie Chart
    const budgetPieSeries = useMemo(() => pemanfaatan?.map((item: any) => item.realisasi) || [], [pemanfaatan]);
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
            plotOptions: {
                pie: {
                    donut: {
                        size: '72%',
                        labels: {
                            show: true,
                            total: {
                                show: true,
                                label: 'Total SNP',
                                color: isDarkMode ? '#F8FAFC' : '#0F172A',
                                formatter: () => `${statistik?.persentase_realisasi ? statistik.persentase_realisasi.toFixed(1) : '0'}%`
                            }
                        }
                    }
                }
            },
            legend: {
                position: 'bottom',
                fontSize: '10px',
                fontWeight: 700,
                labels: { colors: chartLabelColor },
                markers: { size: 5, strokeWidth: 0 },
                itemMargin: { horizontal: 10, vertical: 4 },
            },
            tooltip: {
                theme: isDarkMode ? 'dark' : 'light',
                style: { fontFamily: SIKAS_CHART_FONT },
                y: { formatter: (val) => formatFullCurrency(val) }
            }
        };
    }, [isDarkMode, pemanfaatan, statistik]);

    const topPrograms = chartProgram?.slice(0, 4) || [];
    const persentaseRealisasi = Number(statistik?.persentase_realisasi || 0);
    const persentaseSisaKas = Math.max(0, 100 - persentaseRealisasi);
    const persentaseEfisiensi = Number(statistik?.efisiensi_anggaran || 0);

    return (
        <AuthenticatedLayout
            header={
                <PageHeader
                    title="Dashboard"
                    breadcrumb={[
                        { label: 'Ringkasan keuangan sekolah' },
                        { label: `TA ${year}` },
                    ]}
                    actions={
                        <>
                            {loading && (
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-pastel-lavender px-2.5 py-1.5 text-[10px] font-bold text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
                                    <RefreshCw className="h-3 w-3 animate-spin" />
                                    <span>Memuat data...</span>
                                </span>
                            )}

                            <div className="flex items-center gap-1 rounded-2xl border border-white bg-white/80 p-1 shadow-pill dark:border-white/10 dark:bg-white/5">
                                <select
                                    value={variant}
                                    onChange={handleVariantChange}
                                    className="h-8 cursor-pointer rounded-xl border-none bg-transparent px-3 py-0 text-[11px] font-bold text-slate-800 focus:outline-none focus:ring-0 dark:text-slate-200"
                                >
                                    <option value="reguler">BOSP Reguler</option>
                                    <option value="kinerja">BOSP Kinerja</option>
                                    <option value="silpa">SiLPA Reguler</option>
                                    <option value="kinerja_silpa">SiLPA Kinerja</option>
                                </select>

                                <div className="h-4 w-px bg-slate-200 dark:bg-white/10" />

                                <select
                                    value={year}
                                    onChange={handleYearChange}
                                    className="h-8 cursor-pointer rounded-xl border-none bg-transparent px-3 py-0 text-[11px] font-bold text-slate-800 focus:outline-none focus:ring-0 dark:text-slate-200"
                                >
                                    {availableYearsList && availableYearsList.length > 0 ? (
                                        availableYearsList.map((y: any) => (
                                            <option key={y} value={y}>Tahun {y}</option>
                                        ))
                                    ) : (
                                        <option value={year}>Tahun {year}</option>
                                    )}
                                </select>
                            </div>
                        </>
                    }
                />
            }
        >
            <Head title="Dashboard SIKAS" />

            <div className="space-y-5">
                {/* 1. Baris 4 StatCard Utama */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <div className="animate-rise" style={{ animationDelay: '60ms' }}>
                        <StatCard
                            title="Pagu Anggaran"
                            value={formatShortCurrency(statistik?.pagu_anggaran)}
                            tooltip={formatFullCurrency(statistik?.pagu_anggaran)}
                            description={`Pagu Resmi ${variant.toUpperCase()}`}
                            trend={{ value: 'Target RKAS', isPositive: true }}
                            tone="violet"
                            progress={persentaseRealisasi}
                            progressLabel={`${persentaseRealisasi.toFixed(1)}%`}
                            icon={<Wallet />}
                        />
                    </div>
                    <div className="animate-rise" style={{ animationDelay: '120ms' }}>
                        <StatCard
                            title="Total Realisasi"
                            value={formatShortCurrency(statistik?.total_realisasi)}
                            tooltip={formatFullCurrency(statistik?.total_realisasi)}
                            description={`${persentaseRealisasi.toFixed(1)}% dari total pagu`}
                            trend={{ value: `${persentaseRealisasi.toFixed(1)}%`, isPositive: persentaseRealisasi >= 50 }}
                            tone="mint"
                            progress={persentaseRealisasi}
                            progressLabel={`${persentaseRealisasi.toFixed(1)}%`}
                            icon={<TrendingUp />}
                        />
                    </div>
                    <div className="animate-rise" style={{ animationDelay: '180ms' }}>
                        <StatCard
                            title="Sisa Saldo Kas"
                            value={formatShortCurrency(statistik?.sisa_anggaran)}
                            tooltip={formatFullCurrency(statistik?.sisa_anggaran)}
                            description="Sisa Alokasi Anggaran"
                            trend={{ value: 'Kas Tersedia', isPositive: true }}
                            tone="peach"
                            progress={persentaseSisaKas}
                            progressLabel={`${persentaseSisaKas.toFixed(1)}%`}
                            icon={<Coins />}
                        />
                    </div>
                    <div className="animate-rise" style={{ animationDelay: '240ms' }}>
                        <StatCard
                            title="Penerimaan BOSP"
                            value={formatShortCurrency(statistik?.total_penerimaan)}
                            tooltip={formatFullCurrency(statistik?.total_penerimaan)}
                            description={`Efisiensi: ${statistik?.efisiensi_anggaran ? statistik.efisiensi_anggaran.toFixed(1) : '0'}%`}
                            trend={{ value: 'Tervalidasi', isPositive: true }}
                            tone="sky"
                            progress={persentaseEfisiensi}
                            progressLabel={`${persentaseEfisiensi.toFixed(1)}%`}
                            icon={<Building2 />}
                        />
                    </div>
                </div>

                {/* 2. Baris Realisasi Bulanan (8 Kolom) + Kalender Keuangan (4 Kolom) */}
                <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
                    {/* Realisasi Bulanan (Hours Activity Style) */}
                    <div className="animate-rise xl:col-span-8" style={{ animationDelay: '300ms' }}>
                        <Surface
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
                                    Aktif
                                </StatusBadge>
                            }
                        >
                            <div className="mt-1">
                                <Chart 
                                    options={monthlyRealizationOptions} 
                                    series={monthlyRealizationSeries} 
                                    type="bar" 
                                    height={320} 
                                />
                            </div>
                        </Surface>
                    </div>

                    {/* Mini Kalender Keuangan */}
                    <div className="animate-rise xl:col-span-4" style={{ animationDelay: '360ms' }}>
                        <CalendarWidget />
                    </div>
                </div>

                {/* 3. Baris Program Terbesar SNP (7 Kolom) + Agenda Tahapan BOSP (5 Kolom) */}
                <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
                    {/* Program Belanja SNP & Pemanfaatan */}
                    <div className="animate-rise xl:col-span-7" style={{ animationDelay: '420ms' }}>
                        <Surface
                            icon={
                                <IconTile tone="mint" size="md">
                                    <Layers />
                                </IconTile>
                            }
                            title="Program Terbesar & SNP"
                            subtitle="Realisasi kegiatan belanja sekolah berdasarkan Standar Nasional Pendidikan"
                            actions={
                                <span className="cursor-pointer text-[11px] font-bold text-brand-600 hover:underline dark:text-brand-300">
                                    Lihat Semua
                                </span>
                            }
                        >
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                {/* Donut Chart SNP */}
                                <div className="flex flex-col items-center justify-center rounded-[22px] border border-slate-100/80 bg-slate-50/60 p-2 dark:border-white/5 dark:bg-white/[0.02]">
                                    <Chart 
                                        options={budgetPieOptions} 
                                        series={budgetPieSeries} 
                                        type="donut" 
                                        width="100%" 
                                    />
                                </div>

                                {/* List Program Teratas */}
                                <div className="flex flex-col justify-center space-y-3">
                                    {topPrograms.length > 0 ? (
                                        topPrograms.map((program: any, idx: number) => {
                                            const totalReal = statistik?.total_realisasi || 1;
                                            const percent = Math.min(Math.round((program.total / totalReal) * 100), 100);
                                            return (
                                                <div 
                                                    key={idx}
                                                    className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 p-3 transition-colors hover:border-lime-300 hover:bg-lime-100/40 dark:border-white/5 dark:bg-white/[0.02] dark:hover:border-lime-400/30 dark:hover:bg-lime-400/5"
                                                >
                                                    <div className="min-w-0 flex-1 space-y-1">
                                                        <p className="truncate text-[11px] font-bold text-slate-900 dark:text-white">
                                                            {program.nama_program}
                                                        </p>
                                                        <div className="flex items-center gap-2">
                                                            <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
                                                                <div 
                                                                    className="h-1.5 rounded-full bg-gradient-to-r from-lime-400 to-lime-500"
                                                                    style={{ width: `${percent}%` }}
                                                                />
                                                            </div>
                                                            <span className="sikas-num text-sikas-num text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                                                                {percent}%
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <span className="sikas-num text-sikas-num whitespace-nowrap text-[12px] font-extrabold text-slate-800 dark:text-slate-200">
                                                        {formatShortCurrency(program.total)}
                                                    </span>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <EmptyState
                                            icon={<PieChart className="h-5 w-5" />}
                                            title="Belum ada transaksi realisasi program tercatat"
                                            className="py-8"
                                        />
                                    )}
                                </div>
                            </div>
                        </Surface>
                    </div>

                    {/* Status Tahapan Penyaluran */}
                    <div className="animate-rise xl:col-span-5" style={{ animationDelay: '480ms' }}>
                        <Surface
                            icon={
                                <IconTile tone="amber" size="md">
                                    <Clock />
                                </IconTile>
                            }
                            title="Agenda Tahapan BOSP"
                            subtitle="Status pelaporan & penatausahaan"
                        >
                            <div className="space-y-2.5">
                                <div className="flex items-center justify-between gap-2 rounded-2xl border border-slate-100 bg-slate-50/50 p-2.5 transition hover:border-lime-300 hover:bg-lime-100/40 dark:border-white/5 dark:bg-white/[0.02] dark:hover:border-lime-400/30 dark:hover:bg-lime-400/5">
                                    <div className="flex min-w-0 items-center gap-2.5">
                                        <IconTile tone="mint" size="sm">
                                            <CheckCircle2 />
                                        </IconTile>
                                        <div className="min-w-0">
                                            <p className="truncate text-[11px] font-extrabold text-slate-900 dark:text-white">Tahap 1 BOSP</p>
                                            <p className="text-[9.5px] font-semibold text-slate-400 dark:text-slate-500">Januari - Juni</p>
                                        </div>
                                    </div>
                                    <StatusBadge tone="success">Tersalur</StatusBadge>
                                </div>

                                <div className="flex items-center justify-between gap-2 rounded-2xl border border-lime-200 bg-lime-100/40 p-2.5 transition hover:border-lime-300 dark:border-lime-400/30 dark:bg-lime-400/5">
                                    <div className="flex min-w-0 items-center gap-2.5">
                                        <IconTile tone="violet" size="sm">
                                            <Clock />
                                        </IconTile>
                                        <div className="min-w-0">
                                            <p className="truncate text-[11px] font-extrabold text-slate-900 dark:text-white">Tahap 2 BOSP</p>
                                            <p className="text-[9.5px] font-semibold text-slate-400 dark:text-slate-500">Juli - Desember</p>
                                        </div>
                                    </div>
                                    <StatusBadge tone="violet">Aktif</StatusBadge>
                                </div>

                                <div className="flex items-center justify-between gap-2 rounded-2xl border border-slate-100 bg-slate-50/50 p-2.5 transition hover:border-lime-300 hover:bg-lime-100/40 dark:border-white/5 dark:bg-white/[0.02] dark:hover:border-lime-400/30 dark:hover:bg-lime-400/5">
                                    <div className="flex min-w-0 items-center gap-2.5">
                                        <IconTile tone="amber" size="sm">
                                            <Sparkles />
                                        </IconTile>
                                        <div className="min-w-0">
                                            <p className="truncate text-[11px] font-extrabold text-slate-900 dark:text-white">Laporan SPTJ & SP2B</p>
                                            <p className="text-[9.5px] font-semibold text-slate-400 dark:text-slate-500">Penutupan BKU Bulanan</p>
                                        </div>
                                    </div>
                                    <StatusBadge tone="warning">Terjadwal</StatusBadge>
                                </div>
                            </div>
                        </Surface>
                    </div>
                </div>

                {/* 4. Baris Tren Realisasi 5 Tahun Terakhir (12 Kolom Penuh) */}
                <div className="animate-rise" style={{ animationDelay: '540ms' }}>
                    <Surface
                        icon={
                            <IconTile tone="mint" size="md">
                                <TrendingUp />
                            </IconTile>
                        }
                        title="Tren Realisasi 5 Tahun Terakhir"
                        subtitle="Komparasi penyerapan dana dari tahun ke tahun"
                    >
                        <div className="mt-1">
                            <Chart 
                                options={yearlyRealizationOptions} 
                                series={yearlyRealizationSeries} 
                                type="area" 
                                height={280} 
                            />
                        </div>
                    </Surface>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
