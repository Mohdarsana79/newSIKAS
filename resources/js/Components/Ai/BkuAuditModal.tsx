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
    Layers,
    BookOpen,
} from 'lucide-react';
import Modal from '@/Components/Modal';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import IconTile from '@/Components/ui/IconTile';
import StatusBadge from '@/Components/ui/StatusBadge';
import { cn } from '@/lib/utils';

interface Finding {
    id: string;
    category: string;
    severity: 'danger' | 'warning' | 'info';
    title: string;
    description: string;
    recommendation: string;
    transaction_ref?: string;
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

const MONTH_LIST = [
    'januari', 'februari', 'maret', 'april', 'mei', 'juni',
    'juli', 'agustus', 'september', 'oktober', 'november', 'desember',
];

const SEVERITY_META: Record<Finding['severity'], {
    label: string;
    badgeTone: 'danger' | 'warning' | 'info';
    cardBorder: string;
}> = {
    danger: {
        label: 'BAHAYA',
        badgeTone: 'danger',
        cardBorder: 'border-rose-200/90 dark:border-rose-500/25',
    },
    warning: {
        label: 'PERINGATAN',
        badgeTone: 'warning',
        cardBorder: 'border-amber-200/90 dark:border-amber-500/25',
    },
    info: {
        label: 'INFO',
        badgeTone: 'info',
        cardBorder: 'border-sky/25 dark:border-sky/25',
    },
};

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

    const [periodeType, setPeriodeType] = useState<'bulanan' | 'tahapan' | 'tahunan'>(
        initialPeriodeType || 'bulanan'
    );
    const [selectedMonth, setSelectedMonth] = useState<string>(
        initialPeriodeKey && initialPeriodeType === 'bulanan'
            ? initialPeriodeKey.toLowerCase()
            : bulan
                ? bulan.toLowerCase()
                : 'januari'
    );
    const [selectedTahap, setSelectedTahap] = useState<'tahap_1' | 'tahap_2'>(
        initialPeriodeKey === 'tahap_2' ? 'tahap_2' : 'tahap_1'
    );

    useEffect(() => {
        if (!isOpen) return;

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
    }, [isOpen, tabType, initialPeriodeType, initialPeriodeKey, bulan]);

    const [auditData, setAuditData] = useState<AuditData | null>(initialAuditData || null);
    const [loading, setLoading] = useState(false);
    const [loadingStep, setLoadingStep] = useState(0);
    const [fetchingStatus, setFetchingStatus] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [expandedFinding, setExpandedFinding] = useState<string | null>(null);

    const currentPeriodeKey =
        periodeType === 'bulanan'
            ? selectedMonth
            : periodeType === 'tahapan'
                ? selectedTahap
                : 'tahunan';

    const periodeLabel =
        periodeType === 'bulanan'
            ? `Bulan ${selectedMonth.charAt(0).toUpperCase() + selectedMonth.slice(1)} ${tahun}`
            : periodeType === 'tahapan'
                ? `${selectedTahap === 'tahap_1' ? 'Tahap 1 (Januari - Juni)' : 'Tahap 2 (Juli - Desember)'} ${tahun}`
                : `Tahun Anggaran Penuh ${tahun}`;

    const steps = [
        `Menganalisis pencatatan dan formula pada ${tabTitle}...`,
        'Memeriksa kepatuhan regulasi perpajakan & dokumen pendukung...',
        'Menguji konsistensi buku pembantu dengan BKU & rekening koran...',
        'Penalaran forensik model DeepSeek-R1 (Chain-of-Thought)...',
        'Menyusun skor kepatuhan & matriks rekomendasi BPK...',
    ];

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
                    },
                });

                if (isMounted && response.data.success) {
                    setAuditData(response.data.audit || null);
                    setSelectedCategory('all');
                    setExpandedFinding(null);
                }
            } catch (err: any) {
                console.error('Error fetching audit status:', err);
            } finally {
                if (isMounted) setFetchingStatus(false);
            }
        };

        fetchStatus();

        return () => {
            isMounted = false;
        };
    }, [isOpen, tahun, tabType, periodeType, currentPeriodeKey]);

    useEffect(() => {
        let interval: ReturnType<typeof setInterval> | undefined;
        if (loading) {
            setLoadingStep(0);
            interval = setInterval(() => {
                setLoadingStep((prev) => (prev < steps.length - 1 ? prev + 1 : prev));
            }, 3000);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [loading]);

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
                setExpandedFinding(null);
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

    const score = Math.max(0, Math.min(100, Number(auditData?.compliance_score ?? 100)));
    const scoreTier =
        score >= 85
            ? {
                  tone: 'success' as const,
                  label: 'Tingkat Kepatuhan Sangat Baik',
                  stroke: 'text-mint',
                  numberClass: 'text-emerald-600 dark:text-emerald-300',
                  cardClass:
                      'border-mint/25 bg-pastel-mint/45 dark:border-mint/25 dark:bg-mint/[0.08]',
              }
            : score >= 60
                ? {
                      tone: 'warning' as const,
                      label: 'Perlu Perhatian / Catatan',
                      stroke: 'text-amber-500',
                      numberClass: 'text-amber-600 dark:text-amber-300',
                      cardClass:
                          'border-amber-200/80 bg-pastel-amber/55 dark:border-amber-500/25 dark:bg-amber-500/[0.08]',
                  }
                : {
                      tone: 'danger' as const,
                      label: 'Risiko Temuan BPK Tinggi',
                      stroke: 'text-rose-500',
                      numberClass: 'text-rose-600 dark:text-rose-300',
                      cardClass:
                          'border-rose-200/80 bg-pastel-rose/55 dark:border-rose-500/25 dark:bg-rose-500/[0.08]',
                  };

    const gaugeRadius = 42;
    const gaugeCircumference = 2 * Math.PI * gaugeRadius;
    const gaugeOffset = gaugeCircumference * (1 - score / 100);

    const allFindings = auditData?.findings || [];
    const categories = Array.from(new Set(allFindings.map((f) => f.category))).filter(Boolean);
    const filteredFindings = allFindings.filter((f) =>
        selectedCategory === 'all' ? true : f.category === selectedCategory
    );

    const dangerCount = allFindings.filter((f) => f.severity === 'danger').length;
    const warningCount = allFindings.filter((f) => f.severity === 'warning').length;
    const rawRules = auditData?.rules_checked;
    const rulesChecked = Array.isArray(rawRules) ? rawRules : [];

    const scopeOptions: {
        id: string;
        label: string;
        active: boolean;
        onClick: () => void;
    }[] = [
        {
            id: 'bulanan',
            label: 'Bulanan',
            active: periodeType === 'bulanan',
            onClick: () => setPeriodeType('bulanan'),
        },
        {
            id: 'tahap_1',
            label: 'Tahap 1',
            active: periodeType === 'tahapan' && selectedTahap === 'tahap_1',
            onClick: () => {
                setPeriodeType('tahapan');
                setSelectedTahap('tahap_1');
            },
        },
        {
            id: 'tahap_2',
            label: 'Tahap 2',
            active: periodeType === 'tahapan' && selectedTahap === 'tahap_2',
            onClick: () => {
                setPeriodeType('tahapan');
                setSelectedTahap('tahap_2');
            },
        },
        {
            id: 'tahunan',
            label: 'Tahunan (1 Tahun)',
            active: periodeType === 'tahunan',
            onClick: () => setPeriodeType('tahunan'),
        },
    ];

    return (
        <Modal show={isOpen} onClose={onClose} maxWidth="4xl">
            <div className="relative flex max-h-[88vh] flex-col overflow-hidden rounded-[26px] bg-white dark:bg-[#15131F]">
                {/* Isolated decorative Neo-Bento glow */}
                <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[26px]">
                    <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-pastel-lavender/70 blur-3xl dark:bg-brand-500/15" />
                    <div className="absolute -bottom-24 -left-16 h-48 w-48 rounded-full bg-pastel-mint/45 blur-3xl dark:bg-mint/10" />
                </div>

                {/* Header Neo-Bento */}
                <div className="relative flex shrink-0 items-start justify-between gap-4 border-b border-slate-100 px-6 py-4 dark:border-white/10">
                    <div className="flex min-w-0 items-center gap-3.5">
                        <IconTile tone="violet" size="md">
                            <Brain className="h-5 w-5" />
                        </IconTile>
                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                                <h2 className="text-[16px] font-extrabold tracking-tight text-slate-900 dark:text-white">
                                    Pra-Audit Forensik AI
                                </h2>
                                <StatusBadge tone="violet">DEEPSEEK-R1</StatusBadge>
                            </div>
                            <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs font-medium text-slate-500 dark:text-slate-400">
                                <BookOpen className="h-3.5 w-3.5 shrink-0 text-brand-500 dark:text-brand-300" />
                                <span className="truncate">{tabTitle}</span>
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Tutup modal pra-audit"
                        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-white"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {/* Scope Switcher Bar */}
                <div className="relative flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/90 px-6 py-3 text-xs dark:border-white/10 dark:bg-white/[0.03]">
                    <div className="flex items-center gap-2">
                        <Layers className="h-4 w-4 text-brand-600 dark:text-brand-300" />
                        <span className="font-bold text-slate-700 dark:text-slate-200">
                            Cakupan Audit:
                        </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <div className="inline-flex flex-wrap items-center gap-1 rounded-2xl border border-slate-200/80 bg-slate-100/90 p-1 dark:border-white/10 dark:bg-white/[0.04]">
                            {scopeOptions.map((option) => (
                                <button
                                    key={option.id}
                                    type="button"
                                    onClick={option.onClick}
                                    className={cn(
                                        'rounded-xl px-3 py-1.5 text-[11.5px] font-bold transition-all',
                                        option.active
                                            ? 'bg-white text-brand-700 shadow-sm dark:bg-brand-500/25 dark:text-brand-200'
                                            : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                                    )}
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>

                        {periodeType === 'bulanan' && (
                            <select
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(e.target.value)}
                                aria-label="Pilih bulan audit"
                                className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold capitalize text-slate-800 shadow-sm transition focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200 dark:border-white/10 dark:bg-[#1E1B2E] dark:text-white dark:focus:border-brand-400 dark:focus:ring-brand-500/20"
                            >
                                {MONTH_LIST.map((m) => (
                                    <option key={m} value={m} className="bg-white text-slate-900 dark:bg-[#1E1B2E] dark:text-white">
                                        {m.charAt(0).toUpperCase() + m.slice(1)}
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>
                </div>

                {/* Scrollable Body */}
                <div className="sikas-scroll relative min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5">
                    {/* Warning jika belum ada API Key */}
                    {!hasApiKey && (
                        <div className="flex items-start gap-3 rounded-[20px] border border-amber-200/80 bg-pastel-amber/75 p-4 dark:border-amber-500/25 dark:bg-amber-500/[0.08]">
                            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/80 text-amber-600 shadow-sm dark:bg-amber-500/20 dark:text-amber-300">
                                <AlertTriangle className="h-4 w-4" />
                            </div>
                            <div className="text-xs">
                                <span className="font-extrabold text-amber-900 dark:text-amber-200">
                                    Kunci API DeepSeek Pribadi Belum Dikonfigurasi
                                </span>
                                <p className="mt-0.5 leading-relaxed text-amber-800/90 dark:text-amber-200/80">
                                    Audit saat ini berjalan dengan <strong>Mesin Analisis Deterministik Internal</strong>. Untuk mengaktifkan penalaran mendalam AI (DeepSeek-R1), masukkan API Key Anda pada menu Profil Pengguna.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Error Banner */}
                    {errorMessage && (
                        <div className="flex items-start gap-3 rounded-[20px] border border-rose-200/80 bg-pastel-rose/75 p-4 text-xs text-rose-800 dark:border-rose-500/25 dark:bg-rose-500/[0.08] dark:text-rose-200">
                            <AlertOctagon className="mt-0.5 h-5 w-5 shrink-0 text-rose-600 dark:text-rose-300" />
                            <div className="leading-relaxed font-medium">{errorMessage}</div>
                        </div>
                    )}

                    {/* Loading Stepper */}
                    {loading && (
                        <div className="flex flex-col items-center justify-center rounded-[24px] border border-slate-200/80 bg-slate-50/80 px-6 py-12 text-center dark:border-white/10 dark:bg-white/[0.03]">
                            <div className="relative mb-5">
                                <div className="h-16 w-16 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600 dark:border-brand-500/25 dark:border-t-brand-400" />
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <Sparkles className="h-6 w-6 animate-pulse text-brand-600 dark:text-brand-300" />
                                </div>
                            </div>
                            <h4 className="text-base font-extrabold text-slate-900 dark:text-white">
                                AI Sedang Menelaah {tabTitle}...
                            </h4>
                            <p className="mt-2 text-xs font-semibold text-brand-600 dark:text-brand-300 sm:text-sm">
                                {steps[loadingStep]}
                            </p>
                            <div className="mt-4 h-2 w-64 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
                                <div
                                    className="h-full rounded-full bg-gradient-to-r from-brand-500 to-lime-400 transition-all duration-500"
                                    style={{ width: `${((loadingStep + 1) / steps.length) * 100}%` }}
                                />
                            </div>
                            <p className="mt-3 text-[11px] text-slate-500 dark:text-slate-400">
                                Memeriksa kepatuhan terhadap standar pengawasan BPK RI & Inspektorat Daerah.
                            </p>
                        </div>
                    )}

                    {/* Fetching History Status */}
                    {fetchingStatus && !loading && (
                        <div className="flex flex-col items-center justify-center rounded-[24px] border border-slate-200/80 bg-slate-50/70 py-12 text-center text-xs text-slate-500 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-400">
                            <RotateCw className="mb-2.5 h-6 w-6 animate-spin text-brand-600 dark:text-brand-300" />
                            <span>Memeriksa data riwayat audit untuk {periodeLabel}...</span>
                        </div>
                    )}

                    {/* Empty State */}
                    {!loading && !fetchingStatus && !auditData && (
                        <div className="flex flex-col items-center justify-center space-y-4 rounded-[24px] border border-slate-200/80 bg-slate-50/70 px-6 py-12 text-center dark:border-white/10 dark:bg-white/[0.03]">
                            <IconTile tone="violet" size="lg">
                                <ShieldCheck className="h-7 w-7" />
                            </IconTile>
                            <div className="space-y-1.5">
                                <h4 className="text-base font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-lg">
                                    Siap Melakukan Pra-Audit {tabTitle}
                                </h4>
                                <p className="mx-auto max-w-md text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                                    Memindai pembukuan pada <strong className="text-slate-900 dark:text-white">{periodeLabel}</strong> untuk mengidentifikasi potensi catatan kepatuhan sebelum pelaporan resmi.
                                </p>
                            </div>
                            <PrimaryButton type="button" onClick={() => handleRunAudit(false)}>
                                <Sparkles className="h-4 w-4" />
                                Mulai Pra-Audit Forensik Sekarang
                            </PrimaryButton>
                        </div>
                    )}

                    {/* Audit Results */}
                    {!loading && !fetchingStatus && auditData && (
                        <div className="space-y-5">
                            {/* Bento Grid 2-Bagian: Skor & Ringkasan Eksekutif */}
                            <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
                                {/* Kartu Skor Kepatuhan */}
                                <div
                                    className={cn(
                                        'flex flex-col items-center justify-center rounded-[22px] border p-5 text-center lg:col-span-4',
                                        scoreTier.cardClass
                                    )}
                                >
                                    <div className="relative flex h-28 w-28 items-center justify-center">
                                        <svg className="h-28 w-28 -rotate-90" viewBox="0 0 100 100">
                                            <circle
                                                cx="50"
                                                cy="50"
                                                r={gaugeRadius}
                                                fill="none"
                                                strokeWidth="8"
                                                className="stroke-slate-200/80 dark:stroke-white/10"
                                            />
                                            <circle
                                                cx="50"
                                                cy="50"
                                                r={gaugeRadius}
                                                fill="none"
                                                strokeWidth="8"
                                                strokeLinecap="round"
                                                strokeDasharray={gaugeCircumference}
                                                strokeDashoffset={gaugeOffset}
                                                className={cn('stroke-current transition-all duration-700', scoreTier.stroke)}
                                            />
                                        </svg>
                                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                                            <span
                                                className={cn(
                                                    'text-3xl font-black leading-none text-sikas-num',
                                                    scoreTier.numberClass
                                                )}
                                            >
                                                {score}
                                            </span>
                                            <span className="mt-1 text-[9.5px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                                Skor
                                            </span>
                                        </div>
                                    </div>

                                    <StatusBadge tone={scoreTier.tone} dot className="mt-3">
                                        {scoreTier.label}
                                    </StatusBadge>

                                    <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                                        {dangerCount > 0 && (
                                            <StatusBadge tone="danger">{dangerCount} Bahaya</StatusBadge>
                                        )}
                                        {warningCount > 0 && (
                                            <StatusBadge tone="warning">{warningCount} Peringatan</StatusBadge>
                                        )}
                                        {dangerCount === 0 && warningCount === 0 && (
                                            <StatusBadge tone="neutral">Nihil Temuan Kritis</StatusBadge>
                                        )}
                                    </div>
                                </div>

                                {/* Kartu Ringkasan Eksekutif Auditor */}
                                <div className="flex flex-col justify-between rounded-[22px] border border-slate-200/80 bg-white p-5 dark:border-white/10 dark:bg-white/[0.03] lg:col-span-8">
                                    <div>
                                        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5 dark:border-white/10">
                                            <h5 className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-slate-900 dark:text-white">
                                                <Sparkles className="h-4 w-4 text-brand-600 dark:text-brand-300" />
                                                Ringkasan Eksekutif Auditor
                                            </h5>
                                            <span className="rounded-lg bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-600 dark:bg-white/10 dark:text-slate-300">
                                                {periodeLabel}
                                            </span>
                                        </div>
                                        <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-200 sm:text-[13px]">
                                            {auditData.executive_summary}
                                        </p>
                                    </div>

                                    {rulesChecked.length > 0 && (
                                        <div className="mt-4 flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-3 dark:border-white/10">
                                            <span className="mr-1 text-[10.5px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                                                Aturan Diperiksa:
                                            </span>
                                            {rulesChecked.slice(0, 6).map((rule, idx) => (
                                                <span
                                                    key={idx}
                                                    className="rounded-lg bg-slate-100 px-2 py-0.5 text-[10.5px] font-semibold text-slate-600 dark:bg-white/10 dark:text-slate-300"
                                                >
                                                    {rule}
                                                </span>
                                            ))}
                                            {rulesChecked.length > 6 && (
                                                <span className="rounded-lg bg-pastel-lavender px-2 py-0.5 text-[10.5px] font-bold text-brand-700 dark:bg-brand-500/20 dark:text-brand-200">
                                                    +{rulesChecked.length - 6} lainnya
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Filter Kategori */}
                            {categories.length > 0 && (
                                <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 pb-3 text-xs dark:border-white/10">
                                    <span className="mr-1 font-bold text-slate-500 dark:text-slate-400">
                                        Filter Kategori:
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => setSelectedCategory('all')}
                                        className={cn(
                                            'rounded-full px-3.5 py-1.5 text-[11px] font-bold transition-all',
                                            selectedCategory === 'all'
                                                ? 'bg-slate-900 text-white shadow-sm dark:bg-white dark:text-slate-900'
                                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-white/10 dark:text-slate-300 dark:hover:bg-white/15'
                                        )}
                                    >
                                        Semua ({allFindings.length})
                                    </button>
                                    {categories.map((cat) => (
                                        <button
                                            key={cat}
                                            type="button"
                                            onClick={() => setSelectedCategory(cat)}
                                            className={cn(
                                                'rounded-full px-3.5 py-1.5 text-[11px] font-bold capitalize transition-all',
                                                selectedCategory === cat
                                                    ? 'bg-slate-900 text-white shadow-sm dark:bg-white dark:text-slate-900'
                                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-white/10 dark:text-slate-300 dark:hover:bg-white/15'
                                            )}
                                        >
                                            {cat.replace(/_/g, ' ')}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Daftar Temuan Accordion */}
                            <div className="space-y-3">
                                {filteredFindings.length === 0 ? (
                                    <div className="flex flex-col items-center rounded-[22px] border border-mint/25 bg-pastel-mint/55 p-8 text-center dark:border-mint/20 dark:bg-mint/[0.08]">
                                        <IconTile tone="mint" size="md" className="mb-3">
                                            <CheckCircle2 className="h-5 w-5" />
                                        </IconTile>
                                        <p className="text-sm font-extrabold text-emerald-900 dark:text-emerald-200">
                                            Tidak Ditemukan Catatan Kepatuhan
                                        </p>
                                        <p className="mt-1 max-w-lg text-xs leading-relaxed text-emerald-800/80 dark:text-emerald-200/75">
                                            Seluruh catatan pembukuan pada {tabTitle} periode {periodeLabel} telah tertib dan sesuai standar regulasi.
                                        </p>
                                    </div>
                                ) : (
                                    filteredFindings.map((finding) => {
                                        const isExpanded = expandedFinding === finding.id;
                                        const sevMeta = SEVERITY_META[finding.severity] || SEVERITY_META.info;

                                        return (
                                            <div
                                                key={finding.id}
                                                className={cn(
                                                    'overflow-hidden rounded-[20px] border bg-white shadow-sm transition-colors dark:bg-white/[0.03]',
                                                    sevMeta.cardBorder
                                                )}
                                            >
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setExpandedFinding(isExpanded ? null : finding.id)
                                                    }
                                                    className="flex w-full items-center justify-between gap-3 p-4 text-left transition-colors hover:bg-slate-50/80 dark:hover:bg-white/[0.04]"
                                                >
                                                    <div className="flex min-w-0 items-start gap-3">
                                                        <StatusBadge
                                                            tone={sevMeta.badgeTone}
                                                            className="mt-0.5 shrink-0"
                                                        >
                                                            {sevMeta.label}
                                                        </StatusBadge>
                                                        <div className="min-w-0">
                                                            <h6 className="text-xs font-bold text-slate-900 dark:text-white sm:text-sm">
                                                                {finding.title}
                                                            </h6>
                                                            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                                                                <span className="capitalize">
                                                                    Kategori: {finding.category.replace(/_/g, ' ')}
                                                                </span>
                                                                {finding.amount ? (
                                                                    <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-700 text-sikas-num dark:bg-white/10 dark:text-slate-200">
                                                                        <Coins className="h-3 w-3 text-amber-500" />
                                                                        Rp {finding.amount.toLocaleString('id-ID')}
                                                                    </span>
                                                                ) : null}
                                                                {finding.transaction_ref && (
                                                                    <span
                                                                        className="inline-flex max-w-md items-center gap-1 truncate rounded-lg border border-brand-200/70 bg-pastel-lavender/70 px-2 py-0.5 text-[11px] font-semibold text-brand-700 dark:border-brand-500/30 dark:bg-brand-500/15 dark:text-brand-200"
                                                                        title={finding.transaction_ref}
                                                                    >
                                                                        <FileText className="h-3 w-3 shrink-0" />
                                                                        <span className="truncate">
                                                                            {finding.transaction_ref}
                                                                        </span>
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    {isExpanded ? (
                                                        <ChevronUp className="h-5 w-5 shrink-0 text-slate-400" />
                                                    ) : (
                                                        <ChevronDown className="h-5 w-5 shrink-0 text-slate-400" />
                                                    )}
                                                </button>

                                                {isExpanded && (
                                                    <div className="space-y-3 border-t border-slate-100 bg-slate-50/70 px-4 pb-4 pt-3 text-xs dark:border-white/10 dark:bg-white/[0.02]">
                                                        {finding.transaction_ref && (
                                                            <div className="rounded-2xl border border-brand-200/80 bg-pastel-lavender/60 p-3 dark:border-brand-500/25 dark:bg-brand-500/10">
                                                                <span className="mb-1 flex items-center gap-1.5 font-bold text-brand-800 dark:text-brand-200">
                                                                    <FileText className="h-3.5 w-3.5" />
                                                                    Rujukan Transaksi / Rekening / Kegiatan:
                                                                </span>
                                                                <p className="font-medium text-brand-900 dark:text-brand-100">
                                                                    {finding.transaction_ref}
                                                                </p>
                                                            </div>
                                                        )}

                                                        <div>
                                                            <span className="font-bold text-slate-800 dark:text-slate-200">
                                                                Uraian Fakta Kasus:
                                                            </span>
                                                            <p className="mt-1 leading-relaxed text-slate-600 dark:text-slate-300">
                                                                {finding.description}
                                                            </p>
                                                        </div>

                                                        <div className="rounded-2xl border border-slate-200/80 bg-white p-3.5 dark:border-white/10 dark:bg-[#15131F]">
                                                            <span className="mb-1 flex items-center gap-1.5 font-bold text-emerald-700 dark:text-emerald-300">
                                                                <CheckCircle2 className="h-3.5 w-3.5" />
                                                                Saran Rekomendasi Tindak Lanjut:
                                                            </span>
                                                            <p className="leading-relaxed text-slate-700 dark:text-slate-300">
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
                <div className="relative flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-6 py-4 dark:border-white/10">
                    <div>
                        {auditData && !loading && (
                            <SecondaryButton
                                type="button"
                                onClick={() => handleRunAudit(true)}
                                disabled={loading}
                            >
                                <RotateCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
                                Audit Ulang (Paksa Cek Baru)
                            </SecondaryButton>
                        )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                        {auditData && (
                            <button
                                type="button"
                                onClick={handleDownloadPdf}
                                className="inline-flex items-center gap-2 rounded-2xl border border-brand-200 bg-pastel-lavender/80 px-4 py-2.5 text-[11.5px] font-extrabold text-brand-700 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-pastel-lavender dark:border-brand-500/30 dark:bg-brand-500/15 dark:text-brand-200 dark:hover:bg-brand-500/25"
                            >
                                <FileText className="h-4 w-4" />
                                Unduh Lembar Kerja Audit (PDF)
                            </button>
                        )}

                        <SecondaryButton type="button" onClick={onClose}>
                            Tutup
                        </SecondaryButton>
                    </div>
                </div>
            </div>
        </Modal>
    );
}
