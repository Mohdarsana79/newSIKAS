import React, { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, usePage } from '@inertiajs/react';
import useVariantRoute from '@/Hooks/useVariantRoute';
import TabReguler from './TabReguler';

export default function Index({ auth }: { auth: any }) {
    const vroute = useVariantRoute();
    const routePrefix = usePage<any>().props.routePrefix || '';
    
    let activeTab = 'reguler';
    if (routePrefix === 'silpa-') activeTab = 'silpa';
    else if (routePrefix === 'kinerja-') activeTab = 'kinerja';
    else if (routePrefix === 'kinerja-silpa-') activeTab = 'kinerja_silpa';

    return (
        <AuthenticatedLayout>
            <Head title="Manajemen Laporan" />
            
            <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex space-x-2 py-3 overflow-x-auto">
                        <button
                            onClick={() => {
                                if (activeTab !== 'reguler') router.visit(route('laporan.index'));
                            }}
                            className={`flex items-center px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                                activeTab === 'reguler'
                                    ? 'bg-blue-50 text-blue-700 shadow-sm ring-1 ring-inset ring-blue-700/10 dark:bg-blue-900/30 dark:text-blue-400 dark:ring-blue-400/20'
                                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800/50 dark:hover:text-gray-300'
                            }`}
                        >
                            BOSP Reguler
                        </button>
                        <button
                            onClick={() => {
                                if (activeTab !== 'kinerja') router.visit(route('kinerja-laporan.index'));
                            }}
                            className={`flex items-center px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                                activeTab === 'kinerja'
                                    ? 'bg-blue-50 text-blue-700 shadow-sm ring-1 ring-inset ring-blue-700/10 dark:bg-blue-900/30 dark:text-blue-400 dark:ring-blue-400/20'
                                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800/50 dark:hover:text-gray-300'
                            }`}
                        >
                            BOSP Kinerja
                        </button>
                        <button
                            onClick={() => {
                                if (activeTab !== 'silpa') router.visit(route('silpa-laporan.index'));
                            }}
                            className={`flex items-center px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                                activeTab === 'silpa'
                                    ? 'bg-blue-50 text-blue-700 shadow-sm ring-1 ring-inset ring-blue-700/10 dark:bg-blue-900/30 dark:text-blue-400 dark:ring-blue-400/20'
                                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800/50 dark:hover:text-gray-300'
                            }`}
                        >
                            SiLPA BOSP Reguler
                        </button>
                        <button
                            onClick={() => {
                                if (activeTab !== 'kinerja_silpa') router.visit(route('kinerja-silpa-laporan.index'));
                            }}
                            className={`flex items-center px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                                activeTab === 'kinerja_silpa'
                                    ? 'bg-blue-50 text-blue-700 shadow-sm ring-1 ring-inset ring-blue-700/10 dark:bg-blue-900/30 dark:text-blue-400 dark:ring-blue-400/20'
                                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800/50 dark:hover:text-gray-300'
                            }`}
                        >
                            SiLPA BOSP Kinerja
                        </button>
                    </div>
                </div>
            </div>

            <div className="mt-4">
                <TabReguler auth={auth} />
            </div>

        </AuthenticatedLayout>
    );
}
