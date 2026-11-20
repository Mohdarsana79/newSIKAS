import Modal from '@/Components/Modal';
import SecondaryButton from '@/Components/SecondaryButton';
import IconTile from '@/Components/ui/IconTile';
import { AlertTriangle, CheckCircle2, FileWarning, Layers } from 'lucide-react';
import { useEffect, useState } from 'react';

export interface UnmatchedArkasItem {
    kode_kegiatan: string;
    kode_rekening: string;
    bulan: string;
    uraian: string;
    volume: number;
    satuan: string;
    harga_satuan: number;
    total: number;
    reason: string;
}

export interface UnpairedSikasItem {
    id: number;
    kode_kegiatan: string;
    kode_rekening: string;
    bulan: string;
    uraian: string;
    uraian_arkas: string | null;
    volume: number;
    satuan: string;
    harga_satuan: number;
    total: number;
    status: 'belum_disandingkan' | 'tidak_ada_di_arkas';
    keterangan: string;
}

export interface ArkasSyncReport {
    mode: 'initial_import' | 'match_only' | 'perubahan_reconcile' | 'awal_reconcile';
    source_label?: string;
    tahun?: number;
    matched: number;
    cross_month_matched: number;
    updated_perubahan?: number;
    inserted: number;
    deleted_perubahan?: number;
    total_arkas: number;
    total_sikas_rows: number;
    total_sikas_rp: number;
    total_arkas_rp: number;
    selisih_rp: number;
    is_budget_mismatch: boolean;
    has_warnings: boolean;
    unmatched_arkas: UnmatchedArkasItem[];
    unpaired_sikas: UnpairedSikasItem[];
}

interface ArkasSyncReportModalProps {
    show: boolean;
    report: ArkasSyncReport | null;
    onClose: () => void;
    onFilterUnpaired?: () => void;
}

const formatRupiah = (amount: number): string =>
    `Rp ${new Intl.NumberFormat('id-ID').format(Math.abs(Math.round(amount || 0)))}`;

const formatSignedRupiah = (amount: number): string => {
    const rounded = Math.round(amount || 0);
    if (rounded > 0) {
        return `+${formatRupiah(rounded)}`;
    }
    if (rounded < 0) {
        return `-${formatRupiah(rounded)}`;
    }
    return formatRupiah(0);
};

const formatVolume = (volume: number): string =>
    new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 }).format(volume || 0);

export default function ArkasSyncReportModal({
    show,
    report,
    onClose,
    onFilterUnpaired,
}: ArkasSyncReportModalProps) {
    const [activeTab, setActiveTab] = useState<'sikas' | 'arkas'>('sikas');

    useEffect(() => {
        if (!show || !report) return;
        if (report.unpaired_sikas.length > 0) {
            setActiveTab('sikas');
        } else if (report.unmatched_arkas.length > 0) {
            setActiveTab('arkas');
        } else {
            setActiveTab('sikas');
        }
    }, [report, show]);

    if (!report) {
        return null;
    }

    const hasBelumDisandingkan = report.unpaired_sikas.some(
        (item) => item.status === 'belum_disandingkan',
    );
    const showTables = report.unpaired_sikas.length > 0 || report.unmatched_arkas.length > 0;

    return (
        <Modal show={show} onClose={onClose} maxWidth="2xl">
            <div className="p-6">
                {/* Header */}
                <div className="mb-5 flex items-start gap-3.5">
                    <IconTile
                        tone={report.has_warnings ? 'amber' : 'mint'}
                        size="lg"
                        className="h-12 w-12 shrink-0"
                    >
                        {report.has_warnings ? (
                            <AlertTriangle className="h-6 w-6" aria-hidden="true" />
                        ) : (
                            <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
                        )}
                    </IconTile>
                    <div className="min-w-0 flex-1">
                        <h2 className="text-[15px] font-extrabold tracking-tight text-slate-900 dark:text-white">
                            {report.has_warnings
                                ? `Peringatan Penyandingan ARKAS — ${report.source_label || 'RKAS'}`
                                : `Penyandingan ARKAS Berhasil — ${report.source_label || 'RKAS'}`}
                        </h2>
                        <p className="mt-0.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                            {report.mode === 'initial_import'
                                ? `Seluruh ${report.inserted} baris alokasi bulanan ARKAS Tahun ${report.tahun ?? ''} berhasil ditarik ke SIKAS.`
                                : report.mode === 'perubahan_reconcile'
                                  ? report.has_warnings
                                      ? 'Perubahan Tahap 2 dari ARKAS telah diterapkan (Tahap 1 & baris ber-BKU tetap terlindungi). Periksa catatan tersisa di bawah.'
                                      : 'Seluruh perubahan RKAS dari ARKAS berhasil diselaraskan ke SIKAS (Uraian SIKAS & Tahap 1 tetap terjaga).'
                                  : report.mode === 'awal_reconcile'
                                    ? report.has_warnings
                                        ? 'Penyesuaian pergeseran RKAS Awal dari ARKAS telah diterapkan (baris ber-BKU tetap terlindungi). Periksa catatan tersisa di bawah.'
                                        : 'Seluruh pergeseran RKAS Awal dari ARKAS berhasil diselaraskan ke SIKAS (Uraian SIKAS tetap terjaga).'
                                    : report.has_warnings
                                      ? 'Sistem tidak menambahkan data baru secara otomatis agar anggaran tidak membengkak. Periksa data yang belum cocok di bawah.'
                                      : 'Seluruh baris RKAS SIKAS berhasil disandingkan dengan data ARKAS secara akurat tanpa perubahan anggaran.'}
                        </p>
                    </div>
                </div>

                {/* Perbandingan Anggaran */}
                <div className="mb-4 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                    <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3 dark:border-white/10 dark:bg-white/[0.03]">
                        <span className="block text-[9.5px] font-extrabold uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">
                            Total Anggaran SIKAS
                        </span>
                        <span className="mt-1 block text-sikas-num text-[13.5px] font-extrabold text-slate-900 dark:text-white">
                            {formatRupiah(report.total_sikas_rp)}
                        </span>
                        <span className="mt-0.5 block text-[10px] font-semibold text-slate-400 dark:text-slate-500">
                            {report.total_sikas_rows} baris alokasi
                        </span>
                    </div>

                    <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3 dark:border-white/10 dark:bg-white/[0.03]">
                        <span className="block text-[9.5px] font-extrabold uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">
                            Total Anggaran ARKAS
                        </span>
                        <span className="mt-1 block text-sikas-num text-[13.5px] font-extrabold text-slate-900 dark:text-white">
                            {formatRupiah(report.total_arkas_rp)}
                        </span>
                        <span className="mt-0.5 block text-[10px] font-semibold text-slate-400 dark:text-slate-500">
                            {report.total_arkas} baris alokasi
                        </span>
                    </div>

                    <div
                        className={`rounded-2xl border p-3 ${
                            report.is_budget_mismatch
                                ? 'border-rose-200 bg-rose-50/70 dark:border-rose-500/30 dark:bg-rose-500/10'
                                : 'border-emerald-200 bg-pastel-mint/60 dark:border-emerald-500/30 dark:bg-mint/10'
                        }`}
                    >
                        <span
                            className={`block text-[9.5px] font-extrabold uppercase tracking-[0.12em] ${
                                report.is_budget_mismatch
                                    ? 'text-rose-600 dark:text-rose-300'
                                    : 'text-emerald-700 dark:text-emerald-300'
                            }`}
                        >
                            Selisih (ARKAS - SIKAS)
                        </span>
                        <span
                            className={`mt-1 block text-sikas-num text-[13.5px] font-extrabold ${
                                report.is_budget_mismatch
                                    ? 'text-rose-700 dark:text-rose-200'
                                    : 'text-emerald-700 dark:text-emerald-200'
                            }`}
                        >
                            {formatSignedRupiah(report.selisih_rp)}
                        </span>
                        <span
                            className={`mt-0.5 block text-[10px] font-semibold ${
                                report.is_budget_mismatch
                                    ? 'text-rose-600/90 dark:text-rose-300/80'
                                    : 'text-emerald-700/80 dark:text-emerald-300/80'
                            }`}
                        >
                            {report.is_budget_mismatch ? 'Anggaran belum cocok' : 'Anggaran cocok 100%'}
                        </span>
                    </div>
                </div>

                {/* Ringkasan Hitungan */}
                <div className="mb-4 flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-pastel-mint px-2.5 py-1 text-[10px] font-extrabold text-emerald-700 dark:bg-mint/10 dark:text-emerald-300">
                        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                        {report.mode === 'initial_import'
                            ? `${report.inserted} baris ditarik`
                            : `${report.matched} baris SIKAS disandingkan`}
                    </span>
                    {report.cross_month_matched > 0 && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-pastel-sky px-2.5 py-1 text-[10px] font-extrabold text-sky dark:bg-sky/10 dark:text-sky">
                            <Layers className="h-3.5 w-3.5" aria-hidden="true" />
                            {report.cross_month_matched} cocok lintas bulan
                        </span>
                    )}
                    {(report.updated_perubahan ?? 0) > 0 && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-pastel-lavender px-2.5 py-1 text-[10px] font-extrabold text-brand-700 dark:bg-brand-500/15 dark:text-brand-300">
                            <Layers className="h-3.5 w-3.5" aria-hidden="true" />
                            {report.updated_perubahan} disesuaikan mengikuti ARKAS
                        </span>
                    )}
                    {(report.mode === 'perubahan_reconcile' || report.mode === 'awal_reconcile') &&
                        report.inserted > 0 && (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-extrabold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                                +{report.inserted} item baru ditambahkan
                            </span>
                        )}
                    {(report.deleted_perubahan ?? 0) > 0 && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-extrabold text-slate-600 dark:bg-white/10 dark:text-slate-300">
                            {report.deleted_perubahan}{' '}
                            {report.mode === 'perubahan_reconcile'
                                ? 'item Tahap 2 dibatalkan/dihapus'
                                : 'item tanpa BKU dihapus'}
                        </span>
                    )}
                    {report.unpaired_sikas.length > 0 && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-pastel-amber px-2.5 py-1 text-[10px] font-extrabold text-amber-800 dark:bg-amber-400/10 dark:text-amber-300">
                            <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                            {report.unpaired_sikas.length} SIKAS belum/tidak cocok
                        </span>
                    )}
                    {report.unmatched_arkas.length > 0 && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-100 px-2.5 py-1 text-[10px] font-extrabold text-rose-700 dark:bg-rose-500/15 dark:text-rose-300">
                            <FileWarning className="h-3.5 w-3.5" aria-hidden="true" />
                            {report.unmatched_arkas.length} item ARKAS tidak cocok
                        </span>
                    )}
                </div>

                {/* Peringatan Ketidakcocokan Anggaran */}
                {report.is_budget_mismatch && (
                    <div
                        role="alert"
                        className="mb-4 rounded-2xl border border-rose-200 bg-rose-50/70 p-3 text-[11px] font-medium leading-relaxed text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200"
                    >
                        <strong>Peringatan Anggaran Tidak Cocok:</strong> Total anggaran RKAS SIKAS (
                        <strong>{formatRupiah(report.total_sikas_rp)}</strong>) berbeda dengan ARKAS (
                        <strong>{formatRupiah(report.total_arkas_rp)}</strong>).{' '}
                        {report.mode === 'perubahan_reconcile'
                            ? 'Sisa selisih disebabkan oleh baris Tahap 1, baris yang sudah terpakai di BKU Tahap 2 (dilindungi dari perubahan/penghapusan otomatis), atau referensi kode yang belum terdaftar di SIKAS. Silakan periksa daftar di bawah.'
                            : report.mode === 'awal_reconcile'
                              ? 'Sisa selisih disebabkan oleh baris yang sudah terpakai di BKU (dilindungi dari perubahan/penghapusan otomatis) atau referensi kode yang belum terdaftar di SIKAS. Silakan periksa daftar di bawah.'
                              : 'Sistem memblokir penambahan baris otomatis agar tidak terjadi kelebihan anggaran. Silakan periksa daftar di bawah dan sesuaikan baris yang berbeda.'}
                    </div>
                )}

                {/* Tab Detail Ketidakcocokan */}
                {showTables && (
                    <div>
                        <div
                            role="tablist"
                            aria-label="Detail ketidakcocokan penyandingan ARKAS"
                            className="mb-3 flex flex-wrap gap-2 border-b border-slate-200 pb-2 dark:border-white/10"
                        >
                            <button
                                type="button"
                                role="tab"
                                id="arkas-sync-tab-sikas"
                                aria-selected={activeTab === 'sikas'}
                                aria-controls="arkas-sync-panel"
                                onClick={() => setActiveTab('sikas')}
                                className={`rounded-xl px-3 py-1.5 text-[11px] font-extrabold transition ${
                                    activeTab === 'sikas'
                                        ? 'bg-amber-500 text-white shadow-sm'
                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10'
                                }`}
                            >
                                Data SIKAS Belum Disandingkan / Berlebih ({report.unpaired_sikas.length})
                            </button>
                            <button
                                type="button"
                                role="tab"
                                id="arkas-sync-tab-arkas"
                                aria-selected={activeTab === 'arkas'}
                                aria-controls="arkas-sync-panel"
                                onClick={() => setActiveTab('arkas')}
                                className={`rounded-xl px-3 py-1.5 text-[11px] font-extrabold transition ${
                                    activeTab === 'arkas'
                                        ? 'bg-rose-600 text-white shadow-sm'
                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10'
                                }`}
                            >
                                Data ARKAS Tidak Cocok ({report.unmatched_arkas.length})
                            </button>
                        </div>

                        <div
                            id="arkas-sync-panel"
                            role="tabpanel"
                            aria-labelledby={activeTab === 'sikas' ? 'arkas-sync-tab-sikas' : 'arkas-sync-tab-arkas'}
                            className="max-h-[300px] overflow-auto rounded-2xl border border-slate-200/80 dark:border-white/10"
                        >
                            {activeTab === 'sikas' ? (
                                report.unpaired_sikas.length === 0 ? (
                                    <div className="p-6 text-center text-[11.5px] font-semibold text-slate-500 dark:text-slate-400">
                                        Semua baris SIKAS telah memiliki pasangan yang cocok.
                                    </div>
                                ) : (
                                    <table className="min-w-full divide-y divide-slate-200 text-left text-[11px] dark:divide-white/10">
                                        <thead className="sticky top-0 bg-slate-50 text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:bg-slate-900 dark:text-slate-400">
                                            <tr>
                                                <th className="px-3 py-2">Kegiatan &amp; Rekening</th>
                                                <th className="px-3 py-2">Bulan</th>
                                                <th className="px-3 py-2">Uraian SIKAS</th>
                                                <th className="px-3 py-2 text-right">Vol &amp; Harga</th>
                                                <th className="px-3 py-2">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 bg-white dark:divide-white/5 dark:bg-transparent">
                                            {report.unpaired_sikas.map((row) => (
                                                <tr key={row.id} className="align-top">
                                                    <td className="whitespace-nowrap px-3 py-2 font-mono text-[10px] text-slate-600 dark:text-slate-300">
                                                        <div>{row.kode_kegiatan || '-'}</div>
                                                        <div className="text-slate-400 dark:text-slate-500">
                                                            {row.kode_rekening || '-'}
                                                        </div>
                                                    </td>
                                                    <td className="whitespace-nowrap px-3 py-2 font-semibold text-slate-700 dark:text-slate-200">
                                                        {row.bulan}
                                                    </td>
                                                    <td className="px-3 py-2">
                                                        <div className="font-bold text-slate-800 dark:text-white">
                                                            {row.uraian}
                                                        </div>
                                                        {row.uraian_arkas && (
                                                            <div className="mt-0.5 text-[10px] text-slate-400 dark:text-slate-500">
                                                                ARKAS tersimpan: {row.uraian_arkas}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="whitespace-nowrap px-3 py-2 text-right text-sikas-num">
                                                        <div className="font-bold text-slate-800 dark:text-white">
                                                            {formatVolume(row.volume)} {row.satuan}
                                                        </div>
                                                        <div className="text-[10px] text-slate-500 dark:text-slate-400">
                                                            @ {formatRupiah(row.harga_satuan)} = {formatRupiah(row.total)}
                                                        </div>
                                                    </td>
                                                    <td className="px-3 py-2">
                                                        <span
                                                            className={`inline-block rounded-full px-2 py-0.5 text-[9.5px] font-extrabold ${
                                                                row.status === 'belum_disandingkan'
                                                                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-400/15 dark:text-amber-300'
                                                                    : 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300'
                                                            }`}
                                                        >
                                                            {row.status === 'belum_disandingkan'
                                                                ? 'Belum disandingkan'
                                                                : 'Tidak ada di ARKAS'}
                                                        </span>
                                                        <div className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">
                                                            {row.keterangan}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )
                            ) : report.unmatched_arkas.length === 0 ? (
                                <div className="p-6 text-center text-[11.5px] font-semibold text-slate-500 dark:text-slate-400">
                                    Seluruh item dari ARKAS berhasil dipasangkan ke RKAS SIKAS.
                                </div>
                            ) : (
                                <table className="min-w-full divide-y divide-slate-200 text-left text-[11px] dark:divide-white/10">
                                    <thead className="sticky top-0 bg-slate-50 text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:bg-slate-900 dark:text-slate-400">
                                        <tr>
                                            <th className="px-3 py-2">Kegiatan &amp; Rekening</th>
                                            <th className="px-3 py-2">Bulan</th>
                                            <th className="px-3 py-2">Uraian ARKAS</th>
                                            <th className="px-3 py-2 text-right">Vol &amp; Harga</th>
                                            <th className="px-3 py-2">Keterangan</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 bg-white dark:divide-white/5 dark:bg-transparent">
                                        {report.unmatched_arkas.map((item, idx) => (
                                            <tr key={`${item.kode_kegiatan}-${item.kode_rekening}-${item.bulan}-${idx}`} className="align-top">
                                                <td className="whitespace-nowrap px-3 py-2 font-mono text-[10px] text-slate-600 dark:text-slate-300">
                                                    <div>{item.kode_kegiatan || '-'}</div>
                                                    <div className="text-slate-400 dark:text-slate-500">
                                                        {item.kode_rekening || '-'}
                                                    </div>
                                                </td>
                                                <td className="whitespace-nowrap px-3 py-2 font-semibold text-slate-700 dark:text-slate-200">
                                                    {item.bulan}
                                                </td>
                                                <td className="px-3 py-2 font-bold text-slate-800 dark:text-white">
                                                    {item.uraian}
                                                </td>
                                                <td className="whitespace-nowrap px-3 py-2 text-right text-sikas-num">
                                                    <div className="font-bold text-slate-800 dark:text-white">
                                                        {formatVolume(item.volume)} {item.satuan}
                                                    </div>
                                                    <div className="text-[10px] text-slate-500 dark:text-slate-400">
                                                        @ {formatRupiah(item.harga_satuan)} = {formatRupiah(item.total)}
                                                    </div>
                                                </td>
                                                <td className="px-3 py-2 text-[10.5px] font-medium text-rose-700 dark:text-rose-300">
                                                    {item.reason}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                )}

                {/* Footer */}
                <div className="mt-6 flex flex-wrap items-center justify-end gap-2.5">
                    {hasBelumDisandingkan && onFilterUnpaired && (
                        <button
                            type="button"
                            onClick={() => {
                                onFilterUnpaired();
                                onClose();
                            }}
                            className="inline-flex items-center gap-1.5 rounded-2xl border border-amber-300 bg-pastel-amber px-4 py-2 text-[11px] font-extrabold text-amber-800 transition hover:bg-amber-100 dark:border-amber-400/30 dark:bg-amber-400/15 dark:text-amber-200 dark:hover:bg-amber-400/25"
                        >
                            <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                            Lihat Baris Belum Disandingkan di Tabel
                        </button>
                    )}
                    <SecondaryButton onClick={onClose}>Tutup</SecondaryButton>
                </div>
            </div>
        </Modal>
    );
}
