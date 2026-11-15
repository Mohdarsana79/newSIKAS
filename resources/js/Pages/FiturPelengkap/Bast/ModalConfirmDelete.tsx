import React from 'react';
import Modal from '@/Components/Modal';
import SecondaryButton from '@/Components/SecondaryButton';
import DangerButton from '@/Components/DangerButton';
import IconTile from '@/Components/ui/IconTile';

export default function ModalConfirmDelete({ show, onClose, onConfirm, title, message }: { show: boolean, onClose: () => void, onConfirm: () => void, title?: string, message?: string }) {
    return (
        <Modal show={show} onClose={onClose} maxWidth="sm">
            <div className="relative overflow-hidden px-6 py-6 text-center">
                <div className="pointer-events-none absolute -right-12 -top-16 h-40 w-40 rounded-full bg-rose-500/10 blur-3xl" />
                <div className="relative mx-auto mb-4 flex justify-center">
                    <IconTile tone="rose" size="lg">
                        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </IconTile>
                </div>
                <h3 className="relative text-[15px] font-extrabold leading-6 text-slate-900 dark:text-white">
                    {title || 'Konfirmasi Hapus'}
                </h3>
                <div className="relative mt-2">
                    <p className="text-[11.5px] font-medium leading-relaxed text-slate-500 dark:text-slate-400">
                        {message || 'Apakah Anda yakin ingin menghapus data ini? Aksi ini tidak dapat dibatalkan.'}
                    </p>
                </div>
                <div className="relative mt-6 flex justify-center gap-2">
                    <SecondaryButton
                        onClick={onClose}
                    >
                        Batal
                    </SecondaryButton>
                    <DangerButton
                        onClick={() => {
                            onConfirm();
                            onClose();
                        }}
                    >
                        Ya, Hapus
                    </DangerButton>
                </div>
            </div>
        </Modal>
    );
}
