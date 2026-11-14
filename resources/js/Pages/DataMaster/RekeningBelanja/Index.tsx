import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm } from '@inertiajs/react';
import { PageProps } from '@/types';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import TextInput from '@/Components/TextInput';
import { Fragment, useEffect, useState } from 'react';
import PageHeader from '@/Components/ui/PageHeader';
import Surface from '@/Components/ui/Surface';
import DataTable from '@/Components/ui/DataTable';
import EmptyState from '@/Components/ui/EmptyState';
import IconTile from '@/Components/ui/IconTile';
import StatusBadge from '@/Components/ui/StatusBadge';
import RekeningBelanjaModals, { RekeningBelanjaItem } from './Partials/RekeningBelanjaModals';

export default function Index({ auth, rekening_belanja }: PageProps<{ rekening_belanja: RekeningBelanjaItem[] }>) {
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<RekeningBelanjaItem | null>(null);
    const ITEMS_PER_PAGE = 10;

    const { data, setData, post, put, delete: destroy, processing, errors, reset, clearErrors } = useForm({
        kode_rekening: '',
        rincian_objek: '',
        kategori: '',
        is_ppn: false,
        is_pph21: false,
        is_pph22: false,
        is_pph23: false,
        is_pph4: false,
    });

    const { data: importData, setData: setImportData, post: postImport, progress: importProgress, processing: importProcessing, errors: importErrors, reset: resetImport, clearErrors: clearImportErrors } = useForm<{ file: File | null }>({
        file: null,
    });

    // Client-side filtering and pagination
    const filteredData = rekening_belanja.filter((item) => {
        if (!search) return true;
        const lowerSearch = search.toLowerCase();
        return (
            item.kode_rekening.toLowerCase().includes(lowerSearch) ||
            item.rincian_objek.toLowerCase().includes(lowerSearch) ||
            item.kategori.toLowerCase().includes(lowerSearch)
        );
    });

    const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);
    const currentData = filteredData.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    // Reset page to 1 when search changes
    useEffect(() => {
        setCurrentPage(1);
    }, [search]);

    const resetForm = () => {
        reset();
        clearErrors();
        setEditingId(null);
    };

    const closeAddModal = () => {
        setIsAddModalOpen(false);
        resetForm();
    };

    const closeEditModal = () => {
        setIsEditModalOpen(false);
        resetForm();
    };

    const closeImportModal = () => {
        setIsImportModalOpen(false);
        resetImport();
        clearImportErrors();
    };

    const closeDeleteModal = () => {
        setIsDeleteModalOpen(false);
        setDeleteTarget(null);
    };

    const submitAdd = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('rekening-belanja.store'), {
            onSuccess: () => {
                closeAddModal();
            },
        });
    };

    const submitEdit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingId) {
            put(route('rekening-belanja.update', editingId), {
                onSuccess: () => {
                    closeEditModal();
                },
            });
        }
    };

    const submitImport = (e: React.FormEvent) => {
        e.preventDefault();
        postImport(route('rekening-belanja.import'), {
            onSuccess: () => {
                closeImportModal();
            },
        });
    };

    const handleEdit = (item: RekeningBelanjaItem) => {
        clearErrors();
        setEditingId(item.id);
        setData({
            kode_rekening: item.kode_rekening,
            rincian_objek: item.rincian_objek,
            kategori: item.kategori,
            is_ppn: !!item.is_ppn,
            is_pph21: !!item.is_pph21,
            is_pph22: !!item.is_pph22,
            is_pph23: !!item.is_pph23,
            is_pph4: !!item.is_pph4,
        });
        setIsEditModalOpen(true);
    };

    const handleDelete = (item: RekeningBelanjaItem) => {
        setDeleteTarget(item);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = () => {
        if (deleteTarget) {
            destroy(route('rekening-belanja.destroy', deleteTarget.id), {
                onSuccess: () => {
                    closeDeleteModal();
                },
            });
        }
    };

    const renderTaxBadge = (isTaxed: boolean) => (
        isTaxed ? 
        <span className="inline-flex rounded-full border border-rose-200 bg-pastel-rose px-2 py-0.5 text-[9.5px] font-extrabold text-rose-600 shadow-sm dark:border-rose-400/20 dark:bg-rose-500/10 dark:text-rose-300">TRUE</span> : 
        <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[9.5px] font-extrabold text-slate-400 shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-slate-500">FALSE</span>
    );

    return (
        <AuthenticatedLayout>
            <Head title="Rekening Belanja" />

            <div className="space-y-4">
                <PageHeader
                    className="animate-rise"
                    breadcrumb={[
                        { label: 'Dashboard' },
                        { label: 'Data Master' },
                        { label: 'Rekening Belanja' },
                    ]}
                    title="Data Rekening Belanja"
                    badge={<StatusBadge tone="violet" dot={false}>Data Master</StatusBadge>}
                    subtitle="Referensi kode rekening, rincian objek, dan pengaturan pajak belanja."
                    actions={
                        <>
                            <SecondaryButton onClick={() => setIsImportModalOpen(true)}>
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                </svg>
                                Import Excel
                            </SecondaryButton>
                            <PrimaryButton onClick={() => { resetForm(); setIsAddModalOpen(true); }}>
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                Tambah Data
                            </PrimaryButton>
                        </>
                    }
                />

                {/* Kartu ringkas dari data existing */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div className="sikas-card sikas-card-hover animate-rise p-4" style={{ animationDelay: '60ms' }}>
                        <div className="flex items-center gap-2.5">
                            <IconTile tone="violet" size="md">
                                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M4 6h16M4 12h16M4 18h10" />
                                </svg>
                            </IconTile>
                            <div className="min-w-0">
                                <p className="text-[11.5px] font-extrabold tracking-tight text-slate-900 dark:text-white">Total Rekening</p>
                                <p className="text-[9.5px] font-medium text-slate-400 dark:text-slate-500">Baris data</p>
                            </div>
                        </div>
                        <p className="mt-3 text-sikas-num text-[19px] font-extrabold tracking-tight text-slate-900 dark:text-white">
                            {rekening_belanja.length}
                        </p>
                    </div>

                    <div className="sikas-card sikas-card-hover animate-rise p-4" style={{ animationDelay: '110ms' }}>
                        <div className="flex items-center gap-2.5">
                            <IconTile tone="sky" size="md">
                                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
                                    <path d="M9 3h6v4H9z" />
                                    <path d="M9 12h6M9 16h4" />
                                </svg>
                            </IconTile>
                            <div className="min-w-0">
                                <p className="text-[11.5px] font-extrabold tracking-tight text-slate-900 dark:text-white">Kategori</p>
                                <p className="text-[9.5px] font-medium text-slate-400 dark:text-slate-500">Kategori unik</p>
                            </div>
                        </div>
                        <p className="mt-3 text-sikas-num text-[19px] font-extrabold tracking-tight text-slate-900 dark:text-white">
                            {new Set(rekening_belanja.map((item) => item.kategori)).size}
                        </p>
                    </div>

                    <div className="sikas-card sikas-card-hover animate-rise p-4" style={{ animationDelay: '160ms' }}>
                        <div className="flex items-center gap-2.5">
                            <IconTile tone="amber" size="md">
                                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M9 14l6-6" />
                                    <path d="M9 8h.01M15 14h.01" />
                                    <circle cx="12" cy="12" r="9" />
                                </svg>
                            </IconTile>
                            <div className="min-w-0">
                                <p className="text-[11.5px] font-extrabold tracking-tight text-slate-900 dark:text-white">Terkena Pajak</p>
                                <p className="text-[9.5px] font-medium text-slate-400 dark:text-slate-500">Rekening berpajak</p>
                            </div>
                        </div>
                        <p className="mt-3 text-sikas-num text-[19px] font-extrabold tracking-tight text-slate-900 dark:text-white">
                            {rekening_belanja.filter((item) => item.is_ppn || item.is_pph21 || item.is_pph22 || item.is_pph23 || item.is_pph4).length}
                        </p>
                    </div>
                </div>

                {/* Toolbar pencarian */}
                <div className="animate-rise" style={{ animationDelay: '210ms' }}>
                    <Surface padding="sm">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex w-full items-center gap-3 md:w-auto">
                                <IconTile tone="ink" size="sm">
                                    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                                        <circle cx="11" cy="11" r="7" />
                                        <path d="m21 21-4.3-4.3" />
                                    </svg>
                                </IconTile>
                                <div className="w-full md:w-80">
                                    <TextInput
                                        placeholder="Cari Kode atau Rincian..."
                                        className="w-full"
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                    />
                                </div>
                            </div>
                            <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">
                                <span className="text-sikas-num font-extrabold text-slate-700 dark:text-slate-200">{filteredData.length}</span> data ditemukan
                            </span>
                        </div>
                    </Surface>
                </div>

                {/* Tabel */}
                <div className="animate-rise" style={{ animationDelay: '260ms' }}>
                    <DataTable
                        title="Daftar Rekening Belanja"
                        subtitle="Referensi rekening belanja beserta pengaturan pajaknya."
                        icon={
                            <IconTile tone="violet" size="sm">
                                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M4 6h16M4 12h16M4 18h10" />
                                </svg>
                            </IconTile>
                        }
                        actions={<StatusBadge tone="info" dot={false} className="text-sikas-num">{filteredData.length}</StatusBadge>}
                        contentClassName="bento-table-wrapper mx-4 mb-4"
                        footer={
                            <>
                                <div className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">
                                    Menampilkan <span className="text-sikas-num font-extrabold text-slate-700 dark:text-slate-200">{filteredData.length > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0}</span> sampai <span className="text-sikas-num font-extrabold text-slate-700 dark:text-slate-200">{Math.min(currentPage * ITEMS_PER_PAGE, filteredData.length)}</span> dari <span className="text-sikas-num font-extrabold text-slate-700 dark:text-slate-200">{filteredData.length}</span> data
                                </div>
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                        disabled={currentPage === 1}
                                        className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-extrabold text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:border-slate-100 disabled:bg-slate-50 disabled:text-slate-300 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10 dark:disabled:border-white/5 dark:disabled:bg-white/5 dark:disabled:text-slate-600"
                                    >
                                        Previous
                                    </button>
                                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                                        .filter(page => page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1))
                                        .map((page, index, array) => (
                                            <Fragment key={page}>
                                                {index > 0 && array[index - 1] !== page - 1 && <span className="px-1 text-[10px] font-bold text-slate-300 dark:text-slate-600">...</span>}
                                                <button
                                                    onClick={() => setCurrentPage(page)}
                                                    className={`flex h-7 min-w-7 items-center justify-center rounded-xl px-2 text-[10px] font-extrabold transition text-sikas-num ${currentPage === page ? 'bg-lime-400 text-slate-950 shadow-lime' : 'text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-white/5'}`}
                                                >
                                                    {page}
                                                </button>
                                            </Fragment>
                                        ))}
                                    <button
                                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                        disabled={currentPage === totalPages || totalPages === 0}
                                        className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-extrabold text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:border-slate-100 disabled:bg-slate-50 disabled:text-slate-300 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10 dark:disabled:border-white/5 dark:disabled:bg-white/5 dark:disabled:text-slate-600"
                                    >
                                        Next
                                    </button>
                                </div>
                            </>
                        }
                    >
                        <table className="min-w-full">
                            <thead>
                                <tr>
                                    <th className="text-left">Kode Rekening</th>
                                    <th className="text-left">Rincian Objek</th>
                                    <th className="text-left">Kategori</th>
                                    <th className="text-center">PPN</th>
                                    <th className="text-center">PPh 21</th>
                                    <th className="text-center">PPh 22</th>
                                    <th className="text-center">PPh 23</th>
                                    <th className="text-center">PPh 4(2)</th>
                                    <th className="text-center">Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {currentData.length > 0 ? (
                                    currentData.map((item) => (
                                        <tr key={item.id}>
                                            <td className="whitespace-nowrap font-extrabold text-slate-900 dark:text-white">{item.kode_rekening}</td>
                                            <td className="text-slate-600 dark:text-slate-300">{item.rincian_objek}</td>
                                            <td className="text-slate-500 dark:text-slate-400">{item.kategori}</td>
                                            <td className="text-center">{renderTaxBadge(item.is_ppn)}</td>
                                            <td className="text-center">{renderTaxBadge(item.is_pph21)}</td>
                                            <td className="text-center">{renderTaxBadge(item.is_pph22)}</td>
                                            <td className="text-center">{renderTaxBadge(item.is_pph23)}</td>
                                            <td className="text-center">{renderTaxBadge(item.is_pph4)}</td>
                                            <td className="whitespace-nowrap text-center">
                                                <div className="flex items-center justify-center gap-1">
                                                    <button
                                                        onClick={() => handleEdit(item)}
                                                        className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-100 bg-white text-brand-600 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50 hover:text-brand-700 dark:border-white/10 dark:bg-white/5 dark:text-brand-300 dark:hover:bg-white/10"
                                                        title="Edit"
                                                    >
                                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                        </svg>
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(item)}
                                                        className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-100 bg-white text-rose-600 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50 hover:text-rose-700 dark:border-white/10 dark:bg-white/5 dark:text-rose-400 dark:hover:bg-white/10"
                                                        title="Hapus"
                                                    >
                                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={9} className="p-0">
                                            <EmptyState
                                                className="border-0 bg-transparent py-9 dark:bg-transparent"
                                                icon={
                                                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                                    </svg>
                                                }
                                                title={search ? 'Data tidak ditemukan untuk pencarian tersebut.' : 'Tidak ada data ditemukan.'}
                                                description="Coba ubah kata kunci pencarian atau tambahkan data rekening belanja baru."
                                            />
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </DataTable>
                </div>
            </div>

            <RekeningBelanjaModals
                isAddOpen={isAddModalOpen}
                onCloseAdd={closeAddModal}
                onSubmitAdd={submitAdd}
                isEditOpen={isEditModalOpen}
                onCloseEdit={closeEditModal}
                onSubmitEdit={submitEdit}
                data={data}
                setData={setData}
                errors={errors}
                processing={processing}
                isImportOpen={isImportModalOpen}
                onCloseImport={closeImportModal}
                importFile={importData.file}
                onChangeImportFile={(file) => setImportData('file', file)}
                importProgress={importProgress}
                importErrors={importErrors}
                importProcessing={importProcessing}
                onSubmitImport={submitImport}
                downloadTemplateUrl={route('rekening-belanja.download-template')}
                isDeleteOpen={isDeleteModalOpen}
                deleteTarget={deleteTarget}
                deleteProcessing={processing}
                onCloseDelete={closeDeleteModal}
                onConfirmDelete={confirmDelete}
            />
        </AuthenticatedLayout>
    );
}
