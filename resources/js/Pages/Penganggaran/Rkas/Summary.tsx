import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, useForm, router } from '@inertiajs/react';
import { PageProps } from '@/types';
import { useState, Fragment, useEffect } from 'react';
import Chart from 'react-apexcharts';
import DatePicker from '@/Components/DatePicker';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

interface SummaryProps extends Record<string, unknown> {
    anggaran: {
        id: number;
        tahun_anggaran: string;
        pagu_anggaran: number;
        pagu_total: string;
        tanggal_cetak?: string;
        komite: string;
        kepala_sekolah: string;
        nip_kepala_sekolah: string;
        bendahara: string;
        nip_bendahara: string;
        sekolah: {
            nama_sekolah: string;
            npsn: string;
            alamat: string;
            kecamatan: string;
            kabupaten_kota: string;
            provinsi: string;
        };
    };
    groupedData: {
        [program: string]: {
            [kegiatan: string]: Array<{
                kode_rekening: string;
                nama_rekening: string;
                months: { [key: string]: number };
                total: number;
            }>
        }
    };
    tahapanData: Array<{
        kode: string;
        nama: string;
        total: number;
        kegiatans: Array<{
            kode: string;
            full_kode: string;
            nama: string;
            sub_kegiatan_nama: string;
            total: number;
            items: Array<{
                kode_rekening: string;
                uraian: string;
                volume: number;
                satuan: string;
                tarif: number;
                total: number;
                tahap1: number;
                tahap2: number;
                program_code: string;
                bulanan: { [key: string]: { volume: number; total: number } };
            }>
        }>
    }>;
    rkaBulananData: Array<{
        kode: string;
        nama: string;
        total: number;
        kegiatans: Array<{
            kode: string;
            full_kode: string;
            nama: string;
            sub_kegiatan_nama: string;
            total: number;
            items: Array<{
                kode_rekening: string;
                uraian: string;
                volume: number;
                satuan: string;
                tarif: number;
                total: number;
                tahap1: number;
                tahap2: number;
                program_code: string;
                bulanan: { [key: string]: { volume: number; total: number } };
            }>
        }>
    }>;
    rekapData: Array<{
        kode_rekening: string;
        uraian: string;
        jumlah: number;
    }>;
    perTahapData: Array<{
        no: string;
        uraian: string;
        tahap1: number;
        tahap2: number;
        total: number;
    }>;
    lembarData: Array<{
        type: 'header' | 'item';
        kode_rekening: string;
        uraian: string;
        volume?: number;
        satuan?: string;
        harga_satuan?: number;
        jumlah: number;
        sort_key?: string;
    }>;
    grafikData: {
        total: number;
        buku: { value: number; percentage: number; valid: boolean; message: string; };
        honor: { value: number; percentage: number; valid: boolean; message: string; };
        pemeliharaan: { value: number; percentage: number; valid: boolean; message: string; };
        jenis_belanja: Array<{ label: string; value: number; percentage: number; }>;
    };
}

export default function Summary({ auth, anggaran, groupedData, tahapanData, rkaBulananData, rekapData, perTahapData, lembarData, grafikData }: PageProps<SummaryProps>) {
    const [activeTab, setActiveTab] = useState('Rka Tahapan');
    const [selectedMonth, setSelectedMonth] = useState('Januari');
    const [isLoading, setIsLoading] = useState(false);
    const [isDarkMode, setIsDarkMode] = useState(false);

    useEffect(() => {
        const checkDarkMode = () => setIsDarkMode(document.documentElement.classList.contains('dark'));
        checkDarkMode();
        const observer = new MutationObserver(checkDarkMode);
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
        return () => observer.disconnect();
    }, []);

    const handleMonthChange = (month: string) => {
        setSelectedMonth(month);
        setIsLoading(true);
        router.get(
            route('rkas.summary', { id: anggaran.id }),
            { month: month },
            {
                preserveState: true,
                preserveScroll: true,
                only: ['rkaBulananData'], // Request updated data
                onSuccess: () => setIsLoading(false),
                onError: () => setIsLoading(false),
            }
        );
    };

    const [showDateModal, setShowDateModal] = useState(false);
    const { data: dateData, setData: setDateData, patch, processing, errors, reset } = useForm({
        tanggal_cetak: anggaran.tanggal_cetak || new Date().toISOString().split('T')[0]
    });

    const [showPrintModal, setShowPrintModal] = useState(false);
    const [printTarget, setPrintTarget] = useState<'tahapan' | 'tahapan_v1' | 'rekap' | 'lembar' | 'bulanan'>('tahapan');
    const [printSettings, setPrintSettings] = useState({
        paperSize: 'A4',
        orientation: 'portrait',
        fontSize: '12pt'
    });

    const handlePrint = (monthOverride?: string) => {
        let routeName = 'rkas.export-pdf';
        const params: any = {
            id: anggaran.id,
            paper_size: printSettings.paperSize,
            orientation: printSettings.orientation,
            font_size: printSettings.fontSize
        };

        if (printTarget === 'rekap') routeName = 'rkas.export-rekap-pdf';
        if (printTarget === 'lembar') routeName = 'rkas.export-lembar-kerja-pdf';
        if (printTarget === 'tahapan_v1') routeName = 'rkas.export-tahapan-v1-pdf';
        if (printTarget === 'bulanan') {
            routeName = 'rkas.export-bulanan-pdf';
            params.month = monthOverride || selectedMonth;
        }

        const url = route(routeName, params);
        window.open(url, '_blank');
        setShowPrintModal(false);
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('id-ID').format(amount);
    };

    const months = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];

    // Calculate Grand Total for Expenses
    const items = Object.values(groupedData || {}).flatMap((kegiatanGroup: any) =>
        Object.values(kegiatanGroup || {}).flatMap((rekenings: any) =>
            rekenings.map((r: any) => r.total)
        )
    );
    const totalBelanja = items.reduce((acc: number, curr: number) => acc + curr, 0);

    const tabs = [
        { name: 'Rka Tahapan', label: 'Rka Tahapan' },
        { name: 'Rka Tahapan V.1', label: 'Rka Tahapan V.1' },
        { name: 'Rka Rekap', label: 'Rka Rekap' },
        { name: 'Lembar Kerja 221', label: 'Lembar Kerja 221' },
        { name: 'Rka Bulanan', label: 'Rka Bulanan' },
        { name: 'Grafik', label: 'Grafik' },
    ];

    const handleSaveTanggalCetak = (e: React.FormEvent) => {
        e.preventDefault();
        patch(route('penganggaran.update-tanggal-cetak', anggaran.id), {
            onSuccess: () => {
                setShowDateModal(false);
            }
        });
    };

    return (
        <AuthenticatedLayout
            header={<h2 className="font-semibold text-xl text-gray-800 dark:text-gray-200 leading-tight">Summary RKAS</h2>}
        >
            {/* Print Settings Modal */}
            {showPrintModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Pengaturan Cetak</h3>
                            <button onClick={() => setShowPrintModal(false)} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ukuran Kertas</label>
                                <select
                                    value={printSettings.paperSize}
                                    onChange={(e) => setPrintSettings({ ...printSettings, paperSize: e.target.value })}
                                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                >
                                    <option value="A4">A4</option>
                                    <option value="Letter">Letter</option>
                                    <option value="Folio">Folio (F4)</option>
                                    <option value="Legal">Legal</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Orientasi</label>
                                <select
                                    value={printSettings.orientation}
                                    onChange={(e) => setPrintSettings({ ...printSettings, orientation: e.target.value })}
                                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                >
                                    <option value="portrait">Portrait</option>
                                    <option value="landscape">Landscape</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ukuran Font</label>
                                <select
                                    value={printSettings.fontSize}
                                    onChange={(e) => setPrintSettings({ ...printSettings, fontSize: e.target.value })}
                                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                >
                                    <option value="8pt">Sangat Kecil (8pt)</option>
                                    <option value="9pt">Kecil (9pt)</option>
                                    <option value="10pt">Sedang (10pt)</option>
                                    <option value="11pt">Agak Besar (11pt)</option>
                                    <option value="12pt">Normal (12pt)</option>
                                </select>
                            </div>
                        </div>

                        <div className="mt-6 flex justify-end gap-3">
                            <button
                                onClick={() => setShowPrintModal(false)}
                                className="bg-white text-gray-700 hover:bg-gray-50 border border-gray-300 px-4 py-2 rounded-md text-sm font-medium shadow-sm transition-colors dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600"
                            >
                                Batal
                            </button>
                            {printTarget === 'bulanan' && (
                                <button
                                    onClick={() => handlePrint('all')}
                                    className="bg-green-600 text-white hover:bg-green-700 px-4 py-2 rounded-md text-sm font-medium shadow-sm transition-colors"
                                >
                                    Cetak Semua Bulan
                                </button>
                            )}
                            <button
                                onClick={() => handlePrint()}
                                className="bg-indigo-600 text-white hover:bg-indigo-700 px-4 py-2 rounded-md text-sm font-medium shadow-sm transition-colors"
                            >
                                Cetak PDF
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <Head title="Summary RKAS" />

            <div className="py-6 px-4 sm:px-6 lg:px-8 max-w-[1920px] mx-auto space-y-6">

                {/* Header Section */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-4">
                    <div>
                        <Link href={route('rkas.index', anggaran.id)} className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 font-medium mb-2">
                            <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                            Kembali
                        </Link>
                        <h1 className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">Rekapan RKAS</h1>
                        <p className="text-gray-500 dark:text-gray-400">Rekap Rencana Kegiatan dan Anggaran Sekolah</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setShowDateModal(true)}
                            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md font-medium text-sm flex items-center gap-2 transition-colors"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            Tanggal Cetak
                        </button>
                        <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                            Tanggal Cetak: {anggaran.tanggal_cetak ? format(new Date(anggaran.tanggal_cetak), 'dd/MM/yyyy') : '-'}
                        </span>
                    </div>
                </div>

                {/* Tabs & Content Container */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 min-h-[600px]">

                    {/* Tabs Navigation */}
                    <div className="border-b border-gray-200 dark:border-gray-700 px-6 py-4">
                        <nav className="flex flex-wrap gap-2" aria-label="Tabs">
                            {tabs.map((tab) => (
                                <button
                                    key={tab.name}
                                    onClick={() => setActiveTab(tab.name)}
                                    className={`
                                        whitespace-nowrap px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 ease-in-out
                                        ${activeTab === tab.name
                                            ? 'bg-indigo-600 text-white shadow-md'
                                            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700/50'
                                        }
                                    `}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </nav>
                    </div>

                    {/* Content Area */}
                    <div className="p-6">

                        {/* Tab: Rka Tahapan */}
                        {activeTab === 'Rka Tahapan' && (
                            <div className="space-y-8 animate-fade-in-up">
                                {/* Action Button */}
                                <div className="flex justify-end mb-4">
                                    <button
                                        onClick={() => {
                                            setPrintTarget('tahapan');
                                            setShowPrintModal(true);
                                        }}
                                        className="bg-indigo-600 text-white hover:bg-indigo-700 px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 shadow-sm transition-colors">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                        Pengaturan Cetak
                                    </button>
                                </div>

                                <div className="bg-white dark:bg-gray-800 p-8 border border-gray-200 dark:border-gray-700 shadow-sm rounded-lg print:border-none print:shadow-none">
                                    {/* Report Header */}
                                    <div className="text-center mb-8">
                                        <h2 className="text-lg font-bold uppercase tracking-wider text-gray-900 dark:text-gray-100">KERTAS KERJA RENCANA KEGIATAN DAN ANGGARAN SEKOLAH (RKAS) PER TAHAP</h2>
                                        <h3 className="text-md font-medium uppercase text-gray-600 dark:text-gray-400 mt-1">TAHUN ANGGARAN : {anggaran.tahun_anggaran}</h3>
                                    </div>

                                    {/* School Info */}
                                    <div className="mb-6 grid grid-cols-[150px_10px_1fr] gap-1 text-sm">
                                        <div className="text-gray-600 dark:text-gray-400">NPSN</div>
                                        <div>:</div>
                                        <div className="font-medium text-gray-900 dark:text-gray-100">{anggaran.sekolah?.npsn || '-'}</div>

                                        <div className="text-gray-600 dark:text-gray-400">Nama Sekolah</div>
                                        <div>:</div>
                                        <div className="font-medium text-gray-900 dark:text-gray-100">{anggaran.sekolah?.nama_sekolah || '-'}</div>

                                        <div className="text-gray-600 dark:text-gray-400">Alamat</div>
                                        <div>:</div>
                                        <div className="font-medium text-gray-900 dark:text-gray-100">{anggaran.sekolah?.alamat || '-'}</div>

                                        <div className="text-gray-600 dark:text-gray-400">Kabupaten</div>
                                        <div>:</div>
                                        <div className="font-medium text-gray-900 dark:text-gray-100">{anggaran.sekolah?.kabupaten_kota || '-'}</div>

                                        <div className="text-gray-600 dark:text-gray-400">Provinsi</div>
                                        <div>:</div>
                                        <div className="font-medium text-gray-900 dark:text-gray-100">{anggaran.sekolah?.provinsi || '-'}</div>

                                        <div className="text-gray-600 dark:text-gray-400">Tahap</div>
                                        <div>:</div>
                                        <div className="font-medium text-gray-900 dark:text-gray-100">I dan II</div>
                                    </div>

                                    <div className="space-y-6">
                                        {/* A. PENERIMAAN */}
                                        <div>
                                            <h4 className="text-sm font-bold text-gray-900 dark:text-white uppercase mb-1">A. Penerimaan</h4>
                                            <div className="text-sm italic mb-1 text-gray-600">Sumber Dana :</div>
                                            <div className="border border-gray-900 dark:border-gray-600">
                                                <table className="min-w-full text-sm">
                                                    <thead className="bg-gray-100 dark:bg-gray-700 border-b border-gray-900 dark:border-gray-600">
                                                        <tr>
                                                            <th className="px-4 py-2 text-center font-bold text-gray-900 dark:text-gray-100 border-r border-gray-900 dark:border-gray-600 w-32">No Kode</th>
                                                            <th className="px-4 py-2 text-center font-bold text-gray-900 dark:text-gray-100 border-r border-gray-900 dark:border-gray-600">Penerimaan</th>
                                                            <th className="px-4 py-2 text-right font-bold text-gray-900 dark:text-gray-100 w-48">Jumlah</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-900 dark:divide-gray-600 bg-white dark:bg-gray-800">
                                                        <tr>
                                                            <td className="px-4 py-2 border-r border-gray-900 dark:border-gray-600 font-medium">4.3.1.01.</td>
                                                            <td className="px-4 py-2 border-r border-gray-900 dark:border-gray-600">BOS Reguler</td>
                                                            <td className="px-4 py-2 text-right font-medium">Rp. {formatCurrency(anggaran.pagu_anggaran)}</td>
                                                        </tr>
                                                        <tr className="bg-gray-200 dark:bg-gray-700/50 font-bold border-t border-gray-900 dark:border-gray-600">
                                                            <td colSpan={2} className="px-4 py-2 border-r border-gray-900 dark:border-gray-600">Total Penerimaan</td>
                                                            <td className="px-4 py-2 text-right">Rp. {formatCurrency(anggaran.pagu_anggaran)}</td>
                                                        </tr>
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>

                                        {/* B. BELANJA */}
                                        <div>
                                            <h4 className="text-sm font-bold text-gray-900 dark:text-white uppercase mb-1">B. Belanja</h4>
                                            <div className="border border-gray-900 dark:border-gray-600 overflow-x-auto">
                                                <table className="min-w-full text-sm divide-y divide-gray-900 dark:divide-gray-600">
                                                    <thead className="bg-gray-100 dark:bg-gray-700 border-b border-gray-900 dark:border-gray-600">
                                                        <tr className="divide-x divide-gray-900 dark:divide-gray-600">
                                                            <th rowSpan={2} className="px-2 py-2 text-center font-bold text-gray-900 dark:text-gray-100 w-10">No.</th>
                                                            <th rowSpan={2} className="px-2 py-2 text-center font-bold text-gray-900 dark:text-gray-100 w-32">Kode Rekening</th>
                                                            <th rowSpan={2} className="px-2 py-2 text-center font-bold text-gray-900 dark:text-gray-100 w-24">Kode Program</th>
                                                            <th rowSpan={2} className="px-4 py-2 text-center font-bold text-gray-900 dark:text-gray-100">Uraian</th>
                                                            <th colSpan={3} className="px-2 py-2 text-center font-bold text-gray-900 dark:text-gray-100 border-b border-gray-900 dark:border-gray-600">Rincian Perhitungan</th>
                                                            <th rowSpan={2} className="px-2 py-2 text-right font-bold text-gray-900 dark:text-gray-100 w-32">Jumlah</th>
                                                            <th colSpan={2} className="px-2 py-2 text-center font-bold text-gray-900 dark:text-gray-100 border-b border-gray-900 dark:border-gray-600">Tahap</th>
                                                        </tr>
                                                        <tr className="divide-x divide-gray-900 dark:divide-gray-600">
                                                            <th className="px-2 py-1 text-center font-bold text-xs">Volume</th>
                                                            <th className="px-2 py-1 text-center font-bold text-xs">Satuan</th>
                                                            <th className="px-2 py-1 text-center font-bold text-xs">Tarif Harga</th>
                                                            <th className="px-2 py-1 text-center font-bold text-xs w-24">1</th>
                                                            <th className="px-2 py-1 text-center font-bold text-xs w-24">2</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-900 dark:divide-gray-600">
                                                        {tahapanData && Object.entries(tahapanData).map(([progCode, program]: [string, any], pIndex) => (
                                                            <Fragment key={`prog-fragment-${pIndex}`}>
                                                                {/* 1. Program Row (Orange) */}
                                                                <tr className="bg-orange-200 dark:bg-orange-900/50 divide-x divide-gray-900 dark:divide-gray-600">
                                                                    <td className="px-2 py-2 text-center font-medium text-gray-900 dark:text-gray-100">{pIndex + 1}</td>
                                                                    <td className="px-2 py-2"></td>
                                                                    <td className="px-2 py-2 text-center font-medium text-gray-900 dark:text-gray-100">{progCode}</td>
                                                                    <td className="px-4 py-2 font-bold text-gray-900 dark:text-gray-100">{program.uraian}</td>
                                                                    <td className="px-2 py-2 text-center">-</td>
                                                                    <td className="px-2 py-2 text-center">-</td>
                                                                    <td className="px-2 py-2 text-center">-</td>
                                                                    <td className="px-2 py-2 text-right font-bold text-gray-900 dark:text-gray-100">{formatCurrency(program.jumlah)}</td>
                                                                    <td className="px-2 py-2 text-right font-medium text-gray-900 dark:text-gray-100">
                                                                        {formatCurrency(program.tahap1)}
                                                                    </td>
                                                                    <td className="px-2 py-2 text-right font-medium text-gray-900 dark:text-gray-100">
                                                                        {formatCurrency(program.tahap2)}
                                                                    </td>
                                                                </tr>

                                                                {program.sub_programs && Object.entries(program.sub_programs).map(([subCode, subProgram]: [string, any], sIndex) => (
                                                                    <Fragment key={`sub-fragment-${pIndex}-${sIndex}`}>
                                                                        {/* 2. Sub-Program Row (Green) */}
                                                                        <tr className="bg-green-200 dark:bg-green-900/50 divide-x divide-gray-900 dark:divide-gray-600">
                                                                            <td className="px-2 py-2 text-center font-medium text-gray-900 dark:text-gray-100">{pIndex + 1}.{sIndex + 1}</td>
                                                                            <td className="px-2 py-2"></td>
                                                                            <td className="px-2 py-2 text-center font-medium text-gray-900 dark:text-gray-100">{subCode}</td>
                                                                            <td className="px-4 py-2 font-bold text-gray-900 dark:text-gray-100">{subProgram.uraian}</td>
                                                                            <td className="px-2 py-2 text-center">-</td>
                                                                            <td className="px-2 py-2 text-center">-</td>
                                                                            <td className="px-2 py-2 text-center">-</td>
                                                                            <td className="px-2 py-2 text-right font-bold text-gray-900 dark:text-gray-100">{formatCurrency(subProgram.jumlah)}</td>
                                                                            <td className="px-2 py-2 text-right font-medium text-gray-900 dark:text-gray-100">
                                                                                {formatCurrency(subProgram.tahap1)}
                                                                            </td>
                                                                            <td className="px-2 py-2 text-right font-medium text-gray-900 dark:text-gray-100">
                                                                                {formatCurrency(subProgram.tahap2)}
                                                                            </td>
                                                                        </tr>

                                                                        {subProgram.uraian_programs && Object.entries(subProgram.uraian_programs).map(([urCode, urProgram]: [string, any], uIndex) => (
                                                                            <Fragment key={`ur-fragment-${pIndex}-${sIndex}-${uIndex}`}>
                                                                                {/* 3. Uraian Program Row (Teal) */}
                                                                                <tr className="bg-teal-200 dark:bg-teal-900/50 divide-x divide-gray-900 dark:divide-gray-600">
                                                                                    <td className="px-2 py-2 text-center font-medium text-gray-900 dark:text-gray-100">{pIndex + 1}.{sIndex + 1}.{uIndex + 1}</td>
                                                                                    <td className="px-2 py-2"></td>
                                                                                    <td className="px-2 py-2 text-center font-medium text-gray-900 dark:text-gray-100">
                                                                                        {urCode.toString().includes('.') ? urCode : `${subCode}.${urCode}`}
                                                                                    </td>
                                                                                    <td className="px-4 py-2 font-medium text-gray-900 dark:text-gray-100">{urProgram.uraian}</td>
                                                                                    <td className="px-2 py-2 text-center">-</td>
                                                                                    <td className="px-2 py-2 text-center">-</td>
                                                                                    <td className="px-2 py-2 text-center">-</td>
                                                                                    <td className="px-2 py-2 text-right font-bold text-gray-900 dark:text-gray-100">{formatCurrency(urProgram.jumlah)}</td>
                                                                                    <td className="px-2 py-2 text-right font-medium text-gray-900 dark:text-gray-100">
                                                                                        {formatCurrency(urProgram.tahap1)}
                                                                                    </td>
                                                                                    <td className="px-2 py-2 text-right font-medium text-gray-900 dark:text-gray-100">
                                                                                        {formatCurrency(urProgram.tahap2)}
                                                                                    </td>
                                                                                </tr>

                                                                                {/* 4. Items Rows (White) */}
                                                                                {urProgram.items && urProgram.items.map((item: any, iIndex: number) => (
                                                                                    <tr key={`item-${pIndex}-${sIndex}-${uIndex}-${iIndex}`} className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50 divide-x divide-gray-900 dark:divide-gray-600">
                                                                                        <td className="px-2 py-2 text-center text-gray-600 dark:text-gray-400"></td>
                                                                                        <td className="px-2 py-2 text-sm text-gray-800 dark:text-gray-200">{item.kode_rekening}</td>
                                                                                        <td className="px-2 py-2 text-center text-sm text-gray-800 dark:text-gray-200">
                                                                                            {urCode.toString().includes('.') ? urCode : `${subCode}.${urCode}`}
                                                                                        </td>
                                                                                        <td className="px-4 py-2 text-sm text-gray-800 dark:text-gray-200">{item.uraian}</td>

                                                                                        <td className="px-2 py-2 text-center text-sm text-gray-600 dark:text-gray-400">{item.volume}</td>
                                                                                        <td className="px-2 py-2 text-center text-sm text-gray-600 dark:text-gray-400">{item.satuan}</td>
                                                                                        <td className="px-2 py-2 text-right text-sm text-gray-600 dark:text-gray-400">{formatCurrency(item.tarif)}</td>

                                                                                        <td className="px-2 py-2 text-right font-medium text-gray-900 dark:text-gray-100">{formatCurrency(item.jumlah)}</td>
                                                                                        <td className="px-2 py-2 text-right text-sm text-gray-600 dark:text-gray-400">{item.tahap1 > 0 ? formatCurrency(item.tahap1) : '0'}</td>
                                                                                        <td className="px-2 py-2 text-right text-sm text-gray-600 dark:text-gray-400">{item.tahap2 > 0 ? formatCurrency(item.tahap2) : '0'}</td>
                                                                                    </tr>
                                                                                ))}
                                                                            </Fragment>
                                                                        ))}
                                                                    </Fragment>
                                                                ))}
                                                            </Fragment>
                                                        ))}
                                                        {/* Footer for total - assuming calculated from reducer of all programs */}
                                                        <tr className="bg-gray-200 dark:bg-gray-700 font-bold border-t-2 border-gray-900 dark:border-gray-500 divide-x divide-gray-900 dark:divide-gray-600">
                                                            <td colSpan={7} className="px-4 py-2 text-center uppercase">Jumlah Total</td>
                                                            <td className="px-2 py-2 text-right">
                                                                {formatCurrency(Object.values(tahapanData || {}).reduce((acc: number, prog: any) => acc + prog.jumlah, 0))}
                                                            </td>
                                                            <td className="px-2 py-2 text-right">
                                                                {formatCurrency(Object.values(tahapanData || {}).reduce((acc: number, prog: any) => acc + prog.tahap1, 0))}
                                                            </td>
                                                            <td className="px-2 py-2 text-right">
                                                                {formatCurrency(Object.values(tahapanData || {}).reduce((acc: number, prog: any) => acc + prog.tahap2, 0))}
                                                            </td>
                                                        </tr>
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>

                                        {/* Footer Signatures */}
                                        <div className="mt-12 flex justify-between text-sm text-gray-900 dark:text-gray-100 px-8">
                                            <div className="text-center mt-8">
                                                <p className="mb-20">Komite Sekolah,</p>
                                                <p className="font-bold underline uppercase">{anggaran.komite || '-'}</p>
                                            </div>

                                            <div className="text-center">
                                                <p className="mb-1">Mengetahui,</p>
                                                <p className="mb-20">Kepala Sekolah,</p>
                                                <p className="font-bold underline uppercase">{anggaran.kepala_sekolah || '-'}</p>
                                                <p>NIP. {anggaran.nip_kepala_sekolah || '-'}</p>
                                            </div>

                                            <div className="text-center">
                                                <p className="mb-1">Kec. {anggaran.sekolah?.kecamatan || '...'}, {anggaran.tanggal_cetak ? format(new Date(anggaran.tanggal_cetak), 'd MMMM yyyy', { locale: id }) : '...'}</p>
                                                <p className="mb-20">Bendahara,</p>
                                                <p className="font-bold underline uppercase">{anggaran.bendahara || '-'}</p>
                                                <p>NIP. {anggaran.nip_bendahara || '-'}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'Rka Tahapan V.1' && (
                            <div className="space-y-8 animate-fade-in-up">
                                {/* Action Button */}
                                <div className="flex justify-end mb-4">
                                    <button
                                        onClick={() => {
                                            setPrintTarget('tahapan_v1');
                                            setShowPrintModal(true);
                                        }}
                                        className="bg-indigo-600 text-white hover:bg-indigo-700 px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 shadow-sm transition-colors">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                        Pengaturan Cetak
                                    </button>
                                </div>

                                <div className="bg-white dark:bg-gray-800 p-8 border border-gray-200 dark:border-gray-700 shadow-sm rounded-lg print:border-none print:shadow-none">
                                    {/* Report Header */}
                                    <div className="text-center mb-8">
                                        <h2 className="text-lg font-bold uppercase tracking-wider text-gray-900 dark:text-gray-100">KERTAS KERJA RENCANA KEGIATAN DAN ANGGARAN SEKOLAH (RKAS) PER TAHAP V.1</h2>
                                        <h3 className="text-md font-medium uppercase text-gray-600 dark:text-gray-400 mt-1">TAHUN ANGGARAN : {anggaran.tahun_anggaran}</h3>
                                    </div>

                                    {/* School Info */}
                                    <div className="mb-6 grid grid-cols-[150px_10px_1fr] gap-1 text-sm">
                                        <div className="text-gray-600 dark:text-gray-400">NPSN</div>
                                        <div>:</div>
                                        <div className="font-medium text-gray-900 dark:text-gray-100">{anggaran.sekolah?.npsn || '-'}</div>

                                        <div className="text-gray-600 dark:text-gray-400">Nama Sekolah</div>
                                        <div>:</div>
                                        <div className="font-medium text-gray-900 dark:text-gray-100">{anggaran.sekolah?.nama_sekolah || '-'}</div>

                                        <div className="text-gray-600 dark:text-gray-400">Alamat</div>
                                        <div>:</div>
                                        <div className="font-medium text-gray-900 dark:text-gray-100">{anggaran.sekolah?.alamat || '-'}</div>

                                        <div className="text-gray-600 dark:text-gray-400">Kabupaten</div>
                                        <div>:</div>
                                        <div className="font-medium text-gray-900 dark:text-gray-100">{anggaran.sekolah?.kabupaten_kota || '-'}</div>

                                        <div className="text-gray-600 dark:text-gray-400">Provinsi</div>
                                        <div>:</div>
                                        <div className="font-medium text-gray-900 dark:text-gray-100">{anggaran.sekolah?.provinsi || '-'}</div>

                                        <div className="text-gray-600 dark:text-gray-400">Tahap</div>
                                        <div>:</div>
                                        <div className="font-medium text-gray-900 dark:text-gray-100">I dan II</div>
                                    </div>

                                    <div className="space-y-6">
                                        {/* A. PENERIMAAN */}
                                        <div>
                                            <h4 className="text-sm font-bold text-gray-900 dark:text-white uppercase mb-1">A. Penerimaan</h4>
                                            <div className="text-sm italic mb-1 text-gray-600">Sumber Dana :</div>
                                            <div className="border border-gray-900 dark:border-gray-600">
                                                <table className="min-w-full text-sm">
                                                    <thead className="bg-gray-100 dark:bg-gray-700 border-b border-gray-900 dark:border-gray-600">
                                                        <tr>
                                                            <th className="px-4 py-2 text-center font-bold text-gray-900 dark:text-gray-100 border-r border-gray-900 dark:border-gray-600 w-32">No Kode</th>
                                                            <th className="px-4 py-2 text-center font-bold text-gray-900 dark:text-gray-100 border-r border-gray-900 dark:border-gray-600">Penerimaan</th>
                                                            <th className="px-4 py-2 text-right font-bold text-gray-900 dark:text-gray-100 w-48">Jumlah</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-900 dark:divide-gray-600 bg-white dark:bg-gray-800">
                                                        <tr>
                                                            <td className="px-4 py-2 border-r border-gray-900 dark:border-gray-600 font-medium">4.3.1.01.</td>
                                                            <td className="px-4 py-2 border-r border-gray-900 dark:border-gray-600">BOS Reguler</td>
                                                            <td className="px-4 py-2 text-right font-medium">Rp. {formatCurrency(anggaran.pagu_anggaran)}</td>
                                                        </tr>
                                                        <tr className="bg-gray-200 dark:bg-gray-700/50 font-bold border-t border-gray-900 dark:border-gray-600">
                                                            <td colSpan={2} className="px-4 py-2 border-r border-gray-900 dark:border-gray-600">Total Penerimaan</td>
                                                            <td className="px-4 py-2 text-right">Rp. {formatCurrency(anggaran.pagu_anggaran)}</td>
                                                        </tr>
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>

                                        {/* B. BELANJA */}
                                        <div>
                                            <h4 className="text-sm font-bold text-gray-900 dark:text-white uppercase mb-1">B. Belanja</h4>
                                            <div className="border border-gray-900 dark:border-gray-600 overflow-x-auto">
                                                <table className="min-w-full text-sm divide-y divide-gray-900 dark:divide-gray-600">
                                                    <thead className="bg-gray-100 dark:bg-gray-700 border-b border-gray-900 dark:border-gray-600">
                                                        <tr className="divide-x divide-gray-900 dark:divide-gray-600">
                                                            <th rowSpan={3} className="px-2 py-2 text-center font-bold text-gray-900 dark:text-gray-100 w-10">No.</th>
                                                            <th rowSpan={3} className="px-2 py-2 text-center font-bold text-gray-900 dark:text-gray-100 w-32">Kode Rekening</th>
                                                            <th rowSpan={3} className="px-2 py-2 text-center font-bold text-gray-900 dark:text-gray-100 w-24">Kode Program</th>
                                                            <th rowSpan={3} className="px-4 py-2 text-center font-bold text-gray-900 dark:text-gray-100">Uraian</th>
                                                            <th colSpan={5} className="px-2 py-2 text-center font-bold text-gray-900 dark:text-gray-100 border-b border-gray-900 dark:border-gray-600">Rincian Perhitungan</th>
                                                            <th rowSpan={3} className="px-2 py-2 text-right font-bold text-gray-900 dark:text-gray-100 w-32">Jumlah</th>
                                                            <th colSpan={2} rowSpan={2} className="px-2 py-2 text-center font-bold text-gray-900 dark:text-gray-100 border-b border-gray-900 dark:border-gray-600">Tahap</th>
                                                        </tr>
                                                        <tr className="divide-x divide-gray-900 dark:divide-gray-600">
                                                            <th rowSpan={2} className="px-2 py-1 text-center font-bold text-xs border-b border-gray-900 dark:border-gray-600">Volume</th>
                                                            <th colSpan={2} className="px-2 py-1 text-center font-bold text-xs border-b border-gray-900 dark:border-gray-600">Tahap</th>
                                                            <th rowSpan={2} className="px-2 py-1 text-center font-bold text-xs">Satuan</th>
                                                            <th rowSpan={2} className="px-2 py-1 text-center font-bold text-xs">Tarif Harga</th>
                                                        </tr>
                                                        <tr className="divide-x divide-gray-900 dark:divide-gray-600">
                                                            <th className="px-2 py-1 text-center font-bold text-xs">T1</th>
                                                            <th className="px-2 py-1 text-center font-bold text-xs">T2</th>
                                                            <th className="px-2 py-1 text-center font-bold text-xs w-24">1</th>
                                                            <th className="px-2 py-1 text-center font-bold text-xs w-24">2</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-900 dark:divide-gray-600">
                                                        {tahapanData && Object.entries(tahapanData).map(([progCode, program]: [string, any], pIndex) => (
                                                            <Fragment key={`prog-fragment-${pIndex}`}>
                                                                {/* 1. Program Row (Orange) */}
                                                                <tr className="bg-orange-200 dark:bg-orange-900/50 divide-x divide-gray-900 dark:divide-gray-600">
                                                                    <td className="px-2 py-2 text-center font-medium text-gray-900 dark:text-gray-100">{pIndex + 1}</td>
                                                                    <td className="px-2 py-2"></td>
                                                                    <td className="px-2 py-2 text-center font-medium text-gray-900 dark:text-gray-100">{progCode}</td>
                                                                    <td className="px-4 py-2 font-bold text-gray-900 dark:text-gray-100">{program.uraian}</td>
                                                                    <td className="px-2 py-2 text-center">-</td>
                                                                    <td className="px-2 py-2 text-center">-</td>
                                                                    <td className="px-2 py-2 text-center">-</td>
                                                                    <td className="px-2 py-2 text-center">-</td>
                                                                    <td className="px-2 py-2 text-center">-</td>
                                                                    <td className="px-2 py-2 text-right font-bold text-gray-900 dark:text-gray-100">{formatCurrency(program.jumlah)}</td>
                                                                    <td className="px-2 py-2 text-right font-medium text-gray-900 dark:text-gray-100">
                                                                        {formatCurrency(program.tahap1)}
                                                                    </td>
                                                                    <td className="px-2 py-2 text-right font-medium text-gray-900 dark:text-gray-100">
                                                                        {formatCurrency(program.tahap2)}
                                                                    </td>
                                                                </tr>

                                                                {program.sub_programs && Object.entries(program.sub_programs).map(([subCode, subProgram]: [string, any], sIndex) => (
                                                                    <Fragment key={`sub-fragment-${pIndex}-${sIndex}`}>
                                                                        {/* 2. Sub-Program Row (Green) */}
                                                                        <tr className="bg-green-200 dark:bg-green-900/50 divide-x divide-gray-900 dark:divide-gray-600">
                                                                            <td className="px-2 py-2 text-center font-medium text-gray-900 dark:text-gray-100">{pIndex + 1}.{sIndex + 1}</td>
                                                                            <td className="px-2 py-2"></td>
                                                                            <td className="px-2 py-2 text-center font-medium text-gray-900 dark:text-gray-100">{subCode}</td>
                                                                            <td className="px-4 py-2 font-bold text-gray-900 dark:text-gray-100">{subProgram.uraian}</td>
                                                                            <td className="px-2 py-2 text-center">-</td>
                                                                            <td className="px-2 py-2 text-center">-</td>
                                                                            <td className="px-2 py-2 text-center">-</td>
                                                                            <td className="px-2 py-2 text-center">-</td>
                                                                            <td className="px-2 py-2 text-center">-</td>
                                                                            <td className="px-2 py-2 text-right font-bold text-gray-900 dark:text-gray-100">{formatCurrency(subProgram.jumlah)}</td>
                                                                            <td className="px-2 py-2 text-right font-medium text-gray-900 dark:text-gray-100">
                                                                                {formatCurrency(subProgram.tahap1)}
                                                                            </td>
                                                                            <td className="px-2 py-2 text-right font-medium text-gray-900 dark:text-gray-100">
                                                                                {formatCurrency(subProgram.tahap2)}
                                                                            </td>
                                                                        </tr>

                                                                        {subProgram.uraian_programs && Object.entries(subProgram.uraian_programs).map(([urCode, urProgram]: [string, any], uIndex) => (
                                                                            <Fragment key={`ur-fragment-${pIndex}-${sIndex}-${uIndex}`}>
                                                                                {/* 3. Uraian Program Row (Teal) */}
                                                                                <tr className="bg-teal-200 dark:bg-teal-900/50 divide-x divide-gray-900 dark:divide-gray-600">
                                                                                    <td className="px-2 py-2 text-center font-medium text-gray-900 dark:text-gray-100">{pIndex + 1}.{sIndex + 1}.{uIndex + 1}</td>
                                                                                    <td className="px-2 py-2"></td>
                                                                                    <td className="px-2 py-2 text-center font-medium text-gray-900 dark:text-gray-100">{urCode}</td>
                                                                                    <td className="px-4 py-2 font-medium text-gray-900 dark:text-gray-100">{urProgram.uraian}</td>
                                                                                    <td className="px-2 py-2 text-center">-</td>
                                                                                    <td className="px-2 py-2 text-center">-</td>
                                                                                    <td className="px-2 py-2 text-center">-</td>
                                                                                    <td className="px-2 py-2 text-center">-</td>
                                                                                    <td className="px-2 py-2 text-center">-</td>
                                                                                    <td className="px-2 py-2 text-right font-bold text-gray-900 dark:text-gray-100">{formatCurrency(urProgram.jumlah)}</td>
                                                                                    <td className="px-2 py-2 text-right font-medium text-gray-900 dark:text-gray-100">
                                                                                        {formatCurrency(urProgram.tahap1)}
                                                                                    </td>
                                                                                    <td className="px-2 py-2 text-right font-medium text-gray-900 dark:text-gray-100">
                                                                                        {formatCurrency(urProgram.tahap2)}
                                                                                    </td>
                                                                                </tr>

                                                                                {/* 4. Items Rows (White) */}
                                                                                {urProgram.items && urProgram.items.map((item: any, iIndex: number) => {

                                                                                    // Calculate per-stage volumes
                                                                                    const monthsT1 = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni'];
                                                                                    const monthsT2 = ['Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
                                                                                    const volT1 = monthsT1.reduce((acc, month) => acc + (item.bulanan?.[month]?.volume || 0), 0);
                                                                                    const volT2 = monthsT2.reduce((acc, month) => acc + (item.bulanan?.[month]?.volume || 0), 0);
                                                                                    const volTotal = volT1 + volT2;

                                                                                    return (
                                                                                        <tr key={`item-${pIndex}-${sIndex}-${uIndex}-${iIndex}`} className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50 divide-x divide-gray-900 dark:divide-gray-600">
                                                                                            <td className="px-2 py-2 text-center text-gray-600 dark:text-gray-400"></td>
                                                                                            <td className="px-2 py-2 text-sm text-gray-800 dark:text-gray-200">{item.kode_rekening}</td>
                                                                                            <td className="px-2 py-2 text-center text-sm text-gray-800 dark:text-gray-200">{urCode}</td>
                                                                                            <td className="px-4 py-2 text-sm text-gray-800 dark:text-gray-200">{item.uraian}</td>

                                                                                            <td className="px-2 py-2 text-center text-sm text-gray-600 dark:text-gray-400 font-bold">{volTotal}</td>
                                                                                            <td className="px-2 py-2 text-center text-sm text-gray-600 dark:text-gray-400">{volT1}</td>
                                                                                            <td className="px-2 py-2 text-center text-sm text-gray-600 dark:text-gray-400">{volT2}</td>
                                                                                            <td className="px-2 py-2 text-center text-sm text-gray-600 dark:text-gray-400">{item.satuan}</td>
                                                                                            <td className="px-2 py-2 text-right text-sm text-gray-600 dark:text-gray-400">{formatCurrency(item.tarif)}</td>

                                                                                            <td className="px-2 py-2 text-right font-medium text-gray-900 dark:text-gray-100">{formatCurrency(item.jumlah)}</td>
                                                                                            <td className="px-2 py-2 text-right text-sm text-gray-600 dark:text-gray-400">{item.tahap1 > 0 ? formatCurrency(item.tahap1) : '0'}</td>
                                                                                            <td className="px-2 py-2 text-right text-sm text-gray-600 dark:text-gray-400">{item.tahap2 > 0 ? formatCurrency(item.tahap2) : '0'}</td>
                                                                                        </tr>
                                                                                    );
                                                                                })}
                                                                            </Fragment>
                                                                        ))}
                                                                    </Fragment>
                                                                ))}
                                                            </Fragment>
                                                        ))}

                                                        {/* Footer for total - assuming calculated from reducer of all programs */}
                                                        <tr className="bg-gray-200 dark:bg-gray-700 font-bold border-t-2 border-gray-900 dark:border-gray-500 divide-x divide-gray-900 dark:divide-gray-600">
                                                            <td colSpan={9} className="px-4 py-2 text-center uppercase">Jumlah Total</td>
                                                            <td className="px-2 py-2 text-right">
                                                                {formatCurrency(Object.values(tahapanData || {}).reduce((acc: number, prog: any) => acc + prog.jumlah, 0))}
                                                            </td>
                                                            <td className="px-2 py-2 text-right">
                                                                {formatCurrency(Object.values(tahapanData || {}).reduce((acc: number, prog: any) => acc + prog.tahap1, 0))}
                                                            </td>
                                                            <td className="px-2 py-2 text-right">
                                                                {formatCurrency(Object.values(tahapanData || {}).reduce((acc: number, prog: any) => acc + prog.tahap2, 0))}
                                                            </td>
                                                        </tr>
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>

                                        {/* Footer Signatures */}
                                        <div className="mt-12 flex justify-between text-sm text-gray-900 dark:text-gray-100 px-8">
                                            <div className="text-center mt-8">
                                                <p className="mb-20">Komite Sekolah,</p>
                                                <p className="font-bold underline uppercase">{anggaran.komite || '-'}</p>
                                            </div>

                                            <div className="text-center">
                                                <p className="mb-1">Mengetahui,</p>
                                                <p className="mb-20">Kepala Sekolah,</p>
                                                <p className="font-bold underline uppercase">{anggaran.kepala_sekolah || '-'}</p>
                                                <p>NIP. {anggaran.nip_kepala_sekolah || '-'}</p>
                                            </div>

                                            <div className="text-center">
                                                <p className="mb-1">Kec. {anggaran.sekolah?.kecamatan || '...'}, {anggaran.tanggal_cetak ? format(new Date(anggaran.tanggal_cetak), 'd MMMM yyyy', { locale: id }) : '...'}</p>
                                                <p className="mb-20">Bendahara,</p>
                                                <p className="font-bold underline uppercase">{anggaran.bendahara || '-'}</p>
                                                <p>NIP. {anggaran.nip_bendahara || '-'}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'Rka Rekap' && (
                            <div className="space-y-8 animate-fade-in-up">
                                <div className="flex justify-end mb-4">
                                    <button
                                        onClick={() => {
                                            setPrintTarget('rekap');
                                            setShowPrintModal(true);
                                        }}
                                        className="bg-indigo-600 text-white hover:bg-indigo-700 px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 shadow-sm transition-colors">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                        </svg>
                                        Cetak RKA Rekap
                                    </button>
                                </div>

                                <div className="bg-white dark:bg-gray-800 p-8 border border-gray-200 dark:border-gray-700 shadow-sm rounded-lg">
                                    {/* Report Header */}
                                    <div className="text-center mb-8 font-bold text-gray-900 dark:text-gray-100 uppercase">
                                        <h2 className="text-lg">LEMBAR KERTAS KERJA</h2>
                                        <h3 className="text-md">TAHUN ANGGARAN {anggaran.tahun_anggaran}</h3>
                                    </div>

                                    <div className="mb-6 text-sm font-bold text-gray-900 dark:text-gray-100 uppercase">
                                        <table className="w-full">
                                            <tbody>
                                                <tr>
                                                    <td className="w-48 py-1">Urusan Pemerintahan</td>
                                                    <td className="w-4 py-1">:</td>
                                                    <td className="py-1">1.01 - PENDIDIKAN</td>
                                                </tr>
                                                <tr>
                                                    <td className="py-1">Organisasi</td>
                                                    <td className="py-1">:</td>
                                                    <td className="py-1">{anggaran.sekolah?.nama_sekolah}</td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* A. PENERIMAAN */}
                                    <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 uppercase mb-2">A. PENERIMAAN</h3>
                                    <div className="mb-1 text-sm font-bold text-gray-900 dark:text-gray-100">Sumber Dana :</div>
                                    <div className="border border-gray-900 dark:border-gray-600 mb-6">
                                        <table className="w-full text-sm">
                                            <thead className="bg-gray-50 dark:bg-gray-700 divide-x divide-gray-900 dark:divide-gray-600 border-b border-gray-900 dark:border-gray-600">
                                                <tr>
                                                    <th className="px-3 py-2 text-center w-32 font-bold text-gray-900 dark:text-gray-100">No Kode</th>
                                                    <th className="px-3 py-2 text-center font-bold text-gray-900 dark:text-gray-100">Penerimaan</th>
                                                    <th className="px-3 py-2 text-center font-bold text-gray-900 dark:text-gray-100 w-48">Jumlah (Rp)</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-900 dark:divide-gray-600">
                                                <tr className="divide-x divide-gray-900 dark:divide-gray-600">
                                                    <td className="px-3 py-2 align-top text-gray-900 dark:text-gray-100">4.3.1.01.</td>
                                                    <td className="px-3 py-2 align-top text-gray-900 dark:text-gray-100">BOS Reguler</td>
                                                    <td className="px-3 py-2 text-right align-top text-gray-900 dark:text-gray-100">{formatCurrency(anggaran.pagu_anggaran)}</td>
                                                </tr>
                                                <tr className="font-bold border-t-2 border-gray-900 dark:border-gray-500 divide-x divide-gray-900 dark:divide-gray-600">
                                                    <td className="px-3 py-2 text-gray-900 dark:text-gray-100">Total Penerimaan</td>
                                                    <td className="px-3 py-2 text-gray-900 dark:text-gray-100"></td>
                                                    <td className="px-3 py-2 text-right text-gray-900 dark:text-gray-100">{formatCurrency(anggaran.pagu_anggaran)}</td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* B. REKAPITULASI */}
                                    <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 uppercase mb-2">B. REKAPITULASI ANGGARAN</h3>
                                    <div className="border border-gray-900 dark:border-gray-600 mb-6 text-sm">
                                        <table className="w-full">
                                            <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-900 dark:border-gray-600 divide-x divide-gray-900 dark:divide-gray-600">
                                                <tr>
                                                    <th className="px-3 py-2 text-center text-gray-900 dark:text-gray-100 w-32 font-bold">Kode Rekening</th>
                                                    <th className="px-3 py-2 text-center text-gray-900 dark:text-gray-100 font-bold">Uraian</th>
                                                    <th className="px-3 py-2 text-center text-gray-900 dark:text-gray-100 w-48 font-bold">Jumlah (Rp)</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-900 dark:divide-gray-600">
                                                {rekapData && rekapData.map((item: any, idx: number) => (
                                                    <tr key={idx} className={`divide-x divide-gray-900 dark:divide-gray-600 ${item.kode_rekening.length <= 1 || item.uraian.includes('JUMLAH') || item.uraian.includes('DEFISIT') ? 'font-bold' : ''}`}>
                                                        <td className="px-3 py-2 text-gray-900 dark:text-gray-100">{item.kode_rekening}</td>
                                                        <td className="px-3 py-2 text-gray-900 dark:text-gray-100 uppercase">{item.uraian}</td>
                                                        <td className="px-3 py-2 text-right text-gray-900 dark:text-gray-100">{formatCurrency(item.jumlah)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* C. RENCANA PER TAHAP */}
                                    <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 uppercase mb-2">C. RENCANA PELAKSANAAN ANGGARAN PER TAHAP</h3>
                                    <div className="border border-gray-900 dark:border-gray-600 mb-12 text-sm">
                                        <table className="w-full">
                                            <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-900 dark:border-gray-600 divide-x divide-gray-900 dark:divide-gray-600">
                                                <tr>
                                                    <th rowSpan={2} className="px-3 py-2 text-center border-b border-gray-900 dark:border-gray-600 w-16 font-bold text-gray-900 dark:text-gray-100">No</th>
                                                    <th rowSpan={2} className="px-3 py-2 text-center border-b border-gray-900 dark:border-gray-600 font-bold text-gray-900 dark:text-gray-100">Uraian</th>
                                                    <th colSpan={2} className="px-3 py-2 text-center border-b border-gray-900 dark:border-gray-600 font-bold text-gray-900 dark:text-gray-100">Tahap</th>
                                                    <th rowSpan={2} className="px-3 py-2 text-center border-b border-gray-900 dark:border-gray-600 w-48 font-bold text-gray-900 dark:text-gray-100">Jumlah</th>
                                                </tr>
                                                <tr>
                                                    <th className="px-3 py-2 text-center w-48 font-bold text-gray-900 dark:text-gray-100">I</th>
                                                    <th className="px-3 py-2 text-center w-48 font-bold text-gray-900 dark:text-gray-100">II</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-900 dark:divide-gray-600">
                                                {perTahapData && perTahapData.map((item: any, idx: number) => (
                                                    <tr key={idx} className="divide-x divide-gray-900 dark:divide-gray-600">
                                                        <td className="px-3 py-2 text-center text-gray-900 dark:text-gray-100">{item.no}</td>
                                                        <td className="px-3 py-2 text-gray-900 dark:text-gray-100">{item.uraian}</td>
                                                        <td className="px-3 py-2 text-right text-gray-900 dark:text-gray-100">{formatCurrency(item.tahap1)}</td>
                                                        <td className="px-3 py-2 text-right text-gray-900 dark:text-gray-100">{formatCurrency(item.tahap2)}</td>
                                                        <td className="px-3 py-2 text-right text-gray-900 dark:text-gray-100">{formatCurrency(item.total)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Footers */}
                                    <div className="flex justify-end text-sm text-gray-900 dark:text-gray-100 px-4 text-center">
                                        <div>
                                            <p className="mb-1">{anggaran.sekolah?.kecamatan}, {anggaran.tanggal_cetak ? format(new Date(anggaran.tanggal_cetak), 'd MMMM yyyy', { locale: id }) : '8 Desember 2025'}</p>
                                            <p className="mb-20">Kepala Sekolah</p>
                                            <p className="font-bold underline uppercase">{anggaran.kepala_sekolah || '....................'}</p>
                                            <p className="uppercase">NIP. {anggaran.nip_kepala_sekolah || '-'}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'Lembar Kerja 221' && (
                            <div className="space-y-8 animate-fade-in-up">
                                <div className="flex justify-end mb-4">
                                    <button
                                        onClick={() => {
                                            setPrintTarget('lembar');
                                            setShowPrintModal(true);
                                        }}
                                        className="bg-indigo-600 text-white hover:bg-indigo-700 px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 shadow-sm transition-colors">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                        Pengaturan Cetak
                                    </button>
                                </div>

                                <div className="bg-white dark:bg-gray-800 p-8 border border-gray-200 dark:border-gray-700 shadow-sm rounded-lg print:border-none print:shadow-none">
                                    {/* Report Header */}
                                    <div className="text-center mb-8">
                                        <h2 className="text-lg font-bold uppercase tracking-wider text-gray-900 dark:text-gray-100">Lembar Kertas Kerja</h2>
                                        <h3 className="text-md font-medium uppercase text-gray-600 dark:text-gray-400">Tahun Anggaran {anggaran.tahun_anggaran}</h3>
                                    </div>

                                    <div className="mb-6 grid grid-cols-[200px_1fr] gap-2 text-sm">
                                        <div className="text-gray-600 dark:text-gray-400">Urusan Pemerintahan</div>
                                        <div className="font-medium text-gray-900 dark:text-gray-100">: 1.01 - PENDIDIKAN</div>
                                        <div className="text-gray-600 dark:text-gray-400">Organisasi</div>
                                        <div className="font-medium text-gray-900 dark:text-gray-100">: {anggaran.sekolah?.nama_sekolah || '-'}</div>
                                    </div>

                                    {/* Indikator Table */}
                                    <div className="mb-8">
                                        <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-2">Indikator & Tolok Ukur Kinerja Belanja Langsung</h4>
                                        <div className="border border-gray-900 dark:border-gray-600 overflow-hidden">
                                            <table className="min-w-full text-sm divide-y divide-gray-900 dark:divide-gray-600">
                                                <thead className="bg-gray-50 dark:bg-gray-700">
                                                    <tr className="divide-x divide-gray-900 dark:divide-gray-600">
                                                        <th className="px-4 py-2 text-left font-bold text-gray-900 dark:text-gray-100 w-1/3">Indikator</th>
                                                        <th className="px-4 py-2 text-left font-bold text-gray-900 dark:text-gray-100 w-1/3">Tolok Ukur Kinerja</th>
                                                        <th className="px-4 py-2 text-left font-bold text-gray-900 dark:text-gray-100 w-1/3">Target Kinerja</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-900 dark:divide-gray-600">
                                                    <tr className="divide-x divide-gray-900 dark:divide-gray-600">
                                                        <td className="px-4 py-2">Capaian Program</td>
                                                        <td className="px-4 py-2"></td>
                                                        <td className="px-4 py-2 text-right">-</td>
                                                    </tr>
                                                    <tr className="divide-x divide-gray-900 dark:divide-gray-600">
                                                        <td className="px-4 py-2">Masukan</td>
                                                        <td className="px-4 py-2">Dana</td>
                                                        <td className="px-4 py-2 text-right">{anggaran.pagu_total}</td>
                                                    </tr>
                                                    <tr className="divide-x divide-gray-900 dark:divide-gray-600">
                                                        <td className="px-4 py-2">Keluaran</td>
                                                        <td className="px-4 py-2"></td>
                                                        <td className="px-4 py-2 text-right">-</td>
                                                    </tr>
                                                    <tr className="divide-x divide-gray-900 dark:divide-gray-600">
                                                        <td className="px-4 py-2">Hasil</td>
                                                        <td className="px-4 py-2"></td>
                                                        <td className="px-4 py-2 text-right">-</td>
                                                    </tr>
                                                    <tr className="divide-x divide-gray-900 dark:divide-gray-600">
                                                        <td className="px-4 py-2">Sasaran Keg</td>
                                                        <td className="px-4 py-2"></td>
                                                        <td className="px-4 py-2 text-right">-</td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    {/* Budget Detail Table */}
                                    <div>
                                        <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-2">Rincian Anggaran Belanja Langsung Menurut Program dan Per Kegiatan Unit Kerja</h4>
                                        <div className="border border-gray-900 dark:border-gray-600 overflow-hidden">
                                            <table className="min-w-full text-sm divide-y divide-gray-900 dark:divide-gray-600">
                                                <thead className="bg-gray-100 dark:bg-gray-700 border-b border-gray-900 dark:border-gray-600">
                                                    <tr className="divide-x divide-gray-900 dark:divide-gray-600">
                                                        <th rowSpan={2} className="px-3 py-2 text-left font-bold text-gray-900 dark:text-gray-100 w-32">Kode Rekening</th>
                                                        <th rowSpan={2} className="px-3 py-2 text-left font-bold text-gray-900 dark:text-gray-100">Uraian</th>
                                                        <th colSpan={3} className="px-3 py-1 text-center font-bold text-gray-900 dark:text-gray-100 border-b border-gray-900 dark:border-gray-600">Rincian Perhitungan</th>
                                                        <th rowSpan={2} className="px-3 py-2 text-right font-bold text-gray-900 dark:text-gray-100 w-32">Jumlah (Rp)</th>
                                                    </tr>
                                                    <tr className="divide-x divide-gray-900 dark:divide-gray-600">
                                                        <th className="px-2 py-1 text-center font-bold text-xs">Volume</th>
                                                        <th className="px-2 py-1 text-center font-bold text-xs">Satuan</th>
                                                        <th className="px-2 py-1 text-right font-bold text-xs">Harga Satuan</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-900 dark:divide-gray-600">
                                                    {lembarData && lembarData.map((row, idx) => (
                                                        <tr key={idx} className={`divide - x divide - gray - 900 dark: divide - gray - 600 ${row.type === 'header' ? 'bg-gray-50 dark:bg-gray-700/50 font-bold' : 'bg-white dark:bg-gray-800'} `}>
                                                            <td className="px-3 py-1.5 align-top">{row.kode_rekening}</td>
                                                            <td className="px-3 py-1.5 align-top">{row.uraian}</td>

                                                            <td className="px-2 py-1.5 text-center align-top">{row.volume}</td>
                                                            <td className="px-2 py-1.5 text-center align-top">{row.satuan}</td>
                                                            <td className="px-2 py-1.5 text-right align-top">
                                                                {row.harga_satuan ? formatCurrency(row.harga_satuan) : ''}
                                                            </td>

                                                            <td className="px-3 py-1.5 text-right font-medium align-top">
                                                                {formatCurrency(row.jumlah)}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                    <tr className="bg-gray-200 dark:bg-gray-700 font-bold divide-x divide-gray-900 dark:divide-gray-600 border-t-2 border-gray-900 dark:border-gray-500">
                                                        <td colSpan={5} className="px-3 py-2 text-right uppercase">Jumlah</td>
                                                        <td className="px-3 py-2 text-right">
                                                            {formatCurrency(totalBelanja)}
                                                        </td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    {/* Footer Signatures (Hardcoded as per Request/Common Practice, dynamic based on School Profile ideal) */}
                                    <div className="mt-12 flex justify-end text-sm text-gray-900 dark:text-gray-100">
                                        <div className="text-center">
                                            <p className="mb-1">{anggaran.sekolah?.kecamatan}, {anggaran.tanggal_cetak ? format(new Date(anggaran.tanggal_cetak), 'd MMMM yyyy', { locale: id }) : '8 Desember 2025'}</p>
                                            <p className="mb-20">Kepala Sekolah</p>
                                            <p className="font-bold underline uppercase">{anggaran.kepala_sekolah || '....................'}</p>
                                            <p className="uppercase">{anggaran.nip_kepala_sekolah || '-'}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'Rka Bulanan' && (
                            <div className="space-y-8 animate-fade-in-up">
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                                    <div className="flex items-center gap-2">
                                        <label htmlFor="monthSelect" className="text-sm font-medium text-gray-700 dark:text-gray-300">Pilih Bulan:</label>
                                        <select
                                            id="monthSelect"
                                            value={selectedMonth}
                                            onChange={(e) => handleMonthChange(e.target.value)}
                                            className="block w-40 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                            disabled={isLoading}
                                        >
                                            {months.map(m => (
                                                <option key={m} value={m}>{m}</option>
                                            ))}
                                        </select>
                                        {isLoading && <span className="text-sm text-gray-500 animate-pulse">Memuat data...</span>}
                                    </div>

                                    <button
                                        onClick={() => {
                                            setPrintTarget('bulanan');
                                            setShowPrintModal(true);
                                        }}
                                        className="bg-indigo-600 text-white hover:bg-indigo-700 px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 shadow-sm transition-colors">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                        Pengaturan Cetak
                                    </button>
                                </div>

                                <div className="bg-white dark:bg-gray-800 p-8 border border-gray-200 dark:border-gray-700 shadow-sm rounded-lg print:border-none print:shadow-none">
                                    {/* Report Header */}
                                    <div className="text-center mb-8">
                                        <h2 className="text-lg font-bold uppercase tracking-wider text-gray-900 dark:text-gray-100 underline decoration-1 underline-offset-4">RENCANA KERTAS KERJA PER BULAN {selectedMonth.toUpperCase()}</h2>
                                        <h3 className="text-md font-medium uppercase text-gray-600 dark:text-gray-400">TAHUN ANGGARAN : {anggaran.tahun_anggaran}</h3>
                                    </div>

                                    {/* School Info */}
                                    <div className="mb-6 grid grid-cols-[150px_10px_1fr] gap-1 text-sm">
                                        <div className="text-gray-600 dark:text-gray-400">NPSN</div>
                                        <div>:</div>
                                        <div className="font-medium text-gray-900 dark:text-gray-100">{anggaran.sekolah?.npsn || '-'}</div>

                                        <div className="text-gray-600 dark:text-gray-400">Nama Sekolah</div>
                                        <div>:</div>
                                        <div className="font-medium text-gray-900 dark:text-gray-100">{anggaran.sekolah?.nama_sekolah || '-'}</div>

                                        <div className="text-gray-600 dark:text-gray-400">Alamat</div>
                                        <div>:</div>
                                        <div className="font-medium text-gray-900 dark:text-gray-100">{anggaran.sekolah?.alamat || '-'}</div>

                                        <div className="text-gray-600 dark:text-gray-400">Kabupaten</div>
                                        <div>:</div>
                                        <div className="font-medium text-gray-900 dark:text-gray-100">{anggaran.sekolah?.kabupaten_kota || '-'}</div>

                                        <div className="text-gray-600 dark:text-gray-400">Provinsi</div>
                                        <div>:</div>
                                        <div className="font-medium text-gray-900 dark:text-gray-100">{anggaran.sekolah?.provinsi || '-'}</div>
                                    </div>

                                    <div className="space-y-6">
                                        {/* A. PENERIMAAN */}
                                        <div>
                                            <h4 className="text-sm font-bold text-gray-900 dark:text-white uppercase mb-1">A. Penerimaan</h4>
                                            <div className="border border-gray-900 dark:border-gray-600 relative">
                                                {isLoading && (
                                                    <div className="absolute inset-0 bg-white/50 dark:bg-gray-800/50 z-10 flex items-center justify-center backdrop-blur-sm">
                                                        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                                                    </div>
                                                )}
                                                <table className="min-w-full text-sm">
                                                    <thead className="bg-gray-100 dark:bg-gray-700 border-b border-gray-900 dark:border-gray-600">
                                                        <tr>
                                                            <th className="px-4 py-2 text-center font-bold text-gray-900 dark:text-gray-100 border-r border-gray-900 dark:border-gray-600 w-32">No Kode</th>
                                                            <th className="px-4 py-2 text-center font-bold text-gray-900 dark:text-gray-100 border-r border-gray-900 dark:border-gray-600">Penerimaan</th>
                                                            <th className="px-4 py-2 text-right font-bold text-gray-900 dark:text-gray-100 w-48">Jumlah</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-900 dark:divide-gray-600 bg-white dark:bg-gray-800">
                                                        <tr>
                                                            <td className="px-4 py-2 border-r border-gray-900 dark:border-gray-600 font-medium">4.3.1.01.</td>
                                                            <td className="px-4 py-2 border-r border-gray-900 dark:border-gray-600">BOS Reguler</td>
                                                            <td className="px-4 py-2 text-right font-medium">{anggaran.pagu_anggaran}</td>
                                                        </tr>
                                                        <tr className="bg-white dark:bg-gray-800 font-bold border-t border-gray-900 dark:border-gray-600">
                                                            <td colSpan={2} className="px-4 py-2 border-r border-gray-900 dark:border-gray-600">Total Penerimaan</td>
                                                            <td className="px-4 py-2 text-right">{anggaran.pagu_total}</td>
                                                        </tr>
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>

                                        {/* B. BELANJA */}
                                        <div>
                                            <h4 className="text-sm font-bold text-gray-900 dark:text-white uppercase mb-1">B. Belanja</h4>
                                            <div className="border border-gray-900 dark:border-gray-600 overflow-hidden relative">
                                                {isLoading && (
                                                    <div className="absolute inset-0 bg-white/50 dark:bg-gray-800/50 z-10 flex items-center justify-center backdrop-blur-sm">
                                                        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                                                    </div>
                                                )}
                                                <table className="min-w-full text-sm divide-y divide-gray-900 dark:divide-gray-600">
                                                    <thead className="bg-gray-200 dark:bg-gray-700 border-b border-gray-900 dark:border-gray-600">
                                                        <tr className="divide-x divide-gray-900 dark:divide-gray-600">
                                                            <th className="px-2 py-2 text-center font-bold text-gray-900 dark:text-gray-100 w-10">No.</th>
                                                            <th className="px-2 py-2 text-center font-bold text-gray-900 dark:text-gray-100 w-32">Kode Rekening</th>
                                                            <th className="px-2 py-2 text-center font-bold text-gray-900 dark:text-gray-100 w-32">Kode Program</th>
                                                            <th className="px-4 py-2 text-center font-bold text-gray-900 dark:text-gray-100">Uraian</th>
                                                            <th className="px-2 py-2 text-center font-bold text-gray-900 dark:text-gray-100 w-24">Volume</th>
                                                            <th className="px-2 py-2 text-center font-bold text-gray-900 dark:text-gray-100 w-24">Satuan</th>
                                                            <th className="px-2 py-2 text-right font-bold text-gray-900 dark:text-gray-100 w-32">Tarif Harga</th>
                                                            <th className="px-2 py-2 text-right font-bold text-gray-900 dark:text-gray-100 w-32">Jumlah</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-900 dark:divide-gray-600">
                                                        {rkaBulananData && Object.entries(rkaBulananData).map(([progCode, program]: [string, any], pIndex) => {
                                                            const programMonthTotal = Object.values(program.sub_programs || {}).reduce((subTotal: number, sub: any) =>
                                                                subTotal + Object.values(sub.uraian_programs || {}).reduce((urTotal: number, ur: any) =>
                                                                    urTotal + (ur.items || []).reduce((itemTotal: number, item: any) => itemTotal + (item.bulanan?.[selectedMonth]?.total || 0), 0)
                                                                    , 0)
                                                                , 0);

                                                            return (
                                                                <Fragment key={`mon-prog-${pIndex}`}>
                                                                    {/* Program Row */}
                                                                    <tr className="bg-orange-200 dark:bg-orange-900/40 divide-x divide-gray-900 dark:divide-gray-600">
                                                                        <td className="px-2 py-2 text-center font-medium text-gray-900 dark:text-gray-100">{pIndex + 1}</td>
                                                                        <td className="px-2 py-2"></td>
                                                                        <td className="px-2 py-2 font-medium text-gray-900 dark:text-gray-100">{progCode}</td>
                                                                        <td className="px-4 py-2 font-bold text-gray-900 dark:text-gray-100">{program.uraian}</td>
                                                                        <td className="px-2 py-2 text-center">-</td>
                                                                        <td className="px-2 py-2 text-center">-</td>
                                                                        <td className="px-2 py-2 text-center">-</td>
                                                                        <td className="px-2 py-2 text-right font-bold text-gray-900 dark:text-gray-100">{formatCurrency(programMonthTotal)}</td>
                                                                    </tr>

                                                                    {/* Sub Programs (Kegiatan) */}
                                                                    {program.sub_programs && Object.entries(program.sub_programs).map(([subCode, subProgram]: [string, any], sIndex) => {
                                                                        const subTotal = Object.values(subProgram.uraian_programs || {}).reduce((urTotal: number, ur: any) =>
                                                                            urTotal + (ur.items || []).reduce((itemTotal: number, item: any) => itemTotal + (item.bulanan?.[selectedMonth]?.total || 0), 0)
                                                                            , 0);

                                                                        return (
                                                                            <Fragment key={`mon-sub-${pIndex}-${sIndex}`}>
                                                                                <tr className="bg-green-200 dark:bg-green-900/40 divide-x divide-gray-900 dark:divide-gray-600">
                                                                                    <td className="px-2 py-2 text-center font-medium text-gray-900 dark:text-gray-100">{pIndex + 1}.{sIndex + 1}</td>
                                                                                    <td className="px-2 py-2"></td>
                                                                                    <td className="px-2 py-2 font-medium text-gray-900 dark:text-gray-100">{subCode}</td>
                                                                                    <td className="px-4 py-2 font-medium text-gray-900 dark:text-gray-100">{subProgram.uraian}</td>
                                                                                    <td className="px-2 py-2 text-center">-</td>
                                                                                    <td className="px-2 py-2 text-center">-</td>
                                                                                    <td className="px-2 py-2 text-center">-</td>
                                                                                    <td className="px-2 py-2 text-right font-bold text-gray-900 dark:text-gray-100">{formatCurrency(subTotal)}</td>
                                                                                </tr>

                                                                                {/* Uraian Programs (Sub Kegiatan) */}
                                                                                {subProgram.uraian_programs && Object.entries(subProgram.uraian_programs).map(([urCode, urProgram]: [string, any], uIndex) => {
                                                                                    const urTotal = (urProgram.items || []).reduce((itemTotal: number, item: any) => itemTotal + (item.bulanan?.[selectedMonth]?.total || 0), 0);

                                                                                    return (
                                                                                        <Fragment key={`mon-ur-${pIndex}-${sIndex}-${uIndex}`}>
                                                                                            <tr className="bg-teal-200 dark:bg-teal-900/40 divide-x divide-gray-900 dark:divide-gray-600">
                                                                                                <td className="px-2 py-2 text-center font-medium text-gray-900 dark:text-gray-100">{pIndex + 1}.{sIndex + 1}.{uIndex + 1}</td>
                                                                                                <td className="px-2 py-2"></td>
                                                                                                <td className="px-2 py-2 font-medium text-gray-900 dark:text-gray-100">{urCode}</td>
                                                                                                <td className="px-4 py-2 font-medium text-gray-900 dark:text-gray-100">{urProgram.uraian}</td>
                                                                                                <td className="px-2 py-2 text-center">-</td>
                                                                                                <td className="px-2 py-2 text-center">-</td>
                                                                                                <td className="px-2 py-2 text-center">-</td>
                                                                                                <td className="px-2 py-2 text-right font-bold text-gray-900 dark:text-gray-100">{formatCurrency(urTotal)}</td>
                                                                                            </tr>

                                                                                            {/* Items */}
                                                                                            {urProgram.items && urProgram.items.map((item: any, iIndex: number) => {
                                                                                                const monthlyData = item.bulanan?.[selectedMonth];
                                                                                                const monthlyVolume = monthlyData?.volume || 0;
                                                                                                const monthlyTotal = monthlyData?.total || 0;

                                                                                                return (
                                                                                                    <tr key={`mon-item-${pIndex}-${sIndex}-${uIndex}-${iIndex}`} className="bg-amber-100 dark:bg-amber-900/10 hover:bg-amber-200 dark:hover:bg-amber-900/20 divide-x divide-gray-900 dark:divide-gray-600">
                                                                                                        <td className="px-2 py-2 text-center text-gray-600 dark:text-gray-400"></td>
                                                                                                        <td className="px-2 py-2 text-sm text-gray-800 dark:text-gray-200">{item.kode_rekening}</td>
                                                                                                        <td className="px-2 py-2 text-sm text-gray-800 dark:text-gray-200">{item.program_code}</td>
                                                                                                        <td className="px-4 py-2 text-sm text-gray-800 dark:text-gray-200">{item.uraian}</td>
                                                                                                        <td className="px-2 py-2 text-center text-sm text-gray-800 dark:text-gray-200">
                                                                                                            {monthlyVolume > 0 ? monthlyVolume : '-'}
                                                                                                        </td>
                                                                                                        <td className="px-2 py-2 text-center text-sm text-gray-800 dark:text-gray-200">{item.satuan}</td>
                                                                                                        <td className="px-2 py-2 text-right text-sm text-gray-800 dark:text-gray-200">
                                                                                                            {formatCurrency(item.tarif)}
                                                                                                        </td>
                                                                                                        <td className="px-2 py-2 text-right font-medium text-gray-900 dark:text-gray-100">
                                                                                                            {formatCurrency(monthlyTotal)}
                                                                                                        </td>
                                                                                                    </tr>
                                                                                                );
                                                                                            })}
                                                                                        </Fragment>
                                                                                    )
                                                                                })}
                                                                            </Fragment>
                                                                        )
                                                                    })}
                                                                </Fragment>
                                                            );
                                                        })}
                                                        <tr className="bg-white dark:bg-gray-800 font-bold divide-x divide-gray-900 dark:divide-gray-600 border-t border-gray-900 dark:border-gray-600">
                                                            <td colSpan={7} className="px-4 py-2 text-left uppercase">Jumlah Belanja</td>
                                                            <td className="px-4 py-2 text-right">
                                                                {formatCurrency(Object.values(rkaBulananData || {}).reduce((acc: number, prog: any) =>
                                                                    acc + Object.values(prog.sub_programs || {}).reduce((sAcc: number, sub: any) =>
                                                                        sAcc + Object.values(sub.uraian_programs || {}).reduce((uAcc: number, ur: any) =>
                                                                            uAcc + (ur.items || []).reduce((iAcc: number, item: any) => iAcc + (item.bulanan?.[selectedMonth]?.total || 0), 0)
                                                                            , 0)
                                                                        , 0)
                                                                    , 0))}
                                                            </td>
                                                        </tr>
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>

                                        {/* Footer Signatures */}
                                        <div className="mt-12 flex justify-between text-sm text-gray-900 dark:text-gray-100 px-4">
                                            <div className="text-center mt-8">
                                                <p className="mb-20">Komite Sekolah,</p>
                                                <p className="font-bold underline uppercase">{anggaran.komite || '-'}</p>
                                            </div>

                                            <div className="text-center">
                                                <p className="mb-1">Mengetahui,</p>
                                                <p className="mb-20">Kepala Sekolah,</p>
                                                <p className="font-bold underline uppercase">{anggaran.kepala_sekolah || '-'}</p>
                                                <p>NIP. {anggaran.nip_kepala_sekolah || '-'}</p>
                                            </div>

                                            <div className="text-center">
                                                <p className="mb-1">{anggaran.sekolah?.kecamatan || '...'}, {anggaran.tanggal_cetak ? format(new Date(anggaran.tanggal_cetak), 'd MMMM yyyy', { locale: id }) : '...'}</p>
                                                <p className="mb-20">Bendahara,</p>
                                                <p className="font-bold underline uppercase">{anggaran.bendahara || '-'}</p>
                                                <p>NIP. {anggaran.nip_bendahara || '-'}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}


                        {/* Other Tabs Placeholders */}

                        {activeTab === 'Grafik' && grafikData && (
                            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow animate-fade-in-up">
                                <h2 className="text-xl font-bold text-center text-blue-600 dark:text-blue-400 mb-8 uppercase">
                                    Analisis Proporsi Anggaran RKAS
                                </h2>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                    {/* Chart 1: Buku */}
                                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6 flex flex-col">
                                        <h3 className="text-center font-bold text-gray-800 dark:text-gray-100 mb-4">Proporsi Anggaran BUKU</h3>
                                        <div className="flex-1 flex justify-center items-center -ml-4">
                                            <Chart
                                                options={{
                                                    labels: ['Penyediaan Buku', 'Komponen Anggaran Lainnya'],
                                                    colors: ['#F59E0B', isDarkMode ? '#374151' : '#E5E7EB'],
                                                    legend: { position: 'bottom', labels: { colors: isDarkMode ? '#f3f4f6' : '#374151' } },
                                                    dataLabels: { enabled: true, formatter: (val) => (val as number).toFixed(1) + '%' },
                                                    plotOptions: { pie: { donut: { size: '65%', labels: { show: true, total: { show: true, showAlways: true, label: 'Total', fontSize: '12px', fontWeight: 600, color: isDarkMode ? '#f3f4f6' : '#373d3f' } } } } },
                                                    tooltip: { y: { formatter: (val) => formatCurrency(val) } },
                                                    stroke: { show: !isDarkMode }
                                                }}
                                                series={[grafikData.buku.value, grafikData.total - grafikData.buku.value]}
                                                type="donut"
                                                height={300}
                                            />
                                        </div>
                                        <div className={`mt-4 p-4 rounded-md ${grafikData.buku.valid ? 'bg-green-100 dark:bg-green-900/30' : 'bg-yellow-100 dark:bg-yellow-900/30'} `}>
                                            <h4 className={`font-bold uppercase text-xs mb-2 text-white px-2 py-1 inline-block rounded ${grafikData.buku.valid ? 'bg-green-700 dark:bg-green-800' : 'bg-yellow-700 dark:bg-yellow-800'}`}>INFORMASI ALOKASI BUKU</h4>
                                            <div className="flex items-start gap-3 mt-2">
                                                <div className={`mt-0.5 min-w-[20px] h-5 rounded-full flex items-center justify-center ${grafikData.buku.valid ? 'bg-green-500 text-white' : 'bg-yellow-500 text-white'} `}>
                                                    {grafikData.buku.valid ? (
                                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                                    ) : (
                                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-sm text-gray-900 dark:text-gray-100 mb-1">{grafikData.buku.valid ? 'Alokasi belanja Anda sudah sesuai juknis' : 'Alokasi belanja Anda belum sesuai juknis'}</p>
                                                    <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed text-justify">{grafikData.buku.message}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Chart 2: Honor */}
                                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6 flex flex-col">
                                        <h3 className="text-center font-bold text-gray-800 dark:text-gray-100 mb-4">Proporsi Anggaran Honor dari Total Pagu</h3>
                                        <div className="flex-1 flex justify-center items-center -ml-4">
                                            <Chart
                                                options={{
                                                    labels: ['Pembayaran Honor', 'Komponen Anggaran Lainnya'],
                                                    colors: ['#06B6D4', isDarkMode ? '#374151' : '#E5E7EB'],
                                                    legend: { position: 'bottom', labels: { colors: isDarkMode ? '#f3f4f6' : '#374151' } },
                                                    dataLabels: { enabled: true, formatter: (val) => (val as number).toFixed(1) + '%' },
                                                    plotOptions: { pie: { donut: { size: '65%', labels: { show: true, total: { show: true, showAlways: true, label: 'Total', fontSize: '12px', fontWeight: 600, color: isDarkMode ? '#f3f4f6' : '#373d3f' } } } } },
                                                    tooltip: { y: { formatter: (val) => formatCurrency(val) } },
                                                    stroke: { show: !isDarkMode }
                                                }}
                                                series={[grafikData.honor.value, grafikData.total - grafikData.honor.value]}
                                                type="donut"
                                                height={300}
                                            />
                                        </div>
                                        <div className={`mt-4 p-4 rounded-md ${grafikData.honor.valid ? 'bg-green-100 dark:bg-green-900/30' : 'bg-yellow-100 dark:bg-yellow-900/30'} `}>
                                            <h4 className={`font-bold uppercase text-xs mb-2 text-white px-2 py-1 inline-block rounded ${grafikData.honor.valid ? 'bg-green-700 dark:bg-green-800' : 'bg-yellow-700 dark:bg-yellow-800'}`}>ALOKASI ANGGARAN HONOR</h4>
                                            <div className="flex items-start gap-3 mt-2">
                                                <div className={`mt-0.5 min-w-[20px] h-5 rounded-full flex items-center justify-center ${grafikData.honor.valid ? 'bg-green-500 text-white' : 'bg-yellow-500 text-white'} `}>
                                                    {grafikData.honor.valid ? (
                                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                                    ) : (
                                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-sm text-gray-900 dark:text-gray-100 mb-1">{grafikData.honor.valid ? 'Alokasi anggaran Anda sudah sesuai juknis' : 'Alokasi anggaran belum sesuai juknis'}</p>
                                                    <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed text-justify">{grafikData.honor.message}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Chart 3: Pemeliharaan */}
                                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6 flex flex-col">
                                        <h3 className="text-center font-bold text-gray-800 dark:text-gray-100 mb-4">Proporsi Anggaran Pemeliharaan Sarpras</h3>
                                        <div className="flex-1 flex justify-center items-center -ml-4">
                                            <Chart
                                                options={{
                                                    labels: ['Pemeliharaan Sarpras', 'Komponen Anggaran Lainnya'],
                                                    colors: ['#10B981', isDarkMode ? '#374151' : '#E5E7EB'],
                                                    legend: { position: 'bottom', labels: { colors: isDarkMode ? '#f3f4f6' : '#374151' } },
                                                    dataLabels: { enabled: true, formatter: (val) => (val as number).toFixed(1) + '%' },
                                                    plotOptions: { pie: { donut: { size: '65%', labels: { show: true, total: { show: true, showAlways: true, label: 'Total', fontSize: '12px', fontWeight: 600, color: isDarkMode ? '#f3f4f6' : '#373d3f' } } } } },
                                                    tooltip: { y: { formatter: (val) => formatCurrency(val) } },
                                                    stroke: { show: !isDarkMode }
                                                }}
                                                series={[grafikData.pemeliharaan.value, grafikData.total - grafikData.pemeliharaan.value]}
                                                type="donut"
                                                height={300}
                                            />
                                        </div>
                                        <div className={`mt - 4 p - 4 rounded - md ${grafikData.pemeliharaan.valid ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'} `}>
                                            <h4 className="font-bold uppercase text-xs mb-2 text-white bg-green-700 dark:bg-green-800 px-2 py-1 inline-block rounded">INFORMASI ALOKASI SARPRAS</h4>
                                            <div className="flex items-start gap-3 mt-2">
                                                <div className={`mt - 0.5 min - w - [20px] h - 5 rounded - full flex items - center justify - center ${grafikData.pemeliharaan.valid ? 'bg-green-500 text-white' : 'bg-red-500 text-white'} `}>
                                                    {grafikData.pemeliharaan.valid ? (
                                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                                    ) : (
                                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-sm text-gray-900 dark:text-gray-100 mb-1">{grafikData.pemeliharaan.valid ? 'Alokasi anggaran Anda sudah sesuai juknis' : 'Alokasi anggaran belum sesuai juknis'}</p>
                                                    <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed text-justify">{grafikData.pemeliharaan.message}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Chart 4: Jenis Belanja */}
                                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6 flex flex-col items-center">
                                        <h3 className="text-center font-bold text-gray-800 dark:text-gray-100 mb-4">Proporsi Antar Jenis Belanja Lainnya dari Total Pagu</h3>
                                        <div className="flex-1 w-full flex justify-center items-center">
                                            <Chart
                                                options={{
                                                    labels: grafikData.jenis_belanja.map((d: any) => d.label),
                                                    colors: ['#6366F1', '#EC4899', '#10B981', '#F59E0B', '#3B82F6', '#8B5CF6'],
                                                    legend: { position: 'bottom', labels: { colors: isDarkMode ? '#f3f4f6' : '#374151' } },
                                                    dataLabels: { enabled: true, formatter: (val) => (val as number).toFixed(1) + '%' },
                                                    plotOptions: { pie: { donut: { size: '65%', labels: { show: true, total: { show: true, showAlways: true, label: 'Total', fontSize: '12px', fontWeight: 600, color: isDarkMode ? '#f3f4f6' : '#373d3f' } } } } },
                                                    tooltip: { y: { formatter: (val) => formatCurrency(val) } },
                                                    stroke: { show: !isDarkMode }
                                                }}
                                                series={grafikData.jenis_belanja.map((d: any) => d.value)}
                                                type="donut"
                                                height={300}
                                                width="100%"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div >
            </div >
            {/* Modal Tanggal Cetak */}
            {showDateModal && (
                <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
                    <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={() => setShowDateModal(false)}></div>
                        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
                        <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-visible shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                            <form onSubmit={handleSaveTanggalCetak}>
                                <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                                    <div className="sm:flex sm:items-start">
                                        <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                                            <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-gray-100" id="modal-title">
                                                Atur Tanggal Cetak
                                            </h3>
                                            <div className="mt-4">
                                                <label htmlFor="tanggal_cetak" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                                    Tanggal Cetak
                                                </label>
                                                <DatePicker
                                                    value={dateData.tanggal_cetak}
                                                    onChange={(date) => setDateData('tanggal_cetak', date ? format(date, 'yyyy-MM-dd') : '')}
                                                    className="mt-1"
                                                    placeholder="Pilih Tanggal Cetak"
                                                />
                                                {errors.tanggal_cetak && (
                                                    <p className="mt-2 text-sm text-red-600 dark:text-red-400">{errors.tanggal_cetak}</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                                    <button
                                        type="submit"
                                        disabled={processing}
                                        className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                                    >
                                        {processing ? 'Menyimpan...' : 'Simpan'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setShowDateModal(false)}
                                        className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
                                    >
                                        Batal
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </AuthenticatedLayout >
    );
}
