import Modal from '@/Components/Modal';
import SecondaryButton from '@/Components/SecondaryButton';
import IconTile from '@/Components/ui/IconTile';
import {
    AlertTriangle,
    ArrowRight,
    CheckCircle2,
    Download,
    PlusCircle,
    RefreshCw,
    ShieldAlert,
    Trash2,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { UnmatchedArkasItem } from './ArkasSyncReportModal';

export interface ArkasPreviewUpdateItem {
    id: number;
    kode_kegiatan: string;
    kode_rekening: string;
    uraian_sikas: string;
    uraian_arkas: string;
    bulan_lama: string;
    bulan_baru: string;
    volume_lama: number;
    volume_baru: number;
    satuan_lama: string;
    satuan_baru: string;
    harga_lama: number;
    harga_baru: number;
    total_lama: number;
    total_baru: number;
    changes: string[];
}

export interface ArkasPreviewInsertItem {
    kode_kegiatan: string;
    kode_rekening: string;
    bulan: string;
    uraian: string;
    uraian_arkas: string;
    inherited_from_sikas: boolean;
    volume: number;
    satuan: string;
    harga_satuan: number;
    total: number;
}

export interface ArkasPreviewDeleteItem {
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
}

export interface ArkasPreviewProtectedItem {
    id: number;
    kode_kegiatan: string;
    kode_rekening: string;
    bulan: string;
    uraian: string;
    volume: number;
    spent_volume?: number;
    satuan: string;
    harga_satuan: number;
    total: number;
    keterangan: string;
}

export interface ArkasAwalDiffPreview {
    has_differences: boolean;
    matched_direct: number;
    will_update: ArkasPreviewUpdateItem[];
    will_insert: ArkasPreviewInsertItem[];
    will_delete: ArkasPreviewDeleteItem[];
    protected_bku: ArkasPreviewProtectedItem[];
    protected_tahap1?: ArkasPreviewProtectedItem[];
    unmatched_arkas: UnmatchedArkasItem[];
    total_sikas_rp: number;
    estimated_sikas_rp: number;
    total_arkas_rp: number;
    estimated_selisih_rp: number;
    is_budget_mismatch: boolean;
}

export interface ArkasAwalPreviewData {
    status: string;
    exists: boolean;
    is_revisi?: number | null;
    tahun: number;
    sumber_dana: string;
    pagu: number;
    total_kegiatan: number;
    total_alokasi: number;
    total_alokasi_rp: number;
    current_rkas_count: number;
    has_bku?: boolean;
    has_bku_tahap2?: boolean;
    can_pull: boolean;
    diff_preview?: ArkasAwalDiffPreview | null;
    message?: string | null;
}

interface ArkasAwalPreviewModalProps {
    show: boolean;
    scope?: 'awal' | 'perubahan';
    previewData: ArkasAwalPreviewData | null;
    isPulling: boolean;
    pullMode: 'reconcile' | 'match_only' | null;
    onClose: () => void;
    onConfirmPull: (mode: 'reconcile' | 'match_only') => void;
}

type DiffTab = 'update' | 'insert' | 'delete' | 'warnings';

const formatRupiah = (amount: number): string =>
    `Rp ${new Intl.NumberFormat('id-ID').format(Math.abs(Math.round(amount || 0)))}`;

const formatSignedRupiah = (amount: number): string => {
    const rounded = Math.round(amount || 0);
    if (rounded > 0) return `+${formatRupiah(rounded)}`;
    if (rounded < 0) return `-${formatRupiah(rounded)}`;
    return formatRupiah(0);
};

const formatVolume = (volume: number): string =>
    new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 }).format(volume || 0);

export default function ArkasAwalPreviewModal({
    show,
    scope = 'awal',
    previewData,
    isPulling,
    pullMode,
    onClose,
    onConfirmPull,
}: ArkasAwalPreviewModalProps) {
    const [activeTab, setActiveTab] = useState<DiffTab>('update');
    const isPerubahan = scope === 'perubahan';
    const scopeTitle = isPerubahan ? 'RKAS Perubahan' : 'RKAS Awal';

    const diff = previewData?.diff_preview ?? null;
    const willUpdate = diff?.will_update ?? [];
    const willInsert = diff?.will_insert ?? [];
    const willDelete = diff?.will_delete ?? [];
    const protectedBku = diff?.protected_bku ?? [];
    const protectedTahap1 = diff?.protected_tahap1 ?? [];
    const unmatchedArkas = diff?.unmatched_arkas ?? [];
    const warningsCount = protectedBku.length + protectedTahap1.length + unmatchedArkas.length;
    const hasDifferences = Boolean(diff?.has_differences);
    const hasActionableChanges =
        willUpdate.length > 0 || willInsert.length > 0 || willDelete.length > 0;
    const hasTabContent = hasActionableChanges || warningsCount > 0;

    useEffect(() => {
        if (!show || !diff) return;
        if (diff.will_update.length > 0) {
            setActiveTab('update');
        } else if (diff.will_insert.length > 0) {
            setActiveTab('insert');
        } else if (diff.will_delete.length > 0) {
            setActiveTab('delete');
        } else if (
            diff.protected_bku.length > 0 ||
            (diff.protected_tahap1?.length ?? 0) > 0 ||
            diff.unmatched_arkas.length > 0
        ) {
            setActiveTab('warnings');
        } else {
            setActiveTab('update');
        }
    }, [diff, show]);

    if (!previewData) {
        return null;
    }

    const isRevisi = Number(previewData.is_revisi ?? (isPerubahan ? 100 : 0));
    const versionBadge = isPerubahan
        ? `Perubahan (Revisi ${isRevisi})`
        : isRevisi > 0
          ? `Pergeseran ${isRevisi}`
          : 'RKAS Murni';
    const isInitialEmpty = previewData.current_rkas_count === 0;
    const primaryMode: 'reconcile' | 'match_only' =
        !isInitialEmpty && (isPerubahan || hasActionableChanges) ? 'reconcile' : 'match_only';

    return (
        <Modal
            show={show}
            onClose={() => {
                if (!isPulling) onClose();
            }}
            maxWidth={hasDifferences ? '2xl' : 'md'}
        >
            <div className="p-6">
                {/* Header */}
                <div className="mb-5 flex items-start gap-3.5">
                    <IconTile
                        tone={hasDifferences ? 'amber' : 'mint'}
                        size="lg"
                        className="h-12 w-12 shrink-0"
                    >
                        {hasDifferences ? (
                            <AlertTriangle className="h-6 w-6" aria-hidden="true" />
                        ) : (
                            <Download className="h-6 w-6" aria-hidden="true" />
                        )}
                    </IconTile>
                    <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                            <h2 className="text-[15px] font-extrabold tracking-tight text-slate-900 dark:text-white">
                                {hasDifferences
                                    ? `Deteksi Perbedaan ${scopeTitle} vs ARKAS`
                                    : `Tarik ${scopeTitle} dari ARKAS`}
                            </h2>
                            <span
                                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[9.5px] font-extrabold ${
                                    isPerubahan || isRevisi > 0
                                        ? 'bg-pastel-amber text-amber-800 dark:bg-amber-400/15 dark:text-amber-300'
                                        : 'bg-pastel-sky text-sky dark:bg-sky/15 dark:text-sky'
                                }`}
                            >
                                {versionBadge}
                            </span>
                        </div>
                        <p className="mt-0.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                            {isInitialEmpty
                                ? `Data ${scopeTitle} ditemukan di database ARKAS. Periksa rincian di bawah sebelum menarik.`
                                : hasDifferences
                                  ? `Sistem mendeteksi perubahan atau data yang tidak cocok antara ${scopeTitle} SIKAS dan ARKAS. Tinjau daftar berikut sebelum menyetujui penarikan.`
                                  : `Seluruh baris ${scopeTitle} SIKAS sudah cocok 100% dengan data ARKAS.`}
                        </p>
                    </div>
                </div>

                {/* Ringkasan Meta ARKAS */}
                <div className="mb-4 grid grid-cols-2 gap-2.5 rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5 text-[11px] dark:border-white/5 dark:bg-white/[0.03] sm:grid-cols-4">
                    <div>
                        <span className="block text-[9.5px] font-extrabold uppercase tracking-[0.1em] text-slate-400 dark:text-slate-500">
                            Tahun / Sumber
                        </span>
                        <span className="mt-0.5 block truncate font-extrabold text-slate-800 dark:text-white">
                            {previewData.tahun} · {previewData.sumber_dana}
                        </span>
                    </div>
                    <div>
                        <span className="block text-[9.5px] font-extrabold uppercase tracking-[0.1em] text-slate-400 dark:text-slate-500">
                            Pagu ARKAS
                        </span>
                        <span className="mt-0.5 block font-extrabold text-emerald-600 text-sikas-num dark:text-emerald-300">
                            {formatRupiah(previewData.pagu)}
                        </span>
                    </div>
                    <div>
                        <span className="block text-[9.5px] font-extrabold uppercase tracking-[0.1em] text-slate-400 dark:text-slate-500">
                            Kegiatan ARKAS
                        </span>
                        <span className="mt-0.5 block font-extrabold text-slate-800 dark:text-white">
                            {previewData.total_kegiatan} Kegiatan
                        </span>
                    </div>
                    <div>
                        <span className="block text-[9.5px] font-extrabold uppercase tracking-[0.1em] text-slate-400 dark:text-slate-500">
                            Alokasi Bulanan
                        </span>
                        <span className="mt-0.5 block font-extrabold text-slate-800 dark:text-white">
                            {previewData.total_alokasi} Baris ARKAS
                        </span>
                    </div>
                </div>

                {/* Perbandingan Anggaran Saat Ini vs Estimasi Pasca-Sesuaikan */}
                {diff && (
                    <div className="mb-4 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                        <div className="rounded-2xl border border-slate-200/80 bg-white p-3 dark:border-white/10 dark:bg-white/[0.02]">
                            <span className="block text-[9.5px] font-extrabold uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">
                                Total SIKAS Saat Ini
                            </span>
                            <span className="mt-1 block text-sikas-num text-[13px] font-extrabold text-slate-900 dark:text-white">
                                {formatRupiah(diff.total_sikas_rp)}
                            </span>
                            <span className="mt-0.5 block text-[10px] font-semibold text-slate-400 dark:text-slate-500">
                                {previewData.current_rkas_count} baris ({diff.matched_direct} cocok langsung)
                            </span>
                        </div>

                        <div className="rounded-2xl border border-slate-200/80 bg-white p-3 dark:border-white/10 dark:bg-white/[0.02]">
                            <span className="block text-[9.5px] font-extrabold uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">
                                Estimasi Setelah Disesuaikan
                            </span>
                            <span className="mt-1 block text-sikas-num text-[13px] font-extrabold text-slate-900 dark:text-white">
                                {formatRupiah(diff.estimated_sikas_rp)}
                            </span>
                            <span className="mt-0.5 block text-[10px] font-semibold text-slate-400 dark:text-slate-500">
                                Target ARKAS: {formatRupiah(diff.total_arkas_rp)}
                            </span>
                        </div>

                        <div
                            className={`rounded-2xl border p-3 ${
                                diff.is_budget_mismatch
                                    ? 'border-rose-200 bg-rose-50/70 dark:border-rose-500/30 dark:bg-rose-500/10'
                                    : 'border-emerald-200 bg-pastel-mint/60 dark:border-emerald-500/30 dark:bg-mint/10'
                            }`}
                        >
                            <span
                                className={`block text-[9.5px] font-extrabold uppercase tracking-[0.12em] ${
                                    diff.is_budget_mismatch
                                        ? 'text-rose-600 dark:text-rose-300'
                                        : 'text-emerald-700 dark:text-emerald-300'
                                }`}
                            >
                                Estimasi Selisih Akhir
                            </span>
                            <span
                                className={`mt-1 block text-sikas-num text-[13px] font-extrabold ${
                                    diff.is_budget_mismatch
                                        ? 'text-rose-700 dark:text-rose-200'
                                        : 'text-emerald-700 dark:text-emerald-200'
                                }`}
                            >
                                {formatSignedRupiah(diff.estimated_selisih_rp)}
                            </span>
                            <span
                                className={`mt-0.5 block text-[10px] font-semibold ${
                                    diff.is_budget_mismatch
                                        ? 'text-rose-600/90 dark:text-rose-300/80'
                                        : 'text-emerald-700/80 dark:text-emerald-300/80'
                                }`}
                            >
                                {diff.is_budget_mismatch
                                    ? 'Ada sisa selisih (cek tab peringatan)'
                                    : 'Seimbang 100% dengan ARKAS'}
                            </span>
                        </div>
                    </div>
                )}

                {/* Branch 1: RKAS SIKAS Masih Kosong */}
                {isInitialEmpty && (
                    <div className="mb-5 rounded-2xl border border-amber-300/50 bg-pastel-amber/60 p-3.5 dark:border-amber-400/20 dark:bg-amber-400/10">
                        <p className="text-[10.5px] font-medium leading-relaxed text-amber-800 dark:text-amber-200">
                            <strong>Perhatian:</strong> Karena data {scopeTitle} di newSIKAS masih kosong, seluruh data alokasi bulanan dari{' '}
                            <strong>{versionBadge}</strong> akan disalin ke {scopeTitle} (mengisi Uraian SIKAS &amp; Uraian Arkas) dan nilai Pagu Anggaran akan otomatis disinkronkan.
                        </p>
                    </div>
                )}

                {/* Branch 2: Sudah Terisi & 100% Cocok */}
                {!isInitialEmpty && !hasDifferences && (
                    <div className="mb-5 space-y-1.5 rounded-2xl border border-emerald-200/80 bg-pastel-mint/70 p-3.5 dark:border-emerald-400/20 dark:bg-mint/10">
                        <p className="flex items-center gap-1.5 text-[11px] font-extrabold text-emerald-800 dark:text-emerald-200">
                            <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
                            Tidak ditemukan perubahan atau perbedaan anggaran
                        </p>
                        <p className="text-[10.5px] font-medium leading-relaxed text-emerald-900/90 dark:text-emerald-100/80">
                            Data {scopeTitle} SIKAS sudah sesuai dengan <strong>{versionBadge}</strong> ARKAS. Lanjutkan untuk melengkapi/memperbarui <strong>Uraian Arkas</strong> tanpa mengubah Uraian SIKAS.
                        </p>
                    </div>
                )}

                {/* Branch 3: Terdeteksi Perbedaan / Pergeseran */}
                {!isInitialEmpty && hasDifferences && (
                    <div className="mb-5">
                        {/* Badge Ringkasan Rencana Aksi */}
                        <div className="mb-3 flex flex-wrap items-center gap-1.5">
                            {willUpdate.length > 0 && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-pastel-lavender px-2.5 py-1 text-[10px] font-extrabold text-brand-700 dark:bg-brand-500/15 dark:text-brand-300">
                                    <RefreshCw className="h-3 w-3" aria-hidden="true" />
                                    {willUpdate.length} akan disesuaikan (Uraian SIKAS terjaga)
                                </span>
                            )}
                            {willInsert.length > 0 && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-extrabold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                                    <PlusCircle className="h-3 w-3" aria-hidden="true" />
                                    +{willInsert.length} akan ditambahkan
                                </span>
                            )}
                            {willDelete.length > 0 && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-1 text-[10px] font-extrabold text-rose-700 dark:bg-rose-500/15 dark:text-rose-300">
                                    <Trash2 className="h-3 w-3" aria-hidden="true" />
                                    {willDelete.length} {isPerubahan ? 'Tahap 2 tanpa BKU akan dihapus' : 'tanpa BKU akan dihapus'}
                                </span>
                            )}
                            {warningsCount > 0 && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-pastel-amber px-2.5 py-1 text-[10px] font-extrabold text-amber-800 dark:bg-amber-400/15 dark:text-amber-300">
                                    <ShieldAlert className="h-3 w-3" aria-hidden="true" />
                                    {warningsCount} {isPerubahan ? 'dilindungi Tahap 1 / BKU & peringatan' : 'dilindungi BKU / peringatan'}
                                </span>
                            )}
                        </div>

                        {/* Tabs */}
                        {hasTabContent && (
                            <>
                                <div
                                    role="tablist"
                                    aria-label={`Detail perbedaan ${scopeTitle} dengan ARKAS`}
                                    className="mb-3 flex flex-wrap gap-1.5 border-b border-slate-200 pb-2 dark:border-white/10"
                                >
                            {willUpdate.length > 0 && (
                                <button
                                    type="button"
                                    role="tab"
                                    id="arkas-awal-tab-update"
                                    aria-selected={activeTab === 'update'}
                                    aria-controls="arkas-awal-diff-panel"
                                    onClick={() => setActiveTab('update')}
                                    className={`rounded-xl px-3 py-1.5 text-[10.5px] font-extrabold transition ${
                                        activeTab === 'update'
                                            ? 'bg-brand-600 text-white shadow-sm'
                                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10'
                                    }`}
                                >
                                    Akan Disesuaikan ({willUpdate.length})
                                </button>
                            )}
                            {willInsert.length > 0 && (
                                <button
                                    type="button"
                                    role="tab"
                                    id="arkas-awal-tab-insert"
                                    aria-selected={activeTab === 'insert'}
                                    aria-controls="arkas-awal-diff-panel"
                                    onClick={() => setActiveTab('insert')}
                                    className={`rounded-xl px-3 py-1.5 text-[10.5px] font-extrabold transition ${
                                        activeTab === 'insert'
                                            ? 'bg-emerald-600 text-white shadow-sm'
                                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10'
                                    }`}
                                >
                                    Akan Ditambahkan ({willInsert.length})
                                </button>
                            )}
                            {willDelete.length > 0 && (
                                <button
                                    type="button"
                                    role="tab"
                                    id="arkas-awal-tab-delete"
                                    aria-selected={activeTab === 'delete'}
                                    aria-controls="arkas-awal-diff-panel"
                                    onClick={() => setActiveTab('delete')}
                                    className={`rounded-xl px-3 py-1.5 text-[10.5px] font-extrabold transition ${
                                        activeTab === 'delete'
                                            ? 'bg-rose-600 text-white shadow-sm'
                                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10'
                                    }`}
                                >
                                    {isPerubahan ? `Akan Dihapus Tahap 2 (${willDelete.length})` : `Akan Dihapus (${willDelete.length})`}
                                </button>
                            )}
                            {warningsCount > 0 && (
                                <button
                                    type="button"
                                    role="tab"
                                    id="arkas-awal-tab-warnings"
                                    aria-selected={activeTab === 'warnings'}
                                    aria-controls="arkas-awal-diff-panel"
                                    onClick={() => setActiveTab('warnings')}
                                    className={`rounded-xl px-3 py-1.5 text-[10.5px] font-extrabold transition ${
                                        activeTab === 'warnings'
                                            ? 'bg-amber-500 text-white shadow-sm'
                                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10'
                                    }`}
                                >
                                    {isPerubahan
                                        ? `Dilindungi Tahap 1 / BKU & Peringatan (${warningsCount})`
                                        : `Dilindungi BKU / Peringatan (${warningsCount})`}
                                </button>
                            )}
                        </div>

                        {/* Tab Panel */}
                        <div
                            id="arkas-awal-diff-panel"
                            role="tabpanel"
                            aria-labelledby={`arkas-awal-tab-${activeTab}`}
                            className="max-h-64 overflow-y-auto rounded-2xl border border-slate-200/80 dark:border-white/10"
                        >
                            {activeTab === 'update' && willUpdate.length > 0 && (
                                <table className="w-full text-left text-[11px]">
                                    <thead className="sticky top-0 bg-slate-50 text-[9.5px] font-extrabold uppercase tracking-[0.08em] text-slate-500 dark:bg-[#1B1926] dark:text-slate-400">
                                        <tr>
                                            <th className="px-3 py-2">Uraian SIKAS (Tetap Terjaga)</th>
                                            <th className="px-3 py-2">Perubahan (SIKAS → ARKAS)</th>
                                            <th className="px-3 py-2 text-right">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                        {willUpdate.map((item) => (
                                            <tr key={item.id} className="hover:bg-slate-50/70 dark:hover:bg-white/[0.02]">
                                                <td className="px-3 py-2 align-top">
                                                    <div className="font-bold text-slate-800 dark:text-slate-100">
                                                        {item.uraian_sikas}
                                                    </div>
                                                    {item.uraian_arkas && item.uraian_arkas !== item.uraian_sikas && (
                                                        <div className="mt-0.5 text-[10px] text-slate-400 dark:text-slate-500">
                                                            ARKAS: {item.uraian_arkas}
                                                        </div>
                                                    )}
                                                    <div className="mt-1 flex flex-wrap gap-1">
                                                        {item.changes.map((tag) => (
                                                            <span
                                                                key={tag}
                                                                className="rounded-md bg-brand-100 px-1.5 py-0.5 text-[9px] font-extrabold text-brand-700 dark:bg-brand-500/20 dark:text-brand-300"
                                                            >
                                                                {tag}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </td>
                                                <td className="px-3 py-2 align-top">
                                                    <div className="flex flex-wrap items-center gap-1.5 text-[10.5px]">
                                                        <span className="rounded-lg bg-slate-100 px-2 py-0.5 font-semibold text-slate-600 line-through dark:bg-white/5 dark:text-slate-400">
                                                            {item.bulan_lama} · {formatVolume(item.volume_lama)} {item.satuan_lama} @ {formatRupiah(item.harga_lama)}
                                                        </span>
                                                        <ArrowRight className="h-3.5 w-3.5 shrink-0 text-brand-500" aria-hidden="true" />
                                                        <span className="rounded-lg bg-emerald-100/80 px-2 py-0.5 font-bold text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200">
                                                            {item.bulan_baru} · {formatVolume(item.volume_baru)} {item.satuan_baru} @ {formatRupiah(item.harga_baru)}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="whitespace-nowrap px-3 py-2 text-right align-top text-sikas-num font-bold text-slate-800 dark:text-slate-100">
                                                    {formatRupiah(item.total_baru)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}

                            {activeTab === 'insert' && (
                                <table className="w-full text-left text-[11px]">
                                    <thead className="sticky top-0 bg-slate-50 text-[9.5px] font-extrabold uppercase tracking-[0.08em] text-slate-500 dark:bg-[#1B1926] dark:text-slate-400">
                                        <tr>
                                            <th className="px-3 py-2">Bulan</th>
                                            <th className="px-3 py-2">Uraian Item Baru</th>
                                            <th className="px-3 py-2 text-right">Vol × Harga</th>
                                            <th className="px-3 py-2 text-right">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                        {willInsert.map((item, idx) => (
                                            <tr key={`${item.kode_kegiatan}-${item.bulan}-${idx}`} className="hover:bg-slate-50/70 dark:hover:bg-white/[0.02]">
                                                <td className="whitespace-nowrap px-3 py-2 align-top font-bold text-emerald-700 dark:text-emerald-300">
                                                    {item.bulan}
                                                </td>
                                                <td className="px-3 py-2 align-top">
                                                    <div className="font-bold text-slate-800 dark:text-slate-100">
                                                        {item.uraian}
                                                    </div>
                                                    {item.inherited_from_sikas && (
                                                        <span className="mt-0.5 inline-block rounded-md bg-pastel-mint px-1.5 py-0.5 text-[9px] font-extrabold text-emerald-700 dark:bg-mint/15 dark:text-emerald-300">
                                                            Mewarisi Uraian SIKAS (pecahan bulan)
                                                        </span>
                                                    )}
                                                    <div className="mt-0.5 text-[10px] text-slate-400 dark:text-slate-500">
                                                        {item.kode_kegiatan} · {item.kode_rekening}
                                                    </div>
                                                </td>
                                                <td className="whitespace-nowrap px-3 py-2 text-right align-top text-sikas-num text-slate-600 dark:text-slate-300">
                                                    {formatVolume(item.volume)} {item.satuan} × {formatRupiah(item.harga_satuan)}
                                                </td>
                                                <td className="whitespace-nowrap px-3 py-2 text-right align-top text-sikas-num font-bold text-emerald-700 dark:text-emerald-300">
                                                    +{formatRupiah(item.total)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}

                            {activeTab === 'delete' && (
                                <table className="w-full text-left text-[11px]">
                                    <thead className="sticky top-0 bg-slate-50 text-[9.5px] font-extrabold uppercase tracking-[0.08em] text-slate-500 dark:bg-[#1B1926] dark:text-slate-400">
                                        <tr>
                                            <th className="px-3 py-2">Bulan</th>
                                            <th className="px-3 py-2">Baris SIKAS Tanpa BKU (Tidak Ada di ARKAS)</th>
                                            <th className="px-3 py-2 text-right">Vol × Harga</th>
                                            <th className="px-3 py-2 text-right">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                        {willDelete.map((item) => (
                                            <tr key={item.id} className="hover:bg-slate-50/70 dark:hover:bg-white/[0.02]">
                                                <td className="whitespace-nowrap px-3 py-2 align-top font-bold text-rose-600 dark:text-rose-300">
                                                    {item.bulan}
                                                </td>
                                                <td className="px-3 py-2 align-top">
                                                    <div className="font-bold text-slate-800 dark:text-slate-100">
                                                        {item.uraian}
                                                    </div>
                                                    <div className="mt-0.5 text-[10px] text-slate-400 dark:text-slate-500">
                                                        {item.kode_kegiatan} · {item.kode_rekening}
                                                    </div>
                                                </td>
                                                <td className="whitespace-nowrap px-3 py-2 text-right align-top text-sikas-num text-slate-600 dark:text-slate-300">
                                                    {formatVolume(item.volume)} {item.satuan} × {formatRupiah(item.harga_satuan)}
                                                </td>
                                                <td className="whitespace-nowrap px-3 py-2 text-right align-top text-sikas-num font-bold text-rose-600 dark:text-rose-300">
                                                    -{formatRupiah(item.total)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}

                            {activeTab === 'warnings' && (
                                <div className="divide-y divide-slate-100 dark:divide-white/5">
                                    {protectedBku.map((item) => (
                                        <div key={`prot-${item.id}`} className="p-3">
                                            <div className="flex items-start justify-between gap-2">
                                                <div>
                                                    <span className="inline-block rounded-md bg-pastel-amber px-1.5 py-0.5 text-[9px] font-extrabold text-amber-800 dark:bg-amber-400/15 dark:text-amber-300">
                                                        {isPerubahan ? 'Dilindungi BKU Tahap 2' : 'Dilindungi BKU'} · {item.bulan}
                                                    </span>
                                                    <div className="mt-1 font-bold text-slate-800 dark:text-slate-100">
                                                        {item.uraian}
                                                    </div>
                                                    <div className="mt-0.5 text-[10.5px] text-amber-700 dark:text-amber-300">
                                                        {item.keterangan}
                                                    </div>
                                                </div>
                                                <span className="whitespace-nowrap text-sikas-num text-[11px] font-bold text-slate-700 dark:text-slate-200">
                                                    {formatRupiah(item.total)}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                    {protectedTahap1.map((item) => (
                                        <div key={`t1-${item.id}`} className="p-3">
                                            <div className="flex items-start justify-between gap-2">
                                                <div>
                                                    <span className="inline-block rounded-md bg-pastel-sky px-1.5 py-0.5 text-[9px] font-extrabold text-sky dark:bg-sky/15 dark:text-sky">
                                                        Dilindungi Tahap 1 · {item.bulan}
                                                    </span>
                                                    <div className="mt-1 font-bold text-slate-800 dark:text-slate-100">
                                                        {item.uraian}
                                                    </div>
                                                    <div className="mt-0.5 text-[10.5px] text-slate-600 dark:text-slate-300">
                                                        {item.keterangan}
                                                    </div>
                                                </div>
                                                <span className="whitespace-nowrap text-sikas-num text-[11px] font-bold text-slate-700 dark:text-slate-200">
                                                    {formatRupiah(item.total)}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                    {unmatchedArkas.map((item, idx) => (
                                        <div key={`unm-${idx}`} className="p-3">
                                            <div className="flex items-start justify-between gap-2">
                                                <div>
                                                    <span className="inline-block rounded-md bg-rose-100 px-1.5 py-0.5 text-[9px] font-extrabold text-rose-700 dark:bg-rose-500/20 dark:text-rose-300">
                                                        ARKAS Belum Cocok · {item.bulan}
                                                    </span>
                                                    <div className="mt-1 font-bold text-slate-800 dark:text-slate-100">
                                                        {item.uraian}
                                                    </div>
                                                    <div className="mt-0.5 text-[10.5px] text-rose-700 dark:text-rose-300">
                                                        {item.reason} ({item.kode_kegiatan} · {item.kode_rekening})
                                                    </div>
                                                </div>
                                                <span className="whitespace-nowrap text-sikas-num text-[11px] font-bold text-slate-700 dark:text-slate-200">
                                                    {formatRupiah(item.total)}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                                </div>
                            </>
                        )}

                        <p className="mt-2.5 text-[10px] font-medium text-slate-500 dark:text-slate-400">
                            {isPerubahan
                                ? 'Catatan: Data Tahap 1 (Januari–Juni) dan baris Tahap 2 yang sudah dibelanjakan di BKU tetap dilindungi (tidak dihapus, tidak digeser bulannya, tidak diubah harga satuannya, dan volumenya tidak akan turun di bawah volume terpakai BKU).'
                                : 'Catatan: Baris yang sudah dibelanjakan di BKU tetap dilindungi (tidak dihapus, tidak digeser bulannya, tidak diubah harga satuannya, dan volumenya tidak akan turun di bawah volume yang sudah terpakai di BKU).'}
                        </p>
                    </div>
                )}

                {/* Footer Actions */}
                <div className="flex flex-wrap items-center justify-end gap-2.5">
                    <SecondaryButton onClick={onClose} disabled={isPulling}>
                        Batal
                    </SecondaryButton>

                    {!isInitialEmpty && hasActionableChanges && (
                        <button
                            type="button"
                            onClick={() => onConfirmPull('match_only')}
                            disabled={isPulling}
                            className="inline-flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 text-[11px] font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
                        >
                            {isPulling && pullMode === 'match_only'
                                ? 'Menyandingkan...'
                                : 'Hanya Sandingkan Uraian'}
                        </button>
                    )}

                    <button
                        type="button"
                        onClick={() => onConfirmPull(primaryMode)}
                        disabled={isPulling}
                        className="inline-flex items-center gap-2 rounded-2xl bg-lime-400 px-4 py-2.5 text-[11.5px] font-extrabold text-slate-950 shadow-lime transition hover:-translate-y-0.5 hover:bg-lime-300 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {isPulling && (pullMode === primaryMode || !hasActionableChanges) ? (
                            <>
                                <svg
                                    className="-ml-1 h-4 w-4 animate-spin text-slate-900"
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                >
                                    <circle
                                        className="opacity-25"
                                        cx="12"
                                        cy="12"
                                        r="10"
                                        stroke="currentColor"
                                        strokeWidth="4"
                                    />
                                    <path
                                        className="opacity-75"
                                        fill="currentColor"
                                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                    />
                                </svg>
                                Menarik &amp; Menyesuaikan...
                            </>
                        ) : isInitialEmpty ? (
                            'Ya, Tarik Sekarang'
                        ) : hasActionableChanges ? (
                            'Ya, Tarik & Sesuaikan dengan ARKAS'
                        ) : (
                            'Ya, Tarik & Sandingkan'
                        )}
                    </button>
                </div>
            </div>
        </Modal>
    );
}
