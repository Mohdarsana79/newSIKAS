import type { ModulePermissionLevel, PermissionMatrixData } from '@/types';

export interface PermissionModuleMeta {
    key: string;
    label: string;
    group: string;
    description: string;
    supports_write: boolean;
}

export interface PermissionAbilityMeta {
    key: string;
    label: string;
    description: string;
}

export interface PermissionCatalog {
    modules: PermissionModuleMeta[];
    abilities: PermissionAbilityMeta[];
}

export interface RoleItem {
    id: number;
    slug: string;
    name: string;
    description: string | null;
    is_system: boolean;
    users_count: number;
    permissions: PermissionMatrixData;
}

export interface ManagedUserItem {
    id: number;
    name: string;
    username: string;
    email: string;
    role: string;
    role_name: string;
    has_custom_override: boolean;
    custom_permissions: PermissionMatrixData | null;
    effective_permissions: PermissionMatrixData;
    created_at: string | null;
}

export const LEVEL_LABELS: Record<ModulePermissionLevel, string> = {
    none: 'Tidak Ada',
    read: 'Lihat Saja',
    write: 'Kelola Penuh',
};
