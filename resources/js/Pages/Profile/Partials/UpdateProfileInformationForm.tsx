import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import IconTile from '@/Components/ui/IconTile';
import StatusBadge from '@/Components/ui/StatusBadge';
import { Link, useForm, usePage } from '@inertiajs/react';
import { AtSign, BadgeCheck, Mail, Save, ShieldCheck, User } from 'lucide-react';
import { FormEventHandler } from 'react';
import {
    getRoleDisplayName,
    ProfileCardShell,
    ProfileSavedPill,
} from './ProfileUiPrimitives';

export default function UpdateProfileInformation({
    mustVerifyEmail,
    status,
    className = '',
}: {
    mustVerifyEmail: boolean;
    status?: string;
    className?: string;
}) {
    const user = usePage().props.auth.user;

    const { data, setData, patch, errors, processing, recentlySuccessful } = useForm({
        name: user.name,
        username: user.username,
        email: user.email,
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        patch(route('profile.update'));
    };

    const roleLabel = getRoleDisplayName(user);
    const needsVerification = mustVerifyEmail && user.email_verified_at === null;

    return (
        <ProfileCardShell
            tone="violet"
            icon={<User />}
            title="Biodata Pengguna"
            subtitle="Perbarui nama lengkap, username login, dan alamat email akun Anda."
            className={className}
        >
            <form onSubmit={submit} className="flex flex-1 flex-col justify-between gap-5">
                <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                            <InputLabel htmlFor="name" value="Nama Lengkap" />
                            <div className="relative mt-1">
                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                                    <User className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                                </div>
                                <TextInput
                                    id="name"
                                    className="!pl-10"
                                    value={data.name}
                                    onChange={(e) => setData('name', e.target.value)}
                                    required
                                    isFocused
                                    autoComplete="name"
                                    placeholder="Nama Lengkap Anda"
                                />
                            </div>
                            <InputError className="mt-1.5" message={errors.name} />
                        </div>

                        <div>
                            <InputLabel htmlFor="username" value="Username" />
                            <div className="relative mt-1">
                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                                    <AtSign className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                                </div>
                                <TextInput
                                    id="username"
                                    className="!pl-10"
                                    value={data.username}
                                    onChange={(e) => setData('username', e.target.value)}
                                    required
                                    autoComplete="username"
                                    placeholder="Username Anda"
                                />
                            </div>
                            <InputError className="mt-1.5" message={errors.username} />
                        </div>
                    </div>

                    <div>
                        <InputLabel htmlFor="email" value="Alamat Email" />
                        <div className="relative mt-1">
                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                                <Mail className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                            </div>
                            <TextInput
                                id="email"
                                type="email"
                                className="!pl-10"
                                value={data.email}
                                onChange={(e) => setData('email', e.target.value)}
                                required
                                autoComplete="email"
                                placeholder="alamat@email.com"
                            />
                        </div>
                        <InputError className="mt-1.5" message={errors.email} />
                    </div>

                    {/* Strip ringkasan peran & status verifikasi akun */}
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3 dark:border-white/5 dark:bg-white/[0.03]">
                        <div className="flex items-center gap-2.5">
                            <IconTile tone="violet" size="sm">
                                <ShieldCheck />
                            </IconTile>
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400 dark:text-slate-500">
                                    Peran Akses Aktif
                                </p>
                                <p className="text-[12px] font-extrabold text-slate-800 dark:text-white">
                                    {roleLabel}
                                </p>
                            </div>
                        </div>
                        <StatusBadge tone={needsVerification ? 'warning' : 'success'} dot={false}>
                            <BadgeCheck className="h-3.5 w-3.5" />
                            {needsVerification ? 'Email Belum Verifikasi' : 'Email Terverifikasi'}
                        </StatusBadge>
                    </div>

                    {needsVerification && (
                        <div className="rounded-2xl border border-amber-200/70 bg-pastel-amber p-4 dark:border-amber-400/20 dark:bg-amber-400/10">
                            <p className="text-[11.5px] font-medium leading-relaxed text-amber-800 dark:text-amber-200">
                                Alamat email Anda belum diverifikasi.{' '}
                                <Link
                                    href={route('verification.send')}
                                    method="post"
                                    as="button"
                                    className="font-extrabold underline decoration-amber-500/60 underline-offset-2 transition hover:text-amber-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-lime-400 dark:hover:text-amber-100"
                                >
                                    Klik di sini untuk mengirim ulang email verifikasi.
                                </Link>
                            </p>
                            {status === 'verification-link-sent' && (
                                <div className="mt-2 text-[10.5px] font-extrabold text-emerald-700 dark:text-emerald-300">
                                    Tautan verifikasi baru telah dikirim ke alamat email Anda.
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4 dark:border-white/5">
                    <PrimaryButton disabled={processing} className="min-w-[136px]">
                        <Save className="h-4 w-4" />
                        Simpan Biodata
                    </PrimaryButton>
                    <ProfileSavedPill show={recentlySuccessful} />
                </div>
            </form>
        </ProfileCardShell>
    );
}
