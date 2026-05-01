import React, { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import TextInput from '@/Components/TextInput';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import Modal from '@/Components/Modal';
import axios from 'axios';

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
        <AuthenticatedLayout
            header={<h2 className="font-semibold text-xl text-gray-800 leading-tight">Referensi Kode ARKAS</h2>}
        >
            <Head title="Referensi Kode ARKAS" />

            <div className="py-12">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    
                    {/* Tabs */}
                    <div className="bg-white rounded-t-lg border-b border-gray-200">
                        <nav className="flex -mb-px" aria-label="Tabs">
                            <button
                                onClick={() => setActiveTab('kegiatan')}
                                className={`w-1/2 py-4 px-1 text-center border-b-2 font-medium text-sm transition-colors ${
                                    activeTab === 'kegiatan'
                                        ? 'border-indigo-500 text-indigo-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                            >
                                Kode Kegiatan
                            </button>
                            <button
                                onClick={() => setActiveTab('rekening')}
                                className={`w-1/2 py-4 px-1 text-center border-b-2 font-medium text-sm transition-colors ${
                                    activeTab === 'rekening'
                                        ? 'border-indigo-500 text-indigo-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                            >
                                Rekening Belanja
                            </button>
                        </nav>
                    </div>

                    <div className="bg-white shadow-sm sm:rounded-b-lg p-6">
                        
                        {/* Tab Content: Kegiatan */}
                        <div className={activeTab === 'kegiatan' ? 'block' : 'hidden'}>
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h3 className="text-lg font-medium text-gray-900">Referensi Kode Kegiatan</h3>
                                    <p className="text-sm text-gray-500 mt-1">
                                        Data ini ditarik langsung dari database ARKAS lokal Anda.
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    <PrimaryButton onClick={() => triggerSync('kegiatan')} disabled={kegiatanData.length === 0 || kegiatanLoading || kegiatanSyncing || !kegiatanData.some((i: any) => i.status === 'Data Baru')} className="bg-emerald-600 hover:bg-emerald-700 focus:bg-emerald-700 active:bg-emerald-900">
                                        {kegiatanSyncing ? 'Menyinkronkan...' : 'Sync Database'}
                                    </PrimaryButton>
                                    <PrimaryButton onClick={() => fetchData('kegiatan')} disabled={kegiatanLoading || kegiatanSyncing}>
                                        {kegiatanLoading ? 'Menarik Data...' : 'Tarik Data'}
                                    </PrimaryButton>
                                    <SecondaryButton onClick={() => exportToCSV('kegiatan')} disabled={kegiatanData.length === 0 || kegiatanLoading || kegiatanSyncing}>
                                        Export Excel (CSV)
                                    </SecondaryButton>
                                </div>
                            </div>

                            {kegiatanError && (
                                <div className="bg-red-50 text-red-600 p-3 rounded mb-4 text-sm border border-red-200">
                                    {kegiatanError}
                                </div>
                            )}

                            {kegiatanData.length > 0 && (
                                <div className="mb-4 flex flex-col sm:flex-row gap-4 items-center justify-between">
                                    <div className="text-sm text-gray-600 font-medium">
                                        Menampilkan <span className="font-bold text-indigo-600">{filteredKegiatan.length}</span> dari {kegiatanData.length} data kegiatan.
                                    </div>
                                    <TextInput
                                        className="w-full sm:w-1/3 text-sm"
                                        placeholder="Cari kode, program, atau uraian..."
                                        value={searchKegiatan}
                                        onChange={(e) => setSearchKegiatan(e.target.value)}
                                    />
                                </div>
                            )}

                            <div className="overflow-x-auto border rounded-lg border-gray-200">
                                <div className="max-h-[600px] overflow-y-auto custom-scrollbar">
                                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                                        <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
                                            <tr>
                                                <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase w-1/6">Kode Kegiatan</th>
                                                <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase w-1/6">Program</th>
                                                <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase w-1/4">Sub Program</th>
                                                <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase w-1/4">Uraian Kegiatan</th>
                                                <th className="px-6 py-3 text-center font-medium text-gray-500 uppercase w-1/6">Keterangan</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {filteredKegiatan.length > 0 ? (
                                                filteredKegiatan.map((item: any, i) => (
                                                    <tr key={i} className="hover:bg-gray-50">
                                                        <td className="px-6 py-3 whitespace-nowrap text-xs text-gray-600 font-mono">{item.id_kode}</td>
                                                        <td className="px-6 py-3 text-gray-800">{item.program}</td>
                                                        <td className="px-6 py-3 text-gray-800">{item.sub_program}</td>
                                                        <td className="px-6 py-3 text-gray-800">{item.uraian_kode}</td>
                                                        <td className="px-6 py-3 text-center">
                                                            {item.status === 'Data Baru' ? (
                                                                <span className="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                                                                    Data Baru
                                                                </span>
                                                            ) : (
                                                                <span className="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                                                                    Sudah Ada
                                                                </span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                                                        {kegiatanLoading ? 'Sedang menarik data dari ARKAS...' : (searchKegiatan ? 'Tidak ada data yang cocok dengan pencarian.' : 'Klik "Tarik Data" untuk memuat daftar kegiatan.')}
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        {/* Tab Content: Rekening */}
                        <div className={activeTab === 'rekening' ? 'block' : 'hidden'}>
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h3 className="text-lg font-medium text-gray-900">Referensi Rekening Belanja</h3>
                                    <p className="text-sm text-gray-500 mt-1">
                                        Data ini ditarik langsung dari database ARKAS lokal Anda.
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    <PrimaryButton onClick={() => triggerSync('rekening')} disabled={rekeningData.length === 0 || rekeningLoading || rekeningSyncing || !rekeningData.some((i: any) => i.status === 'Data Baru' || i.status === 'Perlu Update')} className="bg-emerald-600 hover:bg-emerald-700 focus:bg-emerald-700 active:bg-emerald-900">
                                        {rekeningSyncing ? 'Menyinkronkan...' : 'Sync Database'}
                                    </PrimaryButton>
                                    <PrimaryButton onClick={() => fetchData('rekening')} disabled={rekeningLoading || rekeningSyncing}>
                                        {rekeningLoading ? 'Menarik Data...' : 'Tarik Data'}
                                    </PrimaryButton>
                                    <SecondaryButton onClick={() => exportToCSV('rekening')} disabled={rekeningData.length === 0 || rekeningLoading || rekeningSyncing}>
                                        Export Excel (CSV)
                                    </SecondaryButton>
                                </div>
                            </div>

                            {rekeningError && (
                                <div className="bg-red-50 text-red-600 p-3 rounded mb-4 text-sm border border-red-200">
                                    {rekeningError}
                                </div>
                            )}

                            {rekeningData.length > 0 && (
                                <div className="mb-4 flex flex-col sm:flex-row gap-4 items-center justify-between">
                                    <div className="text-sm text-gray-600 font-medium">
                                        Menampilkan <span className="font-bold text-indigo-600">{filteredRekening.length}</span> dari {rekeningData.length} data rekening belanja.
                                    </div>
                                    <TextInput
                                        className="w-full sm:w-1/3 text-sm"
                                        placeholder="Cari kode atau uraian rekening..."
                                        value={searchRekening}
                                        onChange={(e) => setSearchRekening(e.target.value)}
                                    />
                                </div>
                            )}

                            <div className="overflow-x-auto border rounded-lg border-gray-200">
                                <div className="max-h-[600px] overflow-y-auto custom-scrollbar">
                                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                                        <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
                                            <tr>
                                                <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase w-1/4">Kode Rekening</th>
                                                <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase w-1/3">Uraian Rekening</th>
                                                <th className="px-2 py-3 text-center font-medium text-gray-500 uppercase">PPN</th>
                                                <th className="px-2 py-3 text-center font-medium text-gray-500 uppercase">PPh 21</th>
                                                <th className="px-2 py-3 text-center font-medium text-gray-500 uppercase">PPh 22</th>
                                                <th className="px-2 py-3 text-center font-medium text-gray-500 uppercase">PPh 23</th>
                                                <th className="px-2 py-3 text-center font-medium text-gray-500 uppercase">PPh 4(2)</th>
                                                <th className="px-6 py-3 text-center font-medium text-gray-500 uppercase w-1/6">Keterangan</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {filteredRekening.length > 0 ? (
                                                filteredRekening.map((item: any, i) => (
                                                    <tr key={i} className="hover:bg-gray-50">
                                                        <td className="px-6 py-3 whitespace-nowrap text-xs text-gray-600 font-mono">{item.kode_rekening}</td>
                                                        <td className="px-6 py-3 text-gray-800">{item.rekening}</td>
                                                        <td className="px-2 py-3 text-center">
                                                            {item.is_ppn ? <span className="inline-flex py-1 px-2 rounded bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold">TRUE</span> : <span className="inline-flex py-1 px-2 rounded bg-gray-50 text-gray-400 border border-gray-200 text-xs">FALSE</span>}
                                                        </td>
                                                        <td className="px-2 py-3 text-center">
                                                            {item.is_pph21 ? <span className="inline-flex py-1 px-2 rounded bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold">TRUE</span> : <span className="inline-flex py-1 px-2 rounded bg-gray-50 text-gray-400 border border-gray-200 text-xs">FALSE</span>}
                                                        </td>
                                                        <td className="px-2 py-3 text-center">
                                                            {item.is_pph22 ? <span className="inline-flex py-1 px-2 rounded bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold">TRUE</span> : <span className="inline-flex py-1 px-2 rounded bg-gray-50 text-gray-400 border border-gray-200 text-xs">FALSE</span>}
                                                        </td>
                                                        <td className="px-2 py-3 text-center">
                                                            {item.is_pph23 ? <span className="inline-flex py-1 px-2 rounded bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold">TRUE</span> : <span className="inline-flex py-1 px-2 rounded bg-gray-50 text-gray-400 border border-gray-200 text-xs">FALSE</span>}
                                                        </td>
                                                        <td className="px-2 py-3 text-center">
                                                            {item.is_pph4 ? <span className="inline-flex py-1 px-2 rounded bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold">TRUE</span> : <span className="inline-flex py-1 px-2 rounded bg-gray-50 text-gray-400 border border-gray-200 text-xs">FALSE</span>}
                                                        </td>
                                                        <td className="px-6 py-3 text-center">
                                                            {item.status === 'Data Baru' ? (
                                                                <span className="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                                                                    Data Baru
                                                                </span>
                                                            ) : item.status === 'Perlu Update' ? (
                                                                <span className="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                                                                    Perlu Update
                                                                </span>
                                                            ) : (
                                                                <span className="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                                                                    Sudah Ada
                                                                </span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                                                        {rekeningLoading ? 'Sedang menarik data dari ARKAS...' : (searchRekening ? 'Tidak ada data yang cocok dengan pencarian.' : 'Klik "Tarik Data" untuk memuat daftar rekening belanja.')}
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </div>

            {/* Modal Konfirmasi & Progress untuk Sync */}
            <Modal show={showSyncModal} onClose={() => !isSyncingConfirm && setShowSyncModal(false)} maxWidth="md">
                <div className="p-6">
                    {!isSyncingConfirm ? (
                        <>
                            <h2 className="text-lg font-medium text-gray-900">Konfirmasi Sinkronisasi</h2>
                            <p className="mt-2 text-sm text-gray-600">
                                Anda akan menyimpan seluruh data {syncTipe === 'kegiatan' ? 'Kegiatan' : 'Rekening Belanja'} ARKAS yang berstatus "Data Baru" ke dalam database SIKAS lokal Anda.
                            </p>
                            <p className="mt-2 text-sm font-semibold text-amber-600">
                                Lanjutkan sinkronisasi?
                            </p>
                            <div className="mt-6 flex justify-end gap-3">
                                <SecondaryButton onClick={() => setShowSyncModal(false)}>Batal</SecondaryButton>
                                <PrimaryButton onClick={confirmSync} className="bg-emerald-600 hover:bg-emerald-700">Ya, Sinkronkan</PrimaryButton>
                            </div>
                        </>
                    ) : (
                        <div className="text-center py-4">
                            <h2 className="text-lg font-medium text-gray-900 mb-4">Menyinkronkan ke Database...</h2>
                            
                            {/* Progress Bar Container */}
                            <div className="w-full bg-gray-200 rounded-full h-4 mb-2 overflow-hidden">
                                <div 
                                    className="bg-emerald-600 h-4 rounded-full transition-all duration-300 ease-out flex items-center justify-center"
                                    style={{ width: `${syncProgress}%` }}
                                >
                                </div>
                            </div>
                            
                            <p className="text-sm font-semibold text-emerald-600 mb-4">
                                {syncProgress}% Selesai
                            </p>
                            <p className="text-xs text-gray-500">
                                Mohon tunggu sebentar, sedang menyimpan data...
                            </p>
                        </div>
                    )}
                </div>
            </Modal>
        </AuthenticatedLayout>
    );
}
