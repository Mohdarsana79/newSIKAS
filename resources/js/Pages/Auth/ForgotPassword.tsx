import InputError from '@/Components/InputError';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, useForm, Link } from '@inertiajs/react';
import { FormEventHandler } from 'react';
import { Mail, ArrowLeft } from 'lucide-react';
import InputLabel from '@/Components/InputLabel';

export default function ForgotPassword({ status }: { status?: string }) {
    const { data, setData, post, processing, errors } = useForm({
        email: '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        post(route('password.email'));
    };

    return (
        <GuestLayout>
            <Head title="Lupa Password" />

            <div className="text-center mb-8">
                <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white mb-2">
                    Lupa Password?
                </h2>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                    Jangan khawatir. Masukkan alamat email Anda dan kami akan mengirimkan link untuk mereset password Anda.
                </div>
            </div>

            {status && (
                <div className="mb-4 rounded-md bg-green-50 p-4 text-sm font-medium text-green-600 border border-green-200">
                    {status}
                </div>
            )}

            <form onSubmit={submit} className="space-y-6">
                <div>
                    <InputLabel htmlFor="email" value="Email" />
                    <div className="relative mt-2">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                            <Mail className="h-5 w-5 text-gray-400" />
                        </div>
                        <TextInput
                            id="email"
                            type="email"
                            name="email"
                            value={data.email}
                            className="block w-full pl-10 py-3 text-gray-900"
                            isFocused={true}
                            onChange={(e) => setData('email', e.target.value)}
                            placeholder="nama@email.com"
                        />
                    </div>
                    <InputError message={errors.email} className="mt-2" />
                </div>

                <div className="flex flex-col gap-4">
                    <PrimaryButton className="w-full justify-center py-3 text-base" disabled={processing}>
                        Kirim Link Reset Password
                    </PrimaryButton>

                    <Link
                        href={route('login')}
                        className="flex items-center justify-center gap-2 text-sm font-medium text-gray-600 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Kembali ke Halaman Login
                    </Link>
                </div>
            </form>
        </GuestLayout>
    );
}
