import React from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, usePage } from '@inertiajs/react';
import TabReguler from './components/TabReguler';
import TabSilpa from './components/TabSilpa';
import TabKinerja from './components/TabKinerja';
import TabKinerjaSilpa from './components/TabKinerjaSilpa';

interface Props {
    auth: any;
    penganggarans: { id: number; tahun_anggaran: string }[];
}

export default function Index({ auth, penganggarans }: Props) {
    const routePrefix = usePage<any>().props.routePrefix || '';
    
    let activeTab = 'reguler';
    if (routePrefix === 'silpa-') activeTab = 'silpa';
    else if (routePrefix === 'kinerja-') activeTab = 'kinerja';
    else if (routePrefix === 'kinerja-silpa-') activeTab = 'kinerja_silpa';

    return (
        <AuthenticatedLayout
            header={<h2 className="font-semibold text-xl text-gray-800 dark:text-gray-200 leading-tight">Dokumen BKU</h2>}
        >
            <Head title="Dokumen BKU" />

            <div className="py-12">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    {/* Tabs Navigation */}
                    <div className="flex space-x-1 rounded-t-xl bg-purple-900/10 p-1 mb-0 border-b border-gray-200 dark:border-gray-700">
                        <button
                            onClick={() => {
                                if (activeTab !== 'reguler') router.visit(route('dokumen.index'));
                            }}
                            className={`w-full rounded-lg py-2.5 text-sm font-medium leading-5 transition-all duration-200 ${
                                activeTab === 'reguler'
                                    ? 'bg-white dark:bg-gray-800 text-purple-700 dark:text-purple-400 shadow ring-1 ring-black/5 dark:ring-white/10'
                                    : 'text-gray-600 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-gray-800/50 hover:text-purple-600 dark:hover:text-purple-300'
                            }`}
                        >
                            BOSP Reguler
                        </button>
                        <button
                            onClick={() => {
                                if (activeTab !== 'silpa') router.visit(route('silpa-dokumen.index'));
                            }}
                            className={`w-full rounded-lg py-2.5 text-sm font-medium leading-5 transition-all duration-200 ${
                                activeTab === 'silpa'
                                    ? 'bg-white dark:bg-gray-800 text-purple-700 dark:text-purple-400 shadow ring-1 ring-black/5 dark:ring-white/10'
                                    : 'text-gray-600 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-gray-800/50 hover:text-purple-600 dark:hover:text-purple-300'
                            }`}
                        >
                            SiLPA BOSP
                        </button>
                        <button
                            onClick={() => {
                                if (activeTab !== 'kinerja') router.visit(route('kinerja-dokumen.index'));
                            }}
                            className={`w-full rounded-lg py-2.5 text-sm font-medium leading-5 transition-all duration-200 ${
                                activeTab === 'kinerja'
                                    ? 'bg-white dark:bg-gray-800 text-purple-700 dark:text-purple-400 shadow ring-1 ring-black/5 dark:ring-white/10'
                                    : 'text-gray-600 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-gray-800/50 hover:text-purple-600 dark:hover:text-purple-300'
                            }`}
                        >
                            BOSP Kinerja
                        </button>
                        <button
                            onClick={() => {
                                if (activeTab !== 'kinerja_silpa') router.visit(route('kinerja-silpa-dokumen.index'));
                            }}
                            className={`w-full rounded-lg py-2.5 text-sm font-medium leading-5 transition-all duration-200 ${
                                activeTab === 'kinerja_silpa'
                                    ? 'bg-white dark:bg-gray-800 text-purple-700 dark:text-purple-400 shadow ring-1 ring-black/5 dark:ring-white/10'
                                    : 'text-gray-600 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-gray-800/50 hover:text-purple-600 dark:hover:text-purple-300'
                            }`}
                        >
                            SiLPA BOSP Kinerja
                        </button>
                    </div>

                    {/* Tab Content */}
                    <div className="bg-white dark:bg-gray-800 shadow-sm sm:rounded-b-lg p-6">
                        {activeTab === 'reguler' && <TabReguler auth={auth} penganggarans={penganggarans} />}
                        {activeTab === 'silpa' && <TabSilpa auth={auth} silpaPenganggarans={penganggarans} />}
                        {activeTab === 'kinerja' && <TabKinerja auth={auth} kinerjaPenganggarans={penganggarans} />}
                        {activeTab === 'kinerja_silpa' && <TabKinerjaSilpa auth={auth} kinerjaSilpaPenganggarans={penganggarans} />}
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
