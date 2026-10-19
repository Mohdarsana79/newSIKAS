import React, { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import TextInput from '@/Components/TextInput';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import Modal from '@/Components/Modal';
import axios from 'axios';

interface PaginatedData {
    data: any[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
}

interface Props {
    auth: any;
    initialData?: PaginatedData;
    defaultYear?: string;
    localStats?: {
        total: number;
        perYear: Record<string, number>;
    };
}

export default function Index({ auth, initialData, defaultYear = '2026', localStats }: Props) {
    const [keyword, setKeyword] = useState('');
    const [year, setYear] = useState(defaultYear);
    const [results, setResults] = useState<any[]>(initialData?.data || []);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [dataSource, setDataSource] = useState<'local' | 'arkas'>('local');

    // Pagination state for local database
    const [currentPage, setCurrentPage] = useState(initialData?.current_page || 1);
    const [lastPage, setLastPage] = useState(initialData?.last_page || 1);
    const [totalItems, setTotalItems] = useState(initialData?.total || 0);
    const [perPage, setPerPage] = useState(initialData?.per_page || 50);
    const [fromItem, setFromItem] = useState(initialData?.from || 0);
    const [toItem, setToItem] = useState(initialData?.to || 0);

    // Summary counts for ARKAS fetch
    const [summary, setSummary] = useState<{
        total: number;
        data_baru: number;
        perlu_update: number;
        sudah_ada: number;
    } | null>(null);
    const [canSync, setCanSync] = useState(false);
    const [isEmptyDb, setIsEmptyDb] = useState(localStats ? localStats.total === 0 : false);

    // Modal state for Fetch All from ARKAS
    const [showFetchModal, setShowFetchModal] = useState(false);
    const [fetchProgress, setFetchProgress] = useState(0);
    const [isFetchingAll, setIsFetchingAll] = useState(false);

    // Modal state for Sync to Local Database
    const [showSyncModal, setShowSyncModal] = useState(false);
    const [syncProgress, setSyncProgress] = useState(0);
    const [isSyncing, setIsSyncing] = useState(false);

    // Loading export state
    const [isExporting, setIsExporting] = useState(false);

    // Memuat data dari database lokal dengan paginasi
    const loadPage = async (page: number, targetYear = year, targetKeyword = keyword, targetPerPage = perPage) => {
        setLoading(true);
        setError('');

        try {
            const url = `/arkas-tools/search?page=${page}&year=${encodeURIComponent(targetYear)}&keyword=${encodeURIComponent(targetKeyword)}&per_page=${targetPerPage}`;
            const res = await fetch(url, {
                headers: { 'Accept': 'application/json' }
            });
            const data = await res.json();

            if (data.status === 'success') {
                setResults(data.data || []);
                setCurrentPage(data.current_page || 1);
                setLastPage(data.last_page || 1);
                setTotalItems(data.total || 0);
                setFromItem(data.from || 0);
                setToItem(data.to || 0);
                setDataSource('local');
                setIsEmptyDb(data.is_empty_db || false);
                setCanSync(false); // Data dari database lokal selalu berstatus 'Sudah Ada'
                setSummary(null);
            } else {
                setError(data.message || 'Gagal memuat data dari database.');
            }
        } catch (err) {
            setError('Gagal menghubungi server database.');
        } finally {
            setLoading(false);
        }
    };

    // Handler saat submit pencarian
    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        loadPage(1, year, keyword, perPage);
    };

    // Handler saat mengganti tahun
    const handleYearChange = (newYear: string) => {
        setYear(newYear);
        loadPage(1, newYear, keyword, perPage);
    };

    // Handler saat mengganti jumlah per halaman
    const handlePerPageChange = (newPerPage: number) => {
        setPerPage(newPerPage);
        loadPage(1, year, keyword, newPerPage);
    };

    // Trigger modal penarikan data dari file ARKAS
    const triggerFetchAll = () => {
        setShowFetchModal(true);
        setFetchProgress(0);
        setIsFetchingAll(false);
    };

    // Konfirmasi penarikan data dari ARKAS
    const confirmFetchAll = async () => {
        setIsFetchingAll(true);
        setLoading(true);
        setError('');
        setResults([]);
        setKeyword(''); // Reset pencarian

        let currentProgress = 0;
        const interval = setInterval(() => {
            currentProgress += 1;
            if (currentProgress >= 95) currentProgress = 95;
            setFetchProgress(currentProgress);
        }, 50);

        try {
            const res = await fetch(`/arkas-tools/fetch-arkas?keyword=__ALL__&year=${encodeURIComponent(year)}`, {
                headers: { 'Accept': 'application/json' }
            });
            const data = await res.json();

            clearInterval(interval);
            setFetchProgress(100);

            await new Promise(r => setTimeout(r, 500));

            if (data.status === 'success') {
                setResults(data.data || []);
                setDataSource('arkas');
                setSummary(data.summary || null);
                setCanSync(data.can_sync || false);
                setIsEmptyDb(false);
            } else {
                setError(data.message || 'Terjadi kesalahan saat menarik data dari ARKAS');
            }
        } catch (err) {
            clearInterval(interval);
            setError('Gagal menghubungi engine ARKAS.');
        } finally {
            setLoading(false);
            setShowFetchModal(false);
            setIsFetchingAll(false);
        }
    };

    // Trigger modal konfirmasi sinkronisasi ke database lokal
    const triggerSync = () => {
        setShowSyncModal(true);
        setSyncProgress(0);
        setIsSyncing(false);
    };

    // Konfirmasi eksekusi sinkronisasi ke database lokal
    const confirmSync = async () => {
        setIsSyncing(true);

        let currentProgress = 0;
        const interval = setInterval(() => {
            currentProgress += 1;
            if (currentProgress >= 95) currentProgress = 95;
            setSyncProgress(currentProgress);
        }, 60);

        try {
            const res = await axios.post('/arkas-tools/sync', {
                year: year
            });
            const data = res.data;

            clearInterval(interval);
            setSyncProgress(100);

            await new Promise(r => setTimeout(r, 500));

            if (data.status === 'success') {
                alert(data.message || 'Sinkronisasi ke database berhasil.');
                // Muat ulang data terpaginasi dari database lokal
                await loadPage(1, year, '', perPage);
            } else {
                alert(data.message || 'Gagal melakukan sinkronisasi database.');
            }
        } catch (err: any) {
            clearInterval(interval);
            const errMsg = err.response?.data?.message || 'Terjadi kesalahan saat menyinkronkan database.';
            alert(errMsg);
        } finally {
            setIsSyncing(false);
            setShowSyncModal(false);
        }
    };

    // Export CSV lengkap
    const exportToCSV = async () => {
        setIsExporting(true);
        try {
            let exportData: any[] = [];

            if (dataSource === 'arkas') {
                exportData = results;
            } else {
                // Ambil seluruh data dari database lokal sesuai filter
                const res = await fetch(`/arkas-tools/search?export=1&year=${encodeURIComponent(year)}&keyword=${encodeURIComponent(keyword)}`, {
                    headers: { 'Accept': 'application/json' }
                });
                const json = await res.json();
                exportData = json.data || [];
            }

            if (exportData.length === 0) {
                alert('Tidak ada data yang dapat diekspor.');
                return;
            }

            let csvContent = "ID Barang,Nama Barang / Uraian,Kode Rekening,Rekening Belanja,Satuan,Batas Atas,Tahun,Status\r\n";

            exportData.forEach((row: any) => {
                const escapeCsvCell = (str: any) => {
                    if (str === null || str === undefined) return '""';
                    let s = String(str).replace(/"/g, '""');
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
                const tahunItem = escapeCsvCell(row.tahun);
                const statusItem = escapeCsvCell(row.status || 'Sudah Ada');

                csvContent += `${idBarang},${namaBarang},${kodeRekening},${rekening},${satuan},${batasAtas},${tahunItem},${statusItem}\r\n`;
            });

            const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);

            const link = document.createElement("a");
            link.setAttribute("href", url);
            const fileName = keyword ? `Pencarian_Barang_ARKAS_${keyword}.csv` : `Daftar_Barang_ARKAS_${year}.csv`;
            link.setAttribute("download", fileName);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (e) {
            alert('Gagal mengekspor data ke CSV.');
        } finally {
            setIsExporting(false);
        }
    };

    // Generator nomor halaman pintar
    const renderPaginationButtons = () => {
        if (lastPage <= 1) return null;

        const pages: (number | string)[] = [];
        const maxVisible = 5;

        if (lastPage <= 7) {
            for (let i = 1; i <= lastPage; i++) pages.push(i);
        } else {
            pages.push(1);
            if (currentPage > 3) pages.push('...');

            const start = Math.max(2, currentPage - 1);
            const end = Math.min(lastPage - 1, currentPage + 1);

            for (let i = start; i <= end; i++) {
                pages.push(i);
            }

            if (currentPage < lastPage - 2) pages.push('...');
            pages.push(lastPage);
        }

        return (
            <div className="flex items-center gap-1">
                {/* Tombol Sebelumnya */}
                <button
                    onClick={() => currentPage > 1 && loadPage(currentPage - 1)}
                    disabled={currentPage === 1 || loading}
                    className="px-3 py-1.5 rounded text-xs font-medium border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                    &laquo; Sebelumnya
                </button>

                {/* Tombol Angka Halaman */}
                {pages.map((p, idx) => {
                    if (p === '...') {
                        return (
                            <span key={`dots-${idx}`} className="px-2 py-1 text-xs text-gray-400">
                                ...
                            </span>
                        );
                    }
                    const isCurrent = p === currentPage;
                    return (
                        <button
                            key={`page-${p}`}
                            onClick={() => typeof p === 'number' && loadPage(p)}
                            disabled={loading}
                            className={`min-w-[32px] px-2 py-1.5 rounded text-xs font-semibold transition ${
                                isCurrent
                                    ? 'bg-indigo-600 text-white shadow-sm'
                                    : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                            }`}
                        >
                            {p}
                        </button>
                    );
                })}

                {/* Tombol Berikutnya */}
                <button
                    onClick={() => currentPage < lastPage && loadPage(currentPage + 1)}
                    disabled={currentPage === lastPage || loading}
                    className="px-3 py-1.5 rounded text-xs font-medium border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                    Berikutnya &raquo;
                </button>
            </div>
        );
    };

    return (
        <AuthenticatedLayout
            header={<h2 className="font-semibold text-xl text-gray-800 leading-tight">Arkas Tools: Pencarian & Sinkronisasi Barang</h2>}
        >
            <Head title="Arkas Tools" />

            <div className="py-12">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">

                    {/* Banner info jika database lokal masih kosong */}
                    {isEmptyDb && (
                        <div className="bg-amber-50 border-l-4 border-amber-400 p-4 mb-6 rounded-r-lg shadow-sm">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                    <div className="flex-shrink-0">
                                        <svg className="h-5 w-5 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-sm font-medium text-amber-800">
                                            Database lokal SIKAS belum memiliki data referensi barang ARKAS.
                                        </p>
                                        <p className="text-xs text-amber-700 mt-0.5">
                                            Silakan klik tombol <strong>"Tarik Data"</strong> untuk memeriksa data dari ARKAS, lalu klik <strong>"Sync Database"</strong> untuk menyimpannya ke database lokal.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg p-6">

                        {/* Form Pencarian & Tombol Aksi */}
                        <form onSubmit={handleSearch} className="flex flex-col lg:flex-row gap-4 items-end mb-6">

                            {/* Input Keyword */}
                            <div className="flex-1 w-full">
                                <InputLabel value="Cari Uraian / Nama Barang" className="text-gray-700 font-medium" />
                                <TextInput
                                    className="w-full mt-1 text-gray-900"
                                    placeholder="Ketik nama barang... (tekan enter atau klik Cari)"
                                    value={keyword}
                                    onChange={(e) => setKeyword(e.target.value)}
                                    autoFocus
                                />
                            </div>

                            {/* Pilihan Tahun */}
                            <div className="w-full lg:w-44">
                                <InputLabel value="Tahun Anggaran" className="text-gray-700 font-medium" />
                                <select
                                    value={year}
                                    onChange={(e) => handleYearChange(e.target.value)}
                                    className="w-full mt-1 border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 rounded-md shadow-sm text-sm"
                                >
                                    <option value="2026">Tahun 2026</option>
                                    <option value="2025">Tahun 2025</option>
                                    <option value="2024">Tahun 2024</option>
                                    <option value="ALL">Semua Tahun</option>
                                </select>
                            </div>

                            {/* Tombol-tombol Aksi */}
                            <div className="flex flex-wrap gap-2 h-10 items-center">

                                {/* Tombol Cari */}
                                <PrimaryButton type="submit" disabled={loading}>
                                    {loading && !isFetchingAll ? 'Memuat...' : 'Cari'}
                                </PrimaryButton>

                                {/* Tombol Tarik Data dari ARKAS */}
                                <PrimaryButton
                                    type="button"
                                    onClick={triggerFetchAll}
                                    disabled={loading || isSyncing}
                                    className="bg-indigo-600 hover:bg-indigo-700 focus:bg-indigo-700"
                                >
                                    {loading && isFetchingAll ? 'Menarik...' : 'Tarik Data'}
                                </PrimaryButton>

                                {/* Tombol Sync Database */}
                                <PrimaryButton
                                    type="button"
                                    onClick={triggerSync}
                                    disabled={loading || isSyncing || !canSync || results.length === 0}
                                    className={canSync ? "bg-emerald-600 hover:bg-emerald-700 focus:bg-emerald-700 active:bg-emerald-800" : "bg-gray-400 cursor-not-allowed"}
                                    title={!canSync ? "Semua data sudah tersinkron ke database lokal" : "Sinkronkan data ke database lokal"}
                                >
                                    {isSyncing ? 'Menyinkronkan...' : 'Sync Database'}
                                </PrimaryButton>

                                {/* Tombol Export CSV */}
                                <SecondaryButton
                                    type="button"
                                    onClick={exportToCSV}
                                    disabled={results.length === 0 || loading || isSyncing || isExporting}
                                >
                                    {isExporting ? 'Mengekspor...' : 'Export Excel (CSV)'}
                                </SecondaryButton>
                            </div>
                        </form>

                        {/* Pesan Error */}
                        {error && (
                            <div className="bg-red-50 text-red-600 p-3 rounded mb-4 text-sm border border-red-200">
                                {error}
                            </div>
                        )}

                        {/* Summary Badges jika data ditarik dari ARKAS */}
                        {summary && (
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                                <div className="text-center p-2 bg-white rounded shadow-sm border border-gray-100">
                                    <div className="text-xs text-gray-500 font-medium uppercase">Total Ditemukan</div>
                                    <div className="text-xl font-bold text-gray-800">{summary.total.toLocaleString('id-ID')}</div>
                                </div>
                                <div className="text-center p-2 bg-white rounded shadow-sm border border-gray-100">
                                    <div className="text-xs text-emerald-600 font-medium uppercase">Data Baru</div>
                                    <div className="text-xl font-bold text-emerald-600">{summary.data_baru.toLocaleString('id-ID')}</div>
                                </div>
                                <div className="text-center p-2 bg-white rounded shadow-sm border border-gray-100">
                                    <div className="text-xs text-amber-600 font-medium uppercase">Perlu Update</div>
                                    <div className="text-xl font-bold text-amber-600">{summary.perlu_update.toLocaleString('id-ID')}</div>
                                </div>
                                <div className="text-center p-2 bg-white rounded shadow-sm border border-gray-100">
                                    <div className="text-xs text-gray-500 font-medium uppercase">Sudah Ada</div>
                                    <div className="text-xl font-bold text-gray-600">{summary.sudah_ada.toLocaleString('id-ID')}</div>
                                </div>
                            </div>
                        )}

                        {/* Info Bar Jumlah Data & Status Sumber */}
                        <div className="mb-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-sm text-gray-600 font-medium">
                            <div>
                                {dataSource === 'local' ? (
                                    <>
                                        Menampilkan <span className="font-bold text-indigo-600">{fromItem || 0} – {toItem || 0}</span> dari{' '}
                                        <span className="font-bold text-indigo-600">{totalItems.toLocaleString('id-ID')}</span> data barang di database lokal
                                        {year !== 'ALL' ? ` (Tahun ${year})` : ' (Semua Tahun)'}
                                    </>
                                ) : (
                                    <>
                                        Ditemukan <span className="font-bold text-indigo-600">{summary ? summary.total.toLocaleString('id-ID') : results.length.toLocaleString('id-ID')}</span> data dari ARKAS Engine
                                        {summary && results.length < summary.total && (
                                            <span className="text-xs text-gray-500 ml-1">
                                                (Menampilkan {results.length} data prioritas baru/update & sampel)
                                            </span>
                                        )}
                                    </>
                                )}
                            </div>

                            <div className="flex items-center gap-3">
                                {dataSource === 'local' && (
                                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                        <span>Tampilkan:</span>
                                        <select
                                            value={perPage}
                                            onChange={(e) => handlePerPageChange(Number(e.target.value))}
                                            className="py-1 px-2 text-xs border-gray-300 rounded shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                                        >
                                            <option value={50}>50</option>
                                            <option value={100}>100</option>
                                            <option value={200}>200</option>
                                        </select>
                                        <span>baris</span>
                                    </div>
                                )}

                                {!canSync && results.length > 0 && (
                                    <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                        </svg>
                                        Database Lokal Sinkron
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Tabel Data Barang */}
                        <div className="overflow-x-auto border rounded-lg border-gray-200 max-h-[600px] custom-scrollbar">
                            <table className="min-w-full divide-y divide-gray-200 text-sm">
                                <thead className="bg-gray-50 sticky top-0 shadow-sm z-10">
                                    <tr>
                                        <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase">ID Barang</th>
                                        <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase">Nama Barang / Uraian</th>
                                        <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase">Kode Rekening</th>
                                        <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase">Rekening Belanja</th>
                                        <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase">Satuan</th>
                                        <th className="px-6 py-3 text-center font-medium text-gray-500 uppercase">Tahun</th>
                                        <th className="px-6 py-3 text-right font-medium text-gray-500 uppercase">Batas Atas</th>
                                        <th className="px-6 py-3 text-center font-medium text-gray-500 uppercase">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {results.length > 0 ? (
                                        results.map((item: any, i) => (
                                            <tr key={i} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500 font-mono">{item.id_barang}</td>
                                                <td className="px-6 py-4 text-gray-900 font-medium">{item.nama_barang}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                                                    {item.kode_rekening ? item.kode_rekening : <span className="text-gray-400 italic">none</span>}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                                                    {item.rekening ? item.rekening : <span className="text-gray-400 italic">none</span>}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-gray-700">{item.satuan}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-center font-medium text-indigo-600">{item.tahun}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right font-semibold text-gray-900">
                                                    {item.batas_atas ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(item.batas_atas) : 'Rp 0'}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-center">
                                                    {item.status === 'Data Baru' ? (
                                                        <span className="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                                            Data Baru
                                                        </span>
                                                    ) : item.status === 'Perlu Update' ? (
                                                        <span className="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                                                            Perlu Update
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 border border-gray-200">
                                                            Sudah Ada
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                                                {loading ? 'Sedang memuat data...' : 'Tidak ada data barang yang ditemukan.'}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Navigasi Paginasi Server-side jika di mode database lokal */}
                        {dataSource === 'local' && totalItems > 0 && (
                            <div className="mt-4 flex flex-col sm:flex-row justify-between items-center gap-3 pt-3 border-t border-gray-200">
                                <div className="text-xs text-gray-500">
                                    Halaman <span className="font-semibold text-gray-700">{currentPage}</span> dari{' '}
                                    <span className="font-semibold text-gray-700">{lastPage.toLocaleString('id-ID')}</span>
                                </div>
                                {renderPaginationButtons()}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Modal Konfirmasi Tarik Data dari ARKAS */}
            <Modal show={showFetchModal} onClose={() => !isFetchingAll && setShowFetchModal(false)} maxWidth="md">
                <div className="p-6">
                    {!isFetchingAll ? (
                        <>
                            <h2 className="text-lg font-medium text-gray-900">Konfirmasi Tarik Data ARKAS</h2>
                            <p className="mt-2 text-sm text-gray-600">
                                Anda akan menarik referensi barang ARKAS untuk <strong>{year === 'ALL' ? 'Semua Tahun (2024-2026, ~76.000 data)' : `Tahun ${year}`}</strong> langsung dari file database ARKAS lokal Anda.
                            </p>
                            <p className="mt-2 text-sm font-semibold text-indigo-600">
                                Lanjutkan penarikan data?
                            </p>
                            <div className="mt-6 flex justify-end gap-3">
                                <SecondaryButton onClick={() => setShowFetchModal(false)}>Batal</SecondaryButton>
                                <PrimaryButton onClick={confirmFetchAll} className="bg-indigo-600 hover:bg-indigo-700">Ya, Tarik Data</PrimaryButton>
                            </div>
                        </>
                    ) : (
                        <div className="text-center py-4">
                            <h2 className="text-lg font-medium text-gray-900 mb-4">Menarik Data dari ARKAS...</h2>
                            <div className="w-full bg-gray-200 rounded-full h-4 mb-2 overflow-hidden">
                                <div
                                    className="bg-indigo-600 h-4 rounded-full transition-all duration-300 ease-out"
                                    style={{ width: `${fetchProgress}%` }}
                                >
                                </div>
                            </div>
                            <p className="text-sm font-semibold text-indigo-600 mb-4">
                                {fetchProgress}% Selesai
                            </p>
                            <p className="text-xs text-gray-500">
                                Mohon tunggu sebentar, sedang membaca database ARKAS...
                            </p>
                        </div>
                    )}
                </div>
            </Modal>

            {/* Modal Konfirmasi Sinkronisasi Database */}
            <Modal show={showSyncModal} onClose={() => !isSyncing && setShowSyncModal(false)} maxWidth="md">
                <div className="p-6">
                    {!isSyncing ? (
                        <>
                            <h2 className="text-lg font-medium text-gray-900">Konfirmasi Sinkronisasi Database</h2>
                            <p className="mt-2 text-sm text-gray-600">
                                Anda akan menyinkronkan seluruh data barang berstatus <strong>"Data Baru"</strong> dan <strong>"Perlu Update"</strong> ke database lokal PostgreSQL SIKAS.
                            </p>
                            {summary && (
                                <div className="mt-3 p-3 bg-gray-50 rounded text-xs text-gray-700 space-y-1">
                                    <div>• Data Baru yang akan ditambahkan: <strong>{summary.data_baru.toLocaleString('id-ID')}</strong></div>
                                    <div>• Data yang akan diperbarui: <strong>{summary.perlu_update.toLocaleString('id-ID')}</strong></div>
                                </div>
                            )}
                            <p className="mt-3 text-sm font-semibold text-emerald-600">
                                Apakah Anda yakin ingin melanjutkan sinkronisasi?
                            </p>
                            <div className="mt-6 flex justify-end gap-3">
                                <SecondaryButton onClick={() => setShowSyncModal(false)}>Batal</SecondaryButton>
                                <PrimaryButton onClick={confirmSync} className="bg-emerald-600 hover:bg-emerald-700">Ya, Sinkronkan</PrimaryButton>
                            </div>
                        </>
                    ) : (
                        <div className="text-center py-4">
                            <h2 className="text-lg font-medium text-gray-900 mb-4">Menyinkronkan ke Database Lokal...</h2>
                            <div className="w-full bg-gray-200 rounded-full h-4 mb-2 overflow-hidden">
                                <div
                                    className="bg-emerald-600 h-4 rounded-full transition-all duration-300 ease-out"
                                    style={{ width: `${syncProgress}%` }}
                                >
                                </div>
                            </div>
                            <p className="text-sm font-semibold text-emerald-600 mb-4">
                                {syncProgress}% Selesai
                            </p>
                            <p className="text-xs text-gray-500">
                                Mohon tunggu sebentar, sedang menyimpan puluhan ribu data ke PostgreSQL...
                            </p>
                        </div>
                    )}
                </div>
            </Modal>
        </AuthenticatedLayout>
    );
}
