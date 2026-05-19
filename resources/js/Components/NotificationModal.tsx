import React, { useEffect, useState } from 'react';
import Modal from '@/Components/Modal';

interface NotificationModalProps {
    show: boolean;
    onClose: () => void;
    notification: {
        type: string;
        month: number;
        year: number;
        month_name: string;
    } | null;
}

interface DetailPajak {
    id: string;
    uraian: string;
    nominal: number;
    ntpn: string | null;
    tanggal_transaksi: string;
}

export default function NotificationModal({ show, onClose, notification }: NotificationModalProps) {
    const [details, setDetails] = useState<DetailPajak[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (show && notification) {
            setLoading(true);
            fetch(`/api/notifications/pajak/details?type=${notification.type}&month=${notification.month}&year=${notification.year}`)
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        setDetails(data.data);
                    }
                })
                .catch(err => console.error('Error fetching details', err))
                .finally(() => setLoading(false));
        } else {
            setDetails([]);
        }
    }, [show, notification]);

    if (!notification) return null;

    const isTerima = notification.type === 'terima_pajak';
    const monthYear = `${notification.month_name} ${notification.year}`;

    return (
        <Modal show={show} onClose={onClose} maxWidth="2xl">
            <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                    <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                        {isTerima ? 'Pajak Belum Dibayar' : 'Pajak Sudah Disetor'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-500 focus:outline-none"
                    >
                        <span className="sr-only">Close</span>
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="mt-4 text-sm text-gray-600 dark:text-gray-400 mb-4">
                    {isTerima ? (
                        <p>Terdeteksi ada pajak yang belum di bayar pada bulan {monthYear} berikut rinciannya.</p>
                    ) : (
                        <p>Terdeteksi pajak bulan {monthYear} yang sudah di setor. berikut rinciannya :</p>
                    )}
                </div>

                {loading ? (
                    <div className="flex justify-center p-4">
                        <svg className="animate-spin h-6 w-6 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    </div>
                ) : (
                    <div className="overflow-x-auto overflow-y-auto max-h-[60vh]">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 border border-gray-200 dark:border-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-800">
                                <tr>
                                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">No</th>
                                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Tanggal</th>
                                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Uraian</th>
                                    {!isTerima && (
                                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">NTPN</th>
                                    )}
                                    <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Jumlah</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
                                {details.length > 0 ? (
                                    <>
                                        {details.map((detail, index) => (
                                            <tr key={detail.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                    {index + 1}
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                    {new Date(detail.tanggal_transaksi).toLocaleDateString('id-ID')}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100 break-words">
                                                    {detail.uraian}
                                                </td>
                                                {!isTerima && (
                                                    <td className="px-4 py-3 whitespace-nowrap text-sm font-mono text-gray-500 dark:text-gray-400">
                                                        {detail.ntpn || '-'}
                                                    </td>
                                                )}
                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-medium text-gray-900 dark:text-gray-100">
                                                    Rp. {Number(detail.nominal).toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                                </td>
                                            </tr>
                                        ))}
                                        <tr className="bg-gray-50 dark:bg-gray-800 font-semibold">
                                            <td colSpan={isTerima ? 3 : 4} className="px-4 py-3 text-right text-sm text-gray-900 dark:text-gray-100 uppercase">
                                                Total Pajak
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap text-right text-sm text-gray-900 dark:text-gray-100">
                                                Rp. {details.reduce((sum, item) => sum + Number(item.nominal), 0).toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                            </td>
                                        </tr>
                                    </>
                                ) : (
                                    <tr>
                                        <td colSpan={isTerima ? 4 : 5} className="px-4 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                                            Tidak ada data pajak.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {!isTerima && (
                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400">
                        <p>Terimakasih telah membayar pajak untuk bulan ini.</p>
                        <p>Dedikasi anda taat dalam membayar pajak adalah bentuk dari kontribusi anda dalam membangun negeri ini.</p>
                    </div>
                )}

                <div className="mt-6 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md text-sm font-medium transition-colors"
                    >
                        Tutup
                    </button>
                </div>
            </div>
        </Modal>
    );
}
