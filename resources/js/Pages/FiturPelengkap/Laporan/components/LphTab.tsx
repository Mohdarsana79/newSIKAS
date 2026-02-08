import React, { useState, useEffect } from 'react';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { registerLocale } from "react-datepicker";
import { id } from 'date-fns/locale/id';
import axios from 'axios';
import Modal from '@/Components/Modal';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import DangerButton from '@/Components/DangerButton';

registerLocale('id', id);

interface LphData {
    id: number;
    semester: '1' | '2';
    tanggal_lph: string | null;

    penerimaan_anggaran: number;
    penerimaan_realisasi: number;

    belanja_operasi_anggaran: number;
    belanja_operasi_realisasi: number;

    belanja_modal_peralatan_anggaran: number;
    belanja_modal_peralatan_realisasi: number;

    belanja_modal_aset_anggaran: number;
    belanja_modal_aset_realisasi: number;

    created_at: string;
    penganggaran_id: number;
    penganggaran: {
        id: number;
        tahun_anggaran: string;
    };
}

export default function LphTab() {
    const [data, setData] = useState<LphData[]>([]);
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
        tanggal_lph: '',
        tahun_anggaran: new Date().getFullYear().toString(),
        semester: '1',
        penganggaran_id: 0,

        penerimaan_anggaran: 0,
        penerimaan_realisasi: 0,

        belanja_operasi_anggaran: 0,
        belanja_operasi_realisasi: 0,

        belanja_modal_peralatan_anggaran: 0,
        belanja_modal_peralatan_realisasi: 0,

        belanja_modal_aset_anggaran: 0,
        belanja_modal_aset_realisasi: 0,
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
            const response = await axios.get('/fitur-pelengkap/api/lph/tahun');
            const years = response.data;
            setAvailableYears(years);

            if (years.length > 0) {
                setFormData(prev => {
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
            const response = await axios.get('/fitur-pelengkap/api/lph', {
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
            const response = await axios.get('/fitur-pelengkap/api/lph/calculate', {
                params: {
                    tahun_anggaran: formData.tahun_anggaran,
                    semester: formData.semester
                }
            });

            const {
                penganggaran_id,
                penerimaan_anggaran, penerimaan_realisasi,
                belanja_operasi_anggaran, belanja_operasi_realisasi,
                belanja_modal_peralatan_anggaran, belanja_modal_peralatan_realisasi,
                belanja_modal_aset_anggaran, belanja_modal_aset_realisasi
            } = response.data;

            setFormData(prev => ({
                ...prev,
                penganggaran_id,
                penerimaan_anggaran, penerimaan_realisasi,
                belanja_operasi_anggaran, belanja_operasi_realisasi,
                belanja_modal_peralatan_anggaran, belanja_modal_peralatan_realisasi,
                belanja_modal_aset_anggaran, belanja_modal_aset_realisasi
            }));
        } catch (error: any) {
            showToast(error.response?.data?.error || 'Gagal menghitung data', 'error');
        } finally {
            setIsCalculating(false);
        }
    };

    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        window.dispatchEvent(new CustomEvent('toast-notification', {
            detail: { message, type }
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            if (formData.id) {
                await axios.put(`/fitur-pelengkap/api/lph/${formData.id}`, formData);
                await fetchData(); // Refresh data on current page
                showToast('Data LPH berhasil diperbarui.', 'success');
            } else {
                await axios.post('/fitur-pelengkap/api/lph', formData);
                // If creating, go to page 1 to see the new item
                if (page !== 1) {
                    setPage(1); // This will trigger useEffect -> fetchData
                } else {
                    await fetchData(); // We are already on page 1, so manually fetch
                }
                showToast('Data LPH berhasil disimpan.', 'success');
            }

            setIsAddModalOpen(false);
            resetForm();
        } catch (error: any) {
            console.error(error);
            const errorMessage = error.response?.data?.message || 'Gagal menyimpan data LPH.';
            showToast(errorMessage, 'error');
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
            await axios.delete(`/fitur-pelengkap/api/lph/${itemToDelete}`);
            fetchData();
            setIsDeleteModalOpen(false);
            setItemToDelete(null);
            showToast('Data LPH berhasil dihapus.', 'success');
        } catch (error) {
            console.error(error);
            showToast('Gagal menghapus data.', 'error');
        }
    };

    const openEdit = (item: LphData) => {
        setFormData({
            ...item,
            id: item.id,
            tanggal_lph: item.tanggal_lph || '',
            semester: item.semester,
            tahun_anggaran: item.penganggaran?.tahun_anggaran || new Date().getFullYear().toString(),
            // Ensure numeric fields are set
            penerimaan_anggaran: Number(item.penerimaan_anggaran),
            penerimaan_realisasi: Number(item.penerimaan_realisasi),
            belanja_operasi_anggaran: Number(item.belanja_operasi_anggaran),
            belanja_operasi_realisasi: Number(item.belanja_operasi_realisasi),
            belanja_modal_peralatan_anggaran: Number(item.belanja_modal_peralatan_anggaran),
            belanja_modal_peralatan_realisasi: Number(item.belanja_modal_peralatan_realisasi),
            belanja_modal_aset_anggaran: Number(item.belanja_modal_aset_anggaran),
            belanja_modal_aset_realisasi: Number(item.belanja_modal_aset_realisasi),
        });
        setIsAddModalOpen(true);
    };

    const resetForm = () => {
        setFormData({
            id: null,
            tanggal_lph: '',
            tahun_anggaran: availableYears.length > 0 ? String(availableYears[0].tahun_anggaran) : new Date().getFullYear().toString(),
            semester: '1',
            penganggaran_id: availableYears.length > 0 ? availableYears[0].id : 0,

            penerimaan_anggaran: 0,
            penerimaan_realisasi: 0,
            belanja_operasi_anggaran: 0,
            belanja_operasi_realisasi: 0,
            belanja_modal_peralatan_anggaran: 0,
            belanja_modal_peralatan_realisasi: 0,
            belanja_modal_aset_anggaran: 0,
            belanja_modal_aset_realisasi: 0,
        });
    };

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 animate-fade-in-up">
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-purple-50 dark:bg-purple-900/30 rounded-lg">
                        <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-gray-800 dark:text-white">LPH</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Laporan Penggunaan Hibah</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <select
                        className="border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    >
                        <option value="">Semua Tahun</option>
                        {availableYears.map((year) => (
                            <option key={year.id} value={year.tahun_anggaran}>
                                Tahun {year.tahun_anggaran}
                            </option>
                        ))}
                    </select>
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
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Tanggal</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Semester</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Tahun</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {loading ? (
                            <tr><td colSpan={6} className="text-center py-4 text-gray-500">Loading...</td></tr>
                        ) : data.length === 0 ? (
                            <tr><td colSpan={6} className="text-center py-4 text-gray-500">Tidak ada data LPH.</td></tr>
                        ) : (
                            data.map((item, index) => (
                                <tr key={item.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{index + 1 + (page - 1) * 10}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{item.tanggal_lph ? new Date(item.tanggal_lph).toLocaleDateString('id-ID') : '-'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{item.semester}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{item.penganggaran?.tahun_anggaran}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        <div className="flex items-center space-x-2">
                                            <button
                                                onClick={() => { setSelectedPdfUrl(`/laporan/lph/${item.id}/pdf`); setIsPreviewModalOpen(true); }}
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
            <Modal show={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} maxWidth="4xl">
                <div className="flex flex-col h-full bg-white dark:bg-gray-800 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 shadow-xl">
                    <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-6">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            {formData.id ? 'Edit LPH' : 'Tambah LPH'}
                        </h2>
                        <p className="mt-2 text-purple-100 text-sm">
                            Kelola Laporan Penggunaan Hibah
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto max-h-[calc(100vh-200px)]">
                        <div className="p-6 space-y-8">
                            {/* Section 1: Pengaturan Laporan */}
                            <div className="bg-gray-50 dark:bg-gray-750 p-5 rounded-xl border border-gray-200 dark:border-gray-700">
                                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-900 mb-4 flex items-center gap-2">
                                    <svg className="w-4 h-4 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                    Pengaturan Laporan
                                </h3>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                                    {/* Tahun */}
                                    <div>
                                        <InputLabel htmlFor="tahun_anggaran" value="Tahun Anggaran" className="text-gray-700 dark:text-gray-900 font-medium mb-1.5" />
                                        <div className="relative">
                                            <select
                                                id="tahun_anggaran"
                                                className="block w-full pl-3 pr-10 py-2.5 text-base border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm rounded-lg shadow-sm"
                                                value={formData.tahun_anggaran}
                                                onChange={(e) => {
                                                    const selectedYear = e.target.value;
                                                    const selectedBudget = availableYears.find(y => String(y.tahun_anggaran) === selectedYear);
                                                    setFormData({
                                                        ...formData,
                                                        tahun_anggaran: selectedYear,
                                                        penganggaran_id: selectedBudget ? selectedBudget.id : formData.penganggaran_id
                                                    });
                                                }}
                                                required
                                            >
                                                {availableYears.map(year => (
                                                    <option key={year.id} value={year.tahun_anggaran}>{year.tahun_anggaran}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    {/* Semester */}
                                    <div>
                                        <InputLabel htmlFor="semester" value="Semester" className="text-gray-700 dark:text-gray-900 font-medium mb-1.5" />
                                        <select
                                            id="semester"
                                            className="block w-full pl-3 pr-10 py-2.5 text-base border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm rounded-lg shadow-sm"
                                            value={formData.semester}
                                            onChange={(e) => setFormData({ ...formData, semester: e.target.value as '1' | '2' })}
                                            required
                                        >
                                            <option value="1">Semester 1 (Jan - Jun)</option>
                                            <option value="2">Semester 2 (Jul - Des)</option>
                                        </select>
                                    </div>

                                    {/* Tanggal */}
                                    <div>
                                        <InputLabel htmlFor="tanggal_lph" value="Tanggal LPH" className="text-gray-700 dark:text-gray-900 font-medium mb-1.5" />
                                        <DatePicker
                                            id="tanggal_lph"
                                            selected={formData.tanggal_lph ? new Date(formData.tanggal_lph) : null}
                                            onChange={(date: Date | null) => {
                                                if (date) {
                                                    const offset = date.getTimezoneOffset();
                                                    const localDate = new Date(date.getTime() - (offset * 60 * 1000));
                                                    const formatted = localDate.toISOString().split('T')[0];
                                                    setFormData({ ...formData, tanggal_lph: formatted });
                                                } else {
                                                    setFormData({ ...formData, tanggal_lph: '' });
                                                }
                                            }}
                                            dateFormat="dd MMMM yyyy"
                                            locale="id"
                                            showMonthDropdown
                                            showYearDropdown
                                            dropdownMode="select"
                                            className="block w-full py-2.5 border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white focus:border-purple-500 focus:ring-purple-500 rounded-lg shadow-sm sm:text-sm"
                                            placeholderText="Pilih Tanggal Laporan"
                                            isClearable
                                        />
                                    </div>
                                </div>

                                <div className="mt-5 flex justify-end">
                                    <button
                                        type="button"
                                        onClick={handleCalculate}
                                        disabled={isCalculating}
                                        className="inline-flex items-center px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-300 dark:focus:ring-indigo-800 text-white text-sm font-medium rounded-lg transition-all shadow-sm disabled:opacity-70"
                                    >
                                        {isCalculating ? (
                                            <>
                                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                                Sedang Menghitung...
                                            </>
                                        ) : (
                                            <>
                                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
                                                Hitung Anggaran & Realisasi
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Section 2: Rincian Keuangan Table */}
                            <div>
                                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                    <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                    </svg>
                                    Rincian Keuangan
                                </h3>

                                <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden shadow-sm">
                                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                        <thead className="bg-gray-50 dark:bg-gray-800">
                                            <tr>
                                                <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Uraian</th>
                                                <th scope="col" className="px-6 py-3 text-right text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Jumlah Anggaran</th>
                                                <th scope="col" className="px-6 py-3 text-right text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Jumlah Realisasi</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                                            <tr className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors bg-blue-50/30 dark:bg-blue-900/10">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                                                    Penerimaan
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-mono text-gray-700 dark:text-gray-300">
                                                    {formatCurrency(formData.penerimaan_anggaran)}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-mono font-medium text-blue-600 dark:text-blue-400">
                                                    {formatCurrency(formData.penerimaan_realisasi)}
                                                </td>
                                            </tr>
                                            <tr className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white pl-10 border-l-4 border-l-transparent hover:border-l-indigo-500">
                                                    Belanja Operasi
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-mono text-gray-700 dark:text-gray-300">
                                                    {formatCurrency(formData.belanja_operasi_anggaran)}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-mono text-gray-700 dark:text-gray-300">
                                                    {formatCurrency(formData.belanja_operasi_realisasi)}
                                                </td>
                                            </tr>
                                            <tr className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white pl-10 border-l-4 border-l-transparent hover:border-l-indigo-500">
                                                    Belanja Modal Peralatan
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-mono text-gray-700 dark:text-gray-300">
                                                    {formatCurrency(formData.belanja_modal_peralatan_anggaran)}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-mono text-gray-700 dark:text-gray-300">
                                                    {formatCurrency(formData.belanja_modal_peralatan_realisasi)}
                                                </td>
                                            </tr>
                                            <tr className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white pl-10 border-l-4 border-l-transparent hover:border-l-indigo-500">
                                                    Belanja Modal Aset Lainnya
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-mono text-gray-700 dark:text-gray-300">
                                                    {formatCurrency(formData.belanja_modal_aset_anggaran)}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-mono text-gray-700 dark:text-gray-300">
                                                    {formatCurrency(formData.belanja_modal_aset_realisasi)}
                                                </td>
                                            </tr>
                                            {/* Summary Row */}
                                            <tr className="bg-gray-100 dark:bg-gray-800 font-semibold border-t-2 border-gray-300 dark:border-gray-600">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white text-right">
                                                    Total Belanja
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-mono text-gray-900 dark:text-white">
                                                    {formatCurrency(formData.belanja_operasi_anggaran + formData.belanja_modal_peralatan_anggaran + formData.belanja_modal_aset_anggaran)}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-mono text-yellow-600 dark:text-yellow-400">
                                                    {formatCurrency(formData.belanja_operasi_realisasi + formData.belanja_modal_peralatan_realisasi + formData.belanja_modal_aset_realisasi)}
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
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
                        Hapus Data LPH
                    </h2>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                        Apakah Anda yakin ingin menghapus data LPH ini? Tindakan ini tidak dapat dibatalkan.
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
                            <span className="font-medium text-sm">Preview LPH</span>
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
