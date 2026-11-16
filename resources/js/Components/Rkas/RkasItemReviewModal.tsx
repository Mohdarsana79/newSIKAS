import Modal from '@/Components/Modal';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import IconTile from '@/Components/ui/IconTile';
import StatusBadge from '@/Components/ui/StatusBadge';
import axios from 'axios';
import {
    AlertTriangle,
    CheckCircle2,
    Loader2,
    Lock,
    MessageSquare,
    Send,
    Tag,
    Trash2,
    X,
} from 'lucide-react';
import { FormEventHandler, useEffect, useState } from 'react';

export interface RkasItemReviewData {
    id: number;
    status: 'disetujui' | 'perlu_revisi' | 'sudah_diperbaiki';
    catatan: string | null;
    tanggapan_bendahara?: string | null;
    revisi_diajukan_at?: string | null;
    user_name: string | null;
    created_at: string | null;
}

interface RkasItemReviewModalProps {
    show: boolean;
    onClose: () => void;
    item: {
        id: number;
        uraian: string;
        harga: string;
        dianggaran: number;
        dibelanjakan?: number;
        satuan: string;
        total: string;
        bulan: string;
        review?: RkasItemReviewData | null;
        reviewable_type?: string;
    } | null;
    routePrefix?: string;
    isKepalaSekolah: boolean;
    onSuccess: (itemId: number, updatedReview: RkasItemReviewData | null, deleted?: boolean) => void;
}

export default function RkasItemReviewModal({
    show,
    onClose,
    item,
    routePrefix = '',
    isKepalaSekolah,
    onSuccess,
}: RkasItemReviewModalProps) {
    const [status, setStatus] = useState<'disetujui' | 'perlu_revisi' | null>('disetujui');
    const [catatan, setCatatan] = useState('');
    const [tanggapanBendahara, setTanggapanBendahara] = useState('');
    const [loading, setLoading] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [confirmingDelete, setConfirmingDelete] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    useEffect(() => {
        if (item) {
            if (item.review?.status === 'sudah_diperbaiki') {
                setStatus(null);
            } else if (item.review?.status === 'perlu_revisi') {
                setStatus('perlu_revisi');
            } else {
                setStatus('disetujui');
            }
            setCatatan(item.review?.catatan || '');
            setTanggapanBendahara(item.review?.tanggapan_bendahara || '');
            setConfirmingDelete(false);
            setErrorMessage(null);
        }
    }, [item, show]);

    if (!item) return null;

    const isFullySpent = (item.dibelanjakan ?? 0) >= item.dianggaran;
    const canKepsekEdit = isKepalaSekolah && !isFullySpent;
    const canBendaharaResubmit =
        !isKepalaSekolah &&
        !isFullySpent &&
        Boolean(item.review?.id) &&
        (item.review?.status === 'perlu_revisi' || item.review?.status === 'sudah_diperbaiki');

    const handleKepsekSubmit: FormEventHandler = async (e) => {
        e.preventDefault();
        if (!canKepsekEdit) return;
        if (!status) {
            setErrorMessage('Silakan pilih keputusan telaah (Disetujui atau Perlu Penyesuaian) terlebih dahulu.');
            return;
        }
        setLoading(true);
        setErrorMessage(null);

        try {
            const res = await axios.post(route(`${routePrefix}rkas-review.store`), {
                reviewable_type: item.reviewable_type,
                reviewable_id: item.id,
                status,
                catatan: catatan.trim() || null,
            });

            if (res.data.success) {
                const rawReview = res.data.review;
                const formattedReview: RkasItemReviewData = {
                    id: rawReview.id,
                    status: rawReview.status,
                    catatan: rawReview.catatan,
                    tanggapan_bendahara: rawReview.tanggapan_bendahara ?? null,
                    revisi_diajukan_at: rawReview.revisi_diajukan_at ? 'Baru saja' : null,
                    user_name: rawReview.user?.name || 'Kepala Sekolah',
                    created_at: 'Baru saja',
                };
                onSuccess(item.id, formattedReview, false);
                onClose();
            }
        } catch (err: any) {
            setErrorMessage('Gagal menyimpan telaah belanja: ' + (err.response?.data?.message || err.message));
        } finally {
            setLoading(false);
        }
    };

    const handleBendaharaResubmit: FormEventHandler = async (e) => {
        e.preventDefault();
        if (!canBendaharaResubmit || !item.review?.id) return;
        setLoading(true);
        setErrorMessage(null);

        try {
            const res = await axios.post(route(`${routePrefix}rkas-review.resubmit`, item.review.id), {
                tanggapan_bendahara: tanggapanBendahara.trim() || null,
            });

            if (res.data.success) {
                const rawReview = res.data.review;
                const formattedReview: RkasItemReviewData = {
                    id: rawReview.id,
                    status: 'sudah_diperbaiki',
                    catatan: rawReview.catatan,
                    tanggapan_bendahara: rawReview.tanggapan_bendahara ?? null,
                    revisi_diajukan_at: 'Baru saja',
                    user_name: rawReview.user?.name || 'Kepala Sekolah',
                    created_at: item.review.created_at || 'Baru saja',
                };
                onSuccess(item.id, formattedReview, false);
                onClose();
            }
        } catch (err: any) {
            setErrorMessage('Gagal mengajukan perbaikan belanja: ' + (err.response?.data?.message || err.message));
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteReview = async () => {
        if (!item.review?.id || !canKepsekEdit) return;

        setDeleting(true);
        setErrorMessage(null);
        try {
            const res = await axios.delete(route(`${routePrefix}rkas-review.destroy`, item.review.id));
            if (res.data.success) {
                onSuccess(item.id, null, true);
                onClose();
            }
        } catch (err: any) {
            setErrorMessage('Gagal menghapus telaah: ' + (err.response?.data?.message || err.message));
        } finally {
            setDeleting(false);
            setConfirmingDelete(false);
        }
    };

    return (
        <Modal show={show} onClose={() => !loading && !deleting && onClose()} maxWidth="lg">
            <form
                onSubmit={isKepalaSekolah ? handleKepsekSubmit : handleBendaharaResubmit}
                className="relative flex max-h-[90vh] flex-col overflow-hidden rounded-[26px] bg-white dark:bg-[#15131F]"
            >
                <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[26px]">
                    <div className="absolute -right-12 -top-16 h-40 w-40 rounded-full bg-brand-500/15 blur-3xl" />
                    <div className="absolute -bottom-16 -left-12 h-40 w-40 rounded-full bg-lime-400/10 blur-3xl" />
                </div>

                {/* Header */}
                <div className="relative flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 px-6 py-5 dark:border-white/5">
                    <div className="flex min-w-0 items-start gap-3">
                        <IconTile tone="violet" size="lg">
                            <MessageSquare />
                        </IconTile>
                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                                <h3 className="text-[15px] font-extrabold tracking-tight text-slate-900 dark:text-white">
                                    Telaah & Catatan Belanja
                                </h3>
                                {item.review?.created_at && (
                                    <StatusBadge tone="neutral">
                                        Ditelaah {item.review.created_at}
                                    </StatusBadge>
                                )}
                            </div>
                            <p className="mt-0.5 text-[10.5px] font-medium text-slate-400 dark:text-slate-500">
                                {isKepalaSekolah
                                    ? 'Berikan status persetujuan item belanja atau catatan revisi untuk Bendahara.'
                                    : 'Rincian arahan Kepala Sekolah dan pengajuan perbaikan oleh Bendahara.'}
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => !loading && !deleting && onClose()}
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-400 transition hover:bg-slate-100 hover:text-slate-800 dark:bg-white/5 dark:hover:bg-white/10 dark:hover:text-white"
                        aria-label="Tutup"
                    >
                        <X className="h-3.5 w-3.5" />
                    </button>
                </div>

                <div className="sikas-scroll relative flex-1 space-y-4 overflow-y-auto px-6 py-5">
                    {errorMessage && (
                        <div className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-[11.5px] font-semibold text-rose-700 dark:border-rose-400/20 dark:bg-rose-500/10 dark:text-rose-300">
                            {errorMessage}
                        </div>
                    )}

                    {isFullySpent && (
                        <div className="flex items-start gap-2.5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-[11.5px] font-semibold text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                            <Lock className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                            <span>
                                Item belanja ini sudah terealisasi penuh pada Buku Kas Umum (BKU), sehingga status telaah dikunci (hanya dapat dilihat).
                            </span>
                        </div>
                    )}

                    {/* Item Details Box */}
                    <div className="space-y-2 rounded-2xl border border-slate-100 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                        <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                            <Tag className="h-3.5 w-3.5" /> Detail Rincian Belanja
                        </div>
                        <div className="text-[13px] font-extrabold text-slate-900 dark:text-white">
                            {item.uraian}
                        </div>
                        <div className="grid grid-cols-2 gap-2 pt-1 text-[11px] sm:grid-cols-3">
                            <div>
                                <span className="text-slate-400">Bulan: </span>
                                <span className="font-bold text-slate-700 dark:text-slate-200">{item.bulan}</span>
                            </div>
                            <div>
                                <span className="text-slate-400">Volume: </span>
                                <span className="font-bold text-slate-700 dark:text-slate-200">
                                    {item.dianggaran} {item.satuan}
                                </span>
                            </div>
                            <div>
                                <span className="text-slate-400">Harga Satuan: </span>
                                <span className="text-sikas-num font-bold text-slate-700 dark:text-slate-200">
                                    Rp {item.harga}
                                </span>
                            </div>
                            <div className="col-span-2 flex items-center justify-between border-t border-slate-200/70 pt-2 dark:border-white/10 sm:col-span-3">
                                <span className="font-semibold text-slate-500 dark:text-slate-400">Total Anggaran Item:</span>
                                <span className="text-sikas-num text-[12.5px] font-extrabold text-brand-600 dark:text-brand-300">
                                    Rp {item.total}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Review Form */}
                    <div className="space-y-4">
                        <div>
                            <label className="mb-2 block text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                Status Telaah Kepala Sekolah
                            </label>
                            {canKepsekEdit ? (
                                <div className="space-y-2">
                                    {item.review?.status === 'sudah_diperbaiki' && (
                                        <div className="flex items-center justify-between rounded-xl border border-sky/30 bg-pastel-sky px-3 py-2 text-[11px] font-bold text-sky dark:border-sky/30 dark:bg-sky/10">
                                            <span>Bendahara telah mengajukan perbaikan. Pilih keputusan verifikasi Anda:</span>
                                            <StatusBadge tone="info" dot>
                                                Menunggu Verifikasi
                                            </StatusBadge>
                                        </div>
                                    )}
                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setStatus('disetujui')}
                                            className={`flex items-center justify-center gap-2 rounded-2xl border p-3 text-[12px] font-extrabold transition-all ${
                                                status === 'disetujui'
                                                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700 ring-2 ring-emerald-500/20 dark:bg-emerald-500/15 dark:text-emerald-300'
                                                    : 'border-slate-200 text-slate-500 hover:bg-slate-50 dark:border-white/10 dark:text-slate-400 dark:hover:bg-white/5'
                                            }`}
                                        >
                                            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                                            Disetujui
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setStatus('perlu_revisi')}
                                            className={`flex items-center justify-center gap-2 rounded-2xl border p-3 text-[12px] font-extrabold transition-all ${
                                                status === 'perlu_revisi'
                                                    ? 'border-amber-500 bg-amber-50 text-amber-700 ring-2 ring-amber-500/20 dark:bg-amber-500/15 dark:text-amber-300'
                                                    : 'border-slate-200 text-slate-500 hover:bg-slate-50 dark:border-white/10 dark:text-slate-400 dark:hover:bg-white/5'
                                            }`}
                                        >
                                            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                                            Perlu Penyesuaian
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 rounded-2xl border border-slate-100 bg-slate-50 p-3.5 dark:border-white/10 dark:bg-white/[0.03]">
                                    {item.review?.status === 'perlu_revisi' ? (
                                        <StatusBadge tone="warning" dot>
                                            Perlu Penyesuaian / Revisi
                                        </StatusBadge>
                                    ) : item.review?.status === 'sudah_diperbaiki' ? (
                                        <StatusBadge tone="info" dot>
                                            Sedang Diajukan ke Kepala Sekolah
                                        </StatusBadge>
                                    ) : item.review?.status === 'disetujui' ? (
                                        <StatusBadge tone="success" dot>
                                            Disetujui Kepala Sekolah
                                        </StatusBadge>
                                    ) : (
                                        <span className="text-[11.5px] font-medium italic text-slate-400">
                                            Belum ada telaah dari Kepala Sekolah
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="mb-1.5 block text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                Catatan / Arahan {isKepalaSekolah ? 'Anda' : 'Kepala Sekolah'}
                            </label>
                            {canKepsekEdit ? (
                                <textarea
                                    value={catatan}
                                    onChange={(e) => setCatatan(e.target.value)}
                                    rows={3}
                                    placeholder="Contoh: Sesuaikan harga satuan dengan batas SSH atau kurangi kuantitas..."
                                    className="w-full rounded-xl border border-slate-200/90 bg-white px-3.5 py-2.5 text-[12px] font-medium text-slate-800 shadow-sm transition placeholder:text-slate-400 focus:border-lime-400 focus:outline-none focus:ring-4 focus:ring-lime-200/60 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-lime-400/70 dark:focus:ring-lime-400/10"
                                />
                            ) : (
                                <div className="min-h-[60px] rounded-2xl border border-slate-100 bg-slate-50/80 p-3.5 text-[12px] font-medium italic text-slate-700 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-300">
                                    {item.review?.catatan || 'Tidak ada catatan tertulis.'}
                                </div>
                            )}
                        </div>

                        {/* Tanggapan / Pengajuan Perbaikan Bendahara */}
                        {(canBendaharaResubmit || item.review?.tanggapan_bendahara || item.review?.status === 'sudah_diperbaiki') && (
                            <div className="rounded-2xl border border-sky/25 bg-pastel-sky/40 p-4 dark:border-sky/20 dark:bg-sky/5">
                                <div className="mb-1.5 flex items-center justify-between gap-2">
                                    <label className="block text-[11px] font-extrabold uppercase tracking-wider text-sky">
                                        {canBendaharaResubmit
                                            ? 'Catatan Perbaikan Bendahara (Opsional)'
                                            : 'Catatan Perbaikan dari Bendahara'}
                                    </label>
                                    {item.review?.revisi_diajukan_at && (
                                        <span className="text-[10px] font-semibold text-slate-400">
                                            Diajukan {item.review.revisi_diajukan_at}
                                        </span>
                                    )}
                                </div>
                                {canBendaharaResubmit ? (
                                    <>
                                        <textarea
                                            value={tanggapanBendahara}
                                            onChange={(e) => setTanggapanBendahara(e.target.value)}
                                            rows={2}
                                            placeholder="Contoh: Volume belanja sudah disesuaikan menjadi 5 Rim sesuai arahan Kepala Sekolah..."
                                            className="w-full rounded-xl border border-slate-200/90 bg-white px-3.5 py-2 text-[12px] font-medium text-slate-800 shadow-sm transition placeholder:text-slate-400 focus:border-sky focus:outline-none focus:ring-4 focus:ring-sky/20 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-500"
                                        />
                                        <p className="mt-1.5 text-[10.5px] font-medium text-slate-500 dark:text-slate-400">
                                            Setelah Anda mengedit data belanja yang direvisi, klik tombol <strong>Ajukan Perbaikan ke Kepsek</strong> di bawah agar Kepala Sekolah mengetahui bahwa item ini siap ditelaah ulang.
                                        </p>
                                    </>
                                ) : (
                                    <div className="text-[12px] font-medium text-slate-700 dark:text-slate-200">
                                        {item.review?.tanggapan_bendahara || 'Bendahara telah memperbarui item belanja ini dan mengajukan telaah ulang.'}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="relative flex shrink-0 items-center justify-between gap-2 border-t border-slate-100 px-6 py-4 dark:border-white/5">
                    <div>
                        {canKepsekEdit && item.review?.id && (
                            confirmingDelete ? (
                                <div className="flex items-center gap-1.5">
                                    <button
                                        type="button"
                                        onClick={handleDeleteReview}
                                        disabled={deleting}
                                        className="inline-flex items-center gap-1 rounded-xl bg-rose-600 px-2.5 py-1.5 text-[11px] font-extrabold text-white transition hover:bg-rose-700 disabled:opacity-50"
                                    >
                                        {deleting ? 'Menghapus...' : 'Ya, Hapus'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setConfirmingDelete(false)}
                                        disabled={deleting}
                                        className="inline-flex items-center rounded-xl bg-slate-100 px-2.5 py-1.5 text-[11px] font-bold text-slate-600 transition hover:bg-slate-200 dark:bg-white/10 dark:text-slate-300"
                                    >
                                        Batal
                                    </button>
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => setConfirmingDelete(true)}
                                    disabled={deleting}
                                    className="inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-[11.5px] font-extrabold text-rose-600 transition hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10"
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                    Hapus Telaah
                                </button>
                            )
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        <SecondaryButton onClick={onClose} disabled={loading || deleting}>
                            {canKepsekEdit || canBendaharaResubmit ? 'Batal' : 'Tutup'}
                        </SecondaryButton>
                        {canKepsekEdit && (
                            <PrimaryButton disabled={loading || deleting || !status}>
                                {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                                {loading ? 'Menyimpan...' : 'Simpan Telaah'}
                            </PrimaryButton>
                        )}
                        {canBendaharaResubmit && (
                            <PrimaryButton disabled={loading || deleting}>
                                {loading ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                    <Send className="h-3.5 w-3.5" />
                                )}
                                {loading ? 'Mengajukan...' : 'Ajukan Perbaikan ke Kepsek'}
                            </PrimaryButton>
                        )}
                    </div>
                </div>
            </form>
        </Modal>
    );
}
