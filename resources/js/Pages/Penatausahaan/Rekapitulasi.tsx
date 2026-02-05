import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, usePage, router } from '@inertiajs/react';
import React, { useState, useEffect } from 'react';
import PrimaryButton from '@/Components/PrimaryButton';
import axios from 'axios';
import { format, isValid } from 'date-fns';
import { id } from 'date-fns/locale';
import PrintSettingsModal, { PrintSettings } from '@/Components/PrintSettingsModal';
import CheckStsModal from './Partials/CheckStsModal';
import TrkSaldoAwalModal from './Partials/TrkSaldoAwalModal';

interface RekapitulasiProps {
    auth: any;
    tahun: string;
    bulan: string;
}

export default function Rekapitulasi({ auth, tahun, bulan }: RekapitulasiProps) {
    const [activeTab, setActiveTab] = useState('bkp_bank');
    const [bkpBankData, setBkpBankData] = useState<any>(null);
    const [bkpPembantuData, setBkpPembantuData] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);

    // Independent states for month selection
    const [bulanBank, setBulanBank] = useState(bulan);
    const [bulanPembantu, setBulanPembantu] = useState(bulan);

    const [bkpUmumData, setBkpUmumData] = useState<any>(null);
    const [bulanUmum, setBulanUmum] = useState(bulan);

    const [bkpPajakData, setBkpPajakData] = useState<any>(null);
    const [bulanPajak, setBulanPajak] = useState(bulan);

    const [bkpRobData, setBkpRobData] = useState<any>(null);
    const [bulanRob, setBulanRob] = useState(bulan);

    const [bkpRegData, setBkpRegData] = useState<any>(null);
    const [bulanReg, setBulanReg] = useState(bulan);

    const [bkpBaData, setBkpBaData] = useState<any>(null);
    const [bulanBa, setBulanBa] = useState(bulan);

    const [realisasiData, setRealisasiData] = useState<any>(null);
    const [periodeRealisasi, setPeriodeRealisasi] = useState(bulan);
    const [jenisLaporanRealisasi, setJenisLaporanRealisasi] = useState('bulanan');

    const [showPrintModal, setShowPrintModal] = useState(false);
    const [showPrintBkpTunaiModal, setShowPrintBkpTunaiModal] = useState(false);
    const [showPrintBkpUmumModal, setShowPrintBkpUmumModal] = useState(false);
    const [showPrintBkpPajakModal, setShowPrintBkpPajakModal] = useState(false);
    const [showPrintBkpRobModal, setShowPrintBkpRobModal] = useState(false);
    const [showPrintBkpRegModal, setShowPrintBkpRegModal] = useState(false);
    const [showPrintBkpBaModal, setShowPrintBkpBaModal] = useState(false);
    const [showPrintRealisasiModal, setShowPrintRealisasiModal] = useState(false);
    const [showCheckStsModal, setShowCheckStsModal] = useState(false);
    const [showTrkSaldoAwalModal, setShowTrkSaldoAwalModal] = useState(false);

    const monthList = [
        'januari', 'februari', 'maret', 'april', 'mei', 'juni',
        'juli', 'agustus', 'september', 'oktober', 'november', 'desember'
    ];

    useEffect(() => {
        if (activeTab === 'bkp_bank' && tahun && bulanBank) {
            fetchBkpBankData();
        } else if (activeTab === 'bkp_pembantu' && tahun && bulanPembantu) {
            fetchBkpPembantuData();
        } else if (activeTab === 'bkp_umum' && tahun && bulanUmum) {
            fetchBkpUmumData();
        } else if (activeTab === 'bkp_pajak' && tahun && bulanPajak) {
            fetchBkpPajakData();
        } else if (activeTab === 'rob' && tahun && bulanRob) {
            fetchBkpRobData();
        } else if (activeTab === 'reg' && tahun && bulanReg) {
            fetchBkpRegData();
        } else if (activeTab === 'ba' && tahun && bulanBa) {
            fetchBkpBaData();
        } else if (activeTab === 'realisasi' && tahun) {
            // Re-fetch only if relevant params change.
            fetchRealisasiData();
        }
    }, [activeTab, tahun, bulanBank, bulanPembantu, bulanUmum, bulanPajak, bulanRob, bulanReg, bulanBa, periodeRealisasi, jenisLaporanRealisasi]);

    const fetchRealisasiData = async () => {
        setIsLoading(true);
        try {
            const response = await axios.get(route('api.realisasi.data', {
                tahun,
                periode: periodeRealisasi,
                jenis_laporan: jenisLaporanRealisasi
            }));
            if (response.data.success) {
                setRealisasiData(response.data);
            }
        } catch (error) {
            console.error("Error fetching Realisasi data:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchBkpBaData = async () => {
        setIsLoading(true);
        try {
            const response = await axios.get(route('api.ba.data', { tahun, bulan: bulanBa }));
            if (response.data.success) {
                setBkpBaData(response.data);
            }
        } catch (error) {
            console.error("Error fetching Berita Acara data:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchBkpRegData = async () => {
        setIsLoading(true);
        try {
            const response = await axios.get(route('api.bkp-reg.data', { tahun, bulan: bulanReg }));
            if (response.data.success) {
                setBkpRegData(response.data);
            }
        } catch (error) {
            console.error("Error fetching BKP Reg data:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchBkpRobData = async () => {
        setIsLoading(true);
        try {
            console.log("Fetching ROB Data for:", { tahun, bulan: bulanRob });
            const response = await axios.get(route('api.bkp-rob.data', { tahun, bulan: bulanRob }));
            console.log("ROB Data Response:", response.data);
            if (response.data.success) {
                setBkpRobData(response.data);
            }
        } catch (error) {
            console.error("Error fetching BKP ROB data:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchBkpBankData = async () => {
        setIsLoading(true);
        try {
            const response = await axios.get(route('api.bkp-bank.data', { tahun, bulan: bulanBank }));
            if (response.data.success) {
                setBkpBankData(response.data);
            }
        } catch (error) {
            console.error("Error fetching BKP Bank data:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchBkpPembantuData = async () => {
        setIsLoading(true);
        try {
            const response = await axios.get(route('api.bkp-pembantu.data', { tahun, bulan: bulanPembantu }));
            if (response.data.success) {
                setBkpPembantuData(response.data);
            }
        } catch (error) {
            console.error("Error fetching BKP Pembantu data:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchBkpUmumData = async () => {
        setIsLoading(true);
        try {
            const response = await axios.get(route('api.bkp-umum.data', { tahun, bulan: bulanUmum }));
            if (response.data.success) {
                setBkpUmumData(response.data);
            }
        } catch (error) {
            console.error("Error fetching BKP Umum data:", error);
        } finally {
            setIsLoading(false);
        }
    };



    const fetchBkpPajakData = async () => {
        setIsLoading(true);
        try {
            const response = await axios.get(route('api.bkp-pajak.data', { tahun, bulan: bulanPajak }));
            if (response.data.success) {
                setBkpPajakData(response.data);
            }
        } catch (error) {
            console.error("Error fetching BKP Pajak data:", error);
        } finally {
            setIsLoading(false);
        }
    };

    // Format Currency Helper
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'decimal',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    };

    const tabs = [
        { id: 'bkp_bank', label: 'BKP Bank' },
        { id: 'bkp_pembantu', label: 'BKP Pembantu' },
        { id: 'bkp_umum', label: 'BKP Umum' },
        { id: 'bkp_pajak', label: 'BKP Pajak' },
        { id: 'rob', label: 'ROB' },
        { id: 'reg', label: 'REG' },
        { id: 'ba', label: 'Berita Acara' },
        { id: 'realisasi', label: 'Realisasi' }
    ];

    const handleExportExcelBkpBank = () => {
        const url = route('bkp-bank.excel', {
            tahun,
            bulan: bulanBank
        });
        window.open(url, '_blank');
    };

    const handlePrintBkpBank = (settings: PrintSettings) => {
        const url = route('bkp-bank.cetak', {
            tahun,
            bulan: settings.period || bulanBank, // Use period from settings or fallback
            paperSize: settings.paperSize,
            orientation: settings.orientation,
            fontSize: settings.fontSize
        });
        window.open(url, '_blank');
    };

    const handleExportExcelBkpTunai = () => {
        const url = route('bkp-pembantu.excel', {
            tahun: tahun,
            bulan: bulanPembantu
        });
        window.open(url, '_blank');
    };

    const handlePrintBkpPembantu = (settings: PrintSettings) => {
        const url = route('bkp-pembantu.cetak', {
            tahun,
            bulan: settings.period || bulanPembantu,
            paperSize: settings.paperSize,
            orientation: settings.orientation,
            fontSize: settings.fontSize
        });
        window.open(url, '_blank');
    };

    const handleExportExcelBkpUmum = () => {
        const url = route('bkp-umum.excel', {
            tahun: tahun,
            bulan: bulanUmum
        });
        window.open(url, '_blank');
    };

    const handlePrintBkpUmum = (settings: PrintSettings) => {
        const url = route('bkp-umum.cetak', {
            tahun,
            bulan: settings.period || bulanUmum,
            paperSize: settings.paperSize,
            orientation: settings.orientation,
            fontSize: settings.fontSize
        });
        window.open(url, '_blank');
    };

    const handleExportExcelBkpPajak = () => {
        const url = route('bkp-pajak.excel', {
            tahun: tahun,
            bulan: bulanPajak
        });
        window.open(url, '_blank');
    };

    const handlePrintBkpPajak = (settings: PrintSettings) => {
        const url = route('bkp-pajak.cetak', {
            tahun,
            bulan: settings.period || bulanPajak,
            paperSize: settings.paperSize,
            orientation: settings.orientation,
            fontSize: settings.fontSize
        });
        window.open(url, '_blank');
    };

    const handlePrintBkpRob = (settings: PrintSettings) => {
        const url = route('bkp-rob.cetak', {
            tahun,
            bulan: settings.period || bulanRob,
            paperSize: settings.paperSize,
            orientation: settings.orientation,
            fontSize: settings.fontSize
        });
        window.open(url, '_blank');
    };

    const handlePrintBkpReg = (settings: PrintSettings) => {
        const url = route('bkp-reg.cetak', {
            tahun,
            bulan: settings.period || bulanReg,
            paperSize: settings.paperSize,
            orientation: settings.orientation,
            fontSize: settings.fontSize
        });
        window.open(url, '_blank');
    };

    const handlePrintBa = (settings: PrintSettings) => {
        const url = route('ba.cetak', {
            tahun,
            bulan: settings.period || bulanBa,
            paperSize: settings.paperSize,
            orientation: settings.orientation,
            fontSize: settings.fontSize
        });
        window.open(url, '_blank');
    };

    const handlePrintRealisasi = (settings: PrintSettings) => {
        let jenis = 'bulanan';
        if (settings.period === 'Tahunan') jenis = 'tahunan';
        else if (settings.period?.startsWith?.('Tahap')) jenis = 'tahap';

        const url = route('realisasi.cetak', {
            tahun,
            periode: settings.period || periodeRealisasi,
            jenis_laporan: jenis,
            paperSize: settings.paperSize,
            orientation: settings.orientation,
            fontSize: settings.fontSize
        });
        window.open(url, '_blank');
    };

    return (
        <AuthenticatedLayout
            header={
                <h2 className="font-semibold text-xl text-gray-800 dark:text-gray-200 leading-tight">
                    Rekapan BKU
                </h2>
            }
        >
            <Head title="Rekapan BKU" />

            <div className="py-12">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8 space-y-6">
                    <div>
                        <h1 className="text-2xl font-bold text-blue-600 dark:text-blue-400">Rekapan Buku Kas</h1>
                        <p className="text-gray-600 dark:text-gray-400">Rekap Buku Kas Pembantu</p>
                    </div>

                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                        {/* Tabs */}
                        <div className="flex flex-wrap gap-2 border-b border-gray-200 dark:border-gray-700 pb-4 mb-6 text-sm overflow-x-auto whitespace-nowrap">
                            {tabs.map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`px-4 py-2 font-medium rounded-md transition-colors
                                        ${activeTab === tab.id
                                            ? 'text-gray-900 bg-gray-100 dark:bg-gray-700 dark:text-white'
                                            : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                                        }`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        {/* Content Area */}
                        {activeTab === 'bkp_bank' && (
                            <div className="space-y-8 animate-fade-in-up">
                                {/* Control Bar */}
                                <div className="flex flex-col md:flex-row justify-between items-center bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                                    <div className="flex items-center gap-4 w-full md:w-auto">
                                        <label htmlFor="bulanBank" className="text-sm font-medium text-gray-700 dark:text-gray-300">Pilih Bulan:</label>
                                        <select
                                            id="bulanBank"
                                            value={bulanBank.toLowerCase()}
                                            onChange={(e) => setBulanBank(e.target.value)}
                                            className="border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 px-3 py-2 text-gray-700 dark:text-gray-300 w-full md:w-48 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent capitalize"
                                        >
                                            {monthList.map((m) => (
                                                <option key={m} value={m}>
                                                    {m.charAt(0).toUpperCase() + m.slice(1)}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="mt-4 md:mt-0 flex gap-2">
                                        <button
                                            onClick={() => setShowTrkSaldoAwalModal(true)}
                                            className="inline-flex items-center px-4 py-2 bg-yellow-600 dark:bg-yellow-500 border border-transparent rounded-md font-semibold text-xs text-white uppercase tracking-widest hover:bg-yellow-500 dark:hover:bg-yellow-400 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 transition ease-in-out duration-150"
                                        >
                                            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            {bkpBankData?.data?.is_trk_saldo_awal_year ? 'Update Check Saldo Awal' : 'Check Saldo Awal'}
                                        </button>

                                        <button
                                            onClick={() => setShowCheckStsModal(true)}
                                            className="inline-flex items-center px-4 py-2 bg-green-600 dark:bg-green-500 border border-transparent rounded-md font-semibold text-xs text-white uppercase tracking-widest hover:bg-green-500 dark:hover:bg-green-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition ease-in-out duration-150"
                                        >
                                            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            {bkpBankData?.data?.has_sts_year ? 'Update Check STS' : 'Check STS'}
                                        </button>

                                        <button
                                            onClick={handleExportExcelBkpBank}
                                            className="inline-flex items-center px-4 py-2 bg-green-800 dark:bg-green-200 border border-transparent rounded-md font-semibold text-xs text-white dark:text-green-800 uppercase tracking-widest hover:bg-green-700 dark:hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition ease-in-out duration-150"
                                        >
                                            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                            </svg>
                                            Export Excel
                                        </button>

                                        <button
                                            onClick={() => setShowPrintModal(true)}
                                            className="inline-flex items-center px-4 py-2 bg-gray-800 dark:bg-gray-200 border border-transparent rounded-md font-semibold text-xs text-white dark:text-gray-800 uppercase tracking-widest hover:bg-gray-700 dark:hover:bg-white focus:bg-gray-700 dark:focus:bg-white active:bg-gray-900 dark:active:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition ease-in-out duration-150"
                                        >
                                            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                            </svg>
                                            CETAK BKP BANK
                                        </button>
                                    </div>
                                </div>

                                <PrintSettingsModal
                                    show={showPrintModal}
                                    onClose={() => setShowPrintModal(false)}
                                    onPrint={handlePrintBkpBank}
                                    title="Cetak BKP Bank"
                                    includePeriodFilters={true} // Enable filter
                                    initialPeriod={bulanBank} // Set default
                                />

                                <CheckStsModal
                                    show={showCheckStsModal}
                                    onClose={() => setShowCheckStsModal(false)}
                                    currentBulan={bulanBank}
                                    currentTahun={tahun}
                                    onSuccess={() => {
                                        fetchBkpBankData();
                                    }}
                                />

                                <TrkSaldoAwalModal
                                    show={showTrkSaldoAwalModal}
                                    onClose={() => setShowTrkSaldoAwalModal(false)}
                                    tahun={tahun}
                                    onSuccess={() => {
                                        fetchBkpBankData();
                                    }}
                                />

                                {/* Report Paper */}
                                <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-x-auto">
                                    <div className="min-w-[900px]">
                                        {/* Report Header */}
                                        <div className="text-center mb-8">
                                            <h2 className="text-lg font-bold uppercase underline underline-offset-4 text-gray-900 dark:text-gray-100">BUKU KAS PEMBANTU BANK</h2>
                                            <h3 className="text-sm font-bold uppercase mt-1 text-gray-900 dark:text-gray-100">BULAN : {bulanBank.toUpperCase()} TAHUN : {tahun}</h3>
                                        </div>

                                        {/* Metadata */}
                                        <div className="grid grid-cols-[150px_10px_1fr] gap-y-1 mb-6 text-sm text-gray-800 dark:text-gray-200 font-medium">
                                            <div>NPSN</div>
                                            <div>:</div>
                                            <div>{bkpBankData?.sekolah?.npsn || '-'}</div>

                                            <div>Nama Sekolah</div>
                                            <div>:</div>
                                            <div>{bkpBankData?.sekolah?.nama_sekolah || '-'}</div>

                                            <div>Desa/Kecamatan</div>
                                            <div>:</div>
                                            <div>{bkpBankData?.sekolah?.kelurahan_desa || '-'} / {bkpBankData?.sekolah?.kecamatan || '-'}</div>

                                            <div>Kabupaten / Kota</div>
                                            <div>:</div>
                                            <div>{bkpBankData?.sekolah?.kabupaten || '-'}</div>

                                            <div>Provinsi</div>
                                            <div>:</div>
                                            <div>{bkpBankData?.sekolah?.provinsi || '-'}</div>

                                            <div>Sumber Dana</div>
                                            <div>:</div>
                                            <div>BOSP Reguler</div>
                                        </div>

                                        {/* Table */}
                                        <table className="w-full border-collapse border border-gray-800 dark:border-gray-500 text-xs sm:text-sm">
                                            <thead>
                                                <tr className="bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white font-bold text-center">
                                                    <th className="border border-gray-600 p-2 w-24">TANGGAL</th>
                                                    <th className="border border-gray-600 p-2 w-32">KODE KEGIATAN</th>
                                                    <th className="border border-gray-600 p-2 w-32">KODE REKENING</th>
                                                    <th className="border border-gray-600 p-2 w-24">NO. BUKTI</th>
                                                    <th className="border border-gray-600 p-2">URAIAN</th>
                                                    <th className="border border-gray-600 p-2 w-32">PENERIMAAN</th>
                                                    <th className="border border-gray-600 p-2 w-32">PENGELUARAN</th>
                                                    <th className="border border-gray-600 p-2 w-32">SALDO</th>
                                                </tr>
                                                <tr className="bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-300 text-center font-semibold">
                                                    <td className="border border-gray-600 p-1">1</td>
                                                    <td className="border border-gray-600 p-1">2</td>
                                                    <td className="border border-gray-600 p-1">3</td>
                                                    <td className="border border-gray-600 p-1">4</td>
                                                    <td className="border border-gray-600 p-1">5</td>
                                                    <td className="border border-gray-600 p-1">6</td>
                                                    <td className="border border-gray-600 p-1">7</td>
                                                    <td className="border border-gray-600 p-1">8</td>
                                                </tr>
                                            </thead>
                                            <tbody className="text-gray-900 dark:text-gray-100">
                                                {isLoading ? (
                                                    <tr>
                                                        <td colSpan={8} className="border border-gray-600 p-8 text-center text-gray-500">
                                                            Memuat data...
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    (() => {
                                                        const items = bkpBankData?.items || [];
                                                        const hasSaldoAwalTahunLalu = bkpBankData?.data?.has_saldo_awal_tahun_lalu;

                                                        // Determine Starting Row Data
                                                        let startLabel = '';
                                                        let startBalance = Number(bkpBankData?.data?.saldo_awal || 0);

                                                        const idx = monthList.indexOf(bulanBank.toLowerCase());

                                                        if (hasSaldoAwalTahunLalu && idx !== 0) {
                                                            const monthName = idx !== -1 ? monthList[idx].charAt(0).toUpperCase() + monthList[idx].slice(1) : '';
                                                            startLabel = `Saldo Awal ${monthName} ${tahun}`;
                                                        } else {
                                                            // Logic for "Saldo Bank Bulan ..." (Previous Month)
                                                            if (idx === 0) {
                                                                startLabel = "Saldo Bank Bulan Desember " + (parseInt(tahun) - 1);
                                                            } else {
                                                                startLabel = "Saldo Bank Bulan " + monthList[idx - 1].charAt(0).toUpperCase() + monthList[idx - 1].slice(1) + " " + tahun;
                                                            }
                                                        }

                                                        let runningBalance = startBalance;

                                                        return (
                                                            <>
                                                                {/* Dynamic Header Row */}
                                                                <tr>
                                                                    <td className="border border-gray-600 p-2 text-center">
                                                                        01-{(() => {
                                                                            const monthMap: { [key: string]: string } = {
                                                                                'januari': '01', 'februari': '02', 'maret': '03', 'april': '04',
                                                                                'mei': '05', 'juni': '06', 'juli': '07', 'agustus': '08',
                                                                                'september': '09', 'oktober': '10', 'november': '11', 'desember': '12'
                                                                            };
                                                                            return monthMap[bulanBank.toLowerCase()] || '01';
                                                                        })()}-{tahun}
                                                                    </td>
                                                                    <td className="border border-gray-600 p-2"></td>
                                                                    <td className="border border-gray-600 p-2"></td>
                                                                    <td className="border border-gray-600 p-2"></td>
                                                                    <td className="border border-gray-600 p-2 font-medium">
                                                                        {startLabel}
                                                                    </td>
                                                                    <td className="border border-gray-600 p-2 text-right">
                                                                        {/* Jika Saldo Awal Tahun Lalu, nilai sudah masuk di saldo_awal backend, tampilkan di sini jika mau, atau sembunyikan sesuai PDF? 
                                                                            PDF logic: shows number_format($report['data']['saldo_awal']..). 
                                                                            So we show it.
                                                                        */}
                                                                        {formatCurrency(startBalance)}
                                                                    </td>
                                                                    <td className="border border-gray-600 p-2 text-right">0</td>
                                                                    <td className="border border-gray-600 p-2 text-right font-bold">
                                                                        {formatCurrency(startBalance)}
                                                                    </td>
                                                                </tr>

                                                                {/* Transactions */}
                                                                {items.length === 0 ? (
                                                                    <tr>
                                                                        <td colSpan={8} className="border border-gray-600 p-8 text-center text-gray-500 italic">
                                                                            Tidak ada transaksi bulan ini
                                                                        </td>
                                                                    </tr>
                                                                ) : (
                                                                    items.map((item: any, index: number) => {
                                                                        const penerimaan = Number(item.penerimaan || 0);
                                                                        const pengeluaran = Number(item.pengeluaran || 0);
                                                                        runningBalance = runningBalance + penerimaan - pengeluaran;

                                                                        return (
                                                                            <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                                                                <td className="border border-gray-600 p-2 text-center whitespace-nowrap">
                                                                                    {format(new Date(item.tanggal), 'dd-MM-yyyy')}
                                                                                </td>
                                                                                <td className="border border-gray-600 p-2 text-center text-gray-600">{item.kode_kegiatan || ''}</td>
                                                                                <td className="border border-gray-600 p-2 text-center text-gray-600">{item.kode_rekening || ''}</td>
                                                                                <td className="border border-gray-600 p-2 text-center text-gray-600">{item.no_bukti || ''}</td>
                                                                                <td className="border border-gray-600 p-2">{item.uraian}</td>
                                                                                <td className="border border-gray-600 p-2 text-right">
                                                                                    {penerimaan > 0 ? formatCurrency(penerimaan) : '0'}
                                                                                </td>
                                                                                <td className="border border-gray-600 p-2 text-right">
                                                                                    {pengeluaran > 0 ? formatCurrency(pengeluaran) : '0'}
                                                                                </td>
                                                                                <td className="border border-gray-600 p-2 text-right font-medium">
                                                                                    {formatCurrency(runningBalance)}
                                                                                </td>
                                                                            </tr>
                                                                        );
                                                                    })
                                                                )}
                                                                {/* Footer Totals */}
                                                                <tr className="bg-gray-100 dark:bg-gray-700 font-bold text-gray-900 dark:text-gray-100">
                                                                    <td colSpan={5} className="border border-gray-600 p-2 uppercase">Jumlah</td>
                                                                    <td className="border border-gray-600 p-2 text-right">
                                                                        {(() => {
                                                                            const items = bkpBankData?.items || [];
                                                                            const saldoAwal = Number(bkpBankData?.data?.saldo_awal || 0);
                                                                            const totalPenerimaanItems = items.reduce((acc: number, item: any) => acc + Number(item.penerimaan || 0), 0);
                                                                            return formatCurrency(saldoAwal + totalPenerimaanItems);
                                                                        })()}
                                                                    </td>
                                                                    <td className="border border-gray-600 p-2 text-right">
                                                                        {(() => {
                                                                            const items = bkpBankData?.items || [];
                                                                            const totalPengeluaranItems = items.reduce((acc: number, item: any) => acc + Number(item.pengeluaran || 0), 0);
                                                                            return formatCurrency(totalPengeluaranItems);
                                                                        })()}
                                                                    </td>
                                                                    <td className="border border-gray-600 p-2 text-right">
                                                                        {(() => {
                                                                            const items = bkpBankData?.items || [];
                                                                            const saldoAwal = Number(bkpBankData?.data?.saldo_awal || 0);
                                                                            const totalPenerimaanItems = items.reduce((acc: number, item: any) => acc + Number(item.penerimaan || 0), 0);
                                                                            const totalPengeluaranItems = items.reduce((acc: number, item: any) => acc + Number(item.pengeluaran || 0), 0);
                                                                            const totalPenerimaan = saldoAwal + totalPenerimaanItems;
                                                                            return formatCurrency(totalPenerimaan - totalPengeluaranItems);
                                                                        })()}
                                                                    </td>
                                                                </tr>
                                                            </>
                                                        );
                                                    })()
                                                )}

                                            </tbody>
                                        </table>

                                        {/* Closing Text */}
                                        <div className="mt-8 text-gray-800 dark:text-gray-200 text-sm">
                                            <p className="mb-2">
                                                {(() => {
                                                    // Determine closing date (Last date of month or Today if current month is open? Assuming last date for report)
                                                    const monthIndex = monthList.indexOf(bulanBank.toLowerCase());
                                                    let dateObj;
                                                    if (monthIndex !== -1 && tahun) {
                                                        dateObj = new Date(parseInt(tahun), monthIndex + 1, 0); // Last day
                                                    } else {
                                                        dateObj = new Date();
                                                    }

                                                    // Safety check
                                                    if (!isValid(dateObj)) dateObj = new Date();

                                                    const hari = format(dateObj, 'EEEE', { locale: id });
                                                    const tanggal = format(dateObj, 'd MMMM yyyy', { locale: id });

                                                    return `Pada hari ini ${hari}, ${tanggal}, Buku Kas Bank Ditutup dengan keadaan/posisi buku sebagai berikut :`;
                                                })()}
                                            </p>
                                            <p className="font-bold">
                                                Saldo Bank : Rp. {(() => {
                                                    const items = bkpBankData?.items || [];
                                                    const saldoAwal = Number(bkpBankData?.data?.saldo_awal || 0);
                                                    const totalPenerimaanItems = items.reduce((acc: number, item: any) => acc + Number(item.penerimaan || 0), 0);
                                                    const totalPengeluaranItems = items.reduce((acc: number, item: any) => acc + Number(item.pengeluaran || 0), 0);
                                                    const totalPenerimaan = saldoAwal + totalPenerimaanItems;
                                                    return formatCurrency(totalPenerimaan - totalPengeluaranItems);
                                                })()}
                                            </p>
                                        </div>

                                        {/* Signatures */}
                                        <div className="mt-16 flex justify-between px-8 text-center text-sm text-gray-900 dark:text-gray-100">
                                            <div>
                                                <p className="mb-24">Menyetujui,<br />Kepala Sekolah</p>
                                                <p className="font-bold underline uppercase underline-offset-2">
                                                    {bkpBankData?.kepala_sekolah?.nama || '.........................'}
                                                </p>
                                                <p>NIP. {bkpBankData?.kepala_sekolah?.nip || '.........................'}</p>
                                            </div>
                                            <div>
                                                <p className="mb-24">
                                                    {bkpBankData?.sekolah?.kecamatan || '................'}, {(() => {
                                                        const monthIndex = monthList.indexOf(bulanBank.toLowerCase());
                                                        let dateObj;
                                                        if (monthIndex !== -1 && tahun) {
                                                            dateObj = new Date(parseInt(tahun), monthIndex + 1, 0);
                                                        } else {
                                                            dateObj = new Date();
                                                        }
                                                        if (!isValid(dateObj)) dateObj = new Date();
                                                        return format(dateObj, 'd MMMM yyyy', { locale: id });
                                                    })()}
                                                    <br />Bendahara,
                                                </p>
                                                <p className="font-bold underline uppercase underline-offset-2">
                                                    {bkpBankData?.bendahara?.nama || '.........................'}
                                                </p>
                                                <p>NIP. {bkpBankData?.bendahara?.nip || '.........................'}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}





                        {activeTab === 'bkp_umum' && (
                            <div className="space-y-8 animate-fade-in-up">
                                {/* Control Bar */}
                                <div className="flex flex-col md:flex-row justify-between items-center bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                                    <div className="flex items-center gap-4 w-full md:w-auto">
                                        <label htmlFor="bulanUmum" className="text-sm font-medium text-gray-700 dark:text-gray-300">Pilih Bulan:</label>
                                        <select
                                            id="bulanUmum"
                                            value={bulanUmum.toLowerCase()}
                                            onChange={(e) => setBulanUmum(e.target.value)}
                                            className="border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 px-3 py-2 text-gray-700 dark:text-gray-300 w-full md:w-48 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent capitalize"
                                        >
                                            {monthList.map((m) => (
                                                <option key={m} value={m}>
                                                    {m.charAt(0).toUpperCase() + m.slice(1)}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="mt-4 md:mt-0">
                                        <button
                                            onClick={handleExportExcelBkpUmum}
                                            className="inline-flex items-center px-4 py-2 bg-green-800 dark:bg-green-200 border border-transparent rounded-md font-semibold text-xs text-white dark:text-green-800 uppercase tracking-widest hover:bg-green-700 dark:hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition ease-in-out duration-150 mr-2"
                                        >
                                            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                            </svg>
                                            Export Excel
                                        </button>
                                        <button
                                            onClick={() => setShowPrintBkpUmumModal(true)}
                                            className="inline-flex items-center px-4 py-2 bg-gray-800 dark:bg-gray-200 border border-transparent rounded-md font-semibold text-xs text-white dark:text-gray-800 uppercase tracking-widest hover:bg-gray-700 dark:hover:bg-white focus:bg-gray-700 dark:focus:bg-white active:bg-gray-900 dark:active:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition ease-in-out duration-150"
                                        >
                                            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                            </svg>
                                            CETAK BKU UMUM
                                        </button>
                                    </div>
                                </div>
                                <PrintSettingsModal
                                    show={showPrintBkpUmumModal}
                                    onClose={() => setShowPrintBkpUmumModal(false)}
                                    onPrint={handlePrintBkpUmum}
                                    title="Cetak BKU Umum"
                                    includePeriodFilters={true}
                                    initialPeriod={bulanUmum}
                                />

                                {/* Report Paper */}
                                <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-x-auto">
                                    <div className="min-w-[900px]">
                                        {/* Report Header */}
                                        <div className="text-center mb-8">
                                            <h2 className="text-lg font-bold uppercase underline underline-offset-4 text-gray-900 dark:text-gray-100">BUKU KAS UMUM</h2>
                                            <h3 className="text-sm font-bold uppercase mt-1 text-gray-900 dark:text-gray-100">BULAN : {bulanUmum.toUpperCase()} TAHUN : {tahun}</h3>
                                        </div>

                                        {/* Metadata */}
                                        <div className="grid grid-cols-[150px_10px_1fr] gap-y-1 mb-6 text-sm text-gray-800 dark:text-gray-200 font-medium">
                                            <div>Nama Sekolah</div>
                                            <div>:</div>
                                            <div>{bkpUmumData?.sekolah?.nama_sekolah || '-'}</div>

                                            <div>Desa / Kecamatan</div>
                                            <div>:</div>
                                            <div>{bkpUmumData?.sekolah?.kelurahan_desa || '-'} / {bkpUmumData?.sekolah?.kecamatan || '-'}</div>

                                            <div>Kabupaten</div>
                                            <div>:</div>
                                            <div>{bkpUmumData?.sekolah?.kabupaten || '-'}</div>

                                            <div>Provinsi</div>
                                            <div>:</div>
                                            <div>{bkpUmumData?.sekolah?.provinsi || '-'}</div>
                                        </div>

                                        {/* Table */}
                                        <table className="w-full border-collapse border border-gray-800 dark:border-gray-500 text-xs sm:text-sm">
                                            <thead>
                                                <tr className="bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white font-bold text-center">
                                                    <th className="border border-gray-600 p-2 w-24">Tanggal</th>
                                                    <th className="border border-gray-600 p-2 w-32">Kode Rekening</th>
                                                    <th className="border border-gray-600 p-2 w-24">No. Bukti</th>
                                                    <th className="border border-gray-600 p-2">Uraian</th>
                                                    <th className="border border-gray-600 p-2 w-32">Penerimaan (Kredit)</th>
                                                    <th className="border border-gray-600 p-2 w-32">Pengeluaran (Debet)</th>
                                                    <th className="border border-gray-600 p-2 w-32">Saldo</th>
                                                </tr>
                                            </thead>
                                            <tbody className="text-gray-900 dark:text-gray-100">
                                                {isLoading ? (
                                                    <tr>
                                                        <td colSpan={7} className="border border-gray-600 p-8 text-center text-gray-500">
                                                            Memuat data...
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    (() => {
                                                        const items = bkpUmumData?.items || [];
                                                        let runningBalance = Number(bkpUmumData?.data?.saldo_awal || 0);

                                                        const renderedRows = [];

                                                        // ALWAYS ADD SALDO AWAL ROW
                                                        renderedRows.push(
                                                            <tr key="saldo-awal" className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                                                <td className="border border-gray-600 p-2 text-center whitespace-nowrap">
                                                                    {(() => {
                                                                        const monthMap: { [key: string]: string } = {
                                                                            'januari': '01', 'februari': '02', 'maret': '03', 'april': '04',
                                                                            'mei': '05', 'juni': '06', 'juli': '07', 'agustus': '08',
                                                                            'september': '09', 'oktober': '10', 'november': '11', 'desember': '12'
                                                                        };
                                                                        const m = monthMap[bulanUmum.toLowerCase()] || '01';
                                                                        return `01-${m}-${tahun}`;
                                                                    })()}
                                                                </td>
                                                                <td className="border border-gray-600 p-2 text-center text-gray-600">-</td>
                                                                <td className="border border-gray-600 p-2 text-center text-gray-600">-</td>
                                                                <td className="border border-gray-600 p-2 font-medium">
                                                                    {(() => {
                                                                        // Capitalize first letter of month
                                                                        const capitalizedBulan = bulanUmum.charAt(0).toUpperCase() + bulanUmum.slice(1);
                                                                        return `Saldo Awal Bulan ${capitalizedBulan} ${tahun}`;
                                                                    })()}
                                                                </td>
                                                                <td className="border border-gray-600 p-2 text-right">
                                                                    {/* Show in receipts as well if it represents a carry over or start balance */
                                                                        formatCurrency(bkpUmumData?.data?.saldo_awal || 0)}
                                                                </td>
                                                                <td className="border border-gray-600 p-2 text-right text-gray-600">-</td>
                                                                <td className="border border-gray-600 p-2 text-right font-medium">
                                                                    {formatCurrency(bkpUmumData?.data?.saldo_awal || 0)}
                                                                </td>
                                                            </tr>
                                                        );

                                                        if (items.length === 0) {
                                                            renderedRows.push(
                                                                <tr key="empty">
                                                                    <td colSpan={7} className="border border-gray-600 p-8 text-center text-gray-500 italic">
                                                                        Tidak ada transaksi bulan ini
                                                                    </td>
                                                                </tr>
                                                            );
                                                            return renderedRows;
                                                        }

                                                        const transactionRows = items.map((item: any, index: number) => {
                                                            const penerimaan = Number(item.penerimaan || 0);
                                                            const pengeluaran = Number(item.pengeluaran || 0);

                                                            // Correctly update running balance
                                                            runningBalance = runningBalance + penerimaan - pengeluaran;

                                                            return (
                                                                <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                                                    <td className="border border-gray-600 p-2 text-center whitespace-nowrap">
                                                                        {/* Format date properly */}
                                                                        {format(new Date(item.tanggal), 'dd-MM-yyyy')}
                                                                    </td>
                                                                    <td className="border border-gray-600 p-2 text-center text-gray-600">
                                                                        {item.kode_rekening !== '-' ? item.kode_rekening : ''}
                                                                    </td>
                                                                    <td className="border border-gray-600 p-2 text-center text-gray-600">
                                                                        {item.no_bukti !== '-' ? item.no_bukti : ''}
                                                                    </td>
                                                                    <td className="border border-gray-600 p-2">{item.uraian}</td>
                                                                    <td className="border border-gray-600 p-2 text-right">
                                                                        {penerimaan > 0 ? formatCurrency(penerimaan) : '-'}
                                                                    </td>
                                                                    <td className="border border-gray-600 p-2 text-right">
                                                                        {pengeluaran > 0 ? formatCurrency(pengeluaran) : '-'}
                                                                    </td>
                                                                    <td className="border border-gray-600 p-2 text-right font-medium">
                                                                        {formatCurrency(runningBalance)}
                                                                    </td>
                                                                </tr>
                                                            );
                                                        });

                                                        return [...renderedRows, ...transactionRows];
                                                    })()
                                                )}

                                                {/* Footer Totals */}
                                                <tr className="bg-gray-300 dark:bg-gray-600 font-bold text-gray-900 dark:text-gray-100">
                                                    <td colSpan={4} className="border border-gray-600 p-2 text-center">Jumlah Penutupan</td>
                                                    <td className="border border-gray-600 p-2 text-right">
                                                        {formatCurrency(bkpUmumData?.data?.total_penerimaan || 0)}
                                                    </td>
                                                    <td className="border border-gray-600 p-2 text-right">
                                                        {formatCurrency(bkpUmumData?.data?.total_pengeluaran || 0)}
                                                    </td>
                                                    <td className="border border-gray-600 p-2 text-right">
                                                        {formatCurrency(bkpUmumData?.data?.saldo_akhir || 0)}
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>

                                        {/* Closing Text */}
                                        <div className="mt-8 text-gray-800 dark:text-gray-200 text-sm">
                                            <p className="mb-4">
                                                {(() => {
                                                    const monthIndex = monthList.indexOf(bulanUmum.toLowerCase());
                                                    let dateObj;
                                                    if (monthIndex !== -1 && tahun) {
                                                        dateObj = new Date(parseInt(tahun), monthIndex + 1, 0); // Last day
                                                    } else {
                                                        dateObj = new Date();
                                                    }
                                                    if (!isValid(dateObj)) dateObj = new Date();

                                                    const hari = format(dateObj, 'EEEE', { locale: id });
                                                    const tanggal = format(dateObj, 'd MMMM yyyy', { locale: id });

                                                    return `Pada hari ini, ${hari}, tanggal ${tanggal} Buku Kas Umum ditutup dengan keadaan/posisi sebagai berikut :`;
                                                })()}
                                            </p>

                                            <div className="max-w-xl pl-4 space-y-1">
                                                <div className="flex justify-between">
                                                    <span>Saldo Buku Kas Umum :</span>
                                                    <span className="font-bold">Rp. {formatCurrency(bkpUmumData?.data?.saldo_bku || 0)}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span>Saldo Bank :</span>
                                                    <span className="font-bold">Rp. {formatCurrency(bkpUmumData?.data?.saldo_bank || 0)}</span>
                                                </div>
                                                <div className="pl-6 flex justify-between text-xs">
                                                    <span>1. Dana Sekolah :</span>
                                                    <span className="font-bold underline dotted">Rp. {formatCurrency(bkpUmumData?.data?.dana_sekolah || 0)}</span>
                                                </div>
                                                <div className="pl-6 flex justify-between text-xs">
                                                    <span>2. Dana BOSP :</span>
                                                    <span className="font-bold underline dotted">Rp. {formatCurrency(bkpUmumData?.data?.dana_bosp || 0)}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span>Saldo Kas Tunai :</span>
                                                    <span className="font-bold">Rp. {formatCurrency(bkpUmumData?.data?.saldo_tunai || 0)}</span>
                                                </div>
                                                <div className="flex justify-between pt-2 border-t border-gray-400 font-bold">
                                                    <span>Jumlah :</span>
                                                    <span>Rp. {formatCurrency(bkpUmumData?.data?.saldo_bku || 0)}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Signatures */}
                                        <div className="mt-16 flex justify-between px-8 text-center text-sm text-gray-900 dark:text-gray-100">
                                            <div>
                                                <p className="mb-24">Mengetahui,<br />Kepala Sekolah</p>
                                                <p className="font-bold underline uppercase underline-offset-2">
                                                    {bkpUmumData?.kepala_sekolah?.nama || '.........................'}
                                                </p>
                                                <p>NIP. {bkpUmumData?.kepala_sekolah?.nip || '.........................'}</p>
                                            </div>
                                            <div>
                                                <p className="mb-24">
                                                    {bkpUmumData?.sekolah?.kecamatan || '................'}, {(() => {
                                                        const monthIndex = monthList.indexOf(bulanUmum.toLowerCase());
                                                        let dateObj;
                                                        if (monthIndex !== -1 && tahun) {
                                                            dateObj = new Date(parseInt(tahun), monthIndex + 1, 0);
                                                        } else {
                                                            dateObj = new Date();
                                                        }
                                                        if (!isValid(dateObj)) dateObj = new Date();
                                                        return format(dateObj, 'd MMMM yyyy', { locale: id });
                                                    })()}
                                                    <br />Bendahara,
                                                </p>
                                                <p className="font-bold underline uppercase underline-offset-2">
                                                    {bkpUmumData?.bendahara?.nama || '.........................'}
                                                </p>
                                                <p>NIP. {bkpUmumData?.bendahara?.nip || '.........................'}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                        {activeTab === 'bkp_pajak' && (
                            <div className="space-y-8 animate-fade-in-up">
                                {/* Control Bar */}
                                <div className="flex flex-col md:flex-row justify-between items-center bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                                    <div className="flex items-center gap-4 w-full md:w-auto">
                                        <label htmlFor="bulanPajak" className="text-sm font-medium text-gray-700 dark:text-gray-300">Pilih Bulan:</label>
                                        <select
                                            id="bulanPajak"
                                            value={bulanPajak.toLowerCase()}
                                            onChange={(e) => setBulanPajak(e.target.value)}
                                            className="border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 px-3 py-2 text-gray-700 dark:text-gray-300 w-full md:w-48 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent capitalize"
                                        >
                                            {monthList.map((m) => (
                                                <option key={m} value={m}>
                                                    {m.charAt(0).toUpperCase() + m.slice(1)}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="mt-4 md:mt-0">
                                        <button
                                            onClick={handleExportExcelBkpPajak}
                                            className="inline-flex items-center px-4 py-2 bg-green-800 dark:bg-green-200 border border-transparent rounded-md font-semibold text-xs text-white dark:text-green-800 uppercase tracking-widest hover:bg-green-700 dark:hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition ease-in-out duration-150 mr-2"
                                        >
                                            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                            </svg>
                                            Export Excel
                                        </button>
                                        <button
                                            onClick={() => setShowPrintBkpPajakModal(true)}
                                            className="inline-flex items-center px-4 py-2 bg-gray-800 dark:bg-gray-200 border border-transparent rounded-md font-semibold text-xs text-white dark:text-gray-800 uppercase tracking-widest hover:bg-gray-700 dark:hover:bg-white focus:bg-gray-700 dark:focus:bg-white active:bg-gray-900 dark:active:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition ease-in-out duration-150"
                                        >
                                            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                            </svg>
                                            CETAK BKP PAJAK
                                        </button>
                                    </div>
                                </div>

                                <PrintSettingsModal
                                    show={showPrintBkpPajakModal}
                                    onClose={() => setShowPrintBkpPajakModal(false)}
                                    onPrint={handlePrintBkpPajak}
                                    title="Cetak BKP Pajak"
                                    includePeriodFilters={true}
                                    initialPeriod={bulanPajak}
                                />

                                {/* Report Paper */}
                                <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-x-auto">
                                    <div className="min-w-[1000px]">
                                        {/* Report Header */}
                                        <div className="text-center mb-8">
                                            <h2 className="text-lg font-bold uppercase text-gray-900 dark:text-gray-100">BUKU PEMBANTU PAJAK</h2>
                                            <h3 className="text-sm font-bold uppercase mt-1 text-gray-900 dark:text-gray-100">BULAN : {bulanPajak.toUpperCase()} {tahun}</h3>
                                        </div>

                                        {/* Metadata */}
                                        <div className="grid grid-cols-[150px_10px_1fr] gap-y-1 mb-6 text-sm text-gray-800 dark:text-gray-200 font-medium">
                                            <div>NPSN</div>
                                            <div>:</div>
                                            <div>{bkpPajakData?.data?.sekolah?.npsn || '-'}</div>

                                            <div>Nama Sekolah</div>
                                            <div>:</div>
                                            <div>{bkpPajakData?.data?.sekolah?.nama_sekolah || '-'}</div>

                                            <div>Desa / Kelurahan</div>
                                            <div>:</div>
                                            <div>{bkpPajakData?.data?.sekolah?.kelurahan_desa || '-'}</div>

                                            <div>Kecamatan</div>
                                            <div>:</div>
                                            <div>{bkpPajakData?.data?.sekolah?.kecamatan || '-'}</div>

                                            <div>Kabupaten / Kota</div>
                                            <div>:</div>
                                            <div>{bkpPajakData?.data?.sekolah?.kabupaten_kota || '-'}</div>

                                            <div>Provinsi</div>
                                            <div>:</div>
                                            <div>{bkpPajakData?.data?.sekolah?.provinsi || '-'}</div>

                                            <div>Sumber Dana</div>
                                            <div>:</div>
                                            <div>BOSP Reguler</div>
                                        </div>

                                        {/* Table */}
                                        <table className="w-full border-collapse border border-gray-800 dark:border-gray-500 text-xs sm:text-sm">
                                            <thead>
                                                <tr className="bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white font-bold text-center">
                                                    <th className="border border-gray-600 p-2 w-24">Tanggal</th>
                                                    <th className="border border-gray-600 p-2 w-24">No. Kode</th>
                                                    <th className="border border-gray-600 p-2 w-32">No. Buku</th>
                                                    <th className="border border-gray-600 p-2">Uraian</th>
                                                    <th className="border border-gray-600 p-2 w-20">PPN</th>
                                                    <th className="border border-gray-600 p-2 w-20">PPh 21</th>
                                                    <th className="border border-gray-600 p-2 w-20">PPh 22</th>
                                                    <th className="border border-gray-600 p-2 w-20">PPh 23</th>
                                                    <th className="border border-gray-600 p-2 w-20">PB 1</th>
                                                    <th className="border border-gray-600 p-2 w-24">JML</th>
                                                    <th className="border border-gray-600 p-2 w-24">Pengeluaran (Kredit)</th>
                                                    <th className="border border-gray-600 p-2 w-24">Saldo</th>
                                                </tr>
                                            </thead>
                                            <tbody className="text-gray-900 dark:text-gray-100">
                                                {/* Saldo Awal Row */}
                                                <tr>
                                                    <td className="border border-gray-600 p-2 text-center whitespace-nowrap">
                                                        1-{(() => {
                                                            const monthMap: { [key: string]: string } = {
                                                                'januari': '1', 'februari': '2', 'maret': '3', 'april': '4',
                                                                'mei': '5', 'juni': '6', 'juli': '7', 'agustus': '8',
                                                                'september': '9', 'oktober': '10', 'november': '11', 'desember': '12'
                                                            };
                                                            return monthMap[bulanPajak.toLowerCase()] || '1';
                                                        })()}-{tahun}
                                                    </td>
                                                    <td className="border border-gray-600 p-2 text-center">-</td>
                                                    <td className="border border-gray-600 p-2 text-center">-</td>
                                                    <td className="border border-gray-600 p-2 font-medium">Saldo awal bulan</td>
                                                    <td className="border border-gray-600 p-2 text-center">-</td>
                                                    <td className="border border-gray-600 p-2 text-center">-</td>
                                                    <td className="border border-gray-600 p-2 text-center">-</td>
                                                    <td className="border border-gray-600 p-2 text-center">-</td>
                                                    <td className="border border-gray-600 p-2 text-center">-</td>
                                                    <td className="border border-gray-600 p-2 text-center">-</td>
                                                    <td className="border border-gray-600 p-2 text-center">-</td>
                                                    <td className="border border-gray-600 p-2 text-right">0</td>
                                                </tr>

                                                {isLoading ? (
                                                    <tr>
                                                        <td colSpan={12} className="border border-gray-600 p-8 text-center text-gray-500">
                                                            Memuat data...
                                                        </td>
                                                    </tr>
                                                ) : bkpPajakData?.items && bkpPajakData.items.length > 0 ? (
                                                    bkpPajakData.items.map((item: any, index: number) => (
                                                        <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                                            <td className="border border-gray-600 p-2 text-center whitespace-nowrap">
                                                                {format(new Date(item.transaksi.tanggal_transaksi), 'dd-MM-yyyy')}
                                                            </td>
                                                            <td className="border border-gray-600 p-2 text-center">
                                                                {item.transaksi.id_transaksi || '-'}
                                                            </td>
                                                            <td className="border border-gray-600 p-2 text-center text-xs">
                                                                {item.transaksi.kode_masa_pajak || '-'}
                                                            </td>
                                                            <td className="border border-gray-600 p-2">
                                                                {item.uraian}
                                                            </td>
                                                            <td className="border border-gray-600 p-2 text-right">
                                                                {item.ppn > 0 ? formatCurrency(item.ppn) : '-'}
                                                            </td>
                                                            <td className="border border-gray-600 p-2 text-right">
                                                                {item.pph21 > 0 ? formatCurrency(item.pph21) : '-'}
                                                            </td>
                                                            <td className="border border-gray-600 p-2 text-right">
                                                                {item.pph22 > 0 ? formatCurrency(item.pph22) : '-'}
                                                            </td>
                                                            <td className="border border-gray-600 p-2 text-right">
                                                                {item.pph23 > 0 ? formatCurrency(item.pph23) : '-'}
                                                            </td>
                                                            <td className="border border-gray-600 p-2 text-right">
                                                                {item.pb1 > 0 ? formatCurrency(item.pb1) : '-'}
                                                            </td>
                                                            <td className="border border-gray-600 p-2 text-right font-medium">
                                                                {item.jumlah > 0 ? formatCurrency(item.jumlah) : '-'}
                                                            </td>
                                                            <td className="border border-gray-600 p-2 text-right">
                                                                {item.pengeluaran > 0 ? formatCurrency(item.pengeluaran) : '-'}
                                                            </td>
                                                            <td className="border border-gray-600 p-2 text-right">
                                                                {formatCurrency(item.saldo)}
                                                            </td>
                                                        </tr>
                                                    ))
                                                ) : (
                                                    <tr>
                                                        <td colSpan={12} className="border border-gray-600 p-8 text-center text-gray-500 italic">
                                                            Tidak ada transaksi pajak bulan ini
                                                        </td>
                                                    </tr>
                                                )}

                                                {/* Footer Totals */}
                                                <tr className="bg-gray-100 dark:bg-gray-700 font-bold text-gray-900 dark:text-gray-100">
                                                    <td colSpan={4} className="border border-gray-600 p-2 text-center uppercase">Jumlah Penutupan</td>
                                                    <td className="border border-gray-600 p-2 text-right">{formatCurrency(bkpPajakData?.data?.total_pajak?.ppn || 0)}</td>
                                                    <td className="border border-gray-600 p-2 text-right">{formatCurrency(bkpPajakData?.data?.total_pajak?.pph21 || 0)}</td>
                                                    <td className="border border-gray-600 p-2 text-right">{formatCurrency(bkpPajakData?.data?.total_pajak?.pph22 || 0)}</td>
                                                    <td className="border border-gray-600 p-2 text-right">{formatCurrency(bkpPajakData?.data?.total_pajak?.pph23 || 0)}</td>
                                                    <td className="border border-gray-600 p-2 text-right">{formatCurrency(bkpPajakData?.data?.total_pajak?.pb1 || 0)}</td>
                                                    <td className="border border-gray-600 p-2 text-right">{formatCurrency(bkpPajakData?.data?.total_penerimaan || 0)}</td>
                                                    <td className="border border-gray-600 p-2 text-right">{formatCurrency(bkpPajakData?.data?.total_pengeluaran || 0)}</td>
                                                    <td className="border border-gray-600 p-2 text-right">{formatCurrency(bkpPajakData?.data?.saldo_akhir || 0)}</td>
                                                </tr>
                                            </tbody>
                                        </table>

                                        {/* Signatures */}
                                        <div className="mt-16 flex justify-between px-8 text-center text-sm text-gray-900 dark:text-gray-100">
                                            <div>
                                                <p className="mb-24">Mengetahui,<br />Kepala Sekolah</p>
                                                <p className="font-bold underline uppercase underline-offset-2">
                                                    {bkpPajakData?.data?.kepala_sekolah || '.........................'}
                                                </p>
                                                <p>NIP. {bkpPajakData?.data?.nip_kepala_sekolah || '.........................'}</p>
                                            </div>
                                            <div>
                                                <p className="mb-24">
                                                    {bkpPajakData?.data?.sekolah?.kecamatan || '................'}, {bkpPajakData?.data?.tanggal_penutupan || '...'}
                                                    <br />Bendahara,
                                                </p>
                                                <p className="font-bold underline uppercase underline-offset-2">
                                                    {bkpPajakData?.data?.bendahara || '.........................'}
                                                </p>
                                                <p>NIP. {bkpPajakData?.data?.nip_bendahara || '.........................'}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                        {activeTab === 'rob' && (
                            <div className="space-y-6">
                                {/* Header Section */}
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-700">
                                    <div className="w-full md:w-64 mb-4 md:mb-0">
                                        <select
                                            value={bulanRob.toLowerCase()}
                                            onChange={(e) => setBulanRob(e.target.value)}
                                            className="border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 px-3 py-2 text-gray-700 dark:text-gray-300 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent capitalize"
                                        >
                                            {monthList.map((m) => (
                                                <option key={m} value={m}>
                                                    {m.charAt(0).toUpperCase() + m.slice(1)}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 uppercase hidden md:block">
                                            BUKU PEMBANTU RINCIAN OBJEK BELANJA - {bulanRob.toUpperCase()} {tahun}
                                        </h3>
                                        <button
                                            onClick={() => setShowPrintBkpRobModal(true)}
                                            className="inline-flex items-center px-4 py-2 bg-gray-800 dark:bg-gray-200 border border-transparent rounded-md font-semibold text-xs text-white dark:text-gray-800 uppercase tracking-widest hover:bg-gray-700 dark:hover:bg-white focus:bg-gray-700 dark:focus:bg-white active:bg-gray-900 dark:active:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition ease-in-out duration-150"
                                        >
                                            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                            </svg>
                                            CETAK BKP ROB
                                        </button>
                                    </div>
                                </div>
                                <PrintSettingsModal
                                    show={showPrintBkpRobModal}
                                    onClose={() => setShowPrintBkpRobModal(false)}
                                    onPrint={handlePrintBkpRob}
                                    title="Cetak BKP ROB"
                                    includePeriodFilters={true}
                                    initialPeriod={bulanRob}
                                />


                                {/* School Info Header */}
                                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 text-sm">
                                    <div className="grid grid-cols-[150px_1fr] gap-2">
                                        <div className="font-semibold text-gray-600 dark:text-gray-400">NPSN</div>
                                        <div className="text-gray-900 dark:text-gray-100">: {bkpRobData?.data?.sekolah?.npsn || '-'}</div>
                                        <div className="font-semibold text-gray-600 dark:text-gray-400">Nama Sekolah</div>
                                        <div className="text-gray-900 dark:text-gray-100">: {bkpRobData?.data?.sekolah?.nama_sekolah || '-'}</div>
                                        <div className="font-semibold text-gray-600 dark:text-gray-400">Desa / Kelurahan</div>
                                        <div className="text-gray-900 dark:text-gray-100">: {bkpRobData?.data?.sekolah?.kelurahan_desa || '-'}</div>
                                        <div className="font-semibold text-gray-600 dark:text-gray-400">Kecamatan</div>
                                        <div className="text-gray-900 dark:text-gray-100">: {bkpRobData?.data?.sekolah?.kecamatan || '-'}</div>
                                        <div className="font-semibold text-gray-600 dark:text-gray-400">Kabupaten</div>
                                        <div className="text-gray-900 dark:text-gray-100">: {bkpRobData?.data?.sekolah?.kabupaten_kota || '-'}</div>
                                        <div className="font-semibold text-gray-600 dark:text-gray-400">Provinsi</div>
                                        <div className="text-gray-900 dark:text-gray-100">: {bkpRobData?.data?.sekolah?.provinsi || '-'}</div>
                                        <div className="font-semibold text-gray-600 dark:text-gray-400">Anggaran Belanja</div>
                                        <div className="text-gray-900 dark:text-gray-100 font-bold">: {formatCurrency(bkpRobData?.data?.saldo_awal || 0)}</div>
                                    </div>
                                </div>

                                {/* Table Section */}
                                <div className="overflow-x-auto rounded-lg shadow ring-1 ring-black ring-opacity-5">
                                    <table className="min-w-full divide-y divide-gray-300 dark:divide-gray-600 border-collapse">
                                        <thead className="bg-gray-800 dark:bg-gray-900 text-white leading-normal">
                                            <tr>
                                                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider border border-gray-600">Tanggal</th>
                                                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider border border-gray-600">No Bukti</th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider border border-gray-600 min-w-[300px]">Uraian</th>
                                                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider border border-gray-600">Realisasi</th>
                                                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider border border-gray-600">Jumlah</th>
                                                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider border border-gray-600">Sisa Anggaran</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800 text-sm">
                                            {isLoading ? (
                                                <tr>
                                                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500">Memuat data...</td>
                                                </tr>
                                            ) : bkpRobData?.rob_data && Object.keys(bkpRobData.rob_data).length > 0 ? (
                                                Object.values(bkpRobData.rob_data).map((group: any, groupIndex: number) => (
                                                    <React.Fragment key={groupIndex}>
                                                        {/* Group Header */}
                                                        <tr className="bg-blue-50 dark:bg-blue-900/20">
                                                            <td colSpan={6} className="px-4 py-2 font-bold text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600">
                                                                {group.kode} - {group.nama_rekening}
                                                            </td>
                                                        </tr>
                                                        {/* Transactions */}
                                                        {group.transaksi.map((item: any, idx: number) => (
                                                            <tr key={`${groupIndex}-${idx}`} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                                                <td className="px-4 py-2 text-center text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600">
                                                                    {item.tanggal}
                                                                </td>
                                                                <td className="px-4 py-2 text-left text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 text-xs">
                                                                    {item.no_bukti}
                                                                </td>
                                                                <td className="px-4 py-2 text-left text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600">
                                                                    {item.uraian}
                                                                </td>
                                                                <td className="px-4 py-2 text-right text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600">
                                                                    {formatCurrency(item.realisasi)}
                                                                </td>
                                                                <td className="px-4 py-2 text-right text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600">
                                                                    {formatCurrency(item.jumlah)}
                                                                </td>
                                                                <td className="px-4 py-2 text-right text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600">
                                                                    {formatCurrency(item.sisa_anggaran)}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </React.Fragment>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500 italic">Tidak ada rincian belanja bulan ini</td>
                                                </tr>
                                            )}

                                            {/* Footer Totals */}
                                            <tr className="bg-gray-100 dark:bg-gray-700 font-bold text-gray-900 dark:text-gray-100">
                                                <td colSpan={3} className="px-4 py-3 text-center uppercase border border-gray-300 dark:border-gray-600">Jumlah</td>
                                                <td className="px-4 py-3 text-right border border-gray-300 dark:border-gray-600">
                                                    {formatCurrency(bkpRobData?.data?.total_realisasi || 0)}
                                                </td>
                                                <td className="px-4 py-3 text-right border border-gray-300 dark:border-gray-600">
                                                    {formatCurrency(bkpRobData?.data?.total_realisasi || 0)}
                                                </td>
                                                <td className="px-4 py-3 text-right border border-gray-300 dark:border-gray-600">
                                                    {formatCurrency(bkpRobData?.data?.sisa_anggaran || 0)}
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>

                                {/* Signatures */}
                                <div className="mt-12 flex justify-between text-center px-12 bg-white dark:bg-gray-800 p-8 rounded-lg">
                                    <div className="flex flex-col items-center">
                                        <p className="mb-20">Mengetahui,<br />Kepala Sekolah</p>
                                        <p className="font-bold uppercase underline">{bkpRobData?.data?.kepala_sekolah || 'Nama Kepala Sekolah'}</p>
                                        <p>NIP. {bkpRobData?.data?.nip_kepala_sekolah || '.......................'}</p>
                                    </div>
                                    <div className="flex flex-col items-center">
                                        <p className="mb-20">
                                            {(() => {
                                                const kecamatan = bkpRobData?.data?.sekolah?.kecamatan || '...';

                                                const dateStr = bkpRobData?.data?.tanggal_penutupan || '...';

                                                return `Kec. ${kecamatan}, ${dateStr}`;
                                            })()}
                                            <br />Bendahara
                                        </p>
                                        <p className="font-bold uppercase underline">{bkpRobData?.data?.bendahara || 'Nama Bendahara'}</p>
                                        <p>NIP. {bkpRobData?.data?.nip_bendahara || '.......................'}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'reg' && (
                            <div className="mt-6 flex flex-col gap-6 animate-fade-in-up">
                                {/* Header Controls */}
                                <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                                    <div className="flex items-center gap-4">
                                        <label htmlFor="bulanReg" className="text-sm font-medium text-gray-700 dark:text-gray-300">Pilih Bulan:</label>
                                        <select
                                            id="bulanReg"
                                            value={bulanReg}
                                            onChange={(e) => setBulanReg(e.target.value)}
                                            className="block w-40 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                        >
                                            {monthList.map((m) => (
                                                <option key={m} value={m} className="capitalize">{m.charAt(0).toUpperCase() + m.slice(1)}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setShowPrintBkpRegModal(true)}
                                            className="inline-flex items-center px-4 py-2 bg-indigo-600 border border-transparent rounded-md font-semibold text-xs text-white uppercase tracking-widest hover:bg-indigo-700 focus:bg-indigo-700 active:bg-indigo-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition ease-in-out duration-150"
                                        >
                                            CETAK REGISTER BKP
                                        </button>
                                    </div>
                                </div>
                                <PrintSettingsModal
                                    show={showPrintBkpRegModal}
                                    onClose={() => setShowPrintBkpRegModal(false)}
                                    onPrint={handlePrintBkpReg}
                                    title="Cetak Register BKP"
                                    includePeriodFilters={true}
                                    initialPeriod={bulanReg}
                                />

                                {/* Report Header */}
                                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                                    <div className="text-center mb-6 border-b pb-4 border-gray-200 dark:border-gray-700">
                                        <h2 className="text-xl font-bold text-gray-900 dark:text-white uppercase tracking-wide">Formulir BOS-K7B</h2>
                                        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 uppercase mt-1">REGISTER PENUTUPAN KAS</h3>
                                    </div>

                                    {isLoading ? (
                                        <div className="text-center py-10 text-gray-500">Memuat data...</div>
                                    ) : (
                                        <div className="space-y-6">
                                            {/* Basic Info */}
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700 dark:text-gray-300">
                                                <div className="flex gap-2"><span className="w-48 font-semibold">Tanggal Penutupan Kas</span><span>: {bkpRegData?.data?.tanggalPenutupan}</span></div>
                                                <div className="flex gap-2"><span className="w-48 font-semibold">Nama Penutup Kas</span><span>: {bkpRegData?.data?.namaBendahara}</span></div>
                                                <div className="flex gap-2"><span className="w-48 font-semibold">Tanggal Penutupan Kas Yang Lalu</span><span>: {bkpRegData?.data?.tanggalPenutupanLalu}</span></div>
                                            </div>

                                            {/* Summary */}
                                            <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-md space-y-2 text-sm text-gray-900 dark:text-gray-100">
                                                <div className="flex justify-between md:justify-start gap-4">
                                                    <span className="w-64 font-semibold">Jumlah Total Penerimaan (D)</span>
                                                    <span className="font-mono font-bold">: {formatCurrency(bkpRegData?.data?.totalPenerimaan)}</span>
                                                </div>
                                                <div className="flex justify-between md:justify-start gap-4">
                                                    <span className="w-64 font-semibold">Jumlah Total Pengeluaran (K)</span>
                                                    <span className="font-mono font-bold">: {formatCurrency(bkpRegData?.data?.totalPengeluaran)}</span>
                                                </div>
                                                <div className="flex justify-between md:justify-start gap-4 border-t pt-2 border-gray-300 dark:border-gray-600">
                                                    <span className="w-64 font-bold pl-8">Saldo Buku (A = D - K)</span>
                                                    <span className="font-mono font-bold text-blue-600 dark:text-blue-400">: {formatCurrency(bkpRegData?.data?.saldoBuku)}</span>
                                                </div>
                                                <div className="flex justify-between md:justify-start gap-4 border-t pt-2 border-gray-300 dark:border-gray-600">
                                                    <span className="w-64 font-bold pl-8">Saldo Kas (B)</span>
                                                    <span className="font-mono font-bold text-green-600 dark:text-green-400">: {formatCurrency(bkpRegData?.data?.saldoKas)}</span>
                                                </div>
                                            </div>

                                            <div className="space-y-4">
                                                <h4 className="font-bold text-gray-900 dark:text-white">Saldo Kas B terdiri dari :</h4>

                                                {/* 1. Uang Kertas */}
                                                <div>
                                                    <h5 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">1. Lembaran uang kertas</h5>
                                                    <div className="overflow-x-auto">
                                                        <table className="min-w-full text-sm">
                                                            <tbody>
                                                                {bkpRegData?.data?.uangKertas?.map((item: any, idx: number) => (
                                                                    <tr key={idx} className="border-b border-gray-100 dark:border-gray-800">
                                                                        <td className="py-1 px-4 text-gray-600 dark:text-gray-400">Lembaran uang kertas</td>
                                                                        <td className="py-1 px-4 text-right font-mono">Rp. {item.denominasi.toLocaleString('id-ID')}</td>
                                                                        <td className="py-1 px-4 text-center font-mono">{item.lembar}</td>
                                                                        <td className="py-1 px-4 text-gray-600 dark:text-gray-400">Lembar</td>
                                                                        <td className="py-1 px-4 text-right font-mono">Rp. {item.jumlah.toLocaleString('id-ID')}</td>
                                                                    </tr>
                                                                ))}
                                                                <tr className="font-bold bg-gray-50 dark:bg-gray-700/30">
                                                                    <td colSpan={4} className="py-2 px-4 text-right">Sub Jumlah (1)</td>
                                                                    <td className="py-2 px-4 text-right font-mono">Rp. {bkpRegData?.data?.totalUangKertas?.toLocaleString('id-ID')}</td>
                                                                </tr>
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>

                                                {/* 2. Uang Logam */}
                                                <div>
                                                    <h5 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">2. Keping uang logam</h5>
                                                    <div className="overflow-x-auto">
                                                        <table className="min-w-full text-sm">
                                                            <tbody>
                                                                {bkpRegData?.data?.uangLogam?.map((item: any, idx: number) => (
                                                                    <tr key={idx} className="border-b border-gray-100 dark:border-gray-800">
                                                                        <td className="py-1 px-4 text-gray-600 dark:text-gray-400">Keping uang logam</td>
                                                                        <td className="py-1 px-4 text-right font-mono">Rp. {item.denominasi.toLocaleString('id-ID')}</td>
                                                                        <td className="py-1 px-4 text-center font-mono">{item.keping}</td>
                                                                        <td className="py-1 px-4 text-gray-600 dark:text-gray-400">Keping</td>
                                                                        <td className="py-1 px-4 text-right font-mono">Rp. {item.jumlah.toLocaleString('id-ID')}</td>
                                                                    </tr>
                                                                ))}
                                                                <tr className="font-bold bg-gray-50 dark:bg-gray-700/30">
                                                                    <td colSpan={4} className="py-2 px-4 text-right">Sub Jumlah (2)</td>
                                                                    <td className="py-2 px-4 text-right font-mono">Rp. {bkpRegData?.data?.totalUangLogam?.toLocaleString('id-ID')}</td>
                                                                </tr>
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>

                                                {/* 3. Saldo Bank */}
                                                <div>
                                                    <h5 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">3. Saldo Bank, Surat Berharga, dll</h5>
                                                    <div className="overflow-x-auto">
                                                        <table className="min-w-full text-sm">
                                                            <tbody>
                                                                <tr className="font-bold bg-gray-50 dark:bg-gray-700/30">
                                                                    <td className="py-2 px-4 text-right w-full">Sub Jumlah (3)</td>
                                                                    <td className="py-2 px-4 text-right font-mono min-w-[150px]">Rp. {bkpRegData?.data?.saldoBank?.toLocaleString('id-ID')}</td>
                                                                </tr>
                                                                <tr className="font-bold text-base bg-blue-50 dark:bg-blue-900/20 border-t-2 border-gray-300 dark:border-gray-600">
                                                                    <td className="py-3 px-4 text-right">Jumlah (1 + 2 + 3)</td>
                                                                    <td className="py-3 px-4 text-right font-mono">Rp. {bkpRegData?.data?.saldoAkhirBuku?.toLocaleString('id-ID')}</td>
                                                                </tr>
                                                                <tr className="font-bold text-base bg-red-50 dark:bg-red-900/20 border-t-2 border-red-200 dark:border-red-800">
                                                                    <td className="py-3 px-4 text-right text-red-600 dark:text-red-400">Perbedaan (A-B)</td>
                                                                    <td className="py-3 px-4 text-right font-mono text-red-600 dark:text-red-400">Rp. {bkpRegData?.data?.perbedaan?.toLocaleString('id-ID')}</td>
                                                                </tr>
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>

                                                {/* Penjelasan Perbedaan */}
                                                <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800 rounded-md">
                                                    <p className="font-bold text-gray-800 dark:text-gray-200 mb-1">Penjelasan Perbedaan :</p>
                                                    <p className="text-sm italic text-gray-600 dark:text-gray-400">{bkpRegData?.data?.penjelasanPerbedaan}</p>
                                                </div>

                                                {/* Signatures */}
                                                <div className="mt-12 grid grid-cols-2 gap-8 text-center text-gray-900 dark:text-gray-100">
                                                    <div>
                                                        <p>Yang diperiksa,</p>
                                                        <div className="h-24"></div>
                                                        <p className="font-bold underline decoration-1 underline-offset-4">{bkpRegData?.data?.namaKepalaSekolah}</p>
                                                        <p>NIP. {bkpRegData?.data?.nipKepalaSekolah}</p>
                                                    </div>
                                                    <div>
                                                        <p>{bkpRegData?.data?.kecamatan || '.....................'}, {bkpRegData?.data?.tanggalPenutupan}</p>
                                                        <p>Yang Memeriksa,</p>
                                                        <div className="h-24"></div>
                                                        <p className="font-bold underline decoration-1 underline-offset-4">{bkpRegData?.data?.namaBendahara}</p>
                                                        <p>NIP. {bkpRegData?.data?.nipBendahara}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {activeTab === 'ba' && (
                            <div className="mt-6 flex flex-col gap-6 animate-fade-in-up">
                                {/* Header Controls */}
                                <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                                    <div className="flex items-center gap-4">
                                        <label htmlFor="bulanBa" className="text-sm font-medium text-gray-700 dark:text-gray-300">Pilih Bulan:</label>
                                        <select
                                            id="bulanBa"
                                            value={bulanBa}
                                            onChange={(e) => setBulanBa(e.target.value)}
                                            className="block w-40 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                        >
                                            {monthList.map((m) => (
                                                <option key={m} value={m} className="capitalize">{m.charAt(0).toUpperCase() + m.slice(1)}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setShowPrintBkpBaModal(true)}
                                            className="inline-flex items-center px-4 py-2 bg-indigo-600 border border-transparent rounded-md font-semibold text-xs text-white uppercase tracking-widest hover:bg-indigo-700 focus:bg-indigo-700 active:bg-indigo-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition ease-in-out duration-150"
                                        >
                                            CETAK BERITA ACARA
                                        </button>
                                    </div>
                                </div>
                                <PrintSettingsModal
                                    show={showPrintBkpBaModal}
                                    onClose={() => setShowPrintBkpBaModal(false)}
                                    onPrint={handlePrintBa}
                                    title="Cetak Berita Acara"
                                    includePeriodFilters={true}
                                    initialPeriod={bulanBa}
                                />

                                {/* Report Content */}
                                <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                                    {isLoading ? (
                                        <div className="text-center py-10 text-gray-500">Memuat data...</div>
                                    ) : (
                                        <div className="max-w-4xl mx-auto space-y-6 text-gray-900 dark:text-gray-100 font-serif leading-relaxed">
                                            <div className="text-center mb-8">
                                                <h2 className="text-lg font-bold uppercase underline underline-offset-4">BERITA ACARA PEMERIKSAAN KAS</h2>
                                            </div>

                                            <div className="text-justify">
                                                <p>
                                                    Pada hari ini, {bkpBaData?.data?.namaHariAkhirBulan} tanggal {bkpBaData?.data?.tanggalPemeriksaan} yang bertanda tangan di bawah ini, kami Kepala Sekolah yang ditunjuk berdasarkan Surat Keputusan No. {bkpBaData?.data?.skKepsek} Tanggal {bkpBaData?.data?.tanggalSkKepsek}
                                                </p>
                                            </div>

                                            <div className="pl-8 grid grid-cols-[100px_1fr] gap-x-2">
                                                <span>Nama</span>
                                                <span className="font-bold">: {bkpBaData?.data?.namaKepalaSekolah}</span>
                                                <span>Jabatan</span>
                                                <span>: Kepala Sekolah</span>
                                            </div>

                                            <p>Melakukan pemeriksaan kas kepada :</p>

                                            <div className="pl-8 grid grid-cols-[100px_1fr] gap-x-2">
                                                <span>Nama</span>
                                                <span className="font-bold">: {bkpBaData?.data?.namaBendahara}</span>
                                                <span>Jabatan</span>
                                                <span>: Bendahara BOS</span>
                                            </div>

                                            <div className="text-justify">
                                                <p>
                                                    Yang berdasarkan Surat Keputusan Nomor : {bkpBaData?.data?.skBendahara} Tanggal {bkpBaData?.data?.tanggalSkBendahara} ditugaskan dengan pengurusan uang Bantuan Operasional Sekolah (BOS).
                                                </p>
                                                <p className="mt-4">
                                                    Berdasarkan pemeriksaan kas serta bukti-bukti dalam pengurusan itu, kami menemui kenyataan sebagai berikut :
                                                </p>
                                                <p className="mt-2">
                                                    Jumlah uang yang dihitung di hadapan Bendahara / Pemegang Kas adalah :
                                                </p>
                                            </div>

                                            <div className="pl-4 space-y-2">
                                                <div className="flex justify-between max-w-lg">
                                                    <span className="pl-4">a) Uang kertas bank, uang logam</span>
                                                    <span className="font-mono">: Rp. {bkpBaData?.data?.totalUangKertasLogam?.toLocaleString('id-ID')}</span>
                                                </div>
                                                <div className="flex justify-between max-w-lg">
                                                    <span className="pl-4">b) Saldo Bank</span>
                                                    <span className="font-mono">: Rp. {bkpBaData?.data?.saldoBank?.toLocaleString('id-ID')}</span>
                                                </div>
                                                <div className="flex justify-between max-w-lg">
                                                    <span className="pl-4">c) Surat Berharga dll</span>
                                                    <span className="font-mono">: Rp. -</span>
                                                </div>
                                                <div className="flex justify-between max-w-lg font-bold">
                                                    <span>Jumlah</span>
                                                    <span className="font-mono">: Rp. {bkpBaData?.data?.totalKas?.toLocaleString('id-ID')}</span>
                                                </div>
                                                <div className="flex justify-between max-w-lg">
                                                    <span>Saldo uang menurut Buku Kas Umum</span>
                                                    <span className="font-mono">: Rp. {bkpBaData?.data?.saldoBuku?.toLocaleString('id-ID')}</span>
                                                </div>
                                                <div className="flex justify-between max-w-lg font-bold">
                                                    <span>Perbedaan antara Saldo Kas dan Saldo buku</span>
                                                    <span className="font-mono">: Rp. {Math.abs(bkpBaData?.data?.perbedaan || 0).toLocaleString('id-ID')}</span>
                                                </div>
                                            </div>

                                            {/* Signatures */}
                                            <div className="mt-16 pt-8">
                                                <div className="text-center mb-4 text-right">
                                                    <p>{bkpBaData?.data?.namaKecamatan}, {bkpBaData?.data?.tanggalPemeriksaan}</p>
                                                </div>
                                                <div className="flex justify-between text-center px-4">
                                                    <div>
                                                        <p className="mb-24">Bendahara BOSP</p>
                                                        <p className="font-bold underline decoration-1 underline-offset-4">{bkpBaData?.data?.namaBendahara}</p>
                                                        <p>NIP. {bkpBaData?.data?.nipBendahara}</p>
                                                    </div>
                                                    <div>
                                                        <p className="mb-24">Kepala Sekolah</p>
                                                        <p className="font-bold underline decoration-1 underline-offset-4">{bkpBaData?.data?.namaKepalaSekolah}</p>
                                                        <p>NIP. {bkpBaData?.data?.nipKepalaSekolah}</p>
                                                    </div>
                                                </div>
                                            </div>

                                        </div>
                                    )}
                                </div>
                            </div>
                        )}


                        {activeTab === 'realisasi' && (
                            <div className="mt-6 flex flex-col gap-6 animate-fade-in-up">
                                {/* Header Controls */}
                                <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                                    <div className="flex flex-col md:flex-row items-center gap-4">
                                        <div className="flex items-center gap-2">
                                            <label htmlFor="jenisLaporanRealisasi" className="text-sm font-medium text-gray-700 dark:text-gray-300">Jenis:</label>
                                            <select
                                                id="jenisLaporanRealisasi"
                                                value={jenisLaporanRealisasi}
                                                onChange={(e) => {
                                                    const newJenis = e.target.value;
                                                    setJenisLaporanRealisasi(newJenis);
                                                    if (newJenis === 'bulanan') {
                                                        setPeriodeRealisasi(bulan); // Default to current selected month or 'januari'
                                                    } else if (newJenis === 'tahap') {
                                                        setPeriodeRealisasi('Tahap 1');
                                                    } else {
                                                        setPeriodeRealisasi(''); // Tahunan usually ignores periode, or set to a placeholder
                                                    }
                                                }}
                                                className="block w-40 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                            >
                                                <option value="bulanan">Bulanan</option>
                                                <option value="tahap">Tahap</option>
                                                <option value="tahunan">Tahunan</option>
                                            </select>
                                        </div>

                                        {jenisLaporanRealisasi === 'bulanan' && (
                                            <div className="flex items-center gap-2">
                                                <label htmlFor="periodeRealisasi" className="text-sm font-medium text-gray-700 dark:text-gray-300">Bulan:</label>
                                                <select
                                                    id="periodeRealisasi"
                                                    value={periodeRealisasi}
                                                    onChange={(e) => setPeriodeRealisasi(e.target.value)}
                                                    className="block w-40 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                                >
                                                    {monthList.map((m) => (
                                                        <option key={m} value={m} className="capitalize">{m.charAt(0).toUpperCase() + m.slice(1)}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}

                                        {jenisLaporanRealisasi === 'tahap' && (
                                            <div className="flex items-center gap-2">
                                                <label htmlFor="periodeRealisasi" className="text-sm font-medium text-gray-700 dark:text-gray-300">Tahap:</label>
                                                <select
                                                    id="periodeRealisasi"
                                                    value={periodeRealisasi}
                                                    onChange={(e) => setPeriodeRealisasi(e.target.value)}
                                                    className="block w-40 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                                >
                                                    <option value="Tahap 1">Tahap 1</option>
                                                    <option value="Tahap 2">Tahap 2</option>
                                                </select>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setShowPrintRealisasiModal(true)}
                                            className="inline-flex items-center px-4 py-2 bg-indigo-600 border border-transparent rounded-md font-semibold text-xs text-white uppercase tracking-widest hover:bg-indigo-700 focus:bg-indigo-700 active:bg-indigo-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition ease-in-out duration-150"
                                        >
                                            CETAK REALISASI
                                        </button>
                                    </div>
                                </div>
                                <PrintSettingsModal
                                    show={showPrintRealisasiModal}
                                    onClose={() => setShowPrintRealisasiModal(false)}
                                    onPrint={handlePrintRealisasi}
                                    title="Cetak Realisasi BOSP"
                                    includePeriodFilters={true}
                                    initialPeriod={periodeRealisasi}
                                />

                                {/* Report Content */}
                                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-x-auto">
                                    {isLoading ? (
                                        <div className="text-center py-10 text-gray-500">Memuat data...</div>
                                    ) : (
                                        <div className="min-w-[1200px]">
                                            <div className="text-center mb-6">
                                                <h2 className="text-lg font-bold uppercase">REKAPITULASI REALISASI PENGGUNAAN DANA BOSP</h2>
                                                <p className="text-sm uppercase font-semibold">PERIODE TANGGAL: {realisasiData?.periode_info?.periode_awal} s.d {realisasiData?.periode_info?.periode_akhir}</p>
                                                <p className="text-sm uppercase font-semibold">{realisasiData?.periode_info?.tahap !== 'Tahunan' ? `TAHAP ${realisasiData?.periode_info?.tahap} TAHUN ${tahun}` : `TAHUN ${tahun}`}</p>
                                            </div>

                                            {/* Metadata */}
                                            <div className="grid grid-cols-[200px_1fr] gap-y-1 mb-6 text-sm text-gray-800 dark:text-gray-200">
                                                <div className="font-semibold">NPSN</div>
                                                <div>: {realisasiData?.sekolah?.npsn}</div>
                                                <div className="font-semibold">Nama Sekolah</div>
                                                <div>: {realisasiData?.sekolah?.nama_sekolah}</div>
                                                <div className="font-semibold">Kecamatan</div>
                                                <div>: {realisasiData?.sekolah?.kecamatan}</div>
                                                <div className="font-semibold">Kabupaten/Kota</div>
                                                <div>: {realisasiData?.sekolah?.kabupaten_kota}</div>
                                                <div className="font-semibold">Provinsi</div>
                                                <div>: {realisasiData?.sekolah?.provinsi}</div>
                                                <div className="font-semibold">Sumber Dana</div>
                                                <div>: BOS Reguler</div>
                                            </div>

                                            {/* Table */}
                                            <table className="w-full border-collapse border border-gray-400 text-xs">
                                                <thead>
                                                    <tr className="bg-gray-100 dark:bg-gray-700">
                                                        <th rowSpan={3} className="border border-gray-400 p-2">No Urut</th>
                                                        <th rowSpan={3} className="border border-gray-400 p-2 w-64">8 STANDAR</th>
                                                        <th colSpan={11} className="border border-gray-400 p-2">SUB PROGRAM</th>
                                                        <th rowSpan={3} className="border border-gray-400 p-2">Jumlah</th>
                                                    </tr>
                                                    <tr className="bg-gray-50 dark:bg-gray-800">
                                                        <th className="border border-gray-400 p-1 w-20">Penerimaan Peserta Didik Baru</th>
                                                        <th className="border border-gray-400 p-1 w-20">Pengembangan Perpustakaan</th>
                                                        <th className="border border-gray-400 p-1 w-20">Pelaksanaan Kegiatan Pembelajaran dan Ekstrakurikuler</th>
                                                        <th className="border border-gray-400 p-1 w-20">Pelaksanaan Kegiatan Asesmen/Evaluasi Pembelajaran</th>
                                                        <th className="border border-gray-400 p-1 w-20">Pelaksanaan Administrasi Kegiatan Sekolah</th>
                                                        <th className="border border-gray-400 p-1 w-20">Pengembangan Profesi Pendidik dan Tenaga Kependidikan</th>
                                                        <th className="border border-gray-400 p-1 w-20">Pembiayaan Langganan Daya dan Jasa</th>
                                                        <th className="border border-gray-400 p-1 w-20">Pemeliharaan Sarana dan Prasarana Sekolah</th>
                                                        <th className="border border-gray-400 p-1 w-20">Penyediaan Alat Multi Media Pembelajaran</th>
                                                        <th className="border border-gray-400 p-1 w-20">Penyelenggaraan Bursa Kerja Khusus, dll</th>
                                                        <th className="border border-gray-400 p-1 w-20">Pembayaran Honor</th>
                                                    </tr>
                                                    <tr className="bg-gray-100 dark:bg-gray-700 text-center">
                                                        <th className="border border-gray-400 p-1">1</th>
                                                        <th className="border border-gray-400 p-1">2</th>
                                                        <th className="border border-gray-400 p-1">3</th>
                                                        <th className="border border-gray-400 p-1">4</th>
                                                        <th className="border border-gray-400 p-1">5</th>
                                                        <th className="border border-gray-400 p-1">6</th>
                                                        <th className="border border-gray-400 p-1">7</th>
                                                        <th className="border border-gray-400 p-1">8</th>
                                                        <th className="border border-gray-400 p-1">9</th>
                                                        <th className="border border-gray-400 p-1">10</th>
                                                        <th className="border border-gray-400 p-1">11</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {(realisasiData?.realisasi_data || []).map((row: any) => (
                                                        <tr key={row.no_urut} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                                                            <td className="border border-gray-400 p-2 text-center">{row.no_urut}</td>
                                                            <td className="border border-gray-400 p-2">{row.program_kegiatan}</td>
                                                            {/* Columns 1-11 */}
                                                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((colId) => (
                                                                <td key={colId} className="border border-gray-400 p-2 text-right">
                                                                    {row.realisasi_komponen[colId] > 0 ? formatCurrency(row.realisasi_komponen[colId]).replace('Rp', '') : '-'}
                                                                </td>
                                                            ))}
                                                            <td className="border border-gray-400 p-2 text-right font-bold">
                                                                {row.total_kegiatan > 0 ? formatCurrency(row.total_kegiatan).replace('Rp', '') : '-'}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                    <tr className="bg-blue-50 dark:bg-blue-900/20 font-bold">
                                                        <td colSpan={2} className="border border-gray-400 p-2 text-center">JUMLAH</td>
                                                        {/* Total Columns 1-11 */}
                                                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((colId) => (
                                                            <td key={colId} className="border border-gray-400 p-2 text-right">
                                                                {realisasiData?.realisasi_per_komponen && realisasiData.realisasi_per_komponen[colId] > 0 ? formatCurrency(realisasiData.realisasi_per_komponen[colId]).replace('Rp', '') : '-'}
                                                            </td>
                                                        ))}
                                                        <td className="border border-gray-400 p-2 text-right">
                                                            {realisasiData?.total_realisasi > 0 ? formatCurrency(realisasiData?.total_realisasi).replace('Rp', '') : '-'}
                                                        </td>
                                                    </tr>
                                                </tbody>
                                            </table>

                                            {/* Summary Table */}
                                            <div className="mt-6 border border-gray-400 text-sm">
                                                <div className="grid grid-cols-[1fr_auto_200px] border-b border-gray-400 p-2">
                                                    <div>Saldo periode sebelumnya</div>
                                                    <div className="px-2">:</div>
                                                    <div className="text-right">{formatCurrency(realisasiData?.ringkasan_keuangan?.saldo_periode_sebelumnya || 0)}</div>
                                                </div>
                                                <div className="grid grid-cols-[1fr_auto_200px] border-b border-gray-400 p-2">
                                                    <div>Total penerimaan dana BOSP periode ini</div>
                                                    <div className="px-2">:</div>
                                                    <div className="text-right">{formatCurrency(realisasiData?.ringkasan_keuangan?.total_penerimaan_periode_ini || 0)}</div>
                                                </div>
                                                <div className="grid grid-cols-[1fr_auto_200px] border-b border-gray-400 p-2">
                                                    <div>Total penggunaan dana BOSP periode ini</div>
                                                    <div className="px-2">:</div>
                                                    <div className="text-right">{formatCurrency(realisasiData?.ringkasan_keuangan?.total_penggunaan_periode_ini || 0)}</div>
                                                </div>
                                                <div className="grid grid-cols-[1fr_auto_200px] p-2 font-bold bg-gray-50 dark:bg-gray-800">
                                                    <div>Akhir saldo BOSP periode ini</div>
                                                    <div className="px-2">:</div>
                                                    <div className="text-right">{formatCurrency(realisasiData?.ringkasan_keuangan?.akhir_saldo_periode_ini || 0)}</div>
                                                </div>
                                            </div>

                                            {/* Signatures */}
                                            <div className="mt-12 flex justify-between px-12 text-center text-sm">
                                                <div>
                                                    <p className="mb-20">Menyetujui,<br />Kepala Sekolah</p>
                                                    <p className="font-bold underline uppercase">{realisasiData?.penganggaran?.kepala_sekolah}</p>
                                                    <p>NIP. {realisasiData?.penganggaran?.nip_kepala_sekolah}</p>
                                                </div>
                                                <div>
                                                    <p className="mb-20">Bendahara / Penanggungjawab Kegiatan</p>
                                                    <p className="font-bold underline uppercase">{realisasiData?.penganggaran?.bendahara}</p>
                                                    <p>NIP. {realisasiData?.penganggaran?.nip_bendahara}</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {activeTab === 'bkp_pembantu' && (
                            <div className="space-y-8 animate-fade-in-up">
                                {/* Control Bar */}
                                <div className="flex flex-col md:flex-row justify-between items-center bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                                    <div className="flex items-center gap-4 w-full md:w-auto">
                                        <label htmlFor="bulanPembantu" className="text-sm font-medium text-gray-700 dark:text-gray-300">Pilih Bulan:</label>
                                        <select
                                            id="bulanPembantu"
                                            value={bulanPembantu.toLowerCase()}
                                            onChange={(e) => setBulanPembantu(e.target.value)}
                                            className="border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 px-3 py-2 text-gray-700 dark:text-gray-300 w-full md:w-48 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent capitalize"
                                        >
                                            {monthList.map((m) => (
                                                <option key={m} value={m}>
                                                    {m.charAt(0).toUpperCase() + m.slice(1)}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="mt-4 md:mt-0">
                                        <button
                                            onClick={handleExportExcelBkpTunai}
                                            className="inline-flex items-center px-4 py-2 bg-green-800 dark:bg-green-200 border border-transparent rounded-md font-semibold text-xs text-white dark:text-green-800 uppercase tracking-widest hover:bg-green-700 dark:hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition ease-in-out duration-150 mr-2"
                                        >
                                            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                            </svg>
                                            Export Excel
                                        </button>
                                        <button
                                            onClick={() => setShowPrintBkpTunaiModal(true)}
                                            className="inline-flex items-center px-4 py-2 bg-gray-800 dark:bg-gray-200 border border-transparent rounded-md font-semibold text-xs text-white dark:text-gray-800 uppercase tracking-widest hover:bg-gray-700 dark:hover:bg-white focus:bg-gray-700 dark:focus:bg-white active:bg-gray-900 dark:active:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition ease-in-out duration-150"
                                        >
                                            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                            </svg>
                                            CETAK BKP TUNAI
                                        </button>
                                    </div>
                                </div>

                                <PrintSettingsModal
                                    show={showPrintBkpTunaiModal}
                                    onClose={() => setShowPrintBkpTunaiModal(false)}
                                    onPrint={handlePrintBkpPembantu}
                                    title="Cetak BKP Pembantu Tunai"
                                    includePeriodFilters={true}
                                    initialPeriod={bulanPembantu}
                                />

                                {/* Report Paper */}
                                <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-x-auto">
                                    <div className="min-w-[900px]">
                                        {/* Report Header */}
                                        <div className="text-center mb-8">
                                            <h2 className="text-lg font-bold uppercase underline underline-offset-4 text-gray-900 dark:text-gray-100">BUKU KAS PEMBANTU TUNAI</h2>
                                            <h3 className="text-sm font-bold uppercase mt-1 text-gray-900 dark:text-gray-100">BULAN : {bulanPembantu.toUpperCase()} TAHUN : {tahun}</h3>
                                        </div>

                                        {/* Metadata */}
                                        <div className="grid grid-cols-[150px_10px_1fr] gap-y-1 mb-6 text-sm text-gray-800 dark:text-gray-200 font-medium">
                                            <div>NPSN</div>
                                            <div>:</div>
                                            <div>{bkpPembantuData?.sekolah?.npsn || '-'}</div>

                                            <div>Nama Sekolah</div>
                                            <div>:</div>
                                            <div>{bkpPembantuData?.sekolah?.nama_sekolah || '-'}</div>

                                            <div>Kelurahan / Desa</div>
                                            <div>:</div>
                                            <div>{bkpPembantuData?.sekolah?.kelurahan_desa || '-'}</div>

                                            <div>Kecamatan</div>
                                            <div>:</div>
                                            <div>{bkpPembantuData?.sekolah?.kecamatan || '-'}</div>

                                            <div>Kabupaten / Kota</div>
                                            <div>:</div>
                                            <div>{bkpPembantuData?.sekolah?.kabupaten || '-'}</div>

                                            <div>Provinsi</div>
                                            <div>:</div>
                                            <div>{bkpPembantuData?.sekolah?.provinsi || '-'}</div>

                                            <div>Sumber Dana</div>
                                            <div>:</div>
                                            <div>BOSP Reguler</div>
                                        </div>

                                        {/* Table */}
                                        <table className="w-full border-collapse border border-gray-800 dark:border-gray-500 text-xs sm:text-sm">
                                            <thead>
                                                <tr className="bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white font-bold text-center">
                                                    <th className="border border-gray-600 p-2 w-24">Tanggal</th>
                                                    <th className="border border-gray-600 p-2 w-32">Kode Rekening</th>
                                                    <th className="border border-gray-600 p-2 w-24">No. Bukti</th>
                                                    <th className="border border-gray-600 p-2">Uraian</th>
                                                    <th className="border border-gray-600 p-2 w-32">Penerimaan (Kredit)</th>
                                                    <th className="border border-gray-600 p-2 w-32">Pengeluaran (Debet)</th>
                                                    <th className="border border-gray-600 p-2 w-32">Saldo</th>
                                                </tr>
                                            </thead>
                                            <tbody className="text-gray-900 dark:text-gray-100">
                                                {/* Saldo Kas Tunai Row (Merged with Penarikan Tunai) */}
                                                <tr>
                                                    <td className="border border-gray-600 p-2 text-center">
                                                        01-{(() => {
                                                            const monthMap: { [key: string]: string } = {
                                                                'januari': '01', 'februari': '02', 'maret': '03', 'april': '04',
                                                                'mei': '05', 'juni': '06', 'juli': '07', 'agustus': '08',
                                                                'september': '09', 'oktober': '10', 'november': '11', 'desember': '12'
                                                            };
                                                            return monthMap[bulanPembantu.toLowerCase()] || '01';
                                                        })()}-{tahun}
                                                    </td>
                                                    <td className="border border-gray-600 p-2"></td>
                                                    <td className="border border-gray-600 p-2"></td>
                                                    <td className="border border-gray-600 p-2 font-medium">
                                                        Saldo Kas Tunai
                                                    </td>
                                                    <td className="border border-gray-600 p-2 text-right">
                                                        {(() => {
                                                            const totalPenarikan = Number(bkpPembantuData?.data?.totalPenarikan || 0);
                                                            return totalPenarikan > 0 ? formatCurrency(totalPenarikan) : '0';
                                                        })()}
                                                    </td>
                                                    <td className="border border-gray-600 p-2 text-right">-</td>
                                                    <td className="border border-gray-600 p-2 text-right font-bold">
                                                        {(() => {
                                                            const saldoAwal = Number(bkpPembantuData?.data?.saldoAwalTunai || 0);
                                                            const totalPenarikan = Number(bkpPembantuData?.data?.totalPenarikan || 0);
                                                            return formatCurrency(saldoAwal + totalPenarikan);
                                                        })()}
                                                    </td>
                                                </tr>

                                                {isLoading ? (
                                                    <tr>
                                                        <td colSpan={7} className="border border-gray-600 p-8 text-center text-gray-500">
                                                            Memuat data...
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    (() => {
                                                        const saldoAwal = Number(bkpPembantuData?.data?.saldoAwalTunai || 0);
                                                        const allItems = bkpPembantuData?.items || [];

                                                        // Calculate Total Penarikan from data
                                                        const totalPenarikan = Number(bkpPembantuData?.data?.totalPenarikan || 0);

                                                        // Items already excluded penarikan in controller
                                                        const items = allItems;

                                                        let runningBalance = saldoAwal + totalPenarikan;

                                                        if (items.length === 0) {
                                                            return (
                                                                <tr>
                                                                    <td colSpan={7} className="border border-gray-600 p-8 text-center text-gray-500 italic">
                                                                        Tidak ada transaksi belanja bulan ini
                                                                    </td>
                                                                </tr>
                                                            );
                                                        }

                                                        return items.map((item: any, index: number) => {
                                                            const penerimaan = Number(item.penerimaan || 0);
                                                            const pengeluaran = Number(item.pengeluaran || 0);
                                                            runningBalance = runningBalance + penerimaan - pengeluaran;

                                                            return (
                                                                <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                                                    <td className="border border-gray-600 p-2 text-center whitespace-nowrap">
                                                                        {format(new Date(item.tanggal), 'dd-MM-yyyy')}
                                                                    </td>
                                                                    <td className="border border-gray-600 p-2 text-center text-gray-600">{item.kode_rekening || '-'}</td>
                                                                    <td className="border border-gray-600 p-2 text-center text-gray-600">{item.no_bukti || '-'}</td>
                                                                    <td className="border border-gray-600 p-2">{item.uraian}</td>
                                                                    <td className="border border-gray-600 p-2 text-right">
                                                                        {penerimaan > 0 ? formatCurrency(penerimaan) : '-'}
                                                                    </td>
                                                                    <td className="border border-gray-600 p-2 text-right">
                                                                        {pengeluaran > 0 ? formatCurrency(pengeluaran) : '-'}
                                                                    </td>
                                                                    <td className="border border-gray-600 p-2 text-right font-medium">
                                                                        {formatCurrency(runningBalance)}
                                                                    </td>
                                                                </tr>
                                                            );
                                                        });
                                                    })()
                                                )}

                                                {/* Footer Totals */}
                                                <tr className="bg-gray-100 dark:bg-gray-700 font-bold text-gray-900 dark:text-gray-100">
                                                    <td colSpan={4} className="border border-gray-600 p-2 text-center">Jumlah Penutupan</td>
                                                    <td className="border border-gray-600 p-2 text-right">
                                                        {formatCurrency(bkpPembantuData?.data?.totalPenerimaan || 0)}
                                                    </td>
                                                    <td className="border border-gray-600 p-2 text-right">
                                                        {formatCurrency(bkpPembantuData?.data?.totalPengeluaran || 0)}
                                                    </td>
                                                    <td className="border border-gray-600 p-2 text-right">
                                                        {formatCurrency(bkpPembantuData?.data?.currentSaldo || 0)}
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>

                                        {/* Closing Text */}
                                        <div className="mt-8 text-gray-800 dark:text-gray-200 text-sm">
                                            <p className="mb-2">
                                                {(() => {
                                                    const monthIndex = monthList.indexOf(bulanPembantu.toLowerCase());
                                                    let dateObj;
                                                    if (monthIndex !== -1 && tahun) {
                                                        dateObj = new Date(parseInt(tahun), monthIndex + 1, 0);
                                                    } else {
                                                        dateObj = new Date();
                                                    }
                                                    if (!isValid(dateObj)) dateObj = new Date();

                                                    const hari = format(dateObj, 'EEEE', { locale: id });
                                                    const tanggal = format(dateObj, 'd MMMM yyyy', { locale: id });

                                                    return `Pada hari ini ${hari}, tanggal ${tanggal} Buku Kas Pembantu Tunai ditutup dengan keadaan/posisi sebagai berikut :`;
                                                })()}
                                            </p>
                                            <p className="font-bold">
                                                Saldo Kas Tunai : Rp. {formatCurrency(bkpPembantuData?.data?.currentSaldo || 0)}
                                            </p>
                                        </div>

                                        {/* Signatures */}
                                        <div className="mt-16 flex justify-between px-8 text-center text-sm text-gray-900 dark:text-gray-100">
                                            <div>
                                                <p className="mb-24">Menyetujui,<br />Kepala Sekolah</p>
                                                <p className="font-bold underline uppercase underline-offset-2">
                                                    {bkpPembantuData?.kepala_sekolah?.nama || '.........................'}
                                                </p>
                                                <p>NIP. {bkpPembantuData?.kepala_sekolah?.nip || '.........................'}</p>
                                            </div>
                                            <div>
                                                <p className="mb-24">
                                                    {bkpPembantuData?.sekolah?.kecamatan || '................'}, {(() => {
                                                        const monthIndex = monthList.indexOf(bulanPembantu.toLowerCase());
                                                        let dateObj;
                                                        if (monthIndex !== -1 && tahun) {
                                                            dateObj = new Date(parseInt(tahun), monthIndex + 1, 0);
                                                        } else {
                                                            dateObj = new Date();
                                                        }
                                                        if (!isValid(dateObj)) dateObj = new Date();
                                                        return format(dateObj, 'd MMMM yyyy', { locale: id });
                                                    })()}
                                                    <br />Bendahara,
                                                </p>
                                                <p className="font-bold underline uppercase underline-offset-2">
                                                    {bkpPembantuData?.bendahara?.nama || '.........................'}
                                                </p>
                                                <p>NIP. {bkpPembantuData?.bendahara?.nip || '.........................'}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab !== 'bkp_bank' && activeTab !== 'bkp_pembantu' && activeTab !== 'bkp_umum' && activeTab !== 'bkp_pajak' && activeTab !== 'rob' && activeTab !== 'reg' && activeTab !== 'ba' && activeTab !== 'realisasi' && (
                            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                                <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                </svg>
                                <p>Konten {tabs.find(t => t.id === activeTab)?.label} sedang dikembangkan</p>
                            </div>
                        )}
                    </div>
                </div>
            </div >
        </AuthenticatedLayout >
    );
}
