import DangerButton from '@/Components/DangerButton';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import StatusBadge from '@/Components/ui/StatusBadge';
import type { PageProps } from '@/types';
import { router, useForm, usePage } from '@inertiajs/react';
import axios from 'axios';
import {
    AlertCircle,
    AlertTriangle,
    Brain,
    CheckCircle2,
    Cpu,
    ExternalLink,
    Loader2,
    ShieldCheck,
    Sparkles,
    Trash2,
    Zap,
} from 'lucide-react';
import { FormEventHandler, KeyboardEvent, ReactNode, useId, useRef, useState } from 'react';
import {
    ProfileCardShell,
    ProfileModalShell,
    ProfilePasswordInput,
    ProfileSavedPill,
} from './ProfileUiPrimitives';

interface ModelOption {
    value: string;
    name: string;
    tag: string;
    description: string;
    icon: ReactNode;
}

const REASONER_OPTIONS: ModelOption[] = [
    {
        value: 'deepseek-reasoner',
        name: 'deepseek-reasoner',
        tag: 'R1 · Mendalam',
        description: 'Audit forensik & penalaran regulasi BKU mendalam.',
        icon: <Cpu className="h-4 w-4" />,
    },
    {
        value: 'deepseek-chat',
        name: 'deepseek-chat',
        tag: 'V3 · Cepat',
        description: 'Mode respons cepat untuk pemeriksaan ringkas.',
        icon: <Zap className="h-4 w-4" />,
    },
];

const CHAT_OPTIONS: ModelOption[] = [
    {
        value: 'deepseek-chat',
        name: 'deepseek-chat',
        tag: 'V3 · Default',
        description: 'Cepat & hemat untuk drafting transaksi dan analitik.',
        icon: <Zap className="h-4 w-4" />,
    },
    {
        value: 'deepseek-reasoner',
        name: 'deepseek-reasoner',
        tag: 'R1 · Penalaran',
        description: 'Penalaran bertahap untuk analisis pertanyaan kompleks.',
        icon: <Cpu className="h-4 w-4" />,
    },
];

function ModelSelectorGroup({
    label,
    helperText,
    options,
    value,
    onChange,
}: {
    label: string;
    helperText: string;
    options: ModelOption[];
    value: string;
    onChange: (next: string) => void;
}) {
    const labelId = useId();
    const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);
    const activeIndex = Math.max(
        0,
        options.findIndex((opt) => opt.value === value),
    );

    const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
        if (!['ArrowDown', 'ArrowRight', 'ArrowUp', 'ArrowLeft'].includes(e.key)) {
            return;
        }
        e.preventDefault();
        const delta = e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : -1;
        const nextIndex = (index + delta + options.length) % options.length;
        onChange(options[nextIndex].value);
        buttonRefs.current[nextIndex]?.focus();
    };

    return (
        <div>
            <span
                id={labelId}
                className="mb-1.5 block text-[10px] font-extrabold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400"
            >
                {label}
            </span>
            <div role="radiogroup" aria-labelledby={labelId} className="space-y-2">
                {options.map((opt, index) => {
                    const selected = value === opt.value;
                    return (
                        <button
                            key={opt.value}
                            ref={(el) => {
                                buttonRefs.current[index] = el;
                            }}
                            type="button"
                            role="radio"
                            aria-checked={selected}
                            tabIndex={index === activeIndex ? 0 : -1}
                            onClick={() => onChange(opt.value)}
                            onKeyDown={(e) => handleKeyDown(e, index)}
                            className={`flex w-full items-start justify-between gap-3 rounded-2xl border p-3 text-left transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-lime-400 ${
                                selected
                                    ? 'border-lime-400 bg-lime-50/70 shadow-sm dark:border-lime-400/50 dark:bg-lime-400/10'
                                    : 'border-slate-200/80 bg-slate-50/60 hover:border-slate-300 hover:bg-white dark:border-white/10 dark:bg-white/[0.02] dark:hover:border-white/20 dark:hover:bg-white/[0.05]'
                            }`}
                        >
                            <div className="flex min-w-0 items-start gap-2.5">
                                <span
                                    className={`mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-xl transition ${
                                        selected
                                            ? 'bg-lime-400 text-slate-950'
                                            : 'bg-white text-slate-500 ring-1 ring-slate-200/70 dark:bg-white/5 dark:text-slate-400 dark:ring-white/10'
                                    }`}
                                >
                                    {opt.icon}
                                </span>
                                <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-1.5">
                                        <span className="font-mono text-[11.5px] font-extrabold text-slate-900 dark:text-white">
                                            {opt.name}
                                        </span>
                                        <span
                                            className={`rounded-full px-2 py-0.5 text-[9px] font-extrabold ${
                                                selected
                                                    ? 'bg-lime-200/90 text-slate-900 dark:bg-lime-400/20 dark:text-lime-200'
                                                    : 'bg-slate-200/70 text-slate-600 dark:bg-white/10 dark:text-slate-300'
                                            }`}
                                        >
                                            {opt.tag}
                                        </span>
                                    </div>
                                    <p className="mt-0.5 text-[10.5px] font-medium leading-snug text-slate-500 dark:text-slate-400">
                                        {opt.description}
                                    </p>
                                </div>
                            </div>
                            <CheckCircle2
                                className={`mt-0.5 h-4 w-4 shrink-0 transition ${
                                    selected
                                        ? 'text-lime-600 dark:text-lime-300'
                                        : 'text-slate-300 dark:text-white/15'
                                }`}
                            />
                        </button>
                    );
                })}
            </div>
            <p className="mt-1.5 text-[10px] font-medium text-slate-400 dark:text-slate-500">
                {helperText}
            </p>
        </div>
    );
}

export default function DeepSeekApiForm({
    className = '',
}: {
    className?: string;
}) {
    const pageProps = usePage<
        PageProps<{
            hasDeepSeekKey?: boolean;
            deepseekModelReasoner?: string;
            deepseekModelChat?: string;
        }>
    >().props;
    const hasExistingKey = pageProps.hasDeepSeekKey ?? false;
    const defaultReasoner = pageProps.deepseekModelReasoner || 'deepseek-reasoner';
    const defaultChat = pageProps.deepseekModelChat || 'deepseek-chat';

    const [testLoading, setTestLoading] = useState(false);
    const [confirmingClearKey, setConfirmingClearKey] = useState(false);
    const [clearingKey, setClearingKey] = useState(false);
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

    const confirmClearKey = () => {
        setClearingKey(true);
        router.post(
            route('profile.deepseek-settings'),
            {
                deepseek_api_key: '',
                deepseek_model_reasoner: data.deepseek_model_reasoner,
                deepseek_model_chat: data.deepseek_model_chat,
                clear_api_key: true,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    reset('deepseek_api_key');
                    setTestResult({ type: null, message: '' });
                    setConfirmingClearKey(false);
                },
                onFinish: () => {
                    setClearingKey(false);
                },
            },
        );
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
        } catch (error: unknown) {
            const axiosMessage =
                axios.isAxiosError(error) && error.response?.data?.message
                    ? String(error.response.data.message)
                    : 'Gagal menghubungi endpoint tes koneksi.';
            setTestResult({
                type: 'error',
                message: axiosMessage,
            });
        } finally {
            setTestLoading(false);
        }
    };

    return (
        <ProfileCardShell
            tone="violet"
            icon={<Brain />}
            title="Konfigurasi AI DeepSeek (BYOK)"
            subtitle="Gunakan API Key pribadi untuk pra-audit BKU (DeepSeek-R1) dan asisten transaksi (DeepSeek-V3) secara mandiri & terenkripsi."
            badge={
                hasExistingKey ? (
                    <StatusBadge tone="success" dot={false}>
                        <ShieldCheck className="h-3.5 w-3.5" />
                        Kunci API Terpasang &amp; Aktif
                    </StatusBadge>
                ) : (
                    <StatusBadge tone="warning" dot={true}>
                        Belum Diatur
                    </StatusBadge>
                )
            }
            className={className}
        >
            <form onSubmit={submit} className="flex flex-1 flex-col justify-between gap-5">
                <div className="space-y-5">
                    <div>
                        <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                            <InputLabel htmlFor="deepseek_api_key" value="DeepSeek API Key" />
                            <a
                                href="https://platform.deepseek.com/api_keys"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 rounded-full bg-pastel-lavender px-2.5 py-1 text-[10px] font-extrabold text-brand-600 transition hover:bg-brand-500/15 dark:bg-brand-500/15 dark:text-brand-300 dark:hover:bg-brand-500/25"
                            >
                                Dapatkan API Key di DeepSeek Console
                                <ExternalLink className="h-3 w-3" />
                            </a>
                        </div>

                        <ProfilePasswordInput
                            id="deepseek_api_key"
                            icon="key"
                            className="font-mono text-[12px]"
                            value={data.deepseek_api_key}
                            onChange={(val) => setData('deepseek_api_key', val)}
                            placeholder={
                                hasExistingKey
                                    ? '•••••••••••••••••••••••••••••••• (Kunci terenkripsi disimpan)'
                                    : 'sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
                            }
                            showLabel="Tampilkan API Key"
                            hideLabel="Sembunyikan API Key"
                        />
                        <p className="mt-1.5 text-[10.5px] font-medium text-slate-400 dark:text-slate-500">
                            {hasExistingKey
                                ? 'Biarkan kosong jika tidak ingin mengubah kunci API yang sudah tersimpan.'
                                : 'Kunci disimpan secara terenkripsi dan tidak dapat dibaca oleh pihak lain.'}
                        </p>
                        <InputError className="mt-1.5" message={errors.deepseek_api_key} />
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <ModelSelectorGroup
                            label="Model Penalaran (Pra-Audit / R1)"
                            helperText="Dipakai untuk pemindaian audit forensik dan analisis regulasi BKU."
                            options={REASONER_OPTIONS}
                            value={data.deepseek_model_reasoner}
                            onChange={(val) => setData('deepseek_model_reasoner', val)}
                        />

                        <ModelSelectorGroup
                            label="Model Interaktif (Copilot / V3)"
                            helperText="Dipakai untuk asisten drafting transaksi, kalkulasi pajak, dan analitik."
                            options={CHAT_OPTIONS}
                            value={data.deepseek_model_chat}
                            onChange={(val) => setData('deepseek_model_chat', val)}
                        />
                    </div>

                    {testResult.type && (
                        <div
                            className={`flex items-start gap-2.5 rounded-2xl border p-3.5 text-[11.5px] font-semibold ${
                                testResult.type === 'success'
                                    ? 'border-emerald-200/70 bg-pastel-mint text-emerald-700 dark:border-emerald-400/20 dark:bg-mint/10 dark:text-emerald-300'
                                    : 'border-rose-200/70 bg-pastel-rose text-rose-700 dark:border-rose-400/20 dark:bg-rose-500/10 dark:text-rose-300'
                            }`}
                        >
                            {testResult.type === 'success' ? (
                                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-300" />
                            ) : (
                                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600 dark:text-rose-300" />
                            )}
                            <span>{testResult.message}</span>
                        </div>
                    )}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 dark:border-white/5">
                    <div className="flex flex-wrap items-center gap-2.5">
                        <PrimaryButton disabled={processing}>
                            <Sparkles className="h-4 w-4" />
                            Simpan Pengaturan AI
                        </PrimaryButton>

                        <SecondaryButton
                            type="button"
                            onClick={handleTestConnection}
                            disabled={testLoading || (!hasExistingKey && !data.deepseek_api_key)}
                        >
                            {testLoading ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Menguji...
                                </>
                            ) : (
                                'Uji Koneksi API'
                            )}
                        </SecondaryButton>

                        <ProfileSavedPill show={recentlySuccessful} label="Tersimpan!" />
                    </div>

                    {hasExistingKey && (
                        <button
                            type="button"
                            onClick={() => setConfirmingClearKey(true)}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200/80 bg-pastel-rose/60 px-3 py-2 text-[10.5px] font-extrabold text-rose-600 transition hover:-translate-y-0.5 hover:bg-pastel-rose dark:border-rose-400/20 dark:bg-rose-500/10 dark:text-rose-300 dark:hover:bg-rose-500/15"
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                            Hapus Kunci
                        </button>
                    )}
                </div>
            </form>

            <ProfileModalShell
                show={confirmingClearKey}
                onClose={() => !clearingKey && setConfirmingClearKey(false)}
                closeable={!clearingKey}
                tone="rose"
                icon={<AlertTriangle />}
                titleId="deepseek-clear-modal-title"
                title="Hapus Kunci API DeepSeek?"
                subtitle="Kunci API terenkripsi pada profil Anda akan dihapus."
                footer={
                    <>
                        <SecondaryButton
                            onClick={() => setConfirmingClearKey(false)}
                            disabled={clearingKey}
                        >
                            Batal
                        </SecondaryButton>
                        <DangerButton onClick={confirmClearKey} disabled={clearingKey}>
                            {clearingKey ? 'Menghapus...' : 'Ya, Hapus Kunci'}
                        </DangerButton>
                    </>
                }
            >
                <p className="text-[11.5px] font-medium leading-relaxed text-slate-600 dark:text-slate-300">
                    Apakah Anda yakin ingin menghapus Kunci API DeepSeek dari profil Anda? Fitur AI (pra-audit dan asisten Copilot) tidak dapat digunakan sampai kunci API baru dimasukkan kembali.
                </p>
            </ProfileModalShell>
        </ProfileCardShell>
    );
}
