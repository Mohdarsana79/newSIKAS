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
    RotateCw,
    ShieldAlert,
    ShieldCheck,
    Copy,
    Check,
    Layers,
    Database,
    ArrowRight,
    HelpCircle,
    ExternalLink
} from 'lucide-react';
import { Link } from '@inertiajs/react';

export interface ArkasDiagnosticModalProps {
    isOpen: boolean;
    onClose: () => void;
    tahun?: number | string;
    scope?: 'comprehensive' | 'bku_month' | 'rkas';
    context?: {
        bulan?: string;
        bulan_angka?: number;
        penganggaran_id?: number | string;
        [key: string]: any;
    };
    onProceedWithAction?: () => void;
    actionButtonLabel?: string;
}

export default function ArkasDiagnosticModal({
    isOpen,
    onClose,
    tahun = 2026,
    scope = 'comprehensive',
    context = {},
    onProceedWithAction,
    actionButtonLabel
}: ArkasDiagnosticModalProps) {
    const vroute = useVariantRoute();
    const [loading, setLoading] = useState(false);
    const [diagnosticResult, setDiagnosticResult] = useState<any>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [checkedSteps, setCheckedSteps] = useState<Record<number, boolean>>({});
    const [copied, setCopied] = useState(false);
    const [activeTab, setActiveTab] = useState<'overview' | 'months' | 'checklist'>('overview');

    const runDiagnostic = async () => {
        setLoading(true);
        setErrorMessage(null);
        setCheckedSteps({});

        try {
            let res;
            if (scope === 'comprehensive') {
                res = await axios.post(vroute('arkas-tools.ai-diagnose'), {
                    tahun: tahun
                });
            } else {
                res = await axios.post(vroute('arkas-tools.ai-diagnose-context'), {
                    scope: scope,
                    tahun: tahun,
                    context: context
                });
            }

            if (res.data.status === 'success') {
                setDiagnosticResult(res.data.data);
            } else {
                setErrorMessage(res.data.message || 'Gagal memuat diagnosa ARKAS.');
            }
        } catch (err: any) {
            console.error('Error running ARKAS diagnostic:', err);
            const msg = err.response?.data?.message || err.message || 'Terjadi kesalahan jaringan saat diagnosa.';
            setErrorMessage(msg);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            runDiagnostic();
            setActiveTab('overview');
        }
    }, [isOpen, scope, context?.bulan, context?.bulan_angka, tahun]);

    if (!isOpen) return null;

    const toggleStep = (stepNumber: number) => {
        setCheckedSteps(prev => ({
            ...prev,
            [stepNumber]: !prev[stepNumber]
        }));
    };

    const copyChecklistToClipboard = () => {
        if (!diagnosticResult) return;
        const ai = diagnosticResult.ai_analysis || {};
        const headline = diagnosticResult.headline || '';
        const risks = (ai.overwrite_risks || []).join('\n- ');
        const causes = (ai.root_causes || []).join('\n- ');
        const steps = (ai.action_checklist || []).map((s: any) => `${s.step}. [${s.system}] ${s.action}`).join('\n');

        const text = `=== HASIL DIAGNOSA & REKONSILIASI ARKAS-SIKAS (AI) ===
Tahun: ${tahun} | Status: ${diagnosticResult.overall_status}
Diagnosa: ${headline}

RISIKO PENIMPAAN / TIMPA ULANG:
- ${risks || 'Tidak ada risiko kritis.'}

PENYEBAB SELISIH:
- ${causes || 'Data sinkron.'}

LANGKAH REMEDIASI BERTAHAP:
${steps || 'Tidak ada tindakan diperlukan.'}

Dibuat otomatis oleh SIKAS AI DeepSeek Suite`;

        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
    };

    const overallStatus = diagnosticResult?.overall_status || 'HEALTHY';
    const aiAnalysis = diagnosticResult?.ai_analysis || {};
    const diffSummary = diagnosticResult?.diff_summary?.full_diff || diagnosticResult?.diff_summary || {};
    const connectionHealth = diagnosticResult?.connection_health || {};
    const overwriteRisks = aiAnalysis?.overwrite_risks || [];
    const rootCauses = aiAnalysis?.root_causes || [];
    const actionChecklist = aiAnalysis?.action_checklist || [];
    const monthsList = diffSummary?.months || [];

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(val || 0);
    };

    return (
        <div className="fixed inset-0 z-[70] overflow-y-auto bg-gray-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-gray-100 dark:border-gray-700 animate-in fade-in zoom-in-95 duration-200">
                {/* Header Modal */}
                <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700/80 flex items-center justify-between bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-800/80">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-gradient-to-tr from-indigo-600 to-violet-500 rounded-xl text-white shadow-md shadow-indigo-500/20">
                            <Brain className="w-6 h-6" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                                    Asisten Diagnosa & Rekonsiliasi ARKAS
                                </h3>
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
                                    <Sparkles className="w-3 h-3 text-indigo-500" />
                                    DeepSeek-V3
                                </span>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                {scope === 'bku_month'
                                    ? `Diagnosa Selisih BKU Bulan ${context.bulan || ''} Tahun ${tahun}`
                                    : scope === 'rkas'
                                    ? `Audit Integritas Pagu & RKAS Tahun ${tahun}`
                                    : `Audit Menyeluruh Antar-Sistem`}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={runDiagnostic}
                            disabled={loading}
                            className="p-2 text-gray-500 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                            title="Pindai Ulang"
                        >
                            <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Body Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {loading ? (
                        <div className="py-20 flex flex-col items-center justify-center text-center">
                            <div className="relative">
                                <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center">
                                    <Brain className="w-7 h-7 text-indigo-600 dark:text-indigo-400 animate-pulse" />
                                </div>
                                <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 animate-ping"></div>
                            </div>
                            <h4 className="mt-4 text-base font-semibold text-gray-800 dark:text-gray-200">
                                Membaca Database ARKAS & Menghitung Diff...
                            </h4>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-sm">
                                Memeriksa dekripsi SQLCipher, validasi pagu RKAS, dan mensinkronisasikan ringkasan BKU 12 bulan dengan penalaran DeepSeek-V3.
                            </p>
                        </div>
                    ) : errorMessage ? (
                        <div className="p-5 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-800 dark:text-rose-200 flex items-start gap-3">
                            <AlertOctagon className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
                            <div className="space-y-1">
                                <h4 className="text-sm font-bold">Diagnosa Mengalami Kendala</h4>
                                <p className="text-xs">{errorMessage}</p>
                                <button
                                    onClick={runDiagnostic}
                                    className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-rose-700 hover:text-rose-900 underline"
                                >
                                    Coba Lagi
                                </button>
                            </div>
                        </div>
                    ) : diagnosticResult ? (
                        <>
                            {/* Status Card Banner */}
                            <div
                                className={`p-4 rounded-xl border flex items-start gap-3.5 ${
                                    overallStatus === 'HEALTHY'
                                        ? 'bg-emerald-50/80 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800'
                                        : overallStatus === 'WARNING_DIFFERENCE'
                                        ? 'bg-amber-50/80 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800'
                                        : overallStatus === 'BLOCKED_CONFLICT'
                                        ? 'bg-rose-50/80 border-rose-200 dark:bg-rose-950/30 dark:border-rose-800'
                                        : 'bg-red-50/80 border-red-200 dark:bg-red-950/30 dark:border-red-800'
                                }`}
                            >
                                <div className="mt-0.5 flex-shrink-0">
                                    {overallStatus === 'HEALTHY' ? (
                                        <div className="w-8 h-8 rounded-lg bg-emerald-500 text-white flex items-center justify-center">
                                            <ShieldCheck className="w-5 h-5" />
                                        </div>
                                    ) : overallStatus === 'WARNING_DIFFERENCE' ? (
                                        <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center">
                                            <AlertTriangle className="w-5 h-5" />
                                        </div>
                                    ) : (
                                        <div className="w-8 h-8 rounded-lg bg-rose-600 text-white flex items-center justify-center">
                                            <ShieldAlert className="w-5 h-5" />
                                        </div>
                                    )}
                                </div>

                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <span
                                            className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                                                overallStatus === 'HEALTHY'
                                                    ? 'bg-emerald-200/80 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300'
                                                    : overallStatus === 'WARNING_DIFFERENCE'
                                                    ? 'bg-amber-200/80 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300'
                                                    : 'bg-rose-200/80 text-rose-800 dark:bg-rose-900/60 dark:text-rose-300'
                                            }`}
                                        >
                                            {overallStatus === 'HEALTHY'
                                                ? 'SINKRON & AMAN'
                                                : overallStatus === 'WARNING_DIFFERENCE'
                                                ? 'PERLU PERHATIAN'
                                                : overallStatus === 'BLOCKED_CONFLICT'
                                                ? 'RISIKO PENIMPAAN DATA'
                                                : 'KONEKSI TERPUTUS'}
                                        </span>
                                        <span className="text-xs text-gray-500 dark:text-gray-400">
                                            {connectionHealth.db_path || 'arkas.db'}
                                        </span>
                                    </div>
                                    <h4 className="text-base font-bold text-gray-900 dark:text-gray-100 mt-1">
                                        {diagnosticResult.headline}
                                    </h4>
                                    {connectionHealth.notes && (
                                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                                            {connectionHealth.notes}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Peringatan Risiko Timpa Ulang (Jika Ada) */}
                            {overwriteRisks.length > 0 && (
                                <div className="p-4 bg-rose-50/90 dark:bg-rose-950/40 border-l-4 border-rose-500 rounded-r-xl space-y-2">
                                    <div className="flex items-center gap-2 text-rose-800 dark:text-rose-200 font-bold text-sm">
                                        <AlertOctagon className="w-4 h-4 text-rose-600" />
                                        Peringatan Risiko Timpa Ulang (Destructive Overwrite)
                                    </div>
                                    <ul className="list-disc list-inside space-y-1 text-xs text-rose-700 dark:text-rose-300 font-medium pl-1">
                                        {overwriteRisks.map((risk: string, idx: number) => (
                                            <li key={idx} className="leading-relaxed">
                                                {risk}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {/* Navigasi Tab Internal */}
                            <div className="flex items-center gap-2 border-b border-gray-100 dark:border-gray-700/80 pb-2">
                                <button
                                    onClick={() => setActiveTab('overview')}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                                        activeTab === 'overview'
                                            ? 'bg-indigo-600 text-white shadow-sm'
                                            : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                    }`}
                                >
                                    Ringkasan Komparasi
                                </button>
                                {monthsList.length > 0 && (
                                    <button
                                        onClick={() => setActiveTab('months')}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                                            activeTab === 'months'
                                                ? 'bg-indigo-600 text-white shadow-sm'
                                                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                        }`}
                                    >
                                        Perbandingan 12 Bulan
                                        {diffSummary?.bku?.differing_months_count > 0 && (
                                            <span className="w-4 h-4 rounded-full bg-amber-500 text-white text-[9px] flex items-center justify-center font-bold">
                                                {diffSummary.bku.differing_months_count}
                                            </span>
                                        )}
                                    </button>
                                )}
                                <button
                                    onClick={() => setActiveTab('checklist')}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                                        activeTab === 'checklist'
                                            ? 'bg-indigo-600 text-white shadow-sm'
                                            : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                    }`}
                                >
                                    Langkah Remediasi
                                    <span className="px-1.5 py-0.2 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-[10px]">
                                        {actionChecklist.length}
                                    </span>
                                </button>
                            </div>

                            {/* Konten Tab 1: Ringkasan Komparasi */}
                            {activeTab === 'overview' && (
                                <div className="space-y-4">
                                    {/* Matrix Komparasi Metrics */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                        {/* Pagu RKAS */}
                                        <div className="bg-gray-50/80 dark:bg-gray-900/30 p-3.5 rounded-xl border border-gray-200/80 dark:border-gray-700">
                                            <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                                                Pagu RKAS Murni
                                            </span>
                                            <div className="mt-1 flex items-baseline justify-between">
                                                <div className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                                    ARKAS: {formatCurrency(diffSummary?.rkas?.arkas_pagu || 0)}
                                                </div>
                                            </div>
                                            <div className="text-xs text-gray-500 mt-0.5">
                                                SIKAS: {formatCurrency(diffSummary?.rkas?.sikas_pagu || 0)}
                                            </div>
                                            <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700/60 flex items-center justify-between text-xs">
                                                <span className="text-gray-500">Selisih Pagu:</span>
                                                <span
                                                    className={`font-bold ${
                                                        Math.abs(diffSummary?.rkas?.diff || 0) > 1
                                                            ? 'text-rose-600'
                                                            : 'text-emerald-600'
                                                    }`}
                                                >
                                                    {formatCurrency(diffSummary?.rkas?.diff || 0)}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Total Belanja BKU */}
                                        <div className="bg-gray-50/80 dark:bg-gray-900/30 p-3.5 rounded-xl border border-gray-200/80 dark:border-gray-700">
                                            <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                                                Realisasi Belanja Kas
                                            </span>
                                            <div className="mt-1 text-sm font-bold text-purple-700 dark:text-purple-300">
                                                ARKAS: {formatCurrency(diffSummary?.bku?.total_arkas_belanja || 0)}
                                            </div>
                                            <div className="text-xs text-gray-500 mt-0.5">
                                                SIKAS: {formatCurrency(diffSummary?.bku?.total_sikas_belanja || 0)}
                                            </div>
                                            <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700/60 flex items-center justify-between text-xs">
                                                <span className="text-gray-500">Selisih Belanja:</span>
                                                <span
                                                    className={`font-bold ${
                                                        Math.abs(diffSummary?.bku?.total_belanja_diff || 0) > 1
                                                            ? 'text-amber-600'
                                                            : 'text-emerald-600'
                                                    }`}
                                                >
                                                    {formatCurrency(diffSummary?.bku?.total_belanja_diff || 0)}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Katalog Barang Ref */}
                                        <div className="bg-gray-50/80 dark:bg-gray-900/30 p-3.5 rounded-xl border border-gray-200/80 dark:border-gray-700">
                                            <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                                                Katalog Barang & SSH
                                            </span>
                                            <div className="mt-1 text-sm font-bold text-indigo-700 dark:text-indigo-300">
                                                ARKAS: {(diffSummary?.ref_barang?.arkas_count || 0).toLocaleString()} item
                                            </div>
                                            <div className="text-xs text-gray-500 mt-0.5">
                                                SIKAS: {(diffSummary?.ref_barang?.sikas_count || 0).toLocaleString()} item
                                            </div>
                                            <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700/60 flex items-center justify-between text-xs">
                                                <span className="text-gray-500">Belum Tersinkron:</span>
                                                <span
                                                    className={`font-bold ${
                                                        (diffSummary?.ref_barang?.diff || 0) > 0
                                                            ? 'text-indigo-600'
                                                            : 'text-emerald-600'
                                                    }`}
                                                >
                                                    {(diffSummary?.ref_barang?.diff || 0).toLocaleString()} item
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Analisis Akar Masalah (Root Causes) */}
                                    {rootCauses.length > 0 && (
                                        <div className="bg-white dark:bg-gray-850 p-4 rounded-xl border border-gray-200/80 dark:border-gray-700/80 shadow-sm space-y-2">
                                            <div className="flex items-center gap-2 text-gray-800 dark:text-gray-200 font-bold text-sm">
                                                <HelpCircle className="w-4 h-4 text-indigo-600" />
                                                Penyebab Selisih & Diagnosa AI
                                            </div>
                                            <div className="space-y-1.5 pt-1">
                                                {rootCauses.map((cause: string, i: number) => (
                                                    <div
                                                        key={i}
                                                        className="flex items-start gap-2.5 text-xs text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-900/40 p-2.5 rounded-lg border border-gray-100 dark:border-gray-800"
                                                    >
                                                        <span className="w-4 h-4 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">
                                                            {i + 1}
                                                        </span>
                                                        <span className="leading-relaxed">{cause}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Konten Tab 2: Perbandingan 12 Bulan */}
                            {activeTab === 'months' && (
                                <div className="space-y-3">
                                    <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
                                        <table className="w-full text-left text-xs">
                                            <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 font-semibold uppercase tracking-wider">
                                                <tr>
                                                    <th className="py-2.5 px-3">Bulan</th>
                                                    <th className="py-2.5 px-3">Status ARKAS</th>
                                                    <th className="py-2.5 px-3 text-right">Belanja ARKAS</th>
                                                    <th className="py-2.5 px-3 text-right">Belanja SIKAS</th>
                                                    <th className="py-2.5 px-3 text-right">Selisih</th>
                                                    <th className="py-2.5 px-3 text-center">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                                {monthsList.map((m: any) => {
                                                    const isSelectedMonth =
                                                        scope === 'bku_month' && context.bulan_angka === m.bulan;
                                                    const diffNom = m.diff?.belanja_nominal || 0;
                                                    const hasDiff = m.diff?.has_difference;

                                                    return (
                                                        <tr
                                                            key={m.bulan}
                                                            className={`transition hover:bg-gray-50/80 dark:hover:bg-gray-750 ${
                                                                isSelectedMonth
                                                                    ? 'bg-indigo-50/60 dark:bg-indigo-950/30 font-medium'
                                                                    : ''
                                                            }`}
                                                        >
                                                            <td className="py-2.5 px-3 font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
                                                                {m.nama_bulan}
                                                                {isSelectedMonth && (
                                                                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-600 text-white font-bold">
                                                                        Dipilih
                                                                    </span>
                                                                )}
                                                            </td>
                                                            <td className="py-2.5 px-3">
                                                                {m.arkas.is_closed ? (
                                                                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                                                                        <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                                                                        Tutup Buku
                                                                    </span>
                                                                ) : m.arkas.belanja_count > 0 ? (
                                                                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                                                                        <AlertTriangle className="w-3 h-3 text-amber-500" />
                                                                        Draft
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-gray-400 text-[11px]">
                                                                        Kosong
                                                                    </span>
                                                                )}
                                                            </td>
                                                            <td className="py-2.5 px-3 text-right font-medium text-purple-700 dark:text-purple-300">
                                                                {formatCurrency(m.arkas.belanja_nominal)}
                                                                <span className="text-[10px] text-gray-400 block font-normal">
                                                                    {m.arkas.belanja_count} nota
                                                                </span>
                                                            </td>
                                                            <td className="py-2.5 px-3 text-right font-medium text-gray-700 dark:text-gray-300">
                                                                {formatCurrency(m.sikas.belanja_nominal)}
                                                                <span className="text-[10px] text-gray-400 block font-normal">
                                                                    {m.sikas.belanja_count} transaksi
                                                                </span>
                                                            </td>
                                                            <td
                                                                className={`py-2.5 px-3 text-right font-bold ${
                                                                    Math.abs(diffNom) > 1
                                                                        ? 'text-amber-600 dark:text-amber-400'
                                                                        : 'text-gray-400'
                                                                }`}
                                                            >
                                                                {formatCurrency(diffNom)}
                                                            </td>
                                                            <td className="py-2.5 px-3 text-center">
                                                                {m.overwrite_risk ? (
                                                                    <span
                                                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300"
                                                                        title={m.overwrite_description}
                                                                    >
                                                                        Risiko Timpa
                                                                    </span>
                                                                ) : hasDiff ? (
                                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
                                                                        Selisih
                                                                    </span>
                                                                ) : (
                                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                                                                        Cocok
                                                                    </span>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* Konten Tab 3: Checklist Langkah Solusi Remediasi */}
                            {activeTab === 'checklist' && (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="text-xs text-gray-500">
                                            Centang langkah yang telah Anda selesaikan untuk memantau progres rekonsiliasi.
                                        </div>
                                        <button
                                            onClick={copyChecklistToClipboard}
                                            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg transition border border-indigo-200 dark:border-indigo-800"
                                        >
                                            {copied ? (
                                                <>
                                                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                                                    Tersalin!
                                                </>
                                            ) : (
                                                <>
                                                    <Copy className="w-3.5 h-3.5" />
                                                    Salin Rekomendasi
                                                </>
                                            )}
                                        </button>
                                    </div>

                                    <div className="space-y-2">
                                        {actionChecklist.map((stepItem: any, idx: number) => {
                                            const isDone = !!checkedSteps[stepItem.step];
                                            const isArkas = stepItem.system === 'ARKAS';
                                            const isSikas = stepItem.system === 'SIKAS';

                                            return (
                                                <div
                                                    key={idx}
                                                    onClick={() => toggleStep(stepItem.step)}
                                                    className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition ${
                                                        isDone
                                                            ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60 opacity-80'
                                                            : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-700'
                                                    }`}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={isDone}
                                                        onChange={() => {}} // handled by parent onClick
                                                        className="mt-1 w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500 pointer-events-none"
                                                    />
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs font-bold text-gray-400">
                                                                Langkah {stepItem.step}
                                                            </span>
                                                            <span
                                                                className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                                                                    isArkas
                                                                        ? 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300'
                                                                        : isSikas
                                                                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                                                                        : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                                                                }`}
                                                            >
                                                                {stepItem.system}
                                                            </span>
                                                        </div>
                                                        <p
                                                            className={`text-xs font-medium mt-1 leading-relaxed ${
                                                                isDone
                                                                    ? 'line-through text-gray-400'
                                                                    : 'text-gray-800 dark:text-gray-200'
                                                            }`}
                                                        >
                                                            {stepItem.action}
                                                        </p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </>
                    ) : null}
                </div>

                {/* Footer Modal */}
                <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between bg-gray-50/50 dark:bg-gray-800/50">
                    <div className="flex items-center gap-2">
                        {scope !== 'comprehensive' && (
                            <Link
                                href={vroute('arkas-tools.index')}
                                className="inline-flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 font-semibold"
                            >
                                <Database className="w-3.5 h-3.5" />
                                Buka Pusat Arkas Tools
                                <ExternalLink className="w-3 h-3" />
                            </Link>
                        )}
                    </div>
                    <div className="flex items-center gap-2.5">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-xs font-semibold text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition"
                        >
                            Tutup
                        </button>
                        {onProceedWithAction && (
                            <button
                                onClick={() => {
                                    onClose();
                                    onProceedWithAction();
                                }}
                                className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition flex items-center gap-1.5"
                            >
                                {actionButtonLabel || 'Lanjutkan Tindakan'}
                                <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
