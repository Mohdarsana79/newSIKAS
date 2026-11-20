import AuthButton from '@/Components/Auth/AuthButton';
import AuthField from '@/Components/Auth/AuthField';
import AuthHeading, { AuthAccent } from '@/Components/Auth/AuthHeading';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';
import { LockKeyhole, ShieldCheck } from 'lucide-react';

export default function ConfirmPassword() {
    const { data, setData, post, processing, errors, reset } = useForm({
        password: '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        post(route('password.confirm'), {
            onFinish: () => reset('password'),
        });
    };

    return (
        <GuestLayout>
            <Head title="Confirm Password" />

            <div className="auth-rise">
                <AuthHeading
                    eyebrow="Area aman"
                    title={
                        <>
                            Konfirmasi <AuthAccent>password</AuthAccent>.
                        </>
                    }
                    subtitle="Ini area aman aplikasi. Konfirmasi password Anda sebelum melanjutkan."
                />
            </div>

            <form onSubmit={submit} className="mt-6 space-y-[18px]">
                <div className="auth-rise" style={{ animationDelay: '110ms' }}>
                    <AuthField
                        id="password"
                        type="password"
                        name="password"
                        label="Password"
                        icon={<LockKeyhole className="h-[17px] w-[17px]" strokeWidth={1.7} />}
                        value={data.password}
                        autoComplete="current-password"
                        autoFocus
                        onChange={(e) => setData('password', e.target.value)}
                        placeholder="Masukkan password Anda"
                        error={errors.password}
                    />
                </div>

                <div className="auth-rise pt-1" style={{ animationDelay: '170ms' }}>
                    <AuthButton processing={processing}>Konfirmasi</AuthButton>
                </div>
            </form>

            <div
                className="auth-rise mt-6 flex items-center justify-center gap-1.5 text-center text-[10.5px] tracking-[0.02em] text-[#5A7882]"
                style={{ animationDelay: '230ms' }}
            >
                <ShieldCheck aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-[#146670]" strokeWidth={1.8} />
                <span>Konfirmasi ini melindungi perubahan data penting sekolah.</span>
            </div>
        </GuestLayout>
    );
}
