import React, { useEffect, useState } from 'react';
import Modal from '@/Components/Modal';
import TextInput from '@/Components/TextInput';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import { router } from '@inertiajs/react';
import { FileEdit, Sparkles, AlertCircle } from 'lucide-react';

interface SkTemplate {
    id: number;
    judul: string;
    file_name_original: string;
    detected_variables: string[] | null;
}

interface SkDokumen {
    id: number;
    folder_id: number;
    template_id: number;
    perihal: string;
    nomor_surat?: string | null;
    tanggal_surat?: string | null;
    data_isian: Record<string, any> | null;
    keterangan: string | null;
}

interface Props {
    show: boolean;
    onClose: () => void;
    folderId: number;
    templates: SkTemplate[];
    schoolData?: Record<string, string>;
    dokumen?: SkDokumen | null;
}

export default function GenerateDokumenModal({
    show,
    onClose,
    folderId,
    templates = [],
    schoolData = {},
    dokumen = null,
}: Props) {
    const isEditing = Boolean(dokumen && dokumen.id);

    const [selectedTemplateId, setSelectedTemplateId] = useState<number | ''>('');
    const [perihal, setPerihal] = useState('');
    const [keterangan, setKeterangan] = useState('');
    const [dataIsian, setDataIsian] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // Active selected template object
    const activeTemplate = templates.find((t) => t.id === Number(selectedTemplateId));

    useEffect(() => {
        setErrorMsg(null);
        if (dokumen) {
            setSelectedTemplateId(dokumen.template_id || '');
            setPerihal(dokumen.perihal || '');
            setKeterangan(dokumen.keterangan || '');
            setDataIsian((dokumen.data_isian as Record<string, string>) || {});
        } else {
            // Default template if available
            const defaultTpl = templates[0];
            const defaultId = defaultTpl ? defaultTpl.id : '';
            setSelectedTemplateId(defaultId);
            setPerihal('');
            setKeterangan('');

            // Pre-fill variables for default template
            if (defaultTpl?.detected_variables) {
                const initial: Record<string, string> = {};
                defaultTpl.detected_variables.forEach((tag) => {
                    const normalized = tag.toLowerCase().trim();
                    if (schoolData[normalized]) {
                        initial[tag] = schoolData[normalized];
                    } else {
                        initial[tag] = '';
                    }
                });
                setDataIsian(initial);
            } else {
                setDataIsian({});
            }
        }
    }, [dokumen, show, templates]);

    const handleTemplateChange = (tplId: number) => {
        setSelectedTemplateId(tplId);
        const tpl = templates.find((t) => t.id === tplId);
        if (tpl?.detected_variables) {
            const nextIsian: Record<string, string> = { ...dataIsian };
            tpl.detected_variables.forEach((tag) => {
                const normalized = tag.toLowerCase().trim();
                if (!nextIsian[tag] && schoolData[normalized]) {
                    nextIsian[tag] = schoolData[normalized];
                } else if (!nextIsian[tag]) {
                    nextIsian[tag] = '';
                }
            });
            setDataIsian(nextIsian);
        }
    };

    const handleFieldChange = (key: string, value: string) => {
        setDataIsian((prev) => ({
            ...prev,
            [key]: value,
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg(null);

        if (!selectedTemplateId) {
            setErrorMsg('Pilih master template terlebih dahulu.');
            return;
        }

        if (!perihal.trim()) {
            setErrorMsg('Perihal / Judul surat wajib diisi.');
            return;
        }

        setLoading(true);

        const payload = {
            template_id: selectedTemplateId,
            perihal,
            data_isian: dataIsian,
            keterangan: keterangan || null,
        };

        if (isEditing && dokumen?.id) {
            router.put(route('sk-surat.dokumen.update', dokumen.id), payload, {
                onSuccess: () => {
                    onClose();
                },
                onError: (err) => {
                    setErrorMsg(Object.values(err).join(', '));
                },
                onFinish: () => setLoading(false),
            });
        } else {
            router.post(route('sk-surat.dokumen.store', folderId), payload, {
                onSuccess: () => {
                    onClose();
                },
                onError: (err) => {
                    setErrorMsg(Object.values(err).join(', '));
                },
                onFinish: () => setLoading(false),
            });
        }
    };

    return (
        <Modal show={show} onClose={onClose} maxWidth="3xl">
            <form onSubmit={handleSubmit} className="p-6 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 text-gray-900 dark:text-white rounded-2xl max-h-[90vh] flex flex-col">
                <div className="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-slate-800 shrink-0">
                    <div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-slate-100 flex items-center gap-2">
                            <FileEdit className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                            {isEditing ? 'Ubah Isian Surat Dokumen' : 'Buat Surat Baru dari Template Word'}
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                            Isi formulir variabel di bawah ini. Sistem PHPWord akan menyuntikkan data ke template dokumen asli secara otomatis.
                        </p>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto py-4 space-y-5 pr-1 custom-scrollbar">
                    {/* Error Banner */}
                    {errorMsg && (
                        <div className="p-3 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-xl text-rose-700 dark:text-rose-400 text-xs flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <span>{errorMsg}</span>
                        </div>
                    )}

                    {/* Master Template & Perihal Dokumen */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                                Pilih Master Template <span className="text-rose-500">*</span>
                            </label>
                            <select
                                className="w-full bg-gray-50 dark:bg-slate-950 border-gray-300 dark:border-slate-800 text-gray-900 dark:text-slate-200 text-sm rounded-lg focus:border-indigo-500"
                                value={selectedTemplateId}
                                onChange={(e) => handleTemplateChange(Number(e.target.value))}
                                disabled={isEditing || templates.length === 0}
                                required
                            >
                                {templates.length === 0 && <option value="">Tidak ada template tersedia</option>}
                                {templates.map((t) => (
                                    <option key={t.id} value={t.id}>
                                        {t.judul} ({t.file_name_original})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                                Perihal / Judul Surat <span className="text-rose-500">*</span>
                            </label>
                            <TextInput
                                type="text"
                                className="w-full bg-gray-50 dark:bg-slate-950 border-gray-300 dark:border-slate-800 text-gray-900 dark:text-slate-200 text-sm focus:border-indigo-500"
                                placeholder="Contoh: SK Tim Manajemen BOSP TA 2026"
                                value={perihal}
                                onChange={(e) => setPerihal(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    {/* Dynamic Variable Inputs */}
                    <div className="pt-4 border-t border-gray-200 dark:border-slate-800/80">
                        <div className="flex items-center justify-between mb-3">
                            <div>
                                <h4 className="text-xs font-semibold text-gray-700 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                                    <Sparkles className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                                    Isian Variabel Template
                                </h4>
                                <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-0.5">
                                    Semua variabel di bawah ini otomatis dideteksi dari template Word Anda.
                                </p>
                            </div>
                            <span className="text-[11px] text-gray-500 dark:text-slate-400 font-mono">
                                {activeTemplate?.detected_variables?.length || 0} variabel
                            </span>
                        </div>

                        {!activeTemplate || !activeTemplate.detected_variables || activeTemplate.detected_variables.length === 0 ? (
                            <div className="p-4 bg-gray-50/50 dark:bg-slate-950/40 border border-gray-200 dark:border-slate-800 rounded-xl text-center">
                                <AlertCircle className="w-6 h-6 text-amber-500 dark:text-amber-400 mx-auto mb-1.5" />
                                <p className="text-xs text-gray-600 dark:text-slate-400">
                                    Template ini belum memiliki tag variabel <code className="text-indigo-600 dark:text-indigo-300">{'${...}'}</code>.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-3 bg-gray-50 dark:bg-slate-950/50 p-4 border border-gray-200 dark:border-slate-800/80 rounded-xl max-h-72 overflow-y-auto custom-scrollbar">
                                {activeTemplate.detected_variables.map((tag) => {
                                    const normalized = tag.toLowerCase().trim();
                                    const isAutoFilled = Boolean(schoolData[normalized]);

                                    return (
                                        <div key={tag} className="grid grid-cols-1 md:grid-cols-3 gap-2 items-center">
                                            <div className="text-xs font-medium text-gray-700 dark:text-slate-300 flex items-center gap-1.5">
                                                <code className="px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/80 border border-indigo-200 dark:border-indigo-500/30 text-indigo-700 dark:text-indigo-300 font-mono text-[11px]">
                                                    {`\${${tag}}`}
                                                </code>
                                                {isAutoFilled && (
                                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-400">
                                                        Profil SIKAS
                                                    </span>
                                                )}
                                            </div>

                                            <div className="md:col-span-2">
                                                <TextInput
                                                    type="text"
                                                    className="w-full bg-white dark:bg-slate-900 border-gray-300 dark:border-slate-800 text-gray-900 dark:text-slate-200 text-xs focus:border-indigo-500"
                                                    placeholder={`Masukkan isian untuk \${${tag}}`}
                                                    value={dataIsian[tag] ?? ''}
                                                    onChange={(e) => handleFieldChange(tag, e.target.value)}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Keterangan Tambahan */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                            Keterangan Tambahan (Opsional)
                        </label>
                        <textarea
                            className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-300 dark:border-slate-800 text-gray-900 dark:text-slate-200 text-xs rounded-lg focus:border-indigo-500 placeholder:text-gray-400 dark:placeholder:text-slate-600"
                            rows={2}
                            placeholder="Catatan peruntukan atau ringkasan surat ini..."
                            value={keterangan}
                            onChange={(e) => setKeterangan(e.target.value)}
                        />
                    </div>
                </div>

                <div className="mt-4 pt-3 border-t border-gray-200 dark:border-slate-800 flex justify-end gap-3 shrink-0">
                    <SecondaryButton type="button" onClick={onClose} disabled={loading} className="border-gray-300 dark:border-slate-800 text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800">
                        Batal
                    </SecondaryButton>
                    <PrimaryButton type="submit" disabled={loading} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                        {loading ? 'Menyimpan...' : isEditing ? 'Simpan Perubahan' : 'Simpan Surat Dokumen'}
                    </PrimaryButton>
                </div>
            </form>
        </Modal>
    );
}
