import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import IconTile from '@/Components/ui/IconTile';
import StatusBadge from '@/Components/ui/StatusBadge';
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
            <header className="mb-5 flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-start sm:justify-between dark:border-white/5">
                <div className="flex min-w-0 items-start gap-3">
                    <IconTile tone="violet" size="lg">
                        <Brain />
                    </IconTile>
                    <div className="min-w-0">
                        <h2 className="text-[14px] font-extrabold tracking-tight text-slate-900 dark:text-white">
                            Konfigurasi AI DeepSeek (BYOK)
                        </h2>
                        <p className="mt-0.5 text-[10.5px] font-medium text-slate-400 dark:text-slate-500">
                            Aplikasi newSIKAS menggunakan model <strong className="font-bold text-slate-600 dark:text-slate-300">DeepSeek-R1</strong> untuk pra-audit penatausahaan kas dan <strong className="font-bold text-slate-600 dark:text-slate-300">DeepSeek-V3</strong> untuk asisten transaksi. Masukkan API Key Anda sendiri agar penggunaan kuota mandiri & aman.
                        </p>
                    </div>
                </div>
                {hasExistingKey && (
                    <StatusBadge tone="success" dot={false} className="shrink-0 self-start">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        Kunci API Terpasang & Aktif
                    </StatusBadge>
                )}
            </header>

            <form onSubmit={submit} className="space-y-5">
                <div>
                    <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                        <InputLabel htmlFor="deepseek_api_key" value="DeepSeek API Key" />
                        <a
                            href="https://platform.deepseek.com/api_keys"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[10.5px] font-bold text-brand-600 transition hover:underline dark:text-brand-300"
                        >
                            Dapatkan API Key di DeepSeek Console
                            <ExternalLink className="w-3 h-3" />
                        </a>
                    </div>

                    <div className="relative">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                            <Key className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                        </div>
                        <TextInput
                            id="deepseek_api_key"
                            type={showKey ? 'text' : 'password'}
                            className="pl-10 pr-10 font-mono text-sm"
                            value={data.deepseek_api_key}
                            onChange={(e) => setData('deepseek_api_key', e.target.value)}
                            placeholder={hasExistingKey ? '•••••••••••••••••••••••••••••••• (Kunci terenkripsi disimpan)' : 'sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'}
                        />
                        <button
                            type="button"
                            onClick={() => setShowKey(!showKey)}
                            className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 transition hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
                        >
                            {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                    </div>
                    <p className="mt-1.5 text-[10.5px] font-medium text-slate-400 dark:text-slate-500">
                        {hasExistingKey
                            ? 'Biarkan kosong jika tidak ingin mengubah kunci API yang sudah tersimpan.'
                            : 'Kunci disimpan secara terenkripsi dan tidak dapat dibaca oleh pihak lain.'}
                    </p>
                    <InputError className="mt-2" message={errors.deepseek_api_key} />
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                        <InputLabel htmlFor="deepseek_model_reasoner" value="Model Penalaran (Pra-Audit / R1)" />
                        <select
                            id="deepseek_model_reasoner"
                            value={data.deepseek_model_reasoner}
                            onChange={(e) => setData('deepseek_model_reasoner', e.target.value)}
                            className="mt-1 block w-full rounded-xl border border-slate-200/90 bg-white px-3.5 py-2.5 text-[12px] font-semibold text-slate-800 shadow-sm transition focus:border-lime-400 focus:outline-none focus:ring-4 focus:ring-lime-200/60 dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:border-lime-400/70 dark:focus:ring-lime-400/10"
                        >
                            <option value="deepseek-reasoner">deepseek-reasoner (R1 - Penalaran Audit Mendalam)</option>
                            <option value="deepseek-chat">deepseek-chat (V3 - Mode Cepat)</option>
                        </select>
                        <p className="mt-1.5 text-[10.5px] font-medium text-slate-400 dark:text-slate-500">
                            Digunakan untuk pemindaian audit forensik dan analisis regulasi BKU.
                        </p>
                    </div>

                    <div>
                        <InputLabel htmlFor="deepseek_model_chat" value="Model Interaktif (Copilot / V3)" />
                        <select
                            id="deepseek_model_chat"
                            value={data.deepseek_model_chat}
                            onChange={(e) => setData('deepseek_model_chat', e.target.value)}
                            className="mt-1 block w-full rounded-xl border border-slate-200/90 bg-white px-3.5 py-2.5 text-[12px] font-semibold text-slate-800 shadow-sm transition focus:border-lime-400 focus:outline-none focus:ring-4 focus:ring-lime-200/60 dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:border-lime-400/70 dark:focus:ring-lime-400/10"
                        >
                            <option value="deepseek-chat">deepseek-chat (V3 - Default Cepat & Hemat)</option>
                            <option value="deepseek-reasoner">deepseek-reasoner (R1)</option>
                        </select>
                        <p className="mt-1.5 text-[10.5px] font-medium text-slate-400 dark:text-slate-500">
                            Digunakan untuk asisten drafting transaksi, kalkulasi pajak, dan query analitik.
                        </p>
                    </div>
                </div>

                {/* Status Uji Koneksi */}
                {testResult.type && (
                    <div
                        className={`flex items-start gap-2 rounded-2xl border p-3.5 text-[11.5px] font-medium ${
                            testResult.type === 'success'
                                ? 'border-emerald-200/70 bg-pastel-mint text-emerald-700 dark:border-emerald-400/20 dark:bg-mint/10 dark:text-emerald-300'
                                : 'border-rose-200/70 bg-pastel-rose text-rose-700 dark:border-rose-400/20 dark:bg-rose-500/10 dark:text-rose-300'
                        }`}
                    >
                        {testResult.type === 'success' ? (
                            <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-emerald-600 dark:text-emerald-300" />
                        ) : (
                            <AlertCircle className="h-4 w-4 flex-shrink-0 text-rose-600 dark:text-rose-300" />
                        )}
                        <span>{testResult.message}</span>
                    </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 dark:border-white/5">
                    <div className="flex flex-wrap items-center gap-2">
                        <PrimaryButton disabled={processing}>
                            <Sparkles className="w-4 h-4" />
                            Simpan Pengaturan AI
                        </PrimaryButton>

                        <button
                            type="button"
                            onClick={handleTestConnection}
                            disabled={testLoading || (!hasExistingKey && !data.deepseek_api_key)}
                            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/90 bg-white px-4 py-2.5 text-[11.5px] font-bold text-slate-700 shadow-pill transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-lime-400 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
                        >
                            {testLoading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
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
                            <p className="inline-flex items-center gap-1.5 rounded-full bg-pastel-mint px-3 py-1 text-[10.5px] font-extrabold text-emerald-700 dark:bg-mint/10 dark:text-emerald-300">
                                Tersimpan!
                            </p>
                        </Transition>
                    </div>

                    {hasExistingKey && (
                        <button
                            type="button"
                            onClick={handleClearKey}
                            className="inline-flex items-center gap-1 text-[10.5px] font-bold text-rose-600 transition hover:underline dark:text-rose-300"
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
