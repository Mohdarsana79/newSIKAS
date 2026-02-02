import Checkbox from '@/Components/Checkbox';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import GuestLayout from '@/Layouts/GuestLayout';
import Modal from '@/Components/Modal';
import SecondaryButton from '@/Components/SecondaryButton';
import { Head, Link, useForm } from '@inertiajs/react';
import { FormEventHandler, useState, useEffect, useRef } from 'react';
import { ShieldCheck } from 'lucide-react';

export default function Login({
    status,
    canResetPassword,
}: {
    status?: string;
    canResetPassword: boolean;
}) {
    const { data, setData, post, processing, errors, reset, clearErrors } = useForm({
        username: '',
        password: '',
        security_code: '',
        remember: false as boolean,
    });

    const [showPassword, setShowPassword] = useState(false);
    const [showSecurityModal, setShowSecurityModal] = useState(false);
    const securityCodeInput = useRef<HTMLInputElement>(null);

    useEffect(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const errs = errors as any;
        if (errs.two_factor_required) {
            setShowSecurityModal(true);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            clearErrors('two_factor_required' as any); // Clear the trigger error so it doesn't persist weirdly
            // Focus logic might need a timeout as Modal renders
            setTimeout(() => securityCodeInput.current?.focus(), 100);
        }
        // Also show modal if there is a security_code error (user entered wrong code)
        if (errors.security_code) {
            setShowSecurityModal(true);
        }
    }, [errors]);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        post(route('login'), {
            onError: (errors) => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const errs = errors as any;
                // Only reset password if it's NOT a two-factor requirement
                if (!errs.two_factor_required) {
                    reset('password');
                }
            },
            onSuccess: () => {
                // On success (e.g. standard login without 2FA), standard reset default behavior is fine or explicit
                reset('password');
            }
        });
    };

    const submitSecurityCode: FormEventHandler = (e) => {
        e.preventDefault();
        // Post again, this time with security_code populated in data
        post(route('login'), {
            onSuccess: () => setShowSecurityModal(false), // Should redirect anyway
            onFinish: () => {
                // If failed (e.g. wrong code), modal stays open due to errors.security_code being present
                // Reset password might be needed if the controller requires it again (which it does)
                reset('password');
            }
        });
    };

    const closeModal = () => {
        setShowSecurityModal(false);
        setData('security_code', '');
        reset('password'); // Resetting password as we might need to re-enter it if flow restarts (though UX suggests we are 'in' simpler flow)
    }

    return (
        <GuestLayout>
            <Head title="Log in" />

            <div className="text-center mb-10">
                <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
                    Selamat Datang Kembali
                </h2>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                    Silakan masuk ke akun SIKAS Anda
                </p>
            </div>

            {status && (
                <div className="mb-4 rounded-md bg-green-50 p-4 text-sm font-medium text-green-600">
                    {status}
                </div>
            )}

            <form onSubmit={submit} className="space-y-6">
                <div>
                    <InputLabel htmlFor="username" value="Username" />
                    <div className="relative mt-2">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                            <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                        </div>
                        <TextInput
                            id="username"
                            type="text"
                            name="username"
                            value={data.username}
                            className="block w-full pl-10 py-3 text-gray-900"
                            autoComplete="username"
                            isFocused={true}
                            onChange={(e) => setData('username', e.target.value)}
                            placeholder="Masukkan username anda"
                        />
                    </div>
                    <InputError message={errors.username} className="mt-2" />
                </div>

                <div>
                    <InputLabel htmlFor="password" value="Password" />
                    <div className="relative mt-2">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                            <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                        </div>
                        <TextInput
                            id="password"
                            type={showPassword ? 'text' : 'password'}
                            name="password"
                            value={data.password}
                            className="block w-full pl-10 pr-10 py-3 text-gray-900"
                            autoComplete="current-password"
                            onChange={(e) => setData('password', e.target.value)}
                            placeholder="Masukkan password anda"
                        />
                        <button
                            type="button"
                            className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 focus:outline-none"
                            onClick={() => setShowPassword(!showPassword)}
                        >
                            {showPassword ? (
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                                </svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                            )}
                        </button>
                    </div>
                    <InputError message={errors.password} className="mt-2" />
                </div>

                <div className="flex items-center">
                    <label className="flex items-center">
                        <Checkbox
                            name="remember"
                            checked={data.remember}
                            onChange={(e) => setData('remember', e.target.checked)}
                        />
                        <span className="ms-2 text-sm text-gray-600 dark:text-gray-400">
                            Ingat Saya
                        </span>
                    </label>
                </div>

                <div className="pt-2">
                    <PrimaryButton className="w-full justify-center py-3 text-base" disabled={processing}>
                        Masuk
                    </PrimaryButton>
                </div>
            </form>

            <Modal show={showSecurityModal} onClose={closeModal}>
                <form onSubmit={submitSecurityCode} className="p-6">
                    <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
                        <ShieldCheck className="w-6 h-6 text-indigo-600" />
                        Verifikasi Keamanan
                    </h2>

                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                        Akun ini dilindungi dengan kode keamanan. Silakan masukkan kode 6 digit yang telah Anda generate.
                    </p>

                    <div className="mt-6">
                        <InputLabel
                            htmlFor="security_code"
                            value="Kode Keamanan"
                        />

                        <div className="mt-2 flex gap-2">
                            <TextInput
                                id="security_code"
                                type="text"
                                name="security_code"
                                ref={securityCodeInput}
                                value={data.security_code}
                                onChange={(e) => setData('security_code', e.target.value.replace(/\D/g, '').slice(0, 6))}
                                className="block w-full text-center tracking-[0.5em] text-xl font-mono font-bold text-black"
                                isFocused
                                placeholder="000000"
                                maxLength={6}
                            />
                        </div>

                        <InputError
                            message={errors.security_code}
                            className="mt-2"
                        />
                    </div>

                    <div className="mt-6 flex justify-end gap-3">
                        <SecondaryButton onClick={closeModal}>
                            Batal
                        </SecondaryButton>

                        <PrimaryButton disabled={processing} className="min-w-[100px] justify-center">
                            {processing ? 'Memverifikasi...' : 'Verifikasi'}
                        </PrimaryButton>
                    </div>
                </form>
            </Modal>
        </GuestLayout >
    );
}
