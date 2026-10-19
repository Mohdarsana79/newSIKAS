import React, { useState, useEffect } from 'react';
import useVariantRoute from '@/Hooks/useVariantRoute';
import axios from 'axios';
import { 
    X, 
    Brain, 
    Sparkles, 
    AlertTriangle, 
    CheckCircle2, 
    AlertOctagon, 
    Info, 
    FileText, 
    RotateCw, 
    ExternalLink, 
    ChevronDown, 
    ChevronUp,
    ShieldAlert,
    ShieldCheck,
    Coins,
    Calendar,
    ArrowRight
} from 'lucide-react';
import { Link } from '@inertiajs/react';

interface Finding {
    id: string;
    category: string;
    severity: 'danger' | 'warning' | 'info';
    title: string;
    description: string;
    recommendation: string;
    transaction_ids?: number[];
    amount?: number;
}

interface AuditData {
    id: number;
    compliance_score: number;
    executive_summary: string;
    findings: Finding[];
    rules_checked: string[];
    created_at: string;
    last_bku_updated_at?: string;
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
    tahun: number | string;
    bulan: string;
    hasApiKey: boolean;
    initialAuditData?: AuditData | null;
    onAuditCompleted?: (audit: AuditData) => void;
}

export default function BkuAuditModal({
    isOpen,
    onClose,
    tahun,
    bulan,
    hasApiKey,
    initialAuditData,
    onAuditCompleted,
}: Props) {
    const vroute = useVariantRoute();
    const [auditData, setAuditData] = useState<AuditData | null>(initialAuditData || null);
    const [loading, setLoading] = useState(false);
    const [loadingStep, setLoadingStep] = useState(0);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [expandedFinding, setExpandedFinding] = useState<string | null>(null);

    const steps = [
        'Memindai saldo & kalkulasi deterministik kas/bank...',
        'Mengecek kepatuhan potongan pajak & kelengkapan NTPN...',
        'Memeriksa konsistensi belanja modal vs barang habis pakai...',
        'Penalaran mendalam model DeepSeek-R1 (Chain-of-Thought)...',
        'Menyusun skor kepatuhan & lembar kerja audit...',
    ];

    useEffect(() => {
        if (initialAuditData) {
            setAuditData(initialAuditData);
        }
    }, [initialAuditData]);

    useEffect(() => {
        let interval: any;
        if (loading) {
            setLoadingStep(0);
            interval = setInterval(() => {
                setLoadingStep((prev) => (prev < steps.length - 1 ? prev + 1 : prev));
            }, 3000);
        }
        return () => clearInterval(interval);
    }, [loading]);

    if (!isOpen) return null;

    const handleRunAudit = async (forceRefresh = false) => {
        setLoading(true);
        setErrorMessage(null);

        try {
            const response = await axios.post(vroute('api.bku-audit.run'), {
                tahun,
                bulan,
                force_refresh: forceRefresh,
            });

            if (response.data.success) {
                const newAudit = response.data.data;
                setAuditData(newAudit);
                if (onAuditCompleted) {
                    onAuditCompleted(newAudit);
                }
            } else {
                setErrorMessage(response.data.message || 'Gagal menjalankan audit AI.');
            }
        } catch (error: any) {
            console.error('Audit execution error:', error);
            setErrorMessage(
                error.response?.data?.message || 
                'Terjadi kesalahan saat menghubungi server audit DeepSeek.'
            );
        } finally {
            setLoading(false);
        }
    };

    const handleDownloadPdf = () => {
        if (!auditData?.id) return;
        window.open(vroute('bku-audit.pdf', { id: auditData.id }), '_blank');
    };

    const score = auditData?.compliance_score ?? 100;
    const scoreColor = score >= 85 ? 'text-emerald-500' : (score >= 60 ? 'text-amber-500' : 'text-rose-500');
    const scoreBg = score >= 85 ? 'bg-emerald-50 border-emerald-200' : (score >= 60 ? 'bg-amber-50 border-amber-200' : 'bg-rose-50 border-rose-200');
    const scoreText = score >= 85 ? 'Tingkat Kepatuhan Sangat Baik' : (score >= 60 ? 'Perlu Perhatian & Verifikasi' : 'Risiko Temuan Kepatuhan Tinggi');

    const filteredFindings = (auditData?.findings || []).filter((f) => {
        if (selectedCategory === 'all') return true;
        return f.category === selectedCategory;
    });

    const dangerCount = (auditData?.findings || []).filter(f => f.severity === 'danger').length;
    const warningCount = (auditData?.findings || []).filter(f => f.severity === 'warning').length;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-gray-100 dark:border-gray-700">
                
                {/* Header Modal */}
                <div className="px-6 py-4 bg-gradient-to-r from-purple-700 via-indigo-600 to-indigo-800 text-white flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/10 rounded-xl backdrop-blur-md">
                            <Brain className="w-6 h-6 text-purple-200" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-lg font-bold">Pra-Audit Kepatuhan BKU (DeepSeek-R1)</h3>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/20 tracking-wider">
                                    AI AUDITOR
                                </span>
                            </div>
                            <p className="text-xs text-purple-200 flex items-center gap-1.5 mt-0.5">
                                <Calendar className="w-3.5 h-3.5" />
                                Periode: {bulan} {tahun}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Body Content */}
                <div className="p-6 overflow-y-auto flex-1 space-y-6">

                    {/* Banner jika belum memiliki API Key */}
                    {!hasApiKey && (
                        <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 flex items-start gap-3">
                            <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                            <div className="text-sm">
                                <h4 className="font-bold text-amber-900 dark:text-amber-200">
                                    API Key DeepSeek Belum Terpasang
                                </h4>
                                <p className="text-amber-800 dark:text-amber-300 mt-1">
                                    Untuk menggunakan fitur Pra-Audit cerdas ini, Anda perlu memasukkan API Key DeepSeek pribadi Anda di menu Profil Pengguna.
                                </p>
                                <Link
                                    href={route('profile.edit')}
                                    className="inline-flex items-center gap-1 mt-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                                >
                                    Buka Pengaturan Profil Sekarang
                                    <ArrowRight className="w-3.5 h-3.5" />
                                </Link>
                            </div>
                        </div>
                    )}

                    {/* Error Banner jika ada kegagalan */}
                    {errorMessage && (
                        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 flex items-start gap-3 text-sm text-rose-800 dark:text-rose-200">
                            <AlertOctagon className="w-5 h-5 flex-shrink-0 text-rose-600 mt-0.5" />
                            <div>{errorMessage}</div>
                        </div>
                    )}

                    {/* Loading Screen / Stepper Animation */}
                    {loading && (
                        <div className="py-12 px-6 flex flex-col items-center justify-center text-center">
                            <div className="relative mb-6">
                                <div className="w-16 h-16 rounded-full border-4 border-purple-200 border-t-purple-600 animate-spin" />
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <Sparkles className="w-6 h-6 text-purple-600 animate-pulse" />
                                </div>
                            </div>
                            <h4 className="text-base font-bold text-gray-900 dark:text-white">
                                AI Sedang Menganalisis Transaksi Buku Kas...
                            </h4>
                            <p className="text-sm text-indigo-600 dark:text-indigo-400 font-medium mt-2 animate-fade">
                                {steps[loadingStep]}
                            </p>
                            <div className="w-64 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full mt-4 overflow-hidden">
                                <div 
                                    className="h-full bg-gradient-to-r from-purple-600 to-indigo-600 transition-all duration-500"
                                    style={{ width: `${((loadingStep + 1) / steps.length) * 100}%` }}
                                />
                            </div>
                            <p className="text-xs text-gray-400 mt-3">
                                Model DeepSeek-R1 memerlukan waktu penalaran (10-25 detik) untuk hasil audit akurat.
                            </p>
                        </div>
                    )}

                    {/* Belum Ada Audit & Tidak Sedang Loading */}
                    {!loading && !auditData && hasApiKey && (
                        <div className="py-12 px-6 text-center space-y-4">
                            <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-2xl flex items-center justify-center mx-auto text-purple-600 dark:text-purple-400">
                                <ShieldCheck className="w-8 h-8" />
                            </div>
                            <h4 className="text-lg font-bold text-gray-900 dark:text-white">
                                Siap Melakukan Pra-Audit Bulan {bulan} {tahun}
                            </h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400 max-w-md mx-auto">
                                AI akan memverifikasi saldo kas tidak minus, kepatuhan NTPN pajak, pemisahan belanja modal vs habis pakai, dan deteksi split-bill sebelum Anda menutup kas.
                            </p>
                            <button
                                onClick={() => handleRunAudit(false)}
                                className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold rounded-xl shadow-lg shadow-purple-600/20 transition transform hover:-translate-y-0.5"
                            >
                                <Sparkles className="w-4 h-4" />
                                Mulai Pra-Audit AI Sekarang
                            </button>
                        </div>
                    )}

                    {/* Hasil Audit Ditampilkan */}
                    {!loading && auditData && (
                        <div className="space-y-6 animate-fadeIn">
                            
                            {/* Summary Card with Gauge & Highlights */}
                            <div className={`p-6 rounded-2xl border ${scoreBg} flex flex-col md:flex-row items-center gap-6`}>
                                <div className="text-center md:border-r md:pr-6 border-gray-200 dark:border-gray-700 flex flex-col items-center">
                                    <div className={`text-5xl font-black ${scoreColor}`}>
                                        {score}
                                    </div>
                                    <div className="text-[11px] font-bold tracking-wider text-gray-500 uppercase mt-1">
                                        Skor Kepatuhan
                                    </div>
                                    <span className={`mt-2 px-2.5 py-0.5 rounded-full text-xs font-semibold ${scoreColor} bg-white dark:bg-gray-800 shadow-sm`}>
                                        {scoreText}
                                    </span>
                                </div>

                                <div className="flex-1 space-y-2 text-sm text-gray-700 dark:text-gray-300">
                                    <div className="flex items-center justify-between">
                                        <h5 className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                                            <Sparkles className="w-4 h-4 text-purple-600" />
                                            Ringkasan Eksekutif Auditor AI:
                                        </h5>
                                        <div className="flex items-center gap-2 text-xs">
                                            {dangerCount > 0 && (
                                                <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-bold">
                                                    {dangerCount} Bahaya
                                                </span>
                                            )}
                                            {warningCount > 0 && (
                                                <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold">
                                                    {warningCount} Peringatan
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <p className="leading-relaxed text-justify text-xs sm:text-sm">
                                        {auditData.executive_summary}
                                    </p>
                                </div>
                            </div>

                            {/* Category Filter Pills */}
                            <div className="flex flex-wrap items-center gap-2 border-b pb-3 border-gray-100 dark:border-gray-700 text-xs">
                                <span className="text-gray-400 font-medium mr-1">Filter Kategori:</span>
                                {[
                                    { key: 'all', label: 'Semua Temuan' },
                                    { key: 'pajak', label: 'Pajak & NTPN' },
                                    { key: 'keseimbangan_kas', label: 'Kas & Kronologi' },
                                    { key: 'belanja_modal', label: 'Belanja Modal & BAST' },
                                    { key: 'split_bill', label: 'Indikasi Split-Bill' },
                                ].map((cat) => (
                                    <button
                                        key={cat.key}
                                        onClick={() => setSelectedCategory(cat.key)}
                                        className={`px-3 py-1 rounded-full font-medium transition ${
                                            selectedCategory === cat.key
                                                ? 'bg-indigo-600 text-white shadow-sm'
                                                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
                                        }`}
                                    >
                                        {cat.label}
                                    </button>
                                ))}
                            </div>

                            {/* Daftar Temuan Accordion */}
                            <div className="space-y-3">
                                {filteredFindings.length === 0 ? (
                                    <div className="p-8 text-center text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-900/10 rounded-xl border border-emerald-100 dark:border-emerald-900/30">
                                        <CheckCircle2 className="w-8 h-8 mx-auto mb-2" />
                                        <p className="font-bold text-sm">Tidak Ditemukan Temuan Pelanggaran</p>
                                        <p className="text-xs text-gray-500 mt-1">
                                            Seluruh catatan pembukuan pada kategori ini telah memenuhi aturan regulasi.
                                        </p>
                                    </div>
                                ) : (
                                    filteredFindings.map((finding) => {
                                        const isExpanded = expandedFinding === finding.id;
                                        const sev = finding.severity;
                                        const borderClass = sev === 'danger' 
                                            ? 'border-rose-200 dark:border-rose-800/50' 
                                            : (sev === 'warning' ? 'border-amber-200 dark:border-amber-800/50' : 'border-sky-200 dark:border-sky-800/50');
                                        const badgeClass = sev === 'danger'
                                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300'
                                            : (sev === 'warning' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' : 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300');
                                        
                                        return (
                                            <div 
                                                key={finding.id}
                                                className={`rounded-xl border transition ${borderClass} bg-white dark:bg-gray-800 shadow-sm overflow-hidden`}
                                            >
                                                <div 
                                                    onClick={() => setExpandedFinding(isExpanded ? null : finding.id)}
                                                    className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-750 transition"
                                                >
                                                    <div className="flex items-start gap-3">
                                                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase mt-0.5 ${badgeClass}`}>
                                                            {sev}
                                                        </span>
                                                        <div>
                                                            <h6 className="text-sm font-bold text-gray-900 dark:text-white">
                                                                {finding.title}
                                                            </h6>
                                                            <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-3">
                                                                <span className="capitalize">Kategori: {finding.category.replace('_', ' ')}</span>
                                                                {finding.amount && (
                                                                    <span className="font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1">
                                                                        <Coins className="w-3.5 h-3.5" />
                                                                        Rp {finding.amount.toLocaleString('id-ID')}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    {isExpanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                                                </div>

                                                {isExpanded && (
                                                    <div className="px-4 pb-4 pt-2 border-t border-gray-100 dark:border-gray-700/60 bg-gray-50/50 dark:bg-gray-850/50 text-xs space-y-2">
                                                        <div>
                                                            <span className="font-bold text-gray-700 dark:text-gray-300">Uraian Kasus:</span>
                                                            <p className="text-gray-600 dark:text-gray-400 mt-0.5 text-justify">
                                                                {finding.description}
                                                            </p>
                                                        </div>
                                                        <div className="p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                                                            <span className="font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1 mb-1">
                                                                <CheckCircle2 className="w-3.5 h-3.5" />
                                                                Rekomendasi Tindakan Koreksi:
                                                            </span>
                                                            <p className="text-gray-700 dark:text-gray-300">
                                                                {finding.recommendation}
                                                            </p>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Modal Actions */}
                <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-100 dark:border-gray-700 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        {auditData && (
                            <button
                                onClick={() => handleRunAudit(true)}
                                disabled={loading}
                                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 transition shadow-sm"
                            >
                                <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                                Audit Ulang (Paksa Cek Baru)
                            </button>
                        )}
                    </div>

                    <div className="flex items-center gap-3">
                        {auditData && (
                            <button
                                onClick={handleDownloadPdf}
                                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800 rounded-lg hover:bg-indigo-100 transition shadow-sm"
                            >
                                <FileText className="w-4 h-4" />
                                Unduh Lembar Pra-Audit (PDF)
                            </button>
                        )}

                        <button
                            onClick={onClose}
                            className="px-5 py-2 text-xs font-bold text-white bg-gray-900 hover:bg-black dark:bg-gray-700 dark:hover:bg-gray-600 rounded-lg transition shadow"
                        >
                            {auditData ? 'Lanjutkan Penutupan Kas' : 'Tutup'}
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
}
