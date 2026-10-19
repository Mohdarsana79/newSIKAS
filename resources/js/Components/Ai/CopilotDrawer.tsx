import React, { useState, useEffect, useRef } from 'react';
import useVariantRoute from '@/Hooks/useVariantRoute';
import { usePage, Link } from '@inertiajs/react';
import axios from 'axios';
import Chart from 'react-apexcharts';
import { 
    Sparkles, 
    X, 
    Send, 
    Brain, 
    RotateCcw, 
    CheckCircle2, 
    AlertTriangle, 
    ExternalLink, 
    ArrowRight,
    Loader2,
    Calendar,
    Coins,
    Building2,
    ChevronRight,
    Minimize2,
    Maximize2,
    BarChart3
} from 'lucide-react';

interface StagingDraft {
    type: 'bku_transaction_draft';
    variant: string;
    tahun: number;
    tanggal: string;
    jenis_transaksi: string;
    rkas_id: number;
    kode_kegiatan_id: number;
    nama_kegiatan: string;
    kode_rekening_id: number;
    kode_rekening: string;
    nama_rekening: string;
    uraian: string;
    nama_toko: string;
    nominal: number;
    volume: number;
    satuan: string;
    harga_satuan: number;
    total_pajak: number;
    pajak_label: string;
    sisa_pagu_sebelum: number;
    sisa_pagu_sesudah: number;
    is_over_budget: boolean;
    is_committed?: boolean;
    bku_id?: number;
}

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    staging_card?: StagingDraft;
    analytics_chart?: any;
    timestamp: string;
}

export default function CopilotDrawer() {
    const { auth, variant: pageVariant, tahun: pageTahun } = usePage<any>().props;
    const vroute = useVariantRoute();

    const userId = auth?.user?.id || 'guest';
    const variant = pageVariant || 'reguler';
    const currentYear = pageTahun || new Date().getFullYear();

    const [isOpen, setIsOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputMessage, setInputMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [contextData, setContextData] = useState<any>(null);
    const [committingDraftIndex, setCommittingDraftIndex] = useState<number | null>(null);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const storageKey = `sikas_copilot_chat_${userId}_${variant}`;

    // Load messages from localStorage on initial render
    useEffect(() => {
        try {
            const saved = localStorage.getItem(storageKey);
            if (saved) {
                setMessages(JSON.parse(saved));
            }
        } catch (e) {
            console.error('Failed to load chat history:', e);
        }
    }, [storageKey]);

    // Save messages to localStorage when updated
    useEffect(() => {
        if (messages.length > 0) {
            try {
                localStorage.setItem(storageKey, JSON.stringify(messages));
            } catch (e) {
                console.error('Failed to save chat history:', e);
            }
        }
    }, [messages, storageKey]);

    // Fetch quick context
    useEffect(() => {
        if (isOpen && !contextData) {
            axios.get(vroute('api.ai.copilot.context', { tahun: currentYear }))
                .then(res => {
                    if (res.data.success) {
                        setContextData(res.data);
                    }
                })
                .catch(err => console.error('Error fetching context:', err));
        }
    }, [isOpen, currentYear]);

    // Auto-scroll to bottom of chat
    useEffect(() => {
        if (isOpen && !isMinimized) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, isOpen, isMinimized, isSending]);

    const handleClearChat = () => {
        if (confirm('Mulai obrolan baru dan bersihkan riwayat sesi ini?')) {
            setMessages([]);
            localStorage.removeItem(storageKey);
        }
    };

    const handleSendMessage = async (textToSend?: string) => {
        const text = (textToSend || inputMessage).trim();
        if (!text || isSending) return;

        const userMsg: Message = {
            id: `usr_${Date.now()}`,
            role: 'user',
            content: text,
            timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        };

        const updatedMessages = [...messages, userMsg];
        setMessages(updatedMessages);
        setInputMessage('');
        setIsSending(true);

        try {
            const apiMessages = updatedMessages.map(m => ({
                role: m.role,
                content: m.content,
            }));

            const response = await axios.post(vroute('api.ai.copilot.chat'), {
                tahun: currentYear,
                messages: apiMessages,
            });

            if (response.data.success) {
                const assistantMsg: Message = {
                    id: `ast_${Date.now()}`,
                    role: 'assistant',
                    content: response.data.content || 'Saya telah memproses permintaan Anda.',
                    staging_card: response.data.staging_card || undefined,
                    analytics_chart: response.data.analytics_chart || undefined,
                    timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
                };
                setMessages([...updatedMessages, assistantMsg]);
            } else {
                const errorMsg: Message = {
                    id: `ast_err_${Date.now()}`,
                    role: 'assistant',
                    content: response.data.message || 'Maaf, terjadi kendala saat memproses instruksi.',
                    timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
                };
                setMessages([...updatedMessages, errorMsg]);
            }
        } catch (error: any) {
            const errorMsg: Message = {
                id: `ast_err_${Date.now()}`,
                role: 'assistant',
                content: error.response?.data?.message || 'Gagal menghubungi SIKAS AI Copilot. Periksa koneksi jaringan dan API Key Anda.',
                timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
            };
            setMessages([...updatedMessages, errorMsg]);
        } finally {
            setIsSending(false);
        }
    };

    const handleCommitDraft = async (draft: StagingDraft, messageIndex: number) => {
        setCommittingDraftIndex(messageIndex);

        try {
            const response = await axios.post(vroute('api.ai.copilot.commit'), {
                tahun: currentYear,
                draft: draft,
            });

            if (response.data.success) {
                // Update staging card state in messages
                const nextMessages = [...messages];
                if (nextMessages[messageIndex]?.staging_card) {
                    nextMessages[messageIndex].staging_card = {
                        ...nextMessages[messageIndex].staging_card!,
                        is_committed: true,
                        bku_id: response.data.bku_id,
                    };
                    setMessages(nextMessages);
                }
            } else {
                alert(response.data.message || 'Gagal menyimpan transaksi ke BKU.');
            }
        } catch (error: any) {
            alert(error.response?.data?.message || 'Terjadi kesalahan saat menyimpan transaksi.');
        } finally {
            setCommittingDraftIndex(null);
        }
    };

    const hasApiKey = contextData?.has_api_key ?? true;

    return (
        <>
            {/* Floating Action Button (FAB) di Pojok Kanan Bawah */}
            {!isOpen && (
                <div className="fixed bottom-6 right-6 z-40 animate-bounce-subtle">
                    <button
                        onClick={() => setIsOpen(true)}
                        className="group relative flex items-center gap-2.5 px-4 py-3 bg-gradient-to-r from-purple-600 via-indigo-600 to-indigo-700 hover:from-purple-700 hover:to-indigo-800 text-white rounded-full shadow-xl shadow-purple-600/30 hover:shadow-2xl transition-all transform hover:-translate-y-1 active:scale-95"
                    >
                        <div className="relative">
                            <Sparkles className="w-5 h-5 text-purple-200 group-hover:rotate-12 transition-transform duration-300" />
                            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                            </span>
                        </div>
                        <span className="text-sm font-bold tracking-wide">
                            AI Copilot
                        </span>
                    </button>
                </div>
            )}

            {/* Slide-over Drawer Chat Panel */}
            {isOpen && (
                <div className={`fixed bottom-4 right-4 z-50 flex flex-col bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden transition-all duration-300 ${
                    isMinimized ? 'w-80 h-14' : 'w-full sm:w-[440px] h-[620px] max-h-[90vh]'
                }`}>
                    
                    {/* Header Drawer */}
                    <div className="px-4 py-3.5 bg-gradient-to-r from-purple-700 via-indigo-600 to-indigo-800 text-white flex items-center justify-between cursor-pointer select-none">
                        <div className="flex items-center gap-2.5" onClick={() => setIsMinimized(!isMinimized)}>
                            <div className="p-1.5 bg-white/10 rounded-lg">
                                <Brain className="w-5 h-5 text-purple-200" />
                            </div>
                            <div>
                                <div className="flex items-center gap-1.5">
                                    <h4 className="text-sm font-bold leading-tight">SIKAS AI Copilot</h4>
                                    <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-white/20 uppercase tracking-widest">
                                        V3
                                    </span>
                                </div>
                                {!isMinimized && (
                                    <p className="text-[10px] text-purple-200 leading-none mt-0.5 capitalize">
                                        Dana {variant} • TA {currentYear}
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center gap-1 text-white/80">
                            {!isMinimized && (
                                <button
                                    onClick={handleClearChat}
                                    title="Mulai Obrolan Baru"
                                    className="p-1.5 hover:text-white hover:bg-white/10 rounded-md transition"
                                >
                                    <RotateCcw className="w-4 h-4" />
                                </button>
                            )}
                            <button
                                onClick={() => setIsMinimized(!isMinimized)}
                                className="p-1.5 hover:text-white hover:bg-white/10 rounded-md transition"
                            >
                                {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
                            </button>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-1.5 hover:text-white hover:bg-white/10 rounded-md transition"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Chat Content Body (Saat Tidak Minimize) */}
                    {!isMinimized && (
                        <div className="flex-1 flex flex-col overflow-hidden bg-slate-50 dark:bg-gray-900">

                            {/* Banner jika belum memiliki API Key */}
                            {!hasApiKey && (
                                <div className="p-3 m-3 rounded-xl bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 text-xs flex items-start gap-2 text-amber-800 dark:text-amber-200">
                                    <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <strong>API Key Belum Terpasang:</strong> Masukkan kunci DeepSeek Anda di menu profil untuk menggunakan Copilot.
                                        <Link href={route('profile.edit')} className="inline-flex items-center gap-1 text-indigo-600 font-bold ml-1 hover:underline">
                                            Buka Profil <ArrowRight className="w-3 h-3" />
                                        </Link>
                                    </div>
                                </div>
                            )}

                            {/* Message List */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
                                {messages.length === 0 ? (
                                    <div className="py-8 text-center space-y-3">
                                        <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/40 rounded-2xl flex items-center justify-center mx-auto text-purple-600 dark:text-purple-300">
                                            <Sparkles className="w-6 h-6" />
                                        </div>
                                        <h5 className="font-bold text-gray-800 dark:text-gray-200 text-sm">
                                            Asisten Keuangan SIKAS Siap Membantu
                                        </h5>
                                        <p className="text-gray-500 dark:text-gray-400 max-w-xs mx-auto">
                                            Ketik instruksi belanja untuk draf BKU, kalkulasi pajak, atau tanyakan perbandingan anggaran.
                                        </p>

                                        {/* Suggested Quick Prompt Chips */}
                                        <div className="pt-2 flex flex-col gap-1.5 text-left max-w-xs mx-auto">
                                            {[
                                                '💰 Berapa sisa pagu kegiatan sarpras tahun ini?',
                                                '📝 Catat belanja konsumsi rapat Rp 350.000 tunai ke Katering Berkah',
                                                '📊 Bandingkan realisasi serapan belanja per triwulan',
                                                '🧾 Berapa tarif pajak untuk belanja laptop Rp 8.500.000?',
                                            ].map((prompt, idx) => (
                                                <button
                                                    key={idx}
                                                    onClick={() => handleSendMessage(prompt)}
                                                    className="p-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-indigo-400 dark:hover:border-indigo-500 text-gray-700 dark:text-gray-300 text-left transition flex items-center justify-between group"
                                                >
                                                    <span className="truncate pr-1">{prompt}</span>
                                                    <ChevronRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-indigo-600 flex-shrink-0" />
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    messages.map((msg, index) => (
                                        <div
                                            key={msg.id}
                                            className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                                        >
                                            <div
                                                className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 shadow-sm text-xs leading-relaxed ${
                                                    msg.role === 'user'
                                                        ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-br-none'
                                                        : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-200/80 dark:border-gray-700 rounded-bl-none'
                                                }`}
                                            >
                                                <div className="whitespace-pre-wrap">{msg.content}</div>

                                                {/* STAGING CARD DRAF TRANSAKSI */}
                                                {msg.staging_card && (
                                                    <div className="mt-3 p-3.5 rounded-xl bg-slate-50 dark:bg-gray-850 border border-indigo-200 dark:border-indigo-800/60 text-gray-900 dark:text-gray-100 shadow-sm space-y-2.5">
                                                        <div className="flex items-center justify-between border-b pb-2 border-gray-200 dark:border-gray-700">
                                                            <div className="flex items-center gap-1.5 font-bold text-indigo-700 dark:text-indigo-300">
                                                                <Coins className="w-4 h-4" />
                                                                Draf Transaksi BKU
                                                            </div>
                                                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300">
                                                                {msg.staging_card.jenis_transaksi}
                                                            </span>
                                                        </div>

                                                        <div className="space-y-1 text-[11px]">
                                                            <div>
                                                                <span className="text-gray-500">Kegiatan:</span>{' '}
                                                                <strong className="text-gray-800 dark:text-gray-200">{msg.staging_card.nama_kegiatan}</strong>
                                                            </div>
                                                            <div>
                                                                <span className="text-gray-500">Rekening:</span>{' '}
                                                                <span className="font-mono">{msg.staging_card.kode_rekening}</span> - {msg.staging_card.nama_rekening}
                                                            </div>
                                                            <div>
                                                                <span className="text-gray-500">Penyedia:</span>{' '}
                                                                <strong>{msg.staging_card.nama_toko}</strong> ({msg.staging_card.tanggal})
                                                            </div>
                                                            <div className="pt-1 flex items-center justify-between border-t border-gray-200 dark:border-gray-700">
                                                                <span className="font-bold">Total Nominal:</span>
                                                                <span className="font-bold text-sm text-indigo-600 dark:text-indigo-400">
                                                                    Rp {msg.staging_card.nominal.toLocaleString('id-ID')}
                                                                </span>
                                                            </div>
                                                            {msg.staging_card.total_pajak > 0 && (
                                                                <div className="flex items-center justify-between text-rose-600 text-[10px]">
                                                                    <span>Potongan Pajak:</span>
                                                                    <span>Rp {msg.staging_card.total_pajak.toLocaleString('id-ID')}</span>
                                                                </div>
                                                            )}
                                                            <div className="pt-1 flex items-center justify-between text-[10px] text-gray-500">
                                                                <span>Sisa Pagu RKAS:</span>
                                                                <span className={msg.staging_card.is_over_budget ? 'text-rose-600 font-bold' : 'text-emerald-600 font-bold'}>
                                                                    Rp {msg.staging_card.sisa_pagu_sebelum.toLocaleString('id-ID')} → Rp {msg.staging_card.sisa_pagu_sesudah.toLocaleString('id-ID')}
                                                                </span>
                                                            </div>
                                                        </div>

                                                        {/* Actions Button di Card */}
                                                        <div className="pt-2 border-t border-gray-200 dark:border-gray-700 flex items-center justify-end gap-2">
                                                            {msg.staging_card.is_committed ? (
                                                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2.5 py-1 rounded-md border border-emerald-200 dark:border-emerald-800">
                                                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                                                    Tersimpan di BKU (#{msg.staging_card.bku_id})
                                                                </span>
                                                            ) : (
                                                                <button
                                                                    onClick={() => handleCommitDraft(msg.staging_card!, index)}
                                                                    disabled={committingDraftIndex === index || msg.staging_card.is_over_budget}
                                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md font-bold text-[11px] shadow-sm transition disabled:opacity-50"
                                                                >
                                                                    {committingDraftIndex === index ? (
                                                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                                    ) : (
                                                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                                                    )}
                                                                    Konfirmasi & Simpan ke BKU
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* MINI ANALYTICS CHART */}
                                                {msg.analytics_chart && (
                                                    <div className="mt-3 p-3 rounded-xl bg-white dark:bg-gray-850 border border-gray-200 dark:border-gray-700 shadow-sm">
                                                        <div className="flex items-center gap-1.5 font-bold text-gray-800 dark:text-gray-200 mb-2">
                                                            <BarChart3 className="w-4 h-4 text-purple-600" />
                                                            {msg.analytics_chart.title}
                                                        </div>
                                                        <Chart
                                                            options={{
                                                                chart: {
                                                                    toolbar: { show: false },
                                                                    sparkline: { enabled: false },
                                                                },
                                                                xaxis: {
                                                                    categories: msg.analytics_chart.categories,
                                                                    labels: { style: { fontSize: '10px' } },
                                                                },
                                                                yaxis: {
                                                                    labels: {
                                                                        formatter: (val: number) => `Rp ${(val / 1000000).toFixed(1)}jt`,
                                                                        style: { fontSize: '9px' },
                                                                    },
                                                                },
                                                                colors: ['#6366f1', '#10b981'],
                                                                dataLabels: { enabled: false },
                                                                grid: { borderColor: '#f1f5f9' },
                                                            }}
                                                            series={msg.analytics_chart.series}
                                                            type="bar"
                                                            height={180}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                            <span className="text-[9px] text-gray-400 mt-1 px-1">
                                                {msg.timestamp}
                                            </span>
                                        </div>
                                    ))
                                )}

                                {/* Typing indicator */}
                                {isSending && (
                                    <div className="flex items-center gap-2 text-gray-400 bg-white dark:bg-gray-800 p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 w-32 shadow-sm">
                                        <Sparkles className="w-3.5 h-3.5 text-purple-600 animate-spin" />
                                        <span className="text-[11px] font-medium">Sedang berpikir...</span>
                                    </div>
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Input Form Footer */}
                            <div className="p-3 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
                                <form
                                    onSubmit={(e) => {
                                        e.preventDefault();
                                        handleSendMessage();
                                    }}
                                    className="flex items-center gap-2"
                                >
                                    <textarea
                                        rows={1}
                                        value={inputMessage}
                                        onChange={(e) => setInputMessage(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                handleSendMessage();
                                            }
                                        }}
                                        placeholder="Ketik instruksi belanja atau pertanyaan..."
                                        disabled={isSending}
                                        className="flex-1 resize-none rounded-xl border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs py-2 px-3 text-gray-900 dark:text-white dark:bg-gray-700"
                                    />
                                    <button
                                        type="submit"
                                        disabled={isSending || !inputMessage.trim()}
                                        className="p-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl shadow-md transition disabled:opacity-40"
                                    >
                                        <Send className="w-4 h-4" />
                                    </button>
                                </form>
                                <p className="text-[10px] text-gray-400 text-center mt-1.5">
                                    Tekan Enter untuk kirim • Shift+Enter baris baru
                                </p>
                            </div>
                        </div>
                    )}

                </div>
            )}
        </>
    );
}
