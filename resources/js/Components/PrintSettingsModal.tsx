import React, { useState, useEffect } from 'react';
import Modal from '@/Components/Modal';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';

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
            <div className="p-6 text-gray-900 dark:text-gray-100">
                <h2 className="text-lg font-medium mb-4">{title}</h2>

                <div className="mt-4 space-y-4">
                    {/* Period Filter (Optional) */}
                    {includePeriodFilters && (
                        <div>
                            <label className="block text-sm font-medium mb-1">Periode Laporan</label>
                            <select
                                name="period"
                                value={settings.period}
                                onChange={handleChange}
                                className="w-full border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 focus:border-indigo-500 focus:ring-indigo-500 rounded-md shadow-sm"
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
                        <label className="block text-sm font-medium mb-1">Ukuran Kertas</label>
                        <select
                            name="paperSize"
                            value={settings.paperSize}
                            onChange={handleChange}
                            className="w-full border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 focus:border-indigo-500 focus:ring-indigo-500 rounded-md shadow-sm"
                        >
                            <option value="A4">A4</option>
                            <option value="Letter">Letter</option>
                            <option value="Folio">Folio (F4)</option>
                            <option value="Legal">Legal</option>
                        </select>
                    </div>

                    {/* Orientation */}
                    <div>
                        <label className="block text-sm font-medium mb-1">Orientasi</label>
                        <select
                            name="orientation"
                            value={settings.orientation}
                            onChange={handleChange}
                            className="w-full border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 focus:border-indigo-500 focus:ring-indigo-500 rounded-md shadow-sm"
                        >
                            <option value="portrait">Portrait</option>
                            <option value="landscape">Landscape</option>
                        </select>
                    </div>

                    {/* Font Size */}
                    <div>
                        <label className="block text-sm font-medium mb-1">Ukuran Font</label>
                        <select
                            name="fontSize"
                            value={settings.fontSize}
                            onChange={handleChange}
                            className="w-full border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 focus:border-indigo-500 focus:ring-indigo-500 rounded-md shadow-sm"
                        >
                            <option value="8pt">8pt</option>
                            <option value="9pt">9pt</option>
                            <option value="10pt">10pt</option>
                            <option value="11pt">11pt</option>
                            <option value="12pt">12pt</option>
                        </select>
                    </div>
                </div>

                <div className="mt-6 flex justify-end gap-3">
                    <SecondaryButton onClick={onClose}>Batal</SecondaryButton>
                    <PrimaryButton onClick={handlePrint}>Cetak PDF</PrimaryButton>
                </div>
            </div>
        </Modal>
    );
}
