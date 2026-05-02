import InputError from '@/Components/InputError';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, useForm, Link } from '@inertiajs/react';
import { FormEventHandler, useState } from 'react';
import { Mail, ArrowLeft, KeyRound, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import InputLabel from '@/Components/InputLabel';
import axios from 'axios';

export default function ForgotPassword() {
    const [step, setStep] = useState(1); // 1: Email, 2: OTP, 3: New Password
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
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
                otp: data.otp 
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
        
        axios.post(route('password.otp.reset'), {
            email: data.email,
            otp: data.otp,
            password: data.password,
            password_confirmation: data.password_confirmation
        })
        .then(response => {
            setMessage(response.data.message);
            setStep(4); // Success Step
        })
        .catch(error => {
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

            <div className="text-center mb-8">
                <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white mb-2">
                    {step === 4 ? 'Berhasil!' : 'Reset Password'}
                </h2>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                    {step === 1 && 'Masukkan alamat email Anda untuk menerima kode OTP.'}
                    {step === 2 && `Masukkan kode OTP yang kami kirimkan ke ${data.email}.`}
                    {step === 3 && 'Masukkan kata sandi baru Anda.'}
                    {step === 4 && 'Kata sandi Anda telah berhasil diubah.'}
                </div>
            </div>

            {message && !Object.keys(localErrors).length && (
                <div className={`mb-4 rounded-md p-4 text-sm font-medium border ${step === 4 ? 'bg-green-50 text-green-600 border-green-200' : 'bg-blue-50 text-blue-600 border-blue-200'}`}>
                    {message}
                </div>
            )}

            {step === 1 && (
                <div className="space-y-6">
                    <div>
                        <InputLabel htmlFor="email" value="Email Terdaftar" />
                        <div className="relative mt-2">
                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                <Mail className="h-5 w-5 text-gray-400" />
                            </div>
                            <TextInput
                                id="email"
                                type="email"
                                value={data.email}
                                className="block w-full pl-10 py-3 text-gray-900"
                                isFocused={true}
                                onChange={(e) => setData('email', e.target.value)}
                                placeholder="nama@email.com"
                            />
                        </div>
                        <InputError message={localErrors.email} className="mt-2" />
                    </div>

                    <div className="flex flex-col gap-4">
                        <PrimaryButton 
                            className="w-full justify-center py-3 text-base" 
                            onClick={handleSendOtp} 
                            disabled={loading || !data.email}
                        >
                            {loading ? 'Mengirim...' : 'Kirim Kode OTP'}
                        </PrimaryButton>

                        <Link
                            href={route('login')}
                            className="flex items-center justify-center gap-2 text-sm font-medium text-gray-600 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400 transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Kembali ke Login
                        </Link>
                    </div>
                </div>
            )}

            {step === 2 && (
                <div className="space-y-6">
                    <div>
                        <div className="flex justify-between items-center">
                            <InputLabel htmlFor="otp" value="Kode OTP" />
                            <button 
                                onClick={handleSendOtp}
                                className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold"
                                disabled={loading}
                            >
                                Kirim Ulang OTP
                            </button>
                        </div>
                        <div className="relative mt-2">
                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                <KeyRound className="h-5 w-5 text-gray-400" />
                            </div>
                            <TextInput
                                id="otp"
                                type="text"
                                value={data.otp}
                                className="block w-full pl-10 py-3 text-gray-900 tracking-[0.5em] font-bold text-center"
                                isFocused={true}
                                onChange={(e) => setData('otp', e.target.value.replace(/\D/g, '').slice(0, 6))}
                                placeholder="------"
                                maxLength={6}
                            />
                        </div>
                        <InputError message={localErrors.otp} className="mt-2" />
                    </div>

                    <div className="flex flex-col gap-4">
                        <PrimaryButton 
                            className="w-full justify-center py-3 text-base" 
                            onClick={handleVerifyOtp} 
                            disabled={loading || data.otp.length < 6}
                        >
                            {loading ? 'Memverifikasi...' : 'Verifikasi OTP'}
                        </PrimaryButton>

                        <button
                            onClick={() => setStep(1)}
                            className="flex items-center justify-center gap-2 text-sm font-medium text-gray-600 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400 transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Ganti Email
                        </button>
                    </div>
                </div>
            )}

            {step === 3 && (
                <form onSubmit={handleResetPassword} className="space-y-6">
                    <div className="grid grid-cols-1 gap-4">
                        <div>
                            <InputLabel htmlFor="password" value="Password Baru" />
                            <div className="relative mt-2">
                                <TextInput
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    value={data.password}
                                    className="block w-full py-3 text-gray-900"
                                    onChange={(e) => setData('password', e.target.value)}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400"
                                >
                                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                </button>
                            </div>
                            <InputError message={localErrors.password} className="mt-2" />
                        </div>

                        <div>
                            <InputLabel htmlFor="password_confirmation" value="Konfirmasi Password" />
                            <TextInput
                                id="password_confirmation"
                                type={showPassword ? 'text' : 'password'}
                                value={data.password_confirmation}
                                className="block w-full mt-2 py-3 text-gray-900"
                                onChange={(e) => setData('password_confirmation', e.target.value)}
                            />
                            <InputError message={localErrors.password_confirmation} className="mt-2" />
                        </div>
                    </div>

                    <div className="flex flex-col gap-4">
                        <PrimaryButton 
                            className="w-full justify-center py-3 text-base" 
                            disabled={processing}
                        >
                            {processing ? 'Menyimpan...' : 'Reset Password'}
                        </PrimaryButton>
                    </div>
                </form>
            )}

            {step === 4 && (
                <div className="flex flex-col items-center justify-center space-y-6 py-4">
                    <CheckCircle2 className="w-20 h-20 text-green-500 animate-bounce" />
                    <Link
                        href={route('login')}
                        className="w-full inline-flex justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-3 text-base font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all"
                    >
                        Login Sekarang
                    </Link>
                </div>
            )}
        </GuestLayout>
    );
}
