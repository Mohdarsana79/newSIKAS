import AuthButton from '@/Components/Auth/AuthButton';
import AuthCheckbox from '@/Components/Auth/AuthCheckbox';
import AuthField, { AuthPasswordToggle } from '@/Components/Auth/AuthField';
import AuthHeading, { AuthAccent } from '@/Components/Auth/AuthHeading';
import GuestLayout from '@/Layouts/GuestLayout';
import Modal from '@/Components/Modal';
import { Head, Link, useForm } from '@inertiajs/react';
import { FormEventHandler, useState, useEffect, useRef } from 'react';
import {
    CheckCircle2,
    KeyRound,
    LockKeyhole,
    ShieldCheck,
    UserRound,
} from 'lucide-react';

export default function Login({
    status,
    canResetPassword: _canResetPassword,
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
            clearErrors('two_factor_required' as any);
            setTimeout(() => securityCodeInput.current?.focus(), 100);
        }
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
                if (!errs.two_factor_required) {
                    reset('password');
                }
            },
            onSuccess: () => {
                reset('password');
            },
        });
    };

    const submitSecurityCode: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('login'), {
            onSuccess: () => setShowSecurityModal(false),
            onFinish: () => {
                reset('password');
            },
        });
    };

    const closeModal = () => {
        setShowSecurityModal(false);
        setData('security_code', '');
        reset('password');
    };

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
                    subtitle="Masuk untuk melanjutkan pengelolaan anggaran sekolah Anda."
                />
            </div>

            {status && (
                <div
                    className="auth-rise mt-5 flex items-start gap-2.5 rounded-2xl border border-[#B5E5DF] bg-[#ECF9F7] px-3.5 py-3 text-[12.5px] font-medium leading-relaxed text-[#0E5862]"
                    style={{ animationDelay: '80ms' }}
                >
                    <CheckCircle2 aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-[#146670]" />
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
                            <AuthPasswordToggle
                                shown={showPassword}
                                onToggle={() => setShowPassword((prev) => !prev)}
                            />
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
                        className="auth-link text-[12px] font-semibold text-[#146670] transition-colors hover:text-[#08222B]"
                    >
                        Lupa password?
                    </Link>
                </div>

                <div className="auth-rise pt-1" style={{ animationDelay: '290ms' }}>
                    <AuthButton processing={processing}>Masuk</AuthButton>
                </div>
            </form>

            <div
                className="auth-rise mt-6 flex items-center justify-center gap-1.5 text-[10.5px] tracking-[0.02em] text-[#5A7882]"
                style={{ animationDelay: '350ms' }}
            >
                <ShieldCheck aria-hidden="true" className="h-3.5 w-3.5 text-[#146670]" strokeWidth={1.8} />
                <span>Akses hanya untuk akun sekolah terdaftar.</span>
            </div>

            <Modal
                show={showSecurityModal}
                onClose={closeModal}
                maxWidth="md"
                ariaLabelledBy="security-modal-title"
                ariaDescribedBy="security-modal-description"
                panelClassName="overflow-hidden rounded-[26px] border border-[#D5EAEA] bg-white shadow-[0_40px_80px_-44px_rgba(8,34,43,0.55)] dark:border-[#D5EAEA] dark:bg-white"
                overlayClassName="bg-[#051821]/60 backdrop-blur-[4px]"
            >
                <form onSubmit={submitSecurityCode} className="relative p-6 sm:p-7">
                    <span
                        aria-hidden="true"
                        className="absolute right-5 top-5 flex h-8 w-8 items-center justify-center rounded-full border border-[#CBE8E5] bg-[#EAF4F4] text-[#146670]"
                    >
                        <KeyRound className="h-3.5 w-3.5" strokeWidth={1.8} />
                    </span>

                    <div className="flex items-start gap-3.5">
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#08222B] text-[#8BE6DC]">
                            <ShieldCheck className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
                        </span>
                        <div>
                            <h2
                                id="security-modal-title"
                                className="font-sans text-[21px] font-bold leading-tight tracking-[-0.02em] text-[#08222B]"
                            >
                                Verifikasi keamanan
                            </h2>
                            <p
                                id="security-modal-description"
                                className="mt-1.5 text-[12.5px] leading-relaxed text-[#45636D]"
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
                            className="inline-flex h-11 items-center justify-center rounded-full border border-[#CBE2E2] bg-[#F8FBFB] px-5 text-[13px] font-semibold text-[#45636D] transition-all duration-200 hover:border-[#98CBCB] hover:bg-[#EAF4F4] hover:text-[#08222B] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#8BE6DC]/50"
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
        </GuestLayout>
    );
}
