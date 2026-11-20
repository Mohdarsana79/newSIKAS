import AuthButton from '@/Components/Auth/AuthButton';
import AuthField, { AuthPasswordToggle } from '@/Components/Auth/AuthField';
import AuthHeading, { AuthAccent } from '@/Components/Auth/AuthHeading';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import { FormEventHandler, useState } from 'react';
import { ArrowLeft, LockKeyhole, Mail, ShieldCheck } from 'lucide-react';

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
                        className="cursor-not-allowed bg-[#EAF4F4] text-[#45636D] hover:border-[#CBE2E2] focus:border-[#CBE2E2] focus:bg-[#EAF4F4] focus:ring-0"
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
                            <AuthPasswordToggle
                                shown={showPassword}
                                onToggle={() => setShowPassword((prev) => !prev)}
                            />
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
                            <AuthPasswordToggle
                                shown={showConfirmPassword}
                                onToggle={() => setShowConfirmPassword((prev) => !prev)}
                                showLabel="Tampilkan konfirmasi password"
                                hideLabel="Sembunyikan konfirmasi password"
                            />
                        }
                    />
                </div>

                <div className="auth-rise pt-1" style={{ animationDelay: '290ms' }}>
                    <AuthButton processing={processing}>Reset password</AuthButton>
                </div>
            </form>

            <div className="auth-rise mt-6 flex flex-col items-center gap-3" style={{ animationDelay: '350ms' }}>
                <div className="flex items-center justify-center gap-1.5 text-center text-[10.5px] tracking-[0.02em] text-[#5A7882]">
                    <ShieldCheck aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-[#146670]" strokeWidth={1.8} />
                    <span>Tautan reset ini hanya berlaku sekali pakai.</span>
                </div>

                <Link
                    href={route('login')}
                    className="auth-link inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#146670] transition-colors hover:text-[#08222B]"
                >
                    <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                    Kembali ke halaman masuk
                </Link>
            </div>
        </GuestLayout>
    );
}
