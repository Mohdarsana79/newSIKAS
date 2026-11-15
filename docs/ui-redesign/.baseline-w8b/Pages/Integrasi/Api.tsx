import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm } from '@inertiajs/react';
import { PageProps } from '@/types';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import InputError from '@/Components/InputError';
import { FormEventHandler, useState } from 'react';
import axios from 'axios';

interface Sekolah {
    id: number;
    website_sync_url?: string;
    website_sync_token?: string;
}

export default function Api({ auth, sekolah }: PageProps<{ sekolah?: Sekolah }>) {
    const [isTesting, setIsTesting] = useState(false);
    const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

    const { data, setData, put, processing, errors } = useForm({
        website_sync_url: sekolah?.website_sync_url || '',
        website_sync_token: sekolah?.website_sync_token || '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        put(route('integrasi.api.update'), {
            preserveScroll: true,
        });
    };

    const handleTestConnection = async () => {
        if (!data.website_sync_url) {
            setTestResult({ success: false, message: 'URL API harus diisi terlebih dahulu.' });
            return;
        }

        setIsTesting(true);
        setTestResult(null);

        try {
            const response = await axios.post(route('integrasi.api.test-connection'), {
                url: data.website_sync_url,
                token: data.website_sync_token
            });

            setTestResult({
                success: true,
                message: response.data.message
            });
        } catch (error: any) {
            setTestResult({
                success: false,
                message: error.response?.data?.message || 'Gagal terhubung ke server.'
            });
        } finally {
            setIsTesting(false);
        }
    };

    return (
        <AuthenticatedLayout
            header={<h2 className="font-semibold text-xl text-gray-800 dark:text-gray-200 leading-tight">Pengaturan API</h2>}
        >
            <Head title="Pengaturan API" />

            <div className="py-12">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    <div className="bg-white dark:bg-gray-800 overflow-hidden shadow-sm sm:rounded-lg border border-gray-100 dark:border-gray-700">
                        <div className="p-6">
                            <div className="mb-8">
                                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                    <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg text-indigo-600 dark:text-indigo-400">
                                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.826a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                        </svg>
                                    </div>
                                    Konfigurasi Integrasi Website Sekolah
                                </h3>
                                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 ml-12">
                                    Atur URL endpoint dan token keamanan untuk sinkronisasi data ke website sekolah Anda.
                                </p>
                            </div>

                            <form onSubmit={submit} className="space-y-6 max-w-2xl ml-12">
                                <div>
                                    <InputLabel htmlFor="website_sync_url" value="URL API Website Sekolah" />
                                    <TextInput
                                        id="website_sync_url"
                                        placeholder="https://sekolah.sch.id/api/v1/sync"
                                        value={data.website_sync_url}
                                        onChange={(e) => setData('website_sync_url', e.target.value)}
                                        className="mt-1 block w-full text-gray-900 dark:text-white"
                                    />
                                    <InputError message={errors.website_sync_url} className="mt-2" />
                                    <p className="mt-1 text-xs text-gray-500 italic">URL endpoint yang akan menerima payload data dari sistem ini.</p>
                                </div>

                                <div>
                                    <InputLabel htmlFor="website_sync_token" value="Token API (X-SIMS-Token)" />
                                    <TextInput
                                        id="website_sync_token"
                                        type="password"
                                        value={data.website_sync_token}
                                        onChange={(e) => setData('website_sync_token', e.target.value)}
                                        className="mt-1 block w-full text-gray-900 dark:text-white"
                                    />
                                    <InputError message={errors.website_sync_token} className="mt-2" />
                                    <p className="mt-1 text-xs text-gray-500 italic">Token keamanan yang harus sesuai dengan konfigurasi di website tujuan.</p>
                                </div>

                                <div className="flex items-center gap-4 pt-4">
                                    <PrimaryButton disabled={processing} className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700">
                                        Simpan Pengaturan
                                    </PrimaryButton>

                                    <SecondaryButton 
                                        type="button" 
                                        onClick={handleTestConnection} 
                                        disabled={isTesting}
                                        className="flex items-center gap-2"
                                    >
                                        {isTesting ? (
                                            <>
                                                <svg className="animate-spin h-4 w-4 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                                Mengetes...
                                            </>
                                        ) : (
                                            <>
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                                </svg>
                                                Tes Koneksi
                                            </>
                                        )}
                                    </SecondaryButton>

                                    {processing && (
                                        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                                            <svg className="animate-spin h-4 w-4 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Menyimpan...
                                        </div>
                                    )}
                                </div>

                                {testResult && (
                                    <div className={`mt-4 p-4 rounded-xl border ${testResult.success ? 'bg-green-50 border-green-100 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-300' : 'bg-red-50 border-red-100 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300'}`}>
                                        <div className="flex gap-3">
                                            {testResult.success ? (
                                                <svg className="w-5 h-5 text-green-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                            ) : (
                                                <svg className="w-5 h-5 text-red-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                            )}
                                            <p className="text-sm">{testResult.message}</p>
                                        </div>
                                    </div>
                                )}
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
