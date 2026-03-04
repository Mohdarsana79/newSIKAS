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
            <div id="pdf-preview-modal-container" className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-xl transform transition-all h-[90vh] flex flex-col">
                {/* Header */}
                <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-indigo-600">
                    <div className="flex items-center gap-3">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                        <h3 className="text-lg font-medium text-white shadow-sm">
                            {title}
                        </h3>
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
                            className="p-1 hover:bg-indigo-500 rounded text-white transition-colors"
                            title="Fullscreen"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                            </svg>
                        </button>
                        <button
                            onClick={onClose}
                            className="p-1 hover:bg-indigo-500 rounded text-white transition-colors"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                        </button>
                    </div>
                </div>

                {/* PDF Content */}
                <div className="flex-1 bg-gray-100 p-0 relative overflow-hidden flex flex-col">
                    {isLoading && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-100 z-10 text-gray-500">
                            <svg className="animate-spin h-10 w-10 mb-2 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span>PDF sedang dimuat...</span>
                        </div>
                    )}
                    <iframe
                        src={viewerUrl}
                        className="w-full h-full border-0"
                        onLoad={() => setIsLoading(false)}
                        title="PDF Viewer"
                    />
                </div>

                {/* Footer Actions */}
                <div className="px-4 py-3 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md flex items-center gap-2 transition-colors text-sm font-medium"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                        Tutup
                    </button>
                    <a
                        href={pdfUrl}
                        download
                        className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-md flex items-center gap-2 transition-colors text-sm font-medium"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                        Download
                    </a>
                </div>
            </div>
        </Modal>
    );
}
