import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import StatCard from '@/Components/StatCard';
import { Head, usePage } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import Chart from 'react-apexcharts';
import { ApexOptions } from 'apexcharts';
import axios from 'axios';

interface DashboardProps {
    statistik: any;
    grafikRealisasiTahunan: any;
    chartRealisasiProgram: any;
    pemanfaatanAnggaran: any;
    perbandinganLimaTahun: any;
    penganggaran: any;
    tahunAktif: any;
    availableYears: any;
    auth: any;
}

export default function Dashboard({
    statistik: initialStatistik,
    grafikRealisasiTahunan: initialGrafikTahunan,
    chartRealisasiProgram: initialChartProgram,
    pemanfaatanAnggaran: initialPemanfaatan,
    perbandinganLimaTahun: initialPerbandingan,
    tahunAktif,
    availableYears
}: DashboardProps) {
    const [year, setYear] = useState(tahunAktif || new Date().getFullYear().toString());
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [loading, setLoading] = useState(false);

    // State for dashboard data
    const [statistik, setStatistik] = useState(initialStatistik);
    const [grafikTahunan, setGrafikTahunan] = useState(initialGrafikTahunan);
    const [chartProgram, setChartProgram] = useState(initialChartProgram);
    const [pemanfaatan, setPemanfaatan] = useState(initialPemanfaatan);
    const [perbandingan, setPerbandingan] = useState(initialPerbandingan);

    useEffect(() => {
        const checkDarkMode = () => setIsDarkMode(document.documentElement.classList.contains('dark'));
        checkDarkMode();
        const observer = new MutationObserver(checkDarkMode);
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
        return () => observer.disconnect();
    }, []);

    // Fetch data when year changes
    const fetchDashboardData = async (selectedYear: string) => {
        if (selectedYear === tahunAktif && !loading) return; // Avoid refetching initial data unneccesarily if logic permits, but here we can just fetch to be safe or use initial data for first render

        // Actually, on mount we have initial data. We only fetch if year changes from initial, OR if we want to support switching back.
        // Simplest: only fetch if selectedYear different from current logic context.
        // But since we are client-side switching, we fetch.

        try {
            setLoading(true);
            const response = await axios.get(route('dashboard.data'), { params: { tahun: selectedYear } });
            if (response.data.success) {
                setStatistik(response.data.statistik);
                setGrafikTahunan(response.data.grafik_realisasi_tahunan);
                setChartProgram(response.data.chart_realisasi_program);
                setPemanfaatan(response.data.pemanfaatan_anggaran);
                setPerbandingan(response.data.perbandingan_lima_tahun);
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
        fetchDashboardData(newYear);
    };

    const chartTheme = { mode: isDarkMode ? 'dark' : 'light' } as const;

    // 1. Chart Realisasi Bulanan
    const monthlyRealizationSeries = [{
        name: 'Realisasi (Ribuan)',
        data: grafikTahunan?.realisasi_data || []
    }];
    const monthlyRealizationOptions: ApexOptions = {
        chart: { type: 'bar', height: 350, background: 'transparent', toolbar: { show: false } },
        theme: chartTheme,
        colors: ['#3b82f6'],
        plotOptions: { bar: { borderRadius: 4, columnWidth: '60%' } },
        dataLabels: { enabled: false },
        xaxis: { categories: grafikTahunan?.categories || [] },
        yaxis: {
            labels: { formatter: (val) => val.toLocaleString('id-ID') }
        },
        title: { text: `Realisasi Perbulan Tahun ${year}`, align: 'left', style: { fontSize: '16px', fontWeight: 600 } },
        tooltip: { y: { formatter: (val) => `Rp ${(val * 1000).toLocaleString('id-ID')}` } }
    };

    // 2. Chart Perbandingan 5 Tahun
    const yearlyRealizationSeries = [{
        name: 'Realisasi',
        data: perbandingan?.map((item: any) => item.realisasi_rupiah) || []
    }];
    const yearlyRealizationOptions: ApexOptions = {
        chart: { type: 'area', height: 350, background: 'transparent', toolbar: { show: false } },
        theme: chartTheme,
        colors: ['#10b981'],
        fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.7, opacityTo: 0.9, stops: [0, 90, 100] } },
        dataLabels: { enabled: false },
        stroke: { curve: 'smooth', width: 2 },
        xaxis: { categories: perbandingan?.map((item: any) => item.tahun) || [] },
        yaxis: { labels: { formatter: (val) => `Rp ${(val / 1000000).toFixed(0)} Jt` } },
        title: { text: 'Realisasi 5 Tahun Terakhir', align: 'left', style: { fontSize: '16px', fontWeight: 600 } },
        tooltip: { y: { formatter: (val) => `Rp ${val.toLocaleString('id-ID')}` } }
    };

    // 3. Chart Pie Pemanfaatan Anggaran
    const budgetPieSeries = pemanfaatan?.map((item: any) => item.realisasi) || [];
    const budgetPieOptions: ApexOptions = {
        chart: { type: 'pie', width: 380, background: 'transparent' },
        theme: chartTheme,
        labels: pemanfaatan?.map((item: any) => item.program) || [],
        title: { text: 'Pemanfaatan Anggaran (8 SNP)', align: 'left', style: { fontSize: '16px', fontWeight: 600 } },
        colors: ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#6366f1', '#ec4899', '#8b5cf6', '#64748b'],
        stroke: { show: false },
        legend: { position: 'bottom' },
        tooltip: {
            y: { formatter: (val) => `Rp ${val.toLocaleString('id-ID')}` }
        }
    };

    // 4. Progres Bar Data (Ambil top 5 program untuk display list)
    const topPrograms = chartProgram?.slice(0, 5) || [];

    return (
        <AuthenticatedLayout
            header={
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold leading-tight text-gray-800 dark:text-gray-200">
                        Dashboard SIKAS
                    </h2>
                    <div className="flex items-center gap-2">
                        {loading && <span className="text-sm text-gray-500 animate-pulse">Memuat data...</span>}
                        <select
                            value={year}
                            onChange={handleYearChange}
                            className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 h-10 py-1"
                        >
                            {availableYears && availableYears.length > 0 ? (
                                availableYears.map((y: any) => (
                                    <option key={y} value={y}>{y}</option>
                                ))
                            ) : (
                                <option value={year}>{year}</option>
                            )}
                        </select>
                    </div>
                </div>
            }
        >
            <Head title="Dashboard" />

            <div className="py-8">
                <div className="mx-auto w-full px-4 sm:px-6 lg:px-8">

                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
                        <StatCard
                            title="Pagu Anggaran"
                            value={`Rp ${statistik?.pagu_anggaran_display || '0'}`}
                            color="bg-blue-50"
                            icon={<svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>}
                        />
                        <StatCard
                            title="Total Realisasi"
                            value={`Rp ${statistik?.total_realisasi_display || '0'}`}
                            color="bg-green-50"
                            icon={<svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path></svg>}
                        />
                        <StatCard
                            title="Perssentase Realisasi"
                            value={`${statistik?.persentase_realisasi ? statistik.persentase_realisasi.toFixed(1) : '0'}%`}
                            color="bg-indigo-50"
                            icon={<svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z"></path></svg>}
                        />
                        <StatCard
                            title="Sisa Anggaran"
                            value={`Rp ${statistik?.sisa_anggaran_display || '0'}`}
                            color="bg-red-50"
                            icon={<svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>}
                        />

                        {/* Additional Stats Row */}
                        <StatCard title="Total Penerimaan" value={`Rp ${statistik?.total_penerimaan_display || '0'}`} />
                        <StatCard title="Total Belanja" value={`Rp ${statistik?.total_belanja_display || '0'}`} />
                        <StatCard title="Surplus/Defisit" value={`Rp ${statistik?.defisit_display || '0'}`} description="Pagu - Realisasi" />
                        <StatCard title="Efisiensi Anggaran" value={`${statistik?.efisiensi_anggaran ? statistik.efisiensi_anggaran.toFixed(1) : '0'}%`} />
                    </div>

                    {/* Charts Grid - Top Row */}
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 mb-8">
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
                            <Chart options={monthlyRealizationOptions} series={monthlyRealizationSeries} type="bar" height={350} />
                        </div>
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
                            <Chart options={yearlyRealizationOptions} series={yearlyRealizationSeries} type="area" height={350} />
                        </div>
                    </div>

                    {/* Charts Grid - Bottom Row */}
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 mb-8">
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md col-span-1 lg:col-span-1">
                            <Chart options={budgetPieOptions} series={budgetPieSeries} type="pie" width="100%" />
                        </div>
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md col-span-1 lg:col-span-2">
                            <h3 className="text-lg font-medium text-gray-700 dark:text-gray-200 mb-4">Progres Program Terbesar</h3>

                            {topPrograms.length > 0 ? (
                                <div className="space-y-4">
                                    {topPrograms.map((program: any, idx: number) => {
                                        // Calculate percentage relative to total realization for visual bar
                                        const totalReal = statistik?.total_realisasi || 1;
                                        const percent = (program.total / totalReal) * 100;
                                        return (
                                            <div key={idx}>
                                                <div className="flex justify-between text-sm text-gray-600 dark:text-gray-300 mb-1">
                                                    <span className="truncate pr-2">{program.nama_program}</span>
                                                    <span className="font-semibold whitespace-nowrap">Rp {program.total.toLocaleString('id-ID')}</span>
                                                </div>
                                                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                                    <div
                                                        className="h-2 rounded-full"
                                                        style={{ width: `${Math.min(percent, 100)}%`, backgroundColor: program.warna || '#3b82f6' }}
                                                    ></div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="text-center py-10 text-gray-500">Belum ada data realisasi program</div>
                            )}

                            <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
                                <h4 className="text-sm font-medium text-gray-500 mb-2">Target Penyerapan</h4>
                                <div className="flex items-center gap-4">
                                    <div className="flex-1 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4">
                                        <div
                                            className={`h-4 rounded-full ${(statistik?.persentase_realisasi || 0) > 90 ? 'bg-green-500' :
                                                (statistik?.persentase_realisasi || 0) > 50 ? 'bg-blue-500' : 'bg-yellow-500'
                                                }`}
                                            style={{ width: `${Math.min(statistik?.persentase_realisasi || 0, 100)}%` }}
                                        ></div>
                                    </div>
                                    <span className="text-sm font-bold text-gray-700 dark:text-gray-300">
                                        {statistik?.persentase_realisasi ? statistik.persentase_realisasi.toFixed(1) : '0'}%
                                    </span>
                                </div>
                                <p className="text-xs text-gray-400 mt-1">Target terserap 100% pada akhir tahun anggaran.</p>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </AuthenticatedLayout>
    );
}
