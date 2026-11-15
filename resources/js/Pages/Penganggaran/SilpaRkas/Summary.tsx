import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, useForm, router } from '@inertiajs/react';
import { PageProps } from '@/types';
import { useState, Fragment, useEffect } from 'react';
import Chart from 'react-apexcharts';
import DatePicker from '@/Components/DatePicker';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import TabRkaTahapan from './Partials/TabRkaTahapan';
import TabRkaTahapanV1 from './Partials/TabRkaTahapanV1';
import TabRkaRekap from './Partials/TabRkaRekap';
import TabLembarKerja221 from './Partials/TabLembarKerja221';
import TabRkaBulanan from './Partials/TabRkaBulanan';
import TabRincian from './Partials/TabRincian';
import TabGrafik from './Partials/TabGrafik';
import TabAlurKas from './Partials/TabAlurKas';
import TabRincianPencairan from '../Rkas/Partials/TabRincianPencairan';

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
    rincianData: Array<{
        sub_program: string;
        items: Array<{
            uraian: string;
            jumlah: number;
        }>;
        total: number;
    }>;
    grafikData: {
        total: number;
        buku: { value: number; percentage: number; valid: boolean; message: string; };
        honor: { value: number; percentage: number; valid: boolean; message: string; };
        pemeliharaan: { value: number; percentage: number; valid: boolean; message: string; };
        jenis_belanja: Array<{ label: string; value: number; percentage: number; }>;
    };
}

export default function Summary({ auth, anggaran, groupedData, tahapanData, rkaBulananData, rekapData, perTahapData, lembarData, rincianData, grafikData }: PageProps<SummaryProps>) {
    const [activeTab, setActiveTab] = useState('Rka Tahapan');
    const [selectedMonth, setSelectedMonth] = useState('Januari');
    const [isLoading, setIsLoading] = useState(false);
    const [isDarkMode, setIsDarkMode] = useState(false);

    const formatDateSafe = (dateStr: string | undefined, formatStr: string = 'dd/MM/yyyy') => {
        if (!dateStr) return '-';
        try {
            const datePart = dateStr.split(/[ T]/)[0];
            const [y, m, d] = datePart.split('-').map(Number);
            return format(new Date(y, m - 1, d), formatStr, { locale: id });
        } catch (e) {
            return '-';
        }
    };

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
            route('silpa-rkas.summary', { id: anggaran.id }),
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
    const [printTarget, setPrintTarget] = useState<'tahapan' | 'tahapan_v1' | 'rekap' | 'lembar' | 'bulanan' | 'rincian' | 'rp'>('tahapan');
    const [printTahap, setPrintTahap] = useState<'1' | '2' | 'tahunan'>('tahunan');
    const [rpTahap, setRpTahap] = useState<number>(1);
    const [printSettings, setPrintSettings] = useState({
        paperSize: 'A4',
        orientation: 'portrait',
        fontSize: '12pt'
    });

    const handlePrint = (monthOverride?: string) => {
        let routeName = 'silpa-rkas.export-pdf';
        const params: any = {
            id: anggaran.id,
            paper_size: printSettings.paperSize,
            orientation: printSettings.orientation,
            font_size: printSettings.fontSize
        };

        if (printTarget === 'rekap') routeName = 'silpa-rkas.export-rekap-pdf';
        if (printTarget === 'lembar') routeName = 'silpa-rkas.export-lembar-kerja-pdf';
        if (printTarget === 'rp') {
            routeName = 'silpa-rkas.export-rp-pdf';
            params.tahap = rpTahap;
        }
        if (printTarget === 'tahapan_v1') routeName = 'silpa-rkas.export-tahapan-v1-pdf';
        if (printTarget === 'rincian') {
            routeName = 'silpa-rkas.export-rincian-pdf';
            params.tahap = printTahap;
        }
        if (printTarget === 'bulanan') {
            routeName = 'silpa-rkas.export-bulanan-pdf';
            params.month = monthOverride || selectedMonth;
        }

        const url = route(routeName, params);
        window.open(url, '_blank');
        setShowPrintModal(false);
    };

    const handleExportExcel = (target?: string) => {
        const targetToUse = target || printTarget;
        let routeName = 'silpa-rkas.export-tahapan-excel';
        const params: any = {
            id: anggaran.id,
            paper_size: printSettings.paperSize,
            orientation: printSettings.orientation,
            font_size: printSettings.fontSize
        };

        if (targetToUse === 'tahapan_v1') routeName = 'silpa-rkas.export-tahapan-v1-excel';
        if (targetToUse === 'rp') {
            routeName = 'silpa-rkas.export-rp-excel';
            params.tahap = rpTahap;
        }
        if (targetToUse === 'rincian') {
            routeName = 'silpa-rkas.export-rincian-excel';
            params.tahap = printTahap;
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
        { name: 'Rka Rekap', label: 'Rka Rekap' },
        { name: 'Lembar Kerja 221', label: 'Lembar Kerja 221' },
        { name: 'Rka Bulanan', label: 'Rka Bulanan' },
        { name: 'Rincian', label: 'Rincian' },
        { name: 'Grafik', label: 'Grafik' },
        { name: 'Rincian Pencairan', label: 'RP' },
        { name: 'Alur Kas', label: 'Alur Kas' },
    ];

    const handleSaveTanggalCetak = (e: React.FormEvent) => {
        e.preventDefault();
        patch(route('silpa-penganggaran.update-tanggal-cetak', anggaran.id), {
            onSuccess: () => {
                setShowDateModal(false);
            }
        });
    };

    return (
        <AuthenticatedLayout
        >
            {/* Print Settings Modal */}
            {showPrintModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-md rounded-[26px] border border-white/70 bg-white p-6 shadow-float dark:border-white/10 dark:bg-[#15131F]">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-[14px] font-extrabold text-slate-900 dark:text-white">Pengaturan Cetak</h3>
                            <button onClick={() => setShowPrintModal(false)} className="text-slate-400 transition hover:text-slate-800 dark:text-slate-500 dark:hover:text-white">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="mb-1.5 block text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">Ukuran Kertas</label>
                                <select
                                    value={printSettings.paperSize}
                                    onChange={(e) => setPrintSettings({ ...printSettings, paperSize: e.target.value })}
                                    className="w-full rounded-xl border border-slate-200/90 bg-white px-3.5 py-2.5 text-[12px] font-semibold text-slate-800 shadow-sm transition focus:border-lime-400 focus:outline-none focus:ring-4 focus:ring-lime-200/60 dark:border-white/10 dark:bg-white/5 dark:text-white"
                                >
                                    <option value="A4">A4</option>
                                    <option value="Letter">Letter</option>
                                    <option value="Folio">Folio (F4)</option>
                                    <option value="Legal">Legal</option>
                                </select>
                            </div>

                            <div>
                                <label className="mb-1.5 block text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">Orientasi</label>
                                <select
                                    value={printSettings.orientation}
                                    onChange={(e) => setPrintSettings({ ...printSettings, orientation: e.target.value })}
                                    className="w-full rounded-xl border border-slate-200/90 bg-white px-3.5 py-2.5 text-[12px] font-semibold text-slate-800 shadow-sm transition focus:border-lime-400 focus:outline-none focus:ring-4 focus:ring-lime-200/60 dark:border-white/10 dark:bg-white/5 dark:text-white"
                                >
                                    <option value="portrait">Portrait</option>
                                    <option value="landscape">Landscape</option>
                                </select>
                            </div>

                            <div>
                                <label className="mb-1.5 block text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">Ukuran Font</label>
                                <select
                                    value={printSettings.fontSize}
                                    onChange={(e) => setPrintSettings({ ...printSettings, fontSize: e.target.value })}
                                    className="w-full rounded-xl border border-slate-200/90 bg-white px-3.5 py-2.5 text-[12px] font-semibold text-slate-800 shadow-sm transition focus:border-lime-400 focus:outline-none focus:ring-4 focus:ring-lime-200/60 dark:border-white/10 dark:bg-white/5 dark:text-white"
                                >
                                    <option value="8pt">Sangat Kecil (8pt)</option>
                                    <option value="9pt">Kecil (9pt)</option>
                                    <option value="10pt">Sedang (10pt)</option>
                                    <option value="11pt">Agak Besar (11pt)</option>
                                    <option value="12pt">Normal (12pt)</option>
                                </select>
                            </div>

                            {printTarget === 'rincian' && (
                                <div>
                                    <label className="mb-1.5 block text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">Tahap Cetak</label>
                                    <select
                                        value={printTahap}
                                        onChange={(e) => setPrintTahap(e.target.value as any)}
                                        className="w-full rounded-xl border border-slate-200/90 bg-white px-3.5 py-2.5 text-[12px] font-semibold text-slate-800 shadow-sm transition focus:border-lime-400 focus:outline-none focus:ring-4 focus:ring-lime-200/60 dark:border-white/10 dark:bg-white/5 dark:text-white"
                                    >
                                        <option value="tahunan">Tahunan</option>
                                        <option value="1">Tahap 1</option>
                                        <option value="2">Tahap 2</option>
                                    </select>
                                </div>
                            )}
                        </div>

                        <div className="mt-6 flex justify-end gap-3">
                            <button
                                onClick={() => setShowPrintModal(false)}
                                className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-[11.5px] font-bold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
                            >
                                Batal
                            </button>
                            {printTarget === 'bulanan' && (
                                <button
                                    onClick={() => handlePrint('all')}
                                    className="bg-slate-900 text-white hover:bg-slate-800 px-4 py-2 rounded-md text-sm font-medium shadow-sm transition-colors"
                                >
                                    Cetak Semua Bulan
                                </button>
                            )}
                            {['rincian', 'tahapan', 'tahapan_v1'].includes(printTarget) && (
                                <button
                                    onClick={() => handleExportExcel()}
                                    className="bg-slate-900 text-white hover:bg-slate-800 px-4 py-2 rounded-md text-sm font-medium shadow-sm transition-colors"
                                >
                                    Export Excel
                                </button>
                            )}
                            <button
                                onClick={() => handlePrint()}
                                className="bg-lime-400 text-slate-950 shadow-lime hover:bg-lime-300 px-4 py-2 rounded-md text-sm font-medium shadow-sm transition-colors"
                            >
                                Cetak PDF
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <Head title="Summary RKAS" />

            <div className="space-y-4">

                {/* Header Section */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-4">
                    <div>
                        <Link href={route('silpa-rkas.index', anggaran.id)} className="mb-1 inline-flex items-center text-[10.5px] font-semibold text-slate-400 transition hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-200">
                            <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                            Kembali
                        </Link>
                        <h1 className="text-[26px] font-extrabold leading-tight tracking-tight text-slate-900 dark:text-white">Rekapan RKAS</h1>
                        <p className="text-[11.5px] font-medium text-slate-500 dark:text-slate-400">Rekap Rencana Kegiatan dan Anggaran Sekolah</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setShowDateModal(true)}
                            className="flex items-center gap-2 rounded-2xl bg-lime-400 px-4 py-2 text-[11.5px] font-extrabold text-slate-950 shadow-lime transition hover:-translate-y-0.5 hover:bg-lime-300"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            Tanggal Cetak
                        </button>
                        <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                            Tanggal Cetak: {formatDateSafe(anggaran.tanggal_cetak)}
                        </span>
                    </div>
                </div>

                {/* Tabs & Content Container */}
                <div className="sikas-card min-h-[600px]">

                    {/* Tabs Navigation */}
                    <div className="border-b border-slate-100 px-4 py-3 dark:border-white/5">
                        <nav className="flex flex-wrap gap-2" aria-label="Tabs">
                            {tabs.map((tab) => (
                                <button
                                    key={tab.name}
                                    onClick={() => setActiveTab(tab.name)}
                                    className={`
                                        whitespace-nowrap px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 ease-in-out
                                        ${activeTab === tab.name
                                            ? 'bg-slate-900 text-white shadow-pill dark:bg-white dark:text-slate-900'
                                            : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-white'
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

                        {/* Partials */}
                        {activeTab === 'Rka Tahapan' && (
                            <TabRkaTahapan anggaran={anggaran} tahapanData={tahapanData} onPrint={(target) => { setPrintTarget(target as any); setShowPrintModal(true); }} onExportExcel={() => window.open(route('silpa-rkas.export-tahapan-excel', anggaran.id), '_blank')} />
                        )}
                        {activeTab === 'Rka Tahapan V.1' && (
                            <TabRkaTahapanV1 anggaran={anggaran} tahapanData={tahapanData} onPrint={(target) => { setPrintTarget(target as any); setShowPrintModal(true); }} onExportExcel={() => window.open(route('silpa-rkas.export-tahapan-v1-excel', anggaran.id), '_blank')} />
                        )}
                        {activeTab === 'Rka Rekap' && (
                            <TabRkaRekap anggaran={anggaran} rekapData={rekapData} perTahapData={perTahapData} onPrint={(target) => { setPrintTarget(target as any); setShowPrintModal(true); }} />
                        )}
                        {activeTab === 'Lembar Kerja 221' && (
                            <TabLembarKerja221 anggaran={anggaran} lembarData={lembarData} totalBelanja={totalBelanja} onPrint={(target) => { setPrintTarget(target as any); setShowPrintModal(true); }} />
                        )}
                        {activeTab === 'Rka Bulanan' && (
                            <TabRkaBulanan selectedMonth={selectedMonth} handleMonthChange={handleMonthChange} months={months} isLoading={isLoading} anggaran={anggaran} rkaBulananData={rkaBulananData} onPrint={(target) => { setPrintTarget(target as any); setShowPrintModal(true); }} />
                        )}
                        {activeTab === 'Rincian' && rincianData && (
                            <TabRincian rincianData={rincianData} onPrint={(target) => { setPrintTarget(target as any); setShowPrintModal(true); }} onExportExcel={() => window.open(route('silpa-rkas.export-rincian-excel', anggaran.id), '_blank')} />
                        )}
                        {activeTab === 'Grafik' && grafikData && (
                            <TabGrafik grafikData={grafikData} isDarkMode={isDarkMode} />
                        )}
                        {activeTab === 'Rincian Pencairan' && (
                            <TabRincianPencairan anggaran={anggaran} tahapanData={tahapanData} variant='silpa_rkas' onPrint={(target, params) => { if (params?.tahap) setRpTahap(params.tahap); setPrintTarget(target as any); setShowPrintModal(true); }} onExportExcel={(target, params) => { if (params?.tahap) setRpTahap(params.tahap); handleExportExcel(target); }} />
                        )}
                        {activeTab === 'Alur Kas' && (
                            <TabAlurKas anggaran={anggaran} tahapanData={tahapanData} months={months} onPrint={(target) => { setPrintTarget(target as any); setShowPrintModal(true); }} />
                        )}

                    </div>
                </div >
            </div >
            {/* Modal Tanggal Cetak */}
            {showDateModal && (
                <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
                    <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm transition-opacity" aria-hidden="true" onClick={() => setShowDateModal(false)}></div>
                        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
                        <div className="inline-block transform overflow-visible rounded-[26px] border border-white/70 bg-white text-left align-bottom shadow-float transition-all dark:border-white/10 dark:bg-[#15131F] sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                            <form onSubmit={handleSaveTanggalCetak}>
                                <div className="px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                                    <div className="sm:flex sm:items-start">
                                        <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                                            <h3 className="text-[14px] font-extrabold leading-6 text-slate-900 dark:text-white" id="modal-title">
                                                Atur Tanggal Cetak
                                            </h3>
                                            <div className="mt-4">
                                                <label htmlFor="tanggal_cetak" className="mb-1.5 block text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                                                    Tanggal Cetak
                                                </label>
                                                <DatePicker
                                                    value={dateData.tanggal_cetak}
                                                    onChange={(date) => setDateData('tanggal_cetak', date ? format(date, 'yyyy-MM-dd') : '')}
                                                    className="mt-1"
                                                    placeholder="Pilih Tanggal Cetak"
                                                />
                                                {errors.tanggal_cetak && (
                                                    <p className="mt-2 text-[10px] font-semibold text-rose-500">{errors.tanggal_cetak}</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex flex-col-reverse gap-2 border-t border-slate-100 bg-white px-4 py-3 dark:border-white/5 dark:bg-[#15131F] sm:flex-row-reverse sm:px-6">
                                    <button
                                        type="submit"
                                        disabled={processing}
                                        className="inline-flex w-full justify-center rounded-2xl bg-lime-400 px-4 py-2.5 text-[11.5px] font-extrabold text-slate-950 shadow-lime transition hover:bg-lime-300 disabled:opacity-50 sm:ml-3 sm:w-auto"
                                    >
                                        {processing ? 'Menyimpan...' : 'Simpan'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setShowDateModal(false)}
                                        className="mt-3 inline-flex w-full justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-[11.5px] font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10 sm:mt-0 sm:ml-3 sm:w-auto"
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




