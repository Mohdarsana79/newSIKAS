import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router } from '@inertiajs/react';
import PrimaryButton from '@/Components/PrimaryButton';
import { PageProps } from '@/types';
import { useState } from 'react';
import Modal from '@/Components/Modal';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import InputError from '@/Components/InputError';
import SecondaryButton from '@/Components/SecondaryButton';
import DangerButton from '@/Components/DangerButton';
import { useForm } from '@inertiajs/react';
import DatePicker from '@/Components/DatePicker';
import { format } from 'date-fns';

interface PenganggaranItem {
    id: number;
    title: string;
    pagu: string;
    status: 'regular' | 'perubahan';
    has_perubahan: boolean;
}

interface Anggaran {
    id: number;
    pagu_anggaran: number;
    tahun_anggaran: string;
    komite: string;
    kepala_sekolah: string;
    nip_kepala_sekolah: string;
    sk_kepala_sekolah: string;
    tanggal_sk_kepala_sekolah: string;
    bendahara: string;
    nip_bendahara: string;
    sk_bendahara: string;
    tanggal_sk_bendahara: string;
    created_at: string;
    updated_at: string;
}

export default function Index({ auth, items, anggarans }: PageProps<{ items: PenganggaranItem[], anggarans: Anggaran[] }>) {
    const tabs = ['BOSP Reguler', 'BOSP Daerah', 'BOSP Kinerja', 'SiLPA BOSP Kinerja', 'Lainnya'];
    const [activeTab, setActiveTab] = useState('BOSP Reguler');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [editId, setEditId] = useState<number | null>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const [deleteStatus, setDeleteStatus] = useState<'regular' | 'perubahan' | null>(null);

    const [isDeleting, setIsDeleting] = useState(false);

    const { data, setData, post, put, processing, errors, reset, clearErrors } = useForm({
        pagu_anggaran: '',
        tahun_anggaran: new Date().getFullYear().toString(),
        komite: '',
        kepala_sekolah: '',
        nip_kepala_sekolah: '',
        sk_kepala_sekolah: '',
        tanggal_sk_kepala_sekolah: '',
        bendahara: '',
        nip_bendahara: '',
        sk_bendahara: '',
        tanggal_sk_bendahara: '',
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();

        if (editMode && editId) {
            put(route('penganggaran.update', editId), {
                onSuccess: () => {
                    setIsModalOpen(false);
                    reset();
                    setEditMode(false);
                    setEditId(null);
                },
            });
        } else {
            post(route('penganggaran.store'), {
                onSuccess: () => {
                    setIsModalOpen(false);
                    reset();
                },
            });
        }
    };

    const handleCreate = () => {
        setEditMode(false);
        setEditId(null);
        reset();
        clearErrors();
        setIsModalOpen(true);
    };

    const handleEdit = (id: number) => {
        const item = anggarans.find(a => a.id === id);
        if (item) {
            setEditMode(true);
            setEditId(id);
            setData({
                pagu_anggaran: 'Rp ' + new Intl.NumberFormat('id-ID').format(item.pagu_anggaran),
                tahun_anggaran: item.tahun_anggaran,
                komite: item.komite,
                kepala_sekolah: item.kepala_sekolah,
                nip_kepala_sekolah: item.nip_kepala_sekolah,
                sk_kepala_sekolah: item.sk_kepala_sekolah,
                tanggal_sk_kepala_sekolah: item.tanggal_sk_kepala_sekolah,
                bendahara: item.bendahara,
                nip_bendahara: item.nip_bendahara,
                sk_bendahara: item.sk_bendahara,
                tanggal_sk_bendahara: item.tanggal_sk_bendahara,
            });
            clearErrors();
            setIsModalOpen(true);
        }
    };

    const handleDelete = (id: number, status: 'regular' | 'perubahan') => {
        setDeleteId(id);
        setDeleteStatus(status);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = () => {
        if (deleteId) {
            const routeName = deleteStatus === 'perubahan'
                ? 'rkas-perubahan.destroy-penganggaran'
                : 'penganggaran.destroy';

            router.delete(route(routeName, deleteId), {
                onStart: () => setIsDeleting(true),
                onFinish: () => setIsDeleting(false),
                onSuccess: () => {
                    setIsDeleteModalOpen(false);
                    setDeleteId(null);
                    setDeleteStatus(null);
                },
            });
        }
    };

    return (
        <AuthenticatedLayout>
            <Head title="Penganggaran" />

            <div className="bg-white dark:bg-gray-800 overflow-hidden shadow-sm sm:rounded-lg">
                <div className="p-6 text-gray-900 dark:text-gray-100">
                    {/* Header Section */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <span className="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 p-2 rounded-lg">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                    </svg>
                                </span>
                                Penganggaran
                            </h1>
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 pl-12">
                                Kelola Rencana Kegiatan dan Anggaran Sekolah (RKAS) Anda di sini.
                            </p>
                        </div>
                        <PrimaryButton
                            onClick={handleCreate}
                            className="bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500 shadow-lg shadow-indigo-500/30 transition-all hover:scale-105"
                        >
                            <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                            Buat Anggaran Baru
                        </PrimaryButton>
                    </div>

                    {/* Tabs Navigation */}
                    <div className="mb-6">
                        <nav className="flex space-x-3 overflow-x-auto pb-2 scrollbar-hide" aria-label="Tabs">
                            {tabs.map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`
                                            whitespace-nowrap py-2.5 px-6 rounded-full font-medium text-sm transition-all duration-300
                                            ${activeTab === tab
                                            ? 'bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white shadow-lg transform scale-105'
                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                                        }
                                        `}
                                >
                                    {tab}
                                </button>
                            ))}
                        </nav>
                    </div>

                    {/* Items List */}
                    <div className="space-y-4">
                        {items.length === 0 ? (
                            <div className="text-center py-12 bg-gray-50 dark:bg-gray-700/30 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700">
                                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2h-1" />
                                </svg>
                                <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">Tidak ada data anggaran</h3>
                                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Mulailah dengan membuat anggaran baru.</p>
                                <div className="mt-6">
                                    <PrimaryButton onClick={handleCreate}>
                                        <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                                        </svg>
                                        Buat Anggaran
                                    </PrimaryButton>
                                </div>
                            </div>
                        ) : (
                            items.map((item) => (
                                <div
                                    key={`${item.id}-${item.status}`}
                                    className={`
                                            group relative bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 
                                            hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1
                                            ${item.status === 'perubahan' ? 'border-l-4 border-l-amber-500' : 'border-l-4 border-l-indigo-500'}
                                        `}
                                >
                                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                        <div className="flex flex-col">
                                            <div className="flex items-center gap-2">
                                                <h3 className="text-lg font-bold text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                                    {item.title}
                                                </h3>
                                                {item.status === 'perubahan' && (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200">
                                                        Perubahan
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 mt-1 text-sm text-gray-500 dark:text-gray-400">
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                Pagu: <span className="font-semibold text-gray-700 dark:text-gray-300">{item.pagu}</span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3 w-full sm:w-auto mt-4 sm:mt-0">
                                            {/* Edit Button - Conditional */}
                                            {item.status === 'regular' && !item.has_perubahan && (
                                                <button
                                                    onClick={() => handleEdit(item.id)}
                                                    className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-gray-700 rounded-full transition-colors"
                                                    title="Edit Data Anggaran"
                                                >
                                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                    </svg>
                                                </button>
                                            )}

                                            {/* View / Detail Button */}
                                            <Link
                                                href={item.status === 'perubahan' ? route('rkas-perubahan.index', item.id) : route('rkas.index', item.id)}
                                                className={`
                                                        flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-sm
                                                        ${item.status === 'perubahan'
                                                        ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:hover:bg-amber-900/40 border border-amber-200 dark:border-amber-800'
                                                        : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-900/20 dark:text-indigo-400 dark:hover:bg-indigo-900/40 border border-indigo-200 dark:border-indigo-800'
                                                    }
                                                    `}
                                            >
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                </svg>
                                                Detail RKAS
                                            </Link>

                                            {/* Summary / Print Button */}
                                            <Link
                                                href={item.status === 'perubahan' ? route('rkas-perubahan.summary', item.id) : route('rkas.summary', item.id)}
                                                className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-gray-700 rounded-full transition-colors"
                                                title="Ringkasan & Cetak"
                                            >
                                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                </svg>
                                            </Link>

                                            {/* Delete Button */}
                                            <button
                                                onClick={() => handleDelete(item.id, item.status)}
                                                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-gray-700 rounded-full transition-colors"
                                                title="Hapus Anggaran"
                                            >
                                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Modal Tambah Baru */}
            <Modal show={isModalOpen} onClose={() => setIsModalOpen(false)} maxWidth="2xl">
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
                    {/* Modal Header with Gradient */}
                    <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 px-6 py-4 flex items-center justify-between shrink-0">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <svg className="w-6 h-6 text-white/90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            {editMode ? 'Edit Data Anggaran' : 'Tambah Anggaran Baru'}
                        </h2>
                        <button
                            onClick={() => setIsModalOpen(false)}
                            className="text-white/80 hover:text-white hover:bg-white/20 rounded-full p-1 transition-colors"
                        >
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    <div className="p-6 overflow-y-auto custom-scrollbar">
                        <form onSubmit={submit} className="space-y-8">
                            {/* Section 1: Informasi Dasar */}
                            <div className="bg-gray-50 dark:bg-gray-700/30 p-5 rounded-xl border border-gray-100 dark:border-gray-700">
                                <h3 className="text-sm font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    Informasi Dasar
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div className="md:col-span-2">
                                        <InputLabel value="Pagu Anggaran (Rp)" className="text-gray-700 dark:text-gray-300" />
                                        <div className="relative mt-1">
                                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                                <span className="text-gray-500 sm:text-sm">Rp</span>
                                            </div>
                                            <TextInput
                                                value={data.pagu_anggaran.replace('Rp ', '')}
                                                onChange={(e) => {
                                                    let value = e.target.value.replace(/[^,\d]/g, '');
                                                    if (value) {
                                                        const split = value.split(',');
                                                        const sisa = split[0].length % 3;
                                                        let rupiah = split[0].substr(0, sisa);
                                                        const ribuan = split[0].substr(sisa).match(/\d{3}/gi);

                                                        if (ribuan) {
                                                            const separator = sisa ? '.' : '';
                                                            rupiah += separator + ribuan.join('.');
                                                        }

                                                        rupiah = split[1] !== undefined ? rupiah + ',' + split[1] : rupiah;
                                                        setData('pagu_anggaran', 'Rp ' + rupiah);
                                                    } else {
                                                        setData('pagu_anggaran', '');
                                                    }
                                                }}
                                                placeholder="50.000.000"
                                                className="block w-full pl-10 bg-white border-gray-300 dark:bg-gray-800 dark:border-gray-600 dark:text-white focus:border-indigo-500 focus:ring-indigo-500 rounded-lg shadow-sm"
                                                required
                                            />
                                        </div>
                                        <InputError message={errors.pagu_anggaran} className="mt-2" />
                                    </div>

                                    <div>
                                        <InputLabel value="Tahun Anggaran" className="text-gray-700 dark:text-gray-300" />
                                        <TextInput
                                            type="number"
                                            value={data.tahun_anggaran}
                                            onChange={(e) => setData('tahun_anggaran', e.target.value)}
                                            className="mt-1 block w-full bg-white border-gray-300 dark:bg-gray-800 dark:border-gray-600 dark:text-white rounded-lg shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                            required
                                        />
                                        <InputError message={errors.tahun_anggaran} className="mt-2" />
                                    </div>

                                    <div>
                                        <InputLabel value="Nama Komite" className="text-gray-700 dark:text-gray-300" />
                                        <TextInput
                                            value={data.komite}
                                            onChange={(e) => setData('komite', e.target.value)}
                                            className="mt-1 block w-full bg-white border-gray-300 dark:bg-gray-800 dark:border-gray-600 dark:text-white rounded-lg shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                            required
                                        />
                                        <InputError message={errors.komite} className="mt-2" />
                                    </div>
                                </div>
                            </div>

                            {/* Section 2: Kepala Sekolah */}
                            <div className="bg-indigo-50 dark:bg-indigo-900/10 p-5 rounded-xl border border-indigo-100 dark:border-indigo-800/30">
                                <h3 className="text-sm font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider mb-4 flex items-center gap-2">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                    Data Kepala Sekolah
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div className="md:col-span-2">
                                        <InputLabel value="Nama Lengkap" className="text-gray-700 dark:text-gray-300" />
                                        <TextInput
                                            value={data.kepala_sekolah}
                                            onChange={(e) => setData('kepala_sekolah', e.target.value)}
                                            className="mt-1 block w-full bg-white border-gray-300 dark:bg-gray-800 dark:border-gray-600 dark:text-white rounded-lg shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                            required
                                            placeholder="Nama lengkap beserta gelar"
                                        />
                                        <InputError message={errors.kepala_sekolah} className="mt-2" />
                                    </div>
                                    <div>
                                        <InputLabel value="NIP" className="text-gray-700 dark:text-gray-300" />
                                        <TextInput
                                            value={data.nip_kepala_sekolah}
                                            onChange={(e) => setData('nip_kepala_sekolah', e.target.value)}
                                            className="mt-1 block w-full bg-white border-gray-300 dark:bg-gray-800 dark:border-gray-600 dark:text-white rounded-lg shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                            required
                                        />
                                        <InputError message={errors.nip_kepala_sekolah} className="mt-2" />
                                    </div>
                                    <div>
                                        <InputLabel value="Nomor SK" className="text-gray-700 dark:text-gray-300" />
                                        <TextInput
                                            value={data.sk_kepala_sekolah}
                                            onChange={(e) => setData('sk_kepala_sekolah', e.target.value)}
                                            className="mt-1 block w-full bg-white border-gray-300 dark:bg-gray-800 dark:border-gray-600 dark:text-white rounded-lg shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                            required
                                        />
                                        <InputError message={errors.sk_kepala_sekolah} className="mt-2" />
                                    </div>
                                    <div className="md:col-span-2">
                                        <InputLabel value="Tanggal SK" className="text-gray-700 dark:text-gray-300" />
                                        <DatePicker
                                            value={data.tanggal_sk_kepala_sekolah}
                                            onChange={(date) => setData('tanggal_sk_kepala_sekolah', date ? format(date, 'yyyy-MM-dd') : '')}
                                            className="mt-1 w-full"
                                            placeholder="Pilih Tanggal SK"
                                        />
                                        <InputError message={errors.tanggal_sk_kepala_sekolah} className="mt-2" />
                                    </div>
                                </div>
                            </div>

                            {/* Section 3: Bendahara */}
                            <div className="bg-purple-50 dark:bg-purple-900/10 p-5 rounded-xl border border-purple-100 dark:border-purple-800/30">
                                <h3 className="text-sm font-bold text-purple-700 dark:text-purple-300 uppercase tracking-wider mb-4 flex items-center gap-2">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                                    </svg>
                                    Data Bendahara
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div className="md:col-span-2">
                                        <InputLabel value="Nama Lengkap" className="text-gray-700 dark:text-gray-300" />
                                        <TextInput
                                            value={data.bendahara}
                                            onChange={(e) => setData('bendahara', e.target.value)}
                                            className="mt-1 block w-full bg-white border-gray-300 dark:bg-gray-800 dark:border-gray-600 dark:text-white rounded-lg shadow-sm focus:border-purple-500 focus:ring-purple-500"
                                            required
                                            placeholder="Nama lengkap beserta gelar"
                                        />
                                        <InputError message={errors.bendahara} className="mt-2" />
                                    </div>
                                    <div>
                                        <InputLabel value="NIP" className="text-gray-700 dark:text-gray-300" />
                                        <TextInput
                                            value={data.nip_bendahara}
                                            onChange={(e) => setData('nip_bendahara', e.target.value)}
                                            className="mt-1 block w-full bg-white border-gray-300 dark:bg-gray-800 dark:border-gray-600 dark:text-white rounded-lg shadow-sm focus:border-purple-500 focus:ring-purple-500"
                                            required
                                        />
                                        <InputError message={errors.nip_bendahara} className="mt-2" />
                                    </div>
                                    <div>
                                        <InputLabel value="Nomor SK" className="text-gray-700 dark:text-gray-300" />
                                        <TextInput
                                            value={data.sk_bendahara}
                                            onChange={(e) => setData('sk_bendahara', e.target.value)}
                                            className="mt-1 block w-full bg-white border-gray-300 dark:bg-gray-800 dark:border-gray-600 dark:text-white rounded-lg shadow-sm focus:border-purple-500 focus:ring-purple-500"
                                            required
                                        />
                                        <InputError message={errors.sk_bendahara} className="mt-2" />
                                    </div>
                                    <div className="md:col-span-2">
                                        <InputLabel value="Tanggal SK" className="text-gray-700 dark:text-gray-300" />
                                        <DatePicker
                                            value={data.tanggal_sk_bendahara}
                                            onChange={(date) => setData('tanggal_sk_bendahara', date ? format(date, 'yyyy-MM-dd') : '')}
                                            className="mt-1 w-full"
                                            placeholder="Pilih Tanggal SK"
                                        />
                                        <InputError message={errors.tanggal_sk_bendahara} className="mt-2" />
                                    </div>
                                </div>
                            </div>

                            {/* Footer / Actions */}
                            <div className="flex justify-end gap-3 pt-6 border-t border-gray-200 dark:border-gray-700">
                                <SecondaryButton onClick={() => setIsModalOpen(false)} disabled={processing}>
                                    Batal
                                </SecondaryButton>
                                <PrimaryButton
                                    className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-lg shadow-indigo-500/30 border-0"
                                    disabled={processing}
                                >
                                    {processing ? (
                                        <span className="flex items-center gap-2">
                                            <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Menyimpan...
                                        </span>
                                    ) : 'Simpan Anggaran'}
                                </PrimaryButton>
                            </div>
                        </form>
                    </div>
                </div>
            </Modal>
            {/* Modal Konfirmasi Hapus */}
            <Modal show={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} maxWidth="md">
                <div className="p-6">
                    <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                        Apakah Anda yakin ingin menghapus data ini?
                    </h2>

                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                        Data yang dihapus tidak dapat dikembalikan. Semua data yang terkait dengan anggaran ini juga akan dihapus.
                    </p>

                    <div className="mt-6 flex justify-end gap-3">
                        <SecondaryButton onClick={() => setIsDeleteModalOpen(false)} disabled={isDeleting}>
                            Batal
                        </SecondaryButton>

                        <DangerButton onClick={confirmDelete} disabled={isDeleting}>
                            {isDeleting ? 'Menghapus...' : 'Hapus Anggaran'}
                        </DangerButton>
                    </div>
                </div>

            </Modal>


        </AuthenticatedLayout>
    );
}
