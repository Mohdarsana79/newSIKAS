import { Fragment } from 'react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

interface TabRkaTahapanV1Props {
    anggaran: any;
    tahapanData: any;
    onPrint: (target: string) => void;
    onExportExcel: (target: string) => void;
}

export default function TabRkaTahapanV1({ anggaran, tahapanData, onPrint, onExportExcel }: TabRkaTahapanV1Props) {
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('id-ID').format(amount);
    };

    const formatDateSafe = (dateStr: string | undefined, formatStr: string = 'd MMMM yyyy') => {
        if (!dateStr) return '...';
        try {
            const datePart = dateStr.split(/[ T]/)[0];
            const [y, m, d] = datePart.split('-').map(Number);
            return format(new Date(y, m - 1, d), formatStr, { locale: id });
        } catch (e) {
            return '...';
        }
    };

    const filteredPrograms = tahapanData
        ? Object.entries(tahapanData)
              .map(([progCode, program]: [string, any]) => {
                  const activeSubPrograms = program.sub_programs
                      ? Object.entries(program.sub_programs)
                            .map(([subCode, subProgram]: [string, any]) => {
                                const activeUraians = subProgram.uraian_programs
                                    ? Object.entries(subProgram.uraian_programs)
                                          .map(([urCode, urProgram]: [string, any]) => {
                                              const activeItems = (urProgram.items || []).filter(
                                                  (item: any) => (item.volume ?? 0) > 0 || (item.jumlah ?? 0) > 0
                                              );
                                              return {
                                                  urCode,
                                                  ...urProgram,
                                                  items: activeItems,
                                              };
                                          })
                                          .filter((ur) => ur.items.length > 0 && (ur.jumlah ?? 0) > 0)
                                    : [];
                                return {
                                    subCode,
                                    ...subProgram,
                                    uraian_programs: activeUraians,
                                };
                            })
                            .filter((sub) => sub.uraian_programs.length > 0 && (sub.jumlah ?? 0) > 0)
                      : [];
                  return {
                      progCode,
                      ...program,
                      sub_programs: activeSubPrograms,
                  };
              })
              .filter((prog) => prog.sub_programs.length > 0 && (prog.jumlah ?? 0) > 0)
        : [];

    return (
        <div className="space-y-8 animate-fade-in-up">
            {/* Action Buttons */}
            <div className="flex justify-end mb-4 gap-2">
                <button
                    onClick={() => onPrint('tahapan_v1')}
                    className="bg-indigo-600 text-white hover:bg-indigo-700 px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 shadow-sm transition-colors"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Pengaturan Cetak
                </button>
            </div>

            <div className="bg-white dark:bg-gray-800 p-8 border border-gray-200 dark:border-gray-700 shadow-sm rounded-lg print:border-none print:shadow-none">
                {/* Header Laporan */}
                <div className="text-center mb-8">
                    <h2 className="text-lg font-bold uppercase tracking-wider text-gray-900 dark:text-gray-100">
                        KERTAS KERJA RENCANA KEGIATAN DAN ANGGARAN SEKOLAH (RKAS) PER TAHAP
                    </h2>
                    <h3 className="text-md font-medium uppercase text-gray-600 dark:text-gray-400 mt-1">
                        TAHUN ANGGARAN : {anggaran.tahun_anggaran}
                    </h3>
                </div>

                {/* Profil Sekolah */}
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

                    <div className="text-gray-600 dark:text-gray-400">Tahap</div>
                    <div>:</div>
                    <div className="font-medium text-gray-900 dark:text-gray-100">I dan II</div>
                </div>

                <div className="space-y-6">
                    {/* A. PENERIMAAN */}
                    <div>
                        <h4 className="text-sm font-bold text-gray-900 dark:text-white uppercase mb-1">A. Penerimaan</h4>
                        <div className="text-sm italic mb-1 text-gray-600">Sumber Dana :</div>
                        <div className="border border-gray-900 dark:border-gray-600">
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
                                        <td className="px-4 py-2 text-right font-medium">Rp. {formatCurrency(anggaran.pagu_anggaran)}</td>
                                    </tr>
                                    <tr className="bg-gray-200 dark:bg-gray-700/50 font-bold border-t border-gray-900 dark:border-gray-600">
                                        <td colSpan={2} className="px-4 py-2 border-r border-gray-900 dark:border-gray-600">Total Penerimaan</td>
                                        <td className="px-4 py-2 text-right">Rp. {formatCurrency(anggaran.pagu_anggaran)}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* B. BELANJA (10 Kolom) */}
                    <div>
                        <h4 className="text-sm font-bold text-gray-900 dark:text-white uppercase mb-1">B. Belanja</h4>
                        <div className="border border-gray-900 dark:border-gray-600 overflow-x-auto">
                            <table className="min-w-full text-sm divide-y divide-gray-900 dark:divide-gray-600">
                                <thead className="bg-gray-100 dark:bg-gray-700 border-b border-gray-900 dark:border-gray-600">
                                    <tr className="divide-x divide-gray-900 dark:divide-gray-600">
                                        <th rowSpan={2} className="px-2 py-2 text-center font-bold text-gray-900 dark:text-gray-100 w-10">No.</th>
                                        <th rowSpan={2} className="px-2 py-2 text-center font-bold text-gray-900 dark:text-gray-100 w-32">Kode Rekening</th>
                                        <th rowSpan={2} className="px-2 py-2 text-center font-bold text-gray-900 dark:text-gray-100 w-24">Kode Program</th>
                                        <th rowSpan={2} className="px-4 py-2 text-center font-bold text-gray-900 dark:text-gray-100">Uraian</th>
                                        <th colSpan={3} className="px-2 py-2 text-center font-bold text-gray-900 dark:text-gray-100 border-b border-gray-900 dark:border-gray-600">Rincian Perhitungan</th>
                                        <th rowSpan={2} className="px-2 py-2 text-right font-bold text-gray-900 dark:text-gray-100 w-32">Jumlah</th>
                                        <th colSpan={2} className="px-2 py-2 text-center font-bold text-gray-900 dark:text-gray-100 border-b border-gray-900 dark:border-gray-600">Tahap</th>
                                    </tr>
                                    <tr className="divide-x divide-gray-900 dark:divide-gray-600">
                                        <th className="px-2 py-1 text-center font-bold text-xs">Volume</th>
                                        <th className="px-2 py-1 text-center font-bold text-xs">Satuan</th>
                                        <th className="px-2 py-1 text-center font-bold text-xs">Tarif Harga</th>
                                        <th className="px-2 py-1 text-center font-bold text-xs w-24">1</th>
                                        <th className="px-2 py-1 text-center font-bold text-xs w-24">2</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-900 dark:divide-gray-600">
                                    {filteredPrograms.map((program: any, pIndex: number) => (
                                        <Fragment key={`prog-fragment-${pIndex}`}>
                                            {/* 1. Baris Program (Oranye) */}
                                            <tr className="bg-orange-200 dark:bg-orange-900/50 divide-x divide-gray-900 dark:divide-gray-600">
                                                <td className="px-2 py-2 text-center font-medium text-gray-900 dark:text-gray-100">{pIndex + 1}</td>
                                                <td className="px-2 py-2"></td>
                                                <td className="px-2 py-2 text-center font-medium text-gray-900 dark:text-gray-100">{program.progCode}</td>
                                                <td className="px-4 py-2 font-bold text-gray-900 dark:text-gray-100">{program.uraian}</td>
                                                <td className="px-2 py-2 text-center">-</td>
                                                <td className="px-2 py-2 text-center">-</td>
                                                <td className="px-2 py-2 text-center">-</td>
                                                <td className="px-2 py-2 text-right font-bold text-gray-900 dark:text-gray-100">{formatCurrency(program.jumlah)}</td>
                                                <td className="px-2 py-2 text-right font-medium text-gray-900 dark:text-gray-100">{formatCurrency(program.tahap1)}</td>
                                                <td className="px-2 py-2 text-right font-medium text-gray-900 dark:text-gray-100">{formatCurrency(program.tahap2)}</td>
                                            </tr>

                                            {/* 2. Baris Sub-Program (Hijau) */}
                                            {program.sub_programs.map((subProgram: any, sIndex: number) => (
                                                <Fragment key={`sub-fragment-${pIndex}-${sIndex}`}>
                                                    <tr className="bg-green-200 dark:bg-green-900/50 divide-x divide-gray-900 dark:divide-gray-600">
                                                        <td className="px-2 py-2 text-center font-medium text-gray-900 dark:text-gray-100">{pIndex + 1}.{sIndex + 1}</td>
                                                        <td className="px-2 py-2"></td>
                                                        <td className="px-2 py-2 text-center font-medium text-gray-900 dark:text-gray-100">{subProgram.subCode}</td>
                                                        <td className="px-4 py-2 font-bold text-gray-900 dark:text-gray-100">{subProgram.uraian}</td>
                                                        <td className="px-2 py-2 text-center">-</td>
                                                        <td className="px-2 py-2 text-center">-</td>
                                                        <td className="px-2 py-2 text-center">-</td>
                                                        <td className="px-2 py-2 text-right font-bold text-gray-900 dark:text-gray-100">{formatCurrency(subProgram.jumlah)}</td>
                                                        <td className="px-2 py-2 text-right font-medium text-gray-900 dark:text-gray-100">{formatCurrency(subProgram.tahap1)}</td>
                                                        <td className="px-2 py-2 text-right font-medium text-gray-900 dark:text-gray-100">{formatCurrency(subProgram.tahap2)}</td>
                                                    </tr>

                                                    {/* 3. Baris Uraian Program (Toska) */}
                                                    {subProgram.uraian_programs.map((urProgram: any, uIndex: number) => (
                                                        <Fragment key={`ur-fragment-${pIndex}-${sIndex}-${uIndex}`}>
                                                            <tr className="bg-teal-200 dark:bg-teal-900/50 divide-x divide-gray-900 dark:divide-gray-600">
                                                                <td className="px-2 py-2 text-center font-medium text-gray-900 dark:text-gray-100">{pIndex + 1}.{sIndex + 1}.{uIndex + 1}</td>
                                                                <td className="px-2 py-2"></td>
                                                                <td className="px-2 py-2 text-center font-medium text-gray-900 dark:text-gray-100">
                                                                    {urProgram.urCode.toString().includes('.') ? urProgram.urCode : `${subProgram.subCode}.${urProgram.urCode}`}
                                                                </td>
                                                                <td className="px-4 py-2 font-medium text-gray-900 dark:text-gray-100">{urProgram.uraian}</td>
                                                                <td className="px-2 py-2 text-center">-</td>
                                                                <td className="px-2 py-2 text-center">-</td>
                                                                <td className="px-2 py-2 text-center">-</td>
                                                                <td className="px-2 py-2 text-right font-bold text-gray-900 dark:text-gray-100">{formatCurrency(urProgram.jumlah)}</td>
                                                                <td className="px-2 py-2 text-right font-medium text-gray-900 dark:text-gray-100">{formatCurrency(urProgram.tahap1)}</td>
                                                                <td className="px-2 py-2 text-right font-medium text-gray-900 dark:text-gray-100">{formatCurrency(urProgram.tahap2)}</td>
                                                            </tr>

                                                            {/* 4. Baris Belanja Item (Putih) */}
                                                            {urProgram.items.map((item: any, iIndex: number) => (
                                                                <tr key={`item-${pIndex}-${sIndex}-${uIndex}-${iIndex}`} className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50 divide-x divide-gray-900 dark:divide-gray-600">
                                                                    <td className="px-2 py-2 text-center text-gray-600 dark:text-gray-400"></td>
                                                                    <td className="px-2 py-2 text-sm text-gray-800 dark:text-gray-200">{item.kode_rekening}</td>
                                                                    <td className="px-2 py-2 text-center text-sm text-gray-800 dark:text-gray-200">
                                                                        {urProgram.urCode.toString().includes('.') ? urProgram.urCode : `${subProgram.subCode}.${urProgram.urCode}`}
                                                                    </td>
                                                                    <td className="px-4 py-2 text-sm text-gray-800 dark:text-gray-200">{item.uraian}</td>
                                                                    <td className="px-2 py-2 text-center text-sm text-gray-600 dark:text-gray-400">{item.volume}</td>
                                                                    <td className="px-2 py-2 text-center text-sm text-gray-600 dark:text-gray-400">{item.satuan}</td>
                                                                    <td className="px-2 py-2 text-right text-sm text-gray-600 dark:text-gray-400">{formatCurrency(item.tarif)}</td>
                                                                    <td className="px-2 py-2 text-right font-medium text-gray-900 dark:text-gray-100">{formatCurrency(item.jumlah)}</td>
                                                                    <td className="px-2 py-2 text-right text-sm text-gray-600 dark:text-gray-400">{item.tahap1 > 0 ? formatCurrency(item.tahap1) : '0'}</td>
                                                                    <td className="px-2 py-2 text-right text-sm text-gray-600 dark:text-gray-400">{item.tahap2 > 0 ? formatCurrency(item.tahap2) : '0'}</td>
                                                                </tr>
                                                            ))}
                                                        </Fragment>
                                                    ))}
                                                </Fragment>
                                            ))}
                                        </Fragment>
                                    ))}

                                    {/* Footer Total */}
                                    <tr className="bg-gray-200 dark:bg-gray-700 font-bold border-t-2 border-gray-900 dark:border-gray-500 divide-x divide-gray-900 dark:divide-gray-600">
                                        <td colSpan={7} className="px-4 py-2 text-center uppercase">Jumlah Total</td>
                                        <td className="px-2 py-2 text-right">
                                            {formatCurrency(filteredPrograms.reduce((acc: number, prog: any) => acc + (prog.jumlah || 0), 0))}
                                        </td>
                                        <td className="px-2 py-2 text-right">
                                            {formatCurrency(filteredPrograms.reduce((acc: number, prog: any) => acc + (prog.tahap1 || 0), 0))}
                                        </td>
                                        <td className="px-2 py-2 text-right">
                                            {formatCurrency(filteredPrograms.reduce((acc: number, prog: any) => acc + (prog.tahap2 || 0), 0))}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Footer Tanda Tangan */}
                    <div className="mt-12 flex justify-between text-sm text-gray-900 dark:text-gray-100 px-8">
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
                            <p className="mb-1">Kec. {anggaran.sekolah?.kecamatan || '...'}, {formatDateSafe(anggaran.tanggal_perubahan)}</p>
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
