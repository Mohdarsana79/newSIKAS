import React, { useState, useEffect } from 'react';
import Modal from '@/Components/Modal';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import IconTile from '@/Components/ui/IconTile';

interface PrintSettingsModalProps {
    show: boolean;
    onClose: () => void;
    onPrint: (settings: PrintSettings) => void;
    title?: string;
    includePeriodFilters?: boolean; // New Prop
    initialPeriod?: string;
}

export interface PrintSettings {
    paperSize: string;
    orientation: string;
    fontSize: string;
    period?: string; // New Field
}

const SELECT_CLASS =
    'w-full rounded-xl border border-slate-200/90 bg-white px-3.5 py-2.5 text-[12px] font-semibold text-slate-800 shadow-sm transition focus:border-lime-400 focus:outline-none focus:ring-4 focus:ring-lime-200/60 dark:border-white/10 dark:bg-slate-900 dark:text-white dark:focus:border-lime-400/70 dark:focus:ring-lime-400/10';

const LABEL_CLASS =
    'mb-1.5 block text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500';

export default function PrintSettingsModal({ show, onClose, onPrint, title = 'Pengaturan Cetak', includePeriodFilters = false, initialPeriod = 'januari' }: PrintSettingsModalProps) {
    const [settings, setSettings] = useState<PrintSettings>({
        paperSize: 'F4',
        orientation: 'portrait',
        fontSize: '11pt',
        period: initialPeriod,
    });

    useEffect(() => {
        if (show && initialPeriod) {
            setSettings(prev => ({ ...prev, period: initialPeriod }));
        }
    }, [show, initialPeriod]);

    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setSettings({ ...settings, [e.target.name]: e.target.value });
    };

    const handlePrint = () => {
        onPrint(settings);
        onClose();
    };

    const monthList = [
        'januari', 'februari', 'maret', 'april', 'mei', 'juni',
        'juli', 'agustus', 'september', 'oktober', 'november', 'desember'
    ];

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
                    <div>
                        <h2 className="text-[14px] font-extrabold text-slate-900 dark:text-white">{title}</h2>
                        <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500">
                            Atur ukuran kertas, orientasi, dan font sebelum mencetak.
                        </p>
                    </div>
                </div>

                <div className="space-y-4 px-6 py-5">
                    {/* Period Filter (Optional) */}
                    {includePeriodFilters && (
                        <div>
                            <label className={LABEL_CLASS}>Periode Laporan</label>
                            <select
                                name="period"
                                value={settings.period}
                                onChange={handleChange}
                                className={SELECT_CLASS}
                            >
                                <optgroup label="Bulanan">
                                    {monthList.map((m) => (
                                        <option key={m} value={m} className="capitalize">{m.charAt(0).toUpperCase() + m.slice(1)}</option>
                                    ))}
                                </optgroup>
                                <optgroup label="Semester / Tahap">
                                    <option value="Tahap 1">Tahap 1 (Jan - Jun)</option>
                                    <option value="Tahap 2">Tahap 2 (Jul - Des)</option>
                                </optgroup>
                                <optgroup label="Tahunan">
                                    <option value="Tahunan">Tahunan (Jan - Des)</option>
                                </optgroup>
                            </select>
                        </div>
                    )}

                    {/* Paper Size */}
                    <div>
                        <label className={LABEL_CLASS}>Ukuran Kertas</label>
                        <select
                            name="paperSize"
                            value={settings.paperSize}
                            onChange={handleChange}
                            className={SELECT_CLASS}
                        >
                            <option value="A4">A4</option>
                            <option value="Letter">Letter</option>
                            <option value="Folio">Folio (F4)</option>
                            <option value="Legal">Legal</option>
                        </select>
                    </div>

                    {/* Orientation */}
                    <div>
                        <label className={LABEL_CLASS}>Orientasi</label>
                        <select
                            name="orientation"
                            value={settings.orientation}
                            onChange={handleChange}
                            className={SELECT_CLASS}
                        >
                            <option value="portrait">Portrait</option>
                            <option value="landscape">Landscape</option>
                        </select>
                    </div>

                    {/* Font Size */}
                    <div>
                        <label className={LABEL_CLASS}>Ukuran Font</label>
                        <select
                            name="fontSize"
                            value={settings.fontSize}
                            onChange={handleChange}
                            className={SELECT_CLASS}
                        >
                            <option value="8pt">8pt</option>
                            <option value="9pt">9pt</option>
                            <option value="10pt">10pt</option>
                            <option value="11pt">11pt</option>
                            <option value="12pt">12pt</option>
                        </select>
                    </div>

                    <div className="flex justify-end gap-2 border-t border-slate-100 pt-4 dark:border-white/5">
                        <SecondaryButton onClick={onClose}>Batal</SecondaryButton>
                        <PrimaryButton onClick={handlePrint}>Cetak PDF</PrimaryButton>
                    </div>
                </div>
            </div>
        </Modal>
    );
}
