import React from 'react';
import Modal from '@/Components/Modal';
import SecondaryButton from '@/Components/SecondaryButton';

export default function ModalPreview({ show, onClose, title, url }: { show: boolean, onClose: () => void, title: string, url: string }) {
    return (
        <Modal show={show} onClose={onClose} maxWidth="6xl">
            <div className="flex h-[86vh] flex-col overflow-hidden">
                <div className="flex items-center justify-between gap-3 border-b border-white/10 bg-gradient-to-br from-[#2B2940] via-[#232135] to-[#191826] px-4 py-3">
                    <div className="flex min-w-0 items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-lime-400/15 text-lime-300 ring-1 ring-lime-400/30">
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
                                <circle cx="12" cy="12" r="3" />
                            </svg>
                        </span>
                        <div className="min-w-0">
                            <h2 className="truncate text-[13px] font-extrabold text-white">Preview: {title}</h2>
                            <p className="text-[9.5px] font-semibold text-white/40">Pratinjau dokumen</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded-xl p-1.5 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
                        aria-label="Tutup pratinjau"
                    >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="relative w-full flex-1 overflow-hidden bg-slate-100 dark:bg-black/30">
                    {show && url && (
                        <iframe
                            src={url}
                            className="h-full w-full border-0"
                            title={title}
                        />
                    )}
                </div>

                <div className="flex justify-end gap-2 border-t border-slate-100 bg-white px-4 py-3 dark:border-white/5 dark:bg-[#15131F]">
                    <SecondaryButton onClick={onClose}>Tutup</SecondaryButton>
                </div>
            </div>
        </Modal>
    );
}
