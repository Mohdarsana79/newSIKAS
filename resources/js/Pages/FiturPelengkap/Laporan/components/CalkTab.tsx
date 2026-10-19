import React, { useState, useEffect } from 'react';
import useVariantRoute from '@/Hooks/useVariantRoute';
import axios from 'axios';
import {
    Brain,
    Sparkles,
    FileText,
    Printer,
    Copy,
    Check,
    Save,
    RotateCw,
    TrendingUp,
    Wallet,
    Landmark,
    AlertCircle,
    CheckCircle2,
    Calendar,
    Layers
} from 'lucide-react';

export default function CalkTab() {
    const vroute = useVariantRoute();
    const [tahun, setTahun] = useState<number>(2026);
    const [periode, setPeriode] = useState<'tahap_1' | 'tahap_2' | 'tahunan'>('tahunan');
    const [loading, setLoading] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [saving, setSaving] = useState(false);
    const [copied, setCopied] = useState(false);
    const [activeChapter, setActiveChapter] = useState<number>(1);

    const [metrics, setMetrics] = useState<any>(null);
    const [report, setReport] = useState<any>(null);

    // Form inputs untuk setiap bab narasi
    const [bab1, setBab1] = useState('');
    const [bab2, setBab2] = useState('');
    const [bab3, setBab3] = useState('');
    const [bab4, setBab4] = useState('');
    const [bab5, setBab5] = useState('');
    const [alertMsg, setAlertMsg] = useState<{ type: 'success' | 'error' | 'warning'; text: string } | null>(null);

    const loadData = async () => {
        setLoading(true);
        setAlertMsg(null);
        try {
            const res = await axios.get(vroute('laporan.calk.data'), {
                params: { tahun, periode }
            });

            if (res.data.status === 'success') {
                const data = res.data.data;
                setMetrics(data.metrics);
                setReport(data.report);

                if (data.report) {
                    setBab1(data.report.bab_1_pendahuluan || '');
                    setBab2(data.report.bab_2_kebijakan_akuntansi || '');
                    setBab3(data.report.bab_3_analisis_realisasi || '');
                    setBab4(data.report.bab_4_penjelasan_pos_keuangan || '');
                    setBab5(data.report.bab_5_penutup || '');
                } else {
                    setBab1('');
                    setBab2('');
                    setBab3('');
                    setBab4('');
                    setBab5('');
                }
            }
        } catch (err: any) {
            console.error('Error loading CaLK data:', err);
            setAlertMsg({ type: 'error', text: 'Gagal memuat data keuangan CaLK.' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [tahun, periode]);

    const handleGenerateAi = async () => {
        setGenerating(true);
        setAlertMsg(null);
        try {
            const res = await axios.post(vroute('laporan.calk.generate'), {
                tahun,
                periode
            });

            if (res.data.status === 'success') {
                const data = res.data.data;
                setMetrics(data.metrics);
                setReport(data.report);

                setBab1(data.report.bab_1_pendahuluan || '');
                setBab2(data.report.bab_2_kebijakan_akuntansi || '');
                setBab3(data.report.bab_3_analisis_realisasi || '');
                setBab4(data.report.bab_4_penjelasan_pos_keuangan || '');
                setBab5(data.report.bab_5_penutup || '');

                setAlertMsg({
                    type: data.warning ? 'warning' : 'success',
                    text: data.warning || 'Narasi CaLK berhasil disusun oleh DeepSeek AI!'
                });
            } else {
                setAlertMsg({ type: 'error', text: res.data.message || 'Gagal menyusun narasi CaLK.' });
            }
        } catch (err: any) {
            console.error('Error generating CaLK narrative:', err);
            setAlertMsg({
                type: 'error',
                text: err.response?.data?.message || 'Terjadi kesalahan saat memanggil DeepSeek AI.'
            });
        } finally {
            setGenerating(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        setAlertMsg(null);
        try {
            const res = await axios.post(vroute('laporan.calk.save'), {
                tahun,
                periode,
                bab_1_pendahuluan: bab1,
                bab_2_kebijakan_akuntansi: bab2,
                bab_3_analisis_realisasi: bab3,
                bab_4_penjelasan_pos_keuangan: bab4,
                bab_5_penutup: bab5
            });

            if (res.data.status === 'success') {
                setReport(res.data.data.report);
                setAlertMsg({ type: 'success', text: 'Perubahan dokumen CaLK berhasil disimpan!' });
            }
        } catch (err: any) {
            console.error('Error saving CaLK:', err);
            setAlertMsg({ type: 'error', text: 'Gagal menyimpan perubahan dokumen.' });
        } finally {
            setSaving(false);
        }
    };

    const copyAllToClipboard = () => {
        const fullDoc = `=== CATATAN ATAS LAPORAN KEUANGAN (CaLK) DANA BOSP ===
Satuan Pendidikan: ${metrics?.sekolah?.nama || ''} (NPSN: ${metrics?.sekolah?.npsn || ''})
Tahun Anggaran: ${tahun} | Periode: ${metrics?.periode_label || ''}

BAB I: PENDAHULUAN
${bab1}

BAB II: KEBIJAKAN AKUNTANSI
${bab2}

BAB III: ANALISIS REALISASI ANGGARAN & CAPAIAN TARGET
${bab3}

BAB IV: PENJELASAN POS-POS LAPORAN KEUANGAN
${bab4}

BAB V: PENUTUP & KESIMPULAN
${bab5}

Kepala Satuan Pendidikan: ${metrics?.sekolah?.kepala_sekolah || ''}
Bendahara BOSP: ${metrics?.sekolah?.bendahara || ''}`;

        navigator.clipboard.writeText(fullDoc);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
    };

    const handlePrintPdf = () => {
        if (!report?.id) {
            alert('Silakan susun narasi dan simpan dokumen terlebih dahulu sebelum mencetak PDF.');
            return;
        }
        window.open(vroute('laporan.calk.export-pdf', report.id), '_blank');
    };

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(val || 0);
    };

    const fin = metrics?.finansial || {};

    return (
        <div className="space-y-6">
            {/* Filter Periode & Tahun */}
            <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-200/80 dark:border-gray-700 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-700 dark:text-gray-300">Tahun:</span>
                        <select
                            value={tahun}
                            onChange={(e) => setTahun(parseInt(e.target.value, 10))}
                            className="text-xs font-semibold rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 text-gray-800 dark:text-gray-200 py-1.5 px-3 focus:ring-indigo-500"
                        >
                            <option value={2026}>Tahun 2026</option>
                            <option value={2025}>Tahun 2025</option>
                            <option value={2024}>Tahun 2024</option>
                        </select>
                    </div>

                    <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-750 p-1 rounded-xl">
                        <button
                            type="button"
                            onClick={() => setPeriode('tahap_1')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                                periode === 'tahap_1'
                                    ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-300 shadow-sm'
                                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
                            }`}
                        >
                            Tahap 1 (Jan–Jun)
                        </button>
                        <button
                            type="button"
                            onClick={() => setPeriode('tahap_2')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                                periode === 'tahap_2'
                                    ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-300 shadow-sm'
                                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
                            }`}
                        >
                            Tahap 2 (Jul–Des)
                        </button>
                        <button
                            type="button"
                            onClick={() => setPeriode('tahunan')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                                periode === 'tahunan'
                                    ? 'bg-indigo-600 text-white shadow-sm'
                                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
                            }`}
                        >
                            1 Tahun Penuh (Jan–Des)
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={loadData}
                        disabled={loading}
                        className="p-2 text-gray-500 hover:text-indigo-600 dark:text-gray-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                        title="Segarkan Data"
                    >
                        <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
                    </button>
                    <span className="text-xs text-gray-400">
                        {report ? (
                            <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Tersimpan ({new Date(report.updated_at).toLocaleDateString('id-ID')})
                            </span>
                        ) : (
                            <span className="text-amber-600 font-medium">Belum Dibuat</span>
                        )}
                    </span>
                </div>
            </div>

            {/* Alert Banner */}
            {alertMsg && (
                <div
                    className={`p-3.5 rounded-xl border text-xs font-medium flex items-center justify-between ${
                        alertMsg.type === 'success'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                            : alertMsg.type === 'warning'
                            ? 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
                            : 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
                    }`}
                >
                    <div className="flex items-center gap-2">
                        {alertMsg.type === 'success' ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        ) : (
                            <AlertCircle className="w-4 h-4 text-amber-600" />
                        )}
                        <span>{alertMsg.text}</span>
                    </div>
                    <button onClick={() => setAlertMsg(null)} className="text-gray-400 hover:text-gray-600">
                        &times;
                    </button>
                </div>
            )}

            {/* KPI Cards Ringkasan Finansial */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200/80 dark:border-gray-700 shadow-sm">
                    <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                        Pagu Anggaran BOSP
                    </span>
                    <div className="text-lg font-black text-gray-900 dark:text-gray-100 mt-1">
                        {formatCurrency(fin.pagu_anggaran || 0)}
                    </div>
                    <div className="text-[11px] text-gray-400 mt-0.5">
                        Transfer Masuk: {formatCurrency(fin.total_penerimaan || 0)}
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200/80 dark:border-gray-700 shadow-sm">
                    <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                        Realisasi Belanja Kas
                    </span>
                    <div className="text-lg font-black text-purple-700 dark:text-purple-300 mt-1">
                        {formatCurrency(fin.total_belanja || 0)}
                    </div>
                    <div className="mt-1 flex items-center justify-between text-[11px]">
                        <span className="text-purple-600 dark:text-purple-400 font-semibold">
                            Serapan: {fin.persentase_serapan || 0}%
                        </span>
                        <div className="w-20 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
                            <div
                                className="bg-purple-600 h-1.5 rounded-full"
                                style={{ width: `${Math.min(100, fin.persentase_serapan || 0)}%` }}
                            ></div>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200/80 dark:border-gray-700 shadow-sm">
                    <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                        Belanja Modal (Aset)
                    </span>
                    <div className="text-lg font-black text-indigo-700 dark:text-indigo-300 mt-1">
                        {formatCurrency(fin.belanja_modal || 0)}
                    </div>
                    <div className="text-[11px] text-gray-400 mt-0.5">
                        Operasi: {formatCurrency(fin.belanja_barang_jasa || 0)}
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200/80 dark:border-gray-700 shadow-sm">
                    <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                        Sisa Saldo Kas Akhir
                    </span>
                    <div className="text-lg font-black text-emerald-700 dark:text-emerald-300 mt-1">
                        {formatCurrency(fin.saldo_kas_total || 0)}
                    </div>
                    <div className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5">
                        Bank: {formatCurrency(fin.saldo_kas_bank || 0)} • Tunai: {formatCurrency(fin.saldo_kas_tunai || 0)}
                    </div>
                </div>
            </div>

            {/* Toolbar Utama Aksi */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-indigo-50 to-white dark:from-gray-800 dark:to-gray-850 p-4 rounded-2xl border border-indigo-100 dark:border-gray-700 shadow-sm">
                <div className="flex flex-wrap items-center gap-2">
                    <button
                        type="button"
                        onClick={handleGenerateAi}
                        disabled={generating || loading}
                        className="px-4 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white shadow-md shadow-indigo-500/20 transition flex items-center gap-2 disabled:opacity-50"
                    >
                        {generating ? (
                            <>
                                <RotateCw className="w-4 h-4 animate-spin" />
                                Menyusun Narasi CaLK (DeepSeek AI)...
                            </>
                        ) : (
                            <>
                                <Sparkles className="w-4 h-4 text-amber-300" />
                                Susun Narasi dengan DeepSeek AI
                            </>
                        )}
                    </button>

                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={saving || generating}
                        className="px-4 py-2.5 rounded-xl text-xs font-bold bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 transition flex items-center gap-1.5 shadow-sm"
                    >
                        <Save className="w-4 h-4 text-emerald-600" />
                        {saving ? 'Menyimpan...' : 'Simpan Suntingan'}
                    </button>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={copyAllToClipboard}
                        className="px-3.5 py-2.5 rounded-xl text-xs font-semibold text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 transition flex items-center gap-1.5 shadow-sm"
                    >
                        {copied ? (
                            <>
                                <Check className="w-4 h-4 text-emerald-600" />
                                Tersalin ke Clipboard!
                            </>
                        ) : (
                            <>
                                <Copy className="w-4 h-4" />
                                Salin ke Word
                            </>
                        )}
                    </button>

                    <button
                        type="button"
                        onClick={handlePrintPdf}
                        disabled={!report?.id}
                        className="px-4 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        <Printer className="w-4 h-4" />
                        Cetak PDF Resmi
                    </button>
                </div>
            </div>

            {/* Editor Naskah CaLK Per-Bab */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/80 dark:border-gray-700 shadow-sm overflow-hidden">
                {/* Header Bab Navigation */}
                <div className="flex border-b border-gray-200 dark:border-gray-700 overflow-x-auto bg-gray-50/60 dark:bg-gray-850">
                    {[
                        { id: 1, title: 'Bab I: Pendahuluan' },
                        { id: 2, title: 'Bab II: Kebijakan Akuntansi' },
                        { id: 3, title: 'Bab III: Analisis Realisasi' },
                        { id: 4, title: 'Bab IV: Rincian Pos Keuangan' },
                        { id: 5, title: 'Bab V: Penutup' }
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => setActiveChapter(tab.id)}
                            className={`px-4 py-3 text-xs font-bold whitespace-nowrap transition border-b-2 flex items-center gap-1.5 ${
                                activeChapter === tab.id
                                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-white dark:bg-gray-800'
                                    : 'border-transparent text-gray-500 hover:text-gray-800 dark:text-gray-400'
                            }`}
                        >
                            <span className="w-4 h-4 rounded-full bg-gray-200 dark:bg-gray-700 text-[10px] flex items-center justify-center font-bold">
                                {tab.id}
                            </span>
                            {tab.title}
                        </button>
                    ))}
                </div>

                {/* Textarea Editor Area */}
                <div className="p-6">
                    {activeChapter === 1 && (
                        <div>
                            <div className="mb-2 flex items-center justify-between">
                                <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                                    Naskah Bab I: Latar Belakang, Maksud, Tujuan, Landasan Hukum, & Profil Sekolah
                                </label>
                                <span className="text-[11px] text-gray-400">
                                    {bab1.length.toLocaleString('id-ID')} karakter
                                </span>
                            </div>
                            <textarea
                                value={bab1}
                                onChange={(e) => setBab1(e.target.value)}
                                rows={14}
                                placeholder="Klik 'Susun Narasi dengan DeepSeek AI' untuk menghasilkan draf Bab I..."
                                className="w-full text-xs font-mono leading-relaxed rounded-xl border-gray-300 dark:border-gray-600 dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-4 focus:ring-indigo-500 focus:border-indigo-500"
                            />
                        </div>
                    )}

                    {activeChapter === 2 && (
                        <div>
                            <div className="mb-2 flex items-center justify-between">
                                <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                                    Naskah Bab II: Kebijakan Akuntansi, Asas Pengelolaan, & Basis Kas Menuju Akrual
                                </label>
                                <span className="text-[11px] text-gray-400">
                                    {bab2.length.toLocaleString('id-ID')} karakter
                                </span>
                            </div>
                            <textarea
                                value={bab2}
                                onChange={(e) => setBab2(e.target.value)}
                                rows={14}
                                placeholder="Klik 'Susun Narasi dengan DeepSeek AI' untuk menghasilkan draf Bab II..."
                                className="w-full text-xs font-mono leading-relaxed rounded-xl border-gray-300 dark:border-gray-600 dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-4 focus:ring-indigo-500 focus:border-indigo-500"
                            />
                        </div>
                    )}

                    {activeChapter === 3 && (
                        <div>
                            <div className="mb-2 flex items-center justify-between">
                                <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                                    Naskah Bab III: Analisis Perbandingan Target Pagu vs Realisasi Belanja & Serapan
                                </label>
                                <span className="text-[11px] text-gray-400">
                                    {bab3.length.toLocaleString('id-ID')} karakter
                                </span>
                            </div>
                            <textarea
                                value={bab3}
                                onChange={(e) => setBab3(e.target.value)}
                                rows={14}
                                placeholder="Klik 'Susun Narasi dengan DeepSeek AI' untuk menghasilkan draf Bab III..."
                                className="w-full text-xs font-mono leading-relaxed rounded-xl border-gray-300 dark:border-gray-600 dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-4 focus:ring-indigo-500 focus:border-indigo-500"
                            />
                        </div>
                    )}

                    {activeChapter === 4 && (
                        <div>
                            <div className="mb-2 flex items-center justify-between">
                                <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                                    Naskah Bab IV: Rincian Belanja Operasi, Modal, Perpajakan, & Posisi Kas Bank/Tunai
                                </label>
                                <span className="text-[11px] text-gray-400">
                                    {bab4.length.toLocaleString('id-ID')} karakter
                                </span>
                            </div>
                            <textarea
                                value={bab4}
                                onChange={(e) => setBab4(e.target.value)}
                                rows={14}
                                placeholder="Klik 'Susun Narasi dengan DeepSeek AI' untuk menghasilkan draf Bab IV..."
                                className="w-full text-xs font-mono leading-relaxed rounded-xl border-gray-300 dark:border-gray-600 dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-4 focus:ring-indigo-500 focus:border-indigo-500"
                            />
                        </div>
                    )}

                    {activeChapter === 5 && (
                        <div>
                            <div className="mb-2 flex items-center justify-between">
                                <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                                    Naskah Bab V: Capaian Kinerja Output, Kendala yang Dihadapi, & Kesimpulan
                                </label>
                                <span className="text-[11px] text-gray-400">
                                    {bab5.length.toLocaleString('id-ID')} karakter
                                </span>
                            </div>
                            <textarea
                                value={bab5}
                                onChange={(e) => setBab5(e.target.value)}
                                rows={14}
                                placeholder="Klik 'Susun Narasi dengan DeepSeek AI' untuk menghasilkan draf Bab V..."
                                className="w-full text-xs font-mono leading-relaxed rounded-xl border-gray-300 dark:border-gray-600 dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-4 focus:ring-indigo-500 focus:border-indigo-500"
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
