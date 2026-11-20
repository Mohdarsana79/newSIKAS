import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import StatCard from '@/Components/StatCard';
import IconTile from '@/Components/ui/IconTile';
import PageHeader from '@/Components/ui/PageHeader';
import StatusBadge from '@/Components/ui/StatusBadge';
import { Head } from '@inertiajs/react';
import { KeyRound, Shield, SlidersHorizontal, Sparkles, Users } from 'lucide-react';
import { useState } from 'react';
import RolesTab from './Partials/RolesTab';
import UsersTab from './Partials/UsersTab';
import type { ManagedUserItem, PermissionCatalog, RoleItem } from './types';

interface ManagementRolePageProps {
    users: ManagedUserItem[];
    roles: RoleItem[];
    permissionCatalog: PermissionCatalog;
}

export default function ManagementRoleIndex({
    users,
    roles,
    permissionCatalog,
}: ManagementRolePageProps) {
    const [activeTab, setActiveTab] = useState<'users' | 'roles'>('users');

    const overrideCount = users.filter((u) => u.has_custom_override).length;
    const customRolesCount = roles.filter((r) => !r.is_system).length;
    const systemRolesCount = roles.length - customRolesCount;
    const overrideRatio = users.length > 0 ? Math.round((overrideCount / users.length) * 100) : 0;

    return (
        <AuthenticatedLayout>
            <Head title="Management & Role" />

            <div className="space-y-5">
                <PageHeader
                    className="animate-rise"
                    breadcrumb={[
                        { label: 'Sistem' },
                        { label: 'Management & Role' },
                    ]}
                    icon={
                        <IconTile tone="violet" size="lg">
                            <Users />
                        </IconTile>
                    }
                    title="Management & Role"
                    subtitle="Kelola akun pengguna, rancang role custom, dan kendalikan matriks izin akses fitur per modul secara terpusat."
                    badge={
                        <StatusBadge tone="lime" dot={false}>
                            <Sparkles className="h-3 w-3" />
                            RBAC Dinamis
                        </StatusBadge>
                    }
                />

                {/* 4 Kartu Ringkasan KPI Neo-Bento */}
                <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="animate-rise" style={{ animationDelay: '0ms' }}>
                        <StatCard
                            tone="violet"
                            title="TOTAL PENGGUNA"
                            value={users.length}
                            description="Akun aktif terdaftar di sekolah"
                            trend={{ value: 'Terdaftar', isPositive: true }}
                            progress={Math.min(100, Math.max(20, users.length * 20))}
                            progressLabel={`${users.length} akun`}
                            icon={<Users />}
                        />
                    </div>
                    <div className="animate-rise" style={{ animationDelay: '60ms' }}>
                        <StatCard
                            tone="mint"
                            title="ROLE TERSEDIA"
                            value={roles.length}
                            description={`${systemRolesCount} bawaan · ${customRolesCount} role custom`}
                            trend={{
                                value: customRolesCount > 0 ? `+${customRolesCount} Custom` : 'Standar',
                                isPositive: true,
                            }}
                            progress={Math.min(100, Math.round((roles.length / 6) * 100))}
                            progressLabel={`${customRolesCount} custom`}
                            icon={<Shield />}
                        />
                    </div>
                    <div className="animate-rise" style={{ animationDelay: '120ms' }}>
                        <StatCard
                            tone="amber"
                            title="OVERRIDE KHUSUS"
                            value={overrideCount}
                            description="Pengguna dengan hak akses khusus"
                            trend={{
                                value: overrideCount > 0 ? 'Kustom Aktif' : 'Sesuai Role',
                                isPositive: true,
                            }}
                            progress={overrideCount > 0 ? Math.max(15, overrideRatio) : 8}
                            progressLabel={`${overrideRatio}% user`}
                            icon={<SlidersHorizontal />}
                        />
                    </div>
                    <div className="animate-rise" style={{ animationDelay: '180ms' }}>
                        <StatCard
                            tone="sky"
                            title="CAKUPAN MODUL"
                            value={permissionCatalog.modules.length}
                            description={`+${permissionCatalog.abilities.length} kewenangan telaah & sahkan RKAS`}
                            trend={{ value: 'Terlindungi', isPositive: true }}
                            progress={100}
                            progressLabel="100% terpetakan"
                            icon={<KeyRound />}
                        />
                    </div>
                </div>

                {/* Floating Glass Pill Dock Navigation */}
                <div
                    className="animate-rise flex flex-col gap-3 rounded-[24px] border border-white/80 bg-white/80 p-2 shadow-nav ring-1 ring-slate-900/[0.03] backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between dark:border-white/10 dark:bg-[#15131F]/85"
                    style={{ animationDelay: '220ms' }}
                >
                    <div className="flex flex-wrap items-center gap-1.5">
                        <button
                            type="button"
                            onClick={() => setActiveTab('users')}
                            className={`group inline-flex items-center gap-2.5 rounded-2xl px-4 py-2.5 text-[12px] font-extrabold transition-all duration-200 ${
                                activeTab === 'users'
                                    ? 'bg-gradient-to-r from-lime-300 via-lime-400 to-lime-500 text-slate-950 shadow-lime'
                                    : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/5 dark:hover:text-white'
                            }`}
                        >
                            <Users className="h-4 w-4" />
                            <span>Daftar Pengguna</span>
                            <span
                                className={`sikas-num rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                                    activeTab === 'users'
                                        ? 'bg-slate-950/15 text-slate-950'
                                        : 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300'
                                }`}
                            >
                                {users.length}
                            </span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setActiveTab('roles')}
                            className={`group inline-flex items-center gap-2.5 rounded-2xl px-4 py-2.5 text-[12px] font-extrabold transition-all duration-200 ${
                                activeTab === 'roles'
                                    ? 'bg-gradient-to-r from-lime-300 via-lime-400 to-lime-500 text-slate-950 shadow-lime'
                                    : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/5 dark:hover:text-white'
                            }`}
                        >
                            <Shield className="h-4 w-4" />
                            <span>Role &amp; Hak Akses Fitur</span>
                            <span
                                className={`sikas-num rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                                    activeTab === 'roles'
                                        ? 'bg-slate-950/15 text-slate-950'
                                        : 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300'
                                }`}
                            >
                                {roles.length}
                            </span>
                        </button>
                    </div>

                    <div className="hidden items-center gap-2 pr-2 text-[11px] font-semibold text-slate-400 lg:flex dark:text-slate-500">
                        <span className="h-2 w-2 rounded-full bg-mint animate-pulse-soft" />
                        <span>
                            {activeTab === 'users'
                                ? 'Kelola akun login, penugasan role, dan pengecualian akses per individu'
                                : 'Konfigurasikan matriks modul yang diizinkan untuk setiap role'}
                        </span>
                    </div>
                </div>

                {/* Konten Tab Aktif */}
                <div className="animate-rise" style={{ animationDelay: '260ms' }}>
                    {activeTab === 'users' ? (
                        <UsersTab
                            users={users}
                            roles={roles}
                            catalog={permissionCatalog}
                            onSwitchToRolesTab={() => setActiveTab('roles')}
                        />
                    ) : (
                        <RolesTab roles={roles} catalog={permissionCatalog} />
                    )}
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
