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

interface Sp2bData {
    id: number;
    nomor_sp2b: string;
    tanggal_sp2b: string;
    tahap: '1' | '2';
    saldo_awal: number;
    pendapatan: number;
    belanja: number;
    belanja_pegawai: number;
    belanja_barang_jasa: number;
    belanja_modal: number;
    belanja_modal_peralatan_mesin: number;
    belanja_modal_aset_tetap_lainnya: number;
    belanja_modal_tanah_bangunan: number;
    saldo_akhir: number;
    created_at: string;
    penganggaran_id: number;
    penganggaran: {
        id: number;
        tahun_anggaran: string;
    };
}

export default function Sp2bTab() {
    const [data, setData] = useState<Sp2bData[]>([]);
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
        fontSize: '8pt'
    });

    const handlePrint = () => {
        const url = `${selectedPdfUrl}?paper_size=${printSettings.paperSize}&font_size=${printSettings.fontSize}`;
        window.open(url, '_blank');
        setIsPrintSettingsModalOpen(false);
    };

    // Form Data
    const [formData, setFormData] = useState({
        id: null as number | null,
        nomor_sp2b: '',
        tanggal_sp2b: '',
        tahap: '1',
        penganggaran_id: 0,
        tahun_anggaran: new Date().getFullYear().toString(),
        saldo_awal: 0,
        pendapatan: 0,
        belanja: 0,
        belanja_pegawai: 0,
        belanja_barang_jasa: 0,
        belanja_modal: 0,
        belanja_modal_peralatan_mesin: 0,
        belanja_modal_aset_tetap_lainnya: 0,
        belanja_modal_tanah_bangunan: 0,
        saldo_akhir: 0,
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
            const response = await axios.get('/fitur-pelengkap/api/sp2b/calculate', {
                params: {
                    tahun_anggaran: formData.tahun_anggaran,
                    tahap: formData.tahap
                }
            });

            setFormData(prev => ({
                ...prev,
                saldo_awal: response.data.saldo_awal,
                pendapatan: response.data.pendapatan,
                belanja: response.data.belanja,
                belanja_pegawai: response.data.belanja_pegawai,
                belanja_barang_jasa: response.data.belanja_barang_jasa,
                belanja_modal: response.data.belanja_modal,
                belanja_modal_peralatan_mesin: response.data.belanja_modal_peralatan_mesin,
                belanja_modal_aset_tetap_lainnya: response.data.belanja_modal_aset_tetap_lainnya,
                belanja_modal_tanah_bangunan: response.data.belanja_modal_tanah_bangunan,
                saldo_akhir: response.data.saldo_akhir,
            }));
        } catch (error: any) {
            alert(error.response?.data?.error || 'Gagal menghitung data');
        } finally {
            setIsCalculating(false);
        }
    };

    const fetchAvailableYears = async () => {
        try {
            const response = await axios.get('/fitur-pelengkap/api/sp2b/tahun');
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
            const response = await axios.get('/fitur-pelengkap/api/sp2b', {
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
                await axios.put(`/fitur-pelengkap/api/sp2b/${formData.id}`, formData);
            } else {
                await axios.post('/fitur-pelengkap/api/sp2b', formData);
            }
            setIsAddModalOpen(false);
            fetchData();
            resetForm();
        } catch (error) {
            console.error(error);
            alert('Gagal menyimpan data. Pastikan semua field sudah diisi termasuk memencet tombol hitung otomatis.');
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
            await axios.delete(`/fitur-pelengkap/api/sp2b/${itemToDelete}`);
            fetchData();
            setIsDeleteModalOpen(false);
            setItemToDelete(null);
        } catch (error) {
            console.error(error);
            alert('Gagal menghapus data');
        }
    };

    const openEdit = (item: Sp2bData) => {
        setFormData({
            id: item.id,
            nomor_sp2b: item.nomor_sp2b,
            tanggal_sp2b: item.tanggal_sp2b || '',
            tahap: item.tahap as any,
            tahun_anggaran: item.penganggaran?.tahun_anggaran || new Date().getFullYear().toString(),
            penganggaran_id: item.penganggaran_id,
            saldo_awal: Number(item.saldo_awal),
            pendapatan: Number(item.pendapatan),
            belanja: Number(item.belanja),
            belanja_pegawai: Number(item.belanja_pegawai),
            belanja_barang_jasa: Number(item.belanja_barang_jasa),
            belanja_modal: Number(item.belanja_modal),
            belanja_modal_peralatan_mesin: Number(item.belanja_modal_peralatan_mesin),
            belanja_modal_aset_tetap_lainnya: Number(item.belanja_modal_aset_tetap_lainnya),
            belanja_modal_tanah_bangunan: Number(item.belanja_modal_tanah_bangunan),
            saldo_akhir: Number(item.saldo_akhir),
        });
        setIsAddModalOpen(true);
    };

    const resetForm = () => {
        setFormData({
            id: null,
            nomor_sp2b: '',
            tanggal_sp2b: '',
            tahap: '1',
            penganggaran_id: availableYears.length > 0 ? availableYears[0].id : 0,
            tahun_anggaran: availableYears.length > 0 ? String(availableYears[0].tahun_anggaran) : new Date().getFullYear().toString(),
            saldo_awal: 0,
            pendapatan: 0,
            belanja: 0,
            belanja_pegawai: 0,
            belanja_barang_jasa: 0,
            belanja_modal: 0,
            belanja_modal_peralatan_mesin: 0,
            belanja_modal_aset_tetap_lainnya: 0,
            belanja_modal_tanah_bangunan: 0,
            saldo_akhir: 0,
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
                        <h3 className="text-lg font-bold text-gray-800 dark:text-white">SP2B</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Surat Permintaan Pengesahan Belanja</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <input
                        type="text"
                        placeholder="Cari Nomor SP2B..."
                        className="border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                    <PrimaryButton onClick={() => { resetForm(); setIsAddModalOpen(true); }}>
                        Tambah SP2B
                    </PrimaryButton>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">No</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Nomor SP2B</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Belanja Pegawai</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Belanja Barang dan Jasa</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Belanja Modal</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Tahap</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Tahun</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {loading ? (
                            <tr><td colSpan={8} className="text-center py-4 text-gray-500">Loading...</td></tr>
                        ) : data.length === 0 ? (
                            <tr><td colSpan={8} className="text-center py-4 text-gray-500">Tidak ada data SP2B.</td></tr>
                        ) : (
                            data.map((item, index) => {
                                return (
                                    <tr key={item.id}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{index + 1 + (page - 1) * 10}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{item.nomor_sp2b}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{formatCurrency(item.belanja_pegawai)}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{formatCurrency(item.belanja_barang_jasa)}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{formatCurrency(item.belanja_modal)}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{item.tahap}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{item.penganggaran?.tahun_anggaran}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                            <div className="flex items-center space-x-2">
                                                <button
                                                    onClick={() => { setSelectedPdfUrl(`/laporan/sp2b/${item.id}/pdf`); setIsPreviewModalOpen(true); }}
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
                <div className="flex flex-col h-[85vh] bg-white dark:bg-gray-800 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 shadow-xl">
                    <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 shrink-0">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            {formData.id ? 'Edit SP2B' : 'Tambah SP2B'}
                        </h2>
                        <p className="mt-2 text-blue-100 text-sm">
                            Permintaan Pengesahan Belanja (Modal Perhitungan Otomatis)
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
                        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                            <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg border border-gray-100 dark:border-gray-600">
                                <h3 className="text-sm font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wide mb-4">Informasi Surat</h3>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                    <div className="col-span-1 md:col-span-2">
                                        <InputLabel htmlFor="nomor_sp2b" value="Nomor SP2B" className="text-gray-700 dark:text-gray-300 font-medium" />
                                        <TextInput
                                            id="nomor_sp2b"
                                            type="text"
                                            className="mt-1 block w-full border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500 rounded-lg shadow-sm text-gray-900"
                                            value={formData.nomor_sp2b}
                                            onChange={(e) => setFormData({ ...formData, nomor_sp2b: e.target.value })}
                                            required
                                            placeholder="Contoh: 001/SP2b/2025"
                                        />
                                    </div>
                                    <div>
                                        <InputLabel htmlFor="tanggal_sp2b" value="Tanggal SP2B" className="text-gray-700 dark:text-gray-300 font-medium" />
                                        <div className="mt-1">
                                            <DatePicker
                                                id="tanggal_sp2b"
                                                selected={formData.tanggal_sp2b ? new Date(formData.tanggal_sp2b) : null}
                                                onChange={(date: Date | null) => {
                                                    if (date) {
                                                        const offset = date.getTimezoneOffset();
                                                        const localDate = new Date(date.getTime() - (offset * 60 * 1000));
                                                        const formatted = localDate.toISOString().split('T')[0];
                                                        setFormData({ ...formData, tanggal_sp2b: formatted });
                                                    } else {
                                                        setFormData({ ...formData, tanggal_sp2b: '' });
                                                    }
                                                }}
                                                dateFormat="dd MMMM yyyy"
                                                locale="id"
                                                showMonthDropdown
                                                showYearDropdown
                                                dropdownMode="select"
                                                className="block w-full border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:border-blue-500 focus:ring-blue-500 rounded-lg shadow-sm"
                                                placeholderText="Pilih Tanggal"
                                                isClearable
                                                required
                                            />
                                        </div>
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
                                                    color: '#111827', // text-gray-900
                                                }),
                                                input: (base) => ({
                                                    ...base,
                                                    color: '#111827', // text-gray-900
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
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-4">
                                    <div>
                                        <InputLabel htmlFor="tahap" value="Tahap" className="text-gray-700 dark:text-gray-300 font-medium" />
                                        <select
                                            id="tahap"
                                            className="mt-1 block w-full border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:border-blue-500 focus:ring-blue-500 rounded-lg shadow-sm"
                                            value={formData.tahap}
                                            onChange={(e) => setFormData({ ...formData, tahap: e.target.value as '1' | '2' })}
                                            required
                                        >
                                            <option value="1">1</option>
                                            <option value="2">2</option>
                                        </select>
                                    </div>
                                    <div className="flex items-end col-span-3 justify-end">
                                        <button
                                            type="button"
                                            onClick={handleCalculate}
                                            disabled={isCalculating}
                                            className="inline-flex items-center px-4 py-2 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-sm font-medium rounded-lg hover:bg-indigo-200 dark:hover:bg-indigo-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors w-full md:w-auto justify-center"
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
                                                    Hitung Otomatis via API
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                                    <InputLabel value="Saldo Awal" />
                                    <input type="text" readOnly className="mt-1 block w-full bg-gray-100 dark:bg-gray-600 border-gray-300 rounded-md" value={formatCurrency(formData.saldo_awal)} />
                                </div>
                                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                                    <InputLabel value="Pendapatan" />
                                    <input type="text" readOnly className="mt-1 block w-full bg-gray-100 dark:bg-gray-600 border-gray-300 rounded-md" value={formatCurrency(formData.pendapatan)} />
                                </div>
                            </div>

                            <div className="bg-red-50 dark:bg-red-900/10 p-4 rounded-lg border border-red-100 dark:border-red-900/30">
                                <h3 className="text-sm font-semibold mb-3 text-red-700">Rincian Belanja</h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <InputLabel value="Belanja Pegawai" />
                                        <input type="text" readOnly className="w-full bg-white dark:bg-gray-700 border-gray-300 rounded-md mt-1" value={formatCurrency(formData.belanja_pegawai)} />
                                    </div>
                                    <div>
                                        <InputLabel value="Belanja Barang dan Jasa" />
                                        <input type="text" readOnly className="w-full bg-white dark:bg-gray-700 border-gray-300 rounded-md mt-1" value={formatCurrency(formData.belanja_barang_jasa)} />
                                    </div>
                                    <div>
                                        <InputLabel value="Total Belanja Modal" />
                                        <input type="text" readOnly className="w-full bg-white dark:bg-gray-700 border-gray-300 rounded-md mt-1" value={formatCurrency(formData.belanja_modal)} />
                                    </div>
                                </div>
                            </div>

                            <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-lg border border-blue-100 dark:border-blue-900/30">
                                <h3 className="text-sm font-semibold mb-3 text-blue-700">Rincian Belanja Modal</h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <InputLabel value="Peralatan dan Mesin" />
                                        <input type="text" readOnly className="w-full bg-white dark:bg-gray-700 border-gray-300 rounded-md mt-1" value={formatCurrency(formData.belanja_modal_peralatan_mesin)} />
                                    </div>
                                    <div>
                                        <InputLabel value="Aset Tetap Lainnya" />
                                        <input type="text" readOnly className="w-full bg-white dark:bg-gray-700 border-gray-300 rounded-md mt-1" value={formatCurrency(formData.belanja_modal_aset_tetap_lainnya)} />
                                    </div>
                                    <div>
                                        <InputLabel value="Tanah dan Bangunan" />
                                        <input type="text" readOnly className="w-full bg-white dark:bg-gray-700 border-gray-300 rounded-md mt-1" value={formatCurrency(formData.belanja_modal_tanah_bangunan)} />
                                    </div>
                                </div>
                            </div>

                            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200">
                                <InputLabel value="Saldo Akhir" className="text-green-800 dark:text-green-200 font-bold" />
                                <input type="text" readOnly className="mt-1 block w-full bg-white dark:bg-gray-700 border-green-300 rounded-md font-bold text-lg text-green-700" value={formatCurrency(formData.saldo_akhir)} />
                            </div>

                        </div>

                        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-750 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-3 rounded-b-lg shrink-0">
                            <SecondaryButton onClick={() => setIsAddModalOpen(false)} disabled={isSaving}>Batal</SecondaryButton>
                            <PrimaryButton type="submit" disabled={isSaving} className="bg-blue-600 hover:bg-blue-700">Simpan</PrimaryButton>
                        </div>
                    </form>
                </div>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal show={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} maxWidth="sm">
                <div className="p-6">
                    <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">Hapus Data SP2B</h2>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Apakah Anda yakin ingin menghapus data SP2B ini?</p>
                    <div className="mt-6 flex justify-end gap-3">
                        <SecondaryButton onClick={() => setIsDeleteModalOpen(false)}>Batal</SecondaryButton>
                        <DangerButton onClick={confirmDelete}>Hapus</DangerButton>
                    </div>
                </div>
            </Modal>

            {/* Preview and Print Settings Modal -> exactly the same as SPTJ */}
            <Modal show={isPreviewModalOpen} onClose={() => setIsPreviewModalOpen(false)} maxWidth="5xl">
                <div id="sp2b-pdf-preview" className="flex flex-col h-[85vh] bg-white dark:bg-gray-900 rounded-2xl overflow-hidden relative shadow-2xl border border-gray-200 dark:border-gray-800">

                    {/* Header */}
                    <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-6 py-4 flex justify-between items-center shadow-md z-10">
                        <div className="flex items-center gap-3">
                            <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </div>
                            <h3 className="font-semibold text-lg text-white tracking-wide">Pratinjau SP2B</h3>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => {
                                    const elem = document.getElementById('sp2b-pdf-preview');
                                    if (elem) {
                                        if (!document.fullscreenElement) {
                                            elem.requestFullscreen().catch(err => console.error(err));
                                        } else {
                                            document.exitFullscreen();
                                        }
                                    }
                                }}
                                className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-all duration-200 focus:outline-none"
                                title="Fullscreen"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                                </svg>
                            </button>
                            <button
                                onClick={() => setIsPreviewModalOpen(false)}
                                className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-all duration-200 focus:outline-none"
                                title="Tutup"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    {/* PDF Container */}
                    <div className="flex-1 bg-gray-100 dark:bg-gray-950 overflow-hidden relative flex justify-center items-center p-4">
                        <div className="w-full h-full bg-white rounded-lg shadow-inner border border-gray-300 dark:border-gray-700 overflow-hidden">
                            <iframe
                                src={`${selectedPdfUrl}?font_size=${printSettings.fontSize}&paper_size=${printSettings.paperSize}`}
                                className="w-full h-full border-none bg-white rounded-lg"
                                title="PDF Preview"
                            />
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="bg-white dark:bg-gray-800 px-6 py-4 flex justify-end gap-3 border-t border-gray-200 dark:border-gray-700">
                        <button
                            onClick={() => setIsPreviewModalOpen(false)}
                            className="px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-4 focus:ring-gray-100 dark:focus:ring-gray-700 transition-all duration-200"
                        >
                            Batalkan
                        </button>
                        <button
                            onClick={() => { setIsPreviewModalOpen(false); setIsPrintSettingsModalOpen(true); }}
                            className="inline-flex items-center px-5 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-300 dark:focus:ring-blue-800 shadow-lg shadow-blue-500/30 transition-all duration-200 transform hover:-translate-y-0.5"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 -ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            Download PDF
                        </button>
                    </div>
                </div>
            </Modal>

            <Modal show={isPrintSettingsModalOpen} onClose={() => setIsPrintSettingsModalOpen(false)} maxWidth="sm">
                <div className="p-6">
                    <h2 className="mb-4 text-lg">Pengaturan Cetak</h2>
                    <div className="space-y-4">
                        <div>
                            <InputLabel value="Ukuran Kertas" />
                            <select className="w-full rounded text-gray-900" value={printSettings.paperSize} onChange={(e) => setPrintSettings({ ...printSettings, paperSize: e.target.value })}>
                                <option value="A4">A4</option>
                                <option value="Letter">Letter</option>
                                <option value="Folio">Folio</option>
                                <option value="Legal">Legal</option>
                            </select>
                        </div>
                        <div>
                            <InputLabel value="Ukuran Font" />
                            <select className="w-full rounded text-gray-900" value={printSettings.fontSize} onChange={(e) => setPrintSettings({ ...printSettings, fontSize: e.target.value })}>
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
