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
                <form onSubmit={handleSubmit} className="p-6">
                    <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                        Tambah Dokumen
                    </h2>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 mb-6">
                        Menambahkan dokumen untuk: <span className="font-bold">{selectedBku?.uraian}</span>
                    </p>

                    <div className="mt-6">
                        <InputLabel htmlFor="nama_dokumen" value="Nama Dokumen" />
                        <TextInput
                            id="nama_dokumen"
                            type="text"
                            className="mt-1 block w-full text-black"
                            value={data.nama_dokumen}
                            onChange={(e) => setData('nama_dokumen', e.target.value)}
                            required
                            placeholder="Contoh: Bukti Pembayaran"
                        />
                        {errors.nama_dokumen && <div className="text-red-500 text-sm mt-1">{errors.nama_dokumen}</div>}
                    </div>

                    <div className="mt-4">
                        <InputLabel htmlFor="link_drive" value="Link Drive Dokumen" />
                        <TextInput
                            id="link_drive"
                            type="url"
                            className="mt-1 block w-full text-black"
                            value={data.link_drive}
                            onChange={(e) => setData('link_drive', e.target.value)}
                            required
                            placeholder="https://drive.google.com/..."
                        />
                        {errors.link_drive && <div className="text-red-500 text-sm mt-1">{errors.link_drive}</div>}
                    </div>

                    <div className="mt-6 flex justify-end gap-3">
                        <SecondaryButton onClick={closeModal} disabled={processing}>
                            Batal
                        </SecondaryButton>
                        <PrimaryButton disabled={processing}>
                            Simpan
                        </PrimaryButton>
                    </div>
                </form>
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
