import { Fragment, useState, useMemo } from 'react';
import { useForm, usePage, router } from '@inertiajs/react';
import CreatableSelect from 'react-select/creatable';
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
interface TabRincianPencairanProps {
    anggaran: any;
    tahapanData: any;
    variant: string;
    onPrint?: (target: string, params?: Record<string, any>) => void;
    onExportExcel?: (target: string, params?: Record<string, any>) => void;
    kwitansiMap?: Record<string, Array<{ id_transaksi: string; bulan: string }>>;
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

export default function TabRincianPencairan({ anggaran, tahapanData, variant, onPrint, onExportExcel, kwitansiMap }: TabRincianPencairanProps) {
    const { routePrefix } = usePage().props as any;
    const isSilpa = anggaran?.sumber_dana?.toLowerCase().includes('silpa');
    const isRkasAwal = variant === 'rkas' && !isSilpa;
    const [editingItem, setEditingItem] = useState<any | null>(null);
    const [selectedTahap, setSelectedTahap] = useState<number>(variant === 'rkas_perubahan' ? 2 : 1);
    const [selectedBulan, setSelectedBulan] = useState<string>('Semua');
    const [selectedItems, setSelectedItems] = useState<any[]>([]);
    const [showGabungModal, setShowGabungModal] = useState(false);
    const [newUraian, setNewUraian] = useState('');
    const [showEditGabungModal, setShowEditGabungModal] = useState(false);
    const [editGabungItem, setEditGabungItem] = useState<any>(null);
    const [newGabungName, setNewGabungName] = useState('');
    const [showUngabungModal, setShowUngabungModal] = useState(false);
    const [ungabungItem, setUngabungItem] = useState<any>(null);
    const [errorModalMsg, setErrorModalMsg] = useState<string | null>(null);
    const [isProcessingGabung, setIsProcessingGabung] = useState(false);
    const [isProcessingEditGabung, setIsProcessingEditGabung] = useState(false);
    const [isProcessingUngabung, setIsProcessingUngabung] = useState(false);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [detailItem, setDetailItem] = useState<any>(null);
    const [searchQuery, setSearchQuery] = useState('');
    
    // Kwitansi Modal State
    const [showKwitansiModal, setShowKwitansiModal] = useState(false);
    const [selectedRkasIds, setSelectedRkasIds] = useState<number[]>([]);
    const [availableKwitansi, setAvailableKwitansi] = useState<any[]>([]);
    const [selectedMurniRkasIds, setSelectedMurniRkasIds] = useState<number[]>([]);
    const [selectedKwitansi, setSelectedKwitansi] = useState<string[]>([]);
    const [isFetchingKwitansi, setIsFetchingKwitansi] = useState(false);
    const [kwitansiDetailData, setKwitansiDetailData] = useState<any | null>(null);
    const [searchKwitansi, setSearchKwitansi] = useState('');
    const [filterTahapKwitansi, setFilterTahapKwitansi] = useState('Semua');
    const [filterBulanKwitansi, setFilterBulanKwitansi] = useState('Semua');

    const pageProps = usePage().props as any;
    const pageErrors = pageProps.errors || {};

    const { data, setData, put, post, processing, errors, reset, transform } = useForm({
        uraian: '',
        kode_rekening_id: '',
        rkas_ids: [] as number[],
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

    // Filter items by selected phase and group by uraian_gabungan
    const visibleItems = useMemo(() => {
        const filtered = flatItems.filter((item: any) => {
            if (selectedBulan !== 'Semua') {
                if (!(item.bulanan && item.bulanan[selectedBulan] && item.bulanan[selectedBulan].total > 0)) {
                    return false;
                }
            } else {
                const jumlahAnggaran = selectedTahap === 1 ? (item.tahap1 || 0) : (item.tahap2 || 0);
                if (jumlahAnggaran <= 0) return false;
            }

            if (searchQuery.trim() !== '') {
                const q = searchQuery.toLowerCase();
                const uraian = (item.uraian || '').toLowerCase();
                const uraianGabungan = ((selectedTahap === 1 ? item.uraian_gabungan_t1 : item.uraian_gabungan_t2) || '').toLowerCase();
                const kodeRekening = (item.kode_rekening || '').toLowerCase();
                const kodeKegiatan = (item.kode_kegiatan || '').toLowerCase();
                
                let namaPenerima = (item.nama_penerima || '').toLowerCase();
                let nomorRekening = (item.nomor_rekening || '').toLowerCase();

                if (selectedBulan !== 'Semua') {
                    const m = item.bulanan?.[selectedBulan];
                    if (m) {
                        namaPenerima = (m.nama_penerima || item.nama_penerima || '').toLowerCase();
                        nomorRekening = (m.nomor_rekening || item.nomor_rekening || '').toLowerCase();
                    }
                } else {
                    const TAHAP_1_MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni'];
                    const TAHAP_2_MONTHS = ['Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
                    const tahapMonths = selectedTahap === 1 ? TAHAP_1_MONTHS : TAHAP_2_MONTHS;
                    for (const month of tahapMonths) {
                        const m = item.bulanan?.[month];
                        if (m && m.total > 0) {
                            namaPenerima = (m.nama_penerima || item.nama_penerima || '').toLowerCase();
                            nomorRekening = (m.nomor_rekening || item.nomor_rekening || '').toLowerCase();
                            break;
                        }
                    }
                }

                if (!uraian.includes(q) && 
                    !uraianGabungan.includes(q) && 
                    !kodeRekening.includes(q) && 
                    !kodeKegiatan.includes(q) &&
                    !namaPenerima.includes(q) &&
                    !nomorRekening.includes(q)) {
                    return false;
                }
            }
            return true;
        });

        const map = new Map<string, any>();
        filtered.forEach((item: any) => {
            const currentUraianGabungan = selectedTahap === 1 ? item.uraian_gabungan_t1 : item.uraian_gabungan_t2;
            
            const displayUraian = currentUraianGabungan || item.uraian;
            const key = item.kode_rekening_id + '-' + displayUraian;
            
            const TAHAP_1_MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni'];
            const TAHAP_2_MONTHS = ['Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
            
            let itemMonths = item.bulanan ? Object.keys(item.bulanan) : [];
            itemMonths = itemMonths.filter((m: string) => selectedTahap === 1 ? TAHAP_1_MONTHS.includes(m) : TAHAP_2_MONTHS.includes(m));

            let jumlahBulanIni = 0;
            if (selectedBulan !== 'Semua') {
                if (item.bulanan && item.bulanan[selectedBulan]) {
                    jumlahBulanIni = item.bulanan[selectedBulan].total || 0;
                }
                itemMonths = [selectedBulan];
            } else {
                jumlahBulanIni = selectedTahap === 1 ? (item.tahap1 || 0) : (item.tahap2 || 0);
            }

            if (map.has(key)) {
                const existing = map.get(key);
                existing.tahap1 += (item.tahap1 || 0);
                existing.tahap2 += (item.tahap2 || 0);
                existing.jumlah += (item.jumlah || 0);
                existing.jumlah_filtered += jumlahBulanIni;
                
                // Aggregate taxes
                existing.pot_ppn_t1 = (existing.pot_ppn_t1 || 0) + (item.pot_ppn_t1 || 0);
                existing.pot_ppn_t2 = (existing.pot_ppn_t2 || 0) + (item.pot_ppn_t2 || 0);
                existing.pot_pph23_t1 = (existing.pot_pph23_t1 || 0) + (item.pot_pph23_t1 || 0);
                existing.pot_pph23_t2 = (existing.pot_pph23_t2 || 0) + (item.pot_pph23_t2 || 0);
                existing.pot_pph21_t1 = (existing.pot_pph21_t1 || 0) + (item.pot_pph21_t1 || 0);
                existing.pot_pph21_t2 = (existing.pot_pph21_t2 || 0) + (item.pot_pph21_t2 || 0);
                existing.pot_pph21_narasumber_t1 = (existing.pot_pph21_narasumber_t1 || 0) + (item.pot_pph21_narasumber_t1 || 0);
                existing.pot_pph21_narasumber_t2 = (existing.pot_pph21_narasumber_t2 || 0) + (item.pot_pph21_narasumber_t2 || 0);

                if (item.bulanan && existing.bulanan) {
                    Object.keys(item.bulanan).forEach(m => {
                        if (!existing.bulanan[m]) {
                            existing.bulanan[m] = { ...item.bulanan[m] };
                        } else {
                            existing.bulanan[m].total += (item.bulanan[m].total || 0);
                            existing.bulanan[m].volume += (item.bulanan[m].volume || 0);
                            existing.bulanan[m].pot_ppn = (existing.bulanan[m].pot_ppn || 0) + (item.bulanan[m].pot_ppn || 0);
                            existing.bulanan[m].pot_pph23 = (existing.bulanan[m].pot_pph23 || 0) + (item.bulanan[m].pot_pph23 || 0);
                            existing.bulanan[m].pot_pph21 = (existing.bulanan[m].pot_pph21 || 0) + (item.bulanan[m].pot_pph21 || 0);
                            existing.bulanan[m].pot_pph21_narasumber = (existing.bulanan[m].pot_pph21_narasumber || 0) + (item.bulanan[m].pot_pph21_narasumber || 0);
                        }
                    });
                }
                
                if (!existing.original_items) {
                    existing.original_items = [];
                }
                
                // Merge rkas_ids
                if (item.rkas_ids) {
                    if (!existing.rkas_ids) existing.rkas_ids = [];
                    existing.rkas_ids.push(...item.rkas_ids);
                    existing.rkas_ids = Array.from(new Set(existing.rkas_ids));
                }
                
                // Merge rkas_ids_per_bulan
                if (item.rkas_ids_per_bulan) {
                    if (!existing.rkas_ids_per_bulan) existing.rkas_ids_per_bulan = {};
                    Object.entries(item.rkas_ids_per_bulan).forEach(([m, ids]) => {
                        if (!existing.rkas_ids_per_bulan[m]) existing.rkas_ids_per_bulan[m] = [];
                        existing.rkas_ids_per_bulan[m].push(...(ids as number[]));
                        existing.rkas_ids_per_bulan[m] = Array.from(new Set(existing.rkas_ids_per_bulan[m]));
                    });
                }
                
                // Merge murni_rkas_ids
                if (item.murni_rkas_ids) {
                    if (!existing.murni_rkas_ids) existing.murni_rkas_ids = [];
                    existing.murni_rkas_ids.push(...item.murni_rkas_ids);
                    existing.murni_rkas_ids = Array.from(new Set(existing.murni_rkas_ids));
                }

                existing.original_items.push({
                    id: item.id,
                    rkas_ids: item.rkas_ids,
                    uraian: item.uraian,
                    kode_rekening: item.kode_rekening,
                    kode_kegiatan: item.kode_kegiatan,
                    kode_rekening_id: item.kode_rekening_id,
                    kode_id: item.kode_id,
                    satuan: item.satuan,
                    harga_satuan: item.harga_satuan || item.tarif || 0,
                    jumlah: item.volume || 0,
                    total: item.jumlah || 0,
                });

                if (!existing.bulan_list) existing.bulan_list = [];
                itemMonths.forEach((m: string) => {
                    if (!existing.bulan_list.includes(m)) {
                        existing.bulan_list.push(m);
                    }
                });
            } else {
                const clonedItem = { 
                    ...item, 
                    uraian: displayUraian, 
                    uraian_gabungan: currentUraianGabungan,
                    original_items: [{
                        id: item.id,
                        rkas_ids: item.rkas_ids,
                        uraian: item.uraian,
                        kode_rekening: item.kode_rekening,
                        kode_kegiatan: item.kode_kegiatan,
                        kode_rekening_id: item.kode_rekening_id,
                        kode_id: item.kode_id,
                        satuan: item.satuan,
                        harga_satuan: item.harga_satuan || item.tarif || 0,
                        jumlah: item.volume || 0,
                        total: item.jumlah || 0,
                    }], 
                    bulan_list: [...itemMonths], 
                    jumlah_filtered: jumlahBulanIni 
                };
                if (item.bulanan) {
                    clonedItem.bulanan = JSON.parse(JSON.stringify(item.bulanan));
                }
                map.set(key, clonedItem);
            }
        });

        return Array.from(map.values());
    }, [flatItems, selectedTahap, selectedBulan, searchQuery]);

    // Calculate totals
    const totals = useMemo(() => {
        let totalAnggaran = 0;
        let totalPpn = 0;
        let totalPph23 = 0;
        let totalPph21 = 0;
        let totalDiterima = 0;

        visibleItems.forEach((item: any) => {
            const jumlahAnggaran = item.jumlah_filtered || 0;
            
            let ppn = 0;
            let pph23 = 0;
            let pph21 = 0;

            if (selectedBulan !== 'Semua') {
                const m = item.bulanan?.[selectedBulan];
                ppn = m?.pot_ppn || 0;
                pph23 = m?.pot_pph23 || 0;
                pph21 = (m?.pot_pph21 || 0) + (m?.pot_pph21_narasumber || 0);
            } else {
                ppn = selectedTahap === 1 ? (item.pot_ppn_t1 || 0) : (item.pot_ppn_t2 || 0);
                pph23 = selectedTahap === 1 ? (item.pot_pph23_t1 || 0) : (item.pot_pph23_t2 || 0);
                pph21 = selectedTahap === 1 ? ((item.pot_pph21_t1 || 0) + (item.pot_pph21_narasumber_t1 || 0)) : ((item.pot_pph21_t2 || 0) + (item.pot_pph21_narasumber_t2 || 0));
            }
            
            const diterima = jumlahAnggaran - ppn - pph23 - pph21;

            totalAnggaran += jumlahAnggaran;
            totalPpn += ppn;
            totalPph23 += pph23;
            totalPph21 += pph21;
            totalDiterima += diterima;
        });

        return { totalAnggaran, totalPpn, totalPph23, totalPph21, totalDiterima };
    }, [visibleItems]);

    // Extract unique recipients from all items
    const recipientsOptions = useMemo(() => {
        const list: any[] = [];
        const uniqueKeys = new Set();
        flatItems.forEach(item => {
            if (item.nama_penerima) {
                // Filter out 'Test Silpa' as requested
                if (item.nama_penerima.toLowerCase() === 'test silpa') {
                    return;
                }
                
                const acc = item.nomor_rekening || '';
                const key = item.nama_penerima + '|' + acc;
                
                if (!uniqueKeys.has(key)) {
                    uniqueKeys.add(key);
                    list.push({
                        value: key,
                        label: acc ? `${item.nama_penerima} - ${acc}` : item.nama_penerima,
                        data: {
                            nama_penerima: item.nama_penerima,
                            jabatan: item.jabatan || '',
                            nomor_rekening: acc,
                            bank: item.bank || '',
                            ada_npwp: item.ada_npwp == 1,
                            status_penerima: item.status_penerima || '',
                            golongan: item.golongan || '',
                        }
                    });
                }
            }
        });
        return list;
    }, [flatItems]);

    const fetchAvailableKwitansi = async (rkasIds: number[], murniRkasIds: number[], currentKwitansi: string[]) => {
        setIsFetchingKwitansi(true);
        setSelectedRkasIds(rkasIds);
        setSelectedMurniRkasIds(murniRkasIds);
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
        if ((!selectedRkasIds || selectedRkasIds.length === 0) && (!selectedMurniRkasIds || selectedMurniRkasIds.length === 0)) return;
        
        const baseRoute = variant === 'rkas_perubahan'
            ? 'rkas-perubahan.update-kwitansi'
            : 'rkas.update-kwitansi';
        const routeName = (routePrefix || '') + baseRoute;
        const url = route(routeName, anggaran.id);
            
        router.put(url, {
            rkas_ids: selectedRkasIds,
            murni_rkas_ids: selectedMurniRkasIds,
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
        if (selectedBulan !== 'Semua') {
            setSelectedKwitansi(prev => 
                prev.includes(idTransaksi) ? [] : [idTransaksi]
            );
        } else {
            setSelectedKwitansi(prev => 
                prev.includes(idTransaksi) 
                    ? prev.filter(id => id !== idTransaksi)
                    : [...prev, idTransaksi]
            );
        }
    };

    const handleEditClick = (item: any) => {
        setEditingItem(item);
        
        let ppn = '';
        let pph23 = '';
        let pph21 = '';
        let namaPenerima = item.nama_penerima || '';
        let jabatan = item.jabatan || '';
        let nomorRekening = item.nomor_rekening || '';
        let bank = item.bank || '';
        let adaNpwp = item.ada_npwp == 1;
        let statusPenerima = item.status_penerima || '';
        let golongan = item.golongan || '';

        if (selectedBulan !== 'Semua') {
            const m = item.bulanan?.[selectedBulan];
            ppn = m?.pot_ppn ? String(m.pot_ppn) : '';
            pph23 = m?.pot_pph23 ? String(m.pot_pph23) : '';
            pph21 = m?.pot_pph21 || m?.pot_pph21_narasumber ? String(Number(m.pot_pph21 || 0) + Number(m.pot_pph21_narasumber || 0)) : '';
            if (m) {
                namaPenerima = m.nama_penerima || namaPenerima;
                jabatan = m.jabatan || jabatan;
                nomorRekening = m.nomor_rekening || nomorRekening;
                bank = m.bank || bank;
                adaNpwp = m.ada_npwp == 1;
                statusPenerima = m.status_penerima || statusPenerima;
                golongan = m.golongan || golongan;
            }
        } else {
            const TAHAP_1_MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni'];
            const TAHAP_2_MONTHS = ['Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
            const tahapMonths = selectedTahap === 1 ? TAHAP_1_MONTHS : TAHAP_2_MONTHS;
            for (const month of tahapMonths) {
                const m = item.bulanan?.[month];
                if (m && m.total > 0) {
                    namaPenerima = m.nama_penerima || namaPenerima;
                    jabatan = m.jabatan || jabatan;
                    nomorRekening = m.nomor_rekening || nomorRekening;
                    bank = m.bank || bank;
                    adaNpwp = m.ada_npwp == 1;
                    statusPenerima = m.status_penerima || statusPenerima;
                    golongan = m.golongan || golongan;
                    break;
                }
            }
            ppn = selectedTahap === 1 ? (item.pot_ppn_t1 ? String(item.pot_ppn_t1) : '') : (item.pot_ppn_t2 ? String(item.pot_ppn_t2) : '');
            pph23 = selectedTahap === 1 ? (item.pot_pph23_t1 ? String(item.pot_pph23_t1) : '') : (item.pot_pph23_t2 ? String(item.pot_pph23_t2) : '');
            const p21_t1 = Number(item.pot_pph21_t1 || 0) + Number(item.pot_pph21_narasumber_t1 || 0);
            const p21_t2 = Number(item.pot_pph21_t2 || 0) + Number(item.pot_pph21_narasumber_t2 || 0);
            pph21 = selectedTahap === 1 ? (p21_t1 ? String(p21_t1) : '') : (p21_t2 ? String(p21_t2) : '');
        }

        const idsToUpdate: number[] = [];
        if (item.original_items && item.original_items.length > 0) {
            item.original_items.forEach((orig: any) => {
                if (orig.rkas_ids && orig.rkas_ids.length > 0) {
                    idsToUpdate.push(...orig.rkas_ids);
                } else if (orig.id) {
                    idsToUpdate.push(orig.id);
                }
            });
        } else if (item.rkas_ids && item.rkas_ids.length > 0) {
            idsToUpdate.push(...item.rkas_ids);
        } else if (item.id) {
            idsToUpdate.push(item.id);
        }

        setData({
            uraian: item.uraian,
            kode_rekening_id: item.kode_rekening_id,
            rkas_ids: Array.from(new Set(idsToUpdate)),
            nama_penerima: namaPenerima,
            jabatan: jabatan,
            nomor_rekening: nomorRekening,
            bank: bank,
            ada_npwp: adaNpwp,
            pot_ppn: ppn,
            pot_pph23: pph23,
            pot_pph21: pph21,
            status_penerima: statusPenerima,
            golongan: golongan,
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
            
            // Perhitungan pajak berdasarkan jumlah anggaran yang sedang diedit (tahap/bulan)
            const jumlah = editingItem.jumlah_filtered || 0;
            
            // PPN: 11/111 x harga barang (hanya jika >= 2.000.000)
            if (editingItem.is_ppn && jumlah >= 2000000) {
                newPpn = Math.floor((jumlah * 11) / 111).toString();
            }
            
            // PPh 23: 2% (ada NPWP) atau 4% (tanpa NPWP)
            if (editingItem.is_pph23) {
                if (data.ada_npwp) {
                    newPph23 = Math.floor(jumlah * 0.02).toString();
                } else {
                    newPph23 = Math.floor(jumlah * 0.04).toString();
                }
            }

            // PPh 21: berdasarkan status dan golongan
            if (editingItem.is_pph21 && data.status_penerima) {
                const rate = getPph21Rate(data.status_penerima, data.golongan, data.ada_npwp, jumlah);
                newPph21 = Math.floor(jumlah * rate).toString();
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
        
        // Transform the form data before sending to backend to include tahap and bulan
        transform((data) => {
            return {
                ...data,
                tahap: selectedTahap,
                bulan: selectedBulan,
            };
        });
        
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
            onPrint('rp', { tahap: selectedTahap, bulan: selectedBulan });
        }
    };

    const handleExportExcel = () => {
        if (onExportExcel) {
            onExportExcel('rp', { tahap: selectedTahap, bulan: selectedBulan });
        }
    };

    const handleGabungSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsProcessingGabung(true);
        
        let baseRoute = 'rkas.gabung-rincian';
        if (variant === 'rkas_perubahan') {
            baseRoute = 'rkas-perubahan.gabung-rincian';
        }

        const routeName = (routePrefix || '') + baseRoute;
        
        const payload = {
            new_uraian: newUraian,
            rkas_ids: (() => {
                const resultIds: number[] = [];
                const TAHAP_1_MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni'];
                
                selectedItems.forEach(item => {
                    if (item.rkas_ids_per_bulan) {
                        Object.entries(item.rkas_ids_per_bulan).forEach(([bulan, ids]) => {
                            if (selectedBulan !== 'Semua') {
                                if (bulan === selectedBulan) {
                                    resultIds.push(...(ids as number[]));
                                }
                            } else {
                                const isTahap1 = TAHAP_1_MONTHS.includes(bulan);
                                if ((selectedTahap === 1 && isTahap1) || (selectedTahap === 2 && !isTahap1)) {
                                    resultIds.push(...(ids as number[]));
                                }
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

        router.post(route(routeName, anggaran.id), payload, {
            preserveScroll: true,
            onSuccess: () => {
                setShowGabungModal(false);
                setNewUraian('');
                setSelectedItems([]);
            },
            onError: (err) => {
                console.error("Validation Errors:", err);
            },
            onFinish: () => {
                setIsProcessingGabung(false);
            }
        });
    };

    const handleEditGabungSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsProcessingEditGabung(true);
        
        let baseRoute = 'rkas.edit-gabung-rincian';
        if (variant === 'rkas_perubahan') {
            baseRoute = 'rkas-perubahan.edit-gabung-rincian';
        }

        const routeName = (routePrefix || '') + baseRoute;
        
        const payload = {
            new_uraian_gabungan: newGabungName,
            rkas_ids: (() => {
                const resultIds: number[] = [];
                const TAHAP_1_MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni'];
                
                if (editGabungItem.rkas_ids_per_bulan) {
                    Object.entries(editGabungItem.rkas_ids_per_bulan).forEach(([bulan, ids]) => {
                        if (selectedBulan !== 'Semua') {
                            if (bulan === selectedBulan) {
                                resultIds.push(...(ids as number[]));
                            }
                        } else {
                            const isTahap1 = TAHAP_1_MONTHS.includes(bulan);
                            if ((selectedTahap === 1 && isTahap1) || (selectedTahap === 2 && !isTahap1)) {
                                resultIds.push(...(ids as number[]));
                            }
                        }
                    });
                } else if (editGabungItem.rkas_ids) {
                    resultIds.push(...editGabungItem.rkas_ids);
                }
                return Array.from(new Set(resultIds));
            })()
        };

        router.put(route(routeName, anggaran.id), payload, {
            preserveScroll: true,
            onSuccess: () => {
                setShowEditGabungModal(false);
                setNewGabungName('');
                setEditGabungItem(null);
            },
            onError: (err) => {
                console.error("Validation Errors:", err);
            },
            onFinish: () => {
                setIsProcessingEditGabung(false);
            }
        });
    };

    const handleUngabungSubmit = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!ungabungItem) return;
        setIsProcessingUngabung(true);
        
        let baseRoute = 'rkas.ungabung-rincian';
        if (variant === 'rkas_perubahan') {
            baseRoute = 'rkas-perubahan.ungabung-rincian';
        }

        const routeName = (routePrefix || '') + baseRoute;
        
        const payload = {
            rkas_ids: (() => {
                const resultIds: number[] = [];
                const TAHAP_1_MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni'];
                
                if (ungabungItem.rkas_ids_per_bulan) {
                    Object.entries(ungabungItem.rkas_ids_per_bulan).forEach(([bulan, ids]) => {
                        if (selectedBulan !== 'Semua') {
                            if (bulan === selectedBulan) {
                                resultIds.push(...(ids as number[]));
                            }
                        } else {
                            const isTahap1 = TAHAP_1_MONTHS.includes(bulan);
                            if ((selectedTahap === 1 && isTahap1) || (selectedTahap === 2 && !isTahap1)) {
                                resultIds.push(...(ids as number[]));
                            }
                        }
                    });
                } else if (ungabungItem.rkas_ids) {
                    resultIds.push(...ungabungItem.rkas_ids);
                }
                return Array.from(new Set(resultIds));
            })()
        };

        router.post(route(routeName, anggaran.id), payload, {
            preserveScroll: true,
            onSuccess: () => {
                setSelectedItems([]);
                setShowUngabungModal(false);
                setUngabungItem(null);
            },
            onError: (err) => {
                console.error("Validation Errors:", err);
            },
            onFinish: () => {
                setIsProcessingUngabung(false);
            }
        });
    };

    return (
        <div className="space-y-4">
            <Surface padding="md" className="animate-rise">
                {/* Header Info */}
                <div className="mb-6">
                    <table className="text-sm text-slate-900 dark:text-white">
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
                <div className="mb-6 flex flex-col justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-3 sm:flex-row sm:items-center dark:border-white/5 dark:bg-white/[0.03]">
                    <div className="flex items-center gap-3">
                        <label className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">Tahap:</label>
                        <select
                            value={selectedTahap}
                            onChange={(e) => {
                                setSelectedTahap(Number(e.target.value));
                                setSelectedBulan('Semua');
                                setSelectedItems([]);
                            }}
                            className="rounded-xl border border-slate-200/90 bg-white px-3.5 py-2.5 text-[12px] font-semibold text-slate-800 shadow-sm transition focus:border-lime-400 focus:outline-none focus:ring-4 focus:ring-lime-200/60 dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:border-lime-400/70 dark:focus:ring-lime-400/10"
                        >
                            <option value={1} disabled={variant === 'rkas_perubahan'}>
                                Tahap 1 {variant === 'rkas_perubahan' ? '(Hanya pada RKAS Awal)' : ''}
                            </option>
                            <option value={2} disabled={isRkasAwal}>
                                Tahap 2 {isRkasAwal ? '(Hanya pada Perubahan dan SiLPA)' : ''}
                            </option>
                        </select>
                        
                        <label className="ml-2 text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">Bulan:</label>
                        <select
                            value={selectedBulan}
                            onChange={(e) => {
                                setSelectedBulan(e.target.value);
                                setSelectedItems([]);
                            }}
                            className="rounded-xl border border-slate-200/90 bg-white px-3.5 py-2.5 text-[12px] font-semibold text-slate-800 shadow-sm transition focus:border-lime-400 focus:outline-none focus:ring-4 focus:ring-lime-200/60 dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:border-lime-400/70 dark:focus:ring-lime-400/10"
                        >
                            <option value="Semua">Semua</option>
                            {selectedTahap === 1 ? (
                                <>
                                    <option value="Januari">Januari</option>
                                    <option value="Februari">Februari</option>
                                    <option value="Maret">Maret</option>
                                    <option value="April">April</option>
                                    <option value="Mei">Mei</option>
                                    <option value="Juni">Juni</option>
                                </>
                            ) : (
                                <>
                                    <option value="Juli">Juli</option>
                                    <option value="Agustus">Agustus</option>
                                    <option value="September">September</option>
                                    <option value="Oktober">Oktober</option>
                                    <option value="November">November</option>
                                    <option value="Desember">Desember</option>
                                </>
                            )}
                        </select>
                    </div>
                    <div className="flex gap-2 items-center flex-wrap">
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
                                if (isRkasAwal && selectedTahap === 2) {
                                    setErrorModalMsg('Tahap 2 hanya bisa di gabung pada Rkas Perubahan dan SiLPA.');
                                    return;
                                }
                                if (variant === 'rkas_perubahan' && selectedTahap === 1) {
                                    setErrorModalMsg('Tahap 1 hanya bisa di gabung pada Rkas Awal.');
                                    return;
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
                        {onPrint && (
                            <button
                                onClick={handlePrint}
                                className="inline-flex items-center gap-2 rounded-2xl bg-lime-400 px-4 py-2.5 text-[11.5px] font-extrabold text-slate-950 shadow-lime transition-all duration-200 hover:-translate-y-0.5 hover:bg-lime-300"
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
                                className="inline-flex items-center gap-2 rounded-2xl bg-mint px-4 py-2.5 text-[11.5px] font-extrabold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-emerald-600"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                                </svg>
                                Excel
                            </button>
                        )}
                    </div>
                </div>
            </Surface>

            {/* Tabel Rincian Pencairan */}
            <div className="animate-rise" style={{ animationDelay: '80ms' }}>
                <DataTable
                    title="Daftar Rincian Pencairan"
                    subtitle="Rincian pencairan per kegiatan, penerima, dan potongan pajak."
                    icon={
                        <IconTile tone="violet" size="sm">
                            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        </IconTile>
                    }
                    actions={<StatusBadge tone="info" dot={false} className="text-sikas-num">{visibleItems.length}</StatusBadge>}
                    contentClassName="mx-4 mb-4"
                >
                    <table className="min-w-full text-sm">
                        <thead className="bg-slate-100 dark:bg-white/5 border-y border-slate-300 dark:border-white/10">
                            <tr>
                                <th className="px-3 py-2 text-center font-bold text-slate-900 dark:text-white border border-slate-300 dark:border-white/10 w-10" rowSpan={2}>
                                    <input type="checkbox"
                                        className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-lime-200/60 dark:border-white/10 dark:bg-white/5"
                                        checked={visibleItems.length > 0 && selectedItems.length === visibleItems.length}
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                if (visibleItems.length > 0) {
                                                    const firstKodeRek = visibleItems[0].kode_rekening_id;
                                                    const firstKodeId = visibleItems[0].kode_id;
                                                    const allSameRek = visibleItems.every((i: any) => i.kode_rekening_id === firstKodeRek && i.kode_id === firstKodeId);
                                                    if (!allSameRek) {
                                                        setErrorModalMsg('Hanya bisa memilih kegiatan dengan kode rekening dan sub kegiatan yang sama untuk digabung.');
                                                        return;
                                                    }
                                                    setSelectedItems([...visibleItems]);
                                                }
                                            } else {
                                                setSelectedItems([]);
                                            }
                                        }}
                                    />
                                </th>
                                <th className="px-3 py-2 text-center font-bold text-slate-900 dark:text-white border border-slate-300 dark:border-white/10 w-10" rowSpan={2}>No</th>
                                <th className="px-3 py-2 text-center font-bold text-slate-900 dark:text-white border border-slate-300 dark:border-white/10 whitespace-nowrap" rowSpan={2}>Kode Rekening</th>
                                <th className="px-3 py-2 text-center font-bold text-slate-900 dark:text-white border border-slate-300 dark:border-white/10 whitespace-nowrap" rowSpan={2}>Kode Kegiatan</th>
                                <th className="px-3 py-2 text-center font-bold text-slate-900 dark:text-white border border-slate-300 dark:border-white/10" rowSpan={2}>Nama Kegiatan</th>
                                <th className="px-3 py-2 text-center font-bold text-slate-900 dark:text-white border border-slate-300 dark:border-white/10" rowSpan={2}>Bulan</th>
                                <th className="px-3 py-2 text-center font-bold text-slate-900 dark:text-white border border-slate-300 dark:border-white/10 whitespace-nowrap" rowSpan={2}>No. Kwitansi</th>
                                <th className="px-3 py-2 text-center font-bold text-slate-900 dark:text-white border border-slate-300 dark:border-white/10" rowSpan={2}>Nama Penerima</th>
                                <th className="px-3 py-2 text-center font-bold text-slate-900 dark:text-white border border-slate-300 dark:border-white/10" rowSpan={2}>Jabatan</th>
                                <th className="px-3 py-2 text-center font-bold text-slate-900 dark:text-white border border-slate-300 dark:border-white/10 whitespace-nowrap" rowSpan={2}>Jumlah<br/>Anggaran<br/>(Rp)</th>
                                <th className="px-3 py-2 text-center font-bold text-slate-900 dark:text-white border border-slate-300 dark:border-white/10 whitespace-nowrap" rowSpan={2}>Pot. PPN</th>
                                <th className="px-3 py-2 text-center font-bold text-slate-900 dark:text-white border border-slate-300 dark:border-white/10 whitespace-nowrap" rowSpan={2}>Pot. PPH 23</th>
                                <th className="px-3 py-2 text-center font-bold text-slate-900 dark:text-white border border-slate-300 dark:border-white/10 whitespace-nowrap" rowSpan={2}>Pot. PPH 21</th>
                                <th className="px-3 py-2 text-center font-bold text-slate-900 dark:text-white border border-slate-300 dark:border-white/10 whitespace-nowrap" rowSpan={2}>Jumlah Yang<br/>Diterima<br/>(Rp)</th>
                                <th className="px-3 py-2 text-center font-bold text-slate-900 dark:text-white border border-slate-300 dark:border-white/10 whitespace-nowrap" rowSpan={2}>Nomor Rekening</th>
                                <th className="px-3 py-2 text-center font-bold text-slate-900 dark:text-white border border-slate-300 dark:border-white/10 w-16" rowSpan={2}>Bank</th>
                                <th className="px-3 py-2 text-center font-bold text-slate-900 dark:text-white border border-slate-300 dark:border-white/10 w-16" rowSpan={2}>Aksi</th>
                            </tr>
                        </thead>
                        <thead className="bg-slate-50 dark:bg-white/[0.04]">
                            <tr>
                                <th className="px-3 py-1 text-center text-xs text-slate-500 dark:text-slate-400 border border-slate-300 dark:border-white/10"></th>
                                <th className="px-3 py-1 text-center text-xs text-slate-500 dark:text-slate-400 border border-slate-300 dark:border-white/10">1</th>
                                <th className="px-3 py-1 text-center text-xs text-slate-500 dark:text-slate-400 border border-slate-300 dark:border-white/10">2</th>
                                <th className="px-3 py-1 text-center text-xs text-slate-500 dark:text-slate-400 border border-slate-300 dark:border-white/10">3</th>
                                <th className="px-3 py-1 text-center text-xs text-slate-500 dark:text-slate-400 border border-slate-300 dark:border-white/10">4</th>
                                <th className="px-3 py-1 text-center text-xs text-slate-500 dark:text-slate-400 border border-slate-300 dark:border-white/10">5</th>
                                <th className="px-3 py-1 text-center text-xs text-slate-500 dark:text-slate-400 border border-slate-300 dark:border-white/10">6</th>
                                <th className="px-3 py-1 text-center text-xs text-slate-500 dark:text-slate-400 border border-slate-300 dark:border-white/10">7</th>
                                <th className="px-3 py-1 text-center text-xs text-slate-500 dark:text-slate-400 border border-slate-300 dark:border-white/10">8</th>
                                <th className="px-3 py-1 text-center text-xs text-slate-500 dark:text-slate-400 border border-slate-300 dark:border-white/10">9</th>
                                <th className="px-3 py-1 text-center text-xs text-slate-500 dark:text-slate-400 border border-slate-300 dark:border-white/10">10</th>
                                <th className="px-3 py-1 text-center text-xs text-slate-500 dark:text-slate-400 border border-slate-300 dark:border-white/10">11</th>
                                <th className="px-3 py-1 text-center text-xs text-slate-500 dark:text-slate-400 border border-slate-300 dark:border-white/10">12</th>
                                <th className="px-3 py-1 text-center text-xs text-slate-500 dark:text-slate-400 border border-slate-300 dark:border-white/10">13</th>
                                <th className="px-3 py-1 text-center text-xs text-slate-500 dark:text-slate-400 border border-slate-300 dark:border-white/10">14</th>
                                <th className="px-3 py-1 text-center text-xs text-slate-500 dark:text-slate-400 border border-slate-300 dark:border-white/10">15</th>
                                <th className="px-3 py-1 text-center text-xs text-slate-500 dark:text-slate-400 border border-slate-300 dark:border-white/10"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-white/5 bg-white dark:bg-[#15131F]">
                            {visibleItems.map((item: any, index: number) => {
                                const jumlahAnggaran = item.jumlah_filtered || 0;
                                let ppn = 0;
                                let pph23 = 0;
                                let pph21 = 0;
                                let namaPenerima = item.nama_penerima;
                                let jabatan = item.jabatan;
                                let nomorRekening = item.nomor_rekening;
                                let bank = item.bank;

                                if (selectedBulan !== 'Semua') {
                                    const m = item.bulanan?.[selectedBulan];
                                    ppn = m?.pot_ppn || 0;
                                    pph23 = m?.pot_pph23 || 0;
                                    pph21 = (m?.pot_pph21 || 0) + (m?.pot_pph21_narasumber || 0);
                                    if (m) {
                                        namaPenerima = m.nama_penerima || namaPenerima;
                                        jabatan = m.jabatan || jabatan;
                                        nomorRekening = m.nomor_rekening || nomorRekening;
                                        bank = m.bank || bank;
                                    }
                                } else {
                                    const TAHAP_1_MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni'];
                                    const TAHAP_2_MONTHS = ['Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
                                    const tahapMonths = selectedTahap === 1 ? TAHAP_1_MONTHS : TAHAP_2_MONTHS;
                                    for (const month of tahapMonths) {
                                        const m = item.bulanan?.[month];
                                        if (m && m.total > 0) {
                                            namaPenerima = m.nama_penerima || namaPenerima;
                                            jabatan = m.jabatan || jabatan;
                                            nomorRekening = m.nomor_rekening || nomorRekening;
                                            bank = m.bank || bank;
                                            break;
                                        }
                                    }
                                    ppn = selectedTahap === 1 ? (item.pot_ppn_t1 || 0) : (item.pot_ppn_t2 || 0);
                                    pph23 = selectedTahap === 1 ? (item.pot_pph23_t1 || 0) : (item.pot_pph23_t2 || 0);
                                    pph21 = selectedTahap === 1 ? ((item.pot_pph21_t1 || 0) + (item.pot_pph21_narasumber_t1 || 0)) : ((item.pot_pph21_t2 || 0) + (item.pot_pph21_narasumber_t2 || 0));
                                }

                                const jumlahDiterima = jumlahAnggaran - ppn - pph23 - pph21;

                                return (
                                    <tr key={`item-${index}`} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                                        <td className="px-3 py-2 text-center border border-slate-200 dark:border-white/10">
                                            <input type="checkbox"
                                                className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-lime-200/60 dark:border-white/10 dark:bg-white/5"
                                                checked={selectedItems.some(i => i.kode_rekening_id === item.kode_rekening_id && i.uraian === item.uraian)}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        if (selectedItems.length > 0) {
                                                            if (selectedItems[0].kode_rekening_id !== item.kode_rekening_id || selectedItems[0].kode_id !== item.kode_id) {
                                                                setErrorModalMsg('Hanya bisa memilih kegiatan dengan kode rekening dan sub kegiatan yang sama untuk digabung.');
                                                                return;
                                                            }
                                                        }
                                                        setSelectedItems([...selectedItems, item]);
                                                    } else {
                                                        setSelectedItems(selectedItems.filter(i => !(i.kode_rekening_id === item.kode_rekening_id && i.kode_id === item.kode_id && i.uraian === item.uraian)));
                                                    }
                                                }}
                                            />
                                        </td>
                                        <td className="px-3 py-2 text-center border border-slate-200 dark:border-white/10">{index + 1}</td>
                                        <td className="px-3 py-2 text-center border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 text-xs">{item.kode_rekening || '-'}</td>
                                        <td className="px-3 py-2 text-center border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 text-xs">{item.kode_kegiatan || '-'}</td>
                                        <td className="px-3 py-2 border border-slate-200 dark:border-white/10">
                                            <div className="text-slate-900 dark:text-white">{item.uraian}</div>
                                        </td>
                                        <td className="px-3 py-2 border border-slate-200 dark:border-white/10">
                                            <div className="text-slate-900 dark:text-white text-xs text-center">{item.bulan_list?.join(', ') || '-'}</div>
                                        </td>
                                        <td className="px-3 py-2 border border-slate-200 dark:border-white/10">
                                            <div className="text-slate-900 dark:text-white text-xs text-center">
                                                {(() => {
                                                    if (!kwitansiMap) return '-';

                                                    const TAHAP_1_MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni'];
                                                    const TAHAP_2_MONTHS = ['Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

                                                    // Tentukan bulan-bulan yang relevan
                                                    let relevantMonths: string[];
                                                    if (selectedBulan !== 'Semua') {
                                                        relevantMonths = [selectedBulan];
                                                    } else {
                                                        relevantMonths = selectedTahap === 1 ? TAHAP_1_MONTHS : TAHAP_2_MONTHS;
                                                    }

                                                    // Dapatkan SEMUA id untuk item ini (lintas bulan)
                                                    const allItemIds = [
                                                        ...(item.rkas_ids || [item.id]),
                                                        ...(item.murni_rkas_ids || [])
                                                    ];

                                                    // Helper untuk mendapatkan urutan bulan
                                                    const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
                                                    const getMonthIndex = (m: string) => monthNames.indexOf(m);

                                                    // Periksa dan saring Kwitansi
                                                    const kwitansiNumbers = new Set<string>();
                                                    const activeTahapMonths = selectedTahap === 1 ? TAHAP_1_MONTHS : TAHAP_2_MONTHS;
                                                    const activeRkasIds: number[] = [];
                                                    const activeMurniRkasIds: number[] = [];

                                                    const checkAndAdd = (id: number, isMurni: boolean) => {
                                                        let budgetMonthStr = '';
                                                        const idsObj = isMurni ? item.murni_rkas_ids_per_bulan : item.rkas_ids_per_bulan;
                                                        if (idsObj) {
                                                            for (const [bulan, ids] of Object.entries(idsObj)) {
                                                                if ((ids as number[]).includes(id)) { budgetMonthStr = bulan; break; }
                                                            }
                                                        }
                                                        if (!budgetMonthStr && !isMurni && item.murni_rkas_ids_per_bulan) {
                                                            for (const [bulan, ids] of Object.entries(item.murni_rkas_ids_per_bulan)) {
                                                                if ((ids as number[]).includes(id)) { budgetMonthStr = bulan; break; }
                                                            }
                                                        }

                                                        let shouldProcess = false;
                                                        if (budgetMonthStr) {
                                                            if (selectedBulan === 'Semua') {
                                                                if (activeTahapMonths.includes(budgetMonthStr)) {
                                                                    shouldProcess = true;
                                                                    if (isMurni) activeMurniRkasIds.push(id);
                                                                    else activeRkasIds.push(id);
                                                                }
                                                            } else {
                                                                if (budgetMonthStr === selectedBulan) {
                                                                    shouldProcess = true;
                                                                    if (isMurni) activeMurniRkasIds.push(id);
                                                                    else activeRkasIds.push(id);
                                                                }
                                                            }
                                                        }

                                                        const key = isMurni ? `murni_${id}` : (variant === 'rkas_perubahan' ? `perubahan_${id}` : `rkas_${id}`);
                                                        const entries = kwitansiMap[key];
                                                        if (entries && shouldProcess) {
                                                            entries.forEach((entry: { id_transaksi: string; bulan: string }) => {
                                                                kwitansiNumbers.add(entry.id_transaksi);
                                                            });
                                                        }
                                                    };

                                                    (item.rkas_ids || [item.id]).forEach((id: number) => checkAndAdd(id, false));
                                                    (item.murni_rkas_ids || []).forEach((id: number) => checkAndAdd(id, true));

                                                    const uniqueKwitansi = Array.from(kwitansiNumbers);
                                                    const hasKwitansi = uniqueKwitansi.length > 0;

                                                    return (
                                                        <div className="flex flex-col items-center justify-center gap-1">
                                                            {hasKwitansi ? (
                                                                <div className="flex flex-col items-center gap-1">
                                                                    {selectedBulan === 'Semua' ? (
                                                                        <div className="text-center whitespace-normal">{uniqueKwitansi.join(', ')}</div>
                                                                    ) : (
                                                                        <div className="flex flex-col gap-0.5 text-center">
                                                                            {uniqueKwitansi.map((k, i) => <div key={i}>{k}</div>)}
                                                                        </div>
                                                                    )}
                                                                    <button
                                                                        onClick={() => fetchAvailableKwitansi(activeRkasIds, activeMurniRkasIds, uniqueKwitansi)}
                                                                        className="inline-flex items-center justify-center rounded-lg bg-brand-500 px-2 py-1 text-[10px] font-extrabold text-white shadow-sm transition hover:bg-brand-600"
                                                                    >
                                                                        Edit
                                                                    </button>
                                                                </div>
                                                            ) : (
                                                                <button
                                                                    onClick={() => fetchAvailableKwitansi(activeRkasIds, activeMurniRkasIds, [])}
                                                                    className="inline-flex items-center justify-center whitespace-nowrap rounded-lg bg-mint px-2 py-1 text-[10px] font-extrabold text-white shadow-sm transition hover:bg-emerald-600"
                                                                >
                                                                    + Tambah
                                                                </button>
                                                            )}
                                                        </div>
                                                    );
                                                })()}
                                            </div>
                                        </td>
                                        <td className="px-3 py-2 border border-slate-200 dark:border-white/10">
                                            {namaPenerima ? (
                                                <span className="text-slate-900 dark:text-white">{namaPenerima}</span>
                                            ) : (
                                                <span className="text-red-500 italic text-xs">Belum diisi</span>
                                            )}
                                        </td>
                                        <td className="px-3 py-2 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white">{jabatan || '-'}</td>
                                        <td className="px-3 py-2 text-right border border-slate-200 dark:border-white/10 font-medium text-slate-900 dark:text-white whitespace-nowrap text-sikas-num">
                                            {jumlahAnggaran > 0 ? formatCurrency(jumlahAnggaran) : '-'}
                                        </td>
                                        <td className="px-3 py-2 text-right border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white whitespace-nowrap text-sikas-num">
                                            {ppn > 0 ? formatCurrency(ppn) : '-'}
                                        </td>
                                        <td className="px-3 py-2 text-right border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white whitespace-nowrap text-sikas-num">
                                            {pph23 > 0 ? formatCurrency(pph23) : '-'}
                                        </td>
                                        <td className="px-3 py-2 text-right border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white whitespace-nowrap text-sikas-num">
                                            {pph21 > 0 ? formatCurrency(pph21) : '-'}
                                        </td>
                                        <td className="px-3 py-2 text-right border border-slate-200 dark:border-white/10 font-medium text-slate-900 dark:text-white whitespace-nowrap text-sikas-num">
                                            {jumlahDiterima > 0 ? formatCurrency(jumlahDiterima) : '-'}
                                        </td>
                                        <td className="px-3 py-2 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white whitespace-nowrap font-mono text-xs">
                                            {nomorRekening || '-'}
                                        </td>
                                        <td className="px-3 py-2 text-center border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white">
                                            {bank || '-'}
                                        </td>
                                        <td className="px-3 py-2 text-center border border-slate-200 dark:border-white/10">
                                            <div className="flex flex-col gap-1 items-center justify-center">
                                                <button
                                                    onClick={() => handleEditClick(item)}
                                                    className="inline-flex w-full items-center justify-center rounded-lg bg-brand-500 px-2.5 py-1 text-[10px] font-extrabold text-white shadow-sm transition hover:bg-brand-600"
                                                >
                                                    Edit
                                                </button>
                                                {item.original_items && item.original_items.length > 1 && (
                                                    <>
                                                        <button
                                                            onClick={() => {
                                                                setDetailItem(item);
                                                                setShowDetailModal(true);
                                                            }}
                                                            className="inline-flex w-full items-center justify-center rounded-lg bg-sky-500 px-2.5 py-1 text-[10px] font-extrabold text-white shadow-sm transition hover:bg-sky-600"
                                                        >
                                                            Detail
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                if (variant !== 'rkas_perubahan' && selectedTahap === 2) {
                                                                    setErrorModalMsg('Tahap 2 hanya bisa di gabung pada Rkas Perubahan.');
                                                                    return;
                                                                }
                                                                if (variant === 'rkas_perubahan' && selectedTahap === 1) {
                                                                    setErrorModalMsg('Tahap 1 hanya bisa di gabung pada Rkas Awal.');
                                                                    return;
                                                                }
                                                                setEditGabungItem(item);
                                                                setNewGabungName(item.uraian);
                                                                setShowEditGabungModal(true);
                                                            }}
                                                            className="inline-flex w-full items-center justify-center rounded-lg bg-amber-500 px-2.5 py-1 text-[10px] font-extrabold text-white shadow-sm transition hover:bg-amber-600"
                                                        >
                                                            Ganti Nama
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                if (variant !== 'rkas_perubahan' && selectedTahap === 2) {
                                                                    setErrorModalMsg('Tahap 2 hanya bisa di gabung pada Rkas Perubahan.');
                                                                    return;
                                                                }
                                                                if (variant === 'rkas_perubahan' && selectedTahap === 1) {
                                                                    setErrorModalMsg('Tahap 1 hanya bisa di gabung pada Rkas Awal.');
                                                                    return;
                                                                }
                                                                setUngabungItem(item);
                                                                setShowUngabungModal(true);
                                                            }}
                                                            disabled={isProcessingUngabung}
                                                            className="inline-flex w-full items-center justify-center rounded-lg bg-rose-500 px-2.5 py-1 text-[10px] font-extrabold text-white shadow-sm transition hover:bg-rose-600 disabled:opacity-50"
                                                        >
                                                            Batal
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}

                            {/* Baris Jumlah */}
                            <tr className="bg-slate-100 dark:bg-white/5 font-bold">
                                <td colSpan={9} className="px-3 py-2 text-center border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white">Jumlah</td>
                                <td className="px-3 py-2 text-right border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white whitespace-nowrap text-sikas-num">
                                    {formatCurrency(totals.totalAnggaran)}
                                </td>
                                <td className="px-3 py-2 text-right border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white whitespace-nowrap text-sikas-num">
                                    {totals.totalPpn > 0 ? formatCurrency(totals.totalPpn) : '-'}
                                </td>
                                <td className="px-3 py-2 text-right border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white whitespace-nowrap text-sikas-num">
                                    {totals.totalPph23 > 0 ? formatCurrency(totals.totalPph23) : '-'}
                                </td>
                                <td className="px-3 py-2 text-right border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white whitespace-nowrap text-sikas-num">
                                    {totals.totalPph21 > 0 ? formatCurrency(totals.totalPph21) : '-'}
                                </td>
                                <td className="px-3 py-2 text-right border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white whitespace-nowrap text-sikas-num">
                                    {formatCurrency(totals.totalDiterima)}
                                </td>
                                <td colSpan={3} className="px-3 py-2 border border-slate-300 dark:border-white/10"></td>
                            </tr>

                            {visibleItems.length === 0 && (
                                <tr>
                                    <td colSpan={14} className="p-0">
                                        <EmptyState
                                            className="border-0 bg-transparent py-9 dark:bg-transparent"
                                            title="Tidak ada data rincian pencairan."
                                            description="Coba ubah filter atau kata kunci pencarian."
                                            icon={
                                                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                </svg>
                                            }
                                        />
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </DataTable>
            </div>

            {/* Modal Edit Rincian Pencairan */}
            {editingItem && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white dark:bg-[#15131F] rounded-[26px] shadow-float w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-6 py-4 dark:border-white/5">
                            <h3 className="truncate text-[15px] font-extrabold tracking-tight text-slate-900 dark:text-white">Edit Rincian Pencairan</h3>
                            <button onClick={() => setEditingItem(null)} className="inline-flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-500 dark:hover:bg-white/5 dark:hover:text-white">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        
                        <div className="p-6 overflow-y-auto">
                            <form id="rp-form" onSubmit={handleSubmit} className="space-y-4">
                                {Object.keys(errors).length > 0 && (
                                    <div className="rounded-2xl border border-rose-500/15 border-l-4 border-l-rose-500 bg-pastel-rose/50 p-4 dark:border-rose-400/20 dark:bg-rose-500/[0.08]">
                                        <div className="flex">
                                            <div className="flex-shrink-0">
                                                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                                </svg>
                                            </div>
                                            <div className="ml-3">
                                                <h3 className="text-[11.5px] font-extrabold text-rose-700 dark:text-rose-300">Terdapat kesalahan saat menyimpan:</h3>
                                                <ul className="mt-1 text-sm text-red-700 list-disc list-inside">
                                                    {Object.entries(errors).map(([field, err], idx) => (
                                                        <li key={idx}><span className="font-semibold capitalize">{field.replace('_', ' ')}</span>: {err}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                <div className="rounded-2xl border border-brand-500/10 bg-pastel-lavender p-4 mb-4 dark:border-brand-400/20 dark:bg-brand-500/[0.08]">
                                    <p className="text-sm font-medium text-brand-700 dark:text-brand-200">{editingItem.kode_rekening} - {editingItem.uraian}</p>
                                    <p className="text-xs text-brand-600 dark:text-brand-300 mt-1">Jumlah: Rp {formatCurrency(editingItem.jumlah_filtered || editingItem.jumlah || 0)}</p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="mb-1.5 block text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">Nama Penerima</label>
                                        <CreatableSelect
                                            isClearable
                                            options={recipientsOptions}
                                            value={data.nama_penerima ? (
                                                recipientsOptions.find(opt => opt.data.nama_penerima === data.nama_penerima && opt.data.nomor_rekening === (data.nomor_rekening || '')) 
                                                || { label: data.nama_penerima, value: data.nama_penerima }
                                            ) : null}
                                            onChange={(selected: any) => {
                                                if (selected) {
                                                    const isNew = selected.__isNew__;
                                                    setData(prev => ({
                                                        ...prev,
                                                        nama_penerima: isNew ? selected.value : (selected.data?.nama_penerima || selected.label.split(' - ')[0]),
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
                                            classNames={{
                                                control: () => 'dark:!bg-white/5 dark:!border-white/10 dark:!text-white',
                                                singleValue: () => 'dark:!text-white',
                                                input: () => 'dark:!text-white',
                                                menu: () => 'dark:!bg-[#15131F] dark:!border-white/10',
                                                option: (state) => state.isFocused ? 'dark:!bg-brand-900 dark:!text-white' : 'dark:!bg-[#15131F] dark:!text-slate-200',
                                                placeholder: () => 'dark:!text-slate-400'
                                            }}
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
                                        <label className="mb-1.5 block text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">Jabatan</label>
                                        <input type="text" value={data.jabatan} onChange={e => setData('jabatan', e.target.value)} className="mt-1 block w-full rounded-xl border border-slate-200/90 bg-white px-3.5 py-2.5 text-[12px] font-semibold text-slate-800 shadow-sm transition focus:border-lime-400 focus:outline-none focus:ring-4 focus:ring-lime-200/60 dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:border-lime-400/70 dark:focus:ring-lime-400/10" />
                                    </div>
                                    <div>
                                        <label className="mb-1.5 block text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">Nomor Rekening</label>
                                        <input type="text" value={data.nomor_rekening} onChange={e => setData('nomor_rekening', e.target.value)} className="mt-1 block w-full rounded-xl border border-slate-200/90 bg-white px-3.5 py-2.5 text-[12px] font-semibold text-slate-800 shadow-sm transition focus:border-lime-400 focus:outline-none focus:ring-4 focus:ring-lime-200/60 dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:border-lime-400/70 dark:focus:ring-lime-400/10" />
                                    </div>
                                    <div>
                                        <label className="mb-1.5 block text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">Bank</label>
                                        <input type="text" value={data.bank} onChange={e => setData('bank', e.target.value)} className="mt-1 block w-full rounded-xl border border-slate-200/90 bg-white px-3.5 py-2.5 text-[12px] font-semibold text-slate-800 shadow-sm transition focus:border-lime-400 focus:outline-none focus:ring-4 focus:ring-lime-200/60 dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:border-lime-400/70 dark:focus:ring-lime-400/10" />
                                    </div>
                                    <div>
                                        <label className="mb-1.5 block text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">Status Penerima</label>
                                        <select value={data.status_penerima} onChange={e => setData('status_penerima', e.target.value)} className="mt-1 block w-full rounded-xl border border-slate-200/90 bg-white px-3.5 py-2.5 text-[12px] font-semibold text-slate-800 shadow-sm transition focus:border-lime-400 focus:outline-none focus:ring-4 focus:ring-lime-200/60 dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:border-lime-400/70 dark:focus:ring-lime-400/10">
                                            <option value="">-- Pilih --</option>
                                            <option value="pns">PNS</option>
                                            <option value="non_asn">Non-ASN</option>
                                        </select>
                                    </div>
                                    {data.status_penerima === 'pns' && (
                                        <div>
                                            <label className="mb-1.5 block text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">Golongan</label>
                                            <select value={data.golongan} onChange={e => setData('golongan', e.target.value)} className="mt-1 block w-full rounded-xl border border-slate-200/90 bg-white px-3.5 py-2.5 text-[12px] font-semibold text-slate-800 shadow-sm transition focus:border-lime-400 focus:outline-none focus:ring-4 focus:ring-lime-200/60 dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:border-lime-400/70 dark:focus:ring-lime-400/10">
                                                <option value="">-- Pilih --</option>
                                                <option value="I">Golongan I (0%)</option>
                                                <option value="II">Golongan II (0%)</option>
                                                <option value="III">Golongan III (5%)</option>
                                                <option value="IV">Golongan IV (15%)</option>
                                            </select>
                                        </div>
                                    )}
                                    <div className="md:col-span-2 flex items-center mt-2">
                                        <input type="checkbox" id="ada_npwp" checked={data.ada_npwp} onChange={e => setData('ada_npwp', e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-lime-200/60 dark:border-white/10 dark:bg-white/5" />
                                        <label htmlFor="ada_npwp" className="ml-2 block text-sm text-slate-900 dark:text-slate-300">Ada NPWP / NIK?</label>
                                    </div>
                                    
                                    <div className="md:col-span-2 mt-4 pt-4 border-t border-slate-200 dark:border-white/10">
                                        <div className="flex justify-between items-center mb-4">
                                            <h4 className="text-sm font-bold text-slate-900 dark:text-white">Potongan Pajak</h4>
                                            <button 
                                                type="button" 
                                                onClick={handleAutoCalculate} 
                                                disabled={isCalculating}
                                                className="inline-flex items-center gap-1 rounded-xl border border-brand-500/15 bg-pastel-lavender px-3 py-1.5 text-[10.5px] font-extrabold text-brand-600 shadow-sm transition hover:bg-brand-200/70 disabled:cursor-wait disabled:opacity-75 dark:border-brand-400/20 dark:bg-brand-500/10 dark:text-brand-300"
                                            >
                                                {isCalculating ? (
                                                    <>
                                                        <svg className="animate-spin h-3 w-3 text-brand-600 dark:text-brand-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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
                                                <label className="mb-1.5 block text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">Pot. PPN (11/111)</label>
                                                <div className="mt-1 relative rounded-md shadow-sm">
                                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                        <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500">Rp</span>
                                                    </div>
                                                    <input 
                                                        type="text" 
                                                        value={data.pot_ppn ? formatCurrency(Number(data.pot_ppn)) : ''} 
                                                        onChange={e => {
                                                            const val = e.target.value.replace(/[^0-9]/g, '');
                                                            setData('pot_ppn', val);
                                                        }} 
                                                        className="block w-full rounded-xl border border-slate-200/90 bg-white py-2.5 pl-10 pr-3.5 text-[12px] font-semibold text-slate-800 shadow-sm text-sikas-num transition focus:border-lime-400 focus:outline-none focus:ring-4 focus:ring-lime-200/60 dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:border-lime-400/70 dark:focus:ring-lime-400/10" 
                                                        placeholder="0"
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="mb-1.5 block text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">Pot. PPh 23</label>
                                                <div className="mt-1 relative rounded-md shadow-sm">
                                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                        <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500">Rp</span>
                                                    </div>
                                                    <input 
                                                        type="text" 
                                                        value={data.pot_pph23 ? formatCurrency(Number(data.pot_pph23)) : ''} 
                                                        onChange={e => {
                                                            const val = e.target.value.replace(/[^0-9]/g, '');
                                                            setData('pot_pph23', val);
                                                        }} 
                                                        className="block w-full rounded-xl border border-slate-200/90 bg-white py-2.5 pl-10 pr-3.5 text-[12px] font-semibold text-slate-800 shadow-sm text-sikas-num transition focus:border-lime-400 focus:outline-none focus:ring-4 focus:ring-lime-200/60 dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:border-lime-400/70 dark:focus:ring-lime-400/10" 
                                                        placeholder="0"
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="mb-1.5 block text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">Pot. PPh 21</label>
                                                <div className="mt-1 relative rounded-md shadow-sm">
                                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                        <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500">Rp</span>
                                                    </div>
                                                    <input 
                                                        type="text" 
                                                        value={data.pot_pph21 ? formatCurrency(Number(data.pot_pph21)) : ''} 
                                                        onChange={e => {
                                                            const val = e.target.value.replace(/[^0-9]/g, '');
                                                            setData('pot_pph21', val);
                                                        }} 
                                                        className="block w-full rounded-xl border border-slate-200/90 bg-white py-2.5 pl-10 pr-3.5 text-[12px] font-semibold text-slate-800 shadow-sm text-sikas-num transition focus:border-lime-400 focus:outline-none focus:ring-4 focus:ring-lime-200/60 dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:border-lime-400/70 dark:focus:ring-lime-400/10" 
                                                        placeholder="0"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </form>
                        </div>
                        
                        <div className="flex items-center justify-end gap-2 border-t border-slate-100 bg-white px-6 py-4 dark:border-white/5 dark:bg-[#15131F]">
                            <button
                                type="button"
                                onClick={() => setEditingItem(null)}
                                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-[11.5px] font-bold text-slate-700 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
                            >
                                Batal
                            </button>
                            <button
                                type="submit"
                                form="rp-form"
                                disabled={processing}
                                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-lime-400 px-4 py-2.5 text-[11.5px] font-extrabold text-slate-950 shadow-lime transition-all duration-200 hover:-translate-y-0.5 hover:bg-lime-300 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
                            >
                                {processing ? 'Menyimpan...' : 'Simpan'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

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
                            <form id="gabung-form" onSubmit={handleGabungSubmit} className="space-y-4">
                                {Object.keys(pageErrors).length > 0 && (
                                    <div className="rounded-2xl border border-rose-500/15 border-l-4 border-l-rose-500 bg-pastel-rose/50 p-4 dark:border-rose-400/20 dark:bg-rose-500/[0.08]">
                                        <div className="flex">
                                            <div className="flex-shrink-0">
                                                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                                </svg>
                                            </div>
                                            <div className="ml-3">
                                                <h3 className="text-[11.5px] font-extrabold text-rose-700 dark:text-rose-300">{pageErrors.message || 'Terdapat kesalahan'}</h3>
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
                                            Total Anggaran: Rp {formatCurrency(selectedItems.reduce((sum, item) => sum + (item.jumlah_filtered || 0), 0))}
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
                                form="gabung-form"
                                disabled={isProcessingGabung || !newUraian}
                                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-amber-500 px-4 py-2.5 text-[11.5px] font-extrabold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
                            >
                                {isProcessingGabung ? 'Menyimpan...' : 'Simpan'}
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
                                <div className="flex-shrink-0 bg-red-100 dark:bg-red-900/50 p-3 rounded-full">
                                    <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                            <form id="edit-gabung-form" onSubmit={handleEditGabungSubmit} className="space-y-4">
                                {Object.keys(pageErrors).length > 0 && (
                                    <div className="rounded-2xl border border-rose-500/15 border-l-4 border-l-rose-500 bg-pastel-rose/50 p-4 dark:border-rose-400/20 dark:bg-rose-500/[0.08]">
                                        <div className="flex">
                                            <div className="flex-shrink-0">
                                                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                                </svg>
                                            </div>
                                            <div className="ml-3">
                                                <h3 className="text-[11.5px] font-extrabold text-rose-700 dark:text-rose-300">{pageErrors.message || 'Terdapat kesalahan'}</h3>
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
                                form="edit-gabung-form"
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
                                <div className="flex-shrink-0 bg-red-100 dark:bg-red-900/50 p-3 rounded-full mt-1">
                                    <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                                    Total: Rp {formatCurrency(detailItem.jumlah_filtered || 0)}
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
                                                    <div>{orig.uraian}</div>
                                                    {(orig.kode_kegiatan || orig.kode_rekening) && (
                                                        <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                                                            {orig.kode_kegiatan} {orig.kode_kegiatan && orig.kode_rekening ? ' / ' : ''} {orig.kode_rekening}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-3 py-2 text-right border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-sikas-num">
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
                                                        <td className="px-3 py-2 text-right border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-sikas-num">{detail.volume}</td>
                                                        <td className="px-3 py-2 text-left border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white">{detail.satuan}</td>
                                                        <td className="px-3 py-2 text-right border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white whitespace-nowrap text-sikas-num">Rp {new Intl.NumberFormat('id-ID').format(detail.harga_satuan || 0)}</td>
                                                        <td className="px-3 py-2 text-right border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white whitespace-nowrap text-sikas-num">Rp {new Intl.NumberFormat('id-ID').format(detail.jumlah || 0)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <div className="mt-1 p-3 bg-slate-50 dark:bg-[#15131F] rounded-md border border-slate-200 dark:border-white/10">
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
                                                <td className="px-4 py-3">
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
                                                    <td className="px-4 py-3">
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
    );
}
