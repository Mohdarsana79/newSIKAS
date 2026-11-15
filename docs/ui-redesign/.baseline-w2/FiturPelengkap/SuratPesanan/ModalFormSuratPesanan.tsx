import { useState, useEffect } from 'react';
import Modal from '@/Components/Modal';
import SearchableSelect from '@/Components/SearchableSelect';
import axios from 'axios';
import useVariantRoute from '@/Hooks/useVariantRoute';

interface ModalFormSuratPesananProps {
    show: boolean;
    onClose: () => void;
    onSuccess: () => void;
    tahun: string;
    years: {tahun_anggaran: string, id: number}[];
    editData: any | null;
}

export default function ModalFormSuratPesanan({ show, onClose, onSuccess, tahun, years, editData }: ModalFormSuratPesananProps) {
    const vroute = useVariantRoute();
    const [bkuOptions, setBkuOptions] = useState<any[]>([]);
    const [loadingBku, setLoadingBku] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [modalTahun, setModalTahun] = useState('');
    const [modalTahap, setModalTahap] = useState('');
    const [activeTab, setActiveTab] = useState('umum'); // 'umum', 'kesatu', 'kedua', 'ketentuan'

    const [data, setData] = useState({
        bku_id: '',
        nomor_sp: '',
        tanggal_sp: '',
        pihak_kesatu_nama: '',
        pihak_kesatu_nip: '',
        pihak_kesatu_jabatan: '',
        pihak_kesatu_instansi: '',
        pihak_kesatu_alamat: '',
        pihak_kedua_nama_perusahaan: '',
        pihak_kedua_penanggung_jawab: '',
        pihak_kedua_alamat: '',
        pihak_kedua_npwp: '',
        pihak_kedua_platform: '',
        waktu_pengiriman: '',
        kondisi_barang: '',
        ketentuan_pembayaran: '',
        sumber_dana: ''
    });

    useEffect(() => {
        if (show) {
            setActiveTab('umum');
            if (editData) {
                const bkuFk = editData.kinerja_silpa_buku_kas_umum_id || editData.silpa_buku_kas_umum_id || editData.kinerja_buku_kas_umum_id || editData.buku_kas_umum_id;
                
                setData({
                    bku_id: bkuFk || '',
                    nomor_sp: editData.nomor_sp || '',
                    tanggal_sp: editData.tanggal_sp_raw || editData.tanggal || '',
                    pihak_kesatu_nama: editData.pihak_kesatu_nama || '',
                    pihak_kesatu_nip: editData.pihak_kesatu_nip || '',
                    pihak_kesatu_jabatan: editData.pihak_kesatu_jabatan || '',
                    pihak_kesatu_instansi: editData.pihak_kesatu_instansi || '',
                    pihak_kesatu_alamat: editData.pihak_kesatu_alamat || '',
                    pihak_kedua_nama_perusahaan: editData.pihak_kedua_nama_perusahaan || '',
                    pihak_kedua_penanggung_jawab: editData.pihak_kedua_penanggung_jawab || '',
                    pihak_kedua_alamat: editData.pihak_kedua_alamat || '',
                    pihak_kedua_npwp: editData.pihak_kedua_npwp || '',
                    pihak_kedua_platform: editData.pihak_kedua_platform || '',
                    waktu_pengiriman: editData.waktu_pengiriman || '',
                    kondisi_barang: editData.kondisi_barang || '',
                    ketentuan_pembayaran: editData.ketentuan_pembayaran || '',
                    sumber_dana: editData.sumber_dana || ''
                });
            } else {
                setData({
                    bku_id: '',
                    nomor_sp: '',
                    tanggal_sp: '',
                    pihak_kesatu_nama: '',
                    pihak_kesatu_nip: '',
                    pihak_kesatu_jabatan: 'Kepala Sekolah',
                    pihak_kesatu_instansi: 'Sekolah',
                    pihak_kesatu_alamat: '',
                    pihak_kedua_nama_perusahaan: '',
                    pihak_kedua_penanggung_jawab: 'Pimpinan',
                    pihak_kedua_alamat: '',
                    pihak_kedua_npwp: '',
                    pihak_kedua_platform: '',
                    waktu_pengiriman: 'Barang harus dikirimkan selambat-lambatnya setelah Surat Pesanan ini disetujui.',
                    kondisi_barang: 'Barang yang dikirim harus dalam keadaan baru, tidak cacat, dan sesuai dengan spesifikasi yang tertera. PIHAK KESATU berhak menolak barang yang tidak sesuai.',
                    ketentuan_pembayaran: 'Pembayaran akan ditransfer ke rekening PIHAK KEDUA setelah seluruh barang diterima dengan baik yang dibuktikan dengan penandatanganan Berita Acara Serah Terima (BAST).',
                    sumber_dana: 'Pembiayaan pengadaan barang ini dibebankan pada dana Bantuan Operasional Satuan Pendidikan (BOSP) Tahun Anggaran ' + (tahun || new Date().getFullYear()) + '.'
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
            const res = await axios.get(vroute('api.surat-pesanan.bku-available'), { params: { tahun: modalTahun, tahap: modalTahap } });
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
                tanggal_sp: selected.tanggal,
                pihak_kesatu_nama: selected.pihak_kesatu_nama,
                pihak_kesatu_instansi: selected.pihak_kesatu_instansi,
                pihak_kesatu_alamat: selected.pihak_kesatu_alamat,
                pihak_kedua_nama_perusahaan: selected.pihak_kedua_nama_perusahaan,
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
            const bkuFk = vroute('surat-pesanan.store').includes('kinerja-silpa') ? 'kinerja_silpa_buku_kas_umum_id' :
                          vroute('surat-pesanan.store').includes('silpa') ? 'silpa_buku_kas_umum_id' :
                          vroute('surat-pesanan.store').includes('kinerja') ? 'kinerja_buku_kas_umum_id' : 'buku_kas_umum_id';
            
            const payload = {
                ...data,
                [bkuFk]: data.bku_id
            };

            let res;
            if (editData) {
                res = await axios.put(vroute('surat-pesanan.update', { id: editData.id }), payload);
            } else {
                res = await axios.post(vroute('surat-pesanan.store'), payload);
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
            <div className="p-6 max-h-[85vh] flex flex-col">
                <h2 className="text-xl font-bold mb-6 text-gray-900 dark:text-gray-100">
                    {editData ? 'Edit Surat Pesanan' : 'Tambah Surat Pesanan Baru'}
                </h2>
                
                {/* Tabs Navigation */}
                <div className="flex space-x-2 border-b border-gray-200 dark:border-gray-700 mb-6 flex-wrap">
                    {[
                        { id: 'umum', label: 'Info Umum' },
                        { id: 'kesatu', label: 'Pihak Kesatu (Sekolah)' },
                        { id: 'kedua', label: 'Pihak Kedua (Toko)' },
                        { id: 'ketentuan', label: 'Ketentuan' }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => setActiveTab(tab.id)}
                            className={`py-2 px-4 text-sm font-medium border-b-2 outline-none ${activeTab === tab.id ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'}`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="flex-1 overflow-y-auto pr-2 pb-4">
                    <form id="sp-form" onSubmit={handleSubmit} className="space-y-6">
                        
                        {activeTab === 'umum' && (
                            <div className="space-y-6">
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
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nomor Surat Pesanan</label>
                                        <input
                                            type="text"
                                            className="w-full rounded-md border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                            value={data.nomor_sp}
                                            onChange={e => setData({...data, nomor_sp: e.target.value})}
                                            placeholder="Masukkan nomor (opsional)"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tanggal Surat Pesanan</label>
                                        <input
                                            type="date"
                                            className="w-full rounded-md border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                            value={data.tanggal_sp}
                                            onChange={e => setData({...data, tanggal_sp: e.target.value})}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'kesatu' && (
                            <div className="space-y-4">
                                <h3 className="font-semibold text-lg text-gray-800 dark:text-gray-200">Pihak Kesatu (Sekolah / Pemesan)</h3>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nama</label>
                                    <input
                                        type="text"
                                        className="w-full rounded-md border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                        value={data.pihak_kesatu_nama}
                                        onChange={e => setData({...data, pihak_kesatu_nama: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">NIP (Opsional)</label>
                                    <input
                                        type="text"
                                        className="w-full rounded-md border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                        value={data.pihak_kesatu_nip}
                                        onChange={e => setData({...data, pihak_kesatu_nip: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Jabatan</label>
                                    <input
                                        type="text"
                                        className="w-full rounded-md border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                        value={data.pihak_kesatu_jabatan}
                                        onChange={e => setData({...data, pihak_kesatu_jabatan: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Instansi / Sekolah</label>
                                    <input
                                        type="text"
                                        className="w-full rounded-md border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                        value={data.pihak_kesatu_instansi}
                                        onChange={e => setData({...data, pihak_kesatu_instansi: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Alamat</label>
                                    <textarea
                                        className="w-full rounded-md border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                        rows={2}
                                        value={data.pihak_kesatu_alamat}
                                        onChange={e => setData({...data, pihak_kesatu_alamat: e.target.value})}
                                    ></textarea>
                                </div>
                            </div>
                        )}

                        {activeTab === 'kedua' && (
                            <div className="space-y-4">
                                <h3 className="font-semibold text-lg text-gray-800 dark:text-gray-200">Pihak Kedua (Toko / Penyedia)</h3>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nama Perusahaan / Toko</label>
                                    <input
                                        type="text"
                                        className="w-full rounded-md border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                        value={data.pihak_kedua_nama_perusahaan}
                                        onChange={e => setData({...data, pihak_kedua_nama_perusahaan: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Penanggung Jawab / Pemilik</label>
                                    <input
                                        type="text"
                                        className="w-full rounded-md border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                        value={data.pihak_kedua_penanggung_jawab}
                                        onChange={e => setData({...data, pihak_kedua_penanggung_jawab: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Alamat Toko</label>
                                    <textarea
                                        className="w-full rounded-md border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                        rows={2}
                                        value={data.pihak_kedua_alamat}
                                        onChange={e => setData({...data, pihak_kedua_alamat: e.target.value})}
                                    ></textarea>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">NPWP (Opsional)</label>
                                        <input
                                            type="text"
                                            className="w-full rounded-md border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                            value={data.pihak_kedua_npwp}
                                            onChange={e => setData({...data, pihak_kedua_npwp: e.target.value})}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Platform (SIPLah, dll) - Opsional</label>
                                        <input
                                            type="text"
                                            className="w-full rounded-md border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                            value={data.pihak_kedua_platform}
                                            onChange={e => setData({...data, pihak_kedua_platform: e.target.value})}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'ketentuan' && (
                            <div className="space-y-4">
                                <h3 className="font-semibold text-lg text-gray-800 dark:text-gray-200">Syarat dan Ketentuan</h3>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Waktu Pengiriman</label>
                                    <textarea
                                        className="w-full rounded-md border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                        rows={2}
                                        value={data.waktu_pengiriman}
                                        onChange={e => setData({...data, waktu_pengiriman: e.target.value})}
                                    ></textarea>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Kondisi Barang</label>
                                    <textarea
                                        className="w-full rounded-md border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                        rows={2}
                                        value={data.kondisi_barang}
                                        onChange={e => setData({...data, kondisi_barang: e.target.value})}
                                    ></textarea>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ketentuan Pembayaran</label>
                                    <textarea
                                        className="w-full rounded-md border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                        rows={2}
                                        value={data.ketentuan_pembayaran}
                                        onChange={e => setData({...data, ketentuan_pembayaran: e.target.value})}
                                    ></textarea>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Sumber Dana</label>
                                    <textarea
                                        className="w-full rounded-md border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                        rows={2}
                                        value={data.sumber_dana}
                                        onChange={e => setData({...data, sumber_dana: e.target.value})}
                                    ></textarea>
                                </div>
                            </div>
                        )}
                    </form>
                </div>
                
                <div className="flex justify-end gap-3 pt-6 border-t border-gray-200 dark:border-gray-700 mt-auto">
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
                        form="sp-form"
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                        disabled={processing || (!editData && !data.bku_id)}
                    >
                        {processing ? 'Menyimpan...' : 'Simpan Surat Pesanan'}
                    </button>
                </div>
            </div>
        </Modal>
    );
}
