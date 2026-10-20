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
    Minus,
    BarChart3
} from 'lucide-react';
import type { CopilotWindowState } from '@/Layouts/AuthenticatedLayout';

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

function renderParsedTable(rows: string[]): string {
    if (rows.length < 2) return rows.join('\n');

    const headerCells = rows[0].split('|').slice(1, -1).map(c => c.trim());
    const delimiterCells = rows[1].split('|').slice(1, -1).map(c => c.trim());

    const aligns = delimiterCells.map(d => {
        if (d.startsWith(':') && d.endsWith(':')) return 'text-center';
        if (d.endsWith(':')) return 'text-right';
        return 'text-left';
    });

    const dataRows = rows.slice(2);

    let html = '<div class="overflow-x-auto overflow-y-auto max-h-72 my-2.5 rounded-xl border border-slate-200 dark:border-gray-700 shadow-xs bg-white dark:bg-gray-800 scroll-smooth">';
    html += '<table class="min-w-full text-xs divide-y divide-slate-200 dark:divide-gray-700">';
    
    // Header (Sticky on vertical scroll)
    html += '<thead class="bg-slate-100/95 dark:bg-gray-750 sticky top-0 z-10 backdrop-blur-xs shadow-xs"><tr>';
    headerCells.forEach((th, idx) => {
        const align = aligns[idx] || 'text-left';
        html += `<th class="px-3 py-2 ${align} font-bold text-slate-700 dark:text-gray-200 uppercase tracking-wider text-[11px] whitespace-nowrap border-b border-slate-200 dark:border-gray-700">${th}</th>`;
    });
    html += '</tr></thead>';

    // Body
    html += '<tbody class="divide-y divide-slate-100 dark:divide-gray-700/60 bg-white dark:bg-gray-800">';
    dataRows.forEach((row, rowIdx) => {
        const cells = row.split('|').slice(1, -1).map(c => c.trim());
        const bgClass = rowIdx % 2 === 1 ? 'bg-slate-50/50 dark:bg-gray-800/50' : '';
        html += `<tr class="${bgClass} hover:bg-indigo-50/40 dark:hover:bg-indigo-950/20 transition-colors">`;
        cells.forEach((td, idx) => {
            let align = aligns[idx] || 'text-left';
            let extraClass = '';
            if (td.startsWith('Rp') || /^-?\d[\d.,]*%?$/.test(td)) {
                align = 'text-right font-mono font-medium';
                extraClass = 'whitespace-nowrap';
            }
            html += `<td class="px-3 py-2 text-slate-700 dark:text-gray-300 ${align} ${extraClass}">${td}</td>`;
        });
        html += '</tr>';
    });
    html += '</tbody></table></div>';

    return html;
}

function parseMarkdownTables(text: string): string {
    const lines = text.split('\n');
    const result: string[] = [];
    let inTable = false;
    let tableRows: string[] = [];

    const isTableRow = (l: string) => /^\s*\|(.+)\|\s*$/.test(l);
    const isDelimiterRow = (l: string) => /^\s*\|(\s*:?-+:?\s*\|)+\s*$/.test(l);

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        if (isTableRow(line)) {
            if (!inTable && i + 1 < lines.length && isDelimiterRow(lines[i + 1])) {
                inTable = true;
                tableRows = [line];
            } else if (inTable) {
                tableRows.push(line);
            } else {
                result.push(line);
            }
        } else {
            if (inTable) {
                result.push(renderParsedTable(tableRows));
                inTable = false;
                tableRows = [];
            }
            result.push(line);
        }
    }

    if (inTable && tableRows.length > 0) {
        result.push(renderParsedTable(tableRows));
    }

    return result.join('\n');
}

function sanitizeAndFormatHtml(content: string): string {
    if (!content) return '';

    // 1. Strip markdown code fences around HTML or markdown table
    let processed = content
        .replace(/```(?:html|markdown|xml)?\s*([\s\S]*?)\s*```/gi, '$1')
        .replace(/```/g, '');

    // 2. Parse any markdown tables into styled HTML tables
    processed = parseMarkdownTables(processed);

    // 3. Clean dangerous script tags and event handlers
    processed = processed
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
        .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
        .replace(/\son\w+\s*=\s*["'][^"']*["']/gi, '')
        .replace(/javascript:/gi, '');

    // 4. If there are raw HTML <table> tags without overflow container, wrap them
    if (processed.includes('<table') && !processed.includes('overflow-x-auto')) {
        processed = processed.replace(
            /(<table[\s\S]*?<\/table>)/gi,
            '<div class="overflow-x-auto overflow-y-auto max-h-72 my-2.5 rounded-xl border border-slate-200 dark:border-gray-700 shadow-xs bg-white dark:bg-gray-800 scroll-smooth">$1</div>'
        );
    }

    // 5. Convert markdown headers: ### Title -> <h6 ...>Title</h6>
    processed = processed.replace(/^###\s+(.+)$/gm, '<h6 class="font-bold text-gray-900 dark:text-gray-100 mt-2 mb-1 text-xs">$1</h6>');
    processed = processed.replace(/^##\s+(.+)$/gm, '<h5 class="font-bold text-gray-900 dark:text-gray-100 mt-2.5 mb-1 text-sm">$1</h5>');
    
    // 6. Markdown bold **text**
    processed = processed.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    
    // 7. Markdown bullet points: lines starting with "- " or "* "
    processed = processed.replace(/(?:^|\n)[-*]\s+(.+)/g, '<div class="flex items-start gap-1.5 my-1 ml-1 text-xs"><span class="text-indigo-500 font-bold">•</span><span>$1</span></div>');

    // 8. Line breaks: convert newlines outside of HTML tags
    processed = processed
        .replace(/\n\n+/g, '<div class="my-1.5"></div>')
        .replace(/(?<!>)\n(?!<)/g, '<br/>');

    return processed;
}

interface CopilotDrawerProps {
    copilotState?: CopilotWindowState;
    setCopilotState?: (state: CopilotWindowState) => void;
}

export default function CopilotDrawer({
    copilotState,
    setCopilotState,
}: CopilotDrawerProps = {}) {
    const { auth, variant: pageVariant, tahun: pageTahun } = usePage<any>().props;
    const vroute = useVariantRoute();

    const userId = auth?.user?.id || 'guest';
    const variant = pageVariant || 'reguler';
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
            {/* Scoped Styling untuk Tabel dan Elemen HTML Chat Copilot */}
            <style>{`
                .ai-html-content table {
                    width: 100%;
                    border-collapse: collapse;
                    font-size: 0.725rem;
                    line-height: 1.25rem;
                }
                .ai-html-content th {
                    background-color: rgba(241, 245, 249, 0.95);
                    color: #334155;
                    font-weight: 700;
                    padding: 6px 8px;
                    text-align: left;
                    border-bottom: 1px solid #cbd5e1;
                    white-space: nowrap;
                }
                .dark .ai-html-content th {
                    background-color: rgba(30, 41, 59, 0.95);
                    color: #e2e8f0;
                    border-bottom: 1px solid #475569;
                }
                .ai-html-content td {
                    padding: 6px 8px;
                    border-bottom: 1px solid #f1f5f9;
                    color: #1e293b;
                }
                .dark .ai-html-content td {
                    border-bottom: 1px solid rgba(51, 65, 85, 0.5);
                    color: #cbd5e1;
                }
                .ai-html-content tr:last-child td {
                    border-bottom: none;
                }
                .ai-html-content tr:hover td {
                    background-color: rgba(248, 250, 252, 0.7);
                }
                .dark .ai-html-content tr:hover td {
                    background-color: rgba(30, 41, 59, 0.4);
                }
                .ai-html-content p {
                    margin-bottom: 0.4rem;
                }
                .ai-html-content p:last-child {
                    margin-bottom: 0;
                }
                .ai-html-content ul {
                    list-style-type: disc;
                    padding-left: 1.25rem;
                    margin-bottom: 0.4rem;
                }
                .ai-html-content ol {
                    list-style-type: decimal;
                    padding-left: 1.25rem;
                    margin-bottom: 0.4rem;
                }
                .ai-html-content li {
                    margin-bottom: 0.2rem;
                }
                .ai-html-content strong {
                    font-weight: 700;
                    color: #0f172a;
                }
                .dark .ai-html-content strong {
                    color: #f8fafc;
                }
                .ai-html-content code {
                    background-color: rgba(241, 245, 249, 0.8);
                    padding: 0.1rem 0.3rem;
                    border-radius: 0.25rem;
                    font-family: monospace;
                    font-size: 0.7rem;
                }
                .dark .ai-html-content code {
                    background-color: rgba(51, 65, 85, 0.6);
                    color: #e2e8f0;
                }
                /* Sleek Custom Scrollbar untuk Tabel yang Panjang */
                .ai-html-content .overflow-x-auto::-webkit-scrollbar,
                .ai-html-content .overflow-y-auto::-webkit-scrollbar {
                    width: 5px;
                    height: 5px;
                }
                .ai-html-content .overflow-x-auto::-webkit-scrollbar-track,
                .ai-html-content .overflow-y-auto::-webkit-scrollbar-track {
                    background: transparent;
                }
                .ai-html-content .overflow-x-auto::-webkit-scrollbar-thumb,
                .ai-html-content .overflow-y-auto::-webkit-scrollbar-thumb {
                    background: #cbd5e1;
                    border-radius: 9999px;
                }
                .dark .ai-html-content .overflow-x-auto::-webkit-scrollbar-thumb,
                .dark .ai-html-content .overflow-y-auto::-webkit-scrollbar-thumb {
                    background: #475569;
                }
                .copilot-maximized .ai-html-content .overflow-y-auto {
                    max-height: 55vh;
                }
            `}</style>

            {/* Slide-over Drawer Chat Panel */}
            {isOpen && (
                <div className={`fixed z-50 flex flex-col bg-white dark:bg-gray-800 shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden transition-all duration-300 ${
                    isMaximized
                        ? 'inset-2 md:inset-4 w-auto h-auto rounded-2xl copilot-maximized'
                        : isMinimized
                        ? 'bottom-4 right-4 w-80 h-14 rounded-2xl'
                        : 'bottom-4 right-4 w-full sm:w-[500px] h-[650px] max-h-[90vh] rounded-2xl'
                }`}>
                    
                    {/* Header Drawer */}
                    <div className="px-4 py-3.5 bg-gradient-to-r from-purple-700 via-indigo-600 to-indigo-800 text-white flex items-center justify-between cursor-pointer select-none">
                        <div 
                            className="flex items-center gap-2.5 flex-1 overflow-hidden pr-2" 
                            onClick={() => {
                                if (isMinimized) setState('normal');
                            }}
                        >
                            <div className="p-1.5 bg-white/10 rounded-lg flex-shrink-0">
                                <Brain className="w-5 h-5 text-purple-200" />
                            </div>
                            <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                    <h4 className="text-sm font-bold leading-tight truncate">SIKAS AI Copilot</h4>
                                    <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-white/20 uppercase tracking-widest flex-shrink-0">
                                        V3
                                    </span>
                                </div>
                                {!isMinimized && (
                                    <p className="text-[10px] text-purple-200 leading-none mt-0.5 capitalize truncate">
                                        Dana {variant} • TA {currentYear}
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center gap-1 text-white/80 flex-shrink-0">
                            {!isMinimized && (
                                <button
                                    type="button"
                                    onClick={handleClearChat}
                                    title="Mulai Obrolan Baru"
                                    className="p-1.5 hover:text-white hover:bg-white/10 rounded-md transition"
                                >
                                    <RotateCcw className="w-4 h-4" />
                                </button>
                            )}
                            {/* Minimize Button */}
                            <button
                                type="button"
                                onClick={() => setState(isMinimized ? 'normal' : 'minimized')}
                                title={isMinimized ? 'Buka Obrolan' : 'Kecilkan (Minimize)'}
                                className="p-1.5 hover:text-white hover:bg-white/10 rounded-md transition"
                            >
                                <Minus className="w-4 h-4" />
                            </button>
                            {/* Maximize / Restore Button */}
                            {!isMinimized && (
                                <button
                                    type="button"
                                    onClick={() => setState(isMaximized ? 'normal' : 'maximized')}
                                    title={isMaximized ? 'Pulihkan Ukuran' : 'Maksimalkan (Layar Penuh)'}
                                    className="p-1.5 hover:text-white hover:bg-white/10 rounded-md transition"
                                >
                                    {isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                                </button>
                            )}
                            {/* Close Button */}
                            <button
                                type="button"
                                onClick={() => setState('closed')}
                                title="Tutup SIKAS AI Copilot"
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
                                                '💰 Berapa pagu anggaran dan penerimaan dana tahun ini?',
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
                                                className={`rounded-2xl px-3.5 py-2.5 shadow-sm text-xs leading-relaxed ${
                                                    isMaximized ? 'max-w-[96%]' : 'max-w-[88%]'
                                                } ${
                                                    msg.role === 'user'
                                                        ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-br-none'
                                                        : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-200/80 dark:border-gray-700 rounded-bl-none'
                                                }`}
                                            >
                                                {msg.role === 'user' ? (
                                                    <div className="whitespace-pre-wrap">{msg.content}</div>
                                                ) : (
                                                    <div
                                                        className="ai-html-content text-xs leading-relaxed"
                                                        dangerouslySetInnerHTML={{ __html: sanitizeAndFormatHtml(msg.content) }}
                                                    />
                                                )}

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
