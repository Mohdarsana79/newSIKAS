import React, { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import TextInput from '@/Components/TextInput';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import ArkasDiagnosticModal from '@/Components/Ai/ArkasDiagnosticModal';
import ArkasSyncModal, { ArkasSyncCompletePayload } from '@/Components/Arkas/ArkasSyncModal';
import ArkasYearSelect from '@/Components/Arkas/ArkasYearSelect';
import { Brain, Sparkles, Database, ShieldCheck, AlertTriangle, ArrowRight, RotateCw, FileSearch, CheckCircle2, ShieldAlert } from 'lucide-react';
import PageHeader from '@/Components/ui/PageHeader';
import Surface from '@/Components/ui/Surface';
import DataTable from '@/Components/ui/DataTable';
import EmptyState from '@/Components/ui/EmptyState';
import IconTile from '@/Components/ui/IconTile';
import StatusBadge from '@/Components/ui/StatusBadge';
import PillTabs from '@/Components/ui/PillTabs';

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
    activeYears?: string[];
    localStats?: {
        total: number;
        perYear: Record<string, number>;
    };
}

export default function Index({ auth, initialData, defaultYear = '2026', activeYears, localStats }: Props) {
    const resolvedActiveYears = activeYears && activeYears.length > 0 ? activeYears : [defaultYear];
    const [keyword, setKeyword] = useState('');
    const [year, setYear] = useState(defaultYear);
    const [results, setResults] = useState<any[]>(initialData?.data || []);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Pagination state for local database
    const [currentPage, setCurrentPage] = useState(initialData?.current_page || 1);
    const [lastPage, setLastPage] = useState(initialData?.last_page || 1);
    const [totalItems, setTotalItems] = useState(initialData?.total || 0);
    const [perPage, setPerPage] = useState(initialData?.per_page || 50);
    const [fromItem, setFromItem] = useState(initialData?.from || 0);
    const [toItem, setToItem] = useState(initialData?.to || 0);

    // Hasil sinkronisasi terakhir & status DB lokal
    const [lastSyncResult, setLastSyncResult] = useState<ArkasSyncCompletePayload | null>(null);
    const [isEmptyDb, setIsEmptyDb] = useState(localStats ? localStats.total === 0 : false);

    // Modal state for Sync to Local Database
    const [showSyncModal, setShowSyncModal] = useState(false);

    // Loading export state
    const [isExporting, setIsExporting] = useState(false);

    // Phase 3: AI Diagnostic Tab & Modal
    const [activeMainTab, setActiveMainTab] = useState<'katalog' | 'diagnosa'>('katalog');
    const [isAiModalOpen, setIsAiModalOpen] = useState(false);

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
                setIsEmptyDb(data.is_empty_db || false);
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

    // Handler selesai sinkronisasi langsung dari modal Neo-Bento
    const handleSyncComplete = (result: ArkasSyncCompletePayload) => {
        setLastSyncResult(result);
        setYear(result.targetYear);
        setKeyword('');
        loadPage(1, result.targetYear, '', perPage);
    };

    // Export CSV lengkap dari database lokal terindeks
    const exportToCSV = async () => {
        setIsExporting(true);
        try {
            const res = await fetch(`/arkas-tools/search?export=1&year=${encodeURIComponent(year)}&keyword=${encodeURIComponent(keyword)}`, {
                headers: { 'Accept': 'application/json' }
            });
            const json = await res.json();
            const exportData: any[] = json.data || [];

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
                    className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-extrabold text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
                >
                    &laquo; Sebelumnya
                </button>

                {/* Tombol Angka Halaman */}
                {pages.map((p, idx) => {
                    if (p === '...') {
                        return (
                            <span key={`dots-${idx}`} className="px-1 text-[10px] font-bold text-slate-300 dark:text-slate-600">
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
                            className={`flex h-7 min-w-7 items-center justify-center rounded-xl px-2 text-[10px] font-extrabold transition text-sikas-num ${
                                isCurrent
                                    ? 'bg-lime-400 text-slate-950 shadow-lime'
                                    : 'text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-white/5'
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
                    className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-extrabold text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
                >
                    Berikutnya &raquo;
                </button>
            </div>
        );
    };

    return (
        <AuthenticatedLayout>
            <Head title="Arkas Tools" />

            <div className="space-y-4">
                <PageHeader
                    className="animate-rise"
                    breadcrumb={[
                        { label: 'Dashboard' },
                        { label: 'Arkas Tools' },
                        { label: 'Katalog Barang' },
                    ]}
                    title="Arkas Tools"
                    badge={<StatusBadge tone="violet" dot={false}>Integrasi ARKAS</StatusBadge>}
                    subtitle="Pencarian dan sinkronisasi langsung referensi barang dari database ARKAS ke SIKAS."
                />

                {/* Tab Switcher: Katalog Barang vs Diagnosa AI */}
                <div className="animate-rise" style={{ animationDelay: '60ms' }}>
                    <Surface padding="sm">
                        <PillTabs
                            ariaLabel="Tab Arkas Tools"
                            variant="soft"
                            value={activeMainTab}
                            items={[
                                {
                                    key: 'katalog',
                                    label: (
                                        <span className="flex items-center gap-1.5">
                                            <Database className="w-4 h-4" />
                                            Katalog & Sinkronisasi Barang
                                        </span>
                                    ),
                                },
                                {
                                    key: 'diagnosa',
                                    label: (
                                        <span className="flex items-center gap-1.5">
                                            <Brain className="w-4 h-4" />
                                            Pusat Diagnosa & Rekonsiliasi AI
                                        </span>
                                    ),
                                    badge: <span className="ml-1.5 rounded-full bg-brand-500/10 px-2 py-0.5 text-[9px] font-extrabold text-brand-600 dark:text-brand-300">DeepSeek</span>,
                                },
                            ]}
                            onChange={(key) => setActiveMainTab(key as 'katalog' | 'diagnosa')}
                        />
                    </Surface>
                </div>

                {/* Banner info jika database lokal masih kosong */}
                {isEmptyDb && (
                    <div className="animate-rise" style={{ animationDelay: '110ms' }}>
                        <div className="flex items-start gap-3 rounded-[22px] border border-amber-300/60 bg-pastel-amber/70 p-4 dark:border-amber-400/20 dark:bg-amber-400/10">
                            <IconTile tone="amber" size="sm">
                                <AlertTriangle className="h-4 w-4" />
                            </IconTile>
                            <div>
                                <p className="text-[11.5px] font-extrabold text-amber-800 dark:text-amber-200">
                                    Database lokal SIKAS belum memiliki data referensi barang ARKAS.
                                </p>
                                <p className="mt-0.5 text-[10.5px] font-medium text-amber-700 dark:text-amber-300">
                                    Silakan klik tombol <strong>"Sync Database"</strong> untuk langsung menyinkronkan referensi barang dari database ARKAS ke PostgreSQL lokal.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {activeMainTab === 'katalog' ? (
                    <div className="space-y-4">
                        {/* Kartu ringkas ringkasan data */}
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                            <div className="sikas-card sikas-card-hover animate-rise p-4" style={{ animationDelay: '110ms' }}>
                                <div className="flex items-center gap-2.5">
                                    <IconTile tone="ink" size="md">
                                        <Database className="h-5 w-5" />
                                    </IconTile>
                                    <div className="min-w-0">
                                        <p className="text-[11.5px] font-extrabold tracking-tight text-slate-900 dark:text-white">Total Ditemukan</p>
                                        <p className="text-[9.5px] font-medium text-slate-400 dark:text-slate-500">Referensi barang lokal</p>
                                    </div>
                                </div>
                                <p className="mt-3 text-sikas-num text-[19px] font-extrabold tracking-tight text-slate-900 dark:text-white">
                                    {totalItems.toLocaleString('id-ID')}
                                </p>
                            </div>
                            <div className="sikas-card sikas-card-hover animate-rise p-4" style={{ animationDelay: '150ms' }}>
                                <div className="flex items-center gap-2.5">
                                    <IconTile tone="mint" size="md">
                                        <Sparkles className="h-5 w-5" />
                                    </IconTile>
                                    <div className="min-w-0">
                                        <p className="text-[11.5px] font-extrabold tracking-tight text-slate-900 dark:text-white">Data Baru</p>
                                        <p className="text-[9.5px] font-medium text-slate-400 dark:text-slate-500">Hasil sync terakhir</p>
                                    </div>
                                </div>
                                <p className="mt-3 text-sikas-num text-[19px] font-extrabold tracking-tight text-mint">
                                    {(lastSyncResult ? lastSyncResult.synced : 0).toLocaleString('id-ID')}
                                </p>
                            </div>
                            <div className="sikas-card sikas-card-hover animate-rise p-4" style={{ animationDelay: '190ms' }}>
                                <div className="flex items-center gap-2.5">
                                    <IconTile tone="amber" size="md">
                                        <RotateCw className="h-5 w-5" />
                                    </IconTile>
                                    <div className="min-w-0">
                                        <p className="text-[11.5px] font-extrabold tracking-tight text-slate-900 dark:text-white">Diperbarui</p>
                                        <p className="text-[9.5px] font-medium text-slate-400 dark:text-slate-500">Hasil sync terakhir</p>
                                    </div>
                                </div>
                                <p className="mt-3 text-sikas-num text-[19px] font-extrabold tracking-tight text-amber-600 dark:text-amber-300">
                                    {(lastSyncResult ? lastSyncResult.updated : 0).toLocaleString('id-ID')}
                                </p>
                            </div>
                            <div className="sikas-card sikas-card-hover animate-rise p-4" style={{ animationDelay: '230ms' }}>
                                <div className="flex items-center gap-2.5">
                                    <IconTile tone="slate" size="md">
                                        <ShieldCheck className="h-5 w-5" />
                                    </IconTile>
                                    <div className="min-w-0">
                                        <p className="text-[11.5px] font-extrabold tracking-tight text-slate-900 dark:text-white">Tersinkron Lokal</p>
                                        <p className="text-[9.5px] font-medium text-slate-400 dark:text-slate-500">Siap digunakan RKAS</p>
                                    </div>
                                </div>
                                <p className="mt-3 text-sikas-num text-[19px] font-extrabold tracking-tight text-slate-600 dark:text-slate-300">
                                    {totalItems.toLocaleString('id-ID')}
                                </p>
                            </div>
                        </div>

                        {/* Form Pencarian & Tombol Aksi */}
                        <div className="relative z-20 animate-rise" style={{ animationDelay: '270ms' }}>
                            <Surface padding="sm" className="overflow-visible">
                                <form onSubmit={handleSearch} className="flex flex-col items-stretch gap-3 lg:flex-row lg:items-end">
                                    {/* Input Keyword */}
                                    <div className="w-full flex-1">
                                        <InputLabel value="Cari Uraian / Nama Barang" />
                                        <TextInput
                                            className="w-full mt-1"
                                            placeholder="Ketik nama barang... (tekan enter atau klik Cari)"
                                            value={keyword}
                                            onChange={(e) => setKeyword(e.target.value)}
                                            autoFocus
                                        />
                                    </div>

                                    {/* Pilihan Tahun Anggaran Aktif (React Select) */}
                                    <div className="w-full lg:w-52">
                                        <InputLabel htmlFor="arkas_filter_year" value="Tahun Anggaran" />
                                        <ArkasYearSelect
                                            inputId="arkas_filter_year"
                                            value={year}
                                            onChange={handleYearChange}
                                            activeYears={resolvedActiveYears}
                                            localStatsPerYear={localStats?.perYear}
                                            totalLocal={localStats?.total}
                                            className="mt-1"
                                            placeholder="Ketik / pilih tahun..."
                                        />
                                    </div>

                                    {/* Tombol-tombol Aksi */}
                                    <div className="flex min-h-10 flex-wrap items-center gap-2">
                                        {/* Tombol Cari */}
                                        <PrimaryButton type="submit" disabled={loading}>
                                            {loading ? 'Memuat...' : 'Cari'}
                                        </PrimaryButton>

                                        {/* Tombol Sync Database (Langsung tanpa tarik data ke browser) */}
                                        <PrimaryButton
                                            type="button"
                                            onClick={() => setShowSyncModal(true)}
                                            disabled={loading}
                                            title="Sinkronkan langsung referensi ARKAS ke database lokal"
                                        >
                                            Sync Database
                                        </PrimaryButton>

                                        {/* Tombol Export CSV */}
                                        <SecondaryButton
                                            type="button"
                                            onClick={exportToCSV}
                                            disabled={results.length === 0 || loading || isExporting}
                                        >
                                            {isExporting ? 'Mengekspor...' : 'Export Excel (CSV)'}
                                        </SecondaryButton>
                                    </div>
                                </form>
                            </Surface>
                        </div>

                        {/* Pesan Error */}
                        {error && (
                            <div className="rounded-2xl border border-rose-200 bg-pastel-rose/70 p-3 text-[11px] font-semibold text-rose-600 dark:border-rose-400/20 dark:bg-rose-500/10 dark:text-rose-300">
                                {error}
                            </div>
                        )}

                        {/* Info Bar Jumlah Data & Status Sumber */}
                        <div className="flex flex-col items-start justify-between gap-2 text-[10.5px] font-semibold text-slate-500 sm:flex-row sm:items-center dark:text-slate-400">
                            <div>
                                Menampilkan <span className="text-sikas-num font-extrabold text-brand-600 dark:text-brand-300">{fromItem || 0} – {toItem || 0}</span> dari{' '}
                                <span className="text-sikas-num font-extrabold text-brand-600 dark:text-brand-300">{totalItems.toLocaleString('id-ID')}</span> data barang di database lokal
                                {year !== 'ALL' ? ` (Tahun ${year})` : ' (Semua Tahun)'}
                            </div>

                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-400 dark:text-slate-500">
                                    <span>Tampilkan:</span>
                                    <select
                                        value={perPage}
                                        onChange={(e) => handlePerPageChange(Number(e.target.value))}
                                        className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[10px] font-bold text-slate-600 shadow-sm focus:border-lime-400 focus:ring-2 focus:ring-lime-200/60 dark:border-white/10 dark:bg-white/5 dark:text-slate-300"
                                    >
                                        <option value={50}>50</option>
                                        <option value={100}>100</option>
                                        <option value={200}>200</option>
                                    </select>
                                    <span>baris</span>
                                </div>

                                {results.length > 0 && (
                                    <span className="flex items-center gap-1 text-[10px] font-extrabold text-mint">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                        </svg>
                                        Database Lokal Sinkron
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Tabel Data Barang */}
                        <div className="animate-rise" style={{ animationDelay: '310ms' }}>
                            <DataTable
                                title="Daftar Referensi Barang ARKAS"
                                subtitle="Katalog barang, rekening belanja, dan batas atas harga."
                                icon={
                                    <IconTile tone="sky" size="sm">
                                        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M4 6h16M4 12h16M4 18h10" />
                                        </svg>
                                    </IconTile>
                                }
                                actions={<StatusBadge tone="info" dot={false} className="text-sikas-num">{results.length}</StatusBadge>}
                                contentClassName="bento-table-wrapper mx-4 mb-4"
                                footer={
                                    totalItems > 0 ? (
                                        <>
                                            <div className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">
                                                Halaman <span className="text-sikas-num font-extrabold text-slate-700 dark:text-slate-200">{currentPage}</span> dari{' '}
                                                <span className="text-sikas-num font-extrabold text-slate-700 dark:text-slate-200">{lastPage.toLocaleString('id-ID')}</span>
                                            </div>
                                            {renderPaginationButtons()}
                                        </>
                                    ) : undefined
                                }
                            >
                                <div className="max-h-[600px] overflow-auto">
                                    <table className="min-w-full">
                                        <thead className="sticky top-0 z-10">
                                            <tr>
                                                <th className="text-left">ID Barang</th>
                                                <th className="text-left">Nama Barang / Uraian</th>
                                                <th className="text-left">Kode Rekening</th>
                                                <th className="text-left">Rekening Belanja</th>
                                                <th className="text-left">Satuan</th>
                                                <th className="text-center">Tahun</th>
                                                <th className="text-right">Batas Atas</th>
                                                <th className="text-center">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {results.length > 0 ? (
                                                results.map((item: any, i) => (
                                                    <tr key={i}>
                                                        <td className="whitespace-nowrap font-mono font-bold text-slate-500 dark:text-slate-400">{item.id_barang}</td>
                                                        <td className="font-bold text-slate-900 dark:text-white">{item.nama_barang}</td>
                                                        <td className="whitespace-nowrap text-slate-600 dark:text-slate-300">
                                                            {item.kode_rekening ? (
                                                                item.kode_rekening
                                                            ) : item.kode_belanja === 'RBM' ? (
                                                                <span className="inline-flex rounded-md bg-pastel-sky px-2 py-0.5 text-[10px] font-bold text-sky-700 dark:bg-sky/15 dark:text-sky-300">
                                                                    Katalog Buku (RBM)
                                                                </span>
                                                            ) : (
                                                                <span className="italic text-slate-400 dark:text-slate-500">none</span>
                                                            )}
                                                        </td>
                                                        <td className="whitespace-nowrap text-slate-600 dark:text-slate-300">
                                                            {item.rekening ? (
                                                                item.rekening
                                                            ) : item.kode_belanja === 'RBM' ? (
                                                                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                                                                    Belanja Modal Buku (5.2.05.01.01.*)
                                                                </span>
                                                            ) : (
                                                                <span className="italic text-slate-400 dark:text-slate-500">none</span>
                                                            )}
                                                        </td>
                                                        <td className="whitespace-nowrap text-slate-600 dark:text-slate-300">{item.satuan}</td>
                                                        <td className="whitespace-nowrap text-center text-sikas-num font-bold text-brand-600 dark:text-brand-300">{item.tahun}</td>
                                                        <td className="whitespace-nowrap text-right text-sikas-num font-extrabold text-slate-900 dark:text-white">
                                                            {item.batas_atas ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(item.batas_atas) : 'Rp 0'}
                                                        </td>
                                                        <td className="whitespace-nowrap text-center">
                                                            <div className="inline-flex flex-wrap items-center justify-center gap-1">
                                                                {item.status === 'Data Baru' ? (
                                                                    <StatusBadge tone="success" dot={false}>Data Baru</StatusBadge>
                                                                ) : item.status === 'Perlu Update' ? (
                                                                    <StatusBadge tone="warning" dot={false}>Perlu Update</StatusBadge>
                                                                ) : (
                                                                    <StatusBadge tone="neutral" dot={false}>Sudah Ada</StatusBadge>
                                                                )}
                                                                {item.is_expired && (
                                                                    <StatusBadge tone="danger" dot={false}>Kedaluwarsa</StatusBadge>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan={8} className="p-0">
                                                        <EmptyState
                                                            className="border-0 bg-transparent py-10 dark:bg-transparent"
                                                            icon={
                                                                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                                                </svg>
                                                            }
                                                            title={loading ? 'Sedang memuat data...' : 'Tidak ada data barang yang ditemukan.'}
                                                        />
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </DataTable>
                        </div>
                    </div>
                ) : (
                    <div className="animate-rise space-y-4">
                        {/* Hero Card Diagnosa AI */}
                        <div className="relative overflow-hidden rounded-[26px] border border-white/10 bg-gradient-to-br from-[#252438] via-[#1E1D2E] to-[#15141E] p-6 text-white shadow-float sm:p-8">
                            <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-brand-500/20 blur-3xl"></div>
                            <div className="pointer-events-none absolute -bottom-20 -left-10 h-52 w-52 rounded-full bg-lime-400/10 blur-3xl"></div>
                            <div className="relative z-10 max-w-2xl">
                                <div className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-lime-400/30 bg-lime-400/10 px-3 py-1 text-[9.5px] font-extrabold uppercase tracking-[0.14em] text-lime-300">
                                    <Sparkles className="h-3.5 w-3.5" />
                                    SIKAS AI DeepSeek Suite v1.3
                                </div>
                                <h3 className="text-[22px] font-extrabold leading-tight tracking-tight text-white sm:text-[26px]">
                                    Pusat Diagnosa & Rekonsiliasi ARKAS
                                </h3>
                                <p className="mt-2 text-[11px] font-medium leading-relaxed text-slate-300">
                                    Inspeksi otomatis antara database desktop resmi ARKAS (<code className="rounded bg-black/30 px-1.5 py-0.5 font-mono text-[10px] text-lime-300">arkas.db</code>) dan pembukuan PostgreSQL SIKAS. Mencegah risiko penimpaan SPJ lokal yang tidak disengaja, mendeteksi selisih pagu RKAS, serta memandu langkah perbaikan terpadu.
                                </p>
                                <div className="mt-6 flex flex-wrap items-center gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setIsAiModalOpen(true)}
                                        className="flex items-center gap-2 rounded-2xl bg-lime-400 px-5 py-2.5 text-[11px] font-extrabold text-slate-950 shadow-lime transition hover:-translate-y-0.5 hover:bg-lime-300"
                                    >
                                        <Brain className="h-4 w-4 text-slate-950" />
                                        Jalankan Audit & Diagnosa AI Penuh
                                        <ArrowRight className="h-3.5 w-3.5 text-slate-950" />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* 3 Pilar Diagnosa */}
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                            <div className="sikas-card flex flex-col justify-between p-5">
                                <div>
                                    <IconTile tone="violet" size="md" className="mb-3">
                                        <FileSearch className="h-5 w-5" />
                                    </IconTile>
                                    <h4 className="text-[12.5px] font-extrabold text-slate-900 dark:text-white">
                                        Integritas Pagu & RKAS
                                    </h4>
                                    <p className="mt-1.5 text-[10.5px] font-medium leading-relaxed text-slate-500 dark:text-slate-400">
                                        Membandingkan pagu anggaran murni dan perubahan serta rincian kegiatan belanja agar tidak terjadi penolakan penarikan RKAS.
                                    </p>
                                </div>
                                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-[10px] font-extrabold text-brand-600 dark:border-white/5 dark:text-brand-300">
                                    <span>Deteksi Selisih Alokasi</span>
                                    <CheckCircle2 className="h-4 w-4" />
                                </div>
                            </div>

                            <div className="sikas-card flex flex-col justify-between p-5">
                                <div>
                                    <IconTile tone="rose" size="md" className="mb-3">
                                        <ShieldAlert className="h-5 w-5" />
                                    </IconTile>
                                    <h4 className="text-[12.5px] font-extrabold text-slate-900 dark:text-white">
                                        Proteksi Overwrite BKU
                                    </h4>
                                    <p className="mt-1.5 text-[10.5px] font-medium leading-relaxed text-slate-500 dark:text-slate-400">
                                        Menghitung nominal dan jumlah transaksi lokal newSIKAS yang berpotensi terhapus sebelum Anda melakukan penarikan buku kas dari ARKAS.
                                    </p>
                                </div>
                                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-[10px] font-extrabold text-rose-600 dark:border-white/5 dark:text-rose-300">
                                    <span>Perlindungan Data SPJ</span>
                                    <ShieldCheck className="h-4 w-4" />
                                </div>
                            </div>

                            <div className="sikas-card flex flex-col justify-between p-5">
                                <div>
                                    <IconTile tone="mint" size="md" className="mb-3">
                                        <Database className="h-5 w-5" />
                                    </IconTile>
                                    <h4 className="text-[12.5px] font-extrabold text-slate-900 dark:text-white">
                                        Standar Satuan Harga (SSH)
                                    </h4>
                                    <p className="mt-1.5 text-[10.5px] font-medium leading-relaxed text-slate-500 dark:text-slate-400">
                                        Memastikan puluhan ribu referensi barang, rekening belanja, dan batas atas harga selalu sinkron dengan database acuan dinas.
                                    </p>
                                </div>
                                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-[10px] font-extrabold text-mint dark:border-white/5">
                                    <span>23.000+ Acuan Barang</span>
                                    <CheckCircle2 className="h-4 w-4" />
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Modal Sinkronisasi Database Langsung Neo-Bento */}
            <ArkasSyncModal
                show={showSyncModal}
                onClose={() => setShowSyncModal(false)}
                defaultYear={year}
                activeYears={resolvedActiveYears}
                localStats={localStats}
                onSyncComplete={handleSyncComplete}
            />

            {/* Modal Diagnosa & Rekonsiliasi AI */}
            <ArkasDiagnosticModal
                isOpen={isAiModalOpen}
                onClose={() => setIsAiModalOpen(false)}
                tahun={
                    year !== 'ALL'
                        ? parseInt(year, 10)
                        : parseInt(resolvedActiveYears[0] || String(new Date().getFullYear()), 10)
                }
                scope="comprehensive"
            />
        </AuthenticatedLayout>
    );
}
