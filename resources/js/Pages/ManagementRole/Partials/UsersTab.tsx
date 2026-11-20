import DangerButton from '@/Components/DangerButton';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import Modal from '@/Components/Modal';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import TextInput from '@/Components/TextInput';
import DataTable from '@/Components/ui/DataTable';
import EmptyState from '@/Components/ui/EmptyState';
import IconTile from '@/Components/ui/IconTile';
import StatusBadge from '@/Components/ui/StatusBadge';
import type { PermissionMatrixData } from '@/types';
import { router, useForm, usePage } from '@inertiajs/react';
import {
    AlertTriangle,
    Edit,
    KeyRound,
    RotateCcw,
    Search,
    Shield,
    ShieldCheck,
    SlidersHorizontal,
    Trash2,
    UserPlus,
    Users,
    X,
} from 'lucide-react';
import { FormEventHandler, useMemo, useState } from 'react';
import PermissionMatrix from './PermissionMatrix';
import type { ManagedUserItem, PermissionCatalog, RoleItem } from '../types';

interface UsersTabProps {
    users: ManagedUserItem[];
    roles: RoleItem[];
    catalog: PermissionCatalog;
    onSwitchToRolesTab?: () => void;
}

export default function UsersTab({ users, roles, catalog, onSwitchToRolesTab }: UsersTabProps) {
    const { auth } = usePage().props as any;
    const currentUser = auth?.user;

    const [searchQuery, setSearchQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState<string>('all');

    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState<ManagedUserItem | null>(null);
    const [userToDelete, setUserToDelete] = useState<ManagedUserItem | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // State Override Hak Akses Khusus User
    const [accessUser, setAccessUser] = useState<ManagedUserItem | null>(null);
    const [accessMatrix, setAccessMatrix] = useState<PermissionMatrixData>({ modules: {}, abilities: {} });
    const [savingAccess, setSavingAccess] = useState(false);

    const createForm = useForm({
        name: '',
        username: '',
        email: '',
        password: '',
        password_confirmation: '',
        role: roles.find((r) => r.slug === 'kepala_sekolah')?.slug || roles[0]?.slug || 'kepala_sekolah',
    });

    const editForm = useForm({
        name: '',
        username: '',
        email: '',
        password: '',
        role: 'kepala_sekolah',
    });

    const filteredUsers = useMemo(() => {
        return users.filter((u) => {
            if (roleFilter !== 'all' && u.role !== roleFilter) {
                return false;
            }
            if (searchQuery.trim() === '') {
                return true;
            }
            const q = searchQuery.toLowerCase();
            return (
                u.name.toLowerCase().includes(q) ||
                u.username.toLowerCase().includes(q) ||
                (u.email && u.email.toLowerCase().includes(q)) ||
                u.role_name.toLowerCase().includes(q)
            );
        });
    }, [users, roleFilter, searchQuery]);

    const closeCreateModal = () => {
        if (createForm.processing) return;
        setShowCreateModal(false);
        createForm.clearErrors();
    };

    const closeEditModal = () => {
        if (editForm.processing) return;
        setShowEditModal(false);
        editForm.clearErrors();
    };

    const handleCreateSubmit: FormEventHandler = (e) => {
        e.preventDefault();
        createForm.post(route('user-management.store'), {
            preserveScroll: true,
            onSuccess: () => {
                setShowCreateModal(false);
                createForm.reset();
            },
        });
    };

    const handleOpenEdit = (user: ManagedUserItem) => {
        setSelectedUser(user);
        editForm.clearErrors();
        editForm.setData({
            name: user.name,
            username: user.username,
            email: user.email,
            password: '',
            role: user.role,
        });
        setShowEditModal(true);
    };

    const handleEditSubmit: FormEventHandler = (e) => {
        e.preventDefault();
        if (!selectedUser) return;

        editForm.put(route('user-management.update', selectedUser.id), {
            preserveScroll: true,
            onSuccess: () => {
                setShowEditModal(false);
                editForm.reset();
                setSelectedUser(null);
            },
        });
    };

    const openUserAccessModal = (user: ManagedUserItem) => {
        setAccessUser(user);
        setAccessMatrix({
            modules: { ...user.effective_permissions.modules },
            abilities: { ...user.effective_permissions.abilities },
        });
    };

    const saveUserAccess = () => {
        if (!accessUser) return;
        setSavingAccess(true);
        router.put(
            route('user-management.permissions', accessUser.id),
            { permissions: accessMatrix as any },
            {
                preserveScroll: true,
                onSuccess: () => setAccessUser(null),
                onFinish: () => setSavingAccess(false),
            },
        );
    };

    const resetUserAccessToRole = () => {
        if (!accessUser) return;
        setSavingAccess(true);
        router.put(
            route('user-management.permissions', accessUser.id),
            { reset_to_role: true },
            {
                preserveScroll: true,
                onSuccess: () => setAccessUser(null),
                onFinish: () => setSavingAccess(false),
            },
        );
    };

    const confirmDeleteUser = () => {
        if (!userToDelete) return;
        setIsDeleting(true);

        router.delete(route('user-management.destroy', userToDelete.id), {
            preserveScroll: true,
            onSuccess: () => setUserToDelete(null),
            onFinish: () => setIsDeleting(false),
        });
    };

    const getInitials = (name: string): string => {
        const parts = name
            .replace(/[^a-zA-Z0-9\s]/g, ' ')
            .trim()
            .split(/\s+/)
            .filter(Boolean);
        if (parts.length === 0) return 'U';
        if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
        return (parts[0][0] + parts[1][0]).toUpperCase();
    };

    const getAvatarGradient = (roleSlug: string): string => {
        if (roleSlug === 'bendahara') {
            return 'from-brand-400 via-brand-500 to-peach ring-lime-300';
        }
        if (roleSlug === 'kepala_sekolah') {
            return 'from-emerald-400 via-teal-500 to-cyan-500 ring-mint/60';
        }
        return 'from-sky-400 via-indigo-500 to-brand-500 ring-sky/50';
    };

    return (
        <div className="space-y-4">
            <DataTable
                title="Daftar Pengguna & Hak Akses Individu"
                subtitle="Kelola akun pengguna, tetapkan role, atau sesuaikan hak akses fitur per individu."
                icon={
                    <IconTile tone="violet" size="md">
                        <Users />
                    </IconTile>
                }
                actions={
                    <div className="flex flex-wrap items-center gap-2">
                        {onSwitchToRolesTab && (
                            <SecondaryButton type="button" onClick={onSwitchToRolesTab}>
                                <Shield className="mr-1.5 h-3.5 w-3.5" />
                                Kelola Role
                            </SecondaryButton>
                        )}
                        <PrimaryButton onClick={() => setShowCreateModal(true)}>
                            <UserPlus className="mr-1.5 h-4 w-4" />
                            Tambah Pengguna
                        </PrimaryButton>
                    </div>
                }
                footer={
                    <>
                        <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500">
                            Menampilkan <strong className="sikas-num text-slate-700 dark:text-slate-200">{filteredUsers.length}</strong> dari{' '}
                            <strong className="sikas-num text-slate-700 dark:text-slate-200">{users.length}</strong> pengguna terdaftar
                        </span>
                        <div className="flex items-center gap-3 text-[10.5px] font-semibold text-slate-400 dark:text-slate-500">
                            <span className="inline-flex items-center gap-1.5">
                                <span className="h-2 w-2 rounded-full bg-lime-400" />
                                Modul Kelola Penuh
                            </span>
                            <span className="inline-flex items-center gap-1.5">
                                <span className="h-2 w-2 rounded-full bg-sky-400" />
                                Modul Lihat Saja
                            </span>
                        </div>
                    </>
                }
            >
                {/* Filter & Pencarian Bar */}
                <div className="flex flex-col gap-3 border-b border-slate-100 px-5 pb-3.5 pt-1 sm:flex-row sm:items-center sm:justify-between dark:border-white/5">
                    <div className="flex flex-wrap items-center gap-1.5">
                        <button
                            type="button"
                            onClick={() => setRoleFilter('all')}
                            className={`rounded-xl px-3 py-1.5 text-[11px] font-extrabold transition ${
                                roleFilter === 'all'
                                    ? 'bg-slate-900 text-white shadow-sm dark:bg-lime-400 dark:text-slate-950'
                                    : 'bg-slate-100/80 text-slate-500 hover:bg-slate-200/70 hover:text-slate-800 dark:bg-white/5 dark:text-slate-400 dark:hover:bg-white/10'
                            }`}
                        >
                            Semua ({users.length})
                        </button>
                        {roles.map((r) => {
                            const count = users.filter((u) => u.role === r.slug).length;
                            const active = roleFilter === r.slug;
                            return (
                                <button
                                    key={r.slug}
                                    type="button"
                                    onClick={() => setRoleFilter(r.slug)}
                                    className={`rounded-xl px-3 py-1.5 text-[11px] font-extrabold transition ${
                                        active
                                            ? 'bg-slate-900 text-white shadow-sm dark:bg-lime-400 dark:text-slate-950'
                                            : 'bg-slate-100/80 text-slate-500 hover:bg-slate-200/70 hover:text-slate-800 dark:bg-white/5 dark:text-slate-400 dark:hover:bg-white/10'
                                    }`}
                                >
                                    {r.name} ({count})
                                </button>
                            );
                        })}
                    </div>

                    <div className="relative w-full sm:w-64">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Cari nama, NIP, atau username…"
                            className="w-full rounded-xl border border-slate-200/90 bg-slate-50/70 py-1.5 pl-8 pr-7 text-[11.5px] font-semibold text-slate-800 transition focus:border-lime-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-lime-200/50 dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:border-lime-400/60"
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={() => setSearchQuery('')}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white"
                            >
                                <X className="h-3.5 w-3.5" />
                            </button>
                        )}
                    </div>
                </div>

                {filteredUsers.length === 0 ? (
                    <div className="p-6">
                        <EmptyState
                            icon={<Users className="h-6 w-6" />}
                            title="Tidak ada pengguna yang cocok"
                            description="Coba ubah kata kunci pencarian atau pilih filter role lainnya."
                        />
                    </div>
                ) : (
                    <table className="min-w-full">
                        <thead>
                            <tr>
                                <th className="text-left">Pengguna</th>
                                <th className="text-left">Username / NIP &amp; Email</th>
                                <th className="text-left">Role Aktif</th>
                                <th className="text-left">Cakupan Akses Fitur</th>
                                <th className="text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredUsers.map((u) => {
                                const isCurrent = u.id === currentUser?.id;
                                const isBendahara = u.role === 'bendahara';
                                const isKepsek = u.role === 'kepala_sekolah';

                                const totalMods = catalog.modules.length || 1;
                                const writeMods = Object.values(u.effective_permissions.modules).filter(
                                    (lvl) => lvl === 'write',
                                ).length;
                                const readMods = Object.values(u.effective_permissions.modules).filter(
                                    (lvl) => lvl === 'read',
                                ).length;
                                const allowedCount = writeMods + readMods;
                                const writePct = Math.round((writeMods / totalMods) * 100);
                                const readPct = Math.round((readMods / totalMods) * 100);

                                const hasReviewAbility =
                                    u.effective_permissions.abilities?.rkas_review ||
                                    u.effective_permissions.abilities?.rkas_approve;

                                return (
                                    <tr key={u.id}>
                                        <td>
                                            <div className="flex items-center gap-3">
                                                <span
                                                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-[11.5px] font-extrabold text-white shadow-sm ring-2 ring-offset-2 ring-offset-white dark:ring-offset-[#15131F] ${getAvatarGradient(u.role)}`}
                                                >
                                                    {getInitials(u.name)}
                                                </span>
                                                <div className="min-w-0">
                                                    <div className="flex flex-wrap items-center gap-2 font-extrabold text-slate-900 dark:text-white">
                                                        <span className="truncate">{u.name}</span>
                                                        {isCurrent && (
                                                            <span className="rounded-full bg-lime-200/80 px-2 py-0.5 text-[9px] font-extrabold text-slate-900 dark:bg-lime-400/20 dark:text-lime-300">
                                                                Akun Anda
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="mt-0.5 text-[10px] font-medium text-slate-400 dark:text-slate-500">
                                                        ID #{u.id}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <code className="rounded-lg bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-bold text-slate-800 dark:bg-white/10 dark:text-slate-200">
                                                {u.username}
                                            </code>
                                            <div className="mt-1 text-[10.5px] font-medium text-slate-400 dark:text-slate-500">
                                                {u.email}
                                            </div>
                                        </td>
                                        <td>
                                            <div className="flex flex-col items-start gap-1">
                                                <StatusBadge
                                                    tone={isBendahara ? 'violet' : isKepsek ? 'success' : 'info'}
                                                    dot
                                                >
                                                    {u.role_name}
                                                </StatusBadge>
                                                {hasReviewAbility && (
                                                    <span className="inline-flex items-center gap-1 text-[9.5px] font-bold text-brand-600 dark:text-brand-300">
                                                        <ShieldCheck className="h-3 w-3" />
                                                        Telaah &amp; Sahkan RKAS
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td>
                                            <div className="max-w-[230px] space-y-1.5">
                                                <div className="flex items-center justify-between gap-2">
                                                    <StatusBadge
                                                        tone={u.has_custom_override ? 'warning' : 'neutral'}
                                                        dot={false}
                                                    >
                                                        {u.has_custom_override ? 'Override Khusus' : 'Sesuai Role'}
                                                    </StatusBadge>
                                                    <span className="sikas-num text-[10.5px] font-extrabold text-slate-700 dark:text-slate-200">
                                                        {allowedCount}/{catalog.modules.length} modul
                                                    </span>
                                                </div>
                                                <div className="flex h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
                                                    {writePct > 0 && (
                                                        <div
                                                            className="h-full bg-gradient-to-r from-lime-400 to-lime-500 transition-all duration-500"
                                                            style={{ width: `${writePct}%` }}
                                                            title={`${writeMods} modul Kelola Penuh`}
                                                        />
                                                    )}
                                                    {readPct > 0 && (
                                                        <div
                                                            className="h-full bg-gradient-to-r from-sky-400 to-sky-500 transition-all duration-500"
                                                            style={{ width: `${readPct}%` }}
                                                            title={`${readMods} modul Lihat Saja`}
                                                        />
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2 text-[9.5px] font-semibold text-slate-400 dark:text-slate-500">
                                                    <span className="sikas-num">{writeMods} kelola</span>
                                                    <span>·</span>
                                                    <span className="sikas-num">{readMods} lihat</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="flex items-center justify-end gap-1.5">
                                                <button
                                                    type="button"
                                                    onClick={() => openUserAccessModal(u)}
                                                    className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-[10.5px] font-extrabold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-lime-400 hover:bg-lime-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:border-lime-400/50 dark:hover:bg-lime-400/10"
                                                    title="Atur Hak Akses Fitur Pengguna Ini"
                                                >
                                                    <SlidersHorizontal className="h-3.5 w-3.5 text-brand-500 dark:text-lime-300" />
                                                    <span>Hak Akses</span>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleOpenEdit(u)}
                                                    className="sikas-icon-btn h-8 w-8"
                                                    title="Edit Profil / Ubah Role / Reset Password"
                                                >
                                                    <Edit className="h-4 w-4" />
                                                </button>
                                                {!isCurrent && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setUserToDelete(u)}
                                                        className="sikas-icon-btn h-8 w-8 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/15 dark:hover:text-rose-300"
                                                        title="Hapus Pengguna"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </DataTable>

            {/* Modal Tambah Pengguna */}
            <Modal show={showCreateModal} onClose={closeCreateModal} maxWidth="md">
                <form
                    onSubmit={handleCreateSubmit}
                    className="relative flex max-h-[90vh] flex-col overflow-hidden rounded-[26px] bg-white dark:bg-[#15131F]"
                >
                    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[26px]">
                        <div className="absolute -right-12 -top-16 h-40 w-40 rounded-full bg-lime-400/20 blur-3xl" />
                        <div className="absolute -bottom-16 -left-12 h-40 w-40 rounded-full bg-brand-500/15 blur-3xl" />
                    </div>

                    <div className="relative flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 px-6 py-5 dark:border-white/5">
                        <div className="flex min-w-0 items-start gap-3">
                            <IconTile tone="lime" size="lg">
                                <UserPlus />
                            </IconTile>
                            <div className="min-w-0">
                                <h2 className="text-[15px] font-extrabold tracking-tight text-slate-900 dark:text-white">
                                    Tambah Pengguna Baru
                                </h2>
                                <p className="mt-0.5 text-[10.5px] font-medium text-slate-400 dark:text-slate-500">
                                    Pilih role yang sesuai dan atur kredensial login awal pengguna.
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={closeCreateModal}
                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-400 transition hover:bg-slate-100 hover:text-slate-800 dark:bg-white/5 dark:hover:bg-white/10 dark:hover:text-white"
                            aria-label="Tutup"
                        >
                            <X className="h-3.5 w-3.5" />
                        </button>
                    </div>

                    <div className="sikas-scroll relative flex-1 space-y-4 overflow-y-auto px-6 py-5">
                        <div>
                            <InputLabel htmlFor="create_role" value="Role Pengguna" />
                            <select
                                id="create_role"
                                value={createForm.data.role}
                                onChange={(e) => createForm.setData('role', e.target.value)}
                                className="mt-1 block w-full rounded-xl border border-slate-200/90 bg-white px-3.5 py-2.5 text-[12px] font-semibold text-slate-800 shadow-sm transition focus:border-lime-400 focus:outline-none focus:ring-4 focus:ring-lime-200/60 dark:border-white/10 dark:bg-slate-900 dark:text-white"
                            >
                                {roles.map((r) => (
                                    <option key={r.slug} value={r.slug}>
                                        {r.name}
                                    </option>
                                ))}
                            </select>
                            <InputError message={createForm.errors.role} className="mt-1" />
                        </div>

                        <div>
                            <InputLabel htmlFor="create_name" value="Nama Lengkap" />
                            <TextInput
                                id="create_name"
                                value={createForm.data.name}
                                onChange={(e) => createForm.setData('name', e.target.value)}
                                className="mt-1 block w-full"
                                placeholder="Contoh: Drs. H. Ahmad Sudrajat, M.Pd"
                                required
                            />
                            <InputError message={createForm.errors.name} className="mt-1" />
                        </div>

                        <div>
                            <InputLabel htmlFor="create_username" value="Username / NIP / Email Login" />
                            <TextInput
                                id="create_username"
                                value={createForm.data.username}
                                onChange={(e) => createForm.setData('username', e.target.value)}
                                className="mt-1 block w-full"
                                placeholder="Contoh: operator_tu atau 198001012005011001"
                                required
                            />
                            <p className="mt-1 text-[10px] font-medium text-slate-400 dark:text-slate-500">
                                Dapat berupa username unik, NIP 18 digit, atau email resmi.
                            </p>
                            <InputError message={createForm.errors.username} className="mt-1" />
                        </div>

                        <div>
                            <InputLabel htmlFor="create_email" value="Email (Opsional)" />
                            <TextInput
                                id="create_email"
                                type="email"
                                value={createForm.data.email}
                                onChange={(e) => createForm.setData('email', e.target.value)}
                                className="mt-1 block w-full"
                                placeholder="nama@sekolah.sch.id"
                            />
                            <InputError message={createForm.errors.email} className="mt-1" />
                        </div>

                        <div>
                            <InputLabel htmlFor="create_password" value="Password Awal" />
                            <TextInput
                                id="create_password"
                                type="password"
                                value={createForm.data.password}
                                onChange={(e) => createForm.setData('password', e.target.value)}
                                className="mt-1 block w-full"
                                placeholder="Minimal 6 karakter"
                                required
                            />
                            <InputError message={createForm.errors.password} className="mt-1" />
                        </div>
                    </div>

                    <div className="relative flex shrink-0 items-center justify-end gap-2 border-t border-slate-100 px-6 py-4 dark:border-white/5">
                        <SecondaryButton onClick={closeCreateModal} disabled={createForm.processing}>
                            Batal
                        </SecondaryButton>
                        <PrimaryButton disabled={createForm.processing}>
                            {createForm.processing ? 'Menyimpan...' : 'Simpan Pengguna'}
                        </PrimaryButton>
                    </div>
                </form>
            </Modal>

            {/* Modal Edit Pengguna */}
            <Modal show={showEditModal} onClose={closeEditModal} maxWidth="md">
                <form
                    onSubmit={handleEditSubmit}
                    className="relative flex max-h-[90vh] flex-col overflow-hidden rounded-[26px] bg-white dark:bg-[#15131F]"
                >
                    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[26px]">
                        <div className="absolute -right-12 -top-16 h-40 w-40 rounded-full bg-amber-400/15 blur-3xl" />
                        <div className="absolute -bottom-16 -left-12 h-40 w-40 rounded-full bg-brand-500/15 blur-3xl" />
                    </div>

                    <div className="relative flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 px-6 py-5 dark:border-white/5">
                        <div className="flex min-w-0 items-start gap-3">
                            <IconTile tone="amber" size="lg">
                                <Edit />
                            </IconTile>
                            <div className="min-w-0">
                                <h2 className="text-[15px] font-extrabold tracking-tight text-slate-900 dark:text-white">
                                    Edit Pengguna / Ganti Role / Reset Password
                                </h2>
                                <p className="mt-0.5 text-[10.5px] font-medium text-slate-400 dark:text-slate-500">
                                    Perbarui identitas, role akun, atau reset kata sandi pengguna.
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={closeEditModal}
                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-400 transition hover:bg-slate-100 hover:text-slate-800 dark:bg-white/5 dark:hover:bg-white/10 dark:hover:text-white"
                            aria-label="Tutup"
                        >
                            <X className="h-3.5 w-3.5" />
                        </button>
                    </div>

                    <div className="sikas-scroll relative flex-1 space-y-4 overflow-y-auto px-6 py-5">
                        <div>
                            <InputLabel htmlFor="edit_role" value="Role Pengguna" />
                            <select
                                id="edit_role"
                                value={editForm.data.role}
                                disabled={selectedUser?.id === currentUser?.id}
                                onChange={(e) => editForm.setData('role', e.target.value)}
                                className="mt-1 block w-full rounded-xl border border-slate-200/90 bg-white px-3.5 py-2.5 text-[12px] font-semibold text-slate-800 shadow-sm transition focus:border-lime-400 focus:outline-none focus:ring-4 focus:ring-lime-200/60 disabled:opacity-60 dark:border-white/10 dark:bg-slate-900 dark:text-white"
                            >
                                {roles.map((r) => (
                                    <option key={r.slug} value={r.slug}>
                                        {r.name}
                                    </option>
                                ))}
                            </select>
                            {selectedUser?.id === currentUser?.id && (
                                <p className="mt-1 text-[10px] font-medium text-amber-600 dark:text-amber-300">
                                    Anda tidak dapat mengubah role akun yang sedang login.
                                </p>
                            )}
                            <InputError message={editForm.errors.role} className="mt-1" />
                        </div>

                        <div>
                            <InputLabel htmlFor="edit_name" value="Nama Lengkap" />
                            <TextInput
                                id="edit_name"
                                value={editForm.data.name}
                                onChange={(e) => editForm.setData('name', e.target.value)}
                                className="mt-1 block w-full"
                                required
                            />
                            <InputError message={editForm.errors.name} className="mt-1" />
                        </div>

                        <div>
                            <InputLabel htmlFor="edit_username" value="Username / NIP / Email Login" />
                            <TextInput
                                id="edit_username"
                                value={editForm.data.username}
                                onChange={(e) => editForm.setData('username', e.target.value)}
                                className="mt-1 block w-full"
                                required
                            />
                            <InputError message={editForm.errors.username} className="mt-1" />
                        </div>

                        <div>
                            <InputLabel htmlFor="edit_email" value="Email (Opsional)" />
                            <TextInput
                                id="edit_email"
                                type="email"
                                value={editForm.data.email}
                                onChange={(e) => editForm.setData('email', e.target.value)}
                                className="mt-1 block w-full"
                            />
                            <InputError message={editForm.errors.email} className="mt-1" />
                        </div>

                        <div>
                            <InputLabel htmlFor="edit_password" value="Password Baru (Kosongkan jika tidak diubah)" />
                            <TextInput
                                id="edit_password"
                                type="password"
                                value={editForm.data.password}
                                onChange={(e) => editForm.setData('password', e.target.value)}
                                className="mt-1 block w-full"
                                placeholder="Isi untuk mereset password pengguna ini"
                            />
                            <InputError message={editForm.errors.password} className="mt-1" />
                        </div>
                    </div>

                    <div className="relative flex shrink-0 items-center justify-end gap-2 border-t border-slate-100 px-6 py-4 dark:border-white/5">
                        <SecondaryButton onClick={closeEditModal} disabled={editForm.processing}>
                            Batal
                        </SecondaryButton>
                        <PrimaryButton disabled={editForm.processing}>
                            {editForm.processing ? 'Menyimpan...' : 'Perbarui Data'}
                        </PrimaryButton>
                    </div>
                </form>
            </Modal>

            {/* Modal Akses Khusus Per Pengguna */}
            <Modal show={Boolean(accessUser)} onClose={() => !savingAccess && setAccessUser(null)} maxWidth="4xl">
                {accessUser && (
                    <div className="relative flex max-h-[90vh] flex-col overflow-hidden rounded-[26px] bg-white dark:bg-[#15131F]">
                        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[26px]">
                            <div className="absolute -right-12 -top-16 h-44 w-44 rounded-full bg-sky/15 blur-3xl" />
                            <div className="absolute -bottom-16 -left-12 h-44 w-44 rounded-full bg-lime-400/15 blur-3xl" />
                        </div>

                        <div className="relative flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 px-6 py-4 dark:border-white/5">
                            <div className="flex min-w-0 items-start gap-3">
                                <IconTile tone="sky" size="lg">
                                    <KeyRound />
                                </IconTile>
                                <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <h2 className="text-[15px] font-extrabold text-slate-900 dark:text-white">
                                            Hak Akses Fitur: {accessUser.name}
                                        </h2>
                                        <StatusBadge tone="info" dot={false}>
                                            Role: {accessUser.role_name}
                                        </StatusBadge>
                                        {accessUser.has_custom_override && (
                                            <StatusBadge tone="warning" dot>
                                                Override Aktif
                                            </StatusBadge>
                                        )}
                                    </div>
                                    <p className="mt-0.5 text-[10.5px] font-medium text-slate-400 dark:text-slate-500">
                                        Sesuaikan izin modul khusus untuk pengguna ini atau kembalikan ke aturan default role-nya.
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => !savingAccess && setAccessUser(null)}
                                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-400 transition hover:bg-slate-100 hover:text-slate-800 dark:bg-white/5 dark:hover:bg-white/10 dark:hover:text-white"
                                aria-label="Tutup"
                            >
                                <X className="h-3.5 w-3.5" />
                            </button>
                        </div>

                        <div className="sikas-scroll relative flex-1 overflow-y-auto px-6 py-4">
                            <PermissionMatrix
                                catalog={catalog}
                                value={accessMatrix}
                                onChange={setAccessMatrix}
                                lockAdminModule={accessUser.role === 'bendahara' || accessUser.id === currentUser?.id}
                                disabled={savingAccess}
                            />
                        </div>

                        <div className="relative flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-6 py-4 dark:border-white/5">
                            {accessUser.has_custom_override ? (
                                <SecondaryButton onClick={resetUserAccessToRole} disabled={savingAccess}>
                                    <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                                    Kembalikan ke Default Role
                                </SecondaryButton>
                            ) : (
                                <span className="text-[10.5px] font-medium text-slate-400 dark:text-slate-500">
                                    Saat ini mengikuti pengaturan role ({accessUser.role_name}).
                                </span>
                            )}
                            <div className="flex items-center gap-2">
                                <SecondaryButton onClick={() => setAccessUser(null)} disabled={savingAccess}>
                                    Batal
                                </SecondaryButton>
                                <PrimaryButton onClick={saveUserAccess} disabled={savingAccess}>
                                    {savingAccess ? 'Menyimpan...' : 'Simpan Akses Pengguna'}
                                </PrimaryButton>
                            </div>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Modal Konfirmasi Hapus Pengguna */}
            <Modal show={Boolean(userToDelete)} onClose={() => !isDeleting && setUserToDelete(null)} maxWidth="sm">
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
                                    Hapus Akun Pengguna
                                </h2>
                                <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500">
                                    Konfirmasi penghapusan akses
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => !isDeleting && setUserToDelete(null)}
                            className="flex h-7 w-7 items-center justify-center rounded-xl bg-slate-50 text-slate-400 transition hover:bg-slate-100 hover:text-slate-800 dark:bg-white/5 dark:hover:bg-white/10 dark:hover:text-white"
                            aria-label="Tutup"
                        >
                            <X className="h-3.5 w-3.5" />
                        </button>
                    </div>

                    <div className="relative space-y-4 px-6 py-5">
                        <p className="text-[12px] font-medium leading-relaxed text-slate-600 dark:text-slate-300">
                            Apakah Anda yakin ingin menghapus akun{' '}
                            <strong className="font-extrabold text-slate-900 dark:text-white">
                                {userToDelete?.name}
                            </strong>{' '}
                            (<code className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-bold text-slate-700 dark:bg-white/10 dark:text-slate-200">{userToDelete?.username}</code>)?
                        </p>

                        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4 dark:border-white/5">
                            <SecondaryButton onClick={() => setUserToDelete(null)} disabled={isDeleting}>
                                Batal
                            </SecondaryButton>
                            <DangerButton onClick={confirmDeleteUser} disabled={isDeleting}>
                                {isDeleting ? 'Menghapus...' : 'Ya, Hapus Akun'}
                            </DangerButton>
                        </div>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
