import React, { Fragment, useState } from 'react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { usePage, router } from '@inertiajs/react';
import axios from 'axios';
import Modal from '@/Components/Modal';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';

interface TabRincianPerubahanProps {
    rincianData: any;
    onPrint: (target: string) => void;
    onExportExcel: () => void;
}

export default function TabRincianPerubahan({ rincianData, onPrint, onExportExcel }: TabRincianPerubahanProps) {
    const [selectedItems, setSelectedItems] = useState<any[]>([]);
    const [showGabungModal, setShowGabungModal] = useState(false);
    const [newUraian, setNewUraian] = useState('');
    const [showEditGabungModal, setShowEditGabungModal] = useState(false);
    const [editGabungItem, setEditGabungItem] = useState<any>(null);
    const [newGabungName, setNewGabungName] = useState('');
    const [showUngabungModal, setShowUngabungModal] = useState(false);
    const [ungabungItem, setUngabungItem] = useState<any>(null);
    const [errorModalMsg, setErrorModalMsg] = useState<string | null>(null);
    const [processing, setProcessing] = useState(false);
    const [isProcessingEditGabung, setIsProcessingEditGabung] = useState(false);
    const [isProcessingUngabung, setIsProcessingUngabung] = useState(false);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [detailItem, setDetailItem] = useState<any>(null);
    const [searchQuery, setSearchQuery] = useState('');
    
    // Kwitansi Modal State
    const [showKwitansiModal, setShowKwitansiModal] = useState(false);
    const [selectedRkasIds, setSelectedRkasIds] = useState<number[]>([]);
    const [availableKwitansi, setAvailableKwitansi] = useState<any[]>([]);
    const [selectedKwitansi, setSelectedKwitansi] = useState<string[]>([]);
    const [isFetchingKwitansi, setIsFetchingKwitansi] = useState(false);
    const [kwitansiDetailData, setKwitansiDetailData] = useState<any | null>(null);
    const [searchKwitansi, setSearchKwitansi] = useState('');
    const [filterTahapKwitansi, setFilterTahapKwitansi] = useState('Semua');
    const [filterBulanKwitansi, setFilterBulanKwitansi] = useState('Semua');

    const { props } = usePage();
    const anggaran = (props.anggaran || {}) as any;
    const variant = (props.variant || '') as string;
    const routePrefix = (props.routePrefix || '') as string;
    const errors = (props.errors || {}) as any;

    const handleGabungSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setProcessing(true);
        
        let baseRoute = 'rkas.gabung-rincian';
        if (variant === 'rkas_perubahan') {
            const tahap = selectedItems.length > 0 ? selectedItems[0].tahap : null;
            baseRoute = tahap === 1 ? 'rkas.gabung-rincian' : 'rkas-perubahan.gabung-rincian';
        }

        const routeName = routePrefix + baseRoute;
        
        const payload = {
            new_uraian: newUraian,
            rkas_ids: (() => {
                const resultIds: number[] = [];
                const TAHAP_1_MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni'];
                
                selectedItems.forEach(item => {
                    if (item.rkas_ids_per_bulan) {
                        const itemTahap = item.tahap;
                        Object.entries(item.rkas_ids_per_bulan).forEach(([bulan, ids]) => {
                            const isTahap1 = TAHAP_1_MONTHS.includes(bulan);
                            if ((itemTahap === 1 && isTahap1) || (itemTahap === 2 && !isTahap1)) {
                                resultIds.push(...(ids as number[]));
                            }
                        });
                    } else if (item.rkas_ids && item.rkas_ids.length > 0) {
                        resultIds.push(...item.rkas_ids);
                    } else if (item.original_items && item.original_items.length > 0) {
                        // fallback if rkas_ids are not directly available but original_items has id
                        item.original_items.forEach((orig: any) => {
                            if (orig.id) resultIds.push(orig.id);
                        });
                    } else if (item.id) {
                        resultIds.push(item.id);
                    }
                });
                return Array.from(new Set(resultIds));
            })()
        };

        if (anggaran && anggaran.id) {
            router.post(route(routeName, anggaran.id), payload, {
                preserveScroll: true,
                onSuccess: () => {
                    setShowGabungModal(false);
                    setNewUraian('');
                    setSelectedItems([]);
                },
                onError: (err: any) => {
                    console.error("Validation Errors:", err);
                },
                onFinish: () => {
                    setProcessing(false);
                }
            });
        } else {
            setProcessing(false);
        }
    };

    const handleEditGabungSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsProcessingEditGabung(true);
        
        let baseRoute = 'rkas.edit-gabung-rincian';
        if (variant === 'rkas_perubahan') {
            const tahap = editGabungItem?.tahap;
            baseRoute = tahap === 1 ? 'rkas.edit-gabung-rincian' : 'rkas-perubahan.edit-gabung-rincian';
        }

        const routeName = routePrefix + baseRoute;
        
        const payload = {
            new_uraian_gabungan: newGabungName,
            rkas_ids: (() => {
                const resultIds: number[] = [];
                const TAHAP_1_MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni'];
                const itemTahap = editGabungItem?.tahap;
                
                if (editGabungItem.rkas_ids_per_bulan) {
                    Object.entries(editGabungItem.rkas_ids_per_bulan).forEach(([bulan, ids]) => {
                        const isTahap1 = TAHAP_1_MONTHS.includes(bulan);
                        if ((itemTahap === 1 && isTahap1) || (itemTahap === 2 && !isTahap1)) {
                            resultIds.push(...(ids as number[]));
                        }
                    });
                } else if (editGabungItem.rkas_ids) {
                    resultIds.push(...editGabungItem.rkas_ids);
                }
                return Array.from(new Set(resultIds));
            })()
        };

        if (anggaran && anggaran.id) {
            router.put(route(routeName, anggaran.id), payload, {
                preserveScroll: true,
                onSuccess: () => {
                    setShowEditGabungModal(false);
                    setNewGabungName('');
                    setEditGabungItem(null);
                },
                onError: (err: any) => {
                    console.error("Validation Errors:", err);
                },
                onFinish: () => {
                    setIsProcessingEditGabung(false);
                }
            });
        }
    };

    const handleUngabungSubmit = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!ungabungItem) return;
        setIsProcessingUngabung(true);
        
        let baseRoute = 'rkas.ungabung-rincian';
        if (variant === 'rkas_perubahan') {
            const tahap = ungabungItem?.tahap;
            baseRoute = tahap === 1 ? 'rkas.ungabung-rincian' : 'rkas-perubahan.ungabung-rincian';
        }

        const routeName = routePrefix + baseRoute;
        
        const payload = {
            rkas_ids: (() => {
                const resultIds: number[] = [];
                const TAHAP_1_MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni'];
                const itemTahap = ungabungItem?.tahap;
                
                if (ungabungItem.rkas_ids_per_bulan) {
                    Object.entries(ungabungItem.rkas_ids_per_bulan).forEach(([bulan, ids]) => {
                        const isTahap1 = TAHAP_1_MONTHS.includes(bulan);
                        if ((itemTahap === 1 && isTahap1) || (itemTahap === 2 && !isTahap1)) {
                            resultIds.push(...(ids as number[]));
                        }
                    });
                } else if (ungabungItem.rkas_ids) {
                    resultIds.push(...ungabungItem.rkas_ids);
                }
                return Array.from(new Set(resultIds));
            })()
        };

        if (anggaran && anggaran.id) {
            router.post(route(routeName, anggaran.id), payload, {
                preserveScroll: true,
                onSuccess: () => {
                    setSelectedItems([]);
                    setShowUngabungModal(false);
                    setUngabungItem(null);
                },
                onError: (err: any) => {
                    console.error("Validation Errors:", err);
                },
                onFinish: () => {
                    setIsProcessingUngabung(false);
                }
            });
        }
    };

    const fetchAvailableKwitansi = async (rkasIds: number[], currentKwitansi: string[]) => {
        setIsFetchingKwitansi(true);
        setSelectedRkasIds(rkasIds);
        setSelectedKwitansi(currentKwitansi);
        
        try {
            const baseRoute = variant === 'rkas_perubahan' 
                ? 'rkas-perubahan.available-kwitansi'
                : 'rkas.available-kwitansi';
            const routeName = (routePrefix || '') + baseRoute;
            const url = route(routeName, anggaran.id);
                
            const response = await axios.get(url);
            setAvailableKwitansi(response.data);
            setShowKwitansiModal(true);
        } catch (error) {
            console.error("Gagal mengambil data kwitansi", error);
        } finally {
            setIsFetchingKwitansi(false);
        }
    };

    const saveKwitansi = () => {
        if (!selectedRkasIds || selectedRkasIds.length === 0) return;
        
        const baseRoute = variant === 'rkas_perubahan'
            ? 'rkas-perubahan.update-kwitansi'
            : 'rkas.update-kwitansi';
        const routeName = (routePrefix || '') + baseRoute;
        const url = route(routeName, anggaran.id);
            
        router.put(url, {
            rkas_ids: selectedRkasIds,
            nomor_kwitansi: selectedKwitansi.join(','),
            is_perubahan: variant === 'rkas_perubahan'
        }, {
            preserveScroll: true,
            onSuccess: () => {
                setShowKwitansiModal(false);
            },
            onError: (errors) => {
                console.error("Gagal menyimpan kwitansi", errors);
            }
        });
    };

    const toggleKwitansiSelection = (idTransaksi: string) => {
        setSelectedKwitansi(prev => 
            prev.includes(idTransaksi) 
                ? prev.filter(id => id !== idTransaksi)
                : [...prev, idTransaksi]
        );
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('id-ID').format(amount);
    };

    const formatDateSafe = (dateStr: string | undefined, formatStr: string = 'dd/MM/yyyy') => {
        if (!dateStr) return '-';
        try {
            const datePart = dateStr.split(/[ T]/)[0];
            const [y, m, d] = datePart.split('-').map(Number);
            if (y && m && d) {
                return format(new Date(y, m - 1, d), formatStr, { locale: id });
            }
            return '-';
        } catch (e) {
            return '-';
        }
    };

    const filteredRincianData = React.useMemo(() => {
        if (!searchQuery || searchQuery.trim() === '') {
            return rincianData;
        }
        const q = searchQuery.toLowerCase();
        return rincianData.map((group: any) => {
            const filteredItems = group.items.filter((item: any) => {
                const uraian = (item.uraian || '').toLowerCase();
                const uraianGabungan = (item.uraian_gabungan || '').toLowerCase();
                const namaPenerima = (item.nama_penerima || '').toLowerCase();
                const nomorRekening = (item.nomor_rekening || '').toLowerCase();
                
                return uraian.includes(q) || 
                       uraianGabungan.includes(q) || 
                       namaPenerima.includes(q) || 
                       nomorRekening.includes(q);
            });
            if (filteredItems.length > 0) {
                const total = filteredItems.reduce((sum: number, item: any) => sum + (item.jumlah || 0), 0);
                return { ...group, items: filteredItems, total };
            }
            return null;
        }).filter(Boolean);
    }, [rincianData, searchQuery]);

    return (
        <Fragment>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow animate-fade-in-up">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 uppercase">
                        Rincian Belanja Perubahan
                    </h2>
                    <div className="flex gap-2 items-center flex-wrap">
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Cari uraian..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 rounded-md shadow-sm sm:text-sm pl-8 w-48 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            />
                            <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                                <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>
                        </div>
                        <button
                            onClick={() => {
                                if (selectedItems.length > 0) {
                                    const tahap = selectedItems[0].tahap;
                                    if (variant !== 'rkas_perubahan' && tahap === 2) {
                                        setErrorModalMsg('Tahap 2 hanya bisa di gabung pada Rkas Perubahan.');
                                        return;
                                    }
                                    if (variant === 'rkas_perubahan' && tahap === 1) {
                                        setErrorModalMsg('Tahap 1 hanya bisa di gabung pada Rkas Awal.');
                                        return;
                                    }
                                }
                                if (selectedItems.length < 2) {
                                    setErrorModalMsg('Pilih minimal 2 kegiatan untuk digabung.');
                                    return;
                                }
                                setShowGabungModal(true);
                            }}
                            className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-md font-medium text-sm flex items-center gap-2 transition-colors shadow-sm"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                            </svg>
                            Gabung Kegiatan
                        </button>
                        <button
                            onClick={() => {
                                onPrint('rincian');
                            }}
                            className="bg-red-600 dark:bg-red-700 text-white px-4 py-2 rounded-md hover:bg-red-700 dark:hover:bg-red-800 flex items-center justify-center gap-2 shadow-sm transition-colors text-sm font-medium focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                            </svg>
                            Cetak PDF
                        </button>
                        <button
                            onClick={() => {
                                onPrint('rincian');
                            }}
                            className="bg-green-600 dark:bg-green-700 text-white px-4 py-2 rounded-md hover:bg-green-700 dark:hover:bg-green-800 flex items-center justify-center gap-2 shadow-sm transition-colors text-sm font-medium focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            Export Excel
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-800/80">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-10">
                                    <input type="checkbox"
                                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                        checked={(() => {
                                            const allItems = filteredRincianData.flatMap((g: any) => g.items);
                                            return allItems.length > 0 && selectedItems.length === allItems.length;
                                        })()}
                                        onChange={(e) => {
                                            const allItems = filteredRincianData.flatMap((g: any) => g.items);
                                            if (e.target.checked) {
                                                if (allItems.length > 0) {
                                                    const firstKodeRek = allItems[0].kode_rekening_id;
                                                    const firstTahap = allItems[0].tahap;
                                                    const firstKodeId = allItems[0].kode_id;
                                                    const allSameRek = allItems.every((i: any) => i.kode_rekening_id === firstKodeRek);
                                                    const allSameTahap = allItems.every((i: any) => i.tahap === firstTahap);
                                                    const allSameKodeId = allItems.every((i: any) => i.kode_id === firstKodeId);
                                                    if (!allSameRek || !allSameTahap || !allSameKodeId) {
                                                        setErrorModalMsg('Hanya bisa memilih kegiatan dengan kode rekening, sub kegiatan, dan tahap yang sama untuk digabung.');
                                                        return;
                                                    }
                                                    setSelectedItems([...allItems]);
                                                }
                                            } else {
                                                setSelectedItems([]);
                                            }
                                        }}
                                    />
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-16">No</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Kode Rekening</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Kode Kegiatan</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Uraian Rekening</th>
                                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tahap</th>
                                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Bulan</th>
                                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-48">Jumlah</th>
                                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-32">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {filteredRincianData.map((group: any, index: number) => (
                                <Fragment key={`rincian-group-${index}`}>
                                    {/* Sub Program Group Row */}
                                    <tr className="bg-blue-50/50 dark:bg-blue-900/10 transition-colors">
                                        <td className="px-6 py-3 whitespace-nowrap text-sm font-semibold text-blue-900 dark:text-blue-100 border-r border-blue-100 dark:border-blue-800"></td>
                                        <td className="px-6 py-3 whitespace-nowrap text-sm font-semibold text-blue-900 dark:text-blue-100">{index + 1}</td>
                                        <td colSpan={2} className="px-6 py-3 text-sm font-semibold text-blue-900 dark:text-blue-100"></td>
                                        <td className="px-6 py-3 text-sm font-semibold text-blue-900 dark:text-blue-100">{group.sub_program}</td>
                                        <td className="px-6 py-3 border-l border-blue-100 dark:border-blue-800"></td>
                                        <td className="px-6 py-3 border-l border-blue-100 dark:border-blue-800"></td>
                                        <td className="px-6 py-3 whitespace-nowrap text-sm font-bold text-blue-600 dark:text-blue-400 text-right">{formatCurrency(group.total)}</td>
                                        <td className="px-6 py-3 border-l border-blue-100 dark:border-blue-800"></td>
                                    </tr>
                                    {/* Item Rows */}
                                    {group.items.map((item: any, itemIndex: number) => (
                                        <tr key={`rincian-item-${index}-${itemIndex}`} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                            <td className="px-6 py-3 whitespace-nowrap text-center border-r border-gray-100 dark:border-gray-700">
                                                <input type="checkbox"
                                                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                                    checked={selectedItems.some(i => i.kode_rekening_id === item.kode_rekening_id && i.kode_id === item.kode_id && i.uraian === item.uraian && i.tahap === item.tahap)}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            if (selectedItems.length > 0) {
                                                                if (selectedItems[0].kode_rekening_id !== item.kode_rekening_id || selectedItems[0].tahap !== item.tahap || selectedItems[0].kode_id !== item.kode_id) {
                                                                    setErrorModalMsg('Hanya bisa memilih kegiatan dengan kode rekening, sub kegiatan, dan tahap yang sama untuk digabung.');
                                                                    return;
                                                                }
                                                            }
                                                            setSelectedItems([...selectedItems, item]);
                                                        } else {
                                                            setSelectedItems(selectedItems.filter(i => !(i.kode_rekening_id === item.kode_rekening_id && i.kode_id === item.kode_id && i.uraian === item.uraian && i.tahap === item.tahap)));
                                                        }
                                                    }}
                                                />
                                            </td>
                                            <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 border-r border-gray-100 dark:border-gray-700"></td>
                                            <td className="px-6 py-3 text-sm text-gray-600 dark:text-gray-400 text-xs">{item.kode_rekening || '-'}</td>
                                            <td className="px-6 py-3 text-sm text-gray-600 dark:text-gray-400 text-xs">{item.kode_kegiatan || '-'}</td>
                                            <td className="px-6 py-3 text-sm text-gray-700 dark:text-gray-300">
                                                <div className="flex items-start gap-2">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-gray-500 mt-2"></div>
                                                    <div>
                                                        <div>{item.uraian}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-3 text-sm font-medium text-indigo-600 dark:text-indigo-400 text-center border-l border-gray-100 dark:border-gray-700">
                                                Tahap {item.tahap || '-'}
                                            </td>
                                            <td className="px-6 py-3 text-sm text-gray-600 dark:text-gray-400 text-center border-l border-gray-100 dark:border-gray-700">
                                                {item.bulan_list?.join(', ') || '-'}
                                            </td>
                                            <td className="px-6 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100 text-right">{formatCurrency(item.jumlah)}</td>
                                            <td className="px-6 py-3 text-center border-l border-gray-100 dark:border-gray-700">
                                                {item.original_items && item.original_items.length > 1 && (
                                                    <div className="flex gap-1 justify-center flex-wrap">
                                                        <button
                                                            onClick={() => {
                                                                setDetailItem(item);
                                                                setShowDetailModal(true);
                                                            }}
                                                            className="inline-flex items-center justify-center px-2 py-1 text-[10px] font-medium rounded text-white bg-sky-500 hover:bg-sky-600 shadow-sm transition-colors"
                                                        >
                                                            Detail
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                if (variant !== 'rkas_perubahan' && item.tahap === 2) {
                                                                    setErrorModalMsg('Tahap 2 hanya bisa di gabung pada Rkas Perubahan.');
                                                                    return;
                                                                }
                                                                if (variant === 'rkas_perubahan' && item.tahap === 1) {
                                                                    setErrorModalMsg('Tahap 1 hanya bisa di gabung pada Rkas Awal.');
                                                                    return;
                                                                }
                                                                setEditGabungItem(item);
                                                                setNewGabungName(item.uraian);
                                                                setShowEditGabungModal(true);
                                                            }}
                                                            className="inline-flex items-center justify-center px-2 py-1 text-[10px] font-medium rounded text-white bg-amber-500 hover:bg-amber-600 shadow-sm transition-colors"
                                                        >
                                                            Ganti Nama
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                if (variant !== 'rkas_perubahan' && item.tahap === 2) {
                                                                    setErrorModalMsg('Tahap 2 hanya bisa di gabung pada Rkas Perubahan.');
                                                                    return;
                                                                }
                                                                if (variant === 'rkas_perubahan' && item.tahap === 1) {
                                                                    setErrorModalMsg('Tahap 1 hanya bisa di gabung pada Rkas Awal.');
                                                                    return;
                                                                }
                                                                setUngabungItem(item);
                                                                setShowUngabungModal(true);
                                                            }}
                                                            disabled={isProcessingUngabung}
                                                            className="inline-flex items-center justify-center px-2 py-1 text-[10px] font-medium rounded text-white bg-red-600 hover:bg-red-700 shadow-sm transition-colors disabled:opacity-50"
                                                        >
                                                            Batal
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </Fragment>
                            ))}
                            <tr className="bg-gray-100 dark:bg-gray-900">
                                <td colSpan={7} className="px-6 py-4 text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider text-right">Total Keseluruhan</td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold text-indigo-600 dark:text-indigo-400">
                                    {formatCurrency(rincianData.reduce((acc: any, curr: any) => acc + curr.total, 0))}
                                </td>
                                <td></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
            
            {/* Modal Gabung Kegiatan */}
            {showGabungModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
                        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800/80">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Gabung Kegiatan</h3>
                            <button onClick={() => setShowGabungModal(false)} className="text-gray-400 hover:text-gray-500 transition-colors">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        
                        <div className="p-6 overflow-y-auto">
                            <form id="gabung-form-perubahan" onSubmit={handleGabungSubmit} className="space-y-4">
                                {Object.keys(errors).length > 0 && (
                                    <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg">
                                        <div className="flex">
                                            <div className="flex-shrink-0">
                                                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                                </svg>
                                            </div>
                                            <div className="ml-3">
                                                <h3 className="text-sm font-medium text-red-800">{errors.message || 'Terdapat kesalahan'}</h3>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                <div>
                                    <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-lg mb-4">
                                        <p className="text-sm text-indigo-900 dark:text-indigo-200 mb-1">
                                            Anda memilih <strong>{selectedItems.length}</strong> kegiatan untuk digabung.
                                        </p>
                                        <p className="text-sm font-bold text-indigo-700 dark:text-indigo-300">
                                            Total Anggaran: Rp {formatCurrency(selectedItems.reduce((sum, item) => sum + (item.jumlah || 0), 0))}
                                        </p>
                                    </div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Nama Kegiatan Baru
                                    </label>
                                    <input 
                                        type="text" 
                                        value={newUraian} 
                                        onChange={e => setNewUraian(e.target.value)} 
                                        required
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                        placeholder="Masukkan nama gabungan..."
                                    />
                                </div>
                            </form>
                        </div>
                        
                        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setShowGabungModal(false)}
                                className="bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 px-4 py-2 rounded-md text-sm font-medium shadow-sm transition-colors"
                            >
                                Batal
                            </button>
                            <button
                                type="submit"
                                form="gabung-form-perubahan"
                                disabled={processing || !newUraian}
                                className="bg-amber-600 text-white hover:bg-amber-700 px-4 py-2 rounded-md text-sm font-medium shadow-sm transition-colors disabled:opacity-50"
                            >
                                {processing ? 'Menyimpan...' : 'Simpan'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Error */}
            {errorModalMsg && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col">
                        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-red-50 dark:bg-red-900/30">
                            <h3 className="text-lg font-bold text-red-700 dark:text-red-400">Peringatan</h3>
                            <button onClick={() => setErrorModalMsg(null)} className="text-gray-400 hover:text-gray-500 transition-colors">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="p-6">
                            <div className="flex items-center gap-4">
                                <div className="flex-shrink-0 bg-red-100 dark:bg-red-900/50 p-3 rounded-full">
                                    <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                </div>
                                <p className="text-sm text-gray-700 dark:text-gray-300">
                                    {errorModalMsg}
                                </p>
                            </div>
                        </div>
                        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80 flex justify-end">
                            <button
                                onClick={() => setErrorModalMsg(null)}
                                className="bg-red-600 text-white hover:bg-red-700 px-4 py-2 rounded-md text-sm font-medium shadow-sm transition-colors"
                            >
                                Tutup
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Edit Gabung Kegiatan */}
            {showEditGabungModal && editGabungItem && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
                        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800/80">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Ganti Nama Gabungan</h3>
                            <button onClick={() => setShowEditGabungModal(false)} className="text-gray-400 hover:text-gray-500 transition-colors">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        
                        <div className="p-6 overflow-y-auto">
                            <form id="edit-gabung-form-perubahan" onSubmit={handleEditGabungSubmit} className="space-y-4">
                                {Object.keys(errors).length > 0 && (
                                    <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg">
                                        <div className="flex">
                                            <div className="flex-shrink-0">
                                                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                                </svg>
                                            </div>
                                            <div className="ml-3">
                                                <h3 className="text-sm font-medium text-red-800">{errors.message || 'Terdapat kesalahan'}</h3>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Nama Kegiatan Baru
                                    </label>
                                    <input 
                                        type="text" 
                                        value={newGabungName} 
                                        onChange={e => setNewGabungName(e.target.value)} 
                                        required
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                        placeholder="Masukkan nama gabungan..."
                                    />
                                </div>
                            </form>
                        </div>
                        
                        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setShowEditGabungModal(false)}
                                className="bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 px-4 py-2 rounded-md text-sm font-medium shadow-sm transition-colors"
                            >
                                Batal
                            </button>
                            <button
                                type="submit"
                                form="edit-gabung-form-perubahan"
                                disabled={isProcessingEditGabung || !newGabungName}
                                className="bg-amber-600 text-white hover:bg-amber-700 px-4 py-2 rounded-md text-sm font-medium shadow-sm transition-colors disabled:opacity-50"
                            >
                                {isProcessingEditGabung ? 'Menyimpan...' : 'Simpan'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Konfirmasi Batal Gabung */}
            {showUngabungModal && ungabungItem && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col">
                        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-red-50 dark:bg-red-900/30">
                            <h3 className="text-lg font-bold text-red-700 dark:text-red-400">Konfirmasi Batal Gabung</h3>
                            <button onClick={() => setShowUngabungModal(false)} className="text-gray-400 hover:text-gray-500 transition-colors">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="p-6">
                            <div className="flex items-start gap-4">
                                <div className="flex-shrink-0 bg-red-100 dark:bg-red-900/50 p-3 rounded-full mt-1">
                                    <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-700 dark:text-gray-300 font-medium mb-1">
                                        Apakah Anda yakin ingin memisahkan gabungan kegiatan ini?
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        Rincian belanja <strong>{ungabungItem.uraian}</strong> akan dikembalikan menjadi baris-baris terpisah.
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setShowUngabungModal(false)}
                                className="bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 px-4 py-2 rounded-md text-sm font-medium shadow-sm transition-colors"
                            >
                                Batal
                            </button>
                            <button
                                type="button"
                                onClick={() => handleUngabungSubmit()}
                                disabled={isProcessingUngabung}
                                className="bg-red-600 text-white hover:bg-red-700 px-4 py-2 rounded-md text-sm font-medium shadow-sm transition-colors disabled:opacity-50"
                            >
                                {isProcessingUngabung ? 'Memproses...' : 'Ya, Pisahkan'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Detail Uraian Tergabung */}
            {showDetailModal && detailItem && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[80vh]">
                        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-sky-50 dark:bg-sky-900/30">
                            <h3 className="text-lg font-bold text-sky-800 dark:text-sky-200">Detail Uraian Tergabung</h3>
                            <button onClick={() => setShowDetailModal(false)} className="text-gray-400 hover:text-gray-500 transition-colors">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto">
                            <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-lg mb-4">
                                <p className="text-sm font-medium text-indigo-900 dark:text-indigo-200">
                                    Nama Gabungan: <strong>{detailItem.uraian}</strong>
                                </p>
                                <p className="text-xs text-indigo-700 dark:text-indigo-300 mt-1">
                                    Tahap: {detailItem.tahap} &mdash; Total: Rp {formatCurrency(detailItem.jumlah || 0)}
                                </p>
                            </div>
                            <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                                <table className="min-w-full text-sm">
                                    <thead className="bg-gray-100 dark:bg-gray-700">
                                        <tr>
                                            <th className="px-3 py-2 text-center font-bold text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 w-12">No</th>
                                            <th className="px-3 py-2 text-left font-bold text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600">Uraian Asli</th>
                                            <th className="px-3 py-2 text-right font-bold text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600">Vol</th>
                                            <th className="px-3 py-2 text-right font-bold text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600">Harga Satuan</th>
                                            <th className="px-3 py-2 text-right font-bold text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
                                        {detailItem.original_items?.map((orig: any, idx: number) => (
                                            <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                                <td className="px-3 py-2 text-center border border-gray-200 dark:border-gray-700 text-gray-500">{idx + 1}</td>
                                                <td className="px-3 py-2 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100">
                                                    <div>{orig.uraian}</div>
                                                    {(orig.kode_kegiatan || orig.kode_rekening) && (
                                                        <div className="text-[10px] text-gray-500 font-mono mt-0.5">
                                                            {orig.kode_kegiatan} {orig.kode_kegiatan && orig.kode_rekening ? ' / ' : ''} {orig.kode_rekening}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-3 py-2 text-right border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100">
                                                    {orig.volume ?? orig.jumlah} {orig.satuan}
                                                </td>
                                                <td className="px-3 py-2 text-right border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 whitespace-nowrap">
                                                    Rp {formatCurrency(orig.harga_satuan || 0)}
                                                </td>
                                                <td className="px-3 py-2 text-right border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 whitespace-nowrap">
                                                    Rp {formatCurrency(orig.total || orig.jumlah || 0)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80 flex justify-end">
                            <button
                                onClick={() => setShowDetailModal(false)}
                                className="bg-sky-600 text-white hover:bg-sky-700 px-4 py-2 rounded-md text-sm font-medium shadow-sm transition-colors"
                            >
                                Tutup
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Modal Pilih Kwitansi */}
            <Modal show={showKwitansiModal} onClose={() => {
                setShowKwitansiModal(false);
                setTimeout(() => setKwitansiDetailData(null), 300); // Reset state after transition
            }} maxWidth={kwitansiDetailData ? "3xl" : "2xl"}>
                <div className="p-6">
                    <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                        {kwitansiDetailData ? "Detail Uraian Kwitansi" : "Pilih Nomor Kwitansi"}
                    </h2>
                    
                    {kwitansiDetailData ? (
                        <div className="space-y-4">
                            <div>
                                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Nomor Kwitansi</h3>
                                <p className="mt-1 text-sm text-gray-900 dark:text-white">{kwitansiDetailData.id_transaksi}</p>
                            </div>
                            <div>
                                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Bulan</h3>
                                <p className="mt-1 text-sm text-gray-900 dark:text-white">{kwitansiDetailData.bulan}</p>
                            </div>
                            <div>
                                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Uraian Detail</h3>
                                {kwitansiDetailData.uraian_details && kwitansiDetailData.uraian_details.length > 0 ? (
                                    <div className="mt-2 overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                                        <table className="min-w-full text-sm">
                                            <thead className="bg-gray-100 dark:bg-gray-700">
                                                <tr>
                                                    <th className="px-3 py-2 text-center font-bold text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 w-12">No</th>
                                                    <th className="px-3 py-2 text-left font-bold text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600">Uraian</th>
                                                    <th className="px-3 py-2 text-right font-bold text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600">Vol</th>
                                                    <th className="px-3 py-2 text-left font-bold text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600">Satuan</th>
                                                    <th className="px-3 py-2 text-right font-bold text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600">Harga Satuan</th>
                                                    <th className="px-3 py-2 text-right font-bold text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600">Total</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
                                                {kwitansiDetailData.uraian_details.map((detail: any, idx: number) => (
                                                    <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                                        <td className="px-3 py-2 text-center border border-gray-200 dark:border-gray-700 text-gray-500">{idx + 1}</td>
                                                        <td className="px-3 py-2 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100">{detail.uraian}</td>
                                                        <td className="px-3 py-2 text-right border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100">{detail.volume}</td>
                                                        <td className="px-3 py-2 text-left border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100">{detail.satuan}</td>
                                                        <td className="px-3 py-2 text-right border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 whitespace-nowrap">Rp {new Intl.NumberFormat('id-ID').format(detail.harga_satuan || 0)}</td>
                                                        <td className="px-3 py-2 text-right border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 whitespace-nowrap">Rp {new Intl.NumberFormat('id-ID').format(detail.jumlah || 0)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <div className="mt-1 p-3 bg-gray-50 dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700">
                                        <p className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap">
                                            {kwitansiDetailData.uraian}
                                        </p>
                                    </div>
                                )}
                            </div>
                            
                            <div className="mt-6 flex justify-end">
                                <SecondaryButton onClick={() => setKwitansiDetailData(null)}>Kembali</SecondaryButton>
                            </div>
                        </div>
                    ) : (
                        <>
                            {isFetchingKwitansi ? (
                        <div className="flex justify-center p-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex flex-col sm:flex-row gap-3">
                                <div className="flex-1">
                                    <input 
                                        type="text" 
                                        placeholder="Cari Nomor atau Uraian..." 
                                        value={searchKwitansi}
                                        onChange={(e) => setSearchKwitansi(e.target.value)}
                                        className="w-full border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 focus:border-indigo-500 dark:focus:border-indigo-600 focus:ring-indigo-500 dark:focus:ring-indigo-600 rounded-md shadow-sm"
                                    />
                                </div>
                                <div className="w-full sm:w-40">
                                    <select 
                                        value={filterTahapKwitansi}
                                        onChange={(e) => setFilterTahapKwitansi(e.target.value)}
                                        className="w-full border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 focus:border-indigo-500 dark:focus:border-indigo-600 focus:ring-indigo-500 dark:focus:ring-indigo-600 rounded-md shadow-sm"
                                    >
                                        <option value="Semua">Semua Tahap</option>
                                        <option value="1">Tahap 1</option>
                                        <option value="2">Tahap 2</option>
                                    </select>
                                </div>
                                <div className="w-full sm:w-40">
                                    <select 
                                        value={filterBulanKwitansi}
                                        onChange={(e) => setFilterBulanKwitansi(e.target.value)}
                                        className="w-full border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 focus:border-indigo-500 dark:focus:border-indigo-600 focus:ring-indigo-500 dark:focus:ring-indigo-600 rounded-md shadow-sm"
                                    >
                                        <option value="Semua">Semua Bulan</option>
                                        <option value="Januari">Januari</option>
                                        <option value="Februari">Februari</option>
                                        <option value="Maret">Maret</option>
                                        <option value="April">April</option>
                                        <option value="Mei">Mei</option>
                                        <option value="Juni">Juni</option>
                                        <option value="Juli">Juli</option>
                                        <option value="Agustus">Agustus</option>
                                        <option value="September">September</option>
                                        <option value="Oktober">Oktober</option>
                                        <option value="November">November</option>
                                        <option value="Desember">Desember</option>
                                    </select>
                                </div>
                            </div>
                            
                            <div className="max-h-[60vh] overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-md">
                                {availableKwitansi.length > 0 ? (
                                    <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400 sticky top-0 shadow-sm">
                                            <tr>
                                                <th className="px-4 py-3 w-10">Pilih</th>
                                                <th className="px-4 py-3">Nomor Kwitansi</th>
                                                <th className="px-4 py-3">Bulan</th>
                                                <th className="px-4 py-3 w-20">Aksi</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {(() => {
                                                const TAHAP_1_MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni'];
                                                const TAHAP_2_MONTHS = ['Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
                                                
                                                const filtered = availableKwitansi.filter(k => {
                                                    let matchesSearch = true;
                                                    let matchesTahap = true;
                                                    let matchesBulan = true;
                                                    
                                                    if (searchKwitansi) {
                                                        const q = searchKwitansi.toLowerCase();
                                                        matchesSearch = (k.id_transaksi?.toLowerCase().includes(q) || k.uraian?.toLowerCase().includes(q));
                                                    }
                                                    
                                                    if (filterTahapKwitansi !== 'Semua') {
                                                        if (filterTahapKwitansi === '1') matchesTahap = TAHAP_1_MONTHS.includes(k.bulan);
                                                        if (filterTahapKwitansi === '2') matchesTahap = TAHAP_2_MONTHS.includes(k.bulan);
                                                    }
                                                    
                                                    if (filterBulanKwitansi !== 'Semua') {
                                                        matchesBulan = k.bulan === filterBulanKwitansi;
                                                    }
                                                    
                                                    return matchesSearch && matchesTahap && matchesBulan;
                                                });
                                                
                                                if (filtered.length === 0) {
                                                    return (
                                                        <tr>
                                                            <td colSpan={4} className="text-center py-8 text-gray-500">
                                                                Tidak ada kwitansi yang cocok dengan filter.
                                                            </td>
                                                        </tr>
                                                    );
                                                }
                                                
                                                return filtered.map((kwitansi, idx) => (
                                                    <tr key={idx} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                                        <td className="px-4 py-3 align-top">
                                                            <input 
                                                                type="checkbox" 
                                                                checked={selectedKwitansi.includes(kwitansi.id_transaksi)}
                                                                onChange={() => toggleKwitansiSelection(kwitansi.id_transaksi)}
                                                                className="w-4 h-4 text-indigo-600 bg-gray-100 border-gray-300 rounded focus:ring-indigo-500"
                                                            />
                                                        </td>
                                                        <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                                                            {kwitansi.id_transaksi}
                                                        </td>
                                                        <td className="px-4 py-3 whitespace-nowrap align-top">
                                                            {kwitansi.bulan}
                                                        </td>
                                                        <td className="px-4 py-3 text-center">
                                                            <button
                                                                type="button"
                                                                onClick={() => setKwitansiDetailData(kwitansi)}
                                                                className="inline-flex items-center px-2 py-1 text-xs font-medium text-center text-white bg-sky-500 rounded hover:bg-sky-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 transition-colors"
                                                            >
                                                                Detail
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ));
                                            })()}
                                        </tbody>
                                    </table>
                                ) : (
                                    <div className="text-center py-8 text-gray-500">
                                        Tidak ada data kwitansi (BKU) untuk anggaran ini.
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                            
                            <div className="mt-6 flex justify-end space-x-3">
                                <SecondaryButton onClick={() => setShowKwitansiModal(false)}>Batal</SecondaryButton>
                                <PrimaryButton onClick={saveKwitansi} disabled={isFetchingKwitansi}>
                                    Simpan Kwitansi
                                </PrimaryButton>
                            </div>
                        </>
                    )}
                </div>
            </Modal>
        </Fragment>
    );
}
