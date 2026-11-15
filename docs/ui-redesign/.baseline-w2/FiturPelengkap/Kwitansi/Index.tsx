import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, usePage } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import useVariantRoute from '@/Hooks/useVariantRoute';
import TabReguler from './TabReguler';

export default function KwitansiIndex({ auth }: { auth: any }) {
    const vroute = useVariantRoute();
    const routePrefix = usePage<any>().props.routePrefix || '';
    
    let activeTab = 'BOSP Reguler';
    if (routePrefix === 'silpa-') activeTab = 'SiLPA BOSP Reguler';
    else if (routePrefix === 'kinerja-') activeTab = 'BOSP Kinerja';
    else if (routePrefix === 'kinerja-silpa-') activeTab = 'SiLPA BOSP Kinerja';

    return (
        <AuthenticatedLayout
            header={
                <div className="flex justify-between items-center">
                    <h2 className="font-semibold text-xl text-gray-800 dark:text-gray-200 leading-tight">Manajemen Kwitansi</h2>
                </div>
            }
        >
            <Head title="Manajemen Kwitansi" />

            <div className="py-8">
                <div className="max-w-9xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
                    <div className="mb-4">
                        <p className="text-gray-500 dark:text-gray-400">Kelola dan pantau semua dokumen kwitansi dalam satu tempat yang terintegrasi</p>
                    </div>

                    {/* Modern Tabs Section */}
                    <div className="mb-6 flex justify-start">
                        <nav className="flex space-x-1 p-1 bg-gray-100 dark:bg-gray-800/50 rounded-xl" aria-label="Tabs">
                            <button
                                onClick={() => {
                                    if (activeTab !== 'BOSP Reguler') router.visit(route('kwitansi.index'));
                                }}
                                className={`${
                                    activeTab === 'BOSP Reguler' 
                                    ? 'bg-blue-600 text-white shadow-md hover:bg-blue-700' 
                                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-700/50'
                                } px-6 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ease-in-out`}
                            >
                                BOSP Reguler
                            </button>
                            <button
                                onClick={() => {
                                    if (activeTab !== 'BOSP Kinerja') router.visit(route('kinerja-kwitansi.index'));
                                }}
                                className={`${
                                    activeTab === 'BOSP Kinerja' 
                                    ? 'bg-blue-600 text-white shadow-md hover:bg-blue-700' 
                                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-700/50'
                                } px-6 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ease-in-out`}
                            >
                                BOSP Kinerja
                            </button>
                            <button
                                onClick={() => {
                                    if (activeTab !== 'SiLPA BOSP Reguler') router.visit(route('silpa-kwitansi.index'));
                                }}
                                className={`${
                                    activeTab === 'SiLPA BOSP Reguler' 
                                    ? 'bg-blue-600 text-white shadow-md hover:bg-blue-700' 
                                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-700/50'
                                } px-6 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ease-in-out`}
                            >
                                SiLPA BOSP Reguler
                            </button>
                            <button
                                onClick={() => {
                                    if (activeTab !== 'SiLPA BOSP Kinerja') router.visit(route('kinerja-silpa-kwitansi.index'));
                                }}
                                className={`${
                                    activeTab === 'SiLPA BOSP Kinerja' 
                                    ? 'bg-blue-600 text-white shadow-md hover:bg-blue-700' 
                                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-700/50'
                                } px-6 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ease-in-out`}
                            >
                                SiLPA BOSP Kinerja
                            </button>
                        </nav>
                    </div>

                    <TabReguler auth={auth} />
                </div>
            </div>
        </AuthenticatedLayout>
    );
}