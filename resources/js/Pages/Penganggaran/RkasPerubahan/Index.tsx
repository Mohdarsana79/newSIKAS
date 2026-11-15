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
import DataTable from '@/Components/ui/DataTable';
import EmptyState from '@/Components/ui/EmptyState';
import IconTile from '@/Components/ui/IconTile';
import PageHeader from '@/Components/ui/PageHeader';
import StatusBadge from '@/Components/ui/StatusBadge';
import Surface from '@/Components/ui/Surface';

interface Option {
    id: number;
    [key: string]: any;
}

interface RkasMonthAllocation {
    month: string;
    amount: string;
    quantity: string;
    unit: string;
    spent?: number; // Added for real-time validation
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
    routePrefix?: string;
}

export default function Index({ auth, anggaran, items, months, kegiatanOptions, rekeningOptions, routePrefix = '' }: PageProps<Props>) {
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

    // Pull ARKAS State & Handler
    const [isArkasModalOpen, setIsArkasModalOpen] = useState(false);
    const [arkasPreviewData, setArkasPreviewData] = useState<any>(null);
    const [isCheckingArkas, setIsCheckingArkas] = useState(false);
    const [isPullingArkas, setIsPullingArkas] = useState(false);
    const [confirmOverwrite, setConfirmOverwrite] = useState(false);

    const handleCheckArkas = async () => {
        setIsCheckingArkas(true);
        try {
            const response = await axios.get(route(`${routePrefix || ''}rkas-perubahan.check-arkas`, anggaran.id));
            if (response.data.status === 'success') {
                if (response.data.exists) {
                    if (response.data.has_bku_tahap2) {
                        setAlertMessage('Tidak dapat menarik data ARKAS karena sudah terdapat transaksi belanja pada Buku Kas Umum (BKU) bulan Juli - Desember. Hapus transaksi belanja BKU pada periode tersebut terlebih dahulu.');
                        setIsAlertModalOpen(true);
                        return;
                    }
                    setConfirmOverwrite(false);
                    setArkasPreviewData(response.data);
                    setIsArkasModalOpen(true);
                } else {
                    setAlertMessage(response.data.message || `Tidak ditemukan data RKAS Perubahan yang disetujui di ARKAS untuk tahun ${anggaran.tahun}.`);
                    setIsAlertModalOpen(true);
                }
            } else {
                setAlertMessage('Gagal mengecek data ARKAS: ' + (response.data.message || 'Terjadi kesalahan'));
                setIsAlertModalOpen(true);
            }
        } catch (error: any) {
            setAlertMessage('Gagal menghubungi engine ARKAS: ' + (error.response?.data?.message || error.message));
            setIsAlertModalOpen(true);
        } finally {
            setIsCheckingArkas(false);
        }
    };

    const confirmPullArkas = () => {
        if (arkasPreviewData?.current_rkas_count > 0 && !confirmOverwrite) {
            setAlertMessage('Harap centang persetujuan penimpaan (overwrite) untuk melanjutkan penarikan data.');
            setIsAlertModalOpen(true);
            return;
        }

        setIsPullingArkas(true);
        router.post(route(`${routePrefix || ''}rkas-perubahan.pull-arkas`, anggaran.id), {
            overwrite: confirmOverwrite,
        }, {
            onSuccess: () => {
                setIsArkasModalOpen(false);
            },
            onError: (errors) => {
                if (errors.message) {
                    setAlertMessage(errors.message);
                    setIsAlertModalOpen(true);
                }
            },
            onFinish: () => {
                setIsPullingArkas(false);
            }
        });
    };

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
            const response = await axios.get(route(`${routePrefix || ''}rkas-perubahan.logs`, anggaran.id));
            setLogs(response.data.data);
            setIsLogsModalOpen(true);
        } catch (error) {
            console.error("Failed to fetch logs", error);
        }
    };

    const handleDetail = async (id: number) => {
        try {
            const response = await axios.get(route(`${routePrefix}rkas-perubahan.show`, id));
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

        if (field === 'quantity') {
            const spent = newAlokasi[index].spent || 0;
            const newQty = Number(value);

            if (newQty < spent) {
                setAlertMessage(`Tidak Dapat Melakukan Perubahan. Anggaran bulan ${newAlokasi[index].month} sudah terpakai sebanyak ${spent} di BKU!`);
                setIsAlertModalOpen(true);
                return; // Jangan update state, biarkan nilai tetap di angka sebelumnya
            } else {
                newAlokasi[index].quantity = value;
            }
        } else {
            newAlokasi[index] = { ...newAlokasi[index], [field]: value };
        }

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
            const response = await axios.get(route(`${routePrefix}rkas-perubahan.edit`, id));
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
                alokasi: editData.bulan_data.map((item: any) => ({
                    month: item.bulan,
                    amount: String(item.total),
                    quantity: String(item.jumlah),
                    unit: item.satuan,
                    spent: item.spent || 0
                }))
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
            const response = await axios.get(route(`${routePrefix}rkas-perubahan.edit`, id));
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

        // Validasi instan: jika ada bulan yang sudah dibelanjakan
        const hasSpent = data.alokasi.some(a => (a.spent || 0) > 0);
        if (hasSpent) {
            setAlertMessage("Tidak Dapat Melakukan Perubahan, Karena Sudah Dibelanjakan Pada BKU. Hapus Belanja Ini Pada BKU Terlebih Dahulu Agar Dapat Melakukan Update Data.");
            setIsAlertModalOpen(true);
            return;
        }

        setIsDeleteModalOpen(true);
    };

    const confirmDelete = () => {
        if (!editId) return;

        // Dalam RKAS Perubahan, seluruh bulan (Tahap 1 maupun Tahap 2) dapat dihapus selama belum dibelanjakan di BKU
        router.delete(route(`${routePrefix}rkas-perubahan.destroy-all`, editId), {
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
            router.put(route(`${routePrefix}rkas-perubahan.update`, editId), payload, {
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
            router.post(route(`${routePrefix}rkas-perubahan.store`), payload, {
                onStart: () => setIsSubmitting(true),
                onFinish: () => setIsSubmitting(false),
                onSuccess: () => {
                    setIsModalOpen(false);
                    reset();
                    setIsSisipMode(false);
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

            <div className="space-y-4">
                {/* Header halaman */}
                <PageHeader
                    className="animate-rise"
                    breadcrumb={[
                        { label: 'Dashboard' },
                        { label: 'Penganggaran' },
                        { label: 'RKAS Perubahan' },
                    ]}
                    title="RKAS Perubahan"
                    badge={
                        <StatusBadge tone="warning">
                            Perubahan
                        </StatusBadge>
                    }
                    subtitle={
                        <span className="flex flex-wrap items-center gap-2">
                            <span>{anggaran.sumber_dana} {anggaran.tahun}</span>
                            <span className="text-slate-300 dark:text-slate-700">·</span>
                            <Link
                                href={route(`${routePrefix}penganggaran.index`)}
                                className="inline-flex items-center gap-1 font-bold text-brand-600 transition hover:text-brand-700 dark:text-brand-300 dark:hover:text-brand-200"
                            >
                                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                </svg>
                                Kembali ke Penganggaran
                            </Link>
                        </span>
                    }
                    actions={
                        <>
                            <PrimaryButton
                                onClick={() => {
                                    reset();
                                    setIsEditMode(false);
                                    setIsSisipMode(false);
                                    setEditId(null);
                                    setIsModalOpen(true);
                                }}
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                Tambah
                            </PrimaryButton>

                            <button
                                onClick={handleCheckArkas}
                                disabled={isCheckingArkas}
                                className="inline-flex items-center gap-1.5 rounded-2xl border border-emerald-200 bg-pastel-mint px-3.5 py-2.5 text-[11px] font-extrabold text-emerald-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-emerald-400/20 dark:bg-mint/10 dark:text-emerald-300 dark:hover:bg-mint/15"
                            >
                                {isCheckingArkas ? (
                                    <svg className="animate-spin h-4 w-4 text-emerald-600 dark:text-emerald-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                ) : (
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                    </svg>
                                )}
                                Tarik dari ARKAS
                            </button>

                            {/* Tombol Perubahan Disabled or Active Style */}
                            <button disabled className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-2xl bg-slate-100 px-3.5 py-2.5 text-[11px] font-extrabold text-slate-400 dark:bg-white/5 dark:text-slate-500">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                </svg>
                                Perubahan (Aktif)
                            </button>

                            {/* Tombol Record / Rekaman Perubahan */}
                            <button
                                onClick={handleShowLogs}
                                className="inline-flex items-center gap-1.5 rounded-2xl px-3.5 py-2.5 text-[11px] font-extrabold text-slate-500 transition hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-white"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Rekaman Perubahan
                            </button>

                            <Link
                                href={route(`${routePrefix}rkas-perubahan.summary`, anggaran.id)}
                                className="inline-flex items-center gap-1.5 rounded-2xl bg-slate-900 px-3.5 py-2.5 text-[11px] font-extrabold text-white shadow-pill transition hover:-translate-y-0.5 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                </svg>
                                Cetak
                            </Link>
                        </>
                    }
                />

                {/* Kartu ringkas */}
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {/* Pagu Card */}
                    <div className="group sikas-card sikas-card-hover animate-rise relative overflow-hidden p-4" style={{ animationDelay: '60ms' }}>
                        <div className="flex items-center gap-2.5">
                            <IconTile tone="violet" size="md" className="transition-transform duration-300 group-hover:scale-110">
                                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                                </svg>
                            </IconTile>
                            <div className="min-w-0">
                                <p className="text-[11.5px] font-extrabold tracking-tight text-slate-900 dark:text-white">Pagu Dana BOSP</p>
                                <p className="text-[9.5px] font-medium text-slate-400 dark:text-slate-500">Total Anggaran Tahunan</p>
                            </div>
                        </div>
                        <p className="mt-3 truncate text-sikas-num text-[19px] font-extrabold tracking-tight text-slate-900 dark:text-white">Rp {anggaran.pagu_total}</p>
                        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2.5 dark:border-white/5">
                            <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">Status: {anggaran.status}</span>
                            <span className="inline-flex items-center rounded-lg bg-slate-100 px-2 py-1 text-[9px] font-bold text-slate-500 dark:bg-white/5 dark:text-slate-400">{anggaran.tahun}</span>
                        </div>
                    </div>

                    {/* Tahap 1 Card */}
                    <div className="group sikas-card sikas-card-hover animate-rise relative overflow-hidden p-4" style={{ animationDelay: '110ms' }}>
                        <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2.5">
                                <IconTile tone="sky" size="md" className="transition-transform duration-300 group-hover:scale-110">
                                    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
                                        <path d="M9 3h6v4H9z" />
                                        <path d="M9 12h6M9 16h4" />
                                    </svg>
                                </IconTile>
                                <div className="min-w-0">
                                    <p className="text-[11.5px] font-extrabold tracking-tight text-slate-900 dark:text-white">Anggaran Tahap 1</p>
                                    <p className="text-[9.5px] font-medium text-slate-400 dark:text-slate-500">{anggaran.tahap_1.periode}</p>
                                    <p className="text-[9.5px] font-medium text-slate-400 dark:text-slate-500">(Semester 1)</p>
                                </div>
                            </div>
                            <span className="inline-flex h-7 min-w-7 shrink-0 items-center justify-center rounded-full bg-sky px-2 text-[9.5px] font-extrabold text-white shadow-sm">{anggaran.tahap_1.persen}</span>
                        </div>
                        <div className="mt-3 flex items-center justify-between gap-2 text-[11px]">
                            <span className="font-semibold text-slate-400 dark:text-slate-500">Sisa Anggaran</span>
                            <span className="text-sikas-num font-extrabold text-slate-900 dark:text-white">Rp {anggaran.tahap_1.sisa}</span>
                        </div>
                        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
                            <div className="h-1.5 rounded-full bg-gradient-to-r from-sky to-brand-500" style={{ width: '100%' }}></div>
                        </div>
                    </div>

                    {/* Tahap 2 Card */}
                    <div className="group sikas-card sikas-card-hover animate-rise relative overflow-hidden p-4 md:col-span-2 xl:col-span-1" style={{ animationDelay: '160ms' }}>
                        <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2.5">
                                <IconTile tone="mint" size="md" className="transition-transform duration-300 group-hover:scale-110">
                                    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </IconTile>
                                <div className="min-w-0">
                                    <p className="text-[11.5px] font-extrabold tracking-tight text-slate-900 dark:text-white">Anggaran Tahap 2</p>
                                    <p className="text-[9.5px] font-medium text-slate-400 dark:text-slate-500">{anggaran.tahap_2.periode}</p>
                                    <p className="text-[9.5px] font-medium text-slate-400 dark:text-slate-500">(Semester 2)</p>
                                </div>
                            </div>
                            <span className="inline-flex h-7 min-w-7 shrink-0 items-center justify-center rounded-full bg-mint px-2 text-[9.5px] font-extrabold text-white shadow-sm">{anggaran.tahap_2.persen}</span>
                        </div>
                        <div className="mt-3 flex items-center justify-between gap-2 text-[11px]">
                            <span className="font-semibold text-slate-400 dark:text-slate-500">Sisa Anggaran</span>
                            <span className="text-sikas-num font-extrabold text-slate-900 dark:text-white">Rp {anggaran.tahap_2.sisa}</span>
                        </div>
                        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
                            <div className="h-1.5 rounded-full bg-gradient-to-r from-mint to-emerald-400" style={{ width: '100%' }}></div>
                        </div>
                    </div>
                </div>

                {/* Toolbar filter & pencarian */}
                <div className="animate-rise" style={{ animationDelay: '170ms' }}>
                    <Surface padding="sm">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5">
                                <IconTile tone="ink" size="sm">
                                    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                                        <rect x="3" y="4" width="18" height="18" rx="3" />
                                        <path d="M16 2v4M8 2v4M3 10h18" />
                                    </svg>
                                </IconTile>
                                <div className="min-w-0">
                                    <h2 className="text-[12.5px] font-extrabold tracking-tight text-slate-900 dark:text-white">Periode Anggaran {anggaran.tahun} (Perubahan)</h2>
                                    <p className="text-[9.5px] font-medium text-slate-400 dark:text-slate-500">
                                        {filteredItems.length} baris data{selectedMonth ? ` · ${selectedMonth}` : ''}
                                    </p>
                                </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                <div className="relative w-full md:w-64">
                                    <input
                                        type="text"
                                        placeholder="Cari..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full rounded-xl border border-slate-200/90 bg-white py-2 pl-9 pr-3 text-[11.5px] font-semibold text-slate-800 shadow-sm transition placeholder:text-slate-400 focus:border-lime-400 focus:outline-none focus:ring-4 focus:ring-lime-200/60 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-lime-400/70 dark:focus:ring-lime-400/10"
                                    />
                                    <svg className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                </div>
                                <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-right dark:border-white/5 dark:bg-white/5">
                                    <span className="block text-[9px] font-extrabold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">Dianggarkan </span>
                                    <span className="block text-sikas-num text-[12px] font-extrabold text-slate-900 dark:text-white">Rp {items.reduce((acc, curr) => acc + parseInt(curr.total.replace(/\./g, ''), 10), 0).toLocaleString('id-ID')}</span>
                                </div>
                            </div>
                        </div>

                        {/* Month Filters */}
                        <div className="mt-3 flex flex-wrap gap-1.5">
                            {months.map((month) => (
                                <button
                                    key={month.name}
                                    onClick={() => setSelectedMonth(selectedMonth === month.name ? null : month.name)}
                                    className={`
                                        rounded-xl px-3 py-1.5 text-[10.5px] font-extrabold transition
                                        ${selectedMonth === month.name
                                            ? 'bg-lime-400 text-slate-950 shadow-lime'
                                            : 'bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:bg-white/5 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white'
                                        }
                                    `}
                                >
                                    {month.name}
                                </button>
                            ))}
                        </div>
                    </Surface>
                </div>

                {/* Tabel RKAS Perubahan */}
                <div className="animate-rise" style={{ animationDelay: '220ms' }}>
                    {selectedMonth ? (
                        <DataTable
                            title="Daftar RKAS Perubahan"
                            subtitle={`Periode ${selectedMonth} ${anggaran.tahun}`}
                            icon={
                                <IconTile tone="sky" size="sm">
                                    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M4 6h16M4 12h16M4 18h10" />
                                    </svg>
                                </IconTile>
                            }
                            actions={
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-pastel-sky px-2.5 py-1 text-[9.5px] font-extrabold text-sky dark:bg-sky/10 dark:text-sky">
                                    {filteredItems.length} baris
                                </span>
                            }
                            contentClassName="bento-table-wrapper mx-3 mb-3"
                        >
                            <div className="max-h-[600px] overflow-auto">
                                <table className="min-w-full">
                                    <thead className="sticky top-0 z-10">
                                        <tr>
                                            <th className="text-left">No</th>
                                            <th className="text-left">Program Kegiatan</th>
                                            <th className="text-left">Kegiatan</th>
                                            <th className="text-left">Rekening Belanja</th>
                                            <th className="text-left">Uraian</th>
                                            <th className="text-center">Dianggarkan</th>
                                            <th className="text-center">Dibelanjakan</th>
                                            <th className="text-left">Satuan</th>
                                            <th className="text-left">Harga Satuan</th>
                                            <th className="text-left">Total</th>
                                            <th className="text-center">Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredItems.length === 0 ? (
                                            <tr>
                                                <td colSpan={12} className="p-0">
                                                    <EmptyState
                                                        className="border-0 bg-transparent py-8 dark:bg-transparent"
                                                        icon={
                                                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                                            </svg>
                                                        }
                                                        title="Tidak ada data untuk bulan ini"
                                                        description="Coba pilih periode lain atau ubah kata kunci pencarian."
                                                    />
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredItems.map((item, index) => {
                                                const isBelanja = item.dibelanjakan >= item.dianggaran;
                                                const textClass = isBelanja ? '!text-slate-400 dark:!text-slate-500' : '';
                                                const boldTextClass = isBelanja ? '!text-slate-400 dark:!text-slate-500' : '!text-slate-900 dark:!text-white';

                                                return (
                                                    <tr key={item.id} className={`transition ${isBelanja ? 'bg-slate-50/70 dark:bg-white/[0.03]' : ''}`}>
                                                        <td className={`whitespace-nowrap text-sikas-num ${textClass}`}>{index + 1}</td>
                                                        <td className={`max-w-[150px] text-[11px] font-semibold ${textClass}`}>{item.program}</td>
                                                        <td className={`max-w-[150px] ${textClass}`}>{item.kegiatan}</td>
                                                        <td className={`max-w-[150px] ${textClass}`}>{item.rekening}</td>
                                                        <td className={`max-w-[150px] ${textClass}`}>{item.uraian}</td>
                                                        <td className={`text-center text-sikas-num ${textClass}`}>{item.dianggaran}</td>
                                                        <td className={`text-center text-sikas-num !font-extrabold ${textClass}`}>{item.dibelanjakan}</td>
                                                        <td className={`${textClass}`}>{item.satuan}</td>
                                                        <td className={`whitespace-nowrap text-sikas-num ${textClass}`}>Rp {item.harga}</td>
                                                        <td className={`whitespace-nowrap text-sikas-num !font-extrabold ${boldTextClass}`}>Rp {item.total}</td>
                                                        <td className="whitespace-nowrap text-center">
                                                            <Dropdown>
                                                                <Dropdown.Trigger>
                                                                    <button className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 shadow-sm transition hover:bg-slate-50 hover:text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-500 dark:hover:bg-white/10 dark:hover:text-white">
                                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2" />
                                                                        </svg>
                                                                    </button>
                                                                </Dropdown.Trigger>
                                                                <Dropdown.Content contentClasses="p-1">
                                                                    {!isBelanja && (
                                                                        <button
                                                                            type="button"
                                                                            onClick={(e) => {
                                                                                e.preventDefault();
                                                                                e.stopPropagation();
                                                                                handleEdit(item.id);
                                                                            }}
                                                                            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-[11.5px] font-semibold text-slate-600 transition hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-white/5"
                                                                        >
                                                                            <svg className="w-4 h-4 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                                                                        className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-[11.5px] font-semibold text-slate-600 transition hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-white/5"
                                                                    >
                                                                        <svg className="w-4 h-4 text-mint" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                                        </svg>
                                                                        Detail
                                                                    </button>
                                                                    {!isBelanja && (
                                                                        <Dropdown.Link as="button" href="#" onClick={(e) => {
                                                                            e.preventDefault();
                                                                            handleSisip(item.id);
                                                                        }} className="flex w-full items-center gap-2 text-left">
                                                                            <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                                                            </svg>
                                                                            Sisip Uraian
                                                                        </Dropdown.Link>
                                                                    )}
                                                                </Dropdown.Content>
                                                            </Dropdown>
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                        {/* Footer Row */}
                                        {filteredItems.length > 0 && (
                                            <tr className="sticky bottom-0 z-10 border-t border-lime-200 bg-lime-50 dark:border-lime-400/20 dark:bg-[#1c1a2b]">
                                                <td colSpan={10} className="text-right text-[11px] !font-extrabold !text-slate-700 dark:!text-slate-200">Total:</td>
                                                <td colSpan={2} className="text-sikas-num text-[11px] !font-extrabold !text-lime-700 dark:!text-lime-300">
                                                    Rp {new Intl.NumberFormat('id-ID').format(totalFiltered)}
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </DataTable>
                    ) : null}
                </div>
            </div>

            {/* Modal Tambah / Edit RKAS */}
            <Modal show={isModalOpen} onClose={() => { if (!isAlertModalOpen && !isDeleteModalOpen) closeModal(); }} maxWidth="2xl">
                <div className="relative overflow-hidden">
                    <div className="pointer-events-none absolute -right-10 -top-16 h-40 w-40 rounded-full bg-brand-500/10 blur-3xl dark:bg-brand-500/[0.08]" />
                    <div className="relative flex items-start justify-between gap-3 border-b border-slate-100 px-6 py-4 dark:border-white/5">
                        <div className="flex items-center gap-3">
                            <IconTile tone={isEditMode ? 'amber' : isSisipMode ? 'violet' : 'lime'} size="lg">
                                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                    <path d="M14 2v6h6" />
                                    <path d="M9 13h6M9 17h4" />
                                </svg>
                            </IconTile>
                            <div className="min-w-0">
                                <h2 className="text-[15px] font-extrabold tracking-tight text-slate-900 dark:text-white">
                                    {isEditMode ? 'Edit Data RKAS Perubahan' : isSisipMode ? 'Isi Detail Anggaran Kegiatan' : 'Tambah RKAS Perubahan'}
                                </h2>
                                <p className="mt-0.5 text-[10px] font-medium text-slate-400 dark:text-slate-500">
                                    {isEditMode ? 'Perbarui rincian alokasi anggaran perubahan kegiatan.' : isSisipMode ? 'Lengkapi detail anggaran pada kegiatan terpilih.' : 'Tambahkan rincian belanja perubahan ke RKAS.'}
                                </p>
                            </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                            {isEditMode && (
                                <button
                                    type="button"
                                    onClick={handleDeleteGroup}
                                    className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-pastel-rose px-3 py-2 text-[10.5px] font-extrabold text-rose-600 transition hover:bg-rose-100 dark:border-rose-400/20 dark:bg-rose-500/10 dark:text-rose-300 dark:hover:bg-rose-500/15"
                                >
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                    Hapus Semua
                                </button>
                            )}
                            <button type="button" onClick={closeModal} className="inline-flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-500 dark:hover:bg-white/5 dark:hover:text-white" aria-label="Tutup">
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    <div className="max-h-[80vh] overflow-y-auto px-6 py-5">
                        <form onSubmit={submit} className="space-y-5">
                            {/* Kegiatan */}
                            <div>
                                <InputLabel value="Kegiatan" required />
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
                                <InputLabel value="Rekening Belanja" required />
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

                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                {/* Uraian */}
                                <div>
                                    <InputLabel value="Uraian" required />
                                    <textarea
                                        className="h-[42px] w-full rounded-xl border border-slate-200/90 bg-white px-3.5 py-2 text-[12px] font-semibold text-slate-800 shadow-sm transition placeholder:text-slate-400 focus:border-lime-400 focus:outline-none focus:ring-4 focus:ring-lime-200/60 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-lime-400/70 dark:focus:ring-lime-400/10"
                                        placeholder="Jelaskan detail barang atau jasa yang akan diadakan..."
                                        value={data.uraian}
                                        onChange={(e) => setData('uraian', e.target.value)}
                                    />
                                    {errors.uraian && <div className="mt-1 text-[10px] font-semibold text-rose-500 dark:text-rose-400">{errors.uraian}</div>}
                                </div>

                                {/* Harga Satuan */}
                                <div>
                                    <InputLabel value="Harga Satuan" required />
                                    <div className="relative">
                                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                            <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500">Rp</span>
                                        </div>
                                        <TextInput
                                            className="pl-9 w-full text-sikas-num"
                                            value={formatCurrency(data.harga_satuan)}
                                            onChange={handleHargaSatuanChange}
                                            placeholder="0"
                                        />
                                    </div>
                                    {errors.harga_satuan && <div className="mt-1 text-[10px] font-semibold text-rose-500 dark:text-rose-400">{errors.harga_satuan}</div>}
                                </div>
                            </div>

                            {/* Alokasi Bulan Section */}
                            <div>
                                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                                    <span className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">Di Anggarkan untuk bulan</span>
                                    <span className="text-sikas-num text-[11.5px] font-extrabold text-brand-600 dark:text-brand-300">Total Anggaran : Rp {new Intl.NumberFormat('id-ID').format(totalAnggaran)}</span>
                                </div>
                                {errors.alokasi && <div className="mb-2 text-[10px] font-semibold text-rose-500 dark:text-rose-400">{errors.alokasi}</div>}
                                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                    {/* Allocated Months */}
                                    {data.alokasi.map((alloc, index) => {
                                        const spentValue = Number(alloc.spent || 0);
                                        const qtyValue = Number(alloc.quantity || 0);
                                        const hasSpent = spentValue > 0;
                                        const isLunas = spentValue > 0 && spentValue >= qtyValue;

                                        return (
                                            <div key={index} className={`sikas-card relative p-4 ${isLunas ? 'opacity-70 grayscale-[0.5]' : ''}`}>
                                                {!hasSpent && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveMonth(index)}
                                                        className="absolute -right-2 -top-2 z-10 rounded-full bg-rose-500 p-1 text-white shadow-lg shadow-rose-500/30 transition hover:bg-rose-600"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                        </svg>
                                                    </button>
                                                )}

                                                <div className="mb-3 grid grid-cols-2 gap-3">
                                                    <select
                                                        className={`h-9 w-full rounded-xl border bg-white px-3 py-1 text-[11.5px] font-semibold text-slate-800 shadow-sm transition focus:border-lime-400 focus:outline-none focus:ring-4 focus:ring-lime-200/60 dark:bg-white/5 dark:text-white dark:focus:border-lime-400/70 dark:focus:ring-lime-400/10 ${hasSpent ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400 dark:border-white/10 dark:bg-white/5 dark:text-slate-500' : 'border-slate-200/90 dark:border-white/10'}`}
                                                        value={alloc.month}
                                                        onChange={(e) => updateAllocation(index, 'month', e.target.value)}
                                                        disabled={hasSpent}
                                                    >
                                                        <option value="">Pilih Bulan</option>
                                                        {monthOptions.map(m => {
                                                            const isSelectedElsewhere = data.alokasi.some((a, i) => i !== index && a.month === m);
                                                            if (isSelectedElsewhere) return null;
                                                            return <option key={m} value={m}>{m}</option>;
                                                        })}
                                                    </select>
                                                    <div className="flex items-center justify-end rounded-xl border border-slate-100 bg-slate-50 px-3 text-[11.5px] font-extrabold text-slate-700 text-sikas-num dark:border-white/5 dark:bg-white/5 dark:text-slate-200">
                                                        Rp {new Intl.NumberFormat('id-ID').format(
                                                            (Number(alloc.quantity) || 0) * (Number(data.harga_satuan) || 0)
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 gap-3">
                                                    <div className="relative">
                                                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                                            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">$</span>
                                                        </div>
                                                        <input
                                                            type="text"
                                                            className={`h-9 w-full rounded-xl border bg-white pl-6 pr-3 text-[11.5px] font-semibold text-slate-800 shadow-sm transition placeholder:text-slate-400 focus:border-lime-400 focus:outline-none focus:ring-4 focus:ring-lime-200/60 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-lime-400/70 dark:focus:ring-lime-400/10 
                                                                ${showValidationErrors && !alloc.quantity
                                                                    ? 'border-rose-400 bg-rose-50 focus:border-rose-400 focus:ring-rose-200/60 dark:border-rose-500/50 dark:bg-rose-500/10'
                                                                    : (isLunas ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400 dark:border-white/10 dark:bg-white/5 dark:text-slate-500' : 'border-slate-200/90 dark:border-white/10')
                                                                }`}
                                                            placeholder="Jumlah"
                                                            value={alloc.quantity}
                                                            onChange={(e) => updateAllocation(index, 'quantity', e.target.value.replace(/\D/g, ''))}
                                                            disabled={isLunas}
                                                        />
                                                    </div>
                                                    <input
                                                        type="text"
                                                        className={`h-9 w-full rounded-xl border bg-white px-3 text-[11.5px] font-semibold text-slate-800 shadow-sm transition placeholder:text-slate-400 focus:border-lime-400 focus:outline-none focus:ring-4 focus:ring-lime-200/60 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-lime-400/70 dark:focus:ring-lime-400/10 
                                                            ${(index > 0 || isLunas) ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400 dark:border-white/10 dark:bg-white/5 dark:text-slate-500' :
                                                                (showValidationErrors && !alloc.unit
                                                                    ? 'border-rose-400 bg-rose-50 focus:border-rose-400 focus:ring-rose-200/60 dark:border-rose-500/50 dark:bg-rose-500/10'
                                                                    : 'border-slate-200/90 dark:border-white/10')
                                                            }
                                                        `}
                                                        placeholder="Satuan"
                                                        value={alloc.unit}
                                                        onChange={(e) => updateAllocation(index, 'unit', e.target.value)}
                                                        readOnly={index > 0 || isLunas}
                                                        disabled={isLunas}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}

                                    {/* Add Month Button */}
                                    {data.alokasi.length < 12 && (
                                        <button
                                            type="button"
                                            onClick={handleAddMonth}
                                            className="flex min-h-[140px] flex-col items-center justify-center rounded-[26px] border-2 border-dashed border-slate-200 p-6 text-slate-400 transition hover:border-lime-400 hover:text-lime-600 dark:border-white/10 dark:text-slate-500 dark:hover:border-lime-400/50 dark:hover:text-lime-300"
                                        >
                                            <svg className="mb-2 w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                            </svg>
                                            <span className="text-[11px] font-extrabold">+ Tambah Bulan</span>
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 border-t border-slate-100 pt-4 dark:border-white/5">
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
                </div>
            </Modal>

            {/* Modal Konfirmasi Hapus */}
            <Modal show={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} maxWidth="md">
                <div className="relative overflow-hidden">
                    <div className="pointer-events-none absolute -right-10 -top-16 h-40 w-40 rounded-full bg-rose-500/10 blur-3xl dark:bg-rose-500/[0.08]" />
                    <div className="relative px-6 py-5">
                        <div className="mb-3 flex items-center gap-3">
                            <IconTile tone="rose" size="lg">
                                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            </IconTile>
                            <h2 className="text-[14px] font-extrabold tracking-tight text-slate-900 dark:text-white">
                                Konfirmasi Hapus
                            </h2>
                        </div>
                        <p className="text-[11.5px] font-medium leading-relaxed text-slate-500 dark:text-slate-400">
                            Apakah Anda yakin ingin menghapus semua data dalam kelompok kegiatan ini? Tindakan ini tidak dapat dibatalkan.
                        </p>
                    </div>
                    <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4 dark:border-white/5">
                        <button
                            onClick={() => setIsDeleteModalOpen(false)}
                            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-[11.5px] font-bold text-slate-700 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
                        >
                            Batal
                        </button>
                        <button
                            onClick={confirmDelete}
                            disabled={isDeleting}
                            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-rose-500 px-4 py-2.5 text-[11.5px] font-extrabold text-white shadow-lg shadow-rose-500/25 transition-all duration-200 hover:-translate-y-0.5 hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {isDeleting ? 'Menghapus...' : 'Hapus Semua'}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Modal Logs */}
            <Modal show={isLogsModalOpen} onClose={() => setIsLogsModalOpen(false)} maxWidth="2xl">
                <div className="relative overflow-hidden">
                    <div className="relative flex items-start justify-between gap-3 border-b border-slate-100 px-6 py-4 dark:border-white/5">
                        <div className="flex items-center gap-3">
                            <IconTile tone="slate" size="lg">
                                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </IconTile>
                            <div className="min-w-0">
                                <h2 className="text-[14px] font-extrabold tracking-tight text-slate-900 dark:text-white">
                                    Riwayat Perubahan RKAS
                                </h2>
                                <p className="mt-0.5 text-[10px] font-medium text-slate-400 dark:text-slate-500">
                                    Catatan aktivitas perubahan anggaran.
                                </p>
                            </div>
                        </div>
                        <button type="button" onClick={() => setIsLogsModalOpen(false)} className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-500 dark:hover:bg-white/5 dark:hover:text-white" aria-label="Tutup">
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    <div className="max-h-[500px] overflow-y-auto px-6 py-4">
                        {logs.length === 0 ? (
                            <p className="py-6 text-center text-[11px] font-semibold text-slate-400 dark:text-slate-500">Belum ada riwayat perubahan.</p>
                        ) : (
                            <ul className="space-y-3">
                                {logs.map((log) => (
                                    <li key={log.id} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 dark:border-white/5 dark:bg-white/[0.03]">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <span className={`mb-2 inline-block rounded-full px-2 py-1 text-[9px] font-extrabold uppercase tracking-[0.1em] 
                                                    ${log.action === 'create' ? 'bg-pastel-mint text-emerald-700 dark:bg-mint/10 dark:text-emerald-300' :
                                                        log.action === 'update' ? 'bg-pastel-sky text-sky dark:bg-sky/10 dark:text-sky' :
                                                            log.action === 'delete' ? 'bg-pastel-rose text-rose-600 dark:bg-rose-500/10 dark:text-rose-300' :
                                                                log.action === 'copy' ? 'bg-pastel-lavender text-brand-600 dark:bg-brand-500/15 dark:text-brand-300' :
                                                                    'bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-300'}`}>
                                                    {log.action.toUpperCase()}
                                                </span>
                                                <p className="text-[11.5px] font-semibold text-slate-800 dark:text-slate-200">{log.description}</p>
                                            </div>
                                            <div className="shrink-0 text-right">
                                                <p className="text-[10px] font-semibold text-slate-400 text-sikas-num dark:text-slate-500">{log.created_at}</p>
                                                <p className="text-[9.5px] font-semibold text-slate-300 text-sikas-num dark:text-slate-600">{log.elapsed}</p>
                                            </div>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    <div className="flex justify-end border-t border-slate-100 px-6 py-4 dark:border-white/5">
                        <SecondaryButton onClick={() => setIsLogsModalOpen(false)}>
                            Tutup
                        </SecondaryButton>
                    </div>
                </div>
            </Modal>

            {/* Modal Detail Item */}
            <Modal show={isItemDetailModalOpen} onClose={() => setIsItemDetailModalOpen(false)} maxWidth="4xl">
                {itemDetailData && (
                    <div className="relative flex max-h-[90vh] flex-col overflow-hidden">
                        <div className="relative flex items-start justify-between gap-3 border-b border-slate-100 px-6 py-4 dark:border-white/5">
                            <div className="flex items-center gap-3">
                                <IconTile tone="violet" size="lg">
                                    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                    </svg>
                                </IconTile>
                                <div className="min-w-0">
                                    <h2 className="text-[14px] font-extrabold tracking-tight text-slate-900 dark:text-white">
                                        Detail Data RKAS
                                    </h2>
                                    <p className="mt-0.5 text-[10px] font-medium text-slate-400 dark:text-slate-500">
                                        Rincian kegiatan dan alokasi per periode.
                                    </p>
                                </div>
                            </div>
                            <button type="button" onClick={() => setIsItemDetailModalOpen(false)} className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-500 dark:hover:bg-white/5 dark:hover:text-white" aria-label="Tutup">
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="max-h-[80vh] space-y-5 overflow-y-auto px-6 py-5">
                            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                                {/* Left Column: Informasi Kegiatan */}
                                <div className="space-y-3">
                                    <h3 className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                                        <IconTile tone="slate" size="sm">
                                            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        </IconTile>
                                        Informasi Kegiatan
                                    </h3>

                                    <div>
                                        <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">Program Kegiatan</label>
                                        <div className="w-full rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2 text-[11.5px] font-semibold text-slate-800 dark:border-white/5 dark:bg-white/5 dark:text-slate-100">
                                            {itemDetailData.kode_kegiatan?.program || '-'}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">Kegiatan</label>
                                        <div className="w-full rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2 text-[11.5px] font-semibold text-slate-800 dark:border-white/5 dark:bg-white/5 dark:text-slate-100">
                                            {itemDetailData.kode_kegiatan?.sub_program || '-'}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">Rekening Belanja</label>
                                        <div className="w-full rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2 text-[11.5px] font-semibold text-slate-800 dark:border-white/5 dark:bg-white/5 dark:text-slate-100">
                                            {itemDetailData.rekening_belanja ?
                                                `${itemDetailData.rekening_belanja.kode_rekening} - ${itemDetailData.rekening_belanja.rincian_objek}` : '-'}
                                        </div>
                                    </div>
                                </div>

                                {/* Right Column: Informasi Anggaran */}
                                <div className="space-y-3">
                                    <h3 className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                                        <IconTile tone="lime" size="sm">
                                            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        </IconTile>
                                        Informasi Anggaran
                                    </h3>

                                    <div>
                                        <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">Uraian</label>
                                        <div className="w-full rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2 text-[11.5px] font-semibold text-slate-800 dark:border-white/5 dark:bg-white/5 dark:text-slate-100">
                                            {itemDetailData.uraian}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">Harga Satuan</label>
                                        <div className="w-full rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2 text-[11.5px] font-semibold text-slate-800 text-sikas-num dark:border-white/5 dark:bg-white/5 dark:text-slate-100">
                                            Rp {new Intl.NumberFormat('id-ID').format(itemDetailData.harga_satuan)}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">Total Anggaran</label>
                                        <div className="w-full rounded-xl border border-lime-300/60 bg-lime-100/60 px-3 py-2 text-[11.5px] font-extrabold text-lime-700 text-sikas-num dark:border-lime-400/20 dark:bg-lime-400/10 dark:text-lime-300">
                                            Rp {new Intl.NumberFormat('id-ID').format(itemDetailData.total_anggaran)}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Monthly Allocations Section */}
                            <div className="overflow-hidden rounded-2xl border border-slate-100 dark:border-white/5">
                                <div className="flex flex-wrap items-center justify-between gap-2 bg-gradient-to-br from-[#2B2940] via-[#232135] to-[#191826] px-4 py-3 text-white">
                                    <div className="flex items-center gap-2">
                                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-lime-400/15 text-lime-300 ring-1 ring-lime-400/30">
                                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                        </span>
                                        <span className="text-[11px] font-extrabold">
                                            Di Anggarkan untuk bulan
                                        </span>
                                    </div>
                                    <span className="text-sikas-num text-[11px] font-extrabold text-lime-300">
                                        Total Anggaran : Rp {new Intl.NumberFormat('id-ID').format(itemDetailData.total_anggaran)}
                                    </span>
                                </div>
                                <div className="grid grid-cols-1 gap-3 bg-slate-50 p-4 dark:bg-white/[0.02] md:grid-cols-2 lg:grid-cols-3">
                                    {itemDetailData.bulan_data && itemDetailData.bulan_data.map((bulan: any, idx: number) => (
                                        <div key={idx} className="rounded-2xl border border-slate-100 bg-white p-3 shadow-sm dark:border-white/5 dark:bg-white/5">
                                            <div className="mb-3 flex items-center justify-between gap-2">
                                                <span className="w-1/2 rounded-lg border border-slate-100 bg-slate-50 px-2 py-1 text-[10.5px] font-extrabold text-slate-600 dark:border-white/5 dark:bg-white/5 dark:text-slate-300">{bulan.bulan}</span>
                                                <span className="w-1/2 rounded-lg border border-mint/20 bg-pastel-mint px-2 py-1 text-right text-[10.5px] font-extrabold text-emerald-600 text-sikas-num dark:border-mint/20 dark:bg-mint/10 dark:text-emerald-300">Rp {new Intl.NumberFormat('id-ID').format(bulan.total)}</span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2">
                                                <div>
                                                    <label className="mb-0.5 block text-[9.5px] font-extrabold uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">Jumlah</label>
                                                    <div className="rounded-lg border border-slate-100 bg-slate-50 px-2 py-1 text-[11px] font-semibold text-slate-800 text-sikas-num dark:border-white/5 dark:bg-white/5 dark:text-slate-100">{bulan.jumlah}</div>
                                                </div>
                                                <div>
                                                    <label className="mb-0.5 block text-[9.5px] font-extrabold uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">Satuan</label>
                                                    <div className="truncate rounded-lg border border-slate-100 bg-slate-50 px-2 py-1 text-[11px] font-semibold text-slate-800 dark:border-white/5 dark:bg-white/5 dark:text-slate-100">{bulan.satuan}</div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {(!itemDetailData.bulan_data || itemDetailData.bulan_data.length === 0) && (
                                        <div className="col-span-full py-6 text-center text-[11px] font-semibold text-slate-400 dark:text-slate-500">
                                            Tidak ada alokasi bulan.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="flex justify-end border-t border-slate-100 bg-white px-6 py-4 dark:border-white/5 dark:bg-[#15131F]">
                            <button
                                onClick={() => setIsItemDetailModalOpen(false)}
                                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-[11.5px] font-bold text-slate-700 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
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
                    <div className="mb-4 flex items-center gap-3">
                        <IconTile tone="rose" size="lg">
                            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </IconTile>
                        <h2 className="text-[14px] font-extrabold tracking-tight text-slate-900 dark:text-white">
                            Peringatan Validasi
                        </h2>
                    </div>
                    <p className="mb-6 text-[11.5px] font-medium leading-relaxed text-slate-500 dark:text-slate-400">
                        {alertMessage}
                    </p>
                    <div className="flex justify-end">
                        <SecondaryButton onClick={() => setIsAlertModalOpen(false)}>
                            Tutup
                        </SecondaryButton>
                    </div>
                </div>
            </Modal>

            {/* Modal Preview Tarik RKAS Perubahan dari ARKAS */}
            <Modal show={isArkasModalOpen} onClose={() => { if (!isPullingArkas) setIsArkasModalOpen(false); }} maxWidth="md">
                <div className="p-6">
                    <div className="mb-5 flex justify-center">
                        <IconTile tone="mint" size="lg" className="h-14 w-14">
                            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                                <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                        </IconTile>
                    </div>
                    <h2 className="mb-1 text-center text-[15px] font-extrabold tracking-tight text-slate-900 dark:text-white">
                        Tarik RKAS Perubahan dari ARKAS
                    </h2>
                    <p className="mb-6 text-center text-[10.5px] font-medium text-slate-500 dark:text-slate-400">
                        Data Perubahan Anggaran resmi ditemukan di database ARKAS. Periksa rincian di bawah sebelum menyinkronkan.
                    </p>

                    {arkasPreviewData && (
                        <div className="mb-6 space-y-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-4 text-[11.5px] dark:border-white/5 dark:bg-white/[0.03]">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-2 dark:border-white/5">
                                <span className="font-semibold text-slate-400 dark:text-slate-500">Tahun Anggaran</span>
                                <span className="font-extrabold text-slate-800 text-sikas-num dark:text-white">{arkasPreviewData.tahun}</span>
                            </div>
                            <div className="flex items-center justify-between border-b border-slate-100 pb-2 dark:border-white/5">
                                <span className="font-semibold text-slate-400 dark:text-slate-500">Sumber Dana</span>
                                <span className="font-extrabold text-slate-800 dark:text-white">{arkasPreviewData.sumber_dana}</span>
                            </div>
                            <div className="flex items-center justify-between border-b border-slate-100 pb-2 dark:border-white/5">
                                <span className="font-semibold text-slate-400 dark:text-slate-500">Status Revisi ARKAS</span>
                                <span className="inline-flex items-center rounded-full bg-pastel-amber px-2 py-0.5 text-[9.5px] font-extrabold text-amber-700 dark:bg-amber-400/10 dark:text-amber-300">
                                    Perubahan (Revisi)
                                </span>
                            </div>
                            <div className="flex items-center justify-between border-b border-slate-100 pb-2 dark:border-white/5">
                                <span className="font-semibold text-slate-400 dark:text-slate-500">Pagu Total Perubahan</span>
                                <span className="font-extrabold text-emerald-600 text-sikas-num dark:text-emerald-300">
                                    Rp {new Intl.NumberFormat('id-ID').format(arkasPreviewData.pagu)}
                                </span>
                            </div>
                            <div className="flex items-center justify-between border-b border-slate-100 pb-2 dark:border-white/5">
                                <span className="font-semibold text-slate-400 dark:text-slate-500">Jumlah Kegiatan</span>
                                <span className="font-extrabold text-slate-800 dark:text-white">{arkasPreviewData.total_kegiatan} Kegiatan</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="font-semibold text-slate-400 dark:text-slate-500">Total Alokasi Bulanan</span>
                                <span className="font-extrabold text-slate-800 dark:text-white">{arkasPreviewData.total_alokasi} Baris Data</span>
                            </div>
                        </div>
                    )}

                    {arkasPreviewData && arkasPreviewData.current_rkas_count > 0 ? (
                        <div className="mb-6 space-y-2 rounded-2xl border border-amber-300/50 bg-pastel-amber/60 p-3 dark:border-amber-400/20 dark:bg-amber-400/10">
                            <p className="text-[10.5px] font-extrabold leading-relaxed text-amber-800 dark:text-amber-200">
                                Data RKAS Perubahan di newSIKAS saat ini sudah berisi {arkasPreviewData.current_rkas_count} baris alokasi.
                            </p>
                            <label className="mt-2 flex cursor-pointer items-start gap-2 border-t border-amber-300/50 pt-2 dark:border-amber-400/20">
                                <input
                                    type="checkbox"
                                    checked={confirmOverwrite}
                                    onChange={(e) => setConfirmOverwrite(e.target.checked)}
                                    className="mt-0.5 rounded border-amber-300 text-amber-600 shadow-sm focus:ring-amber-500"
                                />
                                <span className="text-[10.5px] font-medium text-amber-900 dark:text-amber-100">
                                    Saya setuju untuk menimpa ulang (overwrite) seluruh data RKAS Perubahan saat ini dengan data dari ARKAS.
                                </span>
                            </label>
                        </div>
                    ) : (
                        <div className="mb-6 rounded-2xl border border-sky/20 bg-pastel-sky/70 p-3 dark:border-sky/20 dark:bg-sky/10">
                            <p className="text-[10.5px] font-medium leading-relaxed text-slate-600 dark:text-slate-300">
                                <strong>Informasi:</strong> Seluruh data alokasi bulanan akan disalin ke modul RKAS Perubahan newSIKAS dan nilai Pagu Anggaran akan otomatis disinkronkan.
                            </p>
                        </div>
                    )}

                    <div className="flex justify-center gap-3">
                        <SecondaryButton onClick={() => setIsArkasModalOpen(false)} disabled={isPullingArkas}>
                            Batal
                        </SecondaryButton>

                        <PrimaryButton
                            onClick={confirmPullArkas}
                            disabled={isPullingArkas || (arkasPreviewData?.current_rkas_count > 0 && !confirmOverwrite)}
                            className="bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500"
                        >
                            {isPullingArkas ? 'Menarik Data...' : 'Ya, Tarik Sekarang'}
                        </PrimaryButton>
                    </div>
                </div>
            </Modal>
        </AuthenticatedLayout>
    );
}
