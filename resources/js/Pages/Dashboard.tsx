import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import StatCard from '@/Components/StatCard';
import BentoCard from '@/Components/Bento/BentoCard';
import ArkasQuickSyncCard from '@/Components/Bento/ArkasQuickSyncCard';
import CalendarWidget from '@/Components/Bento/CalendarWidget';
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
    ArrowUpRight
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
 * Dashboard Utama SIKAS — Neo-Bento Executive Design (Eduplex Style):
 * Struktur Bento Grid 12-kolom, 4 StatCard dengan fisika 3D tilt,
 * grafik batang rounded modern, kartu promo integrasi ARKAS,
 * widget kalender keuangan, dan daftar status tahapan penatausahaan.
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
    const [isSyncing, setIsSyncing] = useState(false);

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

    const chartTheme = { mode: isDarkMode ? 'dark' : 'light' } as const;

    // 1. Grafik Realisasi Bulanan (Hours Activity Style)
    const monthlyRealizationSeries = useMemo(() => [{
        name: 'Realisasi',
        data: grafikTahunan?.realisasi_data || []
    }], [grafikTahunan]);

    const monthlyRealizationOptions: ApexOptions = useMemo(() => ({
        chart: { 
            type: 'bar', 
            height: 320, 
            background: 'transparent', 
            toolbar: { show: false },
            fontFamily: 'inherit',
        },
        theme: chartTheme,
        colors: ['#7C5CFF'],
        plotOptions: { 
            bar: { 
                borderRadius: 8, 
                borderRadiusApplication: 'end',
                columnWidth: '40%',
            } 
        },
        grid: {
            borderColor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(226,232,240,0.7)',
            strokeDashArray: 4,
            padding: { top: 0, right: 0, bottom: 0, left: 10 }
        },
        dataLabels: { enabled: false },
        xaxis: { 
            categories: grafikTahunan?.categories || [],
            labels: {
                style: {
                    colors: isDarkMode ? '#94A3B8' : '#64748B',
                    fontSize: '11px',
                    fontWeight: 500,
                }
            },
            axisBorder: { show: false },
            axisTicks: { show: false },
        },
        yaxis: {
            labels: { 
                formatter: (val: number) => formatShortCurrency(val),
                style: {
                    colors: isDarkMode ? '#94A3B8' : '#64748B',
                    fontSize: '11px',
                }
            }
        },
        tooltip: { 
            theme: isDarkMode ? 'dark' : 'light',
            y: { formatter: (val) => formatFullCurrency(val) } 
        }
    }), [isDarkMode, grafikTahunan]);

    // 2. Grafik Perbandingan 5 Tahun (Area Smooth)
    const yearlyRealizationSeries = useMemo(() => [{
        name: 'Realisasi BOSP',
        data: perbandingan?.map((item: any) => item.realisasi_rupiah) || []
    }], [perbandingan]);

    const yearlyRealizationOptions: ApexOptions = useMemo(() => ({
        chart: { 
            type: 'area', 
            height: 280, 
            background: 'transparent', 
            toolbar: { show: false },
            fontFamily: 'inherit',
        },
        theme: chartTheme,
        colors: ['#10B981'],
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
        grid: {
            borderColor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(226,232,240,0.7)',
            strokeDashArray: 4,
        },
        xaxis: { 
            categories: perbandingan?.map((item: any) => item.tahun) || [],
            labels: {
                style: {
                    colors: isDarkMode ? '#94A3B8' : '#64748B',
                    fontSize: '11px',
                }
            },
            axisBorder: { show: false },
            axisTicks: { show: false },
        },
        yaxis: { 
            labels: { 
                formatter: (val: number) => formatShortCurrency(val),
                style: {
                    colors: isDarkMode ? '#94A3B8' : '#64748B',
                    fontSize: '11px',
                }
            } 
        },
        tooltip: { 
            theme: isDarkMode ? 'dark' : 'light',
            y: { formatter: (val) => formatFullCurrency(val) } 
        }
    }), [isDarkMode, perbandingan]);

    // 3. Pemanfaatan SNP Pie Chart
    const budgetPieSeries = useMemo(() => pemanfaatan?.map((item: any) => item.realisasi) || [], [pemanfaatan]);
    const budgetPieOptions: ApexOptions = useMemo(() => ({
        chart: { type: 'donut', background: 'transparent' },
        theme: chartTheme,
        labels: pemanfaatan?.map((item: any) => item.program) || [],
        colors: ['#7C5CFF', '#10B981', '#F59E0B', '#EF4444', '#3B82F6', '#EC4899', '#8B5CF6', '#64748B'],
        stroke: { show: false },
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
            fontSize: '11px',
            labels: { colors: isDarkMode ? '#94A3B8' : '#64748B' }
        },
        tooltip: {
            theme: isDarkMode ? 'dark' : 'light',
            y: { formatter: (val) => formatFullCurrency(val) }
        }
    }), [isDarkMode, pemanfaatan, statistik]);

    const topPrograms = chartProgram?.slice(0, 4) || [];
    const persentaseRealisasi = Number(statistik?.persentase_realisasi || 0);

    return (
        <AuthenticatedLayout
            header={
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            Ringkasan Keuangan Sekolah
                        </span>
                        {loading && (
                            <span className="inline-flex items-center gap-1.5 text-xs text-brand-500 animate-pulse font-medium ml-2">
                                <RefreshCw className="h-3 w-3 animate-spin" />
                                <span>Menyinkronkan data...</span>
                            </span>
                        )}
                    </div>

                    {/* Filter Pills Container */}
                    <div className="flex flex-wrap items-center gap-2.5">
                        <div className="inline-flex items-center gap-1.5 rounded-2xl border border-slate-200/80 bg-white p-1 shadow-sm dark:border-white/10 dark:bg-[#151324]">
                            <select
                                value={variant}
                                onChange={handleVariantChange}
                                className="h-8 rounded-xl border-none bg-transparent px-3 py-0 text-xs font-bold text-slate-800 focus:outline-none focus:ring-0 dark:text-slate-200 cursor-pointer"
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
                                className="h-8 rounded-xl border-none bg-transparent px-3 py-0 text-xs font-bold text-slate-800 focus:outline-none focus:ring-0 dark:text-slate-200 cursor-pointer"
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
                    </div>
                </div>
            }
        >
            <Head title="Dashboard SIKAS" />

            <div className="p-4 sm:p-6 lg:p-8 space-y-8">
                {/* 1. Baris 4 StatCard Utama (Eduplex Top Cards dengan 3D Tilt) */}
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                    <StatCard
                        title="Pagu Anggaran"
                        value={formatShortCurrency(statistik?.pagu_anggaran)}
                        tooltip={formatFullCurrency(statistik?.pagu_anggaran)}
                        description={`Pagu Resmi ${variant.toUpperCase()}`}
                        trend={{ value: 'Target RKAS', isPositive: true }}
                        icon={<Wallet className="h-6 w-6 text-brand-500" />}
                    />
                    <StatCard
                        title="Total Realisasi"
                        value={formatShortCurrency(statistik?.total_realisasi)}
                        tooltip={formatFullCurrency(statistik?.total_realisasi)}
                        description={`${persentaseRealisasi.toFixed(1)}% dari total pagu`}
                        trend={{ value: `${persentaseRealisasi.toFixed(1)}%`, isPositive: persentaseRealisasi >= 50 }}
                        icon={<TrendingUp className="h-6 w-6 text-emerald-500" />}
                    />
                    <StatCard
                        title="Sisa Saldo Kas"
                        value={formatShortCurrency(statistik?.sisa_anggaran)}
                        tooltip={formatFullCurrency(statistik?.sisa_anggaran)}
                        description="Sisa Alokasi Anggaran"
                        trend={{ value: 'Kas Tersedia', isPositive: true }}
                        icon={<Coins className="h-6 w-6 text-amber-500" />}
                    />
                    <StatCard
                        title="Penerimaan BOSP"
                        value={formatShortCurrency(statistik?.total_penerimaan)}
                        tooltip={formatFullCurrency(statistik?.total_penerimaan)}
                        description={`Efisiensi: ${statistik?.efisiensi_anggaran ? statistik.efisiensi_anggaran.toFixed(1) : '0'}%`}
                        trend={{ value: 'Tervalidasi', isPositive: true }}
                        icon={<Building2 className="h-6 w-6 text-blue-500" />}
                    />
                </div>

                {/* 2. Bento Grid Utama: 8 Kolom Kiri + 4 Kolom Kanan */}
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                    {/* Kolom Kiri (8 Kolom) */}
                    <div className="space-y-6 lg:col-span-8">
                        {/* Realisasi Bulanan (Hours Activity Style) */}
                        <BentoCard
                            title={`Realisasi Bulanan Tahun ${year}`}
                            subtitle="Alur penyerapan kas bendahara sepanjang tahun berjalan"
                            icon={<BarChart3 className="h-5 w-5 text-brand-500" />}
                            badge={
                                <span className="inline-flex items-center gap-1 rounded-full bg-brand-500/10 px-2.5 py-1 text-[11px] font-semibold text-brand-600 dark:text-brand-400">
                                    <Sparkles className="h-3 w-3" />
                                    <span>Aktif</span>
                                </span>
                            }
                        >
                            <div className="mt-2">
                                <Chart 
                                    options={monthlyRealizationOptions} 
                                    series={monthlyRealizationSeries} 
                                    type="bar" 
                                    height={320} 
                                />
                            </div>
                        </BentoCard>

                        {/* Program Belanja SNP & Pemanfaatan (Course You're Taking Style) */}
                        <BentoCard
                            title="Program Terbesar & SNP"
                            subtitle="Realisasi kegiatan belanja sekolah berdasarkan Standar Nasional Pendidikan"
                            icon={<Layers className="h-5 w-5 text-emerald-500" />}
                            action={
                                <span className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline cursor-pointer">
                                    Lihat Semua
                                </span>
                            }
                        >
                            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 pt-2">
                                {/* Donut Chart SNP */}
                                <div className="flex flex-col items-center justify-center p-2 rounded-2xl bg-slate-50/50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/5">
                                    <Chart 
                                        options={budgetPieOptions} 
                                        series={budgetPieSeries} 
                                        type="donut" 
                                        width="100%" 
                                    />
                                </div>

                                {/* List Program Teratas (Course style) */}
                                <div className="space-y-3.5 flex flex-col justify-center">
                                    {topPrograms.length > 0 ? (
                                        topPrograms.map((program: any, idx: number) => {
                                            const totalReal = statistik?.total_realisasi || 1;
                                            const percent = Math.min(Math.round((program.total / totalReal) * 100), 100);
                                            return (
                                                <div 
                                                    key={idx}
                                                    className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-slate-50/70 hover:bg-slate-100/70 dark:bg-white/[0.03] dark:hover:bg-white/[0.06] transition-colors border border-slate-100 dark:border-white/5"
                                                >
                                                    <div className="min-w-0 flex-1 space-y-1">
                                                        <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                                            {program.nama_program}
                                                        </p>
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-24 bg-slate-200 dark:bg-white/10 rounded-full h-1.5 overflow-hidden">
                                                                <div 
                                                                    className="h-1.5 rounded-full bg-brand-500"
                                                                    style={{ width: `${percent}%` }}
                                                                />
                                                            </div>
                                                            <span className="text-[10px] text-slate-500 font-medium">
                                                                {percent}%
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <span className="font-display text-xs font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                                                        {formatShortCurrency(program.total)}
                                                    </span>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <div className="text-center py-8 text-xs text-slate-400">
                                            Belum ada transaksi realisasi program tercatat
                                        </div>
                                    )}
                                </div>
                            </div>
                        </BentoCard>

                        {/* Perbandingan 5 Tahun */}
                        <BentoCard
                            title="Tren Realisasi 5 Tahun Terakhir"
                            subtitle="Komparasi penyerapan dana dari tahun ke tahun"
                            icon={<TrendingUp className="h-5 w-5 text-emerald-500" />}
                        >
                            <div className="mt-2">
                                <Chart 
                                    options={yearlyRealizationOptions} 
                                    series={yearlyRealizationSeries} 
                                    type="area" 
                                    height={260} 
                                />
                            </div>
                        </BentoCard>
                    </div>

                    {/* Kolom Kanan (4 Kolom) */}
                    <div className="space-y-6 lg:col-span-4">
                        {/* 1. Kartu Promo-Style Integrasi ARKAS (Go Premium style) */}
                        <ArkasQuickSyncCard 
                            isSyncing={isSyncing}
                            onSyncClick={async () => {
                                setIsSyncing(true);
                                try {
                                    await fetchDashboardData(year, variant);
                                } finally {
                                    setTimeout(() => setIsSyncing(false), 800);
                                }
                            }}
                        />

                        {/* 2. Mini Kalender Keuangan */}
                        <CalendarWidget />

                        {/* 3. Status Tahapan Penyaluran (Assignments style) */}
                        <BentoCard
                            title="Agenda Tahapan BOSP"
                            subtitle="Status pelaporan & penatausahaan"
                            icon={<Clock className="h-5 w-5 text-amber-500" />}
                        >
                            <div className="space-y-3 pt-1">
                                <div className="flex items-center justify-between p-3 rounded-2xl border border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02]">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
                                            <CheckCircle2 className="h-4 w-4" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-slate-900 dark:text-white">Tahap 1 BOSP</p>
                                            <p className="text-[10px] text-slate-500">Januari - Juni</p>
                                        </div>
                                    </div>
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400">
                                        Tersalur
                                    </span>
                                </div>

                                <div className="flex items-center justify-between p-3 rounded-2xl border border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02]">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-100 text-brand-600 dark:bg-brand-500/20 dark:text-brand-400">
                                            <Clock className="h-4 w-4" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-slate-900 dark:text-white">Tahap 2 BOSP</p>
                                            <p className="text-[10px] text-slate-500">Juli - Desember</p>
                                        </div>
                                    </div>
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-brand-100 text-brand-700 dark:bg-brand-500/20 dark:text-brand-400">
                                        Aktif
                                    </span>
                                </div>

                                <div className="flex items-center justify-between p-3 rounded-2xl border border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02]">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400">
                                            <Sparkles className="h-4 w-4" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-slate-900 dark:text-white">Laporan SPTJ & SP2B</p>
                                            <p className="text-[10px] text-slate-500">Penutupan BKU Bulanan</p>
                                        </div>
                                    </div>
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400">
                                        Terjadwal
                                    </span>
                                </div>
                            </div>
                        </BentoCard>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
