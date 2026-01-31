import React, { useState, useEffect } from 'react';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { registerLocale } from "react-datepicker";
import { id } from 'date-fns/locale/id';
import { useForm } from '@inertiajs/react';
import axios from 'axios';
import Modal from '@/Components/Modal';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import DangerButton from '@/Components/DangerButton';

registerLocale('id', id);

interface SptjData {
    id: number;
    nomor_sptj: string;
    tanggal_sptj: string;
    tahap: '1' | '2';
    tahap_satu: number;
    tahap_dua: number;
    jenis_belanja_pegawai: number;
    jenis_belanja_barang_jasa: number;
    jenis_belanja_modal: number;
    sisa_kas_tunai: number;
    sisa_dana_di_bank: number;
    created_at: string;
    penganggaran_id: number;
    penganggaran: {
        id: number;
        tahun_anggaran: string;
    };
    penerimaan_dana_id: number | null;
    buku_kas_umum_id: number | null;
}

export default function SptjTab() {
    const [data, setData] = useState<SptjData[]>([]);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [lastPage, setLastPage] = useState(1);
    const [loading, setLoading] = useState(false);

    // Modals
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<number | null>(null);
    const [selectedPdfUrl, setSelectedPdfUrl] = useState('');
    const [isPrintSettingsModalOpen, setIsPrintSettingsModalOpen] = useState(false);
    const [printSettings, setPrintSettings] = useState({
        paperSize: 'A4',
        fontSize: '11pt'
    });

    const handlePrint = () => {
        const url = `${selectedPdfUrl}?paper_size=${printSettings.paperSize}&font_size=${printSettings.fontSize}`;
        window.open(url, '_blank');
        setIsPrintSettingsModalOpen(false);
    };

    // Form Data
    const [formData, setFormData] = useState({
        id: null as number | null,
        nomor_sptj: '',
        tanggal_sptj: '',
        tahap: '1',
        penganggaran_id: 0,
        tahap_satu: 0,
        tahap_dua: 0,
        jenis_belanja_pegawai: 0,
        jenis_belanja_barang_jasa: 0,
        jenis_belanja_modal: 0,
        sisa_kas_tunai: 0,
        sisa_dana_di_bank: 0,
        tahun_anggaran: new Date().getFullYear().toString(),
        penerimaan_dana_id: null,
        buku_kas_umum_id: null,
    });

    const [isSaving, setIsSaving] = useState(false);
    const [isCalculating, setIsCalculating] = useState(false);
    const [availableYears, setAvailableYears] = useState<Array<{ id: number; tahun_anggaran: number | string }>>([]);

    useEffect(() => {
        fetchAvailableYears();
        fetchData();
    }, [page, search]);

    const handleCalculate = async () => {
        setIsCalculating(true);
        try {
            const response = await axios.get('/fitur-pelengkap/api/sptj/calculate', {
                params: {
                    tahun_anggaran: formData.tahun_anggaran,
                    tahap: formData.tahap
                }
            });

            // Update form data with calculated values
            // Response should match the keys in formData for the amounts
            setFormData(prev => ({
                ...prev,
                tahap_satu: response.data.tahap_satu,
                tahap_dua: response.data.tahap_dua,
                jenis_belanja_pegawai: response.data.jenis_belanja_pegawai,
                jenis_belanja_barang_jasa: response.data.jenis_belanja_barang_jasa,
                jenis_belanja_modal: response.data.jenis_belanja_modal,
                sisa_kas_tunai: response.data.sisa_kas_tunai,
                sisa_dana_di_bank: response.data.sisa_dana_di_bank,
            }));
        } catch (error: any) {
            alert(error.response?.data?.error || 'Gagal menghitung data');
        } finally {
            setIsCalculating(false);
        }
    };

    const fetchAvailableYears = async () => {
        try {
            const response = await axios.get('/fitur-pelengkap/api/sptj/tahun');
            const years = response.data;
            setAvailableYears(years);

            if (years.length > 0) {
                setFormData(prev => {
                    // Set default to first available budget only if not set
                    const isValid = years.some((y: any) => y.id === prev.penganggaran_id);
                    if (!isValid) {
                        return {
                            ...prev,
                            penganggaran_id: years[0].id,
                            tahun_anggaran: String(years[0].tahun_anggaran)
                        };
                    }
                    return prev;
                });
            }
        } catch (error) {
            console.error('Failed to fetch years:', error);
        }
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            const response = await axios.get('/fitur-pelengkap/api/sptj', {
                params: { search, page }
            });
            setData(response.data.data);
            setLastPage(response.data.last_page);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            if (formData.id) {
                await axios.put(`/fitur-pelengkap/api/sptj/${formData.id}`, formData);
            } else {
                await axios.post('/fitur-pelengkap/api/sptj', formData);
            }
            setIsAddModalOpen(false);
            fetchData();
            resetForm();
        } catch (error) {
            console.error(error);
            alert('Gagal menyimpan data');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = (id: number) => {
        setItemToDelete(id);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!itemToDelete) return;
        try {
            await axios.delete(`/fitur-pelengkap/api/sptj/${itemToDelete}`);
            fetchData();
            setIsDeleteModalOpen(false);
            setItemToDelete(null);
        } catch (error) {
            console.error(error);
            alert('Gagal menghapus data');
        }
    };

    const openEdit = (item: SptjData) => {
        setFormData({
            ...item,
            id: item.id,
            tanggal_sptj: item.tanggal_sptj || '',
            tahap: item.tahap as any,
            tahun_anggaran: item.penganggaran?.tahun_anggaran || new Date().getFullYear().toString(),
            penganggaran_id: item.penganggaran_id,
            penerimaan_dana_id: item.penerimaan_dana_id as any,
            buku_kas_umum_id: item.buku_kas_umum_id as any,
            // amounts are already in item
            tahap_satu: Number(item.tahap_satu),
            tahap_dua: Number(item.tahap_dua),
            jenis_belanja_pegawai: Number(item.jenis_belanja_pegawai),
            jenis_belanja_barang_jasa: Number(item.jenis_belanja_barang_jasa),
            jenis_belanja_modal: Number(item.jenis_belanja_modal),
            sisa_kas_tunai: Number(item.sisa_kas_tunai),
            sisa_dana_di_bank: Number(item.sisa_dana_di_bank),
        });
        setIsAddModalOpen(true);
    };

    const resetForm = () => {
        setFormData({
            id: null,
            nomor_sptj: '',
            tanggal_sptj: '',
            tahap: '1',
            penganggaran_id: availableYears.length > 0 ? availableYears[0].id : 0,
            tahap_satu: 0,
            tahap_dua: 0,
            jenis_belanja_pegawai: 0,
            jenis_belanja_barang_jasa: 0,
            jenis_belanja_modal: 0,
            sisa_kas_tunai: 0,
            sisa_dana_di_bank: 0,
            tahun_anggaran: availableYears.length > 0 ? String(availableYears[0].tahun_anggaran) : new Date().getFullYear().toString(),
            penerimaan_dana_id: null,
            buku_kas_umum_id: null,
        });
    };

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 animate-fade-in-up">
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-green-50 dark:bg-green-900/30 rounded-lg">
                        <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-gray-800 dark:text-white">SPTJ</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Surat Pernyataan Tanggung Jawab Mutlak (BOSP)</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <input
                        type="text"
                        placeholder="Cari Nomor SPTJ..."
                        className="border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                    <PrimaryButton onClick={() => { resetForm(); setIsAddModalOpen(true); }}>
                        Tambah
                    </PrimaryButton>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">No</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Nomor SPTJ</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Tahap</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Jml Penerimaan</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Jml Pengeluaran</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Sisa Kas</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Sisa Bank</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {loading ? (
                            <tr><td colSpan={8} className="text-center py-4 text-gray-500">Loading...</td></tr>
                        ) : data.length === 0 ? (
                            <tr><td colSpan={8} className="text-center py-4 text-gray-500">Tidak ada data SPTJ.</td></tr>
                        ) : (
                            data.map((item, index) => {
                                const totalPenerimaan = Number(item.tahap_satu) + Number(item.tahap_dua);
                                const totalPengeluaran = Number(item.jenis_belanja_pegawai) + Number(item.jenis_belanja_barang_jasa) + Number(item.jenis_belanja_modal);
                                return (
                                    <tr key={item.id}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{index + 1 + (page - 1) * 10}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{item.nomor_sptj}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{item.tahap}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{formatCurrency(totalPenerimaan)}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{formatCurrency(totalPengeluaran)}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{formatCurrency(item.sisa_kas_tunai)}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{formatCurrency(item.sisa_dana_di_bank)}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                            <div className="flex items-center space-x-2">
                                                <button
                                                    onClick={() => { setSelectedPdfUrl(`/laporan/sptj/${item.id}/pdf`); setIsPreviewModalOpen(true); }}
                                                    className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-200"
                                                    title="Preview PDF"
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                                                </button>
                                                <button
                                                    onClick={() => openEdit(item)}
                                                    className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-200"
                                                    title="Edit"
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(item.id)}
                                                    className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-200"
                                                    title="Delete"
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination and Modals remain mostly similar but adjusted for SPTJ fields */}
            {/* Pagination */}
            <div className="flex justify-between items-center mt-4">
                <button
                    onClick={() => setPage(prev => Math.max(prev - 1, 1))}
                    disabled={page === 1}
                    className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded disabled:opacity-50"
                >
                    Previous
                </button>
                <span className="text-gray-700 dark:text-gray-300">Page {page} of {lastPage}</span>
                <button
                    onClick={() => setPage(prev => Math.min(prev + 1, lastPage))}
                    disabled={page === lastPage}
                    className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded disabled:opacity-50"
                >
                    Next
                </button>
            </div>

            {/* Add/Edit Modal */}
            <Modal show={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} maxWidth="4xl">
                <form onSubmit={handleSubmit} className="p-6">
                    <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                        {formData.id ? 'Edit SPTJ' : 'Tambah SPTJ'}
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <InputLabel htmlFor="nomor_sptj" value="Nomor SPTJ" />
                            <TextInput
                                id="nomor_sptj"
                                type="text"
                                className="mt-1 block w-full text-gray-900"
                                value={formData.nomor_sptj}
                                onChange={(e) => setFormData({ ...formData, nomor_sptj: e.target.value })}
                                required
                            />
                        </div>
                        <div>
                            <InputLabel htmlFor="tanggal_sptj" value="Tanggal SPTJ" />
                            <DatePicker
                                id="tanggal_sptj"
                                selected={formData.tanggal_sptj ? new Date(formData.tanggal_sptj) : null}
                                onChange={(date: Date | null) => {
                                    if (date) {
                                        const offset = date.getTimezoneOffset();
                                        const localDate = new Date(date.getTime() - (offset * 60 * 1000));
                                        const formatted = localDate.toISOString().split('T')[0];
                                        setFormData({ ...formData, tanggal_sptj: formatted });
                                    } else {
                                        setFormData({ ...formData, tanggal_sptj: '' });
                                    }
                                }}
                                dateFormat="dd MMMM yyyy"
                                locale="id"
                                showMonthDropdown
                                showYearDropdown
                                dropdownMode="select"
                                className="mt-1 block w-full border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 focus:border-indigo-500 focus:ring-indigo-500 rounded-md shadow-sm"
                                placeholderText="Pilih Tanggal"
                                isClearable
                            />
                        </div>
                        <div>
                            <InputLabel htmlFor="tahun_anggaran" value="Tahun Anggaran" />
                            <select
                                id="tahun_anggaran"
                                className="mt-1 block w-full border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 focus:border-indigo-500 focus:ring-indigo-500 rounded-md shadow-sm"
                                value={formData.tahun_anggaran}
                                onChange={(e) => setFormData({ ...formData, tahun_anggaran: e.target.value })}
                                required
                            >
                                {availableYears.map(year => (
                                    <option key={year.id} value={year.tahun_anggaran}>{year.tahun_anggaran}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <InputLabel htmlFor="tahap" value="Tahap" />
                            <select
                                id="tahap"
                                className="mt-1 block w-full border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 focus:border-indigo-500 focus:ring-indigo-500 rounded-md shadow-sm"
                                value={formData.tahap}
                                onChange={(e) => setFormData({ ...formData, tahap: e.target.value as '1' | '2' })}
                                required
                            >
                                <option value="1">1</option>
                                <option value="2">2</option>
                            </select>
                        </div>
                    </div>

                    <div className="mt-4 flex justify-end">
                        <PrimaryButton onClick={handleCalculate} type="button" disabled={isCalculating} className="bg-indigo-600 hover:bg-indigo-700">
                            {isCalculating ? 'Menghitung...' : 'Hitung Otomatis'}
                        </PrimaryButton>
                    </div>

                    <div className="mt-4">
                        <h3 className="font-semibold text-gray-700 dark:text-gray-300 border-b pb-1 mb-2">Penerimaan Dana</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <InputLabel htmlFor="tahap_satu" value="Tahap I" />
                                <input
                                    id="tahap_satu"
                                    type="text"
                                    className="mt-1 block w-full border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 focus:border-indigo-500 focus:ring-indigo-500 rounded-md shadow-sm"
                                    value={formatCurrency(formData.tahap_satu)}
                                    onChange={(e) => {
                                        const value = e.target.value.replace(/\D/g, '');
                                        setFormData({ ...formData, tahap_satu: Number(value) });
                                    }}
                                />
                            </div>
                            <div>
                                <InputLabel htmlFor="tahap_dua" value="Tahap II" />
                                <input
                                    id="tahap_dua"
                                    type="text"
                                    className="mt-1 block w-full border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 focus:border-indigo-500 focus:ring-indigo-500 rounded-md shadow-sm"
                                    value={formatCurrency(formData.tahap_dua)}
                                    onChange={(e) => {
                                        const value = e.target.value.replace(/\D/g, '');
                                        setFormData({ ...formData, tahap_dua: Number(value) });
                                    }}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="mt-4">
                        <h3 className="font-semibold text-gray-700 dark:text-gray-300 border-b pb-1 mb-2">Pengeluaran Dana</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <InputLabel htmlFor="jenis_belanja_pegawai" value="Belanja Pegawai" />
                                <input
                                    id="jenis_belanja_pegawai"
                                    type="text"
                                    className="mt-1 block w-full border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 focus:border-indigo-500 focus:ring-indigo-500 rounded-md shadow-sm"
                                    value={formatCurrency(formData.jenis_belanja_pegawai)}
                                    onChange={(e) => {
                                        const value = e.target.value.replace(/\D/g, '');
                                        setFormData({ ...formData, jenis_belanja_pegawai: Number(value) });
                                    }}
                                />
                            </div>
                            <div>
                                <InputLabel htmlFor="jenis_belanja_barang_jasa" value="Belanja Barang & Jasa" />
                                <input
                                    id="jenis_belanja_barang_jasa"
                                    type="text"
                                    className="mt-1 block w-full border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 focus:border-indigo-500 focus:ring-indigo-500 rounded-md shadow-sm"
                                    value={formatCurrency(formData.jenis_belanja_barang_jasa)}
                                    onChange={(e) => {
                                        const value = e.target.value.replace(/\D/g, '');
                                        setFormData({ ...formData, jenis_belanja_barang_jasa: Number(value) });
                                    }}
                                />
                            </div>
                            <div>
                                <InputLabel htmlFor="jenis_belanja_modal" value="Belanja Modal" />
                                <input
                                    id="jenis_belanja_modal"
                                    type="text"
                                    className="mt-1 block w-full border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 focus:border-indigo-500 focus:ring-indigo-500 rounded-md shadow-sm"
                                    value={formatCurrency(formData.jenis_belanja_modal)}
                                    onChange={(e) => {
                                        const value = e.target.value.replace(/\D/g, '');
                                        setFormData({ ...formData, jenis_belanja_modal: Number(value) });
                                    }}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="mt-4">
                        <h3 className="font-semibold text-gray-700 dark:text-gray-300 border-b pb-1 mb-2">Sisa Dana</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <InputLabel htmlFor="sisa_kas_tunai" value="Sisa Kas Tunai" />
                                <input
                                    id="sisa_kas_tunai"
                                    type="text"
                                    className="mt-1 block w-full border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 focus:border-indigo-500 focus:ring-indigo-500 rounded-md shadow-sm"
                                    value={formatCurrency(formData.sisa_kas_tunai)}
                                    onChange={(e) => {
                                        const value = e.target.value.replace(/\D/g, '');
                                        setFormData({ ...formData, sisa_kas_tunai: Number(value) });
                                    }}
                                />
                            </div>
                            <div>
                                <InputLabel htmlFor="sisa_dana_di_bank" value="Sisa Dana Di Bank" />
                                <input
                                    id="sisa_dana_di_bank"
                                    type="text"
                                    className="mt-1 block w-full border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 focus:border-indigo-500 focus:ring-indigo-500 rounded-md shadow-sm"
                                    value={formatCurrency(formData.sisa_dana_di_bank)}
                                    onChange={(e) => {
                                        const value = e.target.value.replace(/\D/g, '');
                                        setFormData({ ...formData, sisa_dana_di_bank: Number(value) });
                                    }}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 flex justify-end gap-3">
                        <SecondaryButton onClick={() => setIsAddModalOpen(false)}>Batal</SecondaryButton>
                        <PrimaryButton type="submit" disabled={isSaving}>
                            {isSaving ? 'Menyimpan...' : 'Simpan'}
                        </PrimaryButton>
                    </div>
                </form>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal show={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} maxWidth="sm">
                <div className="p-6">
                    <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                        Hapus Data SPTJ
                    </h2>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                        Apakah Anda yakin ingin menghapus data SPTJ ini? Tindakan ini tidak dapat dibatalkan.
                    </p>
                    <div className="mt-6 flex justify-end gap-3">
                        <SecondaryButton onClick={() => setIsDeleteModalOpen(false)}>Batal</SecondaryButton>
                        <DangerButton onClick={confirmDelete}>Hapus</DangerButton>
                    </div>
                </div>
            </Modal>

            {/* Preview Modal */}
            <Modal show={isPreviewModalOpen} onClose={() => setIsPreviewModalOpen(false)} maxWidth="5xl">
                <div className="flex flex-col h-[85vh] bg-gray-900 rounded-lg overflow-hidden relative">
                    {/* Header */}
                    <div className="bg-green-600 px-4 py-3 flex justify-between items-center shadow-md z-10">
                        <div className="flex items-center gap-3 text-white">
                            <span className="font-medium text-sm">Preview SPTJ</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={() => window.open(selectedPdfUrl, '_blank')} className="text-white/80 hover:text-white p-1 rounded hover:bg-white/10" title="Open in New Tab">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                            </button>
                            <button onClick={() => setIsPreviewModalOpen(false)} className="text-white/80 hover:text-white p-1 rounded hover:bg-white/10" title="Close">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                    </div>

                    {/* PDF Viewer */}
                    <div className="flex-1 bg-gray-500 overflow-hidden relative flex justify-center items-center p-4">
                        <iframe src={selectedPdfUrl} className="w-full h-full shadow-2xl bg-white" title="PDF Preview" />
                    </div>
                    {/* Footer */}
                    <div className="bg-gray-800 px-4 py-3 border-t border-gray-700 flex justify-end items-center gap-3">
                        <button
                            onClick={() => setIsPreviewModalOpen(false)}
                            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 text-sm font-medium rounded transition-colors flex items-center gap-2"
                        >
                            Tutup
                        </button>
                        <button
                            onClick={() => setIsPrintSettingsModalOpen(true)}
                            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded transition-colors flex items-center gap-2"
                        >
                            Download
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Print Settings Modal */}
            <Modal show={isPrintSettingsModalOpen} onClose={() => setIsPrintSettingsModalOpen(false)} maxWidth="sm">
                <div className="p-6">
                    <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Pengaturan Cetak</h2>
                    <div className="space-y-4">
                        <div>
                            <InputLabel htmlFor="paper_size" value="Ukuran Kertas" />
                            <select
                                id="paper_size"
                                className="mt-1 block w-full border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 focus:border-indigo-500 focus:ring-indigo-500 rounded-md shadow-sm"
                                value={printSettings.paperSize}
                                onChange={(e) => setPrintSettings({ ...printSettings, paperSize: e.target.value })}
                            >
                                <option value="A4">A4</option>
                                <option value="Letter">Letter</option>
                                <option value="Folio">Folio (F4)</option>
                                <option value="Legal">Legal</option>
                            </select>
                        </div>
                        <div>
                            <InputLabel htmlFor="font_size" value="Ukuran Font" />
                            <select
                                id="font_size"
                                className="mt-1 block w-full border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 focus:border-indigo-500 focus:ring-indigo-500 rounded-md shadow-sm"
                                value={printSettings.fontSize}
                                onChange={(e) => setPrintSettings({ ...printSettings, fontSize: e.target.value })}
                            >
                                <option value="8pt">8pt</option>
                                <option value="9pt">9pt</option>
                                <option value="10pt">10pt</option>
                                <option value="11pt">11pt</option>
                                <option value="12pt">12pt</option>
                            </select>
                        </div>
                    </div>
                    <div className="mt-6 flex justify-end gap-3">
                        <SecondaryButton onClick={() => setIsPrintSettingsModalOpen(false)}>Batal</SecondaryButton>
                        <PrimaryButton onClick={handlePrint}>Cetak PDF</PrimaryButton>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
