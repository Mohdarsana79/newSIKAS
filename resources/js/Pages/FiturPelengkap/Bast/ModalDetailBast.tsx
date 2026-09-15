import React, { useState } from 'react';
import Modal from '@/Components/Modal';
import axios from 'axios';
import useVariantRoute from '@/Hooks/useVariantRoute';

export default function ModalDetailBast({ show, onClose, bastData }: { show: boolean, onClose: () => void, bastData: any }) {
    const vroute = useVariantRoute();
    const [updatingId, setUpdatingId] = useState<number | null>(null);
    const [kondisiValues, setKondisiValues] = useState<Record<number, string>>({});

    const handleKondisiChange = (id: number, value: string) => {
        setKondisiValues(prev => ({ ...prev, [id]: value }));
    };

    const handleSaveKondisi = async (id: number) => {
        const kondisi = kondisiValues[id] ?? 'Baik';
        setUpdatingId(id);
        try {
            const { data } = await axios.post(vroute('bast.kondisi.update', { id }), { kondisi });
            if (data.success) {
                window.dispatchEvent(new CustomEvent('toast-notification', { detail: { message: data.message, type: 'success' } }));
            }
        } catch (e) {
            window.dispatchEvent(new CustomEvent('toast-notification', { detail: { message: 'Gagal menyimpan kondisi', type: 'error' } }));
        } finally {
            setUpdatingId(null);
        }
    };

    return (
        <Modal show={show} onClose={onClose} maxWidth="4xl">
            <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                        Detail Barang (BAST {bastData?.nomor_bast || 'Tanpa Nomor'})
                    </h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">✕</button>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 border">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                            <tr>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">No</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Nama Barang</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Jumlah</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Kondisi</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {bastData?.uraian_details?.length > 0 ? (
                                bastData.uraian_details.map((detail: any, idx: number) => (
                                    <tr key={detail.id}>
                                        <td className="px-4 py-3">{idx + 1}</td>
                                        <td className="px-4 py-3 text-sm">{detail.uraian}</td>
                                        <td className="px-4 py-3 text-sm">{detail.volume} {detail.satuan}</td>
                                        <td className="px-4 py-3 text-sm w-48">
                                            <input 
                                                type="text" 
                                                className="w-full rounded-md border-gray-300 dark:bg-gray-700 dark:border-gray-600 text-sm"
                                                defaultValue={detail.kondisi || 'Baik'}
                                                onChange={(e) => handleKondisiChange(detail.id, e.target.value)}
                                            />
                                        </td>
                                        <td className="px-4 py-3 text-sm">
                                            <button 
                                                onClick={() => handleSaveKondisi(detail.id)}
                                                disabled={updatingId === detail.id}
                                                className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 disabled:opacity-50"
                                            >
                                                {updatingId === detail.id ? 'Menyimpan...' : 'Simpan'}
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="px-4 py-6 text-center text-gray-500">
                                        Data BAST ini tidak memiliki rincian barang. BKU mungkin merupakan transaksi tunggal.
                                    </td>
                                </tr>
                            )}
                        </tbody>
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
