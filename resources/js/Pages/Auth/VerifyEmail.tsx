import AuthButton from '@/Components/Auth/AuthButton';
import AuthHeading, { AuthAccent } from '@/Components/Auth/AuthHeading';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';
import { CheckCircle2, LogOut, ShieldCheck } from 'lucide-react';

export default function VerifyEmail({ status }: { status?: string }) {
    const { post, processing } = useForm({});

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        post(route('verification.send'));
    };

    return (
        <GuestLayout>
            <Head title="Email Verification" />

            <div className="auth-rise">
                <AuthHeading
                    eyebrow="Verifikasi email"
                    title={
                        <>
                            Verifikasi <AuthAccent>email</AuthAccent> Anda.
                        </>
                    }
                    subtitle="Terima kasih sudah mendaftar! Sebelum mulai, verifikasi alamat email Anda lewat tautan yang baru kami kirim. Jika tidak menerima, kami bisa mengirim ulang."
                />
            </div>

            {status === 'verification-link-sent' && (
                <div
                    className="auth-rise mt-5 flex items-start gap-2.5 rounded-2xl border border-[#C3D6BC] bg-[#F2F7EC] px-3.5 py-3 text-[12.5px] font-medium leading-relaxed text-[#3F6B43]"
                    style={{ animationDelay: '80ms' }}
                >
                    <CheckCircle2 aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-[#5E8C5A]" />
                    <span>Tautan verifikasi baru telah dikirim ke alamat email yang Anda daftarkan.</span>
                </div>
            )}

            <form onSubmit={submit} className="mt-6">
                <div className="auth-rise pt-1" style={{ animationDelay: '110ms' }}>
                    <AuthButton processing={processing}>Kirim ulang email verifikasi</AuthButton>
                </div>
            </form>

            <div className="auth-rise mt-5 flex justify-center" style={{ animationDelay: '170ms' }}>
                <Link
                    href={route('logout')}
                    method="post"
                    as="button"
                    className="auth-link inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#5B3DF5] transition-colors hover:text-[#4A2FB0]"
                >
                    <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                    Keluar
                </Link>
            </div>

            <div
                className="auth-rise mt-6 flex items-center justify-center gap-1.5 text-center text-[10.5px] tracking-[0.02em] text-[#7A7085]"
                style={{ animationDelay: '230ms' }}
            >
                <ShieldCheck aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-[#8FAE8B]" strokeWidth={1.8} />
                <span>Email terverifikasi menjaga akses ke data keuangan sekolah.</span>
            </div>
        </GuestLayout>
    );
}
