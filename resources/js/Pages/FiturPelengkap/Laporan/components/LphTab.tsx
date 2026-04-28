import React, { useState, useEffect } from 'react';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { registerLocale } from "react-datepicker";
import { id } from 'date-fns/locale/id';
import axios from 'axios';
import Select from 'react-select';
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
    items?: any[];
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
    const [isValidationModalOpen, setIsValidationModalOpen] = useState(false);
    const [validationMessage, setValidationMessage] = useState('');
    const [itemToDelete, setItemToDelete] = useState<number | null>(null);
    const [selectedPdfUrl, setSelectedPdfUrl] = useState('');
    const [isPrintSettingsModalOpen, setIsPrintSettingsModalOpen] = useState(false);
    const [printSettings, setPrintSettings] = useState({
        paperSize: 'A4',
        fontSize: '11pt'
    });

    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        window.dispatchEvent(new CustomEvent('toast-notification', {
            detail: { message, type }
        }));
    };

    const handlePrint = () => {
        const url = `${selectedPdfUrl}?paper_size=${printSettings.paperSize}&font_size=${printSettings.fontSize}`;
        window.open(url, '_blank');
        setIsPrintSettingsModalOpen(false);
    };

    // Form Data
    const [formData, setFormData] = useState({
        id: null as number | null,
        semester: '1',
        tanggal_lph: '',
        penganggaran_id: 0,
        tahun_anggaran: new Date().getFullYear().toString(),
        
        penerimaan_anggaran: 0,
        penerimaan_realisasi: 0,
        belanja_operasi_anggaran: 0,
        belanja_operasi_realisasi: 0,
        belanja_modal_peralatan_anggaran: 0,
        belanja_modal_peralatan_realisasi: 0,
        belanja_modal_aset_anggaran: 0,
        belanja_modal_aset_realisasi: 0,
        
        rekap_per_rekening: [] as any[]
    });

    const [isSaving, setIsSaving] = useState(false);
    const [isCalculating, setIsCalculating] = useState(false);
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

            setFormData(prev => ({
                ...prev,
                ...response.data,
                rekap_per_rekening: response.data.rekap_per_rekening || [],
                penganggaran_id: response.data.penganggaran_id
            }));
            showToast('Data berhasil dihitung.', 'success');
        } catch (error: any) {
            showToast(error.response?.data?.error || 'Gagal menghitung data', 'error');
        } finally {
            setIsCalculating(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            if (formData.id) {
                await axios.put(`/fitur-pelengkap/api/lph/${formData.id}`, formData);
                showToast('Data LPH berhasil diperbarui.', 'success');
            } else {
                await axios.post('/fitur-pelengkap/api/lph', formData);
                showToast('Data LPH berhasil disimpan.', 'success');
            }
            setIsAddModalOpen(false);
            fetchData();
            resetForm();
        } catch (error: any) {
            console.error(error);
            if (error.response && error.response.status === 422) {
                const errors = error.response.data.errors;
                if (errors.semester) {
                    setValidationMessage(errors.semester[0]);
                    setIsValidationModalOpen(true);
                } else {
                    showToast('Data tidak valid. Silakan periksa kembali.', 'error');
                }
            } else {
                showToast('Gagal menyimpan data LPH.', 'error');
            }
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

    const openEdit = (item: any) => {
        setFormData({
            id: item.id,
            semester: item.semester,
            tanggal_lph: item.tanggal_lph || '',
            penganggaran_id: item.penganggaran_id,
            tahun_anggaran: item.penganggaran?.tahun_anggaran || new Date().getFullYear().toString(),
            
            penerimaan_anggaran: Number(item.penerimaan_anggaran) || 0,
            penerimaan_realisasi: Number(item.penerimaan_realisasi) || 0,
            belanja_operasi_anggaran: Number(item.belanja_operasi_anggaran) || 0,
            belanja_operasi_realisasi: Number(item.belanja_operasi_realisasi) || 0,
            belanja_modal_peralatan_anggaran: Number(item.belanja_modal_peralatan_anggaran) || 0,
            belanja_modal_peralatan_realisasi: Number(item.belanja_modal_peralatan_realisasi) || 0,
            belanja_modal_aset_anggaran: Number(item.belanja_modal_aset_anggaran) || 0,
            belanja_modal_aset_realisasi: Number(item.belanja_modal_aset_realisasi) || 0,
            
            rekap_per_rekening: item.items || []
        });
        setIsAddModalOpen(true);
    };

    const resetForm = () => {
        setFormData({
            id: null,
            semester: '1',
            tanggal_lph: '',
            penganggaran_id: availableYears.length > 0 ? availableYears[0].id : 0,
            tahun_anggaran: availableYears.length > 0 ? String(availableYears[0].tahun_anggaran) : new Date().getFullYear().toString(),
            
            penerimaan_anggaran: 0,
            penerimaan_realisasi: 0,
            belanja_operasi_anggaran: 0,
            belanja_operasi_realisasi: 0,
            belanja_modal_peralatan_anggaran: 0,
            belanja_modal_peralatan_realisasi: 0,
            belanja_modal_aset_anggaran: 0,
            belanja_modal_aset_realisasi: 0,
            
            rekap_per_rekening: []
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
                        <p className="text-sm text-gray-500 dark:text-gray-400">Laporan Penggunaan Hibah (BOSP)</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <input
                        type="text"
                        placeholder="Cari LPH..."
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
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Semester</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Tahun</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Tanggal Lapor</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {loading ? (
                            <tr><td colSpan={5} className="text-center py-4 text-gray-500">Loading...</td></tr>
                        ) : data.length === 0 ? (
                            <tr><td colSpan={5} className="text-center py-4 text-gray-500">Tidak ada data LPH.</td></tr>
                        ) : (
                            data.map((item, index) => (
                                <tr key={item.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{index + 1 + (page - 1) * 10}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{item.semester === '1' ? 'Ganjil' : 'Genap'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{item.penganggaran?.tahun_anggaran}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{item.tanggal_lph ? new Date(item.tanggal_lph).toLocaleDateString('id-ID') : '-'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        <div className="flex items-center space-x-2">
                                            <button
                                                onClick={() => { setSelectedPdfUrl(`/laporan/lph/${item.id}/pdf`); setIsPreviewModalOpen(true); }}
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
                            ))
                        )}
                    </tbody>
                </table>
            </div>

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
            <Modal show={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} maxWidth="7xl">
                <div className="flex flex-col h-[90vh] bg-white dark:bg-gray-800 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 shadow-xl">
                    <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-6 shrink-0">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            {formData.id ? 'Edit LPH' : 'Tambah LPH'}
                        </h2>
                        <p className="mt-2 text-purple-100 text-sm">
                            Kelola Laporan Penggunaan Hibah (BOSP)
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
                        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                            {/* Grid 1: Basic Info */}
                            <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg border border-gray-100 dark:border-gray-600">
                                <h3 className="text-sm font-semibold text-purple-700 dark:text-purple-300 uppercase tracking-wide mb-4">Informasi Laporan</h3>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                    <div>
                                        <InputLabel htmlFor="semester" value="Semester" className="text-gray-700 dark:text-gray-300 font-medium" />
                                        <select
                                            id="semester"
                                            className="mt-1 block w-full border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:border-purple-500 focus:ring-purple-500 rounded-lg shadow-sm"
                                            value={formData.semester}
                                            onChange={(e) => setFormData({ ...formData, semester: e.target.value })}
                                            required
                                        >
                                            <option value="1">Ganjil (Jan-Jun)</option>
                                            <option value="2">Genap (Jul-Des)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <InputLabel htmlFor="tahun_anggaran" value="Tahun Anggaran" className="text-gray-700 dark:text-gray-300 font-medium" />
                                        <Select
                                            id="tahun_anggaran"
                                            className="mt-1"
                                            classNamePrefix="react-select"
                                            options={availableYears.map(year => ({ value: year.tahun_anggaran.toString(), label: year.tahun_anggaran.toString() }))}
                                            value={availableYears
                                                .filter(year => String(year.tahun_anggaran) === String(formData.tahun_anggaran))
                                                .map(year => ({ value: year.tahun_anggaran.toString(), label: year.tahun_anggaran.toString() }))[0] || null
                                            }
                                            onChange={(val: any) => {
                                                const selectedYear = val ? val.value : '';
                                                const selectedBudget = availableYears.find(y => String(y.tahun_anggaran) === selectedYear);
                                                setFormData({
                                                    ...formData,
                                                    tahun_anggaran: selectedYear,
                                                    penganggaran_id: selectedBudget ? selectedBudget.id : formData.penganggaran_id
                                                });
                                            }}
                                            placeholder="Pilih Tahun Anggaran..."
                                            isSearchable
                                            required
                                            styles={{
                                                control: (baseStyles, state) => ({
                                                    ...baseStyles,
                                                    borderColor: state.isFocused ? '#6366f1' : '#d1d5db',
                                                    boxShadow: state.isFocused ? '0 0 0 1px #6366f1' : 'none',
                                                    '&:hover': { borderColor: state.isFocused ? '#6366f1' : '#9ca3af' },
                                                    borderRadius: '0.375rem',
                                                    padding: '0.125rem',
                                                }),
                                                singleValue: (base) => ({
                                                    ...base,
                                                    color: '#111827',
                                                }),
                                                input: (base) => ({
                                                    ...base,
                                                    color: '#111827',
                                                    'input': {
                                                        boxShadow: 'none !important',
                                                        border: 'none !important',
                                                        outline: 'none !important',
                                                    },
                                                    'input:focus': {
                                                        boxShadow: 'none !important',
                                                        border: 'none !important',
                                                    }
                                                }),
                                                option: (base, state) => ({
                                                    ...base,
                                                    color: '#111827',
                                                    backgroundColor: state.isSelected ? '#e5e7eb' : state.isFocused ? '#f3f4f6' : 'transparent',
                                                }),
                                                menu: (baseStyles) => ({
                                                    ...baseStyles,
                                                    zIndex: 9999,
                                                })
                                            }}
                                        />
                                    </div>
                                    <div>
                                        <InputLabel htmlFor="tanggal_lph" value="Tanggal Lapor" className="text-gray-700 dark:text-gray-300 font-medium" />
                                        <div className="mt-1">
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
                                                className="block w-full border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:border-purple-500 focus:ring-purple-500 rounded-lg shadow-sm"
                                                placeholderText="Pilih Tanggal"
                                                isClearable
                                            />
                                        </div>
                                    </div>
                                    <div className="flex items-end justify-end">
                                        <button
                                            type="button"
                                            onClick={handleCalculate}
                                            disabled={isCalculating}
                                            className="inline-flex items-center px-4 py-2 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-sm font-medium rounded-lg hover:bg-indigo-200 dark:hover:bg-indigo-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors w-full justify-center"
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
                                                    Tarik Data Realisasi
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Section 2: Summary Stats */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {/* Penerimaan */}
                                <div className="bg-green-50 dark:bg-green-900/10 p-6 rounded-xl border border-green-100 dark:border-green-800">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="p-2 bg-green-500 rounded-lg text-white">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                        </div>
                                        <h3 className="font-bold text-green-800 dark:text-green-300">PENERIMAAN</h3>
                                    </div>
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-green-700 dark:text-green-400">Anggaran:</span>
                                            <span className="font-bold text-green-900 dark:text-green-200">{formatCurrency(formData.penerimaan_anggaran)}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-green-700 dark:text-green-400">Realisasi:</span>
                                            <span className="font-bold text-green-900 dark:text-green-200">{formatCurrency(formData.penerimaan_realisasi)}</span>
                                        </div>
                                        <div className="pt-2 border-t border-green-200 dark:border-green-800 flex justify-between items-center font-bold">
                                            <span className="text-green-800 dark:text-green-300">Selisih:</span>
                                            <span className="text-green-900 dark:text-green-100">{formatCurrency(formData.penerimaan_anggaran - formData.penerimaan_realisasi)}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Belanja Operasi */}
                                <div className="bg-blue-50 dark:bg-blue-900/10 p-6 rounded-xl border border-blue-100 dark:border-blue-800">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="p-2 bg-blue-500 rounded-lg text-white">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                                        </div>
                                        <h3 className="font-bold text-blue-800 dark:text-blue-300">BELANJA OPERASI</h3>
                                    </div>
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-blue-700 dark:text-blue-400">Anggaran:</span>
                                            <span className="font-bold text-blue-900 dark:text-blue-200">{formatCurrency(formData.belanja_operasi_anggaran)}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-blue-700 dark:text-blue-400">Realisasi:</span>
                                            <span className="font-bold text-blue-900 dark:text-blue-200">{formatCurrency(formData.belanja_operasi_realisasi)}</span>
                                        </div>
                                        <div className="pt-2 border-t border-blue-200 dark:border-blue-800 flex justify-between items-center font-bold">
                                            <span className="text-blue-800 dark:text-blue-300">Selisih:</span>
                                            <span className="text-blue-900 dark:text-blue-100">{formatCurrency(formData.belanja_operasi_anggaran - formData.belanja_operasi_realisasi)}</span>
                                        </div>
                                    </div>
                                </div>
                                
                                {/* Belanja Modal Peralatan */}
                                <div className="bg-amber-50 dark:bg-amber-900/10 p-6 rounded-xl border border-amber-100 dark:border-amber-800">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="p-2 bg-amber-500 rounded-lg text-white">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"></path></svg>
                                        </div>
                                        <h3 className="font-bold text-amber-800 dark:text-amber-300">BM PERALATAN & MESIN</h3>
                                    </div>
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-amber-700 dark:text-amber-400">Anggaran:</span>
                                            <span className="font-bold text-amber-900 dark:text-amber-200">{formatCurrency(formData.belanja_modal_peralatan_anggaran)}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-amber-700 dark:text-amber-400">Realisasi:</span>
                                            <span className="font-bold text-amber-900 dark:text-amber-200">{formatCurrency(formData.belanja_modal_peralatan_realisasi)}</span>
                                        </div>
                                        <div className="pt-2 border-t border-amber-200 dark:border-amber-800 flex justify-between items-center font-bold">
                                            <span className="text-amber-800 dark:text-amber-300">Selisih:</span>
                                            <span className="text-amber-900 dark:text-amber-100">{formatCurrency(formData.belanja_modal_peralatan_anggaran - formData.belanja_modal_peralatan_realisasi)}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Belanja Modal Aset Tetap Lainnya */}
                                <div className="bg-rose-50 dark:bg-rose-900/10 p-6 rounded-xl border border-rose-100 dark:border-rose-800">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="p-2 bg-rose-500 rounded-lg text-white">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
                                        </div>
                                        <h3 className="font-bold text-rose-800 dark:text-rose-300">BM ASET TETAP LAINNYA</h3>
                                    </div>
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-rose-700 dark:text-rose-400">Anggaran:</span>
                                            <span className="font-bold text-rose-900 dark:text-rose-200">{formatCurrency(formData.belanja_modal_aset_anggaran)}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-rose-700 dark:text-rose-400">Realisasi:</span>
                                            <span className="font-bold text-rose-900 dark:text-rose-200">{formatCurrency(formData.belanja_modal_aset_realisasi)}</span>
                                        </div>
                                        <div className="pt-2 border-t border-rose-200 dark:border-rose-800 flex justify-between items-center font-bold">
                                            <span className="text-rose-800 dark:text-rose-300">Selisih:</span>
                                            <span className="text-rose-900 dark:text-rose-100">{formatCurrency(formData.belanja_modal_aset_anggaran - formData.belanja_modal_aset_realisasi)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Section 3: Items Table */}
                            <div>
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Rincian Penggunaan Dana Per Rekening</h3>
                                </div>
                                <div className="overflow-hidden border border-gray-200 dark:border-gray-700 rounded-lg">
                                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                        <thead className="bg-gray-50 dark:bg-gray-700">
                                            <tr>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Kode Rekening</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Uraian</th>
                                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Jumlah (Rp)</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                            {(formData.rekap_per_rekening || []).length === 0 ? (
                                                <tr><td colSpan={3} className="text-center py-8 text-gray-400 italic">Klik tombol "Tarik Data Realisasi" untuk memuat rincian.</td></tr>
                                            ) : (
                                                formData.rekap_per_rekening.map((item, idx) => (
                                                    <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400 font-mono">{item.kode_rekening}</td>
                                                        <td className="px-4 py-3 text-sm text-gray-800 dark:text-gray-200">{item.uraian}</td>
                                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-medium text-gray-900 dark:text-white">
                                                            {formatCurrency(Number(item.total_realisasi))}
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                        {(formData.rekap_per_rekening || []).length > 0 && (
                                            <tfoot className="bg-gray-50 dark:bg-gray-700/50">
                                                <tr>
                                                    <td colSpan={2} className="px-4 py-3 text-sm font-bold text-gray-900 dark:text-white text-right">TOTAL PENGGUNAAN:</td>
                                                    <td className="px-4 py-3 text-sm font-bold text-gray-900 dark:text-white text-right">
                                                        {formatCurrency(formData.rekap_per_rekening.reduce((sum, item) => sum + Number(item.total_realisasi), 0))}
                                                    </td>
                                                </tr>
                                            </tfoot>
                                        )}
                                    </table>
                                </div>
                            </div>
                        </div>

                        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-750 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-3 rounded-b-lg shrink-0">
                            <SecondaryButton onClick={() => setIsAddModalOpen(false)} disabled={isSaving} className="hover:bg-gray-100 dark:hover:bg-gray-600">
                                Batal
                            </SecondaryButton>
                            <PrimaryButton type="submit" disabled={isSaving || (formData.rekap_per_rekening || []).length === 0} className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 border-none shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50">
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
                                        Simpan LPH
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
                        Apakah Anda yakin ingin menghapus laporan LPH ini? Tindakan ini tidak dapat dibatalkan.
                    </p>
                    <div className="mt-6 flex justify-end gap-3">
                        <SecondaryButton onClick={() => setIsDeleteModalOpen(false)}>Batal</SecondaryButton>
                        <DangerButton onClick={confirmDelete}>Hapus</DangerButton>
                    </div>
                </div>
            </Modal>

            {/* Preview Modal */}
            <Modal show={isPreviewModalOpen} onClose={() => setIsPreviewModalOpen(false)} maxWidth="5xl">
                <div id="lph-pdf-preview" className="flex flex-col h-[85vh] bg-gray-900 rounded-lg overflow-hidden relative">
                    <div className="bg-purple-600 px-4 py-3 flex justify-between items-center shadow-md z-10">
                        <div className="flex items-center gap-3 text-white">
                            <span className="font-medium text-sm">Preview LPH (Lampiran Hibah)</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => {
                                    const elem = document.getElementById('lph-pdf-preview');
                                    if (elem) {
                                        if (!document.fullscreenElement) {
                                            elem.requestFullscreen().catch(err => console.error(err));
                                        } else {
                                            document.exitFullscreen();
                                        }
                                    }
                                }}
                                className="text-white/80 hover:text-white p-1 rounded hover:bg-white/10"
                                title="Fullscreen"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                                </svg>
                            </button>
                            <button onClick={() => setIsPreviewModalOpen(false)} className="text-white/80 hover:text-white p-1 rounded hover:bg-white/10" title="Close">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 bg-gray-500 overflow-hidden relative flex justify-center items-center p-4">
                        <iframe src={selectedPdfUrl} className="w-full h-full shadow-2xl bg-white" title="PDF Preview" />
                    </div>

                    <div className="bg-gray-800 px-4 py-3 border-t border-gray-700 flex justify-end items-center gap-3">
                        <button
                            onClick={() => setIsPreviewModalOpen(false)}
                            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 text-sm font-medium rounded transition-colors flex items-center gap-2"
                        >
                            Tutup
                        </button>
                        <button
                            onClick={() => setIsPrintSettingsModalOpen(true)}
                            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded transition-colors flex items-center gap-2"
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

            {/* Validation Modal */}
            <Modal show={isValidationModalOpen} onClose={() => setIsValidationModalOpen(false)} maxWidth="md">
                <div className="p-0 overflow-hidden rounded-lg shadow-2xl bg-white dark:bg-gray-800 animate-scale-in">
                    <div className="bg-gradient-to-r from-red-500 to-pink-600 p-6 flex items-center justify-center">
                        <div className="bg-white/20 p-4 rounded-full backdrop-blur-sm animate-pulse">
                            <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                    </div>
                    
                    <div className="p-8 text-center">
                        <h3 className="text-2xl font-extrabold text-gray-900 dark:text-white mb-3">
                            Data Duplikat Terdeteksi
                        </h3>
                        <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4 mb-6 rounded-r-lg">
                            <p className="text-red-700 dark:text-red-400 font-medium">
                                {validationMessage}
                            </p>
                        </div>
                        <p className="text-gray-600 dark:text-gray-400 mb-8">
                            Laporan LPH untuk semester dan tahun anggaran ini sudah terdaftar dalam sistem. Mohon periksa kembali data yang sudah ada.
                        </p>
                        
                        <button
                            onClick={() => setIsValidationModalOpen(false)}
                            className="w-full py-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold rounded-xl hover:bg-gray-800 dark:hover:bg-gray-100 transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg flex items-center justify-center gap-2 group"
                        >
                            <span>Saya Mengerti</span>
                            <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                            </svg>
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
