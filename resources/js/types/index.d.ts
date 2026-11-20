export type ModulePermissionLevel = 'none' | 'read' | 'write';

export interface PermissionMatrixData {
    modules: Record<string, ModulePermissionLevel>;
    abilities: Record<string, boolean>;
}

export interface User {
    id: number;
    name: string;
    email: string;
    username: string;
    role?: string;
    role_name?: string;
    is_kepala_sekolah?: boolean;
    is_bendahara?: boolean;
    is_security_code_enabled: boolean;
    email_verified_at?: string;
}

export interface SharedSekolah {
    id: number;
    nama_sekolah: string;
    npsn: string;
    kop_surat?: string;
    kop_border?: 'double' | 'single' | 'none';
    kop_dokumen?: Record<string, boolean>;
    kop_mode?: '1_logo' | '2_logo';
    kop_teks_html?: string;
    logo_daerah?: string;
    logo_sekolah?: string;
}

export type PageProps<
    T extends Record<string, unknown> = Record<string, unknown>,
> = T & {
    auth: {
        user: User;
        permissions?: PermissionMatrixData & {
            has_custom_override?: boolean;
        };
    };
    sekolah?: SharedSekolah | null;
    flash?: {
        success?: string | null;
        warning?: string | null;
        error?: string | null;
        show_changelog?: unknown;
        arkas_sync_report?: unknown;
    };
};
