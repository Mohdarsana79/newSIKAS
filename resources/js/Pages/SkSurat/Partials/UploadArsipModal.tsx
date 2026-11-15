import React, { useEffect, useRef, useState } from 'react';
import Modal from '@/Components/Modal';
import TextInput from '@/Components/TextInput';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import IconTile from '@/Components/ui/IconTile';
import { router } from '@inertiajs/react';
import { UploadCloud, AlertCircle } from 'lucide-react';

interface Props {
    show: boolean;
    onClose: () => void;
    folderId: number;
}

const LABEL_CLASS =
    'mb-1.5 block text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500';

const TEXTAREA_CLASS =
    'w-full rounded-xl border border-slate-200/90 bg-white px-3.5 py-2.5 text-[12px] font-semibold text-slate-800 shadow-sm transition placeholder:text-slate-400 focus:border-lime-400 focus:outline-none focus:ring-4 focus:ring-lime-200/60 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-lime-400/70 dark:focus:ring-lime-400/10';

export default function UploadArsipModal({ show, onClose, folderId }: Props) {
    const [perihal, setPerihal] = useState('');
    const [nomorSurat, setNomorSurat] = useState('');
    const [tanggalSurat, setTanggalSurat] = useState('');
    const [keterangan, setKeterangan] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const resetForm = () => {
        setPerihal('');
        setNomorSurat('');
        setTanggalSurat('');
        setKeterangan('');
        setFile(null);
        setErrorMsg(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    useEffect(() => {
        if (show) {
            setErrorMsg(null);
        } else {
            resetForm();
        }
    }, [show]);

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
                resetForm();
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
            <form onSubmit={handleSubmit} className="relative overflow-hidden">
                <div className="pointer-events-none absolute -right-10 -top-16 h-40 w-40 rounded-full bg-mint/15 blur-3xl dark:bg-mint/10" />

                {/* Header */}
                <div className="relative flex items-center gap-3 border-b border-slate-100 px-6 py-4 dark:border-white/5">
                    <IconTile tone="mint" size="lg">
                        <UploadCloud className="w-4 h-4" />
                    </IconTile>
                    <div className="min-w-0">
                        <h3 className="text-[14px] font-extrabold tracking-tight text-slate-900 dark:text-white">
                            Upload Arsip / Scan Surat Fisik
                        </h3>
                        <p className="mt-0.5 text-[10px] font-medium text-slate-400 dark:text-slate-500">
                            Unggah berkas resmi bertanda tangan dan stempel basah (PDF, Word, atau Scan Gambar).
                        </p>
                    </div>
                </div>

                <div className="relative space-y-4 px-6 py-5">
                    {errorMsg && (
                        <div className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-pastel-rose p-3 text-[11px] font-semibold text-rose-700 dark:border-rose-400/20 dark:bg-rose-500/10 dark:text-rose-300">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <span>{errorMsg}</span>
                        </div>
                    )}

                    <div>
                        <label className={LABEL_CLASS}>
                            Perihal / Judul Dokumen <span className="text-rose-500">*</span>
                        </label>
                        <TextInput
                            type="text"
                            placeholder="Contoh: Scan SK Tim BOS 2026 Bertanda Tangan"
                            value={perihal}
                            onChange={(e) => setPerihal(e.target.value)}
                            required
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                            <label className={LABEL_CLASS}>
                                Nomor Surat
                            </label>
                            <TextInput
                                type="text"
                                className="font-mono text-sikas-num"
                                placeholder="Contoh: 421.3/001/2026"
                                value={nomorSurat}
                                onChange={(e) => setNomorSurat(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className={LABEL_CLASS}>
                                Tanggal Surat
                            </label>
                            <TextInput
                                type="date"
                                value={tanggalSurat}
                                onChange={(e) => setTanggalSurat(e.target.value)}
                            />
                        </div>
                    </div>

                    <div>
                        <label className={LABEL_CLASS}>
                            Pilih Berkas Dokumen <span className="text-rose-500">*</span>
                        </label>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".pdf,.docx,.jpg,.jpeg,.png"
                            onChange={(e) => setFile(e.target.files?.[0] || null)}
                            className="block w-full cursor-pointer rounded-xl border border-slate-200/90 bg-white text-[11px] font-semibold text-slate-500 file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-pastel-mint file:px-3 file:py-2.5 file:text-[11px] file:font-extrabold file:text-emerald-700 hover:file:bg-mint/20 dark:border-white/10 dark:bg-white/5 dark:text-slate-400 dark:file:bg-mint/10 dark:file:text-emerald-300"
                            required
                        />
                        <p className="mt-1.5 text-[10px] font-medium italic text-slate-400 dark:text-slate-500">
                            Format didukung: PDF, DOCX, JPG, PNG (Maksimal 15 MB)
                        </p>
                    </div>

                    <div>
                        <label className={LABEL_CLASS}>
                            Keterangan (Opsional)
                        </label>
                        <textarea
                            className={TEXTAREA_CLASS}
                            rows={2}
                            placeholder="Catatan mengenai berkas fisik..."
                            value={keterangan}
                            onChange={(e) => setKeterangan(e.target.value)}
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="relative flex justify-end gap-2 border-t border-slate-100 px-6 py-4 dark:border-white/5">
                    <SecondaryButton type="button" onClick={onClose} disabled={loading}>
                        Batal
                    </SecondaryButton>
                    <PrimaryButton type="submit" disabled={loading}>
                        {loading ? 'Mengunggah...' : 'Unggah Berkas Arsip'}
                    </PrimaryButton>
                </div>
            </form>
        </Modal>
    );
}
