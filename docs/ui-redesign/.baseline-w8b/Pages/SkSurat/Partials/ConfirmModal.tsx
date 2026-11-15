import React from 'react';
import Modal from '@/Components/Modal';
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
            <div className="p-6 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 text-gray-900 dark:text-white rounded-2xl text-center shadow-xl">
                {/* Icon */}
                <div
                    className={`mx-auto flex items-center justify-center h-12 w-12 rounded-2xl mb-4 ${
                        isDanger
                            ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20'
                            : isWarning
                            ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20'
                            : 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20'
                    }`}
                >
                    {isDanger ? (
                        <Trash2 className="w-6 h-6" />
                    ) : isWarning ? (
                        <AlertTriangle className="w-6 h-6" />
                    ) : (
                        <Info className="w-6 h-6" />
                    )}
                </div>

                {/* Title & Message */}
                <h3 className="text-base font-bold text-gray-900 dark:text-slate-100 mb-1.5">
                    {title}
                </h3>
                <p className="text-xs text-gray-500 dark:text-slate-400 leading-relaxed mb-6">
                    {message}
                </p>

                {/* Actions */}
                <div className="flex justify-center gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={loading}
                        className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-200 text-xs font-semibold rounded-xl border border-gray-200 dark:border-slate-700 transition-colors"
                    >
                        {cancelText}
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={loading}
                        className={`px-4 py-2 text-white text-xs font-semibold rounded-xl shadow-md transition-colors ${
                            isDanger
                                ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-500/20'
                                : isWarning
                                ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-500/20'
                                : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/20'
                        }`}
                    >
                        {loading ? 'Memproses...' : confirmText}
                    </button>
                </div>
            </div>
        </Modal>
    );
}
