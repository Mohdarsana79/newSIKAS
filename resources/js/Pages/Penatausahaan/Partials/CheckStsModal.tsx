import React, { useState, useEffect } from 'react';
import Modal from '@/Components/Modal';
import SecondaryButton from '@/Components/SecondaryButton';
import PrimaryButton from '@/Components/PrimaryButton';
import axios from 'axios';

interface CheckStsModalProps {
    show: boolean;
    onClose: () => void;
    currentBulan: string;
    currentTahun: string;
    onSuccess: () => void;
}

export default function CheckStsModal({ show, onClose, currentBulan, currentTahun, onSuccess }: CheckStsModalProps) {
    const [selectedTahun, setSelectedTahun] = useState(currentTahun);
    const [stsList, setStsList] = useState<any[]>([]);
    const [checkedIds, setCheckedIds] = useState<number[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [availableYears, setAvailableYears] = useState<any[]>([]);

    // Fetch Available Years on Mount / Show
    useEffect(() => {
        if (show) {
            axios.get(route('api.sts.years'))
                .then(res => {
                    if (res.data.success) {
                        const years = res.data.data;
                        setAvailableYears(years);

                        // If current selectedTahun is NOT in available years, switch to the first available year
                        // Use string comparison to be safe
                        if (years.length > 0) {
                            const isCurrentInList = years.some((y: any) => String(y) === String(selectedTahun));
                            if (!isCurrentInList) {
                                setSelectedTahun(String(years[0]));
                            }
                        }
                    }
                })
                .catch(err => console.error("Error fetching years:", err));
        }
    }, [show]);

    // Fetch STS Data when Show or Year changes
    useEffect(() => {
        if (show && selectedTahun) {
            fetchStsData();
        }
    }, [show, selectedTahun]);

    const fetchStsData = async () => {
        setIsLoading(true);
        try {
            const response = await axios.get(route('api.sts.by-tahun', selectedTahun));
            if (response.data.success) {
                const data = response.data.data;
                setStsList(data);
                // Pre-check items that are already in ANY Buku Bank?
                // The API returns 'is_checked' if tanggal_buku_bank is not null.
                // We should respect that.
                const initialChecked = data
                    .filter((item: any) => item.is_checked)
                    .map((item: any) => item.id);
                setCheckedIds(initialChecked);
            }
        } catch (error) {
            console.error("Error fetching STS data:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCheckboxChange = (id: number, checked: boolean) => {
        if (checked) {
            setCheckedIds([...checkedIds, id]);
        } else {
            setCheckedIds(checkedIds.filter(prevId => prevId !== id));
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            // Determine added and removed IDs compared to original state?
            // For simplicity, we can just send the Checked ones to Add, and Unchecked ones to Remove?
            // But we don't want to iterate all.
            // Let's rely on the user's intent: The current CheckedIds list is the desired state for "Items in Bank Book".
            // However, the API `addToBukuBank` is toggle-based per request (flag `is_checked`).

            // Strategy:
            // 1. Identify IDs that are CURRENTLY checked (desired True).
            // 2. Identify IDs that are NOT checked (desired False).
            // 3. Send update requests.
            // Note: Efficient way is to just send one request with "Sync" logic, but our API is simple.
            // Let's send 2 requests: one for adding, one for removing.

            const allIds = stsList.map(item => item.id);
            const idsToAdd = checkedIds;
            const idsToRemove = allIds.filter(id => !checkedIds.includes(id));

            if (idsToAdd.length > 0) {
                await axios.post(route('api.sts.add-to-bkp'), {
                    sts_ids: idsToAdd,
                    bulan: currentBulan,
                    tahun: currentTahun,
                    is_checked: true
                });
            }

            if (idsToRemove.length > 0) {
                await axios.post(route('api.sts.add-to-bkp'), {
                    sts_ids: idsToRemove,
                    bulan: currentBulan,
                    tahun: currentTahun,
                    is_checked: false
                });
            }

            onSuccess();
            onClose();

        } catch (error) {
            console.error("Error saving STS check:", error);
            alert("Gagal menyimpan data.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Modal show={show} onClose={onClose} maxWidth="2xl">
            <div className="p-6">
                <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                    Check STS ke Buku Bank ({currentBulan} {currentTahun})
                </h2>

                <div className="mb-4">
                    <label htmlFor="tahun_sts" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Tahun Anggaran STS
                    </label>
                    <select
                        id="tahun_sts"
                        className="border border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 rounded-md shadow-sm w-full md:w-1/3"
                        value={selectedTahun}
                        onChange={(e) => setSelectedTahun(e.target.value)}
                    >
                        {availableYears.length > 0 ? (
                            availableYears.map(y => (
                                <option key={y} value={y}>{y}</option>
                            ))
                        ) : (
                            // Fallback if no years found, show current or allow user to see 'No Data' context
                            <option value={currentTahun}>{currentTahun}</option>
                        )}
                    </select>
                </div>

                <div className="border rounded-md overflow-hidden max-h-96 overflow-y-auto mb-6">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                    Check
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                    Nomor STS
                                </th>
                                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                    Jumlah Bayar
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                    Tgl Bayar
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                                        Memuat data...
                                    </td>
                                </tr>
                            ) : stsList.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                                        Tidak ada data STS untuk tahun ini.
                                    </td>
                                </tr>
                            ) : (
                                stsList.map((item) => (
                                    <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <input
                                                type="checkbox"
                                                className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                                                checked={checkedIds.includes(item.id)}
                                                onChange={(e) => handleCheckboxChange(item.id, e.target.checked)}
                                                disabled={item.jumlah_bayar <= 0} // Can't add if not paid? Usually STS is recorded when paid.
                                            />
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                                            {item.nomor_sts}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 dark:text-gray-100 font-mono">
                                            {new Intl.NumberFormat('id-ID').format(item.jumlah_bayar)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                            {item.tanggal_bayar ? new Date(item.tanggal_bayar).toLocaleDateString('id-ID') : '-'}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="flex justify-end gap-3">
                    <SecondaryButton onClick={onClose}>Batal</SecondaryButton>
                    <PrimaryButton onClick={handleSave} disabled={isSaving || isLoading}>
                        {isSaving ? 'Menyimpan...' : 'Simpan'}
                    </PrimaryButton>
                </div>
            </div>
        </Modal>
    );
}
