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
    FileText, 
    RotateCw, 
    ChevronDown, 
    ChevronUp,
    ShieldCheck,
    Coins,
    Calendar,
    ArrowRight,
    Layers,
    BookOpen
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
    tab_type?: string;
    periode_type?: string;
    periode_key?: string;
    metadata?: any;
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
    tahun: number | string;
    bulan?: string;
    tabType?: string;
    tabTitle?: string;
    initialPeriodeType?: 'bulanan' | 'tahapan' | 'tahunan';
    initialPeriodeKey?: string;
    hasApiKey: boolean;
    initialAuditData?: AuditData | null;
    onAuditCompleted?: (audit: AuditData, tabType: string) => void;
}

export default function BkuAuditModal({
    isOpen,
    onClose,
    tahun,
    bulan = 'januari',
    tabType = 'reg',
    tabTitle = 'Register Penutupan Kas',
    initialPeriodeType = 'bulanan',
    initialPeriodeKey,
    hasApiKey,
    initialAuditData,
    onAuditCompleted,
}: Props) {
    const vroute = useVariantRoute();

    // Period Scope State
    const [periodeType, setPeriodeType] = useState<'bulanan' | 'tahapan' | 'tahunan'>(initialPeriodeType || 'bulanan');
    const [selectedMonth, setSelectedMonth] = useState<string>(
        (initialPeriodeKey && initialPeriodeType === 'bulanan') 
            ? initialPeriodeKey.toLowerCase() 
            : (bulan ? bulan.toLowerCase() : 'januari')
    );
    const [selectedTahap, setSelectedTahap] = useState<'tahap_1' | 'tahap_2'>(
        (initialPeriodeKey === 'tahap_2') ? 'tahap_2' : 'tahap_1'
    );
    // Sync scope state when modal opens or target changes
    useEffect(() => {
        if (isOpen) {
            if (initialPeriodeType) {
                setPeriodeType(initialPeriodeType);
            }
            if (initialPeriodeKey) {
                if (initialPeriodeType === 'tahapan') {
                    setSelectedTahap(initialPeriodeKey === 'tahap_2' ? 'tahap_2' : 'tahap_1');
                } else if (initialPeriodeType === 'bulanan') {
                    setSelectedMonth(initialPeriodeKey.toLowerCase());
                }
            } else if (bulan) {
                setSelectedMonth(bulan.toLowerCase());
            }
        }
    }, [isOpen, tabType, initialPeriodeType, initialPeriodeKey, bulan]);

    const [auditData, setAuditData] = useState<AuditData | null>(initialAuditData || null);
    const [loading, setLoading] = useState(false);
    const [loadingStep, setLoadingStep] = useState(0);
    const [fetchingStatus, setFetchingStatus] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [expandedFinding, setExpandedFinding] = useState<string | null>(null);

    const monthList = [
        'januari', 'februari', 'maret', 'april', 'mei', 'juni',
        'juli', 'agustus', 'september', 'oktober', 'november', 'desember'
    ];

    const currentPeriodeKey = periodeType === 'bulanan' 
        ? selectedMonth 
        : (periodeType === 'tahapan' ? selectedTahap : 'tahunan');

    const periodeLabel = periodeType === 'bulanan'
        ? `Bulan ${selectedMonth.charAt(0).toUpperCase() + selectedMonth.slice(1)} ${tahun}`
        : (periodeType === 'tahapan'
            ? `${selectedTahap === 'tahap_1' ? 'Tahap 1 (Januari - Juni)' : 'Tahap 2 (Juli - Desember)'} ${tahun}`
            : `Tahun Anggaran Penuh ${tahun}`);

    const steps = [
        `Menganalisis pencatatan dan formula pada ${tabTitle}...`,
        'Memeriksa kepatuhan regulasi perpajakan & dokumen pendukung...',
        'Menguji konsistensi buku pembantu dengan BKU & rekening koran...',
        'Penalaran forensik model DeepSeek-R1 (Chain-of-Thought)...',
        'Menyusun skor kepatuhan & matriks rekomendasi BPK...',
    ];

    // Reset or fetch status when scope changes
    useEffect(() => {
        if (!isOpen) return;

        let isMounted = true;
        const fetchStatus = async () => {
            setFetchingStatus(true);
            setErrorMessage(null);

            try {
                const response = await axios.get(vroute('api.bku-audit.status'), {
                    params: {
                        tahun,
                        tab_type: tabType,
                        periode_type: periodeType,
                        periode_key: currentPeriodeKey,
                    }
                });

                if (isMounted && response.data.success) {
                    setAuditData(response.data.audit || null);
                    setSelectedCategory('all');
                }
            } catch (err: any) {
                console.error("Error fetching audit status:", err);
            } finally {
                if (isMounted) setFetchingStatus(false);
            }
        };

        fetchStatus();

        return () => { isMounted = false; };
    }, [isOpen, tahun, tabType, periodeType, currentPeriodeKey]);

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
                tab_type: tabType,
                periode_type: periodeType,
                periode_key: currentPeriodeKey,
                bulan: selectedMonth,
                force_refresh: forceRefresh,
            });

            if (response.data.success) {
                const newAudit = response.data.data;
                setAuditData(newAudit);
                if (onAuditCompleted) {
                    onAuditCompleted(newAudit, tabType);
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
    const scoreText = score >= 85 ? 'Tingkat Kepatuhan Sangat Baik' : (score >= 60 ? 'Perlu Perhatian / Catatan' : 'Risiko Temuan BPK Tinggi');

    // Extract categories dynamically
    const categories = Array.from(new Set((auditData?.findings || []).map(f => f.category))).filter(Boolean);

    const filteredFindings = (auditData?.findings || []).filter((f) => {
        if (selectedCategory === 'all') return true;
        return f.category === selectedCategory;
    });

    const dangerCount = (auditData?.findings || []).filter(f => f.severity === 'danger').length;
    const warningCount = (auditData?.findings || []).filter(f => f.severity === 'warning').length;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden border border-gray-100 dark:border-gray-700">
                
                {/* Header Modal */}
                <div className="px-5 py-3.5 bg-gradient-to-r from-purple-700 via-indigo-600 to-indigo-800 text-white flex items-center justify-between shadow">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/10 rounded-xl backdrop-blur-md">
                            <Brain className="w-6 h-6 text-purple-200" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-base sm:text-lg font-bold">Pra-Audit Forensik AI</h3>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/20 tracking-wider">
                                    DEEPSEEK-R1
                                </span>
                            </div>
                            <p className="text-xs text-purple-200 flex items-center gap-1.5 mt-0.5 font-medium">
                                <BookOpen className="w-3.5 h-3.5" />
                                {tabTitle}
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

                {/* Scope Switcher Bar */}
                <div className="px-6 py-3 bg-indigo-50/70 dark:bg-gray-850 border-b border-indigo-100 dark:border-gray-700 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-1.5">
                        <Layers className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        <span className="font-bold text-gray-700 dark:text-gray-300">Cakupan Audit:</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        {/* Scope Tabs */}
                        <div className="inline-flex rounded-lg bg-gray-200 dark:bg-gray-700 p-0.5 shadow-inner">
                            <button
                                type="button"
                                onClick={() => setPeriodeType('bulanan')}
                                className={`px-3 py-1 rounded-md font-semibold transition ${
                                    periodeType === 'bulanan'
                                        ? 'bg-white dark:bg-gray-800 text-indigo-700 dark:text-indigo-300 shadow-sm'
                                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
                                }`}
                            >
                                Bulanan
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setPeriodeType('tahapan');
                                    setSelectedTahap('tahap_1');
                                }}
                                className={`px-3 py-1 rounded-md font-semibold transition ${
                                    periodeType === 'tahapan' && selectedTahap === 'tahap_1'
                                        ? 'bg-white dark:bg-gray-800 text-indigo-700 dark:text-indigo-300 shadow-sm'
                                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
                                }`}
                            >
                                Tahap 1
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setPeriodeType('tahapan');
                                    setSelectedTahap('tahap_2');
                                }}
                                className={`px-3 py-1 rounded-md font-semibold transition ${
                                    periodeType === 'tahapan' && selectedTahap === 'tahap_2'
                                        ? 'bg-white dark:bg-gray-800 text-indigo-700 dark:text-indigo-300 shadow-sm'
                                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
                                }`}
                            >
                                Tahap 2
                            </button>
                            <button
                                type="button"
                                onClick={() => setPeriodeType('tahunan')}
                                className={`px-3 py-1 rounded-md font-semibold transition ${
                                    periodeType === 'tahunan'
                                        ? 'bg-white dark:bg-gray-800 text-indigo-700 dark:text-indigo-300 shadow-sm'
                                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
                                }`}
                            >
                                Tahunan (1 Tahun)
                            </button>
                        </div>

                        {/* Month Dropdown when 'bulanan' */}
                        {periodeType === 'bulanan' && (
                            <select
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(e.target.value)}
                                className="block rounded-lg border-gray-300 text-xs py-1 px-2.5 font-medium shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            >
                                {monthList.map((m) => (
                                    <option key={m} value={m} className="capitalize">
                                        {m.charAt(0).toUpperCase() + m.slice(1)}
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>
                </div>

                {/* Body Content */}
                <div className="p-6 overflow-y-auto flex-1 space-y-6">

                    {/* Banner jika belum memiliki API Key */}
                    {!hasApiKey && (
                        <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 flex items-start gap-3">
                            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                            <div className="text-xs">
                                <span className="font-bold text-amber-900 dark:text-amber-200">
                                    Kunci API DeepSeek Pribadi Belum Dikonfigurasi
                                </span>
                                <p className="text-amber-800 dark:text-amber-300 mt-0.5">
                                    Audit saat ini berjalan dengan <strong>Mesin Analisis Deterministik Internal</strong>. Untuk mengaktifkan penalaran mendalam AI (DeepSeek-R1), silakan masukkan API Key Anda di menu Profil Pengguna.
                                </p>
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
                                AI Sedang Menelaah {tabTitle}...
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
                                Memeriksa kepatuhan terhadap standar pengawasan BPK RI & Inspektorat Daerah.
                            </p>
                        </div>
                    )}

                    {/* Fetching Status Spinner */}
                    {fetchingStatus && !loading && (
                        <div className="py-12 text-center text-xs text-gray-500">
                            <RotateCw className="w-6 h-6 mx-auto mb-2 animate-spin text-indigo-600" />
                            Memeriksa data riwayat audit untuk {periodeLabel}...
                        </div>
                    )}

                    {/* Belum Ada Audit untuk Periode Ini & Tidak Sedang Loading */}
                    {!loading && !fetchingStatus && !auditData && (
                        <div className="py-12 px-6 text-center space-y-4">
                            <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-2xl flex items-center justify-center mx-auto text-purple-600 dark:text-purple-400">
                                <ShieldCheck className="w-8 h-8" />
                            </div>
                            <h4 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
                                Siap Melakukan Pra-Audit {tabTitle}
                            </h4>
                            <p className="text-xs text-gray-600 dark:text-gray-400 max-w-md mx-auto">
                                Memindai pembukuan pada <strong>{periodeLabel}</strong> untuk mengidentifikasi potensi catatan kepatuhan sebelum pelaporan resmi.
                            </p>
                            <button
                                onClick={() => handleRunAudit(false)}
                                className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-bold rounded-xl shadow-lg shadow-purple-600/20 transition transform hover:-translate-y-0.5"
                            >
                                <Sparkles className="w-4 h-4" />
                                Mulai Pra-Audit Forensik Sekarang
                            </button>
                        </div>
                    )}

                    {/* Hasil Audit Ditampilkan */}
                    {!loading && !fetchingStatus && auditData && (
                        <div className="space-y-6 animate-fadeIn">
                            
                            {/* Summary Card with Gauge & Highlights */}
                            <div className={`p-5 rounded-2xl border ${scoreBg} flex flex-col md:flex-row items-center gap-6`}>
                                <div className="text-center md:border-r md:pr-6 border-gray-200 dark:border-gray-700 flex flex-col items-center">
                                    <div className={`text-5xl font-black ${scoreColor}`}>
                                        {score}
                                    </div>
                                    <div className="text-[10px] font-bold tracking-wider text-gray-500 uppercase mt-1">
                                        Skor Kepatuhan
                                    </div>
                                    <span className={`mt-2 px-2.5 py-0.5 rounded-full text-xs font-semibold ${scoreColor} bg-white dark:bg-gray-800 shadow-sm`}>
                                        {scoreText}
                                    </span>
                                </div>

                                <div className="flex-1 space-y-2 text-sm text-gray-700 dark:text-gray-300">
                                    <div className="flex items-center justify-between">
                                        <h5 className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5 text-xs sm:text-sm">
                                            <Sparkles className="w-4 h-4 text-purple-600" />
                                            Ringkasan Eksekutif Auditor:
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
                            {categories.length > 0 && (
                                <div className="flex flex-wrap items-center gap-2 border-b pb-3 border-gray-100 dark:border-gray-700 text-xs">
                                    <span className="text-gray-400 font-medium mr-1">Filter Kategori:</span>
                                    <button
                                        type="button"
                                        onClick={() => setSelectedCategory('all')}
                                        className={`px-3 py-1 rounded-full font-medium transition ${
                                            selectedCategory === 'all'
                                                ? 'bg-indigo-600 text-white shadow-sm'
                                                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
                                        }`}
                                    >
                                        Semua ({auditData.findings?.length || 0})
                                    </button>
                                    {categories.map((cat) => (
                                        <button
                                            key={cat}
                                            type="button"
                                            onClick={() => setSelectedCategory(cat)}
                                            className={`px-3 py-1 rounded-full font-medium capitalize transition ${
                                                selectedCategory === cat
                                                    ? 'bg-indigo-600 text-white shadow-sm'
                                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
                                            }`}
                                        >
                                            {cat.replace(/_/g, ' ')}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Daftar Temuan Accordion */}
                            <div className="space-y-3">
                                {filteredFindings.length === 0 ? (
                                    <div className="p-8 text-center text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-900/10 rounded-xl border border-emerald-100 dark:border-emerald-900/30">
                                        <CheckCircle2 className="w-8 h-8 mx-auto mb-2" />
                                        <p className="font-bold text-sm">Tidak Ditemukan Catatan Kepatuhan</p>
                                        <p className="text-xs text-gray-500 mt-1">
                                            Seluruh catatan pembukuan pada {tabTitle} periode {periodeLabel} telah tertib dan sesuai standar regulasi.
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
                                                    className="p-3.5 sm:p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-750 transition"
                                                >
                                                    <div className="flex items-start gap-3">
                                                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase mt-0.5 ${badgeClass}`}>
                                                            {sev === 'danger' ? 'BAHAYA' : (sev === 'warning' ? 'PERINGATAN' : 'INFO')}
                                                        </span>
                                                        <div>
                                                            <h6 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white">
                                                                {finding.title}
                                                            </h6>
                                                            <div className="text-xs text-gray-500 mt-0.5 flex flex-wrap items-center gap-3">
                                                                <span className="capitalize">Kategori: {finding.category.replace(/_/g, ' ')}</span>
                                                                {finding.amount && (
                                                                    <span className="font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1">
                                                                        <Coins className="w-3 h-3 text-amber-500" />
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
                                                            <span className="font-bold text-gray-700 dark:text-gray-300">Uraian Fakta Kasus:</span>
                                                            <p className="text-gray-600 dark:text-gray-400 mt-0.5 text-justify">
                                                                {finding.description}
                                                            </p>
                                                        </div>
                                                        <div className="p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                                                            <span className="font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1 mb-1">
                                                                <CheckCircle2 className="w-3.5 h-3.5" />
                                                                Saran Rekomendasi Tindak Lanjut:
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
                <div className="px-6 py-3.5 bg-gray-50 dark:bg-gray-900 border-t border-gray-100 dark:border-gray-700 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        {auditData && !loading && (
                            <button
                                onClick={() => handleRunAudit(true)}
                                disabled={loading}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 transition shadow-sm"
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
                                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800 rounded-lg hover:bg-indigo-100 transition shadow-sm"
                            >
                                <FileText className="w-4 h-4" />
                                Unduh Lembar Kerja Audit (PDF)
                            </button>
                        )}

                        <button
                            onClick={onClose}
                            className="px-4 py-1.5 text-xs font-bold text-white bg-gray-900 hover:bg-black dark:bg-gray-700 dark:hover:bg-gray-600 rounded-lg transition shadow"
                        >
                            Tutup
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
}
