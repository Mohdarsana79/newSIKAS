import { useState, useEffect } from 'react';
import Modal from '@/Components/Modal';
import SearchableSelect from '@/Components/SearchableSelect';
import axios from 'axios';
import useVariantRoute from '@/Hooks/useVariantRoute';

interface ModalFormBastProps {
    show: boolean;
    onClose: () => void;
    onSuccess: () => void;
    tahun: string;
    years: {tahun_anggaran: string, id: number}[];
    editData: any | null;
}

export default function ModalFormBast({ show, onClose, onSuccess, tahun, years, editData }: ModalFormBastProps) {
    const vroute = useVariantRoute();
    const [bkuOptions, setBkuOptions] = useState<any[]>([]);
    const [loadingBku, setLoadingBku] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [modalTahun, setModalTahun] = useState('');
    const [modalTahap, setModalTahap] = useState('');

    const [data, setData] = useState({
        bku_id: '',
        nomor_bast: '',
        tanggal_bast: '',
        pihak_pertama_nama: '',
        pihak_pertama_jabatan: '',
        pihak_pertama_instansi: '',
        pihak_pertama_alamat: '',
        pihak_kedua_nama: '',
        pihak_kedua_jabatan: '',
        pihak_kedua_instansi: '',
        pihak_kedua_alamat: ''
    });

    useEffect(() => {
        if (show) {
            if (editData) {
                // Determine BKU ID based on variant if it's already set
                const bkuFk = editData.kinerja_silpa_buku_kas_umum_id || editData.silpa_buku_kas_umum_id || editData.kinerja_buku_kas_umum_id || editData.buku_kas_umum_id;
                
                setData({
                    bku_id: bkuFk || '',
                    nomor_bast: editData.nomor_bast || '',
                    tanggal_bast: editData.tanggal_bast_raw || editData.tanggal || '',
                    pihak_pertama_nama: editData.pihak_pertama_nama || '',
                    pihak_pertama_jabatan: editData.pihak_pertama_jabatan || '',
                    pihak_pertama_instansi: editData.pihak_pertama_instansi || '',
                    pihak_pertama_alamat: editData.pihak_pertama_alamat || '',
                    pihak_kedua_nama: editData.pihak_kedua_nama || '',
                    pihak_kedua_jabatan: editData.pihak_kedua_jabatan || '',
                    pihak_kedua_instansi: editData.pihak_kedua_instansi || '',
                    pihak_kedua_alamat: editData.pihak_kedua_alamat || ''
                });
            } else {
                setData({
                    bku_id: '',
                    nomor_bast: '',
                    tanggal_bast: '',
                    pihak_pertama_nama: '',
                    pihak_pertama_jabatan: 'Pimpinan',
                    pihak_pertama_instansi: '',
                    pihak_pertama_alamat: '',
                    pihak_kedua_nama: '',
                    pihak_kedua_jabatan: 'Kepala Sekolah',
                    pihak_kedua_instansi: 'Sekolah',
                    pihak_kedua_alamat: ''
                });
                if (tahun && !modalTahun) setModalTahun(tahun);
            }
        }
    }, [show, editData, tahun]);

    useEffect(() => {
        if (show && !editData && modalTahun) {
            fetchAvailableBku();
        }
    }, [show, editData, modalTahun, modalTahap]);

    const fetchAvailableBku = async () => {
        setLoadingBku(true);
        try {
            const res = await axios.get(vroute('api.bast.bku-available'), { params: { tahun: modalTahun, tahap: modalTahap } });
            if (res.data.success) {
                setBkuOptions(res.data.data);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingBku(false);
        }
    };

    const handleBkuChange = (id: string | number) => {
        const selected = bkuOptions.find(b => b.id == id);
        if (selected) {
            setData({
                ...data,
                bku_id: id.toString(),
                tanggal_bast: selected.tanggal,
                pihak_pertama_nama: selected.pihak_pertama_nama,
                pihak_pertama_instansi: selected.pihak_pertama_instansi,
                pihak_pertama_alamat: selected.pihak_pertama_alamat,
                pihak_kedua_nama: selected.pihak_kedua_nama,
                pihak_kedua_instansi: selected.pihak_kedua_instansi,
                pihak_kedua_alamat: selected.pihak_kedua_alamat
            });
        } else {
            setData({ ...data, bku_id: id.toString() });
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setProcessing(true);
        try {
            const bkuFk = vroute('bast.store').includes('kinerja-silpa') ? 'kinerja_silpa_buku_kas_umum_id' :
                          vroute('bast.store').includes('silpa') ? 'silpa_buku_kas_umum_id' :
                          vroute('bast.store').includes('kinerja') ? 'kinerja_buku_kas_umum_id' : 'buku_kas_umum_id';
            
            const payload = {
                ...data,
                [bkuFk]: data.bku_id
            };

            let res;
            if (editData) {
                res = await axios.put(vroute('bast.update', { id: editData.id }), payload);
            } else {
                res = await axios.post(vroute('bast.store'), payload);
            }

            if (res.data.success) {
                window.dispatchEvent(new CustomEvent('toast-notification', { detail: { message: res.data.message, type: 'success' } }));
                onSuccess();
                onClose();
            }
        } catch (error: any) {
            window.dispatchEvent(new CustomEvent('toast-notification', { detail: { message: error.response?.data?.message || 'Terjadi kesalahan', type: 'error' } }));
        } finally {
            setProcessing(false);
        }
    };

    return (
        <Modal show={show} onClose={onClose} maxWidth="4xl">
            <div className="p-6 max-h-[85vh] overflow-y-auto">
                <h2 className="text-xl font-bold mb-6 text-gray-900 dark:text-gray-100">
                    {editData ? 'Edit BAST' : 'Tambah BAST Baru'}
                </h2>
                
                <form onSubmit={handleSubmit} className="space-y-6 overflow-visible">
                    {!editData && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Tahun Anggaran
                                    </label>
                                    <select
                                        className="w-full rounded-md border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                        value={modalTahun}
                                        onChange={e => setModalTahun(e.target.value)}
                                    >
                                        <option value="">Semua Tahun</option>
                                        {years.map(y => (
                                            <option key={y.id} value={y.tahun_anggaran}>{y.tahun_anggaran}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Tahap
                                    </label>
                                    <select
                                        className="w-full rounded-md border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                        value={modalTahap}
                                        onChange={e => setModalTahap(e.target.value)}
                                    >
                                        <option value="">Semua Tahap</option>
                                        <option value="Tahap 1">Tahap 1 (Januari - Juni)</option>
                                        <option value="Tahap 2">Tahap 2 (Juli - Desember)</option>
                                    </select>
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Pilih Transaksi (BKU) <span className="text-red-500">*</span>
                                </label>
                                <SearchableSelect
                                value={data.bku_id}
                                onChange={handleBkuChange}
                                options={bkuOptions.map(b => ({
                                    ...b,
                                    nominal_formatted: 'Rp ' + b.nominal.toLocaleString('id-ID')
                                }))}
                                searchFields={['tanggal', 'uraian', 'nominal_formatted']}
                                displayColumns={[
                                    { header: 'Tanggal', field: 'tanggal', width: 'w-24 flex-none' },
                                    { header: 'Anggaran', field: 'nominal_formatted', width: 'w-32 flex-none' },
                                    { header: 'Uraian BKU', field: 'uraian', width: 'flex-1' }
                                ]}
                                labelRenderer={(opt) => `${opt.tanggal} - ${opt.nominal_formatted} - ${opt.uraian}`}
                                placeholder="-- Cari Transaksi --"
                            />
                            {loadingBku && <p className="text-sm text-gray-500 mt-1">Memuat transaksi BKU...</p>}
                        </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nomor BAST</label>
                            <input
                                type="text"
                                className="w-full rounded-md border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                value={data.nomor_bast}
                                onChange={e => setData({...data, nomor_bast: e.target.value})}
                                placeholder="Masukkan nomor (opsional)"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tanggal BAST</label>
                            <input
                                type="date"
                                className="w-full rounded-md border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                value={data.tanggal_bast}
                                onChange={e => setData({...data, tanggal_bast: e.target.value})}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <div className="space-y-4">
                            <h3 className="font-semibold text-lg text-gray-800 dark:text-gray-200">Pihak Pertama (Yang Menyerahkan)</h3>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nama / Pimpinan</label>
                                <input
                                    type="text"
                                    className="w-full rounded-md border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                    value={data.pihak_pertama_nama}
                                    onChange={e => setData({...data, pihak_pertama_nama: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Jabatan</label>
                                <input
                                    type="text"
                                    className="w-full rounded-md border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                    value={data.pihak_pertama_jabatan}
                                    onChange={e => setData({...data, pihak_pertama_jabatan: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Instansi / Toko</label>
                                <input
                                    type="text"
                                    className="w-full rounded-md border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                    value={data.pihak_pertama_instansi}
                                    onChange={e => setData({...data, pihak_pertama_instansi: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Alamat</label>
                                <textarea
                                    className="w-full rounded-md border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                    rows={2}
                                    value={data.pihak_pertama_alamat}
                                    onChange={e => setData({...data, pihak_pertama_alamat: e.target.value})}
                                ></textarea>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h3 className="font-semibold text-lg text-gray-800 dark:text-gray-200">Pihak Kedua (Yang Menerima)</h3>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nama</label>
                                <input
                                    type="text"
                                    className="w-full rounded-md border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                    value={data.pihak_kedua_nama}
                                    onChange={e => setData({...data, pihak_kedua_nama: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Jabatan</label>
                                <input
                                    type="text"
                                    className="w-full rounded-md border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                    value={data.pihak_kedua_jabatan}
                                    onChange={e => setData({...data, pihak_kedua_jabatan: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Instansi / Sekolah</label>
                                <input
                                    type="text"
                                    className="w-full rounded-md border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                    value={data.pihak_kedua_instansi}
                                    onChange={e => setData({...data, pihak_kedua_instansi: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Alamat</label>
                                <textarea
                                    className="w-full rounded-md border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                    rows={2}
                                    value={data.pihak_kedua_alamat}
                                    onChange={e => setData({...data, pihak_kedua_alamat: e.target.value})}
                                ></textarea>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-6">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                            disabled={processing}
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                            disabled={processing || (!editData && !data.bku_id)}
                        >
                            {processing ? 'Menyimpan...' : 'Simpan BAST'}
                        </button>
                    </div>
                </form>
            </div>
        </Modal>
    );
}
