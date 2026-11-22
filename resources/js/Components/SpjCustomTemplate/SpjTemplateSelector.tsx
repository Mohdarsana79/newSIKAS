import React from 'react';
import { SPJ_DOCUMENT_LABELS, SpjCustomTemplate, SpjDocumentType, SpjSelectedFormat } from './types';

interface SpjTemplateSelectorProps {
    docType: SpjDocumentType;
    templates: SpjCustomTemplate[];
    selectedFormat: SpjSelectedFormat;
    onChangeFormat: (format: SpjSelectedFormat) => void;
    onOpenModal: () => void;
    canManage: boolean;
    libreOfficeAvailable?: boolean;
    compact?: boolean;
}

export default function SpjTemplateSelector({
    docType,
    templates,
    selectedFormat,
    onChangeFormat,
    onOpenModal,
    canManage,
    libreOfficeAvailable = true,
    compact = false,
}: SpjTemplateSelectorProps) {
    const label = SPJ_DOCUMENT_LABELS[docType];
    const isCustomActive = selectedFormat.startsWith('custom:');

    return (
        <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex items-center">
                <select
                    aria-label={`Format ${label}`}
                    value={selectedFormat}
                    onChange={(e) => onChangeFormat(e.target.value as SpjSelectedFormat)}
                    className={`rounded-2xl border border-slate-200/90 bg-white pr-8 font-bold text-slate-700 shadow-pill transition focus:border-lime-400 focus:outline-none focus:ring-4 focus:ring-lime-200/60 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:focus:border-lime-400/70 dark:focus:ring-lime-400/10 ${
                        compact ? 'py-2 pl-3 text-[11px]' : 'py-2.5 pl-3.5 text-[11.5px]'
                    }`}
                >
                    <option value="default" className="text-slate-900">
                        Format Bawaan SIKAS
                    </option>
                    {templates.length > 0 && (
                        <optgroup label={`Template Kustom ${label} (Word)`} className="text-slate-900">
                            {templates.map((tpl) => (
                                <option key={tpl.id} value={`custom:${tpl.id}`} className="text-slate-900">
                                    Kustom: {tpl.nama}
                                </option>
                            ))}
                        </optgroup>
                    )}
                </select>
            </div>

            <button
                type="button"
                onClick={onOpenModal}
                className={`inline-flex items-center gap-1.5 rounded-2xl border border-brand-200/90 bg-brand-50/70 font-extrabold text-brand-700 shadow-pill transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-300 hover:bg-brand-100/80 dark:border-brand-400/25 dark:bg-brand-500/10 dark:text-brand-300 dark:hover:bg-brand-500/20 ${
                    compact ? 'px-3 py-2 text-[11px]' : 'px-3.5 py-2.5 text-[11.5px]'
                }`}
                title={canManage ? `Unggah & kelola template kustom ${label} (.docx)` : `Lihat template & variabel ${label}`}
            >
                <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="12" y1="18" x2="12" y2="12" />
                    <line x1="9" y1="15" x2="15" y2="15" />
                </svg>
                <span>{canManage ? 'Kelola Template' : 'Lihat Template'}</span>
                {templates.length > 0 && (
                    <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-600 px-1 text-[9.5px] font-extrabold text-white dark:bg-brand-400 dark:text-slate-950">
                        {templates.length}
                    </span>
                )}
            </button>

            {isCustomActive && !libreOfficeAvailable && (
                <span
                    className="inline-flex items-center rounded-xl border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-bold text-amber-700 dark:border-amber-400/25 dark:bg-amber-500/10 dark:text-amber-300"
                    title="LibreOffice tidak terdeteksi — unduh Word (.docx) tetap tersedia, ekspor PDF membutuhkan LibreOffice."
                >
                    DOCX saja (LibreOffice offline)
                </span>
            )}
        </div>
    );
}
