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
import { Eye, FileText, Edit, Trash2, List } from 'lucide-react';

// Custom Toast helper
const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    window.dispatchEvent(new CustomEvent('toast-notification', { detail: { message, type } }));
};

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
        <AuthenticatedLayout
            header={
                <div className="flex justify-between items-center">
                    <h2 className="font-semibold text-xl text-gray-800 dark:text-gray-200 leading-tight">Surat Pesanan</h2>
                </div>
            }
        >
            <Head title="Surat Pesanan" />


            <div className="py-8">
                <div className="max-w-9xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
                    {/* Tabs */}
                    <div className="mb-6 flex justify-start">
                        <nav className="flex space-x-1 p-1 bg-gray-100 dark:bg-gray-800/50 rounded-xl">
                            {['BOSP Reguler', 'BOSP Kinerja', 'SiLPA BOSP Reguler', 'SiLPA BOSP Kinerja'].map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => {
                                        if (activeTab === tab) return;
                                        if (tab === 'BOSP Reguler') router.visit(route('surat-pesanan.index'));
                                        if (tab === 'BOSP Kinerja') router.visit(route('kinerja-surat-pesanan.index'));
                                        if (tab === 'SiLPA BOSP Reguler') router.visit(route('silpa-surat-pesanan.index'));
                                        if (tab === 'SiLPA BOSP Kinerja') router.visit(route('kinerja-silpa-surat-pesanan.index'));
                                    }}
                                    className={`${activeTab === tab ? 'bg-blue-600 text-white shadow-md hover:bg-blue-700' : 'text-gray-600 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-700'} px-6 py-2.5 text-sm font-medium rounded-lg transition-all`}
                                >
                                    {tab}
                                </button>
                            ))}
                        </nav>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
                        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                            <div className="flex items-center gap-4 flex-1">
                                <div className="w-48">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tahun Anggaran</label>
                                    <select
                                        className="w-full rounded-md border-gray-300 dark:bg-gray-700 dark:border-gray-600"
                                        value={selectedYear}
                                        onChange={e => setSelectedYear(e.target.value)}
                                    >
                                        <option value="">Semua Tahun</option>
                                        {years.map(y => (
                                            <option key={y.id} value={y.id}>{y.tahun_anggaran}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="flex-1">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Pencarian</label>
                                    <input
                                        type="text"
                                        className="w-full rounded-md border-gray-300 dark:bg-gray-700 dark:border-gray-600"
                                        placeholder="Cari uraian BKU, Nomor Surat Pesanan..."
                                        value={search}
                                        onChange={e => setSearch(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div>
                                <button
                                    onClick={() => {
                                        setEditData(null);
                                        setShowModal(true);
                                    }}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                                >
                                    Tambah Surat Pesanan
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-700">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">No</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">No. Surat Pesanan</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Uraian Transaksi</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Tgl Surat Pesanan</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {loading ? (
                                    <tr><td colSpan={5} className="px-6 py-4 text-center">Memuat data...</td></tr>
                                ) : suratPesanans.length > 0 ? (
                                    suratPesanans.map((suratPesanan, idx) => (
                                        <tr key={suratPesanan.id}>
                                            <td className="px-6 py-4">{suratPesanan.number}</td>
                                            <td className="px-6 py-4">{suratPesanan.nomor_sp}</td>
                                            <td className="px-6 py-4 text-sm max-w-sm truncate" title={suratPesanan.uraian}>{suratPesanan.uraian}</td>
                                            <td className="px-6 py-4 text-sm">{suratPesanan.tanggal}</td>
                                            <td className="px-6 py-4">
                                                <div className="flex gap-3">
                                                    <button onClick={() => {
                                                        setPreviewData({ title: suratPesanan.uraian, url: suratPesanan.preview_url });
                                                        setShowPreviewModal(true);
                                                    }} className="text-blue-600 hover:text-blue-900" title="Preview">
                                                        <Eye size={18} />
                                                    </button>
                                                    <button onClick={() => {
                                                        setEditData(suratPesanan);
                                                        setShowPrintModal(true);
                                                    }} className="text-green-600 hover:text-green-900" title="PDF">
                                                        <FileText size={18} />
                                                    </button>
                                                    <button onClick={() => {
                                                        setEditData(suratPesanan);
                                                        setShowDetailModal(true);
                                                    }} className="text-indigo-600 hover:text-indigo-900" title="Detail Surat Pesanan">
                                                        <List size={18} />
                                                    </button>
                                                    <button onClick={() => {
                                                        setEditData(suratPesanan);
                                                        setShowModal(true);
                                                    }} className="text-yellow-600 hover:text-yellow-900" title="Edit">
                                                        <Edit size={18} />
                                                    </button>
                                                    <button onClick={() => confirmDelete(suratPesanan.id)} className="text-red-600 hover:text-red-900" title="Hapus">
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr><td colSpan={5} className="px-6 py-4 text-center text-gray-500">Tidak ada data Surat Pesanan</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
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
