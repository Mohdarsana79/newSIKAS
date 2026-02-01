import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, useForm, router } from '@inertiajs/react';
import { useState, useEffect, useMemo } from 'react';
import Modal from '@/Components/Modal';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import InputError from '@/Components/InputError';
import DangerButton from '@/Components/DangerButton';
import DatePicker from '@/Components/DatePicker';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import Dropdown from '@/Components/Dropdown';
import SearchableSelect from '@/Components/SearchableSelect';
import axios from 'axios';

interface BkuProps {
    bulan: string;
    tahun: string;
    penganggaran: any;
    penerimaanDanas: any[];
    penarikanTunais: any[];
    setorTunais: any[];
    totalDanaTersedia: number;
    saldoTunai: number;
    saldoNonTunai: number;
    anggaranBulanIni: number;
    totalDibelanjakanBulanIni: number;
    totalDibelanjakanSampaiBulanIni: number;
    anggaranBelumDibelanjakan: number;
    bkuData: any[];
    is_closed: boolean;
    bunga_bank: number;
    pajak_bunga_bank: number;
    has_transactions: boolean;
    rkasItems: any[];
    lastNoteNumber?: string;
    closing_date?: string;
    auth: any;
}

export default function Bku({
    bulan,
    tahun,
    penganggaran,
    penerimaanDanas,
    penarikanTunais,
    setorTunais,
    totalDanaTersedia,
    saldoTunai,
    saldoNonTunai,
    anggaranBulanIni,
    totalDibelanjakanBulanIni,
    totalDibelanjakanSampaiBulanIni,
    anggaranBelumDibelanjakan,
    bkuData,
    is_closed,
    bunga_bank,
    pajak_bunga_bank,
    has_transactions,
    rkasItems, // Receive rkasItems prop
    lastNoteNumber,
    closing_date,
    auth
}: BkuProps) {
    const [isModalOpen, setIsModalOpen] = useState(false);

    const [isTarikTunaiOpen, setIsTarikTunaiOpen] = useState(false);
    const [isSetorTunaiOpen, setIsSetorTunaiOpen] = useState(false);
    const [isTutupBkuOpen, setIsTutupBkuOpen] = useState(false);
    const [isLaporPajakOpen, setIsLaporPajakOpen] = useState(false);
    const [selectedBkuIdForPajak, setSelectedBkuIdForPajak] = useState<number | null>(null);
    const [isReportingTax, setIsReportingTax] = useState(false);
    const [alamatTokoError, setAlamatTokoError] = useState('');
    const [tanggalTransaksiError, setTanggalTransaksiError] = useState('');

    // Search State
    const [isSearchVisible, setIsSearchVisible] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Form handling for BKU (Spending) - Defined early for dependency usage
    const { data, setData, post, processing, errors, reset, transform } = useForm({
        // Common
        penganggaran_id: penganggaran.id,
        bulan: bulan,

        // Step 1
        is_siplah: false,
        tanggal_transaksi: '',
        jenis_transaksi: 'Tunai',
        no_entity: false,
        nama_toko: '',
        nama_penerima_pembayaran: '',
        alamat_toko: '',
        nomor_telepon: '',
        npwp: '',
        no_npwp: false,

        // Step 2
        nomor_nota: '', // Initialize empty to allow auto-generation
        tanggal_nota: '',
        items: [] as any[],

        // Step 3
        bebas_pajak: false,
        has_tax: false,
        pajak: 'PPN',
        persen_pajak: '',
        total_pajak: 0,
        has_local_tax: false,
        pajak_daerah: 'PB1',
        persen_pajak_daerah: '',
        total_pajak_daerah: 0,

        // Tutup BKU
        bunga_bank: '',
        pajak_bunga: '',

        // Lapor Pajak
        tanggal_lapor: '',
        kode_masa_pajak: '',
        ntpn: '',
    });

    const [isReopenModalOpen, setIsReopenModalOpen] = useState(false);
    const [isReopening, setIsReopening] = useState(false);
    const [currentStep, setCurrentStep] = useState(1);

    // Step 2 Local State
    const [selectedActivityId, setSelectedActivityId] = useState<string>('');
    const [selectedAccountId, setSelectedAccountId] = useState<string>('');
    const [detailUraian, setDetailUraian] = useState<string>(''); // For "Uraian Belanja (Opsional)"

    // API State
    const [fetchedActivities, setFetchedActivities] = useState<any[]>([]);
    const [fetchedAccounts, setFetchedAccounts] = useState<any[]>([]);
    const [fetchedRkasItems, setFetchedRkasItems] = useState<any[]>([]);
    const [isLoadingActivities, setIsLoadingActivities] = useState(false);
    const [isLoadingItems, setIsLoadingItems] = useState(false);

    // Fetch Activities and Accounts on Modal Open
    useEffect(() => {
        if (isModalOpen && bulan && tahun) {
            setIsLoadingActivities(true);
            axios.get(route('api.bku.kegiatan-rekening', { tahun, bulan }))
                .then(res => {
                    if (res.data.success) {
                        setFetchedActivities(res.data.kegiatan_list);
                        setFetchedAccounts(res.data.rekening_list);
                    }
                })
                .catch(err => {
                    console.error("Error fetching activities:", err);
                    setFetchedActivities([]);
                    setFetchedAccounts([]);
                })
                .finally(() => setIsLoadingActivities(false));
        }
    }, [isModalOpen, bulan, tahun]);

    // Fetch Uraian Items when Account selected
    useEffect(() => {
        if (selectedActivityId && selectedAccountId) {
            setIsLoadingItems(true);
            axios.get(route('api.bku.uraian', { tahun, bulan, rekeningId: selectedAccountId }), {
                params: { kegiatan_id: selectedActivityId }
            })
                .then(res => {
                    if (res.data.success) {
                        setFetchedRkasItems(res.data.data);
                    } else {
                        setFetchedRkasItems([]);
                    }
                })
                .catch(err => {
                    console.error("Error fetching uraian:", err);
                    setFetchedRkasItems([]);
                })
                .finally(() => setIsLoadingItems(false));
        } else {
            setFetchedRkasItems([]);
        }
    }, [selectedActivityId, selectedAccountId, tahun, bulan]);



    // Validation for Volume Limit
    const hasVolumeError = useMemo(() => {
        return data.items.some(item => {
            return (item.volume > (item.sisa_volume_limit || 0));
        });
    }, [data.items]);

    // Derived Data for Dropdowns
    const uniqueActivities = fetchedActivities;

    const availableAccounts = useMemo(() => {
        if (!selectedActivityId) return fetchedAccounts;
        return fetchedAccounts.filter(acc => String(acc.kegiatan_id) === String(selectedActivityId));
    }, [selectedActivityId, fetchedAccounts]);

    const availableRkasItems = useMemo(() => {
        // Return all fetched items, letting the user verify availability visually if needed
        // or ensure backend sends correct sisa_volume.
        // If we strictly filter > 0 here and backend sends 0 or null, nothing shows.
        if (!fetchedRkasItems) return [];
        return fetchedRkasItems;
    }, [fetchedRkasItems]);

    // Handle Item Selection (Checkbox)
    const handleItemSelection = (rkasItem: any, isChecked: boolean) => {
        let newItems = [...data.items];
        if (isChecked) {
            // Add item
            newItems.push({
                rkas_id: rkasItem.id,
                uraian: rkasItem.uraian,
                volume: rkasItem.sisa_volume || 0,
                sisa_volume_limit: rkasItem.sisa_volume || 0,
                satuan: rkasItem.satuan,
                harga_satuan: rkasItem.harga_satuan,
                total: (rkasItem.sisa_volume || 0) * rkasItem.harga_satuan,
                kegiatan_id: selectedActivityId,
                rekening_id: selectedAccountId
            });
        } else {
            // Remove item
            newItems = newItems.filter(i => i.rkas_id !== rkasItem.id);
        }
        setData('items', newItems);
    };

    const handleSelectAll = (isChecked: boolean) => {
        let newItems = [...data.items];
        const visibleIds = availableRkasItems.map(item => item.id);

        if (isChecked) {
            availableRkasItems.forEach(item => {
                if (!newItems.some(i => i.rkas_id === item.id)) {
                    newItems.push({
                        rkas_id: item.id,
                        uraian: item.uraian,
                        volume: item.sisa_volume || 0,
                        sisa_volume_limit: item.sisa_volume || 0,
                        satuan: item.satuan,
                        harga_satuan: item.harga_satuan,
                        total: (item.sisa_volume || 0) * item.harga_satuan,
                        kegiatan_id: selectedActivityId,
                        rekening_id: selectedAccountId
                    });
                }
            });
        } else {
            newItems = newItems.filter(i => !visibleIds.includes(i.rkas_id));
        }
        setData('items', newItems);
    };

    const updateItemField = (rkasId: number, field: string, value: any) => {
        const newItems = data.items.map(item => {
            if (item.rkas_id === rkasId) {
                const updatedItem = { ...item, [field]: value };
                // Auto calc total
                if (field === 'volume' || field === 'harga_satuan') {
                    updatedItem.total = updatedItem.volume * updatedItem.harga_satuan;
                }
                return updatedItem;
            }
            return item;
        });
        setData('items', newItems);
    };

    useEffect(() => {
        // Reset selections when modal closes or opens
        if (!isModalOpen) {
            setSelectedActivityId('');
            setSelectedAccountId('');
            setDetailUraian('');
        }
    }, [isModalOpen]);

    // Auto-calculate Tax Logic
    useEffect(() => {
        const totalTransaction = data.items.reduce((sum: number, item: any) => sum + (item.total || 0), 0);

        // Main Tax
        if (data.has_tax) {
            const amount = Math.round(totalTransaction * (Number(data.persen_pajak) / 100));
            if (data.total_pajak !== amount) {
                setData('total_pajak', amount);
            }
        }

        // Local Tax
        if (data.has_local_tax) {
            const amount = Math.round(totalTransaction * (Number(data.persen_pajak_daerah) / 100));
            if (data.total_pajak_daerah !== amount) {
                setData('total_pajak_daerah', amount);
            }
        }
    }, [data.has_tax, data.persen_pajak, data.has_local_tax, data.persen_pajak_daerah, data.items]);

    // Delete Confirmation State
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isValidationModalOpen, setIsValidationModalOpen] = useState(false);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [selectedDetailItem, setSelectedDetailItem] = useState<any>(null);

    const [itemToDelete, setItemToDelete] = useState<{ id: number, type: 'penarikan' | 'setor' | 'bku' | 'penerimaan' } | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Delete All BKU State
    const [isDeleteAllBkuModalOpen, setIsDeleteAllBkuModalOpen] = useState(false);
    const [isDeletingAll, setIsDeletingAll] = useState(false);

    const openDetailModal = (item: any) => {
        setSelectedDetailItem(item);
        setIsDetailModalOpen(true);
    };

    // Helper for currency formatting - SAFER VERSION
    const formatCurrency = (number: number | string | undefined | null) => {
        const val = typeof number === 'string' ? parseFloat(number) : number;
        if (val === undefined || val === null || isNaN(val)) {
            return new Intl.NumberFormat('id-ID', {
                style: 'currency',
                currency: 'IDR',
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
            }).format(0);
        }
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(val);
    };

    // Form handling for Penarikan Tunai
    const tarikForm = useForm({
        penganggaran_id: penganggaran.id,
        tanggal_penarikan: '',
        jumlah_penarikan: '',
    });

    // Form handling for Setor Tunai
    const setorForm = useForm({
        penganggaran_id: penganggaran.id,
        tanggal_setor: '',
        jumlah_setor: '',
    });

    // Form handling for Tutup BKU
    const tutupForm = useForm({
        penganggaran_id: penganggaran.id,
        bulan: bulan,
        bunga_bank: '',
        pajak_bunga: '',
        tanggal_tutup: '',
    });

    const steps = [
        { number: 1, title: "Detail Transaksi" },
        { number: 2, title: "Detail Barang/Jasa" },
        { number: 3, title: "Perhitungan Pajak" }
    ];

    // Date constraints
    const yearInt = parseInt(tahun);

    // Map Indonesian month names to indices (0-11)
    const monthMap: { [key: string]: number } = {
        'januari': 0, 'februari': 1, 'maret': 2, 'april': 3, 'mei': 4, 'juni': 5,
        'juli': 6, 'agustus': 7, 'september': 8, 'oktober': 9, 'november': 10, 'desember': 11
    };

    const normalizedBulan = bulan.toLowerCase();
    const currentMonthIndex = monthMap[normalizedBulan] ?? 0;

    const startOfActiveMonth = new Date(yearInt, currentMonthIndex, 1);
    // Last day of the active month (day 0 of next month returns last day of previous)
    const endOfActiveMonth = new Date(yearInt, currentMonthIndex + 1, 0);

    // Find the earliest date of fund reception
    const earliestReceptionDate = (penerimaanDanas || [])
        .map((p: any) => new Date(p.tanggal_terima))
        .sort((a: Date, b: Date) => a.getTime() - b.getTime())[0];

    const disabledWithdrawalDates = [
        { before: startOfActiveMonth },
        { after: endOfActiveMonth },
        // Disable dates before the first fund reception
        ...(earliestReceptionDate ? [{ before: earliestReceptionDate }] : [])
    ];

    // Find the earliest date of cash withdrawal (Penarikan Tunai) - Adjusted for Stages
    const globalEarliestWithdrawal = (penarikanTunais || [])
        .map((p: any) => new Date(p.tanggal_penarikan))
        .sort((a: Date, b: Date) => a.getTime() - b.getTime())[0];

    // Stage 2 Logic (July - December)
    const isStage2 = currentMonthIndex >= 6; // July index is 6
    const startOfStage2 = new Date(yearInt, 6, 1);

    const earliestStage2Withdrawal = (penarikanTunais || [])
        .map((p: any) => new Date(p.tanggal_penarikan))
        .filter((d: Date) => d >= startOfStage2)
        .sort((a: Date, b: Date) => a.getTime() - b.getTime())[0];

    // If in Stage 2 and there is a Stage 2 withdrawal, enforce it. Otherwise use global.
    const effectiveEarliestWithdrawal = (isStage2 && earliestStage2Withdrawal)
        ? earliestStage2Withdrawal
        : globalEarliestWithdrawal;

    const disabledDepositDates = [
        { before: startOfActiveMonth },
        { after: endOfActiveMonth },
        // Disable dates before the effective earliest cash withdrawal
        ...(effectiveEarliestWithdrawal ? [{ before: effectiveEarliestWithdrawal }] : [])
    ];

    const closeModal = () => {
        setIsModalOpen(false);
        setCurrentStep(1);
        reset();
    };

    const nextStep = () => {
        if (currentStep === 1) {
            if (!data.tanggal_transaksi) {
                setTanggalTransaksiError('Wajib di isi');
                setTimeout(() => {
                    const element = document.getElementById('tanggal_transaksi');
                    if (element) element.focus();
                }, 0);
                return;
            } else if (!data.alamat_toko) {
                setAlamatTokoError('Wajib di isi');
                setTimeout(() => {
                    const element = document.getElementById('alamat_toko');
                    if (element) element.focus();
                }, 0);
                return;
            }
        }
        setCurrentStep(prev => Math.min(prev + 1, 3));
    };

    const prevStep = () => {
        setCurrentStep(prev => Math.max(prev - 1, 1));
    };

    // Dummy logic for items (Placeholder for now)
    const [activityItems, setActivityItems] = useState([
        { id: 1, name: 'Pembayaran Rekening Listrik-', maxQty: 2, price: 105000, qty: 1, selected: false }
    ]);
    const totalTransaction = 105000;

    // Calculate taxes when percentage changes
    useEffect(() => {
        if (data.has_tax) {
            const amount = Math.round(totalTransaction * (Number(data.persen_pajak) / 100));
            setData('total_pajak', amount);
        } else {
            setData('total_pajak', 0);
        }
    }, [data.has_tax, data.persen_pajak]);

    useEffect(() => {
        if (data.has_local_tax) {
            const amount = Math.round(totalTransaction * (Number(data.persen_pajak_daerah) / 100));
            setData('total_pajak_daerah', amount);
        } else {
            setData('total_pajak_daerah', 0);
        }
    }, [data.has_local_tax, data.persen_pajak_daerah]);

    // Handle Currency Format for Tarik/Setor
    const handleCurrencyChange = (e: React.ChangeEvent<HTMLInputElement>, formHandler: any, field: string) => {
        let value = e.target.value.replace(/[^0-9]/g, '');
        const numberValue = parseInt(value, 10);
        if (!isNaN(numberValue)) {
            formHandler.setData(field, formatCurrency(numberValue).replace('Rp', '').trim());
        } else {
            formHandler.setData(field, '');
        }
    };

    // Submit Handlers
    const submitTarikTunai = (e: React.FormEvent) => {
        e.preventDefault();

        // Parse amount (remove dots/formatting)
        const amountStr = String(tarikForm.data.jumlah_penarikan).replace(/\./g, '');
        const amount = parseInt(amountStr, 10);

        // Validation Logic
        if (saldoNonTunai <= 0) {
            tarikForm.setError('jumlah_penarikan', 'Saldo Non Tunai kosong, tidak dapat melakukan penarikan.');
            return;
        }

        if (isNaN(amount) || amount <= 0) {
            tarikForm.setError('jumlah_penarikan', 'Jumlah penarikan harus lebih dari 0.');
            return;
        }

        if (amount > saldoNonTunai) {
            tarikForm.setError('jumlah_penarikan', 'Jumlah penarikan melebihi Saldo Non Tunai tersedia.');
            return;
        }

        tarikForm.clearErrors();

        tarikForm.transform((data) => ({
            ...data,
            jumlah_penarikan: amount
        }));

        tarikForm.post(route('penarikan-tunai.store'), {
            onSuccess: () => {
                setIsTarikTunaiOpen(false);
                tarikForm.reset();
            }
        });
    };

    const submitSetorTunai = (e: React.FormEvent) => {
        e.preventDefault();

        // Parse amount (remove dots/formatting)
        const amountStr = String(setorForm.data.jumlah_setor).replace(/\./g, '');
        const amount = parseInt(amountStr, 10);

        if (isNaN(amount) || amount <= 0) {
            setorForm.setError('jumlah_setor', 'Jumlah setor harus lebih dari 0.');
            return;
        }

        // Use transform instead of direct post to ensure clean data is sent
        setorForm.transform((data) => ({
            ...data,
            jumlah_setor: String(amount) // Send as string or number depending on backend, usually numbers are fine but form helpers sometimes prefer matching types. Backend expects numeric.
        }));

        setorForm.post(route('setor-tunai.store'), {
            onSuccess: () => {
                setIsSetorTunaiOpen(false);
                setorForm.reset();
            }
        });
    };

    const submitTutupBku = (e: React.FormEvent) => {
        e.preventDefault();

        // Sanitize inputs first
        const bungaBankRaw = tutupForm.data.bunga_bank ? String(tutupForm.data.bunga_bank).replace(/[^0-9]/g, '') : '0';
        const pajakBungaRaw = tutupForm.data.pajak_bunga ? String(tutupForm.data.pajak_bunga).replace(/[^0-9]/g, '') : '0';

        tutupForm.transform((data) => ({
            ...data,
            bunga_bank: bungaBankRaw,
            pajak_bunga: pajakBungaRaw,
        }));

        tutupForm.post(route('bku.tutup'), {
            onSuccess: () => {
                setIsTutupBkuOpen(false);
                tutupForm.reset();
            },
            onError: (errors: any) => {
                console.error("BKU Closure Error:", errors);
            }
        });
    };

    const submitBku = (e: React.FormEvent) => {
        e.preventDefault();

        if (!data.alamat_toko) {
            setAlamatTokoError('Wajib di isi');
            // Modal removed as per request
            return;
        }
        setAlamatTokoError('');

        transform((data) => {
            // 1. Extract Unique Activity/Account Pairs
            const pairs = new Map();
            data.items.forEach(item => {
                if (item.kegiatan_id && item.rekening_id) {
                    const key = `${item.kegiatan_id}-${item.rekening_id}`;
                    if (!pairs.has(key)) {
                        pairs.set(key, {
                            kegiatan_id: item.kegiatan_id,
                            rekening_id: item.rekening_id
                        });
                    }
                }
            });
            const uniquePairs = Array.from(pairs.values());

            // 2. Map Items
            const mappedItems = data.items.map(item => {
                return {
                    id: item.rkas_id,
                    uraian_text: item.uraian,
                    satuan: item.satuan,
                    jumlah_belanja: item.total,
                    volume: item.volume,
                    harga_satuan: item.harga_satuan,
                    kegiatan_id: item.kegiatan_id,
                    rekening_id: item.rekening_id
                };
            });

            return {
                ...data,
                uraian_opsional: detailUraian,
                // Map frontend fields to backend validation rules
                nama_penyedia: data.nama_toko,
                nama_penerima: data.nama_penerima_pembayaran,
                alamat: data.alamat_toko,
                // Fix Casing for Validation
                jenis_transaksi: data.jenis_transaksi === 'Tunai' ? 'tunai' : 'non-tunai',
                // Arrays
                kode_kegiatan_id: uniquePairs.map((p: any) => p.kegiatan_id),
                kode_rekening_id: uniquePairs.map((p: any) => p.rekening_id),
                uraian_items: mappedItems,
                // Send flat structure as requested to match DB
                pajak: data.has_tax ? data.pajak : null,
                persen_pajak: data.persen_pajak,
                total_pajak: data.total_pajak,
                pajak_daerah: data.has_local_tax ? data.pajak_daerah : null,
                persen_pajak_daerah: data.persen_pajak_daerah,
                total_pajak_daerah: data.total_pajak_daerah,
            };
        });

        post(route('bku.store'), {
            onSuccess: () => {
                setIsModalOpen(false);
                reset();
                setCurrentStep(1);
            },
            preserveScroll: true,
        });
    };

    const handleReopenBku = () => {
        setIsReopenModalOpen(true);
    };

    const confirmReopen = () => {
        setIsReopening(true);
        router.post(route('bku.reopen'), {
            penganggaran_id: penganggaran.id,
            bulan: bulan
        }, {
            onSuccess: () => {
                setIsReopenModalOpen(false);
                setIsReopening(false);
            },
            onFinish: () => {
                setIsReopening(false);
            }
        });
    };



    const openLaporPajakModal = (id: number, currentData: any) => {
        setSelectedBkuIdForPajak(id);
        setData({
            ...data,
            tanggal_lapor: currentData.tanggal_lapor || '',
            kode_masa_pajak: currentData.kode_masa_pajak || '',
            ntpn: currentData.ntpn || ''
        });
        setIsLaporPajakOpen(true);
    };

    const submitLaporPajak = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedBkuIdForPajak) return;

        setIsReportingTax(true);
        router.post(route('bku.lapor-pajak', selectedBkuIdForPajak), {
            tanggal_lapor: data.tanggal_lapor,
            kode_masa_pajak: data.kode_masa_pajak,
            ntpn: data.ntpn
        }, {
            onSuccess: () => {
                setIsLaporPajakOpen(false);
                setSelectedBkuIdForPajak(null);
                reset('tanggal_lapor', 'kode_masa_pajak', 'ntpn');
            },
            onFinish: () => {
                setIsReportingTax(false);
            }
        });
    };

    // Combine and Sort Transactions for Display
    const combinedTransactions = [
        // Penerimaan Dana
        ...(penerimaanDanas || []).filter((item: any) => {
            if (!item.tanggal_terima) return false;

            const monthMap: { [key: string]: number } = {
                'januari': 0, 'februari': 1, 'maret': 2, 'april': 3, 'mei': 4, 'juni': 5,
                'juli': 6, 'agustus': 7, 'september': 8, 'oktober': 9, 'november': 10, 'desember': 11
            };

            const itemDate = new Date(item.tanggal_terima);
            const itemMonth = itemDate.getMonth();
            const itemYear = itemDate.getFullYear();

            const normalizedBulan = bulan.toLowerCase();
            const targetMonth = monthMap[normalizedBulan];
            const targetYear = parseInt(tahun);

            if (targetMonth === undefined) {
                const formattedMonth = format(itemDate, 'MMMM', { locale: id }).toLowerCase();
                return formattedMonth === normalizedBulan && String(itemYear) === String(tahun);
            }

            return itemMonth === targetMonth && itemYear === targetYear;
        }).map((item: any) => ({ ...item, type: 'penerimaan' })),

        // Penarikan Tunai
        ...(penarikanTunais || []).filter((item: any) => {
            if (!item.tanggal_penarikan) return false;

            const monthMap: { [key: string]: number } = {
                'januari': 0, 'februari': 1, 'maret': 2, 'april': 3, 'mei': 4, 'juni': 5,
                'juli': 6, 'agustus': 7, 'september': 8, 'oktober': 9, 'november': 10, 'desember': 11
            };

            const itemDate = new Date(item.tanggal_penarikan);
            const itemMonth = itemDate.getMonth();
            const itemYear = itemDate.getFullYear();

            const normalizedBulan = bulan.toLowerCase();
            const targetMonth = monthMap[normalizedBulan];
            const targetYear = parseInt(tahun);

            if (targetMonth === undefined) {
                const formattedMonth = format(itemDate, 'MMMM', { locale: id }).toLowerCase();
                return formattedMonth === normalizedBulan && String(itemYear) === String(tahun);
            }

            return itemMonth === targetMonth && itemYear === targetYear;
        }).map((item: any) => ({ ...item, type: 'penarikan' })),

        // Setor Tunai
        ...(setorTunais || []).filter((item: any) => {
            if (!item.tanggal_setor) return false;

            const monthMap: { [key: string]: number } = {
                'januari': 0, 'februari': 1, 'maret': 2, 'april': 3, 'mei': 4, 'juni': 5,
                'juli': 6, 'agustus': 7, 'september': 8, 'oktober': 9, 'november': 10, 'desember': 11
            };

            const itemDate = new Date(item.tanggal_setor);
            const itemMonth = itemDate.getMonth();
            const itemYear = itemDate.getFullYear();

            const normalizedBulan = bulan.toLowerCase();
            const targetMonth = monthMap[normalizedBulan];
            const targetYear = parseInt(tahun);

            if (targetMonth === undefined) {
                const formattedMonth = format(itemDate, 'MMMM', { locale: id }).toLowerCase();
                return formattedMonth === normalizedBulan && String(itemYear) === String(tahun);
            }

            return itemMonth === targetMonth && itemYear === targetYear;
        }).map((item: any) => ({ ...item, type: 'setor' })),

        // BKU Regular
        ...(bkuData || []).map((item: any) => ({ ...item, type: 'bku' }))
    ].sort((a: any, b: any) => {
        const dateA = new Date(a.tanggal_terima || a.tanggal_transaksi || a.tanggal_penarikan || a.tanggal_setor).getTime();
        const dateB = new Date(b.tanggal_terima || b.tanggal_transaksi || b.tanggal_penarikan || b.tanggal_setor).getTime();
        return dateA - dateB;
    });

    // Filter Transactions based on Search
    const filteredTransactions = combinedTransactions.filter((item: any) => {
        if (!searchQuery) return true;
        const lowerQuery = searchQuery.toLowerCase();

        const safeString = (val: any) => String(val || '').toLowerCase();

        if (item.type === 'penerimaan') {
            return safeString('Penerimaan Dana').includes(lowerQuery) ||
                safeString(item.jumlah_dana).includes(lowerQuery) ||
                safeString(format(new Date(item.tanggal_terima), 'd MMM yyyy', { locale: id })).includes(lowerQuery);
        }
        if (item.type === 'penarikan') {
            return safeString('Tarik Tunai').includes(lowerQuery) ||
                safeString(item.jumlah_penarikan).includes(lowerQuery) ||
                safeString(format(new Date(item.tanggal_penarikan), 'd MMM yyyy', { locale: id })).includes(lowerQuery);
        }
        if (item.type === 'setor') {
            return safeString('Setor Tunai').includes(lowerQuery) ||
                safeString(item.jumlah_setor).includes(lowerQuery) ||
                safeString(format(new Date(item.tanggal_setor), 'd MMM yyyy', { locale: id })).includes(lowerQuery);
        }

        // Regular BKU
        return safeString(item.id_transaksi).includes(lowerQuery) ||
            safeString(item.tanggal_transaksi).includes(lowerQuery) ||
            safeString(item.kode_kegiatan?.sub_program).includes(lowerQuery) ||
            safeString(item.uraian_opsional).includes(lowerQuery) ||
            safeString(item.rekening_belanja?.rincian_objek).includes(lowerQuery) ||
            safeString(item.jenis_transaksi).includes(lowerQuery) ||
            safeString(item.total_transaksi_kotor).includes(lowerQuery) ||
            safeString(item.nama_toko).includes(lowerQuery);
    });

    const handleDeleteClick = (id: number, type: 'penarikan' | 'setor' | 'bku' | 'penerimaan') => {
        if (type === 'penerimaan') {
            // Check if there are any Penarikan Tunai in the same month
            const hasWithdrawals = combinedTransactions.some((t: any) => t.type === 'penarikan');
            if (hasWithdrawals) {
                setIsValidationModalOpen(true);
                return;
            }
        }
        setItemToDelete({ id, type });
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = () => {
        if (!itemToDelete) return;

        setIsDeleting(true);
        const { id, type } = itemToDelete;

        if (type === 'penarikan') {
            router.delete(route('penarikan-tunai.destroy', id), {
                preserveScroll: true,
                onSuccess: () => {
                    setIsDeleteModalOpen(false);
                    setItemToDelete(null);
                    setIsDeleting(false);
                },
                onError: () => {
                    setIsDeleting(false);
                }
            });
        } else if (type === 'penerimaan') {
            router.delete(route('penerimaan-dana.destroy', id), {
                preserveScroll: true,
                onSuccess: () => {
                    setIsDeleteModalOpen(false);
                    setItemToDelete(null);
                    setIsDeleting(false);
                },
                onError: () => {
                    setIsDeleting(false);
                }
            });
        } else if (type === 'setor') {
            router.delete(route('setor-tunai.destroy', id), {
                preserveScroll: true,
                onSuccess: () => {
                    setIsDeleteModalOpen(false);
                    setItemToDelete(null);
                    setIsDeleting(false);
                },
                onError: () => {
                    setIsDeleting(false);
                }
            });
        } else {
            router.delete(route('bku.destroy', id), {
                preserveScroll: true,
                onSuccess: () => {
                    setIsDeleteModalOpen(false);
                    setItemToDelete(null);
                    setIsDeleting(false);
                },
                onError: () => {
                    setIsDeleting(false);
                }
            });
        }
    };


    const confirmDeleteAllBku = () => {
        setIsDeletingAll(true);
        router.post(route('bku.destroy-period'), {
            penganggaran_id: penganggaran.id,
            bulan: bulan
        }, {
            onSuccess: () => {
                setIsDeleteAllBkuModalOpen(false);
                setIsDeletingAll(false);
            },
            onError: () => {
                setIsDeletingAll(false);
            },
            onFinish: () => {
                setIsDeletingAll(false);
            }
        });
    };


    const renderStep1 = () => (
        <div className="space-y-2">
            {/* <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-start gap-3">
                <input
                    type="checkbox"
                    checked={data.is_siplah}
                    onChange={(e) => setData('is_siplah', e.target.checked)}
                    className="mt-1 rounded border-gray-300 text-blue-600 shadow-sm focus:ring-blue-500"
                />
                <div>
                    <span className="text-gray-900 dark:text-gray-100 font-medium text-[10pt]">Centang</span>
                    <span className="text-gray-600 dark:text-gray-400 text-[10pt]"> jika belanja dari SIPLah untuk ambil data pembelanjaan secara otomatis</span>
                    <p className="text-[10pt] text-blue-500 mt-1">"Ambil Data" membutuhkan koneksi internet</p>
                </div>
            </div> */}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 ms-2 me-2">
                <div>
                    <InputLabel value="Tanggal Transaksi" className="!text-[10pt]" />
                    <DatePicker
                        value={data.tanggal_transaksi}
                        onChange={(date) => {
                            const formattedDate = date ? format(date, 'yyyy-MM-dd') : '';
                            setData((prevData) => ({
                                ...prevData,
                                tanggal_transaksi: formattedDate,
                                tanggal_nota: formattedDate // Auto-fill tanggal_nota
                            }));
                            if (formattedDate) setTanggalTransaksiError('');
                        }}
                        className="mt-1 block w-full text-gray-900 !text-[10pt]"
                        placeholder={
                            data.jenis_transaksi === 'Nontunai'
                                ? "Tanggal Transaksi"
                                : ((!penarikanTunais || penarikanTunais.length === 0) ? "Belum ada penarikan tunai" : "Tanggal Transaksi")
                        }
                        startMonth={startOfActiveMonth}
                        endMonth={endOfActiveMonth}
                        disabled={data.jenis_transaksi === 'Nontunai' ? disabledWithdrawalDates : disabledDepositDates}
                        inputDisabled={data.jenis_transaksi === 'Nontunai' ? false : (!penarikanTunais || penarikanTunais.length === 0)}
                        id="tanggal_transaksi"
                    />
                    <InputError message={tanggalTransaksiError} className="mt-2" />
                </div>
                <div>
                    <InputLabel value="Jenis Transaksi" className="!text-[10pt] ms-2 me-2" />
                    <select
                        value={data.jenis_transaksi}
                        onChange={(e) => setData('jenis_transaksi', e.target.value)}
                        className="mt-1 block w-full text-gray-900 border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 focus:border-indigo-500 dark:focus:border-indigo-600 focus:ring-indigo-500 dark:focus:ring-indigo-600 rounded-md shadow-sm !text-[10pt]"
                    >
                        <option value="Tunai">Tunai ({formatCurrency(saldoTunai)})</option>
                        <option value="Nontunai">Nontunai ({formatCurrency(saldoNonTunai)})</option>
                    </select>
                </div>
            </div>

            <div className="mt-2 flex items-center gap-2 ms-2">
                <input
                    type="checkbox"
                    checked={data.no_entity}
                    onChange={(e) => setData('no_entity', e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 shadow-sm focus:ring-blue-500"
                />
                <span className="text-gray-600 dark:text-gray-400 text-[10pt]">Centang jika pembelanjaan ini tidak memiliki toko/badan usaha</span>
            </div>

            <div className="ms-2 me-2">
                {data.no_entity ? (
                    <>
                        <InputLabel value="Nama Penerima Pembayaran" className="!text-[10pt]" />
                        <div className="relative mt-1">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <svg className="h-4 w-4 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <TextInput
                                className="pl-9 block w-full text-gray-900 !text-[10pt]"
                                value={data.nama_penerima_pembayaran}
                                onChange={(e) => setData('nama_penerima_pembayaran', e.target.value)}
                                placeholder="Nama orang yang menerima pembayaran"
                            />
                        </div>
                    </>
                ) : (
                    <>
                        <InputLabel value="Nama Toko/Badan Usaha" className="!text-[10pt]" />
                        <div className="relative mt-1">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <svg className="h-4 w-4 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <TextInput
                                className="pl-9 block w-full text-gray-900 !text-[10pt]"
                                value={data.nama_toko}
                                onChange={(e) => setData('nama_toko', e.target.value)}
                                placeholder="Nama toko tempat Anda membeli barang/jasa"
                            />
                        </div>
                    </>
                )}
            </div>

            <div className="ms-2 me-2">
                <InputLabel value="Alamat Toko/Badan Usaha" className="!text-[10pt]" />
                <TextInput
                    className="mt-1 block w-full text-gray-900 !text-[10pt]"
                    value={data.alamat_toko}
                    onChange={(e) => {
                        setData('alamat_toko', e.target.value);
                        if (e.target.value) setAlamatTokoError('');
                    }}
                    placeholder="Alamat lengkap toko/badan usaha"
                    id="alamat_toko"
                />
                <InputError message={alamatTokoError} className="mt-2" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 ms-2 me-2">
                <div>
                    <InputLabel value="Nomor Telepon" className="!text-[10pt]" />
                    <TextInput
                        className="mt-1 block w-full text-gray-900 !text-[10pt]"
                        value={data.nomor_telepon}
                        onChange={(e) => setData('nomor_telepon', e.target.value)}
                        placeholder="Nomor kontak (Opsional)"
                    />
                </div>

                <div>
                    <InputLabel value="NPWP Toko/Badan Usaha" className="!text-[10pt]" />
                    <TextInput
                        className="mt-1 block w-full text-gray-900 disabled:bg-gray-100 disabled:text-gray-500 !text-[10pt]"
                        value={data.npwp}
                        onChange={(e) => setData('npwp', e.target.value)}
                        placeholder="NPWP (Opsional)"
                        disabled={data.no_npwp}
                    />
                    <div className="mt-1 flex items-center gap-2">
                        <input
                            type="checkbox"
                            checked={data.no_npwp}
                            onChange={(e) => setData('no_npwp', e.target.checked)}
                            className="rounded border-gray-300 text-blue-600 shadow-sm focus:ring-blue-500 h-3 w-3"
                        />
                        <span className="text-gray-600 dark:text-gray-400 text-[9pt]">Tidak punya NPWP</span>
                    </div>
                </div>
            </div>
        </div>
    );

    const renderStep2 = () => {
        const isSelected = (rkasId: number) => data.items.some(i => i.rkas_id === rkasId);
        const getItem = (rkasId: number) => data.items.find(i => i.rkas_id === rkasId);

        return (
            <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                    <div>
                        <InputLabel value="Nomor Nota (Opsional)" className="!text-[10pt]" />
                        <TextInput
                            className="mt-1 block w-full text-gray-900 !text-[10pt]"
                            value={data.nomor_nota}
                            onChange={(e) => setData('nomor_nota', e.target.value)}
                            placeholder="Kosongkan untuk auto-generate (BPU-XXX)"
                        />
                        <span className="text-[9pt] text-gray-500 mt-1 block">
                            Nomor Nota Terakhir: <span className="font-semibold text-gray-700 dark:text-gray-300">{lastNoteNumber}</span>
                        </span>
                    </div>
                    <div>
                        <InputLabel value="Tanggal Belanja/Nota" className="!text-[10pt]" />
                        <DatePicker
                            value={data.tanggal_nota}
                            onChange={(date) => setData('tanggal_nota', date ? format(date, 'yyyy-MM-dd') : '')}
                            className="mt-1 block w-full text-gray-900 !text-[10pt]"
                            placeholder={(!penarikanTunais || penarikanTunais.length === 0) ? "Belum ada penarikan tunai" : "Pilih Tanggal"}
                            startMonth={startOfActiveMonth}
                            endMonth={endOfActiveMonth}
                            disabled={disabledDepositDates}
                            inputDisabled={!penarikanTunais || penarikanTunais.length === 0}
                        />
                    </div>
                </div>

                {/* Main Card */}
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 shadow-sm">
                    {/* Cyan Header */}
                    <div className="bg-cyan-400 p-4 rounded-t-lg">
                        <h3 className="text-white font-bold text-lg">Kegiatan 1</h3>
                    </div>

                    <div className="p-6 space-y-6">
                        {/* Kegiatan Select */}
                        <div>
                            <InputLabel value="Kegiatan" className="!text-[10pt] mb-1" />
                            <SearchableSelect
                                value={selectedActivityId}
                                onChange={(val) => {
                                    setSelectedActivityId(String(val));
                                    setSelectedAccountId(''); // Reset account when activity changes
                                }}
                                options={uniqueActivities}
                                searchFields={['kode', 'uraian']}
                                displayColumns={[
                                    { header: 'Kode', field: 'kode', width: 'w-24' },
                                    { header: 'Uraian Kegiatan', field: 'uraian' }
                                ]}
                                labelRenderer={(opt) => `${opt.kode} - ${opt.uraian}`}
                                placeholder="Pilih Jenis Kegiatan"
                            />
                        </div>

                        {/* Rekening Belanja Select */}
                        <div>
                            <InputLabel value="Rekening Belanja" className="!text-[10pt] mb-1" />
                            <SearchableSelect
                                value={selectedAccountId}
                                onChange={(val) => setSelectedAccountId(String(val))}
                                options={availableAccounts}
                                searchFields={['kode_rekening', 'rincian_objek']}
                                displayColumns={[
                                    { header: 'Kode', field: 'kode_rekening', width: 'w-32' },
                                    { header: 'Nama Rekening', field: 'rincian_objek' }
                                ]}
                                labelRenderer={(opt) => `${opt.kode_rekening} - ${opt.rincian_objek}`}
                                placeholder={selectedActivityId ? "Pilih Rekening Belanja" : "Pilih kegiatan terlebih dahulu"}
                                className={!selectedActivityId ? 'opacity-50 pointer-events-none' : ''}
                            />
                        </div>

                        {/* Uraian Belanja (Opsional) */}
                        <div>
                            <InputLabel value="Uraian Belanja (Opsional)" className="!text-[10pt] mb-1" />
                            <textarea
                                value={detailUraian}
                                onChange={(e) => setDetailUraian(e.target.value)}
                                className="w-full border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 focus:border-cyan-500 focus:ring-cyan-500 rounded-md shadow-sm text-[10pt]"
                                rows={2}
                                placeholder="Detail uraian belanja (jika ada)"
                            />
                            <p className="text-red-500 text-[9pt] mt-1 flex items-center">
                                <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Uraian akan otomatis oleh sistem menggunakan uraian rekening belanja jika uraian belanja tidak diisi
                            </p>
                        </div>

                        {/* Items Section (Only show if Account selected) */}
                        {selectedAccountId && (
                            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                                <div className="flex justify-between items-center mb-4">
                                    <h4 className="font-bold text-gray-800 dark:text-gray-200">Uraian</h4>
                                    {/* Select All Checkbox could go here */}
                                    <div className="flex items-center">
                                        <input
                                            type="checkbox"
                                            className="rounded border-gray-300 text-cyan-500 shadow-sm focus:ring-cyan-500 mr-2"
                                            checked={availableRkasItems.length > 0 && availableRkasItems.every(item => data.items.some(i => i.rkas_id === item.id))}
                                            onChange={(e) => handleSelectAll(e.target.checked)}
                                        />
                                        <span className="text-[10pt] font-bold">Pilih semua uraian</span>
                                    </div>
                                </div>

                                <p className="text-[10pt] text-gray-500 mb-4">Total RKAS: {availableRkasItems.length} | Sudah: 0 | Sisa: {availableRkasItems.length}</p>

                                <div className="space-y-4">
                                    {availableRkasItems.map((item: any) => (
                                        <div key={item.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800">
                                            <div className="flex items-start gap-3 mb-4">
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected(item.id)}
                                                    onChange={(e) => handleItemSelection(item, e.target.checked)}
                                                    className="mt-1 rounded border-gray-300 text-cyan-500 shadow-sm focus:ring-cyan-500 w-5 h-5"
                                                />
                                                <span className="text-[10pt] font-bold text-gray-800 dark:text-gray-200 pt-0.5">{item.uraian}</span>
                                            </div>

                                            {isSelected(item.id) && (
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-8">
                                                    <div>
                                                        <InputLabel value="Jumlah yang akan dibelanjakan" className="!text-[10pt] mb-1" />
                                                        <div className="relative rounded-md shadow-sm">
                                                            <TextInput
                                                                type="number"
                                                                className="block w-full pr-24 text-gray-900 dark:text-gray-100 dark:bg-gray-700 !text-[10pt]"
                                                                value={getItem(item.id)?.volume}
                                                                onChange={(e) => updateItemField(item.id, 'volume', parseFloat(e.target.value) || 0)}
                                                                placeholder="0"
                                                            />
                                                            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                                                <span className="text-gray-500 dark:text-gray-400 sm:text-xs bg-gray-100 dark:bg-gray-600 px-2 py-1 rounded">
                                                                    Maks: {item.sisa_volume}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        {(getItem(item.id)?.volume || 0) > item.sisa_volume && (
                                                            <p className="text-red-500 text-[9pt] mt-1">
                                                                Jumlah melebihi volume yang tersedia!
                                                            </p>
                                                        )}
                                                        <p className="text-[9pt] text-gray-500 dark:text-gray-400 mt-1">
                                                            Sisa volume kumulatif: <span className="font-semibold">{item.sisa_volume} {item.satuan}</span>
                                                        </p>
                                                    </div>

                                                    <div>
                                                        <InputLabel value="Harga Satuan" className="!text-[10pt]" />
                                                        <div className="relative mt-1">
                                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                                <span className="text-gray-500 text-[10pt]">Rp</span>
                                                            </div>
                                                            <TextInput
                                                                className="pl-8 block w-full text-gray-900 !text-[10pt] bg-gray-50"
                                                                value={formatCurrency(item.harga_satuan).replace('Rp', '').trim()}
                                                                readOnly
                                                            />
                                                        </div>
                                                        <p className="text-[9pt] text-gray-500 mt-1">Harga tetap sesuai RKAS</p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}

                                    {availableRkasItems.length === 0 && (
                                        <p className="text-center text-gray-500 py-4 italic">Tidak ada uraian tersedia untuk rekening ini.</p>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    const renderStep3 = () => (
        <div className="space-y-2">
            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-start gap-3">
                <input
                    type="checkbox"
                    checked={data.bebas_pajak}
                    onChange={(e) => setData('bebas_pajak', e.target.checked)}
                    className="mt-1 rounded border-gray-300 text-blue-600 shadow-sm focus:ring-blue-500"
                />
                <span className="text-gray-900 dark:text-gray-100 font-medium text-[10pt]">Centang jika belanja dari SIPLah untuk bebas lapor pajak secara otomatis</span>
            </div>

            {/* Dynamic Activity Cards */}
            {(() => {
                // Group selected items by Activity and Account
                const groups: any[] = [];
                data.items.forEach((item: any) => {
                    // Lookup in fetched lists
                    const activity = fetchedActivities.find(a => String(a.id) === String(item.kegiatan_id));
                    const account = fetchedAccounts.find(a => String(a.id) === String(item.rekening_id));

                    if (!activity || !account) return;

                    const key = `${item.kegiatan_id}-${item.rekening_id}`;
                    let group = groups.find((g) => g.key === key);

                    if (!group) {
                        group = {
                            key,
                            activity: activity,
                            account: account,
                            items: []
                        };
                        groups.push(group);
                    }
                    group.items.push({ ...item });
                });

                return groups.map((group, idx) => (
                    <div key={group.key} className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm mb-4">
                        <div className="bg-cyan-100 dark:bg-cyan-900/50 px-4 py-3 border-b border-cyan-200 dark:border-cyan-800">
                            <h4 className="font-bold text-cyan-900 dark:text-cyan-100 text-[10pt]">
                                Kegiatan {idx + 1}
                            </h4>
                        </div>

                        <div className="p-4 space-y-3">
                            <div>
                                <div className="text-[10pt] font-bold text-gray-800 dark:text-gray-200">
                                    Kegiatan: <span className="font-normal">{group.activity?.kode} - {group.activity?.uraian}</span>
                                </div>
                                <div className="text-[10pt] font-bold text-gray-800 dark:text-gray-200 mt-1">
                                    Rekening: <span className="font-normal">{group.account?.kode_rekening} - {group.account?.rincian_objek}</span>
                                </div>
                            </div>

                            <div className="pt-2">
                                <div className="text-[10pt] font-bold text-gray-800 dark:text-gray-100 mb-2">Uraian yang dipilih:</div>
                                <div className="space-y-3">
                                    {group.items.map((item: any, i: number) => (
                                        <div key={i} className="pl-4 border-l-4 border-cyan-500 bg-gray-50 dark:bg-gray-700/50 py-2 pr-2 rounded-r">
                                            <div className="font-bold text-[10pt] text-gray-900 dark:text-gray-100">{item.uraian}</div>
                                            <div className="text-[9pt] text-gray-600 dark:text-gray-400 mt-1">
                                                Jumlah: {item.volume} | Harga: {formatCurrency(item.harga_satuan)} | Subtotal: {formatCurrency(item.total)}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-3 pt-2 border-t border-gray-100 dark:border-gray-700 flex justify-end items-center">
                                    <span className="text-[10pt] font-bold text-gray-700 dark:text-gray-300 mr-2">Total Transaksi Kotor:</span>
                                    <span className="text-[11pt] font-bold text-blue-600 dark:text-blue-400">
                                        {formatCurrency(group.items.reduce((sum: number, item: any) => sum + (item.total || 0), 0))}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                ));
            })()}

            {/* Tax Inputs */}
            <div className="mt-4 space-y-3">
                {/* Main Tax Checkbox */}
                <div className="flex items-center gap-2">
                    <input
                        type="checkbox"
                        checked={data.has_tax}
                        onChange={(e) => setData('has_tax', e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 shadow-sm focus:ring-blue-500"
                    />
                    <span className="text-gray-700 dark:text-gray-300 text-[10pt] font-medium">Centang jika pembelanjaan ini dikenakan pajak</span>
                </div>

                {/* Tax Card */}
                {data.has_tax && (
                    <div className="bg-white dark:bg-gray-800 p-2 rounded-lg border border-gray-200 dark:border-gray-700 space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div className="space-y-1">
                                <InputLabel value="Jenis Pajak" className="!text-[10pt]" />
                                <select
                                    value={data.pajak}
                                    onChange={(e) => setData('pajak', e.target.value)}
                                    className="w-full text-gray-900 border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 rounded-md shadow-sm focus:ring-indigo-500 !text-[10pt]"
                                >
                                    <option value="PPN">PPN</option>
                                    <option value="PPh 21">PPh 21</option>
                                    <option value="PPh 22">PPh 22</option>
                                    <option value="PPh 23">PPh 23</option>
                                </select>
                            </div>
                            <div className="space-y-1">
                                <InputLabel value="Persen (%)" className="!text-[10pt]" />
                                <TextInput
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={data.persen_pajak}
                                    onChange={(e) => setData('persen_pajak', e.target.value)}
                                    className="w-full text-gray-900 !text-[10pt]"
                                />
                            </div>
                            <div className="space-y-1">
                                <InputLabel value="Total Pajak" className="!text-[10pt]" />
                                <TextInput
                                    value={data.total_pajak.toLocaleString('id-ID')}
                                    disabled
                                    className="w-full bg-gray-100 text-gray-900 !text-[10pt]"
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* Local Tax Checkbox */}
                <div className="flex items-center gap-2 pt-2">
                    <input
                        type="checkbox"
                        checked={data.has_local_tax}
                        onChange={(e) => setData('has_local_tax', e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 shadow-sm focus:ring-blue-500"
                    />
                    <span className="text-gray-700 dark:text-gray-300 text-[10pt] font-medium">Centang jika pembelanjaan ini dikenakan pajak daerah</span>
                </div>

                {/* Local Tax Card */}
                {data.has_local_tax && (
                    <div className="bg-white dark:bg-gray-800 p-2 rounded-lg border border-gray-200 dark:border-gray-700 space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div className="space-y-1">
                                <InputLabel value="Jenis Pajak Daerah" className="!text-[10pt]" />
                                <select
                                    value={data.pajak_daerah}
                                    onChange={(e) => setData('pajak_daerah', e.target.value)}
                                    className="w-full text-gray-900 border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 rounded-md shadow-sm focus:ring-indigo-500 !text-[10pt]"
                                >
                                    <option value="PB1">PB1</option>
                                </select>
                            </div>
                            <div className="space-y-1">
                                <InputLabel value="Persen (%)" className="!text-[10pt]" />
                                <TextInput
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={data.persen_pajak_daerah}
                                    onChange={(e) => setData('persen_pajak_daerah', e.target.value)}
                                    className="w-full text-gray-900 !text-[10pt]"
                                />
                            </div>
                            <div className="space-y-1">
                                <InputLabel value="Total Pajak" className="!text-[10pt]" />
                                <TextInput
                                    value={data.total_pajak_daerah.toLocaleString('id-ID')}
                                    disabled
                                    className="w-full bg-gray-100 text-gray-900 !text-[10pt]"
                                />
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );




    // Calculate real spending strictly for this month (excluding transactions dated in prev/next months)
    const realSpendingThisMonth = useMemo(() => {
        return (bkuData || []).reduce((acc: number, item: any) => {
            const transDate = new Date(item.tanggal_transaksi);
            if (isNaN(transDate.getTime())) return acc;

            // Check if same month and year as the active BKU
            if (transDate.getMonth() === currentMonthIndex && transDate.getFullYear() === yearInt) {
                return acc + (Number(item.total_transaksi_kotor) || 0);
            }
            return acc;
        }, 0);
    }, [bkuData, currentMonthIndex, yearInt]);

    // Calculate closed state values for UI
    const closingRecord = useMemo(() => bkuData?.find((item: any) => item.is_bunga_record || item.is_bunga_record === 1), [bkuData]);
    const closingDate = closingRecord ? new Date(closingRecord.tanggal_tutup || closingRecord.tanggal_transaksi) : new Date();

    const totalBelanjaTunai = useMemo(() => {
        return (bkuData || []).reduce((acc: number, item: any) => {
            if (item.is_bunga_record) return acc;
            if (item.jenis_transaksi?.toLowerCase() === 'tunai') {
                return acc + (Number(item.total_transaksi_kotor) || 0);
            }
            return acc;
        }, 0);
    }, [bkuData]);

    const totalBelanjaNonTunai = useMemo(() => {
        return (bkuData || []).reduce((acc: number, item: any) => {
            if (item.is_bunga_record) return acc;
            const type = item.jenis_transaksi?.toLowerCase();
            if (type === 'non-tunai' || type === 'nontunai') {
                return acc + (Number(item.total_transaksi_kotor) || 0);
            }
            return acc;
        }, 0);
    }, [bkuData]);

    const totalPajakWajibLapor = useMemo(() => {
        return (bkuData || []).reduce((acc: number, item: any) => {
            if (item.is_bunga_record) return acc;
            return acc + (Number(item.total_pajak) || 0);
        }, 0);
    }, [bkuData]);

    return (
        <AuthenticatedLayout>

            <Head title={`BKU ${bulan} ${tahun}`} />

            <div className="py-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
                {/* Back Button */}
                <div className="mb-4">
                    <Link
                        href={route('penatausahaan.index')}
                        className="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium text-[10pt] transition-colors"
                    >
                        <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Kembali ke Penatausahaan
                    </Link>
                </div>

                {/* Header Section */}
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4">
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                                BKU {bulan} {tahun}
                            </h1>
                            {!is_closed && (
                                <button
                                    onClick={() => setIsDeleteAllBkuModalOpen(true)}
                                    className="flex items-center text-gray-400 hover:text-red-500 transition-colors text-sm"
                                >
                                    <svg className="w-5 h-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                    Hapus BKU
                                </button>
                            )}
                        </div>
                        <p className="text-gray-500 dark:text-gray-400 mt-1 uppercase text-[10pt]">BOSP REGULER {tahun}</p>
                    </div>

                    <div className="flex flex-col items-end gap-2 w-full lg:w-auto">
                        <div className="flex flex-wrap gap-2 w-full lg:w-auto">
                            {!is_closed && (
                                <button
                                    onClick={() => setIsModalOpen(true)}
                                    className="inline-flex items-center px-4 py-2 bg-primary dark:bg-primary-800 border border-gray-300 dark:border-gray-600 rounded-md font-semibold text-[10pt] text-gray-900 dark:text-gray-300 uppercase tracking-widest shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none transition ease-in-out duration-150"
                                >
                                    <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                    Tambah Pembelanjaan
                                </button>
                            )}
                            {isSearchVisible ? (
                                <div className="relative flex items-center transition-all duration-300 ease-in-out w-full sm:w-64">
                                    <div className="relative w-full">
                                        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                            <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 20">
                                                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z" />
                                            </svg>
                                        </div>
                                        <input
                                            type="text"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            placeholder="Cari transaksi..."
                                            autoFocus
                                            className="block w-full p-2 pl-10 text-[10pt] text-gray-900 border border-gray-300 rounded-lg bg-gray-50 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                                        />
                                        <button
                                            onClick={() => {
                                                setIsSearchVisible(false);
                                                setSearchQuery('');
                                            }}
                                            className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                                        >
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <button
                                    onClick={() => setIsSearchVisible(true)}
                                    className="inline-flex items-center px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md font-semibold text-[10pt] text-gray-700 dark:text-gray-300 uppercase tracking-widest shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none transition ease-in-out duration-150"
                                >
                                    <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                    Cari
                                </button>
                            )}
                            <Link
                                href={route('penatausahaan.rekapitulasi', { tahun, bulan: bulan.toLowerCase() })}
                                className="inline-flex items-center px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md font-semibold text-[10pt] text-gray-700 dark:text-gray-300 uppercase tracking-widest shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none transition ease-in-out duration-150"
                            >
                                <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                </svg>
                                Cetak
                            </Link>
                            <button
                                onClick={is_closed ? handleReopenBku : () => setIsTutupBkuOpen(true)}
                                className={`inline-flex items-center px-4 py-2 border border-transparent rounded-md font-semibold text-[10pt] text-white uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-offset-2 transition ease-in-out duration-150
                                    ${is_closed
                                        ? 'bg-green-600 hover:bg-green-700 focus:bg-green-700 focus:ring-green-500'
                                        : 'bg-gray-800 dark:bg-gray-200 dark:text-gray-800 hover:bg-gray-700 dark:hover:bg-white focus:bg-gray-700 dark:focus:bg-white active:bg-gray-900 dark:active:bg-gray-300 focus:ring-indigo-500 dark:focus:ring-offset-gray-800'
                                    }`}
                            >
                                {is_closed ? 'Aktifkan Kembali' : 'Tutup BKU'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Info Cards Section - UPDATED WITH REAL DATA */}
                {is_closed ? (
                    <div className="bg-gradient-to-br from-indigo-500 to-purple-600 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 mb-8 shadow-sm">
                        <div className="flex items-center gap-2 mb-6 text-white dark:text-white">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            <span className="font-bold text-[10pt]">
                                BKU sudah ditutup pada {closing_date ? format(new Date(closing_date), 'd MMM yyyy', { locale: id }) : '-'}
                            </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div>
                                <InputLabel value="Total Dibelanjakan Nontunai" className="!text-[10pt] mb-2 text-white dark:text-white" />
                                <div className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-gray-500 dark:text-gray-300 font-bold text-[11pt]">
                                    {formatCurrency(totalBelanjaNonTunai)}
                                </div>
                            </div>
                            <div>
                                <InputLabel value="Total Dibelanjakan Tunai" className="!text-[10pt] mb-2 text-white dark:text-white" />
                                <div className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-gray-500 dark:text-gray-300 font-bold text-[11pt]">
                                    {formatCurrency(totalBelanjaTunai)}
                                </div>
                            </div>
                            <div>
                                <InputLabel value="Pajak Wajib Lapor" className="!text-[10pt] mb-2 text-white dark:text-white" />
                                <div className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-gray-500 dark:text-gray-300 font-bold text-[11pt]">
                                    {formatCurrency(totalPajakWajibLapor)}
                                </div>
                            </div>
                            <div>
                                <div className="flex items-center gap-1 mb-2">
                                    <InputLabel value="Sisa Dana Tersedia" className="!text-[10pt] text-white dark:text-white" />
                                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                    </svg>
                                </div>
                                <div className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-gray-500 dark:text-gray-300 font-bold text-[11pt]">
                                    {formatCurrency(totalDanaTersedia - totalDibelanjakanBulanIni)}
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                        <div className="bg-blue-50/50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg p-6 relative">
                            <h3 className="text-gray-600 dark:text-gray-400 font-medium mb-1 text-[10pt]">TOTAL DANA TERSEDIA</h3>
                            <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-6">{formatCurrency(totalDanaTersedia - totalDibelanjakanBulanIni)}</div>

                            <div className="absolute top-6 right-6 flex gap-4 text-[10pt] font-medium text-blue-600 dark:text-blue-400">
                                <button
                                    onClick={() => setIsTarikTunaiOpen(true)}
                                    className="hover:underline"
                                >
                                    Tarik Tunai
                                </button>
                                <button
                                    onClick={() => setIsSetorTunaiOpen(true)}
                                    className="hover:underline"
                                >
                                    Setor Tunai
                                </button>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="border border-blue-200 dark:border-blue-700 rounded bg-white dark:bg-gray-800 p-2 flex justify-between items-center">
                                    <span className="text-[10pt] text-gray-500 dark:text-gray-400">Nontunai</span>
                                    <span className="text-blue-600 dark:text-blue-400 font-medium text-[10pt]">{formatCurrency(saldoNonTunai)}</span>
                                </div>
                                <div className="border border-blue-200 dark:border-blue-700 rounded bg-white dark:bg-gray-800 p-2 flex justify-between items-center">
                                    <span className="text-[10pt] text-gray-500 dark:text-gray-400">Tunai</span>
                                    <span className="text-blue-600 dark:text-blue-400 font-medium text-[10pt]">{formatCurrency(saldoTunai)}</span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-gray-800 border border-blue-200 dark:border-blue-700/50 rounded-lg p-6">
                            <h3 className="text-blue-600 dark:text-blue-400 font-medium mb-6 uppercase text-[10pt]">Anggaran Dibelanjakan Sampai Bulan Ini</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div>
                                    <div className="flex items-center gap-1 mb-2">
                                        <span className="text-[10pt] text-gray-600 dark:text-gray-400 font-medium">Bisa Dibelanjakan</span>
                                        {/* Icon */}
                                    </div>
                                    <div className="bg-blue-50/50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded px-3 py-2 text-blue-600 dark:text-blue-400 font-bold text-[10pt]">
                                        {formatCurrency(Math.max(0, anggaranBulanIni - realSpendingThisMonth))}
                                    </div>
                                </div>
                                <div>
                                    <div className="flex items-center gap-1 mb-2">
                                        <span className="text-[10pt] text-gray-600 dark:text-gray-400 font-medium">Sudah Dibelanjakan</span>
                                        {/* Icon */}
                                    </div>
                                    <div className="bg-blue-50/50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded px-3 py-2 text-blue-600 dark:text-blue-400 font-bold text-[10pt]">
                                        {formatCurrency(totalDibelanjakanSampaiBulanIni)}
                                    </div>
                                </div>
                                <div>
                                    <div className="flex items-center gap-1 mb-2">
                                        <span className="text-[10pt] text-gray-600 dark:text-gray-400 font-medium">Bisa Dianggarkan Ulang</span>
                                        {/* Icon */}
                                    </div>
                                    <div className="bg-blue-50/50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded px-3 py-2 text-blue-600 dark:text-blue-400 font-bold text-[10pt]">
                                        {formatCurrency(anggaranBelumDibelanjakan)}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Table Section */}
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <div className="overflow-x-auto overflow-y-auto max-h-[60vh] pb-32">
                        <table className="w-full text-[10pt] text-left">
                            <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 font-semibold uppercase text-[10pt] sticky top-0 z-10">
                                <tr>
                                    <th className="px-6 py-4">ID</th>
                                    <th className="px-6 py-4">Tanggal</th>
                                    <th className="px-6 py-4">Kegiatan</th>
                                    <th className="px-6 py-4">Rekening Belanja</th>
                                    <th className="px-6 py-4">Jenis Transaksi</th>
                                    <th className="px-6 py-4">Anggaran</th>
                                    <th className="px-6 py-4">Dibelanjakan</th>
                                    <th className="px-6 py-4">Pajak Wajib Lapor</th>
                                    <th className="px-6 py-4">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {filteredTransactions && filteredTransactions.length > 0 ? (
                                    filteredTransactions.map((item: any, index: number) => {
                                        if (item.type === 'penerimaan') {
                                            return (
                                                <tr key={`penerimaan-${item.id}`} className="bg-blue-50/50 dark:bg-blue-900/10">
                                                    <td colSpan={8} className="px-6 py-4">
                                                        <div className="flex items-center text-gray-700 dark:text-gray-300">
                                                            <svg className="w-5 h-5 mr-3 text-gray-400 rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                                            </svg>
                                                            <span>
                                                                Anda telah mencatatkan <span className="font-bold">penerimaan dana {formatCurrency(item.jumlah_dana)}</span> pada {format(new Date(item.tanggal_terima), 'd MMM yyyy')}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <Dropdown>
                                                            <Dropdown.Trigger>
                                                                <button className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700/50">
                                                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                                                        <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                                                                    </svg>
                                                                </button>
                                                            </Dropdown.Trigger>
                                                            <Dropdown.Content align="right" width="48" contentClasses="py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                                                                <button
                                                                    className="w-full text-left px-4 py-2 text-[10pt] text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center"
                                                                    onClick={() => handleDeleteClick(item.id, 'penerimaan')}
                                                                >
                                                                    <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                                    </svg>
                                                                    Hapus
                                                                </button>
                                                            </Dropdown.Content>
                                                        </Dropdown>
                                                    </td>
                                                </tr>
                                            );
                                        } else if (item.type === 'penarikan') {
                                            return (
                                                <tr key={`penarikan-${item.id}`} className="bg-blue-50/50 dark:bg-blue-900/10 hover:bg-blue-100/50 dark:hover:bg-blue-900/20 transition-colors">
                                                    <td colSpan={8} className="px-6 py-4">
                                                        <div className="flex items-center text-gray-700 dark:text-gray-300">
                                                            <svg className="w-5 h-5 mr-3 text-gray-400 rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                                            </svg>
                                                            <span>
                                                                Anda telah melakukan <span className="font-bold">tarik tunai {formatCurrency(item.jumlah_penarikan)}</span> pada {format(new Date(item.tanggal_penarikan), 'd MMM yyyy')}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <Dropdown>
                                                            <Dropdown.Trigger>
                                                                <button className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700/50">
                                                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                                                        <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                                                                    </svg>
                                                                </button>
                                                            </Dropdown.Trigger>
                                                            <Dropdown.Content align="right" width="48" contentClasses="py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                                                                <button
                                                                    className="w-full text-left px-4 py-2 text-[10pt] text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center"
                                                                    onClick={() => handleDeleteClick(item.id, 'penarikan')}
                                                                >
                                                                    <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                                    </svg>
                                                                    Hapus
                                                                </button>
                                                            </Dropdown.Content>
                                                        </Dropdown>
                                                    </td>
                                                </tr>
                                            );
                                        } else if (item.type === 'setor') {
                                            return (
                                                <tr key={`setor-${item.id}`} className="bg-green-50/50 dark:bg-green-900/10 hover:bg-green-100/50 dark:hover:bg-green-900/20 transition-colors">
                                                    <td colSpan={8} className="px-6 py-4">
                                                        <div className="flex items-center text-gray-700 dark:text-gray-300">
                                                            <svg className="w-5 h-5 mr-3 text-gray-400 -rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                                            </svg>
                                                            <span>
                                                                Anda telah melakukan <span className="font-bold">setor tunai {formatCurrency(item.jumlah_setor)}</span> pada {format(new Date(item.tanggal_setor), 'd MMM yyyy')}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <Dropdown>
                                                            <Dropdown.Trigger>
                                                                <button className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700/50">
                                                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                                                        <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                                                                    </svg>
                                                                </button>
                                                            </Dropdown.Trigger>
                                                            <Dropdown.Content align="right" width="48" contentClasses="py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                                                                <button
                                                                    className="w-full text-left px-4 py-2 text-[10pt] text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center"
                                                                    onClick={() => handleDeleteClick(item.id, 'setor')}
                                                                >
                                                                    <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                                    </svg>
                                                                    Hapus
                                                                </button>
                                                            </Dropdown.Content>
                                                        </Dropdown>
                                                    </td>
                                                </tr>
                                            );
                                        } else {
                                            return (
                                                <tr key={`bku-${item.id}`} className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700">
                                                    <td className="px-6 py-4">{item.id_transaksi || '-'}</td>
                                                    <td className="px-6 py-4">{format(new Date(item.tanggal_transaksi), 'dd/MM/yyyy')}</td>
                                                    <td className="px-6 py-4">{item.kode_kegiatan?.sub_program || '-'}</td>
                                                    <td className="px-6 py-4">{item.uraian_opsional || item.uraian || '-'}</td>
                                                    <td className="px-6 py-4 capitalize">{item.jenis_transaksi}</td>
                                                    <td className="px-6 py-4 text-green-600">
                                                        {formatCurrency(item.total_transaksi_kotor)}
                                                    </td>
                                                    <td className="px-6 py-4 text-green-600">
                                                        {formatCurrency(item.total_transaksi_kotor)}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        {item.total_pajak > 0 ? (
                                                            <span className={`px-2 py-1 text-[10pt] rounded ${item.ntpn ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                                {formatCurrency(item.total_pajak)}
                                                            </span>
                                                        ) : '0'}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <Dropdown>
                                                            <Dropdown.Trigger>
                                                                <button className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700/50">
                                                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                                                        <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                                                                    </svg>
                                                                </button>
                                                            </Dropdown.Trigger>
                                                            <Dropdown.Content align="right" width="48" contentClasses="py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">

                                                                {item.total_pajak > 0 && (
                                                                    <button
                                                                        className="w-full text-left px-4 py-2 text-[10pt] text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 flex items-center"
                                                                        onClick={() => openLaporPajakModal(item.id, item)}
                                                                    >
                                                                        <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                                        </svg>
                                                                        Lapor Pajak
                                                                    </button>
                                                                )}
                                                                {!is_closed && (
                                                                    <button
                                                                        className="w-full text-left px-4 py-2 text-[10pt] text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center"
                                                                        onClick={() => handleDeleteClick(item.id, 'bku')}
                                                                    >
                                                                        <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                                        </svg>
                                                                        Hapus
                                                                    </button>
                                                                )}
                                                                <button
                                                                    className="w-full text-left px-4 py-2 text-[10pt] text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-900/20 flex items-center"
                                                                    onClick={() => openDetailModal(item)}
                                                                >
                                                                    <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                                    </svg>
                                                                    Detail
                                                                </button>
                                                            </Dropdown.Content>
                                                        </Dropdown>
                                                    </td>
                                                </tr>
                                            );
                                        }
                                    })
                                ) : (
                                    <tr className="bg-white dark:bg-gray-800">
                                        <td colSpan={9} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                                            <div className="flex flex-col items-center justify-center p-8 bg-dashed border-2 border-gray-200 dark:border-gray-700 rounded-lg mx-auto max-w-lg border-dashed">
                                                <p className="mt-2">Belum ada transaksi</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>


            </div>

            {/* Modal Tambah Pembelanjaan */}
            <Modal show={isModalOpen} onClose={closeModal} maxWidth="4xl">
                {/* ... existing modal content ... */}
                <div className="p-4">
                    <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                        Isi Detail Pembelanjaan
                    </h2>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 mb-6">
                        Isi detail barang atau jasa yang Anda belanjakan yang terdapat dalam 1 nota.
                    </p>

                    {/* Stepper Header */}
                    <div className="flex items-center justify-between mb-4 relative">
                        {/* ... */}
                        <div className="absolute top-1/2 left-0 w-full h-0.5 bg-gray-200 dark:bg-gray-700 -z-10" />
                        {steps.map((step) => (
                            <div key={step.number} className="flex flex-row items-center gap-2 bg-white dark:bg-gray-800 px-2 group">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-colors
                                    ${currentStep >= step.number
                                        ? 'bg-blue-900 text-white border-blue-900'
                                        : 'bg-white text-gray-400 border-gray-300 dark:bg-gray-700 dark:border-gray-600'
                                    }`}
                                >
                                    {currentStep > step.number ? (
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                    ) : step.number}
                                </div>
                                <span className={`text-sm font-medium ${currentStep >= step.number ? 'text-blue-900 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'}`}>
                                    {step.title}
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* Dynamic Form Content */}
                    <div className="mt-4 max-h-[60vh] overflow-y-auto pr-2">
                        {currentStep === 1 && renderStep1()}
                        {currentStep === 2 && renderStep2()}
                        {currentStep === 3 && renderStep3()}
                    </div>

                    {/* Footer Actions */}
                    <div className="mt-8 flex justify-end gap-3 pt-6 border-t border-gray-100 dark:border-gray-700">
                        {currentStep === 1 ? (
                            <SecondaryButton onClick={closeModal}>Batal</SecondaryButton>
                        ) : (
                            <SecondaryButton onClick={prevStep}>Kembali</SecondaryButton>
                        )}

                        {currentStep < 3 ? (
                            <PrimaryButton
                                onClick={nextStep}
                                disabled={currentStep === 2 && (hasVolumeError || data.items.length === 0)}
                                className={(currentStep === 2 && (hasVolumeError || data.items.length === 0)) ? 'opacity-50 cursor-not-allowed' : ''}
                            >
                                Lanjut
                            </PrimaryButton>
                        ) : (
                            <PrimaryButton
                                className={`bg-blue-900 hover:bg-blue-800 ${processing ? 'opacity-75 cursor-wait' : ''}`}
                                onClick={submitBku}
                                disabled={processing}
                            >
                                {processing ? 'Menyimpan...' : 'Simpan'}
                            </PrimaryButton>
                        )}
                    </div>
                </div>
            </Modal>

            {/* Modal Tarik Tunai */}
            <Modal show={isTarikTunaiOpen} onClose={() => setIsTarikTunaiOpen(false)} maxWidth="2xl">
                <div className="relative bg-white dark:bg-gray-800 rounded-lg">
                    {/* Unique Header Background */}
                    <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 rounded-t-lg">
                        <h2 className="text-xl font-bold text-white">
                            Penarikan Tunai
                        </h2>
                        <p className="text-blue-100 text-[10pt] mt-1">
                            Isi sesuai dengan detail yang tertera di slip dari bank
                        </p>
                    </div>

                    <div className="p-6">
                        <form onSubmit={submitTarikTunai}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <InputLabel value="Tanggal Tarik Tunai" className="mb-2 !text-[10pt]" />
                                    <div className="relative">
                                        <DatePicker
                                            value={tarikForm.data.tanggal_penarikan}
                                            onChange={(date) => tarikForm.setData('tanggal_penarikan', date ? format(date, 'yyyy-MM-dd') : '')}
                                            className="mt-1 block w-full text-gray-900 !text-[10pt]"
                                            placeholder="Pilih tanggal"
                                            startMonth={startOfActiveMonth}
                                            endMonth={endOfActiveMonth}
                                            disabled={disabledWithdrawalDates}
                                        />
                                        <InputError message={tarikForm.errors.tanggal_penarikan} className="mt-2" />
                                    </div>
                                </div>

                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <InputLabel value="Jumlah Penarikan" className="!text-[10pt]" />
                                        <span className="text-[10pt] font-bold text-blue-600">Saldo Non Tunai: {formatCurrency(saldoNonTunai)}</span>
                                    </div>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <span className="text-gray-500 font-medium !text-[10pt]">Rp</span>
                                        </div>
                                        <TextInput
                                            className="pl-10 block w-full text-gray-900 !text-[10pt]"
                                            value={tarikForm.data.jumlah_penarikan}
                                            onChange={(e) => handleCurrencyChange(e, tarikForm, 'jumlah_penarikan')}
                                            placeholder="0"
                                        />
                                        <InputError message={tarikForm.errors.jumlah_penarikan} className="mt-2" />
                                    </div>
                                    <p className="text-[10pt] text-gray-500 mt-1">Maksimal: {formatCurrency(saldoNonTunai)}</p>
                                </div>
                            </div>

                            <div className="mt-8 flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
                                <SecondaryButton onClick={() => setIsTarikTunaiOpen(false)} type="button">
                                    Tutup
                                </SecondaryButton>
                                <PrimaryButton className="bg-blue-600 hover:bg-blue-700" disabled={tarikForm.processing}>
                                    {tarikForm.processing ? 'Menyimpan...' : 'Simpan'}
                                </PrimaryButton>
                            </div>
                        </form >
                    </div >
                </div >
            </Modal >

            {/* Modal Setor Tunai */}
            < Modal show={isSetorTunaiOpen} onClose={() => setIsSetorTunaiOpen(false)
            } maxWidth="2xl" >
                <div className="relative bg-white dark:bg-gray-800 rounded-lg">
                    {/* Unique Header Background */}
                    <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-6 rounded-t-lg">
                        <h2 className="text-xl font-bold text-white">
                            Setor Tunai
                        </h2>
                        <p className="text-blue-100 text-[10pt] mt-1">
                            Isi sesuai dengan detail setor tunai ke bank
                        </p>
                    </div>

                    <div className="p-6">
                        <form onSubmit={submitSetorTunai}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <InputLabel value="Tanggal Setor Tunai" className="mb-2 !text-[10pt]" />
                                    <div className="relative">
                                        <DatePicker
                                            value={setorForm.data.tanggal_setor}
                                            onChange={(date) => setorForm.setData('tanggal_setor', date ? format(date, 'yyyy-MM-dd') : '')}
                                            className="mt-1 block w-full text-gray-900 !text-[10pt]"
                                            placeholder="Pilih tanggal"
                                            startMonth={startOfActiveMonth}
                                            endMonth={endOfActiveMonth}
                                            disabled={disabledDepositDates}
                                        />
                                        <InputError message={setorForm.errors.tanggal_setor} className="mt-2" />
                                    </div>
                                </div>

                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <InputLabel value="Jumlah Setor" className="!text-[10pt]" />
                                        <span className="text-[10pt] font-bold text-blue-600">Saldo Tunai: {formatCurrency(saldoTunai)}</span>
                                    </div>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <span className="text-gray-500 font-medium">Rp</span>
                                        </div>
                                        <TextInput
                                            className="pl-10 block w-full text-gray-900 !text-[10pt]"
                                            value={setorForm.data.jumlah_setor}
                                            onChange={(e) => handleCurrencyChange(e, setorForm, 'jumlah_setor')}
                                            placeholder="0"
                                        />
                                        <InputError message={setorForm.errors.jumlah_setor} className="mt-2" />
                                    </div>
                                    <p className="text-[10pt] text-gray-500 mt-1">Maksimal: {formatCurrency(saldoTunai)}</p>
                                </div>
                            </div>

                            <div className="mt-8 flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
                                <SecondaryButton onClick={() => setIsSetorTunaiOpen(false)} type="button">
                                    Tutup
                                </SecondaryButton>
                                <PrimaryButton className="bg-blue-600 hover:bg-blue-700" disabled={setorForm.processing}>
                                    {setorForm.processing ? 'Menyimpan...' : 'Simpan'}
                                </PrimaryButton>
                            </div>
                        </form>
                    </div>
                </div>
            </Modal >

            {/* Delete Confirmation Modal */}
            < Modal show={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} maxWidth="sm" >
                <div className="p-6">
                    <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 dark:bg-red-900/30 rounded-full mb-4">
                        <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-medium text-center text-gray-900 dark:text-gray-100 mb-2">
                        Konfirmasi Hapus
                    </h3>
                    <p className="text-[10pt] text-center text-gray-500 dark:text-gray-400 mb-6">
                        Apakah Anda yakin ingin menghapus data ini? Tindakan ini tidak dapat dibatalkan.
                    </p>
                    <div className="flex justify-end gap-3">
                        <SecondaryButton onClick={() => setIsDeleteModalOpen(false)} disabled={isDeleting}>
                            Batal
                        </SecondaryButton>
                        <DangerButton onClick={confirmDelete} disabled={isDeleting}>
                            {isDeleting ? 'Menghapus...' : 'Hapus'}
                        </DangerButton>
                    </div>
                </div>
            </Modal >

            {/* Modal Konfirmasi Hapus Semua BKU */}
            <Modal show={isDeleteAllBkuModalOpen} onClose={() => setIsDeleteAllBkuModalOpen(false)} maxWidth="sm">
                <div className="p-6">
                    <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 dark:bg-red-900/30 rounded-full mb-4">
                        <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-medium text-center text-gray-900 dark:text-gray-100 mb-2">
                        Hapus Semua Belanja BKU?
                    </h3>
                    <p className="text-[10pt] text-center text-gray-500 dark:text-gray-400 mb-6">
                        Tindakan ini akan menghapus <strong>semua data belanja</strong> pada bulan <strong>{bulan}</strong>. Data Penarikan Tunai, Setor Tunai, dan Penerimaan Dana <strong>tidak akan terhapus</strong>.
                    </p>
                    <div className="flex justify-end gap-3">
                        <SecondaryButton onClick={() => setIsDeleteAllBkuModalOpen(false)} disabled={isDeletingAll}>
                            Batal
                        </SecondaryButton>
                        <DangerButton onClick={confirmDeleteAllBku} disabled={isDeletingAll}>
                            {isDeletingAll ? 'Menghapus...' : 'Hapus Semua'}
                        </DangerButton>
                    </div>
                </div>
            </Modal>



            {/* Modal Tutup BKU */}
            < Modal show={isTutupBkuOpen} onClose={() => setIsTutupBkuOpen(false)} maxWidth="lg" >
                <div className="bg-white dark:bg-gray-800 rounded-lg">
                    <div className="p-6">
                        <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                            Konfirmasi Tutup BKU
                        </h2>

                        <div className="mb-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                            <div className="flex">
                                <div className="flex-shrink-0">
                                    <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                    </svg>
                                </div>
                                <div className="ml-3">
                                    <h3 className="text-[10pt] font-medium text-yellow-800 dark:text-yellow-300">
                                        Perhatian
                                    </h3>
                                    <div className="mt-2 text-[10pt] text-yellow-700 dark:text-yellow-400">
                                        <p>
                                            Dengan menutup BKU, Anda tidak dapat lagi menambah atau mengubah transaksi pada bulan <strong>{bulan}</strong>. Pastikan semua data sudah benar.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <form onSubmit={submitTutupBku}>
                            <div className="space-y-4">
                                <div>
                                    <InputLabel value="Tanggal Tutup BKU" className="!text-[10pt]" />
                                    <div className="relative">
                                        <DatePicker
                                            value={tutupForm.data.tanggal_tutup}
                                            onChange={(date) => tutupForm.setData('tanggal_tutup', date ? format(date, 'yyyy-MM-dd') : '')}
                                            className="mt-1 block w-full text-gray-900 !text-[10pt]"
                                            placeholder="Pilih tanggal tutup"
                                            startMonth={startOfActiveMonth}
                                            endMonth={endOfActiveMonth}
                                            disabled={[
                                                { before: startOfActiveMonth },
                                                { after: endOfActiveMonth }
                                            ]}
                                        />
                                    </div>
                                    <InputError message={tutupForm.errors.tanggal_tutup} className="mt-2" />
                                </div>
                                <div>
                                    <InputLabel value="Jasa Giro / Bunga Bank" className="!text-[10pt]" />
                                    <div className="relative mt-1">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <span className="text-gray-500 text-[10pt]">Rp</span>
                                        </div>
                                        <TextInput
                                            className="pl-7 block w-full text-gray-900 !text-[10pt]"
                                            value={tutupForm.data.bunga_bank}
                                            onChange={(e) => handleCurrencyChange(e, tutupForm, 'bunga_bank')}
                                            placeholder="0"
                                        />
                                    </div>
                                    <InputError message={tutupForm.errors.bunga_bank} className="mt-2" />
                                </div>

                                <div>
                                    <InputLabel value="Pajak Bunga Bank" className="!text-[10pt]" />
                                    <div className="relative mt-1">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <span className="text-gray-500 text-[10pt]">Rp</span>
                                        </div>
                                        <TextInput
                                            className="pl-7 block w-full text-gray-900 !text-[10pt]"
                                            value={tutupForm.data.pajak_bunga}
                                            onChange={(e) => handleCurrencyChange(e, tutupForm, 'pajak_bunga')}
                                            placeholder="0"
                                        />
                                    </div>
                                    <InputError message={tutupForm.errors.pajak_bunga} className="mt-2" />
                                </div>
                            </div>

                            <div className="mt-6 flex justify-end gap-3">
                                <SecondaryButton onClick={() => setIsTutupBkuOpen(false)} type="button">
                                    Batal
                                </SecondaryButton>
                                <PrimaryButton className="bg-red-600 hover:bg-red-700" disabled={tutupForm.processing}>
                                    {tutupForm.processing ? 'Memproses...' : 'Tutup BKU'}
                                </PrimaryButton>
                            </div>
                        </form>
                    </div>
                </div>
            </Modal >

            {/* Modal Reopen BKU */}
            < Modal show={isReopenModalOpen} onClose={() => setIsReopenModalOpen(false)} maxWidth="sm" >
                <div className="p-6">
                    <div className="flex items-center justify-center w-12 h-12 mx-auto bg-green-100 dark:bg-green-900/30 rounded-full mb-4">
                        <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-medium text-center text-gray-900 dark:text-gray-100 mb-2">
                        Aktifkan Kembali BKU
                    </h3>
                    <p className="text-[10pt] text-center text-gray-500 dark:text-gray-400 mb-6">
                        Apakah Anda yakin ingin mengaktifkan kembali BKU bulan <strong>{bulan}</strong>? <br className="hidden sm:block" />
                        Transaksi penutupan (bunga bank/pajak) akan dihapus dan Anda dapat mengedit kembali pembelanjaan.
                    </p>
                    <div className="flex justify-end gap-3">
                        <SecondaryButton onClick={() => setIsReopenModalOpen(false)} disabled={isReopening}>
                            Batal
                        </SecondaryButton>
                        <PrimaryButton className="bg-green-600 hover:bg-green-700 disabled:opacity-75 disabled:cursor-not-allowed" onClick={confirmReopen} disabled={isReopening}>
                            {isReopening ? (
                                <>
                                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Memproses...
                                </>
                            ) : (
                                'Aktifkan Kembali'
                            )}
                        </PrimaryButton>
                    </div>
                </div>
            </Modal >


            {/* Validation Modal for Deleting Penerimaan Dana */}
            < Modal show={isValidationModalOpen} onClose={() => setIsValidationModalOpen(false)} maxWidth="sm" >
                <div className="p-6">
                    <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 dark:bg-red-900/30 rounded-full mb-4">
                        <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-medium text-center text-gray-900 dark:text-gray-100 mb-2">
                        Tidak Dapat Menghapus
                    </h3>
                    <p className="text-[10pt] text-center text-gray-500 dark:text-gray-400 mb-6">
                        Anda tidak dapat menghapus Penerimaan Dana karena terdapat transaksi <strong>Penarikan Tunai</strong>. Silahkan hapus transaksi penarikan tunai terlebih dahulu.
                    </p>
                    <div className="flex justify-center">
                        <SecondaryButton onClick={() => setIsValidationModalOpen(false)}>
                            Tutup
                        </SecondaryButton>
                    </div>
                </div>
            </Modal >
            {/* Modal Lapor Pajak */}
            <Modal show={isLaporPajakOpen} onClose={() => setIsLaporPajakOpen(false)} maxWidth="md">
                <div className="p-6">
                    <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Lapor Pajak</h2>
                    <form onSubmit={submitLaporPajak}>
                        <div className="space-y-4">
                            <div>
                                <InputLabel value="Tanggal Lapor" className="!text-[10pt]" />
                                <div className="relative">
                                    <DatePicker
                                        value={data.tanggal_lapor}
                                        onChange={(date) => setData('tanggal_lapor', date ? format(date, 'yyyy-MM-dd') : '')}
                                        className="mt-1 block w-full text-gray-900 !text-[10pt]"
                                        placeholder="Pilih tanggal"
                                        startMonth={startOfActiveMonth}
                                        endMonth={endOfActiveMonth}
                                        disabled={[
                                            { before: startOfActiveMonth },
                                            { after: endOfActiveMonth }
                                        ]}
                                    />
                                </div>
                            </div>
                            <div>
                                <InputLabel value="Kode Masa Pajak" className="!text-[10pt]" />
                                <TextInput
                                    className="mt-1 block w-full text-gray-900 !text-[10pt]"
                                    value={data.kode_masa_pajak}
                                    onChange={(e) => setData('kode_masa_pajak', e.target.value)}
                                    required
                                    placeholder="Contoh: 122023"
                                />
                            </div>
                            <div>
                                <InputLabel value="NTPN" className="!text-[10pt]" />
                                <TextInput
                                    className="mt-1 block w-full text-gray-900 !text-[10pt]"
                                    value={data.ntpn}
                                    onChange={(e) => setData('ntpn', e.target.value.toUpperCase().slice(0, 16))}
                                    required
                                    maxLength={16}
                                    placeholder="Nomor Transaksi Penerimaan Negara"
                                />
                            </div>
                        </div>

                        <div className="mt-6 flex justify-end gap-3">
                            <SecondaryButton onClick={() => setIsLaporPajakOpen(false)}>Batal</SecondaryButton>
                            <PrimaryButton disabled={isReportingTax} className="bg-blue-600">
                                {isReportingTax ? 'Menyimpan...' : 'Simpan'}
                            </PrimaryButton>
                        </div>
                    </form>
                </div>
            </Modal>
            {/* Modal Detail Pembelanjaan */}
            <Modal show={isDetailModalOpen} onClose={() => setIsDetailModalOpen(false)} maxWidth="4xl">
                {selectedDetailItem && (
                    <div className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden">
                        {/* Header */}
                        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 flex justify-between items-center">
                            <h2 className="text-lg font-bold text-white">Detail Pembelanjaan</h2>
                            <button onClick={() => setIsDetailModalOpen(false)} className="text-white hover:bg-white/20 rounded-full p-1 transition-colors">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="p-4 max-h-[70vh] overflow-y-auto">
                            {/* Top Details */}
                            <div className="grid grid-cols-1 gap-4 mb-6">
                                <div className="space-y-3">
                                    <div className="flex justify-between border-b border-gray-100 dark:border-gray-700 pb-1">
                                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">Tanggal Transaksi</p>
                                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                            {format(new Date(selectedDetailItem.tanggal_transaksi), 'd MMM yyyy')}
                                        </p>
                                    </div>
                                    <div className="flex justify-between border-b border-gray-100 dark:border-gray-700 pb-1">
                                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">ID Transaksi</p>
                                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{selectedDetailItem.id_transaksi || '-'}</p>
                                    </div>
                                    <div className="flex justify-between border-b border-gray-100 dark:border-gray-700 pb-1">
                                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">Nama Penyedia / Penerima</p>
                                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{selectedDetailItem.nama_toko || selectedDetailItem.nama_penerima_pembayaran || '-'}</p>
                                    </div>
                                    <div className="flex justify-between border-b border-gray-100 dark:border-gray-700 pb-1">
                                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">NPWP</p>
                                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{selectedDetailItem.npwp || '-'}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Cards: Kegiatan & Rekening */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-5">
                                    <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-3 border-b border-gray-100 dark:border-gray-700 pb-2">
                                        Kegiatan
                                    </h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                                        {selectedDetailItem.kode_kegiatan ? (
                                            `${selectedDetailItem.kode_kegiatan.kode} - ${selectedDetailItem.kode_kegiatan.uraian}`
                                        ) : '-'}
                                    </p>
                                </div>
                                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-5">
                                    <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-3 border-b border-gray-100 dark:border-gray-700 pb-2">
                                        Rekening Belanja
                                    </h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                                        {selectedDetailItem.rekening_belanja ? (
                                            `${selectedDetailItem.rekening_belanja.kode_rekening} - ${selectedDetailItem.rekening_belanja.rincian_objek}`
                                        ) : '-'}
                                    </p>
                                </div>
                            </div>

                            {/* Table Details */}
                            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Detail Uraian Pembelanjaan</h3>
                            <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden mb-6">
                                <table className="w-full text-sm text-left">
                                    <thead className="text-xs text-gray-500 dark:text-gray-400 uppercase bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                                        <tr>
                                            <th className="px-6 py-3 font-medium">Uraian</th>
                                            <th className="px-6 py-3 font-medium text-center">Volume</th>
                                            <th className="px-6 py-3 font-medium text-right">Harga Satuan</th>
                                            <th className="px-6 py-3 font-medium text-right">Subtotal</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                        {selectedDetailItem.uraian_details && selectedDetailItem.uraian_details.length > 0 ? (
                                            selectedDetailItem.uraian_details.map((detail: any, index: number) => (
                                                <tr key={index} className="bg-white dark:bg-gray-800">
                                                    <td className="px-6 py-4 text-gray-900 dark:text-gray-100">{detail.uraian}</td>
                                                    <td className="px-6 py-4 text-center text-gray-600 dark:text-gray-400">{detail.volume} {detail.satuan}</td>
                                                    <td className="px-6 py-4 text-right text-gray-600 dark:text-gray-400">{formatCurrency(detail.harga_satuan)}</td>
                                                    <td className="px-6 py-4 text-right text-gray-900 dark:text-gray-100 font-medium">{formatCurrency(detail.volume * detail.harga_satuan)}</td>
                                                </tr>
                                            ))
                                        ) : (
                                            /* If no details, show the main item info as a single row fallback */
                                            <tr className="bg-white dark:bg-gray-800">
                                                <td className="px-6 py-4 text-gray-900 dark:text-gray-100">{selectedDetailItem.uraian}</td>
                                                <td className="px-6 py-4 text-center text-gray-600 dark:text-gray-400">-</td>
                                                <td className="px-6 py-4 text-right text-gray-600 dark:text-gray-400">-</td>
                                                <td className="px-6 py-4 text-right text-gray-900 dark:text-gray-100 font-medium">{formatCurrency(selectedDetailItem.total_transaksi_kotor)}</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Summary Footer */}
                            <div className="flex flex-col items-end gap-2 border-t border-gray-200 dark:border-gray-700 pt-4">
                                <div className="flex justify-between w-full md:w-1/3">
                                    <span className="text-gray-500 dark:text-gray-400 uppercase text-xs font-bold tracking-wider">Total Transaksi Kotor:</span>
                                    <span className="text-gray-900 dark:text-gray-100 font-bold">{formatCurrency(selectedDetailItem.total_transaksi_kotor)}</span>
                                </div>
                                <div className="flex justify-between w-full md:w-1/3">
                                    <span className="text-gray-500 dark:text-gray-400 uppercase text-xs font-bold tracking-wider">Total Harga Bersih:</span>
                                    {/* Assuming Harga Bersih is Kotor - Pajak */}
                                    <span className="text-gray-900 dark:text-gray-100 font-bold">{formatCurrency(selectedDetailItem.total_transaksi_kotor - selectedDetailItem.total_pajak)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </Modal>
        </AuthenticatedLayout >
    );
}
