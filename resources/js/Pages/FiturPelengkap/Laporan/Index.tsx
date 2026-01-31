import React, { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import SpmthTab from './components/SpmthTab';
import SptjTab from './components/SptjTab';

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
    ];

    const renderContent = () => {
        switch (activeTab) {
            case 'SPMTH':
                return <SpmthTab />;
            case 'SPTJ':
                return <SptjTab />;
            default:
                return null;
        }
    };

    return (
        <AuthenticatedLayout
            header={<h2 className="font-semibold text-xl text-gray-800 dark:text-gray-200 leading-tight">Menu Laporan</h2>}
        >
            <Head title="Laporan & SPJ" />

            <div className="py-8 bg-gray-50 dark:bg-gray-900 min-h-screen">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    {/* Header Section */}
                    <div className="mb-8">
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Laporan & Pertanggungjawaban</h1>
                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                            Kelola dokumen SPMTH, SPTJ, SP2B, dan laporan keuangan lainnya dalam satu tempat.
                        </p>
                    </div>

                    {/* Modern Tabs */}
                    <div className="mb-6 flex space-x-2 bg-white dark:bg-gray-800 p-1.5 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-x-auto">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`
                                        flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 whitespace-nowrap
                                        ${activeTab === tab.id
                                        ? 'bg-blue-600 text-white shadow-md transform scale-[1.02]'
                                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
                                    }
                                    `}
                            >
                                {tab.id === 'SPMTH' && (
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                )}
                                {tab.id === 'SPTJ' && (
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
                                    </svg>
                                )}
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Content Area */}
                    <div className="transition-all duration-300 ease-in-out">
                        {renderContent()}
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
