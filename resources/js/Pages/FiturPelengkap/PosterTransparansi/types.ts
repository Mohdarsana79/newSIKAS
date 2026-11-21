export type PosterPeriode = 'tahunan' | 'tahap_1' | 'tahap_2';

export type PosterThemeKey = 'neobento' | 'resmi' | 'emerald';

export type PosterPaperSize = 'a4' | 'a3';

export interface PosterJenisBelanjaItem {
    key: string;
    label: string;
    nominal: number;
    persentase: number;
    color_key: 'violet' | 'sky' | 'amber' | 'mint' | 'slate';
}

export interface PosterProgramSnpItem {
    program: string;
    nominal: number;
    persentase: number;
    jumlah_transaksi: number;
}

export interface PosterTrenBulananItem {
    bulan: number;
    label: string;
    nominal: number;
}

export interface PosterData {
    meta: {
        variant: string;
        variant_label: string;
        tahun: number;
        periode: PosterPeriode;
        periode_label: string;
        available_years: number[];
        has_data: boolean;
        generated_at_formatted: string;
    };
    sekolah: {
        nama_sekolah: string;
        npsn: string;
        status_sekolah: string;
        jenjang_sekolah: string;
        alamat_lengkap: string;
        kabupaten_kota: string;
        logo_daerah_data_uri: string | null;
        logo_sekolah_data_uri: string | null;
    };
    ringkasan: {
        pagu_anggaran: number;
        dana_diterima: number;
        total_realisasi: number;
        sisa_dana: number;
        sisa_pagu: number;
        persentase_serapan: number;
        persentase_serapan_aktual: number;
        jumlah_transaksi: number;
        status_persetujuan: 'disetujui' | 'draft';
        tanggal_persetujuan_formatted: string | null;
    };
    jenis_belanja: PosterJenisBelanjaItem[];
    program_snp: PosterProgramSnpItem[];
    tren_bulanan: PosterTrenBulananItem[];
    penanggung_jawab: {
        kepala_sekolah: string;
        nip_kepala_sekolah?: string;
        bendahara: string;
        nip_bendahara?: string;
        komite: string;
    };
}
