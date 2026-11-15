import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import Modal from '@/Components/Modal';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import TextInput from '@/Components/TextInput';
import IconTile from '@/Components/ui/IconTile';
import StatusBadge from '@/Components/ui/StatusBadge';
import EmptyState from '@/Components/ui/EmptyState';
import { useForm, usePage } from '@inertiajs/react';
import axios from 'axios';
import { 
    Users, 
    UserPlus, 
    Shield, 
    Key, 
    Trash2, 
    Edit, 
    CheckCircle, 
    AlertTriangle,
    Loader2
} from 'lucide-react';
import { FormEventHandler, useEffect, useState } from 'react';

interface UserItem {
    id: number;
    name: string;
    username: string;
    email: string;
    role: string;
    created_at: string;
}

export default function UserManagementForm({
    className = '',
}: {
    className?: string;
}) {
    const { auth } = usePage().props as any;
    const currentUser = auth?.user;

    const [users, setUsers] = useState<UserItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);

    // Form Tambah User
    const createForm = useForm({
        name: '',
        username: '',
        email: '',
        password: '',
        password_confirmation: '',
        role: 'kepala_sekolah',
    });

    // Form Edit / Reset Password User
    const editForm = useForm({
        name: '',
        username: '',
        email: '',
        password: '',
        role: 'kepala_sekolah',
    });

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const res = await axios.get(route('user-management.index'));
            setUsers(res.data.users || []);
        } catch (e) {
            console.error('Gagal mengambil daftar pengguna', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleCreateSubmit: FormEventHandler = (e) => {
        e.preventDefault();
        createForm.post(route('user-management.store'), {
            preserveScroll: true,
            onSuccess: () => {
                setShowCreateModal(false);
                createForm.reset();
                fetchUsers();
            },
        });
    };

    const handleOpenEdit = (user: UserItem) => {
        setSelectedUser(user);
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
                fetchUsers();
            },
        });
    };

    const handleDeleteUser = (user: UserItem) => {
        if (confirm(`Apakah Anda yakin ingin menghapus akun "${user.name}" (${user.username})?`)) {
            axios.delete(route('user-management.destroy', user.id))
                .then(() => {
                    fetchUsers();
                })
                .catch((err) => {
                    alert('Gagal menghapus pengguna: ' + (err.response?.data?.message || err.message));
                });
        }
    };

    return (
        <section className={className}>
            <header className="flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-start sm:justify-between dark:border-white/5">
                <div className="flex min-w-0 items-start gap-3">
                    <IconTile tone="violet" size="lg">
                        <Users />
                    </IconTile>
                    <div className="min-w-0">
                        <h2 className="text-[14px] font-extrabold tracking-tight text-slate-900 dark:text-white">
                            Manajemen Pengguna & Role
                        </h2>
                        <p className="mt-0.5 text-[10.5px] font-medium text-slate-400 dark:text-slate-500">
                            Kelola akun pengguna yang memiliki akses ke SIKAS. Anda dapat mendaftarkan akun untuk <strong className="font-bold text-slate-600 dark:text-slate-300">Kepala Sekolah</strong> agar dapat menelaah dan menyetujui anggaran RKAS.
                        </p>
                    </div>
                </div>

                <PrimaryButton 
                    onClick={() => setShowCreateModal(true)} 
                    className="shrink-0 self-start sm:self-auto"
                >
                    <UserPlus className="h-4 w-4" />
                    Tambah Pengguna
                </PrimaryButton>
            </header>

            {/* User List Table */}
            <div className="mt-4">
                {loading ? (
                    <div className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-8 text-slate-400 dark:border-white/10 dark:bg-white/[0.02] dark:text-slate-500">
                        <Loader2 className="h-5 w-5 animate-spin text-brand-500" />
                        <span className="text-[11px] font-semibold">Memuat data pengguna...</span>
                    </div>
                ) : users.length === 0 ? (
                    <EmptyState
                        icon={
                            <Users className="h-6 w-6" />
                        }
                        title="Belum ada pengguna"
                        description="Tambahkan akun pengguna untuk mengelola akses SIKAS."
                    />
                ) : (
                    <div className="bento-table-wrapper overflow-x-auto">
                        <table className="min-w-full">
                            <thead>
                                <tr>
                                    <th className="text-left">Nama Pengguna</th>
                                    <th className="text-left">Username / Email</th>
                                    <th className="text-left">Role</th>
                                    <th className="text-right">Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map((u) => {
                                    const isCurrent = u.id === currentUser?.id;
                                    const isKepsek = u.role === 'kepala_sekolah';

                                    return (
                                        <tr key={u.id}>
                                            <td>
                                                <div className="flex items-center gap-2 font-extrabold text-slate-900 dark:text-white">
                                                    {u.name}
                                                    {isCurrent && (
                                                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-extrabold text-slate-600 dark:bg-white/5 dark:text-slate-300">
                                                            Akun Anda
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td>
                                                <div className="font-semibold text-slate-700 dark:text-slate-200">{u.username}</div>
                                                <div className="mt-0.5 text-[10px] font-medium text-slate-400 dark:text-slate-500">{u.email}</div>
                                            </td>
                                            <td>
                                                {isKepsek ? (
                                                    <StatusBadge tone="success" dot={false}>
                                                        <Shield className="w-3 h-3" /> Kepala Sekolah (Read-Only)
                                                    </StatusBadge>
                                                ) : (
                                                    <StatusBadge tone="violet" dot={false}>
                                                        <Shield className="w-3 h-3" /> Bendahara / Admin
                                                    </StatusBadge>
                                                )}
                                            </td>
                                            <td>
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => handleOpenEdit(u)}
                                                        className="sikas-icon-btn h-8 w-8"
                                                        title="Edit / Reset Password"
                                                    >
                                                        <Edit className="w-4 h-4" />
                                                    </button>
                                                    {!isCurrent && (
                                                        <button
                                                            onClick={() => handleDeleteUser(u)}
                                                            className="sikas-icon-btn h-8 w-8"
                                                            title="Hapus Pengguna"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal Tambah Pengguna */}
            <Modal show={showCreateModal} onClose={() => setShowCreateModal(false)} maxWidth="md">
                <form onSubmit={handleCreateSubmit} className="flex max-h-[90vh] flex-col overflow-hidden">
                    <div className="flex shrink-0 items-start gap-3 border-b border-slate-100 px-6 py-5 dark:border-white/5">
                        <IconTile tone="lime" size="lg">
                            <UserPlus />
                        </IconTile>
                        <div className="min-w-0">
                            <h2 className="text-[16px] font-extrabold tracking-tight text-slate-900 dark:text-white">
                                Tambah Pengguna Baru
                            </h2>
                            <p className="mt-0.5 text-[10.5px] font-medium text-slate-400 dark:text-slate-500">
                                Daftarkan akun baru beserta role dan kata sandi awal.
                            </p>
                        </div>
                    </div>

                    <div className="sikas-scroll flex-1 space-y-4 overflow-y-auto px-6 py-5">
                        <div>
                            <InputLabel htmlFor="create_role" value="Role Pengguna" />
                            <select
                                id="create_role"
                                value={createForm.data.role}
                                onChange={(e) => createForm.setData('role', e.target.value)}
                                className="mt-1 block w-full rounded-xl border border-slate-200/90 bg-white px-3.5 py-2.5 text-[12px] font-semibold text-slate-800 shadow-sm transition focus:border-lime-400 focus:outline-none focus:ring-4 focus:ring-lime-200/60 dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:border-lime-400/70 dark:focus:ring-lime-400/10"
                            >
                                <option value="kepala_sekolah">Kepala Sekolah (Read-Only, Review RKAS & Approval)</option>
                                <option value="bendahara">Bendahara / Operator (Akses Penuh)</option>
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
                                placeholder="Contoh: kepsek_ahmad, 198001012005011001, atau kepsek@sekolah.sch.id"
                                required
                            />
                            <p className="mt-1.5 text-[10.5px] font-medium text-slate-400 dark:text-slate-500">
                                Dapat berupa username biasa, NIP 18 digit, atau alamat email resmi.
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
                                placeholder="kepsek@sekolah.sch.id"
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

                    <div className="flex shrink-0 items-center justify-end gap-2 border-t border-slate-100 px-6 py-4 dark:border-white/5">
                        <SecondaryButton onClick={() => setShowCreateModal(false)}>
                            Batal
                        </SecondaryButton>
                        <PrimaryButton disabled={createForm.processing}>
                            {createForm.processing ? 'Menyimpan...' : 'Simpan Pengguna'}
                        </PrimaryButton>
                    </div>
                </form>
            </Modal>

            {/* Modal Edit / Reset Password */}
            <Modal show={showEditModal} onClose={() => setShowEditModal(false)} maxWidth="md">
                <form onSubmit={handleEditSubmit} className="flex max-h-[90vh] flex-col overflow-hidden">
                    <div className="flex shrink-0 items-start gap-3 border-b border-slate-100 px-6 py-5 dark:border-white/5">
                        <IconTile tone="amber" size="lg">
                            <Edit />
                        </IconTile>
                        <div className="min-w-0">
                            <h2 className="text-[16px] font-extrabold tracking-tight text-slate-900 dark:text-white">
                                Edit Data Pengguna / Reset Password
                            </h2>
                            <p className="mt-0.5 text-[10.5px] font-medium text-slate-400 dark:text-slate-500">
                                Perbarui identitas, role, atau reset kata sandi pengguna.
                            </p>
                        </div>
                    </div>

                    <div className="sikas-scroll flex-1 space-y-4 overflow-y-auto px-6 py-5">
                        <div>
                            <InputLabel htmlFor="edit_role" value="Role Pengguna" />
                            <select
                                id="edit_role"
                                value={editForm.data.role}
                                onChange={(e) => editForm.setData('role', e.target.value)}
                                className="mt-1 block w-full rounded-xl border border-slate-200/90 bg-white px-3.5 py-2.5 text-[12px] font-semibold text-slate-800 shadow-sm transition focus:border-lime-400 focus:outline-none focus:ring-4 focus:ring-lime-200/60 dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:border-lime-400/70 dark:focus:ring-lime-400/10"
                            >
                                <option value="kepala_sekolah">Kepala Sekolah (Read-Only)</option>
                                <option value="bendahara">Bendahara / Operator (Akses Penuh)</option>
                            </select>
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
                                placeholder="Contoh: kepsek_ahmad, 198001012005011001, atau kepsek@sekolah.sch.id"
                                required
                            />
                            <p className="mt-1.5 text-[10.5px] font-medium text-slate-400 dark:text-slate-500">
                                Dapat berupa username biasa, NIP 18 digit, atau alamat email resmi.
                            </p>
                            <InputError message={editForm.errors.username} className="mt-1" />
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

                    <div className="flex shrink-0 items-center justify-end gap-2 border-t border-slate-100 px-6 py-4 dark:border-white/5">
                        <SecondaryButton onClick={() => setShowEditModal(false)}>
                            Batal
                        </SecondaryButton>
                        <PrimaryButton disabled={editForm.processing}>
                            {editForm.processing ? 'Menyimpan...' : 'Perbarui Data'}
                        </PrimaryButton>
                    </div>
                </form>
            </Modal>
        </section>
    );
}
