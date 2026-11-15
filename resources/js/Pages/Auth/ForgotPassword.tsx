import AuthButton from '@/Components/Auth/AuthButton';
import AuthField from '@/Components/Auth/AuthField';
import AuthHeading, { AuthAccent } from '@/Components/Auth/AuthHeading';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import { Fragment, FormEventHandler, useState } from 'react';
import { ArrowLeft, CheckCircle2, Eye, EyeOff, KeyRound, LockKeyhole, Mail, ShieldCheck } from 'lucide-react';
import axios from 'axios';

const STEPS = [
    { index: 1, label: 'Email' },
    { index: 2, label: 'OTP' },
    { index: 3, label: 'Sandi' },
] as const;

export default function ForgotPassword() {
    const [step, setStep] = useState(1); // 1: Email, 2: OTP, 3: New Password
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [localErrors, setLocalErrors] = useState<any>({});
    const [showPassword, setShowPassword] = useState(false);

    const { data, setData, post, processing, errors, reset } = useForm({
        email: '',
        otp: '',
        password: '',
        password_confirmation: '',
    });

    const handleSendOtp = async () => {
        setLoading(true);
        setLocalErrors({});
        setMessage('');
        try {
            const response = await axios.post(route('password.otp.send'), { email: data.email });
            setMessage(response.data.message);
            setStep(2);
        } catch (error: any) {
            if (error.response?.data?.errors) {
                setLocalErrors(error.response.data.errors);
            } else {
                setMessage(error.response?.data?.message || 'Terjadi kesalahan. Silakan coba lagi.');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOtp = async () => {
        setLoading(true);
        setLocalErrors({});
        try {
            const response = await axios.post(route('password.otp.verify'), {
                email: data.email,
                otp: data.otp,
            });
            setMessage(response.data.message);
            setStep(3);
        } catch (error: any) {
            if (error.response?.data?.errors) {
                setLocalErrors(error.response.data.errors);
            } else {
                setMessage(error.response?.data?.message || 'Kode OTP salah atau kedaluwarsa.');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword: FormEventHandler = (e) => {
        e.preventDefault();
        setLoading(true);
        setLocalErrors({});

        axios
            .post(route('password.otp.reset'), {
                email: data.email,
                otp: data.otp,
                password: data.password,
                password_confirmation: data.password_confirmation,
            })
            .then((response) => {
                setMessage(response.data.message);
                setStep(4); // Success Step
            })
            .catch((error) => {
                if (error.response?.data?.errors) {
                    setLocalErrors(error.response.data.errors);
                } else {
                    setMessage(error.response?.data?.message || 'Gagal mengubah password.');
                }
            })
            .finally(() => {
                setLoading(false);
            });
    };

    return (
        <GuestLayout>
            <Head title="Reset Password" />

            <div className="auth-rise">
                <AuthHeading
                    eyebrow={step === 4 ? 'Selesai' : 'Pemulihan akun'}
                    title={
                        step === 1 ? (
                            <>
                                Lupa <AuthAccent>password</AuthAccent>?
                            </>
                        ) : step === 2 ? (
                            <>
                                Cek <AuthAccent>kode OTP</AuthAccent>.
                            </>
                        ) : step === 3 ? (
                            <>
                                Buat <AuthAccent>password</AuthAccent> baru.
                            </>
                        ) : (
                            <>
                                Password <AuthAccent>berhasil</AuthAccent> diubah.
                            </>
                        )
                    }
                    subtitle={
                        step === 1 ? (
                            'Masukkan alamat email Anda untuk menerima kode OTP.'
                        ) : step === 2 ? (
                            <>
                                Masukkan kode OTP yang kami kirimkan ke{' '}
                                <span className="font-semibold text-[#4A2FB0]">{data.email}</span>.
                            </>
                        ) : step === 3 ? (
                            'Masukkan kata sandi baru Anda.'
                        ) : (
                            'Kata sandi Anda telah berhasil diubah.'
                        )
                    }
                />
            </div>

            {step < 4 && (
                <div className="auth-rise mt-5" style={{ animationDelay: '70ms' }}>
                    <p className="sr-only">Langkah {step} dari 3</p>

                    <div aria-hidden="true" className="flex items-center gap-3">
                        {STEPS.map((item, index) => {
                            const isDone = step > item.index;
                            const isActive = step === item.index;

                            return (
                                <Fragment key={item.index}>
                                    {index > 0 && (
                                        <span
                                            className={`h-px min-w-3 flex-1 rounded-full transition-colors duration-300 ${
                                                isDone || isActive ? 'bg-[#6D4DE0]/35' : 'bg-[#E3D9C9]'
                                            }`}
                                        />
                                    )}

                                    <div className="flex items-center gap-2">
                                        <span
                                            className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold tabular-nums transition-colors duration-300 ${
                                                isActive
                                                    ? 'bg-[#221C33] text-[#FFFDF8]'
                                                    : isDone
                                                      ? 'bg-[#E5DBFF] text-[#4A2FB0]'
                                                      : 'bg-[#F3EAD9] text-[#9A8FA6]'
                                            }`}
                                        >
                                            {String(item.index).padStart(2, '0')}
                                        </span>
                                        <span
                                            className={`text-[9.5px] font-bold uppercase tracking-[0.16em] transition-colors duration-300 ${
                                                isActive
                                                    ? 'text-[#221C33]'
                                                    : isDone
                                                      ? 'text-[#4A2FB0]'
                                                      : 'text-[#7A7085]'
                                            }`}
                                        >
                                            {item.label}
                                        </span>
                                    </div>
                                </Fragment>
                            );
                        })}
                    </div>
                </div>
            )}

            {message && !Object.keys(localErrors).length && (
                <div
                    className={`auth-rise mt-5 flex items-start gap-2.5 rounded-2xl border px-3.5 py-3 text-[12.5px] font-medium leading-relaxed ${
                        step === 4
                            ? 'border-[#C3D6BC] bg-[#F2F7EC] text-[#3F6B43]'
                            : 'border-[#DCD1F5] bg-[#F7F2FF] text-[#4A2FB0]'
                    }`}
                    style={{ animationDelay: '100ms' }}
                >
                    {step === 4 ? (
                        <CheckCircle2 aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-[#5E8C5A]" />
                    ) : (
                        <ShieldCheck aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-[#6D4DE0]" />
                    )}
                    <span>{message}</span>
                </div>
            )}

            {step === 1 && (
                <div className="mt-6 space-y-[18px]">
                    <div className="auth-rise" style={{ animationDelay: '110ms' }}>
                        <AuthField
                            id="email"
                            type="email"
                            label="Email terdaftar"
                            icon={<Mail className="h-[17px] w-[17px]" strokeWidth={1.7} />}
                            value={data.email}
                            autoComplete="email"
                            autoFocus
                            onChange={(e) => setData('email', e.target.value)}
                            placeholder="nama@email.com"
                            error={localErrors.email}
                        />
                    </div>

                    <div className="auth-rise space-y-3" style={{ animationDelay: '170ms' }}>
                        <AuthButton
                            type="button"
                            onClick={handleSendOtp}
                            processing={loading}
                            disabled={!data.email}
                        >
                            {loading ? 'Mengirim...' : 'Kirim kode OTP'}
                        </AuthButton>

                        <div className="flex justify-center">
                            <Link
                                href={route('login')}
                                className="auth-link inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#5B3DF5] transition-colors hover:text-[#4A2FB0]"
                            >
                                <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                                Kembali ke login
                            </Link>
                        </div>
                    </div>
                </div>
            )}

            {step === 2 && (
                <div className="mt-6 space-y-[18px]">
                    <div className="auth-rise" style={{ animationDelay: '110ms' }}>
                        <AuthField
                            id="otp"
                            type="text"
                            label="Kode OTP"
                            icon={<KeyRound className="h-[17px] w-[17px]" strokeWidth={1.7} />}
                            value={data.otp}
                            autoComplete="one-time-code"
                            inputMode="numeric"
                            autoFocus
                            onChange={(e) => setData('otp', e.target.value.replace(/\D/g, '').slice(0, 6))}
                            placeholder="000000"
                            maxLength={6}
                            className="text-center font-mono text-[18px] font-bold tracking-[0.5em]"
                            error={localErrors.otp}
                            labelExtra={
                                <button
                                    type="button"
                                    onClick={handleSendOtp}
                                    disabled={loading}
                                    className="auth-link text-[11.5px] font-semibold text-[#5B3DF5] transition-colors hover:text-[#4A2FB0] disabled:pointer-events-none disabled:opacity-60"
                                >
                                    Kirim ulang OTP
                                </button>
                            }
                        />
                    </div>

                    <div className="auth-rise space-y-3" style={{ animationDelay: '170ms' }}>
                        <AuthButton
                            type="button"
                            onClick={handleVerifyOtp}
                            processing={loading}
                            disabled={data.otp.length < 6}
                        >
                            {loading ? 'Memverifikasi...' : 'Verifikasi OTP'}
                        </AuthButton>

                        <div className="flex justify-center">
                            <button
                                type="button"
                                onClick={() => setStep(1)}
                                className="auth-link inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#5B3DF5] transition-colors hover:text-[#4A2FB0]"
                            >
                                <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                                Ganti email
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {step === 3 && (
                <form onSubmit={handleResetPassword} className="mt-6 space-y-[18px]">
                    <div className="auth-rise" style={{ animationDelay: '110ms' }}>
                        <AuthField
                            id="password"
                            type={showPassword ? 'text' : 'password'}
                            label="Password baru"
                            icon={<LockKeyhole className="h-[17px] w-[17px]" strokeWidth={1.7} />}
                            value={data.password}
                            autoComplete="new-password"
                            autoFocus
                            onChange={(e) => setData('password', e.target.value)}
                            placeholder="Minimal 8 karakter"
                            error={localErrors.password}
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

                    <div className="auth-rise" style={{ animationDelay: '165ms' }}>
                        <AuthField
                            id="password_confirmation"
                            type={showPassword ? 'text' : 'password'}
                            label="Konfirmasi password baru"
                            icon={<LockKeyhole className="h-[17px] w-[17px]" strokeWidth={1.7} />}
                            value={data.password_confirmation}
                            autoComplete="new-password"
                            onChange={(e) => setData('password_confirmation', e.target.value)}
                            placeholder="Ulangi password baru"
                            error={localErrors.password_confirmation}
                        />
                    </div>

                    <div className="auth-rise pt-1" style={{ animationDelay: '220ms' }}>
                        <AuthButton processing={processing}>
                            {processing ? 'Menyimpan...' : 'Reset Password'}
                        </AuthButton>
                    </div>
                </form>
            )}

            {step === 4 && (
                <div className="mt-6 flex flex-col items-center text-center">
                    <div className="auth-pop relative flex h-20 w-20 items-center justify-center">
                        <span aria-hidden="true" className="absolute inset-0 rotate-6 rounded-[24px] bg-[#E5DBFF]" />
                        <span aria-hidden="true" className="absolute inset-[3px] -rotate-3 rounded-[21px] bg-[#FFFDF8]" />
                        <span className="relative flex h-14 w-14 items-center justify-center rounded-[16px] bg-[#F2F7EC] text-[#5E8C5A] shadow-[0_10px_18px_-12px_rgba(63,107,67,0.5)]">
                            <CheckCircle2 className="h-7 w-7" strokeWidth={1.7} aria-hidden="true" />
                        </span>
                    </div>

                    <p className="auth-rise mt-5 max-w-[34ch] text-[13px] leading-relaxed text-[#6B6178]" style={{ animationDelay: '120ms' }}>
                        Akun <span className="font-semibold text-[#4A2FB0]">{data.email}</span> sudah bisa
                        digunakan dengan password baru Anda.
                    </p>

                    <div className="auth-rise mt-7 w-full sm:w-auto" style={{ animationDelay: '170ms' }}>
                        <Link
                            href={route('login')}
                            className="inline-flex h-[52px] w-full items-center justify-center gap-2 rounded-[14px] bg-[#221C33] px-6 text-[14px] font-semibold text-[#FFFDF8] shadow-[0_2px_0_#0D0919,0_18px_30px_-16px_rgba(34,28,51,0.65)] transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:bg-[#2C2440] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#6D4DE0]/25 focus-visible:ring-offset-2 focus-visible:ring-offset-[#FFFDF8] sm:w-auto"
                        >
                            Masuk sekarang
                        </Link>
                    </div>
                </div>
            )}

            {step < 4 && (
                <div
                    className="auth-rise mt-6 flex items-center justify-center gap-1.5 text-center text-[10.5px] tracking-[0.02em] text-[#7A7085]"
                    style={{ animationDelay: '280ms' }}
                >
                    <ShieldCheck aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-[#8FAE8B]" strokeWidth={1.8} />
                    <span>
                        {step === 3
                            ? 'Gunakan kombinasi huruf besar, kecil, dan simbol.'
                            : 'Kode OTP berlaku sementara — jangan bagikan ke siapa pun.'}
                    </span>
                </div>
            )}
        </GuestLayout>
    );
}
