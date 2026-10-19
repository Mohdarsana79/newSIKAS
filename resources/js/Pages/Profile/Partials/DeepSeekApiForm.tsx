import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import { Transition } from '@headlessui/react';
import { useForm, usePage, router } from '@inertiajs/react';
import axios from 'axios';
import { 
    Brain, 
    Key, 
    Sparkles, 
    Eye, 
    EyeOff, 
    CheckCircle2, 
    AlertCircle, 
    Loader2, 
    ExternalLink,
    ShieldCheck,
    Trash2
} from 'lucide-react';
import { FormEventHandler, useState } from 'react';

export default function DeepSeekApiForm({
    className = '',
}: {
    className?: string;
}) {
    const pageProps = usePage().props as any;
    const hasExistingKey = pageProps.hasDeepSeekKey ?? false;
    const defaultReasoner = pageProps.deepseekModelReasoner || 'deepseek-reasoner';
    const defaultChat = pageProps.deepseekModelChat || 'deepseek-chat';

    const [showKey, setShowKey] = useState(false);
    const [testLoading, setTestLoading] = useState(false);
    const [testResult, setTestResult] = useState<{
        type: 'success' | 'error' | null;
        message: string;
    }>({ type: null, message: '' });

    const { data, setData, post, processing, errors, recentlySuccessful, reset } = useForm({
        deepseek_api_key: '',
        deepseek_model_reasoner: defaultReasoner,
        deepseek_model_chat: defaultChat,
        clear_api_key: false,
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('profile.deepseek-settings'), {
            preserveScroll: true,
            onSuccess: () => {
                reset('deepseek_api_key');
            },
        });
    };

    const handleClearKey = () => {
        if (!confirm('Apakah Anda yakin ingin menghapus Kunci API DeepSeek dari profil Anda? Fitur AI tidak dapat digunakan sampai kunci baru dimasukkan.')) {
            return;
        }

        router.post(route('profile.deepseek-settings'), {
            deepseek_api_key: '',
            deepseek_model_reasoner: data.deepseek_model_reasoner,
            deepseek_model_chat: data.deepseek_model_chat,
            clear_api_key: true,
        }, {
            preserveScroll: true,
            onSuccess: () => {
                reset('deepseek_api_key');
                setTestResult({ type: null, message: '' });
            },
        });
    };

    const handleTestConnection = async () => {
        setTestLoading(true);
        setTestResult({ type: null, message: '' });

        try {
            const response = await axios.post(route('profile.deepseek-test'), {
                deepseek_api_key: data.deepseek_api_key || undefined,
            });

            if (response.data.success) {
                setTestResult({
                    type: 'success',
                    message: response.data.message || 'Koneksi ke DeepSeek API berhasil!',
                });
            } else {
                setTestResult({
                    type: 'error',
                    message: response.data.message || 'Koneksi gagal. Periksa kembali API Key Anda.',
                });
            }
        } catch (error: any) {
            setTestResult({
                type: 'error',
                message: error.response?.data?.message || 'Gagal menghubungi endpoint tes koneksi.',
            });
        } finally {
            setTestLoading(false);
        }
    };

    return (
        <section className={className}>
            <header className="mb-6 border-b pb-4 border-gray-100 dark:border-gray-700">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Brain className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                        Konfigurasi AI DeepSeek (BYOK)
                    </h2>
                    {hasExistingKey && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            Kunci API Terpasang & Aktif
                        </span>
                    )}
                </div>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    Aplikasi newSIKAS menggunakan model <strong>DeepSeek-R1</strong> untuk pra-audit penatausahaan kas dan <strong>DeepSeek-V3</strong> untuk asisten transaksi. Masukkan API Key Anda sendiri agar penggunaan kuota mandiri & aman.
                </p>
            </header>

            <form onSubmit={submit} className="space-y-6">
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <InputLabel htmlFor="deepseek_api_key" value="DeepSeek API Key" />
                        <a
                            href="https://platform.deepseek.com/api_keys"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1 font-medium"
                        >
                            Dapatkan API Key di DeepSeek Console
                            <ExternalLink className="w-3 h-3" />
                        </a>
                    </div>

                    <div className="relative">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                            <Key className="h-5 w-5 text-gray-400" />
                        </div>
                        <TextInput
                            id="deepseek_api_key"
                            type={showKey ? 'text' : 'password'}
                            className="block w-full pl-10 pr-10 font-mono text-sm text-black dark:text-black"
                            value={data.deepseek_api_key}
                            onChange={(e) => setData('deepseek_api_key', e.target.value)}
                            placeholder={hasExistingKey ? '•••••••••••••••••••••••••••••••• (Kunci terenkripsi disimpan)' : 'sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'}
                        />
                        <button
                            type="button"
                            onClick={() => setShowKey(!showKey)}
                            className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        >
                            {showKey ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                    </div>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        {hasExistingKey
                            ? 'Biarkan kosong jika tidak ingin mengubah kunci API yang sudah tersimpan.'
                            : 'Kunci disimpan secara terenkripsi dan tidak dapat dibaca oleh pihak lain.'}
                    </p>
                    <InputError className="mt-2" message={errors.deepseek_api_key} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <InputLabel htmlFor="deepseek_model_reasoner" value="Model Penalaran (Pra-Audit / R1)" />
                        <select
                            id="deepseek_model_reasoner"
                            value={data.deepseek_model_reasoner}
                            onChange={(e) => setData('deepseek_model_reasoner', e.target.value)}
                            className="mt-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                        >
                            <option value="deepseek-reasoner">deepseek-reasoner (R1 - Penalaran Audit Mendalam)</option>
                            <option value="deepseek-chat">deepseek-chat (V3 - Mode Cepat)</option>
                        </select>
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            Digunakan untuk pemindaian audit forensik dan analisis regulasi BKU.
                        </p>
                    </div>

                    <div>
                        <InputLabel htmlFor="deepseek_model_chat" value="Model Interaktif (Copilot / V3)" />
                        <select
                            id="deepseek_model_chat"
                            value={data.deepseek_model_chat}
                            onChange={(e) => setData('deepseek_model_chat', e.target.value)}
                            className="mt-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                        >
                            <option value="deepseek-chat">deepseek-chat (V3 - Default Cepat & Hemat)</option>
                            <option value="deepseek-reasoner">deepseek-reasoner (R1)</option>
                        </select>
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            Digunakan untuk asisten drafting transaksi, kalkulasi pajak, dan query analitik.
                        </p>
                    </div>
                </div>

                {/* Status Uji Koneksi */}
                {testResult.type && (
                    <div
                        className={`p-3 rounded-lg text-sm flex items-start gap-2 ${
                            testResult.type === 'success'
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800'
                                : 'bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-800'
                        }`}
                    >
                        {testResult.type === 'success' ? (
                            <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                            <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-600 dark:text-rose-400" />
                        )}
                        <span>{testResult.message}</span>
                    </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                        <PrimaryButton disabled={processing} className="bg-indigo-600 hover:bg-indigo-700">
                            <Sparkles className="w-4 h-4 mr-2" />
                            Simpan Pengaturan AI
                        </PrimaryButton>

                        <button
                            type="button"
                            onClick={handleTestConnection}
                            disabled={testLoading || (!hasExistingKey && !data.deepseek_api_key)}
                            className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md font-semibold text-xs text-gray-700 dark:text-gray-300 uppercase tracking-widest shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 transition"
                        >
                            {testLoading ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Menguji...
                                </>
                            ) : (
                                'Uji Koneksi API'
                            )}
                        </button>

                        <Transition
                            show={recentlySuccessful}
                            enter="transition ease-in-out"
                            enterFrom="opacity-0"
                            leave="transition ease-in-out"
                            leaveTo="opacity-0"
                        >
                            <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                                Tersimpan!
                            </p>
                        </Transition>
                    </div>

                    {hasExistingKey && (
                        <button
                            type="button"
                            onClick={handleClearKey}
                            className="text-xs text-rose-600 dark:text-rose-400 hover:underline inline-flex items-center gap-1 font-medium"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                            Hapus Kunci Tersimpan
                        </button>
                    )}
                </div>
            </form>
        </section>
    );
}
