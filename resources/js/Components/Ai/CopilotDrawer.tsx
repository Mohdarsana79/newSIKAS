import IconTile, { IconTileTone } from '@/Components/ui/IconTile';
import useVariantRoute from '@/Hooks/useVariantRoute';
import type { CopilotWindowState } from '@/Layouts/AuthenticatedLayout';
import type { PageProps } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import axios from 'axios';
import {
    AlertTriangle,
    ArrowRight,
    BarChart3,
    BookOpen,
    Brain,
    Calculator,
    Check,
    ChevronRight,
    ChevronUp,
    Coins,
    Copy,
    Download,
    FileCheck2,
    Maximize2,
    Minimize2,
    Minus,
    Printer,
    Receipt,
    RotateCcw,
    Scale,
    Send,
    Sparkles,
    X,
} from 'lucide-react';
import { ReactNode, useEffect, useRef, useState } from 'react';
import { COPILOT_HTML_STYLES, sanitizeAndFormatHtml } from './copilot/copilotFormatter';
import {
    CopilotActionButtonsCard,
    CopilotAnalyticsChartCard,
    CopilotStagingDraftCard,
} from './copilot/CopilotMessageCards';
import type { ActionButton, Message, StagingDraft } from './copilot/types';

export type { ActionButton };

interface QuickPromptItem {
    text: string;
    label: string;
    icon: ReactNode;
    tone: IconTileTone;
}

const GUIDE_PROMPTS: QuickPromptItem[] = [
    {
        label: 'Alur & cara tutup buku BKU akhir bulan',
        text: 'Bagaimana alur dan cara tutup buku BKU setiap akhir bulan?',
        icon: <BookOpen />,
        tone: 'violet',
    },
    {
        label: 'Cara tarik data RKAS & BKU dari ARKAS desktop',
        text: 'Bagaimana cara tarik data RKAS & BKU dari ARKAS desktop?',
        icon: <Download />,
        tone: 'lime',
    },
    {
        label: 'Cetak kuitansi SPJ secara massal / sekaligus',
        text: 'Bagaimana cara mencetak kuitansi SPJ secara massal/sekaligus?',
        icon: <Printer />,
        tone: 'sky',
    },
    {
        label: 'Mengatasi selisih kas di BKU dan Buku Bank',
        text: 'Bagaimana cara mengatasi selisih kas di BKU dan Buku Bank?',
        icon: <Scale />,
        tone: 'amber',
    },
    {
        label: 'Cara membuat Berita Acara Serah Terima (BAST)',
        text: 'Bagaimana cara membuat Berita Acara Serah Terima (BAST)?',
        icon: <FileCheck2 />,
        tone: 'peach',
    },
];

const FINANCE_PROMPTS: QuickPromptItem[] = [
    {
        label: 'Cek pagu anggaran & penerimaan dana tahun ini',
        text: 'Berapa pagu anggaran dan penerimaan dana tahun ini?',
        icon: <Coins />,
        tone: 'lime',
    },
    {
        label: 'Catat draf belanja konsumsi rapat Rp 350.000 tunai',
        text: 'Catat belanja konsumsi rapat Rp 350.000 tunai ke Katering Berkah',
        icon: <Receipt />,
        tone: 'mint',
    },
    {
        label: 'Bandingkan realisasi serapan belanja per triwulan',
        text: 'Bandingkan realisasi serapan belanja per triwulan',
        icon: <BarChart3 />,
        tone: 'violet',
    },
    {
        label: 'Hitung tarif pajak belanja laptop Rp 8.500.000',
        text: 'Berapa tarif pajak untuk belanja laptop Rp 8.500.000?',
        icon: <Calculator />,
        tone: 'sky',
    },
];

const VARIANT_LABELS: Record<string, string> = {
    reguler: 'BOSP Reguler',
    kinerja: 'BOSP Kinerja',
    silpa: 'SiLPA BOSP Reguler',
    kinerja_silpa: 'SiLPA BOSP Kinerja',
};

function formatCurrentTime(): string {
    return new Date().toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
    });
}

function extractAxiosError(error: unknown, fallback: string): string {
    if (axios.isAxiosError(error) && error.response?.data?.message) {
        return String(error.response.data.message);
    }
    return fallback;
}

function stripTransientErrors(msgs: Message[]): Message[] {
    return msgs.map((m) =>
        m.staging_card?.commit_error
            ? { ...m, staging_card: { ...m.staging_card, commit_error: undefined } }
            : m,
    );
}

interface CopilotDrawerProps {
    copilotState?: CopilotWindowState;
    setCopilotState?: (state: CopilotWindowState) => void;
    sidebarOpen?: boolean;
}

export default function CopilotDrawer({
    copilotState,
    setCopilotState,
    sidebarOpen = true,
}: CopilotDrawerProps = {}) {
    const {
        auth,
        variant: pageVariant,
        tahun: pageTahun,
    } = usePage<PageProps<{ variant?: string; tahun?: number | string }>>().props;
    const vroute = useVariantRoute();

    const userId = auth?.user?.id || 'guest';
    const variant = pageVariant || 'reguler';
    const variantLabel = VARIANT_LABELS[variant] || `BOSP ${variant}`;
    const currentYear = pageTahun || new Date().getFullYear();

    // Internal fallback state if not passed from AuthenticatedLayout
    const [internalState, setInternalState] = useState<CopilotWindowState>('closed');
    const state = copilotState ?? internalState;
    const setState = setCopilotState ?? setInternalState;

    const isOpen = state !== 'closed';
    const isMinimized = state === 'minimized';
    const isMaximized = state === 'maximized';

    const [messages, setMessages] = useState<Message[]>([]);
    const [inputMessage, setInputMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [contextData, setContextData] = useState<{ has_api_key?: boolean } | null>(null);
    const [committingDraftIndex, setCommittingDraftIndex] = useState<number | null>(null);
    const [promptCategory, setPromptCategory] = useState<'guide' | 'finance'>('guide');
    const [confirmingClear, setConfirmingClear] = useState(false);
    const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const loadedStorageKeyRef = useRef<string | null>(null);
    const storageKey = `sikas_copilot_chat_${userId}_${variant}`;

    // Load messages from localStorage on initial render or variant switch
    useEffect(() => {
        loadedStorageKeyRef.current = null;
        try {
            const saved = localStorage.getItem(storageKey);
            if (saved) {
                setMessages(JSON.parse(saved));
            } else {
                setMessages([]);
            }
        } catch (e) {
            console.error('Failed to load chat history:', e);
            setMessages([]);
        }
        loadedStorageKeyRef.current = storageKey;
    }, [storageKey]);

    // Save messages to localStorage only for the currently loaded storageKey
    useEffect(() => {
        if (loadedStorageKeyRef.current !== storageKey) return;
        if (messages.length > 0) {
            try {
                localStorage.setItem(storageKey, JSON.stringify(stripTransientErrors(messages)));
            } catch (e) {
                console.error('Failed to save chat history:', e);
            }
        }
    }, [messages, storageKey]);

    // Fetch quick context
    useEffect(() => {
        if (isOpen && !contextData) {
            axios
                .get(vroute('api.ai.copilot.context', { tahun: currentYear }))
                .then((res) => {
                    if (res.data.success) {
                        setContextData(res.data);
                    }
                })
                .catch((err) => console.error('Error fetching context:', err));
        }
    }, [isOpen, currentYear, contextData]);

    // Auto-scroll to bottom of chat
    useEffect(() => {
        if (isOpen && !isMinimized) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, isOpen, isMinimized, isSending]);

    // Tutup bar konfirmasi reset saat minimize/close
    useEffect(() => {
        if (!isOpen || isMinimized) {
            setConfirmingClear(false);
        }
    }, [isOpen, isMinimized]);

    // Cleanup timer salin saat unmount
    useEffect(() => {
        return () => {
            if (copyTimerRef.current) {
                clearTimeout(copyTimerRef.current);
            }
        };
    }, []);

    // Auto-resize textarea (1–4 baris, maks 112px)
    useEffect(() => {
        const el = textareaRef.current;
        if (!el) return;
        el.style.height = 'auto';
        el.style.height = `${Math.min(el.scrollHeight, 112)}px`;
    }, [inputMessage, isOpen, isMinimized]);

    const executeClearChat = () => {
        setMessages([]);
        try {
            localStorage.removeItem(storageKey);
        } catch {
            // Abaikan bila storage diblokir
        }
        setConfirmingClear(false);
    };

    const handleCopyMessage = async (msg: Message) => {
        try {
            await navigator.clipboard.writeText(msg.content);
            setCopiedMessageId(msg.id);
            if (copyTimerRef.current) {
                clearTimeout(copyTimerRef.current);
            }
            copyTimerRef.current = setTimeout(() => setCopiedMessageId(null), 2000);
        } catch {
            // Abaikan bila clipboard API tidak tersedia
        }
    };

    const handleSendMessage = async (textToSend?: string) => {
        const text = (textToSend ?? inputMessage).trim();
        if (!text || isSending) return;

        const userMsg: Message = {
            id: `usr_${Date.now()}`,
            role: 'user',
            content: text,
            timestamp: formatCurrentTime(),
        };

        const updatedMessages = [...messages, userMsg];
        setMessages(updatedMessages);
        setInputMessage('');
        setConfirmingClear(false);
        setIsSending(true);

        try {
            const apiMessages = updatedMessages.map((m) => ({
                role: m.role,
                content: m.content,
            }));

            const response = await axios.post(vroute('api.ai.copilot.chat'), {
                tahun: currentYear,
                messages: apiMessages,
            });

            const replyTime = formatCurrentTime();

            if (response.data.success) {
                const assistantMsg: Message = {
                    id: `ast_${Date.now()}`,
                    role: 'assistant',
                    content: response.data.content || 'Saya telah memproses permintaan Anda.',
                    staging_card: response.data.staging_card || undefined,
                    analytics_chart: response.data.analytics_chart || undefined,
                    action_buttons: response.data.action_buttons || undefined,
                    timestamp: replyTime,
                };
                setMessages([...updatedMessages, assistantMsg]);
            } else {
                const errorMsg: Message = {
                    id: `ast_err_${Date.now()}`,
                    role: 'assistant',
                    content:
                        response.data.message ||
                        'Maaf, terjadi kendala saat memproses instruksi.',
                    timestamp: replyTime,
                };
                setMessages([...updatedMessages, errorMsg]);
            }
        } catch (error: unknown) {
            const errorMsg: Message = {
                id: `ast_err_${Date.now()}`,
                role: 'assistant',
                content: extractAxiosError(
                    error,
                    'Gagal menghubungi SIKAS AI Copilot. Periksa koneksi jaringan dan API Key Anda.',
                ),
                timestamp: formatCurrentTime(),
            };
            setMessages([...updatedMessages, errorMsg]);
        } finally {
            setIsSending(false);
        }
    };

    const updateStagingCard = (
        messageIndex: number,
        updater: (prev: StagingDraft) => StagingDraft,
    ) => {
        setMessages((prevMessages) =>
            prevMessages.map((msg, idx) =>
                idx === messageIndex && msg.staging_card
                    ? { ...msg, staging_card: updater(msg.staging_card) }
                    : msg,
            ),
        );
    };

    const handleCommitDraft = async (draft: StagingDraft, messageIndex: number) => {
        setCommittingDraftIndex(messageIndex);
        updateStagingCard(messageIndex, (prev) => ({ ...prev, commit_error: undefined }));

        try {
            const response = await axios.post(vroute('api.ai.copilot.commit'), {
                tahun: currentYear,
                draft,
            });

            if (response.data.success) {
                updateStagingCard(messageIndex, (prev) => ({
                    ...prev,
                    is_committed: true,
                    bku_id: response.data.bku_id,
                    commit_error: undefined,
                }));
            } else {
                updateStagingCard(messageIndex, (prev) => ({
                    ...prev,
                    commit_error: response.data.message || 'Gagal menyimpan transaksi ke BKU.',
                }));
            }
        } catch (error: unknown) {
            updateStagingCard(messageIndex, (prev) => ({
                ...prev,
                commit_error: extractAxiosError(
                    error,
                    'Terjadi kesalahan saat menyimpan transaksi ke BKU.',
                ),
            }));
        } finally {
            setCommittingDraftIndex(null);
        }
    };

    const hasApiKey = contextData?.has_api_key ?? true;
    const activePrompts = promptCategory === 'guide' ? GUIDE_PROMPTS : FINANCE_PROMPTS;

    return (
        <>
            <style>{COPILOT_HTML_STYLES}</style>

            {isOpen && (
                <section
                    aria-label="SIKAS AI Copilot"
                    className={`fixed z-40 flex flex-col overflow-hidden border border-white/80 bg-white shadow-float ring-1 ring-slate-900/[0.04] transition-all duration-300 dark:border-white/10 dark:bg-[#15131F] dark:shadow-card-dark dark:ring-white/5 ${
                        isMaximized
                            ? `bottom-2 left-2 right-2 top-2 lg:bottom-4 lg:right-4 lg:top-4 ${
                                  sidebarOpen ? 'lg:left-[276px]' : 'lg:left-[98px]'
                              } copilot-maximized h-auto w-auto rounded-[26px]`
                            : isMinimized
                              ? 'bottom-3 right-3 h-auto w-[min(330px,calc(100vw-1.5rem))] rounded-[22px]'
                              : 'inset-x-2 bottom-2 h-[min(600px,calc(100vh-5.5rem))] rounded-[26px] sm:inset-x-auto sm:bottom-4 sm:right-4 sm:w-[440px] lg:w-[470px]'
                    }`}
                >
                    {/* Signature SIKAS Neo-Bento Dark Header */}
                    <div className="relative overflow-hidden bg-gradient-to-r from-[#252438] via-[#1E1D2E] to-[#15141E] px-4 py-3 text-white select-none">
                        <div
                            aria-hidden
                            className="pointer-events-none absolute -left-8 -top-12 h-28 w-28 rounded-full bg-brand-500/25 blur-2xl"
                        />
                        <div
                            aria-hidden
                            className="pointer-events-none absolute -bottom-10 -right-8 h-28 w-28 rounded-full bg-lime-400/15 blur-2xl"
                        />

                        <div className="relative flex items-center justify-between gap-2">
                            <div className="flex min-w-0 flex-1 items-center gap-2.5">
                                <div className="relative shrink-0">
                                    <IconTile
                                        tone="lime"
                                        size="md"
                                        className="h-9 w-9 bg-gradient-to-br from-lime-300 via-lime-400 to-lime-500 text-slate-950 shadow-lime ring-0 dark:bg-gradient-to-br dark:from-lime-300 dark:via-lime-400 dark:to-lime-500 dark:text-slate-950 dark:ring-0"
                                    >
                                        <Brain />
                                    </IconTile>
                                    <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3 items-center justify-center rounded-full bg-[#1E1D2E]">
                                        <span className="h-2 w-2 rounded-full bg-mint animate-pulse-soft" />
                                    </span>
                                </div>

                                <div className="min-w-0">
                                    <div className="flex items-center gap-1.5">
                                        <h4 className="truncate text-[13.5px] font-extrabold leading-tight tracking-tight text-white">
                                            SIKAS AI Copilot
                                        </h4>
                                        <span className="shrink-0 rounded-full bg-lime-400 px-1.5 py-0.5 text-[8.5px] font-extrabold uppercase tracking-wider text-slate-950">
                                            V3
                                        </span>
                                        {isMinimized && messages.length > 0 && (
                                            <span className="text-sikas-num shrink-0 rounded-full bg-white/10 px-1.5 py-0.5 text-[9px] font-bold text-lime-200">
                                                {messages.length}
                                            </span>
                                        )}
                                    </div>
                                    {!isMinimized && (
                                        <p className="mt-0.5 truncate text-[10px] font-semibold text-white/60">
                                            {variantLabel} ·{' '}
                                            <span className="text-sikas-num text-lime-300">
                                                TA {currentYear}
                                            </span>
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="flex shrink-0 items-center gap-1">
                                {!isMinimized && messages.length > 0 && (
                                    <button
                                        type="button"
                                        onClick={() => setConfirmingClear((prev) => !prev)}
                                        title="Mulai Obrolan Baru"
                                        aria-label="Mulai Obrolan Baru"
                                        className={`inline-flex h-8 w-8 items-center justify-center rounded-xl border transition ${
                                            confirmingClear
                                                ? 'border-rose-400/40 bg-rose-500/20 text-rose-200'
                                                : 'border-white/10 bg-white/5 text-white/70 hover:bg-white/15 hover:text-white'
                                        }`}
                                    >
                                        <RotateCcw className="h-3.5 w-3.5" />
                                    </button>
                                )}

                                <button
                                    type="button"
                                    onClick={() => setState(isMinimized ? 'normal' : 'minimized')}
                                    title={isMinimized ? 'Buka Obrolan' : 'Kecilkan (Minimize)'}
                                    aria-label={isMinimized ? 'Buka Obrolan' : 'Kecilkan jendela Copilot'}
                                    className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/70 transition hover:bg-white/15 hover:text-white"
                                >
                                    {isMinimized ? (
                                        <ChevronUp className="h-3.5 w-3.5" />
                                    ) : (
                                        <Minus className="h-3.5 w-3.5" />
                                    )}
                                </button>

                                {!isMinimized && (
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setState(isMaximized ? 'normal' : 'maximized')
                                        }
                                        title={
                                            isMaximized
                                                ? 'Pulihkan Ukuran'
                                                : 'Maksimalkan (Layar Penuh)'
                                        }
                                        aria-label={
                                            isMaximized
                                                ? 'Pulihkan ukuran jendela Copilot'
                                                : 'Maksimalkan jendela Copilot'
                                        }
                                        className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/70 transition hover:bg-white/15 hover:text-white"
                                    >
                                        {isMaximized ? (
                                            <Minimize2 className="h-3.5 w-3.5" />
                                        ) : (
                                            <Maximize2 className="h-3.5 w-3.5" />
                                        )}
                                    </button>
                                )}

                                <button
                                    type="button"
                                    onClick={() => setState('closed')}
                                    title="Tutup SIKAS AI Copilot"
                                    aria-label="Tutup SIKAS AI Copilot"
                                    className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/70 transition hover:border-rose-400/30 hover:bg-rose-500/20 hover:text-rose-200"
                                >
                                    <X className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Inline Konfirmasi Reset Obrolan */}
                    {!isMinimized && confirmingClear && (
                        <div
                            role="alert"
                            className="flex flex-wrap items-center justify-between gap-2 border-b border-rose-200/70 bg-pastel-rose/80 px-4 py-2.5 dark:border-rose-400/20 dark:bg-rose-500/10"
                        >
                            <span className="text-[11px] font-bold text-rose-700 dark:text-rose-200">
                                Bersihkan seluruh riwayat obrolan sesi ini?
                            </span>
                            <div className="flex items-center gap-1.5">
                                <button
                                    type="button"
                                    onClick={() => setConfirmingClear(false)}
                                    className="rounded-xl border border-slate-200/80 bg-white px-2.5 py-1 text-[10.5px] font-bold text-slate-600 transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
                                >
                                    Batal
                                </button>
                                <button
                                    type="button"
                                    onClick={executeClearChat}
                                    className="rounded-xl bg-rose-500 px-2.5 py-1 text-[10.5px] font-extrabold text-white shadow-sm transition hover:bg-rose-600"
                                >
                                    Ya, Bersihkan
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Chat Content Body */}
                    {!isMinimized && (
                        <div className="flex flex-1 flex-col overflow-hidden bg-[#F6F7FB] dark:bg-[#0D0C15]">
                            {/* Banner API Key Belum Terpasang */}
                            {!hasApiKey && (
                                <div className="mx-3.5 mt-3 flex items-start gap-2.5 rounded-2xl border border-amber-200/80 bg-pastel-amber p-3 text-[11px] font-medium text-amber-800 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-200">
                                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-300" />
                                    <div className="min-w-0 leading-relaxed">
                                        <strong className="font-extrabold">
                                            API Key Belum Terpasang:
                                        </strong>{' '}
                                        Masukkan kunci DeepSeek Anda di menu profil untuk mulai menggunakan Copilot.
                                        <Link
                                            href={route('profile.edit')}
                                            className="ml-1.5 inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-extrabold text-brand-600 shadow-sm transition hover:bg-white dark:bg-white/10 dark:text-lime-300 dark:hover:bg-white/15"
                                        >
                                            Buka Profil
                                            <ArrowRight className="h-3 w-3" />
                                        </Link>
                                    </div>
                                </div>
                            )}

                            {/* Area Pesan / Welcome State */}
                            <div className="sikas-scroll flex-1 space-y-4 overflow-y-auto p-4 text-xs">
                                {messages.length === 0 ? (
                                    <div className="mx-auto flex flex-col items-center py-4 text-center">
                                        <IconTile tone="violet" size="lg" className="h-14 w-14 rounded-[20px]">
                                            <Sparkles className="h-6 w-6" />
                                        </IconTile>

                                        <h5 className="mt-3.5 text-[14.5px] font-extrabold tracking-tight text-slate-900 dark:text-white">
                                            Asisten &amp; Pemandu SIKAS Siap Membantu
                                        </h5>
                                        <p className="mt-1 max-w-sm text-[11px] font-medium leading-relaxed text-slate-500 dark:text-slate-400">
                                            Tanyakan panduan operasional menu aplikasi, analisis serapan BOSP, perhitungan pajak, atau buat draf belanja BKU.
                                        </p>

                                        {/* Glass Pill Switcher */}
                                        <div
                                            role="tablist"
                                            aria-label="Kategori saran cepat"
                                            className="mt-4 inline-flex items-center gap-1 rounded-2xl border border-slate-200/80 bg-white/90 p-1 shadow-sm dark:border-white/10 dark:bg-[#15131F]"
                                        >
                                            <button
                                                type="button"
                                                role="tab"
                                                aria-selected={promptCategory === 'guide'}
                                                onClick={() => setPromptCategory('guide')}
                                                className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-[11px] font-extrabold transition-all ${
                                                    promptCategory === 'guide'
                                                        ? 'bg-lime-400 text-slate-950 shadow-lime'
                                                        : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                                                }`}
                                            >
                                                <BookOpen className="h-3.5 w-3.5" />
                                                Panduan Aplikasi
                                            </button>
                                            <button
                                                type="button"
                                                role="tab"
                                                aria-selected={promptCategory === 'finance'}
                                                onClick={() => setPromptCategory('finance')}
                                                className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-[11px] font-extrabold transition-all ${
                                                    promptCategory === 'finance'
                                                        ? 'bg-lime-400 text-slate-950 shadow-lime'
                                                        : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                                                }`}
                                            >
                                                <Coins className="h-3.5 w-3.5" />
                                                Keuangan &amp; Draf
                                            </button>
                                        </div>

                                        {/* Prompt Cards Grid (1 kolom normal, 2 kolom saat maximized) */}
                                        <div
                                            className={`mt-4 grid w-full gap-2 text-left ${
                                                isMaximized
                                                    ? 'max-w-2xl grid-cols-1 md:grid-cols-2'
                                                    : 'max-w-md grid-cols-1'
                                            }`}
                                        >
                                            {activePrompts.map((prompt, idx) => (
                                                <button
                                                    key={idx}
                                                    type="button"
                                                    onClick={() => handleSendMessage(prompt.text)}
                                                    className="group flex items-center gap-2.5 rounded-2xl border border-white bg-white p-2.5 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-lime-400/70 hover:shadow-md dark:border-white/10 dark:bg-[#15131F] dark:hover:border-lime-400/40 dark:hover:bg-[#1B1829]"
                                                >
                                                    <IconTile tone={prompt.tone} size="sm">
                                                        {prompt.icon}
                                                    </IconTile>
                                                    <span className="min-w-0 flex-1 truncate text-[11px] font-bold text-slate-700 group-hover:text-slate-950 dark:text-slate-200 dark:group-hover:text-white">
                                                        {prompt.label}
                                                    </span>
                                                    <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-brand-600 dark:text-slate-600 dark:group-hover:text-lime-300" />
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    messages.map((msg, index) => {
                                        const isUser = msg.role === 'user';
                                        const isCopied = copiedMessageId === msg.id;

                                        return (
                                            <div
                                                key={msg.id}
                                                className={`flex flex-col ${
                                                    isUser ? 'items-end' : 'items-start'
                                                }`}
                                            >
                                                <div
                                                    className={`flex items-end gap-2 ${
                                                        isMaximized
                                                            ? 'max-w-[92%]'
                                                            : 'max-w-[90%]'
                                                    } ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
                                                >
                                                    {!isUser && (
                                                        <span className="mb-1 hidden h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#252438] to-[#1E1D2E] text-lime-300 shadow-sm ring-1 ring-white/10 sm:inline-flex">
                                                            <Brain className="h-3.5 w-3.5" />
                                                        </span>
                                                    )}

                                                    <div
                                                        className={`min-w-0 rounded-[20px] px-4 py-3 text-xs leading-relaxed shadow-sm ${
                                                            isUser
                                                                ? 'rounded-br-md bg-gradient-to-br from-[#252438] to-[#1E1D2E] text-white dark:from-brand-600 dark:to-brand-700'
                                                                : 'rounded-bl-md border border-slate-200/80 bg-white text-slate-800 dark:border-white/10 dark:bg-[#171524] dark:text-slate-200'
                                                        }`}
                                                    >
                                                        {isUser ? (
                                                            <div className="whitespace-pre-wrap font-medium">
                                                                {msg.content}
                                                            </div>
                                                        ) : (
                                                            <div
                                                                className="ai-html-content text-xs leading-relaxed"
                                                                dangerouslySetInnerHTML={{
                                                                    __html: sanitizeAndFormatHtml(
                                                                        msg.content,
                                                                    ),
                                                                }}
                                                            />
                                                        )}

                                                        {msg.staging_card && (
                                                            <CopilotStagingDraftCard
                                                                draft={msg.staging_card}
                                                                isCommitting={
                                                                    committingDraftIndex === index
                                                                }
                                                                onCommit={() =>
                                                                    handleCommitDraft(
                                                                        msg.staging_card!,
                                                                        index,
                                                                    )
                                                                }
                                                            />
                                                        )}

                                                        {msg.analytics_chart && (
                                                            <CopilotAnalyticsChartCard
                                                                chart={msg.analytics_chart}
                                                            />
                                                        )}

                                                        {msg.action_buttons &&
                                                            msg.action_buttons.length > 0 && (
                                                                <CopilotActionButtonsCard
                                                                    buttons={msg.action_buttons}
                                                                    isMaximized={isMaximized}
                                                                />
                                                            )}
                                                    </div>
                                                </div>

                                                {/* Baris meta jam & tombol salin 1-klik */}
                                                <div
                                                    className={`mt-1 flex items-center gap-2 px-1 ${
                                                        !isUser ? 'sm:pl-9' : ''
                                                    }`}
                                                >
                                                    <span className="text-sikas-num text-[9.5px] font-semibold text-slate-400 dark:text-slate-500">
                                                        {msg.timestamp}
                                                    </span>
                                                    {!isUser && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleCopyMessage(msg)}
                                                            aria-label={isCopied ? 'Jawaban tersalin' : 'Salin jawaban AI'}
                                                            className="inline-flex items-center gap-1 rounded-lg px-1.5 py-0.5 text-[9.5px] font-bold text-slate-400 transition hover:bg-slate-200/60 hover:text-slate-700 dark:text-slate-500 dark:hover:bg-white/10 dark:hover:text-slate-200"
                                                        >
                                                            {isCopied ? (
                                                                <>
                                                                    <Check className="h-3 w-3 text-emerald-500 dark:text-emerald-300" />
                                                                    <span className="text-emerald-600 dark:text-emerald-300">
                                                                        Tersalin!
                                                                    </span>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Copy className="h-3 w-3" />
                                                                    <span>Salin</span>
                                                                </>
                                                            )}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })
                                )}

                                {/* Typing Indicator Neo-Bento */}
                                {isSending && (
                                    <div className="flex items-center gap-2">
                                        <span className="hidden h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#252438] to-[#1E1D2E] text-lime-300 shadow-sm ring-1 ring-white/10 sm:inline-flex">
                                            <Brain className="h-3.5 w-3.5" />
                                        </span>
                                        <div className="inline-flex items-center gap-2.5 rounded-2xl rounded-bl-md border border-slate-200/80 bg-white px-3.5 py-2.5 shadow-sm dark:border-white/10 dark:bg-[#171524]">
                                            <span className="flex items-center gap-1">
                                                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-brand-500 [animation-delay:-0.25s]" />
                                                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-lime-400 [animation-delay:-0.12s]" />
                                                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-brand-400" />
                                            </span>
                                            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                                                SIKAS AI sedang menganalisis...
                                            </span>
                                        </div>
                                    </div>
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Input Composer Neo-Bento */}
                            <div className="border-t border-slate-100 bg-white/95 p-3 backdrop-blur-sm dark:border-white/10 dark:bg-[#15131F]">
                                <form
                                    onSubmit={(e) => {
                                        e.preventDefault();
                                        void handleSendMessage();
                                    }}
                                    className="flex items-end gap-2 rounded-2xl border border-slate-200/90 bg-slate-50/80 p-1.5 pl-3 transition focus-within:border-lime-400 focus-within:bg-white focus-within:ring-4 focus-within:ring-lime-200/60 dark:border-white/10 dark:bg-white/[0.04] dark:focus-within:border-lime-400/70 dark:focus-within:bg-white/[0.06] dark:focus-within:ring-lime-400/10"
                                >
                                    <textarea
                                        ref={textareaRef}
                                        rows={1}
                                        aria-label="Tulis pesan ke SIKAS AI Copilot"
                                        value={inputMessage}
                                        onChange={(e) => setInputMessage(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                void handleSendMessage();
                                            }
                                        }}
                                        placeholder="Ketik instruksi belanja, tanya pajak, atau panduan SIKAS..."
                                        disabled={isSending}
                                        className="sikas-scroll max-h-28 flex-1 resize-none border-0 bg-transparent py-1.5 text-[12px] font-semibold text-slate-800 placeholder:font-medium placeholder:text-slate-400 focus:outline-none focus:ring-0 disabled:opacity-60 dark:text-white dark:placeholder:text-slate-500"
                                    />
                                    <button
                                        type="submit"
                                        disabled={isSending || !inputMessage.trim()}
                                        aria-label="Kirim pesan"
                                        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-lime-400 text-slate-950 shadow-lime transition hover:-translate-y-0.5 hover:bg-lime-300 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
                                    >
                                        <Send className="h-4 w-4" />
                                    </button>
                                </form>
                            </div>
                        </div>
                    )}
                </section>
            )}
        </>
    );
}
