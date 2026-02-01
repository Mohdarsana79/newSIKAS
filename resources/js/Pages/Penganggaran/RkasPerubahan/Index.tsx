import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, useForm, router } from '@inertiajs/react';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import { PageProps } from '@/types';
import { useState } from 'react';
import Modal from '@/Components/Modal';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import SearchableSelect from '@/Components/SearchableSelect';
import Dropdown from '@/Components/Dropdown';
import axios from 'axios';

interface Option {
    id: number;
    [key: string]: any;
}

interface RkasMonthAllocation {
    month: string;
    amount: string;
    quantity: string;
    unit: string;
}

interface RkasItem {
    id: number;
    program: string;
    kegiatan: string;
    rekening: string;
    uraian: string;
    dianggaran: number;
    dibelanjakan: number;
    satuan: string;
    harga: string;
    total: string;
    bulan: string;
}

interface MonthFilter {
    name: string;
    count: number;
    active: boolean;
}

interface RecordLog {
    id: number;
    action: string;
    description: string;
    created_at: string;
    elapsed: string;
}

interface Props extends Record<string, unknown> {
    anggaran: {
        id: number;
        tahun: string;
        pagu_total: string;
        sumber_dana: string;
        status: string;
        tahap_1: { periode: string; persen: string; sisa: string };
        tahap_2: { periode: string; persen: string; sisa: string };
    };
    items: RkasItem[];
    months: MonthFilter[];
    kegiatanOptions: Option[];
    rekeningOptions: Option[];
}

export default function Index({ auth, anggaran, items, months, kegiatanOptions, rekeningOptions }: PageProps<Props>) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [isDetailModal2Open, setIsDetailModal2Open] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [editId, setEditId] = useState<number | null>(null);
    const [isItemDetailModalOpen, setIsItemDetailModalOpen] = useState(false);
    const [itemDetailData, setItemDetailData] = useState<any>(null);
    const [searchQuery, setSearchQuery] = useState('');

    const [selectedMonth, setSelectedMonth] = useState<string | null>('Januari');
    const [isSisipMode, setIsSisipMode] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    // Alert Modal State
    const [isAlertModalOpen, setIsAlertModalOpen] = useState(false);
    const [alertMessage, setAlertMessage] = useState('');
    const [showValidationErrors, setShowValidationErrors] = useState(false);

    // Logs State
    const [isLogsModalOpen, setIsLogsModalOpen] = useState(false);
    const [logs, setLogs] = useState<RecordLog[]>([]);

    const handleShowLogs = async () => {
        try {
            // We need a route for logs. RkasPerubahanController has logs($id).
            // Using axios to fetch.
            // Route might not be in route() helper yet if not named or if I just added it.
            // I added 'rkas-perubahan.logs' ?? No I didn't add route name in web.php explicitly?
            // Wait, I only added `logs` method in controller. I need to add route in web.php?
            // Step 377 added `logs` METHOD.
            // I did NOT add route in web.php for logs.
            // I must add route first or use manual URL.
            // I'll assume I'll add the route `rkas-perubahan.logs` in web.php in next step or now.
            // Let's use manual URL for safety or assume route name 'rkas-perubahan.logs'.
            const response = await axios.get(`/rkas-perubahan/${anggaran.id}/logs`);
            setLogs(response.data.data);
            setIsLogsModalOpen(true);
        } catch (error) {
            console.error("Failed to fetch logs", error);
        }
    };

    const handleDetail = async (id: number) => {
        try {
            const response = await axios.get(route('rkas-perubahan.show', id));
            const data = response.data.data; // Adjusted for API response likely structure

            setItemDetailData({
                ...data,
                total_anggaran: data.bulan_data ? data.bulan_data.reduce((acc: number, curr: any) => acc + (Number(curr.jumlah) * Number(data.harga_satuan_raw || data.harga_satuan)), 0) : 0
            });

            setIsItemDetailModalOpen(true);
        } catch (error) {
            console.error("Failed to fetch detail data", error);
        }
    };


    const monthOptions = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];

    const lockedMonths = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni'];
    const isLocked = (month: string) => lockedMonths.includes(month);

    const { data, setData, post, processing, errors, reset } = useForm({
        kegiatan_id: '',
        rekening_id: '',
        uraian: '',
        harga_satuan: '',
        alokasi: [] as RkasMonthAllocation[],
    });

    const handleAddMonth = () => {
        // If there is already a first item, take its unit
        const firstUnit = data.alokasi.length > 0 ? data.alokasi[0].unit : '';

        setData('alokasi', [
            ...data.alokasi,
            { month: '', amount: '0', quantity: '', unit: firstUnit }
        ]);
    };

    const handleRemoveMonth = (index: number) => {
        const newAlokasi = [...data.alokasi];
        newAlokasi.splice(index, 1);
        setData('alokasi', newAlokasi);
    };

    const updateAllocation = (index: number, field: keyof RkasMonthAllocation, value: string) => {
        if (field === 'month' && isLocked(value)) {
            alert('Bulan Januari sampai Juni tidak dapat diubah atau ditambahkan pada RKAS Perubahan.');
            return;
        }

        const newAlokasi = [...data.alokasi];
        newAlokasi[index] = { ...newAlokasi[index], [field]: value };

        // If updating the unit of the first item, sync it to all others
        if (field === 'unit' && index === 0) {
            for (let i = 1; i < newAlokasi.length; i++) {
                newAlokasi[i].unit = value;
            }
        }

        setData('alokasi', newAlokasi);
    };

    const formatCurrency = (value: string) => {
        const number = value.replace(/\D/g, '');
        return new Intl.NumberFormat('id-ID').format(Number(number));
    };

    const handleHargaSatuanChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.replace(/\D/g, '');
        setData('harga_satuan', value);
    };

    const handleEdit = async (id: number) => {
        try {
            const response = await axios.get(route('rkas-perubahan.edit', id));
            const editData = response.data.data;

            // Transform backend data to form structure
            const transformedAlokasi = editData.bulan_data.map((item: any) => ({
                month: item.bulan,
                amount: String(item.total),
                quantity: String(item.jumlah),
                unit: item.satuan
            }));

            setData({
                kegiatan_id: String(editData.kode_id),
                rekening_id: String(editData.kode_rekening_id),
                uraian: editData.uraian,
                harga_satuan: String(Math.floor(Number(editData.harga_satuan_raw || editData.harga_satuan.replace(/\D/g, '')))),
                alokasi: transformedAlokasi
            });

            setEditId(id);
            setIsEditMode(true);
            setIsModalOpen(true);
        } catch (error) {
            console.error("Failed to fetch edit data", error);
        }
    };

    const handleSisip = async (id: number) => {
        try {
            // For Sisip, we might still fetch basic info but clear allocation
            const response = await axios.get(route('rkas-perubahan.edit', id));
            const editData = response.data.data;

            setData({
                kegiatan_id: String(editData.kode_id),
                rekening_id: String(editData.kode_rekening_id),
                uraian: '',
                harga_satuan: '',
                alokasi: []
            });

            setIsSisipMode(true);
            setIsModalOpen(true);
        } catch (error) {
            console.error("Failed to fetch sisip data", error);
        }
    };

    const handleDeleteGroup = () => {
        if (!editId) return;
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = () => {
        if (!editId) return;

        // Check if there are locked months (Jan-Jun) that must be preserved
        const preservedDetails = data.alokasi.filter(a => isLocked(a.month));

        if (preservedDetails.length > 0) {
            // If there are locked months, we perform an UPDATE to keep them and remove others
            // effectively "deleting" Jul-Dec by not including them.

            const bulan = preservedDetails.map(a => a.month);
            const jumlah = preservedDetails.map(a => Number(a.quantity));
            const satuan = preservedDetails.map(a => a.unit);

            const payload = {
                kode_id: data.kegiatan_id,
                kode_rekening_id: data.rekening_id,
                uraian: data.uraian,
                harga_satuan: Number(data.harga_satuan),
                bulan: bulan,
                jumlah: jumlah,
                satuan: satuan,
                tahun_anggaran: anggaran.tahun
            };

            router.put(route('rkas-perubahan.update', editId), payload, {
                onStart: () => setIsDeleting(true),
                onFinish: () => setIsDeleting(false),
                onSuccess: () => {
                    setIsDeleteModalOpen(false);
                    setIsModalOpen(false);
                    reset();
                    setIsEditMode(false);
                    setEditId(null);
                    // Optional: Show toast/alert? Inertia usually handles flash messages
                }
            });

        } else {
            // No locked months, safe to destroy all
            router.delete(route('rkas-perubahan.destroy-all', editId), {
                onStart: () => setIsDeleting(true),
                onFinish: () => setIsDeleting(false),
                onSuccess: () => {
                    setIsDeleteModalOpen(false);
                    setIsModalOpen(false);
                    reset();
                    setIsEditMode(false);
                    setEditId(null);
                }
            });
        }
    };

    const [isSubmitting, setIsSubmitting] = useState(false);

    const submit = (e: React.FormEvent) => {
        e.preventDefault();

        // Validasi Input Kosong pada Card Bulan
        const hasEmptyAllocation = data.alokasi.some(a => !a.quantity || !a.unit);
        if (hasEmptyAllocation) {
            setShowValidationErrors(true);
            setAlertMessage("Mohon lengkapi Jumlah dan Satuan pada bagian detail bulan.");
            setIsAlertModalOpen(true);
            return;
        }

        // 1. Validasi Bulan Ganda (Client-Side)
        const selectedMonths = data.alokasi.map(a => a.month).filter(m => m);
        const uniqueMonths = new Set(selectedMonths);
        if (selectedMonths.length !== uniqueMonths.size) {
            setAlertMessage("Terdapat bulan yang sama dipilih lebih dari satu kali. Silakan periksa kembali alokasi bulan Anda.");
            setIsAlertModalOpen(true);
            return;
        }

        // 2. Validasi Duplikat Item (Best Effort Client-Side for Uraian + Bulan)
        const duplicates = data.alokasi.some(alloc =>
            items.some(item =>
                item.uraian.toLowerCase().trim() === data.uraian.toLowerCase().trim() &&
                item.bulan === alloc.month &&
                (!isEditMode)
            )
        );

        if (duplicates && !isEditMode) {
            // Opsional: Alert spesifik
        }

        // Transform data to match backend expectation
        // Controller expects arrays: bulan[], jumlah[], satuan[]
        const bulan = data.alokasi.map(a => a.month);
        const jumlah = data.alokasi.map(a => Number(a.quantity));
        const satuan = data.alokasi.map(a => a.unit);

        const payload = {
            kode_id: data.kegiatan_id,
            kode_rekening_id: data.rekening_id,
            uraian: data.uraian,
            harga_satuan: Number(data.harga_satuan),
            bulan: bulan,
            jumlah: jumlah,
            satuan: satuan,
            tahun_anggaran: anggaran.tahun
        };

        if (isEditMode && editId) {
            router.put(route('rkas-perubahan.update', editId), payload, {
                onStart: () => setIsSubmitting(true),
                onFinish: () => setIsSubmitting(false),
                onSuccess: () => {
                    setIsModalOpen(false);
                    reset();
                    setIsEditMode(false);
                    setEditId(null);
                },
                onError: (errors) => {
                    if (errors.message) {
                        setAlertMessage(errors.message);
                        setIsAlertModalOpen(true);
                    }
                }
            });
        } else {
            router.post(route('rkas-perubahan.store'), payload, {
                onStart: () => setIsSubmitting(true),
                onFinish: () => setIsSubmitting(false),
                onSuccess: () => {
                    setIsModalOpen(false);
                    reset();
                },
                onError: (errors) => {
                    if (errors.message) {
                        setAlertMessage("Gagal Menyimpan: " + errors.message);
                        setIsAlertModalOpen(true);
                    } else if (typeof errors === 'object') {
                        const firstError = Object.values(errors)[0];
                        if (typeof firstError === 'string') {
                            setAlertMessage(firstError);
                            setIsAlertModalOpen(true);
                        }
                    }
                }
            });
        }
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setTimeout(() => {
            reset();
            setIsEditMode(false);
            setEditId(null);
            setEditId(null);
            setIsSisipMode(false);
            setShowValidationErrors(false);
        }, 200);
    };

    const totalAnggaran = data.alokasi.reduce((acc, curr) => {
        const qty = Number(curr.quantity) || 0;
        const price = Number(data.harga_satuan) || 0;
        return acc + (qty * price);
    }, 0);

    const filteredItems = items.filter(item => {
        const matchesMonth = selectedMonth ? item.bulan === selectedMonth : true;
        const query = searchQuery.toLowerCase();
        const matchesSearch = !searchQuery ||
            (item.program && item.program.toLowerCase().includes(query)) ||
            (item.kegiatan && item.kegiatan.toLowerCase().includes(query)) ||
            (item.rekening && item.rekening.toLowerCase().includes(query)) ||
            (item.uraian && item.uraian.toLowerCase().includes(query));
        return matchesMonth && matchesSearch;
    });

    const totalFiltered = filteredItems.reduce((acc, curr) => {
        const val = Number(curr.total.replace(/[^0-9,-]+/g, "").replace(",", "."));
        return acc + (isNaN(val) ? 0 : val);
    }, 0);

    return (
        <AuthenticatedLayout>
            <Head title="RKAS Perubahan Detail" />

            <div className="py-6 px-4 sm:px-6 lg:px-8 w-full mx-auto space-y-6">

                {/* Header Section */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                        <div>
                            <Link href={route('penganggaran.index')} className="inline-flex items-center text-sm text-cyan-500 font-medium mb-2 hover:underline">
                                <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                </svg>
                                Kembali ke Penganggaran
                            </Link>
                            <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">RKAS Perubahan</h1>
                            <p className="text-gray-500 text-sm mt-1">{anggaran.sumber_dana} {anggaran.tahun}</p>
                        </div>
                        <div className="flex flex-wrap gap-3">
                            <PrimaryButton
                                onClick={() => setIsModalOpen(true)}
                                className="bg-green-600 hover:bg-green-700 focus:ring-green-500 flex items-center gap-2"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                Tambah
                            </PrimaryButton>

                            {/* Tombol Perubahan Disabled or Active Style */}
                            <button disabled className="text-gray-400 cursor-not-allowed flex items-center gap-1 text-sm font-medium px-3 py-2 border border-transparent rounded bg-gray-100 dark:bg-gray-700">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                </svg>
                                Perubahan (Aktif)
                            </button>

                            <button className="text-gray-500 hover:text-gray-700 flex items-center gap-1 text-sm font-medium px-3 py-2">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                </svg>
                                Pergeseran
                            </button>

                            {/* Tombol Record / Rekaman Perubahan */}
                            <button
                                onClick={handleShowLogs}
                                className="text-gray-500 hover:text-gray-700 flex items-center gap-1 text-sm font-medium px-3 py-2"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Rekaman Perubahan
                            </button>

                            <Link href={route('rkas-perubahan.summary', anggaran.id)} className="bg-indigo-600 text-white hover:bg-indigo-700 px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 shadow-sm">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                </svg>
                                Cetak
                            </Link>
                        </div>
                    </div>

                    {/* Info Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Pagu Card */}
                        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl p-6 text-white shadow-md relative overflow-hidden">
                            <div className="relative z-10">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="p-2 bg-white/20 rounded-lg">
                                        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-lg">Pagu Dana BOSP</h3>
                                        <p className="text-indigo-100 text-xs">Total Anggaran Tahunan</p>
                                    </div>
                                </div>
                                <div className="text-3xl font-bold mb-2">Rp {anggaran.pagu_total}</div>
                                <div className="flex justify-between items-center text-xs text-indigo-100 mt-4">
                                    <span>Status: {anggaran.status}</span>
                                    <span className="bg-white/20 px-2 py-0.5 rounded text-white">{anggaran.tahun}</span>
                                </div>
                            </div>
                        </div>

                        {/* Tahap 1 Card */}
                        <div className="bg-white border border-gray-100 dark:bg-gray-700 dark:border-gray-600 rounded-xl p-6 shadow-sm relative">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-blue-100 text-blue-600 rounded-lg dark:bg-blue-900/30 dark:text-blue-400">
                                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-gray-900 dark:text-white">Anggaran Tahap 1</h3>
                                        <p className="text-gray-500 text-xs">{anggaran.tahap_1.periode}</p>
                                        <p className="text-gray-500 text-xs">(Semester 1)</p>
                                    </div>
                                </div>
                                <div className="bg-blue-500 text-white text-xs font-bold p-2 rounded-full w-15 h-15 flex items-center justify-center">
                                    {anggaran.tahap_1.persen}
                                </div>
                            </div>
                            <div className="flex justify-between items-center text-sm mb-1 mt-4">
                                <span className="text-gray-600 dark:text-gray-400 font-medium">Sisa Anggaran</span>
                                <span className="text-gray-900 dark:text-white font-bold">Rp {anggaran.tahap_1.sisa}</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-1.5 mb-4 dark:bg-gray-600">
                                <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: '100%' }}></div>
                            </div>
                        </div>

                        {/* Tahap 2 Card */}
                        <div className="bg-white border border-gray-100 dark:bg-gray-700 dark:border-gray-600 rounded-xl p-6 shadow-sm relative">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-green-100 text-green-600 rounded-lg dark:bg-green-900/30 dark:text-green-400">
                                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-gray-900 dark:text-white">Anggaran Tahap 2</h3>
                                        <p className="text-gray-500 text-xs">{anggaran.tahap_2.periode}</p>
                                        <p className="text-gray-500 text-xs">(Semester 2)</p>
                                    </div>
                                </div>
                                <div className="bg-green-500 text-white text-xs font-bold p-2 rounded-full w-15 h-15 flex items-center justify-center">
                                    {anggaran.tahap_2.persen}
                                </div>
                            </div>
                            <div className="flex justify-between items-center text-sm mb-1 mt-4">
                                <span className="text-gray-600 dark:text-gray-400 font-medium">Sisa Anggaran</span>
                                <span className="text-gray-900 dark:text-white font-bold">Rp {anggaran.tahap_2.sisa}</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-1.5 mb-4 dark:bg-gray-600">
                                <div className="bg-green-500 h-1.5 rounded-full" style={{ width: '100%' }}></div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Content Area */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
                    {/* Filter and Search Bar */}
                    <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                        <h2 className="text-xl font-bold text-gray-800 dark:text-white">Periode Anggaran {anggaran.tahun} (Perubahan)</h2>
                        <div className="flex items-center gap-4 w-full md:w-auto">
                            <div className="relative w-full md:w-64">
                                <input
                                    type="text"
                                    placeholder="Cari..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 rounded-full border border-gray-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                />
                                <svg className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>
                            <div className="text-right whitespace-nowrap">
                                <span className="text-gray-500 text-sm">Dianggarkan </span>
                                <span className="text-gray-900 dark:text-white font-bold text-lg">Rp {items.reduce((acc, curr) => acc + parseInt(curr.total.replace(/\./g, ''), 10), 0).toLocaleString('id-ID')}</span>
                            </div>
                        </div>
                    </div>

                    {/* Month Filters */}
                    <div className="flex flex-wrap gap-2 mb-6">
                        {months.map((month) => (
                            <button
                                key={month.name}
                                onClick={() => setSelectedMonth(selectedMonth === month.name ? null : month.name)}
                                className={`
                                    px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2
                                    ${selectedMonth === month.name
                                        ? 'bg-blue-500 text-white shadow-md'
                                        : 'bg-white border hover:bg-gray-50 text-gray-600 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300'
                                    }
                                `}
                            >
                                {month.name}
                            </button>
                        ))}
                    </div>

                    {/* Table */}
                    {selectedMonth ? (
                        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                <thead className="bg-blue-500 text-white sticky top-0 z-10">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider rounded-tl-lg">No</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Program Kegiatan</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Kegiatan</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Rekening Belanja</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Uraian</th>
                                        <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider">Dianggarkan</th>
                                        <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider">Dibelanjakan</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Satuan</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Harga Satuan</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Total</th>
                                        <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider rounded-tr-lg">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                    {filteredItems.length === 0 ? (
                                        <tr>
                                            <td colSpan={12} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                                                Tidak ada data untuk bulan ini
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredItems.map((item, index) => (
                                            <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition border-b border-gray-100 last:border-0">
                                                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{index + 1}</td>
                                                <td className="px-4 py-4 text-xs text-gray-900 dark:text-gray-100 font-medium max-w-[150px]">{item.program}</td>
                                                <td className="px-4 py-4 text-xs text-gray-900 dark:text-gray-100 max-w-[150px]">{item.kegiatan}</td>
                                                <td className="px-4 py-4 text-xs text-gray-900 dark:text-gray-100 max-w-[150px]">{item.rekening}</td>
                                                <td className="px-4 py-4 text-xs text-gray-900 dark:text-gray-100 max-w-[150px]">{item.uraian}</td>
                                                <td className="px-4 py-4 text-xs text-center text-gray-900 dark:text-gray-100 font-medium">{item.dianggaran}</td>
                                                <td className="px-4 py-4 text-xs text-center text-gray-900 dark:text-gray-100 font-medium">{item.dibelanjakan}</td>
                                                <td className="px-4 py-4 text-xs text-gray-900 dark:text-gray-100">{item.satuan}</td>
                                                <td className="px-4 py-4 text-xs text-gray-900 dark:text-gray-100 font-medium whitespace-nowrap">Rp {item.harga}</td>
                                                <td className="px-4 py-4 text-xs text-gray-900 dark:text-white font-bold whitespace-nowrap">Rp {item.total}</td>
                                                <td className="px-4 py-4 whitespace-nowrap text-center">
                                                    <Dropdown>
                                                        <Dropdown.Trigger>
                                                            <button className="text-gray-400 hover:text-gray-600 border border-gray-200 hover:bg-gray-50 rounded p-1">
                                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                                                                </svg>
                                                            </button>
                                                        </Dropdown.Trigger>
                                                        <Dropdown.Content contentClasses="py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg">
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.preventDefault();
                                                                    e.stopPropagation();
                                                                    handleEdit(item.id);
                                                                }}
                                                                className="flex items-center gap-2 px-4 py-2 text-sm leading-5 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 w-full text-left transition duration-150 ease-in-out focus:outline-none"
                                                            >
                                                                <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                                </svg>
                                                                Edit
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.preventDefault();
                                                                    e.stopPropagation();
                                                                    handleDetail(item.id);
                                                                }}
                                                                className="flex items-center gap-2 px-4 py-2 text-sm leading-5 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 w-full text-left transition duration-150 ease-in-out focus:outline-none"
                                                            >
                                                                <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                                </svg>
                                                                Detail
                                                            </button>
                                                            <Dropdown.Link as="button" href="#" onClick={(e) => {
                                                                e.preventDefault();
                                                                handleSisip(item.id);
                                                            }} className="flex items-center gap-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 w-full text-left">
                                                                <svg className="w-4 h-4 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                                                </svg>
                                                                Sisip Uraian
                                                            </Dropdown.Link>
                                                        </Dropdown.Content>
                                                    </Dropdown>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                    {/* Footer Row */}
                                    {filteredItems.length > 0 && (
                                        <tr className="bg-cyan-50 dark:bg-cyan-900/20 font-bold border-t-2 border-cyan-100 sticky bottom-0 z-10">
                                            <td colSpan={10} className="px-4 py-3 text-right text-sm text-gray-800 dark:text-white">Total:</td>
                                            <td colSpan={2} className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                                                Rp {new Intl.NumberFormat('id-ID').format(totalFiltered)}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    ) : null}
                </div>
            </div>
            {/* Modal Tambah RKAS */}
            <Modal show={isModalOpen} onClose={() => { if (!isAlertModalOpen && !isDeleteModalOpen) closeModal(); }} maxWidth="2xl">
                {/* Modal Header */}
                <div className={`flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700 ${isEditMode ? 'bg-indigo-600' : isSisipMode ? 'bg-white dark:bg-gray-800' : 'bg-white dark:bg-gray-800'}`}>
                    <h2 className={`text-lg font-medium ${isEditMode ? 'text-white' : 'text-gray-900 dark:text-gray-100'}`}>
                        {isEditMode ? 'Edit Data RKAS Perubahan' : isSisipMode ? 'Isi Detail Anggaran Kegiatan' : 'Tambah RKAS Perubahan'}
                    </h2>

                    <div className="flex items-center gap-3">
                        {isEditMode && (
                            <button
                                type="button"
                                onClick={handleDeleteGroup}
                                className="bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded transition-colors text-xs font-bold flex items-center gap-1"
                            >
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                Hapus Semua
                            </button>
                        )}
                        <button onClick={closeModal} className={`text-gray-400 hover:text-gray-500 focus:outline-none ${isEditMode ? 'text-white/70 hover:text-white' : ''}`}>
                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                <div className="p-6 bg-white dark:bg-gray-800 max-h-[80vh] overflow-y-auto">
                    <form onSubmit={submit} className="space-y-6">
                        {/* Kegiatan */}
                        <div>
                            <InputLabel value="Kegiatan" className="text-gray-700 dark:text-gray-300 mb-1" required />
                            <SearchableSelect
                                value={data.kegiatan_id}
                                onChange={(val) => setData('kegiatan_id', String(val))}
                                options={kegiatanOptions}
                                searchFields={['kode', 'program', 'sub_program', 'uraian', 'name']}
                                displayColumns={[
                                    { header: 'KODE', field: 'kode', width: 'w-24 font-bold' },
                                    { header: 'PROGRAM', field: 'program', width: 'w-1/4' },
                                    { header: 'SUB PROGRAM', field: 'sub_program', width: 'w-1/4' },
                                    { header: 'URAIAN', field: 'uraian', width: 'flex-1 font-semibold' },
                                ]}
                                placeholder="-- Pilih Kegiatan --"
                                labelRenderer={(opt) => {
                                    const code = opt.kode || opt.code || '-';
                                    const name = opt.uraian || opt.name || '-';
                                    return `${code} - ${name}`;
                                }}
                                error={errors.kegiatan_id}
                                className={`w-full ${isSisipMode ? 'opacity-50 pointer-events-none' : ''}`}
                            />
                        </div>

                        {/* Rekening Belanja */}
                        <div>
                            <InputLabel value="Rekening Belanja" className="text-gray-700 dark:text-gray-300 mb-1" required />
                            <SearchableSelect
                                value={data.rekening_id}
                                onChange={(val) => setData('rekening_id', String(val))}
                                options={rekeningOptions}
                                searchFields={['kode_rekening', 'rincian_objek', 'code', 'name']}
                                displayColumns={[
                                    { header: 'KODE REKENING', field: 'kode_rekening', width: 'w-32 font-bold' },
                                    { header: 'RINCIAN OBJEK', field: 'rincian_objek', width: 'flex-1' },
                                    { header: 'KATEGORI', field: 'kategori', width: 'w-32 text-xs' },
                                ]}
                                placeholder="-- Pilih Rekening Belanja --"
                                labelRenderer={(opt) => {
                                    const code = opt.kode_rekening || opt.code || '-';
                                    const name = opt.rincian_objek || opt.name || '-';
                                    return `${code} - ${name}`;
                                }}
                                error={errors.rekening_id}
                                className={`w-full ${isSisipMode ? 'opacity-50 pointer-events-none' : ''}`}
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Uraian */}
                            <div>
                                <InputLabel value="Uraian" className="text-gray-700 dark:text-gray-300 mb-1" required />
                                <textarea
                                    className="w-full border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 focus:border-indigo-500 focus:ring-indigo-500 rounded-md shadow-sm h-[42px] py-2"
                                    placeholder="Jelaskan detail barang atau jasa yang akan diadakan..."
                                    value={data.uraian}
                                    onChange={(e) => setData('uraian', e.target.value)}
                                />
                                {errors.uraian && <div className="text-red-500 text-sm mt-1">{errors.uraian}</div>}
                            </div>

                            {/* Harga Satuan */}
                            <div>
                                <InputLabel value="Harga Satuan" className="text-gray-700 dark:text-gray-300 mb-1" required />
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <span className="text-gray-500 sm:text-sm">Rp</span>
                                    </div>
                                    <TextInput
                                        className="pl-9 w-full text-gray-900 dark:text-gray-900"
                                        value={formatCurrency(data.harga_satuan)}
                                        onChange={handleHargaSatuanChange}
                                        placeholder="0"
                                    />
                                </div>
                                {errors.harga_satuan && <div className="text-red-500 text-sm mt-1">{errors.harga_satuan}</div>}
                            </div>
                        </div>

                        {/* Alokasi Bulan Section */}
                        {/* Alokasi Bulan Section */}
                        <div>
                            <div className="flex justify-between items-center mb-3">
                                <span className="font-medium text-gray-900 dark:text-gray-100">Di Anggarkan untuk bulan</span>
                                <span className="font-bold text-indigo-600 dark:text-indigo-400">Total Anggaran : Rp {new Intl.NumberFormat('id-ID').format(totalAnggaran)}</span>
                            </div>
                            {errors.alokasi && <div className="text-red-500 text-xs mb-2">{errors.alokasi}</div>}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Allocated Months */}
                                {data.alokasi.map((alloc, index) => (
                                    <div key={index} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 relative group">
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveMonth(index)}
                                            className={`absolute -top-2 -right-2 rounded-full p-1 shadow-md transition-colors z-10 
                                                ${isLocked(alloc.month) ? 'bg-gray-400 cursor-not-allowed hidden' : 'bg-red-500 hover:bg-red-600 text-white'}`}
                                            disabled={isLocked(alloc.month)}
                                        >
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>

                                        <div className="grid grid-cols-2 gap-3 mb-3">
                                            <select
                                                className={`w-full border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 text-sm rounded-md shadow-sm h-9 py-1 ${isLocked(alloc.month) ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                                                value={alloc.month}
                                                onChange={(e) => updateAllocation(index, 'month', e.target.value)}
                                                disabled={isLocked(alloc.month)}
                                            >
                                                <option value="">Pilih Bulan</option>
                                                {monthOptions.map(m => (
                                                    <option key={m} value={m} disabled={isLocked(m)}>{m}</option>
                                                ))}
                                            </select>
                                            <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md flex items-center justify-end px-3 text-sm text-gray-600 dark:text-gray-400">
                                                Rp {new Intl.NumberFormat('id-ID').format(
                                                    (Number(alloc.quantity) || 0) * (Number(data.harga_satuan) || 0)
                                                )}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="relative">
                                                <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                                                    <span className="text-gray-400 text-xs">$</span>
                                                </div>
                                                <input
                                                    type="text"
                                                    className={`pl-5 w-full text-sm rounded-md shadow-sm h-9
                                                        ${isLocked(alloc.month)
                                                            ? 'bg-gray-100 text-gray-500 cursor-not-allowed border-gray-300 dark:border-gray-700'
                                                            : (showValidationErrors && !alloc.quantity
                                                                ? 'border-red-500 focus:border-red-500 focus:ring-red-500 bg-red-50 dark:bg-red-900/10'
                                                                : 'border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300')
                                                        }
                                                    `}
                                                    placeholder="Jumlah"
                                                    value={alloc.quantity}
                                                    onChange={(e) => updateAllocation(index, 'quantity', e.target.value.replace(/\D/g, ''))}
                                                    disabled={isLocked(alloc.month)}
                                                />
                                            </div>
                                            <input
                                                type="text"
                                                className={`w-full text-sm rounded-md shadow-sm h-9 
                                                    ${index > 0 ? 'bg-gray-100 dark:bg-gray-800 text-gray-500 cursor-not-allowed border-gray-300 dark:border-gray-700' :
                                                        (showValidationErrors && !alloc.unit
                                                            ? 'border-red-500 focus:border-red-500 focus:ring-red-500 bg-red-50 dark:bg-red-900/10 dark:text-gray-300'
                                                            : 'border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300')
                                                    }
                                                `}
                                                placeholder="Satuan"
                                                value={alloc.unit}
                                                onChange={(e) => updateAllocation(index, 'unit', e.target.value)}
                                                readOnly={index > 0}
                                            />
                                        </div>
                                    </div>
                                ))}

                                {/* Add Month Button */}
                                {data.alokasi.length < 12 && (
                                    <button
                                        type="button"
                                        onClick={handleAddMonth}
                                        className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg flex flex-col items-center justify-center p-6 text-gray-500 hover:text-indigo-600 hover:border-indigo-300 dark:hover:text-indigo-400 dark:hover:border-indigo-700 transition-colors min-h-[140px]"
                                    >
                                        <svg className="w-6 h-6 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                        </svg>
                                        <span className="text-sm font-medium">+ Tambah Bulan</span>
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-6 border-t border-gray-200 dark:border-gray-700">
                            <SecondaryButton onClick={closeModal} type="button">
                                Batal
                            </SecondaryButton>

                            <PrimaryButton className={isEditMode ? 'bg-amber-500 hover:bg-amber-600 focus:ring-amber-500' : ''} disabled={processing || isSubmitting}>
                                {isEditMode ? (
                                    <>
                                        {isSubmitting ? (
                                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                        ) : (
                                            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                        )}
                                        {isSubmitting ? 'Updating...' : 'Update Data'}
                                    </>
                                ) : isSisipMode ? (
                                    isSubmitting ? 'Menambahkan...' : 'Masukkan ke Anggaran'
                                ) : (
                                    isSubmitting ? 'Menyimpan...' : 'Simpan Data'
                                )}
                            </PrimaryButton>
                        </div>
                    </form>
                </div>
            </Modal>
            {/* Modal Konfirmasi Hapus */}
            <Modal show={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} maxWidth="md">
                <div className="p-6">
                    <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                        Konfirmasi Hapus
                    </h2>
                    <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
                        {data.alokasi.some(a => isLocked(a.month))
                            ? "Data bulan Januari-Juni tidak akan dihapus. Apakah Anda yakin ingin menghapus alokasi bulan Juli-Desember?"
                            : "Apakah Anda yakin ingin menghapus semua data dalam kelompok kegiatan ini? Tindakan ini tidak dapat dibatalkan."}
                    </p>
                    <div className="mt-6 flex justify-end gap-3">
                        <button
                            onClick={() => setIsDeleteModalOpen(false)}
                            className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-md text-sm font-medium transition-colors dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                        >
                            Batal
                        </button>
                        <button
                            onClick={confirmDelete}
                            disabled={isDeleting}
                            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2"
                        >
                            {isDeleting ? 'Menghapus...' : 'Hapus Semua'}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Modal Logs */}
            <Modal show={isLogsModalOpen} onClose={() => setIsLogsModalOpen(false)} maxWidth="2xl">
                <div className="p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                            Riwayat Perubahan RKAS
                        </h2>
                        <button onClick={() => setIsLogsModalOpen(false)} className="text-gray-400 hover:text-gray-500">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    <div className="overflow-y-auto max-h-[500px]">
                        {logs.length === 0 ? (
                            <p className="text-center text-gray-500 py-4">Belum ada riwayat perubahan.</p>
                        ) : (
                            <ul className="space-y-4">
                                {logs.map((log) => (
                                    <li key={log.id} className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <span className={`inline-block px-2 py-1 text-xs font-semibold rounded-md mb-2 
                                                    ${log.action === 'create' ? 'bg-green-100 text-green-800' :
                                                        log.action === 'update' ? 'bg-blue-100 text-blue-800' :
                                                            log.action === 'delete' ? 'bg-red-100 text-red-800' :
                                                                log.action === 'copy' ? 'bg-purple-100 text-purple-800' :
                                                                    'bg-gray-100 text-gray-800'}`}>
                                                    {log.action.toUpperCase()}
                                                </span>
                                                <p className="text-sm text-gray-800 dark:text-gray-200">{log.description}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xs text-gray-500 dark:text-gray-400">{log.created_at}</p>
                                                <p className="text-xs text-gray-400 dark:text-gray-500">{log.elapsed}</p>
                                            </div>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    <div className="mt-6 flex justify-end">
                        <SecondaryButton onClick={() => setIsLogsModalOpen(false)}>
                            Tutup
                        </SecondaryButton>
                    </div>
                </div>
            </Modal>



            {/* Modal Detail Item */}
            <Modal show={isItemDetailModalOpen} onClose={() => setIsItemDetailModalOpen(false)} maxWidth="4xl">
                {itemDetailData && (
                    <div className="flex flex-col h-full">
                        {/* Header */}
                        <div className="bg-purple-600 px-6 py-4 flex justify-between items-center rounded-t-lg">
                            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                                Detail Data RKAS
                            </h2>
                            <button onClick={() => setIsItemDetailModalOpen(false)} className="text-white/80 hover:text-white transition-colors">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto max-h-[80vh]">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                                {/* Left Column: Informasi Kegiatan */}
                                <div className="space-y-4">
                                    <h3 className="text-gray-700 font-semibold flex items-center gap-2 mb-4">
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        Informasi Kegiatan
                                    </h3>

                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 mb-1">Program Kegiatan</label>
                                        <div className="w-full px-3 py-2 bg-white border border-gray-200 rounded-md text-sm text-gray-700">
                                            {itemDetailData.kode_kegiatan?.program || '-'}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 mb-1">Kegiatan</label>
                                        <div className="w-full px-3 py-2 bg-white border border-gray-200 rounded-md text-sm text-gray-700">
                                            {itemDetailData.kode_kegiatan?.sub_program || '-'}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 mb-1">Rekening Belanja</label>
                                        <div className="w-full px-3 py-2 bg-white border border-gray-200 rounded-md text-sm text-gray-700">
                                            {itemDetailData.rekening_belanja ?
                                                `${itemDetailData.rekening_belanja.kode_rekening} - ${itemDetailData.rekening_belanja.rincian_objek}` : '-'}
                                        </div>
                                    </div>
                                </div>

                                {/* Right Column: Informasi Anggaran */}
                                <div className="space-y-4">
                                    <h3 className="text-gray-700 font-semibold flex items-center gap-2 mb-4">
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        Informasi Anggaran
                                    </h3>

                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 mb-1">Uraian</label>
                                        <div className="w-full px-3 py-2 bg-white border border-gray-200 rounded-md text-sm text-gray-700">
                                            {itemDetailData.uraian}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 mb-1">Harga Satuan</label>
                                        <div className="w-full px-3 py-2 bg-white border border-gray-200 rounded-md text-sm text-gray-700">
                                            Rp {new Intl.NumberFormat('id-ID').format(itemDetailData.harga_satuan)}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 mb-1">Total Anggaran</label>
                                        <div className="w-full px-3 py-2 bg-white border border-gray-200 rounded-md text-sm text-blue-600 font-bold">
                                            Rp {new Intl.NumberFormat('id-ID').format(itemDetailData.total_anggaran)}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Monthly Allocations Section */}
                            <div className="border border-gray-200 rounded-lg overflow-hidden">
                                <div className="bg-purple-600 px-4 py-3 flex justify-between items-center text-white">
                                    <div className="flex items-center gap-2 font-medium">
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                        Di Anggarkan untuk bulan
                                    </div>
                                    <div className="text-sm font-bold">
                                        Total Anggaran : Rp {new Intl.NumberFormat('id-ID').format(itemDetailData.total_anggaran)}
                                    </div>
                                </div>
                                <div className="bg-gray-100 p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {itemDetailData.bulan_data && itemDetailData.bulan_data.map((bulan: any, idx: number) => (
                                        <div key={idx} className="bg-white rounded-lg p-3 shadow-sm border border-gray-200">
                                            <div className="flex justify-between items-center mb-3">
                                                <span className="text-sm font-medium text-gray-700 w-1/2 border border-gray-300 rounded px-2 py-1">{bulan.bulan}</span>
                                                <span className="text-sm font-bold text-green-600 w-1/2 text-right border border-gray-100 bg-gray-50 rounded px-2 py-1">Rp {new Intl.NumberFormat('id-ID').format(bulan.total)}</span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2">
                                                <div>
                                                    <label className="text-[10px] text-gray-400 block mb-0.5">Jumlah</label>
                                                    <div className="text-sm border border-gray-200 rounded px-2 py-1 text-gray-700">{bulan.jumlah}</div>
                                                </div>
                                                <div>
                                                    <label className="text-[10px] text-gray-400 block mb-0.5">Satuan</label>
                                                    <div className="text-sm border border-gray-200 rounded px-2 py-1 text-gray-700 truncate">{bulan.satuan}</div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {(!itemDetailData.bulan_data || itemDetailData.bulan_data.length === 0) && (
                                        <div className="col-span-full text-center text-gray-500 py-4">
                                            Tidak ada alokasi bulan.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-4 border-t border-gray-200 bg-white flex justify-end rounded-b-lg">
                            <button
                                onClick={() => setIsItemDetailModalOpen(false)}
                                className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-colors"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                                Tutup
                            </button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Modal Alert Validasi */}
            <Modal show={isAlertModalOpen} onClose={() => setIsAlertModalOpen(false)} maxWidth="sm">
                <div className="p-6">
                    <div className="flex items-center gap-3 mb-4 text-red-600 dark:text-red-400">
                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <h2 className="text-lg font-bold">
                            Peringatan Validasi
                        </h2>
                    </div>
                    <p className="text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
                        {alertMessage}
                    </p>
                    <div className="flex justify-end">
                        <SecondaryButton onClick={() => setIsAlertModalOpen(false)} className="bg-gray-100 hover:bg-gray-200 text-gray-800 border-gray-300">
                            Tutup
                        </SecondaryButton>
                    </div>
                </div>
            </Modal>
        </AuthenticatedLayout>
    );
}
