import { Fragment } from 'react';

import {
    type PublicRkaProgramNode,
    type PublicRkaTahapanData,
    type PublicSekolah,
    formatNumber,
    formatRupiah,
    formatVolume,
} from '../types';

interface RkaTahapanOfficialTableProps {
    data: PublicRkaTahapanData;
    programs: PublicRkaProgramNode[];
    sekolah: PublicSekolah;
    penanggungJawab: {
        kepala_sekolah: string;
        bendahara: string;
        komite: string;
    };
}

export default function RkaTahapanOfficialTable({
    data,
    programs,
    sekolah,
    penanggungJawab,
}: RkaTahapanOfficialTableProps) {
    const isPerubahan = data.meta.jenis === 'perubahan';

    const filteredTotals = programs.reduce(
        (acc, prog) => ({
            jumlahMurni: acc.jumlahMurni + prog.jumlah_murni,
            jumlah: acc.jumlah + prog.jumlah,
            bertambah: acc.bertambah + prog.bertambah,
            berkurang: acc.berkurang + prog.berkurang,
            tahap1: acc.tahap1 + prog.tahap1,
            tahap2: acc.tahap2 + prog.tahap2,
        }),
        { jumlahMurni: 0, jumlah: 0, bertambah: 0, berkurang: 0, tahap1: 0, tahap2: 0 },
    );

    return (
        <div className="rounded-2xl border border-[#DCEBEB] bg-white p-5 shadow-sm dark:border-[#8BE6DC]/15 dark:bg-[#0B222C] sm:p-8">
            {/* Judul Kertas Kerja */}
            <div className="mb-6 text-center">
                <h3 className="text-base font-extrabold uppercase tracking-wider text-slate-900 dark:text-white sm:text-lg">
                    {isPerubahan
                        ? 'KERTAS KERJA RKAS PERUBAHAN PER TAHAP'
                        : 'KERTAS KERJA RENCANA KEGIATAN DAN ANGGARAN SEKOLAH (RKAS) PER TAHAP'}
                </h3>
                <p className="mt-1 text-sm font-semibold uppercase text-slate-600 dark:text-slate-300">
                    {data.meta.variant_label} · TAHUN ANGGARAN {data.meta.tahun}
                </p>
            </div>

            {/* Identitas Sekolah */}
            <div className="mb-6 grid grid-cols-[130px_10px_1fr] gap-y-1 text-xs sm:grid-cols-[150px_10px_1fr] sm:text-sm">
                <div className="text-slate-500 dark:text-slate-400">NPSN</div>
                <div className="text-slate-500">:</div>
                <div className="font-semibold text-slate-900 dark:text-white">{sekolah.npsn || '-'}</div>

                <div className="text-slate-500 dark:text-slate-400">Nama Sekolah</div>
                <div className="text-slate-500">:</div>
                <div className="font-semibold text-slate-900 dark:text-white">{sekolah.nama_sekolah || '-'}</div>

                <div className="text-slate-500 dark:text-slate-400">Alamat</div>
                <div className="text-slate-500">:</div>
                <div className="font-semibold text-slate-900 dark:text-white">{sekolah.alamat || sekolah.alamat_lengkap || '-'}</div>

                <div className="text-slate-500 dark:text-slate-400">Kabupaten / Kota</div>
                <div className="text-slate-500">:</div>
                <div className="font-semibold text-slate-900 dark:text-white">{sekolah.kabupaten_kota || '-'}</div>

                <div className="text-slate-500 dark:text-slate-400">Provinsi</div>
                <div className="text-slate-500">:</div>
                <div className="font-semibold text-slate-900 dark:text-white">{sekolah.provinsi || '-'}</div>

                <div className="text-slate-500 dark:text-slate-400">Tahap</div>
                <div className="text-slate-500">:</div>
                <div className="font-semibold text-slate-900 dark:text-white">I dan II</div>
            </div>

            <div className="space-y-6">
                {/* A. Penerimaan */}
                <div>
                    <h4 className="mb-1 text-xs font-extrabold uppercase tracking-wider text-slate-900 dark:text-white sm:text-sm">
                        A. Penerimaan
                    </h4>
                    <div className="overflow-x-auto rounded-lg border border-slate-400 dark:border-white/25">
                        <table className="min-w-full text-xs sm:text-sm">
                            <thead className="border-b border-slate-400 bg-slate-100 dark:border-white/25 dark:bg-white/[0.06]">
                                <tr>
                                    <th className="w-28 border-r border-slate-400 px-3 py-2 text-center font-bold text-slate-900 dark:border-white/25 dark:text-white">
                                        No Kode
                                    </th>
                                    <th className="border-r border-slate-400 px-3 py-2 text-center font-bold text-slate-900 dark:border-white/25 dark:text-white">
                                        Penerimaan
                                    </th>
                                    <th className="w-44 px-3 py-2 text-right font-bold text-slate-900 dark:text-white">
                                        Jumlah
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-300 dark:divide-white/15">
                                <tr>
                                    <td className="border-r border-slate-300 px-3 py-2 font-medium text-slate-800 dark:border-white/15 dark:text-slate-200">
                                        4.3.1.01.
                                    </td>
                                    <td className="border-r border-slate-300 px-3 py-2 text-slate-800 dark:border-white/15 dark:text-slate-200">
                                        {data.meta.sumber_dana}
                                    </td>
                                    <td className="px-3 py-2 text-right font-semibold tabular-nums text-slate-900 dark:text-white">
                                        {formatRupiah(data.meta.pagu_anggaran)}
                                    </td>
                                </tr>
                                <tr className="bg-slate-100 font-bold dark:bg-white/[0.05]">
                                    <td colSpan={2} className="border-r border-slate-300 px-3 py-2 text-slate-900 dark:border-white/15 dark:text-white">
                                        Total Penerimaan
                                    </td>
                                    <td className="px-3 py-2 text-right tabular-nums text-slate-900 dark:text-white">
                                        {formatRupiah(data.meta.pagu_anggaran)}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* B. Belanja */}
                <div>
                    <div className="mb-1 flex items-center justify-between gap-2">
                        <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 dark:text-white sm:text-sm">
                            B. Belanja
                        </h4>
                        <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                            Geser tabel ke samping bila layar sempit
                        </span>
                    </div>

                    <div className="overflow-x-auto rounded-lg border border-slate-400 dark:border-white/25">
                        {isPerubahan ? (
                            <PerubahanOfficialTable programs={programs} totals={filteredTotals} />
                        ) : (
                            <AwalOfficialTable programs={programs} totals={filteredTotals} />
                        )}
                    </div>
                </div>

                {/* Blok Penanggung Jawab Publik (Tanpa NIP) */}
                <div className="mt-8 grid grid-cols-1 gap-6 border-t border-slate-200 pt-6 text-center text-xs text-slate-800 dark:border-white/15 dark:text-slate-200 sm:grid-cols-3 sm:text-sm">
                    <div>
                        <p className="text-slate-500 dark:text-slate-400">Komite Sekolah,</p>
                        <p className="mt-8 font-bold uppercase underline">{penanggungJawab.komite || '-'}</p>
                    </div>
                    <div>
                        <p className="text-slate-500 dark:text-slate-400">Mengetahui, Kepala Sekolah</p>
                        <p className="mt-8 font-bold uppercase underline">{penanggungJawab.kepala_sekolah || '-'}</p>
                    </div>
                    <div>
                        <p className="text-slate-500 dark:text-slate-400">
                            {data.meta.tanggal_dokumen_formatted ? `${data.meta.tanggal_dokumen_formatted} · ` : ''}
                            Bendahara BOSP
                        </p>
                        <p className="mt-8 font-bold uppercase underline">{penanggungJawab.bendahara || '-'}</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

function AwalOfficialTable({
    programs,
    totals,
}: {
    programs: PublicRkaProgramNode[];
    totals: { jumlah: number; tahap1: number; tahap2: number };
}) {
    return (
        <table className="min-w-[920px] w-full divide-y divide-slate-400 text-xs dark:divide-white/20">
            <thead className="bg-slate-100 text-slate-900 dark:bg-white/[0.06] dark:text-white">
                <tr className="divide-x divide-slate-400 dark:divide-white/20">
                    <th rowSpan={2} className="w-10 px-2 py-2 text-center font-bold">No.</th>
                    <th rowSpan={2} className="w-32 px-2 py-2 text-center font-bold">Kode Rekening</th>
                    <th rowSpan={2} className="w-24 px-2 py-2 text-center font-bold">Kode Program</th>
                    <th rowSpan={2} className="px-3 py-2 text-center font-bold">Uraian</th>
                    <th colSpan={3} className="border-b border-slate-400 px-2 py-1.5 text-center font-bold dark:border-white/20">
                        Rincian Perhitungan
                    </th>
                    <th rowSpan={2} className="w-28 px-2 py-2 text-right font-bold">Jumlah</th>
                    <th colSpan={2} className="border-b border-slate-400 px-2 py-1.5 text-center font-bold dark:border-white/20">
                        Tahap
                    </th>
                </tr>
                <tr className="divide-x divide-slate-400 dark:divide-white/20">
                    <th className="px-2 py-1 text-center font-bold">Volume</th>
                    <th className="px-2 py-1 text-center font-bold">Satuan</th>
                    <th className="px-2 py-1 text-center font-bold">Tarif Harga</th>
                    <th className="w-24 px-2 py-1 text-center font-bold">Tahap 1</th>
                    <th className="w-24 px-2 py-1 text-center font-bold">Tahap 2</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-300 tabular-nums dark:divide-white/15">
                {programs.map((program, pIdx) => (
                    <Fragment key={program.kode}>
                        <tr className="divide-x divide-slate-300 bg-orange-100/90 font-bold text-slate-900 dark:divide-white/15 dark:bg-orange-900/35 dark:text-white">
                            <td className="px-2 py-2 text-center">{pIdx + 1}</td>
                            <td className="px-2 py-2" />
                            <td className="px-2 py-2 text-center">{program.kode}</td>
                            <td className="px-3 py-2">{program.uraian}</td>
                            <td className="px-2 py-2 text-center">-</td>
                            <td className="px-2 py-2 text-center">-</td>
                            <td className="px-2 py-2 text-center">-</td>
                            <td className="px-2 py-2 text-right">{formatNumber(program.jumlah)}</td>
                            <td className="px-2 py-2 text-right">{formatNumber(program.tahap1)}</td>
                            <td className="px-2 py-2 text-right">{formatNumber(program.tahap2)}</td>
                        </tr>
                        {program.sub_programs.map((sub, sIdx) => (
                            <Fragment key={sub.kode}>
                                <tr className="divide-x divide-slate-300 bg-emerald-100/80 font-semibold text-slate-900 dark:divide-white/15 dark:bg-emerald-900/30 dark:text-white">
                                    <td className="px-2 py-1.5 text-center">{pIdx + 1}.{sIdx + 1}</td>
                                    <td className="px-2 py-1.5" />
                                    <td className="px-2 py-1.5 text-center">{sub.kode}</td>
                                    <td className="px-3 py-1.5">{sub.uraian}</td>
                                    <td className="px-2 py-1.5 text-center">-</td>
                                    <td className="px-2 py-1.5 text-center">-</td>
                                    <td className="px-2 py-1.5 text-center">-</td>
                                    <td className="px-2 py-1.5 text-right">{formatNumber(sub.jumlah)}</td>
                                    <td className="px-2 py-1.5 text-right">{formatNumber(sub.tahap1)}</td>
                                    <td className="px-2 py-1.5 text-right">{formatNumber(sub.tahap2)}</td>
                                </tr>
                                {sub.uraian_programs.map((ur, uIdx) => (
                                    <Fragment key={ur.kode}>
                                        <tr className="divide-x divide-slate-300 bg-teal-100/75 font-medium text-slate-900 dark:divide-white/15 dark:bg-teal-900/30 dark:text-white">
                                            <td className="px-2 py-1.5 text-center">{pIdx + 1}.{sIdx + 1}.{uIdx + 1}</td>
                                            <td className="px-2 py-1.5" />
                                            <td className="px-2 py-1.5 text-center">{ur.kode}</td>
                                            <td className="px-3 py-1.5">{ur.uraian}</td>
                                            <td className="px-2 py-1.5 text-center">-</td>
                                            <td className="px-2 py-1.5 text-center">-</td>
                                            <td className="px-2 py-1.5 text-center">-</td>
                                            <td className="px-2 py-1.5 text-right">{formatNumber(ur.jumlah)}</td>
                                            <td className="px-2 py-1.5 text-right">{formatNumber(ur.tahap1)}</td>
                                            <td className="px-2 py-1.5 text-right">{formatNumber(ur.tahap2)}</td>
                                        </tr>
                                        {ur.items.map((item, iIdx) => (
                                            <tr
                                                key={`${ur.kode}-${item.kode_rekening}-${iIdx}`}
                                                className="divide-x divide-slate-300 bg-white text-slate-700 hover:bg-[#F1F9F9] dark:divide-white/15 dark:bg-[#0B222C] dark:text-slate-200 dark:hover:bg-white/[0.04]"
                                            >
                                                <td className="px-2 py-1.5 text-center" />
                                                <td className="px-2 py-1.5 font-mono text-[11px]">{item.kode_rekening}</td>
                                                <td className="px-2 py-1.5 text-center">{item.kode_kegiatan}</td>
                                                <td className="px-3 py-1.5">{item.uraian}</td>
                                                <td className="px-2 py-1.5 text-center">{formatVolume(item.volume)}</td>
                                                <td className="px-2 py-1.5 text-center">{item.satuan}</td>
                                                <td className="px-2 py-1.5 text-right">{formatNumber(item.tarif)}</td>
                                                <td className="px-2 py-1.5 text-right font-semibold text-slate-900 dark:text-white">
                                                    {formatNumber(item.jumlah)}
                                                </td>
                                                <td className="px-2 py-1.5 text-right">{formatNumber(item.tahap1)}</td>
                                                <td className="px-2 py-1.5 text-right">{formatNumber(item.tahap2)}</td>
                                            </tr>
                                        ))}
                                    </Fragment>
                                ))}
                            </Fragment>
                        ))}
                    </Fragment>
                ))}
                <tr className="divide-x divide-slate-400 border-t-2 border-slate-500 bg-slate-200 font-extrabold text-slate-900 dark:divide-white/20 dark:border-white/30 dark:bg-white/[0.08] dark:text-white">
                    <td colSpan={7} className="px-3 py-2 text-center uppercase">
                        Jumlah Total
                    </td>
                    <td className="px-2 py-2 text-right">{formatNumber(totals.jumlah)}</td>
                    <td className="px-2 py-2 text-right">{formatNumber(totals.tahap1)}</td>
                    <td className="px-2 py-2 text-right">{formatNumber(totals.tahap2)}</td>
                </tr>
            </tbody>
        </table>
    );
}

function PerubahanOfficialTable({
    programs,
    totals,
}: {
    programs: PublicRkaProgramNode[];
    totals: {
        jumlahMurni: number;
        jumlah: number;
        bertambah: number;
        berkurang: number;
        tahap1: number;
        tahap2: number;
    };
}) {
    return (
        <table className="min-w-[1280px] w-full divide-y divide-slate-400 text-[11px] dark:divide-white/20">
            <thead className="bg-slate-100 text-slate-900 dark:bg-white/[0.06] dark:text-white">
                <tr className="divide-x divide-slate-400 dark:divide-white/20">
                    <th rowSpan={2} className="w-10 px-1.5 py-2 text-center font-bold">No.</th>
                    <th rowSpan={2} className="w-28 px-2 py-2 text-center font-bold">Kode Rekening</th>
                    <th rowSpan={2} className="w-20 px-1.5 py-2 text-center font-bold">Kode Program</th>
                    <th rowSpan={2} className="px-2.5 py-2 text-center font-bold">Uraian</th>
                    <th colSpan={4} className="border-b border-slate-400 px-1 py-1.5 text-center font-bold dark:border-white/20">
                        Sebelum Perubahan
                    </th>
                    <th colSpan={4} className="border-b border-slate-400 px-1 py-1.5 text-center font-bold dark:border-white/20">
                        Sesudah Perubahan
                    </th>
                    <th colSpan={2} className="border-b border-slate-400 px-1 py-1.5 text-center font-bold dark:border-white/20">
                        Perubahan
                    </th>
                    <th colSpan={2} className="border-b border-slate-400 px-1 py-1.5 text-center font-bold dark:border-white/20">
                        Tahap
                    </th>
                </tr>
                <tr className="divide-x divide-slate-400 dark:divide-white/20">
                    <th className="px-1 py-1 text-center font-bold">Vol</th>
                    <th className="px-1 py-1 text-center font-bold">Sat</th>
                    <th className="px-1 py-1 text-center font-bold">Tarif</th>
                    <th className="px-1 py-1 text-center font-bold">Jumlah</th>
                    <th className="px-1 py-1 text-center font-bold">Vol</th>
                    <th className="px-1 py-1 text-center font-bold">Sat</th>
                    <th className="px-1 py-1 text-center font-bold">Tarif</th>
                    <th className="px-1 py-1 text-center font-bold">Jumlah</th>
                    <th className="px-1.5 py-1 text-center font-bold">Bertambah</th>
                    <th className="px-1.5 py-1 text-center font-bold">Berkurang</th>
                    <th className="px-1.5 py-1 text-center font-bold">Tahap 1</th>
                    <th className="px-1.5 py-1 text-center font-bold">Tahap 2</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-300 tabular-nums dark:divide-white/15">
                {programs.map((program, pIdx) => (
                    <Fragment key={program.kode}>
                        <tr className="divide-x divide-slate-300 bg-orange-100/90 font-bold text-slate-900 dark:divide-white/15 dark:bg-orange-900/35 dark:text-white">
                            <td className="px-1.5 py-2 text-center">{pIdx + 1}</td>
                            <td className="px-2 py-2" />
                            <td className="px-1.5 py-2 text-center">{program.kode}</td>
                            <td className="px-2.5 py-2">{program.uraian}</td>
                            <td className="px-1 py-2 text-center">-</td>
                            <td className="px-1 py-2 text-center">-</td>
                            <td className="px-1 py-2 text-center">-</td>
                            <td className="px-1.5 py-2 text-right">{formatNumber(program.jumlah_murni)}</td>
                            <td className="px-1 py-2 text-center">-</td>
                            <td className="px-1 py-2 text-center">-</td>
                            <td className="px-1 py-2 text-center">-</td>
                            <td className="px-1.5 py-2 text-right">{formatNumber(program.jumlah)}</td>
                            <td className="px-1.5 py-2 text-right text-emerald-700 dark:text-emerald-300">
                                {program.bertambah > 0 ? formatNumber(program.bertambah) : '-'}
                            </td>
                            <td className="px-1.5 py-2 text-right text-rose-700 dark:text-rose-300">
                                {program.berkurang > 0 ? formatNumber(program.berkurang) : '-'}
                            </td>
                            <td className="px-1.5 py-2 text-right">{formatNumber(program.tahap1)}</td>
                            <td className="px-1.5 py-2 text-right">{formatNumber(program.tahap2)}</td>
                        </tr>
                        {program.sub_programs.map((sub, sIdx) => (
                            <Fragment key={sub.kode}>
                                <tr className="divide-x divide-slate-300 bg-emerald-100/80 font-semibold text-slate-900 dark:divide-white/15 dark:bg-emerald-900/30 dark:text-white">
                                    <td className="px-1.5 py-1.5 text-center">{pIdx + 1}.{sIdx + 1}</td>
                                    <td className="px-2 py-1.5" />
                                    <td className="px-1.5 py-1.5 text-center">{sub.kode}</td>
                                    <td className="px-2.5 py-1.5">{sub.uraian}</td>
                                    <td className="px-1 py-1.5 text-center">-</td>
                                    <td className="px-1 py-1.5 text-center">-</td>
                                    <td className="px-1 py-1.5 text-center">-</td>
                                    <td className="px-1.5 py-1.5 text-right">{formatNumber(sub.jumlah_murni)}</td>
                                    <td className="px-1 py-1.5 text-center">-</td>
                                    <td className="px-1 py-1.5 text-center">-</td>
                                    <td className="px-1 py-1.5 text-center">-</td>
                                    <td className="px-1.5 py-1.5 text-right">{formatNumber(sub.jumlah)}</td>
                                    <td className="px-1.5 py-1.5 text-right text-emerald-700 dark:text-emerald-300">
                                        {sub.bertambah > 0 ? formatNumber(sub.bertambah) : '-'}
                                    </td>
                                    <td className="px-1.5 py-1.5 text-right text-rose-700 dark:text-rose-300">
                                        {sub.berkurang > 0 ? formatNumber(sub.berkurang) : '-'}
                                    </td>
                                    <td className="px-1.5 py-1.5 text-right">{formatNumber(sub.tahap1)}</td>
                                    <td className="px-1.5 py-1.5 text-right">{formatNumber(sub.tahap2)}</td>
                                </tr>
                                {sub.uraian_programs.map((ur, uIdx) => (
                                    <Fragment key={ur.kode}>
                                        <tr className="divide-x divide-slate-300 bg-teal-100/75 font-medium text-slate-900 dark:divide-white/15 dark:bg-teal-900/30 dark:text-white">
                                            <td className="px-1.5 py-1.5 text-center">{pIdx + 1}.{sIdx + 1}.{uIdx + 1}</td>
                                            <td className="px-2 py-1.5" />
                                            <td className="px-1.5 py-1.5 text-center">{ur.kode}</td>
                                            <td className="px-2.5 py-1.5">{ur.uraian}</td>
                                            <td className="px-1 py-1.5 text-center">-</td>
                                            <td className="px-1 py-1.5 text-center">-</td>
                                            <td className="px-1 py-1.5 text-center">-</td>
                                            <td className="px-1.5 py-1.5 text-right">{formatNumber(ur.jumlah_murni)}</td>
                                            <td className="px-1 py-1.5 text-center">-</td>
                                            <td className="px-1 py-1.5 text-center">-</td>
                                            <td className="px-1 py-1.5 text-center">-</td>
                                            <td className="px-1.5 py-1.5 text-right">{formatNumber(ur.jumlah)}</td>
                                            <td className="px-1.5 py-1.5 text-right text-emerald-700 dark:text-emerald-300">
                                                {ur.bertambah > 0 ? formatNumber(ur.bertambah) : '-'}
                                            </td>
                                            <td className="px-1.5 py-1.5 text-right text-rose-700 dark:text-rose-300">
                                                {ur.berkurang > 0 ? formatNumber(ur.berkurang) : '-'}
                                            </td>
                                            <td className="px-1.5 py-1.5 text-right">{formatNumber(ur.tahap1)}</td>
                                            <td className="px-1.5 py-1.5 text-right">{formatNumber(ur.tahap2)}</td>
                                        </tr>
                                        {ur.items.map((item, iIdx) => (
                                            <tr
                                                key={`${ur.kode}-${item.kode_rekening}-${iIdx}`}
                                                className="divide-x divide-slate-300 bg-white text-slate-700 hover:bg-[#F1F9F9] dark:divide-white/15 dark:bg-[#0B222C] dark:text-slate-200 dark:hover:bg-white/[0.04]"
                                            >
                                                <td className="px-1.5 py-1.5" />
                                                <td className="px-2 py-1.5 font-mono text-[10.5px]">{item.kode_rekening}</td>
                                                <td className="px-1.5 py-1.5 text-center">{item.kode_kegiatan}</td>
                                                <td className="px-2.5 py-1.5">{item.uraian}</td>
                                                <td className="px-1 py-1.5 text-center">{formatVolume(item.volume_murni)}</td>
                                                <td className="px-1 py-1.5 text-center">{item.volume_murni > 0 ? item.satuan : '-'}</td>
                                                <td className="px-1.5 py-1.5 text-right">{item.volume_murni > 0 ? formatNumber(item.tarif) : '-'}</td>
                                                <td className="px-1.5 py-1.5 text-right">{item.jumlah_murni > 0 ? formatNumber(item.jumlah_murni) : '-'}</td>
                                                <td className="px-1 py-1.5 text-center">{formatVolume(item.volume)}</td>
                                                <td className="px-1 py-1.5 text-center">{item.volume > 0 ? item.satuan : '-'}</td>
                                                <td className="px-1.5 py-1.5 text-right">{item.volume > 0 ? formatNumber(item.tarif) : '-'}</td>
                                                <td className="px-1.5 py-1.5 text-right font-semibold text-slate-900 dark:text-white">
                                                    {item.jumlah > 0 ? formatNumber(item.jumlah) : '-'}
                                                </td>
                                                <td className="px-1.5 py-1.5 text-right font-semibold text-emerald-700 dark:text-emerald-300">
                                                    {item.bertambah > 0 ? formatNumber(item.bertambah) : '-'}
                                                </td>
                                                <td className="px-1.5 py-1.5 text-right font-semibold text-rose-700 dark:text-rose-300">
                                                    {item.berkurang > 0 ? formatNumber(item.berkurang) : '-'}
                                                </td>
                                                <td className="px-1.5 py-1.5 text-right">{formatNumber(item.tahap1)}</td>
                                                <td className="px-1.5 py-1.5 text-right">{formatNumber(item.tahap2)}</td>
                                            </tr>
                                        ))}
                                    </Fragment>
                                ))}
                            </Fragment>
                        ))}
                    </Fragment>
                ))}
                <tr className="divide-x divide-slate-400 border-t-2 border-slate-500 bg-slate-200 font-extrabold text-slate-900 dark:divide-white/20 dark:border-white/30 dark:bg-white/[0.08] dark:text-white">
                    <td colSpan={7} className="px-3 py-2 text-center uppercase">
                        Jumlah Total
                    </td>
                    <td className="px-1.5 py-2 text-right">{formatNumber(totals.jumlahMurni)}</td>
                    <td colSpan={3} />
                    <td className="px-1.5 py-2 text-right">{formatNumber(totals.jumlah)}</td>
                    <td className="px-1.5 py-2 text-right text-emerald-700 dark:text-emerald-300">{formatNumber(totals.bertambah)}</td>
                    <td className="px-1.5 py-2 text-right text-rose-700 dark:text-rose-300">{formatNumber(totals.berkurang)}</td>
                    <td className="px-1.5 py-2 text-right">{formatNumber(totals.tahap1)}</td>
                    <td className="px-1.5 py-2 text-right">{formatNumber(totals.tahap2)}</td>
                </tr>
            </tbody>
        </table>
    );
}
