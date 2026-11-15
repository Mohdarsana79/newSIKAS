import React, { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import TextInput from '@/Components/TextInput';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import Modal from '@/Components/Modal';
import axios from 'axios';
import PageHeader from '@/Components/ui/PageHeader';
import Surface from '@/Components/ui/Surface';
import DataTable from '@/Components/ui/DataTable';
import EmptyState from '@/Components/ui/EmptyState';
import IconTile from '@/Components/ui/IconTile';
import StatusBadge from '@/Components/ui/StatusBadge';
import PillTabs from '@/Components/ui/PillTabs';

export default function ReferensiKode() {
    const [activeTab, setActiveTab] = useState<'kegiatan' | 'rekening'>('kegiatan');
    
    // State for kegiatan
    const [kegiatanData, setKegiatanData] = useState([]);
    const [kegiatanLoading, setKegiatanLoading] = useState(false);
    const [kegiatanSyncing, setKegiatanSyncing] = useState(false);
    const [kegiatanError, setKegiatanError] = useState('');
    const [searchKegiatan, setSearchKegiatan] = useState('');

    // State for rekening
    const [rekeningData, setRekeningData] = useState([]);
    const [rekeningLoading, setRekeningLoading] = useState(false);
    const [rekeningSyncing, setRekeningSyncing] = useState(false);
    const [rekeningError, setRekeningError] = useState('');
    const [searchRekening, setSearchRekening] = useState('');

    // Modal state for Sync
    const [showSyncModal, setShowSyncModal] = useState(false);
    const [syncProgress, setSyncProgress] = useState(0);
    const [isSyncingConfirm, setIsSyncingConfirm] = useState(false);
    const [syncTipe, setSyncTipe] = useState<'kegiatan' | 'rekening'>('kegiatan');

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



    const fetchData = async (tipe: 'kegiatan' | 'rekening') => {
        if (tipe === 'kegiatan') {
            setKegiatanLoading(true);
            setKegiatanError('');
        } else {
            setRekeningLoading(true);
            setRekeningError('');
        }

        try {
            const res = await fetch(`/referensi-kode/fetch?tipe=${tipe}&year=2026`, {
                headers: { 'Accept': 'application/json' }
            });
            const data = await res.json();

            if (data.status === 'success') {
                if (tipe === 'kegiatan') setKegiatanData(data.data);
                else setRekeningData(data.data);
            } else {
                if (tipe === 'kegiatan') setKegiatanError(data.message);
                else setRekeningError(data.message);
            }
        } catch (err) {
            if (tipe === 'kegiatan') setKegiatanError('Gagal menghubungi server.');
            else setRekeningError('Gagal menghubungi server.');
        } finally {
            if (tipe === 'kegiatan') setKegiatanLoading(false);
            else setRekeningLoading(false);
        }
    };

    const triggerSync = (tipe: 'kegiatan' | 'rekening') => {
        setSyncTipe(tipe);
        setShowSyncModal(true);
        setSyncProgress(0);
        setIsSyncingConfirm(false);
    };

    const confirmSync = async () => {
        setIsSyncingConfirm(true);
        const tipe = syncTipe;
        
        if (tipe === 'kegiatan') setKegiatanSyncing(true);
        else setRekeningSyncing(true);

        // Fake progress smooth animation (1-100%)
        let currentProgress = 0;
        const interval = setInterval(() => {
            currentProgress += 1;
            if (currentProgress >= 95) currentProgress = 95; // cap at 95 until done
            setSyncProgress(currentProgress);
        }, 50);

        try {
            const res = await axios.post(`/referensi-kode/sync`, { 
                tipe, 
                year: '2026' 
            });
            const data = res.data;

            clearInterval(interval);
            setSyncProgress(100);
            
            // Wait briefly to show 100%
            await new Promise(r => setTimeout(r, 600));

            if (data.status === 'success') {
                // Tampilkan pesan hasil sync (termasuk update)
                const msg = data.message || 'Sinkronisasi berhasil.';
                alert(msg);
                // Refresh data to update status
                fetchData(tipe);
            } else {
                alert(data.message || 'Gagal melakukan sinkronisasi.');
            }
        } catch (err) {
            clearInterval(interval);
            alert('Terjadi kesalahan saat menghubungi server.');
        } finally {
            if (tipe === 'kegiatan') setKegiatanSyncing(false);
            else setRekeningSyncing(false);
            setShowSyncModal(false);
            setIsSyncingConfirm(false);
        }
    };

    const exportToCSV = (tipe: 'kegiatan' | 'rekening') => {
        const data = tipe === 'kegiatan' ? kegiatanData : rekeningData;
        if (data.length === 0) return;

        let csvContent = "";
        
        // Helper untuk mencegah Excel Formula Injection (#NAME?)
        const escapeCsvCell = (str: any) => {
            if (str === null || str === undefined) return '""';
            let s = String(str).replace(/"/g, '""');
            if (/^[=\+\-@]/.test(s)) {
                s = ' ' + s;
            }
            return `"${s}"`;
        };

        if (tipe === 'kegiatan') {
            csvContent += "Kode Kegiatan,Program,Sub Program,Uraian Kegiatan\r\n";
            data.forEach((row: any) => {
                const kode = escapeCsvCell(row.id_kode);
                const program = escapeCsvCell(row.program);
                const subProgram = escapeCsvCell(row.sub_program);
                const uraian = escapeCsvCell(row.uraian_kode);
                csvContent += `${kode},${program},${subProgram},${uraian}\r\n`;
            });
        } else {
            csvContent += "Kode Rekening,Uraian Rekening,PPN,PPh 21,PPh 22,PPh 23,PPh 4(2)\r\n";
            data.forEach((row: any) => {
                const kode = escapeCsvCell(row.kode_rekening);
                const rekening = escapeCsvCell(row.rekening);
                const ppn = row.is_ppn ? "TRUE" : "FALSE";
                const pph21 = row.is_pph21 ? "TRUE" : "FALSE";
                const pph22 = row.is_pph22 ? "TRUE" : "FALSE";
                const pph23 = row.is_pph23 ? "TRUE" : "FALSE";
                const pph4 = row.is_pph4 ? "TRUE" : "FALSE";
                csvContent += `${kode},${rekening},${ppn},${pph21},${pph22},${pph23},${pph4}\r\n`;
            });
        }

        const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `Referensi_${tipe === 'kegiatan' ? 'Kegiatan' : 'Rekening_Belanja'}_ARKAS.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

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
                    badge={<StatusBadge tone="violet" dot={false}>ARKAS</StatusBadge>}
                    subtitle="Referensi kode kegiatan dan rekening belanja dari database ARKAS lokal."
                />

                {/* Tab */}
                <div className="animate-rise" style={{ animationDelay: '60ms' }}>
                    <Surface padding="sm">
                        <PillTabs
                            ariaLabel="Tab referensi kode"
                            variant="soft"
                            value={activeTab}
                            items={[
                                { key: 'kegiatan', label: 'Kode Kegiatan' },
                                { key: 'rekening', label: 'Rekening Belanja' },
                            ]}
                            onChange={(key) => setActiveTab(key as 'kegiatan' | 'rekening')}
                        />
                    </Surface>
                </div>

                {/* Tab Content: Kegiatan */}
                <div className={activeTab === 'kegiatan' ? 'block animate-rise' : 'hidden'} style={{ animationDelay: '110ms' }}>
                    <Surface
                        title="Referensi Kode Kegiatan"
                        subtitle="Data ini ditarik langsung dari database ARKAS lokal Anda."
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
                                    disabled={kegiatanData.length === 0 || kegiatanLoading || kegiatanSyncing || !kegiatanData.some((i: any) => i.status === 'Data Baru' || i.status === 'Perlu Update')}
                                    className="text-[11px]"
                                >
                                    {kegiatanSyncing ? 'Menyinkronkan...' : 'Sync Database'}
                                </PrimaryButton>
                                <PrimaryButton onClick={() => fetchData('kegiatan')} disabled={kegiatanLoading || kegiatanSyncing} className="text-[11px]">
                                    {kegiatanLoading ? 'Menarik Data...' : 'Tarik Data'}
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
                                <div className="text-[10.5px] font-semibold text-slate-400 dark:text-slate-500">
                                    Menampilkan <span className="text-sikas-num font-extrabold text-slate-700 dark:text-slate-200">{filteredKegiatan.length}</span> dari {kegiatanData.length} data kegiatan.
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
                                                <td colSpan={5} className="p-0">
                                                    <EmptyState
                                                        className="border-0 bg-transparent py-9 dark:bg-transparent"
                                                        icon={
                                                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                                            </svg>
                                                        }
                                                        title={kegiatanLoading ? 'Sedang menarik data dari ARKAS...' : (searchKegiatan ? 'Tidak ada data yang cocok dengan pencarian.' : 'Klik "Tarik Data" untuk memuat daftar kegiatan.')}
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
                        title="Referensi Rekening Belanja"
                        subtitle="Data ini ditarik langsung dari database ARKAS lokal Anda."
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
                                    disabled={rekeningData.length === 0 || rekeningLoading || rekeningSyncing || !rekeningData.some((i: any) => i.status === 'Data Baru' || i.status === 'Perlu Update')}
                                    className="text-[11px]"
                                >
                                    {rekeningSyncing ? 'Menyinkronkan...' : 'Sync Database'}
                                </PrimaryButton>
                                <PrimaryButton onClick={() => fetchData('rekening')} disabled={rekeningLoading || rekeningSyncing} className="text-[11px]">
                                    {rekeningLoading ? 'Menarik Data...' : 'Tarik Data'}
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
                                <div className="text-[10.5px] font-semibold text-slate-400 dark:text-slate-500">
                                    Menampilkan <span className="text-sikas-num font-extrabold text-slate-700 dark:text-slate-200">{filteredRekening.length}</span> dari {rekeningData.length} data rekening belanja.
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
                                                        title={rekeningLoading ? 'Sedang menarik data dari ARKAS...' : (searchRekening ? 'Tidak ada data yang cocok dengan pencarian.' : 'Klik "Tarik Data" untuk memuat daftar rekening belanja.')}
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
                                <h2 className="text-[14px] font-extrabold tracking-tight text-slate-900 dark:text-white">Konfirmasi Sinkronisasi</h2>
                                <p className="mt-0.5 text-[10px] font-medium text-slate-400 dark:text-slate-500">Simpan referensi ARKAS ke database lokal.</p>
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
                                <p className="text-[11.5px] font-medium leading-relaxed text-slate-500 dark:text-slate-400">
                                    Anda akan menyimpan seluruh data {syncTipe === 'kegiatan' ? 'Kegiatan' : 'Rekening Belanja'} ARKAS yang berstatus "Data Baru" ke dalam database SIKAS lokal Anda.
                                </p>
                                <p className="mt-2 text-[11.5px] font-extrabold text-amber-600 dark:text-amber-300">
                                    Lanjutkan sinkronisasi?
                                </p>
                                <div className="mt-5 flex justify-end gap-2 border-t border-slate-100 pt-4 dark:border-white/5">
                                    <SecondaryButton onClick={() => setShowSyncModal(false)}>Batal</SecondaryButton>
                                    <PrimaryButton onClick={confirmSync}>Ya, Sinkronkan</PrimaryButton>
                                </div>
                            </>
                        ) : (
                            <div className="py-4 text-center">
                                <h2 className="mb-4 text-[13px] font-extrabold text-slate-900 dark:text-white">Menyinkronkan ke Database...</h2>

                                {/* Progress Bar Container */}
                                <div className="mb-2 h-4 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
                                    <div
                                        className="flex h-4 items-center justify-center rounded-full bg-gradient-to-r from-mint to-emerald-500 transition-all duration-300 ease-out"
                                        style={{ width: `${syncProgress}%` }}
                                    >
                                    </div>
                                </div>

                                <p className="mb-4 text-[12px] font-extrabold text-mint">
                                    {syncProgress}% Selesai
                                </p>
                                <p className="text-[10.5px] font-medium text-slate-400 dark:text-slate-500">
                                    Mohon tunggu sebentar, sedang menyimpan data...
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </Modal>
        </AuthenticatedLayout>
    );
}
