import React, { useState } from 'react';
import Modal from '@/Components/Modal';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import IconTile from '@/Components/ui/IconTile';
import InputLabel from '@/Components/InputLabel';

const SELECT_CLASS =
    'w-full rounded-xl border border-slate-200/90 bg-white px-3.5 py-2.5 text-[12px] font-semibold text-slate-800 shadow-sm transition focus:border-lime-400 focus:outline-none focus:ring-4 focus:ring-lime-200/60 dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:border-lime-400/70 dark:focus:ring-lime-400/10';

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
            <div className="relative overflow-hidden">
                <div className="pointer-events-none absolute -right-10 -top-16 h-40 w-40 rounded-full bg-brand-500/10 blur-3xl" />
                <div className="relative flex items-center gap-3 border-b border-slate-100 px-6 py-4 dark:border-white/5">
                    <IconTile tone="ink" size="md">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                            <path d="M6 9V2h12v7" />
                            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                            <rect x="6" y="14" width="12" height="8" rx="1" />
                        </svg>
                    </IconTile>
                    <div className="min-w-0">
                        <h2 className="truncate text-[14px] font-extrabold text-slate-900 dark:text-white">Pengaturan Cetak PDF</h2>
                        <p className="truncate text-[10px] font-medium text-slate-400 dark:text-slate-500">
                            Atur ukuran kertas dan font sebelum mencetak.
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="sikas-icon-btn ml-auto h-8 w-8"
                        aria-label="Tutup pengaturan cetak"
                    >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="space-y-4 px-6 py-5">
                    <div>
                        <InputLabel>Ukuran Kertas</InputLabel>
                        <select 
                            value={paperSize} 
                            onChange={(e) => setPaperSize(e.target.value)}
                            className={SELECT_CLASS}
                        >
                            <option value="A4">A4 (210 x 297 mm)</option>
                            <option value="F4">F4 / Folio (8.5 x 13 in)</option>
                            <option value="Letter">Letter (8.5 x 11 in)</option>
                            <option value="Legal">Legal (8.5 x 14 in)</option>
                        </select>
                    </div>

                    <div>
                        <InputLabel>Ukuran Font</InputLabel>
                        <select 
                            value={fontSize} 
                            onChange={(e) => setFontSize(e.target.value)}
                            className={SELECT_CLASS}
                        >
                            <option value="8pt">8pt</option>
                            <option value="9pt">9pt</option>
                            <option value="10pt">10pt</option>
                            <option value="11pt">11pt (Standar)</option>
                        </select>
                    </div>

                    <div className="flex justify-end gap-2 border-t border-slate-100 pt-4 dark:border-white/5">
                        <SecondaryButton onClick={onClose}>
                            Batal
                        </SecondaryButton>
                        <PrimaryButton onClick={handlePrint}>
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2M6 14h12v8H6z" />
                            </svg>
                            Cetak PDF
                        </PrimaryButton>
                    </div>
                </div>
            </div>
        </Modal>
    );
}
