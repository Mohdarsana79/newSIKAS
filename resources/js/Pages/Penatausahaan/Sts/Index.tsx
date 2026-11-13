
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, usePage, Link } from '@inertiajs/react';
import useVariantRoute from '@/Hooks/useVariantRoute';
import { useState } from 'react';
import PrimaryButton from '@/Components/PrimaryButton';
import PageHeader from '@/Components/ui/PageHeader';
import DataTable from '@/Components/ui/DataTable';
import EmptyState from '@/Components/ui/EmptyState';
import IconTile from '@/Components/ui/IconTile';
import StatusBadge from '@/Components/ui/StatusBadge';
import StsModals from './Partials/StsModals';

export default function Index({ stsList, penganggaranList, penganggaranFk = 'penganggaran_id' }: any) {
    const vroute = useVariantRoute();
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<number | null>(null);

    // For Edit/Pay
    const [selectedSts, setSelectedSts]: any = useState(null);

    // Forms
    const createForm = useForm({
        [penganggaranFk]: '',
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
            createForm.setData(penganggaranFk, penganggaranList[0].id);
        }
        setIsCreateModalOpen(true);
    };

    const submitCreate = (e: any) => {
        e.preventDefault();
        createForm.transform((data) => ({
            ...data,
            jumlah_sts: data.jumlah_sts_raw
        }));

        createForm.post(vroute('sts.store'), {
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

        editForm.put(vroute('sts.update', selectedSts.id), {
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
            ? vroute('sts.update-bayar', selectedSts.id)
            : vroute('sts.bayar', selectedSts.id);

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
    const handleDeleteClick = (id: number) => {
        setItemToDelete(id);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = () => {
        if (!itemToDelete) return;
        createForm.delete(vroute('sts.destroy', itemToDelete), {
            onSuccess: () => {
                setIsDeleteModalOpen(false);
                setItemToDelete(null);
            }
        });
    };

    return (
        <AuthenticatedLayout>
            <Head title="STS - Penatausahaan" />

            <div className="space-y-4">
                <PageHeader
                    className="animate-rise"
                    breadcrumb={[
                        { label: 'Dashboard' },
                        { label: 'Penatausahaan' },
                        { label: 'STS' },
                    ]}
                    title="Daftar STS"
                    badge={<StatusBadge tone="violet" dot={false}>Penatausahaan</StatusBadge>}
                    subtitle="Kelola data sisa titipan sekolah dan pembayarannya"
                    actions={
                        <PrimaryButton onClick={openCreateModal} className="flex items-center gap-2">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                            </svg>
                            Tambah STS
                        </PrimaryButton>
                    }
                />

                {/* Kartu ringkas dari data existing */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div className="sikas-card sikas-card-hover animate-rise p-4" style={{ animationDelay: '60ms' }}>
                        <div className="flex items-center gap-2.5">
                            <IconTile tone="sky" size="md">
                                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
                                    <path d="M9 3h6v4H9z" />
                                    <path d="M9 12h6M9 16h4" />
                                </svg>
                            </IconTile>
                            <div className="min-w-0">
                                <p className="text-[11.5px] font-extrabold tracking-tight text-slate-900 dark:text-white">Total STS</p>
                                <p className="text-[9.5px] font-medium text-slate-400 dark:text-slate-500">Dokumen tercatat</p>
                            </div>
                        </div>
                        <p className="mt-3 text-sikas-num text-[19px] font-extrabold tracking-tight text-slate-900 dark:text-white">
                            {stsList.length}
                        </p>
                    </div>

                    <div className="sikas-card sikas-card-hover animate-rise p-4" style={{ animationDelay: '110ms' }}>
                        <div className="flex items-center gap-2.5">
                            <IconTile tone="mint" size="md">
                                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </IconTile>
                            <div className="min-w-0">
                                <p className="text-[11.5px] font-extrabold tracking-tight text-slate-900 dark:text-white">Lunas</p>
                                <p className="text-[9.5px] font-medium text-slate-400 dark:text-slate-500">STS sudah dibayar</p>
                            </div>
                        </div>
                        <p className="mt-3 text-sikas-num text-[19px] font-extrabold tracking-tight text-slate-900 dark:text-white">
                            {stsList.filter((item: any) => item.status === 'Lunas').length}
                        </p>
                    </div>

                    <div className="sikas-card sikas-card-hover animate-rise p-4" style={{ animationDelay: '160ms' }}>
                        <div className="flex items-center gap-2.5">
                            <IconTile tone="rose" size="md">
                                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                                </svg>
                            </IconTile>
                            <div className="min-w-0">
                                <p className="text-[11.5px] font-extrabold tracking-tight text-slate-900 dark:text-white">Total Sisa</p>
                                <p className="text-[9.5px] font-medium text-slate-400 dark:text-slate-500">Sisa titipan sekolah</p>
                            </div>
                        </div>
                        <p className="mt-3 truncate text-sikas-num text-[19px] font-extrabold tracking-tight text-slate-900 dark:text-white">
                            Rp {new Intl.NumberFormat('id-ID').format(stsList.reduce((acc: number, item: any) => acc + Number(item.sisa || 0), 0))}
                        </p>
                    </div>
                </div>

                {/* Tabel STS */}
                <div className="animate-rise" style={{ animationDelay: '210ms' }}>
                    <DataTable
                        title="Daftar STS"
                        subtitle="Sisa titipan sekolah dan status pembayarannya."
                        icon={
                            <IconTile tone="sky" size="sm">
                                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M4 6h16M4 12h16M4 18h10" />
                                </svg>
                            </IconTile>
                        }
                        actions={<StatusBadge tone="info" dot={false} className="text-sikas-num">{stsList.length}</StatusBadge>}
                        contentClassName="bento-table-wrapper mx-4 mb-4"
                    >
                        <table className="min-w-full">
                            <thead>
                                <tr>
                                    <th scope="col" className="text-left">Tahun Anggaran</th>
                                    <th scope="col" className="text-left">Nomor STS</th>
                                    <th scope="col" className="text-right">Jumlah STS</th>
                                    <th scope="col" className="text-right">Jumlah Bayar</th>
                                    <th scope="col" className="text-right">Sisa</th>
                                    <th scope="col" className="text-left">Status</th>
                                    <th scope="col" className="text-center">Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {stsList.length > 0 ? (
                                    stsList.map((item: any) => (
                                        <tr key={item.id}>
                                            <td className="whitespace-nowrap text-sikas-num font-extrabold text-slate-900 dark:text-white">
                                                {item.tahun}
                                            </td>
                                            <td className="whitespace-nowrap font-semibold text-slate-700 dark:text-slate-200">
                                                {item.nomor_sts}
                                            </td>
                                            <td className="whitespace-nowrap text-right text-sikas-num font-extrabold text-slate-900 dark:text-white">
                                                Rp {item.jumlah_sts_formatted}
                                            </td>
                                            <td className="whitespace-nowrap text-right text-sikas-num font-semibold text-mint dark:text-mint">
                                                Rp {item.jumlah_bayar_formatted}
                                                {item.tanggal_bayar && (
                                                    <div className="mt-1 text-[10px] font-medium text-slate-400 dark:text-slate-500">
                                                        Tgl: {item.tanggal_bayar_formatted}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="whitespace-nowrap text-right text-sikas-num font-semibold text-rose-600 dark:text-rose-400">
                                                Rp {item.sisa_formatted}
                                            </td>
                                            <td className="whitespace-nowrap">
                                                <StatusBadge tone={item.status === 'Lunas' ? 'success' : item.status === 'Parsial' ? 'warning' : 'danger'}>
                                                    {item.status}
                                                </StatusBadge>
                                            </td>
                                            <td className="whitespace-nowrap text-center">
                                                <div className="flex items-center justify-center gap-1.5">
                                                    {/* Pay Button - Only if sisa > 0 */}
                                                    {item.sisa > 0 && (
                                                        <button
                                                            onClick={() => openPaymentModal(item)}
                                                            className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-100 bg-white text-sky-600 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50 hover:text-sky-700 dark:border-white/10 dark:bg-white/5 dark:text-sky-400 dark:hover:bg-white/10"
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
                                                            className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-100 bg-white text-mint shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-mint dark:hover:bg-white/10"
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
                                                        className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-100 bg-white text-amber-600 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50 hover:text-amber-700 dark:border-white/10 dark:bg-white/5 dark:text-amber-400 dark:hover:bg-white/10"
                                                        title="Edit Detail STS"
                                                    >
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                                        </svg>
                                                    </button>

                                                    {/* Delete */}
                                                    <button
                                                        onClick={() => handleDeleteClick(item.id)}
                                                        className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-100 bg-white text-rose-600 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50 hover:text-rose-700 dark:border-white/10 dark:bg-white/5 dark:text-rose-400 dark:hover:bg-white/10"
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
                                        <td colSpan={7} className="p-0">
                                            <EmptyState
                                                className="border-0 bg-transparent py-9 dark:bg-transparent"
                                                icon={
                                                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                                    </svg>
                                                }
                                                title="Belum ada data STS yang ditambahkan."
                                                description="Tambahkan STS baru untuk mulai mencatat sisa titipan sekolah."
                                            />
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </DataTable>
                </div>
            </div>

            <StsModals
                penganggaranList={penganggaranList}
                penganggaranFk={penganggaranFk}
                selectedSts={selectedSts}
                stsToDelete={stsList?.find((s: any) => s.id === itemToDelete) || null}
                handleCurrencyChange={handleCurrencyChange}
                isCreateOpen={isCreateModalOpen}
                onCloseCreate={() => setIsCreateModalOpen(false)}
                createForm={createForm}
                onSubmitCreate={submitCreate}
                isEditOpen={isEditModalOpen}
                onCloseEdit={() => setIsEditModalOpen(false)}
                editForm={editForm}
                onSubmitEdit={submitEdit}
                isPaymentOpen={isPaymentModalOpen}
                onClosePayment={() => setIsPaymentModalOpen(false)}
                paymentForm={paymentForm}
                onSubmitPayment={submitPayment}
                isDeleteOpen={isDeleteModalOpen}
                onCloseDelete={() => setIsDeleteModalOpen(false)}
                onConfirmDelete={confirmDelete}
                deleteProcessing={createForm.processing}
            />

        </AuthenticatedLayout>
    );
}
