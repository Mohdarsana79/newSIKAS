import React, { Fragment } from 'react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';


interface TabLembarKerja221Props {
    anggaran: any;
    lembarData: any;
    totalBelanja: any;
    onPrint: (target: string) => void;
}

export default function TabLembarKerja221({ anggaran, lembarData, totalBelanja, onPrint }: TabLembarKerja221Props) {
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
                                <div className="flex justify-end mb-4">
                                    <button
                                        onClick={() => {
                                            onPrint('lembar');
                                        }}
                                        className="bg-indigo-600 text-white hover:bg-indigo-700 px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 shadow-sm transition-colors">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                        Pengaturan Cetak
                                    </button>
                                </div>

                                <div className="bg-white dark:bg-gray-800 p-8 border border-gray-200 dark:border-gray-700 shadow-sm rounded-lg print:border-none print:shadow-none">
                                    {/* Report Header */}
                                    <div className="text-center mb-8">
                                        <h2 className="text-lg font-bold uppercase tracking-wider text-gray-900 dark:text-gray-100">Lembar Kertas Kerja</h2>
                                        <h3 className="text-md font-medium uppercase text-gray-600 dark:text-gray-400">Tahun Anggaran {anggaran.tahun_anggaran}</h3>
                                    </div>

                                    <div className="mb-6 grid grid-cols-[200px_1fr] gap-2 text-sm">
                                        <div className="text-gray-600 dark:text-gray-400">Urusan Pemerintahan</div>
                                        <div className="font-medium text-gray-900 dark:text-gray-100">: 1.01 - PENDIDIKAN</div>
                                        <div className="text-gray-600 dark:text-gray-400">Organisasi</div>
                                        <div className="font-medium text-gray-900 dark:text-gray-100">: {anggaran.sekolah?.nama_sekolah || '-'}</div>
                                    </div>

                                    {/* Indikator Table */}
                                    <div className="mb-8">
                                        <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-2">Indikator & Tolok Ukur Kinerja Belanja Langsung</h4>
                                        <div className="border border-gray-900 dark:border-gray-600 overflow-hidden">
                                            <table className="min-w-full text-sm divide-y divide-gray-900 dark:divide-gray-600">
                                                <thead className="bg-gray-50 dark:bg-gray-700">
                                                    <tr className="divide-x divide-gray-900 dark:divide-gray-600">
                                                        <th className="px-4 py-2 text-left font-bold text-gray-900 dark:text-gray-100 w-1/3">Indikator</th>
                                                        <th className="px-4 py-2 text-left font-bold text-gray-900 dark:text-gray-100 w-1/3">Tolok Ukur Kinerja</th>
                                                        <th className="px-4 py-2 text-left font-bold text-gray-900 dark:text-gray-100 w-1/3">Target Kinerja</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-900 dark:divide-gray-600">
                                                    <tr className="divide-x divide-gray-900 dark:divide-gray-600">
                                                        <td className="px-4 py-2">Capaian Program</td>
                                                        <td className="px-4 py-2"></td>
                                                        <td className="px-4 py-2 text-right">-</td>
                                                    </tr>
                                                    <tr className="divide-x divide-gray-900 dark:divide-gray-600">
                                                        <td className="px-4 py-2">Masukan</td>
                                                        <td className="px-4 py-2">Dana</td>
                                                        <td className="px-4 py-2 text-right">{anggaran.pagu_total}</td>
                                                    </tr>
                                                    <tr className="divide-x divide-gray-900 dark:divide-gray-600">
                                                        <td className="px-4 py-2">Keluaran</td>
                                                        <td className="px-4 py-2"></td>
                                                        <td className="px-4 py-2 text-right">-</td>
                                                    </tr>
                                                    <tr className="divide-x divide-gray-900 dark:divide-gray-600">
                                                        <td className="px-4 py-2">Hasil</td>
                                                        <td className="px-4 py-2"></td>
                                                        <td className="px-4 py-2 text-right">-</td>
                                                    </tr>
                                                    <tr className="divide-x divide-gray-900 dark:divide-gray-600">
                                                        <td className="px-4 py-2">Sasaran Keg</td>
                                                        <td className="px-4 py-2"></td>
                                                        <td className="px-4 py-2 text-right">-</td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    {/* Budget Detail Table */}
                                    <div>
                                        <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-2">Rincian Anggaran Belanja Langsung Menurut Program dan Per Kegiatan Unit Kerja</h4>
                                        <div className="border border-gray-900 dark:border-gray-600 overflow-hidden">
                                            <table className="min-w-full text-sm divide-y divide-gray-900 dark:divide-gray-600">
                                                <thead className="bg-gray-100 dark:bg-gray-700 border-b border-gray-900 dark:border-gray-600">
                                                    <tr className="divide-x divide-gray-900 dark:divide-gray-600">
                                                        <th rowSpan={2} className="px-3 py-2 text-left font-bold text-gray-900 dark:text-gray-100 w-32">Kode Rekening</th>
                                                        <th rowSpan={2} className="px-3 py-2 text-left font-bold text-gray-900 dark:text-gray-100">Uraian</th>
                                                        <th colSpan={3} className="px-3 py-1 text-center font-bold text-gray-900 dark:text-gray-100 border-b border-gray-900 dark:border-gray-600">Rincian Perhitungan</th>
                                                        <th rowSpan={2} className="px-3 py-2 text-right font-bold text-gray-900 dark:text-gray-100 w-32">Jumlah (Rp)</th>
                                                    </tr>
                                                    <tr className="divide-x divide-gray-900 dark:divide-gray-600">
                                                        <th className="px-2 py-1 text-center font-bold text-xs">Volume</th>
                                                        <th className="px-2 py-1 text-center font-bold text-xs">Satuan</th>
                                                        <th className="px-2 py-1 text-right font-bold text-xs">Harga Satuan</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-900 dark:divide-gray-600">
                                                    {lembarData && lembarData.map((row: any, idx: number) => (
                                                        <tr key={idx} className={`divide - x divide - gray - 900 dark: divide - gray - 600 ${row.type === 'header' ? 'bg-gray-50 dark:bg-gray-700/50 font-bold' : 'bg-white dark:bg-gray-800'} `}>
                                                            <td className="px-3 py-1.5 align-top">{row.kode_rekening}</td>
                                                            <td className="px-3 py-1.5 align-top">{row.uraian}</td>

                                                            <td className="px-2 py-1.5 text-center align-top">{row.volume}</td>
                                                            <td className="px-2 py-1.5 text-center align-top">{row.satuan}</td>
                                                            <td className="px-2 py-1.5 text-right align-top">
                                                                {row.harga_satuan ? formatCurrency(row.harga_satuan) : ''}
                                                            </td>

                                                            <td className="px-3 py-1.5 text-right font-medium align-top">
                                                                {formatCurrency(row.jumlah)}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                    <tr className="bg-gray-200 dark:bg-gray-700 font-bold divide-x divide-gray-900 dark:divide-gray-600 border-t-2 border-gray-900 dark:border-gray-500">
                                                        <td colSpan={5} className="px-3 py-2 text-right uppercase">Jumlah</td>
                                                        <td className="px-3 py-2 text-right">
                                                            {formatCurrency(totalBelanja)}
                                                        </td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    {/* Footer Signatures (Hardcoded as per Request/Common Practice, dynamic based on School Profile ideal) */}
                                    <div className="mt-12 flex justify-end text-sm text-gray-900 dark:text-gray-100">
                                        <div className="text-center">
                                            <p className="mb-1">{anggaran.sekolah?.kecamatan}, {formatDateSafe(anggaran.tanggal_perubahan, 'd MMMM yyyy')}</p>
                                            <p className="mb-20">Kepala Sekolah</p>
                                            <p className="font-bold underline uppercase">{anggaran.kepala_sekolah || '....................'}</p>
                                            <p className="uppercase">{anggaran.nip_kepala_sekolah || '-'}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
    );
}
