import React, { useState, useEffect } from 'react';
import Modal from '@/Components/Modal';

interface PdfPreviewModalProps {
    show: boolean;
    onClose: () => void;
    pdfUrl: string;
    title?: string;
}

export default function PdfPreviewModal({ show, onClose, pdfUrl, title = 'Preview Kwitansi' }: PdfPreviewModalProps) {
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (show) {
            setIsLoading(true);
        }
    }, [show, pdfUrl]);

    // Use raw URL to show native browser PDF toolbar (like Google's)
    const viewerUrl = pdfUrl;

    return (
        <Modal show={show} onClose={onClose} maxWidth="7xl">
            <div id="pdf-preview-modal-container" className="flex h-[90vh] transform flex-col overflow-hidden rounded-[26px] bg-white transition-all dark:bg-[#15131F]">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-white/10 bg-gradient-to-br from-[#2B2940] via-[#232135] to-[#191826] px-4 py-3">
                    <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-lime-400/15 text-lime-300 ring-1 ring-lime-400/30">
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                        </span>
                        <div>
                            <h3 className="text-[13px] font-extrabold text-white">{title}</h3>
                            <p className="text-[9.5px] font-semibold text-white/40">Pratinjau dokumen PDF</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => {
                                const elem = document.getElementById('pdf-preview-modal-container');
                                if (elem) {
                                    if (!document.fullscreenElement) {
                                        elem.requestFullscreen().catch(err => console.error(err));
                                    } else {
                                        document.exitFullscreen();
                                    }
                                }
                            }}
                            className="rounded-xl p-1.5 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
                            title="Fullscreen"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                            </svg>
                        </button>
                        <button
                            onClick={onClose}
                            className="rounded-xl p-1.5 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
                            aria-label="Tutup pratinjau"
                        >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                        </button>
                    </div>
                </div>

                {/* PDF Content */}
                <div className="relative flex flex-1 flex-col overflow-hidden bg-slate-100 p-0 dark:bg-black/30">
                    {isLoading && (
                        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-100 text-slate-500 dark:bg-black/40 dark:text-slate-400">
                            <svg className="mb-2 h-10 w-10 animate-spin text-brand-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span className="text-[11px] font-semibold">PDF sedang dimuat...</span>
                        </div>
                    )}
                    <iframe
                        src={viewerUrl}
                        className="h-full w-full border-0"
                        onLoad={() => setIsLoading(false)}
                        title="PDF Viewer"
                    />
                </div>

                {/* Footer Actions */}
                <div className="flex justify-end gap-2 border-t border-slate-100 bg-white px-4 py-3 dark:border-white/5 dark:bg-[#15131F]">
                    <button
                        onClick={onClose}
                        className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-[11.5px] font-bold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
                    >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                        Tutup
                    </button>
                    <a
                        href={pdfUrl}
                        download
                        className="flex items-center gap-2 rounded-2xl bg-lime-400 px-4 py-2.5 text-[11.5px] font-extrabold text-slate-950 shadow-lime transition hover:-translate-y-0.5 hover:bg-lime-300"
                    >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                        Download
                    </a>
                </div>
            </div>
        </Modal>
    );
}
