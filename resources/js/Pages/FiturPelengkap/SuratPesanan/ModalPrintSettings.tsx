import React, { useState } from 'react';
import Modal from '@/Components/Modal';

export default function ModalPrintSettings({ show, onClose, pdfUrl }: { show: boolean, onClose: () => void, pdfUrl: string }) {
    const [paperSize, setPaperSize] = useState('A4');
    const [fontSize, setFontSize] = useState('11pt');

    const handlePrint = () => {
        // Construct URL with query parameters
        const url = new URL(pdfUrl);
        url.searchParams.append('paperSize', paperSize);
        url.searchParams.append('fontSize', fontSize);
        
        window.open(url.toString(), '_blank');
        onClose();
    };

    return (
        <Modal show={show} onClose={onClose} maxWidth="sm">
            <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                        Pengaturan Cetak PDF
                    </h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">✕</button>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Ukuran Kertas
                        </label>
                        <select 
                            value={paperSize} 
                            onChange={(e) => setPaperSize(e.target.value)}
                            className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        >
                            <option value="A4">A4 (210 x 297 mm)</option>
                            <option value="F4">F4 / Folio (8.5 x 13 in)</option>
                            <option value="Letter">Letter (8.5 x 11 in)</option>
                            <option value="Legal">Legal (8.5 x 14 in)</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Ukuran Font
                        </label>
                        <select 
                            value={fontSize} 
                            onChange={(e) => setFontSize(e.target.value)}
                            className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        >
                            <option value="8pt">8pt</option>
                            <option value="9pt">9pt</option>
                            <option value="10pt">10pt</option>
                            <option value="11pt">11pt (Standar)</option>
                        </select>
                    </div>
                </div>

                <div className="mt-6 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">
                        Batal
                    </button>
                    <button onClick={handlePrint} className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">
                        Cetak PDF
                    </button>
                </div>
            </div>
        </Modal>
    );
}
