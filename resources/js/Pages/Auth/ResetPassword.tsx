import AuthButton from '@/Components/Auth/AuthButton';
import AuthField from '@/Components/Auth/AuthField';
import AuthHeading, { AuthAccent } from '@/Components/Auth/AuthHeading';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import { FormEventHandler, useState } from 'react';
import { ArrowLeft, Eye, EyeOff, LockKeyhole, Mail, ShieldCheck } from 'lucide-react';

export default function ResetPassword({
    token,
    email,
}: {
    token: string;
    email: string;
}) {
    const { data, setData, post, processing, errors, reset } = useForm({
        token: token,
        email: email,
        password: '',
        password_confirmation: '',
    });

    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        post(route('password.store'), {
            onFinish: () => reset('password', 'password_confirmation'),
        });
    };

    return (
        <GuestLayout>
            <Head title="Reset Password" />

            <div className="auth-rise">
                <AuthHeading
                    eyebrow="Reset password"
                    title={
                        <>
                            Buat <AuthAccent>password</AuthAccent> baru.
                        </>
                    }
                    subtitle="Silakan masukkan password baru untuk akun Anda."
                />
            </div>

            <form onSubmit={submit} className="mt-6 space-y-[18px]">
                <div className="auth-rise" style={{ animationDelay: '110ms' }}>
                    <AuthField
                        id="email"
                        type="email"
                        name="email"
                        label="Email"
                        icon={<Mail className="h-[17px] w-[17px]" strokeWidth={1.7} />}
                        value={data.email}
                        autoComplete="username"
                        readOnly
                        onChange={(e) => setData('email', e.target.value)}
                        className="cursor-not-allowed bg-[#F5EEE2] text-[#6B6178] hover:border-[#E3D9C9] focus:border-[#E3D9C9] focus:ring-0"
                        error={errors.email}
                    />
                </div>

                <div className="auth-rise" style={{ animationDelay: '170ms' }}>
                    <AuthField
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        name="password"
                        label="Password baru"
                        icon={<LockKeyhole className="h-[17px] w-[17px]" strokeWidth={1.7} />}
                        value={data.password}
                        autoComplete="new-password"
                        autoFocus
                        onChange={(e) => setData('password', e.target.value)}
                        placeholder="Minimal 8 karakter"
                        error={errors.password}
                        trailing={
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                                aria-pressed={showPassword}
                                className="mr-1 flex h-9 w-9 items-center justify-center rounded-[10px] text-[#857A93] transition-colors duration-200 hover:bg-[#F1E9FF] hover:text-[#5B3DF5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6D4DE0]/30"
                            >
                                {showPassword ? (
                                    <EyeOff className="h-[17px] w-[17px]" strokeWidth={1.7} aria-hidden="true" />
                                ) : (
                                    <Eye className="h-[17px] w-[17px]" strokeWidth={1.7} aria-hidden="true" />
                                )}
                            </button>
                        }
                    />
                </div>

                <div className="auth-rise" style={{ animationDelay: '230ms' }}>
                    <AuthField
                        id="password_confirmation"
                        type={showConfirmPassword ? 'text' : 'password'}
                        name="password_confirmation"
                        label="Konfirmasi password baru"
                        icon={<LockKeyhole className="h-[17px] w-[17px]" strokeWidth={1.7} />}
                        value={data.password_confirmation}
                        autoComplete="new-password"
                        onChange={(e) => setData('password_confirmation', e.target.value)}
                        placeholder="Ulangi password baru"
                        error={errors.password_confirmation}
                        trailing={
                            <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                aria-label={
                                    showConfirmPassword
                                        ? 'Sembunyikan konfirmasi password'
                                        : 'Tampilkan konfirmasi password'
                                }
                                aria-pressed={showConfirmPassword}
                                className="mr-1 flex h-9 w-9 items-center justify-center rounded-[10px] text-[#857A93] transition-colors duration-200 hover:bg-[#F1E9FF] hover:text-[#5B3DF5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6D4DE0]/30"
                            >
                                {showConfirmPassword ? (
                                    <EyeOff className="h-[17px] w-[17px]" strokeWidth={1.7} aria-hidden="true" />
                                ) : (
                                    <Eye className="h-[17px] w-[17px]" strokeWidth={1.7} aria-hidden="true" />
                                )}
                            </button>
                        }
                    />
                </div>

                <div className="auth-rise pt-1" style={{ animationDelay: '290ms' }}>
                    <AuthButton processing={processing}>Reset password</AuthButton>
                </div>
            </form>

            <div className="auth-rise mt-6 flex flex-col items-center gap-3" style={{ animationDelay: '350ms' }}>
                <div className="flex items-center justify-center gap-1.5 text-center text-[10.5px] tracking-[0.02em] text-[#7A7085]">
                    <ShieldCheck aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-[#8FAE8B]" strokeWidth={1.8} />
                    <span>Tautan reset ini hanya berlaku sekali pakai.</span>
                </div>

                <Link
                    href={route('login')}
                    className="auth-link inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#5B3DF5] transition-colors hover:text-[#4A2FB0]"
                >
                    <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                    Kembali ke halaman masuk
                </Link>
            </div>
        </GuestLayout>
    );
}
