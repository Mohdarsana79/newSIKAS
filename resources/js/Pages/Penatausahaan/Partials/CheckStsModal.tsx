import React, { useState, useEffect } from 'react';
import Modal from '@/Components/Modal';
import SecondaryButton from '@/Components/SecondaryButton';
import PrimaryButton from '@/Components/PrimaryButton';
import IconTile from '@/Components/ui/IconTile';
import axios from 'axios';
import useVariantRoute from '@/Hooks/useVariantRoute';

interface CheckStsModalProps {
    show: boolean;
    onClose: () => void;
    currentBulan: string;
    currentTahun: string;
    onSuccess: () => void;
}

export default function CheckStsModal({ show, onClose, currentBulan, currentTahun, onSuccess }: CheckStsModalProps) {
    const vroute = useVariantRoute();
    const [selectedTahun, setSelectedTahun] = useState(currentTahun);
    const [stsList, setStsList] = useState<any[]>([]);
    const [checkedIds, setCheckedIds] = useState<number[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [availableYears, setAvailableYears] = useState<any[]>([]);

    // Fetch Available Years on Mount / Show
    useEffect(() => {
        if (show) {
            axios.get(vroute('api.sts.years'))
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
            const response = await axios.get(vroute('api.sts.by-tahun', selectedTahun));
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
                await axios.post(vroute('api.sts.add-to-bkp'), {
                    sts_ids: idsToAdd,
                    bulan: currentBulan,
                    tahun: currentTahun,
                    is_checked: true
                });
            }

            if (idsToRemove.length > 0) {
                await axios.post(vroute('api.sts.add-to-bkp'), {
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
            <div className="relative overflow-hidden">
                <div className="pointer-events-none absolute -right-10 -top-16 h-40 w-40 rounded-full bg-sky/10 blur-3xl" />
                <div className="relative flex items-center gap-3 border-b border-slate-100 px-6 py-4 dark:border-white/5">
                    <IconTile tone="sky" size="md">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                            <path d="M9 11l3 3L22 4" />
                            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                        </svg>
                    </IconTile>
                    <div>
                        <h2 className="text-[14px] font-extrabold text-slate-900 dark:text-white">
                            Check STS ke Buku Bank ({currentBulan} {currentTahun})
                        </h2>
                        <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500">
                            Pilih STS yang sudah dibayar untuk dimasukkan ke Buku Bank.
                        </p>
                    </div>
                </div>

                <div className="space-y-4 px-6 py-5">
                    <div className="max-w-xs">
                        <label htmlFor="tahun_sts" className="mb-1.5 block text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                            Tahun Anggaran STS
                        </label>
                        <select
                            id="tahun_sts"
                            className="w-full rounded-xl border border-slate-200/90 bg-white px-3.5 py-2.5 text-[12px] font-semibold text-slate-800 shadow-sm transition focus:border-lime-400 focus:outline-none focus:ring-4 focus:ring-lime-200/60 dark:border-white/10 dark:bg-white/5 dark:text-white"
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

                    <div className="bento-table-wrapper max-h-96 overflow-y-auto">
                        <table className="min-w-full">
                            <thead className="sticky top-0">
                                <tr>
                                    <th scope="col" className="text-left">
                                        Check
                                    </th>
                                    <th scope="col" className="text-left">
                                        Nomor STS
                                    </th>
                                    <th scope="col" className="text-right">
                                        Jumlah Bayar
                                    </th>
                                    <th scope="col" className="text-left">
                                        Tgl Bayar
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {isLoading ? (
                                    <tr>
                                        <td colSpan={4} className="text-center">
                                            Memuat data...
                                        </td>
                                    </tr>
                                ) : stsList.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="text-center">
                                            Tidak ada data STS untuk tahun ini.
                                        </td>
                                    </tr>
                                ) : (
                                    stsList.map((item) => (
                                        <tr key={item.id}>
                                            <td className="whitespace-nowrap">
                                                <input
                                                    type="checkbox"
                                                    className="h-4 w-4 rounded border-slate-300 text-lime-500 shadow-sm focus:ring-lime-400 dark:border-white/20 dark:bg-white/5"
                                                    checked={checkedIds.includes(item.id)}
                                                    onChange={(e) => handleCheckboxChange(item.id, e.target.checked)}
                                                    disabled={item.jumlah_bayar <= 0} // Can't add if not paid? Usually STS is recorded when paid.
                                                />
                                            </td>
                                            <td className="whitespace-nowrap font-extrabold text-slate-900 dark:text-white">
                                                {item.nomor_sts}
                                            </td>
                                            <td className="whitespace-nowrap text-right text-sikas-num font-extrabold text-slate-900 dark:text-white">
                                                {new Intl.NumberFormat('id-ID').format(item.jumlah_bayar)}
                                            </td>
                                            <td className="whitespace-nowrap text-slate-500 dark:text-slate-400">
                                                {item.tanggal_bayar ? new Date(item.tanggal_bayar).toLocaleDateString('id-ID') : '-'}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="flex justify-end gap-2 border-t border-slate-100 pt-4 dark:border-white/5">
                        <SecondaryButton onClick={onClose}>Batal</SecondaryButton>
                        <PrimaryButton onClick={handleSave} disabled={isSaving || isLoading}>
                            {isSaving ? 'Menyimpan...' : 'Simpan'}
                        </PrimaryButton>
                    </div>
                </div>
            </div>
        </Modal>
    );
}
