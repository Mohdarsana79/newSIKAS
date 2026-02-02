import React, { useState, useEffect } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, router } from '@inertiajs/react';
import Modal from '@/Components/Modal';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import DangerButton from '@/Components/DangerButton';
import SearchableSelect from '@/Components/SearchableSelect';
import axios from 'axios';

interface Dokumen {
    id: number;
    buku_kas_umum_id: number;
    nama_dokumen: string;
    link_drive: string;
}

interface BukuKasUmum {
    id: number;
    uraian: string;
    tanggal_transaksi: string;
    dokumen: Dokumen | null;
}

interface Props {
    auth: any;
    penganggarans: { id: number; tahun_anggaran: string }[];
}

export default function Index({ auth, penganggarans }: Props) {
    const [selectedTahun, setSelectedTahun] = useState<string>('');
    const [selectedBulan, setSelectedBulan] = useState<string>('');
    const [search, setSearch] = useState('');
    const [bkuList, setBkuList] = useState<BukuKasUmum[]>([]);
    const [pagination, setPagination] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedBku, setSelectedBku] = useState<BukuKasUmum | null>(null);

    const { data, setData, post, processing, errors, reset, delete: destroy } = useForm({
        penganggaran_id: '',
        buku_kas_umum_id: '',
        nama_dokumen: '',
        link_drive: ''
    });

    const months = [
        { value: 1, label: 'Januari' },
        { value: 2, label: 'Februari' },
        { value: 3, label: 'Maret' },
        { value: 4, label: 'April' },
        { value: 5, label: 'Mei' },
        { value: 6, label: 'Juni' },
        { value: 7, label: 'Juli' },
        { value: 8, label: 'Agustus' },
        { value: 9, label: 'September' },
        { value: 10, label: 'Oktober' },
        { value: 11, label: 'November' },
        { value: 12, label: 'Desember' },
    ];

    useEffect(() => {
        if (selectedTahun && selectedBulan) {
            fetchData();
        } else {
            setBkuList([]);
            setPagination(null);
        }
    }, [selectedTahun, selectedBulan, search]);

    const fetchData = async (page = 1) => {
        setLoading(true);
        try {
            const response = await axios.get(route('api.dokumen.data'), {
                params: {
                    penganggaran_id: selectedTahun,
                    bulan: selectedBulan,
                    search: search,
                    page: page
                }
            });
            setBkuList(response.data.data);
            setPagination(response.data);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handlePageChange = (url: string) => {
        if (url) {
            const urlObj = new URL(url);
            const page = urlObj.searchParams.get('page');
            if (page) {
                fetchData(parseInt(page));
            }
        }
    };

    const openAddModal = (bku: BukuKasUmum) => {
        setSelectedBku(bku);
        setData({
            penganggaran_id: selectedTahun,
            buku_kas_umum_id: bku.id.toString(),
            nama_dokumen: '',
            link_drive: ''
        });
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        reset();
        setSelectedBku(null);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('dokumen.store'), {
            onSuccess: () => {
                closeModal();
                fetchData(pagination?.current_page || 1);
            }
        });
    };

    // Delete Confirmation State
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [deleteId, setDeleteId] = useState<number | null>(null);

    const openDeleteModal = (id: number) => {
        setDeleteId(id);
        setIsDeleteModalOpen(true);
    };

    const closeDeleteModal = () => {
        setIsDeleteModalOpen(false);
        setDeleteId(null);
    };

    const confirmDelete = () => {
        if (deleteId) {
            router.delete(route('dokumen.destroy', deleteId), {
                onSuccess: () => {
                    closeDeleteModal();
                    fetchData(pagination?.current_page || 1);
                }
            });
        }
    };

    return (
        <AuthenticatedLayout
            header={<h2 className="font-semibold text-xl text-gray-800 dark:text-gray-200 leading-tight">Dokumen BKU</h2>}
        >
            <Head title="Dokumen BKU" />

            <div className="py-12">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    <div className="bg-white dark:bg-gray-800 overflow-hidden shadow-sm sm:rounded-lg p-6">

                        {/* Filters */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                            <div>
                                <InputLabel value="Tahun Anggaran" className="mb-2" />
                                <SearchableSelect
                                    value={selectedTahun}
                                    onChange={(value) => {
                                        setSelectedTahun(value.toString());
                                        setSelectedBulan('');
                                    }}
                                    options={penganggarans}
                                    searchFields={['tahun_anggaran']}
                                    displayColumns={[
                                        { header: 'Tahun Anggaran', field: 'tahun_anggaran' }
                                    ]}
                                    placeholder="Pilih Tahun Anggaran"
                                    labelRenderer={(option) => option.tahun_anggaran}
                                />
                            </div>

                            <div>
                                <InputLabel value="Bulan" className="mb-2" />
                                <select
                                    className="w-full border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 focus:border-indigo-500 dark:focus:border-indigo-600 focus:ring-indigo-500 dark:focus:ring-indigo-600 rounded-md shadow-sm disabled:opacity-50"
                                    value={selectedBulan}
                                    onChange={(e) => setSelectedBulan(e.target.value)}
                                    disabled={!selectedTahun}
                                >
                                    <option value="">Pilih Bulan</option>
                                    {months.map((m) => (
                                        <option key={m.value} value={m.value}>{m.label}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <InputLabel value="Cari Data" className="mb-2" />
                                <TextInput
                                    type="text"
                                    className="w-full text-black"
                                    placeholder="Cari Uraian..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Table */}
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                <thead className="bg-gray-50 dark:bg-gray-700">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">No</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Buku Kas (Uraian)</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                    {loading ? (
                                        <tr>
                                            <td colSpan={3} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">Loading...</td>
                                        </tr>
                                    ) : bkuList.length === 0 ? (
                                        <tr>
                                            <td colSpan={3} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                                                {!selectedTahun || !selectedBulan
                                                    ? 'Silahkan pilih Tahun Anggaran dan Bulan terlebih dahulu'
                                                    : 'Tidak ada data ditemukan'}
                                            </td>
                                        </tr>
                                    ) : (
                                        bkuList.map((item, index) => (
                                            <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                    {(pagination?.from || 1) + index}
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                                                    {item.uraian}
                                                    {item.dokumen && (
                                                        <div className="text-xs text-indigo-500 mt-1 font-medium">
                                                            Dokumen: {item.dokumen.nama_dokumen}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                                                    {item.dokumen ? (
                                                        <>
                                                            <a
                                                                href={item.dokumen.link_drive}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="inline-flex items-center px-3 py-1 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded-md hover:bg-green-200 dark:hover:bg-green-800 transition-colors"
                                                            >
                                                                Lihat
                                                            </a>
                                                            <button
                                                                onClick={() => openDeleteModal(item.dokumen!.id)}
                                                                className="inline-flex items-center px-3 py-1 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded-md hover:bg-red-200 dark:hover:bg-red-800 transition-colors"
                                                            >
                                                                Hapus
                                                            </button>
                                                        </>
                                                    ) : (
                                                        item.uraian && (
                                                            <button
                                                                onClick={() => openAddModal(item)}
                                                                className="inline-flex items-center px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-md hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
                                                            >
                                                                Tambah
                                                            </button>
                                                        )
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {pagination && pagination.links && pagination.links.length > 3 && (
                            <div className="flex items-center justify-between border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 sm:px-6 mt-4">
                                <div className="flex flex-1 justify-between sm:hidden">
                                    <button
                                        onClick={() => handlePageChange(pagination.prev_page_url)}
                                        disabled={!pagination.prev_page_url}
                                        className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                                    >
                                        Previous
                                    </button>
                                    <button
                                        onClick={() => handlePageChange(pagination.next_page_url)}
                                        disabled={!pagination.next_page_url}
                                        className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                                    >
                                        Next
                                    </button>
                                </div>
                                <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                                    <div>
                                        <p className="text-sm text-gray-700 dark:text-gray-300">
                                            Menampilkan <span className="font-medium">{pagination.from || 0}</span> sampai <span className="font-medium">{pagination.to || 0}</span> dari <span className="font-medium">{pagination.total}</span> hasil
                                        </p>
                                    </div>
                                    <div>
                                        <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                                            {pagination.links.map((link: any, index: number) => {
                                                // Clean up standard Label HTML entities
                                                const label = link.label.replace('&laquo; Previous', 'Sebelumnya').replace('Next &raquo;', 'Selanjutnya');

                                                return (
                                                    <button
                                                        key={index}
                                                        onClick={() => handlePageChange(link.url)}
                                                        disabled={!link.url || link.active}
                                                        className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold focus:z-20 focus:outline-offset-0 transition-all duration-200 ${link.active
                                                            ? 'z-10 bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md scale-105'
                                                            : 'text-gray-900 dark:text-gray-200 ring-1 ring-inset ring-gray-300 dark:ring-gray-700 hover:bg-purple-50 dark:hover:bg-gray-700 hover:text-purple-700 dark:hover:text-purple-400 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed'
                                                            } ${index === 0 ? 'rounded-l-md' : ''} ${index === pagination.links.length - 1 ? 'rounded-r-md' : ''}`}
                                                        dangerouslySetInnerHTML={{ __html: label }}
                                                    />
                                                );
                                            })}
                                        </nav>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Modal Tambah Dokumen */}
            <Modal show={isModalOpen} onClose={closeModal}>
                <div className="flex flex-col h-full bg-white dark:bg-gray-800 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 shadow-xl">
                    <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-6">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 01-2-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            Tambah Dokumen
                        </h2>
                        <p className="mt-2 text-purple-100 text-sm">
                            Silahkan lengkapi detail dokumen untuk transaksi di bawah ini.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="flex-1">
                        <div className="p-6 space-y-6">
                            <div className="bg-purple-50 dark:bg-gray-700 p-4 rounded-lg border border-purple-100 dark:border-gray-600">
                                <div className="text-xs text-purple-600 dark:text-purple-300 font-semibold uppercase tracking-wide">Uraian Transaksi</div>
                                <div className="mt-1 text-gray-900 dark:text-gray-100 font-medium text-lg leading-relaxed">
                                    {selectedBku?.uraian}
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <InputLabel htmlFor="nama_dokumen" value="Nama Dokumen" className="text-gray-700 dark:text-gray-300 font-medium" />
                                    <TextInput
                                        id="nama_dokumen"
                                        type="text"
                                        className="mt-1 block w-full border-gray-300 dark:border-gray-600 focus:border-purple-500 focus:ring-purple-500 rounded-lg shadow-sm"
                                        value={data.nama_dokumen}
                                        onChange={(e) => setData('nama_dokumen', e.target.value)}
                                        required
                                        placeholder="Contoh: Bukti Pembayaran / Nota Dinas"
                                    />
                                    {errors.nama_dokumen && <div className="text-red-500 text-sm mt-1 animate-pulse">{errors.nama_dokumen}</div>}
                                </div>

                                <div>
                                    <InputLabel htmlFor="link_drive" value="Link Drive Dokumen" className="text-gray-700 dark:text-gray-300 font-medium" />
                                    <div className="mt-1 relative rounded-md shadow-sm">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <span className="text-gray-500 sm:text-sm">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                                </svg>
                                            </span>
                                        </div>
                                        <TextInput
                                            id="link_drive"
                                            type="url"
                                            className="block w-full pl-10 border-gray-300 dark:border-gray-600 focus:border-purple-500 focus:ring-purple-500 rounded-lg shadow-sm"
                                            value={data.link_drive}
                                            onChange={(e) => setData('link_drive', e.target.value)}
                                            required
                                            placeholder="https://drive.google.com/..."
                                        />
                                    </div>
                                    {errors.link_drive && <div className="text-red-500 text-sm mt-1 animate-pulse">{errors.link_drive}</div>}
                                </div>
                            </div>
                        </div>

                        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-750 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-3 rounded-b-lg">
                            <SecondaryButton onClick={closeModal} disabled={processing} className="hover:bg-gray-100 dark:hover:bg-gray-600">
                                Batal
                            </SecondaryButton>
                            <PrimaryButton disabled={processing} className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 border-none shadow-md hover:shadow-lg transition-all duration-200">
                                {processing ? (
                                    <div className="flex items-center gap-2">
                                        <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Menyimpan...
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        Simpan
                                    </div>
                                )}
                            </PrimaryButton>
                        </div>
                    </form>
                </div>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal show={isDeleteModalOpen} onClose={closeDeleteModal}>
                <div className="p-6">
                    <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                        Konfirmasi Hapus
                    </h2>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                        Apakah Anda yakin ingin menghapus dokumen ini? Tindakan ini tidak dapat dibatalkan.
                    </p>
                    <div className="mt-6 flex justify-end gap-3">
                        <SecondaryButton onClick={closeDeleteModal}>
                            Batal
                        </SecondaryButton>
                        <DangerButton onClick={confirmDelete}>
                            Hapus
                        </DangerButton>
                    </div>
                </div>
            </Modal>
        </AuthenticatedLayout>
    );
}
