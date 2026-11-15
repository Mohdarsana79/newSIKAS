import React, { useState } from 'react';
import Modal from '@/Components/Modal';
import TextInput from '@/Components/TextInput';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import { router } from '@inertiajs/react';
import { UploadCloud, AlertCircle } from 'lucide-react';

interface Props {
    show: boolean;
    onClose: () => void;
    folderId: number;
}

export default function UploadArsipModal({ show, onClose, folderId }: Props) {
    const [perihal, setPerihal] = useState('');
    const [nomorSurat, setNomorSurat] = useState('');
    const [tanggalSurat, setTanggalSurat] = useState('');
    const [keterangan, setKeterangan] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg(null);

        if (!perihal.trim() || !file) {
            setErrorMsg('Perihal dan berkas dokumen wajib diisi.');
            return;
        }

        const formData = new FormData();
        formData.append('perihal', perihal);
        if (nomorSurat) formData.append('nomor_surat', nomorSurat);
        if (tanggalSurat) formData.append('tanggal_surat', tanggalSurat);
        if (keterangan) formData.append('keterangan', keterangan);
        formData.append('file', file);

        setLoading(true);
        router.post(route('sk-surat.dokumen.upload-arsip', folderId), formData, {
            forceFormData: true,
            onSuccess: () => {
                setPerihal('');
                setNomorSurat('');
                setTanggalSurat('');
                setKeterangan('');
                setFile(null);
                onClose();
            },
            onError: (err) => {
                setErrorMsg(Object.values(err).join(', '));
            },
            onFinish: () => setLoading(false),
        });
    };

    return (
        <Modal show={show} onClose={onClose} maxWidth="lg">
            <form onSubmit={handleSubmit} className="p-6 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 text-gray-900 dark:text-white rounded-2xl">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2.5 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-xl">
                        <UploadCloud className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-slate-100">Upload Arsip / Scan Surat Fisik</h3>
                        <p className="text-xs text-gray-500 dark:text-slate-400">
                            Unggah berkas resmi bertanda tangan dan stempel basah (PDF, Word, atau Scan Gambar).
                        </p>
                    </div>
                </div>

                {errorMsg && (
                    <div className="mb-4 p-3 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-xl text-rose-700 dark:text-rose-400 text-xs flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{errorMsg}</span>
                    </div>
                )}

                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                            Perihal / Judul Dokumen <span className="text-rose-500">*</span>
                        </label>
                        <TextInput
                            type="text"
                            className="w-full bg-gray-50 dark:bg-slate-950 border-gray-300 dark:border-slate-800 text-gray-900 dark:text-slate-200 text-sm focus:border-emerald-500"
                            placeholder="Contoh: Scan SK Tim BOS 2026 Bertanda Tangan"
                            value={perihal}
                            onChange={(e) => setPerihal(e.target.value)}
                            required
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                                Nomor Surat
                            </label>
                            <TextInput
                                type="text"
                                className="w-full bg-gray-50 dark:bg-slate-950 border-gray-300 dark:border-slate-800 text-gray-900 dark:text-slate-200 text-sm font-mono focus:border-emerald-500"
                                placeholder="Contoh: 421.3/001/2026"
                                value={nomorSurat}
                                onChange={(e) => setNomorSurat(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                                Tanggal Surat
                            </label>
                            <TextInput
                                type="date"
                                className="w-full bg-gray-50 dark:bg-slate-950 border-gray-300 dark:border-slate-800 text-gray-900 dark:text-slate-200 text-sm focus:border-emerald-500"
                                value={tanggalSurat}
                                onChange={(e) => setTanggalSurat(e.target.value)}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                            Pilih Berkas Dokumen <span className="text-rose-500">*</span>
                        </label>
                        <input
                            type="file"
                            accept=".pdf,.docx,.jpg,.jpeg,.png"
                            onChange={(e) => setFile(e.target.files?.[0] || null)}
                            className="block w-full text-xs text-gray-600 dark:text-slate-400 file:mr-3 file:py-2.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 dark:file:bg-emerald-600/20 file:text-emerald-700 dark:file:text-emerald-300 hover:file:bg-emerald-100 dark:hover:file:bg-emerald-600/30 file:cursor-pointer border border-gray-300 dark:border-slate-800 rounded-lg bg-gray-50 dark:bg-slate-950"
                            required
                        />
                        <p className="mt-1 text-[11px] text-gray-500 dark:text-slate-500 italic">
                            Format didukung: PDF, DOCX, JPG, PNG (Maksimal 15 MB)
                        </p>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                            Keterangan (Opsional)
                        </label>
                        <textarea
                            className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-300 dark:border-slate-800 text-gray-900 dark:text-slate-200 text-xs rounded-lg focus:border-emerald-500 placeholder:text-gray-400 dark:placeholder:text-slate-600"
                            rows={2}
                            placeholder="Catatan mengenai berkas fisik..."
                            value={keterangan}
                            onChange={(e) => setKeterangan(e.target.value)}
                        />
                    </div>
                </div>

                <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-slate-800">
                    <SecondaryButton type="button" onClick={onClose} disabled={loading} className="border-gray-300 dark:border-slate-800 text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800">
                        Batal
                    </SecondaryButton>
                    <PrimaryButton type="submit" disabled={loading} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                        {loading ? 'Mengunggah...' : 'Unggah Berkas Arsip'}
                    </PrimaryButton>
                </div>
            </form>
        </Modal>
    );
}
