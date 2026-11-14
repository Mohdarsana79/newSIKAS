import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import Modal from '@/Components/Modal';
import DatePicker from '@/Components/DatePicker';
import SearchableSelect from '@/Components/SearchableSelect';
import axios from 'axios';
import useVariantRoute from '@/Hooks/useVariantRoute';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import TextInput from '@/Components/TextInput';
import InputLabel from '@/Components/InputLabel';
import IconTile from '@/Components/ui/IconTile';

interface ModalFormSuratPesananProps {
    show: boolean;
    onClose: () => void;
    onSuccess: () => void;
    tahun: string;
    years: {tahun_anggaran: string, id: number}[];
    editData: any | null;
}

const SELECT_CLASS =
    'w-full rounded-xl border border-slate-200/90 bg-white px-3.5 py-2.5 text-[12px] font-semibold text-slate-800 shadow-sm transition focus:border-lime-400 focus:outline-none focus:ring-4 focus:ring-lime-200/60 dark:border-white/10 dark:bg-slate-900 dark:text-white dark:focus:border-lime-400/70 dark:focus:ring-lime-400/10';

const TEXTAREA_CLASS =
    'w-full rounded-xl border border-slate-200/90 bg-white px-3.5 py-2.5 text-[12px] font-semibold text-slate-800 shadow-sm transition placeholder:text-slate-400 focus:border-lime-400 focus:outline-none focus:ring-4 focus:ring-lime-200/60 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-lime-400/70 dark:focus:ring-lime-400/10';

const SECTION_CLASS =
    'rounded-2xl border border-slate-100 bg-slate-50/60 p-4 dark:border-white/10 dark:bg-white/[0.03]';

const SECTION_TITLE_CLASS =
    'text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400';

/** Normalize raw backend date fields (Y-m-d or d/m/Y) to yyyy-MM-dd for DatePicker. */
function normalizeInitialDate(editData: { tanggal_sp_raw?: string; tanggal?: string } | null): string {
    if (!editData) return '';
    if (editData.tanggal_sp_raw) {
        return editData.tanggal_sp_raw.split(/[ T]/)[0];
    }
    if (editData.tanggal) {
        const slashMatch = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(editData.tanggal);
        if (slashMatch) {
            const [, d, m, y] = slashMatch;
            return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
        }
        return editData.tanggal.split(/[ T]/)[0];
    }
    return '';
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
                    tanggal_sp: normalizeInitialDate(editData),
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
            setData((prev) => ({
                ...prev,
                bku_id: id.toString(),
                tanggal_sp: selected.tanggal,
                pihak_kesatu_nama: selected.pihak_kesatu_nama,
                pihak_kesatu_nip: selected.pihak_kesatu_nip ?? '',
                pihak_kesatu_instansi: selected.pihak_kesatu_instansi,
                pihak_kesatu_alamat: selected.pihak_kesatu_alamat,
                pihak_kedua_nama_perusahaan: selected.pihak_kedua_nama_perusahaan,
                pihak_kedua_alamat: selected.pihak_kedua_alamat
            }));
        } else {
            setData((prev) => ({ ...prev, bku_id: id.toString() }));
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
            <div className="relative flex max-h-[88vh] flex-col overflow-hidden">
                <div className="pointer-events-none absolute -right-16 -top-24 h-56 w-56 rounded-full bg-brand-500/10 blur-3xl" />
                <div className="pointer-events-none absolute -left-20 top-28 h-48 w-48 rounded-full bg-lime-400/10 blur-3xl" />

                <div className="relative flex shrink-0 items-center gap-3 border-b border-slate-100 px-6 py-4 dark:border-white/5">
                    <IconTile tone={editData ? 'amber' : 'violet'} size="md">
                        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                    </IconTile>
                    <div className="min-w-0">
                        <h2 className="truncate text-[15px] font-extrabold tracking-tight text-slate-900 dark:text-white">
                            {editData ? 'Edit Surat Pesanan' : 'Tambah Surat Pesanan Baru'}
                        </h2>
                        <p className="truncate text-[10px] font-medium text-slate-400 dark:text-slate-500">
                            Lengkapi data surat pesanan pengadaan barang.
                        </p>
                    </div>
                </div>

                {/* Tabs Navigation */}
                <div className="relative shrink-0 border-b border-slate-100 px-6 py-3 dark:border-white/5">
                    <div
                        role="tablist"
                        aria-label="Bagian formulir Surat Pesanan"
                        className="flex items-center gap-1 overflow-x-auto p-0.5"
                    >
                        {[
                            { id: 'umum', label: 'Info Umum' },
                            { id: 'kesatu', label: 'Pihak Kesatu (Sekolah)' },
                            { id: 'kedua', label: 'Pihak Kedua (Toko)' },
                            { id: 'ketentuan', label: 'Ketentuan' }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                type="button"
                                role="tab"
                                aria-selected={activeTab === tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2 text-[11px] font-bold transition-all duration-200 ${
                                    activeTab === tab.id
                                        ? 'bg-lime-200 text-slate-900 ring-1 ring-lime-300/70 dark:bg-lime-400/15 dark:text-lime-300 dark:ring-lime-400/25'
                                        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-white'
                                }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="sikas-scroll relative min-h-0 flex-1 overflow-y-auto px-6 py-5">
                    <form id="sp-form" onSubmit={handleSubmit} className="space-y-4">
                        
                        {activeTab === 'umum' && (
                            <div className="space-y-4">
                                {!editData && (
                                    <div className={SECTION_CLASS}>
                                        <div className="mb-3.5 flex items-center gap-2.5">
                                            <IconTile tone="sky" size="sm">
                                                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7h16M4 12h16M4 17h10" />
                                                </svg>
                                            </IconTile>
                                            <p className={SECTION_TITLE_CLASS}>Transaksi BKU</p>
                                        </div>

                                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                            <div>
                                                <InputLabel>Tahun Anggaran</InputLabel>
                                                <select
                                                    className={SELECT_CLASS}
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
                                                <InputLabel>Tahap</InputLabel>
                                                <select
                                                    className={SELECT_CLASS}
                                                    value={modalTahap}
                                                    onChange={e => setModalTahap(e.target.value)}
                                                >
                                                    <option value="">Semua Tahap</option>
                                                    <option value="Tahap 1">Tahap 1 (Januari - Juni)</option>
                                                    <option value="Tahap 2">Tahap 2 (Juli - Desember)</option>
                                                </select>
                                            </div>
                                        </div>
                                        
                                        <div className="mt-4">
                                            <InputLabel>
                                                Pilih Transaksi (BKU) <span className="text-rose-500">*</span>
                                            </InputLabel>
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
                                            {loadingBku && <p className="mt-1.5 text-[10.5px] font-semibold text-slate-400 dark:text-slate-500">Memuat transaksi BKU...</p>}
                                        </div>
                                    </div>
                                )}

                                <div className={SECTION_CLASS}>
                                    <div className="mb-3.5 flex items-center gap-2.5">
                                        <IconTile tone="lime" size="sm">
                                            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <rect x="3" y="4" width="18" height="18" rx="3" />
                                                <path strokeLinecap="round" d="M16 2v4M8 2v4M3 10h18" />
                                            </svg>
                                        </IconTile>
                                        <p className={SECTION_TITLE_CLASS}>Identitas Surat Pesanan</p>
                                    </div>

                                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                        <div>
                                            <InputLabel>Nomor Surat Pesanan</InputLabel>
                                            <TextInput
                                                type="text"
                                                value={data.nomor_sp}
                                                onChange={e => setData({...data, nomor_sp: e.target.value})}
                                                placeholder="Masukkan nomor (opsional)"
                                            />
                                        </div>
                                        <div>
                                            <InputLabel htmlFor="sp-tanggal">Tanggal Surat Pesanan</InputLabel>
                                            <DatePicker
                                                id="sp-tanggal"
                                                value={data.tanggal_sp}
                                                onChange={(date) =>
                                                    setData((prev) => ({
                                                        ...prev,
                                                        tanggal_sp: date ? format(date, 'yyyy-MM-dd') : '',
                                                    }))
                                                }
                                                placeholder="Pilih tanggal surat pesanan"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'kesatu' && (
                            <div className={SECTION_CLASS}>
                                <div className="mb-3.5 flex items-center gap-2.5">
                                    <IconTile tone="violet" size="sm">
                                        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" />
                                            <circle cx="9" cy="7" r="4" />
                                        </svg>
                                    </IconTile>
                                    <p className={SECTION_TITLE_CLASS}>Pihak Kesatu (Sekolah / Pemesan)</p>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <InputLabel>Nama</InputLabel>
                                        <TextInput
                                            type="text"
                                            value={data.pihak_kesatu_nama}
                                            onChange={e => setData({...data, pihak_kesatu_nama: e.target.value})}
                                        />
                                    </div>
                                    <div>
                                        <InputLabel>NIP (Opsional)</InputLabel>
                                        <TextInput
                                            type="text"
                                            value={data.pihak_kesatu_nip}
                                            onChange={e => setData({...data, pihak_kesatu_nip: e.target.value})}
                                        />
                                    </div>
                                    <div>
                                        <InputLabel>Jabatan</InputLabel>
                                        <TextInput
                                            type="text"
                                            value={data.pihak_kesatu_jabatan}
                                            onChange={e => setData({...data, pihak_kesatu_jabatan: e.target.value})}
                                        />
                                    </div>
                                    <div>
                                        <InputLabel>Instansi / Sekolah</InputLabel>
                                        <TextInput
                                            type="text"
                                            value={data.pihak_kesatu_instansi}
                                            onChange={e => setData({...data, pihak_kesatu_instansi: e.target.value})}
                                        />
                                    </div>
                                    <div>
                                        <InputLabel>Alamat</InputLabel>
                                        <textarea
                                            className={TEXTAREA_CLASS}
                                            rows={2}
                                            value={data.pihak_kesatu_alamat}
                                            onChange={e => setData({...data, pihak_kesatu_alamat: e.target.value})}
                                        ></textarea>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'kedua' && (
                            <div className={SECTION_CLASS}>
                                <div className="mb-3.5 flex items-center gap-2.5">
                                    <IconTile tone="mint" size="sm">
                                        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                                            <circle cx="12" cy="7" r="4" />
                                        </svg>
                                    </IconTile>
                                    <p className={SECTION_TITLE_CLASS}>Pihak Kedua (Toko / Penyedia)</p>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <InputLabel>Nama Perusahaan / Toko</InputLabel>
                                        <TextInput
                                            type="text"
                                            value={data.pihak_kedua_nama_perusahaan}
                                            onChange={e => setData({...data, pihak_kedua_nama_perusahaan: e.target.value})}
                                        />
                                    </div>
                                    <div>
                                        <InputLabel>Penanggung Jawab / Pemilik</InputLabel>
                                        <TextInput
                                            type="text"
                                            value={data.pihak_kedua_penanggung_jawab}
                                            onChange={e => setData({...data, pihak_kedua_penanggung_jawab: e.target.value})}
                                        />
                                    </div>
                                    <div>
                                        <InputLabel>Alamat Toko</InputLabel>
                                        <textarea
                                            className={TEXTAREA_CLASS}
                                            rows={2}
                                            value={data.pihak_kedua_alamat}
                                            onChange={e => setData({...data, pihak_kedua_alamat: e.target.value})}
                                        ></textarea>
                                    </div>
                                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                        <div>
                                            <InputLabel>NPWP (Opsional)</InputLabel>
                                            <TextInput
                                                type="text"
                                                value={data.pihak_kedua_npwp}
                                                onChange={e => setData({...data, pihak_kedua_npwp: e.target.value})}
                                            />
                                        </div>
                                        <div>
                                            <InputLabel>Platform (SIPLah, dll) - Opsional</InputLabel>
                                            <TextInput
                                                type="text"
                                                value={data.pihak_kedua_platform}
                                                onChange={e => setData({...data, pihak_kedua_platform: e.target.value})}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'ketentuan' && (
                            <div className={SECTION_CLASS}>
                                <div className="mb-3.5 flex items-center gap-2.5">
                                    <IconTile tone="amber" size="sm">
                                        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                    </IconTile>
                                    <p className={SECTION_TITLE_CLASS}>Syarat dan Ketentuan</p>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <InputLabel>Waktu Pengiriman</InputLabel>
                                        <textarea
                                            className={TEXTAREA_CLASS}
                                            rows={2}
                                            value={data.waktu_pengiriman}
                                            onChange={e => setData({...data, waktu_pengiriman: e.target.value})}
                                        ></textarea>
                                    </div>
                                    <div>
                                        <InputLabel>Kondisi Barang</InputLabel>
                                        <textarea
                                            className={TEXTAREA_CLASS}
                                            rows={2}
                                            value={data.kondisi_barang}
                                            onChange={e => setData({...data, kondisi_barang: e.target.value})}
                                        ></textarea>
                                    </div>
                                    <div>
                                        <InputLabel>Ketentuan Pembayaran</InputLabel>
                                        <textarea
                                            className={TEXTAREA_CLASS}
                                            rows={2}
                                            value={data.ketentuan_pembayaran}
                                            onChange={e => setData({...data, ketentuan_pembayaran: e.target.value})}
                                        ></textarea>
                                    </div>
                                    <div>
                                        <InputLabel>Sumber Dana</InputLabel>
                                        <textarea
                                            className={TEXTAREA_CLASS}
                                            rows={2}
                                            value={data.sumber_dana}
                                            onChange={e => setData({...data, sumber_dana: e.target.value})}
                                        ></textarea>
                                    </div>
                                </div>
                            </div>
                        )}
                    </form>
                </div>
                
                <div className="relative flex shrink-0 items-center justify-end gap-2 border-t border-slate-100 bg-white px-6 py-4 dark:border-white/5 dark:bg-[#15131F]">
                    <SecondaryButton
                        type="button"
                        onClick={onClose}
                        disabled={processing}
                    >
                        Batal
                    </SecondaryButton>
                    <PrimaryButton
                        type="submit"
                        form="sp-form"
                        disabled={processing || (!editData && !data.bku_id)}
                    >
                        {processing ? 'Menyimpan...' : 'Simpan Surat Pesanan'}
                    </PrimaryButton>
                </div>
            </div>
        </Modal>
    );
}
