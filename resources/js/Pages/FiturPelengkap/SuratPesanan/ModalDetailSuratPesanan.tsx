import React from 'react';
import Modal from '@/Components/Modal';

export default function ModalDetailSuratPesanan({ show, onClose, suratPesananData }: { show: boolean, onClose: () => void, suratPesananData: any }) {
    const totalKeseluruhan = suratPesananData?.uraian_details?.reduce((acc: number, curr: any) => {
        return acc + (curr.volume * curr.harga_satuan);
    }, 0) || 0;

    return (
        <Modal show={show} onClose={onClose} maxWidth="4xl">
            <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                        Detail Barang (Surat Pesanan {suratPesananData?.nomor_sp || 'Tanpa Nomor'})
                    </h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">✕</button>
                </div>

                <div className="overflow-x-auto overflow-y-auto max-h-[60vh]">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 border">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                            <tr>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">No</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Nama Barang</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Jumlah</th>
                                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Harga Satuan (Rp)</th>
                                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Total Harga (Rp)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {suratPesananData?.uraian_details?.length > 0 ? (
                                suratPesananData.uraian_details.map((detail: any, idx: number) => (
                                    <tr key={detail.id}>
                                        <td className="px-4 py-3">{idx + 1}</td>
                                        <td className="px-4 py-3 text-sm">{detail.uraian}</td>
                                        <td className="px-4 py-3 text-sm">{detail.volume} {detail.satuan}</td>
                                        <td className="px-4 py-3 text-sm text-right">{new Intl.NumberFormat('id-ID').format(detail.harga_satuan)}</td>
                                        <td className="px-4 py-3 text-sm text-right">{new Intl.NumberFormat('id-ID').format(detail.volume * detail.harga_satuan)}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="px-4 py-6 text-center text-gray-500">
                                        Data Surat Pesanan ini tidak memiliki rincian barang. BKU mungkin merupakan transaksi tunggal.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                        {suratPesananData?.uraian_details?.length > 0 && (
                            <tfoot className="bg-gray-50 dark:bg-gray-700">
                                <tr>
                                    <td colSpan={4} className="px-4 py-3 text-right font-bold text-sm text-gray-900 dark:text-gray-100">Total Keseluruhan</td>
                                    <td className="px-4 py-3 text-right font-bold text-sm text-gray-900 dark:text-gray-100">{new Intl.NumberFormat('id-ID').format(totalKeseluruhan)}</td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>

                <div className="mt-6 flex justify-end">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">
                        Tutup
                    </button>
                </div>
            </div>
        </Modal>
    );
}

