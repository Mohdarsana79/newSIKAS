import React, { useState, useEffect } from 'react';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { registerLocale } from "react-datepicker";
import { id } from 'date-fns/locale/id';
import { useForm } from '@inertiajs/react'; // Or simpleaxios
import axios from 'axios';
import Modal from '@/Components/Modal'; // Assuming generic Modal exists
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import DangerButton from '@/Components/DangerButton';

registerLocale('id', id);

// ... (in the component return)

interface SpmthData {
    id: number;
    nomor_surat: string;
    tahap: '1' | '2';
    realisasi_lalu: number;
    realisasi_ini: number;
    sisa: number;
    tanggal_spmth: string | null;
    created_at: string;
    penganggaran_id: number;
    penganggaran: {
        id: number;
        tahun_anggaran: string;
    };
}


export default function SpmthTab() {
    const [data, setData] = useState<SpmthData[]>([]);
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
        nomor_surat: '',
        tanggal_spmth: '',
        tahun_anggaran: new Date().getFullYear().toString(),
        tahap: '1',
        penganggaran_id: 0,
        pagu: 0,
        realisasi_lalu: 0,
        realisasi_ini: 0,
        sisa: 0
    });

    const [isCalculating, setIsCalculating] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const [availableYears, setAvailableYears] = useState<Array<{ id: number; tahun_anggaran: number | string }>>([]);

    useEffect(() => {
        fetchAvailableYears();
        fetchData();
    }, [page, search]);

    const fetchAvailableYears = async () => {
        try {
            const response = await axios.get('/fitur-pelengkap/api/spmth/tahun');
            const years = response.data;
            setAvailableYears(years);

            if (years.length > 0) {
                setFormData(prev => {
                    // Set default to first available budget
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
    // ... existing fetchData ...


    const fetchData = async () => {
        setLoading(true);
        try {
            const response = await axios.get('/fitur-pelengkap/api/spmth', {
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

    const handleCalculate = async () => {
        setIsCalculating(true);
        try {
            const response = await axios.get('/fitur-pelengkap/api/spmth/calculate', {
                params: {
                    tahun_anggaran: formData.tahun_anggaran,
                    tahap: formData.tahap
                }
            });

            const { pagu, realisasi_lalu, realisasi_ini, sisa, penganggaran_id } = response.data;
            setFormData(prev => ({
                ...prev,
                pagu,
                realisasi_lalu,
                realisasi_ini,
                sisa,
                penganggaran_id
            }));
        } catch (error: any) {
            alert(error.response?.data?.error || 'Gagal menghitung data');
        } finally {
            setIsCalculating(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            if (formData.id) {
                await axios.put(`/fitur-pelengkap/api/spmth/${formData.id}`, formData);
            } else {
                await axios.post('/fitur-pelengkap/api/spmth', formData);
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
            await axios.delete(`/fitur-pelengkap/api/spmth/${itemToDelete}`);
            fetchData();
            setIsDeleteModalOpen(false);
            setItemToDelete(null);
        } catch (error) {
            console.error(error);
            alert('Gagal menghapus data');
        }
    };

    const openEdit = (item: SpmthData) => {
        setFormData({
            ...item,
            id: item.id,
            tanggal_spmth: item.tanggal_spmth || '',
            tahap: item.tahap as any,
            tahun_anggaran: item.penganggaran?.tahun_anggaran || new Date().getFullYear().toString(),
            pagu: 0 // Will need calculation if we want to show it, or we rely on 'Hitung' being clicked again or just display 0
        });
        setIsAddModalOpen(true);
    };

    const resetForm = () => {
        setFormData({
            id: null,
            nomor_surat: '',
            tanggal_spmth: '',
            tahun_anggaran: availableYears.length > 0 ? String(availableYears[0].tahun_anggaran) : new Date().getFullYear().toString(),
            tahap: '1',
            penganggaran_id: availableYears.length > 0 ? availableYears[0].id : 0,
            pagu: 0,
            realisasi_lalu: 0,
            realisasi_ini: 0,
            sisa: 0
        });
    };

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 animate-fade-in-up">
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                        <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-gray-800 dark:text-white">SPMTH</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Surat Pernyataan Tanggung Jawab Mutlak (Hibah)</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <input
                        type="text"
                        placeholder="Cari Nomor Surat..."
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
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Nomor SPMTH</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Tanggal</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Tahap</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Tahun</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {loading ? (
                            <tr><td colSpan={5} className="text-center py-4 text-gray-500">Loading...</td></tr>
                        ) : data.length === 0 ? (
                            <tr><td colSpan={5} className="text-center py-4 text-gray-500">Tidak ada data SPMTH.</td></tr>
                        ) : (
                            data.map((item, index) => (
                                <tr key={item.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{index + 1 + (page - 1) * 10}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{item.nomor_surat}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{item.tanggal_spmth ? new Date(item.tanggal_spmth).toLocaleDateString('id-ID') : '-'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{item.tahap}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{item.penganggaran?.tahun_anggaran}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        <div className="flex items-center space-x-2">
                                            <button
                                                onClick={() => { setSelectedPdfUrl(`/laporan/spmth/${item.id}/pdf`); setIsPreviewModalOpen(true); }}
                                                className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-200"
                                                title="Preview PDF"
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                                            </button>
                                            <button
                                                onClick={() => openEdit(item)}
                                                className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-200"
                                                title="Edit"
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                                            </button>
                                            <button
                                                onClick={() => handleDelete(item.id)}
                                                className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-200"
                                                title="Delete"
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

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
            <Modal show={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} maxWidth="2xl">
                <div className="flex flex-col h-full bg-white dark:bg-gray-800 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 shadow-xl">
                    <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-6">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            {formData.id ? 'Edit SPMTH' : 'Tambah SPMTH'}
                        </h2>
                        <p className="mt-2 text-purple-100 text-sm">
                            Kelola Surat Pernyataan Tanggung Jawab Mutlak (Hibah)
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="flex-1">
                        <div className="p-6 space-y-6">
                            {/* Grid 1: Basic Info */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Nomor Surat */}
                                <div>
                                    <InputLabel htmlFor="nomor_surat" value="Nomor SPMTH" className="text-gray-700 dark:text-gray-300 font-medium" />
                                    <TextInput
                                        id="nomor_surat"
                                        type="text"
                                        className="mt-1 block w-full border-gray-300 dark:border-gray-600 focus:border-purple-500 focus:ring-purple-500 rounded-lg shadow-sm"
                                        value={formData.nomor_surat}
                                        onChange={(e) => setFormData({ ...formData, nomor_surat: e.target.value })}
                                        required
                                        placeholder="Contoh: 001/SPMTH/2024"
                                    />
                                </div>
                                {/* Tanggal */}
                                <div>
                                    <InputLabel htmlFor="tanggal_spmth" value="Tanggal SPMTH" className="text-gray-700 dark:text-gray-300 font-medium" />
                                    <div className="mt-1">
                                        <DatePicker
                                            id="tanggal_spmth"
                                            selected={formData.tanggal_spmth ? new Date(formData.tanggal_spmth) : null}
                                            onChange={(date: Date | null) => {
                                                if (date) {
                                                    const offset = date.getTimezoneOffset();
                                                    const localDate = new Date(date.getTime() - (offset * 60 * 1000));
                                                    const formatted = localDate.toISOString().split('T')[0];
                                                    setFormData({ ...formData, tanggal_spmth: formatted });
                                                } else {
                                                    setFormData({ ...formData, tanggal_spmth: '' });
                                                }
                                            }}
                                            dateFormat="dd MMMM yyyy"
                                            locale="id"
                                            showMonthDropdown
                                            showYearDropdown
                                            dropdownMode="select"
                                            className="block w-full border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:border-purple-500 focus:ring-purple-500 rounded-lg shadow-sm"
                                            placeholderText="Pilih Tanggal"
                                            isClearable
                                        />
                                    </div>
                                </div>
                                {/* Tahun */}
                                <div>
                                    <InputLabel htmlFor="tahun_anggaran" value="Tahun Anggaran" className="text-gray-700 dark:text-gray-300 font-medium" />
                                    <select
                                        id="tahun_anggaran"
                                        className="mt-1 block w-full border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:border-purple-500 focus:ring-purple-500 rounded-lg shadow-sm"
                                        value={formData.tahun_anggaran}
                                        onChange={(e) => setFormData({ ...formData, tahun_anggaran: e.target.value })}
                                        required
                                    >
                                        {availableYears.map(year => (
                                            <option key={year.id} value={year.tahun_anggaran}>{year.tahun_anggaran}</option>
                                        ))}
                                    </select>
                                </div>
                                {/* Tahap */}
                                <div>
                                    <InputLabel htmlFor="tahap" value="Tahap" className="text-gray-700 dark:text-gray-300 font-medium" />
                                    <select
                                        id="tahap"
                                        className="mt-1 block w-full border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:border-purple-500 focus:ring-purple-500 rounded-lg shadow-sm"
                                        value={formData.tahap}
                                        onChange={(e) => setFormData({ ...formData, tahap: e.target.value as '1' | '2' })}
                                        required
                                    >
                                        <option value="1">1</option>
                                        <option value="2">2</option>
                                    </select>
                                </div>
                            </div>

                            {/* Calculation Button Area */}
                            <div className="flex justify-start">
                                <button
                                    type="button"
                                    onClick={handleCalculate}
                                    disabled={isCalculating}
                                    className="inline-flex items-center px-4 py-2 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-sm font-medium rounded-lg hover:bg-indigo-200 dark:hover:bg-indigo-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                                >
                                    {isCalculating ? (
                                        <>
                                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-indigo-700 dark:text-indigo-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Menghitung...
                                        </>
                                    ) : (
                                        <>
                                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
                                            Hitung Pagu & Realisasi
                                        </>
                                    )}
                                </button>
                            </div>

                            {/* Financial Details (Read Only) */}
                            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4 uppercase tracking-wider">Rincian Anggaran</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <InputLabel htmlFor="pagu" value="Pagu Anggaran" className="text-gray-600 dark:text-gray-400 text-xs uppercase" />
                                        <div className="font-semibold text-gray-900 dark:text-white text-lg">{formatCurrency(formData.pagu)}</div>
                                        <input type="hidden" value={formData.pagu} />
                                    </div>
                                    <div>
                                        <InputLabel htmlFor="realisasi_lalu" value="Realisasi Lalu" className="text-gray-600 dark:text-gray-400 text-xs uppercase" />
                                        <div className="font-semibold text-gray-900 dark:text-white text-lg">{formatCurrency(formData.realisasi_lalu)}</div>
                                    </div>
                                    <div>
                                        <InputLabel htmlFor="realisasi_ini" value="Realisasi Ini" className="text-gray-600 dark:text-gray-400 text-xs uppercase" />
                                        <div className="font-semibold text-blue-600 dark:text-blue-400 text-lg">{formatCurrency(formData.realisasi_ini)}</div>
                                    </div>
                                    <div>
                                        <InputLabel htmlFor="sisa" value="Sisa Anggaran" className="text-gray-600 dark:text-gray-400 text-xs uppercase" />
                                        <div className={`font-semibold text-lg ${formData.sisa < 0 ? 'text-red-600' : 'text-green-600'}`}>{formatCurrency(formData.sisa)}</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-750 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-3 rounded-b-lg">
                            <SecondaryButton onClick={() => setIsAddModalOpen(false)} disabled={isSaving} className="hover:bg-gray-100 dark:hover:bg-gray-600">
                                Batal
                            </SecondaryButton>
                            <PrimaryButton type="submit" disabled={isSaving} className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 border-none shadow-md hover:shadow-lg transition-all duration-200">
                                {isSaving ? (
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
            <Modal show={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} maxWidth="sm">
                <div className="p-6">
                    <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                        Hapus Data SPMTH
                    </h2>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                        Apakah Anda yakin ingin menghapus data SPMTH ini? Tindakan ini tidak dapat dibatalkan.
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
                    <div className="bg-indigo-600 px-4 py-3 flex justify-between items-center shadow-md z-10">
                        <div className="flex items-center gap-3 text-white">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                            <span className="font-medium text-sm">Preview SPMTH</span>
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

                    {/* Toolbar (Fake) */}
                    <div className="bg-gray-800 text-gray-300 px-4 py-2 flex justify-between items-center text-xs border-b border-gray-700">
                        <div className="flex items-center gap-4">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
                            <span>Surat Pernyataan Tanggung Jawab Mutlak</span>
                        </div>
                        <div className="flex items-center gap-4">
                            <span className="bg-gray-700 px-2 py-0.5 rounded">1 / 1</span>
                            <span className="flex items-center gap-1"><button className="hover:text-white">-</button> 80% <button className="hover:text-white">+</button></span>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => setIsPrintSettingsModalOpen(true)} className="hover:text-white" title="Download">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                            </button>
                            <button className="hover:text-white">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
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
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                            Tutup
                        </button>
                        <button
                            onClick={() => setIsPrintSettingsModalOpen(true)}
                            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded transition-colors flex items-center gap-2"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
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
