import React, { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import TextInput from '@/Components/TextInput';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import Modal from '@/Components/Modal';

export default function Index({ auth }: any) {
    const [keyword, setKeyword] = useState('');
    const [year, setYear] = useState('2026');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Modal state
    const [showModal, setShowModal] = useState(false);
    const [progress, setProgress] = useState(0);
    const [isFetchingAll, setIsFetchingAll] = useState(false);

    const handleSearch = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (keyword.length < 3) {
            setError('Minimal 3 karakter.');
            return;
        }

        setLoading(true);
        setError('');
        setResults([]);

        try {
            const res = await fetch(`/arkas-tools/search?keyword=${encodeURIComponent(keyword)}&year=${encodeURIComponent(year)}`, {
                headers: {
                    'Accept': 'application/json',
                }
            });
            const data = await res.json();
            
            if (data.status === 'success') {
                setResults(data.data);
            } else {
                setError(data.message || 'Terjadi kesalahan server');
            }
        } catch (err) {
            setError('Gagal menghubungi server.');
        } finally {
            setLoading(false);
        }
    };

    const triggerFetchAll = () => {
        setShowModal(true);
        setProgress(0);
        setIsFetchingAll(false);
    };

    const confirmFetchAll = async () => {
        setIsFetchingAll(true);
        setLoading(true);
        setError('');
        setResults([]);
        setKeyword(''); // Clear search keyword

        // Fake progress smooth animation: 1% every 50ms (takes ~5 seconds to reach 99%)
        let currentProgress = 0;
        const interval = setInterval(() => {
            currentProgress += 1; 
            if (currentProgress >= 99) {
                currentProgress = 99; // cap at 99% until backend finishes
            }
            setProgress(currentProgress);
        }, 50);

        try {
            const res = await fetch(`/arkas-tools/search?keyword=__ALL__&year=${encodeURIComponent(year)}`, {
                headers: {
                    'Accept': 'application/json',
                }
            });
            const data = await res.json();
            
            clearInterval(interval);
            setProgress(100);

            // Wait briefly so user sees 100%
            await new Promise(r => setTimeout(r, 600));

            if (data.status === 'success') {
                setResults(data.data);
            } else {
                setError(data.message || 'Terjadi kesalahan server');
            }
        } catch (err) {
            clearInterval(interval);
            setError('Gagal menghubungi server.');
        } finally {
            setLoading(false);
            setShowModal(false);
            setIsFetchingAll(false);
        }
    };

    const exportToCSV = () => {
        if (results.length === 0) return;

        let csvContent = "ID Barang,Nama Barang / Uraian,Kode Rekening,Rekening Belanja,Satuan,Batas Atas,Tahun\r\n";
        
        results.forEach((row: any) => {
            // Helper untuk mencegah Excel Formula Injection (#NAME?) dan escape quote
            const escapeCsvCell = (str: any) => {
                if (str === null || str === undefined) return '""';
                let s = String(str).replace(/"/g, '""');
                // Jika diawali dengan karakter formula Excel, tambahkan spasi di depannya
                if (/^[=\+\-@]/.test(s)) {
                    s = ' ' + s;
                }
                return `"${s}"`;
            };

            const idBarang = escapeCsvCell(row.id_barang);
            const namaBarang = escapeCsvCell(row.nama_barang);
            const kodeRekening = escapeCsvCell(row.kode_rekening);
            const rekening = escapeCsvCell(row.rekening);
            const satuan = escapeCsvCell(row.satuan);
            const batasAtas = escapeCsvCell(row.batas_atas || '0');
            const tahun = escapeCsvCell(row.tahun);
            
            csvContent += `${idBarang},${namaBarang},${kodeRekening},${rekening},${satuan},${batasAtas},${tahun}\r\n`;
        });

        // Use Blob instead of Data URI to handle huge files (>2MB)
        const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement("a");
        link.setAttribute("href", url);
        const fileName = keyword && keyword !== '__ALL__' ? `Pencarian_Barang_ARKAS_${keyword}.csv` : 'Seluruh_Barang_ARKAS.csv';
        link.setAttribute("download", fileName);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    return (
        <AuthenticatedLayout
            header={<h2 className="font-semibold text-xl text-gray-800 leading-tight">Arkas Tools: Pencarian Barang</h2>}
        >
            <Head title="Arkas Tools" />

            <div className="py-12">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg p-6">
                        <form onSubmit={handleSearch} className="flex gap-4 items-end mb-6">
                            <div className="flex-1">
                                <InputLabel value="Cari Uraian/Barang" />
                                <TextInput
                                    className="w-full mt-1"
                                    placeholder="Contoh: kertas HVS"
                                    value={keyword}
                                    onChange={(e) => setKeyword(e.target.value)}
                                    autoFocus
                                />
                            </div>

                            <div className="flex gap-2 mb-1 h-10">
                                <PrimaryButton type="submit" disabled={loading || keyword.length < 3}>
                                    {loading && !isFetchingAll ? 'Mencari...' : 'Cari'}
                                </PrimaryButton>
                                <PrimaryButton type="button" onClick={triggerFetchAll} disabled={loading} className="bg-emerald-600 hover:bg-emerald-700">
                                    {loading && isFetchingAll ? 'Menarik...' : 'Tarik Data'}
                                </PrimaryButton>
                                <SecondaryButton type="button" onClick={exportToCSV} disabled={results.length === 0 || loading}>
                                    Export Excel (CSV)
                                </SecondaryButton>
                            </div>
                        </form>

                        {error && (
                            <div className="bg-red-50 text-red-600 p-3 rounded mb-4 text-sm border border-red-200">
                                {error}
                            </div>
                        )}

                        {!loading && !error && results.length > 0 && (
                            <div className="mb-3 flex justify-between items-center text-sm text-gray-600 font-medium">
                                <div>Ditemukan <span className="font-bold text-indigo-600">{results.length}</span> data referensi barang</div>
                            </div>
                        )}

                        <div className="overflow-x-auto border rounded-lg border-gray-200 max-h-[600px] custom-scrollbar">
                            <table className="min-w-full divide-y divide-gray-200 text-sm">
                                <thead className="bg-gray-50 sticky top-0 shadow-sm">
                                    <tr>
                                        <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase">ID Barang</th>
                                        <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase">Nama Barang / Uraian</th>
                                        <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase">Kode Rekening</th>
                                        <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase">Rekening Belanja</th>
                                        <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase">Satuan</th>
                                        <th className="px-6 py-3 text-center font-medium text-gray-500 uppercase">Tahun</th>
                                        <th className="px-6 py-3 text-right font-medium text-gray-500 uppercase">Batas Atas</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {results.length > 0 ? (
                                        results.slice(0, 1000).map((item: any, i) => (
                                            <tr key={i} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500 font-mono">{item.id_barang}</td>
                                                <td className="px-6 py-4">{item.nama_barang}</td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    {item.kode_rekening ? item.kode_rekening : <span className="text-gray-400 italic">none</span>}
                                                </td>
                                                <td className="px-6 py-4">
                                                    {item.rekening ? item.rekening : <span className="text-gray-400 italic">none</span>}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">{item.satuan}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-center font-medium text-indigo-600">{item.tahun}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right">
                                                    {item.batas_atas ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(item.batas_atas) : '0'}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                                                {loading ? 'Sedang memuat data...' : 'Tidak ada data. Silakan lakukan pencarian.'}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        {results.length > 1000 && keyword === '__ALL__' && (
                            <p className="text-xs text-gray-500 mt-2 text-right">
                                *Menampilkan 1000 hasil pertama dari total {results.length} data untuk menjaga performa (mencegah browser lag). Gunakan tombol "Export Excel" untuk melihat seluruh data.
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* Modal Konfirmasi & Progress */}
            <Modal show={showModal} onClose={() => !isFetchingAll && setShowModal(false)} maxWidth="md">
                <div className="p-6">
                    {!isFetchingAll ? (
                        <>
                            <h2 className="text-lg font-medium text-gray-900">Konfirmasi Tarik Data</h2>
                            <p className="mt-2 text-sm text-gray-600">
                                Anda akan menarik seluruh referensi barang ARKAS dari semua tahun (sekitar ~75.000+ baris data).
                                Proses ini mungkin akan memakan waktu hingga beberapa detik.
                            </p>
                            <p className="mt-2 text-sm font-semibold text-amber-600">
                                Apakah Anda yakin ingin melanjutkan?
                            </p>
                            <div className="mt-6 flex justify-end gap-3">
                                <SecondaryButton onClick={() => setShowModal(false)}>Batal</SecondaryButton>
                                <PrimaryButton onClick={confirmFetchAll} className="bg-emerald-600 hover:bg-emerald-700">Ya, Tarik Data</PrimaryButton>
                            </div>
                        </>
                    ) : (
                        <div className="text-center py-4">
                            <h2 className="text-lg font-medium text-gray-900 mb-4">Menarik Data dari ARKAS...</h2>
                            
                            {/* Progress Bar Container */}
                            <div className="w-full bg-gray-200 rounded-full h-4 mb-2 overflow-hidden">
                                <div 
                                    className="bg-emerald-600 h-4 rounded-full transition-all duration-300 ease-out flex items-center justify-center"
                                    style={{ width: `${progress}%` }}
                                >
                                </div>
                            </div>
                            
                            <p className="text-sm font-semibold text-emerald-600 mb-4">
                                {progress}% Selesai
                            </p>
                            <p className="text-xs text-gray-500">
                                Mohon tunggu sebentar, sedang memproses ribuan data...
                            </p>
                        </div>
                    )}
                </div>
            </Modal>
        </AuthenticatedLayout>
    );
}
