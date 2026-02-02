import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
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
            <header className="mb-6 border-b pb-4 border-gray-100 dark:border-gray-700">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <User className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                    Biodata Pengguna
                </h2>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    Perbarui informasi profil, username, dan alamat email akun Anda.
                </p>
            </header>

            <form onSubmit={submit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <InputLabel htmlFor="name" value="Nama Lengkap" />
                        <div className="relative mt-2">
                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                <User className="h-5 w-5 text-gray-400" />
                            </div>
                            <TextInput
                                id="name"
                                className="block w-full pl-10"
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
                        <div className="relative mt-2">
                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                <AtSign className="h-5 w-5 text-gray-400" />
                            </div>
                            <TextInput
                                id="username"
                                className="block w-full pl-10"
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
                    <div className="relative mt-2">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                            <Mail className="h-5 w-5 text-gray-400" />
                        </div>
                        <TextInput
                            id="email"
                            type="email"
                            className="block w-full pl-10"
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
                    <div className="rounded-md bg-yellow-50 p-4 dark:bg-yellow-900/20">
                        <div className="flex">
                            <div className="ml-3">
                                <p className="text-sm text-yellow-700 dark:text-yellow-400">
                                    Alamat email Anda belum diverifikasi.
                                    <Link
                                        href={route('verification.send')}
                                        method="post"
                                        as="button"
                                        className="ml-1 font-medium underline text-yellow-700 hover:text-yellow-600 dark:text-yellow-400 dark:hover:text-yellow-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                                    >
                                        Klik di sini untuk mengirim ulang email verifikasi.
                                    </Link>
                                </p>
                            </div>
                        </div>
                        {status === 'verification-link-sent' && (
                            <div className="mt-2 text-sm font-medium text-green-600 dark:text-green-400">
                                Tautan verifikasi baru telah dikirim ke alamat email Anda.
                            </div>
                        )}
                    </div>
                )}

                <div className="flex items-center gap-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                    <PrimaryButton disabled={processing} className="min-w-[120px] justify-center">
                        Simpan
                    </PrimaryButton>

                    <Transition
                        show={recentlySuccessful}
                        enter="transition ease-in-out"
                        enterFrom="opacity-0"
                        leave="transition ease-in-out"
                        leaveTo="opacity-0"
                    >
                        <p className="text-sm text-green-600 dark:text-green-400 font-medium bg-green-50 dark:bg-green-900/20 px-3 py-1 rounded-md">
                            Berhasil Disimpan!
                        </p>
                    </Transition>
                </div>
            </form>
        </section>
    );
}
