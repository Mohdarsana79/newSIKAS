import React from 'react';
import Modal from '@/Components/Modal';
import SecondaryButton from '@/Components/SecondaryButton';
import IconTile from '@/Components/ui/IconTile';

export default function ModalDetailSuratPesanan({ show, onClose, suratPesananData }: { show: boolean, onClose: () => void, suratPesananData: any }) {
    const totalKeseluruhan = suratPesananData?.uraian_details?.reduce((acc: number, curr: any) => {
        return acc + (curr.volume * curr.harga_satuan);
    }, 0) || 0;

    return (
        <Modal show={show} onClose={onClose} maxWidth="4xl">
            <div className="relative overflow-hidden">
                <div className="pointer-events-none absolute -right-10 -top-20 h-44 w-44 rounded-full bg-sky/10 blur-3xl" />
                <div className="relative flex items-start justify-between gap-3 border-b border-slate-100 px-6 py-4 dark:border-white/5">
                    <div className="flex min-w-0 items-center gap-3">
                        <IconTile tone="sky" size="md">
                            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h10" />
                            </svg>
                        </IconTile>
                        <div className="min-w-0">
                            <h2 className="truncate text-[14px] font-extrabold tracking-tight text-slate-900 dark:text-white">
                                Detail Barang (Surat Pesanan {suratPesananData?.nomor_sp || 'Tanpa Nomor'})
                            </h2>
                            <p className="truncate text-[10px] font-medium text-slate-400 dark:text-slate-500">
                                Rincian barang beserta harga satuan dan total harga.
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="sikas-icon-btn h-8 w-8"
                        aria-label="Tutup detail"
                    >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="sikas-scroll max-h-[60vh] overflow-y-auto px-6 py-5">
                    <div className="bento-table-wrapper overflow-x-auto">
                        <table className="min-w-full">
                            <thead>
                                <tr>
                                    <th className="text-left">No</th>
                                    <th className="text-left">Nama Barang</th>
                                    <th className="text-left">Jumlah</th>
                                    <th className="text-right">Harga Satuan (Rp)</th>
                                    <th className="text-right">Total Harga (Rp)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {suratPesananData?.uraian_details?.length > 0 ? (
                                    suratPesananData.uraian_details.map((detail: any, idx: number) => (
                                        <tr key={detail.id}>
                                            <td className="text-sikas-num">{idx + 1}</td>
                                            <td>{detail.uraian}</td>
                                            <td className="text-sikas-num whitespace-nowrap">{detail.volume} {detail.satuan}</td>
                                            <td className="text-sikas-num text-right">{new Intl.NumberFormat('id-ID').format(detail.harga_satuan)}</td>
                                            <td className="text-sikas-num text-right">{new Intl.NumberFormat('id-ID').format(detail.volume * detail.harga_satuan)}</td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-8 text-center !text-[11.5px] font-medium text-slate-400 dark:text-slate-500">
                                            Data Surat Pesanan ini tidak memiliki rincian barang. BKU mungkin merupakan transaksi tunggal.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                            {suratPesananData?.uraian_details?.length > 0 && (
                                <tfoot>
                                    <tr>
                                        <td colSpan={4} className="!text-[11.5px] text-right !font-extrabold !text-slate-900 dark:!text-white">Total Keseluruhan</td>
                                        <td className="!text-[12px] text-right !font-extrabold !text-slate-900 text-sikas-num dark:!text-white">{new Intl.NumberFormat('id-ID').format(totalKeseluruhan)}</td>
                                    </tr>
                                </tfoot>
                            )}
                        </table>
                    </div>
                </div>

                <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4 dark:border-white/5">
                    <SecondaryButton onClick={onClose}>
                        Tutup
                    </SecondaryButton>
                </div>
            </div>
        </Modal>
    );
}
