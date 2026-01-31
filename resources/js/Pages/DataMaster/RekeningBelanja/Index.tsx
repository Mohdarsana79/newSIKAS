import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, router, Link } from '@inertiajs/react';
import { PageProps } from '@/types';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import Modal from '@/Components/Modal';
import { useState, useEffect, Fragment } from 'react';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import InputError from '@/Components/InputError';

interface RekeningBelanja {
    id: number;
    kode_rekening: string;
    rincian_objek: string;
    kategori: string;
}

export default function Index({ auth, rekening_belanja }: PageProps<{ rekening_belanja: RekeningBelanja[] }>) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const ITEMS_PER_PAGE = 10;

    const { data, setData, post, put, delete: destroy, processing, errors, reset } = useForm({
        kode_rekening: '',
        rincian_objek: '',
        kategori: '',
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

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingId) {
            put(route('rekening-belanja.update', editingId), {
                onSuccess: () => {
                    setIsModalOpen(false);
                    reset();
                    setEditingId(null);
                },
            });
        } else {
            post(route('rekening-belanja.store'), {
                onSuccess: () => {
                    setIsModalOpen(false);
                    reset();
                },
            });
        }
    };

    const handleEdit = (item: RekeningBelanja) => {
        setEditingId(item.id);
        setData({
            kode_rekening: item.kode_rekening,
            rincian_objek: item.rincian_objek,
            kategori: item.kategori,
        });
        setIsModalOpen(true);
    };

    const handleDelete = (id: number) => {
        setDeleteId(id);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = () => {
        if (deleteId) {
            destroy(route('rekening-belanja.destroy', deleteId), {
                onSuccess: () => {
                    setIsDeleteModalOpen(false);
                    setDeleteId(null);
                },
            });
        }
    };

    return (
        <AuthenticatedLayout
            header={<h2 className="font-semibold text-xl text-gray-800 dark:text-gray-200 leading-tight">Data Rekening Belanja</h2>}
        >
            <Head title="Rekening Belanja" />

            <div className="py-6">
                <div className="bg-white dark:bg-gray-800 overflow-hidden shadow-sm sm:rounded-lg p-6">
                    {/* Toolbar */}
                    <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                        <div className="w-full md:w-1/3">
                            <TextInput
                                placeholder="Cari Kode atau Rincian..."
                                className="w-full text-gray-900 bg-white"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                        <div className="flex gap-2">
                            <SecondaryButton onClick={() => setIsImportModalOpen(true)}>Import Excel</SecondaryButton>
                            <PrimaryButton onClick={() => setIsModalOpen(true)}>Tambah Data</PrimaryButton>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-700">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Kode Rekening</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Rincian Objek</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Kategori</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                {currentData.length > 0 ? (
                                    currentData.map((item) => (
                                        <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200 font-medium">{item.kode_rekening}</td>
                                            <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">{item.rincian_objek}</td>
                                            <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">{item.kategori}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                <div className="flex gap-2">
                                                    <button onClick={() => handleEdit(item)} className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300">
                                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                        </svg>
                                                    </button>
                                                    <button onClick={() => handleDelete(item.id)} className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300">
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
                                        <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                                            {search ? 'Data tidak ditemukan untuk pencarian tersebut.' : 'Tidak ada data ditemukan.'}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    <div className="mt-4 flex flex-col sm:flex-row justify-between items-center gap-4">
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                            Menampilkan {filteredData.length > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0} sampai {Math.min(currentPage * ITEMS_PER_PAGE, filteredData.length)} dari {filteredData.length} data
                        </div>
                        <div className="flex gap-1">
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1}
                                className="px-3 py-1 text-sm rounded-md bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Previous
                            </button>
                            {Array.from({ length: totalPages }, (_, i) => i + 1)
                                .filter(page => page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1))
                                .map((page, index, array) => (
                                    <Fragment key={page}>
                                        {index > 0 && array[index - 1] !== page - 1 && <span className="px-2">...</span>}
                                        <button
                                            onClick={() => setCurrentPage(page)}
                                            className={`px-3 py-1 text-sm rounded-md ${currentPage === page ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50'}`}
                                        >
                                            {page}
                                        </button>
                                    </Fragment>
                                ))}
                            <button
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                disabled={currentPage === totalPages || totalPages === 0}
                                className="px-3 py-1 text-sm rounded-md bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal Tambah */}
            <Modal show={isModalOpen} onClose={() => setIsModalOpen(false)}>
                <div className="p-6 bg-gray-800 text-white rounded-lg">
                    <h2 className="text-lg font-medium text-white mb-4">{editingId ? 'Edit Rekening Belanja' : 'Input Rekening Belanja'}</h2>
                    <form onSubmit={submit} className="space-y-4">
                        <div>
                            <InputLabel htmlFor="kode_rekening" value="Kode Rekening" className="text-gray-300" />
                            <TextInput
                                id="kode_rekening"
                                value={data.kode_rekening}
                                onChange={(e) => setData('kode_rekening', e.target.value)}
                                className="mt-1 block w-full bg-gray-900 border-gray-700 text-white focus:border-indigo-500 focus:ring-indigo-500 placeholder-gray-500"
                                required
                            />
                            <InputError message={errors.kode_rekening} className="mt-2" />
                        </div>
                        <div>
                            <InputLabel htmlFor="rincian_objek" value="Rincian Objek" className="text-gray-300" />
                            <TextInput
                                id="rincian_objek"
                                value={data.rincian_objek}
                                onChange={(e) => setData('rincian_objek', e.target.value)}
                                className="mt-1 block w-full bg-gray-900 border-gray-700 text-white focus:border-indigo-500 focus:ring-indigo-500 placeholder-gray-500"
                                required
                            />
                            <InputError message={errors.rincian_objek} className="mt-2" />
                        </div>
                        <div>
                            <InputLabel htmlFor="kategori" value="Kategori" className="text-gray-300" />
                            <select
                                id="kategori"
                                value={data.kategori}
                                onChange={(e) => setData('kategori', e.target.value)}
                                className="mt-1 block w-full bg-gray-900 border-gray-700 text-white focus:border-indigo-500 focus:ring-indigo-500 rounded-md shadow-sm"
                                required
                            >
                                <option value="" className="text-gray-500">Pilih Kategori</option>
                                <option value="Operasi">Operasi</option>
                                <option value="Modal">Modal</option>
                            </select>
                            <InputError message={errors.kategori} className="mt-2" />
                        </div>
                        <div className="flex justify-end gap-2 mt-6">
                            <SecondaryButton
                                onClick={() => setIsModalOpen(false)}
                                className="bg-gray-700 text-gray-200 border-gray-600 hover:bg-gray-600 focus:ring-gray-500"
                            >
                                Batal
                            </SecondaryButton>
                            <PrimaryButton disabled={processing} className="flex items-center gap-2">
                                {processing ? (
                                    <>
                                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Menyimpan...
                                    </>
                                ) : (
                                    'Simpan'
                                )}
                            </PrimaryButton>
                        </div>
                    </form>
                </div>
            </Modal>

            {/* Modal Import */}
            <Modal show={isImportModalOpen} onClose={() => { setIsImportModalOpen(false); resetImport(); clearImportErrors(); }}>
                <div className="p-6 bg-gray-800 text-white rounded-lg">
                    <h2 className="text-lg font-medium text-white mb-4">Import Excel</h2>
                    <p className="text-sm text-gray-300 mb-4">Fitur import ini membutuhkan template khusus. Silakan download template terlebih dahulu.</p>

                    <form onSubmit={(e) => {
                        e.preventDefault();
                        postImport(route('rekening-belanja.import'), {
                            onSuccess: () => {
                                setIsImportModalOpen(false);
                                resetImport();
                            },
                        });
                    }} className="flex flex-col gap-4">
                        <SecondaryButton
                            type="button"
                            className="justify-center bg-white text-gray-900 border-gray-300 hover:bg-gray-100 focus:ring-indigo-500"
                            onClick={() => window.location.href = route('rekening-belanja.download-template')}
                        >
                            Download Template Excel
                        </SecondaryButton>

                        <div className={`border-2 border-dashed p-6 rounded-lg text-center transition-colors ${importErrors.file ? 'border-red-500 bg-red-500/10' : 'border-gray-600 bg-gray-700 hover:bg-gray-600'}`}>
                            <p className="text-gray-300 mb-2">Upload File Excel Di Sini</p>
                            <input
                                type="file"
                                className="mt-2 block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-700 cursor-pointer"
                                accept=".xlsx, .xls"
                                onChange={(e) => setImportData('file', e.target.files ? e.target.files[0] : null)}
                                required
                            />
                            {importErrors.file && <p className="text-red-400 text-sm mt-1">{importErrors.file}</p>}
                        </div>

                        {importProgress && (
                            <div className="w-full bg-gray-700 rounded-full h-2.5 mt-2">
                                <div className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300" style={{ width: `${importProgress.percentage}%` }}></div>
                                <p className="text-xs text-gray-400 mt-1 text-right">{importProgress.percentage}%</p>
                            </div>
                        )}

                        <div className="flex justify-end gap-2 mt-2">
                            <SecondaryButton
                                onClick={() => { setIsImportModalOpen(false); resetImport(); }}
                                className="bg-gray-700 text-gray-200 border-gray-600 hover:bg-gray-600 focus:ring-gray-500"
                            >
                                Batal
                            </SecondaryButton>
                            <PrimaryButton disabled={importProcessing} className="flex items-center gap-2">
                                {importProcessing ? (
                                    <>
                                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Importing...
                                    </>
                                ) : (
                                    'Import'
                                )}
                            </PrimaryButton>
                        </div>
                    </form>
                </div>
            </Modal>

            {/* Modal Konfirmasi Hapus */}
            <Modal show={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)}>
                <div className="p-6 bg-gray-800 text-white rounded-lg">
                    <h2 className="text-lg font-medium text-white mb-4">Konfirmasi Hapus</h2>
                    <p className="text-gray-300 mb-6">Apakah Anda yakin ingin menghapus data Rekening Belanja ini? Tindakan ini tidak dapat dibatalkan.</p>
                    <div className="flex justify-end gap-2">
                        <SecondaryButton
                            onClick={() => setIsDeleteModalOpen(false)}
                            className="bg-gray-700 text-gray-200 border-gray-600 hover:bg-gray-600 focus:ring-gray-500"
                        >
                            Batal
                        </SecondaryButton>
                        <PrimaryButton
                            className="bg-red-600 hover:bg-red-700 focus:ring-red-500 border-transparent"
                            onClick={confirmDelete}
                            disabled={processing}
                        >
                            {processing ? 'Menghapus...' : 'Hapus'}
                        </PrimaryButton>
                    </div>
                </div>
            </Modal>
        </AuthenticatedLayout>
    );
}
