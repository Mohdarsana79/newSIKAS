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
import PageHeader from '@/Components/ui/PageHeader';
import Surface from '@/Components/ui/Surface';
import IconTile from '@/Components/ui/IconTile';
import StatusBadge from '@/Components/ui/StatusBadge';

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
        <AuthenticatedLayout>
            <Head title="Pengaturan API" />

            <div className="space-y-4">
                <PageHeader
                    className="animate-rise"
                    breadcrumb={[
                        { label: 'Dashboard' },
                        { label: 'Integrasi' },
                        { label: 'Pengaturan API' },
                    ]}
                    title="Pengaturan API"
                    badge={<StatusBadge tone="info" dot={false}>Integrasi</StatusBadge>}
                    subtitle="Konfigurasi URL endpoint dan token keamanan sinkronisasi website sekolah."
                />

                <Surface
                    className="animate-rise"
                    title="Konfigurasi Integrasi Website Sekolah"
                    subtitle="Atur URL endpoint dan token keamanan untuk sinkronisasi data ke website sekolah Anda."
                    icon={
                        <IconTile tone="sky" size="md">
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.826a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                            </svg>
                        </IconTile>
                    }
                >
                    <form onSubmit={submit} className="max-w-2xl space-y-5">
                        <div>
                            <InputLabel htmlFor="website_sync_url" value="URL API Website Sekolah" />
                            <TextInput
                                id="website_sync_url"
                                placeholder="https://sekolah.sch.id/api/v1/sync"
                                value={data.website_sync_url}
                                onChange={(e) => setData('website_sync_url', e.target.value)}
                                className="mt-1 block w-full"
                            />
                            <InputError message={errors.website_sync_url} className="mt-2" />
                            <p className="mt-1 text-[10px] font-medium italic text-slate-400 dark:text-slate-500">URL endpoint yang akan menerima payload data dari sistem ini.</p>
                        </div>

                        <div>
                            <InputLabel htmlFor="website_sync_token" value="Token API (X-SIMS-Token)" />
                            <TextInput
                                id="website_sync_token"
                                type="password"
                                value={data.website_sync_token}
                                onChange={(e) => setData('website_sync_token', e.target.value)}
                                className="mt-1 block w-full"
                            />
                            <InputError message={errors.website_sync_token} className="mt-2" />
                            <p className="mt-1 text-[10px] font-medium italic text-slate-400 dark:text-slate-500">Token keamanan yang harus sesuai dengan konfigurasi di website tujuan.</p>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4 dark:border-white/5">
                            <PrimaryButton disabled={processing}>
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
                                        <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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
                                <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-400 dark:text-slate-500">
                                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Menyimpan...
                                </div>
                            )}
                        </div>

                        {testResult && (
                            <div className={`rounded-2xl border p-4 ${testResult.success ? 'border-mint/20 bg-pastel-mint/60 dark:border-mint/20 dark:bg-mint/10' : 'border-rose-200 bg-pastel-rose/70 dark:border-rose-400/20 dark:bg-rose-500/10'}`}>
                                <div className="flex gap-3">
                                    {testResult.success ? (
                                        <svg className="mt-0.5 h-5 w-5 shrink-0 text-mint" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    ) : (
                                        <svg className="mt-0.5 h-5 w-5 shrink-0 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    )}
                                    <p className={`text-[11.5px] font-semibold ${testResult.success ? 'text-mint' : 'text-rose-600 dark:text-rose-300'}`}>{testResult.message}</p>
                                </div>
                            </div>
                        )}
                    </form>
                </Surface>
            </div>
        </AuthenticatedLayout>
    );
}
