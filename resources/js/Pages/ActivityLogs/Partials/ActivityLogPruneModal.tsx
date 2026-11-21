import Modal from '@/Components/Modal';
import SecondaryButton from '@/Components/SecondaryButton';
import IconTile from '@/Components/ui/IconTile';
import { useForm } from '@inertiajs/react';
import { AlertTriangle, ShieldAlert, Trash2, X } from 'lucide-react';
import { FormEvent } from 'react';

interface ActivityLogPruneModalProps {
    show: boolean;
    onClose: () => void;
}

const RETENTION_OPTIONS: Array<{
    days: 90 | 180 | 365;
    title: string;
    subtitle: string;
}> = [
    {
        days: 90,
        title: 'Lebih tua dari 90 hari (3 Bulan)',
        subtitle: 'Cocok untuk menjaga ukuran database tetap ringkas per triwulan.',
    },
    {
        days: 180,
        title: 'Lebih tua dari 180 hari (6 Bulan)',
        subtitle: 'Menyimpan riwayat semester berjalan untuk rekonsiliasi tahap BOSP.',
    },
    {
        days: 365,
        title: 'Lebih tua dari 365 hari (1 Tahun)',
        subtitle: 'Disarankan untuk menyimpan penuh 1 tahun anggaran sebelum arsip dibersihkan.',
    },
];

export default function ActivityLogPruneModal({ show, onClose }: ActivityLogPruneModalProps) {
    const { data, setData, post, processing, errors, reset } = useForm<{
        retention_days: 90 | 180 | 365;
    }>({
        retention_days: 365,
    });

    const handleClose = () => {
        if (processing) return;
        reset();
        onClose();
    };

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        post(route('activity-logs.prune'), {
            preserveScroll: true,
            onSuccess: () => {
                reset();
                onClose();
            },
        });
    };

    return (
        <Modal
            show={show}
            onClose={handleClose}
            maxWidth="lg"
            closeable={!processing}
            ariaLabelledBy="activity-log-prune-title"
        >
            <form onSubmit={handleSubmit} className="relative overflow-hidden bg-white dark:bg-[#15131F]">
                <div
                    aria-hidden
                    className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full bg-rose-500/15 blur-3xl dark:bg-rose-500/20"
                />

                {/* Header */}
                <div className="relative flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-6 dark:border-white/10">
                    <div className="flex items-start gap-3">
                        <IconTile tone="rose" size="lg">
                            <Trash2 />
                        </IconTile>
                        <div>
                            <h3
                                id="activity-log-prune-title"
                                className="text-[15px] font-extrabold tracking-tight text-slate-900 dark:text-white"
                            >
                                Bersihkan Log Aktivitas Lama
                            </h3>
                            <p className="mt-0.5 text-[11.5px] font-medium text-slate-500 dark:text-slate-400">
                                Pilih batas retensi log yang akan dihapus secara permanen.
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={handleClose}
                        disabled={processing}
                        aria-label="Tutup modal pembersihan log"
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50 dark:hover:bg-white/10 dark:hover:text-white"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {/* Body */}
                <div className="space-y-4 px-5 py-4 sm:px-6">
                    <fieldset className="space-y-2.5">
                        <legend className="sr-only">Pilihan batas retensi pembersihan log</legend>
                        {RETENTION_OPTIONS.map((opt) => {
                            const selected = data.retention_days === opt.days;
                            return (
                                <label
                                    key={opt.days}
                                    className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-3.5 transition ${
                                        selected
                                            ? 'border-rose-400 bg-rose-50/70 ring-2 ring-rose-400/20 dark:border-rose-500/60 dark:bg-rose-500/10'
                                            : 'border-slate-200/80 bg-white hover:border-slate-300 dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-white/20'
                                    }`}
                                >
                                    <input
                                        type="radio"
                                        name="retention_days"
                                        value={opt.days}
                                        checked={selected}
                                        onChange={() => setData('retention_days', opt.days)}
                                        className="mt-0.5 h-4 w-4 border-slate-300 text-rose-600 focus:ring-rose-500 dark:border-white/20 dark:bg-white/5"
                                    />
                                    <div className="min-w-0">
                                        <p className="text-[12.5px] font-extrabold text-slate-900 dark:text-white">
                                            {opt.title}
                                        </p>
                                        <p className="mt-0.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                                            {opt.subtitle}
                                        </p>
                                    </div>
                                </label>
                            );
                        })}
                    </fieldset>

                    {errors.retention_days && (
                        <p className="text-[11.5px] font-bold text-rose-600 dark:text-rose-400">
                            {errors.retention_days}
                        </p>
                    )}

                    <div className="flex items-start gap-2.5 rounded-2xl border border-amber-200/90 bg-amber-50/80 p-3.5 text-amber-800 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-200">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                        <div className="text-[11px] font-medium leading-relaxed">
                            <p className="font-extrabold">Demi integritas audit:</p>
                            <p className="mt-0.5">
                                Sebaiknya unduh <strong>Ekspor CSV</strong> terlebih dahulu sebelum membersihkan log lama. Aksi pembersihan ini akan otomatis tercatat sebagai entri audit baru berstatus <strong>Kritis</strong>.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 bg-slate-50/70 px-5 py-3.5 sm:px-6 dark:border-white/10 dark:bg-white/[0.02]">
                    <SecondaryButton type="button" onClick={handleClose} disabled={processing}>
                        Batal
                    </SecondaryButton>
                    <button
                        type="submit"
                        disabled={processing}
                        className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-[12px] font-extrabold text-white shadow-sm transition hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-500/50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        <ShieldAlert className="h-3.5 w-3.5" />
                        {processing ? 'Membersihkan...' : `Bersihkan Log > ${data.retention_days} Hari`}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
