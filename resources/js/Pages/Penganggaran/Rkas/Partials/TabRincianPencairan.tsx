import { Fragment, useState, useMemo } from 'react';
import { useForm, usePage } from '@inertiajs/react';
import CreatableSelect from 'react-select/creatable';

interface TabRincianPencairanProps {
    anggaran: any;
    tahapanData: any;
    variant: string;
    onPrint?: (target: string, params?: Record<string, any>) => void;
    onExportExcel?: (target: string, params?: Record<string, any>) => void;
}

// Tarif PPH 21 Non-PNS dengan NIK/NPWP
const TARIF_NON_PNS_NPWP = [
    { min: 0, max: 5400000, rate: 0 },
    { min: 5400000, max: 5700000, rate: 0.0025 },
    { min: 5700000, max: 6000000, rate: 0.005 },
    { min: 6000000, max: 6300000, rate: 0.0075 },
    { min: 6300000, max: 6800000, rate: 0.01 },
    { min: 6800000, max: 7500000, rate: 0.0125 },
    { min: 7500000, max: 8600000, rate: 0.015 },
    { min: 8600000, max: 9700000, rate: 0.0175 },
    { min: 9700000, max: 10100000, rate: 0.02 },
    { min: 10100000, max: 10300000, rate: 0.0225 },
    { min: 10300000, max: 10700000, rate: 0.025 },
    { min: 10700000, max: 11100000, rate: 0.03 },
    { min: 11100000, max: 11600000, rate: 0.035 },
    { min: 11600000, max: 12500000, rate: 0.04 },
    { min: 12500000, max: 13800000, rate: 0.05 },
    { min: 13800000, max: 15100000, rate: 0.06 },
    { min: 15100000, max: Infinity, rate: 0.06 },
];

// Tarif PPH 21 Non-PNS tanpa NIK/NPWP
const TARIF_NON_PNS_TANPA_NPWP = [
    { min: 0, max: 5400000, rate: 0 },
    { min: 5400000, max: 5700000, rate: 0.005 },
    { min: 5700000, max: 6000000, rate: 0.01 },
    { min: 6000000, max: 6300000, rate: 0.015 },
    { min: 6300000, max: 6800000, rate: 0.02 },
    { min: 6800000, max: 7500000, rate: 0.025 },
    { min: 7500000, max: 8600000, rate: 0.03 },
    { min: 8600000, max: 9700000, rate: 0.035 },
    { min: 9700000, max: 10100000, rate: 0.04 },
    { min: 10100000, max: 10300000, rate: 0.045 },
    { min: 10300000, max: 10700000, rate: 0.05 },
    { min: 10700000, max: 11100000, rate: 0.06 },
    { min: 11100000, max: 11600000, rate: 0.07 },
    { min: 11600000, max: 12500000, rate: 0.08 },
    { min: 12500000, max: 13800000, rate: 0.10 },
    { min: 13800000, max: 15100000, rate: 0.12 },
    { min: 15100000, max: Infinity, rate: 0.12 },
];

// Tarif PPH 21 PNS berdasarkan golongan
const TARIF_PNS_GOLONGAN: Record<string, number> = {
    'I': 0,
    'II': 0,
    'III': 0.05,
    'IV': 0.15,
};

function getPph21Rate(statusPenerima: string, golongan: string, adaNpwp: boolean, penghasilan: number): number {
    if (statusPenerima === 'pns') {
        return TARIF_PNS_GOLONGAN[golongan] || 0;
    }
    
    // Non-ASN
    const tarifTable = adaNpwp ? TARIF_NON_PNS_NPWP : TARIF_NON_PNS_TANPA_NPWP;
    for (const bracket of tarifTable) {
        if (penghasilan >= bracket.min && penghasilan < bracket.max) {
            return bracket.rate;
        }
    }
    return tarifTable[tarifTable.length - 1].rate;
}

export default function TabRincianPencairan({ anggaran, tahapanData, variant, onPrint, onExportExcel }: TabRincianPencairanProps) {
    const { routePrefix } = usePage().props as any;
    const [editingItem, setEditingItem] = useState<any | null>(null);
    const [selectedTahap, setSelectedTahap] = useState<number>(1);

    const { data, setData, put, processing, errors, reset } = useForm({
        uraian: '',
        kode_rekening_id: '',
        nama_penerima: '',
        jabatan: '',
        nomor_rekening: '',
        bank: '',
        ada_npwp: false,
        pot_ppn: '',
        pot_pph23: '',
        pot_pph21: '',
        status_penerima: '' as string,
        golongan: '' as string,
    });

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('id-ID').format(amount);
    };

    // Flatten all items from the hierarchical tahapanData structure
    const flatItems = useMemo(() => {
        const items: any[] = [];
        if (!tahapanData) return items;

        Object.entries(tahapanData).forEach(([progCode, program]: [string, any]) => {
            if (!program.sub_programs) return;
            Object.entries(program.sub_programs).forEach(([subCode, subProgram]: [string, any]) => {
                if (!subProgram.uraian_programs) return;
                Object.entries(subProgram.uraian_programs).forEach(([urCode, urProgram]: [string, any]) => {
                    if (!urProgram.items) return;
                    urProgram.items.forEach((item: any) => {
                        items.push(item);
                    });
                });
            });
        });

        return items;
    }, [tahapanData]);

    // Filter items by selected phase
    const visibleItems = useMemo(() => {
        return flatItems.filter((item: any) => {
            const jumlahAnggaran = selectedTahap === 1 ? (item.tahap1 || 0) : (item.tahap2 || 0);
            return jumlahAnggaran > 0;
        });
    }, [flatItems, selectedTahap]);

    // Calculate totals
    const totals = useMemo(() => {
        let totalAnggaran = 0;
        let totalPpn = 0;
        let totalPph23 = 0;
        let totalPph21 = 0;
        let totalDiterima = 0;

        visibleItems.forEach(item => {
            const jumlahAnggaran = selectedTahap === 1 ? (item.tahap1 || 0) : (item.tahap2 || 0);
            const ppn = Number(item.pot_ppn) || 0;
            const pph23 = Number(item.pot_pph23) || 0;
            const pph21 = Number(item.pot_pph21) || 0;
            const diterima = jumlahAnggaran - ppn - pph23 - pph21;

            totalAnggaran += jumlahAnggaran;
            totalPpn += ppn;
            totalPph23 += pph23;
            totalPph21 += pph21;
            totalDiterima += diterima;
        });

        return { totalAnggaran, totalPpn, totalPph23, totalPph21, totalDiterima };
    }, [visibleItems, selectedTahap]);

    // Extract unique recipients from all items
    const recipientsOptions = useMemo(() => {
        const list: any[] = [];
        const names = new Set();
        flatItems.forEach(item => {
            if (item.nama_penerima && !names.has(item.nama_penerima)) {
                // Filter out 'Test Silpa' as requested
                if (item.nama_penerima.toLowerCase() === 'test silpa') {
                    return;
                }
                
                names.add(item.nama_penerima);
                list.push({
                    value: item.nama_penerima,
                    label: item.nama_penerima,
                    data: {
                        jabatan: item.jabatan || '',
                        nomor_rekening: item.nomor_rekening || '',
                        bank: item.bank || '',
                        ada_npwp: item.ada_npwp == 1,
                        status_penerima: item.status_penerima || '',
                        golongan: item.golongan || '',
                    }
                });
            }
        });
        return list;
    }, [flatItems]);

    const handleEditClick = (item: any) => {
        setEditingItem(item);
        setData({
            uraian: item.uraian,
            kode_rekening_id: item.kode_rekening_id,
            nama_penerima: item.nama_penerima || '',
            jabatan: item.jabatan || '',
            nomor_rekening: item.nomor_rekening || '',
            bank: item.bank || '',
            ada_npwp: item.ada_npwp == 1,
            pot_ppn: item.pot_ppn || '',
            pot_pph23: item.pot_pph23 || '',
            pot_pph21: item.pot_pph21 || '',
            status_penerima: item.status_penerima || '',
            golongan: item.golongan || '',
        });
    };

    const [isCalculating, setIsCalculating] = useState(false);

    const handleAutoCalculate = () => {
        if (!editingItem) return;
        
        setIsCalculating(true);
        
        // Use setTimeout to allow UI to show loading state briefly
        setTimeout(() => {
            let newPpn = '';
            let newPph23 = '';
            let newPph21 = '';
            
            const jumlah = editingItem.jumlah || 0;
            
            // PPN: 11/111 x harga barang (hanya jika >= 2.000.000)
            if (editingItem.is_ppn && jumlah >= 2000000) {
                newPpn = Math.round((jumlah * 11) / 111).toString();
            }
            
            // PPh 23: 2% (ada NPWP) atau 4% (tanpa NPWP)
            if (editingItem.is_pph23) {
                if (data.ada_npwp) {
                    newPph23 = Math.round(jumlah * 0.02).toString();
                } else {
                    newPph23 = Math.round(jumlah * 0.04).toString();
                }
            }

            // PPh 21: berdasarkan status dan golongan
            if (editingItem.is_pph21 && data.status_penerima) {
                const rate = getPph21Rate(data.status_penerima, data.golongan, data.ada_npwp, jumlah);
                newPph21 = Math.round(jumlah * rate).toString();
            }

            setData(prev => ({
                ...prev,
                pot_ppn: newPpn,
                pot_pph23: newPph23,
                pot_pph21: newPph21,
            }));
            
            setIsCalculating(false);
        }, 500); // 500ms delay to show processing feedback
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        let baseRoute = 'rkas.update-rincian-pencairan';
        if (variant === 'rkas_perubahan') {
            baseRoute = 'rkas-perubahan.update-rincian-pencairan';
        }

        const routeName = (routePrefix || '') + baseRoute;

        put(route(routeName, anggaran.id), {
            preserveScroll: true,
            onSuccess: () => {
                setEditingItem(null);
                reset();
            },
            onError: (err) => {
                console.error("Validation Errors:", err);
            }
        });
    };

    const handlePrint = () => {
        if (onPrint) {
            onPrint('rp', { tahap: selectedTahap });
        }
    };

    const handleExportExcel = () => {
        if (onExportExcel) {
            onExportExcel('rp', { tahap: selectedTahap });
        }
    };

    return (
        <div className="space-y-8 animate-fade-in-up">
            <div className="bg-white dark:bg-gray-800 p-8 border border-gray-200 dark:border-gray-700 shadow-sm rounded-lg">
                {/* Header Info */}
                <div className="mb-6">
                    <table className="text-sm text-gray-900 dark:text-gray-100">
                        <tbody>
                            <tr>
                                <td className="font-bold pr-2 py-0.5 whitespace-nowrap">Program</td>
                                <td className="pr-2 py-0.5">:</td>
                                <td className="font-bold py-0.5">BOS REGULER</td>
                            </tr>
                            <tr>
                                <td className="font-bold pr-2 py-0.5 whitespace-nowrap">Kegiatan</td>
                                <td className="pr-2 py-0.5">:</td>
                                <td className="py-0.5 font-bold">Daftar Rincian Pencairan BOS Reguler Tahap {selectedTahap} Tahun {anggaran.tahun_anggaran}</td>
                            </tr>
                            <tr>
                                <td className="font-bold pr-2 py-0.5 whitespace-nowrap">Nama Satuan</td>
                                <td className="pr-2 py-0.5">:</td>
                                <td className="font-bold py-0.5">{anggaran.sekolah?.nama_sekolah || '-'}</td>
                            </tr>
                            <tr>
                                <td className="font-bold pr-2 py-0.5 whitespace-nowrap">NPSN</td>
                                <td className="pr-2 py-0.5">:</td>
                                <td className="font-bold py-0.5">{anggaran.sekolah?.npsn || '-'}</td>
                            </tr>
                            <tr>
                                <td className="font-bold pr-2 py-0.5 whitespace-nowrap">Kecamatan</td>
                                <td className="pr-2 py-0.5">:</td>
                                <td className="font-bold py-0.5">{anggaran.sekolah?.kecamatan || '-'}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* Controls: Tahap selector + Print/Export buttons */}
                <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                    <div className="flex items-center gap-3">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Tahap:</label>
                        <select
                            value={selectedTahap}
                            onChange={(e) => setSelectedTahap(Number(e.target.value))}
                            className="rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm"
                        >
                            <option value={1}>Tahap 1</option>
                            <option value={2}>Tahap 2</option>
                        </select>
                    </div>
                    <div className="flex gap-2">
                        {onPrint && (
                            <button
                                onClick={handlePrint}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md font-medium text-sm flex items-center gap-2 transition-colors"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                </svg>
                                Cetak PDF
                            </button>
                        )}
                        {onExportExcel && (
                            <button
                                onClick={handleExportExcel}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-md font-medium text-sm flex items-center gap-2 transition-colors shadow-sm"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                                </svg>
                                Excel
                            </button>
                        )}
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                    <table className="min-w-full text-sm">
                        <thead className="bg-gray-100 dark:bg-gray-700 border-y border-gray-300 dark:border-gray-600">
                            <tr>
                                <th className="px-3 py-2 text-center font-bold text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 w-10" rowSpan={2}>No</th>
                                <th className="px-3 py-2 text-center font-bold text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600" rowSpan={2}>Nama Kegiatan</th>
                                <th className="px-3 py-2 text-center font-bold text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600" rowSpan={2}>Nama Penerima</th>
                                <th className="px-3 py-2 text-center font-bold text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600" rowSpan={2}>Jabatan</th>
                                <th className="px-3 py-2 text-center font-bold text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 whitespace-nowrap" rowSpan={2}>Jumlah<br/>Anggaran<br/>(Rp)</th>
                                <th className="px-3 py-2 text-center font-bold text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 whitespace-nowrap" rowSpan={2}>Pot. PPN</th>
                                <th className="px-3 py-2 text-center font-bold text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 whitespace-nowrap" rowSpan={2}>Pot. PPH 23</th>
                                <th className="px-3 py-2 text-center font-bold text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 whitespace-nowrap" rowSpan={2}>Pot. PPH 21</th>
                                <th className="px-3 py-2 text-center font-bold text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 whitespace-nowrap" rowSpan={2}>Jumlah Yang<br/>Diterima<br/>(Rp)</th>
                                <th className="px-3 py-2 text-center font-bold text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 whitespace-nowrap" rowSpan={2}>Nomor Rekening</th>
                                <th className="px-3 py-2 text-center font-bold text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 w-16" rowSpan={2}>Bank</th>
                                <th className="px-3 py-2 text-center font-bold text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 w-16" rowSpan={2}>Aksi</th>
                            </tr>
                        </thead>
                        <thead className="bg-gray-50 dark:bg-gray-700/50">
                            <tr>
                                <th className="px-3 py-1 text-center text-xs text-gray-500 dark:text-gray-400 border border-gray-300 dark:border-gray-600">1</th>
                                <th className="px-3 py-1 text-center text-xs text-gray-500 dark:text-gray-400 border border-gray-300 dark:border-gray-600">2</th>
                                <th className="px-3 py-1 text-center text-xs text-gray-500 dark:text-gray-400 border border-gray-300 dark:border-gray-600">3</th>
                                <th className="px-3 py-1 text-center text-xs text-gray-500 dark:text-gray-400 border border-gray-300 dark:border-gray-600">4</th>
                                <th className="px-3 py-1 text-center text-xs text-gray-500 dark:text-gray-400 border border-gray-300 dark:border-gray-600">5</th>
                                <th className="px-3 py-1 text-center text-xs text-gray-500 dark:text-gray-400 border border-gray-300 dark:border-gray-600">6</th>
                                <th className="px-3 py-1 text-center text-xs text-gray-500 dark:text-gray-400 border border-gray-300 dark:border-gray-600">7</th>
                                <th className="px-3 py-1 text-center text-xs text-gray-500 dark:text-gray-400 border border-gray-300 dark:border-gray-600">8</th>
                                <th className="px-3 py-1 text-center text-xs text-gray-500 dark:text-gray-400 border border-gray-300 dark:border-gray-600">9</th>
                                <th className="px-3 py-1 text-center text-xs text-gray-500 dark:text-gray-400 border border-gray-300 dark:border-gray-600">10</th>
                                <th className="px-3 py-1 text-center text-xs text-gray-500 dark:text-gray-400 border border-gray-300 dark:border-gray-600">11</th>
                                <th className="px-3 py-1 text-center text-xs text-gray-500 dark:text-gray-400 border border-gray-300 dark:border-gray-600"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
                            {visibleItems.map((item: any, index: number) => {
                                const jumlahAnggaran = selectedTahap === 1 ? (item.tahap1 || 0) : (item.tahap2 || 0);
                                const ppn = Number(item.pot_ppn) || 0;
                                const pph23 = Number(item.pot_pph23) || 0;
                                const pph21 = Number(item.pot_pph21) || 0;
                                const jumlahDiterima = jumlahAnggaran - ppn - pph23 - pph21;

                                return (
                                    <tr key={`item-${index}`} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                        <td className="px-3 py-2 text-center border border-gray-200 dark:border-gray-700">{index + 1}</td>
                                        <td className="px-3 py-2 border border-gray-200 dark:border-gray-700">
                                            <div className="text-gray-900 dark:text-gray-100">{item.uraian}</div>
                                        </td>
                                        <td className="px-3 py-2 border border-gray-200 dark:border-gray-700">
                                            {item.nama_penerima ? (
                                                <span className="text-gray-900 dark:text-gray-100">{item.nama_penerima}</span>
                                            ) : (
                                                <span className="text-red-500 italic text-xs">Belum diisi</span>
                                            )}
                                        </td>
                                        <td className="px-3 py-2 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100">{item.jabatan || '-'}</td>
                                        <td className="px-3 py-2 text-right border border-gray-200 dark:border-gray-700 font-medium text-gray-900 dark:text-gray-100 whitespace-nowrap">
                                            {jumlahAnggaran > 0 ? formatCurrency(jumlahAnggaran) : '-'}
                                        </td>
                                        <td className="px-3 py-2 text-right border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 whitespace-nowrap">
                                            {ppn > 0 ? formatCurrency(ppn) : '-'}
                                        </td>
                                        <td className="px-3 py-2 text-right border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 whitespace-nowrap">
                                            {pph23 > 0 ? formatCurrency(pph23) : '-'}
                                        </td>
                                        <td className="px-3 py-2 text-right border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 whitespace-nowrap">
                                            {pph21 > 0 ? formatCurrency(pph21) : '-'}
                                        </td>
                                        <td className="px-3 py-2 text-right border border-gray-200 dark:border-gray-700 font-medium text-gray-900 dark:text-gray-100 whitespace-nowrap">
                                            {jumlahDiterima > 0 ? formatCurrency(jumlahDiterima) : '-'}
                                        </td>
                                        <td className="px-3 py-2 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 whitespace-nowrap font-mono text-xs">
                                            {item.nomor_rekening || '-'}
                                        </td>
                                        <td className="px-3 py-2 text-center border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100">
                                            {item.bank || '-'}
                                        </td>
                                        <td className="px-3 py-2 text-center border border-gray-200 dark:border-gray-700">
                                            <button
                                                onClick={() => handleEditClick(item)}
                                                className="inline-flex items-center justify-center px-3 py-1.5 text-xs font-medium rounded text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-colors"
                                            >
                                                Edit
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}

                            {/* Baris Jumlah */}
                            <tr className="bg-gray-100 dark:bg-gray-700 font-bold">
                                <td colSpan={4} className="px-3 py-2 text-center border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100">Jumlah</td>
                                <td className="px-3 py-2 text-right border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 whitespace-nowrap">
                                    {formatCurrency(totals.totalAnggaran)}
                                </td>
                                <td className="px-3 py-2 text-right border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 whitespace-nowrap">
                                    {totals.totalPpn > 0 ? formatCurrency(totals.totalPpn) : '-'}
                                </td>
                                <td className="px-3 py-2 text-right border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 whitespace-nowrap">
                                    {totals.totalPph23 > 0 ? formatCurrency(totals.totalPph23) : '-'}
                                </td>
                                <td className="px-3 py-2 text-right border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 whitespace-nowrap">
                                    {totals.totalPph21 > 0 ? formatCurrency(totals.totalPph21) : '-'}
                                </td>
                                <td className="px-3 py-2 text-right border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 whitespace-nowrap">
                                    {formatCurrency(totals.totalDiterima)}
                                </td>
                                <td colSpan={3} className="px-3 py-2 border border-gray-300 dark:border-gray-600"></td>
                            </tr>

                            {visibleItems.length === 0 && (
                                <tr>
                                    <td colSpan={12} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400 italic">
                                        Tidak ada data rincian pencairan.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal Edit Rincian Pencairan */}
            {editingItem && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800/80">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Edit Rincian Pencairan</h3>
                            <button onClick={() => setEditingItem(null)} className="text-gray-400 hover:text-gray-500 transition-colors">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        
                        <div className="p-6 overflow-y-auto">
                            <form id="rp-form" onSubmit={handleSubmit} className="space-y-4">
                                {Object.keys(errors).length > 0 && (
                                    <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg">
                                        <div className="flex">
                                            <div className="flex-shrink-0">
                                                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                                </svg>
                                            </div>
                                            <div className="ml-3">
                                                <h3 className="text-sm font-medium text-red-800">Terdapat kesalahan saat menyimpan:</h3>
                                                <ul className="mt-1 text-sm text-red-700 list-disc list-inside">
                                                    {Object.entries(errors).map(([field, err], idx) => (
                                                        <li key={idx}><span className="font-semibold capitalize">{field.replace('_', ' ')}</span>: {err}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-lg mb-4">
                                    <p className="text-sm font-medium text-indigo-900 dark:text-indigo-200">{editingItem.kode_rekening} - {editingItem.uraian}</p>
                                    <p className="text-xs text-indigo-700 dark:text-indigo-300 mt-1">Jumlah: Rp {formatCurrency(editingItem.jumlah)}</p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nama Penerima</label>
                                        <CreatableSelect
                                            isClearable
                                            options={recipientsOptions}
                                            value={data.nama_penerima ? { label: data.nama_penerima, value: data.nama_penerima } : null}
                                            onChange={(selected: any) => {
                                                if (selected) {
                                                    setData(prev => ({
                                                        ...prev,
                                                        nama_penerima: selected.value,
                                                        ...(selected.data ? {
                                                            jabatan: selected.data.jabatan || '',
                                                            nomor_rekening: selected.data.nomor_rekening || '',
                                                            bank: selected.data.bank || '',
                                                            ada_npwp: selected.data.ada_npwp,
                                                            status_penerima: selected.data.status_penerima || '',
                                                            golongan: selected.data.golongan || '',
                                                        } : {})
                                                    }));
                                                } else {
                                                    setData(prev => ({
                                                        ...prev,
                                                        nama_penerima: '',
                                                        jabatan: '',
                                                        nomor_rekening: '',
                                                        bank: '',
                                                        ada_npwp: false,
                                                        status_penerima: '',
                                                        golongan: '',
                                                    }));
                                                }
                                            }}
                                            placeholder="Ketik atau Pilih Penerima..."
                                            formatCreateLabel={(inputValue) => `+ Tambah manual "${inputValue}"`}
                                            noOptionsMessage={() => "Ketik untuk mencari atau menambah"}
                                            className="mt-1 react-select-container [&_input:focus]:!ring-0 [&_input:focus]:!border-transparent [&_input:focus]:!shadow-none [&_input]:!ring-0 [&_input]:!shadow-none [&_input]:!border-transparent"
                                            classNamePrefix="react-select"
                                            styles={{
                                                control: (base, state) => ({
                                                    ...base,
                                                    borderRadius: '0.375rem',
                                                    borderColor: state.isFocused ? '#6366f1' : '#d1d5db',
                                                    '&:hover': { borderColor: '#9ca3af' },
                                                    boxShadow: 'none',
                                                    backgroundColor: 'transparent'
                                                }),
                                                menu: (base) => ({ ...base, zIndex: 9999 })
                                            }}
                                        />
                                        {errors.nama_penerima && <p className="mt-1 text-sm text-red-600">{errors.nama_penerima}</p>}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Jabatan</label>
                                        <input type="text" value={data.jabatan} onChange={e => setData('jabatan', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nomor Rekening</label>
                                        <input type="text" value={data.nomor_rekening} onChange={e => setData('nomor_rekening', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Bank</label>
                                        <input type="text" value={data.bank} onChange={e => setData('bank', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Status Penerima</label>
                                        <select value={data.status_penerima} onChange={e => setData('status_penerima', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                                            <option value="">-- Pilih --</option>
                                            <option value="pns">PNS</option>
                                            <option value="non_asn">Non-ASN</option>
                                        </select>
                                    </div>
                                    {data.status_penerima === 'pns' && (
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Golongan</label>
                                            <select value={data.golongan} onChange={e => setData('golongan', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                                                <option value="">-- Pilih --</option>
                                                <option value="I">Golongan I (0%)</option>
                                                <option value="II">Golongan II (0%)</option>
                                                <option value="III">Golongan III (5%)</option>
                                                <option value="IV">Golongan IV (15%)</option>
                                            </select>
                                        </div>
                                    )}
                                    <div className="md:col-span-2 flex items-center mt-2">
                                        <input type="checkbox" id="ada_npwp" checked={data.ada_npwp} onChange={e => setData('ada_npwp', e.target.checked)} className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded dark:border-gray-600 dark:bg-gray-700" />
                                        <label htmlFor="ada_npwp" className="ml-2 block text-sm text-gray-900 dark:text-gray-300">Ada NPWP / NIK?</label>
                                    </div>
                                    
                                    <div className="md:col-span-2 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                                        <div className="flex justify-between items-center mb-4">
                                            <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100">Potongan Pajak</h4>
                                            <button 
                                                type="button" 
                                                onClick={handleAutoCalculate} 
                                                disabled={isCalculating}
                                                className="text-xs bg-indigo-100 text-indigo-700 hover:bg-indigo-200 px-3 py-1 rounded shadow-sm font-medium transition-colors disabled:opacity-75 disabled:cursor-wait flex items-center gap-1"
                                            >
                                                {isCalculating ? (
                                                    <>
                                                        <svg className="animate-spin h-3 w-3 text-indigo-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                        </svg>
                                                        Menghitung...
                                                    </>
                                                ) : 'Hitung Otomatis'}
                                            </button>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Pot. PPN (11/111)</label>
                                                <div className="mt-1 relative rounded-md shadow-sm">
                                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                        <span className="text-gray-500 sm:text-sm">Rp</span>
                                                    </div>
                                                    <input 
                                                        type="text" 
                                                        value={data.pot_ppn ? formatCurrency(Number(data.pot_ppn)) : ''} 
                                                        onChange={e => {
                                                            const val = e.target.value.replace(/[^0-9]/g, '');
                                                            setData('pot_ppn', val);
                                                        }} 
                                                        className="block w-full pl-10 rounded-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" 
                                                        placeholder="0"
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Pot. PPh 23</label>
                                                <div className="mt-1 relative rounded-md shadow-sm">
                                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                        <span className="text-gray-500 sm:text-sm">Rp</span>
                                                    </div>
                                                    <input 
                                                        type="text" 
                                                        value={data.pot_pph23 ? formatCurrency(Number(data.pot_pph23)) : ''} 
                                                        onChange={e => {
                                                            const val = e.target.value.replace(/[^0-9]/g, '');
                                                            setData('pot_pph23', val);
                                                        }} 
                                                        className="block w-full pl-10 rounded-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" 
                                                        placeholder="0"
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Pot. PPh 21</label>
                                                <div className="mt-1 relative rounded-md shadow-sm">
                                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                        <span className="text-gray-500 sm:text-sm">Rp</span>
                                                    </div>
                                                    <input 
                                                        type="text" 
                                                        value={data.pot_pph21 ? formatCurrency(Number(data.pot_pph21)) : ''} 
                                                        onChange={e => {
                                                            const val = e.target.value.replace(/[^0-9]/g, '');
                                                            setData('pot_pph21', val);
                                                        }} 
                                                        className="block w-full pl-10 rounded-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" 
                                                        placeholder="0"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </form>
                        </div>
                        
                        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setEditingItem(null)}
                                className="bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 px-4 py-2 rounded-md text-sm font-medium shadow-sm transition-colors"
                            >
                                Batal
                            </button>
                            <button
                                type="submit"
                                form="rp-form"
                                disabled={processing}
                                className="bg-indigo-600 text-white hover:bg-indigo-700 px-4 py-2 rounded-md text-sm font-medium shadow-sm transition-colors disabled:opacity-50"
                            >
                                {processing ? 'Menyimpan...' : 'Simpan'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
