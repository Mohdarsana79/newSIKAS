import React, { Fragment, useState } from 'react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { usePage, router } from '@inertiajs/react';
import axios from 'axios';
import Modal from '@/Components/Modal';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import Surface from '@/Components/ui/Surface';
import DataTable from '@/Components/ui/DataTable';
import IconTile from '@/Components/ui/IconTile';
import StatusBadge from '@/Components/ui/StatusBadge';
import EmptyState from '@/Components/ui/EmptyState';
import { SkeletonRows } from '@/Components/ui/Skeleton';
import DocKopSuratHeader from '@/Components/DocKopSuratHeader';
import { getDisplayUraian } from '@/Utils/rkasUraian';

interface TabRincianPerubahanProps {
    rincianData: any;
    showArkasUraian?: boolean;
    onPrint: (target: string) => void;
    onExportExcel: () => void;
}

export default function TabRincianPerubahan({ rincianData, showArkasUraian = false, onPrint, onExportExcel }: TabRincianPerubahanProps) {
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
                const uraianArkas = (item.uraian_arkas || '').toLowerCase();
                const uraianGabungan = (item.uraian_gabungan || '').toLowerCase();
                const namaPenerima = (item.nama_penerima || '').toLowerCase();
                const nomorRekening = (item.nomor_rekening || '').toLowerCase();
                
                return uraian.includes(q) || 
                       uraianArkas.includes(q) ||
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
            <div className="space-y-4">
            <Surface padding="sm" className="animate-rise">
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Cari uraian..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-48 rounded-xl border border-slate-200/90 bg-white py-2 pl-8 pr-3 text-[12px] font-semibold text-slate-800 shadow-sm transition focus:border-lime-400 focus:outline-none focus:ring-4 focus:ring-lime-200/60 dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:border-lime-400/70 dark:focus:ring-lime-400/10"
                            />
                            <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                                <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                            className="inline-flex items-center gap-2 rounded-2xl bg-amber-500 px-4 py-2.5 text-[11.5px] font-extrabold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-amber-600"
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
                            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-lime-400 px-4 py-2.5 text-[11.5px] font-extrabold text-slate-950 shadow-lime transition-all duration-200 hover:-translate-y-0.5 hover:bg-lime-300"
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
                            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-mint px-4 py-2.5 text-[11.5px] font-extrabold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-emerald-600"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            Export Excel
                        </button>
                    </div>
                </div>
            </Surface>

            {/* Tabel Rincian Belanja Perubahan */}
            <div className="animate-rise" style={{ animationDelay: '80ms' }}>
                <DocKopSuratHeader docKey="rkas_perubahan_rincian" className="mb-4" />
                <DataTable
                    title="Rincian Belanja Perubahan"
                    subtitle="Daftar rincian belanja perubahan per sub program."
                    icon={
                        <IconTile tone="violet" size="sm">
                            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        </IconTile>
                    }
                    actions={<StatusBadge tone="info" dot={false} className="text-sikas-num">{filteredRincianData.length}</StatusBadge>}
                    contentClassName="mx-4 mb-4"
                >
                    <table className="min-w-full divide-y divide-slate-200 dark:divide-white/5">
                        <thead className="bg-slate-50 dark:bg-white/[0.04]">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-10">
                                    <input type="checkbox"
                                        className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-lime-200/60 dark:border-white/10 dark:bg-white/5"
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
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-16">No</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Kode Rekening</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Kode Kegiatan</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Uraian Rekening</th>
                                <th className="px-6 py-4 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Tahap</th>
                                <th className="px-6 py-4 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Bulan</th>
                                <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-48">Jumlah</th>
                                <th className="px-6 py-4 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-32">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-[#15131F] divide-y divide-slate-200 dark:divide-white/5">
                            {filteredRincianData.map((group: any, index: number) => (
                                <Fragment key={`rincian-group-${index}`}>
                                    {/* Sub Program Group Row */}
                                    <tr className="bg-pastel-sky/50 dark:bg-sky/[0.06] transition-colors">
                                        <td className="px-6 py-3 whitespace-nowrap text-sm font-semibold text-sky-800 dark:text-sky-200 border-r border-sky/10 dark:border-sky/20"></td>
                                        <td className="px-6 py-3 whitespace-nowrap text-sm font-semibold text-sky-800 dark:text-sky-200">{index + 1}</td>
                                        <td colSpan={2} className="px-6 py-3 text-sm font-semibold text-sky-800 dark:text-sky-200"></td>
                                        <td className="px-6 py-3 text-sm font-semibold text-sky-800 dark:text-sky-200">{group.sub_program}</td>
                                        <td className="px-6 py-3 border-l border-sky/10 dark:border-sky/20"></td>
                                        <td className="px-6 py-3 border-l border-sky/10 dark:border-sky/20"></td>
                                        <td className="px-6 py-3 whitespace-nowrap text-sm font-bold text-sky-600 dark:text-sky-300 text-right text-sikas-num">{formatCurrency(group.total)}</td>
                                        <td className="px-6 py-3 border-l border-sky/10 dark:border-sky/20"></td>
                                    </tr>
                                    {/* Item Rows */}
                                    {group.items.map((item: any, itemIndex: number) => (
                                        <tr key={`rincian-item-${index}-${itemIndex}`} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                                            <td className="px-6 py-3 whitespace-nowrap text-center border-r border-slate-100 dark:border-white/10">
                                                <input type="checkbox"
                                                    className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-lime-200/60 dark:border-white/10 dark:bg-white/5"
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
                                            <td className="px-6 py-3 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400 border-r border-slate-100 dark:border-white/10"></td>
                                            <td className="px-6 py-3 text-sm text-slate-600 dark:text-slate-400 text-xs">{item.kode_rekening || '-'}</td>
                                            <td className="px-6 py-3 text-sm text-slate-600 dark:text-slate-400 text-xs">{item.kode_kegiatan || '-'}</td>
                                            <td className="px-6 py-3 text-sm text-slate-700 dark:text-slate-300">
                                                <div className="flex items-start gap-2">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-white/30 mt-2"></div>
                                                    <div>
                                                        <div>{getDisplayUraian(item, showArkasUraian)}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-3 text-sm font-medium text-brand-600 dark:text-brand-300 text-center border-l border-slate-100 dark:border-white/10">
                                                Tahap {item.tahap || '-'}
                                            </td>
                                            <td className="px-6 py-3 text-sm text-slate-600 dark:text-slate-400 text-center border-l border-slate-100 dark:border-white/10">
                                                {item.bulan_list?.join(', ') || '-'}
                                            </td>
                                            <td className="px-6 py-3 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-white text-right text-sikas-num">{formatCurrency(item.jumlah)}</td>
                                            <td className="px-6 py-3 text-center border-l border-slate-100 dark:border-white/10">
                                                {item.original_items && item.original_items.length > 1 && (
                                                    <div className="flex gap-1 justify-center flex-wrap">
                                                        <button
                                                            onClick={() => {
                                                                setDetailItem(item);
                                                                setShowDetailModal(true);
                                                            }}
                                                            className="inline-flex items-center justify-center rounded-lg bg-sky-500 px-2 py-1 text-[10px] font-extrabold text-white shadow-sm transition hover:bg-sky-600"
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
                                                            className="inline-flex items-center justify-center rounded-lg bg-amber-500 px-2 py-1 text-[10px] font-extrabold text-white shadow-sm transition hover:bg-amber-600"
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
                                                            className="inline-flex items-center justify-center rounded-lg bg-rose-500 px-2 py-1 text-[10px] font-extrabold text-white shadow-sm transition hover:bg-rose-600 disabled:opacity-50"
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
                            {filteredRincianData.length === 0 && (
                                <tr>
                                    <td colSpan={9} className="p-0">
                                        <EmptyState
                                            className="border-0 bg-transparent py-9 dark:bg-transparent"
                                            title="Tidak ada data rincian belanja."
                                            description="Coba ubah kata kunci pencarian."
                                            icon={
                                                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                </svg>
                                            }
                                        />
                                    </td>
                                </tr>
                            )}
                            <tr className="bg-slate-100 dark:bg-white/5">
                                <td colSpan={7} className="px-6 py-4 text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider text-right">Total Keseluruhan</td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold text-brand-600 dark:text-brand-300 text-sikas-num">
                                    {formatCurrency(rincianData.reduce((acc: any, curr: any) => acc + curr.total, 0))}
                                </td>
                                <td></td>
                            </tr>
                        </tbody>
                    </table>
                </DataTable>
            </div>
            
            {/* Modal Gabung Kegiatan */}
            {showGabungModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white dark:bg-[#15131F] rounded-[26px] shadow-float w-full max-w-md overflow-hidden flex flex-col">
                        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-6 py-4 dark:border-white/5">
                            <h3 className="truncate text-[15px] font-extrabold tracking-tight text-slate-900 dark:text-white">Gabung Kegiatan</h3>
                            <button onClick={() => setShowGabungModal(false)} className="inline-flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-500 dark:hover:bg-white/5 dark:hover:text-white">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        
                        <div className="p-6 overflow-y-auto">
                            <form id="gabung-form-perubahan" onSubmit={handleGabungSubmit} className="space-y-4">
                                {Object.keys(errors).length > 0 && (
                                    <div className="rounded-2xl border border-rose-500/15 border-l-4 border-l-rose-500 bg-pastel-rose/50 p-4 dark:border-rose-400/20 dark:bg-rose-500/[0.08]">
                                        <div className="flex">
                                            <div className="flex-shrink-0">
                                                <svg className="h-5 w-5 text-rose-400 dark:text-rose-300" viewBox="0 0 20 20" fill="currentColor">
                                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                                </svg>
                                            </div>
                                            <div className="ml-3">
                                                <h3 className="text-[11.5px] font-extrabold text-rose-700 dark:text-rose-300">{errors.message || 'Terdapat kesalahan'}</h3>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                <div>
                                    <div className="rounded-2xl border border-brand-500/10 bg-pastel-lavender p-4 mb-4 dark:border-brand-400/20 dark:bg-brand-500/[0.08]">
                                        <p className="text-sm text-brand-700 dark:text-brand-200 mb-1">
                                            Anda memilih <strong>{selectedItems.length}</strong> kegiatan untuk digabung.
                                        </p>
                                        <p className="text-sm font-bold text-brand-600 dark:text-brand-300">
                                            Total Anggaran: Rp {formatCurrency(selectedItems.reduce((sum, item) => sum + (item.jumlah || 0), 0))}
                                        </p>
                                    </div>
                                    <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                                        Nama Kegiatan Baru
                                    </label>
                                    <input 
                                        type="text" 
                                        value={newUraian} 
                                        onChange={e => setNewUraian(e.target.value)} 
                                        required
                                        className="mt-1 block w-full rounded-xl border border-slate-200/90 bg-white px-3.5 py-2.5 text-[12px] font-semibold text-slate-800 shadow-sm transition focus:border-lime-400 focus:outline-none focus:ring-4 focus:ring-lime-200/60 dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:border-lime-400/70 dark:focus:ring-lime-400/10"
                                        placeholder="Masukkan nama gabungan..."
                                    />
                                </div>
                            </form>
                        </div>
                        
                        <div className="flex items-center justify-end gap-2 border-t border-slate-100 bg-white px-6 py-4 dark:border-white/5 dark:bg-[#15131F]">
                            <button
                                type="button"
                                onClick={() => setShowGabungModal(false)}
                                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-[11.5px] font-bold text-slate-700 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
                            >
                                Batal
                            </button>
                            <button
                                type="submit"
                                form="gabung-form-perubahan"
                                disabled={processing || !newUraian}
                                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-amber-500 px-4 py-2.5 text-[11.5px] font-extrabold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
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
                    <div className="bg-white dark:bg-[#15131F] rounded-[26px] shadow-float w-full max-w-sm overflow-hidden flex flex-col">
                        <div className="flex items-center justify-between gap-3 border-b border-rose-500/10 bg-pastel-rose/60 px-6 py-4 dark:border-rose-400/20 dark:bg-rose-500/[0.08]">
                            <h3 className="truncate text-[15px] font-extrabold tracking-tight text-rose-600 dark:text-rose-300">Peringatan</h3>
                            <button onClick={() => setErrorModalMsg(null)} className="inline-flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-500 dark:hover:bg-white/5 dark:hover:text-white">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="p-6">
                            <div className="flex items-center gap-4">
                                <div className="flex-shrink-0 bg-pastel-rose p-3 rounded-full dark:bg-rose-500/15">
                                    <svg className="w-6 h-6 text-rose-500 dark:text-rose-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                </div>
                                <p className="text-sm text-slate-700 dark:text-slate-300">
                                    {errorModalMsg}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center justify-end gap-2 border-t border-slate-100 bg-white px-6 py-4 dark:border-white/5 dark:bg-[#15131F]">
                            <button
                                onClick={() => setErrorModalMsg(null)}
                                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-rose-500 px-4 py-2.5 text-[11.5px] font-extrabold text-white shadow-lg shadow-rose-500/25 transition-all duration-200 hover:-translate-y-0.5 hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
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
                    <div className="bg-white dark:bg-[#15131F] rounded-[26px] shadow-float w-full max-w-md overflow-hidden flex flex-col">
                        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-6 py-4 dark:border-white/5">
                            <h3 className="truncate text-[15px] font-extrabold tracking-tight text-slate-900 dark:text-white">Ganti Nama Gabungan</h3>
                            <button onClick={() => setShowEditGabungModal(false)} className="inline-flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-500 dark:hover:bg-white/5 dark:hover:text-white">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        
                        <div className="p-6 overflow-y-auto">
                            <form id="edit-gabung-form-perubahan" onSubmit={handleEditGabungSubmit} className="space-y-4">
                                {Object.keys(errors).length > 0 && (
                                    <div className="rounded-2xl border border-rose-500/15 border-l-4 border-l-rose-500 bg-pastel-rose/50 p-4 dark:border-rose-400/20 dark:bg-rose-500/[0.08]">
                                        <div className="flex">
                                            <div className="flex-shrink-0">
                                                <svg className="h-5 w-5 text-rose-400 dark:text-rose-300" viewBox="0 0 20 20" fill="currentColor">
                                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                                </svg>
                                            </div>
                                            <div className="ml-3">
                                                <h3 className="text-[11.5px] font-extrabold text-rose-700 dark:text-rose-300">{errors.message || 'Terdapat kesalahan'}</h3>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                <div>
                                    <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                                        Nama Kegiatan Baru
                                    </label>
                                    <input 
                                        type="text" 
                                        value={newGabungName} 
                                        onChange={e => setNewGabungName(e.target.value)} 
                                        required
                                        className="mt-1 block w-full rounded-xl border border-slate-200/90 bg-white px-3.5 py-2.5 text-[12px] font-semibold text-slate-800 shadow-sm transition focus:border-lime-400 focus:outline-none focus:ring-4 focus:ring-lime-200/60 dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:border-lime-400/70 dark:focus:ring-lime-400/10"
                                        placeholder="Masukkan nama gabungan..."
                                    />
                                </div>
                            </form>
                        </div>
                        
                        <div className="flex items-center justify-end gap-2 border-t border-slate-100 bg-white px-6 py-4 dark:border-white/5 dark:bg-[#15131F]">
                            <button
                                type="button"
                                onClick={() => setShowEditGabungModal(false)}
                                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-[11.5px] font-bold text-slate-700 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
                            >
                                Batal
                            </button>
                            <button
                                type="submit"
                                form="edit-gabung-form-perubahan"
                                disabled={isProcessingEditGabung || !newGabungName}
                                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-amber-500 px-4 py-2.5 text-[11.5px] font-extrabold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
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
                    <div className="bg-white dark:bg-[#15131F] rounded-[26px] shadow-float w-full max-w-sm overflow-hidden flex flex-col">
                        <div className="flex items-center justify-between gap-3 border-b border-rose-500/10 bg-pastel-rose/60 px-6 py-4 dark:border-rose-400/20 dark:bg-rose-500/[0.08]">
                            <h3 className="truncate text-[15px] font-extrabold tracking-tight text-rose-600 dark:text-rose-300">Konfirmasi Batal Gabung</h3>
                            <button onClick={() => setShowUngabungModal(false)} className="inline-flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-500 dark:hover:bg-white/5 dark:hover:text-white">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="p-6">
                            <div className="flex items-start gap-4">
                                <div className="flex-shrink-0 bg-pastel-rose p-3 rounded-full dark:bg-rose-500/15 mt-1">
                                    <svg className="w-6 h-6 text-rose-500 dark:text-rose-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                </div>
                                <div>
                                    <p className="text-sm text-slate-700 dark:text-slate-300 font-medium mb-1">
                                        Apakah Anda yakin ingin memisahkan gabungan kegiatan ini?
                                    </p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                        Rincian belanja <strong>{ungabungItem.uraian}</strong> akan dikembalikan menjadi baris-baris terpisah.
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center justify-end gap-2 border-t border-slate-100 bg-white px-6 py-4 dark:border-white/5 dark:bg-[#15131F]">
                            <button
                                type="button"
                                onClick={() => setShowUngabungModal(false)}
                                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-[11.5px] font-bold text-slate-700 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
                            >
                                Batal
                            </button>
                            <button
                                type="button"
                                onClick={() => handleUngabungSubmit()}
                                disabled={isProcessingUngabung}
                                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-rose-500 px-4 py-2.5 text-[11.5px] font-extrabold text-white shadow-lg shadow-rose-500/25 transition-all duration-200 hover:-translate-y-0.5 hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
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
                    <div className="bg-white dark:bg-[#15131F] rounded-[26px] shadow-float w-full max-w-4xl overflow-hidden flex flex-col max-h-[80vh]">
                        <div className="flex items-center justify-between gap-3 border-b border-sky/10 bg-pastel-sky/60 px-6 py-4 dark:border-sky/20 dark:bg-sky/[0.08]">
                            <h3 className="truncate text-[15px] font-extrabold tracking-tight text-sky-700 dark:text-sky-300">Detail Uraian Tergabung</h3>
                            <button onClick={() => setShowDetailModal(false)} className="inline-flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-500 dark:hover:bg-white/5 dark:hover:text-white">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto">
                            <div className="rounded-2xl border border-brand-500/10 bg-pastel-lavender p-4 mb-4 dark:border-brand-400/20 dark:bg-brand-500/[0.08]">
                                <p className="text-sm font-medium text-brand-700 dark:text-brand-200">
                                    Nama Gabungan: <strong>{detailItem.uraian}</strong>
                                </p>
                                <p className="text-xs text-brand-600 dark:text-brand-300 mt-1">
                                    Tahap: {detailItem.tahap} &mdash; Total: Rp {formatCurrency(detailItem.jumlah || 0)}
                                </p>
                            </div>
                            <div className="overflow-x-auto rounded-2xl border border-slate-100 dark:border-white/10">
                                <table className="min-w-full text-sm">
                                    <thead className="bg-slate-100 dark:bg-white/5">
                                        <tr>
                                            <th className="px-3 py-2 text-center font-bold text-slate-900 dark:text-white border border-slate-300 dark:border-white/10 w-12">No</th>
                                            <th className="px-3 py-2 text-left font-bold text-slate-900 dark:text-white border border-slate-300 dark:border-white/10">Uraian Asli</th>
                                            <th className="px-3 py-2 text-right font-bold text-slate-900 dark:text-white border border-slate-300 dark:border-white/10">Vol</th>
                                            <th className="px-3 py-2 text-right font-bold text-slate-900 dark:text-white border border-slate-300 dark:border-white/10">Harga Satuan</th>
                                            <th className="px-3 py-2 text-right font-bold text-slate-900 dark:text-white border border-slate-300 dark:border-white/10">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200 dark:divide-white/5 bg-white dark:bg-[#15131F]">
                                        {detailItem.original_items?.map((orig: any, idx: number) => (
                                            <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-white/5">
                                                <td className="px-3 py-2 text-center border border-slate-200 dark:border-white/10 text-slate-500">{idx + 1}</td>
                                                <td className="px-3 py-2 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white">
                                                    <div>{getDisplayUraian(orig, showArkasUraian)}</div>
                                                    {(orig.kode_kegiatan || orig.kode_rekening) && (
                                                        <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                                                            {orig.kode_kegiatan} {orig.kode_kegiatan && orig.kode_rekening ? ' / ' : ''} {orig.kode_rekening}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-3 py-2 text-right border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white">
                                                    {orig.volume ?? orig.jumlah} {orig.satuan}
                                                </td>
                                                <td className="px-3 py-2 text-right border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white whitespace-nowrap text-sikas-num">
                                                    Rp {formatCurrency(orig.harga_satuan || 0)}
                                                </td>
                                                <td className="px-3 py-2 text-right border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white whitespace-nowrap text-sikas-num">
                                                    Rp {formatCurrency(orig.total || orig.jumlah || 0)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        <div className="flex items-center justify-end gap-2 border-t border-slate-100 bg-white px-6 py-4 dark:border-white/5 dark:bg-[#15131F]">
                            <button
                                onClick={() => setShowDetailModal(false)}
                                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-sky-500 px-4 py-2.5 text-[11.5px] font-extrabold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-sky-600"
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
                    <h2 className="mb-4 text-[15px] font-extrabold tracking-tight text-slate-900 dark:text-white">
                        {kwitansiDetailData ? "Detail Uraian Kwitansi" : "Pilih Nomor Kwitansi"}
                    </h2>
                    
                    {kwitansiDetailData ? (
                        <div className="space-y-4">
                            <div>
                                <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">Nomor Kwitansi</h3>
                                <p className="mt-1 text-sm text-slate-900 dark:text-white">{kwitansiDetailData.id_transaksi}</p>
                            </div>
                            <div>
                                <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">Bulan</h3>
                                <p className="mt-1 text-sm text-slate-900 dark:text-white">{kwitansiDetailData.bulan}</p>
                            </div>
                            <div>
                                <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">Uraian Detail</h3>
                                {kwitansiDetailData.uraian_details && kwitansiDetailData.uraian_details.length > 0 ? (
                                    <div className="sikas-scroll mt-2 max-h-[60vh] overflow-auto rounded-2xl border border-slate-100 dark:border-white/10">
                                        <table className="min-w-full text-sm">
                                            <thead className="bg-slate-100 dark:bg-white/5 sticky top-0 z-10 shadow-sm">
                                                <tr>
                                                    <th className="px-3 py-2 text-center font-bold text-slate-900 dark:text-white border border-slate-300 dark:border-white/10 w-12">No</th>
                                                    <th className="px-3 py-2 text-left font-bold text-slate-900 dark:text-white border border-slate-300 dark:border-white/10">Uraian</th>
                                                    <th className="px-3 py-2 text-right font-bold text-slate-900 dark:text-white border border-slate-300 dark:border-white/10">Vol</th>
                                                    <th className="px-3 py-2 text-left font-bold text-slate-900 dark:text-white border border-slate-300 dark:border-white/10">Satuan</th>
                                                    <th className="px-3 py-2 text-right font-bold text-slate-900 dark:text-white border border-slate-300 dark:border-white/10">Harga Satuan</th>
                                                    <th className="px-3 py-2 text-right font-bold text-slate-900 dark:text-white border border-slate-300 dark:border-white/10">Total</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-200 dark:divide-white/5 bg-white dark:bg-[#15131F]">
                                                {kwitansiDetailData.uraian_details.map((detail: any, idx: number) => (
                                                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-white/5">
                                                        <td className="px-3 py-2 text-center border border-slate-200 dark:border-white/10 text-slate-500">{idx + 1}</td>
                                                        <td className="px-3 py-2 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white">{detail.uraian}</td>
                                                        <td className="px-3 py-2 text-right border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white">{detail.volume}</td>
                                                        <td className="px-3 py-2 text-left border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white">{detail.satuan}</td>
                                                        <td className="px-3 py-2 text-right border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white whitespace-nowrap text-sikas-num">Rp {new Intl.NumberFormat('id-ID').format(detail.harga_satuan || 0)}</td>
                                                        <td className="px-3 py-2 text-right border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white whitespace-nowrap text-sikas-num">Rp {new Intl.NumberFormat('id-ID').format(detail.jumlah || 0)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <div className="mt-1 rounded-xl border border-slate-100 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/[0.03]">
                                        <p className="text-sm text-slate-900 dark:text-white whitespace-pre-wrap">
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
                        <SkeletonRows rows={4} columns={3} />
                    ) : (
                        <div className="space-y-4">
                            <div className="flex flex-col sm:flex-row gap-3">
                                <div className="flex-1">
                                    <input 
                                        type="text" 
                                        placeholder="Cari Nomor atau Uraian..." 
                                        value={searchKwitansi}
                                        onChange={(e) => setSearchKwitansi(e.target.value)}
                                        className="w-full rounded-xl border border-slate-200/90 bg-white px-3.5 py-2.5 text-[12px] font-semibold text-slate-800 shadow-sm transition focus:border-lime-400 focus:outline-none focus:ring-4 focus:ring-lime-200/60 dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:border-lime-400/70 dark:focus:ring-lime-400/10"
                                    />
                                </div>
                                <div className="w-full sm:w-40">
                                    <select 
                                        value={filterTahapKwitansi}
                                        onChange={(e) => setFilterTahapKwitansi(e.target.value)}
                                        className="w-full rounded-xl border border-slate-200/90 bg-white px-3.5 py-2.5 text-[12px] font-semibold text-slate-800 shadow-sm transition focus:border-lime-400 focus:outline-none focus:ring-4 focus:ring-lime-200/60 dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:border-lime-400/70 dark:focus:ring-lime-400/10"
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
                                        className="w-full rounded-xl border border-slate-200/90 bg-white px-3.5 py-2.5 text-[12px] font-semibold text-slate-800 shadow-sm transition focus:border-lime-400 focus:outline-none focus:ring-4 focus:ring-lime-200/60 dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:border-lime-400/70 dark:focus:ring-lime-400/10"
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
                            
                            <div className="sikas-scroll max-h-[60vh] overflow-y-auto rounded-2xl border border-slate-100 dark:border-white/10">
                                {availableKwitansi.length > 0 ? (
                                    <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
                                        <thead className="text-xs text-slate-700 uppercase bg-slate-50 dark:bg-white/5 dark:text-slate-400 sticky top-0 shadow-sm">
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
                                                            <td colSpan={4} className="text-center py-8 text-slate-500">
                                                                Tidak ada kwitansi yang cocok dengan filter.
                                                            </td>
                                                        </tr>
                                                    );
                                                }
                                                
                                                return filtered.map((kwitansi, idx) => (
                                                    <tr key={idx} className="bg-white border-b dark:bg-[#15131F] dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/10">
                                                        <td className="px-4 py-3 align-top">
                                                            <input 
                                                                type="checkbox" 
                                                                checked={selectedKwitansi.includes(kwitansi.id_transaksi)}
                                                                onChange={() => toggleKwitansiSelection(kwitansi.id_transaksi)}
                                                                className="h-4 w-4 rounded border-slate-300 bg-slate-100 text-brand-600 focus:ring-lime-200/60 dark:border-white/10 dark:bg-white/5"
                                                            />
                                                        </td>
                                                        <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">
                                                            {kwitansi.id_transaksi}
                                                        </td>
                                                        <td className="px-4 py-3 whitespace-nowrap align-top">
                                                            {kwitansi.bulan}
                                                        </td>
                                                        <td className="px-4 py-3 text-center">
                                                            <button
                                                                type="button"
                                                                onClick={() => setKwitansiDetailData(kwitansi)}
                                                                className="inline-flex items-center rounded-lg bg-sky-500 px-2 py-1 text-[10px] font-extrabold text-white shadow-sm transition hover:bg-sky-600 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2"
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
                                    <div className="text-center py-8 text-slate-500">
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
            </div>
        </Fragment>
    );
}
