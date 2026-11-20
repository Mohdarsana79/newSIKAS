export interface ActionButton {
    label: string;
    url: string;
    icon?: string;
    description?: string;
}

export interface StagingDraft {
    type: 'bku_transaction_draft';
    variant: string;
    tahun: number;
    tanggal: string;
    jenis_transaksi: string;
    rkas_id: number;
    kode_kegiatan_id: number;
    nama_kegiatan: string;
    kode_rekening_id: number;
    kode_rekening: string;
    nama_rekening: string;
    uraian: string;
    nama_toko: string;
    nominal: number;
    volume: number;
    satuan: string;
    harga_satuan: number;
    total_pajak: number;
    pajak_label: string;
    sisa_pagu_sebelum: number;
    sisa_pagu_sesudah: number;
    is_over_budget: boolean;
    is_committed?: boolean;
    bku_id?: number;
    commit_error?: string;
}

export interface CopilotAnalyticsChart {
    title: string;
    categories: string[];
    series: {
        name: string;
        data: number[];
    }[];
}

export interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    staging_card?: StagingDraft;
    analytics_chart?: CopilotAnalyticsChart;
    action_buttons?: ActionButton[];
    timestamp: string;
}
