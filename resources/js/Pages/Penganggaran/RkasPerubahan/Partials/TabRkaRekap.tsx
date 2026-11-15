import React, { Fragment } from 'react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';


interface TabRkaRekapProps {
    anggaran: any;
    rekapData: any;
    perTahapData: any;
    onPrint: (target: string) => void;
}

export default function TabRkaRekap({ anggaran, rekapData, perTahapData, onPrint }: TabRkaRekapProps) {
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('id-ID').format(amount);
    };

    const formatDateSafe = (dateStr: string | undefined, formatStr: string = 'dd/MM/yyyy') => {
        if (!dateStr) return '-';
        try {
            const datePart = dateStr.split(/[ T]/)[0];
            const [y, m, d] = datePart.split('-').map(Number);
            if (y && m && d) {
                return format(new Date(y, m - 1, d), formatStr, { locale: id });
            }
            return '-';
        } catch (e) {
            return '-';
        }
    };

    return (
        <div className="space-y-4 animate-rise">
            <div className="flex flex-wrap items-center justify-end gap-2">
                <button
                    onClick={() => onPrint('rekap')}
                    className="inline-flex items-center gap-2 rounded-2xl bg-lime-400 px-4 py-2.5 text-[11.5px] font-extrabold text-slate-950 shadow-lime transition-all duration-200 hover:-translate-y-0.5 hover:bg-lime-300">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                    </svg>
                    Cetak RKA Rekap
                </button>
            </div>

            <div className="sikas-card p-6 sm:p-8">
                {/* Report Header */}
                <div className="text-center mb-8 font-bold text-slate-900 dark:text-slate-100 uppercase">
                    <h2 className="text-lg">LEMBAR KERTAS KERJA</h2>
                    <h3 className="text-md">TAHUN ANGGARAN {anggaran.tahun_anggaran}</h3>
                </div>

                <div className="mb-6 text-sm font-bold text-slate-900 dark:text-slate-100 uppercase">
                    <table className="w-full">
                        <tbody>
                            <tr>
                                <td className="w-48 py-1">Urusan Pemerintahan</td>
                                <td className="w-4 py-1">:</td>
                                <td className="py-1">1.01 - PENDIDIKAN</td>
                            </tr>
                            <tr>
                                <td className="py-1">Organisasi</td>
                                <td className="py-1">:</td>
                                <td className="py-1">{anggaran.sekolah?.nama_sekolah}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* A. PENERIMAAN */}
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase mb-2">A. PENERIMAAN</h3>
                <div className="mb-1 text-sm font-bold text-slate-900 dark:text-slate-100">Sumber Dana :</div>
                <div className="border border-slate-300 dark:border-white/20 mb-6">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 dark:bg-white/[0.04] divide-x divide-slate-300 dark:divide-white/20 border-b border-slate-300 dark:border-white/20">
                            <tr>
                                <th className="px-3 py-2 text-center w-32 font-bold text-slate-900 dark:text-slate-100">No Kode</th>
                                <th className="px-3 py-2 text-center font-bold text-slate-900 dark:text-slate-100">Penerimaan</th>
                                <th className="px-3 py-2 text-center font-bold text-slate-900 dark:text-slate-100 w-48">Jumlah (Rp)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-300 dark:divide-white/20">
                            <tr className="divide-x divide-slate-300 dark:divide-white/20">
                                <td className="px-3 py-2 align-top text-slate-900 dark:text-slate-100">4.3.1.01.</td>
                                <td className="px-3 py-2 align-top text-slate-900 dark:text-slate-100">{anggaran.sumber_dana || 'BOS Reguler'}</td>
                                <td className="px-3 py-2 text-right align-top text-sikas-num text-slate-900 dark:text-slate-100">{formatCurrency(anggaran.pagu_anggaran)}</td>
                            </tr>
                            <tr className="font-bold border-t-2 border-slate-400 dark:border-white/25 divide-x divide-slate-300 dark:divide-white/20">
                                <td className="px-3 py-2 text-slate-900 dark:text-slate-100">Total Penerimaan</td>
                                <td className="px-3 py-2 text-slate-900 dark:text-slate-100"></td>
                                <td className="px-3 py-2 text-right text-sikas-num text-slate-900 dark:text-slate-100">{formatCurrency(anggaran.pagu_anggaran)}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* B. REKAPITULASI */}
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase mb-2">B. REKAPITULASI ANGGARAN</h3>
                <div className="border border-slate-300 dark:border-white/20 mb-6 text-sm">
                    <table className="w-full">
                        <thead className="bg-slate-50 dark:bg-white/[0.04] border-b border-slate-300 dark:border-white/20 divide-x divide-slate-300 dark:divide-white/20">
                            <tr>
                                <th className="px-3 py-2 text-center text-slate-900 dark:text-slate-100 w-32 font-bold">Kode Rekening</th>
                                <th className="px-3 py-2 text-center text-slate-900 dark:text-slate-100 font-bold">Uraian</th>
                                <th className="px-3 py-2 text-center text-slate-900 dark:text-slate-100 w-48 font-bold">Jumlah (Rp)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-300 dark:divide-white/20">
                            {rekapData && rekapData.map((item: any, idx: number) => (
                                <tr key={idx} className={`divide-x divide-slate-300 dark:divide-white/20 ${item.kode_rekening.length <= 1 || item.uraian.includes('JUMLAH') || item.uraian.includes('DEFISIT') ? 'font-bold' : ''}`}>
                                    <td className="px-3 py-2 text-slate-900 dark:text-slate-100">{item.kode_rekening}</td>
                                    <td className="px-3 py-2 text-slate-900 dark:text-slate-100 uppercase">{item.uraian}</td>
                                    <td className="px-3 py-2 text-right text-sikas-num text-slate-900 dark:text-slate-100">{formatCurrency(item.jumlah)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* C. RENCANA PER TAHAP */}
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase mb-2">C. RENCANA PELAKSANAAN ANGGARAN PER TAHAP</h3>
                <div className="border border-slate-300 dark:border-white/20 mb-12 text-sm">
                    <table className="w-full">
                        <thead className="bg-slate-50 dark:bg-white/[0.04] border-b border-slate-300 dark:border-white/20 divide-x divide-slate-300 dark:divide-white/20">
                            <tr>
                                <th rowSpan={2} className="px-3 py-2 text-center border-b border-slate-300 dark:border-white/20 w-16 font-bold text-slate-900 dark:text-slate-100">No</th>
                                <th rowSpan={2} className="px-3 py-2 text-center border-b border-slate-300 dark:border-white/20 font-bold text-slate-900 dark:text-slate-100">Uraian</th>
                                <th colSpan={2} className="px-3 py-2 text-center border-b border-slate-300 dark:border-white/20 font-bold text-slate-900 dark:text-slate-100">Tahap</th>
                                <th rowSpan={2} className="px-3 py-2 text-center border-b border-slate-300 dark:border-white/20 w-48 font-bold text-slate-900 dark:text-slate-100">Jumlah</th>
                            </tr>
                            <tr>
                                <th className="px-3 py-2 text-center w-48 font-bold text-slate-900 dark:text-slate-100">I</th>
                                <th className="px-3 py-2 text-center w-48 font-bold text-slate-900 dark:text-slate-100">II</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-300 dark:divide-white/20">
                            {perTahapData && perTahapData.map((item: any, idx: number) => (
                                <tr key={idx} className="divide-x divide-slate-300 dark:divide-white/20">
                                    <td className="px-3 py-2 text-center text-sikas-num text-slate-900 dark:text-slate-100">{item.no}</td>
                                    <td className="px-3 py-2 text-slate-900 dark:text-slate-100">{item.uraian}</td>
                                    <td className="px-3 py-2 text-right text-sikas-num text-slate-900 dark:text-slate-100">{formatCurrency(item.tahap1)}</td>
                                    <td className="px-3 py-2 text-right text-sikas-num text-slate-900 dark:text-slate-100">{formatCurrency(item.tahap2)}</td>
                                    <td className="px-3 py-2 text-right text-sikas-num text-slate-900 dark:text-slate-100">{formatCurrency(item.total)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Footers */}
                <div className="flex justify-end text-sm text-slate-900 dark:text-slate-100 px-4 text-center">
                    <div>
                        <p className="mb-1">{anggaran.sekolah?.kecamatan}, {formatDateSafe(anggaran.tanggal_perubahan, 'd MMMM yyyy')}</p>
                        <p className="mb-20">Kepala Sekolah</p>
                        <p className="font-bold underline uppercase">{anggaran.kepala_sekolah || '....................'}</p>
                        <p className="uppercase">NIP. {anggaran.nip_kepala_sekolah || '-'}</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
