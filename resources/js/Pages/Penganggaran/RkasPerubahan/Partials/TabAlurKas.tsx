import React, { Fragment } from 'react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import DocKopSuratHeader from '@/Components/DocKopSuratHeader';

interface TabAlurKasProps {
    anggaran: any;
    tahapanData: any;
    months: string[];
    onPrint: (target: string) => void;
}

export default function TabAlurKas({ anggaran, tahapanData, months, onPrint }: TabAlurKasProps) {
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

                            <div className="space-y-4">
                                {/* Action Button */}
                                <div className="flex flex-wrap items-center justify-end gap-2">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <button
                                            onClick={() => onPrint('alur_kas')}
                                            className="inline-flex items-center gap-2 rounded-2xl bg-lime-400 px-4 py-2.5 text-[11.5px] font-extrabold text-slate-950 shadow-lime transition-all duration-200 hover:-translate-y-0.5 hover:bg-lime-300">
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                            </svg>
                                            Cetak / Print
                                        </button>
                                        <a
                                            href={route('rkas-perubahan.export-alur-kas-excel', anggaran.id)}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-2 rounded-2xl border border-emerald-200/80 bg-emerald-50 px-4 py-2.5 text-[11.5px] font-bold text-emerald-700 shadow-pill transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-300 hover:bg-emerald-100 dark:border-emerald-400/20 dark:bg-emerald-500/10 dark:text-emerald-300 dark:hover:bg-emerald-500/15">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                            </svg>
                                            Export Excel
                                        </a>
                                    </div>
                                </div>

                                <div className="bg-white dark:bg-[#15131F] p-8 border border-slate-200 dark:border-white/10 shadow-sm rounded-lg print:border-none print:shadow-none overflow-x-auto">
                                    <DocKopSuratHeader docKey="rkas_perubahan_alur_kas" sekolah={anggaran?.sekolah} />
                                    {/* Report Header */}
                                    <div className="text-center mb-8">
                                        <h2 className="text-lg font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">ALUR KAS</h2>
                                        <h3 className="text-md font-medium uppercase text-slate-600 dark:text-slate-400 mt-1">BANTUAN OPERASIONAL SATUAN PENDIDIKAN (BOSP)</h3>
                                        <h3 className="text-md font-medium uppercase text-slate-600 dark:text-slate-400 mt-1">TAHUN ANGGARAN : {anggaran.tahun_anggaran}</h3>
                                    </div>

                                    {/* School Info */}
                                    <div className="mb-6 grid grid-cols-[150px_10px_1fr] gap-1 text-sm">
                                        <div className="text-slate-600 dark:text-slate-400">NPSN</div>
                                        <div>:</div>
                                        <div className="font-medium text-slate-900 dark:text-slate-100">{anggaran.sekolah?.npsn || '-'}</div>

                                        <div className="text-slate-600 dark:text-slate-400">Nama Sekolah</div>
                                        <div>:</div>
                                        <div className="font-medium text-slate-900 dark:text-slate-100">{anggaran.sekolah?.nama_sekolah || '-'}</div>

                                        <div className="text-slate-600 dark:text-slate-400">Alamat</div>
                                        <div>:</div>
                                        <div className="font-medium text-slate-900 dark:text-slate-100">{anggaran.sekolah?.alamat || '-'}</div>

                                        <div className="text-slate-600 dark:text-slate-400">Kabupaten</div>
                                        <div>:</div>
                                        <div className="font-medium text-slate-900 dark:text-slate-100">{anggaran.sekolah?.kabupaten_kota || '-'}</div>

                                        <div className="text-slate-600 dark:text-slate-400">Provinsi</div>
                                        <div>:</div>
                                        <div className="font-medium text-slate-900 dark:text-slate-100">{anggaran.sekolah?.provinsi || '-'}</div>
                                    </div>

                                    <div className="space-y-6 min-w-[1200px]">
                                        {/* A. PENERIMAAN */}
                                        <div>
                                            <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-1">A. Penerimaan</h4>
                                            <div className="text-sm italic mb-1 text-slate-600">Sumber Dana :</div>
                                            <div className="border border-slate-900 dark:border-white/20">
                                                <table className="min-w-full text-sm border-collapse border border-slate-900 dark:border-white/20">
                                                    <thead className="bg-slate-100 dark:bg-white/[0.06]">
                                                        <tr>
                                                            <th className="px-4 py-2 text-center font-bold text-slate-900 dark:text-slate-100 border border-slate-900 dark:border-white/20 w-32">Nomor Kode</th>
                                                            <th className="px-4 py-2 text-center font-bold text-slate-900 dark:text-slate-100 border border-slate-900 dark:border-white/20">Penerimaan</th>
                                                            <th className="px-4 py-2 text-center font-bold text-slate-900 dark:text-slate-100 border border-slate-900 dark:border-white/20 w-48">Jumlah</th>
                                                            <th className="px-4 py-2 text-center font-bold text-slate-900 dark:text-slate-100 border border-slate-900 dark:border-white/20 w-48">Tahap I</th>
                                                            <th className="px-4 py-2 text-center font-bold text-slate-900 dark:text-slate-100 border border-slate-900 dark:border-white/20 w-48">Tahap II</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="bg-white dark:bg-[#15131F]">
                                                        <tr>
                                                            <td className="px-4 py-2 border border-slate-900 dark:border-white/20 text-center font-medium">4.3.1.01</td>
                                                            <td className="px-4 py-2 border border-slate-900 dark:border-white/20 text-center">{anggaran.sumber_dana || 'BOS Reguler'}</td>
                                                            <td className="px-4 py-2 text-right border border-slate-900 dark:border-white/20 font-medium">Rp {formatCurrency(anggaran.pagu_anggaran)}</td>
                                                            <td className="px-4 py-2 text-right border border-slate-900 dark:border-white/20 font-medium">Rp {formatCurrency(anggaran.pagu_anggaran / 2)}</td>
                                                            <td className="px-4 py-2 text-right border border-slate-900 dark:border-white/20 font-medium">Rp {formatCurrency(anggaran.pagu_anggaran / 2)}</td>
                                                        </tr>
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>

                                        {/* B. BELANJA */}
                                        <div>
                                            <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-1">B. Belanja</h4>
                                            <div className="overflow-x-auto">
                                                <table className="min-w-full text-sm border-collapse border border-slate-900 dark:border-white/20">
                                                    <thead className="bg-slate-100 dark:bg-white/[0.06]">
                                                        <tr>
                                                            <th rowSpan={2} className="px-2 py-2 text-center font-bold text-slate-900 dark:text-slate-100 align-middle w-24 bg-slate-200 dark:bg-white/10 border border-slate-900 dark:border-white/20">KODE KEGIATAN</th>
                                                            <th rowSpan={2} className="px-4 py-2 text-center font-bold text-slate-900 dark:text-slate-100 align-middle w-64 bg-slate-200 dark:bg-white/10 border border-slate-900 dark:border-white/20">PROGRAM DAN KEGIATAN</th>
                                                            <th rowSpan={2} className="px-2 py-2 text-center font-bold text-slate-900 dark:text-slate-100 align-middle w-32 bg-slate-200 dark:bg-white/10 border border-slate-900 dark:border-white/20">PAGU ANGGARAN</th>
                                                            <th colSpan={6} className="px-2 py-2 text-center font-bold text-slate-900 dark:text-slate-100 bg-orange-200 dark:bg-orange-900/50 border border-slate-900 dark:border-white/20">TAHAP I (SATU)</th>
                                                            <th colSpan={6} className="px-2 py-2 text-center font-bold text-slate-900 dark:text-slate-100 bg-orange-200 dark:bg-orange-900/50 border border-slate-900 dark:border-white/20">TAHAP II (DUA)</th>
                                                        </tr>
                                                        <tr>
                                                            {months.slice(0, 6).map((m) => (
                                                                <th key={m} className="px-2 py-1 text-center font-bold text-slate-900 dark:text-slate-100 text-xs bg-green-200 dark:bg-green-900/50 w-24 border border-slate-900 dark:border-white/20">{m.substring(0, 3)}</th>
                                                            ))}
                                                            {months.slice(6, 12).map((m) => (
                                                                <th key={m} className="px-2 py-1 text-center font-bold text-slate-900 dark:text-slate-100 text-xs bg-green-200 dark:bg-green-900/50 w-24 border border-slate-900 dark:border-white/20">{m.substring(0, 3)}</th>
                                                            ))}
                                                        </tr>
                                                    </thead>
                                                    <tbody className="bg-white dark:bg-[#15131F]">
                                                        {(() => {
                                                            const alurKasRows: any[] = [];
                                                            let totalPagu = 0;
                                                            const totalBulan = { Januari: 0, Februari: 0, Maret: 0, April: 0, Mei: 0, Juni: 0, Juli: 0, Agustus: 0, September: 0, Oktober: 0, November: 0, Desember: 0 };
                                                            
                                                            if (tahapanData) {
                                                                Object.entries(tahapanData).forEach(([progCode, program]: [string, any]) => {
                                                                    if (program.sub_programs) {
                                                                        Object.entries(program.sub_programs).forEach(([subCode, subProgram]: [string, any]) => {
                                                                            if (subProgram.uraian_programs) {
                                                                                Object.entries(subProgram.uraian_programs).forEach(([urCode, urProgram]: [string, any]) => {
                                                                                    const row = {
                                                                                        kode_kegiatan: urCode.toString().includes('.') ? urCode : `${subCode}.${urCode}`,
                                                                                        uraian: urProgram.uraian,
                                                                                        pagu: urProgram.jumlah || 0,
                                                                                        bulanan: {} as Record<string, number>
                                                                                    };
                                                                                    
                                                                                    totalPagu += (urProgram.jumlah || 0);
                                                                                    
                                                                                    months.forEach(m => {
                                                                                        let monthTotal = 0;
                                                                                        if (urProgram.items) {
                                                                                            urProgram.items.forEach((item: any) => {
                                                                                                monthTotal += (item.bulanan?.[m]?.total || 0);
                                                                                            });
                                                                                        }
                                                                                        row.bulanan[m] = monthTotal;
                                                                                        totalBulan[m as keyof typeof totalBulan] += monthTotal;
                                                                                    });
                                                                                    
                                                                                    alurKasRows.push(row);
                                                                                });
                                                                            }
                                                                        });
                                                                    }
                                                                });
                                                            }

                                                            return (
                                                                <>
                                                                    {alurKasRows.map((row: any, idx: number) => (
                                                                        <tr key={idx} className="hover:bg-lime-100/40 dark:hover:bg-white/5">
                                                                            <td className="px-2 py-2 text-center text-sm font-medium text-slate-900 dark:text-slate-100 align-top border border-slate-900 dark:border-white/20">{row.kode_kegiatan}</td>
                                                                            <td className="px-2 py-2 text-sm text-slate-800 dark:text-slate-200 align-top border border-slate-900 dark:border-white/20">{row.uraian}</td>
                                                                            <td className="px-2 py-2 text-right text-sm font-medium text-slate-900 dark:text-slate-100 align-top border border-slate-900 dark:border-white/20">{formatCurrency(row.pagu)}</td>
                                                                            {months.map(m => (
                                                                                <td key={m} className="px-2 py-2 text-right text-sm text-slate-800 dark:text-slate-200 align-top border border-slate-900 dark:border-white/20">
                                                                                    {row.bulanan[m] > 0 ? formatCurrency(row.bulanan[m]) : ''}
                                                                                </td>
                                                                            ))}
                                                                        </tr>
                                                                    ))}
                                                                    <tr className="bg-slate-100 dark:bg-white/[0.06] font-bold">
                                                                        <td colSpan={2} className="px-4 py-2 text-center text-slate-900 dark:text-slate-100 border border-slate-900 dark:border-white/20">Jumlah</td>
                                                                        <td className="px-2 py-2 text-right text-slate-900 dark:text-slate-100 border border-slate-900 dark:border-white/20">{formatCurrency(totalPagu)}</td>
                                                                        {months.map(m => (
                                                                            <td key={m} className="px-2 py-2 text-right text-slate-900 dark:text-slate-100 border border-slate-900 dark:border-white/20">
                                                                                {totalBulan[m as keyof typeof totalBulan] > 0 ? formatCurrency(totalBulan[m as keyof typeof totalBulan]) : ''}
                                                                            </td>
                                                                        ))}
                                                                    </tr>
                                                                    <tr className="bg-slate-100 dark:bg-[#15131F] font-bold">
                                                                        <td colSpan={3} className="px-4 py-2 text-center border border-slate-900 dark:border-white/20"></td>
                                                                        <td colSpan={6} className="px-2 py-3 text-center text-slate-900 dark:text-slate-100 border border-slate-900 dark:border-white/20">
                                                                            {formatCurrency(months.slice(0, 6).reduce((acc, m) => acc + totalBulan[m as keyof typeof totalBulan], 0))}
                                                                        </td>
                                                                        <td colSpan={6} className="px-2 py-3 text-center text-slate-900 dark:text-slate-100 border border-slate-900 dark:border-white/20">
                                                                            {formatCurrency(months.slice(6, 12).reduce((acc, m) => acc + totalBulan[m as keyof typeof totalBulan], 0))}
                                                                        </td>
                                                                    </tr>
                                                                </>
                                                            );
                                                        })()}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

    );
}
