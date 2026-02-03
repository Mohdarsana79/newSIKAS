import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, useForm, router } from '@inertiajs/react';
import DangerButton from '@/Components/DangerButton';
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

interface Props extends Record<string, unknown> {
    anggaran: {
        id: number;
        has_perubahan: boolean;
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

    // Copy Previous Year Logic
    const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);
    const [copyModalData, setCopyModalData] = useState<any>(null);
    const [isCopying, setIsCopying] = useState(false);

    const handleCopyPreviousYear = async () => {
        try {
            const response = await axios.post(route('rkas.check-previous-perubahan'), {
                tahun: anggaran.tahun
            });

            if (response.data.success && response.data.has_previous_perubahan) {
                setCopyModalData(response.data);
                setIsCopyModalOpen(true);
            } else {
                setAlertMessage(response.data.message || 'Tidak ada data tahun sebelumnya.');
                setIsAlertModalOpen(true);
            }
        } catch (error: any) {
            setAlertMessage('Gagal mengecek data tahun sebelumnya: ' + (error.response?.data?.message || error.message));
            setIsAlertModalOpen(true);
        }
    };

    const confirmCopy = async () => {
        setIsCopying(true);
        try {
            const response = await axios.post(route('rkas.copy-previous-perubahan'), {
                tahun_anggaran: anggaran.tahun
            });

            if (response.data.success) {
                setIsCopyModalOpen(false);
                setAlertMessage(`Berhasil menyalin ${response.data.copied_count} data dari tahun sebelumnya.`);
                setIsAlertModalOpen(true);
                // Refresh data manually since we used axios
                router.reload();
            } else {
                setAlertMessage('Gagal menyalin: ' + response.data.message);
                setIsCopyModalOpen(false);
                setIsAlertModalOpen(true);
            }
        } catch (error: any) {
            console.error(error);
            setAlertMessage('Terjadi kesalahan: ' + (error.response?.data?.message || error.message || 'Unknown error'));
            setIsCopyModalOpen(false);
            setIsAlertModalOpen(true);
        } finally {
            setIsCopying(false);
        }
    };

    // Perubahan State
    const [isPerubahanModalOpen, setIsPerubahanModalOpen] = useState(false);
    const [isProcessingPerubahan, setIsProcessingPerubahan] = useState(false);

    // Alert Modal State
    const [isAlertModalOpen, setIsAlertModalOpen] = useState(false);
    const [alertMessage, setAlertMessage] = useState('');
    const [showValidationErrors, setShowValidationErrors] = useState(false);

    const handlePerubahanClick = () => {
        if (anggaran.has_perubahan) {
            router.visit(route('rkas-perubahan.index', anggaran.id));
        } else {
            setIsPerubahanModalOpen(true);
        }
    };

    const confirmPerubahan = () => {
        router.post(route('rkas-perubahan.salin'), {
            penganggaran_id: anggaran.id
        }, {
            onStart: () => setIsProcessingPerubahan(true),
            onFinish: () => setIsProcessingPerubahan(false),
            onSuccess: () => {
                setIsPerubahanModalOpen(false);
                // Optional: Redirect to Rkas Perubahan View immediately
                router.visit(route('rkas-perubahan.index', anggaran.id));
            }
        });
    };

    const handleDetail = async (id: number) => {
        try {
            const response = await axios.get(route('rkas.getEditData', id));
            const data = response.data;

            setItemDetailData({
                ...data,
                total_anggaran: data.alokasi.reduce((acc: number, curr: any) => acc + (Number(curr.quantity) * Number(data.harga_satuan)), 0)
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
            const response = await axios.get(route('rkas.getEditData', id));
            const editData = response.data;

            setData({
                kegiatan_id: editData.kegiatan_id,
                rekening_id: editData.rekening_id,
                uraian: editData.uraian,
                harga_satuan: String(Math.floor(Number(editData.harga_satuan))),
                alokasi: editData.alokasi
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
            const response = await axios.get(route('rkas.getEditData', id));
            const editData = response.data;

            setData({
                kegiatan_id: editData.kegiatan_id,
                rekening_id: editData.rekening_id,
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

        router.delete(route('rkas.destroyGroup'), {
            data: { id: editId },
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

        if (isEditMode && editId) {
            router.post(route('rkas.updateGroup'), {
                ...data,
                original_id: editId
            } as any, {
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
            post(route('rkas.store', anggaran.id), {
                onSuccess: () => {
                    setIsModalOpen(false);
                    reset();
                },
                onError: (errors) => {
                    // Menangkap error dari server (Duplicate data)
                    if (errors.message) {
                        setAlertMessage("Gagal Menyimpan: " + errors.message);
                        setIsAlertModalOpen(true);
                    } else if (errors[0]) {
                        setAlertMessage(errors[0]);
                        setIsAlertModalOpen(true);
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

    const tahap1Items = items.filter(i => ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni'].includes(i.bulan));
    const tahap2Items = items.filter(i => ['Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'].includes(i.bulan));

    return (
        <AuthenticatedLayout>
            <Head title="RKAS Detail" />

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
                            <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">Rencana Kegiatan Anggaran Sekolah (RKAS)</h1>
                            <p className="text-gray-500 text-sm mt-1">{anggaran.sumber_dana} {anggaran.tahun}</p>
                        </div>
                        <div className="flex flex-wrap gap-3">
                            {!anggaran.has_perubahan && (
                                <>
                                    <PrimaryButton
                                        onClick={() => setIsModalOpen(true)}
                                        className="bg-green-600 hover:bg-green-700 focus:ring-green-500 flex items-center gap-2"
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                        </svg>
                                        Tambah
                                    </PrimaryButton>
                                    {items.length === 0 && (
                                        <button
                                            onClick={handleCopyPreviousYear}
                                            className="bg-indigo-600 hover:bg-indigo-700 text-white focus:ring-indigo-500 flex items-center gap-2 px-4 py-2 rounded-md font-semibold text-xs uppercase tracking-widest hover:bg-gray-700 active:bg-gray-900 focus:outline-none focus:border-gray-900 focus:ring ring-gray-300 disabled:opacity-25 transition ease-in-out duration-150"
                                        >
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                            </svg>
                                            Salin
                                        </button>
                                    )}
                                </>
                            )}
                            <button
                                onClick={handlePerubahanClick}
                                className={`flex items-center gap-1 text-sm font-medium px-3 py-2 ${anggaran.has_perubahan ? 'text-orange-600 hover:text-orange-700 bg-orange-50 rounded-md border border-orange-200' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                </svg>
                                {anggaran.has_perubahan ? 'Lihat Perubahan' : 'Buat Perubahan'}
                            </button>
                            {/* <button className="text-gray-500 hover:text-gray-700 flex items-center gap-1 text-sm font-medium px-3 py-2">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                </svg>
                                Pergeseran
                            </button> */}
                            <Link href={route('rkas.summary', anggaran.id)} className="bg-indigo-600 text-white hover:bg-indigo-700 px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 shadow-sm">
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
                            {/* <button
                                onClick={() => setIsDetailModalOpen(true)}
                                className="bg-blue-400 text-white text-xs font-medium px-4 py-1.5 rounded-md hover:bg-blue-500 flex items-center gap-1"
                            >
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                                Detail
                            </button> */}
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
                            {/* <button
                                onClick={() => setIsDetailModal2Open(true)}
                                className="bg-green-500 text-white text-xs font-medium px-4 py-1.5 rounded-md hover:bg-green-600 flex items-center gap-1"
                            >
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                                Detail
                            </button> */}
                        </div>
                    </div>
                </div>

                {/* Content Area */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
                    {/* Filter and Search Bar */}
                    <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                        <h2 className="text-xl font-bold text-gray-800 dark:text-white">Periode Anggaran {anggaran.tahun}</h2>
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
                    {/* Table - Only show when a month is selected */}

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
                                                            {!anggaran.has_perubahan && (
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
                                                            )}
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
                                                            {!anggaran.has_perubahan && (
                                                                <Dropdown.Link as="button" href="#" onClick={(e) => {
                                                                    e.preventDefault();
                                                                    handleSisip(item.id);
                                                                }} className="flex items-center gap-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 w-full text-left">
                                                                    <svg className="w-4 h-4 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                                                    </svg>
                                                                    Sisip Uraian
                                                                </Dropdown.Link>
                                                            )}
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
                        {isEditMode ? 'Edit Data RKAS' : isSisipMode ? 'Isi Detail Anggaran Kegiatan' : 'Tambah RKAS'}
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
                                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600 transition-colors z-10"
                                        >
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>

                                        <div className="grid grid-cols-2 gap-3 mb-3">
                                            <select
                                                className="w-full border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 text-sm rounded-md shadow-sm h-9 py-1"
                                                value={alloc.month}
                                                onChange={(e) => updateAllocation(index, 'month', e.target.value)}
                                            >
                                                <option value="">Pilih Bulan</option>
                                                {monthOptions.map(m => (
                                                    <option key={m} value={m}>{m}</option>
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
                                                        ${showValidationErrors && !alloc.quantity
                                                            ? 'border-red-500 focus:border-red-500 focus:ring-red-500 bg-red-50 dark:bg-red-900/10'
                                                            : 'border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300'
                                                        }`}
                                                    placeholder="Jumlah"
                                                    value={alloc.quantity}
                                                    onChange={(e) => updateAllocation(index, 'quantity', e.target.value.replace(/\D/g, ''))}
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
                                    processing ? 'Menambahkan...' : 'Masukkan ke Anggaran'
                                ) : (
                                    processing ? 'Menyimpan...' : 'Simpan'
                                )}
                            </PrimaryButton>
                        </div>
                    </form>
                </div>
            </Modal>

            {/* Modal Konfirmasi Hapus */}
            <Modal show={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} maxWidth="sm">
                <div className="p-6">
                    <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                        Konfirmasi Hapus
                    </h2>
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                        Apakah Anda yakin ingin menghapus <strong>SEMUA</strong> data untuk kegiatan ini? Tindakan ini tidak dapat dibatalkan.
                    </p>
                    <div className="mt-6 flex justify-end gap-3">
                        <SecondaryButton onClick={() => setIsDeleteModalOpen(false)} disabled={isDeleting}>
                            Batal
                        </SecondaryButton>
                        <DangerButton onClick={confirmDelete} disabled={isDeleting} className="flex items-center gap-2">
                            {isDeleting ? (
                                <>
                                    <svg className="animate-spin -ml-1 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Menghapus...
                                </>
                            ) : (
                                'Ya, Hapus Semua'
                            )}
                        </DangerButton>
                    </div>
                </div>
            </Modal>

            {/* Modal Detail Tahap 1 */}
            <Modal show={isDetailModalOpen} onClose={() => setIsDetailModalOpen(false)} maxWidth="6xl">
                <div className="flex justify-between items-center p-4 bg-indigo-600 rounded-t-lg">
                    <h2 className="text-lg font-medium text-white flex items-center gap-2">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        Detail Tahap 1 (Januari - Juni) - Tahun {anggaran.tahun}
                    </h2>
                    <button onClick={() => setIsDetailModalOpen(false)} className="text-white hover:text-indigo-200">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="p-6 bg-white dark:bg-gray-800 max-h-[80vh] overflow-y-auto">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-700">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">No</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Program Kegiatan</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Kegiatan</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Rekening Belanja</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Uraian</th>
                                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Bulan</th>
                                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Dianggaran</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Satuan</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Harga Satuan</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Total</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                {tahap1Items.length === 0 ? (
                                    <tr><td colSpan={10} className="text-center py-4 text-gray-500 dark:text-gray-400">Tidak ada data untuk periode ini</td></tr>
                                ) : (
                                    tahap1Items.map((item, index) => (
                                        <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition">
                                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{index + 1}</td>
                                            <td className="px-4 py-4 text-xs text-gray-700 dark:text-gray-300 max-w-[150px]">{item.program}</td>
                                            <td className="px-4 py-4 text-xs text-gray-600 dark:text-gray-400 max-w-[150px]">{item.kegiatan}</td>
                                            <td className="px-4 py-4 text-xs text-gray-600 dark:text-gray-400 max-w-[150px]">{item.rekening}</td>
                                            <td className="px-4 py-4 text-xs text-gray-600 dark:text-gray-400 max-w-[150px]">{item.uraian}</td>
                                            <td className="px-4 py-4 text-center">
                                                <span className="bg-cyan-400 text-white text-xs px-2 py-1 rounded-md">{item.bulan}</span>
                                            </td>
                                            <td className="px-4 py-4 text-xs text-center text-gray-900 dark:text-gray-300 font-medium">{item.dianggaran}</td>
                                            <td className="px-4 py-4 text-xs text-gray-600 dark:text-gray-400">{item.satuan}</td>
                                            <td className="px-4 py-4 text-xs text-gray-900 dark:text-gray-300 font-medium whitespace-nowrap">Rp {item.harga}</td>
                                            <td className="px-4 py-4 text-xs text-gray-900 dark:text-white font-bold whitespace-nowrap">Rp {item.total}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700 mt-4">
                        <SecondaryButton onClick={() => setIsDetailModalOpen(false)}>
                            Tutup
                        </SecondaryButton>
                    </div>
                </div>
            </Modal>

            {/* Modal Detail Tahap 2 */}
            <Modal show={isDetailModal2Open} onClose={() => setIsDetailModal2Open(false)} maxWidth="6xl">
                <div className="flex justify-between items-center p-4 bg-purple-600 rounded-t-lg">
                    <h2 className="text-lg font-medium text-white flex items-center gap-2">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        Detail Tahap 2 (Juli - Desember) - Tahun {anggaran.tahun}
                    </h2>
                    <button onClick={() => setIsDetailModal2Open(false)} className="text-white hover:text-purple-200">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="p-6 bg-white dark:bg-gray-800 max-h-[80vh] overflow-y-auto">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-700">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">No</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Program Kegiatan</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Kegiatan</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Rekening Belanja</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Uraian</th>
                                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Bulan</th>
                                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Dianggaran</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Satuan</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Harga Satuan</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Total</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                {tahap2Items.length === 0 ? (
                                    <tr><td colSpan={10} className="text-center py-4 text-gray-500 dark:text-gray-400">Tidak ada data untuk periode ini</td></tr>
                                ) : (
                                    tahap2Items.map((item, index) => (
                                        <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition">
                                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{index + 1}</td>
                                            <td className="px-4 py-4 text-xs text-gray-700 dark:text-gray-300 max-w-[150px]">{item.program}</td>
                                            <td className="px-4 py-4 text-xs text-gray-600 dark:text-gray-400 max-w-[150px]">{item.kegiatan}</td>
                                            <td className="px-4 py-4 text-xs text-gray-600 dark:text-gray-400 max-w-[150px]">{item.rekening}</td>
                                            <td className="px-4 py-4 text-xs text-gray-600 dark:text-gray-400 max-w-[150px]">{item.uraian}</td>
                                            <td className="px-4 py-4 text-center">
                                                <span className="bg-green-600 text-white text-xs px-2 py-1 rounded-md">{item.bulan}</span>
                                            </td>
                                            <td className="px-4 py-4 text-xs text-center text-gray-900 dark:text-gray-300 font-medium">{item.dianggaran}</td>
                                            <td className="px-4 py-4 text-xs text-gray-600 dark:text-gray-400">{item.satuan}</td>
                                            <td className="px-4 py-4 text-xs text-gray-900 dark:text-gray-300 font-medium whitespace-nowrap">Rp {item.harga}</td>
                                            <td className="px-4 py-4 text-xs text-gray-900 dark:text-white font-bold whitespace-nowrap">Rp {item.total}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700 mt-4">
                        <SecondaryButton onClick={() => setIsDetailModal2Open(false)}>
                            Tutup
                        </SecondaryButton>
                    </div>
                </div>
            </Modal>
            {/* Modal Detail Item RKAS */}
            <Modal show={isItemDetailModalOpen} onClose={() => setIsItemDetailModalOpen(false)} maxWidth="4xl">
                {itemDetailData && (
                    <>
                        {/* Header */}
                        <div className="flex justify-between items-center p-4 bg-purple-600 rounded-t-lg">
                            <h2 className="text-lg font-medium text-white flex items-center gap-2">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                                Detail Data RKAS
                            </h2>
                            <button onClick={() => setIsItemDetailModalOpen(false)} className="text-white hover:text-purple-200 focus:outline-none">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="p-6 bg-white dark:bg-gray-800 max-h-[80vh] overflow-y-auto space-y-6">

                            {/* Top Section: Info Columns */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Informasi Kegiatan */}
                                <div className="space-y-4">
                                    <h3 className="flex items-center gap-2 font-medium text-gray-700 dark:text-gray-200">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        Informasi Kegiatan
                                    </h3>
                                    <div className="p-4 border border-gray-100 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900/50 space-y-4">
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 mb-1">Program Kegiatan</label>
                                            <div className="p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded text-sm text-gray-900 dark:text-gray-100">
                                                {itemDetailData.program_nama}
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 mb-1">Kegiatan</label>
                                            <div className="p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded text-sm text-gray-900 dark:text-gray-100">
                                                {itemDetailData.kegiatan_nama}
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 mb-1">Rekening Belanja</label>
                                            <div className="p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded text-sm text-gray-900 dark:text-gray-100">
                                                {itemDetailData.rekening_nama}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Informasi Anggaran */}
                                <div className="space-y-4">
                                    <h3 className="flex items-center gap-2 font-medium text-gray-700 dark:text-gray-200">
                                        <span className="font-bold text-gray-500">$</span>
                                        Informasi Anggaran
                                    </h3>
                                    <div className="p-4 border border-gray-100 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900/50 space-y-4">
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 mb-1">Uraian</label>
                                            <div className="p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded text-sm text-gray-900 dark:text-gray-100">
                                                {itemDetailData.uraian}
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 mb-1">Harga Satuan</label>
                                            <div className="p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded text-sm text-gray-900 dark:text-gray-100">
                                                Rp {new Intl.NumberFormat('id-ID').format(Number(itemDetailData.harga_satuan))}
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 mb-1">Total Anggaran</label>
                                            <div className="p-2 bg-white dark:bg-gray-800 border border-blue-200 dark:border-blue-900 rounded text-sm text-blue-600 dark:text-blue-400 font-bold">
                                                Rp {new Intl.NumberFormat('id-ID').format(itemDetailData.total_anggaran)}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Monthly Allocations */}
                            <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                                <div className="bg-indigo-500 p-3 flex justify-between items-center text-white">
                                    <div className="flex items-center gap-2">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                        <span className="font-medium text-sm">Di Anggarkan untuk bulan</span>
                                    </div>
                                    <span className="font-bold text-sm">Total Anggaran : Rp {new Intl.NumberFormat('id-ID').format(itemDetailData.total_anggaran)}</span>
                                </div>

                                <div className="p-4 bg-gray-50 dark:bg-gray-900 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {itemDetailData.alokasi.map((alloc: any, index: number) => (
                                        <div key={index} className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 flex gap-3 items-center">
                                            <div className="w-1/3">
                                                <div className="p-2 border border-gray-300 dark:border-gray-600 rounded text-xs text-center font-medium text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700">
                                                    {alloc.month}
                                                </div>
                                            </div>
                                            <div className="w-2/3 space-y-1">
                                                <div className="text-xs font-bold text-green-600 dark:text-green-400 text-right">
                                                    Rp {new Intl.NumberFormat('id-ID').format(Number(alloc.quantity) * Number(itemDetailData.harga_satuan))}
                                                </div>
                                                <div className="flex gap-2">
                                                    <div className="w-1/2 p-1.5 border border-gray-200 dark:border-gray-700 rounded bg-gray-50 dark:bg-gray-900 text-xs text-center text-gray-900 dark:text-gray-100">
                                                        {alloc.quantity}
                                                    </div>
                                                    <div className="w-1/2 p-1.5 border border-gray-200 dark:border-gray-700 rounded bg-gray-50 dark:bg-gray-900 text-xs text-center text-gray-500 truncate">
                                                        {alloc.unit}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="flex justify-end gap-3 p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 rounded-b-lg">
                            <SecondaryButton onClick={() => setIsItemDetailModalOpen(false)}>
                                Tutup
                            </SecondaryButton>
                        </div>
                    </>
                )}
            </Modal>
            {/* Modal Konfirmasi Perubahan */}
            <Modal show={isPerubahanModalOpen} onClose={() => setIsPerubahanModalOpen(false)} maxWidth="md">
                <div className="p-6">
                    <div className="mb-5 flex justify-center">
                        <div className="bg-orange-100 p-3 rounded-full text-orange-500">
                            <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                    </div>
                    <h2 className="text-xl font-bold text-center text-gray-900 dark:text-gray-100 mb-2">
                        Konfirmasi Perubahan RKAS
                    </h2>

                    <p className="text-center text-sm text-gray-600 dark:text-gray-400 mb-6">
                        Anda akan membuat RKAS Perubahan. Data dari RKAS Awal akan disalin sebagai draft perubahan. Lanjutkan?
                    </p>

                    <div className="mt-6 flex justify-center gap-3">
                        <SecondaryButton onClick={() => setIsPerubahanModalOpen(false)} disabled={isProcessingPerubahan}>
                            Batal
                        </SecondaryButton>

                        <PrimaryButton
                            onClick={confirmPerubahan}
                            disabled={isProcessingPerubahan}
                            className="bg-orange-600 hover:bg-orange-700 focus:ring-orange-500"
                        >
                            {isProcessingPerubahan ? 'Memproses...' : 'Ya, Buat Perubahan'}
                        </PrimaryButton>
                    </div>
                </div>
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

            {/* Modal Konfirmasi Salin Data */}
            <Modal show={isCopyModalOpen} onClose={() => setIsCopyModalOpen(false)} maxWidth="md">
                <div className="p-6">
                    <div className="mb-5 flex justify-center">
                        <div className="bg-indigo-100 p-3 rounded-full text-indigo-500">
                            <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                            </svg>
                        </div>
                    </div>
                    <h2 className="text-xl font-bold text-center text-gray-900 dark:text-gray-100 mb-2">
                        Salin RKAS Perubahan Tahun Lalu
                    </h2>

                    <p className="text-center text-sm text-gray-600 dark:text-gray-400 mb-6">
                        {copyModalData && (
                            <>
                                Apakah Anda yakin ingin menyalin <b>SEMUA</b> data RKAS Perubahan Tahun <b>{copyModalData.previous_year}</b> ke Tahun Anggaran <b>{copyModalData.current_year}</b>?
                                <br /><br />
                                <span className="text-xs text-gray-500">
                                    Catatan: Data yang sudah ada (duplikat) tidak akan disalin ulang.
                                </span>
                            </>
                        )}
                    </p>

                    <div className="mt-6 flex justify-center gap-3">
                        <SecondaryButton onClick={() => setIsCopyModalOpen(false)} disabled={isCopying}>
                            Batal
                        </SecondaryButton>

                        <PrimaryButton
                            onClick={confirmCopy}
                            disabled={isCopying}
                            className="bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500"
                        >
                            {isCopying ? 'Menyalin...' : 'Ya, Salin Data'}
                        </PrimaryButton>
                    </div>
                </div>
            </Modal>
        </AuthenticatedLayout>
    );
}
