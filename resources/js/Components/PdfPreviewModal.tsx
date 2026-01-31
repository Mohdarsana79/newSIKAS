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

    // Construct preview URL with parameters to disable embedded viewer toolbar if possible
    // Note: PDF toolbar control depends heavily on browser implementation
    const viewerUrl = `${pdfUrl}#toolbar=0&navpanes=0&scrollbar=0`;

    return (
        <Modal show={show} onClose={onClose} maxWidth="7xl">
            <div className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-xl transform transition-all h-[90vh] flex flex-col">
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
                            onClick={() => window.open(pdfUrl, '_blank')}
                            className="p-1 hover:bg-indigo-500 rounded text-white transition-colors"
                            title="Buka di Tab Baru"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
                        </button>
                        <button
                            onClick={onClose}
                            className="p-1 hover:bg-indigo-500 rounded text-white transition-colors"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                        </button>
                    </div>
                </div>

                {/* Toolbar Mockup (Optional - pure visual to match requested image) */}
                <div className="bg-gray-800 text-white px-4 py-2 flex items-center justify-between text-sm">
                    <div className="flex items-center gap-4">
                        <button className="hover:text-gray-300"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h7"></path></svg></button>
                        <span>Kwitansi Pembayaran</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center bg-gray-700 rounded px-2">
                            <span>1 / 1</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span>-</span>
                            <span>80%</span>
                            <span>+</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>
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
