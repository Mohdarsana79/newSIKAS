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

            <div className="py-6 px-4 sm:px-6 lg:px-8 w-full mx-auto">
                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">Penganggaran</h1>
                        <p className="text-gray-600 dark:text-gray-400 mt-1">
                            Kelola anggaran dan laporan keuangan Anda dengan mudah.
                        </p>
                    </div>
                    <PrimaryButton
                        onClick={handleCreate}
                        className="bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500"
                    >
                        <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Tambah Baru
                    </PrimaryButton>
                </div>

                {/* Content Container */}
                <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg p-6 min-h-[500px]">
                    {/* Tabs */}
                    <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
                        <nav className="-mb-px flex space-x-6 overflow-x-auto" aria-label="Tabs">
                            {tabs.map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`
                                        whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200
                                        ${activeTab === tab
                                            ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                                        }
                                    `}
                                >
                                    {tab}
                                </button>
                            ))}
                        </nav>
                    </div>

                    {/* List */}
                    <div className="space-y-4">
                        {items.map((item) => (
                            <div
                                key={`${item.id}-${item.status}`}
                                className={`
                                    flex flex-col sm:flex-row items-center justify-between p-4 rounded-lg border transition-all duration-200
                                    ${item.status === 'perubahan'
                                        ? 'bg-white dark:bg-gray-800 border-yellow-400 hover:shadow-md'
                                        : 'bg-gray-50 dark:bg-gray-700/50 border-gray-100 dark:border-gray-700 hover:bg-white dark:hover:bg-gray-700 hover:shadow-sm'
                                    }
                                `}
                            >
                                <div className="flex items-center gap-4 w-full sm:w-auto">
                                    {/* Icon */}
                                    <div className={`p-3 rounded-lg ${item.status === 'perubahan' ? 'bg-yellow-50 text-yellow-500' : 'bg-blue-50 text-blue-500'}`}>
                                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                    </div>

                                    {/* Text Content */}
                                    <div>
                                        <h3 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                            {item.title}
                                            {/* Status Badge specifically for Perubahan */}
                                            {item.status === 'perubahan' && ( // Although the image has the badge below, putting it inline or distinct is detailed work.
                                                // Let's match the image: Title first, Pagu second. Badge in a separate block if needed.
                                                // Wait, image: Title on top. Pagu below. Badge below Pagu.
                                                null
                                            )}
                                        </h3>
                                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Pagu: {item.pagu}</p>

                                        {/* Badge for Perubahan */}
                                        {item.status === 'perubahan' && (
                                            <div className="mt-2 inline-flex items-center gap-1 px-3 py-1 rounded-full bg-yellow-400 text-yellow-900 text-xs font-semibold">
                                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                Status: RKAS Perubahan
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-2 mt-4 sm:mt-0">
                                    {/* Edit - Only for non-perubahan in the top row or maybe specific logic? 
                                        The image shows Edit pencil for the first item (regular), but not for the second? 
                                        Maybe status based. I'll add them based on item props or just static for now to match UI broadly 
                                        Item 1 has pencil. Item 2 doesn't. Item 3 doesn't.
                                        I'll add it conditionally for ID 1 just to match the visual.
                                    */}
                                    {/* Edit - Enabled for all items */}
                                    {/* Action Buttons */}
                                    {/* Edit - Only for Regular items without changes */}
                                    {/* Assuming logic for 'has_perubahan' is now handled elsewhere or we don't block edit here broadly yet */}
                                    {item.status === 'regular' && !item.has_perubahan && (
                                        <button
                                            onClick={() => handleEdit(item.id)}
                                            className="p-2 text-yellow-500 hover:bg-yellow-50 rounded-lg transition-colors"
                                            title="Edit"
                                        >
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                            </svg>
                                        </button>
                                    )}

                                    {/* 3. View Button */}
                                    <Link
                                        href={item.status === 'perubahan' ? route('rkas-perubahan.index', item.id) : route('rkas.index', item.id)}
                                        className={`p-2 rounded-lg border transition-colors inline-block ${item.status === 'perubahan' ? 'text-yellow-500 border-yellow-200 hover:bg-yellow-50' : 'text-indigo-600 border-indigo-200 hover:bg-indigo-50'}`}
                                        title="Lihat"
                                    >
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                        </svg>
                                    </Link>

                                    {/* Print Button */}
                                    {/* Print Button - Directs to RKAS Summary */}
                                    {/* Print Button */}
                                    {/* Print Button - Directs to RKAS Summary */}
                                    <Link
                                        href={item.status === 'perubahan' ? route('rkas-perubahan.summary', item.id) : route('rkas.summary', item.id)}
                                        className={`p-2 transition-colors inline-block ${item.status === 'perubahan' ? 'text-gray-400 hover:text-gray-600' : 'text-gray-400 hover:text-gray-600'}`}
                                        title="Cetak / Summary RKAS"
                                    >
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                        </svg>
                                    </Link>

                                    {/* Delete Button */}
                                    {/* Delete Button */}
                                    <button
                                        onClick={() => handleDelete(item.id, item.status)}
                                        className={`p-2 transition-colors ${item.status === 'perubahan' ? 'text-yellow-500 hover:bg-yellow-50' : 'text-red-400 hover:bg-red-50'}`}
                                        title="Hapus"
                                    >
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Modal Tambah Baru */}
            <Modal show={isModalOpen} onClose={() => setIsModalOpen(false)} maxWidth="2xl">
                <div className="p-6 bg-white dark:bg-gray-800 rounded-lg max-h-[90vh] overflow-y-auto">
                    <h2 className="text-xl font-semibold mb-6 text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2 sticky top-0 bg-white dark:bg-gray-800 z-10">
                        {editMode ? 'Edit Data Anggaran' : 'Tambah Data Anggaran'}
                    </h2>

                    <form onSubmit={submit} className="space-y-6">
                        {/* Section 1: Informasi Dasar */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2">
                                <InputLabel value="Pagu Anggaran (Rp)" className="text-gray-700 dark:text-gray-300" />
                                <TextInput
                                    value={data.pagu_anggaran}
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
                                    placeholder="Contoh: Rp 50.000.000"
                                    className="mt-1 block w-full bg-gray-50 border-gray-300 dark:bg-gray-900 dark:border-gray-700 dark:text-white"
                                    required
                                />
                                <InputError message={errors.pagu_anggaran} className="mt-2" />
                            </div>

                            <div>
                                <InputLabel value="Tahun Anggaran" className="text-gray-700 dark:text-gray-300" />
                                <TextInput
                                    type="number"
                                    value={data.tahun_anggaran}
                                    onChange={(e) => setData('tahun_anggaran', e.target.value)}
                                    className="mt-1 block w-full bg-gray-50 border-gray-300 dark:bg-gray-900 dark:border-gray-700 dark:text-white"
                                    required
                                />
                                <InputError message={errors.tahun_anggaran} className="mt-2" />
                            </div>

                            <div>
                                <InputLabel value="Nama Komite" className="text-gray-700 dark:text-gray-300" />
                                <TextInput
                                    value={data.komite}
                                    onChange={(e) => setData('komite', e.target.value)}
                                    className="mt-1 block w-full bg-gray-50 border-gray-300 dark:bg-gray-900 dark:border-gray-700 dark:text-white"
                                    required
                                />
                                <InputError message={errors.komite} className="mt-2" />
                            </div>
                        </div>

                        {/* Section 2: Kepala Sekolah */}
                        <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wider">Data Kepala Sekolah</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <InputLabel value="Nama Lengkap" className="text-gray-700 dark:text-gray-300" />
                                    <TextInput
                                        value={data.kepala_sekolah}
                                        onChange={(e) => setData('kepala_sekolah', e.target.value)}
                                        className="mt-1 block w-full bg-gray-50 border-gray-300 dark:bg-gray-900 dark:border-gray-700 dark:text-white"
                                        required
                                    />
                                    <InputError message={errors.kepala_sekolah} className="mt-2" />
                                </div>
                                <div>
                                    <InputLabel value="NIP" className="text-gray-700 dark:text-gray-300" />
                                    <TextInput
                                        value={data.nip_kepala_sekolah}
                                        onChange={(e) => setData('nip_kepala_sekolah', e.target.value)}
                                        className="mt-1 block w-full bg-gray-50 border-gray-300 dark:bg-gray-900 dark:border-gray-700 dark:text-white"
                                        required
                                    />
                                    <InputError message={errors.nip_kepala_sekolah} className="mt-2" />
                                </div>
                                <div>
                                    <InputLabel value="Nomor SK" className="text-gray-700 dark:text-gray-300" />
                                    <TextInput
                                        value={data.sk_kepala_sekolah}
                                        onChange={(e) => setData('sk_kepala_sekolah', e.target.value)}
                                        className="mt-1 block w-full bg-gray-50 border-gray-300 dark:bg-gray-900 dark:border-gray-700 dark:text-white"
                                        required
                                    />
                                    <InputError message={errors.sk_kepala_sekolah} className="mt-2" />
                                </div>
                                <div>
                                    <InputLabel value="Tanggal SK" className="text-gray-700 dark:text-gray-300" />
                                    <DatePicker
                                        value={data.tanggal_sk_kepala_sekolah}
                                        onChange={(date) => setData('tanggal_sk_kepala_sekolah', date ? format(date, 'yyyy-MM-dd') : '')}
                                        className="mt-1"
                                        placeholder="Pilih Tanggal SK"
                                    />
                                    <InputError message={errors.tanggal_sk_kepala_sekolah} className="mt-2" />
                                </div>
                            </div>
                        </div>

                        {/* Section 3: Bendahara */}
                        <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wider">Data Bendahara</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <InputLabel value="Nama Lengkap" className="text-gray-700 dark:text-gray-300" />
                                    <TextInput
                                        value={data.bendahara}
                                        onChange={(e) => setData('bendahara', e.target.value)}
                                        className="mt-1 block w-full bg-gray-50 border-gray-300 dark:bg-gray-900 dark:border-gray-700 dark:text-white"
                                        required
                                    />
                                    <InputError message={errors.bendahara} className="mt-2" />
                                </div>
                                <div>
                                    <InputLabel value="NIP" className="text-gray-700 dark:text-gray-300" />
                                    <TextInput
                                        value={data.nip_bendahara}
                                        onChange={(e) => setData('nip_bendahara', e.target.value)}
                                        className="mt-1 block w-full bg-gray-50 border-gray-300 dark:bg-gray-900 dark:border-gray-700 dark:text-white"
                                        required
                                    />
                                    <InputError message={errors.nip_bendahara} className="mt-2" />
                                </div>
                                <div>
                                    <InputLabel value="Nomor SK" className="text-gray-700 dark:text-gray-300" />
                                    <TextInput
                                        value={data.sk_bendahara}
                                        onChange={(e) => setData('sk_bendahara', e.target.value)}
                                        className="mt-1 block w-full bg-gray-50 border-gray-300 dark:bg-gray-900 dark:border-gray-700 dark:text-white"
                                        required
                                    />
                                    <InputError message={errors.sk_bendahara} className="mt-2" />
                                </div>
                                <div>
                                    <InputLabel value="Tanggal SK" className="text-gray-700 dark:text-gray-300" />
                                    <DatePicker
                                        value={data.tanggal_sk_bendahara}
                                        onChange={(date) => setData('tanggal_sk_bendahara', date ? format(date, 'yyyy-MM-dd') : '')}
                                        className="mt-1"
                                        placeholder="Pilih Tanggal SK"
                                    />
                                    <InputError message={errors.tanggal_sk_bendahara} className="mt-2" />
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                            <SecondaryButton onClick={() => setIsModalOpen(false)} disabled={processing}>
                                Batal
                            </SecondaryButton>
                            <PrimaryButton className="bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500" disabled={processing}>
                                {processing ? 'Menyimpan...' : 'Simpan'}
                            </PrimaryButton>
                        </div>
                    </form>
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
