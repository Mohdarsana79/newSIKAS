import axios from 'axios';
import { 
    Brain, 
    Sparkles, 
    AlertCircle, 
    RotateCcw,
    Copy,
    Check,
    Printer,
    X,
    FileText,
    TrendingUp,
    ShieldCheck
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface RkasAiReviewModalProps {
    show: boolean;
    onClose: () => void;
    anggaranId: number;
    isPerubahan?: boolean;
    routePrefix?: string;
}

export default function RkasAiReviewModal({
    show,
    onClose,
    anggaranId,
    isPerubahan = false,
    routePrefix = '',
}: RkasAiReviewModalProps) {
    const [loading, setLoading] = useState(false);
    const [analysis, setAnalysis] = useState<string | null>(null);
    const [summary, setSummary] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const contentRef = useRef<HTMLDivElement>(null);

    const runAnalysis = async () => {
        setLoading(true);
        setError(null);

        try {
            const res = await axios.post(route(`${routePrefix}rkas.ai-executive-review`, anggaranId), {
                is_perubahan: isPerubahan,
            });

            if (res.data.success) {
                setAnalysis(res.data.analysis);
                setSummary(res.data.summary);
            } else {
                setError(res.data.message || 'Gagal memproses telaah anggaran.');
            }
        } catch (err: any) {
            setError(err.response?.data?.message || err.message || 'Terjadi kesalahan saat memanggil AI.');
        } finally {
            setLoading(false);
        }
    };

    // Auto-run analysis when opened for the first time
    useEffect(() => {
        if (show && !analysis && !loading) {
            runAnalysis();
        }
    }, [show]);

    // Handle Escape key and body scroll lock
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && show) {
                onClose();
            }
        };

        if (show) {
            document.body.style.overflow = 'hidden';
            window.addEventListener('keydown', handleKeyDown);
        }

        return () => {
            document.body.style.overflow = 'unset';
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [show]);

    const cleanHtml = (raw: string | null) => {
        if (!raw) return '';
        return raw
            .replace(/^```(?:html)?\s*/i, '')
            .replace(/\s*```$/i, '')
            .trim();
    };

    const handleCopy = () => {
        if (!analysis) return;
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = cleanHtml(analysis);
        const textContent = tempDiv.innerText || tempDiv.textContent || '';
        
        navigator.clipboard.writeText(textContent);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
    };

    const handlePrint = () => {
        if (!analysis) return;
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            window.print();
            return;
        }

        printWindow.document.write(`
            <!DOCTYPE html>
            <html lang="id">
            <head>
                <meta charset="UTF-8">
                <title>Laporan Telaah Eksekutif RKAS - AI DeepSeek</title>
                <style>
                    * { box-sizing: border-box; }
                    body { font-family: system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif; background: #fff; color: #111827; padding: 32px; margin: 0; line-height: 1.55; }
                    .header-box { margin-bottom: 24px; padding-bottom: 16px; border-bottom: 1px solid #e5e7eb; display: flex; align-items: center; justify-content: space-between; gap: 16px; }
                    .header-title { font-size: 20px; font-weight: 700; color: #111827; margin: 0; }
                    .header-sub { font-size: 12px; color: #6b7280; margin: 4px 0 0 0; }
                    .badge { font-size: 12px; font-weight: 600; padding: 4px 12px; background: #eef2ff; color: #4338ca; border: 1px solid #c7d2fe; border-radius: 9999px; white-space: nowrap; }
                    .footer-box { margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e7eb; text-align: center; font-size: 12px; color: #9ca3af; }
                    table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 12.5px; }
                    th, td { border: 1px solid #e5e7eb; padding: 6px 10px; text-align: left; }
                    th { background: #f9fafb; font-weight: 700; }
                    h2, h3, h4 { color: #111827; margin-top: 16px; margin-bottom: 6px; }
                    ul, ol { padding-left: 20px; margin: 8px 0; }
                    @media print {
                        body { padding: 1.5cm; }
                        .no-print { display: none !important; }
                    }
                </style>
            </head>
            <body>
                <div class="header-box">
                    <div>
                        <h1 class="header-title">TELAAH EKSEKUTIF PENGANGGARAN RKAS</h1>
                        <p class="header-sub">Sistem Informasi Keuangan Sekolah (SIKAS) • Analisis DeepSeek AI Engine</p>
                    </div>
                    <span class="badge">
                        ${isPerubahan ? 'RKAS Perubahan' : 'RKAS Murni'}
                    </span>
                </div>
                ${cleanHtml(analysis)}
                <div class="footer-box">
                    Dicetak secara otomatis dari SIKAS - Dokumen Telaah Cerdas AI Eksekutif
                </div>
                <script>
                    window.onload = function() {
                        setTimeout(() => {
                            window.print();
                        }, 500);
                    };
                </script>
            </body>
            </html>
        `);
        printWindow.document.close();
    };

    if (!show) return null;

    return (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex flex-col overflow-hidden animate-in fade-in duration-200">
            {/* Sticky Header Bar */}
            <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-3.5 flex items-center justify-between shrink-0 shadow-xs z-10">
                <div className="flex items-center gap-3.5">
                    <div className="p-2.5 bg-gradient-to-br from-indigo-500 via-indigo-600 to-purple-700 text-white rounded-xl shadow-md shadow-indigo-500/20 shrink-0">
                        <Brain className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="flex flex-wrap items-center gap-2">
                            <h2 className="text-base sm:text-lg font-extrabold text-gray-900 dark:text-white">
                                Telaah Cerdas AI Eksekutif
                            </h2>
                            <span className="text-[11px] bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 border border-purple-200 dark:border-purple-800">
                                <Sparkles className="w-3 h-3 text-purple-600 dark:text-purple-400" /> DeepSeek V3
                            </span>
                            <span className="text-[11px] bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-semibold px-2.5 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-800">
                                {isPerubahan ? 'RKAS Perubahan' : 'RKAS Murni'}
                            </span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            Laporan narasi komprehensif postur anggaran, prioritas belanja, analisis risiko, dan rekomendasi Kepala Sekolah
                        </p>
                    </div>
                </div>

                {/* Action Buttons Toolbar */}
                <div className="flex items-center gap-2">
                    {analysis && !loading && (
                        <>
                            <button
                                onClick={handleCopy}
                                type="button"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 rounded-lg transition-colors shadow-2xs"
                                title="Salin teks ringkasan ke clipboard"
                            >
                                {copied ? (
                                    <>
                                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                                        <span className="text-emerald-600 dark:text-emerald-400">Tersalin!</span>
                                    </>
                                ) : (
                                    <>
                                        <Copy className="w-3.5 h-3.5 text-gray-500" />
                                        <span className="hidden sm:inline">Salin Ringkasan</span>
                                    </>
                                )}
                            </button>

                            <button
                                onClick={handlePrint}
                                type="button"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 rounded-lg transition-colors shadow-2xs"
                                title="Cetak atau Simpan PDF"
                            >
                                <Printer className="w-3.5 h-3.5 text-gray-500" />
                                <span className="hidden sm:inline">Cetak / PDF</span>
                            </button>
                        </>
                    )}

                    <button
                        onClick={runAnalysis}
                        disabled={loading}
                        type="button"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 dark:text-indigo-200 bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 rounded-lg transition-colors disabled:opacity-50"
                        title="Analisis Ulang"
                    >
                        <RotateCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                        <span className="hidden sm:inline">Analisis Ulang</span>
                    </button>

                    <div className="h-5 w-px bg-gray-200 dark:bg-gray-700 mx-1"></div>

                    <button
                        onClick={onClose}
                        type="button"
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white bg-gray-100 dark:bg-gray-700/80 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition"
                        title="Tutup (Esc)"
                    >
                        <X className="w-4 h-4" />
                        <span className="hidden sm:inline">Tutup</span>
                    </button>
                </div>
            </header>

            {/* Full Height Scrollable Body */}
            <main className="flex-1 overflow-y-auto bg-slate-50 dark:bg-gray-950 p-6 sm:p-8 custom-scrollbar">
                <div className="max-w-6xl mx-auto w-full pb-12">
                    {loading ? (
                        /* Skeleton Shimmer Loading State */
                        <div className="space-y-6 animate-pulse">
                            {/* Loading Banner */}
                            <div className="p-5 bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 rounded-2xl flex items-center justify-between">
                                <div className="flex items-center gap-3.5">
                                    <div className="w-9 h-9 rounded-full border-3 border-indigo-200 border-t-indigo-600 animate-spin shrink-0"></div>
                                    <div>
                                        <p className="text-sm font-bold text-indigo-900 dark:text-indigo-200">
                                            Sedang Menyusun Dokumen Laporan Telaah Eksekutif RKAS...
                                        </p>
                                        <p className="text-xs text-indigo-700/80 dark:text-indigo-400/90 mt-0.5">
                                            DeepSeek AI sedang mengkaji keseimbangan pagu, kepatuhan pos belanja, kewajaran harga SIPLAH, dan instruksi pengesahan.
                                        </p>
                                    </div>
                                </div>
                                <span className="text-[11px] bg-indigo-200/70 dark:bg-indigo-800/60 text-indigo-900 dark:text-indigo-200 px-3 py-1 rounded-full font-bold">
                                    DeepSeek AI Engine
                                </span>
                            </div>

                            {/* Skeleton Narrative Intro Paragraph */}
                            <div className="bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 space-y-3">
                                <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded-md w-1/4"></div>
                                <div className="h-3.5 bg-gray-200/70 dark:bg-gray-700/60 rounded-md w-full"></div>
                                <div className="h-3.5 bg-gray-200/70 dark:bg-gray-700/60 rounded-md w-11/12"></div>
                                <div className="h-3.5 bg-gray-200/70 dark:bg-gray-700/60 rounded-md w-4/5"></div>
                            </div>

                            {/* Skeleton KPI Cards (4 grid) */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                {[1, 2, 3, 4].map((i) => (
                                    <div key={i} className="h-28 bg-white dark:bg-gray-800/80 rounded-2xl p-4 flex flex-col justify-between border border-gray-200 dark:border-gray-700">
                                        <div className="h-3.5 bg-gray-200 dark:bg-gray-700 rounded-md w-2/3"></div>
                                        <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded-md w-3/4"></div>
                                        <div className="h-2.5 bg-gray-200 dark:bg-gray-700 rounded-md w-1/2"></div>
                                    </div>
                                ))}
                            </div>

                            {/* Skeleton Table Card */}
                            <div className="bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 space-y-4">
                                <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded-md w-1/3"></div>
                                <div className="space-y-2.5">
                                    {[1, 2, 3, 4, 5].map((row) => (
                                        <div key={row} className="h-10 bg-gray-100 dark:bg-gray-700/50 rounded-lg w-full"></div>
                                    ))}
                                </div>
                            </div>

                            {/* Skeleton Narrative Review Card */}
                            <div className="bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 space-y-3">
                                <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded-md w-1/4"></div>
                                <div className="h-3.5 bg-gray-200/70 dark:bg-gray-700/60 rounded-md w-full"></div>
                                <div className="h-3.5 bg-gray-200/70 dark:bg-gray-700/60 rounded-md w-5/6"></div>
                            </div>
                        </div>
                    ) : error ? (
                        <div className="p-6 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-2xl flex items-start gap-4 text-rose-800 dark:text-rose-200 shadow-sm">
                            <AlertCircle className="w-6 h-6 text-rose-600 shrink-0 mt-0.5" />
                            <div>
                                <h4 className="font-bold text-base mb-1">Gagal Menghasilkan Telaah Cerdas AI</h4>
                                <p className="text-sm leading-relaxed">{error}</p>
                                <div className="mt-4">
                                    <button
                                        type="button"
                                        onClick={runAnalysis}
                                        className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-sm transition"
                                    >
                                        Coba Lagi
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : analysis ? (
                        <article 
                            ref={contentRef}
                            className="ai-review-interactive-html space-y-6 text-gray-800 dark:text-gray-100 antialiased"
                            dangerouslySetInnerHTML={{ __html: cleanHtml(analysis) }}
                        />
                    ) : null}
                </div>
            </main>
        </div>
    );
}
