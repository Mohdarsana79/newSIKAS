import React, { useState, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import { TextStyle, FontSize, LineHeight } from '@tiptap/extension-text-style';
import { FontFamily } from '@tiptap/extension-font-family';
import { Color } from '@tiptap/extension-color';
import { Highlight } from '@tiptap/extension-highlight';
import { Subscript } from '@tiptap/extension-subscript';
import { Superscript } from '@tiptap/extension-superscript';
import { toBlob, toPng } from 'html-to-image';
import { router } from '@inertiajs/react';
import Swal from 'sweetalert2';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import Modal from '@/Components/Modal';
import { applyTextCase } from './KopTiptapExtensions';
import {
    Bold,
    Italic,
    Underline as UnderlineIcon,
    Strikethrough,
    Subscript as SubscriptIcon,
    Superscript as SuperscriptIcon,
    AlignLeft,
    AlignCenter,
    AlignRight,
    AlignJustify,
    List,
    ListOrdered,
    Undo2,
    Redo2,
    RemoveFormatting,
    Type,
    Download,
    Eye,
    Save,
    Upload,
    Trash2,
    Check,
    Layers,
    Sparkles,
    Image as ImageIcon,
    Building2,
    School,
    RotateCcw,
    ChevronDown,
    Palette,
    Highlighter,
} from 'lucide-react';

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
    logo_daerah?: string;
    logo_sekolah?: string;
    kop_mode?: string;
    kop_teks_html?: string;
    kop_jenis?: string;
}

interface KopSuratBuilderProps {
    sekolah: Sekolah;
}

const FONT_FAMILIES = [
    { label: 'Times New Roman', value: "'Times New Roman', Times, serif" },
    { label: 'Arial', value: 'Arial, Helvetica, sans-serif' },
    { label: 'Calibri', value: "Calibri, 'Segoe UI', Candara, sans-serif" },
    { label: 'Arial Black', value: "'Arial Black', Gadget, sans-serif" },
    { label: 'Georgia', value: 'Georgia, serif' },
    { label: 'Tahoma', value: 'Tahoma, Verdana, Segoe, sans-serif' },
    { label: 'Trebuchet MS', value: "'Trebuchet MS', sans-serif" },
    { label: 'Verdana', value: 'Verdana, Geneva, sans-serif' },
    { label: 'Courier New', value: "'Courier New', Courier, monospace" },
    { label: 'Garamond', value: 'Garamond, Baskerville, serif' },
];

const FONT_SIZES = [
    '8pt', '9pt', '10pt', '11pt', '12pt', '13pt', '14pt', '15pt',
    '16pt', '18pt', '20pt', '22pt', '24pt', '26pt', '28pt', '32pt', '36pt', '48pt'
];

const LINE_HEIGHTS = ['1.0', '1.15', '1.25', '1.5', '2.0'];

const TEXT_COLORS = [
    { label: 'Hitam (Standar)', value: '#000000' },
    { label: 'Abu Gelap', value: '#374151' },
    { label: 'Biru Navy Dinas', value: '#1e3a8a' },
    { label: 'Biru Royal', value: '#2563eb' },
    { label: 'Merah Marun', value: '#991b1b' },
    { label: 'Emas / Coklat', value: '#854d0e' },
    { label: 'Hijau Tua', value: '#166534' },
];

const HIGHLIGHT_COLORS = [
    { label: 'Kuning', value: '#fef08a' },
    { label: 'Hijau', value: '#bbf7d0' },
    { label: 'Biru', value: '#bae6fd' },
    { label: 'Pink', value: '#fbcfe8' },
    { label: 'Oranye', value: '#fed7aa' },
];

export default function KopSuratBuilder({ sekolah }: KopSuratBuilderProps) {
    const previewRef = useRef<HTMLDivElement>(null);

    // Mode: 1_logo atau 2_logo
    const [kopMode, setKopMode] = useState<'1_logo' | '2_logo'>(
        (sekolah.kop_mode as '1_logo' | '2_logo') || '2_logo'
    );

    // Logo Daerah State
    const [logoDaerahFile, setLogoDaerahFile] = useState<File | null>(null);
    const [logoDaerahPreview, setLogoDaerahPreview] = useState<string | null>(
        sekolah.logo_daerah ? `/storage/${sekolah.logo_daerah.replace('public/', '')}` : null
    );
    const [removeLogoDaerah, setRemoveLogoDaerah] = useState(false);

    // Logo Sekolah State
    const [logoSekolahFile, setLogoSekolahFile] = useState<File | null>(null);
    const [logoSekolahPreview, setLogoSekolahPreview] = useState<string | null>(
        sekolah.logo_sekolah ? `/storage/${sekolah.logo_sekolah.replace('public/', '')}` : null
    );
    const [removeLogoSekolah, setRemoveLogoSekolah] = useState(false);

    // Status UI
    const [isSaving, setIsSaving] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
    const [previewModalImgUrl, setPreviewModalImgUrl] = useState<string | null>(null);

    // State Dropdown Toolbar
    const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
    const [isHighlightPickerOpen, setIsHighlightPickerOpen] = useState(false);
    const [isCaseMenuOpen, setIsCaseMenuOpen] = useState(false);

    // Template bawaan kedinasan
    const generateDefaultTemplate = () => {
        const prov = (sekolah?.provinsi || 'PROVINSI').toUpperCase();
        const namaSekolah = (sekolah?.nama_sekolah || 'NAMA SATUAN PENDIDIKAN').toUpperCase();
        const alamat = sekolah?.alamat || 'Jalan Pendidikan No. 1';
        const kec = sekolah?.kecamatan || 'Kecamatan';
        const kab = sekolah?.kabupaten_kota || 'Kabupaten/Kota';
        const npsn = sekolah?.npsn || '12345678';

        return `<p style="text-align: center; font-family: 'Times New Roman', Times, serif; font-size: 13pt; line-height: 1.15; font-weight: bold;">PEMERINTAH DAERAH PROVINSI ${prov}</p>
<p style="text-align: center; font-family: 'Times New Roman', Times, serif; font-size: 14pt; line-height: 1.15; font-weight: bold;">DINAS PENDIDIKAN DAN KEBUDAYAAN</p>
<p style="text-align: center; font-family: 'Times New Roman', Times, serif; font-size: 17pt; line-height: 1.15; font-weight: bold;">${namaSekolah}</p>
<p style="text-align: center; font-family: 'Times New Roman', Times, serif; font-size: 9.5pt; line-height: 1.25; font-style: italic;">${alamat}, Kec. ${kec}, ${kab} - NPSN: ${npsn}</p>`;
    };

    // Initial content
    const initialContent = sekolah.kop_teks_html || generateDefaultTemplate();
    const [editorHtml, setEditorHtml] = useState<string>(initialContent);

    // Konfigurasi Tiptap Editor dengan Ekstensi MS Word Lengkap
    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: {
                    levels: [1, 2, 3],
                },
            }),
            TextStyle,
            FontFamily,
            Color,
            Highlight.configure({ multicolor: true }),
            Subscript,
            Superscript,
            FontSize,
            LineHeight,
            TextAlign.configure({
                types: ['heading', 'paragraph'],
                alignments: ['left', 'center', 'right', 'justify'],
            }),
        ],
        content: initialContent,
        onUpdate: ({ editor }) => {
            setEditorHtml(editor.getHTML());
        },
    });

    // Reset template
    const handleResetTemplate = () => {
        Swal.fire({
            title: 'Kembalikan ke Template Baku?',
            text: 'Teks kop surat saat ini akan diganti dengan susunan baku dinas.',
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#4f46e5',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Ya, Terapkan Template',
            cancelButtonText: 'Batal',
        }).then((result) => {
            if (result.isConfirmed && editor) {
                const defaultTpl = generateDefaultTemplate();
                editor.commands.setContent(defaultTpl);
                setEditorHtml(defaultTpl);
            }
        });
    };

    // Handlers Font Size Grow & Shrink (A^ / Av)
    const handleGrowFont = () => {
        if (!editor) return;
        const currentSize = editor.getAttributes('textStyle').fontSize || '12pt';
        const currentIndex = FONT_SIZES.indexOf(currentSize);
        if (currentIndex !== -1 && currentIndex < FONT_SIZES.length - 1) {
            editor.commands.setFontSize(FONT_SIZES[currentIndex + 1]);
        } else {
            const numeric = parseInt(currentSize, 10) || 12;
            editor.commands.setFontSize(`${numeric + 2}pt`);
        }
    };

    const handleShrinkFont = () => {
        if (!editor) return;
        const currentSize = editor.getAttributes('textStyle').fontSize || '12pt';
        const currentIndex = FONT_SIZES.indexOf(currentSize);
        if (currentIndex > 0) {
            editor.commands.setFontSize(FONT_SIZES[currentIndex - 1]);
        } else {
            const numeric = parseInt(currentSize, 10) || 12;
            if (numeric > 6) {
                editor.commands.setFontSize(`${numeric - 2}pt`);
            }
        }
    };

    // Helper membaca file gambar ke Data URL Base64 (anti-gagal render canvas)
    const readFileAsDataUrl = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    };

    // Handler Upload Logo Daerah
    const handleLogoDaerahChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setLogoDaerahFile(file);
            setRemoveLogoDaerah(false);
            try {
                const dataUrl = await readFileAsDataUrl(file);
                setLogoDaerahPreview(dataUrl);
            } catch (err) {
                console.error('Gagal membaca logo daerah', err);
            }
        }
    };

    const handleHapusLogoDaerah = () => {
        setLogoDaerahFile(null);
        setLogoDaerahPreview(null);
        setRemoveLogoDaerah(true);
    };

    // Handler Upload Logo Sekolah
    const handleLogoSekolahChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setLogoSekolahFile(file);
            setRemoveLogoSekolah(false);
            try {
                const dataUrl = await readFileAsDataUrl(file);
                setLogoSekolahPreview(dataUrl);
            } catch (err) {
                console.error('Gagal membaca logo sekolah', err);
            }
        }
    };

    const handleHapusLogoSekolah = () => {
        setLogoSekolahFile(null);
        setLogoSekolahPreview(null);
        setRemoveLogoSekolah(true);
    };

    // Render Canvas ke Blob resolusi tinggi (2480px)
    const renderHighResKopBlob = async (): Promise<Blob | null> => {
        if (!previewRef.current) return null;
        const element = previewRef.current;
        const elementWidth = element.offsetWidth || 800;
        const pixelRatio = Math.max(3, Math.min(5, 2480 / elementWidth));

        return await toBlob(element, {
            pixelRatio,
            backgroundColor: '#ffffff',
            cacheBust: false,
            quality: 0.98,
            imagePlaceholder: 'data:image/svg+xml;charset=utf-8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"/>',
        });
    };

    // Handler Simpan Kop Surat
    const handleSaveKop = async () => {
        if (!previewRef.current || !editor) return;

        setIsSaving(true);
        try {
            const blob = await renderHighResKopBlob();
            if (!blob) {
                throw new Error('Gagal merender gambar pratinjau kop surat.');
            }

            const formData = new FormData();
            const generatedFile = new File([blob], 'kop_surat.png', { type: 'image/png' });

            formData.append('generated_kop', generatedFile);
            formData.append('kop_mode', kopMode);
            formData.append('kop_teks_html', editor.getHTML());

            if (logoDaerahFile) {
                formData.append('logo_daerah', logoDaerahFile);
            } else if (removeLogoDaerah) {
                formData.append('remove_logo_daerah', '1');
            }

            if (logoSekolahFile) {
                formData.append('logo_sekolah', logoSekolahFile);
            } else if (removeLogoSekolah) {
                formData.append('remove_logo_sekolah', '1');
            }

            router.post(route('sekolah-profile.save-builder-kop', sekolah.id), formData, {
                forceFormData: true,
                onSuccess: () => {
                    Swal.fire({
                        title: 'Berhasil!',
                        text: 'Kop surat sekolah berhasil digenerate dan disimpan ke profil sekolah. Seluruh dokumen PDF laporan kini otomatis menggunakan kop baru ini.',
                        icon: 'success',
                        confirmButtonColor: '#4f46e5',
                    });
                },
                onError: (errors) => {
                    const firstError = Object.values(errors)[0] || 'Terjadi kesalahan saat menyimpan data.';
                    Swal.fire({
                        title: 'Gagal Menyimpan',
                        text: String(firstError),
                        icon: 'error',
                        confirmButtonColor: '#ef4444',
                    });
                },
                onFinish: () => {
                    setIsSaving(false);
                },
            });
        } catch (error: any) {
            console.error('Error generating kop:', error);
            setIsSaving(false);
            Swal.fire({
                title: 'Kesalahan Sistem',
                text: error?.message || 'Gagal memproses gambar kop surat.',
                icon: 'error',
                confirmButtonColor: '#ef4444',
            });
        }
    };

    // Handler Unduh PNG
    const handleDownloadPng = async () => {
        if (!previewRef.current) return;

        setIsDownloading(true);
        try {
            const element = previewRef.current;
            const elementWidth = element.offsetWidth || 800;
            const pixelRatio = Math.max(3, Math.min(5, 2480 / elementWidth));

            const dataUrl = await toPng(element, {
                pixelRatio,
                backgroundColor: '#ffffff',
                cacheBust: false,
                quality: 0.98,
                imagePlaceholder: 'data:image/svg+xml;charset=utf-8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"/>',
            });

            const link = document.createElement('a');
            const cleanSchoolName = (sekolah?.nama_sekolah || 'Sekolah').replace(/[^a-zA-Z0-9]/g, '_');
            link.download = `Kop_Surat_${cleanSchoolName}.png`;
            link.href = dataUrl;
            link.click();

            Swal.fire({
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 3000,
                icon: 'success',
                title: 'File Kop Surat (PNG) berhasil diunduh.',
            });
        } catch (error) {
            console.error('Error downloading PNG:', error);
            Swal.fire({
                title: 'Gagal Mengunduh',
                text: 'Terjadi kendala saat menghasilkan file gambar.',
                icon: 'error',
            });
        } finally {
            setIsDownloading(false);
        }
    };

    // Handler Zoom Preview
    const handleOpenPreviewModal = async () => {
        if (!previewRef.current) return;
        try {
            const dataUrl = await toPng(previewRef.current, {
                backgroundColor: '#ffffff',
                cacheBust: false,
                imagePlaceholder: 'data:image/svg+xml;charset=utf-8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"/>',
            });
            setPreviewModalImgUrl(dataUrl);
            setIsPreviewModalOpen(true);
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <div className="space-y-8">
            {/* Header Pengantar */}
            <div className="bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 border border-indigo-200 dark:border-indigo-900/50 rounded-2xl p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                            Editor & Pembuat Kop Surat Sekolah (MS Word Style)
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            Atur logo daerah, logo sekolah, dan ketik isi kop surat secara bebas dengan toolbar lengkap Microsoft Word (Font Family, Font Size, Spasi Baris, Gaya, dan Warna).
                        </p>
                    </div>

                    <div className="flex items-center gap-2 self-start md:self-auto">
                        <SecondaryButton
                            onClick={handleOpenPreviewModal}
                            className="flex items-center gap-1.5 text-xs py-2"
                        >
                            <Eye className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                            Perbesar Preview
                        </SecondaryButton>
                        <SecondaryButton
                            onClick={handleDownloadPng}
                            disabled={isDownloading}
                            className="flex items-center gap-1.5 text-xs py-2 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-950"
                        >
                            {isDownloading ? (
                                <span className="animate-spin mr-1">⌛</span>
                            ) : (
                                <Download className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                            )}
                            Unduh Kop (PNG)
                        </SecondaryButton>
                        <PrimaryButton
                            onClick={handleSaveKop}
                            disabled={isSaving}
                            className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-xs py-2 shadow-md flex items-center gap-1.5"
                        >
                            {isSaving ? (
                                <>
                                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Menyimpan...
                                </>
                            ) : (
                                <>
                                    <Save className="w-4 h-4 mr-1" />
                                    Simpan Kop Surat
                                </>
                            )}
                        </PrimaryButton>
                    </div>
                </div>
            </div>

            {/* LIVE PREVIEW SECTION */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50/70 dark:bg-gray-750 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="flex h-3 w-3 relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                        </span>
                        <h4 className="font-semibold text-gray-800 dark:text-gray-200 text-sm">
                            Pratinjau Langsung (Live Preview Kop Surat)
                        </h4>
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                        Rasio Cetak Standar (2480 &times; 588 px)
                    </span>
                </div>

                <div className="p-4 sm:p-6 bg-gray-100 dark:bg-gray-900/60 overflow-x-auto flex justify-center">
                    {/* WADAH YANG AKAN DI-RENDER KE CANVAS/IMAGE */}
                    <div
                        ref={previewRef}
                        className="bg-white text-gray-900 w-full max-w-4xl p-5 sm:p-7 shadow-md rounded-md flex flex-col justify-between select-none"
                        style={{
                            minHeight: '175px',
                            boxSizing: 'border-box',
                        }}
                    >
                        {/* Baris Logo dan Teks Kop */}
                        <div className="flex items-center justify-between gap-4 w-full flex-1">
                            {/* 1. Sisi Kiri: Logo Daerah */}
                            <div className="w-24 sm:w-28 flex-shrink-0 flex items-center justify-center">
                                {logoDaerahPreview ? (
                                    <img
                                        src={logoDaerahPreview}
                                        alt="Logo Daerah"
                                        className="max-h-24 sm:max-h-28 max-w-full object-contain"
                                        onError={() => setLogoDaerahPreview(null)}
                                    />
                                ) : (
                                    <div className="w-20 h-20 sm:w-24 sm:h-24 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center text-gray-400 p-2 text-center text-xs">
                                        <Building2 className="w-6 h-6 mb-1 text-gray-300" />
                                        <span>Logo Pemda</span>
                                    </div>
                                )}
                            </div>

                            {/* 2. Sisi Tengah: Teks Kop Sekolah (Mengikuti Styling Akurat MS Word) */}
                            <div className="flex-1 text-center px-3 overflow-hidden">
                                <style>{`
                                    .kop-live-content {
                                        color: #000000;
                                    }
                                    .kop-live-content p {
                                        margin: 0 !important;
                                        padding: 0 !important;
                                    }
                                    .kop-live-content h1,
                                    .kop-live-content h2,
                                    .kop-live-content h3 {
                                        margin: 0 !important;
                                        padding: 0 !important;
                                    }
                                    .kop-live-content ul {
                                        list-style-type: disc;
                                        margin: 0 !important;
                                        padding-left: 1.5rem !important;
                                    }
                                    .kop-live-content ol {
                                        list-style-type: decimal;
                                        margin: 0 !important;
                                        padding-left: 1.5rem !important;
                                    }
                                `}</style>
                                <div
                                    className="kop-live-content"
                                    dangerouslySetInnerHTML={{ __html: editorHtml }}
                                />
                            </div>

                            {/* 3. Sisi Kanan: Logo Sekolah ATAU Spacer Simetris */}
                            <div className="w-24 sm:w-28 flex-shrink-0 flex items-center justify-center">
                                {kopMode === '2_logo' ? (
                                    logoSekolahPreview ? (
                                        <img
                                            src={logoSekolahPreview}
                                            alt="Logo Sekolah"
                                            className="max-h-24 sm:max-h-28 max-w-full object-contain"
                                            onError={() => setLogoSekolahPreview(null)}
                                        />
                                    ) : (
                                        <div className="w-20 h-20 sm:w-24 sm:h-24 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center text-gray-400 p-2 text-center text-xs">
                                            <School className="w-6 h-6 mb-1 text-gray-300" />
                                            <span>Logo Sekolah</span>
                                        </div>
                                    )
                                ) : (
                                    /* Spacer penyeimbang simetris untuk mode 1 logo */
                                    <div className="w-24 sm:w-28 opacity-0 pointer-events-none" />
                                )}
                            </div>
                        </div>

                        {/* 4. Garis Pembatas Resmi Dinas (Garis Ganda Tebal-Tipis) */}
                        <div className="w-full mt-3.5 pt-1">
                            <div className="w-full border-t-[3px] border-black"></div>
                            <div className="w-full border-t-[1px] border-black mt-[2px]"></div>
                        </div>
                    </div>
                </div>
            </div>

            {/* PENGATURAN MODE & UPLOAD LOGO */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* 1. Pengaturan Mode Logo */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                    <h4 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2 mb-4 text-sm">
                        <Layers className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        Pilihan Susunan Logo
                    </h4>

                    <div className="space-y-3">
                        <label
                            className={`flex items-start p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                                kopMode === '2_logo'
                                    ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/20 dark:border-indigo-500'
                                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                            }`}
                        >
                            <input
                                type="radio"
                                name="kop_mode"
                                value="2_logo"
                                checked={kopMode === '2_logo'}
                                onChange={() => setKopMode('2_logo')}
                                className="mt-1 h-4 w-4 text-indigo-600 focus:ring-indigo-500"
                            />
                            <div className="ml-3">
                                <span className="block text-sm font-semibold text-gray-900 dark:text-gray-100">
                                    2 Logo (Rekomendasi Dinas)
                                </span>
                                <span className="block text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                    Logo Daerah di sebelah kiri & Logo Sekolah di sebelah kanan.
                                </span>
                            </div>
                        </label>

                        <label
                            className={`flex items-start p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                                kopMode === '1_logo'
                                    ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/20 dark:border-indigo-500'
                                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                            }`}
                        >
                            <input
                                type="radio"
                                name="kop_mode"
                                value="1_logo"
                                checked={kopMode === '1_logo'}
                                onChange={() => setKopMode('1_logo')}
                                className="mt-1 h-4 w-4 text-indigo-600 focus:ring-indigo-500"
                            />
                            <div className="ml-3">
                                <span className="block text-sm font-semibold text-gray-900 dark:text-gray-100">
                                    1 Logo (Hanya Logo Daerah)
                                </span>
                                <span className="block text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                    Logo Daerah di sebelah kiri, teks kop tetap simetris rata tengah.
                                </span>
                            </div>
                        </label>
                    </div>
                </div>

                {/* 2. Upload Logo Daerah (Kiri) */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <h4 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2 text-sm">
                                <Building2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                                Logo Daerah (Kiri)
                            </h4>
                            <span className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-medium">
                                Sisi Kiri
                            </span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                            Lambang Pemerintah Provinsi / Kabupaten / Kota. Format PNG/JPG maks 2MB.
                        </p>

                        <div className="flex items-center gap-4">
                            <div className="w-20 h-20 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-750 flex items-center justify-center overflow-hidden flex-shrink-0 p-1">
                                {logoDaerahPreview ? (
                                    <img
                                        src={logoDaerahPreview}
                                        alt="Logo Daerah Preview"
                                        className="max-h-full max-w-full object-contain"
                                        onError={() => setLogoDaerahPreview(null)}
                                    />
                                ) : (
                                    <ImageIcon className="w-8 h-8 text-gray-300 dark:text-gray-600" />
                                )}
                            </div>

                            <div className="flex-1 space-y-2">
                                <label className="inline-flex items-center justify-center px-3.5 py-1.5 border border-indigo-600 dark:border-indigo-500 rounded-lg text-xs font-medium text-indigo-600 dark:text-indigo-400 bg-transparent hover:bg-indigo-50 dark:hover:bg-indigo-950/40 cursor-pointer transition">
                                    <Upload className="w-3.5 h-3.5 mr-1.5" />
                                    {logoDaerahPreview ? 'Ganti Logo' : 'Unggah Logo'}
                                    <input
                                        type="file"
                                        accept="image/png,image/jpeg,image/jpg,image/svg+xml"
                                        onChange={handleLogoDaerahChange}
                                        className="hidden"
                                    />
                                </label>

                                {logoDaerahPreview && (
                                    <div>
                                        <button
                                            type="button"
                                            onClick={handleHapusLogoDaerah}
                                            className="text-xs text-rose-600 hover:text-rose-700 dark:text-rose-400 flex items-center gap-1 font-medium transition"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                            Hapus Logo
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* 3. Upload Logo Sekolah (Kanan) */}
                <div
                    className={`bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col justify-between transition-opacity ${
                        kopMode === '1_logo' ? 'opacity-40 pointer-events-none' : ''
                    }`}
                >
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <h4 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2 text-sm">
                                <School className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                                Logo Sekolah (Kanan)
                            </h4>
                            <span className="text-[11px] px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 font-medium">
                                Sisi Kanan
                            </span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                            Logo Tut Wuri Handayani atau Lambang Khusus Sekolah Anda.
                        </p>

                        <div className="flex items-center gap-4">
                            <div className="w-20 h-20 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-750 flex items-center justify-center overflow-hidden flex-shrink-0 p-1">
                                {logoSekolahPreview ? (
                                    <img
                                        src={logoSekolahPreview}
                                        alt="Logo Sekolah Preview"
                                        className="max-h-full max-w-full object-contain"
                                        onError={() => setLogoSekolahPreview(null)}
                                    />
                                ) : (
                                    <ImageIcon className="w-8 h-8 text-gray-300 dark:text-gray-600" />
                                )}
                            </div>

                            <div className="flex-1 space-y-2">
                                <label className="inline-flex items-center justify-center px-3.5 py-1.5 border border-purple-600 dark:border-purple-500 rounded-lg text-xs font-medium text-purple-600 dark:text-purple-400 bg-transparent hover:bg-purple-50 dark:hover:bg-purple-950/40 cursor-pointer transition">
                                    <Upload className="w-3.5 h-3.5 mr-1.5" />
                                    {logoSekolahPreview ? 'Ganti Logo' : 'Unggah Logo'}
                                    <input
                                        type="file"
                                        accept="image/png,image/jpeg,image/jpg,image/svg+xml"
                                        onChange={handleLogoSekolahChange}
                                        disabled={kopMode === '1_logo'}
                                        className="hidden"
                                    />
                                </label>

                                {logoSekolahPreview && (
                                    <div>
                                        <button
                                            type="button"
                                            onClick={handleHapusLogoSekolah}
                                            disabled={kopMode === '1_logo'}
                                            className="text-xs text-rose-600 hover:text-rose-700 dark:text-rose-400 flex items-center gap-1 font-medium transition"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                            Hapus Logo
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* EDITOR TIPTAP DENGAN RIBBON BAR MS WORD LENGKAP */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="px-6 py-3.5 border-b border-gray-200 dark:border-gray-700 bg-gray-50/70 dark:bg-gray-750 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                        <h4 className="font-semibold text-gray-900 dark:text-gray-100 text-sm flex items-center gap-2">
                            <span className="p-1 rounded bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400">
                                📝
                            </span>
                            Pita Menu Format Teks (MS Word Ribbon)
                        </h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            Gunakan alat formatting lengkap di bawah ini untuk menata huruf, ukuran, perataan, warna, dan spasi.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={handleResetTemplate}
                        className="self-start sm:self-auto inline-flex items-center gap-1.5 text-xs font-medium text-gray-600 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400 py-1.5 px-3 rounded-lg border border-gray-300 dark:border-gray-600 hover:border-indigo-300 transition"
                    >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Reset ke Template Baku
                    </button>
                </div>

                {/* MS WORD RIBBON BAR (2 BARIS TERORGANISIR) */}
                {editor && (
                    <div className="border-b border-gray-200 dark:border-gray-700 bg-gray-100/70 dark:bg-gray-800/90 divide-y divide-gray-200 dark:divide-gray-700 text-xs">
                        {/* BARIS 1: FONT UTAMA, UKURAN, CAPITALIZATION & HISTORY */}
                        <div className="px-4 py-2 flex flex-wrap items-center gap-2">
                            {/* 1. Font Family Dropdown */}
                            <div className="flex items-center bg-white dark:bg-gray-700 rounded-lg border border-gray-300 dark:border-gray-600 px-2 py-1 shadow-sm">
                                <span className="text-gray-400 mr-1 text-[11px] font-mono">Font:</span>
                                <select
                                    value={editor.getAttributes('textStyle').fontFamily || "'Times New Roman', Times, serif"}
                                    onChange={(e) => editor.chain().focus().setFontFamily(e.target.value).run()}
                                    className="bg-transparent border-0 text-xs text-gray-800 dark:text-gray-100 py-0 pl-1 pr-6 focus:ring-0 cursor-pointer font-medium"
                                >
                                    {FONT_FAMILIES.map((font) => (
                                        <option key={font.value} value={font.value} className="text-gray-900 bg-white">
                                            {font.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* 2. Font Size Dropdown */}
                            <div className="flex items-center bg-white dark:bg-gray-700 rounded-lg border border-gray-300 dark:border-gray-600 px-2 py-1 shadow-sm">
                                <span className="text-gray-400 mr-1 text-[11px] font-mono">Size:</span>
                                <select
                                    value={editor.getAttributes('textStyle').fontSize || '13pt'}
                                    onChange={(e) => editor.chain().focus().setFontSize(e.target.value).run()}
                                    className="bg-transparent border-0 text-xs text-gray-800 dark:text-gray-100 py-0 pl-1 pr-6 focus:ring-0 cursor-pointer font-semibold"
                                >
                                    {FONT_SIZES.map((size) => (
                                        <option key={size} value={size} className="text-gray-900 bg-white">
                                            {size}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* 3. Grow / Shrink Font Buttons (A^ / Av) */}
                            <div className="flex items-center bg-white dark:bg-gray-700 rounded-lg border border-gray-300 dark:border-gray-600 p-0.5 shadow-sm">
                                <button
                                    type="button"
                                    onClick={handleGrowFont}
                                    title="Perbesar Ukuran Font (Grow Font)"
                                    className="px-2 py-1 text-xs font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 rounded flex items-center"
                                >
                                    A<span className="text-[10px] ml-0.5">▲</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={handleShrinkFont}
                                    title="Perkecil Ukuran Font (Shrink Font)"
                                    className="px-2 py-1 text-xs font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 rounded flex items-center"
                                >
                                    A<span className="text-[10px] ml-0.5">▼</span>
                                </button>
                            </div>

                            {/* 4. Ubah Kapitalisasi (Change Case Aa) */}
                            <div className="relative">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsCaseMenuOpen(!isCaseMenuOpen);
                                        setIsColorPickerOpen(false);
                                        setIsHighlightPickerOpen(false);
                                    }}
                                    title="Ubah Kapitalisasi Huruf (Change Case)"
                                    className="flex items-center gap-1 bg-white dark:bg-gray-700 rounded-lg border border-gray-300 dark:border-gray-600 px-2 py-1 shadow-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 font-medium"
                                >
                                    <span className="font-bold">Aa</span>
                                    <ChevronDown className="w-3 h-3 text-gray-400" />
                                </button>

                                {isCaseMenuOpen && (
                                    <div className="absolute left-0 mt-1 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-1.5 z-20 space-y-1">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                applyTextCase(editor, 'uppercase');
                                                setIsCaseMenuOpen(false);
                                            }}
                                            className="w-full text-left px-2.5 py-1.5 text-xs hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg text-gray-800 dark:text-gray-200 font-semibold"
                                        >
                                            HURUF BESAR (UPPERCASE)
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                applyTextCase(editor, 'capitalize');
                                                setIsCaseMenuOpen(false);
                                            }}
                                            className="w-full text-left px-2.5 py-1.5 text-xs hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg text-gray-800 dark:text-gray-200"
                                        >
                                            Huruf Besar Tiap Kata
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                applyTextCase(editor, 'lowercase');
                                                setIsCaseMenuOpen(false);
                                            }}
                                            className="w-full text-left px-2.5 py-1.5 text-xs hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg text-gray-800 dark:text-gray-200"
                                        >
                                            huruf kecil (lowercase)
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className="h-5 w-[1px] bg-gray-300 dark:bg-gray-600 mx-1"></div>

                            {/* 5. Undo & Redo */}
                            <div className="flex items-center bg-white dark:bg-gray-700 rounded-lg border border-gray-300 dark:border-gray-600 p-0.5 shadow-sm">
                                <button
                                    type="button"
                                    onClick={() => editor.chain().focus().undo().run()}
                                    disabled={!editor.can().undo()}
                                    title="Undo (Ctrl+Z)"
                                    className="p-1 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 rounded disabled:opacity-30"
                                >
                                    <Undo2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => editor.chain().focus().redo().run()}
                                    disabled={!editor.can().redo()}
                                    title="Redo (Ctrl+Y)"
                                    className="p-1 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 rounded disabled:opacity-30"
                                >
                                    <Redo2 className="w-3.5 h-3.5" />
                                </button>
                            </div>

                            {/* 6. Clear Formatting (Penghapus Format) */}
                            <button
                                type="button"
                                onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
                                title="Hapus Semua Format (Clear Formatting)"
                                className="flex items-center gap-1 bg-white dark:bg-gray-700 rounded-lg border border-gray-300 dark:border-gray-600 px-2 py-1 shadow-sm text-gray-700 dark:text-gray-200 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 transition"
                            >
                                <RemoveFormatting className="w-3.5 h-3.5 text-rose-500" />
                                <span className="hidden sm:inline">Hapus Format</span>
                            </button>
                        </div>

                        {/* BARIS 2: GAYA FONT, WARNA, PARAGRAF, SPASI BARIS & LIST */}
                        <div className="px-4 py-2 flex flex-wrap items-center gap-2">
                            {/* 1. Gaya Karakter: Bold, Italic, Underline, Strike, Sub, Super */}
                            <div className="flex items-center bg-white dark:bg-gray-700 rounded-lg border border-gray-300 dark:border-gray-600 p-0.5 shadow-sm">
                                <button
                                    type="button"
                                    onClick={() => editor.chain().focus().toggleBold().run()}
                                    className={`p-1.5 rounded ${
                                        editor.isActive('bold')
                                            ? 'bg-indigo-600 text-white font-bold'
                                            : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600'
                                    }`}
                                    title="Tebal / Bold (Ctrl+B)"
                                >
                                    <Bold className="w-3.5 h-3.5" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => editor.chain().focus().toggleItalic().run()}
                                    className={`p-1.5 rounded ${
                                        editor.isActive('italic')
                                            ? 'bg-indigo-600 text-white font-bold'
                                            : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600'
                                    }`}
                                    title="Miring / Italic (Ctrl+I)"
                                >
                                    <Italic className="w-3.5 h-3.5" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => editor.chain().focus().toggleUnderline().run()}
                                    className={`p-1.5 rounded ${
                                        editor.isActive('underline')
                                            ? 'bg-indigo-600 text-white font-bold'
                                            : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600'
                                    }`}
                                    title="Garis Bawah / Underline (Ctrl+U)"
                                >
                                    <UnderlineIcon className="w-3.5 h-3.5" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => editor.chain().focus().toggleStrike().run()}
                                    className={`p-1.5 rounded ${
                                        editor.isActive('strike')
                                            ? 'bg-indigo-600 text-white font-bold'
                                            : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600'
                                    }`}
                                    title="Coret / Strikethrough"
                                >
                                    <Strikethrough className="w-3.5 h-3.5" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => editor.chain().focus().toggleSubscript().run()}
                                    className={`p-1.5 rounded ${
                                        editor.isActive('subscript')
                                            ? 'bg-indigo-600 text-white font-bold'
                                            : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600'
                                    }`}
                                    title="Subscript (X₂)"
                                >
                                    <SubscriptIcon className="w-3.5 h-3.5" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => editor.chain().focus().toggleSuperscript().run()}
                                    className={`p-1.5 rounded ${
                                        editor.isActive('superscript')
                                            ? 'bg-indigo-600 text-white font-bold'
                                            : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600'
                                    }`}
                                    title="Superscript (X²)"
                                >
                                    <SuperscriptIcon className="w-3.5 h-3.5" />
                                </button>
                            </div>

                            <div className="h-5 w-[1px] bg-gray-300 dark:bg-gray-600 mx-1"></div>

                            {/* 2. Warna Teks (Font Color) */}
                            <div className="relative">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsColorPickerOpen(!isColorPickerOpen);
                                        setIsHighlightPickerOpen(false);
                                        setIsCaseMenuOpen(false);
                                    }}
                                    title="Warna Teks (Font Color)"
                                    className="flex items-center gap-1.5 bg-white dark:bg-gray-700 rounded-lg border border-gray-300 dark:border-gray-600 px-2 py-1 shadow-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50"
                                >
                                    <div className="flex flex-col items-center">
                                        <span className="font-bold text-xs leading-none">A</span>
                                        <div
                                            className="h-1 w-4 mt-0.5 rounded-full"
                                            style={{
                                                backgroundColor: editor.getAttributes('textStyle').color || '#000000',
                                            }}
                                        />
                                    </div>
                                    <ChevronDown className="w-3 h-3 text-gray-400" />
                                </button>

                                {isColorPickerOpen && (
                                    <div className="absolute left-0 mt-1 w-52 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-3 z-20">
                                        <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block mb-2">
                                            Warna Huruf Dinas:
                                        </span>
                                        <div className="grid grid-cols-4 gap-2 mb-3">
                                            {TEXT_COLORS.map((c) => (
                                                <button
                                                    key={c.value}
                                                    type="button"
                                                    onClick={() => {
                                                        editor.chain().focus().setColor(c.value).run();
                                                        setIsColorPickerOpen(false);
                                                    }}
                                                    title={c.label}
                                                    className="w-8 h-8 rounded-lg border border-gray-300 hover:scale-110 transition shadow-sm"
                                                    style={{ backgroundColor: c.value }}
                                                />
                                            ))}
                                        </div>
                                        <div className="pt-2 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
                                            <span className="text-xs text-gray-600 dark:text-gray-300">Warna Bebas:</span>
                                            <input
                                                type="color"
                                                value={editor.getAttributes('textStyle').color || '#000000'}
                                                onChange={(e) => editor.chain().focus().setColor(e.target.value).run()}
                                                className="w-7 h-7 rounded border-0 cursor-pointer p-0"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* 3. Warna Stabilo (Text Highlight) */}
                            <div className="relative">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsHighlightPickerOpen(!isHighlightPickerOpen);
                                        setIsColorPickerOpen(false);
                                        setIsCaseMenuOpen(false);
                                    }}
                                    title="Stabilo / Sorot Teks (Highlight)"
                                    className="flex items-center gap-1.5 bg-white dark:bg-gray-700 rounded-lg border border-gray-300 dark:border-gray-600 px-2 py-1 shadow-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50"
                                >
                                    <Highlighter className="w-3.5 h-3.5 text-amber-500" />
                                    <ChevronDown className="w-3 h-3 text-gray-400" />
                                </button>

                                {isHighlightPickerOpen && (
                                    <div className="absolute left-0 mt-1 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-3 z-20">
                                        <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block mb-2">
                                            Warna Stabilo:
                                        </span>
                                        <div className="flex gap-2 mb-2">
                                            {HIGHLIGHT_COLORS.map((h) => (
                                                <button
                                                    key={h.value}
                                                    type="button"
                                                    onClick={() => {
                                                        editor.chain().focus().toggleHighlight({ color: h.value }).run();
                                                        setIsHighlightPickerOpen(false);
                                                    }}
                                                    title={h.label}
                                                    className="w-7 h-7 rounded-lg border border-gray-300 hover:scale-110 transition"
                                                    style={{ backgroundColor: h.value }}
                                                />
                                            ))}
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                editor.chain().focus().unsetHighlight().run();
                                                setIsHighlightPickerOpen(false);
                                            }}
                                            className="w-full text-center text-xs text-rose-600 py-1 hover:bg-rose-50 rounded"
                                        >
                                            Hapus Stabilo
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className="h-5 w-[1px] bg-gray-300 dark:bg-gray-600 mx-1"></div>

                            {/* 4. Perataan Teks (Alignment: Left, Center, Right, Justify) */}
                            <div className="flex items-center bg-white dark:bg-gray-700 rounded-lg border border-gray-300 dark:border-gray-600 p-0.5 shadow-sm">
                                <button
                                    type="button"
                                    onClick={() => editor.chain().focus().setTextAlign('left').run()}
                                    className={`p-1.5 rounded ${
                                        editor.isActive({ textAlign: 'left' })
                                            ? 'bg-indigo-600 text-white'
                                            : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600'
                                    }`}
                                    title="Rata Kiri"
                                >
                                    <AlignLeft className="w-3.5 h-3.5" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => editor.chain().focus().setTextAlign('center').run()}
                                    className={`p-1.5 rounded ${
                                        editor.isActive({ textAlign: 'center' })
                                            ? 'bg-indigo-600 text-white'
                                            : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600'
                                    }`}
                                    title="Rata Tengah (Default Kop)"
                                >
                                    <AlignCenter className="w-3.5 h-3.5" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => editor.chain().focus().setTextAlign('right').run()}
                                    className={`p-1.5 rounded ${
                                        editor.isActive({ textAlign: 'right' })
                                            ? 'bg-indigo-600 text-white'
                                            : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600'
                                    }`}
                                    title="Rata Kanan"
                                >
                                    <AlignRight className="w-3.5 h-3.5" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => editor.chain().focus().setTextAlign('justify').run()}
                                    className={`p-1.5 rounded ${
                                        editor.isActive({ textAlign: 'justify' })
                                            ? 'bg-indigo-600 text-white'
                                            : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600'
                                    }`}
                                    title="Rata Kiri-Kanan (Justify)"
                                >
                                    <AlignJustify className="w-3.5 h-3.5" />
                                </button>
                            </div>

                            {/* 5. Jarak Antar Baris (Line Spacing) */}
                            <div className="flex items-center bg-white dark:bg-gray-700 rounded-lg border border-gray-300 dark:border-gray-600 px-2 py-1 shadow-sm">
                                <span className="text-gray-400 mr-1 text-[11px] font-mono">Spasi:</span>
                                <select
                                    onChange={(e) => editor.commands.setLineHeight(e.target.value)}
                                    defaultValue="1.15"
                                    className="bg-transparent border-0 text-xs text-gray-800 dark:text-gray-100 py-0 pl-1 pr-6 focus:ring-0 cursor-pointer font-medium"
                                >
                                    {LINE_HEIGHTS.map((lh) => (
                                        <option key={lh} value={lh} className="text-gray-900 bg-white">
                                            {lh}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="h-5 w-[1px] bg-gray-300 dark:bg-gray-600 mx-1"></div>

                            {/* 6. List: Bullet & Numbered */}
                            <div className="flex items-center bg-white dark:bg-gray-700 rounded-lg border border-gray-300 dark:border-gray-600 p-0.5 shadow-sm">
                                <button
                                    type="button"
                                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                                    className={`p-1.5 rounded ${
                                        editor.isActive('bulletList')
                                            ? 'bg-indigo-600 text-white'
                                            : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600'
                                    }`}
                                    title="Bullet List (Daftar Berbutir)"
                                >
                                    <List className="w-3.5 h-3.5" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                                    className={`p-1.5 rounded ${
                                        editor.isActive('orderedList')
                                            ? 'bg-indigo-600 text-white'
                                            : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600'
                                    }`}
                                    title="Numbered List (Daftar Bernomor)"
                                >
                                    <ListOrdered className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Editor Content Area */}
                <div className="p-6 bg-white dark:bg-gray-900 min-h-[220px]">
                    <style>{`
                        .tiptap {
                            outline: none !important;
                            min-height: 160px;
                        }
                        .tiptap p {
                            margin: 0 !important;
                        }
                        .tiptap h1, .tiptap h2, .tiptap h3 {
                            margin: 0 !important;
                        }
                    `}</style>
                    <EditorContent
                        editor={editor}
                        className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 bg-gray-50/50 dark:bg-gray-800/50 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-transparent transition"
                    />
                </div>

                {/* Footer Aksi Simpan */}
                <div className="p-6 border-t border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row items-center justify-between gap-4 bg-gray-50 dark:bg-gray-850">
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                        Format dan ukuran teks yang Anda atur pada editor di atas akan dicerminkan secara persis pada hasil cetak dokumen.
                    </p>

                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        <SecondaryButton
                            onClick={handleDownloadPng}
                            disabled={isDownloading}
                            className="flex-1 sm:flex-initial justify-center"
                        >
                            <Download className="w-4 h-4 mr-1.5" />
                            Unduh Gambar (PNG)
                        </SecondaryButton>
                        <PrimaryButton
                            onClick={handleSaveKop}
                            disabled={isSaving}
                            className="flex-1 sm:flex-initial justify-center bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                        >
                            {isSaving ? (
                                <>
                                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Menyimpan...
                                </>
                            ) : (
                                <>
                                    <Check className="w-4 h-4 mr-1.5" />
                                    Simpan Kop Sekarang
                                </>
                            )}
                        </PrimaryButton>
                    </div>
                </div>
            </div>

            {/* Modal Zoom Preview */}
            <Modal show={isPreviewModalOpen} onClose={() => setIsPreviewModalOpen(false)} maxWidth="4xl">
                <div className="p-6">
                    <div className="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-gray-700 mb-4">
                        <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                            <Eye className="w-5 h-5 text-indigo-600" />
                            Ukuran Penuh Kop Surat Sekolah
                        </h3>
                        <button
                            type="button"
                            onClick={() => setIsPreviewModalOpen(false)}
                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                        >
                            ✕
                        </button>
                    </div>

                    <div className="bg-gray-100 dark:bg-gray-900 p-4 rounded-xl flex items-center justify-center overflow-auto max-h-[70vh]">
                        {previewModalImgUrl && (
                            <img
                                src={previewModalImgUrl}
                                alt="Perbesaran Kop Surat"
                                className="w-full h-auto rounded shadow-md border border-gray-300"
                            />
                        )}
                    </div>

                    <div className="mt-4 flex justify-end">
                        <SecondaryButton onClick={() => setIsPreviewModalOpen(false)}>
                            Tutup
                        </SecondaryButton>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
