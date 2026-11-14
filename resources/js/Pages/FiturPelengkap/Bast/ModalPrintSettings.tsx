import { useState } from 'react';
import Select from 'react-select';
import { Printer, SlidersHorizontal, X } from 'lucide-react';
import Modal from '@/Components/Modal';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import IconTile from '@/Components/ui/IconTile';
import StatusBadge from '@/Components/ui/StatusBadge';
import InputLabel from '@/Components/InputLabel';
import { BAST_SELECT_CLASS_NAMES, SelectOption } from './bastModalTheme';

const PAPER_SIZE_OPTIONS: SelectOption[] = [
    { value: 'A4', label: 'A4 (210 x 297 mm)' },
    { value: 'F4', label: 'F4 / Folio (8.5 x 13 in)' },
    { value: 'Letter', label: 'Letter (8.5 x 11 in)' },
    { value: 'Legal', label: 'Legal (8.5 x 14 in)' },
];

const FONT_SIZE_OPTIONS: SelectOption[] = [
    { value: '8pt', label: '8pt' },
    { value: '9pt', label: '9pt' },
    { value: '10pt', label: '10pt' },
    { value: '11pt', label: '11pt (Standar)' },
];

export default function ModalPrintSettings({
    show,
    onClose,
    pdfUrl,
}: {
    show: boolean;
    onClose: () => void;
    pdfUrl: string;
}) {
    const [paperSize, setPaperSize] = useState('A4');
    const [fontSize, setFontSize] = useState('11pt');

    const handlePrint = () => {
        if (!pdfUrl) return;
        const url = new URL(pdfUrl, window.location.origin);
        url.searchParams.set('paperSize', paperSize);
        url.searchParams.set('fontSize', fontSize);

        window.open(url.toString(), '_blank');
        onClose();
    };

    return (
        <Modal show={show} onClose={onClose} maxWidth="sm">
            <div className="relative rounded-[26px] bg-white shadow-card-light dark:bg-[#15131F] dark:shadow-card-dark">
                <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[26px]">
                    <div className="absolute -right-12 -top-16 h-44 w-44 rounded-full bg-pastel-lavender/75 blur-3xl dark:bg-brand-500/15" />
                    <div className="absolute -bottom-16 -left-10 h-36 w-36 rounded-full bg-lime-200/60 blur-3xl dark:bg-lime-400/10" />
                </div>

                <div className="relative">
                    {/* Header Neo-Bento */}
                    <div className="flex items-start justify-between gap-3 rounded-t-[26px] border-b border-slate-100 px-6 py-4 dark:border-white/10">
                        <div className="flex min-w-0 items-center gap-3.5">
                            <IconTile tone="ink" size="md">
                                <Printer />
                            </IconTile>
                            <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                    <h2 className="text-[15.5px] font-extrabold tracking-tight text-slate-900 dark:text-white">
                                        Pengaturan Cetak PDF
                                    </h2>
                                    <StatusBadge tone="violet" dot={false}>
                                        Cetak PDF
                                    </StatusBadge>
                                </div>
                                <p className="mt-0.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                                    Atur ukuran kertas dan font sebelum mencetak BAST.
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-500 dark:hover:bg-white/10 dark:hover:text-white"
                            aria-label="Tutup pengaturan cetak"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>

                    {/* Isi Bento */}
                    <div className="px-6 py-5">
                        <div className="rounded-[20px] border border-slate-200/80 bg-slate-50/75 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                            <div className="mb-3.5 flex items-center gap-2 text-[10.5px] font-extrabold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                                <SlidersHorizontal className="h-3.5 w-3.5 text-brand-500 dark:text-brand-300" />
                                Tata Letak Halaman
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <InputLabel htmlFor="bast-print-paper" value="Ukuran Kertas" className="mb-1.5" />
                                    <Select<SelectOption, false>
                                        inputId="bast-print-paper"
                                        unstyled
                                        isSearchable={false}
                                        isClearable={false}
                                        menuPlacement="auto"
                                        options={PAPER_SIZE_OPTIONS}
                                        value={PAPER_SIZE_OPTIONS.find((opt) => opt.value === paperSize) ?? null}
                                        onChange={(opt) => setPaperSize(opt ? opt.value : 'A4')}
                                        classNames={BAST_SELECT_CLASS_NAMES}
                                    />
                                </div>

                                <div>
                                    <InputLabel htmlFor="bast-print-font" value="Ukuran Font" className="mb-1.5" />
                                    <Select<SelectOption, false>
                                        inputId="bast-print-font"
                                        unstyled
                                        isSearchable={false}
                                        isClearable={false}
                                        menuPlacement="auto"
                                        options={FONT_SIZE_OPTIONS}
                                        value={FONT_SIZE_OPTIONS.find((opt) => opt.value === fontSize) ?? null}
                                        onChange={(opt) => setFontSize(opt ? opt.value : '11pt')}
                                        classNames={BAST_SELECT_CLASS_NAMES}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="flex flex-wrap items-center justify-end gap-2.5 rounded-b-[26px] border-t border-slate-100 bg-slate-50/70 px-6 py-4 dark:border-white/5 dark:bg-white/[0.02]">
                        <SecondaryButton type="button" onClick={onClose}>
                            Batal
                        </SecondaryButton>
                        <PrimaryButton type="button" onClick={handlePrint} disabled={!pdfUrl}>
                            <Printer className="h-4 w-4" />
                            Cetak PDF
                        </PrimaryButton>
                    </div>
                </div>
            </div>
        </Modal>
    );
}
