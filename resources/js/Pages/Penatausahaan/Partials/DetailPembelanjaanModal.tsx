import React from 'react';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import {
    Banknote,
    BookOpen,
    Building2,
    CalendarDays,
    FileSpreadsheet,
    FolderKanban,
    MapPin,
    ReceiptText,
    ShieldCheck,
    X,
} from 'lucide-react';
import Modal from '@/Components/Modal';
import SecondaryButton from '@/Components/SecondaryButton';
import IconTile from '@/Components/ui/IconTile';
import StatusBadge from '@/Components/ui/StatusBadge';

export interface BkuDetailUraianItem {
    uraian?: string | null;
    uraian_arkas?: string | null;
    volume?: number | string | null;
    satuan?: string | null;
    harga_satuan?: number | string | null;
}

export interface BkuDetailItem {
    id?: number;
    tanggal_transaksi?: string | null;
    id_transaksi?: string | null;
    id_transaksi_arkas?: string | null;
    nomor_nota?: string | null;
    nomor_nota_arkas?: string | null;
    jenis_transaksi?: string | null;
    nama_toko?: string | null;
    nama_penyedia?: string | null;
    nama_penyedia_barang_jasa?: string | null;
    nama_penerima_pembayaran?: string | null;
    nama_penerima?: string | null;
    npwp?: string | null;
    alamat_toko?: string | null;
    alamat?: string | null;
    uraian?: string | null;
    uraian_opsional?: string | null;
    uraian_arkas?: string | null;
    total_transaksi_kotor?: number | string | null;
    total_pajak?: number | string | null;
    pajak?: string | null;
    persen_pajak?: number | string | null;
    total_pajak_daerah?: number | string | null;
    pajak_daerah?: string | null;
    ntpn?: string | null;
    kode_kegiatan?: {
        kode?: string | null;
        uraian?: string | null;
    } | null;
    rekening_belanja?: {
        kode_rekening?: string | null;
        rincian_objek?: string | null;
    } | null;
    uraian_details?: BkuDetailUraianItem[] | null;
}

export interface DetailPembelanjaanModalProps {
    show: boolean;
    onClose: () => void;
    item: BkuDetailItem | null;
    formatCurrency: (val: number | string | undefined | null) => string;
    showArkasUraian?: boolean;
}

function formatDetailDate(dateValue?: string | null): string {
    if (!dateValue) {
        return '-';
    }
    const parsed = new Date(dateValue);
    if (Number.isNaN(parsed.getTime())) {
        return '-';
    }
    return format(parsed, 'd MMM yyyy', { locale: localeId });
}

function getPenyediaName(item: BkuDetailItem): string {
    return (
        item.nama_toko ||
        item.nama_penyedia ||
        item.nama_penyedia_barang_jasa ||
        item.nama_penerima_pembayaran ||
        item.nama_penerima ||
        '-'
    );
}

function getJenisTransaksiMeta(jenis?: string | null): {
    label: string;
    tone: 'success' | 'info' | 'neutral';
} {
    const normalized = (jenis || '').trim().toLowerCase();
    if (!normalized) {
        return { label: '-', tone: 'neutral' };
    }
    if (normalized === 'tunai') {
        return { label: 'Tunai', tone: 'success' };
    }
    if (normalized === 'non_tunai' || normalized === 'non tunai' || normalized === 'non-tunai') {
        return { label: 'Non Tunai', tone: 'info' };
    }
    return {
        label: normalized.replace(/[_-]+/g, ' ').replace(/\b\w/g, (ch) => ch.toUpperCase()),
        tone: 'neutral',
    };
}

export default function DetailPembelanjaanModal({
    show,
    onClose,
    item,
    formatCurrency,
    showArkasUraian = false,
}: DetailPembelanjaanModalProps) {
    if (!item) {
        return (
            <Modal show={show} onClose={onClose} maxWidth="4xl">
                <div className="p-6" />
            </Modal>
        );
    }

    const totalKotor = Number(item.total_transaksi_kotor) || 0;
    const totalPajak = Number(item.total_pajak) || 0;
    const totalPajakDaerah = Number(item.total_pajak_daerah) || 0;
    const totalBersih = totalKotor - totalPajak;

    const jenisMeta = getJenisTransaksiMeta(item.jenis_transaksi);
    const tanggalLabel = formatDetailDate(item.tanggal_transaksi);
    const penyediaName = getPenyediaName(item);
    const alamatPenyedia = item.alamat_toko || item.alamat || '-';
    const uraianList = Array.isArray(item.uraian_details) ? item.uraian_details : [];
    const hasDetails = uraianList.length > 0;
    const itemCount = hasDetails ? uraianList.length : 1;

    const displayIdTransaksi = showArkasUraian
        ? (item.id_transaksi_arkas?.trim() ? item.id_transaksi_arkas : item.id_transaksi)
        : item.id_transaksi;
    const displayNomorNota = showArkasUraian
        ? (item.nomor_nota_arkas?.trim() ? item.nomor_nota_arkas : item.nomor_nota)
        : item.nomor_nota;
    const displayHeaderUraian = showArkasUraian
        ? (item.rekening_belanja?.rincian_objek?.trim()
            ? item.rekening_belanja.rincian_objek
            : (item.uraian_arkas?.trim() ? item.uraian_arkas : (item.uraian || item.uraian_opsional)))
        : (item.uraian || item.uraian_opsional);
    const getDisplayDetailUraian = (detail: BkuDetailUraianItem) =>
        showArkasUraian
            ? (detail.uraian_arkas?.trim() ? detail.uraian_arkas : (detail.uraian || '-'))
            : (detail.uraian || '-');

    const taxTypeNotes = [
        totalPajak > 0 && item.pajak ? item.pajak : null,
        totalPajakDaerah > 0 && item.pajak_daerah ? `${item.pajak_daerah}: ${formatCurrency(totalPajakDaerah)}` : null,
    ]
        .filter(Boolean)
        .join(' · ');

    const taxStatusBadge =
        totalPajak > 0 ? (
            item.ntpn ? (
                <StatusBadge tone="success" dot>
                    Lapor · NTPN
                </StatusBadge>
            ) : (
                <StatusBadge tone="warning" dot>
                    Belum Lapor
                </StatusBadge>
            )
        ) : (
            <StatusBadge tone="neutral">Tanpa Pajak</StatusBadge>
        );

    return (
        <Modal show={show} onClose={onClose} maxWidth="4xl">
            <div className="relative flex max-h-[88vh] flex-col overflow-hidden rounded-[26px] bg-white dark:bg-[#15131F]">
                {/* Isolated decorative Neo-Bento glow */}
                <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[26px]">
                    <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-pastel-lavender/70 blur-3xl dark:bg-brand-500/15" />
                    <div className="absolute -bottom-24 -left-16 h-48 w-48 rounded-full bg-pastel-mint/45 blur-3xl dark:bg-mint/10" />
                </div>

                {/* Header */}
                <div className="relative flex shrink-0 items-start justify-between gap-4 border-b border-slate-100 px-6 py-4 dark:border-white/10">
                    <div className="flex min-w-0 items-center gap-3.5">
                        <IconTile tone="violet" size="md">
                            <ReceiptText className="h-5 w-5" />
                        </IconTile>
                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                                <h2 className="text-[16px] font-extrabold tracking-tight text-slate-900 dark:text-white">
                                    Detail Pembelanjaan
                                </h2>
                                {displayIdTransaksi && (
                                    <StatusBadge tone="violet" className="font-mono">
                                        {displayIdTransaksi}
                                    </StatusBadge>
                                )}
                                {item.jenis_transaksi && (
                                    <StatusBadge tone={jenisMeta.tone} dot>
                                        {jenisMeta.label}
                                    </StatusBadge>
                                )}
                            </div>
                            <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
                                Tanggal transaksi {tanggalLabel}
                                {displayNomorNota && displayNomorNota !== displayIdTransaksi
                                    ? ` · Nota ${displayNomorNota}`
                                    : ''}
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Tutup modal detail pembelanjaan"
                        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-white"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {/* Scrollable Body */}
                <div className="sikas-scroll relative min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5">
                    {/* KPI Summary Strip */}
                    <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
                        <div className="rounded-[20px] border border-slate-200/80 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                            <div className="flex items-center justify-between gap-2">
                                <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                    Total Kotor
                                </span>
                                <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-pastel-sky text-blue-700 dark:bg-sky/15 dark:text-blue-300">
                                    <Banknote className="h-3.5 w-3.5" />
                                </span>
                            </div>
                            <p className="mt-2 text-lg font-extrabold tracking-tight text-slate-900 text-sikas-num dark:text-white">
                                {formatCurrency(totalKotor)}
                            </p>
                            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                                Nilai belanja sebelum pajak
                            </p>
                        </div>

                        <div className="rounded-[20px] border border-slate-200/80 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                            <div className="flex items-center justify-between gap-2">
                                <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                    Pajak
                                </span>
                                {taxStatusBadge}
                            </div>
                            <p className="mt-2 text-lg font-extrabold tracking-tight text-slate-900 text-sikas-num dark:text-white">
                                {formatCurrency(totalPajak)}
                            </p>
                            <p className="mt-1 truncate text-[11px] text-slate-500 dark:text-slate-400">
                                {item.ntpn
                                    ? `NTPN: ${item.ntpn}`
                                    : taxTypeNotes || (totalPajak > 0 ? 'Pajak dipungut/dipotong' : 'Tidak ada potongan pajak')}
                            </p>
                        </div>

                        <div className="rounded-[20px] border border-brand-200/80 bg-pastel-lavender/45 p-4 dark:border-brand-500/25 dark:bg-brand-500/[0.08]">
                            <div className="flex items-center justify-between gap-2">
                                <span className="text-[10.5px] font-bold uppercase tracking-wider text-brand-700 dark:text-brand-300">
                                    Total Harga Bersih
                                </span>
                                <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-white/80 text-brand-700 shadow-sm dark:bg-white/10 dark:text-brand-300">
                                    <ShieldCheck className="h-3.5 w-3.5" />
                                </span>
                            </div>
                            <p className="mt-2 text-lg font-extrabold tracking-tight text-brand-900 text-sikas-num dark:text-white">
                                {formatCurrency(totalBersih)}
                            </p>
                            <p className="mt-1 text-[11px] text-brand-700/80 dark:text-brand-200/80">
                                Dibayarkan bersih ke penyedia
                            </p>
                        </div>
                    </div>

                    {/* Bento Grid Metadata (2x2) */}
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        {/* Info Transaksi */}
                        <div className="rounded-[20px] border border-slate-200/80 bg-white p-4 dark:border-white/10 dark:bg-white/[0.02]">
                            <div className="mb-3 flex items-center gap-2 border-b border-slate-100 pb-2.5 dark:border-white/10">
                                <CalendarDays className="h-4 w-4 text-brand-600 dark:text-brand-300" />
                                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-100">
                                    Informasi Transaksi
                                </h3>
                            </div>
                            <dl className="space-y-2.5 text-sm">
                                <div className="flex items-start justify-between gap-3">
                                    <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">
                                        Tanggal Transaksi
                                    </dt>
                                    <dd className="text-right text-xs font-semibold text-slate-900 dark:text-white">
                                        {tanggalLabel}
                                    </dd>
                                </div>
                                <div className="flex items-start justify-between gap-3">
                                    <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">
                                        ID Transaksi
                                    </dt>
                                    <dd className="text-right font-mono text-xs font-semibold text-slate-900 dark:text-white">
                                        {displayIdTransaksi || '-'}
                                    </dd>
                                </div>
                                <div className="flex items-start justify-between gap-3">
                                    <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">
                                        Nomor Nota
                                    </dt>
                                    <dd className="text-right font-mono text-xs font-semibold text-slate-900 dark:text-white">
                                        {displayNomorNota || '-'}
                                    </dd>
                                </div>
                                <div className="flex items-start justify-between gap-3">
                                    <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">
                                        Metode Pembayaran
                                    </dt>
                                    <dd className="text-right text-xs font-semibold text-slate-900 dark:text-white">
                                        {jenisMeta.label}
                                    </dd>
                                </div>
                            </dl>
                        </div>

                        {/* Penyedia / Penerima */}
                        <div className="rounded-[20px] border border-slate-200/80 bg-white p-4 dark:border-white/10 dark:bg-white/[0.02]">
                            <div className="mb-3 flex items-center gap-2 border-b border-slate-100 pb-2.5 dark:border-white/10">
                                <Building2 className="h-4 w-4 text-brand-600 dark:text-brand-300" />
                                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-100">
                                    Penyedia / Penerima
                                </h3>
                            </div>
                            <dl className="space-y-2.5 text-sm">
                                <div className="flex items-start justify-between gap-3">
                                    <dt className="shrink-0 text-xs font-medium text-slate-500 dark:text-slate-400">
                                        Nama
                                    </dt>
                                    <dd className="text-right text-xs font-semibold text-slate-900 dark:text-white">
                                        {penyediaName}
                                    </dd>
                                </div>
                                <div className="flex items-start justify-between gap-3">
                                    <dt className="shrink-0 text-xs font-medium text-slate-500 dark:text-slate-400">
                                        NPWP
                                    </dt>
                                    <dd className="text-right font-mono text-xs font-semibold text-slate-900 dark:text-white">
                                        {item.npwp || '-'}
                                    </dd>
                                </div>
                                <div className="flex items-start justify-between gap-3">
                                    <dt className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                                        <MapPin className="h-3 w-3" />
                                        Alamat
                                    </dt>
                                    <dd className="max-w-[240px] text-right text-xs font-medium leading-relaxed text-slate-700 dark:text-slate-300">
                                        {alamatPenyedia}
                                    </dd>
                                </div>
                            </dl>
                        </div>

                        {/* Kegiatan */}
                        <div className="rounded-[20px] border border-slate-200/80 bg-slate-50/70 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                            <div className="mb-2.5 flex items-center justify-between gap-2 border-b border-slate-200/70 pb-2 dark:border-white/10">
                                <div className="flex items-center gap-2">
                                    <FolderKanban className="h-4 w-4 text-brand-600 dark:text-brand-300" />
                                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-100">
                                        Kegiatan
                                    </h3>
                                </div>
                                {item.kode_kegiatan?.kode && (
                                    <span className="rounded-lg bg-white px-2 py-0.5 font-mono text-[11px] font-bold text-slate-700 ring-1 ring-slate-200 dark:bg-white/10 dark:text-slate-200 dark:ring-white/10">
                                        {item.kode_kegiatan.kode}
                                    </span>
                                )}
                            </div>
                            <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                                {item.kode_kegiatan?.uraian || '-'}
                            </p>
                        </div>

                        {/* Rekening Belanja */}
                        <div className="rounded-[20px] border border-slate-200/80 bg-slate-50/70 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                            <div className="mb-2.5 flex items-center justify-between gap-2 border-b border-slate-200/70 pb-2 dark:border-white/10">
                                <div className="flex items-center gap-2">
                                    <BookOpen className="h-4 w-4 text-brand-600 dark:text-brand-300" />
                                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-100">
                                        Rekening Belanja
                                    </h3>
                                </div>
                                {item.rekening_belanja?.kode_rekening && (
                                    <span className="rounded-lg bg-white px-2 py-0.5 font-mono text-[11px] font-bold text-slate-700 ring-1 ring-slate-200 dark:bg-white/10 dark:text-slate-200 dark:ring-white/10">
                                        {item.rekening_belanja.kode_rekening}
                                    </span>
                                )}
                            </div>
                            <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                                {item.rekening_belanja?.rincian_objek || '-'}
                            </p>
                        </div>
                    </div>

                    {/* Tabel Rincian Uraian Pembelanjaan */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                                <FileSpreadsheet className="h-4 w-4 text-brand-600 dark:text-brand-300" />
                                <h3 className="text-sm font-extrabold tracking-tight text-slate-900 dark:text-white">
                                    Detail Uraian Pembelanjaan
                                </h3>
                            </div>
                            <StatusBadge tone="neutral">{itemCount} Item</StatusBadge>
                        </div>

                        <div className="overflow-hidden rounded-[20px] border border-slate-200/80 bg-white dark:border-white/10 dark:bg-white/[0.02]">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="border-b border-slate-200/80 bg-slate-50/90 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-400">
                                        <tr>
                                            <th className="w-12 px-4 py-3 text-center">No</th>
                                            <th className="px-4 py-3">Uraian</th>
                                            <th className="px-4 py-3 text-center">Volume</th>
                                            <th className="px-4 py-3 text-right">Harga Satuan</th>
                                            <th className="px-4 py-3 text-right">Subtotal</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                        {hasDetails ? (
                                            uraianList.map((detail, index) => {
                                                const volume = Number(detail.volume) || 0;
                                                const hargaSatuan = Number(detail.harga_satuan) || 0;
                                                return (
                                                    <tr
                                                        key={index}
                                                        className="transition-colors hover:bg-slate-50/70 dark:hover:bg-white/[0.03]"
                                                    >
                                                        <td className="px-4 py-3.5 text-center text-xs font-semibold text-slate-400 text-sikas-num dark:text-slate-500">
                                                            {index + 1}
                                                        </td>
                                                        <td className="px-4 py-3.5 text-xs font-medium text-slate-900 dark:text-white sm:text-sm">
                                                            {getDisplayDetailUraian(detail)}
                                                        </td>
                                                        <td className="px-4 py-3.5 text-center text-xs text-slate-600 dark:text-slate-300">
                                                            <span className="inline-flex items-center rounded-lg bg-slate-100 px-2.5 py-0.5 font-medium text-slate-700 dark:bg-white/10 dark:text-slate-200">
                                                                {detail.volume ?? '-'} {detail.satuan || ''}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3.5 text-right text-xs text-slate-600 text-sikas-num dark:text-slate-300 sm:text-sm">
                                                            {formatCurrency(hargaSatuan)}
                                                        </td>
                                                        <td className="px-4 py-3.5 text-right text-xs font-bold text-slate-900 text-sikas-num dark:text-white sm:text-sm">
                                                            {formatCurrency(volume * hargaSatuan)}
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        ) : (
                                            <tr className="transition-colors hover:bg-slate-50/70 dark:hover:bg-white/[0.03]">
                                                <td className="px-4 py-3.5 text-center text-xs font-semibold text-slate-400 text-sikas-num dark:text-slate-500">
                                                    1
                                                </td>
                                                <td className="px-4 py-3.5 text-xs font-medium text-slate-900 dark:text-white sm:text-sm">
                                                    {displayHeaderUraian || '-'}
                                                </td>
                                                <td className="px-4 py-3.5 text-center text-xs text-slate-500 dark:text-slate-400">
                                                    -
                                                </td>
                                                <td className="px-4 py-3.5 text-right text-xs text-slate-500 dark:text-slate-400">
                                                    -
                                                </td>
                                                <td className="px-4 py-3.5 text-right text-xs font-bold text-slate-900 text-sikas-num dark:text-white sm:text-sm">
                                                    {formatCurrency(totalKotor)}
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                    <tfoot className="border-t border-slate-200/80 bg-slate-50/70 dark:border-white/10 dark:bg-white/[0.03]">
                                        <tr>
                                            <td
                                                colSpan={4}
                                                className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400"
                                            >
                                                Total Rincian Kotor
                                            </td>
                                            <td className="px-4 py-3 text-right text-sm font-extrabold text-slate-900 text-sikas-num dark:text-white">
                                                {formatCurrency(totalKotor)}
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="relative flex shrink-0 items-center justify-end border-t border-slate-100 px-6 py-4 dark:border-white/10">
                    <SecondaryButton type="button" onClick={onClose}>
                        Tutup
                    </SecondaryButton>
                </div>
            </div>
        </Modal>
    );
}

