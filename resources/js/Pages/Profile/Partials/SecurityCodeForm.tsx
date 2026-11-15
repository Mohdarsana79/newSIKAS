import PrimaryButton from '@/Components/PrimaryButton';
import InputLabel from '@/Components/InputLabel';
import Modal from '@/Components/Modal';
import SecondaryButton from '@/Components/SecondaryButton';
import IconTile from '@/Components/ui/IconTile';
import { useForm, usePage } from '@inertiajs/react'; // Add usePage to get user prop if needed, though we usually pass props
import { useState } from 'react';
import { Shield, RefreshCw, Lock, Unlock } from 'lucide-react';
import axios from 'axios';

export default function SecurityCodeForm({
    className = '',
}: {
    className?: string;
}) {
    // We need to get the user's current security state.
    // Assuming the user object in props has these new fields.
    // If not, we might need to pass them in from Edit.tsx
    const user = usePage().props.auth.user;

    // State for the toggle
    const [isEnabled, setIsEnabled] = useState(user.is_security_code_enabled);

    // State for the generated code modal
    const [showCodeModal, setShowCodeModal] = useState(false);
    const [generatedCode, setGeneratedCode] = useState<string | null>(null);
    const [processing, setProcessing] = useState(false);
    const [toggleProcessing, setToggleProcessing] = useState(false);

    const handleToggle = () => {
        setToggleProcessing(true);
        axios.post(route('profile.toggle-security'))
            .then(() => {
                setIsEnabled(!isEnabled);
            })
            .catch(error => {
                console.error("Error toggling security:", error);
            })
            .finally(() => {
                setToggleProcessing(false);
            });
    };

    const handleGenerateClick = () => {
        // Show modal or confirmation
        // For generating new code
        setShowCodeModal(true);
    };

    const generateCode = () => {
        setProcessing(true);
        axios.post(route('profile.generate-security-code'))
            .then(response => {
                setGeneratedCode(response.data.code);
            })
            .catch(error => {
                console.error("Error generating code:", error);
            })
            .finally(() => {
                setProcessing(false);
            });
    };

    const closeCodeModal = () => {
        setShowCodeModal(false);
        setGeneratedCode(null);
    };

    return (
        <section className={`space-y-5 ${className}`}>
            <header className="mb-5 flex items-start gap-3 border-b border-slate-100 pb-4 dark:border-white/5">
                <IconTile tone="violet" size="lg">
                    <Shield />
                </IconTile>
                <div className="min-w-0">
                    <h2 className="text-[14px] font-extrabold tracking-tight text-slate-900 dark:text-white">
                        Keamanan Akun
                    </h2>
                    <p className="mt-0.5 text-[10.5px] font-medium text-slate-400 dark:text-slate-500">
                        Kelola keamanan tambahan untuk akun Anda. Aktifkan fitur ini untuk menambahkan lapisan perlindungan saat login.
                    </p>
                </div>
            </header>

            {/* Toggle Switch */}
            <div className="flex flex-col gap-4 rounded-2xl border border-slate-100 bg-slate-50/70 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-white/5 dark:bg-white/[0.03]">
                <div className="flex items-center gap-3">
                    {isEnabled ? (
                        <IconTile tone="mint" size="md">
                            <Lock />
                        </IconTile>
                    ) : (
                        <IconTile tone="slate" size="md">
                            <Unlock />
                        </IconTile>
                    )}
                    <div>
                        <h3 className="text-[12.5px] font-extrabold text-slate-900 dark:text-white">
                            Kode Keamanan Login
                        </h3>
                        <p className="mt-0.5 text-[10.5px] font-medium text-slate-400 dark:text-slate-500">
                            {isEnabled
                                ? "Fitur aktif. Anda akan diminta memasukkan kode saat login."
                                : "Fitur nonaktif. Login hanya menggunakan password."}
                        </p>
                    </div>
                </div>

                <label className="relative inline-flex cursor-pointer items-center">
                    <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={isEnabled}
                        onChange={handleToggle}
                        disabled={toggleProcessing}
                    />
                    <div className="peer h-6 w-11 rounded-full bg-slate-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-slate-300 after:bg-white after:content-[''] after:transition-all peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-lime-400/60 peer-checked:bg-lime-400 peer-checked:after:translate-x-full peer-checked:after:border-white dark:border-white/10 dark:bg-white/10 dark:after:border-white/20 dark:peer-focus:ring-lime-400/30"></div>
                </label>
            </div>

            {/* Generate Button (Only visible if enabled) */}
            {isEnabled && (
                <div className="mt-2 border-t border-slate-100 pt-4 dark:border-white/5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-[11.5px] font-medium text-slate-500 dark:text-slate-400">
                            Generate kode keamanan baru untuk login. Kode ini harus Anda simpan dan masukkan saat login.
                        </p>
                        <PrimaryButton onClick={handleGenerateClick} className="shrink-0">
                            <RefreshCw className="w-4 h-4" />
                            Generate Kode
                        </PrimaryButton>
                    </div>
                </div>
            )}

            {/* Modal for Generation */}
            <Modal show={showCodeModal} onClose={closeCodeModal}>
                <div className="flex max-h-[90vh] flex-col overflow-hidden">
                    <div className="flex shrink-0 items-start gap-3 border-b border-slate-100 px-6 py-5 dark:border-white/5">
                        <IconTile tone="violet" size="lg">
                            <Shield />
                        </IconTile>
                        <div className="min-w-0">
                            <h2 className="text-[16px] font-extrabold tracking-tight text-slate-900 dark:text-white">
                                Generate Kode Aktivasi Login
                            </h2>
                            <p className="mt-0.5 text-[10.5px] font-medium text-slate-400 dark:text-slate-500">
                                Kode 6 digit untuk lapisan keamanan tambahan saat login.
                            </p>
                        </div>
                    </div>

                    <div className="sikas-scroll flex-1 overflow-y-auto px-6 py-5">
                        {!generatedCode ? (
                            <div className="space-y-4">
                                <p className="text-[11.5px] font-medium leading-relaxed text-slate-600 dark:text-slate-300">
                                    Sistem akan membuat 6 digit angka acak sebagai kode keamanan Anda. Kode sebelumnya (jika ada) akan diganti.
                                </p>
                                <div className="mt-2 flex justify-end gap-2">
                                    <SecondaryButton onClick={closeCodeModal}>
                                        Batal
                                    </SecondaryButton>
                                    <PrimaryButton onClick={generateCode} disabled={processing}>
                                        {processing ? 'Memproses...' : 'Generate Sekarang'}
                                    </PrimaryButton>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-5 text-center">
                                <div className="rounded-2xl border border-brand-500/15 bg-pastel-lavender p-6 dark:border-brand-400/20 dark:bg-brand-500/10">
                                    <p className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.14em] text-brand-600 dark:text-brand-300">
                                        KODE KEAMANAN ANDA
                                    </p>
                                    <div className="text-sikas-num font-mono text-4xl font-extrabold tracking-[0.2em] text-brand-700 dark:text-brand-200">
                                        {generatedCode}
                                    </div>
                                </div>

                                <p className="text-[11.5px] font-medium text-slate-500 dark:text-slate-400">
                                    Harap simpan kode ini. Anda akan membutuhkannya saat login berikutnya.
                                </p>

                                <div className="mt-2 flex justify-center">
                                    <SecondaryButton onClick={closeCodeModal} className="w-full justify-center">
                                        Tutup & Simpan
                                    </SecondaryButton>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </Modal>
        </section>
    );
}
