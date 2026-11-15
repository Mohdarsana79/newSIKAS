import Modal from '@/Components/Modal';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import { router } from '@inertiajs/react';
import { 
    CheckCircle, 
    ShieldCheck, 
    FileSignature, 
    Clock, 
    AlertCircle, 
    RotateCcw 
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
}

export default function RkasApprovalBanner({
    anggaran,
    routePrefix = '',
    isKepalaSekolah,
}: RkasApprovalBannerProps) {
    const isApproved = anggaran.status_persetujuan === 'disetujui';
    const [showApproveModal, setShowApproveModal] = useState(false);
    const [catatan, setCatatan] = useState('');
    const [processing, setProcessing] = useState(false);

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
            }
        );
    };

    const handleUnapprove = () => {
        if (confirm('Apakah Anda yakin ingin membatalkan persetujuan / pengesahan RKAS ini?')) {
            router.post(
                route(`${routePrefix}penganggaran.unapprove`, anggaran.id),
                {},
                { preserveScroll: true }
            );
        }
    };

    return (
        <>
            {isApproved ? (
                /* Stempel Persetujuan / Disahkan */
                <div className="bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/30 rounded-xl p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
                    <div className="flex items-start gap-3.5">
                        <div className="p-2.5 bg-emerald-600 text-white rounded-xl shadow-md shadow-emerald-500/20 shrink-0">
                            <ShieldCheck className="w-6 h-6" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="font-bold text-emerald-800 dark:text-emerald-300 text-base">
                                    Dokumen RKAS Telah Disetujui & Disahkan
                                </span>
                                <span className="text-[10px] bg-emerald-600 text-white font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                                    Disahkan
                                </span>
                            </div>
                            <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                                Disetujui oleh: <strong className="text-gray-900 dark:text-white">{anggaran.persetujuan_user?.name || 'Kepala Sekolah'}</strong>
                                {anggaran.tanggal_persetujuan && ` pada ${anggaran.tanggal_persetujuan}`}
                            </p>
                            {anggaran.catatan_persetujuan && (
                                <div className="mt-2 text-xs italic bg-white/70 dark:bg-gray-800/70 border border-emerald-200 dark:border-emerald-800/50 p-2 rounded-lg text-gray-700 dark:text-gray-300">
                                    &ldquo;{anggaran.catatan_persetujuan}&rdquo;
                                </div>
                            )}
                        </div>
                    </div>

                    {isKepalaSekolah && (
                        <button
                            onClick={handleUnapprove}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/30 dark:hover:bg-rose-950/50 border border-rose-200 dark:border-rose-900 rounded-lg transition-colors shrink-0"
                            title="Batalkan pengesahan untuk review ulang"
                        >
                            <RotateCcw className="w-3.5 h-3.5" />
                            Batalkan Persetujuan
                        </button>
                    )}
                </div>
            ) : (
                /* Status Draft / Menunggu Persetujuan */
                <div className="bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-lg shrink-0">
                            <Clock className="w-5 h-5" />
                        </div>
                        <div>
                            <span className="font-semibold text-gray-800 dark:text-gray-200 text-sm">
                                Status: Belum Disahkan Kepala Sekolah
                            </span>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                {isKepalaSekolah 
                                    ? 'Silakan telaah rincian belanja di bawah dan berikan catatan sebelum menyetujui anggaran.' 
                                    : 'Menunggu penelaahan dan stempel persetujuan dari Kepala Sekolah.'}
                            </p>
                        </div>
                    </div>

                    {isKepalaSekolah && (
                        <PrimaryButton
                            onClick={() => setShowApproveModal(true)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2 shrink-0 shadow-sm"
                        >
                            <FileSignature className="w-4 h-4" />
                            Beri Persetujuan RKAS
                        </PrimaryButton>
                    )}
                </div>
            )}

            {/* Modal Beri Persetujuan */}
            <Modal show={showApproveModal} onClose={() => setShowApproveModal(false)} maxWidth="md">
                <form onSubmit={handleApproveSubmit} className="p-6">
                    <div className="flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-gray-100 mb-2 pb-2 border-b border-gray-100 dark:border-gray-700">
                        <FileSignature className="w-5 h-5 text-emerald-600" />
                        Persetujuan & Pengesahan RKAS
                    </div>

                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                        Dengan menekan tombol setujui, Anda selaku Kepala Sekolah menyatakan telah menelaah dan menyetujui rencana belanja pada dokumen RKAS ini.
                    </p>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Catatan Pengesahan (Opsional)
                        </label>
                        <textarea
                            value={catatan}
                            onChange={(e) => setCatatan(e.target.value)}
                            rows={3}
                            placeholder="Contoh: Disetujui dengan catatan alokasi sarpras diprioritaskan pada Semester 1..."
                            className="w-full rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 focus:border-emerald-500 focus:ring-emerald-500 text-sm"
                        />
                    </div>

                    <div className="mt-6 flex justify-end gap-3">
                        <SecondaryButton onClick={() => setShowApproveModal(false)}>
                            Batal
                        </SecondaryButton>
                        <PrimaryButton disabled={processing} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                            {processing ? 'Menyimpan...' : 'Setujui & Sahkan RKAS'}
                        </PrimaryButton>
                    </div>
                </form>
            </Modal>
        </>
    );
}

