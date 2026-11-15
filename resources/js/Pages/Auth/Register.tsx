import AuthButton from '@/Components/Auth/AuthButton';
import AuthField from '@/Components/Auth/AuthField';
import AuthHeading, { AuthAccent } from '@/Components/Auth/AuthHeading';
import { AuthBackLink, AuthLockBadge } from '@/Components/Auth/AuthLockedState';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import { FormEventHandler, useState } from 'react';
import {
    AtSign,
    Eye,
    EyeOff,
    LockKeyhole,
    ShieldCheck,
    UserRound,
} from 'lucide-react';

export default function Register({ isLocked = false }: { isLocked?: boolean }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        name: '',
        username: '',
        password: '',
        password_confirmation: '',
    });

    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        post(route('register'), {
            onFinish: () => reset('password', 'password_confirmation'),
        });
    };

    // Tampilan saja — kondisinya identik dengan versi sebelumnya.
    const strength =
        data.password.length < 8
            ? 'weak'
            : !/(?=.*[a-z])(?=.*[A-Z])(?=.*[\W_])/.test(data.password)
              ? 'medium'
              : 'strong';

    const strengthMeta = {
        weak: {
            label: 'Lemah (Minimal 8 karakter)',
            filled: 1,
            color: '#D96A4E',
            textClassName: 'text-[#B3462C]',
        },
        medium: {
            label: 'Sedang (Gunakan huruf besar & simbol)',
            filled: 2,
            color: '#D9A53F',
            textClassName: 'text-[#9A6B1E]',
        },
        strong: {
            label: 'Kuat',
            filled: 3,
            color: '#7FA277',
            textClassName: 'text-[#4F7A4C]',
        },
    } as const;

    const passwordFeedback = strengthMeta[strength];

    if (isLocked) {
        return (
            <GuestLayout>
                <Head title="Registrasi Terkunci" />

                <div className="auth-rise flex flex-col items-center px-1 text-center">
                    <AuthLockBadge />

                    <p className="mt-6 flex items-center gap-2.5 text-[10px] font-bold uppercase tracking-[0.26em] text-[#6B5E86]">
                        <span aria-hidden="true" className="h-px w-5 bg-[#C9B9E8]" />
                        Akses terbatas
                        <span aria-hidden="true" className="h-px w-5 bg-[#C9B9E8]" />
                    </p>

                    <h1 className="mt-3 max-w-[19ch] font-display text-[clamp(1.85rem,2.4vw,2.25rem)] font-semibold leading-[1.05] tracking-[-0.025em] text-[#221C33]">
                        Registrasi <span className="text-[#4A2FB0]">terkunci</span>.
                    </h1>

                    <p className="mt-3 max-w-[36ch] text-[13px] leading-relaxed text-[#6B6178]">
                        Sistem mendeteksi bahwa sudah ada pengguna terdaftar di instalasi ini.
                        Pendaftaran akun tambahan ditutup demi keamanan data sekolah.
                    </p>

                    <div className="auth-rise mt-7 w-full sm:w-auto" style={{ animationDelay: '170ms' }}>
                        <AuthBackLink href={route('login')}>Kembali ke halaman masuk</AuthBackLink>
                    </div>
                </div>
            </GuestLayout>
        );
    }

    return (
        <GuestLayout>
            <Head title="Register" />

            <div className="auth-rise">
                <AuthHeading
                    eyebrow="Daftar akun"
                    title={
                        <>
                            Buat akun <AuthAccent>sekolah</AuthAccent>.
                        </>
                    }
                    subtitle="Daftarkan akun admin sekolah untuk mengurus RKAS, buku kas, dan laporan."
                />
            </div>

            <form onSubmit={submit} className="mt-6 space-y-[18px]">
                <div className="auth-rise" style={{ animationDelay: '110ms' }}>
                    <AuthField
                        id="name"
                        type="text"
                        name="name"
                        label="Nama lengkap"
                        icon={<UserRound className="h-[17px] w-[17px]" strokeWidth={1.7} />}
                        value={data.name}
                        autoComplete="name"
                        autoFocus
                        onChange={(e) => setData('name', e.target.value)}
                        placeholder="Nama lengkap pengguna"
                        error={errors.name}
                        required
                    />
                </div>

                <div className="auth-rise" style={{ animationDelay: '165ms' }}>
                    <AuthField
                        id="username"
                        type="text"
                        name="username"
                        label="Username"
                        icon={<AtSign className="h-[17px] w-[17px]" strokeWidth={1.7} />}
                        value={data.username}
                        autoComplete="username"
                        onChange={(e) => setData('username', e.target.value)}
                        placeholder="Buat username unik"
                        error={errors.username}
                        required
                    />
                </div>

                <div className="auth-rise" style={{ animationDelay: '220ms' }}>
                    <AuthField
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        name="password"
                        label="Password"
                        icon={<LockKeyhole className="h-[17px] w-[17px]" strokeWidth={1.7} />}
                        value={data.password}
                        autoComplete="new-password"
                        onChange={(e) => setData('password', e.target.value)}
                        placeholder="Min. 8 karakter + simbol"
                        error={errors.password}
                        required
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

                    {data.password && (
                        <div className="auth-fade mt-2.5">
                            <div aria-hidden="true" className="flex items-center gap-1.5">
                                {[1, 2, 3].map((segment) => (
                                    <span
                                        key={segment}
                                        className="h-1.5 flex-1 rounded-full bg-[#EFE7D8] transition-colors duration-300 ease-out"
                                        style={
                                            segment <= passwordFeedback.filled
                                                ? { backgroundColor: passwordFeedback.color }
                                                : undefined
                                        }
                                    />
                                ))}
                            </div>
                            <p
                                aria-live="polite"
                                className={`mt-1.5 text-[11.5px] font-medium leading-snug ${passwordFeedback.textClassName}`}
                            >
                                {passwordFeedback.label}
                            </p>
                        </div>
                    )}
                </div>

                <div className="auth-rise" style={{ animationDelay: '275ms' }}>
                    <AuthField
                        id="password_confirmation"
                        type={showConfirmPassword ? 'text' : 'password'}
                        name="password_confirmation"
                        label="Konfirmasi password"
                        icon={<LockKeyhole className="h-[17px] w-[17px]" strokeWidth={1.7} />}
                        value={data.password_confirmation}
                        autoComplete="new-password"
                        onChange={(e) => setData('password_confirmation', e.target.value)}
                        placeholder="Ulangi password"
                        error={errors.password_confirmation}
                        required
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

                <div className="auth-rise pt-1" style={{ animationDelay: '330ms' }}>
                    <AuthButton processing={processing}>Buat akun</AuthButton>
                </div>
            </form>

            <div
                className="auth-rise mt-6 flex flex-wrap items-center justify-center gap-x-1.5 gap-y-1 text-[12px] text-[#6B6178]"
                style={{ animationDelay: '385ms' }}
            >
                <span>Sudah punya akun?</span>
                <Link
                    href={route('login')}
                    className="auth-link text-[12px] font-semibold text-[#5B3DF5] transition-colors hover:text-[#4A2FB0]"
                >
                    Masuk
                </Link>
            </div>

            <div
                className="auth-rise mt-5 flex items-center justify-center gap-1.5 text-[10.5px] tracking-[0.02em] text-[#7A7085]"
                style={{ animationDelay: '440ms' }}
            >
                <ShieldCheck aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-[#8FAE8B]" strokeWidth={1.8} />
                <span>Registrasi hanya untuk satu akun sekolah.</span>
            </div>
        </GuestLayout>
    );
}
