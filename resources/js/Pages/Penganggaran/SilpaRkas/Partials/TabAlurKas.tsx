import React, { Fragment } from 'react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';


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
                            <div className="space-y-8 animate-fade-in-up">
                                {/* Action Button */}
                                <div className="flex justify-end mb-4">
                                    <button
                                        onClick={() => window.print()}
                                        className="bg-indigo-600 text-white hover:bg-indigo-700 px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 shadow-sm transition-colors">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                        </svg>
                                        Cetak / Print
                                    </button>
                                </div>

                                <div className="bg-white dark:bg-gray-800 p-8 border border-gray-200 dark:border-gray-700 shadow-sm rounded-lg print:border-none print:shadow-none overflow-x-auto">
                                    {/* Report Header */}
                                    <div className="text-center mb-8">
                                        <h2 className="text-lg font-bold uppercase tracking-wider text-gray-900 dark:text-gray-100">ALUR KAS</h2>
                                        <h3 className="text-md font-medium uppercase text-gray-600 dark:text-gray-400 mt-1">BANTUAN OPERASIONAL SATUAN PENDIDIKAN (BOSP)</h3>
                                        <h3 className="text-md font-medium uppercase text-gray-600 dark:text-gray-400 mt-1">TAHUN ANGGARAN : {anggaran.tahun_anggaran}</h3>
                                    </div>

                                    {/* School Info */}
                                    <div className="mb-6 grid grid-cols-[150px_10px_1fr] gap-1 text-sm">
                                        <div className="text-gray-600 dark:text-gray-400">NPSN</div>
                                        <div>:</div>
                                        <div className="font-medium text-gray-900 dark:text-gray-100">{anggaran.sekolah?.npsn || '-'}</div>

                                        <div className="text-gray-600 dark:text-gray-400">Nama Sekolah</div>
                                        <div>:</div>
                                        <div className="font-medium text-gray-900 dark:text-gray-100">{anggaran.sekolah?.nama_sekolah || '-'}</div>

                                        <div className="text-gray-600 dark:text-gray-400">Alamat</div>
                                        <div>:</div>
                                        <div className="font-medium text-gray-900 dark:text-gray-100">{anggaran.sekolah?.alamat || '-'}</div>

                                        <div className="text-gray-600 dark:text-gray-400">Kabupaten</div>
                                        <div>:</div>
                                        <div className="font-medium text-gray-900 dark:text-gray-100">{anggaran.sekolah?.kabupaten_kota || '-'}</div>

                                        <div className="text-gray-600 dark:text-gray-400">Provinsi</div>
                                        <div>:</div>
                                        <div className="font-medium text-gray-900 dark:text-gray-100">{anggaran.sekolah?.provinsi || '-'}</div>
                                    </div>

                                    <div className="space-y-6 min-w-[1200px]">
                                        {/* A. PENERIMAAN */}
                                        <div>
                                            <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-1">A. Penerimaan</h4>
                                            <div className="text-sm italic mb-1 text-gray-600">Sumber Dana :</div>
                                            <div className="border border-gray-900 dark:border-gray-600">
                                                <table className="min-w-full text-sm border-collapse border border-gray-900 dark:border-gray-600">
                                                    <thead className="bg-gray-100 dark:bg-gray-700">
                                                        <tr>
                                                            <th className="px-4 py-2 text-center font-bold text-gray-900 dark:text-gray-100 border border-gray-900 dark:border-gray-600 w-32">Nomor Kode</th>
                                                            <th className="px-4 py-2 text-center font-bold text-gray-900 dark:text-gray-100 border border-gray-900 dark:border-gray-600">Penerimaan</th>
                                                            <th className="px-4 py-2 text-center font-bold text-gray-900 dark:text-gray-100 border border-gray-900 dark:border-gray-600 w-48">Jumlah</th>
                                                            <th className="px-4 py-2 text-center font-bold text-gray-900 dark:text-gray-100 border border-gray-900 dark:border-gray-600 w-48">Tahap I</th>
                                                            <th className="px-4 py-2 text-center font-bold text-gray-900 dark:text-gray-100 border border-gray-900 dark:border-gray-600 w-48">Tahap II</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="bg-white dark:bg-gray-800">
                                                        <tr>
                                                            <td className="px-4 py-2 border border-gray-900 dark:border-gray-600 text-center font-medium">4.3.1.01</td>
                                                            <td className="px-4 py-2 border border-gray-900 dark:border-gray-600 text-center">{anggaran.sumber_dana || 'BOS Reguler'}</td>
                                                            <td className="px-4 py-2 text-right border border-gray-900 dark:border-gray-600 font-medium">Rp {formatCurrency(anggaran.pagu_anggaran)}</td>
                                                            <td className="px-4 py-2 text-right border border-gray-900 dark:border-gray-600 font-medium">Rp {formatCurrency(anggaran.pagu_anggaran / 2)}</td>
                                                            <td className="px-4 py-2 text-right border border-gray-900 dark:border-gray-600 font-medium">Rp {formatCurrency(anggaran.pagu_anggaran / 2)}</td>
                                                        </tr>
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>

                                        {/* B. BELANJA */}
                                        <div>
                                            <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-1">B. Belanja</h4>
                                            <div className="overflow-x-auto">
                                                <table className="min-w-full text-sm border-collapse border border-gray-900 dark:border-gray-600">
                                                    <thead className="bg-gray-100 dark:bg-gray-700">
                                                        <tr>
                                                            <th rowSpan={2} className="px-2 py-2 text-center font-bold text-gray-900 dark:text-gray-100 align-middle w-24 bg-gray-200 dark:bg-gray-600 border border-gray-900 dark:border-gray-600">KODE KEGIATAN</th>
                                                            <th rowSpan={2} className="px-4 py-2 text-center font-bold text-gray-900 dark:text-gray-100 align-middle w-64 bg-gray-200 dark:bg-gray-600 border border-gray-900 dark:border-gray-600">PROGRAM DAN KEGIATAN</th>
                                                            <th rowSpan={2} className="px-2 py-2 text-center font-bold text-gray-900 dark:text-gray-100 align-middle w-32 bg-gray-200 dark:bg-gray-600 border border-gray-900 dark:border-gray-600">PAGU ANGGARAN</th>
                                                            <th colSpan={6} className="px-2 py-2 text-center font-bold text-gray-900 dark:text-gray-100 bg-orange-200 dark:bg-orange-900/50 border border-gray-900 dark:border-gray-600">TAHAP I (SATU)</th>
                                                            <th colSpan={6} className="px-2 py-2 text-center font-bold text-gray-900 dark:text-gray-100 bg-orange-200 dark:bg-orange-900/50 border border-gray-900 dark:border-gray-600">TAHAP II (DUA)</th>
                                                        </tr>
                                                        <tr>
                                                            {months.slice(0, 6).map((m) => (
                                                                <th key={m} className="px-2 py-1 text-center font-bold text-gray-900 dark:text-gray-100 text-xs bg-green-200 dark:bg-green-900/50 w-24 border border-gray-900 dark:border-gray-600">{m.substring(0, 3)}</th>
                                                            ))}
                                                            {months.slice(6, 12).map((m) => (
                                                                <th key={m} className="px-2 py-1 text-center font-bold text-gray-900 dark:text-gray-100 text-xs bg-green-200 dark:bg-green-900/50 w-24 border border-gray-900 dark:border-gray-600">{m.substring(0, 3)}</th>
                                                            ))}
                                                        </tr>
                                                    </thead>
                                                    <tbody className="bg-white dark:bg-gray-800">
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
                                                                        <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                                                            <td className="px-2 py-2 text-center text-sm font-medium text-gray-900 dark:text-gray-100 align-top border border-gray-900 dark:border-gray-600">{row.kode_kegiatan}</td>
                                                                            <td className="px-2 py-2 text-sm text-gray-800 dark:text-gray-200 align-top border border-gray-900 dark:border-gray-600">{row.uraian}</td>
                                                                            <td className="px-2 py-2 text-right text-sm font-medium text-gray-900 dark:text-gray-100 align-top border border-gray-900 dark:border-gray-600">{formatCurrency(row.pagu)}</td>
                                                                            {months.map(m => (
                                                                                <td key={m} className="px-2 py-2 text-right text-sm text-gray-800 dark:text-gray-200 align-top border border-gray-900 dark:border-gray-600">
                                                                                    {row.bulanan[m] > 0 ? formatCurrency(row.bulanan[m]) : ''}
                                                                                </td>
                                                                            ))}
                                                                        </tr>
                                                                    ))}
                                                                    <tr className="bg-gray-100 dark:bg-gray-700 font-bold">
                                                                        <td colSpan={2} className="px-4 py-2 text-center text-gray-900 dark:text-gray-100 border border-gray-900 dark:border-gray-600">Jumlah</td>
                                                                        <td className="px-2 py-2 text-right text-gray-900 dark:text-gray-100 border border-gray-900 dark:border-gray-600">{formatCurrency(totalPagu)}</td>
                                                                        {months.map(m => (
                                                                            <td key={m} className="px-2 py-2 text-right text-gray-900 dark:text-gray-100 border border-gray-900 dark:border-gray-600">
                                                                                {totalBulan[m as keyof typeof totalBulan] > 0 ? formatCurrency(totalBulan[m as keyof typeof totalBulan]) : ''}
                                                                            </td>
                                                                        ))}
                                                                    </tr>
                                                                    <tr className="bg-gray-100 dark:bg-gray-800 font-bold">
                                                                        <td colSpan={3} className="px-4 py-2 text-center border border-gray-900 dark:border-gray-600"></td>
                                                                        <td colSpan={6} className="px-2 py-3 text-center text-gray-900 dark:text-gray-100 border border-gray-900 dark:border-gray-600">
                                                                            {formatCurrency(months.slice(0, 6).reduce((acc, m) => acc + totalBulan[m as keyof typeof totalBulan], 0))}
                                                                        </td>
                                                                        <td colSpan={6} className="px-2 py-3 text-center text-gray-900 dark:text-gray-100 border border-gray-900 dark:border-gray-600">
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
                                        
                                        {/* Footer Signatures */}
                                        <div className="mt-12 flex justify-between text-sm text-gray-900 dark:text-gray-100 px-8">
                                            <div className="text-center mt-8">
                                                <p className="mb-20">Mengetahui,</p>
                                                <p className="mb-20">Kepala Sekolah</p>
                                                <p className="font-bold underline uppercase">{anggaran.kepala_sekolah || '-'}</p>
                                                <p>NIP. {anggaran.nip_kepala_sekolah || '-'}</p>
                                            </div>

                                            <div className="text-center">
                                                <p className="mb-1">{anggaran.sekolah?.kecamatan || '...'}, {formatDateSafe(anggaran.tanggal_cetak, 'd MMMM yyyy')}</p>
                                                <p className="mb-20">Bendahara BOSP,</p>
                                                <p className="font-bold underline uppercase">{anggaran.bendahara || '-'}</p>
                                                <p>NIP. {anggaran.nip_bendahara || '-'}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
    );
}
