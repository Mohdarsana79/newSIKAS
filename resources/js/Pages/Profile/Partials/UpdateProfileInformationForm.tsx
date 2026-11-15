import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import IconTile from '@/Components/ui/IconTile';
import { Transition } from '@headlessui/react';
import { Link, useForm, usePage } from '@inertiajs/react';
import { FormEventHandler } from 'react';
import { User, Mail, AtSign } from 'lucide-react';

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

    const { data, setData, patch, errors, processing, recentlySuccessful } =
        useForm({
            name: user.name,
            username: user.username,
            email: user.email,
        });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        patch(route('profile.update'));
    };

    return (
        <section className={className}>
            <header className="mb-5 flex items-start gap-3 border-b border-slate-100 pb-4 dark:border-white/5">
                <IconTile tone="violet" size="lg">
                    <User />
                </IconTile>
                <div className="min-w-0">
                    <h2 className="text-[14px] font-extrabold tracking-tight text-slate-900 dark:text-white">
                        Biodata Pengguna
                    </h2>
                    <p className="mt-0.5 text-[10.5px] font-medium text-slate-400 dark:text-slate-500">
                        Perbarui informasi profil, username, dan alamat email akun Anda.
                    </p>
                </div>
            </header>

            <form onSubmit={submit} className="space-y-5">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                        <InputLabel htmlFor="name" value="Nama Lengkap" />
                        <div className="relative">
                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                <User className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                            </div>
                            <TextInput
                                id="name"
                                className="pl-10"
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                                required
                                isFocused
                                autoComplete="name"
                                placeholder="Nama Lengkap Anda"
                            />
                        </div>
                        <InputError className="mt-2" message={errors.name} />
                    </div>

                    <div>
                        <InputLabel htmlFor="username" value="Username" />
                        <div className="relative">
                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                <AtSign className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                            </div>
                            <TextInput
                                id="username"
                                className="pl-10"
                                value={data.username}
                                onChange={(e) => setData('username', e.target.value)}
                                required
                                autoComplete="username"
                                placeholder="Username Anda"
                            />
                        </div>
                        <InputError className="mt-2" message={errors.username} />
                    </div>
                </div>

                <div>
                    <InputLabel htmlFor="email" value="Email" />
                    <div className="relative">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                            <Mail className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                        </div>
                        <TextInput
                            id="email"
                            type="email"
                            className="pl-10"
                            value={data.email}
                            onChange={(e) => setData('email', e.target.value)}
                            required
                            autoComplete="email"
                            placeholder="alamat@email.com"
                        />
                    </div>
                    <InputError className="mt-2" message={errors.email} />
                </div>

                {mustVerifyEmail && user.email_verified_at === null && (
                    <div className="rounded-2xl border border-amber-200/70 bg-pastel-amber p-4 dark:border-amber-400/20 dark:bg-amber-400/10">
                        <div className="flex">
                            <div className="ml-3">
                                <p className="text-[11.5px] font-medium text-amber-700 dark:text-amber-300">
                                    Alamat email Anda belum diverifikasi.
                                    <Link
                                        href={route('verification.send')}
                                        method="post"
                                        as="button"
                                        className="ml-1 font-bold underline text-amber-800 hover:text-amber-700 dark:text-amber-300 dark:hover:text-amber-200 focus:outline-none focus:ring-2 focus:ring-lime-400 focus:ring-offset-2"
                                    >
                                        Klik di sini untuk mengirim ulang email verifikasi.
                                    </Link>
                                </p>
                            </div>
                        </div>
                        {status === 'verification-link-sent' && (
                            <div className="mt-2 text-[10.5px] font-bold text-emerald-600 dark:text-emerald-300">
                                Tautan verifikasi baru telah dikirim ke alamat email Anda.
                            </div>
                        )}
                    </div>
                )}

                <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4 dark:border-white/5">
                    <PrimaryButton disabled={processing} className="min-w-[120px]">
                        Simpan
                    </PrimaryButton>

                    <Transition
                        show={recentlySuccessful}
                        enter="transition ease-in-out"
                        enterFrom="opacity-0"
                        leave="transition ease-in-out"
                        leaveTo="opacity-0"
                    >
                        <p className="inline-flex items-center gap-1.5 rounded-full bg-pastel-mint px-3 py-1 text-[10.5px] font-extrabold text-emerald-700 dark:bg-mint/10 dark:text-emerald-300">
                            Berhasil Disimpan!
                        </p>
                    </Transition>
                </div>
            </form>
        </section>
    );
}
