import Modal from '@/Components/Modal';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import axios from 'axios';
import { 
    MessageSquare, 
    CheckCircle2, 
    AlertTriangle, 
    Trash2, 
    Calendar,
    Tag,
    Loader2
} from 'lucide-react';
import { FormEventHandler, useEffect, useState } from 'react';

interface RkasItemReviewModalProps {
    show: boolean;
    onClose: () => void;
    item: {
        id: number;
        uraian: string;
        harga: string;
        dianggaran: number;
        satuan: string;
        total: string;
        bulan: string;
        review?: {
            id: number;
            status: 'disetujui' | 'perlu_revisi';
            catatan: string | null;
            user_name: string | null;
            created_at: string | null;
        } | null;
        reviewable_type?: string;
    } | null;
    routePrefix?: string;
    isKepalaSekolah: boolean;
    onSuccess: (itemId: number, updatedReview: any, deleted?: boolean) => void;
}

export default function RkasItemReviewModal({
    show,
    onClose,
    item,
    routePrefix = '',
    isKepalaSekolah,
    onSuccess,
}: RkasItemReviewModalProps) {
    const [status, setStatus] = useState<'disetujui' | 'perlu_revisi'>('disetujui');
    const [catatan, setCatatan] = useState('');
    const [loading, setLoading] = useState(false);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        if (item) {
            setStatus(item.review?.status || 'disetujui');
            setCatatan(item.review?.catatan || '');
        }
    }, [item]);

    if (!item) return null;

    const handleSubmit: FormEventHandler = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const res = await axios.post(route(`${routePrefix}rkas-review.store`), {
                reviewable_type: item.reviewable_type,
                reviewable_id: item.id,
                status,
                catatan: catatan.trim() || null,
            });

            if (res.data.success) {
                onSuccess(item.id, res.data.review);
                onClose();
            }
        } catch (err: any) {
            alert('Gagal menyimpan telaah belanja: ' + (err.response?.data?.message || err.message));
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteReview = async () => {
        if (!item.review?.id) return;
        if (!confirm('Apakah Anda yakin ingin menghapus catatan telaah untuk item belanja ini?')) return;

        setDeleting(true);
        try {
            const res = await axios.delete(route(`${routePrefix}rkas-review.destroy`, item.review.id));
            if (res.data.success) {
                onSuccess(item.id, null, true);
                onClose();
            }
        } catch (err: any) {
            alert('Gagal menghapus telaah: ' + (err.response?.data?.message || err.message));
        } finally {
            setDeleting(false);
        }
    };

    return (
        <Modal show={show} onClose={onClose} maxWidth="lg">
            <form onSubmit={handleSubmit} className="p-6">
                {/* Header */}
                <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-2">
                        <MessageSquare className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                            Telaah & Catatan Belanja
                        </h3>
                    </div>
                    {item.review?.created_at && (
                        <span className="text-xs text-gray-400">
                            Ditelaah {item.review.created_at}
                        </span>
                    )}
                </div>

                {/* Item Details Box */}
                <div className="mt-4 p-3.5 bg-gray-50 dark:bg-gray-900/60 rounded-xl border border-gray-200 dark:border-gray-700/60 space-y-2">
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                        <Tag className="w-3.5 h-3.5" /> Detail Rincian Belanja
                    </div>
                    <div className="font-semibold text-gray-900 dark:text-white text-sm">
                        {item.uraian}
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs pt-1">
                        <div>
                            <span className="text-gray-500">Bulan: </span>
                            <span className="font-medium text-gray-800 dark:text-gray-200">{item.bulan}</span>
                        </div>
                        <div>
                            <span className="text-gray-500">Volume: </span>
                            <span className="font-medium text-gray-800 dark:text-gray-200">{item.dianggaran} {item.satuan}</span>
                        </div>
                        <div>
                            <span className="text-gray-500">Harga Satuan: </span>
                            <span className="font-medium text-gray-800 dark:text-gray-200">Rp {item.harga}</span>
                        </div>
                        <div className="col-span-2 sm:col-span-3 pt-1 border-t border-gray-200/60 dark:border-gray-700/60 flex justify-between">
                            <span className="text-gray-500">Total Anggaran Item:</span>
                            <span className="font-bold text-indigo-600 dark:text-indigo-400">Rp {item.total}</span>
                        </div>
                    </div>
                </div>

                {/* Review Form (Only Editable by Kepala Sekolah, or Viewable by Bendahara) */}
                <div className="mt-5 space-y-4">
                    <div>
                        <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">
                            Status Telaah Kepala Sekolah
                        </label>
                        {isKepalaSekolah ? (
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    onClick={() => setStatus('disetujui')}
                                    className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-sm font-semibold transition-all ${
                                        status === 'disetujui'
                                            ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-700 dark:text-emerald-300 ring-2 ring-emerald-500/20'
                                            : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400'
                                    }`}
                                >
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                    Disetujui
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setStatus('perlu_revisi')}
                                    className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-sm font-semibold transition-all ${
                                        status === 'perlu_revisi'
                                            ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-500 text-amber-700 dark:text-amber-300 ring-2 ring-amber-500/20'
                                            : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400'
                                    }`}
                                >
                                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                                    Perlu Penyesuaian
                                </button>
                            </div>
                        ) : (
                            <div className="p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex items-center gap-2">
                                {item.review?.status === 'perlu_revisi' ? (
                                    <span className="inline-flex items-center gap-1.5 text-amber-600 font-semibold text-sm">
                                        <AlertTriangle className="w-4 h-4" /> Perlu Penyesuaian / Revisi
                                    </span>
                                ) : item.review?.status === 'disetujui' ? (
                                    <span className="inline-flex items-center gap-1.5 text-emerald-600 font-semibold text-sm">
                                        <CheckCircle2 className="w-4 h-4" /> Disetujui Kepala Sekolah
                                    </span>
                                ) : (
                                    <span className="text-gray-500 text-sm italic">
                                        Belum ada telaah dari Kepala Sekolah
                                    </span>
                                )}
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">
                            Catatan / Arahan {isKepalaSekolah ? 'Anda' : 'Kepala Sekolah'}
                        </label>
                        {isKepalaSekolah ? (
                            <textarea
                                value={catatan}
                                onChange={(e) => setCatatan(e.target.value)}
                                rows={3}
                                placeholder="Contoh: Sesuaikan harga satuan dengan batas SSH atau kurangi kuantitas..."
                                className="w-full rounded-xl border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 focus:border-indigo-500 focus:ring-indigo-500 text-sm"
                            />
                        ) : (
                            <div className="p-3 bg-gray-50 dark:bg-gray-900/60 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-300 min-h-[60px] italic">
                                {item.review?.catatan || 'Tidak ada catatan tertulis.'}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="mt-6 flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-700">
                    <div>
                        {isKepalaSekolah && item.review?.id && (
                            <button
                                type="button"
                                onClick={handleDeleteReview}
                                disabled={deleting}
                                className="text-xs text-rose-600 hover:text-rose-700 flex items-center gap-1.5 py-1 px-2 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                                {deleting ? 'Menghapus...' : 'Hapus Telaah'}
                            </button>
                        )}
                    </div>

                    <div className="flex gap-3">
                        <SecondaryButton onClick={onClose}>
                            {isKepalaSekolah ? 'Batal' : 'Tutup'}
                        </SecondaryButton>
                        {isKepalaSekolah && (
                            <PrimaryButton disabled={loading} className="bg-indigo-600 hover:bg-indigo-700 flex items-center gap-2">
                                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                                {loading ? 'Menyimpan...' : 'Simpan Telaah'}
                            </PrimaryButton>
                        )}
                    </div>
                </div>
            </form>
        </Modal>
    );
}

