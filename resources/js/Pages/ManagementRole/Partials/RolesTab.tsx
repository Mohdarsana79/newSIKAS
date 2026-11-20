import DangerButton from '@/Components/DangerButton';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import Modal from '@/Components/Modal';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import TextInput from '@/Components/TextInput';
import IconTile from '@/Components/ui/IconTile';
import StatusBadge from '@/Components/ui/StatusBadge';
import Surface from '@/Components/ui/Surface';
import type { ModulePermissionLevel, PermissionMatrixData } from '@/types';
import { router, useForm } from '@inertiajs/react';
import {
    AlertTriangle,
    CheckCircle2,
    Eye,
    Lock,
    Plus,
    Save,
    Shield,
    ShieldCheck,
    Trash2,
    Users,
    X,
} from 'lucide-react';
import { FormEventHandler, useEffect, useState } from 'react';
import PermissionMatrix from './PermissionMatrix';
import type { PermissionCatalog, RoleItem } from '../types';

interface RolesTabProps {
    roles: RoleItem[];
    catalog: PermissionCatalog;
}

export default function RolesTab({ roles, catalog }: RolesTabProps) {
    const [selectedRoleId, setSelectedRoleId] = useState<number>(roles[0]?.id ?? 0);
    const activeRole = roles.find((r) => r.id === selectedRoleId) || roles[0] || null;

    const [roleName, setRoleName] = useState(activeRole?.name ?? '');
    const [roleDesc, setRoleDesc] = useState(activeRole?.description ?? '');
    const [matrix, setMatrix] = useState<PermissionMatrixData>(
        activeRole?.permissions ?? { modules: {}, abilities: {} },
    );
    const [savingRole, setSavingRole] = useState(false);

    const [showCreateRoleModal, setShowCreateRoleModal] = useState(false);
    const [roleToDelete, setRoleToDelete] = useState<RoleItem | null>(null);
    const [deletingRole, setDeletingRole] = useState(false);

    const buildDefaultMatrix = (): PermissionMatrixData => {
        const modules: Record<string, ModulePermissionLevel> = {};
        for (const mod of catalog.modules) {
            modules[mod.key] = mod.key === 'dashboard' ? 'read' : 'none';
        }
        const abilities: Record<string, boolean> = {};
        for (const ab of catalog.abilities) {
            abilities[ab.key] = false;
        }
        return { modules, abilities };
    };

    const createRoleForm = useForm({
        name: '',
        slug: '',
        description: '',
        permissions: buildDefaultMatrix(),
    });

    useEffect(() => {
        if (activeRole) {
            setSelectedRoleId(activeRole.id);
            setRoleName(activeRole.name);
            setRoleDesc(activeRole.description ?? '');
            setMatrix({
                modules: { ...activeRole.permissions.modules },
                abilities: { ...activeRole.permissions.abilities },
            });
        }
    }, [activeRole?.id, roles]);

    const handleSaveRole = (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeRole) return;
        setSavingRole(true);

        router.put(
            route('management-role.roles.update', activeRole.id),
            {
                name: roleName,
                description: roleDesc,
                permissions: matrix as any,
            },
            {
                preserveScroll: true,
                onFinish: () => setSavingRole(false),
            },
        );
    };

    const handleCreateRole: FormEventHandler = (e) => {
        e.preventDefault();
        createRoleForm.post(route('management-role.roles.store'), {
            preserveScroll: true,
            onSuccess: () => {
                setShowCreateRoleModal(false);
                createRoleForm.reset();
                createRoleForm.setData('permissions', buildDefaultMatrix());
            },
        });
    };

    const confirmDeleteRole = () => {
        if (!roleToDelete) return;
        setDeletingRole(true);

        router.delete(route('management-role.roles.destroy', roleToDelete.id), {
            preserveScroll: true,
            onSuccess: () => setRoleToDelete(null),
            onFinish: () => setDeletingRole(false),
        });
    };

    const totalMods = catalog.modules.length || 1;
    const activeWriteCount = Object.values(matrix.modules).filter((lvl) => lvl === 'write').length;
    const activeReadCount = Object.values(matrix.modules).filter((lvl) => lvl === 'read').length;
    const activeAbilitiesCount = Object.values(matrix.abilities).filter(Boolean).length;

    return (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
            {/* Daftar Kartu Role di Kiri */}
            <div className="lg:col-span-4">
                <Surface
                    title="Daftar Role"
                    subtitle="Pilih role di bawah untuk mengatur izin fitur."
                    icon={
                        <IconTile tone="mint" size="md">
                            <Shield />
                        </IconTile>
                    }
                    actions={
                        <PrimaryButton
                            type="button"
                            onClick={() => {
                                createRoleForm.clearErrors();
                                setShowCreateRoleModal(true);
                            }}
                            className="!px-3 !py-1.5 !text-[11px]"
                        >
                            <Plus className="mr-1 h-3.5 w-3.5" />
                            Role Baru
                        </PrimaryButton>
                    }
                >
                    <div className="space-y-3">
                        {roles.map((role) => {
                            const selected = activeRole?.id === role.id;
                            const writeMods = Object.values(role.permissions.modules).filter(
                                (lvl) => lvl === 'write',
                            ).length;
                            const readMods = Object.values(role.permissions.modules).filter(
                                (lvl) => lvl === 'read',
                            ).length;
                            const writePct = Math.round((writeMods / totalMods) * 100);
                            const readPct = Math.round((readMods / totalMods) * 100);

                            const tileTone =
                                role.slug === 'bendahara'
                                    ? 'violet'
                                    : role.slug === 'kepala_sekolah'
                                      ? 'mint'
                                      : 'sky';

                            return (
                                <div
                                    key={role.id}
                                    onClick={() => setSelectedRoleId(role.id)}
                                    className={`group relative cursor-pointer overflow-hidden rounded-[22px] border p-4 transition-all duration-200 ${
                                        selected
                                            ? 'border-lime-400 bg-gradient-to-br from-lime-100/70 via-white to-pastel-lavender/40 shadow-card ring-2 ring-lime-300/60 dark:border-lime-400/60 dark:from-lime-400/15 dark:via-[#191726] dark:to-brand-500/10'
                                            : 'border-slate-100 bg-slate-50/70 hover:-translate-y-0.5 hover:border-slate-200 hover:bg-white dark:border-white/5 dark:bg-white/[0.02] dark:hover:border-white/15'
                                    }`}
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex min-w-0 items-start gap-3">
                                            <IconTile tone={selected ? 'lime' : tileTone} size="sm">
                                                <Shield />
                                            </IconTile>
                                            <div className="min-w-0">
                                                <div className="flex flex-wrap items-center gap-1.5">
                                                    <span className="truncate text-[13px] font-extrabold tracking-tight text-slate-900 dark:text-white">
                                                        {role.name}
                                                    </span>
                                                    {role.is_system && (
                                                        <StatusBadge tone="violet" dot={false}>
                                                            <Lock className="h-2.5 w-2.5" /> Sistem
                                                        </StatusBadge>
                                                    )}
                                                </div>
                                                <code className="mt-0.5 block text-[10px] font-semibold text-slate-400 dark:text-slate-500">
                                                    {role.slug}
                                                </code>
                                            </div>
                                        </div>

                                        {!role.is_system && role.users_count === 0 ? (
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setRoleToDelete(role);
                                                }}
                                                className="sikas-icon-btn h-7 w-7 shrink-0 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-500/15"
                                                title="Hapus Role"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </button>
                                        ) : (
                                            <span className="sikas-num inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-extrabold text-slate-600 shadow-sm dark:bg-white/10 dark:text-slate-300">
                                                <Users className="h-3 w-3" />
                                                {role.users_count}
                                            </span>
                                        )}
                                    </div>

                                    {role.description && (
                                        <p className="mt-2 line-clamp-2 text-[10.5px] font-medium leading-relaxed text-slate-500 dark:text-slate-400">
                                            {role.description}
                                        </p>
                                    )}

                                    {/* Bar Proporsi Akses Modul */}
                                    <div className="mt-3 space-y-1.5">
                                        <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-slate-200/80 dark:bg-white/10">
                                            {writePct > 0 && (
                                                <div
                                                    className="h-full bg-gradient-to-r from-lime-400 to-lime-500"
                                                    style={{ width: `${writePct}%` }}
                                                />
                                            )}
                                            {readPct > 0 && (
                                                <div
                                                    className="h-full bg-gradient-to-r from-sky-400 to-sky-500"
                                                    style={{ width: `${readPct}%` }}
                                                />
                                            )}
                                        </div>
                                        <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 dark:text-slate-400">
                                            <span className="sikas-num">
                                                {writeMods} kelola · {readMods} lihat
                                            </span>
                                            <span className="sikas-num">
                                                {writeMods + readMods}/{catalog.modules.length} modul
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </Surface>
            </div>

            {/* Editor Matriks Hak Akses Role di Kanan */}
            <div className="lg:col-span-8">
                {activeRole && (
                    <form onSubmit={handleSaveRole}>
                        <Surface
                            title={`Konfigurasi Role: ${activeRole.name}`}
                            subtitle="Atur identitas tampilan dan hak akses fitur per modul untuk seluruh pengguna dengan role ini."
                            icon={
                                <IconTile tone="violet" size="md">
                                    <Shield />
                                </IconTile>
                            }
                            actions={
                                <PrimaryButton type="submit" disabled={savingRole}>
                                    <Save className="mr-1.5 h-4 w-4" />
                                    {savingRole ? 'Menyimpan...' : 'Simpan Pengaturan Role'}
                                </PrimaryButton>
                            }
                        >
                            <div className="space-y-4">
                                {/* 3 Kartu Mini Ringkasan Akses Role */}
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                    <div className="flex items-center gap-3 rounded-2xl border border-lime-300/70 bg-lime-50/60 p-3 dark:border-lime-400/25 dark:bg-lime-400/[0.06]">
                                        <IconTile tone="lime" size="sm">
                                            <CheckCircle2 />
                                        </IconTile>
                                        <div>
                                            <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                                                KELOLA PENUH
                                            </p>
                                            <p className="sikas-num text-[16px] font-extrabold text-slate-900 dark:text-white">
                                                {activeWriteCount}{' '}
                                                <span className="text-[11px] font-semibold text-slate-500">
                                                    / {catalog.modules.length} modul
                                                </span>
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 rounded-2xl border border-sky/25 bg-pastel-sky/40 p-3 dark:border-sky/25 dark:bg-sky/[0.06]">
                                        <IconTile tone="sky" size="sm">
                                            <Eye />
                                        </IconTile>
                                        <div>
                                            <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                                                LIHAT SAJA (READ)
                                            </p>
                                            <p className="sikas-num text-[16px] font-extrabold text-slate-900 dark:text-white">
                                                {activeReadCount}{' '}
                                                <span className="text-[11px] font-semibold text-slate-500">
                                                    / {catalog.modules.length} modul
                                                </span>
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 rounded-2xl border border-brand-200/70 bg-pastel-lavender/40 p-3 dark:border-brand-400/25 dark:bg-brand-500/[0.06]">
                                        <IconTile tone="violet" size="sm">
                                            <ShieldCheck />
                                        </IconTile>
                                        <div>
                                            <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                                                KEWENANGAN RKAS
                                            </p>
                                            <p className="sikas-num text-[16px] font-extrabold text-slate-900 dark:text-white">
                                                {activeAbilitiesCount}{' '}
                                                <span className="text-[11px] font-semibold text-slate-500">
                                                    / {catalog.abilities.length} aktif
                                                </span>
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Input Nama & Deskripsi Role */}
                                <div className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-100 bg-slate-50/50 p-3.5 sm:grid-cols-2 dark:border-white/10 dark:bg-white/[0.02]">
                                    <div>
                                        <InputLabel htmlFor="active_role_name" value="Nama Tampilan Role" />
                                        <TextInput
                                            id="active_role_name"
                                            value={roleName}
                                            onChange={(e) => setRoleName(e.target.value)}
                                            className="mt-1 block w-full"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <InputLabel htmlFor="active_role_desc" value="Deskripsi Singkat" />
                                        <TextInput
                                            id="active_role_desc"
                                            value={roleDesc}
                                            onChange={(e) => setRoleDesc(e.target.value)}
                                            className="mt-1 block w-full"
                                            placeholder="Tugas atau ruang lingkup role ini"
                                        />
                                    </div>
                                </div>

                                <PermissionMatrix
                                    catalog={catalog}
                                    value={matrix}
                                    onChange={setMatrix}
                                    lockAdminModule={activeRole.slug === 'bendahara'}
                                    disabled={savingRole}
                                />
                            </div>
                        </Surface>
                    </form>
                )}
            </div>

            {/* Modal Buat Role Baru */}
            <Modal
                show={showCreateRoleModal}
                onClose={() => !createRoleForm.processing && setShowCreateRoleModal(false)}
                maxWidth="md"
            >
                <form
                    onSubmit={handleCreateRole}
                    className="relative flex max-h-[90vh] flex-col overflow-hidden rounded-[26px] bg-white dark:bg-[#15131F]"
                >
                    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[26px]">
                        <div className="absolute -right-12 -top-16 h-40 w-40 rounded-full bg-lime-400/20 blur-3xl" />
                        <div className="absolute -bottom-16 -left-12 h-40 w-40 rounded-full bg-brand-500/15 blur-3xl" />
                    </div>

                    <div className="relative flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 px-6 py-5 dark:border-white/5">
                        <div className="flex min-w-0 items-start gap-3">
                            <IconTile tone="lime" size="lg">
                                <Shield />
                            </IconTile>
                            <div className="min-w-0">
                                <h2 className="text-[15px] font-extrabold text-slate-900 dark:text-white">
                                    Buat Role Custom Baru
                                </h2>
                                <p className="mt-0.5 text-[10.5px] font-medium text-slate-400 dark:text-slate-500">
                                    Contoh: Operator TU, Staf Inventaris, atau Pemeriksa Internal.
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => !createRoleForm.processing && setShowCreateRoleModal(false)}
                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-400 transition hover:bg-slate-100 hover:text-slate-800 dark:bg-white/5 dark:hover:bg-white/10 dark:hover:text-white"
                            aria-label="Tutup"
                        >
                            <X className="h-3.5 w-3.5" />
                        </button>
                    </div>

                    <div className="relative space-y-4 px-6 py-5">
                        <div>
                            <InputLabel htmlFor="new_role_name" value="Nama Role" />
                            <TextInput
                                id="new_role_name"
                                value={createRoleForm.data.name}
                                onChange={(e) => createRoleForm.setData('name', e.target.value)}
                                className="mt-1 block w-full"
                                placeholder="Contoh: Operator Tata Usaha"
                                required
                            />
                            <InputError message={createRoleForm.errors.name} className="mt-1" />
                        </div>

                        <div>
                            <InputLabel htmlFor="new_role_slug" value="Kode Role / Slug (Opsional)" />
                            <TextInput
                                id="new_role_slug"
                                value={createRoleForm.data.slug}
                                onChange={(e) => createRoleForm.setData('slug', e.target.value)}
                                className="mt-1 block w-full"
                                placeholder="Otomatis dari nama jika dikosongkan (mis. operator_tu)"
                            />
                            <InputError message={createRoleForm.errors.slug} className="mt-1" />
                        </div>

                        <div>
                            <InputLabel htmlFor="new_role_desc" value="Deskripsi (Opsional)" />
                            <TextInput
                                id="new_role_desc"
                                value={createRoleForm.data.description}
                                onChange={(e) => createRoleForm.setData('description', e.target.value)}
                                className="mt-1 block w-full"
                                placeholder="Ringkasan kewenangan role ini"
                            />
                            <InputError message={createRoleForm.errors.description} className="mt-1" />
                        </div>
                    </div>

                    <div className="relative flex items-center justify-end gap-2 border-t border-slate-100 px-6 py-4 dark:border-white/5">
                        <SecondaryButton
                            onClick={() => setShowCreateRoleModal(false)}
                            disabled={createRoleForm.processing}
                        >
                            Batal
                        </SecondaryButton>
                        <PrimaryButton disabled={createRoleForm.processing}>
                            {createRoleForm.processing ? 'Membuat...' : 'Buat Role'}
                        </PrimaryButton>
                    </div>
                </form>
            </Modal>

            {/* Modal Hapus Role Custom */}
            <Modal show={Boolean(roleToDelete)} onClose={() => !deletingRole && setRoleToDelete(null)} maxWidth="sm">
                <div className="relative overflow-hidden rounded-[26px] bg-white dark:bg-[#15131F]">
                    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[26px]">
                        <div className="absolute -right-12 -top-16 h-36 w-36 rounded-full bg-rose-500/20 blur-3xl" />
                    </div>

                    <div className="relative flex items-start justify-between gap-3 border-b border-slate-100 px-6 py-4 dark:border-white/5">
                        <div className="flex items-center gap-3">
                            <IconTile tone="rose" size="md">
                                <AlertTriangle />
                            </IconTile>
                            <div>
                                <h2 className="text-[14px] font-extrabold text-slate-900 dark:text-white">
                                    Hapus Role Custom
                                </h2>
                                <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500">
                                    Konfirmasi penghapusan role
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="relative space-y-4 px-6 py-5">
                        <p className="text-[12px] font-medium text-slate-600 dark:text-slate-300">
                            Yakin ingin menghapus role <strong className="font-extrabold">{roleToDelete?.name}</strong>?
                        </p>
                        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4 dark:border-white/5">
                            <SecondaryButton onClick={() => setRoleToDelete(null)} disabled={deletingRole}>
                                Batal
                            </SecondaryButton>
                            <DangerButton onClick={confirmDeleteRole} disabled={deletingRole}>
                                {deletingRole ? 'Menghapus...' : 'Ya, Hapus Role'}
                            </DangerButton>
                        </div>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
