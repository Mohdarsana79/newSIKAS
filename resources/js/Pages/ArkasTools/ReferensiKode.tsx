import React, { useMemo, useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import TextInput from '@/Components/TextInput';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import Modal from '@/Components/Modal';
import axios from 'axios';
import ArkasYearSelect from '@/Components/Arkas/ArkasYearSelect';
import PageHeader from '@/Components/ui/PageHeader';
import Surface from '@/Components/ui/Surface';
import EmptyState from '@/Components/ui/EmptyState';
import IconTile from '@/Components/ui/IconTile';
import StatusBadge from '@/Components/ui/StatusBadge';
import PillTabs from '@/Components/ui/PillTabs';

interface YearStats {
    kegiatan: number;
    rekening: number;
}

interface ReferensiKodeProps {
    activeYears?: string[];
    defaultYear?: string;
    localStats?: {
        perYear: Record<string, YearStats>;
        satuan?: number;
    };
    yearsWithTransactions?: string[];
}

export default function ReferensiKode({
    activeYears,
    defaultYear,
    localStats,
    yearsWithTransactions = [],
}: ReferensiKodeProps) {
    const fallbackYear = defaultYear || String(new Date().getFullYear());
    const resolvedYears = useMemo(() => {
        const list = activeYears && activeYears.length > 0 ? activeYears : [fallbackYear];
        return list.includes(fallbackYear) ? list : [fallbackYear, ...list];
    }, [activeYears, fallbackYear]);

    const [activeTab, setActiveTab] = useState<'kegiatan' | 'rekening' | 'satuan'>('kegiatan');
    const [selectedYear, setSelectedYear] = useState<string>(fallbackYear);
    const [statsPerYear, setStatsPerYear] = useState<Record<string, YearStats>>(localStats?.perYear ?? {});
    const [satuanCount, setSatuanCount] = useState<number>(localStats?.satuan ?? 0);

    // State for kegiatan
    const [kegiatanData, setKegiatanData] = useState<any[]>([]);
    const [kegiatanLoading, setKegiatanLoading] = useState(false);
    const [kegiatanSyncing, setKegiatanSyncing] = useState(false);
    const [kegiatanError, setKegiatanError] = useState('');
    const [searchKegiatan, setSearchKegiatan] = useState('');

    // State for rekening
    const [rekeningData, setRekeningData] = useState<any[]>([]);
    const [rekeningLoading, setRekeningLoading] = useState(false);
    const [rekeningSyncing, setRekeningSyncing] = useState(false);
    const [rekeningError, setRekeningError] = useState('');
    const [searchRekening, setSearchRekening] = useState('');

    // State for satuan
    const [satuanData, setSatuanData] = useState<any[]>([]);
    const [satuanLoading, setSatuanLoading] = useState(false);
    const [satuanSyncing, setSatuanSyncing] = useState(false);
    const [satuanError, setSatuanError] = useState('');
    const [searchSatuan, setSearchSatuan] = useState('');

    // Modal state for Sync
    const [showSyncModal, setShowSyncModal] = useState(false);
    const [syncProgress, setSyncProgress] = useState(0);
    const [isSyncingConfirm, setIsSyncingConfirm] = useState(false);
    const [syncTipe, setSyncTipe] = useState<'kegiatan' | 'rekening' | 'satuan'>('kegiatan');

    const activeCountMap = useMemo<Record<string, number>>(() => {
        const map: Record<string, number> = {};
        resolvedYears.forEach((yr) => {
            const st = statsPerYear[yr];
            map[yr] = activeTab === 'kegiatan' ? (st?.kegiatan ?? 0) : (st?.rekening ?? 0);
        });
        return map;
    }, [resolvedYears, statsPerYear, activeTab]);

    const selectedYearStats = statsPerYear[selectedYear] ?? { kegiatan: 0, rekening: 0 };
    const selectedYearHasTransactions = yearsWithTransactions.includes(selectedYear);

    const handleYearChange = (newYear: string) => {
        if (newYear === selectedYear) return;
        setSelectedYear(newYear);
        setKegiatanData([]);
        setRekeningData([]);
        setKegiatanError('');
        setRekeningError('');
        setSearchKegiatan('');
        setSearchRekening('');
    };

    const filteredKegiatan = kegiatanData.filter((item: any) =>
        (item.id_kode && item.id_kode.toLowerCase().includes(searchKegiatan.toLowerCase())) ||
        (item.program && item.program.toLowerCase().includes(searchKegiatan.toLowerCase())) ||
        (item.sub_program && item.sub_program.toLowerCase().includes(searchKegiatan.toLowerCase())) ||
        (item.uraian_kode && item.uraian_kode.toLowerCase().includes(searchKegiatan.toLowerCase()))
    );

    const filteredRekening = rekeningData.filter((item: any) =>
        (item.kode_rekening && item.kode_rekening.toLowerCase().includes(searchRekening.toLowerCase())) ||
        (item.rekening && item.rekening.toLowerCase().includes(searchRekening.toLowerCase()))
    );

    const filteredSatuan = satuanData.filter((item: any) =>
        (item.satuan && item.satuan.toLowerCase().includes(searchSatuan.toLowerCase())) ||
        (item.unit && item.unit.toLowerCase().includes(searchSatuan.toLowerCase())) ||
        (item.ref_satuan_id && item.ref_satuan_id.toLowerCase().includes(searchSatuan.toLowerCase()))
    );

    const fetchData = async (tipe: 'kegiatan' | 'rekening' | 'satuan', yearOverride?: string) => {
        const targetYear = yearOverride ?? selectedYear;
        if (tipe === 'kegiatan') {
            setKegiatanLoading(true);
            setKegiatanError('');
        } else if (tipe === 'rekening') {
            setRekeningLoading(true);
            setRekeningError('');
        } else {
            setSatuanLoading(true);
            setSatuanError('');
        }

        try {
            const url =
                tipe === 'satuan'
                    ? `/referensi-kode/fetch?tipe=satuan`
                    : `/referensi-kode/fetch?tipe=${tipe}&year=${encodeURIComponent(targetYear)}`;
            const res = await fetch(url, {
                headers: { Accept: 'application/json' },
            });
            const data = await res.json();

            if (data.status === 'success') {
                if (tipe === 'kegiatan') setKegiatanData(data.data);
                else if (tipe === 'rekening') setRekeningData(data.data);
                else setSatuanData(data.data);
            } else {
                if (tipe === 'kegiatan') setKegiatanError(data.message);
                else if (tipe === 'rekening') setRekeningError(data.message);
                else setSatuanError(data.message);
            }
        } catch (err) {
            if (tipe === 'kegiatan') setKegiatanError('Gagal menghubungi server.');
            else if (tipe === 'rekening') setRekeningError('Gagal menghubungi server.');
            else setSatuanError('Gagal menghubungi server.');
        } finally {
            if (tipe === 'kegiatan') setKegiatanLoading(false);
            else if (tipe === 'rekening') setRekeningLoading(false);
            else setSatuanLoading(false);
        }
    };

    const triggerSync = (tipe: 'kegiatan' | 'rekening' | 'satuan') => {
        setSyncTipe(tipe);
        setShowSyncModal(true);
        setSyncProgress(0);
        setIsSyncingConfirm(false);
    };

    const confirmSync = async () => {
        setIsSyncingConfirm(true);
        const tipe = syncTipe;
        const targetYear = selectedYear;

        if (tipe === 'kegiatan') setKegiatanSyncing(true);
        else if (tipe === 'rekening') setRekeningSyncing(true);
        else setSatuanSyncing(true);

        let currentProgress = 0;
        const interval = setInterval(() => {
            currentProgress += 1;
            if (currentProgress >= 95) currentProgress = 95;
            setSyncProgress(currentProgress);
        }, 50);

        try {
            const payload = tipe === 'satuan' ? { tipe } : { tipe, year: targetYear };
            const res = await axios.post('/referensi-kode/sync', payload);
            const data = res.data;

            clearInterval(interval);
            setSyncProgress(100);

            await new Promise((r) => setTimeout(r, 400));

            if (data.status === 'success') {
                if (data.stats_per_year) {
                    setStatsPerYear(data.stats_per_year);
                }
                if (typeof data.satuan_count === 'number') {
                    setSatuanCount(data.satuan_count);
                }
                alert(data.message || 'Sinkronisasi berhasil.');
                fetchData(tipe, targetYear);
            } else {
                alert(data.message || 'Gagal melakukan sinkronisasi.');
            }
        } catch (err) {
            clearInterval(interval);
            alert('Terjadi kesalahan saat menghubungi server.');
        } finally {
            if (tipe === 'kegiatan') setKegiatanSyncing(false);
            else if (tipe === 'rekening') setRekeningSyncing(false);
            else setSatuanSyncing(false);
            setShowSyncModal(false);
            setIsSyncingConfirm(false);
        }
    };

    const exportToCSV = (tipe: 'kegiatan' | 'rekening' | 'satuan') => {
        const data = tipe === 'kegiatan' ? kegiatanData : tipe === 'rekening' ? rekeningData : satuanData;
        if (data.length === 0) return;

        let csvContent = '';

        const escapeCsvCell = (str: any) => {
            if (str === null || str === undefined) return '""';
            let s = String(str).replace(/"/g, '""');
            if (/^[=\+\-@]/.test(s)) {
                s = ' ' + s;
            }
            return `"${s}"`;
        };

        if (tipe === 'kegiatan') {
            csvContent += 'Kode Kegiatan,Program,Sub Program,Uraian Kegiatan\r\n';
            data.forEach((row: any) => {
                const kode = escapeCsvCell(row.id_kode);
                const program = escapeCsvCell(row.program);
                const subProgram = escapeCsvCell(row.sub_program);
                const uraian = escapeCsvCell(row.uraian_kode);
                csvContent += `${kode},${program},${subProgram},${uraian}\r\n`;
            });
        } else if (tipe === 'rekening') {
            csvContent += 'Kode Rekening,Uraian Rekening,PPN,PPh 21,PPh 22,PPh 23,PPh 4(2)\r\n';
            data.forEach((row: any) => {
                const kode = escapeCsvCell(row.kode_rekening);
                const rekening = escapeCsvCell(row.rekening);
                const ppn = row.is_ppn ? 'TRUE' : 'FALSE';
                const pph21 = row.is_pph21 ? 'TRUE' : 'FALSE';
                const pph22 = row.is_pph22 ? 'TRUE' : 'FALSE';
                const pph23 = row.is_pph23 ? 'TRUE' : 'FALSE';
                const pph4 = row.is_pph4 ? 'TRUE' : 'FALSE';
                csvContent += `${kode},${rekening},${ppn},${pph21},${pph22},${pph23},${pph4}\r\n`;
            });
        } else {
            csvContent += 'ID Satuan,Satuan,Unit,Aktif\r\n';
            data.forEach((row: any) => {
                csvContent += `${escapeCsvCell(row.ref_satuan_id)},${escapeCsvCell(row.satuan)},${escapeCsvCell(row.unit)},${row.is_active ? 'TRUE' : 'FALSE'}\r\n`;
            });
        }

        const blob = new Blob([new Uint8Array([0xef, 0xbb, 0xbf]), csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.setAttribute('href', url);
        const filename =
            tipe === 'satuan'
                ? 'Referensi_Satuan_ARKAS.csv'
                : `Referensi_${tipe === 'kegiatan' ? 'Kegiatan' : 'Rekening_Belanja'}_ARKAS_${selectedYear}.csv`;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const kegiatanNewCount = kegiatanData.filter((i: any) => i.status === 'Data Baru').length;
    const kegiatanUpdateCount = kegiatanData.filter((i: any) => i.status === 'Perlu Update').length;
    const rekeningNewCount = rekeningData.filter((i: any) => i.status === 'Data Baru').length;
    const rekeningUpdateCount = rekeningData.filter((i: any) => i.status === 'Perlu Update').length;
    const satuanNewCount = satuanData.filter((i: any) => i.status === 'Data Baru').length;
    const satuanUpdateCount = satuanData.filter((i: any) => i.status === 'Perlu Update').length;

    return (
        <AuthenticatedLayout>
            <Head title="Referensi Kode ARKAS" />

            <div className="space-y-4">
                <PageHeader
                    className="animate-rise"
                    breadcrumb={[
                        { label: 'Dashboard' },
                        { label: 'Arkas Tools' },
                        { label: 'Referensi Kode' },
                    ]}
                    title="Referensi Kode ARKAS"
                    badge={<StatusBadge tone="violet" dot={false}>Tahun {selectedYear}</StatusBadge>}
                    subtitle="Referensi kode kegiatan dan rekening belanja terisolasi per tahun anggaran (data tahun lain tidak akan berubah)."
                />

                {/* Tab & Pemilih Tahun */}
                <div className="animate-rise relative z-20" style={{ animationDelay: '60ms' }}>
                    <Surface padding="sm" overflowVisible>
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <PillTabs
                                ariaLabel="Tab referensi kode"
                                variant="soft"
                                value={activeTab}
                                items={[
                                    { key: 'kegiatan', label: `Kode Kegiatan (${selectedYearStats.kegiatan})` },
                                    { key: 'rekening', label: `Rekening Belanja (${selectedYearStats.rekening})` },
                                    { key: 'satuan', label: `Satuan (${satuanCount})` },
                                ]}
                                onChange={(key) => setActiveTab(key as 'kegiatan' | 'rekening' | 'satuan')}
                            />

                            <div className="flex flex-wrap items-center gap-2.5">
                                {activeTab === 'satuan' ? (
                                    <StatusBadge tone="info" dot={false}>
                                        Global (Semua Tahun)
                                    </StatusBadge>
                                ) : (
                                    <>
                                        {selectedYearHasTransactions && (
                                            <StatusBadge tone="warning" dot={false}>
                                                Sudah ada RKAS/BKU {selectedYear}
                                            </StatusBadge>
                                        )}
                                        <div className="w-48">
                                            <ArkasYearSelect
                                                inputId="referensi-kode-year"
                                                value={selectedYear}
                                                onChange={handleYearChange}
                                                activeYears={resolvedYears}
                                                includeAllOption={false}
                                                isDisabled={kegiatanLoading || rekeningLoading || kegiatanSyncing || rekeningSyncing}
                                                localStatsPerYear={activeCountMap}
                                                placeholder="Pilih Tahun..."
                                            />
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </Surface>
                </div>

                {/* Tab Content: Kegiatan */}
                <div className={activeTab === 'kegiatan' ? 'block animate-rise' : 'hidden'} style={{ animationDelay: '110ms' }}>
                    <Surface
                        title={`Referensi Kode Kegiatan Tahun ${selectedYear}`}
                        subtitle={`Tersimpan lokal untuk tahun ${selectedYear}: ${selectedYearStats.kegiatan} kode kegiatan (difilter sesuai jenjang sekolah di ARKAS).`}
                        icon={
                            <IconTile tone="violet" size="md">
                                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M4 6h16M4 12h16M4 18h10" />
                                </svg>
                            </IconTile>
                        }
                        actions={
                            <>
                                <PrimaryButton
                                    onClick={() => triggerSync('kegiatan')}
                                    disabled={kegiatanData.length === 0 || kegiatanLoading || kegiatanSyncing || (kegiatanNewCount === 0 && kegiatanUpdateCount === 0)}
                                    className="text-[11px]"
                                >
                                    {kegiatanSyncing ? 'Menyinkronkan...' : `Sync Tahun ${selectedYear}`}
                                </PrimaryButton>
                                <PrimaryButton onClick={() => fetchData('kegiatan')} disabled={kegiatanLoading || kegiatanSyncing} className="text-[11px]">
                                    {kegiatanLoading ? 'Menarik Data...' : `Tarik Data ${selectedYear}`}
                                </PrimaryButton>
                                <SecondaryButton onClick={() => exportToCSV('kegiatan')} disabled={kegiatanData.length === 0 || kegiatanLoading || kegiatanSyncing} className="text-[11px]">
                                    Export Excel (CSV)
                                </SecondaryButton>
                            </>
                        }
                    >
                        {kegiatanError && (
                            <div className="mb-4 rounded-2xl border border-rose-200 bg-pastel-rose/70 p-3 text-[11px] font-semibold text-rose-600 dark:border-rose-400/20 dark:bg-rose-500/10 dark:text-rose-300">
                                {kegiatanError}
                            </div>
                        )}

                        {kegiatanData.length > 0 && (
                            <div className="mb-4 flex flex-col items-center justify-between gap-3 sm:flex-row">
                                <div className="flex flex-wrap items-center gap-2 text-[10.5px] font-semibold text-slate-400 dark:text-slate-500">
                                    <span>
                                        Menampilkan <span className="text-sikas-num font-extrabold text-slate-700 dark:text-slate-200">{filteredKegiatan.length}</span> dari {kegiatanData.length} data tahun {selectedYear}.
                                    </span>
                                    {kegiatanNewCount > 0 && <StatusBadge tone="success" dot={false}>{kegiatanNewCount} Baru</StatusBadge>}
                                    {kegiatanUpdateCount > 0 && <StatusBadge tone="warning" dot={false}>{kegiatanUpdateCount} Perlu Update</StatusBadge>}
                                </div>
                                <div className="w-full sm:w-1/3">
                                    <TextInput
                                        placeholder="Cari kode, program, atau uraian..."
                                        value={searchKegiatan}
                                        onChange={(e) => setSearchKegiatan(e.target.value)}
                                    />
                                </div>
                            </div>
                        )}

                        <div className="bento-table-wrapper mt-3 overflow-x-auto">
                            <div className="max-h-[600px] overflow-y-auto">
                                <table className="min-w-full">
                                    <thead className="sticky top-0 z-10">
                                        <tr>
                                            <th className="text-left">Kode Kegiatan</th>
                                            <th className="text-center">Sumber Dana</th>
                                            <th className="text-left">Program</th>
                                            <th className="text-left">Sub Program</th>
                                            <th className="text-left">Uraian Kegiatan</th>
                                            <th className="text-center">Keterangan</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredKegiatan.length > 0 ? (
                                            filteredKegiatan.map((item: any, i) => (
                                                <tr key={i}>
                                                    <td className="whitespace-nowrap font-mono font-bold text-slate-700 dark:text-slate-200">{item.id_kode}</td>
                                                    <td className="whitespace-nowrap text-center">
                                                        {item.sumber_dana === 'kinerja' ? (
                                                            <StatusBadge tone="violet" dot={false}>Kinerja</StatusBadge>
                                                        ) : item.sumber_dana === 'semua' ? (
                                                            <StatusBadge tone="success" dot={false}>Semua</StatusBadge>
                                                        ) : (
                                                            <StatusBadge tone="info" dot={false}>Reguler</StatusBadge>
                                                        )}
                                                    </td>
                                                    <td className="text-slate-600 dark:text-slate-300">{item.program}</td>
                                                    <td className="text-slate-600 dark:text-slate-300">{item.sub_program}</td>
                                                    <td className="text-slate-600 dark:text-slate-300">{item.uraian_kode}</td>
                                                    <td className="text-center">
                                                        {item.status === 'Data Baru' ? (
                                                            <StatusBadge tone="success" dot={false}>Data Baru</StatusBadge>
                                                        ) : item.status === 'Perlu Update' ? (
                                                            <StatusBadge tone="warning" dot={false}>Perlu Update</StatusBadge>
                                                        ) : (
                                                            <StatusBadge tone="neutral" dot={false}>Sudah Ada</StatusBadge>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={6} className="p-0">
                                                    <EmptyState
                                                        className="border-0 bg-transparent py-9 dark:bg-transparent"
                                                        icon={
                                                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                                            </svg>
                                                        }
                                                        title={kegiatanLoading ? `Sedang menarik data tahun ${selectedYear} dari ARKAS...` : (searchKegiatan ? 'Tidak ada data yang cocok dengan pencarian.' : `Klik "Tarik Data ${selectedYear}" untuk memuat daftar kegiatan tahun ${selectedYear}.`)}
                                                    />
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </Surface>
                </div>

                {/* Tab Content: Rekening */}
                <div className={activeTab === 'rekening' ? 'block animate-rise' : 'hidden'} style={{ animationDelay: '110ms' }}>
                    <Surface
                        title={`Referensi Rekening Belanja Tahun ${selectedYear}`}
                        subtitle={`Tersimpan lokal untuk tahun ${selectedYear}: ${selectedYearStats.rekening} rekening belanja.`}
                        icon={
                            <IconTile tone="sky" size="md">
                                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                                </svg>
                            </IconTile>
                        }
                        actions={
                            <>
                                <PrimaryButton
                                    onClick={() => triggerSync('rekening')}
                                    disabled={rekeningData.length === 0 || rekeningLoading || rekeningSyncing || (rekeningNewCount === 0 && rekeningUpdateCount === 0)}
                                    className="text-[11px]"
                                >
                                    {rekeningSyncing ? 'Menyinkronkan...' : `Sync Tahun ${selectedYear}`}
                                </PrimaryButton>
                                <PrimaryButton onClick={() => fetchData('rekening')} disabled={rekeningLoading || rekeningSyncing} className="text-[11px]">
                                    {rekeningLoading ? 'Menarik Data...' : `Tarik Data ${selectedYear}`}
                                </PrimaryButton>
                                <SecondaryButton onClick={() => exportToCSV('rekening')} disabled={rekeningData.length === 0 || rekeningLoading || rekeningSyncing} className="text-[11px]">
                                    Export Excel (CSV)
                                </SecondaryButton>
                            </>
                        }
                    >
                        {rekeningError && (
                            <div className="mb-4 rounded-2xl border border-rose-200 bg-pastel-rose/70 p-3 text-[11px] font-semibold text-rose-600 dark:border-rose-400/20 dark:bg-rose-500/10 dark:text-rose-300">
                                {rekeningError}
                            </div>
                        )}

                        {rekeningData.length > 0 && (
                            <div className="mb-4 flex flex-col items-center justify-between gap-3 sm:flex-row">
                                <div className="flex flex-wrap items-center gap-2 text-[10.5px] font-semibold text-slate-400 dark:text-slate-500">
                                    <span>
                                        Menampilkan <span className="text-sikas-num font-extrabold text-slate-700 dark:text-slate-200">{filteredRekening.length}</span> dari {rekeningData.length} rekening tahun {selectedYear}.
                                    </span>
                                    {rekeningNewCount > 0 && <StatusBadge tone="success" dot={false}>{rekeningNewCount} Baru</StatusBadge>}
                                    {rekeningUpdateCount > 0 && <StatusBadge tone="warning" dot={false}>{rekeningUpdateCount} Perlu Update</StatusBadge>}
                                </div>
                                <div className="w-full sm:w-1/3">
                                    <TextInput
                                        placeholder="Cari kode atau uraian rekening..."
                                        value={searchRekening}
                                        onChange={(e) => setSearchRekening(e.target.value)}
                                    />
                                </div>
                            </div>
                        )}

                        <div className="bento-table-wrapper mt-3 overflow-x-auto">
                            <div className="max-h-[600px] overflow-y-auto">
                                <table className="min-w-full">
                                    <thead className="sticky top-0 z-10">
                                        <tr>
                                            <th className="text-left">Kode Rekening</th>
                                            <th className="text-left">Uraian Rekening</th>
                                            <th className="text-center">PPN</th>
                                            <th className="text-center">PPh 21</th>
                                            <th className="text-center">PPh 22</th>
                                            <th className="text-center">PPh 23</th>
                                            <th className="text-center">PPh 4(2)</th>
                                            <th className="text-center">Keterangan</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredRekening.length > 0 ? (
                                            filteredRekening.map((item: any, i) => (
                                                <tr key={i}>
                                                    <td className="whitespace-nowrap font-mono font-bold text-slate-700 dark:text-slate-200">{item.kode_rekening}</td>
                                                    <td className="text-slate-600 dark:text-slate-300">{item.rekening}</td>
                                                    {[item.is_ppn, item.is_pph21, item.is_pph22, item.is_pph23, item.is_pph4].map((flag: any, taxIndex: number) => (
                                                        <td key={taxIndex} className="text-center">
                                                            {flag ? <StatusBadge tone="danger" dot={false}>TRUE</StatusBadge> : <StatusBadge tone="neutral" dot={false}>FALSE</StatusBadge>}
                                                        </td>
                                                    ))}
                                                    <td className="text-center">
                                                        {item.status === 'Data Baru' ? (
                                                            <StatusBadge tone="success" dot={false}>Data Baru</StatusBadge>
                                                        ) : item.status === 'Perlu Update' ? (
                                                            <StatusBadge tone="warning" dot={false}>Perlu Update</StatusBadge>
                                                        ) : (
                                                            <StatusBadge tone="neutral" dot={false}>Sudah Ada</StatusBadge>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={8} className="p-0">
                                                    <EmptyState
                                                        className="border-0 bg-transparent py-9 dark:bg-transparent"
                                                        icon={
                                                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                                            </svg>
                                                        }
                                                        title={rekeningLoading ? `Sedang menarik data tahun ${selectedYear} dari ARKAS...` : (searchRekening ? 'Tidak ada data yang cocok dengan pencarian.' : `Klik "Tarik Data ${selectedYear}" untuk memuat daftar rekening belanja tahun ${selectedYear}.`)}
                                                    />
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </Surface>
                </div>

                {/* Tab Content: Satuan */}
                <div className={activeTab === 'satuan' ? 'block animate-rise' : 'hidden'} style={{ animationDelay: '110ms' }}>
                    <Surface
                        title="Referensi Satuan Baku ARKAS"
                        subtitle={`Tersimpan lokal: ${satuanCount} satuan aktif (berlaku lintas tahun untuk saran otomatis input Satuan pada RKAS & RKAS Perubahan).`}
                        icon={
                            <IconTile tone="mint" size="md">
                                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
                                    <line x1="7" y1="7" x2="7.01" y2="7" />
                                </svg>
                            </IconTile>
                        }
                        actions={
                            <>
                                <PrimaryButton
                                    onClick={() => triggerSync('satuan')}
                                    disabled={satuanData.length === 0 || satuanLoading || satuanSyncing || (satuanNewCount === 0 && satuanUpdateCount === 0)}
                                    className="text-[11px]"
                                >
                                    {satuanSyncing ? 'Menyinkronkan...' : 'Sync Satuan'}
                                </PrimaryButton>
                                <PrimaryButton onClick={() => fetchData('satuan')} disabled={satuanLoading || satuanSyncing} className="text-[11px]">
                                    {satuanLoading ? 'Menarik Data...' : 'Tarik Data Satuan'}
                                </PrimaryButton>
                                <SecondaryButton onClick={() => exportToCSV('satuan')} disabled={satuanData.length === 0 || satuanLoading || satuanSyncing} className="text-[11px]">
                                    Export Excel (CSV)
                                </SecondaryButton>
                            </>
                        }
                    >
                        {satuanError && (
                            <div className="mb-4 rounded-2xl border border-rose-200 bg-pastel-rose/70 p-3 text-[11px] font-semibold text-rose-600 dark:border-rose-400/20 dark:bg-rose-500/10 dark:text-rose-300">
                                {satuanError}
                            </div>
                        )}

                        {satuanData.length > 0 && (
                            <div className="mb-4 flex flex-col items-center justify-between gap-3 sm:flex-row">
                                <div className="flex flex-wrap items-center gap-2 text-[10.5px] font-semibold text-slate-400 dark:text-slate-500">
                                    <span>
                                        Menampilkan <span className="text-sikas-num font-extrabold text-slate-700 dark:text-slate-200">{filteredSatuan.length}</span> dari {satuanData.length} satuan ARKAS.
                                    </span>
                                    {satuanNewCount > 0 && <StatusBadge tone="success" dot={false}>{satuanNewCount} Baru</StatusBadge>}
                                    {satuanUpdateCount > 0 && <StatusBadge tone="warning" dot={false}>{satuanUpdateCount} Perlu Update</StatusBadge>}
                                </div>
                                <div className="w-full sm:w-1/3">
                                    <TextInput
                                        placeholder="Cari nama satuan..."
                                        value={searchSatuan}
                                        onChange={(e) => setSearchSatuan(e.target.value)}
                                    />
                                </div>
                            </div>
                        )}

                        <div className="bento-table-wrapper mt-3 overflow-x-auto">
                            <div className="max-h-[600px] overflow-y-auto">
                                <table className="min-w-full">
                                    <thead className="sticky top-0 z-10">
                                        <tr>
                                            <th className="w-12 text-left">No</th>
                                            <th className="text-left">Nama Satuan</th>
                                            <th className="text-left">Unit</th>
                                            <th className="text-center">Status ARKAS</th>
                                            <th className="text-center">Keterangan</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredSatuan.length > 0 ? (
                                            filteredSatuan.map((item: any, i) => (
                                                <tr key={item.ref_satuan_id || i}>
                                                    <td className="text-[11px] font-bold text-slate-400">{i + 1}</td>
                                                    <td className="font-bold text-slate-800 dark:text-slate-100">{item.satuan}</td>
                                                    <td className="text-slate-600 dark:text-slate-300">{item.unit}</td>
                                                    <td className="text-center">
                                                        {item.is_active ? (
                                                            <StatusBadge tone="success" dot={false}>Aktif</StatusBadge>
                                                        ) : (
                                                            <StatusBadge tone="danger" dot={false}>Kedaluwarsa</StatusBadge>
                                                        )}
                                                    </td>
                                                    <td className="text-center">
                                                        {item.status === 'Data Baru' ? (
                                                            <StatusBadge tone="success" dot={false}>Data Baru</StatusBadge>
                                                        ) : item.status === 'Perlu Update' ? (
                                                            <StatusBadge tone="warning" dot={false}>Perlu Update</StatusBadge>
                                                        ) : (
                                                            <StatusBadge tone="neutral" dot={false}>Sudah Ada</StatusBadge>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={5} className="p-0">
                                                    <EmptyState
                                                        className="border-0 bg-transparent py-9 dark:bg-transparent"
                                                        icon={
                                                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                                            </svg>
                                                        }
                                                        title={satuanLoading ? 'Sedang menarik daftar satuan baku dari ARKAS...' : (searchSatuan ? 'Tidak ada satuan yang cocok dengan pencarian.' : 'Klik "Tarik Data Satuan" untuk memuat daftar satuan baku dari arkas.db.')}
                                                    />
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </Surface>
                </div>
            </div>

            {/* Modal Konfirmasi & Progress untuk Sync */}
            <Modal show={showSyncModal} onClose={() => !isSyncingConfirm && setShowSyncModal(false)} maxWidth="md">
                <div className="relative overflow-hidden bg-white dark:bg-[#15131F]">
                    <div className="pointer-events-none absolute -right-10 -top-16 h-40 w-40 rounded-full bg-mint/10 blur-3xl" />
                    <div className="relative flex items-start justify-between gap-3 border-b border-slate-100 px-6 py-4 dark:border-white/5">
                        <div className="flex items-center gap-3">
                            <IconTile tone="mint" size="lg">
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                            </IconTile>
                            <div className="min-w-0">
                                <h2 className="text-[14px] font-extrabold tracking-tight text-slate-900 dark:text-white">
                                    {syncTipe === 'satuan' ? 'Konfirmasi Sinkronisasi Satuan' : `Konfirmasi Sinkronisasi Tahun ${selectedYear}`}
                                </h2>
                                <p className="mt-0.5 text-[10px] font-medium text-slate-400 dark:text-slate-500">
                                    {syncTipe === 'satuan'
                                        ? 'Simpan daftar satuan baku ARKAS ke database lokal.'
                                        : `Simpan referensi ARKAS khusus tahun ${selectedYear} ke database lokal.`}
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => !isSyncingConfirm && setShowSyncModal(false)}
                            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-500 dark:hover:bg-white/5 dark:hover:text-white"
                            aria-label="Tutup"
                        >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                    <div className="px-6 py-5">
                        {!isSyncingConfirm ? (
                            <>
                                <p className="text-[11.5px] font-medium leading-relaxed text-slate-600 dark:text-slate-300">
                                    Anda akan menyimpan data baru dan memperbarui perubahan{' '}
                                    <span className="font-extrabold text-slate-900 dark:text-white">
                                        {syncTipe === 'satuan'
                                            ? 'Satuan Baku ARKAS'
                                            : `${syncTipe === 'kegiatan' ? 'Kode Kegiatan' : 'Rekening Belanja'} Tahun ${selectedYear}`}
                                    </span>{' '}
                                    dari ARKAS ke database SIKAS lokal.
                                </p>
                                {syncTipe !== 'satuan' && (
                                    <div className="mt-3 rounded-2xl border border-emerald-200/80 bg-pastel-mint/60 p-3 text-[11px] font-semibold text-emerald-800 dark:border-mint/25 dark:bg-mint/10 dark:text-emerald-200">
                                        Data referensi, RKAS, dan BKU pada tahun anggaran lainnya tidak akan tersentuh atau berubah.
                                    </div>
                                )}
                                {syncTipe !== 'satuan' && selectedYearHasTransactions && (
                                    <div className="mt-3 rounded-2xl border border-amber-200/90 bg-pastel-amber/70 p-3 text-[11px] font-semibold leading-relaxed text-amber-800 dark:border-amber-400/25 dark:bg-amber-500/10 dark:text-amber-200">
                                        Perhatian: Tahun {selectedYear} sudah memiliki data RKAS/BKU. Sinkronisasi ini akan menambahkan kode baru serta memperbarui uraian referensi khusus untuk tahun {selectedYear}.
                                    </div>
                                )}
                                <div className="mt-5 flex justify-end gap-2 border-t border-slate-100 pt-4 dark:border-white/5">
                                    <SecondaryButton onClick={() => setShowSyncModal(false)}>Batal</SecondaryButton>
                                    <PrimaryButton onClick={confirmSync}>
                                        {syncTipe === 'satuan' ? 'Ya, Sinkronkan Satuan' : `Ya, Sinkronkan ${selectedYear}`}
                                    </PrimaryButton>
                                </div>
                            </>
                        ) : (
                            <div className="py-4 text-center">
                                <h2 className="mb-4 text-[13px] font-extrabold text-slate-900 dark:text-white">
                                    {syncTipe === 'satuan' ? 'Menyinkronkan Satuan Baku...' : `Menyinkronkan Tahun ${selectedYear}...`}
                                </h2>

                                <div className="mb-2 h-4 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
                                    <div
                                        className="flex h-4 items-center justify-center rounded-full bg-gradient-to-r from-mint to-emerald-500 transition-all duration-300 ease-out"
                                        style={{ width: `${syncProgress}%` }}
                                    />
                                </div>

                                <p className="mb-4 text-[12px] font-extrabold text-mint">
                                    {syncProgress}% Selesai
                                </p>
                                <p className="text-[10.5px] font-medium text-slate-400 dark:text-slate-500">
                                    Mohon tunggu sebentar, sedang menyimpan data tahun {selectedYear}...
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </Modal>
        </AuthenticatedLayout>
    );
}
