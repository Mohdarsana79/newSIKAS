import { Fragment } from 'react';
import DataTable from '@/Components/ui/DataTable';
import IconTile from '@/Components/ui/IconTile';

interface TabRincianProps {
    rincianData: any[];
    onPrint: (target: string) => void;
    onExportExcel: (target: string) => void;
}

export default function TabRincian({ rincianData, onPrint, onExportExcel }: TabRincianProps) {
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('id-ID').format(amount);
    };

    return (
        <div className="animate-rise space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 px-1">
                <div className="flex items-center gap-3">
                    <IconTile tone="sky" size="md">
                        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                            <path d="M4 6h16M4 12h16M4 18h10" />
                        </svg>
                    </IconTile>
                    <div className="min-w-0">
                        <h2 className="text-[13.5px] font-extrabold uppercase tracking-tight text-slate-900 dark:text-white">
                            Rincian Belanja
                        </h2>
                        <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500">
                            Rekap belanja per sub program.
                        </p>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <button
                        onClick={() => onPrint('rincian')}
                        className="inline-flex items-center justify-center gap-1.5 rounded-2xl bg-slate-900 px-3.5 py-2.5 text-[11px] font-extrabold text-white shadow-pill transition hover:-translate-y-0.5 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
                    >
                        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                        </svg>
                        Cetak PDF
                    </button>
                    <button
                        onClick={() => onExportExcel('rincian')}
                        className="inline-flex items-center justify-center gap-1.5 rounded-2xl border border-emerald-200 bg-pastel-mint px-3.5 py-2.5 text-[11px] font-extrabold text-emerald-700 transition hover:-translate-y-0.5 hover:bg-emerald-100 dark:border-emerald-400/20 dark:bg-mint/10 dark:text-emerald-300 dark:hover:bg-mint/15"
                    >
                        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Export Excel
                    </button>
                </div>
            </div>

            <DataTable contentClassName="bento-table-wrapper mx-1 mt-4">
                <table className="min-w-full">
                    <thead>
                        <tr>
                            <th className="w-16 text-left">No</th>
                            <th className="text-left">Uraian Rekening</th>
                            <th className="w-48 text-right">Jumlah</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rincianData.map((group, index) => (
                            <Fragment key={`rincian-group-${index}`}>
                                {/* Sub Program Group Row */}
                                <tr className="bg-brand-500/[0.06] dark:bg-brand-500/10">
                                    <td className="whitespace-nowrap !font-extrabold !text-brand-700 dark:!text-brand-300">{index + 1}</td>
                                    <td className="!font-extrabold !text-brand-700 dark:!text-brand-300">{group.sub_program}</td>
                                    <td className="whitespace-nowrap text-right text-sikas-num !font-extrabold !text-brand-600 dark:!text-brand-300">{formatCurrency(group.total)}</td>
                                </tr>
                                {/* Item Rows */}
                                {group.items.map((item: any, itemIndex: number) => (
                                    <tr key={`rincian-item-${index}-${itemIndex}`}>
                                        <td className="border-r border-slate-100 dark:border-white/5"></td>
                                        <td>
                                            <div className="flex items-center gap-2">
                                                <div className="h-1.5 w-1.5 rounded-full bg-slate-300 dark:bg-slate-600"></div>
                                                {item.uraian}
                                            </div>
                                        </td>
                                        <td className="whitespace-nowrap text-right text-sikas-num !font-semibold">{formatCurrency(item.jumlah)}</td>
                                    </tr>
                                ))}
                            </Fragment>
                        ))}
                        <tr className="bg-slate-50/90 dark:bg-white/[0.04]">
                            <td colSpan={2} className="text-right text-[10px] !font-extrabold uppercase tracking-[0.14em] !text-slate-500 dark:!text-slate-400">Total Keseluruhan</td>
                            <td className="whitespace-nowrap text-right text-sikas-num !font-extrabold !text-lime-700 dark:!text-lime-300">
                                {formatCurrency(rincianData.reduce((acc, curr) => acc + curr.total, 0))}
                            </td>
                        </tr>
                    </tbody>
                </table>
            </DataTable>
        </div>
    );
}
