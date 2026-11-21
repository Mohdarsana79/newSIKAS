import Modal from '@/Components/Modal';
import useVariantRoute from '@/Hooks/useVariantRoute';
import { router } from '@inertiajs/react';
import axios from 'axios';
import {
    AlertTriangle,
    ArrowRight,
    Calendar,
    CheckCircle2,
    CreditCard,
    Layers,
    X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import type { NotificationItem } from './NotificationDropdown';

interface NotificationModalProps {
    show: boolean;
    onClose: () => void;
    notification: NotificationItem | null;
}

interface DetailPajak {
    id: string;
    uraian: string;
    nominal: number;
    ntpn: string | null;
    tanggal_transaksi: string;
}

function isSafeRelativeUrl(url: string | null | undefined): url is string {
    return typeof url === 'string' && url.startsWith('/') && !url.startsWith('//') && !url.startsWith('/\\');
}

export default function NotificationModal({ show, onClose, notification }: NotificationModalProps) {
    const vRoute = useVariantRoute();
    const [displayNotification, setDisplayNotification] = useState<NotificationItem | null>(notification);
    const [details, setDetails] = useState<DetailPajak[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);

    useEffect(() => {
        if (notification) {
            setDisplayNotification(notification);
        }
    }, [notification]);

    useEffect(() => {
        if (!show || !notification) {
            setDetails([]);
            setLoadError(null);
            return;
        }

        const controller = new AbortController();
        setLoading(true);
        setLoadError(null);

        axios
            .get<{ success: boolean; data: DetailPajak[]; message?: string }>(
                route('api.notifications.pajak.details'),
                {
                    params: {
                        type: notification.type,
                        month: notification.month,
                        year: notification.year,
                        variant: notification.variant || 'reguler',
                    },
                    signal: controller.signal,
                },
            )
            .then((res) => {
                if (controller.signal.aborted) return;
                if (res.data?.success) {
                    setDetails(res.data.data || []);
                } else {
                    setLoadError(res.data?.message || 'Gagal memuat rincian transaksi pajak.');
                }
            })
            .catch((err) => {
                if (!axios.isCancel(err) && !controller.signal.aborted) {
                    console.error('Error fetching pajak details:', err);
                    setLoadError('Tidak dapat memuat rincian pajak. Periksa koneksi lalu coba lagi.');
                }
            })
            .finally(() => {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            });

        return () => {
            controller.abort();
        };
    }, [show, notification]);

    const active = notification ?? displayNotification;
    if (!active) return null;

    const isTerima = active.type === 'terima_pajak';
    const monthYear = `${active.month_name} ${active.year}`;
    const variantLabel = active.variant_label || 'BOSP Reguler';
    const totalPajak = details.reduce((sum, item) => sum + (Number(item.nominal) || 0), 0);

    const handleNavigateToBku = () => {
        onClose();
        if (isSafeRelativeUrl(active.bku_url)) {
            router.visit(active.bku_url);
            return;
        }
        router.visit(vRoute('penatausahaan.bku', { tahun: active.year, bulan: active.month }));
    };

    return (
        <Modal
            show={show}
            onClose={onClose}
            maxWidth="2xl"
            panelClassName="overflow-hidden rounded-[26px] border border-white/80 dark:border-white/10"
            ariaLabelledBy="pajak-detail-modal-title"
        >
            <div className="bg-white p-6 transition-all dark:bg-[#15131F]">
                {/* Header Modal */}
                <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4 dark:border-white/10">
                    <div className="flex items-center gap-3">
                        <span
                            aria-hidden="true"
                            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
                                isTerima
                                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300'
                                    : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
                            }`}
                        >
                            {isTerima ? (
                                <AlertTriangle className="h-5 w-5" />
                            ) : (
                                <CheckCircle2 className="h-5 w-5" />
                            )}
                        </span>
                        <div>
                            <div className="flex flex-wrap items-center gap-2">
                                <h2
                                    id="pajak-detail-modal-title"
                                    className="text-[17px] font-extrabold tracking-tight text-slate-900 dark:text-white"
                                >
                                    {isTerima ? 'Rincian Pajak Belum Disetor' : 'Rincian Pajak Sudah Disetor'}
                                </h2>
                                <span
                                    className={`rounded-full px-2 py-0.5 text-[9.5px] font-extrabold uppercase ${
                                        isTerima
                                            ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/20'
                                            : 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20'
                                    }`}
                                >
                                    {isTerima ? 'Wajib Setor' : 'Lunas'}
                                </span>
                                <span className="inline-flex items-center gap-1 rounded-full bg-pastel-lavender px-2 py-0.5 text-[9.5px] font-extrabold text-brand-700 dark:bg-brand-500/15 dark:text-brand-300">
                                    <Layers className="h-2.5 w-2.5" aria-hidden="true" />
                                    {variantLabel}
                                </span>
                            </div>
                            <p className="mt-1 flex items-center gap-1.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                                <Calendar className="h-3 w-3" aria-hidden="true" />
                                Periode {monthYear} · {details.length} Baris Pajak Terdeteksi
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/50 dark:hover:bg-white/5 dark:hover:text-slate-200"
                        aria-label="Tutup modal rincian pajak"
                    >
                        <X className="h-5 w-5" aria-hidden="true" />
                    </button>
                </div>

                {/* Banner Ringkasan Total Nominal (Bento Highlight) */}
                <div
                    className={`mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4 ${
                        isTerima
                            ? 'border-amber-200/60 bg-amber-50/60 dark:border-amber-500/20 dark:bg-amber-500/10'
                            : 'border-emerald-200/60 bg-emerald-50/60 dark:border-emerald-500/20 dark:bg-emerald-500/10'
                    }`}
                >
                    <div className="flex items-center gap-3">
                        <div
                            aria-hidden="true"
                            className={`flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm dark:bg-white/10 ${
                                isTerima ? 'text-amber-600 dark:text-amber-300' : 'text-emerald-600 dark:text-emerald-300'
                            }`}
                        >
                            <CreditCard className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-[10.5px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                {isTerima ? 'Total Pajak Belum Disetor' : 'Total Pajak Telah Disetor'}
                            </p>
                            <p
                                className={`text-sikas-num text-[19px] font-black tracking-tight ${
                                    isTerima
                                        ? 'text-amber-800 dark:text-amber-200'
                                        : 'text-emerald-800 dark:text-emerald-200'
                                }`}
                            >
                                Rp {totalPajak.toLocaleString('id-ID')}
                            </p>
                        </div>
                    </div>

                    <div className="text-right">
                        <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                            {isTerima
                                ? 'Harap segera setor & input NTPN'
                                : 'Tersimpan dengan bukti setor'}
                        </span>
                    </div>
                </div>

                {/* Konten Rincian Transaksi */}
                <div className="mt-4">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-12">
                            <div className="h-7 w-7 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
                            <p className="mt-3 text-[11px] font-semibold text-slate-400">
                                Memuat rincian transaksi pajak…
                            </p>
                        </div>
                    ) : loadError ? (
                        <div className="flex items-center gap-2.5 rounded-2xl border border-rose-200/80 bg-rose-50/80 px-4 py-4 text-[12px] font-bold text-rose-700 dark:border-rose-500/25 dark:bg-rose-500/10 dark:text-rose-200">
                            <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
                            <span>{loadError}</span>
                        </div>
                    ) : (
                        <div className="sikas-scroll max-h-[320px] overflow-y-auto rounded-2xl border border-slate-100 dark:border-white/10">
                            <table className="min-w-full divide-y divide-slate-100 dark:divide-white/5">
                                <thead className="sticky top-0 bg-slate-50/90 backdrop-blur dark:bg-white/5">
                                    <tr>
                                        <th scope="col" className="px-3.5 py-2.5 text-left text-[9.5px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                            No
                                        </th>
                                        <th scope="col" className="px-3.5 py-2.5 text-left text-[9.5px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                            Tanggal
                                        </th>
                                        <th scope="col" className="px-3.5 py-2.5 text-left text-[9.5px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                            Uraian Belanja
                                        </th>
                                        {!isTerima && (
                                            <th scope="col" className="px-3.5 py-2.5 text-left text-[9.5px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                                NTPN
                                            </th>
                                        )}
                                        <th scope="col" className="px-3.5 py-2.5 text-right text-[9.5px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                            Nominal Pajak
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 bg-white dark:divide-white/5 dark:bg-[#15131F]">
                                    {details.length > 0 ? (
                                        details.map((detail, index) => (
                                            <tr key={detail.id} className="transition hover:bg-slate-50/60 dark:hover:bg-white/[0.03]">
                                                <td className="px-3.5 py-2.5 text-[11px] font-semibold text-slate-400">
                                                    {index + 1}
                                                </td>
                                                <td className="whitespace-nowrap px-3.5 py-2.5 text-[11px] font-medium text-slate-600 dark:text-slate-300">
                                                    {new Date(detail.tanggal_transaksi).toLocaleDateString('id-ID', {
                                                        day: '2-digit',
                                                        month: 'short',
                                                        year: 'numeric',
                                                    })}
                                                </td>
                                                <td className="px-3.5 py-2.5 text-[11.5px] font-semibold text-slate-800 dark:text-slate-200">
                                                    {detail.uraian}
                                                </td>
                                                {!isTerima && (
                                                    <td className="whitespace-nowrap px-3.5 py-2.5 font-mono text-[10.5px] font-bold text-slate-600 dark:text-slate-300">
                                                        {detail.ntpn || '-'}
                                                    </td>
                                                )}
                                                <td className="whitespace-nowrap px-3.5 py-2.5 text-right font-mono text-[11.5px] font-bold text-slate-900 dark:text-white">
                                                    Rp {Number(detail.nominal).toLocaleString('id-ID')}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td
                                                colSpan={isTerima ? 4 : 5}
                                                className="px-4 py-8 text-center text-[11px] font-medium text-slate-400"
                                            >
                                                Tidak ada data rincian transaksi pajak.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Footer Modal & Tombol Aksi */}
                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 dark:border-white/10">
                    <p className="text-[10.5px] text-slate-500 dark:text-slate-400">
                        {isTerima
                            ? `Klik tombol di kanan untuk langsung membuka BKU ${variantLabel} dan mengisi NTPN.`
                            : 'Terima kasih telah taat dan tepat waktu dalam menyetorkan pajak.'}
                    </p>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-[11px] font-bold text-slate-700 transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
                        >
                            Tutup
                        </button>

                        <button
                            type="button"
                            onClick={handleNavigateToBku}
                            className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-[11px] font-extrabold text-lime-300 shadow-sm transition hover:bg-slate-800 dark:bg-lime-400 dark:text-slate-950 dark:hover:bg-lime-300"
                        >
                            <span>Kelola di BKU ({active.month_name})</span>
                            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                    </div>
                </div>
            </div>
        </Modal>
    );
}
