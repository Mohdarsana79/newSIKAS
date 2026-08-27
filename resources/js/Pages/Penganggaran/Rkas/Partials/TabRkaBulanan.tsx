import { Fragment } from 'react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

interface TabRkaBulananProps {
    selectedMonth: string;
    handleMonthChange: (month: string) => void;
    months: string[];
    isLoading: boolean;
    anggaran: any;
    rkaBulananData: any;
    onPrint: (target: string) => void;
}

export default function TabRkaBulanan({
    selectedMonth,
    handleMonthChange,
    months,
    isLoading,
    anggaran,
    rkaBulananData,
    onPrint
}: TabRkaBulananProps) {
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('id-ID').format(amount);
    };

    const formatDateSafe = (dateStr: string | undefined, formatStr: string = 'dd/MM/yyyy') => {
        if (!dateStr) return '-';
        try {
            const datePart = dateStr.split(/[ T]/)[0];
            const [y, m, d] = datePart.split('-').map(Number);
            return format(new Date(y, m - 1, d), formatStr, { locale: id });
        } catch (e) {
            return '-';
        }
    };

    return (
        <div className="space-y-8 animate-fade-in-up">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                <div className="flex items-center gap-2">
                    <label htmlFor="monthSelect" className="text-sm font-medium text-gray-700 dark:text-gray-300">Pilih Bulan:</label>
                    <select
                        id="monthSelect"
                        value={selectedMonth}
                        onChange={(e) => handleMonthChange(e.target.value)}
                        className="block w-40 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        disabled={isLoading}
                    >
                        {months.map(m => (
                            <option key={m} value={m}>{m}</option>
                        ))}
                    </select>
                    {isLoading && <span className="text-sm text-gray-500 animate-pulse">Memuat data...</span>}
                </div>

                <button
                    onClick={() => onPrint('bulanan')}
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
                    <h2 className="text-lg font-bold uppercase tracking-wider text-gray-900 dark:text-gray-100 underline decoration-1 underline-offset-4">RENCANA KERTAS KERJA PER BULAN {selectedMonth.toUpperCase()}</h2>
                    <h3 className="text-md font-medium uppercase text-gray-600 dark:text-gray-400">TAHUN ANGGARAN : {anggaran.tahun_anggaran}</h3>
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

                <div className="space-y-6">
                    {/* A. PENERIMAAN */}
                    <div>
                        <h4 className="text-sm font-bold text-gray-900 dark:text-white uppercase mb-1">A. Penerimaan</h4>
                        <div className="border border-gray-900 dark:border-gray-600 relative">
                            {isLoading && (
                                <div className="absolute inset-0 bg-white/50 dark:bg-gray-800/50 z-10 flex items-center justify-center backdrop-blur-sm">
                                    <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                                </div>
                            )}
                            <table className="min-w-full text-sm">
                                <thead className="bg-gray-100 dark:bg-gray-700 border-b border-gray-900 dark:border-gray-600">
                                    <tr>
                                        <th className="px-4 py-2 text-center font-bold text-gray-900 dark:text-gray-100 border-r border-gray-900 dark:border-gray-600 w-32">No Kode</th>
                                        <th className="px-4 py-2 text-center font-bold text-gray-900 dark:text-gray-100 border-r border-gray-900 dark:border-gray-600">Penerimaan</th>
                                        <th className="px-4 py-2 text-right font-bold text-gray-900 dark:text-gray-100 w-48">Jumlah</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-900 dark:divide-gray-600 bg-white dark:bg-gray-800">
                                    <tr>
                                        <td className="px-4 py-2 border-r border-gray-900 dark:border-gray-600 font-medium">4.3.1.01.</td>
                                        <td className="px-4 py-2 border-r border-gray-900 dark:border-gray-600">{anggaran.sumber_dana || 'BOS Reguler'}</td>
                                        <td className="px-4 py-2 text-right font-medium">{anggaran.pagu_anggaran}</td>
                                    </tr>
                                    <tr className="bg-white dark:bg-gray-800 font-bold border-t border-gray-900 dark:border-gray-600">
                                        <td colSpan={2} className="px-4 py-2 border-r border-gray-900 dark:border-gray-600">Total Penerimaan</td>
                                        <td className="px-4 py-2 text-right">{anggaran.pagu_total}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* B. BELANJA */}
                    <div>
                        <h4 className="text-sm font-bold text-gray-900 dark:text-white uppercase mb-1">B. Belanja</h4>
                        <div className="border border-gray-900 dark:border-gray-600 overflow-hidden relative">
                            {isLoading && (
                                <div className="absolute inset-0 bg-white/50 dark:bg-gray-800/50 z-10 flex items-center justify-center backdrop-blur-sm">
                                    <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                                </div>
                            )}
                            <table className="min-w-full text-sm divide-y divide-gray-900 dark:divide-gray-600">
                                <thead className="bg-gray-200 dark:bg-gray-700 border-b border-gray-900 dark:border-gray-600">
                                    <tr className="divide-x divide-gray-900 dark:divide-gray-600">
                                        <th className="px-2 py-2 text-center font-bold text-gray-900 dark:text-gray-100 w-10">No.</th>
                                        <th className="px-2 py-2 text-center font-bold text-gray-900 dark:text-gray-100 w-32">Kode Rekening</th>
                                        <th className="px-2 py-2 text-center font-bold text-gray-900 dark:text-gray-100 w-32">Kode Program</th>
                                        <th className="px-4 py-2 text-center font-bold text-gray-900 dark:text-gray-100">Uraian</th>
                                        <th className="px-2 py-2 text-center font-bold text-gray-900 dark:text-gray-100 w-24">Volume</th>
                                        <th className="px-2 py-2 text-center font-bold text-gray-900 dark:text-gray-100 w-24">Satuan</th>
                                        <th className="px-2 py-2 text-right font-bold text-gray-900 dark:text-gray-100 w-32">Tarif Harga</th>
                                        <th className="px-2 py-2 text-right font-bold text-gray-900 dark:text-gray-100 w-32">Jumlah</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-900 dark:divide-gray-600">
                                    {rkaBulananData && Object.entries(rkaBulananData).map(([progCode, program]: [string, any], pIndex) => {
                                        const programMonthTotal = Object.values(program.sub_programs || {}).reduce((subTotal: number, sub: any) =>
                                            subTotal + Object.values(sub.uraian_programs || {}).reduce((urTotal: number, ur: any) =>
                                                urTotal + (ur.items || []).reduce((itemTotal: number, item: any) => itemTotal + (item.bulanan?.[selectedMonth]?.total || 0), 0)
                                                , 0)
                                            , 0);

                                        return (
                                            <Fragment key={`mon-prog-${pIndex}`}>
                                                {/* Program Row */}
                                                <tr className="bg-orange-200 dark:bg-orange-900/40 divide-x divide-gray-900 dark:divide-gray-600">
                                                    <td className="px-2 py-2 text-center font-medium text-gray-900 dark:text-gray-100">{pIndex + 1}</td>
                                                    <td className="px-2 py-2"></td>
                                                    <td className="px-2 py-2 font-medium text-gray-900 dark:text-gray-100">{progCode}</td>
                                                    <td className="px-4 py-2 font-bold text-gray-900 dark:text-gray-100">{program.uraian}</td>
                                                    <td className="px-2 py-2 text-center">-</td>
                                                    <td className="px-2 py-2 text-center">-</td>
                                                    <td className="px-2 py-2 text-center">-</td>
                                                    <td className="px-2 py-2 text-right font-bold text-gray-900 dark:text-gray-100">{formatCurrency(programMonthTotal)}</td>
                                                </tr>

                                                {/* Sub Programs (Kegiatan) */}
                                                {program.sub_programs && Object.entries(program.sub_programs).map(([subCode, subProgram]: [string, any], sIndex) => {
                                                    const subTotal = Object.values(subProgram.uraian_programs || {}).reduce((urTotal: number, ur: any) =>
                                                        urTotal + (ur.items || []).reduce((itemTotal: number, item: any) => itemTotal + (item.bulanan?.[selectedMonth]?.total || 0), 0)
                                                        , 0);

                                                    return (
                                                        <Fragment key={`mon-sub-${pIndex}-${sIndex}`}>
                                                            <tr className="bg-green-200 dark:bg-green-900/40 divide-x divide-gray-900 dark:divide-gray-600">
                                                                <td className="px-2 py-2 text-center font-medium text-gray-900 dark:text-gray-100">{pIndex + 1}.{sIndex + 1}</td>
                                                                <td className="px-2 py-2"></td>
                                                                <td className="px-2 py-2 font-medium text-gray-900 dark:text-gray-100">{subCode}</td>
                                                                <td className="px-4 py-2 font-medium text-gray-900 dark:text-gray-100">{subProgram.uraian}</td>
                                                                <td className="px-2 py-2 text-center">-</td>
                                                                <td className="px-2 py-2 text-center">-</td>
                                                                <td className="px-2 py-2 text-center">-</td>
                                                                <td className="px-2 py-2 text-right font-bold text-gray-900 dark:text-gray-100">{formatCurrency(subTotal)}</td>
                                                            </tr>

                                                            {/* Uraian Programs (Sub Kegiatan) */}
                                                            {subProgram.uraian_programs && Object.entries(subProgram.uraian_programs).map(([urCode, urProgram]: [string, any], uIndex) => {
                                                                const urTotal = (urProgram.items || []).reduce((itemTotal: number, item: any) => itemTotal + (item.bulanan?.[selectedMonth]?.total || 0), 0);

                                                                return (
                                                                    <Fragment key={`mon-ur-${pIndex}-${sIndex}-${uIndex}`}>
                                                                        <tr className="bg-teal-200 dark:bg-teal-900/40 divide-x divide-gray-900 dark:divide-gray-600">
                                                                            <td className="px-2 py-2 text-center font-medium text-gray-900 dark:text-gray-100">{pIndex + 1}.{sIndex + 1}.{uIndex + 1}</td>
                                                                            <td className="px-2 py-2"></td>
                                                                            <td className="px-2 py-2 font-medium text-gray-900 dark:text-gray-100">{urCode}</td>
                                                                            <td className="px-4 py-2 font-medium text-gray-900 dark:text-gray-100">{urProgram.uraian}</td>
                                                                            <td className="px-2 py-2 text-center">-</td>
                                                                            <td className="px-2 py-2 text-center">-</td>
                                                                            <td className="px-2 py-2 text-center">-</td>
                                                                            <td className="px-2 py-2 text-right font-bold text-gray-900 dark:text-gray-100">{formatCurrency(urTotal)}</td>
                                                                        </tr>

                                                                        {/* Items */}
                                                                        {urProgram.items && urProgram.items.map((item: any, iIndex: number) => {
                                                                            const monthlyData = item.bulanan?.[selectedMonth];
                                                                            const monthlyVolume = monthlyData?.volume || 0;
                                                                            const monthlyTotal = monthlyData?.total || 0;

                                                                            return (
                                                                                <tr key={`mon-item-${pIndex}-${sIndex}-${uIndex}-${iIndex}`} className="bg-amber-100 dark:bg-amber-900/10 hover:bg-amber-200 dark:hover:bg-amber-900/20 divide-x divide-gray-900 dark:divide-gray-600">
                                                                                    <td className="px-2 py-2 text-center text-gray-600 dark:text-gray-400"></td>
                                                                                    <td className="px-2 py-2 text-sm text-gray-800 dark:text-gray-200">{item.kode_rekening}</td>
                                                                                    <td className="px-2 py-2 text-sm text-gray-800 dark:text-gray-200">{item.program_code}</td>
                                                                                    <td className="px-4 py-2 text-sm text-gray-800 dark:text-gray-200">{item.uraian}</td>
                                                                                    <td className="px-2 py-2 text-center text-sm text-gray-800 dark:text-gray-200">
                                                                                        {monthlyVolume > 0 ? monthlyVolume : '-'}
                                                                                    </td>
                                                                                    <td className="px-2 py-2 text-center text-sm text-gray-800 dark:text-gray-200">{item.satuan}</td>
                                                                                    <td className="px-2 py-2 text-right text-sm text-gray-800 dark:text-gray-200">
                                                                                        {formatCurrency(item.tarif)}
                                                                                    </td>
                                                                                    <td className="px-2 py-2 text-right font-medium text-gray-900 dark:text-gray-100">
                                                                                        {formatCurrency(monthlyTotal)}
                                                                                    </td>
                                                                                </tr>
                                                                            );
                                                                        })}
                                                                    </Fragment>
                                                                )
                                                            })}
                                                        </Fragment>
                                                    )
                                                })}
                                            </Fragment>
                                        );
                                    })}
                                    <tr className="bg-white dark:bg-gray-800 font-bold divide-x divide-gray-900 dark:divide-gray-600 border-t border-gray-900 dark:border-gray-600">
                                        <td colSpan={7} className="px-4 py-2 text-left uppercase">Jumlah Belanja</td>
                                        <td className="px-4 py-2 text-right">
                                            {formatCurrency(Object.values(rkaBulananData || {}).reduce((acc: number, prog: any) =>
                                                acc + Object.values(prog.sub_programs || {}).reduce((sAcc: number, sub: any) =>
                                                    sAcc + Object.values(sub.uraian_programs || {}).reduce((uAcc: number, ur: any) =>
                                                        uAcc + (ur.items || []).reduce((iAcc: number, item: any) => iAcc + (item.bulanan?.[selectedMonth]?.total || 0), 0)
                                                        , 0)
                                                    , 0)
                                                , 0))}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Footer Signatures */}
                    <div className="mt-12 flex justify-between text-sm text-gray-900 dark:text-gray-100 px-4">
                        <div className="text-center mt-8">
                            <p className="mb-20">Komite Sekolah,</p>
                            <p className="font-bold underline uppercase">{anggaran.komite || '-'}</p>
                        </div>

                        <div className="text-center">
                            <p className="mb-1">Mengetahui,</p>
                            <p className="mb-20">Kepala Sekolah,</p>
                            <p className="font-bold underline uppercase">{anggaran.kepala_sekolah || '-'}</p>
                            <p>NIP. {anggaran.nip_kepala_sekolah || '-'}</p>
                        </div>

                        <div className="text-center">
                            <p className="mb-1">{anggaran.sekolah?.kecamatan || '...'}, {formatDateSafe(anggaran.tanggal_cetak, 'd MMMM yyyy')}</p>
                            <p className="mb-20">Bendahara,</p>
                            <p className="font-bold underline uppercase">{anggaran.bendahara || '-'}</p>
                            <p>NIP. {anggaran.nip_bendahara || '-'}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
