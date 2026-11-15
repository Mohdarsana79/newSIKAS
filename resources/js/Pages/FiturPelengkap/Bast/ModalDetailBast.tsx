import React, { useState } from 'react';
import Modal from '@/Components/Modal';
import axios from 'axios';
import useVariantRoute from '@/Hooks/useVariantRoute';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import IconTile from '@/Components/ui/IconTile';

const FIELD_CLASS =
    'w-full rounded-xl border border-slate-200/90 bg-white px-3 py-2 text-[12px] font-semibold text-slate-800 shadow-sm transition focus:border-lime-400 focus:outline-none focus:ring-4 focus:ring-lime-200/60 dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:border-lime-400/70 dark:focus:ring-lime-400/10';

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
                                Detail Barang (BAST {bastData?.nomor_bast || 'Tanpa Nomor'})
                            </h2>
                            <p className="truncate text-[10px] font-medium text-slate-400 dark:text-slate-500">
                                Catat kondisi barang per rincian transaksi.
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

                <div className="sikas-scroll max-h-[65vh] overflow-y-auto px-6 py-5">
                    <div className="bento-table-wrapper overflow-x-auto">
                        <table className="min-w-full">
                            <thead>
                                <tr>
                                    <th className="text-left">No</th>
                                    <th className="text-left">Nama Barang</th>
                                    <th className="text-left">Jumlah</th>
                                    <th className="text-left">Kondisi</th>
                                    <th className="text-left">Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {bastData?.uraian_details?.length > 0 ? (
                                    bastData.uraian_details.map((detail: any, idx: number) => (
                                        <tr key={detail.id}>
                                            <td className="text-sikas-num">{idx + 1}</td>
                                            <td>{detail.uraian}</td>
                                            <td className="text-sikas-num whitespace-nowrap">{detail.volume} {detail.satuan}</td>
                                            <td className="w-48">
                                                <input 
                                                    type="text" 
                                                    className={FIELD_CLASS}
                                                    defaultValue={detail.kondisi || 'Baik'}
                                                    onChange={(e) => handleKondisiChange(detail.id, e.target.value)}
                                                />
                                            </td>
                                            <td>
                                                <PrimaryButton
                                                    onClick={() => handleSaveKondisi(detail.id)}
                                                    disabled={updatingId === detail.id}
                                                    className="!px-3 !py-1.5 !text-[10.5px]"
                                                >
                                                    {updatingId === detail.id ? 'Menyimpan...' : 'Simpan'}
                                                </PrimaryButton>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-8 text-center !text-[11.5px] font-medium text-slate-400 dark:text-slate-500">
                                            Data BAST ini tidak memiliki rincian barang. BKU mungkin merupakan transaksi tunggal.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
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
