import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import { useState } from 'react';

import Modal from '@/Components/Modal';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import InputError from '@/Components/InputError';
import DatePicker from '@/Components/DatePicker';
import { format } from 'date-fns';
import axios from 'axios';
import { useEffect } from 'react';

export default function Index({ tahunList, penganggaranList, statusPerTahun, tahun }: any) {
    const [activeTab, setActiveTab] = useState('BOSP Reguler');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [penerimaanData, setPenerimaanData] = useState([]);
    const [currentPenganggaranId, setCurrentPenganggaranId] = useState(null);
    const [loading, setLoading] = useState(false);
    const [isValidationOpen, setIsValidationOpen] = useState(false); // Validation modal state

    // Form handling
    const { data, setData, post, processing, errors, reset, clearErrors } = useForm({
        penganggaran_id: '',
        sumber_dana: '',
        tanggal_terima: '',
        jumlah_dana: '',
        saldo_awal: '',
        tanggal_saldo_awal: ''
    });

    useEffect(() => {
        // Fetch Penganggaran ID for current year when page loads or year changes
        if (tahun) {
            fetchPenganggaranId(tahun);
        }
    }, [tahun]);

    const fetchPenganggaranId = async (selectedTahun: any) => {
        try {
            const response = await axios.get(route('penatausahaan.get-id'), {
                params: { tahun: selectedTahun }
            });
            if (response.data.penganggaran_id) {
                setCurrentPenganggaranId(response.data.penganggaran_id);
                fetchPenerimaanData(response.data.penganggaran_id);
            }
        } catch (error) {
            console.error("Error fetching penganggaran ID:", error);
        }
    };

    const fetchPenerimaanData = async (penganggaranId: any) => {
        if (!penganggaranId) return;
        setLoading(true);
        try {
            const response = await axios.get(route('penatausahaan.get-data', penganggaranId));
            setPenerimaanData(response.data);
        } catch (error) {
            console.error("Error fetching penerimaan data:", error);
        } finally {
            setLoading(false);
        }
    };

    const openModal = () => {
        setIsModalOpen(true);
        setShowCreateForm(false);
        reset();
        clearErrors();
        if (currentPenganggaranId) {
            // We need to set it AFTER reset
            setData((data) => ({ ...data, penganggaran_id: currentPenganggaranId }));
            fetchPenerimaanData(currentPenganggaranId);
        }
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setShowCreateForm(false);
        reset();
    };

    const handleCreateClick = () => {
        setShowCreateForm(true);
        // Ensure penganggaran_id is set and clear others
        setData((data) => ({
            ...data,
            penganggaran_id: currentPenganggaranId || '',
            sumber_dana: '',
            tanggal_terima: '',
            jumlah_dana: '',
            saldo_awal: '',
            tanggal_saldo_awal: ''
        }));
        clearErrors();
    };

    const handleBackToList = () => {
        setShowCreateForm(false);
        reset();
        clearErrors();
        // Re-inject penganggaran_id because reset cleared it
        setData('penganggaran_id', currentPenganggaranId || '');
    };

    const submitPenerimaan = (e: any) => {
        e.preventDefault();
        post(route('penerimaan-dana.store'), {
            onSuccess: () => {
                setShowCreateForm(false);
                fetchPenerimaanData(currentPenganggaranId);
                reset();
                setData('penganggaran_id', currentPenganggaranId || ''); // Keep ID
            },
        });
    };

    // Format currency helper
    const formatCurrency = (amount: any) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    };

    // Format date helper
    const formatDate = (dateString: any) => {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        }).format(date);
    };

    const handleCurrencyChange = (e: any, field: 'jumlah_dana' | 'saldo_awal') => {
        let value = e.target.value.replace(/[^,\d]/g, '');
        if (value) {
            const split = value.split(',');
            const sisa = split[0].length % 3;
            let rupiah = split[0].substr(0, sisa);
            const ribuan = split[0].substr(sisa).match(/\d{3}/gi);

            if (ribuan) {
                const separator = sisa ? '.' : '';
                rupiah += separator + ribuan.join('.');
            }

            rupiah = split[1] !== undefined ? rupiah + ',' + split[1] : rupiah;
            setData(field, 'Rp ' + rupiah);
        } else {
            setData(field, '');
        }
    };


    const tabs = [
        'BOSP Reguler',
        'BOSP Daerah',
        'BOSP Kinerja',
        'SiLPA BOSP Kinerja',
        'Lainnya',
    ];

    const months = [
        'Januari', 'Februari', 'Maret', 'April',
        'Mei', 'Juni', 'Juli', 'Agustus',
        'September', 'Oktober', 'November', 'Desember'
    ];

    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-semibold leading-tight text-gray-800 dark:text-gray-200">
                    Penatausahaan
                </h2>
            }
        >
            <Head title="Penatausahaan" />

            <div className="py-8">
                <div className="mx-auto w-full px-4 sm:px-6 lg:px-8">
                    {/* Tabs */}
                    {/* Modern Tabs */}
                    <div className="flex flex-wrap items-center gap-2 mb-8 p-1.5 bg-gray-100/50 dark:bg-gray-800/50 rounded-xl backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50">
                        {tabs.map((tab: any) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`
                                    relative px-6 py-2.5 rounded-lg text-sm font-bold transition-all duration-300 ease-in-out
                                    ${activeTab === tab
                                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30 ring-1 ring-white/20'
                                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-white dark:hover:bg-gray-700/50'
                                    }
                                `}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>

                    {/* Main Content Card - Gray Container */}
                    <div className="bg-gray-100 dark:bg-gray-900 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-800">

                        <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4">
                            BKU {activeTab}
                        </h3>

                        {/* Info Alert */}
                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg p-4 mb-6 flex items-start gap-3">
                            <svg className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <p className="text-sm text-blue-700 dark:text-blue-300">
                                Laporkan minimal 50% belanja dana tahap 2 paling lambat 31 Agustus setiap tahun
                            </p>
                        </div>

                        {/* Content for BOSP Reguler: Accordion List */}
                        {activeTab === 'BOSP Reguler' ? (
                            <div className="space-y-3">
                                {penganggaranList && penganggaranList.length > 0 ? (
                                    penganggaranList.map((item: any) => (
                                        <YearAccordionItem
                                            key={item.id}
                                            item={item}
                                            months={months}
                                            statusPerTahun={statusPerTahun}
                                            activeTab={activeTab}
                                            onValidation={() => setIsValidationOpen(true)}
                                            onOpenModal={(id: any) => {
                                                setCurrentPenganggaranId(id);
                                                setIsModalOpen(true);
                                                setShowCreateForm(false);
                                                reset();
                                                clearErrors();
                                                setData((data) => ({ ...data, penganggaran_id: id }));
                                                fetchPenerimaanData(id);
                                            }}
                                        />
                                    ))
                                ) : (
                                    <div className="text-center py-10 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800">
                                        <p className="text-gray-500 dark:text-gray-400">Belum ada data penganggaran.</p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                                <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-full mb-4">
                                    <svg className="w-10 h-10 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                                    </svg>
                                </div>
                                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-1">Fitur Belum Tersedia</h3>
                                <p className="text-gray-500 dark:text-gray-400 text-sm">Modul {activeTab} sedang dalam tahap pengembangan.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Modal Penerimaan Dana */}
            <Modal show={isModalOpen} onClose={closeModal} maxWidth="2xl">
                <div className="p-6">
                    <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                        {showCreateForm ? 'Catat Penerimaan Dana' : 'Tambah Penerimaan Dana'}
                    </h2>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                        {showCreateForm
                            ? 'Silakan isi form berikut untuk mencatat penerimaan dana.'
                            : 'Anda bisa melihat histori dan mencatat penerimaan dana terbaru jika ada.'
                        }
                    </p>

                    <div className="mt-6">
                        {!showCreateForm ? (
                            <>
                                {/* History List */}
                                <div className="space-y-4 mb-6">
                                    {penerimaanData.length > 0 ? (
                                        penerimaanData.map((item: any) => (
                                            <div key={item.id} className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-100 dark:border-gray-700">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <h4 className="font-semibold text-gray-800 dark:text-gray-200">
                                                            {item.sumber_dana} {new Date(item.tanggal_terima).getFullYear()}
                                                        </h4>
                                                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                                            {formatDate(item.tanggal_terima)}
                                                        </p>
                                                    </div>
                                                    <div className="flex flex-col items-end gap-2">
                                                        <div className="text-blue-600 dark:text-blue-400">
                                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                            </svg>
                                                        </div>
                                                        <span className="font-bold text-gray-900 dark:text-gray-100">
                                                            {formatCurrency(item.jumlah_dana)}
                                                        </span>
                                                    </div>
                                                </div>
                                                {item.saldo_awal && (
                                                    <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-600 text-sm">
                                                        <div className="flex justify-between text-gray-600 dark:text-gray-400">
                                                            <span>Saldo Awal ({formatDate(item.tanggal_saldo_awal)})</span>
                                                            <span>{formatCurrency(item.saldo_awal)}</span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-center text-gray-500 italic py-4">Belum ada data penerimaan dana.</p>
                                    )}
                                </div>

                                {/* Add Button Box */}
                                <div
                                    onClick={handleCreateClick}
                                    className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors flex items-center gap-3 group"
                                >
                                    <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-full group-hover:bg-white dark:group-hover:bg-gray-600 transition-colors">
                                        <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h4 className="font-medium text-gray-900 dark:text-gray-100">Tambah Penerimaan Tahap Berikutnya</h4>
                                        <p className="text-xs text-blue-500 mt-1">"Tambah Penerimaan" membutuhkan koneksi internet</p>
                                    </div>
                                </div>

                                <div className="mt-6 flex justify-end gap-3">
                                    <SecondaryButton onClick={closeModal}>Tutup</SecondaryButton>
                                    <PrimaryButton className="bg-gray-400 cursor-not-allowed opacity-50" disabled>Simpan</PrimaryButton>
                                </div>
                            </>
                        ) : (
                            /* Form View */
                            <form onSubmit={submitPenerimaan}>
                                <div className="space-y-4">
                                    <div>
                                        <InputLabel htmlFor="sumber_dana" value="Sumber Dana" />
                                        <select
                                            id="sumber_dana"
                                            className="mt-1 block w-full border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 focus:border-indigo-500 dark:focus:border-indigo-600 focus:ring-indigo-500 dark:focus:ring-indigo-600 rounded-md shadow-sm"
                                            value={data.sumber_dana}
                                            onChange={(e: any) => setData('sumber_dana', e.target.value)}
                                            required
                                        >
                                            <option value="">Pilih Sumber Dana</option>
                                            <option value="Bosp Reguler Tahap 1">Bosp Reguler Tahap 1</option>
                                            <option value="Bosp Reguler Tahap 2">Bosp Reguler Tahap 2</option>
                                        </select>
                                        <InputError message={errors.sumber_dana} className="mt-2" />
                                    </div>

                                    {data.sumber_dana === 'Bosp Reguler Tahap 1' && (
                                        <>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <InputLabel htmlFor="tanggal_terima" value="Tanggal Terima" />
                                                    <DatePicker
                                                        value={data.tanggal_terima}
                                                        onChange={(date) => setData('tanggal_terima', date ? format(date, 'yyyy-MM-dd') : '')}
                                                        className="mt-1"
                                                        placeholder="Pilih Tanggal Terima"
                                                        minDate={penganggaranList?.find((p: any) => p.id === currentPenganggaranId)?.tahun_anggaran ? new Date(parseInt(penganggaranList.find((p: any) => p.id === currentPenganggaranId).tahun_anggaran), 0, 1) : undefined}
                                                        maxDate={penganggaranList?.find((p: any) => p.id === currentPenganggaranId)?.tahun_anggaran ? new Date(parseInt(penganggaranList.find((p: any) => p.id === currentPenganggaranId).tahun_anggaran), 11, 31) : undefined}
                                                        startMonth={penganggaranList?.find((p: any) => p.id === currentPenganggaranId)?.tahun_anggaran ? new Date(parseInt(penganggaranList.find((p: any) => p.id === currentPenganggaranId).tahun_anggaran), 0) : undefined}
                                                        endMonth={penganggaranList?.find((p: any) => p.id === currentPenganggaranId)?.tahun_anggaran ? new Date(parseInt(penganggaranList.find((p: any) => p.id === currentPenganggaranId).tahun_anggaran), 11) : undefined}
                                                    />
                                                    <InputError message={errors.tanggal_terima} className="mt-2" />
                                                </div>
                                                <div>
                                                    <InputLabel htmlFor="jumlah_dana" value="Jumlah Dana" />
                                                    <TextInput
                                                        id="jumlah_dana"
                                                        type="text" // using text to handle formatting if needed, or number
                                                        className="mt-1 block w-full text-gray-900"
                                                        value={data.jumlah_dana}
                                                        onChange={(e: any) => handleCurrencyChange(e, 'jumlah_dana')}
                                                        placeholder="Rp 0"
                                                        required
                                                    />
                                                    <InputError message={errors.jumlah_dana} className="mt-2" />
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4 border-t border-gray-200 dark:border-gray-700 pt-4">
                                                <div>
                                                    <InputLabel htmlFor="tanggal_saldo_awal" value="Tanggal Saldo Awal" />
                                                    <DatePicker
                                                        value={data.tanggal_saldo_awal}
                                                        onChange={(date) => setData('tanggal_saldo_awal', date ? format(date, 'yyyy-MM-dd') : '')}
                                                        className="mt-1"
                                                        placeholder="Pilih Tanggal Saldo Awal"
                                                        minDate={penganggaranList?.find((p: any) => p.id === currentPenganggaranId)?.tahun_anggaran ? new Date(parseInt(penganggaranList.find((p: any) => p.id === currentPenganggaranId).tahun_anggaran), 0, 1) : undefined}
                                                        maxDate={penganggaranList?.find((p: any) => p.id === currentPenganggaranId)?.tahun_anggaran ? new Date(parseInt(penganggaranList.find((p: any) => p.id === currentPenganggaranId).tahun_anggaran), 11, 31) : undefined}
                                                        startMonth={penganggaranList?.find((p: any) => p.id === currentPenganggaranId)?.tahun_anggaran ? new Date(parseInt(penganggaranList.find((p: any) => p.id === currentPenganggaranId).tahun_anggaran), 0) : undefined}
                                                        endMonth={penganggaranList?.find((p: any) => p.id === currentPenganggaranId)?.tahun_anggaran ? new Date(parseInt(penganggaranList.find((p: any) => p.id === currentPenganggaranId).tahun_anggaran), 11) : undefined}
                                                    />
                                                    <InputError message={errors.tanggal_saldo_awal} className="mt-2" />
                                                </div>
                                                <div>
                                                    <InputLabel htmlFor="saldo_awal" value="Jumlah Saldo Awal" />
                                                    <TextInput
                                                        id="saldo_awal"
                                                        type="text"
                                                        className="mt-1 block w-full text-gray-900"
                                                        value={data.saldo_awal}
                                                        onChange={(e: any) => handleCurrencyChange(e, 'saldo_awal')}
                                                        placeholder="Rp 0"
                                                    />
                                                    <InputError message={errors.saldo_awal} className="mt-2" />
                                                </div>
                                            </div>
                                        </>
                                    )}

                                    {data.sumber_dana === 'Bosp Reguler Tahap 2' && (
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <InputLabel htmlFor="tanggal_terima" value="Tanggal Terima" />
                                                <DatePicker
                                                    value={data.tanggal_terima}
                                                    onChange={(date) => setData('tanggal_terima', date ? format(date, 'yyyy-MM-dd') : '')}
                                                    className="mt-1"
                                                    placeholder="Pilih Tanggal Terima"
                                                    minDate={penganggaranList?.find((p: any) => p.id === currentPenganggaranId)?.tahun_anggaran ? new Date(parseInt(penganggaranList.find((p: any) => p.id === currentPenganggaranId).tahun_anggaran), 0, 1) : undefined}
                                                    maxDate={penganggaranList?.find((p: any) => p.id === currentPenganggaranId)?.tahun_anggaran ? new Date(parseInt(penganggaranList.find((p: any) => p.id === currentPenganggaranId).tahun_anggaran), 11, 31) : undefined}
                                                    startMonth={penganggaranList?.find((p: any) => p.id === currentPenganggaranId)?.tahun_anggaran ? new Date(parseInt(penganggaranList.find((p: any) => p.id === currentPenganggaranId).tahun_anggaran), 0) : undefined}
                                                    endMonth={penganggaranList?.find((p: any) => p.id === currentPenganggaranId)?.tahun_anggaran ? new Date(parseInt(penganggaranList.find((p: any) => p.id === currentPenganggaranId).tahun_anggaran), 11) : undefined}
                                                />
                                                <InputError message={errors.tanggal_terima} className="mt-2" />
                                            </div>
                                            <div>
                                                <InputLabel htmlFor="jumlah_dana" value="Jumlah Dana" />
                                                <TextInput
                                                    id="jumlah_dana"
                                                    type="text"
                                                    className="mt-1 block w-full text-gray-900"
                                                    value={data.jumlah_dana}
                                                    onChange={(e: any) => handleCurrencyChange(e, 'jumlah_dana')}
                                                    placeholder="Rp 0"
                                                    required
                                                />
                                                <InputError message={errors.jumlah_dana} className="mt-2" />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="mt-6 flex justify-end gap-3">
                                    <SecondaryButton onClick={handleBackToList} disabled={processing}>Kembali</SecondaryButton>
                                    <PrimaryButton disabled={processing} className={processing ? 'opacity-25' : ''}>
                                        {processing ? 'Menyimpan...' : 'Simpan'}
                                    </PrimaryButton>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            </Modal>

            {/* Modal Validasi Tahap 2 */}
            <Modal show={isValidationOpen} onClose={() => setIsValidationOpen(false)} maxWidth="md">
                <div className="p-6 text-center">
                    <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/20 mb-4">
                        <svg className="h-6 w-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Penerimaan Dana Tahap 2 Belum Ada</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                        Silahkan Isi Penerimaan Dana Tahap 2 Terlebih Dahulu Untuk Masuk Pada Bku Bulan Juli
                    </p>
                    <div className="flex justify-center">
                        <PrimaryButton onClick={() => setIsValidationOpen(false)}>
                            Mengerti
                        </PrimaryButton>
                    </div>
                </div>
            </Modal>
        </AuthenticatedLayout>
    );
}

const YearAccordionItem = ({ item, months, statusPerTahun, activeTab, onOpenModal, onValidation }: any) => {
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        const currentYear = new Date().getFullYear();
        if (parseInt(item.tahun_anggaran) === currentYear) {
            setIsOpen(true);
        }
    }, [item.tahun_anggaran]);

    const tahap2Months = ['Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

    return (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden shadow-sm hover:shadow dark:shadow-gray-900/10 transition-all duration-200">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                aria-expanded={isOpen}
            >
                <div className="flex items-center gap-3">
                    <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="font-semibold text-gray-700 dark:text-gray-200">
                        BKU Tahun Anggaran {item.tahun_anggaran}
                    </span>
                </div>
                <div className={`text-gray-400 transform transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </div>
            </button>

            <div className={`transition-all duration-300 ease-in-out ${isOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}>
                <div className="p-6 border-t border-gray-100 dark:border-gray-700">

                    {/* Header with Buttons INSIDE Accordion */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                        <h4 className="text-lg font-bold text-gray-800 dark:text-gray-100 hidden md:block">
                            {/* Intentionally header might be redundant here if user wants a clean list, but user said "ada card bulan tombol cetak dan tambah". 
                               We can keep it clean or add a sub-guidance. Let's keep buttons prominent. */}
                        </h4>
                        <div className="flex items-center gap-3 w-full md:w-auto">
                            <Link
                                href={route('penatausahaan.rekapitulasi', { tahun: item.tahun_anggaran, bulan: 'januari' })}
                                className="flex-1 md:flex-none inline-flex justify-center items-center px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md font-semibold text-xs text-gray-700 dark:text-gray-300 uppercase tracking-widest shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition ease-in-out duration-150"
                            >
                                <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                </svg>
                                Cetak
                            </Link>
                            <button
                                onClick={() => onOpenModal(item.id)}
                                className="flex-1 md:flex-none inline-flex justify-center items-center px-4 py-2 bg-blue-600 border border-transparent rounded-md font-semibold text-xs text-white uppercase tracking-widest hover:bg-blue-700 focus:bg-blue-700 active:bg-blue-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition ease-in-out duration-150"
                            >
                                <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                Tambah Penerimaan Dana
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {months.map((month: any) => {
                            const status = statusPerTahun?.[item.tahun_anggaran]?.[month] || 'disabled'; // Default to disabled if unknown
                            const isDisabled = status === 'disabled';

                            const isTahap2 = tahap2Months.includes(month);

                            const handleClick = (e: any) => {
                                if (isDisabled) {
                                    e.preventDefault();
                                    return;
                                }
                                if (isTahap2 && !item.has_tahap_2) {
                                    e.preventDefault();
                                    onValidation();
                                }
                            };

                            return (
                                <Link
                                    key={month}
                                    href={isDisabled ? '#' : route('penatausahaan.bku', { tahun: item.tahun_anggaran, bulan: month })}
                                    className={`group relative bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 flex flex-col items-center justify-center shadow-sm hover:shadow-md transition-all duration-200 
                                            ${isDisabled
                                            ? 'opacity-50 cursor-not-allowed grayscale'
                                            : 'hover:border-blue-300 dark:hover:border-blue-700'
                                        }`}
                                    onClick={handleClick}
                                >
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className={`p-1.5 rounded-full text-gray-500 transition-colors
                                            ${isDisabled
                                                ? 'bg-gray-100 dark:bg-gray-700'
                                                : 'bg-gray-100 dark:bg-gray-700 group-hover:text-blue-600'
                                            }`}>
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                        </div>
                                        <span className={`font-medium transition-colors
                                            ${isDisabled
                                                ? 'text-gray-400 dark:text-gray-500'
                                                : 'text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white'
                                            }`}>
                                            {month}
                                        </span>
                                    </div>

                                    {status === 'closed' && (
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                                            Selesai
                                        </span>
                                    )}
                                    {status === 'lapor_pajak' && (
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                                            Belum Lapor Pajak
                                        </span>
                                    )}
                                    {status === 'draft' && (
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
                                            Draft
                                        </span>
                                    )}
                                    {status === 'empty' && (
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                                            Belum di isi
                                        </span>
                                    )}
                                    {status === 'disabled' && (
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400">
                                            Terkunci
                                        </span>
                                    )}
                                </Link>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};
