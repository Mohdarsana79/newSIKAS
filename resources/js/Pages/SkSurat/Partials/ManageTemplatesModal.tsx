import React, { useState } from 'react';
import Modal from '@/Components/Modal';
import TextInput from '@/Components/TextInput';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import { router } from '@inertiajs/react';
import Swal from 'sweetalert2';
import { FileText, Trash2, Upload, Tag, AlertCircle } from 'lucide-react';

interface SkTemplate {
    id: number;
    judul: string;
    file_name_original: string;
    detected_variables: string[] | null;
    created_at: string;
    user?: { id: number; name: string };
}

interface Props {
    show: boolean;
    onClose: () => void;
    folderId: number;
    templates: SkTemplate[];
    isKepalaSekolah?: boolean;
}

export default function ManageTemplatesModal({ show, onClose, folderId, templates = [], isKepalaSekolah = false }: Props) {
    const [judul, setJudul] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);

    const handleUpload = (e: React.FormEvent) => {
        e.preventDefault();
        if (!judul.trim() || !file) {
            Swal.fire({ icon: 'warning', title: 'Perhatian', text: 'Judul dan berkas .docx template wajib diisi' });
            return;
        }

        const formData = new FormData();
        formData.append('judul', judul);
        formData.append('file', file);

        setLoading(true);
        router.post(route('sk-surat.template.store', folderId), formData, {
            forceFormData: true,
            onSuccess: () => {
                setJudul('');
                setFile(null);
                Swal.fire({
                    icon: 'success',
                    title: 'Berhasil',
                    text: 'Master template berhasil diunggah dan variabel otomatis terdeteksi!',
                    timer: 2000,
                    showConfirmButton: false,
                });
            },
            onError: (err) => {
                Swal.fire({ icon: 'error', title: 'Gagal Mengunggah', text: Object.values(err).join(', ') });
            },
            onFinish: () => setLoading(false),
        });
    };

    const handleDelete = (template: SkTemplate) => {
        Swal.fire({
            title: 'Hapus Master Template?',
            text: `Yakin ingin menghapus template "${template.judul}"?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#334155',
            confirmButtonText: 'Ya, Hapus',
            cancelButtonText: 'Batal',
        }).then((res) => {
            if (res.isConfirmed) {
                router.delete(route('sk-surat.template.destroy', template.id), {
                    onSuccess: () => {
                        Swal.fire({ icon: 'success', title: 'Dihapus', text: 'Template berhasil dihapus', timer: 1500, showConfirmButton: false });
                    },
                });
            }
        });
    };

    return (
        <Modal show={show} onClose={onClose} maxWidth="2xl">
            <div className="p-6 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 text-gray-900 dark:text-white rounded-2xl max-h-[85vh] flex flex-col">
                <div className="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-slate-800 shrink-0">
                    <div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-slate-100 flex items-center gap-2">
                            <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                            Kelola Master Template Word (.docx)
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                            Upload template Word yang berisi tag variabel seperti <code className="text-indigo-600 dark:text-indigo-300 font-mono">{'${nomor_surat}'}</code> atau <code className="text-indigo-600 dark:text-indigo-300 font-mono">{'${nama_kegiatan}'}</code>.
                        </p>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto py-4 space-y-6 pr-1 custom-scrollbar">
                    {/* Form Upload Template - Khusus Bendahara */}
                    {!isKepalaSekolah && (
                        <form onSubmit={handleUpload} className="p-4 bg-gray-50 dark:bg-slate-950/70 border border-gray-200 dark:border-slate-800/80 rounded-xl space-y-3">
                            <h4 className="text-xs font-semibold text-gray-700 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                                <Upload className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                Unggah Master Template Baru
                            </h4>

                            <div>
                                <label className="block text-xs text-gray-600 dark:text-slate-400 mb-1">Judul / Nama Template</label>
                                <TextInput
                                    type="text"
                                    className="w-full bg-white dark:bg-slate-900 border-gray-300 dark:border-slate-800 text-gray-900 dark:text-slate-200 text-sm focus:border-indigo-500"
                                    placeholder="Contoh: Format SK Tim Pengelola BOS"
                                    value={judul}
                                    onChange={(e) => setJudul(e.target.value)}
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-xs text-gray-600 dark:text-slate-400 mb-1">Berkas Dokumen (.docx)</label>
                                <input
                                    type="file"
                                    accept=".docx"
                                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                                    className="block w-full text-xs text-gray-600 dark:text-slate-400 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 dark:file:bg-indigo-600/20 file:text-indigo-700 dark:file:text-indigo-300 hover:file:bg-indigo-100 dark:hover:file:bg-indigo-600/30 file:cursor-pointer border border-gray-300 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900"
                                    required
                                />
                            </div>

                            <div className="flex justify-end pt-1">
                                <PrimaryButton type="submit" disabled={loading} className="bg-indigo-600 hover:bg-indigo-700 text-xs py-2 text-white">
                                    {loading ? 'Mengunggah & Mendeteksi...' : 'Upload & Deteksi Tag'}
                                </PrimaryButton>
                            </div>
                        </form>
                    )}

                    {/* Daftar Template Tersimpan */}
                    <div>
                        <h4 className="text-xs font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wider mb-3">
                            Template Tersedia di Folder Ini ({templates.length})
                        </h4>

                        {templates.length === 0 ? (
                            <div className="p-6 text-center border border-dashed border-gray-300 dark:border-slate-800 rounded-xl bg-gray-50/50 dark:bg-slate-950/40">
                                <AlertCircle className="w-8 h-8 text-gray-400 dark:text-slate-600 mx-auto mb-2" />
                                <p className="text-sm text-gray-600 dark:text-slate-400">Belum ada master template di folder ini.</p>
                                <p className="text-xs text-gray-400 dark:text-slate-600 mt-1">Unggah berkas Word (.docx) di atas untuk mulai membuat surat dinamis.</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {templates.map((tpl) => (
                                    <div
                                        key={tpl.id}
                                        className="p-4 bg-white dark:bg-slate-950/50 border border-gray-200 dark:border-slate-800 rounded-xl hover:border-indigo-300 dark:hover:border-slate-700 transition-all shadow-sm"
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="space-y-1">
                                                <div className="font-semibold text-gray-900 dark:text-slate-200 text-sm flex items-center gap-2">
                                                    <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                                                    {tpl.judul}
                                                </div>
                                                <div className="text-xs text-gray-500 dark:text-slate-500">
                                                    File asli: <span className="text-gray-700 dark:text-slate-400 font-mono">{tpl.file_name_original}</span>
                                                </div>
                                            </div>

                                            {!isKepalaSekolah && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleDelete(tpl)}
                                                    className="p-1.5 text-gray-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-colors"
                                                    title="Hapus Template"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>

                                        {/* Tag Variabel yang Terdeteksi */}
                                        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-slate-800/80">
                                            <div className="text-[11px] font-medium text-gray-500 dark:text-slate-400 flex items-center gap-1 mb-1.5">
                                                <Tag className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                                                Tag Variabel Terdeteksi ({tpl.detected_variables?.length || 0}):
                                            </div>
                                            {tpl.detected_variables && tpl.detected_variables.length > 0 ? (
                                                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                                                    {tpl.detected_variables.map((v, idx) => (
                                                        <span
                                                            key={idx}
                                                            className="px-2 py-0.5 rounded text-[11px] font-mono bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-500/30 text-indigo-700 dark:text-indigo-300"
                                                        >
                                                            {`\${${v}}`}
                                                        </span>
                                                    ))}
                                                </div>
                                            ) : (
                                                <span className="text-xs text-amber-600 dark:text-amber-400 italic">
                                                    Tidak ada tag ${'{...}'} yang ditemukan dalam file Word ini.
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="mt-4 pt-3 border-t border-gray-200 dark:border-slate-800 flex justify-end shrink-0">
                    <SecondaryButton onClick={onClose} className="border-gray-300 dark:border-slate-800 text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800">
                        Tutup
                    </SecondaryButton>
                </div>
            </div>
        </Modal>
    );
}
