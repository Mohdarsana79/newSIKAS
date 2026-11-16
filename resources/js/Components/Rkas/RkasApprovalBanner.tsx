import DangerButton from '@/Components/DangerButton';
import Modal from '@/Components/Modal';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import IconTile from '@/Components/ui/IconTile';
import StatusBadge from '@/Components/ui/StatusBadge';
import Surface from '@/Components/ui/Surface';
import { router } from '@inertiajs/react';
import {
    AlertTriangle,
    Clock,
    FileSignature,
    RotateCcw,
    ShieldCheck,
    X,
} from 'lucide-react';
import { FormEventHandler, useState } from 'react';

interface RkasApprovalBannerProps {
    anggaran: {
        id: number;
        status_persetujuan?: string;
        persetujuan_user?: { id: number; name: string } | null;
        tanggal_persetujuan?: string | null;
        catatan_persetujuan?: string | null;
    };
    routePrefix?: string;
    isKepalaSekolah: boolean;
    reviewStats?: {
        disetujui: number;
        perluRevisi: number;
        sudahDiperbaiki: number;
    };
}

export default function RkasApprovalBanner({
    anggaran,
    routePrefix = '',
    isKepalaSekolah,
    reviewStats,
}: RkasApprovalBannerProps) {
    const isApproved = anggaran.status_persetujuan === 'disetujui';
    const [showApproveModal, setShowApproveModal] = useState(false);
    const [showUnapproveModal, setShowUnapproveModal] = useState(false);
    const [catatan, setCatatan] = useState('');
    const [processing, setProcessing] = useState(false);
    const [unapproving, setUnapproving] = useState(false);

    const handleApproveSubmit: FormEventHandler = (e) => {
        e.preventDefault();
        setProcessing(true);
        router.post(
            route(`${routePrefix}penganggaran.approve`, anggaran.id),
            { catatan_persetujuan: catatan },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setShowApproveModal(false);
                    setCatatan('');
                },
                onFinish: () => setProcessing(false),
            },
        );
    };

    const handleUnapproveConfirm = () => {
        setUnapproving(true);
        router.post(
            route(`${routePrefix}penganggaran.unapprove`, anggaran.id),
            {},
            {
                preserveScroll: true,
                onSuccess: () => {
                    setShowUnapproveModal(false);
                },
                onFinish: () => setUnapproving(false),
            },
        );
    };

    const renderStatsBadges = () => {
        if (!reviewStats) return null;
        const { disetujui, perluRevisi, sudahDiperbaiki } = reviewStats;
        if (disetujui === 0 && perluRevisi === 0 && sudahDiperbaiki === 0) return null;

        return (
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {sudahDiperbaiki > 0 && (
                    <StatusBadge tone="info" dot>
                        {isKepalaSekolah
                            ? `${sudahDiperbaiki} Menunggu Verifikasi Revisi`
                            : `${sudahDiperbaiki} Sedang Diajukan`}
                    </StatusBadge>
                )}
                {perluRevisi > 0 && (
                    <StatusBadge tone="warning" dot>
                        {perluRevisi} Perlu Revisi
                    </StatusBadge>
                )}
                {disetujui > 0 && (
                    <StatusBadge tone="success" dot>
                        {disetujui} Belanja Disetujui
                    </StatusBadge>
                )}
            </div>
        );
    };

    return (
        <>
            {isApproved ? (
                <Surface
                    padding="md"
                    className="relative overflow-hidden border-emerald-200/80 bg-gradient-to-r from-emerald-500/10 via-emerald-500/[0.04] to-transparent dark:border-emerald-400/20"
                >
                    <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
                        <div className="flex items-start gap-3.5">
                            <IconTile tone="mint" size="lg">
                                <ShieldCheck />
                            </IconTile>
                            <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-[13.5px] font-extrabold tracking-tight text-emerald-900 dark:text-emerald-300">
                                        Dokumen RKAS Telah Disetujui & Disahkan
                                    </span>
                                    <StatusBadge tone="success" dot>
                                        Disahkan Kepsek
                                    </StatusBadge>
                                </div>
                                <p className="mt-1 text-[11px] font-medium text-slate-600 dark:text-slate-300">
                                    Disetujui oleh:{' '}
                                    <strong className="font-extrabold text-slate-900 dark:text-white">
                                        {anggaran.persetujuan_user?.name || 'Kepala Sekolah'}
                                    </strong>
                                    {anggaran.tanggal_persetujuan && ` · ${anggaran.tanggal_persetujuan}`}
                                </p>
                                {anggaran.catatan_persetujuan && (
                                    <div className="mt-2 rounded-xl border border-emerald-200/70 bg-white/80 px-3 py-2 text-[11px] font-medium italic text-slate-700 dark:border-emerald-400/20 dark:bg-white/5 dark:text-slate-200">
                                        &ldquo;{anggaran.catatan_persetujuan}&rdquo;
                                    </div>
                                )}
                                {renderStatsBadges()}
                            </div>
                        </div>

                        {isKepalaSekolah && (
                            <button
                                type="button"
                                onClick={() => setShowUnapproveModal(true)}
                                className="inline-flex shrink-0 items-center gap-1.5 rounded-2xl border border-rose-200 bg-pastel-rose px-3.5 py-2 text-[11px] font-extrabold text-rose-600 transition hover:bg-rose-100 dark:border-rose-400/20 dark:bg-rose-500/10 dark:text-rose-300 dark:hover:bg-rose-500/15"
                                title="Batalkan pengesahan untuk review ulang"
                            >
                                <RotateCcw className="h-3.5 w-3.5" />
                                Batalkan Persetujuan
                            </button>
                        )}
                    </div>
                </Surface>
            ) : (
                <Surface padding="md" className="relative overflow-hidden">
                    <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                        <div className="flex items-start gap-3.5">
                            <IconTile tone="amber" size="lg">
                                <Clock />
                            </IconTile>
                            <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-[13px] font-extrabold tracking-tight text-slate-900 dark:text-white">
                                        Status: Belum Disahkan Kepala Sekolah
                                    </span>
                                    <StatusBadge tone="warning" dot>
                                        Menunggu Pengesahan
                                    </StatusBadge>
                                </div>
                                <p className="mt-0.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                                    {isKepalaSekolah
                                        ? 'Silakan telaah rincian belanja di bawah dan berikan catatan sebelum mengesahkan dokumen RKAS.'
                                        : 'Menunggu penelaahan dan stempel persetujuan dari Kepala Sekolah.'}
                                </p>
                                {renderStatsBadges()}
                            </div>
                        </div>

                        {isKepalaSekolah && (
                            <PrimaryButton
                                onClick={() => setShowApproveModal(true)}
                                className="shrink-0"
                            >
                                <FileSignature className="h-4 w-4" />
                                Beri Persetujuan RKAS
                            </PrimaryButton>
                        )}
                    </div>
                </Surface>
            )}

            {/* Modal Beri Persetujuan (Neo-Bento) */}
            <Modal show={showApproveModal} onClose={() => !processing && setShowApproveModal(false)} maxWidth="md">
                <form
                    onSubmit={handleApproveSubmit}
                    className="relative flex max-h-[90vh] flex-col overflow-hidden rounded-[26px] bg-white dark:bg-[#15131F]"
                >
                    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[26px]">
                        <div className="absolute -right-12 -top-16 h-40 w-40 rounded-full bg-lime-400/15 blur-3xl" />
                        <div className="absolute -bottom-16 -left-12 h-40 w-40 rounded-full bg-brand-500/10 blur-3xl" />
                    </div>

                    <div className="relative flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 px-6 py-5 dark:border-white/5">
                        <div className="flex min-w-0 items-start gap-3">
                            <IconTile tone="lime" size="lg">
                                <FileSignature />
                            </IconTile>
                            <div className="min-w-0">
                                <h2 className="text-[15px] font-extrabold tracking-tight text-slate-900 dark:text-white">
                                    Persetujuan & Pengesahan RKAS
                                </h2>
                                <p className="mt-0.5 text-[10.5px] font-medium text-slate-400 dark:text-slate-500">
                                    Berikan stempel pengesahan resmi Kepala Sekolah untuk dokumen RKAS ini.
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => !processing && setShowApproveModal(false)}
                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-400 transition hover:bg-slate-100 hover:text-slate-800 dark:bg-white/5 dark:hover:bg-white/10 dark:hover:text-white"
                            aria-label="Tutup"
                        >
                            <X className="h-3.5 w-3.5" />
                        </button>
                    </div>

                    <div className="sikas-scroll relative flex-1 space-y-4 overflow-y-auto px-6 py-5">
                        <p className="text-[12px] font-medium leading-relaxed text-slate-600 dark:text-slate-300">
                            Dengan menekan tombol setujui, Anda selaku <strong className="font-bold text-slate-900 dark:text-white">Kepala Sekolah</strong> menyatakan telah menelaah dan menyetujui rencana belanja pada dokumen RKAS ini.
                        </p>

                        <div>
                            <label className="mb-1.5 block text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                Catatan Pengesahan (Opsional)
                            </label>
                            <textarea
                                value={catatan}
                                onChange={(e) => setCatatan(e.target.value)}
                                rows={3}
                                placeholder="Contoh: Disetujui dengan catatan alokasi sarpras diprioritaskan pada Semester 1..."
                                className="w-full rounded-xl border border-slate-200/90 bg-white px-3.5 py-2.5 text-[12px] font-medium text-slate-800 shadow-sm transition placeholder:text-slate-400 focus:border-lime-400 focus:outline-none focus:ring-4 focus:ring-lime-200/60 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-lime-400/70 dark:focus:ring-lime-400/10"
                            />
                        </div>
                    </div>

                    <div className="relative flex shrink-0 items-center justify-end gap-2 border-t border-slate-100 px-6 py-4 dark:border-white/5">
                        <SecondaryButton onClick={() => setShowApproveModal(false)} disabled={processing}>
                            Batal
                        </SecondaryButton>
                        <PrimaryButton disabled={processing}>
                            {processing ? 'Menyimpan...' : 'Setujui & Sahkan RKAS'}
                        </PrimaryButton>
                    </div>
                </form>
            </Modal>

            {/* Modal Konfirmasi Batalkan Persetujuan (Neo-Bento) */}
            <Modal show={showUnapproveModal} onClose={() => !unapproving && setShowUnapproveModal(false)} maxWidth="sm">
                <div className="relative flex flex-col overflow-hidden rounded-[26px] bg-white dark:bg-[#15131F]">
                    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[26px]">
                        <div className="absolute -right-12 -top-16 h-40 w-40 rounded-full bg-rose-500/15 blur-3xl" />
                    </div>

                    <div className="relative flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 px-6 py-5 dark:border-white/5">
                        <div className="flex min-w-0 items-start gap-3">
                            <IconTile tone="rose" size="lg">
                                <AlertTriangle />
                            </IconTile>
                            <div className="min-w-0">
                                <h2 className="text-[15px] font-extrabold tracking-tight text-slate-900 dark:text-white">
                                    Batalkan Pengesahan RKAS
                                </h2>
                                <p className="mt-0.5 text-[10.5px] font-medium text-slate-400 dark:text-slate-500">
                                    Kembalikan dokumen RKAS ke status draft untuk penelaahan ulang.
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => !unapproving && setShowUnapproveModal(false)}
                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-400 transition hover:bg-slate-100 hover:text-slate-800 dark:bg-white/5 dark:hover:bg-white/10 dark:hover:text-white"
                            aria-label="Tutup"
                        >
                            <X className="h-3.5 w-3.5" />
                        </button>
                    </div>

                    <div className="relative px-6 py-5 text-[12px] font-medium leading-relaxed text-slate-600 dark:text-slate-300">
                        Apakah Anda yakin ingin membatalkan persetujuan / pengesahan dokumen RKAS ini?
                    </div>

                    <div className="relative flex shrink-0 items-center justify-end gap-2 border-t border-slate-100 px-6 py-4 dark:border-white/5">
                        <SecondaryButton onClick={() => setShowUnapproveModal(false)} disabled={unapproving}>
                            Batal
                        </SecondaryButton>
                        <DangerButton onClick={handleUnapproveConfirm} disabled={unapproving}>
                            {unapproving ? 'Membatalkan...' : 'Ya, Batalkan'}
                        </DangerButton>
                    </div>
                </div>
            </Modal>
        </>
    );
}
