import React from 'react';
import Modal from '@/Components/Modal';
import IconTile from '@/Components/ui/IconTile';
import { AlertTriangle, Info, Trash2 } from 'lucide-react';

interface Props {
    show: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title?: string;
    message?: string;
    confirmText?: string;
    cancelText?: string;
    type?: 'danger' | 'warning' | 'info';
    loading?: boolean;
}

export default function ConfirmModal({
    show,
    onClose,
    onConfirm,
    title = 'Konfirmasi Tindakan',
    message = 'Apakah Anda yakin ingin melanjutkan tindakan ini?',
    confirmText = 'Ya, Lanjutkan',
    cancelText = 'Batal',
    type = 'danger',
    loading = false,
}: Props) {
    const isDanger = type === 'danger';
    const isWarning = type === 'warning';

    return (
        <Modal show={show} onClose={onClose} maxWidth="sm">
            <div className="relative overflow-hidden">
                <div
                    className={`pointer-events-none absolute -right-10 -top-16 h-40 w-40 rounded-full blur-3xl ${
                        isDanger
                            ? 'bg-rose-500/10 dark:bg-rose-500/[0.08]'
                            : isWarning
                            ? 'bg-amber-400/20 dark:bg-amber-400/10'
                            : 'bg-brand-500/10 dark:bg-brand-500/[0.08]'
                    }`}
                />

                {/* Header */}
                <div className="relative flex items-center gap-3 border-b border-slate-100 px-6 py-4 dark:border-white/5">
                    <IconTile tone={isDanger ? 'rose' : isWarning ? 'amber' : 'violet'} size="lg">
                        {isDanger ? (
                            <Trash2 className="w-4 h-4" />
                        ) : isWarning ? (
                            <AlertTriangle className="w-4 h-4" />
                        ) : (
                            <Info className="w-4 h-4" />
                        )}
                    </IconTile>
                    <div className="min-w-0">
                        <h3 className="text-[14px] font-extrabold tracking-tight text-slate-900 dark:text-white">
                            {title}
                        </h3>
                        <p className="mt-0.5 text-[10px] font-medium text-slate-400 dark:text-slate-500">
                            Konfirmasi tindakan
                        </p>
                    </div>
                </div>

                {/* Body */}
                <div className="px-6 py-5">
                    <p className="text-[11.5px] font-medium leading-relaxed text-slate-500 dark:text-slate-400">
                        {message}
                    </p>
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4 dark:border-white/5">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={loading}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-[11.5px] font-bold text-slate-700 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
                    >
                        {cancelText}
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={loading}
                        className={`inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-[11.5px] font-extrabold text-white shadow-lg transition-all duration-200 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 ${
                            isDanger
                                ? 'bg-rose-500 shadow-rose-500/25 hover:bg-rose-600'
                                : isWarning
                                ? 'bg-amber-500 shadow-amber-500/25 hover:bg-amber-600'
                                : 'bg-brand-500 shadow-brand-500/25 hover:bg-brand-600'
                        }`}
                    >
                        {loading ? 'Memproses...' : confirmText}
                    </button>
                </div>
            </div>
        </Modal>
    );
}
