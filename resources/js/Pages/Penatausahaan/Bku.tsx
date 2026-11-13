import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, useForm, router } from '@inertiajs/react';
import useVariantRoute from '@/Hooks/useVariantRoute';
import { useState, useEffect, useMemo, useRef } from 'react';
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
import ArkasDiagnosticModal from '@/Components/Ai/ArkasDiagnosticModal';
import { Brain, ArrowDownToLine, ArrowUpFromLine } from 'lucide-react';
import PageHeader from '@/Components/ui/PageHeader';
import DataTable from '@/Components/ui/DataTable';
import IconTile from '@/Components/ui/IconTile';
import StatusBadge from '@/Components/ui/StatusBadge';
import EmptyState from '@/Components/ui/EmptyState';
import KasBankTransferModal from './Partials/KasBankTransferModal';

/**
 * Helper: Parse string tanggal dari server (format YYYY-MM-DD atau ISO UTC)
 * sebagai local midnight — mencegah timezone offset WIB (UTC+7).
 *
 * Masalah: new Date('2026-05-01T00:00:00.000000Z') di WIB = 2026-04-30T17:00:00+07:00
 * Solusi:  parseLocalDate('2026-05-01T00:00:00.000000Z') = new Date(2026, 4, 1) = 2026-05-01 lokal
 */
function parseLocalDate(dateStr: string): Date {
    const part = dateStr.split(/[T ]/)[0]; // Ambil bagian 'YYYY-MM-DD'
    const [y, m, d] = part.split('-').map(Number);
    return new Date(y, m - 1, d); // Local midnight — tidak ada timezone shift
}

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
    variant?: string;
    routePrefix?: string;
    penganggaranFk?: string;
    allUsedNotes: any[];
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
    auth,
    allUsedNotes,
    penganggaranFk = 'penganggaran_id'
}: BkuProps) {
    const vroute = useVariantRoute();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [editingBkuId, setEditingBkuId] = useState<number | null>(null);

    const [isTarikTunaiOpen, setIsTarikTunaiOpen] = useState(false);
    const [isSetorTunaiOpen, setIsSetorTunaiOpen] = useState(false);
    const [isTutupBkuOpen, setIsTutupBkuOpen] = useState(false);
    const [isLaporPajakOpen, setIsLaporPajakOpen] = useState(false);
    const [selectedBkuIdForPajak, setSelectedBkuIdForPajak] = useState<number | null>(null);
    const [isReportingTax, setIsReportingTax] = useState(false);
    const [alamatTokoError, setAlamatTokoError] = useState('');
    const [tanggalTransaksiError, setTanggalTransaksiError] = useState('');
    const [jenisTransaksiError, setJenisTransaksiError] = useState('');
    const [npwpError, setNpwpError] = useState('');

    // Search State
    const [isSearchVisible, setIsSearchVisible] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Form handling for BKU (Spending) - Defined early for dependency usage
    const { data, setData, post, put, processing, errors, reset, transform } = useForm({
        // Common
        [penganggaranFk]: penganggaran.id,
        bulan: bulan,

        // Step 1
        is_siplah: false,
        tanggal_transaksi: '',
        jenis_transaksi: '',
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

    // ARKAS BKU Monthly Pull State
    const [isArkasMonthlyModalOpen, setIsArkasMonthlyModalOpen] = useState(false);
    const [arkasMonthlyLoading, setArkasMonthlyLoading] = useState(false);
    const [arkasMonthlyData, setArkasMonthlyData] = useState<any>(null);
    const [isMonthlyOverwriteChecked, setIsMonthlyOverwriteChecked] = useState(false);
    const [pullingMonthlyBku, setPullingMonthlyBku] = useState(false);
    const [isArkasAiModalOpen, setIsArkasAiModalOpen] = useState(false);

    const handleOpenArkasMonthlyModal = async () => {
        setIsArkasMonthlyModalOpen(true);
        setArkasMonthlyLoading(true);
        setArkasMonthlyData(null);
        setIsMonthlyOverwriteChecked(false);

        try {
            const response = await axios.get(vroute('bku.check-arkas', {
                penganggaranId: penganggaran.id,
                bulan: bulan
            }));
            setArkasMonthlyData(response.data);
        } catch (error: any) {
            console.error("Error checking ARKAS BKU monthly:", error);
            setArkasMonthlyData({
                status: 'error',
                message: error.response?.data?.message || 'Gagal memeriksa database ARKAS.'
            });
        } finally {
            setArkasMonthlyLoading(false);
        }
    };

    const handleExecutePullArkasMonthly = () => {
        setPullingMonthlyBku(true);
        router.post(vroute('bku.pull-arkas', {
            penganggaranId: penganggaran.id,
            bulan: bulan
        }), {
            overwrite: isMonthlyOverwriteChecked
        }, {
            onSuccess: () => {
                setIsArkasMonthlyModalOpen(false);
                setPullingMonthlyBku(false);
            },
            onError: (err) => {
                console.error("Error pulling monthly BKU:", err);
                setPullingMonthlyBku(false);
            }
        });
    };

    const [isReopenModalOpen, setIsReopenModalOpen] = useState(false);
    const [isReopening, setIsReopening] = useState(false);
    const [currentStep, setCurrentStep] = useState(1);
    const [isNoteConfirmationOpen, setIsNoteConfirmationOpen] = useState(false);
    const [isDuplicateNoteModalOpen, setIsDuplicateNoteModalOpen] = useState(false);

    // Step 2 Local State
    const [selectedActivityId, setSelectedActivityId] = useState<string>('');
    const [selectedAccountId, setSelectedAccountId] = useState<string>('');
    const [detailUraian, setDetailUraian] = useState<string>(''); // For "Uraian Belanja (Opsional)"
    const [isGeneratingAiUraian, setIsGeneratingAiUraian] = useState<boolean>(false);
    const [aiUraianVariantIndex, setAiUraianVariantIndex] = useState<number>(0);
    const [isAiApiKeyModalOpen, setIsAiApiKeyModalOpen] = useState<boolean>(false);
    const [aiErrorMessage, setAiErrorMessage] = useState<string>('');

    // API State
    const [fetchedActivities, setFetchedActivities] = useState<any[]>([]);
    const [fetchedAccounts, setFetchedAccounts] = useState<any[]>([]);
    const [fetchedRkasItems, setFetchedRkasItems] = useState<any[]>([]);
    const [isLoadingActivities, setIsLoadingActivities] = useState(false);
    const [isLoadingItems, setIsLoadingItems] = useState(false);

    // Search Toko State
    const [tokoResults, setTokoResults] = useState<any[]>([]);
    const [showTokoDropdown, setShowTokoDropdown] = useState(false);
    const [isSearchingToko, setIsSearchingToko] = useState(false);
    const tokoSearchRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Search Penerima Pembayaran State
    const [penerimaResults, setPenerimaResults] = useState<any[]>([]);
    const [showPenerimaDropdown, setShowPenerimaDropdown] = useState(false);
    const [isSearchingPenerima, setIsSearchingPenerima] = useState(false);
    const penerimaSearchRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Tax Automation State
    const [statusPegawai, setStatusPegawai] = useState<'ASN' | 'Non-ASN' | ''>('');
    const [golonganASN, setGolonganASN] = useState<string>('');
    const [showTarifModal, setShowTarifModal] = useState(false);
    const [detectedTaxes, setDetectedTaxes] = useState<{
        is_ppn: boolean; is_pph21: boolean; is_pph22: boolean; is_pph23: boolean; is_pph4: boolean;
    }>({ is_ppn: false, is_pph21: false, is_pph22: false, is_pph23: false, is_pph4: false });


    // Tarif PPh 21 Non-PNS sesuai PP 58 Tahun 2023 & PMK 168 Tahun 2023
    const TARIF_PPH21_DENGAN_NPWP = [
        { min: 0, max: 5400000, rate: 0 },
        { min: 5400000, max: 5650000, rate: 0.25 },
        { min: 5650000, max: 5950000, rate: 0.5 },
        { min: 5950000, max: 6300000, rate: 0.75 },
        { min: 6300000, max: 6750000, rate: 1 },
        { min: 6750000, max: 7500000, rate: 1.25 },
        { min: 7500000, max: 8550000, rate: 1.5 },
        { min: 8550000, max: 9650000, rate: 1.75 },
        { min: 9650000, max: 10050000, rate: 2 },
        { min: 10050000, max: 10350000, rate: 2.25 },
        { min: 10350000, max: 10700000, rate: 2.5 },
        { min: 10700000, max: 11050000, rate: 3 },
        { min: 11050000, max: 11600000, rate: 3.5 },
        { min: 11600000, max: 12500000, rate: 4 },
        { min: 12500000, max: 13750000, rate: 5 },
        { min: 13750000, max: 15100000, rate: 6 },
    ];
    const TARIF_PPH21_TANPA_NPWP = [
        { min: 0, max: 5400000, rate: 0 },
        { min: 5400000, max: 5650000, rate: 0.5 },
        { min: 5650000, max: 5950000, rate: 1 },
        { min: 5950000, max: 6300000, rate: 1.5 },
        { min: 6300000, max: 6750000, rate: 2 },
        { min: 6750000, max: 7500000, rate: 2.5 },
        { min: 7500000, max: 8550000, rate: 3 },
        { min: 8550000, max: 9650000, rate: 3.5 },
        { min: 9650000, max: 10050000, rate: 4 },
        { min: 10050000, max: 10350000, rate: 4.5 },
        { min: 10350000, max: 10700000, rate: 5 },
        { min: 10700000, max: 11050000, rate: 6 },
        { min: 11050000, max: 11600000, rate: 7 },
        { min: 11600000, max: 12500000, rate: 8 },
        { min: 12500000, max: 13750000, rate: 10 },
        { min: 13750000, max: 15100000, rate: 12 },
    ];

    // Helper: Cari tarif PPh 21 Non-ASN berdasarkan total transaksi
    const getTarifPPh21NonASN = (totalTransaksi: number, hasNpwp: boolean) => {
        const tarif = hasNpwp ? TARIF_PPH21_DENGAN_NPWP : TARIF_PPH21_TANPA_NPWP;
        for (const t of tarif) {
            if (totalTransaksi >= t.min && totalTransaksi < t.max) return t.rate;
        }
        // Jika lebih dari batas maksimal, gunakan tarif tertinggi
        return tarif[tarif.length - 1].rate;
    };

    // Fetch Activities and Accounts on Modal Open
    useEffect(() => {
        if (isModalOpen && bulan && tahun) {
            setIsLoadingActivities(true);
            const params: any = { tahun, bulan };
            if (isEditMode && editingBkuId) {
                params.exclude_bku_id = editingBkuId;
            }
            axios.get(vroute('api.bku.kegiatan-rekening'), { params })
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
    }, [isModalOpen, bulan, tahun, isEditMode, editingBkuId]);

    // Fetch Uraian Items when Account selected
    useEffect(() => {
        if (selectedActivityId && selectedAccountId) {
            setIsLoadingItems(true);
            const params: any = { kegiatan_id: selectedActivityId };
            if (isEditMode && editingBkuId) {
                params.exclude_bku_id = editingBkuId;
            }
            axios.get(vroute('api.bku.uraian', { tahun, bulan, rekeningId: selectedAccountId }), {
                params: params
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
    }, [selectedActivityId, selectedAccountId, tahun, bulan, isEditMode, editingBkuId]);

    // When fetchedRkasItems updates during edit mode, sync sisa_volume_limit
    useEffect(() => {
        if (isEditMode && fetchedRkasItems.length > 0 && data.items.length > 0) {
            const updatedItems = data.items.map((item: any) => {
                const matchingRkas = fetchedRkasItems.find((r: any) => Number(r.id) === Number(item.rkas_id));
                if (matchingRkas) {
                    return {
                        ...item,
                        sisa_volume_limit: Number(matchingRkas.sisa_volume || 0)
                    };
                }
                return item;
            });
            const isDifferent = updatedItems.some((item, idx) => item.sisa_volume_limit !== data.items[idx]?.sisa_volume_limit);
            if (isDifferent) {
                setData('items', updatedItems);
            }
        }
    }, [fetchedRkasItems, isEditMode]);



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
                if (!newItems.some(i => Number(i.rkas_id) === Number(item.id))) {
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
            if (Number(item.rkas_id) === Number(rkasId)) {
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
            setStatusPegawai('');
            setGolonganASN('');
            setDetectedTaxes({ is_ppn: false, is_pph21: false, is_pph22: false, is_pph23: false, is_pph4: false });
        }
    }, [isModalOpen]);

    // Stable key dari items yang dipilih — hanya berubah saat item benar-benar ditambah/dihapus
    const itemsKey = useMemo(() => data.items.map((i: any) => `${i.rkas_id}`).sort().join(','), [data.items]);
    const totalTransaksi = useMemo(() => data.items.reduce((sum: number, item: any) => sum + (item.total || 0), 0), [data.items]);

    // Deteksi pajak yang berlaku (update badge) — ringan, hanya set detectedTaxes
    useEffect(() => {
        if (data.items.length === 0) {
            setDetectedTaxes({ is_ppn: false, is_pph21: false, is_pph22: false, is_pph23: false, is_pph4: false });
            return;
        }
        const selectedRekeningIds = [...new Set(data.items.map((i: any) => String(i.rekening_id)))];
        const selectedAccounts = fetchedAccounts.filter((acc: any) => selectedRekeningIds.includes(String(acc.id)));
        setDetectedTaxes({
            is_ppn: selectedAccounts.some((a: any) => a.is_ppn),
            is_pph21: selectedAccounts.some((a: any) => a.is_pph21),
            is_pph22: selectedAccounts.some((a: any) => a.is_pph22),
            is_pph23: selectedAccounts.some((a: any) => a.is_pph23),
            is_pph4: selectedAccounts.some((a: any) => a.is_pph4),
        });
    }, [itemsKey, fetchedAccounts]);

    // Auto-set pajak pada form — Berjalan saat items atau totalTransaksi berubah
    useEffect(() => {
        if (data.items.length === 0) return;

        const selectedRekeningIds = [...new Set(data.items.map((i: any) => String(i.rekening_id)))];
        const selectedAccounts = fetchedAccounts.filter((acc: any) => selectedRekeningIds.includes(String(acc.id)));

        const taxes = {
            is_ppn: selectedAccounts.some((a: any) => a.is_ppn),
            is_pph21: selectedAccounts.some((a: any) => a.is_pph21),
            is_pph22: selectedAccounts.some((a: any) => a.is_pph22),
            is_pph23: selectedAccounts.some((a: any) => a.is_pph23),
        };

        setData((prev: any) => {
            const hasNpwp = !!(prev.npwp && prev.npwp.trim() !== '' && !prev.no_npwp);
            let newHasTax = false;
            let newPajak = prev.pajak;
            let newPersenPajak = prev.persen_pajak;

            if (taxes.is_pph21) {
                newHasTax = true;
                newPajak = 'PPh 21';
            } else if (taxes.is_pph23 && !taxes.is_pph21) {
                if (taxes.is_ppn && totalTransaksi >= 2000000) {
                    newHasTax = true;
                    newPajak = 'PPN';
                    newPersenPajak = '11';
                } else {
                    newHasTax = true;
                    newPajak = 'PPh 23';
                    newPersenPajak = hasNpwp ? '2' : '4';
                }
            } else if (taxes.is_pph22) {
                newHasTax = true;
                newPajak = 'PPh 22';
                newPersenPajak = hasNpwp ? '1.5' : '3';
            } else if (taxes.is_ppn && totalTransaksi >= 2000000) {
                newHasTax = true;
                newPajak = 'PPN';
                newPersenPajak = '11';
            }

            const updates: any = {};
            if (newHasTax) {
                if (prev.has_tax !== true) updates.has_tax = true;
                if (prev.pajak !== newPajak) updates.pajak = newPajak;
                if (newPajak !== 'PPh 21' && prev.persen_pajak !== newPersenPajak) {
                    updates.persen_pajak = newPersenPajak;
                }
            } else {
                if (prev.has_tax !== false) {
                    updates.has_tax = false;
                    updates.total_pajak = 0;
                }
            }

            // Fitur deteksi otomatis pajak daerah (PB1) dihapus sesuai permintaan.
            // Pengguna kini dapat mencentang dan memilih PB1/SPPD secara manual tanpa di-reset atau dipaksa.

            if (Object.keys(updates).length > 0) {
                return { ...prev, ...updates };
            }
            return prev;
        });
    }, [itemsKey, totalTransaksi, fetchedAccounts]);

    // Auto-set PPh 21 persen berdasarkan status pegawai & golongan
    useEffect(() => {
        if (!detectedTaxes.is_pph21 || data.pajak !== 'PPh 21') return;

        const hasNpwp = !!(data.npwp && data.npwp.trim() !== '' && !data.no_npwp);

        if (statusPegawai === 'ASN') {
            let rate = '0';
            if (golonganASN === 'Golongan III') rate = '5';
            else if (golonganASN === 'Golongan IV') rate = '15';
            setData('persen_pajak', rate);
        } else if (statusPegawai === 'Non-ASN') {
            const rate = getTarifPPh21NonASN(totalTransaksi, hasNpwp);
            setData('persen_pajak', String(rate));
        }
    }, [statusPegawai, golonganASN]);

    // Auto-calculate Tax Amount
    useEffect(() => {
        const totalTransaction = data.items.reduce((sum: number, item: any) => sum + (item.total || 0), 0);

        // Main Tax
        if (data.has_tax && data.persen_pajak) {
            let amount = 0;
            const persen = Number(data.persen_pajak);
            
            if (data.pajak === 'PPN') {
                amount = Math.floor(totalTransaction * (persen / (100 + persen)));
            } else {
                amount = Math.floor(totalTransaction * (persen / 100));
            }

            if (data.total_pajak !== amount) {
                setData('total_pajak', amount);
            }
        } else if (!data.has_tax && data.total_pajak !== 0) {
            setData('total_pajak', 0);
        }

        // Local Tax
        if (data.has_local_tax && data.persen_pajak_daerah) {
            const amount = Math.floor(totalTransaction * (Number(data.persen_pajak_daerah) / 100));
            if (data.total_pajak_daerah !== amount) {
                setData('total_pajak_daerah', amount);
            }
        } else if (!data.has_local_tax && data.total_pajak_daerah !== 0) {
            setData('total_pajak_daerah', 0);
        }
    }, [data.has_tax, data.pajak, data.persen_pajak, data.has_local_tax, data.persen_pajak_daerah, data.items]);

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
        [penganggaranFk]: penganggaran.id,
        tanggal_penarikan: '',
        jumlah_penarikan: '',
    });

    // Form handling for Setor Tunai
    const setorForm = useForm({
        [penganggaranFk]: penganggaran.id,
        tanggal_setor: '',
        jumlah_setor: '',
    });

    // Form handling for Tutup BKU
    const tutupForm = useForm({
        [penganggaranFk]: penganggaran.id,
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
    // Gunakan parseLocalDate agar tidak terjadi timezone offset (UTC → WIB)
    const earliestReceptionDate = (penerimaanDanas || [])
        .map((p: any) => parseLocalDate(p.tanggal_terima))
        .sort((a: Date, b: Date) => a.getTime() - b.getTime())[0];

    const disabledWithdrawalDates = [
        { before: startOfActiveMonth },
        { after: endOfActiveMonth },
        // Disable dates before the first fund reception
        ...(earliestReceptionDate ? [{ before: earliestReceptionDate }] : [])
    ];

    // Find the earliest date of cash withdrawal (Penarikan Tunai) - Adjusted for Stages
    // Gunakan parseLocalDate agar tidak terjadi timezone offset (UTC → WIB)
    const globalEarliestWithdrawal = (penarikanTunais || [])
        .map((p: any) => parseLocalDate(p.tanggal_penarikan))
        .sort((a: Date, b: Date) => a.getTime() - b.getTime())[0];

    // Stage 2 Logic (July - December)
    const isStage2 = currentMonthIndex >= 6; // July index is 6
    const startOfStage2 = new Date(yearInt, 6, 1);

    // Gunakan parseLocalDate agar tidak terjadi timezone offset (UTC → WIB)
    const earliestStage2Withdrawal = (penarikanTunais || [])
        .map((p: any) => parseLocalDate(p.tanggal_penarikan))
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
        // Jangan tutup modal utama jika modal tarif pajak sedang terbuka
        if (showTarifModal) return;
        setIsModalOpen(false);
        setIsEditMode(false);
        setEditingBkuId(null);
        setCurrentStep(1);
        reset();
    };

    // Search Toko Handler (debounced)
    const handleSearchToko = (value: string) => {
        setData('nama_toko', value);
        
        if (tokoSearchRef.current) {
            clearTimeout(tokoSearchRef.current);
        }

        if (value.trim().length < 2) {
            setTokoResults([]);
            setShowTokoDropdown(false);
            return;
        }

        // Tampilkan dropdown segera dengan status "Mencari..."
        setShowTokoDropdown(true);
        setIsSearchingToko(true);

        tokoSearchRef.current = setTimeout(() => {
            console.log("Searching toko for:", value);
            axios.get(vroute('api.bku.search-toko', { q: value }))
                .then(res => {
                    console.log("Search response:", res.data);
                    if (res.data.success) {
                        setTokoResults(res.data.data || []);
                    } else {
                        setTokoResults([]);
                    }
                })
                .catch(err => {
                    console.error("Search error:", err.response || err);
                    setTokoResults([]);
                })
                .finally(() => {
                    setIsSearchingToko(false);
                });
        }, 500); // 500ms debounce
    };

    const selectToko = (toko: any) => {
        setData((prevData: any) => ({
            ...prevData,
            nama_toko: toko.nama_toko || '',
            alamat_toko: toko.alamat_toko || '',
            nomor_telepon: toko.nomor_telepon || '',
            npwp: toko.npwp || '',
            no_npwp: !toko.npwp || toko.npwp === '-' || String(toko.npwp).trim() === ''
        }));
        setShowTokoDropdown(false);
    };

    const addNewToko = () => {
        // Cukup tutup dropdown, nama_toko sudah terisi dari input
        setShowTokoDropdown(false);
    };

    // Search Penerima Pembayaran Handler (debounced)
    const handleSearchPenerima = (value: string) => {
        setData('nama_penerima_pembayaran', value);
        
        if (penerimaSearchRef.current) {
            clearTimeout(penerimaSearchRef.current);
        }

        if (value.trim().length < 2) {
            setPenerimaResults([]);
            setShowPenerimaDropdown(false);
            return;
        }

        setShowPenerimaDropdown(true);
        setIsSearchingPenerima(true);

        penerimaSearchRef.current = setTimeout(() => {
            axios.get(vroute('api.bku.search-penerima', { q: value }))
                .then(res => {
                    if (res.data.success) {
                        setPenerimaResults(res.data.data || []);
                    } else {
                        setPenerimaResults([]);
                    }
                })
                .catch(err => {
                    console.error("Search error:", err.response || err);
                    setPenerimaResults([]);
                })
                .finally(() => {
                    setIsSearchingPenerima(false);
                });
        }, 500);
    };

    const selectPenerima = (penerima: any) => {
        setData({
            ...data,
            nama_penerima_pembayaran: penerima.nama_penerima_pembayaran || '',
            alamat_toko: penerima.alamat_toko || '',
            npwp: penerima.npwp || '',
            no_npwp: !penerima.npwp || penerima.npwp === '-' || String(penerima.npwp).trim() === ''
        });
        setShowPenerimaDropdown(false);
    };

    const addNewPenerima = () => {
        setShowPenerimaDropdown(false);
    };


    const isNoteDuplicate = (noteNumber: string) => {
        if (!noteNumber) return false;
        // Cek di seluruh transaksi (allUsedNotes) bukan hanya bkuData bulan ini
        return (allUsedNotes || []).some((item: any) => {
            if (isEditMode && item.id === editingBkuId) return false;
            return item.id_transaksi === noteNumber || item.nomor_nota === noteNumber;
        });
    };

    const generateNextBpu = () => {
        // Jika tidak ada lastNoteNumber, mulai dari BPU-001
        if (!lastNoteNumber) return 'BPU-001';
        
        // Cari angka terakhir dari BPU-XXX
        const match = lastNoteNumber.match(/BPU-(\d+)/);
        if (match) {
            const nextNumber = parseInt(match[1]) + 1;
            return `BPU-${String(nextNumber).padStart(3, '0')}`;
        }
        
        return 'BPU-001';
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
            } else if (!data.jenis_transaksi) {
                setJenisTransaksiError('Wajib pilih jenis transaksi');
                setTimeout(() => {
                    const element = document.getElementById('jenis_transaksi');
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
            } else if (!data.npwp && !data.no_npwp) {
                setNpwpError('Wajib di isi. Centang jika tidak memiliki NPWP.');
                return;
            }
        }
        
        if (currentStep === 2) {
            // Check Duplicate
            if (data.nomor_nota && isNoteDuplicate(data.nomor_nota)) {
                setIsDuplicateNoteModalOpen(true);
                return;
            }

            // Check Empty
            if (!data.nomor_nota) {
                setIsNoteConfirmationOpen(true);
                return;
            }
        }

        setNpwpError('');
        setCurrentStep(prev => Math.min(prev + 1, 3));
    };

    const handleConfirmEmptyNote = () => {
        const nextBpu = generateNextBpu();
        setData('nomor_nota', nextBpu);
        setIsNoteConfirmationOpen(false);
        // Lanjut ke step berikutnya setelah auto-generate
        setTimeout(() => {
            setCurrentStep(3);
        }, 100);
    };

    const prevStep = () => {
        setCurrentStep(prev => Math.max(prev - 1, 1));
    };



    // Helper format nominal tanpa prefix "Rp" untuk input & tombol Isi Maksimal
    const formatNominalInput = (numberValue: number) => {
        return formatCurrency(numberValue).replace('Rp', '').trim();
    };

    // Handle Currency Format for Tarik/Setor
    const handleCurrencyChange = (e: React.ChangeEvent<HTMLInputElement>, formHandler: any, field: string) => {
        let value = e.target.value.replace(/[^0-9]/g, '');
        const numberValue = parseInt(value, 10);
        if (!isNaN(numberValue)) {
            formHandler.setData(field, formatNominalInput(numberValue));
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

        tarikForm.post(vroute('penarikan-tunai.store'), {
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

        setorForm.post(vroute('setor-tunai.store'), {
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

        tutupForm.post(vroute('bku.tutup'), {
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

        if (isEditMode && editingBkuId) {
            put(vroute('bku.update', editingBkuId), {
                onSuccess: () => {
                    setIsModalOpen(false);
                    setIsEditMode(false);
                    setEditingBkuId(null);
                    reset();
                    setCurrentStep(1);
                },
                onError: (errors: any) => {
                    console.error("Update BKU Error:", errors);
                },
                preserveScroll: true,
            });
        } else {
            post(vroute('bku.store'), {
                onSuccess: () => {
                    setIsModalOpen(false);
                    reset();
                    setCurrentStep(1);
                },
                onError: (errors: any) => {
                    console.error("Store BKU Error:", errors);
                },
                preserveScroll: true,
            });
        }
    };

    const handleReopenBku = () => {
        setIsReopenModalOpen(true);
    };

    const confirmReopen = () => {
        setIsReopening(true);
        router.post(vroute('bku.reopen'), {
            [penganggaranFk]: penganggaran.id,
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
        router.post(vroute('bku.lapor-pajak', selectedBkuIdForPajak), {
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

    const handleEditClick = (item: any) => {
        setIsEditMode(true);
        setEditingBkuId(item.id);
        const details = item.uraian_details || item.uraianDetails || [];
        const kegId = item.kode_kegiatan_id || item.kode_kegiatan?.id || details[0]?.kode_kegiatan_id || '';
        const rekId = item.rekening_belanja_id || item.rekening_belanja?.id || details[0]?.rekening_belanja_id || details[0]?.rekening_id || '';
        setSelectedActivityId(String(kegId));
        setSelectedAccountId(String(rekId));
        setDetailUraian(item.uraian_opsional || '');

        const mappedItems = details.map((d: any) => ({
            rkas_id: Number(d.rkas_id || d.rkas_perubahan_id || d.kinerja_rkas_id || d.kinerja_rkas_perubahan_id || d.silpa_rkas_id || d.kinerja_silpa_rkas_id),
            uraian: d.uraian,
            volume: Number(d.volume || 0),
            sisa_volume_limit: Number(d.volume || 0),
            satuan: d.satuan || '',
            harga_satuan: Number(d.harga_satuan || 0),
            total: Number(d.jumlah || (d.volume * d.harga_satuan) || 0),
            kegiatan_id: String(d.kode_kegiatan_id || item.kode_kegiatan_id || ''),
            rekening_id: String(d.rekening_belanja_id || item.rekening_belanja_id || '')
        }));

        const isNoEntity = !!(item.nama_penerima_pembayaran && !item.nama_toko);

        setData({
            [penganggaranFk]: penganggaran.id,
            bulan: bulan,
            is_siplah: false,
            tanggal_transaksi: item.tanggal_transaksi ? String(item.tanggal_transaksi).split(' ')[0] : '',
            jenis_transaksi: item.jenis_transaksi ? (item.jenis_transaksi.toLowerCase() === 'tunai' ? 'Tunai' : 'Nontunai') : '',
            no_entity: isNoEntity,
            nama_toko: item.nama_toko || '',
            nama_penerima_pembayaran: item.nama_penerima_pembayaran || '',
            alamat_toko: item.alamat_toko || '',
            nomor_telepon: item.nomor_telepon || '',
            npwp: item.npwp || '',
            no_npwp: !item.npwp || item.npwp === '-' || item.npwp === '',
            nomor_nota: item.id_transaksi || '',
            tanggal_nota: item.tanggal_transaksi ? String(item.tanggal_transaksi).split(' ')[0] : '',
            items: mappedItems,
            bebas_pajak: !item.total_pajak && !item.total_pajak_daerah,
            has_tax: !!(item.pajak && Number(item.total_pajak) > 0),
            pajak: item.pajak || 'PPN',
            persen_pajak: item.persen_pajak || '',
            total_pajak: Number(item.total_pajak || 0),
            has_local_tax: !!(item.pajak_daerah && Number(item.total_pajak_daerah) > 0),
            pajak_daerah: item.pajak_daerah || 'PB1',
            persen_pajak_daerah: item.persen_pajak_daerah || '',
            total_pajak_daerah: Number(item.total_pajak_daerah || 0),
            bunga_bank: '',
            pajak_bunga: '',
            tanggal_lapor: '',
            kode_masa_pajak: '',
            ntpn: ''
        });

        setCurrentStep(1);
        setIsModalOpen(true);
    };

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
            router.delete(vroute('penarikan-tunai.destroy', id), {
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
            router.delete(vroute('penerimaan-dana.destroy', id), {
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
            router.delete(vroute('setor-tunai.destroy', id), {
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
            router.delete(vroute('bku.destroy', id), {
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
        router.post(vroute('bku.destroy-period'), {
            [penganggaranFk]: penganggaran.id,
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
        <div className="space-y-4">
            {/* Panel 1: Waktu & Metode Transaksi */}
            <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4 dark:border-white/5 dark:bg-white/[0.02]">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                        <InputLabel value="Tanggal Transaksi" />
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
                            className="mt-1"
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
                        <InputError message={tanggalTransaksiError} className="mt-1.5" />
                    </div>
                    <div>
                        <InputLabel value="Jenis Transaksi" />
                        <select
                            id="jenis_transaksi"
                            value={data.jenis_transaksi}
                            onChange={(e) => {
                                setData('jenis_transaksi', e.target.value);
                                if (e.target.value) setJenisTransaksiError('');
                            }}
                            className={`mt-1 block w-full rounded-xl border border-slate-200/90 bg-white px-3.5 py-2.5 text-[12px] font-semibold text-slate-800 shadow-sm transition focus:border-lime-400 focus:outline-none focus:ring-4 focus:ring-lime-200/60 dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:border-lime-400/70 dark:focus:ring-lime-400/10 ${jenisTransaksiError ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-200/60' : ''}`}
                        >
                            <option value=''>Pilih Jenis Transaksi</option>
                            <option value="Tunai">Tunai ({formatCurrency(saldoTunai)})</option>
                            <option value="Nontunai">Nontunai ({formatCurrency(saldoNonTunai)})</option>
                        </select>
                        <InputError message={jenisTransaksiError} className="mt-1.5" />
                    </div>
                </div>
            </div>

            {/* Panel 2: Informasi Toko / Penerima Pembayaran */}
            <div className="space-y-3.5 rounded-2xl border border-slate-100 bg-slate-50/60 p-4 dark:border-white/5 dark:bg-white/[0.02]">
                <label className="inline-flex cursor-pointer items-center gap-2.5">
                    <input
                        type="checkbox"
                        checked={data.no_entity}
                        onChange={(e) => setData('no_entity', e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-brand-600 shadow-sm focus:ring-lime-200/60 dark:border-white/20 dark:bg-white/5"
                    />
                    <span className="text-[11.5px] font-semibold text-slate-600 dark:text-slate-300">
                        Centang jika pembelanjaan ini tidak memiliki toko/badan usaha
                    </span>
                </label>

                <div>
                    {data.no_entity ? (
                        <>
                            <InputLabel value="Nama Penerima Pembayaran" />
                            <div className="relative mt-1">
                                <div className="pointer-events-none absolute inset-y-0 left-0 z-10 flex items-center pl-3.5">
                                    {isSearchingPenerima ? (
                                        <svg className="h-4 w-4 animate-spin text-brand-500 dark:text-brand-300" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                        </svg>
                                    ) : (
                                        <svg className="h-4 w-4 text-slate-400 dark:text-slate-500" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                                        </svg>
                                    )}
                                </div>
                                <TextInput
                                    className="!pl-10"
                                    value={data.nama_penerima_pembayaran}
                                    onChange={(e) => handleSearchPenerima(e.target.value)}
                                    onFocus={() => { if (data.nama_penerima_pembayaran.trim().length >= 2) setShowPenerimaDropdown(true); }}
                                    onBlur={() => setTimeout(() => setShowPenerimaDropdown(false), 200)}
                                    placeholder="Cari atau ketik nama penerima pembayaran"
                                    autoComplete="off"
                                />

                                {/* Dropdown Results */}
                                {showPenerimaDropdown && (
                                    <div className="absolute z-50 mt-1.5 max-h-60 w-full overflow-y-auto rounded-2xl border border-slate-100 bg-white shadow-float dark:border-white/10 dark:bg-[#15131F]">
                                        {isSearchingPenerima ? (
                                            <div className="p-3 text-center text-[11.5px] font-medium text-slate-400 dark:text-slate-500">Mencari...</div>
                                        ) : penerimaResults.length > 0 ? (
                                            <>
                                                {penerimaResults.map((penerima, idx) => (
                                                    <button
                                                        key={idx}
                                                        type="button"
                                                        onMouseDown={(e) => { e.preventDefault(); selectPenerima(penerima); }}
                                                        className="w-full border-b border-slate-100 px-3.5 py-2.5 text-left transition-colors last:border-b-0 hover:bg-pastel-sky/60 dark:border-white/10 dark:hover:bg-white/10"
                                                    >
                                                        <div className="text-[12px] font-bold text-slate-800 dark:text-white">
                                                            {penerima.nama_penerima_pembayaran}
                                                        </div>
                                                    </button>
                                                ))}
                                            </>
                                        ) : data.nama_penerima_pembayaran.trim().length >= 2 ? (
                                            <button
                                                type="button"
                                                onMouseDown={(e) => { e.preventDefault(); addNewPenerima(); }}
                                                className="w-full px-3.5 py-2.5 text-left transition-colors hover:bg-pastel-lavender/60 dark:hover:bg-white/10"
                                            >
                                                <div className="flex items-center gap-2 text-[12px] font-bold text-brand-600 dark:text-brand-300">
                                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                                    </svg>
                                                    Gunakan "{data.nama_penerima_pembayaran}"
                                                </div>
                                                <div className="mt-0.5 text-[10.5px] text-slate-400 dark:text-slate-500">
                                                    Penerima baru akan disimpan
                                                </div>
                                            </button>
                                        ) : (
                                            <div className="p-3 text-center text-[11.5px] text-slate-400 dark:text-slate-500">
                                                Ketik minimal 2 huruf untuk mencari
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <>
                            <InputLabel value="Nama Toko/Badan Usaha" />
                            <div className="relative mt-1">
                                <div className="pointer-events-none absolute inset-y-0 left-0 z-10 flex items-center pl-3.5">
                                    {isSearchingToko ? (
                                        <svg className="h-4 w-4 animate-spin text-brand-500 dark:text-brand-300" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                        </svg>
                                    ) : (
                                        <svg className="h-4 w-4 text-slate-400 dark:text-slate-500" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                                        </svg>
                                    )}
                                </div>
                                <TextInput
                                    className="!pl-10"
                                    value={data.nama_toko}
                                    onChange={(e) => handleSearchToko(e.target.value)}
                                    onFocus={() => { if (data.nama_toko.trim().length >= 2) setShowTokoDropdown(true); }}
                                    onBlur={() => setTimeout(() => setShowTokoDropdown(false), 200)}
                                    placeholder="Cari atau ketik nama toko/badan usaha"
                                    autoComplete="off"
                                />

                                {/* Dropdown Results */}
                                {showTokoDropdown && (
                                    <div className="absolute z-50 mt-1.5 max-h-60 w-full overflow-y-auto rounded-2xl border border-slate-100 bg-white shadow-float dark:border-white/10 dark:bg-[#15131F]">
                                        {isSearchingToko ? (
                                            <div className="p-3 text-center text-[11.5px] font-medium text-slate-400 dark:text-slate-500">Mencari...</div>
                                        ) : tokoResults.length > 0 ? (
                                            <>
                                                {tokoResults.map((toko, idx) => (
                                                    <button
                                                        key={idx}
                                                        type="button"
                                                        onMouseDown={(e) => { e.preventDefault(); selectToko(toko); }}
                                                        className="w-full border-b border-slate-100 px-3.5 py-2.5 text-left transition-colors last:border-b-0 hover:bg-pastel-sky/60 dark:border-white/10 dark:hover:bg-white/10"
                                                    >
                                                        <div className="text-[12px] font-bold text-slate-800 dark:text-white">{toko.nama_toko}</div>
                                                        {toko.alamat_toko && (
                                                            <div className="truncate text-[10.5px] text-slate-500 dark:text-slate-400">{toko.alamat_toko}</div>
                                                        )}
                                                    </button>
                                                ))}
                                                {/* Tambah opsi baru di bawah */}
                                                <button
                                                    type="button"
                                                    onMouseDown={(e) => { e.preventDefault(); addNewToko(); }}
                                                    className="w-full border-t border-slate-100 px-3.5 py-2.5 text-left transition-colors hover:bg-pastel-mint/60 dark:border-white/10 dark:hover:bg-mint/10"
                                                >
                                                    <span className="text-[12px] font-bold text-mint">+ Tambah "{data.nama_toko}"</span>
                                                </button>
                                            </>
                                        ) : (
                                            <div className="p-3">
                                                <p className="mb-2 text-[11.5px] text-slate-500 dark:text-slate-400">
                                                    Kata kunci "<span className="font-semibold text-slate-700 dark:text-slate-200">{data.nama_toko}</span>" tidak ditemukan.
                                                </p>
                                                <button
                                                    type="button"
                                                    onMouseDown={(e) => { e.preventDefault(); addNewToko(); }}
                                                    className="w-full rounded-xl px-3 py-2 text-left transition-colors hover:bg-pastel-mint/60 dark:hover:bg-mint/10"
                                                >
                                                    <span className="text-[12px] font-bold text-mint">+ Tambah "{data.nama_toko}"</span>
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>

                <div>
                    <InputLabel value="Alamat Toko/Badan Usaha" />
                    <TextInput
                        className="mt-1"
                        value={data.alamat_toko}
                        onChange={(e) => {
                            setData('alamat_toko', e.target.value);
                            if (e.target.value) setAlamatTokoError('');
                        }}
                        placeholder="Alamat lengkap toko/badan usaha"
                        id="alamat_toko"
                    />
                    <InputError message={alamatTokoError} className="mt-1.5" />
                </div>

                <div>
                    <InputLabel value="NPWP Toko/Badan Usaha" />
                    <TextInput
                        className={`mt-1 text-sikas-num disabled:bg-slate-100 disabled:text-slate-400 dark:disabled:bg-white/[0.03] dark:disabled:text-slate-500 ${npwpError ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-200/60' : ''}`}
                        value={data.npwp}
                        onChange={(e) => {
                            const value = e.target.value.replace(/\D/g, '').slice(0, 16);
                            setData('npwp', value);
                            if (value) setNpwpError('');
                        }}
                        placeholder="NPWP (16 digit angka)"
                        disabled={data.no_npwp}
                        maxLength={16}
                    />
                    <InputError message={npwpError} className="mt-1.5" />
                    <label className="mt-2 inline-flex cursor-pointer items-center gap-2">
                        <input
                            type="checkbox"
                            checked={data.no_npwp}
                            onChange={(e) => {
                                setData('no_npwp', e.target.checked);
                                if (e.target.checked) setNpwpError('');
                            }}
                            className="h-3.5 w-3.5 rounded border-slate-300 text-brand-600 shadow-sm focus:ring-lime-200/60 dark:border-white/20 dark:bg-white/5"
                        />
                        <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Tidak punya NPWP</span>
                    </label>
                </div>
            </div>
        </div>
    );

    const handleGenerateAiUraian = async (isRegenerate: boolean = false) => {
        // Cari label kegiatan dan rekening
        const currentActivity = fetchedActivities.find(act => String(act.id || act.kode) === String(selectedActivityId));
        const currentAccount = fetchedAccounts.find(acc => String(acc.id || acc.kode_rekening) === String(selectedAccountId));

        const kegiatanText = currentActivity 
            ? `${currentActivity.kode || ''} - ${currentActivity.uraian || ''}`.trim().replace(/^- |-$/, '') 
            : '';
        const rekeningText = currentAccount 
            ? `${currentAccount.kode_rekening || ''} - ${currentAccount.rincian_objek || ''}`.trim().replace(/^- |-$/, '') 
            : '';

        const rekananText = (data.nama_toko || data.nama_penerima_pembayaran || '').trim();

        // Validasi minimal: harus ada kegiatan, rekening, atau items
        if (!selectedActivityId && !selectedAccountId && (!data.items || data.items.length === 0)) {
            alert('Silakan pilih Jenis Kegiatan, Rekening Belanja, atau rincian item belanja terlebih dahulu agar Asisten AI dapat merumuskan uraian.');
            return;
        }

        const nextVariantIndex = isRegenerate ? aiUraianVariantIndex + 1 : 0;
        setIsGeneratingAiUraian(true);

        try {
            const payload = {
                nama_rekanan: rekananText,
                kegiatan: kegiatanText,
                rekening: rekeningText,
                items: (data.items || []).map((item: any) => ({
                    uraian: item.uraian,
                    volume: item.volume,
                    satuan: item.satuan,
                })),
                jenis_transaksi: data.jenis_transaksi,
                nomor_nota: data.nomor_nota,
                variant_index: nextVariantIndex,
            };

            const res = await axios.post(vroute('api.bku.ai-generate-uraian'), payload);
            if (res.data && res.data.success) {
                setDetailUraian(res.data.uraian);
                setAiUraianVariantIndex(nextVariantIndex);
            }
        } catch (err: any) {
            console.error('Error generating AI Uraian:', err);
            if (err.response && err.response.status === 403 && err.response.data?.error_type === 'NO_API_KEY') {
                setAiErrorMessage(err.response.data.message || 'Kunci API DeepSeek belum dikonfigurasi pada profil Anda.');
                setIsAiApiKeyModalOpen(true);
            } else {
                const errMsg = err.response?.data?.message || 'Gagal memanggil Asisten AI. Pastikan server terhubung.';
                alert(errMsg);
            }
        } finally {
            setIsGeneratingAiUraian(false);
        }
    };

    const renderStep2 = () => {
        const isSelected = (rkasId: number) => data.items.some(i => Number(i.rkas_id) === Number(rkasId));
        const getItem = (rkasId: number) => data.items.find(i => Number(i.rkas_id) === Number(rkasId));

        return (
            <div className="space-y-4">
                {/* Panel Nota & Tanggal */}
                <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4 dark:border-white/5 dark:bg-white/[0.02]">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                            <InputLabel value="Nomor Nota (Opsional)" />
                            <TextInput
                                className="mt-1"
                                value={data.nomor_nota}
                                onChange={(e) => setData('nomor_nota', e.target.value)}
                                placeholder="Kosongkan untuk auto-generate (BPU-XXX)"
                            />
                            <span className="mt-1.5 flex items-center gap-1.5 text-[10.5px] font-medium text-slate-400 dark:text-slate-500">
                                Nomor Nota Terakhir: <span className="font-bold text-slate-700 dark:text-slate-300">{lastNoteNumber}</span>
                                {lastNoteNumber && lastNoteNumber !== '-' && (
                                    <button
                                        type="button"
                                        onClick={() => setData('nomor_nota', lastNoteNumber)}
                                        className="rounded-lg p-1 text-brand-600 transition-colors hover:bg-pastel-lavender dark:text-brand-300 dark:hover:bg-brand-500/20"
                                        title="Salin nomor nota terakhir"
                                    >
                                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                                        </svg>
                                    </button>
                                )}
                            </span>
                        </div>
                        <div>
                            <InputLabel value="Tanggal Belanja/Nota" />
                            <DatePicker
                                value={data.tanggal_nota}
                                onChange={(date) => setData('tanggal_nota', date ? format(date, 'yyyy-MM-dd') : '')}
                                className="mt-1"
                                placeholder={(!penarikanTunais || penarikanTunais.length === 0) ? "Belum ada penarikan tunai" : "Pilih Tanggal"}
                                startMonth={startOfActiveMonth}
                                endMonth={endOfActiveMonth}
                                disabled={disabledDepositDates}
                                inputDisabled={!penarikanTunais || penarikanTunais.length === 0}
                            />
                        </div>
                    </div>
                </div>

                {/* Main Card Kegiatan */}
                <div className="rounded-2xl border border-slate-200/80 bg-white dark:border-white/10 dark:bg-white/[0.02]">
                    {/* Neo-Bento Pastel Lavender Header */}
                    <div className="flex items-center justify-between gap-3 rounded-t-2xl border-b border-brand-500/10 bg-pastel-lavender/65 px-5 py-3.5 dark:border-brand-400/20 dark:bg-brand-500/10">
                        <div className="flex items-center gap-2.5">
                            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-white text-[11px] font-extrabold text-brand-600 shadow-sm dark:bg-brand-500/20 dark:text-brand-300">
                                1
                            </span>
                            <h3 className="text-[13px] font-extrabold tracking-tight text-slate-900 dark:text-white">Kegiatan 1</h3>
                        </div>
                        <StatusBadge tone="violet" dot={false}>Rincian RKAS</StatusBadge>
                    </div>

                    <div className="space-y-4 p-5">
                        {/* Kegiatan Select */}
                        <div>
                            <InputLabel value="Kegiatan" />
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
                            <InputLabel value="Rekening Belanja" />
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
                                className={!selectedActivityId ? 'pointer-events-none opacity-50' : ''}
                            />
                        </div>

                        {/* Uraian Belanja (Opsional) */}
                        <div>
                            <div className="mb-1.5 flex items-center justify-between gap-2">
                                <InputLabel value="Uraian Belanja (Opsional)" className="!mb-0" />
                                <div className="flex items-center gap-1.5">
                                    <button
                                        type="button"
                                        onClick={() => handleGenerateAiUraian(false)}
                                        disabled={isGeneratingAiUraian}
                                        className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-gradient-to-r from-brand-500 via-brand-600 to-brand-700 px-3 py-1.5 text-[10.5px] font-bold text-white shadow-sm transition-all duration-150 hover:from-brand-600 hover:via-brand-700 hover:to-brand-800 disabled:cursor-not-allowed disabled:opacity-60"
                                        title="Buat uraian belanja otomatis menggunakan Asisten AI"
                                    >
                                        {isGeneratingAiUraian ? (
                                            <>
                                                <svg className="h-3.5 w-3.5 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                                                </svg>
                                                <span>Menyusun Uraian...</span>
                                            </>
                                        ) : (
                                            <>
                                                <svg className="h-3.5 w-3.5 text-amber-300" fill="currentColor" viewBox="0 0 20 20">
                                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                                </svg>
                                                <span>Asisten AI</span>
                                            </>
                                        )}
                                    </button>
                                    {detailUraian && (
                                        <button
                                            type="button"
                                            onClick={() => handleGenerateAiUraian(true)}
                                            disabled={isGeneratingAiUraian}
                                            className="inline-flex cursor-pointer items-center gap-1 rounded-xl border border-slate-200/90 bg-slate-100 px-2.5 py-1.5 text-[10.5px] font-bold text-slate-700 transition-colors hover:bg-slate-200 disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
                                            title="Buat variasi redaksi kalimat alternatif"
                                        >
                                            <svg className="h-3 w-3 text-brand-600 dark:text-brand-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                            </svg>
                                            <span>Variasi</span>
                                        </button>
                                    )}
                                </div>
                            </div>
                            <textarea
                                value={detailUraian}
                                onChange={(e) => setDetailUraian(e.target.value)}
                                className="w-full rounded-xl border border-slate-200/90 bg-white px-3.5 py-2.5 text-[12px] font-medium text-slate-800 shadow-sm transition placeholder:text-slate-400 focus:border-lime-400 focus:outline-none focus:ring-4 focus:ring-lime-200/60 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-lime-400/70 dark:focus:ring-lime-400/10"
                                rows={2}
                                placeholder="Detail uraian belanja (jika ada)"
                            />
                            <p className="mt-1.5 flex items-center text-[10.5px] font-medium text-rose-500 dark:text-rose-400">
                                <svg className="mr-1.5 h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Uraian akan otomatis oleh sistem menggunakan uraian rekening belanja jika uraian belanja tidak diisi
                            </p>
                        </div>

                        {/* Items Section (Only show if Account selected) */}
                        {selectedAccountId && (
                            <div className="border-t border-slate-100 pt-5 dark:border-white/5">
                                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                                    <h4 className="text-[12.5px] font-extrabold text-slate-900 dark:text-white">Uraian</h4>
                                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200/80 bg-slate-50 px-3 py-1.5 dark:border-white/10 dark:bg-white/5">
                                        <input
                                            type="checkbox"
                                            className="h-3.5 w-3.5 rounded border-slate-300 text-brand-600 shadow-sm focus:ring-lime-200/60 dark:border-white/20"
                                            checked={availableRkasItems.length > 0 && availableRkasItems.every(item => data.items.some(i => Number(i.rkas_id) === Number(item.id)))}
                                            onChange={(e) => handleSelectAll(e.target.checked)}
                                        />
                                        <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200">Pilih semua uraian</span>
                                    </label>
                                </div>

                                <p className="mb-4 text-[11px] font-medium text-slate-400 dark:text-slate-500">
                                    Total RKAS: {availableRkasItems.length} | Sudah: 0 | Sisa: {availableRkasItems.length}
                                </p>

                                <div className="space-y-3">
                                    {availableRkasItems.map((item: any) => (
                                        <div
                                            key={item.id}
                                            className={`rounded-2xl border p-4 transition-colors ${
                                                isSelected(item.id)
                                                    ? 'border-brand-300 bg-pastel-lavender/35 dark:border-brand-500/30 dark:bg-brand-500/[0.06]'
                                                    : 'border-slate-100 bg-slate-50/50 dark:border-white/5 dark:bg-white/[0.02]'
                                            }`}
                                        >
                                            <div className="flex items-start gap-3">
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected(item.id)}
                                                    onChange={(e) => handleItemSelection(item, e.target.checked)}
                                                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600 shadow-sm focus:ring-lime-200/60 dark:border-white/20 dark:bg-white/5"
                                                />
                                                <span className="text-[12px] font-bold text-slate-800 dark:text-white">{item.uraian}</span>
                                            </div>

                                            {isSelected(item.id) && (
                                                <div className="mt-3.5 grid grid-cols-1 gap-4 pl-7 md:grid-cols-2">
                                                    <div>
                                                        <InputLabel value="Jumlah yang akan dibelanjakan" />
                                                        <div className="relative mt-1">
                                                            <TextInput
                                                                type="number"
                                                                className="pr-24 text-sikas-num font-bold"
                                                                value={getItem(item.id)?.volume}
                                                                onChange={(e) => updateItemField(item.id, 'volume', parseFloat(e.target.value) || 0)}
                                                                placeholder="0"
                                                            />
                                                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2.5">
                                                                <span className="rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600 dark:bg-white/10 dark:text-slate-300">
                                                                    Maks: {item.sisa_volume}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        {(getItem(item.id)?.volume || 0) > item.sisa_volume && (
                                                            <p className="mt-1 text-[10.5px] font-semibold text-rose-500">
                                                                Jumlah melebihi volume yang tersedia!
                                                            </p>
                                                        )}
                                                        <p className="mt-1.5 text-[10.5px] font-medium text-slate-500 dark:text-slate-400">
                                                            Sisa volume kumulatif: <span className="font-bold text-slate-700 dark:text-slate-200">{item.sisa_volume} {item.satuan}</span>
                                                        </p>
                                                    </div>

                                                    <div>
                                                        <InputLabel value="Harga Satuan" />
                                                        <div className="relative mt-1">
                                                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                                                                <span className="text-[12px] font-bold text-slate-400 dark:text-slate-500">Rp</span>
                                                            </div>
                                                            <TextInput
                                                                className="!pl-10 bg-slate-100/80 text-sikas-num font-bold dark:bg-white/[0.04]"
                                                                value={formatCurrency(item.harga_satuan).replace('Rp', '').trim()}
                                                                readOnly
                                                            />
                                                        </div>
                                                        <p className="mt-1.5 text-[10.5px] font-medium text-slate-400 dark:text-slate-500">Harga tetap sesuai RKAS</p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}

                                    {availableRkasItems.length === 0 && (
                                        <p className="py-4 text-center text-[11.5px] font-medium italic text-slate-400 dark:text-slate-500">Tidak ada uraian tersedia untuk rekening ini.</p>
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
        <div className="space-y-4">
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
                    <div key={group.key} className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white dark:border-white/10 dark:bg-white/[0.02]">
                        <div className="flex items-center justify-between border-b border-brand-500/10 bg-pastel-lavender/65 px-5 py-3 dark:border-brand-400/20 dark:bg-brand-500/10">
                            <div className="flex items-center gap-2.5">
                                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-white text-[11px] font-extrabold text-brand-600 shadow-sm dark:bg-brand-500/20 dark:text-brand-300">
                                    {idx + 1}
                                </span>
                                <h4 className="text-[12.5px] font-extrabold text-slate-900 dark:text-white">
                                    Kegiatan {idx + 1}
                                </h4>
                            </div>
                            <StatusBadge tone="violet" dot={false}>Ringkasan Item</StatusBadge>
                        </div>

                        <div className="space-y-3.5 p-5">
                            <div className="space-y-1 text-[11.5px] text-slate-600 dark:text-slate-300">
                                <div>
                                    <span className="font-bold text-slate-800 dark:text-white">Kegiatan:</span> {group.activity?.kode} - {group.activity?.uraian}
                                </div>
                                <div>
                                    <span className="font-bold text-slate-800 dark:text-white">Rekening:</span> {group.account?.kode_rekening} - {group.account?.rincian_objek}
                                </div>
                            </div>

                            <div className="pt-1">
                                <div className="mb-2 text-[10.5px] font-extrabold uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">
                                    Uraian yang dipilih
                                </div>
                                <div className="space-y-2.5">
                                    {group.items.map((item: any, i: number) => (
                                        <div key={i} className="rounded-xl border border-slate-100 bg-slate-50/70 px-3.5 py-2.5 dark:border-white/5 dark:bg-white/[0.03]">
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="text-[12px] font-bold text-slate-800 dark:text-white">{item.uraian}</div>
                                                <span className="text-sikas-num shrink-0 text-[12px] font-extrabold text-slate-900 dark:text-white">
                                                    {formatCurrency(item.total)}
                                                </span>
                                            </div>
                                            <div className="mt-1 text-[10.5px] font-medium text-slate-400 dark:text-slate-500">
                                                Jumlah: <span className="text-sikas-num font-semibold text-slate-600 dark:text-slate-300">{item.volume}</span> • Harga: <span className="text-sikas-num font-semibold text-slate-600 dark:text-slate-300">{formatCurrency(item.harga_satuan)}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-3.5 flex items-center justify-end gap-2 border-t border-slate-100 pt-3 dark:border-white/5">
                                    <span className="text-[11.5px] font-bold text-slate-500 dark:text-slate-400">Total Transaksi Kotor:</span>
                                    <span className="text-sikas-num text-[14px] font-extrabold text-brand-600 dark:text-brand-300">
                                        {formatCurrency(group.items.reduce((sum: number, item: any) => sum + (item.total || 0), 0))}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                ));
            })()}

            {/* Tax Inputs - Auto Detection */}
            <div className="space-y-3.5 rounded-2xl border border-slate-100 bg-slate-50/60 p-4 dark:border-white/5 dark:bg-white/[0.02]">
                {/* Main Tax Checkbox */}
                <label className="inline-flex cursor-pointer items-center gap-2.5">
                    <input
                        type="checkbox"
                        checked={data.has_tax}
                        onChange={(e) => setData('has_tax', e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-brand-600 shadow-sm focus:ring-lime-200/60 dark:border-white/20 dark:bg-white/5"
                    />
                    <span className="text-[12px] font-bold text-slate-800 dark:text-white">Kenakan pajak pada pembelanjaan ini</span>
                </label>

                {/* Tax Card */}
                {data.has_tax && (
                    <div className="space-y-4 rounded-2xl border border-slate-200/80 bg-white p-4 dark:border-white/10 dark:bg-white/[0.02]">
                        {/* Row: Jenis Pajak + Persen + Total */}
                        <div className="grid grid-cols-1 gap-3.5 md:grid-cols-3">
                            <div>
                                <InputLabel value="Jenis Pajak" />
                                <select
                                    value={data.pajak}
                                    onChange={(e) => {
                                        setData('pajak', e.target.value);
                                        // Reset status pegawai jika bukan PPh 21
                                        if (e.target.value !== 'PPh 21') {
                                            setStatusPegawai('');
                                            setGolonganASN('');
                                        }
                                    }}
                                    className="mt-1 block w-full rounded-xl border border-slate-200/90 bg-white px-3.5 py-2.5 text-[12px] font-semibold text-slate-800 shadow-sm transition focus:border-lime-400 focus:outline-none focus:ring-4 focus:ring-lime-200/60 dark:border-white/10 dark:bg-white/5 dark:text-white"
                                >
                                    <option value="PPN">PPN</option>
                                    <option value="PPh 21">PPh 21</option>
                                    <option value="PPh 22">PPh 22</option>
                                    <option value="PPh 23">PPh 23</option>
                                    <option value="PPh 4(2)">PPh 4(2)</option>
                                </select>
                            </div>
                            <div>
                                <InputLabel value="Persen (%)" />
                                <TextInput
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="0.01"
                                    value={data.persen_pajak}
                                    onChange={(e) => setData('persen_pajak', e.target.value)}
                                    className="mt-1 text-sikas-num font-bold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                    placeholder="Isi persen pajak"
                                />
                            </div>
                            <div>
                                <InputLabel value="Total Pajak" />
                                <TextInput
                                    value={formatCurrency(data.total_pajak)}
                                    disabled
                                    className="mt-1 bg-slate-100/80 text-sikas-num font-bold dark:bg-white/[0.04]"
                                />
                            </div>
                        </div>

                        {/* PPh 21 Specific: ASN / Non-ASN */}
                        {data.pajak === 'PPh 21' && detectedTaxes.is_pph21 && (
                            <div className="border-t border-slate-100 pt-3.5 dark:border-white/5">
                                <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2">
                                    <div>
                                        <InputLabel value="Status Penerima Honor" />
                                        <select
                                            value={statusPegawai}
                                            onChange={(e) => {
                                                setStatusPegawai(e.target.value as 'ASN' | 'Non-ASN' | '');
                                                setGolonganASN('');
                                            }}
                                            className="mt-1 block w-full rounded-xl border border-slate-200/90 bg-white px-3.5 py-2.5 text-[12px] font-semibold text-slate-800 shadow-sm transition focus:border-lime-400 focus:outline-none focus:ring-4 focus:ring-lime-200/60 dark:border-white/10 dark:bg-white/5 dark:text-white"
                                        >
                                            <option value="">-- Pilih Status --</option>
                                            <option value="ASN">ASN (PNS)</option>
                                            <option value="Non-ASN">Non-ASN</option>
                                        </select>

                                        {/* Non-ASN: Info card + tarif */}
                                        {statusPegawai === 'Non-ASN' && (
                                            <div className="mt-2.5 rounded-xl border border-amber-200/70 bg-pastel-amber/70 p-3 dark:border-amber-400/20 dark:bg-amber-400/10">
                                                <div className="flex items-center justify-between gap-2">
                                                    <p className="text-[11px] font-medium text-amber-800 dark:text-amber-200">
                                                        Tarif: <strong>{data.persen_pajak}%</strong>
                                                        {data.npwp && !data.no_npwp ? ' (NPWP)' : ' (Non-NPWP — 2x)'}
                                                    </p>
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowTarifModal(true)}
                                                        className="text-[11px] font-bold text-brand-600 underline hover:text-brand-700 dark:text-brand-300 dark:hover:text-brand-200"
                                                    >
                                                        Info Pajak
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* ASN: Pilih Golongan */}
                                    {statusPegawai === 'ASN' && (
                                        <div className="rounded-xl border border-sky/20 bg-pastel-sky/60 p-3.5 dark:border-sky/20 dark:bg-sky/[0.08]">
                                            <InputLabel value="Golongan PNS" />
                                            <select
                                                value={golonganASN}
                                                onChange={(e) => setGolonganASN(e.target.value)}
                                                className="mt-1 block w-full rounded-xl border border-slate-200/90 bg-white px-3.5 py-2.5 text-[12px] font-semibold text-slate-800 shadow-sm transition focus:border-lime-400 focus:outline-none focus:ring-4 focus:ring-lime-200/60 dark:border-white/10 dark:bg-white/5 dark:text-white"
                                            >
                                                <option value="">-- Pilih Golongan --</option>
                                                <option value="Golongan I">Golongan I (0%)</option>
                                                <option value="Golongan II">Golongan II (0%)</option>
                                                <option value="Golongan III">Golongan III (5%)</option>
                                                <option value="Golongan IV">Golongan IV (15%)</option>
                                            </select>
                                            {golonganASN && (
                                                <p className="mt-2 text-[11px] font-medium text-blue-700 dark:text-blue-300">
                                                    Tarif PPh 21 untuk {golonganASN}: <strong>{data.persen_pajak}%</strong>
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Local Tax Checkbox */}
                <div className="border-t border-slate-100 pt-3 dark:border-white/5">
                    <label className="inline-flex cursor-pointer items-center gap-2.5">
                        <input
                            type="checkbox"
                            checked={data.has_local_tax}
                            onChange={(e) => setData('has_local_tax', e.target.checked)}
                            className="h-4 w-4 rounded border-slate-300 text-brand-600 shadow-sm focus:ring-lime-200/60 dark:border-white/20 dark:bg-white/5"
                        />
                        <span className="text-[12px] font-bold text-slate-800 dark:text-white">Kenakan pajak daerah pada pembelanjaan ini</span>
                    </label>
                </div>

                {/* Local Tax Card */}
                {data.has_local_tax && (
                    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 dark:border-white/10 dark:bg-white/[0.02]">
                        <div className="grid grid-cols-1 gap-3.5 md:grid-cols-3">
                            <div>
                                <InputLabel value="Jenis Pajak Daerah" />
                                <select
                                    value={data.pajak_daerah}
                                    onChange={(e) => setData('pajak_daerah', e.target.value)}
                                    className="mt-1 block w-full rounded-xl border border-slate-200/90 bg-white px-3.5 py-2.5 text-[12px] font-semibold text-slate-800 shadow-sm transition focus:border-lime-400 focus:outline-none focus:ring-4 focus:ring-lime-200/60 dark:border-white/10 dark:bg-white/5 dark:text-white"
                                >
                                    <option value="SPPD">SPPD</option>
                                    <option value="PB1">PB1</option>
                                </select>
                            </div>
                            <div>
                                <InputLabel value="Persen (%)" />
                                <TextInput
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="0.01"
                                    value={data.persen_pajak_daerah}
                                    onChange={(e) => setData('persen_pajak_daerah', e.target.value)}
                                    className="mt-1 text-sikas-num font-bold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                />
                            </div>
                            <div>
                                <InputLabel value="Total Pajak Daerah" />
                                <TextInput
                                    value={formatCurrency(data.total_pajak_daerah)}
                                    disabled
                                    className="mt-1 bg-slate-100/80 text-sikas-num font-bold dark:bg-white/[0.04]"
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

            <div className="space-y-4">
                {/* Page Header */}
                <PageHeader
                    className="animate-rise"
                    breadcrumb={[{ label: 'Dashboard' }, { label: 'Penatausahaan', href: vroute('penatausahaan.index') }, { label: 'BKU' }]}
                    title={`BKU ${bulan} ${tahun}`}
                    badge={<StatusBadge tone="violet" dot={false}>BOSP REGULER {tahun}</StatusBadge>}
                    subtitle="Buku Kas Umum per transaksi pada periode ini."
                    actions={
                        <div className="flex flex-wrap items-center justify-end gap-2">
                            {!is_closed && (
                                <button
                                    onClick={() => setIsDeleteAllBkuModalOpen(true)}
                                    className="inline-flex items-center gap-1.5 rounded-xl px-2 py-1 text-[10.5px] font-bold text-slate-400 transition hover:bg-rose-500/10 hover:text-rose-500 dark:text-slate-500 dark:hover:text-rose-300"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                    Hapus BKU
                                </button>
                            )}
                            {!is_closed && (
                                <button
                                    onClick={handleOpenArkasMonthlyModal}
                                    className="inline-flex items-center gap-2 rounded-2xl bg-mint px-4 py-2.5 text-[11.5px] font-extrabold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-emerald-600"
                                >
                                    <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                    </svg>
                                    Tarik dari ARKAS
                                </button>
                            )}
                            {!is_closed && (
                                <button
                                    onClick={() => {
                                        setIsEditMode(false);
                                        setEditingBkuId(null);
                                        reset();
                                        setIsModalOpen(true);
                                    }}
                                    className="inline-flex items-center gap-2 rounded-2xl bg-lime-400 px-4 py-2.5 text-[11.5px] font-extrabold text-slate-950 shadow-lime transition-all duration-200 hover:-translate-y-0.5 hover:bg-lime-300"
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
                                            <svg className="w-4 h-4 text-slate-500 dark:text-slate-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 20">
                                                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z" />
                                            </svg>
                                        </div>
                                        <input
                                            type="text"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            placeholder="Cari transaksi..."
                                            autoFocus
                                            className="block w-full rounded-xl border border-slate-200/90 bg-white py-2 pl-10 pr-3 text-[12px] font-semibold text-slate-800 shadow-sm transition focus:border-lime-400 focus:outline-none focus:ring-4 focus:ring-lime-200/60 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-lime-400/70 dark:focus:ring-lime-400/10"
                                        />
                                        <button
                                            onClick={() => {
                                                setIsSearchVisible(false);
                                                setSearchQuery('');
                                            }}
                                            className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
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
                                    className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-[11.5px] font-bold text-slate-700 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
                                >
                                    <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                    Cari
                                </button>
                            )}
                            <Link
                                href={vroute('penatausahaan.rekapitulasi', { tahun, bulan: bulan.toLowerCase() })}
                                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-[11.5px] font-bold text-slate-700 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
                            >
                                <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                </svg>
                                Cetak
                            </Link>
                            <button
                                onClick={is_closed ? handleReopenBku : () => setIsTutupBkuOpen(true)}
                                className={`inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-[11.5px] font-extrabold shadow-sm transition-all duration-200 hover:-translate-y-0.5 ${is_closed
                                        ? 'bg-mint text-white hover:bg-emerald-600'
                                        : 'bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100'
                                    }`}
                            >
                                {is_closed ? 'Aktifkan Kembali' : 'Tutup BKU'}
                            </button>
                        </div>
                    }
                />

                {/* Info Cards Section */}
                {is_closed ? (
                    <div className="animate-rise rounded-[26px] border border-brand-500/15 bg-gradient-to-br from-brand-500 to-brand-600 p-5 mb-6 shadow-card dark:border-brand-400/20">
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
                                <InputLabel value="Total Dibelanjakan Nontunai" className="!text-[10px] !mb-1.5 !text-white/70" />
                                <div className="w-full rounded-xl border border-white/20 bg-white/15 px-3 py-2 text-[13px] font-extrabold text-white shadow-sm text-sikas-num">
                                    {formatCurrency(totalBelanjaNonTunai)}
                                </div>
                            </div>
                            <div>
                                <InputLabel value="Total Dibelanjakan Tunai" className="!text-[10px] !mb-1.5 !text-white/70" />
                                <div className="w-full rounded-xl border border-white/20 bg-white/15 px-3 py-2 text-[13px] font-extrabold text-white shadow-sm text-sikas-num">
                                    {formatCurrency(totalBelanjaTunai)}
                                </div>
                            </div>
                            <div>
                                <InputLabel value="Pajak Wajib Lapor" className="!text-[10px] !mb-1.5 !text-white/70" />
                                <div className="w-full rounded-xl border border-white/20 bg-white/15 px-3 py-2 text-[13px] font-extrabold text-white shadow-sm text-sikas-num">
                                    {formatCurrency(totalPajakWajibLapor)}
                                </div>
                            </div>
                            <div>
                                <div className="flex items-center gap-1 mb-2">
                                    <InputLabel value="Sisa Dana Tersedia" className="!text-[10px] !text-white/70" />
                                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                    </svg>
                                </div>
                                <div className="w-full rounded-xl border border-white/20 bg-white/15 px-3 py-2 text-[13px] font-extrabold text-white shadow-sm text-sikas-num">
                                    {formatCurrency(totalDanaTersedia - totalDibelanjakanBulanIni)}
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                        <div className="animate-rise relative overflow-hidden rounded-[26px] border border-sky/10 bg-pastel-sky/40 p-5 dark:border-sky/20 dark:bg-sky/[0.06]">
                            <h3 className="mb-1 text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">TOTAL DANA TERSEDIA</h3>
                            <div className="mb-5 text-sikas-num text-[24px] font-extrabold tracking-tight text-slate-900 dark:text-white">{formatCurrency(totalDanaTersedia - totalDibelanjakanBulanIni)}</div>

                            <div className="absolute right-5 top-5 flex items-center gap-1.5 text-[10.5px] font-bold text-sky-700 dark:text-sky-300">
                                <button
                                    onClick={() => setIsTarikTunaiOpen(true)}
                                    className="rounded-xl bg-white/70 px-2.5 py-1 shadow-sm transition hover:bg-white dark:bg-white/10 dark:hover:bg-white/15"
                                >
                                    Tarik Tunai
                                </button>
                                <button
                                    onClick={() => setIsSetorTunaiOpen(true)}
                                    className="rounded-xl bg-white/70 px-2.5 py-1 shadow-sm transition hover:bg-white dark:bg-white/10 dark:hover:bg-white/15"
                                >
                                    Setor Tunai
                                </button>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="flex items-center justify-between rounded-xl border border-sky/15 bg-white px-3 py-2 dark:border-sky/20 dark:bg-white/5">
                                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Nontunai</span>
                                    <span className="text-sikas-num text-[11.5px] font-extrabold text-sky-700 dark:text-sky-300">{formatCurrency(saldoNonTunai)}</span>
                                </div>
                                <div className="flex items-center justify-between rounded-xl border border-sky/15 bg-white px-3 py-2 dark:border-sky/20 dark:bg-white/5">
                                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Tunai</span>
                                    <span className="text-sikas-num text-[11.5px] font-extrabold text-sky-700 dark:text-sky-300">{formatCurrency(saldoTunai)}</span>
                                </div>
                            </div>
                        </div>

                        <div className="sikas-card p-5">
                            <h3 className="mb-5 text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Anggaran Dibelanjakan Sampai Bulan Ini</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div>
                                    <div className="flex items-center gap-1 mb-2">
                                        <span className="text-[10.5px] font-semibold text-slate-500 dark:text-slate-400">Bisa Dibelanjakan</span>
                                        {/* Icon */}
                                    </div>
                                    <div className="rounded-xl border border-sky/10 bg-pastel-sky/50 px-3 py-2 text-sikas-num text-[12px] font-extrabold text-sky-700 dark:border-sky/20 dark:bg-sky/[0.06] dark:text-sky-300">
                                        {formatCurrency(Math.max(0, anggaranBulanIni - realSpendingThisMonth))}
                                    </div>
                                </div>
                                <div>
                                    <div className="flex items-center gap-1 mb-2">
                                        <span className="text-[10.5px] font-semibold text-slate-500 dark:text-slate-400">Sudah Dibelanjakan</span>
                                        {/* Icon */}
                                    </div>
                                    <div className="rounded-xl border border-sky/10 bg-pastel-sky/50 px-3 py-2 text-sikas-num text-[12px] font-extrabold text-sky-700 dark:border-sky/20 dark:bg-sky/[0.06] dark:text-sky-300">
                                        {formatCurrency(totalDibelanjakanSampaiBulanIni)}
                                    </div>
                                </div>
                                <div>
                                    <div className="flex items-center gap-1 mb-2">
                                        <span className="text-[10.5px] font-semibold text-slate-500 dark:text-slate-400">Bisa Dianggarkan Ulang</span>
                                        {/* Icon */}
                                    </div>
                                    <div className="rounded-xl border border-sky/10 bg-pastel-sky/50 px-3 py-2 text-sikas-num text-[12px] font-extrabold text-sky-700 dark:border-sky/20 dark:bg-sky/[0.06] dark:text-sky-300">
                                        {formatCurrency(anggaranBelumDibelanjakan)}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Tabel Transaksi BKU */}
                <div className="animate-rise" style={{ animationDelay: '80ms' }}>
                    <DataTable
                        title="Daftar Transaksi BKU"
                        subtitle="Transaksi penerimaan, penarikan, setor, dan pembelanjaan."
                        icon={
                            <IconTile tone="violet" size="sm">
                                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </IconTile>
                        }
                        actions={<StatusBadge tone="info" dot={false} className="text-sikas-num">{filteredTransactions?.length || 0}</StatusBadge>}
                        contentClassName="mx-4 mb-4"
                    >
                        <div className="overflow-x-auto overflow-y-auto max-h-[60vh] pb-32">
                            <table className="w-full text-[10pt] text-left">
                            <thead className="bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 font-semibold uppercase text-[10pt] sticky top-0 z-10">
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
                            <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                                {filteredTransactions && filteredTransactions.length > 0 ? (
                                    filteredTransactions.map((item: any, index: number) => {
                                        if (item.type === 'penerimaan') {
                                            return (
                                                <tr key={`penerimaan-${item.id}`} className="bg-pastel-sky/50 dark:bg-sky/[0.06]">
                                                    <td colSpan={8} className="px-6 py-4">
                                                        <div className="flex items-center text-slate-700 dark:text-slate-300">
                                                            <svg className="w-5 h-5 mr-3 text-slate-400 rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                                                                <button className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors p-1 rounded-full hover:bg-slate-100 dark:hover:bg-white/10">
                                                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                                                        <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                                                                    </svg>
                                                                </button>
                                                            </Dropdown.Trigger>
                                                            <Dropdown.Content align="right" width="48" contentClasses="py-1 bg-white dark:bg-[#15131F] border border-slate-200 dark:border-white/10">
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
                                                <tr key={`penarikan-${item.id}`} className="bg-pastel-sky/50 dark:bg-sky/[0.06] hover:bg-sky/10 dark:hover:bg-sky/10 transition-colors">
                                                    <td colSpan={8} className="px-6 py-4">
                                                        <div className="flex items-center text-slate-700 dark:text-slate-300">
                                                            <svg className="w-5 h-5 mr-3 text-slate-400 rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                                                                <button className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors p-1 rounded-full hover:bg-slate-100 dark:hover:bg-white/10">
                                                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                                                        <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                                                                    </svg>
                                                                </button>
                                                            </Dropdown.Trigger>
                                                            <Dropdown.Content align="right" width="48" contentClasses="py-1 bg-white dark:bg-[#15131F] border border-slate-200 dark:border-white/10">
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
                                                <tr key={`setor-${item.id}`} className="bg-pastel-mint/50 dark:bg-mint/[0.06] hover:bg-mint/10 dark:hover:bg-mint/10 transition-colors">
                                                    <td colSpan={8} className="px-6 py-4">
                                                        <div className="flex items-center text-slate-700 dark:text-slate-300">
                                                            <svg className="w-5 h-5 mr-3 text-slate-400 -rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                                                                <button className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors p-1 rounded-full hover:bg-slate-100 dark:hover:bg-white/10">
                                                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                                                        <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                                                                    </svg>
                                                                </button>
                                                            </Dropdown.Trigger>
                                                            <Dropdown.Content align="right" width="48" contentClasses="py-1 bg-white dark:bg-[#15131F] border border-slate-200 dark:border-white/10">
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
                                                <tr key={`bku-${item.id}`} className="bg-white dark:bg-[#15131F] hover:bg-slate-50 dark:hover:bg-white/10">
                                                    <td className="px-6 py-4">{item.id_transaksi || '-'}</td>
                                                    <td className="px-6 py-4">{format(new Date(item.tanggal_transaksi), 'dd/MM/yyyy')}</td>
                                                    <td className="px-6 py-4">{item.kode_kegiatan?.sub_program || '-'}</td>
                                                    <td className="px-6 py-4">{item.uraian_opsional || item.uraian || '-'}</td>
                                                    <td className="px-6 py-4 capitalize">{item.jenis_transaksi}</td>
                                                    <td className="px-6 py-4 text-right text-sikas-num font-semibold text-mint dark:text-mint">
                                                        {formatCurrency(item.total_transaksi_kotor)}
                                                    </td>
                                                    <td className="px-6 py-4 text-right text-sikas-num font-semibold text-mint dark:text-mint">
                                                        {formatCurrency(item.total_transaksi_kotor)}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        {item.total_pajak > 0 ? (
                                                            <span className={`inline-flex items-center rounded-lg px-2 py-1 text-[10pt] font-bold text-sikas-num ${item.ntpn ? 'bg-pastel-mint text-mint dark:bg-mint/10 dark:text-mint' : 'bg-pastel-rose text-rose-600 dark:bg-rose-500/10 dark:text-rose-300'}`}>
                                                                {formatCurrency(item.total_pajak)}
                                                            </span>
                                                        ) : '0'}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <Dropdown>
                                                            <Dropdown.Trigger>
                                                                <button className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors p-1 rounded-full hover:bg-slate-100 dark:hover:bg-white/10">
                                                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                                                        <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                                                                    </svg>
                                                                </button>
                                                            </Dropdown.Trigger>
                                                            <Dropdown.Content align="right" width="48" contentClasses="py-1 bg-white dark:bg-[#15131F] border border-slate-200 dark:border-white/10">

                                                                {item.total_pajak > 0 && (
                                                                    <button
                                                                        className="w-full text-left px-4 py-2 text-[10pt] text-sky-600 dark:text-sky-300 hover:bg-sky/10 dark:hover:bg-sky/10 flex items-center"
                                                                        onClick={() => openLaporPajakModal(item.id, item)}
                                                                    >
                                                                        <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                                        </svg>
                                                                        Lapor Pajak
                                                                    </button>
                                                                )}
                                                                {!is_closed && (
                                                                    <>
                                                                        <button
                                                                            className="w-full text-left px-4 py-2 text-[10pt] text-brand-600 dark:text-brand-300 hover:bg-brand-500/10 dark:hover:bg-brand-500/10 flex items-center"
                                                                            onClick={() => handleEditClick(item)}
                                                                        >
                                                                            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                                            </svg>
                                                                            Edit
                                                                        </button>
                                                                        <button
                                                                            className="w-full text-left px-4 py-2 text-[10pt] text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center"
                                                                            onClick={() => handleDeleteClick(item.id, 'bku')}
                                                                        >
                                                                            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                                            </svg>
                                                                            Hapus
                                                                        </button>
                                                                    </>
                                                                )}
                                                                <button
                                                                    className="w-full text-left px-4 py-2 text-[10pt] text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900/20 flex items-center"
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
                                    <tr>
                                        <td colSpan={9} className="p-0">
                                            <EmptyState
                                                className="border-0 bg-transparent py-9 dark:bg-transparent"
                                                title="Belum ada transaksi"
                                                description="Tambah pembelanjaan atau tarik data dari ARKAS untuk mengisi BKU."
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
                    </div>
                </DataTable>
            </div>

            </div>

            {/* Modal Tambah Pembelanjaan */}
            <Modal show={isModalOpen} onClose={closeModal} closeable={false} maxWidth="4xl">
                <div className="relative overflow-visible rounded-[26px] bg-white dark:bg-[#15131F]">
                    {/* Layer efek blur dekoratif terpisah agar popover DatePicker tidak terpotong */}
                    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[26px]">
                        <div className="absolute -right-10 -top-16 h-40 w-40 rounded-full bg-brand-500/10 blur-3xl" />
                    </div>

                    {/* Header Neo-Bento */}
                    <div className="relative flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5 dark:border-white/5">
                        <div className="flex items-center gap-3.5">
                            <IconTile tone="violet" size="lg">
                                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                                </svg>
                            </IconTile>
                            <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2.5">
                                    <h2 className="text-[15px] font-extrabold tracking-tight text-slate-900 dark:text-white">
                                        {isEditMode ? 'UPDATE Detail Pembelanjaan' : 'Isi Detail Pembelanjaan'}
                                    </h2>
                                    <StatusBadge tone="violet" dot={false}>
                                        Step {currentStep} / 3
                                    </StatusBadge>
                                </div>
                                <p className="mt-1 text-[11px] font-medium leading-relaxed text-slate-400 dark:text-slate-500">
                                    Isi detail barang atau jasa yang Anda belanjakan yang terdapat dalam 1 nota.
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={closeModal}
                            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-500 dark:hover:bg-white/5 dark:hover:text-white"
                            aria-label="Tutup"
                        >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    <div className="px-6 py-5">
                        {/* Stepper Header - Neo-Bento Pill-Bar (tetap 3 step) */}
                        <div className="relative flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3 dark:border-white/5 dark:bg-white/[0.03]">
                            <div className="pointer-events-none absolute left-10 right-10 top-1/2 hidden h-0.5 -translate-y-1/2 bg-slate-200/80 sm:block dark:bg-white/10" />
                            {steps.map((step) => {
                                const isDone = currentStep > step.number;
                                const isActive = currentStep === step.number;

                                return (
                                    <div key={step.number} className="relative z-10 flex items-center gap-2.5 bg-transparent pr-2">
                                        <div
                                            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11.5px] font-extrabold transition-all ${
                                                isDone
                                                    ? 'bg-pastel-mint text-mint ring-1 ring-mint/20 dark:bg-mint/15 dark:text-mint'
                                                    : isActive
                                                      ? 'bg-lime-400 text-slate-950 shadow-lime'
                                                      : 'border border-slate-200/90 bg-white text-slate-400 dark:border-white/10 dark:bg-[#15131F] dark:text-slate-500'
                                            }`}
                                        >
                                            {isDone ? (
                                                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                </svg>
                                            ) : (
                                                step.number
                                            )}
                                        </div>
                                        <span
                                            className={`text-[12px] tracking-tight transition-colors ${
                                                isDone
                                                    ? 'font-bold text-emerald-700 dark:text-emerald-300'
                                                    : isActive
                                                      ? 'font-extrabold text-slate-900 dark:text-white'
                                                      : 'font-semibold text-slate-400 dark:text-slate-500'
                                            }`}
                                        >
                                            {step.title}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Dynamic Form Content */}
                        <div className={`mt-4 ${currentStep === 1 ? 'overflow-visible' : 'max-h-[62vh] overflow-y-auto pr-1'}`}>
                            {currentStep === 1 && renderStep1()}
                            {currentStep === 2 && renderStep2()}
                            {currentStep === 3 && renderStep3()}
                        </div>

                        {/* Footer Actions */}
                        <div className="mt-6 flex items-center justify-end gap-2 border-t border-slate-100 pt-4 dark:border-white/5">
                            {currentStep === 1 ? (
                                <SecondaryButton onClick={closeModal}>Batal</SecondaryButton>
                            ) : (
                                <SecondaryButton onClick={prevStep}>Kembali</SecondaryButton>
                            )}

                            {currentStep < 3 ? (
                                <PrimaryButton
                                    onClick={nextStep}
                                    disabled={currentStep === 2 && (hasVolumeError || data.items.length === 0)}
                                    className={(currentStep === 2 && (hasVolumeError || data.items.length === 0)) ? 'cursor-not-allowed opacity-50' : ''}
                                >
                                    Lanjut
                                </PrimaryButton>
                            ) : (
                                <PrimaryButton
                                    className={processing ? 'cursor-wait opacity-75' : ''}
                                    onClick={submitBku}
                                    disabled={processing}
                                >
                                    {processing ? 'Menyimpan...' : 'Simpan'}
                                </PrimaryButton>
                            )}
                        </div>
                    </div>
                </div>
            </Modal>

            {/* Modal Konfirmasi Nota Kosong */}
            <Modal show={isNoteConfirmationOpen} onClose={() => setIsNoteConfirmationOpen(false)} maxWidth="md">
                <div className="p-6">
                    <div className="flex items-center gap-3 text-amber-600 mb-4">
                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <h3 className="text-[15px] font-extrabold tracking-tight text-slate-900 dark:text-white">Nomor Nota Kosong</h3>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
                        Nomor nota masih kosong, apakah Anda yakin ingin melanjutkan? 
                        <br /><br />
                        Jika lanjut, sistem akan otomatis membuat nomor nota menjadi <span className="font-bold text-sky-600 dark:text-sky-300">{generateNextBpu()}</span>.
                    </p>
                    <div className="flex justify-end gap-3">
                        <SecondaryButton onClick={() => setIsNoteConfirmationOpen(false)}>Batal</SecondaryButton>
                        <PrimaryButton onClick={handleConfirmEmptyNote} className="!bg-amber-500 hover:!bg-amber-600">Ya, Lanjut</PrimaryButton>
                    </div>
                </div>
            </Modal>

            {/* Modal Peringatan Nota Duplikat */}
            <Modal show={isDuplicateNoteModalOpen} onClose={() => setIsDuplicateNoteModalOpen(false)} maxWidth="md">
                <div className="p-6">
                    <div className="flex items-center gap-3 text-red-600 mb-4">
                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <h3 className="text-[15px] font-extrabold tracking-tight text-slate-900 dark:text-white">Nomor Nota Sudah Digunakan</h3>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
                        Nomor nota <span className="font-bold text-red-600">{data.nomor_nota}</span> sudah pernah digunakan dalam transaksi lain. Silakan gunakan nomor nota yang berbeda.
                    </p>
                    <div className="flex justify-end">
                        <PrimaryButton onClick={() => setIsDuplicateNoteModalOpen(false)} className="!bg-rose-500 hover:!bg-rose-600">
                            Mengerti
                        </PrimaryButton>
                    </div>
                </div>
            </Modal>

            {/* Modal Peringatan Belum Ada API Key DeepSeek */}
            <Modal show={isAiApiKeyModalOpen} onClose={() => setIsAiApiKeyModalOpen(false)} maxWidth="md">
                <div className="p-6">
                    <div className="mb-4 flex items-center gap-3 text-brand-600 dark:text-brand-300">
                        <div className="p-2.5 rounded-xl bg-pastel-lavender ring-1 ring-brand-500/15 dark:bg-brand-500/15 dark:ring-brand-400/25">
                            <Brain className="w-7 h-7 text-brand-600 dark:text-brand-300" />
                        </div>
                        <div>
                            <h3 className="text-[15px] font-extrabold tracking-tight text-slate-900 dark:text-white">Kunci API DeepSeek Diperlukan</h3>
                            <p className="text-xs text-slate-500">Asisten AI Penulis Uraian BKU</p>
                        </div>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">
                        {aiErrorMessage || 'Kunci API DeepSeek belum dikonfigurasi pada profil akun Anda. Silakan masukkan API Key DeepSeek Anda pada menu Profil Pengguna untuk mengaktifkan fitur Asisten AI.'}
                    </p>
                    <div className="flex justify-end gap-3">
                        <SecondaryButton onClick={() => setIsAiApiKeyModalOpen(false)}>Tutup</SecondaryButton>
                        <Link
                            href={route('profile.edit')}
                            className="inline-flex items-center gap-2 rounded-2xl bg-lime-400 px-4 py-2.5 text-[11.5px] font-extrabold text-slate-950 shadow-lime transition-all duration-200 hover:-translate-y-0.5 hover:bg-lime-300"
                        >
                            Buka Pengaturan Profil
                        </Link>
                    </div>
                </div>
            </Modal>

            {/* Modal Tarik Tunai */}
            <KasBankTransferModal
                show={isTarikTunaiOpen}
                onClose={() => setIsTarikTunaiOpen(false)}
                onSubmit={submitTarikTunai}
                processing={tarikForm.processing}
                tone="sky"
                title="Penarikan Tunai"
                subtitle="Isi sesuai dengan detail penarikan yang tertera di slip bank."
                badgeLabel="Bank → Kas Tunai"
                icon={<ArrowDownToLine />}
                balanceLabel="Saldo Non-Tunai Tersedia"
                availableBalance={saldoNonTunai}
                formattedBalance={formatCurrency(saldoNonTunai)}
                dateLabel="Tanggal Tarik Tunai"
                dateValue={tarikForm.data.tanggal_penarikan}
                onDateChange={(date) => tarikForm.setData('tanggal_penarikan', date ? format(date, 'yyyy-MM-dd') : '')}
                dateError={tarikForm.errors.tanggal_penarikan}
                amountLabel="Jumlah Penarikan"
                amountValue={tarikForm.data.jumlah_penarikan}
                onAmountChange={(e) => handleCurrencyChange(e, tarikForm, 'jumlah_penarikan')}
                onFillMax={() => tarikForm.setData('jumlah_penarikan', formatNominalInput(saldoNonTunai))}
                amountError={tarikForm.errors.jumlah_penarikan}
                startMonth={startOfActiveMonth}
                endMonth={endOfActiveMonth}
                disabledDates={disabledWithdrawalDates}
            />

            {/* Modal Setor Tunai */}
            <KasBankTransferModal
                show={isSetorTunaiOpen}
                onClose={() => setIsSetorTunaiOpen(false)}
                onSubmit={submitSetorTunai}
                processing={setorForm.processing}
                tone="mint"
                title="Setor Tunai"
                subtitle="Isi sesuai dengan detail setoran tunai ke rekening bank."
                badgeLabel="Kas Tunai → Bank"
                icon={<ArrowUpFromLine />}
                balanceLabel="Saldo Tunai Tersedia"
                availableBalance={saldoTunai}
                formattedBalance={formatCurrency(saldoTunai)}
                dateLabel="Tanggal Setor Tunai"
                dateValue={setorForm.data.tanggal_setor}
                onDateChange={(date) => setorForm.setData('tanggal_setor', date ? format(date, 'yyyy-MM-dd') : '')}
                dateError={setorForm.errors.tanggal_setor}
                amountLabel="Jumlah Setor"
                amountValue={setorForm.data.jumlah_setor}
                onAmountChange={(e) => handleCurrencyChange(e, setorForm, 'jumlah_setor')}
                onFillMax={() => setorForm.setData('jumlah_setor', formatNominalInput(saldoTunai))}
                amountError={setorForm.errors.jumlah_setor}
                startMonth={startOfActiveMonth}
                endMonth={endOfActiveMonth}
                disabledDates={disabledDepositDates}
            />

            {/* Delete Confirmation Modal */}
            < Modal show={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} maxWidth="sm" >
                <div className="p-6">
                    <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 dark:bg-red-900/30 rounded-full mb-4">
                        <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <h3 className="mb-2 text-center text-[15px] font-extrabold tracking-tight text-slate-900 dark:text-white">
                        Konfirmasi Hapus
                    </h3>
                    <p className="text-[10pt] text-center text-slate-500 dark:text-slate-400 mb-6">
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
                    <h3 className="mb-2 text-center text-[15px] font-extrabold tracking-tight text-slate-900 dark:text-white">
                        Hapus Semua Belanja BKU?
                    </h3>
                    <p className="text-[10pt] text-center text-slate-500 dark:text-slate-400 mb-6">
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
                <div className="bg-white dark:bg-[#15131F] rounded-lg">
                    <div className="p-6">
                        <h2 className="mb-4 text-[15px] font-extrabold tracking-tight text-slate-900 dark:text-white">
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
                                            className="mt-1 block w-full text-slate-900 !text-[10pt] dark:!bg-white/5 dark:text-white"
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
                                            <span className="text-slate-500 text-[10pt]">Rp</span>
                                        </div>
                                        <TextInput
                                            className="pl-7 block w-full text-slate-900 !text-[10pt]"
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
                                            <span className="text-slate-500 text-[10pt]">Rp</span>
                                        </div>
                                        <TextInput
                                            className="pl-7 block w-full text-slate-900 !text-[10pt]"
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
                        <svg className="w-6 h-6 text-mint dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                    </div>
                    <h3 className="mb-2 text-center text-[15px] font-extrabold tracking-tight text-slate-900 dark:text-white">
                        Aktifkan Kembali BKU
                    </h3>
                    <p className="text-[10pt] text-center text-slate-500 dark:text-slate-400 mb-6">
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
                    <h3 className="mb-2 text-center text-[15px] font-extrabold tracking-tight text-slate-900 dark:text-white">
                        Tidak Dapat Menghapus
                    </h3>
                    <p className="text-[10pt] text-center text-slate-500 dark:text-slate-400 mb-6">
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
                    <h2 className="mb-4 text-[15px] font-extrabold tracking-tight text-slate-900 dark:text-white">Lapor Pajak</h2>
                    <form onSubmit={submitLaporPajak}>
                        <div className="space-y-4">
                            <div>
                                <InputLabel value="Tanggal Lapor" className="!text-[10pt]" />
                                <div className="relative">
                                    <DatePicker
                                        value={data.tanggal_lapor}
                                        onChange={(date) => setData('tanggal_lapor', date ? format(date, 'yyyy-MM-dd') : '')}
                                        className="mt-1 block w-full text-slate-900 !text-[10pt] dark:!bg-white/5 dark:text-white"
                                        placeholder="Pilih tanggal"
                                        startMonth={startOfActiveMonth}
                                        disabled={[
                                            { before: startOfActiveMonth }
                                        ]}
                                    />
                                </div>
                            </div>
                            <div>
                                <InputLabel value="Kode Masa Pajak" className="!text-[10pt]" />
                                <TextInput
                                    className="mt-1 block w-full text-slate-900 !text-[10pt] dark:!bg-white/5 dark:text-white"
                                    value={data.kode_masa_pajak}
                                    onChange={(e) => setData('kode_masa_pajak', e.target.value)}
                                    required
                                    placeholder="Contoh: 122023"
                                />
                            </div>
                            <div>
                                <InputLabel value="NTPN" className="!text-[10pt]" />
                                <TextInput
                                    className="mt-1 block w-full text-slate-900 !text-[10pt] dark:!bg-white/5 dark:text-white"
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
                            <PrimaryButton disabled={isReportingTax} className="">
                                {isReportingTax ? 'Menyimpan...' : 'Simpan'}
                            </PrimaryButton>
                        </div>
                    </form>
                </div>
            </Modal>
            {/* Modal Detail Pembelanjaan */}
            <Modal show={isDetailModalOpen} onClose={() => setIsDetailModalOpen(false)} maxWidth="4xl">
                {selectedDetailItem && (
                    <div className="bg-white dark:bg-[#15131F] rounded-lg overflow-hidden">
                        {/* Header */}
                        <div className="flex items-center justify-between gap-3 rounded-t-[26px] bg-gradient-to-br from-[#2B2940] via-[#232135] to-[#191826] px-5 py-4">
                            <h2 className="text-[15px] font-extrabold tracking-tight text-white">Detail Pembelanjaan</h2>
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
                                    <div className="flex justify-between border-b border-slate-100 dark:border-white/10 pb-1">
                                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Tanggal Transaksi</p>
                                        <p className="text-sm font-medium text-slate-900 dark:text-white">
                                            {format(new Date(selectedDetailItem.tanggal_transaksi), 'd MMM yyyy')}
                                        </p>
                                    </div>
                                    <div className="flex justify-between border-b border-slate-100 dark:border-white/10 pb-1">
                                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">ID Transaksi</p>
                                        <p className="text-sm font-medium text-slate-900 dark:text-white">{selectedDetailItem.id_transaksi || '-'}</p>
                                    </div>
                                    <div className="flex justify-between border-b border-slate-100 dark:border-white/10 pb-1">
                                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Nama Penyedia / Penerima</p>
                                        <p className="text-sm font-medium text-slate-900 dark:text-white">{selectedDetailItem.nama_toko || selectedDetailItem.nama_penyedia || selectedDetailItem.nama_penyedia_barang_jasa || selectedDetailItem.nama_penerima_pembayaran || selectedDetailItem.nama_penerima || '-'}</p>
                                    </div>
                                    <div className="flex justify-between border-b border-slate-100 dark:border-white/10 pb-1">
                                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">NPWP</p>
                                        <p className="text-sm font-medium text-slate-900 dark:text-white">{selectedDetailItem.npwp || '-'}</p>
                                    </div>
                                    <div className="flex justify-between border-b border-slate-100 dark:border-white/10 pb-1">
                                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Alamat</p>
                                        <p className="text-sm font-medium text-slate-900 dark:text-white">{selectedDetailItem.alamat_toko || selectedDetailItem.alamat || '-'}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Cards: Kegiatan & Rekening */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                                <div className="border border-slate-200 dark:border-white/10 rounded-lg p-5">
                                    <h3 className="mb-3 border-b border-slate-100 pb-2 text-[12px] font-extrabold text-slate-900 dark:border-white/5 dark:text-white">
                                        Kegiatan
                                    </h3>
                                    <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                                        {selectedDetailItem.kode_kegiatan ? (
                                            `${selectedDetailItem.kode_kegiatan.kode} - ${selectedDetailItem.kode_kegiatan.uraian}`
                                        ) : '-'}
                                    </p>
                                </div>
                                <div className="border border-slate-200 dark:border-white/10 rounded-lg p-5">
                                    <h3 className="mb-3 border-b border-slate-100 pb-2 text-[12px] font-extrabold text-slate-900 dark:border-white/5 dark:text-white">
                                        Rekening Belanja
                                    </h3>
                                    <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                                        {selectedDetailItem.rekening_belanja ? (
                                            `${selectedDetailItem.rekening_belanja.kode_rekening} - ${selectedDetailItem.rekening_belanja.rincian_objek}`
                                        ) : '-'}
                                    </p>
                                </div>
                            </div>

                            {/* Table Details */}
                            <h3 className="mb-4 text-[15px] font-extrabold tracking-tight text-slate-900 dark:text-white">Detail Uraian Pembelanjaan</h3>
                            <div className="border border-slate-200 dark:border-white/10 rounded-lg overflow-hidden mb-6">
                                <table className="w-full text-sm text-left">
                                    <thead className="text-xs text-slate-500 dark:text-slate-400 uppercase bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-white/10">
                                        <tr>
                                            <th className="px-6 py-3 font-medium">Uraian</th>
                                            <th className="px-6 py-3 font-medium text-center">Volume</th>
                                            <th className="px-6 py-3 font-medium text-right text-sikas-num">Harga Satuan</th>
                                            <th className="px-6 py-3 font-medium text-right text-sikas-num">Subtotal</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                                        {selectedDetailItem.uraian_details && selectedDetailItem.uraian_details.length > 0 ? (
                                            selectedDetailItem.uraian_details.map((detail: any, index: number) => (
                                                <tr key={index} className="bg-white dark:bg-[#15131F]">
                                                    <td className="px-6 py-4 text-slate-900 dark:text-white">{detail.uraian}</td>
                                                    <td className="px-6 py-4 text-center text-slate-600 dark:text-slate-400">{detail.volume} {detail.satuan}</td>
                                                    <td className="px-6 py-4 text-right text-slate-600 dark:text-slate-400">{formatCurrency(detail.harga_satuan)}</td>
                                                    <td className="px-6 py-4 text-right text-slate-900 dark:text-white font-medium text-sikas-num">{formatCurrency(detail.volume * detail.harga_satuan)}</td>
                                                </tr>
                                            ))
                                        ) : (
                                            /* If no details, show the main item info as a single row fallback */
                                            <tr className="bg-white dark:bg-[#15131F]">
                                                <td className="px-6 py-4 text-slate-900 dark:text-white">{selectedDetailItem.uraian}</td>
                                                <td className="px-6 py-4 text-center text-slate-600 dark:text-slate-400">-</td>
                                                <td className="px-6 py-4 text-right text-slate-600 dark:text-slate-400">-</td>
                                                <td className="px-6 py-4 text-right text-slate-900 dark:text-white font-medium text-sikas-num">{formatCurrency(selectedDetailItem.total_transaksi_kotor)}</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Summary Footer */}
                            <div className="flex flex-col items-end gap-2 border-t border-slate-200 dark:border-white/10 pt-4">
                                <div className="flex justify-between w-full md:w-1/3">
                                    <span className="text-slate-500 dark:text-slate-400 uppercase text-xs font-bold tracking-wider">Total Transaksi Kotor:</span>
                                    <span className="text-slate-900 dark:text-white font-bold">{formatCurrency(selectedDetailItem.total_transaksi_kotor)}</span>
                                </div>
                                <div className="flex justify-between w-full md:w-1/3">
                                    <span className="text-slate-500 dark:text-slate-400 uppercase text-xs font-bold tracking-wider">Total Harga Bersih:</span>
                                    {/* Assuming Harga Bersih is Kotor - Pajak */}
                                    <span className="text-slate-900 dark:text-white font-bold">{formatCurrency(selectedDetailItem.total_transaksi_kotor - selectedDetailItem.total_pajak)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Modal Informasi Tarif Pajak PPh 21 — Custom overlay (bukan HeadlessUI Dialog) agar tidak ikut menutup modal induk */}
            {showTarifModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 py-6" onClick={() => setShowTarifModal(false)}>
                    <div className="absolute inset-0 bg-slate-500/75" />
                    <div
                        className="relative bg-white dark:bg-[#15131F] rounded-lg shadow-xl sm:max-w-2xl sm:w-full max-h-[85vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-6 max-h-[80vh] overflow-y-auto">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-[15px] font-extrabold tracking-tight text-slate-900 dark:text-white">Informasi Tarif Pajak</h2>
                                <button onClick={() => setShowTarifModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>

                            <div className="bg-pastel-sky/50 dark:bg-sky/[0.06] border border-sky/15 dark:border-sky/20 rounded-lg p-3 mb-4">
                                <p className="text-[10pt] text-sky-800 dark:text-sky-200">
                                    Berdasarkan <strong>PP 58 Tahun 2023</strong> dan <strong>PMK 168 Tahun 2023</strong>, terdapat penyesuaian besaran PPh 21 untuk honor.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Tarif Dengan NPWP */}
                                <div>
                                    <h3 className="text-[10pt] font-bold text-mint dark:text-mint mb-2">Tarif Non-PNS dengan NIK/NPWP</h3>
                                    <div className="border border-slate-200 dark:border-white/10 rounded-lg overflow-hidden">
                                        <table className="w-full text-[9pt]">
                                            <thead className="bg-green-50 dark:bg-green-900/30">
                                                <tr>
                                                    <th className="px-2 py-1.5 text-left font-semibold text-slate-700 dark:text-slate-300">Tarif</th>
                                                    <th className="px-2 py-1.5 text-left font-semibold text-slate-700 dark:text-slate-300">Rentang Penghasilan</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                                {TARIF_PPH21_DENGAN_NPWP.map((t, i) => (
                                                    <tr key={i} className="hover:bg-slate-50 dark:hover:bg-white/10">
                                                        <td className="px-2 py-1 font-semibold text-mint dark:text-mint">{t.rate}%</td>
                                                        <td className="px-2 py-1 text-slate-600 dark:text-slate-400">Rp {(t.min / 1000000).toFixed(1)} jt - Rp {(t.max / 1000000).toFixed(1)} jt</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* Tarif Tanpa NPWP */}
                                <div>
                                    <h3 className="text-[10pt] font-bold text-rose-600 dark:text-rose-300 mb-2">Tarif Non-PNS tanpa NIK/NPWP</h3>
                                    <div className="border border-slate-200 dark:border-white/10 rounded-lg overflow-hidden">
                                        <table className="w-full text-[9pt]">
                                            <thead className="bg-red-50 dark:bg-red-900/30">
                                                <tr>
                                                    <th className="px-2 py-1.5 text-left font-semibold text-slate-700 dark:text-slate-300">Tarif</th>
                                                    <th className="px-2 py-1.5 text-left font-semibold text-slate-700 dark:text-slate-300">Rentang Penghasilan</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                                {TARIF_PPH21_TANPA_NPWP.map((t, i) => (
                                                    <tr key={i} className="hover:bg-slate-50 dark:hover:bg-white/10">
                                                        <td className="px-2 py-1 font-semibold text-rose-600 dark:text-rose-300">{t.rate}%</td>
                                                        <td className="px-2 py-1 text-slate-600 dark:text-slate-400">Rp {(t.min / 1000000).toFixed(1)} jt - Rp {(t.max / 1000000).toFixed(1)} jt</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* Modal Tarik BKU dari ARKAS (Bulanan) */}
            <Modal show={isArkasMonthlyModalOpen} onClose={() => !pullingMonthlyBku && setIsArkasMonthlyModalOpen(false)} maxWidth="2xl">
                <div className="p-6">
                    <div className="flex items-center gap-3 border-b border-slate-100 dark:border-white/10 pb-4">
                        <div className="p-2.5 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl text-emerald-600 dark:text-emerald-400">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-[15px] font-extrabold tracking-tight text-slate-900 dark:text-white">
                                Tarik BKU Bulan {bulan} dari ARKAS
                            </h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                Tahun Anggaran {tahun} • {bulan}
                            </p>
                        </div>
                    </div>

                    <div className="mt-5">
                        {arkasMonthlyLoading ? (
                            <div className="py-12 flex flex-col items-center justify-center gap-3">
                                <div className="w-9 h-9 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                                <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">
                                    Memeriksa data BKU Bulan {bulan} di database ARKAS...
                                </p>
                            </div>
                        ) : arkasMonthlyData?.status === 'error' || !arkasMonthlyData?.exists ? (
                            <div className="py-8 text-center">
                                <div className="mx-auto w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400 mb-3">
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                </div>
                                <h4 className="text-base font-semibold text-slate-800 dark:text-slate-200 mb-1">
                                    Data BKU Bulan {bulan} Tidak Ditemukan
                                </h4>
                                <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                                    {arkasMonthlyData?.message || `Tidak ditemukan catatan transaksi BKU Bulan ${bulan} ${tahun} di database ARKAS.`}
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-5">
                                {/* Ringkasan Data ARKAS Bulan Ini */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div className="bg-brand-50/60 dark:bg-brand-950/20 border border-brand-200/60 dark:border-brand-800/40 rounded-xl p-3.5">
                                        <span className="text-[10pt] text-brand-700 dark:text-brand-300 font-medium">Belanja Kas Bulan Ini</span>
                                        <div className="text-lg font-bold text-brand-800 dark:text-brand-200 mt-1">
                                            {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(arkasMonthlyData.arkas_data.nominal_belanja || 0)}
                                        </div>
                                        <div className="text-xs text-brand-600 dark:text-brand-300 mt-0.5">
                                            {arkasMonthlyData.arkas_data.total_nota_belanja || 0} nota ({arkasMonthlyData.arkas_data.total_item_belanja || 0} item belanja)
                                        </div>
                                    </div>
                                    <div className="bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/40 rounded-xl p-3.5">
                                        <span className="text-[10pt] text-emerald-700 dark:text-emerald-300 font-medium">Status Bulan di ARKAS</span>
                                        <div className="mt-2">
                                            {arkasMonthlyData.arkas_data.is_closed ? (
                                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300">
                                                    ✓ Sudah Ditutup Buku
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300">
                                                    Draft / Belum Ditutup
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-xs text-emerald-600 dark:text-emerald-400 mt-1.5">
                                            {arkasMonthlyData.arkas_data.total_penerimaan > 0 && `${arkasMonthlyData.arkas_data.total_penerimaan} penerimaan dana • `}
                                            {arkasMonthlyData.arkas_data.total_penarikan > 0 && `${arkasMonthlyData.arkas_data.total_penarikan} tarik tunai`}
                                        </div>
                                    </div>
                                </div>

                                {/* Warning jika RKAS belum ada */}
                                {!arkasMonthlyData.has_rkas && (
                                    <div className="p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-3">
                                        <svg className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                        </svg>
                                        <div className="text-sm text-red-800 dark:text-red-300">
                                            <span className="font-bold block mb-0.5">Data RKAS Belum Tersedia</span>
                                            Penarikan BKU mewajibkan RKAS di newSIKAS sudah terisi untuk mencocokkan rincian belanja.
                                        </div>
                                    </div>
                                )}

                                {/* Warning & Konfirmasi Overwrite jika sudah ada data BKU bulan ini */}
                                {arkasMonthlyData.has_existing_data && (
                                    <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl space-y-3">
                                        <div className="flex items-start gap-3">
                                            <svg className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                            </svg>
                                            <div className="text-sm text-amber-800 dark:text-amber-300">
                                                <span className="font-bold block mb-0.5">Konfirmasi Timpa Ulang (Overwrite)</span>
                                                Di newSIKAS saat ini sudah tercatat <strong>{arkasMonthlyData.existing_counts.total} transaksi BKU</strong> pada bulan {bulan} {tahun}. Melanjutkan penarikan akan <strong>menghapus data transaksi bulan {bulan} ini</strong> dan menggantikannya dengan data resmi dari ARKAS.
                                            </div>
                                        </div>
                                        <label className="flex items-center gap-2.5 pt-2 border-t border-amber-200/80 dark:border-amber-800/80 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={isMonthlyOverwriteChecked}
                                                onChange={(e) => setIsMonthlyOverwriteChecked(e.target.checked)}
                                                className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                                            />
                                            <span className="text-xs font-semibold text-amber-900 dark:text-amber-200">
                                                Saya memahami dan menyetujui untuk menimpa ulang data BKU bulan {bulan} {tahun}.
                                            </span>
                                        </label>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="mt-6 flex flex-col items-center justify-between gap-3 border-t border-slate-100 pt-4 sm:flex-row dark:border-white/5">
                        <button
                            type="button"
                            onClick={() => {
                                setIsArkasMonthlyModalOpen(false);
                                setIsArkasAiModalOpen(true);
                            }}
                            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 dark:bg-brand-950/50 dark:text-brand-300 dark:hover:bg-brand-900/50 rounded-lg border border-brand-200 dark:border-brand-800 transition"
                        >
                            <Brain className="w-4 h-4 text-brand-600 dark:text-brand-300" />
                            Analisis Selisih AI (DeepSeek)
                        </button>
                        <div className="w-full sm:w-auto flex items-center justify-end gap-3">
                            <SecondaryButton onClick={() => setIsArkasMonthlyModalOpen(false)} disabled={pullingMonthlyBku}>
                                Batal
                            </SecondaryButton>
                            {arkasMonthlyData?.exists && arkasMonthlyData?.has_rkas && (
                                <button
                                    onClick={handleExecutePullArkasMonthly}
                                    disabled={pullingMonthlyBku || (arkasMonthlyData.has_existing_data && !isMonthlyOverwriteChecked)}
                                    className={`inline-flex items-center px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider text-white shadow-sm transition-all duration-150 ${
                                        pullingMonthlyBku || (arkasMonthlyData.has_existing_data && !isMonthlyOverwriteChecked)
                                            ? 'bg-slate-400 dark:bg-white/10 cursor-not-allowed opacity-60'
                                            : 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2'
                                    }`}
                                >
                                    {pullingMonthlyBku ? (
                                        <>
                                            <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                            Menarik BKU...
                                        </>
                                    ) : (
                                        <>
                                            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                            </svg>
                                            {arkasMonthlyData.has_existing_data ? 'Tarik & Timpa Ulang BKU' : 'Tarik BKU Sekarang'}
                                        </>
                                    )}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </Modal>

            {/* Modal Diagnosa Selisih AI ARKAS */}
            <ArkasDiagnosticModal
                isOpen={isArkasAiModalOpen}
                onClose={() => {
                    setIsArkasAiModalOpen(false);
                    setIsArkasMonthlyModalOpen(true);
                }}
                onProceedWithAction={() => {
                    setIsArkasAiModalOpen(false);
                    setIsArkasMonthlyModalOpen(true);
                }}
                actionButtonLabel="Lanjutkan ke Tarik BKU"
                tahun={tahun}
                scope="bku_month"
                context={{
                    bulan: bulan,
                    bulan_angka: ['januari','februari','maret','april','mei','juni','juli','agustus','september','oktober','november','desember'].indexOf(bulan.toLowerCase()) + 1 || 1,
                    penganggaran_id: penganggaran?.id
                }}
            />
        </AuthenticatedLayout >
    );
}
