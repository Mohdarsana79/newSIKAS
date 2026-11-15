import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import Modal from '@/Components/Modal';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import TextInput from '@/Components/TextInput';
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
            <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-gray-100 dark:border-gray-700">
                <div>
                    <div className="flex items-center gap-2">
                        <Users className="h-6 w-6 text-indigo-500" />
                        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                            Manajemen Pengguna & Role
                        </h2>
                    </div>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                        Kelola akun pengguna yang memiliki akses ke SIKAS. Anda dapat mendaftarkan akun untuk <strong>Kepala Sekolah</strong> agar dapat menelaah dan menyetujui anggaran RKAS.
                    </p>
                </div>

                <PrimaryButton 
                    onClick={() => setShowCreateModal(true)} 
                    className="flex items-center gap-2 self-start sm:self-auto shrink-0 bg-indigo-600 hover:bg-indigo-700"
                >
                    <UserPlus className="h-4 w-4" />
                    Tambah Pengguna
                </PrimaryButton>
            </header>

            {/* User List Table */}
            <div className="mt-6 overflow-hidden border border-gray-200 dark:border-gray-700 rounded-xl">
                {loading ? (
                    <div className="p-8 text-center flex items-center justify-center gap-2 text-gray-500">
                        <Loader2 className="w-5 h-5 animate-spin" /> Memuat data pengguna...
                    </div>
                ) : (
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">
                        <thead className="bg-gray-50 dark:bg-gray-900/50">
                            <tr>
                                <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300">Nama Pengguna</th>
                                <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300">Username / Email</th>
                                <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300">Role</th>
                                <th className="px-4 py-3 text-right font-semibold text-gray-600 dark:text-gray-300">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800 bg-white dark:bg-gray-800">
                            {users.map((u) => {
                                const isCurrent = u.id === currentUser?.id;
                                const isKepsek = u.role === 'kepala_sekolah';

                                return (
                                    <tr key={u.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors">
                                        <td className="px-4 py-3">
                                            <div className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                                {u.name}
                                                {isCurrent && (
                                                    <span className="text-[10px] bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-1.5 py-0.5 rounded font-normal">
                                                        Akun Anda
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                                            <div>{u.username}</div>
                                            <div className="text-xs text-gray-400">{u.email}</div>
                                        </td>
                                        <td className="px-4 py-3">
                                            {isKepsek ? (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                                                    <Shield className="w-3 h-3" /> Kepala Sekolah (Read-Only)
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-700">
                                                    <Shield className="w-3 h-3" /> Bendahara / Admin
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => handleOpenEdit(u)}
                                                    className="p-1.5 text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                                    title="Edit / Reset Password"
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </button>
                                                {!isCurrent && (
                                                    <button
                                                        onClick={() => handleDeleteUser(u)}
                                                        className="p-1.5 text-gray-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors"
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
                )}
            </div>

            {/* Modal Tambah Pengguna */}
            <Modal show={showCreateModal} onClose={() => setShowCreateModal(false)} maxWidth="md">
                <form onSubmit={handleCreateSubmit} className="p-6">
                    <div className="flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-gray-100 mb-4 pb-2 border-b border-gray-100 dark:border-gray-700">
                        <UserPlus className="w-5 h-5 text-indigo-600" />
                        Tambah Pengguna Baru
                    </div>

                    <div className="space-y-4">
                        <div>
                            <InputLabel htmlFor="create_role" value="Role Pengguna" />
                            <select
                                id="create_role"
                                value={createForm.data.role}
                                onChange={(e) => createForm.setData('role', e.target.value)}
                                className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 focus:border-indigo-500 focus:ring-indigo-500 text-sm"
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
                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
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

                    <div className="mt-6 flex justify-end gap-3">
                        <SecondaryButton onClick={() => setShowCreateModal(false)}>
                            Batal
                        </SecondaryButton>
                        <PrimaryButton disabled={createForm.processing} className="bg-indigo-600 hover:bg-indigo-700">
                            {createForm.processing ? 'Menyimpan...' : 'Simpan Pengguna'}
                        </PrimaryButton>
                    </div>
                </form>
            </Modal>

            {/* Modal Edit / Reset Password */}
            <Modal show={showEditModal} onClose={() => setShowEditModal(false)} maxWidth="md">
                <form onSubmit={handleEditSubmit} className="p-6">
                    <div className="flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-gray-100 mb-4 pb-2 border-b border-gray-100 dark:border-gray-700">
                        <Edit className="w-5 h-5 text-indigo-600" />
                        Edit Data Pengguna / Reset Password
                    </div>

                    <div className="space-y-4">
                        <div>
                            <InputLabel htmlFor="edit_role" value="Role Pengguna" />
                            <select
                                id="edit_role"
                                value={editForm.data.role}
                                onChange={(e) => editForm.setData('role', e.target.value)}
                                className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 focus:border-indigo-500 focus:ring-indigo-500 text-sm"
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
                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
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

                    <div className="mt-6 flex justify-end gap-3">
                        <SecondaryButton onClick={() => setShowEditModal(false)}>
                            Batal
                        </SecondaryButton>
                        <PrimaryButton disabled={editForm.processing} className="bg-indigo-600 hover:bg-indigo-700">
                            {editForm.processing ? 'Menyimpan...' : 'Perbarui Data'}
                        </PrimaryButton>
                    </div>
                </form>
            </Modal>
        </section>
    );
}

