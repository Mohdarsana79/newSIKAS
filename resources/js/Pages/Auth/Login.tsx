import AuthButton from '@/Components/Auth/AuthButton';
import AuthCheckbox from '@/Components/Auth/AuthCheckbox';
import AuthField from '@/Components/Auth/AuthField';
import AuthHeading, { AuthAccent } from '@/Components/Auth/AuthHeading';
import GuestLayout from '@/Layouts/GuestLayout';
import Modal from '@/Components/Modal';
import { Head, Link, useForm } from '@inertiajs/react';
import { FormEventHandler, useState, useEffect, useRef } from 'react';
import {
    CheckCircle2,
    Eye,
    EyeOff,
    KeyRound,
    LockKeyhole,
    ShieldCheck,
    UserRound,
} from 'lucide-react';

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
        // Clear pajak reminder flag so it will show again after a fresh login
        sessionStorage.removeItem('pajak_reminder_shown');

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

            <div className="auth-rise">
                <AuthHeading
                    eyebrow="Masuk akun"
                    title={
                        <>
                            Selamat datang <AuthAccent>kembali</AuthAccent>.
                        </>
                    }
                    subtitle="Masuk untuk melanjutkan pekerjaan anggaran sekolah Anda."
                />
            </div>

            {status && (
                <div
                    className="auth-rise mt-5 flex items-start gap-2.5 rounded-2xl border border-[#C3D6BC] bg-[#F2F7EC] px-3.5 py-3 text-[12.5px] font-medium leading-relaxed text-[#3F6B43]"
                    style={{ animationDelay: '80ms' }}
                >
                    <CheckCircle2 aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-[#5E8C5A]" />
                    <span>{status}</span>
                </div>
            )}

            <form onSubmit={submit} className="mt-6 space-y-[18px]">
                <div className="auth-rise" style={{ animationDelay: '110ms' }}>
                    <AuthField
                        id="username"
                        type="text"
                        name="username"
                        label="Username"
                        icon={<UserRound className="h-[17px] w-[17px]" strokeWidth={1.7} />}
                        value={data.username}
                        autoComplete="username"
                        autoFocus
                        onChange={(e) => setData('username', e.target.value)}
                        placeholder="Masukkan username"
                        error={errors.username}
                    />
                </div>

                <div className="auth-rise" style={{ animationDelay: '170ms' }}>
                    <AuthField
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        name="password"
                        label="Password"
                        icon={<LockKeyhole className="h-[17px] w-[17px]" strokeWidth={1.7} />}
                        value={data.password}
                        autoComplete="current-password"
                        onChange={(e) => setData('password', e.target.value)}
                        placeholder="Masukkan password"
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

                <div
                    className="auth-rise flex flex-wrap items-center justify-between gap-x-3 gap-y-2 pt-0.5"
                    style={{ animationDelay: '230ms' }}
                >
                    <AuthCheckbox
                        name="remember"
                        checked={data.remember}
                        onChange={(e) => setData('remember', e.target.checked)}
                        label="Ingat saya"
                    />

                    <Link
                        href={route('password.request')}
                        className="auth-link text-[12px] font-semibold text-[#5B3DF5] transition-colors hover:text-[#4A2FB0]"
                    >
                        Lupa password?
                    </Link>
                </div>

                <div className="auth-rise pt-1" style={{ animationDelay: '290ms' }}>
                    <AuthButton processing={processing}>Masuk</AuthButton>
                </div>
            </form>

            <div
                className="auth-rise mt-6 flex items-center justify-center gap-1.5 text-[10.5px] tracking-[0.02em] text-[#7A7085]"
                style={{ animationDelay: '350ms' }}
            >
                <ShieldCheck aria-hidden="true" className="h-3.5 w-3.5 text-[#8FAE8B]" strokeWidth={1.8} />
                <span>Akses hanya untuk akun sekolah terdaftar.</span>
            </div>

            <Modal
                show={showSecurityModal}
                onClose={closeModal}
                maxWidth="md"
                ariaLabelledBy="security-modal-title"
                ariaDescribedBy="security-modal-description"
                panelClassName="overflow-hidden rounded-[26px] border border-[#E4D8C4] bg-[#FFFDF8] shadow-[0_40px_80px_-44px_rgba(34,28,51,0.6)] dark:border-[#E4D8C4] dark:bg-[#FFFDF8]"
                overlayClassName="bg-[#221C33]/45 backdrop-blur-[3px]"
            >
                <form onSubmit={submitSecurityCode} className="relative p-6 sm:p-7">
                    <span
                        aria-hidden="true"
                        className="absolute right-5 top-5 flex h-8 w-8 items-center justify-center rounded-full border border-[#E5DBFF] bg-[#F7F2FF] text-[#6D4DE0]"
                    >
                        <KeyRound className="h-3.5 w-3.5" strokeWidth={1.8} />
                    </span>

                    <div className="flex items-start gap-3.5">
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#EFE8FF] text-[#5B3DF5]">
                            <ShieldCheck className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
                        </span>
                        <div>
                            <h2
                                id="security-modal-title"
                                className="font-display text-[22px] font-semibold leading-tight tracking-[-0.015em] text-[#221C33]"
                            >
                                Verifikasi keamanan
                            </h2>
                            <p
                                id="security-modal-description"
                                className="mt-1.5 text-[12.5px] leading-relaxed text-[#6B6178]"
                            >
                                Akun ini dilindungi dengan kode keamanan. Silakan masukkan kode 6
                                digit yang telah Anda generate.
                            </p>
                        </div>
                    </div>

                    <div className="mt-6">
                        <AuthField
                            id="security_code"
                            type="text"
                            name="security_code"
                            label="Kode keamanan"
                            ref={securityCodeInput}
                            value={data.security_code}
                            onChange={(e) =>
                                setData('security_code', e.target.value.replace(/\D/g, '').slice(0, 6))
                            }
                            inputMode="numeric"
                            autoComplete="one-time-code"
                            className="text-center font-mono text-[18px] font-bold tracking-[0.5em]"
                            placeholder="000000"
                            maxLength={6}
                            error={errors.security_code}
                        />
                    </div>

                    <div className="mt-6 flex items-center justify-end gap-2.5">
                        <button
                            type="button"
                            onClick={closeModal}
                            className="inline-flex h-11 items-center justify-center rounded-[12px] border border-[#E3D9C9] bg-[#FFFCF5] px-4 text-[13px] font-semibold text-[#5C5468] transition-all duration-200 hover:border-[#CFC2AC] hover:bg-[#F7F0E5] hover:text-[#221C33] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#6D4DE0]/20"
                        >
                            Batal
                        </button>

                        <AuthButton
                            processing={processing}
                            className="h-11 min-w-[136px] w-auto px-5 text-[13px]"
                        >
                            {processing ? 'Memverifikasi...' : 'Verifikasi'}
                        </AuthButton>
                    </div>
                </form>
            </Modal>
        </GuestLayout >
    );
}
