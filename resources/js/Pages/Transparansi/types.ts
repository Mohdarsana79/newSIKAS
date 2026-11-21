import type { PosterData, PosterPeriode } from '@/Pages/FiturPelengkap/PosterTransparansi/types';

export type BudgetVariantKey = 'reguler' | 'kinerja' | 'silpa' | 'kinerja_silpa';

export type RkaJenis = 'awal' | 'perubahan';

export type RkaViewMode = 'friendly' | 'official';

export type RkaTahapFilter = 'all' | 'tahap1' | 'tahap2';

export type ChangeStatus = 'baru' | 'dihapus' | 'naik' | 'turun' | 'tetap';

export interface PublicVariantSummary {
    variant: BudgetVariantKey;
    label: string;
    has_data: boolean;
    pagu_anggaran: number;
    dana_diterima: number;
    total_realisasi: number;
    sisa_dana: number;
    persentase_serapan: number;
    status_persetujuan: 'disetujui' | 'draft';
    status_label: string;
    has_rkas_awal: boolean;
    has_rkas_perubahan: boolean;
    supports_perubahan: boolean;
}

export interface PublicSekolah {
    nama_sekolah: string;
    npsn: string;
    status_sekolah: string;
    jenjang_sekolah: string;
    alamat?: string;
    alamat_lengkap: string;
    kabupaten_kota: string;
    provinsi?: string;
    logo_daerah_data_uri: string | null;
    logo_sekolah_data_uri: string | null;
}

export interface PublicActivePosterData extends Omit<PosterData, 'meta' | 'sekolah' | 'ringkasan' | 'penanggung_jawab'> {
    meta: PosterData['meta'] & {
        has_rkas_awal: boolean;
        has_rkas_perubahan: boolean;
        supports_perubahan: boolean;
        tanggal_perubahan_formatted: string | null;
    };
    sekolah: PublicSekolah;
    ringkasan: PosterData['ringkasan'] & {
        status_label: string;
    };
    penanggung_jawab: {
        kepala_sekolah: string;
        bendahara: string;
        komite: string;
    };
}

export interface PublicTransparansiOverview {
    meta: {
        variant: BudgetVariantKey;
        variant_label: string;
        tahun: number;
        periode: PosterPeriode;
        periode_label: string;
        available_years: number[];
        generated_at_formatted: string;
    };
    sekolah: PublicSekolah;
    aggregate: {
        total_pagu: number;
        total_dana_diterima: number;
        total_realisasi: number;
        total_sisa_dana: number;
        persentase_serapan: number;
        persentase_serapan_aktual: number;
        active_variants_count: number;
    };
    variants_summary: PublicVariantSummary[];
    active: PublicActivePosterData;
}

export interface PublicRkaItem {
    kode_rekening: string;
    kode_kegiatan: string;
    program_code: string;
    uraian: string;
    satuan: string;
    tarif: number;
    volume_murni: number;
    jumlah_murni: number;
    volume: number;
    jumlah: number;
    bertambah: number;
    berkurang: number;
    tahap1: number;
    tahap2: number;
    status_perubahan: ChangeStatus;
}

export interface PublicRkaUraianNode {
    kode: string;
    uraian: string;
    jumlah_murni: number;
    jumlah: number;
    bertambah: number;
    berkurang: number;
    tahap1: number;
    tahap2: number;
    items: PublicRkaItem[];
}

export interface PublicRkaSubProgramNode {
    kode: string;
    uraian: string;
    jumlah_murni: number;
    jumlah: number;
    bertambah: number;
    berkurang: number;
    tahap1: number;
    tahap2: number;
    uraian_programs: PublicRkaUraianNode[];
}

export interface PublicRkaProgramNode {
    kode: string;
    uraian: string;
    jumlah_murni: number;
    jumlah: number;
    bertambah: number;
    berkurang: number;
    tahap1: number;
    tahap2: number;
    sub_programs: PublicRkaSubProgramNode[];
}

export interface PublicRkaTahapanData {
    meta: {
        variant: BudgetVariantKey;
        variant_label: string;
        tahun: number;
        jenis: RkaJenis;
        has_data: boolean;
        supports_perubahan: boolean;
        reason: string | null;
        message: string | null;
        sumber_dana: string;
        pagu_anggaran: number;
        status_persetujuan: 'disetujui' | 'draft';
        status_label: string;
        tanggal_dokumen_formatted: string | null;
    };
    totals: {
        jumlah_murni: number;
        jumlah: number;
        bertambah: number;
        berkurang: number;
        tahap1: number;
        tahap2: number;
        total_items: number;
        changed_items: number;
    };
    programs: PublicRkaProgramNode[];
}

export function formatRupiah(value: number): string {
    return `Rp ${Math.round(value || 0).toLocaleString('id-ID')}`;
}

export function formatNumber(value: number): string {
    return Math.round(value || 0).toLocaleString('id-ID');
}

export function formatVolume(value: number): string {
    if (!value) return '-';
    return Number.isInteger(value)
        ? value.toLocaleString('id-ID')
        : value.toLocaleString('id-ID', { maximumFractionDigits: 2 });
}

export function formatCompactRupiah(value: number): string {
    if (!value || value <= 0) return 'Rp 0';
    if (value >= 999_500_000) {
        return `Rp ${(value / 1_000_000_000).toFixed(2).replace('.', ',')} M`;
    }
    if (value >= 999_500) {
        const jt = value / 1_000_000;
        return `Rp ${(jt >= 100 ? Math.round(jt).toString() : jt.toFixed(1).replace('.', ','))} Jt`;
    }
    if (value >= 1_000) {
        return `Rp ${Math.round(value / 1_000).toLocaleString('id-ID')} Rb`;
    }
    return `Rp ${Math.round(value).toLocaleString('id-ID')}`;
}
