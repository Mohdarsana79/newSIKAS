import React, { useState } from 'react';

import SpmthTab from './components/SpmthTab';
import SptjTab from './components/SptjTab';
import Sp2bTab from './components/Sp2bTab';
import LphTab from './components/LphTab';
import PillTabs from '@/Components/ui/PillTabs';
import Surface from '@/Components/ui/Surface';

interface LaporanProps {
    auth: {
        user: any;
    };
}

export default function Index({ auth }: LaporanProps) {
    const [activeTab, setActiveTab] = useState('SPMTH');

    const tabs = [
        { id: 'SPMTH', label: 'SPMTH' },
        { id: 'SPTJ', label: 'SPTJ' },
        { id: 'SP2B', label: 'SP2B' },
        { id: 'LPH', label: 'LPH' },
    ];

    const renderContent = () => {
        switch (activeTab) {
            case 'SPMTH':
                return <SpmthTab />;
            case 'SPTJ':
                return <SptjTab />;
            case 'SP2B':
                return <Sp2bTab />;
            case 'LPH':
                return <LphTab />;
            default:
                return null;
        }
    };

    return (
        <div className="space-y-4">
            {/* Pemilih jenis laporan */}
            <div className="animate-rise" style={{ animationDelay: '60ms' }}>
                <Surface padding="sm">
                    <div className="flex flex-wrap items-center justify-between gap-2 px-1">
                        <PillTabs
                            ariaLabel="Jenis laporan"
                            variant="soft"
                            value={activeTab}
                            items={tabs.map((tab) => ({ key: tab.id, label: tab.label }))}
                            onChange={setActiveTab}
                        />
                        <p className="pr-1 text-[10px] font-semibold text-slate-400 dark:text-slate-500">
                            4 jenis laporan pertanggungjawaban
                        </p>
                    </div>
                </Surface>
            </div>

            {/* Isi laporan */}
            <div className="transition-all duration-300 ease-in-out animate-rise" style={{ animationDelay: '120ms' }}>
                {renderContent()}
            </div>
        </div>
    );
}
