import React, { useState, useRef, useCallback, useEffect } from 'react';
import Select from 'react-select';
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
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import Modal from '@/Components/Modal';
import Surface from '@/Components/ui/Surface';
import IconTile, { IconTileTone } from '@/Components/ui/IconTile';
import StatusBadge from '@/Components/ui/StatusBadge';
import { cn } from '@/lib/utils';
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
    CheckCircle2,
    AlertTriangle,
    Layers,
    Sparkles,
    Image as ImageIcon,
    Building2,
    School,
    RotateCcw,
    ChevronDown,
    Palette,
    Highlighter,
    Minus,
    X,
    SlidersHorizontal,
    FileText,
    Maximize2,
    FileSpreadsheet,
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
    kop_border?: 'double' | 'single' | 'none';
    kop_teks_html?: string;
    kop_jenis?: string;
    kop_dokumen?: Record<string, boolean>;
}

interface DocOptionItem {
    key: string;
    label: string;
    desc: string;
}

const RKAS_AWAL_DOCS: DocOptionItem[] = [
    { key: 'rkas_alur_kas', label: 'Alur Kas', desc: 'Laporan alur kas dan rencana penerimaan' },
    { key: 'rkas_lembar_kerja_221', label: 'Lembar Kerja 2.2.1', desc: 'Indikator & tolok ukur kinerja belanja langsung' },
    { key: 'rkas_rincian', label: 'Rincian Belanja', desc: 'Rincian belanja per sub program dan kode rekening' },
    { key: 'rkas_rincian_pencairan', label: 'Rincian Pencairan', desc: 'Rincian rencana pencairan per tahapan & bulan' },
    { key: 'rkas_rka_bulanan', label: 'RKA Bulanan', desc: 'Matriks rencana alokasi belanja bulanan' },
    { key: 'rkas_rka_rekap', label: 'RKA Rekapitulasi', desc: 'Rekapitulasi anggaran per program & sumber dana' },
    { key: 'rkas_rka_tahapan', label: 'RKA Tahapan', desc: 'Alokasi belanja per tahapan pencairan (Tahap 1 & 2)' },
    { key: 'rkas_rka_tahapan_v1', label: 'RKA Tahapan V1', desc: 'Format alternatif RKA Tahapan detail rekening' },
];

const RKAS_PERUBAHAN_DOCS: DocOptionItem[] = [
    { key: 'rkas_perubahan_alur_kas', label: 'Alur Kas Perubahan', desc: 'Laporan arus kas pada periode perubahan' },
    { key: 'rkas_perubahan_lembar_kerja_221', label: 'Lembar Kerja 2.2.1 Perubahan', desc: 'Kertas kerja evaluasi tolok ukur belanja perubahan' },
    { key: 'rkas_perubahan_rincian', label: 'Rincian Belanja Perubahan', desc: 'Perbandingan rincian sebelum dan sesudah perubahan' },
    { key: 'rkas_perubahan_rka_bulanan', label: 'RKA Bulanan Perubahan', desc: 'Matriks alokasi anggaran bulanan periode perubahan' },
    { key: 'rkas_perubahan_rka_rekap', label: 'RKA Rekapitulasi Perubahan', desc: 'Rekapitulasi anggaran pergeseran dan perubahan' },
    { key: 'rkas_perubahan_rka_tahapan', label: 'RKA Tahapan Perubahan', desc: 'Alokasi tahapan belanja pada RKAS Perubahan' },
    { key: 'rkas_perubahan_rka_tahapan_v1', label: 'RKA Tahapan V1 Perubahan', desc: 'Format rincian tahapan V1 periode perubahan' },
    { key: 'rkas_perubahan_rka_tahapan_v2', label: 'RKA Tahapan V2 Perubahan', desc: 'Format komparasi tahapan V2 periode perubahan' },
];

const BKU_DOCS: DocOptionItem[] = [
    { key: 'bku_bkp_bank', label: 'Buku Pembantu Bank', desc: 'Buku transaksi penerimaan & penarikan bank' },
    { key: 'bku_bkp_pembantu', label: 'Buku Pembantu Kas (Tunai)', desc: 'Buku transaksi arus kas tunai bendahara' },
    { key: 'bku_bkp_umum', label: 'Buku Kas Umum (BKU)', desc: 'Buku induk transaksi penatausahaan kas sekolah' },
    { key: 'bku_bkp_pajak', label: 'Buku Pembantu Pajak', desc: 'Buku pungutan & penyetoran PPh 21, 23, PPN' },
    { key: 'bku_rob', label: 'Rincian Objek Belanja (ROB)', desc: 'Realisasi belanja per rincian objek belanja (ROB)' },
    { key: 'bku_reg', label: 'Buku Pembantu Kas Reguler', desc: 'Buku register transaksi kas reguler' },
    { key: 'bku_ba', label: 'Berita Acara Rekonsiliasi Kas', desc: 'Berita acara penutupan dan pemeriksaan kas' },
    { key: 'bku_realisasi', label: 'Laporan Realisasi Anggaran', desc: 'Laporan pertanggungjawaban realisasi belanja BOSP' },
    { key: 'bku_rek_realisasi', label: 'Rekap Realisasi Belanja', desc: 'Rekapitulasi total realisasi belanja per program' },
    { key: 'bku_bhp', label: 'Buku Pembantu Persediaan (BHP)', desc: 'Buku penerimaan & pengeluaran barang persediaan' },
    { key: 'bku_bhm', label: 'Buku Pembantu BMD (BHM)', desc: 'Buku pencatatan barang inventaris milik daerah' },
];

const PELENGKAP_DOCS: DocOptionItem[] = [
    { key: 'pelengkap_kwitansi', label: 'Kwitansi', desc: 'Kwitansi pembayaran Format 1, 2, 3, 4 & Download Semua' },
    { key: 'pelengkap_tanda_terima', label: 'Tanda Terima', desc: 'Tanda terima honor/kegiatan satuan & Download Semua' },
    { key: 'laporan_sptj', label: 'SPTJ', desc: 'Surat Pernyataan Tanggung Jawab Mutlak' },
    { key: 'laporan_spmth', label: 'SPMTH', desc: 'Surat Pernyataan Telah Menerima Hibah' },
    { key: 'laporan_sp2b', label: 'SP2B', desc: 'Surat Permintaan Pengesahan Belanja' },
    { key: 'laporan_lph', label: 'LPH', desc: 'Laporan Penggunaan Hibah' },
];

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
    '16pt', '18pt', '20pt', '22pt', '24pt', '26pt', '28pt', '32pt', '36pt', '48pt',
];

const LINE_HEIGHTS = ['1.0', '1.15', '1.25', '1.5', '2.0'];

interface RibbonSelectOption {
    value: string;
    label: string;
}

const FONT_SIZE_OPTIONS: RibbonSelectOption[] = FONT_SIZES.map((size) => ({
    value: size,
    label: size,
}));

const LINE_HEIGHT_OPTIONS: RibbonSelectOption[] = LINE_HEIGHTS.map((lh) => ({
    value: lh,
    label: lh,
}));

function buildRibbonSelectClassNames(menuWidthClass: string) {
    return {
        container: () => 'relative flex-1 min-w-0',
        control: ({ isFocused }: { isFocused: boolean }) =>
            cn(
                '!min-h-[26px] cursor-pointer rounded-lg px-1.5 py-0.5 text-xs font-bold transition',
                isFocused
                    ? 'bg-lime-200/40 text-slate-900 dark:bg-lime-400/10 dark:text-white'
                    : 'bg-transparent text-slate-800 hover:bg-slate-100/80 dark:text-white dark:hover:bg-white/5',
            ),
        valueContainer: () => 'gap-1 py-0 pr-1',
        singleValue: () => 'truncate text-xs font-bold text-slate-800 dark:text-white',
        input: () =>
            'm-0 p-0 text-xs font-semibold text-slate-800 dark:text-white [&_input]:!border-0 [&_input]:!outline-none [&_input]:!ring-0 [&_input]:!shadow-none',
        indicatorsContainer: () => 'pl-0.5 shrink-0',
        indicatorSeparator: () => 'hidden',
        dropdownIndicator: ({ isFocused }: { isFocused: boolean }) =>
            cn(
                'p-0.5 transition-colors',
                isFocused
                    ? 'text-slate-800 dark:text-lime-300'
                    : 'text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-white',
            ),
        menu: () =>
            cn(
                'z-50 mt-2 left-0 overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-1.5 shadow-float dark:border-white/10 dark:bg-[#1A1728]',
                menuWidthClass,
            ),
        menuList: () => 'sikas-scroll max-h-56 space-y-0.5 overflow-y-auto pr-0.5',
        option: ({ isSelected, isFocused }: { isSelected: boolean; isFocused: boolean }) =>
            cn(
                'flex cursor-pointer items-center justify-between gap-2 rounded-xl px-2.5 py-1.5 text-xs font-semibold transition',
                isSelected
                    ? 'bg-lime-300/85 font-extrabold text-slate-900 dark:bg-lime-400/20 dark:text-lime-300'
                    : isFocused
                      ? 'bg-slate-100 text-slate-900 dark:bg-white/10 dark:text-white'
                      : 'text-slate-700 dark:text-slate-300',
            ),
    };
}

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

const MODAL_GLOW_TONES: Record<'violet' | 'amber' | 'mint' | 'rose', { primary: string; secondary: string }> = {
    violet: {
        primary: 'bg-pastel-lavender/75 dark:bg-brand-500/15',
        secondary: 'bg-pastel-mint/45 dark:bg-mint/10',
    },
    amber: {
        primary: 'bg-pastel-amber/75 dark:bg-amber-500/15',
        secondary: 'bg-pastel-peach/50 dark:bg-peach/10',
    },
    mint: {
        primary: 'bg-pastel-mint/75 dark:bg-mint/15',
        secondary: 'bg-pastel-sky/60 dark:bg-sky/10',
    },
    rose: {
        primary: 'bg-pastel-rose/75 dark:bg-rose-500/15',
        secondary: 'bg-pastel-amber/45 dark:bg-amber-500/10',
    },
};

const BORDER_LABELS: Record<'double' | 'single' | 'none', string> = {
    double: 'Garis Ganda (Resmi Dinas)',
    single: 'Garis Tunggal (Standar)',
    none: 'Tanpa Garis (Polos)',
};

const BORDER_OPTIONS: Array<{
    value: 'double' | 'single' | 'none';
    title: string;
    description: string;
    badgeLabel: string;
    badgeTone: 'violet' | 'neutral' | 'warning';
}> = [
    {
        value: 'double',
        title: 'Garis 2 (Ganda)',
        description: 'Garis tebal-tipis standar resmi tata naskah dinas pemerintah.',
        badgeLabel: 'Resmi Dinas',
        badgeTone: 'violet',
    },
    {
        value: 'single',
        title: 'Garis 1 (Tunggal)',
        description: 'Satu garis solid tegas (2px) yang bersih dan modern.',
        badgeLabel: 'Standar',
        badgeTone: 'neutral',
    },
    {
        value: 'none',
        title: 'Tanpa Garis',
        description: 'Tampilan bersih polos tanpa garis pembatas di bawah kop.',
        badgeLabel: 'Polos',
        badgeTone: 'warning',
    },
];

interface KopModalShellProps {
    show: boolean;
    onClose: () => void;
    maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl';
    glowTone: 'violet' | 'amber' | 'mint' | 'rose';
    iconTone: IconTileTone;
    icon: React.ReactNode;
    title: string;
    subtitle: string;
    badge?: React.ReactNode;
    disabledClose?: boolean;
    children: React.ReactNode;
}

/**
 * Wrapper modal bergaya Neo-Bento dengan ambient pastel glow, header seragam,
 * dan tombol tutup yang konsisten dengan modul Profil Sekolah.
 */
function KopModalShell({
    show,
    onClose,
    maxWidth = 'md',
    glowTone,
    iconTone,
    icon,
    title,
    subtitle,
    badge,
    disabledClose = false,
    children,
}: KopModalShellProps) {
    const glow = MODAL_GLOW_TONES[glowTone];

    return (
        <Modal show={show} onClose={onClose} maxWidth={maxWidth}>
            <div className="relative overflow-hidden rounded-[26px] bg-white dark:bg-[#15131F]">
                <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[26px]">
                    <div className={cn('absolute -right-14 -top-14 h-44 w-44 rounded-full blur-3xl', glow.primary)} />
                    <div className={cn('absolute -bottom-16 -left-14 h-40 w-40 rounded-full blur-3xl', glow.secondary)} />
                </div>

                <div className="relative flex flex-col">
                    <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-6 py-4 dark:border-white/10">
                        <div className="flex min-w-0 items-center gap-3.5">
                            <IconTile tone={iconTone} size="md">
                                {icon}
                            </IconTile>
                            <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                    <h3 className="text-[15.5px] font-extrabold tracking-tight text-slate-900 dark:text-white">
                                        {title}
                                    </h3>
                                    {badge}
                                </div>
                                <p className="mt-0.5 truncate text-xs font-medium text-slate-500 dark:text-slate-400">
                                    {subtitle}
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={disabledClose}
                            aria-label={`Tutup ${title}`}
                            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-white/10 dark:hover:text-white"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>

                    <div className="px-6 py-5">{children}</div>
                </div>
            </div>
        </Modal>
    );
}

/**
 * Builder visual kop surat sekolah dengan live preview, kontrol logo/garis Neo-Bento,
 * dan editor Tiptap bergaya MS Word Ribbon.
 */
export default function KopSuratBuilder({ sekolah }: KopSuratBuilderProps) {
    const previewRef = useRef<HTMLDivElement>(null);

    // Mode: 1_logo atau 2_logo
    const [kopMode, setKopMode] = useState<'1_logo' | '2_logo'>(
        (sekolah.kop_mode as '1_logo' | '2_logo') || '2_logo'
    );

    // Pilihan Garis Pembatas: double, single, atau none
    const [kopBorder, setKopBorder] = useState<'double' | 'single' | 'none'>(
        (sekolah.kop_border as 'double' | 'single' | 'none') || 'double'
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

    // State Modal Konfirmasi & Notifikasi (Pengganti SweetAlert)
    const [isResetModalOpen, setIsResetModalOpen] = useState(false);
    const [isConfirmSaveModalOpen, setIsConfirmSaveModalOpen] = useState(false);
    const [statusModal, setStatusModal] = useState<{
        isOpen: boolean;
        type: 'success' | 'error' | 'info';
        title: string;
        message: string;
    }>({
        isOpen: false,
        type: 'success',
        title: '',
        message: '',
    });

    // Pilihan Dokumen yang Menggunakan Kop Surat
    const [kopDokumen, setKopDokumen] = useState<Record<string, boolean>>(
        sekolah.kop_dokumen || {}
    );
    const [isSavingDocs, setIsSavingDocs] = useState(false);

    const toggleDoc = (key: string) => {
        setKopDokumen((prev) => ({
            ...prev,
            [key]: !prev[key],
        }));
    };

    const selectAllDocs = (items: DocOptionItem[]) => {
        setKopDokumen((prev) => {
            const next = { ...prev };
            items.forEach((item) => {
                next[item.key] = true;
            });
            return next;
        });
    };

    const deselectAllDocs = (items: DocOptionItem[]) => {
        setKopDokumen((prev) => {
            const next = { ...prev };
            items.forEach((item) => {
                next[item.key] = false;
            });
            return next;
        });
    };

    const handleSaveKopDokumen = () => {
        setIsSavingDocs(true);
        router.post(
            route('sekolah-profile.update-kop-dokumen', sekolah.id),
            { kop_dokumen: kopDokumen },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setStatusModal({
                        isOpen: true,
                        type: 'success',
                        title: 'Pengaturan Dokumen Berhasil Disimpan',
                        message: 'Pilihan penggunaan kop surat pada dokumen laporan & pelengkap berhasil diperbarui.',
                    });
                },
                onError: (err) => {
                    const firstErr = Object.values(err)[0] || 'Terjadi kesalahan sistem.';
                    setStatusModal({
                        isOpen: true,
                        type: 'error',
                        title: 'Gagal Menyimpan Pengaturan',
                        message: String(firstErr),
                    });
                },
                onFinish: () => {
                    setIsSavingDocs(false);
                },
            }
        );
    };

    // State Dropdown Toolbar
    const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
    const [isHighlightPickerOpen, setIsHighlightPickerOpen] = useState(false);
    const [isCaseMenuOpen, setIsCaseMenuOpen] = useState(false);
    const [selectedLineHeight, setSelectedLineHeight] = useState<string>('1.15');
    const ribbonRef = useRef<HTMLDivElement>(null);

    const closeAllPopovers = useCallback(() => {
        setIsCaseMenuOpen(false);
        setIsColorPickerOpen(false);
        setIsHighlightPickerOpen(false);
    }, []);

    useEffect(() => {
        const handleMouseDown = (event: MouseEvent) => {
            if (ribbonRef.current && !ribbonRef.current.contains(event.target as Node)) {
                closeAllPopovers();
            }
        };
        document.addEventListener('mousedown', handleMouseDown);
        return () => document.removeEventListener('mousedown', handleMouseDown);
    }, [closeAllPopovers]);

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

    // Reset template modal open & confirm
    const handleResetTemplate = () => {
        setIsResetModalOpen(true);
    };

    const confirmResetTemplate = () => {
        if (editor) {
            const defaultTpl = generateDefaultTemplate();
            editor.commands.setContent(defaultTpl);
            setEditorHtml(defaultTpl);
            setSelectedLineHeight('1.15');
        }
        setIsResetModalOpen(false);
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

    // Render Canvas ke Blob resolusi tinggi (2480px) tanpa garis pembatas (dirender via CSS di PDF)
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
            filter: (node: HTMLElement) => {
                if (node instanceof HTMLElement && node.dataset?.kopBorder === 'true') {
                    return false;
                }
                return true;
            },
        });
    };

    // Eksekusi Simpan Kop Surat setelah konfirmasi modal
    const executeSaveKop = async () => {
        setIsConfirmSaveModalOpen(false);
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
            formData.append('kop_border', kopBorder);
            formData.append('kop_teks_html', editor.getHTML());
            formData.append('kop_dokumen', JSON.stringify(kopDokumen));

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
                    setStatusModal({
                        isOpen: true,
                        type: 'success',
                        title: 'Kop Surat Berhasil Disimpan',
                        message: 'Kop surat sekolah berhasil digenerate dan disimpan ke profil sekolah. Seluruh dokumen PDF laporan kini otomatis menggunakan kop baru ini.',
                    });
                },
                onError: (errors) => {
                    const firstError = Object.values(errors)[0] || 'Terjadi kesalahan saat menyimpan data.';
                    setStatusModal({
                        isOpen: true,
                        type: 'error',
                        title: 'Gagal Menyimpan Kop Surat',
                        message: String(firstError),
                    });
                },
                onFinish: () => {
                    setIsSaving(false);
                },
            });
        } catch (error: any) {
            console.error('Error generating kop:', error);
            setIsSaving(false);
            setStatusModal({
                isOpen: true,
                type: 'error',
                title: 'Kesalahan Sistem',
                message: error?.message || 'Gagal memproses gambar kop surat.',
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

            setStatusModal({
                isOpen: true,
                type: 'success',
                title: 'File Gambar Berhasil Diunduh',
                message: 'File gambar kop surat resolusi tinggi telah berhasil diunduh ke komputer Anda.',
            });
        } catch (error: any) {
            console.error('Error downloading PNG:', error);
            setStatusModal({
                isOpen: true,
                type: 'error',
                title: 'Gagal Mengunduh Gambar',
                message: error?.message || 'Terjadi kendala saat menghasilkan file gambar.',
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

    // Helper kelas tombol aktif di Ribbon Bar
    const ribbonToggleBtnClass = (active: boolean) =>
        cn(
            'rounded-lg p-1.5 transition',
            active
                ? 'bg-lime-300/80 font-bold text-slate-900 ring-1 ring-lime-400/70 dark:bg-lime-400/20 dark:text-lime-300 dark:ring-lime-400/30'
                : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/10'
        );

    const activeFontFamily =
        editor?.getAttributes('textStyle').fontFamily || "'Times New Roman', Times, serif";
    const selectedFontOption =
        FONT_FAMILIES.find((f) => f.value === activeFontFamily) ?? FONT_FAMILIES[0];

    const activeFontSize = editor?.getAttributes('textStyle').fontSize || '13pt';
    const selectedFontSizeOption =
        FONT_SIZE_OPTIONS.find((s) => s.value === activeFontSize) ?? {
            value: activeFontSize,
            label: activeFontSize,
        };

    const activeLineHeight =
        editor?.getAttributes('paragraph').lineHeight ||
        editor?.getAttributes('heading').lineHeight ||
        selectedLineHeight;
    const selectedLineHeightOption =
        LINE_HEIGHT_OPTIONS.find((lh) => lh.value === activeLineHeight) ?? {
            value: activeLineHeight,
            label: activeLineHeight,
        };

    const renderCategoryCard = (
        title: string,
        subtitle: string,
        tone: 'mint' | 'violet' | 'amber' | 'sky',
        items: DocOptionItem[]
    ) => {
        const activeCount = items.filter((item) => Boolean(kopDokumen[item.key])).length;
        const totalCount = items.length;
        const badgeTone =
            activeCount === 0
                ? 'neutral'
                : tone === 'mint'
                  ? 'success'
                  : tone === 'violet'
                    ? 'violet'
                    : tone === 'sky'
                      ? 'info'
                      : 'warning';

        return (
            <div className="flex flex-col rounded-[22px] border border-slate-200/80 bg-slate-50/50 p-4 dark:border-white/10 dark:bg-white/[0.02]">
                <div className="flex items-start justify-between gap-2 border-b border-slate-200/70 pb-3 dark:border-white/10">
                    <div>
                        <div className="flex items-center gap-2">
                            <h5 className="text-[13px] font-extrabold text-slate-900 dark:text-white">
                                {title}
                            </h5>
                            <StatusBadge
                                tone={badgeTone}
                                dot={false}
                                className="text-[10px]"
                            >
                                {activeCount} / {totalCount} Aktif
                            </StatusBadge>
                        </div>
                        <p className="mt-0.5 text-[10.5px] font-medium text-slate-400 dark:text-slate-500">
                            {subtitle}
                        </p>
                    </div>
                </div>

                {/* Quick select buttons */}
                <div className="my-2.5 flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                        Pilihan Dokumen
                    </span>
                    <div className="flex items-center gap-1.5">
                        <button
                            type="button"
                            onClick={() => selectAllDocs(items)}
                            className="rounded-lg px-2 py-1 text-[10px] font-bold text-brand-600 hover:bg-brand-50 dark:text-brand-300 dark:hover:bg-brand-500/10 transition-colors"
                        >
                            Pilih Semua
                        </button>
                        <span className="text-slate-300 dark:text-white/20">|</span>
                        <button
                            type="button"
                            onClick={() => deselectAllDocs(items)}
                            className="rounded-lg px-2 py-1 text-[10px] font-bold text-slate-500 hover:bg-slate-200/60 dark:text-slate-400 dark:hover:bg-white/5 transition-colors"
                        >
                            Batal Semua
                        </button>
                    </div>
                </div>

                {/* List of items */}
                <div className="flex flex-col gap-2 overflow-y-auto max-h-[380px] pr-1">
                    {items.map((item) => {
                        const isChecked = Boolean(kopDokumen[item.key]);
                        return (
                            <button
                                key={item.key}
                                type="button"
                                onClick={() => toggleDoc(item.key)}
                                className={cn(
                                    'group flex w-full items-start gap-2.5 rounded-xl border p-2.5 text-left transition-all duration-150',
                                    isChecked
                                        ? 'border-emerald-300 bg-emerald-50/70 shadow-sm dark:border-mint/30 dark:bg-mint/10'
                                        : 'border-slate-200/70 bg-white hover:border-slate-300 dark:border-white/10 dark:bg-white/[0.02] dark:hover:border-white/20'
                                )}
                            >
                                <div
                                    className={cn(
                                        'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-md border transition-colors',
                                        isChecked
                                            ? 'border-emerald-600 bg-emerald-600 text-white dark:border-mint dark:bg-mint dark:text-slate-950'
                                            : 'border-slate-300 bg-white dark:border-white/20 dark:bg-transparent'
                                    )}
                                >
                                    {isChecked && <Check className="h-3 w-3 stroke-[3]" />}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center justify-between gap-1">
                                        <span
                                            className={cn(
                                                'text-[11.5px] font-bold transition-colors',
                                                isChecked
                                                    ? 'text-emerald-950 dark:text-white'
                                                    : 'text-slate-700 dark:text-slate-200'
                                            )}
                                        >
                                            {item.label}
                                        </span>
                                        {isChecked && (
                                            <span className="shrink-0 text-[9.5px] font-extrabold text-emerald-600 dark:text-mint">
                                                Gunakan Kop
                                            </span>
                                        )}
                                    </div>
                                    <p className="mt-0.5 text-[10px] leading-tight text-slate-400 dark:text-slate-500 line-clamp-2">
                                        {item.desc}
                                    </p>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-5">
            {/* BAGIAN 1: NEO-BENTO HERO HEADER */}
            <div className="sikas-card relative overflow-hidden rounded-[26px] p-5 animate-rise">
                <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[26px]">
                    <div className="absolute -right-14 -top-16 h-48 w-48 rounded-full bg-pastel-lavender/70 blur-3xl dark:bg-brand-500/15" />
                    <div className="absolute -bottom-16 left-8 h-40 w-40 rounded-full bg-pastel-mint/50 blur-3xl dark:bg-mint/10" />
                </div>

                <div className="relative flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
                    <div className="flex min-w-0 items-start gap-3.5 sm:items-center">
                        <IconTile tone="violet" size="lg">
                            <Sparkles />
                        </IconTile>
                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                                <h3 className="text-[15.5px] font-extrabold tracking-tight text-slate-900 dark:text-white">
                                    Editor &amp; Pembuat Kop Surat Sekolah
                                </h3>
                                <StatusBadge tone="violet" dot={false}>
                                    MS Word Style
                                </StatusBadge>
                            </div>
                            <p className="mt-1 text-[11.5px] font-medium text-slate-500 dark:text-slate-400">
                                Susun logo daerah, logo sekolah, garis pembatas kedinasan, serta format teks kop secara bebas dalam satu studio terpadu.
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto">
                        <SecondaryButton
                            onClick={handleOpenPreviewModal}
                            className="flex items-center gap-1.5 py-2 text-xs"
                        >
                            <Maximize2 className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
                            Perbesar Preview
                        </SecondaryButton>
                        <SecondaryButton
                            onClick={handleDownloadPng}
                            disabled={isDownloading}
                            className="flex items-center gap-1.5 py-2 text-xs"
                        >
                            {isDownloading ? (
                                <span className="mr-1 animate-spin">⌛</span>
                            ) : (
                                <Download className="h-3.5 w-3.5 text-brand-600 dark:text-brand-300" />
                            )}
                            Unduh PNG
                        </SecondaryButton>
                        <PrimaryButton
                            onClick={() => setIsConfirmSaveModalOpen(true)}
                            disabled={isSaving}
                            className="flex items-center gap-1.5 py-2 text-xs shadow-md"
                        >
                            {isSaving ? (
                                <>
                                    <svg className="-ml-1 mr-1.5 h-3.5 w-3.5 animate-spin text-current" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    Menyimpan...
                                </>
                            ) : (
                                <>
                                    <Save className="h-3.5 w-3.5" />
                                    Simpan Kop Surat
                                </>
                            )}
                        </PrimaryButton>
                    </div>
                </div>
            </div>

            {/* BAGIAN 2: LIVE PREVIEW STUDIO CANVAS */}
            <Surface padding="none" className="animate-rise" bodyClassName="flex flex-col">
                <div className="flex flex-col justify-between gap-3 border-b border-slate-100 bg-slate-50/70 px-5 py-4 sm:flex-row sm:items-center dark:border-white/5 dark:bg-white/[0.03]">
                    <div className="flex items-center gap-3">
                        <IconTile tone="mint" size="md">
                            <Eye />
                        </IconTile>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2">
                                <span className="relative flex h-2.5 w-2.5 shrink-0">
                                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
                                </span>
                                <h4 className="truncate text-[13.5px] font-extrabold tracking-tight text-slate-900 dark:text-white">
                                    Pratinjau Langsung (Live Preview Kop Surat)
                                </h4>
                            </div>
                            <p className="mt-0.5 text-[10.5px] font-medium text-slate-400 dark:text-slate-500">
                                Perubahan logo, teks, dan garis pembatas tampil langsung sesuai hasil cetak dokumen resmi.
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                        <StatusBadge tone="info" dot={false}>
                            {kopMode === '2_logo' ? '2 Logo Dinas & Sekolah' : '1 Logo Daerah'}
                        </StatusBadge>
                        <StatusBadge tone="violet" dot={false}>
                            {kopBorder === 'double' ? 'Garis Ganda' : kopBorder === 'single' ? 'Garis Tunggal' : 'Tanpa Garis'}
                        </StatusBadge>
                        <StatusBadge tone="neutral" dot={false} className="text-sikas-num">
                            2480 &times; 588 px
                        </StatusBadge>
                    </div>
                </div>

                {/* Kanvas Studio berpola dot-grid */}
                <div className="relative flex justify-center overflow-x-auto bg-slate-100/90 p-5 sm:p-8 dark:bg-[#0E0C16]">
                    <div
                        className="pointer-events-none absolute inset-0 opacity-60 dark:opacity-25"
                        style={{
                            backgroundImage: 'radial-gradient(rgba(100, 116, 139, 0.28) 1px, transparent 1px)',
                            backgroundSize: '18px 18px',
                        }}
                    />

                    {/* BINGKAI KERTAS STUDIO (TIDAK IKUT DI-RENDER KE PNG) */}
                    <div className="w-full max-w-4xl overflow-hidden rounded-xl bg-white shadow-lg ring-1 ring-slate-200/80">
                        {/* WADAH YANG AKAN DI-RENDER KE CANVAS/IMAGE */}
                        <div
                            ref={previewRef}
                            className="relative flex w-full select-none flex-col bg-white px-5 pt-2 pb-0.5 text-gray-900 sm:px-7 sm:pt-2.5 sm:pb-0.5"
                            style={{
                                boxSizing: 'border-box',
                            }}
                        >
                        {/* Baris Logo dan Teks Kop */}
                        <div className="flex w-full flex-1 items-start justify-between gap-4">
                            {/* 1. Sisi Kiri: Logo Daerah */}
                            <div className="flex w-24 flex-shrink-0 items-start justify-center sm:w-28">
                                {logoDaerahPreview ? (
                                    <img
                                        src={logoDaerahPreview}
                                        alt="Logo Daerah"
                                        className="max-h-24 max-w-full object-contain object-top sm:max-h-28"
                                        onError={() => setLogoDaerahPreview(null)}
                                    />
                                ) : (
                                    <div className="flex h-20 w-20 flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 p-2 text-center text-xs text-gray-400 sm:h-24 sm:w-24">
                                        <Building2 className="mb-1 h-6 w-6 text-gray-300" />
                                        <span>Logo Pemda</span>
                                    </div>
                                )}
                            </div>

                            {/* 2. Sisi Tengah: Teks Kop Sekolah (Mengikuti Styling Akurat MS Word) */}
                            <div className="flex-1 overflow-hidden px-3 text-center">
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
                            <div className="flex w-24 flex-shrink-0 items-start justify-center sm:w-28">
                                {kopMode === '2_logo' ? (
                                    logoSekolahPreview ? (
                                        <img
                                            src={logoSekolahPreview}
                                            alt="Logo Sekolah"
                                            className="max-h-24 max-w-full object-contain object-top sm:max-h-28"
                                            onError={() => setLogoSekolahPreview(null)}
                                        />
                                    ) : (
                                        <div className="flex h-20 w-20 flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 p-2 text-center text-xs text-gray-400 sm:h-24 sm:w-24">
                                            <School className="mb-1 h-6 w-6 text-gray-300" />
                                            <span>Logo Sekolah</span>
                                        </div>
                                    )
                                ) : (
                                    /* Spacer penyeimbang simetris untuk mode 1 logo */
                                    <div className="pointer-events-none w-24 opacity-0 sm:w-28" />
                                )}
                            </div>
                        </div>

                        {/* 4. Garis Pembatas Kop Surat (tampil di preview, dikecualikan saat render PNG) */}
                        {kopBorder === 'double' && (
                            <div data-kop-border="true" className="mt-1 w-full pb-2">
                                <div className="w-full border-t-[3px] border-black" />
                                <div className="mt-[2px] w-full border-t-[1px] border-black" />
                            </div>
                        )}
                        {kopBorder === 'single' && (
                            <div data-kop-border="true" className="mt-1 w-full pb-2">
                                <div className="w-full border-t-[2px] border-black" />
                            </div>
                        )}
                        {kopBorder === 'none' && (
                            <div data-kop-border="true" className="mt-1 w-full pb-1" />
                        )}
                        </div>
                    </div>
                </div>
            </Surface>

            {/* BAGIAN 3: BENTO GRID 2-KOLOM TERPADU (LOGO & GARIS PEMBATAS) */}
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
                {/* KOLOM KIRI: Susunan Logo + Upload Logo Kiri & Kanan */}
                <Surface
                    className="lg:col-span-7 animate-rise"
                    icon={
                        <IconTile tone="sky" size="md">
                            <Layers />
                        </IconTile>
                    }
                    title="Susunan & Logo Kop Surat"
                    subtitle="Pilih susunan logo lalu unggah lambang pemerintah daerah dan sekolah."
                    badge={
                        <StatusBadge tone="info" dot={false}>
                            {kopMode === '2_logo' ? 'Mode 2 Logo' : 'Mode 1 Logo'}
                        </StatusBadge>
                    }
                >
                    <div className="space-y-4">
                        {/* Sub-bagian A: Pemilih Mode Susunan Logo */}
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <label
                                className={cn(
                                    'relative flex cursor-pointer items-start gap-3 rounded-2xl border-2 p-3.5 transition-all',
                                    kopMode === '2_logo'
                                        ? 'border-lime-400 bg-lime-200/35 shadow-sm dark:border-lime-400/70 dark:bg-lime-400/10'
                                        : 'border-slate-200/90 bg-white hover:border-slate-300 dark:border-white/10 dark:bg-white/[0.02] dark:hover:border-white/20'
                                )}
                            >
                                <input
                                    type="radio"
                                    name="kop_mode"
                                    value="2_logo"
                                    checked={kopMode === '2_logo'}
                                    onChange={() => setKopMode('2_logo')}
                                    className="sr-only"
                                />
                                <span
                                    className={cn(
                                        'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition',
                                        kopMode === '2_logo'
                                            ? 'border-lime-500 bg-lime-400 text-slate-950'
                                            : 'border-slate-300 bg-white dark:border-white/20 dark:bg-white/5'
                                    )}
                                >
                                    {kopMode === '2_logo' && <Check className="h-3 w-3 stroke-[3]" />}
                                </span>
                                <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center justify-between gap-1.5">
                                        <span className="text-[12.5px] font-extrabold text-slate-900 dark:text-white">
                                            2 Logo (Kiri &amp; Kanan)
                                        </span>
                                        <StatusBadge tone="lime" dot={false} className="text-[8.5px]">
                                            Rekomendasi
                                        </StatusBadge>
                                    </div>
                                    <p className="mt-1 text-[11px] font-medium leading-relaxed text-slate-500 dark:text-slate-400">
                                        Logo Daerah di kiri dan Logo Sekolah di kanan kop.
                                    </p>
                                </div>
                            </label>

                            <label
                                className={cn(
                                    'relative flex cursor-pointer items-start gap-3 rounded-2xl border-2 p-3.5 transition-all',
                                    kopMode === '1_logo'
                                        ? 'border-lime-400 bg-lime-200/35 shadow-sm dark:border-lime-400/70 dark:bg-lime-400/10'
                                        : 'border-slate-200/90 bg-white hover:border-slate-300 dark:border-white/10 dark:bg-white/[0.02] dark:hover:border-white/20'
                                )}
                            >
                                <input
                                    type="radio"
                                    name="kop_mode"
                                    value="1_logo"
                                    checked={kopMode === '1_logo'}
                                    onChange={() => setKopMode('1_logo')}
                                    className="sr-only"
                                />
                                <span
                                    className={cn(
                                        'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition',
                                        kopMode === '1_logo'
                                            ? 'border-lime-500 bg-lime-400 text-slate-950'
                                            : 'border-slate-300 bg-white dark:border-white/20 dark:bg-white/5'
                                    )}
                                >
                                    {kopMode === '1_logo' && <Check className="h-3 w-3 stroke-[3]" />}
                                </span>
                                <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center justify-between gap-1.5">
                                        <span className="text-[12.5px] font-extrabold text-slate-900 dark:text-white">
                                            1 Logo (Hanya Kiri)
                                        </span>
                                        <StatusBadge tone="violet" dot={false} className="text-[8.5px]">
                                            Simetris
                                        </StatusBadge>
                                    </div>
                                    <p className="mt-1 text-[11px] font-medium leading-relaxed text-slate-500 dark:text-slate-400">
                                        Logo Daerah di kiri, teks kop tetap rata tengah simetris.
                                    </p>
                                </div>
                            </label>
                        </div>

                        {/* Sub-bagian B: Slot Upload Logo Daerah & Sekolah */}
                        <div className="grid grid-cols-1 gap-3.5 rounded-[20px] border border-slate-200/80 bg-slate-50/75 p-4 sm:grid-cols-2 dark:border-white/10 dark:bg-white/[0.03]">
                            {/* Slot 1: Logo Daerah (Sisi Kiri) */}
                            <div className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-sm dark:border-white/10 dark:bg-[#15131F]">
                                <div>
                                    <div className="mb-3 flex items-center justify-between gap-2">
                                        <span className="flex items-center gap-1.5 text-[12px] font-extrabold text-slate-800 dark:text-white">
                                            <Building2 className="h-3.5 w-3.5 text-sky" />
                                            Logo Daerah
                                        </span>
                                        <StatusBadge tone="info" dot={false}>
                                            Sisi Kiri
                                        </StatusBadge>
                                    </div>

                                    <div className="flex items-center gap-3.5">
                                        <div
                                            className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-slate-200 p-1.5 dark:border-white/15"
                                            style={{
                                                backgroundImage:
                                                    'linear-gradient(45deg, rgba(148,163,184,0.12) 25%, transparent 25%), linear-gradient(-45deg, rgba(148,163,184,0.12) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, rgba(148,163,184,0.12) 75%), linear-gradient(-45deg, transparent 75%, rgba(148,163,184,0.12) 75%)',
                                                backgroundSize: '12px 12px',
                                                backgroundPosition: '0 0, 0 6px, 6px -6px, -6px 0',
                                            }}
                                        >
                                            {logoDaerahPreview ? (
                                                <img
                                                    src={logoDaerahPreview}
                                                    alt="Logo Daerah Preview"
                                                    className="max-h-full max-w-full object-contain"
                                                    onError={() => setLogoDaerahPreview(null)}
                                                />
                                            ) : (
                                                <ImageIcon className="h-7 w-7 text-slate-300 dark:text-slate-600" />
                                            )}
                                        </div>

                                        <div className="min-w-0 flex-1 space-y-2">
                                            <p className="text-[10.5px] font-medium leading-snug text-slate-500 dark:text-slate-400">
                                                Lambang Pemda PNG/JPG maks 2MB.
                                            </p>
                                            <div className="flex flex-wrap items-center gap-1.5">
                                                <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-brand-500/25 bg-pastel-lavender px-3 py-1.5 text-[10.5px] font-extrabold text-brand-700 transition hover:bg-brand-200/70 dark:border-brand-400/25 dark:bg-brand-500/15 dark:text-brand-300 dark:hover:bg-brand-500/25">
                                                    <Upload className="h-3 w-3" />
                                                    {logoDaerahPreview ? 'Ganti' : 'Unggah'}
                                                    <input
                                                        type="file"
                                                        accept="image/png,image/jpeg,image/jpg,image/svg+xml"
                                                        onChange={handleLogoDaerahChange}
                                                        className="hidden"
                                                    />
                                                </label>

                                                {logoDaerahPreview && (
                                                    <button
                                                        type="button"
                                                        onClick={handleHapusLogoDaerah}
                                                        className="inline-flex items-center gap-1 rounded-xl border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-[10.5px] font-bold text-rose-600 transition hover:bg-rose-100 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400 dark:hover:bg-rose-500/20"
                                                    >
                                                        <Trash2 className="h-3 w-3" />
                                                        Hapus
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Slot 2: Logo Sekolah (Sisi Kanan) */}
                            <div
                                className={cn(
                                    'flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-sm transition-opacity dark:border-white/10 dark:bg-[#15131F]',
                                    kopMode === '1_logo' && 'pointer-events-none opacity-50'
                                )}
                            >
                                <div>
                                    <div className="mb-3 flex items-center justify-between gap-2">
                                        <span className="flex items-center gap-1.5 text-[12px] font-extrabold text-slate-800 dark:text-white">
                                            <School className="h-3.5 w-3.5 text-brand-600 dark:text-brand-300" />
                                            Logo Sekolah
                                        </span>
                                        <StatusBadge tone={kopMode === '2_logo' ? 'violet' : 'neutral'} dot={false}>
                                            {kopMode === '2_logo' ? 'Sisi Kanan' : 'Nonaktif (1 Logo)'}
                                        </StatusBadge>
                                    </div>

                                    <div className="flex items-center gap-3.5">
                                        <div
                                            className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-slate-200 p-1.5 dark:border-white/15"
                                            style={{
                                                backgroundImage:
                                                    'linear-gradient(45deg, rgba(148,163,184,0.12) 25%, transparent 25%), linear-gradient(-45deg, rgba(148,163,184,0.12) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, rgba(148,163,184,0.12) 75%), linear-gradient(-45deg, transparent 75%, rgba(148,163,184,0.12) 75%)',
                                                backgroundSize: '12px 12px',
                                                backgroundPosition: '0 0, 0 6px, 6px -6px, -6px 0',
                                            }}
                                        >
                                            {logoSekolahPreview ? (
                                                <img
                                                    src={logoSekolahPreview}
                                                    alt="Logo Sekolah Preview"
                                                    className="max-h-full max-w-full object-contain"
                                                    onError={() => setLogoSekolahPreview(null)}
                                                />
                                            ) : (
                                                <ImageIcon className="h-7 w-7 text-slate-300 dark:text-slate-600" />
                                            )}
                                        </div>

                                        <div className="min-w-0 flex-1 space-y-2">
                                            <p className="text-[10.5px] font-medium leading-snug text-slate-500 dark:text-slate-400">
                                                {kopMode === '1_logo'
                                                    ? 'Aktifkan mode 2 Logo untuk memakai logo sisi kanan.'
                                                    : 'Tut Wuri Handayani atau lambang sekolah.'}
                                            </p>
                                            <div className="flex flex-wrap items-center gap-1.5">
                                                <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-brand-500/25 bg-pastel-lavender px-3 py-1.5 text-[10.5px] font-extrabold text-brand-700 transition hover:bg-brand-200/70 dark:border-brand-400/25 dark:bg-brand-500/15 dark:text-brand-300 dark:hover:bg-brand-500/25">
                                                    <Upload className="h-3 w-3" />
                                                    {logoSekolahPreview ? 'Ganti' : 'Unggah'}
                                                    <input
                                                        type="file"
                                                        accept="image/png,image/jpeg,image/jpg,image/svg+xml"
                                                        onChange={handleLogoSekolahChange}
                                                        disabled={kopMode === '1_logo'}
                                                        className="hidden"
                                                    />
                                                </label>

                                                {logoSekolahPreview && (
                                                    <button
                                                        type="button"
                                                        onClick={handleHapusLogoSekolah}
                                                        disabled={kopMode === '1_logo'}
                                                        className="inline-flex items-center gap-1 rounded-xl border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-[10.5px] font-bold text-rose-600 transition hover:bg-rose-100 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400 dark:hover:bg-rose-500/20"
                                                    >
                                                        <Trash2 className="h-3 w-3" />
                                                        Hapus
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </Surface>

                {/* KOLOM KANAN: Pilihan Garis Pembatas Kop */}
                <Surface
                    className="lg:col-span-5 animate-rise"
                    icon={
                        <IconTile tone="violet" size="md">
                            <Minus />
                        </IconTile>
                    }
                    title="Garis Pembatas Kop"
                    subtitle="Garis bawah otomatis membentang 100% mengikuti margin dokumen PDF."
                    badge={
                        <StatusBadge tone="violet" dot={false}>
                            CSS 100%
                        </StatusBadge>
                    }
                >
                    <div className="space-y-2.5">
                        {BORDER_OPTIONS.map((option) => {
                            const isSelected = kopBorder === option.value;
                            return (
                                <label
                                    key={option.value}
                                    className={cn(
                                        'flex cursor-pointer items-start gap-3 rounded-2xl border-2 p-3.5 transition-all',
                                        isSelected
                                            ? 'border-lime-400 bg-lime-200/35 shadow-sm dark:border-lime-400/70 dark:bg-lime-400/10'
                                            : 'border-slate-200/90 bg-white hover:border-slate-300 dark:border-white/10 dark:bg-white/[0.02] dark:hover:border-white/20'
                                    )}
                                >
                                    <input
                                        type="radio"
                                        name="kop_border"
                                        value={option.value}
                                        checked={isSelected}
                                        onChange={() => setKopBorder(option.value)}
                                        className="sr-only"
                                    />
                                    <span
                                        className={cn(
                                            'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition',
                                            isSelected
                                                ? 'border-lime-500 bg-lime-400 text-slate-950'
                                                : 'border-slate-300 bg-white dark:border-white/20 dark:bg-white/5'
                                        )}
                                    >
                                        {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                                    </span>

                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="text-[12.5px] font-extrabold text-slate-900 dark:text-white">
                                                {option.title}
                                            </span>
                                            <StatusBadge tone={option.badgeTone} dot={false} className="text-[8.5px]">
                                                {option.badgeLabel}
                                            </StatusBadge>
                                        </div>
                                        <p className="mt-0.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                                            {option.description}
                                        </p>

                                        {option.value === 'double' && (
                                            <div className="mt-2.5 rounded-xl border border-slate-200/70 bg-slate-50 px-3 py-2 dark:border-white/10 dark:bg-white/[0.03]">
                                                <div className="w-full border-t-[2.5px] border-black dark:border-white/80" />
                                                <div className="mt-[2px] w-full border-t-[1px] border-black dark:border-white/80" />
                                            </div>
                                        )}
                                        {option.value === 'single' && (
                                            <div className="mt-2.5 rounded-xl border border-slate-200/70 bg-slate-50 px-3 py-2 dark:border-white/10 dark:bg-white/[0.03]">
                                                <div className="w-full border-t-[2px] border-black dark:border-white/80" />
                                            </div>
                                        )}
                                        {option.value === 'none' && (
                                            <div className="mt-2.5 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-1.5 text-center dark:border-white/10 dark:bg-white/[0.03]">
                                                <span className="text-[10.5px] font-medium italic text-slate-400 dark:text-slate-500">
                                                    Tidak ada garis pembatas
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </label>
                            );
                        })}
                    </div>
                </Surface>
            </div>

            {/* BAGIAN 4: EDITOR TIPTAP & MS WORD RIBBON STUDIO */}
            <Surface padding="none" overflowVisible className="animate-rise">
                <div className="flex flex-col justify-between gap-3 border-b border-slate-100 bg-slate-50/70 px-5 py-4 sm:flex-row sm:items-center dark:border-white/5 dark:bg-white/[0.03]">
                    <div className="flex items-center gap-3">
                        <IconTile tone="amber" size="md">
                            <Type />
                        </IconTile>
                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                                <h4 className="text-[13.5px] font-extrabold tracking-tight text-slate-900 dark:text-white">
                                    Editor Teks Kop Surat (MS Word Ribbon)
                                </h4>
                                <StatusBadge tone="warning" dot={false}>
                                    Rich Format
                                </StatusBadge>
                            </div>
                            <p className="mt-0.5 text-[10.5px] font-medium text-slate-400 dark:text-slate-500">
                                Atur jenis huruf, ukuran per baris, perataan, warna kedinasan, dan spasi baris secara presisi.
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={handleResetTemplate}
                        className="inline-flex items-center gap-1.5 self-start rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-[11px] font-extrabold text-slate-600 shadow-sm transition hover:border-amber-300 hover:bg-amber-50/60 hover:text-amber-700 sm:self-auto dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:border-amber-400/30 dark:hover:bg-amber-500/10 dark:hover:text-amber-300"
                    >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Reset ke Template Baku
                    </button>
                </div>

                {/* MS WORD RIBBON BAR (2 BARIS TERORGANISIR) */}
                {editor && (
                    <div
                        ref={ribbonRef}
                        className="divide-y divide-slate-200/70 border-b border-slate-100 bg-slate-100/75 text-xs dark:divide-white/5 dark:border-white/5 dark:bg-white/[0.02]"
                    >
                        {/* BARIS 1: FONT UTAMA, UKURAN, CAPITALIZATION & HISTORY */}
                        <div className="flex flex-wrap items-center gap-2 px-5 py-2.5">
                            {/* 1. Font Family Dropdown */}
                            <div className="flex w-[210px] sm:w-[230px] items-center rounded-xl border border-slate-200/90 bg-white py-0.5 pl-2.5 pr-1 shadow-sm dark:border-white/10 dark:bg-white/5">
                                <span className="mr-1.5 select-none text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                                    Font
                                </span>
                                <Select<RibbonSelectOption, false>
                                    unstyled
                                    isSearchable={false}
                                    options={FONT_FAMILIES}
                                    value={selectedFontOption}
                                    onMenuOpen={closeAllPopovers}
                                    onChange={(opt) => {
                                        if (opt) {
                                            editor.chain().focus().setFontFamily(opt.value).run();
                                        }
                                    }}
                                    formatOptionLabel={(opt, { context }) => (
                                        <div className="flex w-full items-center justify-between gap-2">
                                            <span className="truncate" style={{ fontFamily: opt.value }}>
                                                {opt.label}
                                            </span>
                                            {context === 'menu' && selectedFontOption.value === opt.value && (
                                                <Check className="h-3.5 w-3.5 shrink-0" />
                                            )}
                                        </div>
                                    )}
                                    classNames={buildRibbonSelectClassNames('w-[220px]')}
                                />
                            </div>

                            {/* 2. Font Size Dropdown */}
                            <div className="flex w-[124px] items-center rounded-xl border border-slate-200/90 bg-white py-0.5 pl-2.5 pr-1 shadow-sm dark:border-white/10 dark:bg-white/5">
                                <span className="mr-1.5 select-none text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                                    Ukuran
                                </span>
                                <Select<RibbonSelectOption, false>
                                    unstyled
                                    isSearchable={false}
                                    options={FONT_SIZE_OPTIONS}
                                    value={selectedFontSizeOption}
                                    onMenuOpen={closeAllPopovers}
                                    onChange={(opt) => {
                                        if (opt) {
                                            editor.chain().focus().setFontSize(opt.value).run();
                                        }
                                    }}
                                    formatOptionLabel={(opt, { context }) => (
                                        <div className="flex w-full items-center justify-between gap-2">
                                            <span>{opt.label}</span>
                                            {context === 'menu' && selectedFontSizeOption.value === opt.value && (
                                                <Check className="h-3.5 w-3.5 shrink-0" />
                                            )}
                                        </div>
                                    )}
                                    classNames={buildRibbonSelectClassNames('w-[115px]')}
                                />
                            </div>

                            {/* 3. Grow / Shrink Font Buttons (A^ / Av) */}
                            <div className="flex items-center gap-0.5 rounded-xl border border-slate-200/90 bg-white p-0.5 shadow-sm dark:border-white/10 dark:bg-white/5">
                                <button
                                    type="button"
                                    onClick={handleGrowFont}
                                    title="Perbesar Ukuran Font (Grow Font)"
                                    className="flex items-center rounded-lg px-2 py-1 text-xs font-bold text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/10"
                                >
                                    A<span className="ml-0.5 text-[10px]">▲</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={handleShrinkFont}
                                    title="Perkecil Ukuran Font (Shrink Font)"
                                    className="flex items-center rounded-lg px-2 py-1 text-xs font-bold text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/10"
                                >
                                    A<span className="ml-0.5 text-[10px]">▼</span>
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
                                    className="flex items-center gap-1 rounded-xl border border-slate-200/90 bg-white px-2.5 py-1.5 font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
                                >
                                    <span className="font-extrabold">Aa</span>
                                    <ChevronDown className="h-3 w-3 text-slate-400 dark:text-slate-500" />
                                </button>

                                {isCaseMenuOpen && (
                                    <div className="absolute left-0 z-30 mt-1.5 w-52 space-y-1 rounded-2xl border border-slate-200/90 bg-white p-1.5 shadow-float dark:border-white/10 dark:bg-[#1A1728]">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                applyTextCase(editor, 'uppercase');
                                                setIsCaseMenuOpen(false);
                                            }}
                                            className="w-full rounded-xl px-3 py-2 text-left text-xs font-bold text-slate-800 transition hover:bg-slate-100 dark:text-white dark:hover:bg-white/10"
                                        >
                                            HURUF BESAR (UPPERCASE)
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                applyTextCase(editor, 'capitalize');
                                                setIsCaseMenuOpen(false);
                                            }}
                                            className="w-full rounded-xl px-3 py-2 text-left text-xs font-medium text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/10"
                                        >
                                            Huruf Besar Tiap Kata
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                applyTextCase(editor, 'lowercase');
                                                setIsCaseMenuOpen(false);
                                            }}
                                            className="w-full rounded-xl px-3 py-2 text-left text-xs font-medium text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/10"
                                        >
                                            huruf kecil (lowercase)
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className="mx-0.5 h-5 w-px bg-slate-200 dark:bg-white/10" />

                            {/* 5. Undo & Redo */}
                            <div className="flex items-center gap-0.5 rounded-xl border border-slate-200/90 bg-white p-0.5 shadow-sm dark:border-white/10 dark:bg-white/5">
                                <button
                                    type="button"
                                    onClick={() => editor.chain().focus().undo().run()}
                                    disabled={!editor.can().undo()}
                                    title="Undo (Ctrl+Z)"
                                    className="rounded-lg p-1.5 text-slate-700 transition hover:bg-slate-100 disabled:opacity-30 dark:text-slate-200 dark:hover:bg-white/10"
                                >
                                    <Undo2 className="h-3.5 w-3.5" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => editor.chain().focus().redo().run()}
                                    disabled={!editor.can().redo()}
                                    title="Redo (Ctrl+Y)"
                                    className="rounded-lg p-1.5 text-slate-700 transition hover:bg-slate-100 disabled:opacity-30 dark:text-slate-200 dark:hover:bg-white/10"
                                >
                                    <Redo2 className="h-3.5 w-3.5" />
                                </button>
                            </div>

                            {/* 6. Clear Formatting */}
                            <button
                                type="button"
                                onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
                                title="Hapus Semua Format (Clear Formatting)"
                                className="flex items-center gap-1.5 rounded-xl border border-slate-200/90 bg-white px-2.5 py-1.5 font-semibold text-slate-700 shadow-sm transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:border-rose-500/30 dark:hover:bg-rose-950/40"
                            >
                                <RemoveFormatting className="h-3.5 w-3.5 text-rose-500" />
                                <span className="hidden sm:inline">Hapus Format</span>
                            </button>
                        </div>

                        {/* BARIS 2: GAYA FONT, WARNA, PARAGRAF, SPASI BARIS & LIST */}
                        <div className="flex flex-wrap items-center gap-2 px-5 py-2.5">
                            {/* 1. Gaya Karakter: Bold, Italic, Underline, Strike, Sub, Super */}
                            <div className="flex items-center gap-0.5 rounded-xl border border-slate-200/90 bg-white p-0.5 shadow-sm dark:border-white/10 dark:bg-white/5">
                                <button
                                    type="button"
                                    onClick={() => editor.chain().focus().toggleBold().run()}
                                    className={ribbonToggleBtnClass(editor.isActive('bold'))}
                                    title="Tebal / Bold (Ctrl+B)"
                                >
                                    <Bold className="h-3.5 w-3.5" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => editor.chain().focus().toggleItalic().run()}
                                    className={ribbonToggleBtnClass(editor.isActive('italic'))}
                                    title="Miring / Italic (Ctrl+I)"
                                >
                                    <Italic className="h-3.5 w-3.5" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => editor.chain().focus().toggleUnderline().run()}
                                    className={ribbonToggleBtnClass(editor.isActive('underline'))}
                                    title="Garis Bawah / Underline (Ctrl+U)"
                                >
                                    <UnderlineIcon className="h-3.5 w-3.5" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => editor.chain().focus().toggleStrike().run()}
                                    className={ribbonToggleBtnClass(editor.isActive('strike'))}
                                    title="Coret / Strikethrough"
                                >
                                    <Strikethrough className="h-3.5 w-3.5" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => editor.chain().focus().toggleSubscript().run()}
                                    className={ribbonToggleBtnClass(editor.isActive('subscript'))}
                                    title="Subscript (X₂)"
                                >
                                    <SubscriptIcon className="h-3.5 w-3.5" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => editor.chain().focus().toggleSuperscript().run()}
                                    className={ribbonToggleBtnClass(editor.isActive('superscript'))}
                                    title="Superscript (X²)"
                                >
                                    <SuperscriptIcon className="h-3.5 w-3.5" />
                                </button>
                            </div>

                            <div className="mx-0.5 h-5 w-px bg-slate-200 dark:bg-white/10" />

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
                                    className="flex items-center gap-1.5 rounded-xl border border-slate-200/90 bg-white px-2.5 py-1.5 text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
                                >
                                    <div className="flex flex-col items-center">
                                        <span className="text-xs font-extrabold leading-none">A</span>
                                        <div
                                            className="mt-0.5 h-1 w-4 rounded-full"
                                            style={{
                                                backgroundColor: editor.getAttributes('textStyle').color || '#000000',
                                            }}
                                        />
                                    </div>
                                    <ChevronDown className="h-3 w-3 text-slate-400 dark:text-slate-500" />
                                </button>

                                {isColorPickerOpen && (
                                    <div className="absolute left-0 z-30 mt-1.5 w-56 rounded-2xl border border-slate-200/90 bg-white p-3 shadow-float dark:border-white/10 dark:bg-[#1A1728]">
                                        <span className="mb-2 flex items-center gap-1.5 text-[10.5px] font-extrabold uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">
                                            <Palette className="h-3.5 w-3.5" />
                                            Warna Huruf Dinas
                                        </span>
                                        <div className="mb-3 grid grid-cols-4 gap-2">
                                            {TEXT_COLORS.map((c) => (
                                                <button
                                                    key={c.value}
                                                    type="button"
                                                    onClick={() => {
                                                        editor.chain().focus().setColor(c.value).run();
                                                        setIsColorPickerOpen(false);
                                                    }}
                                                    title={c.label}
                                                    className="h-8 w-8 rounded-xl border border-slate-200/90 shadow-sm transition hover:scale-110 dark:border-white/10"
                                                    style={{ backgroundColor: c.value }}
                                                />
                                            ))}
                                        </div>
                                        <div className="flex items-center justify-between border-t border-slate-200 pt-2.5 dark:border-white/10">
                                            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                                                Warna Bebas:
                                            </span>
                                            <input
                                                type="color"
                                                value={editor.getAttributes('textStyle').color || '#000000'}
                                                onChange={(e) => editor.chain().focus().setColor(e.target.value).run()}
                                                className="h-7 w-7 cursor-pointer rounded-lg border-0 p-0"
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
                                    className="flex items-center gap-1.5 rounded-xl border border-slate-200/90 bg-white px-2.5 py-1.5 text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
                                >
                                    <Highlighter className="h-3.5 w-3.5 text-amber-500" />
                                    <ChevronDown className="h-3 w-3 text-slate-400 dark:text-slate-500" />
                                </button>

                                {isHighlightPickerOpen && (
                                    <div className="absolute left-0 z-30 mt-1.5 w-52 rounded-2xl border border-slate-200/90 bg-white p-3 shadow-float dark:border-white/10 dark:bg-[#1A1728]">
                                        <span className="mb-2 block text-[10.5px] font-extrabold uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">
                                            Warna Stabilo
                                        </span>
                                        <div className="mb-2.5 flex gap-2">
                                            {HIGHLIGHT_COLORS.map((h) => (
                                                <button
                                                    key={h.value}
                                                    type="button"
                                                    onClick={() => {
                                                        editor.chain().focus().toggleHighlight({ color: h.value }).run();
                                                        setIsHighlightPickerOpen(false);
                                                    }}
                                                    title={h.label}
                                                    className="h-7 w-7 rounded-xl border border-slate-200/90 transition hover:scale-110 dark:border-white/10"
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
                                            className="w-full rounded-xl py-1.5 text-center text-xs font-bold text-rose-600 transition hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10"
                                        >
                                            Hapus Stabilo
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className="mx-0.5 h-5 w-px bg-slate-200 dark:bg-white/10" />

                            {/* 4. Perataan Teks (Alignment: Left, Center, Right, Justify) */}
                            <div className="flex items-center gap-0.5 rounded-xl border border-slate-200/90 bg-white p-0.5 shadow-sm dark:border-white/10 dark:bg-white/5">
                                <button
                                    type="button"
                                    onClick={() => editor.chain().focus().setTextAlign('left').run()}
                                    className={ribbonToggleBtnClass(editor.isActive({ textAlign: 'left' }))}
                                    title="Rata Kiri"
                                >
                                    <AlignLeft className="h-3.5 w-3.5" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => editor.chain().focus().setTextAlign('center').run()}
                                    className={ribbonToggleBtnClass(editor.isActive({ textAlign: 'center' }))}
                                    title="Rata Tengah (Default Kop)"
                                >
                                    <AlignCenter className="h-3.5 w-3.5" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => editor.chain().focus().setTextAlign('right').run()}
                                    className={ribbonToggleBtnClass(editor.isActive({ textAlign: 'right' }))}
                                    title="Rata Kanan"
                                >
                                    <AlignRight className="h-3.5 w-3.5" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => editor.chain().focus().setTextAlign('justify').run()}
                                    className={ribbonToggleBtnClass(editor.isActive({ textAlign: 'justify' }))}
                                    title="Rata Kiri-Kanan (Justify)"
                                >
                                    <AlignJustify className="h-3.5 w-3.5" />
                                </button>
                            </div>

                            {/* 5. Jarak Antar Baris (Line Spacing) */}
                            <div className="flex w-[118px] items-center rounded-xl border border-slate-200/90 bg-white py-0.5 pl-2.5 pr-1 shadow-sm dark:border-white/10 dark:bg-white/5">
                                <span className="mr-1.5 select-none text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                                    Spasi
                                </span>
                                <Select<RibbonSelectOption, false>
                                    unstyled
                                    isSearchable={false}
                                    options={LINE_HEIGHT_OPTIONS}
                                    value={selectedLineHeightOption}
                                    onMenuOpen={closeAllPopovers}
                                    onChange={(opt) => {
                                        if (opt) {
                                            setSelectedLineHeight(opt.value);
                                            editor.chain().focus().setLineHeight(opt.value).run();
                                        }
                                    }}
                                    formatOptionLabel={(opt, { context }) => (
                                        <div className="flex w-full items-center justify-between gap-2">
                                            <span>{opt.label}</span>
                                            {context === 'menu' && selectedLineHeightOption.value === opt.value && (
                                                <Check className="h-3.5 w-3.5 shrink-0" />
                                            )}
                                        </div>
                                    )}
                                    classNames={buildRibbonSelectClassNames('w-[110px]')}
                                />
                            </div>

                            <div className="mx-0.5 h-5 w-px bg-slate-200 dark:bg-white/10" />

                            {/* 6. List: Bullet & Numbered */}
                            <div className="flex items-center gap-0.5 rounded-xl border border-slate-200/90 bg-white p-0.5 shadow-sm dark:border-white/10 dark:bg-white/5">
                                <button
                                    type="button"
                                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                                    className={ribbonToggleBtnClass(editor.isActive('bulletList'))}
                                    title="Bullet List (Daftar Berbutir)"
                                >
                                    <List className="h-3.5 w-3.5" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                                    className={ribbonToggleBtnClass(editor.isActive('orderedList'))}
                                    title="Numbered List (Daftar Bernomor)"
                                >
                                    <ListOrdered className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Editor Content Area */}
                <div className="min-h-[220px] bg-white p-5 dark:bg-[#15131F]">
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
                        className="rounded-2xl border border-slate-200/90 bg-slate-50/50 p-5 transition focus-within:border-lime-400 focus-within:ring-4 focus-within:ring-lime-200/60 dark:border-white/10 dark:bg-white/[0.03] dark:focus-within:border-lime-400/70 dark:focus-within:ring-lime-400/10"
                    />
                </div>

                {/* Footer Aksi Simpan */}
                <div className="flex flex-col items-center justify-between gap-4 border-t border-slate-100 bg-slate-50/70 p-5 sm:flex-row dark:border-white/5 dark:bg-white/[0.02]">
                    <p className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                        <FileText className="h-4 w-4 shrink-0 text-amber-500" />
                        Format huruf, spasi baris, dan perataan teks pada editor akan dicerminkan persis pada dokumen PDF.
                    </p>

                    <div className="flex w-full items-center gap-3 sm:w-auto">
                        <SecondaryButton
                            onClick={handleDownloadPng}
                            disabled={isDownloading}
                            className="flex-1 justify-center sm:flex-initial"
                        >
                            <Download className="mr-1.5 h-4 w-4" />
                            Unduh Gambar (PNG)
                        </SecondaryButton>
                        <PrimaryButton
                            onClick={() => setIsConfirmSaveModalOpen(true)}
                            disabled={isSaving}
                            className="flex-1 justify-center sm:flex-initial"
                        >
                            {isSaving ? (
                                <>
                                    <svg className="-ml-1 mr-2 h-4 w-4 animate-spin text-current" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    Menyimpan...
                                </>
                            ) : (
                                <>
                                    <Check className="mr-1.5 h-4 w-4" />
                                    Simpan Kop Sekarang
                                </>
                            )}
                        </PrimaryButton>
                    </div>
                </div>
            </Surface>

            {/* BAGIAN 5: PENERAPAN KOP SURAT PADA DOKUMEN */}
            <Surface padding="none" className="animate-rise" bodyClassName="flex flex-col">
                <div className="flex flex-col justify-between gap-3 border-b border-slate-100 bg-slate-50/70 px-5 py-4 sm:flex-row sm:items-center dark:border-white/5 dark:bg-white/[0.03]">
                    <div className="flex items-center gap-3">
                        <IconTile tone="sky" size="md">
                            <FileSpreadsheet />
                        </IconTile>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2">
                                <h4 className="truncate text-[13.5px] font-extrabold tracking-tight text-slate-900 dark:text-white">
                                    Penerapan Kop Surat pada Dokumen Laporan
                                </h4>
                                <StatusBadge tone="info" dot={false}>
                                    {Object.values(kopDokumen).filter(Boolean).length} / {RKAS_AWAL_DOCS.length + RKAS_PERUBAHAN_DOCS.length + BKU_DOCS.length + PELENGKAP_DOCS.length} Dokumen Aktif
                                </StatusBadge>
                            </div>
                            <p className="mt-0.5 text-[10.5px] font-medium text-slate-400 dark:text-slate-500">
                                Centang dokumen yang ingin menampilkan kop surat resmi. Dokumen yang tidak dicentang akan menggunakan format header standar.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <PrimaryButton
                            onClick={handleSaveKopDokumen}
                            disabled={isSavingDocs}
                            className="flex items-center gap-1.5 py-2 text-xs shadow-sm"
                        >
                            {isSavingDocs ? (
                                <>
                                    <svg className="-ml-1 mr-1.5 h-3.5 w-3.5 animate-spin text-current" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    Menyimpan...
                                </>
                            ) : (
                                <>
                                    <Save className="h-3.5 w-3.5" />
                                    Simpan Pengaturan Dokumen
                                </>
                            )}
                        </PrimaryButton>
                    </div>
                </div>

                {/* Bento 4 Columns Grid */}
                <div className="grid grid-cols-1 gap-5 p-5 md:grid-cols-2 xl:grid-cols-4">
                    {/* Kolom 1: RKAS Awal */}
                    {renderCategoryCard(
                        'RKAS Awal (Murni)',
                        'Format dokumen perencanaan anggaran awal',
                        'mint',
                        RKAS_AWAL_DOCS
                    )}

                    {/* Kolom 2: RKAS Perubahan */}
                    {renderCategoryCard(
                        'RKAS Perubahan',
                        'Format dokumen pergeseran & perubahan',
                        'violet',
                        RKAS_PERUBAHAN_DOCS
                    )}

                    {/* Kolom 3: Penatausahaan BKU */}
                    {renderCategoryCard(
                        'Penatausahaan (BKU)',
                        'Buku Kas Umum dan Buku Pembantu BKU',
                        'amber',
                        BKU_DOCS
                    )}

                    {/* Kolom 4: Pelengkap & Laporan */}
                    {renderCategoryCard(
                        'Pelengkap & Laporan',
                        'Kwitansi, Tanda Terima, SPTJ, SPMTH, SP2B, LPH',
                        'sky',
                        PELENGKAP_DOCS
                    )}
                </div>
            </Surface>

            {/* MODAL 1: ZOOM PREVIEW KOP SURAT */}
            <KopModalShell
                show={isPreviewModalOpen}
                onClose={() => setIsPreviewModalOpen(false)}
                maxWidth="4xl"
                glowTone="violet"
                iconTone="violet"
                icon={<Eye />}
                title="Ukuran Penuh Kop Surat Sekolah"
                subtitle="Pratinjau resolusi tinggi hasil susunan logo, teks, dan garis pembatas kop."
                badge={<StatusBadge tone="violet">Resolusi Tinggi</StatusBadge>}
            >
                <div className="space-y-4">
                    <div className="flex max-h-[70vh] items-center justify-center overflow-auto rounded-2xl border border-slate-200/80 bg-slate-100/90 p-5 dark:border-white/10 dark:bg-black/30">
                        {previewModalImgUrl && (
                            <img
                                src={previewModalImgUrl}
                                alt="Perbesaran Kop Surat"
                                className="h-auto w-full rounded-xl border border-slate-200 shadow-md dark:border-white/10"
                            />
                        )}
                    </div>

                    <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 pt-4 dark:border-white/10">
                        <SecondaryButton onClick={handleDownloadPng} disabled={isDownloading}>
                            <Download className="mr-1.5 h-4 w-4" />
                            Unduh PNG
                        </SecondaryButton>
                        <PrimaryButton onClick={() => setIsPreviewModalOpen(false)}>
                            Tutup Preview
                        </PrimaryButton>
                    </div>
                </div>
            </KopModalShell>

            {/* MODAL 2: KONFIRMASI RESET TEMPLATE */}
            <KopModalShell
                show={isResetModalOpen}
                onClose={() => setIsResetModalOpen(false)}
                maxWidth="md"
                glowTone="amber"
                iconTone="amber"
                icon={<RotateCcw />}
                title="Kembalikan ke Template Baku?"
                subtitle="Konfirmasi pengaturan ulang isi teks kop surat"
                badge={<StatusBadge tone="warning">Reset Teks</StatusBadge>}
            >
                <div className="space-y-5">
                    <div className="rounded-[20px] border border-amber-200/80 bg-amber-50/70 p-4 text-sm leading-relaxed text-slate-700 dark:border-amber-400/20 dark:bg-amber-500/10 dark:text-slate-300">
                        Teks kop surat saat ini akan diganti dengan susunan baku dinas berdasarkan data profil sekolah Anda. Perubahan teks atau kustomisasi yang sedang Anda buat akan ditimpa.
                    </div>

                    <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4 dark:border-white/10">
                        <SecondaryButton onClick={() => setIsResetModalOpen(false)}>
                            Batal
                        </SecondaryButton>
                        <PrimaryButton onClick={confirmResetTemplate}>
                            <RotateCcw className="mr-1.5 h-4 w-4" />
                            Ya, Terapkan Template
                        </PrimaryButton>
                    </div>
                </div>
            </KopModalShell>

            {/* MODAL 3: KONFIRMASI SIMPAN KOP SURAT */}
            <KopModalShell
                show={isConfirmSaveModalOpen}
                onClose={() => setIsConfirmSaveModalOpen(false)}
                maxWidth="md"
                glowTone="mint"
                iconTone="mint"
                icon={<Save />}
                title="Simpan & Terapkan Kop Surat?"
                subtitle="Pembuatan gambar resolusi tinggi untuk seluruh PDF"
                badge={<StatusBadge tone="success">Siap Cetak PDF</StatusBadge>}
            >
                <div className="space-y-4">
                    <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                        Sistem akan menggabungkan logo daerah, teks kop surat, dan logo sekolah menjadi gambar berkualitas tinggi (2480 &times; 588 px) dan menerapkannya ke seluruh dokumen PDF laporan sekolah.
                    </p>

                    <div className="space-y-2 rounded-[20px] border border-slate-200/80 bg-slate-50/75 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                        <div className="flex items-center gap-2 border-b border-slate-200/70 pb-2 dark:border-white/10">
                            <SlidersHorizontal className="h-3.5 w-3.5 text-brand-500 dark:text-brand-300" />
                            <span className="text-[10.5px] font-extrabold uppercase tracking-[0.14em] text-slate-600 dark:text-slate-300">
                                Ringkasan Pengaturan Aktif
                            </span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                            <span className="font-medium text-slate-500 dark:text-slate-400">Susunan Logo</span>
                            <StatusBadge tone="info" dot={false}>
                                {kopMode === '2_logo' ? '2 Logo (Kiri & Kanan)' : '1 Logo (Hanya Kiri)'}
                            </StatusBadge>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                            <span className="font-medium text-slate-500 dark:text-slate-400">Garis Pembatas PDF</span>
                            <StatusBadge tone="violet" dot={false}>
                                {BORDER_LABELS[kopBorder]}
                            </StatusBadge>
                        </div>
                    </div>

                    <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4 dark:border-white/10">
                        <SecondaryButton onClick={() => setIsConfirmSaveModalOpen(false)}>
                            Batal
                        </SecondaryButton>
                        <PrimaryButton onClick={executeSaveKop}>
                            <Check className="mr-1.5 h-4 w-4" />
                            Ya, Simpan Kop Sekarang
                        </PrimaryButton>
                    </div>
                </div>
            </KopModalShell>

            {/* MODAL 4: STATUS SUKSES / GAGAL */}
            <KopModalShell
                show={statusModal.isOpen}
                onClose={() => setStatusModal((prev) => ({ ...prev, isOpen: false }))}
                maxWidth="md"
                glowTone={statusModal.type === 'success' ? 'mint' : 'rose'}
                iconTone={statusModal.type === 'success' ? 'mint' : 'rose'}
                icon={statusModal.type === 'success' ? <CheckCircle2 /> : <AlertTriangle />}
                title={statusModal.title}
                subtitle={statusModal.type === 'success' ? 'Pembaruan profil sekolah selesai' : 'Terjadi kendala pemrosesan'}
                badge={
                    <StatusBadge tone={statusModal.type === 'success' ? 'success' : 'danger'}>
                        {statusModal.type === 'success' ? 'Berhasil' : 'Kendala'}
                    </StatusBadge>
                }
            >
                <div className="space-y-5">
                    <div
                        className={cn(
                            'rounded-[20px] border p-4 text-sm leading-relaxed whitespace-pre-line',
                            statusModal.type === 'success'
                                ? 'border-emerald-200/80 bg-emerald-50/60 text-slate-700 dark:border-mint/20 dark:bg-mint/10 dark:text-slate-200'
                                : 'border-rose-200/80 bg-rose-50/70 text-rose-800 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200'
                        )}
                    >
                        {statusModal.message}
                    </div>

                    <div className="flex items-center justify-end border-t border-slate-100 pt-4 dark:border-white/10">
                        {statusModal.type === 'success' ? (
                            <PrimaryButton
                                onClick={() => setStatusModal((prev) => ({ ...prev, isOpen: false }))}
                            >
                                <Check className="mr-1.5 h-4 w-4" />
                                Mengerti
                            </PrimaryButton>
                        ) : (
                            <SecondaryButton
                                onClick={() => setStatusModal((prev) => ({ ...prev, isOpen: false }))}
                            >
                                Tutup
                            </SecondaryButton>
                        )}
                    </div>
                </div>
            </KopModalShell>
        </div>
    );
}
