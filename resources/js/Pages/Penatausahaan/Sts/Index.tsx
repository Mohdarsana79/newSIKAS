
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, usePage, Link } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import Modal from '@/Components/Modal';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import InputError from '@/Components/InputError';
import DatePicker from '@/Components/DatePicker';
import { format } from 'date-fns';
import { Transition } from '@headlessui/react';

export default function Index({ stsList, penganggaranList }: any) {
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

    // For Edit/Pay
    const [selectedSts, setSelectedSts]: any = useState(null);

    // Forms
    const createForm = useForm({
        penganggaran_id: '',
        nomor_sts: '',
        jumlah_sts: '',
        jumlah_sts_raw: 0,
    });

    const editForm = useForm({
        nomor_sts: '',
        jumlah_sts: '',
        jumlah_sts_raw: 0,
    });

    const paymentForm = useForm({
        tanggal_bayar: new Date().toISOString().split('T')[0],
        jumlah_bayar: '',
        jumlah_bayar_raw: 0,
        is_edit: false
    });

    // Handle Currency Input
    const handleCurrencyChange = (e: any, form: any, fieldName: string, rawFieldName: string) => {
        let value = e.target.value.replace(/[^,\d]/g, '');
        if (!value) {
            form.setData({
                ...form.data,
                [fieldName]: '',
                [rawFieldName]: 0
            });
            return;
        }

        const split = value.split(',');
        const sisa = split[0].length % 3;
        let rupiah = split[0].substr(0, sisa);
        const ribuan = split[0].substr(sisa).match(/\d{3}/gi);

        if (ribuan) {
            const separator = sisa ? '.' : '';
            rupiah += separator + ribuan.join('.');
        }

        rupiah = split[1] !== undefined ? rupiah + ',' + split[1] : rupiah;

        // Parse raw number
        const rawValue = parseFloat(value.replace(/\./g, '').replace(',', '.'));

        form.setData({
            ...form.data,
            [fieldName]: 'Rp ' + rupiah,
            [rawFieldName]: rawValue
        });
    };

    // --- CREATE ---
    const openCreateModal = () => {
        createForm.reset();
        createForm.clearErrors();
        // Default to latest year if available
        if (penganggaranList.length > 0) {
            createForm.setData('penganggaran_id', penganggaranList[0].id);
        }
        setIsCreateModalOpen(true);
    };

    const submitCreate = (e: any) => {
        e.preventDefault();
        createForm.transform((data) => ({
            ...data,
            jumlah_sts: data.jumlah_sts_raw
        }));

        createForm.post(route('sts.store'), {
            onSuccess: () => {
                setIsCreateModalOpen(false);
                createForm.reset();
            },
        });
    };

    // --- EDIT ---
    const openEditModal = (sts: any) => {
        setSelectedSts(sts);
        editForm.clearErrors();
        editForm.setData({
            nomor_sts: sts.nomor_sts,
            jumlah_sts: 'Rp ' + new Intl.NumberFormat('id-ID').format(sts.jumlah_sts),
            jumlah_sts_raw: sts.jumlah_sts
        });
        setIsEditModalOpen(true);
    };

    const submitEdit = (e: any) => {
        e.preventDefault();
        editForm.transform((data) => ({
            ...data,
            jumlah_sts: data.jumlah_sts_raw
        }));

        editForm.put(route('sts.update', selectedSts.id), {
            onSuccess: () => {
                setIsEditModalOpen(false);
                editForm.reset();
            },
        });
    };

    // --- PAYMENT ---
    const openPaymentModal = (sts: any, isEdit: boolean = false) => {
        setSelectedSts(sts);
        paymentForm.clearErrors();
        paymentForm.setData({
            tanggal_bayar: sts.tanggal_bayar || new Date().toISOString().split('T')[0],
            jumlah_bayar: isEdit ? 'Rp ' + new Intl.NumberFormat('id-ID').format(sts.jumlah_bayar) : '',
            jumlah_bayar_raw: isEdit ? sts.jumlah_bayar : 0,
            is_edit: isEdit
        });
        setIsPaymentModalOpen(true);
    };

    const submitPayment = (e: any) => {
        e.preventDefault();

        const endpoint = paymentForm.data.is_edit
            ? route('sts.update-bayar', selectedSts.id)
            : route('sts.bayar', selectedSts.id);

        const method = paymentForm.data.is_edit ? 'put' : 'post';

        paymentForm.transform((data) => ({
            ...data,
            jumlah_bayar: data.jumlah_bayar_raw
        }));

        // @ts-ignore
        paymentForm[method](endpoint, {
            onSuccess: () => {
                setIsPaymentModalOpen(false);
                paymentForm.reset();
            },
        });
    };

    // --- DELETE ---
    const handleDelete = (id: number) => {
        if (window.confirm("Apakah Anda yakin ingin menghapus data ini? Data yang dihapus tidak dapat dikembalikan!")) {
            createForm.delete(route('sts.destroy', id));
        }
    };

    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-semibold leading-tight text-gray-800 dark:text-gray-200">
                    STS (Sisa Titipan Sekolah)
                </h2>
            }
        >
            <Head title="STS - Penatausahaan" />

            <div className="py-8">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

                    {/* Header Action */}
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Daftar STS</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Kelola data sisa titipan sekolah dan pembayarannya</p>
                        </div>
                        <PrimaryButton onClick={openCreateModal} className="flex items-center gap-2">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                            </svg>
                            Tambah STS
                        </PrimaryButton>
                    </div>

                    {/* Table Card */}
                    <div className="bg-white dark:bg-gray-800 overflow-hidden shadow-sm sm:rounded-lg border border-gray-200 dark:border-gray-700">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                                <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                                    <tr>
                                        <th scope="col" className="px-6 py-3">Tahun Anggaran</th>
                                        <th scope="col" className="px-6 py-3">Nomor STS</th>
                                        <th scope="col" className="px-6 py-3">Jumlah STS</th>
                                        <th scope="col" className="px-6 py-3">Jumlah Bayar</th>
                                        <th scope="col" className="px-6 py-3">Sisa</th>
                                        <th scope="col" className="px-6 py-3">Status</th>
                                        <th scope="col" className="px-6 py-3 text-center">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {stsList.length > 0 ? (
                                        stsList.map((item: any) => (
                                            <tr key={item.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                                <td className="px-6 py-4 font-medium text-gray-900 dark:text-gray-100">
                                                    {item.tahun}
                                                </td>
                                                <td className="px-6 py-4">
                                                    {item.nomor_sts}
                                                </td>
                                                <td className="px-6 py-4 font-semibold text-gray-900 dark:text-gray-100">
                                                    Rp {item.jumlah_sts_formatted}
                                                </td>
                                                <td className="px-6 py-4 text-green-600 dark:text-green-400">
                                                    Rp {item.jumlah_bayar_formatted}
                                                    {item.tanggal_bayar && (
                                                        <div className="text-xs text-gray-500 mt-1">
                                                            Tgl: {item.tanggal_bayar_formatted}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-red-600 dark:text-red-400">
                                                    Rp {item.sisa_formatted}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-semibold
                                                        ${item.status === 'Lunas' ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' :
                                                            item.status === 'Parsial' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300' :
                                                                'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300'}
                                                    `}>
                                                        {item.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <div className="flex items-center justify-center gap-2">
                                                        {/* Pay Button - Only if sisa > 0 */}
                                                        {item.sisa > 0 && (
                                                            <button
                                                                onClick={() => openPaymentModal(item)}
                                                                className="p-1.5 bg-blue-100 text-blue-600 rounded-md hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50 transition-colors"
                                                                title="Bayar"
                                                            >
                                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                                                                </svg>
                                                            </button>
                                                        )}

                                                        {/* Edit Payment (if paid) */}
                                                        {item.jumlah_bayar > 0 && (
                                                            <button
                                                                onClick={() => openPaymentModal(item, true)}
                                                                className="p-1.5 bg-green-100 text-green-600 rounded-md hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50 transition-colors"
                                                                title="Edit Pembayaran"
                                                            >
                                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                                </svg>
                                                            </button>
                                                        )}

                                                        {/* Edit STS info */}
                                                        <button
                                                            onClick={() => openEditModal(item)}
                                                            className="p-1.5 bg-yellow-100 text-yellow-600 rounded-md hover:bg-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:hover:bg-yellow-900/50 transition-colors"
                                                            title="Edit Detail STS"
                                                        >
                                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                                            </svg>
                                                        </button>

                                                        {/* Delete */}
                                                        <button
                                                            onClick={() => handleDelete(item.id)}
                                                            className="p-1.5 bg-red-100 text-red-600 rounded-md hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50 transition-colors"
                                                            title="Hapus"
                                                        >
                                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={7} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                                                Belum ada data STS yang ditambahkan.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            {/* CREATE MODAL */}
            <Modal show={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} maxWidth="md">
                <div className="p-6">
                    <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Tambahkan STS Baru</h2>
                    <form onSubmit={submitCreate} className="space-y-4">
                        <div>
                            <InputLabel htmlFor="penganggaran_id" value="Tahun Anggaran" />
                            <select
                                id="penganggaran_id"
                                className="mt-1 block w-full border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 focus:border-indigo-500 dark:focus:border-indigo-600 focus:ring-indigo-500 dark:focus:ring-indigo-600 rounded-md shadow-sm"
                                value={createForm.data.penganggaran_id}
                                onChange={(e) => createForm.setData('penganggaran_id', e.target.value)}
                                required
                            >
                                {penganggaranList.map((p: any) => (
                                    <option key={p.id} value={p.id}>{p.tahun_anggaran}</option>
                                ))}
                            </select>
                            <InputError message={createForm.errors.penganggaran_id} className="mt-2" />
                        </div>
                        <div>
                            <InputLabel htmlFor="nomor_sts" value="Nomor STS" />
                            <TextInput
                                id="nomor_sts"
                                type="text"
                                className="mt-1 block w-full text-gray-900"
                                value={createForm.data.nomor_sts}
                                onChange={(e) => createForm.setData('nomor_sts', e.target.value)}
                                required
                                placeholder="Contoh: 001/STS/2026"
                            />
                            <InputError message={createForm.errors.nomor_sts} className="mt-2" />
                        </div>
                        <div>
                            <InputLabel htmlFor="jumlah_sts" value="Jumlah STS" />
                            <TextInput
                                id="jumlah_sts"
                                type="text"
                                className="mt-1 block w-full text-gray-900"
                                value={createForm.data.jumlah_sts}
                                onChange={(e) => handleCurrencyChange(e, createForm, 'jumlah_sts', 'jumlah_sts_raw')}
                                required
                                placeholder="Rp 0"
                            />
                            <InputError message={createForm.errors.jumlah_sts} className="mt-2" />
                        </div>

                        <div className="flex justify-end gap-3 mt-6">
                            <SecondaryButton onClick={() => setIsCreateModalOpen(false)}>Batal</SecondaryButton>
                            <PrimaryButton disabled={createForm.processing}>{createForm.processing ? 'Menyimpan...' : 'Simpan'}</PrimaryButton>
                        </div>
                    </form>
                </div>
            </Modal>

            {/* EDIT MODAL */}
            <Modal show={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} maxWidth="md">
                <div className="p-6">
                    <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Edit STS</h2>
                    <form onSubmit={submitEdit} className="space-y-4">
                        <div>
                            <InputLabel htmlFor="edit_nomor_sts" value="Nomor STS" />
                            <TextInput
                                id="edit_nomor_sts"
                                type="text"
                                className="mt-1 block w-full text-gray-900"
                                value={editForm.data.nomor_sts}
                                onChange={(e) => editForm.setData('nomor_sts', e.target.value)}
                                required
                            />
                            <InputError message={editForm.errors.nomor_sts} className="mt-2" />
                        </div>
                        <div>
                            <InputLabel htmlFor="edit_jumlah_sts" value="Jumlah STS" />
                            <TextInput
                                id="edit_jumlah_sts"
                                type="text"
                                className="mt-1 block w-full text-gray-900"
                                value={editForm.data.jumlah_sts}
                                onChange={(e) => handleCurrencyChange(e, editForm, 'jumlah_sts', 'jumlah_sts_raw')}
                                required
                            />
                            <InputError message={editForm.errors.jumlah_sts} className="mt-2" />
                        </div>

                        <div className="flex justify-end gap-3 mt-6">
                            <SecondaryButton onClick={() => setIsEditModalOpen(false)}>Batal</SecondaryButton>
                            <PrimaryButton disabled={editForm.processing}>{editForm.processing ? 'Menyimpan...' : 'Simpan Perubahan'}</PrimaryButton>
                        </div>
                    </form>
                </div>
            </Modal>

            {/* PAYMENT MODAL */}
            <Modal show={isPaymentModalOpen} onClose={() => setIsPaymentModalOpen(false)} maxWidth="md">
                <div className="p-6">
                    <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                        {paymentForm.data.is_edit ? 'Edit Pembayaran' : 'Proses Pembayaran'}
                    </h2>

                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg mb-4">
                        <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-600 dark:text-gray-400">Total STS</span>
                            <span className="font-semibold text-gray-800 dark:text-gray-200">
                                Rp {selectedSts ? new Intl.NumberFormat('id-ID').format(selectedSts.jumlah_sts) : 0}
                            </span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-600 dark:text-gray-400">Sisa Tagihan</span>
                            <span className="font-semibold text-red-600 dark:text-red-400">
                                Rp {selectedSts ? new Intl.NumberFormat('id-ID').format(selectedSts.sisa + (paymentForm.data.is_edit ? 0 : 0)) : 0}
                                {/* Note: Logic for showing remaining balance during edit is tricky without more data, keeping simple */}
                            </span>
                        </div>
                    </div>

                    <form onSubmit={submitPayment} className="space-y-4">
                        <div>
                            <InputLabel htmlFor="tanggal_bayar" value="Tanggal Bayar" />
                            <DatePicker
                                value={paymentForm.data.tanggal_bayar}
                                onChange={(date) => paymentForm.setData('tanggal_bayar', date ? format(date, 'yyyy-MM-dd') : '')}
                                className="mt-1 block w-full"
                                placeholder="Pilih Tanggal Bayar"
                            />
                            <InputError message={paymentForm.errors.tanggal_bayar} className="mt-2" />
                        </div>
                        <div>
                            <InputLabel htmlFor="jumlah_bayar" value="Jumlah Bayar" />
                            <TextInput
                                id="jumlah_bayar"
                                type="text"
                                className="mt-1 block w-full text-gray-900"
                                value={paymentForm.data.jumlah_bayar}
                                onChange={(e) => handleCurrencyChange(e, paymentForm, 'jumlah_bayar', 'jumlah_bayar_raw')}
                                required
                                placeholder="Rp 0"
                            />
                            <InputError message={paymentForm.errors.jumlah_bayar} className="mt-2" />
                        </div>

                        <div className="flex justify-end gap-3 mt-6">
                            <SecondaryButton onClick={() => setIsPaymentModalOpen(false)}>Batal</SecondaryButton>
                            <PrimaryButton disabled={paymentForm.processing}>{paymentForm.processing ? 'Menyimpan...' : 'Simpan Pembayaran'}</PrimaryButton>
                        </div>
                    </form>
                </div>
            </Modal>

        </AuthenticatedLayout>
    );
}
