import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, usePage } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import useVariantRoute from '@/Hooks/useVariantRoute';
import axios from 'axios';
import ModalFormSuratPesanan from './ModalFormSuratPesanan';
import ModalDetailSuratPesanan from './ModalDetailSuratPesanan';
import ModalPreview from './ModalPreview';
import ModalPrintSettings from './ModalPrintSettings';
import ModalConfirmDelete from './ModalConfirmDelete';
import { Eye, FileText, Edit, Trash2, List, CalendarDays, Files } from 'lucide-react';
import PageHeader from '@/Components/ui/PageHeader';
import Surface from '@/Components/ui/Surface';
import DataTable from '@/Components/ui/DataTable';
import StatusBadge from '@/Components/ui/StatusBadge';
import IconTile from '@/Components/ui/IconTile';
import EmptyState from '@/Components/ui/EmptyState';
import TextInput from '@/Components/TextInput';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';

// Custom Toast helper
const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    window.dispatchEvent(new CustomEvent('toast-notification', { detail: { message, type } }));
};

const SELECT_CLASS =
    'w-full rounded-xl border border-slate-200/90 bg-white px-3.5 py-2.5 text-[12px] font-semibold text-slate-800 shadow-sm transition focus:border-lime-400 focus:outline-none focus:ring-4 focus:ring-lime-200/60 dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:border-lime-400/70 dark:focus:ring-lime-400/10';

export default function SuratPesananIndex({ auth }: { auth: any }) {
    const vroute = useVariantRoute();
    const routePrefix = usePage<any>().props.routePrefix || '';
    
    let activeTab = 'BOSP Reguler';
    if (routePrefix === 'silpa-') activeTab = 'SiLPA BOSP Reguler';
    else if (routePrefix === 'kinerja-') activeTab = 'BOSP Kinerja';
    else if (routePrefix === 'kinerja-silpa-') activeTab = 'SiLPA BOSP Kinerja';

    const [suratPesanans, setSuratPesanans] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ total: 0, available: 0 });
    const [years, setYears] = useState<{tahun_anggaran: string, id: number}[]>([]);
    const [selectedYear, setSelectedYear] = useState('');
    const [search, setSearch] = useState('');
    
    const [showModal, setShowModal] = useState(false);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [showPreviewModal, setShowPreviewModal] = useState(false);
    const [showPrintModal, setShowPrintModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const [editData, setEditData] = useState<any>(null);
    const [previewData, setPreviewData] = useState<any>(null);

    useEffect(() => {
        fetchYears();
    }, []);

    useEffect(() => {
        const t = setTimeout(() => {
            fetchData();
        }, 500);
        return () => clearTimeout(t);
    }, [search, selectedYear]);

    const fetchYears = async () => {
        try {
            const { data } = await axios.get(vroute('api.surat-pesanan.tahun') || vroute('api.tanda-terima.tahun'));
            if (data.success) setYears(data.data);
        } catch (e) {}
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            const { data } = await axios.get(vroute('api.surat-pesanan.search'), {
                params: { search, tahun: selectedYear }
            });
            if (data.success) {
                setSuratPesanans(data.data);
                setStats(prev => ({ ...prev, total: data.total }));
            }
        } catch (e) {
            showToast('Gagal memuat data', 'error');
        } finally {
            setLoading(false);
        }
    };

    const confirmDelete = (id: number) => {
        setDeleteId(id);
        setShowDeleteModal(true);
    };

    const handleDelete = async () => {
        if (!deleteId) return;
        try {
            const { data } = await axios.delete(vroute('surat-pesanan.destroy', { id: deleteId }));
            if (data.success) {
                showToast(data.message, 'success');
                fetchData();
            }
        } catch (e) {
            showToast('Gagal menghapus Surat Pesanan', 'error');
        }
    };

    return (
        <AuthenticatedLayout>
            <Head title="Surat Pesanan" />

            <div className="space-y-4">
                <PageHeader
                    className="animate-rise"
                    breadcrumb={[
                        { label: 'Dashboard' },
                        { label: 'Dokumen SPJ' },
                        { label: 'Surat Pesanan' },
                    ]}
                    title="Surat Pesanan"
                    badge={<StatusBadge tone="violet">SPJ</StatusBadge>}
                    subtitle="Kelola surat pesanan pengadaan barang dari transaksi BKU."
                />

                {/* Ringkasan tampilan â€” dihitung dari data yang sudah dimuat */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div
                        className="group sikas-card sikas-card-hover animate-rise relative overflow-hidden p-4"
                        style={{ animationDelay: '60ms' }}
                    >
                        <div className="flex items-center justify-between gap-2">
                            <IconTile tone="violet" size="md" className="transition-transform duration-300 group-hover:scale-110">
                                <FileText />
                            </IconTile>
                            <span className="text-[9px] font-extrabold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                                Total Surat Pesanan
                            </span>
                        </div>
                        <p className="mt-2 text-sikas-num text-[19px] font-extrabold tracking-tight text-slate-900 dark:text-white">
                            {stats.total}
                        </p>
                        <p className="mt-0.5 text-[10px] font-semibold text-slate-400 dark:text-slate-500">
                            Dokumen surat pesanan terdaftar
                        </p>
                    </div>

                    <div
                        className="group sikas-card sikas-card-hover animate-rise relative overflow-hidden p-4"
                        style={{ animationDelay: '110ms' }}
                    >
                        <div className="flex items-center justify-between gap-2">
                            <IconTile tone="lime" size="md" className="transition-transform duration-300 group-hover:scale-110">
                                <Files />
                            </IconTile>
                            <span className="text-[9px] font-extrabold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                                Ditampilkan
                            </span>
                        </div>
                        <p className="mt-2 text-sikas-num text-[19px] font-extrabold tracking-tight text-slate-900 dark:text-white">
                            {suratPesanans.length}
                            <span className="ml-1.5 text-[10.5px] font-bold text-slate-400 dark:text-slate-500">baris</span>
                        </p>
                        <p className="mt-0.5 text-[10px] font-semibold text-slate-400 dark:text-slate-500">
                            Sesuai pencarian &amp; tahun aktif
                        </p>
                    </div>

                    <div
                        className="group sikas-card sikas-card-hover animate-rise relative overflow-hidden p-4"
                        style={{ animationDelay: '160ms' }}
                    >
                        <div className="flex items-center justify-between gap-2">
                            <IconTile tone="sky" size="md" className="transition-transform duration-300 group-hover:scale-110">
                                <CalendarDays />
                            </IconTile>
                            <span className="text-[9px] font-extrabold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                                Tahun Anggaran
                            </span>
                        </div>
                        <p className="mt-2 text-sikas-num text-[19px] font-extrabold tracking-tight text-slate-900 dark:text-white">
                            {years.length}
                            <span className="ml-1.5 text-[10.5px] font-bold text-slate-400 dark:text-slate-500">tahun</span>
                        </p>
                        <p className="mt-0.5 text-[10px] font-semibold text-slate-400 dark:text-slate-500">
                            Pilihan tahun tersedia
                        </p>
                    </div>
                </div>

                {/* Tab varian BOSP */}
                <div className="animate-rise" style={{ animationDelay: '200ms' }}>
                    <Surface padding="sm">
                        <div
                            role="tablist"
                            aria-label="Varian BOSP Surat Pesanan"
                            className="flex items-center gap-1 overflow-x-auto p-0.5"
                        >
                            {['BOSP Reguler', 'BOSP Kinerja', 'SiLPA BOSP Reguler', 'SiLPA BOSP Kinerja'].map(tab => (
                                <button
                                    key={tab}
                                    type="button"
                                    role="tab"
                                    aria-selected={activeTab === tab}
                                    onClick={() => {
                                        if (activeTab === tab) return;
                                        if (tab === 'BOSP Reguler') router.visit(route('surat-pesanan.index'));
                                        if (tab === 'BOSP Kinerja') router.visit(route('kinerja-surat-pesanan.index'));
                                        if (tab === 'SiLPA BOSP Reguler') router.visit(route('silpa-surat-pesanan.index'));
                                        if (tab === 'SiLPA BOSP Kinerja') router.visit(route('kinerja-silpa-surat-pesanan.index'));
                                    }}
                                    className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2 text-[11px] font-bold transition-all duration-200 ${
                                        activeTab === tab
                                            ? 'bg-slate-900 text-white shadow-pill dark:bg-white dark:text-slate-900'
                                            : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-white'
                                    }`}
                                >
                                    {activeTab === tab && <span className="h-1.5 w-1.5 rounded-full bg-lime-300" />}
                                    {tab}
                                </button>
                            ))}
                        </div>
                    </Surface>
                </div>

                {/* Toolbar filter & aksi */}
                <div className="animate-rise" style={{ animationDelay: '240ms' }}>
                    <Surface padding="sm">
                        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                            <div className="flex flex-1 flex-col gap-3 sm:flex-row">
                                <div className="w-full sm:w-52">
                                    <InputLabel>Tahun Anggaran</InputLabel>
                                    <select
                                        className={SELECT_CLASS}
                                        value={selectedYear}
                                        onChange={e => setSelectedYear(e.target.value)}
                                    >
                                        <option value="">Semua Tahun</option>
                                        {years.map(y => (
                                            <option key={y.id} value={y.id}>{y.tahun_anggaran}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="min-w-0 flex-1">
                                    <InputLabel>Pencarian</InputLabel>
                                    <TextInput
                                        type="text"
                                        placeholder="Cari uraian BKU, Nomor Surat Pesanan..."
                                        value={search}
                                        onChange={e => setSearch(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="flex items-center justify-end">
                                <PrimaryButton
                                    onClick={() => {
                                        setEditData(null);
                                        setShowModal(true);
                                    }}
                                >
                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                    </svg>
                                    Tambah Surat Pesanan
                                </PrimaryButton>
                            </div>
                        </div>
                    </Surface>
                </div>

                {/* Daftar Surat Pesanan */}
                <DataTable
                    className="animate-rise"
                    title="Daftar Surat Pesanan"
                    subtitle="Surat pesanan pengadaan barang per transaksi BKU."
                    icon={
                        <IconTile tone="violet" size="md">
                            <FileText />
                        </IconTile>
                    }
                    actions={
                        <StatusBadge tone="neutral" dot={false}>
                            {activeTab}
                        </StatusBadge>
                    }
                >
                    <table className="min-w-full">
                        <thead>
                            <tr>
                                <th className="text-left">No</th>
                                <th className="text-left">No. Surat Pesanan</th>
                                <th className="text-left">Uraian Transaksi</th>
                                <th className="text-left">Tgl Surat Pesanan</th>
                                <th className="text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center !text-[11.5px] font-semibold text-slate-400 dark:text-slate-500">
                                        Memuat data...
                                    </td>
                                </tr>
                            ) : suratPesanans.length > 0 ? (
                                suratPesanans.map((suratPesanan, idx) => (
                                    <tr key={suratPesanan.id}>
                                        <td className="text-sikas-num">{suratPesanan.number}</td>
                                        <td className="text-sikas-num whitespace-nowrap">{suratPesanan.nomor_sp}</td>
                                        <td className="max-w-sm truncate" title={suratPesanan.uraian}>{suratPesanan.uraian}</td>
                                        <td className="text-sikas-num whitespace-nowrap">{suratPesanan.tanggal}</td>
                                        <td>
                                            <div className="flex items-center justify-end gap-1.5">
                                                <button onClick={() => {
                                                    setPreviewData({ title: suratPesanan.uraian, url: suratPesanan.preview_url });
                                                    setShowPreviewModal(true);
                                                }} className="inline-flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 transition hover:bg-brand-500/10 hover:text-brand-600 dark:text-slate-500 dark:hover:bg-white/5 dark:hover:text-brand-300" title="Preview">
                                                    <Eye size={18} />
                                                </button>
                                                <button onClick={() => {
                                                    setEditData(suratPesanan);
                                                    setShowPrintModal(true);
                                                }} className="inline-flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 transition hover:bg-mint/10 hover:text-mint dark:text-slate-500 dark:hover:bg-white/5 dark:hover:text-mint" title="PDF">
                                                    <FileText size={18} />
                                                </button>
                                                <button onClick={() => {
                                                    setEditData(suratPesanan);
                                                    setShowDetailModal(true);
                                                }} className="inline-flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 transition hover:bg-sky/10 hover:text-sky dark:text-slate-500 dark:hover:bg-white/5 dark:hover:text-sky" title="Detail Surat Pesanan">
                                                    <List size={18} />
                                                </button>
                                                <button onClick={() => {
                                                    setEditData(suratPesanan);
                                                    setShowModal(true);
                                                }} className="inline-flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 transition hover:bg-amber-400/10 hover:text-amber-600 dark:text-slate-500 dark:hover:bg-white/5 dark:hover:text-amber-300" title="Edit">
                                                    <Edit size={18} />
                                                </button>
                                                <button onClick={() => confirmDelete(suratPesanan.id)} className="inline-flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 transition hover:bg-rose-500/10 hover:text-rose-500 dark:text-slate-500 dark:hover:bg-white/5 dark:hover:text-rose-300" title="Hapus">
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="px-6 py-4">
                                        <EmptyState
                                            title="Tidak ada data Surat Pesanan"
                                            icon={
                                                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                </svg>
                                            }
                                        />
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </DataTable>
            </div>

            <ModalFormSuratPesanan
                show={showModal}
                onClose={() => setShowModal(false)}
                onSuccess={fetchData}
                tahun={selectedYear}
                years={years}
                editData={editData}
            />

            <ModalDetailSuratPesanan
                show={showDetailModal}
                onClose={() => {
                    setShowDetailModal(false);
                    fetchData(); // refresh to get updated uraian_details logic
                }}
                suratPesananData={editData}
            />

            <ModalPreview 
                show={showPreviewModal} 
                onClose={() => setShowPreviewModal(false)} 
                title={previewData?.title || 'Preview Surat Pesanan'} 
                url={previewData?.url || ''} 
            />

            <ModalPrintSettings 
                show={showPrintModal} 
                onClose={() => setShowPrintModal(false)} 
                pdfUrl={editData?.pdf_url || ''} 
            />

            <ModalConfirmDelete 
                show={showDeleteModal} 
                onClose={() => setShowDeleteModal(false)} 
                onConfirm={handleDelete} 
                title="Hapus Surat Pesanan"
            />
        </AuthenticatedLayout>
    );
}
