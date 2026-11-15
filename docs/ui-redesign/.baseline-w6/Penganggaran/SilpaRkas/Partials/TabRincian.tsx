import React, { Fragment } from 'react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';


interface TabRincianProps {
    rincianData: any;
    onPrint: (target: string) => void;
    onExportExcel: () => void;
}

export default function TabRincian({ rincianData, onPrint, onExportExcel }: TabRincianProps) {
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
                            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow animate-fade-in-up">
                                <div className="flex justify-between items-center mb-6">
                                    <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 uppercase">
                                        Rincian Belanja
                                    </h2>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => onPrint('rincian')}
                                            className="bg-red-600 dark:bg-red-700 text-white px-4 py-2 rounded-md hover:bg-red-700 dark:hover:bg-red-800 flex items-center justify-center gap-2 shadow-sm transition-colors text-sm font-medium focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                            </svg>
                                            Cetak PDF
                                        </button>
                                        <button
                                            onClick={() => onPrint('rincian')}
                                            className="bg-green-600 dark:bg-green-700 text-white px-4 py-2 rounded-md hover:bg-green-700 dark:hover:bg-green-800 flex items-center justify-center gap-2 shadow-sm transition-colors text-sm font-medium focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                            </svg>
                                            Export Excel
                                        </button>
                                    </div>
                                </div>

                                <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                        <thead className="bg-gray-50 dark:bg-gray-800/80">
                                            <tr>
                                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-16">No</th>
                                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Uraian Rekening</th>
                                                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-48">Jumlah</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                            {rincianData.map((group: any, index: number) => (
                                                <Fragment key={`rincian-group-${index}`}>
                                                    {/* Sub Program Group Row */}
                                                    <tr className="bg-blue-50/50 dark:bg-blue-900/10 transition-colors">
                                                        <td className="px-6 py-3 whitespace-nowrap text-sm font-semibold text-blue-900 dark:text-blue-100">{index + 1}</td>
                                                        <td className="px-6 py-3 text-sm font-semibold text-blue-900 dark:text-blue-100">{group.sub_program}</td>
                                                        <td className="px-6 py-3 whitespace-nowrap text-sm font-bold text-blue-600 dark:text-blue-400 text-right">{formatCurrency(group.total)}</td>
                                                    </tr>
                                                    {/* Item Rows */}
                                                    {group.items.map((item: any, itemIndex: number) => (
                                                        <tr key={`rincian-item-${index}-${itemIndex}`} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                                            <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 border-r border-gray-100 dark:border-gray-700"></td>
                                                            <td className="px-6 py-3 text-sm text-gray-700 dark:text-gray-300">
                                                                <div className="flex items-center gap-2">
                                                                    <div className="w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-gray-500"></div>
                                                                    {item.uraian}
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100 text-right">{formatCurrency(item.jumlah)}</td>
                                                        </tr>
                                                    ))}
                                                </Fragment>
                                            ))}
                                            <tr className="bg-gray-100 dark:bg-gray-900">
                                                <td colSpan={2} className="px-6 py-4 text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider text-right">Total Keseluruhan</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold text-indigo-600 dark:text-indigo-400">
                                                    {formatCurrency(rincianData.reduce((acc: any, curr: any) => acc + curr.total, 0))}
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
    );
}
