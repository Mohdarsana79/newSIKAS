import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, usePage } from '@inertiajs/react';
import { PageProps } from '@/types';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import Modal from '@/Components/Modal';
import { FormEventHandler, useState, useEffect } from 'react';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import InputError from '@/Components/InputError';
import DangerButton from '@/Components/DangerButton';

interface Sekolah {
    id: number;
    nama_sekolah: string;
    npsn: string;
    status_sekolah: string;
    jenjang_sekolah: string;
    kelurahan_desa: string;
    kecamatan: string;
    kabupaten_kota: string;
    provinsi: string;
    alamat: string;
    kop_surat?: string;
}

export default function Index({ auth, sekolah }: PageProps<{ sekolah?: Sekolah }>) {
    const [isModalOpen, setIsModalOpen] = useState(false);

    const [isUploadOpen, setIsUploadOpen] = useState(false);
    const [isDeleteKopOpen, setIsDeleteKopOpen] = useState(false);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);

    // Form for Data Sekolah
    const { data, setData, post, put, processing, errors, reset } = useForm({
        nama_sekolah: '',
        npsn: '',
        status_sekolah: '',
        jenjang_sekolah: '',
        kelurahan_desa: '',
        kecamatan: '',
        kabupaten_kota: '',
        provinsi: '',
        alamat: '',
    });

    // Form for Kop Surat
    const { data: kopData, setData: setKopData, post: postKop, delete: deleteKop, processing: kopProcessing } = useForm({
        kop_surat: null as File | null,
    });

    useEffect(() => {
        if (sekolah) {
            setData({
                nama_sekolah: sekolah.nama_sekolah,
                npsn: sekolah.npsn,
                status_sekolah: sekolah.status_sekolah,
                jenjang_sekolah: sekolah.jenjang_sekolah,
                kelurahan_desa: sekolah.kelurahan_desa,
                kecamatan: sekolah.kecamatan,
                kabupaten_kota: sekolah.kabupaten_kota,
                provinsi: sekolah.provinsi,
                alamat: sekolah.alamat,
            });
        }
    }, [sekolah]);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        if (sekolah) {
            put(route('sekolah-profile.update', sekolah.id), {
                onSuccess: () => setIsModalOpen(false),
            });
        } else {
            post(route('sekolah-profile.store'), {
                onSuccess: () => setIsModalOpen(false),
            });
        }
    };

    const submitKop: FormEventHandler = (e) => {
        e.preventDefault();
        if (sekolah) {
            postKop(route('sekolah-profile.upload-kop', sekolah.id), {
                onSuccess: () => setIsUploadOpen(false),
            });
        }
    };

    const handleDeleteKop = () => {
        setIsDeleteKopOpen(true);
    };

    const confirmDeleteKop = () => {
        if (sekolah) {
            deleteKop(route('sekolah-profile.delete-kop', sekolah.id), {
                onSuccess: () => setIsDeleteKopOpen(false),
            });
        }
    };

    return (
        <AuthenticatedLayout
            header={<h2 className="font-semibold text-xl text-gray-800 dark:text-gray-200 leading-tight">Profil Sekolah</h2>}
        >
            <Head title="Profil Sekolah" />

            <div className="py-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column: School ID Card Style */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="p-4 sm:p-8 bg-white dark:bg-gray-800 shadow sm:rounded-lg">
                            <header className="flex justify-between items-center mb-6">
                                <div>
                                    <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">Informasi Sekolah</h2>
                                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                                        Data identitas satuan pendidikan.
                                    </p>
                                </div>
                                <PrimaryButton onClick={() => setIsModalOpen(true)}>
                                    {sekolah ? 'Update Data Sekolah' : 'Input Data Sekolah'}
                                </PrimaryButton>
                            </header>

                            {sekolah ? (
                                <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                                    <div className="sm:col-span-1">
                                        <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Nama Sekolah</dt>
                                        <dd className="mt-1 text-sm text-gray-900 dark:text-gray-200">{sekolah.nama_sekolah}</dd>
                                    </div>
                                    <div className="sm:col-span-1">
                                        <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">NPSN</dt>
                                        <dd className="mt-1 text-sm text-gray-900 dark:text-gray-200">{sekolah.npsn}</dd>
                                    </div>
                                    <div className="sm:col-span-1">
                                        <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Status</dt>
                                        <dd className="mt-1 text-sm text-gray-900 dark:text-gray-200">{sekolah.status_sekolah}</dd>
                                    </div>
                                    <div className="sm:col-span-1">
                                        <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Jenjang</dt>
                                        <dd className="mt-1 text-sm text-gray-900 dark:text-gray-200">{sekolah.jenjang_sekolah}</dd>
                                    </div>
                                    <div className="sm:col-span-1">
                                        <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Provinsi</dt>
                                        <dd className="mt-1 text-sm text-gray-900 dark:text-gray-200">{sekolah.provinsi}</dd>
                                    </div>
                                    <div className="sm:col-span-1">
                                        <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Kabupaten/Kota</dt>
                                        <dd className="mt-1 text-sm text-gray-900 dark:text-gray-200">{sekolah.kabupaten_kota}</dd>
                                    </div>
                                    <div className="sm:col-span-1">
                                        <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Kecamatan</dt>
                                        <dd className="mt-1 text-sm text-gray-900 dark:text-gray-200">{sekolah.kecamatan}</dd>
                                    </div>
                                    <div className="sm:col-span-1">
                                        <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Kelurahan/Desa</dt>
                                        <dd className="mt-1 text-sm text-gray-900 dark:text-gray-200">{sekolah.kelurahan_desa}</dd>
                                    </div>
                                    <div className="sm:col-span-2">
                                        <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Alamat Lengkap</dt>
                                        <dd className="mt-1 text-sm text-gray-900 dark:text-gray-200">{sekolah.alamat}</dd>
                                    </div>
                                </dl>
                            ) : (
                                <div className="text-center py-12 text-gray-500">
                                    Belum ada data sekolah. Silakan input data terlebih dahulu.
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Column: Kop Surat */}
                    <div className="space-y-6">
                        <div className="p-4 sm:p-8 bg-white dark:bg-gray-800 shadow sm:rounded-lg">
                            <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Kop Sekolah</h2>

                            {sekolah?.kop_surat ? (
                                <div className="space-y-4">
                                    <div className="border rounded-lg p-2 bg-gray-50 dark:bg-gray-700 cursor-pointer group relative overflow-hidden" onClick={() => setIsPreviewOpen(true)}>
                                        <img
                                            src={`/storage/${sekolah.kop_surat.replace('public/', '')}`}
                                            alt="Kop Surat"
                                            className="w-full h-auto rounded transition-transform duration-300 group-hover:scale-105"
                                        />
                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                            </svg>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <SecondaryButton onClick={() => setIsPreviewOpen(true)} className="flex-1 justify-center">
                                            Lihat
                                        </SecondaryButton>
                                        <SecondaryButton onClick={() => setIsUploadOpen(true)} className="flex-1 justify-center">
                                            Ganti
                                        </SecondaryButton>
                                        <DangerButton onClick={handleDeleteKop}>
                                            Hapus
                                        </DangerButton>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                                    <p className="text-sm text-gray-500 mb-4">Belum ada Kop Surat</p>
                                    <PrimaryButton onClick={() => setIsUploadOpen(true)} disabled={!sekolah}>
                                        Upload Kop
                                    </PrimaryButton>
                                    {!sekolah && <p className="text-xs text-red-500 mt-2">Input data sekolah dulu</p>}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal Input Content */}
            <Modal show={isModalOpen} onClose={() => setIsModalOpen(false)}>
                <form onSubmit={submit} className="flex flex-col max-h-[80vh]">
                    <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex-none bg-gradient-to-r from-indigo-500 to-purple-600 rounded-t-lg">
                        <h2 className="text-xl font-bold text-white">
                            {sekolah ? 'Update Data Sekolah' : 'Input Data Sekolah'}
                        </h2>
                        <p className="text-indigo-100 text-sm mt-1">
                            Silakan lengkapi informasi identitas sekolah di bawah ini.
                        </p>
                    </div>
                    <div className="p-6 overflow-y-auto flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 bg-white dark:bg-gray-800">
                        <div className="md:col-span-2">
                            <InputLabel htmlFor="nama_sekolah" value="Nama Sekolah" />
                            <TextInput
                                id="nama_sekolah"
                                value={data.nama_sekolah}
                                onChange={(e) => setData('nama_sekolah', e.target.value)}
                                className="mt-1 block w-full text-gray-900"
                                required
                            />
                            <InputError message={errors.nama_sekolah} className="mt-2" />
                        </div>

                        <div>
                            <InputLabel htmlFor="npsn" value="NPSN" />
                            <TextInput
                                id="npsn"
                                value={data.npsn}
                                onChange={(e) => setData('npsn', e.target.value)}
                                className="mt-1 block w-full text-gray-900"
                                required
                            />
                            <InputError message={errors.npsn} className="mt-2" />
                        </div>

                        <div>
                            <InputLabel htmlFor="status_sekolah" value="Status Sekolah" />
                            <select
                                id="status_sekolah"
                                value={data.status_sekolah}
                                onChange={(e) => setData('status_sekolah', e.target.value)}
                                className="mt-1 block w-full border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 focus:border-indigo-500 dark:focus:border-indigo-600 focus:ring-indigo-500 dark:focus:ring-indigo-600 rounded-md shadow-sm"
                                required
                            >
                                <option value="">Pilih Status</option>
                                <option value="Negeri">Negeri</option>
                                <option value="Swasta">Swasta</option>
                            </select>
                            <InputError message={errors.status_sekolah} className="mt-2" />
                        </div>

                        <div>
                            <InputLabel htmlFor="jenjang_sekolah" value="Jenjang" />
                            <select
                                id="jenjang_sekolah"
                                value={data.jenjang_sekolah}
                                onChange={(e) => setData('jenjang_sekolah', e.target.value)}
                                className="mt-1 block w-full border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 focus:border-indigo-500 dark:focus:border-indigo-600 focus:ring-indigo-500 dark:focus:ring-indigo-600 rounded-md shadow-sm"
                                required
                            >
                                <option value="">Pilih Jenjang</option>
                                <option value="SD">SD</option>
                                <option value="SMP">SMP</option>
                                <option value="SMA">SMA</option>
                                <option value="SMK">SMK</option>
                            </select>
                            <InputError message={errors.jenjang_sekolah} className="mt-2" />
                        </div>

                        <div>
                            <InputLabel htmlFor="provinsi" value="Provinsi" />
                            <TextInput
                                id="provinsi"
                                value={data.provinsi}
                                onChange={(e) => setData('provinsi', e.target.value)}
                                className="mt-1 block w-full text-gray-900"
                                required
                            />
                            <InputError message={errors.provinsi} className="mt-2" />
                        </div>

                        <div>
                            <InputLabel htmlFor="kabupaten_kota" value="Kabupaten/Kota" />
                            <TextInput
                                id="kabupaten_kota"
                                value={data.kabupaten_kota}
                                onChange={(e) => setData('kabupaten_kota', e.target.value)}
                                className="mt-1 block w-full text-gray-900"
                                required
                            />
                            <InputError message={errors.kabupaten_kota} className="mt-2" />
                        </div>

                        <div>
                            <InputLabel htmlFor="kecamatan" value="Kecamatan" />
                            <TextInput
                                id="kecamatan"
                                value={data.kecamatan}
                                onChange={(e) => setData('kecamatan', e.target.value)}
                                className="mt-1 block w-full text-gray-900"
                                required
                            />
                            <InputError message={errors.kecamatan} className="mt-2" />
                        </div>

                        <div>
                            <InputLabel htmlFor="kelurahan_desa" value="Kelurahan/Desa" />
                            <TextInput
                                id="kelurahan_desa"
                                value={data.kelurahan_desa}
                                onChange={(e) => setData('kelurahan_desa', e.target.value)}
                                className="mt-1 block w-full text-gray-900"
                                required
                            />
                            <InputError message={errors.kelurahan_desa} className="mt-2" />
                        </div>

                        <div className="md:col-span-2">
                            <InputLabel htmlFor="alamat" value="Alamat Lengkap" />
                            <textarea
                                id="alamat"
                                value={data.alamat}
                                onChange={(e) => setData('alamat', e.target.value)}
                                className="mt-1 block w-full border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 focus:border-indigo-500 dark:focus:border-indigo-600 focus:ring-indigo-500 dark:focus:ring-indigo-600 rounded-md shadow-sm"
                                rows={3}
                                required
                            />
                            <InputError message={errors.alamat} className="mt-2" />
                        </div>

                    </div>
                    <div className="p-6 border-t border-gray-100 dark:border-gray-700 flex-none flex justify-end gap-3 bg-gray-50 dark:bg-gray-900 rounded-b-lg">
                        <SecondaryButton onClick={() => setIsModalOpen(false)} type="button">Batal</SecondaryButton>
                        <PrimaryButton disabled={processing} className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 border-0 flex items-center gap-2">
                            {processing ? (
                                <>
                                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Menyimpan...
                                </>
                            ) : (
                                'Simpan Perubahan'
                            )}
                        </PrimaryButton>
                    </div>
                </form>
            </Modal>

            {/* Modal Upload Kop */}
            <Modal show={isUploadOpen} onClose={() => setIsUploadOpen(false)} maxWidth="sm">
                <div className="p-6">
                    <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                        Upload Kop Surat
                    </h2>
                    <form onSubmit={submitKop}>
                        <div className="mt-4">
                            <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => setKopData('kop_surat', e.target.files ? e.target.files[0] : null)}
                                className="block w-full text-sm text-gray-500
                                  file:mr-4 file:py-2 file:px-4
                                  file:rounded-full file:border-0
                                  file:text-sm file:font-semibold
                                  file:bg-indigo-50 file:text-indigo-700
                                  hover:file:bg-indigo-100"
                            />
                        </div>

                        <div className="flex justify-end gap-2 mt-6">
                            <SecondaryButton onClick={() => setIsUploadOpen(false)} type="button">Batal</SecondaryButton>
                            <PrimaryButton disabled={kopProcessing} className="flex items-center gap-2">
                                {kopProcessing ? (
                                    <>
                                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Uploading...
                                    </>
                                ) : (
                                    'Upload'
                                )}
                            </PrimaryButton>
                        </div>
                    </form>
                </div>
            </Modal>

            {/* Modal Delete Confirmation */}
            <Modal show={isDeleteKopOpen} onClose={() => setIsDeleteKopOpen(false)} maxWidth="sm">
                <div className="p-6">
                    <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                        Hapus Kop Surat?
                    </h2>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                        Apakah Anda yakin ingin menghapus kop surat ini? Tindakan ini tidak dapat dibatalkan.
                    </p>
                    <div className="mt-6 flex justify-end gap-2">
                        <SecondaryButton onClick={() => setIsDeleteKopOpen(false)}>Batal</SecondaryButton>
                        <DangerButton onClick={confirmDeleteKop} disabled={kopProcessing} className="flex items-center gap-2">
                            {kopProcessing ? (
                                <>
                                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Menghapus...
                                </>
                            ) : (
                                'Hapus'
                            )}
                        </DangerButton>
                    </div>
                </div>
            </Modal>
            {/* Modal Preview Kop */}
            <Modal show={isPreviewOpen} onClose={() => setIsPreviewOpen(false)} maxWidth="2xl">
                <div className="p-1 relative">
                    <button
                        onClick={() => setIsPreviewOpen(false)}
                        className="absolute top-2 right-2 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors z-10"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                    {sekolah?.kop_surat && (
                        <img
                            src={`/storage/${sekolah.kop_surat.replace('public/', '')}`}
                            alt="Preview Kop Surat"
                            className="w-full h-auto rounded"
                        />
                    )}
                </div>
            </Modal>
        </AuthenticatedLayout >
    );
}
